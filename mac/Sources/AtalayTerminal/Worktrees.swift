import Foundation

/// Where a folder sits in a git repo's worktrees, read from files only (no git process): the chats list, the dashboard's
/// cards and the folder picker ask for it often.
struct WorktreeInfo {
    /// The main repo's folder (a plain repo's own).
    let main: String
    /// The root of the working copy the folder is in: `main` itself, or a linked worktree's folder.
    let top: String
    /// The branch checked out there, or the first 7 characters of the commit when it isn't on one.
    let branch: String
    /// The folder's path inside `top` ("" at the root, "mac", "mac/Resources", …).
    let sub: String
    /// A worktree made with `git worktree add` (its `.git` is a file that points into the main repo's), not the repo itself.
    let linked: Bool

    var json: [String: Any] {
        ["main": cwdLabel(main), "top": cwdLabel(top), "branch": branch, "sub": sub]
    }
}

enum Worktrees {
    private static let lock = NSLock()
    private static var cache: [String: (info: WorktreeInfo?, at: Double)] = [:]

    // MARK: recognising a worktree

    /// What `cwd` is, by its `.git`: a repo, a linked worktree (of a repo or of a bare one), or neither (nil: a submodule is a
    /// repo of its own, and a folder under the home folder's own repo isn't in one). Only a few file reads, kept 30 seconds.
    static func info(of cwd: String) -> WorktreeInfo? {
        guard cwd.hasPrefix("/") else { return nil }
        let now = nowMs()
        lock.lock()
        let hit = cache[cwd]
        lock.unlock()
        if let hit, now - hit.at < 30_000 { return hit.info }
        let found = read(cwd)
        lock.lock()
        if cache.count > 2000 { cache.removeAll() }
        cache[cwd] = (found, now)
        lock.unlock()
        return found
    }

    /// Forgets what was read (a worktree was just made or removed).
    static func forget() {
        lock.lock()
        cache.removeAll()
        lock.unlock()
    }

    private static func read(_ cwd: String) -> WorktreeInfo? {
        let fm = FileManager.default
        // Through links: a repo reached by a symlink is the same repo (one card in the chats list).
        var dir = real(cwd)
        let cwd = dir
        while dir != "/", dir != HOME, !dir.isEmpty {
            let git = dir + "/.git"
            var isDir: ObjCBool = false
            if fm.fileExists(atPath: git, isDirectory: &isDir) {
                let sub = relative(cwd, to: dir)
                if isDir.boolValue {
                    return WorktreeInfo(main: dir, top: dir, branch: branch(head: git + "/HEAD"), sub: sub, linked: false)
                }
                guard let text = try? String(contentsOfFile: git, encoding: .utf8),
                      let r = text.range(of: "gitdir:") else { return nil }
                var gitdir = text[r.upperBound...].split(separator: "\n").first.map { $0.trimmingCharacters(in: .whitespaces) } ?? ""
                if !gitdir.hasPrefix("/") { gitdir = ((dir as NSString).appendingPathComponent(gitdir) as NSString).standardizingPath }
                // A submodule's: a repo of its own.
                if isSubmoduleGitdir(gitdir) {
                    return WorktreeInfo(main: dir, top: dir, branch: branch(head: gitdir + "/HEAD"), sub: sub, linked: false)
                }
                let head = branch(head: gitdir + "/HEAD")
                if let w = gitdir.range(of: "/.git/worktrees/") {
                    return WorktreeInfo(main: String(gitdir[..<w.lowerBound]), top: dir, branch: head, sub: sub, linked: true)
                }
                // A worktree of a bare repo: its folder is in `commondir` (relative to the worktree's own git folder).
                if let common = try? String(contentsOfFile: gitdir + "/commondir", encoding: .utf8) {
                    let c = common.trimmingCharacters(in: .whitespacesAndNewlines)
                    let resolved = ((c.hasPrefix("/") ? c : (gitdir as NSString).appendingPathComponent(c)) as NSString).standardizingPath
                    let main = resolved.hasSuffix("/.git") ? String(resolved.dropLast(5)) : resolved
                    return WorktreeInfo(main: main, top: dir, branch: head, sub: sub, linked: true)
                }
                return WorktreeInfo(main: dir, top: dir, branch: head, sub: sub, linked: false)
            }
            dir = (dir as NSString).deletingLastPathComponent
        }
        return nil
    }

    /// A submodule's git folder: `.git/modules/<name>`, also inside a worktree's own (`.git/worktrees/<wt>/modules/<name>`).
    private static func isSubmoduleGitdir(_ gitdir: String) -> Bool {
        guard let r = gitdir.range(of: "/.git/", options: .backwards) else { return gitdir.contains("/modules/") }
        let tail = gitdir[r.upperBound...]
        return tail.hasPrefix("modules/") || tail.contains("/modules/")
    }

    /// The path with links resolved (as given when it doesn't exist).
    static func real(_ p: String) -> String {
        realpath(p) ?? (p as NSString).standardizingPath
    }

    /// `ref: refs/heads/<branch>` in a HEAD file gives the branch; else (a commit) its first 7 characters.
    private static func branch(head path: String) -> String {
        guard let text = try? String(contentsOfFile: path, encoding: .utf8) else { return "" }
        let line = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if line.hasPrefix("ref: refs/heads/") { return String(line.dropFirst(16)) }
        return String(line.prefix(7))
    }

    private static func relative(_ path: String, to top: String) -> String {
        let p = (path as NSString).standardizingPath
        guard p.hasPrefix(top + "/") else { return "" }
        return String(p.dropFirst(top.count + 1))
    }

    /// Whether `dir`'s own `.git` is a linked worktree's file (the folder picker's badge), not a submodule's.
    static func isLinkedRoot(_ dir: String) -> Bool {
        let git = dir + "/.git"
        var isDir: ObjCBool = false
        guard FileManager.default.fileExists(atPath: git, isDirectory: &isDir), !isDir.boolValue,
              let text = try? String(contentsOfFile: git, encoding: .utf8), text.contains("gitdir:") else { return false }
        if let r = text.range(of: "gitdir:"), isSubmoduleGitdir(String(text[r.upperBound...])) { return false }
        return text.contains("/.git/worktrees/") || text.contains("/worktrees/")
    }

    // MARK: names

    /// Where the worktree named `name` of the repo `main` goes: next to it, `<repo>-<name>` (a "/" in the name becomes "-").
    static func folder(main: String, name: String) -> String {
        let (leaf, parent) = home(main)
        return (parent as NSString).appendingPathComponent(leaf + "-" + name.replacingOccurrences(of: "/", with: "-"))
    }

    /// The repo's name and the folder it is in. A bare repo kept as `proj/.bare` (with worktrees beside it) is `proj`.
    static func home(_ main: String) -> (leaf: String, parent: String) {
        var root = main
        if (root as NSString).lastPathComponent == ".bare" { root = (root as NSString).deletingLastPathComponent }
        return ((root as NSString).lastPathComponent, (root as NSString).deletingLastPathComponent)
    }

    /// Names from Orbiterm's space world, the first that isn't taken (as a branch or as a folder next to the repo).
    private static let stars = ["vega", "rigel", "lyra", "deneb", "altair", "sirius", "io", "europa", "titan", "callisto", "ganymede",
                                "triton", "oberon", "ariel", "miranda", "phobos", "deimos", "carina", "orion", "kepler"]

    static func suggest(branches: Set<String>, folders: Set<String>, main: String) -> String {
        let leaf = home(main).leaf
        if let s = stars.first(where: { !branches.contains($0) && !folders.contains(leaf + "-" + $0) }) { return s }
        var n = 1
        while branches.contains("work-\(n)") || folders.contains(leaf + "-work-\(n)") { n += 1 }
        return "work-\(n)"
    }

    /// What's wrong with a worktree's name, as a code ("empty", "chars", "shape"), or nil: the same rules the page checks as
    /// it's typed, and git's own `check-ref-format --branch` after it. Letters, digits and `- _ . /` only, so the name is
    /// safe as a folder name, as a git argument and on Windows.
    static func validate(_ name: String) -> String? {
        if name.isEmpty { return "empty" }
        let ok = name.unicodeScalars.allSatisfy { s in
            s.isASCII && (CharacterSet.alphanumerics.contains(s) || s == "-" || s == "_" || s == "." || s == "/")
        }
        if !ok { return "chars" }
        if name.count > 60 || name.hasPrefix("-") || name.hasPrefix(".") || name.hasPrefix("/") || name.hasSuffix("/") || name.hasSuffix(".")
            || name.contains("..") || name.contains("//") || name.contains("/.") || name == "@" || name.contains("@{") {
            return "shape"
        }
        for part in name.split(separator: "/") where part.hasSuffix(".lock") { return "shape" }
        return nil
    }

    // MARK: copying what git doesn't keep

    /// Copies `rel` (paths of the folder `src`, a directory's with a trailing "/") into `dst`: a plain file, or a whole
    /// directory as one (a clone on APFS: at once, no room used). Never over something that's there already (that is skipped,
    /// with a warning), nothing that isn't a plain file or a directory (a link in the list is skipped), and nothing outside
    /// either folder: a path with `..`, or one that goes through a link out of `src`, isn't copied.
    static func copy(_ rel: [String], from src: String, to dst: String) -> (copied: Int, warnings: [String]) {
        guard let srcReal = realpath(src), let dstReal = realpath(dst) else { return (0, ["the folders couldn't be read"]) }
        var copied = 0
        var warnings: [String] = []
        for entry in rel {
            let isDirEntry = entry.hasSuffix("/")
            let path = isDirEntry ? String(entry.dropLast()) : entry
            let parts = path.split(separator: "/", omittingEmptySubsequences: false).map(String.init)
            if path.isEmpty || path.hasPrefix("/") || parts.contains("..") || parts.contains("") || parts.contains(".git") {
                warnings.append("\(entry): not a path inside the repo")
                continue
            }
            let from = src + "/" + path, to = dst + "/" + path
            // What's there to copy: a plain file or a directory itself, not a link to one.
            var st = stat()
            guard lstat(from, &st) == 0 else { continue }
            let kind = st.st_mode & S_IFMT
            guard kind == S_IFREG || kind == S_IFDIR else {
                warnings.append("\(entry): not a plain file")
                continue
            }
            if (kind == S_IFDIR) != isDirEntry && isDirEntry { continue }
            // The way to it mustn't leave the repo through a link.
            let fromParent = (from as NSString).deletingLastPathComponent
            guard let realFromParent = realpath(fromParent), realFromParent == srcReal || realFromParent.hasPrefix(srcReal + "/") else {
                warnings.append("\(entry): outside the repo")
                continue
            }
            var existing = stat()
            if lstat(to, &existing) == 0 {
                warnings.append("\(entry): already in the worktree, left as it is")
                continue
            }
            // Its folders in the worktree, then a check that they are really inside it (a tracked link there could lead out).
            let toParent = (to as NSString).deletingLastPathComponent
            // Folder by folder, never through a link: one that is a link (a tracked one could lead out) stops the copy.
            var level = dst
            var blocked = false
            for part in parts.dropLast() {
                level += "/" + part
                var ls = stat()
                if lstat(level, &ls) == 0 {
                    if (ls.st_mode & S_IFMT) != S_IFDIR { blocked = true; break }
                } else if mkdir(level, 0o755) != 0 {
                    blocked = true
                    break
                }
            }
            if blocked {
                warnings.append("\(entry): outside the worktree")
                continue
            }
            guard let realToParent = realpath(toParent), realToParent == dstReal || realToParent.hasPrefix(dstReal + "/") else {
                warnings.append("\(entry): outside the worktree")
                continue
            }
            let flags = copyfile_flags_t(COPYFILE_ALL | COPYFILE_RECURSIVE | COPYFILE_CLONE | COPYFILE_EXCL | COPYFILE_NOFOLLOW)
            if copyfile(from, to, nil, flags) == 0 {
                copied += 1
            } else {
                let code = errno
                warnings.append("\(entry): " + (code == EACCES || code == EPERM ? "no permission to read it" : "couldn't be copied"))
            }
        }
        return (copied, warnings)
    }

    private static func realpath(_ p: String) -> String? {
        guard let r = Foundation.realpath(p, nil) else { return nil }
        defer { free(r) }
        return String(cString: r)
    }
}
