'use strict';

// A spaceship attack between friends, for fun (the API's attack.ts sends it; attack-screen.js plays it on the victim's screen):
//  · Firing: a 🚀 button on a friend's row (left of ◎ ✉, on hover or keyboard focus), "🚀 Fire" beside Message on their
//    profile, and "🚀 fire at" in the right-click menu. No confirm box: pressing shows "Locking on… · Cancel" for LOCK_MS
//    and Cancel within it aborts (their warning turns to LOCK LOST, the price comes back, and that friend waits out a
//    30-minute cooldown, cancel_cooldown_min). Else it fires. Each fire costs ORB (attack_price, the ORB economy).
//  · A friend who can't be fired at keeps the button, dimmed, with the reason (status()): away, do not disturb, offline
//    (invisible looks offline), turned off, shielded · m:ss, ready in m:ss. The API sends each friend's state in the
//    friends list and keeps it live (attack_state events, social.js); it enforces the same on fire.
//  · Fired at you: first LOCKED ON (LOCK_MS): a thin strip in the notices panel, where DANGER shows, and a cockpit frame
//    deploying round the screen (the 3D show; the old one's reticle closes onto its middle instead); five rising beeps and
//    a lock tone (sfx.js lockon). The attacker's name is NOT shown
//    there. Then a big spaceship comes straight at your screen out of deep space, fires three times at it, and the glass
//    cracks at each hit (the third is the big one); DANGER says who fired (the nickname you gave them, else their name)
//    with an alarm and the ship's taunt. The ship rolls away, the cracks seal a few seconds later. About 14 s, each sound
//    (sounds/attack-*.m4a) at its moment; nothing is harmed, every click goes through it and it never takes the focus.
//    All of it plays in the notices panel (messages.html, attack-screen.js), which has the whole screen the app is on
//    for it, over whatever is in front (a full-screen app, another Space, the dashboard hidden, minimized or covered), so
//    where the map or the dashboard is doesn't matter. This page only decides (do not disturb, one at a time, the lock
//    and a cancel within it) and tells that page when (the radar handler's "attack" kinds lock, show, lost). If the attacker cancels during the lock, the strip says LOCK LOST and no ship comes.
//    The Windows app shows the same (its main.js gives the notices window the whole display for place "attack").
//  · Whoever was attacked is shielded for 30 minutes (nobody can fire at them): a small "Shielded · m:ss" chip on your
//    own card and profile (shieldChip()).
//  · Settings › Privacy "let friends fire spaceships at me" (`social.attacks`, kept with the account): off, nobody can
//    fire at you, and you can't fire either (the button stays, dimmed: "turn attacks on in Settings").
//  · Hit feel, for the one who fired (strike section, dashboard page): once the API answers the fire, a fixed local
//    timeline runs from that moment (the target's own show is fixed: lock + ship + blast, attack-screen.js): 1.2 s launch sound and
//    the button counts `In flight · 0:07`; 7.64 and 7.78 s two hit ticks on their picture; 7.92 s the blast: their row
//    flashes, cracks, burns 2.5 s, shakes, confirm sound; 8.3 s toast `Your ship hit <name>`; the crack stays to 15.4 s.
//    A cancel stops it all quietly. Row not on screen: the notices panel shows a small HIT plate (kind 'hit', banner()).
// Two pages load this file: the dashboard hears the attack and decides; the notices panel shows the
// banner it's told to (Swift relays it: the radar handler's "attack" → MessagePanel.attack → Attack.banner; Windows:
// main.js).

window.Attack = (() => {
  const ROLE = window.__MESSAGES_ROLE__ || 'dashboard';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The screen's show (attack-screen.js): the Mac (Messages.swift) and Windows (main.js) both give the notices panel the
  // whole screen for it (its panel place "attack"). Kept as a switch for the fallback below (no show script, no show).
  const SCREEN = true;
  // The cracks' timings on a friend's row (strike(), the attacker's side), in ms.
  const DMG = {
    crack: 220, // the cracks drawing out from the impact
    fade: 700, // the cracks sealing at the end
    still: 400 // reduced motion: the cracks' fade in and out
  };
  const BANNER_MS = 2500; // the DANGER banner up, its fade-out at the end included
  const LOST_MS = 700; // LOCK LOST
  const HIT_MS = 1500; // the small HIT plate
  const SHOW_MS = 14500; // the ship's show on the screen, from the end of the lock (attack-screen.js T.END)
  const LOCK_MS = 1200; // the lock-on warning before the ship arrives (the API's attackstate.ts LOCK_MS)
  // Locked, the ship held back a moment more for a cancel sent at the lock's last instant (the API lets one in up to
  // 300 ms late, attack.ts CANCEL_MS): it says LOCK LOST then, never after the ship came.
  const HOLD_MS = 400;
  // The notices page holds the lock-on back at most this long while it makes the 3D show (attack-screen3d.js LOCK_WAIT),
  // so the strip, its sound and the cockpit frame start together; the whole show is that much later there.
  const LOAD_MS = 1500;
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
    // The lock-on's one line, worded only here: banner() puts it on the strip and hands it to the screen's show
    // (AttackScreen.lock(label); the 3D cockpit draws no line of its own, so the strip is where it shows). The lock names
    // nobody today (the dashboard sends it with no name), so it reads LOCKED ON; given a name it says who.
    lock: (n) => (n ? `${n} locked on you` : 'LOCKED ON'),
    lockAria: (n) => (n ? `Locked on. ${n} locked on you.` : 'Locked on.'),
    lostBig: 'LOCK LOST',
    lostAria: 'Lock lost.',
    dangerBig: 'DANGER',
    dangerWho: (n) => `<b>${n}</b> fired at you`,
    dangerAria: (n) => `Danger. ${n} fired at you.`,
    // What the ship says as it attacks: the line under who fired in DANGER.
    taunt: 'hahaha yowai mo',
    // The firing buttons.
    fire: 'Fire',
    fireAria: (n) => `Fire at ${n}`,
    // Who fired at me (messages.js): the card's and the chat's button.
    fireBack: 'Fire back',
    fireBackAria: (n, p) => `Fire back at ${n}${p ? `, ${p} ORB` : ''}`,
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
      // Their app is too old for the ship (the API's `outdated`, from the capabilities each app announces): nothing is charged.
      outdated: { label: () => 'needs to update', tip: (n) => `${n} needs to update Orbiterm. You can fire when they have.` },
      // Your own status is Away, Do Not Disturb or Invisible: no firing at all, not even back (the API's `mine_busy`).
      mine_busy: { label: () => `you're ${myStatusName()}`, tip: () => `You're ${myStatusName()}, so you can't fire. Set your status to online to fire.` },
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
      hint: "a friend's little spaceship flies at your screen and cracks the glass for a few seconds (nothing is really broken) · off: nobody can fire at you, and you can't fire at them either",
      aria: 'Let friends fire spaceships at me',
      on: 'friends can fire spaceships at you again',
      off: "friends can't fire spaceships at you now",
    },
    offlineNote: "can't reach the server",
  };

  // ======================= shared by every page =======================
  // Your switch (Settings › Privacy), and why a friend can't be fired at right now: the dashboard's buttons and the Fire back
  // on the who-fired-at-me card and in a chat (the notices and chat pages) all say the same words.
  const me = () => (window.Social && Social.state() && Social.state().me) || null;
  // The statuses you can't fire from (the API's `mine_busy`): picked by you, not the automatic away after 10 idle minutes.
  const NO_FIRE = { idle: 'away', dnd: 'on do not disturb', invisible: 'invisible' };
  const myStatusName = () => NO_FIRE[(me() || {}).status] || 'on do not disturb';
  let takes = null; // your switch, once known; on until then
  const on = () => (takes !== null ? takes !== false : !me() || me().attacks !== false);
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
    // Revenge (the API's `revengeUntil`): they fired at you and you haven't since, so their status and switch don't count.
    // Whether their app is really there is the API's to say when you fire (invisible shows as offline here).
    const revenge = a.revengeUntil > now;
    if (!on()) why = 'mine_off';
    else if (me() && NO_FIRE[me().status]) why = 'mine_busy';
    else if (!revenge && p === 'offline') why = 'offline';
    else if (!revenge && p === 'dnd') why = 'dnd';
    else if (!revenge && p === 'idle') why = 'away';
    else if (!revenge && a.off) why = 'off';
    else if (a.outdated) why = 'outdated';
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

  // ---------- Fire back: the card in the corner and the chat ----------
  // Only the dashboard fires (press, cancel and the hit feel are below). The notices and chat pages draw the button, post
  // `attackFire` / `attackCancel` (messages.js, Swift relays) and learn the 🚀's state from the dashboard (`attackBtn`):
  // locking on, in flight, or idle; `until` is when the blast comes (ms, this computer's clock).
  const btn = new Map(); // friend id -> { state, until }
  function cardButton(f, mini = false) {
    if (!f) return '';
    const n = f.nick || f.name;
    const b = btn.get(f.id);
    const state = b && b.state !== 'idle' ? b.state : '';
    const s = !state ? status(f) : null;
    const price = ORB() && Number.isFinite(ORB().attackPrice) ? orbT(ORB().attackPrice) : '';
    const attrs = `type="button" class="fd-fire${mini ? ' mini' : ''}${s ? ' atk-off' : ''}${state ? ' locking' : ''}" data-act="fire" data-atk="${esc(f.id)}"${state ? ` data-state="${state}"` : ''}${mini ? ' data-mini="1"' : ''}${s ? ' aria-disabled="true"' : ''}`;
    if (state) {
      const text = state === 'locking' ? `${TEXT.locking} \u00b7 ${TEXT.cancel}` : `${TEXT.inFlight} \u00b7 ${clock(b.until - Date.now())}`;
      const aria = state === 'locking' ? TEXT.lockingAria(n) : `${TEXT.inFlight}, ${n}`;
      return `<button ${attrs} title="${esc(text)}" aria-label="${esc(aria)}">\u{1F680}${mini ? '' : ` ${esc(text)}`}</button>`;
    }
    const tip = s ? s.tip : TEXT.fireTip(n, price, (ORB() || {}).cooldownMin ?? 2);
    const aria = s ? `${TEXT.fireBackAria(n, price)}: ${s.label}` : TEXT.fireBackAria(n, price);
    const small = s ? ` <small>\u00b7 ${esc(s.label)}</small>` : price ? ` <small>\u00b7 ${esc(price)} ORB</small>` : '';
    return `<button ${attrs} title="${esc(tip)}" aria-label="${esc(aria)}">\u{1F680}${mini ? '' : ` ${TEXT.fireBack}${small}`}</button>`;
  }
  // Your own shield on the card and in the chat: hidden without one; the clock fills it in (tick()).
  const SHIELD_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 13.5 3.5v4c0 3.2-2.3 5.6-5.5 7-3.2-1.4-5.5-3.8-5.5-7v-4z"/></svg>';
  const shieldLeftMs = () => {
    const u = me() && me().shieldUntil;
    const now = serverNow();
    return u && u > now ? u - now : 0;
  };
  const cardShield = () => {
    const left = shieldLeftMs();
    return `<span class="fd-shield" title="${esc(TEXT.shieldTip())}"${left ? '' : ' hidden'}>${SHIELD_SVG}<b>${left ? esc(TEXT.shielded(clock(left))) : ''}</b></span>`;
  };
  // Once a second, only while something shows them: the buttons and the shield redrawn in place (focus stays).
  function tick() {
    document.querySelectorAll('.fd-fire[data-atk]').forEach((el) => {
      const f = Social.friend(el.dataset.atk);
      if (!f) return;
      const t = document.createElement('template');
      t.innerHTML = cardButton(f, !!el.dataset.mini);
      const nu = t.content.firstElementChild;
      if (!nu || nu.outerHTML === el.outerHTML) return;
      const focused = document.activeElement === el;
      el.replaceWith(nu);
      if (focused) nu.focus();
    });
    const left = shieldLeftMs();
    document.querySelectorAll('.fd-shield').forEach((el) => {
      el.hidden = !left;
      const b = el.querySelector('b');
      const text = left ? TEXT.shielded(clock(left)) : '';
      if (b && b.textContent !== text) b.textContent = text;
    });
  }
  // The dashboard's 🚀 changed state for a friend (messages.js attackBtn). A fired one counts here as it does there: that
  // friend's cooldown and shield start, so the button doesn't light up again before they could be fired at.
  function setBtn(m) {
    if (!m || !m.id) return;
    const was = btn.get(m.id);
    if (m.state === 'idle') btn.delete(m.id);
    else btn.set(m.id, { state: m.state, until: Number(m.until) || 0 });
    const f = Social.friend(m.id);
    if (f && m.state === 'flight' && (!was || was.state !== 'flight')) {
      const o = ORB() || {};
      f.attack = { ...(f.attack || {}), cooldownUntil: serverNow() + (o.cooldownMin ?? 2) * 60000, shieldUntil: serverNow() + (o.shieldMin ?? 30) * 60000 };
    }
    tick();
  }
  if (ROLE !== 'dashboard') {
    setInterval(() => document.querySelector('.fd-fire[data-atk], .fd-shield') && tick(), 1000);
    window.Social && Social.on((ev, S) => {
      // The API's clock with the friends list; your switch changed on another computer (or here, in Settings).
      if (ev.type === 'snapshot') sync(S);
      if (ev.type === 'settings' && ev.set && 'social.attacks' in ev.set) {
        takes = ev.set['social.attacks'] !== false;
        if (me()) me().attacks = takes;
      }
      if (['presence', 'status', 'attack_state', 'caps', 'friend', 'orb', 'orb_settings', 'orb_state', 'snapshot'].includes(ev.type)) tick();
    });
  }

  // ======================= the notices panel: the banner =======================
  if (ROLE === 'notices') {
    let box = null;
    let stage = null;
    let sr = null;
    let up = false;
    let timers = [];
    let gen = 0; // banner() calls so far: a lock-on held back for the 3D show shows only if it's still the last one
    let cur = null; // the kind up or on its way, until it's gone
    let dangerEnd = 0; // when the last DANGER banner ended (the who-fired-at-me card waits for it, messages.js afterDanger)
    let cardWaits = false; // DANGER ended while the show was still up: the card comes when the show ends
    function afterShow() {
      if (cardWaits) {
        cardWaits = false;
        dangerEnd = Date.now();
        window.Messages?.afterDanger?.();
      }
    }
    function banner(b) {
      if (!b) return;
      const kind = b.kind === 'lock' || b.kind === 'lost' || b.kind === 'hit' || b.kind === 'show' ? b.kind : 'danger';
      if ((kind === 'danger' || kind === 'hit') && !b.name) return;
      // The ship's show on the whole screen (attack-screen3d.js, else attack-screen.js): the lock-on's cockpit frame (or
      // reticle), the ship after it, DANGER at the blast, a cancel within the lock takes it down. The strip is the banner's.
      if (kind === 'show') {
        const name = String(b.name || '').slice(0, 40);
        const danger = { kind: 'danger', name, sound: b.sound !== false, taunt: b.taunt === true };
        if (SCREEN && window.AttackScreen) return void AttackScreen.start({ onBlast: () => banner(danger), onEnd: afterShow });
        // No show here (Windows, or its script missing): DANGER alone, about when the blast would be.
        return void banner({ ...danger, delay: 5000 });
      }
      // The lock-on's one line (TEXT.lock), made once here: the strip shows it and the screen's show is given it.
      const label = kind === 'lock' ? TEXT.lock(String(b.name || '').slice(0, 40)) : '';
      // The 3D show holds its lock-on back until its scene is made (a promise, LOAD_MS at most): the strip and its sound
      // wait for it, so they start with the cockpit frame.
      const held = kind === 'lock' && SCREEN ? window.AttackScreen?.lock(label) : null;
      if (kind === 'lost' && SCREEN) window.AttackScreen?.cancel();
      // Your own HIT plate never cuts a warning about you (LOCKED ON, DANGER, LOCK LOST): it's let go, its sounds played.
      if (kind === 'hit' && cur && cur !== 'hit') return;
      cur = kind;
      timers.forEach(clearTimeout);
      timers = [];
      const at = ++gen; // a banner that comes meanwhile wins over a lock-on still held back
      const go = () => at === gen && timers.push(setTimeout(() => show(b, kind, label), Math.max(0, Math.min(5000, Number(b.delay) || 0))));
      if (held && typeof held.then === 'function') held.then(go, go);
      else go();
    }
    const RET = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5"/><circle cx="12" cy="12" r="1.6"/></svg>';
    function show(b, kind, label) {
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
          `<b class="atk-big">${kind === 'lost' ? TEXT.lostBig : esc(label)}</b></div></div>`;
      sr.textContent = kind === 'hit' ? `${TEXT.hitToast(String(b.name || '').slice(0, 40))}` : kind === 'danger' ? `${TEXT.dangerAria(String(b.name || '').slice(0, 40))}${b.taunt ? ` ${TEXT.taunt}` : ''}` : kind === 'lost' ? TEXT.lostAria : TEXT.lockAria(String(b.name || '').slice(0, 40));
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
        // DANGER is over: the card that says who fired comes now (never over the banner, never before the blast).
        // With the ship's show still on the screen it follows the show instead (afterShow).
        if (kind === 'danger') {
          dangerEnd = Date.now();
          if (window.AttackScreen?.active()) cardWaits = true;
          else window.Messages?.afterDanger?.();
        }
      }, ms));
    }
    // The alarm ready before it's needed.
    setTimeout(() => Sfx.preload('attack-alarm'), 8000);
    // The screen's show lays the panel over the whole screen (messages.js sizeNotes: place "attack"), and tells when it's up or gone.
    if (window.AttackScreen) AttackScreen.onChange = () => window.Messages?.layout?.();
    return { banner, wide: () => up || !!window.AttackScreen?.active(), screen: () => !!window.AttackScreen?.active(), text: TEXT, button: cardButton, shield: cardShield, shieldLeft: shieldLeftMs, clock, setBtn, tick, dangerUp: () => cur === 'danger' || !!window.AttackScreen?.active(), dangerEnd: () => dangerEnd };
  }
  if (ROLE !== 'dashboard') return { wide: () => false, text: TEXT, button: cardButton, shield: cardShield, shieldLeft: shieldLeftMs, clock, setBtn, tick, dangerUp: () => false, dangerEnd: () => 0 };

  // ======================= the dashboard =======================
  const h = window.webkit.messageHandlers;
  const api = (method, path, body) => h.cloud.postMessage({ type: 'social', method, path, body }).catch(() => ({ error: 'offline' }));
  const say = (m) => typeof window.toast === 'function' && window.toast(m);
  const html = document.documentElement;
  // What you call them: your nickname for them (live, else as the API sent it), else their name.
  const nameOf = (ev) => (ev.from && Social.nick(ev.from.id)) || ev.nick || (ev.from && ev.from.name) || 'a friend';

  // ---------- fired at you ----------
  // The show itself is on the notices page, on the whole screen (attack-screen.js): the dashboard decides (do not disturb,
  // one at a time, the lock-on and a cancel within it) and tells that page when to start, over the radar handler's "attack".
  let queue = []; // waiting for the one playing
  let busyUntil = 0;
  let timer = 0;
  let playing = null; // { id, cancelled, wake }: the one in its lock-on, which its sender can still cancel
  // `local`: the staging preview (preview()), played even on do not disturb; never set for what the API sends.
  function arrive(ev, local = false) {
    if (!ev || !ev.from) return;
    // The API doesn't send it to someone on do not disturb; one already on its way when they switched is let go. A fire back
    // (`revenge`: you fired at them first) comes even then, and shows (social.js says `attack-revenge`).
    if (Social.dnd() && !local && !ev.revenge) return;
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
  // The Windows dashboard's own state, for strike() below: it can be seen when it isn't hidden, minimized or under other
  // windows (`paused`), not under one of the app's own chat windows (`covered`), and (Windows can't tell a dashboard beside
  // another app from one under it) not behind another app (`behind`).
  const BEHIND_HIDES = window.__platform === 'win32';
  const hiddenBehind = () => BEHIND_HIDES && html.classList.contains('behind');
  // The dashboard window itself can be seen.
  function dashboardSeen() {
    return !html.classList.contains('paused') && !html.classList.contains('covered') && !hiddenBehind() &&
      document.visibilityState === 'visible';
  }
  function play(ev) {
    fly(ev).catch(() => {
      // Something failed half way: nothing left up, and the next one comes.
      playing = null;
      busyUntil = Date.now();
      clearTimeout(timer);
      timer = setTimeout(next, 300);
    });
  }
  async function fly(ev) {
    busyUntil = Date.now() + 20_000; // the next one waits; set right below, once this one's length is known
    const name = nameOf(ev);
    const lock = (playing = { id: ev.from.id, cancelled: false, wake: () => {} });
    const woken = new Promise((ok) => (lock.wake = ok));
    // The warning first (the notices panel has the screen for it: the strip and the cockpit frame, or the old reticle), then
    // the ship. Its sender stays unnamed until the blast. Held a moment past the lock for a cancel sent at its last instant.
    banner('', 'lock');
    await Promise.race([sleep(LOCK_MS + HOLD_MS), woken]);
    playing = null;
    if (lock.cancelled) {
      banner('', 'lost');
      busyUntil = Date.now() + LOST_MS;
      clearTimeout(timer);
      timer = setTimeout(next, LOST_MS + 300);
      return;
    }
    // The ship, and DANGER with its alarm at the blast: the notices page runs it all, on the screen the app is on (up to
    // LOAD_MS later than sent: the next one waits for that too, never cutting its end).
    const showMs = SHOW_MS + (SCREEN ? LOAD_MS : 0);
    busyUntil = Date.now() + showMs;
    try {
      if (SCREEN) h.radar.postMessage({ type: 'attack', name, kind: 'show', delay: 0, sound: true, taunt: true });
      else h.radar.postMessage({ type: 'attack', name, kind: 'danger', delay: 5000, sound: true, taunt: true });
    } catch {}
    clearTimeout(timer);
    timer = setTimeout(next, showMs + 300);
  }
  function banner(name, kind = 'danger', taunt = false, sound = true) {
    try {
      h.radar.postMessage({ type: 'attack', name, kind, delay: 0, sound, taunt });
    } catch {}
  }


  // ---------- cracked glass (for the one who fired) ----------
  // The cracked glass: 7 to 10 rays from the impact (ix, iy) in a w x hh box, each a few jagged segments, some with a
  // branch, and a ring of shattered glass round it. An SVG for a `.atk-hit` box (strike()).
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


  // ---------- the hit feel (for the one who fired) ----------
  // From the moment the API answers a fire (t0), a fixed local timeline (ms from t0; the target's show is fixed too, attack-screen.js):
  // launch sound + `In flight` countdown on the button, a thin amber line along their row filling to the blast, two hit
  // ticks on their picture, then the blast: row flashes 80 ms, cracks (the same kind of glass as the screen's, cracks()), burns 2.5 s (fire.js),
  // shakes (only that row: no window shake, no focus), confirm sound; then the toast and, with the row out of sight, the
  // notices panel's HIT plate. The crack stays to `crack`. Late by more than `stale` (computer slept): skipped.
  // Reduced motion: no flash, flame, shake or line; the ticks, text and a fading crack remain. Cancel: stopHit(id).
  // marks/boom = the lock (1600) + the screen show's three hits (scene T: 5980 / 6150 / 6320).
  const HIT = { launch: 1200, marks: [7580, 7750], boom: 7920, toast: 8300, crack: 15400, flash: 80, burn: 2500, shake: 280, stale: 1000 };
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
  // (`me`, `takes`, `on`: above, shared with the notices and chat pages)
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
  // (`status()` is above, shared with the notices and chat pages)
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
  // The card in the corner and the chats draw their Fire back from this (messages.js attackBtn; Swift relays): each friend's 🚀
  // as locking on, in flight (with the blast's time) or idle, sent only when it changes.
  const sent = new Map();
  function relay() {
    const ids = new Set([...sent.keys(), ...flights.keys()]);
    if (locking) ids.add(locking.id);
    for (const id of ids) {
      const state = locking && locking.id === id ? 'locking' : inFlight(id) ? 'flight' : 'idle';
      const until = state === 'flight' ? flights.get(id).t0 + HIT.boom : 0;
      const key = `${state}|${until}`;
      if ((sent.get(id) || 'idle|0') === key) continue;
      if (state === 'idle') sent.delete(id);
      else sent.set(id, key);
      try {
        h.radar.postMessage({ type: 'attackBtn', id, state, until });
      } catch {}
    }
  }
  function paintAll() {
    relay();
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
    // The right to fire back is used up by a fire (the API also says so).
    if (r.fired) f.attack.revengeUntil = null;
    if (r.why === 'mine_busy' && me() && NO_FIRE[r.status]) me().status = r.status;
    if (r.why === 'off') f.attack.off = true;
    if (r.why === 'outdated') f.attack.outdated = true;
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
  // Fire back from the card or a chat (messages.js, Swift relays): the same press and cancel as the 🚀 on a friend's row, kept
  // apart. A fire relayed while that friend's lock already runs (a double click that beat the `attackBtn` echo) does nothing:
  // only Cancel cancels, so a double click can't fire and cancel at once.
  const fireFor = (id) => (locking && locking.id === id ? undefined : press(id));
  const cancelFor = (id) => locking && locking.id === id && cancel(locking);
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

  // ---------- staging: "👁 PREVIEW ATTACK" (social-test.js) ----------
  // The whole show of a friend's attack on yourself, played here with no API and no friend: the same path as a real one
  // (lock-on, ship, blast, DANGER naming "Preview Pilot"), even on do not disturb. Only in the staging build (its version
  // ends in "-staging", as the strip's own test); a released app does nothing.
  async function preview() {
    const s = await h.cloud.postMessage({ type: 'state' }).catch(() => null);
    if (!/-staging$/.test((s && s.version) || '')) return;
    arrive({ from: { id: 'preview-pilot', name: 'Preview Pilot' }, nick: null }, true);
  }

  // ---------- staging: "🚀 ATTACK ME" (social-test.js) ----------
  async function test() {
    // One on yourself from a friend (the API's DEV_TOOLS route); it plays on the screen wherever the dashboard is.
    say('🚀 test attack on its way · watch your screen');
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
    say(`attack limits reset · ${r.attacksCleared ?? 0} attacks, ${r.cooldownsCleared ?? 0} cooldowns, shields and revenge cleared`);
  }

  // ---------- live ----------
  Social.on((ev, S) => {
    // The friends list came (social.js): the API's clock with it.
    if (ev.type === 'snapshot') sync(S);
    if (ev.type === 'attack') arrive(ev);
    // Your ORB, the price or the limits changed: every fire button says it at once.
    if (ev.type === 'orb' || ev.type === 'orb_settings' || ev.type === 'orb_state') paintAll();
    if (ev.type === 'attack_cancel') cancelled(ev);
    if (ev.type === 'hello') loadPref();
    if (ev.type === 'settings' && ev.set && 'social.attacks' in ev.set) setTakes(ev.set['social.attacks'] !== false);
    // A friend's state or presence changed: their buttons follow at once.
    if (ev.type === 'presence' || ev.type === 'status' || ev.type === 'attack_state' || ev.type === 'friend' || ev.type === 'caps') {
      paintAll();
      paintShield();
    }
  });

  return { on, button, blocked, status, shieldChip, test, reset, preview, press: fireFor, cancelFor, text: TEXT, wide: () => false };
})();
