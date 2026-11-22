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
//   ⋮⋮ / ⌥⇧↑↓  the grip beside a block (shown when the pointer is on it) drags it, with the blocks indented under it, to
//              the line that shows where it lands; ⌥⇧↑ and ⌥⇧↓ (Alt+Shift) move it a place with the keyboard
// What's written is kept as it's typed, on this computer only (a note you share with friends is also kept on Orbiterm's server, encrypted, for them): by the app, encrypted, in its own folder (in this page's
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
  // The blocks live in a Yjs document (notesync.js, built from mac/notesync): every change below is an operation on it
  // (`model`), and `blocks` is what it reads as, in order. Nothing leaves this computer yet: a private note's document is
  // made from its file's blocks when the note is bound, and written back as the same blocks.
  const NS = window.NoteSync;
  if (!NS) {
    // The page's model didn't load (notesync.js): say so, rather than leaving an empty panel.
    host.textContent = 'Notes could not start: notesync.js did not load. Quit and open Orbiterm again.';
    host.style.cssText = 'padding:12px;color:var(--dim);font-size:12px';
    return null;
  }
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
  // A block of a type this version doesn't know (a newer Orbiterm made it) is kept as it is and drawn as a grey line; it has
  // no text to write in, like a divider.
  const NEWER = {};
  const kind = (type) => TYPES[type] || NEWER;
  const textless = (b) => b.type === 'divider' || !TYPES[b.type];
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
    // Shown only where the app can keep files (canFiles).
    { type: 'file', name: 'File', hint: 'Add a picture or a file', icon: '+', keys: ['file', 'image', 'picture', 'photo', 'attachment', 'upload', 'pdf'] },
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

  // A block to put in the document: its id is its own for good (v4 of the notes' files keeps it), a uuid.
  const mk = (type = 'p', text = '', more) => ({ id: NS.newId(), type, text, checked: false, indent: 0, ...more });
  const level = (n) => Math.max(0, Math.min(4, Math.round(Number(n) || 0)));
  // Blocks as the files keep them: { id, type, text, checked?, indent?, …whatever a newer Orbiterm added }.
  const plain = (list) => list.map((b) => NS.plainOf(b));

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
  let blocks = []; // the live note's blocks as the document reads now: { id, type, text, checked, indent, e }
  let kept = '';
  let model = null; // the live note's document (NoteSync.NoteModel)
  let um = null; // ⌘Z's history: what the user and AI changed here
  let aiUm = null; // the strip's Undo: what AI changed
  let dirty = false; // the document changed and the page hasn't been drawn since
  const noteId = () => `note-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  // A new note's name: note1, note2…, one past the highest such name there is.
  const nextName = (list = notes) => `note${Math.max(0, ...list.map((n) => Number((/^note(\d+)$/.exec(n.name || '') || [])[1]) || 0)) + 1}`;
  const blank = (name = nextName()) => ({ v: VERSION, id: noteId(), name, created: Date.now(), at: 0, blocks: [] });
  // A note's blocks (as its file keeps them) as the blocks to put in the document, each with its id (made here for a block
  // with none, or whose id another block has). A block of a type this version doesn't know is kept whole (see NEWER).
  const liveOf = (list) => {
    const seen = new Set();
    const l = [];
    for (const b of Array.isArray(list) ? list : []) {
      const id = NS.validId(b?.id) && !seen.has(b.id) ? b.id : NS.newId();
      const spec = NS.specOf(b, id);
      if (!spec) continue;
      seen.add(id);
      l.push(spec);
    }
    return l.length ? l : [mk()];
  };
  // A note out in its window has its blocks from there (fromWindow), not the panel's.
  // A note that isn't v4 yet (the app hasn't backed the notes up, so nothing is migrated) is written without the ids made for
  // the page: only those its file had (a newer Orbiterm's blocks) stay.
  const origIds = new WeakMap();
  const bare = (n, list) => {
    if (n.v === VERSION) return list;
    const had = origIds.get(n);
    return list.map((b) => (had && had.has(b.id) ? b : (({ id, ...rest }) => rest)(b)));
  };
  const blocksOf = (n) => bare(n, n === cur && !out.has(n.id) ? plain(blocks) : n.blocks);

  // A note an AI pinned to a terminal (agentSession): that terminal's session name and a label to show. Kept with the note.
  const sessionOf = (n) =>
    typeof n.session === 'string' && n.session && n.session.length <= 100
      ? { session: n.session, sessionLabel: typeof n.sessionLabel === 'string' ? n.sessionLabel.slice(0, 60) : '' }
      : {};

  // A note the user hid from AI (the eye): kept with the note, so the app can read it too (NotesStore, NotesTools). Only the
  // user's own clicks set it (setAiHidden); an AI's tools never touch it, and the app refuses a hidden note's id on every call.
  const hideOf = (n) => (n && n.aiHidden === true ? { aiHidden: true } : {});

  // A note's project: { dir, name }, the one folder it belongs to (a repo's main folder, so its worktrees are the same project,
  // or a plain folder; the app finds it, never the page or an AI). The user's own link, personal and local even on a shared
  // note: it is a path on this computer, so it never goes to the server. Kept with the note like the fields above.
  const projectOf = (n) => {
    const p = n && n.project;
    if (!p || typeof p !== 'object' || typeof p.dir !== 'string' || !p.dir || p.dir.length > 1024) return {};
    const last = p.dir.split(/[\\/]/).filter(Boolean).pop() || p.dir;
    return { project: { dir: p.dir, name: (typeof p.name === 'string' && p.name.trim() ? p.name.trim() : last).slice(0, 60) } };
  };

  const readHere = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch {
      return null;
    }
  };

  // The version of how a note is kept: 4 gives every block an id of its own. A note keeps every field it was read with,
  // those this version doesn't know of too (a newer Orbiterm may have added some), and so does every block.
  const VERSION = 4;
  // A note made v4: ids for the blocks that have none, nothing else touched. Checked before it's kept: the text must read
  // the same (toText) as it did; a note that doesn't stays as it was (v3) and is reported. Whether it changed.
  function migrate(n) {
    if (n.v === VERSION) return false;
    const old = n.blocks;
    const seen = new Set(old.filter((b) => b && typeof b.id === 'string').map((b) => b.id));
    const next = old.map((b) => {
      if (!b || typeof b !== 'object' || NS.validId(b.id)) return b;
      let id = NS.newId();
      while (seen.has(id)) id = NS.newId();
      seen.add(id);
      return { ...b, id };
    });
    const as = (l) => toText(l.filter((b) => b && typeof b === 'object' && typeof b.type === 'string'));
    if (as(old) !== as(next)) {
      console.warn(`notes: ${n.id} stays v3 (its text didn't read the same after the ids)`);
      return false;
    }
    n.blocks = next;
    n.v = VERSION;
    return true;
  }
  function keepNote(n) {
    const o = { ...n, id: n.id, name: typeof n.name === 'string' ? n.name.trim().slice(0, 40) : '', created: Number(n.created) || Number(n.at) || Date.now(), at: Number(n.at) || 0, blocks: Array.isArray(n.blocks) ? n.blocks : [] };
    delete o.session;
    delete o.sessionLabel;
    delete o.aiHidden;
    delete o.project;
    delete o.shared;
    delete o.endedShare;
    delete o.startedShare;
    origIds.set(o, new Set(o.blocks.filter((b) => b && NS.validId(b.id)).map((b) => b.id)));
    return Object.assign(o, sessionOf(n), hideOf(n), projectOf(n), sharedKeep(n.shared));
  }

  function loadAll(v) {
    let list = [];
    let migrated = false;
    if (v && Array.isArray(v.notes)) {
      list = v.notes.filter((n) => n && typeof n.id === 'string').map(keepNote);
    } else if (v && (Array.isArray(v.blocks) || (typeof v.text === 'string' && v.text))) {
      // One page before there were notes (its blocks, or before them its plain text): it's the first note.
      const at = Number(v.at) || 0;
      list = [{ ...blank('note1'), created: at || Date.now(), at, blocks: Array.isArray(v.blocks) ? v.blocks : plain(fromText(v.text)) }];
    }
    // Notes the app has (not the page's own empty ones before they come): v4. Not when the app couldn't copy them first
    // (no `backedUp: true`: the Windows app doesn't yet): they stay as they are till it can.
    if (v && (v.backedUp === true || !STORE)) for (const n of list) migrated = migrate(n) || migrated;
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
    if (v && (unnamed || migrated || !v.ordered)) write();
  }

  // The note being written from now on: its blocks become the live ones (a Yjs document made from them), with a history
  // of their own.
  function bind(n) {
    stopSync();
    cur = n;
    // A document another page (a window) may have written since is read again first: what's drawn meanwhile is the last kept copy.
    const reread = !!n.shared && canShare && !ydocFresh.has(n.id);
    attach(liveOf(n.blocks), n.shared ? { state: reread ? null : ydocs.get(n.id) || null, specs: liveOf(n.blocks), note: n } : null);
    if (reread) {
      ydocFresh.add(n.id);
      askApp('loadY', { id: n.id }).then((r) => {
        if (r && typeof r.b64 === 'string') ydocs.set(n.id, NS.unb64(r.b64));
        else ydocs.delete(n.id);
        if (cur === n && model && placeholder) {
          const keepBlocks = n.blocks;
          bind(n);
          n.blocks = keepBlocks;
          render(null);
        }
      });
    }
    kept = JSON.stringify(plain(blocks));
    lastKind = '';
    lastFocus = null;
    if (n.shared && !reread) startSync(n);
    paintShare();
  }

  // Every note goes to the app, one write after the other. One the app couldn't keep goes again with the next, and the
  // panel's strip says so meanwhile (`unsaved`, the app's reason).
  let writing = Promise.resolve(true);
  let unsaved = '';
  function write() {
    if (!ready) return writing;
    const all = notes.map((n) => ({ ...n, blocks: blocksOf(n) }));
    // The notes' version is the lowest of theirs: the app backs them up until it is 4.
    const json = JSON.stringify({ v: all.every((n) => n.v === VERSION) ? VERSION : 3, ordered: true, pinned, current: cur.id, notes: all });
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
    if (out.has(cur.id) || placeholder) return;
    const json = JSON.stringify(plain(blocks));
    if (json === kept) return;
    kept = json;
    cur.blocks = plain(blocks);
    cur.at = Date.now();
    write();
    stamp();
    drawBoard();
    keepY();
    // Too big to sync: each change tries once more (at most every 30 s), in case it was shortened.
    if (sync && sync.status === 'big' && Date.now() - (sync.bigTry || 0) > 30000) {
      sync.bigTry = Date.now();
      sync.prov.netBack();
    }
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
    const top = blocksOf(n).find((b) => TYPES[b.type] && b.type !== 'divider' && b.text.trim());
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
      // The project, when the note has one, after its name (words, not colour).
      const named = p.project ? `${nameOf(p)} · ${p.project.name}` : nameOf(p);
      meta.textContent = ai ? aiText(ai) : (unsaved ? 'not saved · ' : '') + (edited(p) ? `${named} · ${edited(p)}` : named);
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
  const textEl = (id) => ed.querySelector(`.nb[data-id="${CSS.escape(String(id))}"] .nb-text`);
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
    t._t = text; // what's drawn, for render to see whether the text changed
  }
  // After typing: the links drawn again when they changed, the cursor kept. A named link emptied of its words goes whole.
  function relink(t, b) {
    if (b.type === 'code') return;
    let c = null;
    if (LK_EMPTY.test(b.text)) {
      c = caretIn(t);
      let at = c ? c.start : 0;
      const text = b.text.replace(LK_EMPTY, (m, i) => {
        if (at > i + m.length) at -= m.length;
        else if (at > i) at = i;
        return '';
      });
      LK_EMPTY.lastIndex = 0;
      typed(b, text, at);
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
  // What was typed in a block (its text now, `caret` where the cursor is) into the document: the smallest change, made as
  // typing (the page shows it already).
  function typed(b, text, caret) {
    const t = textEl(b.id);
    const have = model.list().find((x) => x.id === b.id);
    // The screen shows what was last drawn plus what was typed since; a friend's change in the block that wasn't drawn yet (a
    // composition holds the drawing back) must not be taken for something deleted here: only the typed change is applied,
    // at the place it has in the text as it is now.
    const inComp = !!comp && comp.id === b.id && !!t && !!have;
    if (inComp || (t && have && typeof t._t === 'string' && t._t !== have.text)) {
      // During a composition (a shared note) everything is told against the text as it was when it began, and the composed
      // span is kept as two places in the document: each step replaces what the previous step put there.
      const base = inComp ? comp.text : t._t;
      const d = NS.diffText(base, text, caret);
      const c = NS.diffText(base, have.text);
      const rp = inComp ? comp.rps : null;
      const map = (p) => {
        const a = rp && rp[Math.min(p, rp.length - 1)] && model.absPos(rp[Math.min(p, rp.length - 1)]);
        if (a && a.id === b.id) return a.offset;
        return p <= c.at ? p : p >= c.at + c.del ? p - c.del + c.ins.length : c.at + c.ins.length;
      };
      let from;
      let to;
      const cs = inComp && comp.s && model.absPos(comp.s);
      const ce = inComp && comp.e && model.absPos(comp.e);
      if (cs && ce && cs.id === b.id && ce.id === b.id) {
        from = cs.offset;
        to = Math.max(from, ce.offset);
      } else {
        from = map(d.at);
        to = Math.max(from, map(d.at + d.del));
      }
      model.tx(() => model.textReplace(b.id, from, to, d.ins), 'input');
      if (inComp) {
        comp.s = model.relPos(b.id, from, 0);
        comp.e = model.relPos(b.id, from + d.ins.length, -1);
      }
      t._t = text;
      return;
    }
    model.tx(() => model.textSet(b.id, text, caret), 'input');
    if (t) t._t = text; // drawn already
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

  // The page drawn from `blocks`. A block already drawn keeps its element (found by its id) unless its kind changed; its text
  // is drawn again only if it differs from what's drawn, and not while the user composes in it (an accent, Japanese…: the
  // composition ends first, and the text is brought in then). Elements are moved only when the order changed.
  function render(focus) {
    dirty = false;
    const top = ed.scrollTop;
    const have = new Map();
    for (const el of [...ed.children]) if (el.dataset.id) have.set(el.dataset.id, el);
    const blank = blocks.length === 1 && blocks[0].type === 'p' && !blocks[0].text;
    const counts = [];
    const els = [];
    for (const b of blocks) {
      let num = 0;
      if (b.type === 'num') {
        counts.length = b.indent + 1;
        num = counts[b.indent] = (counts[b.indent] || 0) + 1;
      } else counts.length = kind(b.type).list ? b.indent : 0;
      const fl = b.type === 'file' ? fOf(b) : null;
      const sig = `${b.type}|${b.indent}|${b.checked ? 1 : 0}|${blank ? 1 : 0}${fl ? `|${fl.sha}|${fl.id || ''}|${fl.local ? 1 : 0}|${fl.fail || ''}|${fl.name}` : ''}`;
      let el = have.get(b.id);
      if (el && el._sig === sig) {
        have.delete(b.id);
        const mark = el.querySelector(':scope > .nb-mark');
        if (b.type === 'num' && mark && mark.textContent !== `${num}.`) mark.textContent = `${num}.`;
        const t = el.querySelector(':scope > .nb-text');
        if (t && t._t !== b.text && !(composing && t === document.activeElement)) {
          paint(t, b.text, b.type);
          t.classList.toggle('is-empty', !b.text);
        }
      } else {
        el = blockEl(b, num, blank);
        el._sig = sig;
      }
      els.push(el);
    }
    // Blocks gone, then what stayed in its order (a block moved is the only one moved).
    const kept = new Set(els);
    for (const el of have.values()) if (!kept.has(el)) el.remove();
    let at = ed.firstElementChild;
    for (const el of els) {
      if (el === at) at = at.nextElementSibling;
      else ed.insertBefore(el, at);
    }
    ed.classList.toggle('blank', blank);
    ed.scrollTop = top;
    if (placeholder) setEditable(false);
    if (focus) place(textEl(focus.id), focus.at);
    if (canFiles && blocks.some((b) => b.type === 'file')) refreshHave();
    liveName();
    if (sync) drawCursors();
  }

  function blockEl(b, num, blank) {
    const el = document.createElement('div');
    el.className = `nb nb-${TYPES[b.type] ? b.type : 'newer'}${b.checked ? ' done' : ''}`;
    el.dataset.id = b.id;
    if (b.indent) el.style.setProperty('--ind', b.indent);
    if (b.type === 'divider') {
      el.setAttribute('contenteditable', 'false');
      el.innerHTML = '<hr>';
      return el;
    }
    if (b.type === 'file' && fOf(b) && typeof fOf(b).sha === 'string') {
      // A file: a card (a picture is drawn in place), nothing to type in.
      el.className = 'nb nb-file';
      el.setAttribute('contenteditable', 'false');
      el._f = fOf(b);
      paintFile(el);
      return el;
    }
    if (!TYPES[b.type]) {
      // Written by a newer Orbiterm: kept as it is, there is nothing here to edit.
      el.setAttribute('contenteditable', 'false');
      el.innerHTML = '<div class="nb-newer-note">This block needs a newer Orbiterm</div>';
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
    while (blocks[i] && textless(blocks[i])) i += dir;
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

  // ---------- the document, and back and forth ----------
  // The live note's document: its blocks are `blocks` from every change on (`syncBlocks`, which keeps each block's object
  // while it lives, so one held while a change is made still reads what's there). A change the user's page made is drawn by
  // whoever made it (`changed`, which gives the cursor its place); one made some other way (a history step, later a friend's)
  // is drawn when the page next gets to it, a moment later.
  function syncBlocks() {
    let list = model.list();
    // A shared note whose text hasn't come yet is not made a first block (it would be one the others don't have): its last kept
    // copy is drawn, not editable, until the first sync brings it.
    if (!list.length && model.shared && !model.filled) {
      placeholder = true;
      blocks = (heldSpecs.length ? heldSpecs : [mk()]).map((b) => ({ ...b }));
      return;
    }
    placeholder = false;
    if (!list.length) {
      model.tx(() => model.insert(null, mk()), 'init');
      list = model.list();
    }
    const was = new Map(blocks.map((b) => [b.id, b]));
    blocks = list.map((d) => {
      const b = was.get(d.id);
      if (!b) return { ...d };
      Object.assign(b, d);
      return b;
    });
  }
  // What an AI's change touched, so only the state that was in it is let go: { hit: ids changed or gone, tail: it only added
  // blocks after the last }. No `what`: everything.
  function staleUi(what) {
    const had = document.activeElement === clip || lkBox.contains(document.activeElement);
    const gone = (id) => !what || what.hit.has(id);
    let cleared = false;
    if (part && (!what || !what.tail || gone(part.a.id) || gone(part.z.id))) {
      endPart();
      cleared = true;
    }
    if (allSel && (!what || !what.tail || blocks.slice(sel[0], sel[1] + 1).some((b) => gone(b.id)))) {
      letGo();
      cleared = true;
    }
    if (lkAt && gone(lkAt.id)) {
      lkClose();
      cleared = true;
    }
    if (menu && gone(menu.id)) {
      closeMenu();
      cleared = true;
    }
    if (cleared && had) refocus();
  }
  let pendingFocus = null; // where the cursor was just before the change being made: ⌘Z brings it back there
  let popped = null; // the history step just taken
  function attach(specs, sh) {
    if (model) model.destroy();
    heldSpecs = sh ? sh.specs : [];
    placeholder = false;
    model = new NS.NoteModel(sh ? [] : specs);
    if (sh) {
      model.shared = true;
      model.account = (sh.note.shared && sh.note.shared.me) || '';
      if (sh.state) model.applyState(sh.state, 'init');
    }
    um = model.undoManager();
    aiUm = model.aiUndoManager();
    um.on('stack-item-added', (e) => e.stackItem.meta.set('f', pendingFocus));
    um.on('stack-item-popped', (e) => (popped = e.stackItem));
    blocks = [];
    syncBlocks();
    model.doc.on('beforeTransaction', (tr) => {
      if (sync && tr.origin === sync.prov) remoteCaret = captureCaret();
    });
    model.doc.on('afterTransaction', (tr) => {
      const wasPlaceholder = placeholder;
      const was = new Map(blocks.map((b) => [b.id, `${b.type}|${b.indent}|${b.checked}|${b.text}`]));
      const wasLast = blocks.length ? blocks[blocks.length - 1].id : null;
      syncBlocks();
      if (canFiles && tr.origin !== 'input') {
        filesChanged();
        refreshHave();
      }
      // Typing is drawn already; the rest waits for whoever made the change to draw it (changed), or is drawn at once after.
      if (tr.origin === 'init' || tr.origin === 'input') return;
      // Something else than the user changed the note (an AI): a place the page holds (a selection across blocks, the link
      // box, the "/" menu, blocks lit as selected) may not be where it was, so they let go.
      if (tr.origin instanceof NS.AiOrigin) {
        const hit = new Set();
        const now = new Set(blocks.map((b) => b.id));
        for (const [id, sig] of was) if (!now.has(id)) hit.add(id);
        let added = 0;
        for (const b of blocks) {
          const w = was.get(b.id);
          if (w === undefined) added++;
          else if (w !== `${b.type}|${b.indent}|${b.checked}|${b.text}`) hit.add(b.id);
        }
        // Only blocks added after what was last: nothing that held a place moved.
        const k = wasLast ? blocks.findIndex((b) => b.id === wasLast) : -1;
        const tail = hit.size === 0 && (!wasLast || (k >= 0 && blocks.length - 1 - k === added));
        staleUi({ hit, tail });
      }
      dirty = true;
      // A friend's change: kept like any, and drawn with my cursor where the letters it was between are.
      const remote = !!sync && tr.origin === sync.prov;
      const rc = remote ? remoteCaret : null;
      remoteCaret = null;
      if (remote) later();
      queueMicrotask(() => {
        if (!dirty) return;
        render(null);
        if (rc && !composing) restoreCaret(rc);
        if (wasPlaceholder && !placeholder) setEditable(true);
        if (remote) drawCursors();
      });
    });
  }

  // Typing counts as one step until it pauses; every change to the blocks themselves is a step of its own.
  let lastKind = '';
  function snapFocus() {
    const t = document.activeElement && document.activeElement.closest && document.activeElement.closest('.np-ed .nb-text');
    const b = t && blockOf(t);
    return b ? { id: b.id, i: idx(b.id), at: caretIn(t)?.start || 0 } : null;
  }
  // Called just before a change: where the cursor is now (⌘Z gives it back), and whether the change is a step of its own.
  function record(kind) {
    pendingFocus = snapFocus();
    if (kind === 'op' || lastKind !== 'type') um.stopCapturing();
    lastKind = kind;
  }
  // The cursor for a history step: where it was (a step taken with no cursor in the page keeps the cursor where it is now; on
  // a divider it goes to the text nearest), so ⌘Z and ⌘⇧Z go on working.
  function stepTaken(was) {
    const here = was || snapFocus();
    lastKind = '';
    let i = -1;
    if (here) {
      i = here.id ? idx(here.id) : -1;
      if (i < 0) i = Math.min(here.i, blocks.length - 1);
    }
    const f = i < 0 ? null : blocks.slice(i).find((x) => !textless(x)) || blocks.slice(0, i).reverse().find((x) => !textless(x));
    render(f ? { id: f.id, at: f === blocks[i] ? Math.min(here.at, f.text.length) : 0 } : null);
    if (!f && document.activeElement === clip) refocus();
    later();
  }
  // A history step that changes nothing (an AI change the strip's Undo already took back) is passed over to the next.
  function step(run, can) {
    pendingFocus = snapFocus();
    const was = JSON.stringify(plain(blocks));
    let last = null;
    for (let i = 0; i < 20 && can(); i++) {
      popped = null;
      run();
      if (!popped) break;
      last = popped;
      if (JSON.stringify(plain(blocks)) !== was) break;
    }
    if (last) stepTaken(last.meta.get('f'));
  }
  function undo() {
    step(() => um.undo(), () => um.canUndo());
  }
  function redo() {
    step(() => um.redo(), () => um.canRedo());
  }

  // ---------- the blocks changed ----------
  function changed(focus) {
    render(focus);
    later();
  }

  // What each key does is an operation on the document (`model`); `changed` then draws it, the cursor at `focus`.
  function enter(b, c) {
    record('op');
    const list = kind(b.type).list;
    if (list && !b.text) {
      // An empty item ends the list: a level out first, then plain text.
      if (b.indent) model.setIndent(b.id, b.indent - 1);
      else model.setBlock(b.id, { type: 'p', checked: false });
      return changed({ id: b.id, at: 0 });
    }
    const head = b.text.slice(0, c.start);
    const tail = b.text.slice(c.end);
    if (!head && tail) {
      // Enter at a block's start opens an empty one above it.
      const above = blocks[idx(b.id) - 1];
      model.insert(above ? above.id : null, mk(list ? b.type : 'p', '', { indent: b.indent }));
      return changed({ id: b.id, at: 0 });
    }
    const next = mk(list ? b.type : 'p', '', { indent: b.indent });
    model.tx(() => {
      if (c.end > c.start) model.textDelete(b.id, c.start, c.end - c.start);
      model.split(b.id, c.start, next);
    });
    changed({ id: next.id, at: 0 });
  }

  function backspace(b) {
    const i = idx(b.id);
    const prev = blocks[i - 1];
    if (b.type === 'p' && !b.indent && !prev) return;
    // A block from a newer Orbiterm above isn't ours to join or remove.
    if (b.type === 'p' && !b.indent && prev && !TYPES[prev.type] && prev.type !== 'file') return;
    record('op');
    if (b.type !== 'p') {
      model.setBlock(b.id, { type: 'p', checked: false });
      return changed({ id: b.id, at: 0 });
    }
    if (b.indent) {
      model.setIndent(b.id, b.indent - 1);
      return changed({ id: b.id, at: 0 });
    }
    if (prev.type === 'divider' || prev.type === 'file') {
      model.remove(prev.id);
      return changed({ id: b.id, at: 0 });
    }
    const at = prev.text.length;
    model.merge(prev.id, b.id);
    changed({ id: prev.id, at });
  }

  function del(b) {
    const i = idx(b.id);
    const next = blocks[i + 1];
    if (!next || !TYPES[next.type]) return;
    record('op');
    const at = b.text.length;
    if (next.type !== 'divider') model.merge(b.id, next.id);
    else model.remove(next.id);
    changed({ id: b.id, at });
  }

  function indentBy(b, d, at) {
    const n = level(b.indent + d);
    if (n === b.indent) return;
    record('op');
    model.setIndent(b.id, n);
    changed({ id: b.id, at });
  }

  // "/divider" or "---": a line across, and the writing goes on under it. An empty block becomes the line itself.
  function divider(b) {
    let next = null;
    model.tx(() => {
      let at = b.id;
      if (!b.text.trim()) {
        model.textDelete(b.id, 0, b.text.length);
        model.setBlock(b.id, { type: 'divider', checked: false, indent: 0 });
      } else at = model.insert(b.id, mk('divider'))[0];
      const list = model.list();
      next = list[list.findIndex((x) => x.id === at) + 1];
      if (!next || textless(next)) {
        next = mk('p');
        model.insert(at, next);
      }
    });
    changed({ id: next.id, at: 0 });
  }

  function retype(b, type, at) {
    if (type === 'divider') return divider(b);
    if (type === 'file') return void pickFiles(b);
    model.setBlock(b.id, { type, checked: type === 'todo' ? b.checked : false, indent: type.startsWith('h') || type === 'code' ? 0 : undefined });
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
    model.textDelete(b.id, 0, c.start);
    retype(b, hit[1], 0);
    return true;
  }

  // ---------- files in notes ----------
  // A file block is { type: 'file', f: { name, size, mime, sha, local?, id?, by?, fail? } } (the model keeps `f` as a field it
  // doesn't read, so a version without files draws it as a block it can't edit). A private note's file stays on this computer
  // (`local`: the app keeps it, encrypted, under its SHA-256); a shared note's goes to the server's storage from the app's native side
  // (never from this page), after which the block has `id` and the app's copy is a cache. Only the app touches the bytes: the page
  // asks (attPick, attAdd, attHas, attRead, attSave, attUpload, attDownload, attRemove, attForget).
  const FILE_MAX = 20 * 1024 * 1024;
  const PICTURE_MAX = 8 * 1024 * 1024;
  const PICTURES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
  const FILE_SAY = {
    too_big: 'This file is over 20 MB. Choose a smaller file.',
    blocked_type: 'Apps and installers (.exe, .dmg…) can’t be added, to keep your friends safe.',
    quota_full: 'Your storage is full (500 MB). Remove files from your notes to make room.',
    day_limit: 'You’ve added a lot today. Try again tomorrow.',
    attachments_off: 'Attachments aren’t available yet.',
    offline: 'No connection right now. It will try again when you’re back online.',
    not_found: 'This file was removed.',
    damaged: 'This file didn’t arrive whole. Try again.',
    empty: 'This file is empty.',
    download_limit: 'You’ve downloaded a lot today. Try again tomorrow.',
    sign_in: 'Sign in to share files.',
    too_many_downloads: 'Still busy fetching files. Try again in a moment.',
  };
  const fileSay = (code) => FILE_SAY[code] || 'This file couldn’t be added. Try again in a moment.';
  // What a friend sees when the one who added the file couldn't share it.
  const FILE_FAIL = { quota_full: 'File not shared (storage full)', day_limit: 'File not shared yet', too_big: 'File not shared (too big)', blocked_type: 'File not shared' };
  const GLYPH = { file: '', save: '', warn: '' };
  let canFiles = false; // the app can keep files (Windows says no until it can)
  const fstate = new Map(); // sha -> { phase: 'up' | 'down' } or { error }
  const have = new Set(); // shas the app is known to hold
  const askedHave = new Map(); // sha -> when the app was last asked
  const names = new Map(); // sha -> the name the server has for a file fetched from it (a block's name can be written by any member)
  // The blocks I added on this computer that haven't gone up yet. Only these are uploaded: a block in a shared note that says
  // "local" was written by someone, and isn't a request for this computer to send anything. The list is the app's (one for the
  // dashboard and every note window, so none of them can drop another's entries), asked for when it's needed.
  const addAdds = (ids) => (ids.length ? askApp('attAdds', { add: ids }) : Promise.resolve(null));
  const dropAdd = (id) => askApp('attAdds', { remove: [id] });
  const readAdds = async () => {
    const r = await askApp('attAdds');
    return new Set((r && Array.isArray(r.ids) && r.ids) || []);
  };
  const pictureUrls = new Map(); // sha -> blob address of a picture drawn (the oldest are let go)
  const fOf = (b) => (b && (b.f || (b.e && b.e.f))) || null;
  const sizeText = (n) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(n < 10485760 ? 1 : 0)} MB`);
  const kindText = (f) => {
    const x = (/\.([A-Za-z0-9]{1,6})$/.exec(f.name || '') || [])[1];
    return x ? x.toUpperCase() : 'File';
  };
  const hasFiles = (dt) => !!dt && [...(dt.types || [])].includes('Files');
  const readB64 = (file) =>
    new Promise((done) => {
      const r = new FileReader();
      r.onload = () => done(String(r.result).split(',')[1] || '');
      r.onerror = () => done('');
      r.readAsDataURL(file);
    });

  // The card (or the picture) of one file block, drawn from what the block says and what this page knows (fstate, have).
  function paintFile(el) {
    const f = el._f;
    if (!f) return;
    const st = fstate.get(f.sha) || {};
    const shared = !!(cur && cur.shared);
    const mine = !f.by || f.by === myId();
    let note = '';
    let warn = false;
    if (st.phase === 'up') note = 'Uploading…';
    else if (st.phase === 'down') note = 'Downloading…';
    else if (st.error) ((note = fileSay(st.error)), (warn = true));
    else if (f.fail) ((note = FILE_FAIL[f.fail] || 'File not shared'), (warn = true));
    else if (f.local && shared) note = mine ? 'Waiting to upload' : 'Not shared yet';
    else if (f.local) note = have.has(f.sha) || have.size === 0 ? 'On this computer' : 'Not on this computer';
    const pic = PICTURES.has(f.mime) && f.size <= PICTURE_MAX;
    const url = pictureUrls.get(f.sha);
    const canSave = (have.has(f.sha) || !!f.id) && !st.phase;
    const retry = !!st.error && st.error !== 'not_found';
    const meta = `${esc(kindText(f))} · ${esc(sizeText(f.size || 0))}${note ? ` · <span class="nf-note${warn ? ' warn' : ''}">${esc(note)}</span>` : ''}`;
    el.classList.toggle('nf-pic', pic && !!url);
    el.innerHTML =
      `<div class="nf" role="group" aria-label="File: ${esc(f.name)}">` +
      (pic && url
        ? `<span class="nf-picwrap"><img class="nf-img" alt="${esc(f.name)}" draggable="false"></span>`
        : `<span class="nf-icon" aria-hidden="true"><i class="np-glyph">${GLYPH.file}</i></span>`) +
      `<span class="nf-body"><span class="nf-name">${esc(f.name)}</span><span class="nf-meta">${meta}</span></span>` +
      `<span class="nf-acts">` +
      (retry ? '<button type="button" class="nf-btn" data-nf="retry">Try again</button>' : '') +
      (canSave ? `<button type="button" class="nf-btn" data-nf="save" title="Save to Downloads" aria-label="Save ${esc(f.name)} to Downloads"><i class="np-glyph" aria-hidden="true">${GLYPH.save}</i>Save</button>` : '') +
      `<button type="button" class="nf-btn nf-x" data-nf="remove" title="Remove from the note" aria-label="Remove ${esc(f.name)} from the note">${TRASH}</button>` +
      `</span></div>`;
    if (pic && url) el.querySelector('.nf-img').src = url;
    else if (pic && !st.phase && !st.error && (have.has(f.sha) || f.id)) drawPicture(el, f);
  }
  function paintFiles() {
    for (const el of ed.querySelectorAll('.nb-file')) paintFile(el);
  }
  // A picture is fetched once (from the server if this computer hasn't it yet) and drawn from a blob.
  async function drawPicture(el, f) {
    if (el._loading) return;
    el._loading = true;
    try {
      if (!(await ensureLocal(f))) return;
      const r = await askApp('attRead', { sha: f.sha });
      if (!r || typeof r.b64 !== 'string') return;
      pictureUrls.set(f.sha, URL.createObjectURL(new Blob([NS.unb64(r.b64)], { type: f.mime })));
      for (const old of [...pictureUrls.keys()].slice(0, Math.max(0, pictureUrls.size - 30))) {
        URL.revokeObjectURL(pictureUrls.get(old));
        pictureUrls.delete(old);
      }
      paintFiles();
    } finally {
      el._loading = false;
    }
  }
  // The app holds the file: already, or after it's fetched from the server (checked against the size and SHA-256 there).
  async function ensureLocal(f) {
    if (have.has(f.sha)) return true;
    const h = await askApp('attHas', { shas: [f.sha] });
    if (h && Array.isArray(h.have) && h.have.includes(f.sha)) return (have.add(f.sha), true);
    if (!f.id) return false;
    fstate.set(f.sha, { phase: 'down' });
    paintFiles();
    const r = await askApp('attDownload', { att: f.id });
    if (!r || r.error || r.sha !== f.sha) {
      fstate.set(f.sha, { error: (r && r.error) || (r && r.sha !== f.sha ? 'damaged' : 'offline') });
      paintFiles();
      return false;
    }
    fstate.delete(f.sha);
    have.add(f.sha);
    if (typeof r.name === 'string' && r.name) names.set(f.sha, r.name);
    paintFiles();
    return true;
  }
  // The note's files fetched to this computer (before it stops being shared, or this account leaves it). False when one that
  // is still on the server couldn't be fetched; a file that was removed doesn't count.
  // '' when all are here, else why not ('download_limit' when today's allowance is used up, otherwise 'offline').
  async function copyFilesHere() {
    if (!canFiles) return '';
    for (const b of blocks) {
      const f = fOf(b);
      if (!f || !f.id) continue;
      if (await ensureLocal(f)) continue;
      const why = (fstate.get(f.sha) || {}).error;
      if (why !== 'not_found') return why === 'download_limit' ? why : 'offline';
    }
    return '';
  }
  const copyFailText = (why) => (why === 'download_limit' ? FILE_SAY.download_limit : 'Some files couldn’t be copied to this computer yet. Try again when you’re online.');
  async function saveFile(f) {
    if (!(await ensureLocal(f))) return;
    const r = await askApp('attSave', { sha: f.sha, name: names.get(f.sha) || f.name });
    if (r && r.ok) tellUser(`Saved to Downloads as ${r.name}.`);
    else tellUser('Couldn’t save the file. Check that Downloads can be written to.');
  }
  // Which of the blocks' files the app holds (so a card says "Not on this computer" only when it's true).
  async function refreshHave() {
    if (!canFiles) return;
    // Each sha is asked about at most every 5 seconds (a file the app doesn't hold is asked about again later, not on every draw).
    const now = Date.now();
    const shas = [...new Set(blocks.map((b) => fOf(b)).filter(Boolean).map((f) => f.sha))].filter((s) => !have.has(s) && now - (askedHave.get(s) || 0) > 5000);
    if (!shas.length) return;
    for (const s of shas) askedHave.set(s, now);
    const h = await askApp('attHas', { shas });
    if (h && Array.isArray(h.have)) for (const s of h.have) have.add(s);
    paintFiles();
  }

  // Files added: blocks after `afterId`, a text block under them to go on writing in. `from`: an empty text block that was the
  // "/file" line, which the files take the place of.
  function insertFiles(afterId, files, from) {
    if (!model || !model.has(afterId)) return;
    const me = myId();
    const specs = files.map((f) => mk('file', '', { e: { f: { name: f.name, size: f.size, mime: f.mime, sha: f.sha, local: true, ...(me ? { by: me } : {}) } } }));
    record('op');
    let after = null;
    let added = [];
    model.tx(() => {
      const ids = model.insert(afterId, specs);
      added = ids;
      const last = ids[ids.length - 1];
      const list = model.list();
      let next = list[list.findIndex((x) => x.id === last) + 1];
      if (!next || textless(next)) {
        next = mk('p');
        model.insert(last, next);
      }
      after = next.id;
      if (from && from.type === 'p' && !from.text && from.id === afterId) model.remove(from.id);
    });
    changed({ id: after, at: 0 });
    for (const f of files) have.add(f.sha);
    addAdds(added).then(() => uploadPending());
  }
  const askFirstError = (errors) => errors && errors.length && tellUser(fileSay(errors[0]));
  // "/file": the app's own file picker (the page never sees a path).
  async function pickFiles(b) {
    if (!canFiles) return tellUser('Files can’t be added here yet.');
    const r = await askApp('attPick');
    if (!r) return;
    askFirstError(r.errors);
    if (Array.isArray(r.files) && r.files.length) insertFiles(b.id, r.files, blocks[idx(b.id)]);
  }
  // Files dropped or pasted: read here (a File can't be given to the app by path) and handed over one at a time.
  async function addFileObjects(list, afterId) {
    if (!canFiles) return tellUser('Files can’t be added here yet.');
    const added = [];
    const errors = [];
    for (const file of list.slice(0, 10)) {
      if (file.size > FILE_MAX) {
        errors.push('too_big');
        continue;
      }
      const b64 = await readB64(file);
      const r = b64 ? await askApp('attAdd', { name: file.name || 'pasted file', mime: file.type || '', b64 }) : null;
      if (!r || r.error) errors.push((r && r.error) || 'read');
      else added.push(r);
    }
    askFirstError(errors);
    if (added.length) insertFiles(afterId, added);
  }

  // A shared note's files go up one at a time: the ones I added that have no `id` yet. Again when the line is live (a note shared
  // while offline, a file added before the share).
  let uploading = false;
  async function uploadPending() {
    const n = cur;
    if (uploading || !n || !n.shared || !canFiles || placeholder || !model) return;
    uploading = true;
    try {
      for (const [k, v] of fstate) if (v.error === 'offline') fstate.delete(k);
      for (;;) {
        if (cur !== n || !n.shared || !model) break;
        const me = myId();
        const adds = await readAdds();
        if (cur !== n || !n.shared || !model) break;
        const next = blocks.find((b) => {
          const f = fOf(b);
          return f && f.local && !f.id && !f.fail && adds.has(b.id) && !(fstate.get(f.sha) || {}).error;
        });
        if (!next) break;
        const f = fOf(next);
        fstate.set(f.sha, { phase: 'up' });
        paintFiles();
        const r = await askApp('attUpload', { note: n.shared.id, sha: f.sha, name: f.name, mime: f.mime });
        if (!r || r.error || !r.att) {
          const code = (r && r.error) || 'offline';
          fstate.set(f.sha, { error: code });
          // A refusal the friends should see is kept in the block; a missing connection or the storage being off is not.
          if (FILE_FAIL[code] && model.has(next.id)) model.as('local', () => model.setExtra(next.id, { f: { ...f, fail: code } }));
          paintFiles();
          if (code === 'offline') break;
          continue;
        }
        fstate.delete(f.sha);
        dropAdd(next.id);
        if (model.has(next.id)) model.as('local', () => model.setExtra(next.id, { f: { ...f, id: r.att, by: me || f.by, local: undefined, fail: undefined } }));
        // The block went while the file was going up: its room is given back (unless another block names the same file).
        else if (!blocks.some((b) => (fOf(b) || {}).id === r.att)) askApp('attRemove', { att: r.att });
        paintFiles();
      }
    } finally {
      uploading = false;
    }
  }

  // A file block gone from a shared note frees its room on the server, after a pause (⌘Z brings it back within it). Whoever
  // sees it gone and is the one who added it, or the note's owner, asks.
  let seenFiles = new Map();
  let seenNote = '';
  function filesChanged() {
    if (!canFiles || !cur || !cur.shared || placeholder) {
      seenFiles = new Map();
      seenNote = '';
      return;
    }
    const now = new Map();
    for (const b of blocks) {
      const f = fOf(b);
      if (f && f.id) now.set(f.id, f);
    }
    if (seenNote === cur.shared.id) {
      const n = cur;
      for (const [id, f] of seenFiles) {
        if (now.has(id)) continue;
        if (!(f.by === myId() || n.shared.mine)) continue;
        setTimeout(() => {
          if (cur !== n || blocks.some((b) => (fOf(b) || {}).id === id)) return;
          askApp('attRemove', { att: id });
        }, 15000);
      }
    }
    seenFiles = now;
    seenNote = cur.shared.id;
  }
  // The files I have on the server in this note that no block names (a block removed while I was offline, or while the file was
  // going up) give their room back. A file less than 10 minutes old is left (its block may be on its way); one taken by mistake
  // comes back on its own if a block asks for it (the server keeps it a week).
  async function reconcileFiles(n) {
    if (!canFiles || cur !== n || !n.shared || placeholder) return;
    const r = await netApi('GET', `v1/notes/${n.shared.id}/attachments`);
    if (cur !== n || placeholder || !r || r.error || !Array.isArray(r.files)) return;
    const named = new Set(blocks.map((b) => (fOf(b) || {}).id).filter(Boolean));
    for (const x of r.files) {
      // A removed file whose block is back (⌘Z, a restored version) is brought back; a live one no block names goes.
      if (x.status === 'deleted') named.has(x.id) && askApp('attRemove', { att: x.id, restore: true });
      else if (x.age > 600 && !named.has(x.id)) askApp('attRemove', { att: x.id });
    }
  }
  // Nothing of a note's files stays when this account is out of it (the app keeps a file other notes name).
  function forgetFiles(n) {
    if (!canFiles) return;
    const mine = new Set(blocksOf(n).map((b) => fOf(b)).filter(Boolean).map((f) => f.sha));
    for (const o of notes) if (o !== n) for (const b of blocksOf(o)) mine.delete((fOf(b) || {}).sha);
    if (mine.size) askApp('attForget', { shas: [...mine] });
  }
  // A note that is private again keeps its files here: they become the note's own.
  const localFiles = (list) => list.map((b) => (b.type === 'file' && b.f ? { ...b, f: { ...b.f, local: true, id: undefined, fail: undefined } } : b));

  ed.addEventListener('dragover', (e) => {
    if (hasFiles(e.dataTransfer)) e.preventDefault();
  });
  ed.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('[data-nf]');
    const el = btn && btn.closest('.nb-file');
    const f = el && el._f;
    if (!f) return;
    e.preventDefault();
    const act = btn.dataset.nf;
    if (act === 'save') saveFile(f);
    else if (act === 'retry') {
      fstate.delete(f.sha);
      paintFiles();
      uploadPending();
      if (f.id) paintFiles();
    } else if (act === 'remove') {
      const b = blocks[idx(el.dataset.id)];
      if (!b) return;
      record('op');
      model.remove(b.id);
      changed(null);
    }
  });

  // ---------- the "/" menu ----------
  const menuEl = document.createElement('div');
  menuEl.className = 'np-menu';
  menuEl.hidden = true;
  menuEl.setAttribute('role', 'listbox');
  document.body.appendChild(menuEl);
  let menu = null; // { id, from, q, items, active }

  function match(q) {
    const all = COMMANDS.filter((c) => c.type !== 'file' || canFiles);
    if (!q) return all;
    const rank = (c) => {
      const name = c.name.toLowerCase();
      if (name.startsWith(q) || c.keys.some((k) => k === q)) return 0;
      if (c.keys.some((k) => k.startsWith(q)) || name.split(/[\s-]/).some((w) => w.startsWith(q))) return 1;
      return name.includes(q) ? 2 : 9;
    };
    return all.map((c) => [rank(c), c]).filter(([r]) => r < 9).sort((a, b) => a[0] - b[0]).map(([, c]) => c);
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
    model.textDelete(b.id, m.from, Math.max(end, m.from) - m.from);
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
        // A block from a newer Orbiterm isn't text: it's left out (it stays in the note).
        if (!TYPES[b0.type]) return null;
        // Kept blocks leave out a zero indent (plain), so it's read as 0 here.
        const b = { ...b0, indent: b0.indent || 0 };
        const pad = '  '.repeat(b.indent);
        if (b.type === 'num') {
          counts.length = b.indent + 1;
          counts[b.indent] = (counts[b.indent] || 0) + 1;
        } else counts.length = kind(b.type).list ? b.indent : 0;
        if (b.type === 'h1' || b.type === 'h2' || b.type === 'h3') return `${'#'.repeat(Number(b.type[1]))} ${b.text}`;
        if (b.type === 'todo') return `${pad}- [${b.checked ? 'x' : ' '}] ${b.text}`;
        if (b.type === 'bullet') return `${pad}- ${b.text}`;
        if (b.type === 'num') return `${pad}${counts[b.indent]}. ${b.text}`;
        if (b.type === 'quote') return b.text.split('\n').map((l) => `> ${l}`).join('\n');
        if (b.type === 'code') return `\`\`\`\n${b.text}\n\`\`\``;
        if (b.type === 'divider') return '---';
        if (b.type === 'file') return `[file: ${(fOf(b) || {}).name || 'file'}]`;
        return pad + b.text;
      })
      .slice(from)
      .filter((l) => l !== null)
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
    pendingFocus = { id: blocks[a]?.id, i: a, at: 0 }; // undo puts the cursor at the first of them
    letGo();
    let at = null;
    model.tx(() => {
      model.remove(blocks.slice(a, b + 1).map((x) => x.id));
      const list = model.list();
      at = list.slice(Math.min(a, list.length - 1)).find((x) => !textless(x)) || [...list].reverse().find((x) => !textless(x));
      if (!at) {
        at = mk();
        model.insert(list.length ? list[list.length - 1].id : null, at);
      }
    });
    changed({ id: at.id, at: 0 });
  }
  function shiftSel(d) {
    record('op');
    const [a, b] = sel;
    model.tx(() => {
      for (const x of blocks.slice(a, b + 1)) if (TYPES[x.type] && !/^(h\d|code|divider)$/.test(x.type)) model.setIndent(x.id, level(x.indent + d));
    });
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
  // The text from place `a` to place `z` (a block and a place in its text each) out of the document: the first block keeps
  // its text before it and takes what the last had after it; the blocks between go. `ia` and `iz` are their positions.
  function removePart(a, z, ia, iz) {
    model.tx(() => {
      const first = blocks[ia];
      if (ia === iz) return model.textDelete(first.id, a.at, z.at - a.at);
      model.textDelete(first.id, a.at, first.text.length - a.at);
      model.textDelete(blocks[iz].id, 0, z.at);
      model.remove(blocks.slice(ia + 1, iz).map((x) => x.id));
      model.merge(first.id, blocks[iz].id);
    });
  }
  function cutPart(ins) {
    const { a, z } = part;
    const ia = idx(a.id);
    const iz = idx(z.id);
    endPart();
    if (ia < 0 || iz < 0) return; // a block it was in is gone (a note pinned or deleted meanwhile)
    record('op');
    pendingFocus = { id: a.id, i: ia, at: a.at }; // undo puts the cursor back where the selection began
    if (ins) lastKind = 'type'; // what's typed on after it is the same step: one ⌘Z brings the selection's text back
    const first = blocks[ia];
    removePart(a, z, ia, iz);
    if (ins) model.textInsert(first.id, a.at, ins);
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
    pendingFocus = { id: a.id, i: ia, at: a.at };
    const first = blocks[ia];
    const head = first.text.slice(0, a.at);
    removePart(a, z, ia, iz);
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
    const text = blocks.slice(sel[0], sel[1] + 1).filter((x) => !textless(x));
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
    model.tx(() => {
      const before = blocks[a - 1];
      model.remove(blocks.slice(a, b + 1).map((x) => x.id));
      model.insert(before ? before.id : null, made);
    });
    const last = made.length ? blocks[idx(made[made.length - 1].id)] : blocks[Math.min(a, blocks.length - 1)];
    changed(textless(last) ? null : { id: last.id, at: last.text.length });
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
    typed(b, read(t), caretIn(t)?.start);
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
    // ⌥⇧↑ and ⌥⇧↓ take the block one place up or down.
    if (e.altKey && e.shiftKey && !e.metaKey && !e.ctrlKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.code === 'ArrowUp' || e.code === 'ArrowDown')) {
      e.preventDefault();
      return moveByKey(b, e.code === 'ArrowUp' || e.key === 'ArrowUp' ? -1 : 1, c.start);
    }
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

  // The text pasted into block b, whose text is now its head and its tail.
  function pasteInto(b, head, tail, text) {
    if (b.type === 'code' || !text.includes('\n')) {
      model.textInsert(b.id, head.length, text);
      return changed({ id: b.id, at: head.length + text.length });
    }
    const made = fromText(text);
    const first = made.shift();
    let focus = null;
    model.tx(() => {
      if (!head && b.type === 'p' && first.type !== 'divider') model.setBlock(b.id, { type: first.type, checked: first.checked, indent: first.indent });
      // The tail goes to the end of the last of the new blocks; the first line takes the head's place.
      if (tail) model.textDelete(b.id, head.length, tail.length);
      const own = first.type === 'divider' ? '' : first.text;
      if (own) model.textInsert(b.id, head.length, own);
      if (first.type === 'divider') made.unshift(first);
      let last = made.length ? made[made.length - 1] : null;
      if (last && last.type === 'divider') made.push((last = mk('p')));
      if (last) {
        focus = { id: last.id, at: last.text.length };
        last.text += tail;
        model.insert(b.id, made);
      } else {
        focus = { id: b.id, at: head.length + own.length };
        if (tail) model.textInsert(b.id, head.length + own.length, tail);
      }
    });
    changed(focus);
  }
  // Pasted lines become blocks of their own (Markdown's markers count); one line goes in where the cursor is.
  ed.addEventListener('paste', (e) => {
    const t = e.target.closest && e.target.closest('.nb-text');
    const b = blockOf(t);
    if (!b) return;
    e.preventDefault();
    // A copied file or a screenshot (files and no page): file blocks under this one.
    const copied = e.clipboardData && e.clipboardData.files;
    if (copied && copied.length && !e.clipboardData.getData('text/html')) return void addFileObjects([...copied], b.id);
    const text = pastedText(e, b.type === 'code').replace(/\r\n?/g, '\n');
    if (!text) return;
    const c = caretIn(t) || { start: b.text.length, end: b.text.length };
    // An address pasted over selected words makes them a link, as Notion does.
    const url = !c.collapsed && b.type !== 'code' && !/\s/.test(text.trim()) && /^(https?:\/\/|www\.|mailto:)/i.test(text.trim()) ? addressOf(text) : null;
    const words = b.text.slice(c.start, c.end);
    if (url && !/[\[\]\n]/.test(words) && !scan(b.text).some((k) => k.s < c.end && k.e > c.start)) {
      record('op');
      const made = `[${words}](${url})`;
      model.textReplace(b.id, c.start, c.end, made);
      return changed({ id: b.id, at: c.start + made.length });
    }
    record('op');
    const head = b.text.slice(0, c.start);
    const tail = b.text.slice(c.end);
    if (c.end > c.start) model.textDelete(b.id, c.start, c.end - c.start);
    pasteInto(b, head, tail, text);
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
    if (!b) return;
    // The document changed in it while the composition went on (drawing it waited): drawn now.
    if (t._t !== b.text) {
      const c = caretIn(t);
      paint(t, b.text, b.type);
      t.classList.toggle('is-empty', !b.text);
      return place(t, Math.min(c ? c.start : 0, b.text.length));
    }
    relink(t, b);
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
    pendingFocus = { id: b.id, i: idx(b.id), at: from };
    model.textReplace(b.id, from, to, made);
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
    // Files dropped from Finder become file blocks under the block they were dropped on (or at the end).
    if (hasFiles(e.dataTransfer) && e.dataTransfer.files.length) {
      e.preventDefault();
      const at = e.target.closest && e.target.closest('.nb');
      addFileObjects([...e.dataTransfer.files], at ? at.dataset.id : blocks.length ? blocks[blocks.length - 1].id : null);
      return;
    }
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
        model.setChecked(b.id, !b.checked);
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
      model.insert(last.id, n);
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
    const b = (lastFocus && blocks[idx(lastFocus.id)]) || [...blocks].reverse().find((x) => !textless(x));
    if (b) place(textEl(b.id), lastFocus && lastFocus.id === b.id ? Math.min(lastFocus.at, b.text.length) : b.text.length);
  }

  // ---------- moving a block: the grip, the drop line, ⌥⇧↑↓ ----------
  // A block is picked up by the grip beside it (six dots, in the page's left margin, shown for the block the pointer is on)
  // and dropped at the line that shows where it lands. The blocks under it that are indented more go with it (a list item with
  // its sub-items); every block keeps its own indent. The same move is on the keyboard: ⌥⇧↑ and ⌥⇧↓ (Alt+Shift on Windows)
  // take the block, and what goes with it, one place up or down. A move only changes the block's place in the document: what
  // someone writes in it meanwhile isn't lost. ⌘Z brings it back.
  const GRIP_TIP = `Drag to move · ${MAC ? '⌥⇧↑ ⌥⇧↓' : 'Alt+Shift+↑ ↓'} on the keyboard`;
  const grip = document.createElement('div');
  grip.className = 'np-grip';
  grip.hidden = true;
  grip.dataset.tip = GRIP_TIP;
  grip.setAttribute('aria-hidden', 'true');
  grip.innerHTML = '<svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true"><g fill="currentColor"><circle cx="2.5" cy="3" r="1.3"/><circle cx="7.5" cy="3" r="1.3"/><circle cx="2.5" cy="8" r="1.3"/><circle cx="7.5" cy="8" r="1.3"/><circle cx="2.5" cy="13" r="1.3"/><circle cx="7.5" cy="13" r="1.3"/></g></svg>';
  document.body.appendChild(grip);
  const dropEl = document.createElement('div');
  dropEl.className = 'np-drop';
  dropEl.hidden = true;
  document.body.appendChild(dropEl);
  let gripFor = null; // the id of the block the grip is beside
  let moving = null; // a drag in progress: { ids, rest, slot }

  // A block and the blocks that go with it: from i to the end of those indented more than it (end excluded).
  function unitOf(i) {
    let z = i + 1;
    while (z < blocks.length && blocks[z].indent > blocks[i].indent) z++;
    return [i, z];
  }
  const rowEl = (id) => ed.querySelector(`:scope > .nb[data-id="${CSS.escape(String(id))}"]`);

  function hideGrip() {
    gripFor = null;
    grip.hidden = true;
  }
  function showGrip(id) {
    const el = rowEl(id);
    if (!el) return hideGrip();
    const r = el.getBoundingClientRect();
    const box = ed.getBoundingClientRect();
    if (r.bottom < box.top || r.top > box.bottom) return hideGrip();
    const line = parseFloat(getComputedStyle(el).lineHeight) || 20;
    // Beside the block's first line, in the margin the page keeps for it.
    const t = el.querySelector(':scope > .nb-text, :scope > hr');
    const first = t ? t.getBoundingClientRect() : r;
    const gh = 22;
    gripFor = id;
    grip.hidden = false;
    grip.style.left = `${Math.round(box.left + 6)}px`;
    grip.style.top = `${Math.round(Math.max(box.top, Math.min(first.top + (Math.min(line, first.height || line) - gh) / 2, box.bottom - gh)))}px`;
  }
  ed.addEventListener('mousemove', (e) => {
    if (moving || part || allSel || (e.buttons & 1)) return;
    const row = e.target.closest && e.target.closest('.nb');
    let b = row && row.parentElement === ed ? row : null;
    // The margin on the grip's side is the page's own, under no block: the block whose height it is.
    if (!b && e.target === ed) {
      const at = blockAtY(e.clientY);
      b = at && e.clientY <= at.getBoundingClientRect().bottom ? at : null;
    }
    if (!b) return hideGrip();
    if (b.dataset.id !== gripFor) showGrip(b.dataset.id);
  });
  ed.addEventListener('mouseleave', (e) => !moving && e.relatedTarget !== grip && hideGrip());
  grip.addEventListener('mouseleave', (e) => !moving && !(e.relatedTarget && ed.contains(e.relatedTarget)) && e.relatedTarget !== ed && hideGrip());
  // Typing, scrolling and the page changing under it send it away; the pointer brings it back.
  ed.addEventListener('keydown', () => !moving && hideGrip(), true);
  ed.addEventListener('scroll', () => !moving && hideGrip());
  addEventListener('blur', () => !moving && hideGrip());

  // Where a block dropped with the pointer at height y lands: after which of the blocks that stay (null: first), and where the
  // line is drawn.
  function slotAt(y, rest) {
    let after = null;
    let prev = null;
    for (const b of rest) {
      const el = rowEl(b.id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (y < r.top + r.height / 2) return { after, y: prev ? (prev.bottom + r.top) / 2 : r.top };
      after = b.id;
      prev = r;
    }
    return { after, y: prev ? prev.bottom : ed.getBoundingClientRect().top };
  }
  function drawDrop(slot) {
    const box = ed.getBoundingClientRect();
    const cs = getComputedStyle(ed);
    const left = box.left + (parseFloat(cs.paddingLeft) || 0);
    const right = box.right - (parseFloat(cs.paddingRight) || 0);
    dropEl.hidden = false;
    dropEl.style.left = `${Math.round(left)}px`;
    dropEl.style.width = `${Math.max(0, Math.round(right - left))}px`;
    dropEl.style.top = `${Math.round(Math.max(box.top, Math.min(slot.y, box.bottom)) - 1)}px`;
  }

  grip.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || !gripFor || moving) return;
    e.preventDefault();
    e.stopPropagation();
    const start = idx(gripFor);
    if (start < 0) return;
    closeMenu();
    letGo();
    const [a, z] = unitOf(start);
    const ids = blocks.slice(a, z).map((b) => b.id);
    const rest = blocks.filter((b) => !ids.includes(b.id));
    const was = a > 0 ? blocks[a - 1].id : null;
    moving = { ids, rest, slot: null };
    for (const id of ids) rowEl(id)?.classList.add('moving');
    document.documentElement.classList.add('np-moving');
    let last = e;
    // Held near the top or bottom of a page longer than its box, the page scrolls.
    const roll = setInterval(() => {
      const r = ed.getBoundingClientRect();
      const d = last.clientY < r.top + 28 ? last.clientY - (r.top + 28) : last.clientY > r.bottom - 28 ? last.clientY - (r.bottom - 28) : 0;
      if (!d) return;
      ed.scrollTop += Math.sign(d) * Math.min(24, 4 + Math.abs(d) / 3);
      over(last);
    }, 40);
    const over = (ev) => {
      last = ev;
      moving.slot = slotAt(ev.clientY, rest);
      drawDrop(moving.slot);
      showGrip(gripFor);
    };
    const end = (drop) => {
      clearInterval(roll);
      removeEventListener('mousemove', move, true);
      removeEventListener('mouseup', up, true);
      removeEventListener('keydown', key, true);
      document.documentElement.classList.remove('np-moving');
      dropEl.hidden = true;
      for (const el of ed.querySelectorAll('.nb.moving')) el.classList.remove('moving');
      const slot = moving.slot;
      moving = null;
      hideGrip();
      if (drop && slot && slot.after !== was) moveBlocks(ids, slot.after);
    };
    const up = () => end(true);
    const key = (ev) => {
      if (ev.key !== 'Escape') return;
      ev.preventDefault();
      ev.stopPropagation();
      end(false);
    };
    const move = (ev) => (ev.buttons & 1 ? over(ev) : end(false));
    addEventListener('mousemove', move, true);
    addEventListener('mouseup', up, true);
    addEventListener('keydown', key, true);
    over(e);
  });

  // Blocks `ids` go after block `after` (null: first). The cursor, if it was in a block, stays in it.
  function moveBlocks(ids, after) {
    const focus = snapFocus();
    record('op');
    if (!model.move(ids, after)) return;
    changed(focus && blocks[idx(focus.id)] && !textless(blocks[idx(focus.id)]) ? { id: focus.id, at: focus.at } : null);
  }
  // ⌥⇧↑ / ⌥⇧↓: the block (with what's indented under it) one place up or down, past a block with what's under it.
  function moveByKey(b, dir, at) {
    const i = idx(b.id);
    const [a, z] = unitOf(i);
    const ids = blocks.slice(a, z).map((x) => x.id);
    let after;
    if (dir < 0) {
      if (a === 0) return;
      let j = a - 1;
      while (j > 0 && blocks[j].indent > b.indent) j--;
      after = j > 0 ? blocks[j - 1].id : null;
    } else {
      if (z >= blocks.length) return;
      const [, e] = unitOf(z);
      after = blocks[e - 1].id;
    }
    record('op');
    if (!model.move(ids, after)) return;
    changed({ id: b.id, at });
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
  const TOOL_NAMES = [['claude', 'Claude Code'], ['codex', 'Codex'], ['agy', 'Antigravity'], ['cursor', 'Cursor']];
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
      else if (ed.parentNode !== host) host.replaceChildren(shStrip, ed, curs, toast);
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
    host.replaceChildren(shStrip, ed, curs, toast);
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

  // A new note goes first on the board, and opens. With a project picked on the board it is made in that project.
  function newNote() {
    save();
    const n = blank();
    const p = boardOn && scope ? projectsOnBoard().find((x) => x.dir === scope) : null;
    if (p) Object.assign(n, projectOf({ project: p }));
    notes.unshift(n);
    openNote(n.id);
  }

  // A note moved to a project, or (null) out of any: the user's own choice (the notes tools can't), kept with the note.
  function setProject(id, p) {
    const n = notes.find((x) => x.id === id);
    if (!n) return;
    if (p) Object.assign(n, projectOf({ project: p }));
    else delete n.project;
    write();
    stamp();
    drawBoard();
  }

  // ---------- the board's project row ----------
  // `scope` is the project the board shows (its folder), null for every note; the board starts on every note each time it opens.
  let scope = null;
  // The projects of the folders the live sessions are in (the app finds them: the repo's main folder, or the folder itself),
  // and the linked folders that no longer exist (their names are drawn grey).
  let choices = [];
  let goneDirs = new Set();
  const FOLDER = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" aria-hidden="true"><path d="M1.75 4.25a1 1 0 0 1 1-1h3.1l1.4 1.5h6a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1H2.75a1 1 0 0 1-1-1z"/></svg>';
  // The projects notes are in, the one used last first: { dir, name, count, last }.
  function projectsOnBoard() {
    const by = new Map();
    for (const n of notes) {
      if (!n.project) continue;
      const p = by.get(n.project.dir) || { dir: n.project.dir, name: n.project.name, count: 0, last: 0 };
      p.count++;
      p.last = Math.max(p.last, n.at || n.created || 0);
      by.set(p.dir, p);
    }
    const list = [...by.values()].sort((a, b) => b.last - a.last);
    return labelled(list);
  }
  // Two projects with the same name are told apart by the folder they are in.
  function labelled(list) {
    for (const p of list) {
      p.label = list.filter((q) => q.name === p.name).length > 1 ? `${p.name} (${p.dir.split(/[\\/]/).filter(Boolean).slice(-2, -1)[0] || p.dir})` : p.name;
    }
    return list;
  }
  // What "move to project" offers: the projects notes are in, then those of the live sessions that have no note yet.
  function projectChoices() {
    const list = projectsOnBoard().map(({ dir, name, label }) => ({ dir, name, label }));
    for (const p of choices) if (!list.some((q) => q.dir === p.dir)) list.push({ dir: p.dir, name: p.name });
    return labelled(list);
  }
  // The list in the right-click menu's "move to project ▸", the note's own project ticked.
  function projectSub(n) {
    const here = n && n.project ? n.project.dir : '';
    const tick = '<span class="pn-tick" aria-hidden="true">&#xEAB2;</span>';
    return (
      projectChoices()
        .map((p) => `<button type="button" role="menuitemradio" aria-checked="${p.dir === here}" data-move="${esc(p.dir)}" title="${esc(projectTitle(p))}">${FOLDER}<span>${esc(p.label)}</span>${p.dir === here ? tick : ''}</button>`)
        .join('') +
      (projectChoices().length ? '<hr>' : '') +
      `<button type="button" role="menuitemradio" aria-checked="${!here}" data-move="">no project${here ? '' : tick}</button>` +
      '<small>AI sees a note with no project in every project</small>'
    );
  }
  const projectTitle = (p) => `${p.dir}${goneDirs.has(p.dir) ? ' · this folder was not found' : ''}`;
  // Asked of the app: the live sessions' projects (for "move to project") and which linked folders are gone.
  function refreshProjects(done) {
    if (!NATIVE) return;
    const dirs = [...new Set(notes.map((n) => n.project && n.project.dir).filter(Boolean))];
    askApp('projects', { dirs }).then((r) => {
      if (!r || !Array.isArray(r.list)) return;
      choices = r.list.filter((p) => p && typeof p.dir === 'string' && p.dir && typeof p.name === 'string').map((p) => ({ dir: p.dir, name: p.name.slice(0, 60) }));
      const gone = new Set(Array.isArray(r.gone) ? r.gone.filter((d) => typeof d === 'string') : []);
      const changed = gone.size !== goneDirs.size || [...gone].some((d) => !goneDirs.has(d));
      goneDirs = gone;
      if (changed && boardOn) drawBoard();
      if (done) done();
    });
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
    const q = { title: 'Delete this note?', text: `Are you sure you want to delete “${nameOf(n)}”?${n.shared ? (n.shared.mine ? ' This also stops sharing it: your friends’ copies are removed.' : ' You will leave the shared note.') : ''}`, ok: 'Delete' };
    if (WINDOW) {
      // Asked on the note's own window; what was typed last reaches the dashboard first (its undo keeps it), then the
      // dashboard deletes it.
      const r = STORE && ready ? await STORE.postMessage({ type: 'confirm', ...q }).catch(() => null) : null;
      if (!r || !r.yes) return;
      if (!(await endSharing(n))) return;
      await flush();
      return STORE.postMessage({ type: 'delete' }).catch(() => {});
    }
    const yes = typeof askBox === 'function' ? await askBox(q) : window.confirm(q.text);
    if (yes && (await endSharing(n))) removeNote(id);
  }

  let gone = null; // { note, index, timer }
  function removeNote(id, hard) {
    const i = notes.findIndex((x) => x.id === id);
    if (i < 0) return;
    if (notes[i] === cur && !hard) save();
    // Out in its window: the window closes (nothing more of it kept), its place forgotten.
    if (NATIVE && out.has(id)) {
      out.delete(id);
      toApp({ type: 'noteWindowClose', id, flush: false, deleted: true });
    }
    const removed = notes[i];
    // A note gone for good (taken out of a shared note) has no undo; a deleted one's copy comes back as a private note.
    if (!hard) {
      if (gone) clearTimeout(gone.timer);
      gone = { note: removed, index: i, timer: setTimeout(() => ((gone = null), drawBoard()), 6000) };
      if (removed.shared) {
        delete removed.shared;
        forgetY(removed.id);
      }
    }
    notes.splice(i, 1);
    if (!notes.length) notes.push(blank('note1'));
    // The pinned note gone, the first on the board takes its place in the panel.
    if (removed.id === pinned) pinned = notes[0].id;
    if (removed === cur) {
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
      '<div class="np-scope" role="group" aria-label="Project" hidden></div>' +
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
    // The project row: one chip picks the project the board shows ("all" every note); the rest are under "more".
    view.querySelector('.np-scope').addEventListener('click', (e) => {
      const more = e.target.closest('.np-more');
      if (more) return openMoreProjects(more);
      const b = e.target.closest('.np-sc');
      if (!b) return;
      scope = b.dataset.dir || null;
      drawBoard();
      board.querySelector(`.np-sc[data-dir="${CSS.escape(b.dataset.dir || '')}"]`)?.focus();
    });
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
        if (!other || scope) return;
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
        `<div class="pn-has"><button type="button" data-ctx="more" aria-haspopup="menu"><span class="np-ci np-fo">${FOLDER}</span>move to project<span class="pn-chev" aria-hidden="true">&#xEAB6;</span></button>` +
        `<div class="pn-sub" role="menu">${projectSub(notes.find((x) => x.id === id))}</div></div>` +
        (notes.find((x) => x.id === id)?.aiHidden
          ? `<button type="button" data-ctx="aishow"><span class="np-ci">${EYE}</span>show to AI</button>`
          : `<button type="button" data-ctx="aihide"><span class="np-ci">${EYE_OFF}</span>hide from AI</button>`) +
        `<hr><button type="button" data-ctx="delete" class="np-ctx-del"><span class="np-ci">${TRASH}</span>delete note…</button>`;
      document.body.appendChild(menu);
      menu.style.left = `${Math.max(4, Math.min(e.clientX, innerWidth - menu.offsetWidth - 4))}px`;
      menu.style.top = `${Math.max(4, Math.min(e.clientY, innerHeight - menu.offsetHeight - 4))}px`;
      if (menu.offsetLeft + menu.offsetWidth + 220 > innerWidth) menu.querySelector('.pn-has').classList.add('left');
      // The live sessions' projects are asked again as it opens; the list is redrawn if the menu is still there.
      refreshProjects(() => {
        const sub = menu.isConnected && menu.querySelector('.pn-sub');
        if (sub) sub.innerHTML = projectSub(notes.find((x) => x.id === id));
      });
      menu.onclick = (ev) => {
        const move = ev.target.closest('[data-move]');
        if (move) {
          const dir = move.dataset.move;
          menu.remove();
          if (!dir) return setProject(id, null);
          // The list changed while the menu was open: nothing is moved rather than the note's project cleared.
          const to = projectChoices().find((p) => p.dir === dir);
          return to && setProject(id, to);
        }
        const b = ev.target.closest('[data-ctx]');
        if (!b) return;
        // "move to project" only unfolds its list (a click, as a hover does).
        if (b.dataset.ctx === 'more') return b.parentElement.classList.toggle('open');
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
      // No picking up while a search or a project hides some notes: the places between them would not be the notes' order.
      if (e.button !== 0 || query || scope) return;
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
    // Every time the board opens it shows every note, so no note looks lost.
    scope = null;
    save();
    drawBoard();
    refreshProjects();
  }
  // Another view in its place: a note in the hand goes back first, as there's no board left to put it down on, and a
  // note coming down is in at once.
  function hideBoard() {
    stopDrag('cancel');
    endLanding();
    boardOn = false;
    scope = null;
    closePop(false);
    hintEl()?.remove();
  }

  // A note as the panel shows it, only smaller and not to be written in: the same blocks, the same marks.
  function mini(list) {
    const counts = [];
    list = list.filter((b) => TYPES[b.type]); // a block from a newer Orbiterm has nothing to show
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
        const ind = level(b.indent) ? ` style="--ind:${level(b.indent)}"` : '';
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
    const f = friendAi.get(n.id);
    if (f && Date.now() - f.at < 600000) return `<span class="nai-mark" role="img" data-tip="${esc(f.text)}" aria-label="${esc(f.text)}">${cg('sparkle')}</span>`;
    const a = AI.mode !== 'off' ? aiTag(n) : null;
    if (!a) return '';
    const tip = `${a.by} ${a.kind === 'create' ? 'made' : a.kind === 'pin' ? 'pinned' : 'edited'} this ${ago(a.at)} · Open the note to undo it`;
    return `<span class="nai-mark" role="img" data-tip="${esc(tip)}" aria-label="${esc(tip)}">${cg('sparkle')}</span>`;
  }
  const PEOPLE_S = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5"/></svg>';
  // The notes friends invited you to wait at the board's start, in a dashed card.
  function inviteCards() {
    return (canShare ? window.Social?.noteInvites?.() || [] : [])
      .map((v) => `<section class="np-invite" role="listitem" data-invite="${esc(v.id)}" aria-label="Shared note ${esc(v.title || '')}"><div><b>${esc(v.owner.name || 'A friend')}</b> shared “${esc(v.title || 'a note')}”</div><span><button type="button" class="topbtn primary" data-sh="accept">Accept</button><button type="button" class="topbtn" data-sh="decline">Decline</button></span></section>`)
      .join('');
  }
  document.addEventListener('click', async (e) => {
    const b = e.target.closest && e.target.closest('.np-invite [data-sh]');
    if (!b) return;
    const id = b.closest('.np-invite').dataset.invite;
    b.disabled = true;
    const r = b.dataset.sh === 'accept' ? await Social.acceptNote(id) : await Social.declineNote(id, myId());
    if (r.error) return void (b.disabled = false);
    if (b.dataset.sh === 'accept') openShared(id);
    drawBoard();
  });
  function tile(n) {
    // Its marks: pinned (the note the dashboard's panel shows), open (the note in the window).
    const open = NATIVE ? out.has(n.id) : n === cur && win && !win.hidden;
    const where = [n.id === pinned ? `${PIN} pinned` : '', open ? 'open' : ''].filter(Boolean).join(' · ');
    const when = n.at ? `edited ${ago(n.at)}` : 'empty';
    const sh = n.shared;
    const mine = myId();
    const hereIds = sh ? (presence.get(sh.id) || []).filter((x) => x !== mine) : [];
    const hereNames = hereIds.map((x) => (sh.members.find((m) => m.id === x) || {}).name).filter(Boolean);
    const shared = sh
      ? `<span class="sh-badge" title="Shared with ${esc(sh.members.filter((m) => m.id !== mine).map((m) => m.name).join(', ') || 'no one yet')}">${PEOPLE_S}${sh.members.filter((m) => !m.invited).length}</span>` +
        (hereNames.length ? `<span class="sh-here" title="In the note now">${esc(hereNames.slice(0, 2).join(', '))}${hereNames.length > 2 ? ` +${hereNames.length - 2}` : ''} here</span>` : '')
      : '';
    // The note coming down is drawn hidden in its place until its copy is there.
    const coming = landing && landing.id === n.id ? ' np-coming' : '';
    return (
      `<section class="panel np-tile${n === cur || open ? ' cur' : ''}${coming}" role="listitem" tabindex="0" data-id="${esc(n.id)}" aria-label="${esc(nameOf(n))}">` +
      `<header><span class="tag np-name" title="${esc(nameOf(n) === n.name ? NAME_HINT : nameOf(n))}">${esc(nameOf(n))}</span>` +
      `<span class="meta">${where ? `<b>${where}</b> · ` : ''}${when}</span>` +
      shared +
      aiMark(n) +
      (n.aiHidden ? `<span class="np-aih" data-tip="${AI_HIDDEN_TIP}" role="img" aria-label="${AI_HIDDEN_TIP}">${EYE_OFF}</span>` : '') +
      `<button type="button" class="np-del" title="Delete note" aria-label="Delete note">${TRASH}</button></header>` +
      `<div class="body np-mini">${mini(blocksOf(n))}</div>` +
      // Its project, in words (a folder sign and the name), bottom left.
      (n.project ? `<span class="np-proj${goneDirs.has(n.project.dir) ? ' gone' : ''}" title="${esc(projectTitle(n.project))}">${FOLDER}<span>${esc(n.project.name)}</span></span>` : '') +
      '</section>'
    );
  }

  // The project row under the tools: only while some note is in a project (who never uses projects never sees it). All, then the
  // projects by last use; five at most beside each other (Apple: more than that goes in a menu), the rest under "more".
  const SCOPE_SHOWN = 4;
  function drawScope() {
    const row = board.querySelector('.np-scope');
    const on = projectsOnBoard();
    row.hidden = !on.length;
    if (!on.length) {
      row.innerHTML = '';
      return;
    }
    const shown = on.slice(0, SCOPE_SHOWN);
    const rest = on.slice(SCOPE_SHOWN);
    // The one picked is always one of those in view.
    const hid = rest.findIndex((p) => p.dir === scope);
    if (hid >= 0) [shown[SCOPE_SHOWN - 1], rest[hid]] = [rest[hid], shown[SCOPE_SHOWN - 1]];
    const chip = (p) =>
      `<button type="button" class="np-sc${goneDirs.has(p.dir) ? ' gone' : ''}" data-dir="${esc(p.dir)}" aria-pressed="${scope === p.dir}" title="${esc(projectTitle(p))}">${FOLDER}<span>${esc(p.label)}</span> <small>${p.count}</small></button>`;
    row.innerHTML =
      `<button type="button" class="np-sc" data-dir="" aria-pressed="${scope === null}">all <small>${notes.length}</small></button>` +
      shown.map(chip).join('') +
      (rest.length ? `<button type="button" class="np-sc np-more" aria-haspopup="menu" aria-label="${rest.length} more projects">more <i class="np-glyph" aria-hidden="true">&#xEAB4;</i></button>` : '');
    row._rest = rest;
  }
  // "more": the projects that didn't fit, in the dashboard's own menu under the button.
  function openMoreProjects(btn) {
    document.querySelector('.pn-ctx')?.remove();
    const rest = btn.parentElement._rest || [];
    const menu = document.createElement('div');
    menu.className = 'pn-ctx np-ctx';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = rest
      .map((p) => `<button type="button" role="menuitem" data-dir="${esc(p.dir)}" title="${esc(projectTitle(p))}"><span class="np-ci">${FOLDER}</span>${esc(p.label)} <span class="np-mc">${p.count}</span></button>`)
      .join('');
    document.body.appendChild(menu);
    const r = btn.getBoundingClientRect();
    menu.style.left = `${Math.max(4, Math.min(r.left, innerWidth - menu.offsetWidth - 4))}px`;
    menu.style.top = `${Math.max(4, Math.min(r.bottom + 4, innerHeight - menu.offsetHeight - 4))}px`;
    menu.onclick = (ev) => {
      const b = ev.target.closest('[data-dir]');
      if (!b) return;
      menu.remove();
      scope = b.dataset.dir;
      drawBoard();
      board.querySelector(`.np-sc[data-dir="${CSS.escape(scope)}"]`)?.focus();
    };
    menu.querySelector('button')?.focus();
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
    // A project nobody is in any more (its notes moved away) is no longer picked.
    const picked = scope ? projectsOnBoard().find((p) => p.dir === scope) : null;
    if (scope && !picked) scope = null;
    drawScope();
    const list = notes.filter((n) => (!picked || (n.project && n.project.dir === picked.dir)) && (!query || words(n).includes(query)));
    const grid = board.querySelector('.np-grid');
    // Where each note is drawn now, sliding or not, so the ones that move go on from there.
    let g = grid.getBoundingClientRect();
    const was = new Map([...grid.querySelectorAll('.np-tile[data-id]')].map((t) => [t.dataset.id, centerOf(t, g)]));
    if (drawn && was.has(drawn.id)) was.set(drawn.id, drawn.at);
    // The notes drawn anew go on sweeping where they were (sweepAt).
    grid.style.setProperty('--sweep-at', sweepAt());
    grid.innerHTML =
      (query ? '' : `<button type="button" class="np-newt"><b>+</b><span>new note</span>${picked ? `<small>in ${esc(picked.label)}</small>` : ''}</button>`) +
      (query ? '' : inviteCards()) +
      list.map(tile).join('') +
      (query && !list.length ? `<div class="np-empty">no note has “${esc(query)}” in it</div>` : '');
    board.querySelector('.np-bmeta').textContent = picked ? `${list.length} of ${notes.length} notes · ${picked.label}` : `${notes.length} note${notes.length === 1 ? '' : 's'}`;
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
    // A shared note's document is kept before the app goes on (a window closing, a quit): offline edits are in it.
    const y = keepY(true);
    return writing.then(async (ok) => (await y, ok));
  }

  // ---------- shared notes: a note written with friends ----------
  // A shared note is the same document as any (the Yjs one in `model`) with a live line to the API's room for it (NoteSync's
  // SharedProvider): the app only makes the ticket and keeps the document's file (.ydoc), the page opens the socket. The
  // note's file says `shared: { id, owner, members, ai, mine, me }`. Only the page that holds a shared note live (the panel's
  // pinned note, or its window) is on the line; the others show what was last kept, and a quiet visit (peekShared) brings the
  // board's small page up to date. A private note never leaves this computer.
  const SHARE_UI = !!STORE;
  let canShare = false; // the app can do it (Windows says no until it can)
  let sync = null; // the live note's line: { n, prov, status, hello, aiNote, aiSeen }
  let placeholder = false; // the note's text hasn't come yet (an accepted invite): what's drawn is its last kept copy, not editable
  let heldSpecs = []; // that copy
  let remoteCaret = null;
  let comp = null; // the composition in a shared note's block: { id, text, rps }
  const ydocs = new Map(); // note id -> its document's file, read before the note was bound
  const sharedSince = new Map(); // note id -> when it became shared here (a list asked for before is no proof it isn't)
  const presence = new Map(); // shared id -> the accounts in it now (note.presence)
  const friendAi = new Map(); // note id -> { at, text }: what an AI of a friend changed last
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const aiOff = (n) => !!n && (n.aiHidden === true || (!!n.shared && n.shared.ai !== true));
  const person = (p) => (p && typeof p === 'object' ? { id: String(p.id || ''), name: String(p.name || ''), tag: Number(p.tag) || 0 } : { id: '', name: '', tag: 0 });
  // A member's picture: only a web address as the API gives it (signed on the gated staging API), else none.
  const picOf = (u) => (typeof u === 'string' && u.length <= 1024 && /^https?:\/\//i.test(u) ? u : null);
  const sharedKeep = (s) =>
    s && typeof s === 'object' && UUID.test(String(s.id))
      ? {
          shared: {
            id: String(s.id),
            owner: person(s.owner),
            members: (Array.isArray(s.members) ? s.members : []).slice(0, 8).map((m) => ({ ...person(m), avatar: picOf(m && m.avatar), owner: !!m.owner, invited: !!m.invited })),
            ai: s.ai === true,
            mine: s.mine === true,
            me: typeof s.me === 'string' ? s.me : '',
          },
        }
      : {};
  const handleOf = (p) => (p && p.name ? `${p.name}#${String(p.tag).padStart(4, '0')}` : 'someone');
  const myId = () => (sync && sync.hello && sync.hello.me.id) || (cur && cur.shared && cur.shared.me) || window.Social?.state?.()?.me?.id || '';
  const netApi = (method, path, body) =>
    (WINDOW
      ? post({ type: 'notesApi', method, path, body })
      : window.webkit.messageHandlers.cloud.postMessage({ type: 'social', method, path, body })
    ).then((r) => r || { error: 'offline' }, () => ({ error: 'offline' }));
  const askApp = (type, more) => (STORE ? STORE.postMessage({ type, ...more }).catch(() => null) : Promise.resolve(null));
  const capsReady = SHARE_UI
    ? askApp('syncCaps').then((r) => {
        canShare = !!(r && r.share === true);
        canFiles = !!(r && r.files === true);
        if (canFiles) setTimeout(refreshHave, 300);
        return canShare;
      })
    : Promise.resolve(false);

  // The documents of the shared notes, read from the app before the notes are bound (a note is bound at once, and is not
  // made again from its blocks: that would give it new places the others don't have).
  async function prefetchY(list) {
    await capsReady;
    if (!canShare) return;
    await Promise.all(
      list.filter((n) => n && n.shared && NS.validId(n.id)).map((n) =>
        askApp('loadY', { id: n.id }).then((r) => {
          if (r && typeof r.b64 === 'string') ydocs.set(n.id, NS.unb64(r.b64));
          ydocFresh.add(n.id);
        }),
      ),
    );
  }
  let yTimer = 0;
  const ydocFresh = new Set(); // notes whose document this page has read or written itself (another page may write it otherwise)
  // The live note's document goes to the app's file; the answer comes when it's kept. What is kept is also what a later bind reads.
  function keepY(now) {
    if (!cur || !cur.shared || !model || !canShare || placeholder || (!WINDOW && out.has(cur.id))) return Promise.resolve(null);
    clearTimeout(yTimer);
    const run = () => {
      if (!cur || !cur.shared || !model) return Promise.resolve(null);
      const bytes = model.encodeState();
      ydocs.set(cur.id, bytes);
      ydocFresh.add(cur.id);
      return askApp('saveY', { id: cur.id, b64: NS.b64(bytes) });
    };
    if (now) return run();
    yTimer = setTimeout(run, 400);
    return Promise.resolve(null);
  }
  const forgetY = (id) => askApp('saveY', { id, b64: null });

  const ticketFor = (n) => () =>
    askApp('syncTicket', { id: n.shared.id }).then((r) => (r && r.url ? { url: r.url } : r && r.gone ? { gone: true } : { error: true }));

  function startSync(n) {
    stopSync();
    if (!n.shared || !canShare || !model || (!WINDOW && out.has(n.id))) return;
    // Another account is signed in: this account's note stays as it is (no line, no visit).
    const acct = window.Social?.state?.()?.me?.id;
    if (acct && n.shared.me && n.shared.me !== acct) return;
    const s = { n, prov: null, status: 'connecting', hello: null, aiNote: null, aiSeen: 0 };
    s.prov = new NS.SharedProvider(model.doc, {
      ticket: ticketFor(n),
      on: {
        status: (st) => {
          s.status = st;
          paintShare();
          if (st === 'live') {
            keepY();
            // Files I added while the line was down, or before the note was shared, go up now.
            setTimeout(() => cur === n && uploadPending(), 1500);
            setTimeout(() => reconcileFiles(n), 8000);
          }
        },
        hello: (h) => {
          s.hello = h;
          model.account = h.me.id;
          setMeta(n, { me: h.me.id, mine: !!h.owner, ai: !!h.ai, members: h.members });
        },
        members: (list) => setMeta(n, { members: list }),
        meta: (m) => setMeta(n, { ai: !!m.ai }),
        gone: (why) => {
          // The line is closed for good; if the verdict can't be confirmed it is opened anew (dropShared / netBack).
          stopSync(false);
          dropShared(n.id, why);
        },
        error: (code) => {
          // Too big: the strip says so and the line stops trying; anything else is a short pause.
          if (code === 'too_big') {
            s.status = 'big';
            paintShare();
          } else if (!s.slowSaid) {
            s.slowSaid = true;
            tellUser('Syncing slowed down. It will go on in a moment.');
          }
        },
      },
    });
    sync = s;
    s.prov.awareness.on('change', () => {
      drawCursors();
      paintShare();
    });
    watchEdits(s);
    s.prov.connect();
    paintShare();
  }
  function stopSync(keep = true) {
    if (!sync) return;
    if (keep) keepY(true);
    const s = sync;
    sync = null;
    clearTimeout(yTimer);
    s.prov.close();
    curs.replaceChildren();
    paintShare();
  }

  // Who's in the note, whether AI may read it: kept with the note.
  function setMeta(n, patch) {
    if (!n.shared) return;
    const was = JSON.stringify(n.shared);
    Object.assign(n.shared, sharedKeep({ ...n.shared, ...patch }).shared || {});
    if (JSON.stringify(n.shared) === was) return;
    if (n === cur && model) model.account = n.shared.me || model.account;
    write();
    paintShare();
    if (!WINDOW) drawBoard();
  }

  // ---------- what an AI of the others changed ----------
  // The note's `edits` map (written by an AI's change, in the same step as the change): "Claude Code (Atalay) edited".
  function watchEdits(s) {
    const show = () => {
      const mine = myId();
      const e = [...model.edits.values()].filter((x) => x && x.for !== mine && Date.now() - x.at < 600000 && x.at > s.aiSeen).sort((a, b) => b.at - a.at)[0];
      if (!e) return;
      s.aiSeen = e.at;
      const who = (s.n.shared.members.find((m) => m.id === e.for) || {}).name;
      const text = `${String(e.by || 'AI').slice(0, 24)}${who ? ` (${who})` : ''} edited · ${aiTime(e.at)}`;
      s.aiNote = { text, at: Date.now() };
      friendAi.set(s.n.id, { at: e.at, text });
      for (const id of Array.isArray(e.blocks) ? e.blocks.slice(0, 50) : []) {
        const el = ed.querySelector(`.nb[data-id="${CSS.escape(String(id))}"]`);
        if (!el) continue;
        el.classList.add('sh-glow');
        setTimeout(() => el.classList.remove('sh-glow'), 2000);
      }
      paintShare();
      setTimeout(paintShare, 9000);
      if (!WINDOW) drawBoard();
    };
    model.edits.observe(() => setTimeout(show, 30));
    show();
  }

  // ---------- the others' cursors and selections ----------
  const curs = document.createElement('div');
  curs.className = 'rc-layer';
  curs.setAttribute('aria-hidden', 'true');
  host.appendChild(curs);
  function domAt(id, off) {
    const t = textEl(id);
    if (!t) return null;
    const w = document.createTreeWalker(t, NodeFilter.SHOW_TEXT);
    let left = Math.max(0, off);
    let nd;
    while ((nd = w.nextNode())) {
      if (left <= nd.length) return { t, node: nd, off: left };
      left -= nd.length;
    }
    return { t, node: t, off: t.childNodes.length };
  }
  function caretRect(id, off) {
    const p = domAt(id, off);
    if (!p) return null;
    const r = document.createRange();
    const rect = (a, b, side) => {
      r.setStart(p.node, a);
      r.setEnd(p.node, b);
      const q = [...r.getClientRects()].filter((x) => x.height);
      const x = side === 'r' ? q[q.length - 1] : q[0];
      return x ? { left: side === 'r' ? x.right : x.left, top: x.top, height: x.height } : null;
    };
    let got = null;
    if (p.node.nodeType === 3) {
      if (p.off < p.node.length) got = rect(p.off, p.off + 1, 'l');
      if (!got && p.off > 0) got = rect(p.off - 1, p.off, 'r');
    }
    if (!got) {
      const b = p.t.getBoundingClientRect();
      got = { left: b.left, top: b.top, height: parseFloat(getComputedStyle(p.t).lineHeight) || 18 };
    }
    return got;
  }
  // The lines a selection takes in one block, from `a` to `z` (the block's end when z is null).
  function spanRects(id, a, z) {
    const t = textEl(id);
    const b = blocks[idx(id)];
    if (!t || !b) return [];
    const to = z == null ? b.text.length : z;
    if (to <= a) return z == null && !b.text ? [{ left: t.getBoundingClientRect().left, top: t.getBoundingClientRect().top, width: 6, height: parseFloat(getComputedStyle(t).lineHeight) || 18 }] : [];
    const p = domAt(id, a);
    const q = domAt(id, to);
    if (!p || !q || p.node.nodeType !== 3 || q.node.nodeType !== 3 || false) return [];
    const r = document.createRange();
    r.setStart(p.node, p.off);
    r.setEnd(q.node, q.off);
    return [...r.getClientRects()].filter((x) => x.width > 0.5 && x.height);
  }
  let cursRaf = 0;
  function drawCursors() {
    if (cursRaf) return;
    cursRaf = requestAnimationFrame(() => {
      cursRaf = 0;
      if (!sync || !model) return void curs.replaceChildren();
      const me = sync.prov.doc.clientID;
      const eb = ed.getBoundingClientRect();
      curs.style.cssText = `left:${ed.offsetLeft}px;top:${ed.offsetTop}px;width:${ed.clientWidth}px;height:${ed.clientHeight}px`;
      const html = [];
      for (const [cid, st] of sync.prov.awareness.getStates()) {
        if (cid === me || !st || !st.u || !st.c || !st.c.b) continue;
        const color = /^#[0-9a-f]{6}$/i.test(st.u.color) ? st.u.color : '#ff8a3d';
        const A = model.absPos(st.c.a);
        const H = st.c.h ? model.absPos(st.c.h) : A;
        if (!A || !H) continue;
        const pos = (rc) => `left:${(rc.left - eb.left).toFixed(1)}px;top:${(rc.top - eb.top).toFixed(1)}px;`;
        // The selection (when the two ends differ), block by block.
        const ia = idx(A.id);
        const ih = idx(H.id);
        if (ia >= 0 && ih >= 0 && (ia !== ih || A.offset !== H.offset)) {
          const [s, z] = ia < ih || (ia === ih && A.offset <= H.offset) ? [A, H] : [H, A];
          for (let i = idx(s.id); i <= idx(z.id); i++) {
            const b = blocks[i];
            if (!b || textless(b)) continue;
            const from = b.id === s.id ? s.offset : 0;
            const to = b.id === z.id ? z.offset : null;
            for (const rc of spanRects(b.id, from, to)) html.push(`<i class="rc-sel" style="${pos(rc)}width:${rc.width.toFixed(1)}px;height:${rc.height.toFixed(1)}px;--c:${color}"></i>`);
          }
        }
        const cr = caretRect(H.id, H.offset);
        if (cr) html.push(`<i class="rc-caret" style="${pos(cr)}height:${cr.height.toFixed(1)}px;--c:${color}"><b>${esc(st.u.name)}</b></i>`);
      }
      curs.innerHTML = html.join('');
    });
  }
  ed.addEventListener('scroll', drawCursors, { passive: true });
  new ResizeObserver(drawCursors).observe(ed);
  // My own: where my selection starts and ends, as places that stay with the letters.
  function pushCursor() {
    if (!sync || !model || placeholder) return;
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
    const a = r && ed.contains(r.startContainer) ? at(r.startContainer, r.startOffset) : null;
    const z = a && at(r.endContainer, r.endOffset);
    if (!a || !z) return void sync.prov.setCursor(null);
    sync.prov.setCursor({ b: a.id, a: model.relPos(a.id, a.at), h: model.relPos(z.id, z.at) });
  }
  document.addEventListener('selectionchange', () => sync && pushCursor());
  ed.addEventListener('focusout', () => setTimeout(() => sync && !ed.contains(document.activeElement) && sync.prov.setCursor(null), 50));
  // A friend's change in the block I'm in: the cursor stays where the letters it was between are.
  function captureCaret() {
    const t = document.activeElement && document.activeElement.closest && document.activeElement.closest('.np-ed .nb-text');
    const b = t && blockOf(t);
    const c = b && caretIn(t);
    return c && model.has(b.id) ? { a: model.relPos(b.id, c.start), z: model.relPos(b.id, c.end) } : null;
  }
  function restoreCaret(rc) {
    const a = rc && model.absPos(rc.a);
    const z = rc && model.absPos(rc.z);
    if (!a || !z || a.id !== z.id) return;
    const t = textEl(a.id);
    if (!t) return;
    place(t, a.offset);
    if (z.offset > a.offset) {
      const sel = getSelection();
      const p = domAt(a.id, z.offset);
      if (sel.rangeCount && p && p.node.nodeType === 3) {
        const r = sel.getRangeAt(0);
        r.setEnd(p.node, p.off);
        sel.removeAllRanges();
        sel.addRange(r);
      }
    }
  }
  function renderKeep() {
    const rc = captureCaret();
    render(null);
    restoreCaret(rc);
  }
  ed.addEventListener('compositionend', () => sync && setTimeout(renderKeep, 0));

  // ---------- the strip, the share button and the sheet ----------
  const PEOPLE =
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5"/><path d="M16 5.2a3 3 0 0 1 0 5.6M18 14.4c1.7.5 2.7 2 3 4.6"/></svg>';
  const shStrip = document.createElement('div');
  shStrip.className = 'sh-strip';
  shStrip.hidden = true;
  host.insertBefore(shStrip, ed);
  const shBtn = document.createElement('button');
  shBtn.type = 'button';
  shBtn.className = 'np-share';
  shBtn.hidden = true;
  shBtn.innerHTML = PEOPLE;
  if (WINDOW) panel.querySelector('.npw-bar')?.insertBefore(shBtn, panel.querySelector('.npw-ai'));
  else panel.querySelector('header')?.appendChild(shBtn);
  const toast = document.createElement('div');
  toast.className = 'sh-toast';
  toast.hidden = true;
  toast.setAttribute('role', 'status');
  host.appendChild(toast);
  let toastTimer = 0;
  function tellUser(text) {
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.hidden = true), 7000);
  }

  const initial = (p) => esc((p.name || '?').trim().charAt(0).toUpperCase() || '?');
  const hue = (id) => `hsl(${[...String(id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)} 62% 58%)`;
  // A person's picture in the share sheet: the signed address the API gives (friends list, note members), else the initial.
  // One that doesn't load (offline, gone) gives way to the initial, and isn't asked for again while the sheet is open.
  const avFailed = new Set();
  const shAv = (p) => {
    const pic = picOf(p.avatar);
    return `<i class="sh-av" style="background:${hue(p.id)}" data-i="${initial(p)}">${pic && !avFailed.has(pic) ? `<img alt="" src="${esc(pic)}" draggable="false">` : initial(p)}</i>`;
  };
  document.addEventListener('error', (e) => {
    const img = e.target;
    const av = img instanceof HTMLImageElement ? img.parentElement : null;
    if (!av || !av.classList.contains('sh-av') || !sheetEl || !sheetEl.contains(av)) return;
    avFailed.add(img.getAttribute('src'));
    av.textContent = av.dataset.i || '?';
  }, true);
  // Who else is in the note right now (their cursor's account), by name.
  function hereNames() {
    if (!sync) return [];
    const mine = myId();
    const seen = new Map();
    for (const st of sync.prov.awareness.getStates().values()) if (st && st.u && st.u.id !== mine) seen.set(st.u.id, st.u.name);
    return [...seen.values()];
  }
  const joinNames = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
  function statusLine() {
    const acct = window.Social?.state?.()?.me?.id;
    if (cur && cur.shared && acct && cur.shared.me && cur.shared.me !== acct) return { cls: 'off', text: 'Belongs to another account' };
    const cant = placeholder ? ' · you can’t edit yet' : '';
    if (!sync) return { cls: 'off', text: `Offline${cant || ' · changes will sync when you’re back online'}` };
    if (sync.status === 'big') return { cls: 'off', text: 'Too big to sync (2 MB) · shorten it' };
    if (sync.aiNote && Date.now() - sync.aiNote.at < 9000) return { cls: 'ai', text: sync.aiNote.text };
    if (sync.status === 'live') {
      const h = hereNames();
      return { cls: 'live', text: h.length ? `Live · ${joinNames(h.slice(0, 3))}${h.length > 3 ? ` and ${h.length - 3} more` : ''} ${h.length === 1 ? 'is' : 'are'} here` : 'Live' };
    }
    if (sync.status === 'connecting') return { cls: 'wait', text: `Connecting…${placeholder ? ' you can edit once the note arrives' : ''}` };
    if (sync.status === 'busy') return { cls: 'off', text: 'Busy · trying again in a moment' };
    return { cls: 'off', text: `Offline${cant || ' · changes will sync when you’re back online'}` };
  }
  function paintShare() {
    const n = cur;
    // A note out in its window is shared from there (the window holds its document and its line).
    const on = SHARE_UI && canShare && !!n && (WINDOW || !out.has(n.id));
    const sh = on && n.shared;
    host.classList.toggle('sh-on', !!sh);
    shBtn.hidden = !on;
    shBtn.classList.toggle('on', !!sh);
    const tip = sh ? 'Who’s in this note' : 'Share this note with friends';
    shBtn.title = tip;
    shBtn.setAttribute('aria-label', tip);
    if (!sh) {
      shStrip.hidden = true;
      shStrip.innerHTML = '';
    } else {
      const s = statusLine();
      const ppl = sh.members.filter((m) => !m.invited);
      const html =
        `<span class="sh-faces">${ppl.slice(0, 4).map((m) => `<i style="background:${hue(m.id)}" title="${esc(handleOf(m))}">${initial(m)}</i>`).join('')}${ppl.length > 4 ? `<i class="more">+${ppl.length - 4}</i>` : ''}</span>` +
        `<span class="sh-state ${s.cls}"><i class="sh-dot"></i>${esc(s.text)}</span>` +
        (sh.ai ? '<span class="sh-ai" title="The note’s owner lets AI read it">AI can read</span>' : '');
      if (shStrip.__h !== html) {
        shStrip.innerHTML = html;
        shStrip.__h = html;
      }
      shStrip.hidden = false;
    }
    if (sheetEl) paintSheet();
    placeholder && setEditable(false);
  }
  shStrip.addEventListener('click', () => openSheet());
  shBtn.addEventListener('click', () => (sheetEl ? closeSheet() : openSheet()));
  setInterval(() => sync && paintShare(), 10000);

  // ---------- signing in, where a shared note asks for it ----------
  // Shared notes live on Orbiterm's server, so they need an account (GitHub or an e-mailed code); what stays on this computer
  // doesn't. The ask comes in the moment it matters (the share sheet, an invite), says why, and starts the sign-in right there:
  // GitHub opens in the browser and this follows, an e-mail asks for the address and then the 6-digit code.
  const GH_MARK = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>';
  const SI_TEXT = {
    share: 'Shared notes are kept on Orbiterm’s server, so they need an account. Signing in keeps your name, friends and notes.',
    open: 'Shared notes are kept on Orbiterm’s server, so opening one needs an account. Signing in keeps your name, friends and notes.',
  };
  const acctSignedIn = async () => {
    const r = await netApi('GET', 'v1/account');
    return !r.error && r.signedIn === true;
  };
  const SI_ERR = {
    offline: 'Can’t reach the server. Try again when you’re online.',
    bad_email: 'That e-mail address doesn’t look right.',
    bad_code: 'That code isn’t right. Check it and try again.',
    expired: 'That code ran out. Ask for a new one.',
  };
  /** Draws the sign-in card into `el` and runs it; `onDone` is called once this computer has an account. */
  function mountSignIn(el, { why = 'share', onDone } = {}) {
    const st = { step: 'choose', email: '', msg: '', bad: false, busy: false, timer: 0 };
    const done = async () => {
      clearInterval(st.timer);
      window.Account?.load?.();
      window.Social?.loadNoteInvites?.();
      if (onDone) onDone();
    };
    const paint = () => {
      if (!el.isConnected) return clearInterval(st.timer);
      const input = el.querySelector('.si-input');
      const keep = input ? input.value : st.email;
      el.innerHTML =
        `<p class="sh-text si-why">${esc(SI_TEXT[why] || SI_TEXT.share)}</p>` +
        (st.step === 'choose'
          ? `<div class="si-btns"><button type="button" class="sh-go si-btn" data-si="github"${st.busy ? ' disabled' : ''}>${GH_MARK}Sign in with GitHub</button>` +
            '<button type="button" class="sh-go si-btn alt" data-si="email">Sign in with e-mail</button></div>'
          : `<div class="si-form"><input class="si-input" ${st.step === 'code' ? 'inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="6-digit code" aria-label="6-digit code"' : 'type="email" placeholder="you@example.com" aria-label="E-mail address"'} spellcheck="false" value="${esc(st.step === 'code' ? '' : keep)}">` +
            `<button type="button" class="sh-go si-btn" data-si="${st.step === 'code' ? 'verify' : 'send'}"${st.busy ? ' disabled' : ''}>${st.step === 'code' ? 'Sign in' : 'Send code'}</button>` +
            '<button type="button" class="sh-link" data-si="back">Back</button></div>') +
        (st.msg ? `<p class="${st.bad ? 'sh-err' : 'si-msg'}" role="${st.bad ? 'alert' : 'status'}">${esc(st.msg)}</p>` : '');
      el.querySelector('.si-input')?.focus({ preventScroll: true });
    };
    const say = (msg, bad = false) => ((st.msg = msg), (st.bad = bad), paint());
    async function github() {
      st.busy = true;
      say('Opening GitHub in your browser…');
      const r = await netApi('POST', 'v1/auth/github', {});
      st.busy = false;
      if (r.error || !r.url) return say(SI_ERR[r.error] || 'GitHub sign-in isn’t available right now.', true);
      await (WINDOW ? post({ type: 'openSignIn', url: r.url }) : window.webkit.messageHandlers.cloud.postMessage({ type: 'openSignIn', url: r.url })).catch(() => null);
      say('Finish signing in in your browser. This follows.');
      clearInterval(st.timer);
      const until = Date.now() + 10 * 60000;
      st.timer = setInterval(async () => {
        if (!el.isConnected || Date.now() > until) return clearInterval(st.timer);
        if (await acctSignedIn()) done();
      }, 2000);
    }
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-si]');
      if (!b || st.busy) return;
      const act = b.dataset.si;
      if (act === 'github') return github();
      if (act === 'email') return ((st.step = 'email'), (st.msg = ''), paint());
      if (act === 'back') return (clearInterval(st.timer), (st.step = 'choose'), (st.msg = ''), paint());
      const input = el.querySelector('.si-input');
      if (act === 'send') {
        st.email = (input ? input.value : '').trim();
        if (!st.email) return;
        st.busy = true;
        say('Sending the code…');
        const r = await netApi('POST', 'v1/auth/email', { email: st.email });
        st.busy = false;
        if (r.error) return say(SI_ERR[r.error] || 'The code couldn’t be sent. Try again in a moment.', true);
        st.step = 'code';
        say(`A 6-digit code is on its way to ${st.email}.`);
      } else if (act === 'verify') {
        const code = (input ? input.value : '').replace(/\D/g, '');
        if (code.length !== 6) return;
        st.busy = true;
        say('Checking…');
        const r = await netApi('POST', 'v1/auth/email/verify', { email: st.email, code });
        st.busy = false;
        if (r.error) return say(SI_ERR[r.error] || 'That didn’t work. Try again.', true);
        // This e-mail already has an account of its own: joining the two is done in Settings › Account (it shows both and asks).
        if (r.result === 'merge') return say('This e-mail already has an account. Finish joining them in Settings › Account.', true);
        done();
      }
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.matches('.si-input')) el.querySelector('[data-si="send"],[data-si="verify"]')?.click();
    });
    paint();
    return { stop: () => clearInterval(st.timer) };
  }

  let sheetEl = null;
  let sheetMode = null; // { chosen: Set, query, risky, friends, busy, error, confirm, signed }
  function openSheet() {
    if (!cur || !canShare || sheetEl || (!WINDOW && out.has(cur.id))) return;
    sheetEl = document.createElement('div');
    avFailed.clear();
    sheetEl.className = 'sh-sheet';
    sheetEl.setAttribute('role', 'dialog');
    sheetEl.setAttribute('aria-label', 'Share this note');
    host.appendChild(sheetEl);
    sheetMode = { chosen: new Set(), query: '', risky: false, friends: [], busy: false, error: '', confirm: '', keep: true, ai: null, signed: null };
    // Does this computer have an account? Without one the sheet asks for it (below), in the first moment, not after friends are picked.
    if (!cur.shared) acctSignedIn().then((ok) => sheetMode && ((sheetMode.signed = ok), paintSheet()));
    shBtn.setAttribute('aria-expanded', 'true');
    // Friends: the dashboard has them already; a note's window asks.
    const have = window.Social?.state?.()?.friends;
    if (have) sheetMode.friends = have;
    else netApi('GET', 'v1/social').then((r) => sheetMode && !r.error && ((sheetMode.friends = r.friends || []), paintSheet()));
    if (!cur.shared) askApp('secretCheck', { text: toText(blocksOf(cur)) }).then((r) => sheetMode && r && ((sheetMode.risky = r.risky === true), paintSheet()));
    paintSheet();
    sheetEl.querySelector('input,button')?.focus({ preventScroll: true });
  }
  function closeSheet() {
    sheetEl?.remove();
    sheetEl = sheetMode = null;
    shBtn.setAttribute('aria-expanded', 'false');
  }
  document.addEventListener('mousedown', (e) => sheetEl && !sheetEl.contains(e.target) && !shBtn.contains(e.target) && !shStrip.contains(e.target) && closeSheet());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sheetEl) {
      e.stopPropagation();
      closeSheet();
      refocus();
    }
  }, true);

  const FRIENDLY = {
    offline: 'Can’t reach the server. Try again when you’re online.',
    not_friends: 'You can only share with friends.',
    too_many_notes: 'You already share 100 notes. Stop sharing one first.',
    too_many_members: 'A shared note has room for 8 people.',
    already_member: 'They are in this note already.',
    too_big: 'This note is too big to share (2 MB).',
    signed_out: 'Pick a hacker name first (Settings › Account).',
    sign_in: 'Shared notes need an account. Sign in first.',
    members_required: 'Pick at least one friend to share with.',
  };
  const fail = (code) => (sheetMode.error = FRIENDLY[code] || 'That didn’t work. Try again.');

  function paintSheet() {
    if (!sheetEl || !sheetMode) return;
    const m = sheetMode;
    const sh = cur && cur.shared;
    const mine = myId();
    const inNote = new Set(sh ? sh.members.map((x) => x.id) : []);
    const q = m.query.trim().toLowerCase();
    const pool = m.friends.filter((f) => !inNote.has(f.id) && (!q || `${f.name}#${f.tag} ${f.nick || ''}`.toLowerCase().includes(q)));
    const friendRows = pool.length
      ? pool.map((f) => `<label class="sh-row"><input type="checkbox" data-pick="${esc(f.id)}"${m.chosen.has(f.id) ? ' checked' : ''}>${shAv(f)}<span>${esc(f.nick || f.name)}<small>#${String(f.tag).padStart(4, '0')}</small>${f.signedIn === false ? '<small class="sh-wait">needs to sign in to open</small>' : ''}</span></label>`).join('')
      : `<p class="sh-empty">${m.friends.length ? 'No friend matches.' : 'No friends to share with yet. Add some from the friends view.'}</p>`;
    const picker = `<div class="sh-find"><input type="search" placeholder="Find a friend" value="${esc(m.query)}" spellcheck="false" aria-label="Find a friend"></div><div class="sh-friends">${friendRows}</div>`;
    let html;
    if (!sh && m.signed === false) {
      html = '<h3>Share this note</h3><div class="si-card"></div>';
    } else if (!sh) {
      const n = m.chosen.size;
      html =
        '<h3>Share this note</h3>' +
        '<p class="sh-text">Your friends can edit it. It’s saved on Orbiterm’s server, locked, but Orbiterm can read it.</p>' +
        (m.risky ? '<p class="sh-warn">This note seems to hold a password or key. Friends you share it with will see it.</p>' : '') +
        picker +
        (m.error ? `<p class="sh-err" role="alert">${esc(m.error)}</p>` : '') +
        `<div class="sh-acts"><button type="button" class="sh-go" data-do="share"${n && !m.busy ? '' : ' disabled'}>${m.busy ? 'Sharing…' : n ? `${m.risky ? 'Share anyway' : 'Share'} with ${n} friend${n === 1 ? '' : 's'}` : 'Share'}</button></div>`;
    } else {
      const owner = sh.mine;
      const rows = sh.members
        .map((p) => {
          const you = p.id === mine;
          if (m.removing === p.id) {
            return `<div class="sh-ask sh-rm"><p><b>Remove ${esc(p.name)}?</b> ${p.invited ? 'Their invite is taken back.' : 'Their copy is deleted.'}</p><div class="sh-acts"><button type="button" class="sh-danger" data-doremove="${esc(p.id)}">Remove</button><button type="button" data-do="cancelremove">Cancel</button></div></div>`;
          }
          return `<div class="sh-row">${shAv(p)}<span>${esc(p.name)}<small>#${String(p.tag).padStart(4, '0')}${you ? ' · you' : ''}</small></span>` +
            `<em>${p.owner ? 'owner' : p.invited ? 'invited' : ''}</em>${owner && !p.owner ? `<button type="button" class="sh-link" data-remove="${esc(p.id)}" aria-label="Remove ${esc(p.name)}">Remove</button>` : ''}</div>`;
        })
        .join('');
      const ownerName = (sh.members.find((p) => p.owner) || sh.owner).name || 'the owner';
      const room = sh.members.length < 8;
      html =
        '<h3>Shared note</h3>' + `<div class="sh-members">${rows}</div>` +
        (owner && room ? `<details class="sh-add"><summary>Add friends</summary>${picker}${m.chosen.size ? `<button type="button" class="sh-go" data-do="invite"${m.busy ? ' disabled' : ''}>Invite ${m.chosen.size}</button>` : ''}</details>` : '') +
        (owner
          ? `<label class="sh-switch"><input type="checkbox" data-ai${sh.ai ? ' checked' : ''}><span><b>Let AI read this note</b><small>${sh.ai ? 'Everyone’s AI in this note can read it.' : 'No one’s AI can read this note.'}</small></span></label>`
          : `<p class="sh-text">${sh.ai ? `AI can read this note (${esc(ownerName)} turned it on).` : `AI can’t read this note. Only ${esc(ownerName)} can allow it.`}</p>`) +
        (m.error ? `<p class="sh-err" role="alert">${esc(m.error)}</p>` : '') +
        (m.confirm === 'stop'
          ? '<div class="sh-ask"><p><b>Stop sharing this note?</b> It stays here as a private note. Your friends’ copies are removed.</p><div class="sh-acts"><button type="button" class="sh-danger" data-do="stop">Stop sharing</button><button type="button" data-do="cancel">Cancel</button></div></div>'
          : m.confirm === 'leave'
            ? `<div class="sh-ask"><p><b>Leave this note?</b></p><label class="sh-switch small"><input type="checkbox" data-keep${m.keep ? ' checked' : ''}><span><b>Keep a private copy</b><small>The note stays here as your own, no longer shared.</small></span></label><div class="sh-acts"><button type="button" class="sh-danger" data-do="leave">Leave note</button><button type="button" data-do="cancel">Cancel</button></div></div>`
            : `<div class="sh-acts"><button type="button" class="sh-quiet" data-do="${owner ? 'askstop' : 'askleave'}">${owner ? 'Stop sharing' : 'Leave note'}</button></div>`);
    }
    if (sheetEl.__h === html) return;
    const had = document.activeElement && sheetEl.contains(document.activeElement) ? document.activeElement.dataset : null;
    const find = sheetEl.querySelector('.sh-find input');
    const keep = find && document.activeElement === find ? [find.selectionStart, find.selectionEnd] : null;
    sheetEl.innerHTML = html;
    sheetEl.__h = html;
    const card = sheetEl.querySelector('.si-card');
    if (card) {
      mountSignIn(card, {
        why: 'share',
        onDone: () => {
          if (!sheetMode) return;
          sheetMode.signed = true;
          sheetMode.error = '';
          // The friends again (the sheet opens with the list, as the plan says), with whether each has an account.
          netApi('GET', 'v1/social').then((r) => sheetMode && !r.error && ((sheetMode.friends = r.friends || sheetMode.friends), paintSheet()));
          paintSheet();
        },
      });
      return;
    }
    if (keep) {
      const f = sheetEl.querySelector('.sh-find input');
      f?.focus();
      f?.setSelectionRange(keep[0], keep[1]);
    } else if (had && had.do) sheetEl.querySelector(`[data-do="${had.do}"]`)?.focus();
  }
  document.addEventListener('input', (e) => {
    if (!sheetEl || !sheetEl.contains(e.target) || !sheetMode) return;
    if (e.target.matches('.sh-find input')) sheetMode.query = e.target.value;
    else if (e.target.matches('[data-pick]')) sheetMode.chosen[e.target.checked ? 'add' : 'delete'](e.target.dataset.pick);
    else if (e.target.matches('[data-keep]')) sheetMode.keep = e.target.checked;
    else if (e.target.matches('[data-ai]')) return setAi(e.target.checked);
    paintSheet();
  });
  document.addEventListener('click', async (e) => {
    if (!sheetEl || !sheetEl.contains(e.target) || !sheetMode) return;
    const rm = e.target.closest('[data-remove]');
    if (rm) return void ((sheetMode.removing = rm.dataset.remove), paintSheet());
    const doRm = e.target.closest('[data-doremove]');
    if (doRm) return removeMember(doRm.dataset.doremove);
    const act = e.target.closest('[data-do]')?.dataset.do;
    if (!act) return;
    sheetMode.error = '';
    if (act === 'share') await doShare();
    else if (act === 'invite') await doInvite();
    else if (act === 'askstop') ((sheetMode.confirm = 'stop'), paintSheet());
    else if (act === 'askleave') ((sheetMode.confirm = 'leave'), paintSheet());
    else if (act === 'cancel') ((sheetMode.confirm = ''), paintSheet());
    else if (act === 'cancelremove') ((sheetMode.removing = ''), paintSheet());
    else if (act === 'stop') await stopSharing();
    else if (act === 'leave') await leaveNote(sheetMode.keep);
  });

  // ---------- sharing, inviting, removing, leaving, stopping ----------
  async function doShare() {
    const n = cur;
    const m = sheetMode;
    if (!n || n.shared || !m.chosen.size || m.busy) return;
    m.busy = true;
    paintSheet();
    save();
    // A fresh document of the note as it reads now is what goes (no history of edits, nothing deleted): and what the note is
    // bound to afterwards, so the server's copy and this one are the same document.
    const fresh = new NS.NoteModel(plain(liveOf(blocksOf(n))));
    const state = fresh.encodeState();
    fresh.destroy();
    const r = await netApi('POST', 'v1/notes', { title: nameOf(n), state: NS.b64(state), members: [...m.chosen] });
    m.busy = false;
    if (r.error || !r.note) {
      // No account (this computer's sign-in is gone): the sheet asks for it instead of a friend list.
      if (r.error === 'sign_in') m.signed = false;
      fail(r.error);
      return paintSheet();
    }
    // Every file the note holds on this computer goes up now (this is my note and my share: the list is mine to fill).
    await addAdds(blocksOf(n).filter((b) => b.type === 'file' && (fOf(b) || {}).local && !(fOf(b) || {}).id).map((b) => b.id));
    const here = n === cur && !placeholder;
    const typedSince = here ? plain(blocks) : null;
    n.shared = sharedKeep({ ...r.note, mine: true, me: r.note.owner && r.note.owner.id }).shared;
    sharedSince.set(n.id, Date.now());
    // A window tells the dashboard's page that it shared the note (the page that keeps every note's sharing).
    if (WINDOW) {
      n.startedShare = n.shared;
      delete n.endedShare;
    }
    ydocs.set(n.id, state);
    ydocFresh.add(n.id);
    await askApp('saveY', { id: n.id, b64: NS.b64(state) });
    if (here && n === cur) {
      // Bound to the shared document; what was typed while the call was out is put in it as an edit of mine.
      bind(n);
      if (JSON.stringify(plain(blocks)) !== JSON.stringify(typedSince)) {
        model.as('local', () => model.replaceAll(typedSince));
        render(null);
      }
      keepY(true);
      // The files the note held on this computer go up now that it is shared.
      uploadPending();
    }
    write();
    m.chosen.clear();
    paintShare();
    drawBoard();
  }
  async function doInvite() {
    const n = cur;
    const m = sheetMode;
    if (!n || !n.shared || !m.chosen.size) return;
    m.busy = true;
    paintSheet();
    for (const id of [...m.chosen]) {
      const r = await netApi('POST', `v1/notes/${n.shared.id}/members`, { id });
      if (r.error) {
        fail(r.error);
        break;
      }
      m.chosen.delete(id);
    }
    m.busy = false;
    const v = await netApi('GET', 'v1/notes');
    const mine = !v.error && (v.notes || []).find((x) => x.id === n.shared.id);
    if (mine) setMeta(n, { members: mine.members });
    paintSheet();
  }
  async function removeMember(id) {
    const n = cur;
    if (sheetMode) sheetMode.removing = '';
    if (!n || !n.shared) return;
    const r = await netApi('DELETE', `v1/notes/${n.shared.id}/members/${id}`);
    if (r.error) {
      fail(r.error);
      return paintSheet();
    }
    setMeta(n, { members: n.shared.members.filter((p) => p.id !== id) });
  }
  async function setAi(on) {
    const n = cur;
    if (!n || !n.shared || !n.shared.mine) return;
    const r = await netApi('PATCH', `v1/notes/${n.shared.id}`, { ai: on });
    if (r.error) {
      fail(r.error);
      return paintSheet();
    }
    setMeta(n, { ai: on });
  }
  // The note stops being shared here: a private note again, the content as it is now. Not before the server agrees.
  function makePrivate(n) {
    ydocs.delete(n.id);
    ydocFresh.delete(n.id);
    forgetY(n.id);
    if (n !== cur) {
      delete n.shared;
      n.blocks = localFiles(n.blocks);
      return write();
    }
    const blocksNow = localFiles(plain(blocks));
    stopSync(false);
    delete n.shared;
    n.blocks = blocksNow;
    // A window tells the dashboard's page that it ended (the dashboard's own copy of the sharing is what counts otherwise).
    if (WINDOW) {
      n.endedShare = true;
      delete n.startedShare;
    }
    letGo();
    bind(n);
    render(null);
    write();
    paintShare();
    if (!WINDOW) drawBoard();
  }
  // Ending the sharing from here (stop, leave, delete): the server closes the line and tells the account before it answers, so
  // this page lets go of the line first and ignores what comes of its own doing. If the call fails the line goes on.
  const ending = new Set();
  async function endCall(n, call) {
    const sid = n.shared.id;
    ending.add(sid);
    if (n === cur) stopSync(false);
    const r = await call();
    if (r.error && r.error !== 'not_found') {
      ending.delete(sid);
      if (n === cur && n.shared && model && !sync) startSync(n);
      return r;
    }
    setTimeout(() => ending.delete(sid), 20000);
    return r;
  }
  async function stopSharing() {
    const n = cur;
    if (!n || !n.shared || !n.shared.mine) return;
    // The note's files come to this computer first: once sharing stops the server's copies are gone.
    const kept = await copyFilesHere();
    if (kept) {
      sheetMode.confirm = '';
      sheetMode.error = copyFailText(kept);
      return paintSheet();
    }
    const r = await endCall(n, () => netApi('DELETE', `v1/notes/${n.shared.id}`));
    if (r.error && r.error !== 'not_found') {
      sheetMode.confirm = '';
      fail(r.error);
      return paintSheet();
    }
    closeSheet();
    makePrivate(n);
    tellUser('Not shared any more. The note is yours alone again.');
  }
  async function leaveNote(keep) {
    const n = cur;
    if (!n || !n.shared || n.shared.mine) return;
    const title = nameOf(n);
    // Keeping a copy means keeping its files: they are fetched before this account is out of the note.
    const kept = keep ? await copyFilesHere() : '';
    if (kept) {
      sheetMode.confirm = '';
      sheetMode.error = copyFailText(kept);
      return paintSheet();
    }
    const r = await endCall(n, () => netApi('DELETE', `v1/notes/${n.shared.id}/members/${myId()}`));
    if (r.error && r.error !== 'not_found') {
      sheetMode.confirm = '';
      fail(r.error);
      return paintSheet();
    }
    closeSheet();
    if (keep) {
      makePrivate(n);
      tellUser('You left the note. A private copy stays here.');
    } else wipe(n, 'left', title);
  }
  // Ends the sharing before a shared note is deleted: the owner stops it, a member leaves. False when it couldn't be done.
  async function endSharing(n) {
    if (!n.shared) return true;
    const r = await endCall(n, () => (n.shared.mine ? netApi('DELETE', `v1/notes/${n.shared.id}`) : netApi('DELETE', `v1/notes/${n.shared.id}/members/${myId()}`)));
    if (r.error && r.error !== 'not_found') {
      tellUser('Couldn’t reach the server, so the note is still shared. Try again when you’re online.');
      return false;
    }
    return true;
  }

  // No longer in the note (removed, the owner stopped sharing, or left without a copy): nothing of it stays on this computer.
  const WHY = {
    removed: (t) => `You were removed from “${t}”. Its copy on this computer is gone.`,
    unshared: (t) => `“${t}” isn’t shared any more. Its copy on this computer is gone.`,
    left: (t) => `You left “${t}”.`,
  };
  // The line or the account says this account is no longer in the note. Checked first: it must be this note's own account
  // (signed in as someone else, nothing of this account's notes is wiped), and the server must be reachable to say so.
  async function confirmGone(n) {
    const r = await netApi('GET', 'v1/social');
    const acct = !r.error && r.me && r.me.id;
    if (!acct) return 'fail';
    if (n.shared && n.shared.me && n.shared.me !== acct) {
      if (n === cur) stopSync(false);
      tellUser('This shared note belongs to another account. Sign in with that account to use it.');
      return 'other';
    }
    return 'yes';
  }
  function dropShared(id, why = 'removed', tries = 0) {
    const n = notes.find((x) => x.id === id || (x.shared && x.shared.id === id));
    // A note this page is ending itself, or one a window holds (the window knows, and says): not wiped from here.
    if (!n || !n.shared || ending.has(n.shared.id) || (!WINDOW && out.has(n.id))) return;
    confirmGone(n).then((v) => {
      if (!notes.includes(n) || !n.shared || ending.has(n.shared.id)) return;
      if (v === 'yes') return wipe(n, why);
      if (v !== 'fail') return;
      // Couldn't ask (no connection just now): again in a moment, and then the line is opened again, which asks anew.
      if (tries < 6) setTimeout(() => dropShared(id, why, tries + 1), 5000);
      else if (n === cur && model && !sync) startSync(n);
    });
  }
  // From a note window that has found out (and checked) that it's out of the note.
  function dropSharedNow(id, why = 'removed') {
    const n = notes.find((x) => x.id === id || (x.shared && x.shared.id === id));
    if (n && n.shared && !ending.has(n.shared.id)) wipe(n, why);
  }
  function wipe(n, why, title = nameOf(n)) {
    if (WINDOW) return void post({ type: 'sharedGone', why }); // its window closes, and the dashboard's page drops it
    if (n === cur) stopSync(false);
    if (sheetEl && n === cur) closeSheet();
    forgetFiles(n);
    forgetY(n.id);
    ydocs.delete(n.id);
    ydocFresh.delete(n.id);
    removeNote(n.id, true);
    const text = (WHY[why] || WHY.removed)(title);
    tellUser(text);
    if (board) {
      const t = document.createElement('div');
      t.className = 'sh-board-toast';
      t.textContent = text;
      board.querySelector('.np-board')?.prepend(t);
      setTimeout(() => t.remove(), 9000);
    }
  }

  // ---------- invites, notes added and changed by the live line (the dashboard's page) ----------
  function viewToNote(v) {
    return { v: VERSION, id: v.id, name: nextName(), created: Date.now(), at: Date.now(), blocks: [], ...sharedKeep({ ...v, mine: false, me: myId() }) };
  }
  function addShared(v) {
    if (WINDOW || !canShare || !v || !UUID.test(String(v.id)) || v.pending) return;
    const had = notes.find((n) => n.id === v.id || (n.shared && n.shared.id === v.id));
    if (had) return setMeta(had, { members: v.members, ai: v.ai });
    const n = keepNote(viewToNote(v));
    sharedSince.set(n.id, Date.now());
    notes.unshift(n);
    write();
    drawBoard();
    peekShared(n);
  }
  // The invite was accepted (here or on another computer): its window opens once the note is in.
  async function openShared(id) {
    for (let i = 0; i < 40; i++) {
      await isLoaded;
      const n = notes.find((x) => x.id === id || (x.shared && x.shared.id === id));
      if (n) return NATIVE ? (write(), openOut(n.id)) : openNote(n.id);
      if (i === 3 && window.Social) await Social.loadNoteInvites();
      await nap(250);
    }
    tellUser('The shared note isn’t here yet. It will show in your notes when it arrives.');
  }
  // The server's list, once the line is (re)connected: what happened while it was down (a removal, a new note).
  async function reconcile() {
    await isLoaded;
    if (WINDOW || !canShare) return;
    // Only notes that were shared before the question was asked can be told gone by its answer, and only for the account that
    // is signed in now (after a sign-out nothing of the other account's is touched).
    const asked = Date.now();
    const [r, soc] = await Promise.all([netApi('GET', 'v1/notes'), netApi('GET', 'v1/social')]);
    const acct = !soc.error && soc.me && soc.me.id;
    if (r.error || !Array.isArray(r.notes) || !acct) return;
    const mineIn = r.notes.filter((v) => !v.pending);
    for (const n of notes.filter((x) => x.shared)) {
      const v = mineIn.find((x) => x.id === n.shared.id);
      // A note the server lists for this account is this account's (a merge moved it here): its `me` follows. One it doesn't list
      // and that belongs to another account is left alone.
      if (!v) {
        if (n.shared.me && n.shared.me !== acct) continue;
        if ((sharedSince.get(n.id) || 0) < asked && !ending.has(n.shared.id) && !out.has(n.id)) wipe(n, 'removed');
      } else {
        setMeta(n, { members: v.members, ai: v.ai, mine: v.owner && v.owner.id === acct, me: acct });
        if (n === cur && !sync && !out.has(n.id)) startSync(n);
        else if (n !== cur) peekShared(n);
      }
    }
    for (const v of mineIn) addShared(v);
  }
  function sharedEvent(ev) {
    if (WINDOW || !ev || typeof ev.type !== 'string') return;
    switch (ev.type) {
      case 'hello':
        return void reconcile();
      case 'note.added':
        return addShared(ev.note);
      case 'note.removed':
        return dropShared(ev.id, 'removed');
      case 'note.unshared':
        return dropShared(ev.id, 'unshared');
      case 'note.meta': {
        const n = notes.find((x) => x.shared && x.shared.id === ev.id);
        return n && setMeta(n, { ai: !!ev.ai });
      }
      case 'note.members': {
        const n = notes.find((x) => x.shared && x.shared.id === ev.id);
        return n && setMeta(n, { members: ev.members });
      }
      case 'note.presence':
        presence.set(ev.id, Array.isArray(ev.here) ? ev.here : []);
        return drawBoard();
      case 'note.changed': {
        const n = notes.find((x) => x.shared && x.shared.id === ev.id);
        return n && peekShared(n);
      }
      case 'noteInvites':
      case 'note.invite':
      case 'note.invite_gone':
        return drawBoard();
    }
  }
  window.Social?.on(sharedEvent);

  // A visit to a shared note nobody has open here: its document is synced once, kept, and the board's small page follows. One at a time.
  const peekQueue = [];
  let peeking = false;
  function peekShared(n) {
    if (WINDOW || !n || !n.shared || peekQueue.includes(n)) return;
    const acct = window.Social?.state?.()?.me?.id;
    if (acct && n.shared.me && n.shared.me !== acct) return;
    peekQueue.push(n);
    runPeeks();
  }
  async function runPeeks() {
    if (peeking) return;
    peeking = true;
    while (peekQueue.length) {
      const n = peekQueue.shift();
      await capsReady;
      if (!canShare || !notes.includes(n) || !n.shared || n === cur || out.has(n.id)) continue;
      await new Promise((done) => {
        askApp('loadY', { id: n.id }).then((r) => {
          const m = new NS.NoteModel([]);
          m.shared = true;
          if (r && typeof r.b64 === 'string') m.applyState(NS.unb64(r.b64));
          let over = false;
          const finish = (keep) => {
            if (over) return;
            over = true;
            clearTimeout(t);
            prov.close();
            if (keep && notes.includes(n) && n !== cur && !out.has(n.id) && m.map.size > 0) {
              n.blocks = m.toBlocks();
              n.at = Date.now();
              askApp('saveY', { id: n.id, b64: NS.b64(m.encodeState()) });
              write();
              drawBoard();
            }
            m.destroy();
            done();
          };
          const prov = new NS.SharedProvider(m.doc, {
            quiet: true,
            ticket: ticketFor(n),
            on: {
              status: (s) => s === 'live' && setTimeout(() => finish(true), 250),
              gone: (why) => (finish(false), dropShared(n.id, why)),
              error: () => finish(false),
            },
          });
          const t = setTimeout(() => finish(false), 20000);
          prov.connect();
        });
      });
    }
    peeking = false;
  }
  function netBack() {
    sync && sync.prov.netBack();
    // A line that was closed for good (its 'gone' couldn't be checked) is opened anew: that asks the server again.
    if (!sync && cur && cur.shared && model && !placeholder && (WINDOW || !out.has(cur.id)) && !ending.has(cur.shared.id)) startSync(cur);
    for (const n of notes) if (n.shared && n !== cur && !out.has(n.id)) peekShared(n);
  }

  // ---------- what an AI sees and does (NotesTools.swift asks; Claude Code, Codex and Antigravity through MCP) ----------
  // Every change an AI makes goes through here, the notes' one writer, never to the files: the note redraws at once, is kept
  // encrypted as any typing is, and ⌘Z takes it back as one step. A note out in its own window is changed by that window's
  // page (NotesTools asks the page that holds the note live), so what the user is typing there is never overwritten.
  // The note as Markdown is what an AI reads and writes (toText and fromText); its `version` is a hash of that text.
  let lastInputAt = 0;
  let composing = false;
  ed.addEventListener('beforeinput', () => (lastInputAt = Date.now()));
  ed.addEventListener('compositionstart', () => {
    composing = true;
    // A shared note: places for every position of the block as drawn, so what's typed lands where it was meant.
    const t = document.activeElement && document.activeElement.closest && document.activeElement.closest('.np-ed .nb-text');
    const b = sync && t && blockOf(t);
    comp = b && typeof t._t === 'string' && t._t.length <= 4000 && model.has(b.id) ? { id: b.id, text: t._t, rps: Array.from({ length: t._t.length + 1 }, (_, i) => model.relPos(b.id, i)) } : null;
  });
  ed.addEventListener('compositionend', () => {
    composing = false;
    comp = null;
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
    return notes.map((n, i) => (aiOff(n) ? null : { n, i })).filter(Boolean).map(({ n, i }) => {
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
        ...(n.shared ? { shared: true, members: n.shared.members.map((m) => m.name) } : {}),
        inWindow: out.has(n.id),
        session: n.session || null,
        sessionLabel: n.sessionLabel || null,
        // The app decides which notes are this session's project's (it knows the session's folder), and says only the name.
        project: n.project ? { dir: n.project.dir, name: n.project.name } : null,
      };
    });
  }

  async function agentRead(id) {
    await isLoaded;
    const n = notes.find((x) => x.id === id);
    if (!n || aiOff(n)) return { error: 'not_found' };
    const md = toText(blocksOf(n));
    return { id: n.id, title: nameOf(n), version: hashOf(md), changed: n.at || null, chars: md.length, markdown: md };
  }

  // The blocks of a note made `next` as one step, by the fewest changes to its document (a block the same stays, one that
  // differs is changed where it is: what is typed in the others meanwhile is kept): the live editor's (⌘Z takes it back, and
  // the strip's Undo, which takes back what AI did and nothing else), or a note that isn't being written here.
  function setBlocksOf(n, next, by) {
    const who = new NS.AiOrigin(by);
    if (n === cur && !out.has(n.id)) {
      const was = snapFocus();
      pendingFocus = was;
      um.stopCapturing();
      model.as(who, () => model.replaceAll(next));
      um.stopCapturing();
      lastKind = '';
      // The cursor stays in its block, or, if an AI took that block away, goes to the one at the same place.
      let f = was && blocks[idx(was.id)];
      if (was && !f) f = blocks.slice(Math.min(was.i, blocks.length - 1)).find((x) => !textless(x)) || [...blocks].reverse().find((x) => !textless(x));
      render(f && !textless(f) ? { id: f.id, at: f.id === was.id ? Math.min(was.at, f.text.length) : 0 } : null);
      save();
    } else {
      // Not live: its blocks are made a document for the moment, so the ids of those that stay are the same.
      const m = new NS.NoteModel(liveOf(n.blocks));
      m.as(who, () => m.replaceAll(next));
      n.blocks = m.toBlocks();
      m.destroy();
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
    if (!n || aiOff(n)) return { error: 'not_found', message: 'No note has this id. List the notes again.' };
    const op = req.op;
    if (!['append', 'edit', 'write'].includes(op)) return bad('Unknown operation.');
    const live = n === cur && !out.has(n.id);
    // A shared note is written through its open document, so the others get the change: not one that isn't open here.
    if (n.shared && !live) return { error: 'busy', message: 'This is a shared note and it is not open right now. Ask the user to open it, then try again.' };
    // An addition goes in at once, at the end, wherever the cursor is. Anything that rewrites waits for a pause in typing.
    if (op !== 'append' && live) {
      for (let waited = 0; typing(); waited += 200) {
        if (waited >= 10000) return { error: 'busy', message: 'The user is typing in this note right now. Try again in a few seconds.' };
        await nap(200);
      }
    }
    // The user may have hidden (or deleted) it while this waited.
    if (!notes.includes(n) || aiOff(n)) return { error: 'not_found', message: 'No note has this id. List the notes again.' };
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
      const hit = base.filter((b) => TYPES[b.type] && b.text.includes(old));
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
    const live = n === cur && !out.has(n.id);
    const steps0 = live ? aiUm.undoStack.length : 0;
    await setBlocksOf(n, next, by);
    const after = hashOf(toText(blocksOf(n)));
    // `steps`: how many changes of AI the live document can take back now (the last one is this); a note that isn't live has
    // none, and its Undo writes `before` back.
    lastAi = { id: n.id, by: String(by || 'AI').slice(0, 24), at: Date.now(), before: keep, after, steps: live && aiUm.undoStack.length > steps0 ? aiUm.undoStack.length : -1 };
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
    // A live note takes back the last AI change from the document's own history, so what others wrote meanwhile stays; one
    // that isn't live (or whose history was lost) has its blocks put back.
    if (n === cur && !out.has(n.id) && a.steps > 0 && aiUm.undoStack.length === a.steps) {
      pendingFocus = snapFocus();
      staleUi();
      um.stopCapturing();
      aiUm.undo();
      um.stopCapturing();
      lastKind = '';
      render(null);
      save();
    } else await setBlocksOf(n, a.before, a.by);
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
    if (!n || aiOff(n)) return { error: 'not_found' };
    // Another note held by this terminal lets go: a terminal has one note.
    const free = (o) => {
      delete o.session;
      delete o.sessionLabel;
    };
    if (session) {
      for (const o of notes) if (o !== n && !aiOff(o) && o.session === session) free(o);
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
    // The project is the app's (from the AI's own terminal), only when the AI asked for the note to be linked.
    if (req.project) Object.assign(n, projectOf({ project: req.project }));
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
    if (req && req.unpin) n = notes.find((x) => !aiOff(x));
    else {
      n = notes.find((x) => x.id === (req && req.id));
      if (!n || aiOff(n)) return gone;
    }
    // A note the user hid from AI stays pinned: pinning another one, as unpinning, would take it off the panel.
    if (!prev || aiOff(prev)) return { error: 'locked' };
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
    if (!n || aiOff(n)) return { error: 'not_found' };
    if (!NATIVE) return { error: 'unsupported' };
    // The panel's own note going out to its window: not under the user's keys.
    if (action === 'open' && n === cur && !out.has(id)) {
      if (!(await pause())) return { error: 'busy' };
      if (!notes.includes(n) || aiOff(n)) return { error: 'not_found' };
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
    // Its window takes the note's line (and its document's file) from here on.
    if (n === cur && sync) stopSync();
    ydocFresh.delete(id);
    out.add(id);
    if (sheetEl && n === cur) closeSheet();
    paintShare();
    paintAway();
    popState();
    stamp();
    drawBoard();
    return JSON.stringify({ v: VERSION, ordered: true, pinned: id, current: id, notes: [{ ...n, blocks: blocksOf(n) }] });
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
    // The dashboard's own copy of the sharing (who's in, whether AI may read it) wins; a window only says that it ended it.
    if (note.endedShare === true && n.shared) {
      delete n.shared;
      ydocs.delete(n.id);
      ydocFresh.delete(n.id);
    } else if (!n.shared && note.startedShare) {
      Object.assign(n, sharedKeep(note.startedShare));
      sharedSince.set(n.id, Date.now());
    }
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
    if (cur && sync && out.has(cur.id)) stopSync();
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
      prefetchY(v.notes).then(() => {
        loadAll(v);
        render(null);
        stamp();
        refocus();
        loaded();
      });
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
      .then((v) => (v && Array.isArray(v.notes) ? prefetchY(v.notes).then(() => v) : v))
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
        // The shared notes' small pages are brought up to date, one after the other.
        capsReady.then((ok) => ok && notes.forEach((n) => n.shared && peekShared(n)));
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
    setProject,
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
    netBack,
    openShared,
    dropShared,
    dropSharedNow,
    addShared,
    mountSignIn,
  };
})();
