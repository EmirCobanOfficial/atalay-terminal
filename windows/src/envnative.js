'use strict';
// The env view's two jobs that need Windows itself (envhelper.cs, a small program compiled here at first use, as
// cursorhooks.js compiles its hook program): a copy kept out of Clipboard History and the cloud clipboard (Electron's
// clipboard can't set the formats for that; the Mac marks its copy org.nspasteboard.ConcealedType), and a save that keeps
// the file's own access list, attributes, short name and object ID (ReplaceFileW; the Mac's fcopyfile). What a file holds
// reaches the program on its stdin only: never its command line, never a file of its own, never a log.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

/**
 * createEnvNative({ ownDir, source }): `ownDir` is the app's folder in %LOCALAPPDATA% (the program is kept there, named
 * after its source's hash, so every build and profile finds its own); `source` the program's C# (envhelper.cs).
 */
function createEnvNative({ ownDir, source = path.join(__dirname, 'envhelper.cs') }) {
  let building = null;
  let built = null;

  /** The program, compiled once per source by .NET Framework's C# compiler. Resolves to its path; rejects when it can't be built. */
  function build() {
    if (built && fs.existsSync(built)) return Promise.resolve(built);
    if (building) return building;
    building = (async () => {
      const code = fs.readFileSync(source, 'utf8');
      const exe = path.join(ownDir, `env-helper-${crypto.createHash('sha256').update(code).digest('hex').slice(0, 12)}.exe`);
      if (!fs.existsSync(exe)) {
        fs.mkdirSync(ownDir, { recursive: true });
        const cs = path.join(ownDir, `env-helper-${process.pid}.cs`);
        const out = path.join(ownDir, `env-helper-${process.pid}.exe`);
        fs.writeFileSync(cs, code);
        const csc = path.join(process.env.SystemRoot || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe');
        try {
          // A windows program, not a console one: no console flashes up; its stdin and stdout are the app's pipes all the same.
          await new Promise((resolve, reject) => {
            cp.execFile(csc, ['/nologo', '/target:winexe', '/optimize+', `/out:${out}`, cs], { windowsHide: true, timeout: 60_000 },
              (err, stdout) => (err ? reject(new Error(`csc: ${String(stdout || err.message).trim().split(/\r?\n/)[0]}`)) : resolve()));
          });
          try {
            fs.renameSync(out, exe);
          } catch (e) {
            // Another build of the same source (a second instance, staging) got there first.
            if (!fs.existsSync(exe)) throw e;
          }
        } finally {
          fs.rm(cs, { force: true }, () => {});
          fs.rm(out, { force: true }, () => {});
        }
      }
      // The programs of sources no build has used for a week go.
      const weekAgo = Date.now() - 7 * 86_400_000;
      for (const f of fs.readdirSync(ownDir)) {
        const p = path.join(ownDir, f);
        if (/^env-helper-[0-9a-f]{12}\.exe$/.test(f) && p !== exe) {
          fs.stat(p, (err, st) => !err && st.atimeMs < weekAgo && st.mtimeMs < weekAgo && fs.rm(p, { force: true }, () => {}));
        }
      }
      return (built = exe);
    })().finally(() => {
      building = null;
    });
    return building;
  }

  /** Runs the program with `input` on its stdin: { code, word } (its one word), or null when it couldn't run or took too long. */
  function run(exe, args, input, ms) {
    return new Promise((resolve) => {
      let word = '';
      let p;
      try {
        p = cp.spawn(exe, args, { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
      } catch {
        return resolve(null);
      }
      const timer = setTimeout(() => {
        try {
          p.kill();
        } catch {}
        resolve(null);
      }, ms);
      p.stdout.on('data', (d) => {
        if (word.length < 32) word += d;
      });
      p.on('error', () => {
        clearTimeout(timer);
        resolve(null);
      });
      p.on('close', (code) => {
        clearTimeout(timer);
        resolve({ code, word: word.trim() });
      });
      p.stdin.on('error', () => {});
      p.stdin.end(input);
    });
  }

  return {
    /** Builds the program ahead of the first copy or save (the env view opening): a copy then takes a few tens of ms. */
    prepare() {
      build().catch(() => {});
    },

    /** The text to the clipboard, kept out of Clipboard History and the cloud clipboard: true when it went there so. */
    async copy(text) {
      let exe;
      try {
        exe = await build();
      } catch {
        return false;
      }
      const r = await run(exe, ['clip'], Buffer.from(String(text), 'utf8'), 5000);
      return !!r && r.code === 0 && r.word === 'ok';
    },

    /**
     * `data` becomes the file `target`'s content through `temp` (beside it; deleted on failure): 'ok', 'busy', 'denied',
     * 'failed', or null when the program can't be built (the caller saves its own way). `before()` runs right before the
     * program starts, to refuse by throwing (a folder on the way swapped since it was checked).
     */
    async save(target, temp, data, before) {
      let exe;
      try {
        exe = await build();
      } catch {
        return null;
      }
      before();
      const r = await run(exe, ['save', target, temp], data, 15_000);
      if (!r) return 'failed';
      return ['ok', 'busy', 'denied'].includes(r.word) ? r.word : 'failed';
    },
  };
}

module.exports = { createEnvNative };
