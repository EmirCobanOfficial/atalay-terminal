'use strict';
// The git side of a worktree's next step, Create PR / Merge / Delete worktree (worktreeship.js keeps the status and does
// the work; web/worktree-ship.js is the sheets): the Mac's GitShip.swift, with Worktrees.swift's file-only look at what
// a folder is. Same care as Source Control's reads (git.js): no fsmonitor and no filter driver of the repo's own on any
// read, GIT_OPTIONAL_LOCKS=0 for reads, git's own sentences in English, argv arrays (no shell), `--` before every path,
// and never `--force`: no force push, no `worktree remove --force`, no `branch -D` of anything but the branch the user
// asked to delete. Long paths on (core.longpaths): a worktree's node_modules goes past Windows' 260 characters.
//
//   const ship = createGitShip({ trash });   // trash(path): shell.trashItem
//   await ship.worktreeStatus(top, known)    // and the rest below, each answering what GitShip.swift's does

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { gitExecutable, readGuards } = require('./git');

const WIN = process.platform === 'win32';
const HOME = os.homedir();

// ---------- paths ----------

// A folder as the system writes it (backslashes on Windows), for comparing: resolved, and whatever its case on Windows.
const norm = (p) => (WIN ? path.resolve(String(p || '')).toLowerCase() : path.resolve(String(p || '')));
const same = (a, b) => !!a && !!b && norm(a) === norm(b);
// Whether `p` is `top` or inside it.
const under = (p, top) => {
  const a = norm(p), t = norm(top);
  return a === t || a.startsWith(t.endsWith(path.sep) ? t : t + path.sep);
};
// The path with links and junctions resolved, and the case it has on disk (as given when it isn't there): the Mac's
// Worktrees.real.
function real(p) {
  try {
    return fs.realpathSync.native(p);
  } catch {
    return path.resolve(p);
  }
}
// The same for a folder that may be gone (a deleted worktree): its nearest parent that is there resolved, the rest as
// given. A chat's folder written through a junction still names the worktree it was in.
function realUp(p) {
  const given = path.resolve(String(p || ''));
  const rest = [];
  for (let dir = given; ; ) {
    try {
      return path.join(fs.realpathSync.native(dir), ...rest);
    } catch {}
    const up = path.dirname(dir);
    if (up === dir) return given;
    rest.unshift(path.basename(dir));
    dir = up;
  }
}
// A folder's last part.
const leaf = (p) => String(p || '').replace(/[\\/]+$/, '').split(/[\\/]/).pop() || String(p || '');

// ---------- running programs ----------

// Runs `exe` with `args` (never through a shell): { status, out, err } (bytes), status -1 when it was stopped after
// `timeout` ms or printed more than `max` bytes; null when it didn't start. `input` goes to its stdin. The Mac's Git.run.
function run(exe, args, { cwd, env, timeout = 30_000, input = null, max = 32 << 20 } = {}) {
  return new Promise((resolve) => {
    let p;
    try {
      p = spawn(exe, args, { cwd: cwd || HOME, env, stdio: [input == null ? 'ignore' : 'pipe', 'pipe', 'pipe'], windowsHide: true });
    } catch {
      return resolve(null);
    }
    const out = [], err = [];
    let size = 0, started = false, stopped = false, finished = false, status = null, grace = null;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      try {
        p.kill();
      } catch {}
    };
    const timer = setTimeout(stop, timeout);
    const finish = (r) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      clearTimeout(grace);
      resolve(r);
    };
    const done = () => finish({ status: stopped || status == null ? -1 : status, out: Buffer.concat(out), err: Buffer.concat(err) });
    p.stdout.on('data', (d) => {
      if (stopped) return;
      size += d.length;
      if (size > max) stop();
      else out.push(d);
    });
    p.stderr.on('data', (d) => err.push(d));
    p.on('spawn', () => {
      started = true;
      if (input != null) {
        p.stdin.on('error', () => {});
        p.stdin.end(input);
      }
    });
    p.on('error', () => {
      if (!started) finish(null);
    });
    p.on('exit', (code) => {
      status = code;
      // Something it started (ssh, a credential helper) can hold its pipes open after it's gone: waited for a moment only.
      grace = setTimeout(() => {
        p.stdout.destroy();
        p.stderr.destroy();
        done();
      }, 1000);
    });
    p.on('close', (code) => {
      if (status == null) status = code;
      done();
    });
  });
}

// The environment git runs in: no terminal to ask a password on (GIT_TERMINAL_PROMPT), no Git Credential Manager window
// either (GCM_INTERACTIVE: a window nobody sees would hold the push until its time is up), git's sentences in English
// (its "rejected", "Authentication failed" are looked for), and reads without the index lock.
let envs = null;
function gitEnv(locks) {
  if (!envs) {
    const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never', LC_MESSAGES: 'C' };
    delete env.LC_ALL;
    if (!env.LANG) env.LANG = 'en_US.UTF-8';
    envs = { change: env, read: { ...env, GIT_OPTIONAL_LOCKS: '0' } };
  }
  return locks ? envs.change : envs.read;
}

// git in `dir`, the Mac's Git.exec: never the folder's own fsmonitor, long paths on. `env`: more for this run.
// File names as they are (core.quotePath off): without it `diff --name-only` and `merge-tree --name-only` print a
// non-ASCII name as "\303\274.txt", which the sheet would show as it is (conflict chips, the "Ask … to fix" prompt) and
// which never equals the same name from `status -z` (the unsaved-files check of a merge). Names in git's own sentences
// (said()) come out readable too.
function exec(dir, args, { timeout = 10_000, locks = false, input = null, max, env = null } = {}) {
  return run(gitExecutable(), ['-C', dir, '-c', 'core.fsmonitor=false', '-c', 'core.longpaths=true', '-c', 'core.quotePath=false', ...args], { env: env ? { ...gitEnv(locks), ...env } : gitEnv(locks), timeout, input, max });
}

// A push's ssh asks nothing (BatchMode: a key that needs its passphrase fails at once instead of waiting for a prompt
// nobody sees), unless the user set their own ssh command (several accounts, other keys): that one is left as it is.
async function pushEnv(dir) {
  if (process.env.GIT_SSH_COMMAND || process.env.GIT_SSH) return null;
  return text(await read(dir, ['config', '--get', 'core.sshCommand'])) ? null : { GIT_SSH_COMMAND: 'ssh -o BatchMode=yes' };
}

// A read (the Mac's Git.read): with the repo's own filter drivers turned off (git.js readGuards). Its output, or null.
async function read(dir, args, timeout = 10_000) {
  const r = await exec(dir, [...(await readGuards(dir)), ...args], { timeout });
  return r && r.status === 0 ? r.out.toString('utf8') : null;
}

const text = (s) => String(s || '').trim();
const lines = (s) => String(s || '').split('\n').map((l) => l.trim()).filter(Boolean);
// What git (or gh) said last: its "fatal: …" or "error: …", else its last lines. The Mac's Git.said.
function said(r) {
  if (!r) return "git didn't start";
  const all = lines((r.err && r.err.length ? r.err : r.out || Buffer.alloc(0)).toString('utf8'));
  const reason = all.find((l) => /^(fatal|error): /.test(l));
  if (reason) return reason.replace(/^(fatal|error): /, '');
  return all.slice(-2).join(' ') || (r.status === -1 ? 'it took too long' : 'it failed');
}

// ---------- what a folder is (Worktrees.swift) ----------

// `ref: refs/heads/<branch>` in a HEAD file gives the branch; else (a commit) its first 7 characters.
function headBranch(file) {
  try {
    const line = fs.readFileSync(file, 'utf8').trim();
    return line.startsWith('ref: refs/heads/') ? line.slice(16) : line.slice(0, 7);
  } catch {
    return '';
  }
}

// A submodule's git folder: `.git/modules/<name>`, also inside a worktree's own (`.git/worktrees/<wt>/modules/<name>`).
function submoduleGitdir(gitdir) {
  const g = gitdir.replace(/\\/g, '/');
  const at = g.lastIndexOf('/.git/');
  if (at < 0) return g.includes('/modules/');
  const tail = g.slice(at + 6);
  return tail.startsWith('modules/') || tail.includes('/modules/');
}

const infoCache = new Map(); // folder -> { info, at }

/**
 * Where a folder sits in a repo's worktrees, from files only (no git): { main, top, branch, linked }, or null when it is
 * in no repo (a submodule is a repo of its own; the home folder's own repo doesn't count). Kept 30 seconds. The Mac's
 * Worktrees.info(of:).
 */
function info(cwd) {
  if (!cwd || !path.isAbsolute(cwd)) return null;
  const now = Date.now();
  const hit = infoCache.get(cwd);
  if (hit && now - hit.at < 30_000) return hit.info;
  const found = look(cwd);
  if (infoCache.size > 2000) infoCache.clear();
  infoCache.set(cwd, { info: found, at: now });
  return found;
}

function look(cwd) {
  let dir = real(cwd);
  for (;;) {
    if (!dir || same(dir, HOME)) return null;
    const git = path.join(dir, '.git');
    let st = null;
    try {
      st = fs.statSync(git);
    } catch {}
    if (st) {
      if (st.isDirectory()) return { main: dir, top: dir, branch: headBranch(path.join(git, 'HEAD')), linked: false };
      let gitdir = '';
      try {
        const m = /gitdir:\s*(.+)/.exec(fs.readFileSync(git, 'utf8'));
        gitdir = m ? m[1].trim() : '';
      } catch {}
      if (!gitdir) return null;
      if (!path.isAbsolute(gitdir)) gitdir = path.resolve(dir, gitdir);
      gitdir = path.normalize(gitdir);
      if (submoduleGitdir(gitdir)) return { main: dir, top: dir, branch: headBranch(path.join(gitdir, 'HEAD')), linked: false };
      const branch = headBranch(path.join(gitdir, 'HEAD'));
      const g = gitdir.replace(/\\/g, '/');
      const w = g.toLowerCase().lastIndexOf('/.git/worktrees/');
      if (w >= 0) return { main: path.normalize(g.slice(0, w)), top: dir, branch, linked: true };
      // A worktree of a bare repo: its folder is in `commondir` (relative to the worktree's own git folder).
      try {
        const c = fs.readFileSync(path.join(gitdir, 'commondir'), 'utf8').trim();
        let main = path.resolve(gitdir, c);
        if (/[\\/]\.git$/i.test(main)) main = path.dirname(main);
        return { main, top: dir, branch, linked: true };
      } catch {}
      return { main: dir, top: dir, branch, linked: false };
    }
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

/** Forgets what was read (a worktree was just made or removed): the Mac's Worktrees.forget. */
const forget = () => infoCache.clear();

// The repo's name: the main folder's last part (a bare repo kept as `proj/.bare` is `proj`). The Mac's Worktrees.home.
function repoName(main) {
  let root = main;
  if (leaf(root) === '.bare') root = path.dirname(root);
  return leaf(root);
}

// ---------- GitHub CLI ----------

let ghCache = null; // { path, at }
const ghAuthCache = new Map(); // host -> { ok, user, at }

/** GitHub CLI: on PATH, else where its installers put it; looked for again after a minute. The Mac's ghPath. */
function ghPath() {
  if (ghCache && Date.now() - ghCache.at < 60_000) return ghCache.path;
  const dirs = (process.env.PATH || '').split(path.delimiter).map((d) => d.trim().replace(/^"(.*)"$/, '$1'));
  for (const base of [process.env.ProgramW6432, process.env.ProgramFiles, process.env['ProgramFiles(x86)']]) if (base) dirs.push(path.join(base, 'GitHub CLI'));
  if (process.env.LOCALAPPDATA) dirs.push(path.join(process.env.LOCALAPPDATA, 'Programs', 'GitHub CLI'));
  let found = null;
  // Only absolute folders: Windows would look in the current folder first, and a repo could hold a gh.exe.
  for (const d of dirs) {
    if (!d || !path.isAbsolute(d)) continue;
    const exe = path.join(d, WIN ? 'gh.exe' : 'gh');
    try {
      if (fs.statSync(exe).isFile()) {
        found = exe;
        break;
      }
    } catch {}
  }
  ghCache = { path: found, at: Date.now() };
  return found;
}

/**
 * The environment gh runs in: no prompts, no update note, no colours; GH_HOST for a host other than github.com. gh runs
 * git by itself in the worktree (gh pr create counts its uncommitted files with git status, and reads the remotes and
 * the branch's settings), so that git gets the guards exec() and git.js's reads give theirs: never the folder's own
 * fsmonitor, long paths on, no signature check (log.showSignature: gpg.program is the repo's to name), and `guards`, the
 * `-c` pairs of readGuards (the repo's own filter drivers emptied). They go as GIT_CONFIG_COUNT entries, git's way of
 * passing settings to a git it doesn't start, after any the user's environment has. The Mac's ghEnv has none yet.
 */
function ghEnv(host, guards = []) {
  const env = { ...gitEnv(true), GH_PROMPT_DISABLED: '1', GH_NO_UPDATE_NOTIFIER: '1', NO_COLOR: '1' };
  if (host && host !== 'github.com') env.GH_HOST = host;
  const pairs = [['core.fsmonitor', 'false'], ['core.longpaths', 'true'], ['log.showSignature', 'false']];
  for (let i = 0; i + 1 < guards.length; i += 2) {
    const kv = String(guards[i + 1]);
    const eq = kv.indexOf('=');
    if (guards[i] !== '-c' || eq <= 0) continue;
    const k = kv.slice(0, eq), v = kv.slice(eq + 1);
    if (!pairs.some(([k2, v2]) => k2 === k && v2 === v)) pairs.push([k, v]);
  }
  let n = Number(env.GIT_CONFIG_COUNT);
  if (!Number.isInteger(n) || n < 0) n = 0;
  for (const [k, v] of pairs) {
    env[`GIT_CONFIG_KEY_${n}`] = k;
    env[`GIT_CONFIG_VALUE_${n}`] = v;
    n++;
  }
  env.GIT_CONFIG_COUNT = String(n);
  return env;
}
// gh in a worktree: with that folder's read guards as well.
const ghEnvIn = async (dir, host) => ghEnv(host, await readGuards(dir));

/** Whether gh is signed in on `host` and as whom; kept five minutes. The Mac's ghAuth. */
async function ghAuth(gh, host, force = false) {
  const hit = ghAuthCache.get(host);
  if (!force && hit && Date.now() - hit.at < 300_000) return hit;
  let ok = false, user = null;
  const r = await run(gh, host ? ['auth', 'status', '--hostname', host] : ['auth', 'status'], { env: ghEnv(host), timeout: 15_000 });
  if (r && r.status === 0) {
    ok = true;
    const u = await run(gh, ['api', 'user', '-q', '.login'], { env: ghEnv(host), timeout: 15_000 });
    if (u && u.status === 0) user = text(u.out.toString('utf8')) || null;
  }
  const a = { ok, user, at: Date.now() };
  ghAuthCache.set(host, a);
  return a;
}

// ---------- the remote ----------

const LABELS = { github: 'GitHub', ghe: 'GitHub', gitlab: 'GitLab', bitbucket: 'Bitbucket', azure: 'Azure DevOps', gitea: 'Gitea' };

/**
 * A remote's address taken apart: https, ssh://, git@host:path and a local path all come out as host + owner + repo,
 * with the kind of host it is. The Mac's parseRemote.
 */
function parseRemote(name, url) {
  let host = '', p = '';
  const scheme = url.indexOf('://');
  if (scheme >= 0) {
    const rest = url.slice(scheme + 3);
    const slash = rest.indexOf('/') < 0 ? rest.length : rest.indexOf('/');
    let h = rest.slice(0, slash);
    p = rest.slice(slash + 1);
    if (h.includes('@')) h = h.slice(h.lastIndexOf('@') + 1);
    if (h.includes(':')) h = h.slice(0, h.indexOf(':'));
    host = h;
  } else if (!url.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(url) && !url.startsWith('\\\\') && url.includes(':')) {
    // scp-like git@host:path (a drive letter, C:\…, is a local path).
    let h = url.slice(0, url.indexOf(':'));
    if (h.includes('@')) h = h.slice(h.lastIndexOf('@') + 1);
    host = h;
    p = url.slice(url.indexOf(':') + 1);
  }
  host = host.toLowerCase();
  // An SSH alias for several accounts (github.com-work, gitlab.com-me) is still that host.
  for (const h of ['github.com', 'gitlab.com', 'bitbucket.org', 'codeberg.org']) if (host.startsWith(`${h}-`)) host = h;
  p = p.replace(/^\/+|\/+$/g, '');
  if (p.endsWith('.git')) p = p.slice(0, -4);
  const comps = p.split('/').filter(Boolean);
  const r = { name, url, host, kind: 'other', owner: comps.slice(0, -1).join('/'), repo: comps[comps.length - 1] || '' };
  if (!host) r.kind = 'other';
  else if (host === 'github.com') r.kind = 'github';
  else if (host.includes('gitlab')) r.kind = 'gitlab';
  else if (host === 'bitbucket.org') r.kind = 'bitbucket';
  else if (host === 'dev.azure.com' || host === 'ssh.dev.azure.com' || host.endsWith('.visualstudio.com')) r.kind = 'azure';
  else if (host === 'codeberg.org' || host.startsWith('gitea.') || host.startsWith('forgejo.')) r.kind = 'gitea';
  if (r.kind === 'azure') {
    // https://dev.azure.com/org/project/_git/repo, or git@ssh.dev.azure.com:v3/org/project/repo
    let c = comps.slice();
    if (c[0] === 'v3') c.shift();
    c = c.filter((x) => x !== '_git');
    if (c.length >= 3) {
      r.owner = `${c[0]}/${c[1]}`;
      r.repo = c[2];
    }
  }
  return r;
}
const remoteJSON = (r) => ({ name: r.name, host: r.host, kind: r.kind, label: LABELS[r.kind] || r.host, owner: r.owner, repo: r.repo });
const label = (r) => (r && (LABELS[r.kind] || r.host)) || 'the host';

// Percent-encoding of everything but A-Z a-z 0-9 - . _ ~ (the Mac's enc).
const enc = (s) => encodeURIComponent(String(s)).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const encPath = (p) => String(p).split('/').map((x) => enc(x).replace(/%3A/g, ':')).join('/');

/** The page of the host where the pull request form is, with what can be filled in (https only; null when the host has none). */
function browserURL(r, branch, into, title, body) {
  if (!r || !r.host || r.kind === 'other' || r.kind === 'none') return null;
  const h = r.host === 'ssh.dev.azure.com' ? 'dev.azure.com' : r.host;
  const p = r.owner ? `${r.owner}/${r.repo}` : r.repo;
  switch (r.kind) {
    case 'github':
    case 'ghe': {
      // GitHub's own quick_pull parameters; a long body is cut (the URL must stay under what browsers and servers take).
      let b = String(body);
      const make = (x) => `https://${h}/${encPath(p)}/compare/${encPath(into)}...${encPath(branch)}?quick_pull=1&title=${enc(title)}&body=${enc(x)}`;
      let url = make(b);
      while (url.length > 7000 && b.length > 20) {
        b = Array.from(b).slice(0, Math.floor(Array.from(b).length * 0.8)).join('') + '…';
        url = make(b);
      }
      return url;
    }
    case 'gitlab':
      return `https://${h}/${encPath(p)}/-/merge_requests/new?merge_request%5Bsource_branch%5D=${enc(branch)}&merge_request%5Btarget_branch%5D=${enc(into)}&merge_request%5Btitle%5D=${enc(title)}&merge_request%5Bdescription%5D=${enc(Array.from(String(body)).slice(0, 3000).join(''))}`;
    case 'bitbucket':
      return `https://${h}/${encPath(p)}/pull-requests/new?source=${enc(branch)}&dest=${enc(into)}&t=1`;
    case 'azure': {
      const parts = r.owner.split('/');
      if (parts.length !== 2) return null;
      return `https://dev.azure.com/${enc(parts[0])}/${enc(parts[1])}/_git/${enc(r.repo)}/pullrequestcreate?sourceRef=${enc(branch)}&targetRef=${enc(into)}`;
    }
    case 'gitea':
      return `https://${h}/${encPath(p)}/compare/${encPath(into)}...${encPath(branch)}`;
    default:
      return null;
  }
}

// ---------- the status ----------

const exists = (p) => {
  try {
    fs.statSync(p);
    return true;
  } catch {
    return false;
  }
};

/** Every worktree's folder, branch and lock: `worktree list --porcelain` (folders as the system writes them). */
async function worktreeList(dir) {
  const out = [];
  let cur = null;
  const flush = () => {
    if (cur) out.push(cur);
    cur = null;
  };
  for (const raw of String((await read(dir, ['worktree', 'list', '--porcelain'])) || '').split('\n')) {
    const l = raw.replace(/\r$/, '');
    if (l.startsWith('worktree ')) {
      flush();
      cur = { path: path.normalize(l.slice(9)), branch: null, locked: false, prunable: false };
    } else if (!cur) continue;
    else if (l.startsWith('branch refs/heads/')) cur.branch = l.slice(18);
    else if (l === 'locked' || l.startsWith('locked ')) cur.locked = true;
    else if (l === 'prunable' || l.startsWith('prunable ')) cur.prunable = true;
  }
  flush();
  return out;
}

const baseCache = new Map(); // top \0 branch -> { base, baseRev, remote, pushRemote, at }
const everCache = new Set(); // top \0 branch: the branch moved since it was made
const lineCache = new Map(); // file -> { mtime, size, lines }

/** The base and the remote are looked at again a minute apart, or after something was done (the Mac's forgetShip). */
function forgetShip(top) {
  const k = norm(top) + '\0';
  for (const key of [...baseCache.keys()]) if (key.startsWith(k)) baseCache.delete(key);
  for (const key of [...everCache]) if (key.startsWith(k)) everCache.delete(key);
}

// The branch the worktree came from and the remote a pull request goes to (spec 3.1): VS Code's note of the base, gh's,
// the main folder's branch, the remote's default branch, then main/master/develop; the first that is a branch here (or
// on the remote). A fork's push remote (branch.<b>.pushRemote, remote.pushDefault) apart. The Mac's resolveBase.
async function resolveBase(dir, main, branch) {
  const b = { base: '', baseRev: '', remote: null, pushRemote: null, at: Date.now() };
  const remoteNames = lines(await read(dir, ['remote']));
  const defaultRemote = remoteNames.includes('origin') ? 'origin' : remoteNames.length === 1 ? remoteNames[0] : '';
  const clean = (n0) => {
    let n = n0;
    for (const p of ['refs/heads/', 'refs/remotes/']) if (n.startsWith(p)) n = n.slice(p.length);
    for (const r of remoteNames) if (n.startsWith(`${r}/`)) n = n.slice(r.length + 1);
    return n;
  };
  const candidates = [];
  for (const key of ['vscode-merge-base', 'gh-merge-base']) {
    const v = text(await read(dir, ['config', '--get', `branch.${branch}.${key}`]));
    if (v) candidates.push(clean(v));
  }
  const mainBranch = text(await read(main, ['symbolic-ref', '--short', '-q', 'HEAD']));
  if (mainBranch) candidates.push(mainBranch);
  if (defaultRemote) {
    const h = text(await read(dir, ['symbolic-ref', '-q', `refs/remotes/${defaultRemote}/HEAD`]));
    if (h) candidates.push(clean(h));
  }
  candidates.push('main', 'master', 'develop');
  const has = async (ref) => (await read(dir, ['rev-parse', '--verify', '-q', ref])) != null;
  b.base = candidates.find((c) => c && c !== branch) || 'main';
  for (const c of candidates) {
    if (!c || c === branch) continue;
    if (await has(`refs/heads/${c}`)) {
      b.base = c;
      b.baseRev = c;
      break;
    }
    if (defaultRemote && (await has(`refs/remotes/${defaultRemote}/${c}`))) {
      b.base = c;
      b.baseRev = `${defaultRemote}/${c}`;
      break;
    }
  }
  let remoteName = defaultRemote;
  const br = text(await read(dir, ['config', '--get', `branch.${b.base}.remote`]));
  if (remoteNames.includes(br)) remoteName = br;
  if (remoteName) {
    const url = await read(dir, ['remote', 'get-url', remoteName]);
    if (url != null) b.remote = parseRemote(remoteName, text(url));
  }
  // A fork: the branch goes to its own push remote, the pull request to the base's.
  let push = text(await read(dir, ['config', '--get', `branch.${branch}.pushRemote`]));
  if (!push) push = text(await read(dir, ['config', '--get', 'remote.pushDefault']));
  if (push && push !== remoteName && remoteNames.includes(push)) {
    const url = await read(dir, ['remote', 'get-url', push]);
    if (url != null) b.pushRemote = parseRemote(push, text(url));
  }
  return b;
}

// What isn't in a status yet: the Mac's WorktreeStatus defaults.
const blank = () => ({
  top: '', main: '', branch: '', base: '', baseRev: '', localSha: '', baseFolder: null, pushRemote: null, mergeBase: '',
  ahead: 0, behind: 0, dirty: 0, dirtyFiles: [], add: 0, del: 0, files: 0, upstream: null, unpushed: null, everCommitted: false,
  remote: null, ghInstalled: false, ghSignedIn: false, ghUser: null, pr: null, locked: false, detached: false, gone: false,
});

/** The state, by the first rule that holds: gone, detached, merged, pr, work, nothing (spec 3.2; the Mac's phase). */
function phase(s) {
  if (s.gone) return 'gone';
  if (s.detached) return 'detached';
  if (s.branch === s.base) return 'nothing';
  // Merged only while nothing new is in the folder: uncommitted or untracked work after the merge is "work" again.
  if ((s.pr && s.pr.state === 'MERGED' && s.dirty === 0) || (s.everCommitted && s.ahead === 0 && s.dirty === 0 && s.baseRev)) return 'merged';
  if (s.pr && s.pr.state === 'OPEN') return 'pr';
  if (s.ahead > 0 || s.dirty > 0) return 'work';
  return 'nothing';
}

/** A status as the sheets get it (the Mac's WorktreeStatus.json): the remotes as their JSON, and the phase. */
function statusJSON(s) {
  const o = {
    top: s.top, main: s.main, branch: s.branch, base: s.base, ahead: s.ahead, behind: s.behind, dirty: s.dirty, dirtyFiles: s.dirtyFiles,
    add: s.add, del: s.del, files: s.files, everCommitted: s.everCommitted, ghInstalled: s.ghInstalled, ghSignedIn: s.ghSignedIn,
    locked: s.locked, detached: s.detached, gone: s.gone, phase: phase(s), localSha: s.localSha,
  };
  if (s.baseFolder) o.baseFolder = s.baseFolder;
  if (s.upstream != null) o.upstream = s.upstream;
  if (s.unpushed != null) o.unpushed = s.unpushed;
  if (s.remote) o.remote = remoteJSON(s.remote);
  if (s.ghUser) o.ghUser = s.ghUser;
  if (s.pr) o.pr = s.pr;
  return o;
}

/**
 * Everything the header, the list and the sheets need to know about a linked worktree, from git alone (no network but
 * gh's sign-in check, kept five minutes). `known`: what was known before (a folder that's gone keeps it, and a status that
 * fails keeps it, unless `strict`). Null: not a linked worktree. The Mac's worktreeStatus(top:known:strict:).
 */
async function worktreeStatus(top, known = null, strict = false) {
  if (!exists(top)) {
    if (!known) return null;
    return { ...known, gone: true };
  }
  const wi = info(top);
  if (!wi || !wi.linked) return null;
  const s = blank();
  s.top = wi.top;
  s.main = wi.main;
  const dir = wi.top;

  // One status for the branch, the upstream and every changed file. One that fails or times out (a huge worktree) is
  // unknown, never "clean": the last known state stays.
  const st = await exec(dir, [...(await readGuards(dir)), 'status', '--porcelain=v2', '--branch', '-z', '--untracked-files=all'], { timeout: 30_000 });
  if (!st || st.status !== 0) return strict ? null : known;
  const raw = st.out.toString('utf8').split('\0');
  const untracked = [];
  let ab = null;
  for (let i = 0; i < raw.length; ) {
    const e = raw[i++];
    if (e.startsWith('# branch.oid ')) s.localSha = e.slice(13);
    else if (e.startsWith('# branch.upstream ')) s.upstream = e.slice(18);
    else if (e.startsWith('# branch.ab ')) {
      const p = e.slice(12).split(' ');
      if (p.length === 2) ab = { a: Number(p[0].slice(1)) || 0, b: Number(p[1].slice(1)) || 0 };
    } else if (/^[12u?] /.test(e)) {
      let file = '';
      if (e.startsWith('? ')) {
        file = e.slice(2);
        untracked.push(file);
      } else {
        const n = e.startsWith('1 ') ? 8 : e.startsWith('2 ') ? 9 : 10;
        const f = e.split(' ');
        file = f.length > n ? f.slice(n).join(' ') : '';
        if (e.startsWith('2 ')) i++;
      }
      s.dirty++;
      if (s.dirtyFiles.length < 3) s.dirtyFiles.push(file);
    }
  }
  // The branch on its own (cheap): it doesn't depend on the big status.
  const sym = text(await read(dir, ['symbolic-ref', '--short', '-q', 'HEAD']));
  s.detached = !sym;
  s.branch = s.detached ? wi.branch : sym;
  if (ab) s.unpushed = ab.a;

  const wts = await worktreeList(dir);
  const mine = wts.find((w) => same(w.path, dir));
  s.locked = !!(mine && mine.locked);

  // The base and the remote: found again every minute, not at every look.
  const key = `${norm(dir)}\0${s.branch}`;
  let b = baseCache.get(key);
  if (!b || Date.now() - b.at > 60_000) {
    b = await resolveBase(dir, wi.main, s.branch);
    if (baseCache.size > 200) baseCache.clear();
    baseCache.set(key, b);
  }
  s.base = b.base;
  s.baseRev = b.baseRev;
  s.remote = b.remote ? { ...b.remote } : null;
  s.pushRemote = b.pushRemote;
  const bf = wts.find((w) => w.branch === s.base);
  s.baseFolder = bf ? bf.path : null;

  if (s.baseRev) {
    s.mergeBase = text(await read(dir, ['merge-base', s.baseRev, 'HEAD']));
    const counts = text(await read(dir, ['rev-list', '--left-right', '--count', `${s.baseRev}...HEAD`])).split(/\s+/);
    if (counts.length === 2) {
      s.behind = Number(counts[0]) || 0;
      s.ahead = Number(counts[1]) || 0;
    }
  }

  // +added −removed since the base: tracked files (committed or not) by numstat, new files by their lines (Source
  // Control's way); a new file's lines are counted once per change of its time and size.
  let files = 0;
  for (const l of lines(await read(dir, ['diff', '--numstat', '--no-ext-diff', '--no-textconv', s.mergeBase || 'HEAD']))) {
    const c = l.split('\t');
    if (c.length < 3) continue;
    files++;
    s.add += Number(c[0]) || 0;
    s.del += Number(c[1]) || 0;
  }
  for (const rel of untracked.slice(0, 200)) {
    files++;
    const full = path.join(dir, rel);
    let lst;
    try {
      lst = fs.lstatSync(full);
    } catch {
      continue;
    }
    if (!lst.isFile() || lst.size >= 1 << 20) continue;
    const hit = lineCache.get(full);
    if (hit && hit.mtime === lst.mtimeMs && hit.size === lst.size) {
      s.add += hit.lines;
      continue;
    }
    let data;
    try {
      data = fs.readFileSync(full);
    } catch {
      continue;
    }
    if (data.includes(0)) continue;
    let n = 0;
    for (let k = data.indexOf(10); k !== -1; k = data.indexOf(10, k + 1)) n++;
    if (data.length && data[data.length - 1] !== 10) n++;
    s.add += n;
    if (lineCache.size > 2000) lineCache.clear();
    lineCache.set(full, { mtime: lst.mtimeMs, size: lst.size, lines: n });
  }
  s.files = files;

  if (!s.detached) {
    if (everCache.has(key)) s.everCommitted = true;
    else if ((Number(text(await read(dir, ['rev-list', '-g', '--count', `refs/heads/${s.branch}`]))) || 0) > 1) {
      s.everCommitted = true;
      everCache.add(key);
    }
  }
  const gh = ghPath();
  if (gh) {
    s.ghInstalled = true;
    if (s.remote && (s.remote.kind === 'github' || (s.remote.kind === 'other' && s.remote.host))) {
      const a = await ghAuth(gh, s.remote.host);
      // A host gh is signed in on that isn't github.com is a GitHub Enterprise one.
      if (s.remote.kind === 'other' && a.ok) s.remote.kind = 'ghe';
      s.ghSignedIn = a.ok && (s.remote.kind === 'github' || s.remote.kind === 'ghe');
      s.ghUser = s.ghSignedIn ? a.user : null;
    }
  }
  return s;
}

/** A merged PR counts only while this branch is what was merged: checked at every look (the Mac's revalidate). */
async function revalidate(s) {
  const p = s.pr;
  if (!p || (p.state !== 'MERGED' && p.state !== 'STALE') || s.gone || s.detached) return s;
  const r = p.headSha ? await exec(s.top, ['merge-base', '--is-ancestor', 'HEAD', p.headSha]) : null;
  s.pr = { ...p, state: r && r.status === 0 ? 'MERGED' : 'STALE' };
  return s;
}

/**
 * The branch's pull request (gh pr view), only when gh is signed in on the host and the branch is on the remote:
 * { pr, ok }; ok false when it couldn't be told (offline, signed out), so the caller keeps the last answer. The Mac's
 * prStatus.
 */
async function prStatus(s) {
  const gh = ghPath();
  if (!s.ghSignedIn || !gh || !s.remote || s.detached || s.gone) return { pr: null, ok: false };
  if (s.upstream == null && !s.pr) return { pr: null, ok: true };
  const repo = `${s.remote.owner}/${s.remote.repo}`;
  const fields = 'number,url,title,state,isDraft,mergeable,mergeStateStatus,reviewDecision,latestReviews,statusCheckRollup,headRefOid,baseRefName';
  const head = s.pushRemote ? `${s.pushRemote.owner}:${s.branch}` : s.branch;
  const r = await run(gh, ['pr', 'view', head, '--repo', repo, '--json', fields], { cwd: s.top, env: await ghEnvIn(s.top, s.remote.host), timeout: 30_000 });
  if (!r) return { pr: null, ok: false };
  if (r.status !== 0) return { pr: null, ok: r.err.toString('utf8').includes('no pull requests found') };
  let obj;
  try {
    obj = JSON.parse(r.out.toString('utf8'));
  } catch {
    return { pr: null, ok: false };
  }
  const str = (v) => (typeof v === 'string' ? v : '');
  const p = {
    number: Number(obj.number) || 0, url: str(obj.url), title: str(obj.title), state: str(obj.state), draft: obj.isDraft === true,
    mergeable: str(obj.mergeable), mergeState: str(obj.mergeStateStatus), review: str(obj.reviewDecision), reviewBy: '',
    headSha: str(obj.headRefOid), base: str(obj.baseRefName), checks: { kind: 'none', passed: [], failed: [], running: [] },
  };
  for (const rev of Array.isArray(obj.latestReviews) ? obj.latestReviews : []) {
    const state = str(rev && rev.state);
    const login = rev && rev.author && str(rev.author.login);
    if ((state === 'APPROVED' || state === 'CHANGES_REQUESTED') && login) {
      p.reviewBy = login;
      if (state === 'CHANGES_REQUESTED') break;
    }
  }
  const c = p.checks;
  for (const item of Array.isArray(obj.statusCheckRollup) ? obj.statusCheckRollup : []) {
    if (!item) continue;
    const name = str(item.name) || str(item.context) || 'check';
    if (item.__typename === 'StatusContext') {
      const st = str(item.state);
      if (st === 'PENDING' || st === 'EXPECTED') c.running.push(name);
      else if (st === 'FAILURE' || st === 'ERROR') c.failed.push(name);
      else c.passed.push(name);
    } else if (str(item.status) !== 'COMPLETED') c.running.push(name);
    else if (['FAILURE', 'CANCELLED', 'TIMED_OUT', 'ACTION_REQUIRED', 'STARTUP_FAILURE', 'ERROR'].includes(str(item.conclusion))) c.failed.push(name);
    else c.passed.push(name);
  }
  c.kind = c.failed.length ? 'fail' : c.running.length ? 'run' : c.passed.length ? 'pass' : 'none';
  // A merged PR of this name counts only when this branch IS what was merged (or sits inside it).
  if (p.state === 'MERGED') {
    const inside = p.headSha ? await exec(s.top, ['merge-base', '--is-ancestor', 'HEAD', p.headSha]) : null;
    if (!(inside && inside.status === 0)) p.state = 'STALE';
  }
  return { pr: p, ok: true };
}

// ---------- what the sheets show ----------

/** The branch's commits not in the base, oldest first (at most 100): { hash, subject, body }. */
async function commits(s) {
  if (!s.baseRev) return [];
  const raw = (await read(s.top, ['log', '--reverse', '-n', '100', '--format=%h%x1f%s%x1f%b%x1e', `${s.baseRev}..HEAD`])) || '';
  const out = [];
  for (const rec of raw.split('\x1e')) {
    const f = rec.trim().split('\x1f');
    if (f.length < 2 || !f[0]) continue;
    out.push({ hash: f[0], subject: f[1], body: f.length > 2 ? f.slice(2).join('\x1f').trim() : '' });
  }
  return out;
}

// The repo's pull request template, when it has one (a plain file under 20 KB).
function template(top) {
  for (const rel of ['.github/pull_request_template.md', '.github/PULL_REQUEST_TEMPLATE.md', 'docs/pull_request_template.md',
    'docs/PULL_REQUEST_TEMPLATE.md', 'pull_request_template.md', 'PULL_REQUEST_TEMPLATE.md']) {
    const p = path.join(top, rel);
    try {
      const st = fs.lstatSync(p);
      if (!st.isFile() || st.size >= 20_000) continue;
      return fs.readFileSync(p, 'utf8').trim();
    } catch {}
  }
  return null;
}

// The branches a pull request can go into (the remote's), the base first; a note when the base isn't on the remote.
async function intoBranches(s) {
  const r = s.remote;
  if (!r) return { list: [s.base], note: null };
  const prefix = `${r.name}/`;
  let all = lines(await read(s.top, ['for-each-ref', '--format=%(refname:short)', `refs/remotes/${r.name}`]))
    .filter((x) => x !== r.name && x !== `${prefix}HEAD` && x.startsWith(prefix)).map((x) => x.slice(prefix.length));
  if (!all.length) return { list: [s.base], note: null };
  const order = ['main', 'master', 'develop'];
  const rank = (x) => (x === s.base ? -1 : order.includes(x) ? order.indexOf(x) : 99);
  all.sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0));
  let note = null;
  if (!all.includes(s.base)) {
    const def = text(await read(s.top, ['symbolic-ref', '-q', `refs/remotes/${r.name}/HEAD`])).replace(`refs/remotes/${prefix}`, '');
    const first = all.includes(def) ? def : all[0];
    all = [first, ...all.filter((x) => x !== first)];
    note = `${s.base} isn't on ${r.name} yet, so the PR goes into ${first}.`;
  }
  return { list: all, note };
}

/** A file name that looks like it holds a secret (keys, tokens, .env files that aren't examples). */
function looksSecret(p) {
  const n = leaf(p).toLowerCase();
  if (n.startsWith('.env')) return !['.example', '.sample', '.template', '.dist'].some((x) => n.endsWith(x));
  if (['.pem', '.p12', '.pfx', '.key', '.keystore', '.jks', '.ppk'].some((x) => n.endsWith(x))) return true;
  return ['secret', 'credential', 'id_rsa', 'id_ed25519', 'id_ecdsa', 'service-account', 'serviceaccount', '.npmrc', '.pypirc', '.netrc', 'token'].some((x) => n.includes(x));
}

const BIG_FILE = 50 << 20;

/** What isn't committed yet, as `add -A` would take it: path, size, and whether it looks like a secret or is too big. */
async function leftovers(dir) {
  const raw = String((await read(dir, ['status', '--porcelain=v1', '-z', '--untracked-files=all'])) || '').split('\0');
  const out = [];
  for (let i = 0; i < raw.length; ) {
    const e = raw[i++];
    if (e.length < 4) continue;
    const p = e.slice(3);
    if (e[0] === 'R' || e[0] === 'C') i++;
    if (out.length >= 200) continue;
    let size = 0;
    try {
      size = fs.lstatSync(path.join(dir, p)).size;
    } catch {}
    out.push({ path: p, size, secret: looksSecret(p), big: size > BIG_FILE });
  }
  return out;
}

/** The Create PR sheet's data. */
async function createPage(s) {
  const cs = await commits(s);
  const into = await intoBranches(s);
  let body = cs.map((c) => `- ${c.subject}`).join('\n');
  let single = false;
  if (cs.length === 1) {
    body = cs[0].body;
    single = true;
  }
  const tpl = template(s.top);
  if (tpl) body = body ? `${tpl}\n\n${body}` : tpl;
  const o = {
    commits: cs.map((c) => ({ hash: c.hash, subject: c.subject })), body, into: into.list, leftovers: await leftovers(s.top),
    singleCommit: single && cs[0].subject ? cs[0].subject : '',
    // A repo with workflows most likely runs checks on the PR: the done page says so.
    hasWorkflows: exists(path.join(s.top, '.github', 'workflows')),
  };
  if (into.note) o.intoNote = into.note;
  return o;
}

/**
 * `merge-tree` would run the merge drivers the repo's own config names (a repo from a zip can name any command): each is
 * replaced by `false` for the check. Never `true`: that means "resolved", and a conflict would look clean. The Mac's
 * mergeDriverGuards.
 */
async function mergeDriverGuards(dir) {
  const args = [];
  const r = await exec(dir, ['config', '--show-scope', '--includes', '--name-only', '--get-regexp', '^merge\\..+\\.driver$'], { timeout: 6000 });
  if (r && r.status === 0) {
    for (const l of r.out.toString('utf8').split('\n')) {
      const f = l.trim().split('\t');
      if (f.length === 2 && (f[0] === 'local' || f[0] === 'worktree')) args.push('-c', `${f[1]}=false`);
    }
  }
  return args;
}

// The files `merge-tree --name-only` says conflict (after the tree's line, until the empty line).
function conflictFiles(r) {
  const files = [];
  for (const l of r.out.toString('utf8').split('\n').slice(1)) {
    if (!l) break;
    if (!files.includes(l)) files.push(l);
  }
  return files;
}

/** The conflict check of a local merge: what the merge would conflict on, what's in the way in the base's folder (7.2). */
async function mergeCheck(s) {
  const o = { conflicts: [], blocked: [], inMiddle: false };
  if (!s.baseRev || s.detached || s.branch === s.base) {
    o.problem = 'nobase';
    return o;
  }
  // Commits only: what isn't committed yet is committed first, then this runs again.
  const r = await exec(s.top, [...(await mergeDriverGuards(s.top)), 'merge-tree', '--write-tree', '--name-only', '--no-messages', s.baseRev, s.branch], { timeout: 30_000 });
  if (!r) o.problem = "git didn't start";
  else if (r.status === 1) o.conflicts = conflictFiles(r);
  else if (r.status !== 0) o.problem = said(r);
  if (s.baseFolder && exists(s.baseFolder)) {
    const bf = s.baseFolder;
    const changed = new Set(lines(await read(bf, ['diff', '--name-only', `${s.baseRev}...${s.branch}`])));
    o.changed = changed.size;
    const theirs = [];
    const entries = String((await read(bf, ['status', '--porcelain=v1', '-z', '--untracked-files=all'])) || '').split('\0');
    for (let i = 0; i < entries.length; ) {
      const e = entries[i++];
      if (e.length < 4) continue;
      theirs.push(e.slice(3));
      if (e[0] === 'R' || e[0] === 'C') i++;
    }
    o.blocked = theirs.filter((f) => changed.has(f));
    const gitDir = text(await read(bf, ['rev-parse', '--absolute-git-dir']));
    if (gitDir) o.inMiddle = ['MERGE_HEAD', 'rebase-merge', 'rebase-apply', 'CHERRY_PICK_HEAD'].some((n) => exists(path.join(gitDir, n)));
  }
  o.newCommits = s.ahead + (s.dirty > 0 ? 1 : 0);
  o.commits = (await commits(s)).map((c) => ({ hash: c.hash, subject: c.subject }));
  return o;
}

/** The merge-PR sheet's extra: the way GitHub merges here, and for a conflict, which files (no fetch: no network). */
async function prMergePage(s) {
  const o = { method: 'merge' };
  const gh = ghPath();
  if (!s.remote || !gh || !s.pr) return o;
  const repo = `${s.remote.owner}/${s.remote.repo}`;
  const r = await run(gh, ['repo', 'view', repo, '--json', 'mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed'], { cwd: s.top, env: await ghEnvIn(s.top, s.remote.host), timeout: 20_000 });
  if (r && r.status === 0) {
    try {
      const obj = JSON.parse(r.out.toString('utf8'));
      if (obj.mergeCommitAllowed === true) o.method = 'merge';
      else if (obj.squashMergeAllowed === true) o.method = 'squash';
      else if (obj.rebaseMergeAllowed === true) o.method = 'rebase';
    } catch {}
  }
  if (s.pr.mergeable === 'CONFLICTING' && s.pr.base) {
    const t = await exec(s.top, [...(await mergeDriverGuards(s.top)), 'merge-tree', '--write-tree', '--name-only', '--no-messages', `${s.remote.name}/${s.pr.base}`, s.branch], { timeout: 30_000 });
    if (t && t.status === 1) o.conflicts = conflictFiles(t);
  }
  return o;
}

/**
 * The Delete sheet's data: is the branch's work saved somewhere else (9.1), how many commits are only here, commits only
 * a detached HEAD holds (they go with the folder), and worktrees inside this one. Read again by deleteWorktree itself.
 */
async function deletePage(s) {
  let reason = '';
  const ancestor = async (a, b) => {
    const r = await exec(s.main, ['merge-base', '--is-ancestor', a, b]);
    return !!r && r.status === 0;
  };
  if (s.detached) reason = '';
  else if (s.pr && s.pr.state === 'MERGED' && s.pr.headSha && (await ancestor(`refs/heads/${s.branch}`, s.pr.headSha))) reason = 'pr';
  else if (s.baseRev && (await ancestor(`refs/heads/${s.branch}`, s.baseRev))) reason = 'base';
  else if (s.upstream != null && s.unpushed === 0) reason = 'origin';
  const only = s.upstream == null ? s.ahead : (s.unpushed ?? s.ahead);
  let orphans = 0;
  if (s.detached && !s.gone) orphans = Number(text(await read(s.top, ['rev-list', '--count', 'HEAD', '--not', '--branches', '--remotes']))) || 0;
  const nested = (await worktreeList(s.main)).map((w) => w.path).filter((p) => !same(p, s.top) && under(p, s.top));
  return { safe: !!reason, safeReason: reason, onlyHere: s.detached ? 0 : only, orphans, orphanSha: s.localSha.slice(0, 7), nested };
}

// ---------- doing ----------

const failure = (title, txt = '', { git = '', committed = 0, pushed = false, kind = 'git' } = {}) => ({ kind, title, text: txt, git, committed, pushed });

// Commits what's left (hooks run: the user's commit, as Source Control's) with `message`. Null: done; else the failure.
async function commitAll(dir, message) {
  const add = await exec(dir, ['add', '-A'], { timeout: 60_000, locks: true });
  if (!add || add.status !== 0) return failure("Git couldn't commit the files.", 'Nothing was sent.', { git: said(add), kind: 'commit' });
  const r = await exec(dir, ['commit', '-m', message], { timeout: 120_000, locks: true });
  if (!r || r.status !== 0) return failure("Git couldn't commit the files.", 'Nothing was sent.', { git: said(r), kind: 'commit' });
  return null;
}

/**
 * Commit what's left, push the branch, then the pull request: with gh when it's signed in, else the host's form in the
 * browser (returned as `browser`; the caller opens it). `step` hears "commit", "push" and "pr" as each starts. The Mac's
 * createPR.
 */
async function createPR(top, title0, body, into0, step = () => {}) {
  let s = await worktreeStatus(top);
  if (!s || s.detached || s.branch === s.base) return failure("There's nothing to send.", "This worktree isn't on a branch of its own.", { kind: 'nothing' });
  const remote = s.remote;
  if (!remote) return failure('This repo has no remote to send it to.', '', { kind: 'nothing' });
  const title = String(title0 || '').trim();
  if (!title) return failure('Write a title first.', '', { kind: 'nothing' });
  const into = String(into0 || '') || s.base;
  let committed = 0;
  if (s.dirty > 0) {
    // `add -A` takes everything: a file this big can't be pushed (GitHub stops at 100 MB), and it would stay in the commit.
    const big = (await leftovers(s.top)).find((x) => x.big);
    if (big) return failure(`${big.path} is too big to send.`, "Files over 50 MB don't go in a pull request. Nothing was committed or sent.", { kind: 'nothing' });
    step('commit');
    committed = s.dirty;
    const fail = await commitAll(s.top, title);
    if (fail) return fail;
    s = (await worktreeStatus(top)) || s;
  }
  step('push');
  // The user's own ssh settings stay (several accounts, other keys); with no terminal and no credential window, a push
  // that needs a password fails at once instead of waiting.
  const pushName = s.pushRemote ? s.pushRemote.name : remote.name;
  const push = await exec(s.top, ['push', '-u', pushName, `HEAD:refs/heads/${s.branch}`], { timeout: 120_000, locks: true, env: await pushEnv(s.top) });
  const sentNote = committed > 0 ? `The ${committed} file${committed === 1 ? ' is' : 's are'} committed; nothing was sent.` : 'Nothing was sent.';
  if (!push || push.status !== 0) {
    const err = push ? push.err.toString('utf8') : '';
    const last = said(push);
    if (push && push.status === -1) return failure('Git took too long to push.', 'Nothing else was done.', { committed });
    if (/could not read Username|Authentication failed|terminal prompts disabled|could not read Password|Logon failed|no credential/i.test(err)) {
      return failure(`Git couldn't push ${s.branch}.`, `It needs your ${label(remote)} sign-in, and Orbiterm can't ask for it. ${sentNote} Sign in once in a terminal with gh auth login (or a git push there), then try again.`, { git: last, committed });
    }
    if (err.includes('passphrase')) {
      return failure(`Git couldn't push ${s.branch}.`, 'Your SSH key needs its passphrase. Add it to the ssh-agent once (ssh-add), then try again.', { git: last, committed });
    }
    if (err.includes('Permission denied') || err.includes('Could not read from remote repository')) {
      return failure(`Git couldn't push ${s.branch}.`, `${pushName} didn't accept the key or account git used. ${sentNote}`, { git: last, committed });
    }
    if (/non-fast-forward|fetch first|\[rejected\]/.test(err)) {
      return failure(`Git didn't push ${s.branch}.`, `${s.branch} on ${remote.name} has commits this one doesn't. Pull them in first (Source Control › Pull), then try again.`, { git: last, committed });
    }
    return failure(`Git couldn't push ${s.branch}.`, sentNote, { git: last, committed });
  }
  step('pr');
  const repo = `${remote.owner}/${remote.repo}`;
  // Pushed to a fork: the pull request names where the branch is.
  const headRef = s.pushRemote ? `${s.pushRemote.owner}:${s.branch}` : s.branch;
  const gh = ghPath();
  if (s.ghSignedIn && gh) {
    // Windows line ends from the page's text box are plain ones for GitHub.
    const data = Buffer.from(String(body || '').replace(/\r\n/g, '\n'), 'utf8');
    const r = await run(gh, ['pr', 'create', '--repo', repo, '--base', into, '--head', headRef, '--title', title, '--body-file', '-'],
      { cwd: s.top, env: await ghEnvIn(s.top, remote.host), timeout: 60_000, input: data });
    const out = r ? `${r.out.toString('utf8')}\n${r.err.toString('utf8')}` : '';
    const url = out.split(/[\s]+/).filter((w) => w.startsWith('https://') && w.includes('/pull/')).pop();
    if (url && r && (r.status === 0 || out.includes('already exists'))) return { ok: true, url, number: Number(url.split('/').pop()) || 0, pushed: true };
    if (r && r.status === -1) return failure("GitHub didn't make the PR.", `${s.branch} is on ${remote.name}. It took too long.`, { pushed: true, kind: 'gh' });
    return failure("GitHub didn't make the PR.", `${s.branch} is on ${remote.name}.`, { git: said(r), pushed: true, kind: 'gh' });
  }
  const u = browserURL(remote, headRef, into, title, String(body || '').replace(/\r\n/g, '\n'));
  if (u) return { ok: true, browser: u, pushed: true };
  return { ok: true, pushedOnly: true, pushed: true };
}

/**
 * `git merge` of the branch into the base: in the base's folder when it has one, else by moving the base's ref without
 * touching any folder. A conflict found at the last moment is undone at once. The Mac's mergeLocal.
 */
async function mergeLocal(top, message, step = () => {}) {
  let s = await worktreeStatus(top);
  if (!s || s.detached || s.branch === s.base || !s.baseRev) return failure("There's nothing to merge.", '', { kind: 'nothing' });
  let committed = 0;
  if (s.dirty > 0) {
    step('commit');
    committed = s.dirty;
    const msg = String(message || '').trim();
    if (!msg) return failure(`Write a message for the ${s.dirty} files first.`, '', { kind: 'nothing' });
    const fail = await commitAll(s.top, msg);
    if (fail) return fail;
    s = (await worktreeStatus(top)) || s;
  }
  const check = await mergeCheck(s);
  if (check.conflicts.length) return { kind: 'conflict', conflicts: check.conflicts, committed };
  if (check.blocked.length) return { kind: 'blocked', blocked: check.blocked, committed };
  if (check.inMiddle) return { kind: 'middle', committed };
  const before = s.ahead;
  step('merge');
  const branch = s.branch;
  if (s.baseFolder && exists(s.baseFolder)) {
    const bf = s.baseFolder;
    const r = await exec(bf, ['merge', '--no-edit', '--no-overwrite-ignore', '--', branch], { timeout: 120_000, locks: true });
    if (!r || r.status !== 0) {
      const mid = await exec(bf, ['rev-parse', '-q', '--verify', 'MERGE_HEAD']);
      if (mid && mid.status === 0) {
        await exec(bf, ['merge', '--abort'], { timeout: 30_000, locks: true });
        return failure(`Git stopped: ${s.base} changed while merging.`, 'Nothing was changed.', { git: said(r), committed });
      }
      return failure(`Git couldn't merge ${branch}.`, 'Nothing was changed.', { git: said(r), committed });
    }
  } else {
    if (s.baseRev !== s.base) return failure(`${s.base} isn't on this PC.`, 'Create a PR instead.', { kind: 'nothing' });
    // Moving the ref under a worktree that has the base checked out (its folder missing: a drive that isn't there) would
    // leave that worktree's files and index behind it.
    const w = (await worktreeList(s.top)).find((x) => x.branch === s.base);
    if (w) return failure(`${s.base} is checked out in a worktree whose folder isn't there.`, `${w.path} — bring the folder back, or run git worktree prune, then try again.`, { kind: 'nothing' });
    const baseSha = text(await read(s.top, ['rev-parse', '--verify', `refs/heads/${s.base}`]));
    const branchSha = text(await read(s.top, ['rev-parse', '--verify', `refs/heads/${branch}`]));
    if (!baseSha || !branchSha) return failure("Git couldn't read the branches.", 'Nothing was changed.', { committed });
    const anc = await exec(s.top, ['merge-base', '--is-ancestor', baseSha, branchSha]);
    let target = branchSha;
    if (!anc || anc.status !== 0) {
      const t = await exec(s.top, [...(await mergeDriverGuards(s.top)), 'merge-tree', '--write-tree', '--no-messages', baseSha, branchSha], { timeout: 30_000 });
      if (!t || t.status !== 0) return failure(`Git stopped: ${s.base} changed while merging.`, 'Nothing was changed.', { committed });
      const tree = text(t.out.toString('utf8').split('\n')[0]);
      const c = await exec(s.top, ['commit-tree', tree, '-p', baseSha, '-p', branchSha, '-m', `Merge branch '${branch}' into ${s.base}`], { timeout: 30_000, locks: true });
      if (!c || c.status !== 0) return failure("Git couldn't make the merge commit.", 'Nothing was changed.', { git: said(c), committed });
      target = text(c.out.toString('utf8'));
    }
    const u = await exec(s.top, ['update-ref', '-m', `orbiterm: merge ${branch}`, `refs/heads/${s.base}`, target, baseSha], { timeout: 10_000, locks: true });
    if (!u || u.status !== 0) return failure(`Git stopped: ${s.base} changed while merging.`, 'Nothing was changed.', { git: said(u), committed });
  }
  return { ok: true, base: s.base, commits: before, baseFolder: s.baseFolder || '' };
}

/** "Push develop": the base branch itself, whatever the folders are on (never a bare `git push`). The Mac's pushBase. */
async function pushBase(top) {
  const s = await worktreeStatus(top);
  if (!s || !s.remote) return failure('This repo has no remote to send it to.', '', { kind: 'nothing' });
  if (s.baseRev !== s.base) return failure(`${s.base} isn't on this PC.`, '', { kind: 'nothing' });
  const dir = s.baseFolder && exists(s.baseFolder) ? s.baseFolder : s.main;
  const hasUp = !!text(await read(dir, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', `${s.base}@{u}`]));
  const r = await exec(dir, ['push', ...(hasUp ? [] : ['-u']), s.remote.name, `refs/heads/${s.base}:refs/heads/${s.base}`], { timeout: 120_000, locks: true, env: await pushEnv(dir) });
  if (!r || r.status !== 0) return failure(`Git couldn't push ${s.base}.`, '', { git: said(r) });
  return { ok: true };
}

/** Merges the open PR on GitHub with gh, refused by GitHub when its head moved since the sheet showed it. The Mac's mergePR. */
async function mergePR(top, number, sha, method) {
  const s = await worktreeStatus(top);
  const gh = ghPath();
  if (!s || !s.remote || !gh) return failure("GitHub CLI isn't available.", '', { kind: 'nothing' });
  const repo = `${s.remote.owner}/${s.remote.repo}`;
  const flag = method === 'squash' ? '--squash' : method === 'rebase' ? '--rebase' : '--merge';
  const args = ['pr', 'merge', String(Math.trunc(Number(number) || 0)), '--repo', repo, flag];
  if (sha) args.push('--match-head-commit', sha);
  const r = await run(gh, args, { cwd: s.top, env: await ghEnvIn(s.top, s.remote.host), timeout: 60_000 });
  const out = r ? `${r.out.toString('utf8')}\n${r.err.toString('utf8')}` : '';
  if (!r || r.status !== 0) {
    if (/head branch was modified|match-head-commit/i.test(out)) return failure(`${s.branch} changed since this was opened.`, 'Look again, then merge.', { git: said(r), kind: 'gh' });
    return failure("GitHub didn't merge the PR.", '', { git: said(r), kind: 'gh' });
  }
  return { ok: true, queued: /merge queue|will be automatically merged|auto-merge/.test(out) };
}

/**
 * What stops a delete (null: nothing): looked at before any chat ends, and again before anything is moved. A fresh look
 * is needed: with an old state a commit made since could go with the branch. The Mac's deleteCheck.
 */
async function deleteCheck(top, { deleteBranch, force, expect, known }) {
  const s = await worktreeStatus(top, known, true);
  if (!s) return failure("Git couldn't read this worktree right now.", 'Nothing was deleted. Try again in a moment.', { kind: 'nothing' });
  s.pr = known ? known.pr : null;
  if (expect && s.localSha !== expect) return failure(`${s.branch} changed since this was opened.`, 'Look again, then decide. Nothing was deleted.', { kind: 'changed' });
  const page = await deletePage(s);
  if (page.nested.length) return failure('Another worktree is inside this one.', `${page.nested[0]} — delete or move it first. Nothing was deleted.`, { kind: 'nested' });
  if (page.orphans > 0) {
    const n = page.orphans;
    return failure(`${n} commit${n === 1 ? ' is' : 's are'} only on a detached HEAD.`, `Deleting the worktree loses ${n === 1 ? 'it' : 'them'} for good. Save ${n === 1 ? 'it' : 'them'} first: git branch <name> ${page.orphanSha || 'HEAD'}.`, { kind: 'changed' });
  }
  if (deleteBranch && !s.detached && !page.safe && !force) return failure(`${s.branch} has commits that aren't saved anywhere else.`, 'Look again, then decide. Nothing was deleted.', { kind: 'changed' });
  if (s.locked) return failure(`Git has ${s.branch} locked.`, `Unlock it first: git worktree unlock ${top}`, { kind: 'locked' });
  return null;
}

// The no-hooks folder for the two git runs of a delete (worktree remove, branch -D): one only this user can write to and
// that never holds anything, so the repo's reference-transaction hook (or any) isn't run. The Mac passes /dev/null.
const NO_HOOKS = path.join(os.tmpdir(), 'orbiterm-no-hooks-here');

/** The git side, with the one thing it needs from Electron: `trash`, shell.trashItem. */
function createGitShip({ trash }) {
  /**
   * The folder to the Recycle Bin, its record out of git, and the branch when asked (the caller ended the chats). The
   * first failure stops it, saying what is left. shell.trashItem never deletes for good: an item the Recycle Bin can't
   * take (a network drive, a folder too big for it) makes it fail. The Mac's deleteWorktree.
   */
  async function deleteWorktree(top, { deleteBranch, force, expect, known }, step = () => {}) {
    const stop = await deleteCheck(top, { deleteBranch, force, expect, known });
    if (stop) return stop;
    const s = await worktreeStatus(top, known, true);
    if (!s) return failure("Git couldn't read this worktree right now.", 'Nothing was deleted. Try again in a moment.', { kind: 'nothing' });
    const safe = ['-c', `core.hooksPath=${NO_HOOKS}`];
    let sha = '';
    if (!s.detached) sha = text(await read(s.main, ['rev-parse', '--short', `refs/heads/${s.branch}`]));
    step('trash');
    if (exists(top)) {
      // A network share has no Recycle Bin: never sent there (it would only fail), never deleted for good.
      if (/^[\\/]{2}/.test(top)) return failure("This folder's disk has no Recycle Bin.", 'Delete the folder yourself, then try again.', { kind: 'trash' });
      try {
        await trash(top);
      } catch (e) {
        const msg = String((e && e.message) || e);
        if (/abort/i.test(msg)) return failure("The folder can't go to the Recycle Bin.", "Its disk has none, or it's too big for it. Delete the folder yourself, then try again.", { kind: 'trash' });
        // Windows locks a file a program has open: a dev server holding node_modules, an editor.
        if (exists(top)) return failure(`A program is still using files in ${leaf(top)} (a dev server?).`, 'Close it, then try again. Nothing was deleted.', { git: msg, kind: 'trash' });
        return failure("The folder couldn't go to the Recycle Bin.", 'Nothing was deleted.', { git: msg, kind: 'trash' });
      }
      // Some of it may be left (a file locked half way): its record stays, and the user is told.
      if (exists(top)) return failure(`A program is still using files in ${leaf(top)} (a dev server?).`, 'What could go is in the Recycle Bin. Close it, then try again.', { kind: 'trash' });
    }
    // The folder is gone: git only forgets its record (never `prune`: another worktree on a drive that isn't there keeps
    // its own).
    const rm = await exec(s.main, [...safe, 'worktree', 'remove', '--', top], { timeout: 60_000, locks: true });
    if (!rm || rm.status !== 0) {
      // Its record may already be gone (another git did it): fine, as long as the folder isn't registered any more.
      if ((await worktreeList(s.main)).some((w) => same(w.path, top))) return failure("Git couldn't forget the worktree.", 'The folder is in the Recycle Bin.', { git: said(rm), kind: 'remove' });
    }
    let kept = !deleteBranch;
    let was = sha;
    if (deleteBranch && !s.detached) {
      step('branch');
      const r = await exec(s.main, [...safe, 'branch', '-D', '--', s.branch], { timeout: 30_000, locks: true });
      if (r && r.status === 0) {
        const m = /was ([0-9a-f]+)/.exec(r.out.toString('utf8'));
        if (m) was = m[1];
      } else {
        forget();
        return { ok: true, branch: s.branch, sha, branchKept: true, branchError: said(r) };
      }
      kept = false;
    }
    forget();
    return { ok: true, branch: s.branch, sha: was, branchKept: kept };
  }

  return {
    info, forget, forgetShip, repoName, real, realUp, same, under, worktreeStatus, revalidate, prStatus, phase, statusJSON,
    createPage, mergeCheck, prMergePage, deletePage, createPR, mergeLocal, pushBase, mergePR, deleteCheck, deleteWorktree,
  };
}

module.exports = { createGitShip, parseRemote, browserURL, looksSecret, phase, info, same, under, norm, realUp, ghEnv };
