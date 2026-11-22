'use strict';

// Data access for the shortcut menu and folder picker, in the app's overlay panel: Swift answers through the
// "overlay" message handler (with replies).
window.API = (() => {
  const native = (type, payload) => window.webkit.messageHandlers.overlay.postMessage(Object.assign({ type }, payload || {}));
  return {
    listDir: (p) => native('listDir', { path: p }),
    places: () => native('places'),
    // set: undefined for the pie's slices, 'picker' for the places around the new-terminal folder picker.
    getSlots: (set) => native('getSlots', { set }),
    saveSlots: (slots, set) => native('saveSlots', { slots, set }),
    // told: the picker's bottom bar already said who works in that folder (no note in the new chat later).
    newTerminal: (dir, name, told) => native('newTerminal', { dir, name, told: !!told }),
    done: () => native('done'),
    // New worktree (Mac only: the Windows app answers null to these, and the pages then don't offer it). gitInfo reads files:
    // { repo, worktree, branch } for a folder; worktreeInfo is git's answer for the name sheet; worktreeCreate makes the
    // worktree and copies the files (the native side pushes Worktree.step as it goes); worktreeOpen starts the AI in it.
    gitInfo: (path) => native('gitInfo', { path }),
    worktreeInfo: (dir) => native('worktreeInfo', { dir }),
    worktreeCreate: (dir, name, ai) => native('worktreeCreate', { dir, name, ai }),
    // moving: { replacing, sid } when the sheet was opened from a chat's note (the app then marks that chat's strip "Opened in …"; nothing is closed).
    worktreeOpen: (path, ai, moving) => native('worktreeOpen', { path, ai, replacing: moving && moving.replacing, sid: moving && moving.sid }),
    revealFolder: (path) => native('revealFolder', { path }),
    // Create PR, Merge, Delete worktree (worktree-ship.js): the sheet's data, and each thing it does; the native side checks the folder is a
    // worktree it knows, and reports each step with Worktree.shipStep.
    shipInfo: (top, kind) => native('shipInfo', { top, kind }),
    shipCreatePR: (top, title, body, into) => native('shipCreatePR', { top, title, body, into }),
    shipMerge: (top, message) => native('shipMerge', { top, message }),
    shipMergePR: (top, number, sha, method) => native('shipMergePR', { top, number, sha, method }),
    shipPushBase: (top) => native('shipPushBase', { top }),
    // force: the user chose to lose the branch's commits; ids: the chats the page said would end (a new one isn't agreed to).
    // sha: the branch's commit the page showed; the native side refuses when it moved.
    shipDelete: (top, deleteBranch, force, ids, sha) => native('shipDelete', { top, deleteBranch, force: !!force, ids: ids || [], sha: sha || '' }),
    shipAsk: (prompt, sid) => native('shipAsk', { prompt, sid }),
    shipCopy: (text) => native('shipCopy', { text }),
    shipOpenURL: (top, url) => native('shipOpenURL', { top, url }),
    shipShowChanges: (top) => native('shipShowChanges', { top }),
    shipShowChat: (sid) => native('shipShowChat', { sid }),
  };
})();
