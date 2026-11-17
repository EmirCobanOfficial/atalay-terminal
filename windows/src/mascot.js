'use strict';
// Viktoria, the roaming anime mascot (the Mac's Mascot.swift), with her own on/off switch (View > Show Viktoria, Settings >
// Appearance): a transparent window that covers the work area of the display she is on, stays on top whatever has focus,
// walks on other apps' windows and on the dashboard's own surfaces, steps onto neighbouring displays, and passes clicks
// through everywhere except her hit rectangle. Her page is the Mac's own (web/mascot.html, mascot/mascot.js), unchanged;
// this file is its native side. The window list and the cursor warp come from deskhelper.js.
//
// Units: the overlay sits on a display's work area in DIPs (Electron's). Her page is in CSS px, DIP / z where z is the
// overlay page's zoom (she has a session of her own, so the dashboard's text size no longer reaches her; zoom() is still
// read, and she is never zoomed by us, her coordinates are scaled instead). A panel px is (DIP - work area origin) / z.
//
// What she may do to the app is small and checked here, since her page is the only thing that talks to this side:
// - her window can load her own page only (will-navigate, will-redirect, no new windows);
// - every number from her is checked (finite, her hit rect at most 300 x 520, the cursor hold at most 3 s);
// - she hides idle terminals only, after the keys are parked somewhere harmless (never ends a session);
// - the cursor is held for 3 s at most, 30 s apart, only after the user's own click in the app while it is in front, and
//   given back at the first mouse button, a focus change, the lock screen, switching her off and quitting.
// No window titles and no process names are ever read or sent to her page.
const path = require('path');
const { fileURLToPath } = require('url');
const { createDesk } = require('./deskhelper');
const { session } = require('electron');

// Her overlay's own session (kept on disk, so her localStorage survives restarts): viktoria://pak is served there and nowhere else.
const PARTITION = 'persist:viktoria';

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const intersects = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const inside = (b, p) => p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height;
// The close button of a terminal's frame: 46 DIP wide, as Windows draws it.
const CLOSE_W = 46;

// A window's HWND as a number (Electron hands it as a little-endian buffer).
function handleOf(w) {
  try {
    const b = w.getNativeWindowHandle();
    return b.length >= 8 ? Number(b.readBigUInt64LE(0)) : b.readUInt32LE(0);
  } catch {
    return 0;
  }
}

function fileLine(text) {
  const m = /[A-Za-z0-9_.-]+\.[A-Za-z0-9]+:\d+/.exec(String(text || ''));
  return m ? m[0] : null;
}

// x-ranges of [x0, x1] left uncovered by the rects `occ` ({ x, y, w, h }) that span height y.
function visibleSegments(x0, x1, y, occ) {
  let segs = [[x0, x1]];
  for (const r of occ) {
    if (!(r.y <= y && y < r.y + r.h)) continue;
    const a = r.x, b = r.x + r.w, next = [];
    for (const s of segs) {
      if (b <= s[0] || a >= s[1]) {
        next.push(s);
        continue;
      }
      if (a > s[0]) next.push([s[0], a]);
      if (b < s[1]) next.push([b, s[1]]);
    }
    segs = next;
  }
  return segs;
}

/**
 * Options: BrowserWindow, screen, WEB (the web folder), webPrefs() (the app's usual preferences), checkPages() (the
 * release's guard), settings, defaultEnabled, defaultMischief, run(win, js), dash() / dashView() / chatsView(),
 * terminals() (the visible terminal windows: [{ id, sid, canClose, status, win }]), inFront() (one of the app's windows
 * has the keys), openView(v), navTap(id), closeTerminal(id) and hideTerminal(id) (true unless the keys couldn't be
 * parked), onSwitch() (her switch changed).
 */
function createMascot(o) {
  const { BrowserWindow, screen, settings } = o;
  const desk = createDesk();
  const PAGE = path.resolve(o.WEB, 'mascot.html');

  let win = null, loaded = false, shown = false, stopped = false, asleep = false, wasFront = false;
  let panelB = null; // the rectangle the overlay sits on (a work area), in DIPs
  let currentId = null; // the display she is on
  let appliedKey = '', lastScale = 0, lastZ = 1;
  let hitRect = null, ignoring = true, isDragging = false, dragCrossed = false, dragCrossedAt = 0;
  let wins = [], winsOk = false, polling = false; // other windows on screen, front to back: { hwnd, own, rect (DIP) }
  let overlayHwnd = 0;
  let lastStatus = new Map(), lastTerminalsJSON = '', lastPlatformsJSON = '', lastIdleSent = -1, hasAppearedOnce = false;
  let rawPanels = [], rawNav = [], sideRects = [];
  let pollT = null, hitT = null, dragT = null, dcT = null;
  const lastTypingSent = new Map(), lastTypedAt = new Map();

  // ---------- her switch and her mischief (0 Calm, 1 Playful, 2 Naughty, 3 Crazy) ----------
  // What the user chose (the switch); on its own it doesn't bring her up: without the downloaded pak no overlay is made.
  const stored = () => {
    const v = settings.get('mascotEnabled');
    return typeof v === 'boolean' ? v : !!o.defaultEnabled;
  };
  // Whether she is up: switched on AND downloaded.
  const enabled = () => stored() && o.asset.isReady();
  const mischief = () => {
    const v = settings.get('mascotMischief');
    return clamp(typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : o.defaultMischief, 0, 3);
  };

  function setEnabled(on) {
    if (on === stored()) return;
    settings.set('mascotEnabled', on);
    releaseCursor();
    refresh();
    pushToPages();
    if (o.onSwitch) o.onSwitch();
  }

  function setMischief(level) {
    settings.set('mascotMischief', clamp(Math.round(level), 0, 3));
    sendEvent({ type: 'mischief', level: mischief() });
    pushToPages();
  }

  // The dashboard's pages (Settings' switch and Mischief block, the panels reporting in app.js) and the chats list's.
  function pushToPages() {
    const js = `window.__mascotEnabled = ${enabled()}; window.__mascotMischief = ${mischief()}; window.dispatchEvent(new Event('mascotchange'))`;
    for (const v of [o.dashView(), o.chatsView()]) o.run(v, js);
    pushAsset();
  }

  // The download's state (window.__mascotAsset = {state, got, total, reason}) and the 'mascotasset' event, on every change.
  function pushAsset() {
    const js = `window.__mascotAsset = ${o.asset.json()}; window.dispatchEvent(new Event('mascotasset'))`;
    for (const v of [o.dashView(), o.chatsView()]) o.run(v, js);
  }

  // The pak was downloaded, removed or found damaged ("ready" flipped), or only its progress moved.
  function assetChanged(readinessChanged) {
    if (readinessChanged) {
      releaseCursor();
      refresh();
      pushToPages();
      if (o.onSwitch) o.onSwitch();
    } else {
      pushAsset();
    }
  }

  // ---------- the overlay ----------
  const alive = () => !!win && !win.isDestroyed();
  const zoom = () => {
    try {
      const z = alive() ? win.webContents.getZoomFactor() : 1;
      return Number.isFinite(z) && z > 0.1 ? z : 1;
    } catch {
      return 1;
    }
  };
  const eval_ = (js) => o.run(win, js);
  const toLocal = (r) => {
    const z = zoom();
    return { x: (r.x - panelB.x) / z, y: (r.y - panelB.y) / z, w: r.width / z, h: r.height / z };
  };

  function sendEvent(obj) {
    if (!enabled() || !loaded || !alive()) return;
    eval_(`window.__mascot?.onEvent(${JSON.stringify(obj)})`);
  }
  const syncActive = () => alive() && eval_(`window.__mascot?.setActive(${shown && !asleep})`);

  // Only her own page may load in her window, the one file and nothing else.
  function ownPage(url) {
    try {
      return path.resolve(fileURLToPath(url)).toLowerCase() === PAGE.toLowerCase();
    } catch {
      return false;
    }
  }

  function ensureWindow() {
    if (alive() || stopped) return;
    o.asset.attach(session.fromPartition(PARTITION));
    const d = pickInitialDisplay();
    currentId = d.id;
    const wa = d.workArea;
    const w = new BrowserWindow({
      x: wa.x, y: wa.y, width: wa.width, height: wa.height,
      frame: false, transparent: true, backgroundColor: '#00000000', hasShadow: false, show: false,
      focusable: false, skipTaskbar: true, alwaysOnTop: true, resizable: false, movable: false, minimizable: false,
      maximizable: false, fullscreenable: false,
      // Her own session: viktoria://pak is registered there only (the other windows can't read the pak).
      webPreferences: { ...o.webPrefs(), partition: PARTITION },
    });
    win = w;
    loaded = false;
    overlayHwnd = handleOf(w);
    appliedKey = '';
    panelB = { x: wa.x, y: wa.y, width: wa.width, height: wa.height };
    ignoring = true;
    w.setIgnoreMouseEvents(true); // without `forward`: that would install a low-level mouse hook
    const wc = w.webContents;
    wc.on('will-navigate', (e, url) => !ownPage(url) && e.preventDefault());
    wc.on('will-redirect', (e, url) => !ownPage(url) && e.preventDefault());
    wc.on('will-frame-navigate', (e) => !ownPage(e.url) && e.preventDefault());
    wc.setWindowOpenHandler(() => ({ action: 'deny' }));
    // The mouse buttons are seen by her own window (no key or button is read from the system): a press gives the cursor back
    // at once, and a release ends a drag that crossed displays (her page may not get the release itself).
    wc.on('input-event', (_e, input) => {
      if (win !== w) return;
      if (input.type === 'mouseDown') releaseCursor();
      else if (input.type === 'mouseUp' && isDragging && dragCrossed) endCrossedDrag();
    });
    wc.on('did-finish-load', () => {
      if (win !== w) return;
      loaded = true;
      sendEvent({ type: 'mischief', level: mischief() });
      sendScreenInfo();
      syncActive();
      if (shown) {
        pollWindows();
        pushTerminalsNow();
        if (!hasAppearedOnce) {
          hasAppearedOnce = true;
          sendEvent({ type: 'appeared' });
        }
      }
    });
    // A crashed page starts over (the other pages do).
    wc.on('render-process-gone', () => {
      loaded = false;
      setTimeout(() => win === w && !w.isDestroyed() && wc.reload(), 800);
    });
    w.on('closed', () => {
      if (win !== w) return;
      win = null;
      loaded = false;
      shown = false;
      stopTimers();
    });
    o.checkPages();
    w.loadFile(PAGE).catch(() => {});
  }

  function tearDown() {
    releaseCursor();
    desk.stop();
    wins = [];
    winsOk = false;
    if (alive()) win.destroy();
    win = null;
    loaded = false;
    hitRect = null;
    lastStatus = new Map();
    lastTerminalsJSON = lastPlatformsJSON = '';
    lastIdleSent = -1;
  }

  // Switched off, the window and its page (three.js, the VRM, WebGL) are freed, not just hidden.
  function hideWindow() {
    releaseCursor();
    if (!enabled()) hasAppearedOnce = false;
    if (shown) {
      shown = false;
      if (alive()) win.hide();
      syncActive();
    }
    ignoring = true;
    if (alive()) win.setIgnoreMouseEvents(true);
    isDragging = false;
    stopTimers();
    if (!enabled()) tearDown();
  }

  function refresh() {
    if (stopped) return;
    if (!enabled()) return hideWindow();
    ensureWindow();
    if (!alive()) return;
    // First show, and every time she is switched on again: start on the dashboard's display.
    if (!shown) currentId = pickInitialDisplay().id;
    applyDisplay();
    if (shown) return;
    shown = true;
    desk.start();
    win.showInactive();
    syncActive();
    startTimers();
    pollWindows();
    pushTerminalsNow();
    if (loaded && !hasAppearedOnce) {
      hasAppearedOnce = true;
      sendEvent({ type: 'appeared' });
    }
  }

  // The dashboard moved, resized, minimized, ...: its surfaces and the visible windows change with it. A burst of events
  // (a window being dragged) is one update.
  function dashboardChanged() {
    if (dcT || stopped) return;
    dcT = setTimeout(() => {
      dcT = null;
      refresh();
      if (!shown) return;
      pollWindows();
      pushTerminalsNow();
    }, 60);
  }

  // ---------- displays ----------
  const displayById = (id) => screen.getAllDisplays().find((d) => d.id === id) || null;

  // Her first display: the dashboard's, if its window is visible; else the one under the cursor; else the main one.
  function pickInitialDisplay() {
    const d = o.dash();
    if (d && !d.isDestroyed() && d.isVisible() && !d.isMinimized()) return screen.getDisplayMatching(d.getBounds());
    return screen.getDisplayNearestPoint(screen.getCursorScreenPoint()) || screen.getPrimaryDisplay();
  }

  // Keeps the overlay exactly over the work area (no taskbar) of her display. True if it moved or changed size.
  function applyDisplay() {
    if (!alive()) return false;
    let d = displayById(currentId);
    if (!d) {
      d = pickInitialDisplay();
      currentId = d.id;
    }
    const wa = d.workArea, z = zoom();
    const key = `${wa.x},${wa.y},${wa.width},${wa.height},${z}`;
    const b = win.getBounds();
    const drift = Math.max(Math.abs(b.x - wa.x), Math.abs(b.y - wa.y), Math.abs(b.width - wa.width), Math.abs(b.height - wa.height));
    if (key === appliedKey && drift <= 8) return false;
    appliedKey = key;
    lastZ = z;
    panelB = { x: wa.x, y: wa.y, width: wa.width, height: wa.height };
    if (drift > 2) {
      win.setBounds(wa);
      // Windows can size a window wrongly on its first move between displays of different scale: again, once.
      if (lastScale && lastScale !== d.scaleFactor) win.setBounds(wa);
    }
    lastScale = d.scaleFactor;
    sendScreenInfo();
    return true;
  }

  // Displays that touch `d` on its left (dir -1) or right (dir +1) edge.
  function neighbours(d, dir) {
    return screen.getAllDisplays().filter((x) => {
      if (x.id === d.id) return false;
      const gap = dir < 0 ? x.bounds.x + x.bounds.width - d.bounds.x : x.bounds.x - (d.bounds.x + d.bounds.width);
      return Math.abs(gap) <= 2;
    });
  }

  // Vertical ranges (panel px, top-left origin) where a neighbour meets this display's left or right edge.
  function edgeRanges(d, dir) {
    const pf = d.workArea, z = zoom(), out = [];
    for (const n of neighbours(d, dir)) {
      const lo = Math.max(pf.y, n.bounds.y), hi = Math.min(pf.y + pf.height, n.bounds.y + n.bounds.height);
      if ((hi - lo) / z < 120) continue;
      out.push([Math.round((lo - pf.y) / z), Math.round((hi - pf.y) / z)]);
    }
    return out;
  }

  function sendScreenInfo() {
    if (!loaded || !panelB) return;
    const d = displayById(currentId);
    if (!d) return;
    const z = zoom();
    sendEvent({
      type: 'screen', w: Math.round(panelB.width / z), h: Math.round(panelB.height / z),
      edges: { left: edgeRanges(d, -1), right: edgeRanges(d, 1) },
    });
  }

  function moveTo(d) {
    currentId = d.id;
    lastPlatformsJSON = lastTerminalsJSON = '';
    appliedKey = '';
    applyDisplay();
  }

  // Her page asked to step past a left or right edge: the overlay goes to the neighbour and she is told where she arrives.
  function crossScreen(dir, y) {
    if (!shown || !alive() || !panelB || (dir !== -1 && dir !== 1)) return;
    const cur = displayById(currentId);
    if (!cur) return;
    const cands = neighbours(cur, dir);
    if (!cands.length) return;
    const z = zoom();
    const ay = panelB.y + y * z; // her feet, in DIPs
    const edge = (c) => ({ lo: c.workArea.y, hi: c.workArea.y + c.workArea.height });
    const dist = (c) => Math.abs(clamp(ay, edge(c).lo, edge(c).hi) - ay);
    const target = cands.find((c) => ay >= edge(c).lo && ay <= edge(c).hi) || cands.reduce((a, b) => (dist(b) < dist(a) ? b : a));
    const newY = (clamp(ay, edge(target).lo, edge(target).hi) - target.workArea.y) / z;
    moveTo(target);
    sendEvent({ type: 'arrive', dir, y: Math.round(newY) });
    pollWindows();
    pushTerminalsNow();
  }

  function onDisplaysChanged() {
    if (!enabled() || !alive()) return;
    if (!displayById(currentId)) {
      // Her display is gone: back to the main one.
      currentId = screen.getPrimaryDisplay().id;
      lastPlatformsJSON = lastTerminalsJSON = '';
    }
    appliedKey = '';
    applyDisplay();
    pollWindows();
    pushTerminalsNow();
  }

  // ---------- mouse: clicks pass through everywhere except her ----------
  function setIgnore(v) {
    if (ignoring === v || !alive()) return;
    ignoring = v;
    try {
      win.setIgnoreMouseEvents(v);
    } catch {}
  }

  // The hit test, 30 times a second: the cursor is over her (her rect, 8 px around it) or not.
  function updateHitTest() {
    if (!shown || !alive() || !panelB) return;
    // Held or held by the cursor hold: her window takes the clicks (a press ends the hold), whatever is under it.
    if (isDragging || cursorHeld) return setIgnore(false);
    if (!hitRect) return setIgnore(true);
    const c = screen.getCursorScreenPoint(), z = zoom();
    const x = (c.x - panelB.x) / z, y = (c.y - panelB.y) / z;
    setIgnore(!(x >= hitRect.x - 8 && x <= hitRect.x + hitRect.w + 8 && y >= hitRect.y - 8 && y <= hitRect.y + hitRect.h + 8));
  }

  // While she is held, the display under the cursor decides where the overlay is (60 times a second).
  function dragTick() {
    if (!isDragging || !shown || !alive()) return;
    const c = screen.getCursorScreenPoint();
    const d = screen.getDisplayNearestPoint(c);
    if (d && d.id !== currentId) {
      dragCrossed = true;
      dragCrossedAt = Date.now();
      moveTo(d);
      const z = zoom();
      sendEvent({ type: 'dragArrive', x: Math.round((c.x - panelB.x) / z), y: Math.round((c.y - panelB.y) / z) });
      pollWindows();
      pushTerminalsNow();
    }
    // The page may not get the button's release once the overlay moved under it: the window's own mouseUp ends the drag
    // (the input-event in ensureWindow), and so does a wait of 10 s without one.
    if (dragCrossed && Date.now() - dragCrossedAt > 10_000) endCrossedDrag();
  }

  // Fallback when her page may not have got the button's release after the overlay moved under it: drop her at the cursor.
  function endCrossedDrag() {
    if (!alive() || !panelB) return;
    const p = screen.getCursorScreenPoint(), z = zoom();
    dragCrossed = false;
    sendEvent({ type: 'dragEnd', x: Math.round((p.x - panelB.x) / z), y: Math.round((p.y - panelB.y) / z) });
  }

  // ---------- timers ----------
  function startTimers() {
    if (!pollT) {
      pollT = setInterval(() => {
        if (!shown || asleep) return;
        applyDisplay();
        // A change of her page's zoom: she hears of it.
        if (zoom() !== lastZ) {
          lastZ = zoom();
          lastPlatformsJSON = lastTerminalsJSON = '';
          sendScreenInfo();
        }
        pollWindows();
        pushTerminalsNow();
      }, 1000);
    }
    if (!hitT) hitT = setInterval(updateHitTest, 33);
    if (!dragT) dragT = setInterval(dragTick, 16);
  }

  function stopTimers() {
    for (const t of [pollT, hitT, dragT]) clearInterval(t);
    pollT = hitT = dragT = null;
    clearTimeout(dcT);
    dcT = null;
  }

  // ---------- windows on screen ----------
  async function pollWindows() {
    if (!shown || !alive() || polling) return;
    polling = true;
    let list = null;
    try {
      list = await desk.windows();
    } finally {
      polling = false;
    }
    if (!shown || !alive()) return;
    if (list) {
      const next = [];
      for (const w of list) {
        if (w.hwnd === overlayHwnd) continue;
        const own = w.pid === process.pid;
        // Only normal-level windows count, as on the Mac: nothing that sits on top of everything (the app's notices, her
        // own, another app's always-on-top window) is a place to stand or to hide behind.
        if (w.topmost) continue;
        let r = { x: w.l, y: w.t, width: w.r - w.l, height: w.b - w.t };
        try {
          r = screen.screenToDipRect(null, r);
        } catch {}
        if (r.width < 160 || r.height < 80) continue;
        next.push({ hwnd: w.hwnd, own, rect: r });
      }
      wins = next;
      winsOk = true;
    } else if (!desk.available()) {
      wins = [];
      winsOk = false;
    }
    refreshPlatforms();
  }

  // The local rects (panel px) of the other apps' windows in front of window `hwnd`, or null if it isn't on screen. Without a
  // window list (the helper can't run) nothing is known to be in front.
  function occluders(hwnd) {
    if (!winsOk) return [];
    const i = hwnd ? wins.findIndex((w) => w.hwnd === hwnd) : -1;
    if (i < 0) return null;
    return wins.slice(0, i).filter((w) => !w.own).map((w) => toLocal(w.rect));
  }

  function dashboardOnThisScreen() {
    const d = o.dash();
    return !!d && !d.isDestroyed() && alive() && d.isVisible() && !d.isMinimized() && intersects(d.getBounds(), win.getBounds());
  }

  // A page's origin on screen (DIPs): the dashboard's page or the chats list's, in the window's content.
  function viewOrigin(view) {
    const d = o.dash();
    if (!d || d.isDestroyed() || !view || view.webContents.isDestroyed()) return null;
    const c = d.getContentBounds(), b = view.getBounds();
    return { x: c.x + b.x, y: c.y + b.y, zoom: view.webContents.getZoomFactor() || 1 };
  }

  function updateWebPanels(panels, nav) {
    rawPanels = Array.isArray(panels) ? panels.slice(0, 64) : [];
    rawNav = Array.isArray(nav) ? nav.slice(0, 128) : [];
    refreshPlatforms();
  }

  function updateSidebarRects(rects) {
    const next = [];
    for (const r of Array.isArray(rects) ? rects.slice(0, 300) : []) {
      const x = num(r && r.x), y = num(r && r.y), w = num(r && r.w), h = num(r && r.h);
      if (typeof (r && r.id) !== 'string' || r.id.length > 400 || x == null || y == null || w == null || h == null) continue;
      next.push({ id: r.id, x, y, w, h });
    }
    if (JSON.stringify(next) === JSON.stringify(sideRects)) return;
    sideRects = next;
    refreshPlatforms();
  }

  function refreshPlatforms() {
    if (!enabled() || !loaded || !shown || !alive() || !panelB) return;
    const z = zoom();
    const W = panelB.width / z, H = panelB.height / z;
    const platforms = [], navTargets = [];

    function emit(id, x, y, w, h, occ, extra) {
      if (y < 0 || y > H) return;
      let k = 0;
      for (const s of visibleSegments(Math.max(0, x), Math.min(W, x + w), y, occ)) {
        if (s[1] - s[0] < 48) continue;
        platforms.push({ id: k === 0 ? id : `${id}#${k}`, x: Math.round(s[0]), y: Math.round(y), w: Math.round(s[1] - s[0]), h: Math.round(h), ...extra });
        k++;
      }
    }

    // 1. Other apps' windows: each one's top edge, minus what the windows in front of it cover (the app's own too).
    let count = 0;
    for (let i = 0; i < wins.length && count < 24; i++) {
      const w = wins[i];
      if (w.own || !intersects(w.rect, panelB)) continue;
      const occ = wins.slice(0, i).map((q) => toLocal(q.rect));
      const l = toLocal(w.rect);
      const before = platforms.length;
      const wid = `win:${w.hwnd}`;
      emit(wid, l.x, l.y, l.w, 0, occ, { wid, wx: Math.round(l.x), wy: Math.round(l.y) });
      if (platforms.length > before) count++;
    }

    // 2. The dashboard's own surfaces, only where the user can see them.
    const dash = o.dash();
    const occ = dashboardOnThisScreen() ? occluders(handleOf(dash)) : null;
    if (occ) {
      const covered = (x, y) => occ.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
      const dv = viewOrigin(o.dashView());
      if (dv) {
        const lx = (v) => (dv.x + v * dv.zoom - panelB.x) / z, ly = (v) => (dv.y + v * dv.zoom - panelB.y) / z, sc = dv.zoom / z;
        for (const p of rawPanels) {
          const x = num(p && p.x), y = num(p && p.y), w = num(p && p.w), h = num(p && p.h);
          if (x == null || y == null || w == null || h == null || w <= 0 || h <= 0) continue;
          emit(typeof p.id === 'string' ? p.id : '', lx(x), ly(y), w * sc, h * sc, occ);
        }
        // Tapping tabs and the like is for the app in front only: she never brings it forward from the background.
        if (o.inFront()) {
          for (const n of rawNav) {
            const x = num(n && n.x), y = num(n && n.y), w = num(n && n.w), h = num(n && n.h);
            if (!n || typeof n.id !== 'string' || !n.id || n.id.length > 200 || x == null || y == null || w == null || h == null || w <= 0 || h <= 0) continue;
            const nx = lx(x), ny = ly(y), nw = w * sc, nh = h * sc;
            if (covered(nx + nw / 2, ny + nh / 2)) continue;
            navTargets.push({ id: n.id, x: Math.round(nx), y: Math.round(ny), w: Math.round(nw), h: Math.round(nh) });
          }
        }
      }

      const cv = o.chatsView();
      const cb = cv && !cv.webContents.isDestroyed() && cv.getVisible() ? cv.getBounds() : null;
      const sv = cb && cb.width > 8 ? viewOrigin(cv) : null;
      if (sv) {
        const lx = (v) => (sv.x + v * sv.zoom - panelB.x) / z, ly = (v) => (sv.y + v * sv.zoom - panelB.y) / z, sc = sv.zoom / z;
        const scroll = sideRects.find((r) => r.id === '__scroll__');
        for (const r of sideRects) {
          if (r.id === '__scroll__' || r.w <= 8 || r.h <= 4) continue;
          const top = r.id === 'side:top';
          // What scrolled out of the list isn't there to stand on (the top strip is above it, not in it).
          if (scroll && !top && (r.y < scroll.y - 2 || r.y > scroll.y + scroll.h - 8)) continue;
          const rx = lx(r.x), ry = ly(r.y), rw = r.w * sc, rh = r.h * sc;
          emit(r.id, rx, ry, rw, rh, occ);
          if (o.inFront() && r.id.startsWith('side:') && r.id !== 'side:favorites' && !top && !covered(rx + rw / 2, ry + rh / 2)) {
            const key = r.id.slice(5);
            if (key) navTargets.push({ id: `fold:${key}`, x: Math.round(rx), y: Math.round(ry), w: Math.round(rw), h: Math.round(rh) });
          }
        }
      }
    }

    const json = JSON.stringify({ type: 'platforms', list: platforms, nav: navTargets });
    if (json === lastPlatformsJSON) return;
    lastPlatformsJSON = json;
    eval_(`window.__mascot?.onEvent(${json})`);
  }

  // The visible terminal windows, each with its title bar (and its close button when pressing it only hides the window):
  // the exact frame and z-order come from the window list, the app's own bounds when it has none.
  function pushTerminalsNow() {
    if (!enabled() || !loaded || !shown || !alive() || !panelB) return;
    const z = zoom();
    const W = panelB.width / z, H = panelB.height / z;
    const list = [];
    if (dashboardOnThisScreen()) {
      const dashOcc = occluders(handleOf(o.dash()));
      for (const t of o.terminals()) {
        if (!t.win || t.win.isDestroyed()) continue;
        const hwnd = handleOf(t.win);
        const entry = winsOk ? wins.find((w) => w.hwnd === hwnd) : null;
        const rect = entry ? entry.rect : t.win.getBounds();
        const l = toLocal(rect);
        const mid = l.x + l.w / 2;
        if (mid < 0 || mid > W || l.y < -40 || l.y > H) continue;
        // The terminal's own window, else the dashboard's: the windows of other apps in front of it hide its title bar.
        const occ = occluders(hwnd) || dashOcc;
        if (!occ) continue;
        const segs = visibleSegments(l.x, l.x + l.w, l.y + 6, occ);
        const best = segs.reduce((a, b) => (!a || b[1] - b[0] > a[1] - a[0] ? b : a), null);
        if (!best || best[1] - best[0] < 60) continue;
        const item = {
          id: t.id, sid: t.sid, canClose: !!t.canClose, status: t.status,
          x: Math.round(best[0]), y: Math.round(l.y), w: Math.round(best[1] - best[0]), h: Math.round(l.h),
        };
        if (t.canClose) {
          const c = t.win.getContentBounds();
          const cap = clamp(c.y - rect.y, 24, 48);
          const cl = toLocal({ x: c.x + c.width - CLOSE_W, y: rect.y, width: CLOSE_W, height: cap });
          item.close = { x: Math.round(cl.x), y: Math.round(cl.y), w: Math.round(cl.w), h: Math.round(cl.h) };
        }
        list.push(item);
      }
    }
    const json = JSON.stringify({ type: 'terminals', list });
    if (json === lastTerminalsJSON) return;
    lastTerminalsJSON = json;
    eval_(`window.__mascot?.onEvent(${json})`);
  }

  // ---------- sulking at the cursor (the theme chooser, Settings > Appearance where her switch lives) ----------
  let cursorHeld = false, holdGen = 0, holdStarting = false;
  let holdT = null, holdLimitT = null, streamT = null;
  let lastHoldAt = 0, lastSulkAt = 0;
  let holdTarget = { x: 0, y: 0 }; // her hand, panel px: where the cursor is kept

  // The user opened the theme chooser or Settings > Appearance (a real click, not her own): by the mischief level's odds
  // she runs to the cursor.
  function onThemeChooserOpened() {
    if (!enabled() || !loaded || !shown || !o.inFront() || asleep || cursorHeld || !alive() || !panelB) return;
    const odds = [0, 0.3, 0.6, 1][mischief()];
    if (!(odds > 0) || Math.random() >= odds) return;
    const now = Date.now();
    if (now - lastHoldAt < 30_000 || now - lastSulkAt < 30_000) return;
    const c = screen.getCursorScreenPoint();
    if (!inside(panelB, c)) return; // only when the cursor is on her display
    lastSulkAt = now;
    startCursorStream();
    const z = zoom();
    sendEvent({ type: 'grabCursor', x: Math.round((c.x - panelB.x) / z), y: Math.round((c.y - panelB.y) / z) });
  }

  // While she sulks (before the hold) the cursor's position goes to her 30 times a second, so the leap can steer.
  function startCursorStream() {
    clearInterval(streamT);
    streamT = setInterval(() => {
      if (!alive() || !shown || cursorHeld || Date.now() - lastSulkAt > 6000 || !panelB) {
        clearInterval(streamT);
        streamT = null;
        return;
      }
      const c = screen.getCursorScreenPoint(), z = zoom();
      sendEvent({ type: 'cursorAt', x: Math.round((c.x - panelB.x) / z), y: Math.round((c.y - panelB.y) / z) });
    }, 33);
  }

  // Panel px to physical screen px, null outside the overlay or where Windows can't convert.
  function physicalPoint(x, y) {
    if (!panelB || process.platform !== 'win32') return null;
    const z = zoom();
    const p = { x: Math.round(panelB.x + x * z), y: Math.round(panelB.y + y * z) };
    if (!inside(panelB, p)) return null;
    try {
      return screen.dipToScreenPoint(p);
    } catch {
      return null;
    }
  }

  // She reached the cursor: it is kept at her hand for 1 to 3 s by moving it there ~60 times a second; the system cursor
  // is never frozen, so nothing stays stuck if the app dies. Never past 3 s, only while one of the app's windows is in
  // front (the helper checks it with every move), and a mouse press on her window ends it.
  async function beginCursorHold(handX, handY, ms) {
    if (!enabled() || !shown || !o.inFront() || asleep || cursorHeld || holdStarting || appButton || !desk.available()) return;
    const now = Date.now();
    if (now - lastSulkAt > 6000 || now - lastHoldAt < 30_000) return; // a stale request is dropped
    const first = physicalPoint(handX, handY);
    if (!first) return;
    const gen = holdGen;
    holdStarting = true;
    let r = null;
    try {
      r = await desk.hold(first, process.pid);
    } finally {
      holdStarting = false;
    }
    // Released, switched off or defocused while the helper answered: it stays released.
    if (r !== 'ok' || gen !== holdGen || !enabled() || !shown || !o.inFront() || asleep || appButton) return;
    lastHoldAt = now;
    cursorHeld = true;
    setIgnore(false); // her window takes a click now: that click is what gives the cursor back
    clearInterval(streamT);
    streamT = null;
    holdTarget = { x: handX, y: handY };
    const duration = clamp(ms / 1000, 1, 3) * 1000;
    clearInterval(holdT);
    holdT = setInterval(() => {
      if (!cursorHeld || gen !== holdGen) return;
      if (Date.now() - now >= duration) return releaseCursor();
      const t = physicalPoint(holdTarget.x, holdTarget.y);
      if (!t) return;
      // The cursor stays on her hand (it dangles, so the target moves a little); another app in front gives it back.
      desk.hold(t, process.pid).then((a) => a === 'away' && gen === holdGen && releaseCursor());
    }, 16);
    // A second, independent hard limit.
    clearTimeout(holdLimitT);
    holdLimitT = setTimeout(releaseCursor, 3000);
  }

  // A mouse button is down in one of the app's own windows (selecting text, an HTML drag, a window dragged by its title
  // bar or edge), told by main.js from the pages' input events and the windows' move and resize events: no hold starts then
  // and a running one ends, as the Mac's "never move a cursor that is dragging something". Cleared by the release, the
  // end of a move or resize, a focus change, or after 5 s whatever happens (a release that never came).
  let appButton = false, appButtonT = null;
  function appMouse(down) {
    clearTimeout(appButtonT);
    appButtonT = null;
    appButton = down === true;
    if (!appButton) return;
    releaseCursor();
    appButtonT = setTimeout(() => (appButton = false), 5000);
  }

  // Gives the real cursor back. Safe to call any time, any number of times.
  function releaseCursor() {
    holdGen++;
    clearInterval(holdT);
    holdT = null;
    clearTimeout(holdLimitT);
    holdLimitT = null;
    clearInterval(streamT);
    streamT = null;
    cursorHeld = false;
    updateHitTest();
  }

  // ---------- her page's messages ----------
  function handle(body) {
    if (!body || typeof body !== 'object' || typeof body.type !== 'string') return true;
    // Her actions on the app (views, taps, closing terminals) stop the moment she is switched off or hidden.
    if (['openView', 'navTap', 'closeTerminal', 'hideTerminal'].includes(body.type) && (!enabled() || !shown)) return true;
    switch (body.type) {
      // Her page couldn't read the pak: it is deleted and the user can download it again.
      case 'loadFailed':
        o.asset.loadFailed();
        return true;
      case 'hitRect': {
        const r = body.rect;
        const x = num(r && r.x), y = num(r && r.y), w = num(r && r.w), h = num(r && r.h);
        if (x != null && y != null && w != null && h != null && panelB) {
          // Her drawn size is about 136 x 256 px: never accept more than ~2x that, and keep the origin on the overlay.
          const z = zoom();
          hitRect = { x: clamp(x, 0, panelB.width / z), y: clamp(y, 0, panelB.height / z), w: clamp(w, 0, 300), h: clamp(h, 0, 520) };
        } else {
          hitRect = null;
        }
        updateHitTest();
        return true;
      }
      case 'dragging':
        isDragging = body.on === true;
        dragCrossed = false;
        updateHitTest();
        return true;
      case 'crossScreen': {
        const dir = num(body.dir), y = num(body.y);
        if (dir != null && y != null) crossScreen(dir, y);
        return true;
      }
      // Her mischief in the app never brings it forward or takes focus from another app.
      case 'openView':
        // Going back to the dashboard view undoes her mischief and activates nothing: allowed in the background.
        if (typeof body.view === 'string' && (o.inFront() || body.view === 'dash')) o.openView(body.view);
        return true;
      case 'navTap':
        // Closing the Settings she opened is allowed in the background (it activates nothing).
        if (typeof body.id === 'string' && (o.inFront() || body.id === 'settings:close')) o.navTap(body.id);
        return true;
      case 'closeTerminal': {
        // She pressed the terminal's close button (which only hides the window); with the app in front only.
        const id = body.id;
        if (typeof id !== 'string' || !id) return true;
        // Not while the user is still typing there (stray keys must not land elsewhere): she keeps waiting at the button
        // and asks again; no answer until it is quiet for 1.2 s.
        if (o.inFront() && Date.now() - (lastTypedAt.get(id) || 0) < 1200) return true;
        // Keyboard focus couldn't be parked: nothing was closed and no reply is sent, so she keeps waiting and asks again.
        if (o.inFront() && o.closeTerminal(id) === false) return true;
        sendEvent({ type: 'closeDone', id });
        return true;
      }
      case 'grabReady': {
        const x = num(body.x), y = num(body.y);
        if (x == null || y == null) return true;
        const ms = num(body.ms);
        beginCursorHold(x, y, ms == null ? 2500 : clamp(ms, 0, 10_000));
        return true;
      }
      case 'grabHand': {
        const x = num(body.x), y = num(body.y);
        if (cursorHeld && x != null && y != null) holdTarget = { x, y };
        return true;
      }
      case 'hideTerminal':
        if (o.inFront() && typeof body.id === 'string') o.hideTerminal(body.id);
        return true;
      default:
        return true;
    }
  }

  // ---------- events from the app's parts ----------
  function updateSessions(list) {
    for (const b of Array.isArray(list) ? list : []) {
      if (!b || typeof b.sessionId !== 'string') continue;
      const prev = lastStatus.get(b.sessionId);
      if (prev !== undefined && prev !== b.status) {
        if (b.status === 'waiting' || (b.status === 'idle' && (prev === 'busy' || prev === 'waiting')) || b.status === 'failed') {
          sendEvent({ type: 'sessionStatus', sid: b.sessionId, status: b.status, prev });
        }
      }
      lastStatus.set(b.sessionId, b.status);
    }
    pushTerminalsNow();
  }

  // The engine's events (the dashboard's `events`), as JSON text: a failed tool result, or an error line.
  function onEvents(json) {
    if (!enabled() || !loaded) return;
    let list;
    try {
      list = JSON.parse(json);
    } catch {
      return;
    }
    for (const e of Array.isArray(list) ? list : []) {
      if (!e) continue;
      if (e.k === 'result' && typeof e.ok === 'boolean') {
        const p = { type: 'toolResult', sid: String(e.s || ''), ok: e.ok };
        const loc = e.ok ? null : fileLine(e.d) || fileLine(e.m);
        if (loc) p.loc = loc;
        sendEvent(p);
      } else if (e.k === 'sys' && (e.err === true || /err/i.test(String(e.l || '')))) {
        const p = { type: 'sysErr', sid: String(e.s || '') };
        const loc = fileLine(e.l);
        if (loc) p.loc = loc;
        sendEvent(p);
      }
    }
  }

  function onSocial(text) {
    if (!enabled() || !loaded) return;
    let ev;
    try {
      ev = JSON.parse(text);
    } catch {
      return;
    }
    if (!ev || typeof ev.type !== 'string') return;
    if (ev.type === 'xp' && (ev.levelUp === true || ev.rankUp === true)) sendEvent({ type: 'levelup', level: ev.level || 0 });
    else if (ev.type === 'badge' || ev.type === 'badge_unlock') sendEvent({ type: 'badge' });
  }

  // The user typed into a terminal: at most once per ~2 s per chat, she hears about it.
  function onTyping(chatId) {
    if (typeof chatId !== 'string' || !chatId) return;
    lastTypedAt.set(chatId, Date.now());
    if (!enabled() || !loaded || !shown || mischief() <= 0) return;
    const now = Date.now();
    if (now - (lastTypingSent.get(chatId) || 0) < 2000) return;
    lastTypingSent.set(chatId, now);
    sendEvent({ type: 'typing', id: chatId });
  }

  function updateIdle(seconds) {
    if (!enabled() || !loaded || !Number.isFinite(seconds)) return;
    if (Math.abs(seconds - lastIdleSent) < 1.5 && !(lastIdleSent >= 2 && seconds < 2)) return;
    lastIdleSent = seconds;
    sendEvent({ type: 'idle', seconds });
  }

  // One of the app's windows got or lost the keys. Coming back to the app greets; leaving it gives the cursor back.
  function focusChanged() {
    const front = o.inFront();
    if (!front) releaseCursor();
    if (!front) appMouse(false);
    dashboardChanged();
    if (front && !wasFront && enabled() && loaded && shown) sendEvent({ type: 'appActive' });
    wasFront = front;
  }

  // The lock screen and suspend stand in for the Mac's display sleep.
  // Locked and suspended are told apart: she wakes only when neither is on (a resume can come while still locked).
  let locked = false, suspended = false;
  function setAsleep(kind, on) {
    if (kind === 'lock') locked = on === true;
    else suspended = on === true;
    asleep = locked || suspended;
    if (asleep) {
      releaseCursor();
      lastSulkAt = 0;
    }
    syncActive();
  }

  function stop() {
    stopped = true;
    releaseCursor();
    stopTimers();
    desk.stop();
    shown = false;
    if (alive()) win.destroy();
    win = null;
  }

  return {
    enabled, stored, setEnabled, mischief, setMischief, pushToPages, pushAsset, assetChanged, refresh, stop, appMouse,
    has: (wc) => alive() && win.webContents === wc,
    handle, dashboardChanged, terminalsChanged: dashboardChanged, onDisplaysChanged, focusChanged, setAsleep,
    onThemeChooserOpened, updateWebPanels, updateSidebarRects, updateSessions, onEvents, onSocial, onTyping, updateIdle,
  };
}

module.exports = { createMascot };
