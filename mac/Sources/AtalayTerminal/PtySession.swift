import AppKit
import SwiftTerm

/// One terminal session the app runs itself: a pty (SwiftTerm's LocalProcess inside `terminal`) with the user's shell.
/// The view IS the session: it stays alive while no window shows it (a parked pane, kept by `Sessions.live`). It lives
/// and ends with the app; an update's restart or a crash brings it back as a new shell (SessionSnapshot).
@MainActor
final class PtySession: NSObject, LocalProcessTerminalViewDelegate {
    private(set) var name: String
    private(set) var terminal: ChatTerminalView!
    let cwd: String
    /// When it started, or last restarted with another Claude account: the AI it resumes takes a moment to show under the
    /// new shell (MainWindowController.inspect).
    private(set) var started = Date()
    /// The AI it was started to resume (`tool`: "claude", "codex", "agy", "cursor"), for the snapshot until one shows under the shell.
    var ai: (tool: String, id: String)?
    /// The Claude account its environment was made for (ClaudeAccounts id), nil for the default one. A switch in the same
    /// terminal changes it (ChatWindowController.acctPerform).
    var account: String?
    /// The window or pane showing it now; nil while parked. Every delegate call is forwarded there.
    weak var owner: LocalProcessTerminalViewDelegate?
    /// Ended (its shell exited, or End Session): no longer in `Sessions.live`.
    private(set) var finished = false
    /// An AI (the one in `ai`) was seen running under the shell: from then on the AI leaving ends its being resumed, instead
    /// of waiting for it to show up (MainWindowController.inspect).
    var aiSeen = false

    /// The window or pane showing it is still open (not one that went away while the session lived on).
    var ownerIsLive: Bool {
        if let w = owner as? ChatWindowController { return w.manager?.isOpen(w) ?? false }
        if let p = owner as? ExtraPane { return p.isInWindow }
        return false
    }

    fileprivate init(name: String, cwd: String, fontSize: CGFloat) {
        self.name = name
        self.cwd = cwd
        super.init()
        terminal = TerminalFactory.makeIdle(chatId: "", fontSize: fontSize, delegate: self)
        try? terminal.setUseMetal(true)
    }

    /// The shell, while it runs.
    var shellPid: Int32? {
        guard !finished else { return nil }
        let pid = terminal.process.shellPid
        return pid > 0 ? pid : nil
    }

    /// What to start in this same view once the shell now ending has gone (restart).
    private var relaunch: (cwd: String, args: [String]?, account: String?)?

    /// Goes on in the same terminal with another Claude account: the shell and Claude in it get a hangup, and once it has
    /// ended a new shell starts in this same view (the window or pane never hears of an end) with the account's environment,
    /// running `claude <args>`. Nothing is typed into the terminal. False when it can't: ended, or a restart already under way.
    @discardableResult
    func restart(cwd: String, claudeArgs: [String]?, account: String?) -> Bool {
        guard !finished, relaunch == nil else { return false }
        relaunch = (cwd, claudeArgs, account)
        // The account it is for from now on (the title chip, the snapshot), and a fresh start for the AI to show up in.
        self.account = account
        started = Date()
        let shell = terminal.process.shellPid
        if shell > 0 { Detached.endTree(shell) } else { processTerminated(source: terminal, exitCode: nil) }
        return true
    }

    /// A tab dragged into a split (or the other way) is named for its new kind, for the next launch.
    func rename(to new: String) {
        guard new != name, !finished else { return }
        Sessions.rename(self, to: new)
        name = new
    }

    /// Types `text` into the session (the MCP's send_prompt). Straight to the pty, not through the view's send: that
    /// counts as the user typing.
    func write(_ text: String) {
        guard !finished else { return }
        terminal.process.send(data: ArraySlice(Array(text.utf8)))
    }

    /// End Session, a pane closed for good, End Terminal: the shell and everything in it get a hangup (deepest first), TERM
    /// three seconds later and KILL two after that, as an ended session always did: it leaves nothing behind.
    func end() {
        guard !finished else { return }
        finished = true
        let shell = terminal.process.shellPid
        Sessions.remove(self)
        // Nothing else holds the session (its view's delegate and its owner are weak): kept until its shell is reaped, so
        // the window or pane showing it hears that it ended (processTerminated).
        Sessions.dying[name] = self
        Detached.forgetHistory(name)
        if shell > 0 { Detached.endTree(shell) }
        terminal.terminate()
    }

    // MARK: LocalProcessTerminalViewDelegate

    func sizeChanged(source: LocalProcessTerminalView, newCols: Int, newRows: Int) {
        owner?.sizeChanged(source: source, newCols: newCols, newRows: newRows)
    }

    func setTerminalTitle(source: LocalProcessTerminalView, title: String) {
        owner?.setTerminalTitle(source: source, title: title)
    }

    func hostCurrentDirectoryUpdate(source: TerminalView, directory: String?) {
        owner?.hostCurrentDirectoryUpdate(source: source, directory: directory)
    }

    /// Its shell exited (`exit`, Ctrl-D, a crash), or was ended: the session is gone. The window or pane showing it hears
    /// of it; a parked one has none, and its car goes at the next terminals update.
    func processTerminated(source: TerminalView, exitCode: Int32?) {
        // A restart (another Claude account): the same view starts a new shell, and nobody hears that the old one ended.
        if let r = relaunch, !finished, !Sessions.stopping {
            relaunch = nil
            account = r.account
            started = Date()
            let shell = TerminalFactory.userShell()
            Sessions.closeOnExec()
            terminal.startProcess(executable: shell, args: TerminalFactory.shellArgs(shell, cwd: r.cwd, claudeArgs: r.args, account: r.account),
                                  environment: TerminalFactory.childEnvironment(account: r.account) + ["ORBITERM_SESSION=" + name],
                                  execName: nil, currentDirectory: r.cwd)
            Sessions.closeOnExec()
            let pid = terminal.process.shellPid
            if pid > 0 { Sessions.setShell(name, pid) }
            if r.account != nil { Limits.installScript() }
            // The engine matches an AI to its window by the AI's shell: it learns the new one now. Without this the chat
            // going on here belonged to no window, so the next switch took the pane for a plain terminal and restarted it
            // without Claude (the window then showed ended).
            MainWindowController.shared?.panesChanged()
            return
        }
        // The app is quitting or restarting: the windows are being torn down and what the shells showed was just kept for
        // the next launch (MainWindowController.terminateAll), so nothing here may touch it.
        Sessions.dying[name] = nil
        guard !Sessions.stopping else { return }
        if !finished {
            finished = true
            Sessions.remove(self)
            Detached.forgetHistory(name)
        }
        owner?.processTerminated(source: source, exitCode: exitCode)
    }

    /// The pty couldn't be opened: the same as a shell that ended at once.
    func processFailedToStart(source: TerminalView, error: LocalProcessError) {
        NSLog("Orbiterm: couldn't start a terminal session (%@)", String(describing: error))
        processTerminated(source: source, exitCode: nil)
    }
}

/// The terminal sessions this run owns, by name (`atl-<uuid>`, panes `atl-x<t|v|h><8hex>-<window id>`, the same names a
/// screen session had, so tabs, parked panes and notes keep working). A name that is in `live` is a pty session;
/// anything else is a screen session an older build left (Detached) or gone.
enum Sessions {
    @MainActor fileprivate(set) static var live: [String: PtySession] = [:]
    /// Names that were pty sessions in this run and ended: nothing is looked up for them in screen.
    @MainActor fileprivate(set) static var ended: Set<String> = []
    /// Sessions that ended (End Session) and wait for their shell to be reaped.
    @MainActor fileprivate(set) static var dying: [String: PtySession] = [:]
    /// The app is quitting or restarting: the sessions' own end-of-process news is ignored (see processTerminated).
    @MainActor static var stopping = false

    /// Name to shell pid, readable from any thread: the MCP tools and Runaways ask from theirs.
    private static let lock = NSLock()
    nonisolated(unsafe) private static var shells: [String: Int32] = [:]

    nonisolated static func shell(named name: String) -> Int32? { lock.withLock { shells[name] } }

    nonisolated static func name(ofShell pid: Int32) -> String? { lock.withLock { shells.first { $0.value == pid }?.key } }

    /// Every live session's shell, by name (Clean Up's roots, the notes' project folders).
    nonisolated static func allShells() -> [(name: String, pid: Int32)] { lock.withLock { shells.map { ($0.key, $0.value) } } }

    /// Whether `pid` is the shell of one of this run's own sessions.
    nonisolated static func isShell(_ pid: Int32) -> Bool { lock.withLock { shells.values.contains(pid) } }

    fileprivate static func setShell(_ name: String, _ pid: Int32?) {
        lock.withLock { shells[name] = pid }
    }

    /// A shell in `cwd` in a pty of the app's own (running Claude, Codex, Antigravity or Cursor first when `claudeArgs` is given, as
    /// TerminalFactory.shellArgs says). `history` (the scrollback an update's restart kept) shows first, then `notice`,
    /// dimmed.
    @MainActor
    static func start(name: String, cwd: String, claudeArgs: [String]?, fontSize: CGFloat, ai: (tool: String, id: String)? = nil,
                      history: [String] = [], notice: String? = nil, size: NSSize? = nil, account: String? = nil) -> PtySession {
        let session = PtySession(name: name, cwd: cwd, fontSize: fontSize)
        session.ai = ai
        session.account = account
        // A session of another account: the status line script is re-installed if the installed app's older one replaced it.
        if account != nil { Limits.installScript() }
        let tv = session.terminal!
        // The size the view will have, so the shell (and Claude) start at it instead of at the default and redraw.
        if let size, size.width >= 100, size.height >= 60 { tv.frame = NSRect(origin: .zero, size: size) }
        if !history.isEmpty { tv.feed(text: history.joined(separator: "\r\n") + "\r\n") }
        if let notice { tv.feed(text: "\u{1b}[2m" + notice + "\u{1b}[0m\r\n\r\n") }
        let shell = TerminalFactory.userShell()
        closeOnExec()
        tv.startProcess(executable: shell, args: TerminalFactory.shellArgs(shell, cwd: cwd, claudeArgs: claudeArgs, account: account),
                        environment: TerminalFactory.childEnvironment(account: account) + ["ORBITERM_SESSION=" + name], execName: nil, currentDirectory: cwd)
        // The new pty's own master too, before the next process starts.
        closeOnExec()
        live[name] = session
        ended.remove(name)
        let pid = tv.process.shellPid
        if pid > 0 { setShell(name, pid) }
        return session
    }

    /// Marks one descriptor close-on-exec the moment it is made (a socket, an accepted connection), so a shell started by
    /// another thread in between never inherits it. Returns `fd`.
    @discardableResult
    nonisolated static func cloexec(_ fd: Int32) -> Int32 {
        if fd >= 0 { _ = fcntl(fd, F_SETFD, fcntl(fd, F_GETFD) | FD_CLOEXEC) }
        return fd
    }

    /// Every descriptor the app has open (from 3 up) closes when a process is started. SwiftTerm's child does a bare fork and
    /// exec, and the pty masters and the app's sockets (the MCP listener…) aren't close-on-exec: without this, each new shell
    /// and everything it starts (Claude, a daemon) would hold the masters of every earlier session, which then never hang
    /// up when the app dies, and the app's listening sockets. Call it right before a SwiftTerm `startProcess`.
    nonisolated static func closeOnExec() {
        let pid = getpid()
        let bytes = proc_pidinfo(pid, PROC_PIDLISTFDS, 0, nil, 0)
        guard bytes > 0 else { return }
        let stride = MemoryLayout<proc_fdinfo>.stride
        var fds = [proc_fdinfo](repeating: proc_fdinfo(), count: Int(bytes) / stride + 16)
        let got = proc_pidinfo(pid, PROC_PIDLISTFDS, 0, &fds, Int32(fds.count * stride))
        guard got > 0 else { return }
        for fd in fds.prefix(Int(got) / stride) where fd.proc_fd >= 3 {
            let flags = fcntl(fd.proc_fd, F_GETFD)
            if flags >= 0, flags & FD_CLOEXEC == 0 { _ = fcntl(fd.proc_fd, F_SETFD, flags | FD_CLOEXEC) }
        }
    }

    @MainActor
    fileprivate static func rename(_ session: PtySession, to new: String) {
        let old = session.name
        guard live[old] === session else { return }
        live[old] = nil
        live[new] = session
        ended.remove(new)
        let pid = shell(named: old)
        lock.withLock {
            shells[old] = nil
            if let pid { shells[new] = pid }
        }
    }

    @MainActor
    fileprivate static func remove(_ session: PtySession) {
        if live[session.name] === session { live[session.name] = nil }
        ended.insert(session.name)
        setShell(session.name, nil)
    }
}

/// What comes back after an update's restart or a crash: every live terminal session, with the AI conversation running in
/// it. File `sessions-<prefix>.json` next to the app's other data (0600). Written whenever it changes, deleted when the app
/// quits for good, written once more with reason "update" when it restarts to update.
struct SessionSnapshot: Codable, Equatable {
    struct AI: Codable, Equatable {
        var tool: String
        var id: String
    }
    struct Entry: Codable, Equatable {
        var name: String
        var cwd: String
        var title: String
        var ai: AI?
        /// The Claude account it ran with (nil: the default one, and what a file from an older build says).
        var account: String?
    }
    var v = 1
    /// "running" (what a crash leaves) or "update".
    var reason: String
    var sessions: [Entry]

    static let url: URL = {
        let base = (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: HOME + "/Library/Application Support")).appendingPathComponent("atalay-terminal")
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        return base.appendingPathComponent("sessions-" + Detached.prefix.dropLast() + ".json")
    }()

    static func read() -> SessionSnapshot? {
        guard let data = try? Data(contentsOf: url), let s = try? JSONDecoder().decode(SessionSnapshot.self, from: data), s.v == 1
        else { return nil }
        return s
    }

    func write() {
        guard !sessions.isEmpty else { return Self.delete() }
        guard let data = try? JSONEncoder().encode(self) else { return }
        try? data.write(to: Self.url, options: .atomic)
        try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: Self.url.path)
    }

    static func delete() {
        try? FileManager.default.removeItem(at: url)
    }
}
