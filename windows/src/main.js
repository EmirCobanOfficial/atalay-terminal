'use strict';
// Orbiterm for Windows: the Mac app's dashboard (app/Resources/web, unchanged) in Electron. This file is the
// Mac app's MainWindowController and AppDelegate: the windows, the line between the pages and the parts that feed them
// (engine.js, cloud.js, git.js, themes.js, terminals.js), the keys and the updates.
const {
  app, BaseWindow, BrowserWindow, WebContentsView, webContents, ipcMain, dialog, Menu, shell, screen, powerMonitor, nativeTheme, net,
  clipboard, ClipboardItem, nativeImage, safeStorage, protocol, session,
} = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { fileURLToPath } = require('url');

// ---------- the release's guard ----------
// A released app (packaged) signs its API calls only through resources\guard.node (native/guard.c), which signs nothing
// outside that release's own Orbiterm.exe and app.asar. It also stops for good (lock) when something could make this
// app speak in someone else's name: a debugging switch (another program reaching into its pages), node-pty's files
// changed (they load into this process) or the pages changed (resources\web, checked before each loads). What the files
// should be comes from the guard, which scripts/guard.js builds over the finished app. Development features (DevTools,
// ATL_PROBE, ATALAY_API_URL, a key file) are never on in a released app; a run from the sources has no guard.
const RELEASE = app.isPackaged;
// A staging package (npm run staging -- --packaged): a released build in every way, guard included, but it speaks to the
// local API and never updates. Its own package.json says so; a release's can't be changed (asar integrity).
const STAGING = RELEASE && require('../package.json').orbitermStaging === true;
// A staging run, the package above or `npm run staging` from the sources (scripts/staging.js sets ORBITERM_STAGING=1),
// goes out as the next minor with "-staging", as the Mac's STAGING build does (build-app.sh): it never reads like the
// installed release, and the dashboard knows it is staging by it (fire-test.js, social-test.js: Alt-Shift-T shows their
// test strips, "🚀 ATTACK ME" among them). The updater still compares against app.getVersion().
function cloudVersion() {
  const v = app.getVersion();
  if (!STAGING && (RELEASE || process.env.ORBITERM_STAGING !== '1')) return v;
  const [major, minor] = v.split('.').map(Number);
  return `${major}.${minor + 1}.0-staging`;
}
const guard = (() => {
  if (!RELEASE) return null;
  try {
    return require(path.join(process.resourcesPath, 'guard.node'));
  } catch {
    return null;
  }
})();
const builtFiles = (() => {
  try {
    return guard ? JSON.parse(guard.files()) : null;
  } catch {
    return null;
  }
})();
// Every file under `dir` and its SHA-256 the same as `want` (path under `dir`, with forward slashes). Viktoria's model and
// motions are not in the install any more (one pak, downloaded on demand: mascotasset.js), so every file is code or small.
function sameFiles(dir, want) {
  if (!want) return false;
  const got = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name !== '.DS_Store') {
        const rel = path.relative(dir, p).split(path.sep).join('/');
        if (!e.isFile()) {
          got[rel] = '?';
        } else {
          got[rel] = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
        }
      }
    }
  };
  try {
    walk(dir);
  } catch {
    return false;
  }
  const names = Object.keys(want);
  return Object.keys(got).length === names.length && names.every((n) => got[n] === want[n]);
}
if (guard) {
  const debugging = ['remote-debugging-port', 'remote-debugging-pipe', 'inspect', 'inspect-brk', 'inspect-port', 'js-flags']
    .some((s) => app.commandLine.hasSwitch(s)) || process.argv.some((a) => /^--(inspect|remote-debugging|js-flags)/.test(a));
  const pty = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'node-pty');
  const ptyOwn = !!builtFiles && sameFiles(pty, builtFiles.pty);
  // Changed node-pty files never load: the terminals run in the session host instead (terminals.js).
  if (!ptyOwn) process.env.ORBITERM_NO_PTY = '1';
  if (debugging || !ptyOwn) guard.lock();
}

const { createEngine, renamedAt } = require('./engine');
const { createGit } = require('./git');
const { createCloud } = require('./cloud');
const { createTokenLedger } = require('./tokenledger');
const { createThemes } = require('./themes');
const { createAIColors } = require('./aicolors');
const { createTerminals, which, childEnvironment } = require('./terminals');
const { createOverlay } = require('./overlay');
const { createRunaways } = require('./runaways');
const { createCleanup, setAccountDirs } = require('./cleanup');
const { createPowerSaver } = require('./power');
const { createDiscord } = require('./discord');
const { createFiles, linkTarget, fileFromURL } = require('./files');
const { createSavers } = require('./savers');
const { createChatList } = require('./chatlist');
const { createLimits } = require('./limits');
const { createClaudeAccounts, ROOT: ACCOUNTS_ROOT } = require('./claudeaccounts');
const { createAcctWindow } = require('./acctwin');
const { createCodexHooks } = require('./codexhooks');
const { createCursorHooks } = require('./cursorhooks');
const { createMcp } = require('./mcp');
const { createNotesStore } = require('./notesstore');
const { createAttachments } = require('./attachments');
const { createNotesSync } = require('./notessync');
const notesProjects = require('./notesprojects');
const { createStreamer } = require('./streamer');
const { createNoteWindows } = require('./notewindow');
const { createNotesAI } = require('./notesai');
const { createFeedPanel } = require('./feedpanel');
const { createChatTrash } = require('./chattrash');
const { createTermFont } = require('./termfont');
const { createMascot } = require('./mascot');
const { createDesk } = require('./deskhelper');
const { createMascotAsset } = require('./mascotasset');
const { createShareCard } = require('./sharecard');
const { createShortcuts } = require('./shortcuts');
const panes = require('./panes');
const tabdrag = require('./tabdrag');
const { createEnvBridge } = require('./envbridge');
const { createEnvNative } = require('./envnative');
const { createGitShip } = require('./gitship');
const { createWorktreeShip, menuLabel } = require('./worktreeship');
const vendor = require('./vendor');

let autoUpdater = null;
try {
  ({ autoUpdater } = require('electron-updater'));
} catch {}

// Where the dashboard's web files are: next to the app when it's installed (electron-builder copies them), the Mac
// app's folder in the repository when it runs from the sources.
const WEB = app.isPackaged ? path.join(process.resourcesPath, 'web') : path.join(__dirname, '..', '..', 'mac', 'Resources', 'web');
const PRELOAD = path.join(__dirname, 'preload.js');
// ATL_PROBE=<folder>: a check without windows on screen — the pages render out of sight, pictures of them land in the
// folder, and the app quits (development only: a released app never runs it).
const PROBE = RELEASE ? '' : process.env.ATL_PROBE || '';
// ORBITERM_DEMO=1 (staging, development only): the dashboard shows four made-up projects at work and nothing real
// (web/app.js's DEMO), without the chats list. With ORBITERM_DEMO_SHOT=<folder>, pictures of it land there (demoShots).
const DEMO = !RELEASE && process.env.ORBITERM_DEMO === '1';
// The pages still the release's own, checked before one loads: once they aren't, the guard signs nothing more.
function checkPages() {
  if (guard && !sameFiles(WEB, builtFiles && builtFiles.web)) guard.lock();
}

// Run from the sources on a Mac (development), its data must not land in the Mac app's own folder.
if (process.platform !== 'win32') app.setPath('userData', path.join(app.getPath('appData'), 'atalay-terminal-windows-dev'));
// The data folder keeps the name the app had before it was Orbiterm (Atalay's Terminal; Atalay's Terminal Staging for a
// staging build): under the new name the app would start without its settings, its sign-in and its chats. A folder
// given with --user-data-dir (npm run staging's, a check's) stays as it is.
const DATA = path.join(app.getPath('appData'), app.getName().replace(/^Orbiterm/, "Atalay's Terminal"));
if (process.platform === 'win32' && !app.commandLine.hasSwitch('user-data-dir')) app.setPath('userData', DATA);
// The second launch's own arguments go to the first as they were typed (second-instance's `argv` is Chromium's, whose
// switches can come reordered, away from the folder or id after them): --new-terminal, --open-session (launchArgs).
if (!app.requestSingleInstanceLock({ argv: process.argv.slice(1), cwd: process.cwd() })) return app.quit();
// viktoria:// (her downloaded pak, served to her overlay's own session only: mascotasset.js). Before the app is ready.
protocol.registerSchemesAsPrivileged([{ scheme: 'viktoria', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
// Sounds (the turn-finished chime when sound is on, the notices' pings) play without a click on the page first, as on the Mac.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
nativeTheme.themeSource = 'dark';
// The installer's shortcuts carry the app's id (build.appId in package.json) as their AppUserModelID; the windows must
// too, or a pinned shortcut and the running app sit apart on the taskbar.
if (process.platform === 'win32' && app.isPackaged) app.setAppUserModelId('com.atalaykarahan.atalay-terminal');

// ---------- settings: a small JSON file in the app's data folder ----------
const SETTINGS = path.join(app.getPath('userData'), 'settings.json');
const settings = (() => {
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
  } catch {}
  return {
    get: (k) => data[k],
    set(k, v) {
      data[k] = v;
      try {
        fs.mkdirSync(path.dirname(SETTINGS), { recursive: true });
        fs.writeFileSync(SETTINGS, JSON.stringify(data, null, 2));
      } catch (e) {
        console.error('settings:', e.message);
      }
    },
  };
})();

// The shortcuts the user can change (Settings › Shortcuts, shortcuts.js): a change rebuilds the menu's keys, tells the
// terminals which keys are the app's and whether Esc and the close keys are swapped, and every page how the mouse
// opens the Ring (preload.js).
const shortcuts = createShortcuts({ settings, onChange: () => shortcutsChanged() });
function shortcutsChanged() {
  if (app.isReady()) buildMenu();
  const keys = shortcuts.forTerminal();
  // A page loaded again (a reload, its renderer gone) reads what its window was made with: that is kept current too.
  for (const b of boots.values()) {
    b.ringMouse = shortcuts.ringMouse();
    if (b.keys) b.keys = keys;
  }
  for (const c of chats.values()) send(c.page, 'term:keys', keys);
  for (const wc of webContents.getAllWebContents()) if (!wc.isDestroyed()) wc.send('atl:ringMouse', shortcuts.ringMouse());
  pushChatsKeys();
}
// The chats list's fold bar names the key that folds its saved chats (web/chats.js), as the user set it: after the list loads
// and whenever it changes.
function pushChatsKeys() {
  run(dashView, `window.__chats && __chats.keys && __chats.keys(${JSON.stringify({ chatsList: shortcuts.label(shortcuts.combo('chatsList')) })})`);
}
// Esc and the close keys swapped (Settings › Shortcuts › Chats): an Esc that hid a terminal, held or pressed again,
// doesn't go on to the window Windows puts in front next: Escape is dropped everywhere for half a second.
let escMuteUntil = 0;

// ---------- the parts ----------
// The dashboard window: one page that fills it; the chats list is one of its panels (web/chats.js), as on the Mac.
let dash = null, dashView = null;
const boots = new Map(); // webContents id -> what its preload asks for before the page loads
// A terminal's `page` is its own view (pages/terminal.js); `win` is the window it's a tab or a pane of (its `frame`'s),
// and so are `steppedAside` and `pinned`: a window's tabs show, hide and pin together (openChatWindow).
const chats = new Map(); // terminal id -> { page, frame, win, sessionId, cwd, claude, title, startedAt, steppedAside, envDirty }
let activeTerminalId = null;
const panels = { notices: null, chats: new Map(), showing: new Set() }; // the messages panels: the corner's notices, friends' chats
// The dashboard's streamer mode: made-up names in the chats list, the chat windows and the notices too (streamer.js).
const streamer = createStreamer(WEB);

// The AI tools in the theme's colours (Settings · INTERFACE): Claude Code, Codex and Antigravity on their themes that use
// the terminal's 16 colours.
const aiColors = createAIColors({
  settings,
  claudeDir: process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'),
  codexDir: process.env.CODEX_HOME || path.join(os.homedir(), '.codex'),
  home: os.homedir(),
});

const themes = createThemes({
  ai: aiColors,
  webDir: WEB,
  settings,
  onChange(css) {
    for (const id of boots.keys()) {
      const wc = webContents.fromId(id);
      if (wc && !wc.isDestroyed()) wc.send('atl:theme', css);
    }
    if (dash) { for (const w of [dash, dashView]) w.setBackgroundColor(themes.color('--bg')); noteWindows.setBackground(themes.color('--bg')); }
  },
  // Settings' text size: the dashboard zooms, as a browser does.
  onScale(factor) {
    if (dashView && !dashView.webContents.isDestroyed()) dashView.webContents.setZoomFactor(factor);
    // The list's width in the page's px changes with its zoom (the menus centre on the whole window by it).
    pushSide();
  },
});

// The token savers (rtk, caveman), shipped next to the dashboard's files; run from the sources, rtk is the one
// scripts/fetch-rtk.js put in vendor/ and caveman the Mac app's.
const savers = createSavers({
  settings,
  ownDir: path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'atalay-terminal'),
  bundled: app.isPackaged
    ? { rtk: path.join(process.resourcesPath, 'bin', 'rtk.exe'), caveman: path.join(process.resourcesPath, 'caveman') }
    : { rtk: path.join(__dirname, '..', 'vendor', 'rtk', 'rtk.exe'), caveman: path.join(__dirname, '..', '..', 'mac', 'Resources', 'caveman') },
  claudeDir: process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'),
  codexDir: process.env.CODEX_HOME || path.join(os.homedir(), '.codex'),
  home: os.homedir(),
  which,
  usable: process.platform === 'win32' && !PROBE,
});

// The windows a worktree's delete ended and kept (onExit below); each leaves the set when it closes (openChatWindow).
const keptWins = new Set();
const terminals = createTerminals({
  extraPath: savers.binDir,
  onData: (id, data) => send(chats.get(id)?.page, 'term:data', data),
  onExit(id) {
    const c = chats.get(id);
    if (c) {
      send(c.page, 'term:exit');
      acctWin.forget(id);
      // A plain terminal closes with its shell (its tab or pane, the window when it was the last); a chat's stays to show
      // how it ended until it's closed. One a worktree's delete ended (keepWindow) stays too, saying ENDED, as on the Mac
      // (spec 9.2: no window is closed).
      if (c.keepWindow) {
        send(c.page, 'term:info', { ...chatInfo(id, c), status: 'ended' });
        keptWins.add(c.win);
      } else if (!c.claude) dropPane(id);
      chats.delete(id);
      if (c.frame) pushBar(c.frame);
      toDash(`terminalGone(${JSON.stringify(id)})`);
      pushWinOpen();
      pushChats();
    }
    quitIfIdle();
  },
  // The session host keeps chats and terminals going without the app, as screen does on the Mac. Each build has its
  // own, as there (the installed app's, a development run's), and so does a profile of its own (npm run staging's): a
  // launch only ever brings back its own app's chats.
  host:
    process.platform === 'win32' && !PROBE
      ? {
          name: `atalay-terminal-host-v1-${os.userInfo().username.replace(/[^\w.-]/g, '_')}${app.isPackaged ? '' : '-dev'}${profileSuffix()}`,
          dir: path.join(process.env.LOCALAPPDATA || app.getPath('temp'), 'atalay-terminal-host'),
          source: path.join(__dirname, 'host.cs'),
        }
      : null,
});

// "" for the app's usual profile, else a short mark of the one it was given (--user-data-dir).
function profileSuffix() {
  const own = app.getPath('userData').toLowerCase();
  if (path.resolve(own) === path.resolve(DATA).toLowerCase()) return '';
  return '-' + crypto.createHash('sha256').update(own).digest('hex').slice(0, 8);
}

// Closing the dashboard keeps the app and its chats going, as on the Mac, where the Dock brings it back (here, starting
// the app again). With no chat or terminal left there's nothing to keep it for: it quits rather than stay on out of
// sight (the hidden notices panel would keep it alive, and the uninstaller would find it running). A window a worktree's
// delete ended stays on screen, saying ENDED, until the user closes it (spec 9.2): the app stays for it too, and looks
// again when it closes (openChatWindow).
function quitIfIdle() {
  if (quitting || dash || terminals.list().length) return;
  for (const w of keptWins) if (!w.isDestroyed() && w.isVisible()) return;
  app.quit();
}

// Claude's 5-hour and weekly limits: Claude Code's status line hands its JSON to a script of ours (src/limits.js).
// With several Claude accounts (src/claudeaccounts.js) it hooks every account's settings and keeps one limits file each.
let accounts = null;
const limits = createLimits({
  dir: path.join(app.getPath('userData')),
  claudeDir: process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'),
  accountsRoot: ACCOUNTS_ROOT,
  accountDirs: () => (accounts ? accounts.all().filter((a) => a.dir).map((a) => a.dir) : []),
});
// Several Claude accounts (the Mac's ClaudeAccounts): none by itself unless the user adds a second one; nothing here ever
// switches an account, reads a token or asks a usage endpoint. `acctWin` is what a terminal window shows of it (acctwin.js).
accounts = createClaudeAccounts({
  dataDir: app.getPath('userData'),
  claudeDir: process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'),
  limitsFile: limits.file,
  names: () => [mcp.serverName('full'), mcp.serverName('notes')],
  // Only the app's usual profile hooks Claude Code's settings, as at launch (app.whenReady).
  installStatusLine: () => {
    if (process.platform === 'win32' && !PROBE && !profileSuffix()) limits.install();
  },
  signIn: (id) => openSignInTerminal(id),
  runningChats: (id) => accountChatCount(id),
  onChange: () => accountsChanged(),
});
const acctWin = createAcctWindow({ accounts, settings });
setAccountDirs(() => accounts.all().filter((a) => a.dir).map((a) => a.dir));
// The status line script is put back (a file compare) when an older app that shares the folder swapped it; only the app's
// usual profile touches Claude Code's settings.
const ensureStatusLine = () => {
  if (process.platform === 'win32' && !PROBE && !profileSuffix()) limits.ensure();
};

// Codex's approval requests (src/codexhooks.js): its hooks keep them in the app's own folder, the same for every build and
// profile.
const codexHooks = createCodexHooks({
  ownDir: path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'atalay-terminal'),
  codexDir: process.env.CODEX_HOME || path.join(os.homedir(), '.codex'),
});

// Cursor's CLI (src/cursorhooks.js): its hooks hand every event to the app's hook program, which keeps them in the same
// folder, the same for every build and profile. Only the app's usual profile puts them into Cursor's hooks.json (a profile
// of its own, npm run staging, reads what they write and leaves the real hooks.json be).
const cursorHooks = createCursorHooks({
  ownDir: path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'atalay-terminal'),
  cursorDir: process.env.CURSOR_CONFIG_DIR || path.join(os.homedir(), '.cursor'),
});
const installCursorHooks = () => {
  if (process.platform === 'win32' && !PROBE && !profileSuffix()) cursorHooks.install();
};

// Discord presence (discord.js, the Mac's DiscordPresence): your Discord profile shows what you're doing, on unless
// Settings · DISCORD turns it off. Made before the engine and Cloud, whose changes it hears.
const discord = createDiscord({ settings, xp: () => cloud.json().xp, onChange: () => pushDiscord() });

// Each AI's whole tree as Clean Up's round last measured it (cleanup.js, the Mac's MemoryWatch.trees): pid -> { bytes,
// top: [[name, bytes]] }, the card's `mem` and its tooltip.
let memTrees = new Map();
const engine = createEngine({
  claudeDir: path.join(os.homedir(), '.claude'),
  limitsFile: limits.file,
  accounts,
  ensureScript: ensureStatusLine,
  codexHooks,
  // A Cursor seen for the first time puts its hooks in too (Cursor may have been installed after the app started).
  cursorHooks,
  installCursorHooks,
  memTree: (pid) => memTrees.get(pid) || null,
  // A Claude process under one of the app's terminals belongs to that window (its id becomes the session's `tab`).
  isAppPid: (pid) => (terminals.list().find((t) => t.pid === pid) || {}).id || false,
  // The name typed for a chat in the list: the session cards, the MCP list and the rest show it too (the Mac's ChatNames).
  nameOf: (id) => chatlist.title(id),
  // An AI session left "busy": the notes it was working in let it go (notesai.js; the Mac's NotesTools.sessionIdle).
  onSessionIdle(pid) {
    try {
      notesAI.sessionIdle(pid);
    } catch {}
  },
  onInit(json) {
    toDash(`init(${json})`);
    pushSide(true);
    pushWinOpen(true);
    pushActiveSession(true);
  },
  onState(json) {
    toDash(`state(${json})`);
    matchChats();
    pushActiveSession();
    for (const [id, c] of chats) {
      const info = sendInfo(id, c);
      // In a worktree: its chip and button; the AI's turn ending may have changed its files, so they're read again at once
      // (the Mac's shipStatusChanged).
      pushShipWindow(id, c);
      if (c.wtTop && c.shipStatus === 'busy' && info.status !== 'busy') worktreeShip.refresh(c.wtTop, { force: true });
      c.shipStatus = info.status;
    }
    // A switch the user chose "when this reply ends" for, whose reply has ended (acctwin.js: only a session at YOUR TURN).
    for (const d of acctWin.due(engine.live(), (tab) => chats.has(tab) && terminals.has(tab))) switchAccount(d.id, d.to);
    badge();
    askAttention();
    if (!engineSeen) {
      engineSeen = true;
      // --open-session ids given at launch, now that the engine knows the chats (the Mac's openWhenReady).
      setImmediate(() => openPending.splice(0).forEach((sid) => openSession(sid, false)));
    }
    updateWaits();
    pushWinOpen();
    pushChats();
    discord.update(engine.live());
    mascot.updateSessions(engine.live());
    // The local MCP server's sessions (the Mac's McpHub.update).
    mcp.update(engine.live());
  },
  onEvents(json) {
    toDash(`events(${json})`);
    mascot.onEvents(json);
  },
  // The saved conversations, for the chats list.
  onHistory(items) {
    chatlist.setItems(items);
    pushChats();
    // A name typed in the list may have given way to Claude's own /rename (chatlist.js).
    engine.namesChanged();
  },
  // Claude's own /rename, just written into a running chat: newer than a name typed in the list, which gives way to it.
  onCustomTitle({ id, title }) {
    if (!chatlist.renamedLive(id, title)) return;
    engine.namesChanged();
    pushChats(true);
    pushChatInfos();
  },
});

// The chats list beside the dashboard: what it lists, with the stars, the archive and the deleted chats (src/chatlist.js;
// chattrash.js deletes a conversation's files once its 30 days are over).
const chatlist = createChatList({
  settings,
  trashOps: createChatTrash({
    claudeDir: path.join(os.homedir(), '.claude'),
    claudeDirs: () => accounts.all().filter((a) => a.dir).map((a) => a.dir),
    codexDir: process.env.CODEX_HOME || path.join(os.homedir(), '.codex'),
    agyDir: path.join(os.homedir(), '.gemini', 'antigravity-cli'),
    cursorDir: process.env.CURSOR_CONFIG_DIR || path.join(os.homedir(), '.cursor'),
    // npm's Codex is codex.cmd here (where.exe names its extensionless shell script first).
    codexExe: () => which('codex.exe') || which('codex.cmd'),
    home: os.homedir(),
  }),
  onErased: () => engine.refreshHistory(),
  // A name typed in the list against Claude's own /rename: when that was made (engine.js), and the list and the windows
  // follow once the typed one gave way.
  renamedAt,
  onNames: () => {
    engine.namesChanged();
    pushChats(true);
    pushChatInfos();
  },
});

const git = createGit({
  folders: () => [...engine.gitSessions(), ...engine.gitSources(), ...terminals.cwds()],
  written: () => engine.written(),
  async confirm({ message, detail, buttons, destructive }) {
    const r = await dialog.showMessageBox(dash || undefined, {
      type: destructive ? 'warning' : 'question', message, detail, buttons: buttons || ['OK', 'Cancel'], defaultId: 0, cancelId: (buttons || []).length - 1, noLink: true,
    });
    return r.response;
  },
  // Under the button that asked (`at`: the page's pixels), as Source Control's menus open on the Mac.
  menu: (items, at) => popupMenu(items, at, dashView),
  trash: (p) => shell.trashItem(p),
});

/**
 * A native menu of `items` ({ id, title } or { separator: true }, `items` for a submenu) at `at`, a point in the page of
 * `view` (one of the dashboard window's two), resolving to the id of the item picked, or null.
 */
function popupMenu(items, at, view) {
  return new Promise((resolve) => {
    let picked = null;
    const build = (list) =>
      (Array.isArray(list) ? list : []).map((i) => (i.separator || i.type === 'separator' ? { type: 'separator' } : {
        label: String(i.title || i.label || ''), enabled: i.enabled !== false, submenu: i.items ? build(i.items) : undefined,
        click: i.items ? undefined : () => (picked = i.id),
      }));
    const off = view ? view.getBounds() : { x: 0, y: 0 };
    const z = (view && !view.webContents.isDestroyed() && view.webContents.getZoomFactor()) || 1;
    const pos = at && Number.isFinite(at.x) && Number.isFinite(at.y) ? { x: Math.round(at.x * z + off.x), y: Math.round(at.y * z + off.y) } : {};
    Menu.buildFromTemplate(build(items)).popup({
      window: dash || undefined, ...pos,
      callback: () => {
        // An item picked: a click like any other, though it went to the menu and not to the page (Source Control's ⋯,
        // with its Open File).
        if (picked != null) userInput.press = userInput.any = Date.now();
        resolve(picked);
      },
    });
  });
}

// A staging build talks to the shared staging API (scripts/staging.js: STAGING_API_URL=http://127.0.0.1:4800 for a local
// one, which the package then says in its package.json). A run from the sources takes ATALAY_API_URL, as it always did.
const API_BASE = (!RELEASE && process.env.ATALAY_API_URL)
  || (STAGING ? require('../package.json').orbitermStagingApi || 'https://api-staging.orbiterm.dev' : 'https://terminal-api.atalaykarahan.com');
// The staging API's access key (its src/gate.ts): in a staging package it is src/accesskey.js, written by
// scripts/staging.js (gitignored, never in a release); from the sources, ATALAY_ACCESS_KEY, which that script passes in.
// A release has none, and neither has a build against a local API (it has no gate).
const ACCESS_KEY = (() => {
  if (RELEASE && !STAGING) return null;
  try {
    const k = RELEASE ? require('./accesskey.js') : process.env.ATALAY_ACCESS_KEY;
    return typeof k === 'string' && k.trim() ? k.trim() : null;
  } catch {
    return null;
  }
})();
// A header for the API's own address only (never GitHub's or the file bucket's).
const withAccess = (url, init = {}) => {
  if (!ACCESS_KEY || new URL(url).origin !== new URL(API_BASE).origin) return init;
  return { ...init, headers: { ...init.headers, 'x-orbiterm-access': ACCESS_KEY } };
};
const cloud = createCloud({
  apiBase: API_BASE,
  dataDir: app.getPath('userData'),
  version: cloudVersion(),
  clientKey: RELEASE ? null : loadClientKey(),
  guard,
  fetch: (url, init) => net.fetch(url, init),
  accessKey: ACCESS_KEY,
  // The tokens burned, read from the AI tools' own records and sent after a heartbeat (tokenledger.js).
  // Any API but production keeps its own token book: a local or staging API never got the days the release sent.
  tokens: createTokenLedger({ dir: path.join(process.env.LOCALAPPDATA || path.join(app.getPath('appData'), '..', 'Local'), 'atalay-terminal'), staging: API_BASE !== 'https://terminal-api.atalaykarahan.com' }),
  // Working, for the XP: someone at the keyboard in the last five minutes, and a sign of work — a Claude session
  // busy, or a terminal printing or typed in.
  isActive: () => powerMonitor.getSystemIdleTime() < 300 && (terminals.busySince(300_000) || engine.live().some((s) => s.status === 'busy')),
  idleSeconds: () => powerMonitor.getSystemIdleTime(),
  theme: () => themes.chosenId(),
  // Viktoria: -1 when she is off, else her Mischief level (0..3). `mascot` is created further down, before any heartbeat runs.
  mascot: () => (mascot.enabled() ? mascot.mischief() : -1),
  tools: () => toolsAtWork(),
  // The keys the old end-to-end encrypted messages were sealed with (read by unseal.js) are kept sealed by Windows for this
  // user, as the notes' key is; the app only opens them now.
  protect: {
    async seal(text) {
      if (!(await safeStorage.isAsyncEncryptionAvailable())) throw new Error("Windows can't protect the message keys right now");
      return safeStorage.encryptStringAsync(text);
    },
    async open(sealed) {
      if (!(await safeStorage.isAsyncEncryptionAvailable())) throw new Error("Windows can't open the message keys right now");
      return (await safeStorage.decryptStringAsync(sealed)).result;
    },
  },
  onUpdateRequired: () => updates?.on426?.(),
  onNetBack: () => notesNetBack(),
  onChange(state) {
    pushCloud();
    if (state && state.xp) toNotices(`xp(${JSON.stringify(state.xp)})`);
    discord.refresh();
  },
  onSocial(text) {
    toDash(`social(${text})`);
    toNotices(`event(${text})`);
    mascot.onSocial(text);
    for (const p of panels.chats.values()) runPanel(p, `window.__messages && __messages.event(${text})`);
  },
});

// The AI tools seen at work (a session busy), for their badges (the API's badges.ts), as the Mac's Activity.toolAtWork:
// Claude's chats, and the others by name (Codex, Gemini, Antigravity, Cursor). The heartbeat sends those of the last
// minute and a half, a minute's slack.
const toolsAt = new Map();
function noteToolsAtWork() {
  const now = Date.now();
  for (const s of engine.live()) {
    if (s.status !== 'busy') continue;
    const key = s.ai ? String(s.name || '').toLowerCase() : 'claude';
    // Only when the process is the tool's own program (vendor.js): a program renamed after it earns its badge nothing.
    if (['claude', 'codex', 'gemini', 'antigravity', 'cursor'].includes(key) && vendor.genuine(key, s.pid)) toolsAt.set(key, now);
  }
}
const toolsAtWork = () => [...toolsAt].filter(([, at]) => Date.now() - at < 90_000).map(([key]) => key).sort();

// A run from the sources against the local API (npm run staging) signs with its own key file. A released app's key is
// in its guard (above), never in a file or in app.asar.
function loadClientKey() {
  try {
    if (!process.env.ATALAY_CLIENT_KEY_FILE) return null;
    const [id, secret] = fs.readFileSync(process.env.ATALAY_CLIENT_KEY_FILE, 'utf8').trim().split(':');
    return id && /^[0-9a-f]+$/i.test(secret || '') ? { id, secret } : null;
  } catch {
    return null;
  }
}

// `live`: the sessions at work, for the folder picker's "Claude is working here" (overlay.js gitInfo).
const overlay = createOverlay({ dataDir: app.getPath('userData'), claudeDir: path.join(os.homedir(), '.claude'), live: () => engine.live(), accounts });
// The dashboard's notes (web/notes.js), encrypted in the app's data folder (notesstore.js).
const notesStore = createNotesStore({
  dir: path.join(app.getPath('userData'), 'Notes'),
  keyFile: path.join(app.getPath('userData'), 'notes.key'),
  safeStorage,
});
// Shared notes and files in notes (notessync.js, attachments.js; the Mac's NotesSync and Attachments.swift): a note's socket
// ticket and its document file, the files kept beside the notes, their upload to a shared note and download from it, all here
// in the main process. The pages ask through `notes` (the dashboard) and `noteWindow` (a note's own window).
const notesSync = createNotesSync({
  store: notesStore,
  cloud,
  // The same masking the AI tools use (mcpshared.js), to tell a note holds a password or key before it's shared.
  redactMore: (s) => require('./mcpshared').redactMore(s),
  attachments: createAttachments({
    store: notesStore, cloud, fetch: (url, init) => net.fetch(url, init), dialog, shell,
    downloads: () => app.getPath('downloads'),
    // The file picker opens over the window of the page that asked (the dashboard, or a note's window).
    parent: (wc) => (wc && !wc.isDestroyed() ? BrowserWindow.fromWebContents(wc) || dash : dash),
  }),
});
// The folder each of the app's terminals is in: the AI's own when one runs there (the engine reads it from its records), else
// the folder the terminal opened in (Windows doesn't tell another process's current folder, the Mac's Proc.cwd). For the
// notes' projects (notesprojects.js): the board's "move to project" and the AI tools' project filter.
function terminalFolder(id) {
  const s = engine.live().find((x) => x.tab === id && typeof x.cwd === 'string' && x.cwd);
  if (s) return s.cwd;
  const t = terminals.list().find((x) => x.id === id);
  return (t && t.cwd) || null;
}
const liveFolders = () => terminals.list().map((t) => terminalFolder(t.id)).filter(Boolean);
// Source Control's files (files.js, the Mac's FileEditor.swift): the ones the dashboard's editor may read and write.
// When Windows last delivered a click (or Enter or Space) and any key or click to the dashboard's page (its input-event,
// in createDashboard), or the user picked an item in one of its native menus (popupMenu): the user's, since a page can't
// make these. files.js opens a file the page asks for (a Markdown link's, Source Control's Open File) only right after
// one, and asks before the first save of such a file only after one.
const userInput = { press: 0, any: 0 };
const files = createFiles({
  shell,
  saveDialog: (options) => dialog.showSaveDialog(dash || undefined, options),
  // A link in a Markdown preview to a text file beside it, or Source Control's Open File.
  onOpen: (p, line, cwd) => showFileInEditor(p, line, null, cwd),
  userActed: (ms, press) => Date.now() - (press ? userInput.press : userInput.any) < ms,
  confirmWrite: async (p, from) =>
    (await dialog.showMessageBox(dash || undefined, {
      type: 'question', message: `Save changes to ${path.basename(p)}?`, detail: `It was opened from ${from}, in ${path.dirname(p)}.`,
      buttons: ['Save', 'Cancel'], defaultId: 0, cancelId: 1, noLink: true,
    })).response === 0,
  repositories: () => git.listed(),
  home: os.homedir(),
});

// Power save (the Mac's PowerSaver): the map's switch, and on by itself at low battery or in Windows' Energy Saver.
const power = createPowerSaver({ settings, onBattery: () => powerMonitor.isOnBatteryPower(), onChange: () => pushPower() });

// Processes left burning a core where nobody sees them: the dashboard sounds the alarm (DANGER).
const runaways = createRunaways({
  // Each reading: the AI tools running besides Claude (Codex, Antigravity…), sessions on the orbit.
  // With each Claude process's CPU and memory for its card (the Mac's per-session read, RadarEngine).
  onRead: () => engine.setOthers(runaways.ais(), runaways.usage),
  // And the battery's charge and Energy Saver, which Electron doesn't tell.
  onPower: (r) => power.read(r),
  onChange: (json) => {
    toDash(`runaways(${json})`);
    // The alarm, in the middle of the screen (the notices panel can play its sound).
    toNotices(`runaways && __messages.runaways(${json})`);
    pushTerminals();
  },
  // And after each reading, Clean Up's round on the same list (the Mac's MemoryWatch tick).
  onDone: () => cleanup.round(),
});

// Clean Up (cleanup.js, the Mac's Cleanup.swift and MemoryWatch.swift): the view that lists idle chats and heavy
// programs, the map's line when the PC runs low on memory, and each card's `mem`. Nothing ends but what the user ticked
// and agreed to on its summary.
const cleanup = createCleanup({
  runaways, engine, terminals, streamer, settings, shell,
  // A terminal's window, "focused" only while that terminal is its tab and pane in front.
  chatWindow: (id) => {
    const c = chats.get(id);
    const win = c && c.win && !c.win.isDestroyed() ? c.win : null;
    return win && { isDestroyed: () => win.isDestroyed(), isFocused: () => win.isFocused() && c.frame && c.frame.focus === id };
  },
  // Env changes not saved in its window are asked about first: false when the user kept it.
  endTerminal: (id) => endTerminalAsked(id),
  isEnding: (pid) => ending.has(pid),
  // The app's own processes (its main process, pages, GPU): never ended, and counted as "Orbiterm" among the other apps.
  ownPids: () => [process.pid, ...app.getAppMetrics().map((m) => m.pid)],
  titleOf: (s) => chatlist.title(s.sessionId) || (s.convId && chatlist.title(s.convId)) || s.title || '',
  push: (name, json) => toDash(`${name}(${json})`),
  publishTrees: (trees) => {
    memTrees = trees;
  },
  logDir: path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'Orbiterm', 'Logs'),
  // Open Task Manager (the Mac's Open Activity Monitor): through the shell, which may raise it as Windows asks.
  taskManager: () => shell.openPath(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'Taskmgr.exe')),
});
// The app menu's (here File's) Clean Up…, Settings' Open Clean Up…, the map's line, the DANGER card's link: the
// dashboard in front, the view open (the Mac's MainWindowController.showCleanup).
function showCleanup() {
  showDashboard();
  toDash('openCleanup()');
}

// ---------- Viktoria, the roaming mascot (mascot.js, the Mac's Mascot.swift) ----------
// Her own switch is on at once in a staging build and in a run from the sources, off in a release until the user turns it
// on. Her mischief (0 Calm … 3 Crazy) starts at 3 in staging only, 1 otherwise, as on the Mac.
// Her model and motions: one pak, downloaded the first time the user asks for her (the Mac's MascotAsset). Plain http to
// this PC only in a staging build or a run from the sources.
const mascotAsset = createMascotAsset({
  app, net, cloud, settings, staging: STAGING,
  localOk: STAGING || !RELEASE,
  enable: (on) => settings.set('mascotEnabled', on),
  onChange: (readinessChanged) => mascot.assetChanged(readinessChanged),
});
const mascot = createMascot({
  BrowserWindow, screen, WEB, webPrefs, checkPages, settings, asset: mascotAsset,
  defaultEnabled: STAGING || (!RELEASE && !PROBE),
  defaultMischief: STAGING ? 3 : 1,
  run,
  dash: () => dash, dashView: () => dashView, chatsView: () => null,
  terminals: mascotTerminals,
  inFront: () => appInFront(),
  openView: mascotOpenView,
  navTap: mascotNavTap,
  closeTerminal: mascotHideTerminal,
  hideTerminal: mascotHideTerminal,
  onSwitch: syncViktoriaMenu,
});

// The dashboard views she may open: the same list the Mac allows.
const MASCOT_VIEWS = ['dash', 'board', 'notes', 'friends', 'themes', 'notifications', 'roadmap', 'git'];
function mascotOpenView(view) {
  if (MASCOT_VIEWS.includes(view)) toDash(`openView(${JSON.stringify(view)})`);
}

// A tap of hers on a tab or the like (app.js's __mascotNav allows its own list, a folder's fold in the chats list too).
function mascotNavTap(id) {
  if (typeof id !== 'string' || !id || id.length > 400) return;
  run(dashView, `window.__mascotNav && __mascotNav(${JSON.stringify(id)})`);
}

// Before she hides a terminal the dashboard takes the keys (and no field), so keys still in flight go nowhere instead of
// landing in another terminal that Windows would make the one in front. Every key in the app's windows is dropped for the
// next 0.4 s as well. True only if the dashboard is visible, not minimized, and really has the keys now.
let keysShutUntil = 0;
function parkKeys() {
  if (!dash || dash.isDestroyed() || !dash.isVisible() || dash.isMinimized()) return false;
  keysShutUntil = Date.now() + 400;
  dash.focus();
  if (!dash.isFocused()) {
    keysShutUntil = 0;
    return false;
  }
  const blur = 'document.activeElement && document.activeElement.blur && document.activeElement.blur()';
  pageOf(dashView)?.focus();
  run(dashView, blur);
  return true;
}

// A terminal's status as she judges it: chatInfo calls a window with Codex or Antigravity in it a plain 'terminal', so
// the AI's own status counts then (a busy Codex is never idle).
function mascotStatus(id, c) {
  const status = chatInfo(id, c).status;
  const tool = status === 'terminal' ? engine.live().find((x) => x.ai && x.tab === id) : null;
  return tool ? tool.status : status;
}

// She walked to a terminal's close button and pressed it (or her page asked to hide it). The close only hides the window
// (openChatWindow's close handler): what runs in it goes on, a session is never ended and the typed text stays. Idle
// ones only: a shell or Claude waiting for the user. False only when the keys couldn't be parked (nothing was hidden then).
function mascotHideTerminal(id) {
  const c = chats.get(id);
  if (!c || !c.win || c.win.isDestroyed() || !c.win.isVisible() || c.win.isMinimized() || !terminals.has(id)) return true;
  const status = mascotStatus(id, c);
  if (status !== 'idle' && status !== 'terminal') return true;
  if (!parkKeys()) return false;
  c.win.close();
  return true;
}

// The terminal windows on screen, for her to walk on: only those whose close just hides them can be closed by her.
function mascotTerminals() {
  const out = [];
  const seen = new Set();
  for (const [id, c] of chats) {
    if (!c.win || c.win.isDestroyed() || !c.win.isVisible() || c.win.isMinimized()) continue;
    // A window of several tabs or panes is one for her: the terminal with its keys speaks for it.
    if (seen.has(c.win) || (c.frame.focus !== id && chats.has(c.frame.focus))) continue;
    seen.add(c.win);
    const live = terminals.has(id);
    const status = live ? mascotStatus(id, c) : 'ended';
    out.push({ id, sid: c.sessionId || '', canClose: live, status: status === 'idle' || status === 'busy' || status === 'waiting' ? status : 'idle', win: c.win });
  }
  return out;
}

// View > Show Viktoria follows her switch, whichever way it was flipped.
function syncViktoriaMenu() {
  const item = Menu.getApplicationMenu()?.getMenuItemById('viktoria');
  if (!item) return;
  // Not downloaded yet: "Get Viktoria…" (opens Themes, where the download is); downloaded: her switch.
  item.label = mascotAsset.isReady() ? 'Show Viktoria' : 'Get Viktoria…';
  item.checked = mascot.enabled();
}

// ---------- pushing to the pages ----------
// A window's page, or a view's (the dashboard window's two).
function pageOf(win) {
  if (!win || (typeof win.isDestroyed === 'function' && win.isDestroyed())) return null;
  const wc = win.webContents;
  return wc && !wc.isDestroyed() ? wc : null;
}
// executeJavaScript on a page that is still loading waits for it with a 'did-stop-loading' listener of its own, one per
// call: the burst of pushes at startup piled up past Node's limit of 10 (MaxListenersExceededWarning). So a loading page
// gets one listener, and the scripts wait in line behind it, in order.
const loadingQueue = new WeakMap();
function run(win, js) {
  const wc = pageOf(win);
  if (!wc) return;
  const queued = loadingQueue.get(wc);
  if (queued) return void queued.push(js);
  // Electron waits too before the first navigation (no URL yet), so that counts as loading.
  if (!wc.getURL() || wc.isLoadingMainFrame()) {
    const lines = [js];
    loadingQueue.set(wc, lines);
    wc.once('did-stop-loading', () => {
      loadingQueue.delete(wc);
      if (wc.isDestroyed()) return;
      for (const line of lines) wc.executeJavaScript(`${line}; true`).catch(() => {});
    });
    return;
  }
  wc.executeJavaScript(`${js}; true`).catch(() => {});
}
function send(win, channel, data) {
  const wc = pageOf(win);
  if (wc) wc.send(channel, data);
}
// What a messages panel is told before its page reports "ready" waits for it, as on the Mac: a friend's chat opened
// with a click would otherwise stay empty, and the notices would miss the XP and events of the app's first seconds.
const panelWaiting = new WeakMap();
function runPanel(win, js) {
  const waiting = win && panelWaiting.get(win);
  if (waiting) waiting.push(js);
  else run(win, js);
}
const toDash = (call) => run(dashView, `window.__radar && window.__radar.${call}`);
const toNotices = (call) => runPanel(panels.notices, `window.__messages && __messages.${call}`);
// A note out of the dashboard in a window of its own (notewindow.js), and the community feed's corner window (feedpanel.js).
const noteWindows = createNoteWindows({
  BrowserWindow, screen, dialog, WEB, settings, webPrefs, bootFor, checkPages, ownerView: () => dashView, getDash: () => dash,
  pin: pinToDash, uiScale: () => themes.uiScale(), streamerOn: () => streamer.on, quitting: () => quitting, bg: () => themes.color('--bg'),
  opacity: () => WINDOW_OPACITY, editMenu,
  // A shared note's own parts and the friends' and shared notes' calls, for a note window's page (it has no `cloud`).
  notesSync, social: (method, p, body) => cloud.social(method, p, body), openSignIn,
});
// The network came back (cloud.js onNetBack) or the PC woke up: the shared notes' live lines, the dashboard's pinned note and
// each note window's, try again at once (the Mac's notesNetBack, on both). A line that died while the network was down says
// nothing until something is sent, so the pinned note stopped following the others' edits until it was opened again.
function notesNetBack() {
  run(dashView, 'window.Notes && Notes.netBack && Notes.netBack()');
  noteWindows.netBack();
}
const feedPanel = createFeedPanel({ BrowserWindow, WEB, webPrefs, bootFor, checkPages, home: () => chatHome() });
// AI tools and my notes (notesai.js, notestools.js; the Mac's NotesAI.swift and NotesTools.swift): Settings > Privacy's
// switch, and the notes' eleven tools on the local MCP server (`mcp`, mcp.js), which keeps its pipe open while
// notesAI.access() says so. Asked for lazily: the server is made elsewhere, and a build without it has none (null).
const notesAI = createNotesAI({
  settings, dialog, parent: () => dash, notesStore, noteWindows, terminals, folderOf: terminalFolder, dataDir: app.getPath('userData'), which, childEnvironment,
  // Never from a development check, nor from a run on a Mac (the three tools' settings there are the Mac app's).
  usable: process.platform === 'win32' && !PROBE,
  mcp: () => mcp,
  claudeDirs: () => accounts.all().filter((a) => a.dir).map((a) => a.dir),
});

// The local MCP server (mcp.js, the Mac's Mcp.swift): Claude Desktop and Claude Code on this PC see the AI sessions in the
// app's terminals and, if allowed, type a prompt into one. One per build, as the session host is: the installed app's
// `orbiterm`, a staging one's (packaged, or run from the sources with a profile of its own) `orbiterm-s`, a development
// run's `orbiterm-d`. The notes' tools (item 7, notesai.js) register on it and pass their switch as notesAccess.
const mcp = createMcp({
  settings, engine, terminals, which, codexHooks, source: path.join(__dirname, 'mcpbridge.cs'),
  tag: RELEASE && !STAGING && !profileSuffix() ? '' : RELEASE || profileSuffix() ? 's' : 'd',
  // The terminal's own page (its view), whatever window it's a tab or a pane of.
  chatWindow: (id) => {
    const wc = pageOf(chats.get(id)?.page);
    return wc && { webContents: wc, isDestroyed: () => wc.isDestroyed() };
  },
  parentWindow: () => dash,
  push: (json) => toDash(`mcp(${json})`),
  // Asked only once the app runs (start, refresh), after notesAI is made.
  notesAccess: () => notesAI.access(),
});

// ---------- a worktree's next step: Create PR, Merge, Delete (gitship.js, worktreeship.js; the Mac's WorktreeShip) ----------
// A terminal window in a linked worktree shows a chip and a split button in its header (pages/terminal.js); the chats
// list's worktree folders show its state and have the same items; the sheets open in the overlay (web/worktree-ship.js).
const gitShip = createGitShip({ trash: (p) => shell.trashItem(p) });
// Windows that showed a worktree's chip, ended ones included (no longer in `chats`): webContents id -> { win, id, top }.
const shipWins = new Map();
const worktreeShip = createWorktreeShip({
  git: gitShip, settings, streamer,
  openExternal: (url) => shell.openExternal(url).catch(() => {}),
  openPath: (p) => shell.openPath(p),
  hooks: {
    shownTops: () => new Set([...chats.values()].filter((c) => c.wtTop && c.win && !c.win.isDestroyed() && c.win.isVisible() && !c.win.isMinimized()).map((c) => c.wtTop)),
    listVisible: () => !!dash && !dash.isDestroyed() && dash.isVisible() && !dash.isMinimized(),
    live: (top) => shipLive(top),
    ai: (top, windowId) => shipAI(top, windowId),
    title: (top, windowId) => shipTitle(top, windowId),
    endSessions: (top) => shipEndSessions(top),
    deleted: (top, branch, sha, kept) => shipDeleted(top, branch, sha, kept),
    changed: (top) => shipChanged(top),
    step: (name) => overReady && run(over, `window.Worktree && Worktree.shipStep(${JSON.stringify(String(name))})`),
    showSheet: (kind, top, windowId) => showShip(kind, top, windowId),
    showChanges: (top) => showSourceControl(top),
    ask: (sid, text) => mcp.askFromApp(sid, text),
    keyLabel: () => shortcuts.label(shortcuts.combo('createPR')),
  },
});

// The linked worktree a terminal window is in: its AI's folder, else the one it opened in (null: none). The Mac's hud.wtTop.
function shipTopOf(id, c) {
  const s = engine.live().find((x) => x.tab === id);
  const wi = gitShip.info((s && s.cwd) || c.cwd);
  return wi && wi.linked ? wi.top : null;
}

// What a terminal window's header shows (term:ship), sent when its worktree's status changes or it comes to the front.
function pushShipWindow(id, c) {
  const wc = c && pageOf(c.page);
  if (!wc) return;
  const top = shipTopOf(id, c);
  const was = c.wtTop || null;
  c.wtTop = top;
  const key = wc.id;
  if (!top) {
    if (was) send(c.page, 'term:ship', null);
    shipWins.delete(key);
    return;
  }
  const w = shipWins.get(key);
  // `win`: the terminal's page (its view), and `chat`, for the window its menu opens over.
  const entry = w && w.top === top ? w : { win: c.page, chat: c, id, top, sent: '' };
  shipWins.set(key, entry);
  if (top !== was) worktreeShip.refresh(top);
  shipSend(entry, worktreeShip.headerView(top));
}

// A window's header view, only when it changed (the engine's states come every second or so).
function shipSend(w, view) {
  const json = JSON.stringify(view);
  if (json === w.sent) return;
  w.sent = json;
  send(w.win, 'term:ship', view);
}

// A worktree's status changed: its windows (ended ones too), the chats list and the menu's items follow.
function shipChanged(top) {
  const view = worktreeShip.headerView(top);
  for (const w of shipWins.values()) if (w.top === top) shipSend(w, view);
  pushChats(true);
  syncShipMenu();
}

// The AI chats and terminals open in the worktree `top` (or a worktree inside it, which goes to the Recycle Bin with it):
// the AI sessions, the app's and any outside it, and the app's plain terminals. The Mac's shipLive.
function shipLive(top) {
  const out = [];
  const inside = (cwd) => {
    const wi = cwd ? gitShip.info(cwd) : null;
    return wi ? gitShip.under(wi.top, top) : !!cwd && gitShip.under(cwd, top);
  };
  const live = engine.live().filter((s) => s.status !== 'ended' && inside(s.cwd));
  for (const s of live) {
    // One that runs under another's process (Claude's own `codex exec`) is part of that chat.
    const parent = live.find((o) => o !== s && o.pid && s.pid && runaways.tree(o.pid).some((p) => p.pid === s.pid));
    if (parent) continue;
    const inApp = !!s.tab && chats.has(s.tab) && terminals.has(s.tab);
    out.push({ id: s.sessionId, name: s.ai ? s.name : 'Claude', kind: 'chat', status: s.status, inApp });
  }
  for (const [id, c] of chats) {
    if (!terminals.has(id) || engine.live().some((s) => s.tab === id) || chatInfo(id, c).status !== 'terminal') continue;
    if (inside(c.cwd)) out.push({ id, name: 'terminal', kind: 'terminal', status: 'idle', inApp: true });
  }
  return out;
}

// Who "Ask … to fix" goes to: the AI of the window the sheet dropped from, else the newest live AI chat in the worktree.
// Only those the safe prompt reaches (Claude, Codex, Antigravity, Cursor: the Mac's WorktreeNudge.aiOf). The Mac's shipAI.
function shipAI(top, windowId) {
  const kindOf = (s) => (!s.ai ? 'claude' : s.name === 'Codex' ? 'codex' : s.name === 'Antigravity' ? 'agy' : s.name === 'Cursor' ? 'cursor' : null);
  const ok = (s) => s && s.status !== 'ended' && kindOf(s) && s.tab && chats.has(s.tab);
  const asAI = (s) => ({ name: s.ai ? s.name : 'Claude', sid: s.sessionId, kind: kindOf(s) });
  const live = engine.live();
  const mine = windowId ? live.find((s) => s.tab === windowId && ok(s)) : null;
  if (mine) return asAI(mine);
  const all = live.filter((s) => ok(s) && s.cwd && (gitShip.info(s.cwd) || {}).top === top).sort((a, b) => (b.statusSince || 0) - (a.statusSince || 0));
  return all.length ? asAI(all[0]) : null;
}

// A pull request's title: the window's chat's own, else the newest chat's in the worktree. The Mac's shipTitle.
function shipTitle(top, windowId) {
  const live = engine.live();
  const mine = windowId ? live.find((s) => s.tab === windowId && !s.ai && s.title) : null;
  if (mine) return mine.title.trim();
  const all = live.filter((s) => !s.ai && s.title && s.cwd && (gitShip.info(s.cwd) || {}).top === top).sort((a, b) => (b.statusSince || 0) - (a.statusSince || 0));
  return all.length ? all[0].title.trim() : '';
}

/**
 * Delete worktree: a window's chat or terminal stops, as its End button stops it, but the window stays, ended, until the
 * user closes it (spec 9.2). The Mac's ChatWindowController.endLeavingWindow.
 */
function endLeavingWindow(id) {
  const c = chats.get(id);
  if (!c) return;
  // A window that was closed (hidden, its terminal running on) isn't kept: nobody would see it to close it.
  c.keepWindow = !!c.win && !c.win.isDestroyed() && c.win.isVisible();
  const t = terminals.list().find((x) => x.id === id);
  const tree = t && t.pid ? runaways.tree(t.pid) : [];
  for (const p of tree) ending.set(p.pid, Date.now() + 10_000);
  if (!terminals.end(id) && tree.length) setTimeout(() => runaways.fresh().then(() => runaways.kill(tree)), 3000);
  if (c.sessionId) {
    const live = engine.live().find((s) => s.sessionId === c.sessionId);
    engine.dismiss(c.sessionId, live && live.pid);
  }
  toDash(`terminalGone(${JSON.stringify(id)})`);
}

// Every chat and terminal open in the worktree ends, as their End buttons end them; the windows stay, ended. False when
// something still runs after ten seconds (the Mac waits five; here the session host gives what a terminal ran three
// seconds before it ends it, and the engine sees a process gone a moment later). The Mac's endSessions(in:).
async function shipEndSessions(top) {
  // A window is in it when its AI works there or it opened there (a worktree inside this one counts: it goes too).
  const inside = (id, c) => {
    const t = shipTopOf(id, c);
    return !!t && gitShip.under(t, top);
  };
  for (const [id, c] of chats) if (terminals.has(id) && inside(id, c)) endLeavingWindow(id);
  for (let i = 0; i < 100; i++) {
    const windows = [...chats.entries()].some(([id, c]) => terminals.has(id) && inside(id, c));
    const sessions = shipLive(top).some((x) => x.kind === 'chat' || x.inApp);
    if (!windows && !sessions) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

// The folder is deleted: the ended windows of the worktree say so in their terminals (their chips say "deleted").
function shipDeleted(top, branch, sha, kept) {
  const b = streamer.on ? streamer.fake('branch', branch) : branch;
  const line = `[worktree deleted · the folder is in the Recycle Bin · ${kept ? `branch ${b} kept` : `branch ${b} was ${streamer.on ? '…' : sha}`}]`;
  for (const w of shipWins.values()) if (w.top === top && !terminals.has(w.id)) send(w.win, 'term:data', `\x1b[2m${line}\x1b[0m\r\n`);
}

// Source Control on a folder (the chip, Show Changes): the dashboard in front, its view open on that repo.
function showSourceControl(root) {
  showDashboard();
  run(dashView, `window.GitView && GitView.show(${JSON.stringify(String(root || ''))})`);
}

// The File menu's worktree items for the window in front (the Mac's validateMenuItem): menu id -> { label, enabled }.
// Usable when that window is a worktree's and its status allows it; "Merge into develop…" names that worktree's base, and
// a dimmed item says why in its label (menuLabel: Windows menus show no tooltip).
function shipMenuState() {
  const f = focusedChat();
  const c = f && f[1];
  const top = c && c.wtTop;
  const st = top ? worktreeShip.status(top) : null;
  const its = st && !worktreeShip.isDeleted(top) && !worktreeShip.isBusy(top) ? worktreeShip.items(st) : [];
  const base = st && st.base ? (streamer.on ? streamer.fake('branch', st.base) : st.base) : '';
  const out = {};
  for (const [mid, id, title] of [['shipCreate', 'create', 'Create Pull Request…'], ['shipMerge', 'merge', `Merge into ${base || 'Base Branch'}…`], ['shipDelete', 'delete', 'Delete Worktree…']]) {
    const it = its.find((x) => x.id === id);
    out[mid] = { label: it ? menuLabel(it) : title, enabled: !!(it && it.enabled) };
  }
  return out;
}

// The menu's worktree items follow the window in front and its status. A label can't be changed on a menu that's set
// (Electron reads it when the item is made): the menu is made again, only when a label would differ.
let shipMenuBuilding = false;
function syncShipMenu() {
  const menu = Menu.getApplicationMenu();
  if (!menu) return;
  const want = shipMenuState();
  if (!shipMenuBuilding && Object.entries(want).some(([mid, v]) => menu.getMenuItemById(mid) && menu.getMenuItemById(mid).label !== v.label)) {
    shipMenuBuilding = true;
    try {
      buildMenu(); // which comes back here with the new menu
    } finally {
      shipMenuBuilding = false;
    }
    return;
  }
  for (const [mid, v] of Object.entries(want)) {
    const item = menu.getMenuItemById(mid);
    if (item) item.enabled = v.enabled;
  }
}

// A menu item or its key: the sheet of the window in front.
function shipMenu(id) {
  const found = focusedChat();
  if (!found || !found[1].wtTop) return;
  worktreeShip.handle(id, found[1].wtTop, found[0]);
}

// The chat of the terminal window touched last is the one the chat list marks. Prefer a working/waiting nested AI (Codex,
// etc.) over the parent Claude process if both happen to be under the same shell. The dashboard's top bar shows every AI
// at once and follows no chat.
function touchTerminal(id) {
  // Every key typed comes here: only a change of terminal has anything to tell (a change of what runs in it comes with
  // the engine's state).
  if (id === activeTerminalId) return;
  activeTerminalId = id;
  pushActiveSession();
}
function pushActiveSession(force = false) {
  const rank = (s) => (s.status === 'waiting' ? 0 : s.status === 'busy' ? 1 : 2) + (s.ai ? 0 : 0.1);
  const active = activeTerminalId
    ? engine.live().filter((s) => s.tab === activeTerminalId).sort((a, b) => rank(a) - rank(b))[0]
    : null;
  const c = activeTerminalId ? chats.get(activeTerminalId) : null;
  const sid = (active && active.sessionId) || (c && c.sessionId) || null;
  const chatSid = (active && !active.ai && active.sessionId) || (c && c.sessionId) || sid;
  // Codex or Antigravity started in a plain terminal: once saved, its row in the list has the conversation's id, not the
  // live session's, so the bar marks the row with either (the Mac's best.convId).
  const alt = (active && active.ai && active.convId) || null;
  if (chatlist.setActive(chatSid, alt) || force) {
    run(dashView, `window.__chats && __chats.active(${JSON.stringify(chatSid)}, ${JSON.stringify(alt)})`);
  }
}

// The page's Cloud state, with the Windows app's own updates in it (they come from GitHub releases, not the API).
function cloudState() {
  return { ...cloud.json(), ...updates.state() };
}
const pushCloud = () => toDash(`cloud(${JSON.stringify(cloudState())})`);

// In power save the map draws fewer and smaller frames (power.js); the switch on the map and Settings show it. The map
// hears only when power save comes on or goes off: it sets its quality anew each time.
let mapSaves = null;
function pushPower(force = false) {
  if (force || mapSaves !== power.on()) {
    mapSaves = power.on();
    toDash(`power(${mapSaves})`);
  }
  toDash(`powerSave(${power.json()})`);
}

// Settings · DISCORD shows its switches and whether Discord answers (discord.js). It starts here, after toDash, as it
// tells the page at once.
function pushDiscord() {
  toDash(`discord(${discord.json()})`);
}
discord.start();

// Signing in with GitHub happens in the browser (Settings → Account, account.js): only GitHub's sign-in page opens.
const SIGN_IN = 'https://github.com/login/oauth/authorize?';
function openSignIn(url) {
  if (typeof url !== 'string' || !url.startsWith(SIGN_IN)) return false;
  let u;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.origin !== 'https://github.com' || u.pathname !== '/login/oauth/authorize') return false;
  shell.openExternal(u.href).catch(() => {});
  return true;
}

// The share card (web/share-card.js): its picture to the clipboard or to Downloads, shown in Explorer, and its badges and
// avatars fetched here (sharecard.js, the Mac's CloudBridge share part). The dashboard's page only.
const shareCard = createShareCard({ net, clipboard, ClipboardItem, nativeImage, shell, downloads: () => app.getPath('downloads'), apiBase: API_BASE });

// The terminals' text size, the same in all of them and kept, as the Mac's: View's bigger and smaller text change it
// with a terminal in front (zoom), and Settings sync (account.js) reads it or sets one from the user's other computers.
// Never picked: xterm.js's 14 px, and it doesn't count as chosen (the account's comes in instead).
const TERM_FONT = 14;
const termFontSize = () => {
  const n = Number(settings.get('terminalFontSize'));
  return n >= 9 && n <= 24 ? n : TERM_FONT;
};
function setTermFont(size) {
  const n = Math.min(24, Math.max(9, Math.round(Number(size) || TERM_FONT)));
  settings.set('terminalFontSize', n);
  for (const c of chats.values()) send(c.page, 'term:font', n);
}
// The terminals' font family (termfont.js, the Mac's TerminalFont.swift): the pick, or Windows' usual one. A pick (or ""
// for the usual one) is set and every open terminal changes at once; the answer is what Settings shows.
const termFont = createTermFont({ settings });
async function terminalFont(size, family) {
  if (typeof size === 'number' && Number.isFinite(size)) setTermFont(size);
  if ((typeof family === 'string' || family === null) && (await termFont.set(family))) {
    for (const c of chats.values()) send(c.page, 'term:family', termFont.chosen());
  }
  const n = Number(settings.get('terminalFontSize'));
  return {
    size: termFontSize(), chosen: n >= 9 && n <= 24,
    family: termFont.picked(), current: termFont.current(), usual: termFont.usual(), iterm: false,
  };
}
// View's Zoom In, Zoom Out and Actual Size: in a terminal window its text size (all the terminals', as ⌘+ and ⌘− on the
// Mac); in any other page that page's zoom, as the menu's own roles did.
function zoom(step) {
  const wc = webContents.getFocusedWebContents();
  if (!wc || wc.isDestroyed()) return;
  if ([...chats.values()].some((c) => pageOf(c.page) === wc)) return setTermFont(step ? termFontSize() + step : TERM_FONT);
  wc.setZoomLevel(step ? wc.getZoomLevel() + step * 0.5 : 0);
}

// ---------- windows ----------
function webPrefs() {
  // No DevTools in a released app: its console would reach the app's line to the API.
  return { preload: PRELOAD, contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false, devTools: !RELEASE };
}

// A window shows the app's own pages and nothing else, as on the Mac (RadarView): a page from anywhere else, a file on
// this PC included, would get their line to the app (preload.js), which reaches the shells. A link out of a page opens
// where it belongs instead: a web page in the browser; a file in VS Code (Source Control's link where there's no editor)
// only once the user says so, as on the Mac (SafeOpen.swift): a vscode: link can do more than open a file. Other kinds
// go nowhere, since Windows has handlers for some that run things.
const PAGES = [WEB, path.join(__dirname, '..', 'pages')];
function ownPage(url) {
  let file;
  try {
    file = fileURLToPath(url);
  } catch {
    return false;
  }
  return PAGES.some((dir) => {
    const rel = path.relative(dir, file);
    return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
  });
}

// Permissions. Electron grants every one a page asks for unless the app decides: a script that got into a page could take
// the camera, the microphone or the location without a word, or hand a link to another app's handler from a frame
// will-navigate never sees. The Mac's WKWebView refuses them all. Here too: only the clipboard (the copy buttons, the
// editor's Paste), only for the app's own pages; Viktoria's window gets nothing, and neither does anything without a page
// (a worker). USB, HID, serial and Bluetooth devices: never. Every session the app makes (hers too) gets this.
const PERMITTED = new Set(['clipboard-sanitized-write', 'clipboard-read']);
function permitted(wc, permission, url) {
  if (!PERMITTED.has(permission) || !wc || wc.isDestroyed() || mascot.has(wc)) return false;
  return ownPage(url || wc.getURL());
}
function guardSession(ses) {
  ses.setPermissionRequestHandler((wc, permission, callback, details) => callback(permitted(wc, permission, details && details.requestingUrl)));
  ses.setPermissionCheckHandler((wc, permission, _origin, details) => permitted(wc, permission, details && details.requestingUrl));
  ses.setDevicePermissionHandler(() => false);
  // The pages load the API's own pictures (avatars) by address, which can't carry a header: the API signs those
  // addresses itself (`ak`), and the header is added on the way out too, to the staging API's pictures only (never to
  // anything else a page asks that API for).
  // A shared note's live line (web/notesync.js's socket, …/v1/notes/<id>/sync) is taken by the API only with `Origin:
  // null`, what the Mac's file pages send; Electron's file pages send "file://", so the socket never opened. The app's
  // own pages' socket says null there too; any other origin (a website's) is left for the API to refuse. One listener:
  // a session keeps only the last one set.
  const api = new URL(API_BASE);
  const urls = [`${api.protocol === 'https:' ? 'wss:' : 'ws:'}//${api.host}/v1/notes/*`];
  if (ACCESS_KEY) urls.push(`${api.origin}/v1/avatars/*`);
  ses.webRequest.onBeforeSendHeaders({ urls }, (details, callback) => {
    const h = { ...details.requestHeaders };
    if (/\/v1\/avatars\//.test(new URL(details.url).pathname)) {
      if (ACCESS_KEY) h['x-orbiterm-access'] = ACCESS_KEY;
    } else if (/^\/v1\/notes\/[^/]+\/sync$/.test(new URL(details.url).pathname)) {
      for (const k of Object.keys(h)) if (k.toLowerCase() === 'origin' && h[k] === 'file://') h[k] = 'null';
    }
    callback({ requestHeaders: h });
  });
}
app.on('session-created', guardSession);

// A page that stops answering (the Mac's HangWatchdog, which samples the app then): a line in hangs.log in the app's data
// folder, saying which page, when, and how long until it answered again, so a freeze reported later can be placed.
const HANG_LOG = path.join(app.getPath('userData'), 'hangs.log');
const hungSince = new WeakMap();
function pageName(wc) {
  if (wc === pageOf(dashView)) return 'dashboard';
  if (wc === pageOf(panels.notices)) return 'notices';
  if (wc === pageOf(over)) return 'overlay';
  if (mascot.has(wc)) return 'Viktoria';
  for (const [id, c] of chats) if (wc === pageOf(c.page)) return `terminal ${id.slice(0, 8)}`;
  for (const f of frames) if (wc === pageOf(f.win)) return 'tab bar';
  for (const w of panels.chats.values()) if (wc === pageOf(w)) return 'friends chat';
  return path.basename(String(wc.getURL()).split(/[?#]/)[0]) || 'page';
}
function hangLog(wc, what) {
  if (wc.isDestroyed()) return;
  const now = Date.now();
  let line = `${new Date(now).toISOString()} ${app.getVersion()} ${pageName(wc)} (pid ${wc.getOSProcessId()}): ${what}`;
  if (what === 'unresponsive') hungSince.set(wc, now);
  else if (hungSince.has(wc)) {
    line += ` after ${((now - hungSince.get(wc)) / 1000).toFixed(1)} s`;
    hungSince.delete(wc);
  }
  console.warn('page', line);
  try {
    // About 256 KB at most: past that, the older half goes.
    let size = 0;
    try {
      size = fs.statSync(HANG_LOG).size;
    } catch {}
    if (size > 256 * 1024) fs.writeFileSync(HANG_LOG, fs.readFileSync(HANG_LOG, 'utf8').slice(-128 * 1024).replace(/^[^\n]*\n/, '') + line + '\n');
    else fs.appendFileSync(HANG_LOG, line + '\n');
  } catch (e) {
    console.error('hangs.log:', e.message);
  }
}

app.on('web-contents-created', (_e, contents) => {
  contents.on('unresponsive', () => hangLog(contents, 'unresponsive'));
  contents.on('responsive', () => hungSince.has(contents) && hangLog(contents, 'answering again'));
  // The keys Viktoria's hide of a terminal might still have in flight go nowhere (parkKeys).
  contents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && Date.now() < keysShutUntil) e.preventDefault();
    if (input.key === 'Escape' && Date.now() < escMuteUntil) e.preventDefault();
  });
  // Esc ends a tab or pane drag whichever page has the keys, and no page (the shell included) sees that Esc.
  contents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape' && tabdrag.cancel()) e.preventDefault();
  });
  // A mouse button down in any of the app's pages (not Viktoria's own window): no cursor hold starts, and a running one
  // ends (mascot.appMouse), as the Mac's "never move a cursor that is dragging something".
  contents.on('input-event', (_e, input) => {
    if (mascot.has(contents)) return;
    if (input.type === 'mouseDown') mascot.appMouse(true);
    else if (input.type === 'mouseUp') mascot.appMouse(false);
  });
  contents.on('will-navigate', (e, url) => {
    // Her window never goes anywhere else (mascot.js stops it), and a link out of it opens nothing either.
    if (mascot.has(contents)) return;
    if (ownPage(url)) return;
    e.preventDefault();
    if (/^(https?|mailto):/i.test(url)) shell.openExternal(url).catch(() => {});
    else if (/^vscode:/i.test(url)) askToOpen(url);
  });
});

// A window of the app being dragged by its title bar or resized by an edge holds a button down too (the pages see none of
// it): the same flag for Viktoria's cursor hold, until the move or resize ends.
function watchMoves(w) {
  for (const ev of ['will-move', 'will-resize']) w.on(ev, () => mascot.appMouse(true));
  for (const ev of ['moved', 'resized']) w.on(ev, () => mascot.appMouse(false));
}
app.on('browser-window-created', (_e, w) => watchMoves(w));

// Another app's link: that app opens it once the user says so. Nothing on this PC opens it: nothing happens.
async function askToOpen(url) {
  const name = app.getApplicationNameForProtocol(url);
  if (!name) return;
  const r = await dialog.showMessageBox(dash || undefined, {
    type: 'question', message: `Open this link in ${name}?`, detail: url.length > 300 ? `${url.slice(0, 300)}…` : url,
    buttons: ['Open', 'Cancel'], defaultId: 0, cancelId: 1, noLink: true,
  });
  if (r.response === 0) shell.openExternal(url).catch(() => {});
}

// A right click on text: Cut, Copy, Paste and Select All, the menu the Mac's system opens there. Electron has none of
// its own, and the pages leave text to the system (notes.js and app.js's panelMenu open nothing there). A page that
// opens its own menu (e.g. "Copy" on selected note blocks) stops the event, so this one doesn't come. The items call the
// page directly: a role doesn't reach the dashboard's page, a view in its window. `win` is the window the menu opens on.
function editMenu(wc, win) {
  wc.on('context-menu', (_e, params) => {
    const selected = !!(params.selectionText && params.selectionText.trim());
    if (!params.isEditable && !selected) return;
    const f = params.editFlags || {};
    const live = () => !wc.isDestroyed();
    const items = [
      ...(params.isEditable ? [{ label: 'Cut', accelerator: 'CmdOrCtrl+X', enabled: !!f.canCut, click: () => live() && wc.cut() }] : []),
      { label: 'Copy', accelerator: 'CmdOrCtrl+C', enabled: !!f.canCopy, click: () => live() && wc.copy() },
      ...(params.isEditable ? [{ label: 'Paste', accelerator: 'CmdOrCtrl+V', enabled: !!f.canPaste, click: () => live() && wc.paste() }] : []),
      { type: 'separator' },
      { label: 'Select All', accelerator: 'CmdOrCtrl+A', enabled: f.canSelectAll !== false, click: () => live() && wc.selectAll() },
    ];
    const w = typeof win === 'function' ? win() : win;
    Menu.buildFromTemplate(items).popup({ ...(w && !w.isDestroyed() ? { window: w } : {}), frame: params.frame || undefined });
  });
}

function bootFor(webContents, extra = {}) {
  const look = { font: termFont.current(), size: 13 };
  boots.set(webContents.id, { css: themes.css(), look, ringMouse: shortcuts.ringMouse(), ...extra });
  webContents.once('destroyed', () => boots.delete(webContents.id));
}

// The dashboard's size and place as it was left, and whether it was maximized, as the Mac's frame autosave keeps them:
// in settings.json ("dashboardBounds") with the app's other window state. Only while a display still shows enough of it
// (one unplugged since would open it out of sight), and moved in whole onto that display.
const DASH_MIN = { width: 980, height: 600 };
function keptDashBounds() {
  const b = settings.get('dashboardBounds');
  if (!b || typeof b !== 'object' || ![b.x, b.y, b.width, b.height].every(Number.isFinite)) return null;
  const r = { x: Math.round(b.x), y: Math.round(b.y), width: Math.max(DASH_MIN.width, Math.round(b.width)), height: Math.max(DASH_MIN.height, Math.round(b.height)) };
  const seen = screen.getAllDisplays().some(({ workArea: a }) =>
    Math.min(r.x + r.width, a.x + a.width) - Math.max(r.x, a.x) >= 200 && Math.min(r.y + r.height, a.y + a.height) - Math.max(r.y, a.y) >= 100);
  return seen ? { ...wholeOnDisplay(r), maximized: b.maximized === true } : null;
}
// Kept as it changes (a moment after a drag or a resize ends) and when the window closes. Minimized or full screen, the
// size it had before stays kept.
function keepDashBounds(win) {
  let timer = null;
  const save = () => {
    clearTimeout(timer);
    timer = null;
    if (win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return;
    const b = win.getNormalBounds();
    const next = { x: b.x, y: b.y, width: b.width, height: b.height, maximized: win.isMaximized() };
    // A pixel or two off what's kept is the display scale's rounding (125%: the window comes back a pixel bigger than it
    // was set), not the user: kept as it was, or the window would grow at every launch.
    const was = settings.get('dashboardBounds');
    const near = was && next.maximized === !!was.maximized && ['x', 'y', 'width', 'height'].every((k) => Math.abs(next[k] - was[k]) <= 2);
    if (!near) settings.set('dashboardBounds', next);
  };
  for (const ev of ['resize', 'move', 'maximize', 'unmaximize']) {
    win.on(ev, () => {
      clearTimeout(timer);
      timer = setTimeout(save, 600);
    });
  }
  win.on('close', save);
}

function createDashboard() {
  const area = screen.getPrimaryDisplay().workArea;
  const bg = themes.color('--bg');
  const kept = PROBE ? null : keptDashBounds();
  dash = new BaseWindow({
    width: Math.min(1480, area.width), height: Math.min(900, area.height), minWidth: DASH_MIN.width, minHeight: DASH_MIN.height,
    ...(kept ? { x: kept.x, y: kept.y } : {}),
    title: 'Orbiterm', backgroundColor: bg, show: false, autoHideMenuBar: true,
    ...(PROBE ? { x: -32000, y: -32000, frame: false, width: 1480, height: 900 } : {}),
  });
  const win = dash;
  // The size kept goes on with setBounds, not the constructor: at 125% the constructor makes the window a few pixels
  // bigger than asked, so it grew at every launch.
  if (kept) win.setBounds({ x: kept.x, y: kept.y, width: kept.width, height: kept.height });
  watchMoves(win);
  if (!PROBE) keepDashBounds(win);
  // The app's menu and its keys (Ctrl+N, Ctrl+K, Ctrl+Q…), as the other windows have them.
  if (process.platform !== 'darwin' && Menu.getApplicationMenu()) win.setMenu(Menu.getApplicationMenu());
  dashView = new WebContentsView({ webPreferences: webPrefs() });
  const views = [dashView];
  for (const v of views) {
    v.setBackgroundColor(bg);
    win.contentView.addChildView(v);
    bootFor(v.webContents, v === dashView ? { dashboard: true, demo: DEMO } : {});
    // Links in the pages open in the browser, never inside the app.
    v.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:/.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
    // Reload Dashboard ended a stuck page's renderer and loaded it again already (reloadDashboard): not twice.
    v.webContents.on('render-process-gone', () => setTimeout(() => !v.webContents.isDestroyed() && !(v === dashView && Date.now() - dashRestartedAt < 3000) && v.webContents.reload(), 500));
    // Ctrl+B, the Mac's ⌘B (or the keys set for it): the chats list folds its saved chats away or back (in the terminals
    // it stays the shell's). While Settings › Shortcuts records new keys, every key goes to it, not the page or the menu.
    v.webContents.on('before-input-event', (e, input) => {
      if (v === dashView && shortcuts.recordInput(input)) return e.preventDefault();
      const chatsKeys = shortcuts.combo('chatsList');
      if (input.type === 'keyDown' && chatsKeys && shortcuts.comboOf(input) === chatsKeys) {
        e.preventDefault();
        toggleChats();
      }
    });
  }
  editMenu(dashView.webContents, () => dash);
  // The clicks and keys Windows delivers to the dashboard's page (userInput, for files.js).
  dashView.webContents.on('input-event', (_e, input) => {
    const now = Date.now();
    if (input.type === 'mouseUp' && (!input.button || input.button === 'left')) userInput.press = userInput.any = now;
    else if (input.type === 'keyDown' || input.type === 'rawKeyDown') {
      userInput.any = now;
      // A key comes with `code` and `key` (Electron 45 sends no keyCode here): Enter and Space activate a link.
      if (['Enter', 'NumpadEnter', 'Space'].includes(input.code) || ['Enter', ' '].includes(input.key)) userInput.press = now;
    }
  });
  layout();
  for (const ev of ['resize', 'maximize', 'unmaximize', 'restore', 'enter-full-screen', 'leave-full-screen']) win.on(ev, layout);
  checkPages();
  dashView.webContents.loadFile(path.join(WEB, 'index.html'));
  // The text size Settings keeps, on every load (a reload starts at 100% otherwise).
  dashView.webContents.on('did-finish-load', () => {
    dashView.webContents.setZoomFactor(themes.uiScale());
    pushSide(true);
  });
  // Shown once the dashboard's page is there (no empty window first), or a few seconds on whatever happens.
  let shown = false;
  const show = () => {
    if (shown || win.isDestroyed()) return;
    shown = true;
    if (PROBE) return win.showInactive();
    // Left maximized: maximized again (its kept size is the one it comes back to).
    if (kept && kept.maximized) win.maximize();
    win.show();
    dashView.webContents.focus();
  };
  dashView.webContents.once('did-finish-load', show);
  setTimeout(show, 4000);
  const visibility = () => toDash(`visibility(${win.isVisible() && !win.isMinimized()}, ${!!BaseWindow.getFocusedWindow()})`);
  for (const ev of ['focus', 'blur', 'minimize', 'restore', 'show', 'hide']) win.on(ev, () => setImmediate(visibility));
  for (const ev of ['focus', 'restore', 'show']) win.on(ev, pinAllToDash);
  for (const ev of ['focus', 'restore', 'show']) win.on(ev, () => noteWindows.pinAll());
  // Viktoria walks on the dashboard's surfaces: where it is, how big and whether it shows are hers to know.
  for (const ev of ['move', 'resize', 'minimize', 'restore', 'maximize', 'unmaximize', 'show', 'hide', 'enter-full-screen', 'leave-full-screen']) {
    win.on(ev, () => mascot.dashboardChanged());
  }
  // The dashboard brought to the front by Windows (a terminal in front of it hid, with Ctrl+W or the swapped Esc, or
  // Alt+Tab) is a window with neither page holding the keys: they went nowhere, the menu's (Ctrl+Shift+N, Ctrl+K…)
  // too. Its page gets them then, as showDashboard gives them.
  win.on('focus', () => setImmediate(() => {
    if (win.isDestroyed() || !win.isFocused()) return;
    if (!dashView.webContents.isFocused()) dashView.webContents.focus();
  }));
  // The level-up waits for the app to be in front (the notices' "focus"): the app's focus events are BrowserWindows'.
  win.on('focus', tellFocus);
  win.on('blur', () => setImmediate(tellFocus));
  // Likewise Viktoria's: coming back to the dashboard greets her, leaving it lets go of the cursor.
  win.on('focus', () => setImmediate(() => mascot.focusChanged()));
  win.on('blur', () => setImmediate(() => mascot.focusChanged()));
  // The app in front again: the taskbar buttons flashing for a chat that needs you stop (askAttention); the terminal
  // items of the menu go off while it has the keys.
  win.on('focus', stopAttention);
  for (const ev of ['focus', 'blur']) win.on(ev, () => setImmediate(syncTerminalItems));
  // The File menu's worktree items are off while the dashboard is in front: Ctrl+Shift+P stays Source Control editor's.
  win.on('focus', () => syncShipMenu());
  // Closing the dashboard leaves the chats and terminals open: let them go before it closes, or Windows closes its
  // child windows with it.
  win.on('close', () => {
    for (const c of win.getChildWindows()) if (!c.isDestroyed()) c.setParentWindow(null);
  });
  win.on('closed', () => {
    // A window's views don't go with it: their pages close here.
    for (const v of views) if (!v.webContents.isDestroyed()) v.webContents.close();
    if (dash === win) dash = dashView = null;
    chatsJSON = '';
    winOpenJSON = '';
    stepAside(false);
    mascot.dashboardChanged();
    // The waiting count goes on the terminals' taskbar buttons now (badge).
    badgeKey = '';
    badge();
    quitIfIdle();
  });
}

// ---------- the chats list: a panel of the dashboard's page (web/chats.js), as on the Mac ----------
// Ctrl+B (or the list's own tag) folds its saved chats away and back; the live chats stay. Kept across launches.
const chatsList = { folded: settings.get('sidebarHidden') === true && !DEMO };

function layout() {
  if (!dash || dash.isDestroyed() || dash.isMinimized()) return;
  const [w, h] = dash.getContentSize();
  if (w < 1 || h < 1) return;
  dashView.setBounds({ x: 0, y: 0, width: w, height: h });
}

// The page centres its menus on the whole window, so it needs how far right of the window's edge it starts: nothing sits
// left of it now. Sent again after the page loads or reloads (force).
function pushSide(force) {
  if (!force || !dashView || dashView.webContents.isDestroyed()) return;
  run(dashView, "document.documentElement.style.setProperty('--side-x', '0px')");
}

// Ctrl+B: the page folds the chats list's saved chats away (or back); the state is kept.
function setChatsFolded(on, tellPage) {
  chatsList.folded = !!on;
  settings.set('sidebarHidden', chatsList.folded);
  if (tellPage) run(dashView, `window.__chats && __chats.fold(${chatsList.folded})`);
}
function toggleChats() {
  if (!dash) return;
  setChatsFolded(!chatsList.folded, true);
}

// Tells the dashboard which sessions have a visible chat window (cards light up), as on the Mac.
let winOpenJSON = '';
function pushWinOpen(force) {
  if (!dashView) return;
  const map = {};
  for (const c of chats.values()) {
    if (c.sessionId && (c.steppedAside || (c.win && !c.win.isDestroyed() && c.win.isVisible()))) map[c.sessionId] = true;
  }
  const json = JSON.stringify(map);
  if (json === winOpenJSON && !force) return;
  winOpenJSON = json;
  run(dashView, `window.__winOpen = ${json}`);
}

let chatsJSON = '', chatsVersion = -1;
function pushChats(force) {
  if (!dashView) return;
  const live = chatlist.setLive(engine.live());
  // A chat with a window of the app, shown or not: "in a window".
  const open = chatlist.setOpen([...chats.values()].map((c) => c.sessionId).filter(Boolean));
  if (!force && !live && !open && chatlist.version() === chatsVersion) return;
  chatsVersion = chatlist.version();
  const snap = shipFolders(chatlist.snapshot());
  const json = JSON.stringify(streamer.on ? madeUpChats(snap) : snap);
  if (json === chatsJSON && !force) return;
  chatsJSON = json;
  run(dashView, `window.__chats && __chats.update(${json})`);
}

/**
 * The chats list's folders that are linked worktrees (spec 4.3, the Mac's WorktreeGroupHeader): their state ("+42 −7",
 * "#48 ✓", "merged ✓", "deleted") and the worktree items of their right-click menu. Those worktrees are read while the
 * list shows (worktreeShip.watchList).
 */
function shipFolders(snap) {
  const tops = new Set();
  const folders = {};
  // A worktree's folder sits in its main folder's group in the list (web/chats.js) when that folder is in it: `main` is its key.
  const norm = (p) => path.normalize(String(p || '')).replace(/[\\/]+$/, '').toLowerCase();
  const keyOf = new Map(Object.entries(snap.folders || {}).map(([k, f]) => [norm(f && f.cwd), k]));
  for (const [key, f] of Object.entries(snap.folders || {})) {
    const wi = f && f.cwd ? gitShip.info(f.cwd) : null;
    const top = wi && wi.linked ? wi.top : f && f.cwd && worktreeShip.isDeleted(f.cwd) ? f.cwd : null;
    if (!top) {
      folders[key] = f;
      continue;
    }
    tops.add(top);
    const deleted = worktreeShip.isDeleted(top);
    const st = worktreeShip.status(top);
    const items = worktreeShip.items(st, deleted || worktreeShip.isBusy(top)).filter((x) => ['create', 'merge', 'delete', 'prmerge', 'openpr'].includes(x.id));
    // Its right-click menu is a native one too: a dimmed item's reason goes in its title (menuLabel).
    const main = wi && wi.main ? keyOf.get(norm(wi.main)) : undefined;
    folders[key] = { ...f, wt: { top, branch: (wi && wi.branch) || '', main: main && main !== key ? main : undefined, state: worktreeShip.listState(top), items: items.map((x) => ({ id: x.id, title: menuLabel(x), enabled: x.enabled })) } };
  }
  worktreeShip.watchList([...tops].filter((t) => !worktreeShip.isDeleted(t)));
  return { ...snap, folders };
}

// The chats list in streamer mode: every chat, folder and terminal under the made-up name the dashboard gives it. Their
// ids and folders stay as they are (a click still opens the right one); only what's shown changes.
function madeUpChats(snap) {
  return {
    ...snap,
    // A renamed chat's real title (search's origTitle) goes too.
    rows: snap.rows.map((r) => ({ ...r, title: streamer.fake('title', r.title || r.lastPrompt), lastPrompt: '', origTitle: undefined })),
    terms: snap.terms.map((t) => {
      const title = t.title ? streamer.project(t.title) : t.title;
      return { ...t, title, job: t.job ? streamer.fake('cmd', t.job) : t.job, tip: title || 'terminal' };
    }),
    folders: Object.fromEntries(
      Object.entries(snap.folders).map(([key, f]) => [key, {
        ...f, label: streamer.project(f.cwd), path: streamer.folder(f.cwd),
        ...(f.wt ? { wt: { ...f.wt, branch: streamer.fake('branch', f.wt.branch || '') } } : {}),
      }]),
    ),
  };
}

// The chats list's open folder button: a folder from the system's picker stays at the list's top, with a terminal opened
// in it.
async function openFolder() {
  const r = await dialog.showOpenDialog(dash || undefined, { title: 'Open a folder in the chats list', properties: ['openDirectory'] });
  const d = !r.canceled && r.filePaths && r.filePaths[0];
  if (!d || !fs.existsSync(d)) return null;
  chatlist.pin(d);
  pushChats(true);
  openChatWindow({ cwd: d, claudeArgs: null, title: path.basename(d) || d });
  return d;
}

// The chats list's requests (pages/chats.js).
function handleChats(msg) {
  // A folder on this PC, whatever the page sends: never a file (opening it in Explorer would start a program) nor a
  // network share (merely looking one up hands its host the user's NTLM hash, as files.js keeps from its paths).
  const dir = () => {
    const d = String(msg.cwd || '');
    if (!d || /^[\\/]{2}/.test(d)) return null;
    try {
      return fs.statSync(d).isDirectory() ? d : null;
    } catch {
      return null;
    }
  };
  switch (msg.type) {
    case 'ready':
      pushChats(true);
      pushActiveSession(true);
      pushChatsKeys();
      run(dashView, `window.__chats && __chats.fold(${chatsList.folded})`);
      mascot.pushToPages();
      return true;
    case 'open':
      return openSession(String(msg.id || ''), false);
    case 'fork':
      return openSession(String(msg.id || ''), true);
    case 'newTerminal': {
      const d = dir();
      if (d) openChatWindow({ cwd: d, claudeArgs: null, title: path.basename(d) });
      return true;
    }
    case 'reveal': {
      const d = dir();
      if (d) shell.openPath(d);
      return true;
    }
    case 'copyId':
      if (typeof msg.id === 'string' && msg.id) clipboard.writeText(msg.id);
      return true;
    case 'openFolder':
      return openFolder();
    case 'unpin':
      chatlist.unpin(String(msg.cwd || ''));
      break;
    // One of the app's terminals in a folder: its window comes to the front, or it ends (as its End button does).
    case 'showTerminal':
      return chats.has(msg.id) && terminals.has(msg.id) && showChat(msg.id);
    case 'endTerminal':
      if (chats.has(msg.id)) endTerminalAsked(msg.id);
      return true;
    case 'favorite':
      chatlist.toggleFavorite(String(msg.id || ''));
      // The star on its window's strip follows.
      pushChatInfos();
      break;
    case 'archive':
      chatlist.toggleArchived(String(msg.id || ''));
      break;
    case 'rename':
      chatlist.rename(String(msg.id || ''), String(msg.name ?? ''));
      engine.namesChanged();
      break;
    case 'folders':
      for (const k of Array.isArray(msg.keys) ? msg.keys : []) chatlist.setFolder(String(k || ''), msg.on === true);
      break;
    // The chats picked in the list, into the archive.
    case 'archiveMany':
      chatlist.archiveMany((Array.isArray(msg.ids) ? msg.ids : []).map(String));
      break;
    // Delete…: these chats, or every chat these folders show. Asked first; true when they were deleted.
    case 'delete':
      return deleteChats((Array.isArray(msg.ids) ? msg.ids : []).map(String));
    case 'deleteFolders':
      return deleteChats(chatlist.chatsInFolders((Array.isArray(msg.keys) ? msg.keys : []).map(String)));
    case 'menu':
      return popupMenu(msg.items, msg.at, dashView);
    // A worktree folder's Create Pull Request…, Merge…, Delete Worktree…, Open PR: the sheet stands alone in the middle (no
    // window to drop from), as the Mac's list opens it. Only a linked worktree's own folder.
    case 'ship':
      if (!['create', 'merge', 'delete', 'prmerge', 'openpr'].includes(msg.id) || !worktreeShip.knows(String(msg.top || ''))) return false;
      return worktreeShip.handle(msg.id, String(msg.top), null);
    // The saved chats folded or unfolded from the page itself (its tag, its fold bar, ⌘F opening them): kept.
    case 'closed':
      setChatsFolded(msg.on === true, false);
      return true;
    default:
      throw new Error('unknown request');
  }
  pushChats(true);
  return true;
}

// Delete in the chats list (a chat's menu, a folder's, or the bar over the list while some are picked): asks first, then
// the chats (Claude Code's, Codex's, Antigravity's) leave the list for Settings' deleted chats, where they stay 30 days
// before they're deleted from the PC. Running chats stay: they're ended first. True when chats were deleted.
async function deleteChats(ids) {
  const pick = chatlist.deletable(ids);
  const box = (o) => dialog.showMessageBox(dash || undefined, { noLink: true, ...o });
  const stay = [];
  if (pick.running > 0) stay.push(pick.running === 1 ? '1 running chat stays in the list: end it first.' : `${pick.running} running chats stay in the list: end them first.`);
  if (pick.others > 0) stay.push(pick.others === 1 ? "1 chat that isn't saved yet stays too." : `${pick.others} chats that aren't saved yet stay too.`);
  if (!pick.chats.length) {
    const n = pick.running + pick.others;
    if (!n) await box({ type: 'info', message: 'Nothing to delete', detail: 'There are no saved chats here.' });
    else {
      await box({
        type: 'info', message: n === 1 ? "This chat can't be deleted" : "These chats can't be deleted",
        detail: pick.others ? stay.join('\n') : n === 1 ? "It's running: end it first." : "They're running: end them first.",
      });
    }
    return false;
  }
  const one = pick.chats.length === 1;
  const title = one ? chatlist.shownTitle(pick.chats[0]) : '';
  const r = await box({
    type: 'warning',
    message: one ? `Delete “${clip(streamer.on ? streamer.fake('title', title) : title, 60)}”?` : `Delete ${pick.chats.length} chats?`,
    detail:
      (one
        ? "It stays in Settings › deleted chats for 30 days, where you can put it back. Then it's deleted from this PC for good."
        : "They stay in Settings › deleted chats for 30 days, where you can put them back. Then they're deleted from this PC for good.") +
      (stay.length ? '\n\n' + stay.join('\n') : ''),
    buttons: ['Delete', 'Cancel'], defaultId: 0, cancelId: 1,
  });
  if (r.response !== 0) return false;
  // One that began to run while the question stood stays (the list checks each again).
  chatlist.delete(pick.chats);
  pushChats(true);
  return true;
}

// Settings' deleted chats (web/cloud.js): the chats deleted from the chats list, by folder, with the days each has left
// of its 30; putting one or all back, and deleting one or all from the disk now (asked first: that can't be undone).
async function handleTrash(msg) {
  const sure = async (message, detail) =>
    (await dialog.showMessageBox(dash || undefined, { type: 'warning', message, detail, buttons: ['Delete', 'Cancel'], defaultId: 1, cancelId: 1, noLink: true })).response === 0;
  // The files go in the background; the list here shows them gone at once.
  const erase = (ids) => void chatlist.erase(ids).then(() => pushChats(), (e) => console.error('trash:', e));
  switch (msg.type) {
    case 'list':
      chatlist.emptyExpiredTrash().then(() => pushChats(), (e) => console.error('trash:', e));
      break;
    case 'putBack':
      chatlist.putBack(String(msg.id || ''));
      break;
    case 'putBackAll':
      chatlist.putBackAll();
      break;
    case 'erase': {
      const chat = chatlist.trashed(String(msg.id || ''));
      const title = chat && (streamer.on && chat.title ? streamer.fake('title', chat.title) : chat.title);
      if (chat && (await sure(`Delete “${clip(title || 'untitled', 60)}” now?`, "It's deleted from this PC for good. This can't be undone."))) erase([chat.id]);
      break;
    }
    case 'eraseAll': {
      const ids = chatlist.trashIds();
      const n = ids.length;
      if (n && (await sure(n === 1 ? 'Delete the chat now?' : `Delete all ${n} chats now?`, `${n === 1 ? "It's" : "They're"} deleted from this PC for good. This can't be undone.`))) erase(ids);
      break;
    }
    default:
      throw new Error('unknown request');
  }
  pushChats();
  const folders = chatlist.trashList();
  // Streamer mode: made-up folders and names here too.
  return {
    days: 30,
    folders: !streamer.on ? folders : folders.map((f) => ({
      ...f, cwd: streamer.folder(f.cwd), label: streamer.project(f.cwd),
      chats: f.chats.map((c) => ({ ...c, title: c.title ? streamer.fake('title', c.title) : c.title })),
    })),
  };
}

// Settings' archived chats (web/cloud.js's "archived chats · manage"): the list by folder, and taking a chat, a folder
// or all of them back out.
function handleArchive(msg) {
  switch (msg.type) {
    case 'list':
      break;
    case 'restore':
      chatlist.restore(String(msg.id || ''));
      break;
    case 'restoreFolder':
      chatlist.setFolder(String(msg.cwd || ''), false);
      break;
    case 'restoreAll':
      chatlist.restoreAll();
      break;
    default:
      throw new Error('unknown request');
  }
  pushChats();
  return { folders: chatlist.archivedList() };
}

// The Mac's Dock badge: how many chats need the user (a question, a permission), here as a number on the dashboard's
// taskbar button, or on the terminal windows' while the dashboard is closed (their own buttons then). Drawn by one of
// the app's pages, each number once: the main process has no canvas.
let badgeKey = '';
const badgeIcons = new Map(); // "3", "9+" -> its picture's data URL
const badgedWins = new Set(); // the windows carrying it now
async function badge() {
  if (process.platform !== 'win32') return;
  const n = engine.live().filter((s) => s.status === 'waiting').length;
  const wins = dash && !dash.isDestroyed() ? [dash] : [...new Set([...chats.values()].map((c) => c.win))].filter((w) => w && !w.isDestroyed());
  const key = `${n}|${wins.map((w) => w.id).join(',')}`;
  if (key === badgeKey) return;
  badgeKey = key;
  // The dashboard back: the terminals' buttons lose theirs.
  for (const w of badgedWins) {
    if (wins.includes(w)) continue;
    if (!w.isDestroyed()) w.setOverlayIcon(null, '');
    badgedWins.delete(w);
  }
  if (!n) {
    for (const w of wins) w.setOverlayIcon(null, '');
    badgedWins.clear();
    return;
  }
  const label = n > 9 ? '9+' : String(n);
  let url = badgeIcons.get(label);
  if (!url) {
    const wc = pageOf(dashView) || pageOf(panels.notices) || [...chats.values()].map((c) => pageOf(c.page)).find(Boolean);
    url = wc && (await Promise.race([
      wc.executeJavaScript(
        `(() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
          g.fillStyle = '#e5484d'; g.beginPath(); g.arc(16, 16, 16, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#fff'; g.font = 'bold ${label.length > 1 ? 15 : 21}px "Segoe UI", sans-serif'; g.textAlign = 'center';
          g.textBaseline = 'middle'; g.fillText(${JSON.stringify(label)}, 16, 17); return c.toDataURL(); })()`,
      ).catch(() => null),
      new Promise((r) => setTimeout(() => r(null), 3000)),
    ]));
    // No page ready yet (the app just started): the next state, or the next round of the 2 s timer, tries again.
    if (typeof url !== 'string' || !url.startsWith('data:image/')) return void (badgeKey === key && (badgeKey = ''));
    badgeIcons.set(label, url);
  }
  if (badgeKey !== key) return;
  const img = nativeImage.createFromDataURL(url);
  for (const w of wins) {
    if (w.isDestroyed()) continue;
    w.setOverlayIcon(img, `${n} waiting for you`);
    badgedWins.add(w);
  }
}

// ---------- a chat that needs you, while the app is behind ----------
// A chat that starts waiting for the user (a question, a permission) or a chat in one of the app's windows that finishes
// its turn, while another app is in front: its window's taskbar button flashes (the dashboard's when its window is
// hidden), as the Mac bounces its Dock icon (MainWindowController's requestUserAttention), until the app comes to the
// front.
let lastStatus = new Map(); // session -> its status at the last state
const flashing = new Set();
function askAttention() {
  const live = engine.live();
  const front = appInFront();
  let first = null;
  for (const s of live) {
    const before = lastStatus.get(s.sessionId);
    if (!first && !front && before && before !== s.status && (s.status === 'waiting' || (s.status === 'idle' && s.host === 'app'))) first = s;
  }
  lastStatus = new Map(live.map((s) => [s.sessionId, s.status]));
  if (!first) return;
  const own = [...chats.entries()].find(([id, c]) => first.tab === id || (c.sessionId && c.sessionId === first.sessionId));
  attend(own && own[1].win);
}
// Flashes `win` when it's on the taskbar, else the dashboard.
function attend(win) {
  const shows = (w) => !!w && !w.isDestroyed() && (w.isVisible() || w.isMinimized());
  const w = shows(win) ? win : shows(dash) ? dash : null;
  if (!w || w.isFocused()) return;
  w.flashFrame(true);
  flashing.add(w);
}
function stopAttention() {
  for (const w of flashing) if (!w.isDestroyed()) w.flashFrame(false);
  flashing.clear();
}

function showDashboard() {
  if (!dash) createDashboard();
  if (dash.isMinimized()) dash.restore();
  dash.show();
  dash.focus();
  dashView.webContents.focus();
}

// ---------- Source Control's editor: files from the terminals, new files ----------
// A file in Source Control's editor, in a tab of its own (or the one it has), at `line`; `cwd`: the folder its path is
// shown from (the terminal's).
function showFileInEditor(p, line, column, cwd) {
  const spec = { path: p, cwd: cwd || path.dirname(p), home: os.homedir() };
  if (line) spec.line = line;
  if (column) spec.column = column;
  showDashboard();
  pageOf(dashView)?.focus();
  run(dashView, `window.GitView && GitView.openFile(${JSON.stringify(spec)})`);
}

// A path Ctrl-clicked in a terminal: a text file in Source Control's editor, as VS Code opens one; anything else in its
// app (a program shown in its folder instead).
function openTerminalFile(target, cwd) {
  if (!target) return;
  if (!files.canOpen(target.path)) return files.openOutside(target.path);
  files.allow(target.path);
  showFileInEditor(target.path, target.line, target.column, cwd);
}

// Ctrl+N: a new file in Source Control's editor (VS Code's Untitled-1), from any window.
function newFile() {
  showDashboard();
  pageOf(dashView)?.focus();
  run(dashView, 'window.GitView && GitView.newFile()');
}

// ---------- the dashboard's requests (the "radar" handler) ----------
// Clean Up's requests (its run ends processes and terminals; its log, settings and Task Manager go with it): the
// dashboard's page only, as on the Mac, where only RadarView's web view has the radar handler. The pages that send them
// (cleanup.js, danger.js, cloud.js) are in index.html alone; a terminal's page, the chats list or the notices can't.
// The spaceship's banner and its 🚀 state (attack.js) too: only the dashboard's Attack sends them (the panels' copy only
// draws), so a chat page can't put up a DANGER banner or a Fire back of its own.
const DASHBOARD_RADAR = new Set(['cleanupOpen', 'cleanupView', 'cleanupList', 'cleanupRun', 'cleanupRetry', 'cleanupHalt', 'cleanupDismiss',
  'cleanupLog', 'cleanupPrefs', 'openActivityMonitor', 'attackSeen', 'attack', 'attackBtn']);

// A spaceship attack (attack.js) while no window of the app has the keys: Windows can't tell the dashboard beside another
// app's windows from one under them with the focus alone, so the window list (deskhelper.js, front to back) is read:
// true when the dashboard is shown, not minimized, and under 60% covered by windows in front of it: another app's, always
// on top or not, and the app's own chats, terminals and notes; the app's own always-on-top ones (the notices, Viktoria,
// the feed, a note kept on top) never count. Nothing here shows, raises or focuses a window. No helper (or no answer in
// time): false, the banner alone, as before.
const attackDesk = createDesk();
async function dashExposed() {
  if (!dash || dash.isDestroyed() || !dash.isVisible() || dash.isMinimized()) return false;
  if (BaseWindow.getFocusedWindow()) return true; // one of the app's own windows is in front: the page's `behind` is off then
  const list = await attackDesk.windows();
  if (!list) return false;
  let me = 0;
  try {
    const b = dash.getNativeWindowHandle();
    me = b.length >= 8 ? Number(b.readBigUInt64LE(0)) : b.readUInt32LE(0);
  } catch {}
  const at = list.findIndex((w) => w.hwnd === me);
  if (at < 0) return false; // on another virtual desktop, cloaked
  let box;
  try {
    box = screen.dipToScreenRect(dash, dash.getBounds());
  } catch {
    return false;
  }
  const over = list.slice(0, at).filter((w) => !(w.pid === process.pid && w.topmost));
  const N = 24;
  let seen = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const x = box.x + ((i + 0.5) / N) * box.width, y = box.y + ((j + 0.5) / N) * box.height;
      if (!over.some((w) => x >= w.l && x < w.r && y >= w.t && y < w.b)) seen++;
    }
  }
  return seen / (N * N) > 0.4;
}

function handleRadar(msg) {
  switch (msg.type) {
    case 'attackSeen':
      return dashExposed();
    case 'ready':
      // A reloaded page has no menu open, and starts its feed over: lines from the old one would never dissolve.
      stepAside(false);
      feedPanel.clearIfCreated();
      engine.requestInit();
      pushWinOpen(true);
      pushCloud();
      pushTerminals(true);
      toDash(`runaways(${runaways.json()})`);
      pushActiveSession(true);
      pushPower(true);
      pushDiscord();
      mcp.push();
      mascot.pushToPages();
      // A reloaded page has Clean Up's view closed; it hears the settings (Settings › General › memory) and the line.
      cleanup.viewChanged(false);
      cleanup.pushPrefs();
      cleanup.pushMemory(true);
      return true;
    // Clean Up (cleanup.js, web/cleanup.js): the view opened or closed, the list asked for, the run and what goes with
    // it, the line's ×, the settings, the log and Task Manager.
    case 'cleanupOpen':
      return showCleanup(), true;
    case 'cleanupView':
      return cleanup.viewChanged(msg.open === true), true;
    case 'cleanupList':
      return cleanup.pushList(true), true;
    case 'cleanupRun':
    case 'cleanupRetry':
      return cleanup.run(Array.isArray(msg.items) ? msg.items : []), true;
    case 'cleanupHalt':
      return cleanup.halt(), true;
    case 'cleanupDismiss':
      return cleanup.dismiss(), true;
    case 'cleanupLog':
      return cleanup.showLog(), true;
    case 'cleanupPrefs':
      return cleanup.setPrefs(msg), true;
    case 'openActivityMonitor':
      return cleanup.openTaskManager(), true;
    // Viktoria (app.js, cloud.js, settings.js): her switch and mischief, the dashboard's surfaces she walks on, and a real
    // click on the theme chooser (she may sulk at the cursor).
    case 'mascotEnabled':
      return mascot.setEnabled(msg.on === true), true;
    // The pak's download (cloud.js, settings.js): start, stop, and remove it (her switch off, the file deleted).
    case 'mascotGet':
      return mascotAsset.get(), true;
    case 'mascotCancel':
      return mascotAsset.cancel(), true;
    case 'mascotRemove':
      return mascotAsset.remove(), true;
    case 'mascotMischief':
      return mascot.setMischief(typeof msg.level === 'number' && Number.isFinite(msg.level) ? msg.level : 3), true;
    case 'mascotThemeGuard':
      return mascot.onThemeChooserOpened(), true;
    case 'mascotPanels':
      return mascot.updateWebPanels(msg.panels, msg.nav), true;
    // Power save: the switch on the map, and Settings' "on by itself at low battery".
    case 'powerSave':
      return power.choose(msg.on === true), true;
    case 'powerSaveAuto':
      return power.setAuto(msg.on === true), true;
    // Settings · DISCORD: what you're doing on your Discord profile, the project's name and today's active time in it.
    case 'discordPresence':
      return discord.setEnabled(msg.on === true), true;
    case 'discordProject':
      return discord.setShowProject(msg.on === true), true;
    case 'discordActive':
      return discord.setShowActive(msg.on === true), true;
    case 'open':
      return openSession(msg.sid, false);
    case 'fork':
      return openSession(msg.sid, true);
    case 'newTerminal':
      return showOverlay('Overlay.newTerminal()');
    case 'openTerminal':
      // A car: its window comes up in front, a closed one too (its terminal ran on out of sight).
      return chats.get(msg.id) && showChat(msg.id);
    case 'endLeftover':
      return runaways.endLeft(msg.pid, msg.started);
    case 'endSession':
      return endSession(msg.sid);
    case 'endRunaway':
      return runaways.end(msg.pid, msg.started);
    // A menu (friends, settings, an update) opened or closed on the dashboard: the windows pinned above it step out of
    // the way meanwhile, as on the Mac.
    case 'modal':
      return stepAside(msg.open === true);
    // A note out of the dashboard in its own window, closed from the dashboard, the dashboard's notes loaded (the notes
    // left out at the last quit come back), a note hidden from AI or shown again (its window's eye follows), and the
    // community feed's lines (the corner window draws them).
    case 'noteWindow':
    case 'noteWindowClose':
    case 'notesReady':
    case 'noteAiHidden':
      return noteWindows.radar(msg);
    case 'feedLine':
    case 'feedOut':
    case 'feedClear':
      return feedPanel.radar(msg);
    // The bell's "Replay animation" (inbox.js): a badge's reveal again, over whatever is in front.
    case 'badgeReveal':
      if (typeof msg.id === 'string' && msg.id && msg.id.length <= 64) {
        toNotices(`reveal && __messages.reveal(${JSON.stringify(msg.id)}, ${Math.min(Math.max(Math.trunc(Number(msg.tier)) || 1, 1), 99)})`);
      }
      return true;
    // What's new and the tips: the page asks for what it can't know, and says when the notes of the version that came by
    // itself were opened.
    case 'whatsNew':
      return pushWhatsNew(), true;
    case 'whatsNewRead':
      return settings.set('whatsNewUnread', null), true;
    // Streamer mode (the switch on the map): the chats list, the chat windows and the notices show made-up names too.
    case 'streamer':
      if (streamer.set(msg.on === true)) {
        noteWindows.setStreamer(streamer.on);
        pushChats(true);
        pushChatInfos();
      }
      return true;
    // Two chats began (or stopped) writing the same file (files.heat): the corner's notice, as a chat that needs you.
    case 'clash': {
      const key = typeof msg.key === 'string' ? msg.key : '';
      if (!key) return true;
      const str = (v) => (typeof v === 'string' ? v : '');
      const notice = { key, file: str(msg.file), path: str(msg.path), chats: Array.isArray(msg.chats) ? msg.chats.map(String) : [] };
      toNotices(`clash && __messages.clash(${JSON.stringify(notice)})`);
      return true;
    }
    case 'clashOver':
      if (typeof msg.key === 'string') toNotices(`clashOver && __messages.clashOver(${JSON.stringify(msg.key)})`);
      return true;
    // A friend's spaceship attack (attack.js): the dashboard says who fired, when the DANGER banner shows (ms from now)
    // and whether it sounds the alarm; the notices window shows it over whatever is in front, every click passing
    // through, as the Mac's MessagePanel.attack (Messages.swift).
    case 'attack': {
      const delay = Number(msg.delay);
      const banner = {
        name: String(typeof msg.name === 'string' ? msg.name : '').slice(0, 40),
        kind: msg.kind === 'lock' || msg.kind === 'lost' || msg.kind === 'hit' ? msg.kind : 'danger',
        delay: Number.isFinite(delay) ? Math.min(Math.max(delay, 0), 5000) : 0,
        sound: msg.sound === true,
        avatar: String(typeof msg.avatar === 'string' ? msg.avatar : '').slice(0, 2048),
        taunt: msg.taunt === true,
      };
      runPanel(panels.notices, `window.Attack && Attack.banner && Attack.banner(${JSON.stringify(banner)})`);
      return true;
    }
    // The dashboard's 🚀 for a friend changed state (locking, flight, idle): the notices card and every chat page redraw
    // their Fire back from it, as the Mac's MessagePanel.attackBtn.
    case 'attackBtn': {
      if (typeof msg.id !== 'string' || !msg.id || msg.id.length > 64) return true;
      if (!['locking', 'flight', 'idle'].includes(msg.state)) return true;
      const until = Number(msg.until);
      const js = `window.__messages && __messages.attackBtn && __messages.attackBtn(${JSON.stringify({ id: msg.id, state: msg.state, until: Number.isFinite(until) ? until : 0 })})`;
      runPanel(panels.notices, js);
      for (const w of panels.chats.values()) if (w && !w.isDestroyed()) runPanel(w, js);
      return true;
    }
    case 'log':
      console.log('dashboard page:', msg.msg);
      return true;
    default:
      return true;
  }
}

// ---------- terminal and chat windows ----------
// Terminal and friend-chat windows ride above the dashboard as its children, so clicking the dashboard never buries
// them, while going behind other apps with it; when a menu opens on the dashboard they step out of its way.
let modalOpen = false;
// The terminal windows pinned on top of every app (their strip's pin, term:pin): never the dashboard's children then.
const pinnedWins = new WeakSet();
function pinToDash(win) {
  if (PROBE || !win || win.isDestroyed() || win.isMinimized()) return;
  const parent = !modalOpen && !pinnedWins.has(win) && dash && !dash.isDestroyed() && dash.isVisible() && !dash.isMinimized() ? dash : null;
  if (win.getParentWindow() !== parent) win.setParentWindow(parent);
}
function pinAllToDash() {
  if (modalOpen || !dash || dash.isDestroyed() || !dash.isVisible() || dash.isMinimized()) return;
  for (const c of chats.values()) if (!c.steppedAside && c.win && !c.win.isDestroyed() && c.win.isVisible() && !c.win.isMinimized()) pinToDash(c.win);
  for (const w of panels.chats.values()) if (!w.steppedAside && !w.isDestroyed() && w.isVisible()) pinToDash(w);
}
function stepAside(open) {
  modalOpen = open;
  noteWindows.stepAside(open);
  for (const c of chats.values()) {
    if (!c.win || c.win.isDestroyed()) continue;
    // One pinned on top stays, as on the Mac: it floats above the dashboard's menus as above every app.
    if (open && c.win.isVisible() && !c.win.isMinimized() && !c.steppedAside && !c.pinned) {
      c.steppedAside = true;
      c.win.setParentWindow(null);
      c.win.hide();
    } else if (!open && c.steppedAside) {
      c.steppedAside = false;
      pinToDash(c.win);
      c.win.showInactive();
    }
  }
  for (const w of panels.chats.values()) {
    if (w.isDestroyed()) continue;
    if (open && w.isVisible() && !w.steppedAside) {
      w.steppedAside = true;
      w.setParentWindow(null);
      w.hide();
    } else if (!open && w.steppedAside) {
      w.steppedAside = false;
      pinToDash(w);
      w.showInactive();
    }
  }
  return true;
}

function chatInfo(id, c) {
  const s = engine.live().find((x) => !x.ai && (x.tab === id || (c.sessionId && x.sessionId === c.sessionId)));
  // A chat with no live Claude after its first seconds is a terminal: Claude exited, or never started (not installed).
  const starting = c.claude && Date.now() - c.startedAt < 15_000;
  const status = !terminals.has(id) ? 'ended' : s ? s.status : starting ? 'busy' : 'terminal';
  // Another AI tool running in it (Codex, Antigravity…): the page leaves it the keys it needs (terminal.js).
  const tool = engine.live().find((x) => x.ai && x.tab === id);
  // The conversation's title (as renamed in the chats list, else the one the AI gave it), else the session's name, never
  // the first 8 characters of its id the engine falls back on, as the Mac's realTitle; else what the window was opened
  // as (a plain terminal: its folder).
  const named = (x) => (x && x.name && x.name !== String(x.sessionId || '').slice(0, 8) ? x.name : '');
  const convTitle = s
    ? chatlist.title(s.sessionId) || s.title || named(s)
    : tool ? (tool.convId && chatlist.title(tool.convId)) || tool.title || '' : '';
  // Streamer mode: the made-up project and folder the dashboard shows, and frosted glass over the terminal (what it
  // prints can't be swapped for made-up text).
  const on = streamer.on;
  // A name typed for its tab or pane (Rename) before all that, as the Mac's tabName.
  const named2 = tabName(id);
  const title = named2 ? (on ? streamer.fake('title', named2) : named2)
    : !on ? convTitle || c.title : convTitle ? streamer.fake('title', convTitle) : streamer.name(c.title);
  const folderName = path.basename(String(c.cwd || '').replace(/[\\/]+$/, '')) || c.cwd || '';
  // The AI session running in it (Claude, else Codex or Antigravity): its star in the chats list, its context and today's
  // counts on the strip, as each tab's chip shows them on the Mac. A plain terminal has neither.
  const ai = s || tool;
  const fav = favoriteIds(s, tool).some((x) => chatlist.isFavorite(x));
  return {
    title, project: on ? streamer.project(c.cwd) : folderName,
    status: status === 'shell' ? 'idle' : status, cwd: on ? streamer.folder(c.cwd) : tildify(c.cwd),
    // The tool's own status (idle, busy, waiting): Antigravity's Esc Esc rewind acts only while it waits for you.
    tool: tool ? tool.name : null, toolStatus: tool ? tool.status : null, streamer: on, chat: !!ai, fav,
    stats: ai ? { ctx: ai.ctx || 0, ctxMax: ai.ctxMax || 0, tools: ai.tools || 0, web: ai.web || 0, errors: ai.errors || 0 } : null,
    // What the Mac's header and footer show of the AI at work (Engine/Model.swift's SessionBrief): its model and effort,
    // today's cost, the last minutes' activity, its subagents running, the tool it runs now, what it waits for, since when.
    model: (ai && ai.model) || '', effort: (ai && ai.effort) || '', cost: (ai && Number(ai.cost)) || 0,
    spark: ai && Array.isArray(ai.spark) ? ai.spark : [], agentsRunning: (ai && ai.agentsRunning) || 0,
    action: ai && ai.actionName ? { name: ai.actionName, cat: ai.actionCat || '', label: on ? '' : ai.actionLabel || '', since: ai.actionSince || 0 } : null,
    waitingFor: ai && ai.waitingFor ? (on ? streamer.fake('wait', ai.waitingFor) : ai.waitingFor) : null,
    statusSince: (ai && ai.statusSince) || 0,
    pinned: !!c.pinned,
    // Its Claude account (the chip and the notes under the strip), with two or more accounts; null with one, or another AI.
    acct: acctWin.view(id, c, s, tool),
    // Copy Claude's Last Reply has a reply to copy: Claude, Codex or Antigravity runs here (mcp.js reads their records).
    canCopyReply: !!s || (!!tool && ['Codex', 'Antigravity'].includes(tool.name)),
  };
}

// A window's strip (term:info) and its title, which Windows' taskbar and the Window menu show: "project · title", as
// the Mac names a window by its conversation. The page's own document.title doesn't reach the window (openChatWindow).
// Returns the info, sent or not (the engine's state reads its status for the worktree's chip).
function sendInfo(id, c) {
  const info = chatInfo(id, c);
  if (!c.win || c.win.isDestroyed()) return info;
  // A window of several tabs or panes is named by the one with its keys; the tab bar shows the others (pushBar).
  const f = c.frame;
  f.last.set(id, info);
  const name = info.project && info.title && info.title !== info.project ? `${info.project} · ${info.title}` : info.title || info.project || 'Orbiterm';
  if (f.focus === id && c.win.getTitle() !== name) {
    c.win.setTitle(name);
    windowsChanged();
  }
  send(c.page, 'term:info', info);
  if (f.views.size > 1) pushBar(f);
  return info;
}

// The ids a chat window's star can mean in the chats list: Claude's session, or another AI tool's conversation (listed
// by it once saved) or its live session.
const favoriteIds = (s, tool) => (s ? [s.sessionId] : tool ? [tool.convId, tool.sessionId].filter(Boolean) : []);
const pushChatInfos = () => {
  for (const [id, c] of chats) sendInfo(id, c);
};

const tildify = (p) => (p && p.startsWith(os.homedir()) ? '~' + p.slice(os.homedir().length) : p || '');

// ---------- several Claude accounts (the Mac's ClaudeAccountsBridge.swift and ClaudeAccountsChat.swift) ----------
// What a terminal window shows of them is acctwin.js's (the chip, the notes, the menu); this is what acts on a click. The
// rules: an account is only ever switched by a click of the user's (After This Reply is one), nothing counts down or
// rotates, no usage endpoint is asked, no Claude token is read, and the account of a pane never changes by itself.
/** The account a pane's shell starts with: { id, dir } (dir null: the default one), or null for none set. */
const spawnAccount = (c) => {
  const a = c.account && accounts.account(c.account);
  return a ? { id: a.id, dir: a.dir } : null;
};
/** Settings › Claude's "Sign in…": a terminal runs Claude's own `claude auth login` under the account's folder. */
function openSignInTerminal(id) {
  const a = accounts.account(id);
  if (!a || !a.dir) return;
  openChatWindow({ cwd: os.homedir(), claudeArgs: ['auth', 'login'], title: 'Sign in to Claude', account: id });
}
/** How many Claude chats run under an account (an account with some can't be removed). */
const accountChatCount = (id) => engine.live().filter((s) => !s.ai && (s.account || 'default') === id).length;
function accountsChanged() {
  try {
    engine.namesChanged();
    pushChatInfos();
    if (app.isReady()) buildMenu();
  } catch {}
}
/** The dashboard's Settings on Claude, with the add form when asked (the chip's "Add / Manage Claude Accounts…"). */
function openAccountSettings(add) {
  showDashboard();
  run(dashView, `window.ClaudeAcct && ClaudeAcct.openSettings(${add ? 'true' : 'false'})`);
}
const liveClaude = (id, c) => engine.live().find((x) => !x.ai && (x.tab === id || (c.sessionId && x.sessionId === c.sessionId)));

/**
 * Goes on in pane `id` with another account: its Claude is hung up and the same pane starts `claude --resume <sid>` with the
 * new account's folder (no line is typed); a plain terminal starts a new shell with it. The keys typed meanwhile wait, 3 s at
 * most. Returns whether it started.
 */
function switchAccount(id, toId) {
  const c = chats.get(id);
  const to = accounts.account(toId);
  // A switch already under way in this pane (its keys are held): this one waits for the user's next click.
  if (!c || !to || !terminals.has(id) || c.hold) return false;
  const s = liveClaude(id, c);
  if (acctWin.idOf(c, s) === to.id) return false;
  const from = accounts.account(acctWin.idOf(c, s)) || accounts.defaultAccount();
  const fills = acctWin.fillsOf(from);
  // Only a live Claude chat goes on (`--resume`); anything else (a plain terminal, a chat whose Claude ended, the sign-in
  // terminal) restarts as a plain shell in its folder, as on the Mac: its old command (`auth login`, a new chat) never runs
  // again by itself under the other account.
  const claudeArgs = s && s.sessionId ? ['--resume', s.sessionId] : null;
  c.hold = [];
  const holdTimer = setTimeout(() => (c.hold = null), 3000);
  const release = () => {
    clearTimeout(holdTimer);
    const kept = c.hold;
    c.hold = null;
    if (kept && kept.length && terminals.has(id)) terminals.write(id, kept.join(''));
  };
  const ok = terminals.restart(id, { claudeArgs, account: { id: to.id, dir: to.dir }, done: release });
  if (!ok) return release(), false;
  c.account = to.id;
  c.claudeArgs = claudeArgs;
  c.claude = !!claudeArgs;
  c.startedAt = Date.now();
  if (s) {
    acctWin.pending.delete(s.sessionId);
    acctWin.setWent(id, acctWin.wentNote(to, from.label, fills));
    // The repo's next default in the pickers, as the Mac's acctPerform.
    overlay.top(s.cwd || c.cwd).then((top) => top && accounts.remember(to.id, top), () => {});
  }
  sendInfo(id, c);
  return true;
}

/** A pick in the chip's menu. Claude working asks first; a job in a plain terminal does too. */
async function pickAccount(id, toId) {
  const c = chats.get(id);
  const to = accounts.account(toId);
  if (!c || !to || !terminals.has(id)) return;
  const s = liveClaude(id, c);
  if (acctWin.idOf(c, s) === to.id) return;
  const win = c.win && !c.win.isDestroyed() ? c.win : undefined;
  if (s && (s.status === 'busy' || s.status === 'waiting')) {
    const r = await dialog.showMessageBox(win, {
      type: 'question', noLink: true, defaultId: 0, cancelId: 2,
      message: `Continue this chat with ${to.label}?`,
      detail: `Claude is still answering. After this reply, the same chat goes on with ${to.label} without stopping. Continue Now stops the reply here.`,
      buttons: ['After This Reply', 'Continue Now', 'Cancel'],
    });
    if (!chats.has(id)) return;
    if (r.response === 0) {
      acctWin.pending.set(s.sessionId, to.id);
      sendInfo(id, c);
    } else if (r.response === 1) switchAccount(id, to.id);
    return;
  }
  if (!s && paneRuns(id)) {
    const r = await dialog.showMessageBox(win, {
      type: 'warning', noLink: true, defaultId: 0, cancelId: 1,
      message: `Restart this terminal with ${to.label}?`, detail: 'What runs in it stops.', buttons: ['Restart', 'Cancel'],
    });
    if (r.response !== 0 || !chats.has(id)) return;
  }
  switchAccount(id, to.id);
}

/** The chip's menu for pane `id` (acctwin.js builds it; the Window menu's "Claude Account…" shows it too). */
function acctMenuFor(id) {
  const c = chats.get(id);
  if (!c || !accounts.multiple()) return null;
  const s = liveClaude(id, c);
  return acctWin.menuTemplate(id, c, s, {
    pick: (to) => pickAccount(id, to),
    pend: (to) => {
      if (s) acctWin.pending.set(s.sessionId, to);
      sendInfo(id, c);
    },
    cancel: () => {
      if (s) acctWin.pending.delete(s.sessionId);
      sendInfo(id, c);
    },
    now: (to) => {
      if (s) acctWin.pending.delete(s.sessionId);
      switchAccount(id, to);
    },
    settings: openAccountSettings,
  });
}
ipcMain.on('term:acctMenu', (e, at) => {
  const found = chatOf(e);
  if (!found) return;
  const [id, c] = found;
  const template = acctMenuFor(id);
  if (!template || !c.win || c.win.isDestroyed()) return;
  const z = e.sender.getZoomFactor() || 1;
  // Menu.popup's place is in the window's own coordinates: the page's view place in it, and the chip's place in the page.
  const b = (c.page.getBounds && c.page.getBounds()) || { x: 0, y: 0 };
  const pos = at && Number.isFinite(at.x) && Number.isFinite(at.y) ? { x: b.x + Math.round(at.x * z), y: b.y + Math.round(at.y * z) } : {};
  send(c.page, 'term:acctMenu', true);
  Menu.buildFromTemplate(template).popup({ window: c.win, ...pos, callback: () => send(c.page, 'term:acctMenu', false) });
});
// A note's button (the limit note's "Continue with …", the 5% note's "After this reply", "Not now", "Dismiss"): the user's click.
ipcMain.on('term:acctNote', (e, q) => {
  const found = chatOf(e);
  if (!found || !q || typeof q !== 'object' || !['continue', 'notNow', 'dismiss'].includes(q.action)) return;
  const [id, c] = found;
  const r = acctWin.noteAction(id, { action: q.action, to: typeof q.to === 'string' ? q.to : '', now: true });
  if (r && r.to) switchAccount(id, r.to);
  else sendInfo(id, c);
});


/**
 * Which conversation a chat window shows. The engine finds a chat's Claude under the window's shell (`tab`), and that
 * always wins, also over a guess made before it came; until then a new chat takes the first live session in its folder.
 * A chat that outlived the last launch waits for the engine: the guess could take another chat in the same folder.
 */
function matchChats() {
  const live = engine.live();
  for (const s of live) {
    const c = !s.ai && s.tab && chats.get(s.tab);
    if (!c || c.sessionId === s.sessionId) continue;
    // A session the engine places in this window too keeps it (a Claude started inside the chat's Claude doesn't take
    // its window); a guess gives way.
    if (!live.some((x) => x.sessionId === c.sessionId && x.tab === s.tab)) c.sessionId = s.sessionId;
  }
  for (const [id, c] of chats) {
    if (!c.claude && c.sessionId && !live.some((x) => x.sessionId === c.sessionId && x.tab === id)) c.sessionId = null;
  }
  const taken = new Set([...chats.values()].map((c) => c.sessionId).filter(Boolean));
  for (const c of chats.values()) {
    if (!c.claude || c.sessionId || !c.claudeArgs) continue;
    const s = live.find((x) => !x.ai && !taken.has(x.sessionId) && samePath(x.cwd, c.cwd));
    if (s) {
      c.sessionId = s.sessionId;
      taken.add(s.sessionId);
    }
  }
}
const samePath = (a, b) => !!a && !!b && path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

/**
 * A chat or terminal. A new one starts its shell (Claude in it with `claudeArgs`); one given the `id` of a session that
 * outlived the app attaches to it instead (`claude`: whether it was started as a chat). It opens in a window of its own,
 * hidden unless `show`, or with `into` ({ frame, how, beside }) in a window that is open: a tab at the end ("tab") or
 * right after the one in front ("next"), or beside its pane `beside`, sharing its place ("right", "down").
 */
let chatCascade = 0;
// How much of what's behind shows through a terminal or note window: 90% opaque, no frost, as the Mac's
// (ChatWindowController.windowOpacity). Windows can't make a framed window see-through pixel by pixel (Electron's
// `transparent` needs a frameless one, which can't be resized), so the whole window is 90% opaque, its text and title bar
// too, where the Mac keeps the text solid.
const WINDOW_OPACITY = 0.9;
function openChatWindow({ id = crypto.randomUUID(), cwd, claudeArgs, claude = !!claudeArgs, sessionId, title, show = true, into = null, account = null }) {
  // The terminal's own page, in a view: it moves between tabs, panes and windows with its session running on.
  const view = new WebContentsView({ webPreferences: webPrefs() });
  view.setBackgroundColor(themes.color('--code-bg'));
  const wc = view.webContents;
  bootFor(wc, { termFont: termFontSize(), termFamily: termFont.chosen(), keys: shortcuts.forTerminal() });
  // `account`: the id of the Claude account it runs under (null: the default one), for a terminal's env and for the chip.
  const c = { page: view, frame: null, sessionId, cwd, claude, claudeArgs, title: title || path.basename(cwd || os.homedir()), startedAt: Date.now(), account };
  // Its window's: the tabs and panes of a window show, hide and stay on top together.
  Object.defineProperties(c, {
    win: { get: () => (c.frame ? c.frame.win : null) },
    steppedAside: { get: () => !!c.frame && c.frame.steppedAside, set: (v) => c.frame && (c.frame.steppedAside = v) },
    pinned: { get: () => !!c.frame && c.frame.pinned, set: (v) => c.frame && (c.frame.pinned = v) },
  });
  chats.set(id, c);
  // A renderer gone (it crashed, or Reload Dashboard ended one it shared): the page loads again and attaches to its
  // terminal, which ran on (term:ready).
  wc.on('render-process-gone', (_e, d) => {
    if (d && d.reason === 'clean-exit') return;
    setTimeout(() => !wc.isDestroyed() && wc.reload(), 500);
  });
  // The pane with the keys is its window's own: its title, its worktree's menu items, the tab bar's name.
  wc.on('focus', () => paneFocused(id));
  // Real keys only (a modifier alone isn't typing): Viktoria may notice, and may come to hide this terminal. The keys for
  // tabs and panes act here, before the page, while the window has tabs or a split to act on (paneKeys); with one tab
  // and one pane they go on to the shell.
  const MODIFIER_KEYS = ['Control', 'Shift', 'Alt', 'AltGraph', 'Meta', 'CapsLock', 'NumLock', 'ScrollLock', 'OS'];
  wc.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && !MODIFIER_KEYS.includes(input.key)) mascot.onTyping(id);
    if (paneKeys(frameHolding(id), input)) e.preventDefault();
  });
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });
  // Once its first seconds are over a chat says what it is even if nothing else changes (chatInfo).
  if (claude) setTimeout(() => chats.get(id) === c && sendInfo(id, c), 15_500);
  wc.loadFile(path.join(__dirname, '..', 'pages', 'terminal.html'));
  const target = into && frames.has(into.frame) && !into.frame.win.isDestroyed() ? into.frame : null;
  const f = target || newFrame();
  addPane(f, id, target ? into.how : 'tab', target && into.beside);
  if (target) {
    if (f.win.isVisible()) focusPane(f, id);
    return id;
  }
  wc.once('did-finish-load', () => {
    if (!show || f.win.isDestroyed() || f.win.isVisible()) return;
    if (PROBE) return f.win.showInactive();
    if (modalOpen) {
      f.steppedAside = true;
      return void pushWinOpen();
    }
    pinToDash(f.win);
    f.win.show();
    f.win.focus();
    focusPane(f, id);
    touchTerminal(id);
    pushWinOpen();
  });
  return id;
}

// ---------- tabs and split panes (the Mac's ChatWindow tabs and Panes.swift, iTerm2's) ----------
// A terminal window is a frame: its tabs, each a tree of split panes (panes.js) whose leaves are terminals, each terminal
// its own view (its page), which goes from tab to pane to window without its session starting again. The window's own
// page is the tab bar (pages/tabs.js), under the views: it shows above them when there are two tabs or more, and in the
// gaps between split panes, where the dividers are dragged. A window of one tab and one pane looks as it always did, and
// that page isn't even loaded. A terminal's id never changes, so the dashboard, its notes and the session host find it
// wherever it moves.
const frames = new Set();
const TAB_BAR = 30, PANE_GAP = 4;
const frameHolding = (id) => chats.get(id)?.frame || [...frames].find((f) => f.views.has(id)) || null;
const focusedFrame = () => [...frames].find((f) => !f.win.isDestroyed() && f.win.isFocused()) || null;

function newFrame(place) {
  if (!place) {
    const home = chatHome(), area = home.workArea;
    const cascade = (chatCascade++ % 6) * 28;
    place = wholeOnDisplay({ x: area.x + 120 + cascade, y: area.y + 80 + cascade, width: 960, height: 640 }, home);
  }
  const win = new BrowserWindow({
    ...place, minWidth: 560, minHeight: 360, opacity: WINDOW_OPACITY,
    title: 'Orbiterm', backgroundColor: themes.color('--code-bg'), show: false, autoHideMenuBar: true,
    ...(PROBE ? { x: -32000, y: -32000, frame: false } : {}),
    webPreferences: webPrefs(),
  });
  // `history`: its panes by when they last had the keys (the one in front of each tab); `last`: what each said last
  // (sendInfo), for its chip; `zoom`: the pane alone in its tab (Maximize Pane).
  const f = {
    win, tabs: [], active: 0, focus: null, zoom: null, views: new Map(), last: new Map(), history: [], dividers: [],
    barLoaded: false, barTimer: null, stateKey: '', steppedAside: false, pinned: false,
    chipGeom: null,
  };
  frames.add(f);
  windowsChanged();
  // The window's title is the app's ("project · title" of the pane with the keys, sendInfo), not a page's.
  win.on('page-title-updated', (e) => e.preventDefault());
  win.webContents.on('render-process-gone', (_e, d) => {
    if (d && d.reason === 'clean-exit') return;
    setTimeout(() => !win.isDestroyed() && f.barLoaded && win.webContents.reload(), 500);
  });
  // Back in front: the pane that had the keys has them again (a click on another pane gives them to that one after), its
  // worktree's status (and its pull request, at most every 20 s) is read again, and the menu's worktree items follow it.
  win.on('focus', () => {
    const view = f.views.get(f.focus);
    if (view && ![...f.views.values()].some((v) => !v.webContents.isDestroyed() && v.webContents.isFocused())) view.webContents.focus();
    const c = chats.get(f.focus);
    if (c) {
      touchTerminal(f.focus);
      if (c.wtTop) worktreeShip.refresh(c.wtTop, { pr: true });
    }
    syncShipMenu();
  });
  // Where this window is and whether it shows decide where she can stand on it.
  for (const ev of ['move', 'resize', 'show', 'hide', 'minimize', 'restore', 'closed']) win.on(ev, () => mascot.terminalsChanged());
  for (const ev of ['resize', 'maximize', 'unmaximize', 'restore', 'enter-full-screen', 'leave-full-screen']) win.on(ev, () => layoutFrame(f));
  // Alt shows the menu bar (autoHideMenuBar) and the content area loses its height with no resize event: the window's own
  // view says so, and the panes fit in what's left (Claude's input line isn't cut off at the bottom).
  win.contentView.on('bounds-changed', () => layoutFrame(f));
  // A window pinned above the dashboard is its child, and Windows minimizes an owned window to a bar on the desktop
  // rather than the taskbar: it lets go of the dashboard on its way to the taskbar and pins again when it comes back,
  // as on the Mac.
  if (process.platform === 'win32') {
    win.hookWindowMessage(0x0112, (wParam) => {
      if ((wParam.readUInt32LE(0) & 0xfff0) === 0xf020 && win.getParentWindow()) win.setParentWindow(null);
    });
  }
  win.on('minimize', () => win.getParentWindow() && win.setParentWindow(null));
  win.on('restore', () => !f.steppedAside && pinToDash(win));
  // Closing a window (Ctrl+Shift+W, its ×) only hides it, as on the Mac: what runs in its tabs and panes goes on, Claude as a
  // session on the orbit and a terminal as the same car it was (no blast), and a click there brings the window back. End
  // Session ends one. Quitting closes them all: their sessions were seen to just before (the host's go on).
  win.on('close', (e) => {
    const live = [...f.views.keys()].filter((id) => terminals.has(id));
    if (quitting || !live.length) return;
    e.preventDefault();
    f.steppedAside = false;
    const hadKeys = win.isFocused();
    win.setParentWindow(null);
    win.hide();
    // Undo Close brings it back, the one hidden last first: by any of its terminals that still runs then (the one with the
    // keys first). Panes closed out of other windows earlier and put here since don't go back there any more.
    for (const id of live) {
      const c = chats.get(id);
      if (c) c.closedFrom = null;
      if (id !== f.focus) rememberClosed(id);
    }
    rememberClosed(live.includes(f.focus) ? f.focus : live[0]);
    // Windows leaves the keys with the hidden window (unpinned first, nothing under it takes them): Ctrl+Shift+N, the
    // Ring's keys, anything typed next went nowhere. The dashboard takes them, as the window under a closed one does
    // on the Mac, when the one hidden had them and the dashboard shows.
    if (hadKeys && dash && !dash.isDestroyed() && dash.isVisible() && !dash.isMinimized()) {
      dash.focus();
      dashView.webContents.focus();
    }
    if (activeTerminalId && f.views.has(activeTerminalId)) {
      activeTerminalId = null;
      pushActiveSession();
    }
    pushWinOpen();
    pushTerminals();
    pushChats();
  });
  win.on('closed', () => {
    frames.delete(f);
    clearTimeout(f.barTimer);
    for (const [id, view] of f.views) {
      const wc = view.webContents;
      if (!wc.isDestroyed()) shipWins.delete(wc.id);
      const c = chats.get(id);
      if (c && c.frame === f) {
        chats.delete(id);
        if (activeTerminalId === id) {
          activeTerminalId = null;
          pushActiveSession();
        }
      }
      if (!wc.isDestroyed()) wc.close();
    }
    f.views.clear();
    pushWinOpen();
    windowsChanged();
    saveLayout();
    // An ended window a worktree's delete kept was what the app stayed for (quitIfIdle).
    if (keptWins.delete(win)) quitIfIdle();
  });
  // The drag engine follows this window's focus, native moves and closing (tabdrag.watchFrame).
  tabdrag.watchFrame(f);
  return f;
}

/** Puts terminal `id` (its view) in window `f`: a new tab ("tab", "next") or a split of pane `beside` ("right", "down"), before it when `before`. */
function addPane(f, id, how = 'tab', beside = null, before = false) {
  const c = chats.get(id);
  if (!c || f.win.isDestroyed()) return;
  f.views.set(id, c.page);
  f.win.contentView.addChildView(c.page);
  c.frame = f;
  const next = beside && f.views.has(beside) ? beside : f.focus;
  const t = next ? f.tabs.findIndex((n) => panes.has(n, next)) : -1;
  if ((how === 'right' || how === 'down') && t >= 0) {
    f.tabs[t] = panes.insert(f.tabs[t], next, id, how === 'right' ? 'row' : 'col', before);
    f.active = t;
  } else {
    const at = how === 'next' ? Math.min(f.active + 1, f.tabs.length) : f.tabs.length;
    f.tabs.splice(at, 0, id);
    f.active = at;
  }
  f.zoom = null;
  f.focus = id;
  f.history = [...f.history.filter((x) => x !== id), id];
  layoutFrame(f);
  saveLayout();
}

/** Takes terminal `id`'s view out of its window, its session running on; a window left with nothing closes. */
function takePane(id) {
  const f = frameHolding(id);
  if (!f) return;
  const view = f.views.get(id);
  f.views.delete(id);
  f.last.delete(id);
  f.history = f.history.filter((x) => x !== id);
  if (view && !f.win.isDestroyed()) f.win.contentView.removeChildView(view);
  const t = f.tabs.findIndex((n) => panes.has(n, id));
  if (t >= 0) {
    const rest = panes.remove(f.tabs[t], id);
    if (rest) f.tabs[t] = rest;
    else {
      f.tabs.splice(t, 1);
      if (f.active > t || f.active >= f.tabs.length) f.active = Math.max(0, f.active - 1);
    }
  }
  if (f.zoom === id) f.zoom = null;
  const c = chats.get(id);
  if (c && c.frame === f) c.frame = null;
  if (!f.views.size) {
    if (!f.win.isDestroyed()) f.win.destroy();
  } else {
    if (f.focus === id) f.focus = frontOf(f);
    layoutFrame(f);
    if (f.win.isFocused()) focusPane(f, f.focus);
  }
  saveLayout();
}

/** Terminal `id`'s view goes for good (its session ended, or ends now): its tab or pane closes up. */
function dropPane(id) {
  const f = frameHolding(id);
  const wc = f && f.views.get(id) && f.views.get(id).webContents;
  if (!f) return;
  if (wc && !wc.isDestroyed()) shipWins.delete(wc.id);
  takePane(id);
  if (wc && !wc.isDestroyed()) wc.close();
}

/** The pane in front of tab `t`: the one that had the keys last, else its first. */
function frontOf(f, t = f.active) {
  const ids = panes.ids(f.tabs[t]);
  for (let k = f.history.length - 1; k >= 0; k--) if (ids.includes(f.history[k])) return f.history[k];
  return ids[0] || null;
}

/** Where the panes of the tab in front go: under the bar when there's one. */
function areaOf(f) {
  const { width, height } = f.win.contentView.getBounds();
  const top = f.tabs.length > 1 ? TAB_BAR : 0;
  return { x: 0, y: top, width, height: Math.max(0, height - top) };
}

/** The tab in front's panes where they go (the others' hidden), and the tab bar and each page told how things are. */
function layoutFrame(f) {
  if (f.win.isDestroyed()) return;
  const shown = f.tabs[f.active];
  const area = areaOf(f);
  const zoomed = f.zoom && panes.has(shown, f.zoom);
  const { rects, dividers } = zoomed ? { rects: new Map([[f.zoom, area]]), dividers: [] } : panes.layout(shown, area, PANE_GAP);
  for (const [id, view] of f.views) {
    const r = rects.get(id);
    if (r) view.setBounds(r);
    view.setVisible(!!r);
  }
  f.dividers = dividers;
  // Each page: whether it's one of several (dimmed without the keys, as in iTerm2) and whether it has them.
  const key = `${f.tabs.length}|${rects.size}|${f.focus}|${[...rects.keys()].join(',')}`;
  if (key !== f.stateKey) {
    f.stateKey = key;
    for (const [id, view] of f.views) send(view, 'term:pane', { tabs: f.tabs.length, panes: rects.size, split: panes.ids(shown).length > 1, shown: rects.has(id), focused: id === f.focus });
  }
  pushBar(f);
}

/** Gives pane `id` of window `f` the keys: its tab comes in front, a pane maximized in it gives way. */
function focusPane(f, id) {
  if (!f || !id || !f.views.has(id) || f.win.isDestroyed()) return;
  const t = f.tabs.findIndex((n) => panes.has(n, id));
  if (t >= 0) f.active = t;
  if (f.zoom && f.zoom !== id) f.zoom = null;
  f.focus = id;
  f.history = [...f.history.filter((x) => x !== id), id];
  layoutFrame(f);
  if (f.win.isVisible()) f.views.get(id).webContents.focus();
  const c = chats.get(id);
  if (c) sendInfo(id, c);
  // The menu's terminal items (Copy Claude's Last Reply…) and worktree items follow the pane with the keys.
  syncTerminalItems();
  syncShipMenu();
}

// A pane's page took the keys (a click, or focusPane): it's the window's own now.
function paneFocused(id) {
  const f = frameHolding(id);
  if (!f) return;
  if (f.focus !== id) {
    f.focus = id;
    f.history = [...f.history.filter((x) => x !== id), id];
    layoutFrame(f);
    const c = chats.get(id);
    if (c) sendInfo(id, c);
    syncTerminalItems();
    syncShipMenu();
  }
  if (chats.has(id)) touchTerminal(id);
}

// The tab bar's chips and the dividers' places, a moment after a change (a burst of them sends once). The bar's page loads
// the first time a window has two tabs or a split; until it says it's ready, nothing is sent to it.
function pushBar(f) {
  if (!f.barTimer) f.barTimer = setTimeout(() => sendBar(f), 60);
}
function sendBar(f) {
  clearTimeout(f.barTimer);
  f.barTimer = null;
  if (f.win.isDestroyed()) return;
  const bar = f.tabs.length > 1;
  if (!f.barLoaded) {
    if (!bar && !f.dividers.length) return;
    f.barLoaded = true;
    bootFor(f.win.webContents);
    f.win.loadFile(path.join(__dirname, '..', 'pages', 'tabs.html'));
    return;
  }
  // Each chip shows the pane in front of its tab: its name, whether its AI works or needs you, its context.
  // The Claude account's initial on a chip, only when the window's panes use more than one (the Mac's TabChip).
  const marks = new Set([...f.views.keys()].map((pid) => ((f.last.get(pid) || {}).acct || {}).chip).filter(Boolean).map((chip) => chip.mark.id));
  const tabs = f.tabs.map((node, i) => {
    const id = frontOf(f, i);
    const info = f.last.get(id) || {};
    const status = !chats.has(id) ? 'ended' : info.tool ? info.toolStatus || '' : info.status || '';
    const mark = marks.size > 1 && info.acct && info.acct.chip ? info.acct.chip.mark : null;
    return { title: info.title || chats.get(id)?.title || 'terminal', status, stats: info.stats || null, panes: panes.ids(node).length, acct: mark ? { initial: mark.initial, hue: mark.hue, label: mark.label } : null };
  });
  send(f.win, 'term:tabs', {
    tabs, active: f.active, bar, height: TAB_BAR,
    dividers: f.dividers.map(({ x, y, width, height, dir }) => ({ x, y, width, height, dir })),
  });
}

/** The tab bar's page: its window. */
const frameOfBar = (e) => [...frames].find((f) => !f.win.isDestroyed() && f.win.webContents === e.sender) || null;
ipcMain.on('term:tabs', (e, q) => {
  const f = frameOfBar(e);
  if (!f || !q || typeof q !== 'object') return;
  const i = Number.isInteger(q.i) && q.i >= 0 && q.i < f.tabs.length ? q.i : -1;
  switch (q.type) {
    case 'ready':
      return sendBar(f);
    case 'select':
      if (i >= 0) focusPane(f, frontOf(f, i));
      return;
    case 'close':
      // Ended or kept (Cancel), the keys go back to the pane in front.
      if (i >= 0) closeTabAsked(f, f.tabs[i]).then(() => frames.has(f) && focusPane(f, f.focus));
      return;
    case 'rename':
      if (i >= 0 && typeof q.name === 'string') renamePane(frontOf(f, i), q.name);
      return focusPane(f, f.focus);
    case 'renamed':
      return focusPane(f, f.focus);
    // A divider let go, a click on the bar's empty part: the keys go back to the pane that had them.
    case 'back':
      return focusPane(f, f.focus);
    // A chip's name being typed: the keys go to the bar's page meanwhile.
    case 'renaming':
      return void f.win.webContents.focus();
    case 'menu':
      if (i >= 0) tabMenu(f, i, q);
      return;
    case 'more':
      return tabList(f, q);
    case 'geom': {
      // The chips' places the drag engine needs for a slot and its marker: the page's pixels, kept as the window's.
      const z = f.win.webContents.getZoomFactor() || 1;
      const pair = (a) => (Array.isArray(a) && a.length === 2 && a.every(Number.isFinite) ? [a[0] * z, a[1] * z] : null);
      const chips = Array.isArray(q.chips) ? q.chips.map(pair) : [];
      const clip = pair(q.clip);
      f.chipGeom = clip && chips.length && chips.every(Boolean) ? { chips, clip } : null;
      return;
    }
    case 'divider': {
      const d = Number.isInteger(q.d) ? f.dividers[q.d] : null;
      if (!d || !Number.isFinite(q.pos)) return;
      if (panes.setDivider(f.tabs[f.active], d, q.pos, PANE_GAP)) {
        layoutFrame(f);
        saveLayout();
      }
      return;
    }
  }
});

// A point the bar's page names (its pixels) as the window's, for a menu under it.
const barPoint = (f, q) => {
  const z = f.win.webContents.getZoomFactor() || 1;
  return Number.isFinite(q.x) && Number.isFinite(q.y) ? { x: Math.round(q.x * z), y: Math.round(q.y * z) } : {};
};

// A chip's right-click menu (the Mac's tabMenu): what it does is for that tab, whichever moved meanwhile.
function tabMenu(f, i, q) {
  const node = f.tabs[i];
  const at = () => f.tabs.indexOf(node);
  const items = [
    { label: 'Rename Tab…', click: () => at() >= 0 && beginRename(f, at()) },
    {
      label: 'New Tab to the Right',
      click: () => {
        if (at() < 0) return;
        focusPane(f, frontOf(f, at()));
        newTab(true, f);
      },
    },
    { label: 'Move Tab to New Window', enabled: f.tabs.length > 1, click: () => at() >= 0 && moveTabToNewWindow(f, at()) },
    { type: 'separator' },
    { label: 'Close Tab', click: () => at() >= 0 && closeTabAsked(f, node) },
    { label: 'Close Other Tabs', enabled: f.tabs.length > 1, click: () => at() >= 0 && closeOtherTabs(f, node) },
  ];
  barMenu(f, items, q);
}

// "»": every tab, the one in front ticked, for a bar too narrow to show them all.
function tabList(f, q) {
  const items = f.tabs.map((node, i) => {
    const info = f.last.get(frontOf(f, i)) || {};
    const name = `${i < 9 ? `${i + 1}  ` : ''}${clip(info.title || 'terminal', 60)}`.replace(/&/g, '&&');
    return { label: name, type: 'checkbox', checked: i === f.active, click: () => f.tabs.includes(node) && focusPane(f, frontOf(f, f.tabs.indexOf(node))) };
  });
  barMenu(f, items, q);
}

// A menu over the bar: closed with nothing picked, the keys go back to the pane that had them (a pick sees to them).
function barMenu(f, items, q) {
  let picked = false;
  const wrap = (it) => (it.click ? { ...it, click: () => ((picked = true), it.click()) } : it);
  Menu.buildFromTemplate(items.map(wrap)).popup({
    window: f.win, ...barPoint(f, q),
    callback: () => setTimeout(() => !picked && !f.win.isDestroyed() && focusPane(f, f.focus), 0),
  });
}

// Rename Tab… (the menu's, a double-click's is the page's own): the chip's name is edited in place, in the bar's page.
function beginRename(f, i) {
  if (!f.barLoaded || f.win.isDestroyed()) return;
  f.win.webContents.focus();
  send(f.win, 'term:tabsRename', i);
}

// ---------- names typed for tabs and panes (the Mac's tabNames) ----------
// By the terminal's id, which stays the same wherever it moves and after a restart; settings.json's "tabNames".
function tabName(id) {
  const all = settings.get('tabNames');
  const v = all && typeof all === 'object' ? all[id] : null;
  return typeof v === 'string' ? v : '';
}
/** A name typed for pane `id`: empty goes back to the one it's given (its AI's title, else its folder). */
function renamePane(id, name) {
  const t = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  const all = settings.get('tabNames');
  const next = { ...(all && typeof all === 'object' ? all : {}) };
  if (t) next[id] = t;
  else if (id in next) delete next[id];
  else return;
  settings.set('tabNames', next);
  const c = chats.get(id);
  if (c) sendInfo(id, c);
}

// ---------- the actions on tabs and panes (the menus, their keys, the chips) ----------
/** File › New Tab (Ctrl+Shift+T) and New Tab Next to Current Tab: a shell in the folder of the pane in front; from the dashboard, the folder picker. */
function newTab(next = false, f = focusedFrame()) {
  if (!f) return void showOverlay('Overlay.newTerminal()');
  const cwd = paneCwd(f);
  openChatWindow({ cwd, claudeArgs: null, title: path.basename(cwd) || cwd, into: { frame: f, how: next ? 'next' : 'tab' } });
}
/** Split Vertically / Horizontally: the pane in front gives half its place to a shell in its folder. */
function splitPane(how, f = focusedFrame()) {
  if (!f) return void showOverlay('Overlay.newTerminal()');
  const cwd = paneCwd(f);
  openChatWindow({ cwd, claudeArgs: null, title: path.basename(cwd) || cwd, into: { frame: f, how, beside: f.focus } });
}
// The folder the pane in front is in now (its shell may have moved), else the one it opened in.
function paneCwd(f) {
  const id = chats.has(f.focus) ? f.focus : [...f.views.keys()].find((x) => chats.has(x));
  return id ? termCwd(id, chats.get(id)) : os.homedir();
}

/** A tab or pane key, from the menu or the keyboard (paneKeys), on window `f`. */
function windowAction(f, action) {
  if (!f || f.win.isDestroyed() || !f.tabs.length) return;
  const n = f.tabs.length;
  const m = /^tab([1-9])$/.exec(action);
  if (m) return void (Number(m[1]) <= n && focusPane(f, frontOf(f, Number(m[1]) - 1)));
  const dirs = { paneAbove: [0, 1], paneBelow: [0, -1], paneLeft: [-1, 0], paneRight: [1, 0], dividerUp: [0, 1], dividerDown: [0, -1], dividerLeft: [-1, 0], dividerRight: [1, 0] };
  switch (action) {
    case 'nextTab':
    case 'previousTab':
      return focusPane(f, frontOf(f, (f.active + (action === 'nextTab' ? 1 : -1) + n) % n));
    case 'moveTabLeft':
    case 'moveTabRight': {
      const to = f.active + (action === 'moveTabRight' ? 1 : -1);
      if (to < 0 || to >= n) return void shell.beep();
      [f.tabs[f.active], f.tabs[to]] = [f.tabs[to], f.tabs[f.active]];
      f.active = to;
      layoutFrame(f);
      return saveLayout();
    }
    case 'nextPane':
    case 'previousPane': {
      const ids = panes.ids(f.tabs[f.active]);
      if (ids.length < 2) return;
      const i = Math.max(0, ids.indexOf(f.focus));
      return focusPane(f, ids[(i + (action === 'nextPane' ? 1 : -1) + ids.length) % ids.length]);
    }
    case 'paneAbove':
    case 'paneBelow':
    case 'paneLeft':
    case 'paneRight': {
      const { rects } = panes.layout(f.tabs[f.active], areaOf(f), PANE_GAP);
      const to = panes.neighbor(rects, f.focus, ...dirs[action]);
      return to ? focusPane(f, to) : undefined;
    }
    case 'dividerUp':
    case 'dividerDown':
    case 'dividerLeft':
    case 'dividerRight':
      return moveDivider(f, ...dirs[action]);
    case 'maximizePane':
      if (f.zoom) f.zoom = null;
      else if (panes.ids(f.tabs[f.active]).length > 1) f.zoom = f.focus;
      else return;
      return focusPane(f, f.focus);
  }
}

/** The nearest divider across that way from the pane in front moves 40 px (`dy` up is +1), the Mac's moveDivider. */
function moveDivider(f, dx, dy) {
  const shown = f.tabs[f.active];
  const { paths, dividers } = panes.layout(shown, areaOf(f), PANE_GAP);
  const p = paths.get(f.focus);
  if (!p || f.zoom) return;
  const dir = dx ? 'row' : 'col';
  for (let depth = p.length - 1; depth >= 0; depth--) {
    const up = p.slice(0, depth);
    const node = panes.at(shown, up);
    if (!node || node.dir !== dir) continue;
    const k = p[depth] < node.kids.length - 1 ? p[depth] : p[depth] - 1;
    const d = dividers.find((x) => x.k === k && x.path.length === up.length && x.path.every((v, j) => v === up[j]));
    if (d && panes.setDivider(shown, d, (dx ? d.x + dx * 40 : d.y - dy * 40), PANE_GAP)) {
      layoutFrame(f);
      saveLayout();
    }
    return;
  }
}

/**
 * The tab and pane keys as a terminal's page gets them (its before-input-event): true when window `f` acted on one, which
 * the page then never sees. The tab keys act only with two tabs or more, the pane keys only in a split tab: otherwise
 * they reach the shell as before (Ctrl+Tab is a Tab there).
 */
function paneKeys(f, input) {
  if (!f || f.win.isDestroyed() || input.type !== 'keyDown') return false;
  const k = shortcuts.windowKey(shortcuts.comboOf(input));
  if (!k) return false;
  const split = panes.ids(f.tabs[f.active]).length > 1;
  if (k.tabs ? f.tabs.length < 2 : !split) return false;
  windowAction(f, k.id);
  return true;
}

/**
 * Takes tab `i`'s views out of `from` and hands them to `to` (not yet in its tab list), with their last chat info and
 * owner, and closes up `from`'s tabs, front tab, history, zoom and keys around the gap. Returns the tab's pane tree, or
 * null when there is nothing to carry. `from` is left for settleFrame, so a caller can put the tree in place first.
 */
function carryTab(from, i, to) {
  const node = from.tabs[i];
  if (!node || from === to || to.win.isDestroyed()) return null;
  const ids = panes.ids(node);
  for (const id of ids) {
    const view = from.views.get(id);
    from.views.delete(id);
    if (!view) continue;
    if (!from.win.isDestroyed()) from.win.contentView.removeChildView(view);
    to.views.set(id, view);
    to.win.contentView.addChildView(view);
    if (from.last.has(id)) to.last.set(id, from.last.get(id));
    from.last.delete(id);
    const c = chats.get(id);
    if (c) c.frame = to;
  }
  from.tabs.splice(i, 1);
  from.history = from.history.filter((x) => !ids.includes(x));
  if (from.active > i || from.active >= from.tabs.length) from.active = Math.max(0, from.active - 1);
  if (ids.includes(from.zoom)) from.zoom = null;
  if (ids.includes(from.focus)) from.focus = from.tabs.length ? frontOf(from) : null;
  return node;
}

/** A window that gave tabs away: closed when nothing is left in it, else laid out again. */
function settleFrame(from) {
  if (!from.views.size) {
    if (!from.win.isDestroyed()) from.win.destroy();
  } else layoutFrame(from);
}

/** Moves tab `i` of `from` to window `to` at `at` (the end by default), its sessions running on; `from` closes when it's left with nothing. */
function moveTab(from, i, to, at = to.tabs.length, select = true) {
  // Which of the tab's panes had the keys, in order of when: carryTab drops them from `from`'s history.
  const had = from.tabs[i] ? from.history.filter((x) => panes.has(from.tabs[i], x)) : [];
  const node = carryTab(from, i, to);
  if (!node) return;
  const ids = panes.ids(node);
  at = Math.min(Math.max(at, 0), to.tabs.length);
  to.tabs.splice(at, 0, node);
  if (select || !to.focus) {
    to.active = at;
    to.focus = ids[0];
    to.history = [...to.history, ...ids.slice().reverse()];
  } else {
    if (to.active >= at) to.active++;
    // A tab that comes in behind keeps its own front pane without taking the keys-history's end from the window's.
    to.history = [...had, ...to.history.filter((x) => !had.includes(x))];
  }
  settleFrame(from);
  layoutFrame(to);
  saveLayout();
}

/** The Window menu's Move Tab to New Window and the chip menu's: tab `i` goes to a window of its own, a little down and right. */
function moveTabToNewWindow(f, i = f && f.active) {
  if (!f) return void shell.beep();
  const b = f.win.getBounds();
  tearOffTab(f, i, wholeOnDisplay({ ...b, x: b.x + 30, y: b.y + 30 }));
}

/** Merge All Windows: every other terminal window on screen joins the one in front as tabs, without ending anything; each one's tab in front comes in front. */
function mergeAllWindows() {
  const f = focusedFrame();
  const others = f ? [...frames].filter((g) => g !== f && !g.win.isDestroyed() && g.win.isVisible() && !g.win.isMinimized()) : [];
  if (!others.length) return void shell.beep();
  for (const g of others) mergeFrame(g, f, f.tabs.length, false);
  showFrame(f, frontOf(f));
}

/** A split pane becomes a tab of its own, at `slot` (the end by default; the Mac's pane-bar drop onto the tab bar). */
function paneToTab(f, id, slot = f.tabs.length) {
  const t = f.tabs.findIndex((n) => panes.has(n, id));
  if (t < 0 || panes.ids(f.tabs[t]).length < 2) return refuse();
  f.tabs[t] = panes.remove(f.tabs[t], id);
  f.tabs.splice(Math.min(Math.max(slot, 0), f.tabs.length), 0, id);
  if (f.zoom === id) f.zoom = null;
  focusPane(f, id);
  saveLayout();
  return true;
}

/** A pane (or the only pane of a tab) becomes a window of its own, a little down and right, its session running on. */
function paneToWindow(f, id) {
  const b = f.win.getBounds();
  return tearOffPane(f, id, wholeOnDisplay({ ...b, x: b.x + 30, y: b.y + 30 }));
}

// ---------- tab, split and window drops (tabdrag.js) ----------
// What a dragged tab, pane or window does when it lands, as the Mac's MainWindowController / ChatWindow drops do. Each is a
// whole operation (keys, layout and saving included) that returns true when done, and false when it was refused (with a
// beep, except for a reorder that changes nothing). Sessions never restart: only views move, and names and notes follow ids.

/** Window `f` still exists: tracked, and its native window not destroyed (a drop runs a moment after the pointer was let go). */
const live = (f) => !!f && frames.has(f) && !f.win.isDestroyed();
/** The direction a split on `edge` runs in, and whether the newcomer goes before the target (left, top) or after it. */
const edgeDir = (e) => (e === 'left' || e === 'right' ? 'row' : 'col');
const edgeBefore = (e) => e === 'left' || e === 'top';
/** A refused drop: the system beep, and false. */
const refuse = () => (shell.beep(), false);
/** What a chip or strip says about terminal `id`: its last title, else the chat's. */
const paneTitle = (id) => ((frameHolding(id)?.last.get(id) || {}).title) || chats.get(id)?.title || 'terminal';

/** Where the panes of the tab in front are (content coordinates, each strip included); a maximized pane is the only one. */
function paneRects(f) {
  const shown = f.tabs[f.active];
  if (f.zoom && panes.has(shown, f.zoom)) return new Map([[f.zoom, areaOf(f)]]);
  return panes.layout(shown, areaOf(f), PANE_GAP).rects;
}

/** A tab dragged along its own bar: it moves to `slot` (0 to the tab count, counted before the move); the tab in front stays in front. */
function reorderTab(f, i, slot) {
  if (!live(f) || !Number.isInteger(i) || !Number.isInteger(slot) || !f.tabs[i] || slot < 0 || slot > f.tabs.length) return false;
  const j = slot > i ? slot - 1 : slot;
  if (j === i) return false;
  const shown = f.tabs[f.active];
  f.tabs.splice(j, 0, f.tabs.splice(i, 1)[0]);
  f.active = f.tabs.indexOf(shown);
  layoutFrame(f);
  saveLayout();
  focusPane(f, f.focus);
  return true;
}

/** Tab `i` (not the one in front) dragged onto a pane of the tab in front: its whole tree goes beside `targetId` on `edge`, and takes half of it. */
function joinTab(f, i, targetId, edge) {
  if (!live(f) || !f.tabs[i] || i === f.active || !panes.has(f.tabs[f.active], targetId)) return refuse();
  const node = f.tabs.splice(i, 1)[0];
  if (i < f.active) f.active--;
  f.tabs[f.active] = panes.insert(f.tabs[f.active], targetId, node, edgeDir(edge), edgeBefore(edge));
  f.zoom = null;
  focusPane(f, panes.ids(node)[0]);
  saveLayout();
  return true;
}

/** Tab `i` of `from` dropped on another window's bar or header: it joins `to` as a tab at `slot`, in front, and `to` comes up with the keys in it. */
function tabToFrame(from, i, to, slot) {
  if (!live(from) || !from.tabs[i] || from === to || !live(to)) return refuse();
  moveTab(from, i, to, slot, true);
  showFrame(to, to.focus);
  return true;
}

/** Tab `i` of `from` dropped on a pane of another window: its tree goes beside `targetId` on `edge` in the tab `to` shows, and the keys go to its first pane. */
function tabToSplit(from, i, to, targetId, edge) {
  if (!live(from) || !from.tabs[i] || from === to || !live(to)) return refuse();
  // The pane it was to land beside is gone: the Mac adopts the tab instead.
  if (!panes.has(to.tabs[to.active], targetId)) return tabToFrame(from, i, to, to.tabs.length);
  const node = carryTab(from, i, to);
  if (!node) return refuse();
  const ids = panes.ids(node);
  to.zoom = null;
  to.tabs[to.active] = panes.insert(to.tabs[to.active], targetId, node, edgeDir(edge), edgeBefore(edge));
  to.history = [...to.history.filter((x) => !ids.includes(x)), ...ids.slice().reverse()];
  settleFrame(from);
  showFrame(to, ids[0]);
  saveLayout();
  return true;
}

/** Tab `i` of `f` torn off into a window of its own at `bounds` (outer, screen), pinned when `f` is, shown. */
function tearOffTab(f, i, bounds) {
  if (!live(f) || f.tabs.length < 2 || !f.tabs[i]) return refuse();
  const g = newFrame(bounds);
  moveTab(f, i, g, 0, true);
  if (f.pinned) setPinned(g, true);
  // The bounds are already on the pointer's display: they stay.
  showFrame(g, g.focus, true);
  return true;
}

/** A pane dragged onto another pane of the same tab: it leaves its place and goes beside `targetId` on `edge`. */
function paneToSplit(f, id, targetId, edge) {
  const shown = live(f) && f.tabs[f.active];
  if (!shown || id === targetId || !panes.has(shown, id) || !panes.has(shown, targetId)) return refuse();
  f.tabs[f.active] = panes.insert(panes.remove(shown, id), targetId, id, edgeDir(edge), edgeBefore(edge));
  f.zoom = null;
  focusPane(f, id);
  saveLayout();
  return true;
}

/** A pane of `from` dropped on another window's bar or header: it joins `to` as a tab at `slot`, in front, and `to` comes up. */
function paneToFrame(from, id, to, slot) {
  if (from === to) return paneToTab(from, id, slot);
  if (!live(from) || !from.views.has(id) || from.views.size < 2 || !live(to)) return refuse();
  takePane(id);
  addPane(to, id, 'tab');
  // addPane put the new tab last: it moves to the slot, and stays in front.
  const at = Math.min(Math.max(slot, 0), to.tabs.length - 1);
  to.tabs.splice(at, 0, to.tabs.pop());
  to.active = at;
  layoutFrame(to);
  saveLayout();
  showFrame(to, id);
  return true;
}

/** A pane of `from` dropped on a pane of another window: it goes beside `targetId` on `edge` in the tab `to` shows. */
function paneToFrameSplit(from, id, to, targetId, edge) {
  if (from === to) return paneToSplit(from, id, targetId, edge);
  if (!live(from) || !from.views.has(id) || from.views.size < 2 || !live(to)) return refuse();
  if (!panes.has(to.tabs[to.active], targetId)) return paneToFrame(from, id, to, to.tabs.length);
  takePane(id);
  to.zoom = null;
  addPane(to, id, edgeDir(edge) === 'row' ? 'right' : 'down', targetId, edgeBefore(edge));
  showFrame(to, id);
  return true;
}

/** A pane of `f` torn off into a window of its own at `bounds` (outer, screen), its session running on, pinned when `f` is, shown. */
function tearOffPane(f, id, bounds) {
  if (!live(f) || !f.views.has(id) || f.views.size < 2) return refuse();
  takePane(id);
  const g = newFrame(bounds);
  addPane(g, id, 'tab');
  if (f.pinned) setPinned(g, true);
  // The bounds are already on the pointer's display: they stay.
  showFrame(g, id, true);
  return true;
}

/**
 * Every tab of `g` joins `f` at `at` (the end by default), the one that was in front of `g` in front of `f`'s new ones;
 * `g` closes with nothing left. With `show`, `f` comes to the front with the keys in that tab's front pane.
 */
function mergeFrame(g, f, at = f.tabs.length, show = true) {
  if (g === f || !live(g) || !live(f) || !g.tabs.length) return refuse();
  at = Math.min(Math.max(at, 0), f.tabs.length);
  const front = g.active, n = g.tabs.length;
  for (let k = 0; k < n; k++) moveTab(g, 0, f, at + k, false);
  f.active = at + Math.min(front, n - 1);
  if (show) showFrame(f, frontOf(f));
  return true;
}

/** Window `g` dropped on a pane of `f`: its tab in front goes beside `targetId` on `edge` (its other tabs stay; an empty `g` closes). */
function mergeSplit(g, f, targetId, edge) {
  return live(g) ? tabToSplit(g, g.active, f, targetId, edge) : refuse();
}

tabdrag.init({
  frames, panes, TAB_BAR, PANE_GAP,
  desk: attackDesk,
  webPrefs,
  bootFor,
  pagesDir: path.join(__dirname, '..', 'pages'),
  frameOfBar: (wc) => [...frames].find((f) => !f.win.isDestroyed() && f.win.webContents === wc) || null,
  // The arrow bodies run later, when chatOf (further down) is initialised.
  paneOfPage: (wc) => {
    const found = chatOf({ sender: wc });
    const f = found && found[1].frame;
    return f && frames.has(f) ? { f, id: found[0] } : null;
  },
  paneRects,
  barGeom: (f) => (f.tabs.length > 1 && f.barLoaded && f.chipGeom) || null,
  tabTitle: (f, i) => paneTitle(frontOf(f, i)),
  paneTitle,
  unzoom: (f) => {
    if (!f.zoom) return;
    f.zoom = null;
    layoutFrame(f);
  },
  refocus: (f) => live(f) && focusPane(f, f.focus),
  ops: {
    reorderTab, joinTab, tabToFrame, tabToSplit, tearOffTab, paneToTab, paneToSplit, paneToFrame, paneToFrameSplit, tearOffPane,
    mergeFrame, mergeSplit,
  },
});

/**
 * Ctrl+W (the Mac's ⌘W), and Esc when swapped: with several tabs or panes the one with the keys closes, as a window
 * closes: what runs in it goes on, in a window of its own out of sight that a click in the dashboard shows, and Undo
 * Close puts it back here. One that ended just goes. The last one closes (hides) the window.
 */
function closePane(id) {
  const f = frameHolding(id);
  if (!f) return;
  if (f.views.size < 2) return void f.win.close();
  const c = chats.get(id);
  if (!c || !terminals.has(id)) {
    dropPane(id);
    chats.delete(id);
    return;
  }
  const b = f.win.getBounds();
  // As the Mac's adoptPane: a split pane comes back split the same way, a tab as a tab.
  const t = f.tabs.findIndex((n) => panes.has(n, id));
  const dir = t >= 0 ? panes.dirOf(f.tabs[t], id) : null;
  takePane(id);
  addPane(newFrame(b), id, 'tab');
  c.closedFrom = f;
  c.closedAs = dir === 'row' ? 'right' : dir === 'col' ? 'down' : 'tab';
  rememberClosed(id);
  if (activeTerminalId === id) {
    activeTerminalId = null;
    pushActiveSession();
  }
  pushWinOpen();
  pushTerminals();
  pushChats();
}

/** Whether something runs in terminal `id`: an AI, or a job in its shell. */
function paneRuns(id) {
  const c = chats.get(id);
  if (!c || !terminals.has(id)) return false;
  const info = chatInfo(id, c);
  if (info.status !== 'terminal' || info.tool) return true;
  const pid = terminals.list().find((t) => t.id === id)?.pid;
  return !!pid && runaways.children(pid).length > 0;
}

/**
 * A chip's ×, Close Tab: the tab's terminals end, as their End buttons end them (a tab of one asks as that button does;
 * one of several asks once when something runs in it). One that ended already just goes.
 */
async function closeTabAsked(f, node) {
  const ids = panes.ids(node);
  const live = ids.filter((id) => chats.has(id) && terminals.has(id));
  if (ids.length === 1 && live.length === 1) return endAsked(live[0]);
  if (live.some(paneRuns)) {
    const r = await dialog.showMessageBox(f.win, {
      type: 'warning', noLink: true, defaultId: 0, cancelId: 1,
      message: 'Close this tab?', detail: 'What runs in its panes stops.', buttons: ['Close Tab', 'Cancel'],
    });
    if (r.response !== 0) return;
  }
  for (const id of live) if (!(await settleEnv(id))) return;
  for (const id of ids) {
    if (chats.has(id) && terminals.has(id)) endTerminal(id);
    else {
      dropPane(id);
      chats.delete(id);
    }
  }
}

/** Close Other Tabs: every tab but that one ends, asked once when something runs in them. */
async function closeOtherTabs(f, keep) {
  const others = f.tabs.filter((n) => n !== keep);
  const ids = others.flatMap(panes.ids);
  const live = ids.filter((id) => chats.has(id) && terminals.has(id));
  if (live.some(paneRuns)) {
    const r = await dialog.showMessageBox(f.win, {
      type: 'warning', noLink: true, defaultId: 0, cancelId: 1,
      message: 'Close the other tabs?', detail: 'What runs in them stops.', buttons: ['Close Tabs', 'Cancel'],
    });
    if (r.response !== 0) return;
  }
  for (const id of live) if (!(await settleEnv(id))) return;
  for (const id of ids) {
    if (chats.has(id) && terminals.has(id)) endTerminal(id);
    else {
      dropPane(id);
      chats.delete(id);
    }
  }
}

// A pane's strip, right-clicked (pages/terminal.js): Rename, and moving it to a tab or a window of its own.
ipcMain.on('term:paneMenu', (e) => {
  const found = chatOf(e);
  const f = found && found[1].frame;
  if (!f) return;
  const id = found[0];
  const split = panes.ids(f.tabs[f.active]).length > 1;
  Menu.buildFromTemplate([
    { label: 'Rename…', click: () => send(found[1].page, 'term:renameStart') },
    { label: 'Move Pane to New Tab', enabled: split, click: () => f.views.has(id) && paneToTab(f, id) },
    { label: 'Move Pane to New Window', enabled: f.views.size > 1, click: () => f.views.has(id) && paneToWindow(f, id) },
    { type: 'separator' },
    { label: 'Close Pane', click: () => f.views.has(id) && endAsked(id) },
  ]).popup({ window: f.win });
});
// A name typed on a pane's strip (a double-click on its name).
ipcMain.on('term:rename', (e, name) => {
  const found = chatOf(e);
  if (found && typeof name === 'string') renamePane(found[0], name);
});

/** The strip's pin (term:pin) for a window and all its tabs: on top of every app, or riding on the dashboard again. */
function setPinned(f, on) {
  f.pinned = on;
  if (on) {
    pinnedWins.add(f.win);
    f.win.setParentWindow(null);
    f.win.setAlwaysOnTop(true, 'floating');
  } else {
    pinnedWins.delete(f.win);
    f.win.setAlwaysOnTop(false);
    if (f.win.isVisible() && !f.win.isMinimized()) pinToDash(f.win);
  }
  for (const id of f.views.keys()) if (chats.has(id)) sendInfo(id, chats.get(id));
}

/** Window `f` to the front with pane `id` (its tab) in front, as a click on its session in the dashboard brings it. */
function showFrame(f, id, keepPlace = false) {
  if (!f || f.win.isDestroyed()) return false;
  f.steppedAside = false;
  if (!keepPlace && !f.win.isVisible() && !PROBE) f.win.setBounds(wholeOnDisplay(f.win.getBounds(), chatHome()));
  if (f.win.isMinimized()) f.win.restore();
  pinToDash(f.win);
  f.win.show();
  f.win.focus();
  focusPane(f, id || f.focus);
  if (chats.has(f.focus)) touchTerminal(f.focus);
  pushWinOpen();
  // The chats list's terminal rows say which windows show.
  pushTerminals();
  pushChats();
  return true;
}

// ---------- the windows' layouts across launches ----------
// Which terminals share a window, as tabs and splits: settings.json's "terminalLayout", for the sessions the host keeps
// (terminals.restore), which come back hidden in the same windows. Only windows of more than one; not before the last
// launch's have been read back, nor while quitting.
let layoutRestored = false, layoutTimer = null;
function saveLayout() {
  if (!layoutRestored || quitting || layoutTimer) return;
  layoutTimer = setTimeout(() => !quitting && writeLayout(), 1000);
}
/** The layout written now: a second after a change, or at once when the app quits with one waiting (leave). */
function writeLayout() {
  clearTimeout(layoutTimer);
  layoutTimer = null;
  const list = [...frames].filter((f) => f.views.size > 1).map((f) => ({ tabs: f.tabs, active: f.active }));
  settings.set('terminalLayout', list.length ? list : undefined);
}
/** The sessions back from the last launch (terminals.restore), hidden, in the windows, tabs and splits they were in. */
function restoreWindows(found, read = true) {
  const byId = new Map(found.map((s) => [s.id, s]));
  const live = new Set(byId.keys());
  // The names typed for terminals that didn't come back go with them.
  const names = settings.get('tabNames');
  if (read && names && typeof names === 'object') {
    const kept = Object.entries(names).filter(([id]) => live.has(id));
    if (kept.length !== Object.keys(names).length) settings.set('tabNames', kept.length ? Object.fromEntries(kept) : undefined);
  }
  const open = (id, into) => {
    const s = byId.get(id);
    return openChatWindow({ id, cwd: s.cwd, claude: s.claude, title: s.title, show: false, into, account: s.account && accounts.account(s.account) ? s.account : null });
  };
  const saved = settings.get('terminalLayout');
  for (const w of Array.isArray(saved) ? saved : []) {
    const tabs = (w && Array.isArray(w.tabs) ? w.tabs : []).map((n) => panes.clean(n, live)).filter(Boolean);
    const ids = tabs.flatMap(panes.ids);
    if (!ids.length) continue;
    open(ids[0]);
    const f = chats.get(ids[0]).frame;
    for (const id of ids.slice(1)) open(id, { frame: f, how: 'tab' });
    f.tabs = tabs;
    f.active = Math.min(Math.max(0, Number(w.active) || 0), tabs.length - 1);
    f.focus = frontOf(f);
    layoutFrame(f);
  }
  for (const id of live) open(id);
  // Not when the last launch's couldn't be read (the session host failed): the layout kept stays for the next launch.
  if (!read) return;
  layoutRestored = true;
  saveLayout();
}

// ---------- Undo Close (the Mac's ⇧⌘T, iTerm2's) ----------
// The terminal windows hidden by the close keys, the swapped Esc or their ×, and the tabs and panes closed out of a window,
// the last one last: Undo Close shows the most recent one that still runs and is still hidden (one opened again since, or
// ended, is passed over); a tab or pane goes back into the window it was closed from, while that one shows.
const closedTerminals = [];
function rememberClosed(id) {
  const at = closedTerminals.indexOf(id);
  if (at >= 0) closedTerminals.splice(at, 1);
  closedTerminals.push(id);
  if (closedTerminals.length > 30) closedTerminals.shift();
}
function undoClose() {
  while (closedTerminals.length) {
    const id = closedTerminals.pop();
    const c = chats.get(id);
    if (!(c && c.win && !c.win.isDestroyed() && !c.win.isVisible() && !c.steppedAside && terminals.has(id))) continue;
    const back = c.closedFrom, as = c.closedAs;
    c.closedFrom = null;
    c.closedAs = null;
    if (back && frames.has(back) && !back.win.isDestroyed() && back.win.isVisible() && c.frame.views.size === 1) {
      // A split pane splits off the last pane of the tab shown there (the Mac's adoptPane); a tab comes back a tab.
      const shown = back.tabs[back.active];
      if ((as === 'right' || as === 'down') && shown) {
        const last = panes.ids(shown).pop();
        takePane(id);
        addPane(back, id, as, last);
      } else moveTab(c.frame, 0, back, back.tabs.length, true);
      return void showFrame(back, id);
    }
    return void showChat(id);
  }
  shell.beep();
}

function showChat(id) {
  const c = chats.get(id);
  if (!c || !c.win || c.win.isDestroyed()) return false;
  return showFrame(c.frame, id);
}

/** The window of a process running outside the app, to the front: its own or the first of its parents' that has one. */
/**
 * The window of a process running outside the app, to the front (restored when it's minimized): its own or the first of
 * its parents' on screen, Windows Terminal's, VS Code's or a console's. Only a visible window counts: a shell in Windows
 * Terminal also has a hidden console window, which would take the click and show nothing. Explorer ends the search (a
 * shell started from the Start menu and handed to Windows Terminal has it as its parent): it would bring the desktop.
 */
function revealOutside(pid) {
  if (process.platform !== 'win32' || !(pid > 0)) return;
  const own = runaways.ais().find((a) => a.pid === pid);
  const ids = [pid, ...((own && own.chain) || runaways.parents(pid))].filter((n) => Number.isInteger(n) && n > 0);
  const script = [
    "Add-Type -Namespace Atl -Name Win -MemberDefinition '",
    '  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);',
    '  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr h, int cmd);',
    `  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);'`,
    `foreach ($id in @(${ids.join(',')})) {`,
    '  $p = Get-Process -Id $id -ErrorAction SilentlyContinue',
    '  if (-not $p) { continue }',
    "  if ($p.ProcessName -eq 'explorer') { break }",
    '  $h = $p.MainWindowHandle',
    '  if ($h -eq [IntPtr]::Zero) { continue }',
    '  if ([Atl.Win]::IsIconic($h)) { [void][Atl.Win]::ShowWindowAsync($h, 9) }',
    '  if (-not [Atl.Win]::SetForegroundWindow($h)) { [void](New-Object -ComObject WScript.Shell).AppActivate([int]$id) }',
    '  break',
    '}',
  ].join('\n');
  // Encoded, so no quote in it is lost on the way to PowerShell.
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], { windowsHide: true, timeout: 15_000 }, () => {});
}

function openSession(sid, fork) {
  if (!sid) return false;
  const liveList = engine.live();
  const liveAgy = !fork && liveList.find((s) => s.convId === sid);
  if (liveAgy) return openSession(liveAgy.sessionId, false);
  const live = liveList.find((s) => s.sessionId === sid);
  // Another AI tool (Codex…) has no conversation to resume or copy: a click shows the window it runs in, ours, or else
  // the terminal's outside the app (Windows Terminal, VS Code…), the first of its parents with a window.
  if (sid.startsWith('ai:')) {
    if (fork || !live) return false;
    if (live.tab && chats.has(live.tab) && terminals.has(live.tab)) return showChat(live.tab);
    revealOutside(live.pid);
    return true;
  }
  if (!fork) {
    // Running in one of the app's windows (a terminal Claude was started in, a chat back from the last launch): its
    // live process decides first, then the window that opened the conversation.
    if (live && live.tab && chats.has(live.tab) && terminals.has(live.tab)) return showChat(live.tab);
    for (const [id, c] of chats) if (c.sessionId === sid && terminals.has(id)) return showChat(id);
  }
  const cwd = engine.sessionCwd(sid) || (live && live.cwd);
  if (!cwd || !fs.existsSync(cwd)) {
    dialog.showMessageBox(dash || undefined, { type: 'warning', message: 'Project folder not found', detail: cwd || "Couldn't tell which folder this chat started in." });
    return false;
  }
  if (engine.sessionTool(sid) === 'antigravity') {
    if (fork) return false;
    openChatWindow({ cwd, claudeArgs: ['agy', '--conversation', sid], sessionId: sid, title: chatlist.title(sid) || path.basename(cwd) });
    return true;
  }
  // A Codex conversation that isn't running (a running one showed its window above): Codex resumes it.
  if (engine.sessionTool(sid) === 'codex') {
    if (fork) return false;
    openChatWindow({ cwd, claudeArgs: ['codex', 'resume', sid], sessionId: sid, title: chatlist.title(sid) || path.basename(cwd) });
    return true;
  }
  // A Cursor chat, the same way: its CLI resumes it by its id (the Mac's openSession).
  if (engine.sessionTool(sid) === 'cursor') {
    if (fork) return false;
    openChatWindow({ cwd, claudeArgs: ['cursor-agent', '--resume', sid], sessionId: sid, title: chatlist.title(sid) || sid.slice(0, 8) });
    return true;
  }
  // A chat running in another terminal can't be resumed twice: it opens as a copy, as "Open a Copy" does on the Mac.
  const copy = fork || !!live;
  // Its title until the engine has the conversation's (chatInfo): never the id's first 8 characters.
  const named = chatlist.title(sid) || (live && live.title) || path.basename(cwd);
  openChatWindow({ cwd, claudeArgs: ['--resume', sid, ...(copy ? ['--fork-session'] : [])], sessionId: copy ? null : sid, title: (copy ? '⑂ ' : '') + named });
  return true;
}

/**
 * End Session, as on the Mac: the window goes and everything that runs in it ends, gently first (the host hangs the
 * session up, then ends what's still there three seconds on, a dev server that shrugged it off included). The dashboard
 * drops its session now and its car blows up now, not when the processes are gone.
 */
function endTerminal(id) {
  const c = chats.get(id);
  const t = terminals.list().find((x) => x.id === id);
  const tree = t && t.pid ? runaways.tree(t.pid) : [];
  // What it ran is on its way out: one that outlives the shell by a second or two isn't a car left behind.
  for (const p of tree) ending.set(p.pid, Date.now() + 10_000);
  // Without the host's help (a terminal running in the app, an older host), what the shell started apart from its
  // console is ended here once the rest has had its time.
  if (!terminals.end(id) && tree.length) setTimeout(() => runaways.fresh().then(() => runaways.kill(tree)), 3000);
  if (c && c.sessionId) {
    const live = engine.live().find((s) => s.sessionId === c.sessionId);
    engine.dismiss(c.sessionId, live && live.pid);
  }
  toDash(`terminalGone(${JSON.stringify(id)})`);
  if (c) {
    // Its tab or pane goes; its window with it when it was the last.
    dropPane(id);
    renamePane(id, '');
    chats.delete(id);
    acctWin.forget(id);
    pushWinOpen();
    pushChats();
  }
  quitIfIdle();
}

function endSession(sid) {
  const live = engine.live().find((s) => s.sessionId === sid);
  for (const [id, c] of chats) {
    if (c.sessionId === sid || (live && live.tab === id)) {
      // Env changes not saved in its window are asked about first.
      endTerminalAsked(id);
      return true;
    }
  }
  // Running outside the app: its process ends.
  if (live && live.pid) {
    // Another AI tool ends with all it started: Codex's launcher alone would leave its codex.exe running.
    if (live.ai) runaways.endLeft(live.pid, Number(sid.split(':')[2]));
    else {
      try {
        process.kill(live.pid);
      } catch {}
    }
  }
  engine.dismiss(sid, live && live.pid);
  return true;
}

// ---------- the orbit's cars ----------
// Every terminal of the app with no Claude in it is a car of its own (a chat whose Claude exited too), a closed one
// included, until End Session: what runs in it (its first job and the CPU that job's processes use) decides how it
// flies. What a closed terminal left running is an amber car (runaways.left) that ends with a click.
let terminalsJSON = '';
const ending = new Map(); // pid -> until when it's an ended terminal's process, not a car left behind
function pushTerminals(force) {
  const live = engine.live(), list = [], jobs = [];
  // The chats list shows them too, each in the folder it was opened in, with what runs in it and whether its window shows.
  const rows = [];
  for (const [pid, until] of ending) if (until < Date.now()) ending.delete(pid);
  for (const t of terminals.list()) {
    const c = chats.get(t.id);
    // Claude in it is a session on the orbit, not a car.
    if (!c || !t.pid || live.some((s) => s.tab === t.id) || (c.claude && chatInfo(t.id, c).status !== 'terminal')) continue;
    const kids = runaways.children(t.pid);
    if (kids.some((k) => /^claude$/i.test(k.name))) continue;
    const job = kids[0];
    if (job) jobs.push(job.pid);
    // The folder the job runs in (PowerShell's cd doesn't move the shell's own), else the one the terminal opened in.
    const cwd = (job && job.cwd) || c.cwd || os.homedir();
    const cmd = job ? commandLabel(job.cmd || job.name) : '';
    list.push({
      id: t.id, cwd: tildify(cwd), dir: path.basename(cwd) || cwd, cmd, running: !!job,
      cpu: Math.round(runaways.busy(kids.map((k) => k.pid))),
    });
    const home = c.cwd || os.homedir();
    const shown = !!c.win && !c.win.isDestroyed() && c.win.isVisible() && !c.win.isMinimized();
    rows.push({ id: t.id, cwd: home, title: path.basename(home) || home, job: cmd, shown });
  }
  rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  chatlist.setTerms(rows);
  for (const l of runaways.left(live)) {
    if (ending.has(l.pid)) continue;
    list.push({
      id: `left:${l.pid}:${l.started}`, cwd: tildify(l.cwd), dir: l.cwd ? path.basename(l.cwd) || l.cwd : l.name, cmd: commandLabel(l.cmd),
      running: true, cpu: Math.round(l.cpu), left: true, pid: l.pid, started: l.started,
    });
  }
  // Their folders come with the next reading, and the AI tools' (the title of their session), and the terminals' shells'
  // own (a relative path Ctrl-clicked in a terminal is from there).
  runaways.want([...jobs, ...runaways.ais().map((a) => a.pid), ...terminals.pids()]);
  list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const json = JSON.stringify(list);
  if (json === terminalsJSON && !force) return;
  terminalsJSON = json;
  toDash(`terminals(${json})`);
}

/** A process's command line as a car's label: `"C:\…\node.exe" "C:\…\npm-cli.js" run dev` -> "npm run dev". */
function commandLabel(cmd) {
  // A path is cut to its last part; a switch (/c) stays as it is.
  const words = (String(cmd).match(/"[^"]*"|\S+/g) || []).map((w) => w.replace(/^"|"$/g, '')).filter(Boolean)
    .map((w) => (/\\|.\//.test(w) ? path.win32.basename(w) : w));
  if (words.length) words[0] = words[0].replace(/\.(exe|cmd|bat)$/i, '');
  if (/^node(js)?$/i.test(words[0] || '') && words.length > 1) words.shift();
  if (/^np[mx]-cli\.js$/i.test(words[0] || '')) words[0] = words[0].slice(0, 3).toLowerCase();
  const label = words.join(' ');
  return label.length > 48 ? `${label.slice(0, 47)}…` : label;
}

// The terminal pages' lines to their shells.
// Viktoria's window has no line to any of these (the preload gives it none either, but it is refused here too).
const chatOf = (e) => !mascot.has(e.sender) && [...chats.entries()].find(([, c]) => pageOf(c.page) === e.sender);
// The env button's files (pages/env.js ↔ envbridge.js, envfiles.js): the env files under the terminal's folder (where its
// shell is when the view opens, termCwd), read and written by the app, named by the page only by their path below it.
// Copies stay out of Clipboard History and saves keep a file's permissions through the env helper (envnative.js), built
// in the app's own folder as Cursor's hook program is.
createEnvBridge({
  ipcMain, chatOf, clipboard, streamer, tildify, home: os.homedir(),
  rootOf: ([id, c]) => termCwd(id, c),
  native: process.platform === 'win32' ? createEnvNative({ ownDir: path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'atalay-terminal') }) : null,
});

// ---------- env changes not saved ----------
// A terminal whose env view holds changes not saved asks first (Save, Don't Save, Cancel, in its window) before anything
// ends it: End This Terminal, the dashboard's End, End Session, Clean Up, quitting, an update's restart (the Mac's
// confirmEnv and confirmEnvBeforeQuit). The page tells envbridge.js when it has such changes (c.envDirty).
let envSettled = false; // the quit under way has asked already (Don't Save leaves the page's changes as they are)
let envAsking = false;
let envDeclinedAt = 0; // when Cancel last kept a forced update's restart from going ahead
const envUnsaved = () => !PROBE && [...chats.values()].some((c) => c.envDirty && pageOf(c.page));
/** A page's answer, or `fallback` when it has none in time (a page that hangs never holds the app) or is gone. */
const askPage = (wc, js, ms, fallback) =>
  Promise.race([wc.executeJavaScript(js, true), new Promise((r) => setTimeout(() => r(fallback), ms))]).catch(() => fallback);
/** True when terminal `id` may end: nothing unsaved, saved, or the user chose not to save. Its window comes to the front. */
async function settleEnv(id) {
  const c = chats.get(id);
  const wc = c && pageOf(c.page);
  if (!c || !c.envDirty || !wc) return true;
  if (!(await askPage(wc, 'window.EnvView ? EnvView.dirty() : false', 2000, false))) {
    c.envDirty = false;
    return true;
  }
  showChat(id);
  // The user's own time to answer, 10 minutes; unanswered, as Cancel.
  return (await askPage(wc, 'window.EnvView ? EnvView.settle() : true', 600_000, false)) !== false;
}
/** Every terminal with env changes not saved, one after the other: false at the first Cancel. */
async function settleAllEnv() {
  for (const id of [...chats.keys()]) if (!(await settleEnv(id))) return false;
  return true;
}
/** End This Terminal, the dashboard's End, End Session, Clean Up: the env view's question first. Resolves whether it ended. */
async function endTerminalAsked(id) {
  if (!(await settleEnv(id))) return false;
  if (chats.has(id)) endTerminal(id);
  return true;
}

ipcMain.on('term:ready', (e, { cols, rows }) => {
  const found = chatOf(e);
  if (!found) return;
  const [id, c] = found;
  // A page loaded again holds no env changes.
  c.envDirty = false;
  // A new window starts its shell; one for a session that's already running (it outlived the app, or the page
  // reloaded) attaches to it.
  if (terminals.has(id)) terminals.attach(id, cols, rows);
  else {
    terminals
      .spawn({ id, cwd: c.cwd, claudeArgs: c.claudeArgs, cols, rows, title: c.title, account: spawnAccount(c) })
      .catch((err) => send(c.page, 'term:data', `\r\n\x1b[31m${err.message}\x1b[0m\r\n`));
  }
  sendInfo(id, c);
  // A page loaded again learns where it is among its window's tabs and panes.
  if (c.frame) {
    c.frame.stateKey = '';
    layoutFrame(c.frame);
  }
  // A worktree's chip and button, drawn again after a reload too.
  c.wtTop = null;
  shipWins.delete(e.sender.id);
  pushShipWindow(id, c);
});
ipcMain.on('term:input', (e, data) => {
  const found = chatOf(e);
  if (found) {
    // The shell's focus reports (ESC[I, ESC[O, which xterm.js sends as the window gains or loses focus) aren't the user
    // at it: a window losing focus, or closed, would take the chats list's "active window" back from the one in front.
    if (data !== '\x1b[I' && data !== '\x1b[O') {
      touchTerminal(found[0]);
      // A key or paste: Clean Up counts a chat's idle time from it too.
      cleanup.typed(found[0]);
    }
    // A pane that goes on with another account (switchAccount): what is typed waits for its new shell.
    if (found[1].hold) found[1].hold.push(data);
    else terminals.write(found[0], data);
  }
});
// Esc and the close keys swapped (Settings › Shortcuts, the Mac's EscClose.swift): the terminal itself had the keys and
// Esc was pressed (pages/terminal.js), so it closes as Ctrl+W closes it, whatever runs in it: its tab or pane, or its
// window when it's the only one. An Esc held or pressed again in the next half second doesn't reach the window Windows
// puts in front next.
ipcMain.on('term:escClose', (e) => {
  const found = chatOf(e);
  if (!found || !shortcuts.escCloses()) return;
  escMuteUntil = Date.now() + 500;
  closePane(found[0]);
});
ipcMain.on('term:resize', (e, { cols, rows }) => {
  const found = chatOf(e);
  if (found) terminals.resize(found[0], cols, rows);
});
// The End button (and Window › End This Terminal) asks first, as on the Mac (ChatWindow's endChat): "End this chat?",
// or "Close this terminal?" for a plain shell, which closes without a word when nothing runs in it, as in iTerm2. One that
// ended already goes at once. True when it may end.
async function confirmEnd(id) {
  const c = chats.get(id);
  if (!c || c.asking) return false;
  if (!terminals.has(id)) return true;
  const info = chatInfo(id, c);
  const shellOnly = info.status === 'terminal' && !info.tool;
  const pid = terminals.list().find((t) => t.id === id)?.pid;
  // The process list is a few seconds old: a shell it calls idle is looked at again (a second and a half at most).
  const idle = async () => {
    if (!pid || runaways.children(pid).length) return false;
    await Promise.race([runaways.fresh(), new Promise((r) => setTimeout(r, 1500))]);
    return !runaways.children(pid).length;
  };
  if (shellOnly && (await idle())) return chats.get(id) === c;
  const who = info.tool || 'Claude';
  c.asking = true;
  try {
    const parent = c.win && !c.win.isDestroyed() && c.win.isVisible() ? c.win : dash || undefined;
    const r = await dialog.showMessageBox(parent, {
      type: 'warning', noLink: true, defaultId: 0, cancelId: 1,
      message: shellOnly ? 'Close this terminal?' : 'End this chat?',
      detail: shellOnly ? 'The shell in this window stops, and what runs in it.' : `${who} in this window stops. The conversation stays saved and you can resume it later.`,
      buttons: [shellOnly ? 'Close Terminal' : 'End Chat', 'Cancel'],
    });
    return r.response === 0 && chats.get(id) === c;
  } finally {
    c.asking = false;
  }
}
// Env changes not saved in its window are asked about before that, as the Mac's endChat asks them first (settleEnv; the
// End button's page has asked them already, env.js).
async function endAsked(id) {
  if (!(await settleEnv(id))) return;
  if (await confirmEnd(id)) endTerminal(id);
}
ipcMain.on('term:end', (e) => {
  const found = chatOf(e);
  if (found) endAsked(found[0]);
});
// The strip's star: the AI session in this window in or out of the chats list's favourites, as its row's star does
// (the Mac's toggleFavorite). Nothing to star in a plain terminal.
ipcMain.on('term:favorite', (e) => {
  const found = chatOf(e);
  if (!found) return;
  const [id, c] = found;
  const live = engine.live();
  const s = live.find((x) => !x.ai && (x.tab === id || (c.sessionId && x.sessionId === c.sessionId)));
  const ids = favoriteIds(s, live.find((x) => x.ai && x.tab === id));
  const pick = ids.find((x) => chatlist.isFavorite(x)) || ids.find((x) => chatlist.listed(x));
  if (!pick) return;
  chatlist.toggleFavorite(pick);
  pushChats(true);
  pushChatInfos();
});
ipcMain.on('term:copy', (e, text) => {
  if (chatOf(e) && typeof text === 'string' && text) clipboard.writeText(text);
});

// A right click in a terminal: the Mac's menu there (ChatTerminal's menu(for:), as in iTerm2), without its splits. The
// page does what's picked (term:do), as it does for the menu bar's items; Copy Claude's Last Reply is done here.
ipcMain.on('term:contextMenu', (e, q) => {
  const found = chatOf(e);
  if (!found) return;
  const [id, c] = found;
  const info = chatInfo(id, c);
  const act = (action) => () => send(c.page, 'term:do', { action });
  const items = [
    // With an AI in it, Copy also works with nothing selected here: Claude's full-screen view keeps its own selection,
    // and the page asks it to copy that (terminal.js copyAction).
    { label: 'Copy', accelerator: 'Ctrl+C', enabled: !!(q && q.hasSelection) || info.chat, click: act('copy') },
    { label: 'Paste', accelerator: 'Ctrl+V', click: act('paste') },
    { label: 'Select All', click: act('selectAll') },
    { type: 'separator' },
    { label: 'Find…', accelerator: shortcuts.accel('find'), click: act('find') },
    // Only with an AI in it that has a reply to copy, named for the one that runs (Codex's, Antigravity's).
    ...(info.canCopyReply ? [{ label: `Copy ${info.tool || 'Claude'}'s Last Reply`, accelerator: shortcuts.accel('copyReply'), click: act('copyReply') }] : []),
    { label: 'Clear Buffer', accelerator: shortcuts.accel('clearBuffer'), click: act('clearBuffer') },
  ];
  Menu.buildFromTemplate(items.map((i) => ({ registerAccelerator: false, ...i }))).popup({ window: c.win });
});

// Copy Claude's Last Reply (the strip's button, the menus, which ask the page through term:do so it shows its "copied"
// badge): the last reply of the AI in the terminal, whole, from Claude's, Codex's or Antigravity's own records (mcp.js,
// the Mac's LastReply), to the clipboard: { ok, chars }. Nothing to copy is a beep, as on the Mac.
ipcMain.handle('term:copyReply', async (e) => {
  const found = chatOf(e);
  if (!found) return { ok: false, chars: 0 };
  const [id, c] = found;
  let text = null;
  try {
    text = typeof mcp.lastReplyForTab === 'function' ? await mcp.lastReplyForTab(id, c.sessionId || null) : null;
  } catch {}
  if (typeof text !== 'string' || !text) {
    shell.beep();
    return { ok: false, chars: 0 };
  }
  clipboard.writeText(text);
  return { ok: true, chars: text.length };
});

// What a paste would bring (pages/terminal.js decides what to type): the files copied in Explorer, or a picture with no
// text (a screenshot).
ipcMain.handle('term:pasteInfo', async (e) => {
  if (!chatOf(e)) return { files: [], image: false };
  // Electron 45's clipboard is the web's (has, read, readText…: no availableFormats or readBuffer). Text on it is a text
  // paste, answered at once; without text, the files copied in Explorer, else a picture.
  const has = (type) => Promise.resolve().then(() => clipboard.has(type)).catch(() => false);
  if (await has('text/plain')) return { files: [], image: false };
  const files = await clipboardFiles().catch(() => []);
  const image = !files.length && (await has('image/png'));
  return { files, image };
});

// The files copied in Explorer, all of them, in their order. Their list (CF_HDROP) has no name Electron can read it by,
// so: the first one's full path from FileNameW, the others' names from the Shell IDList Array (Explorer's list of the
// same items), each matched to a file in the first one's folder. When that can't be done (items from a search, a
// library), PowerShell reads the list.
async function clipboardFiles() {
  if (process.platform !== 'win32') return [];
  // Without readBuffer (Electron 45), PowerShell reads the list.
  if (typeof clipboard.readBuffer !== 'function') return (await dropListFiles()) || [];
  const first = clipboard.readBuffer('FileNameW').toString('utf16le').split('\0')[0];
  if (!first || !path.isAbsolute(first)) return [];
  const ids = clipboard.readBuffer('Shell IDList Array');
  const count = ids.length >= 8 ? ids.readUInt32LE(0) : 1;
  if (count <= 1) return [first];
  return idListFiles(ids, count, path.dirname(first)) || (await dropListFiles()) || [first];
}
// A CIDA: the number of items, then where each one's ID list starts (the parent folder's first). An item's own ID holds
// its long name as UTF-16, ended by a 0: of the folder's files whose name it holds, the longest is it.
function idListFiles(buf, count, dir) {
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return null;
  }
  if (count > 1000 || names.length * count > 2_000_000) return null;
  const coded = names.map((n) => [n, Buffer.from(`${n}\0`, 'utf16le')]);
  const out = [];
  for (let i = 1; i <= count; i++) {
    const at = 4 + 4 * i;
    if (at + 4 > buf.length) return null;
    const off = buf.readUInt32LE(at);
    const cb = off + 2 <= buf.length ? buf.readUInt16LE(off) : 0;
    if (cb < 3 || off + cb > buf.length) return null;
    const item = buf.subarray(off, off + cb);
    let best = null;
    for (const [n, b] of coded) if ((!best || n.length > best.length) && item.includes(b)) best = n;
    if (!best) return null;
    out.push(path.join(dir, best));
  }
  return out;
}
// Windows PowerShell's Get-Clipboard reads the list itself (STA, as it needs), as UTF-8.
function dropListFiles() {
  const script = "[Console]::OutputEncoding = [Text.Encoding]::UTF8; Get-Clipboard -Format FileDropList | ForEach-Object { $_.FullName }";
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-STA', '-EncodedCommand', encoded], { windowsHide: true, timeout: 5000 }, (err, stdout) => {
      const list = err ? [] : String(stdout).split(/\r?\n/).map((s) => s.trim()).filter((s) => s && path.isAbsolute(s));
      resolve(list.length ? list : null);
    });
  });
}

// The strip's pin (the Mac's togglePin): on top of every app's windows, out of the dashboard's (a child goes behind other
// apps with it, and steps aside for its menus); unpinned, it rides on the dashboard again. { pinned } says how it is.
ipcMain.handle('term:pin', (e, q) => {
  const found = chatOf(e);
  if (!found) return { pinned: false };
  const c = found[1];
  const on = q && typeof q.pinned === 'boolean' ? q.pinned : !c.pinned;
  // The whole window, every tab and pane of it (setPinned).
  if (c.frame) setPinned(c.frame, on);
  return { pinned: on };
});

// The terminal's bell (BEL): Windows' own sound, once a second at most, and its taskbar button flashes while another
// window has the keys.
let bellAt = 0;
ipcMain.on('term:bell', (e) => {
  const found = chatOf(e);
  if (!found) return;
  if (Date.now() - bellAt >= 1000) {
    bellAt = Date.now();
    shell.beep();
  }
  const w = found[1].win;
  if (w && !w.isFocused()) attend(w);
});

// A program setting the clipboard (OSC 52, as Windows Terminal allows): its text, 1 MB at most.
ipcMain.on('term:clipboard', (e, q) => {
  const text = q && typeof q.text === 'string' ? q.text : '';
  if (chatOf(e) && text && Buffer.byteLength(text, 'utf8') <= 1024 * 1024) clipboard.writeText(text);
});
ipcMain.on('term:dashboard', (e) => {
  if (!mascot.has(e.sender)) showDashboard();
});
// The folder a terminal's relative paths are from: its shell's (or Claude's) own, else the one it started in.
function termCwd(id, c) {
  const pid = terminals.list().find((t) => t.id === id)?.pid;
  return (pid && runaways.cwd(pid)) || c.cwd || os.homedir();
}
// Which of a line's pieces name files, as the pointer goes over it (a Ctrl-click opens one): [{ path, line, column }
// or null], one for each of `q.links` ({ text, start }) in `q.rows[q.at]`.
ipcMain.handle('term:paths', (e, q) => {
  const found = chatOf(e);
  if (!found || !q || !Array.isArray(q.links)) return [];
  const cwd = termCwd(...found);
  return q.links.slice(0, 40).map((l) => linkTarget({ ...l, rows: q.rows, at: q.at }, cwd, os.homedir()));
});
// A path Ctrl-clicked (worked out again here), or a file:// link the program printed (OSC 8).
ipcMain.on('term:openFile', (e, q) => {
  const found = chatOf(e);
  if (!found || !q) return;
  const cwd = termCwd(...found);
  if (typeof q.url === 'string') {
    const p = fileFromURL(q.url);
    if (p) openTerminalFile({ path: p, line: null, column: null }, cwd);
    return;
  }
  openTerminalFile(linkTarget(q, cwd, os.homedir()), cwd);
});
ipcMain.on('term:open', (e, uri) => {
  if (mascot.has(e.sender) || typeof uri !== 'string') return;
  const clean = uri.trim().replace(/^['"<]+|['">.,;:!?)]+$/g, '');
  if (/^https?:\/\//i.test(clean)) shell.openExternal(clean).catch(() => {});
});
// The header's worktree chip and split button (pages/terminal.js; the Mac's WorktreeChipView and WorktreeShipButton):
// the window's own worktree only, whatever the page sends. An ended window keeps its chip (shipWins).
const shipWinOf = (e) => (mascot.has(e.sender) ? null : shipWins.get(e.sender.id) || null);
ipcMain.on('term:shipMain', (e) => {
  const w = shipWinOf(e);
  const view = w && worktreeShip.headerView(w.top);
  if (view && view.face && view.face.enabled && !view.busy) worktreeShip.handle(view.face.kind, w.top, chats.has(w.id) ? w.id : null);
});
ipcMain.on('term:shipChip', (e) => {
  const w = shipWinOf(e);
  const view = w && worktreeShip.headerView(w.top);
  if (view && view.clickable) worktreeShip.handle('changes', w.top);
});
// ▾: every action for the worktree, as a system menu under the button (`at`: its bottom left, in the page's pixels).
ipcMain.on('term:shipMore', (e, at) => {
  const w = shipWinOf(e);
  const page = w && pageOf(w.win);
  // The window the terminal is a tab or pane of now.
  const win = w && w.chat && w.chat.win;
  if (!page || !win || win.isDestroyed()) return;
  const top = w.top;
  const deleted = worktreeShip.isDeleted(top);
  const its = worktreeShip.items(worktreeShip.status(top), deleted || worktreeShip.isBusy(top));
  const template = [];
  for (const it of its) {
    if (it.after) template.push({ type: 'separator' });
    // The Create PR key is only shown here (the File menu's item has it). A dimmed item says why in its label: Windows
    // menus show no tooltip (menuLabel).
    template.push({ label: menuLabel(it), enabled: it.enabled, accelerator: it.id === 'create' ? shortcuts.accel('createPR') : undefined, registerAccelerator: false,
      click: () => worktreeShip.handle(it.id, top, chats.has(w.id) ? w.id : null) });
  }
  // The page's pixels, from its own corner: its view's place in the window comes first.
  const z = page.getZoomFactor() || 1;
  const v = w.win.getBounds();
  const pos = at && Number.isFinite(at.x) && Number.isFinite(at.y) ? { x: v.x + Math.round(at.x * z), y: v.y + Math.round(at.y * z) } : {};
  send(w.win, 'term:shipMenu', true);
  Menu.buildFromTemplate(template).popup({ window: win, ...pos, callback: () => send(w.win, 'term:shipMenu', false) });
});

// ---------- the overlay: the Ring and the new-terminal folder picker, over the whole screen ----------
let over = null, overReady = false, overPending = null;
// The terminal window a worktree sheet dropped from: it has the keys again when the sheet closes.
let shipAnchor = null;
// `bounds`: where the overlay goes (a worktree sheet sits on its window); else the whole display the pointer is on, or
// the one `at` is on (a point on the screen).
function showOverlay(js, bounds, at) {
  // A worktree sheet at work keeps the overlay where it is: the Ring or the picker would move it off its window.
  if (worktreeShip.running() && over && !over.isDestroyed() && over.isVisible()) {
    shell.beep();
    return false;
  }
  if (!over || over.isDestroyed()) {
    overReady = false;
    over = new BrowserWindow({
      frame: false, transparent: true, resizable: false, movable: false, show: false, skipTaskbar: true, hasShadow: false,
      alwaysOnTop: true, backgroundColor: '#00000000', webPreferences: webPrefs(),
    });
    bootFor(over.webContents);
    over.webContents.on('render-process-gone', () => {
      overReady = false;
      setTimeout(() => over && !over.isDestroyed() && over.webContents.reload(), 500);
    });
    checkPages();
    over.loadFile(path.join(WEB, 'overlay.html'));
    // Clicking elsewhere closes it, unless a worktree sheet is at work (a push, a merge, a delete): that one stays until
    // it's done, as on the Mac (spec 12: no half-done job, nothing hidden while it runs; hideOverlay checks). The keys
    // stay where they went (the browser "Open on GitHub" brought up, another window clicked): nothing takes them back.
    over.on('blur', () => hideOverlay(false));
  }
  if (!bounds) shipAnchor = null;
  over.setBounds(bounds || screen.getDisplayNearestPoint(at || screen.getCursorScreenPoint()).bounds);
  over.setAlwaysOnTop(true, 'pop-up-menu');
  over.show();
  over.focus();
  if (overReady) run(over, js);
  else overPending = js;
  return true;
}
/**
 * Hides the overlay. `refocus`: the user closed it (Cancel, Esc, Done, Ctrl+W), so the window a worktree sheet dropped
 * from has the keys again, as a Mac sheet gives them back to its window; only while the overlay still has them, so a
 * sheet whose job ended after the user went elsewhere (the browser a Create PR opened) takes nothing from where they
 * are. A click elsewhere (blur) hides it without: the keys stay where the click went.
 */
function hideOverlay(refocus = false) {
  if (!over || over.isDestroyed() || !over.isVisible()) return;
  // A worktree sheet at work (Ctrl+W, a click elsewhere) stays until its job is done: only its own sheet starts one.
  if (worktreeShip.running()) return;
  const hadKeys = over.isFocused();
  over.hide();
  // A worktree sheet that isn't at work closes with it (its own close says "done" again, which finds the overlay hidden).
  if (overReady) run(over, 'window.Shortcuts && Shortcuts.close(true); document.querySelector("#picker .l-close")?.click(); window.Worktree && Worktree.isShipOpen && Worktree.isShipOpen() && !Worktree.isBusy() && Worktree.shipClose()');
  worktreeShip.clearSession();
  const a = shipAnchor;
  shipAnchor = null;
  // "Ask … to fix" sent: the AI's window comes forward now the overlay is gone (shipAsk), in place of the anchor.
  const next = shipAfterHide;
  shipAfterHide = null;
  if (next) next();
  else if (refocus && hadKeys && a && !a.isDestroyed() && a.isVisible()) a.focus();
}
// What comes forward once the overlay hides (shipAsk): the AI's chat the prompt went to.
let shipAfterHide = null;

/**
 * The Create PR, Merge or Delete sheet of the worktree `top` (web/worktree-ship.js). From a terminal window
 * (`windowId`) the overlay takes that window's place, so the sheet drops from under its header and the other windows stay
 * usable; without one it stands alone in the middle of the screen. A sheet at work is never replaced. The Mac's
 * Overlay.showShip.
 */
function showShip(kind, top, windowId) {
  const c = windowId ? chats.get(windowId) : null;
  const win = c && c.win && !c.win.isDestroyed() && c.win.isVisible() && !c.win.isMinimized() ? c.win : null;
  const opts = JSON.stringify({ kind, top, anchored: !!win });
  const open = () => {
    // The sheet's header gap (62 px in the page) is the window's title bar and its own header.
    showOverlay(`Overlay.ship(${opts})`, win ? win.getBounds() : null);
    shipAnchor = win;
  };
  if (!over || over.isDestroyed() || !over.isVisible() || !overReady) return open();
  over.webContents.executeJavaScript('!!(window.Worktree && Worktree.isBusy())').then((b) => (b ? shell.beep() : open()), open);
}

/**
 * The worktree sheets' requests (web/api.js ship*; the Mac's Overlay.swift ship messages). Every one that names a folder
 * must name a linked worktree's own folder: a sheet can't point git anywhere else.
 */
async function handleShip(body) {
  const top = typeof body.top === 'string' ? body.top : '';
  const str = (v) => (typeof v === 'string' ? v : '');
  const refuse = { kind: 'nothing', title: "This isn't a worktree." };
  switch (body.type) {
    case 'shipInfo':
      if (!worktreeShip.knows(top)) return { error: "This isn't a worktree." };
      return worktreeShip.page(['create', 'merge', 'prmerge', 'delete'].includes(body.kind) ? body.kind : 'create', top);
    case 'shipCreatePR':
      return worktreeShip.knows(top) ? worktreeShip.createPR(top, str(body.title), str(body.body), str(body.into)) : refuse;
    case 'shipMerge':
      return worktreeShip.knows(top) ? worktreeShip.mergeLocal(top, str(body.message)) : refuse;
    case 'shipMergePR':
      return worktreeShip.knows(top) ? worktreeShip.mergePR(top, Number(body.number) || 0, str(body.sha), str(body.method) || 'merge') : refuse;
    case 'shipPushBase':
      return worktreeShip.knows(top) ? worktreeShip.pushBase(top) : refuse;
    case 'shipDelete':
      if (!worktreeShip.knows(top)) return refuse;
      return worktreeShip.remove(top, { deleteBranch: body.deleteBranch === true, force: body.force === true, ids: Array.isArray(body.ids) ? body.ids : [], sha: str(body.sha) });
    // Sent: that chat's window comes to the front, its strip saying WORKING soon after. Not the anchor: the sheet closes
    // on this answer ("done"), and the window it dropped from would take the keys back from the AI's. The chat comes
    // forward once the overlay is hidden (hideOverlay), or after a second if the page never closes it.
    case 'shipAsk': {
      const r = await worktreeShip.ask(str(body.prompt), str(body.sid));
      const s = r.ok && engine.live().find((x) => x.sessionId === str(body.sid));
      if (s && s.tab && chats.has(s.tab)) {
        shipAnchor = null;
        const show = () => showChat(s.tab);
        if (!over || over.isDestroyed() || !over.isVisible()) show();
        else {
          shipAfterHide = show;
          setTimeout(() => {
            if (shipAfterHide !== show) return;
            shipAfterHide = null;
            show();
          }, 1000);
        }
      }
      return r;
    }
    case 'shipCopy':
      clipboard.writeText(str(body.text));
      return true;
    case 'shipOpenURL': {
      const s = worktreeShip.status(top);
      return worktreeShip.open(str(body.url), (s && s.remote && s.remote.host) || '');
    }
    // Any folder of a repo the app shows (the base's folder too): Source Control only opens what it lists.
    case 'shipShowChanges':
      hideOverlay();
      if (top) showSourceControl(top);
      return true;
    case 'shipShowChat': {
      hideOverlay();
      const s = engine.live().find((x) => x.sessionId === str(body.sid));
      if (s && s.tab && chats.has(s.tab)) showChat(s.tab);
      return true;
    }
    default:
      throw new Error('unknown request');
  }
}
/** The wheel, centred where the pointer is (Ctrl and the middle mouse button, or Ctrl+K: Windows has no four-finger
 *  click), or at `at` (a point on the screen). The line under it says how it opens, as Settings › Shortcuts set it (the
 *  Mac's Shortcuts.ringHint). */
function showShortcuts(at) {
  wheelOpened();
  const p = at || screen.getCursorScreenPoint();
  const d = screen.getDisplayNearestPoint(p);
  const z = (over && !over.isDestroyed() && over.webContents.getZoomFactor()) || themes.uiScale() || 1;
  return showOverlay(`Overlay.shortcuts(${Math.round((p.x - d.bounds.x) / z)}, ${Math.round((p.y - d.bounds.y) / z)}, ${JSON.stringify(shortcuts.ringHint())})`, null, p);
}
// Ctrl and the middle button in any of the app's windows (preload.js).
ipcMain.on('atl:wheel', (e) => {
  if (!mascot.has(e.sender)) showShortcuts();
});

// ---------- what's new and the tips ----------
// What's new is off on Windows (whatsnew.js), so the page never asks; kept as on the Mac for when it's turned on. Windows
// has no build number (cloud.js), so `whatsNewUnread` would hold the app's version.
function pushWhatsNew() {
  const state = { unread: settings.get('whatsNewUnread') === app.getVersion(), wheel: settings.get('tipUsedWheel') === true };
  toDash(`whatsNew(${JSON.stringify({ state })})`);
}
// The Ring opened at least once: its tip on the dashboard is only for someone who never did.
function wheelOpened() {
  if (settings.get('tipUsedWheel') === true) return;
  settings.set('tipUsedWheel', true);
  pushWhatsNew();
}
// Help > What's New ('notes') or Tips ('tips'), and the "updated" note's click: the dashboard in front, the window open.
function openWhatsNew(what) {
  showDashboard();
  toDash(`whatsNew(${JSON.stringify({ open: what === 'tips' ? 'tips' : 'notes' })})`);
}
// Settings…: the dashboard in front, Settings open on the category used last.
function openSettings() {
  showDashboard();
  toDash('openSettings(null)');
}

// ---------- the messages panels: the corner's notices and friends' chats ----------
// Each chat panel's intended bounds: on a scaled display (125%, 150%) Electron's getBounds() rounds up by a pixel, so
// reading it back on every drag step would grow the panel as it moves.
const panelBounds = new WeakMap();
// A level-up or a new badge takes the screen (the notices' takeover): keys do nothing while it plays (as long as the page
// asks, 4 s at most), then a key ends it (a badge's reveal jumps to its burst), as on the Mac (Messages.swift holds).
const takeover = { on: false, lockedUntil: 0 };
function panelWindow(role, friend) {
  const win = new BrowserWindow({
    width: 380, height: 140, frame: false, transparent: true, resizable: false, show: false, skipTaskbar: role === 'notices',
    alwaysOnTop: role === 'notices', hasShadow: false, backgroundColor: '#00000000', webPreferences: webPrefs(),
  });
  // The chat window's saved size (page px, without the glow's ring) goes in as __CHAT_SIZE__ (preload.js).
  const savedSize = settings.get('chatWindowSize');
  const chatSize = role === 'chat' && Array.isArray(savedSize) && savedSize.length === 2 && savedSize.every((v) => Number.isFinite(v) && v >= 1) ? savedSize : null;
  bootFor(win.webContents, { role, friend, chatSize });
  if (role === 'notices') {
    win.webContents.on('before-input-event', (e, input) => {
      if (input.type !== 'keyDown' || !(takeover.on || Date.now() < takeover.lockedUntil)) return;
      e.preventDefault();
      if (Date.now() >= takeover.lockedUntil) run(win, 'window.__messages && __messages.skip && __messages.skip()');
    });
  }
  panelWaiting.set(win, []);
  win.webContents.on('render-process-gone', () => {
    panelWaiting.set(win, []);
    if (role === 'notices' && !win.isDestroyed()) {
      win.setIgnoreMouseEvents(false);
      win.hide();
    }
    setTimeout(() => !win.isDestroyed() && win.webContents.reload(), 500);
  });
  checkPages();
  win.loadFile(path.join(WEB, 'messages.html'));
  return win;
}

// The level-up waits for the app to be in front (the notices' "focus"), as on the Mac.
function tellFocus() {
  const focused = !!BaseWindow.getFocusedWindow();
  // No window of the app in front (from the dashboard or from a terminal, a chat, a note): an attack now reads the window
  // list (dashExposed), so its helper starts here, up by the time one comes (its first compile takes a few seconds).
  if (!focused && process.platform === 'win32') attackDesk.start();
  toNotices(`focus(${focused})`);
  // Whether a chat is on screen depends on it too (the nudge: tellShowing).
  if (panels.chats.size) tellShowing();
  if (dash && !dash.isDestroyed()) toDash(`visibility(${dash.isVisible() && !dash.isMinimized()}, ${focused})`);
}
app.on('browser-window-focus', tellFocus);
// Going from one of the app's windows to another blurs the first before the second has focus.
app.on('browser-window-blur', () => setImmediate(tellFocus));
// Viktoria greets when the app comes to the front and lets go of the cursor when it leaves.
app.on('browser-window-focus', () => setImmediate(() => mascot.focusChanged()));
app.on('browser-window-blur', () => setImmediate(() => mascot.focusChanged()));

// ---------- a chat that needs you ----------
// A chat waiting for the user (an approval, a question) while the app is behind other windows: a notice in the corner
// (the notices' "NEEDS YOU") until the chat moves on or the app comes to the front, as on the Mac (WaitNotifier.swift).
// With the app in front nothing pops up: the chat itself shows that it waits.
const waitNotices = { waits: new Map(), shown: new Set(), primed: false }; // sid -> what it waits for; those in the corner

// One of the app's windows has the keys; the corner's notices don't count (a click on one is how it's answered).
function appInFront() {
  const w = BaseWindow.getFocusedWindow();
  return !!w && w !== panels.notices;
}

function updateWaits() {
  const now = new Map(), byId = new Map();
  for (const s of engine.live()) {
    if (s.status !== 'waiting') continue;
    now.set(s.sessionId, s.waitingFor || '');
    byId.set(s.sessionId, s);
  }
  for (const id of waitNotices.shown) {
    if (now.has(id)) continue;
    waitNotices.shown.delete(id);
    toNotices(`waitOver && __messages.waitOver(${JSON.stringify(id)})`);
  }
  // The first state only says what was already waiting at launch: no notices for that.
  if (waitNotices.primed && !appInFront()) {
    for (const [id, what] of now) {
      const before = waitNotices.waits.get(id);
      // Still the same wait: one notice is enough. Another question in the same chat is a new one.
      if (before !== undefined && (!before || !what || before === what)) continue;
      toNotices(`wait && __messages.wait(${JSON.stringify(waitNotice(byId.get(id)))})`);
      waitNotices.shown.add(id);
    }
  }
  waitNotices.waits = now;
  waitNotices.primed = true;
}

// The app came to the front: the user sees the chats themselves.
app.on('browser-window-focus', (e, w) => {
  if (w === panels.notices) return;
  for (const id of waitNotices.shown) toNotices(`waitOver && __messages.waitOver(${JSON.stringify(id)})`);
  waitNotices.shown.clear();
  // And the taskbar buttons flashing for one stop (askAttention).
  stopAttention();
});
// The menu's terminal items (Find, the scrolling, Copy Claude's Last Reply…) are on only while a terminal window has the
// keys: elsewhere their keys stay the page's (the dashboard's editor, a note).
for (const ev of ['browser-window-focus', 'browser-window-blur']) app.on(ev, () => setImmediate(syncTerminalItems));

// Whitespace runs fold to one space; longer text ends in "…" (engine.js's clip).
function clip(s, n) {
  const t = String(s || '').split(/\s+/).filter(Boolean).join(' ');
  const chars = Array.from(t);
  return chars.length > n ? chars.slice(0, n - 1).join('') + '…' : t;
}

// Which chat, where (another AI tool's name first), what it waits for.
function waitNotice(s) {
  // Streamer mode: the made-up names the dashboard shows.
  const on = streamer.on;
  const folder = on ? streamer.project(s.cwd) : path.basename(s.cwd || '') || s.cwd || '';
  const real = (!s.ai && chatlist.title(s.sessionId)) || s.title || s.prompt || '';
  const name = on && real ? streamer.fake('title', real) : real;
  const what = s.waitingFor ? (on ? streamer.fake('wait', s.waitingFor) : s.waitingFor) : 'waiting for your approval';
  return { sid: s.sessionId, title: clip(name || folder, 80), folder: (s.ai ? `${s.name} · ` : '') + folder, what: clip(what, 200) };
}

// A click on one: that chat in front, or the terminal it runs in outside the app (Windows Terminal, VS Code…), as iTerm2
// or Terminal comes forward on the Mac; a copy of it would only ask again.
function openWait(sid) {
  if (typeof sid !== 'string' || !sid) return false;
  const live = engine.live().find((s) => s.sessionId === sid);
  if (live && !live.ai && live.host === 'term') {
    revealOutside(live.pid);
    return true;
  }
  return openSession(sid, false);
}

// Whether the chat window is really on screen: shown, not minimized, and an Orbiterm window has the keys (Electron has no
// occlusion state, so "the app is in front" stands in for "not covered"). A nudge shakes the chat only then; else its card comes.
function chatSeen() {
  const w = panels.chats.get('chat');
  return !!w && !w.isDestroyed() && w.isVisible() && !w.isMinimized() && !!BaseWindow.getFocusedWindow();
}
// The friend whose tab is in front (panels.front, the chat page's `showing`) while the chat window itself has the keyboard focus,
// else null: only their nudge shakes the chat (any other brings the card, and the terminals or the map shake).
function chatFocused() {
  const w = panels.chats.get('chat');
  return !!w && !w.isDestroyed() && w.isVisible() && !w.isMinimized() && w.isFocused() ? panels.front || null : null;
}
function tellShowing() {
  toNotices(`showing && __messages.showing(${JSON.stringify([...panels.showing])}, ${chatSeen()}, ${JSON.stringify(chatFocused())})`);
}

// ---------- the nudge's window shake (nudge.ts, messages.js; the Mac's WindowShake in Messages.swift) ----------
// One jolt, two-dimensional and dying out so it reads as a buzz: 22 legs (strong first, then settling), ease-in-out, 1400 ms like MSN, the offsets of messages.css
// `ndg-jolt` (x right, y down) times `amp`, whole DIPs, a main-process timer at about 120 Hz. The start bounds are taken once
// (the panel's own copy, never read back) and every step sets all four values, so a scaled display doesn't drift; the end puts the
// exact start back. Never on a maximized or full-screen window, nor with Reduce Motion; never a focus, a raise or a show.
const SHAKE_STOPS = [[0,0,0], [45,7.7,-4.8], [92,-7.3,-3.7], [140,7,4.4], [191,-6.6,2.5], [243,6.2,-3.1], [298,-5.9,-2.2], [355,5.5,1.4], [414,-5.1,1.3], [475,4.7,-2.9], [538,-4.3,-2.1], [605,3.8,2.4], [673,-3.4,1.3], [745,3,-1.5], [819,-2.5,-1], [896,2.1,0.5], [977,-1.7,0.4], [1060,1.3,-0.8], [1147,-0.9,-0.4], [1237,0.5,0.3], [1330,-0.2,0.1], [1400,0,0]];
const shakes = new Map(); // window -> { timer, start }
let noticesHold = false; // the notices panel holds the screen (takeover, flames, DANGER's banner, the alarm): nothing shakes
const reducedMotion = () => {
  try {
    return !!require('electron').systemPreferences.getAnimationSettings().prefersReducedMotion;
  } catch {
    return false;
  }
};
function stopShake(win) {
  const sh = shakes.get(win);
  if (!sh) return;
  clearInterval(sh.timer);
  shakes.delete(win);
  if (!win.isDestroyed()) win.removeListener('will-move', sh.moved);
  // Back to the exact start, unless it was maximized or went full screen meanwhile (that frame is the system's now).
  if (!win.isDestroyed() && !win.isMaximized() && !win.isFullScreen()) win.setBounds(sh.start);
}
function shakeWin(win, amp) {
  if (!win || win.isDestroyed() || shakes.has(win) || !(amp > 0) || reducedMotion()) return;
  if (!win.isVisible() || win.isMinimized() || win.isMaximized() || win.isFullScreen()) return;
  const b = (typeof panelBounds !== 'undefined' && panelBounds.get(win)) || win.getBounds();
  const start = { x: Math.round(b.x), y: Math.round(b.y), width: b.width, height: b.height };
  const t0 = Date.now();
  const timer = setInterval(() => {
    const t = Date.now() - t0;
    if (t >= 1400 || win.isDestroyed() || !win.isVisible() || win.isMinimized() || win.isMaximized() || win.isFullScreen() || noticesHold) return stopShake(win);
    let i = 1;
    while (i < SHAKE_STOPS.length - 1 && SHAKE_STOPS[i][0] < t) i++;
    const [ta, xa, ya] = SHAKE_STOPS[i - 1], [tb, xb, yb] = SHAKE_STOPS[i];
    const k = (1 - Math.cos(Math.PI * Math.min(Math.max((t - ta) / (tb - ta), 0), 1))) / 2;
    win.setBounds({ x: start.x + Math.round((xa + (xb - xa) * k) * amp), y: start.y + Math.round((ya + (yb - ya) * k) * amp), width: start.width, height: start.height });
  }, 8);
  // The user takes the window by its frame (a native drag; setBounds doesn't fire this): the shake ends at once, as on the Mac.
  const moved = () => stopShake(win);
  win.once('will-move', moved);
  shakes.set(win, { timer, start, moved });
}
// A friend's nudge while their chat doesn't have the keyboard focus (the card came as well), in this order: every terminal
// window on screen shakes at once (visible, not minimized, not stepped aside; never maximized or full screen: shakeWin); else the
// map's centre circle when the dashboard is on screen (in the page; the window itself never moves); else nothing (the card and
// the buzz are all). Never a focus, a raise or a show. Electron has no occlusion state: with no Orbiterm window in front another
// app may cover them, so then only a terminal pinned on top (above every app) counts as on screen, and the map doesn't.
function nudgeDashboard() {
  if (noticesHold || reducedMotion()) return;
  const front = appInFront();
  const wins = new Set();
  for (const c of chats.values()) {
    const w = c.win;
    if (!c.steppedAside && (front || c.pinned) && w && !w.isDestroyed() && w.isVisible() && !w.isMinimized() && !w.isMaximized() && !w.isFullScreen()) wins.add(w);
  }
  if (wins.size) {
    for (const w of wins) shakeWin(w, 1);
    return;
  }
  if (front && dash && !dash.isDestroyed() && dash.isVisible() && !dash.isMinimized()) toDash('nudgeCore()');
}

function notices() {
  if (PROBE) return null;
  if (!panels.notices || panels.notices.isDestroyed()) panels.notices = panelWindow('notices');
  return panels.notices;
}

// A friend's chat, all of it on one display (by default the one it's mostly on), moved in from the edges (cut to fit
// only where the display is smaller). With several displays a chat opened where it was left on one since unplugged or
// moved, or grew past the bottom, out of sight.
function wholeOnDisplay(r, display = screen.getDisplayMatching(r)) {
  const a = display.workArea;
  const width = Math.min(r.width, a.width), height = Math.min(r.height, a.height);
  return { x: Math.min(Math.max(r.x, a.x), a.x + a.width - width), y: Math.min(Math.max(r.y, a.y), a.y + a.height - height), width, height };
}

// The display a chat opens on, as on the Mac: the dashboard's while it's on screen, else the one in use (the pointer's).
// Opening where it was last left could put it on another display, out of sight of someone looking at the dashboard.
function chatHome() {
  if (dash && !dash.isDestroyed() && dash.isVisible() && !dash.isMinimized()) return screen.getDisplayMatching(dash.getBounds());
  return screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
}

// A display plugged in, unplugged or changed: the chats on screen come back into view, whole.
let watchingDisplays = false;
function watchDisplays() {
  if (watchingDisplays) return;
  watchingDisplays = true;
  for (const event of ['display-added', 'display-removed', 'display-metrics-changed']) {
    screen.on(event, () => {
      for (const w of panels.chats.values()) {
        if (w.isDestroyed() || !w.isVisible()) continue;
        const b = panelBounds.get(w) || w.getBounds();
        const next = wholeOnDisplay({ x: Math.round(b.x), y: Math.round(b.y), width: b.width, height: b.height });
        panelBounds.set(w, next);
        w.setBounds(next);
      }
    });
  }
}

// The one chat window, a tab for each conversation (panels.chats keeps it under one key). Closing it only hides it: its
// page, the friends list and the conversations stay, and live events keep them current.
function chatPanel() {
  watchDisplays();
  let win = panels.chats.get('chat');
  if (!win || win.isDestroyed()) {
    win = panelWindow('chat');
    panels.chats.set('chat', win);
    for (const ev of ['show', 'hide', 'minimize', 'restore']) win.on(ev, () => setImmediate(tellShowing));
    win.on('closed', () => {
      // Its timer stops too (stopShake doesn't touch a destroyed window).
      stopShake(win);
      if (panels.chats.get('chat') === win) panels.chats.delete('chat');
      panels.front = null;
      if (panels.showing.size) {
        panels.showing.clear();
        tellShowing();
      }
    });
  }
  return win;
}

// The chat window made ahead of time, hidden, so the first chat opened doesn't wait for its page and the friends list.
function warmChat() {
  if (PROBE || panels.chats.has('chat')) return;
  runPanel(chatPanel(), 'window.__messages && __messages.warm && __messages.warm()');
}

function openFriendChat(friend) {
  if (!friend) return false;
  // The conversation, loaded and in front (the window and its tab come forward).
  runPanel(chatPanel(), `window.__messages && __messages.open(${JSON.stringify(friend)})`);
  return true;
}

function handleMessages(win, body) {
  const role = win === panels.notices ? 'notices' : 'chat';
  switch (body.type) {
    case 'ready': {
      const waiting = panelWaiting.get(win) || [];
      panelWaiting.delete(win);
      for (const js of waiting) run(win, js);
      if (role === 'notices') {
        tellFocus();
        if (panels.showing.size) tellShowing();
        const xp = cloud.json().xp;
        if (xp) toNotices(`xp(${JSON.stringify(xp)})`);
      }
      return true;
    }
    case 'layout': {
      // The page measures in its own pixels: at a zoom other than 100% (the dashboard's text size, which Chromium gives
      // every page of the app's), the window is that many times larger.
      const z = win.webContents.getZoomFactor() || 1;
      const w = Math.round((body.w || 0) * z), h = Math.round((body.h || 0) * z);
      // The takeover's keys: held while it's on screen, free once the panel is a notice again (or gone).
      if (role === 'notices') {
        takeover.on = body.place === 'screen' && w >= 1 && h >= 1;
        if (!takeover.on) takeover.lockedUntil = 0;
        noticesHold = w >= 1 && h >= 1 && (body.place === 'screen' || body.place === 'fire' || body.place === 'center');
      }
      if (role === 'chat') stopShake(win);
      if (w < 1 || h < 1) {
        if (role === 'notices') win.setIgnoreMouseEvents(false);
        win.steppedAside = false;
        win.setParentWindow(null);
        win.hide();
        // The chat window is only hidden (its page and tabs stay); nobody's tab is showing now.
        if (role === 'chat' && panels.showing.size) {
          panels.showing.clear();
          tellShowing();
        }
        return true;
      }
      // An edge being dragged (messages.js): one setBounds with the new size, the left/top edges moving the corner in
      // the same call, and nothing else.
      if (role === 'chat' && body.live === true && win.isVisible()) {
        const cur = panelBounds.get(win) || win.getBounds();
        const next = wholeOnDisplay({ x: Math.round(cur.x + (Number(body.dx) || 0) * z), y: Math.round(cur.y + (Number(body.dy) || 0) * z), width: w, height: h });
        panelBounds.set(win, next);
        win.setBounds(next);
        return true;
      }
      if (role === 'notices') {
        const d = chatHome();
        win.setIgnoreMouseEvents(body.place === 'fire', { forward: true });
        if (body.place === 'screen') {
          win.setAlwaysOnTop(true, 'screen-saver');
          win.setBounds(d.bounds);
          win.show();
          win.focus();
        } else {
          win.setAlwaysOnTop(true, 'floating');
          const a = d.workArea;
          const at = body.place === 'center' ? { x: a.x + Math.round((a.width - w) / 2), y: a.y + Math.round((a.height - h) / 2) } : { x: a.x + a.width - w - 12, y: a.y + a.height - h - 12 };
          win.setBounds(body.place === 'fire' ? a : { ...at, width: w, height: h });
          if (!win.isVisible()) win.showInactive();
        }
      } else {
        const cur = panelBounds.get(win) || win.getBounds();
        let next;
        if (!win.isVisible() && !win.steppedAside) {
          // Where it was left while that's on the display it opens on (give or take 40 px), else that display's middle;
          // a chat opened while others are on screen cascades from the last one, as on the Mac.
          const home = chatHome(), a = home.workArea;
          const other = [...panels.chats.values()].reverse().find((p) => p !== win && !p.isDestroyed() && p.isVisible());
          const ob = other && (panelBounds.get(other) || other.getBounds());
          const saved = settings.get('chatWindowTopLeft');
          const p = Array.isArray(saved) && saved.length === 2 && { x: saved[0] + 40, y: saved[1] + 20 };
          const left = p && p.x >= a.x - 40 && p.x < a.x + a.width + 40 && p.y >= a.y - 40 && p.y < a.y + a.height + 40;
          const [x, y] = ob ? [Math.round(ob.x) + 34, Math.round(ob.y) + 34] : left ? saved : [a.x + Math.round((a.width - w) / 2), a.y + Math.round((a.height - h) / 2)];
          next = wholeOnDisplay({ x, y, width: w, height: h }, home);
        } else {
          next = wholeOnDisplay({ x: Math.round(cur.x), y: Math.round(cur.y), width: w, height: h });
        }
        panelBounds.set(win, next);
        win.setBounds(next);
        if (modalOpen) {
          win.steppedAside = true;
          return true;
        }
        pinToDash(win);
        if (body.focus) {
          win.show();
          win.focus();
        } else if (!win.isVisible()) win.showInactive();
      }
      return true;
    }
    // A nudge (nudge.ts): the chat window's own frame moves for 1.4 s, only when it is on screen and nothing holds the screen. The
    // page asks only for its own chat with the friend (`key`: only while it has the keyboard focus, else the card came and the
    // terminals or the map shake), or for the sender's half jolt.
    case 'shake':
      if (role === 'chat' && !noticesHold && chatSeen() && (!body.key || win.isFocused()) && Number(body.amp) > 0) shakeWin(win, Math.min(Number(body.amp), 1));
      return true;
    // The nudge's card came up (the chat isn't on screen): the dashboard shakes by its own state.
    case 'nudgeShake':
      if (role === 'notices') nudgeDashboard();
      return true;
    case 'drag': {
      if (role !== 'chat') return true;
      stopShake(win);
      const b = panelBounds.get(win) || win.getBounds(), z = win.webContents.getZoomFactor() || 1;
      b.x += (body.dx || 0) * z;
      b.y += (body.dy || 0) * z;
      panelBounds.set(win, b);
      win.setBounds({ x: Math.round(b.x), y: Math.round(b.y), width: b.width, height: b.height });
      return true;
    }
    case 'dragEnd': {
      if (role !== 'chat') return true;
      stopShake(win);
      const b = panelBounds.get(win) || win.getBounds();
      const next = wholeOnDisplay({ x: Math.round(b.x), y: Math.round(b.y), width: b.width, height: b.height });
      panelBounds.set(win, next);
      win.setBounds(next);
      settings.set('chatWindowTopLeft', [next.x, next.y]);
      // Its size too (the page's px, without the 8 px glow ring each side), after an edge made it larger or smaller.
      const z = win.webContents.getZoomFactor() || 1;
      settings.set('chatWindowSize', [Math.round(next.width / z) - 16, Math.round(next.height / z) - 16]);
      return true;
    }
    // A friend's picture or name in the chat: the dashboard in front, on the friends with their card.
    case 'openFriend':
      if (role !== 'chat' || typeof body.id !== 'string' || !body.id) return true;
      showDashboard();
      toDash(`openFriend(${JSON.stringify([body.id]).slice(1, -1)})`);
      return true;
    // The "updated" note was clicked: what's new in the version you're on.
    case 'openWhatsNew':
      openWhatsNew('notes');
      return true;
    case 'openUpdate':
      showDashboard();
      toDash('openUpdate()');
      return true;
    case 'openProfile':
      showDashboard();
      toDash('openProfile()');
      return true;
    // A shared note's invite was accepted in a notice: the dashboard in front, and that note opened in its window once it is
    // in (the Mac's MessagePanel.onOpenShared).
    case 'openShared':
      if (typeof body.id !== 'string' || !body.id || body.id.length > 64) return true;
      showDashboard();
      run(dashView, `window.Notes && Notes.openShared && Notes.openShared(${JSON.stringify(body.id)})`);
      return true;
    case 'openNotifications':
      showDashboard();
      toDash('openView("notifications")');
      return true;
    case 'openDanger':
      showDashboard();
      toDash('openDanger()');
      return true;
    case 'endRunaway':
      return runaways.end(body.pid, body.started);
    case 'openWait':
      return openWait(body.sid);
    // The "same file" notice: the dashboard in front, on its panels (files.heat names the file).
    case 'openClash':
      showDashboard();
      toDash('openView("dash")');
      return true;
    // Fire back (or its Cancel) from the who-fired-at-me card or a chat: the dashboard fires (Attack.press / cancelFor).
    case 'attackFire':
    case 'attackCancel':
      if (typeof body.id !== 'string' || !body.id || body.id.length > 64) return true;
      // Only the notices card and the chat window (the Mac has this handler there alone): a fire spends ORB, and every page
      // here can post on "messages".
      if (!win || !(win === panels.notices || [...panels.chats.values()].includes(win))) return true;
      run(dashView, `window.Attack && Attack.${body.type === 'attackFire' ? 'press' : 'cancelFor'} && Attack.${body.type === 'attackFire' ? 'press' : 'cancelFor'}(${JSON.stringify(body.id)})`);
      return true;
    // The forced update's notice: "restart now" is "update now".
    case 'restartNow':
      if (role === 'notices') updates.now();
      return true;
    case 'openChat':
      return openFriendChat(body.id);
    // A code block's Copy, or Copy text on a message (the page's own clipboard refuses a window without focus).
    case 'copyText':
      if (typeof body.text === 'string' && body.text) clipboard.writeText(body.text);
      return true;
    // The takeover's lock on the keys (ms; 0 frees them).
    case 'lock':
      if (role === 'notices') takeover.lockedUntil = Date.now() + Math.min(Math.max(Number(body.ms) || 0, 0), 4000);
      return true;
    case 'showing': {
      // The friends whose tabs are open in the chat window (or no one anymore): no pop-ups for them. `id`, the old
      // form, is the one in front.
      if (role !== 'chat') return true;
      // The one in front: the nudge shakes the chat only for that friend (chatFocused).
      panels.front = typeof body.id === 'string' && body.id ? body.id : null;
      panels.showing.clear();
      if (Array.isArray(body.ids)) {
        for (const id of body.ids) if (typeof id === 'string' && id) panels.showing.add(id);
      } else if (typeof body.id === 'string' && body.id) {
        panels.showing.add(body.id);
      }
      tellShowing();
      return true;
    }
    case 'log':
      console.log(`${role} page:`, body.msg);
      return true;
    default:
      return true;
  }
}

// ---------- updates: the releases repo's "windows" release (electron-updater; scripts/release.js) ----------
// A new version downloads by itself and goes in, as on the Mac, when the user has stepped away for 10 minutes (or wants
// updates right away) and the restart stops nothing: chats in the session host go on across it. One running in the app
// itself (no host) would end, so then it waits for the user's quit (or "update now"). A forced version waits an hour at
// most, as on the Mac, and the notices say when it restarts 5 minutes before.
const updates = (() => {
  let offer = null, ready = false, busy = null, checking = false, checkedAt = null, error = null;
  // How far the download has come (0…1, whole percents), as on the Mac: the page's bar and "updating 42%", so a long
  // download never looks frozen.
  let progress = null;
  // "Update now" pressed while the update was still downloading (the notice of a new version comes as its download
  // starts): it goes in the moment the download is done, as on the Mac, rather than waiting for the user to step away
  // while the page says "downloading…" with no way out.
  let whenReady = false;
  let forcedVersion = null, forcedAt = 0, last426At = 0;
  // A forced version restarts the app after an hour even over chats and terminals running in it (no host), as on the
  // Mac: the notices say when 5 minutes before (warnedFor, warnedAt), and the restart never comes sooner than 5 minutes
  // after they did, however long the version had waited by then (asleep, a slow download). `overdue`: this restart is
  // that one, so the quit doesn't ask about running chats (the installer closes the app within seconds anyway).
  const FORCE_MS = 3600_000, WARN_MS = 300_000;
  let warnedFor = null, warnedAt = 0, overdue = false;
  let downloading = false, downloadingAt = 0, downloadFailures = 0, nextRetryAt = 0;
  const RETRY_BACKOFF = [60_000, 300_000, 900_000, 1_800_000];
  const isDownloading = () => downloading && Date.now() - downloadingAt < 300_000;
  const shouldCheck = (v, ignoreBackoff = false) => {
    if (!v || !newerVersion(v, app.getVersion())) return false;
    if (!offer || newerVersion(v, offer.version)) return true;
    if (v === offer.version && !ready) {
      if (isDownloading()) return false;
      return ignoreBackoff || Date.now() >= nextRetryAt;
    }
    return false;
  };
  const usable = !!autoUpdater && app.isPackaged && !PROBE && !STAGING;
  // Settings' "right away", or this run started with --update (launchArgs; the Mac's installUpdatesRightAway): a
  // downloaded update goes in without waiting for the user to step away. Settings shows only its own switch.
  let rightAwayArg = process.argv.includes('--update');
  const rightAwaySet = () => !!settings.get('updateRightAway');
  const rightAway = () => rightAwayArg || rightAwaySet();
  const maybeRestart = () => {
    if (!ready || busy) return;
    const localRunning = terminals.list().some((t) => terminals.local(t.id));
    // Env changes not saved hold an update back, as on the Mac (Cloud.canRestart): only a forced version's restart, once
    // its hour is up, goes on, asking about them first (install).
    const envHeld = envUnsaved();
    if (offer && forcedVersion === offer.version) {
      if (!localRunning && !envHeld) return install();
      if (!forcedAt) return;
      const now = Date.now();
      // 5 minutes before the hour is up: when the restart comes, in the corner (messages.js's restart notice).
      if (warnedFor !== forcedVersion && now - forcedAt >= FORCE_MS - WARN_MS) {
        warnedFor = forcedVersion;
        warnedAt = now;
        toNotices(`restart(${JSON.stringify({ version: forcedVersion, at: Math.max(forcedAt + FORCE_MS, now + WARN_MS) })})`);
      }
      if (warnedFor === forcedVersion && now - forcedAt >= FORCE_MS && now - warnedAt >= WARN_MS) install(true);
      return;
    }
    if (localRunning || envHeld) return;
    if (rightAway() || powerMonitor.getSystemIdleTime() >= 600) install();
  };
  // The restart the notices told of isn't coming (the version is no longer forced, or another one is): its notice goes.
  const unwarn = () => {
    if (!warnedFor) return;
    warnedFor = null;
    warnedAt = 0;
    toNotices('restartOver()');
  };
  const install = (overdueForce = false) => {
    // Env changes not saved are asked about before the installer starts, since it closes the app seconds after it starts
    // whatever a quit's own question says (the Mac asks in its quit). Cancel keeps this version for now; a forced restart
    // asks again 10 minutes on at the soonest.
    if (!envSettled && envUnsaved()) {
      if (envAsking || (overdueForce && Date.now() - envDeclinedAt < 600_000)) return;
      envAsking = true;
      settleAllEnv().then((ok) => {
        envAsking = false;
        if (ok) {
          envSettled = true;
          return install(overdueForce);
        }
        envDeclinedAt = Date.now();
        // "Update now" pressed while it downloaded: the button comes back.
        whenReady = false;
        if (busy === 'downloading…') busy = null;
        pushCloud();
      });
      return;
    }
    whenReady = false;
    busy = 'restarting…';
    overdue = overdueForce;
    pushCloud();
    setImmediate(() => autoUpdater.quitAndInstall(true, true));
  };
  if (usable) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-available', (i) => {
      // A newer one than an update already downloaded: that one isn't what goes in any more.
      ready = false;
      const isNewOffer = !offer || offer.version !== i.version;
      if (isNewOffer) {
        downloadFailures = 0;
        nextRetryAt = 0;
      }
      downloading = true;
      downloadingAt = Date.now();
      offer = { version: i.version, build: 0, notes: notesOf(i.releaseNotes) };
      pushCloud();
      if (isNewOffer) toNotices(`update(${JSON.stringify({ version: i.version, build: 0 })})`);
    });
    autoUpdater.on('download-progress', (p) => {
      downloading = true;
      downloadingAt = Date.now();
      const f = Math.min(1, Math.floor(Number(p && p.percent) || 0) / 100);
      if (f === progress) return;
      progress = f;
      pushCloud();
    });
    autoUpdater.on('update-downloaded', () => {
      downloading = false;
      downloadFailures = 0;
      nextRetryAt = 0;
      ready = true;
      progress = null;
      pushCloud();
      if (whenReady) install();
      else maybeRestart();
    });
    autoUpdater.on('error', (e) => {
      console.error('updates:', e.message);
      downloading = false;
      progress = null;
      if (offer && !ready) {
        downloadFailures += 1;
        nextRetryAt = Date.now() + RETRY_BACKOFF[Math.min(downloadFailures - 1, RETRY_BACKOFF.length - 1)];
      }
      // The installer didn't start: this version stays, the page says the update failed, and "update now" can be
      // pressed again.
      if (busy === 'restarting…') {
        busy = null;
        overdue = false;
        // The app stays: a later quit asks about env changes again.
        envSettled = false;
        error = 'failed';
        pushCloud();
      }
    });
    const look = () => {
      poll().catch(() => {});
      apiRelease().catch(() => {});
    };
    setTimeout(look, 10_000);
    setInterval(look, 60_000);
    // Back from sleep or the lock screen: at once, not at the next minute.
    powerMonitor.on('resume', look);
    powerMonitor.on('unlock-screen', look);
    setInterval(maybeRestart, 60_000);
  }

  // A new release shows within a minute of going out, as on the Mac (whose heartbeat asks the API every minute; it was
  // every 30 minutes here, so a release could wait half an hour to be seen): the feed's latest.yml, about 1 KB, is read
  // every minute with a time limit, and electron-updater only asked when it names a newer version than this one and the
  // one on offer, so its notice comes once.
  //
  // Where to look is in resources\app-update.yml, written by the release. When it's missing (0.22.0 and 0.22.1 went out
  // without it and never looked for an update) or the API names another feed (apiRelease), a copy of our own in the
  // profile is used instead, so the check never hangs on that one file.
  const OWN_FEED = 'https://github.com/atalaykarahan/orbiterm-releases/releases/download/windows';
  // The only feeds taken from the API: one release (a plain tag, no "/" or "%", so no "../" can lead elsewhere on GitHub)
  // of the app's own releases repo. The installer isn't code-signed: where it comes from is what keeps it the app's own.
  // The repo was atalay-terminal-releases until 0.22.3; GitHub still forwards that name, and the server may give it.
  const FEED_RE = /^https:\/\/github\.com\/atalaykarahan\/(?:orbiterm|atalay-terminal)-releases\/releases\/download\/[A-Za-z0-9_-][A-Za-z0-9._-]{0,63}$/;
  let feed = null;
  function useFeed(url) {
    const file = path.join(app.getPath('userData'), 'app-update.yml');
    fs.writeFileSync(file, `provider: generic\nurl: ${url}\nupdaterCacheDirName: ${require('../package.json').name}-updater\n`);
    autoUpdater.updateConfigPath = file;
    feed = url;
  }
  if (usable) {
    try {
      const m = /^url:\s*(.+)$/m.exec(fs.readFileSync(path.join(process.resourcesPath, 'app-update.yml'), 'utf8'));
      feed = m ? m[1].trim().replace(/^['"]|['"]$/g, '').replace(/\/+$/, '') : null;
    } catch {}
    try {
      if (!feed) useFeed(OWN_FEED);
    } catch (e) {
      console.error('updates:', e.message);
    }
  }
  // The server's word on the current Windows release (GET /v1/releases/windows, open: it needs no key, so it reaches an
  // app whose key has died too). When it names a version newer than this one and the one on offer, electron-updater is
  // asked at once, in the feed it names if that's a release of the app's own repo: the update can be offered from the
  // server even when this app's own look at the feed went wrong, and nothing from anywhere else is ever installed.
  async function apiRelease(ignoreBackoff = false) {
    const res = await net.fetch(`${API_BASE}/v1/releases/windows`, withAccess(`${API_BASE}/`, { cache: 'no-store', signal: AbortSignal.timeout(20_000) }));
    if (!res.ok) return;
    const r = await res.json();
    const version = r && typeof r.version === 'string' ? r.version : '';
    const url = r && typeof r.feed === 'string' ? r.feed.replace(/\/+$/, '') : '';
    const validVersion = /^\d+\.\d+\.\d+$/.test(version) && newerVersion(version, app.getVersion());
    if (r && r.force && validVersion) {
      if (forcedVersion !== version) {
        forcedVersion = version;
        forcedAt = Date.now();
        unwarn();
      }
      if (ready && offer && offer.version === version) maybeRestart();
    } else {
      forcedVersion = null;
      forcedAt = 0;
      unwarn();
    }
    if (!validVersion || !shouldCheck(version, ignoreBackoff) || !FEED_RE.test(url)) return;
    if (url !== feed) {
      // A feed named by mistake mustn't take the place of one that works: taken only once it holds a newer version.
      if (!shouldCheck(await feedVersion(url), ignoreBackoff)) return;
      useFeed(url);
    }
    askUpdater();
  }
  async function feedVersion(base = feed) {
    const res = await net.fetch(`${base}/latest.yml?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`latest.yml: HTTP ${res.status}`);
    const m = /^version:\s*['"]?(\d[^'"\s]*)/m.exec(await res.text());
    if (!m) throw new Error('latest.yml: no version');
    return m[1];
  }
  let polling = null;
  function poll(ignoreBackoff = false) {
    if (!feed) return Promise.resolve(null);
    if (!polling) {
      polling = feedVersion()
        .then((v) => {
          if (shouldCheck(v, ignoreBackoff)) askUpdater();
          return v;
        })
        .finally(() => (polling = null));
    }
    return polling;
  }
  // electron-updater's own check, which downloads what it finds. Its requests are to time out through their socket,
  // which Electron's requests don't have: one that stalls never ends, and every later check is handed that same one. So
  // one still out after two minutes is let go, and the next check starts afresh.
  let asking = null, askedAt = 0;
  function askUpdater() {
    if (asking && Date.now() - askedAt < 120_000) return;
    if (asking) autoUpdater.checkForUpdatesPromise = null;
    askedAt = Date.now();
    const p = autoUpdater
      .checkForUpdates()
      .catch(() => {})
      .finally(() => {
        if (asking === p) asking = null;
      });
    asking = p;
  }

  return {
    // No xpPaused here: cloud.js has the API's word on it (an outdated version earns no XP), and this comes after it in
    // cloudState, so a false here hid the red "update · XP paused" button.
    state: () => ({ update: offer, updateReady: ready, updating: busy, updateProgress: progress, updateError: error, updateRightAway: rightAwaySet(), checking, checkedAt }),
    /** --update given to a later launch: from now on as with "right away", and a look for the update at once. */
    rightAwayNow() {
      rightAwayArg = true;
      if (!usable) return;
      maybeRestart();
      poll(true).catch(() => {});
      apiRelease(true).catch(() => {});
    },
    // Settings' "check for updates": answered within the feed's time limit, even with the network hanging.
    async check() {
      if (!usable) return;
      checking = true;
      pushCloud();
      try {
        await Promise.allSettled([poll(true), apiRelease(true)]);
        // What electron-updater found, when it was asked, comes before "up to date" would.
        if (asking) await Promise.race([asking, new Promise((r) => setTimeout(r, 20_000))]);
      } catch {}
      checking = false;
      checkedAt = Date.now();
      pushCloud();
    },
    now() {
      if (!usable || !offer || busy) return;
      error = null;
      if (ready) return install();
      busy = 'downloading…';
      whenReady = true;
      downloading = true;
      downloadingAt = Date.now();
      pushCloud();
      // The download already running is the one waited for. When it fails (offline), the page says so and "update now"
      // comes back for another try, instead of "downloading…" staying for ever.
      autoUpdater.downloadUpdate().catch(() => {
        downloading = false;
        if (busy !== 'downloading…') return;
        whenReady = false;
        busy = null;
        progress = null;
        error = 'failed';
        pushCloud();
      });
    },
    setRightAway(on) {
      settings.set('updateRightAway', !!on);
      pushCloud();
      maybeRestart();
    },
    on426() {
      if (!usable || Date.now() - last426At < 5000) return;
      last426At = Date.now();
      apiRelease().catch(() => {});
      poll().catch(() => {});
    },
    // The forced version's restart, told of 5 minutes before, is under way: the quit doesn't ask about running chats.
    overdue: () => overdue,
  };
})();

/** Whether version `a` is newer than `b` ("0.15.1" than "0.15.0"): the numbers only, as the releases have them. */
function newerVersion(a, b) {
  const nums = (v) => String(v || '').split(/[-+]/)[0].split('.').map((n) => parseInt(n, 10) || 0);
  const [x, y] = [nums(a), nums(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  }
  return false;
}

function notesOf(n) {
  if (!n) return '';
  const text = Array.isArray(n) ? n.map((x) => x.note || '').join('\n') : String(n);
  return text.replace(/<[^>]+>/g, '\n').split(/\n+/).map((s) => s.trim()).filter(Boolean).join('\n');
}

// ---------- the pages' calls ----------
ipcMain.on('atl:boot', (e) => {
  // Viktoria's window asks for nothing: no theme, no fonts.
  e.returnValue = mascot.has(e.sender) ? { mascot: true, pak: mascotAsset.isReady() } : boots.get(e.sender.id) || { css: themes.css() };
});

ipcMain.handle('atl:post', async (e, name, body) => {
  // Only the app's own pages, in their main frame, as on the Mac: nothing loaded into a frame of theirs reaches the app.
  if (!e.senderFrame || e.senderFrame !== e.sender.mainFrame || !ownPage(e.senderFrame.url)) throw new Error('refused');
  body = body || {};
  if (noteWindows.has(e.sender) && name !== 'noteWindow') throw new Error('refused');
  if (feedPanel.has(e.sender) && name !== 'feed') throw new Error('refused');
  // Viktoria's window speaks on her own line and no other, and no other page speaks on hers.
  if (mascot.has(e.sender) !== (name === 'mascot')) throw new Error('refused');
  const win = BrowserWindow.fromWebContents(e.sender);
  try {
    switch (name) {
      case 'radar':
        // Clean Up's requests: the dashboard's page only (DASHBOARD_RADAR).
        if (DASHBOARD_RADAR.has(body.type) && e.sender !== pageOf(dashView)) throw new Error('not this page');
        return handleRadar(body);
      // Her page's messages (checked above: only her window sends them); mascot.js checks every number.
      case 'mascot':
        return mascot.handle(body);
      // The spend panel's history tabs (web/app.js), from the engine's ledger (ledger.js).
      case 'spend':
        if (body.type !== 'history') throw new Error('unknown request');
        return engine.spendHistory(body.range);
      case 'git':
        return await git.handle(body);
      // Source Control's editor reads and writes files: the dashboard's page only, as on the Mac.
      case 'files':
        if (e.sender !== pageOf(dashView)) throw new Error('not this page');
        return await files.handle(body);
      // The notes (web/notes.js): the dashboard's page only, as on the Mac.
      case 'notes':
        if (e.sender !== pageOf(dashView)) throw new Error('not this page');
        // A shared note's ticket and document, the files in notes, the secrets check: the dashboard's page writes every note.
        if (notesSync.handles(body.type)) return await notesSync.handle(body, { allow: () => true, sender: e.sender });
        // The projects the board's "move to project" offers: those of the folders the terminals are in, and which of the
        // folders the notes are linked to (`dirs`) are gone (the Mac's NotesBridge `projects`).
        if (body.type === 'projects') return notesProjects.choices(Array.isArray(body.dirs) ? body.dirs : [], liveFolders());
        return await notesStore.handle(body);
      // Settings › Shortcuts and the list of them all (shortcuts.js, the Mac's KeysBridge): the dashboard's page only.
      case 'keys':
        if (e.sender !== pageOf(dashView)) throw new Error('not this page');
        return await shortcuts.handle(body);
      // Settings > Claude, the local MCP server: the dashboard's page only, and it only asks (mcp.js asks the user natively).
      case 'mcp': {
        if (e.sender !== pageOf(dashView)) throw new Error('not this page');
        const answer = await mcp.handle(body);
        // The Claude access was registered or taken out for the default account: the other accounts' configs follow.
        setTimeout(() => accounts.syncMcp(), 500);
        return answer;
      }
      // Settings > Claude's accounts and the top bar's limits popover (claudeaccounts.js, the Mac's ClaudeAccountsBridge): the
      // dashboard's page only. It adds an account, opens Claude's own sign-in in a terminal, renames, recolours and removes;
      // it never switches one, and no token passes it.
      case 'claudeAccounts':
        if (e.sender !== pageOf(dashView)) throw new Error('not this page');
        return accounts.handle(body);
      // A note's own window and the feed's corner window: each only its own page (a note window never gets `notes` or
      // `cloud`: the dashboard writes the notes).
      case 'noteWindow':
        if (!noteWindows.has(e.sender)) throw new Error('not this page');
        return await noteWindows.handle(e.sender, body);
      // Settings > Privacy > AI tools and my notes (web/cloud.js): the dashboard's page only, as the Mac's NotesAIBridge.
      // Turning it on asks natively (notesai.js); a note window, the feed and Viktoria were refused above.
      case 'notesai': {
        if (e.sender !== pageOf(dashView)) throw new Error('not this page');
        const answer = await notesAI.handle(body);
        setTimeout(() => accounts.syncMcp(), 500);
        return answer;
      }
      case 'feed':
        return feedPanel.handle(e.sender, body);
      case 'theme':
        return themes.handle(body);
      case 'messages':
        return handleMessages(win, body);
      case 'overlay':
        if (body.type === 'ready') {
          overReady = true;
          if (overPending) run(over, overPending);
          overPending = null;
          return true;
        }
        // The page closed itself (Cancel, Esc, Done, a sheet's work done): the anchor has the keys again.
        if (body.type === 'done') return hideOverlay(true), true;
        if (body.type === 'newTerminal') {
          const asked = overlay.expand(String(body.dir || ''));
          hideOverlay();
          if (!asked) return true;
          // A shortcut's folder renamed since the page read it: the slot follows it, and the terminal opens there.
          const dir = await overlay.locate(asked);
          // The Claude account picked in the picker's chip (two or more accounts): the shell starts with it, and the repo
          // remembers it as the next default.
          const acct = typeof body.account === 'string' && accounts.account(body.account) ? body.account : null;
          if (dir && acct) overlay.top(dir).then((top) => top && accounts.remember(acct, top), () => {});
          if (dir) openChatWindow({ cwd: dir, claudeArgs: null, title: path.basename(dir), account: acct });
          // Gone (deleted, moved elsewhere): the user is told, as the Mac's "Folder not found" does, and the shortcut stays.
          // No parent window: the dashboard may be minimized while the Ring opened over a chat.
          else dialog.showMessageBox({ type: 'warning', message: 'Folder not found', detail: `${tildify(asked)}\n\nIt was moved or deleted. Right-click its shortcut to change or remove it.`, noLink: true });
          return true;
        }
        if (typeof body.type === 'string' && body.type.startsWith('ship')) {
          if (e.sender !== pageOf(over)) throw new Error('not this page');
          return await handleShip(body);
        }
        return await overlay.handle(body);
      case 'cloud':
        if (body.type === 'update') return updates.now(), true;
        if (body.type === 'checkUpdate') return await updates.check(), cloudState();
        if (body.type === 'updateRightAway') return updates.setRightAway(body.on), cloudState();
        if (body.type === 'openChat') return openFriendChat(body.id);
        if (body.type === 'state') return cloudState();
        if (body.type === 'openSignIn') return openSignIn(body.url);
        if (shareCard.handles(body.type)) {
          if (e.sender !== pageOf(dashView)) throw new Error('not this page');
          return await shareCard.handle(body);
        }
        if (body.type === 'terminalFont') return await terminalFont(body.size, body.family);
        if (body.type === 'terminalFonts') return { families: await termFont.families() };
        if (body.type === 'refresh') return await cloud.handle(body), cloudState();
        if (body.type === 'signOut' || body.type === 'deleteAccount') {
          const r = await cloud.handle(body);
          return { error: r.error, state: cloudState() };
        }
        return await cloud.handle(body);
      case 'chats':
        return await handleChats(body);
      case 'archive':
        return handleArchive(body);
      // Settings' deleted chats: the dashboard's page only (it deletes files).
      case 'trash':
        if (e.sender !== pageOf(dashView)) throw new Error('not this page');
        return await handleTrash(body);
      // Settings' token savers: their state with what rtk saved, and the switches.
      case 'savers':
        if (body.type === 'state') return await savers.state();
        if (body.type === 'set' && savers.known(body.which)) {
          await savers.set(body.which, body.on === true);
          return await savers.state();
        }
        throw new Error('unknown request');
      default:
        return null;
    }
  } catch (err) {
    console.error(`${name}:`, err);
    return { error: String((err && err.message) || err) };
  }
});

// ---------- menu and keys ----------
// The terminal with the keys (the tab and pane in front of the window that has them), as [id, chat], or undefined.
const focusedChat = () => {
  const f = focusedFrame();
  return f && chats.has(f.focus) ? [f.focus, chats.get(f.focus)] : undefined;
};
// The menu's items that act on the terminal in front (the Mac's Edit and View items for it): its page does them
// (term:do). Their keys are Settings › Shortcuts' (shortcuts.js), kept out of the shell by the page (window.__keys).
const TERMINAL_ITEMS = [
  'copyReply', 'find', 'findNext', 'findPrevious', 'findSelection', 'clearBuffer',
  'scrollLineUp', 'scrollLineDown', 'scrollPageUp', 'scrollPageDown', 'scrollTop', 'scrollBottom',
];
// The page's names for them where they differ (term:do's actions; copyReply asks back for the reply, term:copyReply).
const TERM_DO = { findSelection: 'useSelectionForFind' };
function terminalDo(id) {
  const f = focusedChat();
  if (f) send(f[1].page, 'term:do', { action: TERM_DO[id] || id });
}
// On only while a terminal window has the keys: a disabled item's keys go on to the page (the dashboard's editor keeps
// Ctrl+Shift+Up, F3…).
function syncTerminalItems() {
  const menu = Menu.getApplicationMenu();
  if (!menu) return;
  const focused = focusedChat();
  const on = !!focused;
  // Copy Claude's Last Reply only where there's a reply to copy (an AI runs in the terminal in front), as its button.
  let canCopy = false;
  try {
    canCopy = on && !!chatInfo(focused[0], focused[1]).canCopyReply;
  } catch {}
  for (const id of TERMINAL_ITEMS) {
    const item = menu.getMenuItemById(id);
    if (item) item.enabled = id === 'copyReply' ? canCopy : on;
  }
}

// The Window menu's list: the dashboard and every terminal window by its title (its pane with the keys'), hidden ones
// too. The menu is built again when that list changes (a window opened, closed or renamed), a moment later so a burst of
// changes builds it once.
const windowList = () => [
  { id: 'dash', title: 'Dashboard' },
  ...[...frames].filter((f) => !f.win.isDestroyed()).map((f) => {
    const id = [...f.views.keys()].find((x) => chats.has(x));
    return id && { id, title: f.win.getTitle() || chats.get(id).title || 'terminal' };
  }).filter(Boolean),
];
const windowsKeyOf = (list) => list.map((w) => `${w.id}\u0001${w.title}`).join('\u0002');
let windowsKey = '', windowsTimer = null;
function windowsChanged() {
  if (windowsTimer || !app.isReady() || windowsKeyOf(windowList()) === windowsKey) return;
  windowsTimer = setTimeout(() => {
    windowsTimer = null;
    buildMenu();
  }, 250);
}
// Bring All to Front (the Mac's arrangeInFront): the app's windows on screen above other apps', the one in front staying so.
function bringAllToFront() {
  const front = BaseWindow.getFocusedWindow();
  const wins = [dash, ...[...frames].map((f) => f.win), ...panels.chats.values()];
  for (const w of wins) if (w && !w.isDestroyed() && w.isVisible() && !w.isMinimized()) w.moveTop();
  const back = front && !front.isDestroyed() ? front : dash;
  if (back && !back.isDestroyed()) back.focus();
}

// Reload Dashboard (the Mac's RadarView.reload): only the page starts again; the chats run in their own windows and the
// session host. A page that doesn't answer within 2 s is stuck, so its renderer is ended and a fresh one loads it.
let dashRestartedAt = 0;
function reloadDashboard() {
  const wc = pageOf(dashView);
  if (!wc) return;
  let settled = false;
  wc.executeJavaScript('1').then(() => {
    if (settled || wc.isDestroyed()) return;
    settled = true;
    wc.reload();
  }, () => {});
  setTimeout(() => {
    if (settled || wc.isDestroyed()) return;
    settled = true;
    hangLog(wc, 'not answering Reload Dashboard: its renderer ended');
    dashRestartedAt = Date.now();
    wc.forcefullyCrashRenderer();
    wc.reload();
  }, 2000);
}

function buildMenu() {
  // The window in front closes: a terminal's only hides (what runs in it goes on), the messages and the overlay theirs.
  // `pane`: the close keys (Ctrl+W) close a terminal window's tab or pane with the keys first, while it has several.
  const closeFocused = (pane) => {
    const w = BrowserWindow.getFocusedWindow();
    if (!w || w === dash || w === panels.notices) return;
    if (w === over) return hideOverlay(true);
    if ([...panels.chats.values()].includes(w)) return runPanel(w, 'window.__messages && __messages.close && __messages.close()');
    const f = pane && [...frames].find((x) => x.win === w);
    if (f && f.views.size > 1 && f.focus) return closePane(f.focus);
    w.close();
  };
  // A tab or pane item on the terminal window in front (windowAction); its keys are taken by the terminal's page itself
  // (paneKeys), so they stay the shell's in a window with nothing to act on.
  const paneItem = (id, label) => ({ label, accelerator: shortcuts.accel(id), registerAccelerator: false, click: () => windowAction(focusedFrame(), id) });
  const focused = focusedChat();
  const termOn = !!focused;
  // Copy Claude's Last Reply only where there's a reply to copy (an AI runs in the terminal in front), as its button.
  let canCopy = false;
  try {
    canCopy = !!focused && !!chatInfo(focused[0], focused[1]).canCopyReply;
  } catch {}
  const terminalItem = (id, label) => ({ id, label, accelerator: shortcuts.accel(id), enabled: id === 'copyReply' ? canCopy : termOn, click: () => terminalDo(id) });
  const listed = windowList();
  windowsKey = windowsKeyOf(listed);
  const ship = shipMenuState();
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        // VS Code's: Ctrl+N a new file in Source Control's editor, Ctrl+Shift+N a new window (here a terminal), as the
        // Mac's ⌘N and ⇧⌘N.
        { label: 'New File', accelerator: shortcuts.accel('newFile'), click: () => newFile() },
        { label: 'New Terminal…', accelerator: shortcuts.accel('newTerminal'), click: () => showOverlay('Overlay.newTerminal()') },
        // The Mac's File items for tabs and splits (iTerm2's): a shell in the folder of the pane in front; with no
        // terminal window in front, the folder picker.
        { label: 'New Tab', accelerator: shortcuts.accel('newTab'), click: () => newTab(false) },
        { label: 'New Tab Next to Current Tab', accelerator: shortcuts.accel('newTabNext'), click: () => newTab(true) },
        { label: 'Split Vertically', accelerator: shortcuts.accel('splitVertically'), click: () => splitPane('right') },
        { label: 'Split Horizontally', accelerator: shortcuts.accel('splitHorizontally'), click: () => splitPane('down') },
        { label: 'Ring', accelerator: shortcuts.accel('shortcutsWheel'), click: () => showShortcuts() },
        // No key of its own: Ctrl+0 is Actual Size's (the text size, ⌘0 on the Mac), and two items on one key leave only
        // one of them working.
        { label: 'Dashboard', click: () => showDashboard() },
        // The dashboard's Settings, on the category used last (the Mac keeps it in the app menu; no key, as there).
        { label: 'Settings…', click: () => openSettings() },
        // Clean Up, right below it as on the Mac's app menu: no key of its own; one can be set in Settings › Shortcuts.
        { label: 'Clean Up…', accelerator: shortcuts.accel('cleanUp'), click: () => showCleanup() },
        { type: 'separator' },
        // The terminal window in front, when it is in a worktree: send its work as a pull request, merge it here, or
        // delete the worktree (worktreeship.js), as the Mac's Chat menu has them. Usable only when the window's status
        // allows it (syncShipMenu). Merge and Delete have no key: rare, and Delete can't be undone by a slip of the finger.
        // Their labels are the window in front's (shipMenuState: "Merge into develop…", a dimmed one's reason).
        { id: 'shipCreate', label: ship.shipCreate.label, accelerator: shortcuts.accel('createPR'), enabled: false, click: () => shipMenu('create') },
        { id: 'shipMerge', label: ship.shipMerge.label, enabled: false, click: () => shipMenu('merge') },
        { id: 'shipDelete', label: ship.shipDelete.label, enabled: false, click: () => shipMenu('delete') },
        { type: 'separator' },
        // Ctrl+W (the Mac's ⌘W, which hides again since the Mac's d7e69be): the tab or pane with the keys closes, or with
        // only one the window in front, and a terminal's only hides: what runs in it (Claude, Codex, Antigravity, a shell)
        // goes on as a planet or car on the orbit, and a click brings it back. A terminal ends with its End button or
        // Window > End This Terminal.
        { label: 'Close', accelerator: shortcuts.accel('closePane'), click: () => closeFocused(true) },
        // Ctrl+Shift+W (the Mac's ⇧⌘W): the whole window, all its tabs.
        { label: 'Close Terminal Window', accelerator: shortcuts.accel('closeWindow'), click: () => closeFocused(false) },
        // The Mac's Chat › Undo Close (⇧⌘T): the terminal hidden last comes back, a tab or pane into its window.
        { label: 'Undo Close', accelerator: shortcuts.accel('undoClose'), click: () => undoClose() },
        { type: 'separator' },
        { role: 'quit', label: 'Quit', accelerator: 'CmdOrCtrl+Q' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
        // The terminal in front's, as the Mac's Edit menu has them (iTerm2's find bar, its Clear Buffer); off elsewhere
        // (syncTerminalItems).
        { type: 'separator' },
        terminalItem('copyReply', "Copy Claude's Last Reply"),
        { type: 'separator' },
        terminalItem('find', 'Find…'),
        terminalItem('findNext', 'Find Next'),
        terminalItem('findPrevious', 'Find Previous'),
        terminalItem('findSelection', 'Use Selection for Find'),
        { type: 'separator' },
        terminalItem('clearBuffer', 'Clear Buffer'),
      ],
    },
    {
      label: 'View',
      submenu: [
        // Its key is caught by the dashboard window itself (createDashboard): in a terminal Ctrl+B stays the shell's.
        {
          label: 'Chats List', accelerator: shortcuts.accel('chatsList'), registerAccelerator: false,
          click: () => {
            showDashboard();
            toggleChats();
          },
        },
        // Viktoria, the anime companion who walks around the screen (her switch is also in Settings > Appearance).
        {
          id: 'viktoria', label: mascotAsset.isReady() ? 'Show Viktoria' : 'Get Viktoria…', type: 'checkbox', checked: mascot.enabled(),
          click: () => {
            if (mascotAsset.isReady()) return mascot.setEnabled(!mascot.stored());
            showDashboard();
            mascotOpenView('themes');
            syncViktoriaMenu(); // a click flips a checkbox by itself
          },
        },
        { label: 'Reload Dashboard', accelerator: shortcuts.accel('reloadDashboard'), click: () => reloadDashboard() },
        // The page that has the keys: the dashboard window's two are views, which the role doesn't reach. Development
        // only: a released app has no DevTools.
        ...(RELEASE ? [] : [{ label: 'Toggle Developer Tools', accelerator: 'CmdOrCtrl+Shift+I', click: (_i, _w, wc) => wc && wc.toggleDevTools() }]),
        { type: 'separator' },
        { label: 'Zoom In', accelerator: shortcuts.accel('biggerText'), click: () => zoom(1) },
        { label: 'Zoom Out', accelerator: shortcuts.accel('smallerText'), click: () => zoom(-1) },
        { label: 'Actual Size', accelerator: shortcuts.accel('defaultText'), click: () => zoom(0) },
        { type: 'separator' },
        // The role's own F11 would come back with its keys taken off (a role's empty accelerator is its default one).
        {
          label: 'Toggle Full Screen', accelerator: shortcuts.accel('fullScreen'),
          click: () => {
            const w = BaseWindow.getFocusedWindow();
            if (w && w !== over && w !== panels.notices) w.setFullScreen(!w.isFullScreen());
          },
        },
        // The terminal in front's scrollback, as the Mac's View menu (Windows Terminal's keys).
        { type: 'separator' },
        terminalItem('scrollLineUp', 'Scroll Up One Line'),
        terminalItem('scrollLineDown', 'Scroll Down One Line'),
        terminalItem('scrollPageUp', 'Scroll Up One Page'),
        terminalItem('scrollPageDown', 'Scroll Down One Page'),
        terminalItem('scrollTop', 'Scroll to Top'),
        terminalItem('scrollBottom', 'Scroll to Bottom'),
      ],
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize', accelerator: 'CmdOrCtrl+M',
          click: () => {
            const w = BaseWindow.getFocusedWindow();
            if (!w || w === over || w === panels.notices) return;
            if (w !== dash && typeof w.getParentWindow === 'function' && w.getParentWindow()) w.setParentWindow(null);
            w.minimize();
          },
        },
        // The env files of the terminal in front (pages/env.js), the Mac's Env Files: the same keys close the view again.
        { label: 'Env Files', accelerator: shortcuts.accel('envFiles'), click: () => { const f = focusedChat(); if (f) send(f[1].page, 'term:env'); } },
        // With two or more Claude accounts: the chip's menu, from the menu bar too (no key: nothing switches by a slip).
        {
          label: 'Claude Account…', visible: accounts.multiple(),
          click: () => {
            const f = focusedChat();
            const t = f && acctMenuFor(f[0]);
            if (t && f[1].win && !f[1].win.isDestroyed()) Menu.buildFromTemplate(t).popup({ window: f[1].win });
          },
        },
        // Asked first, as its End button (env changes not saved, then confirmEnd).
        { label: 'End This Terminal', click: () => { const f = focusedChat(); if (f) endAsked(f[0]); } },
        // The Mac's Window items for tabs and panes (iTerm2's), on the terminal window in front.
        { type: 'separator' },
        paneItem('nextTab', 'Select Next Tab'),
        paneItem('previousTab', 'Select Previous Tab'),
        paneItem('moveTabLeft', 'Move Tab Left'),
        paneItem('moveTabRight', 'Move Tab Right'),
        // No keys of their own, as on the Mac; they can be set in Settings › Shortcuts.
        { label: 'Move Tab to New Window', accelerator: shortcuts.accel('moveTabToNewWindow'), click: () => moveTabToNewWindow(focusedFrame()) },
        { label: 'Merge All Windows', accelerator: shortcuts.accel('mergeAllWindows'), click: () => mergeAllWindows() },
        { type: 'separator' },
        paneItem('nextPane', 'Select Next Pane'),
        paneItem('previousPane', 'Select Previous Pane'),
        paneItem('paneAbove', 'Select Pane Above'),
        paneItem('paneBelow', 'Select Pane Below'),
        paneItem('paneLeft', 'Select Pane on the Left'),
        paneItem('paneRight', 'Select Pane on the Right'),
        paneItem('dividerUp', 'Move Divider Up'),
        paneItem('dividerDown', 'Move Divider Down'),
        paneItem('dividerLeft', 'Move Divider Left'),
        paneItem('dividerRight', 'Move Divider Right'),
        paneItem('maximizePane', 'Maximize Active Pane'),
        { type: 'separator' },
        { label: 'Bring All to Front', click: () => bringAllToFront() },
        // Every window of the app, as the Mac's Window menu lists them: picked, it shows (a hidden terminal too) and has
        // the keys. "&" doubled, or Windows reads it as the item's access key.
        { type: 'separator' },
        ...listed.map((w) => ({
          label: clip(w.title, 60).replace(/&/g, '&&'),
          click: () => (w.id === 'dash' ? showDashboard() : chats.has(w.id) && showFrame(chats.get(w.id).frame)),
        })),
      ],
    },
    {
      label: 'Help',
      submenu: [
        // Every shortcut at a glance (web/cheatsheet.js), the Mac's Help › Keyboard Shortcuts: keys of its own only if set
        // in Settings › Shortcuts. The same keys close it again while the dashboard is in front.
        {
          label: 'Keyboard Shortcuts', accelerator: shortcuts.accel('keyboardShortcuts'),
          click: () => {
            const toggle = !!dash && !dash.isDestroyed() && dash.isFocused();
            showDashboard();
            run(dashView, `window.__radar && __radar.openShortcuts && __radar.openShortcuts(${toggle})`);
          },
        },
        // The Mac's About Orbiterm (its app menu's), where Windows apps keep it: the name and the version (whenReady sets
        // them).
        { type: 'separator' },
        { label: 'About Orbiterm', click: () => app.showAboutPanel() },
      ],
    },
  ]));
  syncTerminalItems();
  // The dashboard is a BaseWindow, given the menu by hand when it was made (createDashboard): a rebuilt menu (new keys
  // set) reaches it too, as setApplicationMenu gives it to every window.
  syncShipMenu();
}

// ---------- start, quit ----------
let quitting = false;

// The app started again while it runs: its arguments (as that launch had them, requestSingleInstanceLock's data) are
// done here, else the dashboard comes to the front, as the Dock brings it back on the Mac.
app.on('second-instance', (_e, argv, cwd, data) => {
  const args = data && Array.isArray(data.argv) ? data.argv.map(String) : argv;
  if (!launchArgs(args, data && typeof data.cwd === 'string' ? data.cwd : cwd)) showDashboard();
});

// ---------- launch arguments (the Mac's handleLaunchArguments) ----------
// --new-terminal [folder]: a terminal in that folder (relative to where the app was started), or the folder picker
// without one; --open-session <id> (more than one may be given): those chats, once the engine knows them; --shortcuts:
// the Ring over the dashboard; --update: a downloaded update goes in without waiting for the user to step away. At the
// first launch (once the dashboard shows, so what they open comes in front of it) and when the app is started again.
// "--name=value" works too. True when one was acted on.
let engineSeen = false;
const openPending = [];
function launchArgs(args, cwd, atLaunch = false) {
  const list = [];
  for (const a of args) {
    const m = /^--(new-terminal|open-session)=(.*)$/s.exec(a);
    if (m) list.push(`--${m[1]}`, m[2]);
    else list.push(a);
  }
  const valueAt = (i) => (i + 1 < list.length && !/^--/.test(list[i + 1]) ? list[i + 1] : null);
  let acted = false;
  for (let i = 0; i < list.length; i++) {
    if (list[i] === '--new-terminal') {
      acted = true;
      const v = valueAt(i);
      if (!v) {
        showOverlay('Overlay.newTerminal()');
        continue;
      }
      i++;
      const dir = path.resolve(cwd || process.cwd(), v);
      // A folder on this PC, never a network share (merely looking one up hands its host the user's NTLM hash).
      let ok = false;
      try {
        ok = !/^[\\/]{2}/.test(dir) && fs.statSync(dir).isDirectory();
      } catch {}
      if (ok) openChatWindow({ cwd: dir, claudeArgs: null, title: path.basename(dir) || dir });
      else dialog.showMessageBox({ type: 'warning', message: 'Folder not found', detail: tildify(dir), noLink: true });
    } else if (list[i] === '--open-session') {
      const sid = valueAt(i);
      if (!sid) continue;
      i++;
      acted = true;
      if (sid.length > 200) continue;
      if (engineSeen) openSession(sid, false);
      else openPending.push(sid);
    } else if (list[i] === '--shortcuts') {
      acted = true;
      // Over the dashboard's middle (where the pointer is while it's closed), a moment after it shows at the first launch.
      setTimeout(() => {
        const b = dash && !dash.isDestroyed() && dash.isVisible() && !dash.isMinimized() ? dash.getBounds() : null;
        showShortcuts(b ? { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) } : undefined);
      }, atLaunch ? 1000 : 0);
    } else if (list[i] === '--update') {
      acted = true;
      updates.rightAwayNow();
    }
  }
  return acted;
}

app.whenReady().then(() => {
  guardSession(session.defaultSession); // again, should it have been made before 'session-created' was listened to
  if (PROBE && app.dock) app.dock.hide();
  mascotAsset.init(); // the pak from an earlier run is hashed (off the main thread) before she may come up
  // Help › About Orbiterm: the name and the version (a staging build's says so, as the dashboard does).
  app.setAboutPanelOptions({ applicationName: 'Orbiterm', applicationVersion: cloudVersion() });
  buildMenu();
  createDashboard();
  // The launch's own arguments (--new-terminal, --open-session, --shortcuts, --update), once the dashboard shows.
  if (!PROBE) {
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      launchArgs(process.argv.slice(1), process.cwd(), true);
    };
    dash.once('show', () => setTimeout(start, 100));
    setTimeout(start, 6000);
  }
  // Only the app's usual profile hooks Claude Code's, Codex's and Cursor's settings: a profile of its own (npm run
  // staging) leaves them be.
  if (process.platform === 'win32' && !PROBE && !profileSuffix()) {
    limits.install();
    codexHooks.install();
  }
  installCursorHooks();
  // Another account's Claude config gets Orbiterm's MCP servers as the default's has them, and the status line script is
  // this build's (an older app sharing the folder may have swapped it).
  accounts.syncMcp();
  ensureStatusLine();
  engine.start();
  // What was on stays on: the pipe opens again and the tray shows it (the Mac's McpHub.start).
  if (!PROBE) mcp.start();
  cloud.start();
  runaways.start();
  // The corner's notices can cover the screen (a level-up): never during a development check.
  if (!PROBE) {
    notices();
    // The chat window follows a little later, hidden, so opening a chat is instant.
    setTimeout(warmChat, 3000);
    // The PowerShell font scan (3-5 s) runs in the background, so Settings > Terminals opens with its list ready.
    setTimeout(() => termFont.warm(), 20_000);
    // No "updated" note in the corner, unlike the Mac: what's new is off on Windows (whatsnew.js), so its "see what's new"
    // would lead nowhere.
  }
  // The orbit's cinematic camera waits for minutes without input; the terminals ride the orbit as cars.
  setInterval(() => {
    toDash(`idle(${powerMonitor.getSystemIdleTime().toFixed(1)})`);
    mascot.updateIdle(powerMonitor.getSystemIdleTime());
    noteToolsAtWork();
    pushTerminals();
    // A chat window opened or ended between the engine's states: the list says "in a window" or stops saying it.
    pushWinOpen();
    pushChats();
    // The taskbar's waiting count on the right buttons (a terminal opened while the dashboard is closed), and the Window
    // menu's list: each only when something changed.
    badge();
    windowsChanged();
  }, 2000);
  // The deleted chats whose 30 days are over go from the disk: a minute after the app starts, then every hour.
  if (!PROBE) {
    const emptyTrash = () => chatlist.emptyExpiredTrash().then(() => pushChats(), (e) => console.error('trash:', e));
    setTimeout(emptyTrash, 60_000);
    setInterval(emptyTrash, 3_600_000);
  }
  // The token savers this build ships go on by themselves the first time (Settings turns them off).
  savers.autoStart();
  // The notes' tools join the MCP server, and the three AI tools get it or lose it as the notes' switch says (the Mac's
  // NotesAI.autoStart).
  notesAI.autoStart();
  if (!PROBE) aiColors.autoStart();
  // The PC woke up: the live line comes back at once, and so does every shared note's (the Mac's Social.kick, notesNetBack).
  powerMonitor.on('resume', () => {
    cloud.kick();
    notesNetBack();
  });
  // Viktoria rests while the PC is locked or asleep (the Mac's display sleep), and lets go of the cursor at once.
  powerMonitor.on('lock-screen', () => mascot.setAsleep('lock', true));
  powerMonitor.on('unlock-screen', () => mascot.setAsleep('lock', false));
  powerMonitor.on('suspend', () => mascot.setAsleep('suspend', true));
  powerMonitor.on('resume', () => mascot.setAsleep('suspend', false));
  // A display plugged in, unplugged or changed: she moves to one that is there and learns its edges.
  for (const ev of ['display-added', 'display-removed', 'display-metrics-changed']) screen.on(ev, () => mascot.onDisplaysChanged());
  // Power save comes on by itself on a low battery (power.js), and goes off again on the adapter.
  powerMonitor.on('on-battery', () => power.update());
  powerMonitor.on('on-ac', () => power.update());
  // Chats and terminals that outlived the last launch come back hidden, as on the Mac, so a launch doesn't throw windows
  // on screen: a chat is on the orbit, a terminal a car, and a click opens its window, with the tabs and splits it had.
  terminals.restore().then(restoreWindows, (e) => {
    console.error('terminals: restore:', e.message);
    restoreWindows([], false);
  });
  if (PROBE) probe();
  if (DEMO && process.env.ORBITERM_DEMO_SHOT) demoShots(process.env.ORBITERM_DEMO_SHOT);
});

let savingFiles = false;
let shipWaiting = false, shipWaited = false;
app.on('before-quit', (e) => {
  if (quitting) return;
  if (savingFiles) return e.preventDefault();
  // Env changes not saved are asked about first, before any job or quit question (the Mac's confirmEnvBeforeQuit), each
  // terminal's in its window: Cancel keeps the app; once all are answered the quit starts again. An update's restart asked
  // before its installer started (updates.install).
  if (!envSettled && envUnsaved()) {
    e.preventDefault();
    if (envAsking) return;
    envAsking = true;
    settleAllEnv().then((ok) => {
      envAsking = false;
      if (!ok) return;
      envSettled = true;
      app.quit();
    });
    return;
  }
  // A worktree's push, merge or delete under way finishes first (3 minutes at most): no half-done job (spec 12). A second
  // quit meanwhile does nothing more; the quit goes on by itself once it's done. The Mac's ShipJobs wait.
  if (worktreeShip.running() && !shipWaited) {
    e.preventDefault();
    if (shipWaiting) return;
    shipWaiting = true;
    const until = Date.now() + 180_000;
    const wait = setInterval(() => {
      if (worktreeShip.running() && Date.now() < until) return;
      clearInterval(wait);
      shipWaiting = false;
      shipWaited = true;
      app.quit();
    }, 250);
    return;
  }
  // That wait was for this quit only: one cancelled below (the running chats' Cancel) leaves a later quit to wait for
  // its own job again, rather than stop a push, a merge or a delete half done.
  shipWaited = false;
  // Only chats running in the app itself stop: the session host's go on, and come back at the next launch. A forced
  // update's restart, told of 5 minutes before in the corner, doesn't ask, as on the Mac.
  const running = [...chats.entries()].filter(([id, c]) => c.claude && terminals.local(id)).length;
  if (running && !PROBE && !updates.overdue()) {
    const r = dialog.showMessageBoxSync(dash || undefined, {
      type: 'warning', buttons: ['Quit', 'Cancel'], defaultId: 1, cancelId: 1, noLink: true,
      message: running === 1 ? '1 chat is still running' : `${running} chats are still running`,
      detail: 'Quitting stops Claude in those windows. The conversations stay saved and can be resumed.',
    });
    if (r !== 0) {
      // The app stays: a later quit asks about env changes again.
      envSettled = false;
      return e.preventDefault();
    }
  }
  // A file edited in the last second is saved first (Source Control's editor saves a second after a change), and so is
  // a note just typed, as on the Mac: the quit goes on once the page says so, 2 s at most (a page that doesn't answer).
  const wc = !PROBE && pageOf(dashView);
  if (wc) {
    e.preventDefault();
    savingFiles = true;
    // The notes still out first: what they typed last goes to the dashboard's page, which keeps it.
    const saved = noteWindows.flushAll()
      .then(() => wc.executeJavaScript('Promise.all([window.FileEditor ? FileEditor.flush() : true, window.Notes && Notes.flush ? Notes.flush() : true])'))
      .catch(() => {});
    Promise.race([saved, new Promise((r) => setTimeout(r, 2000))]).then(() => {
      savingFiles = false;
      leave();
      app.quit();
    });
    return;
  }
  leave();
});

// Quitting for good: the chats running in the session host go on, the parts stop.
function leave() {
  // A layout change of the last second is written before the windows go.
  if (layoutTimer) writeLayout();
  quitting = true;
  // A clean up under way: what runs finishes, nothing more starts (its log says so).
  cleanup.quitting();
  mascot.stop();
  mcp.stop();
  terminals.detachAll();
  engine.stop();
  runaways.stop();
  cloud.stop();
}

app.on('window-all-closed', () => {
  if (!quitting) app.quit();
});

// ---------- the demo's pictures (ORBITERM_DEMO_SHOT) ----------
// The dashboard on screen, once its four projects have been at work a while, then every few seconds: demo-1.png…
// ORBITERM_DEMO_JS runs in the page first (a zoom of the map, say).
async function demoShots(dir) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const count = Number(process.env.ORBITERM_DEMO_SHOTS) || 4;
  const every = Number(process.env.ORBITERM_DEMO_EVERY) || 12000;
  await wait(Number(process.env.ORBITERM_DEMO_DELAY) || 45000);
  if (process.env.ORBITERM_DEMO_JS) {
    await dashView.webContents.executeJavaScript(process.env.ORBITERM_DEMO_JS).catch((e) => console.log('demo js:', e.message));
    await wait(1500);
  }
  for (let n = 1; n <= count; n++) {
    const wc = pageOf(dashView);
    const img = wc && (await Promise.race([wc.capturePage(), wait(5000).then(() => null)]));
    if (img) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `demo-${n}.png`), img.toPNG());
      console.log(`demo: shot ${n} (${img.getSize().width}x${img.getSize().height})`);
    } else console.log(`demo: no picture ${n}`);
    if (n < count) await wait(every);
  }
}

// ---------- the development check (ATL_PROBE) ----------
async function probe() {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const shot = async (win, name) => {
    const wc = pageOf(win);
    if (!wc) return;
    const img = await Promise.race([wc.capturePage(), wait(5000).then(() => null)]);
    if (!img) return console.log('probe: no picture of', name);
    fs.mkdirSync(PROBE, { recursive: true });
    fs.writeFileSync(path.join(PROBE, `${name}.png`), img.toPNG());
    console.log('probe: shot', name);
  };
  await wait(9000);
  await run(dashView, "document.getElementById('boot')?.remove()");
  await shot(dashView, 'dashboard');
  for (const step of (process.env.ATL_PROBE_STEPS || '').split(';;').filter(Boolean)) {
    const [name, js] = step.split('|');
    console.log('probe: step', name);
    if (js) await Promise.race([dashView.webContents.executeJavaScript(js).catch((e) => console.log('probe step', name, e.message)), wait(3000)]);
    await wait(2500);
    await shot(dashView, name);
  }
  if (process.env.ATL_PROBE_TERMINAL) {
    const id = openChatWindow({ cwd: os.homedir(), claudeArgs: null, title: 'probe' });
    await wait(3000);
    terminals.write(id, process.platform === 'win32' ? 'echo hello from the probe\r' : 'echo hello from the probe\r');
    await wait(2000);
    await shot(chats.get(id)?.page, 'terminal');
  }
  quitting = true;
  app.quit();
}
