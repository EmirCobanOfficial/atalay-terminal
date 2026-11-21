'use strict';

// notes.pad: notes written in blocks the way Notion's pages are (text, three sizes of heading, to-dos, bulleted and
// numbered lists, quotes, code and dividers). The note pinned to the dashboard lies open there between research.feed
// and files.heat; the activity bar's Notes shows every note as a small panel of the dashboard's own, its name on its
// strip, to open in a window of its own over whatever shows, drag to another place, pin, delete (it asks first) or
// start anew. A note's name is its first line, as in Apple's Notes, whatever kind of block it's in, following it as
// it's typed; there's no other way to name one. An empty note is note1, note2… in the order they were made.
//   "/"        the menu of blocks, narrowed as you type ("/todo", "/div"); ↑↓ and Enter or Tab pick, Esc leaves it
//   markers    "[] ", "- ", "1. ", "# ", "## ", "### ", "> " at a line's start, or "```" and "---", turn it into one
//   Enter      the next block (a list goes on; an empty item ends it), Shift+Enter a line break (Enter in code)
//   Backspace  at a block's start: text again, then out a level, then joined to the block above
//   Tab        in and out a level (Shift+Tab); in code, two spaces
//   Ctrl+A     once the block's text, twice every block: copied (Ctrl+C) as Markdown, deleted or cut together, moved in
//              and out with Tab; Esc, a click or any other key lets go
// What's written is kept as it's typed, on this computer only: by the app, encrypted, in its own folder (in this page's
// storage, notes.pad, when no app is behind the page); Ctrl+Z and Ctrl+Y (⌘Z, ⌘⇧Z) go back and forth through it. ⤢ on the strip opens the note in a window of its own over the dashboard, to
// drag by its top and size by its corner; × puts it back in its place. Ctrl+Shift+J (⌘⇧J) brings the cursor to it from
// anywhere on the page, in the window when the panel isn't showing.
window.Notes = (() => {
  const KEY = 'notes.pad';
  const WIN_KEY = 'notes.pad.window';
  // The app keeps the notes (NotesStore.swift on the Mac, notesstore.js on Windows); the page reads them once it
  // starts, and writes nothing before.
  // On the Mac a note opened out of the dashboard is an app window of its own (NoteWindow.swift), so the terminals,
  // the dashboard's child windows, no longer cover it: note.html runs this page for that one note (WINDOW), and its
  // note goes through the app to the dashboard's page, the one that writes the notes (`fromWindow`). On the
  // dashboard (NATIVE), `out` is the notes open in their windows: they're written there, never here.
  const WINDOW = window.__NOTE_WINDOW__ || null;
  const STORE = (WINDOW ? window.webkit?.messageHandlers?.noteWindow : window.webkit?.messageHandlers?.notes) || null;
  const NATIVE = !WINDOW && !!STORE && window.__noteWindows === true;
  const out = new Set();
  const toApp = (msg) => {
    try {
      window.webkit.messageHandlers.radar.postMessage(msg);
    } catch {}
  };
  let loaded;
  const isLoaded = new Promise((r) => (loaded = r));
  let ready = !STORE && !WINDOW;
  const host = document.getElementById('notes');
  const panel = document.getElementById('p-notes');
  const meta = document.getElementById('m-notes');
  if (!host || !panel) return null;
  const MAC = window.__platform !== 'win32';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // ---------- the blocks ----------
  const TYPES = {
    p: { ph: "Type '/' for commands" },
    h1: { ph: 'Heading 1' },
    h2: { ph: 'Heading 2' },
    h3: { ph: 'Heading 3' },
    todo: { ph: 'To-do', list: true },
    bullet: { ph: 'List', list: true },
    num: { ph: 'List', list: true },
    quote: { ph: 'Quote' },
    code: { ph: 'Code' },
    divider: {},
  };
  const COMMANDS = [
    { type: 'p', name: 'Text', hint: 'Just start writing with plain text', icon: 'T', keys: ['text', 'plain', 'paragraph'] },
    { type: 'h1', name: 'Heading 1', hint: 'Big section heading', icon: 'H1', keys: ['h1', 'heading', 'title'] },
    { type: 'h2', name: 'Heading 2', hint: 'Medium section heading', icon: 'H2', keys: ['h2', 'heading', 'subtitle'] },
    { type: 'h3', name: 'Heading 3', hint: 'Small section heading', icon: 'H3', keys: ['h3', 'heading'] },
    { type: 'todo', name: 'To-do list', hint: 'Track tasks with a checkbox', icon: '☐', keys: ['todo', 'to-do', 'task', 'check', 'checkbox'] },
    { type: 'bullet', name: 'Bulleted list', hint: 'A simple bulleted list', icon: '•', keys: ['bullet', 'list', 'ul', 'unordered'] },
    { type: 'num', name: 'Numbered list', hint: 'A list with numbering', icon: '1.', keys: ['numbered', 'number', 'num', 'ol', 'ordered', 'list'] },
    { type: 'quote', name: 'Quote', hint: 'Capture a quote', icon: '❝', keys: ['quote', 'blockquote', 'citation'] },
    { type: 'code', name: 'Code', hint: 'Capture a code snippet', icon: '</>', keys: ['code', 'snippet', 'pre'] },
    { type: 'divider', name: 'Divider', hint: 'Visually divide blocks', icon: '—', keys: ['divider', 'div', 'hr', 'line', 'separator'] },
  ];
  const BULLETS = ['•', '◦', '▪'];
  // Deleting is a trash can (the icon font of the activity bar, codicon), never the × that closes a window; pinned to
  // the dashboard is codicon's pin.
  const TRASH = '<i class="np-glyph" aria-hidden="true"></i>';
  const EYE = '<i class="np-glyph" aria-hidden="true">&#xEA70;</i>';
const EYE_OFF = '<i class="np-glyph" aria-hidden="true">&#xEAE7;</i>';
  // What the eye means, in words: its tooltip and VoiceOver's label (the state, then what a click does).
  const AI_TIP_SEEN = 'AI can read this note · Click to hide it from AI';
  const AI_TIP_HIDDEN = 'Hidden from AI · Click to let AI read it';
  const AI_HIDDEN_TIP = 'Hidden from AI';
  // What AI may do with the notes (NotesAI.swift): the dashboard asks the app, a note's window is told (boot, then Notes.aiMode).
  // Where the app can't say (no handler, an older window), the eye stays as it always was.
  const NA = !WINDOW ? window.webkit?.messageHandlers?.notesai || null : null;
  const AI = {
    mode: WINDOW ? (['off', 'read', 'write'].includes(WINDOW.aiMode) ? WINDOW.aiMode : 'read') : NA ? 'off' : 'read',
    ready: true,
    tools: {},
    outsideNeedsType: false,
    known: !!NA || !!(WINDOW && WINDOW.aiMode),
  };
const PIN = '<i class="np-glyph" aria-hidden="true"></i>';
  // The activity bar's Notes: a notepad with its rings, its lines and a pencil, the sign for notes most people know;
  // drawn in strokes so it sits with the outline icons around it.
  const ICON =
    '<svg class="np-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M15 21H6a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2V11"/><path d="M8 3v3M11 3v3M14 3v3"/>' +
    '<path d="M7.5 10.5h7M7.5 13.5h5M7.5 16.5h3"/><path d="M20.4 13.6a1.4 1.4 0 0 0-2-2l-5.1 5.1-.7 2.7 2.7-.7z"/></svg>';

  let seq = 0;
  const mk = (type = 'p', text = '', more) => ({ id: `n${++seq}`, type, text, checked: false, indent: 0, ...more });
  const level = (n) => Math.max(0, Math.min(4, Math.round(Number(n) || 0)));
  const plain = (list) => list.map(({ type, text, checked, indent }) => ({ type, text, ...(checked ? { checked } : {}), ...(indent ? { indent } : {}) }));

  // A line of plain text as a block: Markdown's marker at its start says which ("- [ ]", "- ", "1. ", "# ", "> ", "---").
  function fromLine(line) {
    const lead = /^ */.exec(line)[0].length;
    const s = line.slice(lead);
    const indent = level(lead / 2);
    let m;
    if ((m = /^(?:[-*]\s+)?\[( |x|X)?\]\s+/.exec(s))) return mk('todo', s.slice(m[0].length), { checked: !!m[1] && m[1] !== ' ', indent });
    if ((m = /^[-*•]\s+/.exec(s))) return mk('bullet', s.slice(m[0].length), { indent });
    if ((m = /^\d+[.)]\s+/.exec(s))) return mk('num', s.slice(m[0].length), { indent });
    if ((m = /^(#{1,3})\s+/.exec(s))) return mk(`h${m[1].length}`, s.slice(m[0].length));
    if ((m = /^>\s?/.exec(s))) return mk('quote', s.slice(m[0].length));
    if (/^(?:-{3,}|_{3,}|\*{3,})$/.test(s)) return mk('divider');
    return mk('p', line);
  }
  // Plain text as blocks, a line each, and what's between two ``` lines as one block of code.
  function fromText(text) {
    const out = [];
    let code = null;
    for (const line of String(text).replace(/\r\n?/g, '\n').split('\n')) {
      if (/^\s*```/.test(line)) {
        if (code) out.push(mk('code', code.join('\n')));
        code = code ? null : [];
      } else if (code) code.push(line);
      else out.push(fromLine(line));
    }
    if (code) out.push(mk('code', code.join('\n')));
    return out;
  }

  // ---------- kept ----------
  // Every note: { id, name, created, at (last changed), blocks }, in the order the board shows them (the user's, by
  // dragging). The one being written is `cur`: its blocks are the live ones below, with ids for the page; the others
  // keep theirs plain. `pinned` is the note the dashboard's panel shows: the one written there whenever no note is out
  // in its window.
  let notes = [];
  let cur = null;
  let pinned = null;
  const pinnedNote = () => notes.find((n) => n.id === pinned) || notes[0];
  let blocks = [];
  let kept = '';
  const noteId = () => `note-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  // A new note's name: note1, note2…, one past the highest such name there is.
  const nextName = (list = notes) => `note${Math.max(0, ...list.map((n) => Number((/^note(\d+)$/.exec(n.name || '') || [])[1]) || 0)) + 1}`;
  const blank = (name = nextName()) => ({ id: noteId(), name, created: Date.now(), at: 0, blocks: [] });
  const liveOf = (list) => {
    const l = (Array.isArray(list) ? list : []).filter((b) => b && TYPES[b.type]).map((b) => mk(b.type, String(b.text ?? ''), { checked: !!b.checked, indent: level(b.indent) }));
    return l.length ? l : [mk()];
  };
  // A note out in its window has its blocks from there (fromWindow), not the panel's.
  const blocksOf = (n) => (n === cur && !out.has(n.id) ? plain(blocks) : n.blocks);

  // A note an AI pinned to a terminal (agentSession): that terminal's session name and a label to show. Kept with the note.
  const sessionOf = (n) =>
    typeof n.session === 'string' && n.session && n.session.length <= 100
      ? { session: n.session, sessionLabel: typeof n.sessionLabel === 'string' ? n.sessionLabel.slice(0, 60) : '' }
      : {};

  // A note the user hid from AI (the eye): kept with the note, so the app can read it too (NotesStore, NotesTools). Only the
  // user's own clicks set it (setAiHidden); an AI's tools never touch it, and the app refuses a hidden note's id on every call.
  const hideOf = (n) => (n && n.aiHidden === true ? { aiHidden: true } : {});

  const readHere = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch {
      return null;
    }
  };

  function loadAll(v) {
    let list = [];
    if (v && Array.isArray(v.notes)) {
      list = v.notes
        .filter((n) => n && typeof n.id === 'string')
        .map((n) => ({ id: n.id, name: typeof n.name === 'string' ? n.name.trim().slice(0, 40) : '', created: Number(n.created) || Number(n.at) || Date.now(), at: Number(n.at) || 0, blocks: Array.isArray(n.blocks) ? n.blocks : [], ...sessionOf(n), ...hideOf(n) }));
    } else if (v && (Array.isArray(v.blocks) || (typeof v.text === 'string' && v.text))) {
      // One page before there were notes (its blocks, or before them its plain text): it's the first note.
      const at = Number(v.at) || 0;
      list = [{ ...blank('note1'), created: at || Date.now(), at, blocks: Array.isArray(v.blocks) ? v.blocks : plain(fromText(v.text)) }];
    }
    // Every note keeps a noteN name for when it has no heading; a note from before had none, or one written in by
    // hand while that was possible: it gets one in the order the notes were made, kept at once so it stays.
    for (const n of list) if (!/^note\d+$/.test(n.name)) n.name = '';
    const unnamed = list.filter((n) => !n.name).length;
    for (const n of list.slice().sort((a, b) => a.created - b.created)) if (!n.name) n.name = nextName(list);
    // Notes from before the order was the user's keep the one they showed in: the last changed first.
    if (!v || !v.ordered) list.sort((a, b) => (b.at || b.created) - (a.at || a.created));
    notes = list.length ? list : [blank('note1')];
    pinned = (notes.find((n) => n.id === (v?.pinned || v?.current)) || notes[0]).id;
    bind(pinnedNote());
    if (v && (unnamed || !v.ordered)) write();
  }

  // The note being written from now on: its blocks become the live ones, with a history of their own.
  function bind(n) {
    cur = n;
    blocks = liveOf(n.blocks);
    kept = JSON.stringify(plain(blocks));
    past.length = 0;
    future.length = 0;
    lastKind = '';
    lastFocus = null;
  }

  // Every note goes to the app, one write after the other. One the app couldn't keep goes again with the next, and the
  // panel's strip says so meanwhile (`unsaved`, the app's reason).
  let writing = Promise.resolve(true);
  let unsaved = '';
  function write() {
    if (!ready) return writing;
    const all = notes.map((n) => ({ id: n.id, name: n.name, created: n.created, at: n.at, blocks: blocksOf(n), ...sessionOf(n), ...hideOf(n) }));
    const json = JSON.stringify({ v: 3, ordered: true, pinned, current: cur.id, notes: all });
    if (!STORE) {
      try {
        localStorage.setItem(KEY, json);
      } catch {}
      return writing;
    }
    writing = writing
      .then(() => STORE.postMessage({ type: 'save', json }))
      .then(
        (r) => {
          unsaved = r && r.ok ? '' : (r && r.error) || 'no answer';
          return !unsaved;
        },
        (err) => {
          unsaved = String((err && err.message) || err);
          return false;
        },
      );
    writing.then(() => stamp());
    return writing;
  }

  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    if (out.has(cur.id)) return;
    const json = JSON.stringify(plain(blocks));
    if (json === kept) return;
    kept = json;
    cur.blocks = plain(blocks);
    cur.at = Date.now();
    write();
    stamp();
    drawBoard();
  }
  const later = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 400);
  };

  function ago(t) {
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  // A note's name: its first line with words in it, whatever kind of block holds it; an empty note is its noteN.
  function nameOf(n) {
    const top = blocksOf(n).find((b) => b.type !== 'divider' && b.text.trim());
    return top ? unlink(top.text).trim().split('\n')[0].trim().slice(0, 80) : n.name;
  }
  const NAME_HINT = 'The first line you write names the note';

  // The name follows the first line as it's typed: on the strip, on the window's and on the board, where the note's
  // small page is drawn again too (the rest of the board waits for the note to be kept).
  function liveName() {
    stamp();
    const tile = board && boardOn ? board.querySelector(`.np-tile[data-id="${CSS.escape(cur.id)}"]`) : null;
    if (!tile) return;
    const name = nameOf(cur);
    const tag = tile.querySelector('.np-name');
    if (tag.textContent !== name) {
      tag.textContent = name;
      tag.title = name === cur.name ? NAME_HINT : name;
      tile.setAttribute('aria-label', name);
    }
    tile.querySelector('.np-mini').innerHTML = mini(blocksOf(cur));
  }

  // The panel's strip names the pinned note and when it last changed; the window's strip, the note in it.
  let titled = ''; // the name the app has for the note's own window
  // The last change an AI made (agentApply): while the note is still as it left it, the strip says so and offers Undo.
  let lastAi = null; // { id, by, at, before (blocks), after (version) }
  const aiLog = [];
  const hashOf = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return (h >>> 0).toString(36);
  };
  const aiTag = (n) => (lastAi && n && lastAi.id === n.id && Date.now() - lastAi.at < 600000 && hashOf(toText(blocksOf(n))) === lastAi.after ? lastAi : null);
  const aiText = (a) => `${a.by} ${a.kind === 'create' ? 'created' : a.kind === 'pin' ? 'pinned' : 'edited'} · ${new Date(a.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · Undo`;
  // An AI changed a note (or its change was undone): the board's marks and the popover's last line follow.
  function aiTouched() {
    if (WINDOW) return;
    drawBoard();
    if (popOpen) paintPop();
  }
  function stamp() {
    if (!cur) return;
    paintAi();
    const edited = (n) => (n.at && blocksOf(n).some((b) => b.text || b.type !== 'p') ? `edited ${ago(n.at)}` : '');
    const p = pinnedNote();
    if (meta && p) {
      const ai = aiTag(p);
      meta.textContent = ai ? aiText(ai) : (unsaved ? 'not saved · ' : '') + (edited(p) ? `${nameOf(p)} · ${edited(p)}` : nameOf(p));
      meta.title = ai ? 'Put the note back as it was before' : unsaved ? `Not saved on this computer: ${unsaved}` : '';
      meta.dataset.undo = ai ? p.id : '';
    }
    if (WINDOW) {
      // The note's own window: its strip, and its name for the app (Mission Control, the Window menu).
      if (!ready) return;
      const name = nameOf(cur);
      const tag = panel.querySelector('.npw-name');
      tag.textContent = name;
      tag.title = name === cur.name ? NAME_HINT : name;
      const m = panel.querySelector('.npw-meta');
      const ai = aiTag(cur);
      m.textContent = ai ? aiText(ai) : (unsaved ? 'not saved · ' : '') + edited(cur);
      m.title = ai ? 'Put the note back as it was before' : unsaved ? `Not saved on this computer: ${unsaved}` : '';
      m.dataset.undo = ai ? cur.id : '';
      // On stream the app's window list shows a plain name, not the note's first line.
      const shown = document.documentElement.classList.contains('streamer') ? 'Note' : name;
      if (shown !== titled) STORE?.postMessage({ type: 'title', name: (titled = shown) }).catch(() => {});
    } else if (win) {
      const name = nameOf(cur);
      const tag = win.querySelector('.npw-name');
      tag.textContent = name;
      tag.title = name === cur.name ? NAME_HINT : name;
      win.querySelector('.npw-meta').textContent = edited(cur);
    }
  }

  // ---------- drawn ----------
  const ed = document.createElement('div');
  ed.className = 'np-ed';
  ed.setAttribute('role', 'group');
  ed.setAttribute('aria-label', 'Notes');
  host.appendChild(ed);

  const idx = (id) => blocks.findIndex((b) => b.id === id);
  const textEl = (id) => ed.querySelector(`.nb[data-id="${id}"] .nb-text`);
  const blockOf = (el) => {
    const n = el && el.closest && el.closest('.nb');
    return n ? blocks[idx(n.dataset.id)] : null;
  };
  // (A text that ends in a line break is drawn with one more, as a textarea does, so the empty line under it can hold the cursor: paint.)

  // ---------- links ----------
  // A link is kept in the note as Markdown, [words](https://where), so the AI's note tools, copy and paste and every old
  // note read it as they always did; a block's text stays exactly what the model holds (the cursor's places are the same
  // everywhere), and only how it is drawn changes: the brackets and the address are in the text, out of sight, until the
  // cursor is in the link. A web address typed or pasted as it is gets the same look with nothing added to the note.
  // Only http, https and mailto are ever links; the page's own links go out through the app's SafeOpen (NoteWindow and
  // RadarView refuse every navigation but a click on a link, and hand it to SafeOpen), never a bridge of ours.
  const LK_MD = /\[([^\[\]\n]+)\]\(((?:https?:\/\/|mailto:)[^\s()]+)\)/gi;
  const LK_EMPTY = /\[\]\((?:https?:\/\/|mailto:)[^\s()]*\)/gi;
  const LK_URL = /(?:https?:\/\/|www\.)[^\s<>"'`\[\]]+/gi;
  const unlink = (s) => s.replace(LK_MD, '$1');
  // The address a link goes to, or null when it's not one the notes open.
  function safeHref(s) {
    try {
      const u = new URL(/^www\./i.test(s) ? `https://${s}` : s);
      return ['http:', 'https:', 'mailto:'].includes(u.protocol) && (u.protocol === 'mailto:' ? !!u.pathname : !!u.hostname) ? u.href : null;
    } catch {
      return null;
    }
  }
  // What was typed in the link box, made an address: "example.com" is https, "a@b.co" a mail; anything else but http, https
  // and mailto is refused. Spaces and brackets are escaped so the Markdown stays one piece.
  function addressOf(s) {
    s = s.trim();
    if (!s || /\s/.test(s) && !/^(https?:|mailto:)/i.test(s)) return null;
    // "example.com:8080/x" is an address with a port, not a scheme named "example.com".
    if (!/^(?:https?|mailto):/i.test(s) && !/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(s)) s =/^[^\s@\/]+@[^\s@\/]+\.[^\s@\/]+$/.test(s) ? `mailto:${s}` : `https://${s}`;
    if (!safeHref(s)) return null;
    return s.replace(/\s/g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');
  }
  // The links in a text, in order: { s, e } its place, md (a named one) with { ts, te } the words' place and href.
  function scan(text) {
    const out = [];
    let m;
    LK_MD.lastIndex = 0;
    while ((m = LK_MD.exec(text))) {
      const href = safeHref(m[2]);
      if (href) out.push({ s: m.index, e: m.index + m[0].length, md: true, ts: m.index + 1, te: m.index + 1 + m[1].length, href, url: m[2] });
    }
    // The rest is searched with the named links blanked out, so an address inside one is not a second link.
    let rest = text;
    for (const k of out) rest = rest.slice(0, k.s) + ' '.repeat(k.e - k.s) + rest.slice(k.e);
    LK_URL.lastIndex = 0;
    while ((m = LK_URL.exec(rest))) {
      if (m.index && /[\w@\/.-]/.test(rest[m.index - 1])) continue;
      let s = m[0];
      for (;;) {
        const c = s[s.length - 1];
        const open = c === ')' ? s.split('(').length - 1 : 0;
        if (/[.,;:!?'"*_~]/.test(c) || (c === ')' && s.split(')').length - 1 > open)) s = s.slice(0, -1);
        else break;
      }
      if (/^(https?:\/\/|www\.)$/i.test(s) || (/^www\./i.test(s) && !/^www\.[^.]+\.[^.]/.test(s) && !/^www\.[^.\/]{2,}/.test(s))) continue;
      const href = safeHref(s);
      if (href) out.push({ s: m.index, e: m.index + s.length, md: false, href });
    }
    return out.sort((a, b) => a.s - b.s);
  }
  // How a block is cut into pieces, as lengths: what the links call for (sigOf) and what is drawn (domSig). Typing next to a
  // link's end lands in its span; the two then differ and the block is drawn again.
  const sigOf = (toks, len) => {
    const out = [];
    let at = 0;
    for (const k of toks) {
      if (k.s > at) out.push(`t${k.s - at}`);
      out.push(`${k.md ? 'm' : 'u'}${k.e - k.s}`);
      at = k.e;
    }
    if (len > at) out.push(`t${len - at}`);
    return out.join(',');
  };
  function domSig(t) {
    const out = [];
    let run = 0;
    for (const n of t.childNodes) {
      if (n.nodeType === 3) run += n.length;
      else {
        if (run) out.push(`t${run}`);
        run = 0;
        out.push(`${n.classList.contains('lk-m') ? 'm' : 'u'}${n.textContent.length}`);
      }
    }
    if (run) out.push(`t${run}`);
    return out.join(',');
  }
  // A block's text drawn: the same characters, the links wrapped. A code block is never linked.
  function paint(t, text, type) {
    const toks = type === 'code' ? [] : scan(text);
    const frag = document.createDocumentFragment();
    let at = 0;
    const raw = (a, z) => a < z && frag.appendChild(document.createTextNode(text.slice(a, z)));
    const span = (cls, s) => {
      const el = document.createElement('span');
      el.className = cls;
      el.textContent = s;
      return el;
    };
    for (const k of toks) {
      raw(at, k.s);
      if (k.md) {
        const w = span('lk lk-m', '');
        w.dataset.href = k.href;
        w.title = k.href;
        w.append(span('lk-h', '['), span('lk-t', text.slice(k.ts, k.te)), span('lk-h', text.slice(k.te, k.e)));
        frag.appendChild(w);
      } else {
        const w = span('lk lk-u', text.slice(k.s, k.e));
        w.dataset.href = k.href;
        w.title = k.href;
        frag.appendChild(w);
      }
      at = k.e;
    }
    raw(at, text.length);
    if (text.endsWith('\n')) frag.appendChild(document.createTextNode('\n'));
    t.replaceChildren(frag);
  }
  // After typing: the links drawn again when they changed, the cursor kept. A named link emptied of its words goes whole.
  function relink(t, b) {
    if (b.type === 'code') return;
    let c = null;
    if (LK_EMPTY.test(b.text)) {
      c = caretIn(t);
      let at = c ? c.start : 0;
      b.text = b.text.replace(LK_EMPTY, (m, i) => {
        if (at > i + m.length) at -= m.length;
        else if (at > i) at = i;
        return '';
      });
      LK_EMPTY.lastIndex = 0;
      c = { start: at };
    }
    LK_EMPTY.lastIndex = 0;
    if (!c && sigOf(scan(b.text), b.text.length + (b.text.endsWith('\n') ? 1 : 0)) === domSig(t)) return;
    c = c || caretIn(t);
    paint(t, b.text, b.type);
    t.classList.toggle('is-empty', !b.text);
    if (c && document.activeElement === t) {
      const at = Math.min(c.start, b.text.length);
      // The cursor inside a named link (its address being typed, say) keeps it open, so the cursor stays where it was
      // rather than going to the end of the words.
      const k = scan(b.text).filter((x) => x.md).findIndex((x) => at > x.s && at < x.e);
      if (k >= 0) t.querySelectorAll('.lk-m')[k]?.classList.add('open');
      place(t, at);
    }
  }
  // The same selection read for the clipboard: a link taken whole goes as its Markdown, one taken in part as its words.
  function copyText(text, a, z) {
    let out = '';
    let at = a;
    for (const k of scan(text)) {
      if (k.e <= a || k.s >= z) continue;
      if (k.s >= a && k.e <= z) {
        out += text.slice(at, k.s) + text.slice(k.s, k.e);
        at = k.e;
      } else if (k.md) {
        out += text.slice(at, Math.max(at, k.s));
        out += text.slice(Math.max(a, k.ts, at), Math.min(z, k.te));
        at = Math.min(z, k.e);
      }
    }
    return out + text.slice(at, z);
  }
  // A pasted page's text with its links as Markdown, or null when there are none (then the plain text is as good).
  function htmlText(html) {
    if (!/<a[\s>]/i.test(html || '')) return null;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (![...doc.querySelectorAll('a[href]')].some((a) => safeHref(a.getAttribute('href') || ''))) return null;
    const BLOCK = /^(DIV|P|LI|UL|OL|H[1-6]|BLOCKQUOTE|TR|PRE|SECTION|ARTICLE)$/;
    let s = '';
    const nl = () => {
      if (s && !s.endsWith('\n')) s += '\n';
    };
    // Inside a <pre> (code on a page) the line breaks and spaces are kept.
    const walk = (n, pre) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) s += pre ? c.data : c.data.replace(/\s+/g, ' ');
        else if (c.nodeType !== 1 || /^(SCRIPT|STYLE|HEAD)$/.test(c.nodeName)) continue;
        else if (c.nodeName === 'BR') s += '\n';
        else if (c.nodeName === 'A') {
          const href = safeHref(c.getAttribute('href') || '');
          const label = c.textContent.replace(/\s+/g, ' ').replace(/[\[\]]/g, '').trim();
          const addr = href && addressOf(c.getAttribute('href') || '');
          s += href && label && addr && label !== addr && label !== href ? `[${label}](${addr})` : c.textContent.replace(/\s+/g, ' ');
        } else {
          const blk = BLOCK.test(c.nodeName);
          if (blk) nl();
          walk(c, pre || c.nodeName === 'PRE');
          if (blk) nl();
        }
      }
    };
    walk(doc.body);
    return s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  // What a paste brings, as the notes keep it (into a code block, the plain text: it is never linked).
  const pastedText = (e, plain) => (plain ? null : htmlText(e.clipboardData?.getData('text/html'))) ?? (e.clipboardData?.getData('text/plain') || '');
  // Opened the way the app opens any link its pages show: an <a> clicked, which WebKit hands to the app's navigation
  // policy (SafeOpen there; the Windows app's will-navigate opens http and https in the browser).
  function openLink(href) {
    const h = safeHref(href || '');
    if (!h) return;
    const a = document.createElement('a');
    a.href = h;
    a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function render(focus) {
    const top = ed.scrollTop;
    const frag = document.createDocumentFragment();
    const counts = [];
    const blank = blocks.length === 1 && blocks[0].type === 'p' && !blocks[0].text;
    for (const b of blocks) {
      let num = 0;
      if (b.type === 'num') {
        counts.length = b.indent + 1;
        num = counts[b.indent] = (counts[b.indent] || 0) + 1;
      } else counts.length = TYPES[b.type].list ? b.indent : 0;
      frag.appendChild(blockEl(b, num, blank));
    }
    ed.replaceChildren(frag);
    ed.classList.toggle('blank', blank);
    ed.scrollTop = top;
    if (focus) place(textEl(focus.id), focus.at);
    liveName();
  }

  function blockEl(b, num, blank) {
    const el = document.createElement('div');
    el.className = `nb nb-${b.type}${b.checked ? ' done' : ''}`;
    el.dataset.id = b.id;
    if (b.indent) el.style.setProperty('--ind', b.indent);
    if (b.type === 'divider') {
      el.setAttribute('contenteditable', 'false');
      el.innerHTML = '<hr>';
      return el;
    }
    let mark = '';
    if (b.type === 'todo') mark = `<i class="nb-cb" role="checkbox" aria-checked="${b.checked}" title="${b.checked ? 'Untick' : 'Tick'}"></i>`;
    else if (b.type === 'bullet') mark = BULLETS[b.indent % BULLETS.length];
    else if (b.type === 'num') mark = `${num}.`;
    if (mark) el.insertAdjacentHTML('beforeend', `<span class="nb-mark" contenteditable="false">${mark}</span>`);
    const t = document.createElement('div');
    t.className = `nb-text${b.text ? '' : ' is-empty'}`;
    t.setAttribute('contenteditable', 'plaintext-only');
    t.spellcheck = false;
    t.dataset.ph = blank ? "Write something, or type '/' for commands…" : TYPES[b.type].ph;
    paint(t, b.text, b.type);
    el.appendChild(t);
    return el;
  }

  // ---------- the cursor ----------
  // A block's text as lines: a <br> or a <div> an editor slipped in (pasting, dropping) is a line break.
  function textOf(node) {
    let s = '';
    const walk = (n) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) s += c.data;
        else if (c.nodeName === 'BR') s += '\n';
        else {
          if ((c.nodeName === 'DIV' || c.nodeName === 'P') && s && !s.endsWith('\n')) s += '\n';
          walk(c);
        }
      }
    };
    walk(node);
    return s;
  }
  const read = (t) => {
    const s = textOf(t);
    return s.endsWith('\n') ? s.slice(0, -1) : s;
  };

  function caretIn(t) {
    const sel = getSelection();
    if (!t || !sel.rangeCount || !t.contains(sel.anchorNode)) return null;
    const r = sel.getRangeAt(0);
    const pre = document.createRange();
    pre.selectNodeContents(t);
    pre.setEnd(r.startContainer, r.startOffset);
    const start = textOf(pre.cloneContents()).length;
    return { start, end: start + textOf(r.cloneContents()).length, collapsed: r.collapsed };
  }

  function place(t, at) {
    if (!t) return;
    t.focus({ preventScroll: true });
    const sel = getSelection();
    const r = document.createRange();
    let left = Math.max(0, at);
    const walker = document.createTreeWalker(t, NodeFilter.SHOW_TEXT);
    let node = null;
    while ((node = walker.nextNode())) {
      if (left <= node.length) {
        r.setStart(node, left);
        // Not in a named link's hidden brackets or address (a cursor there would be typing in what can't be seen): at the
        // start of its words, their end, or beside the link.
        const h = node.parentElement && node.parentElement.closest('.lk-h');
        const w = h && h.parentElement;
        if (w && !w.classList.contains('open')) {
          const words = w.querySelector('.lk-t');
          if (h === w.firstElementChild) {
            if (left) r.setStart(words.firstChild || words, 0);
            else r.setStartBefore(w);
          } else if (left === node.length) r.setStartAfter(w);
          else r.setStart(words.lastChild || words, words.textContent.length);
        }
        break;
      }
      left -= node.length;
    }
    if (!node) {
      r.selectNodeContents(t);
      r.collapse(at <= 0);
    } else r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    const box = t.getBoundingClientRect(), view = ed.getBoundingClientRect();
    if (box.top < view.top || box.bottom > view.bottom) t.scrollIntoView({ block: 'nearest' });
  }

  // Is the cursor on the block's first line (dir -1) or last (dir 1)? Its left edge, for a cursor going up or down.
  function edge(t, dir) {
    const sel = getSelection();
    if (!sel.rangeCount) return { at: true, x: null };
    const r = sel.getRangeAt(0).cloneRange();
    r.collapse(dir < 0);
    const rect = r.getClientRects()[0] || r.getBoundingClientRect();
    if (!rect || (!rect.height && !rect.top)) return { at: true, x: null };
    const box = t.getBoundingClientRect();
    const lh = parseFloat(getComputedStyle(t).lineHeight) || 18;
    return { at: dir < 0 ? rect.top - box.top < lh * 0.75 : box.bottom - rect.bottom < lh * 0.75, x: rect.left };
  }

  // The cursor into the text block above or below (past dividers): at the same left edge when it can, else its end or start.
  function moveTo(b, dir, x) {
    let i = idx(b.id) + dir;
    while (blocks[i] && blocks[i].type === 'divider') i += dir;
    const n = blocks[i];
    if (!n) return false;
    const t = textEl(n.id);
    if (x != null && document.caretRangeFromPoint) {
      const box = t.getBoundingClientRect();
      const r = document.caretRangeFromPoint(Math.max(box.left + 1, Math.min(x, box.right - 1)), dir < 0 ? box.bottom - 4 : box.top + 4);
      if (r && t.contains(r.startContainer)) {
        t.focus({ preventScroll: true });
        const sel = getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
        return true;
      }
    }
    place(t, dir < 0 ? n.text.length : 0);
    return true;
  }

  // ---------- back and forth ----------
  // Typing counts as one step until it pauses; every change to the blocks themselves is a step of its own.
  const past = [];
  const future = [];
  let lastKind = '';
  let lastAt = 0;
  function snap() {
    const t = document.activeElement && document.activeElement.closest && document.activeElement.closest('.np-ed .nb-text');
    const b = t && blockOf(t);
    return { blocks: plain(blocks), focus: b ? { i: idx(b.id), at: caretIn(t)?.start || 0 } : null };
  }
  function record(kind) {
    const now = Date.now();
    if (kind === 'type' && lastKind === 'type' && now - lastAt < 1200) {
      lastAt = now;
      return;
    }
    lastKind = kind;
    lastAt = now;
    past.push(snap());
    if (past.length > 200) past.shift();
    future.length = 0;
  }
  function restore(s) {
    // A step taken with no cursor in the page (blocks selected, a box ticked) keeps the cursor where it is now; on a
    // divider it goes to the text nearest, so ⌘Z and ⌘⇧Z go on working.
    const here = s.focus || snap().focus;
    blocks = s.blocks.map((b) => mk(b.type, b.text, { checked: !!b.checked, indent: b.indent || 0 }));
    if (!blocks.length) blocks = [mk()];
    lastKind = '';
    const i = here ? Math.min(here.i, blocks.length - 1) : -1;
    const f = i < 0 ? null : blocks.slice(i).find((x) => x.type !== 'divider') || blocks.slice(0, i).reverse().find((x) => x.type !== 'divider');
    render(f ? { id: f.id, at: f === blocks[i] ? Math.min(here.at, f.text.length) : 0 } : null);
    if (!f && document.activeElement === clip) refocus();
    later();
  }
  function undo() {
    if (!past.length) return;
    future.push(snap());
    restore(past.pop());
  }
  function redo() {
    if (!future.length) return;
    past.push(snap());
    restore(future.pop());
  }

  // ---------- the blocks changed ----------
  function changed(focus) {
    render(focus);
    later();
  }

  function enter(b, c) {
    record('op');
    const i = idx(b.id);
    const list = TYPES[b.type].list;
    if (list && !b.text) {
      // An empty item ends the list: a level out first, then plain text.
      if (b.indent) b.indent--;
      else Object.assign(b, { type: 'p', checked: false });
      return changed({ id: b.id, at: 0 });
    }
    const head = b.text.slice(0, c.start);
    const tail = b.text.slice(c.end);
    if (!head && tail) {
      // Enter at a block's start opens an empty one above it.
      blocks.splice(i, 0, mk(list ? b.type : 'p', '', { indent: b.indent }));
      return changed({ id: b.id, at: 0 });
    }
    b.text = head;
    const next = mk(list ? b.type : 'p', tail, { indent: b.indent });
    blocks.splice(i + 1, 0, next);
    changed({ id: next.id, at: 0 });
  }

  function backspace(b) {
    const i = idx(b.id);
    const prev = blocks[i - 1];
    if (b.type === 'p' && !b.indent && !prev) return;
    record('op');
    if (b.type !== 'p') {
      Object.assign(b, { type: 'p', checked: false });
      return changed({ id: b.id, at: 0 });
    }
    if (b.indent) {
      b.indent--;
      return changed({ id: b.id, at: 0 });
    }
    if (prev.type === 'divider') {
      blocks.splice(i - 1, 1);
      return changed({ id: b.id, at: 0 });
    }
    const at = prev.text.length;
    prev.text += b.text;
    blocks.splice(i, 1);
    changed({ id: prev.id, at });
  }

  function del(b) {
    const i = idx(b.id);
    const next = blocks[i + 1];
    if (!next) return;
    record('op');
    const at = b.text.length;
    if (next.type !== 'divider') b.text += next.text;
    blocks.splice(i + 1, 1);
    changed({ id: b.id, at });
  }

  function indentBy(b, d, at) {
    const n = level(b.indent + d);
    if (n === b.indent) return;
    record('op');
    b.indent = n;
    changed({ id: b.id, at });
  }

  // "/divider" or "---": a line across, and the writing goes on under it. An empty block becomes the line itself.
  function divider(b) {
    const i = idx(b.id);
    let at = i + 1;
    if (!b.text.trim()) Object.assign(b, { type: 'divider', text: '', checked: false, indent: 0 });
    else blocks.splice(at++, 0, mk('divider'));
    let next = blocks[at];
    if (!next || next.type === 'divider') blocks.splice(at, 0, (next = mk('p')));
    changed({ id: next.id, at: 0 });
  }

  function retype(b, type, at) {
    if (type === 'divider') return divider(b);
    Object.assign(b, { type, checked: type === 'todo' ? b.checked : false });
    if (type.startsWith('h') || type === 'code') b.indent = 0;
    changed({ id: b.id, at });
  }

  // Markdown's markers typed at a plain block's start make it that block.
  const MARKERS = [
    [/^(?:[-*] )?\[ ?\] $/, 'todo'],
    [/^[-*] $/, 'bullet'],
    [/^1[.)] $/, 'num'],
    [/^# $/, 'h1'],
    [/^## $/, 'h2'],
    [/^### $/, 'h3'],
    [/^> $/, 'quote'],
    [/^```$/, 'code'],
    [/^---$/, 'divider'],
  ];
  function marker(b, t) {
    const c = caretIn(t);
    if (!c || !c.collapsed) return false;
    const hit = MARKERS.find(([re]) => re.test(b.text.slice(0, c.start)));
    if (!hit) return false;
    // A step of its own: Ctrl+Z brings the typed marker back as text.
    record('op');
    b.text = b.text.slice(c.start);
    retype(b, hit[1], 0);
    return true;
  }

  // ---------- the "/" menu ----------
  const menuEl = document.createElement('div');
  menuEl.className = 'np-menu';
  menuEl.hidden = true;
  menuEl.setAttribute('role', 'listbox');
  document.body.appendChild(menuEl);
  let menu = null; // { id, from, q, items, active }

  function match(q) {
    if (!q) return COMMANDS.slice();
    const rank = (c) => {
      const name = c.name.toLowerCase();
      if (name.startsWith(q) || c.keys.some((k) => k === q)) return 0;
      if (c.keys.some((k) => k.startsWith(q)) || name.split(/[\s-]/).some((w) => w.startsWith(q))) return 1;
      return name.includes(q) ? 2 : 9;
    };
    return COMMANDS.map((c) => [rank(c), c]).filter(([r]) => r < 9).sort((a, b) => a[0] - b[0]).map(([, c]) => c);
  }

  function slash(b, t) {
    const c = caretIn(t);
    if (!c || !c.collapsed || b.type === 'code') return closeMenu();
    const m = /(?:^|\s)\/([^\s/]{0,20})$/.exec(b.text.slice(0, c.start));
    if (!m) return closeMenu();
    const q = m[1].toLowerCase();
    const items = match(q);
    // A long word nothing matches is text that has a "/" in it, not a command.
    if (!items.length && q.length > 6) return closeMenu();
    menu = { id: b.id, from: c.start - m[1].length - 1, q, items, active: menu && menu.id === b.id && menu.q === q ? menu.active : 0 };
    drawMenu();
    placeMenu(t);
  }

  function drawMenu() {
    menuEl.innerHTML = menu.items.length
      ? '<div class="np-lbl">Basic blocks</div>' +
        menu.items
          .map((c, i) => `<div class="np-item${i === menu.active ? ' on' : ''}" role="option" data-i="${i}"><span class="np-ic">${esc(c.icon)}</span><span class="np-nm"><b>${esc(c.name)}</b><small>${esc(c.hint)}</small></span></div>`)
          .join('')
      : '<div class="np-none">No results</div>';
    menuEl.hidden = false;
    menuEl.querySelector('.np-item.on')?.scrollIntoView({ block: 'nearest' });
  }

  function placeMenu(t) {
    const sel = getSelection();
    let r = sel.rangeCount ? sel.getRangeAt(0).getClientRects()[0] : null;
    if (!r || (!r.height && !r.top)) r = t.getBoundingClientRect();
    const w = menuEl.offsetWidth;
    const h = menuEl.offsetHeight;
    let y = r.bottom + 4;
    if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 4);
    menuEl.style.left = `${Math.max(8, Math.min(r.left, innerWidth - w - 8))}px`;
    menuEl.style.top = `${y}px`;
  }

  function closeMenu() {
    menu = null;
    menuEl.hidden = true;
  }

  function choose(cmd) {
    const m = menu;
    closeMenu();
    const b = m && blocks[idx(m.id)];
    if (!b) return;
    record('op');
    const t = textEl(b.id);
    const end = (t && caretIn(t)?.start) ?? m.from + 1 + m.q.length;
    b.text = b.text.slice(0, m.from) + b.text.slice(Math.max(end, m.from));
    retype(b, cmd.type, m.from);
  }

  // The keys the menu takes while it's open; false lets the block have them.
  function menuKey(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (menu.items.length) {
        menu.active = (menu.active + (e.key === 'ArrowDown' ? 1 : -1) + menu.items.length) % menu.items.length;
        drawMenu();
      }
      return true;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (!menu.items.length) {
        closeMenu();
        return false;
      }
      e.preventDefault();
      choose(menu.items[menu.active]);
      return true;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeMenu();
      return true;
    }
    return false;
  }

  // The menu's items take a click without taking the cursor from the block.
  menuEl.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const it = e.target.closest('.np-item');
    if (it && menu) choose(menu.items[Number(it.dataset.i)]);
  });
  menuEl.addEventListener('mousemove', (e) => {
    const it = e.target.closest('.np-item');
    if (!it || !menu || Number(it.dataset.i) === menu.active) return;
    menu.active = Number(it.dataset.i);
    menuEl.querySelectorAll('.np-item').forEach((x, i) => x.classList.toggle('on', i === menu.active));
  });

  // ---------- blocks selected: the second Ctrl+A, or a drag from one block into another ----------
  let allSel = false; // blocks are selected: those from sel[0] to sel[1]
  let sel = [0, 0];
  let firstA = null; // the block a first Ctrl+A selected the text of: the next one selects every block

  // The blocks as Markdown: what a copy of all of them gives, and what pasting it back makes into the same blocks. Those
  // from `from` on: the ones before only count, so a numbered list's items keep the numbers they show.
  function toText(list, from = 0) {
    const counts = [];
    return list
      .map((b0) => {
        // Kept blocks leave out a zero indent (plain), so it's read as 0 here.
        const b = { ...b0, indent: b0.indent || 0 };
        const pad = '  '.repeat(b.indent);
        if (b.type === 'num') {
          counts.length = b.indent + 1;
          counts[b.indent] = (counts[b.indent] || 0) + 1;
        } else counts.length = TYPES[b.type].list ? b.indent : 0;
        if (b.type === 'h1' || b.type === 'h2' || b.type === 'h3') return `${'#'.repeat(Number(b.type[1]))} ${b.text}`;
        if (b.type === 'todo') return `${pad}- [${b.checked ? 'x' : ' '}] ${b.text}`;
        if (b.type === 'bullet') return `${pad}- ${b.text}`;
        if (b.type === 'num') return `${pad}${counts[b.indent]}. ${b.text}`;
        if (b.type === 'quote') return b.text.split('\n').map((l) => `> ${l}`).join('\n');
        if (b.type === 'code') return `\`\`\`\n${b.text}\n\`\`\``;
        if (b.type === 'divider') return '---';
        return pad + b.text;
      })
      .slice(from)
      .join('\n');
  }

  function selectText(t) {
    const r = document.createRange();
    r.selectNodeContents(t);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  }
  // Selected blocks are their Markdown in a hidden box, all of it selected and holding the keys: Ctrl+C and Ctrl+X (the
  // keys or the Edit menu, a Mac's too) copy it as the browser copies any text, a paste lands there to take their place,
  // and the blocks only light up. A selection across the blocks themselves can't work: each block is its own editor,
  // and the browser hands the keys to the one the selection starts in.
  let part = null; // a text selection across blocks: { drag: true } while the pointer is down, then { a, z }
  const clip = document.createElement('textarea');
  clip.className = 'np-clip';
  clip.tabIndex = -1;
  clip.setAttribute('aria-label', 'Every note, selected');
  document.body.appendChild(clip);

  // The blocks from i to j, either way round, lit as selected.
  function mark(i, j) {
    const a = Math.min(i, j);
    const b = Math.max(i, j);
    [...ed.children].forEach((el, k) => el.classList.toggle('sel', k >= a && k <= b));
    return [a, b];
  }
  function selectBlocks(i, j) {
    closeMenu();
    firstA = null;
    allSel = true;
    sel = mark(i, j);
    ed.classList.add('blocksel');
    clip.value = toText(blocks.slice(0, sel[1] + 1), sel[0]);
    clip.focus({ preventScroll: true });
    clip.select();
  }
  const selectAll = () => selectBlocks(0, blocks.length - 1);
  function letGo() {
    document.querySelector('.np-lit')?.remove();
    allSel = false;
    ed.classList.remove('blocksel');
    ed.querySelectorAll('.nb.sel').forEach((el) => el.classList.remove('sel'));
    clip.value = '';
  }
  // The selected blocks go; the cursor waits where they were.
  function clearSel() {
    record('op');
    const [a, b] = sel;
    past[past.length - 1].focus = { i: a, at: 0 }; // undo puts the cursor at the first of them
    letGo();
    blocks.splice(a, b - a + 1);
    if (!blocks.length) blocks = [mk()];
    let at = blocks.slice(Math.min(a, blocks.length - 1)).find((x) => x.type !== 'divider') || [...blocks].reverse().find((x) => x.type !== 'divider');
    if (!at) blocks.push((at = mk()));
    changed({ id: at.id, at: 0 });
  }
  function shiftSel(d) {
    record('op');
    const [a, b] = sel;
    for (const x of blocks.slice(a, b + 1)) if (!/^(h\d|code|divider)$/.test(x.type)) x.indent = level(x.indent + d);
    render(null);
    later();
    selectBlocks(a, b);
  }

  // The place in a block's text nearest a point (the pointer may be on its marker or in the page's margin: the text's own
  // box clamps it), or the very start / end of the text when `edge` is -1 / 1.
  function caretNear(blockEl, x, y, edge) {
    const t = blockEl && blockEl.querySelector('.nb-text');
    if (!t) return null;
    if (edge) {
      const r = document.createRange();
      r.selectNodeContents(t);
      r.collapse(edge < 0);
      return r;
    }
    const q = t.getBoundingClientRect();
    return document.caretRangeFromPoint(Math.max(q.left + 1, Math.min(x, q.right - 1)), Math.max(q.top + 1, Math.min(y, q.bottom - 1)));
  }
  // The block whose row a height falls in (the first or last when it is above or below the page).
  function blockAtY(y) {
    const rows = [...ed.children].filter((n) => n.classList.contains('nb'));
    return rows.find((n) => y <= n.getBoundingClientRect().bottom) || rows[rows.length - 1];
  }

  // A drag that leaves its block for another selects text across the blocks, from the press to the pointer. The browser
  // can't do that between separate editors, so while it lasts the blocks' text isn't editable and the selection is set
  // here. A drag that began on a divider selects whole blocks, as Notion does. Back in the block it began in, a drag that never left is the text selection again. A press that wasn't on the
  // text itself (`inText` false: a marker, the margin, under the last block) selects as soon as the pointer is somewhere
  // else in the text, its own block too; one that never got there is a click, and `click` says what it does.
  // On Windows a press in the empty space under the last block (`start` past the blocks, no `press`) drags from there: up
  // over a block, the blocks from that one to the last are selected; let go without one, it's the click it was (`click`).
  function dragFrom(start, press, inText, click) {
    const under = start >= blocks.length;
    let at = start;
    let focus = null; // where the pointer's end of a selection across blocks is
    let want = null; // the selection as the browser holds it once set
    const hold = (force) => {
      const s = getSelection();
      const same = want && s.anchorNode === want[0] && s.anchorOffset === want[1] && s.focusNode === want[2] && s.focusOffset === want[3];
      if (same && !force) return;
      s.setBaseAndExtent(press.startContainer, press.startOffset, focus.node, focus.offset);
      want = [s.anchorNode, s.anchorOffset, s.focusNode, s.focusOffset];
    };
    // The browser's own drag goes on moving the selection; it is put back where the pointer is.
    const keep = () => part && part.drag && focus && hold();
    // Held above or below a page longer than its box, the page scrolls (unless the browser scrolls it already) and the
    // selection follows the line at its edge, as in any text box, never jumping to the start or end of the whole note.
    let last = null;
    let was = -1;
    const roll = setInterval(() => {
      const r = last && ed.getBoundingClientRect();
      const d = !r ? 0 : last.clientY < r.top ? last.clientY - r.top : last.clientY > r.bottom ? last.clientY - r.bottom : 0;
      if (!d) return;
      if (ed.scrollTop === was) ed.scrollTop += Math.sign(d) * Math.min(30, 4 + Math.abs(d) / 2);
      was = ed.scrollTop;
      move(last);
    }, 50);
    const move = (ev) => {
      if (!(ev.buttons & 1)) return up();
      last = ev;
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const over = el && el.closest && el.closest('.nb');
      let i = over && over.parentElement === ed ? idx(over.dataset.id) : -1;
      let out = false;
      const r = ed.getBoundingClientRect();
      const top = ed.scrollTop <= 0;
      const end = ed.scrollTop + ed.clientHeight >= ed.scrollHeight - 1;
      // A drag that began in text goes on by text: over a marker or the page's margin it is the nearest place in the
      // text, and above the first block or under the last it is the start of the first line or the end of the last.
      if (press) {
        const rows = [...ed.children].filter((n) => n.querySelector('.nb-text'));
        let edge = 0;
        let y = ev.clientY;
        let blk = over && over.parentElement === ed ? over : null;
        if (y < Math.max(r.top, ed.firstElementChild.getBoundingClientRect().top)) top ? ((edge = -1), (blk = rows[0])) : (blk = blockAtY((y = r.top + 2)));
        else if (y > Math.min(r.bottom, ed.lastElementChild.getBoundingClientRect().bottom)) end ? ((edge = 1), (blk = rows[rows.length - 1])) : (blk = blockAtY((y = r.bottom - 2)));
        else if (!blk || !blk.querySelector('.nb-text')) blk = blockAtY(y);
        let c = blk && caretNear(blk, ev.clientX, y, edge);
        const direct = !edge && y === ev.clientY && el && el.closest && el.closest('.nb-text') && document.caretRangeFromPoint(ev.clientX, ev.clientY);
        if (direct && textOf2(direct.startContainer)) c = direct;
        if (!c || !textOf2(c.startContainer)) return;
        i = idx(blk.dataset.id);
        if (ed.classList.contains('blocksel')) {
          ed.classList.remove('blocksel');
          mark(-1, -1);
        }
        if (!part) {
          if (i === start && (inText || (c.startContainer === press.startContainer && c.startOffset === press.startOffset))) return;
          part = { drag: true };
          setEditable(false);
        }
        focus = { node: c.startContainer, offset: c.startOffset };
        return hold(true);
      }
      if (i < 0) {
        out = true;
        // Under the last block (out under the page; on Windows in the page's space below it too): the last block, so a
        // quick drag down past it still takes it; or nothing, for a drag that began there.
        const foot = !MAC && ed.lastElementChild ? ed.lastElementChild.getBoundingClientRect().bottom : Infinity;
        if (ev.clientY < r.top) i = top ? 0 : idx(blockAtY(r.top + 2).dataset.id);
        else if (ev.clientY > r.bottom) i = under ? start : end ? blocks.length - 1 : idx(blockAtY(r.bottom - 2).dataset.id);
        else if (ev.clientY >= foot) i = under ? start : blocks.length - 1;
        else return;
      }
      if (part) {
        part = null;
        setEditable(true);
        getSelection().removeAllRanges();
      }
      at = i;
      if (at === start) {
        ed.classList.remove('blocksel');
        mark(-1, -1);
        return;
      }
      ed.classList.add('blocksel');
      mark(start, at);
    };
    const up = () => {
      clearInterval(roll);
      removeEventListener('mousemove', move, true);
      removeEventListener('mouseup', up, true);
      document.removeEventListener('selectionchange', keep);
      if (part && part.drag) return setTimeout(takePart, 0);
      if (at !== start) selectBlocks(Math.min(start, blocks.length - 1), at);
      else if (click) click();
    };
    addEventListener('mousemove', move, true);
    addEventListener('mouseup', up, true);
    document.addEventListener('selectionchange', keep);
  }

  // The text block a node is in, if any.
  const textOf2 = (n) => n && (n.nodeType === 1 ? n : n.parentElement)?.closest('.nb-text');
  const setEditable = (on) => ed.querySelectorAll('.nb-text').forEach((t) => t.setAttribute('contenteditable', on ? 'plaintext-only' : 'false'));
  // Editing comes back; what was selected stays selected (the next click or key moves it).
  function endPart() {
    if (!part) return;
    part = null;
    setEditable(true);
  }
  // The selection across blocks, as the block and place in its text where it starts (a) and ends (z).
  function takePart() {
    const s = getSelection();
    const r = s.rangeCount && s.getRangeAt(0);
    const at = (node, off) => {
      const t = textOf2(node);
      const b = t && blockOf(t);
      if (!b) return null;
      const pre = document.createRange();
      pre.selectNodeContents(t);
      pre.setEnd(node, off);
      return { id: b.id, at: Math.min(textOf(pre.cloneContents()).length, b.text.length) };
    };
    const a = r && !r.collapsed && at(r.startContainer, r.startOffset);
    const z = a && at(r.endContainer, r.endOffset);
    if (!z) {
      // Dragged back to where it began, or somewhere that isn't text: a cursor again.
      const b = r && blockOf(textOf2(r.startContainer));
      const c = b && at(r.startContainer, r.startOffset);
      endPart();
      return c ? place(textEl(c.id), c.at) : refocus();
    }
    part = { a, z };
  }
  // What the selection across blocks holds: its lines, from the first block's part to the last block's.
  function partText() {
    const ia = idx(part.a.id);
    const iz = idx(part.z.id);
    return blocks
      .slice(ia, iz + 1)
      .map((b, k) => (b.type === 'divider' ? '---' : b.text.slice(ia + k === ia ? part.a.at : 0, ia + k === iz ? part.z.at : undefined)))
      .join('\n');
  }
  // The selection goes, Notion's way: the first block keeps its text before it, takes what the last had after it, and
  // the blocks between go. What is typed goes at the join.
  function cutPart(ins) {
    const { a, z } = part;
    const ia = idx(a.id);
    const iz = idx(z.id);
    endPart();
    if (ia < 0 || iz < 0) return; // a block it was in is gone (a note pinned or deleted meanwhile)
    record('op');
    past[past.length - 1].focus = { i: ia, at: a.at }; // undo puts the cursor back where the selection began
    if (ins) lastKind = 'type'; // what's typed on after it is the same step: one ⌘Z brings the selection's text back
    const first = blocks[ia];
    first.text = first.text.slice(0, a.at) + ins + blocks[iz].text.slice(z.at);
    blocks.splice(ia + 1, iz - ia);
    changed({ id: first.id, at: a.at + ins.length });
  }
  document.addEventListener('copy', (e) => {
    if (!part || part.drag) return;
    e.preventDefault();
    e.clipboardData.setData('text/plain', partText());
  });
  document.addEventListener('paste', (e) => {
    if (!part || part.drag) return;
    e.preventDefault();
    const text = pastedText(e).replace(/\r\n?/g, '\n');
    if (!text) return; // an image, say: the selection stays
    const { a, z } = part;
    const ia = idx(a.id);
    const iz = idx(z.id);
    endPart();
    if (ia < 0 || iz < 0) return;
    record('op');
    past[past.length - 1].focus = { i: ia, at: a.at };
    const first = blocks[ia];
    const head = first.text.slice(0, a.at);
    first.text = head + blocks[iz].text.slice(z.at);
    blocks.splice(ia + 1, iz - ia);
    pasteInto(first, head, first.text.slice(a.at), text);
  });
  // A press anywhere gives the text its editing back before the click lands.
  addEventListener(
    'mousedown',
    (e) => {
      if (part && !part.drag && e.button === 0 && !(MAC && e.ctrlKey)) endPart();
    },
    true,
  );
  // The keys, with the blocks' text not editable: Copy is the browser's; Cut, delete and typing take the selection out;
  // the rest let go of it.
  document.addEventListener('keydown', (e) => {
    if (!part || part.drag || ['Control', 'Meta', 'Shift', 'Alt'].includes(e.key) || e.isComposing) return;
    const mod = MAC ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
    if (mod && !e.altKey) {
      // Only the keys that act on the selection are taken; the app's own shortcuts (⌘W, ⌘,) go on to the menu.
      if (!['KeyX', 'KeyA', 'KeyZ', 'KeyY'].includes(e.code)) return;
      e.preventDefault();
      if (e.code === 'KeyX') {
        document.execCommand('copy');
        return cutPart('');
      }
      const { z } = part;
      endPart();
      if (e.code === 'KeyA') return selectAll();
      if (e.code === 'KeyZ' || e.code === 'KeyY') return e.code === 'KeyY' || e.shiftKey ? redo() : undo();
      return place(textEl(z.id), z.at);
    }
    if (e.ctrlKey || e.metaKey) return; // a shortcut of the app's (⌃⇧G, ⌘⌥T, ⌃A), not typing
    e.preventDefault();
    if (e.key === 'Backspace' || e.key === 'Delete') return cutPart('');
    if (e.key.length === 1) return cutPart(e.key);
    if (e.key === 'Escape') e.stopPropagation();
    const up = e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'PageUp';
    const c = up ? part.a : part.z;
    endPart();
    if (e.key !== 'Escape') place(textEl(c.id), c.at);
  });

  // The keys while blocks are selected. Anything not taken lets go of them and goes back to writing: up and left at
  // the first of them, the rest at the end of the last; a letter typed then isn't written over them.
  clip.addEventListener('keydown', (e) => {
    if (!allSel || ['Control', 'Meta', 'Shift', 'Alt'].includes(e.key)) return;
    const mod = MAC ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
    if (mod && !e.altKey) {
      if (e.code === 'KeyA' || e.code === 'KeyC' || e.code === 'KeyX' || e.code === 'KeyV') return;
      if (e.code === 'KeyZ' || e.code === 'KeyY') {
        e.preventDefault();
        letGo();
        return e.code === 'KeyY' || e.shiftKey ? redo() : undo();
      }
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      return clearSel();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      return shiftSel(e.shiftKey ? -1 : 1);
    }
    e.preventDefault();
    if (e.key === 'Escape') e.stopPropagation();
    letGo();
    if (e.key === 'Escape') return refocus();
    const text = blocks.slice(sel[0], sel[1] + 1).filter((x) => x.type !== 'divider');
    const up = e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'PageUp';
    const b = up ? text[0] : text[text.length - 1];
    if (b) place(textEl(b.id), up ? 0 : b.text.length);
    else refocus();
  });
  // Cut: the browser copies the box's text, then the selected blocks go.
  clip.addEventListener('cut', () => setTimeout(() => allSel && clearSel(), 0));
  // Pasted over selected blocks, the lines take their place.
  clip.addEventListener('paste', (e) => {
    e.preventDefault();
    if (!allSel) return;
    const made = fromText((e.clipboardData?.getData('text/plain') || '').replace(/\r\n?/g, '\n'));
    record('op');
    const [a, b] = sel;
    letGo();
    blocks.splice(a, b - a + 1, ...made);
    if (!blocks.length) blocks = [mk()];
    const last = made.length ? made[made.length - 1] : blocks[Math.min(a, blocks.length - 1)];
    changed(last.type === 'divider' ? null : { id: last.id, at: last.text.length });
  });
  let rlit = null; // the lit blocks while a right click is on them
  clip.addEventListener('blur', () => !rlit && letGo());

  // ---------- typing ----------
  ed.addEventListener('beforeinput', (e) => {
    if (e.target.closest && e.target.closest('.nb-text')) record('type');
  });

  ed.addEventListener('input', (e) => {
    const t = e.target.closest && e.target.closest('.nb-text');
    const b = blockOf(t);
    if (!b) return;
    if (t.querySelector('br, div, p')) {
      // A <br> or a <div> slipped in (an emptied block keeps a <br>): back to plain text, the cursor where it was.
      const at = caretIn(t)?.start ?? 0;
      const text = read(t);
      paint(t, text, b.type);
      place(t, Math.min(at, text.length));
    }
    b.text = read(t);
    if (!e.isComposing) relink(t, b);
    firstA = null;
    t.classList.toggle('is-empty', !b.text);
    if (b.type === 'p' && marker(b, t)) return;
    slash(b, t);
    liveName();
    later();
  });

  ed.addEventListener('keydown', (e) => {
    const t = e.target.closest && e.target.closest('.nb-text');
    const b = blockOf(t);
    if (!b) return;
    if (menu && menuKey(e)) return;
    const mod = MAC ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
    // Ctrl+A once: this block's text; again: every block.
    if (mod && !e.altKey && !e.shiftKey && e.code === 'KeyA') {
      e.preventDefault();
      closeMenu();
      // Its whole text selected already (⌘A, then ⌘C; a triple click; a drag over all of it): every block.
      const all = b.text && caretIn(t);
      if (firstA === b.id || (all && all.start === 0 && all.end >= b.text.length)) return selectAll();
      firstA = b.id;
      return selectText(t);
    }
    if (!['Control', 'Meta', 'Shift', 'Alt'].includes(e.key)) firstA = null;
    if (mod && !e.altKey && e.code === 'KeyZ') {
      e.preventDefault();
      return e.shiftKey ? redo() : undo();
    }
    if (mod && !e.altKey && !e.shiftKey && e.code === 'KeyY') {
      e.preventDefault();
      return redo();
    }
    if (mod && !e.altKey && !e.shiftKey && e.code === 'KeyK') {
      if (!lkHere()) return;
      e.preventDefault();
      lkAt = null;
      return void askLink();
    }
    if (e.isComposing) return;
    const c = caretIn(t) || { start: 0, end: 0, collapsed: true };
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (e.shiftKey || (b.type === 'code' && !mod)) {
          record('type');
          return document.execCommand('insertLineBreak');
        }
        return enter(b, c);
      case 'Backspace':
        if (c.collapsed && c.start === 0) {
          e.preventDefault();
          backspace(b);
        }
        return;
      case 'Delete':
        if (c.collapsed && c.start === b.text.length) {
          e.preventDefault();
          del(b);
        }
        return;
      case 'Tab':
        e.preventDefault();
        if (b.type !== 'code') return indentBy(b, e.shiftKey ? -1 : 1, c.start);
        if (!e.shiftKey) {
          record('type');
          document.execCommand('insertText', false, '  ');
        }
        return;
      case 'ArrowUp':
      case 'ArrowDown': {
        if (e.shiftKey || mod || e.altKey) return;
        const dir = e.key === 'ArrowUp' ? -1 : 1;
        const at = edge(t, dir);
        if (at.at && moveTo(b, dir, at.x)) e.preventDefault();
        return;
      }
      case 'ArrowLeft':
        if (!e.shiftKey && c.collapsed && c.start === 0 && moveTo(b, -1, null)) e.preventDefault();
        return;
      case 'ArrowRight':
        if (!e.shiftKey && c.collapsed && c.start === b.text.length && moveTo(b, 1, null)) e.preventDefault();
        return;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        t.blur();
        return;
    }
  });

  // The text pasted into block b, between its head and its tail.
  function pasteInto(b, head, tail, text) {
    if (b.type === 'code' || !text.includes('\n')) {
      b.text = head + text + tail;
      return changed({ id: b.id, at: head.length + text.length });
    }
    const made = fromText(text);
    const first = made.shift();
    if (!head && b.type === 'p' && first.type !== 'divider') Object.assign(b, { type: first.type, checked: first.checked, indent: first.indent });
    b.text = head + (first.type === 'divider' ? '' : first.text);
    if (first.type === 'divider') made.unshift(first);
    blocks.splice(idx(b.id) + 1, 0, ...made);
    let last = made.length ? made[made.length - 1] : b;
    if (last.type === 'divider') blocks.splice(idx(last.id) + 1, 0, (last = mk('p')));
    const at = last.text.length;
    last.text += tail;
    changed({ id: last.id, at });
  }
  // Pasted lines become blocks of their own (Markdown's markers count); one line goes in where the cursor is.
  ed.addEventListener('paste', (e) => {
    const t = e.target.closest && e.target.closest('.nb-text');
    const b = blockOf(t);
    if (!b) return;
    e.preventDefault();
    const text = pastedText(e, b.type === 'code').replace(/\r\n?/g, '\n');
    if (!text) return;
    const c = caretIn(t) || { start: b.text.length, end: b.text.length };
    // An address pasted over selected words makes them a link, as Notion does.
    const url = !c.collapsed && b.type !== 'code' && !/\s/.test(text.trim()) && /^(https?:\/\/|www\.|mailto:)/i.test(text.trim()) ? addressOf(text) : null;
    const words = b.text.slice(c.start, c.end);
    if (url && !/[\[\]\n]/.test(words) && !scan(b.text).some((k) => k.s < c.end && k.e > c.start)) {
      record('op');
      const made = `[${words}](${url})`;
      b.text = b.text.slice(0, c.start) + made + b.text.slice(c.end);
      return changed({ id: b.id, at: c.start + made.length });
    }
    record('op');
    pasteInto(b, b.text.slice(0, c.start), b.text.slice(c.end), text);
  });
  // ---------- links: opening, the box that names one ----------
  // A named link shows its brackets and address while the cursor is in it (and only then).
  document.addEventListener('selectionchange', () => {
    const s = getSelection();
    const n = s.rangeCount && s.isCollapsed ? s.anchorNode : null;
    const w = n && (n.nodeType === 1 ? n : n.parentElement)?.closest('.np-ed .lk-m');
    for (const o of ed.querySelectorAll('.lk-m.open')) if (o !== w) o.classList.remove('open');
    if (w) w.classList.add('open');
    lkWatch();
  });
  addEventListener('compositionend', (e) => {
    const t = e.target.closest && e.target.closest('.np-ed .nb-text');
    const b = t && blockOf(t);
    if (b) relink(t, b);
  });
  // A click opens a link with Cmd (Ctrl on Windows) held, or with none when the block wasn't being written in: a click
  // into the text of the block being written in puts the cursor there instead.
  let lkDown = null;
  let lkPress = false;
  ed.addEventListener(
    'mousedown',
    (e) => {
      lkPress = e.button === 0;
      const a = e.target.closest && e.target.closest('.lk');
      lkDown = a && e.button === 0 ? { a, x: e.clientX, y: e.clientY, was: a.closest('.nb-text') === document.activeElement } : null;
    },
    true,
  );
  addEventListener('mouseup', (e) => {
    lkPress = false;
    if (!lkBox.contains(e.target)) lkWatch();
  });
  ed.addEventListener('click', (e) => {
    const d = lkDown;
    lkDown = null;
    const a = e.target.closest && e.target.closest('.lk');
    if (!a || !d || d.a !== a || (MAC && e.ctrlKey) || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) return;
    const mod = MAC ? e.metaKey : e.ctrlKey;
    if (!mod && (d.was || !getSelection().isCollapsed)) return;
    e.preventDefault();
    openLink(a.dataset.href);
  });
  // A copy inside one block gives its Markdown: a link taken whole goes with its address.
  ed.addEventListener('copy', (e) => {
    if (part) return;
    const t = e.target.closest && e.target.closest('.nb-text');
    const b = blockOf(t);
    const c = b && caretIn(t);
    if (!c || c.collapsed || !t.querySelector('.lk')) return;
    e.preventDefault();
    e.clipboardData.setData('text/plain', copyText(b.text, c.start, c.end));
  });

  // The box under a link or a selection: on a link, its address with Edit, Open and Unlink; on selected words, "Link".
  // Cmd+K (Ctrl+K) on selected words, or in a link, opens the address to type.
  const lkBox = document.createElement('div');
  lkBox.className = 'lk-pop';
  lkBox.hidden = true;
  document.body.appendChild(lkBox);
  let lkAt = null; // what the box is for: { id, start, end, link } as places in a block's text
  const lkHere = () => {
    const s = getSelection();
    if (!s.rangeCount || !ed.contains(s.anchorNode) || !ed.contains(s.focusNode)) return null;
    const r = s.getRangeAt(0);
    const t = textOf2(r.startContainer);
    const b = t && t === textOf2(r.endContainer) && blockOf(t);
    const c = b && b.type !== 'code' && caretIn(t);
    if (!c) return null;
    const link = scan(b.text).find((k) => (c.collapsed ? c.start >= k.s && c.start <= k.e : c.start >= (k.md ? k.ts : k.s) && c.end <= (k.md ? k.te : k.e)));
    const text = b.text.slice(c.start, c.end);
    if (!link && (c.collapsed || /[\[\]\n]/.test(text) || scan(b.text).some((k) => k.s < c.end && k.e > c.start))) return null;
    if (link && !link.md && c.collapsed) return null;
    const el = link ? t.querySelector(`.lk:nth-of-type(1)`) && [...t.querySelectorAll('.lk')].find((x) => x.dataset.href === link.href && x.textContent.includes(b.text.slice(link.md ? link.ts : link.s, link.md ? link.te : link.e))) : null;
    const rect = (el || r).getBoundingClientRect();
    return { id: b.id, start: c.start, end: c.end, link, rect };
  };
  function lkClose() {
    lkBox.hidden = true;
    lkBox.textContent = '';
    lkBox.dataset.html = '';
    lkAt = null;
  }
  function lkPlace(rect) {
    lkBox.style.left = '0px';
    lkBox.style.top = '0px';
    const w = lkBox.offsetWidth;
    const h = lkBox.offsetHeight;
    const below = rect.bottom + 6 + h < innerHeight || rect.top - h - 6 < 4;
    lkBox.style.left = `${Math.max(4, Math.min(rect.left, innerWidth - w - 4))}px`;
    lkBox.style.top = `${Math.max(4, below ? rect.bottom + 6 : rect.top - h - 6)}px`;
  }
  const lkShort = (u) => u.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
  // The box in the state the selection calls for, unless a press or the address box is in the way.
  function lkWatch() {
    if (lkPress || part || lkBox.querySelector('input')) return;
    const h = lkHere();
    if (!h) return lkClose();
    lkAt = h;
    let html;
    if (h.link && h.link.md) {
      html = `<a class="lk-go" title="${esc(h.link.href)}">${esc(lkShort(h.link.href))}</a><button type="button" data-a="edit">Edit</button><button type="button" data-a="open">Open</button><button type="button" data-a="unlink">Unlink</button>`;
    } else if (!h.link) {
      html = `<button type="button" data-a="edit">Link <kbd>${MAC ? '\u2318K' : 'Ctrl+K'}</kbd></button>`;
    } else return lkClose();
    if (lkBox.hidden || lkBox.dataset.html !== html) {
      lkBox.innerHTML = html;
      lkBox.dataset.html = html;
    }
    lkBox.hidden = false;
    lkPlace(h.rect);
  }
  // The address to type for the selection (or the link's, to change).
  function askLink() {
    const h = lkAt || lkHere();
    if (!h) return false;
    lkAt = h;
    lkBox.dataset.html = '';
    lkBox.innerHTML = '<input type="text" spellcheck="false" autocomplete="off" placeholder="Paste or type a link" aria-label="Link address"><button type="button" data-a="ok">Add</button>' + (h.link ? '<button type="button" data-a="unlink">Unlink</button>' : '');
    const input = lkBox.querySelector('input');
    input.value = h.link ? h.link.url || h.link.href : '';
    lkBox.hidden = false;
    lkPlace(h.rect);
    input.focus();
    input.select();
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        setLink(input.value);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        giveBack();
      }
    });
    input.addEventListener('input', () => input.classList.remove('bad'));
    return true;
  }
  // The cursor back where the box found it.
  function giveBack() {
    const h = lkAt;
    lkClose();
    const b = h && blocks[idx(h.id)];
    if (b && textEl(b.id)) {
      place(textEl(b.id), h.start);
      if (h.end > h.start) {
        const t = textEl(b.id);
        const s = getSelection();
        const r = s.rangeCount && s.getRangeAt(0);
        if (r) {
          const walker = document.createTreeWalker(t, NodeFilter.SHOW_TEXT);
          let pos = 0;
          let n;
          while ((n = walker.nextNode())) {
            if (h.end <= pos + n.length) {
              r.setEnd(n, h.end - pos);
              break;
            }
            pos += n.length;
          }
        }
      }
    }
  }
  // The address given: the selected words become a link, a link's address changes, an empty address unlinks it.
  function setLink(raw) {
    const h = lkAt;
    const b = h && blocks[idx(h.id)];
    if (!b) return lkClose();
    const url = raw.trim() ? addressOf(raw) : '';
    if (url === null) return lkBox.querySelector('input')?.classList.add('bad');
    const k = h.link;
    const text = k ? (k.md ? b.text.slice(k.ts, k.te) : b.text.slice(k.s, k.e)) : b.text.slice(h.start, h.end);
    const from = k ? k.s : h.start;
    const to = k ? k.e : h.end;
    if (!k && !url) return giveBack();
    if (k && !k.md) return giveBack();
    const made = url ? `[${text}](${url})` : text;
    if (made === b.text.slice(from, to)) return giveBack();
    record('op');
    past[past.length - 1].focus = { i: idx(b.id), at: from };
    b.text = b.text.slice(0, from) + made + b.text.slice(to);
    lkClose();
    changed({ id: b.id, at: from + made.length });
  }
  lkBox.addEventListener('mousedown', (e) => {
    if (!e.target.closest('input')) e.preventDefault(); // the buttons leave the selection as it is
  });
  lkBox.addEventListener('click', (e) => {
    const x = e.target.closest('[data-a]') || (e.target.closest('.lk-go') && { dataset: { a: 'open' } });
    if (!x || !lkAt) return;
    const a = x.dataset.a;
    if (a === 'edit') askLink();
    else if (a === 'ok') setLink(lkBox.querySelector('input').value);
    else if (a === 'unlink') {
      lkAt.link = lkAt.link || null;
      setLink('');
    } else if (a === 'open') openLink(lkAt.link.href);
  });
  addEventListener('mousedown', (e) => {
    if (!lkBox.hidden && !lkBox.contains(e.target) && lkBox.querySelector('input')) giveBack();
  }, true);
  ed.addEventListener('scroll', lkClose);
  addEventListener('resize', lkClose);

  ed.addEventListener('drop', (e) => {
    if ((e.dataTransfer?.getData('text/plain') || '').includes('\n')) e.preventDefault();
  });

  // A tick on a to-do; a click under the last block puts the cursor there, in a fresh line if the last isn't empty text.
  ed.addEventListener('mousedown', (e) => {
    // A right click leaves what is selected as it is (blocks lit, or text): the menu's Copy needs it.
    if (e.button === 2 || (MAC && e.ctrlKey && e.button === 0)) {
      // (A Mac's control-click is a right click.) The system focuses the block and selects a word under a right click, which would let go of lit blocks: they are
      // remembered, and lit again when the menu opens.
      rlit = allSel ? sel.slice() : null;
      return;
    }
    rlit = null;
    letGo();
    firstA = null;
    // A to-do's box ticks on a click (the press let go where it began); a drag from it selects, as from a marker. The
    // cursor stays where it was, or waits at the end of the to-do, so ⌘Z takes the tick back.
    const cb = e.target.closest('.nb-cb');
    let tick = null;
    if (cb) {
      const b = blockOf(cb);
      const t = document.activeElement && document.activeElement.closest && document.activeElement.closest('.np-ed .nb-text');
      const c = t && caretIn(t);
      const back = c ? { id: blockOf(t).id, at: c.start } : { id: b.id, at: b.text.length };
      tick = () => {
        record('op');
        b.checked = !b.checked;
        changed(back);
      };
      if (e.button !== 0) return e.preventDefault();
      // A second quick click ticks again (untick), as a shift-click does: no drag starts from those.
      if (e.shiftKey || e.detail > 1) {
        e.preventDefault();
        return tick();
      }
    }
    // A shift-click in another block than the one the selection starts in takes it there, across the blocks between.
    if (e.button === 0 && e.shiftKey && e.detail < 2) {
      const s = getSelection();
      const home = s.rangeCount && textOf2(s.anchorNode);
      const row = e.target.closest('.nb') || (e.target === ed && blockAtY(e.clientY));
      const c = row && row.parentElement === ed && (textOf2(e.target) ? document.caretRangeFromPoint(e.clientX, e.clientY) : caretNear(row, e.clientX, e.clientY, 0));
      const there = c && textOf2(c.startContainer);
      if (home && ed.contains(home) && there && there !== home) {
        e.preventDefault();
        part = { drag: true };
        setEditable(false);
        s.setBaseAndExtent(s.anchorNode, s.anchorOffset, c.startContainer, c.startOffset);
        return takePart();
      }
    }
    // Only a first press starts a block drag: a double or triple click (a word, a line) and a shift-click are the
    // browser's own selecting, left alone.
    const from = e.button === 0 && !e.shiftKey && e.detail < 2 && (e.target.closest('.nb') || (e.target === ed && blockAtY(e.clientY)));
    // A press under the last block is a click there (below), and a drag from it goes up from the end of the last line.
    const lastEl = ed.lastElementChild;
    const below = e.target === ed && lastEl && e.clientY >= lastEl.getBoundingClientRect().bottom;
    if (from && from.parentElement === ed && !below) {
      // Where in the text the press is, for a drag that goes on into other blocks (a press on a marker or in the margin is
      // the nearest place in the text).
      const inText = !!textOf2(e.target);
      let press = inText ? document.caretRangeFromPoint(e.clientX, e.clientY) : caretNear(from, e.clientX, e.clientY, 0);
      if (!(press && textOf2(press.startContainer))) press = null;
      // A press on text already selected would start dragging that text away (the browser's drag and drop): what was
      // selected goes first, so the press always starts a new selection, across blocks too.
      if (!getSelection().isCollapsed) getSelection().removeAllRanges();
      // On a marker or in the margin the browser would select the marker or let go of the cursor: a click there puts the
      // cursor at that place in the text instead.
      const click = tick || (press && !inText && (() => {
        textOf2(press.startContainer).focus({ preventScroll: true });
        getSelection().collapse(press.startContainer, press.startOffset);
      }));
      if (click) e.preventDefault();
      dragFrom(idx(from.dataset.id), press, inText, click);
    }
    if (e.target !== ed || !below) return;
    e.preventDefault();
    // A click there puts the cursor in a fresh line under the last (in the last, when it's an empty line already); a drag
    // from there selects up from the end of the last line, and adds no line.
    const open = () => {
      const last = blocks[blocks.length - 1];
      if (last.type === 'p' && !last.text) return place(textEl(last.id), 0);
      record('op');
      const n = mk('p');
      blocks.push(n);
      changed({ id: n.id, at: 0 });
    };
    // On Windows a drag up from under the last block selects the blocks it goes over (no fresh line made for it); a
    // click there puts the cursor under them once it's let go.
    if (!MAC) {
      if (e.button === 0 && !e.shiftKey) dragFrom(blocks.length, null, false, open);
      else open();
      return;
    }
    const end = [...ed.children].reverse().find((n) => n.querySelector('.nb-text'));
    if (end) dragFrom(idx(end.dataset.id), caretNear(end, 0, 0, 1), false, open);
    else open();
  });

  // A right click on lit blocks: Copy (the hidden box holds them as Markdown). On text, the system's own menu (Copy,
  // Paste, Select All) opens: nothing here takes it.
  ed.addEventListener('contextmenu', (e) => {
    // The system selected the word under the pointer: that is what Copy and the keys now mean.
    if (part && !part.drag) takePart();
    if (rlit) selectBlocks(rlit[0], rlit[1]);
    rlit = null;
    if (!allSel) return;
    e.preventDefault();
    e.stopPropagation();
    document.querySelector('.pn-ctx')?.remove();
    const m = document.createElement('div');
    m.className = 'pn-ctx np-lit';
    m.innerHTML = '<button type="button" data-ctx="copy">Copy</button>';
    document.body.appendChild(m);
    m.style.left = `${Math.max(4, Math.min(e.clientX, innerWidth - m.offsetWidth - 4))}px`;
    m.style.top = `${Math.max(4, Math.min(e.clientY, innerHeight - m.offsetHeight - 4))}px`;
    m.addEventListener('mousedown', (ev) => ev.preventDefault());
    m.onclick = () => {
      m.remove();
      clip.focus({ preventScroll: true });
      clip.select();
      document.execCommand('copy');
    };
    const off = (ev) => {
      if (ev.target.closest && ev.target.closest('.pn-ctx')) return;
      m.remove();
      removeEventListener('mousedown', off, true);
    };
    addEventListener('mousedown', off, true);
  });

  ed.addEventListener('focusout', () => {
    setTimeout(() => {
      if (!part && !ed.contains(document.activeElement) && document.activeElement !== clip) {
        closeMenu();
        letGo();
        firstA = null;
        save();
      }
    }, 0);
  });
  ed.addEventListener('scroll', closeMenu);
  addEventListener('resize', closeMenu);
  addEventListener('pagehide', save);

  // Where the cursor was last, to bring it back there.
  let lastFocus = null;
  document.addEventListener('selectionchange', () => {
    const t = document.activeElement && document.activeElement.closest && document.activeElement.closest('.np-ed .nb-text');
    const b = t && blockOf(t);
    if (b) lastFocus = { id: b.id, at: caretIn(t)?.start || 0 };
  });
  function refocus() {
    const b = (lastFocus && blocks[idx(lastFocus.id)]) || [...blocks].reverse().find((x) => x.type !== 'divider');
    if (b) place(textEl(b.id), lastFocus && lastFocus.id === b.id ? Math.min(lastFocus.at, b.text.length) : b.text.length);
  }

  // ---------- the page in a window of its own ----------
  const pop = document.createElement('button');
  pop.type = 'button';
  pop.className = 'np-pop';
  pop.title = 'Open in a window';
  pop.setAttribute('aria-label', 'Open notes in a window');
  pop.textContent = '⤢';
  panel.querySelector(':scope > header')?.appendChild(pop);
  pop.addEventListener('click', (e) => {
    e.stopPropagation();
    if (NATIVE) return out.has(pinned) ? dock() : undock();
    return win && !win.hidden ? dock() : undock();
  });
  // The eye: hide the panel's note from AI, or show it again (the note's own window has the same one).
  const aiBtn = document.createElement('button');
  aiBtn.type = 'button';
  aiBtn.className = 'np-pop np-aib';
  panel.querySelector(':scope > header')?.insertBefore(aiBtn, pop);
  aiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const n = pinnedNote();
    if (n) setAiHidden(n.id, !n.aiHidden);
  });
  // A tooltip in the app's own look (style.css #tip) for whatever has a `data-tip` (the eyes, a hidden note's mark on the
  // board): under the pointer after a moment, at once on keyboard focus, and anew right after a click. It is the page's,
  // fixed, so no panel or window edge cuts it; it moves to stay inside the page. "A · B" is two lines: what is, what a click does.
  const tipEl = document.createElement('div');
  tipEl.className = 'np-tip';
  tipEl.setAttribute('role', 'tooltip');
  tipEl.hidden = true;
  document.body.appendChild(tipEl);
  let tipAt = null; // the control it's showing for
  let tipWait = null; // the control it's about to show for
  let tipTimer = 0;
  function showTip(el) {
    clearTimeout(tipTimer);
    tipWait = null;
    if (!el.isConnected || !el.dataset.tip) return hideTip();
    const [h, r] = el.dataset.tip.split(' · ');
    tipEl.innerHTML = `<div class="h">${esc(h)}</div>${r ? `<div class="r">${esc(r)}</div>` : ''}`;
    tipEl.hidden = false;
    tipAt = el;
    const b = el.getBoundingClientRect();
    const w = tipEl.offsetWidth;
    const hh = tipEl.offsetHeight;
    const y = b.bottom + 6 + hh > innerHeight - 6 ? b.top - 6 - hh : b.bottom + 6;
    tipEl.style.left = `${Math.round(Math.max(6, Math.min(b.left + b.width / 2 - w / 2, innerWidth - w - 6)))}px`;
    tipEl.style.top = `${Math.round(Math.max(6, y))}px`;
  }
  function hideTip() {
    clearTimeout(tipTimer);
    tipWait = tipAt = null;
    tipEl.hidden = true;
  }
  addEventListener('mouseover', (e) => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (el && (el === tipAt || el === tipWait)) return;
    hideTip();
    if (!el) return;
    tipWait = el;
    tipTimer = setTimeout(() => showTip(el), 300);
  });
  addEventListener('mouseout', (e) => !e.relatedTarget && hideTip());
  addEventListener('focusin', (e) => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (el && el.matches(':focus-visible')) showTip(el);
  });
  addEventListener('focusout', (e) => e.target === tipAt && !tipAt.matches(':hover') && hideTip());
  addEventListener('scroll', hideTip, true);
  addEventListener('blur', hideTip);

  // The eye(s) as the note they belong to is: crossed out and lit while the note is hidden from AI, and saying so in words
  // (its tooltip, and VoiceOver's label).
  function paintAi() {
    const set = (b, n) => {
      if (!b || !n) return;
      const on = !!n.aiHidden;
      // The eye only means something while AI has access; a hidden note keeps it so it can be shown again.
      b.hidden = AI.mode === 'off' && !on;
      if (b.dataset.ai === String(on)) return;
      b.dataset.ai = String(on);
      b.classList.toggle('on', on);
      b.removeAttribute('aria-pressed');
      b.removeAttribute('title');
      b.dataset.tip = on ? AI_TIP_HIDDEN : AI_TIP_SEEN;
      b.setAttribute('aria-label', b.dataset.tip);
      b.innerHTML = on ? EYE_OFF : EYE;
      if (tipAt === b || b.matches(':hover')) showTip(b);
    };
    if (WINDOW) set(panel.querySelector('.npw-ai'), cur);
    else {
      set(aiBtn, pinnedNote());
      if (win) set(win.querySelector('.npw-ai'), cur);
    }
  }
  // Hide or show a note from AI. Only here (the user's click): written at once, so the app's own copy says the same before
  // any AI asks again; a note's window is told too. In a note's window the dashboard's page does it.
  async function setAiHidden(id, on) {
    if (WINDOW) {
      // The eye changes at once; the dashboard's answer sets it as it really is.
      const was = !!cur.aiHidden;
      aiHiddenSet(!!on);
      const r = await post({ type: 'aiHide', on: !!on });
      aiHiddenSet(r && 'hidden' in r ? r.hidden : was);
      return r;
    }
    await isLoaded;
    const n = notes.find((x) => x.id === id);
    if (!n) return { error: 'not_found' };
    if (on) n.aiHidden = true;
    else delete n.aiHidden;
    paintAi();
    const ok = await write();
    toApp({ type: 'noteAiHidden', id, on: !!on });
    paintAi();
    drawBoard();
    return ok ? { ok: true, hidden: !!on } : { error: unsaved || 'not saved' };
  }
  // A note's window is told its note was hidden or shown (from the board, the panel or its own eye).
  function aiHiddenSet(on) {
    if (!cur) return;
    if (on) cur.aiHidden = true;
    else delete cur.aiHidden;
    paintAi();
  }

  // ---------- notes and AI: the chip on the board, its popover, the first-time hint ----------
  // The level lives in the app (NotesAI.swift): this page only asks, and the app asks the user natively before it goes up.
  // Going down is at once. The popover is the board's door; Settings > Privacy is a second one with the same code path.
  const G = { gear: '', sparkle: '', sparkleF: '', check: '', dash: '', lock: '', term: '', desk: '', eye: '' };
  const cg = (g) => `<span class="nai-cg" aria-hidden="true">${G[g]}</span>`;
  const MACHINE = MAC ? 'Mac' : 'PC';
  const CHIP = { off: 'AI off', read: 'AI can read', write: 'AI can edit' };
  const LONG = { off: "AI can't see your notes", read: 'AI can read your notes', write: 'AI can read and edit your notes' };
  const SAY = { off: "AI can't see your notes now.", read: 'AI can read your notes now.', write: 'AI can read and edit your notes now.' };
  const CAN = [['Read your notes', 'read'], ['Add to a note or change it', 'write'], ['Make a new note', 'write'], ['Pin a note or open it on your screen', 'write']];
  const PILL = { off: ['Off', ''], read: ['Can read', 'read'], write: ['Can edit', 'write'] };
  const TOOL_NAMES = [['claude', 'Claude Code'], ['codex', 'Codex'], ['agy', 'Antigravity']];
  const aiTime = (t) => new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  let popOpen = false;
  let asked = null; // { by, need, at }: an AI reached for the notes while it wasn't allowed (shown once, in the popover)
  let dotOn = false;
  let dotTimer = 0;
  let say = ''; // the popover's status line
  let busy = null; // the answer clicked, waiting for the app
  let connecting = false;
  let deskAt = 0; // when Claude Desktop was connected from here
  let slow = 0;

  // The app's answer, or its push (Notes.aiMode): every place that shows the level follows.
  function aiApply(st) {
    if (!st || !['off', 'read', 'write'].includes(st.mode)) return;
    const was = AI.mode;
    AI.mode = st.mode;
    if ('ready' in st) AI.ready = !!st.ready;
    if (st.tools && typeof st.tools === 'object') AI.tools = st.tools;
    if ('outsideWriteNeedsType' in st) AI.outsideNeedsType = !!st.outsideWriteNeedsType;
    AI.known = true;
    paintAi();
    if (was !== AI.mode && asked && (asked.need === 'read' ? AI.mode !== 'off' : AI.mode === 'write')) askedClear();
    if (AI.mode !== 'off') hintDone();
    paintChip();
    paintHint();
    if (!WINDOW) {
      drawBoard();
      if (popOpen) {
        paintPop(was);
        document.querySelector('#nai-pop .nai-can')?.classList.toggle('anim', was !== AI.mode);
      }
      if (was === 'off' && AI.mode !== 'off' && chip) {
        chip.classList.remove('ignite');
        void chip.offsetWidth;
        chip.classList.add('ignite');
      }
    }
    if (was !== AI.mode) window.dispatchEvent(new Event('notesaichange'));
  }
  async function setAiMode(m) {
    if (!NA || !['off', 'read', 'write'].includes(m)) return null;
    const r = await NA.postMessage({ type: 'mode', mode: m }).catch(() => null);
    if (r) aiApply(r);
    return r;
  }

  let chip = null;
  let naPop = null;
  function paintChip() {
    if (!chip) return;
    chip.dataset.mode = AI.mode;
    chip.querySelector('.nai-t').textContent = CHIP[AI.mode];
    chip.querySelector('.nai-dot').hidden = !dotOn;
    chip.setAttribute('aria-label', `Notes and AI: ${LONG[AI.mode]}${dotOn && asked ? `. ${asked.by} asked for your notes` : ''}`);
    chip.dataset.tip = dotOn && asked ? `Notes and AI · ${asked.by} asked for your notes at ${aiTime(asked.at)}` : 'Notes and AI · Choose what AI can do with your notes';
  }
  function askedClear() {
    asked = null;
    dotOn = false;
    clearTimeout(dotTimer);
    paintChip();
  }
  // An AI reached for the notes and wasn't allowed (the app tells the page): one dot on the chip, gone once the popover was
  // opened or after an hour.
  function aiAsked(a) {
    if (!a || WINDOW || !NA) return;
    asked = { by: String(a.by || 'An AI').slice(0, 24), need: a.need === 'write' ? 'write' : 'read', at: Number(a.at) || Date.now() };
    hintDone();
    paintHint();
    clearTimeout(dotTimer);
    if (popOpen) return paintPop();
    dotOn = true;
    dotTimer = setTimeout(askedClear, 3600000);
    paintChip();
  }

  // ---- the first-time hint: between the tools row and the notes, until answered (or seen on 3 different days) ----
  const HINT_KEY = 'notes.aiHint';
  const hintLoad = () => {
    try {
      const v = JSON.parse(localStorage.getItem(HINT_KEY) || '{}');
      return v && typeof v === 'object' ? v : {};
    } catch {
      return null;
    }
  };
  const hintSave = (v) => {
    try {
      localStorage.setItem(HINT_KEY, JSON.stringify(v));
      return true;
    } catch {
      return false;
    }
  };
  function hintDone() {
    const was = hintLoad();
    if (was && !was.done) hintSave({ done: true });
  }
  const hintEl = () => board && board.querySelector('.nai-hint');
  function hintDrop() {
    hintDone();
    const el = hintEl();
    if (!el || el.classList.contains('gone')) return;
    el.classList.add('gone');
    setTimeout(() => el.remove(), 200);
  }
  function paintHint() {
    if (!board) return;
    const el = hintEl();
    const ok = boardOn && !!NA && AI.mode === 'off' && !popOpen && !asked && notes.some((n) => blocksOf(n).some((b) => b.text));
    if (!ok) {
      if (el && !el.classList.contains('gone')) el.remove();
      return;
    }
    if (el) return;
    const v = hintLoad();
    if (!v || v.done) return;
    const days = Array.isArray(v.days) ? v.days : [];
    const day = new Date().toLocaleDateString('en-CA');
    if (!days.includes(day)) {
      if (days.length >= 3) return void hintSave({ done: true });
      days.push(day);
      if (!hintSave({ days })) return;
    }
    const card = document.createElement('div');
    card.className = 'nai-hint';
    card.setAttribute('role', 'note');
    card.setAttribute('aria-labelledby', 'nai-hint-t');
    card.innerHTML =
      `<span class="nai-orb" aria-hidden="true">${cg('sparkleF')}</span>` +
      '<div><b id="nai-hint-t">AI can help with your notes</b><p>Let Claude Code, Codex or Claude Desktop read them, add to-dos or start a new note. It stays off until you turn it on.</p></div>' +
      '<div class="nai-acts"><button type="button" class="topbtn primary nai-yes">Set up</button><button type="button" class="nai-no">No thanks</button></div>';
    board.querySelector('.np-board').insertBefore(card, board.querySelector('.np-grid'));
    card.querySelector('.nai-yes').onclick = () => {
      hintDrop();
      openPop();
    };
    card.querySelector('.nai-no').onclick = () => {
      hintDrop();
      chip && chip.focus({ preventScroll: true });
    };
  }

  // ---- the popover ----
  const pill = (m) => `<span class="nai-pill ${PILL[m][1]}">${PILL[m][0]}</span>`;
  const allowed = (need) => (need === 'read' ? AI.mode !== 'off' : AI.mode === 'write');
  const mcpNow = () => window.__mcp || null;
  function deskRow() {
    if (!window.Settings?.mcpAsk) return '';
    const s = mcpNow();
    let sub = 'Looking…';
    let right = '';
    let out = false;
    if (s && !s.desktopFound && !s.desktop) {
      sub = `Not on this ${MACHINE}`;
      out = true;
    } else if (s && s.desktop) {
      const manage = '<button type="button" class="nai-link" id="nai-manage">Manage</button>';
      const reads = false; // notes follow the Notes setting alone; Watch and type is for typing into terminals
      if (s.mode === 'off') sub = `Connected · Claude access is off · ${manage}`;
      else if (Date.now() - deskAt < 600000) sub = `Connected · quit and reopen it once${MAC ? '' : ' from its tray icon'}`;
      else sub = `Connected · ${manage}`;
      right = pill(s.mode === 'off' ? 'off' : reads ? 'read' : AI.mode);
    } else if (s) {
      sub = s.mode === 'off' ? 'Connecting also lets it see your AI chats' : 'Adds Orbiterm to Claude Desktop';
      right = `<button type="button" class="nai-btn" id="nai-desk"${connecting ? ' disabled' : ''}>${connecting ? 'Connecting…' : s.mode === 'off' ? 'Connect…' : 'Connect'}</button>`;
    }
    return `<div class="nai-row${out ? ' out' : ''}"><span class="nai-ic">${cg('desk')}</span><span><b>Claude Desktop</b><small>${sub}</small></span>${right}</div>`;
  }
  function lastAiRow() {
    for (let i = aiLog.length - 1; i >= 0; i--) {
      const a = aiLog[i];
      const n = notes.find((x) => x.id === a.id);
      if (n) return { a, n };
    }
    return null;
  }
  function popHTML() {
    const i = ['off', 'read', 'write'].indexOf(AI.mode);
    const ask = asked
      ? `<div class="nai-asked" role="status">${cg('sparkle')}<span><b>${esc(asked.by)} asked ${asked.need === 'read' ? 'for your notes' : 'to change a note'}</b><small>${aiTime(asked.at)} · pick ${asked.need === 'read' ? 'Read' : 'Read and edit'} to let it</small></span></div>`
      : '';
    const seg = [['off', 'Off'], ['read', 'Read'], ['write', 'Read and edit']]
      .map(([m, l]) => `<button type="button" data-mode="${m}" aria-pressed="${m === AI.mode}" tabindex="${m === AI.mode ? 0 : -1}"${busy === m ? ' class="wait"' : ''}>${l}</button>`)
      .join('');
    const can =
      CAN.map(([t, need], n) => {
        const yes = allowed(need);
        return `<li class="${yes ? 'yes' : ''}" style="--n:${n}">${cg(yes ? 'check' : 'dash')}<span>${t}<span class="nai-sr">${yes ? ', allowed' : ', not allowed'}</span></span></li>`;
      }).join('') + `<li class="always">${cg('lock')}<span>Passwords and keys stay hidden from AI.${AI.mode === 'write' ? ' You can undo every change.' : ''}</span></li>`;
    const names = TOOL_NAMES.filter(([k]) => k in AI.tools).map(([, n]) => n);
    const tools = !AI.ready ? 'Works from the next update' : names.length ? names.join(', ').replace(/, ([^,]*)$/, ' and $1') : `None of them is on this ${MACHINE} yet`;
    const term = `<div class="nai-row"><span class="nai-ic">${cg('term')}</span><span><b>AI in Orbiterm's terminals</b><small>${tools}</small></span>${pill(AI.mode)}</div>`;
    const hidden = notes.filter((n) => n.aiHidden).length;
    const lr = lastAiRow();
    const last = lr ? `<button type="button" class="nai-last" id="nai-last" data-id="${esc(lr.n.id)}">${cg('sparkle')}${esc(lr.a.by)} ${lr.a.kind === 'create' ? 'created' : lr.a.kind === 'pin' ? 'pinned' : 'edited'} “${esc(nameOf(lr.n))}” · ${aiTime(lr.a.at)}</button>` : '';
    return (
      `<h3 class="nai-h" id="nai-h">Notes and AI</h3>${ask}` +
      '<p class="nai-q" id="nai-q">What can AI do with your notes?</p>' +
      `<div class="nai-seg" role="group" aria-labelledby="nai-q" style="--i:${i}"><span class="nai-thumb" aria-hidden="true"></span>${seg}</div>` +
      `<p class="nai-say" id="nai-say" role="status" aria-live="polite">${esc(say)}</p>` +
      `<ul class="nai-can" aria-label="What AI can do now">${can}</ul>` +
      `<h4 class="nai-eb">Who can use them</h4>${term}${deskRow()}` +
      `<h4 class="nai-eb">Hide a note</h4><div class="nai-hide"><p>Click <span class="nai-key">${cg('eye')}</span> on an open note, or right-click a note here.</p>` +
      `<small>AI can't find, read or change a hidden note. ${hidden ? `${hidden} note${hidden > 1 ? 's are' : ' is'} hidden.` : 'No note is hidden yet.'}</small></div>` +
      `<div class="nai-foot">${last}<button type="button" class="nai-link" id="nai-settings">Privacy settings ›</button></div>`
    );
  }
  function paintPop(from) {
    if (!naPop) return;
    const inner = naPop.querySelector('.nai-in');
    const a = document.activeElement;
    const keep = a && inner.contains(a) ? (a.dataset.mode ? `[data-mode="${a.dataset.mode}"]` : a.id ? `#${a.id}` : '') : '';
    inner.innerHTML = popHTML();
    const seg = inner.querySelector('.nai-seg');
    // The thumb slides from where it was, after the app's answer (never before).
    if (from && from !== AI.mode) {
      const to = seg.style.getPropertyValue('--i');
      seg.style.setProperty('--i', String(['off', 'read', 'write'].indexOf(from)));
      void seg.offsetWidth;
      seg.style.setProperty('--i', to);
    }
    bindPop(inner);
    if (keep) inner.querySelector(keep)?.focus({ preventScroll: true });
  }
  function placePop() {
    const c = chip.getBoundingClientRect();
    const w = naPop.offsetWidth;
    const left = Math.max(8, Math.min(c.right - w, innerWidth - 8 - w));
    const top = c.bottom + 9;
    naPop.style.left = `${Math.round(left)}px`;
    naPop.style.top = `${Math.round(top)}px`;
    naPop.style.setProperty('--ax', `${Math.round(c.left + c.width / 2 - left)}px`);
    naPop.style.setProperty('--maxh', `${Math.round(innerHeight - top - 8)}px`);
  }
  function openPop(focus = true) {
    if (!chip || !chip.isConnected || !boardOn || popOpen) return;
    hideTip();
    hintDrop();
    popOpen = true;
    say = '';
    window.Settings?.mcpAsk?.({ type: 'state' }).then(() => popOpen && paintPop());
    paintPop();
    naPop.hidden = false;
    placePop();
    chip.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => naPop.classList.add('in'));
    if (focus) naPop.querySelector('.nai-seg button[aria-pressed="true"]')?.focus({ preventScroll: true });
    // Opened: the dot has done its job (the banner shows this once).
    dotOn = false;
    clearTimeout(dotTimer);
    paintChip();
  }
  function closePop(back) {
    if (!popOpen) return;
    popOpen = false;
    naPop.classList.remove('in');
    chip.setAttribute('aria-expanded', 'false');
    asked = null;
    setTimeout(() => !popOpen && (naPop.hidden = true), 130);
    if (back) chip.focus({ preventScroll: true });
  }
  async function pick(m) {
    if (m === AI.mode || busy) return;
    busy = m;
    say = '';
    clearTimeout(slow);
    slow = setTimeout(() => {
      if (busy && !say) {
        say = 'One moment…';
        paintPop();
      }
    }, 400);
    paintPop();
    const r = await setAiMode(m);
    clearTimeout(slow);
    busy = null;
    // Cancel at the app's question: nothing is written and the answer stays where it was.
    say = r && r.mode === m ? SAY[m] : r && r.refused === 'wait' ? 'Wait a few seconds, then try again.' : '';
    paintPop();
    if (popOpen) naPop.querySelector(`.nai-seg button[data-mode="${AI.mode}"]`)?.focus({ preventScroll: true });
  }
  async function connectDesk() {
    const ask = window.Settings?.mcpAsk;
    if (!ask || connecting) return;
    connecting = true;
    say = '';
    paintPop();
    try {
      let s = mcpNow();
      if (!s || s.mode === 'off') {
        // Claude access first: the app's own question ("Let Claude see your AI sessions?").
        const r = await ask({ type: 'mode', mode: 'watch' });
        s = r && (r.state || r);
        if (!s || s.mode === 'off') return;
      }
      const r = await ask({ type: 'connect', target: 'desktop' });
      if (r && r.error) say = r.error;
      else if (r) {
        deskAt = Date.now();
        say = 'Claude Desktop is connected.';
      }
    } finally {
      connecting = false;
      paintPop();
    }
  }
  function bindPop(inner) {
    const seg = inner.querySelector('.nai-seg');
    seg.onclick = (e) => {
      const b = e.target.closest('button[data-mode]');
      if (b) pick(b.dataset.mode);
    };
    // ← → move between the answers; Space or Enter picks one (each pick may bring up a system question).
    seg.onkeydown = (e) => {
      const bs = [...seg.querySelectorAll('button')];
      const at = bs.indexOf(document.activeElement);
      const to = { ArrowLeft: at - 1, ArrowRight: at + 1, Home: 0, End: bs.length - 1 }[e.key];
      if (to == null || at < 0) return;
      e.preventDefault();
      const b = bs[Math.max(0, Math.min(bs.length - 1, to))];
      bs.forEach((x) => (x.tabIndex = x === b ? 0 : -1));
      b.focus();
    };
    const go = inner.querySelector('#nai-desk');
    if (go) go.onclick = connectDesk;
    const manage = inner.querySelector('#nai-manage');
    if (manage) manage.onclick = () => (closePop(false), window.Cloud?.openSettings('claude'));
    const last = inner.querySelector('#nai-last');
    if (last) last.onclick = () => (closePop(false), openNote(last.dataset.id));
    inner.querySelector('#nai-settings').onclick = () => (closePop(false), window.Cloud?.openSettings('privacy'));
  }
  // The door from elsewhere (the panel's menu, Settings): the board, then the popover.
  function openAi() {
    if (WINDOW || !NA) return;
    window.Cloud?.close?.();
    window.Cloud?.showView?.('notes');
    requestAnimationFrame(() => requestAnimationFrame(() => openPop()));
  }
  function mountAi(view) {
    chip = view.querySelector('.nai-chip');
    if (!chip) return;
    naPop = document.createElement('div');
    naPop.className = 'nai-pop';
    naPop.id = 'nai-pop';
    naPop.hidden = true;
    naPop.setAttribute('role', 'dialog');
    naPop.setAttribute('aria-labelledby', 'nai-h');
    naPop.innerHTML = '<div class="nai-arrow" aria-hidden="true"></div><div class="nai-in"></div>';
    document.body.appendChild(naPop);
    chip.onclick = () => (popOpen ? closePop(true) : openPop());
    // Esc closes the popover and nothing more (left to go on, cloud.js would take the board away too).
    addEventListener(
      'keydown',
      (e) => {
        if (e.key !== 'Escape' || !popOpen) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        closePop(true);
      },
      true,
    );
    addEventListener('pointerdown', (e) => {
      if (popOpen && !e.target.closest('#nai-pop') && !e.target.closest('.nai-chip')) closePop(false);
    });
    // Focus going to something else closes it; the window losing focus (the app's own question is up) does not.
    naPop.addEventListener('focusout', (e) => {
      const to = e.relatedTarget;
      if (popOpen && to && !to.closest('#nai-pop') && !to.closest('.nai-chip')) closePop(false);
    });
    addEventListener('resize', () => popOpen && placePop());
    window.addEventListener('mcpchange', () => popOpen && paintPop());
    paintChip();
    window.Settings?.mcpAsk?.({ type: 'state' });
  }

  // ⤢ lit while the pinned note is out in its app window (NATIVE).
  function popState() {
    const on = out.has(pinned);
    pop.classList.toggle('on', on);
    pop.title = on ? 'Put it back in the dashboard' : 'Open in a window';
  }

  const away = document.createElement('div');
  away.className = 'np-away';
  away.innerHTML = '<span>the note is open in a window</span><button type="button">bring it back</button>';
  away.querySelector('button').addEventListener('click', () => dock());
  // While another note is out in its window, the panel shows the pinned one as it reads; a click on it closes the window
  // and brings the writing back here.
  const peek = document.createElement('div');
  peek.className = 'np-peek';
  peek.title = 'Write in it (closes the note window)';
  peek.addEventListener('click', () => dock());

  // What the panel holds while a note is out in its window: the pinned note to read, or, when the pinned note is the
  // one in the window, where it is.
  function paintAway() {
    // The Mac's app windows: the panel writes the pinned note unless it's out in its window (then: where it is).
    if (NATIVE) {
      if (out.has(pinned)) host.replaceChildren(away);
      else if (ed.parentNode !== host) host.replaceChildren(ed);
      return;
    }
    if (!win || win.hidden) return;
    const p = pinnedNote();
    if (p === cur) return host.replaceChildren(away);
    peek.innerHTML = mini(blocksOf(p));
    host.replaceChildren(peek);
  }

  let win = null;
  function build() {
    win = document.createElement('div');
    win.className = 'np-win';
    win.hidden = true;
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-label', 'Note');
    win.innerHTML =
      '<div class="npw-bar"><span class="tag npw-name">note1</span><span class="npw-meta"></span>' +
      '<button type="button" class="npw-ai"></button>' +
      `<button type="button" class="npw-del" title="Delete note" aria-label="Delete note">${TRASH}</button>` +
      '<button type="button" class="npw-x" title="Close: back to its place in the dashboard" aria-label="Close the window">×</button></div>' +
      '<div class="npw-body"></div>';
    document.body.appendChild(win);
    win.querySelector('.npw-x').addEventListener('click', () => dock());
    win.querySelector('.npw-del').addEventListener('click', () => askDelete(cur.id));
    win.querySelector('.npw-ai').addEventListener('click', () => setAiHidden(cur.id, !cur.aiHidden));
    paintAi();
    const bar = win.querySelector('.npw-bar');
    bar.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('button')) return;
      e.preventDefault();
      closeMenu();
      const r = win.getBoundingClientRect();
      const dx = e.clientX - r.left;
      const dy = e.clientY - r.top;
      bar.setPointerCapture(e.pointerId);
      const move = (ev) => {
        win.style.left = `${Math.max(80 - r.width, Math.min(ev.clientX - dx, innerWidth - 80))}px`;
        win.style.top = `${Math.max(0, Math.min(ev.clientY - dy, innerHeight - 32))}px`;
      };
      const up = () => {
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', up);
        bar.removeEventListener('pointercancel', up);
        keepWindow();
      };
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', up);
      bar.addEventListener('pointercancel', up);
    });
    // Its corner sizes it (CSS resize); the size it's left at is kept.
    let sizeTimer = 0;
    new ResizeObserver(() => {
      if (win.hidden) return;
      closeMenu();
      clearTimeout(sizeTimer);
      sizeTimer = setTimeout(keepWindow, 300);
    }).observe(win);
  }

  function keepWindow() {
    if (!win || win.hidden) return;
    const r = win.getBoundingClientRect();
    try {
      localStorage.setItem(WIN_KEY, JSON.stringify({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }));
    } catch {}
  }

  // A note out in an app window of its own (NATIVE): the panel keeps the pinned note, the window writes this one.
  function openOut(id) {
    out.add(id);
    toApp({ type: 'noteWindow', id });
    paintAway();
    popState();
    stamp();
    drawBoard();
  }

  function undock() {
    if (NATIVE) {
      save();
      return openOut(cur.id);
    }
    if (!win) build();
    let g = null;
    try {
      g = JSON.parse(localStorage.getItem(WIN_KEY) || 'null');
    } catch {}
    const w = Math.min(g?.w || 560, innerWidth - 16);
    const h = Math.min(g?.h || 440, innerHeight - 16);
    const x = g ? Math.max(80 - w, Math.min(g.x, innerWidth - 80)) : Math.round((innerWidth - w) / 2);
    const y = g ? Math.max(0, Math.min(g.y, innerHeight - 32)) : Math.round((innerHeight - h) / 3);
    Object.assign(win.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
    closeMenu();
    win.querySelector('.npw-body').appendChild(ed);
    win.hidden = false;
    paintAway();
    pop.classList.add('on');
    pop.title = 'Put it back in the dashboard';
    stamp();
    refocus();
  }

  function dock() {
    // The app closes the pinned note's window; the panel writes it again once it's closed (windowClosed).
    if (NATIVE) {
      if (out.has(pinned)) toApp({ type: 'noteWindowClose', id: pinned, flush: true });
      return;
    }
    if (!win || win.hidden) return;
    keepWindow();
    closeMenu();
    save();
    host.replaceChildren(ed);
    win.hidden = true;
    pop.classList.remove('on');
    pop.title = 'Open in a window';
    // Back in the panel, the page is the pinned note's again.
    const p = pinnedNote();
    if (p !== cur) {
      letGo();
      bind(p);
      render(null);
    }
    stamp();
    drawBoard();
  }

  // ---------- the notes ----------

  // A note to write in, in its window over whatever shows (the panel keeps showing the pinned note).
  function openNote(id) {
    const n = notes.find((x) => x.id === id);
    if (!n) return;
    if (NATIVE) {
      if (n === cur) save();
      write();
      return openOut(id);
    }
    if (n !== cur) {
      save();
      closeMenu();
      letGo();
      bind(n);
      render(null);
      write();
      stamp();
    }
    if (!win || win.hidden) undock();
    else {
      paintAway();
      refocus();
    }
    drawBoard();
  }

  // "Pin to dashboard": the panel shows this note from now on; with no window open it's the one written there.
  function pinNote(id) {
    const n = notes.find((x) => x.id === id);
    if (!n) return;
    if (NATIVE) {
      // The panel's note from now on, even out in its window: written here again once that closes (windowClosed).
      save();
      pinned = n.id;
      closeMenu();
      letGo();
      bind(n);
      render(null);
      paintAway();
      popState();
      write();
      stamp();
      return drawBoard();
    }
    pinned = n.id;
    if (win && !win.hidden) paintAway();
    else if (n !== cur) {
      save();
      closeMenu();
      letGo();
      bind(n);
      render(null);
    }
    write();
    stamp();
    drawBoard();
  }

  // A new note goes first on the board, and opens.
  function newNote() {
    save();
    const n = blank();
    notes.unshift(n);
    openNote(n.id);
  }

  // A note moved with Alt and the arrows goes before or after another.
  function moveNote(id, toId, after) {
    const from = notes.findIndex((n) => n.id === id);
    if (from < 0 || id === toId) return;
    const [n] = notes.splice(from, 1);
    let to = notes.findIndex((x) => x.id === toId);
    to = to < 0 ? notes.length : to + (after ? 1 : 0);
    notes.splice(to, 0, n);
    write();
    drawBoard();
  }

  // Deleting a note asks first, in the dashboard's own question box (app.js); once it's gone an undo still waits a
  // few seconds.
  async function askDelete(id) {
    const n = notes.find((x) => x.id === id);
    if (!n) return;
    const q = { title: 'Delete this note?', text: `Are you sure you want to delete “${nameOf(n)}”?`, ok: 'Delete' };
    if (WINDOW) {
      // Asked on the note's own window; what was typed last reaches the dashboard first (its undo keeps it), then the
      // dashboard deletes it.
      const r = STORE && ready ? await STORE.postMessage({ type: 'confirm', ...q }).catch(() => null) : null;
      if (!r || !r.yes) return;
      await flush();
      return STORE.postMessage({ type: 'delete' }).catch(() => {});
    }
    const yes = typeof askBox === 'function' ? await askBox(q) : window.confirm(q.text);
    if (yes) removeNote(id);
  }

  let gone = null; // { note, index, timer }
  function removeNote(id) {
    const i = notes.findIndex((x) => x.id === id);
    if (i < 0) return;
    if (notes[i] === cur) save();
    // Out in its window: the window closes (nothing more of it kept), its place forgotten.
    if (NATIVE && out.has(id)) {
      out.delete(id);
      toApp({ type: 'noteWindowClose', id, flush: false, deleted: true });
    }
    if (gone) clearTimeout(gone.timer);
    gone = { note: notes[i], index: i, timer: setTimeout(() => ((gone = null), drawBoard()), 6000) };
    notes.splice(i, 1);
    if (!notes.length) notes.push(blank('note1'));
    // The pinned note gone, the first on the board takes its place in the panel.
    if (gone.note.id === pinned) pinned = notes[0].id;
    if (gone.note === cur) {
      if (!NATIVE && win && !win.hidden) dock();
      else {
        letGo();
        bind(pinnedNote());
        render(null);
        if (NATIVE) paintAway();
      }
    } else paintAway();
    if (NATIVE) popState();
    write();
    stamp();
    drawBoard();
  }
  function restoreNote() {
    if (!gone) return;
    clearTimeout(gone.timer);
    notes.splice(Math.min(gone.index, notes.length), 0, gone.note);
    gone = null;
    write();
    drawBoard();
  }

  // ---------- the board: every note as a small panel of the dashboard's own ----------
  let board = null; // its view, once mounted in the activity bar's Notes view (cloud.js)
  let boardOn = false;
  let query = '';
  // A note pressed (not yet a click or a drag) and the note in the hand (mountBoard). The board isn't drawn again under
  // either: a redraw asked for meanwhile waits for the button to come up (`stale`), so the places a note in the hand was
  // measured against stay where they are.
  let press = null; // { id, x, y, pointer, ox, oy, held }: where it was pressed, where on the note, what holds still for it
  let lift = null;
  let stale = false;
  let stopDrag = () => {}; // ends a press, or the drag as `how` says (mountBoard's putDown), at once
  // The light sweeping across every panel's header (style.css, once every 7 s) starts on a note drawn now where it is on
  // every other note, rather than all of them starting over each time the board is drawn anew.
  const sweepAt = () => `${-Math.round(performance.now() % 7000)}ms`;

  // ---------- moving notes the way Notion's board moves its cards ----------
  // A note picked up follows the pointer, lifted with a shadow, and the others slide out of its way; nothing wiggles.
  // The note rising into the hand, the others sliding, and the note let go settling into its place move on Apple's
  // spring (WWDC23, "Animate with springs": a duration and a bounce), drawn as a CSS linear() easing.
  const STILL = matchMedia('(prefers-reduced-motion: reduce)');
  // linear() is newer than the rest (WebKit has it from Safari 17.2): without it, an ease-out curve of the same length.
  const LINEAR = !!(window.CSS && CSS.supports && CSS.supports('transition-timing-function', 'linear(0, 1)'));
  // `v` is how fast it's going already, toward where it ends, in that whole distance a second: a note sent somewhere
  // else while it moves keeps its speed, as a real spring would, instead of stopping dead to start over.
  function spring(duration, bounce, v = 0) {
    const w = (2 * Math.PI) / duration; // the spring's own frequency
    const z = 1 - bounce; // its damping ratio: no bounce is critical damping
    const wd = w * Math.sqrt(Math.max(1e-6, 1 - z * z));
    const at = (t) => (z >= 1 ? 1 - Math.exp(-w * t) * (1 + (w - v) * t) : 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w - v) / wd) * Math.sin(wd * t)));
    // Until it's within a thousandth of where it ends (a fast start swings wider, and takes longer to come to rest).
    const end = Math.min(1.6, Math.log(1000 * Math.max(1, Math.abs(1 - v / (z * w)))) / (z * w));
    const steps = 40;
    const pts = Array.from({ length: steps + 1 }, (_, i) => +at((end * i) / steps).toFixed(4));
    pts[steps] = 1;
    return { duration, bounce, at, ms: Math.round(end * 1000), easing: LINEAR ? `linear(${pts.join(', ')})` : 'cubic-bezier(0.2, 0.9, 0.3, 1)' };
  }
  // Little bounce: the notes come to rest calmly, as cards on a board do, rather than swinging past their places.
  const MAKE_ROOM = spring(0.36, 0.12); // the notes stepping aside
  const SETTLE = spring(0.34, 0.18); // the note let go, drawn into its place
  const LIFT = spring(0.25, 0.2); // the note picked up
  // An animation sets out at the time the page was last drawn at, not at the next frame as a new one would: what goes
  // on from where it's drawn doesn't stand still for a frame first.
  function atOnce(anim) {
    if (document.timeline && document.timeline.currentTime != null) anim.startTime = document.timeline.currentTime;
    return anim;
  }

  // Every note sliding on the board, by its id: its element, the centers it goes from and to (in the grid's own
  // coordinates, so a scroll of the board moves both along), its spring and its animation. A note sent on again (the
  // board drawn anew, or the note in the hand moved on) starts out from where it's drawn and as fast as it was going, so
  // nothing jumps or stops dead.
  const slides = new Map();
  const px = (n) => `${+n.toFixed(2)}px`;
  // How far along its spring a slide is (0 to 1, a little past it at a bounce), and how fast that goes, a second.
  function along(s) {
    const t = Math.max(0, Number(s.anim.currentTime) || 0) / 1000;
    const h = 0.002;
    return { p: s.spring.at(t), dp: (s.spring.at(t + h) - s.spring.at(t - h)) / (2 * h) };
  }
  // A note's center as it's drawn now (sliding or not), in the grid's own coordinates.
  function centerOf(el, g) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - g.left, y: r.top + r.height / 2 - g.top };
  }

  // A note slides from `from`, where it's drawn now, to `to` (centers, in the grid's coordinates); `home` is the center
  // of its own place in the page, where it stands with no transform. It keeps the speed it has.
  function slideTo(el, id, home, from, to) {
    const old = slides.get(id);
    let vx = 0;
    let vy = 0;
    if (old) {
      const { dp } = along(old);
      vx = (old.to.x - old.from.x) * dp;
      vy = (old.to.y - old.from.y) * dp;
      old.anim.cancel();
      slides.delete(id);
    }
    // Where it ends stays in its own style, so the animation leaves it there.
    const ex = to.x - home.x;
    const ey = to.y - home.y;
    el.style.transform = Math.abs(ex) >= 0.01 || Math.abs(ey) >= 0.01 ? `translate(${px(ex)}, ${px(ey)})` : '';
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const d2 = dx * dx + dy * dy;
    if (STILL.matches || d2 < 0.25) return;
    // Its speed toward where it's going, in that whole distance a second (any sideways speed is let go).
    const sp = d2 >= 1 && (vx || vy) ? spring(MAKE_ROOM.duration, MAKE_ROOM.bounce, (vx * dx + vy * dy) / d2) : MAKE_ROOM;
    const anim = atOnce(
      el.animate([{ transform: `translate(${px(from.x - home.x)}, ${px(from.y - home.y)})` }, { transform: `translate(${px(ex)}, ${px(ey)})` }], {
        duration: sp.ms,
        easing: sp.easing,
      }),
    );
    const s = { el, from, to, spring: sp, anim };
    slides.set(id, s);
    anim.onfinish = () => slides.get(id) === s && slides.delete(id);
  }

  // ---------- the note let go, coming down into its place ----------
  // Let go, the copy that was in the hand comes down into the note's place on the magnet's spring, shrinking back and its
  // shadow fading, while the note's own tile waits hidden in that place (np-coming); once the copy is in, it goes and the
  // tile shows, looking just as the copy did. The copy stays above the board as it was in the hand, so nothing of it is
  // cut off at the board's edge on its way down. It's only a picture: the new order is kept and the board drawn in it
  // before the copy sets out, and nothing waits for it. The board drawn anew or resized sends it on to where its note is
  // then. Pressed, it holds still under the pointer, and picked up it goes back into the hand from where it is. It goes
  // on while another note is picked up, until the board makes room across it or that note is let go: then its tile
  // takes over from where the copy is drawn and slides the rest of the way. It's in at once when another view takes the
  // board's place.
  let landing = null; // { id, el (the copy), anims, home (where it's going, in the grid's coordinates), top, left (the board's scroll as it set out), from }

  // How a note (a tile, or a copy of one above the board) is drawn just now: its middle, its width as drawn (grown, or
  // the notes' size before the view was resized), its shadow and its border.
  function lookOf(el) {
    const r = el.getBoundingClientRect();
    const look = getComputedStyle(el);
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, shadow: look.boxShadow, border: look.borderTopColor };
  }

  // The note coming down is in, or has to be at once: its copy goes and its tile shows, looked up by its id as the board
  // is drawn now.
  function endLanding() {
    const L = landing;
    if (!L) return;
    landing = null;
    for (const a of L.anims) a.cancel();
    L.el.remove();
    board?.querySelector(`.np-grid .np-tile[data-id="${CSS.escape(L.id)}"]`)?.classList.remove('np-coming');
  }

  // The copy of the note coming down sets out for its note's place from wherever it's drawn just now: as it's let go, and
  // again whenever that place has moved since. It ends over the place looking just as the tile there does, so the one
  // taking over from the other is never seen.
  function settle() {
    const L = landing;
    if (!L) return;
    const grid = board && board.querySelector('.np-grid');
    const el = boardOn && !STILL.matches && grid && grid.offsetParent && grid.querySelector(`.np-tile[data-id="${CSS.escape(L.id)}"]`);
    if (!el) return endLanding();
    el.classList.add('np-coming');
    // Its place: the tile waiting there hidden isn't sliding, so it stands right in it.
    const g = grid.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const home = { x: r.left - g.left, y: r.top - g.top };
    if (L.home && Math.abs(L.home.x - home.x) < 0.5 && Math.abs(L.home.y - home.y) < 0.5) return;
    L.home = home;
    const c = L.el;
    const from = L.from || lookOf(c);
    L.from = null;
    for (const a of c.getAnimations()) a.cancel();
    const body = board.querySelector('.np-board');
    L.top = body.scrollTop;
    L.left = body.scrollLeft;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const rest = getComputedStyle(el);
    const end = { translate: `${px(r.left)} ${px(r.top)}`, scale: '1', boxShadow: rest.boxShadow, borderColor: rest.borderTopColor };
    // Part of the place out of sight past the board's edge (scrolled off, or under the scrollbar): that part goes in
    // under the edge on the way down, as the tile there is cut off, rather than all at once as the tile shows.
    const b = body.getBoundingClientRect();
    const cut = [b.top - r.top, r.left + w - (b.left + body.clientWidth), r.top + h - (b.top + body.clientHeight), b.left - r.left];
    const clip = cut.some((v) => v > 0.5) ? `inset(${cut.map((v) => (v > 0.5 ? px(v) : '-120px')).join(' ')})` : '';
    // Where it ends stays in its own style, so the animations leave it there.
    Object.assign(c.style, { width: `${w}px`, height: `${h}px`, transform: '', clipPath: clip, ...end });
    const move = atOnce(
      c.animate(
        [
          { translate: `${px(from.cx - w / 2)} ${px(from.cy - h / 2)}`, scale: String(w ? from.w / w : 1), ...(clip ? { clipPath: 'inset(-120px)' } : {}) },
          { translate: end.translate, scale: '1', ...(clip ? { clipPath: clip } : {}) },
        ],
        { duration: SETTLE.ms, easing: SETTLE.easing },
      ),
    );
    const look = atOnce(
      c.animate([{ boxShadow: from.shadow, borderColor: from.border }, { boxShadow: end.boxShadow, borderColor: end.borderColor }], {
        duration: Math.round(SETTLE.ms * 0.6),
        easing: 'ease-out',
      }),
    );
    L.anims = [move, look];
    move.onfinish = () => landing === L && endLanding();
  }

  function mountBoard(view) {
    view.innerHTML =
      '<section class="panel np-boardp"><header><span class="tag">notes</span><span class="meta np-bmeta"></span></header>' +
      '<div class="body np-board"><div class="np-tools">' +
      '<input class="np-find" type="search" placeholder="search notes…" spellcheck="false" aria-label="Search notes">' +
      '<span class="np-gone" hidden></span>' +
      (NA ? '<button type="button" class="nai-chip" aria-haspopup="dialog" aria-expanded="false" aria-controls="nai-pop"><span class="nai-cg" aria-hidden="true">\uEB51</span><span class="nai-t">AI off</span><span class="nai-dot" hidden></span></button>' : '') +
      '<button type="button" class="topbtn primary np-new">+ new note</button></div>' +
      '<div class="np-grid" role="list"></div></div></section>';
    board = view;
    mountAi(view);
    const find = view.querySelector('.np-find');
    find.addEventListener('input', () => {
      query = find.value.trim().toLowerCase();
      drawBoard();
    });
    // Esc in the search clears it first; with nothing in it, it goes back to the dashboard as on every view.
    find.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !find.value) return;
      e.stopPropagation();
      find.value = query = '';
      drawBoard();
    });
    view.querySelector('.np-new').addEventListener('click', newNote);
    view.querySelector('.np-gone').addEventListener('click', (e) => e.target.closest('button') && restoreNote());
    const grid = view.querySelector('.np-grid');
    const body = view.querySelector('.np-board'); // the part of the board that scrolls
    // A click on the board (a press on a note that isn't dragged opens it by itself, below): the new-note square, a
    // note's trash can, a note clicked from the keyboard or while a search is on.
    grid.addEventListener('click', (e) => {
      if (e.target.closest('.np-newt')) return newNote();
      const t = e.target.closest('.np-tile[data-id]');
      if (!t) return;
      const n = notes.find((x) => x.id === t.dataset.id);
      if (!n) return;
      if (e.target.closest('.np-del')) return askDelete(n.id);
      openNote(n.id);
    });
    grid.addEventListener('keydown', (e) => {
      const t = e.target.closest('.np-tile[data-id]');
      if (!t || e.target !== t) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openNote(t.dataset.id);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        askDelete(t.dataset.id);
      } else if (e.altKey && /^Arrow/.test(e.key)) {
        // Alt and an arrow move the note a place back (left, up) or on (right, down), as dragging it would.
        e.preventDefault();
        const i = notes.findIndex((n) => n.id === t.dataset.id);
        const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
        const other = notes[i + (back ? -1 : 1)];
        if (!other) return;
        moveNote(t.dataset.id, other.id, !back);
        board.querySelector(`.np-tile[data-id="${CSS.escape(t.dataset.id)}"]`)?.focus();
      }
    });
    // A right click on a note (found as a press finds it, below): open it, pin it to the dashboard, or delete it
    // (asking first). The menu is the dashboard's own (app.js closes it on a click elsewhere or Esc).
    view.addEventListener('contextmenu', (e) => {
      const id = noteAt(e.target, e.clientX, e.clientY)?.id || e.target.closest('.np-grid .np-tile[data-id]')?.dataset.id;
      if (!id) return;
      e.preventDefault();
      e.stopPropagation();
      document.querySelector('.pn-ctx')?.remove();
      const menu = document.createElement('div');
      menu.className = 'pn-ctx np-ctx';
      menu.innerHTML =
        '<button type="button" data-ctx="open">↗ open</button>' +
        (id === pinned
          ? `<button type="button" disabled><span class="np-ci">${PIN}</span>pinned to the dashboard</button>`
          : `<button type="button" data-ctx="pin"><span class="np-ci">${PIN}</span>pin to dashboard</button>`) +
        (notes.find((x) => x.id === id)?.aiHidden
          ? `<button type="button" data-ctx="aishow"><span class="np-ci">${EYE}</span>show to AI</button>`
          : `<button type="button" data-ctx="aihide"><span class="np-ci">${EYE_OFF}</span>hide from AI</button>`) +
        `<hr><button type="button" data-ctx="delete" class="np-ctx-del"><span class="np-ci">${TRASH}</span>delete note…</button>`;
      document.body.appendChild(menu);
      menu.style.left = `${Math.max(4, Math.min(e.clientX, innerWidth - menu.offsetWidth - 4))}px`;
      menu.style.top = `${Math.max(4, Math.min(e.clientY, innerHeight - menu.offsetHeight - 4))}px`;
      menu.onclick = (ev) => {
        const b = ev.target.closest('[data-ctx]');
        if (!b) return;
        menu.remove();
        if (b.dataset.ctx === 'open') openNote(id);
        else if (b.dataset.ctx === 'pin') pinNote(id);
        else if (b.dataset.ctx === 'aihide') setAiHidden(id, true);
        else if (b.dataset.ctx === 'aishow') setAiHidden(id, false);
        else askDelete(id);
      };
    });
    // Esc with a note's menu open closes the menu and nothing more: left to go on, the same key would take the board
    // away too (cloud.js goes back to the dashboard on Esc).
    addEventListener(
      'keydown',
      (e) => {
        const menu = e.key === 'Escape' && document.querySelector('.np-ctx');
        if (!menu) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        menu.remove();
      },
      true,
    );

    // ---------- a note picked up and moved, the way Notion's board moves its cards ----------
    // A press on a note that moves 6 px picks it up: a copy of it rises from where the note is drawn into the hand and
    // follows the pointer, a little larger and lifted with a shadow, while the note's place on the board is kept empty.
    // The places are measured when it's picked up; resting a moment over one moves the empty place there, and the notes
    // between slide over to make room. Let go, the new order is kept and the board drawn in it at once, nothing left
    // waiting on an animation for the next press to trip on, and the copy comes down into the note's place. Esc puts it
    // back; a pointer the page loses (the window left, the pointer taken) lets it go where the board made room for it.
    // A press that doesn't move is a click, and opens the note.
    //
    // What the click a press ends with does is settled as the press ends: open the note pressed (found by its place, so
    // the click's own target may well be the grid, or whatever is under the copy coming down), or nothing at all (a
    // drag's own click). The next press forgets it, and a click from the keyboard is never touched.
    let tap = null; // { id }: the note to open, or none
    addEventListener('pointerdown', () => (tap = null), true);
    view.addEventListener(
      'click',
      (e) => {
        const t = tap;
        if (!t || e.detail === 0) return;
        tap = null;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (t.id) openNote(t.id);
      },
      true,
    );
    view.addEventListener('pointerdown', (e) => {
      // One note at a time: a second finger or a pen waits its turn.
      if (lift || (press && press.pointer !== e.pointerId)) return;
      release();
      if (e.button !== 0 || query) return;
      const hit = noteAt(e.target, e.clientX, e.clientY);
      if (!hit) return;
      const x = e.clientX;
      const y = e.clientY;
      // Where on the note it's held, which the copy keeps under the pointer (measured as the note is at its own size). A
      // note drawn under the pointer holds still there meanwhile, on its way somewhere or coming down, as a card caught
      // in the hand would; one still on its way to the place pressed is held by that place, and comes on into it.
      let ox;
      let oy;
      let held = [];
      if (hit.copy) {
        const c = landing.el;
        const r = c.getBoundingClientRect();
        const k = c.offsetWidth ? r.width / c.offsetWidth : 1;
        ox = c.offsetWidth / 2 + (x - r.left - r.width / 2) / k;
        oy = c.offsetHeight / 2 + (y - r.top - r.height / 2) / k;
        held = landing.anims;
      } else {
        const r = hit.el.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          ox = x - r.left;
          oy = y - r.top;
          const s = slides.get(hit.id);
          if (s) held = [s.anim];
        } else {
          const g = grid.getBoundingClientRect();
          const p = placeOf(hit.el, g);
          ox = x - g.left - p.x;
          oy = y - g.top - p.y;
        }
      }
      // Only what's still under way: one at its end already would start over when it's let go on again.
      held = held.filter((a) => a.playState === 'running');
      for (const a of held) a.pause();
      press = { id: hit.id, x, y, pointer: e.pointerId, ox, oy, held };
    });
    addEventListener('pointermove', (e) => {
      if (lift) {
        if (e.pointerId !== lift.pointer) return;
        if (e.buttons & 1) return carry(e.clientX, e.clientY);
        // The left button came up while another stays down (a release the page hears as a move): it's let go here. No
        // button at all: its release went unheard (in another window, under a menu), and it goes where the board made
        // room for it.
        return e.button === 0 ? putDown('drop', e.clientX, e.clientY) : putDown('room');
      }
      if (!press || e.pointerId !== press.pointer) return;
      if (!(e.buttons & 1)) return release(e.button === 0);
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) >= 6) pickUp(e.clientX, e.clientY);
    });
    addEventListener('pointerup', (e) => {
      if (lift && e.pointerId === lift.pointer) putDown('drop', e.clientX, e.clientY);
      else if (press && e.pointerId === press.pointer) release(true);
    });
    addEventListener('pointercancel', (e) => {
      if (lift && e.pointerId === lift.pointer) putDown('cancel');
      else if (press && e.pointerId === press.pointer) release();
    });
    // The pointer taken from the grid, or the window left (Alt+Tab, another app's window): the note goes where the board
    // made room for it, as if let go there. (A note giving up a touch's own capture to the grid, as it's picked up, says
    // so too, bubbling up: that one doesn't count.)
    grid.addEventListener('lostpointercapture', (e) => e.target === grid && lift && e.pointerId === lift.pointer && putDown('room'));
    addEventListener('blur', () => stopDrag('room'));
    addEventListener(
      'keydown',
      (e) => {
        if (!lift || e.key !== 'Escape') return;
        e.preventDefault();
        e.stopImmediatePropagation();
        putDown('cancel');
      },
      true,
    );
    // No menu while a note is in the hand: neither a note's, for the one under it, nor the system's.
    addEventListener(
      'contextmenu',
      (e) => {
        if (!lift) return;
        e.preventDefault();
        e.stopImmediatePropagation();
      },
      true,
    );
    // Nothing on the board is dragged the browser's own way (a note's text, say), which would take the pointer away.
    grid.addEventListener('dragstart', (e) => e.preventDefault());
    // A scroll of the board (the wheel, or its own near the edges) brings other places under the pointer, and takes the
    // place a note is coming down into along with it: its copy goes along too.
    body.addEventListener(
      'scroll',
      () => {
        if (lift) carry(lift.x, lift.y);
        if (landing) landing.el.style.transform = `translate(${px(landing.left - body.scrollLeft)}, ${px(landing.top - body.scrollTop)})`;
      },
      { passive: true },
    );
    // The view resized: a note coming down goes on to its place as it is now; under a note in the hand the places are
    // measured again, the others go to their new ones, and the copy takes the notes' new size.
    new ResizeObserver(() => {
      if (!grid.offsetParent) return;
      settle();
      const l = lift;
      if (!l) return;
      const was = l.slots[l.from.indexOf(l.id)];
      measure(l);
      const now = l.slots[l.from.indexOf(l.id)];
      if (was.w && was.h && (now.w !== was.w || now.h !== was.h)) {
        l.dx *= now.w / was.w;
        l.dy *= now.h / was.h;
        Object.assign(l.clone.style, { width: `${now.w}px`, height: `${now.h}px` });
      }
      arrange(l);
      carry(l.x, l.y);
    }).observe(grid);
    stopDrag = (how) => (lift ? putDown(how) : release());

    // The others make room once the note rests over a place a moment, not under every place it passes on its way, so a
    // sweep across the board doesn't set every note moving.
    const DWELL = 80;
    // How near the board's top or foot the pointer starts it scrolling.
    const EDGE = 40;

    // A press let go of without picking anything up: what held still for it goes on, and if it was let go as a click
    // (`open`), that click opens its note. What was to be drawn meanwhile is drawn after the click.
    function release(open = false) {
      const p = press;
      if (!p) return;
      press = null;
      for (const a of p.held) if (a.playState === 'paused') a.play();
      if (open) tap = { id: p.id };
      if (stale) setTimeout(() => stale && drawBoard(), 0);
    }

    // A place on the board, in the grid's own coordinates (so a scroll moves it along): where the note stands in the
    // page with no transform (any slide it's on taken off), and its center.
    function placeOf(el, g) {
      const r = el.getBoundingClientRect();
      const tf = getComputedStyle(el).transform;
      const m = tf && tf !== 'none' ? new DOMMatrix(tf) : { m41: 0, m42: 0 };
      const cx = r.left + r.width / 2 - g.left - m.m41;
      const cy = r.top + r.height / 2 - g.top - m.m42;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      return { x: cx - w / 2, y: cy - h / 2, w, h, cx, cy };
    }
    // Every note's place, in the order the notes are in the page, and the new-note square's.
    function measure(l) {
      const g = grid.getBoundingClientRect();
      l.slots = [...l.tiles.values()].map((el) => placeOf(el, g));
      const newt = grid.querySelector('.np-newt');
      l.first = newt ? placeOf(newt, g) : null;
    }

    // The note a press (or a right click) at x, y is on. The copy of a note coming down, drawn above the board, is that
    // note. Otherwise it's the note whose place it is, wherever that note is drawn just now: after a drop the notes are
    // still sliding into their new places for a moment, and a press made meanwhile is aimed at the note arriving there,
    // not at the empty grid it hasn't reached yet, nor at another passing over on its way. Failing that, a note passing
    // over a gap. A button (a note's trash can, the new-note square) is pressed as a button.
    function noteAt(target, x, y) {
      if (landing) {
        const r = landing.el.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return { id: landing.id, copy: true };
      }
      if (!grid.contains(target) || target.closest('button')) return null;
      const g = grid.getBoundingClientRect();
      const gx = x - g.left;
      const gy = y - g.top;
      for (const el of grid.querySelectorAll('.np-tile[data-id]')) {
        const p = placeOf(el, g);
        if (gx >= p.x && gx <= p.x + p.w && gy >= p.y && gy <= p.y + p.h) return { id: el.dataset.id, el };
      }
      const el = target.closest('.np-tile[data-id]');
      return el ? { id: el.dataset.id, el } : null;
    }

    function pickUp(x, y) {
      const p = press;
      const t = grid.querySelector(`.np-tile[data-id="${CSS.escape(p.id)}"]`);
      if (!t || !boardOn || !grid.offsetParent) return release();
      press = null;
      getSelection().removeAllRanges();
      document.querySelector('.pn-ctx')?.remove();
      // It rises into the hand from where it's drawn just now: as the copy coming down, if it's that note (which is then
      // in the hand instead), or as its tile (held still under the pointer, or still on its way to the place pressed). A
      // slide it was on ends, as only its place counts now. Another note still coming down from the last drop goes on:
      // its tile waits in its own place, to be measured as any other.
      const mine = landing && landing.id === p.id;
      const from = lookOf(mine ? landing.el : t);
      if (mine) endLanding();
      const s = slides.get(p.id);
      let v = null; // how fast it was going (a second, in the page's pixels), still on its way
      if (s) {
        if (s.anim.playState === 'running') {
          const { dp } = along(s);
          v = { x: (s.to.x - s.from.x) * dp, y: (s.to.y - s.from.y) * dp };
        }
        s.anim.cancel();
        slides.delete(p.id);
      }
      const w = t.offsetWidth;
      const h = t.offsetHeight;
      const clone = t.cloneNode(true);
      clone.classList.add('np-copy', 'np-lifted');
      clone.removeAttribute('tabindex');
      clone.removeAttribute('data-id');
      clone.setAttribute('aria-hidden', 'true');
      clone.style.removeProperty('transform');
      // Its header's sweep goes on in step with the note's.
      clone.style.setProperty('--sweep-at', sweepAt());
      Object.assign(clone.style, { width: `${w}px`, height: `${h}px`, translate: `${px(x - p.ox)} ${px(y - p.oy)}` });
      // In the board's view rather than at the page's end, so the view's own styles for a note hold for its copy too.
      board.appendChild(clone);
      const tiles = [...grid.querySelectorAll('.np-tile[data-id]')];
      const ids = tiles.map((el) => el.dataset.id);
      const l = (lift = {
        id: p.id,
        clone,
        pointer: p.pointer,
        dx: p.ox,
        dy: p.oy,
        tiles: new Map(tiles.map((el) => [el.dataset.id, el])),
        slots: [],
        first: null,
        to: new Map(), // where each note is going (its center), in the order as it stands
        from: ids.slice(),
        ids,
        at: ids.indexOf(p.id),
        want: -1, // the place it's over, before the others make room there (-1: none)
        wait: 0,
        x,
        y,
        frame: 0,
        last: 0, // the frame the board last scrolled in
        pad: parseFloat(getComputedStyle(body).paddingBottom) || 0, // the board's own room under the notes
      });
      measure(l);
      ids.forEach((id, i) => l.to.set(id, { x: l.slots[i].cx, y: l.slots[i].cy }));
      try {
        grid.setPointerCapture(l.pointer);
      } catch {}
      t.classList.add('np-slot');
      document.documentElement.classList.add('np-dragging');
      if (!STILL.matches) {
        // From where it was drawn to under the pointer, growing and its shadow deepening, on the lift's spring. The way
        // there is a transform on top of the translate that follows the pointer, so it eases off while the pointer goes
        // on; it's scaled along with the copy, hence over the copy's scale at the start. A note caught on its way (into
        // the place pressed, toward the hand) goes on as fast as it was going, rather than stopping to rise from rest.
        const up = getComputedStyle(clone);
        const k = w ? from.w / w : 1;
        const ax = (from.cx - (x - p.ox + w / 2)) / k;
        const ay = (from.cy - (y - p.oy + h / 2)) / k;
        const d2 = ax * ax + ay * ay;
        const rise = v && d2 >= 1 ? spring(LIFT.duration, LIFT.bounce, -(v.x * ax + v.y * ay) / (d2 * k)) : LIFT;
        atOnce(clone.animate([{ transform: `translate(${px(ax)}, ${px(ay)})` }, { transform: 'translate(0px, 0px)' }], { duration: rise.ms, easing: rise.easing }));
        atOnce(clone.animate([{ scale: String(k) }, { scale: '1.04' }], { duration: LIFT.ms, easing: LIFT.easing }));
        atOnce(
          clone.animate([{ boxShadow: from.shadow, borderColor: from.border }, { boxShadow: up.boxShadow, borderColor: up.borderTopColor }], {
            duration: LIFT.ms,
            easing: 'ease-out',
          }),
        );
      }
      carry(x, y);
    }

    // The pointer's moves, taken once a frame.
    function carry(x, y) {
      const l = lift;
      l.x = x;
      l.y = y;
      if (!l.frame) l.frame = requestAnimationFrame((now) => follow(l, now));
    }

    function follow(l, now) {
      if (lift !== l) return; // a frame asked for by a drag that has ended
      l.frame = 0;
      const { x, y } = l;
      l.clone.style.translate = `${px(x - l.dx)} ${px(y - l.dy)}`;
      // Near the board's top or foot it scrolls on, faster the nearer the edge (so much a second, whatever the screen's
      // rate), and keeps on while the pointer waits there; down only as far as the notes go (the grid's own foot, so a
      // note drawn past it on its way somewhere doesn't count).
      const b = body.getBoundingClientRect();
      const depth = y < b.top + EDGE ? (y - b.top - EDGE) / EDGE : y > b.bottom - EDGE ? (y - b.bottom + EDGE) / EDGE : 0;
      const room = depth < 0 ? body.scrollTop > 0 : depth > 0 && grid.getBoundingClientRect().bottom + l.pad - (b.top + body.clientHeight) > 0.5;
      if (room) {
        const dt = l.last ? Math.min(50, now - l.last) : 16;
        l.last = now;
        body.scrollTop += Math.sign(depth) * Math.max(1, Math.round(((80 + 1000 * Math.min(1, Math.abs(depth))) * dt) / 1000));
        l.frame = requestAnimationFrame((t) => follow(l, t));
      } else l.last = 0;
      aim(l, x, y);
    }

    // The place under the pointer becomes the empty one once the note rests over it a moment. Off it (between places,
    // off the board), whatever was coming is called off, so a place only crossed on the way somewhere else doesn't take
    // the note; back over its own place, too.
    function aim(l, x, y) {
      const to = placeUnder(l, x, y);
      if (to === l.want) return;
      clearTimeout(l.wait);
      l.want = to;
      if (to >= 0 && to !== l.at) l.wait = setTimeout(() => lift === l && moveTo(l, to), DWELL);
    }

    // The empty place goes to `to`, and every note between slides along.
    function moveTo(l, to) {
      if (to === l.at) return;
      l.ids.splice(l.at, 1);
      l.ids.splice(to, 0, l.id);
      l.at = to;
      arrange(l);
    }

    // The place under the pointer at x, y (in the page): only where the board shows, not a place scrolled out of sight
    // past its edge or anywhere off it (-1).
    function placeUnder(l, x, y) {
      const b = body.getBoundingClientRect();
      if (x < b.left || x >= b.left + body.clientWidth || y < b.top || y >= b.top + body.clientHeight) return -1;
      const g = grid.getBoundingClientRect();
      return placeAt(l, x - g.left, y - g.top);
    }
    // The place at gx, gy (in the grid's coordinates): one is taken over the middle of it (not its edges, so the pointer
    // doesn't flicker between two), and the one it's over keeps it out to its very edges. The new-note square is the
    // first place.
    function placeAt(l, gx, gy) {
      const inside = (s, m) => !!s && gx >= s.x + s.w * m && gx <= s.x + s.w * (1 - m) && gy >= s.y + s.h * m && gy <= s.y + s.h * (1 - m);
      if (l.want >= 0 && (inside(l.slots[l.want], 0) || (l.want === 0 && inside(l.first, 0)))) return l.want;
      const i = l.slots.findIndex((s) => inside(s, 0.12));
      if (i >= 0) return i;
      return inside(l.first, 0) ? 0 : -1;
    }

    // The place a note let go at x, y (in the page) goes to: the one under the pointer, or else the nearest one, so a
    // note let go a little off (at a place's edge, in the gap between two, as a quick hand does) still goes there
    // rather than back where it came from. The place the board has made room at wins over another as near. Past the
    // last note it's the last place. With none within reach (off the board): where the board has made room (-1).
    function dropAt(l, x, y) {
      const to = placeUnder(l, x, y);
      if (to >= 0) return to;
      const b = body.getBoundingClientRect();
      if (x < b.left || x >= b.left + body.clientWidth || y < b.top || y >= b.top + body.clientHeight) return -1;
      const g = grid.getBoundingClientRect();
      const gx = x - g.left;
      const gy = y - g.top;
      // How far off a place the pointer is (0 on it).
      const off = (s) => Math.hypot(Math.max(s.x - gx, 0, gx - s.x - s.w), Math.max(s.y - gy, 0, gy - s.y - s.h));
      let best = -1;
      let least = Infinity;
      l.slots.forEach((s, i) => {
        const d = off(s) - (i === l.at ? 16 : 0);
        if (d < least) {
          least = d;
          best = i;
        }
      });
      if (l.first && off(l.first) < least) {
        least = off(l.first);
        best = 0;
      }
      const last = l.slots[l.slots.length - 1];
      if (least <= last.w / 2) return best;
      const past = gy > last.y + last.h || (gy >= last.y && gx > last.x + last.w);
      return past && gx >= 0 && gx <= g.width ? l.slots.length - 1 : -1;
    }

    // Every other note to its place in the new order: a transform from its own place in the page, set out from where
    // it's drawn now at the speed it has. The note in the hand isn't drawn, so its place is simply the empty one.
    function arrange(l) {
      const g = grid.getBoundingClientRect();
      const moves = [];
      l.ids.forEach((id, i) => {
        if (id === l.id) return;
        const to = { x: l.slots[i].cx, y: l.slots[i].cy };
        const going = l.to.get(id);
        if (going && Math.abs(going.x - to.x) < 0.5 && Math.abs(going.y - to.y) < 0.5) return;
        l.to.set(id, to);
        const home = l.slots[l.from.indexOf(id)];
        const el = l.tiles.get(id);
        moves.push([el, id, { x: home.cx, y: home.cy }, centerOf(el, g), to]);
      });
      // A note still coming down from the last drop, asked to make room too: its tile takes over from where its copy is
      // drawn, and slides on from there.
      const down = landing && moves.find((m) => m[1] === landing.id);
      if (down) {
        down[3] = centerOf(landing.el, g);
        endLanding();
      }
      for (const m of moves) slideTo(...m);
    }

    // The note in the hand let go: at x, y (`drop`), where the board made room for it (`room`: the pointer lost, the
    // window left), or back where it was (`cancel`). Everything is settled here and now; only the copy's way down is
    // left to run, and nothing waits on it.
    function putDown(how, x, y) {
      const l = lift;
      if (!l) return;
      clearTimeout(l.wait);
      cancelAnimationFrame(l.frame);
      lift = null;
      document.documentElement.classList.remove('np-dragging');
      // The click its release makes, if one comes, is the drag's own and opens nothing.
      tap = { id: null };
      try {
        grid.releasePointerCapture(l.pointer);
      } catch {}
      if (how !== 'cancel') {
        // Let go over a place or near one, it goes there, even before it rested there or between two frames; anywhere
        // else (off the board) it goes where the board has made room for it.
        const to = how === 'drop' ? dropAt(l, x, y) : -1;
        if (to >= 0 && to !== l.at) {
          l.ids.splice(l.at, 1);
          l.ids.splice(to, 0, l.id);
          l.at = to;
        }
        if (commit(l)) write();
      }
      // The new order drawn at once (or the old one, put back): the others slide on from where they're drawn to their
      // places in it, and the copy in the hand comes down into the note's own, from just as it's drawn now. One comes
      // down at a time: a note still coming down from the drop before is a tile again, which slides the rest of the way
      // from where its copy is drawn.
      const before = landing ? { id: landing.id, at: centerOf(landing.el, grid.getBoundingClientRect()) } : null;
      endLanding();
      const from = lookOf(l.clone);
      l.clone.classList.replace('np-lifted', 'np-landing');
      landing = { id: l.id, el: l.clone, anims: [], home: null, top: 0, left: 0, from };
      drawBoard(before);
      settle();
    }

    // The note's new place kept in the notes: right after the note before it on the board (first, with none before
    // it), so notes added or gone meanwhile (another window) keep theirs. Whether it moved.
    function commit(l) {
      const i = notes.findIndex((n) => n.id === l.id);
      if (i < 0 || l.at === l.from.indexOf(l.id)) return false;
      const prev = l.ids
        .slice(0, l.at)
        .reverse()
        .find((id) => notes.some((n) => n.id === id));
      const [n] = notes.splice(i, 1);
      const j = prev ? notes.findIndex((x) => x.id === prev) + 1 : 0;
      notes.splice(j, 0, n);
      return j !== i;
    }
  }
  function showBoard() {
    boardOn = true;
    save();
    drawBoard();
  }
  // Another view in its place: a note in the hand goes back first, as there's no board left to put it down on, and a
  // note coming down is in at once.
  function hideBoard() {
    stopDrag('cancel');
    endLanding();
    boardOn = false;
    closePop(false);
    hintEl()?.remove();
  }

  // A note as the panel shows it, only smaller and not to be written in: the same blocks, the same marks.
  function mini(list) {
    const counts = [];
    let end = list.length;
    while (end > 0 && list[end - 1].type === 'p' && !list[end - 1].text) end--;
    if (!end) return '<div class="np-hollow">empty</div>';
    return list
      .slice(0, Math.min(end, 40))
      .map((b) => {
        let mark = '';
        if (b.type === 'num') {
          counts.length = (b.indent || 0) + 1;
          counts[b.indent || 0] = (counts[b.indent || 0] || 0) + 1;
          mark = `${counts[b.indent || 0]}.`;
        } else counts.length = TYPES[b.type]?.list ? b.indent || 0 : 0;
        const ind = b.indent ? ` style="--ind:${b.indent}"` : '';
        if (b.type === 'divider') return '<div class="nb nb-divider"><hr></div>';
        if (b.type === 'todo') mark = '<i class="nb-cb"></i>';
        else if (b.type === 'bullet') mark = BULLETS[(b.indent || 0) % BULLETS.length];
        return (
          `<div class="nb nb-${b.type}${b.checked ? ' done' : ''}"${ind}>` +
          (mark ? `<span class="nb-mark">${mark}</span>` : '') +
          `<div class="nb-text">${esc(unlink(b.text)) || '&nbsp;'}</div></div>`
        );
      })
      .join('');
  }

  // A spark beside the trash can while an AI's last change to the note stands (the strip's "Undo" is in the note).
  function aiMark(n) {
    const a = AI.mode !== 'off' ? aiTag(n) : null;
    if (!a) return '';
    const tip = `${a.by} ${a.kind === 'create' ? 'made' : a.kind === 'pin' ? 'pinned' : 'edited'} this ${ago(a.at)} · Open the note to undo it`;
    return `<span class="nai-mark" role="img" data-tip="${esc(tip)}" aria-label="${esc(tip)}">${cg('sparkle')}</span>`;
  }
  function tile(n) {
    // Its marks: pinned (the note the dashboard's panel shows), open (the note in the window).
    const open = NATIVE ? out.has(n.id) : n === cur && win && !win.hidden;
    const where = [n.id === pinned ? `${PIN} pinned` : '', open ? 'open' : ''].filter(Boolean).join(' · ');
    const when = n.at ? `edited ${ago(n.at)}` : 'empty';
    // The note coming down is drawn hidden in its place until its copy is there.
    const coming = landing && landing.id === n.id ? ' np-coming' : '';
    return (
      `<section class="panel np-tile${n === cur || open ? ' cur' : ''}${coming}" role="listitem" tabindex="0" data-id="${esc(n.id)}" aria-label="${esc(nameOf(n))}">` +
      `<header><span class="tag np-name" title="${esc(nameOf(n) === n.name ? NAME_HINT : nameOf(n))}">${esc(nameOf(n))}</span>` +
      `<span class="meta">${where ? `<b>${where}</b> · ` : ''}${when}</span>` +
      aiMark(n) +
      (n.aiHidden ? `<span class="np-aih" data-tip="${AI_HIDDEN_TIP}" role="img" aria-label="${AI_HIDDEN_TIP}">${EYE_OFF}</span>` : '') +
      `<button type="button" class="np-del" title="Delete note" aria-label="Delete note">${TRASH}</button></header>` +
      `<div class="body np-mini">${mini(blocksOf(n))}</div></section>`
    );
  }

  // `drawn` is a note drawn somewhere other than its tile just now ({ id, at }: the copy of one that was coming down).
  function drawBoard(drawn) {
    if (!board || !boardOn) return;
    // Not under a note pressed or in the hand: it's drawn once the button comes up.
    if (press || lift) {
      stale = true;
      return;
    }
    stale = false;
    const words = (n) => `${nameOf(n)}\n${blocksOf(n).map((b) => b.text).join('\n')}`.toLowerCase();
    const list = notes.filter((n) => !query || words(n).includes(query));
    const grid = board.querySelector('.np-grid');
    // Where each note is drawn now, sliding or not, so the ones that move go on from there.
    let g = grid.getBoundingClientRect();
    const was = new Map([...grid.querySelectorAll('.np-tile[data-id]')].map((t) => [t.dataset.id, centerOf(t, g)]));
    if (drawn && was.has(drawn.id)) was.set(drawn.id, drawn.at);
    // The notes drawn anew go on sweeping where they were (sweepAt).
    grid.style.setProperty('--sweep-at', sweepAt());
    grid.innerHTML =
      (query ? '' : '<button type="button" class="np-newt"><b>+</b><span>new note</span></button>') +
      list.map(tile).join('') +
      (query && !list.length ? `<div class="np-empty">no note has “${esc(query)}” in it</div>` : '');
    board.querySelector('.np-bmeta').textContent = `${notes.length} note${notes.length === 1 ? '' : 's'}`;
    paintHint();
    const bar = board.querySelector('.np-gone');
    bar.hidden = !gone;
    if (gone) bar.innerHTML = `deleted ${esc(nameOf(gone.note))} <button type="button">undo</button>`;
    // Every note drawn somewhere else before slides from there to its place, and one already sliding goes on as fast
    // as it was going; the slides of notes no longer drawn end with them. The note coming down isn't one of them: its
    // copy brings it in, sent on to its place as it's drawn now (or gone, its note no longer on the board).
    g = grid.getBoundingClientRect();
    const moves = [];
    for (const t of grid.querySelectorAll('.np-tile[data-id]')) {
      const id = t.dataset.id;
      const from = was.get(id);
      if (!from || (landing && landing.id === id)) continue;
      const home = centerOf(t, g);
      if (slides.has(id) || Math.abs(from.x - home.x) >= 0.5 || Math.abs(from.y - home.y) >= 0.5) moves.push([t, id, home, from, home]);
    }
    for (const m of moves) slideTo(...m);
    for (const [id, s] of slides) {
      if (s.el.isConnected) continue;
      s.anim.cancel();
      slides.delete(id);
    }
    settle();
  }

  addEventListener('keydown', (e) => {
    const mod = MAC ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
    if (!mod || !e.shiftKey || e.altKey || e.code !== 'KeyJ') return;
    e.preventDefault();
    if (WINDOW) return refocus();
    if (NATIVE && out.has(pinned)) return toApp({ type: 'noteWindow', id: pinned });
    if (NATIVE && !ed.offsetParent) return undock();
    if (!ed.offsetParent) undock();
    refocus();
  });

  // Another dashboard window writing notes in this page's storage shows here too, unless this one is being written in.
  addEventListener('storage', (e) => {
    if (STORE || e.key !== KEY || ed.contains(document.activeElement)) return;
    loadAll(readHere());
    render(null);
    drawBoard();
  });
  // "5m ago" stays true, on the strip and on the board.
  setInterval(() => (stamp(), drawBoard()), 30000);

  // What was typed in the last moment is kept before the app quits.
  function flush() {
    save();
    if (unsaved && ready) write();
    return writing;
  }

  // ---------- what an AI sees and does (NotesTools.swift asks; Claude Code, Codex and Antigravity through MCP) ----------
  // Every change an AI makes goes through here, the notes' one writer, never to the files: the note redraws at once, is kept
  // encrypted as any typing is, and ⌘Z takes it back as one step. A note out in its own window is changed by that window's
  // page (NotesTools asks the page that holds the note live), so what the user is typing there is never overwritten.
  // The note as Markdown is what an AI reads and writes (toText and fromText); its `version` is a hash of that text.
  let lastInputAt = 0;
  let composing = false;
  ed.addEventListener('beforeinput', () => (lastInputAt = Date.now()));
  ed.addEventListener('compositionstart', () => (composing = true));
  ed.addEventListener('compositionend', () => {
    composing = false;
    lastInputAt = Date.now();
  });
  // Typing now: a key within the last 1.5 s in this note's editor, or a composition (Türkçe, Japanese…) not finished.
  const typing = () => composing || (ed.contains(document.activeElement) && Date.now() - lastInputAt < 1500);
  const nap = (ms) => new Promise((r) => setTimeout(r, ms));
  // A pause in the user's typing in this page's note, waited for up to 10 s (as agentApply does): false while they still type.
  async function pause() {
    for (let waited = 0; typing(); waited += 200) {
      if (waited >= 10000) return false;
      await nap(200);
    }
    return true;
  }
  const AI_MAX = 20000;

  // Every note, where it is, never its text (agentRead has that): `pinnedToDashboard` is the note the dashboard's panel shows,
  // `inWindow` one out in a window of its own; NotesTools adds what only the app knows (windows' pin, whether the session lives).
  async function agentList() {
    await isLoaded;
    // A note hidden from AI isn't here at all (the app filters again from its own copy).
    return notes.map((n, i) => (n.aiHidden ? null : { n, i })).filter(Boolean).map(({ n, i }) => {
      const md = toText(blocksOf(n));
      return {
        id: n.id,
        title: nameOf(n),
        order: i + 1,
        created: n.created,
        changed: n.at || null,
        version: hashOf(md),
        chars: md.length,
        // Cut at a space: the app masks secrets in it after this, and a secret cut in two might not be seen as one.
        preview: md.length > 160 ? md.slice(0, 160).replace(/\S*$/, '') : md,
        pinnedToDashboard: n.id === pinned,
        inWindow: out.has(n.id),
        session: n.session || null,
        sessionLabel: n.sessionLabel || null,
      };
    });
  }

  async function agentRead(id) {
    await isLoaded;
    const n = notes.find((x) => x.id === id);
    if (!n || n.aiHidden) return { error: 'not_found' };
    const md = toText(blocksOf(n));
    return { id: n.id, title: nameOf(n), version: hashOf(md), changed: n.at || null, chars: md.length, markdown: md };
  }

  // The blocks of a note replaced as one step: the live editor's (⌘Z takes it back), or a note that isn't being written here.
  function setBlocksOf(n, next) {
    if (n === cur && !out.has(n.id)) {
      const s = snap();
      record('op');
      blocks = liveOf(next);
      lastKind = '';
      const f = s.focus && blocks[Math.min(s.focus.i, blocks.length - 1)];
      render(f ? { id: f.id, at: Math.min(s.focus.at, f.text.length) } : null);
      save();
    } else {
      n.blocks = plain(liveOf(next));
      n.at = Date.now();
      write();
      stamp();
      drawBoard();
    }
    return writing;
  }

  // req: { id, op: 'append' | 'edit' | 'write', text, old, new, version, by }. Answers { ok, version, saved } or { error, message }.
  async function agentApply(req) {
    await isLoaded;
    const bad = (message, more) => ({ error: 'bad_request', message, ...more });
    if (!req || typeof req !== 'object') return bad('Bad request.');
    const n = notes.find((x) => x.id === req.id);
    if (!n || n.aiHidden) return { error: 'not_found', message: 'No note has this id. List the notes again.' };
    const op = req.op;
    if (!['append', 'edit', 'write'].includes(op)) return bad('Unknown operation.');
    const live = n === cur && !out.has(n.id);
    // An addition goes in at once, at the end, wherever the cursor is. Anything that rewrites waits for a pause in typing.
    if (op !== 'append' && live) {
      for (let waited = 0; typing(); waited += 200) {
        if (waited >= 10000) return { error: 'busy', message: 'The user is typing in this note right now. Try again in a few seconds.' };
        await nap(200);
      }
    }
    // The user may have hidden (or deleted) it while this waited.
    if (!notes.includes(n) || n.aiHidden) return { error: 'not_found', message: 'No note has this id. List the notes again.' };
    const have = blocksOf(n);
    const md = toText(have);
    const version = hashOf(md);
    const base = plain(liveOf(have));
    let next;
    if (op === 'append') {
      const add = plain(fromText(String(req.text ?? '')));
      if (!String(req.text ?? '').trim()) return bad('Nothing to add.');
      const empty = base.length === 1 && base[0].type === 'p' && !base[0].text;
      next = (empty ? [] : base).concat(add);
    } else if (op === 'edit') {
      const old = String(req.old ?? '');
      const neu = String(req.new ?? '');
      if (!old) return bad('old_text is empty.');
      const count = md.split(old).length - 1;
      if (!count) return { error: 'text_not_found', version, message: 'That text is not in the note (it may have changed). Read the note again.' };
      if (count > 1) return { error: 'ambiguous', version, message: `That text is in the note ${count} times. Give a longer piece that is there once.` };
      // In one block's own text: that block alone changes. Else the Markdown is changed and read back into blocks.
      const hit = base.filter((b) => b.text.includes(old));
      if (hit.length === 1 && hit[0].text.split(old).length === 2 && (!neu.includes('\n') || hit[0].type === 'code' || hit[0].type === 'p')) {
        hit[0].text = hit[0].text.replace(old, () => neu);
        next = base;
      } else next = plain(fromText(md.replace(old, () => neu)));
    } else {
      if (md.trim() && !req.version) return bad('version is required to rewrite a note: read it first and pass its version.');
      if (req.version && req.version !== version) return { error: 'changed', version, message: 'The note changed since you read it. Read it again.' };
      next = plain(fromText(String(req.text ?? '')));
    }
    if (toText(next).length > 400000) return bad('The note would be too long.');
    return commitAi(n, next, req.by, have, op);
  }

  async function commitAi(n, next, by, before, op) {
    const keep = plain(liveOf(before));
    await setBlocksOf(n, next);
    const after = hashOf(toText(blocksOf(n)));
    lastAi = { id: n.id, by: String(by || 'AI').slice(0, 24), at: Date.now(), before: keep, after };
    aiLog.push(lastAi);
    if (aiLog.length > 10) aiLog.shift();
    aiTouched();
    stamp();
    return { ok: true, op, version: after, title: nameOf(n), saved: !unsaved };
  }

  // Undo of the last AI change in this note, while the note is still as the AI left it (the strip's "Undo").
  async function agentUndo(id) {
    const n = notes.find((x) => x.id === id);
    const a = aiTag(n);
    if (!n || !a) return { error: 'nothing_to_undo' };
    if (a.kind) return agentUndoKind(n, a);
    await setBlocksOf(n, a.before);
    lastAi = null;
    aiLog.splice(0, aiLog.length, ...aiLog.filter((x) => x !== a));
    aiTouched();
    stamp();
    return { ok: true };
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-undo]');
    if (t && t.dataset.undo) agentUndo(t.dataset.undo);
  });

  // A note pinned to a terminal (its detached session's name) or let go: `session` '' lets go. Kept with the note.
  async function agentSession(id, session, label) {
    await isLoaded;
    const n = notes.find((x) => x.id === id);
    if (!n || n.aiHidden) return { error: 'not_found' };
    // Another note held by this terminal lets go: a terminal has one note.
    const free = (o) => {
      delete o.session;
      delete o.sessionLabel;
    };
    if (session) {
      for (const o of notes) if (o !== n && !o.aiHidden && o.session === session) free(o);
      Object.assign(n, sessionOf({ session, sessionLabel: label }));
    } else free(n);
    write();
    drawBoard();
    return { ok: true };
  }

  // A new note an AI made (title + Markdown), first on the board; it isn't opened or pinned (agentPin / agentWindow do that).
  async function agentCreate(req) {
    await isLoaded;
    if (!req || typeof req !== 'object') return { error: 'bad_request', message: 'Bad request.' };
    const title = String(req.title ?? '').replace(/\s+/g, ' ').replace(/^#+\s*/, '').trim().slice(0, 80);
    const text = String(req.text ?? '');
    // Its name is always the title (never a noteN, numbered among every note, hidden ones too).
    if (!title) return { error: 'bad_request', message: 'Give a title: one line with words in it.' };
    if (text.length > AI_MAX) return { error: 'bad_request', message: `The text is longer than ${AI_MAX} characters.` };
    const md = `# ${title}\n\n${text}`.trimEnd();
    const n = blank();
    n.blocks = plain(fromText(md));
    n.at = Date.now();
    notes.unshift(n);
    lastAi = { id: n.id, by: String(req.by || 'AI').slice(0, 24), at: Date.now(), kind: 'create', after: hashOf(toText(blocksOf(n))) };
    aiLog.push(lastAi);
    if (aiLog.length > 10) aiLog.shift();
    aiTouched();
    const saving = write();
    stamp();
    drawBoard();
    return { ok: true, id: n.id, title: nameOf(n), version: lastAi.after, saved: await saving };
  }

  // Which note the dashboard's panel shows. `unpin` goes back to the board's first note (the panel always shows one).
  async function agentPin(req) {
    await isLoaded;
    const by = String((req && req.by) || 'AI').slice(0, 24);
    const gone = { error: 'not_found', message: 'No note has this id. List the notes again.' };
    // The panel's note changes under the user's keys only after a pause in their typing (as agentApply's rewrites).
    if (!(await pause())) return { error: 'busy' };
    const prev = pinnedNote();
    let n;
    if (req && req.unpin) n = notes.find((x) => !x.aiHidden);
    else {
      n = notes.find((x) => x.id === (req && req.id));
      if (!n || n.aiHidden) return gone;
    }
    // A note the user hid from AI stays pinned: pinning another one, as unpinning, would take it off the panel.
    if (!prev || prev.aiHidden) return { error: 'locked' };
    if (!n || n === prev) return { ok: true, unchanged: true, id: prev.id, title: nameOf(prev) };
    pinNote(n.id);
    lastAi = { id: n.id, by, at: Date.now(), kind: 'pin', prev: prev ? prev.id : null, after: hashOf(toText(blocksOf(n))) };
    aiLog.push(lastAi);
    if (aiLog.length > 10) aiLog.shift();
    aiTouched();
    stamp();
    return { ok: true, id: n.id, title: nameOf(n) };
  }

  // Undo of an AI's create (the note goes, as the trash can does) or pin (the panel shows the note it showed before).
  async function agentUndoKind(n, a) {
    lastAi = null;
    aiLog.splice(0, aiLog.length, ...aiLog.filter((x) => x !== a));
    aiTouched();
    if (a.kind === 'create') removeNote(n.id);
    else if (a.kind === 'pin') {
      const p = notes.find((x) => x.id === a.prev);
      if (p) pinNote(p.id);
    }
    stamp();
    return { ok: true };
  }

  // A note's own window (NATIVE only): the note checked here; the window itself, opened (and kept on top) or closed, is the
  // app's (NotesTools), and the page follows once it loads (windowNote) or closes (windowClosed), as at launch. Nothing is
  // set here first, so a call the app stops halfway leaves no note "out" with no window.
  async function agentWindow(id, action) {
    await isLoaded;
    const n = notes.find((x) => x.id === id);
    if (!n || n.aiHidden) return { error: 'not_found' };
    if (!NATIVE) return { error: 'unsupported' };
    // The panel's own note going out to its window: not under the user's keys.
    if (action === 'open' && n === cur && !out.has(id)) {
      if (!(await pause())) return { error: 'busy' };
      if (!notes.includes(n) || n.aiHidden) return { error: 'not_found' };
    }
    return { ok: true, title: nameOf(n) };
  }
  // A note's window (its own page): a pause in the user's typing there before the app closes or re-layers it.
  const agentIdle = async () => ((await pause()) ? { ok: true } : { error: 'busy' });

  // ---------- the dashboard's side of the note windows (NATIVE; NoteWindow.swift calls these) ----------
  // A note's window asks for its note: from now on it's written there.
  async function windowNote(id) {
    await isLoaded;
    const n = notes.find((x) => x.id === id);
    if (!n) return null;
    if (n === cur && !out.has(id)) save();
    out.add(id);
    paintAway();
    popState();
    stamp();
    drawBoard();
    return JSON.stringify({ v: 3, ordered: true, pinned: id, current: id, notes: [{ id: n.id, name: n.name, created: n.created, at: n.at, blocks: blocksOf(n), ...hideOf(n) }] });
  }
  // What a note's window wrote, kept with every other note: its blocks and when (its name and order stay this page's).
  async function fromWindow(note) {
    await isLoaded;
    const n = note && notes.find((x) => x.id === note.id);
    if (!n) return { error: 'this note was deleted' };
    const fresh = !out.has(n.id);
    out.add(n.id);
    if (Array.isArray(note.blocks)) n.blocks = plain(liveOf(note.blocks));
    n.at = Number(note.at) || Date.now();
    if (fresh) {
      paintAway();
      popState();
    }
    const ok = await write();
    stamp();
    drawBoard();
    return ok ? { ok: true } : { error: unsaved || 'not saved' };
  }
  // Its window closed: the pinned note is written in the panel again, as its window left it.
  function windowClosed(id) {
    if (!out.delete(id)) return;
    if (cur && id === cur.id) {
      letGo();
      bind(cur);
      render(null);
    }
    paintAway();
    popState();
    stamp();
    drawBoard();
  }
  // The notes out in their windows, as the app has them (this page loaded again, or at launch).
  function windowsOpen(ids) {
    save();
    const was = cur && out.has(cur.id);
    out.clear();
    for (const id of ids || []) out.add(id);
    if (was && !out.has(cur.id)) {
      letGo();
      bind(cur);
      render(null);
    }
    paintAway();
    popState();
    stamp();
    drawBoard();
  }

  // ---------- one note in an app window of its own (WINDOW: note.html) ----------
  // Its strip: the note's name, when it last changed, then Keep on top (codicon's pin, pinned while on), the trash can
  // and ×. Dragged by the strip, the app moves the window; its edges size it.
  const post = (msg) => {
    try {
      return Promise.resolve(STORE ? STORE.postMessage(msg) : null).catch(() => null);
    } catch {
      return Promise.resolve(null);
    }
  };
  let onTop = false;
  function setTop(on) {
    onTop = !!on;
    const b = panel.querySelector('.npw-top');
    if (!b) return;
    b.classList.toggle('on', onTop);
    b.setAttribute('aria-pressed', String(onTop));
    b.title = onTop ? 'Stop keeping on top' : 'Keep on top';
    b.innerHTML = `<i class="np-glyph" aria-hidden="true">${onTop ? '&#xEBA0;' : '&#xEB2B;'}</i>`;
  }
  function windowBar() {
    panel.querySelector('.npw-x')?.addEventListener('click', () => post({ type: 'close' }));
    panel.querySelector('.npw-del')?.addEventListener('click', () => ready && askDelete(cur.id));
    panel.querySelector('.npw-ai')?.addEventListener('click', () => ready && setAiHidden(cur.id, !cur.aiHidden));
    panel.querySelector('.npw-top')?.addEventListener('click', () => post({ type: 'onTop', on: !onTop }).then((r) => r && setTop(r.onTop)));
    const bar = panel.querySelector('.npw-bar');
    bar?.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || e.target.closest('button')) return;
      e.preventDefault();
      closeMenu();
      post({ type: 'dragStart' });
      const move = () => post({ type: 'drag' });
      const up = () => {
        removeEventListener('mousemove', move);
        removeEventListener('mouseup', up);
        post({ type: 'dragEnd' });
      };
      addEventListener('mousemove', move);
      addEventListener('mouseup', up);
    });
  }

  if (WINDOW) {
    // Nothing is written till the dashboard's page sends the note (a note it no longer has isn't made again here).
    windowBar();
    setTop(WINDOW.onTop);
    document.documentElement.classList.toggle('streamer', !!WINDOW.streamer);
    // The window's name follows streamer mode when it is switched later.
    new MutationObserver(() => stamp()).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    loadAll(null);
    render(null);
    // The dashboard's page still loading answers { wait }: asked again a moment later.
    const ask = (tries) => post({ type: 'load' }).then((r) => (r && r.wait && tries > 0 ? new Promise((ok) => setTimeout(ok, 700)).then(() => ask(tries - 1)) : r));
    ask(15).then((r) => {
      if (r && 'onTop' in r) setTop(r.onTop);
      if (r && 'streamer' in r) document.documentElement.classList.toggle('streamer', !!r.streamer);
      let v = null;
      try {
        v = r && typeof r.json === 'string' ? JSON.parse(r.json) : null;
      } catch {}
      if (!v || !Array.isArray(v.notes) || !v.notes.length) {
        const gone = document.createElement('div');
        gone.className = 'np-away';
        gone.textContent = "This note isn't on the dashboard anymore";
        host.replaceChildren(gone);
        post({ type: 'close' });
        return;
      }
      ready = true;
      loadAll(v);
      render(null);
      stamp();
      refocus();
      loaded();
    });
  } else if (STORE) {
    // An empty note until the app's are read (nothing is written till then), and nothing of them in the page's storage:
    // notes written there before the app kept them go to the app once, then leave it.
    const before = readHere();
    const forget = () => {
      try {
        localStorage.removeItem(KEY);
      } catch {}
    };
    loadAll(null);
    render(null);
    STORE.postMessage({ type: 'load' })
      .then(
        (r) => {
          if (r && r.error) unsaved = r.error;
          return r && !r.error && r.json ? JSON.parse(r.json) : null;
        },
        (err) => {
          unsaved = String((err && err.message) || err);
          return null;
        },
      )
      .then((v) => {
        ready = true;
        // The page's own only when the app has none and said so (not when it couldn't read its own just now).
        const carried = !v && !unsaved && before && Array.isArray(before.notes) && before.notes.length ? before : null;
        loadAll(v || carried);
        render(null);
        stamp();
        drawBoard();
        if (carried) write().then((kept) => kept && forget());
        else if (!unsaved) forget();
        loaded();
        // The app opens the notes left out at the last quit, and says which are out (this page loaded again).
        if (NATIVE) toApp({ type: 'notesReady' });
      });
  } else {
    loadAll(readHere());
    render(null);
    loaded();
  }
  // The dashboard asks the app where the level stands (the eye follows); a note's window was told at its start.
  if (NA) NA.postMessage({ type: 'state' }).then(aiApply).catch(() => {});
  return {
    focus: refocus,
    open: undock,
    close: dock,
    mountBoard,
    showBoard,
    hideBoard,
    newNote,
    flush,
    icon: ICON,
    windowNote,
    fromWindow,
    windowClosed,
    windowsOpen,
    removeFromWindow: (id) => removeNote(id),
    agentList,
    agentRead,
    agentApply,
    agentUndo,
    agentSession,
    agentCreate,
    agentPin,
    agentWindow,
    agentIdle,
    setTop,
    setAiHidden,
    aiHiddenSet,
    aiMode: (m) => aiApply({ mode: m }),
    aiState: () => ({ mode: AI.mode, ready: AI.ready, tools: AI.tools, known: AI.known }),
    setAiMode,
    aiAsked,
    openAi,
  };
})();
