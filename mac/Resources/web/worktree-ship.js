'use strict';

// Create PR, Merge and Delete worktree: the sheets of a worktree's next step (araştırma/worktree-pr/SPEC.md). They drop from the
// asking window's header (anchored: the overlay panel sits on that window) or stand alone in the middle (from the chats list or
// the Chat menu). The native side reads git and does the work (Overlay.swift ship* messages, WorktreeShip.swift); this file is the
// pages only: what they say, the keys, the steps and the moment it worked. Nothing is done until a sheet's own button is pressed.
//   Worktree.ship({ kind: 'create' | 'merge' | 'prmerge' | 'delete', top, anchored })   Worktree.shipStep(name)
(() => {
  const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const note = (msg) => typeof toast === 'function' && toast(msg);
  const MOD = window.__platform === 'win32' ? 'Ctrl' : '⌘';
  // The computer and its bin as Windows names them (the Windows app sets __platform), as cleanup.js does.
  const HERE = window.__platform === 'win32' ? 'this PC' : 'this Mac';
  const TRASH = window.__platform === 'win32' ? 'Recycle Bin' : 'Trash';
  const S = (path) => `<svg class="i-br" viewBox="0 0 16 16">${path}</svg>`;
  const I = {
    br: S('<circle cx="4.5" cy="3" r="1.6"/><circle cx="4.5" cy="13" r="1.6"/><circle cx="11.5" cy="5" r="1.6"/><path d="M4.5 4.6v6.8M11.5 6.6c0 3.2-7 2.4-7 4.8"/>'),
    pull: S('<circle cx="4" cy="3.4" r="1.6"/><circle cx="4" cy="12.6" r="1.6"/><circle cx="12" cy="12.6" r="1.6"/><path d="M4 5v6M12 11V6.4a2 2 0 0 0-2-2H7.2M8.8 2.8 7.2 4.4 8.8 6"/>'),
    merge: S('<circle cx="4" cy="3.4" r="1.6"/><circle cx="4" cy="12.6" r="1.6"/><circle cx="12" cy="9" r="1.6"/><path d="M4 5v6M4.6 4.9C5.6 8 7.8 9 10.4 9"/>'),
    trash: S('<path d="M2.8 4.4h10.4M6.3 4.4V2.9h3.4v1.5M4.4 4.4l.7 8.6a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.7-8.6M6.9 7v4.4M9.1 7v4.4"/>'),
    chev: '<svg class="i-br" viewBox="0 0 16 16" style="stroke-width:2"><path d="M3.5 6l4.5 4.5L12.5 6"/></svg>',
    check: S('<path d="M3.5 8.5l3 3 6-7"/>'),
    x: S('<path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/>'),
    info: S('<circle cx="8" cy="8" r="6"/><path d="M8 7.2v3.6M8 5v.1"/>'),
    warn: S('<path d="M8 2.2l6.2 11H1.8z"/><path d="M8 6.6v3M8 11.4v.1"/>'),
    push: S('<path d="M8 11.5V3M4.6 6.4 8 3l3.4 3.4M3 13.5h10"/>'),
    commit: S('<circle cx="8" cy="8" r="2.4"/><path d="M1.5 8h4.1M10.4 8h4.1"/>'),
    chat: S('<path d="M2.5 4A1.5 1.5 0 0 1 4 2.5h8A1.5 1.5 0 0 1 13.5 4v5.5A1.5 1.5 0 0 1 12 11H7.2L4.4 13.4V11H4A1.5 1.5 0 0 1 2.5 9.5z"/>'),
    ext: S('<path d="M9 2.5h4.5V7M13.5 2.5 7.6 8.4M11.5 9.6v2.9a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h2.9"/>'),
  };
  const mark = (k) => k === 'ok' ? `<span class="mark ok">${I.check}</span>` : k === 'bad' ? `<span class="mark bad">${I.x}</span>` : k === 'run' ? '<span class="mark run"></span>' : '<span class="mark none"></span>';
  const pl = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const code = (s) => `<code>${h(s)}</code>`;
  const base = (s) => `<span class="base">⎇ ${nm(s)}</span>`;
  const list = (a, max = 6) => (a.length > max ? a.slice(0, max).join(', ') + ` and ${a.length - max} more` : a.join(', '));
  // A path's last part. The Windows app's paths have backslashes; a Mac name may hold one, so only there they split.
  const leaf = (p) => {
    const s = String(p || '');
    return (window.__platform === 'win32' ? s.replace(/[\\/]+$/, '').split(/[\\/]/) : s.replace(/\/+$/, '').split('/')).pop();
  };
  // Streamer mode: the page shows the made-up name the native side listed for each real one; the real ones stay in the data (they
  // are what the work is done with). `nm` for a name, `fl` for a file's short name, `T` for free text (git's sentences, a prompt).
  const mask = () => (sh && sh.d && sh.d.streamer ? sh.d.mask || {} : null);
  const disp = (s) => { const m = mask(); return m ? (m[s] ?? '…') : s; };
  const nm = (s) => h(disp(s));
  const fl = (f) => (mask() ? disp(f) : leaf(f));
  const T = (s) => {
    const m = mask();
    if (!m) return String(s ?? '');
    let o = String(s ?? '');
    Object.keys(m).sort((a, b) => b.length - a.length).forEach((k) => { if (k) o = o.split(k).join(m[k]); });
    return o;
  };

  // { kind, top, anchored, host, box, d, phase: 'load' | 'form' | 'busy' | 'done', k, steps, fail, ask, into, menu, delbr, view, result, opener, ... }
  let sh = null;

  // ---------- small facts, all from what the native side read ----------
  const remote = () => sh.d.remote || null;
  const hostName = () => (remote() && remote().label) || 'the host';
  const hostNm = () => (remote() && remote().kind === 'other' ? nm(remote().host) : h(hostName()));
  const viaGh = () => !!(sh.d.ghSignedIn && remote() && (remote().kind === 'github' || remote().kind === 'ghe'));
  const browserHost = () => !!(remote() && ['github', 'ghe', 'gitlab', 'bitbucket', 'azure', 'gitea'].includes(remote().kind)) && !viaGh();
  const aiName = () => (sh.d.ai ? sh.d.ai.name : null);
  const files = () => sh.d.dirty || 0;
  const stat = () => {
    const d = sh.d;
    return `<span class="wt-stat">${pl(d.ahead, 'commit')} · ${pl(d.files, 'file')} · <span class="add">+${d.add}</span> <span class="del">−${d.del}</span> · <button class="wt-link" data-act="changes">Show changes</button></span>`;
  };
  // The chat's own title is the PR's; else the one commit's subject; else the branch in words (fix-login → Fix login).
  function suggestTitle() {
    const d = sh.d;
    // Streamer mode: no made-up title goes out as a real one; it is typed.
    if (d.streamer) return { text: '', hint: 'Type a title.' };
    if (d.title) return { text: d.title, hint: 'From the chat’s title. Change it if you like.' };
    const one = d.create && d.create.singleCommit;
    if (one) return { text: one, hint: 'From the commit. Change it if you like.' };
    const words = String(d.branch).replace(/^[^/]*\//, '').replace(/[-_]+/g, ' ').trim();
    return { text: words ? words[0].toUpperCase() + words.slice(1) : d.branch, hint: 'From the branch name. Change it if you like.' };
  }

  // ---------- pieces ----------
  function head(icon, title, sub) {
    return `<div class="wt-head"><span class="wt-ico">${icon}</span><div style="min-width:0"><h2 class="wt-t" id="wt-t">${title}</h2><p class="wt-sub" id="wt-sub">${sub}</p></div></div>`;
  }
  function steps() {
    const list = sh.steps || [];
    const bad = sh.fail && sh.fail.at != null ? sh.fail.at : null;
    return `<ol class="wt-steps" aria-live="polite">${list.map((t, i) => `<li class="${bad != null && i === bad ? 'bad' : i < sh.k ? 'done' : i === sh.k && bad == null ? 'now' : ''}"><span class="dot"></span><span>${h(T(t))}${i === sh.k && bad == null ? '…' : ''}</span></li>`).join('')}</ol>`;
  }
  const fail = () => sh.fail
    ? `<div class="wt-call bad" role="alert">${I.info}<span><b>${h(T(sh.fail.title))}</b> ${h(T(sh.fail.text || ''))}${sh.fail.git && !mask() ? `<span class="git">${h(sh.fail.git)}</span>` : ''}</span></div>` : '';
  const done = (title, lines) => `<div class="wt-done" role="status"><span class="ring">${I.check}</span><div><h3>${title}</h3>${lines.map((l) => `<p>${l}</p>`).join('')}</div></div>`;
  const busy = () => sh.phase === 'busy';
  const act = (left, cancel, primary) => `<div class="wt-act">${left || ''}${cancel}${primary}</div>`;
  const cancelBtn = (label = 'Cancel') => `<button class="wt-btn glass" data-act="close" ${busy() ? 'disabled' : ''}>${label}</button>`;
  const goBtn = (label, { off, cls = 'go', key = true, spin } = {}) => `<button class="wt-btn ${cls}" data-act="go" ${off || busy() ? 'disabled' : ''}>${busy() ? `<span class="spin"></span>${spin || ''}` : `${label}${key ? ' <span class="k">↩</span>' : ''}`}</button>`;

  // ---------- Create a pull request ----------
  function createSheet() {
    const d = sh.d, c = d.create || {}, r = remote();
    const b = busy();
    let out = head(I.pull, 'Create a pull request', `<b style="color:var(--txt2);font-weight:600">${nm(d.repo)}</b> · from ${base(d.branch)}`);
    if (sh.phase === 'done' && sh.result) {
      const x = sh.result;
      return out + done(`PR #${x.number} is open`, [x.url && !d.streamer ? `<code>${h(x.url.replace(/^https:\/\//, ''))}</code>` : '',
        c.hasWorkflows ? 'Checks are running. The button in this window shows when they’re done.' : ''].filter(Boolean))
        + act('', '<button class="wt-btn glass" data-act="close">Done</button>', `<button class="wt-btn go" data-act="openpr">${I.ext}Open on GitHub <span class="k">↩</span></button>`);
    }
    const t = sh.title ?? suggestTitle().text;
    const body = sh.body ?? c.body ?? '';
    const into = sh.into ?? (c.into && c.into[0]) ?? d.base;
    out += `<label class="wt-lab" for="wt-title">Title</label><div class="wt-field"><input class="wt-in" id="wt-title" value="${h(t)}" ${b ? 'disabled' : ''} spellcheck="true" autocomplete="off"></div>
      <p class="wt-hint">${h(suggestTitle().hint)}</p>
      <div class="wt-group"><label class="wt-lab" for="wt-body">Description</label><textarea class="wt-area" id="wt-body" ${b ? 'disabled' : ''}>${h(body)}</textarea></div>
      <div class="wt-line"><span class="wt-lab">Into</span><span class="wt-popwrap"><button class="wt-pop" id="wt-into" aria-haspopup="listbox" aria-expanded="${!!sh.menu}" ${b ? 'disabled' : ''} title="The branch the PR goes into">${I.br.replace('class="i-br"', 'class="i-br br" style="width:.8rem;height:.8rem;color:var(--accent-soft)"')}<span>${nm(into)}</span>${I.chev}</button>${sh.menu ? intoMenu(into) : ''}</span>${stat()}</div>`;
    if (c.intoNote && into === (c.into || [])[0] && !(c.into || []).includes(d.base)) out += `<p class="wt-hint">${h(T(c.intoNote))}</p>`;
    if (b) {
      out += steps();
    } else if (sh.fail) {
      out += steps() + fail();
    } else {
      const notes = [];
      // Everything not committed goes in with `add -A`: the page says which files, and warns about the ones that look like secrets.
      const left = (c.leftovers || []);
      const names = (arr, max = 6) => arr.slice(0, max).map((x) => `<code>${nm(x.path)}</code>`).join(' ') + (arr.length > max ? ` <span class="sm">and ${arr.length - max} more</span>` : '');
      if (files()) notes.push(`<p class="wt-note">${I.commit}<span><b>${pl(files(), 'changed file')}</b> ${files() === 1 ? 'isn’t' : 'aren’t'} committed yet. ${files() === 1 ? 'It’s' : 'They’re'} committed first, with the title as the message.${left.length ? `<span class="wt-lfiles">${names(left)}</span>` : ''}</span></p>`);
      const secret = left.filter((x) => x.secret);
      if (secret.length) notes.push(`<p class="wt-note warn">${I.warn}<span><b>${secret.length === 1 ? 'This file looks' : 'These files look'} like ${secret.length === 1 ? 'a secret' : 'secrets'}.</b> ${secret.length === 1 ? 'It goes' : 'They go'} in the commit and to ${h(hostName())}.<span class="wt-lfiles">${names(secret, 4)}</span> Add ${secret.length === 1 ? 'it' : 'them'} to .gitignore first if that isn’t what you want.</span></p>`);
      const rn = r ? r.name : 'origin';
      const pushed = d.upstream && d.unpushed === 0 && !files();
      const lead = pushed ? `<b>${nm(d.branch)}</b> is already on <b>${nm(rn)}</b>, ` : `Pushes <b>${nm(d.branch)}</b> to <b>${nm(rn)}</b>, `;
      let tail;
      if (viaGh()) tail = d.streamer || !d.ghUser ? 'then GitHub CLI opens the PR.' : `then GitHub CLI opens the PR as <b>@${h(d.ghUser)}</b>.`;
      else if (r && r.kind === 'github' || r && r.kind === 'ghe') tail = `then opens <b>GitHub</b> in your browser with all of this filled in. <span class="sm">${d.ghInstalled ? 'GitHub CLI isn’t signed in (gh auth login).' : 'Install GitHub CLI (gh) to create it from here.'}</span>`;
      else if (r && r.kind === 'gitlab') tail = 'then opens <b>GitLab</b> in your browser with all of this filled in.';
      else if (browserHost()) tail = `then opens <b>${hostNm()}</b> in your browser. Paste the title there.`;
      else tail = null;
      if (tail) notes.push(`<p class="wt-note">${I.push}<span>${lead}${tail}</span></p>`);
      else notes.push(`<p class="wt-note">${I.push}<span>${pushed ? `<b>${nm(d.branch)}</b> is already on <b>${nm(rn)}</b>` : `Pushes <b>${nm(d.branch)}</b> to <b>${nm(rn)}</b>`}${!r ? ' (the remote)' : r.host ? ` (${nm(r.host)})` : ''}. Open the pull request there yourself.</span></p>`);
      out += `<div class="wt-notes">${notes.join('')}</div>`;
    }
    const big = (c.leftovers || []).filter((x) => x.big);
    if (big.length && !b) out += `<div class="wt-call bad" role="alert">${I.info}<span><b>${nm(big[0].path)} is ${Math.round(big[0].size / 1048576)} MB.</b> Files over 50 MB don’t go in a pull request. Move it out of the folder or add it to .gitignore, then look again.</span></div>`;
    const label = sh.fail ? 'Try again' : viaGh() ? 'Create PR' : browserHost() ? `Push and open ${hostName()}` : 'Push branch';
    return out + `<div class="wt-act">${b ? '' : `<span class="keys"><kbd>${MOD}↩</kbd> from the description</span>`}${cancelBtn()}${goBtn(label, { off: big.length > 0, spin: viaGh() ? 'Creating…' : 'Pushing…' })}</div>`;
  }
  function intoMenu(cur) {
    const items = (sh.d.create && sh.d.create.into) || [sh.d.base];
    return `<div class="wt-menu" role="listbox" aria-label="Into">${items.map((n, i) => `<button type="button" role="option" aria-selected="${n === cur}" data-into="${i}" class="${n === cur ? 'on' : ''}">${I.br.replace('class="i-br"', 'class="i-br br"')}<span>${nm(n)}</span></button>`).join('')}</div>`;
  }
  function createSteps() {
    const s = [];
    if (files()) s.push(`Committing ${pl(files(), 'file')}`);
    s.push(`Pushing ${sh.d.branch} to ${remote() ? remote().name : 'origin'}`);
    if (viaGh()) s.push('Creating the pull request');
    else if (browserHost()) s.push(`Opening ${hostName()}`);
    return s;
  }

  // ---------- Merge into develop (here, no PR) ----------
  function mergeSheet() {
    const d = sh.d, m = d.merge || {};
    const b = busy();
    const there = d.baseFolder ? leaf(d.baseFolder) : d.repo;
    let out = head(I.merge, `Merge into ${nm(d.base)}`, `<b style="color:var(--txt2);font-weight:600">${nm(d.repo)}</b> · ${base(d.branch)} → ${base(d.base)}`);
    if (sh.phase === 'done' && sh.result) {
      const n = sh.result.commits;
      return out + done(`${nm(d.branch)} is in ${nm(d.base)}`, [`${nm(d.base)} has ${pl(n, 'new commit')} here. ${d.remote ? (sh.pushed ? `${nm(d.base)} is pushed.` : `It isn’t pushed yet: <button class="wt-link" data-act="pushdev">Push ${nm(d.base)}</button>`) : `It stays on ${HERE}.`}`])
        + act('', '<button class="wt-btn glass" data-act="close">Done</button>', `<button class="wt-btn go" data-act="todelete">Delete worktree… <span class="k">↩</span></button>`);
    }
    const commits = (m.commits || []).slice(0, 5);
    const more = Math.max(0, (m.commits || []).length - 5);
    out += `<div class="wt-line" style="margin-top:0"><span class="wt-lab">What goes in</span>${stat()}</div>
      <ul class="wt-commits">${commits.map((c) => `<li><span>${nm(c.subject)}</span><code>${h(c.hash)}</code></li>`).join('')}${more ? `<li class="more"><span>and ${more} more</span></li>` : ''}${files() ? `<li class="new"><span>${pl(files(), 'file')} not committed yet</span><code>new</code></li>` : ''}</ul>`;
    if (files()) {
      const msg = sh.message ?? (sh.d.title || suggestTitle().text);
      out += `<div class="wt-group"><label class="wt-lab" for="wt-msg">Commit message for the ${pl(files(), 'file')}</label><div class="wt-field"><input class="wt-in" id="wt-msg" value="${h(msg)}" ${b ? 'disabled' : ''} autocomplete="off"></div></div>`;
    }
    if (b) {
      return out + steps() + act('', cancelBtn(), goBtn('Merge', { spin: 'Merging…' }));
    }
    const conflicts = sh.conflicts || m.conflicts || [];
    if (conflicts.length) return out + conflictBox(conflicts, d.base, `Merge ${nm(d.base)} into this branch and fix the conflicts in ${h(list(conflicts.map(fl), 6))}, then commit.`, 'merge');
    let block = '';
    let off = false;
    if (m.problem && m.problem !== 'nobase') { block = `<div class="wt-call bad" role="alert">${I.info}<span><b>Git couldn’t check this merge.</b> Nothing was changed.<span class="git">${h(T(m.problem))}</span></span></div>`; off = true; }
    else if (m.problem === 'nobase') { block = `<div class="wt-call bad" role="alert">${I.info}<span><b>${nm(d.base)} isn’t here.</b> There’s no branch to merge into on ${HERE}.</span></div>`; off = true; }
    else if (m.inMiddle) { block = `<div class="wt-call bad" role="alert">${I.info}<span><b>${nm(there)} is in the middle of a merge.</b> Finish it there first.</span></div>`; off = true; }
    else if ((m.blocked || []).length) {
      block = `<div class="wt-call bad" role="alert">${I.info}<span><b>${nm(there)} has unsaved changes in ${h(list(m.blocked.map(fl), 3))} that the merge would change.</b> Commit them first (Source Control), then try again.</span></div>`;
      off = true;
    }
    if (sh.fail) block = fail() + block;
    out += block;
    if (!off) {
      const warn = (d.baseLive || []).length ? `<p class="wt-note warn">${I.warn}<span><b>${h(list(d.baseLive, 3))} ${d.baseLive.length > 1 ? 'are' : 'is'} working in ${nm(there)}.</b> The merge changes ${pl(m.changed || 0, 'file')} there too.</span></p>` : '';
      out += `<div class="wt-notes"><p class="wt-note">${mark('ok')}<span><b>No conflicts.</b> ${nm(d.base)} gets ${nm(d.branch)}’s ${pl(m.newCommits || d.ahead, 'commit')}.</span></p>${warn}
        <p class="wt-note">${I.info}<span>Nothing is pushed: ${nm(d.base)} stays on ${HERE} until you push it.</span></p></div>`;
    }
    const left = off && (m.blocked || []).length ? '<button class="wt-btn glass left" data-act="scm">Open Source Control</button>' : '';
    return out + act(left, cancelBtn(), goBtn(sh.fail ? 'Try again' : 'Merge', { off, spin: 'Merging…' }));
  }
  function mergeSteps() {
    const s = [];
    if (files()) s.push(`Committing ${pl(files(), 'file')}`);
    s.push(`Merging ${sh.d.branch} into ${sh.d.base}`);
    return s;
  }

  // The red box for a conflict, and what happens next (Ask the AI, or copy the words).
  function conflictBox(files, into, prompt, scope) {
    const ai = aiName();
    const what = files.length ? `${nm(into)} changed the same lines in ${pl(files.length, 'file')}.` : `${nm(into)} changed the same lines.`;
    const rn = remote() ? remote().name : 'origin';
    const where = files.length ? ` and fix the conflicts in ${list(files, 6)}` : ' and fix the conflicts';
    sh.prompt = scope === 'prmerge'
      ? `Bring this branch up to date with ${into} on ${rn} (git fetch ${rn} ${into}, then git merge ${rn}/${into})${where}. Keep what both sides meant, commit the merge and push.`
      : `Merge ${into} into this branch (git merge ${into})${where}. Keep what both sides meant, then commit the merge.`;
    const words = scope === 'prmerge' ? `Merge ${nm(into)} into this branch, fix the conflicts, commit and push.` : prompt;
    const err = sh.ask ? `<div class="wt-call bad" role="alert">${I.info}<span><b>${h(sh.ask)}</b> Nothing was typed. Copy the instructions and paste them into the chat.</span></div>` : '';
    return `<div class="wt-call bad" role="alert">${I.info}<span><b>${what}</b> ${scope === 'prmerge' ? '' : 'Git can’t put them together by itself. Nothing was changed.'}<span class="wt-files">${files.slice(0, 6).map((f) => `<code>${nm(f)}</code>`).join('')}${files.length > 6 ? `<span class="sm">and ${files.length - 6} more</span>` : ''}</span></span></div>
      <div class="wt-notes">${ai
        ? `<p class="wt-note">${I.chat}<span><b>${h(ai)}</b> in ${nm(sh.d.branch)} gets: “${h(T(words))}” ${scope === 'prmerge' ? 'The PR updates by itself.' : 'Then merge again.'}</span></p>`
        : `<p class="wt-note">${I.chat}<span>No AI chat is open in ${nm(sh.d.branch)}. Paste this into one: “${h(T(sh.prompt))}”</span></p>`}</div>${err}
      <div class="wt-act">${scope === 'prmerge' ? `<button class="wt-btn glass left" data-act="openpr">${I.ext}Open on GitHub</button>` : '<button class="wt-btn glass left" data-act="copy">Copy instructions</button>'}${cancelBtn()}${ai
        ? `<button class="wt-btn go" data-act="ask">Ask ${h(ai)} to fix <span class="k">↩</span></button>`
        : '<button class="wt-btn go" data-act="copy">Copy instructions <span class="k">↩</span></button>'}</div>`;
  }

  // ---------- Merge PR (on GitHub) ----------
  function prMergeSheet() {
    const d = sh.d, pr = d.pr;
    const b = busy();
    if (!pr) return head(I.merge, 'Merge PR', '') + `<div class="wt-call bad" role="alert">${I.info}<span><b>There’s no open pull request.</b> Look again in a moment.</span></div>${act('', cancelBtn('Close'), '')}`;
    let out = head(I.merge, `Merge PR #${pr.number}`, `${nm(pr.title || d.title)} · into ${base(pr.base || d.base)}`);
    if (sh.phase === 'done' && sh.result) {
      return out + done(sh.result.queued ? `PR #${pr.number} is in the merge queue` : `PR #${pr.number} is merged`, [sh.result.queued ? 'GitHub merges it when its checks pass.' : `${nm(pr.base || d.base)} on GitHub has ${nm(d.branch)}’s work. Pull ${nm(pr.base || d.base)} here when you want it.`])
        + act('', '<button class="wt-btn glass" data-act="close">Done</button>', `<button class="wt-btn go" data-act="todelete">Delete worktree… <span class="k">↩</span></button>`);
    }
    const ck = pr.checks || { kind: 'none', passed: [], failed: [], running: [] };
    const pm = d.prmerge || {};
    const ai = aiName();
    let checks;
    if (ck.kind === 'fail') checks = `${mark('bad')}<span>${ck.failed.length} failed: <b style="color:var(--hi);font-weight:600">${h(list(ck.failed, 2))}</b></span>${ck.passed.length ? `<span class="sm">· ${ck.passed.length} passed ·</span>` : ''}${ai ? `<button class="wt-link" data-act="askcheck">Ask ${h(ai)} to fix it</button>` : ''}`;
    else if (ck.kind === 'run') checks = `${mark('run')}<span>${ck.running.length} running</span>${ck.passed.length ? `<span class="sm">· ${ck.passed.length} passed</span>` : ''}`;
    else if (ck.kind === 'pass') checks = `${mark('ok')}<span>${ck.passed.length} passed</span><span class="sm">${h(list(ck.passed, 3))}</span>`;
    else checks = `${mark('none')}<span>No checks</span>`;
    const rv = pr.review;
    const review = rv === 'APPROVED' ? `${mark('ok')}<span>Approved${pr.reviewBy && !d.streamer ? ` by ${h(pr.reviewBy)}` : ''}</span>`
      : rv === 'CHANGES_REQUESTED' ? `${mark('bad')}<span>Changes requested${pr.reviewBy && !d.streamer ? ` by ${h(pr.reviewBy)}` : ''}</span>`
      : rv === 'REVIEW_REQUIRED' ? `${mark('none')}<span>No review yet</span><span class="sm">· needed before merging</span>`
      : `${mark('none')}<span>No review yet</span><span class="sm">· not required here</span>`;
    const conflict = pr.mergeable === 'CONFLICTING';
    const conflicts = pr.mergeable === 'CONFLICTING' ? `${mark('bad')}<span>${nm(pr.base || d.base)} changed the same lines</span>`
      : pr.mergeable === 'MERGEABLE' ? `${mark('ok')}<span>None</span>` : `${mark('run')}<span>GitHub is still checking</span>`;
    out += `<dl class="wt-rows"><dt>Checks</dt><dd>${checks}</dd><dt>Review</dt><dd>${review}</dd><dt>Conflicts</dt><dd>${conflicts}</dd></dl>`;
    if (b) return out + steps() + act('', cancelBtn(), goBtn('Merge PR', { spin: 'Merging…' }));
    if (sh.fail) out += fail();
    if (conflict) {
      return out + conflictBox(pm.conflicts || [], pr.base || d.base, '', 'prmerge');
    }
    const how = pm.method === 'squash' ? `Merges on GitHub, squashing it into one commit. ${nm(pr.base || d.base)} here catches up when you pull.`
      : pm.method === 'rebase' ? `Merges on GitHub, putting its commits on top of ${nm(pr.base || d.base)}. ${nm(pr.base || d.base)} here catches up when you pull.`
      : `Merges on GitHub with a merge commit, like the Merge button there. ${nm(pr.base || d.base)} here catches up when you pull.`;
    out += `<div class="wt-notes">${ck.kind === 'fail' ? `<p class="wt-note warn">${I.warn}<span><b>A check failed.</b> Merge only if you know it’s fine; GitHub may still say no.</span></p>` : ''}
      <p class="wt-note">${I.info}<span>${how}</span></p></div>`;
    return out + `<div class="wt-act"><button class="wt-btn glass left" data-act="openpr">${I.ext}Open on GitHub</button>${cancelBtn()}${goBtn(sh.fail ? 'Try again' : 'Merge PR', { spin: 'Merging…' })}</div>`;
  }

  // ---------- Delete worktree ----------
  function deleteState() {
    const d = sh.d, del = d.delete || {};
    const live = d.live || [];
    const working = live.find((x) => x.inApp && x.working);
    const outside = live.find((x) => !x.inApp);
    const chats = live.filter((x) => x.kind === 'chat' && x.inApp);
    const terms = live.filter((x) => x.kind === 'terminal').length;
    const loses = !del.safe && sh.delbr;
    const only = del.onlyHere || 0;
    return { del, live, working, outside, chats, terms, loses, only, locked: d.locked };
  }
  function deleteSheet() {
    const d = sh.d;
    const st = deleteState();
    const b = busy();
    const why = d.pr && d.pr.state === 'MERGED' ? `PR #${d.pr.number} merged` : st.del.safeReason === 'base' ? `merged into ${nm(d.base)}` : st.del.safe ? 'on origin' : 'not merged';
    let out = head(I.trash, `Delete the ${nm(d.branch)} worktree?`, `<b style="color:var(--txt2);font-weight:600">${nm(d.folder)}</b> · ${why}`);
    const notes = [];
    notes.push(`<p class="wt-note">${I.trash}<span>${d.gone ? 'The folder is already gone.' : `The folder goes to the <b>${TRASH}</b>. You can put it back from there.`}</span></p>`);
    if (!d.gone && d.dirty) notes.push(`<p class="wt-note warn">${I.warn}<span><b>${pl(d.dirty, 'file')} ${d.dirty === 1 ? 'isn’t' : 'aren’t'} committed.</b> ${d.dirty === 1 ? 'It goes' : 'They go'} to the ${TRASH} with the folder.</span></p>`);
    if (st.del.safe && !d.detached) {
      const r = st.del.safeReason === 'pr' ? `PR #${d.pr ? d.pr.number : ''} is merged, so nothing is lost.` : st.del.safeReason === 'base' ? `its work is in ${nm(d.base)}.` : 'it’s on origin, so nothing is lost.';
      notes.push(`<p class="wt-note">${I.br}<span>Branch <b>${nm(d.branch)}</b> is deleted too: ${r}</span></p>`);
    }
    if (st.live.length && !st.working && !st.outside) {
      const parts = [];
      st.chats.forEach((c) => parts.push(`<b>${h(c.name)}</b>`));
      if (st.terms) parts.push(`<b>${pl(st.terms, 'terminal')}</b>`);
      const who = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
      notes.push(`<p class="wt-note">${I.chat}<span>${who} ${parts.length > 1 || st.terms > 1 ? 'are' : 'is'} open in ${nm(d.branch)}. ${parts.length > 1 || st.terms > 1 ? 'They end' : 'It ends'} first; the chat stays in your chats list.</span></p>`);
    }
    out += `<div class="wt-notes" style="margin-top:0;padding-top:0;border-top:0">${notes.join('')}</div>`;
    if (!st.del.safe && !d.detached) {
      out += `<div class="wt-group"><label class="wt-box"><input type="checkbox" id="wt-delbr" ${sh.delbr ? 'checked' : ''} ${b ? 'disabled' : ''}><span><b>Delete branch ${nm(d.branch)} too</b><span class="sm">${sh.delbr ? '' : `Off: the branch stays, so its ${pl(st.only, 'commit')} ${st.only === 1 ? 'is' : 'are'} safe. You can make a worktree from it again.`}</span></span></label></div>`;
      if (st.loses) out += `<div class="wt-call bad" role="alert">${I.warn}<span><b>${pl(st.only, 'commit')} ${st.only === 1 ? 'is' : 'are'} only on ${nm(d.branch)}.</b> ${st.only === 1 ? 'It isn’t' : 'They aren’t'} in ${nm(d.base)} or on GitHub. Deleting the branch loses ${st.only === 1 ? 'it' : 'them'} for good.</span></div>`;
    }
    let blocked = false;
    if (st.working) { out += `<div class="wt-call bad" role="alert">${I.info}<span><b>${h(st.working.name)} is working in ${nm(d.branch)} right now.</b> Wait until it’s done, or end it yourself first.</span></div>`; blocked = true; }
    else if (st.outside) { out += `<div class="wt-call bad" role="alert">${I.info}<span><b>A ${h(st.outside.name)} chat outside Orbiterm ${st.outside.working ? 'is working' : 'is open'} in ${nm(d.branch)}.</b> End it there first.</span></div>`; blocked = true; }
    if (st.del.orphans > 0) { out += `<div class="wt-call bad" role="alert">${I.warn}<span><b>${pl(st.del.orphans, 'commit')} ${st.del.orphans === 1 ? 'is' : 'are'} only on a detached HEAD.</b> Deleting the worktree loses ${st.del.orphans === 1 ? 'it' : 'them'} for good. Save ${st.del.orphans === 1 ? 'it' : 'them'} first: <code>git branch &lt;name&gt; ${h(st.del.orphanSha || 'HEAD')}</code></span></div>`; blocked = true; }
    if ((st.del.nested || []).length) { out += `<div class="wt-call bad" role="alert">${I.info}<span><b>Another worktree is inside this one.</b> <code>${nm(st.del.nested[0])}</code> goes to the ${TRASH} with it. Delete or move it first.</span></div>`; blocked = true; }
    if (st.locked) { out += `<div class="wt-call bad" role="alert">${I.info}<span><b>Git has ${nm(d.branch)} locked.</b> Unlock it first: <code>git worktree unlock ${nm(d.top)}</code></span></div>`; blocked = true; }
    if (sh.fail) out += steps() + fail();
    else if (b) out += steps();
    if (b) return out + act('', cancelBtn(), goBtn('Delete', { spin: 'Deleting…' }));
    const label = st.live.length ? 'End chats and delete' : 'Delete';
    const left = st.working ? `<button class="wt-btn glass left" data-act="showchat">Show ${h(st.working.name)}</button>` : '';
    return out + act(left, cancelBtn(), `<button class="wt-btn ${st.loses ? 'danger' : 'go'}" data-act="go" ${blocked ? 'disabled' : ''}>${sh.fail ? 'Try again' : label}${st.loses || blocked ? '' : ' <span class="k">↩</span>'}</button>`);
  }
  function deleteSteps() {
    const st = deleteState(), d = sh.d, s = [];
    if (st.live.length) {
      const parts = [];
      if (st.chats.length) parts.push(st.chats.length === 1 ? st.chats[0].name : `${st.chats.length} chats`);
      if (st.terms) parts.push(pl(st.terms, 'terminal'));
      s.push(`Ending ${parts.join(' and ')}`);
    }
    if (!d.gone) s.push(`Moving the folder to the ${TRASH}`);
    if (sh.delbr || (st.del.safe && !d.detached)) s.push(`Deleting branch ${d.branch}`);
    return s;
  }

  // ---------- the sheet ----------
  function sheet() {
    if (sh.phase === 'load') return head(I.pull, 'One moment', '') + '<div class="wt-act"></div>';
    return { create: createSheet, merge: mergeSheet, prmerge: prMergeSheet, delete: deleteSheet }[sh.view || sh.kind]();
  }

  // focus: 'first' (the title, the message or the main button), 'keep' (what had it), 'go' (the main button)
  function render(focus = 'keep') {
    if (!sh) return;
    const box = sh.box;
    const had = document.activeElement && box.contains(document.activeElement) ? document.activeElement : null;
    const key = had ? (had.id || had.dataset.act || '') : '';
    const caret = had && had.selectionStart != null ? [had.selectionStart, had.selectionEnd] : null;
    // What was typed stays when the page is drawn again.
    const t = box.querySelector('#wt-title'), bd = box.querySelector('#wt-body'), mg = box.querySelector('#wt-msg');
    if (t) sh.title = t.value;
    if (bd) sh.body = bd.value;
    if (mg) sh.message = mg.value;
    box.querySelector('.wt-card')?.remove();
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="wt-card"><div class="wt-bar"></div>${sh.anchored ? '' : '<div class="pk-border"></div>'}${sheet()}</div>`;
    box.appendChild(wrap.firstChild);
    box.classList.toggle('busy', busy());
    wire();
    let el = null;
    if (focus === 'first') el = box.querySelector('#wt-title') || box.querySelector('#wt-msg') || box.querySelector('.wt-btn.go:not(:disabled)') || box.querySelector('[data-act="close"]');
    else if (focus === 'go') el = box.querySelector('.wt-btn.go:not(:disabled)') || box.querySelector('[data-act="close"]');
    else if (key) el = box.querySelector(`[id="${key}"]`) || box.querySelector(`[data-act="${key}"]`);
    if (el && !el.disabled) {
      el.focus();
      if (focus === 'first' && el.id === 'wt-title') el.select();
      else if (caret && el.setSelectionRange) try { el.setSelectionRange(caret[0], caret[1]); } catch (e) {}
    }
    const sc = box.querySelector('.wt-card');
    if (sc && sh.scroll) sc.scrollTop = sh.scroll;
  }

  function wire() {
    const box = sh.box;
    box.querySelectorAll('[data-act]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); act2(b.dataset.act); }));
    const into = box.querySelector('#wt-into');
    if (into) into.onclick = (e) => { e.stopPropagation(); sh.menu = !sh.menu; render(); const on = box.querySelector('.wt-menu .on') || box.querySelector('.wt-menu button'); on && on.focus(); };
    box.querySelectorAll('[data-into]').forEach((b) => (b.onclick = (e) => {
      e.stopPropagation();
      sh.into = sh.d.create.into[Number(b.dataset.into)];
      sh.menu = false;
      render();
      box.querySelector('#wt-into')?.focus();
    }));
    const delbr = box.querySelector('#wt-delbr');
    if (delbr) delbr.onchange = () => { sh.delbr = delbr.checked; render(); };
    const card = box.querySelector('.wt-card');
    if (card) card.onscroll = () => { sh.scroll = card.scrollTop; };
    box.onclick = () => { if (sh.menu) { sh.menu = false; render(); } };
  }

  // ---------- doing ----------
  async function call(p) {
    try { return await p; } catch (e) { return { kind: 'git', title: 'The app didn’t answer.', text: '' }; }
  }

  function begin(stepList) {
    sh.phase = 'busy';
    sh.steps = stepList;
    sh.k = 0;
    sh.fail = null;
    sh.ask = null;
    render('go');
  }

  // The native side names each step as it starts; the page's list is in the same order, with the steps that don't apply left out.
  function shipStep(name) {
    if (!sh || sh.phase !== 'busy') return;
    const names = sh.stepNames || [];
    const i = names.indexOf(name);
    if (i < 0) return;
    sh.k = i;
    const old = sh.box.querySelector('.wt-steps');
    if (!old) return render();
    const fresh = document.createElement('div');
    fresh.innerHTML = steps();
    old.innerHTML = fresh.firstChild.innerHTML;
  }

  function failed(r, defaults) {
    sh.phase = 'form';
    const at = sh.stepNames ? Math.min(sh.k, sh.stepNames.length - 1) : null;
    sh.fail = { title: r.title || defaults.title, text: r.text ?? defaults.text ?? '', git: r.git || '', at };
    render('go');
  }

  async function doCreate() {
    const d = sh.d;
    const title = (sh.box.querySelector('#wt-title')?.value ?? sh.title ?? '').trim();
    if (!title) { sh.box.querySelector('#wt-title')?.focus(); return; }
    sh.title = title;
    sh.body = sh.box.querySelector('#wt-body')?.value ?? sh.body;
    sh.stepNames = [files() ? 'commit' : null, 'push', viaGh() ? 'pr' : browserHost() ? 'pr' : null].filter(Boolean);
    begin(createSteps());
    const s = sh;
    const r = await call(API.shipCreatePR(d.top, title, sh.body ?? '', sh.into ?? (d.create.into || [d.base])[0]));
    if (sh !== s) return;
    if (r && r.ok) {
      if (r.url) { sh.phase = 'done'; sh.result = r; render('go'); return; }
      close();
      note(r.browser ? `pushed ${disp(d.branch)} · ${hostName()} opens in the browser, the form filled in` : `${disp(d.branch)} is on ${remote() ? disp(remote().name) : 'the remote'}. Open the pull request there.`);
      return;
    }
    failed(r || {}, { title: 'Something went wrong.', text: '' });
  }

  async function doMerge() {
    const d = sh.d;
    const msg = (sh.box.querySelector('#wt-msg')?.value ?? sh.message ?? '').trim();
    if (files() && !msg) { sh.box.querySelector('#wt-msg')?.focus(); return; }
    sh.message = msg;
    sh.stepNames = [files() ? 'commit' : null, 'merge'].filter(Boolean);
    begin(mergeSteps());
    const s = sh;
    const r = await call(API.shipMerge(d.top, msg));
    if (sh !== s) return;
    if (r && r.ok) { sh.phase = 'done'; sh.result = r; render('go'); return; }
    if (r && r.kind === 'conflict') { sh.phase = 'form'; sh.conflicts = r.conflicts; render('go'); return; }
    if (r && (r.kind === 'blocked' || r.kind === 'middle')) {
      sh.phase = 'form';
      sh.d.merge = Object.assign({}, sh.d.merge, r.kind === 'blocked' ? { blocked: r.blocked } : { inMiddle: true });
      render('go');
      return;
    }
    failed(r || {}, { title: 'Git couldn’t merge.', text: 'Nothing was changed.' });
  }

  async function doPrMerge() {
    const d = sh.d, pr = d.pr;
    sh.stepNames = ['merge'];
    begin([`Merging PR #${pr.number} on GitHub`]);
    sh.stepNames = ['merge'];
    const s = sh;
    const r = await call(API.shipMergePR(d.top, pr.number, pr.headSha || '', (d.prmerge || {}).method || 'merge'));
    if (sh !== s) return;
    if (r && r.ok) { sh.phase = 'done'; sh.result = r; render('go'); return; }
    failed(r || {}, { title: 'GitHub didn’t merge the PR.', text: '' });
  }

  async function doDelete() {
    const d = sh.d;
    const st = deleteState();
    sh.stepNames = [st.live.length ? 'end' : null, d.gone ? null : 'trash', sh.delbr || (st.del.safe && !d.detached) ? 'branch' : null].filter(Boolean);
    begin(deleteSteps());
    const s = sh;
    const r = await call(API.shipDelete(d.top, !!(sh.delbr || (st.del.safe && !d.detached)), !!st.loses, (d.live || []).map((x) => x.id), d.localSha || ''));
    if (sh !== s) return;
    if (r && r.ok) {
      close();
      if (r.branchKept && r.branchError) note(`${disp(d.branch)} is deleted, but git kept its branch: ${T(r.branchError)}`);
      return;
    }
    // What the sheet showed is old (a chat came up, a commit was made): look again, then decide.
    if (r && r.kind === 'changed') {
      await switchTo('delete');
      if (sh === s) { sh.fail = { title: r.title, text: r.text, git: '' }; render('keep'); }
      return;
    }
    failed(r || {}, { title: 'Git couldn’t delete the worktree.', text: '' });
  }

  async function ask(prompt) {
    sh.ask = null;
    const r = await call(API.shipAsk(prompt, sh.d.ai ? sh.d.ai.sid : ''));
    if (!sh) return;
    if (r && r.ok) { close(); return; }
    sh.ask = (r && (r.error || r.title)) || 'Couldn’t send it.';
    render('keep');
  }

  async function switchTo(kind) {
    const keep = sh;
    keep.phase = 'load';
    render();
    const d = await call(API.shipInfo(keep.top, kind));
    if (sh !== keep) return;
    if (!d || d.error) { close(); return note((d && d.error) || 'Couldn’t read the worktree.'); }
    Object.assign(keep, { kind, view: null, d, phase: 'form', fail: null, result: null, conflicts: null, ask: null, delbr: false, menu: false, title: null, body: null, message: null, into: null, k: 0 });
    render('first');
  }

  function act2(a) {
    if (!sh || busy()) return;
    const d = sh.d;
    if (a === 'close') close();
    else if (a === 'go') {
      const k = sh.kind;
      if (sh.fail && sh.phase === 'form') sh.fail = null;
      if (k === 'create') doCreate();
      else if (k === 'merge') doMerge();
      else if (k === 'prmerge') doPrMerge();
      else if (k === 'delete') doDelete();
    } else if (a === 'changes') API.shipShowChanges(d.top);
    else if (a === 'scm') API.shipShowChanges(d.baseFolder || d.top);
    else if (a === 'openpr') {
      const u = (sh.result && sh.result.url) || (d.pr && d.pr.url);
      if (u) API.shipOpenURL(d.top, u);
      else note('Open the pull request on the host’s page.');
    } else if (a === 'todelete') switchTo('delete');
    else if (a === 'pushdev') {
      API.shipPushBase(d.top).then((r) => {
        if (!sh) return;
        if (r && r.ok) { sh.pushed = true; render('keep'); } else note((r && (r.title || r.error)) || 'Git couldn’t push.');
      }, () => note('The app didn’t answer.'));
    } else if (a === 'copy') {
      API.shipCopy(sh.prompt || '');
      note('instructions copied');
    } else if (a === 'ask') ask(sh.prompt);
    else if (a === 'askcheck') {
      const ck = (d.pr && d.pr.checks) || { failed: [] };
      const name = ck.failed[0] || 'failing';
      ask(`The ${name} check failed on PR #${d.pr.number}. Read its log (gh pr checks ${d.pr.number}, then gh run view <id> --log-failed), fix the cause, commit and push.`);
    } else if (a === 'showchat') {
      const w = deleteState().working;
      if (w) API.shipShowChat(w.id);
    }
  }

  // ---------- opening and closing ----------
  async function open(opts) {
    if (sh) { const old = sh; sh = null; old.host.remove(); }
    const { kind, top, anchored } = opts;
    sh = { kind, top, anchored: !!anchored, phase: 'load', d: { top }, k: 0, opener: document.activeElement };
    document.querySelectorAll('.wt-host').forEach((n) => n.remove());
    if (anchored) {
      const host = document.createElement('div');
      host.className = 'wt-host';
      host.innerHTML = '<div class="wt-veil2"></div><div class="wt wt-anchor ship" role="dialog" aria-modal="true" aria-labelledby="wt-t" aria-describedby="wt-sub"></div>';
      host.onmousedown = (e) => { if (!e.target.closest('.wt') && !busy()) close(); };
      document.body.appendChild(host);
      sh.host = host;
      sh.box = host.querySelector('.wt');
    } else {
      const wrap = document.createElement('div');
      wrap.className = 'wt-alone on';
      wrap.innerHTML = '<div class="wt ship" role="dialog" aria-modal="true" aria-labelledby="wt-t" aria-describedby="wt-sub"></div>';
      wrap.onmousedown = (e) => { if (e.target === wrap && !busy()) close(); };
      document.body.appendChild(wrap);
      sh.host = wrap;
      sh.box = wrap.firstChild;
    }
    render();
    const mine = sh;
    const d = await call(API.shipInfo(top, kind));
    if (sh !== mine) return;
    if (!d || d.error) { close(); return note((d && d.error) || 'Couldn’t read the worktree.'); }
    sh.d = d;
    sh.phase = 'form';
    render('first');
  }

  function close() {
    if (!sh) return;
    const s = sh;
    sh = null;
    s.host.remove();
    API.done();
  }

  // ---------- keys ----------
  addEventListener('keydown', (e) => {
    if (!sh || e.isComposing) return;
    const k = e.key;
    if (k === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (sh.menu) { sh.menu = false; render(); sh.box.querySelector('#wt-into')?.focus(); return; }
      if (!busy()) close();
      return;
    }
    if (sh.menu && (k === 'ArrowDown' || k === 'ArrowUp')) {
      e.preventDefault();
      const items = [...sh.box.querySelectorAll('.wt-menu button')];
      const i = items.indexOf(document.activeElement);
      items[(i + (k === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus();
      return;
    }
    if (k === 'Enter') {
      const a = document.activeElement;
      if (sh.phase === 'load' || busy()) { e.preventDefault(); return; }
      // A button of the sheet presses itself; ↩ elsewhere does the sheet's main thing.
      if (a && a.tagName === 'BUTTON' && !a.classList.contains('go')) return;
      if (a && a.tagName === 'TEXTAREA' && !(e.metaKey || e.ctrlKey)) return;
      if (a && a.type === 'checkbox') { e.preventDefault(); return; }
      e.preventDefault();
      e.stopPropagation();
      if (sh.phase === 'done') return act2(sh.kind === 'create' ? 'openpr' : 'todelete');
      const go = sh.box.querySelector('.wt-btn.go');
      // A red main button (the branch would be lost) is never pressed by ↩: nobody reads before they press it.
      if (go && !go.disabled && !go.classList.contains('danger')) go.click();
      return;
    }
    if (k === 'Tab') {
      const items = [...sh.box.querySelectorAll('input:not(:disabled), textarea:not(:disabled), button:not(:disabled):not([tabindex="-1"])')].filter((n) => !n.closest('.wt-menu'));
      if (!items.length) { e.preventDefault(); return; }
      const i = items.indexOf(document.activeElement);
      const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i === items.length - 1 ? 0 : i + 1);
      e.preventDefault();
      items[next].focus();
    }
  }, true);

  // The name sheet's own "busy" (Overlay.fresh) also covers a sheet at work: a second request can't replace it.
  const W = window.Worktree || {};
  const wasBusy = W.isBusy;
  window.Worktree = Object.assign(W, {
    ship: open,
    shipStep,
    shipClose: close,
    isBusy: () => !!((wasBusy && wasBusy()) || (sh && busy())),
    isShipOpen: () => !!sh,
  });
})();
