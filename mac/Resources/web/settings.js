'use strict';

// Settings (the window cloud.js openMenu opens: the gear, the app menu and the account menu): a few categories on the left, the picked one on the right,
// as macOS System Settings, Discord, Linear, Slack and VS Code lay theirs out. Each category's settings sit in small
// groups, the most used first; a setting rarely changed waits under "advanced" (NN/g, progressive disclosure: two levels
// at most, the way in named for what's behind it). The window opens on the category used last (Apple HIG, Settings).
//
// Only the page's layout and words are here. Every setting keeps the classes cloud.js, account.js, profile.js and
// fonts.js look for, and they keep reading, setting and drawing them as before: cloud.js builds the page with html(),
// then mount() makes the categories work. The sound (app.js's window.__sound, the top bar's button) and the theme (the
// themes view) show here too, so everything set for the app can be found in Settings.
window.Settings = (() => {
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

  // Line icons, drawn like the top bar's gear (16×16, stroked in the text's colour).
  const svg = (d) => `<svg class="st-ico" viewBox="0 0 16 16" aria-hidden="true">${d}</svg>`;
  // Her on/off switch: native keeps it and sets window.__mascotEnabled (then fires 'mascotchange').
  const mascotOn = () => window.__mascotEnabled === true && (window.MascotUI ? window.MascotUI.ready() : true);
  const MISCHIEF_NAMES = ['Calm', 'Playful', 'Naughty', 'Crazy'];
  const mischiefLevel = () => {
    const n = Number(window.__mascotMischief);
    return Number.isInteger(n) && n >= 0 && n <= 3 ? n : 3;
  };
  const PANES = [
    { id: 'account', name: 'Account', icon: svg('<circle cx="8" cy="5.4" r="2.7"/><path d="M2.6 14c.6-2.8 2.8-4.3 5.4-4.3s4.8 1.5 5.4 4.3"/>') },
    { id: 'appearance', name: 'Appearance', icon: svg('<path d="M8 1.8a6.2 6.2 0 1 0 0 12.4c.9 0 1.3-.6 1.3-1.2 0-.9-.8-1.2-.8-2 0-.7.6-1.2 1.3-1.2h1.6c1.7 0 2.8-1.1 2.8-2.7C14.2 4.1 11.4 1.8 8 1.8z"/><circle cx="4.9" cy="7.4" r=".9"/><circle cx="6.9" cy="4.6" r=".9"/><circle cx="10.2" cy="4.8" r=".9"/>') },
    { id: 'chats', name: 'Chats', icon: svg('<path d="M3 3h10a1.5 1.5 0 0 1 1.5 1.5v5.5A1.5 1.5 0 0 1 13 11.5H8.2L5 14v-2.5H3A1.5 1.5 0 0 1 1.5 10V4.5A1.5 1.5 0 0 1 3 3z"/><path d="M4.6 6.2 6.2 7.4 4.6 8.6M7.6 8.6h3"/>') },
    // Right after Chats: both are about working in the terminals (Arc's word: the wheel opens with the mouse too).
    { id: 'shortcuts', name: 'Shortcuts', icon: svg('<rect x="1.5" y="4" width="13" height="8.5" rx="1.5"/><path d="M4.2 6.7h.01M6.4 6.7h.01M8.6 6.7h.01M10.8 6.7h.01M4.8 9.8h6.4"/>') },
    { id: 'privacy', name: 'Privacy', icon: svg('<rect x="3" y="7" width="10" height="7.2" rx="1.4"/><path d="M5.2 7V5a2.8 2.8 0 0 1 5.6 0v2"/><path d="M8 10v1.6"/>') },
    { id: 'general', name: 'General', icon: svg('<circle cx="8" cy="8" r="2.2"/><circle cx="8" cy="8" r="4.6"/><path d="M8 1.4v2M8 12.6v2M1.4 8h2M12.6 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M3.3 12.7l1.4-1.4M11.3 4.7l1.4-1.4"/>') },
  ];
  // The categories this page has: Shortcuts only where the app keeps the keys (the Mac app's keys handler, html()).
  let panes = PANES;
  const last = () => (panes.some((p) => p.id === stored('settings.pane')) ? stored('settings.pane') : 'account');
  let current = last();
  let page = null;

  // ---------- the pieces: a group, a row, a switch, the advanced fold ----------
  const group = (title, body, cls = '') => `<section class="st-group${cls ? ` ${cls}` : ''}">${title ? `<h3 class="st-h">${title}</h3>` : ''}<div class="st-box">${body}</div></section>`;
  const row = (label, hint, control, cls = '') =>
    `<div class="hk-row st-row${cls ? ` ${cls}` : ''}"><span class="st-l"><b>${label}</b>${hint == null ? '' : `<small${typeof hint === 'object' ? ` class="${hint.cls}"${hint.attr || ''}` : ''}>${typeof hint === 'object' ? hint.text : hint}</small>`}</span>${control}</div>`;
  const sw = (cls, title, on, attr = '') => `<button type="button" class="hk-sw ${cls}" role="switch" aria-checked="${on}" title="${esc(title)}"${attr}><i></i></button>`;
  const more = (what, body) => `<details class="st-more"><summary><span>advanced</span><small>${what}</small></summary><div class="st-box">${body}</div></details>`;
  const pane = (id, title, lead, body) =>
    `<div class="st-pane" id="st-pane-${id}" data-pane="${id}" role="tabpanel" aria-labelledby="st-tab-${id}" tabindex="0"${id === current ? '' : ' hidden'}><h2 class="st-title">${title}</h2>${lead ? `<p class="st-lead">${lead}</p>` : ''}${body}</div>`;

  // The page cloud.js puts in the Settings window. c: { max, tag, ui, savers, archive, trash, keys }, what only cloud.js knows.
  function html(c) {
    panes = PANES.filter((p) => p.id !== 'shortcuts' || c.keys);
    current = last(); // the gear opens the one used last; openSettings picks its own after (show(pane, false))
    const pw = window.__powerSave, dc = window.__discord;
    const nav =
      '<nav class="st-nav" role="tablist" aria-label="Settings" aria-orientation="vertical">' +
      panes.map((p) =>
        `<button type="button" role="tab" id="st-tab-${p.id}" aria-controls="st-pane-${p.id}" data-pane="${p.id}" aria-label="${p.name}" title="${p.name}" aria-selected="${p.id === current}" tabindex="${p.id === current ? 0 : -1}" class="${p.id === current ? 'on' : ''}">${p.icon}<span>${p.name}</span></button>`).join('') +
      '</nav>';

    const account =
      // Your name, picture and links are changed on your profile page, where they show: a row that opens it with "Edit
      // profile" open (profile.js).
      (window.Profile
        ? group('profile', `<div class="prof-host">${row('name, picture and links', 'what friends and the leaderboard see on your card', '<button type="button" class="st-btn prof-edit">edit profile…</button>')}</div>`, 'st-pf')
        : '') +
      (window.Account ? group('account', '<div class="acct-host"></div>', 'st-acct') : '') +
      (window.Account ? '<div class="danger-host"></div>' : '');

    const appearance =
      group('colours', row('theme', 'the colours of the whole app', '<span class="st-val"><b class="st-theme-name">…</b><button type="button" class="st-btn st-theme">change…</button></span>')) +
      // Viktoria has her own switch (any theme; the app keeps it, Mascot.swift). Mischief (mascot.js MISCHIEF table; the app
      // keeps the level) and the credits show only while she is on.
      group('mascot',
        row('Viktoria', 'An anime companion who walks around your screen',
          (window.MascotUI?.slot() ?? '') + sw('st-mascot mas-when-ready' + (mascotOn() ? ' on' : ''), 'Show Viktoria', mascotOn(), window.MascotUI?.ready() === false ? ' hidden' : '')) +
        `<div class="st-mascot-more"${mascotOn() ? '' : ' hidden'}>` +
        row('Mischief', 'How often Viktoria clicks around and wanders',
          `<span class="lb-seg ui-seg st-mischief">${MISCHIEF_NAMES.map((n, i) => `<button type="button" data-level="${i}" class="${i === mischiefLevel() ? 'on' : ''}">${n}</button>`).join('')}</span>`) +
        '</div>' +
        // The downloaded files can go again (a quiet button, only while she is downloaded: cloud.js MascotUI).
        `<div class="mas-rm-wrap" hidden><button type="button" class="mas-remove">Remove download (<span class="mas-mb">34</span> MB)</button></div>`) +
      // Credits the licences ask for (VRoid: that exact phrase; WalkLoop: its readme's credit format), and the model's.
      `<p class="st-note st-mascot-more"${mascotOn() ? '' : ' hidden'}>Model: Mei Sakuraniwa © ProjectCorelinjp<br>Character animation credits to pixiv Inc.'s VRoid Project<br>モーション：WalkLoop_v1_MotionDa／AirisuAsbel（だらてん） https://daraten.booth.pm/<br>Motions: Sachi (sachi2222, CC0), rerofumi (CC0), Maron Yatsuhashi, miracorabo</p>` +
      (c.ui
        ? group('dashboard text',
            row('size', 'the dashboard and messages, for text too small to read', '<span class="lb-seg ui-seg ui-scale"></span>') +
            row('font', 'the dashboard and messages', '<span class="lb-seg ui-seg ui-font"></span>'))
        : '') +
      (c.ui && window.Fonts
        ? group('terminal text',
            row('font', { cls: 'tf-note', text: 'the text in every terminal' }, '<select class="tf-font" title="The terminals\' font" disabled></select>') +
            row('size', { cls: 'tf-keys', text: '' }, '<span class="tf-size"></span>') +
            '<div class="tf-demo" aria-hidden="true"><b>❯</b> claude <i>"make the login page faster"</i><em>0O 1lI {}</em></div>')
        : '') +
      (c.ui
        ? more('AI tool colours',
            row("AI tools use the theme's colours", "Claude Code, Codex and Antigravity text follows the theme · from their next chat", sw('ui-ai', "AI tools in the theme's colours", true)))
        : '');

    const chats =
      (window.__sound
        ? group('sound', row('play a sound when a chat needs you', "a short ping · the top bar's sound button does the same", sw('st-sound', 'Play a sound when a chat needs you', !!window.__sound.on())))
        : '') +
      (c.savers
        ? group('save tokens',
            row('shorter command output <em class="st-tag">rtk</em>', { cls: 'ts-note', attr: ' data-which="rtk"', text: '…' }, sw('ts', 'Turn rtk on or off', false, ' data-which="rtk"'), 'ts-row') +
            row('shorter answers <em class="st-tag">caveman</em>', { cls: 'ts-note', attr: ' data-which="caveman"', text: '…' }, sw('ts', 'Turn caveman on or off', false, ' data-which="caveman"'), 'ts-row'))
        : '') +
      (c.archive || c.trash
        ? group('archived and deleted',
            (c.archive ? row('archived chats', 'out of the chats list until you bring them back', '<button type="button" class="st-btn arc-open">show…</button>') : '') +
            (c.trash ? row('deleted chats', 'kept 30 days, then gone for good · put one back from here', '<button type="button" class="st-btn trash-open">show…</button>') : ''))
        : '');

    // The keys of the app's actions, to change: a search on top for the 40-odd rows (VS Code's and Warp's keyboard
    // settings have one), then the list cloud.js draws (renderKeys) in .mn-keys. Looking them up is Help › Keyboard Shortcuts' list
    // (cheatsheet.js), apart from Settings.
    const shortcuts =
      '<label class="st-find"><svg class="st-ico" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="m10.3 10.3 3.6 3.6"/></svg>' +
      '<input type="search" class="ks-find" placeholder="search shortcuts" aria-label="Search shortcuts" spellcheck="false" autocomplete="off" autocapitalize="off"></label>' +
      '<div class="mn-keys"></div>';

    const privacy =
      group('friends and leaderboard',
        row('show my active time to friends', 'today, this week and in total · your level shows either way', sw('act', 'Show my active time to friends', true)) +
        row('show my name on the leaderboard', 'off: you show as Anonymous, and nobody can add you from there', sw('brd', 'Show my name on the leaderboard', true)) +
        row('show my name on the Tokens board', 'off: Anonymous on the Tokens board only · your total still counts', sw('tkn', 'Show my name on the Tokens board', true)) +
        row('let friends see which AI and model I use', 'opening your row on the Tokens board · off: only your total shows, to everyone', sw('tkd', 'Let friends see which AI and model I use', true))) +
      (dc
        ? group('discord',
            row("show what I'm doing on Discord", { cls: 'dc-note', text: '…' }, sw('dc-on', "Show what I'm doing on Discord", false)) +
            row("show the project's name", "the folder you're working in, like my-app · off: only how many chats are open", sw('dc-proj', "Show the project's name on Discord", false), 'st-sub') +
            row('show my active time today', 'like 4h 12m today', sw('dc-act', 'Show my active time on Discord', true), 'st-sub'))
        : '');

    const general =
      // The fun layer's announcements (community.js): one switch for what you hear of others, where people look to turn
      // notices off (Atalay, 2026-11-15; it used to sit in Privacy as "community feed").
      (window.Community
        ? group('notifications',
            row('announcements', "a friend on fire, a friend's rare badge, a new #1 this week, the weekly goal · short lines at the top left of the screen and in the bell", sw('cf-feed', 'Show announcements', true)))
        : '') +
      group('updates', '<div class="hk-info"></div>') +
      (pw
        ? group('battery', row('power save at low battery', `below ${esc(pw.threshold)}% battery or in ${esc(pw.saver || 'Low Power Mode')}, the map moves less to save battery · the switch on the map turns it off`, sw('pwr-auto', 'Power save on by itself at low battery', true)))
        : '');

    return (
      nav +
      '<div class="st-main">' +
      pane('account', 'Account', '', account) +
      pane('appearance', 'Appearance', '', appearance) +
      pane('chats', 'Chats', '', chats) +
      (c.keys ? pane('shortcuts', 'Shortcuts', 'click a shortcut, then press the new keys · esc cancels, delete takes them off', shortcuts) : '') +
      pane('privacy', 'Privacy', 'what friends, the leaderboard and Discord can see', privacy) +
      pane('general', 'General', '', general) +
      '</div>'
    );
  }

  // ---------- the categories ----------
  // keep: remembered for the next time Settings opens (the gear, the app menu). Opened for a purpose (the account menu's
  // "Settings…" and "Sign in with e-mail…", a badge's sign in, the shortcut list's "Change shortcuts…") it shows its
  // category without forgetting the last one.
  function show(id, keep = true) {
    if (!page || !page.isConnected || !panes.some((p) => p.id === id)) return;
    current = id;
    if (keep) store('settings.pane', id);
    page.querySelectorAll('.st-nav button').forEach((b) => {
      const on = b.dataset.pane === id;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    page.querySelectorAll('.st-pane').forEach((p) => (p.hidden = p.dataset.pane !== id));
    const main = page.querySelector('.st-main');
    if (main) main.scrollTop = 0;
  }

  // Her switch, and the blocks that only make sense while she is on (Mischief, credits).
  function paintMascot() {
    if (!page) return;
    const on = mascotOn();
    const b = page.querySelector('.st-mascot');
    if (b) {
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    }
    page.querySelectorAll('.st-mascot-more').forEach((el) => (el.hidden = !on));
    page.querySelectorAll('.st-mischief button').forEach((x) => x.classList.toggle('on', Number(x.dataset.level) === mischiefLevel()));
    window.MascotUI?.paint();
  }
  window.addEventListener('mascotchange', paintMascot);
  window.addEventListener('mascotasset', paintMascot);

  function paintSound() {
    const b = page && page.querySelector('.st-sound');
    if (!b || !window.__sound) return;
    const on = !!window.__sound.on();
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', String(on));
  }

  async function paintTheme() {
    const name = page && page.querySelector('.st-theme-name');
    const h = window.webkit && window.webkit.messageHandlers;
    if (!name || !h || !h.theme) return name && (name.closest('.st-group').hidden = true);
    const list = await h.theme.postMessage({ type: 'list' }).catch(() => null);
    const t = list && list.themes && list.themes.find((x) => x.id === list.chosen);
    name.textContent = t ? t.name : '—';
  }

  // cloud.js calls it once the page is in the menu, before the other parts fill it.
  function mount(el) {
    page = el;
    if (!page) return;
    const nav = page.querySelector('.st-nav');
    nav.onclick = (e) => {
      const b = e.target.closest('button[data-pane]');
      if (b) show(b.dataset.pane);
    };
    // ↑ ↓ move between the categories, as in a list; Home and End to the first and the last.
    nav.onkeydown = (e) => {
      const i = panes.findIndex((p) => p.id === current);
      const to = { ArrowDown: i + 1, ArrowUp: i - 1 + panes.length, Home: 0, End: panes.length - 1 }[e.key];
      if (to == null) return;
      e.preventDefault();
      const next = panes[to % panes.length].id;
      show(next);
      nav.querySelector(`button[data-pane="${next}"]`)?.focus();
    };
    const snd = page.querySelector('.st-sound');
    if (snd) snd.onclick = () => {
      window.__sound.set(!window.__sound.on());
      paintSound();
    };
    const th = page.querySelector('.st-theme');
    if (th) th.onclick = () => {
      window.Cloud?.close();
      window.GitView?.view('themes');
    };
    const mas = page.querySelector('.st-mascot');
    if (mas) mas.onclick = () => {
      const on = !mascotOn();
      window.__mascotEnabled = on;
      window.dispatchEvent(new Event('mascotchange')); // repaints this page and the Themes view's copy
      window.webkit?.messageHandlers?.radar?.postMessage({ type: 'mascotEnabled', on });
    };
    const mis = page.querySelector('.st-mischief');
    if (mis) mis.onclick = (e) => {
      const b = e.target.closest('button[data-level]');
      if (!b) return;
      const level = Number(b.dataset.level);
      window.__mascotMischief = level;
      window.dispatchEvent(new Event('mascotchange'));
      window.webkit?.messageHandlers?.radar?.postMessage({ type: 'mascotMischief', level });
    };
    show(current);
    paintSound();
    paintTheme();
    paintMascot();
  }

  // What takes the keys when Settings shows (cloud.js showTab): in Account the e-mail sign-in's field if it's open,
  // the hacker name otherwise; in Shortcuts its search, to type what you look for; elsewhere the picked category, never
  // a field out of sight.
  function focusTarget() {
    if (!page || !page.isConnected) return null;
    if (current === 'account') return page.querySelector('.acct-email, .acct-code') || page.querySelector('.st-nav button.on');
    if (current === 'shortcuts') return page.querySelector('.ks-find');
    return page.querySelector('.st-nav button.on');
  }

  return { html, mount, show, focusTarget, current: () => current };
})();
