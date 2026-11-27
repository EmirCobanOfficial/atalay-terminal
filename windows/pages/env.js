'use strict';
// The env button (the strip's "env", Ctrl+Shift+E): the env files under the terminal's folder, as a view over the
// terminal in the same window, the Mac's EnvView.swift. One file opens at once; several first show a list. Values are
// masked until the user opens one, and always in streamer mode. The app reads and writes the files (envbridge.js,
// envfiles.js): this page only ever names a file by its path below the folder. What a file holds stays in this page's
// memory while the view is open, and goes when it closes; the terminal's text (which the AI tools may read) never has it.
(() => {
  const hud = document.getElementById('hud');
  const ask = (q) => atl.ask('term:env', q);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const MASK = '••••••••••';
  const NOTICES = { saved: 'Saved', reloaded: 'Reloaded: the file changed on disk' };

  // ---------- the strip's button ----------
  const btn = document.createElement('button');
  btn.id = 'envbtn';
  btn.type = 'button';
  btn.textContent = 'env';
  btn.setAttribute('aria-label', 'Env files');
  // Its tooltip, the Mac's: in a split pane's slim strip (Panes.swift's env button) always the files and whether they hold
  // changes not saved; on the full strip (the HUD's) "Back to the terminal" while the view is open.
  const tipBtn = () => {
    const open = !!S && !document.body.classList.contains('pane-split');
    btn.title = open ? 'Back to the terminal (Ctrl+Shift+E)'
      : `The env files in this folder and the ones in it: open one to edit or copy from it (Ctrl+Shift+E).${S && S.dirty ? ' It has changes not saved.' : ''}`;
  };
  atl.on('term:pane', tipBtn);
  hud.insertBefore(btn, document.getElementById('pin') || document.getElementById('star') || document.getElementById('end'));

  const view = document.createElement('section');
  view.id = 'env';
  view.hidden = true;
  view.setAttribute('aria-label', 'Env files');
  // Focusable itself: while it looks for files (or finds none) it has the keys, so nothing typed reaches the shell.
  view.tabIndex = -1;
  document.body.appendChild(view);

  // ---------- state (the Mac's EnvModel) ----------
  let S = null; // null: the view is closed
  tipBtn();
  let streamer = false;
  let closeKeys = (window.__keys && window.__keys.closePane) || 'ctrl+w';
  let nextId = 1;
  // The Save / Don't Save / Cancel question is up (askOpen; `asking` its answer), or an IME is composing text in a field:
  // the view isn't drawn again meanwhile (that would take the focus from the question, or the text being composed), it is
  // once they're done (deferred).
  let askOpen = false;
  let asking = null;
  let composing = false;
  let deferred = false;
  const fresh = () => ({
    phase: 'scanning', files: [], truncated: false, where: '', query: '', selection: 0, rel: null, lines: [], dirty: false,
    notice: null, banner: null, revealed: new Set(), revealAll: false, filter: '', hasList: false, locked: false, crlf: false,
    finalNewline: true, bom: false, base: 0, token: 0, copied: null,
  });
  atl.on('term:keys', (k) => {
    if (k && k.closePane !== undefined) closeKeys = k.closePane;
  });
  atl.on('term:info', (i) => {
    const on = !!(i && i.streamer);
    if (on === streamer) return;
    streamer = on;
    if (S) {
      mask();
      render();
      // The folder names follow: made-up ones from now on, or the real ones again (the Mac's Streamer.fake).
      shownNames();
    }
  });

  const isOpen = () => !!S;
  const pairs = () => (S ? S.lines.filter((l) => l.kind === 'pair') : []);
  const shown = () => {
    const q = S.query.trim().toLowerCase();
    return q ? S.files.filter((f) => `${f.folder}/${f.name}`.toLowerCase().includes(q)) : S.files;
  };
  const isKey = (s) => /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(s);
  const duplicates = () => {
    const seen = new Set();
    const dup = new Set();
    for (const l of pairs()) if (l.enabled && l.key) (seen.has(l.key) ? dup : seen).add(l.key);
    return dup;
  };
  const words = (r) => (r && r.words) || 'The file couldn’t be read or written.';
  let noticeTimer = null;
  function say(text, sticky) {
    S.notice = text;
    clearTimeout(noticeTimer);
    if (!sticky) noticeTimer = setTimeout(() => S && S.notice === text && ((S.notice = null), renderStatus()), 2500);
    renderStatus();
  }
  function mask() {
    if (!S) return;
    S.revealed.clear();
    S.revealAll = false;
  }
  // Changes not saved: the dot on the button, and the app told (main.js asks this page before the terminal ends or the
  // app quits, the Mac's confirmEnv).
  let toldDirty = false;
  function tellDirty() {
    btn.classList.toggle('dirty', !!(S && S.dirty));
    tipBtn();
    const on = !!(S && S.dirty && !S.locked);
    if (on === toldDirty) return;
    toldDirty = on;
    ask({ type: 'dirty', on }).catch(() => {});
  }
  const setDirty = () => {
    S.dirty = true;
    tellDirty();
    renderStrip();
  };
  const setClean = () => {
    if (S) S.dirty = false;
    tellDirty();
  };

  // ---------- open, scan, load ----------
  async function open() {
    S = fresh();
    btn.classList.add('on');
    tipBtn();
    // The window's bar over a split has an env button too (pages/tabs.js): it shows pressed while this view is open.
    ask({ type: 'open', on: true }).catch(() => {});
    view.hidden = false;
    document.body.classList.add('env-open');
    render();
    view.focus();
    await scan();
  }
  async function scan() {
    const was = streamer;
    const r = await ask({ type: 'list' }).catch(() => null);
    if (!S) return;
    S.files = (r && r.files) || [];
    S.truncated = !!(r && r.truncated);
    S.where = (r && r.where) || '';
    S.selection = 0;
    // Streamer mode switched while the list was on its way: its names are asked for again.
    if (streamer !== was) shownNames();
    if (!S.files.length) S.phase = 'empty';
    else if (S.files.length === 1) {
      S.hasList = false;
      return load(S.files[0]);
    } else {
      S.hasList = true;
      S.phase = 'picker';
    }
    render();
  }
  /** The folder names as streamer mode has them now, for the list, the strip and the question (the app makes them up). */
  async function shownNames() {
    if (!S) return;
    const files = S.files;
    const r = await ask({ type: 'shown', folders: files.map((f) => f.folder) }).catch(() => null);
    if (!S || S.files !== files || !r) return;
    files.forEach((f, n) => {
      f.shownFolder = r.folders[n];
    });
    S.where = r.where;
    render();
  }
  async function load(f, quiet) {
    const token = ++S.token;
    if (!quiet) {
      S.phase = 'scanning';
      render();
    }
    const r = await ask({ type: 'read', rel: f.rel }).catch(() => null);
    if (!S || token !== S.token) return;
    // The lines come as one JSON text (the app passes them on from its worker without making them again).
    let lines = null;
    try {
      lines = r && !r.error ? JSON.parse(r.linesJSON) : null;
    } catch {}
    if (!Array.isArray(lines)) {
      S.rel = null;
      S.phase = S.hasList ? 'picker' : 'empty';
      render();
      return say(words(r), true);
    }
    Object.assign(S, {
      rel: f.rel, lines: lines.map((l) => ({ ...l, id: nextId++ })), crlf: r.crlf, finalNewline: r.finalNewline, bom: r.bom,
      base: r.mtime, locked: !!r.hardLinked, dirty: false, banner: null, filter: '', phase: 'editor',
    });
    mask();
    tellDirty();
    render();
    if (quiet) say(NOTICES.reloaded);
    else if (S.locked) say('This file is hard-linked: it can be copied here, not changed.', true);
    focusFirst();
  }

  // ---------- closing: unsaved changes are asked about first ----------
  /**
   * True when the view may go: nothing unsaved, saved, or the user chose not to. The app asks it too (main.js, before End
   * This Terminal, the dashboard's End, End Session, Clean Up, quitting or an update's restart ends this terminal): a
   * question already up answers them all.
   */
  function settle() {
    if (!S || !S.dirty || S.locked) return Promise.resolve(true);
    if (!asking) {
      asking = (async () => {
        const a = await askUnsaved();
        if (a === 'save') return await save(false);
        return a === 'discard';
      })().finally(() => {
        asking = null;
      });
    }
    return asking;
  }
  async function close() {
    if (!S) return;
    if (!(await settle())) return;
    S = null;
    clearTimeout(noticeTimer);
    view.hidden = true;
    view.innerHTML = '';
    document.body.classList.remove('env-open');
    btn.classList.remove('on');
    ask({ type: 'open', on: false }).catch(() => {});
    tellDirty();
    // Back to the terminal, which has the keys again.
    window.dispatchEvent(new Event('focus'));
  }
  const toggle = () => (S ? close() : open());
  btn.addEventListener('click', toggle);
  atl.on('term:env', toggle);
  async function backToList() {
    if (!(await settle())) return;
    Object.assign(S, { rel: null, lines: [], dirty: false, banner: null, notice: null, phase: 'picker' });
    mask();
    tellDirty();
    render();
  }

  // The question: Save / Don't Save / Cancel; Cancel has the focus, Esc cancels. It sits on the page itself, over the
  // view, so nothing drawn in the view meanwhile can take it away; the file is named as the strip names it (made-up
  // folders in streamer mode).
  function askUnsaved() {
    return new Promise((resolve) => {
      const box = document.createElement('div');
      box.className = 'env-ask';
      box.innerHTML = '<div class="env-ask-box" role="alertdialog" aria-modal="true" aria-labelledby="env-ask-t">' +
        `<b id="env-ask-t">Save the changes to ${esc(fileTitle())}?</b><p>If you don’t, they’re lost.</p>` +
        '<div class="env-ask-btns"><button type="button" data-a="discard">Don’t Save</button><button type="button" data-a="cancel">Cancel</button>' +
        '<button type="button" class="go" data-a="save">Save</button></div></div>';
      const done = (a) => {
        box.remove();
        askOpen = false;
        removeEventListener('keydown', key, true);
        resolve(a);
        if (deferred) render();
      };
      const key = (e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        e.stopImmediatePropagation();
        done('cancel');
      };
      box.addEventListener('click', (e) => {
        const b = e.target.closest('[data-a]');
        if (b) done(b.dataset.a);
        else if (e.target === box) done('cancel');
      });
      addEventListener('keydown', key, true);
      askOpen = true;
      document.body.appendChild(box);
      box.querySelector('[data-a="cancel"]').focus();
    });
  }

  // ---------- saving and the file changing on disk ----------
  async function save(force) {
    if (!S || !S.rel) return false;
    if (S.locked) {
      say('This file is hard-linked; open it from its own folder to edit.', true);
      return false;
    }
    const bad = pairs().find((l) => (l.key || l.value || l.raw) && !isKey(l.key));
    if (bad) {
      say(bad.key ? `“${bad.key}” isn’t a valid name (letters, digits, _, . and -).` : 'A variable has no name.', true);
      return false;
    }
    const r = await ask({ type: 'write', rel: S.rel, lines: S.lines, crlf: S.crlf, finalNewline: S.finalNewline, bom: S.bom, base: force ? null : S.base }).catch(() => null);
    if (!S) return false;
    if (r && typeof r.mtime === 'number') {
      S.base = r.mtime;
      S.lines = S.lines.filter((l) => !(l.kind === 'pair' && !l.key && !l.value && !l.raw));
      S.dirty = false;
      S.banner = null;
      tellDirty();
      render();
      say(NOTICES.saved);
      return true;
    }
    if (r && r.error === 'conflict') {
      S.banner = 'conflict';
      render();
      return false;
    }
    say(words(r), true);
    return false;
  }
  // Every 1.5 s while open on a file: a change on disk (Claude, an editor) reloads at once when nothing here is changed,
  // else a band asks.
  // Not while the question is up: what it asks about stays as it was until it's answered.
  setInterval(async () => {
    if (!S || askOpen || S.phase !== 'editor' || !S.rel || S.banner) return;
    const rel = S.rel;
    const now = await ask({ type: 'modified', rel }).catch(() => undefined);
    if (!S || askOpen || S.rel !== rel || now === undefined) return;
    if (now === null) return S.notice !== 'The file is gone.' && say('The file is gone.', true);
    if (Math.abs(now - S.base) <= 0.5) return;
    if (S.dirty) {
      S.banner = 'changed';
      render();
    } else load({ rel }, true);
  }, 1500);

  // ---------- copying ----------
  async function copy(text, id) {
    await ask({ type: 'copy', text }).catch(() => null);
    if (!S) return;
    S.copied = id;
    renderRow(id);
    setTimeout(() => S && S.copied === id && ((S.copied = null), renderRow(id)), 1200);
  }
  async function copyAll() {
    await ask({ type: 'copy', lines: S.lines, crlf: S.crlf, finalNewline: S.finalNewline }).catch(() => null);
    if (!S) return;
    const n = pairs().filter((l) => l.enabled).length;
    say(`Copied ${n} variable${n === 1 ? '' : 's'}`);
  }

  // ---------- drawing ----------
  const ICON = {
    copy: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5" width="8" height="9" rx="1"/><path d="M3 11.5V3a1 1 0 0 1 1-1h6.5"/></svg>',
    check: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5"/></svg>',
    eye: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/></svg>',
    eyeOff: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><path d="M2.5 13.5l11-11"/></svg>',
    more: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="3.5" cy="8" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="12.5" cy="8" r="1"/></svg>',
    warn: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2l6.5 11.5h-13zM8 6.5v3.5M8 11.8v.2"/></svg>',
  };
  const shownRel = (f) => (f.shownFolder ? `${f.shownFolder}/${f.name}` : f.name);
  const fileTitle = () => {
    const f = S.files.find((x) => x.rel === S.rel);
    return f ? shownRel(f) : S.rel || '';
  };

  function render() {
    if (!S) return;
    if (askOpen || composing) {
      deferred = true;
      return;
    }
    deferred = false;
    view.innerHTML = '<div class="env-strip"></div><div class="env-band" hidden></div><div class="env-body"></div><div class="env-status" aria-live="polite"></div>';
    renderStrip();
    renderBand();
    const body = view.querySelector('.env-body');
    if (S.phase === 'scanning') body.innerHTML = '<p class="env-center">Looking for env files…</p>';
    else if (S.phase === 'empty') {
      body.innerHTML = '<div class="env-center"><b>No env files here</b><p>Looked for .env, .env.*, *.env and .envrc in this folder and the ones in it.</p>' +
        '<p>Hidden folders, node_modules, build output and virtualenvs are skipped.</p></div>';
    } else if (S.phase === 'picker') renderPicker(body);
    else renderEditor(body);
    renderStatus();
  }

  function renderStrip() {
    const strip = view.querySelector('.env-strip');
    if (!strip || !S) return;
    const editor = S.phase === 'editor';
    const n = S.lines.length ? pairs().length : 0;
    strip.innerHTML =
      '<button type="button" data-act="back" title="Back to the terminal (Esc)">‹ Terminal</button>' +
      (editor && S.hasList ? '<button type="button" data-act="files" title="All the env files here">☰ Files</button>' : '') +
      `<span class="env-where"><b>env</b> · ${esc(editor ? fileTitle() : S.where)}</span>` +
      (S.dirty ? '<i class="env-dot" title="Not saved" aria-label="Not saved"></i>' : '') +
      '<span class="env-sp"></span>' +
      (editor && !streamer && n ? `<button type="button" data-act="all">${S.revealAll ? ICON.eyeOff + 'Hide all' : ICON.eye + 'Show all'}</button>` : '') +
      (editor ? `<button type="button" data-act="copyall" title="The whole file with its real values, for a teammate">${ICON.copy}Copy all</button>` : '') +
      (editor ? `<button type="button" class="go" data-act="save" title="Save (Ctrl+S)"${S.dirty && !S.locked ? '' : ' disabled'}>Save</button>` : '');
  }
  function renderBand() {
    const band = view.querySelector('.env-band');
    if (!band) return;
    band.hidden = !S.banner;
    if (!S.banner) return;
    band.innerHTML = `<span>${S.banner === 'conflict' ? 'This file changed on disk since it was opened.' : 'This file changed on disk while you were editing.'}</span>` +
      '<button type="button" data-act="loaddisk">Load from disk</button><button type="button" data-act="overwrite">Keep mine and overwrite</button>';
  }
  function renderStatus() {
    const st = view.querySelector('.env-status');
    if (!st || !S) return;
    st.textContent = S.notice || '';
    st.hidden = !S.notice;
  }

  // The filter box is made once; typing redraws only the list under it (an IME's text being composed is left alone: the
  // list follows once it's committed).
  function renderPicker(body) {
    body.innerHTML = `<input class="env-q" type="search" spellcheck="false" autocomplete="off" placeholder="Type to filter ${S.files.length} files" aria-label="Filter the files" value="${esc(S.query)}">` +
      '<div class="env-files" role="listbox"></div>' +
      (S.truncated ? '<p class="env-note">Deeper folders, or files past the first 100, aren’t listed.</p>' : '');
    const q = body.querySelector('.env-q');
    const typed = () => {
      S.query = q.value;
      S.selection = 0;
      renderFiles();
    };
    q.addEventListener('input', (e) => !e.isComposing && typed());
    q.addEventListener('compositionend', typed);
    renderFiles();
    q.focus();
  }
  function renderFiles() {
    const box = view.querySelector('.env-files');
    if (!box || !S) return;
    const list = shown();
    S.selection = Math.min(S.selection, Math.max(0, list.length - 1));
    let groups = '';
    let last = null;
    list.forEach((f, i) => {
      if (f.folder !== last) {
        last = f.folder;
        const count = list.filter((x) => x.folder === f.folder).length;
        groups += `<div class="env-group">${esc(f.folder ? f.shownFolder : 'this folder')} <i>${count}</i></div>`;
      }
      groups += `<div class="env-file${i === S.selection ? ' sel' : ''}${f.kind === 'template' ? ' tpl' : ''}" data-i="${i}" role="option" aria-selected="${i === S.selection}">` +
        `<b>${esc(f.name)}</b>${f.kind === 'template' ? '<span class="env-badge">template</span>' : f.kind === 'envrc' ? '<span class="env-badge">direnv</span>' : ''}` +
        // A file whose variables weren't counted in time (a big tree) shows no count.
        (typeof f.keys === 'number' ? `<small>${f.keys} variable${f.keys === 1 ? '' : 's'}</small>` : '') +
        `<small>${esc(ago(f.mtime))}</small></div>`;
    });
    box.innerHTML = groups || `<p class="env-center">No file matches “${esc(S.query)}”</p>`;
  }
  const ago = (ms) => {
    const s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    return `${Math.floor(s / 86400)} d ago`;
  };

  function renderEditor(body) {
    const many = pairs().length > 15;
    body.innerHTML = (many ? `<input class="env-filter" type="search" spellcheck="false" autocomplete="off" placeholder="Filter by name" aria-label="Filter by name" value="${esc(S.filter)}">` : '') +
      '<div class="env-lines"></div>' +
      (S.locked || streamer ? '' : '<button type="button" class="env-add" data-act="add">+ Add variable</button>');
    const box = body.querySelector('.env-lines');
    // The names set twice, found once for all the rows (not once per row: a long file would take seconds).
    const dup = duplicates();
    box.innerHTML = S.lines.map((l) => rowHTML(l, dup)).join('');
    const f = body.querySelector('.env-filter');
    if (f) {
      f.addEventListener('input', () => {
        S.filter = f.value;
        applyFilter();
      });
      applyFilter();
    }
  }
  function applyFilter() {
    const q = S.filter.trim().toLowerCase();
    const byId = new Map(S.lines.map((l) => [l.id, l]));
    view.querySelectorAll('.env-line').forEach((el) => {
      const l = byId.get(Number(el.dataset.id));
      el.hidden = !!q && !(l && l.kind === 'pair' && l.key.toLowerCase().includes(q));
    });
  }
  const revealed = (l) => !streamer && (S.revealAll || S.revealed.has(l.id));
  function rowHTML(l, dups = duplicates()) {
    const ro = S.locked || streamer;
    if (l.kind === 'blank') return `<div class="env-line blank" data-id="${l.id}"></div>`;
    if (l.kind !== 'pair') {
      const hide = streamer || (l.secret && !revealed(l));
      return `<div class="env-line text" data-id="${l.id}">` +
        (hide ? `<button type="button" class="env-raw masked" data-act="reveal" title="${streamer ? 'Hidden in streamer mode' : 'Click to show and edit'}">${l.kind === 'comment' ? '# ' : ''}${MASK}</button>`
          : `<input class="env-raw" spellcheck="false" autocomplete="off" value="${esc(l.raw)}"${ro ? ' readonly' : ''} aria-label="Line">`) +
        '</div>';
    }
    const dup = l.enabled && l.key && dups.has(l.key);
    const bad = (l.key || l.value || l.raw) && !isKey(l.key);
    const open = revealed(l);
    const multi = l.value.includes('\n');
    const value = open
      ? (multi ? `<textarea class="env-v" spellcheck="false" rows="${Math.min(8, l.value.split('\n').length)}"${ro ? ' readonly' : ''} aria-label="${esc(l.key)} value">${esc(l.value)}</textarea>`
        : `<input class="env-v" spellcheck="false" autocomplete="off" value="${esc(l.value)}"${ro ? ' readonly' : ''} aria-label="${esc(l.key)} value">`)
      : `<button type="button" class="env-v masked" data-act="reveal" title="${streamer ? 'Hidden in streamer mode' : 'Click to show and edit'}" aria-label="${esc(l.key)} value, hidden">${l.value ? MASK : '<i>empty</i>'}</button>`;
    return `<div class="env-line pair${l.enabled ? '' : ' off'}" data-id="${l.id}">` +
      `<input type="checkbox" class="env-on" ${l.enabled ? 'checked' : ''}${ro ? ' disabled' : ''} title="${l.enabled ? 'On: click to comment it out' : 'Off (commented out): click to turn it on'}" aria-label="${esc(l.key)} on">` +
      `<input class="env-k${bad ? ' bad' : ''}" spellcheck="false" autocomplete="off" value="${esc(l.key)}" placeholder="NAME"${ro ? ' readonly' : ''} aria-label="Name">` +
      (dup ? `<span class="env-warn" title="${esc(l.key)} is set more than once">${ICON.warn}</span>` : '') +
      '<span class="env-eq">=</span>' + value +
      `<button type="button" class="env-i" data-act="copy" title="Copy the value" aria-label="Copy ${esc(l.key)}'s value">${S.copied === l.id ? ICON.check : ICON.copy}</button>` +
      (streamer ? '' : `<button type="button" class="env-i" data-act="eye" title="${open ? 'Hide' : 'Show'}" aria-label="${open ? 'Hide' : 'Show'} ${esc(l.key)}">${open ? ICON.eyeOff : ICON.eye}</button>`) +
      `<button type="button" class="env-i" data-act="more" title="More" aria-label="More for ${esc(l.key)}">${ICON.more}</button>` +
      '</div>';
  }
  function renderRow(id, focus) {
    const el = view.querySelector(`.env-line[data-id="${id}"]`);
    const l = S && S.lines.find((x) => x.id === id);
    if (!el || !l) return;
    el.outerHTML = rowHTML(l);
    if (focus) {
      const f = view.querySelector(`.env-line[data-id="${id}"] ${focus}`);
      if (f) {
        f.focus();
        // A value opened by a click is edited from its end, as a text field clicked past its text is.
        if (typeof f.value === 'string' && f.setSelectionRange) f.setSelectionRange(f.value.length, f.value.length);
      }
    }
    if (S.filter) applyFilter();
  }
  function focusFirst() {
    (view.querySelector('.env-q') || view.querySelector('.env-v, .env-k, .env-raw') || view.querySelector('[data-act="back"]'))?.focus();
  }

  // ---------- the line menu (⋯ and right-click) ----------
  function menu(l, x, y) {
    view.querySelector('.env-menu')?.remove();
    const m = document.createElement('div');
    m.className = 'env-menu';
    m.setAttribute('role', 'menu');
    const ro = S.locked || streamer;
    const items = l.kind === 'pair'
      ? [['value', 'Copy value'], ['pair', 'Copy KEY=value'], ['name', 'Copy name'], ['all', 'Copy all'], ...(ro ? [] : [['delete', 'Delete']])]
      : [['all', 'Copy all'], ...(ro ? [] : [['delete', 'Delete']])];
    m.innerHTML = items.map(([a, t]) => `<button type="button" role="menuitem" data-m="${a}">${t}</button>`).join('');
    m.style.left = `${Math.min(x, innerWidth - 180)}px`;
    m.style.top = `${Math.min(y, innerHeight - 30 * items.length - 10)}px`;
    view.appendChild(m);
    m.querySelector('button').focus();
    // Once: taking the menu away moves the focus off its button, and that focusout asked to take it away again in the
    // middle of the removal, which threw and left the item's action undone.
    let gone = false;
    const done = () => {
      if (gone) return;
      gone = true;
      m.remove();
    };
    m.addEventListener('click', (e) => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      done();
      const a = b.dataset.m;
      if (a === 'value') copy(l.value, l.id);
      else if (a === 'pair') copy(`${l.key}=${l.value}`, l.id);
      else if (a === 'name') copy(l.key, l.id);
      else if (a === 'all') copyAll();
      else if (a === 'delete') {
        S.lines = S.lines.filter((x) => x !== l);
        setDirty();
        render();
      }
    });
    m.addEventListener('focusout', (e) => !m.contains(e.relatedTarget) && done());
  }

  // ---------- what the user does in the view ----------
  view.addEventListener('click', async (e) => {
    if (!S) return;
    const a = e.target.closest('[data-act]')?.dataset.act;
    const row = e.target.closest('.env-line');
    const l = row && S.lines.find((x) => x.id === Number(row.dataset.id));
    const file = e.target.closest('.env-file');
    if (file) {
      const f = shown()[Number(file.dataset.i)];
      if (f) load(f);
      return;
    }
    if (!a) return;
    if (a === 'back') return close();
    if (a === 'files') return backToList();
    if (a === 'save') return save(false);
    if (a === 'copyall') return copyAll();
    if (a === 'all') {
      S.revealAll = !S.revealAll;
      if (!S.revealAll) S.revealed.clear();
      return render();
    }
    if (a === 'loaddisk') {
      const rel = S.rel;
      setClean();
      return load({ rel }, true);
    }
    if (a === 'overwrite') return save(true);
    if (a === 'add') {
      const nl = { kind: 'pair', raw: '', key: '', value: '', enabled: true, export: false, quote: null, sep: '=', trailing: '', eol: '', changed: true, id: nextId++ };
      S.lines.push(nl);
      S.revealed.add(nl.id);
      setDirty();
      render();
      return view.querySelector(`.env-line[data-id="${nl.id}"] .env-k`)?.focus();
    }
    if (!l) return;
    if (a === 'reveal' || a === 'eye') {
      if (streamer) return;
      if (a === 'eye' && revealed(l)) S.revealed.delete(l.id);
      else S.revealed.add(l.id);
      return renderRow(l.id, a === 'reveal' ? (l.kind === 'pair' ? '.env-v' : '.env-raw') : null);
    }
    if (a === 'copy') return copy(l.value, l.id);
    if (a === 'more') {
      const r = e.target.closest('button').getBoundingClientRect();
      return menu(l, r.left - 120, r.bottom + 2);
    }
  });
  view.addEventListener('contextmenu', (e) => {
    const row = e.target.closest('.env-line');
    const l = S && row && S.lines.find((x) => x.id === Number(row.dataset.id));
    if (!l || l.kind === 'blank') return;
    e.preventDefault();
    menu(l, e.clientX, e.clientY);
  });
  view.addEventListener('change', (e) => {
    const row = e.target.closest('.env-line');
    const l = S && row && S.lines.find((x) => x.id === Number(row.dataset.id));
    if (!l || !e.target.classList.contains('env-on')) return;
    l.enabled = e.target.checked;
    l.changed = true;
    setDirty();
    renderRow(l.id, '.env-on');
  });
  view.addEventListener('input', (e) => {
    const row = e.target.closest('.env-line');
    const l = S && row && S.lines.find((x) => x.id === Number(row.dataset.id));
    if (!l) return;
    const t = e.target;
    if (t.classList.contains('env-k')) {
      l.key = t.value;
      t.classList.toggle('bad', !!(l.key || l.value) && !isKey(l.key));
    } else if (t.classList.contains('env-v')) l.value = t.value;
    else if (t.classList.contains('env-raw')) {
      l.raw = t.value;
      l.kind = t.value.trim().startsWith('#') ? 'comment' : 'other';
    } else return;
    l.changed = true;
    if (!S.dirty) setDirty();
  });
  // A value shown only because it was clicked is masked again when the cursor leaves it.
  view.addEventListener('focusout', (e) => {
    const row = e.target.closest('.env-line');
    const l = S && row && S.lines.find((x) => x.id === Number(row.dataset.id));
    if (!l || S.revealAll || !S.revealed.has(l.id)) return;
    // Only a field the value was typed in: the masked button a real click focused first loses the focus too, as the row
    // is drawn again with the field, and taking that for "the cursor left" masked the value again at once.
    if (!e.target.matches('input.env-v, textarea.env-v, input.env-raw')) return;
    // A field taken away by the row being drawn again (not by the user leaving it) keeps the value shown.
    if (!e.target.isConnected) return;
    if (row.contains(e.relatedTarget)) return;
    S.revealed.delete(l.id);
    setTimeout(() => S && !S.revealed.has(l.id) && renderRow(l.id), 0);
  });

  // An IME composing text in one of the view's fields: the view isn't drawn again until the text is committed.
  view.addEventListener('compositionstart', () => {
    composing = true;
  });
  view.addEventListener('compositionend', () => {
    composing = false;
    if (deferred) setTimeout(render, 0);
  });

  // ---------- keys: the view has them while it is open ----------
  // A key press as a combo, as terminal.js and the app's menu read it (shortcuts.js comboOf): the key where it is on the
  // keyboard, whatever the layout types there (Ctrl+S is Ctrl+S on a Russian layout too, and the close keys never slip
  // through to the menu, which would close the window without asking), or what it types when it comes without a place
  // (SendKeys, Remote Desktop, the on-screen keyboard give no scan code).
  const NAMED = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', PageUp: 'pageup', PageDown: 'pagedown',
    Home: 'home', End: 'end', Enter: 'return', NumpadEnter: 'return', Tab: 'tab', Space: 'space', Insert: 'insert', Delete: 'delete',
    Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'", Comma: ',',
    Period: '.', Slash: '/', Backquote: '`', NumpadAdd: 'plus', NumpadSubtract: 'numsub', Escape: 'esc',
  };
  const SHIFTED = { '+': '=', _: '-', '{': '[', '}': ']', '|': '\\', ':': ';', '"': "'", '<': ',', '>': '.', '?': '/', '~': '`',
    '!': '1', '@': '2', '#': '3', $: '4', '%': '5', '^': '6', '&': '7', '*': '8', '(': '9', ')': '0' };
  const typedKey = (k) => {
    if (!k) return null;
    if (k.length === 1) {
      const c = SHIFTED[k] || k.toLowerCase();
      return /^[a-z0-9]$/.test(c) || Object.values(NAMED).includes(c) ? c : null;
    }
    const m = /^F([1-9]|1[0-9]|2[0-4])$/.exec(k);
    return m ? `f${m[1]}` : k === ' ' ? 'space' : NAMED[k] || null;
  };
  const comboOf = (e) => {
    const c = e.code || '';
    let m;
    const key = (m = /^Key([A-Z])$/.exec(c)) ? m[1].toLowerCase()
      : (m = /^(?:Digit|Numpad)([0-9])$/.exec(c)) ? m[1]
        : (m = /^F([1-9]|1[0-9]|2[0-4])$/.exec(c)) ? `f${m[1]}` : NAMED[c] || typedKey(e.key);
    return key ? [e.ctrlKey && 'ctrl', e.altKey && 'alt', e.shiftKey && 'shift', key].filter(Boolean).join('+') : '';
  };
  addEventListener('keydown', (e) => {
    // An IME's keys are its own while it composes (229: the key went to it).
    if (!S || askOpen || e.isComposing || e.keyCode === 229) return;
    const combo = comboOf(e);
    const inField = e.target.closest && e.target.closest('#env input, #env textarea');
    // Esc: out of the field first, then back to the terminal. The close keys (Ctrl+W) go back too, whatever the swap.
    if (e.key === 'Escape' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      if (view.querySelector('.env-menu')) return view.querySelector('.env-menu').remove();
      if (inField && !e.target.classList.contains('env-q')) return e.target.blur();
      return close();
    }
    if (closeKeys && combo === closeKeys) {
      e.preventDefault();
      e.stopPropagation();
      return close();
    }
    if (combo === 'ctrl+s') {
      e.preventDefault();
      e.stopPropagation();
      return save(false);
    }
    if (S.phase === 'picker') {
      const list = shown();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        S.selection = Math.min(list.length - 1, Math.max(0, S.selection + (e.key === 'ArrowDown' ? 1 : -1)));
        view.querySelectorAll('.env-file').forEach((el) => {
          const on = Number(el.dataset.i) === S.selection;
          el.classList.toggle('sel', on);
          el.setAttribute('aria-selected', String(on));
          if (on) el.scrollIntoView({ block: 'nearest' });
        });
      } else if (e.key === 'Enter' && list[S.selection]) {
        e.preventDefault();
        load(list[S.selection]);
      }
    }
  }, true);
  // The terminal takes the keys back whenever its window is focused (terminal.js): not while this view is open.
  // The question, when it's up, keeps the focus.
  addEventListener('focus', () => S && setTimeout(() => S && !askOpen && !view.contains(document.activeElement) && focusFirst(), 0));
  // The window out of sight or in the background: every value is masked again.
  addEventListener('blur', () => {
    if (!S || (!S.revealed.size && !S.revealAll)) return;
    mask();
    if (S.phase === 'editor') render();
  });
  // Ending the terminal with unsaved changes asks first.
  document.getElementById('end')?.addEventListener('click', async (e) => {
    if (!S || !S.dirty || S.locked) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    if (await settle()) {
      setClean();
      atl.send('term:end');
    }
  }, true);

  // The app's way in (main.js): settle() before it ends this terminal, dirty() to know whether it needs to.
  window.EnvView = { isOpen, toggle, close, settle, dirty: () => !!(S && S.dirty && !S.locked) };
})();
