'use strict';
// The dashboard's notes (web/notes.js), kept in the app's data folder on this PC, as the Mac keeps them
// (NotesStore.swift): a file for each note and one for their order and the note pinned to the dashboard. Every file is
// encrypted (AES-256-GCM) and bound to its name, so a file copied over another doesn't open either. The key is made on
// this PC and kept in notes.key, sealed by Windows for this user (Electron's safeStorage).
// Beside the notes: a shared note's Yjs document ("<id>.ydoc") and the files the notes hold ("files/<sha256>", the Mac's
// NotesStore extension in Attachments.swift), encrypted with the same key and bound to their names too.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// What a file starts with: that it's a note, and the version of how it's laid out. The same as on the Mac.
const HEADER = Buffer.from([0x6e, 0x6f, 0x74, 0x65, 1]);
// A shared note's document ("ydoc" + 1) and a note's file ("file" + 1): the Mac's NotesStore.yHeader and fileHeader.
const Y_HEADER = Buffer.from([0x79, 0x64, 0x6f, 0x63, 1]);
const FILE_HEADER = Buffer.from([0x66, 0x69, 0x6c, 0x65, 1]);
// The file of the notes' order and the pinned one: a name no note has (theirs are letters, digits and dashes).
const INDEX = '_index';
const NAME = /^[A-Za-z0-9-]{1,100}$/;
const SHA = /^[0-9a-f]{64}$/;
const BLOCK_ID = /^[A-Za-z0-9_-]{1,64}$/;
// A document bigger than this isn't kept (the Mac's NotesSync: 4 MB).
const Y_MAX = 4_000_000;

// AES-256-GCM with `aad`: header, 12-byte nonce, the ciphertext and its 16-byte tag (CryptoKit's combined box after the header).
function sealWith(plain, header, aad, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(aad);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([header, iv, body, cipher.getAuthTag()]);
}

function openWith(file, header, aad, key) {
  if (file.length < header.length + 28 || !file.subarray(0, header.length).equals(header)) return null;
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, file.subarray(header.length, header.length + 12));
  decipher.setAAD(aad);
  decipher.setAuthTag(file.subarray(file.length - 16));
  return Buffer.concat([decipher.update(file.subarray(header.length + 12, file.length - 16)), decipher.final()]);
}

function seal(plain, name, key) {
  return sealWith(plain, HEADER, Buffer.concat([HEADER, Buffer.from(name, 'utf8')]), key);
}

function open(file, name, key) {
  const plain = openWith(file, HEADER, Buffer.concat([HEADER, Buffer.from(name, 'utf8')]), key);
  if (!plain) throw new Error(`${name} isn't a note`);
  return plain;
}

// What binds a document to its note and a file to its SHA-256 (the Mac's yHeader + "<id>.ydoc", fileHeader + "file:<sha>").
const yAAD = (id) => Buffer.concat([Y_HEADER, Buffer.from(`${id}.ydoc`, 'utf8')]);
const fileAAD = (sha) => Buffer.concat([FILE_HEADER, Buffer.from(`file:${sha}`, 'utf8')]);
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

// A file written whole or not at all; readable by this user only.
function writeWhole(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, data, { mode: 0o600 });
  for (let i = 0; ; i++) {
    try {
      return fs.renameSync(tmp, file);
    } catch (err) {
      // Another program (an antivirus) holding the file a moment.
      if (i >= 4 || !['EPERM', 'EBUSY', 'EACCES'].includes(err.code)) {
        try {
          fs.unlinkSync(tmp);
        } catch {}
        throw err;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 30);
    }
  }
}

// "2026-11-22 14-05-09", the Mac's backup folder's date.
function stampOf(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

/** The shas the notes' blocks name (a file block's `f.sha`), for the sweep after a save (the Mac's Attachments.referenced). */
function referenced(notes) {
  const out = new Set();
  for (const n of Array.isArray(notes) ? notes : []) {
    for (const b of (n && Array.isArray(n.blocks) && n.blocks) || []) {
      const f = b && b.f;
      if (f && typeof f.sha === 'string') out.add(f.sha);
    }
  }
  return out;
}

function createNotesStore({ dir, keyFile, safeStorage }) {
  let key = null;
  // Each file's content as read or written here: a note is written again only when it changed, and only a file read or
  // written here is ever deleted (one that couldn't be read stays as it is).
  const known = new Map();
  let queue = Promise.resolve();

  const fileOf = (name) => path.join(dir, `${name}.note`);
  const yFile = (id) => path.join(dir, `${id}.ydoc`);
  const filesDir = path.join(dir, 'files');
  const blobOf = (sha) => path.join(filesDir, sha);
  const stored = () => {
    try {
      return fs.readdirSync(dir).filter((n) => n.endsWith('.note')).map((n) => n.slice(0, -5));
    } catch {
      return [];
    }
  };

  // One at a time, in the order they came: the notes, their documents and their files (the Mac's NotesStore.queue).
  function serial(fn) {
    const run = queue.then(fn);
    queue = run.catch(() => {});
    return run;
  }

  // The key, made the first time only while there's no note it would have to read.
  async function theKey(create) {
    if (key) return key;
    if (!(await safeStorage.isAsyncEncryptionAvailable())) throw new Error("Windows can't protect the notes' key right now");
    let sealed = null;
    try {
      sealed = fs.readFileSync(keyFile);
    } catch {}
    if (sealed) {
      const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(sealed);
      const k = Buffer.from(result, 'base64');
      if (k.length !== 32) throw new Error("the notes' key is damaged");
      if (shouldReEncrypt) writeWhole(keyFile, await safeStorage.encryptStringAsync(result));
      return (key = k);
    }
    if (!create || stored().length) throw new Error("the notes' key is missing");
    const k = crypto.randomBytes(32);
    fs.mkdirSync(path.dirname(keyFile), { recursive: true });
    writeWhole(keyFile, await safeStorage.encryptStringAsync(k.toString('base64')));
    return (key = k);
  }

  // Where the backups of the notes go: next to their folder, "Notes backups" (the Mac's NotesStore.backups).
  const backups = path.join(path.dirname(dir), `${path.basename(dir)} backups`);

  // The folder of notes copied as it is, files still encrypted and opened by the same key, to "<backups>/<date time> v3":
  // putting it back in place is all it takes to go back (the Mac's backUpV3). Done again whenever the notes are still v3 and
  // one changed since the last copy; nothing is written to the notes themselves. False when no copy is there.
  function backUpV3() {
    const mtime = (p) => {
      try {
        return fs.statSync(p).mtimeMs;
      } catch {
        return null;
      }
    };
    const newest = Math.max(-Infinity, ...stored().map((n) => mtime(fileOf(n))).filter((t) => t !== null));
    try {
      const last = Math.max(-Infinity, ...fs.readdirSync(backups).filter((n) => n.endsWith(' v3')).map((n) => mtime(path.join(backups, n))).filter((t) => t !== null));
      if (last > -Infinity && newest <= last) return true;
    } catch {}
    const partial = path.join(backups, `.partial-${crypto.randomUUID()}`);
    try {
      fs.mkdirSync(backups, { recursive: true });
      // Copied under another name and renamed when whole: a copy cut short isn't taken for the backup.
      fs.cpSync(dir, partial, { recursive: true, errorOnExist: true, force: false });
      const now = new Date();
      fs.utimesSync(partial, now, now);
      fs.renameSync(partial, path.join(backups, `${stampOf(now)} v3`));
      return true;
    } catch (e) {
      console.error('notes: the v3 backup failed:', e.code || e.message);
      try {
        fs.rmSync(partial, { recursive: true, force: true });
      } catch {}
      return false;
    }
  }

  // Every note, in their order, as the page keeps them ({ v, ordered, pinned, current, backedUp, notes }, JSON); null when
  // there are none yet. `backedUp`: the page may make the notes v4 (an id for every block) only when this says the folder was
  // copied first (the Mac's load).
  async function load() {
    const names = stored();
    if (!names.length) return null;
    const k = await theKey(false);
    let index = {};
    const notes = new Map();
    for (const name of names) {
      if (name !== INDEX && !NAME.test(name)) continue;
      let plain;
      let object;
      try {
        plain = open(fs.readFileSync(fileOf(name)), name, k);
        object = JSON.parse(plain.toString('utf8'));
      } catch {
        continue;
      }
      if (!object || typeof object !== 'object') continue;
      known.set(name, plain.toString('utf8'));
      if (name === INDEX) index = object;
      else if (object.id === name) notes.set(name, object);
    }
    const order = (Array.isArray(index.order) ? index.order : []).filter((id) => notes.has(id));
    const rest = [...notes.keys()].filter((id) => !order.includes(id)).sort((a, b) => (Number(notes.get(b).at) || 0) - (Number(notes.get(a).at) || 0));
    const version = Number.isInteger(index.v) ? index.v : 3;
    const pad = { v: version, ordered: index.ordered === true, notes: [...order, ...rest].map((id) => notes.get(id)) };
    pad.backedUp = version >= 4 || backUpV3();
    if (typeof index.pinned === 'string') pad.pinned = index.pinned;
    if (typeof index.current === 'string') pad.current = index.current;
    return JSON.stringify(pad);
  }

  function put(object, name, k) {
    const plain = JSON.stringify(object);
    if (known.get(name) === plain) return;
    writeWhole(fileOf(name), seal(Buffer.from(plain, 'utf8'), name, k));
    known.set(name, plain);
  }

  // The notes as the page has them now (JSON): each that changed written again, each no longer there deleted; the documents of
  // notes that are gone, and the files no note names any more (after a grace), go too.
  async function save(json) {
    const pad = JSON.parse(String(json));
    if (!pad || !Array.isArray(pad.notes)) throw new Error('bad request');
    const k = await theKey(true);
    fs.mkdirSync(dir, { recursive: true });
    const order = [];
    for (const note of pad.notes) {
      if (!note || typeof note.id !== 'string' || !NAME.test(note.id) || order.includes(note.id)) continue;
      order.push(note.id);
      put(note, note.id, k);
    }
    const index = { v: Number.isInteger(pad.v) ? pad.v : 3, ordered: pad.ordered !== false, order };
    if (typeof pad.pinned === 'string') index.pinned = pad.pinned;
    if (typeof pad.current === 'string') index.current = pad.current;
    put(index, INDEX, k);
    sweepY(new Set(order));
    if (order.length) sweepFiles(referenced(pad.notes));
    const keep = new Set([...order, INDEX]);
    for (const name of [...known.keys()]) {
      if (keep.has(name)) continue;
      try {
        fs.unlinkSync(fileOf(name));
      } catch {}
      known.delete(name);
    }
  }

  // The notes AI may not see, from the files' own content as read or written here (what the page last saved): the AI tools
  // ask this on every call and don't take the page's word for it (the Mac's NotesStore.hiddenKinds). Two kinds, kept apart so
  // the answer can say which switch to flip: `user`, a note the user hid (the eye); `sharedOff`, a shared note whose owner
  // hasn't let AI read it (`shared.ai` isn't true: the default). The owner's own AI always sees their shared notes (`shared.mine`).
  function hiddenKinds() {
    const user = new Set(), sharedOff = new Set();
    for (const [name, plain] of known) {
      if (name === INDEX || (!plain.includes('"aiHidden":true') && !plain.includes('"shared":'))) continue;
      try {
        const o = JSON.parse(plain);
        if (o && o.aiHidden === true) user.add(name);
        else if (o && o.shared && typeof o.shared === 'object' && o.shared.ai !== true && o.shared.mine !== true) sharedOff.add(name);
      } catch {}
    }
    return { user, sharedOff };
  }

  function hiddenIDs() {
    const k = hiddenKinds();
    return new Set([...k.user, ...k.sharedOff]);
  }

  // ---------- a shared note's document (the Mac's loadY / saveY) ----------
  // A shared note's Yjs document (what makes edits made offline merge when the line is back) is kept beside its note, encrypted
  // with the same key and bound to its name. Only the page that holds the note live writes it; no private note has one.

  async function loadY(id) {
    if (!NAME.test(String(id))) return null;
    let file;
    try {
      file = fs.readFileSync(yFile(id));
    } catch {
      return null;
    }
    const k = await theKey(false);
    try {
      return openWith(file, Y_HEADER, yAAD(id), k);
    } catch {
      return null;
    }
  }

  // null deletes it.
  async function saveY(id, data) {
    if (!NAME.test(String(id))) throw new Error('bad request');
    if (!data) {
      try {
        fs.unlinkSync(yFile(id));
      } catch {}
      return;
    }
    const k = await theKey(true);
    fs.mkdirSync(dir, { recursive: true });
    writeWhole(yFile(id), sealWith(data, Y_HEADER, yAAD(id), k));
  }

  // The documents of notes that are gone (removed from the shared note, deleted): nothing of them stays.
  function sweepY(ids) {
    let names = [];
    try {
      names = fs.readdirSync(dir).filter((f) => f.endsWith('.ydoc'));
    } catch {}
    for (const f of names) {
      if (ids.has(f.slice(0, -5))) continue;
      try {
        fs.unlinkSync(path.join(dir, f));
      } catch {}
    }
  }

  // ---------- the folder of files (the Mac's NotesStore extension in Attachments.swift) ----------

  const hasFile = (sha) => SHA.test(String(sha)) && fs.existsSync(blobOf(sha));

  // Keeps a file, encrypted, under its SHA-256. False when it couldn't be kept.
  async function putFile(data, sha) {
    if (!SHA.test(String(sha))) return false;
    let k;
    try {
      k = await theKey(true);
    } catch {
      return false;
    }
    try {
      if (hasFile(sha)) {
        const now = new Date();
        fs.utimesSync(blobOf(sha), now, now);
        return true;
      }
      fs.mkdirSync(filesDir, { recursive: true });
      writeWhole(blobOf(sha), sealWith(data, FILE_HEADER, fileAAD(sha), k));
      return true;
    } catch {
      return false;
    }
  }

  // A file's bytes; null when it isn't here, doesn't open, or isn't what its name says.
  async function getFile(sha) {
    if (!SHA.test(String(sha))) return null;
    let file;
    try {
      file = await fs.promises.readFile(blobOf(sha));
    } catch {
      return null;
    }
    try {
      const plain = openWith(file, FILE_HEADER, fileAAD(sha), await theKey(false));
      return plain && sha256(plain) === sha ? plain : null;
    } catch {
      return null;
    }
  }

  // The ids of file blocks added on this PC and not yet uploaded, in the order added (newest last, 2000 at most), changed by
  // `add` and `remove` and returned. A plain file of ids in the files folder; only this queue touches it.
  function pendingAdds(add, remove) {
    const file = path.join(filesDir, '_adds.json');
    let ids = [];
    try {
      const v = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(v)) ids = v.filter((x) => typeof x === 'string' && BLOCK_ID.test(x));
    } catch {}
    if (!add.length && !remove.length) return ids;
    ids = ids.filter((x) => !remove.includes(x) && !add.includes(x)).concat(add);
    if (ids.length > 2000) ids = ids.slice(ids.length - 2000);
    try {
      fs.mkdirSync(filesDir, { recursive: true });
      writeWhole(file, JSON.stringify(ids));
    } catch {}
    return ids;
  }

  function removeFiles(shas) {
    for (const s of shas) {
      if (!SHA.test(String(s))) continue;
      try {
        fs.unlinkSync(blobOf(s));
      } catch {}
    }
  }

  // Files no block names go, once they are 10 minutes old (a block just added may not have been saved yet).
  function sweepFiles(keep) {
    let names = [];
    try {
      names = fs.readdirSync(filesDir).filter((f) => SHA.test(f) && !keep.has(f));
    } catch {}
    for (const f of names) {
      try {
        if (Date.now() - fs.statSync(blobOf(f)).mtimeMs > 600_000) fs.unlinkSync(blobOf(f));
      } catch {}
    }
  }

  // { type: 'load' } answers { json } (null with no notes yet), { type: 'save', json } answers { ok }; either answers
  // { error } when it can't. One at a time, in the order they came.
  function handle(body) {
    const run = serial(async () => {
      if (body.type === 'load') return { json: await load() };
      if (body.type === 'save') {
        await save(body.json);
        return { ok: true };
      }
      throw new Error('unknown request');
    });
    return run.catch((err) => ({ error: String((err && err.message) || err) }));
  }

  return {
    handle, hiddenIDs, hiddenKinds, serial, loadY, saveY, hasFile, putFile, getFile, pendingAdds, removeFiles,
    validName: (s) => typeof s === 'string' && NAME.test(s),
  };
}

module.exports = { createNotesStore, seal, open, sealWith, openWith, referenced, Y_HEADER, FILE_HEADER, Y_MAX, yAAD, fileAAD };
