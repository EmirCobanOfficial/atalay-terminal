'use strict';

// A spaceship attack between friends, for fun (the API's attack.ts sends it; the orbit map's raid.js flies the ship):
//  · "🚀 fire at" on a friend's card in Friends. The API takes one every 2 minutes for the same friend, only while
//    they're online; a short note says how it went (fired, offline, turned off, or when you can again).
//  · Fired at you: a little ship flies in over your orbit map, swings onto an orbit round its centre, goes round it,
//    fires three times and the centre blows up; the ship flies off. As it blows up, flames break out on a few panels
//    of the dashboard, and DANGER says who fired (the nickname you gave them, else their name) with an alarm. Some
//    five seconds later the centre puts itself back together, exactly as it was, and the flames die down with it.
//    About 14 s, each sound (sounds/attack-*.m4a) at its moment; nothing is harmed, every click goes through it and
//    it never takes the focus. The banner shows in the notices panel (messages.html), over whatever is in front, so a
//    terminal or another app in front doesn't hide it; with the map out of sight (another view, the dashboard behind,
//    another app) only the banner and its alarm come.
//  · Do not disturb holds it until it ends, as it does the level-up and the badges. Settings › Privacy turns it off
//    (`social.attacks`, kept with the account; the API then doesn't send it).
// Two pages load this file: the dashboard hears the attack, decides and flies the ship; the notices panel shows the
// banner it's told to (Swift relays it: the radar handler's "attack" → MessagePanel.attack → Attack.banner).
// PARKED (2026-11-15): kept on this branch until the Orb currency comes; it was built on develop plus work not
// committed yet (Settings page settings.js, the staging strip social-test.js, Social.prefs/setPref in social.js, and
// the API's soft delete, migration 029 devices.deleted_at, which attack.ts reads). Once those are on develop, put
// these hooks back as they were:
//  settings.js, Privacy, in "friends and leaderboard" after the leaderboard switch (its last line closes the group):
//            // A friend's spaceship attack (attack.js): the switch's clicks and its state are attack.js's.
//            (window.Attack?.on
//              ? row('spaceship attacks from friends', "a friend's little ship enters orbit on your map and blows up its centre, which puts itself back together in a few seconds; flames on the dashboard and a DANGER alarm say who · off: friends can't fire at you", sw(`atk-on${window.Attack.on() ? ' on' : ''}`, 'Let friends fire spaceships at you', window.Attack.on()))
//              : '')) +
//  social-test.js, its header list, then the strip and click():
//    //   attack   🚀 ATTACK ME: a friend's spaceship attack on yourself, the map in sight (attack.js)
//        // A friend's spaceship attack on yourself (attack.js test(), the API's POST v1/friends/dev/attack in attack.ts).
//        (window.Attack?.test ? `<span>attack</span><div class="lb-seg">${btn('attack', 'me', '🚀 ATTACK ME')}</div>` : '') + '</div>';
//        if (key === 'attack') {
//          window.Attack?.test();
//          return false;
//        }
//  Windows: one relay in main.js (the radar "attack" event to Attack.banner in the notices window).

window.Attack = (() => {
  const ROLE = window.__MESSAGES_ROLE__ || 'dashboard';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BANNER_MS = 2500; // the banner up, its fade-out at the end included

  // ======================= the notices panel: the banner =======================
  if (ROLE === 'notices') {
    let box = null;
    let up = false;
    let timers = [];
    function banner(b) {
      if (!b || !b.name) return;
      timers.forEach(clearTimeout);
      timers = [setTimeout(() => show(b), Math.max(0, Math.min(5000, Number(b.delay) || 0)))];
    }
    function show(b) {
      if (!box) {
        box = document.createElement('div');
        box.id = 'attackbox';
        document.body.appendChild(box);
      }
      const name = esc(String(b.name).slice(0, 40));
      // Said by its words and its mark, not by its colour alone.
      box.innerHTML =
        `<div class="atk-banner${reduced() ? ' still' : ''}" role="alert" aria-label="DANGER · ${name} fired at you">` +
        '<i class="atk-haz" aria-hidden="true"></i><div class="atk-in"><b class="atk-big"><i aria-hidden="true">⚠</i>DANGER</b>' +
        `<span class="atk-who"><b>${name}</b> fired at you</span></div><i class="atk-haz" aria-hidden="true"></i></div>`;
      up = true;
      // The panel takes the screen as it does for the flames, letting every click through (messages.js sizeNotes).
      window.Messages?.layout?.();
      if (b.sound) Sfx.sample('attack-alarm', 0.85);
      timers.push(setTimeout(() => box.firstElementChild?.classList.add('out'), BANNER_MS - 380));
      timers.push(setTimeout(() => {
        box.innerHTML = '';
        up = false;
        window.Messages?.layout?.();
      }, BANNER_MS));
    }
    // The alarm ready before it's needed.
    setTimeout(() => Sfx.preload('attack-alarm'), 8000);
    return { banner, wide: () => up };
  }
  if (ROLE !== 'dashboard') return { wide: () => false };

  // ======================= the dashboard =======================
  const h = window.webkit.messageHandlers;
  const api = (method, path, body) => h.cloud.postMessage({ type: 'social', method, path, body }).catch(() => ({ error: 'offline' }));
  const say = (m) => typeof window.toast === 'function' && window.toast(m);
  const html = document.documentElement;
  // What you call them: your nickname for them (live, else as the API sent it), else their name.
  const nameOf = (ev) => (ev.from && Social.nick(ev.from.id)) || ev.nick || (ev.from && ev.from.name) || 'a friend';

  // ---------- fired at you ----------
  let queue = []; // waiting for do not disturb to end, or for the one playing
  let busyUntil = 0;
  let timer = 0;
  function arrive(ev) {
    if (!ev || !ev.from) return;
    // The newest from each friend, three at most.
    queue = queue.filter((q) => q.from.id !== ev.from.id);
    queue.push(ev);
    if (queue.length > 3) queue.shift();
    next();
  }
  function next() {
    clearTimeout(timer);
    if (!queue.length || Social.dnd()) return;
    const wait = busyUntil - Date.now();
    if (wait > 0) return void (timer = setTimeout(next, wait + 300));
    play(queue.shift());
  }
  // The map is on screen when the dashboard is in front (not behind another app, not hidden: app.js setVisibility) and
  // no view covers it (they hide #mapwrap).
  function mapInSight() {
    const space = document.getElementById('space');
    return !html.classList.contains('paused') && !html.classList.contains('behind') && !!space && space.clientWidth > 0 && space.clientHeight > 0;
  }
  // The ship's sounds, each played at its moment on the map (raid.js gives the moments); the alarm is the banner's.
  const SOUNDS = ['attack-flyby', 'attack-lasers', 'attack-boom', 'attack-rebuild'];
  async function play(ev) {
    busyUntil = Date.now() + 20_000; // the next one waits; set right below, once this one's length is known
    const name = nameOf(ev);
    let show = null;
    if (mapInSight() && !reduced() && window.Orbit?.attack) {
      // The sounds loaded first (a moment at most, the first time), so each starts on time.
      await Promise.race([Promise.all(SOUNDS.map((s) => Sfx.preload(s))), sleep(1500)]);
      show = mapInSight() ? window.Orbit.attack() : null;
    }
    if (show) {
      busyUntil = Date.now() + show.end;
      // What belongs to the map plays only if the map is still in sight at that moment.
      const at = (ms, fn) => setTimeout(() => mapInSight() && fn(), ms);
      Sfx.sample('attack-flyby', 0.8);
      at(show.fire, () => Sfx.sample('attack-lasers', 0.9));
      at(show.boom, () => {
        Sfx.sample('attack-boom', 1);
        flames(show.whole - show.boom);
      });
      // The ship away again: its engines once more, quieter, under the alarm.
      at(show.leave + 150, () => Sfx.sample('attack-flyby', 0.4));
      at(show.reform, () => Sfx.sample('attack-rebuild', 0.7));
      // The banner and its alarm right after the blast, whatever is in front by then.
      setTimeout(() => banner(name), show.boom + 350);
    } else {
      busyUntil = Date.now() + BANNER_MS;
      banner(name);
    }
    clearTimeout(timer);
    timer = setTimeout(next, busyUntil - Date.now() + 300);
  }
  function banner(name) {
    try {
      h.radar.postMessage({ type: 'attack', name, delay: 0, sound: true });
    } catch {}
  }

  // ---------- flames on the dashboard ----------
  // As the map's centre blows up, parts of the dashboard catch fire: a patch of the app's own flames (fire.js, all of
  // them drawn with its one WebGL context: one of their own each took the orbit map's away) on the bottom edge of up
  // to five panels picked at random, each patch its own size, catching one after another and dying down one after
  // another, the last as the centre is whole again (`ms` from now). They're drawn in a box over the dashboard's panels
  // that takes no clicks, under the page's scanlines and its menus; the terminals' windows are above the dashboard as
  // ever.
  let fires = null;
  function flames(ms) {
    if (fires || !window.Fire || reduced()) return;
    const panels = [...document.querySelectorAll('#app .panel')].filter((p) => {
      const r = p.getBoundingClientRect();
      return r.width >= 160 && r.height >= 90 && r.bottom <= innerHeight + 1;
    });
    for (let i = panels.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [panels[i], panels[j]] = [panels[j], panels[i]];
    }
    const lit = panels.slice(0, 5);
    if (!lit.length) return;
    const box = (fires = document.createElement('div'));
    box.id = 'atk-fires';
    box.style.cssText = 'position:fixed;inset:0;z-index:48;overflow:hidden;pointer-events:none';
    document.body.appendChild(box);
    const stops = lit.map((p, i) => {
      const r = p.getBoundingClientRect();
      const w = Math.round(Math.min(r.width - 12, 440, Math.max(150, r.width * (0.45 + Math.random() * 0.35))));
      const tall = Math.round(Math.min(r.height - 6, 110 + Math.random() * 70));
      const wait = i * 120 + Math.random() * 150;
      const life = Math.max(2400, ms * (0.7 + (0.3 * (i + 1)) / lit.length) - wait);
      const spot = document.createElement('div');
      spot.style.cssText = `position:absolute;left:${Math.round(r.left + 6 + Math.random() * Math.max(0, r.width - 12 - w))}px;top:${Math.round(r.bottom - tall)}px;width:${w}px;height:${tall}px`;
      // Its light on the panel, under the flames.
      const light = document.createElement('div');
      light.style.cssText = 'position:absolute;inset:0;opacity:0;background:radial-gradient(ellipse 50% 72% at 50% 100%,rgba(255,112,20,.3),rgba(255,84,10,.11) 55%,transparent 76%)';
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
      spot.append(light, canvas);
      box.appendChild(spot);
      let stop = null;
      const lightAt = performance.now() + wait;
      // Full for the first half of its life, then lower and lower (fire.js puts it out over its last moments); its
      // light comes and goes with it. Asked each frame the fire draws.
      const reach = () => {
        const x = Math.min(1, (performance.now() - lightAt) / life), low = x < 0.5 ? 0 : (x - 0.5) / 0.5;
        light.style.opacity = (Math.min(1, x / 0.08) * (1 - low)).toFixed(3);
        return [tall * 0.66 * (1 - 0.55 * low ** 1.3), 0, 0];
      };
      const fuse = setTimeout(() => (stop = Fire.burn(canvas, { reach, scale: 11 + Math.random() * 5, life, mound: true })), wait);
      return () => {
        clearTimeout(fuse);
        stop?.();
      };
    });
    setTimeout(() => {
      stops.forEach((stop) => stop());
      box.remove();
      fires = null;
    }, ms + 400);
  }

  // ---------- your switch (Settings › Privacy) ----------
  let takes = null; // your switch, once known; on until then
  const on = () => takes !== false;
  async function loadPref() {
    const r = await api('GET', 'v1/settings');
    if (!r || r.error || !r.settings) return;
    takes = r.settings['social.attacks'] !== false;
    paint();
  }
  function paint() {
    document.querySelectorAll('.hk-sw.atk-on').forEach((sw) => {
      sw.classList.toggle('on', on());
      sw.setAttribute('aria-checked', String(on()));
    });
  }
  async function toggle(sw) {
    const v = !on();
    sw.disabled = true;
    const r = await Social.setPref('attacks', v);
    sw.disabled = false;
    if (r.error) return say(r.error === 'offline' ? "can't reach the server" : "couldn't change it");
    takes = v;
    paint();
    say(v ? 'friends can fire spaceships at you again' : "friends can't fire spaceships at you now");
  }

  // ---------- firing at a friend ----------
  const left = (s) => (s >= 60 ? `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} s` : ''}` : `${s} s`);
  async function fireAt(id, btn) {
    const f = Social.friend(id);
    if (!f) return;
    const name = f.nick || f.name;
    if (btn) btn.disabled = true;
    const r = await api('POST', `v1/friends/${encodeURIComponent(id)}/attack`, {});
    if (btn) btn.disabled = false;
    if (r.error) {
      return say(r.error === 'offline' ? "can't reach the server" : r.error === 'not_friends' ? `${name} isn't your friend anymore`
        : r.error === 'rate_limited' ? 'too many at once · wait a moment' : "couldn't fire · try again");
    }
    if (r.fired) return say(r.dnd ? `🚀 fired at ${name} · they'll see it when their do not disturb ends` : `🚀 fired at ${name}`);
    if (r.why === 'cooldown') return say(`you can fire at ${name} again in ${left(r.wait || 1)}`);
    if (r.why === 'offline') return say(`${name} is offline · you can fire when they're online`);
    if (r.why === 'off') return say(`${name} turned off spaceship attacks`);
  }
  // The button on a friend's card (cloud.js friendCard).
  const button = (f) =>
    `<button type="button" class="mn-btn atk-fire" data-atk="${esc(f.id)}" title="A little spaceship enters orbit on their map and blows up its centre, which puts itself back together · once every 2 minutes, while they're online">🚀 fire at</button>`;

  document.addEventListener('click', (e) => {
    const sw = e.target.closest && e.target.closest('.hk-sw.atk-on');
    if (sw) return void toggle(sw);
    const b = e.target.closest && e.target.closest('[data-atk]');
    if (b) fireAt(b.dataset.atk, b);
  });

  // ---------- staging: "🚀 ATTACK ME" (social-test.js) ----------
  async function test() {
    // The map in sight, then one on yourself from a friend (the API's DEV_TOOLS route).
    window.GitView?.view('dash');
    say('🚀 test attack on its way · watch the map');
    await sleep(700);
    const r = await api('POST', 'v1/friends/dev/attack', {});
    if (r.error) return say(`test: ${r.error}`);
    if (!r.fired) return say(r.why === 'off' ? 'test: spaceship attacks are off (Settings › Privacy)' : `test: ${r.why}`);
    if (Social.dnd()) say('test: do not disturb holds it until it ends');
  }

  // ---------- live ----------
  Social.on((ev) => {
    if (ev.type === 'attack') arrive(ev);
    // Do not disturb over: what waited plays.
    if (ev.type === 'status') next();
    if (ev.type === 'hello') {
      loadPref();
      setTimeout(() => SOUNDS.forEach((s) => Sfx.preload(s)), 6000);
    }
    if (ev.type === 'settings' && ev.set && 'social.attacks' in ev.set) {
      takes = ev.set['social.attacks'] !== false;
      paint();
    }
  });

  return { on, button, test, wide: () => false };
})();
