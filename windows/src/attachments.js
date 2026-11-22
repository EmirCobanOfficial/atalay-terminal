'use strict';
// Files in notes, the Mac's Attachments.swift. A private note's files stay on this PC, in "<Notes folder>\files\<sha256>",
// encrypted like the notes (notesstore.js); a file of a shared note goes to the server's storage with an address the API signs
// (the PUT, and the download the API streams, happen here in the main process, never in the page, so the storage needs no
// CORS), and a copy fetched from it is kept in the same folder as a cache. The pages ask through the notes' bridges
// (notessync.js) and never see a path. Nothing here logs a file's bytes or a note's text.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_FILE = 20 * 1024 * 1024;
// Programs, installers and links that run something: not added, to keep friends safe (the server checks the name, this the
// first bytes too). The Mac's Attachments.blocked, word for word.
const BLOCKED = new Set([
  'exe', 'msi', 'bat', 'cmd', 'com', 'scr', 'ps1', 'vbs', 'hta', 'lnk', 'cpl', 'jar', 'app', 'pkg', 'dmg', 'command',
  'js', 'jse', 'wsf', 'wsh', 'vbe', 'reg', 'url', 'msix', 'msp', 'appx', 'appinstaller', 'iso', 'img', 'vhd', 'vhdx',
  'terminal', 'webloc', 'inetloc', 'fileloc', 'workflow', 'action', 'sh', 'scpt',
]);
// Pictures a note draws in place; everything else is a card (SVG and HTML never run).
const PICTURES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
// A type for a name that came with none (the Mac asks UTType for the extension's preferred type).
const TYPES = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  bmp: 'image/bmp', heic: 'image/heic', tif: 'image/tiff', tiff: 'image/tiff', ico: 'image/vnd.microsoft.icon',
  pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown', csv: 'text/csv', json: 'application/json', xml: 'application/xml',
  html: 'text/html', htm: 'text/html', css: 'text/css', zip: 'application/zip', gz: 'application/gzip', tar: 'application/x-tar',
  '7z': 'application/x-7z-compressed', rar: 'application/vnd.rar', mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', rtf: 'application/rtf',
};
const SHA = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BLOCK_ID = /^[A-Za-z0-9_-]{1,64}$/;
const B64 = /^[A-Za-z0-9+/]*={0,2}$/;

const hex = (data) => crypto.createHash('sha256').update(data).digest('hex');
const validSha = (s) => typeof s === 'string' && SHA.test(s);
const validBlockId = (s) => typeof s === 'string' && BLOCK_ID.test(s);
const ext = (name) => {
  const e = path.extname(String(name || ''));
  return e.length > 1 ? e.slice(1).toLowerCase() : '';
};

/** What the first bytes say: a Windows program (MZ), a Mac one (Mach-O, fat) or a script that asks to run (#!). */
function looksLikeProgram(d) {
  if (d.length >= 2 && d[0] === 0x4d && d[1] === 0x5a) return true;
  if (d.length >= 2 && d[0] === 0x23 && d[1] === 0x21) return true;
  if (d.length >= 4) {
    const w = d.readUInt32BE(0);
    return [0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe, 0xcafebabe, 0xbebafeca].includes(w);
  }
  return false;
}

/** The picture type the bytes are, null for anything else. */
function pictureType(d) {
  if (d.length >= 8 && d[0] === 0x89 && d[1] === 0x50 && d[2] === 0x4e && d[3] === 0x47) return 'image/png';
  if (d.length >= 3 && d[0] === 0xff && d[1] === 0xd8 && d[2] === 0xff) return 'image/jpeg';
  if (d.length >= 4 && d[0] === 0x47 && d[1] === 0x49 && d[2] === 0x46 && d[3] === 0x38) return 'image/gif';
  if (d.length >= 12 && d[0] === 0x52 && d[1] === 0x49 && d[2] === 0x46 && d[3] === 0x46 && d[8] === 0x57 && d[9] === 0x45 && d[10] === 0x42 && d[11] === 0x50) return 'image/webp';
  return null;
}

/** A name safe to show and to save under (the server's rules, the Mac's cleanName): NFC, no control or direction characters,
 *  no / \ : * ? " < > |, no leading dot, no trailing dot or space, at most 120 characters with the extension kept. */
function cleanName(raw) {
  let n = String(raw ?? '').normalize('NFC');
  n = Array.from(n)
    .filter((ch) => {
      const v = ch.codePointAt(0);
      return !(v < 0x20 || (v >= 0x7f && v <= 0x9f) || (v >= 0x200b && v <= 0x200f) || (v >= 0x202a && v <= 0x202e) || (v >= 0x2066 && v <= 0x2069) || v === 0xfeff);
    })
    .map((ch) => ('/\\:*?"<>|'.includes(ch) ? '_' : ch))
    .join('');
  n = n.replace(/^[ \t]+|[ \t]+$/g, '');
  while (n.startsWith('.')) n = n.slice(1);
  while (n.endsWith('.') || n.endsWith(' ')) n = n.slice(0, -1);
  if (!n) n = 'file';
  if (Array.from(n).length > 120) {
    const e = path.extname(n).slice(1);
    const tail = !e || Array.from(e).length > 11 ? '' : `.${e}`;
    n = Array.from(n).slice(0, 120 - Array.from(tail).length).join('') + tail;
  }
  return n;
}

/** Keeps `data` (a file the user added) and says what it is: { sha, name, size, mime }, or { error }. */
async function add(data, rawName, given, store) {
  const name = cleanName(rawName);
  if (!data.length) return { error: 'empty' };
  if (data.length > MAX_FILE) return { error: 'too_big' };
  if (BLOCKED.has(ext(name)) || looksLikeProgram(data)) return { error: 'blocked_type' };
  let mime = String(given || '').toLowerCase();
  if (!mime || mime === 'application/octet-stream') mime = TYPES[ext(name)] || 'application/octet-stream';
  // A picture is drawn only when its bytes are one (a name or a type can say anything).
  if (PICTURES.has(mime) || mime.startsWith('image/')) mime = pictureType(data) || (mime === 'image/svg+xml' ? mime : 'application/octet-stream');
  const sha = hex(data);
  if (!(await store.putFile(data, sha))) return { error: 'disk' };
  return { sha, name, size: data.length, mime };
}

// Windows only: a name Windows keeps for a device (CON, NUL, COM1…, with any extension) would write to the device, not a file;
// it gets "_" before it.
const DEVICE = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(\.|$)/i;
const notDevice = (name) => (DEVICE.test(name) ? `_${name}` : name);

/** A target in `dir` named `name`, or "name 2.ext", "name 3.ext"… when it's taken (the Mac's save). */
function freeName(dir, name, exists = fs.existsSync) {
  const e = path.extname(name);
  const base = e ? name.slice(0, -e.length) : name;
  let target = path.join(dir, name);
  for (let n = 2; exists(target) && n < 10000; n++) target = path.join(dir, `${base} ${n}${e}`);
  return target;
}

/**
 * store: notesstore.js. cloud: cloud.js ({ appCall, fileData }). fetch: Electron's net.fetch (the PUT to the storage).
 * dialog, shell: Electron's. downloads(): the Downloads folder. parent(sender): the window a picker opens over.
 */
function createAttachments({ store, cloud, fetch: fetcher, dialog, shell, downloads, parent }) {
  // Downloads waiting for one of two places, in order (the Mac's Slots): a note full of pictures doesn't ask for them all at once.
  const slots = { free: 2, waiting: [] };
  const acquire = () => (slots.free > 0 ? (slots.free--, Promise.resolve()) : new Promise((r) => slots.waiting.push(r)));
  const release = () => (slots.waiting.length ? slots.waiting.shift()() : slots.free++);
  const nap = (ms) => new Promise((r) => setTimeout(r, ms));

  // Adds `data` to a shared note: the API checks and signs, the bytes go straight to the storage with the headers it signed, the
  // API looks at what arrived. { att } (the attachment's id) or { error } (the API's code, "offline", "put_<status>").
  async function upload(data, sha, note, name, mime) {
    if (hex(data) !== sha) return { error: 'changed' };
    const m = await cloud.appCall('POST', `v1/notes/${note}/attachments`, { name, size: data.length, mime, sha256: sha });
    if (!m || typeof m !== 'object') return { error: 'offline' };
    if (typeof m.error === 'string') return { error: m.error };
    // The same file is already in this note (a retry, the same file in two blocks): nothing to send.
    if (m.done === true && typeof m.id === 'string') return { att: m.id };
    if (typeof m.id !== 'string' || typeof m.url !== 'string' || !m.headers || typeof m.headers !== 'object') return { error: 'bad_answer' };
    let url;
    try {
      url = new URL(m.url);
    } catch {
      return { error: 'bad_answer' };
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return { error: 'bad_answer' };
    // The signed headers as they came (Content-Type, x-amz-checksum-sha256); Content-Length is the body's own.
    const headers = {};
    for (const [k, v] of Object.entries(m.headers)) if (typeof v === 'string' && k.toLowerCase() !== 'content-length') headers[k] = v;
    try {
      const res = await fetcher(url.href, { method: 'PUT', headers, body: data, redirect: 'error', signal: AbortSignal.timeout(300_000) });
      if (res.status < 200 || res.status >= 300) return { error: `put_${res.status}` };
    } catch {
      return { error: 'offline' };
    }
    const finished = await cloud.appCall('POST', `v1/attachments/${m.id}/done`, {});
    if (finished && typeof finished.error === 'string') return { error: finished.error };
    return { att: m.id };
  }

  // A file of a shared note, streamed by the API (it counts the bytes against the account's day) and checked here against the
  // size and the SHA-256 the API says it has. { data, sha, name } or { error }.
  async function download(att) {
    // At most two at a time on this PC (the API lets an account stream two). If the API still says it's busy (another computer of
    // the account), wait as it says and ask again; busy is never shown as an error.
    await acquire();
    try {
      let got = await cloud.fileData(`v1/attachments/${att}/file`);
      for (let tries = 0; got.error === 'too_many_downloads' && tries < 40; tries++) {
        const wait = Math.min(10, Math.max(1, Number(got.headers && got.headers['retry-after']) || 3));
        await nap(wait * 1000);
        got = await cloud.fileData(`v1/attachments/${att}/file`);
      }
      if (!got.data) return { error: got.error || 'offline' };
      const h = got.headers || {};
      const sha = h['x-attachment-sha256'];
      const size = Number.parseInt(h['x-attachment-size'] || '', 10);
      if (!validSha(sha) || !Number.isInteger(size) || size > MAX_FILE) return { error: 'bad_answer' };
      if (got.data.length !== size || hex(got.data) !== sha) return { error: 'damaged' };
      if (looksLikeProgram(got.data)) return { error: 'blocked_type' };
      let name = null;
      try {
        if (typeof h['x-attachment-name'] === 'string') name = cleanName(decodeURIComponent(h['x-attachment-name']));
      } catch {}
      return { data: got.data, sha, name };
    } finally {
      release();
    }
  }

  // Writes the file to Downloads under its name (never over another file) with the mark of the web (Zone.Identifier: the
  // Internet zone), so Windows warns before it's opened, and shows it in Explorer. Nothing is opened. The Mac's save, whose
  // quarantine mark this is.
  async function saveOut(data, name) {
    let dir;
    try {
      dir = downloads();
    } catch {
      return { error: 'disk' };
    }
    if (!dir) return { error: 'disk' };
    let target = null;
    for (let i = 0; i < 5; i++) {
      target = freeName(dir, name);
      try {
        await fs.promises.writeFile(target, data, { flag: 'wx' });
        break;
      } catch (e) {
        if (e.code !== 'EEXIST' || i === 4) return { error: 'disk' };
      }
    }
    // An NTFS stream beside the file; a drive without streams (FAT, exFAT) just has no mark.
    try {
      await fs.promises.writeFile(`${target}:Zone.Identifier`, '[ZoneTransfer]\r\nZoneId=3\r\n');
    } catch {}
    setImmediate(() => {
      try {
        shell.showItemInFolder(target);
      } catch {}
    });
    return { ok: true, name: path.basename(target) };
  }

  // The app's file picker (the page never sees a path): 10 files at most, each one's size looked at before it is read.
  async function pick(sender) {
    const win = parent ? parent(sender) : null;
    const options = { title: 'Choose files to add to the note', buttonLabel: 'Add', properties: ['openFile', 'multiSelections'] };
    const r = win && !win.isDestroyed() ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    if (r.canceled || !Array.isArray(r.filePaths)) return { files: [], errors: [] };
    const files = [];
    const errors = [];
    for (const p of r.filePaths.slice(0, 10)) {
      let size = 0;
      try {
        size = (await fs.promises.stat(p)).size;
      } catch {}
      if (size > MAX_FILE) {
        errors.push('too_big');
        continue;
      }
      let d;
      try {
        d = await fs.promises.readFile(p);
      } catch {
        errors.push('read');
        continue;
      }
      const a = await store.serial(() => add(d, path.basename(p), null, store));
      if (a.error) errors.push(a.error);
      else files.push(a);
    }
    return { files, errors };
  }

  /** The notes' bridges' file messages (the Mac's Attachments.handle): every one answers. `sender` picks the picker's window. */
  async function handle(type, body, sender) {
    switch (type) {
      case 'attPick':
        return pick(sender);
      case 'attAdd': {
        const b64 = body.b64;
        if (typeof b64 !== 'string' || b64.length > 28_000_000 || !B64.test(b64)) return { error: 'read' };
        const d = Buffer.from(b64, 'base64');
        const name = typeof body.name === 'string' ? body.name : 'file';
        const mime = typeof body.mime === 'string' ? body.mime : null;
        return store.serial(() => add(d, name, mime, store));
      }
      case 'attHas': {
        const shas = (Array.isArray(body.shas) ? body.shas : []).filter(validSha).slice(0, 500);
        return store.serial(() => ({ have: shas.filter((s) => store.hasFile(s)) }));
      }
      case 'attRead': {
        if (!validSha(body.sha)) return { error: 'bad_request' };
        const d = await store.serial(() => store.getFile(body.sha));
        return d ? { b64: d.toString('base64') } : { error: 'missing' };
      }
      case 'attSave': {
        if (!validSha(body.sha)) return { error: 'bad_request' };
        // The name comes from a block (any member can write it): a name that is a program's or a script's gets ".txt" after it,
        // so what is saved can't be one Windows would run when it's opened.
        let name = notDevice(cleanName(typeof body.name === 'string' ? body.name : 'file'));
        if (BLOCKED.has(ext(name))) name += '.txt';
        const d = await store.serial(() => store.getFile(body.sha));
        if (!d) return { error: 'missing' };
        return saveOut(d, name);
      }
      case 'attAdds': {
        // The blocks added on this PC that haven't gone up yet, kept here (the dashboard and the note windows are pages with
        // storage of their own; a list in each would lose entries).
        const addIds = (Array.isArray(body.add) ? body.add : []).filter(validBlockId);
        const removeIds = (Array.isArray(body.remove) ? body.remove : []).filter(validBlockId);
        return store.serial(() => ({ ids: store.pendingAdds(addIds, removeIds) }));
      }
      case 'attForget': {
        const shas = (Array.isArray(body.shas) ? body.shas : []).filter(validSha);
        return store.serial(() => {
          store.removeFiles(shas);
          return { ok: true };
        });
      }
      case 'attUpload': {
        const note = body.note;
        if (typeof note !== 'string' || !UUID.test(note) || !validSha(body.sha)) return { error: 'bad_request' };
        const name = cleanName(typeof body.name === 'string' ? body.name : 'file');
        const mime = typeof body.mime === 'string' && body.mime ? body.mime : 'application/octet-stream';
        const d = await store.serial(() => store.getFile(body.sha));
        if (!d) return { error: 'missing' };
        return upload(d, body.sha, note.toLowerCase(), name, mime);
      }
      case 'attDownload': {
        if (typeof body.att !== 'string' || !UUID.test(body.att)) return { error: 'bad_request' };
        const r = await download(body.att.toLowerCase());
        if (!r.data) return { error: r.error || 'offline' };
        const kept = await store.serial(() => store.putFile(r.data, r.sha));
        return kept ? { ok: true, sha: r.sha, name: r.name || '' } : { error: 'disk' };
      }
      case 'attRemove': {
        if (typeof body.att !== 'string' || !UUID.test(body.att)) return { error: 'bad_request' };
        const att = body.att.toLowerCase();
        // `restore`: a block is back in the note (the uploader's app asks to bring its file back).
        const r = body.restore === true ? await cloud.appCall('POST', `v1/attachments/${att}/restore`, {}) : await cloud.appCall('DELETE', `v1/attachments/${att}`, null);
        return r && typeof r === 'object' && typeof r.error === 'string' ? r : { ok: true };
      }
      default:
        return { error: 'unknown request' };
    }
  }

  return { handle };
}

module.exports = { createAttachments, cleanName, looksLikeProgram, pictureType, add, freeName, MAX_FILE, BLOCKED };
