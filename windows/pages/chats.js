'use strict';
// The chats list beside the dashboard (the Mac's SidebarView, Sidebar.swift): the saved conversations by project, newest
// first, the starred ones on top, each folder a panel of its own with the app's terminals in it over its chats. The
// folders opened with the open folder button head the list. A click opens a chat or shows a terminal, a right-click has
// the rest; a star or the archive box shows on hover; a click on a folder's strip folds it shut or open. The app sends
// the list (src/chatlist.js) and does what's asked of it; the search, the folders opened past their first five chats,
// the folded ones (kept in this page's storage) and the chats or folders picked (Ctrl+click on a chat or on a folder's
// strip, Shift+click for every chat up to it) for archiving or deleting several at once are this page's.
(() => {
  const post = (msg) => window.webkit.messageHandlers.chats.postMessage(msg);
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const svg = (body) => `<svg viewBox="0 0 16 16" aria-hidden="true">${body}</svg>`;
  const ICON = {
    lens: svg('<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 14 14"/>'),
    x: svg('<path d="M4 4l8 8M12 4l-8 8"/>'),
    star: svg('<path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z"/>'),
    archive: svg('<rect x="1.5" y="2.5" width="13" height="3.5" rx=".8"/><path d="M2.8 6v6.7c0 .5.4.8.8.8h8.8c.4 0 .8-.3.8-.8V6M6.3 8.8h3.4"/>'),
    folder: svg('<path d="M1.5 4.2c0-.6.5-1.2 1.1-1.2h3.3l1.5 1.6h6c.6 0 1.1.5 1.1 1.1v6.6c0 .6-.5 1.2-1.1 1.2H2.6c-.6 0-1.1-.6-1.1-1.2z"/>'),
    plus: svg('<path d="M8 3v10M3 8h10"/>'),
    chev: svg('<path d="M6 4l4 4-4 4"/>'),
    term: svg('<rect x="1.5" y="2.5" width="13" height="11" rx="1.5"/><path d="M4.5 6.2 6.8 8l-2.3 1.8M8.5 10.2h3"/>'),
    pin: svg('<path d="M9.8 1.8 14.2 6.2l-2 .4-2.6 2.6.3 3.1-1.3 1.3L5.9 10.9 2.6 14.2M5.9 10.9 2.8 7.8l1.3-1.3 3.1.3 2.6-2.6z"/>'),
    open: svg('<path d="M1.5 4.2c0-.6.5-1.2 1.1-1.2h3.3l1.5 1.6h6c.6 0 1.1.5 1.1 1.1v1.2"/><path d="M1.5 4.2v7.6c0 .6.5 1.2 1.1 1.2h9.2l2.7-6H4.4L1.6 13"/>'),
    tick: svg('<circle cx="8" cy="8" r="6.4"/><path d="M5.1 8.3l2 2 3.8-4.3"/>'),
    // A linked worktree's folder (the Mac's arrow.triangle.branch).
    branch: svg('<circle cx="4.5" cy="3" r="1.6"/><circle cx="4.5" cy="13" r="1.6"/><circle cx="11.5" cy="5" r="1.6"/><path d="M4.5 4.6v6.8M11.5 6.6c0 3.2-7 2.4-7 4.8"/>'),
  };
  $('openFolder').querySelector('.ic').innerHTML = ICON.open;
  $('lens').innerHTML = ICON.lens;
  $('close').innerHTML = ICON.x;
  $('bulkClear').innerHTML = ICON.x;

  let data = { rows: [], terms: [], pinned: [], saved: 0, live: 0, folders: {} };
  // The focused window's session, and the conversation it is in when that's another id (an AI tool's "ai:…" session in a
  // plain terminal): its row is marked by either, or by the live session the app says the row is (`sid`), as the Mac's
  // row is by its brief (Sidebar.swift).
  let activeId = null;
  let activeAlt = null;
  const isActive = (r) => (!!activeId && (r.id === activeId || r.sid === activeId)) || (!!activeAlt && r.id === activeAlt);
  let query = '';
  const expanded = new Set();
  // Folders folded shut: kept in this page's storage.
  const folded = (() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('chats.folded') || '[]'));
    } catch {
      return new Set();
    }
  })();
  const keepFolded = () => {
    try {
      localStorage.setItem('chats.folded', JSON.stringify([...folded]));
    } catch {}
  };
  const picked = new Set();
  // Chats picked (Ctrl+click; Shift+click for all up to it) for deleting or archiving several at once, and the one
  // picked last, where a Shift+click's run starts. Chats or folders are picked, never both.
  const pickedChats = new Set();
  let lastPicked = null;
  // The chat being renamed in place: ↩ keeps the name, Esc (or a click elsewhere) leaves it.
  let renaming = null;
  // What moves eases in 0.2 to 0.25 s, as the Mac's withAnimation(.easeInOut) does (Sidebar.swift): a chat starred or
  // unstarred grows in where it lands (`arrive`, until the app's list has it there), a folder unfolded grows its rows in
  // (`unfolding`, for one drawing), one folded or archived and an archived chat shrink away first. Not with the system's
  // reduced motion.
  let arrive = null, unfolding = null, foldTimer = 0;
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function relative(ms) {
    // A live chat with nothing saved yet comes without a time: it's happening now.
    if (ms == null) return 'now';
    const s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 60) return 'now';
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86_400) return `${Math.floor(s / 3600)}h`;
    if (s < 86_400 * 30) return `${Math.floor(s / 86_400)}d`;
    return `${Math.floor(s / (86_400 * 30))}mo`;
  }
  const fmtBytes = (n) => (n >= 1 << 20 ? `${(n / (1 << 20)).toFixed(1)}MB` : n >= 1024 ? `${Math.floor(n / 1024)}KB` : `${n}B`);

  function meta(r) {
    const bits = [relative(r.mtime)];
    if (r.size > 0) bits.push(fmtBytes(r.size));
    if (isActive(r)) bits.push('active window');
    else if (r.open) bits.push('in a window');
    else if (r.status) bits.push(r.host === 'term' ? 'in another terminal' : 'live');
    if (r.status === 'waiting') bits.push('NEEDS YOU');
    else if (r.status === 'idle') bits.push('your turn');
    return bits.join(' · ');
  }

  function row(r) {
    const st = r.status || 'ended';
    const on = isActive(r);
    // Just starred or unstarred, and now where the app's list puts it: it grows in there.
    const lands = !!arrive && r.id === arrive.id && r.fav === arrive.fav;
    const badge = r.tool === 'antigravity' ? '<span class="tool-badge">agy</span>' : r.tool === 'codex' ? '<span class="tool-badge">codex</span>' : r.tool === 'cursor' ? '<span class="tool-badge">cursor</span>' : '';
    // Picked: a tick in its light's place, and a brighter row.
    const sel = pickedChats.has(r.id);
    return `<div class="row${r.open ? ' open' : ''}${on ? ' active' : ''}${sel ? ' sel' : ''}${lands ? ' arrive' : ''}" data-id="${esc(r.id)}" title="${esc(r.lastPrompt || r.title)}">` +
      (sel ? `<span class="tick">${ICON.tick}</span>` : `<span class="dot s-${esc(st)}${r.status ? '' : ' hollow'}"></span>`) +
      (r.id === renaming
        ? `<span class="txt"><input class="ren" value="${esc(r.title || r.lastPrompt)}" spellcheck="false" maxlength="120">`
        : `<span class="txt"><span class="t${r.status ? ' live' : ''}">${esc(r.title || r.lastPrompt)}${badge}</span>`) +
      `<span class="m${st === 'waiting' ? ' warn' : ''}">${esc(meta(r))}</span></span>` +
      `<button type="button" class="star${r.fav ? ' on' : ''}" data-act="star" title="${r.fav ? 'Remove from favorites' : 'Add to favorites: it stays at the top'}">${ICON.star}</button>` +
      `<button type="button" data-act="archive" title="Archive: out of the list (Settings lists it)">${ICON.archive}</button></div>`;
  }

  // One of the app's terminals with no Claude in it: what runs in it, whether its window shows.
  function termRow(t) {
    const bits = ['terminal', t.job || 'idle'];
    if (t.shown) bits.push('showing');
    // `tip`: what its tooltip says in streamer mode (no real folder).
    return `<div class="row term${t.shown ? ' open' : ''}" data-term="${esc(t.id)}" title="${esc(t.tip || `${t.title} · ${t.cwd}`)}">` +
      `<span class="ti${t.job ? ' busy' : ''}">${ICON.term}</span>` +
      `<span class="txt"><span class="t live">${esc(t.title || 'terminal')}</span><span class="m">${esc(bits.join(' · '))}</span></span></div>`;
  }

  function head(g) {
    const f = data.folders[g.key] || { label: g.cwd, path: g.cwd };
    const sel = picked.has(g.key);
    const shut = folded.has(g.key) && !query;
    const tip = sel ? 'Selected · Ctrl+click again to leave it out' : `${f.path} · click to fold ${shut ? 'open' : 'shut'} · Ctrl+click to select, for archiving or deleting several at once`;
    const n = g.items.length + g.terms.length;
    // A linked worktree's folder: its state after the label ("+42 −7", "#48 ✓", "merged ✓", "deleted"), as the Mac's
    // worktree group header shows it; a deleted one's strip is dimmed and has no "+".
    const wt = f.wt && f.wt.state;
    const gone = !!(wt && wt.deleted);
    return `<div class="head${sel ? ' sel' : ''}${f.wt ? ' wt' : ''}${gone ? ' wtgone' : ''}" data-key="${esc(g.key)}" data-cwd="${esc(g.cwd)}" data-pinned="${g.pinned ? 1 : ''}" title="${esc(tip)}">` +
      `<span class="chev">${ICON.chev}</span>${g.pinned ? `<span class="pin" title="Opened from the list">${ICON.pin}</span>` : f.wt ? ICON.branch : ICON.folder}` +
      `<span class="lbl"><bdi>${esc(f.label)}</bdi></span><span class="n">${n}</span>` +
      (g.terms.length ? `<span class="tn" title="${g.terms.length} terminal${g.terms.length > 1 ? 's' : ''} in the app">${ICON.term}${g.terms.length}</span>` : '') +
      '<span class="fill"></span>' +
      (wt ? `<span class="wts">${esc(wt.text)}</span>` : '') +
      `<button type="button" class="farc" data-act="archive" title="Archive the folder: all its chats out of the list">${ICON.archive}</button>` +
      (gone ? '' : `<button type="button" class="plus" data-act="new" title="New terminal in this folder">${ICON.plus}</button>`) + '</div>';
  }

  function render() {
    $('count').textContent = `${data.saved} saved · ${data.live} live`;
    const q = query.trim().toLowerCase();
    // A renamed chat by its own name or the title its AI gave it (`origTitle`), as the Mac's search has both.
    const rows = q ? data.rows.filter((r) => `${r.title} ${r.origTitle || ''} ${r.lastPrompt} ${r.cwd}`.toLowerCase().includes(q)) : data.rows;
    const terms = (data.terms || []).filter((t) => !q || `${t.title} ${t.job} ${t.cwd}`.toLowerCase().includes(q));
    const favs = rows.filter((r) => r.fav);
    const groups = [];
    const byKey = new Map();
    const group = (key, cwd) => {
      let g = byKey.get(key);
      if (!g) {
        byKey.set(key, (g = { key, cwd: (data.folders[key] && data.folders[key].cwd) || cwd, items: [], terms: [], pinned: false }));
        groups.push(g);
      }
      return g;
    };
    // The folders opened from the list first, as they were opened, then the rest by their newest chat.
    for (const key of data.pinned || []) group(key, '').pinned = true;
    for (const r of rows) if (!r.fav) group(r.key, r.cwd).items.push(r);
    for (const t of terms) group(t.key, t.cwd).terms.push(t);
    let html = favs.length
      ? `<section class="grp fav"><div class="sec">${ICON.star}<b>FAVORITES</b><span class="n">${favs.length}</span></div>${favs.map(row).join('')}</section>`
      : '';
    for (const g of groups) {
      // Searching: only the folders with something that matches.
      if (q && !g.items.length && !g.terms.length) continue;
      const shut = folded.has(g.key) && !q;
      const all = expanded.has(g.key) || query !== '';
      let body = '';
      if (!shut) {
        body += g.terms.map(termRow).join('') + (all ? g.items : g.items.slice(0, 5)).map(row).join('');
        if (!all && g.items.length > 5) body += `<button type="button" class="more" data-key="${esc(g.key)}">+${g.items.length - 5} more</button>`;
        if (!g.items.length && !g.terms.length) body += '<div class="empty">nothing here yet · <button type="button" data-act="new">open a terminal</button></div>';
      }
      const opening = !shut && g.key === unfolding ? ' unfolding' : '';
      html += `<section class="grp${g.pinned ? ' pinned' : ''}${shut ? ' shut' : ''}${opening}${g.terms.some((t) => t.shown) || g.items.some((r) => r.open) ? ' live' : ''}" data-key="${esc(g.key)}" data-cwd="${esc(g.cwd)}">${head(g)}${body}</section>`;
    }
    if (!html) html = `<div class="none">${q ? 'nothing matches' : 'no chats yet · open a folder to start'}</div>`;
    $('list').innerHTML = html;
    // Grown in once: the next drawing (the app's next list, the clock's) draws them as they are.
    unfolding = null;
    if (arrive && ($('list').querySelector('.row.arrive') || performance.now() > arrive.until)) arrive = null;
    const ren = renaming && $('list').querySelector('.ren');
    if (ren) {
      ren.focus();
      ren.select();
      ren.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          renaming = null;
          post({ type: 'rename', id: e.target.closest('.row').dataset.id, name: ren.value });
        } else if (e.key === 'Escape') {
          renaming = null;
          render();
        }
      });
      ren.addEventListener('blur', () => {
        if (!renaming) return;
        renaming = null;
        render();
      });
    }
    const n = picked.size || pickedChats.size;
    $('bulk').hidden = !n;
    $('picked').textContent = `${n} selected`;
  }

  const pick = (key) => {
    pickedChats.clear();
    lastPicked = null;
    if (!picked.delete(key)) picked.add(key);
    render();
  };
  // Ctrl+click, or a click while some are picked: this chat in or out of the picked ones.
  const pickChat = (id) => {
    picked.clear();
    if (!pickedChats.delete(id)) pickedChats.add(id);
    lastPicked = id;
    render();
  };
  // Shift+click: every chat shown from the one picked last to this one (a folded folder's and those behind "+N more"
  // aren't shown).
  const pickUpTo = (id) => {
    const shown = [...$('list').querySelectorAll('.row[data-id]')].map((el) => el.dataset.id);
    const from = shown.indexOf(lastPicked), to = shown.indexOf(id);
    if (from < 0 || to < 0) {
      if (!pickedChats.has(id)) pickChat(id);
      return;
    }
    picked.clear();
    for (let i = Math.min(from, to); i <= Math.max(from, to); i++) pickedChats.add(shown[i]);
    render();
  };
  const clearPicked = () => {
    picked.clear();
    pickedChats.clear();
    lastPicked = null;
    render();
  };
  const archiveFolders = (keys, on) => {
    picked.clear();
    post({ type: 'folders', keys, on });
    render();
  };
  // Delete…: the app asks first; what's deleted leaves the list then, and nothing stays picked.
  const remove = async (msg) => {
    if ((await post(msg)) === true) clearPicked();
  };
  // A star given or taken: the app moves the chat (to FAVORITES or back to its folder), and it grows in where it lands.
  const star = (id) => {
    const r = data.rows.find((x) => x.id === id);
    arrive = r && !calm() ? { id, fav: !r.fav, until: performance.now() + 1500 } : null;
    post({ type: 'favorite', id });
  };
  // Archived: the chats' rows or the folders' panels shrink away (0.25 s), then the app takes them out of the list. A
  // drawing meanwhile (the app's list came) only cuts it short.
  const leave = (els, then) => {
    const shown = els.filter(Boolean);
    if (!shown.length || calm()) return then();
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      then();
    };
    // Each from its own height (a folder's panel is taller than a row).
    const heights = shown.map((el) => el.offsetHeight);
    shown.forEach((el, i) => {
      el.style.setProperty('--h', `${heights[i]}px`);
      // A row that just grew in (starred, its folder unfolded) would keep that animation over this one.
      el.classList.remove('arrive');
      if (el.parentElement) el.parentElement.classList.remove('unfolding');
      el.classList.add('leaving');
    });
    shown[0].addEventListener('animationend', (e) => e.target === shown[0] && go());
    setTimeout(go, 300);
  };
  const rowEl = (id) => [...$('list').querySelectorAll('.row[data-id]')].find((el) => el.dataset.id === id);
  const folderEl = (key) => [...$('list').querySelectorAll('.grp[data-key]')].find((el) => el.dataset.key === key);
  const archiveChat = (id) => leave([rowEl(id)], () => post({ type: 'archive', id }));
  const archiveFolder = (key) => leave([folderEl(key)], () => post({ type: 'folders', keys: [key], on: true }));

  $('list').addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (button && button.classList.contains('more')) {
      expanded.add(button.dataset.key);
      return render();
    }
    const tr = e.target.closest('.row.term');
    if (tr) return post({ type: 'showTerminal', id: tr.dataset.term });
    const empty = e.target.closest('.empty');
    if (empty && button) return post({ type: 'newTerminal', cwd: empty.closest('.grp').dataset.cwd });
    const r = e.target.closest('.row');
    if (r && e.target.classList.contains('ren')) return;
    if (r) {
      const act = button && button.dataset.act;
      if (act === 'star') return star(r.dataset.id);
      if (act === 'archive') return archiveChat(r.dataset.id);
      // Shift+click picks all up to it, Ctrl+click picks it; while some are picked a click picks too, so one that
      // misses its key doesn't open a chat (and start Claude). Else a click opens it.
      if (e.shiftKey) return pickUpTo(r.dataset.id);
      if (e.ctrlKey || e.metaKey || pickedChats.size) return pickChat(r.dataset.id);
      return post({ type: 'open', id: r.dataset.id });
    }
    const h = e.target.closest('.head');
    if (!h) return;
    const act = button && button.dataset.act;
    if (act === 'archive') return archiveFolder(h.dataset.key);
    if (act === 'new') return post({ type: 'newTerminal', cwd: h.dataset.cwd });
    // Ctrl+click picks it for archiving several at once; a click folds it shut or open.
    if (e.ctrlKey || e.metaKey || e.shiftKey) return pick(h.dataset.key);
    fold(h.dataset.key);
  });

  // Folding shut, its rows shrink away (0.2 s) before it's drawn shut; folding open, they grow in.
  function fold(key) {
    const shutting = !folded.has(key);
    if (shutting) folded.add(key);
    else folded.delete(key);
    keepFolded();
    clearTimeout(foldTimer);
    const el = !query && !calm() ? folderEl(key) : null;
    if (shutting && el) {
      el.classList.remove('unfolding');
      el.classList.add('folding');
      foldTimer = setTimeout(render, 200);
      return;
    }
    if (!shutting && el) unfolding = key;
    render();
  }

  // A chat's or a folder's menu, as on the Mac (a native one, from the app).
  document.addEventListener('contextmenu', async (e) => {
    e.preventDefault();
    const at = { x: Math.round(e.clientX), y: Math.round(e.clientY) };
    const tr = e.target.closest('.row.term');
    if (tr) {
      const t = (data.terms || []).find((x) => x.id === tr.dataset.term);
      if (!t) return;
      const choice = await post({
        type: 'menu', at, items: [
          { id: 'show', title: 'Show Terminal' },
          { id: 'new', title: 'New Terminal in This Folder' },
          { id: 'reveal', title: 'Show Folder in Explorer' },
          { separator: true },
          { id: 'end', title: 'End Terminal' },
        ],
      });
      if (choice === 'show') post({ type: 'showTerminal', id: t.id });
      else if (choice === 'end') post({ type: 'endTerminal', id: t.id });
      else if (choice === 'new' || choice === 'reveal') post({ type: choice === 'new' ? 'newTerminal' : 'reveal', cwd: t.cwd });
      return;
    }
    const r = e.target.closest('.row');
    const h = !r && e.target.closest('.head');
    if (r) {
      const item = data.rows.find((x) => x.id === r.dataset.id);
      if (!item) return;
      // With others picked too, its menu's Delete is for all of them.
      const sel = pickedChats.has(item.id);
      const many = sel && pickedChats.size > 1 ? [...pickedChats] : null;
      const choice = await post({
        type: 'menu', at, items: [
          { id: 'rename', title: 'Rename…' },
          { id: 'favorite', title: item.fav ? 'Remove from Favorites' : 'Add to Favorites' },
          { id: 'archive', title: 'Archive' },
          { id: 'select', title: sel ? 'Deselect' : 'Select' },
          { separator: true },
          { id: 'open', title: 'Open in a Window' },
          ...(item.tool !== 'claude' ? [] : [{ id: 'fork', title: 'Open a Copy (fork)' }]),
          { id: 'new', title: 'New Terminal in This Folder' },
          { separator: true },
          { id: 'reveal', title: 'Show Folder in Explorer' },
          { id: 'copyId', title: 'Copy Session ID' },
          { separator: true },
          { id: 'delete', title: many ? `Delete the ${many.length} Selected Chats…` : 'Delete…' },
        ],
      });
      if (choice === 'rename') {
        renaming = item.id;
        render();
      } else if (choice === 'select') pickChat(item.id);
      else if (choice === 'favorite') star(item.id);
      else if (choice === 'archive') archiveChat(item.id);
      else if (choice === 'delete') remove({ type: 'delete', ids: many || [item.id] });
      else if (choice === 'new' || choice === 'reveal') post({ type: choice === 'new' ? 'newTerminal' : 'reveal', cwd: item.cwd });
      else if (choice) post({ type: choice, id: item.id });
    } else if (h) {
      const key = h.dataset.key, sel = picked.has(key), n = picked.size;
      const items = [];
      if (n > 1 && sel) {
        items.push({ id: 'bulkOn', title: `Archive the ${n} Selected Folders` }, { id: 'bulkOff', title: `Unarchive the ${n} Selected Folders` }, { separator: true });
      }
      items.push(
        { id: 'new', title: 'New Terminal in This Folder' },
        { id: 'fold', title: folded.has(key) ? 'Unfold' : 'Fold' },
        { id: 'reveal', title: 'Show Folder in Explorer' },
        { separator: true },
        { id: 'select', title: sel ? 'Deselect' : 'Select' },
        { id: 'archive', title: 'Archive Folder' },
      );
      if (h.dataset.pinned) items.push({ id: 'unpin', title: 'Remove from the List' });
      // Its chats, or those of every folder picked with it.
      const all = n > 1 && sel ? [...picked] : [key];
      items.push({ separator: true }, { id: 'delete', title: all.length > 1 ? `Delete the Chats in the ${all.length} Selected Folders…` : 'Delete the Chats in This Folder…' });
      // A linked worktree's folder: its pull request, merge and delete, as the Mac's worktree group menu (spec 4.3); the
      // unavailable ones dimmed, not hidden.
      const wt = data.folders[key] && data.folders[key].wt;
      if (wt && Array.isArray(wt.items) && wt.items.length) {
        items.push({ separator: true }, ...wt.items.map((x) => ({ id: `wt:${x.id}`, title: x.title, enabled: x.enabled !== false })));
      }
      const choice = await post({ type: 'menu', at, items });
      if (typeof choice === 'string' && choice.startsWith('wt:') && wt) post({ type: 'ship', id: choice.slice(3), top: wt.top });
      else if (choice === 'bulkOn') {
        const keys = [...picked];
        leave(keys.map(folderEl), () => archiveFolders(keys, true));
      } else if (choice === 'bulkOff') archiveFolders([...picked], false);
      else if (choice === 'delete') remove({ type: 'deleteFolders', keys: all });
      else if (choice === 'archive') archiveFolder(key);
      else if (choice === 'select') pick(key);
      else if (choice === 'new' || choice === 'reveal') post({ type: choice === 'new' ? 'newTerminal' : 'reveal', cwd: h.dataset.cwd });
      else if (choice === 'fold') fold(key);
      else if (choice === 'unpin') post({ type: 'unpin', cwd: h.dataset.cwd });
    }
  });

  // A folder from the system's picker: it heads the list (unfolded), with a terminal in it.
  $('openFolder').addEventListener('click', async () => {
    const d = await post({ type: 'openFolder' });
    if (!d) return;
    query = '';
    $('q').value = '';
    $('list').scrollTop = 0;
    render();
  });

  $('q').addEventListener('input', (e) => {
    query = e.target.value;
    render();
  });
  $('close').addEventListener('click', () => post({ type: 'close' }));
  // The bar over the list while chats or folders are picked: archive or delete them all at once.
  $('bulkArchive').addEventListener('click', () => {
    if (picked.size) {
      const keys = [...picked];
      return leave(keys.map(folderEl), () => archiveFolders(keys, true));
    }
    const ids = [...pickedChats];
    leave(ids.map(rowEl), () => {
      clearPicked();
      post({ type: 'archiveMany', ids });
    });
  });
  $('bulkDelete').addEventListener('click', () => remove(picked.size ? { type: 'deleteFolders', keys: [...picked] } : { type: 'delete', ids: [...pickedChats] }));
  $('bulkClear').addEventListener('click', clearPicked);

  // Its right edge: drag to make the list wider or narrower (the app keeps it between its narrowest and widest).
  const grip = $('grip');
  grip.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    grip.setPointerCapture(e.pointerId);
    const x0 = e.screenX, w0 = window.innerWidth;
    let w = w0, frame = 0;
    const move = (ev) => {
      w = w0 + ev.screenX - x0;
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        post({ type: 'width', w });
      });
    };
    const up = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', up);
      cancelAnimationFrame(frame);
      post({ type: 'width', w, done: true });
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  });

  window.__chats = {
    update(d) {
      data = d && Array.isArray(d.rows) ? d : data;
      if (d && 'active' in d) {
        activeId = d.active || null;
        activeAlt = d.activeAlt || null;
      }
      // A folder that left the list (archived) isn't picked any more, nor is a chat that did (archived, deleted).
      const keys = new Set(data.rows.map((r) => r.key));
      for (const k of picked) if (!keys.has(k)) picked.delete(k);
      const ids = new Set(data.rows.map((r) => r.id));
      for (const id of pickedChats) if (!ids.has(id)) pickedChats.delete(id);
      render();
    },
    // The focused window's session, and (`altId`) the conversation its AI is in when that's another id: the row with
    // either id gets the active bar (the Mac's MainWindowController and SidebarView).
    active(id, altId) {
      const next = id || null;
      const alt = altId && altId !== next ? altId : null;
      if (next === activeId && alt === activeAlt) return;
      activeId = next;
      activeAlt = alt;
      render();
    },
    // The keys the app has for the list (Settings › Shortcuts can change them): `chatsList`, as the top bar shows it
    // ("Ctrl+B"); '' when it has none, and the label goes.
    keys(k) {
      if (!k || typeof k.chatsList !== 'string') return;
      $('key').textContent = k.chatsList;
      $('key').hidden = !k.chatsList;
    },
    // Sliding open, it comes in from nothing; sliding shut, it fades out.
    fade(on) {
      const b = document.body;
      if (on) {
        b.style.transition = 'none';
        b.classList.add('hidden');
        void b.offsetWidth;
        b.style.transition = '';
      }
      b.classList.toggle('hidden', !on);
    },
  };
  // Viktoria (the roaming mascot, the Mac's mascotPlatform in Sidebar.swift): while she is on, the list reports the strips
  // she can walk on, in this page's px, at most 4 times a second: the top bar, FAVORITES, each folder's strip and the
  // scrolling list itself (what scrolled out of it isn't there to stand on). The app turns them into where she stands.
  // `window.__mascotEnabled` is set by the app (and a 'mascotchange' event comes with a change).
  let mascotKey = '', mascotAt = 0, mascotTimer = 0;
  function mascotSend() {
    mascotTimer = 0;
    if (window.__mascotEnabled !== true) return;
    mascotAt = performance.now();
    const rects = [];
    const add = (id, el) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      rects.push({ id, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
    };
    add('side:top', $('top'));
    add('__scroll__', $('list'));
    add('side:favorites', $('list').querySelector('.sec'));
    for (const h of $('list').querySelectorAll('.head[data-key]')) add(`side:${h.dataset.key}`, h);
    const key = JSON.stringify(rects);
    if (key === mascotKey) return;
    mascotKey = key;
    post({ type: 'mascotRects', rects });
  }
  function mascotSchedule(force) {
    if (window.__mascotEnabled !== true) return;
    if (force) mascotKey = '';
    const wait = Math.max(0, 250 - (performance.now() - mascotAt));
    if (!wait) {
      if (mascotTimer) clearTimeout(mascotTimer);
      mascotSend();
    } else if (!mascotTimer) {
      mascotTimer = setTimeout(mascotSend, wait);
    }
  }
  new MutationObserver(() => mascotSchedule()).observe($('list'), { childList: true, subtree: true });
  new ResizeObserver(() => mascotSchedule()).observe(document.body);
  $('list').addEventListener('scroll', () => mascotSchedule(), { passive: true });
  addEventListener('resize', () => mascotSchedule());
  addEventListener('mascotchange', () => mascotSchedule(true));
  // She walked to a folder's strip and tapped it: it folds shut or open, as a click on it does. Only a folder that is shown.
  window.__mascotFold = (key) => {
    if (typeof key !== 'string') return;
    for (const h of $('list').querySelectorAll('.head[data-key]')) {
      if (h.dataset.key === key) return fold(key);
    }
  };

  // "5m", "2h": the times move on.
  setInterval(render, 30_000);
  render();
  post({ type: 'ready' });
})();
