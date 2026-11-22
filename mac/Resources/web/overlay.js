'use strict';

// App overlay panel: hosts the shortcut pie and the folder picker above every window.
// Provides the small helpers those shared scripts expect from the dashboard page.
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let toastTimer = 0;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2400);
}

let doneTimer = 0;
// A new request cancels the pending delayed hide of the last one (it would hide what was just opened).
const fresh = () => {
  clearTimeout(doneTimer);
  return !window.Worktree?.isBusy();
};

window.Overlay = {
  shortcuts(x, y, how) {
    if (!fresh()) return;
    window.Shortcuts.show(x, y, how);
  },
  // opts.worktree (Chat → New Worktree…, ⌥⇧⌘N): the picker's main button is the worktree sheet's.
  newTerminal(opts) {
    if (!fresh()) return;
    window.Worktree?.close();
    const wt = !!(opts && opts.worktree);
    window.Picker.open({
      title: wt ? 'NEW WORKTREE' : 'NEW TERMINAL',
      forLabel: 'choose the folder',
      around: 'picker',
      mode: wt ? 'wt' : 'term',
      onPick: (dir, meta) => {
        API.newTerminal(dir, dir.replace(/\/+$/, '').split('/').pop(), meta && meta.told);
        API.done();
      },
      onCancel: () => API.done(),
    });
  },
  // The name sheet on its own, for the repo `dir` is in (the chats list's ⎇ and menus, the Ring's right-click).
  // opts.ai: the AI "Open with" starts on; opts.moving: the chat this was opened from ({ replacing, sid, tool, folder }); it keeps running.
  newWorktree(dir, opts) {
    if (!fresh()) return;
    window.Worktree.close();
    window.Worktree.open({
      dir,
      alone: true,
      ai: opts && opts.ai,
      moving: opts && opts.moving,
      onDone: (r) => API.worktreeOpen(r.open, r.ai, opts && opts.moving),
      onCancel: () => API.done(),
    }).then((shown) => shown || (doneTimer = setTimeout(API.done, 2500))); // the toast (worktree.js) shows first
  },
  // Create PR / Merge / Delete worktree for the worktree `opts.top` (worktree-ship.js): anchored to the window that asked, or alone.
  ship(opts) {
    if (!fresh()) return;
    window.Worktree.close();
    window.Worktree.ship(opts);
  },
};
