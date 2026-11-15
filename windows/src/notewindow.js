'use strict';
// A note out of the dashboard in a window of its own (web/note.html, which runs notes.js for that one note), one window
// per note, as the Mac's NoteWindow.swift. Unpinned, it rides above the dashboard as its child, like the terminals and
// chats; pinned ("Keep on top"), it leaves the dashboard and floats above every app. The dashboard's page stays the only
// one that writes the notes: this window's page sends its note here and it goes on to the dashboard's `Notes.fromWindow`,
// so a note window never gets the `notes` or `cloud` handlers (main.js refuses them). Each note's place and pin are kept
// (`noteWindows` in the settings), and the notes still out when the app quits come back at the next launch.
const path = require('path');

const KEY = 'noteWindows';
const NAME = /^[A-Za-z0-9-]{1,100}$/;
const FLUSH = 'return window.Notes && Notes.flush ? await Notes.flush() : true';

function createNoteWindows({ BrowserWindow, screen, dialog, WEB, settings, webPrefs, bootFor, checkPages, ownerView, getDash, pin, uiScale, streamerOn, quitting, bg }) {
  const open = new Map(); // note id -> its window's record
  let restored = false;
  let watching = false;

  const dashPage = () => {
    const v = ownerView();
    return v && v.webContents && !v.webContents.isDestroyed() ? v.webContents : null;
  };
  const dashWin = () => {
    const d = getDash();
    return d && !d.isDestroyed() ? d : null;
  };

  // The dashboard's page runs `body` (an async function body) with the named args; its JSON result, null on any failure.
  async function callNotes(body, args = {}) {
    const wc = dashPage();
    if (!wc) return null;
    const names = Object.keys(args);
    try {
      return await wc.executeJavaScript(`(async (${names.join(', ')}) => {${body}})(${names.map((n) => JSON.stringify(args[n])).join(', ')})`);
    } catch (e) {
      console.error('dashboard page: notes call failed:', e.message);
      return null;
    }
  }

  // ---------- where it goes, kept ----------
  const entries = () => {
    const e = settings.get(KEY);
    return e && typeof e === 'object' ? e : {};
  };
  function update(id, change) {
    const all = { ...entries() };
    const e = { ...(all[id] || {}) };
    change(e);
    all[id] = e;
    settings.set(KEY, all);
  }
  function forget(id) {
    const all = { ...entries() };
    if (delete all[id]) settings.set(KEY, all);
  }

  // All of it on the display it's mostly on (else the dashboard's), cut to fit only where that display is smaller.
  function fit(r) {
    const displays = screen.getAllDisplays();
    const overlap = (d) => {
      const a = d.workArea;
      const w = Math.min(a.x + a.width, r.x + r.width) - Math.max(a.x, r.x);
      const h = Math.min(a.y + a.height, r.y + r.height) - Math.max(a.y, r.y);
      return w > 0 && h > 0 ? w * h : 0;
    };
    let best = displays[0];
    for (const d of displays) if (overlap(d) > overlap(best)) best = d;
    const dw = dashWin();
    if (!overlap(best) && dw) best = screen.getDisplayMatching(dw.getBounds());
    const a = best.workArea;
    const width = Math.min(Math.max(r.width, 280), a.width), height = Math.min(Math.max(r.height, 160), a.height);
    return {
      x: Math.round(Math.min(Math.max(r.x, a.x), a.x + a.width - width)),
      y: Math.round(Math.min(Math.max(r.y, a.y), a.y + a.height - height)),
      width: Math.round(width), height: Math.round(height),
    };
  }

  // Where it was left, else 560x440 over the middle of the dashboard (a third down), each one more out cascading.
  function startFrame(saved) {
    if (saved && [saved.x, saved.y, saved.width, saved.height].every(Number.isFinite) && saved.width >= 100 && saved.height >= 100) return fit(saved);
    const size = { width: 560, height: 440 };
    const dw = dashWin();
    const area = dw && dw.isVisible() ? dw.getBounds() : screen.getPrimaryDisplay().workArea;
    const step = (open.size % 8) * 28;
    const top = area.y + Math.max(0, area.height - size.height) / 3;
    return fit({ x: area.x + (area.width - size.width) / 2 + step, y: top + step, ...size });
  }

  function watchScreens() {
    if (watching) return;
    watching = true;
    for (const ev of ['display-added', 'display-removed', 'display-metrics-changed']) {
      screen.on(ev, () => {
        for (const n of open.values()) if (!n.win.isDestroyed() && n.win.isVisible()) n.win.setBounds(fit(n.win.getBounds()));
      });
    }
  }

  // ---------- one window ----------
  function make(id) {
    const saved = entries()[id] || {};
    const n = {
      id, onTop: saved.onTop === true, steppedAside: false, closing: false, finished: false, loaded: false,
      pendingFocus: null, reopen: false, dragFrom: null, win: null,
    };
    const frame = startFrame(saved.frame);
    const win = new BrowserWindow({
      // Opaque: Electron leaves WS_THICKFRAME off a transparent frameless window on Windows, so that one can't be resized.
      ...frame, minWidth: 280, minHeight: 160, frame: false, transparent: false, resizable: true, show: false,
      hasShadow: true, backgroundColor: (bg && bg()) || '#000000', title: 'Note', autoHideMenuBar: true, minimizable: false, maximizable: false,
      fullscreenable: false, skipTaskbar: false, webPreferences: webPrefs(),
    });
    n.win = win;
    bootFor(win.webContents, { noteWindow: { id, onTop: n.onTop, streamer: streamerOn() } });
    win.setMenuBarVisibility(false);
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('did-finish-load', () => !win.isDestroyed() && win.webContents.setZoomFactor(uiScale()));
    // Its page's process died: loaded again, it asks the dashboard for its note anew.
    win.webContents.on('render-process-gone', () => setTimeout(() => !n.finished && !win.isDestroyed() && win.webContents.reload(), 500));
    // Its × in the system menu or Ctrl+W (the app menu's Close Window): closed as the page's × does, what was typed kept.
    win.on('close', (e) => {
      // Quitting closes it as it is, still marked open: it comes back at the next launch.
      if (n.finished || quitting()) return;
      e.preventDefault();
      close(n, true);
    });
    win.on('focus', () => !n.onTop && !n.steppedAside && attach(n));
    win.on('resized', () => remember(n));
    win.on('moved', () => remember(n));
    watchScreens();
    checkPages();
    win.loadFile(path.join(WEB, 'note.html'));
    open.set(id, n);
    return n;
  }

  const remember = (n) => !n.finished && !n.win.isDestroyed() && update(n.id, (e) => { e.frame = n.win.getBounds(); });

  // Above the dashboard as its child, when the dashboard is on screen (main.js's pin: not while a menu is open).
  function attach(n) {
    if (n.onTop || n.steppedAside || n.closing || n.win.isDestroyed()) return;
    pin(n.win);
  }

  function applyOnTop(n) {
    const win = n.win;
    if (n.onTop) {
      win.setParentWindow(null);
      win.setAlwaysOnTop(true, 'floating');
      win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    } else {
      win.setAlwaysOnTop(false);
      win.setVisibleOnAllWorkspaces(false);
      attach(n);
    }
  }

  function present(n, focus) {
    if (n.closing || n.win.isDestroyed()) return;
    const win = n.win;
    win.setBounds(fit(win.getBounds()));
    applyOnTop(n);
    if (n.steppedAside) {
      // A menu is open on the dashboard: it comes out when the menu closes.
    } else if (focus) {
      win.show();
      win.focus();
    } else {
      win.showInactive();
    }
    update(n.id, (e) => {
      e.open = true;
      e.frame = win.getBounds();
    });
  }

  // Closed: what was typed last goes first (flush), at most 2 s.
  function close(n, flush) {
    if (n.closing) return;
    n.closing = true;
    if (!flush || !n.loaded || n.win.isDestroyed()) return finish(n);
    let done = false;
    const end = () => {
      if (done) return;
      done = true;
      finish(n);
    };
    n.win.webContents.executeJavaScript(`(async () => {${FLUSH}})()`).then(end, end);
    setTimeout(end, 2000);
  }

  function finish(n) {
    if (n.finished) return;
    n.finished = true;
    if (!n.win.isDestroyed()) {
      update(n.id, (e) => {
        e.open = false;
        e.frame = n.win.getBounds();
      });
      n.win.setParentWindow(null);
      n.win.destroy();
    }
    if (open.get(n.id) === n) open.delete(n.id);
    callNotes('window.Notes && Notes.windowClosed && Notes.windowClosed(id)', { id: n.id });
    if (n.reopen) show(n.id);
  }

  // ---------- the dashboard asks ----------
  // A note in its window: a new one (shown once its page has the note), or the one out already, brought forward.
  function show(id, focus = true) {
    if (typeof id !== 'string' || !NAME.test(id)) return;
    const n = open.get(id);
    if (n) {
      if (n.closing) n.reopen = true;
      else if (n.loaded) present(n, focus);
      else n.pendingFocus = n.pendingFocus === true || focus;
      return;
    }
    make(id).pendingFocus = focus;
  }

  function closeNote(id, flush, deleted) {
    const n = open.get(id);
    if (n) close(n, flush);
    if (deleted) forget(id);
  }

  // The dashboard's notes are loaded: the notes left out at the last quit come back once, and the page learns which
  // notes are out (a reloaded page has forgotten).
  function notesReady() {
    if (!restored) {
      restored = true;
      for (const [id, e] of Object.entries(entries())) if (e && e.open === true && !open.has(id)) show(id, false);
    }
    // Windows destroys the dashboard's page when the dashboard closes, so saves made meanwhile failed: once the page is
    // back, each note window sends again what it still holds unsaved.
    callNotes('window.Notes && Notes.windowsOpen && Notes.windowsOpen(ids)', { ids: [...open.keys()] }).then(() => {
      for (const n of open.values()) {
        if (!n.loaded || n.finished || n.win.isDestroyed()) continue;
        n.win.webContents.executeJavaScript(`(async () => {${FLUSH}})()`).catch(() => {});
      }
    });
  }

  // The theme's background changed: every open note window takes it.
  function setBackground(color) {
    for (const n of open.values()) if (!n.win.isDestroyed()) n.win.setBackgroundColor(color);
  }

  // The dashboard came to the front: unpinned notes opened while it was away ride above it too.
  function pinAll() {
    for (const n of open.values()) if (!n.win.isDestroyed() && n.win.isVisible()) attach(n);
  }

  // A menu opened on the dashboard: unpinned notes step out of its way and come back when it closes; pinned ones stay.
  function stepAside(aside) {
    for (const n of open.values()) {
      if (n.win.isDestroyed()) continue;
      if (aside && n.win.isVisible() && !n.onTop && !n.steppedAside) {
        n.steppedAside = true;
        n.win.setParentWindow(null);
        n.win.hide();
      } else if (!aside && n.steppedAside) {
        n.steppedAside = false;
        attach(n);
        if (n.loaded) n.win.showInactive();
      }
    }
  }

  function setStreamer(on) {
    for (const n of open.values()) {
      if (n.win.isDestroyed()) continue;
      n.win.webContents.executeJavaScript(`document.documentElement.classList.toggle('streamer', ${on === true}); true`).catch(() => {});
    }
  }

  // The app quits: what each note typed in the last moment goes to the dashboard (which keeps it).
  function flushAll() {
    const list = [...open.values()].filter((n) => n.loaded && !n.finished && !n.win.isDestroyed());
    return Promise.all(list.map((n) => n.win.webContents.executeJavaScript(`(async () => {${FLUSH}})()`).catch(() => {})));
  }

  // Ctrl+W in a note: closed as its × does. False when no note is in front.
  function closeKey() {
    const n = [...open.values()].find((x) => !x.win.isDestroyed() && x.win.isFocused());
    if (!n) return false;
    close(n, true);
    return true;
  }

  const has = (webContents) => [...open.values()].some((n) => !n.win.isDestroyed() && n.win.webContents === webContents);

  // The dashboard page's messages for the note windows ("radar" handler).
  function radar(msg) {
    switch (msg.type) {
      case 'noteWindow':
        if (typeof msg.id === 'string') show(msg.id);
        return true;
      case 'noteWindowClose':
        if (typeof msg.id === 'string') closeNote(msg.id, msg.flush !== false, msg.deleted === true);
        return true;
      case 'notesReady':
        notesReady();
        return true;
      default:
        return null;
    }
  }

  // ---------- a note window's page's messages ("noteWindow" handler): every one gets an answer ----------
  async function handle(webContents, body) {
    const n = [...open.values()].find((x) => !x.win.isDestroyed() && x.win.webContents === webContents);
    if (!n || n.finished) return { error: "this note's window is closed" };
    const win = n.win;
    switch (body.type) {
      case 'load':
        return load(n);
      case 'save':
        return save(n, body.json);
      case 'dragStart': {
        const b = win.getBounds();
        n.dragFrom = { mouse: screen.getCursorScreenPoint(), bounds: b };
        return null;
      }
      case 'drag': {
        // Where the pointer is now, not the page's deltas: right at any text size.
        const d = n.dragFrom;
        if (d) {
          const m = screen.getCursorScreenPoint();
          win.setBounds({ x: d.bounds.x + m.x - d.mouse.x, y: d.bounds.y + m.y - d.mouse.y, width: d.bounds.width, height: d.bounds.height });
        }
        return null;
      }
      case 'dragEnd':
        n.dragFrom = null;
        win.setBounds(fit(win.getBounds()));
        remember(n);
        return null;
      case 'onTop': {
        const on = body.on === true;
        if (on !== n.onTop) {
          n.onTop = on;
          update(n.id, (e) => { e.onTop = on; });
          applyOnTop(n);
          win.show();
          win.focus();
        }
        return { onTop: n.onTop };
      }
      case 'close':
        setImmediate(() => close(n, true));
        return null;
      case 'confirm': {
        const ok = typeof body.ok === 'string' && body.ok ? body.ok : 'OK';
        const r = await dialog.showMessageBox(win, {
          type: 'warning', buttons: [ok, 'Cancel'], defaultId: 1, cancelId: 1, noLink: true,
          message: typeof body.title === 'string' && body.title ? body.title : 'Are you sure?',
          detail: typeof body.text === 'string' ? body.text : '',
        });
        return { yes: r.response === 0 };
      }
      case 'delete':
        setImmediate(() => {
          close(n, false);
          forget(n.id);
          callNotes('window.Notes && Notes.removeFromWindow && Notes.removeFromWindow(id)', { id: n.id });
        });
        return null;
      case 'title':
        win.setTitle(String(typeof body.name === 'string' ? body.name : 'Note').slice(0, 80));
        return null;
      default:
        return { error: 'unknown request' };
    }
  }

  // The note, from the dashboard's page: `{ json }`, `{ gone }` (deleted: the window closes) or `{ wait }` (loading).
  async function load(n) {
    const js = 'const N = window.Notes; if (!N || !N.windowNote) return { wait: true }; const json = await N.windowNote(id); return json ? { json } : { gone: true };';
    const answer = await callNotes(js, { id: n.id });
    if (n.finished) return { gone: true };
    if (answer && typeof answer.json === 'string') {
      if (!n.loaded) {
        n.loaded = true;
        // Shown after the reply goes out, so the page has its note when it appears.
        const focus = n.pendingFocus === true;
        n.pendingFocus = null;
        setImmediate(() => !n.finished && present(n, focus));
      }
      return { json: answer.json, onTop: n.onTop, streamer: streamerOn() };
    }
    if (answer && answer.gone === true) {
      setImmediate(() => close(n, false));
      return { gone: true };
    }
    return { wait: true };
  }

  // The page's note, kept by the dashboard's page. Only this window's own note: anything else is refused.
  async function save(n, json) {
    let note = null;
    try {
      const pad = JSON.parse(String(json));
      if (pad && Array.isArray(pad.notes) && pad.notes.length === 1) note = pad.notes[0];
    } catch {}
    if (!note || note.id !== n.id) return { error: 'bad request' };
    if (!dashPage()) return { error: "the dashboard isn't open" };
    const r = await callNotes("const N = window.Notes; return N && N.fromWindow ? await N.fromWindow(note) : { error: 'the dashboard is loading' };", { note });
    return r && typeof r === 'object' ? r : { error: "the dashboard didn't answer" };
  }

  return { radar, handle, has, pinAll, stepAside, setStreamer, flushAll, closeKey, setBackground };
}

module.exports = { createNoteWindows };
