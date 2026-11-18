'use strict';
// Viktoria is not in the app: her model, clips and motions are ONE obfuscated pak (ai-character/pack-viktoria.py) that the
// app downloads the first time the user asks for her (the repo is public and the licenses forbid raw files in it). The Mac's
// MascotAsset.swift, same states and same rules. The file lives in %LOCALAPPDATA%\<userData's folder name> <hash of its
// path>\viktoria\viktoria.pak; without it no overlay is made. Her overlay reads it as viktoria://pak, served on the overlay's own session only (attach).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');

const SHA_KEY = 'viktoriaPakSHA';
const SIZE_KEY = 'viktoriaPakSize';
const HEX64 = /^[0-9a-f]{64}$/;

/**
 * Options: app, net, protocol (electron's), cloud (api(method, path) -> the API's JSON or { error }), settings,
 * localOk (plain http to this PC allowed: a staging build or a run from the sources), staging, enable(on) (her stored
 * switch), onChange(readinessChanged) (called on every change, progress included).
 */
function createMascotAsset(o) {
  const { net, settings } = o;
  // userData is the ROAMING profile on Windows: on a domain PC with roaming profiles a 34 MB file there would sync at every
  // logon and logoff. So the pak lives under %LOCALAPPDATA%, in a folder named like userData's own plus a short hash of
  // userData's full path (release, staging and --user-data-dir test profiles each get their own pak and never delete each
  // other's, even when two profiles in different places end in the same folder name).
  const userData = o.app.getPath('userData');
  const sub = o.staging ? 'viktoria (staging)' : 'viktoria';
  const oldFolder = path.join(userData, sub);
  const profileKey = `${path.basename(userData)} ${crypto.createHash('sha256').update(path.resolve(userData).toLowerCase()).digest('hex').slice(0, 8)}`;
  const folder = path.join(process.env.LOCALAPPDATA || path.join(o.app.getPath('appData'), '..', 'Local'), profileKey, sub);
  const pakFile = path.join(folder, 'viktoria.pak');

  let state = 'none'; // none | downloading | failed | ready
  let got = 0, total = 0, reason = '';
  let runId = 0; // the live download: a cancelled run that wakes late must not touch the next one's state or files
  let current = null; // { id, req, stream, part } of the live download
  let verifying = false; // the pak on disk is being hashed (once per launch); she isn't ready until it matches

  const isReady = () => state === 'ready';
  const json = () => JSON.stringify(state === 'downloading' ? { state, got, total } : state === 'failed' ? { state, reason } : { state });

  function set(next, r = '') {
    const wasReady = isReady();
    if (next === state && r === reason) return;
    state = next;
    reason = r;
    if (next !== 'downloading') got = total = 0;
    o.onChange(wasReady !== isReady());
  }

  // ---------- the file ----------
  function sweep() {
    try {
      for (const f of fs.readdirSync(folder)) if (f.endsWith('.part')) fs.rmSync(path.join(folder, f), { force: true });
    } catch {}
  }

  function forget() {
    settings.set(SHA_KEY, null);
    settings.set(SIZE_KEY, null);
  }

  function discardPak() {
    try {
      fs.rmSync(pakFile, { force: true });
    } catch {}
    forget();
  }

  // An earlier version kept the pak in the roaming userData folder. Move it over once (a rename; across drives, e.g. a
  // roaming AppData redirected to a share, it is copied to a .part in the new folder and renamed into place; if even that
  // fails the file is simply dropped: the user can download again, and the stored size and SHA then match no file, which
  // init handles), then remove the old folder. Never throws.
  function migrate() {
    try {
      // Windows paths are case-insensitive: the same folder in other letters is still the same folder, and must not be deleted.
      if (path.resolve(oldFolder).toLowerCase() === path.resolve(folder).toLowerCase()) return;
      const old = path.join(oldFolder, 'viktoria.pak');
      // A move that failed only for now (antivirus on the file) leaves the old folder for the next launch to try again.
      let keepOld = false;
      if (fs.existsSync(old)) {
        let part = null;
        try {
          fs.mkdirSync(folder, { recursive: true });
          if (!fs.existsSync(pakFile)) {
            try {
              fs.renameSync(old, pakFile);
            } catch (e) {
              if (!e || e.code !== 'EXDEV') throw e;
              part = path.join(folder, `viktoria-${crypto.randomUUID()}.part`);
              fs.copyFileSync(old, part);
              fs.renameSync(part, pakFile);
              part = null;
            }
          }
        } catch (e) {
          keepOld = !!e && TRANSIENT.has(e.code);
          if (part) {
            try {
              fs.rmSync(part, { force: true });
            } catch {}
          }
        }
      }
      if (!keepOld) fs.rmSync(oldFolder, { recursive: true, force: true });
    } catch {}
  }

  // Errors that say "not now" (antivirus or another process has the file), not "this file is bad".
  const TRANSIENT = new Set(['EBUSY', 'EPERM', 'EACCES', 'EMFILE', 'ENFILE']);

  // Size and SHA-256 of a file, read in pieces (never the whole 34 MB in memory). Resolves 'ok', 'bad' (missing, wrong size
  // or wrong hash) or 'busy' (a transient error: nothing is known about the file, so it must not be judged).
  function verify(file, size, sha) {
    return new Promise((resolve) => {
      const fromErr = (e) => resolve(e && TRANSIENT.has(e.code) ? 'busy' : 'bad');
      let n;
      try {
        n = fs.statSync(file).size;
      } catch (e) {
        return fromErr(e);
      }
      if (n !== size) return resolve('bad');
      const h = crypto.createHash('sha256');
      const s = fs.createReadStream(file);
      s.on('data', (c) => h.update(c));
      s.on('error', fromErr);
      s.on('end', () => resolve(h.digest('hex') === sha ? 'ok' : 'bad'));
    });
  }

  // The pak from an earlier run is hashed once, asynchronously, before she may come up: a changed or damaged file is
  // deleted and the user is offered the download again. A transient read error (the file locked for a moment) is not that:
  // the file and the settings stay, she is just not ready yet, and the check is tried again a few seconds later.
  const VERIFY_TRIES = 6, VERIFY_WAIT = 5000;
  let retryTimer = null; // the pending wait between two checks; get() or remove() clears it
  function stopRetry() {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  function checkPak(size, sha, tries) {
    verifying = true;
    verify(pakFile, size, sha).then((r) => {
      if (!verifying) return;
      if (r === 'busy') {
        if (tries < VERIFY_TRIES) {
          retryTimer = setTimeout(() => {
            retryTimer = null;
            if (verifying) checkPak(size, sha, tries + 1);
          }, VERIFY_WAIT);
        } else verifying = false; // gave up for this launch: not ready, but the pak is kept
        return;
      }
      verifying = false;
      if (r === 'ok') set('ready');
      else {
        discardPak();
        set('failed', 'checksum');
      }
    });
  }

  function init() {
    migrate();
    sweep();
    const size = settings.get(SIZE_KEY), sha = settings.get(SHA_KEY);
    if (!Number.isInteger(size) || size <= 0 || typeof sha !== 'string' || !HEX64.test(sha) || !fs.existsSync(pakFile)) {
      if (fs.existsSync(pakFile)) discardPak(); // a pak nobody remembers: not trusted, not kept
      return;
    }
    checkPak(size, sha, 0);
  }

  // The page couldn't use the pak (mascot.js posts loadFailed): deleted, she goes down, Try again shows.
  // Only if the file no longer matches: when it still does (no WebGL: no GPU, a remote session, a VM) she stays ready, just
  // not drawn, and a new download would change nothing.
  let loadFailedLogged = false;
  async function loadFailed() {
    if (!isReady() || checking) return;
    const size = settings.get(SIZE_KEY), sha = settings.get(SHA_KEY);
    checking = true;
    const r = Number.isInteger(size) && typeof sha === 'string' ? await verify(pakFile, size, sha) : 'bad';
    checking = false;
    if (!isReady()) return;
    if (r === 'busy') return; // can't tell right now: neither deleted nor blamed
    if (r === 'ok') {
      if (!loadFailedLogged) {
        loadFailedLogged = true;
        console.warn("viktoria: her page couldn't start (graphics unavailable?); the pak is intact, so it is kept");
      }
      return;
    }
    discardPak();
    set('failed', 'unreadable');
  }
  let checking = false;

  // ---------- actions (the pages send mascotGet, mascotCancel, mascotRemove) ----------
  function allowed(u) {
    if (u.protocol === 'https:') return true;
    return !!o.localOk && u.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(u.hostname);
  }

  function get() {
    // The user asked while the launch check is only waiting to retry (the UI shows 'none'): drop that check; the download
    // replaces the old file atomically. A check that is actually reading the file right now is still waited for.
    if (retryTimer) {
      stopRetry();
      verifying = false;
    }
    if (state === 'downloading' || state === 'ready' || verifying) return;
    const id = ++runId;
    set('downloading');
    fetchPak(id).catch(() => id === runId && fail('network'));
  }

  function stopCurrent() {
    const c = current;
    current = null;
    if (!c) return;
    try {
      c.req.abort();
    } catch {}
    try {
      c.stream && c.stream.destroy();
    } catch {}
    try {
      fs.rmSync(c.part, { force: true });
    } catch {}
  }

  function cancel() {
    if (state !== 'downloading') return;
    runId++;
    stopCurrent();
    set('none');
  }

  // Turns her off, deletes the file; nothing downloaded.
  function remove() {
    const id = ++runId;
    verifying = false;
    stopRetry();
    stopCurrent();
    o.enable(false); // her window goes first, then the file
    const wasReady = isReady();
    state = 'none';
    reason = '';
    got = total = 0;
    forget();
    o.onChange(wasReady); // this tears the overlay down, which lets go of the pak (an open viktoria:// read blocks the delete)
    dropFolder(id, 0);
  }

  // Deletes the folder; if something still holds it, tries again a few times. A get() in between (runId changed) owns the
  // folder again, so the late retry must leave it alone.
  function dropFolder(id, tries) {
    try {
      fs.rmSync(folder, { recursive: true, force: true });
      return;
    } catch {}
    if (tries >= 5) return;
    setTimeout(() => id === runId && dropFolder(id, tries + 1), 500);
  }

  function fail(why) {
    stopCurrent();
    set('failed', why);
  }

  // ---------- download ----------
  async function fetchPak(id) {
    // 1. Where is it? (the API's /v1/assets/viktoria, signed like its other calls)
    const a = await o.cloud.api('GET', 'v1/assets/viktoria');
    if (id !== runId) return;
    let url = null;
    try {
      url = new URL(String(a && a.url));
    } catch {}
    const sha = a && typeof a.sha256 === 'string' ? a.sha256.toLowerCase() : '';
    const size = a && Number.isInteger(a.size) ? a.size : 0;
    if (!a || a.error || !HEX64.test(sha) || size <= 0 || !url || !allowed(url)) return fail('no answer');
    total = size;
    set('downloading');
    o.onChange(false);

    // 2. Download it into the folder (its own file per run, so the move afterwards is atomic).
    try {
      fs.mkdirSync(folder, { recursive: true });
    } catch {
      return fail('disk');
    }
    const part = path.join(folder, `viktoria-${crypto.randomUUID()}.part`);
    const err = await download(id, url, part, size, sha);
    if (id !== runId) {
      try {
        fs.rmSync(part, { force: true });
      } catch {}
      return;
    }
    if (err) {
      try {
        fs.rmSync(part, { force: true });
      } catch {}
      return fail(err);
    }

    // 3. In place (a rename within one folder replaces any old pak atomically), remembered, and she is switched on: the
    // user asked for her.
    const moved = await moveIn(id, part);
    if (id !== runId) {
      try {
        fs.rmSync(part, { force: true });
      } catch {}
      return;
    }
    if (moved) {
      try {
        fs.rmSync(part, { force: true });
      } catch {}
      return fail(moved);
    }
    current = null;
    try {
      for (const f of fs.readdirSync(folder)) if (f !== 'viktoria.pak') fs.rmSync(path.join(folder, f), { force: true });
    } catch {}
    settings.set(SHA_KEY, sha);
    settings.set(SIZE_KEY, size);
    o.enable(true);
    set('ready');
  }

  // Windows Defender scans a file right after it is closed and can hold it for a moment, so the rename may fail with
  // EPERM/EBUSY/EACCES although nothing is wrong: retried with a growing wait (about 3 s in all), only for those codes, and
  // dropped as soon as the run is cancelled. Resolves null when moved, else a short reason.
  async function moveIn(id, part) {
    for (let i = 0; ; i++) {
      try {
        fs.renameSync(part, pakFile);
        return null;
      } catch (e) {
        if (!e || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code) || i >= 9) return 'disk';
      }
      await new Promise((r) => setTimeout(r, Math.min(100 * (i + 1), 400)));
      if (id !== runId) return 'cancelled';
    }
  }

  // Resolves null on success (the file at `part`, size and SHA-256 matched while it streamed), else a short reason.
  function download(id, url, part, size, sha) {
    return new Promise((resolve) => {
      let done = false;
      let finish = (r) => {
        if (done) return;
        done = true;
        resolve(r);
      };
      let req;
      try {
        // redirect 'manual': every hop is checked like the first (an https link may not lead to plain http elsewhere).
        req = net.request({ method: 'GET', url: url.href, redirect: 'manual', useSessionCookies: false, cache: 'no-store' });
      } catch {
        return finish('network');
      }
      const c = { id, req, stream: null, part };
      current = c;
      // No bytes for 30 s (reset by every chunk): the connection is dead.
      let idle = null;
      const bump = () => {
        clearTimeout(idle);
        idle = setTimeout(() => {
          try {
            req.abort();
          } catch {}
          finish('network');
        }, 30_000);
      };
      bump();
      const finish0 = finish;
      finish = (r) => {
        clearTimeout(idle);
        finish0(r);
      };
      let hops = 0;
      req.on('redirect', (_status, _method, location) => {
        let next = null;
        try {
          next = new URL(location);
        } catch {}
        if (!next || !allowed(next) || ++hops > 5) {
          try {
            req.abort();
          } catch {}
          return finish('network');
        }
        req.followRedirect();
      });
      req.on('error', () => finish(id === runId ? 'network' : 'cancelled'));
      req.on('abort', () => finish('cancelled'));
      req.on('response', (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          try {
            req.abort();
          } catch {}
          return finish(`http ${res.statusCode}`);
        }
        const out = fs.createWriteStream(part, { flags: 'wx' });
        c.stream = out;
        const hash = crypto.createHash('sha256');
        let n = 0, last = 0, bad = null;
        out.on('error', () => {
          bad = bad || 'disk';
          try {
            req.abort();
          } catch {}
          finish('disk');
        });
        res.on('data', (chunk) => {
          if (done) return;
          bump();
          n += chunk.length;
          if (n > size) {
            bad = 'checksum';
            try {
              req.abort();
            } catch {}
            return finish('checksum');
          }
          hash.update(chunk);
          if (!out.write(chunk) && typeof res.pause === 'function') {
            res.pause();
            out.once('drain', () => res.resume());
          }
          const now = Date.now();
          if (now - last >= 250 && id === runId && state === 'downloading') {
            last = now;
            got = n;
            o.onChange(false); // progress, at most 4 times a second
          }
        });
        res.on('aborted', () => finish(id === runId ? 'network' : 'cancelled'));
        res.on('error', () => finish('network'));
        res.on('end', () => {
          if (done || bad) return;
          // 'close', not end()'s callback ('finish'): only now is the file handle released, so the rename can't hit our own.
          out.once('close', () => {
            if (done) return; // the error handler above already answered
            if (id !== runId) return finish('cancelled');
            if (n !== size || hash.digest('hex') !== sha) return finish('checksum');
            finish(null);
          });
          out.end();
        });
      });
      req.end();
    });
  }

  // ---------- serving it to her overlay ----------
  // `viktoria://pak`, the one thing her page may fetch from outside its folder: the pak's bytes. Registered only on the
  // overlay's own session; anything else, or no pak, is a 404.
  function attach(ses) {
    if (ses.protocol.isProtocolHandled('viktoria')) return;
    ses.protocol.handle('viktoria', (request) => {
      const headers = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };
      let ok = false;
      try {
        const u = new URL(request.url);
        ok = u.protocol === 'viktoria:' && u.hostname === 'pak' && (u.pathname === '' || u.pathname === '/');
      } catch {}
      let size = 0;
      if (ok && isReady()) {
        try {
          size = fs.statSync(pakFile).size;
        } catch {}
      }
      if (!ok || !isReady() || size <= 0) return new Response(null, { status: 404, headers });
      return new Response(Readable.toWeb(fs.createReadStream(pakFile)), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/octet-stream', 'Content-Length': String(size) },
      });
    });
  }

  return { init, get, cancel, remove, loadFailed, attach, isReady, json };
}

module.exports = { createMascotAsset };
