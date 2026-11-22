import AppKit
import Combine

// The worktree's next step: Create PR, Merge, Delete (spec araştırma/worktree-pr/SPEC.md). This file keeps what every window
// and the chats list show about a worktree (the status, refreshed while a window of it is on screen), decides the header
// button's face, opens the sheets (web/worktree.js, in the overlay panel) and does what they ask. Nothing here runs by
// itself: no push, merge, delete or chat closing happens without a click on a sheet's own button.

/// The header button's main face: the next step.
struct ShipFace: Equatable {
    let kind: String
    let label: String
    let symbol: String
    let tip: String
    let enabled: Bool
}

/// One entry of the ▾ menu, the chats list's right-click menu and the Chat menu.
struct ShipItem: Identifiable {
    let id: String
    let title: String
    var key: String? = nil
    var enabled = true
    var tip: String? = nil
    var after = false   // a separator goes before it
}

/// What a sheet was opened for: the window it drops from, the chat's own title, who "Ask … to fix" goes to.
struct ShipSession {
    let kind: String
    let top: String
    weak var window: ChatWindowController?
    var title = ""
}

@MainActor
final class WorktreeShip: ObservableObject {
    static let shared = WorktreeShip()
    weak var manager: MainWindowController?

    /// Linked worktree folder -> where it stands. Published: the windows and the list redraw from it.
    @Published private(set) var status: [String: WorktreeStatus] = [:]
    /// Folder -> what is being done there ("Creating PR…"): a second window of the same worktree shows it too.
    @Published private(set) var busy: [String: String] = [:]
    /// Folders deleted from here in the last 30 days (their chats stay as history, saying `deleted`).
    @Published private(set) var deleted: Set<String> = []
    private(set) var session: ShipSession?

    private var gitAt: [String: Double] = [:]
    private var prAt: [String: Double] = [:]
    private var inflight = Set<String>()
    private var again = Set<String>()
    private var listTops: [String: Int] = [:]
    private var timer: Timer?
    private static let deletedKey = "worktreeDeleted"

    private init() {
        let now = nowMs()
        var map = UserDefaults.standard.dictionary(forKey: Self.deletedKey) as? [String: [String: Any]] ?? [:]
        map = map.filter { now - (($0.value["at"] as? Double) ?? 0) < 30 * 86_400_000 }
        UserDefaults.standard.set(map, forKey: Self.deletedKey)
        deleted = Set(map.keys)
    }

    // MARK: keeping the status

    /// Windows of a worktree that are on screen, and the chats list's groups while it shows: their status is read again every
    /// 20 seconds (git), the pull request every minute (gh), and sooner on events (a window coming to the front, a turn ending).
    func startTimer() {
        guard timer == nil else { return }
        timer = Timer.scheduledTimer(withTimeInterval: 20, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated {
                guard let self else { return }
                var tops = self.manager?.shipTops() ?? []
                // The chats list's groups are read only while the list can be seen.
                if self.manager?.shipListVisible() == true { tops.formUnion(self.listTops.keys) }
                for t in tops { self.refresh(t) }
            }
        }
    }

    func watchList(_ top: String) {
        listTops[top, default: 0] += 1
        startTimer()
        refresh(top)
    }

    func unwatchList(_ top: String) {
        guard let n = listTops[top] else { return }
        if n <= 1 { listTops[top] = nil } else { listTops[top] = n - 1 }
    }

    /// Reads the folder's status (git always, the PR when it is due or `pr`). Once at a time per folder, 3 seconds apart unless forced.
    func refresh(_ top: String, pr: Bool = false, force: Bool = false) {
        if deleted.contains(top) {
            // A worktree made again at the same folder is a new one.
            guard Worktrees.info(of: top)?.linked == true else { return }
            unmarkDeleted(top)
        }
        let now = nowMs()
        if !force, now - (gitAt[top] ?? 0) < 3000 { return }
        guard !inflight.contains(top) else {
            // Something was done while a look was under way: that look is old, so it is made again when it ends.
            if force { again.insert(top) }
            return
        }
        inflight.insert(top)
        gitAt[top] = now
        let known = status[top]
        let state = known?.pr?.state ?? ""
        // The pull request is asked over the network: a window coming to the front asks at most every 20 s, the timer every minute.
        let due = force || (pr && now - (prAt[top] ?? 0) >= 20_000) || now - (prAt[top] ?? 0) >= (state == "MERGED" || state == "CLOSED" || state == "STALE" ? 600_000 : 60_000)
        if due { prAt[top] = now }
        Git.queue.async { [weak self] in
            var s = Git.worktreeStatus(top: top, known: known)
            if var fresh = s {
                if due, !fresh.gone {
                    let r = Git.prStatus(fresh)
                    fresh.pr = r.ok ? r.pr : known?.pr
                } else {
                    fresh.pr = known?.pr
                }
                Git.revalidate(&fresh)
                s = fresh
            }
            DispatchQueue.main.async {
                MainActor.assumeIsolated {
                    guard let self else { return }
                    self.inflight.remove(top)
                    if self.again.remove(top) != nil { self.refresh(top, pr: true, force: true) }
                    guard let s else {
                        // No longer a worktree (its folder was moved or the repo is gone).
                        if self.status[top] != nil { self.status[top] = nil }
                        return
                    }
                    let old = self.status[top]
                    if old != s { self.status[top] = s }
                    self.announce(old: old, new: s)
                }
            }
        }
    }

    /// Checks finishing is said once (WCAG 4.1.3), as the colour change isn't the only sign.
    private func announce(old: WorktreeStatus?, new: WorktreeStatus) {
        guard let o = old?.pr, let n = new.pr, o.number == n.number, o.checks.kind != n.checks.kind else { return }
        let text = n.checks.kind == "pass" ? "PR #\(n.number): checks passed." : n.checks.kind == "fail" ? "PR #\(n.number): a check failed." : ""
        guard !text.isEmpty, let w = NSApp.keyWindow ?? NSApp.mainWindow else { return }
        NSAccessibility.post(element: w, notification: .announcementRequested, userInfo: [.announcement: text, .priority: NSAccessibilityPriorityLevel.medium.rawValue])
    }

    /// The status asked for again after something was done, in every window of the worktree.
    func changed(_ top: String) {
        Worktrees.forget()
        Git.forgetShip(top)
        refresh(top, pr: true, force: true)
    }

    // MARK: what the header and the menus say

    /// The button's face for a status (nil status: nothing to offer yet).
    static func face(_ s: WorktreeStatus, streamer: Bool = false) -> ShipFace {
        let f = faceReal(s, streamer: streamer)
        // Streamer mode: no real branch in a tooltip.
        return streamer ? ShipFace(kind: f.kind, label: f.label, symbol: f.symbol, tip: "", enabled: f.enabled) : f
    }

    private static func faceReal(_ s: WorktreeStatus, streamer: Bool) -> ShipFace {
        let b = s.branch, base = streamer ? Streamer.fake("branch", s.base) : s.base
        switch s.phase {
        case "gone":
            return ShipFace(kind: "delete", label: "Delete worktree", symbol: "trash", tip: "The folder of \(b) is gone. Delete the worktree and its branch.", enabled: true)
        case "merged":
            return ShipFace(kind: "delete", label: "Delete worktree", symbol: "trash", tip: "\(b) is merged. Delete its folder and branch.", enabled: true)
        case "pr":
            let n = s.pr?.number ?? 0
            if s.pr?.draft == true {
                return ShipFace(kind: "openpr", label: "Open PR", symbol: "arrow.up.forward.square", tip: "PR #\(n) is a draft. Mark it ready on GitHub first.", enabled: true)
            }
            return ShipFace(kind: "prmerge", label: "Merge PR", symbol: "arrow.triangle.merge", tip: "Merge PR #\(n) on GitHub", enabled: true)
        case "work":
            if s.remote == nil {
                return ShipFace(kind: "merge", label: "Merge into \(base)", symbol: "arrow.triangle.merge", tip: "Merge \(b) into \(base) on this Mac", enabled: true)
            }
            return ShipFace(kind: "create", label: "Create PR", symbol: "arrow.triangle.pull", tip: "Send \(b)'s work as a pull request into \(base) (\u{21E7}\u{2318}P)", enabled: true)
        case "detached":
            return ShipFace(kind: "create", label: "Create PR", symbol: "arrow.triangle.pull", tip: "This worktree isn't on a branch right now.", enabled: false)
        default:
            return ShipFace(kind: "create", label: "Create PR", symbol: "arrow.triangle.pull", tip: "Nothing to send yet: \(b) has no changes.", enabled: false)
        }
    }

    /// The ▾ menu's entries (spec 4.2): none is hidden, the unavailable ones are dimmed.
    static func items(_ s: WorktreeStatus?, deleted: Bool = false, streamer: Bool = false) -> [ShipItem] {
        guard let s, !deleted else {
            return [ShipItem(id: "create", title: "Create Pull Request…", key: "\u{21E7}\u{2318}P", enabled: false),
                    ShipItem(id: "merge", title: "Merge into develop…", enabled: false),
                    ShipItem(id: "delete", title: "Delete Worktree…", enabled: false),
                    ShipItem(id: "changes", title: "Show Changes", enabled: false, after: true),
                    ShipItem(id: "reveal", title: "Show in Finder", enabled: false)]
        }
        let phase = s.phase
        let gone = s.gone
        var out: [ShipItem] = []
        if phase == "pr", let pr = s.pr {
            out.append(ShipItem(id: "prmerge", title: "Merge PR #\(pr.number)…", enabled: !pr.draft, tip: pr.draft ? "Mark it ready on GitHub first." : nil))
            out.append(ShipItem(id: "openpr", title: "Open PR #\(pr.number) on GitHub"))
        } else {
            let canCreate = phase == "work" && s.remote != nil
            out.append(ShipItem(id: "create", title: "Create Pull Request…", key: "\u{21E7}\u{2318}P", enabled: canCreate,
                                tip: s.remote == nil && phase == "work" ? "This repo has no remote to send it to." : nil))
        }
        out.append(ShipItem(id: "merge", title: "Merge into \(streamer ? Streamer.fake("branch", s.base) : s.base)…", enabled: phase == "work" || phase == "pr"))
        out.append(ShipItem(id: "delete", title: "Delete Worktree…"))
        out.append(ShipItem(id: "changes", title: "Show Changes", enabled: !gone && phase != "nothing", after: true))
        out.append(ShipItem(id: "reveal", title: "Show in Finder", enabled: !gone))
        return out
    }

    /// The same, as a menu to pop up or add (items call `handler` with their id).
    static func menu(_ s: WorktreeStatus?, deleted: Bool = false, streamer: Bool = false, handler: @escaping (String) -> Void) -> NSMenu {
        let menu = NSMenu()
        menu.autoenablesItems = false
        for it in items(s, deleted: deleted, streamer: streamer) {
            if it.after { menu.addItem(.separator()) }
            let mi = ShipMenuItem(title: it.title, handler: { handler(it.id) })
            mi.isEnabled = it.enabled
            if let tip = it.tip { mi.toolTip = tip }
            if it.id == "create" { mi.keyEquivalent = "P"; mi.keyEquivalentModifierMask = [.command, .shift] }
            menu.addItem(mi)
        }
        return menu
    }

    // MARK: acting

    /// A button, menu item or key: opens the sheet, or does the one thing (open the PR, show the changes, show in Finder).
    func handle(_ id: String, top: String, from window: ChatWindowController?) {
        let s = status[top]
        switch id {
        case "create", "merge", "prmerge", "delete":
            guard busy[top] == nil, !deleted.contains(top) || id == "delete" else { return NSSound.beep() }
            // The sheet asks for fresh data when it opens; this makes the next look soon.
            refresh(top, pr: true, force: true)
            let title = window?.shipTitle() ?? manager?.shipTitle(in: top) ?? ""
            session = ShipSession(kind: id, top: top, window: window, title: title)
            manager?.overlay.showShip(kind: id, top: top, window: window?.window)
        case "openpr":
            if let pr = s?.pr, let remote = s?.remote { open(pr.url, host: remote.host) }
        case "changes":
            manager?.showSourceControl(root: top)
        case "reveal":
            if FileManager.default.fileExists(atPath: top) { NSWorkspace.shared.activateFileViewerSelecting([URL(fileURLWithPath: top)]) }
        default:
            break
        }
    }

    func clearSession() { session = nil }

    /// A page of the remote's host (https, and the host the remote or gh named: the sheet can't point the browser anywhere else).
    @discardableResult
    func open(_ raw: String, host: String) -> Bool {
        guard let url = URL(string: raw), url.scheme == "https", let h = url.host?.lowercased(), h == host.lowercased()
                || (host == "ssh.dev.azure.com" && h == "dev.azure.com") else { return false }
        NSWorkspace.shared.open(url)
        return true
    }

    // MARK: the sheet's data

    /// Everything a sheet shows, read fresh (git off the main thread).
    func page(for kind: String, top: String, reply: @escaping ([String: Any]) -> Void) {
        let known = status[top]
        let title = session?.title ?? ""
        let live = manager?.shipLive(top: top) ?? []
        let ai = manager?.shipAI(top: top, preferring: session?.window)
        let streamer = Streamer.on
        Git.queue.async {
            guard var s = Git.worktreeStatus(top: top, known: known) else {
                return DispatchQueue.main.async { reply(["error": "This isn't a worktree."]) }
            }
            if !s.gone {
                let r = Git.prStatus(s)
                s.pr = r.ok ? r.pr : known?.pr
            }
            var d = s.json
            d["kind"] = kind
            d["repo"] = Worktrees.home(s.main).leaf
            d["folder"] = (top as NSString).lastPathComponent
            d["title"] = title
            if kind == "create" { d["create"] = Git.createPage(s) }
            if kind == "merge" { d["merge"] = Git.mergeCheck(s) }
            if kind == "prmerge" { d["prmerge"] = Git.prMergePage(s) }
            if kind == "delete" { d["delete"] = Git.deletePage(s) }
            DispatchQueue.main.async {
                MainActor.assumeIsolated {
                    var d = d
                    self.status[top] = s
                    d["live"] = live.map(\.json)
                    d["ai"] = ai.map { ["name": $0.name, "sid": $0.sid, "kind": $0.kind] } as Any
                    // The AI working in the base's folder (a local merge changes files there).
                    if let bf = s.baseFolder, let top2 = Worktrees.info(of: bf)?.top {
                        d["baseLive"] = (self.manager?.shipLive(top: top2) ?? []).filter { $0.kind == "chat" }.map(\.name)
                    }
                    if streamer { Self.mask(&d) }
                    d["streamer"] = streamer
                    reply(d)
                }
            }
        }
    }

    /// Streamer mode: the page shows made-up names (it looks each real one up in `mask`), no account and no address. The real values
    /// stay in the data: the page sends them back to do the work. The chat's title is left out, so a title is always typed.
    private static func mask(_ d: inout [String: Any]) {
        var map: [String: String] = [:]
        func add(_ kind: String, _ v: Any?) { if let v = v as? String, !v.isEmpty { map[v] = Streamer.fake(kind, v) } }
        func addAll(_ kind: String, _ v: Any?) { (v as? [String])?.forEach { add(kind, $0) } }
        for k in ["repo", "main"] { add("project", d[k]) }
        add("branch", d["branch"])
        add("branch", d["base"])
        add("project", d["folder"])
        add("project", (d["top"] as? String).map { ($0 as NSString).lastPathComponent })
        add("project", (d["baseFolder"] as? String).map { ($0 as NSString).lastPathComponent })
        for k in ["top", "baseFolder"] { if let v = d[k] as? String { map[v] = Streamer.folder(v) } }
        addAll("file", d["dirtyFiles"])
        if let r = d["remote"] as? [String: Any] { add("project", r["host"]); add("project", r["owner"]); add("project", r["repo"]); add("branch", r["name"]) }
        d["title"] = ""
        if var c = d["create"] as? [String: Any] {
            (c["commits"] as? [[String: String]])?.forEach { add("title", $0["subject"]) }
            addAll("branch", c["into"])
            (c["leftovers"] as? [[String: Any]])?.forEach { add("file", $0["path"]) }
            c["body"] = ""
            c["singleCommit"] = ""
            d["create"] = c
        }
        if let m = d["merge"] as? [String: Any] {
            (m["commits"] as? [[String: String]])?.forEach { add("title", $0["subject"]) }
            addAll("file", m["conflicts"]); addAll("file", m["blocked"])
        }
        if let m = d["prmerge"] as? [String: Any] { addAll("file", m["conflicts"]) }
        if var pr = d["pr"] as? [String: Any] { add("title", pr["title"]); pr["url"] = ""; pr["reviewBy"] = ""; d["pr"] = pr }
        d["ghUser"] = nil
        d["mask"] = map
    }

    // MARK: doing

    private func begin(_ top: String, _ what: String) {
        busy[top] = what
        ShipJobs.start()
    }
    private func end(_ top: String) { busy[top] = nil }

    func createPR(top: String, title: String, body: String, into: String, reply: @escaping ([String: Any]) -> Void) {
        guard busy[top] == nil, let remote = status[top]?.remote else { return reply(["kind": "nothing", "title": "Something else is running here."]) }
        begin(top, "Creating PR…")
        Git.queue.async {
            let r = Git.createPR(top: top, title: title, body: body, into: into) { name in
                DispatchQueue.main.async { MainActor.assumeIsolated { self.manager?.overlay.shipStep(name) } }
            }
            ShipJobs.finish()
            DispatchQueue.main.async {
                MainActor.assumeIsolated {
                    self.end(top)
                    self.changed(top)
                    if let u = r["browser"] as? String { self.open(u, host: remote.host) }
                    reply(r)
                }
            }
        }
    }

    func mergeLocal(top: String, message: String, reply: @escaping ([String: Any]) -> Void) {
        guard busy[top] == nil else { return reply(["kind": "nothing", "title": "Something else is running here."]) }
        begin(top, "Merging…")
        Git.queue.async {
            let r = Git.mergeLocal(top: top, message: message) { name in
                DispatchQueue.main.async { MainActor.assumeIsolated { self.manager?.overlay.shipStep(name) } }
            }
            ShipJobs.finish()
            DispatchQueue.main.async {
                MainActor.assumeIsolated {
                    self.end(top)
                    self.changed(top)
                    reply(r)
                }
            }
        }
    }

    func mergePR(top: String, number: Int, sha: String, method: String, reply: @escaping ([String: Any]) -> Void) {
        guard busy[top] == nil else { return reply(["kind": "nothing", "title": "Something else is running here."]) }
        begin(top, "Merging…")
        Git.queue.async {
            let r = Git.mergePR(top: top, number: number, sha: sha, method: method)
            ShipJobs.finish()
            DispatchQueue.main.async {
                MainActor.assumeIsolated {
                    self.end(top)
                    self.changed(top)
                    reply(r)
                }
            }
        }
    }

    func pushBase(top: String, reply: @escaping ([String: Any]) -> Void) {
        Git.queue.async {
            let r = Git.pushBase(top: top)
            DispatchQueue.main.async { MainActor.assumeIsolated { reply(r) } }
        }
    }

    /// Delete (spec 9.2): first the blockers again, then the chats and terminals that were open here end (only when the sheet said so,
    /// and never while an AI is working), then the folder goes to the Trash, git forgets it, and the branch goes when asked.
    func delete(top: String, deleteBranch: Bool, force: Bool, ids: [String], sha: String, reply: @escaping ([String: Any]) -> Void) {
        guard busy[top] == nil else { return reply(["kind": "nothing", "title": "Something else is running here."]) }
        let live = manager?.shipLive(top: top) ?? []
        // The sheet said which chats end; one that came up since wasn't agreed to.
        if Set(live.map(\.id)) != Set(ids) {
            return reply(["kind": "changed", "title": "Something opened or closed in this worktree.", "text": "Look again, then decide."])
        }
        if let working = live.first(where: { $0.working }) {
            return reply(["kind": "working", "title": "\(working.name) is working in this worktree right now.", "text": "Wait until it's done, or end it yourself first."])
        }
        if let out = live.first(where: { !$0.inApp }) {
            return reply(["kind": "outside", "title": "A \(out.name) chat outside Orbiterm is open in this worktree.", "text": "End it there first."])
        }
        begin(top, "Deleting…")
        let known = status[top]
        Git.queue.async {
            // Before any chat ends: what the worktree holds is looked at again, so nothing ends for a delete that won't happen.
            let stop = Git.deleteCheck(top: top, deleteBranch: deleteBranch, force: force, expect: sha, known: known)
            if stop != nil { ShipJobs.finish() }
            DispatchQueue.main.async {
                MainActor.assumeIsolated {
                    if let stop { self.end(top); return reply(stop) }
                    Task { @MainActor in
                        if !live.isEmpty {
                            self.manager?.overlay.shipStep("end")
                            let ok = await self.manager?.endSessions(in: top) ?? false
                            if !ok {
                                self.end(top)
                                ShipJobs.finish()
                                return reply(["kind": "end", "title": "\(live[0].name) didn't stop.", "text": "Try again in a moment."])
                            }
                        }
                        Git.queue.async {
                            let r = Git.deleteWorktree(top: top, deleteBranch: deleteBranch, force: force, expect: sha, known: known) { name in
                                DispatchQueue.main.async { MainActor.assumeIsolated { self.manager?.overlay.shipStep(name) } }
                            }
                            ShipJobs.finish()
                            DispatchQueue.main.async {
                                MainActor.assumeIsolated {
                                    self.end(top)
                                    if r["ok"] != nil {
                                        self.markDeleted(top, branch: r["branch"] as? String ?? "", sha: r["sha"] as? String ?? "", kept: r["branchKept"] as? Bool ?? true)
                                    } else {
                                        self.changed(top)
                                    }
                                    reply(r)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    /// Clean Up's delete (spec 9.4): this same delete, as the Delete sheet runs it, for a worktree whose chats Clean Up ended already: the
    /// folder to the Trash, git forgetting its record, the branch always kept (no `--force`, no `prune`, no stash). A delete that
    /// is under way here already isn't started twice.
    func cleanupTrash(top: String, main: String, branch: String, done: @escaping ([String: Any]) -> Void) {
        guard busy[top] == nil else { return done(["kind": "nothing", "title": "Something else is running here."]) }
        begin(top, "Deleting\u{2026}")
        var known = status[top]
        // A folder git lists but that is gone (a disk that isn't there): nothing to read, so the record is all there is to forget.
        if known == nil, !FileManager.default.fileExists(atPath: top) {
            var k = WorktreeStatus()
            k.top = top
            k.main = main
            k.branch = branch
            k.detached = branch.isEmpty
            k.gone = true
            known = k
        }
        let seen = known
        Git.queue.async {
            let r = Git.deleteWorktree(top: top, deleteBranch: false, force: false, expect: "", known: seen) { _ in }
            ShipJobs.finish()
            DispatchQueue.main.async {
                MainActor.assumeIsolated {
                    self.end(top)
                    if r["ok"] != nil {
                        self.markDeleted(top, branch: r["branch"] as? String ?? "", sha: r["sha"] as? String ?? "", kept: true)
                    } else {
                        self.changed(top)
                    }
                    done(r)
                }
            }
        }
    }

    private func unmarkDeleted(_ top: String) {
        var map = UserDefaults.standard.dictionary(forKey: Self.deletedKey) as? [String: [String: Any]] ?? [:]
        map[top] = nil
        UserDefaults.standard.set(map, forKey: Self.deletedKey)
        deleted.remove(top)
    }

    func markDeleted(_ top: String, branch: String, sha: String, kept: Bool) {
        var map = UserDefaults.standard.dictionary(forKey: Self.deletedKey) as? [String: [String: Any]] ?? [:]
        map[top] = ["branch": branch, "sha": sha, "at": nowMs()]
        UserDefaults.standard.set(map, forKey: Self.deletedKey)
        deleted.insert(top)
        Worktrees.forget()
        Git.forgetShip(top)
        manager?.shipDeleted(top: top, branch: branch, sha: sha, kept: kept)
    }

    /// "Ask <AI> to fix": a prompt typed into that chat the way the MCP's send_prompt does (idle, in front, input empty, permissions
    /// not bypassed); otherwise nothing is typed and the reason comes back.
    func ask(_ prompt: String, sid: String, reply: @escaping ([String: Any]) -> Void) {
        DispatchQueue.global(qos: .userInitiated).async {
            let r = McpTools.askFromApp(sid, prompt)
            DispatchQueue.main.async {
                MainActor.assumeIsolated {
                    if r.ok { self.manager?.showChat(sessionId: sid) }
                    reply(r.ok ? ["ok": true] : ["error": r.text])
                }
            }
        }
    }
}

/// Jobs under way (a push, a merge, a delete): counted under a lock, ended by the thread that finished them, so a quit that waits for
/// them, even inside a main-queue job's nested run loop, sees them end.
enum ShipJobs {
    private static let lock = NSLock()
    private static var count = 0
    static func start() { lock.lock(); count += 1; lock.unlock() }
    static func finish() { lock.lock(); count = max(0, count - 1); lock.unlock() }
    static var running: Bool { lock.lock(); defer { lock.unlock() }; return count > 0 }
}

/// A menu item that runs a closure (an NSMenuItem's target and action, kept alive by the item itself).
final class ShipMenuItem: NSMenuItem {
    private let handler: () -> Void

    init(title: String, handler: @escaping () -> Void) {
        self.handler = handler
        super.init(title: title, action: #selector(run), keyEquivalent: "")
        target = self
    }

    required init(coder: NSCoder) { fatalError("not used") }

    @objc private func run() { handler() }
}

/// One AI chat or terminal open in a worktree.
struct ShipLive {
    let id: String
    let name: String
    let kind: String   // "chat" or "terminal"
    let status: String
    let inApp: Bool
    var working: Bool { status == "busy" || status == "waiting" }
    var json: [String: Any] { ["id": id, "name": name, "kind": kind, "status": status, "inApp": inApp, "working": working] }
}

/// The AI "Ask … to fix" goes to.
struct ShipAI {
    let name: String
    let sid: String
    let kind: String
}
