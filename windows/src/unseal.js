'use strict';

// The messages sealed end to end before Orbiterm retired that (2026-11-15). Messages are encrypted on the server now, so
// every computer shows the whole history, but the server can't open the ones sealed before. A PC that still has the keys
// the old versions kept (the vault file, sealed by Windows for this user) opens what it can and hands the server each
// message's own key; the server checks that the key opens the message exactly as it was sealed and keeps it like any
// other message (api/src/social.ts /v1/messages/unseal). Nothing here makes, sends or changes an account key, and the
// vault file is only read until nothing is left for it to open: then it's deleted, so the old keys stop existing (`done`).
// What nobody can open shows as "older encrypted message". Ports the Mac's Unseal.swift.

const crypto = require('node:crypto');

// A raw 32-byte key as Node takes it: wrapped as PKCS#8 (private) or SubjectPublicKeyInfo (public).
const DER = {
  xPriv: Buffer.from('302e020100300506032b656e04220420', 'hex'),
  xPub: Buffer.from('302a300506032b656e032100', 'hex'),
  edPriv: Buffer.from('302e020100300506032b657004220420', 'hex'),
};
const need32 = (raw) => {
  if (!Buffer.isBuffer(raw) || raw.length !== 32) throw new Error('bad key');
  return raw;
};
const xPrivate = (raw) => crypto.createPrivateKey({ key: Buffer.concat([DER.xPriv, need32(raw)]), format: 'der', type: 'pkcs8' });
const xPublic = (raw) => crypto.createPublicKey({ key: Buffer.concat([DER.xPub, need32(raw)]), format: 'der', type: 'spki' });
const edPrivate = (raw) => crypto.createPrivateKey({ key: Buffer.concat([DER.edPriv, need32(raw)]), format: 'der', type: 'pkcs8' });
// A private key's public half, raw.
const publicOf = (priv) => crypto.createPublicKey(priv).export({ format: 'der', type: 'spki' }).subarray(-32);
const agree = (priv, pubRaw) => crypto.diffieHellman({ privateKey: priv, publicKey: xPublic(pubRaw) });

const utf8 = (s) => Buffer.from(String(s), 'utf8');
// Bytes from base64 as the API and the other apps write it, or null.
const unb64 = (s) => (typeof s === 'string' && /^[A-Za-z0-9+/]*={0,2}$/.test(s) && s.length % 4 === 0 ? Buffer.from(s, 'base64') : null);
const hkdf = (ikm, salt, info) => Buffer.from(crypto.hkdfSync('sha256', ikm, salt, utf8(info), 32));
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const list = (v) => (Array.isArray(v) ? v.filter(isObj) : []);

// AES-256-GCM as CryptoKit's "combined": the nonce (12 bytes), the ciphertext, the tag (16). Throws when it doesn't open.
function gcmOpen(box, key, aad) {
  if (!Buffer.isBuffer(box) || box.length < 28) throw new Error('bad box');
  const d = crypto.createDecipheriv('aes-256-gcm', key, box.subarray(0, 12));
  d.setAAD(aad);
  d.setAuthTag(box.subarray(box.length - 16));
  return Buffer.concat([d.update(box.subarray(12, box.length - 16)), d.final()]);
}

const derive = (seed, info) => hkdf(seed, Buffer.alloc(0), info);

// A key's id: SHA-256 over its two public keys, the first 16 bytes in hex.
const kidOf = (x, ed) => crypto.createHash('sha256').update(x).update(ed).digest().subarray(0, 16).toString('hex');

// The id of the account key made from this seed (both its public keys come from it), or null.
function kidOfSeed(seed) {
  try {
    if (!Buffer.isBuffer(seed) || seed.length !== 32) return null;
    const x = publicOf(xPrivate(derive(seed, 'orbiterm e2ee account x25519')));
    const ed = publicOf(edPrivate(derive(seed, 'orbiterm e2ee account ed25519')));
    return kidOf(x, ed);
  } catch {
    return null;
  }
}

// Opens what was sealed to an X25519 key (the old E2EECrypto.seal): a one-time public key, then AES-GCM. Null on failure.
function open(sealed, priv, context) {
  try {
    if (!Buffer.isBuffer(sealed) || sealed.length <= 32 + 12 + 16) return null;
    const once = sealed.subarray(0, 32);
    const key = hkdf(agree(priv, once), Buffer.concat([once, publicOf(priv)]), `orbiterm e2ee seal\n${context}`);
    return gcmOpen(sealed.subarray(32), key, utf8(context));
  } catch {
    return null;
  }
}

// A message's own key, as the old version sealed it (E2EECrypto.sealMessage): the conversation's key from this account's
// key (the one named `rk`, or `sk` for a message it sent) and the friend's public key, then the message's salt. Only a
// key that opens the message here; null otherwise.
function messageKey(m, seeds, xs) {
  try {
    const { ct, sk, rk, uuid } = m;
    if (typeof ct !== 'string' || typeof sk !== 'string' || typeof rk !== 'string' || typeof uuid !== 'string') return null;
    const d = unb64(ct);
    if (!d || d.length <= 16 + 12 + 16) return null;
    const mine = m.mine === true;
    const seed = seeds[mine ? sk : rk];
    const theirX = xs[mine ? rk : sk];
    if (!seed || !theirX) return null;
    const priv = xPrivate(derive(seed, 'orbiterm e2ee account x25519'));
    const conversation = hkdf(agree(priv, theirX), Buffer.alloc(0), 'orbiterm e2ee dm');
    const key = hkdf(conversation, d.subarray(0, 16), 'orbiterm e2ee msg');
    gcmOpen(d.subarray(16), key, utf8(`orbiterm e2ee msg v1\n${uuid}\n${sk}\n${rk}`));
    return key;
  } catch {
    return null;
  }
}

// The account keys this computer can still get at that its file doesn't have, as the old version took them in
// (E2EE.unlockAll): one sealed for this computer, an older generation in a newer one's chain, a merged account's sealed to
// one of this account's. `seeds` (kid -> raw bytes) gets them; in memory only.
function unlock(me, devicePriv, seeds) {
  const keys = list(me.keys)
    .filter((k) => typeof k.kid === 'string' && typeof k.account === 'string' && Number.isInteger(k.gen))
    .map((k) => ({ kid: k.kid, account: k.account, gen: k.gen, chain: unb64(k.chain) }));
  const device = typeof me.device === 'string' ? me.device : '';
  const take = (kid, seed) => {
    if (!seed || seeds[kid] || kidOfSeed(seed) !== kid) return false;
    seeds[kid] = seed;
    return true;
  };
  let dpriv = null;
  try {
    dpriv = devicePriv ? xPrivate(devicePriv) : null;
  } catch {}
  if (dpriv) {
    for (const b of list(me.boxes)) {
      const k = typeof b.kid === 'string' && keys.find((x) => x.kid === b.kid);
      const box = k && unb64(b.box);
      if (!box) continue;
      take(k.kid, open(box, dpriv, `box\n${k.account}\n${k.kid}\n${device}`));
    }
  }
  const imports = list(me.imports);
  for (let more = true; more; ) {
    more = false;
    for (const k of keys) {
      const newer = k.chain && seeds[k.kid];
      const older = newer && keys.find((x) => x.account === k.account && x.gen === k.gen - 1);
      if (!older || seeds[older.kid]) continue;
      let seed = null;
      try {
        seed = gcmOpen(k.chain, derive(newer, 'orbiterm e2ee account chain'), utf8(`chain\n${k.account}\n${k.kid}`));
      } catch {}
      if (take(older.kid, seed)) more = true;
    }
    for (const i of imports) {
      const holder = typeof i.kid === 'string' && typeof i.to === 'string' && !seeds[i.kid] && seeds[i.to];
      const box = holder && unb64(i.box);
      if (!box) continue;
      let hx = null;
      try {
        hx = xPrivate(derive(holder, 'orbiterm e2ee account x25519'));
      } catch {
        continue;
      }
      if (take(i.kid, open(box, hx, `import\n${i.kid}\n${i.to}`))) more = true;
    }
  }
}

// Whether all the vault file holds is this account's (GET /v1/e2ee/me): it was the file of this account, or of one merged
// into it (whose keys came along), and each key in it is one of the account's. A file the old version left from another
// account (this PC signed out since, and nothing clears it now) may still open that account's messages, so it stays.
function ours(vault, me) {
  const keys = list(me.keys);
  const kids = new Set(keys.map((k) => k.kid).filter((kid) => typeof kid === 'string'));
  const accounts = new Set(keys.map((k) => k.account).filter((a) => typeof a === 'string'));
  if (typeof me.account === 'string') accounts.add(me.account);
  if (typeof vault.account !== 'string' || !accounts.has(vault.account)) return false;
  if (vault.seeds != null && !isObj(vault.seeds)) return false;
  return Object.entries(vault.seeds || {}).every(([kid, v]) => kids.has(kid) && kidOfSeed(unb64(v)) === kid);
}

// Options:
// - social(method, path, body): cloud.js's call to the API; an answer with `error` is a failure
// - loadVault(): async, the vault file's text (sealed by Windows, opened), or null when there's no file
// - dropVault(): deletes the vault file (may be async), once nothing is left for its keys to open
function createUnseal({ social, loadVault, dropVault }) {
  let running = false;
  let passedAt = 0;
  // Messages that didn't open (here, or on the server): not tried again until the app starts again.
  const skip = new Set();

  const call = async (method, p, body) => {
    try {
      const r = await social(method, p, body);
      return isObj(r) && r.error === undefined ? r : null;
    } catch {
      return null;
    }
  };

  // After a pass that opened every sealed message it met, each key taken by the server: once the server, asked again, has
  // none left in this account's conversations, the vault file is deleted, so the old keys stop existing. None can come
  // after: the API has turned down every sealed message since 2026-11-15 (`stale_key`) and makes no keys, and a merge
  // brings an account's sealed messages along with its keys.
  async function done(clean) {
    if (!clean) return;
    const left = await call('GET', 'v1/messages/sealed?after=0');
    if (!left || !Array.isArray(left.messages) || left.messages.length || left.more === true) return;
    try {
      await dropVault();
      console.log('unseal: no sealed message is left, so the old message keys were deleted');
    } catch (e) {
      console.error('unseal: deleting the old message keys', e);
    }
  }

  // Every sealed message of this account's conversations, 200 at a time; true once it went through them all. A page that
  // doesn't move `after` on would come back the same at once, and so would every one after it: that, or 500 pages
  // (100,000 messages, far more than were ever sealed), ends the pass as not gone through.
  async function pass(vault) {
    const seeds = {};
    if (isObj(vault.seeds)) {
      for (const [kid, v] of Object.entries(vault.seeds)) {
        const raw = unb64(v);
        if (raw) seeds[kid] = raw;
      }
    }
    const me = await call('GET', 'v1/e2ee/me');
    if (me) unlock(me, unb64(vault.devicePriv), seeds);
    // Whether every sealed message met opened here and the server took its key, in a file that's this account's.
    let clean = !!me && ours(vault, me);
    if (!Object.keys(seeds).length) {
      await done(clean);
      return true;
    }
    let after = 0;
    for (let n = 0; n < 500; n++) {
      const page = await call('GET', `v1/messages/sealed?after=${after}`);
      if (!page) return false;
      const was = after;
      const xs = {};
      for (const k of list(page.keys)) {
        const x = unb64(k.x);
        const ed = unb64(k.ed);
        if (typeof k.kid !== 'string' || !x || !ed || kidOf(x, ed) !== k.kid) continue;
        xs[k.kid] = x;
      }
      const keys = [];
      for (const m of list(page.messages)) {
        if (!Number.isInteger(m.id)) {
          clean = false;
          continue;
        }
        after = Math.max(after, m.id);
        if (skip.has(m.id)) {
          clean = false;
          continue;
        }
        const key = messageKey(m, seeds, xs);
        if (key) keys.push({ id: m.id, key: key.toString('base64') });
        else {
          skip.add(m.id);
          clean = false;
        }
      }
      for (let i = 0; i < keys.length; i += 100) {
        const r = await call('POST', 'v1/messages/unseal', { keys: keys.slice(i, i + 100) });
        if (!r) return false;
        if (Array.isArray(r.failed)) {
          for (const id of r.failed) {
            if (!Number.isInteger(id)) continue;
            skip.add(id);
            clean = false;
          }
        }
      }
      if (page.more !== true) {
        await done(clean);
        return true;
      }
      if (after === was) return false;
    }
    return false;
  }

  // The live line (re)connected: a pass, only with a vault file, and at most every half hour once one went through.
  function run() {
    if (running || (passedAt && Date.now() - passedAt <= 1_800_000)) return;
    running = true;
    (async () => {
      let text = null;
      try {
        text = await loadVault();
      } catch {}
      let vault = null;
      try {
        vault = text ? JSON.parse(text) : null;
      } catch {}
      if (!isObj(vault)) return;
      if (await pass(vault)) passedAt = Date.now();
    })()
      .catch((e) => console.error('unseal:', e))
      .finally(() => {
        running = false;
      });
  }

  return { run };
}

module.exports = { createUnseal };
