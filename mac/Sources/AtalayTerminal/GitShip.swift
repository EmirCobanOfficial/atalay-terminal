import Foundation

// The git side of "Create PR / Merge / Delete worktree" (WorktreeShip.swift, web/worktree.js sheets). Same care as the
// reads and the name sheet in Git.swift: `readGuards` and no fsmonitor on every read, `GIT_OPTIONAL_LOCKS=0` for reads,
// `LC_MESSAGES=C` for git's own sentences, `--` before every path, argv arrays (no shell), and never `--force`: no force
// push, no `worktree remove --force`, no `branch -D` of anything but the branch the user asked to delete.

struct GitRemote: Equatable {
    var name = "", url = "", host = "", kind = "none", owner = "", repo = ""
    /// What the sheets call the host.
    var label: String {
        ["github": "GitHub", "ghe": "GitHub", "gitlab": "GitLab", "bitbucket": "Bitbucket", "azure": "Azure DevOps", "gitea": "Gitea"][kind] ?? host
    }
    var json: [String: Any] { ["name": name, "host": host, "kind": kind, "label": label, "owner": owner, "repo": repo] }
}

struct GitChecks: Equatable {
    /// "none", "run", "pass" or "fail" (fail before run).
    var kind = "none"
    var passed: [String] = []
    var failed: [String] = []
    var running: [String] = []
    var json: [String: Any] { ["kind": kind, "passed": passed, "failed": failed, "running": running] }
}

struct GitPR: Equatable {
    var number = 0
    var url = "", state = "", title = ""
    var draft = false
    var mergeable = "", mergeState = "", review = "", reviewBy = "", headSha = "", baseRef = ""
    var checks = GitChecks()
    var json: [String: Any] {
        ["number": number, "url": url, "state": state, "title": title, "draft": draft, "mergeable": mergeable, "mergeState": mergeState,
         "review": review, "reviewBy": reviewBy, "headSha": headSha, "base": baseRef, "checks": checks.json]
    }
}

/// Where a linked worktree stands: how much work is in it and what its next step is (spec 3.1, 3.2).
struct WorktreeStatus: Equatable {
    var top = "", main = "", branch = "", base = "", baseRev = "", localSha = ""
    var baseFolder: String?
    /// Where the branch is pushed when that isn't the base's remote (a fork).
    var pushRemote: GitRemote?
    var mergeBase = ""
    var ahead = 0, behind = 0, dirty = 0
    var dirtyFiles: [String] = []
    var add = 0, del = 0, files = 0
    var upstream: String?
    var unpushed: Int?
    var everCommitted = false
    var remote: GitRemote?
    var ghInstalled = false, ghSignedIn = false
    var ghUser: String?
    var pr: GitPR?
    var locked = false, detached = false, gone = false

    /// The state, by the first rule that holds: gone, detached, merged, pr, work, nothing.
    var phase: String {
        if gone { return "gone" }
        if detached { return "detached" }
        if branch == base { return "nothing" }
        // Merged only while nothing new is in the folder: uncommitted or untracked work after the merge is "work" again.
        if (pr?.state == "MERGED" && dirty == 0) || (everCommitted && ahead == 0 && dirty == 0 && !baseRev.isEmpty) { return "merged" }
        if pr?.state == "OPEN" { return "pr" }
        if ahead > 0 || dirty > 0 { return "work" }
        return "nothing"
    }

    var json: [String: Any] {
        var o: [String: Any] = ["top": top, "main": main, "branch": branch, "base": base, "ahead": ahead, "behind": behind, "dirty": dirty,
                                "dirtyFiles": dirtyFiles, "add": add, "del": del, "files": files, "everCommitted": everCommitted,
                                "ghInstalled": ghInstalled, "ghSignedIn": ghSignedIn, "locked": locked, "detached": detached, "gone": gone,
                                "phase": phase, "localSha": localSha]
        if let baseFolder { o["baseFolder"] = baseFolder }
        if let upstream { o["upstream"] = upstream }
        if let unpushed { o["unpushed"] = unpushed }
        if let remote { o["remote"] = remote.json }
        if let ghUser { o["ghUser"] = ghUser }
        if let pr { o["pr"] = pr.json }
        return o
    }
}

extension Git {
    // MARK: tools

    /// A program other than git (gh) in `dir`, with git's environment and `extra`. Stopped after `timeout`; nil if it didn't start.
    static func run(_ exe: String, in dir: String, _ args: [String], env extra: [String: String] = [:], timeout: Double, input: Data? = nil)
        -> (status: Int32, out: Data, err: Data)? {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: exe)
        p.arguments = args
        p.currentDirectoryURL = URL(fileURLWithPath: dir)
        var env = environment
        for (k, v) in extra { env[k] = v }
        p.environment = env
        let stdin = Pipe()
        p.standardInput = input == nil ? FileHandle.nullDevice : stdin
        let out = Pipe(), err = Pipe()
        p.standardOutput = out
        p.standardError = err
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
        final class Box: @unchecked Sendable { var data = Data() }
        let errors = Box()
        let group = DispatchGroup()
        DispatchQueue.global().async(group: group) { errors.data = err.fileHandleForReading.readDataToEndOfFile() }
        let data = out.fileHandleForReading.readDataToEndOfFile()
        group.wait()
        p.waitUntilExit()
        stop.cancel()
        return (p.terminationReason == .exit ? p.terminationStatus : -1, data, errors.data)
    }

    private static let ghLock = NSLock()
    private static var ghPathCache: (path: String?, at: Double)?
    private static var ghAuthCache: [String: (ok: Bool, user: String?, at: Double)] = [:]

    /// GitHub CLI: the usual places, then PATH. Looked for again after a minute.
    static func ghPath() -> String? {
        let now = nowMs()
        ghLock.lock()
        let hit = ghPathCache
        ghLock.unlock()
        if let hit, now - hit.at < 60_000 { return hit.path }
        var dirs = ["/opt/homebrew/bin", "/usr/local/bin", HOME + "/.local/bin", "/usr/bin"]
        dirs += (environment["PATH"] ?? "").split(separator: ":").map(String.init)
        let found = dirs.map { $0 + "/gh" }.first { FileManager.default.isExecutableFile(atPath: $0) }
        ghLock.lock()
        ghPathCache = (found, now)
        ghLock.unlock()
        return found
    }

    /// The environment gh runs in: no prompts, no update note, no colours; `GH_HOST` for a host other than github.com.
    static func ghEnv(_ host: String) -> [String: String] {
        var e = ["GH_PROMPT_DISABLED": "1", "GH_NO_UPDATE_NOTIFIER": "1", "NO_COLOR": "1"]
        if !host.isEmpty, host != "github.com" { e["GH_HOST"] = host }
        return e
    }

    /// Whether gh is signed in on `host` and as whom; kept five minutes (`force`: asked again).
    static func ghAuth(_ gh: String, host: String, force: Bool = false) -> (ok: Bool, user: String?) {
        let now = nowMs()
        ghLock.lock()
        let hit = ghAuthCache[host]
        ghLock.unlock()
        if !force, let hit, now - hit.at < 300_000 { return (hit.ok, hit.user) }
        var ok = false
        var user: String?
        let args = host.isEmpty ? ["auth", "status"] : ["auth", "status", "--hostname", host]
        if let r = run(gh, in: HOME, args, env: ghEnv(host), timeout: 15), r.status == 0 {
            ok = true
            if let u = run(gh, in: HOME, ["api", "user", "-q", ".login"], env: ghEnv(host), timeout: 15), u.status == 0 {
                let name = String(decoding: u.out, as: UTF8.self).trimmingCharacters(in: .whitespacesAndNewlines)
                user = name.isEmpty ? nil : name
            }
        }
        ghLock.lock()
        ghAuthCache[host] = (ok, user, now)
        ghLock.unlock()
        return (ok, user)
    }

    private static func text(_ s: String?) -> String { (s ?? "").trimmingCharacters(in: .whitespacesAndNewlines) }

    private static func lines(_ s: String?) -> [String] {
        (s ?? "").split(separator: "\n", omittingEmptySubsequences: true).map { String($0).trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
    }

    // MARK: remote

    /// A remote's address taken apart: https, ssh://, git@host:path and a local path all come out as host + path.
    static func parseRemote(name: String, url: String) -> GitRemote {
        var host = "", path = ""
        if let r = url.range(of: "://") {
            let rest = url[r.upperBound...]
            let slash = rest.firstIndex(of: "/") ?? rest.endIndex
            var h = String(rest[..<slash])
            path = String(rest[slash...].dropFirst())
            if let at = h.lastIndex(of: "@") { h = String(h[h.index(after: at)...]) }
            if let colon = h.firstIndex(of: ":") { h = String(h[..<colon]) }
            host = h
        } else if !url.hasPrefix("/"), let colon = url.firstIndex(of: ":") {
            var h = String(url[..<colon])
            if let at = h.lastIndex(of: "@") { h = String(h[h.index(after: at)...]) }
            host = h
            path = String(url[url.index(after: colon)...])
        }
        host = host.lowercased()
        // An SSH alias for several accounts (github.com-work, gitlab.com-me) is still that host.
        for h in ["github.com", "gitlab.com", "bitbucket.org", "codeberg.org"] where host.hasPrefix(h + "-") { host = h }
        path = path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        if path.hasSuffix(".git") { path = String(path.dropLast(4)) }
        let comps = path.split(separator: "/").map(String.init)
        var r = GitRemote(name: name, url: url, host: host, owner: comps.dropLast().joined(separator: "/"), repo: comps.last ?? "")
        if host.isEmpty { r.kind = "other" }
        else if host == "github.com" { r.kind = "github" }
        else if host.contains("gitlab") { r.kind = "gitlab" }
        else if host == "bitbucket.org" { r.kind = "bitbucket" }
        else if host == "dev.azure.com" || host == "ssh.dev.azure.com" || host.hasSuffix(".visualstudio.com") { r.kind = "azure" }
        else if host == "codeberg.org" || host.hasPrefix("gitea.") || host.hasPrefix("forgejo.") { r.kind = "gitea" }
        else { r.kind = "other" }
        if r.kind == "azure" {
            // https://dev.azure.com/org/project/_git/repo, or git@ssh.dev.azure.com:v3/org/project/repo
            var c = comps
            if c.first == "v3" { c.removeFirst() }
            c.removeAll { $0 == "_git" }
            if c.count >= 3 { r.owner = c[0] + "/" + c[1]; r.repo = c[2] }
        }
        return r
    }

    private static func enc(_ s: String) -> String {
        s.addingPercentEncoding(withAllowedCharacters: CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")) ?? s
    }

    /// The page of the host where the pull request form is, with what can be filled in (https only; nil when the host has none).
    static func browserURL(_ r: GitRemote, branch: String, into: String, title: String, body: String) -> String? {
        guard !r.host.isEmpty, r.kind != "other", r.kind != "none" else { return nil }
        let h = r.host == "ssh.dev.azure.com" ? "dev.azure.com" : r.host
        let path = r.owner.isEmpty ? r.repo : r.owner + "/" + r.repo
        func encPath(_ p: String) -> String { p.split(separator: "/").map { enc(String($0)).replacingOccurrences(of: "%3A", with: ":") }.joined(separator: "/") }
        switch r.kind {
        case "github", "ghe":
            // GitHub's own quick_pull parameters; a long body is cut (the URL must stay under what browsers and servers take).
            var b = body
            func make(_ b: String) -> String {
                "https://\(h)/\(encPath(path))/compare/\(encPath(into))...\(encPath(branch))?quick_pull=1&title=\(enc(title))&body=\(enc(b))"
            }
            var url = make(b)
            while url.count > 7000, b.count > 20 {
                b = String(b.prefix(Int(Double(b.count) * 0.8))) + "…"
                url = make(b)
                if b.count < 20 { break }
            }
            return url
        case "gitlab":
            return "https://\(h)/\(encPath(path))/-/merge_requests/new?merge_request%5Bsource_branch%5D=\(enc(branch))&merge_request%5Btarget_branch%5D=\(enc(into))&merge_request%5Btitle%5D=\(enc(title))&merge_request%5Bdescription%5D=\(enc(String(body.prefix(3000))))"
        case "bitbucket":
            return "https://\(h)/\(encPath(path))/pull-requests/new?source=\(enc(branch))&dest=\(enc(into))&t=1"
        case "azure":
            let parts = r.owner.split(separator: "/").map(String.init)
            guard parts.count == 2 else { return nil }
            return "https://dev.azure.com/\(enc(parts[0]))/\(enc(parts[1]))/_git/\(enc(r.repo))/pullrequestcreate?sourceRef=\(enc(branch))&targetRef=\(enc(into))"
        case "gitea":
            return "https://\(h)/\(encPath(path))/compare/\(encPath(into))...\(encPath(branch))"
        default:
            return nil
        }
    }

    // MARK: the status

    private static func pathExists(_ p: String) -> Bool { FileManager.default.fileExists(atPath: p) }

    /// Branches, locks and folders of every worktree: `worktree list --porcelain`. `prunable`: git says its folder is gone.
    static func worktreeList(_ dir: String) -> [(path: String, branch: String?, locked: Bool, prunable: Bool)] {
        var out: [(String, String?, Bool, Bool)] = []
        var path: String?, branch: String?, locked = false, prunable = false
        func flush() { if let p = path { out.append((p, branch, locked, prunable)) }; path = nil; branch = nil; locked = false; prunable = false }
        for line in (read(dir, ["worktree", "list", "--porcelain"]) ?? "").components(separatedBy: "\n") {
            if line.hasPrefix("worktree ") { flush(); path = String(line.dropFirst(9)) }
            else if line.hasPrefix("branch refs/heads/") { branch = String(line.dropFirst(18)) }
            else if line == "locked" || line.hasPrefix("locked ") { locked = true }
            else if line == "prunable" || line.hasPrefix("prunable ") { prunable = true }
        }
        flush()
        return out
    }

    private struct BaseInfo {
        var base = "", baseRev = "", remoteName = ""
        var remote: GitRemote?
        var pushRemote: GitRemote?
        var at = 0.0
    }
    private static var baseCache: [String: BaseInfo] = [:]
    private static var everCache = Set<String>()
    private static var lineCache: [String: (mtime: Double, size: Int, lines: Int)] = [:]

    /// The base and the remote are looked at again a minute apart (or after something was done): they change when a branch or a
    /// remote does, not as files do, and finding them takes a dozen git runs.
    static func forgetShip(_ top: String) {
        ghLock.lock()
        baseCache = baseCache.filter { !$0.key.hasPrefix(top + "\0") }
        everCache = everCache.filter { !$0.hasPrefix(top + "\0") }
        ghLock.unlock()
    }

    private static func resolveBase(dir: String, main: String, branch: String, fallback: String) -> BaseInfo {
        var b = BaseInfo()
        let remoteNames = lines(read(dir, ["remote"]))
        let defaultRemote = remoteNames.contains("origin") ? "origin" : (remoteNames.count == 1 ? remoteNames[0] : "")
        func clean(_ n0: String) -> String {
            var n = n0
            for p in ["refs/heads/", "refs/remotes/"] where n.hasPrefix(p) { n = String(n.dropFirst(p.count)) }
            for r in remoteNames where n.hasPrefix(r + "/") { n = String(n.dropFirst(r.count + 1)) }
            return n
        }
        var candidates: [String] = []
        for key in ["vscode-merge-base", "gh-merge-base"] {
            let v = text(read(dir, ["config", "--get", "branch.\(branch).\(key)"]))
            if !v.isEmpty { candidates.append(clean(v)) }
        }
        let mainBranch = text(read(main, ["symbolic-ref", "--short", "-q", "HEAD"]))
        if !mainBranch.isEmpty { candidates.append(mainBranch) }
        if !defaultRemote.isEmpty {
            let h = text(read(dir, ["symbolic-ref", "-q", "refs/remotes/\(defaultRemote)/HEAD"]))
            if !h.isEmpty { candidates.append(clean(h)) }
        }
        candidates += ["main", "master", "develop"]
        func has(_ ref: String) -> Bool { read(dir, ["rev-parse", "--verify", "-q", ref]) != nil }
        var remoteName = defaultRemote
        b.base = candidates.first { $0 != branch } ?? "main"
        for c in candidates where c != branch && !c.isEmpty {
            if has("refs/heads/" + c) { b.base = c; b.baseRev = c; break }
            if !defaultRemote.isEmpty, has("refs/remotes/\(defaultRemote)/\(c)") { b.base = c; b.baseRev = "\(defaultRemote)/\(c)"; break }
        }
        let br = text(read(dir, ["config", "--get", "branch.\(b.base).remote"]))
        if remoteNames.contains(br) { remoteName = br }
        b.remoteName = remoteName
        if !remoteName.isEmpty, let url = read(dir, ["remote", "get-url", remoteName]) {
            b.remote = parseRemote(name: remoteName, url: text(url))
        }
        // A fork: the branch goes to its own push remote, the pull request to the base's.
        var push = text(read(dir, ["config", "--get", "branch.\(branch).pushRemote"]))
        if push.isEmpty { push = text(read(dir, ["config", "--get", "remote.pushDefault"])) }
        if !push.isEmpty, push != remoteName, remoteNames.contains(push), let url = read(dir, ["remote", "get-url", push]) {
            b.pushRemote = parseRemote(name: push, url: text(url))
        }
        b.at = nowMs()
        return b
    }

    /// Everything the header, the list and the sheets need to know about a linked worktree, from git alone (no network). `known`:
    /// what was known before, for a worktree whose folder is gone. Nil: not a linked worktree. A handful of git runs: one `status`
    /// (branch, upstream and what changed), the worktree list, the counts and the numbers.
    static func worktreeStatus(top rawTop: String, known: WorktreeStatus? = nil, strict: Bool = false) -> WorktreeStatus? {
        let top = rawTop
        if !pathExists(top) {
            guard var g = known else { return nil }
            g.gone = true
            return g
        }
        guard let info = Worktrees.info(of: top), info.linked else { return nil }
        var s = WorktreeStatus()
        s.top = info.top
        s.main = info.main
        let dir = info.top

        // One status for the branch, the upstream and every changed file.
        // A status that fails or times out (a huge worktree) is unknown, never "clean": the last known state stays.
        guard let st = exec(dir, readGuards(dir) + ["status", "--porcelain=v2", "--branch", "-z", "--untracked-files=all"], timeout: 30, locks: false),
              st.status == 0 else { return strict ? nil : known }
        let raw = String(decoding: st.out, as: UTF8.self).components(separatedBy: "\0")
        var head = "", ab: (a: Int, b: Int)?
        var untracked: [String] = []
        var i = 0
        while i < raw.count {
            let e = raw[i]
            i += 1
            if e.hasPrefix("# branch.oid ") { s.localSha = String(e.dropFirst(13)) }
            else if e.hasPrefix("# branch.head ") { head = String(e.dropFirst(14)) }
            else if e.hasPrefix("# branch.upstream ") { s.upstream = String(e.dropFirst(18)) }
            else if e.hasPrefix("# branch.ab ") {
                let p = e.dropFirst(12).split(separator: " ")
                if p.count == 2 { ab = (Int(p[0].dropFirst()) ?? 0, Int(p[1].dropFirst()) ?? 0) }
            } else if e.hasPrefix("1 ") || e.hasPrefix("2 ") || e.hasPrefix("u ") || e.hasPrefix("? ") {
                var path = ""
                if e.hasPrefix("? ") { path = String(e.dropFirst(2)); untracked.append(path) }
                else {
                    let n = e.hasPrefix("1 ") ? 8 : e.hasPrefix("2 ") ? 9 : 10
                    let f = e.split(separator: " ", maxSplits: n, omittingEmptySubsequences: false)
                    path = f.count > n ? String(f[n]) : ""
                    if e.hasPrefix("2 ") { i += 1 }
                }
                s.dirty += 1
                if s.dirtyFiles.count < 3 { s.dirtyFiles.append(path) }
            }
        }
        // The branch is read on its own (cheap): it doesn't depend on the big status.
        let sym = text(read(dir, ["symbolic-ref", "--short", "-q", "HEAD"]))
        head = sym
        s.detached = sym.isEmpty
        s.branch = s.detached ? info.branch : sym
        if let ab { s.unpushed = ab.a }

        let wts = worktreeList(dir)
        s.locked = wts.first { Worktrees.real($0.path) == Worktrees.real(dir) }?.locked ?? false

        // The base and the remote: found again every minute, not at every look.
        let key = dir + "\0" + s.branch
        ghLock.lock()
        var cached = baseCache[key]
        ghLock.unlock()
        if cached == nil || nowMs() - (cached?.at ?? 0) > 60_000 {
            cached = resolveBase(dir: dir, main: info.main, branch: s.branch, fallback: info.branch)
            ghLock.lock()
            if baseCache.count > 200 { baseCache.removeAll() }
            baseCache[key] = cached
            ghLock.unlock()
        }
        let b = cached ?? BaseInfo()
        s.base = b.base
        s.baseRev = b.baseRev
        s.remote = b.remote
        s.pushRemote = b.pushRemote
        s.baseFolder = wts.first { $0.branch == s.base }?.path

        if !s.baseRev.isEmpty {
            s.mergeBase = text(read(dir, ["merge-base", s.baseRev, "HEAD"]))
            let counts = text(read(dir, ["rev-list", "--left-right", "--count", "\(s.baseRev)...HEAD"])).split(whereSeparator: { $0 == "\t" || $0 == " " })
            if counts.count == 2 { s.behind = Int(counts[0]) ?? 0; s.ahead = Int(counts[1]) ?? 0 }
        }

        // +added −removed since the base: tracked files (committed or not) by numstat, new files by their lines (Source Control's way);
        // a new file's lines are counted once per change of its time and size.
        let against = s.mergeBase.isEmpty ? "HEAD" : s.mergeBase
        var files = 0
        for line in lines(read(dir, ["diff", "--numstat", "--no-ext-diff", "--no-textconv", against])) {
            let c = line.split(separator: "\t", maxSplits: 2, omittingEmptySubsequences: false)
            guard c.count == 3 else { continue }
            files += 1
            s.add += Int(c[0]) ?? 0
            s.del += Int(c[1]) ?? 0
        }
        for path in untracked.prefix(200) {
            files += 1
            let full = dir + "/" + path
            var st = stat()
            guard lstat(full, &st) == 0, (st.st_mode & S_IFMT) == S_IFREG, st.st_size < 1 << 20 else { continue }
            let mtime = Double(st.st_mtimespec.tv_sec) + Double(st.st_mtimespec.tv_nsec) / 1e9
            ghLock.lock()
            let hit = lineCache[full]
            ghLock.unlock()
            if let hit, hit.mtime == mtime, hit.size == Int(st.st_size) { s.add += hit.lines; continue }
            guard let data = FileManager.default.contents(atPath: full), !data.contains(0) else { continue }
            var n = data.reduce(0) { $0 + ($1 == 10 ? 1 : 0) }
            if let last = data.last, last != 10 { n += 1 }
            s.add += n
            ghLock.lock()
            if lineCache.count > 2000 { lineCache.removeAll() }
            lineCache[full] = (mtime, Int(st.st_size), n)
            ghLock.unlock()
        }
        s.files = files

        if !s.detached {
            ghLock.lock()
            let known = everCache.contains(key)
            ghLock.unlock()
            if known { s.everCommitted = true }
            else if (Int(text(read(dir, ["rev-list", "-g", "--count", "refs/heads/" + s.branch]))) ?? 0) > 1 {
                s.everCommitted = true
                ghLock.lock()
                everCache.insert(key)
                ghLock.unlock()
            }
        }
        if let gh = ghPath() {
            s.ghInstalled = true
            if let remote = s.remote, remote.kind == "github" || remote.kind == "other" && !remote.host.isEmpty {
                let a = ghAuth(gh, host: remote.host)
                // A host gh is signed in on that isn't github.com is a GitHub Enterprise one.
                if remote.kind == "other", a.ok { s.remote?.kind = "ghe" }
                s.ghSignedIn = a.ok && (s.remote?.kind == "github" || s.remote?.kind == "ghe")
                s.ghUser = s.ghSignedIn ? a.user : nil
            }
        }
        return s
    }

    /// A merged PR counts only while this branch is what was merged: checked at every look (one cheap git run), not only when the PR
    /// is fetched, so a commit made after the merge takes the "merged" away at once.
    static func revalidate(_ s: inout WorktreeStatus) {
        guard var p = s.pr, p.state == "MERGED" || p.state == "STALE", !s.gone, !s.detached else { return }
        let inside = !p.headSha.isEmpty && exec(s.top, ["merge-base", "--is-ancestor", "HEAD", p.headSha], timeout: 10, locks: false)?.status == 0
        p.state = inside ? "MERGED" : "STALE"
        s.pr = p
    }

    /// The pull request of the branch (gh pr view), only when gh is signed in on the host and the branch is on the remote. Nil: none
    /// (or no way to ask). Errors count as none, the old answer is kept by the caller.
    static func prStatus(_ s: WorktreeStatus) -> (pr: GitPR?, ok: Bool) {
        // Not signed in, offline or nothing pushed yet: unknown, so the last answer stays (a signed-out gh doesn't wipe a PR).
        guard s.ghSignedIn, let gh = ghPath(), let remote = s.remote, !s.detached, !s.gone else { return (nil, false) }
        guard s.upstream != nil || s.pr != nil else { return (nil, true) }
        let repo = remote.owner + "/" + remote.repo
        let fields = "number,url,title,state,isDraft,mergeable,mergeStateStatus,reviewDecision,latestReviews,statusCheckRollup,headRefOid,baseRefName"
        guard let r = run(gh, in: s.top, ["pr", "view", s.pushRemote.map { $0.owner + ":" + s.branch } ?? s.branch, "--repo", repo, "--json", fields], env: ghEnv(remote.host), timeout: 30) else { return (nil, false) }
        if r.status != 0 {
            let err = String(decoding: r.err, as: UTF8.self)
            // "no pull requests found": none. Anything else (offline, signed out): unknown.
            return (nil, err.contains("no pull requests found"))
        }
        guard let obj = (try? JSONSerialization.jsonObject(with: r.out)) as? [String: Any] else { return (nil, false) }
        var p = GitPR()
        p.number = (obj["number"] as? NSNumber)?.intValue ?? 0
        p.url = obj["url"] as? String ?? ""
        p.title = obj["title"] as? String ?? ""
        p.state = obj["state"] as? String ?? ""
        p.draft = obj["isDraft"] as? Bool ?? false
        p.mergeable = obj["mergeable"] as? String ?? ""
        p.mergeState = obj["mergeStateStatus"] as? String ?? ""
        p.review = obj["reviewDecision"] as? String ?? ""
        p.headSha = obj["headRefOid"] as? String ?? ""
        p.baseRef = obj["baseRefName"] as? String ?? ""
        for rev in obj["latestReviews"] as? [[String: Any]] ?? [] {
            let state = rev["state"] as? String ?? ""
            if state == "APPROVED" || state == "CHANGES_REQUESTED", let login = (rev["author"] as? [String: Any])?["login"] as? String {
                p.reviewBy = login
                if state == "CHANGES_REQUESTED" { break }
            }
        }
        var c = GitChecks()
        for item in obj["statusCheckRollup"] as? [[String: Any]] ?? [] {
            let name = (item["name"] as? String) ?? (item["context"] as? String) ?? "check"
            if item["__typename"] as? String == "StatusContext" {
                switch item["state"] as? String ?? "" {
                case "PENDING", "EXPECTED": c.running.append(name)
                case "FAILURE", "ERROR": c.failed.append(name)
                default: c.passed.append(name)
                }
            } else if (item["status"] as? String ?? "") != "COMPLETED" {
                c.running.append(name)
            } else {
                switch item["conclusion"] as? String ?? "" {
                case "FAILURE", "CANCELLED", "TIMED_OUT", "ACTION_REQUIRED", "STARTUP_FAILURE", "ERROR": c.failed.append(name)
                default: c.passed.append(name)
                }
            }
        }
        c.kind = !c.failed.isEmpty ? "fail" : !c.running.isEmpty ? "run" : !c.passed.isEmpty ? "pass" : "none"
        p.checks = c
        // A merged PR of this name counts only when this branch IS what was merged (or sits inside it): a branch made again under an
        // old name, or commits made after the merge, are new work that nothing has saved.
        if p.state == "MERGED" {
            let inside = !p.headSha.isEmpty && exec(s.top, ["merge-base", "--is-ancestor", "HEAD", p.headSha], timeout: 10, locks: false)?.status == 0
            if !inside { p.state = "STALE" }
        }
        return (p, true)
    }

    // MARK: what the sheets show

    struct Commit { let hash: String, subject: String, body: String }

    /// The commits of the branch not in the base, oldest first (at most 100).
    static func commits(_ s: WorktreeStatus) -> [Commit] {
        guard !s.baseRev.isEmpty else { return [] }
        let raw = read(s.top, ["log", "--reverse", "-n", "100", "--format=%h%x1f%s%x1f%b%x1e", "\(s.baseRev)..HEAD"]) ?? ""
        return raw.components(separatedBy: "\u{1e}").compactMap { rec in
            let f = rec.trimmingCharacters(in: .whitespacesAndNewlines).components(separatedBy: "\u{1f}")
            guard f.count >= 2, !f[0].isEmpty else { return nil }
            return Commit(hash: f[0], subject: f[1], body: f.count > 2 ? f[2...].joined(separator: "\u{1f}").trimmingCharacters(in: .whitespacesAndNewlines) : "")
        }
    }

    private static func template(_ top: String) -> String? {
        for rel in [".github/pull_request_template.md", ".github/PULL_REQUEST_TEMPLATE.md", "docs/pull_request_template.md",
                    "docs/PULL_REQUEST_TEMPLATE.md", "pull_request_template.md", "PULL_REQUEST_TEMPLATE.md"] {
            var st = stat()
            let p = top + "/" + rel
            guard lstat(p, &st) == 0, (st.st_mode & S_IFMT) == S_IFREG, st.st_size < 20_000, let t = try? String(contentsOfFile: p, encoding: .utf8) else { continue }
            return t.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        return nil
    }

    /// The branches a pull request can go into (the remote's), the base first.
    private static func intoBranches(_ s: WorktreeStatus) -> (list: [String], note: String?) {
        guard let remote = s.remote else { return ([s.base], nil) }
        let prefix = remote.name + "/"
        var all = lines(read(s.top, ["for-each-ref", "--format=%(refname:short)", "refs/remotes/" + remote.name]))
            .filter { $0 != remote.name && $0 != prefix + "HEAD" && $0.hasPrefix(prefix) }.map { String($0.dropFirst(prefix.count)) }
        if all.isEmpty { return ([s.base], nil) }
        var note: String?
        let order = ["main", "master", "develop"]
        all.sort { a, b in
            let ia = a == s.base ? -1 : (order.firstIndex(of: a) ?? 99), ib = b == s.base ? -1 : (order.firstIndex(of: b) ?? 99)
            return ia != ib ? ia < ib : a < b
        }
        if !all.contains(s.base) {
            let def = text(read(s.top, ["symbolic-ref", "-q", "refs/remotes/\(remote.name)/HEAD"])).replacingOccurrences(of: "refs/remotes/\(prefix)", with: "")
            let first = all.contains(def) ? def : all[0]
            all.removeAll { $0 == first }
            all.insert(first, at: 0)
            note = "\(s.base) isn't on \(remote.name) yet, so the PR goes into \(first)."
        }
        return (all, note)
    }

    /// A file name that looks like it holds a secret (keys, tokens, .env files that aren't examples).
    static func looksSecret(_ path: String) -> Bool {
        let n = (path as NSString).lastPathComponent.lowercased()
        if n.hasPrefix(".env") { return !(n.hasSuffix(".example") || n.hasSuffix(".sample") || n.hasSuffix(".template") || n.hasSuffix(".dist")) }
        if [".pem", ".p12", ".pfx", ".key", ".keystore", ".jks", ".ppk"].contains(where: { n.hasSuffix($0) }) { return true }
        return ["secret", "credential", "id_rsa", "id_ed25519", "id_ecdsa", "service-account", "serviceaccount", ".npmrc", ".pypirc", ".netrc", "token"].contains { n.contains($0) }
    }

    static let bigFile = 50 << 20

    /// What isn't committed yet, as `add -A` would take it: path, size, and whether it looks like a secret or is too big to push.
    static func leftovers(_ dir: String) -> [[String: Any]] {
        let raw = (read(dir, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]) ?? "").components(separatedBy: "\0")
        var out: [[String: Any]] = []
        var i = 0
        while i < raw.count {
            let e = raw[i]
            i += 1
            guard e.count >= 4 else { continue }
            let path = String(e.dropFirst(3))
            if e.hasPrefix("R") || e.hasPrefix("C") { i += 1 }
            if out.count >= 200 { continue }
            var st = stat()
            let size = lstat(dir + "/" + path, &st) == 0 ? Int(st.st_size) : 0
            out.append(["path": path, "size": size, "secret": looksSecret(path), "big": size > bigFile])
        }
        return out
    }

    /// The Create PR sheet's data.
    static func createPage(_ s: WorktreeStatus) -> [String: Any] {
        let cs = commits(s)
        let into = intoBranches(s)
        var body = cs.map { "- " + $0.subject }.joined(separator: "\n")
        var single = false
        if cs.count == 1 { body = cs[0].body; single = true }
        let tpl = template(s.top)
        if let tpl { body = body.isEmpty ? tpl : tpl + "\n\n" + body }
        var o: [String: Any] = ["commits": cs.map { ["hash": $0.hash, "subject": $0.subject] }, "body": body, "into": into.list,
                                "leftovers": leftovers(s.top),
                                "singleCommit": single && !cs[0].subject.isEmpty ? cs[0].subject : "",
                                // A repo with workflows most likely runs checks on the PR: the done page says so.
                                "hasWorkflows": pathExists(s.top + "/.github/workflows")]
        if let n = into.note { o["intoNote"] = n }
        return o
    }

    /// `merge-tree` would run the merge drivers the repo's own config names (a repo that came in a zip can name any command): each
    /// is replaced by `false` for the check. Never `true`: that means "resolved", and the check would call a conflict clean. The user's own global drivers stay.
    static func mergeDriverGuards(_ dir: String) -> [String] {
        var args: [String] = []
        if let r = exec(dir, ["config", "--show-scope", "--includes", "--name-only", "--get-regexp", "^merge\\..+\\.driver$"], timeout: 6, locks: false), r.status == 0 {
            for line in String(decoding: r.out, as: UTF8.self).split(separator: "\n") {
                let f = line.trimmingCharacters(in: .whitespacesAndNewlines).split(separator: "\t", maxSplits: 1).map(String.init)
                if f.count == 2, f[0] == "local" || f[0] == "worktree" { args += ["-c", f[1] + "=false"] }
            }
        }
        return args
    }

    /// The conflict check of a local merge: what the merge would conflict on, what's in the way in the base's folder (spec 7.2).
    static func mergeCheck(_ s: WorktreeStatus) -> [String: Any] {
        var o: [String: Any] = ["conflicts": [String](), "blocked": [String](), "inMiddle": false]
        guard !s.baseRev.isEmpty, !s.detached, s.branch != s.base else { o["problem"] = "nobase"; return o }
        // Commits only: what isn't committed yet is committed first, then this runs again.
        if let r = exec(s.top, mergeDriverGuards(s.top) + ["merge-tree", "--write-tree", "--name-only", "--no-messages", s.baseRev, s.branch], timeout: 30, locks: false) {
            if r.status == 1 {
                var files: [String] = []
                for line in String(decoding: r.out, as: UTF8.self).components(separatedBy: "\n").dropFirst() {
                    if line.isEmpty { break }
                    if !files.contains(line) { files.append(line) }
                }
                o["conflicts"] = files
            } else if r.status != 0 {
                o["problem"] = said(r)
            }
        } else {
            o["problem"] = "git didn't start"
        }
        if let bf = s.baseFolder, pathExists(bf) {
            let changed = Set(lines(read(bf, ["diff", "--name-only", "\(s.baseRev)...\(s.branch)"])))
            o["changed"] = changed.count
            var theirs: [String] = []
            let entries = (read(bf, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]) ?? "").components(separatedBy: "\0")
            var i = 0
            while i < entries.count {
                let e = entries[i]
                i += 1
                guard e.count >= 4 else { continue }
                theirs.append(String(e.dropFirst(3)))
                if e.hasPrefix("R") || e.hasPrefix("C") { i += 1 }
            }
            o["blocked"] = theirs.filter { changed.contains($0) }
            let gitDir = text(read(bf, ["rev-parse", "--absolute-git-dir"]))
            if !gitDir.isEmpty {
                o["inMiddle"] = ["MERGE_HEAD", "rebase-merge", "rebase-apply", "CHERRY_PICK_HEAD"].contains { pathExists(gitDir + "/" + $0) }
            }
        }
        o["newCommits"] = s.ahead + (s.dirty > 0 ? 1 : 0)
        o["commits"] = commits(s).map { ["hash": $0.hash, "subject": $0.subject] }
        return o
    }

    /// The merge-PR sheet's extra: the way GitHub merges here, and for a conflict, which files.
    static func prMergePage(_ s: WorktreeStatus) -> [String: Any] {
        var o: [String: Any] = ["method": "merge"]
        guard let remote = s.remote, let gh = ghPath(), let pr = s.pr else { return o }
        let repo = remote.owner + "/" + remote.repo
        if let r = run(gh, in: s.top, ["repo", "view", repo, "--json", "mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed"], env: ghEnv(remote.host), timeout: 20),
           r.status == 0, let obj = (try? JSONSerialization.jsonObject(with: r.out)) as? [String: Any] {
            if obj["mergeCommitAllowed"] as? Bool == true { o["method"] = "merge" }
            else if obj["squashMergeAllowed"] as? Bool == true { o["method"] = "squash" }
            else if obj["rebaseMergeAllowed"] as? Bool == true { o["method"] = "rebase" }
        }
        if pr.mergeable == "CONFLICTING", !pr.baseRef.isEmpty {
            // No fetch here (opening a sheet doesn't use the network): the remote-tracking branch as it is.
            if let r = exec(s.top, mergeDriverGuards(s.top) + ["merge-tree", "--write-tree", "--name-only", "--no-messages", "\(remote.name)/\(pr.baseRef)", s.branch], timeout: 30, locks: false), r.status == 1 {
                var files: [String] = []
                for line in String(decoding: r.out, as: UTF8.self).components(separatedBy: "\n").dropFirst() {
                    if line.isEmpty { break }
                    if !files.contains(line) { files.append(line) }
                }
                o["conflicts"] = files
            }
        }
        return o
    }

    /// The Delete sheet's data: is the branch's work saved somewhere else (spec 9.1), how many commits are only here, commits that only
    /// a detached HEAD holds (they die with the folder: removing a worktree removes its HEAD's reflog), and worktrees inside this one.
    /// Read again by deleteWorktree itself: what the sheet showed may be old by the time it is pressed.
    static func deletePage(_ s: WorktreeStatus) -> [String: Any] {
        var reason = ""
        if s.detached { reason = "" }
        else if s.pr?.state == "MERGED", !s.pr!.headSha.isEmpty,
                exec(s.main, ["merge-base", "--is-ancestor", "refs/heads/" + s.branch, s.pr!.headSha], timeout: 10, locks: false)?.status == 0 { reason = "pr" }
        else if !s.baseRev.isEmpty, exec(s.main, ["merge-base", "--is-ancestor", "refs/heads/" + s.branch, s.baseRev], timeout: 10, locks: false)?.status == 0 { reason = "base" }
        else if s.upstream != nil, s.unpushed == 0 { reason = "origin" }
        let only = s.upstream == nil ? s.ahead : (s.unpushed ?? s.ahead)
        var orphans = 0
        if s.detached, !s.gone {
            orphans = Int(text(read(s.top, ["rev-list", "--count", "HEAD", "--not", "--branches", "--remotes"]))) ?? 0
        }
        let nested = worktreeList(s.main).map(\.path).filter { $0 != s.top && $0.hasPrefix(s.top + "/") }
        return ["safe": !reason.isEmpty, "safeReason": reason, "onlyHere": s.detached ? 0 : only, "orphans": orphans,
                "orphanSha": String(s.localSha.prefix(7)), "nested": nested]
    }

    // MARK: Create PR

    private static func failure(_ title: String, _ text: String = "", git: String = "", committed: Int = 0, pushed: Bool = false, kind: String = "git") -> [String: Any] {
        ["kind": kind, "title": title, "text": text, "git": git, "committed": committed, "pushed": pushed]
    }

    /// Commits what's left (hooks run: the user's commit, as Source Control's), with `message`. Nil: done; else the failure.
    private static func commitAll(_ s: WorktreeStatus, _ message: String, in dir: String) -> [String: Any]? {
        guard let add = exec(dir, ["add", "-A"], timeout: 60, locks: true), add.status == 0 else {
            return failure("Git couldn't commit the files.", "Nothing was sent.", git: said(exec(dir, ["status", "--short"], timeout: 5, locks: false)), kind: "commit")
        }
        let r = exec(dir, ["commit", "-m", message], timeout: 120, locks: true)
        guard let r, r.status == 0 else {
            return failure("Git couldn't commit the files.", "Nothing was sent.", git: said(r), kind: "commit")
        }
        return nil
    }

    /// Commit what's left, push the branch, then the pull request: with gh when it's signed in, else the host's form in the browser
    /// (returned as `browser`, the app opens it). `step` is told "commit", "push" and "pr" as each starts.
    static func createPR(top: String, title: String, body: String, into: String, step: @escaping (String) -> Void) -> [String: Any] {
        guard var s = worktreeStatus(top: top), !s.detached, s.branch != s.base else { return failure("There's nothing to send.", "This worktree isn't on a branch of its own.", kind: "nothing") }
        guard let remote = s.remote else { return failure("This repo has no remote to send it to.", kind: "nothing") }
        let title = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !title.isEmpty else { return failure("Write a title first.", kind: "nothing") }
        let into = into.isEmpty ? s.base : into
        var committed = 0
        if s.dirty > 0 {
            // `add -A` takes everything: a file this big can't be pushed (GitHub stops at 100 MB), and it would stay in the commit.
            if let big = leftovers(s.top).first(where: { $0["big"] as? Bool == true }) {
                return failure("\(big["path"] as? String ?? "A file") is too big to send.", "Files over 50 MB don't go in a pull request. Nothing was committed or sent.", kind: "nothing")
            }
            step("commit")
            committed = s.dirty
            if let fail = commitAll(s, title, in: s.top) { return fail }
            s = worktreeStatus(top: top) ?? s
        }
        step("push")
        // The user's own ssh settings stay (several accounts, other keys); no terminal means no question, only a failure.
        let pushName = s.pushRemote?.name ?? remote.name
        let push = exec(s.top, ["push", "-u", pushName, "HEAD:refs/heads/" + s.branch], timeout: 120, locks: true)
        let sentNote = committed > 0 ? "The \(committed) file\(committed == 1 ? "" : "s") \(committed == 1 ? "is" : "are") committed; nothing was sent." : "Nothing was sent."
        guard let push, push.status == 0 else {
            let err = String(decoding: push?.err ?? Data(), as: UTF8.self)
            let last = said(push)
            if push?.status == -1 { return failure("Git took too long to push.", "Nothing else was done.", committed: committed) }
            if err.contains("could not read Username") || err.contains("Authentication failed") || err.contains("terminal prompts disabled") || err.contains("could not read Password") {
                return failure("Git couldn't push \(s.branch).", "It needs your \(remote.label) sign-in, and Orbiterm can't ask for it. \(sentNote) Sign in once in a terminal with gh auth login, then try again.", git: last, committed: committed)
            }
            if err.contains("passphrase") {
                return failure("Git couldn't push \(s.branch).", "Your SSH key needs its passphrase. Add it to the keychain once (ssh-add --apple-use-keychain), then try again.", git: last, committed: committed)
            }
            if err.contains("Permission denied") || err.contains("Could not read from remote repository") {
                return failure("Git couldn't push \(s.branch).", "\(pushName) didn't accept the key or account git used. \(sentNote)", git: last, committed: committed)
            }
            if err.contains("non-fast-forward") || err.contains("fetch first") || err.contains("[rejected]") {
                return failure("Git didn't push \(s.branch).", "\(s.branch) on \(remote.name) has commits this one doesn't. Pull them in first (Source Control \u{203A} Pull), then try again.", git: last, committed: committed)
            }
            return failure("Git couldn't push \(s.branch).", sentNote, git: last, committed: committed)
        }
        step("pr")
        let repo = remote.owner + "/" + remote.repo
        // Pushed to a fork: the pull request names where the branch is.
        let headRef = s.pushRemote.map { $0.owner + ":" + s.branch } ?? s.branch
        if s.ghSignedIn, let gh = ghPath() {
            let data = Data(body.replacingOccurrences(of: "\r\n", with: "\n").utf8)
            let r = run(gh, in: s.top, ["pr", "create", "--repo", repo, "--base", into, "--head", headRef, "--title", title, "--body-file", "-"],
                        env: ghEnv(remote.host), timeout: 60, input: data)
            let out = String(decoding: r?.out ?? Data(), as: UTF8.self) + "\n" + String(decoding: r?.err ?? Data(), as: UTF8.self)
            func url(_ t: String) -> String? { t.split(whereSeparator: { $0 == " " || $0 == "\n" }).map(String.init).last { $0.hasPrefix("https://") && $0.contains("/pull/") } }
            if let u = url(out), r?.status == 0 || out.contains("already exists") {
                let n = Int(u.split(separator: "/").last ?? "") ?? 0
                return ["ok": true, "url": u, "number": n, "pushed": true]
            }
            if r?.status == -1 { return failure("GitHub didn't make the PR.", "\(s.branch) is on \(remote.name). It took too long.", pushed: true, kind: "gh") }
            return failure("GitHub didn't make the PR.", "\(s.branch) is on \(remote.name).", git: said(r), pushed: true, kind: "gh")
        }
        if let u = browserURL(remote, branch: headRef, into: into, title: title, body: body) { return ["ok": true, "browser": u, "pushed": true] }
        return ["ok": true, "pushedOnly": true, "pushed": true]
    }

    // MARK: Merge (local, no PR)

    /// `git merge` of the branch into the base: in the base's folder when it has one, else by moving the base's ref without touching
    /// any folder. A conflict found at the last moment is undone at once.
    static func mergeLocal(top: String, message: String, step: @escaping (String) -> Void) -> [String: Any] {
        guard var s = worktreeStatus(top: top), !s.detached, s.branch != s.base, !s.baseRev.isEmpty else { return failure("There's nothing to merge.", kind: "nothing") }
        var committed = 0
        if s.dirty > 0 {
            step("commit")
            committed = s.dirty
            let msg = message.trimmingCharacters(in: .whitespacesAndNewlines)
            if msg.isEmpty { return failure("Write a message for the \(s.dirty) files first.", kind: "nothing") }
            if let fail = commitAll(s, msg, in: s.top) { return fail }
            s = worktreeStatus(top: top) ?? s
        }
        let check = mergeCheck(s)
        let conflicts = check["conflicts"] as? [String] ?? []
        if !conflicts.isEmpty { return ["kind": "conflict", "conflicts": conflicts, "committed": committed] }
        if let blocked = check["blocked"] as? [String], !blocked.isEmpty { return ["kind": "blocked", "blocked": blocked, "committed": committed] }
        if check["inMiddle"] as? Bool == true { return ["kind": "middle", "committed": committed] }
        let before = s.ahead // counted after the leftovers were committed
        step("merge")
        let branch = s.branch
        if let bf = s.baseFolder, pathExists(bf) {
            let r = exec(bf, ["merge", "--no-edit", "--no-overwrite-ignore", "--", branch], timeout: 120, locks: true)
            if r?.status != 0 {
                if let st = exec(bf, ["rev-parse", "-q", "--verify", "MERGE_HEAD"], timeout: 10, locks: false), st.status == 0 {
                    _ = exec(bf, ["merge", "--abort"], timeout: 30, locks: true)
                    return failure("Git stopped: \(s.base) changed while merging.", "Nothing was changed.", git: said(r), committed: committed)
                }
                return failure("Git couldn't merge \(branch).", "Nothing was changed.", git: said(r), committed: committed)
            }
        } else {
            guard s.baseRev == s.base else { return failure("\(s.base) isn't on this Mac.", "Create a PR instead.", kind: "nothing") }
            // Moving the ref under a worktree that has the base checked out (its folder missing: a drive that isn't there) would leave
            // that worktree's files and index behind it.
            if let w = worktreeList(s.top).first(where: { $0.branch == s.base }) {
                return failure("\(s.base) is checked out in a worktree whose folder isn't there.", "\(w.path) \u{2014} bring the folder back, or run git worktree prune, then try again.", kind: "nothing")
            }
            guard let baseSha = read(s.top, ["rev-parse", "--verify", "refs/heads/" + s.base]).map(text),
                  let branchSha = read(s.top, ["rev-parse", "--verify", "refs/heads/" + branch]).map(text) else {
                return failure("Git couldn't read the branches.", "Nothing was changed.", committed: committed)
            }
            let ancestor = exec(s.top, ["merge-base", "--is-ancestor", baseSha, branchSha], timeout: 10, locks: false)
            var target = branchSha
            if ancestor?.status != 0 {
                guard let t = exec(s.top, mergeDriverGuards(s.top) + ["merge-tree", "--write-tree", "--no-messages", baseSha, branchSha], timeout: 30, locks: false), t.status == 0 else {
                    return failure("Git stopped: \(s.base) changed while merging.", "Nothing was changed.", committed: committed)
                }
                let tree = text(String(decoding: t.out, as: UTF8.self).components(separatedBy: "\n").first)
                guard let c = exec(s.top, ["commit-tree", tree, "-p", baseSha, "-p", branchSha, "-m", "Merge branch '\(branch)' into \(s.base)"], timeout: 30, locks: true), c.status == 0 else {
                    return failure("Git couldn't make the merge commit.", "Nothing was changed.", git: said(exec(s.top, ["status", "--short"], timeout: 5, locks: false)), committed: committed)
                }
                target = text(String(decoding: c.out, as: UTF8.self))
            }
            let u = exec(s.top, ["update-ref", "-m", "orbiterm: merge \(branch)", "refs/heads/" + s.base, target, baseSha], timeout: 10, locks: true)
            guard u?.status == 0 else { return failure("Git stopped: \(s.base) changed while merging.", "Nothing was changed.", git: said(u), committed: committed) }
        }
        return ["ok": true, "base": s.base, "commits": before, "baseFolder": s.baseFolder ?? ""]
    }

    /// "Push develop": the base branch itself, whatever the folders are on (the upstream is set when there is none). Never a bare
    /// `git push`, which sends the branch a folder happens to be on.
    static func pushBase(top: String) -> [String: Any] {
        guard let s = worktreeStatus(top: top), let remote = s.remote else { return failure("This repo has no remote to send it to.", kind: "nothing") }
        guard s.baseRev == s.base else { return failure("\(s.base) isn't on this Mac.", kind: "nothing") }
        let dir = (s.baseFolder.flatMap { pathExists($0) ? $0 : nil }) ?? s.main
        let hasUp = !text(read(dir, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", s.base + "@{u}"])).isEmpty
        let r = exec(dir, ["push"] + (hasUp ? [] : ["-u"]) + [remote.name, "refs/heads/\(s.base):refs/heads/\(s.base)"], timeout: 120, locks: true)
        guard let r, r.status == 0 else { return failure("Git couldn't push \(s.base).", git: said(r)) }
        return ["ok": true]
    }

    // MARK: Merge PR

    static func mergePR(top: String, number: Int, sha: String, method: String) -> [String: Any] {
        guard let s = worktreeStatus(top: top), let remote = s.remote, let gh = ghPath() else { return failure("GitHub CLI isn't available.", kind: "nothing") }
        let repo = remote.owner + "/" + remote.repo
        let flag = method == "squash" ? "--squash" : method == "rebase" ? "--rebase" : "--merge"
        var args = ["pr", "merge", String(number), "--repo", repo, flag]
        if !sha.isEmpty { args += ["--match-head-commit", sha] }
        let r = run(gh, in: s.top, args, env: ghEnv(remote.host), timeout: 60)
        let out = String(decoding: r?.out ?? Data(), as: UTF8.self) + "\n" + String(decoding: r?.err ?? Data(), as: UTF8.self)
        guard r?.status == 0 else {
            if out.contains("Head branch was modified") || out.contains("head branch was modified") || out.contains("match-head-commit") {
                return failure("\(s.branch) changed since this was opened.", "Look again, then merge.", git: said(r), kind: "gh")
            }
            return failure("GitHub didn't merge the PR.", "", git: said(r), kind: "gh")
        }
        let queued = out.contains("merge queue") || out.contains("will be automatically merged") || out.contains("auto-merge")
        return ["ok": true, "queued": queued]
    }

    // MARK: Clean Up: is the worktree's work somewhere else?

    /// What Clean Up knows of a worktree's work (spec 3.6): `done` when everything in it is also in the base (`text` says how);
    /// else `text` says what isn't, with the counts. `unknown`: it can't be told (no base, too many changes, git failed).
    struct CleanupProof {
        var done = false, unknown = false
        var text = ""
        var files = 0, commits = 0
        /// What the proof was made from, to keep it for ten minutes.
        var key = ""
    }

    /// What a worktree's proof is made from: its commit, its index and what `status` says is changed. The proof is kept ten minutes
    /// while this stays the same.
    static func cleanupProofKey(top: String) -> String {
        let head = text(read(top, ["rev-parse", "HEAD"]))
        let gitDir = text(read(top, ["rev-parse", "--absolute-git-dir"]))
        var ix = stat()
        let indexTime = stat(gitDir + "/index", &ix) == 0 ? Double(ix.st_mtimespec.tv_sec) : 0
        // Every changed or new file with its time and size: editing one changes the key.
        var paths = Set<String>()
        for args in [["ls-files", "-z", "--modified", "--others", "--exclude-standard"], ["diff", "--cached", "--name-only", "-z", "--no-renames"]] {
            for p in (read(top, args) ?? "").split(separator: "\0") { paths.insert(String(p)) }
        }
        var sig = ""
        for p in paths.sorted().prefix(3000) {
            var st = stat()
            sig += lstat(top + "/" + p, &st) == 0 ? "\(p):\(st.st_mtimespec.tv_sec).\(st.st_mtimespec.tv_nsec):\(st.st_size);" : "\(p):gone;"
        }
        return "\(top)\0\(head)\0\(indexTime)\0\(paths.count)\0\(sig.hashValue)"
    }

    /// Whether everything a worktree holds is in its base already, by content and not by commits: a squash merge leaves the
    /// commits out of the base but every file's content in it. Reads only (no network, `readGuards`, no locks). The paths
    /// that differ from where the branch left the base (committed, changed, or new and not ignored) are looked at one by
    /// one: the blob they have now has to be one the base's history has had at that path. Anything unclear is "not done".
    static func cleanupProof(top: String, pr: GitPR? = nil) -> CleanupProof {
        var r = CleanupProof()
        guard var s = worktreeStatus(top: top, known: nil, strict: true) else { r.unknown = true; r.text = "Can't tell what's in main"; return r }
        s.pr = pr
        revalidate(&s)
        let base = s.base.isEmpty ? "main" : s.base
        if s.baseRev.isEmpty || s.mergeBase.isEmpty { r.unknown = true; r.text = "Can't tell what's in \(base)"; return r }
        let guards = readGuards(top)
        func list(_ args: [String]) -> [String]? {
            guard let o = exec(top, guards + args, timeout: 60, locks: false), o.status == 0 else { return nil }
            return String(decoding: o.out, as: UTF8.self).split(separator: "\0", omittingEmptySubsequences: true).map(String.init)
        }
        guard let tracked = list(["diff", "--name-only", "-z", "--no-renames", "--no-ext-diff", "--no-textconv", s.mergeBase]),
              let others = list(["ls-files", "-z", "--others", "--exclude-standard"]) else { r.unknown = true; r.text = "Can't tell what's in \(base)"; return r }
        var paths: [String] = []
        var seen = Set<String>()
        for p in tracked + others where seen.insert(p).inserted { paths.append(p) }
        r.key = cleanupProofKey(top: top)
        // Merged (a PR, or the base holds every commit) is only the answer when nothing changed since: a merged branch with
        // new uncommitted or untracked work goes on to the content check below like any other.
        let mergedText = pr?.state == "MERGED" && (pr?.number ?? 0) > 0 ? "Merged \u{00B7} PR #\(pr!.number)" : "All its work is in \(base)"
        if s.phase == "merged" { r.done = true; r.text = mergedText; return r }
        if paths.isEmpty, s.ahead == 0 { r.done = true; r.text = "No changes"; return r }
        if paths.count > 2000 { r.unknown = true; r.text = "Too many changes to check"; return r }
        // The blob each path has now (clean filters, line endings as git would store it). A name with a line break can't be
        // sent one per line: it isn't proven. A folder (a nested repo) can't be hashed either.
        var current: [String: String] = [:]
        var unproven = Set<String>()
        var gone: [String] = []
        var onDisk: [String] = []
        for p in paths {
            var st = stat()
            if p.contains("\n") { unproven.insert(p); continue }
            if lstat(top + "/" + p, &st) != 0 { gone.append(p); continue }
            if (st.st_mode & S_IFMT) == S_IFDIR { unproven.insert(p); continue }
            onDisk.append(p)
        }
        if !onDisk.isEmpty {
            let input = Data((onDisk.joined(separator: "\n") + "\n").utf8)
            guard let h = exec(top, guards + ["hash-object", "--stdin-paths"], timeout: 120, locks: false, input: input), h.status == 0 else {
                r.unknown = true; r.text = "Can't tell what's in \(base)"; return r
            }
            let oids = String(decoding: h.out, as: UTF8.self).split(separator: "\n").map(String.init)
            if oids.count == onDisk.count { for (p, o) in zip(onDisk, oids) { current[p] = o } } else { for p in onDisk { unproven.insert(p) } }
        }
        // A deleted path is in the base's way of things when the base doesn't have the file at its tip either.
        for p in gone where exec(s.main, guards + ["cat-file", "-e", "\(s.baseRev):\(p)"], timeout: 20, locks: false)?.status == 0 { unproven.insert(p) }
        // The base's history of those paths: every blob each has had.
        var history: [String: Set<String>] = [:]
        var revs = [s.baseRev]
        if let remote = s.remote?.name, !remote.isEmpty {
            let origin = "\(remote)/\(base)"
            if origin != s.baseRev, read(s.main, ["rev-parse", "--verify", "-q", "refs/remotes/\(origin)"]) != nil { revs.append(origin) }
        }
        let wanted = Array(current.keys)
        for rev in revs {
            var i = 0
            while i < wanted.count {
                let chunk = Array(wanted[i..<min(i + 400, wanted.count)])
                i += 400
                guard let o = exec(s.main, guards + ["--literal-pathspecs", "log", rev, "--raw", "--no-abbrev", "--no-renames", "-z", "--format=", "--"] + chunk,
                                   timeout: 120, locks: false), o.status == 0 else { r.unknown = true; r.text = "Can't tell what's in \(base)"; return r }
                // :<mode> <mode> <old> <new> <letter> NUL <path> NUL; the gaps between commits aren't records.
                let tokens = String(decoding: o.out, as: UTF8.self).split(separator: "\0", omittingEmptySubsequences: true).map(String.init)
                var k = 0
                while k < tokens.count {
                    let t = tokens[k]
                    if t.hasPrefix(":"), k + 1 < tokens.count {
                        let f = t.split(separator: " ")
                        if f.count >= 5 { history[tokens[k + 1], default: []].insert(String(f[3])) }
                        k += 2
                    } else { k += 1 }
                }
            }
        }
        var missing: [String] = Array(unproven)
        for (p, oid) in current where history[p]?.contains(oid) != true { missing.append(p) }
        if missing.isEmpty { r.done = true; r.text = s.phase == "merged" ? mergedText : "All its work is in \(base)"; return r }
        // Not committed: new files, files changed since the last commit or staged.
        var dirtySet = Set(others)
        for p in list(["ls-files", "-z", "--modified"]) ?? [] { dirtySet.insert(p) }
        for p in list(["diff", "--cached", "--name-only", "-z", "--no-renames", "--no-ext-diff", "--no-textconv"]) ?? [] { dirtySet.insert(p) }
        let uncommitted = missing.filter { dirtySet.contains($0) }
        if !uncommitted.isEmpty || s.ahead == 0 {
            r.files = missing.count
            r.text = missing.count == 1 ? "1 file isn't in \(base) yet" : "\(missing.count) files aren't in \(base) yet"
        } else {
            r.commits = s.ahead
            r.text = s.ahead == 1 ? "1 commit isn't in \(base) yet" : "\(s.ahead) commits aren't in \(base) yet"
        }
        return r
    }

    // MARK: Delete

    /// The folder to the Trash, its record out of git, and the branch when asked (the caller ended the chats and checked that the
    /// branch is safe or that the user knows it isn't). The first failure stops it, saying what is left.
    /// What stops a delete (nil: nothing does): looked at before any chat ends, and again before anything is moved.
    static func deleteCheck(top: String, deleteBranch: Bool, force: Bool, expect: String, known: WorktreeStatus?) -> [String: Any]? {
        // A fresh look is needed: with the old state a commit that came since could go with the branch.
        guard var s = worktreeStatus(top: top, known: known, strict: true) else {
            return failure("Git couldn't read this worktree right now.", "Nothing was deleted. Try again in a moment.", kind: "nothing")
        }
        s.pr = known?.pr
        // The sheet showed one state of the branch; commits that came since weren't looked at by the user.
        if !expect.isEmpty, s.localSha != expect {
            return failure("\(s.branch) changed since this was opened.", "Look again, then decide. Nothing was deleted.", kind: "changed")
        }
        let page = deletePage(s)
        if let nested = page["nested"] as? [String], let first = nested.first {
            return failure("Another worktree is inside this one.", "\(first) \u{2014} delete or move it first. Nothing was deleted.", kind: "nested")
        }
        if let n = page["orphans"] as? Int, n > 0 {
            return failure("\(n) commit\(n == 1 ? " is" : "s are") only on a detached HEAD.", "Deleting the worktree loses \(n == 1 ? "it" : "them") for good. Save \(n == 1 ? "it" : "them") first: git branch <name> \(page["orphanSha"] as? String ?? "HEAD").", kind: "changed")
        }
        if deleteBranch, !s.detached, page["safe"] as? Bool != true, !force {
            return failure("\(s.branch) has commits that aren't saved anywhere else.", "Look again, then decide. Nothing was deleted.", kind: "changed")
        }
        if s.locked { return failure("Git has \(s.branch) locked.", "Unlock it first: git worktree unlock \(top)", kind: "locked") }
        return nil
    }

    static func deleteWorktree(top: String, deleteBranch: Bool, force: Bool, expect: String, known: WorktreeStatus?, step: @escaping (String) -> Void) -> [String: Any] {
        if let stop = deleteCheck(top: top, deleteBranch: deleteBranch, force: force, expect: expect, known: known) { return stop }
        guard let s = worktreeStatus(top: top, known: known, strict: true) else { return failure("Git couldn't read this worktree right now.", "Nothing was deleted. Try again in a moment.", kind: "nothing") }
        let safe = ["-c", "core.hooksPath=/dev/null"]
        var sha = ""
        if !s.detached, let v = read(s.main, ["rev-parse", "--short", "refs/heads/" + s.branch]) { sha = text(v) }
        step("trash")
        if pathExists(top) {
            do { try FileManager.default.trashItem(at: URL(fileURLWithPath: top), resultingItemURL: nil) } catch {
                let ns = error as NSError
                let noTrash = ns.code == NSFeatureUnsupportedError || ns.code == NSFileWriteUnsupportedSchemeError
                return failure(noTrash ? "This disk has no Trash." : "The folder couldn't go to the Trash.",
                               noTrash ? "Delete the folder yourself, then try again." : "Nothing was deleted.", git: noTrash ? "" : error.localizedDescription, kind: "trash")
            }
        }
        // The folder is gone: git only forgets its record (never `prune`: another worktree on a drive that isn't there keeps its own).
        let rm = exec(s.main, safe + ["worktree", "remove", "--", top], timeout: 60, locks: true)
        if rm?.status != 0 {
            let err = said(rm)
            // Its record may already be gone (another git did it): fine, as long as the folder isn't registered any more.
            if worktreeList(s.main).contains(where: { Worktrees.real($0.path) == Worktrees.real(top) || $0.path == top }) {
                return failure("Git couldn't forget the worktree.", "The folder is in the Trash.", git: err, kind: "remove")
            }
        }
        var kept = !deleteBranch
        var was = sha
        if deleteBranch, !s.detached {
            step("branch")
            let r = exec(s.main, safe + ["branch", "-D", "--", s.branch], timeout: 30, locks: true)
            if r?.status == 0 {
                let out = String(decoding: r?.out ?? Data(), as: UTF8.self)
                if let w = out.range(of: "was ") { was = String(out[w.upperBound...].prefix { $0.isHexDigit }) }
            } else {
                kept = true
                return ["ok": true, "branch": s.branch, "sha": sha, "branchKept": true, "branchError": said(r)]
            }
        }
        Worktrees.forget()
        return ["ok": true, "branch": s.branch, "sha": was, "branchKept": kept]
    }
}
