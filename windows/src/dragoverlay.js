'use strict';
// The two click-through windows a tab, pane or window drag draws with (tabdrag.js), the Mac's TabDragGhost and dropZone:
// the ghost, a chip that follows the pointer, and the box, which shows either a drop zone inside the window under the pointer
// or the outline of the window a tear-off would open. Both are made on first use and kept, since a drag has to show its first
// frame at once. They never take the keys or the pointer, so the drag's own window keeps both.
const path = require('path');
const { BrowserWindow } = require('electron');

const GHOST = { width: 260, height: 26 };
let deps = null;
const wins = { ghost: null, box: null };
const ready = { ghost: false, box: false };
const pending = { ghost: null, box: null }; // the last message sent before the page loaded: only the newest matters
let ghostTitle = null;
// What the box shows now, so a repeat of it sends nothing: { mode: 'zone', win, key } | { mode: 'outline', key } | null.
let boxState = null;

function init(d) {
  deps = d;
}

function alive(w) {
  return !!w && !w.isDestroyed();
}

function create(role) {
  if (alive(wins[role])) return wins[role];
  if (!deps) throw new Error('dragoverlay: init first');
  const w = new BrowserWindow({
    show: false, frame: false, transparent: true, backgroundColor: '#00000000', resizable: false, movable: false,
    minimizable: false, maximizable: false, fullscreenable: false, focusable: false, skipTaskbar: true, hasShadow: false,
    // A tool window stays out of Alt+Tab as well as the taskbar.
    type: 'toolbar', webPreferences: deps.webPrefs(),
  });
  wins[role] = w;
  ready[role] = false;
  // The pointer goes through to whatever is under it, the dragged window's page included.
  w.setIgnoreMouseEvents(true);
  // The ghost above the box, and both above the app's own always-on-top windows (pinned terminals, the Ring).
  w.setAlwaysOnTop(true, role === 'ghost' ? 'screen-saver' : 'pop-up-menu');
  deps.bootFor(w.webContents);
  w.webContents.on('did-finish-load', () => {
    ready[role] = true;
    const m = pending[role];
    pending[role] = null;
    if (m && alive(w)) w.webContents.send('term:overlay', m);
  });
  // As the Ring's overlay (main.js): a page that crashed is loaded again, and what it drew is gone.
  w.webContents.on('render-process-gone', () => {
    ready[role] = false;
    if (role === 'ghost') ghostTitle = null;
    else boxState = null;
    setTimeout(() => alive(w) && w.webContents.reload(), 500);
  });
  w.on('closed', () => {
    if (wins[role] === w) wins[role] = null;
    ready[role] = false;
    pending[role] = null;
    if (role === 'ghost') ghostTitle = null;
    else boxState = null;
  });
  w.loadFile(path.join(deps.pagesDir, 'dragoverlay.html'), { query: { role } });
  return w;
}

function send(role, msg) {
  const w = wins[role];
  if (!alive(w)) return;
  if (ready[role]) w.webContents.send('term:overlay', msg);
  else pending[role] = msg;
}

/** Makes both windows (hidden) ahead of the first drag frame; calling it again changes nothing. */
function warm() {
  create('ghost');
  create('box');
}

function sameRect(a, b) {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

function liftGhost() {
  if (alive(wins.ghost) && wins.ghost.isVisible()) wins.ghost.moveTop();
}

/** The chip under the pointer: horizontally centred on `at` (screen DIP), its top 6 below it (the Mac's PS:426-429). */
function ghost(title, at) {
  const w = create('ghost');
  if (title !== ghostTitle) {
    ghostTitle = title;
    send('ghost', { title: String(title == null ? '' : title) });
  }
  w.setBounds({ x: Math.round(at.x - GHOST.width / 2), y: Math.round(at.y + 6), width: GHOST.width, height: GHOST.height });
  // On Windows every always-on-top level is HWND_TOPMOST and showInactive keeps the old slot: raised so a pinned window never covers it.
  if (!w.isVisible()) w.showInactive();
  w.moveTop();
}

function hideGhost() {
  if (alive(wins.ghost) && wins.ghost.isVisible()) wins.ghost.hide();
}

function hideBox() {
  const w = wins.box;
  boxState = null;
  if (!alive(w)) return;
  // The page clears its div too, so the next show starts from nothing (and fades in again when it is animated).
  send('box', { mode: 'none' });
  if (w.isVisible()) w.hide();
}

// The box shows `msg` in a window at `bounds`; the ghost, if it is up, stays above it.
function showBox(bounds, msg) {
  const w = create('box');
  if (!sameRect(w.getBounds(), bounds)) w.setBounds(bounds);
  send('box', msg);
  // Raised on every show (see ghost), the ghost above it again.
  if (!w.isVisible()) w.showInactive();
  w.moveTop();
  liftGhost();
}

/** The outline of the window a tear-off would open, at `bounds` (screen DIP). Null hides the box if it shows the outline. */
function outline(bounds) {
  if (!bounds) {
    if (boxState && boxState.mode === 'outline') hideBox();
    return;
  }
  const b = { x: Math.round(bounds.x), y: Math.round(bounds.y), width: Math.round(bounds.width), height: Math.round(bounds.height) };
  const key = `${b.x},${b.y},${b.width},${b.height}`;
  if (boxState && boxState.mode === 'outline' && boxState.key === key) return;
  // Coming from a zone, the page redraws at once: a zone's animation never carries into the outline.
  boxState = { mode: 'outline', key };
  showBox(b, { mode: 'outline' });
}

/**
 * A drop preview inside `win`: `rect` is in its content coordinates. `animated` is the Mac's window-drag preview over a pane
 * (150 ms fade in, 70 ms slide between places); `marker` a chip-boundary slot line instead of a framed zone. A null `win` or
 * `rect` hides the box if it shows a zone.
 */
function zone(win, rect, { animated = false, marker = false } = {}) {
  if (!win || win.isDestroyed() || !rect) {
    if (boxState && boxState.mode === 'zone') hideBox();
    return;
  }
  // Another window's zone starts over: nothing animated carries from one window to the next.
  if (boxState && boxState.mode === 'zone' && boxState.win !== win) hideBox();
  const cb = win.getContentBounds();
  const r = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  const key = `${cb.x},${cb.y},${cb.width},${cb.height}|${r.x},${r.y},${r.width},${r.height}|${animated ? 1 : 0}${marker ? 1 : 0}`;
  if (boxState && boxState.mode === 'zone' && boxState.key === key) return;
  boxState = { mode: 'zone', win, key };
  showBox(cb, { mode: 'zone', rect: r, animated: !!animated, marker: !!marker });
}

function hideAll() {
  hideGhost();
  hideBox();
}

/** The overlay windows' native handles, for tabdrag to skip them when it looks for the window under the pointer. */
function hwnds() {
  const out = [];
  for (const role of ['ghost', 'box']) {
    const w = wins[role];
    if (!alive(w)) continue;
    try {
      const b = w.getNativeWindowHandle();
      out.push(b.length >= 8 ? Number(b.readBigUInt64LE(0)) : b.readUInt32LE(0));
    } catch {}
  }
  return out;
}

module.exports = { init, warm, ghost, hideGhost, outline, zone, hideAll, hwnds };
