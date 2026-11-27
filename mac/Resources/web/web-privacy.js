// Your public profile on orbiterm.dev, from inside the app (araştırma/public-profil/spec.md §10-§11, api-contract.md §7).
// One switch for the whole page (`public.profile`) and one per part: hours = the old `show_activity` (Cloud's switch),
// AI tools = `social.tokensDetail`, badges = `public.badges`. The API says what is on (`GET v1/settings` → `web`).
// Drawn here: the bar on your own profile, a "who sees this" pill on each part, the one-time notice, and the group in
// Settings > Privacy (its rows are made by settings.js; this file wires them). Same on Mac and Windows: only the shared
// Social bridge, and a plain link (the app's navigation policy opens it in the browser) to open the page.
window.WebPriv = (() => {
  'use strict';
  const SITE = 'https://orbiterm.dev';
  const ICON = {
    globe: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.3"/><path d="M1.7 8h12.6M8 1.7c1.7 1.8 2.5 3.9 2.5 6.3S9.7 12.5 8 14.3C6.3 12.5 5.5 10.4 5.5 8S6.3 3.5 8 1.7z"/></svg>',
    eye: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/></svg>',
    eyeOff: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.2 3.8A6.8 6.8 0 0 1 8 3.5C12 3.5 14.5 8 14.5 8a12 12 0 0 1-1.8 2.4M4 5.3C2.4 6.5 1.5 8 1.5 8S4 12.5 8 12.5c1 0 1.9-.3 2.7-.7"/><path d="M6.6 6.6a2 2 0 0 0 2.8 2.8M2 2l12 12"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    friends: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="5.8" cy="5.3" r="2.4"/><path d="M1.5 13.3c.5-2.5 2.2-3.9 4.3-3.9s3.8 1.4 4.3 3.9"/><circle cx="11.4" cy="5.8" r="1.9"/><path d="M11.3 9.4c1.7.1 2.9 1.4 3.2 3.4"/></svg>',
    copy: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 3.5v-.3A1.2 1.2 0 0 0 9.3 2H3.2A1.2 1.2 0 0 0 2 3.2v6.1a1.2 1.2 0 0 0 1.2 1.2h.3"/></svg>',
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const say = (m) => (typeof window.toast === 'function' ? window.toast(m) : null);

  let W = null; // { profile, badges, noticeSeen, path } as the API reports it (profile is the effective state)
  let loading = false;
  let settingsPaint = null;
  const subs = new Set();

  // ---------- the state ----------
  const ready = () => !!(W && W.path);
  const pub = () => !W || W.profile !== false;
  const badgesOn = () => !W || W.badges !== false;
  const whenOn = () => !W || W.when !== false;
  const hoursOn = () => {
    const x = window.Cloud?.state?.()?.xp;
    return x ? x.show !== false : true;
  };
  const toolsOn = () => window.Social?.prefs?.().tokensDetail !== false;
  const path = () => (W && W.path) || '';
  const url = () => SITE + path();
  const shortUrl = () => url().replace(/^https?:\/\//, '');

  // Spoken to screen readers (the toast is for eyes): polite, so it never interrupts.
  function announce(text) {
    let el = document.querySelector('.wp-live');
    if (!el) {
      el = document.createElement('div');
      el.className = 'wp-live';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = '';
    setTimeout(() => (el.textContent = text), 30);
  }

  // A failed answer (offline, an API without `web`) is asked again after half a minute, not on every redraw of the
  // profile; a forced load while one is on its way runs once it's back.
  let failedAt = 0;
  let again = false;
  function load(force) {
    if (!window.Social?.call) return;
    if (loading) { if (force) again = true; return; }
    if (!force && (W || Date.now() - failedAt < 30000)) return;
    loading = true;
    const done = (r) => {
      loading = false;
      if (r && r.web) {
        W = r.web;
        failedAt = 0;
        paintAll();
      } else failedAt = Date.now();
      if (again) { again = false; load(true); }
    };
    window.Social.call('GET', 'v1/settings').then(done, () => done(null));
  }

  // Save `set` ({profile, badges, noticeSeen}); shown at once, put back if the server refuses.
  async function save(set, okText) {
    if (!W) return false;
    const prev = W;
    W = { ...W, ...set };
    paintAll();
    const body = Object.fromEntries(Object.entries(set).map(([k, v]) => [`public.${k}`, v]));
    const r = await window.Social.call('PUT', 'v1/settings', { set: body });
    if (!r || r.error) {
      // Only this change goes back: one made since, still on its way or saved, keeps its own value.
      const back = { ...W };
      for (const k of Object.keys(set)) if (W[k] === set[k]) back[k] = prev[k];
      W = back;
      paintAll();
      const t = r && r.error === 'offline' ? "Couldn't change it · can't reach the server" : "Couldn't change it · try again";
      say(t);
      announce(t);
      return false;
    }
    if (r.web) W = r.web;
    paintAll();
    if (okText) {
      say(okText);
      announce(okText);
    }
    return true;
  }

  const setProfile = (on) =>
    save({ profile: on }, on ? 'Your profile is shown to everyone' : 'Your profile is hidden. Only friends see it');
  const setBadges = (on) =>
    save({ badges: on }, on ? 'All your badges are shown' : 'Only the badge beside your name is shown');

  const setWhen = (on) =>
    save({ when: on }, on ? 'When you work is shown' : 'When you work is hidden');

  async function setHours(on) {
    if (hoursOn() === on || !window.Cloud?.toggleActivity) return;
    await window.Cloud.toggleActivity(); // Cloud saves it, toasts, and tells us with a 'webpriv' event
    if (hoursOn() === on) announce(on ? 'Your hours are shown' : 'Your hours are hidden');
  }
  async function setTools(on) {
    if (toolsOn() === on || !window.Social?.setPref) return;
    const r = await window.Social.setPref('tokensDetail', on);
    if (r && r.error) {
      say("Couldn't change it · try again");
      return;
    }
    const t = on ? 'Your AI tools and models are shown' : 'Your AI tools and models are hidden';
    say(t);
    announce(t);
    paintAll();
  }

  // ---------- copy ----------
  function copyText(text) {
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      return ok;
    };
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(() => true, () => fallback());
    return Promise.resolve(fallback());
  }
  async function copyLink() {
    if (!ready()) return;
    const ok = await copyText(url());
    const t = ok ? 'Link copied' : "Couldn't copy the link";
    say(t);
    announce(t);
  }

  // ---------- your profile page ----------
  const PARTS = {
    hours: { box: '.ps-hours', head: '.ps-hours .ps-head', short: false, what: 'your hours' },
    ai: { box: '.pp-ai', head: '.pp-ai .ps-ch', short: true, what: 'your AI tools' },
    tok: { box: '.pv-tok', head: '.pv-tok > h2', short: false, what: 'your AI tools' },
    badges: { box: '.me-inv', head: '.me-inv .sc-bar', short: false, what: 'your badges' },
  };
  const partOn = (kind) => (kind === 'hours' ? hoursOn() : kind === 'badges' ? badgesOn() : toolsOn() && hoursOn());

  function whoHTML(kind, part) {
    const on = partOn(kind);
    const friends = !pub();
    const words = !on ? 'Only you see this' : friends ? 'Friends see this' : 'Everyone sees this';
    const shortW = !on ? 'Only you' : friends ? 'Friends' : 'Everyone';
    const verb = on ? 'Hide' : 'Show';
    return {
      cls: `pv-who${on ? '' : ' off'}`,
      label: `${part.what[0].toUpperCase()}${part.what.slice(1)}: ${words.toLowerCase()}. ${verb} ${part.what}`,
      html: `${!on ? ICON.lock : friends ? ICON.friends : ICON.eye}<span>${part.short ? shortW : words}</span><em>${verb}</em>`,
      on,
    };
  }

  function barHTML() {
    if (!pub()) {
      return `<span class="vis-st">${ICON.lock}<span><b>Hidden.</b> Only friends can see your profile</span></span>` +
        `<button type="button" class="bd-primary" data-vis="show">${ICON.eye}Show my profile</button>`;
    }
    return `<span class="vis-st">${ICON.globe}<span><b>Everyone</b> can see it at</span>` +
      `<a class="vis-url" href="${esc(url())}" target="_blank" rel="noopener noreferrer" title="View on the web">${esc(shortUrl())}</a>` +
      `<button type="button" class="vis-copy" data-vis="copy" title="Copy the link">${ICON.copy}Copy link</button></span>` +
      `<button type="button" class="bd-glassbtn" data-vis="hide">${ICON.eyeOff}Hide my profile</button>`;
  }

  function noticeHTML() {
    const p = pub();
    return `<span class="g">${ICON.globe}</span>` +
      (p
        ? `<div><h3>Your profile is now on orbiterm.dev</h3><p>Everyone can open it at <b>${esc(shortUrl())}</b> and find you by name: your hours, when you work, your AI tools and your badges. Keep it public, or make it private. You can change it any time, and hide any part with its <b>Hide</b> button.</p></div>` +
          `<div class="a"><button type="button" class="bd-glassbtn" data-wp-notice="private">${ICON.eyeOff}Make it private</button><button type="button" class="bd-primary" data-wp-notice="keep">Keep it public</button></div>`
        : `<div><h3>Your profile is private</h3><p>Only you and your friends can see it. Everyone else sees your name and the word private. You can show it to everyone any time.</p></div>` +
          `<div class="a"><button type="button" class="bd-glassbtn" data-wp-notice="public">${ICON.globe}Show to everyone</button><button type="button" class="bd-primary" data-wp-notice="keep">Keep it private</button></div>`);
  }

  // Idempotent: draws only what changed, keeps the nodes (and the focus) it can.
  function decorate() {
    const view = document.getElementById('profile-view');
    if (!view || !view.classList.contains('on') || window.Profile?.currentId?.() !== 'me') return;
    load();
    const top = view.querySelector('.pv-top');
    const grid = view.querySelector('.me-grid');
    const show = ready();

    // 1. the bar
    let bar = top && top.querySelector('.pv-vis');
    if (top && show) {
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'pv-vis';
        top.appendChild(bar);
      }
      bar.classList.toggle('off', !pub());
      const h = barHTML();
      if (bar.__h !== h) {
        const had = bar.contains(document.activeElement);
        bar.__h = h;
        bar.innerHTML = h;
        if (had) bar.querySelector('[data-vis]:not(.vis-copy)')?.focus();
      }
    } else if (bar) bar.remove();

    // 2. a pill on each part, and the quiet look of a part only you see
    for (const [kind, part] of Object.entries(PARTS)) {
      const box = view.querySelector(part.box);
      const head = view.querySelector(part.head);
      if (box) box.classList.toggle('pv-off', show && !partOn(kind));
      if (!head) continue;
      let b = head.querySelector(':scope > .pv-who');
      if (!show) { b?.remove(); continue; }
      const w = whoHTML(kind, part);
      if (!b) {
        b = document.createElement('button');
        b.type = 'button';
        b.dataset.who = kind;
        head.appendChild(b);
      }
      b.className = w.cls;
      b.setAttribute('aria-pressed', String(w.on));
      b.setAttribute('aria-label', w.label);
      b.title = w.on ? `Hide ${part.what} from others` : `Show ${part.what} to others`;
      if (b.__h !== w.html) { b.__h = w.html; b.innerHTML = w.html; }
    }

    // 3. the one-time notice
    let note = grid && grid.querySelector(':scope > .pv-new');
    if (grid && show && W.noticeSeen === false) {
      if (!note) {
        note = document.createElement('section');
        note.className = 'pv-new';
        note.setAttribute('role', 'region');
        note.setAttribute('aria-label', 'Your profile on the web');
        grid.prepend(note);
      }
      const h = noticeHTML();
      if (note.__h !== h) { note.__h = h; note.innerHTML = h; }
    } else if (note) note.remove();
  }

  // ---------- Settings > Privacy ----------
  function paintSettings(page) {
    if (!page || !page.isConnected) return;
    const ok = ready();
    const set = (cls, on) => {
      const s = page.querySelector(`.hk-sw.${cls}`);
      if (!s) return;
      s.classList.toggle('on', on);
      s.setAttribute('aria-checked', String(on));
      s.disabled = !ok;
    };
    set('pub', pub());
    set('bdg', badgesOn());
    set('whn', whenOn());
    const hint = page.querySelector('.wp-pub-hint');
    if (hint) {
      hint.classList.toggle('st-off-note', !pub());
      hint.textContent = !ok ? 'sign in to get your own page on orbiterm.dev'
        : pub() ? 'anyone can open your page on orbiterm.dev and find you by name · off: only friends see it'
        : 'off: only friends see your profile · everyone else sees your name and “private”';
    }
    const u = page.querySelector('.wp-url');
    if (u) u.textContent = ok ? shortUrl() : 'no page yet';
    const copy = page.querySelector('.wp-copy');
    if (copy) copy.hidden = !ok;
    const open = page.querySelector('.wp-open');
    if (open) {
      open.hidden = !ok;
      if (ok) open.href = url();
    }
    const note = page.querySelector('.wp-note');
    if (note) note.textContent = 'Your picture, name, level and place on the leaderboard always show with your profile. ' +
      (pub() ? 'The same switches sit on your profile page, on each part.' : 'Friends still see the parts switched on above.');
  }

  function mountSettings(page) {
    if (!page) return;
    load();
    const on = (cls, fn) => {
      const s = page.querySelector(`.hk-sw.${cls}`);
      if (s) s.onclick = fn;
    };
    on('pub', () => setProfile(!pub()));
    on('bdg', () => setBadges(!badgesOn()));
    on('whn', () => setWhen(!whenOn()));
    const copy = page.querySelector('.wp-copy');
    if (copy) copy.onclick = copyLink;
    settingsPaint = () => paintSettings(page);
    settingsPaint();
  }

  function paintAll() {
    for (const f of subs) f();
    if (settingsPaint) settingsPaint();
    decorate();
  }

  // ---------- wiring ----------
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!t || !t.closest) return;
    const vis = t.closest('#profile-view [data-vis]');
    if (vis) {
      const a = vis.dataset.vis;
      if (a === 'copy') copyLink();
      else setProfile(a === 'show');
      return;
    }
    const who = t.closest('#profile-view .pv-who');
    if (who) {
      const kind = who.dataset.who;
      const on = partOn(kind);
      if (kind === 'hours') setHours(!on);
      else if (kind === 'badges') setBadges(!on);
      else if (!toolsOn()) setTools(true);
      else if (!hoursOn()) setHours(true);
      else setTools(false);
      return;
    }
    const n = t.closest('#profile-view [data-wp-notice]');
    if (n) {
      const a = n.dataset.wpNotice;
      if (a === 'private') save({ profile: false, noticeSeen: true }, 'Your profile is hidden. Only friends see it');
      else if (a === 'public') save({ profile: true, noticeSeen: true }, 'Your profile is shown to everyone');
      else save({ noticeSeen: true });
    }
  });

  window.addEventListener('webpriv', paintAll);
  // Signed in with an e-mail code (no live event comes for it, account.js) or signed out: the page's path comes or goes.
  window.addEventListener('account', () => {
    const signed = window.Account?.state?.()?.signedIn;
    if (signed != null && !!signed !== ready()) load(true);
  });
  let queued = 0;
  const watch = () => {
    const view = document.getElementById('profile-view');
    if (!view) return setTimeout(watch, 500);
    new MutationObserver(() => {
      if (queued) return;
      queued = requestAnimationFrame(() => { queued = 0; decorate(); });
    }).observe(view, { childList: true, subtree: true });
  };
  watch();
  const hook = () => {
    if (!window.Social?.on) return setTimeout(hook, 500);
    window.Social.on((ev) => {
      if (ev.type === 'hello' || ev.type === 'account') load(true);
      if (ev.type === 'settings' && ev.set) {
        const next = { ...(W || {}) };
        let hit = false;
        for (const k of ['profile', 'badges', 'when', 'noticeSeen']) if (`public.${k}` in ev.set) { next[k] = ev.set[`public.${k}`]; hit = true; }
        if (hit && W) W = next;
      }
      if (['prefs', 'settings', 'snapshot'].includes(ev.type)) paintAll();
    });
  };
  hook();

  return { load, state: () => W, url, decorate, mountSettings, copyLink, setProfile, setBadges, paint: paintAll, on: (f) => (subs.add(f), () => subs.delete(f)) };
})();
