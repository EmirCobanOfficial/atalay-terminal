// The live line of one shared note: the y-websocket wire format over GET /v1/notes/:id/sync (the API's noteroom.ts).
// A ticket (one use, 30 s) is asked for on every try, by the app (`ticket()`); nothing here knows of a token or an address.
// The document is the page's own and is kept in the app's folder (.ydoc), so edits made offline are there to be merged:
// when the line is back, the sync request and its answer bring both sides level, and no queue is needed.
//
// Close codes: 4001 the ticket was refused (ask for a new one), 4003 no longer a member (the app wipes its copy), 4004 the
// owner stopped sharing (same), 4008 too big or too busy (try again slowly), 4009 the server restarts or the account
// merged (come back at once). Anything else: back off, 1 s up to 30 s, with some chance in it.
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

const MSG_SYNC = 0;
const MSG_AWARENESS = 1;
const MIN_WAIT = 1000;
const MAX_WAIT = 30000;
// The server takes this much waiting for a join's own answer, no more: a client that has more to say waits for its step2.
const CURSOR_EVERY = 100; // ms: at most ten cursor updates a second

export class SharedProvider {
  /** o: { ticket: async () => ({ url } | { gone: true } | { error }), socket (a WebSocket class), on: { status, hello, members, meta, gone, error } } */
  constructor(doc, o) {
    this.doc = doc;
    this.o = o;
    this.on = o.on || {};
    this.Socket = o.socket || globalThis.WebSocket;
    this.awareness = new awarenessProtocol.Awareness(doc);
    // Present from the start (no cursor yet): the others see who is in the note, not only who has a cursor in it.
    this.awareness.setLocalState(o.quiet ? null : { c: null });
    this.ws = null;
    this.status = 'offline'; // 'connecting' | 'live' | 'offline' | 'busy'
    this.synced = false;
    this.held = [];
    this.wait = MIN_WAIT;
    this.timer = 0;
    this.dead = false;
    this.opening = false;
    this.cursorAt = 0;
    this.cursorTimer = 0;
    this.ticketFails = 0;
    this._update = (u, origin) => {
      if (origin === this || this.dead) return;
      if (this.ws && this.ws.readyState === 1 && this.synced) this._send(this._frame(MSG_SYNC, (e) => syncProtocol.writeUpdate(e, u)));
      else this.held.push(u); // until the first step2 of this line: the server takes only a little before it
    };
    doc.on('update', this._update);
    this._aw = ({ added, updated, removed }, origin) => {
      if (origin === this || this.dead || !this.ws || this.ws.readyState !== 1) return;
      const mine = [added, updated, removed].flat().filter((id) => id === doc.clientID);
      if (!mine.length) return;
      this._send(this._frame(MSG_AWARENESS, (e) => encoding.writeVarUint8Array(e, awarenessProtocol.encodeAwarenessUpdate(this.awareness, mine))));
    };
    this.awareness.on('update', this._aw);
  }

  _frame(type, fn) {
    const e = encoding.createEncoder();
    encoding.writeVarUint(e, type);
    fn(e);
    return encoding.toUint8Array(e);
  }
  _send(b) {
    try {
      if (this.ws && this.ws.readyState === 1) this.ws.send(b);
    } catch {}
  }
  _set(s) {
    if (this.status === s) return;
    this.status = s;
    this.on.status && this.on.status(s);
  }

  connect() {
    if (this.dead || this.opening || this.ws) return;
    clearTimeout(this.timer);
    this.opening = true;
    this._set('connecting');
    Promise.resolve(this.o.ticket())
      .catch(() => ({ error: 'offline' }))
      .then((t) => {
        this.opening = false;
        if (this.dead) return;
        if (t && t.gone) return this._gone('removed');
        if (!t || !t.url) {
          this._set('offline');
          return this._later();
        }
        this._open(t.url);
      });
  }

  _open(url) {
    let ws;
    try {
      ws = new this.Socket(url);
    } catch {
      this._set('offline');
      return this._later();
    }
    ws.binaryType = 'arraybuffer';
    this.ws = ws;
    this.synced = false;
    ws.onopen = () => {
      if (this.ws !== ws) return;
      this._send(this._frame(MSG_SYNC, (e) => syncProtocol.writeSyncStep1(e, this.doc)));
    };
    ws.onmessage = (ev) => {
      if (this.ws !== ws) return;
      if (typeof ev.data === 'string') return this._json(ev.data);
      this._binary(new Uint8Array(ev.data));
    };
    ws.onerror = () => {};
    ws.onclose = (ev) => {
      if (this.ws !== ws) return;
      this._closed(ev.code || 0);
    };
  }

  _json(text) {
    let m;
    try {
      m = JSON.parse(text);
    } catch {
      return;
    }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hello') this.on.hello && this.on.hello(m);
    else if (m.t === 'members') this.on.members && this.on.members(m.members || []);
    else if (m.t === 'meta') this.on.meta && this.on.meta(m);
    else if (m.t === 'error') {
      if (m.code === 'too_big') this.big = true;
      this.on.error && this.on.error(m.code);
    }
  }

  _binary(buf) {
    const dec = decoding.createDecoder(buf);
    const type = decoding.readVarUint(dec);
    if (type === MSG_SYNC) {
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MSG_SYNC);
      const sub = syncProtocol.readSyncMessage(dec, enc, this.doc, this);
      if (encoding.length(enc) > 1) this._send(encoding.toUint8Array(enc));
      // Its step2 (the answer to our request): the two sides are level. What was typed meanwhile goes now.
      if (sub === syncProtocol.messageYjsSyncStep2 && !this.synced) {
        this.synced = true;
        this.wait = MIN_WAIT;
        this.ticketFails = 0;
        if (this.held.length) {
          const u = Y.mergeUpdates(this.held);
          this.held = [];
          this._send(this._frame(MSG_SYNC, (e) => syncProtocol.writeUpdate(e, u)));
        }
        this._set('live');
        // Our own cursor state is told now that the line is level.
        if (this.awareness.getLocalState() !== null) this._send(this._frame(MSG_AWARENESS, (e) => encoding.writeVarUint8Array(e, awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID]))));
      }
    } else if (type === MSG_AWARENESS) {
      awarenessProtocol.applyAwarenessUpdate(this.awareness, decoding.readVarUint8Array(dec), this);
    }
  }

  _closed(code) {
    this.ws = null;
    this.synced = false;
    // The others' cursors went with the line.
    const others = [...this.awareness.getStates().keys()].filter((id) => id !== this.doc.clientID);
    if (others.length) awarenessProtocol.removeAwarenessStates(this.awareness, others, this);
    if (this.dead) return;
    if (code === 4003) return this._gone('removed');
    if (code === 4004) return this._gone('unshared');
    // The server said the note is too big: trying again would only be refused again (until it is shortened and the user asks).
    if (code === 4008 && this.big) return this._set('big');
    this._set(code === 4008 ? 'busy' : 'offline');
    if (code === 4009) {
      this.wait = MIN_WAIT;
      return this._later(300);
    }
    if (code === 4001 && this.ticketFails++ < 3) return this._later(300);
    if (code === 4008) this.wait = Math.max(this.wait, 15000);
    this._later();
  }

  _gone(why) {
    this.close();
    this.on.gone && this.on.gone(why);
  }

  _later(ms) {
    if (this.dead) return;
    clearTimeout(this.timer);
    const w = ms ?? this.wait * (0.75 + Math.random() * 0.5);
    if (ms === undefined) this.wait = Math.min(MAX_WAIT, this.wait * 2);
    this.timer = setTimeout(() => {
      this.timer = 0;
      this.connect();
    }, w);
  }

  /** The network is back (or the Mac woke up): try now, whatever the wait was. */
  netBack() {
    if (this.dead) return;
    this.wait = MIN_WAIT;
    this.big = false;
    if (this.ws) {
      // A line opened before may be dead without a word.
      try {
        this.ws.onclose = null;
        this.ws.close();
      } catch {}
      this._closed(0);
    }
    clearTimeout(this.timer);
    this.connect();
  }

  /** My cursor: `c` is { b: blockId, a: relPos, h: relPos } or null; and who I am (the server puts its own over it). */
  setCursor(c) {
    const now = Date.now();
    const go = () => {
      this.cursorTimer = 0;
      this.cursorAt = Date.now();
      const s = this.awareness.getLocalState() || {};
      this.awareness.setLocalState({ ...s, c });
    };
    clearTimeout(this.cursorTimer);
    if (now - this.cursorAt >= CURSOR_EVERY) go();
    else this.cursorTimer = setTimeout(go, CURSOR_EVERY - (now - this.cursorAt));
  }

  close() {
    this.dead = true;
    clearTimeout(this.timer);
    clearTimeout(this.cursorTimer);
    this.doc.off('update', this._update);
    this.awareness.off('update', this._aw);
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onclose = ws.onmessage = ws.onopen = null;
      try {
        ws.close();
      } catch {}
    }
    this.awareness.destroy();
    this._set('offline');
  }
}
