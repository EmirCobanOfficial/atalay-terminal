'use strict';
// Claude's usage limits (the 5-hour and the weekly window) for the dashboard's top bar: the Windows side of the Mac app's
// Limits.swift. Claude Code runs the `statusLine` command from its settings.json on every status update and passes its
// status JSON on stdin; the script keeps the latest one that carries `rate_limits` in `file`, which the engine reads.
// A status line the user had before stays in use: its command moves to `statusline-next` and still gets the JSON.
const fs = require('fs');
const path = require('path');

// PowerShell, as Claude Code can run the command from Git Bash or from PowerShell. A status line the user had runs as
// Claude Code would run it: through Git Bash when it's installed, else PowerShell (cmd would break a bash command).
const script = (root) => `# Orbiterm: Claude Code passes its status JSON here (statusLine in its settings.json). The latest one that
# carries the account's usage limits is kept for the dashboard. A status line of your own (statusline-next) still gets
# the JSON and shows what it prints, run as Claude Code runs one: through Git Bash when it's installed, else PowerShell.
$ErrorActionPreference = 'SilentlyContinue'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
# The JSON's own bytes (UTF-8), not the console code page's reading of them.
$buf = New-Object IO.MemoryStream
[Console]::OpenStandardInput().CopyTo($buf)
$bytes = $buf.ToArray()
$json = [Text.Encoding]::UTF8.GetString($bytes)
if ($json -match '"rate_limits"') {
  # Run with CLAUDE_CONFIG_DIR set to one of Orbiterm's accounts (Orbiterm sets it for that account's terminals) it writes
  # limits-claude-<first 8 hex of the sha256 of the folder's path>.json, so each account's limits stay apart; any other
  # (unset, the default folder, a folder of the user's own) writes limits.json, as before there were accounts.
  # The folder is baked in as Base64 of its UTF-8: Windows PowerShell reads a script without a BOM in the ANSI code page, which
  # would garble a user folder with a letter outside ASCII, and every account's limits would land in limits.json. The script
  # itself stays ASCII.
  $name = 'limits.json'
  $cfg = $env:CLAUDE_CONFIG_DIR
  $root = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${Buffer.from(root, 'utf8').toString('base64')}'))
  if ($cfg -and $cfg.Length -gt $root.Length + 1 -and $cfg.StartsWith($root + [char]92, [StringComparison]::OrdinalIgnoreCase)) {
    $sha = [Security.Cryptography.SHA256]::Create()
    $hex = [BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($cfg))).Replace('-', '').ToLower()
    $name = 'limits-claude-' + $hex.Substring(0, 8) + '.json'
  }
  $tmp = Join-Path $dir ('limits.' + $PID + '.tmp')
  [IO.File]::WriteAllBytes($tmp, $bytes)
  Move-Item -Force -LiteralPath $tmp -Destination (Join-Path $dir $name)
}
$next = Join-Path $dir 'statusline-next'
if (-not (Test-Path -LiteralPath $next) -or (Get-Item -LiteralPath $next).Length -eq 0) { exit 0 }
# Its command is read from the file, so no quote in it is lost on the way, and gets the JSON as UTF-8.
$OutputEncoding = New-Object Text.UTF8Encoding $false
$git = $env:Path -split ';' | Where-Object { $_ } | ForEach-Object { "$_\\git.exe" } | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
$bash = @($env:CLAUDE_CODE_GIT_BASH_PATH, $(if ($git) { Join-Path (Split-Path (Split-Path $git)) 'bin\\bash.exe' }),
  "$env:ProgramFiles\\Git\\bin\\bash.exe", "$env:LOCALAPPDATA\\Programs\\Git\\bin\\bash.exe") |
  Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
if ($bash) {
  $script = $next.Replace([char]92, [char]47)
  $json | & $bash $script
} else {
  $ps1 = Join-Path $dir 'statusline-next.ps1'
  Copy-Item -Force -LiteralPath $next -Destination $ps1
  $json | & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ps1
}
exit 0
`;

/**
 * createLimits({ dir, claudeDir, accountsRoot, accountDirs }): `dir` is the app's data folder (limits.json lands in it),
 * `claudeDir` Claude Code's; `accountsRoot` Orbiterm's accounts folder (baked into the script), `accountDirs()` the other
 * accounts' folders. install() writes the script and hooks it into every account's settings; it never throws.
 * ensure() is the cheap check (a file compare) that the script installed is this build's: an older app that shares the
 * folder (the installed one next to staging) writes its own at its launch, which sends every account's limits to limits.json.
 */
function createLimits({ dir, claudeDir, accountsRoot, accountDirs }) {
  const SCRIPT = script(accountsRoot || '');
  const scriptFile = path.join(dir, 'statusline.ps1');
  const nextFile = path.join(dir, 'statusline-next');
  // Forward slashes: the same command works from Git Bash, cmd and PowerShell.
  const ours = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptFile.replace(/\\/g, '/')}"`;

  function writeScript() {
    let have = null;
    try {
      have = fs.readFileSync(scriptFile, 'utf8');
    } catch {}
    if (have === SCRIPT) return;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(scriptFile, SCRIPT);
  }

  // Points Claude Code's statusLine at the script, or the limits never reach the dashboard. A settings file that doesn't
  // read as JSON is left alone.
  function hook(settingsFile) {
    const folder = path.dirname(settingsFile);
    let settings = {};
    let raw = null;
    try {
      raw = fs.readFileSync(settingsFile, 'utf8');
    } catch {}
    if (raw !== null) {
      try {
        settings = JSON.parse(raw.replace(/^﻿/, ''));
      } catch {
        return;
      }
      if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return;
    }
    const line = settings.statusLine && typeof settings.statusLine === 'object' ? settings.statusLine : {};
    const current = typeof line.command === 'string' ? line.command : '';
    if (current === ours) return;
    if (current) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(nextFile, current);
    }
    settings.statusLine = { ...line, type: 'command', command: ours };
    fs.mkdirSync(folder, { recursive: true });
    const tmp = settingsFile + '.atl.tmp';
    fs.writeFileSync(tmp, JSON.stringify(settings, null, 2));
    fs.renameSync(tmp, settingsFile);
  }

  // Every account's settings.json, once per real file: a link (or a junction's file) is written through to what it points
  // at, so the link stays one, and a copy made without Developer Mode is hooked on its own.
  function settingsFiles() {
    const out = new Map();
    const add = (file) => {
      let real = file;
      try {
        real = fs.realpathSync.native(file);
      } catch {}
      out.set(process.platform === 'win32' ? real.toLowerCase() : real, real);
    };
    add(path.join(claudeDir, 'settings.json'));
    for (const d of typeof accountDirs === 'function' ? accountDirs() : []) {
      // Another account's folder that isn't there (being removed): not made again for a settings file.
      if (fs.existsSync(d)) add(path.join(d, 'settings.json'));
    }
    return [...out.values()];
  }

  function installAll() {
    writeScript();
    for (const f of settingsFiles()) {
      try {
        hook(f);
      } catch (e) {
        console.error('limits:', e.message);
      }
    }
  }

  return {
    file: path.join(dir, 'limits.json'),
    install() {
      try {
        installAll();
      } catch (e) {
        console.error('limits:', e.message);
      }
    },
    ensure() {
      try {
        let have = null;
        try {
          have = fs.readFileSync(scriptFile, 'utf8');
        } catch {}
        if (have !== SCRIPT) installAll();
      } catch (e) {
        console.error('limits:', e.message);
      }
    },
  };
}

module.exports = { createLimits };
