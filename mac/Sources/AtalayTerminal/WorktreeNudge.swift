import AppKit

/// What the second-AI note offers: this chat, the folder both work in, and who else is working there.
struct WorktreeOffer: Equatable {
    let sid, tool, folder, top, dir, ai: String
    let others: [String]
    /// After "Open in a worktree": the strip says so (the branch's name) and offers to close this chat; nothing closes by itself.
    var openedIn: String? = nil

    /// The note's two sentences (SPEC §19.6): the first bold, the second after it.
    var line: (main: String, rest: String) {
        if others.count >= 2 {
            return ("\(others.count) other AI chats are already working in \(folder).", "They could all change the same files.")
        }
        let who = others.first ?? "Another AI"
        return (who == tool ? "Another \(tool) is already working in \(folder)." : "\(who) is already working in \(folder).",
                "Both could change the same files.")
    }
}

/// A second AI starting in a folder where another one works: a note in its window that it could move to a worktree.
/// Never asks, never takes the focus, never blocks; gone at the first prompt or "Not now" (SPEC §19).
@MainActor
enum WorktreeNudge {
    private static let enabledKey = "worktreeNudge", quietKey = "worktreeNudgeQuiet"

    static var enabled: Bool {
        get { UserDefaults.standard.object(forKey: enabledKey) as? Bool ?? true }
        set { UserDefaults.standard.set(newValue, forKey: enabledKey) }
    }

    /// "Not now": nothing for this working tree for 24 hours (entries older than 7 days are dropped as it's written).
    static func quiet(_ top: String) {
        var map = UserDefaults.standard.dictionary(forKey: quietKey) as? [String: Double] ?? [:]
        let now = nowMs()
        map = map.filter { now - $0.value < 7 * 86_400_000 }
        map[top] = now + 86_400_000
        UserDefaults.standard.set(map, forKey: quietKey)
    }

    static func isQuiet(_ top: String) -> Bool {
        let map = UserDefaults.standard.dictionary(forKey: quietKey) as? [String: Double] ?? [:]
        return (map[top] ?? 0) > nowMs()
    }

    /// The AI a brief is, as the name sheet starts it: claude, codex, agy or cursor; nil for others (Gemini, Aider…: not movable).
    static func aiOf(_ b: SessionBrief) -> String? {
        if !b.id.hasPrefix("ai:") { return "claude" }
        return b.name == "Codex" ? "codex" : b.name == "Antigravity" ? "agy" : b.name == "Cursor" ? "cursor" : nil
    }

    static func name(_ b: SessionBrief) -> String { b.id.hasPrefix("ai:") ? b.name : "Claude" }

    /// The other live AI sessions in the same working tree. One that is a child of another's process tree (Claude's own
    /// `codex exec`) is part of that chat, not counted.
    static func others(of b: SessionBrief, top: String, in briefs: [String: SessionBrief]) -> [SessionBrief] {
        let live = briefs.values.filter { $0.live && $0.status != "ended" }
        let found = live.filter { $0.id != b.id && !$0.cwd.isEmpty && Worktrees.info(of: $0.cwd)?.top == top }
        guard found.count > 0 else { return [] }
        let trees = live.compactMap { o -> (id: String, set: Set<Int32>)? in o.pid.map { (o.id, Set(MainWindowController.tree([$0]))) } }
        return found.filter { o in
            guard let pid = o.pid else { return true }
            return !trees.contains { $0.id != o.id && $0.set.contains(pid) }
        }
    }

    /// Whether this chat got a prompt already: typed into after its AI process started, sent by an MCP client, or the AI's own
    /// files show one. Only hides the note; nothing is ever ended because of it.
    static func used(_ c: ChatWindowController, _ b: SessionBrief) -> Bool {
        if !b.fresh || McpShared.shared.sentAgo(b.id) != nil { return true }
        guard c.terminal.typedAt > 0 else { return false }
        guard let pid = b.pid, let started = Proc.info(pid)?.started else { return true }
        return UInt64(c.terminal.typedAt * 1000) >= started
    }

    /// Runs for every chat window on each engine state: the note comes, stays, or goes (SPEC §19.2).
    static func review(_ c: ChatWindowController, briefs: [String: SessionBrief]) {
        let b = c.hud.brief
        func clear() { if c.hud.nudge != nil { c.hud.nudge = nil } }
        // "Opened in the … worktree": stays until its chat ends or the strip is dismissed.
        if c.hud.nudge?.openedIn != nil {
            if c.hud.exited || b?.live != true || b?.id != c.hud.nudge?.sid { clear() }
            return
        }
        // Mirror windows (the chat runs in the other build of the app), restored windows... after a relaunch, and chats started on a saved conversation, are never offered the note.
        guard enabled, let b, b.live, b.status != "ended", c.hud.status != "terminal", c.hud.status != "ended",
              !c.hud.mirror, !c.takesHistory, !c.resumedStart, aiOf(b) != nil, let w = Worktrees.info(of: b.cwd) else { return clear() }
        if let shown = c.hud.nudge {
            // Already up: it goes when the chat got its first prompt, or the others are gone.
            let rest = others(of: b, top: shown.top, in: briefs)
            if shown.sid != b.id || used(c, b) || rest.isEmpty { c.nudgeSeen.insert(b.id); return clear() }
            let next = offer(b, w.top, rest)
            if next != shown { c.hud.nudge = next }
            return
        }
        guard !c.nudgeSeen.contains(b.id) else { return }
        c.nudgeSeen.insert(b.id)
        guard !used(c, b), !c.nudgeTold, !isQuiet(w.top) else { return }
        let rest = others(of: b, top: w.top, in: briefs)
        if !rest.isEmpty { c.hud.nudge = offer(b, w.top, rest) }
    }

    private static func offer(_ b: SessionBrief, _ top: String, _ rest: [SessionBrief]) -> WorktreeOffer {
        let folder = (top as NSString).lastPathComponent
        let names = rest.map(name)
        return WorktreeOffer(sid: b.id, tool: name(b), folder: Streamer.on ? Streamer.project(top) : folder, top: top, dir: b.cwd,
                             ai: aiOf(b) ?? "claude", others: names)
    }
}
