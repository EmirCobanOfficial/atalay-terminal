'use strict';
// The token ledger, as the Mac app's TokenLedger.swift keeps it: tokens burned on this PC for the leaderboard's Tokens view
// (the API's src/usage.ts): every reply of Claude Code, Codex and Antigravity, read from their own records, by local day
// (the day the API counts active time on), tool, model and effort: new input, output, cache reads, cache writes, the part
// of the output spent reasoning, and the replies. Each file is read on from where it was left, a few minutes apart; the
// first time, everything the tools still keep, so the API gets the history once. A reply counts once however many lines or
// files repeat it (Claude writes one over several lines and copies history into forks and resumed chats); what was counted
// is kept as 64-bit hashes in a file of its own beside the book.
//
// Kept on this PC, like the spend ledger. Each day that changed goes to the API whole (cloud.js), and the API keeps the
// larger of each number, so a day sent again never counts twice. Everything runs one step at a time on a queue (a pass
// reads a piece at a time with the app's turn between, so the main process goes on meanwhile).
//
// The book is the Mac's: { version: 1, source, days: { day: { "tool|model|effort": { i, o, r, w, t, n } } }, files, dirty }.
// A 64-bit number that JSON can't hold exactly (an inode, a reply's hash) is written as a decimal string.
const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { pathToFileURL } = require('url');

let sqlite = null;
try {
  sqlite = require('node:sqlite');
} catch {}

const HOME = os.homedir();
const EVERY = 3 * 60_000;
// A line this long without its end is given up on (no record comes near it): the reader goes on after it rather than hold
// more and more of it.
const LINE_MAX = 64 << 20;
const CHUNK = 4 << 20;
const TOOLS = new Set(['claude', 'codex', 'antigravity']);
const EFFORTS = new Set(['minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra']);
const nextTurn = () => new Promise((r) => setImmediate(r));

const int = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : 0);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const str = (v) => (typeof v === 'string' ? v : undefined);

// New input (not read from a cache), output (reasoning included), cache reads, cache writes, reasoning, replies.
const counts = (i = 0, o = 0, r = 0, w = 0, t = 0, n = 0) => ({ i, o, r, w, t, n });
const isEmpty = (c) => c.i === 0 && c.o === 0 && c.r === 0 && c.w === 0;
function addCounts(a, b) {
  a.i += b.i;
  a.o += b.o;
  a.r += b.r;
  a.w += b.w;
  a.t += b.t;
  a.n += b.n;
}

// ---------- days ----------
// A timestamp's local day key ("2026-11-14"), the last day remembered (records come in order, so it rarely changes), as
// ledger.js's dayKeys.
const pad = (n, w = 2) => String(n).padStart(w, '0');
const keyOf = (d) => `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function dayKeys() {
  let lo = 0, hi = -1, last = '';
  return (ms) => {
    if (ms >= lo && ms < hi) return last;
    const start = new Date(ms);
    start.setHours(0, 0, 0, 0);
    lo = start.getTime();
    hi = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1).getTime();
    last = keyOf(start);
    return last;
  };
}

// A record's time in ms, 0 when it has none (the line is then no reply of anything).
function parseISO(s) {
  if (typeof s !== 'string' || !s) return 0;
  const t = Date.parse(s);
  return Number.isFinite(t) && t > 0 ? t : 0;
}

// ---------- names ----------
// A model as the API keeps it: lower case, Claude's without "claude-" and a date ("opus-5-5"), only the characters it takes.
function model(s) {
  let m = String(s || '').toLowerCase().replace(/^[ \t   -   　]+|[ \t   -   　]+$/g, '');
  if (m.startsWith('claude-')) m = m.slice(7);
  m = m.replace(/-\d{8}$/, '');
  m = m.replace(/[^a-z0-9._-]+/g, '-');
  m = m.replace(/^[^a-z0-9]+/, '');
  m = m.slice(0, 48);
  return m || 'unknown';
}

function effort(s) {
  const e = String(s || '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[^a-z0-9]+/, '');
  return e.slice(0, 16);
}

const keyName = (tool, m, e) => `${tool}|${m}|${effort(e)}`;

// "gemini-4-argon-medium" -> ["gemini-4-argon", "medium"]; a name without an effort at its end stays whole.
function splitEffort(s) {
  const m = model(s);
  const dash = m.lastIndexOf('-');
  if (dash < 0 || !EFFORTS.has(m.slice(dash + 1))) return [m, ''];
  return [m.slice(0, dash), m.slice(dash + 1)];
}

// "Gemini 4 Argon (Medium)" -> ["gemini-4-argon", "medium"]; "Claude Opus 5.5 (High)" -> ["opus-5-5", "high"], as Claude names
// its models.
function fromLabel(label) {
  let name = label, e = '';
  const open = label.lastIndexOf('('), close = label.lastIndexOf(')');
  if (open >= 0 && close >= 0 && open < close) {
    name = label.slice(0, open);
    e = label.slice(open + 1, close).trim().toLowerCase();
  }
  let m = name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '');
  if (m.startsWith('claude-')) m = m.slice(7).replace(/\./g, '-');
  return [m, EFFORTS.has(e) ? e : ''];
}

// FNV-1a, 64 bits, the same on every run, as the Mac's: done on two 32-bit halves (the prime is 0x100 * 2^32 + 0x1b3), the
// result a BigInt.
function hash(s) {
  let hi = 0xcbf29ce4, lo = 0x84222325;
  for (const b of Buffer.from(s, 'utf8')) {
    lo = (lo ^ b) >>> 0;
    const low = lo * 0x1b3;
    const carry = Math.floor(low / 4294967296);
    const nlo = low % 4294967296;
    hi = (hi * 0x1b3 + lo * 0x100 + carry) % 4294967296;
    lo = nlo;
  }
  return (BigInt(hi) << 32n) | BigInt(lo);
}

// A name as the API keeps one: lower-case letters, digits, ".", "_" and "-", a letter or digit first, `max` long at most.
function fits(s, max, allowEmpty) {
  if (!s) return allowEmpty;
  return s.length <= max && /^[a-z0-9][a-z0-9._-]*$/.test(s);
}

// A count within what the API takes.
const clamp = (n, top = 1_000_000_000_000) => Math.min(Math.max(n, 0), top);

// ---------- Antigravity's generations ----------
const LABEL = /(?:Gemini|Claude|GPT|Gemma)[A-Za-z0-9 .\-]{0,40}\([A-Za-z ]{2,20}\)/;

// Each generation's model as Antigravity shows it ("Gemini 4 Argon (Medium)"), in order, from the conversation's own
// database (read as it is on disk: these are the older, finished ones).
function generations(file) {
  if (!sqlite || !fs.existsSync(file)) return [];
  let db = null;
  try {
    db = new sqlite.DatabaseSync(new URL(`${pathToFileURL(file).href}?immutable=1`), { readOnly: true });
    const out = [];
    for (const row of db.prepare('select data from gen_metadata order by idx').all()) {
      const blob = row.data;
      if (blob === null || blob === undefined) {
        out.push('');
        continue;
      }
      const bytes = typeof blob === 'string' ? Buffer.from(blob, 'utf8') : Buffer.from(blob);
      if (!bytes.length) {
        out.push('');
        continue;
      }
      // The label is plain ASCII inside the record: other bytes become a character no label has.
      for (let k = 0; k < bytes.length; k++) if (bytes[k] >= 0x80) bytes[k] = 1;
      const m = LABEL.exec(bytes.toString('latin1'));
      out.push(m ? m[0] : '');
    }
    return out;
  } catch {
    return [];
  } finally {
    try {
      if (db) db.close();
    } catch {}
  }
}

// ---------- the files ----------
const ASSISTANT = Buffer.from('"type":"assistant"');
const USAGE = Buffer.from('"usage"');
const PLANNER = Buffer.from('"PLANNER_RESPONSE"');
const CODEX_KEYS = ['"token_usage_record"', '"token_count"', '"turn_context"', '"thread_settings_applied"', '"session_meta"'].map((k) => Buffer.from(k));

// A folder itself, not a link to one: inside the tools' folders the reader follows no links (one could lead it over the
// whole disk, or round in a circle). The tools' own folders may be links (a moved .claude).
async function isDir(p) {
  try {
    return (await fsp.lstat(p)).isDirectory();
  } catch {
    return false;
  }
}

async function claudeFiles(projects) {
  const out = [];
  // <project>\<session>.jsonl, and a subagent's under <project>\<session>\…, as the spend ledger walks them.
  async function walk(dir, depth) {
    let names;
    try {
      names = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const d of names) {
      const n = d.name, p = path.join(dir, n);
      if (n.endsWith('.jsonl')) {
        if (depth >= 1) out.push(p);
      } else if (depth < 6 && n !== 'memory' && !n.includes('.') && d.isDirectory()) {
        await walk(p, depth + 1);
      }
    }
  }
  await walk(projects, 0);
  return out;
}

async function codexFiles(codex) {
  const out = [];
  // Archived chats move to archived_sessions: read there again, every reply already counted.
  async function walk(dir) {
    let names;
    try {
      names = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const d of names) {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) await walk(p);
      else if (d.isFile() && d.name.startsWith('rollout-') && d.name.endsWith('.jsonl')) out.push(p);
    }
  }
  for (const sub of ['sessions', 'archived_sessions']) await walk(path.join(codex, sub));
  return out;
}

async function agyFiles(agy) {
  const brain = path.join(agy, 'brain');
  let names;
  try {
    names = await fsp.readdir(brain);
  } catch {
    return [];
  }
  const out = [];
  for (const n of names) {
    const logs = path.join(brain, n, '.system_generated', 'logs');
    if (!(await isDir(path.join(brain, n))) || !(await isDir(path.join(brain, n, '.system_generated'))) || !(await isDir(logs))) continue;
    const f = path.join(logs, 'transcript.jsonl');
    try {
      await fsp.access(f);
      out.push(f);
    } catch {}
  }
  return out;
}

// Each line of `data` (without its newline), empty ones left out.
function eachLine(data, end, body) {
  for (let off = 0; off < end; ) {
    let nl = data.indexOf(10, off);
    if (nl < 0 || nl > end) nl = end;
    if (nl > off) body(data.subarray(off, nl));
    off = nl + 1;
  }
}

const parse = (line) => {
  try {
    const j = JSON.parse(line.toString('utf8'));
    return isObj(j) ? j : null;
  } catch {
    return null;
  }
};

/**
 * `dir`: the app's data folder (where ledger.json is kept); `staging`: a staging build, which keeps its own book as it keeps
 * its own spend ledger (it sends to its own API). The folders the tools keep are found as the engine finds them; `claudeDir`,
 * `codexDir` and `agyDir` are for tests.
 */
function createTokenLedger({ dir, staging = false, claudeDir, codexDir, agyDir } = {}) {
  const projects = path.join(claudeDir || process.env.CLAUDE_CONFIG_DIR || path.join(HOME, '.claude'), 'projects');
  const codex = codexDir || process.env.CODEX_HOME || path.join(HOME, '.codex');
  const agy = agyDir || path.join(HOME, '.gemini', 'antigravity-cli');
  const name = staging ? 'tokens-staging' : 'tokens';
  const file = path.join(dir, `${name}.json`);
  const seenFile = path.join(dir, `${name}.seen`);

  let book = { version: 1, source: '', days: {}, files: {}, dirty: [] };
  // The dirty days as a set while the book is in use; written as the list.
  let dirty = new Set();
  const seen = new Set();
  let unsaved = [];
  // Antigravity's generations by conversation, for its older lines (read once a pass).
  let labels = new Map();
  let chain = Promise.resolve();
  let reading = false;
  let timer = null;

  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {}
  let loaded = false;
  try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (isObj(saved) && saved.version === 1 && isObj(saved.days) && isObj(saved.files)) {
      book = { version: 1, source: str(saved.source) || '', days: saved.days, files: saved.files, dirty: [] };
      dirty = new Set(Array.isArray(saved.dirty) ? saved.dirty.filter((d) => typeof d === 'string') : []);
      loaded = true;
      try {
        const data = fs.readFileSync(seenFile);
        for (let k = 0; k + 8 <= data.length; k += 8) seen.add(data.readBigUInt64LE(k));
      } catch {}
    }
  } catch {}
  // A new book (or one this build can't read) starts over, counted hashes too.
  if (!loaded) {
    try {
      fs.rmSync(seenFile, { force: true });
    } catch {}
  }
  if (!book.source) book.source = crypto.randomBytes(16).toString('hex');

  // One step at a time, in the order asked (Swift's queue).
  function enqueue(fn) {
    const p = chain.then(fn);
    chain = p.then(() => {}, () => {});
    return p;
  }

  // ---------- the book ----------
  function add(day, key, c) {
    const kinds = (book.days[day] ||= {});
    addCounts((kinds[key] ||= counts()), c);
    dirty.add(day);
  }

  function remember(h) {
    seen.add(h);
    unsaved.push(h);
  }

  // The replies it counted first, then the book: a crash in between leaves the old book, whose marks read those replies
  // again, and they're skipped as counted (a few left out), never counted twice. When they can't be written, neither is
  // the book (both are tried again at the next save).
  async function save() {
    if (unsaved.length) {
      const taken = unsaved;
      unsaved = [];
      const bytes = Buffer.allocUnsafe(taken.length * 8);
      taken.forEach((h, k) => bytes.writeBigUInt64LE(h, k * 8));
      try {
        await fsp.appendFile(seenFile, bytes, { mode: 0o600 });
      } catch (e) {
        unsaved = taken.concat(unsaved);
        console.error('tokens:', e.message);
        return;
      }
    }
    try {
      book.dirty = [...dirty];
      const text = JSON.stringify(book);
      const tmp = `${file}.${process.pid}.tmp`;
      await fsp.writeFile(tmp, text, { mode: 0o600 });
      await fsp.rename(tmp, file);
    } catch (e) {
      console.error('tokens:', e.message);
    }
  }

  // ---------- reading ----------
  // A Claude reply: counted the first time its id comes; a later line of the same reply (the one just counted) adds what it
  // has more of.
  function claudeLine(line, mark, keys) {
    if (line.indexOf(ASSISTANT) < 0 || line.indexOf(USAGE) < 0) return;
    const rec = parse(line);
    if (!rec || rec.type !== 'assistant' || rec.isApiErrorMessage === true) return;
    const m = rec.message;
    if (!isObj(m) || !isObj(m.usage) || typeof m.id !== 'string' || m.model === '<synthetic>') return;
    const u = m.usage;
    const c = counts(int(u.input_tokens), int(u.output_tokens), int(u.cache_read_input_tokens), int(u.cache_creation_input_tokens),
      int(isObj(u.output_tokens_details) ? u.output_tokens_details.thinking_tokens : 0), 1);
    const h = hash(`c:${m.id}`);
    const hs = h.toString();
    if (mark.last === hs && mark.lastC && mark.lastKey && mark.lastDay) {
      const had = mark.lastC;
      const more = counts(Math.max(0, c.i - had.i), Math.max(0, c.o - had.o), Math.max(0, c.r - had.r), Math.max(0, c.w - had.w), Math.max(0, c.t - had.t));
      if (isEmpty(more) && !(more.t > 0)) return;
      add(mark.lastDay, mark.lastKey, more);
      mark.lastC = counts(Math.max(c.i, had.i), Math.max(c.o, had.o), Math.max(c.r, had.r), Math.max(c.w, had.w), Math.max(c.t, had.t), 1);
      return;
    }
    if (seen.has(h)) return;
    const ts = parseISO(rec.timestamp);
    if (!(ts > 0)) return;
    remember(h);
    const day = keys(ts);
    const key = keyName('claude', model(str(m.model)), str(rec.perTurnEffort) ?? str(rec.effort));
    add(day, key, c);
    mark.last = hs;
    mark.lastC = c;
    mark.lastKey = key;
    mark.lastDay = day;
  }

  // Codex: each response's own record where its version writes them; before that, its running total's steps.
  function codexLine(line, mark, file, keys) {
    if (!CODEX_KEYS.some((k) => line.indexOf(k) >= 0)) return;
    const j = parse(line);
    if (!j) return;
    const p = isObj(j.payload) ? j.payload : {};
    const ts = parseISO(j.timestamp);
    const count = (u) => {
      const cached = int(u.cached_input_tokens);
      const c = counts(Math.max(0, int(u.input_tokens) - cached), int(u.output_tokens), cached, int(u.cache_write_input_tokens), int(u.reasoning_output_tokens), 1);
      if (!(ts > 0) || isEmpty(c)) return;
      add(keys(ts), keyName('codex', model(mark.model), mark.effort), c);
    };
    const type = str(j.type), ptype = str(p.type);
    if (type === 'session_meta') {
      if (typeof p.id === 'string') mark.sid = p.id;
    } else if (type === 'turn_context') {
      if (typeof p.model === 'string' && p.model) mark.model = p.model;
      const settings = isObj(p.collaboration_mode) && isObj(p.collaboration_mode.settings) ? p.collaboration_mode.settings : null;
      const e = str(p.effort) ?? str(settings && settings.reasoning_effort) ?? str(p.reasoning_effort);
      if (e !== undefined) mark.effort = e;
    } else if (type === 'event_msg' && ptype === 'thread_settings_applied') {
      const s = isObj(p.thread_settings) ? p.thread_settings : null;
      if (s && typeof s.model === 'string' && s.model) mark.model = s.model;
      if (s && typeof s.reasoning_effort === 'string') mark.effort = s.reasoning_effort;
    } else if (type === 'token_usage_record') {
      mark.rec = true;
      if (typeof p.response_id !== 'string' || !isObj(p.usage)) return;
      const h = hash(`x:${p.response_id}`);
      if (seen.has(h)) return;
      remember(h);
      count(p.usage);
    } else if (type === 'event_msg' && ptype === 'token_count') {
      // A log that has records counts them instead.
      if (mark.rec === true || !isObj(p.info) || !isObj(p.info.last_token_usage)) return;
      const t = isObj(p.info.total_token_usage) ? p.info.total_token_usage : null;
      const total = t ? Object.keys(t).sort().map((k) => `${k}=${int(t[k])}`).join(';') : undefined;
      if (total !== undefined && total === mark.total) return;
      if (total === undefined) delete mark.total;
      else mark.total = total;
      const sid = mark.sid ?? path.basename(file);
      const h = hash(`x:${sid}:${str(j.timestamp) ?? ''}:${int(t && t.total_tokens)}`);
      if (seen.has(h)) return;
      remember(h);
      count(p.info.last_token_usage);
    }
  }

  // Antigravity: a reply of its planner. Newer lines name the model with its effort ("gemini-4-argon-medium"); older ones
  // don't, and then it's its conversation's generation of the same number (conversations\<id>.db).
  function agyLine(line, mark, file, keys) {
    if (line.indexOf(PLANNER) < 0) return;
    const j = parse(line);
    if (!j || j.type !== 'PLANNER_RESPONSE') return;
    const nth = mark.n || 0;
    mark.n = nth + 1;
    const c = counts(int(j.input_tokens), int(j.output_tokens), int(j.cache_read_tokens), 0, 0, 1);
    const ts = parseISO(j.created_at);
    if (isEmpty(c) || !(ts > 0)) return;
    // brain\<conversation>\.system_generated\logs\transcript.jsonl
    const tail = file.split(/[\\/]brain[\\/]/).pop();
    const cid = tail.split(/[\\/]/)[0] || '';
    const h = hash(`a:${cid}:${int(j.step_index)}`);
    if (seen.has(h)) return;
    remember(h);
    let m = '', e = '';
    if (typeof j.model === 'string' && j.model) {
      [m, e] = splitEffort(j.model);
    } else {
      let list = labels.get(cid);
      if (!list) {
        list = generations(path.join(agy, 'conversations', `${cid}.db`));
        labels.set(cid, list);
      }
      const label = list.length ? list[Math.min(nth, list.length - 1)] : '';
      if (label) [m, e] = fromLabel(label);
    }
    add(keys(ts), keyName('antigravity', model(m), e), c);
  }

  // Reads a file on from its mark, whole lines only (a line being written waits for the next pass). True when its mark
  // moved. A file only, not a link to one.
  async function pump(file, tool, keys) {
    const st = await fsp.lstat(file, { bigint: true });
    if (!st.isFile()) return false;
    const size = Number(st.size), ino = st.ino.toString();
    let mark = book.files[file] || { ino: '0', off: 0 };
    if (String(mark.ino) !== ino || size < mark.off) mark = { ino, off: 0 };
    mark.ino = ino;
    if (!(size > mark.off)) {
      if (book.files[file]) return false;
      book.files[file] = mark;
      return true;
    }
    const fh = await fsp.open(file, 'r');
    try {
      let pos = mark.off, rest = null;
      while (pos < size) {
        const len = Math.min(CHUNK, size - pos);
        const chunk = Buffer.allocUnsafe(len);
        const { bytesRead } = await fh.read(chunk, 0, len, pos);
        if (!bytesRead) break;
        pos += bytesRead;
        const data = rest ? Buffer.concat([rest, chunk.subarray(0, bytesRead)]) : chunk.subarray(0, bytesRead);
        const nl = data.lastIndexOf(10);
        if (nl < 0) {
          if (data.length > LINE_MAX) {
            // What is left of it, up to its end, reads as a broken line and counts nothing.
            rest = null;
            mark.off = pos;
          } else {
            rest = Buffer.from(data);
          }
          continue;
        }
        eachLine(data, nl, (line) => {
          if (tool === 'claude') claudeLine(line, mark, keys);
          else if (tool === 'codex') codexLine(line, mark, file, keys);
          else agyLine(line, mark, file, keys);
        });
        rest = Buffer.from(data.subarray(nl + 1));
        mark.off = pos - rest.length;
        await nextTurn();
      }
    } finally {
      await fh.close().catch(() => {});
    }
    // Kept even when the read broke off (a file that went away under it): what was counted stays marked.
    book.files[file] = mark;
    return true;
  }

  // Every file of the three tools, read on; the book saved when anything changed.
  async function read() {
    const t0 = Date.now();
    let changed = false;
    const present = new Set();
    const keys = dayKeys();
    labels = new Map();
    const lists = [['claude', claudeFiles(projects)], ['codex', codexFiles(codex)], ['agy', agyFiles(agy)]];
    for (const [tool, pending] of lists) {
      let paths = [];
      try {
        paths = await pending;
      } catch {}
      for (const p of paths) {
        present.add(p);
        try {
          if (await pump(p, tool, keys)) changed = true;
        } catch {
          // A file that broke mid-read: the others go on, and what it counted stays counted (its mark moves on next time).
          changed = true;
        }
        await nextTurn();
      }
    }
    // Files their tool deleted: forgotten, so the book doesn't grow with them (what they added stays).
    for (const p of Object.keys(book.files)) {
      if (!present.has(p)) {
        delete book.files[p];
        changed = true;
      }
    }
    // A pass that counted replies saves them even if a file's mark failed to move.
    if (changed || unsaved.length) {
      await save();
      console.log(`Orbiterm: tokens read in ${((Date.now() - t0) / 1000).toFixed(1)}s, ${dirty.size} days to send`);
    }
  }

  // One pass; never two at once, and never throws.
  function pass() {
    if (reading) return chain;
    reading = true;
    return enqueue(async () => {
      try {
        await read();
      } catch (e) {
        console.error('tokens:', e && e.message);
      } finally {
        reading = false;
      }
    });
  }

  function makeBatch(max) {
    const rows = [], days = {};
    for (const day of [...dirty].sort().reverse()) {
      const kinds = book.days[day] || {};
      const list = Object.entries(kinds).filter(([, c]) => !isEmpty(c));
      if (rows.length && rows.length + list.length > max) break;
      days[day] = JSON.parse(JSON.stringify(kinds));
      list.sort(([, a], [, b]) => b.i + b.o + b.w - (a.i + a.o + a.w));
      for (const [key, c] of list.slice(0, max)) {
        const p = key.split('|');
        // Only rows the API takes (its usage.ts): a name it wouldn't is left out here, a number past its range kept at its
        // edge.
        if (p.length !== 3 || !TOOLS.has(p[0]) || !fits(p[1], 48, false) || !fits(p[2], 16, true)) continue;
        const o = clamp(c.o);
        rows.push({
          day, tool: p[0], model: p[1], effort: p[2], input: clamp(c.i), output: o, cacheRead: clamp(c.r), cacheWrite: clamp(c.w),
          reasoning: Math.min(clamp(c.t), o), calls: clamp(c.n, 10_000_000),
        });
      }
    }
    // Days with nothing to send (all their kinds empty) are done at once.
    if (!rows.length) {
      const names = Object.keys(days);
      if (!names.length) return null;
      for (const day of names) dirty.delete(day);
      return save().then(() => null);
    }
    return { source: book.source, rows, days };
  }

  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  return {
    /** Reads soon, then every three minutes. */
    start() {
      if (timer) return;
      const first = setTimeout(() => void pass(), 3000);
      const every = setInterval(() => void pass(), EVERY);
      first.unref?.();
      every.unref?.();
      timer = { first, every };
    },

    /** One pass now (waits for the one under way). */
    read: () => pass(),

    /** The days that changed since they last went out, newest first, as the API takes them: at most `max` rows. Null when
     *  nothing changed. Waits for a pass in progress. */
    batch(max = 500) {
      return enqueue(() => makeBatch(max)).catch((e) => {
        console.error('tokens:', e && e.message);
        return null;
      });
    },

    /** A batch reached the API: its days are done, unless they changed since. */
    sent(batch) {
      if (!batch || !isObj(batch.days)) return Promise.resolve();
      return enqueue(async () => {
        for (const [day, kinds] of Object.entries(batch.days)) if (same(book.days[day], kinds)) dirty.delete(day);
        await save();
      }).catch(() => {});
    },

    /** The days as counted so far (a probe's and a debugger's look). */
    snapshot: () => book.days,
  };
}

module.exports = { createTokenLedger, hash, model, effort, splitEffort, fromLabel, generations };
