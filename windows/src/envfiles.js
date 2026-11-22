'use strict';
// The env button's file side (pages/env.js), the Mac's EnvFiles.swift: finds the env-style files under a terminal's
// folder, and reads and writes them. Nothing here logs, sends or stores what a file holds, and no error text carries it.
// Every read and write checks the path again (check): inside the folder, no "..", no link out, a regular file, an env
// name, at most 1 MB. The page holds paths below the folder only ("/"-separated), never a whole one.
// The text is parsed on a worker thread (the Mac parses off the main thread too): a file built to be slow to parse never
// stalls the app's main process, and every pass over a line is linear in its length.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const MAX_SIZE = 1 << 20;
const MAX_FILES = 100;
const MAX_DEPTH = 4;
const MAX_VISITED = 20_000;
// A quoted value may run over as many lines as it needs, up to this many characters; past that the line stands alone.
const MAX_VALUE_CHARS = 64 << 10;
// The most characters all the quoted values of a file may take to look for their ends (a file of unclosed quotes).
const QUOTE_BUDGET = 4 << 20;
const BUDGET_MS = 1500;
// How long the worker may take for one file's lines, and for the variable counts of all the files a list shows.
const PARSE_MS = 5000;
const COUNT_MS = 3000;
// The app's own copy of a file while it saves it (write): `<name>.orbiterm-<8 hex digits>`, beside the file.
const TEMP_NAME = /\.orbiterm-[0-9a-f]{8}$/;

/** Folders never entered (besides every hidden one: .git, .venv, .cache …). */
const SKIPPED = new Set([
  'node_modules', 'build', 'dist', 'out', 'target', 'vendor', 'pods', 'carthage', 'deriveddata', 'coverage', 'venv',
  '__pycache__', 'site-packages', 'bower_components', 'storybook-static', 'library', 'tmp', 'temp', 'bin', 'obj',
]);
const TEMPLATE_WORDS = new Set(['example', 'sample', 'template', 'dist', 'tpl', 'default', 'defaults']);

/**
 * What an env-style file is by its name ('env', 'template', 'envrc'), null for any other file: `.env`, `.env.<anything>`
 * (.env.local, .env.production …), `<name>.env`, `.envrc`, and a template of them (`.env.example`, `app.env.sample`).
 * The app's own copy of one being saved (`.env.orbiterm-1a2b3c4d`) is none.
 */
function kindOf(name) {
  const n = String(name).toLowerCase();
  if (TEMP_NAME.test(n)) return null;
  if (n === '.envrc') return 'envrc';
  const parts = n.split('.');
  const templated = TEMPLATE_WORDS.has(parts[parts.length - 1] || '');
  if (n === '.env') return 'env';
  if (n.startsWith('.env.') && n.length > 5) return templated ? 'template' : 'env';
  if (n.endsWith('.env') && n.length > 4) return 'env';
  if (templated && n.includes('.env.') && !n.startsWith('.') && !n.endsWith('.')) return 'template';
  return null;
}

// ---------- paths ----------
// Paths are compared exactly: both sides come from realpathSync.native, which spells every part as the disk does (a
// folder made case-sensitive on Windows keeps .env and .ENV apart).
/** The path with every link resolved, as the system does it; the path itself when it can't be. */
function real(p) {
  try {
    return fs.realpathSync.native(p);
  } catch {
    return path.resolve(p);
  }
}
/** The folder's own path with a separator at its end, to test what lies inside it. */
const withSep = (dir) => (dir.endsWith(path.sep) ? dir : dir + path.sep);
/** A drive's root (C:\) or the home folder: only its own files are looked at, never a walk of a whole disk or home. */
function isShallow(realRoot) {
  return withSep(realRoot) === withSep(real(os.homedir())) || path.parse(realRoot).root === withSep(realRoot) || realRoot === path.parse(realRoot).root;
}
const hiddenOrSkipped = (dir) => dir.startsWith('.') || SKIPPED.has(dir.toLowerCase());
/** Whether the folder a checked file is in still resolves to itself: a folder on the way swapped for a link or a junction
 *  since the check (the Mac writes through the folder's descriptor, openat/renameat) is refused right before the open. */
const folderStill = (realFile) => real(path.dirname(realFile)) === path.dirname(realFile);

/**
 * The file `rel` below `root`, if it may be read or written: no "..", ".", empty, absolute, drive or stream part, no
 * backslash, no hidden or skipped folder on the way, an env name, and as the file it really is (links followed) a
 * regular file inside `root`, at most 1 MB, whose own name is an env name in no hidden or skipped folder.
 * { real, size, mtime, nlink } or null.
 */
function check(rel, root, shallow) {
  if (typeof rel !== 'string' || !rel || rel.length > 1024 || /[\\:*?"<>|\0]/.test(rel) || rel.startsWith('/')) return null;
  const parts = rel.split('/');
  if (parts.some((p) => !p || p === '.' || p === '..' || /[. ]$/.test(p))) return null;
  if (!kindOf(parts[parts.length - 1])) return null;
  const realRoot = real(root);
  const flat = shallow ?? isShallow(realRoot);
  if (flat && parts.length > 1) return null;
  if (parts.length - 1 > MAX_DEPTH) return null;
  if (parts.slice(0, -1).some(hiddenOrSkipped)) return null;
  const prefix = withSep(realRoot);
  const resolved = real(path.join(realRoot, ...parts));
  if (!resolved.startsWith(prefix)) return null;
  const inner = resolved.slice(prefix.length).split(path.sep).filter(Boolean);
  const name = inner[inner.length - 1];
  if (!name || !kindOf(name)) return null;
  if (flat && inner.length > 1) return null;
  if (inner.slice(0, -1).some(hiddenOrSkipped)) return null;
  let st;
  try {
    st = fs.statSync(resolved);
  } catch {
    return null;
  }
  if (!st.isFile() || st.size > MAX_SIZE) return null;
  return { real: resolved, size: st.size, mtime: st.mtimeMs, nlink: st.nlink };
}

// ---------- discovery ----------
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
/** Folder groups, the folder itself first; in a group .env, .env.local, the rest, .envrc, the templates last. */
function order(a, b) {
  if (a.folder !== b.folder) {
    if (!a.folder !== !b.folder) return a.folder ? 1 : -1;
    return collator.compare(a.folder, b.folder);
  }
  const rank = (f) => {
    if (f.kind === 'template') return 4;
    if (f.kind === 'envrc') return 3;
    const n = f.name.toLowerCase();
    return n === '.env' ? 0 : n === '.env.local' ? 1 : 2;
  };
  return rank(a) - rank(b) || collator.compare(a.name, b.name);
}

/**
 * The env files under `root`, including subfolders: depth up to 4, 100 files, 20,000 entries, 1.5 seconds. Hidden and
 * heavy folders aren't entered, nor a folder that is a link or a junction; a linked file counts only when it points
 * inside `root`. A drive's root or the home folder: only its own files. { files: [{ rel, name, folder, kind, size,
 * mtime, keys, hardLinked }], truncated }. The walk awaits the disk and the variables are counted on the worker thread
 * once it is done: the app's main process never stalls on a big tree or a slow file.
 */
async function discover(root) {
  const realRoot = real(root);
  const out = { files: [], truncated: false };
  let st;
  try {
    st = fs.statSync(realRoot);
  } catch {
    return out;
  }
  if (!st.isDirectory()) return out;
  const shallow = isShallow(realRoot);
  const start = Date.now();
  let visited = 0;
  const queue = [{ dir: realRoot, rel: '', depth: 0 }];
  const reals = [];
  while (queue.length) {
    if (Date.now() - start > BUDGET_MS) {
      out.truncated = true;
      break;
    }
    const { dir, rel, depth } = queue.shift();
    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    const subdirs = [];
    for (const e of entries) {
      visited++;
      if (visited > MAX_VISITED || Date.now() - start > BUDGET_MS) {
        out.truncated = true;
        break;
      }
      const name = e.name;
      const full = path.join(dir, name);
      // withFileTypes answers as lstat does: a junction or a link to a folder is a link, never followed.
      if (e.isDirectory()) {
        if (shallow || depth >= MAX_DEPTH) {
          if (depth >= MAX_DEPTH) out.truncated = true;
          continue;
        }
        if (hiddenOrSkipped(name)) continue;
        // A Python virtualenv named env.
        if (await fs.promises.access(path.join(full, 'pyvenv.cfg')).then(() => true, () => false)) continue;
        subdirs.push(name);
      } else if (e.isFile() || e.isSymbolicLink()) {
        const kind = kindOf(name);
        if (!kind) continue;
        const relPath = rel ? `${rel}/${name}` : name;
        const info = check(relPath, realRoot, shallow);
        if (!info) continue;
        if (out.files.length >= MAX_FILES) {
          out.truncated = true;
          continue;
        }
        reals.push(info.real);
        out.files.push({ rel: relPath, name, folder: rel, kind, size: info.size, mtime: info.mtime, keys: null, hardLinked: info.nlink > 1 });
      }
    }
    for (const s of subdirs) queue.push({ dir: path.join(dir, s), rel: rel ? `${rel}/${s}` : s, depth: depth + 1 });
    if (out.truncated && visited > MAX_VISITED) break;
  }
  // The variables in each, counted on the worker (each file read as read() does, 1 MB and a byte at most); a count that
  // doesn't come in time stays null (the list then shows none).
  if (reals.length) {
    const keys = await inWorker({ op: 'count', paths: reals }, COUNT_MS + 2000).catch(() => []);
    out.files.forEach((f, n) => {
      f.keys = typeof keys[n] === 'number' ? keys[n] : null;
    });
  }
  out.files.sort(order);
  return out;
}

// ---------- read and write ----------
class EnvError extends Error {
  constructor(code) {
    super(code);
    this.code = code; // notAllowed, notText, conflict, tooBig, readOnly, hardLinked, busy, denied, failed: never what the file holds
  }
}
// ignoreBOM: the decoder leaves a byte order mark in the text, so a second one (the first is taken off below and written
// back with `bom`) is kept as the file has it.
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

/** Reads at most 1 MB and a byte of a regular file; text only (no NUL in its first 8 KB, valid UTF-8). */
function readFile(realPath) {
  let fd;
  try {
    fd = fs.openSync(realPath, 'r');
  } catch {
    throw new EnvError('failed');
  }
  try {
    const st = fs.fstatSync(fd);
    if (!st.isFile()) throw new EnvError('notAllowed');
    if (st.size > MAX_SIZE) throw new EnvError('tooBig');
    const buf = Buffer.alloc(MAX_SIZE + 1);
    let n = 0;
    for (;;) {
      const got = fs.readSync(fd, buf, n, buf.length - n, null);
      if (!got) break;
      n += got;
      if (n > MAX_SIZE) throw new EnvError('tooBig');
    }
    const data = buf.subarray(0, n);
    if (data.subarray(0, 8192).includes(0)) throw new EnvError('notText');
    const bom = data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf;
    let text;
    try {
      text = decoder.decode(bom ? data.subarray(3) : data);
    } catch {
      throw new EnvError('notText');
    }
    return { text, bom, mtime: st.mtimeMs };
  } catch (e) {
    throw e instanceof EnvError ? e : new EnvError('failed');
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * A file's lines for the editor (comments and other lines that look like they hold a value marked to be masked too), with
 * how it is written: { linesJSON, bom, mtime, hardLinked, crlf, finalNewline }. Read here, parsed on the worker, which
 * hands the lines over as one JSON text that goes on to the page as it is: hundreds of thousands of little objects made
 * again on this thread (and copied once more to the page) would stall it for as long as the parse.
 */
async function read(rel, root) {
  const info = check(rel, root);
  if (!info || !folderStill(info.real)) throw new EnvError('notAllowed');
  const r = readFile(info.real);
  const { json, crlf } = await inWorker({ op: 'lines', text: r.text }, PARSE_MS);
  return { linesJSON: json, crlf, bom: r.bom, mtime: r.mtime, hardLinked: info.nlink > 1, finalNewline: !r.text || r.text.endsWith('\n') };
}

/** When the file last changed; null when it is gone or not allowed any more. */
function modified(rel, root) {
  const info = check(rel, root);
  return info ? info.mtime : null;
}

/**
 * Writes the file whole, so a failure never leaves half a file: the new text goes into a new file beside it
 * (`<name>.orbiterm-<hex>`), flushed, and that one takes the file's place. With `native` (envnative.js) Windows'
 * ReplaceFileW does it, which keeps the file's own access list, attributes, short name and object ID (the Mac's
 * fcopyfile); without it a copy of the file (its attributes come along) is renamed over it. `base` is the mtime the text
 * was read at: a file changed since is a conflict (null forces). A link inside the folder is written through to the file
 * it points at. A read-only or hard-linked file is refused, and so is one the account's permissions don't let it change
 * (denied, told apart from a file another program holds: busy). Resolves to the new mtime.
 */
async function write(text, bom, rel, root, base, native) {
  const info = check(rel, root);
  if (!info) throw new EnvError('notAllowed');
  const data = Buffer.concat([bom ? Buffer.from([0xef, 0xbb, 0xbf]) : Buffer.alloc(0), Buffer.from(String(text), 'utf8')]);
  if (data.length > MAX_SIZE) throw new EnvError('tooBig');
  let now;
  try {
    now = fs.lstatSync(info.real);
  } catch {
    throw new EnvError('notAllowed');
  }
  if (!now.isFile()) throw new EnvError('notAllowed');
  // A hard-linked file is shared with another name: a write would replace this name only and cut the link.
  if (now.nlink > 1) throw new EnvError('hardLinked');
  try {
    fs.accessSync(info.real, fs.constants.W_OK);
  } catch {
    throw new EnvError('readOnly');
  }
  // Opened for writing with every kind of sharing allowed (as Node opens files), only the file's permissions can refuse
  // it; a program holding it without sharing makes it a sharing violation instead (EBUSY). Nothing is written here.
  try {
    fs.closeSync(fs.openSync(info.real, 'r+'));
  } catch (e) {
    throw new EnvError(e && e.code === 'EBUSY' ? 'busy' : e && (e.code === 'EPERM' || e.code === 'EACCES') ? 'denied' : 'failed');
  }
  if (base != null && Math.abs(now.mtimeMs - base) > 0.5) throw new EnvError('conflict');
  const tmp = path.join(path.dirname(info.real), `${path.basename(info.real)}.orbiterm-${crypto.randomBytes(4).toString('hex')}`);
  const still = () => {
    if (!folderStill(info.real)) throw new EnvError('notAllowed');
  };
  still();
  const how = native ? await native.save(info.real, tmp, data, still) : null;
  if (how === 'ok') return mtimeOf(info.real);
  if (how) {
    try { fs.unlinkSync(tmp); } catch {}
    throw new EnvError(['busy', 'denied'].includes(how) ? how : 'failed');
  }
  // No helper (it couldn't be built): a copy renamed over the file. The copy keeps the file's attributes (hidden,
  // archive); its access list is the folder's, as a new file's is.
  let done = false;
  try {
    fs.copyFileSync(info.real, tmp, fs.constants.COPYFILE_EXCL);
    const fd = fs.openSync(tmp, 'r+');
    try {
      fs.ftruncateSync(fd, 0);
      let off = 0;
      while (off < data.length) off += fs.writeSync(fd, data, off, data.length - off, off);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    still();
    fs.renameSync(tmp, info.real);
    done = true;
  } catch (e) {
    if (e instanceof EnvError) throw e;
    // The permissions were tried above: a rename refused now is a program holding the file open (Windows refuses to
    // replace a file open without delete sharing with "access denied"). Nothing was changed.
    throw new EnvError(e && (e.code === 'EBUSY' || e.code === 'EPERM' || e.code === 'EACCES') ? 'busy' : 'failed');
  } finally {
    if (!done) try { fs.unlinkSync(tmp); } catch {}
  }
  return mtimeOf(info.real);
}
function mtimeOf(p) {
  try {
    return fs.statSync(p).mtimeMs;
  } catch {
    return Date.now();
  }
}

// ---------- the text as lines ----------
const isKey = (s) => /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(s);
/** Uppercase words that start a comment (`# TODO: …`), never a switched-off variable. */
const COMMENT_TAGS = new Set(['TODO', 'FIXME', 'NOTE', 'WARNING', 'HACK', 'XXX', 'BUG', 'OPTIMIZE']);
const blank = (c) => c === 32 || c === 9;
/** The text without the spaces and tabs at its start and end, by index (a regex there backtracks over a long run). */
function trimBlanks(s) {
  let a = 0;
  let b = s.length;
  while (a < b && blank(s.charCodeAt(a))) a++;
  while (b > a && blank(s.charCodeAt(b - 1))) b--;
  return a === 0 && b === s.length ? s : s.slice(a, b);
}
function trimStartBlanks(s) {
  let a = 0;
  while (a < s.length && blank(s.charCodeAt(a))) a++;
  return a ? s.slice(a) : s;
}

/**
 * A quoted value's end: on its first line (`first`, what follows the opening quote) or on a later one (`raws` from
 * `from`, each without the \r that ends it), up to 64 KB. [value, what follows the closing quote, how many more lines it
 * took], or null when it doesn't close in time (`state.unclosed` then remembers a quote that reached the end: no later
 * one can close either). Each character is looked at once.
 */
function quoted(q, first, raws, from, state) {
  const quote = q.charCodeAt(0);
  const escapes = q === '"';
  // The lines before the one it closes on, joined only once it does.
  const before = [];
  let size = 0;
  let used = 0;
  let line = first;
  for (;;) {
    let escaped = false;
    for (let i = 0; i < line.length; i++) {
      const c = line.charCodeAt(i);
      if (escaped) escaped = false;
      else if (c === 92 && escapes) escaped = true;
      else if (c === quote) return [before.length ? before.join('\n') + '\n' + line.slice(0, i) : line.slice(0, i), line.slice(i + 1), used];
    }
    const bytes = Buffer.byteLength(line) + 1;
    state.budget -= bytes;
    if (state.budget < 0 || from + used >= raws.length) {
      state.unclosed.add(q);
      return null;
    }
    // The size so far, kept as it grows: measuring the whole value again at every line would make a long one quadratic.
    size += bytes;
    if (size > MAX_VALUE_CHARS) return null;
    before.push(line);
    line = cut(raws[from + used]).body;
    used++;
  }
}
/** A line as split at \n: its text, and the end it had (\r\n when a \r was left at its end). */
function cut(r) {
  return r.endsWith('\r') ? { body: r.slice(0, -1), end: '\r\n' } : { body: r, end: '\n' };
}

/**
 * The text's lines: { kind: 'blank'|'comment'|'pair'|'other', raw, key, value, enabled, export, quote, sep, trailing,
 * eol }. A `# KEY=value` line is a variable switched off. A quoted value may run over several lines: one line here, its
 * `raw` holding them with the ends they had between them, and `eol` the end of its last one. The last line's `eol` is ''
 * when the text doesn't end in a newline (a \r left there is its own).
 */
function parse(text) {
  const raws = String(text).split('\n');
  const endsInNewline = raws[raws.length - 1] === '';
  if (endsInNewline) raws.pop();
  const lines = [];
  const state = { budget: QUOTE_BUDGET, unclosed: new Set() };
  /** The end of line `n`: '' for the last one of a text without a final newline. */
  const endOf = (n) => (n === raws.length - 1 && !endsInNewline ? { body: raws[n], end: '' } : cut(raws[n]));
  let i = 0;
  while (i < raws.length) {
    let { body: raw, end: eol } = endOf(i);
    i++;
    const trimmed = trimBlanks(raw);
    const plain = (r) => ({ kind: trimmed.startsWith('#') ? 'comment' : 'other', raw: r, eol });
    if (!trimmed) {
      lines.push({ kind: 'blank', raw, eol });
      continue;
    }
    let body = trimmed;
    let enabled = true;
    if (body.startsWith('#')) {
      enabled = false;
      body = trimStartBlanks(body.slice(1));
    }
    let exp = false;
    if (body.startsWith('export ')) {
      body = trimStartBlanks(body.slice(7));
      exp = true;
    }
    // NAME, blanks, = (or : on a live line), blanks.
    const sepAt = body.search(/[=: \t]/);
    if (sepAt < 0) {
      lines.push(plain(raw));
      continue;
    }
    const name = body.slice(0, sepAt);
    if (!isKey(name)) {
      lines.push(plain(raw));
      continue;
    }
    // A commented `# KEY: v` is a switched-off variable only for a name written as env names are (not `# Note: …`).
    if (!enabled && COMMENT_TAGS.has(name)) {
      lines.push(plain(raw));
      continue;
    }
    const colonOK = enabled || /^[A-Z0-9_]+$/.test(name);
    let j = sepAt;
    while (j < body.length && (body[j] === ' ' || body[j] === '\t')) j++;
    if (j >= body.length || !(body[j] === '=' || (body[j] === ':' && colonOK))) {
      lines.push(plain(raw));
      continue;
    }
    j++;
    while (j < body.length && (body[j] === ' ' || body[j] === '\t')) j++;
    const sep = body.slice(sepAt, j);
    const rest = body.slice(j);
    let value = '';
    let quote = null;
    let trailing = '';
    if (rest[0] === '"' || rest[0] === "'") {
      quote = rest[0];
      const got = state.unclosed.has(quote) ? null : quoted(quote, rest.slice(1), raws, i, state);
      if (!got) {
        lines.push(plain(raw));
        continue;
      }
      const [inner, after, used] = got;
      const afterTrim = after.trim();
      if (afterTrim && !afterTrim.startsWith('#')) {
        lines.push(plain(raw));
        continue;
      }
      // The lines it ran over, each after the end the one before it had: unchanged, it is written back byte for byte.
      for (let k = 0; k < used; k++) {
        const next = endOf(i + k);
        raw += eol + next.body;
        eol = next.end;
      }
      i += used;
      value = inner;
      trailing = afterTrim ? ' ' + afterTrim : '';
    } else {
      let s = rest;
      const m = /\s#/.exec(s);
      if (m) {
        trailing = ' ' + s.slice(m.index + 1);
        s = s.slice(0, m.index);
      }
      value = s.trim();
    }
    lines.push({ kind: 'pair', raw, key: name, value, enabled, export: exp, quote, sep, trailing, eol });
  }
  return lines;
}

/** A NAME followed by blanks and = or :, somewhere in the text: each run of name characters is tried once (a regex
 *  starting at every letter of a long run would go over the rest of it again each time). */
const SEP = /\s*[=:]/y;
/** [A-Za-z_] and [A-Za-z0-9_.-], by character code. */
const nameStart = (c) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95;
const nameChar = (c) => nameStart(c) || (c >= 48 && c <= 57) || c === 46 || c === 45;
function nameThenSep(t) {
  const n = t.length;
  let i = 0;
  while (i < n) {
    if (!nameStart(t.charCodeAt(i))) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < n && nameChar(t.charCodeAt(j))) j++;
    // A name can only end where its run ends (none of its characters is a blank, = or :): one try per run.
    SEP.lastIndex = j;
    if (SEP.test(t)) return true;
    i = j;
  }
  return false;
}

/** A comment or a plain line with a NAME followed by = or :, or a long run of letters and digits: masked like a value. */
function looksSecret(text) {
  let t = String(text).replace(/^[# \t]+/, '');
  const colon = t.indexOf(':');
  if (colon > 0 && COMMENT_TAGS.has(t.slice(0, colon))) t = t.slice(colon + 1);
  else t = String(text);
  if (nameThenSep(t)) return true;
  return t.split(/[ \t]+/).some((w) => [...w].length >= 20 && /\p{L}/u.test(w) && /\p{N}/u.test(w));
}

/** The lines as the editor gets them (comments and other lines that look like they hold a value marked secret), and
 *  whether the file's lines end in \r\n (for the lines added to it). */
function linesOf(text) {
  const lines = parse(text).map((l) => (l.kind === 'comment' || l.kind === 'other' ? { ...l, secret: looksSecret(l.raw) } : l));
  return { lines, crlf: lines.length ? lines[0].eol === '\r\n' : false };
}

/** A `"` that a backslash doesn't protect gets one. */
function escapeQuotes(s) {
  let out = '';
  let escaped = false;
  for (const c of s) {
    if (escaped) {
      out += c;
      escaped = false;
    } else if (c === '\\') {
      out += c;
      escaped = true;
    } else out += c === '"' ? '\\"' : c;
  }
  return out;
}
/** Whether the text ends in a backslash no other one protects: in double quotes it would take the closing quote. */
function endsEscaping(s) {
  let n = 0;
  for (let i = s.length - 1; i >= 0 && s[i] === '\\'; i--) n++;
  return n % 2 === 1;
}

/**
 * The line as it is written: as read while unchanged, else `KEY=value` in the style it had. A value that needs quotes
 * and holds a backslash gets single quotes, where a backslash is only itself (`'C:\Program Files\'`); double quotes stay
 * when the value has a single quote too, its last backslash then doubled so it can't take the closing quote.
 */
function serialize(l) {
  if (!(l.changed || (l.kind === 'pair' && !l.raw))) return l.raw;
  if (l.kind !== 'pair') return l.raw;
  let q = l.quote || null;
  let v = String(l.value);
  const single = !v.includes("'");
  if (!q && (/[ \t#'"\n\r]/.test(v) || v.startsWith(' '))) q = single && v.includes('\\') ? "'" : '"';
  if (q === "'" && !single) q = '"';
  if (q === '"') {
    v = escapeQuotes(v);
    if (endsEscaping(v)) {
      if (single) q = "'";
      else v += '\\';
    }
    if (q === "'") v = String(l.value);
  }
  const body = (l.export ? 'export ' : '') + l.key + (l.sep || '=') + (q ? q + v + q : v) + (l.trailing || '');
  return l.enabled === false ? '# ' + body : body;
}

/**
 * The whole text, each line with its own end of line (`crlf`: the one for a line made here, or for a last line that had
 * none and isn't last any more) and the file's final one. An unchanged line is its `raw` as read, the ends between a
 * multi-line value's lines included; a changed one's line breaks take the line's end.
 */
function textOf(lines, crlf, finalNewline) {
  let out = '';
  const made = crlf ? '\r\n' : '\n';
  lines.forEach((l, n) => {
    const eol = l.eol || made;
    const s = serialize(l);
    out += s === l.raw && !l.changed ? s : s.replace(/\r?\n/g, eol);
    if (n < lines.length - 1 || finalNewline) out += eol;
  });
  return out;
}

// ---------- the worker ----------
// One worker thread, started at the first file and ended after 30 s with nothing to do; its code is this file's own text
// run as a script (a path inside the app's asar archive can't start a worker). A job that takes too long ends it: the
// next one starts a new one. Should no worker start here, the job runs on this thread.
const WORKER = 'orbiterm-envfiles';
let worker = null;
let seq = 0;
let idle = null;
const waiting = new Map();
function stopWorker() {
  const w = worker;
  worker = null;
  clearTimeout(idle);
  for (const p of waiting.values()) {
    clearTimeout(p.timer);
    p.reject(new EnvError('failed'));
  }
  waiting.clear();
  if (w) w.terminate().catch(() => {});
}
function startWorker() {
  const w = new Worker(fs.readFileSync(__filename, 'utf8'), { eval: true, workerData: WORKER });
  w.unref();
  w.on('message', ({ id, ok, value, code }) => {
    const p = waiting.get(id);
    if (!p) return;
    waiting.delete(id);
    clearTimeout(p.timer);
    if (ok) p.resolve(value);
    else p.reject(new EnvError(code));
    if (!waiting.size) {
      clearTimeout(idle);
      idle = setTimeout(() => worker === w && !waiting.size && stopWorker(), 30_000);
      idle.unref();
    }
  });
  // Its errors carry no file's text (no job throws one with it) and are never logged.
  w.on('error', () => worker === w && stopWorker());
  w.on('exit', () => worker === w && stopWorker());
  return (worker = w);
}
function inWorker(job, ms) {
  let w;
  try {
    w = worker || startWorker();
  } catch {
    return new Promise((resolve) => resolve(work(job)));
  }
  return new Promise((resolve, reject) => {
    const id = ++seq;
    clearTimeout(idle);
    waiting.set(id, { resolve, reject, timer: setTimeout(stopWorker, ms) });
    w.postMessage({ id, job });
  });
}
/** A job, on the worker: 'lines' parses a text for the editor (the lines as JSON); 'count' counts each file's
 *  switched-on variables, for 3 seconds at most (the rest stay null). */
function work(job) {
  if (job.op === 'lines') {
    const { lines, crlf } = linesOf(job.text);
    return { json: JSON.stringify(lines), crlf };
  }
  if (job.op === 'count') {
    const until = Date.now() + COUNT_MS;
    return job.paths.map((p) => {
      if (Date.now() > until) return null;
      try {
        return parse(readFile(p).text).filter((l) => l.kind === 'pair' && l.enabled).length;
      } catch {
        return 0;
      }
    });
  }
  throw new EnvError('failed');
}
if (!isMainThread && workerData === WORKER) {
  parentPort.on('message', ({ id, job }) => {
    try {
      parentPort.postMessage({ id, ok: true, value: work(job) });
    } catch (e) {
      parentPort.postMessage({ id, ok: false, code: e instanceof EnvError ? e.code : 'failed' });
    }
  });
}

module.exports = { discover, check, read, write, modified, parse, serialize, textOf, looksSecret, linesOf, kindOf, isKey, EnvError, MAX_SIZE };
