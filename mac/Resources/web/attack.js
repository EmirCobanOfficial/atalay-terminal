'use strict';

// A spaceship attack between friends, for fun (the API's attack.ts sends it; the orbit map's raid.js flies the ship):
//  · Firing: a 🚀 button on a friend's row (left of ◎ ✉, on hover or keyboard focus), "🚀 Fire" beside Message on their
//    profile, and "🚀 fire at" in the right-click menu. No confirm box: pressing shows "Locking on… · Cancel" for LOCK_MS
//    and Cancel within it aborts (their warning turns to LOCK LOST; the 2-minute cooldown still applies). Else it fires.
//  · A friend who can't be fired at keeps the button, dimmed, with the reason (status()): away, do not disturb, offline
//    (invisible looks offline), turned off, shielded · m:ss, ready in m:ss. The API sends each friend's state in the
//    friends list and keeps it live (attack_state events, social.js); it enforces the same on fire.
//  · Fired at you: first LOCKED ON (LOCK_MS): a thin strip in the notices panel, where DANGER shows, and, with the map in
//    sight, a reticle closing onto its centre; five rising beeps and a lock tone (sfx.js lockon). The attacker's name is
//    NOT shown there. Then a little ship flies in over your orbit map, swings onto an orbit round its centre, goes round
//    it, fires three times and the centre blows up; the ship flies off. As it blows up, flames break out on a few panels
//    of the dashboard, and DANGER says who fired (the nickname you gave them, else their name) with an alarm. Some five
//    seconds later the centre puts itself back together, exactly as it was, and the flames die down with it. About 14 s,
//    each sound (sounds/attack-*.m4a) at its moment; nothing is harmed, every click goes through it and it never takes
//    the focus. The banner shows in the notices panel (messages.html), over whatever is in front, so a terminal or
//    another app in front doesn't hide it; with the map out of sight (another view, the dashboard behind, another app)
//    only the banner and its alarm come. If the attacker cancels during the lock, the strip says LOCK LOST and no ship comes.
//  · Whoever was attacked is shielded for 30 minutes (nobody can fire at them): a small "Shielded · m:ss" chip on your
//    own card and profile (shieldChip()).
//  · Settings › Privacy "let friends fire spaceships at me" (`social.attacks`, kept with the account): off, nobody can
//    fire at you, and you can't fire either (the button stays, dimmed: "turn attacks on in Settings").
// Two pages load this file: the dashboard hears the attack, decides and flies the ship; the notices panel shows the
// banner it's told to (Swift relays it: the radar handler's "attack" → MessagePanel.attack → Attack.banner; Windows:
// main.js).

window.Attack = (() => {
  const ROLE = window.__MESSAGES_ROLE__ || 'dashboard';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The damage on the dashboard's cards (damage()): how many get hit, and the timings, all in ms.
  const DMG = {
    hits: [1, 3], // fewest, most cards hit
    cards: '#sessions .card', // what is hit first; panels fill in if there are fewer than two cards
    stagger: 260, // between one hit and the next
    crack: 220, // the cracks drawing out from the impact
    glitchAt: [0, 1300, 2700], // each glitch burst, from its hit (under 3 a second)
    glitch: 240, // a burst's length
    shake: 280, // the shake at the hit
    fade: 700, // the cracks sealing at the end
    still: 400 // reduced motion: the cracks' fade in and out
  };
  const BANNER_MS = 2500; // the DANGER banner up, its fade-out at the end included
  const LOST_MS = 700; // LOCK LOST
  const LOCK_MS = 1200; // the lock-on warning before the ship arrives (the API's attackstate.ts LOCK_MS)
  // Locked, the ship held back a moment more for a cancel sent at the lock's last instant (the API lets one in up to
  // 300 ms late, attack.ts CANCEL_MS): it says LOCK LOST then, never after the ship came.
  const HOLD_MS = 400;
  // m:ss
  const clock = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  // Every word the attack shows, in one place.
  const TEXT = {
    lockBig: 'LOCKED ON',
    lockSub: 'Something has locked onto you',
    lockAria: 'Locked on. Something has locked onto you.',
    lostBig: 'LOCK LOST',
    lostAria: 'Lock lost.',
    dangerBig: 'DANGER',
    dangerWho: (n) => `<b>${n}</b> fired at you`,
    dangerAria: (n) => `Danger. ${n} fired at you.`,
    // What the ship says over your map while it attacks (a speech bubble over it); with the map out of sight, DANGER's
    // line under who fired.
    taunt: 'hahaha yowai mo',
    // The firing buttons.
    fire: 'Fire',
    fireAria: (n) => `Fire at ${n}`,
    fireTip: (n) => `Fire a little spaceship at ${n} · once every 2 minutes`,
    menuFire: (n) => `🚀 fire at ${n}`,
    locking: 'Locking on…',
    cancel: 'Cancel',
    lockingAria: (n) => `Locking on to ${n}. Cancel`,
    fired: (n) => `🚀 Fired at ${n}`,
    cancelled: (n) => `Lock cancelled · no ship fired at ${n}`,
    // Their state changed as you pressed.
    changed: {
      away: (n) => `${n} just went away · no ship fired`,
      dnd: (n) => `${n} just went on do not disturb · no ship fired`,
      offline: (n) => `${n} just went offline · no ship fired`,
    },
    oneAtATime: 'One at a time · wait for the lock',
    // Why it's greyed out: [short label, what the tooltip and the note say]. `t` is m:ss.
    blocked: {
      away: { label: () => 'away', tip: (n) => `${n} is away. You can fire when they're back.` },
      dnd: { label: () => 'do not disturb', tip: (n) => `${n} is on do not disturb. You can fire when it's off.` },
      offline: { label: () => 'offline', tip: (n) => `${n} is offline. You can fire when they're online.` },
      off: { label: () => 'turned off', tip: (n) => `${n} turned off spaceship attacks.` },
      mine_off: { label: () => 'turn attacks on in Settings', tip: () => 'Spaceship attacks are off for you, so you can\'t fire either. Turn them on in Settings > Privacy.' },
      shield: { label: (t) => `shielded · ${t}`, tip: (n, t) => `${n} was just attacked: no one can fire at them for 30 minutes after an attack. ${t} left.` },
      cooldown: { label: (t) => `ready in ${t}`, tip: (n, t) => `You can fire at ${n} again in ${t}.` },
    },
    // Your own shield.
    shielded: (t) => `Shielded · ${t}`,
    shieldTip: 'No one can attack you for 30 minutes after an attack',
    // Settings › Privacy.
    setting: {
      title: 'let friends fire spaceships at me',
      hint: "a friend's little ship flies in over your map and blows up its centre, which puts itself back together in a few seconds · off: nobody can fire at you, and you can't fire at them either",
      aria: 'Let friends fire spaceships at me',
      on: 'friends can fire spaceships at you again',
      off: "friends can't fire spaceships at you now",
    },
    offlineNote: "can't reach the server",
  };

  // ======================= the notices panel: the banner =======================
  if (ROLE === 'notices') {
    let box = null;
    let stage = null;
    let sr = null;
    let up = false;
    let timers = [];
    function banner(b) {
      if (!b) return;
      const kind = b.kind === 'lock' || b.kind === 'lost' ? b.kind : 'danger';
      if (kind === 'danger' && !b.name) return;
      timers.forEach(clearTimeout);
      timers = [setTimeout(() => show(b, kind), Math.max(0, Math.min(5000, Number(b.delay) || 0)))];
    }
    const RET = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5"/><circle cx="12" cy="12" r="1.6"/></svg>';
    function show(b, kind) {
      if (!box) {
        box = document.createElement('div');
        box.id = 'attackbox';
        // The one alert region: its text is updated for each stage; the strip itself is for the eyes.
        sr = document.createElement('div');
        sr.className = 'atk-sr';
        sr.setAttribute('role', 'alert');
        stage = document.createElement('div');
        box.append(sr, stage);
        document.body.appendChild(box);
      }
      const name = esc(String(b.name || '').slice(0, 40));
      const still = reduced() ? ' still' : '';
      // Said by its words and its mark, not by its colour alone.
      stage.innerHTML = kind === 'danger'
        ? `<div class="atk-banner${still}" aria-hidden="true"><i class="atk-haz"></i><div class="atk-in"><b class="atk-big"><i>⚠</i>${TEXT.dangerBig}</b>` +
          `<span class="atk-who">${TEXT.dangerWho(name)}</span>${b.taunt ? `<span class="atk-taunt">${esc(TEXT.taunt)}</span>` : ''}</div><i class="atk-haz"></i></div>`
        : `<div class="atk-banner lock${kind === 'lost' ? ' lost' : ''}${still}" aria-hidden="true"><i class="atk-ret">${RET}</i><div class="atk-in">` +
          `<b class="atk-big">${kind === 'lost' ? TEXT.lostBig : TEXT.lockBig}</b>${kind === 'lost' ? '' : `<span class="atk-who">${TEXT.lockSub}</span>`}</div></div>`;
      sr.textContent = kind === 'danger' ? `${TEXT.dangerAria(String(b.name || '').slice(0, 40))}${b.taunt ? ` ${TEXT.taunt}` : ''}` : kind === 'lost' ? TEXT.lostAria : TEXT.lockAria;
      up = true;
      // The panel takes the screen as it does for the flames, letting every click through (messages.js sizeNotes).
      window.Messages?.layout?.();
      if (b.sound && kind !== 'lost') {
        if (kind === 'lock') Sfx.play('lockon');
        else Sfx.sample('attack-alarm', 0.85);
      }
      // The lock warning stays a moment past the ship's arrival; the DANGER banner replaces it.
      const ms = kind === 'lock' ? LOCK_MS + HOLD_MS + 300 : kind === 'lost' ? LOST_MS : BANNER_MS;
      timers.push(setTimeout(() => stage.firstElementChild?.classList.add('out'), ms - 380));
      timers.push(setTimeout(() => {
        stage.innerHTML = '';
        up = false;
        window.Messages?.layout?.();
      }, ms));
    }
    // The alarm ready before it's needed.
    setTimeout(() => Sfx.preload('attack-alarm'), 8000);
    return { banner, wide: () => up, text: TEXT };
  }
  if (ROLE !== 'dashboard') return { wide: () => false, text: TEXT };

  // ======================= the dashboard =======================
  const h = window.webkit.messageHandlers;
  const api = (method, path, body) => h.cloud.postMessage({ type: 'social', method, path, body }).catch(() => ({ error: 'offline' }));
  const say = (m) => typeof window.toast === 'function' && window.toast(m);
  const html = document.documentElement;
  // What you call them: your nickname for them (live, else as the API sent it), else their name.
  const nameOf = (ev) => (ev.from && Social.nick(ev.from.id)) || ev.nick || (ev.from && ev.from.name) || 'a friend';

  // ---------- fired at you ----------
  let queue = []; // waiting for the one playing
  let busyUntil = 0;
  let timer = 0;
  let playing = null; // { id, cancelled, wake }: the one in its lock-on, which its sender can still cancel
  function arrive(ev) {
    if (!ev || !ev.from) return;
    // The API doesn't send it to someone on do not disturb; one already on its way when they switched is let go.
    if (Social.dnd()) return;
    // The newest from each friend, three at most.
    queue = queue.filter((q) => q.from.id !== ev.from.id);
    queue.push(ev);
    if (queue.length > 3) queue.shift();
    next();
  }
  // The sender took it back during the lock-on: LOCK LOST in the strip, no ship (attack.ts cancel).
  function cancelled(ev) {
    const id = ev && ev.from && ev.from.id;
    queue = queue.filter((q) => q.from.id !== id);
    if (playing && playing.id === id) {
      playing.cancelled = true;
      playing.wake();
    }
  }
  function next() {
    clearTimeout(timer);
    if (!queue.length) return;
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
    const lock = (playing = { id: ev.from.id, cancelled: false, wake: () => {} });
    const woken = new Promise((ok) => (lock.wake = ok));
    // The warning first, wherever the app is on screen (the notices panel shows it over whatever is in front), then the
    // ship. Its sender stays unnamed until the blast.
    banner('', 'lock');
    reticle(true);
    await Promise.race([sleep(LOCK_MS + HOLD_MS), woken]);
    playing = null;
    if (lock.cancelled) {
      reticle(false);
      banner('', 'lost');
      busyUntil = Date.now() + LOST_MS;
      clearTimeout(timer);
      timer = setTimeout(next, LOST_MS + 300);
      return;
    }
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
      setTimeout(() => reticle(false), show.boom);
      const said = taunt(show);
      at(show.boom, () => {
        Sfx.sample('attack-boom', 1);
        flames(show.whole - show.boom);
        damage(show.whole - show.boom);
      });
      // The ship away again: its engines once more, quieter, under the alarm.
      at(show.leave + 150, () => Sfx.sample('attack-flyby', 0.4));
      at(show.reform, () => Sfx.sample('attack-rebuild', 0.7));
      // The banner and its alarm right after the blast, whatever is in front by then.
      // The taunt goes on DANGER only if its bubble never showed (the map went out of sight first).
      setTimeout(() => banner(name, 'danger', !said.seen), show.boom + 350);
    } else {
      reticle(false);
      busyUntil = Date.now() + BANNER_MS;
      banner(name, 'danger', true);
    }
    clearTimeout(timer);
    timer = setTimeout(next, busyUntil - Date.now() + 300);
  }
  function banner(name, kind = 'danger', taunt = false) {
    try {
      h.radar.postMessage({ type: 'attack', name, kind, delay: 0, sound: true, taunt });
    } catch {}
  }

  // ---------- the reticle on the map ----------
  // With the map in sight, four brackets close onto its centre (the core) as the lock builds: orange while closing, amber
  // when locked (the strip's amber), steady until the blast. Only a drawing, no words; reduced motion: it just stands there.
  let ret = null;
  let retFrame = 0;
  function reticle(on) {
    cancelAnimationFrame(retFrame);
    clearTimeout(ret && ret.lockTimer);
    ret?.el.remove();
    ret = null;
    if (!on || !mapInSight() || !window.Orbit?.corePoint || !window.Orbit.corePoint()) return;
    const el = document.createElement('div');
    el.id = 'atk-ret';
    if (reduced()) el.className = 'still locked';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="rt"><i class="b1"></i><i class="b2"></i><i class="b3"></i><i class="b4"></i></div>';
    document.body.appendChild(el);
    ret = { el, lockTimer: setTimeout(() => el.classList.add('locked'), LOCK_MS - 200) };
    const place = () => {
      const space = document.getElementById('space');
      const p = window.Orbit?.corePoint?.();
      if (!ret || ret.el !== el) return;
      if (space && p) {
        const box = space.getBoundingClientRect();
        const d = Math.max(48, 2 * p.r);
        el.style.cssText = `left:${(box.left + p.x).toFixed(1)}px;top:${(box.top + p.y).toFixed(1)}px;width:${d.toFixed(1)}px;height:${d.toFixed(1)}px`;
      }
      retFrame = requestAnimationFrame(place);
    };
    place();
    // Never left up by a missed end.
    setTimeout(() => ret && ret.el === el && reticle(false), 20_000);
  }

  // ---------- the taunt over the ship ----------
  // A comic speech bubble over the raiding ship, kept over it as it flies (the map's shipPoint): it pops up as the ship
  // comes onto its orbit, stays through the lasers, and goes as the ship flies off. Only over the map in sight; a page
  // element taking no clicks, like the reticle. `seen`: it showed at least once.
  let bub = null;
  let bubFrame = 0;
  function taunt(show) {
    cancelAnimationFrame(bubFrame);
    bub?.remove();
    const said = { seen: false };
    const el = (bub = document.createElement('div'));
    el.id = 'atk-taunt';
    el.hidden = true;
    el.setAttribute('aria-hidden', 'true');
    if (reduced()) el.className = 'still';
    el.innerHTML = `<span>${esc(TEXT.taunt)}</span>`;
    document.body.appendChild(el);
    const t0 = performance.now();
    const place = () => {
      if (bub !== el) return;
      const t = performance.now() - t0;
      if (t > show.leave + 300) {
        el.remove();
        bub = null;
        return;
      }
      if (t > show.leave) el.classList.add('out');
      const p = t >= show.enter && mapInSight() ? window.Orbit?.shipPoint?.() : null;
      const space = document.getElementById('space');
      if (p && space) {
        const box = space.getBoundingClientRect();
        el.style.left = `${(box.left + p.x).toFixed(1)}px`;
        el.style.top = `${(box.top + p.y - Math.max(14, p.r * 0.7)).toFixed(1)}px`;
        el.hidden = false;
        said.seen = true;
      } else el.hidden = true;
      bubFrame = requestAnimationFrame(place);
    };
    place();
    return said;
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


  // ---------- damage on the dashboard ----------
  // As the centre blows up, one to three session cards (else panels) are hit: cracked glass over them, drawn here as SVG
  // lines radiating from an impact point, a few short glitch bursts (colour-split edges, slices sliding sideways) and a
  // small shake, then the cracks seal as the centre is whole again (`ms` from now). A box over the dashboard that takes
  // no clicks, like the flames; the cards themselves are only shaken with the Web Animations API (transform), their
  // content, clicks and scrolling are never touched. Cards nearest the map's centre are likelier; only with the map in
  // sight, and it goes early if the map leaves it. Reduced motion: the cracks fade in and out, nothing moves.
  let hurt = null;
  function damage(ms) {
    if (hurt || ms < 1500) return;
    const seen = (r) => r.width >= 90 && r.height >= 40 && r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1;
    const pick = (sel) => [...document.querySelectorAll(sel)].map((el) => ({ el, r: el.getBoundingClientRect() })).filter((x) => seen(x.r));
    let pool = pick(DMG.cards);
    const [lo, hi] = DMG.hits;
    const n = lo + Math.floor(Math.random() * (hi - lo + 1));
    if (pool.length < 2) pool = pool.concat(pick('#app .panel').filter((x) => !pool.some((p) => p.el.contains(x.el) || x.el.contains(p.el))));
    if (!pool.length) return;
    const space = document.getElementById('space');
    const core = window.Orbit?.corePoint?.();
    const sb = space && space.getBoundingClientRect();
    // Nearer the core, likelier: a random pull on the distance.
    const rank = (x) => {
      const d = core && sb ? Math.hypot(x.r.left + x.r.width / 2 - (sb.left + core.x), x.r.top + x.r.height / 2 - (sb.top + core.y)) : 500;
      return d * (0.5 + Math.random());
    };
    const hits = pool.sort((a, b) => rank(a) - rank(b)).slice(0, n);
    const calm = reduced();
    const box = (hurt = document.createElement('div'));
    box.id = 'atk-dmg';
    box.setAttribute('aria-hidden', 'true');
    document.body.appendChild(box);
    const NS = 'http://www.w3.org/2000/svg';
    const cleanups = [];
    const rnd = (a, b) => a + Math.random() * (b - a);
    hits.forEach(({ el, r }, i) => {
      const w = Math.round(r.width), hh = Math.round(r.height);
      const wait = i * DMG.stagger;
      const life = ms - wait - 100;
      const ix = rnd(0.25, 0.75) * w, iy = rnd(0.25, 0.75) * hh;
      const hit = document.createElement('div');
      hit.className = 'atk-hit' + (calm ? ' still' : '');
      hit.style.cssText = `left:${Math.round(r.left)}px;top:${Math.round(r.top)}px;width:${w}px;height:${hh}px;--ix:${ix.toFixed(0)}px;--iy:${iy.toFixed(0)}px;--crack:${DMG.crack}ms;--fade:${DMG.fade}ms;--still:${DMG.still}ms;--wait:${wait}ms;--end:${Math.max(0, life - DMG.fade)}ms`;
      // The cracks: 7 to 10 rays from the impact, each a few jagged segments, some with a branch.
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', `0 0 ${w} ${hh}`);
      const rays = 7 + Math.floor(Math.random() * 4);
      let d = '';
      for (let k = 0; k < rays; k++) {
        const a0 = ((k + rnd(-0.3, 0.3)) / rays) * Math.PI * 2;
        let x = ix, y = iy, a = a0;
        const len = rnd(0.35, 0.9) * Math.max(w, hh);
        const segs = 3 + Math.floor(Math.random() * 3);
        for (let q = 0; q < segs; q++) {
          const step = (len / segs) * rnd(0.7, 1.2);
          d += `M${x.toFixed(1)} ${y.toFixed(1)}`;
          x += Math.cos(a) * step;
          y += Math.sin(a) * step;
          d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
          a += rnd(-0.35, 0.35);
          if (Math.random() < 0.35) {
            const b = a + (Math.random() < 0.5 ? -1 : 1) * rnd(0.5, 0.9), bl = step * rnd(0.5, 1.1);
            d += `M${x.toFixed(1)} ${y.toFixed(1)}L${(x + Math.cos(b) * bl).toFixed(1)} ${(y + Math.sin(b) * bl).toFixed(1)}`;
          }
        }
      }
      // A ring of the shattered glass round the impact.
      const ring = [];
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2 + rnd(-0.2, 0.2), rr = rnd(10, 20);
        ring.push(`${(ix + Math.cos(a) * rr).toFixed(1)} ${(iy + Math.sin(a) * rr).toFixed(1)}`);
      }
      const dark = document.createElementNS(NS, 'path');
      dark.setAttribute('d', d);
      dark.setAttribute('class', 'dk');
      const light = document.createElementNS(NS, 'path');
      light.setAttribute('d', d + `M${ring.join('L')}Z`);
      light.setAttribute('class', 'lt');
      dark.setAttribute('pathLength', '1');
      light.setAttribute('pathLength', '1');
      svg.append(dark, light);
      hit.appendChild(svg);
      // Glitch: two colour-split edges and three slices, only moved while a burst runs.
      if (!calm) {
        const fx = document.createElement('div');
        fx.className = 'fx';
        fx.innerHTML = '<i class="rg a"></i><i class="rg b"></i>' + [0, 1, 2].map(() => `<i class="sl" style="top:${Math.round(rnd(8, 88))}%;height:${Math.round(rnd(5, 12))}%"></i>`).join('');
        hit.appendChild(fx);
      }
      box.appendChild(hit);
      // The shake and the glitch bursts, from the hit on. Web Animations: they end by themselves and leave nothing behind.
      const anims = [];
      if (!calm) {
        anims.push(el.animate([
          { transform: 'translate(0,0)' }, { transform: 'translate(-3px,1px)' }, { transform: 'translate(3px,-2px)' },
          { transform: 'translate(-2px,-1px)' }, { transform: 'translate(1px,1px)' }, { transform: 'translate(0,0)' }
        ], { duration: DMG.shake, delay: wait, easing: 'linear' }));
        DMG.glitchAt.forEach((at) => {
          const t = wait + at + 80;
          hit.querySelectorAll('.fx').forEach((fx) => anims.push(fx.animate([{ opacity: 0 }, { opacity: 1, offset: 0.001 }, { opacity: 1, offset: 0.999 }, { opacity: 0 }], { duration: DMG.glitch, delay: t, fill: 'both' })));
          anims.push(...[...hit.querySelectorAll('.rg.a')].map((x) => x.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(2px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], { duration: DMG.glitch, delay: t, easing: 'steps(5, end)' })));
          anims.push(...[...hit.querySelectorAll('.rg.b')].map((x) => x.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }], { duration: DMG.glitch, delay: t, easing: 'steps(5, end)' })));
          anims.push(...[...hit.querySelectorAll('.sl')].map((x, q) => x.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${q % 2 ? 14 : -14}px)` }, { transform: `translateX(${q % 2 ? -8 : 9}px)` }, { transform: 'translateX(0)' }], { duration: DMG.glitch, delay: t, easing: 'steps(4, end)' })));
        });
      }
      cleanups.push(() => anims.forEach((a) => a.cancel()));
    });
    let gone = false;
    const end = () => {
      if (gone) return;
      gone = true;
      clearInterval(watch);
      clearTimeout(done);
      cleanups.forEach((f) => f());
      box.remove();
      hurt = null;
    };
    // The map leaving the screen takes the damage with it.
    const watch = setInterval(() => !mapInSight() && end(), 400);
    const done = setTimeout(end, ms + 200);
  }


  // ---------- your switch (Settings › Privacy) ----------
  const me = () => (window.Social && Social.state() && Social.state().me) || null;
  let takes = null; // your switch, once known; on until then
  const on = () => (takes !== null ? takes !== false : !me() || me().attacks !== false);
  const setTakes = (v) => {
    takes = v;
    if (me()) me().attacks = v;
    paint();
    paintAll();
  };
  async function loadPref() {
    const r = await api('GET', 'v1/settings');
    if (!r || r.error || !r.settings) return;
    setTakes(r.settings['social.attacks'] !== false);
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
    if (r.error) return say(r.error === 'offline' ? TEXT.offlineNote : "couldn't change it");
    setTakes(v);
    say(v ? TEXT.setting.on : TEXT.setting.off);
  }

  // ---------- who can be fired at ----------
  // Why a friend can't be fired at right now, or null: from the presence the app has live (away, do not disturb, offline,
  // which is also how invisible looks) and the state the API sent (`f.attack`, kept live by social.js: their switch, their
  // shield's end, your cooldown's end), plus your own switch. { why, label, tip }: the label sits on the item, the tip is
  // the tooltip and the note a click gives.
  function status(f) {
    if (!f) return null;
    const n = f.nick || f.name;
    const a = f.attack || {};
    const now = Date.now();
    const p = f.presence || 'offline';
    let why = null;
    let until = 0;
    if (!on()) why = 'mine_off';
    else if (p === 'offline') why = 'offline';
    else if (p === 'dnd') why = 'dnd';
    else if (p === 'idle') why = 'away';
    else if (a.off) why = 'off';
    else if (a.shieldUntil > now) (why = 'shield'), (until = a.shieldUntil);
    else if (a.cooldownUntil > now) (why = 'cooldown'), (until = a.cooldownUntil);
    if (!why) return null;
    const t = until ? clock(until - now) : '';
    return { why, until, label: TEXT.blocked[why].label(t), tip: TEXT.blocked[why].tip(n, t) };
  }
  // The same words for the old callers (cloud.js's menu asked these two).
  const blocked = (f) => (status(f) ? status(f).why : '');

  // ---------- the buttons ----------
  // One drawing for all three places (kind: 'row' on the friend's row, 'pv' on their profile, 'menu' in the right-click
  // menu), also redrawn in place as things change (paintAll). aria-disabled, not disabled: it stays reachable by keyboard
  // and a click says why.
  function button(f, kind = 'row') {
    if (!f) return '';
    const n = f.nick || f.name;
    const s = status(f);
    const lk = locking && locking.id === f.id;
    const dim = !lk && s ? ' atk-off' : '';
    const attrs = `type="button" data-act="attack" data-atk="${esc(f.id)}" data-kind="${kind}"${s && !lk ? ' aria-disabled="true"' : ''}`;
    const aria = lk ? TEXT.lockingAria(n) : s ? `${TEXT.fireAria(n)}: ${s.label}` : TEXT.fireAria(n);
    const tip = lk ? TEXT.cancel : s ? s.tip : TEXT.fireTip(n);
    const body = lk ? `🚀 ${TEXT.locking} · ${TEXT.cancel}` : null;
    if (kind === 'menu') {
      return `<button ${attrs} data-ctx="attack" class="${dim.trim()}${lk ? ' locking' : ''}" title="${esc(tip)}">${lk ? body : `${esc(TEXT.menuFire(n))}${s ? ` · ${esc(s.label)}` : ''}`}</button>`;
    }
    if (kind === 'pv') {
      return `<button ${attrs} class="bd-glassbtn atk-pv${dim}${lk ? ' locking' : ''}" title="${esc(tip)}" aria-label="${esc(aria)}">${lk ? body : `🚀 ${TEXT.fire}${s ? ` · ${esc(s.label)}` : ''}`}</button>`;
    }
    return `<button ${attrs} class="mn-btn atk-fire${dim}${lk ? ' locking' : ''}" title="${esc(tip)}" aria-label="${esc(aria)}">${lk ? body : '🚀'}</button>`;
  }
  // Redraws every attack button in place (a state changed, a second passed, the lock began or ended); focus stays.
  function paintAll() {
    document.querySelectorAll('[data-atk]').forEach((el) => {
      const f = Social.friend(el.dataset.atk);
      if (!f) return;
      const t = document.createElement('template');
      t.innerHTML = button(f, el.dataset.kind || 'row');
      const nu = t.content.firstElementChild;
      // Compared as the page writes them both (an escaped ' in a tooltip reads back plain): unchanged stays, so a
      // tooltip or a press under way isn't cut off every second.
      if (!nu || nu.outerHTML === el.outerHTML) return;
      const focused = document.activeElement === el;
      el.replaceWith(nu);
      if (focused) nu.focus();
    });
  }

  // ---------- your shield ----------
  const shieldLeft = () => {
    const u = me() && me().shieldUntil;
    return u && u > Date.now() ? u - Date.now() : 0;
  };
  const SHIELD_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 13.5 3.5v4c0 3.2-2.3 5.6-5.5 7-3.2-1.4-5.5-3.8-5.5-7v-4z"/></svg>';
  // Always drawn (hidden without a shield) so it shows the moment a shield starts; the clock below fills it in.
  const shieldChip = () => {
    const left = shieldLeft();
    return `<span class="atk-shield" title="${esc(TEXT.shieldTip)}"${left ? '' : ' hidden'}>${SHIELD_ICON}<b>${left ? esc(TEXT.shielded(clock(left))) : ''}</b></span>`;
  };
  function paintShield() {
    const left = shieldLeft();
    document.querySelectorAll('.atk-shield').forEach((el) => {
      el.hidden = !left;
      const b = el.querySelector('b');
      const text = left ? TEXT.shielded(clock(left)) : '';
      if (b && b.textContent !== text) b.textContent = text;
    });
  }
  // Countdowns (cooldown, shield) tick once a second, only while something shows one.
  setInterval(() => {
    paintShield();
    if (document.querySelector('[data-atk]')) paintAll();
  }, 1000);

  // ---------- firing at a friend ----------
  let locking = null; // { id, name, cancel, req, timer }: the lock-on your own press began, still cancellable
  function remember(f, r) {
    if (!f) return;
    f.attack = f.attack || {};
    if (r.readyAt && (r.why === 'cooldown' || r.fired)) f.attack.cooldownUntil = r.readyAt;
    if (r.why === 'shield' && r.readyAt) f.attack.shieldUntil = r.readyAt;
    if (r.fired && r.shieldUntil) f.attack.shieldUntil = r.shieldUntil;
    if (r.why === 'off') f.attack.off = true;
  }
  // How a fire that didn't happen is said (the API answered, or the friend's state had just changed).
  function explain(f, r) {
    const n = f.nick || f.name;
    if (r.error) {
      return say(r.error === 'offline' ? TEXT.offlineNote : r.error === 'not_friends' ? `${n} isn't your friend anymore`
        : r.error === 'rate_limited' ? 'too many at once · wait a moment' : "couldn't fire · try again");
    }
    remember(f, r);
    const why = r.why === 'unavailable' ? r.reason : r.why;
    const s = status(f);
    say(TEXT.changed[why] ? TEXT.changed[why](n) : s ? s.tip : (TEXT.blocked[why] || TEXT.blocked.offline).tip(n, ''));
  }
  function press(id) {
    const f = Social.friend(id);
    if (!f) return;
    const n = f.nick || f.name;
    if (locking) return locking.id === id ? cancel(locking) : say(TEXT.oneAtATime);
    const s = status(f);
    if (s) return say(s.tip);
    const lk = (locking = { id, name: n, cancel: false });
    lk.req = api('POST', `v1/friends/${encodeURIComponent(id)}/attack`, {});
    lk.timer = setTimeout(() => settle(lk, f), LOCK_MS);
    paintAll();
    Sfx.play('locktick');
    // Refused at once (their state changed): no waiting for the lock to run out.
    lk.req.then((r) => {
      if (locking !== lk || r.fired) return;
      clearTimeout(lk.timer);
      locking = null;
      paintAll();
      explain(f, r);
    });
  }
  async function settle(lk, f) {
    const r = await lk.req;
    if (locking !== lk) return;
    locking = null;
    paintAll();
    if (r.fired) {
      remember(f, r);
      paintAll();
      say(TEXT.fired(lk.name));
    }
  }
  // Cancel within the lock-on: their warning turns to LOCK LOST; the cooldown stays.
  function cancel(lk) {
    clearTimeout(lk.timer);
    lk.cancel = true;
    locking = null;
    paintAll();
    const f = Social.friend(lk.id);
    lk.req.then(async (r) => {
      if (!r.fired) {
        if (!r.error) remember(f, r);
        return say(TEXT.cancelled(lk.name));
      }
      remember(f, r);
      // Said once the API answers: a cancel that came too late (the lock was over) means the ship flew.
      const c = await api('POST', `v1/friends/${encodeURIComponent(lk.id)}/attack/cancel`, {});
      if (c && c.cancelled) {
        if (f) f.attack.shieldUntil = null;
        say(TEXT.cancelled(lk.name));
      } else say(TEXT.fired(lk.name));
      paintAll();
    });
  }

  document.addEventListener('click', (e) => {
    const sw = e.target.closest && e.target.closest('.hk-sw.atk-on');
    if (sw) return void toggle(sw);
    const b = e.target.closest && e.target.closest('[data-atk]');
    if (b) {
      e.preventDefault();
      press(b.dataset.atk);
    }
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
    if (Social.dnd()) say('test: on do not disturb, so it is let go');
  }

  // ---------- live ----------
  Social.on((ev) => {
    if (ev.type === 'attack') arrive(ev);
    if (ev.type === 'attack_cancel') cancelled(ev);
    if (ev.type === 'hello') {
      loadPref();
      setTimeout(() => SOUNDS.forEach((s) => Sfx.preload(s)), 6000);
    }
    if (ev.type === 'settings' && ev.set && 'social.attacks' in ev.set) setTakes(ev.set['social.attacks'] !== false);
    // A friend's state or presence changed: their buttons follow at once.
    if (ev.type === 'presence' || ev.type === 'attack_state' || ev.type === 'friend') {
      paintAll();
      paintShield();
    }
  });

  return { on, button, blocked, status, shieldChip, test, text: TEXT, wide: () => false };
})();
