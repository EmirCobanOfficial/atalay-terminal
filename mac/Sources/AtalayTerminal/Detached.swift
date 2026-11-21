import AppKit

/// New chats and terminals run in a pty the app opens itself (PtySession, named `atl-<id>`) and end with the app; an
/// update's restart or a crash brings their windows back and resumes the AI in them (SessionSnapshot). This file is the
/// other half: the sessions an older build left running in a detached GNU screen session (`/usr/bin/screen`, ships with
/// macOS), whose windows are only displays attached to them. They keep their old path here until they end, and nothing
/// new ever starts in screen. Every function takes a session's name and goes to the pty when `Sessions.live` has it.
enum Detached {
    static let screen = "/usr/bin/screen"
    /// Each build keeps its own sessions, so it never attaches to or ends another's chats while both are open: the
    /// installed app `atl-`, the staging build (`STAGING=1 ./build-app.sh`) `atls-`, a development run (`./dev.sh`,
    /// unbundled) `atld-`.
    static let prefix: String = {
        guard let id = Bundle.main.bundleIdentifier else { return "atld-" }
        guard id.hasSuffix(".staging") else { return "atl-" }
        // Staging only: a demo recording runs a second set of sessions apart from the usual ones
        // (ATALAY_SESSION_PREFIX=atdm-, with CLAUDE_CONFIG_DIR pointing at demo data). Never one that matches another
        // build's sessions ("atl-", "atl-x-"): quitting ends every session of this prefix.
        if let p = ProcessInfo.processInfo.environment["ATALAY_SESSION_PREFIX"], p.count > 1, p.hasSuffix("-"),
           !allPrefixes.contains(where: { p.hasPrefix($0) || $0.hasPrefix(p) }) { return p }
        return "atls-"
    }()

    /// The prefixes of every build, for finding a session another build of the app runs (to mirror it).
    static let allPrefixes = ["atl-", "atls-", "atld-"]

    static var available: Bool { FileManager.default.isExecutableFile(atPath: screen) }

    /// Shared by the session and the display attached to it. Each build has its own, so a newer build's settings never
    /// reach the installed app's sessions.
    static let rcPath: String = {
        let base = (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: HOME + "/Library/Application Support")).appendingPathComponent("atalay-terminal")
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        let url = base.appendingPathComponent(prefix == "atl-" ? "screenrc" : "screenrc-" + prefix.dropLast())
        let rc = """
        # Written by Orbiterm for its chat sessions. The command key is Ctrl-^ so Ctrl-A reaches Claude.
        startup_message off
        escape ^^^^
        deflogin off
        defutf8 on
        defscrollback 20000
        term screen-256color
        termcapinfo xterm*|screen*|vt100* ti@:te@
        altscreen on
        defflow off
        vbell off
        msgwait 0
        # Esc waits only 10 ms (default 300) for the rest of a key sequence: an Esc typed right before text must not merge with it.
        maptimeout 10

        """
        try? rc.write(to: url, atomically: true, encoding: .utf8)
        return url.path
    }()

    /// Arguments for a display attached to the session. `-A` fits the session to that display.
    static func attachArgs(_ name: String, fit: Bool = true) -> [String] {
        ["-c", rcPath, "-U"] + (fit ? ["-A"] : []) + ["-x", name]
    }

    /// How many screens show the session now (its attached clients, `screen … -x name`): two while the other build of
    /// the app mirrors it.
    static func displays(_ name: String) -> Int {
        if Sessions.shell(named: name) != nil { return 1 }
        return Proc.all().filter { pid in
            guard Proc.name(pid) == "screen", let args = Proc.arguments(pid), let i = args.firstIndex(of: "-x") else { return false }
            return args.indices.contains(i + 1) && args[i + 1] == name
        }.count
    }

    /// The app another build's session belongs to, by its name, for saying where a mirrored chat runs.
    static func owner(_ name: String) -> String {
        if name.hasPrefix("atls-") { return "Orbiterm Staging" }
        if name.hasPrefix("atld-") { return "a development run of Orbiterm" }
        return "Orbiterm"
    }

    private static var tuned = Set<String>()
    private static let tunedLock = NSLock()

    /// This build's session that has the short Esc wait (see tune): only there Esc and `/rewind` stay apart.
    static func isTuned(_ name: String) -> Bool {
        tunedLock.lock(); defer { tunedLock.unlock() }
        return name.hasPrefix(prefix) && tuned.contains(name)
    }

    /// Gives one of this build's sessions that started under an older screenrc the Esc timing of the current one
    /// (`maptimeout` in rcPath). Once per session per run; another build's sessions (a mirror) are left alone.
    static func tune(_ name: String) {
        guard name.hasPrefix(prefix) else { return }
        tunedLock.lock()
        let first = tuned.insert(name).inserted
        tunedLock.unlock()
        guard first else { return }
        let p = Process()
        p.executableURL = URL(fileURLWithPath: screen)
        p.arguments = ["-S", name, "-X", "maptimeout", "10"]
        try? p.run()
    }

    /// Makes the session take its display's size. A window that attached while hidden (without `-A`, so
    /// the session kept its size) calls this once it is shown. With two displays (a mirror) this fits the session to
    /// the one that attached last, whichever window asks: there the window types the command into its own display
    /// (ChatWindowController.fitSession).
    static func fit(_ name: String) {
        // A pty takes its view's size by itself.
        if Sessions.shell(named: name) != nil { return }
        let p = Process()
        p.executableURL = URL(fileURLWithPath: screen)
        p.arguments = ["-S", name, "-X", "fit"]
        try? p.run()
    }

    // MARK: history across restarts

    /// A window that attaches to a running session after the app restarted (an update, a quit) only gets what screen
    /// repaints: the rows on screen. So on quit each window's scrollback is kept here, and the new window takes it
    /// back before it attaches. (screen's own copy of the history, `hardcopy -h`, mangles every character past
    /// Latin-1: ğ, ş, box drawing, Claude's symbols.)
    private static let historyDir: URL = {
        let dir = (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: HOME + "/Library/Application Support")).appendingPathComponent("atalay-terminal/history")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }()

    static func saveHistory(_ name: String, text: String, rows: Int) {
        let url = historyDir.appendingPathComponent(name + ".txt")
        try? ("\(rows)\n" + text).write(to: url, atomically: true, encoding: .utf8)
        try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: url.path)
    }

    /// The kept scrollback (without the rows that were on screen, which screen repaints), once: the file goes.
    static func takeHistory(_ name: String) -> [String] {
        let url = historyDir.appendingPathComponent(name + ".txt")
        defer { try? FileManager.default.removeItem(at: url) }
        guard let text = try? String(contentsOf: url, encoding: .utf8) else { return [] }
        var lines = text.components(separatedBy: "\n")
        guard let rows = Int(lines.removeFirst()) else { return [] }
        lines = lines.map { String($0.reversed().drop(while: { $0 == " " }).reversed()) }
        while lines.last?.isEmpty == true { lines.removeLast() }
        lines = Array(lines.dropLast(rows))
        while lines.first?.isEmpty == true { lines.removeFirst() }
        return Array(lines.suffix(10_000))
    }

    static func forgetHistory(_ name: String) {
        try? FileManager.default.removeItem(at: historyDir.appendingPathComponent(name + ".txt"))
    }

    /// Ends the session (End Session, a pane's shell ending): screen closes it, then the shell and everything in it get a
    /// hangup. screen alone left the shell running (login started it), an orphan holding a pty after every ended chat.
    /// What shrugs off the hangup (a dev server run through npm kept its port for hours) gets TERM three seconds later
    /// and KILL two after that: an ended session leaves nothing behind.
    @MainActor
    static func quit(_ name: String) {
        if let pty = Sessions.live[name] { return pty.end() }
        // A pty session that ended already (End Session runs twice for a window's panes): nothing in screen by that name.
        if Sessions.ended.contains(name) { return }
        forgetHistory(name)
        let shell = shellPid(name)
        var tree: [(pid: Int32, started: UInt64)] = []
        if let shell { collect(shell, into: &tree) }
        let p = Process()
        p.executableURL = URL(fileURLWithPath: screen)
        p.arguments = ["-S", name, "-X", "quit"]
        try? p.run()
        guard let shell else { return }
        hangUp(shell)
        let alive = { tree.filter { t in Proc.info(t.pid)?.started == t.started } }
        DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + 3) {
            for t in alive() { kill(t.pid, SIGTERM) }
            DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + 2) {
                for t in alive() { kill(t.pid, SIGKILL) }
            }
        }
    }

    /// A pty session's shell ends as a screen session's did (quit): a hangup to everything under it, deepest first, TERM
    /// three seconds later and KILL two after that.
    nonisolated static func endTree(_ shell: Int32) {
        var tree: [(pid: Int32, started: UInt64)] = []
        collect(shell, into: &tree)
        hangUp(shell)
        let alive = { tree.filter { t in Proc.info(t.pid)?.started == t.started } }
        DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + 3) {
            for t in alive() { kill(t.pid, SIGTERM) }
            DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + 2) {
                for t in alive() { kill(t.pid, SIGKILL) }
            }
        }
    }

    /// The app quits or restarts: every pty session's whole tree (each root and what is under it, by pid and start time)
    /// gets a hangup and TERM, deepest first (an interactive shell ignores TERM but leaves on the hangup); what is still
    /// there after 3 s, with what it started meanwhile, gets KILL. Blocks (call it off the main thread). As in quitAll, only
    /// processes seen as descendants of a root get a signal, never a process group.
    nonisolated static func killTrees(_ roots: [Int32]) {
        let me = getuid()
        typealias P = (pid: Int32, started: UInt64)
        var all: [P] = []
        for root in roots { collectOwned(root, uid: me, into: &all) }
        guard !all.isEmpty else { return }
        let alive = { (list: [P]) in list.filter { t in Proc.info(t.pid)?.started == t.started } }
        for t in alive(all) { kill(t.pid, SIGHUP) }
        for t in alive(all) { kill(t.pid, SIGTERM) }
        let deadline = Date().addingTimeInterval(3)
        while !alive(all).isEmpty, Date() < deadline { Thread.sleep(forTimeInterval: 0.1) }
        var left = alive(all)
        let known = Set(left.map(\.pid))
        var spawned: [P] = []
        for t in left { for child in Proc.children(of: t.pid) where !known.contains(child) { collectOwned(child, uid: me, into: &spawned) } }
        left += spawned
        for t in alive(left) { kill(t.pid, SIGKILL) }
        NSLog("Orbiterm: ended %d terminal sessions, %d processes, %d needed KILL", roots.count, all.count + spawned.count, left.count)
    }

    /// A process and everything under it, deepest first, with when each started (a later process with the same pid is
    /// never touched).
    private static func collect(_ pid: Int32, into tree: inout [(pid: Int32, started: UInt64)]) {
        for child in Proc.children(of: pid) { collect(child, into: &tree) }
        if let info = Proc.info(pid) { tree.append((pid, info.started)) }
    }

    /// SIGHUP to a process and its descendants, deepest first.
    private static func hangUp(_ pid: Int32) {
        for child in Proc.children(of: pid) { hangUp(child) }
        kill(pid, SIGHUP)
    }

    // MARK: quit closes everything

    /// Screen daemons of this build's sessions (`prefix`), current user's only.
    static func ownedDaemons(prefix: String = Detached.prefix, pids: [Int32]? = nil) -> [(pid: Int32, name: String)] {
        let me = getuid()
        return (pids ?? Proc.all()).compactMap { pid in
            guard Proc.name(pid) == "screen", Proc.info(pid)?.uid == me, let args = Proc.arguments(pid),
                  let i = args.firstIndex(of: "-dmS"), i + 1 < args.count, args[i + 1].hasPrefix(prefix) else { return nil }
            return (pid, args[i + 1])
        }
    }

    /// This build's sessions, each with the screen daemon that is the root of what runs in it and when that daemon started
    /// (Clean Up and MemoryWatch measure and list what runs below a root). Another build's sessions are never in it.
    static func sessionRoots(pids: [Int32]? = nil) -> [(name: String, root: Int32, started: UInt64)] {
        ownedDaemons(pids: pids).compactMap { d in Proc.info(d.pid).map { (d.name, d.pid, $0.started) } }
    }

    /// The app quits for good: every session of this build ends with everything running in it. Each session's whole
    /// process tree gets TERM, after about 3 s in all what is left gets KILL (with whatever the tree started meanwhile),
    /// then screen closes the session and this build's dead sockets are wiped. Blocks (call it off the main thread).
    /// Only processes seen as descendants of a session's screen get a signal, each by pid and start time: never a
    /// process group (a group can hold processes that left the tree, e.g. `nohup … &` from a subshell, now under
    /// launchd, and a dead leader's group id can be taken by an unrelated process), nor another build's sessions.
    static func quitAll(prefix: String = Detached.prefix) {
        let me = getuid()
        typealias P = (pid: Int32, started: UInt64)
        var sessions: [(name: String, tree: [P])] = []
        for d in ownedDaemons(prefix: prefix) {
            var tree: [P] = []
            collectOwned(d.pid, uid: me, into: &tree)
            sessions.append((d.name, tree))
        }
        guard !sessions.isEmpty else { return }
        var all = sessions.flatMap { $0.tree }
        let alive = { (list: [P]) in list.filter { t in Proc.info(t.pid)?.started == t.started } }
        for t in alive(all) { kill(t.pid, SIGTERM) }
        let deadline = Date().addingTimeInterval(3)
        while !alive(all).isEmpty, Date() < deadline { Thread.sleep(forTimeInterval: 0.1) }
        // What a process that is still alive (so still the one seen) started during the wait is in the tree too.
        var left = alive(all)
        let known = Set(left.map(\.pid))
        var spawned: [P] = []
        for t in left { for child in Proc.children(of: t.pid) where !known.contains(child) { collectOwned(child, uid: me, into: &spawned) } }
        left += spawned
        all += spawned
        for t in alive(left) { kill(t.pid, SIGKILL) }
        for s in sessions {
            runScreen(["-S", s.name, "-X", "quit"])
            // The session is gone, so its kept scrollback has nothing to attach to.
            forgetHistory(s.name)
        }
        // Only this build's: a match makes screen take an unreachable session of that name as dead, and leaves the rest.
        runScreen(["-wipe", prefix])
        NSLog("Orbiterm: quit closed %d sessions (%@), %d processes, %d needed KILL", sessions.count,
              sessions.map { "\($0.name):\($0.tree.count)" }.joined(separator: " "), all.count, left.count)
    }

    /// Runs screen with `args`, waiting at most `timeout` seconds for it (a session that doesn't answer never holds up
    /// the quit).
    private static func runScreen(_ args: [String], timeout: TimeInterval = 2) {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: screen)
        p.arguments = args
        p.standardOutput = FileHandle.nullDevice
        p.standardError = FileHandle.nullDevice
        guard (try? p.run()) != nil else { return }
        let deadline = Date().addingTimeInterval(timeout)
        while p.isRunning, Date() < deadline { Thread.sleep(forTimeInterval: 0.05) }
        if p.isRunning { p.terminate() }
    }

    /// A process and its descendants owned by `uid`, deepest first (login(1) runs as root and is skipped, its children
    /// are still walked).
    private static func collectOwned(_ pid: Int32, uid: uid_t, into tree: inout [(pid: Int32, started: UInt64)]) {
        for child in Proc.children(of: pid) { collectOwned(child, uid: uid, into: &tree) }
        if let info = Proc.info(pid), info.uid == uid { tree.append((pid, info.started)) }
    }

    // MARK: processes (libproc, no `ps`)

    /// The session name when `pid` is the screen daemon of one of our sessions (`anyBuild`: of any build's).
    private static func daemonName(_ pid: Int32, anyBuild: Bool = false) -> String? {
        guard Proc.name(pid) == "screen", let args = Proc.arguments(pid), let i = args.firstIndex(of: "-dmS"), i + 1 < args.count
        else { return nil }
        let name = args[i + 1]
        return (anyBuild ? allPrefixes : [prefix]).contains(where: name.hasPrefix) ? name : nil
    }

    private static let shells: Set<String> = ["zsh", "bash", "fish", "sh", "ksh", "tcsh", "csh"]

    /// The shell inside a session, i.e. Claude's parent process. screen starts it through login(1),
    /// which runs as root so its name can't be read: SCREEN -> login -> shell -> claude.
    private static func shellProcess(under daemon: Int32) -> Int32? {
        var level = Proc.children(of: daemon)
        for _ in 0..<2 {
            if let pid = level.first(where: { Proc.name($0).map(shells.contains) == true }) { return pid }
            level = level.flatMap { Proc.children(of: $0) }
        }
        return nil
    }

    private static func claudeProcess(under daemon: Int32) -> Int32? {
        var level = Proc.children(of: daemon)
        for _ in 0..<4 {
            if let pid = level.first(where: Proc.isClaude) { return pid }
            level = level.flatMap { Proc.children(of: $0) }
        }
        return nil
    }

    /// The shell of a named session (maps live sessions to their window), a mirrored one's too. Callable from any thread.
    nonisolated static func shellPid(_ name: String) -> Int32? {
        if let pid = Sessions.shell(named: name) { return pid }
        return Proc.all().first(where: { daemonName($0, anyBuild: true) == name }).flatMap(shellProcess(under:))
    }

    /// The folder each live session's shell is in now (the notes offer these as the projects to link a note to).
    static func liveFolders() -> [String] {
        Proc.all().compactMap { daemon in
            daemonName(daemon) == nil ? nil : shellProcess(under: daemon).flatMap { Proc.cwd($0) }
        }
    }

    struct RunningSession {
        let name: String
        /// The conversation of the Claude running in it; nil for a terminal where none runs.
        let sessionId: String?
        let claude: Bool
        let cwd: String
        let title: String
    }

    /// Sessions still running, e.g. after the app was restarted or force quit: chats (Claude running) and
    /// terminals (only the shell).
    static func runningSessions(registry: String) -> [RunningSession] {
        var out: [RunningSession] = []
        for daemon in Proc.all() {
            guard let name = daemonName(daemon) else { continue }
            // Back as a chat only when the dashboard knows its Claude (its registry entry is here); one run with another
            // CLAUDE_CONFIG_DIR comes back as a terminal, which still opens from the orbit.
            if let claude = claudeProcess(under: daemon),
               let reg = (try? Data(contentsOf: URL(fileURLWithPath: "\(registry)/\(claude).json")))
                   .flatMap({ try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }) {
                let cwd = reg["cwd"] as? String ?? HOME
                out.append(RunningSession(name: name, sessionId: reg["sessionId"] as? String, claude: true, cwd: cwd,
                                          title: reg["name"] as? String ?? (cwd as NSString).lastPathComponent))
            } else if let shell = shellProcess(under: daemon) {
                let cwd = Proc.cwd(shell) ?? HOME
                out.append(RunningSession(name: name, sessionId: nil, claude: false, cwd: cwd, title: (cwd as NSString).lastPathComponent))
            }
        }
        return out
    }

    /// Name of the session that hosts this process, if any (`anyBuild`: a session of another build too). Callable from any
    /// thread. A pty session of this app: the shell is its direct child, found by pid. A screen session: its daemon is
    /// above. Another build's pty session: a shell that is a child of another Orbiterm app, which says its session's name in
    /// the environment it started the shell with.
    nonisolated static func sessionName(hosting pid: Int32, anyBuild: Bool = false) -> String? {
        var cur = pid
        for _ in 0..<8 {
            if let n = Sessions.name(ofShell: cur) { return n }
            if let n = daemonName(cur, anyBuild: anyBuild) { return n }
            guard let parent = Proc.parent(cur), parent > 1 else { return nil }
            if anyBuild, parent != getpid(), Proc.name(parent) == appProcessName,
               let n = Proc.environment(cur)?["ORBITERM_SESSION"], allPrefixes.contains(where: n.hasPrefix) { return n }
            cur = parent
        }
        return nil
    }

    /// The app's own process name (the binary, `atalay-terminal`).
    private static let appProcessName = "atalay-terminal"

    /// Whether a screen daemon of any build runs a session by this name: one the other build can be shown here as a mirror.
    nonisolated static func isScreenSession(_ name: String) -> Bool {
        Proc.all().contains { daemonName($0, anyBuild: true) == name }
    }

    /// The other Orbiterm app a process runs under (a session that app owns), to bring it forward.
    nonisolated static func hostApp(ofSession pid: Int32) -> pid_t? {
        var cur = pid
        for _ in 0..<8 {
            guard let parent = Proc.parent(cur), parent > 1 else { return nil }
            if parent != getpid(), Proc.name(parent) == appProcessName { return parent }
            cur = parent
        }
        return nil
    }
}

/// A chat window's link to its session: a pty of the app (PtySession) or, from an older build, a detached screen session.
@MainActor
final class DetachedLink {
    let name: String
    private var cachedShell: Int32?

    init(name: String) { self.name = name }

    /// The pty session this is, while it lives.
    var pty: PtySession? { Sessions.live[name] }

    var shellPid: Int32? {
        if let pty { return pty.shellPid }
        if Sessions.ended.contains(name) { return nil }
        if let cachedShell, kill(cachedShell, 0) == 0 { return cachedShell }
        cachedShell = Detached.shellPid(name)
        return cachedShell
    }
}
