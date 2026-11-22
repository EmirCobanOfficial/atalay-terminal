import AppKit
import WebKit

/// A Claude session as Source Control needs it: where it works and how it's doing.
struct GitSession {
    let id, name, title, status: String
    let live: Bool
    let cwd: String
}

/// Source Control (web/git.js), as in VS Code. Its repos are the ones today's Claude sessions work in (their folder, or
/// a file they wrote) and the ones the app's terminals are in; for each, what changed, the diffs and the history, and
/// from the page: stage, unstage, discard, commit, push and pull. Git runs off the main thread, and the page reaches
/// only those repos and only files inside them.
final class GitBridge: NSObject, WKScriptMessageHandlerWithReply {
    private let engine: RadarEngine
    /// The folders the app's terminals are in now.
    private let terminalFolders: @MainActor () -> [String]
    /// The user picked an item in one of the page's native menus: a click the page never sees (FilesBridge.pressed).
    var onMenuPick: (@MainActor () -> Void)?

    init(engine: RadarEngine, terminalFolders: @escaping @MainActor () -> [String]) {
        self.engine = engine
        self.terminalFolders = terminalFolders
    }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        let body = message.body as? [String: Any] ?? [:]
        if MainActor.assumeIsolated({ Self.native(body, message.webView, onMenuPick, replyHandler) }) { return }
        let terminals = MainActor.assumeIsolated { terminalFolders() }
        engine.gitSources { sessions, written in
            Git.queue.async {
                let answer = Git.answer(body, Git.Sources(sessions: sessions, written: written, terminals: terminals))
                DispatchQueue.main.async { MainActor.assumeIsolated { replyHandler(answer, nil) } }
            }
        }
    }
}

extension GitBridge {
    /// The page's questions and menus, native as VS Code's are on a Mac: an alert over the dashboard ("confirm": message,
    /// detail, buttons; Cancel is added) or a menu at the pointer ("menu": items, "" for a line, x and y in the page).
    /// Answers the index of the button or item picked, -1 for none. `onMenuPick`: told when a menu's item was picked.
    @MainActor
    fileprivate static func native(_ body: [String: Any], _ web: WKWebView?, _ onMenuPick: (@MainActor () -> Void)?,
                                   _ reply: @escaping @MainActor @Sendable (Any?, String?) -> Void) -> Bool {
        switch body["type"] as? String {
        case "confirm":
            let alert = NSAlert()
            alert.alertStyle = .warning
            alert.messageText = body["message"] as? String ?? ""
            alert.informativeText = body["detail"] as? String ?? ""
            let buttons = body["buttons"] as? [String] ?? []
            buttons.forEach { alert.addButton(withTitle: $0) }
            alert.addButton(withTitle: "Cancel")
            let done = { (r: NSApplication.ModalResponse) in
                let i = r.rawValue - NSApplication.ModalResponse.alertFirstButtonReturn.rawValue
                reply(i >= 0 && i < buttons.count ? i : -1, nil)
            }
            if let window = web?.window {
                alert.beginSheetModal(for: window) { r in MainActor.assumeIsolated { done(r) } }
            } else {
                done(alert.runModal())
            }
            return true
        case "menu":
            let menu = NSMenu()
            let picked = MenuPick()
            for (i, title) in (body["items"] as? [String] ?? []).enumerated() {
                if title.isEmpty {
                    menu.addItem(.separator())
                    continue
                }
                let item = NSMenuItem(title: title, action: #selector(MenuPick.pick(_:)), keyEquivalent: "")
                item.target = picked
                item.tag = i
                menu.addItem(item)
            }
            let x = (body["x"] as? NSNumber)?.doubleValue ?? 0, y = (body["y"] as? NSNumber)?.doubleValue ?? 0
            DispatchQueue.main.async {
                MainActor.assumeIsolated {
                    if let web { menu.popUp(positioning: nil, at: NSPoint(x: x, y: web.isFlipped ? y : web.bounds.height - y), in: web) }
                    if picked.index >= 0 { onMenuPick?() }
                    reply(picked.index, nil)
                }
            }
            return true
        default:
            return false
        }
    }
}

/// The item a native menu's user picked.
private final class MenuPick: NSObject {
    var index = -1
    @objc func pick(_ item: NSMenuItem) { index = item.tag }
}

enum Git {
    struct Sources {
        let sessions: [GitSession]
        /// Files written today, with the sessions that wrote each.
        let written: [String: [String]]
        let terminals: [String]
    }

    static let queue = DispatchQueue(label: "atalay.git", qos: .userInitiated, attributes: .concurrent)
    private static let lock = NSLock()
    /// Folder -> the repo it's in, asked again after a minute.
    private static var roots: [String: (root: String?, at: Double)] = [:]
    /// The page asks every few seconds; the repos are looked at again after two.
    private static var cache: (at: Double, repos: [[String: Any]]) = (0, [])
    /// Folder -> the settings its reads run with (readGuards), asked again after ten seconds.
    private static var guards: [String: (args: [String], at: Double)] = [:]

    /// The repos Source Control last listed: the ones its Open File may open a file in (FileEditor.swift).
    static func listedRoots() -> [String] {
        lock.lock()
        defer { lock.unlock() }
        return cache.repos.compactMap { $0["root"] as? String }
    }

    /// The user's git (Homebrew's before Apple's, as in their shell).
    private static let executable = ["/opt/homebrew/bin/git", "/usr/local/bin/git", "/usr/bin/git"]
        .first { FileManager.default.isExecutableFile(atPath: $0) } ?? "/usr/bin/git"
    static let environment: [String: String] = {
        var env = ProcessInfo.processInfo.environment
        // Opened from the Finder, the app has the system's short PATH; hooks (lint-staged through npx, …) need the
        // user's tools.
        env["PATH"] = "/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:" + (env["PATH"] ?? "/usr/bin:/bin:/usr/sbin:/sbin")
        // No terminal to ask for a password on: fail instead of waiting.
        env["GIT_TERMINAL_PROMPT"] = "0"
        // Git's own sentences in English, whatever the Mac's language: the page looks for "fatal:" and "already registered".
        env["LC_MESSAGES"] = "C"
        return env
    }()

    // MARK: running git

    private final class Output: @unchecked Sendable { var data = Data() }

    /// Runs git in `dir`; nil if it couldn't start. A run longer than `timeout` is stopped.
    /// Never the folder's own fsmonitor: a repo's config can name any command as core.fsmonitor, and every status would
    /// run it, so a folder from a zip or a download would run it as soon as a terminal is in it.
    static func exec(_ dir: String, _ args: [String], timeout: Double, locks: Bool, input: Data? = nil, ceiling: String? = nil) -> (status: Int32, out: Data, err: Data)? {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: executable)
        p.arguments = ["-C", dir, "-c", "core.fsmonitor=false"] + args
        var env = environment
        // Reads don't take the index lock (VS Code's way): the page asking every few seconds mustn't get in the way of
        // a git command Claude or the user runs at the same time.
        if !locks { env["GIT_OPTIONAL_LOCKS"] = "0" }
        // Git doesn't climb into this folder or above it looking for a repo (a dotfiles repo in the home folder is no project).
        if let ceiling { env["GIT_CEILING_DIRECTORIES"] = ceiling }
        p.environment = env
        let stdin = Pipe()
        p.standardInput = input == nil ? FileHandle.nullDevice : stdin
        let out = Pipe(), err = Pipe()
        p.standardOutput = out
        p.standardError = err
        // Git may exit before it has read all of its input: a write to the closed pipe is an error, not a SIGPIPE.
        if input != nil { _ = fcntl(stdin.fileHandleForWriting.fileDescriptor, F_SETNOSIGPIPE, 1) }
        do { try p.run() } catch { return nil }
        if let input {
            DispatchQueue.global().async {
                try? stdin.fileHandleForWriting.write(contentsOf: input)
                try? stdin.fileHandleForWriting.close()
            }
        }
        let stop = DispatchWorkItem { if p.isRunning { p.terminate() } }
        DispatchQueue.global().asyncAfter(deadline: .now() + timeout, execute: stop)
        // Both pipes are read at once: git stops when one it writes to is full.
        let errors = Output()
        let group = DispatchGroup()
        DispatchQueue.global().async(group: group) { errors.data = err.fileHandleForReading.readDataToEndOfFile() }
        let data = out.fileHandleForReading.readDataToEndOfFile()
        group.wait()
        p.waitUntilExit()
        stop.cancel()
        return (p.terminationReason == .exit ? p.terminationStatus : -1, data, errors.data)
    }

    /// Reads run none of the commands a repo's own config (or a file it includes) names for a filter driver: the
    /// background status and diffs would run a filter's clean on every changed file, unasked. Each such driver of the
    /// repo's own config gets an empty clean, smudge and process, so its files are compared as they are; the user's
    /// global and system drivers (Git LFS) stay, as do changes (stage, commit), which the user asked for. Reads show no
    /// signatures either (gpg.program is the repo's to name), and a diff or blame is shown without textconv
    /// (--no-textconv: a diff driver's textconv is a command too).
    static func readGuards(_ dir: String) -> [String] {
        let now = nowMs()
        lock.lock()
        let hit = guards[dir]
        lock.unlock()
        if let hit, now - hit.at < 10_000 { return hit.args }
        var args = ["-c", "log.showSignature=false"]
        if let r = exec(dir, ["config", "--show-scope", "--includes", "--name-only", "--get-regexp", "^filter\\..+\\.(clean|smudge|process)$"],
                        timeout: 6, locks: false), r.status == 0 {
            for line in String(decoding: r.out, as: UTF8.self).split(separator: "\n") {
                let f = line.trimmingCharacters(in: .whitespacesAndNewlines).split(separator: "\t", maxSplits: 1).map(String.init)
                if f.count == 2, f[0] == "local" || f[0] == "worktree" { args += ["-c", f[1] + "="] }
            }
        }
        lock.lock()
        if guards.count > 500 { guards.removeAll() }
        guards[dir] = (args, now)
        lock.unlock()
        return args
    }

    /// What git printed, or nil when it failed (or printed more than `max`).
    static func read(_ dir: String, _ args: [String], max: Int = 8 << 20, ceiling: String? = nil) -> String? {
        guard let r = exec(dir, readGuards(dir) + args, timeout: 6, locks: false, ceiling: ceiling), r.status == 0, r.out.count <= max else { return nil }
        return String(decoding: r.out, as: UTF8.self)
    }

    /// A change to the repo; when it fails, git's last words for the page to show.
    private static func change(_ dir: String, _ args: [String]) -> [String: Any] {
        guard let r = exec(dir, args, timeout: 60, locks: true) else { return ["error": "git didn't start"] }
        if r.status == 0 { return ["ok": true] }
        // Git's reason ("fatal: …"), or the last lines it wrote (a hook's, or "nothing to commit" on its output).
        let said = (r.err.isEmpty ? r.out : r.err).split(separator: 10).map { String(decoding: $0, as: UTF8.self).trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
        if let reason = said.first(where: { $0.hasPrefix("fatal: ") || $0.hasPrefix("error: ") }) { return ["error": String(reason.dropFirst(7))] }
        return ["error": said.isEmpty ? "git failed" : said.suffix(3).joined(separator: " ")]
    }

    // MARK: the project of a folder (notes)

    /// Folder -> its project's folder, asked again after half a minute (an AI lists notes often).
    private static var projectRoots: [String: (dir: String, at: Double)] = [:]

    /// The project a folder belongs to, for the notes: the repo's main folder (found through git's common dir, so every
    /// worktree of a repo, and every folder inside one, is the same project); a folder that is no git repo is its own project.
    static func projectDir(of folder: String) -> String {
        let dir = URL(fileURLWithPath: folder).standardizedFileURL.path
        let now = nowMs()
        lock.lock()
        let hit = projectRoots[dir]
        lock.unlock()
        if let hit, now - hit.at < 30_000 { return hit.dir }
        var found = dir
        var isDir: ObjCBool = false
        if FileManager.default.fileExists(atPath: dir, isDirectory: &isDir), isDir.boolValue,
           let out = read(dir, ["rev-parse", "--git-common-dir"], ceiling: HOME)?.trimmingCharacters(in: .whitespacesAndNewlines), !out.isEmpty {
            // Relative to the folder git was run in.
            let common = URL(fileURLWithPath: out, relativeTo: URL(fileURLWithPath: dir, isDirectory: true)).standardizedFileURL
            if common.lastPathComponent == ".git" {
                found = common.deletingLastPathComponent().path
            } else if common.path.contains("/.git/modules/") {
                // A submodule's own git dir: the folder git says the work tree is in.
                if let top = repoRoot(dir) { found = URL(fileURLWithPath: top).standardizedFileURL.path }
            } else {
                // A bare repo (repo.git) with worktrees: the bare folder itself, so every worktree is one project.
                found = common.path
            }
        }
        lock.lock()
        if projectRoots.count > 300 { projectRoots.removeAll() }
        projectRoots[dir] = (found, now)
        lock.unlock()
        return found
    }

    /// The home folder as typed and as it really is (a symlinked home: sessions' folders are real paths).
    private static let homes: [String] = {
        var l = [URL(fileURLWithPath: HOME).standardizedFileURL.path]
        if let r = realpath(HOME, nil) { l.append(String(cString: r)); free(r) }
        return Array(Set(l))
    }()

    /// A folder too broad to be a project: `/`, the home folder or a folder above it, and a folder straight in the home
    /// folder (Documents, Desktop…).
    static func broad(_ folder: String) -> Bool {
        let dir = URL(fileURLWithPath: folder).standardizedFileURL.path
        if dir == "/" { return true }
        return homes.contains { $0 == dir || $0.hasPrefix(dir + "/") || URL(fileURLWithPath: dir).deletingLastPathComponent().path == $0 }
    }

    /// A project's name: its folder's, or the parent's when that starts with a dot (.bare, a git dir kept elsewhere).
    static func projectName(_ dir: String) -> String {
        let url = URL(fileURLWithPath: dir)
        let n = url.lastPathComponent
        guard n.hasPrefix(".") else { return n }
        let up = url.deletingLastPathComponent().lastPathComponent
        return up.isEmpty || up == "/" ? n : up
    }

    /// Whether a session in `folder` (and whose project's folder is `root`) is in the project a note was linked to (`project`): the
    /// project's own folder, or any folder inside it. An umbrella session (a folder holding several repos) also sees the notes of the
    /// projects inside it, but only when the user tied a note to that very folder (`tied`: every folder notes are linked to), and never
    /// for a broad folder.
    static func covers(project: String, folder: String, root: String, tied: Set<String>) -> Bool {
        func within(_ p: String, _ outer: String) -> Bool { p == outer || p.hasPrefix(outer.hasSuffix("/") ? outer : outer + "/") }
        let here = URL(fileURLWithPath: folder).standardizedFileURL.path
        if within(root, project) || within(here, project) { return true }
        return !broad(root) && tied.contains(root) && within(project, root)
    }

    // MARK: the repos

    /// The repo a folder is in.
    private static func repoRoot(_ dir: String) -> String? {
        let now = nowMs()
        lock.lock()
        let hit = roots[dir]
        lock.unlock()
        if let hit, now - hit.at < 60_000 { return hit.root }
        var root: String?
        var isDir: ObjCBool = false
        if FileManager.default.fileExists(atPath: dir, isDirectory: &isDir), isDir.boolValue,
           let out = read(dir, ["rev-parse", "--show-toplevel"]) {
            let r = out.trimmingCharacters(in: .whitespacesAndNewlines)
            root = r.isEmpty ? nil : r
        }
        lock.lock()
        roots[dir] = (root, now)
        lock.unlock()
        return root
    }

    /// File -> lines added and deleted (nil for a binary file).
    private static func numstat(_ out: String?) -> [String: (add: Int?, del: Int?)] {
        var m: [String: (add: Int?, del: Int?)] = [:]
        for line in (out ?? "").split(separator: "\n") {
            let cols = line.split(separator: "\t", maxSplits: 2, omittingEmptySubsequences: false)
            if cols.count == 3 { m[String(cols[2])] = (Int(cols[0]), Int(cols[1])) }
        }
        return m
    }

    private static func state(_ root: String, _ members: [GitSession], _ written: [String: [String]]) -> [String: Any]? {
        guard let status = read(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]) else { return nil }
        let branch = read(root, ["rev-parse", "--abbrev-ref", "HEAD"])?.trimmingCharacters(in: .whitespacesAndNewlines)
        let track = (read(root, ["rev-list", "--left-right", "--count", "HEAD...@{u}"]) ?? "").split(whereSeparator: \.isWhitespace).compactMap { Int($0) }
        let work = numstat(read(root, ["diff", "--numstat"])), index = numstat(read(root, ["diff", "--cached", "--numstat"]))
        var files: [[String: Any]] = []
        let entries = status.components(separatedBy: "\0")
        var i = 0
        while i < entries.count {
            let e = Array(entries[i])
            i += 1
            guard e.count >= 4 else { continue }
            let x = e[0], y = e[1], file = String(e[3...])
            if x == "R" || x == "C" { i += 1 } // the old name follows
            let abs = root + "/" + file
            let editors = written[abs] ?? []
            if x == "?" {
                // A new file: all its lines are added.
                var add: Any = NSNull()
                if let attrs = try? FileManager.default.attributesOfItem(atPath: abs), attrs[.type] as? FileAttributeType == .typeRegular,
                   (attrs[.size] as? Int ?? .max) < 1 << 20, let data = FileManager.default.contents(atPath: abs) {
                    add = data.reduce(0) { $1 == 10 ? $0 + 1 : $0 } + (data.last.map { $0 == 10 ? 0 : 1 } ?? 0)
                }
                files.append(["path": file, "status": "U", "staged": false, "add": add, "del": 0, "editors": editors])
                continue
            }
            for (code, staged, counts) in [(x, true, index[file]), (y, false, work[file])] where code != " " {
                files.append(["path": file, "status": String(code), "staged": staged, "add": orNull(counts?.add ?? nil),
                              "del": orNull(counts?.del ?? nil), "editors": editors])
            }
        }
        return [
            "root": root, "name": (root as NSString).lastPathComponent, "path": tildify(root), "branch": branch ?? "?",
            "ahead": track.count == 2 ? track[0] as Any : NSNull(), "behind": track.count == 2 ? track[1] as Any : NSNull(), "files": files,
            "sessions": members.map { ["id": $0.id, "name": $0.name, "title": $0.title, "status": $0.status, "live": $0.live] as [String: Any] },
        ]
    }

    static func repos(_ src: Sources) -> [[String: Any]] {
        lock.lock()
        let cached = cache
        lock.unlock()
        if nowMs() - cached.at < 2000 { return cached.repos }
        // A repo is in when a session today works in it (its folder) or wrote a file in it (Claude often works in a
        // parent folder and edits the repos under it), or when a terminal is in it.
        var order: [String] = []
        var members: [String: [GitSession]] = [:]
        func join(_ root: String, _ S: GitSession?) {
            if members[root] == nil {
                order.append(root)
                members[root] = []
            }
            if let S, !members[root]!.contains(where: { $0.id == S.id }) { members[root]!.append(S) }
        }
        for S in src.sessions {
            if let root = repoRoot(S.cwd) { join(root, S) }
        }
        let byId = Dictionary(src.sessions.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        for (file, editors) in src.written {
            guard let root = repoRoot((file as NSString).deletingLastPathComponent) else { continue }
            for id in editors { if let S = byId[id] { join(root, S) } }
        }
        for dir in src.terminals {
            if let root = repoRoot(dir) { join(root, nil) }
        }
        var states = [[String: Any]?](repeating: nil, count: order.count)
        DispatchQueue.concurrentPerform(iterations: order.count) { k in
            let s = state(order[k], members[order[k]] ?? [], src.written)
            lock.lock()
            states[k] = s
            lock.unlock()
        }
        // Repos with sessions working in them first, then by how much changed.
        let live = { (r: [String: Any]) in (r["sessions"] as? [[String: Any]] ?? []).filter { $0["live"] as? Bool == true }.count }
        let changed = { (r: [String: Any]) in (r["files"] as? [Any] ?? []).count }
        let repos = states.compactMap { $0 }.sorted { live($0) != live($1) ? live($0) > live($1) : changed($0) > changed($1) }
        lock.lock()
        cache = (nowMs(), repos)
        lock.unlock()
        return repos
    }

    // MARK: diffs and history

    private static func isHash(_ s: String) -> Bool {
        (7...40).contains(s.count) && s.allSatisfy { $0.isHexDigit && !$0.isUppercase }
    }

    /// The path of `file` in `root`, when it's inside it (worked out from the names alone, as git takes them).
    private static func inside(_ root: String, _ file: String) -> String? {
        guard !file.hasPrefix("/") else { return nil }
        var parts: [Substring] = []
        for part in file.split(separator: "/") where part != "." {
            if part != ".." {
                parts.append(part)
            } else if parts.popLast() == nil {
                return nil
            }
        }
        return parts.isEmpty ? nil : root + "/" + parts.joined(separator: "/")
    }

    private static func diff(_ root: String, _ file: String, staged: Bool, commit: String) -> [String: Any] {
        guard let abs = inside(root, file) else { return ["error": "outside the repo"] }
        if !commit.isEmpty {
            guard isHash(commit) else { return ["error": "bad commit"] }
            let shown = read(root, ["show", "--first-parent", "-m", "--no-color", "--no-ext-diff", "--no-textconv", "-U1000000", "--pretty=format:", commit, "--", file], max: 32 << 20)
            return shown.map { $0.isEmpty ? ["abs": abs, "note": "no differences"] : ["diff": $0, "abs": abs] } ?? ["abs": abs, "note": "no differences"]
        }
        let out = read(root, ["diff"] + (staged ? ["--cached"] : []) + ["--no-color", "--no-ext-diff", "--no-textconv", "-U1000000", "--", file], max: 32 << 20)
        if let out, !out.isEmpty { return ["diff": out, "abs": abs] }
        // Untracked: the whole file is new.
        guard let size = (try? FileManager.default.attributesOfItem(atPath: abs))?[.size] as? Int else {
            return ["abs": abs, "note": out == nil ? "no diff" : "deleted"]
        }
        if size > 2 << 20 { return ["abs": abs, "note": "file too large to show"] }
        guard let data = FileManager.default.contents(atPath: abs) else { return ["abs": abs, "note": "no diff"] }
        if data.contains(0) { return ["abs": abs, "note": "binary file"] }
        var lines = String(decoding: data, as: UTF8.self).components(separatedBy: "\n")
        if lines.last == "" { lines.removeLast() }
        return ["abs": abs, "diff": "@@ -0,0 +1,\(lines.count) @@\n" + lines.map { "+" + $0 }.joined(separator: "\n") + "\n", "untracked": true]
    }

    /// The history VS Code's graph shows (its "Auto"): the current branch and its upstream, newest first, each commit with
    /// its parents and its refs (full names); with the branch, the upstream and where they meet, for the graph's colours
    /// and its incoming and outgoing changes.
    private static func log(_ root: String, _ n: Int, all: Bool) -> [String: Any] {
        let line = { (args: [String]) in read(root, args)?.trimmingCharacters(in: .whitespacesAndNewlines) }
        let head = line(["rev-parse", "HEAD"])
        let branch = line(["symbolic-ref", "-q", "HEAD"])
        let upstream = branch == nil ? nil : line(["rev-parse", "--symbolic-full-name", "@{u}"])
        let upstreamRev = upstream.flatMap { line(["rev-parse", $0]) }
        let mergeBase = upstreamRev.flatMap { line(["merge-base", "HEAD", $0]) }
        // The branch's base, as the git extension finds it: the one VS Code noted when the branch was made, else the
        // remote's default branch.
        let short = branch?.replacingOccurrences(of: "refs/heads/", with: "")
        var base = short.flatMap { line(["config", "--get", "branch.\($0).vscode-merge-base"]) }.flatMap { line(["rev-parse", "--symbolic-full-name", $0]) }
            ?? line(["symbolic-ref", "-q", "refs/remotes/origin/HEAD"])
        if base == branch || base == upstream { base = nil }
        let baseRev = base.flatMap { line(["rev-parse", $0]) }
        // "Auto": the branch, its upstream and its base; else every branch.
        let refs = all ? ["--all"] : ["HEAD"] + [upstream, baseRev == nil ? nil : base].compactMap { $0 }
        let out = head == nil ? "" : read(root, ["log", "--topo-order", "-n\(n)", "--decorate=full", "--date=iso-strict",
                                                 "--pretty=format:%H%x1f%P%x1f%an%x1f%ae%x1f%ad%x1f%s%x1f%D"] + refs) ?? ""
        let commits = out.split(separator: "\n").compactMap { line -> [String: Any]? in
            let f = line.components(separatedBy: "\u{1f}")
            guard f.count >= 7 else { return nil }
            return ["hash": f[0], "parents": f[1].split(separator: " ").map(String.init), "author": f[2], "email": f[3], "date": f[4],
                    "subject": f[5], "refs": f[6].isEmpty ? [] : f[6].components(separatedBy: ", ")]
        }
        return ["commits": commits, "head": orNull(head), "branch": orNull(branch), "upstream": orNull(upstream),
                "upstreamRev": orNull(upstreamRev), "mergeBase": orNull(mergeBase), "base": orNull(baseRev == nil ? nil : base), "baseRev": orNull(baseRev)]
    }

    /// Who last changed a line, and when and why (GitLens's line blame): in the working tree, or as of a commit.
    private static func blame(_ root: String, _ file: String, line: Int, commit: String) -> [String: Any] {
        guard inside(root, file) != nil, line > 0 else { return ["error": "bad line"] }
        let out = read(root, ["blame", "--no-textconv", "--porcelain", "-L", "\(line),\(line)"] + (commit.isEmpty ? [] : [commit]) + ["--", file]) ?? ""
        var info: [String: Any] = [:]
        for (i, l) in out.split(separator: "\n", omittingEmptySubsequences: false).enumerated() {
            if i == 0 { info["hash"] = String(l.split(separator: " ").first ?? "") }
            else if l.hasPrefix("author ") { info["author"] = String(l.dropFirst(7)) }
            else if l.hasPrefix("author-mail ") { info["mail"] = String(l.dropFirst(12)) }
            else if l.hasPrefix("author-time ") { info["time"] = Double(l.dropFirst(12)) ?? 0 }
            else if l.hasPrefix("summary ") { info["summary"] = String(l.dropFirst(8)) }
        }
        guard info["hash"] != nil, info["author"] != nil else { return ["error": "no blame"] }
        info["me"] = read(root, ["config", "user.name"])?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return info
    }

    /// One commit: its message, author and the files it changed, with their counts.
    private static func show(_ root: String, _ hash: String) -> [String: Any] {
        guard let head = read(root, ["show", "-s", "--date=iso-strict", "--pretty=format:%H%x1f%P%x1f%an%x1f%ae%x1f%ad%x1f%B", hash]) else {
            return ["error": "no such commit"]
        }
        let f = head.components(separatedBy: "\u{1f}")
        guard f.count >= 6 else { return ["error": "no such commit"] }
        let names = read(root, ["show", "--first-parent", "-m", "--name-status", "--pretty=format:", hash]) ?? ""
        let counts = numstat(read(root, ["show", "--first-parent", "-m", "--numstat", "--pretty=format:", hash]))
        let files: [[String: Any]] = names.split(separator: "\n").compactMap { line -> [String: Any]? in
            let cols = line.components(separatedBy: "\t")
            guard cols.count >= 2, let code = cols[0].first, let file = cols.last else { return nil }
            return ["status": String(code), "path": file, "add": orNull(counts[file]?.add ?? nil), "del": orNull(counts[file]?.del ?? nil)]
        }
        return ["hash": f[0], "parents": f[1].split(separator: " ").map(String.init), "author": f[2], "email": f[3], "date": f[4],
                "message": f[5...].joined(separator: "\u{1f}").trimmingCharacters(in: .whitespacesAndNewlines), "files": files]
    }

    // MARK: the page's requests

    static func answer(_ body: [String: Any], _ src: Sources) -> [String: Any] {
        let type = body["type"] as? String ?? ""
        let known = repos(src)
        if type == "repos" { return ["repos": known] }
        // Only today's repos: the page can't point git anywhere else.
        guard let root = body["root"] as? String, known.contains(where: { $0["root"] as? String == root }) else { return ["error": "unknown repo"] }
        switch type {
        case "diff":
            return diff(root, body["path"] as? String ?? "", staged: body["staged"] as? Bool == true, commit: body["commit"] as? String ?? "")
        case "log":
            return log(root, max(1, min(1000, body["n"] as? Int ?? 50)), all: body["all"] as? Bool == true)
        case "show":
            let hash = body["hash"] as? String ?? ""
            return isHash(hash) ? show(root, hash) : ["error": "unknown commit"]
        case "blame":
            let commit = body["commit"] as? String ?? ""
            guard commit.isEmpty || isHash(commit) else { return ["error": "bad commit"] }
            return blame(root, body["path"] as? String ?? "", line: (body["line"] as? NSNumber)?.intValue ?? 0, commit: commit)
        default:
            break
        }
        let paths = (body["paths"] as? [String] ?? []).filter { inside(root, $0) != nil }
        var r: [String: Any]
        switch type {
        case "stage":
            r = paths.isEmpty ? ["error": "nothing to stage"] : change(root, ["add", "-A", "--"] + paths)
        case "unstage":
            r = paths.isEmpty ? ["error": "nothing to unstage"] : change(root, ["restore", "--staged", "--"] + paths)
        case "discard":
            if paths.isEmpty { return ["error": "nothing to discard"] }
            // Tracked files go back to their last commit; new (untracked) ones are thrown away.
            let status = read(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--"] + paths) ?? ""
            let untracked = Set(status.components(separatedBy: "\0").filter { $0.hasPrefix("?? ") }.map { String($0.dropFirst(3)) })
            let tracked = paths.filter { !untracked.contains($0) }
            r = tracked.isEmpty ? ["ok": true] : change(root, ["restore", "--"] + tracked)
            // New files go to the Trash, as VS Code does (they can be put back from there).
            if r["ok"] != nil {
                for p in paths where untracked.contains(p) {
                    if let abs = inside(root, p) { try? FileManager.default.trashItem(at: URL(fileURLWithPath: abs), resultingItemURL: nil) }
                }
            }
        case "commit":
            let message = (body["message"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            if message.isEmpty { return ["error": "write a commit message"] }
            if body["all"] as? Bool == true {
                let added = change(root, ["add", "-A"])
                if added["error"] != nil { return added }
            }
            r = change(root, ["commit", "-m", message])
            if r["ok"] != nil, body["push"] as? Bool == true { r = change(root, ["push"]) }
        case "push":
            r = change(root, ["push"])
        case "pull":
            r = change(root, ["pull", "--ff-only"])
        case "fetch":
            r = change(root, ["fetch"])
        case "publish":
            r = change(root, ["push", "-u", "origin", "HEAD"])
        default:
            return ["error": "unknown request"]
        }
        lock.lock()
        cache.at = 0
        lock.unlock()
        return r
    }
}

// MARK: worktrees

/// "Open in a worktree" (Worktrees.swift, web/worktree.js): what the name sheet needs to know about a repo, and `git worktree
/// add` into a folder next to it. Every call here takes the same care as the reads above: `readGuards` (no command from
/// the repo's own filter drivers), no fsmonitor (`exec`), and no hooks: `core.hooksPath` points at nothing for the
/// checkout, so a repo that came in a zip can't run a post-checkout hook of its own the moment a worktree is made.
extension Git {
    /// The AI the sheet offers first (what was picked last).
    static let worktreeAIKey = "worktreeAI"
    static let worktreeAIs = ["claude", "codex", "agy", "cursor", "terminal"]

    /// What git said when a run failed: its "fatal: …" or "error: …" line, else its last lines.
    static func said(_ r: (status: Int32, out: Data, err: Data)?) -> String {
        guard let r else { return "git didn't start" }
        let lines = (r.err.isEmpty ? r.out : r.err).split(separator: 10).map { String(decoding: $0, as: UTF8.self).trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
        if let reason = lines.first(where: { $0.hasPrefix("fatal: ") || $0.hasPrefix("error: ") }) { return String(reason.dropFirst(7)) }
        return lines.isEmpty ? "git failed" : lines.suffix(3).joined(separator: " ")
    }

    /// What the name sheet shows for the folder `dir`: the repo, the branch it's made from, the names already taken, what
    /// would be copied, how many changes stay behind. `error` ("not-a-repo", "gone") when there's no sheet to show;
    /// `problem` ("no-commits", "no-permission") when there is one, but nothing can be made yet.
    static func describe(_ rawDir: String) -> [String: Any] {
        let dir = FolderLister.expand(rawDir)
        var isDir: ObjCBool = false
        guard FileManager.default.fileExists(atPath: dir, isDirectory: &isDir), isDir.boolValue else { return ["error": "gone"] }
        guard let info = Worktrees.info(of: dir) else { return ["error": "not-a-repo"] }
        let top = info.top
        let (leaf, parent) = Worktrees.home(info.main)
        var out: [String: Any] = ["repo": leaf, "main": info.main, "parent": tildify(parent), "sub": info.sub, "linked": info.linked]
        let fm = FileManager.default

        // The branch it starts from: the one checked out (a detached HEAD: the commit).
        let branch = read(top, ["symbolic-ref", "--short", "-q", "HEAD"])?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let short = read(top, ["rev-parse", "--verify", "-q", "--short", "HEAD"])?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        out["base"] = branch
        out["short"] = short
        let branches = (read(top, ["for-each-ref", "--format=%(refname:short)", "refs/heads"]) ?? "").split(separator: "\n").map(String.init)
        let prefix = leaf + "-"
        let folders = ((try? fm.contentsOfDirectory(atPath: parent)) ?? []).filter { $0.hasPrefix(prefix) }.prefix(2000)
        out["branches"] = branches
        out["folders"] = Array(folders)
        out["suggest"] = Worktrees.suggest(branches: Set(branches), folders: Set(folders), main: info.main)
        let saved = UserDefaults.standard.string(forKey: worktreeAIKey) ?? "claude"
        out["lastAI"] = worktreeAIs.contains(saved) ? saved : "claude"
        if short.isEmpty {
            out["problem"] = "no-commits"
        } else if !fm.isWritableFile(atPath: parent) {
            out["problem"] = "no-permission"
        }

        // Changes that stay in the main folder: the worktree starts from the last commit.
        var dirty = 0
        let entries = (read(top, ["status", "--porcelain=v1", "-z", "--untracked-files=normal"]) ?? "").components(separatedBy: "\0")
        var i = 0
        while i < entries.count {
            let e = entries[i]
            i += 1
            guard e.count >= 3 else { continue }
            dirty += 1
            if e.hasPrefix("R") || e.hasPrefix("C") { i += 1 }
        }
        out["dirty"] = dirty
        let list = copyList(top)
        out["copy"] = list.files
        out["includeFile"] = list.includeFile
        return out
    }

    /// What a new worktree would get from the folder `top` that git doesn't keep: the files that match `.worktreeinclude`
    /// (`.env*` when there is none) and that git ignores. Git's own matching both times: `ls-files` lists what the patterns
    /// match among the files it doesn't track, `check-ignore` keeps those its ignore rules cover. A directory comes as one
    /// entry, with a "/" at its end.
    private static func copyList(_ top: String) -> (files: [String], includeFile: Bool) {
        var st = stat()
        let includeFile = lstat(top + "/.worktreeinclude", &st) == 0 && (st.st_mode & S_IFMT) == S_IFREG
        let patterns = includeFile ? ["--exclude-from=.worktreeinclude"] : ["--exclude=.env*"]
        guard let listed = exec(top, readGuards(top) + ["ls-files", "--others", "--ignored", "--directory", "-z"] + patterns, timeout: 20, locks: false),
              listed.status == 0, listed.out.count <= 8 << 20 else { return ([], includeFile) }
        let found = String(decoding: listed.out, as: UTF8.self).components(separatedBy: "\0").filter { !$0.isEmpty }
        if found.isEmpty { return ([], includeFile) }
        var input = Data()
        for f in found { input.append(contentsOf: Array(f.utf8) + [0]) }
        // Exit 1 is "none of them is ignored".
        guard let kept = exec(top, readGuards(top) + ["check-ignore", "--stdin", "-z"], timeout: 20, locks: false, input: input),
              kept.status == 0 else { return ([], includeFile) }
        let ignored = Set(String(decoding: kept.out, as: UTF8.self).components(separatedBy: "\0").filter { !$0.isEmpty })
        // Only plain files and directories (a link isn't copied, so it isn't offered).
        let dirs = found.filter { $0.hasSuffix("/") && ignored.contains($0) }
        let plain = found.filter { entry in
            guard ignored.contains(entry) else { return false }
            // Inside a directory that is listed itself: it comes with the directory.
            if dirs.contains(where: { $0 != entry && entry.hasPrefix($0) }) { return false }
            var st = stat()
            guard lstat(top + "/" + (entry.hasSuffix("/") ? String(entry.dropLast()) : entry), &st) == 0 else { return false }
            return (st.st_mode & S_IFMT) == S_IFREG || (st.st_mode & S_IFMT) == S_IFDIR
        }
        return (plain, includeFile)
    }

    /// `git worktree add` for the folder `rawDir` is in: a new branch `name` from its HEAD, in the folder next to the repo.
    /// Answers `ok`, `path` (the worktree), `open` (where the AI starts: the same folder inside it as the one picked), `branch`
    /// and what to copy (`copy`); or `error` in plain words with a `kind` ("name", "branch", "folder", "permission", "commits",
    /// "git") for the sheet. When git fails half way, what it made is removed again.
    static func addWorktree(from rawDir: String, name: String) -> [String: Any] {
        let dir = FolderLister.expand(rawDir)
        guard let info = Worktrees.info(of: dir) else { return ["kind": "repo", "error": "This folder isn't in a git repo anymore."] }
        if name == "HEAD" { return ["kind": "name", "error": "HEAD is a name git keeps for itself. Pick another name."] }
        if let bad = Worktrees.validate(name) {
            return ["kind": "name", "error": bad == "empty" ? "Type a name." : bad == "chars" ? "Use only letters, numbers and - _ . /"
                    : "A name can't start with - . or /, end with / or .lock, or have .. in it."]
        }
        let top = info.top
        let shape = ["kind": "name", "error": "A name can't start with - . or /, end with / or .lock, or have .. in it."]
        guard let ref = exec(top, ["check-ref-format", "--branch", name], timeout: 10, locks: false), ref.status == 0 else { return shape }
        if let have = exec(top, ["show-ref", "--verify", "--quiet", "refs/heads/" + name], timeout: 10, locks: false), have.status == 0 {
            return ["kind": "branch", "error": "There's already a branch called \(name). Pick another name."]
        }
        let leaf = Worktrees.home(info.main).leaf
        let folder = Worktrees.folder(main: info.main, name: name)
        var there = stat()
        if lstat(folder, &there) == 0 {
            return ["kind": "folder", "error": "There's already a folder called \((folder as NSString).lastPathComponent) next to your repo. Pick another name."]
        }
        if !FileManager.default.isWritableFile(atPath: Worktrees.home(info.main).parent) {
            return ["kind": "permission", "error": "Can't make a folder next to \(leaf): no permission."]
        }
        guard read(top, ["rev-parse", "--verify", "-q", "HEAD"]) != nil else {
            return ["kind": "commits", "error": "This repo has no commits yet. Make a first commit, then try again."]
        }
        // No hooks (core.hooksPath) in any call below: a repo that came in a zip can't run one of its own. The repo's filters
        // stay (git-crypt, LFS need them for the checkout). Nothing is pruned: another worktree on a drive that isn't
        // plugged in must keep its record.
        let safe = ["-c", "core.hooksPath=/dev/null"]
        let r = exec(top, safe + ["worktree", "add", "-b", name, "--", folder, "HEAD"], timeout: 120, locks: true)
        if r?.status != 0 {
            var why = said(r)
            // An old record of a worktree at this path (its folder deleted by hand): not overridden, it may be one moved in Finder.
            let stale = String(decoding: r?.err ?? Data(), as: UTF8.self).contains("already registered")
            if stale { why = "An old worktree record still uses this name. Pick another name, or run `git worktree prune`." }
            // What this run made is taken away again; nothing else is touched (the folder didn't exist before it).
            if lstat(folder, &there) == 0 {
                _ = exec(top, safe + ["worktree", "remove", "--force", folder], timeout: 60, locks: true)
                if lstat(folder, &there) == 0 { try? FileManager.default.removeItem(atPath: folder) }
            }
            if let had = exec(top, ["show-ref", "--verify", "--quiet", "refs/heads/" + name], timeout: 10, locks: false), had.status == 0 {
                _ = exec(top, safe + ["branch", "-D", name], timeout: 10, locks: true)
            }
            Worktrees.forget()
            return stale ? ["kind": "folder", "error": why] : ["kind": "git", "error": why]
        }
        // Where it was made from, kept as VS Code keeps it (its own key, one line in .git/config; git forgets it with the branch):
        // the PR, merge and delete pages read it back as the branch this work goes into.
        let from = (read(top, ["symbolic-ref", "--short", "-q", "HEAD"]) ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if !from.isEmpty { _ = exec(top, ["config", "branch.\(name).vscode-merge-base", from], timeout: 10, locks: true) }
        Worktrees.forget()
        // Anything remembered about a worktree of this name (it was removed outside the app and made again) is old.
        forgetShip(folder)
        forgetShip(Worktrees.real(folder))
        var open = folder
        var isDir: ObjCBool = false
        if !info.sub.isEmpty, FileManager.default.fileExists(atPath: folder + "/" + info.sub, isDirectory: &isDir), isDir.boolValue {
            open = folder + "/" + info.sub
        }
        let list = copyList(top)
        return ["ok": true, "path": folder, "open": open, "branch": name, "copy": list.files, "source": top]
    }
}
