'use strict';
// The user's processes, read every few seconds, for three things the Mac app's Runaways.swift and MainWindowController
// do with the kernel's process list:
// - runaways: one of yours left burning a CPU core where nobody sees it, half a core or more for two minutes. On Windows
//   that's a shell or a script runtime (PowerShell, cmd, bash, node, python …) whose parent is gone: a process without
//   a parent is everyday there (an app's launcher exits), so only those count. The dashboard sounds the alarm, and End
//   ends one if it's still the same process.
// - what a closed terminal left running (Runaways.left): the same kind of process, its parent gone, burning or not (a dev
//   server still holding its port after its terminal closed). The orbit shows each as an amber car; ending it is a click.
// - what runs in the app's terminals (the orbit's cars): a shell's jobs, what they print as their command, the CPU they use.
// - Clean Up (cleanup.js, the Mac's MemoryWatch and Proc): each process's memory, the PC's, the ports listened on, and the
//   stop of a program's tree, each process by pid and creation time.
// One long-lived PowerShell reads the list when it's asked (a line on its input, every few seconds) and ends with its
// input, so it never outlives the app; the folder a process runs in comes from the process itself, for the few that need
// it. Run from the sources elsewhere (a Mac), `ps` finds the runaways, as on the Mac, and the rest stays empty.
const { spawn, execFile } = require('child_process');
const os = require('os');

const WIN = process.platform === 'win32';
const HOME_NORM = (os.homedir() || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
const POSIX_EXCLUDED = /(\.xpc\/|\.appex\/|^\/System\/|^\/usr\/libexec\/|^\/usr\/sbin\/|^\/Library\/Apple\/|^\/Library\/Application Support\/Apple\/|(?:^|\/)com\.apple\.)/;

function isExcludedPosix(cmd, name) {
  const c = String(cmd || '').trim(), n = String(name || '');
  if (POSIX_EXCLUDED.test(c) || n.startsWith('com.apple.')) return true;
  if (c.includes('/Python.app/Contents/MacOS/Python')) return false;
  return c.includes('.app/Contents/') || c.split(/\s+/)[0].includes('.app/');
}

// Bytes to whole megabytes, rounded down, as the Mac's Int(rss / 1_048_576).
const megabytes = (bytes) => Math.floor((bytes || 0) / 1_048_576);

function normDir(d) {
  return String(d || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

function inFolder(dir, root) {
  const d = normDir(dir), r = normDir(root);
  if (!d || !r || r === '/' || /^[a-z]:$/.test(r)) return false;
  if (d === r) return true;
  return r !== HOME_NORM && d.startsWith(`${r}/`);
}

// AI coding tools besides Claude Code, as the Mac's Proc.otherAIs: by the program's name, or for one Node, Bun or Python
// runs, by its script or its npm package in the command line (npm's .cmd shims run node with the package's own path).
// Each one running is a session on the orbit (the engine's setOthers).
const AI_TOOLS = {
  codex: 'Codex', agy: 'Antigravity', gemini: 'Gemini', opencode: 'OpenCode', aider: 'Aider', 'cursor-agent': 'Cursor', amp: 'Amp',
  qwen: 'Qwen Code', crush: 'Crush', droid: 'Droid', copilot: 'Copilot', 'kiro-cli': 'Kiro', grok: 'Grok', auggie: 'Auggie',
  cline: 'Cline', kimi: 'Kimi', kilocode: 'Kilo Code', plandex: 'Plandex', 'cursor-agent-sea': 'Cursor',
};
const AI_PACKAGES = [['@openai/codex', 'Codex'], ['@google/gemini-cli', 'Gemini'], ['@qwen-code/', 'Qwen Code'], ['@github/copilot', 'Copilot'],
  ['@sourcegraph/amp', 'Amp'], ['opencode-ai', 'OpenCode'], ['@augmentcode/auggie', 'Auggie'], ['@kilocode/cli', 'Kilo Code'], ['@vibe-kit/grok-cli', 'Grok']];
const INTERPRETER = /^(node|bun|deno|python[0-9.]*|pythonw)$/i;
// Cursor's CLI runs as its own Node on `cursor-agent\versions\<version>\index.js` (its `agent` and `cursor-agent` commands
// are launchers, agent.cmd or PowerShell): known by that folder, never by the name `agent` (the Mac's Proc.otherAI).
const CURSOR_SCRIPT = /[\\/]cursor-agent[\\/]versions[\\/][^\\/]+[\\/]index\.js$/i;
// A command line's words, a quoted one as one word without its quotes, the program first.
const words = (cmd) => [...String(cmd || '').matchAll(/"([^"]*)"|(\S+)/g)].map((m) => m[1] ?? m[2]);
function aiTool(p) {
  const name = String(p.name).toLowerCase();
  if (AI_TOOLS[name]) return AI_TOOLS[name];
  if (!INTERPRETER.test(name)) return null;
  const cmd = String(p.cmd || '');
  // The script, past the interpreter's options (`node --no-warnings …\codex.js`, `python -m aider`).
  const script = words(cmd).slice(1).find((w) => !w.startsWith('-'));
  const base = script ? script.split(/[\\/]/).pop().replace(/\.[^.]*$/, '').toLowerCase() : '';
  if (AI_TOOLS[base]) return AI_TOOLS[base];
  // Cursor's index.js anywhere in its words, as its hook's IsCursor (cursorhooks.cs) looks: `node --max-old-space-size
  // 8192 …\index.js` puts a value before it, which the first word past the options would take for the script.
  if (words(cmd).slice(1).some((w) => CURSOR_SCRIPT.test(w))) return 'Cursor';
  const lower = cmd.replace(/\\/g, '/').toLowerCase();
  const hit = AI_PACKAGES.find(([pkg]) => lower.includes(pkg));
  return hit ? hit[1] : null;
}

// An Antigravity the user ran for one answer and no chat, as the Mac's Proc.otherAI leaves out: `agy -p "…"`,
// `agy --prompt "…"`, `agy /usage`. It prints and quits, so a planet for it would only blow up a moment later. The
// `=` forms are the same switches to its flag parser.
function agyOneShot(cmd) {
  return words(cmd).slice(1).some((w) => w === '-p' || w === '--prompt' || w === '/usage' || w.startsWith('-p=') || w.startsWith('--prompt='));
}

// Cursor's one-shot commands (`agent status`, `agent ls`, `agent mcp …`, its `-p` runs, the `worker-server` its TUI leaves
// behind) are no session, as on the Mac: what comes after its index.js (or its own program).
const CURSOR_ONE_SHOT = new Set(['status', 'whoami', 'about', 'login', 'logout', 'ls', 'mcp', 'update', 'upgrade', 'install-shell-integration',
  'uninstall-shell-integration', 'worker-server', 'create-chat', 'generate-rule', 'rule', 'models', 'help', 'agent-pool']);
function cursorOneShot(cmd) {
  const w = words(cmd);
  const at = w.findIndex((x) => /index\.js$/i.test(x));
  const rest = w.slice(at >= 0 ? at + 1 : 1);
  if (rest.some((x) => x === '-p' || x === '--print')) return true;
  const sub = rest.find((x) => !x.startsWith('-'));
  return sub !== undefined && CURSOR_ONE_SHOT.has(sub);
}

const SHELLS = '^(pwsh|powershell|cmd|bash|sh|zsh|fish|node|python[0-9.]*|ruby|perl|php|java|deno|bun|claude)(\\.exe)?$';
const SHELL_RE = new RegExp(SHELLS, 'i');
const AI_NAMES = `^(${Object.keys(AI_TOOLS).join('|')})(\\.exe)?$`;
// An AI tool counts when it runs in a terminal, as the Mac's has a tty: a shell or a terminal app among its parents.
// One an editor runs in the background (the Codex extension's codex.exe in VS Code) is no session of anyone's.
const TERMINAL_RE = /^(pwsh|powershell|cmd|bash|sh|zsh|fish|nu|WindowsTerminal|wezterm-gui|alacritty|mintty|ConEmuC?(64)?|tabby|hyper|warp)$/i;

// The folder a process is in: its current directory, read from its process parameters (x64 layout; a 32-bit process, or
// one this user can't read, has none). And the battery's charge and battery saver (AtlPower), for power save.
const CWD_READER = `
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class AtlCwd {
  [StructLayout(LayoutKind.Sequential)] struct PBI { public IntPtr R1; public IntPtr Peb; public IntPtr R2; public IntPtr R3; public IntPtr Pid; public IntPtr R4; }
  [DllImport("ntdll.dll")] static extern int NtQueryInformationProcess(IntPtr h, int cls, ref PBI info, int size, out int ret);
  [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(int access, bool inherit, int pid);
  [DllImport("kernel32.dll")] static extern bool ReadProcessMemory(IntPtr h, IntPtr at, byte[] buf, IntPtr size, out IntPtr read);
  [DllImport("kernel32.dll")] static extern bool IsWow64Process(IntPtr h, out bool wow);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
  static byte[] Read(IntPtr h, IntPtr at, int n) { var b = new byte[n]; IntPtr got; return ReadProcessMemory(h, at, b, (IntPtr)n, out got) ? b : null; }
  public static string Of(int pid) {
    IntPtr h = OpenProcess(0x0410, false, pid);
    if (h == IntPtr.Zero) return "";
    try {
      bool wow;
      if (IntPtr.Size != 8 || (IsWow64Process(h, out wow) && wow)) return "";
      var pbi = new PBI(); int ret;
      if (NtQueryInformationProcess(h, 0, ref pbi, Marshal.SizeOf(pbi), out ret) != 0) return "";
      var p = Read(h, pbi.Peb + 0x20, 8); if (p == null) return "";
      var us = Read(h, (IntPtr)BitConverter.ToInt64(p, 0) + 0x38, 16); if (us == null) return "";
      int len = BitConverter.ToUInt16(us, 0);
      if (len <= 0 || len > 8192) return "";
      var s = Read(h, (IntPtr)BitConverter.ToInt64(us, 8), len); if (s == null) return "";
      var dir = Encoding.Unicode.GetString(s);
      return dir.Length > 3 ? dir.TrimEnd('\\\\') : dir;
    } catch { return ""; } finally { CloseHandle(h); }
  }
}
public static class AtlPower {
  [StructLayout(LayoutKind.Sequential)] struct SPS { public byte AC; public byte Flag; public byte Percent; public byte Saver; public int Life; public int Full; }
  [DllImport("kernel32.dll")] static extern bool GetSystemPowerStatus(out SPS s);
  // The battery's charge (%), -1 without one; and battery saver (Energy Saver on Windows 11), 1 when on.
  public static string Of() {
    SPS s;
    if (!GetSystemPowerStatus(out s)) return "0\\t-1";
    int pct = (s.Flag & 128) != 0 || s.Flag == 255 || s.Percent > 100 ? -1 : s.Percent;
    return (s.Saver == 1 ? "1" : "0") + "\\t" + pct;
  }
}
public static class AtlPorts {
  [DllImport("iphlpapi.dll")] static extern uint GetExtendedTcpTable(IntPtr table, ref int size, bool order, int af, int cls, int reserved);
  // The processes listening on a TCP port, IPv4 and IPv6 (TCP_TABLE_OWNER_PID_LISTENER: rows of 24 and 56 bytes, the
  // local port at 8 and 20 in network order, the owner's pid last), as "pid:port,pid:port,…": a server, up and waiting
  // for whoever connects (the engine's agyPendingWork), and the port Clean Up shows (the Mac's Proc.listeningPorts).
  public static string Listening() {
    var seen = new System.Collections.Generic.HashSet<string>();
    foreach (int af in new[] { 2, 23 }) {
      int size = 0;
      GetExtendedTcpTable(IntPtr.Zero, ref size, false, af, 3, 0);
      if (size <= 0) continue;
      IntPtr buf = Marshal.AllocHGlobal(size);
      try {
        if (GetExtendedTcpTable(buf, ref size, false, af, 3, 0) != 0) continue;
        int n = Marshal.ReadInt32(buf), row = af == 2 ? 24 : 56, at = af == 2 ? 8 : 20;
        for (int i = 0; i < n; i++) {
          int lp = Marshal.ReadInt32(buf, 4 + i * row + at);
          seen.Add(Marshal.ReadInt32(buf, 4 + i * row + row - 4) + ":" + (((lp & 0xff) << 8) | ((lp >> 8) & 0xff)));
        }
      } finally { Marshal.FreeHGlobal(buf); }
    }
    return string.Join(",", seen);
  }
}
public static class AtlMem {
  [StructLayout(LayoutKind.Sequential)] struct PMC { public uint cb; public uint Faults; public UIntPtr PeakWS, WS, QPeakPaged, QPaged, QPeakNonPaged, QNonPaged, Pagefile, PeakPagefile, Private, PrivateWS; public ulong SharedCommit; }
  [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(int access, bool inherit, int pid);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
  [DllImport("psapi.dll")] static extern bool GetProcessMemoryInfo(IntPtr h, ref PMC c, uint cb);
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern bool QueryFullProcessImageName(IntPtr h, int flags, StringBuilder name, ref int size);
  // The memory a process holds as Task Manager's Memory column shows it (its active private working set,
  // PROCESS_MEMORY_COUNTERS_EX2, Windows 11 22H2 on), else its private bytes: Clean Up's footprint (the Mac's
  // Proc.footprint). Only a handle to query it: -1 for one this user can't open.
  public static long Of(int pid) {
    IntPtr h = OpenProcess(0x1000, false, pid);
    if (h == IntPtr.Zero) return -1;
    try {
      var c = new PMC(); uint size = (uint)Marshal.SizeOf(typeof(PMC)); c.cb = size;
      if (!GetProcessMemoryInfo(h, ref c, size)) { c = new PMC(); size -= 16; c.cb = size; if (!GetProcessMemoryInfo(h, ref c, size)) return -1; }
      ulong ws = (ulong)c.PrivateWS;
      return (long)(ws > 0 ? ws : (ulong)c.Private);
    } finally { CloseHandle(h); }
  }
  // The name an app goes by (Clean Up's "Other apps", the Mac's outermost .app): its exe's product name, "" for one of
  // Windows' own (named "Microsoft® Windows® …" in every language) or none.
  public static string Product(int pid) {
    IntPtr h = OpenProcess(0x1000, false, pid);
    if (h == IntPtr.Zero) return "";
    try {
      var sb = new StringBuilder(1024); int n = sb.Capacity;
      if (!QueryFullProcessImageName(h, 0, sb, ref n)) return "";
      var p = (System.Diagnostics.FileVersionInfo.GetVersionInfo(sb.ToString()).ProductName ?? "").Trim();
      return p.IndexOf("Windows®", StringComparison.Ordinal) >= 0 || p.IndexOf("Operating System", StringComparison.OrdinalIgnoreCase) >= 0 || p.Length > 40 ? "" : p.Replace("\\t", " ");
    } catch { return ""; } finally { CloseHandle(h); }
  }
}
public static class AtlSys {
  [StructLayout(LayoutKind.Sequential)] class MSEX { public uint Length = 64; public uint Load; public ulong TotalPhys, AvailPhys, TotalPage, AvailPage, TotalVirt, AvailVirt, AvailExt; }
  [DllImport("kernel32.dll")] static extern bool GlobalMemoryStatusEx([In, Out] MSEX m);
  [StructLayout(LayoutKind.Sequential)] struct PI { public uint cb; public UIntPtr CommitTotal, CommitLimit, CommitPeak, PhysicalTotal, PhysicalAvailable, SystemCache, KernelTotal, KernelPaged, KernelNonpaged, PageSize; public uint Handles, Processes, Threads; }
  [DllImport("psapi.dll")] static extern bool GetPerformanceInfo(out PI p, uint cb);
  [DllImport("kernel32.dll")] static extern IntPtr CreateMemoryResourceNotification(int type);
  [DllImport("kernel32.dll")] static extern bool QueryMemoryResourceNotification(IntPtr h, out bool state);
  static IntPtr low = IntPtr.Zero;
  // The PC's memory, the Mac's MemoryWatch.read (SPEC 20): RAM and what's available of it, the load (%), the commit
  // charge and its limit, physical memory and the kernel's share in bytes, and Windows' own low-memory signal (1).
  public static string Of() {
    var m = new MSEX(); if (!GlobalMemoryStatusEx(m)) return "";
    PI p; if (!GetPerformanceInfo(out p, (uint)Marshal.SizeOf(typeof(PI)))) return "";
    ulong pg = (ulong)p.PageSize;
    if (low == IntPtr.Zero) low = CreateMemoryResourceNotification(0);
    bool isLow = false; if (low != IntPtr.Zero) QueryMemoryResourceNotification(low, out isLow);
    return m.TotalPhys + "\\t" + m.AvailPhys + "\\t" + m.Load + "\\t" + ((ulong)p.CommitTotal * pg) + "\\t" + ((ulong)p.CommitLimit * pg) + "\\t" + ((ulong)p.PhysicalTotal * pg) + "\\t" + ((ulong)p.KernelTotal * pg) + "\\t" + (isLow ? 1 : 0);
  }
}
public static class AtlKill {
  [DllImport("kernel32.dll", SetLastError = true)] static extern IntPtr OpenProcess(int access, bool inherit, int pid);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
  [DllImport("kernel32.dll")] static extern bool GetProcessTimes(IntPtr h, out long created, out long exited, out long kernel, out long user);
  [DllImport("kernel32.dll")] static extern bool GetExitCodeProcess(IntPtr h, out int code);
  [DllImport("kernel32.dll")] static extern bool TerminateProcess(IntPtr h, int code);
  delegate bool EnumProc(IntPtr w, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f, IntPtr l);
  [DllImport("user32.dll")] static extern int GetWindowThreadProcessId(IntPtr w, out int pid);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr w);
  [DllImport("user32.dll")] static extern bool PostMessage(IntPtr w, int msg, IntPtr wp, IntPtr lp);
  // Clean Up's stop (the Mac's Proc.endTree), "pid@started,…" -> "pid=state,…": each process opened first and its
  // creation time (ms since 1970) compared with the one Clean Up saw, so a number Windows gave to another process meanwhile
  // is never touched, and the handle keeps it from being given away until it's done. With force: ended at once (ok); else
  // its windows are asked to close, as taskkill without /F asks (asked, or nowindow). gone: not that process any more;
  // denied: not this user's to end (another user's, an elevated one).
  public static string Do(string list, bool force) {
    var sb = new StringBuilder();
    foreach (var item in list.Split(',')) {
      var f = item.Split('@'); int pid; long started;
      if (f.Length != 2 || !int.TryParse(f[0], out pid) || !long.TryParse(f[1], out started) || pid <= 4) continue;
      sb.Append(pid).Append('=').Append(One(pid, started, force)).Append(',');
    }
    return sb.ToString().TrimEnd(',');
  }
  static string One(int pid, long started, bool force) {
    IntPtr h = OpenProcess(0x1001, false, pid);
    if (h == IntPtr.Zero) return Marshal.GetLastWin32Error() == 87 ? "gone" : "denied";
    try {
      long c, x, k, u; int code;
      if (!GetProcessTimes(h, out c, out x, out k, out u)) return "denied";
      if (Math.Abs((c - 116444736000000000L) / 10000 - started) > 5) return "gone";
      if (GetExitCodeProcess(h, out code) && code != 259) return "gone";
      if (force) return TerminateProcess(h, 1) ? "ok" : "denied";
      int n = 0;
      EnumWindows((w, l) => { int owner; GetWindowThreadProcessId(w, out owner); if (owner == pid && IsWindowVisible(w)) { PostMessage(w, 0x10, IntPtr.Zero, IntPtr.Zero); n++; } return true; }, IntPtr.Zero);
      return n > 0 ? "asked" : "nowindow";
    } finally { CloseHandle(h); }
  }
}`;

// `onPower({ saver, charge })`: with every reading on Windows, the battery's charge (%, null without one) and whether
// the system's saver is on, for power save (power.js). `onDone()`: after each reading, its runaways weighed too (Clean
// Up's round, cleanup.js, the Mac's MemoryWatch tick that Runaways.sample shares).
function createRunaways({ onChange, onRead, onPower, onDone }) {
  const LINE = 50, SUSTAIN = 120_000, EVERY = 5000;
  const last = new Map(); // pid -> { started, cpu (ms of CPU in all), at }
  const over = new Map(); // pid -> since when it has been over the line
  const busyUntil = new Map(); // pid -> until when an orphan tree was actively working
  let json = '[]', timer = null, sampler = null, stopped = false;
  // The latest reading of every process (Windows): pid -> { pid, ppid, orphan, started, cpu, mem, name, cwd, cmd, pct }.
  // `mem`: bytes, as Task Manager's Memory column (AtlMem), null for one this user can't open.
  let table = new Map();
  let kids = new Map(); // pid -> its children's pids
  let listening = new Set(); // the pids listening on a TCP port, as of the latest reading (Windows)
  let portsOf = new Map(); // pid -> the TCP ports it listens on
  let memory = null; // the PC's memory as of the latest reading (AtlSys), for Clean Up
  const products = new Map(); // an exe's name -> the name its app goes by ('' for none), asked for a few at a time
  let wantNames = false; // Clean Up's view is open: the apps' names are looked up
  const wantedBy = new Map(); // who asks (pushTerminals, Clean Up) -> the pids whose folder it wants
  let wanted = [];
  let killRid = 0;
  const killWaiting = new Map(); // request -> what waits for the session's answer
  let liveSessions = []; // [{ cwd, started }] from the engine
  let ask = () => {};
  // One reading at a time: the PowerShell answers its lines in turn, so a reading asked for by every waiter would hold a
  // stop's close and kill lines behind dozens of others (twelve programs stopped at once queued 77). `inFlight`: one is on
  // its way; `waiting`: what it answers (all asked before it was requested); `forNext`: what asked after, answered by the
  // next one, requested once (`again`) as soon as this one ends.
  let inFlight = false, again = false;
  const waiting = [];
  const forNext = [];

  function allLiveSessions() {
    const out = [...liveSessions];
    for (const p of table.values()) {
      if ((/^claude$/i.test(p.name) || aiTool(p)) && p.cwd && !out.some((s) => normDir(s.cwd) === normDir(p.cwd))) {
        out.push({ cwd: p.cwd, started: p.started, busy: true });
      }
    }
    return out;
  }

  function matchingSessions(p) {
    if (!p.cwd) return [];
    return allLiveSessions().filter((s) => s.cwd && p.started >= (s.started || 0) - 5000 && inFolder(p.cwd, s.cwd));
  }

  function ownerSession(p) {
    return matchingSessions(p)[0] || null;
  }

  function isLiveWork(p, now) {
    const matches = matchingSessions(p);
    if (!matches.length) return false;
    return matches.some((s) => s.busy !== false) || (busyUntil.get(p.pid) || 0) > now || now - p.started < 15_000;
  }

  // Runaways among one reading's candidates: [{ pid, name, cmd, started (ms since 1970), cpu (ms of CPU in all) }].
  function consider(list, at) {
    const items = [], seen = new Set(), now = Date.now();
    for (const p of list) {
      seen.add(p.pid);
      const prev = last.get(p.pid);
      last.set(p.pid, { started: p.started, cpu: p.cpu, at });
      if (!prev || prev.started !== p.started || at <= prev.at || p.cpu < prev.cpu) continue;
      // Measure the whole process tree when available (e.g. `npm run dev` waiting on a frozen `node` child).
      const pct = typeof p.treePct === 'number' ? p.treePct : ((p.cpu - prev.cpu) / (at - prev.at)) * 100;
      const liveWork = isLiveWork(p, now);
      if (pct >= 1 && matchingSessions(p).some((s) => s.busy !== false)) busyUntil.set(p.pid, now + 15_000);
      if (liveWork || pct < LINE) {
        over.delete(p.pid);
        continue;
      }
      const since = over.get(p.pid) ?? now;
      over.set(p.pid, since);
      if (now - since < SUSTAIN) continue;
      const cmd = String(p.cmd || p.name).slice(0, 300);
      const totalCpu = typeof p.treeCpu === 'number' ? p.treeCpu : p.cpu;
      items.push({ pid: p.pid, name: p.name, cmd, cpu: Math.round(pct * 10) / 10, since, started: p.started, cpuTime: totalCpu / 1000 });
    }
    for (const k of [...last.keys()]) if (!seen.has(k)) last.delete(k);
    for (const k of [...over.keys()]) if (!seen.has(k)) over.delete(k);
    for (const k of [...busyUntil.keys()]) if (!seen.has(k)) busyUntil.delete(k);
    items.sort((a, b) => b.cpu - a.cpu);
    const next = JSON.stringify(items);
    if (next !== json) {
      json = next;
      onChange(next);
    }
  }

  // ---------- Windows: one PowerShell, the whole list when asked ----------
  function startWindows() {
    const script = [
      '$ErrorActionPreference = "SilentlyContinue"',
      'try { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false) } catch {}',
      '$me = (Get-Process -Id $PID).SessionId',
      // The C# comes in an environment variable of its own: in the command line it would pass Windows' 32K limit.
      'try { Add-Type -TypeDefinition $env:ORBITERM_RUNAWAYS_CS } catch {}',
      'Remove-Item Env:ORBITERM_RUNAWAYS_CS',
      '$pm = $null; try { $pm = [Windows.System.Power.PowerManager,Windows.System.Power,ContentType=WindowsRuntime] } catch {}',
      '$prod = @{}',
      'while ($true) {',
      '  $ask = [Console]::In.ReadLine()',
      '  if ($ask -eq $null) { break }',
      // Clean Up's stop (stopTree): "kill <request> <pid@started,…>" ends them, "close <request> …" asks their windows to
      // close, each only if it's still the process seen (AtlKill). The answer is one line; no reading goes with it.
      "  if ($ask.StartsWith('kill ') -or $ask.StartsWith('close ')) {",
      "    $f = $ask.Split(' '); $r = ''",
      "    if ($f.Length -ge 3) { try { $r = [AtlKill]::Do($f[2], $f[0] -eq 'kill') } catch {} }",
      '    [Console]::Out.Write("kill`t$($f[1])`t$r`n"); [Console]::Out.Flush(); continue',
      '  }',
      // "pids;n": the pids whose folder is wanted, and "n" while Clean Up's view is open (the apps' names, a few new ones each time).
      "  $parts = $ask.Split(';'); $names = $parts.Length -gt 1 -and $parts[1].Contains('n'); $nameLeft = 12",
      '  $want = @{}; foreach ($x in $parts[0].Split(",")) { $n = 0; if ([int]::TryParse($x, [ref]$n)) { $want[$n] = 1 } }',
      '  $all = Get-CimInstance Win32_Process -Filter "SessionId=$me" -Property ProcessId,ParentProcessId,Name,CommandLine,CreationDate,KernelModeTime,UserModeTime',
      '  $born = @{}; foreach ($p in $all) { $born[[int]$p.ProcessId] = $p.CreationDate }',
      '  $sb = New-Object System.Text.StringBuilder',
      '  foreach ($p in $all) {',
      '    $id = [int]$p.ProcessId; $pp = [int]$p.ParentProcessId',
      '    if (-not $p.CreationDate) { continue }',
      // A parent gone, or a later process that took its number: an orphan.
      '    $orphan = (-not $born.ContainsKey($pp)) -or ($born[$pp] -gt $p.CreationDate)',
      '    $cwd = ""',
      `    if ($want.ContainsKey($id) -or $p.Name -match '^claude(\\.exe)?$' -or $p.Name -match '${AI_NAMES}' -or ($orphan -and $p.Name -match '${SHELLS}')) { try { $cwd = [AtlCwd]::Of($id) } catch {} }`,
      '    $c = [string]$p.CommandLine; if ($c.Length -gt 400) { $c = $c.Substring(0, 400) }',
      '    $t = [DateTimeOffset]::new($p.CreationDate).ToUnixTimeMilliseconds()',
      // Whole milliseconds: a fraction would be written with the PC's own decimal sign.
      '    $cpu = [long](([double]$p.KernelModeTime + [double]$p.UserModeTime) / 10000)',
      // Its memory (Task Manager's Memory column): one cheap query per process, for Clean Up and the cards' `mem`.
      '    $m = -1; try { $m = [AtlMem]::Of($id) } catch {}',
      '    [void]$sb.Append("$id`t$pp`t$([int]$orphan)`t$t`t$cpu`t$m`t$($p.Name)`t$cwd`t$($c -replace "[`t`r`n]", " ")`n")',
      '    if ($names -and $nameLeft -gt 0 -and -not $prod.ContainsKey($p.Name)) { $nameLeft--; $prod[$p.Name] = ""; try { $prod[$p.Name] = [AtlMem]::Product($id) } catch {}; [void]$sb.Append("app`t$($p.Name)`t$($prod[$p.Name])`n") }',
      '  }',
      // The PC's memory (Clean Up's picture and the map's line).
      '  $mm = ""; try { $mm = [AtlSys]::Of() } catch {}',
      '  [void]$sb.Append("mem`t$mm`n")',
      // The battery's charge and Windows' saver, for power save (power.js): Electron tells neither. The saver as the
      // classic call reports it, or as Windows 11's PowerManager does.
      '  $pw = "0`t-1"; try { $pw = [AtlPower]::Of() } catch {}',
      '  try { if ($pm -and [string]$pm::EnergySaverStatus -eq "On") { $pw = "1" + $pw.Substring(1) } } catch {}',
      '  [void]$sb.Append("power`t$pw`n")',
      // What listens on a TCP port: a server an Antigravity left running is up, not at work.
      '  $ls = ""; try { $ls = [AtlPorts]::Listening() } catch {}',
      '  [void]$sb.Append("listen`t$ls`n")',
      '  [void]$sb.Append("end`n")',
      '  [Console]::Out.Write($sb.ToString())',
      '  [Console]::Out.Flush()',
      '}',
    ].join('\n');
    const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], {
      windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'], env: { ...process.env, ORBITERM_RUNAWAYS_CS: CWD_READER },
    });
    sampler = ps;
    ps.stdin.on('error', () => {});
    let buf = '', rows = [];
    ps.stdout.on('data', (d) => {
      buf += d.toString('utf8');
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).replace(/\r$/, '');
        buf = buf.slice(i + 1);
        if (line.startsWith('power\t')) {
          const [, saver, pct] = line.split('\t');
          if (onPower) onPower({ saver: saver === '1', charge: Number(pct) >= 0 ? Number(pct) : null });
          continue;
        }
        if (line.startsWith('listen\t')) {
          const pairs = line.slice(7).split(',').map((x) => x.split(':').map(Number)).filter(([pid, port]) => pid > 0 && port > 0);
          listening = new Set(pairs.map(([pid]) => pid));
          portsOf = new Map();
          for (const [pid, port] of pairs) {
            if (!portsOf.has(pid)) portsOf.set(pid, []);
            if (!portsOf.get(pid).includes(port)) portsOf.get(pid).push(port);
          }
          continue;
        }
        if (line.startsWith('mem\t')) {
          const f = line.slice(4).split('\t').map(Number);
          memory = f.length >= 8 && f[0] > 0
            ? { total: f[0], avail: f[1], load: f[2], commit: f[3], limit: f[4], phys: f[5], kernel: f[6], low: f[7] === 1 }
            : null;
          continue;
        }
        if (line.startsWith('app\t')) {
          const [, name, product] = line.split('\t');
          products.set(String(name).replace(/\.exe$/i, '').toLowerCase(), product || '');
          continue;
        }
        if (line.startsWith('kill\t')) {
          const [, rid, res] = line.split('\t');
          const done = killWaiting.get(rid);
          if (done) {
            killWaiting.delete(rid);
            done(new Map(String(res || '').split(',').filter(Boolean).map((x) => x.split('=')).map(([pid, s]) => [Number(pid), s])));
          }
          continue;
        }
        if (line !== 'end') {
          rows.push(line);
          continue;
        }
        try {
          read(rows, Date.now());
        } finally {
          rows = [];
          // This reading answers what waited for it (what asked during it waits for the next), and the next goes out now
          // if anyone asked for it meanwhile.
          inFlight = false;
          for (const done of waiting.splice(0)) done();
          if (again || forNext.length) ask();
        }
      }
    });
    // A reading, asked for now, or right after the one on its way (`again`). What waits for a reading requested after it
    // asked is answered by this one.
    ask = () => {
      if (sampler !== ps || !ps.stdin.writable) return;
      if (inFlight) {
        again = true;
        return;
      }
      inFlight = true;
      again = false;
      waiting.push(...forNext.splice(0));
      ps.stdin.write(`${wanted.join(',')}${wantNames ? ';n' : ''}\n`);
    };
    // Every few seconds, unless one is on its way already (it serves as this one).
    timer = setInterval(() => !inFlight && ask(), EVERY);
    ask();
    // It shouldn't end; if it does, it starts again in a while.
    ps.on('exit', () => {
      clearInterval(timer);
      sampler = null;
      // No reading is on its way any more: what waited for one goes on with the last (the next PowerShell asks anew).
      inFlight = false;
      again = false;
      for (const done of [...waiting.splice(0), ...forNext.splice(0)]) done();
      // What waited for its answer to a stop gets none (nothing was ended by it).
      for (const done of killWaiting.values()) done(new Map());
      killWaiting.clear();
      if (!stopped) setTimeout(() => !stopped && startWindows(), 30_000);
    });
  }

  function read(rows, at) {
    const next = new Map(), children = new Map();
    for (const row of rows) {
      const f = row.split('\t');
      if (f.length < 9) continue;
      const mem = Number(f[5]);
      const p = {
        pid: Number(f[0]), ppid: Number(f[1]), orphan: f[2] === '1', started: Number(f[3]), cpu: Number(f[4]), mem: mem >= 0 ? mem : null,
        name: f[6].replace(/\.exe$/i, ''), cwd: f[7], cmd: f.slice(8).join(' '), pct: 0,
      };
      if (!(p.pid > 0)) continue;
      // % of a core since the last reading, for the cars' speed.
      const prev = table.get(p.pid);
      if (prev && prev.started === p.started && p.cpu >= prev.cpu && prev.at < at) p.pct = ((p.cpu - prev.cpu) / (at - prev.at)) * 100;
      p.at = at;
      next.set(p.pid, p);
    }
    for (const p of next.values()) {
      const parent = !p.orphan && next.get(p.ppid);
      if (!parent || parent.pid === p.pid) continue;
      if (!children.has(p.ppid)) children.set(p.ppid, []);
      children.get(p.ppid).push(p.pid);
    }
    table = next;
    kids = children;
    // What goes wrong in it (the engine's reading of a Cursor transcript that vanished between its check and its open)
    // never stops the reading: it escaped as an error dialog every few seconds, and skipped Clean Up's round.
    try {
      if (onRead) onRead();
    } catch (e) {
      console.error('runaways: onRead:', e && e.stack ? e.stack : e);
    }
    const candidates = [...next.values()].filter((p) => p.orphan && SHELL_RE.test(p.name) && !/^claude$/i.test(p.name) && !aiTool(p));
    for (const p of candidates) {
      p.treePct = busy([p.pid]);
      p.treeCpu = tree(p.pid).reduce((s, t) => s + ((next.get(t.pid) || {}).cpu || 0), 0);
    }
    consider(candidates, at);
    // What goes wrong in it never stops the readings (what waits for this one is answered after it, startWindows).
    try {
      if (onDone) onDone();
    } catch (e) {
      console.error('runaways: after the reading:', e && e.stack ? e.stack : e);
    }
  }

  /** Asks the session's PowerShell to `kill` (at once) or `close` (their windows asked) `procs` [{ pid, started }], each
   *  only if it's still that process (AtlKill): pid -> ok | asked | nowindow | gone | denied. Nothing without it. */
  function signal(kind, procs) {
    const list = procs.filter((t) => t.pid > 4 && Number.isFinite(t.started));
    if (!list.length || !sampler || !sampler.stdin.writable) return Promise.resolve(new Map());
    return new Promise((resolve) => {
      const rid = String(++killRid);
      killWaiting.set(rid, resolve);
      setTimeout(() => {
        if (killWaiting.delete(rid)) resolve(new Map());
      }, 8000);
      sampler.stdin.write(`${kind} ${rid} ${list.map((t) => `${t.pid}@${Math.round(t.started)}`).join(',')}\n`);
    });
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const alive = (t) => (table.get(t.pid) || {}).started === t.started;

  /**
   * Clean Up's stop (the Mac's Proc.endTree, SPEC 9.3): the process `pid` seen at `started` and all it started, deepest
   * first. Its windows are asked to close first; what is still the same process `grace` ms on is ended at once (what it
   * started meanwhile too), each by pid and creation time, never by a process group or a stale parent number (taskkill
   * /T would follow one). `refuse(proc)`: one of the tree the caller won't end (the app, its session host, an AI): then
   * nothing is. Resolves 'stopped', 'gone' (not that process any more), 'refused' or 'failed'. A closed terminal's
   * leftover ended from its car (endLeft) goes the same way, with two seconds' grace.
   */
  async function stopTree(pid, started, { grace = 5000, refuse = () => false } = {}) {
    if (!WIN || !sampler) return 'failed';
    await fresh();
    const root = table.get(pid);
    if (!root || root.started !== started) return 'gone';
    const members = tree(pid);
    if (members.some((t) => refuse(table.get(t.pid)))) return 'refused';
    // A console program has no window to close, and nothing else asks it to stop without reaching its whole console
    // (the AI and the shell share it): with no window asked, there is nothing to wait for.
    const asked = [...(await signal('close', members)).values()].includes('asked');
    if (asked) {
      for (const until = Date.now() + grace; Date.now() < until;) {
        await sleep(1000);
        await fresh();
        if (!members.some(alive)) return 'stopped';
      }
    }
    // A fresh look either way: what the root started since the first reading is ended with it (deepest first), a console
    // program's children too (with no window asked they were missed), then what was seen at first and is still there.
    await fresh();
    const now = alive({ pid, started }) ? tree(pid).filter((t) => !members.some((m) => m.pid === t.pid && m.started === t.started)) : [];
    if (now.some((t) => refuse(table.get(t.pid)))) return 'refused';
    const targets = [...now, ...members].filter(alive);
    if (!targets.length) return 'stopped';
    await signal('kill', targets);
    for (let i = 0; i < 6; i++) {
      await sleep(400);
      await fresh();
      if (!targets.some(alive)) return 'stopped';
    }
    return 'failed';
  }

  /** A reading requested after this call (what's ended a moment later is only ended if it's still the same process).
   *  While one is on its way, every caller waits for the one after it, asked for once (`forNext`). */
  function fresh() {
    if (!sampler) return Promise.resolve();
    return new Promise((resolve) => {
      forNext.push(resolve);
      setTimeout(resolve, 4000);
      ask();
    });
  }

  /** A process and everything under it, deepest first, with when each started. */
  function tree(pid) {
    const out = [], seen = new Set();
    const walk = (p) => {
      if (seen.has(p)) return;
      seen.add(p);
      for (const c of kids.get(p) || []) walk(c);
      const t = table.get(p);
      if (t) out.push({ pid: p, started: t.started });
    };
    walk(pid);
    return out;
  }

  /** Ends, at once, what of `procs` [{ pid, started }] the latest reading still has as the same process (pid and start),
   *  through the session's PowerShell (signal, AtlKill): each opened and its creation time compared first, so a number
   *  Windows gave to another process since that reading is never touched (process.kill trusted the reading). The End of
   *  a terminal without the session host, and of a runaway, come here. Nothing without it. */
  function kill(procs) {
    return signal('kill', procs.filter(alive));
  }

  // ---------- elsewhere: ps ----------
  const seconds = (t) => t.split('-').reduce((acc, part, i, all) => {
    if (all.length === 2 && i === 0) return Number(part) * 86400;
    return acc + part.split(':').reduce((s, x) => s * 60 + Number(x), 0);
  }, 0);
  function readPs() {
    execFile('ps', ['-axo', 'pid=,ppid=,uid=,tty=,time=,lstart=,command='], { maxBuffer: 8 << 20 }, (err, out) => {
      if (err || stopped) return;
      const me = process.getuid(), all = new Map(), byParent = new Map();
      for (const line of out.split('\n')) {
        const f = line.trim().split(/\s+/);
        if (f.length < 11 || Number(f[2]) !== me) continue;
        const pid = Number(f[0]), ppid = Number(f[1]), tty = f[3];
        if (!(pid > 1)) continue;
        const command = f.slice(10).join(' ');
        const name = f[10].split('/').pop();
        if (isExcludedPosix(command, name)) continue;
        const entry = { pid, ppid, tty, name, cmd: command, started: Date.parse(f.slice(5, 10).join(' ')), cpu: seconds(f[4]) * 1000 };
        all.set(pid, entry);
        if (ppid > 1) {
          if (!byParent.has(ppid)) byParent.set(ppid, []);
          byParent.get(ppid).push(pid);
        }
      }
      table = all;
      kids = byParent;
      const list = [];
      for (const p of all.values()) {
        if (p.ppid !== 1 || p.tty !== '??' || /^claude$/i.test(p.name) || aiTool(p)) continue;
        let totalCpu = p.cpu, level = byParent.get(p.pid) || [];
        for (let d = 0; d < 6 && level.length; d++) {
          for (const c of level) totalCpu += (all.get(c) || {}).cpu || 0;
          level = level.flatMap((c) => byParent.get(c) || []);
        }
        list.push({ ...p, cpu: totalCpu });
      }
      consider(list, Date.now());
    });
  }

  return {
    start() {
      if (WIN) startWindows();
      else timer = setInterval(readPs, EVERY);
    },
    stop() {
      stopped = true;
      clearInterval(timer);
      if (sampler) sampler.kill();
    },
    json: () => json,
    // The dashboard's End button: only the process it showed (same pid, same start). Windows ends it and its tree;
    // elsewhere TERM, then KILL two seconds later if it's still there (a shell ignores TERM).
    end(pid, started) {
      const p = last.get(Number(pid));
      if (!p || Math.abs(p.started - Number(started)) > 1000) return false;
      const all = tree(Number(pid));
      // At once, deepest first: ending the root first left its children running without it until a later pass.
      if (WIN) {
        kill(all);
        return true;
      }
      const targets = all.length ? all.map((t) => t.pid) : [Number(pid)];
      let any = false;
      for (const tPid of targets) {
        try {
          process.kill(tPid, 'SIGTERM');
          any = true;
        } catch {}
      }
      if (!any) return false;
      setTimeout(() => {
        const q = last.get(Number(pid));
        if (q && q.started === p.started) {
          for (const tPid of targets) {
            try {
              process.kill(tPid, 'SIGKILL');
            } catch {}
          }
        }
      }, 2000);
      return true;
    },
    /**
     * What closed terminals left running, for the orbit's amber cars: a shell or runtime whose parent is gone, that has
     * run for a few seconds (not a launcher's step on its way) and isn't burning a core (that's a runaway's alarm), a
     * busy job started by a live AI session, nor an AI session itself (that's a planet on the orbit).
     */
    left(live) {
      if (Array.isArray(live)) {
        liveSessions = live.filter((s) => s && s.cwd).map((s) => {
          const proc = s.pid ? table.get(s.pid) : null;
          return { cwd: s.cwd, started: (proc && proc.started) || s.started || 0, busy: s.status === 'busy' };
        });
      }
      const burning = new Set(JSON.parse(json).map((r) => r.pid));
      const now = Date.now(), out = [];
      for (const p of table.values()) {
        if (!p.orphan || !SHELL_RE.test(p.name) || /^claude$/i.test(p.name) || aiTool(p) || burning.has(p.pid) || now - p.started < 10_000) continue;
        const cpu = busy([p.pid]);
        if (cpu >= 1) busyUntil.set(p.pid, now + 15_000);
        if (ownerSession(p)) continue;
        out.push({ pid: p.pid, started: p.started, name: p.name, cmd: p.cmd || p.name, cwd: p.cwd, cpu });
      }
      return out.sort((a, b) => a.started - b.started);
    },
    /** A left-behind process ended from its car: it and all it started, gently first (a window of its own is asked to
     *  close, as taskkill does), at once two seconds later for what's still there. Only the process the page showed.
     *  Clean Up's stop (stopTree), each by pid and creation time: taskkill /T built the tree from parent numbers, which
     *  a reused pid could have taken. */
    endLeft(pid, started) {
      const p = table.get(Number(pid));
      if (!WIN || !p || Math.abs(p.started - Number(started)) > 1000) return false;
      stopTree(p.pid, p.started, { grace: 2000 }).catch((e) => console.error('runaways: endLeft:', e && e.stack ? e.stack : e));
      return true;
    },
    tree,
    kill,
    fresh,
    /** A process's children, oldest first: [{ pid, name, cmd, cwd }]. */
    children: (pid) => (kids.get(pid) || []).map((c) => table.get(c)).filter(Boolean).sort((a, b) => a.started - b.started),
    /** A process's parents' pids, nearest first, as far as the last reading knows them. */
    parents(pid) {
      const out = [];
      const p = table.get(pid);
      for (let q = p && !p.orphan && table.get(p.ppid); q && out.length < 12; q = !q.orphan && table.get(q.ppid)) out.push(q.pid);
      return out;
    },
    /** % of a core the processes under `roots` used over the last reading. */
    busy,
    /**
     * One process alone, as the Mac's RadarEngine reads each live Claude's (pollProcesses): the % of a core it used over
     * the last reading (one decimal) and its memory (the reading's `mem`, whole MB), or null when the last reading hasn't
     * it. The engine's Claude sessions take theirs from here (setOthers), so the cards' cpu and mem cost no query of their
     * own.
     */
    usage(pid) {
      const p = table.get(pid);
      return p ? { cpu: Math.round((p.pct || 0) * 10) / 10, mem: megabytes(p.mem) } : null;
    },
    /**
     * The other AI tools running in a terminal (aiTool, TERMINAL_RE), each once: a launcher's child that's the same tool
     * (Codex's Node script starts its own codex.exe) isn't another, nor one Claude runs. Its CPU is all it runs: the
     * launcher only waits while its child works. [{ pid, started, tool, cwd, pct, mem (MB), chain (its parents) }]
     * An Antigravity's also carries what it runs, for the engine's agyPendingWork (it goes on by itself after its turn):
     * `procs`, every process under it (ten levels down) with its parent, start, depth and whether it listens on a TCP port;
     * and `childBusy`, whether a command it started (past the helpers it starts with, such as an MCP server: five seconds
     * after its own start) used the CPU in the last reading, as the Mac's RadarEngine sets childCpuAt.
     */
    ais() {
      const found = new Map();
      for (const p of table.values()) {
        // `codex app-server` serves a program, no one at a keyboard: the engine's own reader of Codex's limits, under a
        // cmd.exe that would pass for a terminal, flew as a Codex planet (and stayed two minutes as an ended one).
        if (/\bapp-server\b/.test(p.cmd || '')) continue;
        // Nor `agy -p /usage`: the engine's reader of Antigravity's limits, once a minute while an Antigravity chat runs.
        if (/(^|\s)-p\s+"?\/usage\b/.test(p.cmd || '')) continue;
        const tool = aiTool(p);
        // Nor the user's own one-shot Antigravity runs (agyOneShot).
        if (tool === 'Antigravity' && agyOneShot(p.cmd)) continue;
        if (tool === 'Cursor' && cursorOneShot(p.cmd)) continue;
        if (tool) found.set(p.pid, tool);
      }
      const out = [];
      for (const [pid, tool] of found) {
        const p = table.get(pid);
        if (!p.orphan && found.has(p.ppid)) continue;
        const chain = [];
        for (let q = !p.orphan && table.get(p.ppid); q && chain.length < 12; q = !q.orphan && table.get(q.ppid)) chain.push(q);
        if (chain.some((q) => /^claude$/i.test(q.name)) || !chain.some((q) => TERMINAL_RE.test(q.name))) continue;
        const shell = shellCommand(pid);
        // `mem`: the tool's own process in RAM (MB), as the Mac's O.mem (a launcher's, for one that has one, as there).
        const ai = { pid, started: p.started, tool, cwd: p.cwd || '', cmd: p.cmd || '', pct: busy([pid]), mem: megabytes(p.mem), chain: chain.map((q) => q.pid), command: shell && shell.line, commandStarted: shell && shell.started };
        // A Cursor's too: when a command it started last used the CPU tells a call at work from one waiting for the user's
        // approval (the engine's otherStatus), as the Mac's childCpuAt does.
        if (tool === 'Antigravity' || tool === 'Cursor') {
          const procs = [];
          let level = kids.get(pid) || [];
          for (let depth = 0; depth < 10 && level.length; depth++) {
            for (const c of level) {
              const q = table.get(c);
              if (q) procs.push({ pid: c, ppid: q.ppid, started: q.started, depth, listens: listening.has(c) });
            }
            level = level.flatMap((c) => kids.get(c) || []);
          }
          ai.procs = procs;
          ai.childBusy = procs.some((q) => q.started >= p.started + 5000 && ((table.get(q.pid) || {}).pct || 0) >= 1);
        }
        out.push(ai);
      }
      return out;
    },
    /** Processes whose folder the next reading should look up (the terminals' shells, for a path Ctrl-clicked; Clean Up's
     *  programs), each asker's list kept apart. */
    want(pids, who = 'terminals') {
      wantedBy.set(who, pids);
      wanted = [...new Set([...wantedBy.values()].flat())].filter((p) => p > 0);
    },
    /** A process's folder as the last reading found it (one asked for with `want`), or ''. */
    cwd: (pid) => (table.get(pid) || {}).cwd || '',
    // ---------- for Clean Up (cleanup.js) ----------
    /** The latest reading of every process (pid -> its row), as it is. */
    table: () => table,
    /** A process's children's pids, as the latest reading links them (never through a parent gone or reused). */
    kidsOf: (pid) => kids.get(pid) || [],
    /** The TCP ports a process listens on. */
    ports: (pid) => portsOf.get(pid) || [],
    /** The PC's memory as of the latest reading (null elsewhere, or before the first one). */
    memory: () => memory,
    /** The name an exe's app goes by ('' for one of Windows' own; undefined: not looked up yet). */
    product: (name) => products.get(String(name || '').toLowerCase()),
    /** Clean Up's view is open: the apps' names are looked up, a few new ones each reading. */
    wantNames(on) {
      wantNames = !!on;
    },
    stopTree,
  };

  // The command a tool has a shell run right now (`powershell -Command "npm test"`, `cmd /c …`, `bash -c …`), from the
  // processes under it: the one started last, and when it started (the engine tells a turn's command from a server the
  // tool keeps by it).
  function shellCommand(pid) {
    let level = kids.get(pid) || [], found = null;
    for (let depth = 0; depth < 3 && level.length; depth++) {
      for (const c of level) {
        const p = table.get(c);
        if (!p || !/^(powershell|pwsh|cmd|bash|sh|zsh)$/i.test(p.name)) continue;
        // The app's own Codex hook (codexhooks.js) is no command of the user's: it would answer the request it keeps. Nor is
        // its Cursor hook (cursorhooks.js), which runs under Cursor for a moment on each of its events.
        if (/[\\/]atalay-terminal[\\/](codex-(hook\.ps1|waiting)|cursor-hook\.exe)/i.test(p.cmd || '')) continue;
        const m = /\s(?:-Command|-c|-lc|\/c)\s+(.+)$/i.exec(p.cmd || '');
        if (m && (!found || p.started >= found.started)) found = { line: m[1].replace(/^"(.*)"$/, '$1').slice(0, 120), started: p.started };
      }
      level = level.flatMap((c) => kids.get(c) || []);
    }
    return found;
  }

  function busy(roots) {
    let pct = 0;
    for (const r of roots) for (const t of tree(r)) pct += (table.get(t.pid) || {}).pct || 0;
    return pct;
  }
}

// aiTool too: Clean Up tells an AI's own process from what it started (cleanup.js).
module.exports = { createRunaways, aiTool };
