import AppKit
import WebKit

/// Whether Claude Code, Codex and Antigravity may read and edit the user's notes (tools: NotesTools.swift), and getting the tools
/// to them: when it is on, Orbiterm's MCP server is added to each of the three under a name of its own (`orbiterm-notes`, a
/// suffix for the other builds), through each one's own `mcp add` command (never by editing their files: Claude Code rewrites
/// ~/.claude.json all the time). Off removes the three again. The server itself shows the tools only to AI sessions that run in
/// Orbiterm's terminals, so an AI in another terminal app sees nothing.
/// Off by default: a note read by an AI goes to its provider, and notes hold passwords and keys now and then.
/// Modes: off, read, write (read + add, edit, pin). The page can't turn it on by itself: that goes through a native alert.
@MainActor
enum NotesAI {
    enum Mode: String { case off, read, write }
    nonisolated static let key = "notesAI"

    /// Read from any thread (the tools' handlers).
    nonisolated static var mode: Mode { Mode(rawValue: UserDefaults.standard.string(forKey: key) ?? "") ?? .off }

    /// The MCP server's launcher (the file the three AIs run: the app as `--mcp-bridge`), set by whoever owns the MCP server.
    /// While nil nothing is added to the AIs and Settings says so; the mode is kept all the same.
    /// Set at launch to `McpConnect.notesLauncher`: the bridge in its notes-only scope, which offers no session tool (AppDelegate).
    static var launcher: URL?

    /// One name per build, as the sessions are: the installed app's `orbiterm-notes`, staging's `orbiterm-notes-s`.
    static var serverName: String {
        let tag = String(Detached.prefix.dropLast())
        return tag == "atl" ? "orbiterm-notes" : "orbiterm-notes-" + tag.replacingOccurrences(of: "atl", with: "")
    }

    enum Tool: String, CaseIterable {
        case claude, codex, agy
        var title: String { ["claude": "Claude Code", "codex": "Codex", "agy": "Antigravity"][rawValue] ?? rawValue }

        /// Whether the tool is on this Mac at all.
        var present: Bool {
            let fm = FileManager.default
            switch self {
            case .claude: return fm.fileExists(atPath: CLAUDE_DIR) || fm.fileExists(atPath: HOME + "/.claude.json")
            case .codex: return fm.fileExists(atPath: codexHome)
            case .agy:
                return ["antigravity-cli", "antigravity", "antigravity-ide"].contains { fm.fileExists(atPath: HOME + "/.gemini/" + $0) }
                    || fm.fileExists(atPath: HOME + "/.gemini/config")
            }
        }

        func add(_ name: String, _ launcher: String) -> String {
            let q = TerminalFactory.shellQuote(launcher)
            switch self {
            case .claude: return "claude mcp add --scope user \(name) -- \(q)"
            case .codex: return "codex mcp add \(name) -- \(q)"
            case .agy: return "agy mcp add \(name) \(q)"
            }
        }

        func remove(_ name: String) -> String {
            switch self {
            case .claude: return "claude mcp remove --scope user \(name)"
            case .codex: return "codex mcp remove \(name)"
            case .agy: return "agy mcp remove \(name)"
            }
        }

        /// What the tool has under `name` now: the command it runs, nil when none (read from its own settings file).
        func registered(_ name: String) -> String? {
            switch self {
            case .claude:
                let files = [CLAUDE_DIR + "/.claude.json", HOME + "/.claude.json"]
                for f in files {
                    if let servers = NotesAI.json(f)?["mcpServers"] as? [String: Any], let s = servers[name] as? [String: Any] { return s["command"] as? String ?? "" }
                }
                return nil
            case .agy:
                let servers = NotesAI.json(HOME + "/.gemini/config/mcp_config.json")?["mcpServers"] as? [String: Any]
                return (servers?[name] as? [String: Any]).map { $0["command"] as? String ?? "" }
            case .codex:
                return NotesAI.codexCommand(name)
            }
        }
    }

    nonisolated static var codexHome: String { ProcessInfo.processInfo.environment["CODEX_HOME"] ?? HOME + "/.codex" }

    nonisolated static func json(_ file: String) -> [String: Any]? {
        FileManager.default.contents(atPath: file).flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }
    }

    /// `command = "…"` under `[mcp_servers.<name>]` in Codex's config.toml.
    nonisolated static func codexCommand(_ name: String) -> String? {
        let home = ProcessInfo.processInfo.environment["CODEX_HOME"] ?? HOME + "/.codex"
        guard let text = try? String(contentsOfFile: home + "/config.toml", encoding: .utf8) else { return nil }
        var inside = false
        for raw in text.components(separatedBy: "\n") {
            let line = raw.trimmingCharacters(in: .whitespaces)
            if line.hasPrefix("[") {
                inside = line == "[mcp_servers.\(name)]" || line == "[mcp_servers.\"\(name)\"]"
                continue
            }
            if inside, line.hasPrefix("command"), let a = line.firstIndex(of: "\""), let b = line.lastIndex(of: "\""), a < b {
                return String(line[line.index(after: a)..<b])
            }
        }
        return inside ? "" : (text.contains("[mcp_servers.\(name)]") ? "" : nil)
    }

    // MARK: on and off

    /// Every change to the three tools, one at a time.
    private static let queue = DispatchQueue(label: "notes-ai", qos: .utility)

    /// At a launch: what's on is kept (a moved app gets its launcher path put right), what's off is taken out again.
    static func autoStart() {
        McpHub.shared.refreshServer()
        sync()
    }

    static func setMode(_ m: Mode, done: (() -> Void)? = nil) {
        UserDefaults.standard.set(m.rawValue, forKey: key)
        // Every note's window and the dashboard's page show the level (the eye, the chip): they are told at once.
        NoteWindow.aiModeChanged()
        // The server's socket follows: open while this or the Claude access is on.
        McpHub.shared.refreshServer()
        sync(done: done)
    }

    /// The three tools as the mode says. Each through its own command, from the user's login shell (where they are on the PATH).
    static func sync(done: (() -> Void)? = nil) {
        let want = mode != .off ? launcher?.path : nil
        let name = serverName
        let known = launcher != nil
        let shell = TerminalFactory.userShell()
        queue.async {
            if known {
                for tool in Tool.allCases where tool.present {
                    let now = tool.registered(name)
                    if let want {
                        if now == want { continue }
                        if now != nil { _ = run(shell, tool.remove(name)) }
                        _ = run(shell, tool.add(name, want))
                    } else if now != nil {
                        _ = run(shell, tool.remove(name))
                    }
                }
            }
            if let done { DispatchQueue.main.async { done() } }
        }
    }

    private nonisolated static func run(_ shell: String, _ command: String) -> Bool {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: shell)
        p.arguments = ["-ilc", command]
        p.standardInput = FileHandle.nullDevice
        p.standardOutput = FileHandle.nullDevice
        p.standardError = FileHandle.nullDevice
        guard (try? p.run()) != nil else { return false }
        p.waitUntilExit()
        return p.terminationStatus == 0
    }

    /// For Settings: the mode, whether the server is in this build, and which tools have it.
    static func state() -> [String: Any] {
        var tools: [String: Any] = [:]
        for t in Tool.allCases where t.present { tools[t.rawValue] = t.registered(serverName) != nil }
        return ["mode": mode.rawValue, "ready": launcher != nil, "tools": tools,
                "outsideWriteNeedsType": NotesTools.outsideWritesNeedWatchAndType]
    }
}

/// Settings' switch (web/cloud.js): `{ type: "state" }`, `{ type: "mode", mode }`. Turning it on or to editing asks in a native
/// alert the page can't answer; turning it off, and reading the state, need nothing.
@MainActor
final class NotesAIBridge: NSObject, WKScriptMessageHandlerWithReply {
    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.isFileURL == true else { return replyHandler(nil, "refused") }
        let body = message.body as? [String: Any] ?? [:]
        switch body["type"] as? String {
        case "state": replyHandler(NotesAI.state(), nil)
        case "mode":
            guard let want = NotesAI.Mode(rawValue: body["mode"] as? String ?? "") else { return replyHandler(NotesAI.state(), nil) }
            let was = NotesAI.mode
            if want != .off, want != was, !(want == .read && was == .write) {
                // `refused` says why nothing changed: "wait" (a question is up, or one was asked a moment ago) or "cancel" (the user said no).
                switch Self.confirm(want) {
                case .yes: break
                case .wait: return replyHandler(NotesAI.state().merging(["refused": "wait"]) { $1 }, nil)
                case .cancel: return replyHandler(NotesAI.state().merging(["refused": "cancel"]) { $1 }, nil)
                }
            }
            NotesAI.setMode(want) { replyHandler(NotesAI.state(), nil) }
        default: replyHandler(nil, "unknown request")
        }
    }

    private static var asking = false
    private static var lastAsk = -Double.infinity

    private enum Answer { case yes, wait, cancel }

    private static func confirm(_ want: NotesAI.Mode) -> Answer {
        // One question at a time, and not more often than every ten seconds: a page can't wear the answer out.
        let now = ProcessInfo.processInfo.systemUptime
        guard !asking, now - lastAsk >= 10 else { return .wait }
        asking = true
        defer { asking = false; lastAsk = ProcessInfo.processInfo.systemUptime }
        let alert = NSAlert()
        alert.alertStyle = want == .write ? .warning : .informational
        if want == .write {
            alert.messageText = "Let AI read and edit your notes?"
            alert.informativeText = "AI in Orbiterm's terminals (Claude Code, Codex, Antigravity) and Claude Desktop, if you connect it, will be able to read all your notes, add to them, change them, make new ones and pin or open them on your screen. What they read goes to their provider. Passwords and keys are hidden first, but everything else in a note is sent. Every change shows on the note with Undo. You can turn this off at any time."
            alert.addButton(withTitle: "Cancel")
            alert.addButton(withTitle: "Allow reading and editing")
        } else {
            alert.messageText = "Let AI read your notes?"
            alert.informativeText = "AI in Orbiterm's terminals (Claude Code, Codex, Antigravity) and Claude Desktop, if you connect it, will be able to read all your notes, never change them. What they read goes to their provider. Passwords and keys are hidden first, but everything else in a note is sent. Hide a note from AI with its eye. You can turn this off at any time."
            alert.addButton(withTitle: "Cancel")
            alert.addButton(withTitle: "Allow reading")
        }
        // Cancel is the one Return presses.
        return alert.runModal() == .alertSecondButtonReturn ? .yes : .cancel
    }
}
