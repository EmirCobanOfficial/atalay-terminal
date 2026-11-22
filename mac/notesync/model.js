// A note as a Yjs document, and the operations the editor (web/notes.js) changes it with.
//
//   doc.getMap('blocks')  Y.Map<blockId, Y.Map { o, t, c, i, x, e? }>
//     o  the place: a fractional index (strings sort the blocks; a tie is broken by the id)
//     t  the type: p h1 h2 h3 todo bullet num quote code divider (any other string is a type from a newer Orbiterm: kept, never touched)
//     c  the to-do's tick
//     i  the indent, 0 to 4
//     x  the text, a Y.Text (a link is Markdown inside it, as it always was)
//     e  fields this version doesn't know of, as they came: written back as they were
//   doc.getMap('edits')   the last changes an AI made (later: shown to the note's other writers)
//
// Moving a block writes one field (o): what a friend types in it meanwhile isn't lost, and two moves at once don't make
// two blocks. Every change is a transaction with an origin: 'local' (an operation of the editor), 'input' (typing:
// the page already shows it), an AiOrigin (an AI's change, with its own undo), 'init' (the note being read in).
import * as Y from 'yjs';
import { generateNKeysBetween } from 'fractional-indexing';

export { Y };

export const KNOWN_TYPES = ['p', 'h1', 'h2', 'h3', 'todo', 'bullet', 'num', 'quote', 'code', 'divider'];
const LISTED = new Set(['id', 'type', 'text', 'checked', 'indent']);
const MAX_INDENT = 4;

/** An AI's change: `by` is who made it. */
export class AiOrigin {
  constructor(by) {
    this.by = String(by || 'AI').slice(0, 24);
  }
}

export function newId() {
  const c = globalThis.crypto;
  if (c && c.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  if (c && c.getRandomValues) c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** An id a block may have: it goes into CSS selectors and file names, so only letters, digits, dashes and underscores. */
export const validId = (id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id);
const level = (n) => Math.max(0, Math.min(MAX_INDENT, Math.round(Number(n) || 0)));
const known = (t) => KNOWN_TYPES.includes(t);

/** The place in `a` where `b` differs from it, as { at, del, ins }: what to delete at `at` and what to put there. With
 *  `caret` (where the cursor is in `b`) a typed letter next to the same letter lands where the cursor is. */
export function diffText(a, b, caret) {
  let max = Math.min(a.length, b.length);
  if (typeof caret === 'number' && caret >= 0 && caret <= b.length) max = Math.min(max, caret);
  let p = 0;
  while (p < max && a.charCodeAt(p) === b.charCodeAt(p)) p++;
  // Not in the middle of a surrogate pair.
  if (p > 0 && p < a.length && isHigh(a.charCodeAt(p - 1))) p--;
  let s = 0;
  const room = Math.min(a.length, b.length) - p;
  while (s < room && a.charCodeAt(a.length - 1 - s) === b.charCodeAt(b.length - 1 - s)) s++;
  if (s > 0 && isLow(a.charCodeAt(a.length - s))) s--;
  return { at: p, del: a.length - p - s, ins: b.slice(p, b.length - s) };
}
const isHigh = (c) => c >= 0xd800 && c <= 0xdbff;
const isLow = (c) => c >= 0xdc00 && c <= 0xdfff;

/** The fields of a block this version doesn't know of, as a plain object without the ones it does (a friend's document may carry anything). */
function extras(e, type) {
  if (!e || typeof e !== 'object' || Array.isArray(e)) return undefined;
  const out = {};
  // A block of a type from a newer Orbiterm is kept whole (its own fields may be named like ours); only id and type are ours there.
  for (const k of Object.keys(e)) if (k !== 'id' && k !== 'type' && k !== 'o' && k !== 'e' && (!known(type) || !LISTED.has(k))) out[k] = e[k];
  return Object.keys(out).length ? out : undefined;
}

/** A block as the editor holds it: { id, type, text, checked, indent, e }. */
function derive(id, m) {
  const type = String(m.get('t') ?? 'p');
  const x = m.get('x');
  return {
    id,
    type,
    text: x instanceof Y.Text ? x.toString() : '',
    checked: !!m.get('c'),
    indent: level(m.get('i')),
    e: extras(m.get('e'), type),
    o: String(m.get('o') ?? ''),
  };
}

/** A block as a note's file keeps it (JSON: { id?, type, text, checked?, indent?, …more }) read into what the model takes
 *  (a "spec": { id, type, text, checked, indent, e }), `e` being the fields this version doesn't know of, kept as they were.
 *  For a type it doesn't know (a block from a newer Orbiterm) that is everything but its id and type. Null when it isn't a block. */
export function specOf(b, id) {
  if (!b || typeof b !== 'object' || typeof b.type !== 'string' || !b.type) return null;
  const spec = { id: validId(id) ? id : validId(b.id) ? b.id : newId(), type: b.type };
  const e = {};
  if (known(b.type)) {
    Object.assign(spec, { text: String(b.text ?? ''), checked: !!b.checked, indent: level(b.indent) });
    for (const k of Object.keys(b)) if (!LISTED.has(k)) e[k] = b[k];
  } else {
    Object.assign(spec, { text: '', checked: false, indent: 0 });
    for (const k of Object.keys(b)) if (k !== 'id' && k !== 'type') e[k] = b[k];
  }
  if (Object.keys(e).length) spec.e = e;
  return spec;
}

export class NoteModel {
  /** `blocks`: plain blocks, { id?, type, text, checked?, indent?, …more }. */
  constructor(blocks = []) {
    this.doc = new Y.Doc();
    this.map = this.doc.getMap('blocks');
    this.edits = this.doc.getMap('edits');
    this.origin = 'local';
    this.account = ''; // who is writing here (an AI's change says whose it was)
    this.shared = false;
    this.filled = false; // a block has been in the document
    this._list = null;
    this._depth = 0;
    this.doc.on('afterTransaction', () => {
      this._list = null;
    });
    if (blocks.length) this.load(blocks);
  }

  load(blocks) {
    const keys = generateNKeysBetween(null, null, blocks.length);
    this.tx(() => {
      const seen = new Set();
      blocks.forEach((b, i) => {
        const id = validId(b.id) && !seen.has(b.id) ? b.id : newId();
        seen.add(id);
        this.map.set(id, this._make(keys[i], b));
      });
    }, 'init');
  }

  _make(o, b) {
    const m = new Y.Map();
    const type = typeof b.type === 'string' && b.type ? b.type : 'p';
    m.set('o', o);
    m.set('t', type);
    m.set('c', !!b.checked && known(type));
    m.set('i', known(type) ? level(b.indent) : 0);
    m.set('x', new Y.Text(known(type) ? String(b.text ?? '') : ''));
    if (b.e && typeof b.e === 'object' && Object.keys(b.e).length) m.set('e', b.e);
    return m;
  }

  /** The blocks in order, as the editor reads them (a fresh array each time something changed). */
  list() {
    if (this._list && !this._depth) return this._list;
    const out = [];
    this.map.forEach((m, id) => out.push(derive(id, m)));
    if (out.length) this.filled = true;
    out.sort((a, b) => (a.o < b.o ? -1 : a.o > b.o ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    // Not kept while a change is going on: the places read in the middle of it are the ones it has made so far.
    return this._depth ? out : (this._list = out);
  }

  /** The blocks kept as JSON, the way notes are written to disk. */
  toBlocks() {
    return this.list().map(plainOf);
  }

  has(id) {
    return this.map.has(id);
  }

  /** Runs `fn` as one change with this origin (an AiOrigin, 'local', …). */
  as(origin, fn) {
    const was = this.origin;
    this.origin = origin;
    try {
      return fn();
    } finally {
      this.origin = was;
    }
  }

  tx(fn, origin) {
    this._depth++;
    try {
      return this.doc.transact(fn, origin ?? this.origin);
    } finally {
      this._depth--;
    }
  }

  _ytext(id) {
    const m = this.map.get(id);
    const x = m && m.get('x');
    return x instanceof Y.Text ? x : null;
  }

  // ---------- a block's own fields ----------
  setType(id, type) {
    this.tx(() => {
      const m = this.map.get(id);
      if (!m || !known(type)) return;
      m.set('t', type);
      if (type !== 'todo' && m.get('c')) m.set('c', false);
    });
  }
  setChecked(id, on) {
    this.tx(() => {
      const m = this.map.get(id);
      if (m && known(m.get('t')) && !!m.get('c') !== !!on) m.set('c', !!on);
    });
  }
  setIndent(id, n) {
    this.tx(() => {
      const m = this.map.get(id);
      if (m && known(m.get('t')) && level(m.get('i')) !== level(n)) m.set('i', level(n));
    });
  }
  /** type, checked and indent together ({ type?, checked?, indent? }). */
  setBlock(id, f) {
    this.tx(() => {
      const m = this.map.get(id);
      if (!m || !known(m.get('t'))) return;
      if (f.type !== undefined && known(f.type) && m.get('t') !== f.type) m.set('t', f.type);
      if (f.checked !== undefined && !!m.get('c') !== !!f.checked) m.set('c', !!f.checked);
      if (f.indent !== undefined && level(m.get('i')) !== level(f.indent)) m.set('i', level(f.indent));
    });
  }

  /** Fields of a block this version doesn't know of (a file block's `f`), changed: `patch` is merged over what `e` has, a key
   *  set to undefined goes. The whole `e` is one value, so two writers at once: the last wins. */
  setExtra(id, patch) {
    this.tx(() => {
      const m = this.map.get(id);
      if (!m) return;
      const next = { ...(m.get('e') || {}), ...patch };
      for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];
      m.set('e', next);
    });
  }

  // ---------- a block's text ----------
  textInsert(id, at, s) {
    this.tx(() => {
      const x = this._ytext(id);
      if (x && s) x.insert(Math.max(0, Math.min(at, x.length)), s);
    });
  }
  textDelete(id, at, n) {
    this.tx(() => {
      const x = this._ytext(id);
      if (!x || n <= 0) return;
      at = Math.max(0, Math.min(at, x.length));
      x.delete(at, Math.min(n, x.length - at));
    });
  }
  /** What's from `from` to `to` becomes `s`. */
  textReplace(id, from, to, s) {
    this.tx(() => {
      const x = this._ytext(id);
      if (!x) return;
      from = Math.max(0, Math.min(from, x.length));
      to = Math.max(from, Math.min(to, x.length));
      if (to > from) x.delete(from, to - from);
      if (s) x.insert(from, s);
    });
  }
  /** The text made `text`, by the smallest change (typing: `caret` is where the cursor is now). */
  textSet(id, text, caret) {
    this.tx(() => {
      const x = this._ytext(id);
      if (!x) return;
      const d = diffText(x.toString(), String(text), caret);
      if (d.del) x.delete(d.at, d.del);
      if (d.ins) x.insert(d.at, d.ins);
    });
  }

  // ---------- the blocks ----------
  /** `n` places after block `afterId` (null: first), or null when there is no such block (it went meanwhile). */
  _keys(afterId, n, skip) {
    const list = this.list().filter((b) => !skip || !skip.has(b.id));
    const i = afterId == null ? -1 : list.findIndex((b) => b.id === afterId);
    if (afterId != null && i < 0) return null;
    const a = i < 0 ? null : list[i].o;
    // The next place that is really after: two blocks with one place (made at once) don't leave no room.
    let z = null;
    for (let k = i + 1; k < list.length; k++) {
      if (a === null || list[k].o > a) {
        z = list[k].o;
        break;
      }
    }
    return generateNKeysBetween(a, z, n);
  }

  /** A block (or several) after `afterId` (null: first). Returns the new ids. */
  insert(afterId, specs) {
    const list = Array.isArray(specs) ? specs : [specs];
    const ids = [];
    this.tx(() => {
      const keys = this._keys(afterId, list.length);
      if (!keys) return;
      list.forEach((b, k) => {
        const id = validId(b.id) && !this.map.has(b.id) ? b.id : newId();
        ids.push(id);
        this.map.set(id, this._make(keys[k], b));
      });
    });
    return ids;
  }

  remove(ids) {
    this.tx(() => {
      for (const id of Array.isArray(ids) ? ids : [ids]) this.map.delete(id);
    });
  }

  /** Enter: the text from `at` on goes to a new block after this one (`spec` gives its type, indent…). */
  split(id, at, spec) {
    let made = null;
    this.tx(() => {
      const x = this._ytext(id);
      if (!x) return;
      at = Math.max(0, Math.min(at, x.length));
      const tail = x.toString().slice(at);
      if (tail) x.delete(at, tail.length);
      made = this.insert(id, { ...spec, text: tail })[0];
    });
    return made;
  }

  /** Backspace at a block's start: `fromId`'s text joins the end of `intoId`'s, and it goes. */
  merge(intoId, fromId) {
    this.tx(() => {
      const into = this._ytext(intoId);
      const from = this._ytext(fromId);
      if (!into || !from) return;
      const s = from.toString();
      if (s) into.insert(into.length, s);
      this.map.delete(fromId);
    });
  }

  /** Blocks `ids` (any order: they keep the order they have) go after `afterId` (null: first). Moves a place, writes no text. */
  move(ids, afterId) {
    const set = new Set(ids);
    const moving = this.list().filter((b) => set.has(b.id));
    if (!moving.length || (afterId != null && set.has(afterId))) return false;
    let done = true;
    this.tx(() => {
      const keys = this._keys(afterId, moving.length, set);
      if (!keys) return (done = false);
      moving.forEach((b, k) => this.map.get(b.id).set('o', keys[k]));
    });
    return done;
  }

  // ---------- all the blocks at once (an AI's write) ----------
  /** The note made `next` (plain blocks) by the fewest changes: blocks that are the same stay as they are, one that
   *  differs is changed where it is, only what's left over comes and goes. Blocks of a type this version doesn't know
   *  stay where they are. */
  replaceAll(next) {
    const sig = (b) => `${b.type}|${b.indent}|${b.checked}|${b.text}`;
    const was = new Map(this.list().map((b) => [b.id, sig(b)]));
    this.tx(() => {
      const old = this.list().filter((b) => known(b.type));
      const key = (b) => `${b.type}\u0001${b.indent || 0}\u0001${b.checked ? 1 : 0}\u0001${b.text}`;
      const now = next.filter((b) => known(b.type)).map((b) => ({ ...b, indent: level(b.indent), text: String(b.text ?? '') }));
      const ok = old.map(key);
      const nk = now.map(key);
      // The matching ends cut off, then the longest common run of what's between.
      let lo = 0;
      while (lo < ok.length && lo < nk.length && ok[lo] === nk[lo]) lo++;
      let hi = 0;
      while (hi < ok.length - lo && hi < nk.length - lo && ok[ok.length - 1 - hi] === nk[nk.length - 1 - hi]) hi++;
      const A = ok.slice(lo, ok.length - hi);
      const B = nk.slice(lo, nk.length - hi);
      const pairs = []; // [i, j] in A and B that are the same
      if (A.length && B.length) {
        const w = B.length + 1;
        const t = new Uint32Array((A.length + 1) * w);
        for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) t[i * w + j] = A[i] === B[j] ? t[(i + 1) * w + j + 1] + 1 : Math.max(t[(i + 1) * w + j], t[i * w + j + 1]);
        let i = 0;
        let j = 0;
        while (i < A.length && j < B.length) {
          if (A[i] === B[j]) (pairs.push([i, j]), i++, j++);
          else if (t[(i + 1) * w + j] >= t[i * w + j + 1]) i++;
          else j++;
        }
      }
      pairs.push([A.length, B.length]);
      let prevId = lo > 0 ? old[lo - 1].id : null;
      let i0 = 0;
      let j0 = 0;
      for (const [pi, pj] of pairs) {
        const runA = old.slice(lo + i0, lo + pi);
        const runB = now.slice(lo + j0, lo + pj);
        const both = Math.min(runA.length, runB.length);
        for (let k = 0; k < both; k++) {
          this._rewrite(runA[k].id, runB[k]);
          prevId = runA[k].id;
        }
        for (const b of runA.slice(both)) this.map.delete(b.id);
        if (runB.length > both) {
          const ids = this.insert(prevId, runB.slice(both));
          prevId = ids[ids.length - 1];
        }
        if (pi < A.length) prevId = old[lo + pi].id;
        i0 = pi + 1;
        j0 = pj + 1;
      }
      this.noteEdit(was, sig);
    });
  }

  /** An AI's change is told to the note's other writers: who, for whom, when and which blocks, in the document itself (so
   *  a friend who is offline now sees it later). At most five are kept. */
  noteEdit(was, sig) {
    const o = this.origin;
    if (!(o instanceof AiOrigin) || !this.shared) return;
    const hit = this.list().filter((b) => was.get(b.id) !== sig(b)).map((b) => b.id).slice(0, 50);
    if (!hit.length) return;
    this.edits.set(newId(), { by: o.by, for: this.account, at: Date.now(), blocks: hit });
    const all = [...this.edits.entries()].sort((a, b) => (b[1].at || 0) - (a[1].at || 0));
    for (const [k] of all.slice(5)) this.edits.delete(k);
  }

  _rewrite(id, b) {
    const m = this.map.get(id);
    if (!m) return;
    if (m.get('t') !== b.type) m.set('t', b.type);
    if (!!m.get('c') !== !!b.checked) m.set('c', !!b.checked);
    if (level(m.get('i')) !== level(b.indent)) m.set('i', level(b.indent));
    const x = this._ytext(id);
    const d = diffText(x.toString(), b.text);
    if (d.del) x.delete(d.at, d.del);
    if (d.ins) x.insert(d.at, d.ins);
  }

  // ---------- history ----------
  /** ⌘Z's history: our own changes and an AI's, a step each time the typing pauses (or `stopCapturing`). */
  undoManager() {
    return new Y.UndoManager(this.map, { trackedOrigins: new Set(['local', 'input', AiOrigin]), captureTimeout: 1200 });
  }
  /** The strip's "Undo": an AI's changes only, a step each. */
  aiUndoManager() {
    return new Y.UndoManager(this.map, { trackedOrigins: new Set([AiOrigin]), captureTimeout: 0 });
  }

  // ---------- the document as a whole, and places in it ----------
  encodeState() {
    return Y.encodeStateAsUpdate(this.doc);
  }
  /** What the file or the server has: put into the document (nothing of it counts as a change of the user's). */
  applyState(u, origin = 'init') {
    Y.applyUpdate(this.doc, u, origin);
  }
  /** A place in a block's text that stays with the letters (a friend typing before it moves it): JSON, or null. */
  relPos(id, offset, assoc = 0) {
    const x = this._ytext(id);
    return x ? Y.relativePositionToJSON(Y.createRelativePositionFromTypeIndex(x, Math.max(0, Math.min(offset, x.length)), assoc)) : null;
  }
  /** { id, offset } for such a place, or null when its block is gone. */
  absPos(rel) {
    try {
      const a = Y.createAbsolutePositionFromRelativePosition(Y.createRelativePositionFromJSON(rel), this.doc);
      if (!a || !(a.type instanceof Y.Text)) return null;
      for (const [id, m] of this.map) if (m.get('x') === a.type) return { id, offset: a.index };
    } catch {}
    return null;
  }

  destroy() {
    this.doc.destroy();
  }
}

/** A block as JSON, the way a note's file keeps it. */
export function plainOf(b) {
  // What the block holds of its own comes after the unknown fields, so those can't overwrite it.
  const e = extras(b.e, b.type) || {};
  if (!known(b.type)) return { ...e, id: b.id, type: b.type };
  return { ...e, id: b.id, type: b.type, text: typeof b.text === 'string' ? b.text : '', ...(b.checked ? { checked: true } : {}), ...(b.indent ? { indent: level(b.indent) } : {}) };
}
