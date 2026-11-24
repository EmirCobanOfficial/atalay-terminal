'use strict';

// A spaceship attack between friends, for fun (the API's attack.ts sends it; the orbit map's raid.js flies the ship):
//  · Firing: a 🚀 button on a friend's row (left of ◎ ✉, on hover or keyboard focus), "🚀 Fire" beside Message on their
//    profile, and "🚀 fire at" in the right-click menu. No confirm box: pressing shows "Locking on… · Cancel" for LOCK_MS
//    and Cancel within it aborts (their warning turns to LOCK LOST, the price comes back, and that friend waits out a
//    30-minute cooldown, cancel_cooldown_min). Else it fires. Each fire costs ORB (attack_price, the ORB economy).
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
//    another app in front doesn't hide it; with the map out of sight (the dashboard hidden, minimized, on another Space,
//    covered, or its map under another app's window: the Mac asks, inView()) the banner and its alarm come at once and
//    the ship waits: it flies in the first moment within 2 minutes that the map can be seen (hold(), look()); one whose
//    blast went unseen comes again the same way. If the attacker cancels during the lock, the strip says LOCK LOST and
//    no ship comes.
//  · Whoever was attacked is shielded for 30 minutes (nobody can fire at them): a small "Shielded · m:ss" chip on your
//    own card and profile (shieldChip()).
//  · Settings › Privacy "let friends fire spaceships at me" (`social.attacks`, kept with the account): off, nobody can
//    fire at you, and you can't fire either (the button stays, dimmed: "turn attacks on in Settings").
//  · Hit feel, for the one who fired (strike section, dashboard page): once the API answers the fire, a fixed local
//    timeline runs from that moment (the target's own show is fixed: lock + ship + blast, raid.js): 1.2 s launch sound and
//    the button counts `In flight · 0:07`; 7.64 and 7.78 s two hit ticks on their picture; 7.92 s the blast: their row
//    flashes, cracks, burns 2.5 s, shakes, confirm sound; 8.3 s toast `Your ship hit <name>`; the crack stays to 15.4 s.
//    A cancel stops it all quietly. Row not on screen: the notices panel shows a small HIT plate (kind 'hit', banner()).
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
  const HIT_MS = 1500; // the small HIT plate
  const LOCK_MS = 1200; // the lock-on warning before the ship arrives (the API's attackstate.ts LOCK_MS)
  // Locked, the ship held back a moment more for a cancel sent at the lock's last instant (the API lets one in up to
  // 300 ms late, attack.ts CANCEL_MS): it says LOCK LOST then, never after the ship came.
  const HOLD_MS = 400;
  // m:ss
  const clock = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  // The API's clock: the shield's and the cooldown's ends are on it (attackstate.ts), and the answers that carry times
  // say it as `now` (the friends list, a fire). Counted down against it, a computer clock a few seconds off still starts
  // at 30:00 and 2:00. `skew`: how far the API's clock is ahead of this computer's (ms; behind when negative).
  let skew = 0;
  const serverNow = () => Date.now() + skew;
  const sync = (r) => {
    if (r && typeof r.now === 'number' && Number.isFinite(r.now)) skew = r.now - Date.now();
  };
  // The ORB economy's numbers as the attack shows them (all from Social.orb(), the API's own, live).
  const ORB = () => (window.Social && Social.orb && Social.orb()) || null;
  const orbT = (u) => Social.orbText(u);
  // Long waits (a friend's day cap ends at their midnight): "3 h 12 min", or m:ss under an hour.
  const wait = (ms) => {
    const m = Math.max(0, Math.ceil(ms / 60000));
    return m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : clock(ms);
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
    fireTip: (n, p, cd) => `Fire a little spaceship at ${n}${p ? ` · ${p} ORB` : ''}${cd > 0 ? ` · once every ${cd === 1 ? 'minute' : `${cd} minutes`}` : ''}`,
    firePrice: (p) => (p ? ` · ${p} ORB` : ''),
    menuFire: (n) => `🚀 fire at ${n}`,
    locking: 'Locking on…',
    cancel: 'Cancel',
    lockingAria: (n) => `Locking on to ${n}. Cancel`,
    fired: (n) => `🚀 Fired at ${n}`,
    inFlight: 'In flight',
    hitToast: (n) => `\u{1F4A5} Your ship hit ${n}`,
    hitPlate: 'HIT',
    cancelled: (n, back) => `Lock cancelled · no ship fired at ${n}${back ? ` · ${back} ORB back` : ''}`,
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
      shield: { label: (t) => `shielded · ${t}`, tip: (n, t) => `${n} was just attacked: no one can fire at them for ${(ORB() || {}).shieldMin || 30} minutes after an attack. ${t} left.` },
      cooldown: { label: (t) => `ready in ${t}`, tip: (n, t) => `You can fire at ${n} again in ${t}.` },
      // Your ORB (CONTRACT v3): not enough for the price (`funds`), or the friend was hit as often as allowed today (`target_daily_max`).
      funds: { label: () => 'not enough ORB', tip: (n, t, o) => `Firing costs ${orbT(o.attackPrice)} ORB. You have ${orbT(o.balance)}.` },
      target_daily_max: { label: (t) => `max hits today · ${t}`, tip: (n, t, o) => `${n} was hit ${o.hitsPerDayMax || 3} times today, the most a day allows. You can fire again in ${t}.` },
    },
    // Your own shield.
    shielded: (t) => `Shielded · ${t}`,
    shieldTip: () => `No one can attack you for ${(ORB() || {}).shieldMin || 30} minutes after an attack`,
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
    let cur = null; // the kind up or on its way, until it's gone
    function banner(b) {
      if (!b) return;
      const kind = b.kind === 'lock' || b.kind === 'lost' || b.kind === 'hit' ? b.kind : 'danger';
      if ((kind === 'danger' || kind === 'hit') && !b.name) return;
      // Your own HIT plate never cuts a warning about you (LOCKED ON, DANGER, LOCK LOST): it's let go, its sounds played.
      if (kind === 'hit' && cur && cur !== 'hit') return;
      cur = kind;
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
      // The hit plate (the attacker's side, strike()): a small amber mark, HIT, who was hit; 1.5 s.
      const pic = /^https?:\/\//i.test(String(b.avatar || '')) ? `<img alt="" src="${esc(String(b.avatar).slice(0, 500))}">` : '';
      stage.innerHTML = kind === 'hit'
        ? `<div class="atk-hitplate${still}" aria-hidden="true">${pic}<i>\u2715</i><b>${TEXT.hitPlate}</b><span>${name}</span></div>`
        : kind === 'danger'
        ? `<div class="atk-banner${still}" aria-hidden="true"><i class="atk-haz"></i><div class="atk-in"><b class="atk-big"><i>⚠</i>${TEXT.dangerBig}</b>` +
          `<span class="atk-who">${TEXT.dangerWho(name)}</span>${b.taunt ? `<span class="atk-taunt">${esc(TEXT.taunt)}</span>` : ''}</div><i class="atk-haz"></i></div>`
        : `<div class="atk-banner lock${kind === 'lost' ? ' lost' : ''}${still}" aria-hidden="true"><i class="atk-ret">${RET}</i><div class="atk-in">` +
          `<b class="atk-big">${kind === 'lost' ? TEXT.lostBig : TEXT.lockBig}</b>${kind === 'lost' ? '' : `<span class="atk-who">${TEXT.lockSub}</span>`}</div></div>`;
      sr.textContent = kind === 'hit' ? `${TEXT.hitToast(String(b.name || '').slice(0, 40))}` : kind === 'danger' ? `${TEXT.dangerAria(String(b.name || '').slice(0, 40))}${b.taunt ? ` ${TEXT.taunt}` : ''}` : kind === 'lost' ? TEXT.lostAria : TEXT.lockAria;
      up = true;
      // The panel takes the screen as it does for the flames, letting every click through (messages.js sizeNotes).
      window.Messages?.layout?.();
      if (b.sound && kind !== 'lost' && kind !== 'hit') {
        if (kind === 'lock') Sfx.play('lockon');
        else Sfx.sample('attack-alarm', 0.85);
      }
      // The lock warning stays a moment past the ship's arrival; the DANGER banner replaces it.
      const ms = kind === 'hit' ? HIT_MS : kind === 'lock' ? LOCK_MS + HOLD_MS + 300 : kind === 'lost' ? LOST_MS : BANNER_MS;
      timers.push(setTimeout(() => stage.firstElementChild?.classList.add('out'), ms - 380));
      timers.push(setTimeout(() => {
        stage.innerHTML = '';
        up = false;
        cur = null;
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
    // The newest from each friend, three at most (one of theirs still waiting to be seen, hold(), gives way to it).
    queue = queue.filter((q) => q.from.id !== ev.from.id);
    missed = missed.filter((m) => m.ev.from.id !== ev.from.id);
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
    // Nothing more to play (the one waiting may have been taken back since): back where you were, if the attack took you.
    if (!queue.length) return void release();
    const wait = busyUntil - Date.now();
    if (wait > 0) return void (timer = setTimeout(next, wait + 300));
    play(queue.shift());
  }
  // The map is on screen when the dashboard can be seen (app.js setVisibility: not hidden, minimized or under other
  // windows, `paused`; not under one of the app's own chat windows, `covered`) and no view covers it (they hide #mapwrap).
  // On the Mac, not being the app in front doesn't count against it: `behind` is only another app having the keyboard
  // (a browser, Discord, the released Orbiterm beside the staging one) while the dashboard still shows, and the map is
  // drawn there (raid.js pokes the loop to full speed), so the ship has to come. Counting it is what kept the ship away
  // while the warning showed. Windows can't tell a dashboard beside another app from one under it (it reports only shown
  // and not minimized, main.js), so there `behind` still counts, or the ship would fly unseen.
  const BEHIND_HIDES = window.__platform === 'win32';
  // Windows only: the app is not the one in front (`behind`), but the app has looked at the desktop (main.js 'attackSeen',
  // the window list in front to back) and says the dashboard lies beside the other windows, not under them: that counts as
  // seen, as it does on the Mac. Asked at each attack's start (not once for good: where the windows are changes). The
  // answer takes a moment; none within a second (the helper still compiling, an error): not seen, the banner alone.
  let exposed = false;
  const hiddenBehind = () => BEHIND_HIDES && html.classList.contains('behind') && !exposed;
  async function expose() {
    exposed = false;
    if (!html.classList.contains('behind')) return;
    exposed = await Promise.race([
      h.radar.postMessage({ type: 'attackSeen' }).then((r) => r === true, () => false),
      sleep(1000).then(() => false),
    ]);
  }
  // The dashboard window itself can be seen (the same conditions, apart from a view of the app lying over the map).
  function dashboardSeen() {
    return !html.classList.contains('paused') && !html.classList.contains('covered') && !hiddenBehind() &&
      document.visibilityState === 'visible';
  }
  function mapInSight() {
    const space = document.getElementById('space');
    return dashboardSeen() && !!space && space.clientWidth > 0 && space.clientHeight > 0;
  }
  // The Mac: the window "visible" isn't enough. macOS calls a window visible when any pixel of it shows, so a dashboard at
  // the bottom of the pile, its map under another app's window, counted as seen and the ship flew where nobody saw it
  // (iTerm2 in front, the staging dashboard under it: the flight began, unseen, the sounds came). The app looks at the
  // windows over the map (AttackBridge, RadarView.swift): true when at least half of the map's box is clear of other
  // apps' windows. Asked as the ship is about to come, at its blast, and while a missed one waits (hold()). Another view
  // over the map: the whole page is asked (leave() brings the map back there). No answer within a second: seen, as before.
  // Windows has its own (expose(), the window list at the lock's start).
  const MAC_LOOKS = !BEHIND_HIDES && !!h.attack;
  async function inView() {
    if (!MAC_LOOKS) return true;
    const space = document.getElementById('space');
    const W = innerWidth || 1, H = innerHeight || 1;
    let rect = { x: 0, y: 0, w: 1, h: 1 };
    if (space && space.clientWidth > 0 && space.clientHeight > 0) {
      const b = space.getBoundingClientRect();
      rect = { x: b.left / W, y: b.top / H, w: b.width / W, h: b.height / H };
    }
    let asked;
    try {
      asked = Promise.resolve(h.attack.postMessage({ type: 'seen', rect })).then((r) => r !== false, () => true);
    } catch {
      return true;
    }
    return Promise.race([asked, sleep(1000).then(() => true)]);
  }
  // Another view of the app (Settings' pages are windows over the dashboard and don't hide the map; these do) lies over the
  // map while the dashboard can be seen: the app goes back to the dashboard for the ship, then returns you (away/release).
  // Never when the window is hidden, minimized or under another window (attack.js never takes the focus or un-hides it),
  // and never from where leaving could lose something: the themes' preview, Clean Up, a profile being edited, a file with
  // unsaved changes, a field with the cursor in it (what you type next would go nowhere; an IME's composition is in one
  // too), a mouse button held down (a note being dragged, a selection). Notes save as you type, so they're fine. Those
  // keep the banner alone, as before.
  const BACK_TO = ['notes', 'friends', 'profile', 'board', 'notifications', 'roadmap'];
  // { view, git, profile, took }: where you were, while the attack has you on the dashboard. `took`: you did something
  // yourself meanwhile (a click or a key on the page, another view by any way, even back to the dashboard): you stay.
  let away = null;
  let pressed = false;
  const appEl = document.getElementById('app');
  const onDash = () => !window.Cloud?.current?.() && !appEl?.classList.contains('git-mode');
  const NOT_TEXT = /^(button|checkbox|radio|range|color|file|submit|reset|image|hidden)$/i;
  function writing() {
    const a = document.activeElement;
    if (!a || a === document.body) return false;
    if (a.isContentEditable) return true;
    return (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && !NOT_TEXT.test(a.type))) && !a.readOnly && !a.disabled;
  }
  addEventListener('pointerdown', () => {
    pressed = true;
    if (away) away.took = true;
  }, true);
  addEventListener('pointerup', () => (pressed = false), true);
  addEventListener('pointercancel', () => (pressed = false), true);
  // A release the page never heard of (a native menu, a drag let go outside) is put right by the next move.
  addEventListener('pointermove', (e) => (pressed = e.buttons > 0), { capture: true, passive: true });
  addEventListener('blur', () => (pressed = false)); // the window's own (an element's blur doesn't reach here)
  addEventListener('keydown', (e) => {
    if (away && !['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Fn'].includes(e.key)) away.took = true;
  }, true);
  // Any view opened meanwhile (the activity bar, a shortcut, the menu bar, a notification). Told after leave() and
  // release() have run, so their own switching never counts: on the dashboard then, or `away` already gone.
  if (appEl) new MutationObserver(() => away && !onDash() && (away.took = true)).observe(appEl, { attributes: true, attributeFilter: ['class'] });
  // `dry`: only whether it would (true), nothing switched (a missed ship waiting for the map, look()).
  function leave(dry = false) {
    const space = document.getElementById('space');
    if (!window.GitView || !window.Cloud?.current || !window.Orbit?.attack || reduced() || !dashboardSeen()) return null;
    if (!space || (space.clientWidth > 0 && space.clientHeight > 0) || onDash() || pressed || writing()) return null;
    const view = window.Cloud.current();
    const git = !view && !!appEl?.classList.contains('git-mode');
    if (view && !BACK_TO.includes(view)) return null;
    if (document.getElementById('profile-view')?.classList.contains('editing')) return null;
    if (git && (window.FileEditor?.list?.() || []).some((t) => t.dirty)) return null;
    if (dry) return true;
    // A profile comes back as it was opened: whose, where its Back goes, the leaderboard's list to step through.
    let profile = null;
    if (view === 'profile' && window.Profile?.currentId?.()) {
      const { edit, picEl, ...opts } = window.Profile.opts?.() || {};
      profile = { id: window.Profile.currentId(), opts: { ...opts, instant: true } };
    }
    window.GitView.view('dash'); // the way Esc goes back to the dashboard
    return { view, git, profile, took: false };
  }
  // You go back to where you were, unless you did something yourself meanwhile, or another attack is waiting (it keeps
  // you on the dashboard, and you go back after the last one). Also with the window hidden by then: it shows where you
  // left it when it comes back.
  function release() {
    if (!away || queue.length) return;
    const from = away;
    away = null;
    if (from.took || !onDash() || writing()) return;
    if (from.git) return window.GitView?.open();
    if (from.profile && window.Profile?.openPerson) return window.Profile.openPerson(from.profile.id, from.profile.opts);
    if (!from.view) return;
    // The leaderboard as it was (its week, "Show all"), as back from a profile.
    if (from.view === 'board') window.Cloud?.showView('board', true);
    window.GitView?.view(from.view);
  }
  // The ship's sounds, each played at its moment on the map (raid.js gives the moments); the alarm is the banner's.
  const SOUNDS = ['attack-flyby', 'attack-lasers', 'attack-boom', 'attack-rebuild'];
  // Each attack's own number: its timed release() does nothing once another has started (that one releases you then).
  let seq = 0;
  const back = (my, ms) => setTimeout(() => my === seq && release(), ms);
  function play(ev) {
    const my = ++seq;
    fly(ev, my).catch(() => {
      // Something failed half way: nothing left up, and the next one comes (or, none waiting, you go back: next()).
      reticle(false);
      playing = null;
      busyUntil = Date.now();
      clearTimeout(timer);
      timer = setTimeout(next, 300);
    });
  }
  async function fly(ev, my) {
    busyUntil = Date.now() + 20_000; // the next one waits; set right below, once this one's length is known
    const name = nameOf(ev);
    if (ev.replay) {
      // A missed one, now that the map can be seen (look()): the ship at once, no lock-on (that was when it came). A view
      // of the app over the map is left first, as for a live one.
      if (away && away.took) away = null;
      if (!away && (away = leave())) {
        dispatchEvent(new Event('resize'));
        await sleep(120);
      }
    } else {
      const lock = (playing = { id: ev.from.id, cancelled: false, wake: () => {} });
      const woken = new Promise((ok) => (lock.wake = ok));
      // The warning first, wherever the app is on screen (the notices panel shows it over whatever is in front), then the
      // ship. Its sender stays unnamed until the blast.
      banner('', 'lock');
      // Windows: whether the dashboard can be seen is asked inside the lock's own time (it comes off the wait below), so
      // the ship still comes when the warning says, as on the Mac.
      let spent = 0;
      if (BEHIND_HIDES) {
        const asked = Date.now();
        await expose();
        spent = Date.now() - asked;
      }
      // A view of the app over the map: the dashboard first, so the ship's arrival is seen (once the layout has settled).
      // Already there for the one before: you stay. Gone your own way meanwhile: from where you are now.
      if (away && away.took) away = null;
      if (!away && (away = leave())) {
        dispatchEvent(new Event('resize'));
        await sleep(120);
      }
      reticle(true);
      await Promise.race([sleep(Math.max(0, LOCK_MS + HOLD_MS - spent)), woken]);
      playing = null;
      if (lock.cancelled) {
        reticle(false);
        banner('', 'lost');
        back(my, 600);
        busyUntil = Date.now() + LOST_MS;
        clearTimeout(timer);
        timer = setTimeout(next, LOST_MS + 300);
        return;
      }
    }
    let show = null;
    // The Mac asks the app whether the map really shows (inView()); a moment at most.
    if (mapInSight() && !reduced() && window.Orbit?.attack && (await inView())) {
      // The sounds loaded first (a moment at most, the first time), so each starts on time.
      await Promise.race([Promise.all(SOUNDS.map((s) => Sfx.preload(s))), sleep(1500)]);
      show = mapInSight() ? window.Orbit.attack() : null;
      // The one before still on the map (its frames stopped while the map was out of sight; it ends on the first frame
      // back): once more, a moment later.
      if (!show && mapInSight()) {
        await sleep(400);
        show = mapInSight() ? window.Orbit.attack() : null;
      }
    }
    if (show) {
      busyUntil = Date.now() + show.end;
      back(my, show.end);
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
      // The blast not seen (the map went out of sight on the way: another Space, the window hidden or covered, another
      // app's window over the map): the ship comes again once the map can be seen (hold()).
      setTimeout(async () => {
        if (!(mapInSight() && (await inView()))) hold(ev);
      }, show.boom);
      // The banner and its alarm right after the blast, whatever is in front by then (a replay's is silent: its alarm
      // came when it was fired). The taunt goes on DANGER only if its bubble never showed (the map went out of sight first).
      setTimeout(() => banner(name, 'danger', !said.seen, !ev.replay), show.boom + 350);
    } else if (ev.replay) {
      // Out of sight again just as it was to come: it waits on (its time unchanged).
      reticle(false);
      busyUntil = Date.now();
      back(my, 600);
      hold(ev);
    } else {
      reticle(false);
      busyUntil = Date.now() + BANNER_MS;
      banner(name, 'danger', true);
      back(my, 600);
      // The ship isn't wasted: it comes when the map can be seen (hold()).
      hold(ev);
    }
    clearTimeout(timer);
    timer = setTimeout(next, busyUntil - Date.now() + 300);
  }
  function banner(name, kind = 'danger', taunt = false, sound = true) {
    try {
      h.radar.postMessage({ type: 'attack', name, kind, delay: 0, sound, taunt });
    } catch {}
  }

  // ---------- a missed one comes back ----------
  // The ship flies only where it's seen. When the map is out of sight as it comes (the window hidden, minimized, on another
  // Space or under other windows, a chat window over it), or goes out of sight before the blast, LOCKED ON and DANGER
  // with its alarm come as ever, and the ship waits: the first moment within REPLAY_MS that the map can be seen again
  // (another view of the app over it is left as for a live one, leave()), it flies in and does it all, without the
  // lock-on and with DANGER silent. The newest from each friend, three at most; on do not disturb they're let go. Looked
  // for when the window's state changes (app.js setVisibility, the page shown) and every LOOK_MS (the Mac: another app's
  // window moved off the map tells the page nothing). Windows: the app in front again is what brings it back (expose()'s
  // answer was for the attack's start).
  const REPLAY_MS = 120_000;
  const LOOK_MS = 1500;
  let missed = []; // { ev, until }
  let lookTimer = 0;
  let lookSeq = 0;
  function hold(ev) {
    if (reduced() || !window.Orbit?.attack || !ev || !ev.from) return;
    const until = ev.replay ? ev.until : Date.now() + REPLAY_MS;
    if (!(until > Date.now())) return;
    missed = missed.filter((m) => m.ev.from.id !== ev.from.id);
    missed.push({ ev: { ...ev, replay: true, until }, until });
    if (missed.length > 3) missed.shift();
    exposed = false;
    clearTimeout(lookTimer);
    lookTimer = setTimeout(look, LOOK_MS);
  }
  async function look() {
    clearTimeout(lookTimer);
    lookTimer = 0;
    const my = ++lookSeq;
    missed = missed.filter((m) => m.until > Date.now());
    if (!missed.length) return;
    if (Social.dnd() || reduced()) return void (missed = []);
    const free = !playing && busyUntil <= Date.now() && !queue.length;
    if (free && dashboardSeen() && (mapInSight() || leave(true)) && (await inView())) {
      if (my !== lookSeq) return; // a newer look decides
      const ready = missed.filter((m) => m.until > Date.now()).map((m) => m.ev);
      missed = [];
      if (!ready.length || playing || busyUntil > Date.now() || queue.length) return void ready.forEach(hold);
      queue.push(...ready);
      return void next();
    }
    if (my === lookSeq) lookTimer = setTimeout(look, LOOK_MS);
  }
  const lookNow = () => missed.length && look();
  new MutationObserver(lookNow).observe(html, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', lookNow);

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
  // The cracked glass: 7 to 10 rays from the impact (ix, iy) in a w x hh box, each a few jagged segments, some with a
  // branch, and a ring of shattered glass round it. An SVG for a `.atk-hit` box (damage(), strike()).
  const NS = 'http://www.w3.org/2000/svg';
  const rnd = (a, b) => a + Math.random() * (b - a);
  function cracks(w, hh, ix, iy) {
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
    return svg;
  }

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
    const cleanups = [];
    hits.forEach(({ el, r }, i) => {
      const w = Math.round(r.width), hh = Math.round(r.height);
      const wait = i * DMG.stagger;
      const life = ms - wait - 100;
      const ix = rnd(0.25, 0.75) * w, iy = rnd(0.25, 0.75) * hh;
      const hit = document.createElement('div');
      hit.className = 'atk-hit' + (calm ? ' still' : '');
      hit.style.cssText = `left:${Math.round(r.left)}px;top:${Math.round(r.top)}px;width:${w}px;height:${hh}px;--ix:${ix.toFixed(0)}px;--iy:${iy.toFixed(0)}px;--crack:${DMG.crack}ms;--fade:${DMG.fade}ms;--still:${DMG.still}ms;--wait:${wait}ms;--end:${Math.max(0, life - DMG.fade)}ms`;
      const svg = cracks(w, hh, ix, iy);
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


  // ---------- the hit feel (for the one who fired) ----------
  // From the moment the API answers a fire (t0), a fixed local timeline (ms from t0; the target's show is fixed too, raid.js):
  // launch sound + `In flight` countdown on the button, a thin amber line along their row filling to the blast, two hit
  // ticks on their picture, then the blast: row flashes 80 ms, cracks (the same glass as damage()), burns 2.5 s (fire.js),
  // shakes (only that row: no window shake, no focus), confirm sound; then the toast and, with the row out of sight, the
  // notices panel's HIT plate. The crack stays to `crack`. Late by more than `stale` (computer slept): skipped.
  // Reduced motion: no flash, flame, shake or line; the ticks, text and a fading crack remain. Cancel: stopHit(id).
  const HIT = { launch: 1200, marks: [7640, 7780], boom: 7920, toast: 8300, crack: 15400, flash: 80, burn: 2500, shake: 280, stale: 1000 };
  const HIT_SOUNDS = ['attack-launch', 'attack-hitmark', 'attack-confirm'];
  // One per friend (two ships at two friends fly side by side): id → { id, name, t0, timers, recs, marks, boomed, until, frame }
  const flights = new Map();
  const CKEY = (id) => (window.CSS && CSS.escape ? CSS.escape(id) : String(id).replace(/"/g, ''));
  const shown = (el) => {
    if (!el || !dashboardSeen()) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  };
  // Where their picture is on screen now: their row (friends list) and/or their profile's top.
  function spots(id) {
    const out = {};
    const row = [...document.querySelectorAll(`.fr-row[data-id="${CKEY(id)}"]`)].find(shown);
    if (row) out.row = { el: row, av: row.querySelector('.fr-av') };
    if (window.Cloud?.current?.() === 'profile' && window.Profile?.currentId?.() === id) {
      const hero = document.querySelector('#profile-view .pv-hero');
      if (shown(hero)) out.profile = { el: hero, av: hero.querySelector('.pp-pic') };
    }
    return out;
  }
  let skLayer = null;
  function layer() {
    if (!skLayer || !skLayer.isConnected) {
      skLayer = document.createElement('div');
      skLayer.id = 'atk-strike';
      skLayer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(skLayer);
    }
    return skLayer;
  }
  // One overlay per place, drawn over the row/profile top and following it (it moves, scrolls, is drawn again).
  function mkRec(fl, kind, rect) {
    const w = Math.max(1, Math.round(rect.width)), hh = Math.max(1, Math.round(rect.height));
    const box = document.createElement('div');
    box.className = 'atk-sk';
    box.innerHTML = '<i class="sk-flash"></i><span class="sk-mk"></span><i class="sk-prog"></i>';
    layer().appendChild(box);
    const rec = { kind, box, mk: box.querySelector('.sk-mk'), w, hh, hit: null, nmarks: 0, amber: false };
    if (fl.boomed) crackOn(fl, rec);
    return rec;
  }
  function crackOn(fl, rec) {
    if (rec.hit) return;
    const calm = reduced();
    const wait = Math.max(0, HIT.flash);
    const left = Math.max(1200, fl.t0 + HIT.crack - Date.now());
    const ix = Math.round(rnd(0.3, 0.7) * rec.w), iy = Math.round(rnd(0.3, 0.7) * rec.hh);
    const hit = document.createElement('div');
    hit.className = 'atk-hit' + (calm ? ' still' : '');
    hit.style.cssText = `--ix:${ix}px;--iy:${iy}px;--crack:${DMG.crack}ms;--fade:${DMG.fade}ms;--still:${DMG.still}ms;--wait:${wait}ms;--end:${Math.max(0, left - wait - DMG.fade)}ms`;
    const svg = cracks(rec.w, rec.hh, ix, iy);
    svg.setAttribute('preserveAspectRatio', 'none');
    hit.appendChild(svg);
    rec.box.appendChild(hit);
    rec.hit = hit;
  }
  function track(fl) {
    if (flights.get(fl.id) !== fl) return;
    const now = Date.now() - fl.t0;
    const sp = spots(fl.id);
    for (const kind of ['row', 'profile']) {
      const t = sp[kind];
      let rec = fl.recs[kind];
      if (!t) {
        if (rec) rec.box.style.display = 'none';
        continue;
      }
      if (!rec) {
        // Nothing to show on a row before the launch (the line starts there) or after the crack's end.
        if (now < HIT.launch - 300) continue;
        rec = fl.recs[kind] = mkRec(fl, kind, t.el.getBoundingClientRect());
        if (!reduced() && !fl.boomed) {
          const pr = rec.box.querySelector('.sk-prog');
          pr.style.animation = `atk-prog ${HIT.boom - HIT.launch}ms linear ${HIT.launch - now}ms both`;
        } else rec.box.querySelector('.sk-prog').style.display = 'none';
      }
      const r = t.el.getBoundingClientRect();
      rec.box.style.cssText = `display:block;left:${r.left.toFixed(1)}px;top:${r.top.toFixed(1)}px;width:${r.width.toFixed(1)}px;height:${r.height.toFixed(1)}px`;
      if (t.av) {
        const a = t.av.getBoundingClientRect();
        rec.mk.style.cssText = `left:${(a.left - r.left).toFixed(1)}px;top:${(a.top - r.top).toFixed(1)}px;width:${a.width.toFixed(1)}px;height:${a.height.toFixed(1)}px`;
      }
      // The ticks and the amber of the blast stand on their picture and stay (written once each, kept on redraw).
      while (rec.nmarks < fl.marks) {
        const x = document.createElement('i');
        x.textContent = '✕';
        x.style.cssText = rec.nmarks ? 'left:62%;top:58%' : 'left:36%;top:30%';
        rec.mk.appendChild(x);
        rec.nmarks++;
      }
      if (fl.boomed && !rec.amber) {
        rec.amber = true;
        rec.mk.classList.add('amber');
        rec.box.querySelector('.sk-prog')?.remove();
        crackOn(fl, rec);
      }
    }
    fl.frame = requestAnimationFrame(() => track(fl));
  }
  // The blast on every place their picture shows: flash, shake, a short fire (not on a row already burning).
  function blast(fl) {
    fl.boomed = true;
    const sp = spots(fl.id);
    const calm = reduced();
    for (const kind of ['row', 'profile']) {
      const t = sp[kind];
      if (!t) continue;
      const rec = fl.recs[kind];
      if (rec && !calm) {
        rec.box.querySelector('.sk-flash')?.animate([{ opacity: 0.75 }, { opacity: 0.75, offset: HIT.flash / (HIT.flash + 180) }, { opacity: 0 }], { duration: HIT.flash + 180 });
        t.el.animate([
          { transform: 'translate(0,0)' }, { transform: 'translate(-4px,1px)' }, { transform: 'translate(4px,-1px)' },
          { transform: 'translate(-3px,0)' }, { transform: 'translate(2px,1px)' }, { transform: 'translate(0,0)' }
        ], { duration: HIT.shake, easing: 'linear' });
      }
      if (kind === 'row' && rec && !calm && window.Fire && !t.el.classList.contains('fire')) burn(rec, fl);
    }
  }
  function burn(rec, fl) {
    const spot = document.createElement('div');
    spot.className = 'sk-fire';
    const light = document.createElement('div');
    light.className = 'sk-glow';
    const canvas = document.createElement('canvas');
    spot.append(light, canvas);
    rec.box.appendChild(spot);
    const t0 = performance.now();
    const tall = 66;
    const reach = () => {
      const x = Math.min(1, (performance.now() - t0) / HIT.burn), low = x < 0.5 ? 0 : (x - 0.5) / 0.5;
      light.style.opacity = (Math.min(1, x / 0.1) * (1 - low)).toFixed(3);
      return [tall * 0.66 * (1 - 0.55 * low ** 1.3), 0, 0];
    };
    let stop = null;
    try {
      stop = Fire.burn(canvas, { reach, scale: 12, life: HIT.burn, mound: true });
    } catch {}
    fl.timers.push(setTimeout(() => {
      try { stop?.(); } catch {}
      spot.remove();
    }, HIT.burn + 300));
  }
  function startHit(id, name, t0 = Date.now()) {
    stopHit(id);
    const fl = { id, name, t0, timers: [], recs: {}, marks: 0, boomed: false, until: t0 + HIT.boom, frame: 0 };
    flights.set(id, fl);
    HIT_SOUNDS.forEach((n) => Sfx.preload(n));
    // Each moment once, on time; one come too late (the computer slept, the page was held) is skipped, not played stale.
    const at = (ms, fn) => {
      const wait = ms - (Date.now() - t0);
      if (wait < -HIT.stale) return;
      fl.timers.push(setTimeout(() => flights.get(id) === fl && Date.now() - t0 - ms <= HIT.stale && fn(), Math.max(0, wait)));
    };
    at(HIT.launch, () => Sfx.slot('attack-launch', 0.5));
    HIT.marks.forEach((ms, i) => at(ms, () => {
      fl.marks = i + 1;
      Sfx.slot('attack-hitmark', 0.4);
    }));
    at(HIT.boom, () => {
      Sfx.slot('attack-confirm', 0.5);
      blast(fl);
      paintAll();
    });
    at(HIT.toast, () => {
      // Their row or profile in sight: the toast. Out of sight: the notices panel's plate says it instead (the same path
      // as DANGER/LOCKED ON). Shape sent: { type: 'attack', kind: 'hit', name, avatar, delay: 0, sound: false } (hit-contract.md).
      if (Object.keys(spots(id)).length) return void say(TEXT.hitToast(name));
      try {
        const f = Social.friend(id);
        const av = f && typeof f.avatar === 'string' && /^https?:\/\//i.test(f.avatar) ? f.avatar : '';
        h.radar.postMessage({ type: 'attack', kind: 'hit', name: String(name).slice(0, 40), avatar: av, delay: 0, sound: false });
      } catch {}
    });
    fl.timers.push(setTimeout(() => stopHit(id, fl), Math.max(0, HIT.crack + 300 - (Date.now() - t0))));
    fl.frame = requestAnimationFrame(() => track(fl));
    paintAll();
  }
  // Everything of the ship at that friend off at once, quietly (a cancel, the end); `only`: just if it's still that one.
  function stopHit(id, only) {
    const fl = flights.get(id);
    if (!fl || (only && fl !== only)) return;
    flights.delete(id);
    fl.timers.forEach(clearTimeout);
    cancelAnimationFrame(fl.frame);
    Object.values(fl.recs).forEach((r) => r.box.remove());
    paintAll();
  }
  // The button's label while its ship is on its way: the time to the blast, m:ss.
  const inFlight = (id) => {
    const fl = flights.get(id);
    // (a blast skipped as stale ends it too)
    return !!fl && !fl.boomed && Date.now() < fl.until + HIT.stale;
  };

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
  // A friend hit as often as a day allows (`target_daily_max`), until their next local midnight: id -> ms (API clock). Kept
  // here, not in f.attack: the friends list doesn't carry it (CONTRACT v3), so a reload of the list would forget it.
  const dailyMax = new Map();
  function status(f) {
    if (!f) return null;
    const n = f.nick || f.name;
    const a = f.attack || {};
    const now = serverNow();
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
    else if ((dailyMax.get(f.id) || 0) > now) (why = 'target_daily_max'), (until = dailyMax.get(f.id));
    // Your ORB (known once the API has sent it): not enough for the price.
    const o = ORB();
    if (!why && o && Number.isFinite(o.attackPrice) && Number.isFinite(o.balance) && o.balance < o.attackPrice) why = 'funds';
    if (!why) return null;
    const t = until ? (why === 'cooldown' ? clock(until - now) : wait(until - now)) : '';
    return { why, until, label: TEXT.blocked[why].label(t), tip: TEXT.blocked[why].tip(n, t, o || {}) };
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
    const fl = inFlight(f.id);
    const lk = (locking && locking.id === f.id) || fl;
    const dim = !lk && s ? ' atk-off' : '';
    const attrs = `type="button" data-act="attack" data-atk="${esc(f.id)}" data-kind="${kind}"${s && !lk ? ' aria-disabled="true"' : ''}`;
    const flt = fl ? `${TEXT.inFlight} \u00b7 ${clock(flights.get(f.id).t0 + HIT.boom - Date.now())}` : '';
    const aria = fl ? `${TEXT.inFlight}, ${n}` : lk ? TEXT.lockingAria(n) : s ? `${TEXT.fireAria(n)}: ${s.label}` : TEXT.fireAria(n);
    const price = ORB() && Number.isFinite(ORB().attackPrice) ? orbT(ORB().attackPrice) : '';
    const tip = fl ? flt : lk ? TEXT.cancel : s ? s.tip : TEXT.fireTip(n, price, (ORB() || {}).cooldownMin ?? 2);
    const body = fl && !(locking && locking.id === f.id) ? `🚀 ${flt}` : lk ? `🚀 ${TEXT.locking} · ${TEXT.cancel}` : null;
    if (kind === 'menu') {
      return `<button ${attrs} data-ctx="attack" class="${dim.trim()}${lk ? ' locking' : ''}" title="${esc(tip)}">${lk ? body : `${esc(TEXT.menuFire(n))}${s ? ` · ${esc(s.label)}` : esc(TEXT.firePrice(price))}`}</button>`;
    }
    if (kind === 'pv') {
      return `<button ${attrs} class="bd-glassbtn atk-pv${dim}${lk ? ' locking' : ''}" title="${esc(tip)}" aria-label="${esc(aria)}">${lk ? body : `🚀 ${TEXT.fire}${s ? ` · ${esc(s.label)}` : esc(TEXT.firePrice(price))}`}</button>`;
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
    const now = serverNow();
    return u && u > now ? u - now : 0;
  };
  const SHIELD_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 13.5 3.5v4c0 3.2-2.3 5.6-5.5 7-3.2-1.4-5.5-3.8-5.5-7v-4z"/></svg>';
  // Always drawn (hidden without a shield) so it shows the moment a shield starts; the clock below fills it in.
  const shieldChip = () => {
    const left = shieldLeft();
    return `<span class="atk-shield" title="${esc(TEXT.shieldTip())}"${left ? '' : ' hidden'}>${SHIELD_ICON}<b>${left ? esc(TEXT.shielded(clock(left))) : ''}</b></span>`;
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
    sync(r);
    // Your ORB as a refusal says it: what you have and the price, or the day's limit. (A fire's own `orb` is taken as its
    // answer comes, press(): by the lock's end a newer push may be in.)
    if (r.why === 'funds') Social.setOrb({ attackPrice: r.price, balance: r.balance });
    if (r.why === 'target_daily_max' && r.max) Social.setOrb({ hitsPerDayMax: r.max });
    if (!f) return;
    f.attack = f.attack || {};
    if (r.readyAt && (r.why === 'cooldown' || r.fired)) f.attack.cooldownUntil = r.readyAt;
    if (r.why === 'shield' && r.readyAt) f.attack.shieldUntil = r.readyAt;
    if (r.why === 'target_daily_max' && r.readyAt) dailyMax.set(f.id, r.readyAt);
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
    if (why === 'funds' || why === 'target_daily_max') return say(s && s.why === why ? s.tip : TEXT.blocked[why].tip(n, why === 'target_daily_max' ? wait((r.readyAt || 0) - serverNow()) : '', ORB() || {}));
    say(TEXT.changed[why] ? TEXT.changed[why](n) : s ? s.tip : (TEXT.blocked[why] || TEXT.blocked.offline).tip(n, ''));
  }
  function press(id) {
    const f = Social.friend(id);
    if (!f) return;
    const n = f.nick || f.name;
    if (locking) return locking.id === id ? cancel(locking) : say(TEXT.oneAtATime);
    // Its ship still on the way: the button only counts (a second ship at another friend is fine).
    if (inFlight(id)) return;
    const s = status(f);
    if (s) return say(s.tip);
    const lk = (locking = { id, name: n, cancel: false });
    lk.req = api('POST', `v1/friends/${encodeURIComponent(id)}/attack`, {});
    lk.timer = setTimeout(() => settle(lk, f), LOCK_MS);
    paintAll();
    Sfx.play('locktick');
    // Refused at once (their state changed): no waiting for the lock to run out.
    lk.req.then((r) => {
      if (r && r.orb) Social.setOrb(r.orb);
      // The ship is on its way: the hit timeline runs from this answer (cancel() stops it).
      if (r && r.fired && !lk.cancel) {
        lk.t0 = Date.now();
        startHit(id, n, lk.t0);
      }
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
    }
  }
  // Cancel within the lock-on: their warning turns to LOCK LOST, the price comes back (the chip follows the answer's `orb`
  // and the `orb` push) and that friend's cooldown becomes the longer cancel one (the answer's readyAt).
  function cancel(lk) {
    clearTimeout(lk.timer);
    lk.cancel = true;
    locking = null;
    stopHit(lk.id);
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
      if (c && c.orb) Social.setOrb(c.orb);
      if (c && c.cancelled) {
        if (f) {
          f.attack.shieldUntil = null;
          // The 30-minute cooldown on this friend (CONTRACT v3): the button counts it down.
          if (c.readyAt) f.attack.cooldownUntil = c.readyAt;
        }
        sync(c);
        say(TEXT.cancelled(lk.name, c.refunded > 0 ? orbT(c.refunded) : ''));
      } else startHit(lk.id, lk.name, lk.t0 || Date.now()); // too late to cancel: the ship flew, the timeline goes on
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

  // ---------- staging: "↺ RESET ATTACK" (social-test.js) ----------
  // Clears your shield and every cooldown you are in (the API's POST v1/friends/attack/reset, on staging and local only),
  // then loads the friends list again so each 🚀 has the state the API now has.
  async function reset() {
    const r = await api('POST', 'v1/friends/attack/reset', {});
    if (!r || r.error || !r.reset) return say(`test: ${(r && r.error) || 'reset failed'}`);
    await Social.load();
    paintAll();
    paintShield();
    say('attack reset · shield and cooldowns cleared');
  }

  // ---------- live ----------
  Social.on((ev, S) => {
    // The friends list came (social.js): the API's clock with it.
    if (ev.type === 'snapshot') sync(S);
    if (ev.type === 'attack') arrive(ev);
    // Your ORB, the price or the limits changed: every fire button says it at once.
    if (ev.type === 'orb' || ev.type === 'orb_settings' || ev.type === 'orb_state') paintAll();
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

  return { on, button, blocked, status, shieldChip, test, reset, text: TEXT, wide: () => false };
})();
