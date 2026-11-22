'use strict';
// The projects notes are linked to (web/notes.js `project`: { dir, name }), found from folders, never from what an AI says:
// the Mac's NotesProjects (NotesTools.swift) and Git.projectDir, Git.broad, Git.projectName and Git.covers (Git.swift).
// A project is a folder: a repo's main folder (every worktree of a repo, and every folder inside one, is the same project), a
// bare repo's own folder when its worktrees hang off it, or a plain folder when there is no git. No git process runs: the
// `.git` entries are read as ledger.js's repoRoot reads them (a few file checks per folder), and the search never climbs into
// the home folder or a drive's root (the Mac asks git with GIT_CEILING_DIRECTORIES=$HOME).
const fs = require('fs');
const os = require('os');
const path = require('path');

const WIN = process.platform === 'win32';
const HOME = path.resolve(os.homedir());
// Paths are compared as Windows compares them: any case, either slash.
const key = (p) => {
  const r = path.resolve(String(p));
  return WIN ? r.toLowerCase() : r;
};
const same = (a, b) => key(a) === key(b);

// `p` is `outer` or inside it.
function within(p, outer) {
  const a = key(p);
  const b = key(outer);
  if (a === b) return true;
  return a.startsWith(b.endsWith(path.sep) ? b : b + path.sep);
}

const isDir = (p) => {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
};

// The home folder as typed and as it really is (a junctioned or symlinked profile: sessions' folders are real paths).
const homes = (() => {
  const l = [HOME];
  try {
    const r = path.resolve(fs.realpathSync.native(HOME));
    if (!same(r, HOME)) l.push(r);
  } catch {}
  return l;
})();

/** A folder too broad to be a project (the Mac's Git.broad): a drive's root, the home folder or a folder above it, and a
 *  folder straight in the home folder (Documents, Desktop…). */
function broad(folder) {
  if (typeof folder !== 'string' || !folder) return true;
  const dir = path.resolve(folder);
  if (path.parse(dir).root === dir) return true;
  return homes.some((h) => same(h, dir) || within(h, dir) || same(path.dirname(dir), h));
}

/** A project's name (the Mac's Git.projectName): its folder's, or the parent's when that starts with a dot (.bare, a git
 *  folder kept apart). */
function projectName(dir) {
  const r = path.resolve(dir);
  const n = path.basename(r);
  if (!n.startsWith('.')) return n || r;
  const up = path.basename(path.dirname(r));
  return up || n;
}

// The repo a `.git` file points to: "gitdir: <path>", relative to the folder it is in when not absolute.
function gitdirOf(file, dir) {
  try {
    const m = /gitdir:\s*(.+)/.exec(fs.readFileSync(file, 'utf8'));
    return m ? path.resolve(dir, m[1].trim()) : null;
  } catch {
    return null;
  }
}

// A worktree's git folder names its repo's common folder in `commondir` ("../.." from .git/worktrees/<name>); a submodule's
// has none (its git folder is its own).
function commonOf(gitdir) {
  try {
    const rel = fs.readFileSync(path.join(gitdir, 'commondir'), 'utf8').trim();
    if (rel) return path.resolve(gitdir, rel);
  } catch {}
  return gitdir;
}

// Folder -> its project's folder, asked again after half a minute (an AI lists notes often).
const roots = new Map();

/** The project a folder belongs to (the Mac's Git.projectDir): the repo's main folder, found through the repo's common git
 *  folder, so every worktree of a repo and every folder inside one is the same project; a bare repo with worktrees is its own
 *  folder; a submodule is a project of its own; a folder that is no git repo is its own project. */
function projectDir(folder) {
  const dir = path.resolve(String(folder || ''));
  const now = Date.now();
  const hit = roots.get(key(dir));
  if (hit && now - hit.at < 30_000) return hit.dir;
  let found = dir;
  if (isDir(dir)) {
    let at = dir;
    while (!homes.some((h) => same(h, at)) && path.dirname(at) !== at) {
      const git = path.join(at, '.git');
      let st = null;
      try {
        st = fs.statSync(git);
      } catch {}
      if (st) {
        if (st.isDirectory()) found = at;
        else {
          const gitdir = gitdirOf(git, at);
          const common = gitdir ? commonOf(gitdir) : null;
          const parts = common ? common.replace(/\\/g, '/').toLowerCase() : '';
          if (!common) found = at;
          else if (path.basename(common).toLowerCase() === '.git') found = path.dirname(common);
          // A submodule's own git folder: the folder git says the work tree is in (where its .git file is).
          else if (parts.includes('/.git/modules/')) found = at;
          // A bare repo (repo.git, .bare) with worktrees: the bare folder itself, so every worktree is one project.
          else found = common;
        }
        break;
      }
      at = path.dirname(at);
    }
  }
  if (roots.size > 300) roots.clear();
  roots.set(key(dir), { dir: found, at: now });
  return found;
}

/** Whether a session in `folder` (whose project's folder is `root`) is in the project a note was linked to (`project`), the
 *  Mac's Git.covers: the project's own folder, or any folder inside it. An umbrella session (a folder holding several repos)
 *  also sees the notes of the projects inside it, but only when the user tied a note to that very folder (`tied`: every folder
 *  notes are linked to), and never for a broad folder. */
function covers(project, folder, root, tied) {
  if (!project || !folder || !root) return false;
  if (within(root, project) || within(folder, project)) return true;
  const isTied = [...(tied || [])].some((d) => typeof d === 'string' && d && same(d, root));
  return !broad(root) && isTied && within(project, root);
}

/** Where a session is (the Mac's NotesProjects.place): its folder and its project's folder; null with no folder. */
function place(folder) {
  if (typeof folder !== 'string' || !folder) return null;
  return { folder: path.resolve(folder), root: projectDir(folder) };
}

/** The projects the board's "move to project" offers (the Mac's NotesProjects.choices): those of the folders the live terminals
 *  are in (`folders`), broad folders left out, each once; and which of `known` (the folders notes are linked to) are gone. */
function choices(known, folders) {
  const seen = new Set();
  const list = [];
  for (const folder of folders || []) {
    if (typeof folder !== 'string' || !folder) continue;
    const dir = projectDir(folder);
    if (broad(dir) || seen.has(key(dir))) continue;
    seen.add(key(dir));
    list.push({ dir, name: projectName(dir) });
  }
  const gone = (Array.isArray(known) ? known : []).filter((d) => typeof d === 'string' && d.length < 1024).slice(0, 200).filter((d) => !isDir(d));
  return { list, gone };
}

module.exports = { projectDir, projectName, broad, covers, place, choices };
