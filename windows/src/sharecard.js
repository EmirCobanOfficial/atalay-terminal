'use strict';
// The share card (web/share-card.js), the Mac's CloudBridge share part (Cloud.swift: shareImage, reveal, fetchImage): its
// picture to the clipboard or to Downloads, shown in Explorer, and the few images it draws (badges, avatars) fetched here,
// as data: addresses, so the picture never depends on the image servers' CORS headers (a canvas drawn with a cross-origin
// image can't be exported). The dashboard's page only (main.js checks the sender).
const fs = require('fs');
const path = require('path');

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const IMAGE_CAP = 3_000_000;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_REDIRECTS = 5;
const defaultPort = (scheme) => (scheme === 'https:' ? '443' : '80');

/**
 * Whether the share card may fetch `raw`: https only (no user, no port) for the files bucket's `/public/`, GitHub's avatars
 * and `*.orbiterm.dev`'s `/v1/avatars/`; and exactly the app's own configured API origin (a staging API is plain http on
 * 127.0.0.1) under `/v1/avatars/`. No "." or ".." segment (read decoded, so %2e%2e counts), no backslash.
 */
function mayFetchImage(raw, apiBase) {
  if (typeof raw !== 'string' || raw.includes('\\') || /%5c/i.test(raw)) return false;
  let u;
  let api;
  try {
    u = new URL(raw);
    api = new URL(apiBase);
  } catch {
    return false;
  }
  if (u.username || u.password) return false;
  // The URL parser already folds "." and ".." away; what's left is checked decoded anyway, as the Mac reads it.
  for (const seg of u.pathname.split('/')) {
    let d;
    try {
      d = decodeURIComponent(seg);
    } catch {
      return false;
    }
    if (d === '.' || d === '..' || d.includes('\\') || d.includes('/')) return false;
  }
  const scheme = u.protocol.toLowerCase();
  const host = u.hostname.toLowerCase();
  const port = u.port || defaultPort(scheme);
  const path_ = u.pathname;
  if (scheme === api.protocol.toLowerCase() && host === api.hostname.toLowerCase() && port === (api.port || defaultPort(api.protocol))) {
    return path_.startsWith('/v1/avatars/');
  }
  if (scheme !== 'https:' || port !== '443') return false;
  return (host === 'orbiterm-files.s3.eu-central-1.amazonaws.com' && path_.startsWith('/public/'))
    || host === 'avatars.githubusercontent.com'
    || (host.endsWith('.orbiterm.dev') && path_.startsWith('/v1/avatars/'));
}

function createShareCard({ net, clipboard, ClipboardItem, nativeImage, shell, downloads, apiBase }) {
  const downloadsDir = () => downloads();

  /** The PNG the page sent (base64), or null: under 12 MB of text, and a PNG by its first bytes. */
  function png(base64) {
    if (typeof base64 !== 'string' || base64.length >= 12_000_000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) return null;
    const buf = Buffer.from(base64, 'base64');
    return buf.length > 8 && buf.subarray(0, 4).equals(PNG_MAGIC) ? buf : null;
  }

  /** `copy`: the picture on the clipboard; `save`: a new file in Downloads, " (2)" and on if the name is taken. { ok, path? }. */
  async function shareImage(action, base64, name) {
    const buf = png(base64);
    if (!buf) return { ok: false };
    if (action === 'copy') {
      // Decoded first: only a picture that opens goes on the clipboard.
      if (nativeImage.createFromBuffer(buf).isEmpty()) return { ok: false };
      try {
        // Electron 45's clipboard is the web's (writeImage is gone): a PNG item, which Paint and Discord paste.
        if (ClipboardItem) await clipboard.write([new ClipboardItem({ 'image/png': new Blob([buf], { type: 'image/png' }) })]);
        else clipboard.writeImage(nativeImage.createFromBuffer(buf));
        return { ok: true };
      } catch {
        return { ok: false };
      }
    }
    if (action !== 'save') return { ok: false };
    const base = path.basename(String(name || ''));
    if (!/^[A-Za-z0-9._ -]{1,80}\.png$/.test(base)) return { ok: false };
    const dir = downloadsDir();
    const stem = base.slice(0, -4);
    for (let n = 1; n < 1000; n++) {
      const file = path.join(dir, n === 1 ? base : `${stem} (${n}).png`);
      try {
        fs.writeFileSync(file, buf, { flag: 'wx' });
        return { ok: true, path: file };
      } catch (e) {
        if (e.code !== 'EEXIST') return { ok: false };
      }
    }
    return { ok: false };
  }

  /** Shows a file the card was saved as, in Explorer: only an existing file inside Downloads. */
  function reveal(file) {
    if (typeof file !== 'string' || !file) return false;
    try {
      const dir = fs.realpathSync.native(downloadsDir());
      const real = fs.realpathSync.native(path.resolve(file));
      const rel = path.relative(dir, real);
      if (!rel || rel.startsWith('..') || path.isAbsolute(rel) || !fs.statSync(real).isFile()) return false;
      shell.showItemInFolder(real);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * A badge's picture (the files bucket), an avatar (the API's, or GitHub's) as a data: address, or null. Every redirect is
   * checked against the same list; one that leaves it is refused. At most 3 MB, counted as it arrives, and 10 s in all.
   */
  function fetchImage(raw) {
    if (!mayFetchImage(raw, apiBase)) return Promise.resolve(null);
    return new Promise((resolve) => {
      let done = false;
      let req;
      const finish = (v) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (v === null) try { req.abort(); } catch {}
        resolve(v);
      };
      const timer = setTimeout(() => finish(null), 10_000);
      let hops = 0;
      try {
        req = net.request({ url: raw, method: 'GET', redirect: 'manual', cache: 'no-store', credentials: 'omit', useSessionCookies: false });
      } catch {
        return finish(null);
      }
      req.on('redirect', (_code, _method, next) => {
        if (++hops > MAX_REDIRECTS || !mayFetchImage(next, apiBase)) return finish(null);
        req.followRedirect();
      });
      req.on('response', (res) => {
        const header = (k) => {
          const v = res.headers[k];
          return String(Array.isArray(v) ? v[0] : v || '');
        };
        const type = header('content-type').split(';')[0].trim().toLowerCase();
        const length = Number(header('content-length') || 0);
        if (res.statusCode !== 200 || !IMAGE_TYPES.has(type) || length > IMAGE_CAP) return finish(null);
        const chunks = [];
        let size = 0;
        res.on('data', (c) => {
          size += c.length;
          if (size > IMAGE_CAP) return finish(null);
          chunks.push(c);
        });
        res.on('end', () => finish(size ? `data:${type};base64,${Buffer.concat(chunks).toString('base64')}` : null));
        res.on('error', () => finish(null));
        res.on('aborted', () => finish(null));
      });
      req.on('error', () => finish(null));
      req.on('abort', () => finish(null));
      req.end();
    });
  }

  return {
    /** The `cloud` messages this answers, or undefined when the message is another's. */
    async handle(body) {
      if (body.type === 'shareImage') return await shareImage(body.action, body.png, body.name);
      if (body.type === 'revealFile') return reveal(body.path);
      if (body.type === 'fetchImage') return await fetchImage(body.url);
      return undefined;
    },
    handles: (type) => type === 'shareImage' || type === 'revealFile' || type === 'fetchImage',
  };
}

module.exports = { createShareCard, mayFetchImage };
