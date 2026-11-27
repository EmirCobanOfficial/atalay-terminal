'use strict';

// "New worktree": the sheet that asks one thing (a name) and then has the app run `git worktree add` into a folder next to
// the repo, copy what git doesn't keep (.env …) and start Claude, Codex, Antigravity or a plain terminal there.
// Opened over the folder picker (host: the picker's window; the sheet drops from its title bar) or on its own (alone).
// Mac only for now: the native side answers worktreeInfo / worktreeCreate (Overlay.swift); where it doesn't, the callers
// don't offer it (picker.js asks gitInfo first).
//   Worktree.open({ dir, host, alone, onDone({ path, open, ai }), onCancel }) -> Promise<boolean> (false: no sheet)
//   Worktree.step('made' | 'copied', n)   the native side's progress, while it works
(() => {
  const BR = '<svg class="i-br" viewBox="0 0 16 16"><circle cx="4.5" cy="3" r="1.6"/><circle cx="4.5" cy="13" r="1.6"/><circle cx="11.5" cy="5" r="1.6"/><path d="M4.5 4.6v6.8M11.5 6.6c0 3.2-7 2.4-7 4.8"/></svg>';
  const AIS = [{ id: 'claude', label: 'Claude' }, { id: 'codex', label: 'Codex' }, { id: 'agy', label: 'Antigravity' }, { id: 'cursor', label: 'Cursor' }, { id: 'terminal', label: 'Terminal' }];
  const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const note = (msg) => typeof toast === 'function' && toast(msg);
  const MOD = window.__platform === 'win32' ? 'Ctrl' : '⌘';

  // { dir, info, host, alone, box, name, touched, ai, busy, k, fail, fieldErr, partial, result, onDone, onCancel, opener }
  let st = null;

  // ---------- the rules (the native side checks again with git before it makes anything) ----------
  function check(name) {
    const info = st.info;
    if (!name) return { err: 'empty' };
    if (/[^A-Za-z0-9._/-]/.test(name)) return { err: 'chars' };
    if (name === 'HEAD') return { err: 'head' };
    if (/^[-./]|\/$|\.\.|\/\/|\/\.|\.lock(\/|$)|^@$|@\{|\.$/.test(name) || name.length > 60) return { err: 'shape' };
    if (info.branches.includes(name)) return { err: 'branch' };
    const folder = info.repo + '-' + name.replace(/\//g, '-');
    if (info.folders.some((f) => f.toLowerCase() === folder.toLowerCase())) return { err: 'folder', folder };
    return { ok: true, folder };
  }
  const MSG = {
    empty: () => 'Type a name.',
    chars: () => 'Use only letters, numbers and <code>- _ . /</code>',
    shape: () => 'A name can’t start with <code>-</code> <code>.</code> or <code>/</code>, end with <code>/</code> or <code>.lock</code>, or have <code>..</code> in it.',
    head: () => '<b>HEAD</b> is a name git keeps for itself. Pick another name.',
    branch: (n) => `There’s already a branch called <b>${h(n)}</b>. Pick another name.`,
    folder: (n, r) => `There’s already a folder called <b>${h(r.folder)}</b> next to your repo. Pick another name.`,
  };

  const baseName = () => (st.info.base ? st.info.base : `commit ${st.info.short}`);

  // The files the sheet says it copies: the first three, then "and N more"; a directory ends with "/".
  function copyNames(list) {
    const b = (f) => `<b>${h(f)}</b>`;
    if (list.length <= 3) return list.length > 1 ? list.slice(0, -1).map(b).join(', ') + ' and ' + b(list[list.length - 1]) : b(list[0]);
    return list.slice(0, 3).map(b).join(', ') + ` and ${list.length - 3} more`;
  }

  // ---------- the sheet ----------
  const COPY_ICO = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="5" y="5" width="8.5" height="8.5" rx="1.6"/><path d="M3 10.5V3.6A1.1 1.1 0 0 1 4.1 2.5H11"/></svg>';
  const INFO_ICO = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="6"/><path d="M8 7.2v3.6M8 5v.1"/></svg>';
  const WARN_ICO = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2.2l6.2 11H1.8z"/><path d="M8 6.6v3M8 11.4v.1"/></svg>';
  const BAD_ICO = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 4.8v3.8M8 11v.1"/></svg>';

  function stepsHTML(name, ai, copyCount) {
    const folder = st.info.repo + '-' + name.replace(/\//g, '-');
    const s = [
      [st.k === 0 && !st.partial ? 'Making the worktree' : 'Made the worktree', `<code>${h(folder)}</code>`],
      [copyCount ? `Copying ${copyCount} file${copyCount > 1 ? 's' : ''}` : 'Nothing to copy', ''],
      [ai.id === 'terminal' ? 'Opening a terminal' : `Opening ${ai.label}`, ''],
    ];
    return `<ol class="wt-steps" aria-live="polite">${s.map(([t, d], i) => {
      const cls = st.partial ? (i === 0 ? 'done' : i === 1 ? 'warn' : '') : i < st.k ? 'done' : i === st.k ? 'now' : '';
      return `<li class="${cls}"><span class="dot"></span><span>${t}${i === st.k && !st.partial ? '…' : ''} ${d}</span></li>`;
    }).join('')}</ol>`;
  }

  // Opened from a chat's note: the chat itself is not touched.
  const moveText = (mv, ai) => `${ai.id === 'terminal' ? 'A terminal opens' : `<b>${h(ai.label)}</b> starts`} in the worktree. The <b>${h(mv.tool)}</b> chat in <b>${h(mv.folder)}</b> keeps running.`;

  function sheetHTML() {
    const info = st.info;
    const name = st.name;
    const res = check(name);
    const fieldErr = st.fieldErr && st.fieldErr.name === name ? st.fieldErr.text : null;
    const showErr = !!fieldErr || (res.err && (res.err !== 'empty' || st.touched));
    const ai = AIS[st.ai];
    const copy = info.copy || [];
    const busy = st.busy || !!st.partial;
    const problem = info.problem === 'no-commits' ? { title: 'This repo has no commits yet.', text: 'Make a first commit, then try again.' }
      : info.problem === 'no-permission' ? { title: `Can’t make a folder next to ${info.repo}: no permission.`, text: '' }
      : null;

    let notes = '';
    if (!busy) {
      const copyLine = copy.length
        ? `<p class="wt-note">${COPY_ICO}<span>Copies ${copyNames(copy)}: git doesn’t keep ${copy.length > 1 ? 'them' : 'it'}. <span class="sm">${info.includeFile ? '(listed in .worktreeinclude)' : '(.env files by default · list others in .worktreeinclude)'}</span></span></p>`
        : `<p class="wt-note">${COPY_ICO}<span>Nothing to copy: no .env file here. <span class="sm">List files git ignores in .worktreeinclude to bring them along.</span></span></p>`;
      const dirtyLine = info.dirty
        ? `<p class="wt-note">${INFO_ICO}<span><b>${info.dirty} uncommitted change${info.dirty > 1 ? 's' : ''}</b> stay${info.dirty > 1 ? '' : 's'} in your main folder. The worktree starts from the last commit on ${h(baseName())}.</span></p>`
        : '';
      const MOVE_ICO = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2.5 8h10M9 4.5 12.5 8 9 11.5"/></svg>';
      const mv = st.moving;
      const moveLine = mv
        ? `<p class="wt-note move">${MOVE_ICO}<span>${moveText(mv, ai)}</span></p>`
        : '';
      notes = `<div class="wt-notes">${moveLine}${copyLine}${dirtyLine}</div>`;
    }

    let call = '';
    if (st.partial) {
      const w = st.partial.warnings;
      const first = h(w[0]).replace(/^([^:]+): /, '<code>$1</code>: ');
      call = stepsHTML(name, ai, copy.length) + `<div class="wt-call warn" role="alert">${WARN_ICO}<span><b>The worktree is ready, but ${w.length} file${w.length > 1 ? 's' : ''} wasn’t copied.</b> ${first}.${w.length > 1 ? ` And ${w.length - 1} more.` : ''} Copy ${w.length > 1 ? 'them' : 'it'} by hand if ${h(ai.label)} needs ${w.length > 1 ? 'them' : 'it'}.</span></div>`;
    } else if (st.busy) {
      call = stepsHTML(name, ai, copy.length);
    } else if (st.fail) {
      call = `<div class="wt-call bad" role="alert">${BAD_ICO}<span><b>${h(st.fail.title)}</b> ${h(st.fail.text || '')}${st.fail.git ? `<span class="git">${h(st.fail.git)}</span>` : ''}</span></div>`;
    } else if (problem) {
      call = `<div class="wt-call bad" role="alert">${BAD_ICO}<span><b>${h(problem.title)}</b> ${h(problem.text)}</span></div>`;
    }

    const base = info.base ? `⎇ ${h(info.base)}` : `commit ${h(info.short)}`;
    const folderShown = res.ok ? res.folder : `${info.repo}-…`;
    const canGo = res.ok && !st.busy && !problem && !fieldErr;
    return `<div class="wt-card">
    <div class="wt-bar"></div>
    ${st.alone ? '<div class="pk-border"></div>' : ''}
    <div class="wt-head"><span class="wt-ico">${BR}</span><div style="min-width:0">
      <h2 class="wt-t" id="wt-t">New worktree</h2>
      <p class="wt-sub" id="wt-sub"><b style="color:var(--txt2);font-weight:600">${h(info.repo)}</b> · from <span class="base">${base}</span></p></div></div>
    <label class="wt-lab" for="wt-in">Name</label>
    <div class="wt-field">
      <input class="wt-in" id="wt-in" value="${h(name)}" maxlength="60" spellcheck="false" autocomplete="off" autocapitalize="off"
        aria-invalid="${showErr ? 'true' : 'false'}" aria-describedby="wt-msg" ${busy ? 'disabled' : ''}>
      ${res.ok && !fieldErr ? '<svg class="wt-mark ok" viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7"/></svg>' : showErr ? '<svg class="wt-mark bad" viewBox="0 0 16 16"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg>' : ''}
    </div>
    <div id="wt-msg" aria-live="polite">${showErr
      ? `<p class="wt-err">${WARN_ICO}<span>${fieldErr ? h(fieldErr) : MSG[res.err](name, res)}</span></p>`
      : `<p class="wt-hint">New branch <b>${h(res.ok ? name : '…')}</b>, made from <b>${h(baseName())}</b>. Its folder goes next to your repo:<span class="path"><code>${h(info.parent + '/' + folderShown)}</code></span></p>`}</div>
    <div class="wt-group">
      <span class="wt-lab" id="wt-ai-l">Open with</span>
      <div class="wt-seg" role="radiogroup" aria-labelledby="wt-ai-l" style="--i:${st.ai}" ${busy ? 'aria-disabled="true"' : ''}>
        <span class="wt-thumb"></span>
        ${AIS.map((a, i) => `<button type="button" role="radio" aria-checked="${i === st.ai}" tabindex="${i === st.ai ? 0 : -1}" data-i="${i}" title="${a.id === 'terminal' ? 'A plain terminal in the worktree' : a.label + ' starts in the worktree'} (${MOD}${i + 1})">${a.label}</button>`).join('')}
      </div>
    </div>
    ${st.accts ? `<div class="wt-acct" role="radiogroup" aria-label="Claude account"${ai.id === 'claude' ? '' : ' hidden'}><span class="wt-lab" id="wt-acct-l">Claude account</span><span class="pk-seg">${st.accts.accounts.map((a) => `<button type="button" role="radio" class="${a.id === st.account ? 'on' : ''}" aria-checked="${a.id === st.account}" data-id="${h(a.id)}" style="--ah:${h(a.hue)}"${busy ? ' disabled' : ''}><i class="ac" style="--ah:${h(a.hue)}">${h(a.initial)}</i>${h(a.label)}</button>`).join('')}</span></div>` : ''}
    ${notes}
    ${call}
    <div class="wt-act">
      ${busy || st.fail ? '' : `<span class="keys"><kbd>${MOD}1</kbd>–<kbd>${MOD}4</kbd> pick the AI</span>`}
      ${st.partial
        ? `<button class="wt-btn glass" id="wt-finder">Show in Finder</button><button class="wt-btn go" id="wt-go">Open ${h(ai.label)} anyway <span class="k">↩</span></button>`
        : `<button class="wt-btn glass" id="wt-back" ${st.busy ? 'disabled' : ''}>${st.alone ? 'Cancel' : 'Back'}</button>
           <button class="wt-btn go" id="wt-go" ${canGo ? '' : 'disabled'}>${st.busy ? '<span class="spin"></span>Creating…' : st.fail ? 'Try again <span class="k">↩</span>' : 'Create and open <span class="k">↩</span>'}</button>`}
    </div>
  </div>`;
  }

  // focus: 'select' (the name, all of it), 'keep' (the name, caret where it was), 'seg' (the chosen AI), 'go' (the main button)
  function render(focus) {
    if (!st) return;
    const box = st.box;
    const had = box.querySelector('#wt-in');
    const caret = had ? [had.selectionStart, had.selectionEnd] : null;
    box.innerHTML = sheetHTML();
    box.classList.toggle('busy', st.busy);
    const inp = box.querySelector('#wt-in');
    if (focus === 'select') {
      inp.focus();
      inp.select();
    } else if (focus === 'keep' && caret && !inp.disabled) {
      inp.focus();
      inp.setSelectionRange(caret[0], caret[1]);
    } else if (focus === 'seg') box.querySelector('.wt-seg [aria-checked="true"]').focus();
    else if (focus === 'go') box.querySelector('#wt-go')?.focus();
    inp.oninput = () => {
      // A space becomes "-" as it's typed, so "fix login" is fine.
      const p = inp.selectionStart;
      inp.value = inp.value.replace(/\s/g, '-');
      st.name = inp.value;
      st.touched = true;
      st.fail = null;
      st.fieldErr = null;
      refreshField(p);
    };
    box.querySelectorAll('.wt-seg button').forEach((b) => {
      b.onclick = () => {
        if (st.busy || st.partial) return;
        st.ai = Number(b.dataset.i);
        refreshSeg(true);
      };
    });
    box.querySelectorAll('.wt-acct button').forEach((b) => {
      b.onclick = () => {
        if (st.busy || st.partial) return;
        st.account = b.dataset.id;
        box.querySelectorAll('.wt-acct button').forEach((x) => {
          x.classList.toggle('on', x === b);
          x.setAttribute('aria-checked', String(x === b));
        });
      };
    });
    const back = box.querySelector('#wt-back');
    if (back) back.onclick = cancel;
    const go = box.querySelector('#wt-go');
    if (go) go.onclick = create;
    const fin = box.querySelector('#wt-finder');
    if (fin) fin.onclick = () => {
      // The app hides the overlay so Finder shows: the picker and the sheet go with it.
      const path = st.result.path;
      st.busy = false;
      close();
      window.Picker?.dismiss();
      API.revealFolder(path).catch(() => {});
    };
  }

  // Updated in place, not re-rendered: the live region keeps announcing, the thumb slides, the busy bar keeps running.
  function refreshField(caret) {
    const box = st.box;
    const fresh = document.createElement('div');
    fresh.innerHTML = sheetHTML();
    for (const sel of ['.wt-field', '#wt-msg', '.wt-notes', '.wt-act', '.wt-hint']) {
      const a = box.querySelector(sel), b = fresh.querySelector(sel);
      if (a && b && sel !== '.wt-hint') {
        if (sel === '.wt-field') {
          const inp = a.querySelector('input'), bi = b.querySelector('input');
          inp.setAttribute('aria-invalid', bi.getAttribute('aria-invalid'));
          a.querySelector('.wt-mark')?.remove();
          const mark = b.querySelector('.wt-mark');
          if (mark) a.appendChild(mark);
        } else if (sel === '#wt-msg') {
          if (a.innerHTML !== b.innerHTML) a.innerHTML = b.innerHTML;
        } else if (sel === '.wt-act') {
          const go = a.querySelector('#wt-go'), bg = b.querySelector('#wt-go');
          if (go && bg) go.disabled = bg.disabled;
        }
      }
    }
    const call = box.querySelector('.wt-call'), fcall = fresh.querySelector('.wt-call');
    if (!!call !== !!fcall) return render('keep');
    if (caret != null) box.querySelector('#wt-in').setSelectionRange(caret, caret);
  }
  function refreshSeg(focus) {
    const seg = st.box.querySelector('.wt-seg');
    seg.style.setProperty('--i', st.ai);
    seg.querySelectorAll('button').forEach((b, i) => {
      b.setAttribute('aria-checked', String(i === st.ai));
      b.tabIndex = i === st.ai ? 0 : -1;
    });
    if (focus) seg.querySelector('[aria-checked="true"]').focus();
    const ai = AIS[st.ai];
    const wa = st.box.querySelector('.wt-acct');
    if (wa) wa.hidden = ai.id !== 'claude';
    const mv = st.box.querySelector('.wt-note.move span');
    if (mv && st.moving) mv.innerHTML = moveText(st.moving, ai);
    const msg = st.box.querySelector('#wt-go');
    if (st.partial && msg) msg.firstChild.textContent = `Open ${ai.label} anyway `;
  }

  // ---------- making it ----------
  async function create() {
    if (!st) return;
    if (st.partial) return finish();
    const info = st.info;
    if (st.busy || info.problem) return;
    const res = check(st.name);
    if (!res.ok) {
      st.touched = true;
      return render('keep');
    }
    const s = st;
    const name = st.name, ai = AIS[st.ai];
    st.fail = null;
    st.fieldErr = null;
    st.busy = true;
    st.k = 0;
    render();
    let r;
    try {
      r = await API.worktreeCreate(st.dir, name, ai.id);
    } catch (e) {
      r = { kind: 'git', error: 'The app didn’t answer.' };
    }
    // The sheet is gone or another one stands now: this reply isn't for it.
    if (st !== s) return;
    st.busy = false;
    if (r && r.ok) {
      st.result = r;
      if (r.warnings && r.warnings.length) {
        st.partial = r;
        render('go');
        return;
      }
      return finish();
    }
    const kind = r && r.kind, text = (r && r.error) || 'Something went wrong.';
    if (kind === 'name' || kind === 'branch' || kind === 'folder') {
      st.fieldErr = { name, text };
      render('select');
    } else if (kind === 'git') {
      st.fail = { title: 'Git couldn’t make the worktree.', text: 'Nothing was changed.', git: text };
      render('go');
    } else {
      st.fail = { title: text, text: '' };
      render('go');
    }
  }

  // The native side's progress: git is done ("made"), the files are copied ("copied").
  function step(name) {
    if (!st || !st.busy) return;
    st.k = name === 'made' ? 1 : name === 'copied' ? 2 : st.k;
    const old = st.box.querySelector('.wt-steps');
    if (!old) return render();
    const fresh = document.createElement('div');
    fresh.innerHTML = stepsHTML(st.name, AIS[st.ai], (st.info.copy || []).length);
    old.innerHTML = fresh.firstChild.innerHTML;
  }

  // The worktree is there and its files are: hand over to whoever opened the sheet, which opens the AI in it.
  function finish() {
    if (!st) return;
    const r = st.result, ai = AIS[st.ai].id, cb = st.onDone, st0 = st;
    teardown(!st.alone);
    cb && cb({ path: r.path, open: r.open || r.path, ai, account: ai === 'claude' ? st0.account : undefined });
  }

  // ---------- opening and closing ----------
  async function open({ dir, host, alone = false, ai, moving, account, onDone, onCancel } = {}) {
    if (st) return false;
    const opener = document.activeElement;
    let info = null;
    try {
      info = await API.worktreeInfo(dir);
    } catch (e) {
      info = null;
    }
    if (!info) {
      note('Worktrees aren’t available here.');
      return false;
    }
    if (info.error) {
      note(info.error === 'gone' ? 'Folder not found' : 'This folder isn’t in a git repo anymore.');
      return false;
    }
    // Two or more Claude accounts: the "Open with" row gets an account choice (shown while Claude is picked).
    let accts = null;
    try {
      accts = API.claudeAccounts ? await API.claudeAccounts(dir) : null;
    } catch (e) {
      accts = null;
    }
    if (!accts || !accts.multiple) accts = null;
    if (st || (host && !host.isConnected)) return false;
    // What's left of a sheet that was closing.
    document.querySelectorAll('.wt-veil, .pk .wt, .wt-alone').forEach((n) => n.remove());
    const lastAI = AIS.findIndex((a) => a.id === (ai || info.lastAI));
    st = { dir, info, host, alone, name: info.suggest, touched: false, ai: Math.max(0, lastAI), busy: false, k: 0, fail: null, fieldErr: null,
      partial: null, result: null, moving: moving || null, onDone, onCancel, opener,
      accts, account: accts ? (accts.accounts.some((a) => a.id === account) ? account : accts.last || accts.accounts[0].id) : null };
    if (alone) {
      const wrap = document.createElement('div');
      wrap.className = 'wt-alone on';
      wrap.innerHTML = '<div class="wt" role="dialog" aria-modal="true" aria-labelledby="wt-t" aria-describedby="wt-sub"></div>';
      wrap.onmousedown = (e) => {
        if (e.target === wrap) cancel();
      };
      document.body.appendChild(wrap);
      st.wrap = wrap;
      st.box = wrap.firstChild;
    } else {
      host.insertAdjacentHTML('beforeend', '<div class="wt-veil"></div><div class="wt" role="dialog" aria-modal="true" aria-labelledby="wt-t" aria-describedby="wt-sub"></div>');
      st.box = host.querySelector('.wt');
      requestAnimationFrame(() => requestAnimationFrame(() => st && st.host === host && host.classList.add('sheeted')));
    }
    render('select');
    return true;
  }

  // keep: the picker removes the sheet with itself (its own closing).
  function teardown(keep) {
    const s = st;
    st = null;
    if (!s || keep) return;
    if (s.alone) s.wrap.remove();
    else {
      s.host.classList.remove('sheeted');
      const box = s.box;
      setTimeout(() => {
        if (box.isConnected && !box.parentNode.classList.contains('sheeted')) {
          box.parentNode.querySelector('.wt-veil')?.remove();
          box.remove();
        }
      }, 300);
    }
  }

  function cancel() {
    if (!st || st.busy) return;
    const cb = st.onCancel;
    teardown(false);
    cb && cb();
  }

  // ---------- keys ----------
  addEventListener('keydown', (e) => {
    if (!st || e.isComposing) return;
    const k = e.key;
    if (k === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cancel();
      return;
    }
    if (k === 'Enter') {
      const a = document.activeElement;
      // Back and Show in Finder are buttons: Enter presses them. Anywhere else Enter makes the worktree.
      if (a && (a.id === 'wt-back' || a.id === 'wt-finder')) return;
      e.preventDefault();
      e.stopPropagation();
      if (!st.busy) create();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && /^[1-4]$/.test(k)) {
      e.preventDefault();
      e.stopPropagation();
      if (!st.busy && !st.partial) {
        st.ai = Number(k) - 1;
        refreshSeg(false);
      }
      return;
    }
    const seg = document.activeElement?.closest?.('.wt-seg');
    if (seg && (k === 'ArrowRight' || k === 'ArrowLeft')) {
      e.preventDefault();
      if (!st.busy && !st.partial) {
        st.ai = (st.ai + (k === 'ArrowRight' ? 1 : AIS.length - 1)) % AIS.length;
        refreshSeg(true);
      }
      return;
    }
    if (k === 'Tab') {
      // The sheet is modal: Tab goes round inside it.
      const items = [...st.box.querySelectorAll('input:not(:disabled), button:not(:disabled):not([tabindex="-1"])')];
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const i = items.indexOf(document.activeElement);
      const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i === items.length - 1 ? 0 : i + 1);
      e.preventDefault();
      items[next].focus();
    }
  }, true);

  // Gone without a word: the picker closed or another one opened (nothing may be left of it: a later ↩ must not make a worktree).
  function close() {
    if (!st || st.busy) return;
    const s = st;
    st = null;
    if (s.alone) s.wrap.remove();
    else {
      s.host.classList.remove('sheeted');
      s.box.parentNode?.querySelector('.wt-veil')?.remove();
      s.box.remove();
    }
  }

  window.Worktree = { open, close, step, isOpen: () => !!st, isBusy: () => !!(st && st.busy) };
})();
