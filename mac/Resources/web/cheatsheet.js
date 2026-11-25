'use strict';

// Every keyboard shortcut at a glance, read-only: Help → Keyboard Shortcuts (no key of its own unless set in Settings) or ? on the
// dashboard while no text field has the keys (Linear's and GitHub's). A panel over the dashboard, apart from Settings:
// the groups side by side, a box that filters as you type, Esc closes it. Looking a key up takes a second and shouldn't
// mean opening Settings; changing one is rare and stays in Settings › Shortcuts ("Change shortcuts…" at the bottom), so
// nothing pressed here changes a key by mistake. The keys as the user set them, from the app (Shortcuts.swift, the
// "keys" handler's list), and the few it keeps fixed.
window.CheatSheet = (() => {
  const h = window.webkit && window.webkit.messageHandlers;
  const ON = !!(h && h.keys);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  // The filter finds them as Settings › Shortcuts' search does (cloud.js keyFind: "cmd t" finds ⌘T).
  const finder = () => window.Cloud?.keyFind;
  // The ones nobody changes (Shortcuts.swift's reserved), each with the group it belongs to.
  // Windows' tabs go by Ctrl+1 … Ctrl+9, and by its own Ctrl+Tab too (its shortcuts.js TAB_KEYS); its rewind, swapped, is
  // the close keys twice, whatever they are now (swapLabel null).
  const WIN = window.__platform === 'win32';
  const FIXED = WIN ? [
    { group: 'Tabs and panes', title: 'Tab 1 to 9 of the window', label: 'Ctrl+1 … Ctrl+9' },
    { group: 'Tabs and panes', title: 'Next and previous tab', label: 'Ctrl+Tab · Ctrl+Shift+Tab' },
    { group: 'Chats', title: 'Rewind a chat (Claude Code, Antigravity)', label: 'Esc Esc', swapLabel: null },
  ] : [
    { group: 'Tabs and panes', title: 'Tab 1 to 9 of the window', label: '⌘1 … ⌘9' },
    { group: 'Chats', title: 'Rewind a chat (Claude Code, Antigravity)', label: 'Esc Esc', swapLabel: '⌘W ⌘W' },
  ];
  // Windows: how the middle mouse button opens the Ring (its shortcuts.js ringMouse).
  const RING_MOUSE = { ctrl: 'Ctrl + middle click', plain: 'middle click', off: '' };

  let el = null;
  let told = false; // the app was told a window is over the dashboard (its pinned chats step aside), as cloud.js does
  let back = null; // what had the keys before, to give them back
  const tell = (open) => {
    try {
      h.radar.postMessage({ type: 'modal', open });
    } catch {}
  };

  function groupsOf(list, fingers = 4, escOn, mouse) {
    const groups = [];
    const add = (k) => (groups.find((g) => g.name === k.group) || (groups.push({ name: k.group, items: [] }), groups[groups.length - 1])).items.push(k);
    for (const k of list) {
      // The shortcut wheel opens with the trackpad first (4 fingers, 3, or none: Settings), then with the keys or the mouse button set for it.
      if (k.id === 'shortcutsWheel') add({ ...k, keys: [typeof mouse === 'string' ? RING_MOUSE[mouse] || '' : fingers ? `${fingers}-finger click` : '', k.label].filter(Boolean) });
      else if (k.id === 'closePane' && escOn) {
        // Swapped (Settings › Shortcuts): Esc closes, the close keys send Esc to the terminal.
        add({ ...k, keys: ['Esc'] });
        if (k.label) add({ ...k, id: 'escSend', title: 'Send Esc to the terminal', keys: [k.label] });
      }
      else add({ ...k, keys: k.label ? [k.label] : [] });
    }
    const close = list.find((k) => k.id === 'closePane')?.label || '';
    for (const k of FIXED) {
      const swapped = k.swapLabel === null ? (close ? `${close} ${close}` : '') : k.swapLabel;
      add({ ...k, keys: [escOn && k.swapLabel !== undefined ? swapped : k.label].filter(Boolean) });
    }
    return groups;
  }

  const row = (g, k) =>
    `<div class="cs-row" data-find="${esc(`${k.title} ${g.name} ${k.keys.join(' ')}`.toLowerCase())}" data-keys="${esc(finder()?.keys(k.keys) || '')}"><dt>${esc(k.title)}</dt>` +
    `<dd>${k.keys.length ? k.keys.map((x) => `<kbd>${esc(x)}</kbd>`).join('<i>or</i>') : '<span class="cs-off">none</span>'}</dd></div>`;

  async function open() {
    if (!ON) return;
    if (el) return el.querySelector('.cs-find')?.focus();
    const st = await h.keys.postMessage({ type: 'list' }).catch(() => null);
    if (el) return;
    const list = (st && st.shortcuts) || [];
    back = document.activeElement;
    el = document.createElement('div');
    el.id = 'cheatsheet';
    el.innerHTML =
      '<div class="pk hk cs-pk crt-on" role="dialog" aria-modal="true" aria-labelledby="cs-title">' +
      '<div class="pk-border"></div>' +
      '<div class="pk-title"><span class="lights"><i class="l-close" title="Close"></i><i class="l-min off" aria-hidden="true"></i><i class="l-max off" aria-hidden="true"></i></span>' +
      '<img class="hk-logo" src="logo.png" alt=""><b id="cs-title">KEYBOARD SHORTCUTS</b></div>' +
      '<div class="cs-top"><label class="cs-find-l"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="m10.3 10.3 3.6 3.6"/></svg>' +
      '<input type="search" class="cs-find" placeholder="type to filter" aria-label="Filter shortcuts" spellcheck="false" autocomplete="off" autocapitalize="off"></label></div>' +
      '<div class="cs-body"><div class="cs-cols">' +
      // A group may go on in the next column, so that they all fit without scrolling; its name stays with its first rows.
      groupsOf(list, st?.ringFingers ?? 4, st?.escClose === true, st?.ringMouse).map((g) => {
        const rows = g.items.map((k) => row(g, k));
        return `<section class="cs-group"><div class="cs-head"><h3>${esc(g.name)}</h3><dl>${rows.slice(0, 2).join('')}</dl></div>` +
          (rows.length > 2 ? `<dl>${rows.slice(2).join('')}</dl>` : '') + '</section>';
      }).join('') +
      '</div><p class="cs-none" hidden></p></div>' +
      '<div class="pk-foot"><span class="pk-sel note">esc to close</span><button type="button" class="cs-change">Change shortcuts…</button></div>' +
      '</div>';
    document.body.appendChild(el);
    // Over Settings, Settings has told the app already.
    told = !document.getElementById('cloudui')?.classList.contains('on');
    if (told) tell(true);
    const find = el.querySelector('.cs-find');
    find.addEventListener('input', filter);
    el.querySelector('.l-close').onclick = close;
    el.querySelector('.cs-change').onclick = () => {
      close();
      window.Cloud?.openSettings('shortcuts');
    };
    el.onmousedown = (e) => e.target === el && close();
    addEventListener('keydown', key, true);
    find.focus();
  }

  function close() {
    if (!el) return;
    const gone = el;
    el = null;
    removeEventListener('keydown', key, true);
    // Settings may have opened over the list since: it keeps the app's modal state till it closes itself.
    if (told && !document.getElementById('cloudui')?.classList.contains('on')) tell(false);
    told = false;
    gone.querySelector('.pk')?.classList.replace('crt-on', 'crt-off');
    setTimeout(() => gone.remove(), 300);
    if (back && back.isConnected && back !== document.body) back.focus?.();
    back = null;
  }

  // The rows with every word typed; a group left without any goes, and a line says when nothing has them.
  function filter() {
    if (!el) return;
    const q = el.querySelector('.cs-find').value.trim();
    const f = finder();
    const want = f ? f.words(q) : q.toLowerCase().split(/\s+/).filter(Boolean);
    let n = 0;
    el.querySelectorAll('.cs-row').forEach((r) => {
      const on = f ? f.match(want, r.dataset.find, r.dataset.keys) : want.every((w) => r.dataset.find.includes(w));
      r.hidden = !on;
      if (on) n++;
    });
    el.querySelectorAll('.cs-group').forEach((g) => (g.hidden = !g.querySelector('.cs-row:not([hidden])')));
    const none = el.querySelector('.cs-none');
    none.hidden = n > 0;
    none.textContent = n ? '' : `no shortcut has “${q}”`;
  }

  // While it's open: Esc closes it, and only it (Settings or a view under it stays).
  function key(e) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    close();
  }

  // ? on the dashboard: not while typing (a field, the notes, the editor), not over another window of the page.
  addEventListener('keydown', (e) => {
    if (!ON || el || e.key !== '?' || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
    const t = e.target;
    if (t && (t.isContentEditable || t.closest?.('input, textarea, select, [contenteditable], .monaco-editor'))) return;
    if (document.getElementById('cloudui')?.classList.contains('on') || document.querySelector('#arcmodal, .askbox, .mn-confirm, .acct-confirm')) return;
    e.preventDefault();
    open();
  });

  // Help → Keyboard Shortcuts (MainWindowController.openShortcutList): `toggle` when the dashboard was in front already,
  // so the same keys close it; from a chat window it always opens.
  if (window.__radar) window.__radar.openShortcuts = (toggle) => (toggle && el ? close() : open());

  return { open, close, isOpen: () => !!el };
})();
