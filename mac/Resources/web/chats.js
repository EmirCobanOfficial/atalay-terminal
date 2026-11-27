'use strict';
// The chats list: one of the dashboard's panels (#chats, in its left column), on the Mac and on Windows alike. The live
// chats are the dashboard's own session cards (app.js renderSessions fills #sessions, which sits at the top of this
// panel); under them the saved chats by folder, the starred ones first. A chat is shown once: a live chat has its card
// and no row, and when it ends its row grows into its folder. The app sends the list (the Mac's SidebarModel.snapshot,
// the Windows app's chatlist.js) through window.__chats.update(snapshot) and does what's asked of it
// (window.webkit.messageHandlers.chats.postMessage(msg), a promise where the app replies). The search, the folders
// opened past their first five chats, the folded ones (kept in this page's storage) and the chats or folders picked
// (⌘/Ctrl-click, Shift-click for every chat up to it) for archiving or deleting several at once are this page's.
(() => {
  // The Mac app sets no platform; the Windows one does (preload.js).
  const mac = (window.__platform || 'darwin') === 'darwin';
  if (mac) document.documentElement.classList.add('on-mac');
  // A request the app refuses (or a page without the app) answers null, never an error left unhandled.
  const post = (msg) => {
    try {
      return Promise.resolve(window.webkit.messageHandlers.chats.postMessage(msg)).catch(() => null);
    } catch {
      return Promise.resolve(null);
    }
  };
  const $ = (id) => document.getElementById(id);
  const root = $('chats');
  if (!root) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FILE_MANAGER = mac ? 'Finder' : 'Explorer';

  // ---------- icons ----------
  const ic = (vb, body, cls = 'ic') => `<svg class="${cls}" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
  const I = {
    hx: (st) => `<svg class="sl-hx s-${st}" viewBox="0 0 10 11" aria-hidden="true"><path d="M5 .7 9.3 3.2v4.6L5 10.3.7 7.8V3.2z"/></svg>`,
    chev: ic('0 0 10 10', '<path d="M3.5 1.8 6.7 5 3.5 8.2"/>', 'ic chev'),
    branch: ic('0 0 12 12', '<circle cx="3" cy="2.5" r="1.3"/><circle cx="3" cy="9.5" r="1.3"/><circle cx="9" cy="4" r="1.3"/><path d="M3 3.8v4.4M9 5.3c0 2-6 1.4-6 2.9"/>'),
    plus: ic('0 0 12 12', '<path d="M6 2v8M2 6h8"/>'),
    find: ic('0 0 12 12', '<circle cx="5.2" cy="5.2" r="3.5"/><path d="m7.8 7.8 2.8 2.8"/>'),
    folderPlus: ic('0 0 14 12', '<path d="M1 2.4h4l1.3 1.4H13v6.8H1z"/><path d="M9.6 5.7v3.2M8 7.3h3.2"/>'),
    star: ic('0 0 12 12', '<path d="M6 .9 7.6 4.2l3.6.4-2.7 2.5.8 3.6L6 8.9 2.7 10.7l.8-3.6L.8 4.6l3.6-.4z"/>'),
    starOn: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .9 7.6 4.2l3.6.4-2.7 2.5.8 3.6L6 8.9 2.7 10.7l.8-3.6L.8 4.6l3.6-.4z"/></svg>',
    starFill: '<svg class="ic" viewBox="0 0 12 12" style="fill:currentColor;stroke:none" aria-hidden="true"><path d="M6 .9 7.6 4.2l3.6.4-2.7 2.5.8 3.6L6 8.9 2.7 10.7l.8-3.6L.8 4.6l3.6-.4z"/></svg>',
    archive: ic('0 0 12 12', '<rect x="1" y="1.8" width="10" height="2.6" rx=".5"/><path d="M2 4.4v5.8h8V4.4M4.6 6.6h2.8"/>'),
    term: ic('0 0 12 10', '<rect x=".7" y=".7" width="10.6" height="8.6" rx="1.4"/><path d="m3 3.4 1.7 1.6L3 6.6M6 6.6h3"/>'),
    x: ic('0 0 12 12', '<path d="M3 3l6 6M9 3 3 9"/>'),
    pin: ic('0 0 16 16', '<path d="M9.8 1.8 14.2 6.2l-2 .4-2.6 2.6.3 3.1-1.3 1.3L5.9 10.9 2.6 14.2M5.9 10.9 2.8 7.8l1.3-1.3 3.1.3 2.6-2.6z"/>', 'pin'),
    tick: '<svg class="sl-tick" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.4"/><path d="M5.1 8.3l2 2 3.8-4.3"/></svg>',
    hex: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 1.5 29 9v14l-13 7.5L3 23V9z"/></svg>',
  };
  $('chats-find').innerHTML = I.find;
  $('chats-open').innerHTML = I.folderPlus;
  $('chats-find-i').innerHTML = I.find;
  $('chats-x').innerHTML = I.x;
  $('chats-clear').innerHTML = I.x;
  const kbdF = mac ? '⌘F' : 'Ctrl+F';
  $('chats-kbd').textContent = kbdF;
  $('chats-find').title = `Search chats (${kbdF})`;

  // ---------- state ----------
  let data = null; // the app's snapshot, until the first one comes
  let cards = []; // the dashboard's session cards: { id, conv, st, name, ask }
  let cardKey = '';
  let activeId = null;
  let activeAlt = null;
  let query = '';
  const expanded = new Set();
  let keyKey = null;
  let savedCount = 0;
  let foldSynced = false; // the app's first fold() is its kept state at load
  const foldKey = () => (keyKey == null ? (mac ? '⌘B' : 'Ctrl+B') : keyKey);
  // The bar and the tag say what a press does now (open: Hide, folded: Show N).
  function labelFold() {
    const shut = document.documentElement.classList.contains('chats-closed');
    const n = savedCount, k = foldKey(), fb = $('chats-fold'), tag = $('chats-tag');
    fb.setAttribute('aria-expanded', String(!shut));
    fb.setAttribute('aria-label', shut ? `Show ${n} saved chat${n === 1 ? '' : 's'}` : 'Hide saved chats');
    fb.title = `${shut ? 'Show' : 'Hide'} saved chats${k ? ` (${k})` : ''}`;
    tag.setAttribute('aria-expanded', String(!shut));
    tag.title = fb.title;
  }
  const FKEY = 'chats.folded';
  const folded = (() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(FKEY) || '[]'));
    } catch {
      return new Set();
    }
  })();
  const keepFolded = () => {
    try {
      localStorage.setItem(FKEY, JSON.stringify([...folded]));
    } catch {}
  };
  let seeded = (() => {
    try {
      return localStorage.getItem(FKEY) != null;
    } catch {
      return true;
    }
  })();
  const picked = new Set(); // folders picked
  const pickedChats = new Set();
  let lastPicked = null;
  let renaming = null; // a saved row's id, or `card:<session id>`
  let draft = '';
  let arrive = null, unfolding = null, foldTimer = 0;
  let reveal = null; // a new favourite's row, scrolled into view (for a second: a drawing meanwhile stops a smooth scroll)

  const isActive = (r) => (!!activeId && (r.id === activeId || r.sid === activeId)) || (!!activeAlt && r.id === activeAlt);
  // Ids that have a card on the dashboard: those chats are not listed again.
  const cardIds = () => {
    const s = new Set();
    for (const c of cards) {
      s.add(c.id);
      if (c.conv) s.add(c.conv);
    }
    return s;
  };

  function age(ms) {
    if (ms == null) return 'now';
    const s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 60) return 'now';
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86_400) return `${Math.floor(s / 3600)}h`;
    if (s < 86_400 * 7) return `${Math.floor(s / 86_400)}d`;
    if (s < 86_400 * 30) return `${Math.floor(s / (86_400 * 7))}w`;
    return `${Math.floor(s / (86_400 * 30))}mo`;
  }
  const AGE_WORDS = (m) => {
    const a = age(m);
    return a === 'now' ? 'just now' : a.endsWith('m') && !a.endsWith('mo') ? `${a.slice(0, -1)} minutes ago` : a.endsWith('h') ? `${a.slice(0, -1)} hours ago` : a.endsWith('d') ? `${a.slice(0, -1)} days ago` : a.endsWith('w') ? `${a.slice(0, -1)} weeks ago` : `${a.slice(0, -2)} months ago`;
  };
  const STW = { busy: 'working', idle: 'your turn', waiting: 'needs you' };
  const aiName = (t) => (t === 'antigravity' ? 'agy' : t === 'claude' || !t ? '' : t);
  const aiFull = (t) => (t === 'antigravity' ? 'Antigravity' : t === 'codex' ? 'Codex' : t === 'cursor' ? 'Cursor' : 'Claude Code');
  const lastPart = (s) => String(s || '').split(/[\\/]/).filter(Boolean).pop() || String(s || '');

  // ---------- the list's groups ----------
  // The folders: { key, cwd, items, terms, pinned, kids: worktree groups }. A linked worktree's folder sits in its main
  // folder's group when that is in the list.
  function build(rows, terms) {
    const folders = (data && data.folders) || {};
    const groups = [];
    const byKey = new Map();
    const group = (key, cwd) => {
      let g = byKey.get(key);
      if (!g) {
        byKey.set(key, (g = { key, cwd: (folders[key] && folders[key].cwd) || cwd, items: [], terms: [], pinned: false, kids: [] }));
        groups.push(g);
      }
      return g;
    };
    for (const k of data.order || []) group(k, '');
    for (const k of data.pinned || []) group(k, '').pinned = true;
    const hide = cardIds();
    let hiddenLive = 0;
    for (const r of rows) {
      if (r.fav) continue;
      const g = group(r.key, r.cwd);
      if (hide.has(r.id) || (r.sid && hide.has(r.sid))) {
        g.total = (g.total || 0) + 1;
        hiddenLive++;
        continue;
      }
      g.items.push(r);
    }
    for (const t of terms) group(t.key, t.cwd).terms.push(t);
    for (const g of groups) g.total = (g.total || 0) + g.items.length;
    const top = [];
    for (const g of groups) {
      const wt = folders[g.key] && folders[g.key].wt;
      const parent = wt && wt.main && wt.main !== g.key ? byKey.get(wt.main) : null;
      // One opened from the list (pinned) stays a folder of its own: its pin and its "Remove from the List" are there.
      if (parent && !g.pinned && !(folders[parent.key] && folders[parent.key].wt)) parent.kids.push(g);
      else top.push(g);
    }
    return { top, groups };
  }

  // ---------- drawing ----------
  function rowHTML(r, o = {}) {
    const st = r.status && STW[r.status] ? r.status : 'ended';
    const on = isActive(r);
    const sel = pickedChats.has(r.id);
    const lands = !!arrive && r.id === arrive.id && r.fav === arrive.fav;
    const cls = ['sl-row', r.status && 'is-live', r.open && !on && 'is-win', on && 'is-front', sel && 'sel', lands && 'arrive'].filter(Boolean).join(' ');
    const ai = aiName(r.tool);
    const title = r.title || r.lastPrompt || '';
    const label = [title, aiFull(r.tool), r.status && STW[r.status], AGE_WORDS(r.mtime)].filter(Boolean).join(', ');
    return `<div class="${cls}" tabindex="0" role="button" data-id="${esc(r.id)}" data-m="${Number.isFinite(r.mtime) ? r.mtime : ''}" title="${esc(r.lastPrompt || title)}" aria-label="${esc(label)}">` +
      (sel ? I.tick : I.hx(st)) +
      (r.id === renaming ? `<input class="sl-ren" value="${esc(draft)}" spellcheck="false" maxlength="120" aria-label="Chat name">` : `<span class="t">${esc(title)}</span>`) +
      (ai ? `<span class="sl-ai">${esc(ai)}</span>` : '') +
      (r.status && STW[r.status] ? `<span class="sl-st s-${st}">${STW[r.status]}</span>` : '') +
      (r.fav ? `<span class="star">${I.starFill}</span>` : `<span class="age">${age(r.mtime)}</span>`) +
      `<span class="hov"><button type="button" class="${r.fav ? 'on' : ''}" data-act="star" title="${r.fav ? 'Remove from favorites' : 'Add to favorites: it stays at the top'}" aria-label="${r.fav ? 'Remove from favorites' : 'Add to favorites'}">${r.fav ? I.starFill : I.star}</button>` +
      `<button type="button" data-act="archive" title="Archive: out of the list (Settings lists it)" aria-label="Archive">${I.archive}</button></span></div>`;
  }

  function termHTML(t) {
    return `<div class="sl-row term${t.shown ? ' is-win' : ''}" tabindex="0" role="button" data-term="${esc(t.id)}" title="${esc(t.tip || `${t.title} · ${t.cwd}`)}" aria-label="${esc(`terminal, ${t.job || 'idle'}`)}">` +
      `${I.term}<span class="t">${esc(t.job || t.title || 'terminal')}</span><span class="age">terminal</span></div>`;
  }

  function wtState(text) {
    const m = /^\+(\d+) [−-](\d+)$/.exec(text || '');
    return m ? `<span class="a">+${m[1]}</span> <span class="r">−${m[2]}</span>` : esc(text || '');
  }

  // `terms`: the app's terminals in it (its worktrees' too), counted on the strip so a folded folder still says so. A linked
  // worktree listed on its own (Windows, when its main folder isn't in the list) has the branch mark and its state on it.
  function foldHTML(g, f, name, n, shut, terms) {
    const sel = picked.has(g.key);
    const tip = sel ? 'Selected · click again to leave it out' : `${f.path || g.cwd} · click to fold ${shut ? 'open' : 'shut'} · ${mac ? '⌘' : 'Ctrl+'}click to select, for archiving or deleting several at once`;
    const wst = f.wt ? f.wt.state || {} : null;
    const gone = !!(wst && wst.deleted);
    return `<div class="sl-fold${shut ? ' shut' : ''}${sel ? ' sel' : ''}${gone ? ' gone' : ''}" tabindex="0" role="button" aria-expanded="${!shut}" data-key="${esc(g.key)}" data-cwd="${esc(g.cwd)}" data-pinned="${g.pinned ? 1 : ''}" title="${esc(tip)}">` +
      `${I.chev}${g.pinned ? I.pin.replace('class="pin"', 'class="pin" aria-label="Opened from the list"') : f.wt ? I.branch : ''}<span class="nm"><bdi>${esc(name)}</bdi></span><span class="n">${n}</span>` +
      (terms ? `<span class="tn" title="${terms} terminal${terms > 1 ? 's' : ''} in the app">${I.term}${terms}</span>` : '') +
      '<span class="sp"></span>' +
      (wst && wst.text ? `<span class="wts">${wtState(wst.text)}</span>` : '') +
      '<span class="acts">' +
      `<button type="button" class="farc" data-act="archive" title="Archive the folder: all its chats out of the list" aria-label="Archive the folder">${I.archive}</button>` +
      (f.repo && !gone ? `<button type="button" data-act="wt" title="New worktree from this repo: a separate folder on a branch of its own" aria-label="New worktree">${I.branch}</button>` : '') +
      (gone ? '' : `<button type="button" data-act="new" title="New terminal in this folder" aria-label="New terminal in this folder">${I.plus}</button>`) + '</span></div>';
  }

  function wtHTML(w, q, all) {
    const f = (data.folders || {})[w.key] || {};
    const wt = f.wt || {};
    const shown = all || q ? w.items : w.items.slice(0, 3);
    // Its chats all live (their cards are on top): its line stays, with its state, its + and its menu.
    if (!shown.length && !w.terms.length && (q || !w.total)) return '';
    const gone = !!(wt.state && wt.state.deleted);
    const branch = wt.branch || f.label || lastPart(w.cwd);
    return `<div class="sl-wt${gone ? ' gone' : ''}" data-key="${esc(w.key)}" data-cwd="${esc(w.cwd)}"><div class="sl-wth" data-key="${esc(w.key)}" data-cwd="${esc(w.cwd)}" title="${esc(`${f.path || w.cwd} · branch ${branch}`)}">` +
      `${I.branch}<span class="k">worktree</span><b>${esc(branch)}</b><span class="n">${w.total || ''}</span><span class="d">${wtState(wt.state && wt.state.text)}</span>` +
      (gone ? '' : `<button type="button" class="plus" data-act="new" title="New terminal in this worktree" aria-label="New terminal in this worktree">${I.plus}</button>`) +
      `</div>${w.terms.map(termHTML).join('')}${shown.map((r) => rowHTML(r)).join('')}</div>`;
  }

  function section(title, n, extra = '', cls = '') {
    return `<div class="sl-sec${cls ? ' ' + cls : ''}">${cls === 'fav' ? I.starOn : ''}<span>${title}</span><span class="n">${n}</span>${extra}</div>`;
  }

  // The list's drawing as it was last put in the page: the same one isn't put in again (a drawing replaces the rows, and
  // with them the pointer's press and the keyboard's place). What's changed on the rows themselves (leave, fold) clears it.
  let drawn = '';
  const focusKey = (el) => {
    const x = el && el.closest && el.closest('.sl-row, .sl-fold, .sl-more');
    if (!x) return null;
    if (x.dataset.term) return `t:${x.dataset.term}`;
    if (x.dataset.id) return `r:${x.dataset.id}`;
    return `${x.classList.contains('sl-more') ? 'm' : 'f'}:${x.dataset.key}`;
  };

  function render() {
    const body = $('chats-saved');
    if (!data) {
      drawn = '';
      body.innerHTML = '<div class="sl-skel"></div><div class="sl-skel"></div><div class="sl-skel"></div>';
      return syncCards();
    }
    // A name being typed in a row: the list waits (a drawing would make a new field, its text all selected under the
    // fingers); it's drawn as soon as the name is kept or left.
    if (renaming && !String(renaming).startsWith('card:') && body.querySelector('.sl-ren')) return syncCards();
    const q = query.trim().toLowerCase();
    // A renamed chat by its own name or the title its AI gave it (`origTitle`).
    const match = (r) => `${r.title} ${r.origTitle || ''} ${r.lastPrompt} ${r.cwd}`.toLowerCase().includes(q);
    const rows = q ? data.rows.filter(match) : data.rows;
    const terms = (data.terms || []).filter((t) => !q || `${t.title} ${t.job} ${t.cwd}`.toLowerCase().includes(q));
    const hide = cardIds();
    const isHidden = (r) => hide.has(r.id) || (r.sid && hide.has(r.sid));
    // A starred chat is listed here live or not (its card on the dashboard too); `build` keeps it out of its folder.
    const favs = rows.filter((r) => r.fav);
    const { top, groups } = build(rows, terms);
    const folders = data.folders || {};
    // The folder's name: its last path part; two folders with the same one fall back to the app's distinct label.
    const names = new Map();
    for (const g of top) {
      const f = folders[g.key] || { label: g.cwd };
      names.set(g, lastPart(f.label));
    }
    const dup = new Map();
    for (const nm of names.values()) dup.set(nm, (dup.get(nm) || 0) + 1);
    let html = favs.length ? section('Favorites', favs.length, '', 'fav') + favs.map((r) => rowHTML(r)).join('') : '';
    let shownFolders = 0;
    const kidTotal = (g) => g.kids.reduce((k, w) => k + w.total, 0);
    for (const g of top) {
      if (q && !g.items.length && !g.terms.length && !g.kids.some((w) => w.items.length || w.terms.length)) continue;
      const f = folders[g.key] || { label: g.cwd, path: g.cwd };
      const name = dup.get(names.get(g)) > 1 ? f.label : names.get(g);
      const shut = folded.has(g.key) && !q;
      const all = expanded.has(g.key) || q !== '';
      const first = all ? g.items : g.items.slice(0, 5);
      const hidden = (g.items.length - first.length) + g.kids.reduce((k, w) => k + (all ? 0 : Math.max(0, w.items.length - 3)), 0);
      let rowsHTML = '';
      if (!shut) {
        rowsHTML += g.terms.map(termHTML).join('') + first.map((r) => rowHTML(r)).join('');
        const wts = g.kids.map((w) => wtHTML(w, q, all)).join('');
        rowsHTML += wts;
        if (hidden > 0) rowsHTML += `<button type="button" class="sl-more" data-key="${esc(g.key)}">${hidden} more</button>`;
        if (!g.items.length && !g.terms.length && !wts && !g.total && !kidTotal(g)) {
          rowsHTML += '<div class="sl-empty">nothing here yet · <button type="button" data-act="new">open a terminal</button></div>';
        }
      }
      const opening = !shut && g.key === unfolding ? ' unfolding' : '';
      html += `<section class="sl-grp${shut ? ' shut' : ''}${opening}" role="group" data-key="${esc(g.key)}" data-cwd="${esc(g.cwd)}">` +
        foldHTML(g, f, name, g.total + kidTotal(g), shut, g.terms.length + g.kids.reduce((k, w) => k + w.terms.length, 0)) + `<div class="sl-rows">${rowsHTML}</div></section>`;
      shownFolders++;
    }
    const savedN = data.rows.filter((r) => !isHidden(r)).length;
    if (!html) {
      if (q) html = `<div class="sl-none">Nothing matches “${esc(query.trim())}”</div>`;
      else if (!shownFolders && !favs.length) {
        html = `<div class="sl-blank"><div class="orb">${I.hex}<i></i></div><h3>No chats yet</h3><p>Open a folder to start: a terminal opens in it.</p><button type="button" data-act="open">Open folder…</button></div>`;
      }
    }
    if (html !== drawn) {
      // The scroll stays where it was, and the keyboard on the row (or folder) it was on.
      const had = body.contains(document.activeElement) ? focusKey(document.activeElement) : null;
      const keep = $('chats-body').scrollTop;
      body.innerHTML = html;
      drawn = html;
      $('chats-body').scrollTop = keep;
      // That stopped the scroll to a new favourite halfway: it's there at once.
      if (reveal) revealRow('auto');
      if (had) {
        const back = [...body.querySelectorAll('.sl-row, .sl-fold, .sl-more')].find((el) => focusKey(el) === had);
        if (back) back.focus({ preventScroll: true });
      }
      // Viktoria's strips moved (app.js reports the page's surfaces to her).
      dispatchEvent(new Event('chatsdraw'));
    }
    unfolding = null;
    if (arrive && (body.querySelector('.sl-row.arrive') || performance.now() > arrive.until)) arrive = null;
    savedCount = savedN;
    const fb = $('chats-fold');
    // Nothing in the list: no bar (the blank state shows). Folders with only terminals keep it: a fold has a way back.
    fb.hidden = !savedN && !shownFolders && !favs.length;
    fb.querySelector('.fb-open .n').textContent = savedN;
    fb.querySelector('.fb-shut b').textContent = `Show ${savedN} saved chat${savedN === 1 ? '' : 's'}`;
    for (const kb of fb.querySelectorAll('kbd')) kb.textContent = foldKey();
    fb.classList.toggle('nokey', !foldKey());
    labelFold();
    const ren = renaming && !String(renaming).startsWith('card:') && body.querySelector('.sl-ren');
    if (ren) wireRename(ren, renaming);
    const n = picked.size || pickedChats.size;
    $('chats-bulk').hidden = !n;
    $('chats-picked').textContent = `${n} selected`;
    syncCards(savedN);
  }

  // ↩ keeps the name, Esc (or a click elsewhere) leaves it; either way the field goes (a card's too: the list's drawings
  // don't touch the cards) and the row shows the name at once, before the app's list comes back with it.
  function wireRename(ren, id) {
    ren.focus();
    ren.select();
    ren.addEventListener('input', () => (draft = ren.value));
    const done = (keep) => {
      if (!renaming) return;
      renaming = null;
      const chat = String(id).replace(/^card:/, '');
      if (keep) {
        post({ type: 'rename', id: chat, name: ren.value });
        const name = ren.value.trim();
        const r = name && data && data.rows.find((x) => x.id === chat);
        if (r) r.title = name.slice(0, 120);
      }
      if (ren.isConnected) ren.remove();
      render();
    };
    ren.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        done(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        done(false);
      }
    });
    ren.addEventListener('blur', () => done(false));
  }

  // The live cards: counts, the front one, the search, the keyboard's marks. Cheap: runs after every card update.
  function syncCards(savedN) {
    const box = $('sessions');
    const q = query.trim().toLowerCase();
    let shown = 0;
    for (const el of box.children) {
      const key = el.dataset.key;
      const c = cards.find((x) => x.id === key);
      const front = !!c && ((!!activeId && (c.id === activeId || c.conv === activeId)) || (!!activeAlt && (c.id === activeAlt || c.conv === activeAlt)));
      el.classList.toggle('front', front);
      const miss = !!q && !el.textContent.toLowerCase().includes(q);
      el.hidden = miss;
      if (!miss) shown++;
      if (el.dataset.sl !== '1') {
        el.dataset.sl = '1';
        el.tabIndex = 0;
        el.setAttribute('role', 'button');
      }
      const fav = !!c && cardFav(c);
      if (c) el.setAttribute('aria-label', `${c.title || c.name}, ${aiFull(c.tool)}, ${STW[c.st] || 'ended'}${fav ? ', favorite' : ''}`);
      // A starred chat's card carries the amber star by its name (a glyph, not the colour alone).
      const nm = el.querySelector('.ch .nm');
      let cf = el.querySelector('.cfav');
      if (fav && nm && !cf) {
        cf = document.createElement('span');
        cf.className = 'cfav';
        cf.setAttribute('role', 'img');
        cf.setAttribute('aria-label', 'Favorite');
        cf.title = 'Favorite';
        cf.innerHTML = I.starFill;
        nm.after(cf);
      } else if (!fav && cf) cf.remove();
    }
    const live = cards.filter((c) => c.st !== 'ended').length;
    const need = cards.filter((c) => c.st === 'waiting').length;
    box.setAttribute('role', 'list');
    box.setAttribute('aria-label', 'On the map');
    const head = $('chats-live-h');
    // This runs at every state the dashboard gets: the heading is written only when it says something else.
    const said = live || cards.length
      ? `<span>On the map</span><span class="n">${live}</span>${need ? `<span class="warn">${need} needs you</span>` : ''}`
      : '<span>On the map · nothing live</span>';
    if (head.__said !== said) {
      head.__said = said;
      head.innerHTML = said;
    }
    head.hidden = !!q && !shown;
    if (savedN == null) {
      const hide = cardIds();
      savedN = data ? data.rows.filter((r) => !hide.has(r.id) && !(r.sid && hide.has(r.sid))).length : 0;
    }
    const meta = `${live} live · ${savedN} saved`;
    if ($('m-chats').textContent !== meta) $('m-chats').textContent = meta;
  }

  // ---------- picking, folding, leaving ----------
  const pick = (key) => {
    pickedChats.clear();
    lastPicked = null;
    if (!picked.delete(key)) picked.add(key);
    render();
  };
  const pickChat = (id) => {
    picked.clear();
    if (!pickedChats.delete(id)) pickedChats.add(id);
    lastPicked = id;
    render();
  };
  const pickUpTo = (id) => {
    const shown = [...$('chats-saved').querySelectorAll('.sl-row[data-id]')].map((el) => el.dataset.id);
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
  const star = (id) => {
    const r = data && data.rows.find((x) => x.id === id);
    arrive = r && !calm() ? { id, fav: !r.fav, until: performance.now() + 1500 } : null;
    post({ type: 'favorite', id });
  };
  // Archived: the rows or the folders shrink away (0.25 s), then the app takes them out of the list.
  const leave = (els, then) => {
    const shown = els.filter(Boolean);
    if (!shown.length || calm()) return then();
    // The rows are changed in the page itself: the next drawing puts them back as the list has them.
    drawn = '';
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      then();
    };
    const heights = shown.map((el) => el.offsetHeight);
    shown.forEach((el, i) => {
      el.style.setProperty('--h', `${heights[i]}px`);
      el.classList.remove('arrive');
      if (el.parentElement) el.parentElement.classList.remove('unfolding');
      el.classList.add('sl-leaving');
    });
    shown[0].addEventListener('animationend', (e) => e.target === shown[0] && go());
    setTimeout(go, 300);
  };
  const saved = () => $('chats-saved');
  const rowEl = (id) => [...saved().querySelectorAll('.sl-row[data-id]')].find((el) => el.dataset.id === id);
  const folderEl = (key) => [...saved().querySelectorAll('.sl-grp[data-key]')].find((el) => el.dataset.key === key);
  function revealRow(behavior) {
    if (!reveal || performance.now() > reveal.until) return void (reveal = null);
    const el = !query && rowEl(reveal.id);
    if (el) el.scrollIntoView({ block: 'nearest', behavior });
  }
  const archiveChat = (id) => leave([rowEl(id)], () => post({ type: 'archive', id }));
  const archiveFolder = (key) => leave([folderEl(key)], () => post({ type: 'folders', keys: [key], on: true }));

  function fold(key) {
    const shutting = !folded.has(key);
    if (shutting) folded.add(key);
    else folded.delete(key);
    keepFolded();
    clearTimeout(foldTimer);
    const el = !query && !calm() ? folderEl(key) : null;
    if (shutting && el) {
      drawn = '';
      el.classList.remove('unfolding');
      el.classList.add('folding');
      foldTimer = setTimeout(render, 200);
      return;
    }
    if (!shutting && el) unfolding = key;
    render();
  }

  // ---------- clicks ----------
  const cardOf = (el) => el.closest('#sessions .card');
  saved().addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (button && button.classList.contains('sl-more')) {
      expanded.add(button.dataset.key);
      return render();
    }
    if (button && button.dataset.act === 'open') return openFolder();
    const tr = e.target.closest('.sl-row.term');
    if (tr) return post({ type: 'showTerminal', id: tr.dataset.term });
    const empty = e.target.closest('.sl-empty');
    if (empty && button) return post({ type: 'newTerminal', cwd: empty.closest('.sl-grp').dataset.cwd });
    const wth = e.target.closest('.sl-wth');
    if (wth) return button && button.dataset.act === 'new' ? post({ type: 'newTerminal', cwd: wth.dataset.cwd }) : undefined;
    const r = e.target.closest('.sl-row');
    if (r && e.target.classList.contains('sl-ren')) return;
    if (r) {
      const act = button && button.dataset.act;
      if (act === 'star') return star(r.dataset.id);
      if (act === 'archive') return archiveChat(r.dataset.id);
      // Shift+click picks all up to it, ⌘/Ctrl+click picks it; while some are picked a click picks too, so one that
      // misses its key doesn't open a chat (and start its AI). Else a click opens it.
      if (e.shiftKey) return pickUpTo(r.dataset.id);
      if (e.ctrlKey || e.metaKey || pickedChats.size) return pickChat(r.dataset.id);
      return post({ type: 'open', id: r.dataset.id });
    }
    const h = e.target.closest('.sl-fold');
    if (!h) return;
    const act = button && button.dataset.act;
    if (act === 'new') return post({ type: 'newTerminal', cwd: h.dataset.cwd });
    if (act === 'wt') return post({ type: 'newWorktree', cwd: h.dataset.cwd });
    if (act === 'archive') return archiveFolder(h.dataset.key);
    if (e.ctrlKey || e.metaKey || e.shiftKey) return pick(h.dataset.key);
    fold(h.dataset.key);
  });

  // ---------- menus: native ones, from the app ----------
  const folderOf = (key) => ((data && data.folders) || {})[key] || {};
  function chatMenuItems(item, many, sel, card) {
    const f = folderOf(item.key);
    const items = [
      { id: 'rename', title: 'Rename…' },
      { id: 'favorite', title: item.fav ? 'Remove from Favorites' : 'Add to Favorites' },
      { id: 'archive', title: 'Archive' },
      ...(card ? [] : [{ id: 'select', title: sel ? 'Deselect' : 'Select' }]),
      { separator: true },
      { id: 'open', title: 'Open in a Window' },
      ...(item.tool !== 'claude' ? [] : [{ id: 'fork', title: 'Open a Copy (fork)' }]),
      { id: 'new', title: 'New Terminal in This Folder' },
      ...('repo' in f ? [{ id: 'worktree', title: 'New Worktree…', enabled: !!f.repo }] : []),
      { separator: true },
      { id: 'reveal', title: `Show Folder in ${FILE_MANAGER}` },
      { id: 'copyId', title: 'Copy Session ID' },
      { separator: true },
      { id: 'delete', title: many ? `Delete the ${many.length} Selected Chats…` : 'Delete…' },
    ];
    // A worktree's own: its pull request, merge and delete.
    if (card && f.wt && Array.isArray(f.wt.items) && f.wt.items.length) {
      items.push({ separator: true }, ...f.wt.items.map((x) => ({ id: `wt:${x.id}`, title: x.title, enabled: x.enabled !== false })));
    }
    return items;
  }
  async function chatMenu(item, at, card, el) {
    const sel = pickedChats.has(item.id);
    const many = sel && pickedChats.size > 1 ? [...pickedChats] : null;
    const choice = await post({ type: 'menu', at, items: chatMenuItems(item, many, sel, card) });
    if (choice === 'rename') {
      if (card) return renameCard(el, item);
      renaming = item.id;
      draft = item.title || item.lastPrompt || '';
      render();
    } else if (choice === 'select') pickChat(item.id);
    else if (choice === 'favorite') star(item.id);
    else if (choice === 'archive') card ? post({ type: 'archive', id: item.id }) : archiveChat(item.id);
    else if (choice === 'delete') remove({ type: 'delete', ids: many || [item.id] });
    else if (choice === 'worktree') post({ type: 'newWorktree', cwd: item.cwd });
    else if (choice === 'new' || choice === 'reveal') post({ type: choice === 'new' ? 'newTerminal' : 'reveal', cwd: item.cwd });
    else if (typeof choice === 'string' && choice.startsWith('wt:')) {
      const wt = folderOf(item.key).wt;
      if (wt) post({ type: 'ship', id: choice.slice(3), top: wt.top });
    } else if (choice) post({ type: choice, id: item.id });
  }
  // The starred chats of a snapshot by both their ids (the row's, its live session's), read once per snapshot: the cards
  // ask at every state the dashboard gets.
  let favOf = null, favSet = new Set();
  const favIds = () => {
    if (favOf !== data) {
      favOf = data;
      favSet = new Set();
      for (const r of (data && data.rows) || []) {
        if (!r.fav) continue;
        favSet.add(r.id);
        if (r.sid) favSet.add(r.sid);
      }
    }
    return favSet;
  };
  // Whether the chat of a card is a favourite: its row in the snapshot says so (by the session id or the conversation's).
  const cardFav = (c) => {
    const f = favIds();
    return f.has(c.id) || (!!c.conv && f.has(c.conv));
  };
  // The live chat of a card: its row in the snapshot (it has one once saved), else what the card itself knows.
  function rowOfCard(el) {
    const c = cards.find((x) => x.id === el.dataset.key);
    if (!c || !data) return null;
    return data.rows.find((r) => r.id === c.id || r.sid === c.id || (c.conv && r.id === c.conv)) || null;
  }
  function renameCard(el, item) {
    el.querySelector('.sl-ren')?.remove();
    const ren = document.createElement('input');
    ren.className = 'sl-ren';
    ren.value = item.title || item.lastPrompt || '';
    ren.maxLength = 120;
    ren.spellcheck = false;
    ren.setAttribute('aria-label', 'Chat name');
    el.appendChild(ren);
    renaming = `card:${item.id}`;
    draft = ren.value;
    wireRename(ren, item.id);
    ren.addEventListener('click', (e) => e.stopPropagation());
  }

  async function termMenu(t, at) {
    const f = folderOf(t.key);
    const choice = await post({
      type: 'menu', at, items: [
        { id: 'show', title: 'Show Terminal' },
        { id: 'new', title: 'New Terminal in This Folder' },
        ...('repo' in f ? [{ id: 'worktree', title: 'New Worktree…', enabled: !!f.repo }] : []),
        { id: 'reveal', title: `Show Folder in ${FILE_MANAGER}` },
        { separator: true },
        { id: 'end', title: 'End Terminal' },
      ],
    });
    if (choice === 'show') post({ type: 'showTerminal', id: t.id });
    else if (choice === 'end') post({ type: 'endTerminal', id: t.id });
    else if (choice === 'worktree') post({ type: 'newWorktree', cwd: t.cwd });
    else if (choice === 'new' || choice === 'reveal') post({ type: choice === 'new' ? 'newTerminal' : 'reveal', cwd: t.cwd });
  }

  async function folderMenu(h, at, isWt) {
    const key = h.dataset.key, cwd = h.dataset.cwd, sel = picked.has(key), n = picked.size;
    const f = folderOf(key);
    const items = [];
    // A deleted worktree's folder (nested, or listed on its own): nothing to open in it.
    const gone = !!(f.wt && f.wt.state && f.wt.state.deleted);
    if (!isWt && n > 1 && sel) {
      items.push({ id: 'bulkOn', title: `Archive the ${n} Selected Folders` }, { id: 'bulkOff', title: `Unarchive the ${n} Selected Folders` }, { separator: true });
    }
    items.push({ id: 'new', title: isWt ? 'New Terminal in This Worktree' : 'New Terminal in This Folder', enabled: !gone });
    if ('repo' in f || isWt) items.push({ id: 'worktree', title: 'New Worktree…', enabled: !gone && (isWt || !!f.repo) });
    if (!isWt) items.push({ id: 'fold', title: folded.has(key) ? 'Unfold' : 'Fold' });
    items.push({ id: 'reveal', title: `Show Folder in ${FILE_MANAGER}`, enabled: !gone });
    if (!isWt) {
      items.push({ separator: true }, { id: 'select', title: sel ? 'Deselect' : 'Select' }, { id: 'archive', title: 'Archive Folder' });
      if (h.dataset.pinned) items.push({ id: 'unpin', title: 'Remove from the List' });
    }
    const all = !isWt && n > 1 && sel ? [...picked] : [key];
    if (!isWt) items.push({ separator: true }, { id: 'delete', title: all.length > 1 ? `Delete the Chats in the ${all.length} Selected Folders…` : 'Delete the Chats in This Folder…' });
    const wt = f.wt;
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
    else if (choice === 'worktree') post({ type: 'newWorktree', cwd });
    else if (choice === 'new' || choice === 'reveal') post({ type: choice === 'new' ? 'newTerminal' : 'reveal', cwd });
    else if (choice === 'fold') fold(key);
    else if (choice === 'unpin') post({ type: 'unpin', cwd });
  }

  function openMenuFor(el, at) {
    const card = cardOf(el);
    if (card) {
      const item = rowOfCard(card);
      if (item) chatMenu(item, at, true, card);
      return true;
    }
    const tr = el.closest('.sl-row.term');
    if (tr) {
      const t = ((data && data.terms) || []).find((x) => x.id === tr.dataset.term);
      if (t) termMenu(t, at);
      return true;
    }
    const r = el.closest('.sl-row');
    if (r) {
      const item = data && data.rows.find((x) => x.id === r.dataset.id);
      if (item) chatMenu(item, at, false, r);
      return true;
    }
    const w = el.closest('.sl-wth');
    if (w) return folderMenu(w, at, true), true;
    const h = el.closest('.sl-fold');
    if (h) return folderMenu(h, at, false), true;
    return false;
  }
  root.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.sl-ren') || e.target.closest('.sl-find')) return;
    if (openMenuFor(e.target, { x: Math.round(e.clientX), y: Math.round(e.clientY) })) e.preventDefault();
  });

  // ---------- the header, the search, the bulk bar ----------
  async function openFolder() {
    const d = await post({ type: 'openFolder' });
    if (!d) return;
    clearSearch();
    $('chats-body').scrollTop = 0;
    render();
  }
  $('chats-open').addEventListener('click', openFolder);
  const input = $('chats-q');
  function setQuery(v) {
    query = v;
    $('chats-find-box').classList.toggle('has', !!v);
    render();
  }
  function clearSearch() {
    input.value = '';
    setQuery('');
  }
  input.addEventListener('input', () => setQuery(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      clearSearch();
      input.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusAt(0, 1);
    }
  });
  $('chats-x').addEventListener('click', () => {
    clearSearch();
    input.focus();
  });
  // Not while another view (Source Control, a menu…) has the dashboard's place: the list isn't there then. The Mac's
  // Edit › Find… comes here too (RadarView.swift), so the check is here and not only in the keys below.
  const searchable = () => {
    const app = $('app');
    return !!app && !app.classList.contains('git-mode') && !app.classList.contains('cloud-mode') && !document.querySelector('.askbox, #cloudui .menu');
  };
  const focusSearch = () => {
    if (!searchable()) return;
    if (document.documentElement.classList.contains('chats-closed')) setClosed(false, true);
    input.focus();
    input.select();
  };
  $('chats-find').addEventListener('click', focusSearch);
  document.addEventListener('keydown', (e) => {
    if ((mac ? e.metaKey : e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'f') {
      if (!searchable()) return;
      e.preventDefault();
      focusSearch();
    }
  });
  $('chats-bulk-arc').addEventListener('click', () => {
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
  $('chats-bulk-del').addEventListener('click', () => remove(picked.size ? { type: 'deleteFolders', keys: [...picked] } : { type: 'delete', ids: [...pickedChats] }));
  $('chats-clear').addEventListener('click', clearPicked);

  // ---------- ⌘B: the saved chats fold away, the live cards stay ----------
  // `quiet`: the app's kept state at load, no arrival glow then.
  function setClosed(on, tell, quiet) {
    const was = document.documentElement.classList.contains('chats-closed');
    const ae = document.activeElement;
    // The search field folds away with the list: its words must not go on hiding live cards out of sight.
    if (on && query) clearSearch();
    document.documentElement.classList.toggle('chats-closed', !!on);
    const fb = $('chats-fold');
    // The keyboard was in what folds away (the list, the search, the picked bar; not a live card): it goes to the bar.
    if (on && ae && ae.closest && ae.closest('#chats-saved, #chats-find-box, #chats-bulk')) (fb.hidden ? $('chats-tag') : fb).focus({ preventScroll: true });
    fb.classList.remove('arrive');
    if (on && !was && !quiet && !calm()) {
      void fb.offsetWidth;
      fb.classList.add('arrive');
    }
    labelFold();
    if (tell) post({ type: 'closed', on: !!on });
    dispatchEvent(new Event('chatsdraw'));
  }
  $('chats-fold').addEventListener('click', () => setClosed(!document.documentElement.classList.contains('chats-closed'), true));
  $('chats-fold').addEventListener('animationend', (e) => e.currentTarget.classList.remove('arrive'));
  $('chats-tag').addEventListener('click', () => setClosed(!document.documentElement.classList.contains('chats-closed'), true));

  // ---------- the keyboard ----------
  const focusables = () => [...root.querySelectorAll('#sessions > .card:not([hidden]), #chats-fold, .sl-fold, .sl-row, .sl-more')].filter((el) => el.offsetParent !== null);
  function focusAt(from, step) {
    const list = focusables();
    if (!list.length) return;
    const i = Math.max(0, Math.min(list.length - 1, from));
    list[i].focus();
    list[i].scrollIntoView({ block: 'nearest' });
  }
  root.addEventListener('keydown', (e) => {
    const el = e.target;
    if (el.closest('input')) return;
    const list = focusables();
    const i = list.indexOf(el);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (i < 0 && !list.length) return;
      e.preventDefault();
      focusAt(i < 0 ? 0 : i + (e.key === 'ArrowDown' ? 1 : -1), 1);
    } else if (e.key === 'Enter' && i >= 0) {
      e.preventDefault();
      el.click();
    } else if (e.key === ' ' && i >= 0) {
      if (el.id === 'chats-fold') return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      openMenuFor(el, { x: Math.round(r.left + r.width / 2), y: Math.round(r.bottom) });
    } else if (e.key === 'Escape' && query) {
      clearSearch();
    }
  });

  // ---------- what the app and the dashboard tell us ----------
  window.__chats = {
    update(d) {
      if (!d || !Array.isArray(d.rows)) return;
      // The demo (Windows staging, ORBITERM_DEMO: made-up projects on the dashboard) had no chats list: nothing real here.
      if (window.__DEMO__) d = { ...d, rows: [], terms: [], pinned: [], order: [], folders: {}, folded: [] };
      // A chat that has just become a favourite (from its row, a tab's star or the HUD's) slides into Favorites. Not one
      // that only changed its id (a live chat's conversation became known, it was saved): its session's is the same.
      const was = data ? favIds() : null;
      const gained = was ? d.rows.find((r) => r.fav && !was.has(r.id) && !(r.sid && was.has(r.sid))) : null;
      data = d;
      if (gained && !calm()) arrive = { id: gained.id, fav: true, until: performance.now() + 1500 };
      if (typeof d.chatsKey === 'string' && d.chatsKey !== keyKey) this.keys({ chatsList: d.chatsKey });
      if ('active' in d) {
        activeId = d.active || null;
        activeAlt = d.activeAlt || null;
      }
      // The folders folded before this list was the page's (the Mac kept them itself) come over once.
      if (!seeded && Array.isArray(d.folded)) {
        seeded = true;
        for (const k of d.folded) folded.add(k);
        keepFolded();
      }
      const keys = new Set(data.rows.map((r) => r.key));
      for (const k of picked) if (!keys.has(k) && !(data.pinned || []).includes(k)) picked.delete(k);
      const ids = new Set(data.rows.map((r) => r.id));
      for (const id of pickedChats) if (!ids.has(id)) pickedChats.delete(id);
      // A drawing meanwhile must not eat what is being typed.
      if (renaming) draft = (root.querySelector('.sl-ren') || {}).value ?? draft;
      render();
      // Out of view, the new favourite is scrolled to (the nearest edge: no jump when it is already seen).
      if (gained) {
        reveal = { id: gained.id, until: performance.now() + 1000 };
        revealRow(calm() ? 'auto' : 'smooth');
      }
    },
    // The focused window's session, and (`altId`) the conversation its AI is in when that's another id.
    active(id, altId) {
      const next = id || null;
      const alt = altId && altId !== next ? altId : null;
      if (next === activeId && alt === activeAlt) return;
      activeId = next;
      activeAlt = alt;
      render();
    },
    // The keys the app has for the fold (Settings › Shortcuts can change them): `chatsList`, as shown ("⌘B").
    keys(k) {
      if (!k || typeof k.chatsList !== 'string') return;
      keyKey = k.chatsList;
      for (const kb of $('chats-fold').querySelectorAll('kbd')) kb.textContent = k.chatsList;
      $('chats-fold').classList.toggle('nokey', !k.chatsList);
      labelFold();
    },
    // ⌘F from the app's Edit menu.
    focusSearch,
    // ⌘B (or the app's own state at load): fold or unfold the saved chats.
    fold(on) {
      const first = !foldSynced;
      foldSynced = true;
      setClosed(on === true || on === 'true', false, first);
    },
    // The dashboard's session cards (app.js renderSessions): which chats are live, so they are not listed twice.
    cards(list) {
      const next = (list || []).map((s) => ({ id: s.id, conv: s.convId || '', st: s.status, name: s.name, title: s.title, tool: s.tool === 'Antigravity' ? 'antigravity' : s.tool === 'Codex' ? 'codex' : s.tool === 'Cursor' ? 'cursor' : 'claude', ask: s.waitingFor || '' }));
      const key = JSON.stringify(next.map((c) => [c.id, c.conv, c.st === 'ended' ? 0 : 1, c.st === 'waiting' ? 1 : 0]));
      // A chat that turns "needs you" is said once in the page's polite region.
      if (cardKey) {
        const was = new Map(cards.map((c) => [c.id, c.st]));
        for (const c of next) {
          if (c.st === 'waiting' && was.has(c.id) && was.get(c.id) !== 'waiting') {
            const live = $('id-live');
            if (live) live.textContent = `${c.name} needs you${c.ask ? `: ${c.ask}` : ''}`;
          }
        }
      }
      cards = next;
      const changed = key !== cardKey;
      cardKey = key;
      if (changed) render();
      else syncCards();
    },
  };

  // ---------- Viktoria (the roaming mascot): the folder strips she can stand on and tap ----------
  window.__mascotFold = (key) => {
    // ⌘B folded the list after she picked her strip: it's out of sight, she leaves it be.
    if (typeof key !== 'string' || document.documentElement.classList.contains('chats-closed')) return;
    for (const h of saved().querySelectorAll('.sl-fold[data-key]')) if (h.dataset.key === key) return fold(key);
  };
  window.__chatsRects = () => {
    const out = [];
    const view = $('chats-body').getBoundingClientRect();
    const add = (id, el) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0 || r.bottom < view.top + 8 || r.top > view.bottom - 8) return;
      out.push({ id, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
    };
    if (document.documentElement.classList.contains('chats-closed')) return out;
    const fav = saved().querySelector('.sl-sec.fav');
    if (fav) add('side:favorites', fav);
    for (const h of saved().querySelectorAll('.sl-fold[data-key]')) add(`side:${h.dataset.key}`, h);
    return out;
  };

  // "5m", "2h": the times move on (only the words change; a drawing would lose the pointer's place).
  setInterval(() => {
    for (const el of saved().querySelectorAll('.sl-row[data-m]')) {
      const a = el.querySelector('.age');
      if (a && el.dataset.m !== '') {
        const t = age(Number(el.dataset.m));
        if (a.textContent !== t) a.textContent = t;
      }
    }
  }, 30_000);
  // The Mac's title bar is the top bar (the window has no strip of its own): the app is told how tall the top bar is, to
  // put the traffic lights in its middle, and a press on its empty part drags the window.
  if (mac) {
    const top = $('top');
    const radar = (m) => {
      try {
        window.webkit.messageHandlers.radar.postMessage(m);
      } catch {}
    };
    if (top) {
      let last = '';
      const tell = () => {
        const r = top.getBoundingClientRect();
        // Its width too: a new text size (the page's zoom) keeps the bar's px but moves its middle in points.
        const k = `${Math.round(r.top)}:${Math.round(r.height)}:${Math.round(r.width)}`;
        if (k === last) return;
        last = k;
        radar({ type: 'topBar', top: r.top, h: r.height });
      };
      new ResizeObserver(tell).observe(top);
      tell();
      // The bar's empty parts and the page's edge above it, as a title bar's: a press drags the window, a double-click
      // zooms it (or what System Settings › Desktop & Dock says a title bar's double-click does).
      document.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || e.clientY > top.getBoundingClientRect().bottom) return;
        const t = e.target;
        const bare = t === top || t === document.body || t === document.documentElement || t.id === 'app' || !!(t.closest && t.closest('#top .kpis, #top .marquee, #top .clock, #boot'));
        if (!bare) return;
        if (e.detail === 2) radar({ type: 'titleDoubleClick' });
        else if (e.detail === 1) radar({ type: 'dragWindow' });
      });
    }
  }
  render();
  post({ type: 'ready' });
})();
