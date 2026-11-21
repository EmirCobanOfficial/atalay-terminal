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
    let started = Date()
    /// The AI it was started to resume (`tool`: "claude", "codex", "agy"), for the snapshot until one shows under the shell.
    var ai: (tool: String, id: String)?
    /// The window or pane showing it now; nil while parked. Every delegate call is forwarded there.
    weak var owner: LocalProcessTerminalViewDelegate?
    /// Ended (its shell exited, or End Session): no longer in `Sessions.live`.
    private(set) var finished = false

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
        // The app is quitting or restarting: the windows are being torn down and what the shells showed was just kept for
        // the next launch (MainWindowController.terminateAll), so nothing here may touch it.
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
    /// The app is quitting or restarting: the sessions' own end-of-process news is ignored (see processTerminated).
    @MainActor static var stopping = false

    /// Name to shell pid, readable from any thread: the MCP tools and Runaways ask from theirs.
    private static let lock = NSLock()
    nonisolated(unsafe) private static var shells: [String: Int32] = [:]

    nonisolated static func shell(named name: String) -> Int32? { lock.withLock { shells[name] } }

    nonisolated static func name(ofShell pid: Int32) -> String? { lock.withLock { shells.first { $0.value == pid }?.key } }

    private static func setShell(_ name: String, _ pid: Int32?) {
        lock.withLock { shells[name] = pid }
    }

    /// A shell in `cwd` in a pty of the app's own (running Claude, Codex or Antigravity first when `claudeArgs` is given, as
    /// TerminalFactory.shellArgs says). `history` (the scrollback an update's restart kept) shows first, then `notice`,
    /// dimmed.
    @MainActor
    static func start(name: String, cwd: String, claudeArgs: [String]?, fontSize: CGFloat, ai: (tool: String, id: String)? = nil,
                      history: [String] = [], notice: String? = nil) -> PtySession {
        let session = PtySession(name: name, cwd: cwd, fontSize: fontSize)
        session.ai = ai
        let tv = session.terminal!
        if !history.isEmpty { tv.feed(text: history.joined(separator: "\r\n") + "\r\n") }
        if let notice { tv.feed(text: "\u{1b}[2m" + notice + "\u{1b}[0m\r\n\r\n") }
        let shell = TerminalFactory.userShell()
        tv.startProcess(executable: shell, args: TerminalFactory.shellArgs(shell, cwd: cwd, claudeArgs: claudeArgs),
                        environment: TerminalFactory.childEnvironment() + ["ORBITERM_SESSION=" + name], execName: nil, currentDirectory: cwd)
        live[name] = session
        ended.remove(name)
        let pid = tv.process.shellPid
        if pid > 0 { setShell(name, pid) }
        return session
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
