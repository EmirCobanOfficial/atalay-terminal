'use strict';
// The overlay page's data (overlay.html: the Ring and the new-terminal folder picker), as the Mac app's
// Overlay.swift has it: the saved shortcut folders (the Ring's 5 slices, the 14 places around the picker), folder
// listings with git / Claude badges, and the places to start from (the usual folders, where Claude ran lately).
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const HOME = os.homedir();
const expand = (p) => (p === '~' ? HOME : /^~[\\/]/.test(p) ? path.join(HOME, p.slice(2)) : p);
const tildify = (p) => (p && p.toLowerCase().startsWith(HOME.toLowerCase()) ? '~' + p.slice(HOME.length) : p || '');
const encodeCwd = (cwd) => String(cwd || '').replace(/[^A-Za-z0-9]/g, '-');

async function isDir(p) {
  try {
    return (await fsp.stat(p)).isDirectory();
  } catch {
    return false;
  }
}

// A folder's identity, which a rename keeps: its file ID (NTFS's file index) and its volume's serial, as strings for the
// JSON (64-bit numbers). Null when it isn't a folder; ino "0" where the file system has no IDs (some network drives).
async function folderId(p) {
  try {
    const st = await fsp.stat(p, { bigint: true });
    return st.isDirectory() ? { ino: String(st.ino), dev: String(st.dev) } : null;
  } catch {
    return null;
  }
}

// The subfolder of `parent` with that identity (one level: a folder renamed where it is), or ''.
async function findFolder(parent, ino, dev) {
  for (const e of await fsp.readdir(parent, { withFileTypes: true }).catch(() => [])) {
    if (!e.isDirectory()) continue;
    const full = path.join(parent, e.name);
    const id = await folderId(full);
    if (id && id.ino === ino && id.dev === dev) return full;
  }
  return '';
}

// Windows hides its own folders with an attribute (AppData, ProgramData, the old profile's links like "Documents and
// Settings") where a Mac starts their names with a dot; Node can't read it, `dir /a:h` can. Lower-case names, for a
// case-blind file system. Run in the folder itself, so no path goes through cmd's parsing.
function hiddenNames(dir) {
  if (process.platform !== 'win32') return Promise.resolve(new Set());
  return new Promise((resolve) => {
    execFile('cmd.exe', ['/d', '/u', '/c', 'dir /a:h /b'], { cwd: dir, encoding: 'utf16le', windowsHide: true, timeout: 3000 }, (err, out) =>
      resolve(new Set(String(out || '').split(/\r?\n/).map((s) => s.trim().toLowerCase()).filter(Boolean))),
    );
  });
}

function createOverlay({ dataDir, claudeDir }) {
  const projects = path.join(claudeDir, 'projects');
  const SETS = { pie: { file: path.join(dataDir, 'shortcuts.json'), count: 5 }, picker: { file: path.join(dataDir, 'picker-shortcuts.json'), count: 14 } };
  const set = (body) => (body && body.set === 'picker' ? SETS.picker : SETS.pie);

  const same = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
  // A saved slot: { name, dir, ino, dev } (ino and dev, the folder's identity, since slots follow a rename; older files
  // have slots without them, or a bare path).
  const entryOf = (x) => {
    if (typeof x === 'string') return x ? { name: (path.basename(x) || x).slice(0, 40), dir: x } : null;
    return x && typeof x.dir === 'string' && x.dir ? { ...x, name: x.name || (path.basename(x.dir) || x.dir).slice(0, 40) } : null;
  };

  async function readSaved(s) {
    try {
      const saved = JSON.parse(await fsp.readFile(s.file, 'utf8'));
      return (Array.isArray(saved) ? saved : saved.slots || []).map(entryOf);
    } catch {
      return null;
    }
  }

  async function write(s, slots) {
    await fsp.mkdir(path.dirname(s.file), { recursive: true });
    await fsp.writeFile(s.file, JSON.stringify(slots, null, 2));
  }

  // One read or save at a time per file: a read that follows a renamed folder writes the file too, and must not undo a
  // save made meanwhile.
  const busy = new Map();
  function serial(s, job) {
    const run = (busy.get(s) || Promise.resolve()).then(job);
    busy.set(s, run.catch(() => {}));
    return run;
  }

  // A slot against the disk. Its folder still there: its identity is recorded (a slot saved before they were, or another
  // folder at that path now). Gone: the folder with its identity in the same parent is it, renamed, and the slot follows
  // (its name too, unless it was given another than the folder's). Not found (deleted, moved elsewhere, a drive that is
  // out): the slot stays as it was, shown as missing, until the folder is back or the user changes or removes it.
  async function check(x) {
    const id = await folderId(x.dir);
    if (id) return id.ino === '0' || (x.ino === id.ino && x.dev === id.dev) ? { entry: x } : { entry: { ...x, ...id }, changed: true };
    const dir = x.ino && x.ino !== '0' ? await findFolder(path.dirname(x.dir), x.ino, x.dev) : '';
    if (!dir) return { entry: x, missing: true };
    const name = x.name === (path.basename(x.dir) || x.dir).slice(0, 40) ? (path.basename(dir) || dir).slice(0, 40) : x.name;
    return { entry: { ...x, name, dir }, changed: true };
  }

  async function readSlots(s) {
    const saved = await readSaved(s);
    if (!saved) return Array(s.count).fill(null);
    const checked = await Promise.all(saved.slice(0, s.count).map((x) => (x ? check(x) : null)));
    if (checked.some((c) => c && c.changed)) await write(s, checked.map((c) => (c ? c.entry : null))).catch(() => {});
    const slots = checked.map((c) => (c ? { name: c.entry.name, dir: c.entry.dir, display: tildify(c.entry.dir), ...(c.missing ? { missing: true } : {}) } : null));
    while (slots.length < s.count) slots.push(null);
    return slots;
  }

  async function saveSlots(s, input) {
    if (!Array.isArray(input) || input.length !== s.count) throw new Error(`need ${s.count} slots`);
    const before = (await readSaved(s)) || [];
    const next = [];
    for (const it of input) {
      if (!it || !it.dir) {
        next.push(null);
        continue;
      }
      const dir = path.resolve(expand(String(it.dir)));
      const id = await folderId(dir);
      // A slot whose folder is missing goes back as it was saved, its identity kept to find the folder again: only a
      // folder being set must be one.
      const kept = id ? null : before.find((x) => x && same(x.dir, dir));
      if (!id && !kept) throw new Error(`not a folder: ${it.dir}`);
      next.push(kept || { name: String(it.name || path.basename(dir) || dir).slice(0, 40), dir, ...(id.ino !== '0' ? id : {}) });
    }
    await write(s, next);
    return readSlots(s);
  }

  // The folder a click on the Ring or around the picker opens: the path the page has, or, for a slot whose folder was
  // renamed since the page read it, where the slot follows it now (its file updated). '' when it can't be found.
  async function locate(raw) {
    const dir = path.resolve(expand(String(raw || '')));
    if (await folderId(dir)) return dir;
    for (const s of Object.values(SETS)) {
      const slot = await serial(s, async () => {
        const at = ((await readSaved(s)) || []).slice(0, s.count).findIndex((x) => x && same(x.dir, dir));
        return at < 0 ? null : (await readSlots(s))[at];
      });
      if (slot && !slot.missing) return slot.dir;
    }
    return '';
  }

  // A folder's subfolders, with whether each is a git repo and whether Claude ran there. One that isn't on this PC (the
  // picker starts in ~/Documents/Repos, the Mac author's folder) opens at the nearest folder above it that is.
  async function listDir(raw) {
    let dir = path.resolve(expand(raw || '~'));
    while (!(await isDir(dir)) && path.dirname(dir) !== dir) dir = path.dirname(dir);
    const root = path.parse(dir).root === dir;
    let ents;
    try {
      ents = await fsp.readdir(dir, { withFileTypes: true });
    } catch (e) {
      return { path: dir, display: tildify(dir), parent: root ? null : path.dirname(dir), error: e.code === 'EACCES' || e.code === 'EPERM' ? 'no permission' : 'cannot open', entries: [] };
    }
    const hidden = await hiddenNames(dir);
    const entries = [];
    for (const e of ents) {
      if (entries.length >= 600) break;
      const full = path.join(dir, e.name);
      const folder = e.isDirectory() || (e.isSymbolicLink() && (await isDir(full)));
      if (!folder || e.name.endsWith('.app') || /^\$|^System Volume Information$/i.test(e.name)) continue;
      const st = await fsp.stat(full).catch(() => null);
      entries.push({
        name: e.name, path: full, hidden: e.name.startsWith('.') || hidden.has(e.name.toLowerCase()), modified: st ? st.mtimeMs : 0,
        git: fs.existsSync(path.join(full, '.git')), claude: fs.existsSync(path.join(projects, encodeCwd(full))),
      });
    }
    entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
    return { path: dir, display: tildify(dir), parent: root ? null : path.dirname(dir), entries };
  }

  // Folders where Claude ran lately: the first record of each recent transcript holds its start folder.
  async function recentFolders(limit = 12) {
    const files = [];
    for (const d of await fsp.readdir(projects).catch(() => [])) {
      for (const n of await fsp.readdir(path.join(projects, d)).catch(() => [])) {
        if (!n.endsWith('.jsonl')) continue;
        const fp = path.join(projects, d, n);
        const st = await fsp.stat(fp).catch(() => null);
        if (st) files.push({ fp, t: st.mtimeMs });
      }
    }
    files.sort((a, b) => b.t - a.t);
    const out = [], seen = new Set();
    for (const f of files.slice(0, 80)) {
      const fh = await fsp.open(f.fp, 'r').catch(() => null);
      if (!fh) continue;
      let head = '';
      try {
        const buf = Buffer.allocUnsafe(32 << 10);
        const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
        head = buf.toString('utf8', 0, bytesRead);
      } finally {
        await fh.close();
      }
      const m = /"cwd":"((?:[^"\\]|\\.)*)"/.exec(head);
      if (!m) continue;
      const cwd = JSON.parse(`"${m[1]}"`);
      const key = cwd.toLowerCase();
      if (seen.has(key) || !(await isDir(cwd))) continue;
      seen.add(key);
      out.push({ name: path.basename(cwd) || cwd, path: cwd, display: tildify(cwd), t: f.t });
      if (out.length >= limit) break;
    }
    return out;
  }

  // The usual folders (Windows has no Finder sidebar to follow): home, desktop, documents, downloads, the folders code
  // usually lives in, and the other drives.
  async function places() {
    const fav = [['Home', HOME, 'home'], ['Desktop', path.join(HOME, 'Desktop'), 'desktop'], ['Documents', path.join(HOME, 'Documents'), 'doc'],
      ['Downloads', path.join(HOME, 'Downloads'), 'down'], ['Repos', path.join(HOME, 'source', 'repos'), 'code'],
      ['Repos', path.join(HOME, 'Documents', 'Repos'), 'code'], ['Projects', path.join(HOME, 'Projects'), 'code'], ['Code', path.join(HOME, 'Code'), 'code']];
    if (process.platform === 'win32') for (const d of 'CDEFG') fav.push([`${d}:`, `${d}:\\`, null]);
    const favorites = [];
    for (const [name, p, icon] of fav) if (await isDir(p)) favorites.push({ name, path: p, display: tildify(p), ...(icon ? { icon } : {}) });
    return { home: HOME, favorites, recents: await recentFolders(12) };
  }

  return {
    /** The overlay page's requests; `newTerminal` and `done` are main.js's (they open a terminal, hide the overlay). */
    async handle(body) {
      switch (body.type) {
        case 'listDir': return listDir(body.path);
        case 'places': return places();
        case 'getSlots': return { slots: await serial(set(body), () => readSlots(set(body))) };
        case 'saveSlots':
          try {
            return { slots: await serial(set(body), () => saveSlots(set(body), body.slots)) };
          } catch (e) {
            return { error: e.message };
          }
        default: return null;
      }
    },
    expand,
    locate,
  };
}

module.exports = { createOverlay };
