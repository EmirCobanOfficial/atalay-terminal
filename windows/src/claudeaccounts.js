'use strict';
// Several Claude accounts, the Windows side of the Mac app's ClaudeAccounts.swift and ClaudeAccountsBridge.swift (the plan
// and the spec are in araştırma/claude-coklu-hesap/). One account is Claude Code's own folder (no CLAUDE_CONFIG_DIR set);
// each other one lives in %USERPROFILE%\.claude-accounts\<id> with its own sign-in, which Claude Code keeps itself
// (<folder>\.credentials.json): Orbiterm never reads, copies or stores a token, and sets nothing but CLAUDE_CONFIG_DIR.
// Hard rules: nothing here switches an account by itself; no usage endpoint is asked (the limits come from the status
// line's files and the transcript's 429); a folder is never deleted through a link.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');
const { which, childEnvironment, accountPrefix } = require('./terminals');

const WIN = process.platform === 'win32';
const HOME = os.homedir();
const ROOT = path.join(HOME, '.claude-accounts');
const HUES = ['255, 176, 87', '224, 132, 156', '255, 122, 69', '233, 196, 106'];
const DEFAULT_ID = 'default';
// The folders and files that are the same everywhere: one chat history, so a chat can go on with another account.
const SHARED = ['projects', 'settings.json', 'CLAUDE.md', 'skills', 'agents', 'plugins'];

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const key = (p) => (WIN ? path.resolve(p).toLowerCase() : path.resolve(p));
const same = (a, b) => key(a) === key(b);
const realOf = (p) => {
  try {
    return fs.realpathSync.native(p);
  } catch {
    return path.resolve(p);
  }
};
/** "r, g, b" with three numbers up to 255, nothing else (the colour goes into the pages' styles). */
const validHue = (s) => typeof s === 'string' && /^\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*$/.test(s) && s.split(',').every((n) => Number(n) <= 255);
/** First 8 hex digits of the sha256 of the folder's path, as the status line script computes them. */
const sha8 = (dir) => crypto.createHash('sha256').update(dir, 'utf8').digest('hex').slice(0, 8);

/** A key-sorted copy, to compare two JSON values whatever order their keys came in. */
function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (isObj(v)) return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]));
  return v;
}
const sameJSON = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

/**
 * dataDir: the app's data folder (claude-accounts.json, next to limits.json); claudeDir: Claude Code's own folder;
 * limitsFile: the default account's limits.json; names(): the two Orbiterm MCP servers' names; installStatusLine(): hooks
 * the status line script into every account's settings (limits.js), only where the app may touch Claude Code's settings
 * (main.js: the app's usual profile; a staging profile's hook would chain into the installed app's and loop);
 * signIn(id): opens the terminal that runs `claude auth login` for an account; runningChats(id): how many chats run with an
 * account; onChange(): the accounts or their sign-ins changed.
 */
function createClaudeAccounts({ dataDir, claudeDir, limitsFile, names, installStatusLine, signIn, runningChats, onChange }) {
  const file = path.join(dataDir, 'claude-accounts.json');
  let cache = null; // { mtime, list, projects }
  const changed = () => {
    try {
      if (typeof onChange === 'function') onChange();
    } catch {}
  };

  const placeholder = () => ({ id: DEFAULT_ID, dir: null, email: '', orgId: '', orgName: '', plan: '', label: 'Claude', initial: 'C', hue: HUES[0] });

  function read() {
    let mtime = -1;
    try {
      mtime = fs.statSync(file).mtimeMs;
    } catch {}
    if (cache && cache.mtime === mtime) return cache;
    const list = [];
    let projects = {};
    if (mtime >= 0) {
      try {
        const j = JSON.parse(fs.readFileSync(file, 'utf8'));
        for (const a of Array.isArray(j.accounts) ? j.accounts : []) {
          if (!isObj(a) || typeof a.id !== 'string' || !a.id) continue;
          const str = (v) => (typeof v === 'string' ? v : '');
          const label = str(a.label) || a.id;
          list.push({
            id: a.id, dir: typeof a.dir === 'string' && a.dir ? a.dir : null, email: str(a.email), orgId: str(a.orgId), orgName: str(a.orgName),
            plan: str(a.plan), label, initial: str(a.initial) || label.slice(0, 1).toUpperCase(), hue: validHue(a.hue) ? a.hue : HUES[0],
          });
        }
        if (isObj(j.projects)) projects = Object.fromEntries(Object.entries(j.projects).filter(([, v]) => typeof v === 'string'));
      } catch {}
    }
    if (!list.some((a) => !a.dir)) list.unshift(placeholder());
    cache = { mtime, list, projects };
    return cache;
  }

  function write(list, projects) {
    const body = JSON.stringify({ accounts: list.map((a) => ({ ...a, dir: a.dir || null })), projects }, null, 2);
    fs.mkdirSync(dataDir, { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, body, { mode: 0o600 });
    fs.renameSync(tmp, file);
    cache = null;
    changed();
  }

  const all = () => read().list.map((a) => ({ ...a, isDefault: !a.dir }));
  const multiple = () => read().list.length > 1;
  const account = (id) => all().find((a) => a.id === id) || null;
  const defaultAccount = () => all().find((a) => a.isDefault) || { ...placeholder(), isDefault: true };
  const dirOf = (id) => (account(id) || {}).dir || claudeDir;
  /** Every account's folder, the default's first: where the engine looks for live sessions. */
  const dirs = () => all().map((a) => ({ id: a.id, dir: a.dir || claudeDir }));
  const json = (a) => ({ id: a.id, label: a.label, initial: a.initial, hue: a.hue, email: a.email, orgId: a.orgId, orgName: a.orgName, plan: a.plan, isDefault: !a.dir });

  function lastAccount(top) {
    const { list, projects } = read();
    const id = projects[top];
    return id && list.some((a) => a.id === id) ? id : null;
  }
  function remember(id, top) {
    if (!multiple() || !top) return;
    const { list, projects } = read();
    if (projects[top] === id || !list.some((a) => a.id === id)) return;
    write(list, { ...projects, [top]: id });
  }

  // ----- the limits files (the status line script writes one per account) -----
  const limitsPath = (a) => (a.dir ? path.join(path.dirname(limitsFile), `limits-claude-${sha8(a.dir)}.json`) : limitsFile);
  const limitsCache = new Map();
  /** `{fiveHour, week, at}` (times in ms) for one account, or null. */
  function limitsOf(a) {
    const p = limitsPath(a);
    let st;
    try {
      st = fs.statSync(p);
    } catch {
      return null;
    }
    const c = limitsCache.get(p);
    if (c && c.mtime === st.mtimeMs) return c.json;
    let out = null;
    try {
      const rl = JSON.parse(fs.readFileSync(p, 'utf8')).rate_limits;
      if (isObj(rl)) {
        const win = (w) => {
          if (!isObj(w) || typeof w.used_percentage !== 'number') return null;
          const reset = typeof w.resets_at === 'number' ? w.resets_at : 0;
          return { pct: w.used_percentage, resetsAt: reset < 1e12 ? reset * 1000 : reset };
        };
        out = { fiveHour: win(rl.five_hour), week: win(rl.seven_day), at: st.mtimeMs };
      }
    } catch {}
    limitsCache.set(p, { mtime: st.mtimeMs, json: out });
    return out;
  }

  // ----- adding, naming, removing -----
  function link(src, dest) {
    try {
      fs.lstatSync(dest);
      return; // there is something already
    } catch {}
    let st;
    try {
      st = fs.statSync(src);
    } catch {
      return;
    }
    try {
      // A junction for a folder (no right needed); a file link needs Developer Mode on Windows, else the file is copied (it
      // then stops following the default's: said in Settings).
      if (st.isDirectory()) fs.symlinkSync(src, dest, 'junction');
      else fs.symlinkSync(src, dest, 'file');
    } catch {
      try {
        if (st.isFile()) fs.copyFileSync(src, dest);
      } catch {}
    }
  }

  /**
   * A new account: its folder under ~/.claude-accounts (the path is never changed afterwards: Claude Code keys its
   * sign-in to it), with the files that should be the same everywhere linked to the default's. Sign-in is a normal terminal
   * (`claude auth login`), started by the caller.
   */
  function create(label, hue) {
    const { list, projects } = read();
    const name = String(label || '').trim().slice(0, 24);
    if (!name) return null;
    // ASCII only: the folder's path is what Claude Code keys the sign-in to and what the status line script hashes.
    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!slug || slug === DEFAULT_ID) slug = 'account';
    let id = slug;
    for (let n = 2; list.some((a) => a.id === id) || fs.existsSync(path.join(ROOT, id)); n++) id = `${slug}-${n}`;
    const dir = path.join(ROOT, id);
    try {
      fs.mkdirSync(ROOT, { recursive: true });
      fs.mkdirSync(dir, { recursive: true });
      fs.mkdirSync(path.join(claudeDir, 'projects'), { recursive: true });
    } catch {
      return null;
    }
    for (const item of SHARED) link(path.join(claudeDir, item), path.join(dir, item));
    const taken = new Set(list.map((a) => a.initial));
    let initial = name.slice(0, 1).toUpperCase();
    if (taken.has(initial)) initial = [...name.toUpperCase()].find((ch) => /\p{L}/u.test(ch) && !taken.has(ch)) || initial;
    const chosen = validHue(hue) ? hue : HUES[list.length % HUES.length];
    const a = { id, dir, email: '', orgId: '', orgName: '', plan: '', label: name, initial, hue: chosen };
    write([...list, a], projects);
    try {
      if (typeof installStatusLine === 'function') installStatusLine();
    } catch {}
    syncMcp();
    return { ...a, isDefault: false };
  }

  function update(id, change) {
    const { list, projects } = read();
    const i = list.findIndex((a) => a.id === id);
    if (i < 0) return;
    const next = list.map((a) => ({ ...a }));
    change(next[i]);
    write(next, projects);
  }
  function rename(id, label) {
    const name = String(label || '').trim().slice(0, 24);
    if (name) update(id, (a) => (a.label = name));
  }

  /** An account folder Orbiterm made: ~/.claude-accounts/<one name>, a real folder (not a link), not the default's folder. */
  function ownFolder(dir) {
    if (typeof dir !== 'string' || !same(path.dirname(dir), ROOT)) return false;
    const name = path.basename(dir);
    if (!name || name === '.' || name === '..') return false;
    let st;
    try {
      st = fs.lstatSync(dir); // does not follow a link at the end of the path
    } catch {
      return false;
    }
    if (!st.isDirectory() || st.isSymbolicLink()) return false;
    const r = realOf(dir), claude = realOf(claudeDir), home = realOf(HOME);
    const inside = (a, b) => key(a).startsWith(key(b) + path.sep);
    return !same(r, home) && !same(r, claude) && !inside(r, claude) && !inside(claude, r);
  }

  /** Removes a tree without ever following a link: a link (a junction, a symbolic link) is taken away itself. */
  function rmTree(p) {
    let st;
    try {
      st = fs.lstatSync(p);
    } catch {
      return;
    }
    if (st.isSymbolicLink()) {
      try {
        fs.unlinkSync(p);
      } catch {
        try {
          fs.rmdirSync(p);
        } catch {}
      }
      return;
    }
    if (st.isDirectory()) {
      let entries = [];
      try {
        entries = fs.readdirSync(p);
      } catch {}
      for (const e of entries) rmTree(path.join(p, e));
      try {
        fs.rmdirSync(p);
      } catch {}
      return;
    }
    try {
      fs.unlinkSync(p);
    } catch {
      try {
        fs.chmodSync(p, 0o666);
        fs.unlinkSync(p);
      } catch {}
    }
  }
  function deleteFolder(dir) {
    // An account added again under the same name while the sign-out ran owns the folder now.
    if (!ownFolder(dir) || all().some((a) => a.dir && same(a.dir, dir))) return;
    rmTree(dir);
  }

  /** Takes an account out: its sign-out, its links and its folder. Returns an error line, or null when done. */
  function remove(id) {
    const { list, projects } = read();
    const a = list.find((x) => x.id === id);
    if (!a || !a.dir) throw new Error("The default account can't be removed.");
    if (!ownFolder(a.dir)) throw new Error('Unexpected folder.');
    // Out of the list first (nothing polls, hooks or syncs it any more); its folder goes once Claude Code has signed it out,
    // so the sign-out finds it and a later account with the same name can't start signed in to this one.
    write(list.filter((x) => x.id !== id), Object.fromEntries(Object.entries(projects).filter(([, v]) => v !== id)));
    // Its limits file goes only from the app's own folder: a staging profile reads the installed app's (main.js) and leaves
    // it be.
    const lim = path.resolve(path.dirname(limitsFile)) === path.resolve(dataDir) ? limitsPath(a) : null;
    runClaude('auth logout', a.dir, () => {
      deleteFolder(a.dir);
      try {
        if (lim) fs.unlinkSync(lim);
      } catch {}
    });
    return null;
  }

  // ----- Claude Code's own commands, run with the account's folder -----
  const commandEnv = (dir) => {
    const env = childEnvironment(undefined, dir || null);
    return env;
  };

  /**
   * Runs `claude <args>` through PowerShell (where `claude` is on the PATH, as in the terminals), off the main thread. The
   * account's folder is also set on the command itself, as in its terminals: the profile runs after our environment and may
   * set its own, and a sign-out or a status must reach this account and no other. `done(code, text)`.
   */
  function runClaude(args, dir, done, timeout = 25_000) {
    let finished = false;
    const end = (code, text) => {
      if (finished) return;
      finished = true;
      try {
        done(code, text);
      } catch {}
    };
    let child;
    try {
      const shellFile = WIN
        ? which('pwsh.exe') || path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
        : process.env.SHELL || '/bin/zsh';
      const cmd = accountPrefix(dir) + 'claude ' + args;
      child = cp.spawn(shellFile, WIN ? ['-NoLogo', '-NonInteractive', '-Command', cmd] : ['-ilc', cmd], { env: commandEnv(dir), windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      return end(-1, '');
    }
    let out = '';
    child.stdout.on('data', (d) => {
      if (out.length < 200_000) out += d.toString('utf8');
    });
    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch {}
    }, timeout);
    child.on('error', () => (clearTimeout(timer), end(-1, '')));
    child.on('close', (code) => (clearTimeout(timer), end(code == null ? -1 : code, out)));
  }

  /** After a sign-in: `claude auth status --json` gives the email, the plan and the organization for the row and the column.
   *  `finished()` is called once the command is over, whatever it said. */
  function refreshStatus(id, done, finished) {
    const a = account(id);
    if (!a) return typeof finished === 'function' && finished();
    runClaude('auth status --json', a.dir, (_code, text) => {
      if (typeof finished === 'function') finished();
      // The shell may print its own lines first: the JSON starts at the first brace.
      const start = text.indexOf('{');
      let j;
      try {
        j = start >= 0 ? JSON.parse(text.slice(start)) : null;
      } catch {
        j = null;
      }
      if (!isObj(j) || j.loggedIn === false) return;
      const first = (account(id) || {}).email === '';
      update(id, (x) => {
        if (typeof j.email === 'string') x.email = j.email;
        if (typeof j.orgId === 'string') x.orgId = j.orgId;
        if (typeof j.orgName === 'string') x.orgName = j.orgName;
        if (typeof j.subscriptionType === 'string') x.plan = j.subscriptionType;
      });
      const now = account(id);
      if (first && now && now.email) {
        copyUserServers(now);
        syncMcp();
      }
      if (typeof done === 'function') done();
    });
  }

  // ----- Claude Code's user-level MCP servers (each account's own .claude.json) -----
  /** Where Claude Code keeps an account's user-level MCP servers: <CLAUDE_CONFIG_DIR>\.claude.json; the default account's is
   *  ~\.claude.json (or inside CLAUDE_CONFIG_DIR when the app itself was started with it set). */
  function configFile(a) {
    if (a.dir) return path.join(a.dir, '.claude.json');
    return process.env.CLAUDE_CONFIG_DIR ? path.join(claudeDir, '.claude.json') : path.join(HOME, '.claude.json');
  }
  function serversIn(f) {
    try {
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      return isObj(j) && isObj(j.mcpServers) ? j.mcpServers : {};
    } catch {
      return {};
    }
  }
  /**
   * Changes mcpServers in an account's config, every other key as it is (a link is written through). A file that is not JSON
   * is left alone. Contents are never logged. Claude Code (running under that account) writes the same file often: the change
   * is made on a fresh read, the file is read once more right before it is replaced and, if Claude changed it meanwhile, the
   * change is made again on that; the new file is written beside it (private from the start) and renamed over it.
   */
  function editServers(f, change) {
    const real = realOf(f);
    const def = all().find((a) => a.isDefault);
    // A link to the default account's own config: that one is only ever read.
    if (def && same(real, realOf(configFile(def)))) return;
    for (let attempt = 0; attempt < 3; attempt++) {
      let data = null;
      try {
        data = fs.readFileSync(real);
      } catch {}
      let root = {};
      if (data) {
        try {
          root = JSON.parse(data.toString('utf8').replace(/^\uFEFF/, ''));
        } catch {
          return;
        }
        if (!isObj(root)) return;
      }
      const s = isObj(root.mcpServers) ? JSON.parse(JSON.stringify(root.mcpServers)) : {};
      const before = JSON.parse(JSON.stringify(s));
      change(s);
      if (sameJSON(s, before)) return;
      root.mcpServers = s;
      const out = JSON.stringify(root, null, 2);
      // Changed while this was made: once more, on what is there now.
      let now = null;
      try {
        now = fs.readFileSync(real);
      } catch {}
      if (!((data === null && now === null) || (data && now && data.equals(now)))) continue;
      const tmp = path.join(path.dirname(real), `.claude.json.orbiterm-${process.pid}-${crypto.randomBytes(4).toString('hex')}`);
      try {
        fs.writeFileSync(tmp, out, { flag: 'wx', mode: 0o600 });
        fs.renameSync(tmp, real);
      } catch {
        try {
          fs.unlinkSync(tmp);
        } catch {}
      }
      return;
    }
  }
  /**
   * Orbiterm's two MCP servers (the Claude access and the notes) follow the default account's config into every other
   * account's: registered there, they are registered everywhere; taken out there, taken out everywhere (the default's own
   * entries are only read). At launch, when an account is added, and when the app (un)registers them.
   */
  function syncMcp() {
    const list = all();
    const def = list.find((a) => a.isDefault);
    if (list.length < 2 || !def) return;
    let wanted = [];
    try {
      wanted = (typeof names === 'function' ? names() : []).filter((n) => typeof n === 'string' && n);
    } catch {}
    if (!wanted.length) return;
    const mine = serversIn(configFile(def));
    for (const a of list) {
      if (a.isDefault || !a.dir || !fs.existsSync(a.dir)) continue;
      editServers(configFile(a), (s) => {
        for (const n of wanted) {
          if (mine[n] !== undefined) s[n] = JSON.parse(JSON.stringify(mine[n]));
          else if (isObj(s[n]) && s[n].command !== undefined) delete s[n];
        }
      });
    }
  }
  /** After a new account's first sign-in: the user's own servers of the default account are added to it (those it doesn't have
   *  yet), as `claude mcp add --scope user` would. Their settings are copied as they are and never shown. */
  function copyUserServers(a) {
    const def = all().find((x) => x.isDefault);
    if (!a || a.isDefault || !def) return;
    const mine = serversIn(configFile(def));
    if (!Object.keys(mine).length) return;
    editServers(configFile(a), (s) => {
      for (const [k, v] of Object.entries(mine)) if (s[k] === undefined) s[k] = JSON.parse(JSON.stringify(v));
    });
  }

  // ----- for the pages -----
  /**
   * Windows links a file only with Developer Mode on: without it the account got its own copy of settings.json (or Claude
   * Code made one there), which no longer follows the default's. Settings › Claude says so under the account, in plain words.
   */
  function copyNote(a) {
    if (!a.dir) return '';
    try {
      const st = fs.lstatSync(path.join(a.dir, 'settings.json'));
      if (!st.isFile() || st.isSymbolicLink()) return '';
    } catch {
      return '';
    }
    return 'Uses its own copy of your Claude settings: changes to the default account’s settings don’t reach it.';
  }

  /** The accounts with what they have left, for Settings and the popover: { accounts, multiple }. */
  function webJSON() {
    const list = all();
    return {
      multiple: list.length > 1,
      accounts: list.map((a) => {
        const note = copyNote(a);
        return { ...json(a), limits: limitsOf(a), signedIn: a.isDefault || !!a.email, ...(note ? { note } : {}) };
      }),
    };
  }

  // ----- the bridge: Settings > Claude's accounts and the top bar's popover -----
  const signingIn = new Map(); // id -> polls so far
  const timers = new Map();
  function stopWatching(id) {
    clearInterval(timers.get(id));
    timers.delete(id);
    signingIn.delete(id);
  }
  /** A normal Orbiterm terminal runs `claude auth login` under the account's folder; Claude's own sign-in opens in the
   *  browser. Its end shows as an email in `claude auth status`, asked every few seconds (a local command, no network call
   *  of ours) until it is there or five minutes have passed. */
  function startSignIn(a) {
    stopWatching(a.id);
    try {
      signIn(a.id);
    } catch (e) {
      console.error('claude accounts:', e.message);
    }
    signingIn.set(a.id, 0);
    // One ask at a time: PowerShell with the user's profile and Claude Code can take longer than the 5 s between them.
    let asking = false;
    const t = setInterval(() => {
      signingIn.set(a.id, (signingIn.get(a.id) || 0) + 1);
      if (signingIn.get(a.id) > 60) return stopWatching(a.id);
      if (asking) return;
      asking = true;
      refreshStatus(a.id, () => {
        const x = account(a.id);
        if (x && x.email) stopWatching(a.id);
      }, () => (asking = false));
    }, 5000);
    if (t.unref) t.unref();
    timers.set(a.id, t);
  }
  const state = () => ({ ...webJSON(), signingIn: [...signingIn.keys()] });

  function handle(body) {
    const id = typeof body.id === 'string' ? body.id : '';
    switch (body.type) {
      case 'state':
        return state();
      case 'add': {
        const a = create(body.label, validHue(body.hue) ? body.hue : null);
        if (!a) throw new Error('Give the account a name.');
        startSignIn(a);
        return state();
      }
      case 'signIn': {
        const a = account(id);
        if (a && !a.isDefault) startSignIn(a);
        return state();
      }
      case 'cancelSignIn':
        stopWatching(id);
        return state();
      case 'rename':
        rename(id, body.label);
        return state();
      case 'hue':
        if (validHue(body.hue)) update(id, (a) => (a.hue = body.hue));
        return state();
      case 'remove':
        // Never while one of its chats runs: those would lose their sign-in under them.
        if (typeof runningChats === 'function' && runningChats(id) > 0) throw new Error('A chat is running with this account. End it first.');
        stopWatching(id);
        remove(id);
        return state();
      default:
        throw new Error('unknown request');
    }
  }

  return {
    root: ROOT, file, all, multiple, account, defaultAccount, dirs, dirOf, json, lastAccount, remember, sha8, limitsPath, limits: limitsOf,
    create, update, rename, remove, runClaude, refreshStatus, syncMcp, copyUserServers, webJSON, handle, state, validHue,
  };
}

module.exports = { createClaudeAccounts, ROOT, DEFAULT_ID };
