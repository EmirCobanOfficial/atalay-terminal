'use strict';
// Whether Claude Code, Codex, Antigravity and Cursor may read and edit the user's notes (the tools: notestools.js), and
// getting the tools to them, as the Mac's NotesAI.swift: when it is on, Orbiterm's MCP server (mcp.js, item 6) is added to
// each of them under a name of its own (`orbiterm-notes`, a suffix for the other builds), through each one's own `mcp add`
// command, never by editing their files (Claude Code rewrites its .claude.json all the time); Cursor's CLI has no `mcp add`,
// so its documented mcp.json gets the server written in beside the user's own. Off removes them again. The server
// shows the tools only to AI sessions that run in Orbiterm's terminals (and to Claude Desktop while Settings > Claude is on),
// so an AI in another terminal app sees nothing.
// Off by default: a note read by an AI goes to its provider, and notes hold passwords and keys now and then.
// Modes: off, read, write (read + add, edit, pin), kept in settings.json (`notesAI`). The page can't turn it on by itself:
// that goes through a native question (Settings > Privacy > AI tools and my notes, web/cloud.js's `notesai` handler).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { createNotesTools } = require('./notestools');

const KEY = 'notesAI';
const MODES = ['off', 'read', 'write'];
const TOOLS = ['claude', 'codex', 'agy', 'cursor'];
const SERVER_NAME = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * settings: the app's settings.json. dialog, parent(): the native question and the window it sits on (the dashboard).
 * notesStore, noteWindows, terminals: what the tools read (notestools.js). dataDir: the app's data folder (notes-ai.log).
 * which(name), childEnvironment(): terminals.js's, to find and run the three tools. usable: false where nothing may be
 * registered (a development check, or a run on a Mac). mcp: item 6's server, or a function that answers it (null while it
 * isn't there): register, ensureBridge, serverName, refresh, mode. folderOf(id): the folder one of the app's terminals is
 * in (main.js), for the notes' projects.
 */
function createNotesAI({ settings, dialog, parent, notesStore, noteWindows, terminals, folderOf, dataDir, which, childEnvironment, usable, mcp }) {
  const HOME = os.homedir();
  const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(HOME, '.claude');
  const codexHome = () => process.env.CODEX_HOME || path.join(HOME, '.codex');
  const cursorHome = () => process.env.CURSOR_CONFIG_DIR || path.join(HOME, '.cursor');

  // Item 6's server: missing in a build without it (or not made yet), and then nothing is added to the AIs and Settings says
  // so; the mode is kept all the same.
  function server() {
    try {
      const m = typeof mcp === 'function' ? mcp() : mcp;
      return m && typeof m.register === 'function' ? m : null;
    } catch {
      return null;
    }
  }

  const mode = () => (MODES.includes(settings.get(KEY)) ? settings.get(KEY) : 'off');

  const notesTools = createNotesTools({
    mode,
    mcpMode: () => {
      const m = server();
      try {
        return m && typeof m.mode === 'function' ? String(m.mode() || 'off') : 'off';
      } catch {
        return 'off';
      }
    },
    notesStore,
    noteWindows,
    terminals,
    folderOf,
    dataDir,
    claudeDir: CLAUDE_DIR,
  });

  // The notes' six tools on the server, once (the Mac's AppDelegate loop over NotesTools.all). Each is checked against the
  // notes' own mode at every call and every listing (`enabled`).
  let registered = false;
  function register() {
    const m = server();
    if (registered || !m) return registered;
    for (const t of notesTools.tools) m.register(t);
    registered = true;
    return true;
  }

  // ---------- the three tools ----------
  const exists = (p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  };
  const readJSON = (file) => {
    try {
      const o = JSON.parse(fs.readFileSync(file, 'utf8'));
      return o && typeof o === 'object' ? o : null;
    } catch {
      return null;
    }
  };

  // Whether the tool is on this PC at all (its folder in the user's profile).
  function present(tool) {
    if (tool === 'claude') return exists(CLAUDE_DIR) || exists(path.join(HOME, '.claude.json'));
    if (tool === 'codex') return exists(codexHome());
    if (tool === 'cursor') return exists(cursorHome());
    return ['antigravity-cli', 'antigravity', 'antigravity-ide'].some((d) => exists(path.join(HOME, '.gemini', d))) || exists(path.join(HOME, '.gemini', 'config'));
  }

  // Puts the server into Cursor's mcp.json (`mcpServers.<name>` = `{ command: launcher }`), or takes it out (`launcher`
  // null), the user's own servers and every other key left as they are (the Mac's cursorSet). A file that isn't JSON is
  // left alone; a link (dotfiles) is written through, its target changes and the link stays.
  function cursorSet(name, launcher) {
    let file = path.join(cursorHome(), 'mcp.json');
    try {
      file = fs.realpathSync(file);
    } catch {}
    let root = {};
    let text = null;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch (e) {
      // Only a file that isn't there is empty: one that can't be read now is left alone, never written over.
      if (!e || e.code !== 'ENOENT') return;
    }
    if (text !== null && text.trim()) {
      try {
        root = JSON.parse(text.replace(/^﻿/, ''));
      } catch {
        return;
      }
      if (!root || typeof root !== 'object' || Array.isArray(root)) return;
    } else if (launcher == null) return;
    const servers = root.mcpServers && typeof root.mcpServers === 'object' && !Array.isArray(root.mcpServers) ? root.mcpServers : {};
    if (launcher != null) servers[name] = { command: launcher };
    else delete servers[name];
    root.mcpServers = servers;
    const tmp = `${file}.${process.pid}.tmp`;
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(tmp, JSON.stringify(root, null, 2) + '\n');
      fs.renameSync(tmp, file);
    } catch (e) {
      try {
        fs.unlinkSync(tmp);
      } catch {}
      console.error('notes AI: Cursor\'s mcp.json:', e.message);
    }
  }

  // What the tool has under `name` now: the command it runs, null when none (read from its own settings file). Claude Code
  // keeps it in .claude.json (in CLAUDE_CONFIG_DIR when that is set), Antigravity in %USERPROFILE%\.gemini\config\
  // mcp_config.json (where `agy mcp add` writes on Windows too), Codex in its config.toml.
  function registeredCommand(tool, name) {
    const fromJSON = (file) => {
      const servers = readJSON(file)?.mcpServers;
      const s = servers && typeof servers === 'object' && Object.prototype.hasOwnProperty.call(servers, name) ? servers[name] : null;
      return s && typeof s === 'object' ? (typeof s.command === 'string' ? s.command : '') : null;
    };
    if (tool === 'claude') {
      for (const f of [path.join(CLAUDE_DIR, '.claude.json'), path.join(HOME, '.claude.json')]) {
        const c = fromJSON(f);
        if (c !== null) return c;
      }
      return null;
    }
    if (tool === 'agy') return fromJSON(path.join(HOME, '.gemini', 'config', 'mcp_config.json'));
    if (tool === 'cursor') return fromJSON(path.join(cursorHome(), 'mcp.json'));
    return codexCommand(name);
  }

  // `command = …` under `[mcp_servers.<name>]` in Codex's config.toml: a basic string ("…", with escapes) or a literal
  // one ('…', which a Windows path is often written as).
  function codexCommand(name) {
    let text;
    try {
      text = fs.readFileSync(path.join(codexHome(), 'config.toml'), 'utf8');
    } catch {
      return null;
    }
    const heads = [`[mcp_servers.${name}]`, `[mcp_servers."${name}"]`, `[mcp_servers.'${name}']`];
    let inside = false;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (line.startsWith('[')) {
        inside = heads.includes(line);
        continue;
      }
      if (inside && /^command\s*=/.test(line)) return tomlString(line.slice(line.indexOf('=') + 1).trim());
    }
    return inside ? '' : heads.some((h) => text.includes(h)) ? '' : null;
  }

  function tomlString(v) {
    if (v.startsWith("'")) {
      const end = v.indexOf("'", 1);
      return end > 0 ? v.slice(1, end) : '';
    }
    if (!v.startsWith('"')) return '';
    let out = '';
    for (let i = 1; i < v.length; i++) {
      const c = v[i];
      if (c === '"') return out;
      if (c !== '\\') {
        out += c;
        continue;
      }
      const e = v[++i];
      const simple = { b: '\b', t: '\t', n: '\n', f: '\f', r: '\r', '"': '"', '\\': '\\' };
      if (simple[e] !== undefined) out += simple[e];
      else if (e === 'u' || e === 'U') {
        const len = e === 'u' ? 4 : 8;
        const cp = parseInt(v.slice(i + 1, i + 1 + len), 16);
        if (Number.isFinite(cp)) out += String.fromCodePoint(cp);
        i += len;
      }
    }
    return out;
  }

  // The same program, as Windows reads paths (any case, either slash).
  const samePath = (a, b) => typeof a === 'string' && typeof b === 'string' && path.win32.normalize(a).toLowerCase() === path.win32.normalize(b).toLowerCase();

  // The tool's program: on the PATH (where.exe names npm's extensionless shell script first, which Windows can't run, so
  // the .exe or the .cmd by name), else where its installer puts it, for a PATH the app started with before the install.
  function programOf(tool) {
    for (const ext of ['.exe', '.cmd']) {
      const found = which(tool + ext);
      if (found && path.isAbsolute(found)) return found;
    }
    const appData = process.env.APPDATA || path.join(HOME, 'AppData', 'Roaming');
    const local = process.env.LOCALAPPDATA || path.join(HOME, 'AppData', 'Local');
    const known = {
      claude: [path.join(HOME, '.local', 'bin', 'claude.exe'), path.join(appData, 'npm', 'claude.cmd')],
      codex: [path.join(appData, 'npm', 'codex.cmd')],
      agy: [path.join(local, 'agy', 'bin', 'agy.exe')],
    }[tool];
    return known.find(exists) || null;
  }

  const addArgs = (tool, name, launcher) =>
    ({
      claude: ['mcp', 'add', '--scope', 'user', name, '--', launcher],
      codex: ['mcp', 'add', name, '--', launcher],
      agy: ['mcp', 'add', name, launcher],
    })[tool];
  const removeArgs = (tool, name) =>
    ({
      claude: ['mcp', 'remove', '--scope', 'user', name],
      codex: ['mcp', 'remove', name],
      agy: ['mcp', 'remove', name],
    })[tool];

  // One of the tool's own commands, run directly (no shell for an .exe). npm's tools are .cmd files, which Node won't start
  // without a shell (CVE-2024-27980): those go through cmd.exe with every word in double quotes, and a word cmd.exe would
  // still read something into (" % ! or a line break) isn't run at all. True when it exited with 0.
  function runTool(program, args) {
    return new Promise((resolve) => {
      const opts = { cwd: HOME, env: childEnvironment(), windowsHide: true, timeout: 60_000, maxBuffer: 1 << 20 };
      let file = program;
      let argv = args;
      if (/\.(cmd|bat)$/i.test(program)) {
        const words = [program, ...args];
        if (words.some((w) => /["%!\r\n\0]/.test(w))) return resolve(false);
        file = path.join(process.env.SystemRoot || process.env.windir || 'C:\\Windows', 'System32', 'cmd.exe');
        // /s: cmd.exe takes off the outer quotes and runs the line between as it is. /v:off: no !delayed! expansion.
        argv = ['/d', '/v:off', '/s', '/c', `"${words.map((w) => (/^[A-Za-z0-9_.:\\/-]+$/.test(w) ? w : `"${w}"`)).join(' ')}"`];
        opts.windowsVerbatimArguments = true;
      }
      try {
        const child = execFile(file, argv, opts, (err) => resolve(!err));
        if (child.stdin) child.stdin.end();
      } catch {
        resolve(false);
      }
    });
  }

  // ---------- on and off ----------
  // Every change to the three tools, one at a time.
  let queue = Promise.resolve();
  let bridge = null; // the notes-only bridge's path, once item 6 made it
  let bridgeFailed = false;

  // At a launch: what's on is kept (a moved bridge gets its path put right), what's off is taken out again.
  function autoStart() {
    register();
    refreshServer();
    return sync();
  }

  function refreshServer() {
    const m = server();
    try {
      if (m && typeof m.refresh === 'function') m.refresh();
    } catch (e) {
      console.error('notes AI: the MCP server could not follow the switch:', e.message);
    }
  }

  async function setMode(m) {
    settings.set(KEY, m);
    // The server's pipe follows: open while this or the Claude access is on (mcp.js asks access()).
    refreshServer();
    await sync();
  }

  // The three tools as the mode says, each through its own command.
  function sync() {
    const run = queue.then(async () => {
      const m = server();
      if (!usable || !m) return;
      register();
      const name = String(m.serverName('notes') || '');
      if (!SERVER_NAME.test(name)) return;
      let want = null;
      if (mode() !== 'off') {
        try {
          want = await m.ensureBridge('notes');
          bridge = typeof want === 'string' && path.isAbsolute(want) ? want : null;
          bridgeFailed = !bridge;
        } catch (e) {
          bridge = null;
          bridgeFailed = true;
          console.error('notes AI: no MCP bridge:', e.message);
        }
        // Without the bridge nothing is added or taken out (the Mac's `launcher == nil`).
        if (!bridge) return;
        want = bridge;
      }
      for (const tool of TOOLS) {
        if (!present(tool)) continue;
        const now = registeredCommand(tool, name);
        if (want ? samePath(now, want) : now === null) continue;
        if (tool === 'cursor') {
          cursorSet(name, want || null);
          continue;
        }
        const program = programOf(tool);
        if (!program) continue;
        if (now !== null) await runTool(program, removeArgs(tool, name));
        if (want) await runTool(program, addArgs(tool, name, want));
      }
    });
    queue = run.catch((e) => console.error('notes AI:', e));
    return queue;
  }

  // For Settings: the mode, whether the server is in this build, and which tools have it.
  function state() {
    const m = server();
    const tools = {};
    let name = '';
    try {
      name = m ? String(m.serverName('notes') || '') : '';
    } catch {}
    for (const t of TOOLS) if (present(t)) tools[t] = SERVER_NAME.test(name) && registeredCommand(t, name) !== null;
    // `outsideWriteNeedsType`: false, as the Mac's NotesTools.outsideWritesNeedWatchAndType: Claude Desktop changes notes by the
    // notes' own level alone (notestools.js), and the page says so.
    return { mode: mode(), ready: !!m && usable && !bridgeFailed, tools, outsideWriteNeedsType: false };
  }

  // ---------- Settings' switch (web/cloud.js), the Mac's NotesAIBridge ----------
  // { type: 'state' }, { type: 'mode', mode }. Turning it on or to editing asks in a native question the page can't
  // answer; turning it off, and reading the state, need nothing. main.js lets only the dashboard's page send these.
  async function handle(body) {
    switch (body && body.type) {
      case 'state':
        return state();
      case 'mode': {
        const want = MODES.includes(body.mode) ? body.mode : null;
        if (!want) return state();
        const was = mode();
        if (want !== 'off' && want !== was && !(want === 'read' && was === 'write')) {
          // `refused` says why nothing changed (the Mac's NotesAIBridge): "wait" (a question is up, or one was asked a moment
          // ago) or "cancel" (the user said no).
          const answer = await confirm(want);
          if (answer !== 'yes') return { ...state(), refused: answer };
        }
        await setMode(want);
        return state();
      }
      default:
        throw new Error('unknown request');
    }
  }

  let asking = false;
  let lastAsk = -Infinity;

  // 'yes', 'wait' (a question is up, or one was asked a moment ago) or 'cancel' (the user said no).
  async function confirm(want) {
    // One question at a time, and not more often than every ten seconds: a page can't wear the answer out.
    if (asking || performance.now() - lastAsk < 10_000) return 'wait';
    asking = true;
    try {
      const write = want === 'write';
      // The Mac's NotesAIBridge words (its list of AIs as this app has them; shared notes only with their owner's leave).
      const options = {
        type: write ? 'warning' : 'info',
        message: write ? 'Let AI read and edit your notes?' : 'Let AI read your notes?',
        detail: write
          ? "AI in Orbiterm's terminals (Claude Code, Codex, Antigravity, Cursor) and Claude Desktop, if you connect it, will be able to read all your notes, add to them, change them, make new ones and pin or open them on your screen. Shared notes are read only when their owner allows it. What they read goes to their provider. Passwords and keys are hidden first, but everything else in a note is sent. Every change shows on the note with Undo. You can turn this off at any time."
          : "AI in Orbiterm's terminals (Claude Code, Codex, Antigravity, Cursor) and Claude Desktop, if you connect it, will be able to read all your notes, never change them. Shared notes are read only when their owner allows it. What they read goes to their provider. Passwords and keys are hidden first, but everything else in a note is sent. Hide a note from AI with its eye. You can turn this off at any time.",
        buttons: ['Cancel', write ? 'Allow reading and editing' : 'Allow reading'],
        // Cancel is the one Enter presses, and Esc's.
        defaultId: 0,
        cancelId: 0,
        noLink: true,
      };
      const win = parent && parent();
      const r = win && !win.isDestroyed() ? await dialog.showMessageBox(win, options) : await dialog.showMessageBox(options);
      return r.response === 1 ? 'yes' : 'cancel';
    } catch {
      return 'cancel';
    } finally {
      asking = false;
      lastAsk = performance.now();
    }
  }

  return {
    handle,
    autoStart,
    register,
    mode,
    // For mcp.js (deps.notesAccess): the pipe stays open while this is on, even with the Claude access off.
    access: () => mode() !== 'off',
  };
}

module.exports = { createNotesAI };
