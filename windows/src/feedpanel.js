'use strict';
// The community feed (the white lines that dissolve) at the top left corner of the screen, above whatever app is in
// front, as the Mac's FeedPanel.swift. It is a see-through window that never takes a click or the keyboard. The
// dashboard page (community.js) decides what shows and when and hands each line over (`add`, `out`, `clear`); the page
// in this window (feed.html) only draws them, and says when none is left so the window goes away.
const path = require('path');

const SIZE = { width: 560, height: 190 };
const MARGIN = 12;
const KINDS = new Set(['badge', 'top', 'goal', 'fire', 'fires']);

function createFeedPanel({ BrowserWindow, WEB, webPrefs, bootFor, checkPages, home }) {
  let win = null;
  let ready = false;
  let waiting = []; // scripts that arrived before the page finished loading

  const alive = () => win && !win.isDestroyed();

  function make() {
    win = new BrowserWindow({
      ...SIZE, frame: false, transparent: true, resizable: false, movable: false, focusable: false, show: false, skipTaskbar: true,
      hasShadow: false, backgroundColor: '#00000000', alwaysOnTop: true, fullscreenable: false, webPreferences: webPrefs(),
    });
    const w = win;
    bootFor(w.webContents, { feed: true });
    w.setAlwaysOnTop(true, 'screen-saver');
    w.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    w.setIgnoreMouseEvents(true);
    w.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    // The page's process died: load it again; what was on it is gone with it.
    w.webContents.on('render-process-gone', () => {
      ready = false;
      waiting = [];
      if (w.isDestroyed()) return;
      w.hide();
      setTimeout(() => !w.isDestroyed() && w.webContents.reload(), 500);
    });
    w.on('closed', () => {
      if (win === w) win = null;
      ready = false;
      waiting = [];
    });
    checkPages();
    w.loadFile(path.join(WEB, 'feed.html'));
  }

  function runScript(js) {
    if (!alive()) return;
    if (!ready) return void waiting.push(js);
    win.webContents.executeJavaScript(`${js}; true`).catch((e) => console.error('feed page:', e.message));
  }

  // Top left of the display the app is on, inside what the taskbar leaves.
  function place() {
    if (!alive()) return;
    const a = home().workArea;
    // The page shares the dashboard's zoom, so the window grows with the text size.
    const z = win.webContents.getZoomFactor() || 1;
    win.setBounds({ x: a.x + MARGIN, y: a.y + MARGIN, width: Math.round(SIZE.width * z), height: Math.round(SIZE.height * z) });
    if (!win.isVisible()) win.showInactive();
  }

  const lit = (v) => JSON.stringify(String(v));

  function add(id, kind, html) {
    if (typeof id !== 'string' || typeof kind !== 'string' || typeof html !== 'string') return;
    if (!KINDS.has(kind) || !id || id.length > 32 || html.length > 4000) return;
    if (!alive()) make();
    place();
    runScript(`window.__feed && __feed.add(${lit(id)}, ${lit(kind)}, ${lit(html)})`);
  }

  function out(id) {
    if (typeof id !== 'string' || id.length > 32) return;
    if (!alive()) return;
    runScript(`window.__feed && __feed.out(${lit(id)})`);
  }

  function clear() {
    if (!alive()) return;
    runScript('window.__feed && __feed.clear()');
  }

  // Empties the window if it was ever made (a reloaded dashboard), without making it just to clear it.
  const clearIfCreated = () => clear();

  // The dashboard page's messages ("radar" handler): community.js's lines.
  function radar(msg) {
    switch (msg.type) {
      case 'feedLine':
        add(msg.id, msg.kind, msg.html);
        return true;
      case 'feedOut':
        out(msg.id);
        return true;
      case 'feedClear':
        clear();
        return true;
      default:
        return null;
    }
  }

  // The feed page's own messages ("feed" handler).
  function handle(webContents, body) {
    if (!alive() || webContents !== win.webContents) return { error: 'not this page' };
    if (body.type === 'ready') {
      ready = true;
      const scripts = waiting;
      waiting = [];
      scripts.forEach(runScript);
    } else if (body.type === 'feedState') {
      // A stale "empty" can arrive just after a new line was drawn, so "not empty" brings the window back.
      if (body.empty === true) win.hide();
      else if (body.empty === false && !win.isVisible()) win.showInactive();
    }
    return null;
  }

  // Whether this is the feed window's page (main.js lets it nothing but the "feed" handler).
  const has = (wc) => alive() && win.webContents === wc;

  return { radar, handle, has, clearIfCreated };
}

module.exports = { createFeedPanel };
