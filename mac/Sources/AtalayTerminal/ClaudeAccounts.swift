import Foundation
import CryptoKit

/// One Claude subscription Orbiterm can start Claude Code with. The default one is Claude Code's own folder (CLAUDE_DIR, no
/// CLAUDE_CONFIG_DIR set); the others live in `~/.claude-accounts/<id>`, each with its own sign-in, which Claude Code keeps
/// itself: Orbiterm never reads, copies or stores a token, and sets nothing but `CLAUDE_CONFIG_DIR`.
struct ClaudeAccount: Equatable {
    var id: String
    /// nil: the default account.
    var dir: String?
    var email = "", orgId = "", orgName = "", plan = ""
    var label: String
    var initial: String
    /// "r, g, b", from the warm set (ClaudeAccounts.hues).
    var hue: String
    var isDefault: Bool { dir == nil }
    /// What Claude Code calls this folder for its environment: nothing for the default one.
    var envDir: String? { dir }

    var json: [String: Any] {
        ["id": id, "label": label, "initial": initial, "hue": hue, "email": email, "orgId": orgId, "orgName": orgName,
         "plan": plan, "isDefault": isDefault]
    }
}

/// The accounts file (`claude-accounts.json` in the app's data folder): `{accounts: [...], projects: {<repo top>: id}}`.
/// No file means one default account and nothing visible anywhere (PLAN step 10). Readable from any thread.
enum ClaudeAccounts {
    static let root = HOME + "/.claude-accounts"
    static let hues = ["255, 176, 87", "224, 132, 156", "255, 122, 69", "233, 196, 106"]
    static let defaultId = "default"

    private static let fileURL: URL = {
        let base = (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: HOME + "/Library/Application Support")).appendingPathComponent("atalay-terminal")
        return base.appendingPathComponent("claude-accounts.json")
    }()
    static var path: String { fileURL.path }

    private static let lock = NSLock()
    /// Reading, changing and writing the file happens one at a time (Claude's status comes back on another thread).
    private static let io = NSRecursiveLock()
    nonisolated(unsafe) private static var cache: (mtime: Double, list: [ClaudeAccount], projects: [String: String])?

    private static func mtime() -> Double {
        var st = stat()
        guard stat(fileURL.path, &st) == 0 else { return -1 }
        return Double(st.st_mtimespec.tv_sec) * 1000 + Double(st.st_mtimespec.tv_nsec) / 1e6
    }

    /// "r, g, b" with three numbers up to 255, nothing else.
    static func validHue(_ s: String) -> Bool {
        let p = s.split(separator: ",", omittingEmptySubsequences: false).map { $0.trimmingCharacters(in: .whitespaces) }
        return p.count == 3 && p.allSatisfy { !$0.isEmpty && $0.count <= 3 && $0.allSatisfy(\.isASCII) && Int($0).map { (0...255).contains($0) } == true }
    }

    private static func placeholder() -> ClaudeAccount {
        ClaudeAccount(id: defaultId, dir: nil, label: "Claude", initial: "C", hue: hues[0])
    }

    private static func read() -> (list: [ClaudeAccount], projects: [String: String]) {
        let m = mtime()
        if let c = lock.withLock({ cache }), c.mtime == m { return (c.list, c.projects) }
        var list: [ClaudeAccount] = []
        var projects: [String: String] = [:]
        if m >= 0, let data = try? Data(contentsOf: fileURL), let j = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            for a in j["accounts"] as? [[String: Any]] ?? [] {
                guard let id = a["id"] as? String, !id.isEmpty else { continue }
                let dir = a["dir"] as? String
                // The colour goes into the pages' styles: only "r, g, b" is taken from the file.
                let hue = (a["hue"] as? String).flatMap { validHue($0) ? $0 : nil } ?? hues[0]
                list.append(ClaudeAccount(id: id, dir: (dir?.isEmpty ?? true) ? nil : dir, email: a["email"] as? String ?? "",
                                          orgId: a["orgId"] as? String ?? "", orgName: a["orgName"] as? String ?? "",
                                          plan: a["plan"] as? String ?? "", label: a["label"] as? String ?? id,
                                          initial: a["initial"] as? String ?? String((a["label"] as? String ?? id).prefix(1)).uppercased(),
                                          hue: hue))
            }
            projects = j["projects"] as? [String: String] ?? [:]
        }
        if !list.contains(where: \.isDefault) { list.insert(placeholder(), at: 0) }
        lock.withLock { cache = (m, list, projects) }
        return (list, projects)
    }

    private static func write(_ list: [ClaudeAccount], _ projects: [String: String]) {
        let accounts: [[String: Any]] = list.map { a in
            var d = a.json
            d.removeValue(forKey: "isDefault")
            d["dir"] = a.dir ?? NSNull()
            return d
        }
        guard let data = try? JSONSerialization.data(withJSONObject: ["accounts": accounts, "projects": projects] as [String: Any],
                                                     options: [.prettyPrinted, .sortedKeys]) else { return }
        try? FileManager.default.createDirectory(at: fileURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? data.write(to: fileURL, options: .atomic)
        try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: fileURL.path)
        lock.withLock { cache = nil }
    }

    // MARK: reading

    static var all: [ClaudeAccount] { read().list }
    static var multiple: Bool { all.count > 1 }
    static func account(_ id: String?) -> ClaudeAccount? { all.first { $0.id == id } }
    static var defaultAccount: ClaudeAccount { all.first(where: \.isDefault) ?? placeholder() }

    /// The folder Claude Code keeps this account's files in.
    static func dir(of id: String?) -> String { account(id)?.dir ?? CLAUDE_DIR }

    /// The account a folder (a registry's parent) belongs to.
    static func id(ofDir dir: String) -> String {
        let real = URL(fileURLWithPath: dir).resolvingSymlinksInPath().path
        for a in all {
            let d = a.dir ?? CLAUDE_DIR
            if d == dir || URL(fileURLWithPath: d).resolvingSymlinksInPath().path == real { return a.id }
        }
        return defaultId
    }

    /// Every account's folder, the default's first: where the engine looks for live sessions.
    static var dirs: [(id: String, dir: String)] { all.map { ($0.id, $0.dir ?? CLAUDE_DIR) } }

    /// The account last used in a repo's top folder (the pickers' default), if it still exists.
    static func lastAccount(inRepo top: String) -> String? {
        let (list, projects) = read()
        return projects[top].flatMap { id in list.contains { $0.id == id } ? id : nil }
    }

    static func remember(_ id: String, inRepo top: String) {
        io.lock(); defer { io.unlock() }
        guard multiple else { return }
        let (list, projects) = read()
        guard projects[top] != id else { return }
        var p = projects
        p[top] = id
        write(list, p)
    }

    // MARK: the limits files (the status line script writes one per account)

    /// First 8 hex digits of the sha256 of the folder's path, as the status line script computes them.
    static func sha8(_ dir: String) -> String {
        SHA256.hash(data: Data(dir.utf8)).prefix(4).map { String(format: "%02x", $0) }.joined()
    }

    static func limitsPath(of a: ClaudeAccount) -> String {
        guard let dir = a.dir else { return Limits.path }
        return (Limits.path as NSString).deletingLastPathComponent + "/limits-claude-" + sha8(dir) + ".json"
    }

    /// The last parse of each limits file, by path: the chat windows ask on every brief change, the file changes far less.
    nonisolated(unsafe) private static var limitsCache: [String: (mtime: Double, json: [String: Any]?)] = [:]

    /// `{fiveHour, week, at}` as Limits.parse gives them, for one account.
    static func limits(of a: ClaudeAccount) -> [String: Any]? {
        let path = limitsPath(of: a)
        var st = stat()
        guard stat(path, &st) == 0 else { return nil }
        let m = Double(st.st_mtimespec.tv_sec) * 1000 + Double(st.st_mtimespec.tv_nsec) / 1e6
        if let c = lock.withLock({ limitsCache[path] }), c.mtime == m { return c.json }
        let json = Limits.parse(path: path, mtime: m)
        lock.withLock { limitsCache[path] = (m, json) }
        return json
    }

    // MARK: adding, naming, removing

    private static let shared = ["projects", "settings.json", "CLAUDE.md", "skills", "agents", "plugins"]

    /// A new account: its folder under ~/.claude-accounts (the path is never changed afterwards: Claude Code keys its
    /// sign-in to it), with the files that should be the same everywhere linked to the default's. Sign-in is a normal
    /// terminal (`claude auth login`), started by the caller.
    static func create(label: String, hue: String?) -> ClaudeAccount? {
        io.lock(); defer { io.unlock() }
        let (list, projects) = read()
        let name = label.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return nil }
        // ASCII only: the folder's path is what Claude Code keys the sign-in to and what the status line script hashes, so
        // no letter that Unicode can write two ways goes into it.
        var slug = String(name.lowercased().map { $0.isASCII && ($0.isLetter || $0.isNumber) ? $0 : "-" })
        slug = slug.split(separator: "-").joined(separator: "-")
        if slug.isEmpty || slug == defaultId { slug = "account" }
        var id = slug, n = 2
        while list.contains(where: { $0.id == id }) { id = "\(slug)-\(n)"; n += 1 }
        let dir = root + "/" + id
        let fm = FileManager.default
        do {
            try fm.createDirectory(atPath: root, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
            try fm.createDirectory(atPath: dir, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
        } catch { return nil }
        // The shared chat history: one projects folder, so a chat can go on with another account.
        try? fm.createDirectory(atPath: CLAUDE_DIR + "/projects", withIntermediateDirectories: true)
        for item in shared where fm.fileExists(atPath: CLAUDE_DIR + "/" + item) {
            let link = dir + "/" + item
            if (try? fm.destinationOfSymbolicLink(atPath: link)) == nil, !fm.fileExists(atPath: link) {
                try? fm.createSymbolicLink(atPath: link, withDestinationPath: CLAUDE_DIR + "/" + item)
            }
        }
        let taken = Set(list.map(\.initial))
        var initial = String(name.prefix(1)).uppercased()
        if taken.contains(initial) {
            initial = name.uppercased().first { $0.isLetter && !taken.contains(String($0)) }.map { String($0) } ?? initial
        }
        let chosen = hue ?? hues[list.count % hues.count]
        let account = ClaudeAccount(id: id, dir: dir, label: name, initial: initial, hue: chosen)
        var all = list
        // The first time there is a file at all: the default account is written down too.
        all.append(account)
        write(all, projects)
        Limits.installScript()
        syncMcp()
        return account
    }

    static func update(_ id: String, _ change: (inout ClaudeAccount) -> Void) {
        io.lock(); defer { io.unlock() }
        let (current, projects) = read()
        var list = current
        guard let i = list.firstIndex(where: { $0.id == id }) else { return }
        change(&list[i])
        write(list, projects)
    }

    static func rename(_ id: String, to label: String) {
        let name = label.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        update(id) { $0.label = name }
    }

    /// Takes an account out: its sign-out, its links and its folder. Never through a link: a link is unlinked, never followed.
    /// The default account stays. Returns an error line, or nil when done.
    static func remove(_ id: String) -> String? {
        io.lock(); defer { io.unlock() }
        let (current, saved) = read()
        guard let a = current.first(where: { $0.id == id }), let dir = a.dir else { return "The default account can't be removed." }
        guard ownFolder(dir) else { return "Unexpected folder." }
        // Out of the list first (nothing polls, hooks or syncs it any more); its folder goes once Claude Code has signed it
        // out, so the sign-out finds it and a later account with the same name can't start signed in to this one.
        write(current.filter { $0.id != id }, saved.filter { $0.value != id })
        let limits = limitsPath(of: a)
        runClaude("auth logout", dir: dir) { _, _ in
            deleteFolder(dir)
            try? FileManager.default.removeItem(atPath: limits)
        }
        return nil
    }

    /// An account folder Orbiterm made: `~/.claude-accounts/<one name>`, a real folder (not a link), and not the default's
    /// folder, the home folder or anything in them by another way.
    private static func ownFolder(_ dir: String) -> Bool {
        guard dir.hasPrefix(root + "/") else { return false }
        let name = String(dir.dropFirst(root.count + 1))
        guard !name.isEmpty, !name.contains("/"), name != ".", name != ".." else { return false }
        // attributesOfItem doesn't follow a link at the end of the path.
        guard let type = (try? FileManager.default.attributesOfItem(atPath: dir))?[.type] as? FileAttributeType,
              type == .typeDirectory else { return false }
        let real = URL(fileURLWithPath: dir).resolvingSymlinksInPath().path
        let claude = URL(fileURLWithPath: CLAUDE_DIR).resolvingSymlinksInPath().path
        let home = URL(fileURLWithPath: HOME).resolvingSymlinksInPath().path
        return real != home && real != claude && !real.hasPrefix(claude + "/") && !claude.hasPrefix(real + "/")
    }

    /// Deletes an account folder: each entry in it is removed by FileManager, which unlinks a link (the shared history,
    /// settings, skills…) and never follows one; then the folder. Checked again right before.
    private static func deleteFolder(_ dir: String) {
        io.lock(); defer { io.unlock() }
        // An account added again under the same name while the sign-out ran owns the folder now.
        guard ownFolder(dir), !all.contains(where: { $0.dir == dir }) else { return }
        let fm = FileManager.default
        for name in (try? fm.contentsOfDirectory(atPath: dir)) ?? [] {
            try? fm.removeItem(atPath: dir + "/" + name)
        }
        try? fm.removeItem(atPath: dir)
    }

    // MARK: Claude Code's own commands, run with the account's folder

    /// The environment for one of Claude Code's commands under an account: ours, plus its folder.
    nonisolated static func commandEnvironment(dir: String?) -> [String: String] {
        var env = TerminalFactory.childEnvironmentDict()
        if let dir { env["CLAUDE_CONFIG_DIR"] = dir }
        env.removeValue(forKey: "ANTHROPIC_API_KEY")
        env.removeValue(forKey: "ANTHROPIC_AUTH_TOKEN")
        return env
    }

    /// Runs `claude <args>` through the user's login shell (where `claude` is on the PATH), off the main thread. Another
    /// account's folder is also set on the command itself, as in its terminals: the shell's rc files run after our
    /// environment and may set their own, and a sign-out or a status must reach this account and no other.
    nonisolated static func runClaude(_ args: String, dir: String?, timeout: TimeInterval = 25,
                                      done: @escaping @Sendable (Int32, String) -> Void) {
        DispatchQueue.global(qos: .utility).async {
            let p = Process()
            p.executableURL = URL(fileURLWithPath: TerminalFactory.userShell())
            let prefix = dir.map { "env -u ANTHROPIC_API_KEY -u ANTHROPIC_AUTH_TOKEN CLAUDE_CONFIG_DIR=" + TerminalFactory.shellQuote($0) + " " } ?? ""
            p.arguments = ["-ilc", prefix + "claude " + args]
            p.environment = commandEnvironment(dir: dir)
            let out = Pipe()
            p.standardOutput = out
            p.standardError = FileHandle.nullDevice
            p.standardInput = FileHandle.nullDevice
            do { try p.run() } catch { return done(-1, "") }
            let killer = DispatchWorkItem { if p.isRunning { p.terminate() } }
            DispatchQueue.global().asyncAfter(deadline: .now() + timeout, execute: killer)
            let data = out.fileHandleForReading.readDataToEndOfFile()
            p.waitUntilExit()
            killer.cancel()
            done(p.terminationStatus, String(decoding: data, as: UTF8.self))
        }
    }

    /// After a sign-in: `claude auth status --json` gives the email, the plan and the organization for the row and the column.
    static func refreshStatus(_ id: String, done: (@Sendable () -> Void)? = nil) {
        guard let a = account(id) else { return }
        runClaude("auth status --json", dir: a.dir) { _, text in
            // The shell may print its own lines first: the JSON starts at the first brace.
            guard let start = text.firstIndex(of: "{"), let data = String(text[start...]).data(using: .utf8),
                  let j = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
            guard j["loggedIn"] as? Bool != false else { return }
            let first = account(id)?.email.isEmpty == true
            update(id) { a in
                if let e = j["email"] as? String { a.email = e }
                if let o = j["orgId"] as? String { a.orgId = o }
                if let o = j["orgName"] as? String { a.orgName = o }
                if let p = j["subscriptionType"] as? String { a.plan = p }
            }
            if first, let a = account(id), !a.email.isEmpty {
                copyUserServers(to: a)
                syncMcp()
            }
            done?()
        }
    }

    // MARK: Claude Code's user-level MCP servers (each account's own .claude.json)

    /// Where Claude Code keeps an account's user-level MCP servers: `<CLAUDE_CONFIG_DIR>/.claude.json`; the default account's is
    /// `~/.claude.json` (or inside CLAUDE_CONFIG_DIR when the app itself was started with it set).
    static func configFile(of a: ClaudeAccount) -> String {
        if let dir = a.dir { return dir + "/.claude.json" }
        return ProcessInfo.processInfo.environment["CLAUDE_CONFIG_DIR"] != nil ? CLAUDE_DIR + "/.claude.json" : HOME + "/.claude.json"
    }

    private static func servers(inFile file: String) -> [String: Any] {
        guard let data = FileManager.default.contents(atPath: file),
              let j = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return [:] }
        return j["mcpServers"] as? [String: Any] ?? [:]
    }

    /// Changes `mcpServers` in an account's config, every other key as it is (a link is written through). A file that is not
    /// JSON is left alone. Contents are never logged.
    /// Claude Code (running under that account) writes the same file often. The change is made on a fresh read, the file is
    /// read once more right before it is replaced and, if Claude changed it meanwhile, the change is made again on that; the
    /// new file is written beside it (0600 from the start) and renamed over it, so nothing ever sees half a file.
    private static func editServers(_ file: String, _ change: (inout [String: Any]) -> Void) {
        let real = URL(fileURLWithPath: file).resolvingSymlinksInPath().path
        // A link to the default account's own config: that one is only ever read.
        if let def = all.first(where: \.isDefault),
           real == URL(fileURLWithPath: configFile(of: def)).resolvingSymlinksInPath().path { return }
        let fm = FileManager.default
        for _ in 0..<3 {
            let data = fm.contents(atPath: real)
            var root: [String: Any] = [:]
            if let data {
                guard let j = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
                root = j
            }
            var s = root["mcpServers"] as? [String: Any] ?? [:]
            let before = s as NSDictionary
            change(&s)
            guard !(s as NSDictionary).isEqual(before) else { return }
            root["mcpServers"] = s
            guard let out = try? JSONSerialization.data(withJSONObject: root, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]) else { return }
            // Changed while this was made: once more, on what is there now.
            guard fm.contents(atPath: real) == data else { continue }
            let tmp = (real as NSString).deletingLastPathComponent + "/.claude.json.orbiterm-\(getpid())-\(UUID().uuidString.prefix(8))"
            let fd = open(tmp, O_WRONLY | O_CREAT | O_EXCL, 0o600)
            guard fd >= 0 else { return }
            let h = FileHandle(fileDescriptor: fd, closeOnDealloc: true)
            let wrote = (try? h.write(contentsOf: out)) != nil
            try? h.close()
            if !wrote || Darwin.rename(tmp, real) != 0 { unlink(tmp) }
            return
        }
    }

    /// Orbiterm's two MCP servers (the Claude access and the notes) follow the default account's config into every other
    /// account's: registered there, they are registered everywhere; taken out there, taken out everywhere (the default's own
    /// entries are only read). At launch, when an account is added, and when the app (un)registers them.
    static func syncMcp() {
        let list = all
        guard list.count > 1, let def = list.first(where: \.isDefault) else { return }
        // The names are the main actor's (one per build); asked before the lock is taken.
        let names: [String] = Thread.isMainThread
            ? MainActor.assumeIsolated { [McpConnect.serverName, NotesAI.serverName] }
            : DispatchQueue.main.sync { MainActor.assumeIsolated { [McpConnect.serverName, NotesAI.serverName] } }
        io.lock(); defer { io.unlock() }
        let mine = servers(inFile: configFile(of: def))
        for a in list where !a.isDefault {
            guard FileManager.default.fileExists(atPath: a.dir ?? "") else { continue }
            editServers(configFile(of: a)) { s in
                for n in names {
                    if let v = mine[n] { s[n] = v } else if (s[n] as? [String: Any])?["command"] != nil { s[n] = nil }
                }
            }
        }
    }

    /// After a new account's first sign-in: the user's own servers of the default account are added to it (those it doesn't
    /// have yet), as `claude mcp add --scope user` would. Their settings are copied as they are and never shown.
    static func copyUserServers(to a: ClaudeAccount) {
        guard !a.isDefault, let def = all.first(where: \.isDefault) else { return }
        io.lock(); defer { io.unlock() }
        let mine = servers(inFile: configFile(of: def))
        guard !mine.isEmpty else { return }
        editServers(configFile(of: a)) { s in
            for (k, v) in mine where s[k] == nil { s[k] = v }
        }
    }

    // MARK: for the pages

    /// The accounts with what they have left, for Settings and the popover: `{accounts: [...], multiple}`.
    static func webJSON() -> [String: Any] {
        let list = all
        return ["multiple": list.count > 1, "accounts": list.map { a -> [String: Any] in
            var d = a.json
            d["limits"] = limits(of: a) ?? NSNull()
            // Signed in once `claude auth status` has told an email (the default one is Claude Code's own, as it was).
            d["signedIn"] = a.isDefault || !a.email.isEmpty
            return d
        }]
    }
}
