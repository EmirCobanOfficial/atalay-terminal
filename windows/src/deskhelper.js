'use strict';
// The desktop, for Viktoria (mascot.js): what the Mac app reads with CGWindowListCopyWindowInfo, NSEvent.pressedMouseButtons
// and CGWarpMouseCursorPosition. One long-lived PowerShell loads a little C# (Add-Type) and answers a line on its input
// with the answer and "end", as runaways.js's does; it ends with its input, so it never outlives the app, and nothing is
// started per call. Two questions:
// - windows(): the windows on screen, front to back, as `{ hwnd, pid, topmost, l, t, r, b }` in physical pixels (each
//   window's visible frame). Visible ones only: not minimized, not cloaked (another virtual desktop's, a hidden app's),
//   no tool windows, no desktop or taskbar. No titles and no process names are read, as on the Mac.
// - hold({ x, y }, pid): the cursor to that physical point, only while a window of process `pid` (the app) is in front
//   ("away" otherwise). The mouse buttons are not read here: the overlay's own mouse events end a hold (mascot.js).
// Everything fails soft: where it can't run (not Windows, PowerShell or the compile refusing, an antivirus in the way) it
// says so once in the log and every answer is null, and the app goes on without it.
const { spawn } = require('child_process');

const WIN = process.platform === 'win32';

// Windows PowerShell 5.1 compiles C# 5: no interpolated strings, no `out var`.
const DESK = `
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class AtlDesk {
  delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] struct RECT { public int L; public int T; public int R; public int B; }
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc p, IntPtr l);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll", EntryPoint = "GetWindowLongW")] static extern int GetWindowLong(IntPtr h, int i);
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr c);
  [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h, int a, out RECT r, int size);
  [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h, int a, out int v, int size);

  // One window per line: "hwnd pid topmost left top right bottom", front to back (EnumWindows' order).
  public static string Wins() {
    IntPtr old = SetThreadDpiAwarenessContext(new IntPtr(-4));
    StringBuilder sb = new StringBuilder();
    try {
      int n = 0;
      EnumWindows(delegate(IntPtr h, IntPtr l) {
        if (n >= 200) return false;
        if (!IsWindowVisible(h) || IsIconic(h)) return true;
        int ex = GetWindowLong(h, -20);
        if ((ex & 0x80) != 0 && (ex & 0x40000) == 0) return true;
        if ((ex & 0x08000000) != 0) return true;
        if ((ex & 0x20) != 0) return true;
        int cloaked = 0;
        if (DwmGetWindowAttribute(h, 14, out cloaked, 4) == 0 && cloaked != 0) return true;
        StringBuilder cls = new StringBuilder(64);
        GetClassName(h, cls, 64);
        string c = cls.ToString();
        if (c == "Progman" || c == "WorkerW" || c == "Shell_TrayWnd" || c == "Shell_SecondaryTrayWnd") return true;
        RECT r;
        if (DwmGetWindowAttribute(h, 9, out r, 16) != 0) { if (!GetWindowRect(h, out r)) return true; }
        if (r.R - r.L < 20 || r.B - r.T < 20) return true;
        uint pid;
        GetWindowThreadProcessId(h, out pid);
        sb.Append(h.ToInt64()).Append(' ').Append(pid).Append(' ').Append((ex & 8) != 0 ? 1 : 0).Append(' ')
          .Append(r.L).Append(' ').Append(r.T).Append(' ').Append(r.R).Append(' ').Append(r.B).Append("\\n");
        n++;
        return true;
      }, IntPtr.Zero);
    } catch (Exception) {
    } finally {
      if (old != IntPtr.Zero) SetThreadDpiAwarenessContext(old);
    }
    return sb.ToString();
  }

  // "away" unless the window in front belongs to process pid (the app's own: the cursor is never taken from another
  // app), else the cursor moves. Mouse buttons are the app's own windows to see (mascot.js), nothing here reads them.
  public static string Hold(int x, int y, int pid) {
    IntPtr fg = GetForegroundWindow();
    uint fpid = 0;
    if (fg != IntPtr.Zero) GetWindowThreadProcessId(fg, out fpid);
    if (fpid != (uint)pid) return "away";
    IntPtr old = SetThreadDpiAwarenessContext(new IntPtr(-4));
    try { SetCursorPos(x, y); } finally { if (old != IntPtr.Zero) SetThreadDpiAwarenessContext(old); }
    return "ok";
  }
}`;

function createDesk() {
  let ps = null, ready = false, dead = false, logged = false, failures = 0, stopping = false;
  const queue = []; // the questions asked and not yet answered, in order: { kind, lines, resolve, timer }
  let pendingWindows = null, holdBusy = false;
  let buf = '';

  function say(msg) {
    if (logged) return;
    logged = true;
    console.warn(`deskhelper: ${msg}; Viktoria goes on without window positions and cursor holds`);
  }

  function giveUp(msg) {
    dead = true;
    say(msg);
  }

  // Everything waiting gets null.
  function drain() {
    while (queue.length) {
      const q = queue.shift();
      clearTimeout(q.timer);
      q.resolve(null);
    }
  }

  function onLine(line) {
    if (!ready) {
      if (line === 'ready') {
        ready = true;
        return;
      }
      if (line === 'broken') return void (giveUp("the helper's C# didn't compile"), kill());
      return;
    }
    const q = queue[0];
    if (!q) return;
    if (line === 'end') {
      queue.shift();
      clearTimeout(q.timer);
      failures = 0;
      q.resolve(q.lines);
      return;
    }
    q.lines.push(line);
  }

  function kill() {
    const p = ps;
    ps = null;
    ready = false;
    buf = '';
    drain();
    if (!p) return;
    try {
      p.stdin.end();
    } catch {}
    setTimeout(() => {
      try {
        p.kill();
      } catch {}
    }, 1500);
  }

  function start() {
    if (!WIN || dead || stopping) return false;
    if (ps) return true;
    const script = [
      '$ErrorActionPreference = "SilentlyContinue"',
      'try { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false) } catch {}',
      '$ok = $true',
      `try { Add-Type -TypeDefinition @'\n${DESK}\n'@ } catch { $ok = $false }`,
      'if (-not ([System.Management.Automation.PSTypeName]"AtlDesk").Type) { $ok = $false }',
      '[Console]::Out.Write($(if ($ok) { "ready`n" } else { "broken`n" }))',
      '[Console]::Out.Flush()',
      'while ($true) {',
      '  $ask = [Console]::In.ReadLine()',
      '  if ($ask -eq $null) { break }',
      '  $out = ""',
      '  try {',
      '    $p = $ask.Split(" ")',
      '    if ($p[0] -eq "W") { $out = [AtlDesk]::Wins() }',
      '    elseif ($p[0] -eq "H") { $out = [AtlDesk]::Hold([int]$p[1], [int]$p[2], [int]$p[3]) + "`n" }',
      '  } catch {}',
      '  [Console]::Out.Write($out + "end`n")',
      '  [Console]::Out.Flush()',
      '}',
    ].join('\n');
    let child;
    try {
      child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
    } catch (e) {
      giveUp(`PowerShell wouldn't start (${e.message})`);
      return false;
    }
    ps = child;
    child.stdin.on('error', () => {});
    child.stdout.on('data', (d) => {
      if (ps !== child) return;
      buf += d.toString('utf8');
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        onLine(buf.slice(0, i).replace(/\r$/, ''));
        buf = buf.slice(i + 1);
      }
    });
    child.on('error', (e) => {
      if (ps === child) {
        giveUp(`PowerShell wouldn't start (${e.message})`);
        kill();
      }
    });
    child.on('exit', () => {
      if (ps !== child) return;
      ps = null;
      ready = false;
      buf = '';
      const hadWork = queue.length > 0;
      drain();
      if (!stopping && !dead && ++failures >= 3) giveUp('the helper keeps ending');
      else if (hadWork && !stopping) say('the helper ended');
    });
    return true;
  }

  // One question; its answer's lines, or null (no helper, no answer in time).
  function ask(kind, line) {
    if (!start() || !ps) return Promise.resolve(null);
    return new Promise((resolve) => {
      const q = { kind, lines: [], resolve, timer: null };
      // The first answer waits for the compile (a few seconds on a slow PC), later ones for a moment only.
      q.timer = setTimeout(() => {
        const i = queue.indexOf(q);
        if (i < 0) return;
        // An answer that comes late would be read as the next one's: the helper starts over.
        failures++;
        if (failures >= 3) giveUp('the helper stopped answering');
        kill();
      }, ready ? 3000 : 25_000);
      queue.push(q);
      try {
        ps.stdin.write(`${line}\n`);
      } catch {
        kill();
      }
    });
  }

  return {
    available: () => WIN && !dead,
    start,
    // [{ hwnd, pid, topmost, l, t, r, b }] front to back, or null.
    windows() {
      if (pendingWindows) return pendingWindows;
      pendingWindows = ask('W', 'W').then((lines) => {
        pendingWindows = null;
        if (!lines) return null;
        const out = [];
        for (const ln of lines) {
          const p = ln.split(' ').map(Number);
          if (p.length === 7 && p.every(Number.isFinite)) out.push({ hwnd: p[0], pid: p[1], topmost: p[2] === 1, l: p[3], t: p[4], r: p[5], b: p[6] });
        }
        return out;
      });
      return pendingWindows;
    },
    // "ok", "away" (the window in front isn't of process `pid`: nothing moved) or null (no helper, not ready yet, or still
    // busy with the last one). Never asked before the helper has said it is ready: the first answer would wait behind the
    // compile, and a hold is only good for the moment it was asked in.
    hold(pt, pid) {
      if (!ready || holdBusy || !pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y) || !Number.isInteger(pid) || pid <= 0) return Promise.resolve(null);
      holdBusy = true;
      return ask('H', `H ${Math.round(pt.x)} ${Math.round(pt.y)} ${pid}`).then((lines) => {
        holdBusy = false;
        return lines && (lines[0] === 'ok' || lines[0] === 'away') ? lines[0] : null;
      });
    },
    // Ends with its input; a later start() makes a new one.
    stop() {
      stopping = true;
      kill();
      stopping = false;
      pendingWindows = null;
      holdBusy = false;
    },
  };
}

module.exports = { createDesk };
