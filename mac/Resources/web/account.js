'use strict';

// Accounts, optional (the API: src/account.ts; the plan: atalay-terminal-hesaplar-plani.md). Settings → ACCOUNT signs in
// with GitHub (in the browser) or a 6-digit code sent by e-mail. A computer whose sign-in another computer already uses
// joins that account once its user picks which name to keep: XP and hours add up, friends and messages come together,
// the other name is freed. From then on the settings follow the account from computer to computer, the way VS Code's
// Settings Sync does it: on the first sync a setting changed on one side only goes to the other, one never changed
// here takes the account's, and one that differs is asked once. The Mac and Windows apps alike.
window.Account = (() => {
  const h = window.webkit && window.webkit.messageHandlers;
  if (!h || !h.cloud) return null;
  const cloud = (msg) => h.cloud.postMessage(msg).catch(() => null);
  const api = (method, path, body) => h.cloud.postMessage({ type: 'social', method, path, body }).catch(() => ({ error: 'offline' }));
  const themeCall = (msg) => (h.theme ? h.theme.postMessage(msg).catch(() => null) : Promise.resolve(null));
  const saversCall = (msg) => (h.savers ? h.savers.postMessage(msg).catch(() => null) : Promise.resolve(null));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const tagText = (t) => `#${String(t ?? 0).padStart(4, '0')}`;
  const say = (m) => (typeof window.toast === 'function' ? window.toast(m) : console.warn(m));
  const stored = (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  };
  const store = (k, v) => {
    try {
      v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v);
    } catch {}
  };
  const ERRORS = {
    bad_email: "that doesn't look like an e-mail address",
    too_many_codes: 'too many codes for now · try again in an hour',
    email_failed: "the e-mail didn't go out · try again",
    email_unavailable: 'e-mail sign-in is off on this server',
    github_unavailable: 'GitHub sign-in is off on this server',
    // A GitHub sign-in that came back without signing in (the API's githubFailed).
    github_denied: "GitHub didn't sign you in · try again",
    github_failed: "GitHub didn't finish the sign-in · try again",
    github_expired: 'that took too long · try again',
    code_expired: 'that code expired · send a new one',
    wrong_code: "that code isn't right",
    too_many_attempts: 'too many tries · send a new code',
    other_github: 'this account already uses another GitHub account',
    other_email: 'this account already uses another address',
    merge_expired: 'that took too long · sign in again',
    offline: "can't reach the server",
  };
  const errText = (e) => ERRORS[e] || String(e || 'something went wrong');

  let A = null; // GET v1/account
  let host = null; // Settings' ACCOUNT section while the menu is open
  const form = { mode: '', email: '', msg: '', bad: false, busy: false };
  let waiting = 0;

  const refreshCloud = () => cloud({ type: 'refresh' }).then((s) => s && window.Cloud?.render(s));

  async function load() {
    const r = await api('GET', 'v1/account');
    if (!r || r.error) return A;
    const was = A;
    A = r;
    render();
    paintIcon();
    // profile.js's Settings row and the profile's edit panel follow the account (its picture, its links, whether the server takes them).
    window.dispatchEvent(new CustomEvent('account'));
    if (A.pending && (!was || !was.pending || was.pending.id !== A.pending.id)) mergeDialog();
    if (A.signedIn) Sync.start(A);
    else Sync.stop();
    termsAsk();
    return A;
  }

  // Where the message keys' block was (that encryption was retired on 2026-11-15): one honest line about where messages
  // are kept. They're encrypted on the way and at rest on the server (api/src/msgcrypt.ts), which can read them, so the
  // history shows on every computer.
  const msgsLine = () =>
    '<p class="acct-why acct-msgs">Messages are encrypted on the way and on our servers, so your history shows on all your computers.</p>';

  // ---------- Settings → ACCOUNT ----------
  const ago = (at) => {
    const s = Math.max(0, (Date.now() - new Date(at)) / 1000);
    return s < 120 ? 'now' : s < 3600 ? `${Math.floor(s / 60)} min ago` : s < 86400 ? `${Math.floor(s / 3600)} h ago` : `${Math.floor(s / 86400)} d ago`;
  };
  const isWin = (os) => /windows/i.test(os || '');
  const GH = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>';

  function render() {
    paintDanger();
    if (!host || !host.isConnected) return;
    if (!A) return setHTML(host, '<p class="acct-why">loading…</p>');
    const status = form.msg ? `<p class="hk-status acct-status ${form.bad ? 'bad' : 'ok'}">${esc(form.msg)}</p>` : '';
    const mail =
        form.mode === 'email'
          ? '<div class="acct-form"><label class="hk-field"><span class="hk-prompt">@</span><input class="acct-email" type="email" maxlength="254" spellcheck="false" autocomplete="email" placeholder="you@example.com"></label>' +
            `<button type="button" class="mn-btn go" data-acct="send"${form.busy ? ' disabled' : ''}>send code</button></div>`
          : form.mode === 'code'
            ? `<div class="acct-form"><label class="hk-field"><span class="hk-prompt">#</span><input class="acct-code" inputmode="numeric" maxlength="6" spellcheck="false" autocomplete="one-time-code" placeholder="6-digit code sent to ${esc(form.email)}"></label>` +
              `<button type="button" class="mn-btn go" data-acct="verify"${form.busy ? ' disabled' : ''}>sign in</button></div>`
            : '';
    if (!A.signedIn) {
      setHTML(
        host,
        '<p class="acct-why">One name, XP, friends and settings on all your computers, Mac and Windows. Optional: everything works without it.</p>' +
          '<div class="acct-btns">' +
          (A.methods.github ? `<button type="button" class="acct-btn" data-acct="github">${GH}Sign in with GitHub</button>` : '') +
          (A.methods.email ? '<button type="button" class="acct-btn" data-acct="email">✉ Sign in with e-mail</button>' : '') +
          '</div>' +
          mail +
          status +
          msgsLine(),
      );
      const input = host.querySelector('.acct-email, .acct-code');
      if (input && document.activeElement !== input) {
        if (form.mode === 'email') input.value = form.email;
        input.focus();
      }
      return;
    }
    const who = [A.github ? `${GH}<b>${esc(A.github)}</b>` : '', A.email ? `✉ <b>${esc(A.email)}</b>` : ''].filter(Boolean).join('<i>·</i>');
    // This computer first, then the others, the most recently seen first.
    const devices = [...A.devices.filter((d) => d.current), ...A.devices.filter((d) => !d.current)]
      .map(
        (d) =>
          `<div class="acct-dev${d.current ? ' me' : ''}"><span class="acct-os">${isWin(d.os) ? '⊞' : ''}</span>` +
          `<span class="acct-dev-main"><b>${d.current ? 'this computer' : isWin(d.os) ? 'Windows PC' : 'Mac'}</b><small>${esc(d.os || 'unknown system')}${d.app ? ` · app ${esc(d.app)}` : ''}</small></span>` +
          `<small class="acct-seen">${d.current ? 'in use' : ago(d.lastSeen)}</small>` +
          (d.current ? '' : `<button type="button" class="mn-btn mn-del" data-acct="remove" data-id="${esc(d.id)}" title="Take this computer off your account (lost or sold): it starts over as someone new">remove</button>`) +
          '</div>',
      )
      .join('');
    const on = Sync.enabled();
    // GitHub says an address of theirs, verified, is another account's: join it once a code to that address proves it
    // (never on the address alone).
    const hint = A.emailHint && !form.mode
      ? `<div class="acct-hint"><span><b>${esc(A.emailHint)}</b> already has an account of yours. Send a code to it to join the two?</span>` +
        '<button type="button" class="mn-btn go" data-acct="hintsend">send code</button><button type="button" class="mn-btn" data-acct="hintno">not mine</button></div>'
      : '';
    // The other way in, added to this account.
    const add = (!A.email && !A.emailHint ? '<button type="button" class="mn-btn" data-acct="email">✉ add e-mail</button>' : '') +
      (!A.github && A.methods.github ? `<button type="button" class="mn-btn acct-addgh" data-acct="github">${GH}add GitHub</button>` : '');
    setHTML(
      host,
      `<div class="acct-who"><span class="acct-ok">✓ signed in</span>${who}</div>` +
        hint +
        (add || mail ? `<div class="acct-add">${add}</div>${mail}` : '') +
        `<div class="acct-devs">${devices}</div>` +
        '<div class="hk-row"><span>sync settings across your computers<small>theme, interface and terminal fonts and text sizes, sound, token savers, AI colours, updates · as VS Code\'s Settings Sync</small></span>' +
        `<button type="button" class="hk-sw acct-sync${on ? ' on' : ''}" role="switch" aria-checked="${on}" title="Sync settings across your computers"><i></i></button></div>` +
        status +
        msgsLine() +
        '<div class="acct-end"><button type="button" class="mn-btn" data-acct="signout">sign out on this computer</button></div>',
    );
  }

  // GitHub's picture can change on github.com. Its server says how long a copy is good for (cache-control: max-age=300,
  // with an ETag), so it's asked for again at most every 5 minutes: on ⌘R, when the dashboard comes back into sight
  // and when the menu opens, never while hidden. The same address each time: the web view keeps the copy meanwhile and,
  // once it's older, checks it with GitHub (an unchanged picture costs a 304), and GitHub's cache stays whole.
  let picAt = 0;
  function refreshPic(force) {
    if (!A || !A.avatar || document.hidden || (!force && Date.now() - picAt < 300_000)) return;
    picAt = Date.now();
    const url = A.avatar;
    const fresh = new Image();
    fresh.onload = () => document.querySelectorAll('img.acct-avatar, #top img.id-pic').forEach((i) => {
      if (i.getAttribute('src') !== url) return;
      i.src = '';
      i.src = url;
    });
    fresh.src = url;
  }
  document.addEventListener('visibilitychange', () => refreshPic(false));
  window.addEventListener('focus', () => refreshPic(false));

  // The corner's card (cloud.js renderId) is where your picture and status show now: it follows the account (who's signed
  // in, the picture) and your status.
  function paintIcon() {
    if (A) window.Cloud?.paintMe?.();
  }

  function say2(msg, bad = false) {
    form.msg = msg;
    form.bad = bad;
    render();
  }

  async function github() {
    say2('opening GitHub in your browser…');
    const r = await api('POST', 'v1/auth/github', {});
    if (!r || r.error) return say2(errText(r?.error), true);
    await cloud({ type: 'openSignIn', url: r.url });
    say2('finish signing in in your browser · this page follows');
    clearInterval(waiting);
    const until = Date.now() + 10 * 60_000;
    // Done once this computer is signed in, or once GitHub joined the account it's already signed in to (add GitHub).
    const was = A && A.signedIn;
    const had = A && A.github;
    waiting = setInterval(async () => {
      if (Date.now() > until) {
        clearInterval(waiting);
        return say2('');
      }
      await load();
      // GitHub came back without signing in: why, and no more waiting.
      if (A && A.githubFailed) {
        clearInterval(waiting);
        return say2(errText(A.githubFailed), true);
      }
      if ((A && (A.signedIn !== was || A.github !== had)) || (A && A.pending)) {
        clearInterval(waiting);
        signedIn();
      }
    }, 2000);
  }

  function signedIn() {
    if (!A) return;
    // The top bar's card too (an e-mail code's sign-in brings no live event that would load it again).
    paintIcon();
    form.mode = '';
    if (A.pending) return say2('');
    say2('');
    say(`signed in${A.github ? ` as ${A.github}` : A.email ? ` as ${A.email}` : ''}`);
    refreshCloud();
  }

  async function sendCode() {
    const input = host && host.querySelector('.acct-email');
    form.email = (input ? input.value : form.email).trim();
    if (!form.email) return;
    form.busy = true;
    say2('sending the code…');
    const r = await api('POST', 'v1/auth/email', { email: form.email });
    form.busy = false;
    if (!r || r.error) return say2(errText(r?.error), true);
    form.mode = 'code';
    say2(`a 6-digit code is on its way to ${form.email}`);
  }

  async function verify() {
    const input = host && host.querySelector('.acct-code');
    const code = (input ? input.value : '').replace(/\D/g, '');
    if (code.length !== 6) return;
    form.busy = true;
    say2('checking…');
    const r = await api('POST', 'v1/auth/email/verify', { email: form.email, code });
    form.busy = false;
    if (!r || r.error) return say2(errText(r?.error), true);
    A = r.account;
    render();
    // No live event comes for an e-mail sign in, so tell the profile's edit panel and the others here, as load() does.
    window.dispatchEvent(new CustomEvent('account'));
    if (r.result === 'merge') {
      form.mode = '';
      say2('');
      return mergeDialog();
    }
    signedIn();
    Sync.start(A);
  }

  async function remove(id) {
    const d = A && A.devices.find((x) => x.id === id);
    if (!d) return;
    const r = await api('DELETE', `v1/account/devices/${id}`);
    if (!r || r.error) return say(errText(r?.error));
    A = r.account;
    render();
    say(`${isWin(d.os) ? 'Windows PC' : 'Mac'} taken off your account`);
  }

  function onClick(e) {
    const b = e.target.closest('[data-acct]');
    if (b) {
      const act = b.dataset.acct;
      if (act === 'github') return github();
      if (act === 'email') {
        form.mode = form.mode === 'email' ? '' : 'email';
        return say2('');
      }
      if (act === 'send') return sendCode();
      if (act === 'verify') return verify();
      if (act === 'remove') return remove(b.dataset.id);
      if (act === 'hintsend') {
        form.email = A.emailHint;
        form.mode = 'email';
        return sendCode();
      }
      if (act === 'hintno') {
        return api('DELETE', 'v1/account/hint').then((r) => {
          if (r && r.account) A = r.account;
          render();
        });
      }
      if (act === 'signout') return signOut();
    }
    if (e.target.closest('.acct-sync')) {
      Sync.enable(!Sync.enabled());
      render();
    }
  }

  function onKey(e) {
    if (e.key !== 'Enter') return;
    if (e.target.closest('.acct-email')) sendCode();
    if (e.target.closest('.acct-code')) verify();
  }

  // cloud.js's Settings page gives the section to fill while the menu is open.
  function mount(el) {
    host = el;
    if (!host) return;
    host.addEventListener('click', onClick);
    host.addEventListener('keydown', onKey);
    render();
    load();
  }

  // ---------- Settings → DANGER ZONE ----------
  // Deleting has its own section at the very end of Settings, apart from what's used every day (GitHub's Danger Zone,
  // Discord's Account Removal, Apple: a destructive action never sits where it's clicked by habit): "delete account…"
  // once signed in, "delete my data…" as a guest. deleteData() asks before anything goes.
  let dangerHost = null;
  function paintDanger() {
    if (!dangerHost || !dangerHost.isConnected) return;
    if (!A) return setHTML(dangerHost, '');
    const all = A.signedIn;
    setHTML(
      dangerHost,
      '<div class="hk-h danger-h">DANGER ZONE</div><div class="danger-zone"><div class="hk-row">' +
        `<span>${all ? 'delete account' : 'delete my data'}<small>${all ? 'your name, XP, friends, messages and synced settings, on all your computers' : 'your name, XP, friends and messages, here and on the server'} · chats and terminals stay on this computer</small></span>` +
        `<button type="button" class="mn-btn acct-del" data-danger="delete">${all ? 'delete account…' : 'delete my data…'}</button></div></div>` +
        '<p class="st-note"><a class="st-ln" href="https://orbiterm.dev/privacy/" target="_blank" rel="noopener noreferrer">Privacy Notice</a> \u00b7 ' +
        '<a class="st-ln" href="https://orbiterm.dev/terms/" target="_blank" rel="noopener noreferrer">Terms of Use</a></p>',
    );
  }
  function mountDanger(el) {
    dangerHost = el;
    if (!el) return;
    el.onclick = (e) => e.target.closest('[data-danger=delete]') && deleteData();
    paintDanger();
  }

  // ---------- the account menu, under the identity card ----------
  const icon = (cp) => `<i class="vs-ci">${String.fromCodePoint(cp)}</i>`;
  let menuEl = null;
  // `back` (Esc): the focus goes back to the card that opened the menu, when it was in the menu (or lost with it).
  function closeMenu(back) {
    const me = document.querySelector('#top .id-me');
    const refocus = back && menuEl && (menuEl.contains(document.activeElement) || document.activeElement === document.body);
    menuEl?.remove();
    menuEl = null;
    me?.setAttribute('aria-expanded', 'false');
    if (refocus) me?.focus();
    document.removeEventListener('mousedown', outside, true);
    document.removeEventListener('keydown', escape, true);
  }
  const outside = (e) => {
    if (menuEl && !menuEl.contains(e.target) && !e.target.closest('#top .id-me')) closeMenu();
  };
  // ↑ ↓ move between the rows (the status's small menu's while it's open), as in a Mac's menus. Esc closes the status's
  // small menu first, then this one.
  const escape = (e) => {
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && menuEl) {
      const sub = menuEl.querySelector('.mn-pick');
      const rows = [...(sub || menuEl).querySelectorAll('button')].filter((b) => sub || !b.closest('.mn-pick'));
      if (!rows.length) return;
      e.preventDefault();
      e.stopPropagation();
      const i = rows.indexOf(document.activeElement), down = e.key === 'ArrowDown';
      return rows[i < 0 ? (down ? 0 : rows.length - 1) : (i + (down ? 1 : -1) + rows.length) % rows.length].focus();
    }
    if (e.key !== 'Escape') return;
    const pick = menuEl && menuEl.querySelector('.mn-pick');
    if (!pick) {
      // Only the menu takes this Esc: the page behind it (cloud.js's view handler) must not also step back.
      e.preventDefault();
      e.stopPropagation();
      return closeMenu(true);
    }
    e.stopPropagation();
    statusPick(false);
    menuEl.querySelector('[data-m=status]')?.focus();
  };
  // The status row's small menu (cloud.js statusMenu: online, away, do not disturb, invisible), beside the row, as a
  // submenu: it opens on the row's hover or click, and closes on another row's hover; a status picked closes it all.
  function statusPick(open) {
    const row = menuEl && menuEl.querySelector('.acct-st');
    const b = row && row.querySelector('[data-m=status]');
    if (!b || !window.Cloud?.statusMenu) return;
    const shown = !!row.querySelector('.mn-pick');
    if (open === shown) return;
    window.Cloud.statusMenu(row, () => closeMenu());
    b.setAttribute('aria-expanded', String(open));
  }

  // Who you are, your status and your account, Slack's and Discord's way: at the top your picture and name#tag (a click
  // opens your profile; ⧉ copies the name#tag for a friend), your status under it, then your profile, Settings and the
  // account's own items. `keys`: opened from the keyboard, so its first row takes the focus (Esc gives it back).
  async function menu(anchor, keys) {
    if (menuEl) return closeMenu();
    if (!A) await load();
    refreshPic(false);
    if (!A) return say(errText('offline'));
    const ab = anchor || document.querySelector('#top .id-me');
    const line = A.signedIn
      ? `<span class="acct-ok-t">✓ signed in</span> · ${esc(A.github ? `GitHub · ${A.github}` : A.email)}${A.devices.length > 1 ? ` · ${A.devices.length} computers` : ''}`
      : 'not signed in · this computer only';
    // A picture, square as on Steam: the GitHub one once signed in with it, the name's first letter otherwise.
    const pic = A.signedIn && A.avatar
      ? `<img class="acct-avatar" alt="" src="${esc(A.avatar)}">`
      : `<b class="acct-me-letter" aria-hidden="true">${esc((A.name || '?').trim().charAt(0).toUpperCase())}</b>`;
    const me = window.Social?.state()?.me;
    const st = (me && me.status) || 'offline';
    const status = window.Social
      ? `<div class="acct-st"><button type="button" data-m="status" aria-haspopup="menu" aria-expanded="false" title="Your status: what friends see">${window.Social.dot(st)}<span>${esc(window.Social.PRESENCE[st]?.label || st)}</span><em aria-hidden="true">▸</em></button></div><hr>`
      : '<hr>';
    const items =
      `<button type="button" data-m="profile">${icon(0xea67)}Profile</button>` +
      `<button type="button" data-m="settings">${icon(0xeb99)}Settings…</button>` +
      (A.signedIn
        ? `<button type="button" data-m="sync">${icon(0xea77)}Settings sync<em>${Sync.enabled() ? 'on' : 'off'}</em></button>` +
          `<button type="button" data-m="signout">${icon(0xea6e)}Sign out on this computer</button>`
        : (A.methods.github || A.methods.email ? '<hr>' : '') +
          (A.methods.github ? `<button type="button" data-m="github">${GH}Sign in with GitHub</button>` : '') +
          (A.methods.email ? `<button type="button" data-m="email">${icon(0xeb1c)}Sign in with e-mail…</button>` : ''));
    menuEl = document.createElement('div');
    menuEl.className = 'acct-menu';
    menuEl.innerHTML =
      '<div class="acct-me">' +
      `<button type="button" class="acct-me-open" data-m="profile" title="Your profile"><span class="acct-me-pic">${pic}</span>` +
      `<span class="acct-me-txt"><b>${esc(A.name)}<i>${tagText(A.tag)}</i></b><small>${line}</small></span></button>` +
      '<button type="button" class="acct-copy" data-m="copy" title="Copy your name#tag, so friends can add you" aria-label="Copy your name#tag">⧉</button>' +
      '</div>' +
      status +
      items;
    document.body.appendChild(menuEl);
    // Under the card, its left edge on the card's (Steam's and Discord's account menus open the same way).
    ab?.setAttribute('aria-expanded', 'true');
    const r = ab ? ab.getBoundingClientRect() : { left: 12, bottom: 48 };
    menuEl.style.left = `${Math.round(Math.max(8, Math.min(innerWidth - menuEl.offsetWidth - 8, r.left)))}px`;
    menuEl.style.top = `${Math.round(r.bottom + 6)}px`;
    if (keys) menuEl.querySelector('button')?.focus();
    menuEl.onmouseover = (e) => {
      const b = e.target.closest('button');
      if (b && !b.closest('.mn-pick')) statusPick(b.dataset.m === 'status');
    };
    menuEl.onclick = (e) => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      const m = b.dataset.m;
      // Hovering opened it already; a click keeps it open (as a Mac's submenu), from the keys it takes them in.
      if (m === 'status') {
        statusPick(true);
        return e.detail === 0 && menuEl.querySelector('.mn-pick button')?.focus();
      }
      closeMenu();
      if (m === 'copy') return window.Cloud?.copyHandle();
      if (m === 'github') return github();
      if (m === 'profile') return window.Cloud?.openProfile();
      if (m === 'email' || m === 'settings') {
        if (m === 'email') form.mode = 'email';
        return window.Cloud?.openSettings();
      }
      if (m === 'sync') return Sync.enable(!Sync.enabled());
      if (m === 'signout') return signOut();
    };
    setTimeout(() => {
      document.addEventListener('mousedown', outside, true);
      document.addEventListener('keydown', escape, true);
    });
  }

  // A question over everything, with the way out first.
  function confirmBox(cls, html, yes) {
    return new Promise((resolve) => {
      document.querySelector('.acct-confirm')?.remove();
      const el = document.createElement('div');
      el.className = `mn-confirm acct-merge acct-confirm`;
      el.innerHTML = `<div class="mn-ask acct-ask ${cls}">${html}<div class="mn-ask-btns"><button type="button" class="mn-btn" data-ans="no">cancel</button><button type="button" class="mn-btn ${cls === 'danger' ? 'mn-del' : 'go'}" data-ans="yes">${yes}</button></div></div>`;
      const done = (v) => {
        el.remove();
        document.removeEventListener('keydown', key, true);
        resolve(v);
      };
      const key = (e) => e.key === 'Escape' && done(false);
      el.onclick = (e) => {
        if (e.target === el) return done(false);
        const b = e.target.closest('[data-ans]');
        if (b) done(b.dataset.ans === 'yes');
      };
      document.addEventListener('keydown', key, true);
      document.body.appendChild(el);
      el.querySelector('[data-ans=no]').focus();
    });
  }

  async function signOut() {
    if (!A || !A.signedIn) return;
    const ok = await confirmBox(
      '',
      '<b>Sign out on this computer?</b>' +
        `<p>Your account stays as it is${A.devices.length > 1 ? ', on your other computers too' : ''}: name, XP, friends, messages and settings. ` +
        `This computer goes on as a guest, ${esc(A.name)} with a new tag; sign in again any time to bring it back.</p>`,
      'sign out',
    );
    if (!ok) return;
    const r = await cloud({ type: 'signOut' });
    if (!r || r.error) return say(errText(r?.error || 'offline'));
    if (r.state) window.Cloud?.render(r.state);
    Sync.stop();
    await load();
    say(`signed out · this computer is ${A ? A.name + tagText(A.tag) : 'a guest'} now`);
  }

  async function deleteData() {
    if (!A) return;
    const all = A.signedIn;
    // The API (leaving.ts) hides the account at once and signs out every computer, keeps it `days` days for its owner to
    // sign in again and get it back, then erases it. "Why are you leaving?" goes with it: optional, one answer, never in
    // the way. Its reasons are the admin panel's: the box opens at once with this copy of them and takes the server's when
    // they come (unless one was picked already), as it takes the server's number of days.
    const DEFAULT_REASONS = [
      { id: 'not_using', label: "I don't use Orbiterm anymore" },
      { id: 'broken', label: "Something didn't work right" },
      { id: 'missing', label: "It's missing something I need" },
      { id: 'privacy', label: "I don't want my data on a server" },
      { id: 'other_account', label: 'I have another account' },
    ];
    const fetching = api('GET', 'v1/account/leave-reasons');
    let days = 30;
    const D = () => `<span class="leave-days">${days}</span>`;
    const n = A.devices.length;
    const back = [A.github && `GitHub (${esc(A.github)})`, A.email && `your e-mail (${esc(A.email)})`].filter(Boolean).join(' or ');
    const facts = all
      ? `<li><em>Right away</em>You're signed out on ${n > 2 ? `all ${n} of your computers` : n === 2 ? 'both your computers' : 'this computer'}, and nobody sees you anymore: not on the leaderboards, not in friends' lists.</li>` +
        `<li><em>Changed your mind?</em>Sign in again with ${back} within ${D()} days and it all comes back.</li>` +
        `<li class="leave-end"><em>After ${D()} days</em>It's erased for good: your name, XP and hours, friends and messages, votes, badges and synced settings. Server backups keep a copy until they're replaced.</li>`
      : '<li><em>Right away</em>This computer starts over, and nobody sees you anymore: not on the leaderboards, not in friends\' lists.</li>' +
        `<li class="leave-end"><em>After ${D()} days</em>It's erased from the server for good: your name, XP and hours, friends and messages, votes and badges. A guest has no sign-in, so there's no way to get it back. Server backups keep a copy until they're replaced.</li>`;
    const options = (reasons) => [...reasons, { id: 'other', label: 'Something else' }]
      .map((x) => `<label class="leave-opt"><input type="radio" name="leave" value="${esc(x.id)}"><span>${esc(x.label)}</span></label>`)
      .join('');
    const asking = confirmBox(
      'danger',
      `<b>${all ? 'Delete your account?' : 'Delete your data?'}</b>` +
        `<ul class="leave-facts">${facts}</ul>` +
        `<fieldset class="leave-why"><legend>Why are you leaving? <small>optional</small></legend><div class="leave-opts">${options(DEFAULT_REASONS)}</div>` +
        '<div class="leave-more" hidden><label for="leave-text">In your own words</label><textarea id="leave-text" rows="3" maxlength="1000"></textarea></div>' +
        `<p class="leave-note">Your answer stays after ${all ? 'the account is' : 'your data is'} erased, without your name.</p></fieldset>` +
        '<p class="leave-keep">Chats and terminals on this computer stay; they were never on the server.</p>',
      all ? 'delete account' : 'delete data',
    );
    const box = document.querySelector('.acct-confirm');
    box.querySelector('.acct-ask').classList.add('acct-leave');
    const more = box.querySelector('.leave-more');
    const words = box.querySelector('#leave-text');
    fetching.then((got) => {
      if (!box.isConnected || !got || got.error) return;
      if (Number.isInteger(got.days) && got.days > 0) {
        days = got.days;
        box.querySelectorAll('.leave-days').forEach((x) => (x.textContent = days));
      }
      if (Array.isArray(got.reasons) && got.reasons.length && !box.querySelector('input[name=leave]:checked')) {
        setHTML(box.querySelector('.leave-opts'), options(got.reasons));
      }
    });
    // A second click on the picked reason takes it back (the question is optional); "Something else" opens the field.
    let was = null;
    box.querySelector('.leave-why').addEventListener('pointerdown', (e) => {
      const o = e.target.closest('.leave-opt');
      was = o && o.querySelector('input').checked ? o.querySelector('input') : null;
    });
    box.querySelector('.leave-why').addEventListener('click', (e) => {
      const input = e.target.closest('.leave-opt input');
      if (!input) return;
      if (input === was) input.checked = false;
      was = null;
      const other = input.checked && input.value === 'other';
      more.hidden = !other;
      if (other) words.focus();
    });
    // Selecting text in the field and letting go over the dark around the box doesn't close it (and lose the words).
    let downInside = false;
    box.addEventListener('mousedown', (e) => (downInside = !!e.target.closest('.acct-ask')));
    const closeOnBackdrop = box.onclick;
    box.onclick = (e) => (e.target === box && downInside ? undefined : closeOnBackdrop(e));
    const ok = await asking;
    if (!ok) return;
    const picked = box.querySelector('input[name=leave]:checked')?.value || '';
    const text = picked === 'other' ? words.value.trim().slice(0, 1000) : '';
    const r = await cloud({ type: 'deleteAccount', reason: picked, text });
    if (r?.error === 'last_admin') return say("you're the admin panel's only admin · add someone to its team first");
    if (!r || r.error) return say(errText(r?.error || 'offline'));
    Sync.stop();
    A = null;
    say(all ? `your account is deleted · sign in within ${days} days to get it back` : 'your data is deleted');
    window.Cloud?.close?.();
    if (r.state) window.Cloud?.render(r.state);
  }

  // ---------- merging: which name stays ----------
  // Esc does nothing while the merge or the settings question is up: its "not now" drops the merge (only signing in
  // again brings it back), so a stray key mustn't decide, and the page behind (a profile, Settings) mustn't close under
  // it either (Atalay, 2026-11-15). On the window in the capture phase, ahead of every other Esc handler.
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !document.querySelector('.acct-merge:not(.acct-confirm), .acct-conflict')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);
  function mergeDialog() {
    const p = A && A.pending;
    if (!p || !p.mine || !p.theirs) return;
    document.querySelector('.acct-merge')?.remove();
    const side = (who, keep, label) =>
      `<button type="button" class="acct-side" data-keep="${keep}"><small>${label}</small><b>${esc(who.name)}<i>${tagText(who.tag)}</i></b>` +
      `<span>Level ${who.level} · ${esc(who.rank)}</span><em>${who.hours} h · ${who.friends} ${who.friends === 1 ? 'friend' : 'friends'} · ${who.devices} ${who.devices === 1 ? 'computer' : 'computers'}</em></button>`;
    const el = document.createElement('div');
    el.className = 'mn-confirm acct-merge';
    const via = p.kind === 'github' ? 'This GitHub account' : 'This e-mail address';
    // The other one is an account its owner deleted (the API's leaving.ts), kept for them: this brings it back, under its
    // own name unless they pick this computer's.
    const back = !!p.theirs.deleted;
    const until = back && p.theirs.keptUntil ? new Date(p.theirs.keptUntil).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) : '';
    el.innerHTML = back
      ? '<div class="mn-ask acct-ask"><b>Bring back your deleted account</b>' +
        `<p>${via} belongs to the account you deleted${until ? `, kept until ${esc(until)}` : ''}. Bring it back under its own name, or pick this computer's.</p>` +
        `<div class="acct-sides">${side(p.theirs, 'theirs', 'your deleted account')}${side(p.mine, 'mine', 'this computer')}</div>` +
        '<ul class="acct-fine"><li>its friends, messages and badges come back</li><li>hours and XP add up (time on both at once counts once)</li><li>the other name is freed</li></ul>' +
        '<div class="mn-ask-btns"><button type="button" class="mn-btn" data-ans="cancel">not now</button><button type="button" class="mn-btn go" data-ans="merge">bring it back</button></div></div>'
      : '<div class="mn-ask acct-ask"><b>Join your other computer\'s account</b>' +
        `<p>${via} is already used by another of your computers. Pick the name to keep: the two become one account.</p>` +
        `<div class="acct-sides">${side(p.mine, 'mine', 'this computer')}${side(p.theirs, 'theirs', 'your other computer')}</div>` +
        '<ul class="acct-fine"><li>hours and XP add up (time on both at once counts once)</li><li>friends and messages come together</li><li>the other name is freed</li></ul>' +
        '<div class="mn-ask-btns"><button type="button" class="mn-btn" data-ans="cancel">not now</button><button type="button" class="mn-btn go" data-ans="merge" disabled>merge</button></div></div>';
    let keep = back ? 'theirs' : '';
    if (back) el.querySelector('.acct-side[data-keep=theirs]').classList.add('on');
    el.onclick = async (e) => {
      const s = e.target.closest('.acct-side');
      if (s) {
        keep = s.dataset.keep;
        el.querySelectorAll('.acct-side').forEach((x) => x.classList.toggle('on', x === s));
        el.querySelector('[data-ans=merge]').disabled = false;
        return;
      }
      const b = e.target.closest('[data-ans]');
      if (!b) return;
      if (b.dataset.ans === 'cancel') {
        el.remove();
        A = (await api('DELETE', `v1/account/merge/${encodeURIComponent(p.id)}`))?.account || A;
        return render();
      }
      b.disabled = true;
      b.textContent = 'merging…';
      const r = await api('POST', 'v1/account/merge', { id: p.id, keep });
      el.remove();
      if (!r || r.error) return say(errText(r?.error));
      A = r.account;
      render();
      paintIcon();
      say(back ? `your account is back: ${A.name}${tagText(A.tag)}` : `one account now: ${A.name}${tagText(A.tag)}`);
      refreshCloud();
      window.Social?.load();
      Sync.restart(A);
    };
    document.body.appendChild(el);
  }

  // ---------- the Terms of Use ----------
  // The API keeps which version of the Terms an account agreed to (account.ts `terms: { current, accepted }`). New
  // accounts agree by getting through the welcome (its line under the buttons; agreeTerms below). An account signed in
  // from before the Terms asks once per launch, the first time it's loaded: "Agree to the Terms", or "not now" (Esc, or a
  // click outside), which closes it and nothing else: every feature stays on, and it comes back at the next launch.
  // Guests are asked too (they're on the leaderboard, in friends' lists and messages); an account with no name yet isn't
  // (nothing shows of it), and a computer with no account at all is never held up by any of it.
  let termsShown = false;
  let termsAgreed = false;
  // POST the version the server says is current (never one this file guesses). Without the account loaded yet, load it first.
  async function postTerms() {
    if (!A || !A.terms) await load();
    const v = A && A.terms && A.terms.current;
    if (!v) return { error: 'offline' };
    const r = await api('POST', 'v1/account/terms', { version: v });
    if (r && !r.error) A = r;
    return r;
  }
  // The welcome's way: no question. A failure leaves nothing marked, so the window below asks at the next launch.
  async function agreeTerms() {
    if (termsAgreed) return;
    termsAgreed = true;
    const r = await postTerms();
    if (!r || r.error) termsAgreed = false;
    return r;
  }
  function termsAsk() {
    if (termsShown || termsAgreed || !A || !A.name || !A.terms || A.terms.accepted >= A.terms.current) return;
    // Not over the welcome (it agrees when it ends), nor over another question (the merge, the settings question, a confirm).
    if (document.querySelector('.pk.wel, .acct-confirm, .acct-merge, .acct-conflict, .acct-terms-box')) return;
    termsShown = true;
    const el = document.createElement('div');
    el.className = 'mn-confirm acct-terms-box';
    const L = (path, label) => `<a href="https://orbiterm.dev/${path}/" target="_blank" rel="noopener noreferrer">${label}</a>`;
    el.innerHTML =
      '<div class="mn-ask acct-ask acct-terms" role="dialog" aria-modal="true" aria-labelledby="acct-terms-h"><b id="acct-terms-h">Privacy Notice and Terms</b>' +
      '<p>Orbiterm now has a Privacy Notice and Terms of Use. They put in writing what the app sends to its server, why, and how to delete it. ' +
      'The Terms add one rule: Orbiterm is free and comes as is, and you stay in charge of what your terminals and AI tools do.</p>' +
      `<p class="acct-terms-links">${L('privacy', 'Privacy Notice')} \u00b7 ${L('terms', 'Terms of Use')}</p>` +
      '<div class="mn-ask-btns"><button type="button" class="acct-terms-del" data-ans="delete">Delete my account instead</button>' +
      '<button type="button" class="mn-btn" data-ans="later">Not now</button><button type="button" class="mn-btn go" data-ans="agree">Agree to the Terms</button></div></div>';
    const done = () => {
      el.remove();
      document.removeEventListener('keydown', key, true);
    };
    // Esc is "not now", and only that: the page behind (Settings, a profile) stays open.
    const key = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      done();
    };
    el.onclick = async (e) => {
      if (e.target === el) return done();
      const b = e.target.closest('[data-ans]');
      if (!b) return;
      if (b.dataset.ans === 'later') return done();
      if (b.dataset.ans === 'delete') {
        done();
        return deleteData();
      }
      b.disabled = true;
      const r = await postTerms();
      if (!r || r.error) {
        b.disabled = false;
        return say(errText(r?.error));
      }
      termsAgreed = true;
      done();
    };
    document.addEventListener('keydown', key, true);
    document.body.appendChild(el);
    // "Not now" has the focus: the window opens by itself a moment after launch, and a stray Enter mustn't agree.
    el.querySelector('[data-ans=later]').focus();
  }

  // ---------- settings sync ----------
  // Each synced setting: how to read it here (undefined: not set here, the account's comes in), how to set one from
  // another computer, how to show it in the question, and its default (a value never changed here counts as not set).
  let themeNames = {};
  const ITEMS = [
    { key: 'theme', label: 'theme', def: 'atalay', show: (v) => themeNames[v] || v, set: (v) => themeCall({ type: 'choose', id: v }) },
    { key: 'uiFont', label: 'interface font', def: 'mono', set: (v) => themeCall({ type: 'setUI', font: v }) },
    { key: 'uiScale', label: 'text size', def: 1, show: (v) => `${Math.round(v * 100)}%`, set: (v) => themeCall({ type: 'setUI', scale: v }) },
    { key: 'aiColors', label: "AI tools in the theme's colours", def: true, set: (v) => themeCall({ type: 'setUI', aiColors: v }) },
    { key: 'rtk', label: 'rtk', def: true, set: (v) => saversCall({ type: 'set', which: 'rtk', on: v }) },
    { key: 'caveman', label: 'caveman', def: true, set: (v) => saversCall({ type: 'set', which: 'caveman', on: v }) },
    { key: 'updateRightAway', label: 'install updates right away', def: false, set: (v) => cloud({ type: 'updateRightAway', on: v }).then((s) => s && window.Cloud?.render(s)) },
    { key: 'terminalFontSize', label: 'terminal text size', def: undefined, show: (v) => `${v} pt`, set: (v) => cloud({ type: 'terminalFont', size: v }) },
    // Only a picked one, as the size: a computer without that font refuses it (TerminalFont.swift) and keeps its own,
    // without sending it back.
    { key: 'terminalFont', label: 'terminal font', def: undefined, set: (v) => cloud({ type: 'terminalFont', family: v }) },
    { key: 'sound', label: 'sound', def: false, set: (v) => window.__sound?.set(v) },
  ];
  const show = (it, v) => (typeof v === 'boolean' ? (v ? 'on' : 'off') : it.show ? it.show(v) : String(v));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  async function collect() {
    const [ui, list, sav, font, st] = await Promise.all([
      themeCall({ type: 'ui' }),
      themeCall({ type: 'list' }),
      saversCall({ type: 'state' }),
      cloud({ type: 'terminalFont' }),
      cloud({ type: 'state' }),
    ]);
    if (list && list.themes) themeNames = Object.fromEntries(list.themes.map((t) => [t.id, t.name]));
    return {
      theme: list ? list.chosen : undefined,
      uiFont: ui ? ui.font : undefined,
      uiScale: ui ? ui.scale : undefined,
      aiColors: ui ? ui.aiColors !== false : undefined,
      rtk: sav && sav.rtk && sav.rtk.available ? !!sav.rtk.on : undefined,
      caveman: sav && sav.caveman && sav.caveman.available ? !!sav.caveman.on : undefined,
      updateRightAway: st ? !!st.updateRightAway : undefined,
      terminalFontSize: font && font.chosen ? font.size : undefined,
      terminalFont: font && font.family ? font.family : undefined,
      sound: window.__sound ? window.__sound.on() : undefined,
    };
  }

  const Sync = {
    acct: null,
    base: null, // what was last in step with the account, per key
    timer: 0,
    quietUntil: 0,
    enabled: () => stored('sync.on') !== '0',
    enable(on) {
      store('sync.on', on ? null : '0');
      if (on && A && A.signedIn) this.start(A);
      else this.stop();
      say(on ? 'settings sync on' : 'settings sync off · settings stay as they are on this computer');
    },
    me: () => (A && A.devices.find((d) => d.current)?.id) || null,
    async start(a) {
      if (!this.enabled() || !a || !a.signedIn) return this.stop();
      if (this.acct === a.id && this.timer) return;
      this.stop();
      this.acct = a.id;
      try {
        this.base = JSON.parse(stored(`sync.base.${a.id}`) || 'null');
      } catch {
        this.base = null;
      }
      if (!this.base) await this.first();
      this.timer = setInterval(() => this.tick(), 5000);
    },
    restart(a) {
      this.stop();
      this.start(a);
    },
    stop() {
      clearInterval(this.timer);
      this.timer = 0;
      this.acct = null;
    },
    save() {
      store(`sync.base.${this.acct}`, JSON.stringify(this.base));
    },
    // The first time on this computer, as VS Code: a setting on one side only goes to the other; one never changed here
    // takes the account's; one that differs is asked once.
    async first() {
      const remote = await api('GET', 'v1/settings');
      if (!remote || remote.error) return;
      const r = remote.settings || {};
      const local = await collect();
      const up = {}, conflicts = [];
      const merged = { ...r };
      for (const it of ITEMS) {
        const lv = local[it.key], rv = r[it.key];
        const unset = lv === undefined || same(lv, it.def);
        if (rv === undefined) {
          if (!unset) up[it.key] = merged[it.key] = lv;
        } else if (lv !== undefined && same(lv, rv)) {
          // in step already
        } else if (unset) {
          await it.set(rv);
        } else {
          conflicts.push({ it, lv, rv });
        }
      }
      if (conflicts.length) {
        const pick = await ask(conflicts);
        for (const c of conflicts) {
          if (pick === 'account') await c.it.set(c.rv);
          else up[c.it.key] = merged[c.it.key] = c.lv;
        }
      }
      if (Object.keys(up).length) await api('PUT', 'v1/settings', { set: up });
      this.quietUntil = Date.now() + 4000;
      this.base = merged;
      this.save();
    },
    // Every few seconds: what changed here since goes to the account.
    async tick() {
      if (!this.acct || !this.base || Date.now() < this.quietUntil) return;
      const cur = await collect();
      const set = {};
      for (const it of ITEMS) if (cur[it.key] !== undefined && !same(cur[it.key], this.base[it.key])) set[it.key] = cur[it.key];
      if (!Object.keys(set).length) return;
      const r = await api('PUT', 'v1/settings', { set });
      if (!r || r.error) return;
      Object.assign(this.base, set);
      this.save();
    },
    // Another computer changed some: they apply here.
    async apply(set, from) {
      if (!this.acct || !this.base || from === this.me()) return;
      this.quietUntil = Date.now() + 4000;
      for (const it of ITEMS) {
        if (!(it.key in set)) continue;
        await it.set(set[it.key]);
        this.base[it.key] = set[it.key];
      }
      this.save();
    },
  };

  // The settings that differ, once: the account's or this computer's.
  function ask(conflicts) {
    return new Promise((resolve) => {
      document.querySelector('.acct-conflict')?.remove();
      const el = document.createElement('div');
      el.className = 'mn-confirm acct-conflict';
      el.innerHTML =
        '<div class="mn-ask acct-ask"><b>Your settings differ</b><p>This computer and your account have different settings. Which should both use?</p>' +
        '<div class="acct-diff"><span></span><small>your account</small><small>this computer</small>' +
        conflicts.map((c) => `<span>${esc(c.it.label)}</span><b>${esc(show(c.it, c.rv))}</b><b>${esc(show(c.it, c.lv))}</b>`).join('') +
        '</div><div class="mn-ask-btns"><button type="button" class="mn-btn" data-ans="device">use this computer\'s</button><button type="button" class="mn-btn go" data-ans="account">use the account\'s</button></div></div>';
      el.onclick = (e) => {
        const b = e.target.closest('[data-ans]');
        if (!b) return;
        el.remove();
        resolve(b.dataset.ans);
      };
      document.body.appendChild(el);
    });
  }

  // Live: a sign-in finished in the browser, a merge, a computer removed; settings from another computer.
  window.Social?.on((ev) => {
    if (ev.type === 'account' || ev.type === 'hello') load();
    if (ev.type === 'status' || ev.type === 'snapshot' || ev.type === 'hello') paintIcon();
    if (ev.type === 'settings' && ev.set) Sync.apply(ev.set, ev.from);
  });
  setTimeout(load, 2500);

  // errText and GH: the welcome's sign-in says the same (cloud.js openFirst).
  return { mount, mountDanger, deleteData: () => deleteData(), agreeTerms: () => agreeTerms(), load, menu, state: () => A, errText, GH };
})();
