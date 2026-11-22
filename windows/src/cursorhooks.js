'use strict';
// Cursor's CLI (cursor-agent, `agent`) for the dashboard, the Windows side of the Mac's CursorHooks.swift. It writes no log
// of what it does that Orbiterm can follow, but it runs hooks (%USERPROFILE%\.cursor\hooks.json,
// https://cursor.com/docs/hooks) with the conversation id, the model and the event's data on stdin. Orbiterm's hook
// program (cursorhooks.cs, compiled here into the app's folder) keeps each conversation's events in a file of its own
// (`dir\<conversation id>.jsonl`, one line per event) and, for the events of the conversation itself, which cursor-agent
// process (its pid) is in which conversation (`dir\pid\<pid>`). The engine reads those (engine.js readCursorEvents): the
// turn open or over, the tools it calls, its subagents, its tokens; tokenledger.js reads their tokens for the leaderboard.
// The program decides nothing and prints nothing, so Cursor asks and acts as usual; it does nothing when no cursor-agent
// is above it (the Cursor editor runs the same hooks file).
//
// A command here runs from cmd.exe and from PowerShell alike, whichever Cursor hands it to: `cmd.exe /d /c "<program>"
// <event>` (a quoted program first would be a string to PowerShell, not a command). A program, not a script: Cursor waits
// for its preToolUse before every tool call, and PowerShell takes a second or more to start on a busy PC.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

// The events it takes. None of them can change what Cursor does: the program prints nothing.
const EVENTS = ['sessionStart', 'sessionEnd', 'beforeSubmitPrompt', 'stop', 'preToolUse', 'postToolUse', 'postToolUseFailure',
  'afterAgentResponse', 'preCompact'];

/**
 * createCursorHooks({ ownDir, cursorDir, source }): `ownDir` is the app's folder in %LOCALAPPDATA% (the same for every build
 * and profile, so all of them read the same events), `cursorDir` Cursor's (CURSOR_CONFIG_DIR or ~/.cursor), `source` the
 * hook program's C# (cursorhooks.cs; tests give their own).
 */
function createCursorHooks({ ownDir, cursorDir, source = path.join(__dirname, 'cursorhooks.cs') }) {
  const dir = path.join(ownDir, 'cursor-events');
  const pidDir = path.join(dir, 'pid');
  const exe = path.join(ownDir, 'cursor-hook.exe');
  // The source the program was built from, beside it: a changed one builds it again.
  const builtFrom = path.join(ownDir, 'cursor-hook.cs');
  const hooksFile = path.join(cursorDir, 'hooks.json');
  const command = (event) => `cmd.exe /d /c "${exe}" ${event}`;
  // One of the app's hooks, whatever its event and however an earlier version wrote it.
  const ours = (cmd) => typeof cmd === 'string' && /[\\/]atalay-terminal[\\/]cursor-hook\.(exe|ps1)\b/i.test(cmd);

  function readJSON(file) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch (e) {
      // Only a file that isn't there is empty: one that can't be read now (locked by an editor, OneDrive, an antivirus)
      // is left alone, or the user's own hooks would be written over with ours alone.
      return e && e.code === 'ENOENT' ? {} : null;
    }
    if (!text.trim()) return {};
    try {
      const j = JSON.parse(text.replace(/^﻿/, ''));
      return j && typeof j === 'object' && !Array.isArray(j) ? j : null;
    } catch {
      return null;
    }
  }

  function writeFile(file, data) {
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, data);
    try {
      fs.renameSync(tmp, file);
    } catch {
      try {
        fs.unlinkSync(tmp);
      } catch {}
      fs.writeFileSync(file, data);
    }
  }

  // hooks.json written back, through a link (dotfiles) to its target: the link stays.
  function writeHooks(root) {
    let target = hooksFile;
    try {
      target = fs.realpathSync(hooksFile);
    } catch {}
    writeFile(target, JSON.stringify(root, null, 2) + '\n');
  }

  let building = null;
  /**
   * The hook program, built once per source by .NET Framework's C# compiler (as sessionhost.js builds host.cs) under a
   * name that stays, so hooks.json never changes with it. A running one (a hook at work) is moved aside, not overwritten;
   * the ones moved aside go at a later build. Resolves to the program's path; rejects when it can't be built.
   */
  function build() {
    if (building) return building;
    building = (async () => {
      const code = fs.readFileSync(source, 'utf8');
      let had = null;
      try {
        had = fs.readFileSync(builtFrom, 'utf8');
      } catch {}
      if (had === code && fs.existsSync(exe)) return exe;
      fs.mkdirSync(ownDir, { recursive: true });
      for (const f of fs.readdirSync(ownDir)) {
        if (/^cursor-hook\.old-\d+\.exe$/.test(f)) fs.rm(path.join(ownDir, f), { force: true }, () => {});
      }
      const cs = path.join(ownDir, `cursor-hook-${process.pid}.cs`);
      const out = path.join(ownDir, `cursor-hook-${process.pid}.exe`);
      fs.writeFileSync(cs, code);
      const csc = path.join(process.env.SystemRoot || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe');
      try {
        // A windows program, not a console one: no console of its own; its stdin is Cursor's pipe all the same.
        await new Promise((resolve, reject) => {
          cp.execFile(csc, ['/nologo', '/target:winexe', '/optimize+', `/out:${out}`, cs], { windowsHide: true, timeout: 60_000 },
            (err, stdout) => (err ? reject(new Error(`csc: ${String(stdout || err.message).trim().split(/\r?\n/)[0]}`)) : resolve()));
        });
        if (fs.existsSync(exe)) {
          try {
            fs.renameSync(exe, path.join(ownDir, `cursor-hook.old-${process.pid}.exe`));
          } catch {}
        }
        fs.renameSync(out, exe);
        fs.renameSync(cs, builtFrom);
      } finally {
        fs.rm(cs, { force: true }, () => {});
        fs.rm(out, { force: true }, () => {});
      }
      return exe;
    })().finally(() => {
      building = null;
    });
    return building;
  }

  // Event files of conversations quiet for two weeks, and pointers of processes quiet for a day, go.
  function prune() {
    const now = Date.now();
    for (const [folder, age] of [[dir, 14 * 86_400_000], [pidDir, 86_400_000]]) {
      let names = [];
      try {
        names = fs.readdirSync(folder);
      } catch {
        continue;
      }
      for (const name of names) {
        if (name === 'pid') continue;
        const p = path.join(folder, name);
        try {
          if (now - fs.statSync(p).mtimeMs > age) fs.rmSync(p, { force: true });
        } catch {}
      }
    }
  }

  return {
    dir,
    pidDir,
    hooksFile,
    EVENTS,

    /**
     * Builds the program and adds its hooks to Cursor's hooks.json, next to the user's own; once there, nothing changes,
     * and one an earlier version wrote differently gives way to this one's. A hooks.json that doesn't read as JSON is left
     * alone; without Cursor's folder, nothing (and nothing is built). Never throws; resolves to whether the hooks are in.
     */
    async install() {
      try {
        if (!fs.existsSync(cursorDir)) return false;
        fs.mkdirSync(pidDir, { recursive: true });
        prune();
        await build();
        const root = readJSON(hooksFile);
        if (!root) return false;
        // A "hooks" that isn't an object is the user's to fix: left as it is rather than replaced.
        if (root.hooks !== undefined && (!root.hooks || typeof root.hooks !== 'object' || Array.isArray(root.hooks))) return false;
        const hooks = root.hooks || {};
        let changed = false;
        for (const [event, list] of Object.entries(hooks)) {
          if (!Array.isArray(list)) continue;
          // Ours for an event it no longer takes, or written differently: out, the user's entries kept.
          const kept = list.filter((h) => !(h && ours(h.command) && (!EVENTS.includes(event) || h.command !== command(event))));
          if (kept.length === list.length) continue;
          changed = true;
          if (kept.length) hooks[event] = kept;
          else delete hooks[event];
        }
        for (const event of EVENTS) {
          // An event the user wrote as something else than a list stays theirs.
          if (hooks[event] !== undefined && !Array.isArray(hooks[event])) continue;
          const list = Array.isArray(hooks[event]) ? hooks[event] : [];
          if (list.some((h) => h && h.command === command(event))) continue;
          list.push({ command: command(event), timeout: 5 });
          hooks[event] = list;
          changed = true;
        }
        if (!changed) return true;
        root.hooks = hooks;
        if (root.version === undefined) root.version = 1;
        writeHooks(root);
        return true;
      } catch (e) {
        console.error('cursor hooks:', e.message);
        return false;
      }
    },

    /** Takes the app's hooks out of hooks.json again, only them: the user's own entries, and the file, stay. Never throws. */
    uninstall() {
      try {
        const root = readJSON(hooksFile);
        if (!root || !root.hooks || typeof root.hooks !== 'object' || Array.isArray(root.hooks)) return;
        let changed = false;
        for (const [event, list] of Object.entries(root.hooks)) {
          if (!Array.isArray(list)) continue;
          const kept = list.filter((h) => !(h && ours(h.command)));
          if (kept.length === list.length) continue;
          changed = true;
          if (kept.length) root.hooks[event] = kept;
          else delete root.hooks[event];
        }
        if (changed) writeHooks(root);
      } catch (e) {
        console.error('cursor hooks:', e.message);
      }
    },

    /** Whether the app's hooks are in hooks.json now. */
    installed() {
      const root = readJSON(hooksFile);
      const hooks = root && root.hooks;
      if (!hooks || typeof hooks !== 'object') return false;
      return Object.values(hooks).some((list) => Array.isArray(list) && list.some((h) => h && ours(h.command)));
    },

    /** When the hooks went into hooks.json (its last change, ms), null when they aren't there. A cursor-agent started
     *  before that never read them. */
    installedAt() {
      if (!this.installed()) return null;
      try {
        return fs.statSync(hooksFile).mtimeMs;
      } catch {
        return null;
      }
    },

    /** The conversation a cursor-agent process (`pid`, started at `since` ms) is in, from its last pointer. */
    conversation(pid, since) {
      const file = path.join(pidDir, String(pid));
      try {
        if (fs.statSync(file).mtimeMs < since - 5000) return null;
        const id = fs.readFileSync(file, 'utf8').trim();
        return /^[A-Za-z0-9._-]{1,128}$/.test(id) ? id : null;
      } catch {
        return null;
      }
    },

    /** A conversation's event file. */
    log: (conversation) => path.join(dir, `${conversation}.jsonl`),

    /**
     * The offset of the first line of an event file from `since` (ms) on, the end when there is none: where a process that
     * resumed a chat begins reading, past what earlier processes wrote, but at its own turn when it is mid-turn.
     */
    offset(file, since) {
      let st;
      try {
        st = fs.statSync(file);
      } catch {
        return 0;
      }
      const from = st.size > 2 << 20 ? st.size - (2 << 20) : 0;
      const buf = Buffer.alloc(st.size - from);
      const fd = fs.openSync(file, 'r');
      try {
        fs.readSync(fd, buf, 0, buf.length, from);
      } finally {
        fs.closeSync(fd);
      }
      let pos = from, first = from > 0;
      for (let off = 0; off < buf.length; ) {
        let nl = buf.indexOf(10, off);
        if (nl < 0) nl = buf.length;
        const start = pos + off;
        const line = buf.subarray(off, nl);
        off = nl + 1;
        if (first) {
          first = false;
          continue;
        }
        try {
          const j = JSON.parse(line.toString('utf8'));
          if (typeof j.t === 'number' && j.t >= since) return start;
        } catch {}
      }
      return st.size;
    },
  };
}

module.exports = { createCursorHooks, CURSOR_EVENTS: EVENTS };
