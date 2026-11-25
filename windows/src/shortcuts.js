'use strict';
// The keyboard shortcuts the user can change (the dashboard's Settings › Shortcuts), the Mac's Shortcuts.swift and its
// KeysBridge: the menu's actions with the keys they come with or the ones the user set, kept in settings.json
// ("shortcuts": action id → combo). A combo is "ctrl+shift+n" (ctrl, alt, shift, then the key, as Windows Terminal
// writes them); "" takes the keys off. Only the actions this app has on Windows. The system's and the app's fixed keys
// (Copy, Paste, Quit, Minimize…, Ctrl+1–Ctrl+9 for a window's tabs) stay as they are.
//
// The Mac's keys with ⌘ as Ctrl and ⌥ as Alt, as far as a terminal lets them be: one whose Ctrl key the shell or the AI
// needs takes Shift as well (⌘D would be Ctrl+D, the end of input: Split Vertically is Ctrl+Shift+D), and its Shift
// variant then Alt too (⇧⌘D, Split Horizontally: Ctrl+Alt+Shift+D). No Ctrl+Alt with a letter alone: that is AltGr on many
// keyboards (AltGr+T types ₺ on a Turkish one). ⌘T, New Tab, is Windows Terminal's Ctrl+Shift+T rather than Ctrl+T,
// which Claude Code (its task list) and Codex (its transcript) use: Undo Close (⇧⌘T) is then Ctrl+Alt+Shift+T, and
// ⌥⌘T, New Tab Next to Current Tab, Ctrl+Alt+Shift+N. The tab keys act
// only in a window with two tabs or more, the pane keys only in a split tab (TAB_ACTIONS, PANE_ACTIONS): elsewhere they
// stay the shell's, Ctrl+[ its Esc among them.
//
// The Ring opens two ways, as on the Mac: the mouse (the Mac's trackpad click; here the middle button, with Ctrl or
// without, or not at all: "ringMouse") and keys set for it (Ctrl+K as it came). Esc and the close keys can swap places
// ("escClosesTerminal", the Mac's EscClose.swift): Esc hides the terminal, the close keys send Esc to it.

const ACTIONS = [
  // VS Code's: Ctrl+N a new file in Source Control's editor, Ctrl+Shift+N a new window (here a terminal).
  { id: 'newTerminal', group: 'Chats', title: 'New terminal', combo: 'ctrl+shift+n' },
  { id: 'newFile', group: 'Editor', title: 'New file', combo: 'ctrl+n' },
  // Its keys (its mouse button is the card's other row). Antigravity approves its subagents' steps with Ctrl+K: in a
  // terminal it runs in, the Ring's keys stay its own (pages/terminal.js).
  { id: 'shortcutsWheel', group: 'Chats', title: 'Ring', combo: 'ctrl+k' },
  // A tab in the terminal window in front (the Mac's ⌘T): Windows Terminal's Ctrl+Shift+T, so Ctrl+T stays Claude Code's
  // (its task list) and Codex's (its transcript). ⌥⌘T, beside the current tab: Ctrl+Alt+Shift+N (Ctrl+Alt+N alone would
  // be AltGr+N on many keyboards).
  { id: 'newTab', group: 'Chats', title: 'New tab', combo: 'ctrl+shift+t' },
  { id: 'newTabNext', group: 'Chats', title: 'New tab next to the current one', combo: 'ctrl+alt+shift+n' },
  // ⌘D's Ctrl+D is the shell's end of input (and Claude's exit): Shift is added, and ⇧⌘D takes Alt as well.
  { id: 'splitVertically', group: 'Chats', title: 'Split vertically', combo: 'ctrl+shift+d' },
  { id: 'splitHorizontally', group: 'Chats', title: 'Split horizontally', combo: 'ctrl+alt+shift+d' },
  // The strip's env button: the env files in the terminal's folder (pages/env.js), the Mac's ⇧⌘E.
  { id: 'envFiles', group: 'Chats', title: 'Env files', combo: 'ctrl+shift+e' },
  // The tab or pane with the keys closes, or with only one the window in front; a terminal's only hides (what runs in it
  // goes on). Ctrl+Shift+W closes the whole window, as ⇧⌘W on the Mac.
  { id: 'closePane', group: 'Chats', title: 'Close the tab or pane', combo: 'ctrl+w' },
  { id: 'closeWindow', group: 'Chats', title: 'Close the terminal window', combo: 'ctrl+shift+w' },
  // iTerm2's Undo Close (the Mac's ⇧⌘T): the terminal hidden last, still running, comes back. Ctrl+Alt+Shift+T: it was
  // Ctrl+Shift+T until that became New Tab, as in Windows Terminal.
  { id: 'undoClose', group: 'Chats', title: 'Undo close', combo: 'ctrl+alt+shift+t' },
  // The Mac's tab and pane keys (iTerm2's), ⌘ as Ctrl and ⌥ as Alt. ⌃⌘ and an arrow (a divider) can't be told from ⌘ and
  // an arrow here: Ctrl+Alt+Shift and the arrow. Move to a new window and merge have no keys, as on the Mac.
  { id: 'nextTab', group: 'Tabs and panes', title: 'Next tab', combo: 'ctrl+shift+]' },
  { id: 'previousTab', group: 'Tabs and panes', title: 'Previous tab', combo: 'ctrl+shift+[' },
  { id: 'moveTabLeft', group: 'Tabs and panes', title: 'Move the tab left', combo: 'ctrl+alt+shift+[' },
  { id: 'moveTabRight', group: 'Tabs and panes', title: 'Move the tab right', combo: 'ctrl+alt+shift+]' },
  { id: 'moveTabToNewWindow', group: 'Tabs and panes', title: 'Move the tab to a new window', combo: '' },
  { id: 'mergeAllWindows', group: 'Tabs and panes', title: 'Merge all windows', combo: '' },
  { id: 'nextPane', group: 'Tabs and panes', title: 'Next pane', combo: 'ctrl+]' },
  { id: 'previousPane', group: 'Tabs and panes', title: 'Previous pane', combo: 'ctrl+[' },
  { id: 'paneAbove', group: 'Tabs and panes', title: 'Pane above', combo: 'ctrl+alt+up' },
  { id: 'paneBelow', group: 'Tabs and panes', title: 'Pane below', combo: 'ctrl+alt+down' },
  { id: 'paneLeft', group: 'Tabs and panes', title: 'Pane on the left', combo: 'ctrl+alt+left' },
  { id: 'paneRight', group: 'Tabs and panes', title: 'Pane on the right', combo: 'ctrl+alt+right' },
  { id: 'dividerUp', group: 'Tabs and panes', title: 'Move the divider up', combo: 'ctrl+alt+shift+up' },
  { id: 'dividerDown', group: 'Tabs and panes', title: 'Move the divider down', combo: 'ctrl+alt+shift+down' },
  { id: 'dividerLeft', group: 'Tabs and panes', title: 'Move the divider left', combo: 'ctrl+alt+shift+left' },
  { id: 'dividerRight', group: 'Tabs and panes', title: 'Move the divider right', combo: 'ctrl+alt+shift+right' },
  { id: 'maximizePane', group: 'Tabs and panes', title: 'Maximize the pane', combo: 'ctrl+shift+return' },
  // No keys as it comes: the Mac's ⇧⌘C would be Ctrl+Shift+C here, which is Copy in a terminal.
  { id: 'copyReply', group: 'Chats', title: "Copy Claude's last reply", combo: '' },
  // File › Create Pull Request… for the terminal window in front when it's in a worktree (worktreeship.js), the Mac's
  // ⇧⌘P (Conductor's key too). Merge and Delete have none: rare, and Delete shouldn't be a slip of the finger.
  { id: 'createPR', group: 'Chats', title: 'Create pull request', combo: 'ctrl+shift+p' },
  // The terminal in front, as the Mac's Terminal group: Windows Terminal's keys (its find, its scrolling).
  { id: 'find', group: 'Terminal', title: 'Find', combo: 'ctrl+shift+f' },
  { id: 'findNext', group: 'Terminal', title: 'Find next', combo: 'f3' },
  { id: 'findPrevious', group: 'Terminal', title: 'Find previous', combo: 'shift+f3' },
  { id: 'findSelection', group: 'Terminal', title: 'Find the selected text', combo: '' },
  { id: 'clearBuffer', group: 'Terminal', title: 'Clear the buffer', combo: '' },
  { id: 'scrollLineUp', group: 'Terminal', title: 'Scroll up a line', combo: 'ctrl+shift+up' },
  { id: 'scrollLineDown', group: 'Terminal', title: 'Scroll down a line', combo: 'ctrl+shift+down' },
  { id: 'scrollPageUp', group: 'Terminal', title: 'Scroll up a page', combo: 'ctrl+shift+pageup' },
  { id: 'scrollPageDown', group: 'Terminal', title: 'Scroll down a page', combo: 'ctrl+shift+pagedown' },
  { id: 'scrollTop', group: 'Terminal', title: 'Scroll to the top', combo: 'ctrl+shift+home' },
  { id: 'scrollBottom', group: 'Terminal', title: 'Scroll to the bottom', combo: 'ctrl+shift+end' },
  { id: 'reloadDashboard', group: 'View', title: 'Reload the dashboard', combo: 'ctrl+r' },
  // The dashboard's only: in a terminal Ctrl+B stays the shell's.
  { id: 'chatsList', group: 'View', title: 'Chats list', combo: 'ctrl+b' },
  { id: 'biggerText', group: 'View', title: 'Bigger text', combo: 'ctrl+=' },
  { id: 'smallerText', group: 'View', title: 'Smaller text', combo: 'ctrl+-' },
  { id: 'defaultText', group: 'View', title: 'Default text size', combo: 'ctrl+0' },
  { id: 'fullScreen', group: 'View', title: 'Full screen', combo: 'f11' },
  // Every shortcut at a glance (Help › Keyboard Shortcuts, web/cheatsheet.js): no keys of its own, as on the Mac.
  { id: 'keyboardShortcuts', group: 'View', title: 'Keyboard shortcuts', combo: '' },
  // Clean Up (File, below Settings…; the Mac's app menu): no keys of its own, as on the Mac; it is clicked.
  { id: 'cleanUp', group: 'View', title: 'Clean Up', combo: '' },
];

// The actions whose keys are the dashboard's only: in a terminal they stay the shell's (Ctrl+B, Ctrl+R).
const DASHBOARD_ONLY = new Set(['chatsList', 'reloadDashboard']);
// The keys a terminal window takes before its page only while it has two tabs or more (TAB_ACTIONS) or the tab in front
// is split (PANE_ACTIONS): main.js's paneKeys. Elsewhere they go on to the shell.
const TAB_ACTIONS = new Set(['nextTab', 'previousTab', 'moveTabLeft', 'moveTabRight']);
const PANE_ACTIONS = new Set(['nextPane', 'previousPane', 'paneAbove', 'paneBelow', 'paneLeft', 'paneRight', 'dividerUp', 'dividerDown', 'dividerLeft', 'dividerRight', 'maximizePane']);
// Fixed, as the Mac's ⌘1–⌘9: Ctrl+1–Ctrl+9 a window's tab, and Windows' own Ctrl+Tab and Ctrl+Shift+Tab the next and the
// previous one, with the tab keys' rule.
const TAB_KEYS = { 'ctrl+tab': 'nextTab', 'ctrl+shift+tab': 'previousTab' };
for (let n = 1; n <= 9; n++) TAB_KEYS[`ctrl+${n}`] = `tab${n}`;

/** Keys Windows or the app keeps for itself, with what they do. */
const RESERVED = {
  'ctrl+c': 'Copy', 'ctrl+v': 'Paste', 'ctrl+x': 'Cut', 'ctrl+a': 'Select All', 'ctrl+z': 'Undo', 'ctrl+y': 'Redo',
  'ctrl+shift+c': 'Copy in a terminal', 'ctrl+shift+v': 'Paste in a terminal', 'ctrl+q': 'Quit', 'ctrl+m': 'Minimize',
  'ctrl+shift+i': 'the developer tools', 'alt+f4': "Windows' close", 'alt+space': "the window's menu", 'alt+tab': "Windows' switcher",
  'ctrl+esc': 'Start', 'ctrl+shift+esc': 'Task Manager', 'ctrl+alt+delete': 'Windows',
  'ctrl+tab': 'the next tab', 'ctrl+shift+tab': 'the previous tab',
};
for (let n = 1; n <= 9; n++) RESERVED[`ctrl+${n}`] = `the window's tab ${n}`;

const RING_MOUSE = ['ctrl', 'plain', 'off'];

// KeyboardEvent.code → the key's name in a combo: the key where it is, whatever the layout makes of it (Ctrl+Shift+]
// stays "]"), as the menu's accelerators read keys.
const NAMED = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', PageUp: 'pageup', PageDown: 'pagedown',
  Home: 'home', End: 'end', Enter: 'return', NumpadEnter: 'return', Tab: 'tab', Space: 'space', Insert: 'insert', Delete: 'delete',
  Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'", Comma: ',',
  Period: '.', Slash: '/', Backquote: '`', NumpadAdd: 'plus', NumpadSubtract: 'numsub', Escape: 'esc',
};
/** The key a KeyboardEvent / before-input-event `code` names, or null for one that can't be part of a shortcut. */
function keyOfCode(code) {
  if (typeof code !== 'string') return null;
  let m = /^Key([A-Z])$/.exec(code);
  if (m) return m[1].toLowerCase();
  m = /^(?:Digit|Numpad)([0-9])$/.exec(code);
  if (m) return m[1];
  m = /^F([1-9]|1[0-9]|2[0-4])$/.exec(code);
  if (m) return `f${m[1]}`;
  return NAMED[code] || null;
}

// The key by what it types, for a press without a `code`: keys sent by a program (SendKeys, AutoHotkey), Remote Desktop,
// the on-screen keyboard come with no scan code, so Chromium can't say where the key is. A shifted symbol is read as
// its key on a US keyboard (Ctrl+Shift+] types "}").
const SHIFTED = { '+': '=', _: '-', '{': '[', '}': ']', '|': '\\', ':': ';', '"': "'", '<': ',', '>': '.', '?': '/', '~': '`',
  '!': '1', '@': '2', '#': '3', $: '4', '%': '5', '^': '6', '&': '7', '*': '8', '(': '9', ')': '0' };
const NAMED_KEYS = { ' ': 'space', Spacebar: 'space', Esc: 'esc' };
/** The key a KeyboardEvent / before-input-event `key` names, or null. */
function keyOfKey(key) {
  if (typeof key !== 'string' || !key) return null;
  if (key.length === 1) {
    const c = SHIFTED[key] || key.toLowerCase();
    return /^[a-z0-9]$/.test(c) || Object.values(NAMED).includes(c) ? c : null;
  }
  const m = /^F([1-9]|1[0-9]|2[0-4])$/.exec(key);
  if (m) return `f${m[1]}`;
  return NAMED_KEYS[key] || NAMED[key] || null;
}

/**
 * The combo a key press makes ({ code, key, control, alt, shift, meta } as before-input-event gives them), or null when
 * it can't be a shortcut: none with the Windows key, and none without Ctrl or Alt except the F keys. The key where it
 * is (`code`), else what it types (`key`).
 */
function comboOf({ code, key: typed, control, alt, shift, meta }) {
  if (meta) return null;
  const key = keyOfCode(code) || keyOfKey(typed);
  if (!key) return null;
  if (!control && !alt && !/^f\d+$/.test(key)) return null;
  return [control && 'ctrl', alt && 'alt', shift && 'shift', key].filter(Boolean).join('+');
}

/** Whether a combo is one comboOf could have made (the page sends back what record answered). */
const KEYS = new Set([...'abcdefghijklmnopqrstuvwxyz0123456789'].concat(Array.from({ length: 24 }, (_, i) => `f${i + 1}`), Object.values(NAMED)));
function valid(c) {
  const parts = c.split('+');
  // "ctrl++" can't happen: the plus key is "=" (or the keypad's "plus").
  const key = parts.pop();
  const order = ['ctrl', 'alt', 'shift'];
  let last = -1;
  for (const m of parts) {
    const i = order.indexOf(m);
    if (i <= last) return false;
    last = i;
  }
  return KEYS.has(key) && (parts.includes('ctrl') || parts.includes('alt') || /^f\d+$/.test(key));
}

const split = (combo) => {
  const parts = String(combo || '').split('+');
  return { mods: parts.slice(0, -1), key: parts[parts.length - 1] };
};
const KEY_LABELS = {
  up: 'Up', down: 'Down', left: 'Left', right: 'Right', pageup: 'PgUp', pagedown: 'PgDn', home: 'Home', end: 'End',
  return: 'Enter', tab: 'Tab', space: 'Space', insert: 'Insert', delete: 'Delete', plus: 'Num +', numsub: 'Num -', esc: 'Esc',
};
/** How a combo reads, as Windows writes it: Ctrl+Shift+N, Alt+F4. */
function label(combo) {
  if (!combo) return '';
  const { mods, key } = split(combo);
  const names = { ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift' };
  return [...['ctrl', 'alt', 'shift'].filter((m) => mods.includes(m)).map((m) => names[m]), KEY_LABELS[key] || key.toUpperCase()].join('+');
}
const ACCEL_KEYS = {
  up: 'Up', down: 'Down', left: 'Left', right: 'Right', pageup: 'PageUp', pagedown: 'PageDown', home: 'Home', end: 'End',
  return: 'Return', tab: 'Tab', space: 'Space', insert: 'Insert', delete: 'Delete', plus: 'numadd', numsub: 'numsub', esc: 'Escape',
};
/** The menu's accelerator for a combo ("Ctrl+Shift+N"), or undefined for none. */
function accelerator(combo) {
  if (!combo) return undefined;
  const { mods, key } = split(combo);
  const names = { ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift' };
  return [...['ctrl', 'alt', 'shift'].filter((m) => mods.includes(m)).map((m) => names[m]), ACCEL_KEYS[key] || key.toUpperCase()].join('+');
}

function createShortcuts({ settings, onChange }) {
  const saved = () => {
    const s = settings.get('shortcuts');
    return s && typeof s === 'object' && !Array.isArray(s) ? s : {};
  };
  const action = (id) => ACTIONS.find((a) => a.id === id);
  const combo = (id) => {
    const s = saved();
    return typeof s[id] === 'string' ? s[id] : action(id)?.combo || '';
  };
  const ringMouse = () => (RING_MOUSE.includes(settings.get('ringMouse')) ? settings.get('ringMouse') : 'ctrl');
  const escCloses = () => settings.get('escClosesTerminal') === true;

  function list() {
    return ACTIONS.map((a) => {
      const c = combo(a.id);
      return { id: a.id, group: a.group, title: a.title, combo: c, label: label(c), changed: c !== a.combo };
    });
  }
  const state = () => ({ shortcuts: list(), ringMouse: ringMouse(), escClose: escCloses() });

  /** Sets an action's keys ("" for none): null, or why not (another action has them, or Windows or the app does). */
  function set(id, c) {
    const a = action(id);
    if (!a) return 'unknown action';
    c = typeof c === 'string' ? c : '';
    if (c && /mouse/.test(c)) return 'the mouse opens the Ring in the row above';
    if (c && !valid(c)) return 'not a shortcut';
    if (c) {
      if (RESERVED[c]) return `${label(c)} is ${RESERVED[c]}`;
      const other = ACTIONS.find((x) => x.id !== id && combo(x.id) === c);
      if (other) return `${label(c)} is already ${other.title.toLowerCase()}`;
    }
    const all = { ...saved() };
    if (c === a.combo) delete all[id];
    else all[id] = c;
    settings.set('shortcuts', all);
    onChange();
    return null;
  }

  function reset(id) {
    if (id) {
      const all = { ...saved() };
      delete all[id];
      settings.set('shortcuts', all);
    } else {
      // "reset all": the keys, the Ring's mouse button and the Esc swap, as on the Mac.
      settings.set('shortcuts', {});
      settings.set('ringMouse', undefined);
      settings.set('escClosesTerminal', false);
    }
    onChange();
  }

  // ---------- recording a new one ----------
  // The next keys pressed in the dashboard (main.js hands its before-input-event over while one is asked for): nothing
  // else gets them, the menu neither. Esc cancels, Delete or Backspace takes the keys off; keys that can't be a
  // shortcut are passed over. Ten seconds at most.
  let recorder = null;
  function stopRecording(answer) {
    const r = recorder;
    recorder = null;
    if (!r) return;
    clearTimeout(r.timer);
    r.resolve(answer);
  }
  function record() {
    stopRecording({ cancel: true });
    return new Promise((resolve) => {
      recorder = { resolve, timer: setTimeout(() => stopRecording({ cancel: true }), 10_000) };
    });
  }
  /** A key press in the dashboard: true when it went to the recorder (main.js then keeps it from the page and the menu). */
  function recordInput(input) {
    if (!recorder) return false;
    if (input.type !== 'keyDown' && input.type !== 'rawKeyDown') return true;
    const plain = !input.control && !input.alt && !input.shift && !input.meta;
    if (plain && input.key === 'Escape') stopRecording({ cancel: true });
    else if (plain && (input.key === 'Delete' || input.key === 'Backspace')) stopRecording({ combo: '' });
    else {
      const c = comboOf(input);
      if (c) stopRecording({ combo: c, label: label(c) });
    }
    return true;
  }

  return {
    actions: ACTIONS,
    combo,
    label,
    /** The menu's accelerator for an action, or undefined. */
    accel: (id) => accelerator(combo(id)),
    ringMouse,
    /**
     * How the Ring opens, for the line under it (web/shortcuts.js), as the Mac's Shortcuts.ringHint: its mouse button,
     * then its keys ("Ctrl + middle click or Ctrl+K"), or the menu when neither is set.
     */
    ringHint() {
      const parts = [{ ctrl: 'Ctrl + middle click', plain: 'middle click' }[ringMouse()], label(combo('shortcutsWheel'))].filter(Boolean);
      return parts.length ? parts.join(' or ') : 'File › Ring';
    },
    escCloses,
    comboOf,
    recording: () => !!recorder,
    recordInput,
    state,
    /**
     * A tab or pane key, for a terminal window (main.js's paneKeys): { id, tabs } (`tabs`: it needs two tabs, else a
     * split tab; `id` "tab3" for Ctrl+3), or null.
     */
    windowKey(c) {
      if (!c) return null;
      if (TAB_KEYS[c]) return { id: TAB_KEYS[c], tabs: true };
      const a = ACTIONS.find((x) => (TAB_ACTIONS.has(x.id) || PANE_ACTIONS.has(x.id)) && combo(x.id) === c);
      return a ? { id: a.id, tabs: TAB_ACTIONS.has(a.id) } : null;
    },
    /**
     * What a terminal page needs (pages/terminal.js): the combos the app takes there, and the Esc swap. Not the tab and
     * pane keys: the app takes those before the page when the window has something for them (windowKey).
     */
    forTerminal: () => ({
      app: ACTIONS.filter((a) => !DASHBOARD_ONLY.has(a.id) && !TAB_ACTIONS.has(a.id) && !PANE_ACTIONS.has(a.id)).map((a) => combo(a.id)).filter(Boolean),
      ring: combo('shortcutsWheel'),
      closePane: combo('closePane'),
      escClose: escCloses(),
    }),
    /** Settings › Shortcuts' requests (web/cloud.js) and the list of them all (web/cheatsheet.js). */
    async handle(body) {
      switch (body.type) {
        case 'list':
          return state();
        case 'record':
          return await record();
        case 'set': {
          const why = set(String(body.id || ''), body.combo);
          return why ? { error: why } : state();
        }
        case 'ringMouse':
          if (RING_MOUSE.includes(body.mode)) {
            settings.set('ringMouse', body.mode === 'ctrl' ? undefined : body.mode);
            onChange();
          }
          return state();
        case 'reset':
          reset(typeof body.id === 'string' && body.id ? body.id : null);
          return state();
        case 'escClose':
          settings.set('escClosesTerminal', body.on === true);
          onChange();
          return state();
        default:
          throw new Error('unknown request');
      }
    },
  };
}

module.exports = { createShortcuts, comboOf, keyOfCode, keyOfKey, label, accelerator };
