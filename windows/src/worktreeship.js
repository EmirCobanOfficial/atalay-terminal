'use strict';
// A worktree's next step: Create PR, Merge, Delete (araştırma/worktree-pr/SPEC.md), the Mac's WorktreeShip.swift. This
// keeps what every terminal window and the chats list show about a linked worktree (its status, read again while a
// window of it is on screen or the list shows it), decides the header button's face and its ▾ menu, gives the sheets
// (web/worktree-ship.js, in the overlay) their data and does what they ask (gitship.js does the git). Nothing here runs
// by itself: no push, merge, delete or chat ending happens without a click on a sheet's own button.
//
//   const ship = createWorktreeShip({ git, settings, streamer, openExternal, openPath, hooks });
//
// hooks (main.js): shownTops() the worktrees with a terminal window on screen; listVisible() whether the chats list
// shows; live(top) the AI chats and terminals open there ({ id, name, kind, status, inApp }); ai(top, windowId) who
// "Ask … to fix" goes to ({ name, sid, kind }); title(top, windowId) the chat's own title; endSessions(top) ends them,
// leaving their windows (true when all stopped); deleted(top, branch, sha, kept) after a delete; changed(top) the
// status changed (windows, list, menu); step(name) a sheet's progress; showSheet(kind, top, windowId); showChanges(top);
// ask(sid, text) the MCP's safe way of typing a prompt ({ ok, text }); keyLabel() the Create PR shortcut as written.

const fs = require('fs');

const DAY = 86_400_000;
const leaf = (p) => String(p || '').replace(/[\\/]+$/, '').split(/[\\/]/).pop() || String(p || '');

/**
 * A native menu item's label (the ▾ menu, the File menu, the chats list's): a dimmed one says why in the label itself,
 * "Create Pull Request…  (This repo has no remote to send it to)", as Electron shows a menu item's toolTip on the Mac
 * only. The Mac's items keep the reason in their tooltip.
 */
function menuLabel(it) {
  if (!it) return '';
  const tip = String(it.tip || '').trim().replace(/\.$/, '');
  return it.enabled || !tip ? it.title : `${it.title}  (${tip})`;
}

function createWorktreeShip({ git, settings, streamer, openExternal, openPath, hooks }) {
  const status = new Map(); // linked worktree folder -> its status (gitship.js worktreeStatus, with its PR)
  const busy = new Map(); // folder -> what is being done there ("Creating PR…"): every window of it shows it
  const gitAt = new Map(), prAt = new Map();
  const inflight = new Set(), again = new Set();
  let listTops = new Set();
  let timer = null;
  let session = null; // what the open sheet was opened for: { kind, top, windowId, title }
  let jobs = 0; // pushes, merges, deletes under way (a quit waits for them)

  // ---------- the deleted ones: folders deleted from here in the last 30 days (settings' worktreeDeleted) ----------
  const deletedMap = () => {
    const m = settings.get('worktreeDeleted');
    return m && typeof m === 'object' && !Array.isArray(m) ? m : {};
  };
  {
    const now = Date.now();
    const all = Object.entries(deletedMap());
    const kept = all.filter(([, v]) => v && now - (Number(v.at) || 0) < 30 * DAY);
    if (kept.length !== all.length) settings.set('worktreeDeleted', Object.fromEntries(kept));
  }
  // The folder a deleted one was recorded as (the worktree's own folder, as the delete saw it), or null. The chats list's
  // folder for it can be written another way: another case, or through a junction (git.same, then both resolved: the
  // folder itself is gone, so up to the nearest parent that is there). The Mac's `deleted` set is matched as written.
  function deletedKey(top) {
    if (typeof top !== 'string' || !top) return null;
    const m = deletedMap();
    if (Object.prototype.hasOwnProperty.call(m, top)) return top;
    const keys = Object.keys(m);
    if (!keys.length) return null;
    const found = keys.find((k) => git.same(k, top));
    if (found) return found;
    // A junction doesn't change the folder's own name: only those named alike are resolved.
    const name = leaf(top).toLowerCase();
    return keys.find((k) => leaf(k).toLowerCase() === name && git.same(git.realUp(k), git.realUp(top))) || null;
  }
  const isDeleted = (top) => deletedKey(top) != null;
  function unmarkDeleted(top) {
    const key = deletedKey(top);
    if (key == null) return;
    const m = { ...deletedMap() };
    delete m[key];
    settings.set('worktreeDeleted', m);
  }
  function markDeleted(top, branch, sha, kept) {
    const m = { ...deletedMap() };
    const old = deletedKey(top);
    if (old != null) delete m[old];
    settings.set('worktreeDeleted', { ...m, [top]: { branch, sha, at: Date.now() } });
    git.forget();
    git.forgetShip(top);
    hooks.deleted(top, branch, sha, kept);
    hooks.changed(top);
  }

  // ---------- keeping the status ----------

  /**
   * Windows of a worktree on screen, and the chats list's worktrees while it shows: their status is read again every 20
   * seconds (git), their pull request every minute (gh), sooner on events (a window to the front, a turn ending).
   */
  function startTimer() {
    if (timer) return;
    timer = setInterval(() => {
      const tops = new Set(hooks.shownTops());
      if (hooks.listVisible()) for (const t of listTops) tops.add(t);
      for (const t of tops) refresh(t);
    }, 20_000);
    if (timer.unref) timer.unref();
  }

  /** The chats list's worktrees now (read while it shows). */
  function watchList(tops) {
    listTops = new Set(tops);
    startTimer();
    for (const t of listTops) if (!status.has(t) && !isDeleted(t)) refresh(t);
  }

  /** Reads a folder's status (git always, the PR when due or `pr`): once at a time per folder, 3 s apart unless forced. */
  function refresh(top, { pr = false, force = false } = {}) {
    if (!top) return;
    startTimer();
    if (isDeleted(top)) {
      // A worktree made again at the same folder is a new one.
      const wi = git.info(top);
      if (!(wi && wi.linked)) return;
      unmarkDeleted(top);
    }
    const now = Date.now();
    if (!force && now - (gitAt.get(top) || 0) < 3000) return;
    if (inflight.has(top)) {
      // Something was done while a look was under way: that look is old, so it's made again when it ends.
      if (force) again.add(top);
      return;
    }
    inflight.add(top);
    gitAt.set(top, now);
    const known = status.get(top) || null;
    const state = (known && known.pr && known.pr.state) || '';
    const since = now - (prAt.get(top) || 0);
    // The pull request is asked over the network: a window to the front asks at most every 20 s, the timer every minute.
    const due = force || (pr && since >= 20_000) || since >= (['MERGED', 'CLOSED', 'STALE'].includes(state) ? 600_000 : 60_000);
    if (due) prAt.set(top, now);
    (async () => {
      let s = await git.worktreeStatus(top, known);
      if (s) {
        if (due && !s.gone) {
          const r = await git.prStatus(s);
          s.pr = r.ok ? r.pr : known && known.pr;
        } else s.pr = known && known.pr;
        s = await git.revalidate(s);
      }
      return s;
    })().catch(() => known).then((s) => {
      inflight.delete(top);
      if (again.delete(top)) refresh(top, { pr: true, force: true });
      if (!s) {
        // No longer a worktree (its folder moved, the repo is gone).
        if (status.delete(top)) hooks.changed(top);
        return;
      }
      const before = JSON.stringify(status.get(top) || null);
      status.set(top, s);
      if (JSON.stringify(s) !== before) hooks.changed(top);
    });
  }

  /** Asked for again after something was done, in every window of the worktree. */
  function changed(top) {
    git.forget();
    git.forgetShip(top);
    refresh(top, { pr: true, force: true });
  }

  // ---------- what the header and the menus say ----------

  const fakeBranch = (b) => (streamer.on ? streamer.fake('branch', b) : b);

  /** The button's main face for a status: the next step (spec 3.2). The Mac's WorktreeShip.face. */
  function face(s) {
    const b = s.branch, base = fakeBranch(s.base);
    const f = (() => {
      switch (git.phase(s)) {
        case 'gone': return { kind: 'delete', label: 'Delete worktree', icon: 'trash', tip: `The folder of ${b} is gone. Delete the worktree and its branch.`, enabled: true };
        case 'merged': return { kind: 'delete', label: 'Delete worktree', icon: 'trash', tip: `${b} is merged. Delete its folder and branch.`, enabled: true };
        case 'pr': {
          const n = (s.pr && s.pr.number) || 0;
          if (s.pr && s.pr.draft) return { kind: 'openpr', label: 'Open PR', icon: 'ext', tip: `PR #${n} is a draft. Mark it ready on GitHub first.`, enabled: true };
          return { kind: 'prmerge', label: 'Merge PR', icon: 'merge', tip: `Merge PR #${n} on GitHub`, enabled: true };
        }
        case 'work':
          if (!s.remote) return { kind: 'merge', label: `Merge into ${base}`, icon: 'merge', tip: `Merge ${b} into ${base} on this PC`, enabled: true };
          return { kind: 'create', label: 'Create PR', icon: 'pull', tip: `Send ${b}'s work as a pull request into ${base}${hooks.keyLabel() ? ` (${hooks.keyLabel()})` : ''}`, enabled: true };
        case 'detached': return { kind: 'create', label: 'Create PR', icon: 'pull', tip: "This worktree isn't on a branch right now.", enabled: false };
        default: return { kind: 'create', label: 'Create PR', icon: 'pull', tip: `Nothing to send yet: ${b} has no changes.`, enabled: false };
      }
    })();
    // Streamer mode: no real branch in a tooltip.
    return streamer.on ? { ...f, tip: '' } : f;
  }

  /** The ▾ menu's entries (spec 4.2): none hidden, the unavailable ones dimmed. The Mac's WorktreeShip.items. */
  function items(s, deleted = false) {
    const key = hooks.keyLabel();
    if (!s || deleted) {
      return [
        { id: 'create', title: 'Create Pull Request…', key, enabled: false },
        { id: 'merge', title: 'Merge into develop…', enabled: false },
        { id: 'delete', title: 'Delete Worktree…', enabled: false },
        { id: 'changes', title: 'Show Changes', enabled: false, after: true },
        { id: 'reveal', title: 'Show in Explorer', enabled: false },
      ];
    }
    const ph = git.phase(s);
    const out = [];
    if (ph === 'pr' && s.pr) {
      out.push({ id: 'prmerge', title: `Merge PR #${s.pr.number}…`, enabled: !s.pr.draft, tip: s.pr.draft ? 'Mark it ready on GitHub first.' : null });
      out.push({ id: 'openpr', title: `Open PR #${s.pr.number} on GitHub`, enabled: true });
    } else {
      out.push({ id: 'create', title: 'Create Pull Request…', key, enabled: ph === 'work' && !!s.remote,
        tip: !s.remote && ph === 'work' ? 'This repo has no remote to send it to.' : null });
    }
    out.push({ id: 'merge', title: `Merge into ${fakeBranch(s.base)}…`, enabled: ph === 'work' || ph === 'pr' });
    out.push({ id: 'delete', title: 'Delete Worktree…', enabled: true });
    out.push({ id: 'changes', title: 'Show Changes', enabled: !s.gone && ph !== 'nothing', after: true });
    out.push({ id: 'reveal', title: 'Show in Explorer', enabled: !s.gone });
    return out;
  }

  /** The chip's tooltip (spec 11; the Mac's chipTip). */
  function chipTip(s, deleted) {
    if (deleted) return 'This worktree was deleted. Its folder is in the Recycle Bin.';
    const pl = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
    switch (git.phase(s)) {
      case 'gone': return `The folder of ${s.branch} is gone.`;
      case 'merged': return `${s.branch} is merged into ${s.base}`;
      case 'nothing':
      case 'detached': return `${s.branch} has no changes yet. Made from ${s.base}.`;
      case 'pr': {
        const c = (s.pr && s.pr.checks) || { kind: 'none', passed: [], failed: [] };
        const tail = c.kind === 'run' ? ' · checks running' : c.kind === 'pass' ? ` · ${pl(c.passed.length, 'check')} passed` : c.kind === 'fail' ? ` · ${c.failed.length || 1} check failed` : '';
        return `Show ${s.branch}'s changes · PR #${(s.pr && s.pr.number) || 0} into ${s.base}${tail}`;
      }
      default:
        return `Show ${s.branch}'s changes · ${pl(s.ahead, 'commit')}${s.dirty > 0 ? `, ${pl(s.dirty, 'file')} not committed` : ''} · +${s.add} −${s.del} since ${s.base}`;
    }
  }

  /** What a screen reader says for the chip (spec 16; the Mac's chipLabel). */
  function chipLabel(s, deleted) {
    const pl = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
    if (deleted) return `${s.branch} worktree, deleted.`;
    let t = `${s.branch} worktree.`;
    const ph = git.phase(s);
    if (ph === 'work') t += ` ${pl(s.ahead, 'commit')} and ${pl(s.dirty, 'file')} not committed. ${s.add} lines added, ${s.del} removed. Show changes.`;
    else if (ph === 'pr') t += ` Pull request ${(s.pr && s.pr.number) || 0}. Show changes.`;
    else if (ph === 'merged') t += ' Merged.';
    return t;
  }

  /**
   * What a terminal window's header shows for the worktree `top` (pages/terminal.js draws it): the chip (branch and its
   * tail), the split button's face, whether a job runs. Null when there's nothing known yet. Streamer mode: a made-up
   * branch, no tooltips.
   */
  function headerView(top) {
    const key = deletedKey(top);
    const deleted = key != null;
    let s = status.get(top);
    if (!s && deleted) {
      const d = deletedMap()[key] || {};
      s = { branch: d.branch || leaf(top), base: '', gone: true, detached: false, dirty: 0, ahead: 0, add: 0, del: 0, pr: null };
    }
    if (!s) return null;
    const ph = deleted ? 'deleted' : git.phase(s);
    const pr = s.pr || null;
    let tail = null;
    if (deleted) tail = { type: 'deleted' };
    else if (ph === 'gone') tail = { type: 'gone' };
    else if (ph === 'work') tail = pr && pr.state === 'CLOSED' ? { type: 'closed', number: pr.number } : { type: 'nums', add: s.add, del: s.del };
    else if (ph === 'pr' && pr) tail = { type: 'pr', number: pr.number, draft: !!pr.draft, checks: (pr.checks && pr.checks.kind) || 'none' };
    else if (ph === 'merged') tail = { type: 'merged' };
    const on = streamer.on;
    return {
      top, branch: on ? streamer.fake('branch', s.branch) : s.branch, phase: ph, tail, deleted,
      busy: busy.get(top) || null, face: deleted ? null : face(s),
      clickable: !deleted && ph !== 'gone' && ph !== 'nothing',
      tip: on ? '' : chipTip(s, deleted), label: on ? `${streamer.fake('branch', s.branch)} worktree` : chipLabel(s, deleted),
      more: on ? 'More actions for this worktree' : `More actions for the ${s.branch} worktree`,
    };
  }

  /** The chats list's tail for a worktree's folder (spec 4.3): "+42 −7", "#48 ✓", "merged ✓", "deleted". */
  function listState(top) {
    if (isDeleted(top)) return { text: 'deleted', deleted: true };
    const s = status.get(top);
    if (!s) return null;
    const ph = git.phase(s);
    const mark = (k) => (k === 'pass' ? ' ✓' : k === 'fail' ? ' ✕' : k === 'run' ? ' ◌' : '');
    if (ph === 'gone') return { text: 'folder gone' };
    if (ph === 'merged') return { text: 'merged ✓' };
    if (ph === 'pr' && s.pr) return { text: `#${s.pr.number}${s.pr.draft ? ' draft' : mark(s.pr.checks && s.pr.checks.kind)}` };
    if (ph === 'work') return s.pr && s.pr.state === 'CLOSED' ? { text: `#${s.pr.number} closed` } : { text: `+${s.add} −${s.del}` };
    return null;
  }

  // ---------- acting ----------

  /** A button, a menu item or a key: opens the sheet, or does the one thing (open the PR, show the changes, Explorer). */
  function handle(id, top, windowId = null) {
    const s = status.get(top);
    switch (id) {
      case 'create':
      case 'merge':
      case 'prmerge':
      case 'delete':
        if (busy.has(top) || (isDeleted(top) && id !== 'delete')) return false;
        // The sheet reads fresh data when it opens; this makes the next look soon too.
        refresh(top, { pr: true, force: true });
        session = { kind: id, top, windowId, title: hooks.title(top, windowId) || '' };
        hooks.showSheet(id, top, windowId);
        return true;
      case 'openpr':
        if (s && s.pr && s.remote) open(s.pr.url, s.remote.host);
        return true;
      case 'changes':
        hooks.showChanges(top);
        return true;
      case 'reveal':
        if (fs.existsSync(top)) openPath(top);
        return true;
      default:
        return false;
    }
  }

  const clearSession = () => (session = null);

  /** A page of the remote's host (https, the host the remote names): a sheet can't point the browser anywhere else. */
  function open(raw, host) {
    let u;
    try {
      u = new URL(String(raw || ''));
    } catch {
      return false;
    }
    const h = u.hostname.toLowerCase(), want = String(host || '').toLowerCase();
    if (u.protocol !== 'https:' || !want || !(h === want || (want === 'ssh.dev.azure.com' && h === 'dev.azure.com'))) return false;
    openExternal(u.toString());
    return true;
  }

  /** Whether `top` is a linked worktree's own folder (a sheet's request can't point git at any other). */
  function knows(top) {
    if (typeof top !== 'string' || !top) return false;
    const s = status.get(top);
    if (s && s.top === top) return true;
    const wi = git.info(top);
    return !!wi && wi.linked && wi.top === top && git.real(top) === top;
  }

  // ---------- the sheet's data ----------

  /**
   * Streamer mode: the page shows made-up names (it looks each real one up in `mask`), no account and no address. The real
   * values stay in the data: the page sends them back to do the work. The chat's title is left out, so a title is typed.
   * The Mac's WorktreeShip.mask.
   */
  function mask(d) {
    const map = {};
    const add = (kind, v) => {
      if (typeof v === 'string' && v) map[v] = streamer.fake(kind, v);
    };
    const addAll = (kind, v) => Array.isArray(v) && v.forEach((x) => add(kind, x));
    for (const k of ['repo', 'main']) add('project', d[k]);
    add('branch', d.branch);
    add('branch', d.base);
    add('project', d.folder);
    if (d.top) add('project', leaf(d.top));
    if (d.baseFolder) add('project', leaf(d.baseFolder));
    for (const k of ['top', 'baseFolder']) if (typeof d[k] === 'string' && d[k]) map[d[k]] = streamer.folder(d[k]);
    addAll('file', d.dirtyFiles);
    if (d.remote) {
      add('project', d.remote.host);
      add('project', d.remote.owner);
      add('project', d.remote.repo);
      add('branch', d.remote.name);
    }
    d.title = '';
    if (d.create) {
      (d.create.commits || []).forEach((c) => add('title', c.subject));
      addAll('branch', d.create.into);
      (d.create.leftovers || []).forEach((x) => add('file', x.path));
      d.create = { ...d.create, body: '', singleCommit: '' };
    }
    if (d.merge) {
      (d.merge.commits || []).forEach((c) => add('title', c.subject));
      addAll('file', d.merge.conflicts);
      addAll('file', d.merge.blocked);
    }
    if (d.prmerge) addAll('file', d.prmerge.conflicts);
    if (d.pr) {
      add('title', d.pr.title);
      d.pr = { ...d.pr, url: '', reviewBy: '' };
    }
    delete d.ghUser;
    d.mask = map;
  }

  /** Everything a sheet shows, read fresh: the status with its PR, and the kind's own page. The Mac's page(for:top:). */
  async function page(kind, top) {
    const known = status.get(top) || null;
    const sess = session && session.top === top ? session : null;
    let s = await git.worktreeStatus(top, known);
    if (!s) return { error: "This isn't a worktree." };
    if (!s.gone) {
      const r = await git.prStatus(s);
      s.pr = r.ok ? r.pr : known && known.pr;
      s = await git.revalidate(s);
    }
    status.set(top, s);
    hooks.changed(top);
    const d = git.statusJSON(s);
    d.kind = kind;
    d.repo = git.repoName(s.main);
    d.folder = leaf(top);
    d.title = (sess && sess.title) || '';
    if (kind === 'create') d.create = await git.createPage(s);
    if (kind === 'merge') d.merge = await git.mergeCheck(s);
    if (kind === 'prmerge') d.prmerge = await git.prMergePage(s);
    if (kind === 'delete') d.delete = await git.deletePage(s);
    d.live = hooks.live(top).map((x) => ({ ...x, working: x.status === 'busy' || x.status === 'waiting' }));
    d.ai = hooks.ai(top, sess && sess.windowId) || null;
    // The AI working in the base's folder (a local merge changes files there).
    if (s.baseFolder) {
      const wi = git.info(s.baseFolder);
      if (wi) d.baseLive = hooks.live(wi.top).filter((x) => x.kind === 'chat').map((x) => x.name);
    }
    if (streamer.on) mask(d);
    d.streamer = streamer.on;
    return d;
  }

  // ---------- doing ----------

  const nothing = { kind: 'nothing', title: 'Something else is running here.' };
  // A job under way: the windows show it, a quit waits for it.
  function begin(top, what) {
    busy.set(top, what);
    jobs++;
    hooks.changed(top);
  }
  function end(top) {
    busy.delete(top);
    jobs = Math.max(0, jobs - 1);
    hooks.changed(top);
  }

  async function createPR(top, title, body, into) {
    const s = status.get(top);
    if (busy.has(top) || !s || !s.remote) return nothing;
    const host = s.remote.host;
    begin(top, 'Creating PR…');
    try {
      const r = await git.createPR(top, title, body, into, hooks.step);
      if (r.browser) open(r.browser, host);
      return r;
    } finally {
      end(top);
      changed(top);
    }
  }

  async function mergeLocal(top, message) {
    if (busy.has(top)) return nothing;
    begin(top, 'Merging…');
    try {
      return await git.mergeLocal(top, message, hooks.step);
    } finally {
      end(top);
      changed(top);
    }
  }

  async function mergePR(top, number, sha, method) {
    if (busy.has(top)) return nothing;
    begin(top, 'Merging…');
    try {
      return await git.mergePR(top, number, sha, method);
    } finally {
      end(top);
      changed(top);
    }
  }

  const pushBase = (top) => git.pushBase(top);

  /**
   * Delete (spec 9.2): the blockers again, then the chats and terminals open here end (only those the sheet named, and
   * never while an AI works), then the folder goes to the Recycle Bin, git forgets it, and the branch goes when asked.
   */
  async function remove(top, { deleteBranch, force, ids, sha }) {
    if (busy.has(top)) return nothing;
    const live = hooks.live(top);
    // The sheet said which chats end; one that came up since wasn't agreed to.
    const want = new Set((Array.isArray(ids) ? ids : []).map(String));
    if (live.length !== want.size || live.some((x) => !want.has(x.id))) return { kind: 'changed', title: 'Something opened or closed in this worktree.', text: 'Look again, then decide.' };
    const working = live.find((x) => x.status === 'busy' || x.status === 'waiting');
    if (working) return { kind: 'working', title: `${working.name} is working in this worktree right now.`, text: "Wait until it's done, or end it yourself first." };
    const outside = live.find((x) => !x.inApp);
    if (outside) return { kind: 'outside', title: `A ${outside.name} chat outside Orbiterm is open in this worktree.`, text: 'End it there first.' };
    begin(top, 'Deleting…');
    const known = status.get(top) || null;
    let ok = false;
    try {
      // Before any chat ends: what the worktree holds is looked at again, so nothing ends for a delete that won't happen.
      const stop = await git.deleteCheck(top, { deleteBranch, force, expect: sha, known });
      if (stop) return stop;
      if (live.length) {
        hooks.step('end');
        if (!(await hooks.endSessions(top))) return { kind: 'end', title: `${live[0].name} didn't stop.`, text: 'Try again in a moment.' };
      }
      const r = await git.deleteWorktree(top, { deleteBranch, force, expect: sha, known }, hooks.step);
      if (r.ok) {
        ok = true;
        status.delete(top);
        markDeleted(top, r.branch || '', r.sha || '', r.branchKept !== false);
      }
      return r;
    } finally {
      end(top);
      if (!ok) changed(top);
    }
  }

  /** "Ask <AI> to fix": typed into that chat the safe way (idle, in front, input empty, permissions not bypassed). */
  async function ask(prompt, sid) {
    const r = await hooks.ask(String(sid || ''), String(prompt || ''));
    return r && r.ok ? { ok: true } : { error: (r && r.text) || "Couldn't send it." };
  }

  return {
    refresh, changed, watchList, handle, clearSession, open, knows, page, items, headerView, listState,
    createPR, mergeLocal, mergePR, pushBase, remove, ask,
    status: (top) => status.get(top) || null,
    isDeleted,
    isBusy: (top) => busy.has(top),
    /** Whether any job is under way (a quit waits for it). */
    running: () => jobs > 0,
    busyLabel: () => [...busy.values()][0] || null,
  };
}

module.exports = { createWorktreeShip, menuLabel };
