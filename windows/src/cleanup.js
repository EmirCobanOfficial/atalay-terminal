'use strict';
// Clean Up (araştırma/cleanup/SPEC.md; the page is the shared web/cleanup.js), the Mac's Cleanup.swift and MemoryWatch.swift:
// what slows the PC down, listed with what it would give back, and ended on one click after a summary that names every
// item. Chats (an AI the user left alone in one of the app's terminals) and programs (what a chat or a terminal started:
// test runs, dev servers, headless browsers, a closed terminal's leftovers, a runaway). The PC's memory (the picture, the
// calm line on the map) and each card's `mem` (its whole terminal's tree) come from the same round.
//
// Nothing here starts by itself. The page lists and ticks; the user's click on the summary's Clean Up is the only thing
// that makes `run` do anything. Only the processes of this app's own terminals (the session host's, this build's), and
// the leftovers and runaways Runaways finds that were seen in one of them, are ever listed or ended, each by pid and
// creation time (runaways.stopTree), never the app, its session host, an AI's own process or one of Windows' own.
// Worktrees aren't listed on Windows yet (no worktree Trash there, the Mac's WorktreeShip): their group stays away.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { aiTool } = require('./runaways');

const GiB = 2 ** 30, MiB = 2 ** 20, H = 3600e3;
const SHELL_NAMES = /^(pwsh|powershell|cmd|bash|sh|zsh|fish|nu)$/i;
// The app's session host, and Windows' own processes: never part of what Clean Up ends, whatever tree they're in.
const HOST_RE = /^atalay-terminal-host/i;
const SYSTEM_RE = /^(system|idle|registry|smss|csrss|wininit|winlogon|services|lsass|lsaiso|svchost|dwm|explorer|sihost|fontdrvhost|ctfmon|taskhostw|runtimebroker|searchhost|searchindexer|startmenuexperiencehost|shellexperiencehost|textinputhost|dllhost|audiodg|spoolsv|msmpeng|securityhealthsystray|smartscreen|orbiterm)$/i;

/** A Windows command line's words, double quotes kept together (runaways.js's aiTool reads them the same way). */
function words(cmd) {
  return [...String(cmd || '').matchAll(/"([^"]*)"|(\S+)/g)].map((m) => m[1] ?? m[2]);
}
const baseOf = (p) => String(p || '').replace(/[\\/]+$/, '').split(/[\\/]/).pop() || String(p || '');

// PowerShell's switches that run something (not a shell waiting for the user), and the ones that take a value.
const PS_RUN = new Set(['-c', '-command', '-encodedcommand', '-ec', '-e', '-file', '-f', '-cwa', '-commandwithargs']);
const PS_VALUED = new Set(['-executionpolicy', '-ep', '-ex', '-workingdirectory', '-wd', '-version', '-v', '-configurationname', '-config',
  '-windowstyle', '-w', '-outputformat', '-o', '-of', '-inputformat', '-if', '-settingsfile', '-custompipename', '-psconsolefile']);

/**
 * A shell that waits for the user, one typed inside a terminal (the Mac's Cleanup.isInteractiveShell): `pwsh -NoLogo`,
 * `cmd`, `cmd /k`, `bash -l`. A `cmd /c …`, `pwsh -Command …` or `bash -c …` is a command's wrapper and `bash ./dev.sh`
 * runs a script: both are programs' roots. `-NoExit` (the app's own chat shells) stays at the prompt after its command.
 */
function isInteractiveShell(p) {
  const name = String((p && p.name) || '').toLowerCase();
  if (!SHELL_NAMES.test(name)) return false;
  const rest = words(p.cmd).slice(1).map((w) => w.toLowerCase());
  if (name === 'cmd') return rest.includes('/k') || !rest.some((w) => w === '/c' || w === '/r');
  if (name === 'pwsh' || name === 'powershell') {
    if (rest.includes('-noexit')) return true;
    for (let i = 0; i < rest.length; i++) {
      if (PS_VALUED.has(rest[i])) {
        i++;
        continue;
      }
      if (!rest[i].startsWith('-') || PS_RUN.has(rest[i])) return false;
    }
    return true;
  }
  return !rest.some((w) => w === '-c' || (w.startsWith('-') && !w.startsWith('--') && w.includes('c'))) && rest.every((w) => w.startsWith('-'));
}

// Claude Code's folder (CLAUDE_CONFIG_DIR, else ~/.claude), where it keeps sessions\<pid>.json for each of its running
// processes (the engine's registry), and its npm package: an npm install runs as node on the package's cli.js.
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const CLAUDE_PACKAGE = /[\\/]@anthropic-ai[\\/]claude-code[\\/]/i;

/**
 * Claude Code's own process (the Mac's Proc.isClaude): claude.exe, node running the npm package (`node …\@anthropic-ai\
 * claude-code\cli.js`, which the engine drops from its live list when it isn't interactive), or any process Claude keeps
 * a sessions\<pid>.json for. Never a program: Clean Up would have listed an npm Claude as "cli.js" and stopped it.
 */
function isClaude(p) {
  if (!p) return false;
  if (/^claude$/i.test(p.name) || CLAUDE_PACKAGE.test(String(p.cmd || ''))) return true;
  return Number.isInteger(p.pid) && p.pid > 0 && fs.existsSync(path.join(CLAUDE_DIR, 'sessions', `${p.pid}.json`));
}

/** Claude or another AI tool's own process (runaways.js's aiTool, the Mac's Cleanup.isAIProcess). */
const isAIProcess = (p) => !!p && (isClaude(p) || !!aiTool(p));

// node running a package manager is only a wrapper: the program is what it runs.
const NODE_WRAPPERS = /^(npm-cli|npx-cli|pnpm|pnpx|yarn|yarnpkg|corepack|bun)(\.c?js|\.mjs)?$/i;
const WRAPPERS = new Set(['cmd', 'pwsh', 'powershell', 'bash', 'sh', 'zsh', 'fish', 'env', 'npm', 'npx', 'pnpm', 'yarn', 'bun', 'conhost']);
const NODE_VALUED = new Set(['--eval', '--print', '--require', '--import', '--loader', '--experimental-loader', '--env-file', '--conditions', '-c', '--title']);

/**
 * What a process tree is (SPEC 3.5, the Mac's Cleanup.describe), by the first rule that holds, matched on the command
 * lines (paths with / here) of its processes, root first: [{ name, cmd }] -> { name, kind, watching, compose }.
 * A node script is named by its file, never by inline code or a preloaded module (which can hold a token).
 */
function describe(procs) {
  procs = procs.slice(0, 60);
  const lines = procs.map((p) => `${p.cmd || ''} ${p.name || ''}`.replace(/\\/g, '/').toLowerCase());
  const tokens = procs.map((p) => words(String(p.cmd || '').replace(/\\/g, '/')).map((w) => w.toLowerCase()));
  const names = procs.map((p) => String(p.name || '').toLowerCase());
  const tokenBase = (w) => baseOf(w).replace(/\.(exe|cmd|bat|ps1)$/i, '');
  const any = (f) => lines.some(f);
  const count = (s) => lines.filter((l) => l.includes(s)).length;
  const hasToken = (i, set) => tokens[i].some((t) => set.has(t));
  const d = { name: '', kind: 'gear', watching: false, compose: false };

  if (names.some((n) => n.startsWith('next-server')) || any((l) => l.includes('next-server (v'))
    || lines.some((l, i) => l.includes('next/dist/bin/next') && hasToken(i, new Set(['dev'])))
    || any((l) => l.includes('next-render-worker'))) {
    return { ...d, name: 'Next.js dev server', kind: 'server' };
  }
  if (any((l) => l.includes('vitest'))) {
    const workers = count('vitest/dist/workers/forks.js');
    let name = 'Vitest';
    if (workers > 1) name += `, ${workers} workers`;
    const running = lines.some((l, i) => l.includes('vitest') && hasToken(i, new Set(['run', '--run'])));
    return { ...d, name: running ? name : `${name}, watching`, kind: 'test', watching: !running };
  }
  if (any((l) => l.includes('jest-worker/build/workers/processchild.js') || /(^|[/ ])jest([ .]|$)/.test(l))) {
    const workers = count('jest-worker/build/workers/processchild.js');
    let name = 'Jest';
    if (workers > 1) name += `, ${workers} workers`;
    const watching = lines.some((l, i) => hasToken(i, new Set(['--watch', '--watchall'])));
    return { ...d, name: watching ? `${name}, watching` : name, kind: 'test', watching };
  }
  if (procs.some((p, i) => tokens[i].some((t) => tokenBase(t) === 'vite') || lines[i].includes('/vite/bin/vite.js'))) {
    return { ...d, name: 'Vite dev server', kind: 'server' };
  }
  if (any((l) => l.includes('webpack serve') || l.includes('webpack-dev-server')) || lines.some((l, i) => l.includes('webpack') && hasToken(i, new Set(['serve'])))) {
    return { ...d, name: 'webpack dev server', kind: 'server' };
  }
  if (any((l) => l.includes('storybook'))) return { ...d, name: 'Storybook', kind: 'server' };
  if (any((l) => l.includes('chrome-headless-shell') || l.includes('google chrome for testing') || l.includes('ms-playwright/'))) {
    return { ...d, name: 'Headless Chrome (Playwright)', kind: 'browser' };
  }
  if (any((l) => l.includes('.cache/puppeteer/'))) return { ...d, name: 'Headless Chrome (Puppeteer)', kind: 'browser' };
  if (lines.some((l, i) => l.includes('tsc') && hasToken(i, new Set(['--watch', '-w'])) && tokens[i].some((t) => tokenBase(t) === 'tsc'))) {
    return { ...d, name: 'tsc --watch' };
  }
  if (lines.some((l) => l.includes('docker') && (l.includes('compose up') || l.includes('docker-compose up')))) {
    return { ...d, name: 'docker compose', compose: true };
  }
  const servers = [['uvicorn', 'Uvicorn'], ['flask run', 'Flask'], ['manage.py runserver', 'Django'], ['rails s', 'Rails'], ['php artisan serve', 'Laravel']];
  for (const [needle, label] of servers) if (any((l) => l.includes(needle))) return { ...d, name: `${label} server`, kind: 'server' };
  // Otherwise the first process that isn't only a wrapper: a node script by its file name, else the program.
  for (let i = 0; i < procs.length; i++) {
    const n = names[i];
    if (!n || WRAPPERS.has(n)) continue;
    if (n === 'node') {
      let skip = false, script = null;
      for (const a of words(procs[i].cmd).slice(1)) {
        if (skip) {
          skip = false;
          continue;
        }
        // -e, -p, -pe, -r (a cluster ending in one of them) and the long switches that take a value.
        if (NODE_VALUED.has(a) || (a.startsWith('-') && !a.startsWith('--') && a.length > 1 && 'epr'.includes(a[a.length - 1]))) {
          skip = true;
          continue;
        }
        if (a.startsWith('-')) continue;
        script = a;
        break;
      }
      if (script && NODE_WRAPPERS.test(baseOf(script))) continue;
      return { ...d, name: script ? baseOf(script) : 'node' };
    }
    return { ...d, name: procs[i].name };
  }
  return { ...d, name: procs[0] && procs[0].name ? procs[0].name : 'A program' };
}

/**
 * The PC's memory in Clean Up's words (SPEC 20; the Mac's MemoryWatch.State): `raw` is runaways.memory().
 * - on the disk ("swap"): the commit charge past physical memory, what the page file has to hold;
 * - level: 4 (almost out) at a load of 95% or a commit charge at 95% of its limit, 2 when Windows signals low memory, else 1;
 * - pressure: out at 4, low at 2 or with the disk past the threshold, else fine.
 * `appc`: what isn't the kernel's, the most the apps' own memory can be (the picture's scale, as the Mac's app + compressed).
 */
function memState(raw, swapGB) {
  if (!raw || !(raw.total > 0)) return null;
  const used = Math.max(0, raw.total - raw.avail);
  const swap = Math.max(0, raw.commit - raw.phys);
  let level = raw.low ? 2 : 1;
  if (raw.load >= 95 || (raw.limit > 0 && raw.commit >= 0.95 * raw.limit)) level = 4;
  const pressure = level >= 4 ? 'out' : level >= 2 || swap >= swapGB * GiB ? 'low' : 'fine';
  return { ram: raw.total, used, free: Math.max(0, raw.avail), swap, level, pressure, appc: Math.max(0, used - (raw.kernel || 0)) };
}

/**
 * The map's line (SPEC 4.2, the Mac's MemoryWatch.decide), from counts only: tight for two minutes (or almost out for ten
 * seconds) and what Clean Up would tick by itself holds enough memory; it goes after five calm minutes, or when little
 * is left to give. `s` keeps the timers and `shown` between rounds; `t` in seconds.
 */
function decideStrip(s, { state, reclaim, suggest, swapGB, blocked, t }) {
  if (!suggest || !state) {
    s.shown = false;
    return s.shown;
  }
  const thr = swapGB * GiB;
  const tight = state.level >= 2 || state.swap >= thr;
  s.tightSince = tight ? s.tightSince ?? t : null;
  s.outSince = state.level >= 4 ? s.outSince ?? t : null;
  s.fineSince = state.level === 1 && state.swap < thr ? s.fineSince ?? t : null;
  if (s.shown) {
    if ((s.fineSince != null && t - s.fineSince >= 300) || reclaim < 512 * MiB) s.shown = false;
    return s.shown;
  }
  if (blocked) return false;
  if (s.outSince != null && t - s.outSince >= 10 && reclaim >= 512 * MiB) s.shown = true;
  else if (s.tightSince != null && t - s.tightSince >= 120 && reclaim >= GiB) s.shown = true;
  return s.shown;
}

/** Hidden with × earlier (`d` = { swap, level, at }): it comes back when the PC is almost out, the disk holds 2 GB more, or six hours passed. */
function dismissedStill(d, state, now) {
  if (!d || typeof d !== 'object' || !state) return false;
  if (state.level >= 4 && Number(d.level) < 4) return false;
  if (state.swap >= Number(d.swap) + 2 * GiB) return false;
  if (now - Number(d.at) >= 6 * H) return false;
  return true;
}

/** The repo a folder is in and whether it's a linked worktree, by its `.git` (no git process): { main, branch, linked }. */
function worktreeOf(cwd) {
  if (!cwd || !path.isAbsolute(cwd)) return null;
  const home = os.homedir().toLowerCase();
  let dir = path.resolve(cwd);
  while (dir.toLowerCase() !== home && path.dirname(dir) !== dir) {
    const git = path.join(dir, '.git');
    let st = null;
    try {
      st = fs.statSync(git);
    } catch {}
    if (st) {
      if (st.isDirectory()) return { main: dir, linked: false, branch: '' };
      try {
        const m = /gitdir:\s*(.+)/.exec(fs.readFileSync(git, 'utf8'));
        const gitdir = m ? m[1].trim() : '';
        const w = gitdir.replace(/\\/g, '/').toLowerCase().indexOf('/.git/worktrees/');
        if (w < 0) return { main: dir, linked: false, branch: '' };
        const head = /ref:\s*refs\/heads\/(.+)/.exec(fs.readFileSync(path.join(gitdir, 'HEAD'), 'utf8'));
        return { main: path.normalize(gitdir.slice(0, w)), linked: true, branch: head ? head[1].trim() : baseOf(dir) };
      } catch {
        return { main: dir, linked: false, branch: '' };
      }
    }
    dir = path.dirname(dir);
  }
  return null;
}

/** "Using a full CPU core for 17 hours" (the Mac's Cleanup.burning). */
function burning(cpuTime, cpu) {
  const dur = (s) => {
    const h = s / 3600;
    if (h >= 48) return `${Math.round(h / 24)} days`;
    if (h >= 24) return 'a day';
    if (h >= 2) return `${Math.round(h)} hours`;
    if (h >= 1) return 'an hour';
    return `${Math.max(1, Math.round(s / 60))} minutes`;
  };
  return cpuTime >= 3600 ? `Using a full CPU core for ${dur(cpuTime)}` : `Using ${Math.round(cpu)}% of a CPU core`;
}

/** The time with the PC's offset, as the Mac's ISO8601DateFormatter writes the log's: 2026-11-21T22:14:03+03:00. */
function stamp(d = new Date()) {
  const p = (n) => String(Math.trunc(Math.abs(n))).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${off >= 0 ? '+' : '-'}${p(off / 60)}:${p(off % 60)}`;
}
const gib = (b) => `${(b / GiB).toFixed(2)}GiB`;

/**
 * `runaways`: the process list (runaways.js); `engine`: the live chats; `terminals`: the app's terminals (their shells are
 * the sessions' roots); `chatWindow(id)`: a terminal's window; `endTerminal(id)`: its End (the host hangs the session up,
 * the window goes; resolves false when the user kept it, its env view's changes not saved); `isEnding(pid)`: a process
 * of a terminal being ended; `ownPids()`: the app's own processes; `titleOf(live)`: a chat's title as the chats list
 * shows it; `streamer`: made-up names; `settings`; `push(name, json)`: to the dashboard's page (window.__radar[name]); `publishTrees(map)`: the cards' memory (the engine reads it); `shell`
 * and `logDir` for the log; `taskManager()` opens Task Manager.
 */
function createCleanup({ runaways, engine, terminals, chatWindow, endTerminal, isEnding, ownPids, titleOf, streamer, settings, push, publishTrees, shell, logDir, taskManager }) {
  // settings (Settings > General > memory)
  const suggest = () => settings.get('cleanupSuggest') !== false;
  const swapGB = () => ([2, 4, 8].includes(settings.get('cleanupSwapGB')) ? settings.get('cleanupSwapGB') : 4);
  const idleHours = () => ([1, 12, 24, 72].includes(settings.get('cleanupIdleHours')) ? settings.get('cleanupIdleHours') : 12);

  let viewOpen = false;
  let state = null; // memState of the latest round
  let roots = []; // this round's sessions: { id, pid, started, cwd, members, bytes, external }
  let owner = new Map(); // pid -> index of the root it runs in (the app's terminals only)
  let chats = []; // { sid, pid, started, root, tab, status, bytes, pre, ai, aiName, title, json }
  let progs = []; // { id, pid, started, bytes, pre, chat, loose, json }
  let seenProgs = new Map(); // programs listed since the view opened: one that dipped under the line is still the one ticked
  let othersTop = [], othersTotal = 0, orb = 0, reclaimable = 0;
  let lastJSON = '', lastMemJSON = '';
  const ours = new Map(); // pid -> creation time: seen in one of the app's terminals (its leftovers are Orbiterm's)
  const cpuSeen = new Map(); // program id -> { cpu, at, pct, active, first }
  const typed = new Map(); // terminal id -> when the user last typed or pasted in it
  const strip = { shown: false, tightSince: null, outSince: null, fineSince: null };
  let running = false, halted = false, quitting = false;

  const mem = (tbl, pid) => Math.max(0, (tbl.get(pid) || {}).mem || 0);
  // A process and everything under it, root first (as the latest reading links them).
  function subtree(pid) {
    const out = [pid];
    for (let i = 0; i < out.length && out.length < 400; i++) out.push(...runaways.kidsOf(out[i]));
    return out;
  }
  // A process's parents, nearest first, as far as the reading links them (never through one gone or reused).
  const parents = (pid) => runaways.parents(pid);
  const aiName = (live, p) => (live && live.ai ? live.name : isClaude(p) || (live && !live.ai) ? 'Claude' : aiTool(p || {}) || 'AI');
  const aiKey = (live) => (!live.ai ? 'claude' : { Codex: 'codex', Antigravity: 'agy', Cursor: 'cursor' }[live.name] || null);

  // CPU of a subtree, the way Runaways measures it (CPU time's change over the wall clock): busy now, and since when
  // it was last busy (the Mac's Cleanup.cpuState).
  function cpuState(key, sub, tbl, now) {
    const ms = sub.reduce((a, pid) => a + ((tbl.get(pid) || {}).cpu || 0), 0);
    const prev = cpuSeen.get(key);
    const s = prev ? { ...prev } : { cpu: ms, at: now, pct: 0, active: 0, first: now };
    let pct = 0;
    if (prev && now > prev.at && ms >= prev.cpu) pct = ((ms - prev.cpu) / (now - prev.at)) * 100;
    const recent = Math.max(pct, s.pct);
    if (pct >= 5) s.active = now;
    s.cpu = ms;
    s.at = now;
    s.pct = pct;
    cpuSeen.set(key, s);
    return { pct, recent, quietSince: s.active > 0 ? s.active : s.first };
  }

  /** The app name a process counts under in "Other apps" (the Mac's appName: the outermost .app there). */
  function appName(p, own) {
    if (own.has(p.pid) || HOST_RE.test(p.name)) return 'Orbiterm';
    return runaways.product(p.name) || p.name;
  }

  /** One round (after each reading of the process list): the sessions' trees, what the cards show, the chats and programs
   *  Clean Up would list, how much of it would be ticked by itself, and the map's line. */
  function round() {
    const tbl = runaways.table();
    if (!tbl.size) return;
    const now = Date.now();
    state = memState(runaways.memory(), swapGB());
    const live = engine.live();
    const liveByPid = new Map(live.filter((s) => s.pid).map((s) => [s.pid, s]));
    const aiSet = new Set(liveByPid.keys());
    const isAI = (pid) => aiSet.has(pid) || isAIProcess(tbl.get(pid));
    const bytesOf = (list) => list.reduce((a, pid) => a + mem(tbl, pid), 0);

    // The app's own processes: never part of a terminal's programs, and a chat whose terminal holds one is never ended.
    const self = new Set(ownPids());
    // The app's own terminals: each shell is a root; what runs under it is this build's (the Mac's Detached.sessionRoots).
    // A shell is taken only as the session host's child, or the app's own (a terminal running in the app: node-pty's
    // ConPTY starts it from the app's main process): a pid the list still holds after its shell ended, and Windows gave to
    // another process meanwhile, is never a root.
    const next = [], own = new Map();
    for (const t of terminals.list()) {
      const p = t.pid && tbl.get(t.pid);
      const parent = p && !p.orphan && tbl.get(p.ppid);
      if (!parent || !(HOST_RE.test(parent.name) || self.has(parent.pid))) continue;
      const members = subtree(t.pid);
      for (const m of members) {
        own.set(m, next.length);
        ours.set(m, tbl.get(m).started);
      }
      next.push({ id: t.id, pid: t.pid, started: p.started, cwd: t.cwd, members, bytes: bytesOf(members) });
    }
    for (const [pid, started] of ours) if ((tbl.get(pid) || {}).started !== started) ours.delete(pid);
    for (const id of [...typed.keys()]) if (!next.some((r) => r.id === id)) typed.delete(id);
    const owned = next.length;
    // An AI that runs outside (Windows Terminal, VS Code): its own tree, for its card, never listed.
    for (const pid of aiSet) {
      if (own.has(pid) || !tbl.get(pid)) continue;
      const members = subtree(pid);
      next.push({ pid, started: tbl.get(pid).started, members, bytes: bytesOf(members), external: true });
    }
    roots = next;
    owner = own;

    // Leftovers and runaways: not in any terminal now, but seen in one of the app's (a closed terminal's), never one of
    // another app's or another build's, nor an AI (an npm Claude whose terminal closed is node to Runaways).
    const left = runaways.left().filter((l) => !isEnding(l.pid));
    let found = [];
    try {
      found = JSON.parse(runaways.json());
    } catch {}
    const loose = [], looseSet = new Set();
    for (const pid of new Set([...left.map((l) => l.pid), ...found.map((f) => f.pid)])) {
      const p = tbl.get(pid);
      if (!p || own.has(pid) || ours.get(pid) !== p.started || isEnding(pid) || isAIProcess(p)) continue;
      const sub = subtree(pid);
      for (const m of sub) looseSet.add(m);
      loose.push({ pid, sub, bytes: bytesOf(sub) });
    }

    // Other apps: the rest of the user's processes, by the app they belong to.
    const groups = new Map();
    let oth = 0;
    for (const p of tbl.values()) {
      if (own.has(p.pid) || looseSet.has(p.pid) || !(p.mem > 0)) continue;
      oth += p.mem;
      const name = appName(p, self);
      groups.set(name, (groups.get(name) || 0) + p.mem);
    }
    othersTop = [...groups].sort((a, b) => b[1] - a[1]).slice(0, 3);
    othersTotal = oth;
    orb = next.slice(0, owned).reduce((a, r) => a + r.bytes, 0) + loose.reduce((a, l) => a + l.bytes, 0);

    // The programs: what an AI or a shell started that is heavy or listens on a port.
    const jobs = [];
    next.forEach((r, idx) => {
      const ai = r.members.filter(isAI);
      const bases = [...ai];
      if (!r.external) {
        if (!ai.includes(r.pid)) bases.push(r.pid);
        for (const m of r.members) if (m !== r.pid && !ai.includes(m) && isInteractiveShell(tbl.get(m))) bases.push(m);
      }
      // An AI's launchers (`cmd /c claude`, Codex's node script) are the chat's, not a program.
      const skip = new Set(bases);
      for (const a of ai) for (const up of parents(a)) skip.add(up);
      const seen = new Set();
      for (const b of bases) {
        for (const c of runaways.kidsOf(b)) {
          if (skip.has(c) || seen.has(c)) continue;
          seen.add(c);
          const ci = tbl.get(c);
          if (!ci) continue;
          const sub = subtree(c);
          // Orbiterm itself (`npm start` typed in one of its terminals) is never a program to stop.
          if (sub.some((pid) => self.has(pid))) continue;
          const bytes = bytesOf(sub);
          const ports = [...new Set(sub.flatMap((pid) => runaways.ports(pid)))].sort((x, y) => x - y);
          if (bytes >= 300 * MiB || ports.length) jobs.push({ root: idx, base: b, pid: c, started: ci.started, sub, bytes, ports });
        }
      }
    });
    const procsOf = (sub) => sub.map((pid) => tbl.get(pid)).filter(Boolean);

    // What each card shows (the whole terminal's tree, its heaviest parts), for the engine.
    const named = new Map();
    for (const j of jobs) {
      if (j.bytes < 300 * MiB) continue;
      if (!named.has(j.root)) named.set(j.root, []);
      named.get(j.root).push([describe(procsOf(j.sub)).name, j.bytes]);
    }
    const trees = new Map();
    next.forEach((r, idx) => {
      for (const a of r.members) {
        if (!aiSet.has(a)) continue;
        const parts = [...(named.get(idx) || []), [aiName(liveByPid.get(a), tbl.get(a)), mem(tbl, a)]].sort((x, y) => y[1] - x[1]);
        trees.set(a, { bytes: r.bytes, top: parts.slice(0, 3) });
      }
    });
    publishTrees(trees);

    // The chats: Claude, Codex, Antigravity and Cursor in the app's terminals (one an AI started is part of its chat).
    const idleMs = idleHours() * H;
    const mine = live.filter((s) => s.pid && own.has(s.pid) && aiKey(s) && !parents(s.pid).some((up) => aiSet.has(up)));
    const perRoot = new Map();
    for (const s of mine) perRoot.set(own.get(s.pid), (perRoot.get(own.get(s.pid)) || 0) + 1);
    const rows = [];
    for (const s of mine) {
      const idx = own.get(s.pid), r = next[idx], p = tbl.get(s.pid);
      const status = s.status === 'busy' || s.status === 'waiting' ? s.status : 'idle';
      const bytes = perRoot.get(idx) === 1 ? r.bytes : bytesOf(subtree(s.pid));
      const idle = status === 'idle' ? Math.max(0, now - Math.max(s.statusSince || 0, typed.get(r.id) || 0)) : 0;
      // Ending a chat ends its whole terminal (the window's End): never one that holds another chat, nor one Orbiterm
      // itself was started from (`npm start` in a chat's shell: the app is in that terminal's tree and would end with it).
      const blocker = perRoot.get(idx) > 1 ? 'Another chat runs in its terminal'
        : r.members.some((m) => self.has(m)) ? 'Orbiterm itself runs in its terminal' : null;
      const win = chatWindow(r.id);
      const inFront = !!(win && !win.isDestroyed() && win.isFocused());
      const pre = status === 'idle' && idle >= idleMs && !inFront && !blocker;
      const name = aiName(s, p);
      const kids = [...(named.get(idx) || []), [name, mem(tbl, s.pid)]].sort((x, y) => y[1] - x[1]).slice(0, 3);
      const wt = worktreeOf(s.cwd);
      const title = titleOf(s) || baseOf(s.cwd);
      const json = {
        id: s.sessionId, ai: name, aiKey: aiKey(s), title, folder: baseOf((wt && wt.main) || s.cwd), status, idleMs: idle, mem: bytes, kids, pre,
      };
      if (wt && wt.linked) json.wt = wt.branch;
      if (blocker) json.blocker = blocker;
      if (streamer.on) {
        json.title = streamer.fake('title', title);
        json.folder = streamer.project((wt && wt.main) || s.cwd);
        if (json.wt) json.wt = streamer.fake('branch', json.wt);
      }
      rows.push({ sid: s.sessionId, pid: s.pid, started: p.started, root: idx, tab: r.id, status, bytes, pre, ai: aiKey(s), aiName: name, title, json });
    }
    rows.sort((a, b) => (a.status === 'idle') !== (b.status === 'idle') ? (a.status === 'idle' ? -1 : 1) : b.bytes - a.bytes);
    chats = rows;
    const chatOfPid = new Map(rows.map((c) => [c.pid, c]));

    // The programs' rows.
    const out = [], want = [];
    for (const j of jobs) {
      const r = next[j.root];
      if (r.external) continue;
      const d = describe(procsOf(j.sub));
      const ownerChat = chatOfPid.get(j.base) || rows.find((c) => c.root === j.root) || null;
      const id = `${j.pid}:${j.started}`;
      const seen = cpuState(id, j.sub, tbl, now);
      let note = null;
      if (ownerChat) {
        if (ownerChat.status === 'busy') note = `${ownerChat.aiName} is using it`;
        else if (Math.abs(j.started - ownerChat.started) < 10_000 && j.bytes >= 300 * MiB) note = `${ownerChat.aiName} may need it`;
      }
      const quiet = Math.max(0, now - seen.quietSince);
      const pre = d.kind === 'test' && d.watching && quiet >= H && (!ownerChat || ownerChat.status !== 'busy') && !note;
      want.push(j.pid);
      const cwd = (tbl.get(j.pid) || {}).cwd || r.cwd || os.homedir();
      const json = {
        id, kind: d.kind, name: d.name, mem: j.bytes, pre, cpu: Math.round(seen.pct), busy: seen.recent >= 10, quietMs: quiet,
        folder: streamer.on ? streamer.project(cwd) : baseOf((worktreeOf(cwd) || {}).main || cwd),
      };
      if (ownerChat) json.chat = ownerChat.sid;
      else json.terminal = true;
      if (j.ports.length) json.ports = j.ports;
      if (note) json.note = note;
      if (d.compose) json.extra = 'Its containers stop too';
      out.push({ id, pid: j.pid, started: j.started, bytes: j.bytes, pre, chat: ownerChat ? ownerChat.sid : null, loose: false, json });
    }
    for (const l of loose) {
      const p = tbl.get(l.pid);
      const leftItem = left.find((x) => x.pid === l.pid);
      const item = found.find((x) => x.pid === l.pid);
      const id = `${l.pid}:${p.started}`;
      const seen = cpuState(id, l.sub, tbl, now);
      const cwd = (leftItem && leftItem.cwd) || p.cwd || '';
      // Only a closed terminal's leftover comes ticked, as on the Mac (`pre: isLeft`): a runaway is the user's to tick.
      const pre = !!leftItem;
      const json = { id, mem: l.bytes, pre, cpu: Math.round(seen.pct), quietMs: 0, terminal: false, pid: l.pid };
      // The orbit's amber car of a closed terminal's leftover goes as it always did (the page's cleanup.js).
      if (leftItem) json.left = `left:${l.pid}:${leftItem.started}`;
      if (item && item.cpu > 0) {
        Object.assign(json, { kind: 'flame', name: p.name, burn: true, where: burning(item.cpuTime, item.cpu) });
        json.folder = cwd ? (streamer.on ? streamer.project(cwd) : baseOf(cwd)) : 'no terminal';
      } else {
        const d = describe(procsOf(l.sub));
        Object.assign(json, { kind: d.kind, name: d.name, where: 'Left running after its terminal closed' });
        json.folder = streamer.on ? streamer.project(cwd) : baseOf(cwd) || 'no terminal';
        if (d.compose) json.extra = 'Its containers stop too';
      }
      const ports = [...new Set(l.sub.flatMap((pid) => runaways.ports(pid)))].sort((x, y) => x - y);
      if (ports.length) json.ports = ports;
      out.push({ id, pid: l.pid, started: p.started, bytes: l.bytes, pre, chat: null, loose: true, json });
    }
    out.sort((a, b) => (!!a.json.where !== !!b.json.where ? (a.json.where ? -1 : 1) : b.bytes - a.bytes));
    progs = out;
    // The programs' folders come with the next reading.
    runaways.want(want, 'cleanup');
    if (viewOpen) for (const p of out) seenProgs.set(p.id, p);
    const preChats = new Set(rows.filter((c) => c.pre).map((c) => c.sid));
    reclaimable = rows.filter((c) => c.pre).reduce((a, c) => a + c.bytes, 0) + out.filter((p) => p.pre && !(p.chat && preChats.has(p.chat))).reduce((a, p) => a + p.bytes, 0);
    // What a round no longer sees isn't remembered.
    const liveIds = new Set([...out.map((p) => p.id), ...jobs.map((j) => `${j.pid}:${j.started}`)]);
    for (const k of [...cpuSeen.keys()]) if (!liveIds.has(k)) cpuSeen.delete(k);

    decideStrip(strip, { state, reclaim: reclaimable, suggest: suggest(), swapGB: swapGB(), blocked: dismissedStill(settings.get('cleanupDismissed'), state, now), t: now / 1000 });
    pushMemory();
    if (viewOpen) pushList(false);
  }

  // ---------- the page ----------
  function listJSON() {
    if (!state) return null;
    const f = orb + othersTotal === 0 ? 1 : Math.min(1, state.appc / (orb + othersTotal));
    const sys = state.used - (orb + othersTotal) * f;
    const memJ = {
      ram: state.ram, swap: state.swap, level: state.level, pressure: state.pressure, appc: state.appc, used: state.used, free: state.free,
      orb, oth: othersTotal, sys: Math.max(0, sys), others: othersTop,
    };
    return JSON.stringify({ mem: memJ, chats: chats.map((c) => c.json), programs: progs.map((p) => p.json), worktrees: [], measuring: false, reclaim: reclaimable, running });
  }

  function pushList(force) {
    // Nothing goes to the page while its view is closed.
    if (!viewOpen) return;
    const json = listJSON();
    if (!json || (!force && json === lastJSON)) return;
    lastJSON = json;
    push('cleanup', json);
  }

  /** The line's short status for the page (only when it changes; nothing but `show: false` while it's away). */
  function pushMemory(force = false) {
    if (!state) return;
    const m = { pressure: state.pressure, show: strip.shown };
    if (strip.shown) {
      const round1 = (b) => (Math.round((b / GiB) * 10) / 10) * GiB;
      m.swap = round1(state.swap);
      m.reclaim = round1(reclaimable);
    }
    const json = JSON.stringify(m);
    if (!force && json === lastMemJSON) return;
    lastMemJSON = json;
    push('memory', json);
  }

  function pushPrefs() {
    push('cleanupPrefs', JSON.stringify({ suggest: suggest(), swapGB: swapGB(), idleHours: idleHours() }));
  }

  function setPrefs(msg) {
    if (typeof msg.suggest === 'boolean') settings.set('cleanupSuggest', msg.suggest);
    if ([2, 4, 8].includes(msg.swapGB)) settings.set('cleanupSwapGB', msg.swapGB);
    if ([1, 12, 24, 72].includes(msg.idleHours)) settings.set('cleanupIdleHours', msg.idleHours);
    pushPrefs();
    // Suggestions off: the line goes now.
    if (!suggest()) strip.shown = false;
    pushMemory();
  }

  /** The × on the line: it goes at once, and stays away until it gets worse (SPEC 4.2), across launches too. */
  function dismiss() {
    if (state) settings.set('cleanupDismissed', { swap: state.swap, level: state.level, at: Date.now() });
    strip.shown = false;
    pushMemory();
  }

  function viewChanged(open) {
    viewOpen = !!open;
    seenProgs = new Map();
    runaways.wantNames(viewOpen);
    if (!viewOpen) return;
    pushList(true);
    // A fresh reading now (its round pushes the list again when something changed).
    runaways.fresh();
  }

  // ---------- running (SPEC 9): programs, then chats ----------
  function step(id, kind, st, { text = '', freed = 0, trashed = 0 } = {}) {
    push('cleanupStep', JSON.stringify({ id, kind, state: st, text, freed, trashed }));
  }

  const treeBytes = (pid) => {
    const tbl = runaways.table();
    return runaways.tree(pid).reduce((a, t) => a + mem(tbl, t.pid), 0);
  };

  // Never part of what Clean Up ends: the app's own processes, its session host, Windows' own, a terminal's shell, an AI.
  function refused(p) {
    if (!p) return false;
    const self = new Set(ownPids());
    return p.pid <= 4 || self.has(p.pid) || HOST_RE.test(p.name) || SYSTEM_RE.test(p.name) || terminals.pids().has(p.pid) || isAIProcess(p)
      || engine.live().some((s) => s.pid === p.pid);
  }

  /**
   * Whether the process is one of Orbiterm's to stop (the Mac's Cleanup.isOurs): still the process seen, under one of
   * this app's terminals now, or a leftover or runaway that was seen in one; never a terminal's shell, a shell typed in
   * it, an AI or one of an AI's launchers, nor anything `refused`. Anything else is refused, whatever the page said.
   */
  function isOurs(pid, started) {
    const tbl = runaways.table();
    const p = tbl.get(pid);
    if (!p || p.started !== started || refused(p) || isInteractiveShell(p)) return false;
    // One of an AI's launchers (the AI runs under it): the chat's, ended as a chat. (What runs under it is looked at
    // first: isAIProcess may look for a file.)
    const aiPids = new Set(engine.live().map((s) => s.pid));
    for (const q of tbl.values()) if (parents(q.pid).includes(pid) && (aiPids.has(q.pid) || isAIProcess(q))) return false;
    // Under one of the app's terminals: a shell the round took as a root (the session host's child or the app's own),
    // still the process it saw. The host itself is above it, never below.
    const shells = new Set(roots.filter((r) => !r.external && (tbl.get(r.pid) || {}).started === r.started).map((r) => r.pid));
    if (parents(pid).some((x) => shells.has(x))) return true;
    // A leftover or runaway: not in a terminal now, but seen in one of the app's.
    return ours.get(pid) === started && progs.concat([...seenProgs.values()]).some((x) => x.loose && x.pid === pid);
  }

  /** The chat is over: its AI is gone, and so is its terminal's shell (End ends the whole terminal) or all it ran. */
  function chatGone(row, rootPid, rootStarted) {
    const tbl = runaways.table();
    if ((tbl.get(row.pid) || {}).started === row.started) return false;
    if ((tbl.get(rootPid) || {}).started !== rootStarted) return true;
    return subtree(rootPid).slice(1).every((pid) => SHELL_NAMES.test((tbl.get(pid) || {}).name || ''));
  }

  async function run(items) {
    if (running || !Array.isArray(items)) return;
    const ids = (kind) => items.filter((i) => i && i.kind === kind && typeof i.id === 'string').map((i) => i.id);
    const pids = ids('program'), sids = ids('chat'), tops = ids('worktree');
    if (!pids.length && !sids.length && !tops.length) return;
    running = true;
    halted = false;
    log(['run', `${pids.length + sids.length + tops.length} items`, `ticked: ${sids.length} chats, ${pids.length} programs, ${tops.length} worktrees`,
      `pressure=${state ? state.pressure : '?'} swap=${gib(state ? state.swap : 0)}`]);
    let ok = 0, bad = 0, freed = 0;
    try {
      await runaways.fresh();
      // A: programs, all together (each looked at again first: the same process, one of Orbiterm's).
      const names = new Map([...seenProgs.values(), ...progs].map((p) => [p.id, p.json.name]));
      const work = [];
      for (const id of pids) {
        const m = /^(\d+):(\d+)$/.exec(id);
        if (!m) continue;
        const pid = Number(m[1]), started = Number(m[2]);
        if ((runaways.table().get(pid) || {}).started !== started) {
          step(id, 'program', 'gone');
          log(['stop', 'program', `pid=${pid}`, 'already gone']);
          continue;
        }
        if (!(progs.some((p) => p.id === id) || seenProgs.has(id)) || !isOurs(pid, started)) {
          step(id, 'program', 'skip');
          log(['stop', 'program', `pid=${pid}`, 'refused', "not one of Orbiterm's"]);
          continue;
        }
        step(id, 'program', 'now');
        work.push({ id, pid, started, bytes: treeBytes(pid) });
      }
      const results = await Promise.all(work.map(async (w) => ({ ...w, r: await runaways.stopTree(w.pid, w.started, { grace: 5000, refuse: refused }) })));
      for (const w of results) {
        const name = names.get(w.id) || 'program';
        const argv0 = baseOf(words((runaways.table().get(w.pid) || {}).cmd)[0] || '');
        if (w.r === 'stopped') {
          ok++;
          freed += w.bytes;
          step(w.id, 'program', 'done', { freed: w.bytes });
          log(['stop', 'program', `"${name}"`, `pid=${w.pid} started=${(w.started / 1000).toFixed(3)}`, 'ok', `freed=${gib(w.bytes)}`]);
        } else if (w.r === 'gone') {
          step(w.id, 'program', 'gone');
          log(['stop', 'program', `"${name}"`, `pid=${w.pid}`, 'already gone']);
        } else if (w.r === 'refused') {
          step(w.id, 'program', 'skip');
          log(['stop', 'program', `"${name}"`, `pid=${w.pid}`, 'refused', 'its tree holds what Orbiterm never stops']);
        } else {
          bad++;
          step(w.id, 'program', 'bad', { text: `${name} didn't stop. Try again in a moment.` });
          log(['stop', 'program', `"${name}"`, `pid=${w.pid} started=${(w.started / 1000).toFixed(3)}`, argv0 ? `argv0=${argv0}` : '', 'fail', 'still running']);
        }
      }
      // B: chats, all together (a fresh look first: still there, still idle, still in its terminal).
      await runaways.fresh();
      const ending = [];
      for (const sid of sids) {
        const row = chats.find((c) => c.sid === sid);
        if (!row) {
          step(sid, 'chat', 'gone');
          continue;
        }
        const shown = row.json.title || row.title;
        if (halted || quitting) {
          step(sid, 'chat', 'skip');
          continue;
        }
        const b = engine.live().find((s) => s.sessionId === sid);
        if (!b || (b.status === 'busy' || b.status === 'waiting') || b.pid !== row.pid) {
          step(sid, 'chat', 'skip', { text: `${shown} started working, so it was left alone.` });
          log(['end', 'chat', row.ai, `"${row.title}"`, `sid=${sid}`, 'skipped', 'not idle any more']);
          continue;
        }
        if (row.json.blocker) {
          step(sid, 'chat', 'skip', { text: `${shown} was left alone: ${String(row.json.blocker).toLowerCase()}.` });
          log(['end', 'chat', row.ai, `"${row.title}"`, `sid=${sid}`, 'skipped', 'would end more than listed']);
          continue;
        }
        const t = terminals.list().find((x) => x.id === row.tab);
        const root = t && runaways.table().get(t.pid);
        if (!t || !root || !chatWindow(row.tab) || !parents(row.pid).includes(t.pid)) {
          bad++;
          step(sid, 'chat', 'bad', { text: `${row.aiName} didn't stop. Try again in a moment.` });
          log(['end', 'chat', row.ai, `"${row.title}"`, `sid=${sid}`, 'fail', 'no window to end it']);
          continue;
        }
        // Orbiterm itself in that terminal's tree, as of the reading just taken (started from its shell since the list was
        // made): ending the terminal would end the app. Never.
        const self = new Set(ownPids());
        if (subtree(t.pid).some((m) => self.has(m))) {
          step(sid, 'chat', 'skip', { text: `${shown} was left alone: Orbiterm itself runs in its terminal.` });
          log(['end', 'chat', row.ai, `"${row.title}"`, `sid=${sid}`, 'refused', 'Orbiterm itself runs in its terminal']);
          continue;
        }
        const bytes = treeBytes(t.pid);
        step(sid, 'chat', 'now');
        // Its window's env view may hold changes not saved: it asks first (main.js), and Cancel leaves the chat be.
        if (!(await endTerminal(row.tab))) {
          step(sid, 'chat', 'skip', { text: `${shown} was left alone: its env file has changes not saved.` });
          log(['end', 'chat', row.ai, `"${row.title}"`, `sid=${sid}`, 'skipped', 'env changes not saved']);
          continue;
        }
        ending.push({ row, bytes, root: t.pid, rootStarted: root.started });
      }
      let pending = ending;
      for (const until = Date.now() + 8000; pending.length && Date.now() < until;) {
        await new Promise((r) => setTimeout(r, 500));
        await runaways.fresh();
        pending = pending.filter((p) => {
          if (!chatGone(p.row, p.root, p.rootStarted)) return true;
          ok++;
          freed += p.bytes;
          step(p.row.sid, 'chat', 'done', { freed: p.bytes });
          log(['end', 'chat', p.row.ai, `"${p.row.title}"`, `sid=${p.row.sid}`, `pid=${p.row.pid}`, 'ok', `freed=${gib(p.bytes)}`]);
          return false;
        });
      }
      for (const p of pending) {
        bad++;
        step(p.row.sid, 'chat', 'bad', { text: `${p.row.aiName} didn't stop. Try again in a moment.` });
        log(['end', 'chat', p.row.ai, `"${p.row.title}"`, `sid=${p.row.sid}`, `pid=${p.row.pid}`, 'fail', 'still running after 8s']);
      }
      // Worktrees: none are listed on Windows, so none are touched.
      for (const top of tops) step(top, 'worktree', 'skip');
    } catch (e) {
      console.error('cleanup: run:', e && e.stack ? e.stack : e);
      log(['error', String((e && e.message) || e)]);
    } finally {
      log(['done', `${ok} ok, ${bad} failed`, `freed=${gib(freed)}`, 'trash=0.00GB']);
      running = false;
      push('cleanupStep', JSON.stringify({ kind: 'done', id: '', state: 'done', summary: { ok, failed: bad, freed, trashed: 0 } }));
      runaways.fresh();
    }
  }

  // ---------- the log (SPEC 9.5): %LOCALAPPDATA%\Orbiterm\Logs\cleanup.log ----------
  const logFile = path.join(logDir, 'cleanup.log');
  /** One line per action, fields apart by tabs. Never a command line (it can hold a token), an environment or a file's content. */
  function log(fields) {
    try {
      fs.mkdirSync(logDir, { recursive: true });
      try {
        if (fs.statSync(logFile).size > 1 << 20) fs.renameSync(logFile, `${logFile}.1`);
      } catch {}
      const line = [stamp(), ...fields.filter((f) => f !== '').map((f) => String(f).replace(/[\t\r\n]/g, ' '))].join('\t');
      fs.appendFileSync(logFile, `${line}\n`);
    } catch {}
  }

  function showLog() {
    try {
      fs.mkdirSync(logDir, { recursive: true });
      if (!fs.existsSync(logFile)) fs.writeFileSync(logFile, '');
    } catch {}
    shell.openPath(logFile);
  }

  return {
    round,
    viewChanged,
    pushList,
    pushMemory,
    pushPrefs,
    setPrefs,
    dismiss,
    run,
    /** Stop After This One: what runs finishes, what comes next doesn't start. */
    halt() {
      halted = true;
    },
    showLog,
    openTaskManager: () => taskManager(),
    /** A key or paste in a terminal (its idle time counts from it, the Mac's ChatTerminalView.typedAt). */
    typed(id) {
      typed.set(id, Date.now());
    },
    /** The app quits while it cleans: what runs finishes, nothing more starts. */
    quitting() {
      if (!running) return;
      quitting = true;
      halted = true;
      log(['aborted: app quit']);
    },
  };
}

module.exports = { createCleanup, describe, isInteractiveShell, isAIProcess, memState, decideStrip, dismissedStill, words, burning, stamp };
