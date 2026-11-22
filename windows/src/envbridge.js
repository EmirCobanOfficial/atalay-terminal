'use strict';
// The env button's line from a terminal window's page (pages/env.js) to its folder's env files (envfiles.js): the Mac's
// EnvModel file side (EnvView.swift) over IPC. The page names a file only by its path below the terminal's folder and
// gets back lines to show; envfiles.js checks the path again on every read and write. What a file holds goes to the page
// of the window it was asked from and to the clipboard when the user copies, nowhere else: never logged, never in an
// error's text, never given to the AI tools (the env view is a page of its own, not the terminal's text).
const envFiles = require('./envfiles');

const MAX = envFiles.MAX_SIZE;

// Why a read or write didn't happen, in the Mac's words (EnvModel.words); never what the file holds.
const WORDS = {
  notAllowed: 'This file isn’t one the env view may open.',
  notText: 'It isn’t a text file.',
  tooBig: 'It’s over 1 MB.',
  readOnly: 'This file is read-only.',
  hardLinked: 'This file is hard-linked; open it from its own folder to edit.',
  conflict: 'It changed on disk.',
  busy: 'Another program has the file open. Close it there, then save again.',
  denied: 'Windows doesn’t let this account change the file (its permissions).',
  failed: 'The file couldn’t be read or written.',
};
const fail = (e) => {
  const code = e && WORDS[e.code] ? e.code : 'failed';
  return { error: code, words: WORDS[code] };
};

// What the page sends is never cut short to fit: a field or a list too long to be part of a 1 MB file is refused
// (tooBig), as the whole file is.
const str = (v) => (typeof v === 'string' ? v : '');
const relOf = (v) => (typeof v === 'string' && v.length <= 1024 ? v : '');
const tooBig = () => new envFiles.EnvError('tooBig');
/** A line as the page sends it back: only the fields a line has, of their types. */
function cleanLine(l) {
  l = l && typeof l === 'object' ? l : {};
  if ([l.raw, l.key, l.value, l.trailing].some((v) => typeof v === 'string' && v.length > MAX)) throw tooBig();
  return {
    kind: ['blank', 'comment', 'pair', 'other'].includes(l.kind) ? l.kind : 'other',
    raw: str(l.raw),
    key: str(l.key),
    value: str(l.value),
    enabled: l.enabled !== false,
    export: l.export === true,
    quote: l.quote === '"' || l.quote === "'" ? l.quote : null,
    sep: typeof l.sep === 'string' && /^[ \t]*[=:][ \t]*$/.test(l.sep) ? l.sep : '=',
    trailing: str(l.trailing),
    eol: l.eol === '\r\n' || l.eol === '\n' ? l.eol : '',
    changed: l.changed === true,
  };
}
/** The text the page's lines make, as the Mac's EnvModel.text: a variable added and left empty is dropped. Throws tooBig
 *  for more lines than a 1 MB file can have, or a field longer than one. */
function textOf(q) {
  const all = Array.isArray(q.lines) ? q.lines : [];
  if (all.length > MAX + 1) throw tooBig();
  const lines = all.map(cleanLine).filter((l) => !(l.kind === 'pair' && !l.key && !l.value && !l.raw));
  return { lines, text: envFiles.textOf(lines, q.crlf === true, q.finalNewline !== false) };
}

/**
 * `chatOf(event)`: the terminal window an IPC came from, [id, chat] (main.js); `rootOf([id, chat])`: the folder its env
 * view looks at (main.js's termCwd: where its shell is now, else where it started); `streamer`: the dashboard's streamer
 * mode (made-up folder names); `tildify`: a path as the strip shows it; `native` (envnative.js): the copy kept out of
 * Clipboard History and the save that keeps a file's permissions, `clipboard` the plain copy when it can't.
 */
function createEnvBridge({ ipcMain, chatOf, clipboard, streamer, tildify, home, rootOf, native = null }) {
  const rootFor = rootOf || ((found) => found[1].cwd || home);
  // The folder each page's view lists, fixed then (by the page's webContents): its reads, writes and looks at the disk use
  // that one, wherever the shell has gone since. A page that hasn't listed has none, and is refused.
  const roots = new WeakMap();
  const shownFolder = (folder) => (streamer.on && folder ? folder.split('/').map((p) => streamer.fake('project', p)).join('/') : folder);
  const shownWhere = (root) => (streamer.on ? streamer.folder(root) : tildify(root));
  ipcMain.handle('term:env', async (e, q) => {
    const found = chatOf(e);
    const page = e && e.sender;
    if (!found || !q || typeof q !== 'object' || !page || typeof page !== 'object') throw new Error('refused');
    const c = found[1];
    const root = roots.get(page);
    switch (q.type) {
      // The env files under the terminal's folder, its subprojects' too, grouped and ordered (EnvFiles.discover).
      case 'list': {
        const at = rootFor(found);
        roots.set(page, at);
        // The helper is built while the user looks, so the first copy or save doesn't wait for it.
        if (native) native.prepare();
        const l = await envFiles.discover(at);
        return {
          files: l.files.map((f) => ({ ...f, shownFolder: shownFolder(f.folder) })),
          truncated: l.truncated,
          where: shownWhere(at),
        };
      }
      // The folder names as the strip and the list show them now (streamer mode switched since the list).
      case 'shown': {
        if (!root) return null;
        const folders = Array.isArray(q.folders) ? q.folders.slice(0, 1000).map(str) : [];
        return { folders: folders.map(shownFolder), where: shownWhere(root) };
      }
      // A file's lines; comments and other lines that look like they hold a value are marked to be masked too.
      case 'read': {
        if (!root) return fail({ code: 'notAllowed' });
        try {
          return await envFiles.read(relOf(q.rel), root);
        } catch (err) {
          return fail(err);
        }
      }
      // Saves: every enabled variable needs a valid name; `base` is the mtime it was read at (null overwrites).
      case 'write': {
        if (!root) return fail({ code: 'notAllowed' });
        let made;
        try {
          made = textOf(q);
        } catch (err) {
          return fail(err);
        }
        const bad = made.lines.find((l) => l.kind === 'pair' && !envFiles.isKey(l.key));
        if (bad) return { error: 'badKey', words: bad.key ? `“${bad.key.slice(0, 80)}” isn’t a valid name (letters, digits, _, . and -).` : 'A variable has no name.' };
        try {
          return { mtime: await envFiles.write(made.text, q.bom === true, relOf(q.rel), root, typeof q.base === 'number' ? q.base : null, native) };
        } catch (err) {
          return fail(err);
        }
      }
      // When the file last changed (the page's 1.5 s look), null when it's gone.
      case 'modified':
        return root ? envFiles.modified(relOf(q.rel), root) : null;
      // Whether the page holds changes not saved (main.js asks it before a terminal ends or the app quits).
      case 'dirty':
        c.envDirty = q.on === true;
        return true;
      // To the clipboard, plain text: one value, a line, or the whole file as it would be saved (Copy all); kept out of
      // Clipboard History and the cloud clipboard when the helper can, else an ordinary copy.
      case 'copy': {
        let text;
        try {
          text = q.lines ? textOf(q).text : str(q.text);
        } catch (err) {
          return fail(err);
        }
        if (text.length > 2 * MAX) return fail(tooBig());
        if (native && (await native.copy(text))) return true;
        clipboard.writeText(text);
        return true;
      }
      default:
        throw new Error('unknown request');
    }
  });
}

module.exports = { createEnvBridge };
