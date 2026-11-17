'use strict';
// Viktoria is not in the app: her model, clips and motions are ONE obfuscated pak (ai-character/pack-viktoria.py) that the
// app downloads the first time the user asks for her (the repo is public and the licenses forbid raw files in it). The Mac's
// MascotAsset.swift, same states and same rules. The file lives in <userData>/viktoria/viktoria.pak; without it no overlay
// is made. Her overlay reads it as viktoria://pak, served on the overlay's own session only (attach).
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
  const folder = path.join(o.app.getPath('userData'), o.staging ? 'viktoria (staging)' : 'viktoria');
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

  // Size and SHA-256 of a file, read in pieces (never the whole 34 MB in memory).
  function verify(file, size, sha) {
    return new Promise((resolve) => {
      let n;
      try {
        n = fs.statSync(file).size;
      } catch {
        return resolve(false);
      }
      if (n !== size) return resolve(false);
      const h = crypto.createHash('sha256');
      const s = fs.createReadStream(file);
      s.on('data', (c) => h.update(c));
      s.on('error', () => resolve(false));
      s.on('end', () => resolve(h.digest('hex') === sha));
    });
  }

  // The pak from an earlier run is hashed once, asynchronously, before she may come up: a changed or damaged file is
  // deleted and the user is offered the download again.
  function init() {
    sweep();
    const size = settings.get(SIZE_KEY), sha = settings.get(SHA_KEY);
    if (!Number.isInteger(size) || size <= 0 || typeof sha !== 'string' || !HEX64.test(sha) || !fs.existsSync(pakFile)) {
      if (fs.existsSync(pakFile)) discardPak(); // a pak nobody remembers: not trusted, not kept
      return;
    }
    verifying = true;
    verify(pakFile, size, sha).then((ok) => {
      if (!verifying) return;
      verifying = false;
      if (ok) set('ready');
      else {
        discardPak();
        set('failed', 'checksum');
      }
    });
  }

  // The page couldn't use the pak (mascot.js posts loadFailed): deleted, she goes down, Try again shows.
  // Only if the file no longer matches: when it still does (no WebGL: no GPU, a remote session, a VM) she stays ready, just
  // not drawn, and a new download would change nothing.
  let loadFailedLogged = false;
  async function loadFailed() {
    if (!isReady() || checking) return;
    const size = settings.get(SIZE_KEY), sha = settings.get(SHA_KEY);
    checking = true;
    const ok = Number.isInteger(size) && typeof sha === 'string' && (await verify(pakFile, size, sha));
    checking = false;
    if (!isReady()) return;
    if (ok) {
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
    runId++;
    verifying = false;
    stopCurrent();
    o.enable(false); // her window goes first, then the file
    const wasReady = isReady();
    state = 'none';
    reason = '';
    got = total = 0;
    try {
      fs.rmSync(folder, { recursive: true, force: true });
    } catch {}
    forget();
    o.onChange(wasReady);
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
    try {
      fs.renameSync(part, pakFile);
    } catch {
      try {
        fs.rmSync(part, { force: true });
      } catch {}
      return fail('disk');
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
          out.end((err) => {
            if (err) return finish('disk');
            if (id !== runId) return finish('cancelled');
            if (n !== size || hash.digest('hex') !== sha) return finish('checksum');
            finish(null);
          });
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
