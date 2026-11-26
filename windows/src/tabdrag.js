'use strict';
// Dragging tabs, split panes and whole windows, the way the Mac app does since 9f04125 (ChatWindow.swift tabDrop / paneDrop /
// dragWindow). The renderers only report phases (`term:drag`: arm, start, move, end, cancel); this module reads the pointer
// itself (screen.getCursorScreenPoint, right across displays), decides what a drop would do (dropgeom.js, pure and tested in
// plain node), draws the ghost and the previews through dragoverlay.js, and on release calls the frame operations main.js
// hands over in `deps.ops`. A whole-window drag has no renderer at all: the native title bar moves the window, and we watch
// 'will-move' ... 'moved' with a 50 ms timer, as the Mac does with its repin timer.
const { ipcMain, screen } = require('electron');
const g = require('./dropgeom');
const dragoverlay = require('./dragoverlay');

const WIN = process.platform === 'win32';

let deps = null;
let drag = null; // the chip / strip drag in progress: { kind, f, node, id, sender, wcId, seq, title, snapshot, gen, drop }
let wdrag = null; // the window drag in progress (win32 only), see startWindowDrag
let gen = 0;
let focusSeq = 0;
let deskTimer = null;
const focusOrder = new WeakMap(); // frame -> when it last had the focus, for the z-order guess without a snapshot

// --- views of frames ------------------------------------------------------------------------------------------------------------

function live(f) {
  return !!f && deps.frames.has(f) && !f.win.isDestroyed();
}

// A window that can take a drop: alive, on screen, not minimised, not stepped aside, with a tab (the Mac's `accepts`).
function showing(f) {
  return live(f) && f.win.isVisible() && !f.win.isMinimized() && !f.steppedAside && f.tabs.length > 0;
}

// The native handle of a window as the number the desk helper reports for it.
function hwndOf(win) {
  try {
    const b = win.getNativeWindowHandle();
    return b.length >= 8 ? Number(b.readBigUInt64LE(0)) : b.readUInt32LE(0);
  } catch {
    return 0;
  }
}

// One frame as the plain data dropgeom works on. `outer` is the visible bounds: the content bounds reaching up to the top of
// the window, which covers the native title bar but leaves out the invisible resize borders getBounds() includes on Windows 10/11.
function viewOf(f) {
  const cb = f.win.getContentBounds();
  const b = f.win.getBounds();
  const tabs = f.tabs.length;
  const barH = tabs > 1 ? deps.TAB_BAR : 0;
  const top = Math.min(b.y, cb.y);
  return {
    key: f,
    outer: { x: cb.x, y: top, width: cb.width, height: cb.y + cb.height - top },
    content: cb,
    tabs,
    active: f.active,
    barH,
    geom: tabs > 1 ? deps.barGeom(f) || g.evenGeom(tabs, cb.width) : null,
    rects: deps.paneRects(f),
    accepts: showing(f),
  };
}

// --- which window is under the pointer ----------------------------------------------------------------------------------------

function overlayHwnds() {
  try {
    return new Set(dragoverlay.hwnds());
  } catch {
    return new Set();
  }
}

// Asks the desk helper for the front-to-back window list; `then` gets it only while `still()` holds.
function snapshotFor(still, then) {
  if (!deps.desk.available()) return;
  Promise.resolve(deps.desk.windows())
    .then((list) => {
      if (list && still()) then(list);
    })
    .catch(() => {});
}

// The terminal window under the screen point p, or null for "none" (the desktop, another app's window, the dashboard).
// With a z-order snapshot the topmost window at p decides; without one (not Windows, helper refused, not answered yet) the frames
// are tried pinned first, then by most recent focus. `skip` holds hwnds to look through (our overlays, the dragged window).
function frameAt(p, snapshot, skip, except) {
  if (snapshot) {
    let phys = p;
    if (WIN && typeof screen.dipToScreenPoint === 'function') phys = screen.dipToScreenPoint(p);
    const hwnd = g.pickTop(phys, snapshot, skip);
    if (hwnd == null) return null;
    for (const f of deps.frames) if (live(f) && f !== except && hwndOf(f.win) === hwnd) return f;
    return null;
  }
  const order = [...deps.frames].filter((f) => f !== except && live(f) && f.win.isVisible() && !f.win.isMinimized());
  order.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (focusOrder.get(b) || 0) - (focusOrder.get(a) || 0));
  for (const f of order) if (g.contains(viewOf(f).outer, p)) return f;
  return null;
}

// --- chip and strip drags -----------------------------------------------------------------------------------------------------

function sendCancel(d) {
  try {
    if (!d.sender.isDestroyed()) d.sender.send('term:dragCancel', { seq: d.seq });
  } catch {}
}

function tabIndex(d) {
  return d.kind === 'tab' ? d.f.tabs.indexOf(d.node) : -1;
}

// What a drop at p would do right now, with the views it was decided from.
function dropAt(d, p) {
  const skip = overlayHwnds();
  const top = frameAt(p, d.snapshot, skip, null);
  const self = viewOf(d.f);
  let hit = { kind: 'none' };
  if (top === d.f) hit = { kind: 'self' };
  else if (top) hit = { kind: 'frame', view: viewOf(top) };
  if (d.kind === 'tab') {
    const i = tabIndex(d);
    if (i < 0) return { drop: null, self, hit, lost: true };
    return { drop: g.tabDrop({ p, self, i, hit }), self, hit };
  }
  return { drop: g.paneDrop({ p, self, id: d.id, hit }), self, hit };
}

function tearAt(d, p) {
  return g.tearBounds(d.f.win.getBounds(), p, screen.getDisplayNearestPoint(p).workArea);
}

// Draws the ghost and the preview of a drop (the table of the spec's 4.6; instant, as the Mac's chip and pane-bar previews).
function preview(d, p, found) {
  const { drop, self, hit } = found;
  dragoverlay.ghost(d.title, p);
  if (drop && drop.type === 'detach') {
    dragoverlay.zone(null);
    dragoverlay.outline(tearAt(d, p));
    return;
  }
  dragoverlay.outline(null);
  if (!drop) return dragoverlay.zone(null);
  if (drop.type === 'slot' || drop.type === 'tab') {
    const mark = g.incomingMark(self, drop.slot);
    return dragoverlay.zone(d.f.win, mark.rect, { marker: mark.marker });
  }
  if (drop.type === 'join' || drop.type === 'split') {
    return dragoverlay.zone(d.f.win, g.halfRect(self.rects.get(drop.target), drop.edge));
  }
  const v = hit.view;
  if (drop.type === 'window') {
    const mark = g.incomingMark(v, drop.slot);
    return dragoverlay.zone(v.key.win, mark.rect, { marker: mark.marker });
  }
  return dragoverlay.zone(v.key.win, g.halfRect(v.rects.get(drop.target), drop.edge));
}

function update(d) {
  const p = screen.getCursorScreenPoint();
  const found = dropAt(d, p);
  if (found.lost) return finish(d, { notify: true });
  d.drop = found.drop;
  preview(d, p, found);
}

// Ends the drag without dropping anything: previews and ghost go, the keys go back to the source.
function finish(d, { notify }) {
  if (drag !== d) return;
  drag = null;
  dragoverlay.hideAll();
  if (notify) sendCancel(d);
  deps.refocus(d.f);
}

function startDrag(e, msg) {
  if (drag) finish(drag, { notify: true });
  const fail = () => {
    try {
      e.sender.send('term:dragCancel', { seq: msg.seq });
    } catch {}
  };
  let f = null;
  let i = -1;
  let id = null;
  if (msg.kind === 'tab') {
    f = deps.frameOfBar(e.sender);
    i = msg.i;
    if (!live(f) || f.tabs.length < 2 || !Number.isInteger(i) || i < 0 || i >= f.tabs.length) return fail();
  } else {
    const found = deps.paneOfPage(e.sender);
    f = found && found.f;
    id = found && found.id;
    const ids = live(f) && f.tabs[f.active] ? deps.panes.ids(f.tabs[f.active]) : [];
    if (ids.length < 2 || !ids.includes(id)) return fail();
  }
  const d = {
    kind: msg.kind,
    f,
    node: msg.kind === 'tab' ? f.tabs[i] : null,
    id,
    sender: e.sender,
    wcId: e.sender.id,
    seq: msg.seq,
    title: msg.kind === 'tab' ? deps.tabTitle(f, i) : deps.paneTitle(id),
    snapshot: null,
    gen: ++gen,
    drop: null,
  };
  drag = d;
  // A zoomed tab un-zooms when a drag starts (the Mac does too), so every pane is a target.
  deps.unzoom(f);
  snapshotFor(
    () => drag === d,
    (list) => {
      d.snapshot = list;
    }
  );
  update(d);
}

// What the drop does, once the pointer is released. Runs on the next turn, the Mac's order too: previews go first.
function runDrop(d, drop, tear) {
  const { ops } = deps;
  const f = d.f;
  if (!drop || !live(f)) return void deps.refocus(f);
  const to = drop.to;
  if (to && !showing(to)) return void deps.refocus(f);
  const idx = tabIndex(d);
  if (d.kind === 'tab' && idx < 0) return void deps.refocus(f);
  if (d.kind === 'pane' && !f.views.has(d.id)) return void deps.refocus(f);
  let done = true;
  switch (drop.type) {
    case 'slot':
      done = ops.reorderTab(f, idx, drop.slot);
      break;
    case 'join':
      done = ops.joinTab(f, idx, drop.target, drop.edge);
      break;
    case 'tab':
      done = ops.paneToTab(f, d.id, drop.slot);
      break;
    case 'split':
      done = ops.paneToSplit(f, d.id, drop.target, drop.edge);
      break;
    case 'window':
      done = d.kind === 'tab' ? ops.tabToFrame(f, idx, to, drop.slot) : ops.paneToFrame(f, d.id, to, drop.slot);
      break;
    case 'windowSplit':
      done = d.kind === 'tab' ? ops.tabToSplit(f, idx, to, drop.target, drop.edge) : ops.paneToFrameSplit(f, d.id, to, drop.target, drop.edge);
      break;
    case 'detach':
      done = d.kind === 'tab' ? ops.tearOffTab(f, idx, tear) : ops.tearOffPane(f, d.id, tear);
      break;
    default:
      done = false;
  }
  if (!done) deps.refocus(f);
}

function endDrag(d) {
  // The drop is worked out again at the release, as the Mac does at .ended: the last move may be a frame behind the pointer.
  const p = screen.getCursorScreenPoint();
  const found = dropAt(d, p);
  const drop = found.lost ? null : found.drop;
  const tear = drop && drop.type === 'detach' ? tearAt(d, p) : null;
  drag = null;
  dragoverlay.hideAll();
  setImmediate(() => {
    try {
      runDrop(d, drop, tear);
    } catch (err) {
      console.warn(`tabdrag: the drop failed (${err.message})`);
      try {
        deps.refocus(d.f);
      } catch {}
    }
  });
}

const PHASES = new Set(['arm', 'start', 'move', 'end', 'cancel']);

function onDrag(e, msg) {
  if (!deps || !msg || typeof msg !== 'object' || !PHASES.has(msg.phase) || (msg.kind !== 'tab' && msg.kind !== 'pane')) return;
  if (!Number.isInteger(msg.seq)) return;
  if (msg.phase === 'arm') return void warm();
  if (msg.phase === 'start') {
    if (msg.kind === 'tab' && !Number.isInteger(msg.i)) return;
    try {
      startDrag(e, msg);
    } catch (err) {
      console.warn(`tabdrag: the drag could not start (${err.message})`);
      if (drag) finish(drag, { notify: true });
    }
    return;
  }
  const d = drag;
  if (!d || d.wcId !== e.sender.id || d.seq !== msg.seq || d.kind !== msg.kind) return;
  try {
    if (msg.phase === 'move') update(d);
    else if (msg.phase === 'end') endDrag(d);
    else finish(d, { notify: false });
  } catch (err) {
    console.warn(`tabdrag: the drag failed (${err.message})`);
    finish(d, { notify: true });
  }
}

// --- window drags (native title-bar moves, win32 only) ------------------------------------------------------------------------

function freshHeader() {
  return { hover: null, since: 0, candidate: null };
}

function freshDwell() {
  return { pane: null, since: 0, lastP: null, lastAt: 0, spot: null, armP: null, byShift: false };
}

function sameSize(b, size) {
  return Math.abs(b.width - size.width) <= 1 && Math.abs(b.height - size.height) <= 1;
}

// A drag only counts when the window kept its size and its origin travelled more than MOVE_MIN: a click or a resize never merges.
function movedFar(w) {
  if (w.f.win.isDestroyed()) return false;
  const b = w.f.win.getBounds();
  return sameSize(b, w.size) && Math.hypot(b.x - w.origin.x, b.y - w.origin.y) > g.MOVE_MIN;
}

function endWindowDrag(w) {
  if (wdrag !== w) return;
  wdrag = null;
  clearInterval(w.timer);
  dragoverlay.hideAll();
}

function clearWindowPreviews(w) {
  if (w.headerShown || w.dwellShown) dragoverlay.zone(null);
  w.headerShown = false;
  w.dwellShown = false;
  w.hst = freshHeader();
  w.st = freshDwell();
}

function pollKeys(w) {
  if (w.keysBusy || typeof deps.desk.keys !== 'function' || !deps.desk.available()) return;
  w.keysBusy = true;
  Promise.resolve(deps.desk.keys())
    .then((k) => {
      w.keysBusy = false;
      if (!k || wdrag !== w) return;
      w.shift = !!k.shift;
      // Windows puts the window back on Esc, so the merge is off for the rest of this drag (the Mac keeps moving it instead).
      if (k.esc) w.cancelled = true;
    })
    .catch(() => {
      w.keysBusy = false;
    });
}

function tick(w) {
  if (wdrag !== w) return;
  if (!live(w.f)) return endWindowDrag(w);
  pollKeys(w);
  if (w.cancelled || !movedFar(w)) return clearWindowPreviews(w);
  const now = Date.now();
  const p = screen.getCursorScreenPoint();
  const skip = overlayHwnds();
  skip.add(hwndOf(w.f.win));
  const top = frameAt(p, w.snapshot, skip, w.f);
  const view = top ? viewOf(top) : null;
  const ok = view && view.accepts;

  const headerKey = ok && g.inHeader(view, p) ? top : null;
  const hs = g.headerStep(w.hst, headerKey, now);
  w.hst = hs.hst;
  if (hs.show) {
    const mark = g.incomingMark(view, view.tabs);
    dragoverlay.zone(view.key.win, mark.rect, { marker: mark.marker });
    w.headerShown = true;
    w.dwellShown = false;
  } else if (hs.hide) {
    dragoverlay.zone(null);
    w.headerShown = false;
  }

  let hit = null;
  if (ok && !headerKey) {
    const t = g.paneTargetAt(view, p);
    if (t) hit = { key: top, id: t.id, edge: t.edge, rect: t.rect, crect: view.rects.get(t.id) };
  }
  const ds = g.dwellStep(w.st, hit, p, now, w.shift);
  w.st = ds.st;
  if (ds.show) {
    const s = ds.show;
    dragoverlay.zone(s.key.win, s.edge ? g.halfRect(s.crect, s.edge) : s.crect, { animated: true });
    w.dwellShown = true;
    w.headerShown = false;
  } else if (ds.hide && !w.headerShown) {
    dragoverlay.zone(null);
    w.dwellShown = false;
  }
}

function startWindowDrag(f, newBounds) {
  if (drag) return; // a chip or strip drag is the one that owns the overlays
  if (wdrag) {
    if (wdrag.f === f) return;
    endWindowDrag(wdrag);
  }
  const w = {
    f,
    origin: f.win.getBounds(),
    size: { width: newBounds.width, height: newBounds.height },
    timer: null,
    snapshot: null,
    hst: freshHeader(),
    st: freshDwell(),
    shift: false,
    cancelled: false,
    keysBusy: false,
    headerShown: false,
    dwellShown: false,
  };
  wdrag = w;
  warm();
  snapshotFor(
    () => wdrag === w,
    (list) => {
      w.snapshot = list;
    }
  );
  w.timer = setInterval(() => {
    try {
      tick(w);
    } catch (err) {
      console.warn(`tabdrag: the window drag failed (${err.message})`);
      endWindowDrag(w);
    }
  }, g.TICK_MS);
}

// The end of the native move loop: a merge only when a mark or a preview shows and the window really was dragged.
function finishWindowDrag(f) {
  const w = wdrag;
  if (!w || w.f !== f) return;
  const ok = !w.cancelled && movedFar(w);
  let act = null;
  const spot = w.st.spot;
  if (ok && spot && showing(spot.key)) {
    act = spot.edge ? () => deps.ops.mergeSplit(f, spot.key, spot.id, spot.edge) : () => deps.ops.mergeFrame(f, spot.key);
  } else if (ok && w.hst.candidate && showing(w.hst.candidate)) {
    const target = w.hst.candidate;
    act = () => deps.ops.mergeFrame(f, target);
  }
  endWindowDrag(w);
  // The merge may destroy the window whose 'moved' handler is running, so it waits a turn (the Mac defers too).
  if (act) {
    setTimeout(() => {
      try {
        if (live(f)) act();
      } catch (err) {
        console.warn(`tabdrag: the merge failed (${err.message})`);
      }
    }, 0);
  }
}

// --- public -------------------------------------------------------------------------------------------------------------------

function init(d) {
  deps = d;
  dragoverlay.init({ webPrefs: d.webPrefs, bootFor: d.bootFor, pagesDir: d.pagesDir });
  ipcMain.on('term:drag', onDrag);
}

// Called once per new frame; only adds listeners, never takes anyone else's off.
function watchFrame(f) {
  if (!deps) return;
  f.win.on('focus', () => focusOrder.set(f, ++focusSeq));
  f.win.on('closed', () => {
    if (drag && (drag.f === f || (drag.drop && drag.drop.to === f))) finish(drag, { notify: drag.f !== f });
  });
  if (WIN) {
    f.win.on('will-move', (e, newBounds) => {
      if (newBounds && Number.isFinite(newBounds.width) && Number.isFinite(newBounds.height)) startWindowDrag(f, newBounds);
    });
    f.win.on('moved', () => finishWindowDrag(f));
    const end = () => {
      if (wdrag && wdrag.f === f) endWindowDrag(wdrag);
    };
    f.win.on('hide', end);
    f.win.on('minimize', end);
    f.win.on('closed', end);
  }
  // The helper takes seconds to compile, so it starts once there is a second window to drag between, before the first drag.
  if (deps.frames.size >= 2 && !deskTimer) {
    deskTimer = setTimeout(() => {
      try {
        deps.desk.start();
      } catch {}
    }, 3000);
  }
}

// Cancels a chip or strip drag (Esc); window drags are cancelled by Windows itself. True when there was one.
function cancel() {
  if (!drag) return false;
  finish(drag, { notify: true });
  return true;
}

function active() {
  return !!(drag || wdrag);
}

function warm() {
  if (!deps) return;
  try {
    dragoverlay.warm();
    deps.desk.start();
  } catch {}
}

module.exports = { init, watchFrame, cancel, active, warm };
