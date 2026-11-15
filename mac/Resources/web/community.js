'use strict';

// The fun layer's social side on the dashboard (the API's feed.ts; the research: rapor.md 2b, 3b, 3c):
//  · the community feed, like Rainbow Six's feed: white lines at the top left of the physical screen, over whatever app is
//    in front (the Mac app's own see-through panel, feed.html; where there is none, the dashboard's top left), about rare, good things only (a friend's rare badge, a new #1 this week, the weekly goal reached
//    together, someone on fire). Each slides in, stays 5 seconds and dissolves; up to 4 stack, the newest at the
//    bottom, and what comes meanwhile waits its turn, 2 seconds apart. Clicks go through it, it never takes the focus,
//    no sound, nothing on do not disturb. Settings → Privacy turns it off.
//  · head to head on a friend's card: the weeks you both reached the weekly goal, whoever earned more XP took it.
//  · the weekly goal's moment: once a week, the first time the leaderboard shows it reached, the goal bar fills with
//    flame, a short sound plays and it says how much was yours.
// Each line is a fixed template filled from the API's fields (names come from the accounts): no free text in a line.
window.Community = (() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const stored = (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  };
  const store = (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  };
  const say = (msg) => typeof window.toast === 'function' && window.toast(msg);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  // What you call them: the nickname you gave a friend, else their name.
  const nameOf = (w) => (w && ((w.id && Social.nick(w.id)) || w.name)) || '';

  // ---------- the feed ----------
  const MAX = 4; // lines on screen at once
  const GAP = 2000; // between two lines coming in
  const LIFE = 5000; // how long one stays, counted while the dashboard is in sight
  const CLOSE = 650 + 220; // its dissolve and the gap closing (feed-draw.js), how long the panel takes to forget one
  const WAITING = 20; // lines waiting at most; past that the oldest go
  const CATCH_UP = 10 * 60_000; // the line back after a start or a sleep: what came in the last 10 minutes
  let box = null;
  // The Mac app draws the feed in a panel of its own at the screen's corner (Swift sets the flag); without it (Windows)
  // the page draws it, as before.
  const native = () => !!window.__nativeFeed && !!window.webkit?.messageHandlers?.radar;
  const toPanel = (msg) => window.webkit.messageHandlers.radar.postMessage(msg);
  let nextId = 0;
  const loadedAt = Date.now();
  let queue = [];
  const shown = []; // { el, id, age, going } (el is null when the panel draws it)
  const seen = new Set(); // the ids played (or waiting) in this run
  let lastIn = 0;
  let ticker = 0;
  let lastTick = 0;
  const on = () => Social.prefs().feed;
  // Off, or on do not disturb: nothing shows and nothing waits.
  const quiet = () => !on() || Social.dnd();
  // The dashboard out of sight (app.js): the lines wait, the ones up stop ageing, until it's back.
  const away = () => document.documentElement.classList.contains('paused');

  // Fixed templates.
  function words(l) {
    const w = l.who;
    const name = w ? `<b>${esc(nameOf(w))}</b>` : '';
    switch (l.kind) {
      case 'badge': {
        const b = l.badge || {};
        const bname = (window.BadgeArt && BadgeArt.name(b.id)) || b.name || 'a badge';
        const tier = window.BadgeArt ? BadgeArt.tierName(b.id, b.tier, b.tiers) : '';
        return `${name} unlocked <b>${esc(bname)}${tier ? ` · ${esc(tier)}` : ''}</b> · ${esc(b.rare)}% have it`;
      }
      case 'top':
        return l.mine ? '<b>You</b> took #1 this week' : `${name} took #1 this week`;
      case 'goal':
        return `Weekly goal reached together · <b>${Xp.num(l.hours)} h</b>`;
      case 'fire':
        return l.tier === 2 ? `${name} has the hottest flame · 5 days on fire this week` : `${name} is on fire`;
      case 'fires':
        return `<b>${Xp.num(l.n)}</b> ${l.n === 1 ? 'hacker' : 'hackers'} on fire today`;
    }
    return '';
  }
  // What kind of news it is, said by its mark and its words, never by the colour alone.
  const MARK = { badge: '◆', top: '#1', goal: '✓', fire: '🔥', fires: '🔥' };
  const mark = (l) =>
    l.kind === 'fire' && l.tier === 2 ? '<i class="fire-mark kf-ic">5🔥</i>' : `<i class="kf-ic">${MARK[l.kind] || '·'}</i>`;

  // Only where the page draws the feed itself (no panel): top left of the dashboard's middle, where the views open too: under the top bar, right of the activity bar.
  function place() {
    const top = document.getElementById('top')?.getBoundingClientRect();
    const bar = document.getElementById('activity')?.getBoundingClientRect();
    box.style.top = `${Math.round((top && top.height ? top.bottom : 52) + 12)}px`;
    box.style.left = `${Math.round((bar && bar.width ? bar.right : 64) + 12)}px`;
  }
  function mount() {
    if (box) return;
    box = document.createElement('div');
    box.id = 'killfeed';
    box.setAttribute('role', 'log');
    box.setAttribute('aria-live', 'polite');
    box.setAttribute('aria-label', 'Community feed');
    document.body.appendChild(box);
    window.addEventListener('resize', place);
  }

  function arrive(line) {
    if (!line || !line.id || quiet() || seen.has(line.id)) return;
    seen.add(line.id);
    // Today's newer count of flames takes the waiting one's place.
    if (line.kind === 'fires') queue = queue.filter((l) => l.kind !== 'fires');
    queue.push(line);
    if (queue.length > WAITING) queue.shift();
    run();
  }

  function run() {
    if (!ticker && (queue.length || shown.length)) {
      lastTick = Date.now();
      ticker = setInterval(tick, 200);
    }
    tick();
  }
  function tick() {
    const now = Date.now();
    const dt = now - lastTick;
    lastTick = now;
    if (quiet()) return clear();
    // Away (another app or Space covers the dashboard): the in-page lines freeze with the page, but the native panel
    // sits over the front app, so its lines keep ageing and dissolving; only new lines are held back.
    if (away() && !native()) return;
    for (const l of shown) if (!l.going && (l.age += dt) >= LIFE) dissolve(l);
    if (away()) {
      if (!shown.length) {
        clearInterval(ticker);
        ticker = 0;
      }
      return;
    }
    if (queue.length && now - lastIn >= GAP && shown.filter((l) => !l.going).length < MAX) show(queue.shift());
    if (!queue.length && !shown.length) {
      clearInterval(ticker);
      ticker = 0;
    }
  }

  function show(line) {
    const html = `${mark(line)}<span class="kf-t">${words(line)}</span>`;
    if (native()) {
      // Unique per page load: a reloaded dashboard restarts the count, and the panel drops ids it already has.
      const id = `kf${loadedAt}-${++nextId}`;
      toPanel({ type: 'feedLine', id, kind: line.kind, html });
      shown.push({ el: null, id, age: 0, going: false });
    } else {
      mount();
      if (!shown.length) place();
      shown.push({ el: KillFeed.add(box, line.kind, html), age: 0, going: false });
    }
    lastIn = Date.now();
    // Played: a restart a minute later doesn't play it again (catchUp).
    if (!line.dev) store('kf-at', String(lastIn));
  }
  // Fades out with a little blur, then the lines under it close the gap.
  function dissolve(l) {
    l.going = true;
    const gone = () => {
      const i = shown.indexOf(l);
      if (i >= 0) shown.splice(i, 1);
    };
    if (l.el) return KillFeed.dissolve(l.el, gone);
    toPanel({ type: 'feedOut', id: l.id });
    setTimeout(gone, CLOSE);
  }
  function clear() {
    queue = [];
    for (const l of shown) l.el?.remove();
    if (native()) toPanel({ type: 'feedClear' });
    shown.length = 0;
    clearInterval(ticker);
    ticker = 0;
  }

  // The line (re)opened after a start or a sleep: the last 10 minutes' lines not played yet, oldest first.
  let catching = null;
  function catchUp() {
    if (quiet() || catching) return;
    catching = Social.feed().then((r) => {
      catching = null;
      if (!r || r.error || !r.lines) return;
      const since = Math.max(Date.now() - CATCH_UP, Number(stored('kf-at')) || 0);
      r.lines.filter((l) => new Date(l.at).getTime() > since).reverse().forEach(arrive);
      store('kf-at', String(Date.now()));
    });
  }

  // ---------- head to head on a friend's card or profile ----------
  const rivals = new Map(); // friend id -> { at, r }
  const avHTML = (p, fallbackName) => {
    const label = String(p?.name || fallbackName || '?');
    const rc = window.Xp ? Xp.rank(p?.level || 1).color : 'var(--accent-rgb)';
    return `<span class="bd-av" style="--rc:${rc}">${p?.avatar ? `<img alt="" src="${esc(p.avatar)}">` : esc(label.trim().charAt(0).toUpperCase() || '?')}</span>`;
  };
  /** Accepts rivalry already fetched by profile.js so we don't ask twice. */
  function ingestRivalry(id, r) {
    if (!id) return;
    if (r && !r.error) rivals.set(id, { at: Date.now(), r });
    else if (r === null) rivals.set(id, { at: Date.now(), r: { hidden: true } });
  }
  async function mountRivalry(el, f, me, opts) {
    if (!el || !f) return;
    let r;
    if (window.SocialTest?.h2hDemo()) r = { you: 3, them: 1, week: { you: 1270, them: 850 } };
    else {
      const c = rivals.get(f.id);
      if (c && Date.now() - c.at < 60_000) r = c.r;
      else if (opts?.skipFetch) return;
      else {
        r = await Social.rivalry(f.id);
        if (r && !r.error) rivals.set(f.id, { at: Date.now(), r });
      }
    }
    if (!el.isConnected || el.dataset.id !== f.id) return;
    if (!r || r.error || r.hidden) {
      el.hidden = true;
      el.innerHTML = '';
      return;
    }
    const n = esc(nameOf(f));
    if (el.classList.contains('pv-h2h-host')) {
      const rc = window.Xp ? Xp.rank(f.level || 1).color : 'var(--accent-rgb)';
      const myAv = avHTML(me, 'You');
      const themAv = avHTML(f, n);
      el.innerHTML =
        `<section class="pv-h2h" style="--rc:${rc}">` +
        `<h2>YOU AND ${esc((nameOf(f) || '').toUpperCase())}<span>· weeks won, when both reached the weekly goal · only you two see this</span></h2>` +
        `<div class="pv-side">${myAv}<p><b>You</b>+${Xp.num(r.week?.you || 0)} XP this week</p></div>` +
        `<div class="pv-score" role="img" aria-label="Weeks won: you ${r.you}, ${n} ${r.them}">` +
        `<b class="${r.you > r.them ? 'lead' : ''}">${r.you}</b><span>:</span><b class="${r.them > r.you ? 'lead' : ''}">${r.them}</b>` +
        '<small>weeks won</small></div>' +
        `<div class="pv-side them">${themAv}<p><b>${n}</b>+${Xp.num(r.week?.them || 0)} XP this week</p></div></section>`;
      el.hidden = false;
      return;
    }
    el.hidden = false;
  }

  // ---------- the weekly goal's moment ----------
  // "Reached together · 1,240 h · your share 12 h": the goal everyone filled and your own time this week.
  const shareText = (s) => (s >= 3600 ? `${Xp.num(Math.round(s / 3600))} h` : `${Math.max(1, Math.round(s / 60))} min`);
  function reachedText(c) {
    return `Reached together · ${Xp.num(Math.round(c.goal / 3600))} h${c.mine > 0 ? ` · your share ${shareText(c.mine)}` : ''}`;
  }
  // The staging app's social test plays it before the goal is really reached (social-test.js).
  function goalView(c) {
    return c && c.goal && window.SocialTest?.goalNow() ? { ...c, seconds: Math.max(c.seconds, c.goal) } : c;
  }
  const played = new Set(); // this run's, in case the page can't keep it
  // The ISO week's Monday here, for an API that doesn't say which week it counts.
  const monday = () => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.toLocaleDateString('sv');
  };
  function goalMoment(el, c) {
    if (!el || !c || !c.goal || c.seconds < c.goal) return;
    const force = !!window.SocialTest?.goalNow();
    const week = c.week || monday();
    if (!force) {
      if (played.has(week) || stored('lb-goal-moment') === week) return;
      played.add(week);
      store('lb-goal-moment', week);
    }
    window.SocialTest?.goalDone();
    el.classList.add('moment');
    Sfx.play('accept');
    const bar = el.querySelector(':scope > i');
    let stop = null;
    let canvas = null;
    if (bar && window.Fire && !reduced()) {
      canvas = document.createElement('canvas');
      canvas.className = 'lb-goal-fire';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.left = `${bar.offsetLeft}px`;
      canvas.style.width = `${bar.offsetWidth}px`;
      canvas.style.top = `${bar.offsetTop + bar.offsetHeight - 40}px`;
      el.appendChild(canvas);
      stop = Fire.burn(canvas, { reach: [30, 0, 0], scale: 7, life: 4200 });
    }
    setTimeout(() => {
      if (stop) stop();
      canvas?.remove();
      el.classList.remove('moment');
    }, 4600);
  }


  // ---------- Settings → Privacy: the feed's switch ----------
  let page = null;
  function paintSettings() {
    if (!page || !page.isConnected) return;
    const sw = page.querySelector('.hk-sw.cf-feed');
    if (!sw) return;
    const v = Social.prefs().feed;
    sw.classList.toggle('on', v);
    sw.setAttribute('aria-checked', String(v));
    sw.disabled = !Social.state();
  }
  function mountSettings(el) {
    page = el;
    if (!page) return;
    const sw = page.querySelector('.hk-sw.cf-feed');
    if (sw) sw.onclick = async () => {
      const v = !Social.prefs().feed;
      sw.disabled = true;
      const r = await Social.setPref('feed', v);
      sw.disabled = false;
      if (r.error) return say(r.error === 'offline' ? "can't reach the server" : "couldn't change it");
      paintSettings();
      say(v ? 'announcements are on' : 'announcements are off');
    };
    paintSettings();
  }

  // ---------- live ----------
  Social.on((ev) => {
    if (ev.type === 'feed') arrive(ev.line);
    // The line (re)opened: what came meanwhile, a moment later, so everyone's app doesn't ask in the same second.
    if (ev.type === 'hello') setTimeout(catchUp, 400 + Math.random() * 1600);
    // Turned off (here or on another computer), or do not disturb: the lines go at once.
    if (['prefs', 'settings', 'status'].includes(ev.type) && quiet()) clear();
    if (ev.type === 'prefs' || ev.type === 'settings' || ev.type === 'snapshot') paintSettings();
  });

  return { mountRivalry, ingestRivalry, reachedText, goalView, goalMoment, mountSettings };
})();
