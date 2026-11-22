import AppKit
import Darwin

/// Clean Up (web/cleanup.js, araştırma/cleanup/SPEC.md): what slows the Mac down, listed with what it would give back, and ended on
/// one click after a summary that names every item. Chats (an AI the user left alone), programs (what a chat or terminal started:
/// test runs, dev servers, headless browsers, a closed terminal's leftovers, a runaway) and worktrees (finished ones, to the Trash).
///
/// Nothing here starts by itself. The page lists and ticks; the user's click on the summary's Clean Up is the only thing that makes
/// `run` do anything. Only the user's own processes, and only the process trees of this build's sessions (plus the leftovers
/// and runaways Runaways finds), are ever listed or signalled, each by pid and start time, never by process group.
@MainActor
final class Cleanup {
    static let shared = Cleanup()

    var runaways: Runaways?
    /// The page's Clean Up view is open: lists are pushed every round, other apps measured every round.
    private(set) var viewOpen = false
    /// What Clean Up would tick by itself (chats and programs, memory only): the strip's `R`.
    private(set) var reclaimable: UInt64 = 0

    static let GiB: UInt64 = 1 << 30
    static let MiB: UInt64 = 1 << 20

    // MARK: settings (Settings > General > memory)

    static var suggest: Bool { UserDefaults.standard.object(forKey: "cleanupSuggest") as? Bool ?? true }
    static var swapGB: Int {
        let v = UserDefaults.standard.integer(forKey: "cleanupSwapGB")
        return [2, 4, 8].contains(v) ? v : 4
    }
    static var idleHours: Double {
        let v = UserDefaults.standard.double(forKey: "cleanupIdleHours")
        return [1.0, 12, 24, 72].contains(v) ? v : 12
    }

    func pushPrefs() {
        let m: [String: Any] = ["suggest": Self.suggest, "swapGB": Self.swapGB, "idleHours": Self.idleHours]
        guard let data = try? JSONSerialization.data(withJSONObject: m), let json = String(data: data, encoding: .utf8) else { return }
        MainWindowController.shared?.radar.push("cleanupPrefs", json)
    }

    func setPrefs(_ msg: [String: Any]) {
        let d = UserDefaults.standard
        if let on = msg["suggest"] as? Bool { d.set(on, forKey: "cleanupSuggest") }
        if let g = (msg["swapGB"] as? NSNumber)?.intValue, [2, 4, 8].contains(g) { d.set(g, forKey: "cleanupSwapGB") }
        if let h = (msg["idleHours"] as? NSNumber)?.doubleValue, [1.0, 12, 24, 72].contains(h) { d.set(h, forKey: "cleanupIdleHours") }
        pushPrefs()
        MemoryWatch.shared.prefsChanged()
    }

    // MARK: what a round finds

    struct Root {
        let name: String
        let pid: Int32
        let started: UInt64
        /// Its processes (the user's own), the root first.
        var members: [Int32] = []
        var bytes: UInt64 = 0
        /// An AI running outside this build's sessions (iTerm2…): measured for its card, never listed.
        var external = false
    }

    struct Scan {
        var roots: [Root] = []
        /// Process -> the index of the session root it runs in (this build's sessions only).
        var owner: [Int32: Int] = [:]
        var fp: [Int32: UInt64] = [:]
        var snap = Proc.Snapshot()
    }

    struct Job {
        let root: Int
        let base: Int32
        let pid: Int32
        let started: UInt64
        let sub: [Int32]
        let bytes: UInt64
        let ports: [UInt16]
    }

    struct ChatRow {
        let sid: String
        let pid: Int32
        let started: UInt64
        let root: Int
        let status: String
        let bytes: UInt64
        let pre: Bool
        let ai: String
        let aiName: String
        let title: String
        let cwd: String
        let json: [String: Any]
    }

    struct ProgRow {
        let id: String
        let pid: Int32
        let started: UInt64
        let bytes: UInt64
        let pre: Bool
        let chat: String?
        let json: [String: Any]
    }

    private(set) var scan = Scan()
    /// Programs listed since the view opened: one that dipped under the line meanwhile is still the one the user ticked.
    private var seenProgs: [String: ProgRow] = [:]
    private var chats: [ChatRow] = []
    private var progs: [ProgRow] = []
    private var othersTop: [(String, UInt64)] = []
    private var othersTotal: UInt64 = 0
    private var orb: UInt64 = 0
    private var lastJSON = ""

    private struct Seen {
        var cpu: UInt64
        var at: Double
        var pct: Double
        var active: Double
        var first: Double
    }
    private var cpuSeen: [String: Seen] = [:]
    private var portCache: [Int32: (started: UInt64, ports: [UInt16], at: Double)] = [:]
    private var argCache: [Int32: (started: UInt64, args: [String], name: String, path: String)] = [:]

    nonisolated private static let shells: Set<String> = ["zsh", "bash", "fish", "sh", "ksh", "tcsh", "csh"]

    /// One round (from MemoryWatch): the sessions' trees, what the cards show, the chats and programs Clean Up would list, and
    /// how much of it would be ticked by itself.
    func round(_ snap: Proc.Snapshot, others wantOthers: Bool) {
        var s = Scan()
        s.snap = snap
        let aiSet = Set(MemoryWatch.aiPids())
        func memo(_ pid: Int32) -> UInt64 {
            if let b = s.fp[pid] { return b }
            let b = Proc.footprint(pid) ?? 0
            s.fp[pid] = b
            return b
        }
        func subtree(_ pid: Int32) -> [Int32] {
            var out = [pid], i = 0
            while i < out.count, out.count < 400 {
                out += snap.children[out[i]] ?? []
                i += 1
            }
            return out
        }
        // This build's sessions: the screen daemon is the root; login(1) between it and the shell runs as root, so the walk goes
        // through the live process table and keeps only the user's processes.
        for (name, pid, started) in Detached.sessionRoots(pids: snap.pids) {
            var r = Root(name: name, pid: pid, started: started)
            r.members = [pid]
            var stack: [(Int32, Int)] = [(pid, 0)]
            while let (p, depth) = stack.popLast() {
                for c in Proc.children(of: p) {
                    if snap.infos[c] != nil { r.members.append(c) }
                    if depth < 16 { stack.append((c, depth + 1)) }
                }
            }
            r.bytes = r.members.reduce(0) { $0 + memo($1) }
            let idx = s.roots.count
            for m in r.members { s.owner[m] = idx }
            s.roots.append(r)
        }
        let owned = s.roots.count
        // An AI that runs outside (iTerm2): its own tree, for its card.
        for pid in aiSet where s.owner[pid] == nil && snap.infos[pid] != nil {
            var r = Root(name: "", pid: pid, started: snap.infos[pid]?.started ?? 0)
            r.members = subtree(pid)
            r.bytes = r.members.reduce(0) { $0 + memo($1) }
            r.external = true
            s.roots.append(r)
        }
        // Leftovers and runaways: not in any session, listed as programs.
        // Only what is Orbiterm's: a leftover of one of its own terminals (they carry its TERM_PROGRAM), a runaway that was part
        // of a terminal's session. A service started by launchd (its own session leader), or a job from iTerm2, is another app's.
        let left = (runaways?.left ?? []).filter { Proc.environmentVariable($0.pid, "TERM_PROGRAM") == "AtalaysTerminal"
            && (Proc.environmentVariable($0.pid, "STY") ?? "").contains("." + Detached.prefix) }
        let found = (runaways?.found ?? []).filter { let sid = getsid($0.pid); return sid > 1 && sid != $0.pid }
        var leftSet = Set<Int32>()
        var loose: [(pid: Int32, sub: [Int32], bytes: UInt64)] = []
        for pid in left.map(\.pid) + found.map(\.pid) where snap.infos[pid] != nil && s.owner[pid] == nil {
            let sub = subtree(pid)
            leftSet.formUnion(sub)
            loose.append((pid, sub, sub.reduce(0) { $0 + memo($1) }))
        }
        var oth = othersTotal
        if wantOthers {
            var groups: [String: UInt64] = [:]
            oth = 0
            for pid in snap.infos.keys where s.owner[pid] == nil && !leftSet.contains(pid) {
                guard let b = Proc.footprint(pid) else { continue }
                oth += b
                groups[Self.appName(pid), default: 0] += b
            }
            othersTop = groups.sorted { $0.value > $1.value }.prefix(3).map { ($0.key, $0.value) }
            othersTotal = oth
        }
        scan = s
        orb = s.roots.prefix(owned).reduce(0) { $0 + $1.bytes } + loose.reduce(0) { $0 + $1.bytes }

        // The programs: what an AI or a shell started that is heavy or listens on a port.
        var jobs: [Job] = []
        for (idx, r) in s.roots.enumerated() {
            // An AI is any process that is one (the engine names only a launcher, the real binary is its child), never a program's root.
            let ai = r.members.filter { aiSet.contains($0) || Self.isAIProcess($0) }
            var bases = ai
            // The session's shell and any interactive shell typed inside it (`bash`, then `npm run dev`): programs are their children.
            if !r.external { bases += r.members.filter { Self.isInteractiveShell($0, snap) && !ai.contains($0) } }
            var skip = Set(bases)
            for a in ai {
                var cur = snap.infos[a]?.ppid ?? 0
                for _ in 0..<12 where cur > 1 {
                    skip.insert(cur)
                    cur = snap.infos[cur]?.ppid ?? 0
                }
            }
            var seen = Set<Int32>()
            for b in bases {
                for c in snap.children[b] ?? [] where !skip.contains(c) && seen.insert(c).inserted {
                    guard let ci = snap.infos[c] else { continue }
                    let sub = subtree(c)
                    let bytes = sub.reduce(0) { $0 + memo($1) }
                    let ports = portsOf(sub, snap)
                    if bytes >= 300 * Self.MiB || !ports.isEmpty {
                        jobs.append(Job(root: idx, base: b, pid: c, started: ci.started, sub: sub, bytes: bytes, ports: ports))
                    }
                }
            }
        }

        // What each card shows (the whole session's tree, its heaviest parts) and what the engine reads.
        var trees: [Int32: MemoryWatch.Tree] = [:]
        var named: [Int: [(String, UInt64)]] = [:]
        for j in jobs where j.bytes >= 300 * Self.MiB { named[j.root, default: []].append((describe(j.sub, snap).name, j.bytes)) }
        for (idx, r) in s.roots.enumerated() {
            for a in r.members where aiSet.contains(a) {
                var parts = named[idx] ?? []
                parts.append((Self.aiName(a), memo(a)))
                parts.sort { $0.1 > $1.1 }
                trees[a] = MemoryWatch.Tree(bytes: r.external ? r.bytes : (r.bytes), top: Array(parts.prefix(3)))
            }
        }
        MemoryWatch.publish(trees)

        // The chats.
        let now = nowMs()
        let idleMs = Self.idleHours * 3_600_000
        var rows: [ChatRow] = []
        var perRoot: [Int: Int] = [:]
        let found0 = manager?.cleanupChats() ?? []
        for c in found0 { if let pid = c.brief.pid, let idx = s.owner[pid] { perRoot[idx, default: 0] += 1 } }
        for c in found0 {
            guard let pid = c.brief.pid, let idx = s.owner[pid], let info = snap.infos[pid] else { continue }
            let b = c.brief
            let status = b.status == "busy" || b.status == "waiting" ? b.status : "idle"
            let bytes = perRoot[idx] == 1 ? s.roots[idx].bytes : subtree(pid).reduce(0) { $0 + memo($1) }
            var idle = 0.0
            if status == "idle" { idle = max(0, now - max(b.statusSince, c.lastInput)) }
            let pre = status == "idle" && idle >= idleMs && !c.inFront && c.blocker == nil
            var kids = named[idx] ?? []
            kids.append((c.aiName, memo(pid)))
            kids.sort { $0.1 > $1.1 }
            let wt = Worktrees.info(of: b.cwd)
            let folder = (wt?.main ?? b.cwd) as NSString
            var j: [String: Any] = [
                "id": b.id, "ai": c.aiName, "aiKey": c.ai, "title": c.title, "folder": folder.lastPathComponent, "status": status,
                "idleMs": idle, "mem": bytes, "kids": kids.prefix(3).map { [$0.0, $0.1] as [Any] }, "pre": pre,
            ]
            if let wt, wt.linked { j["wt"] = wt.branch }
            if let bl = c.blocker { j["blocker"] = bl }
            if Streamer.on {
                j["title"] = Streamer.fake("title", c.title)
                j["folder"] = Streamer.project(wt?.main ?? b.cwd)
                if let w = j["wt"] as? String { j["wt"] = Streamer.fake("branch", w) }
            }
            rows.append(ChatRow(sid: b.id, pid: pid, started: info.started, root: idx, status: status, bytes: bytes, pre: pre,
                                ai: c.ai, aiName: c.aiName, title: c.title, cwd: b.cwd, json: j))
        }
        rows.sort { a, b in
            let fa = a.status == "idle", fb = b.status == "idle"
            if fa != fb { return fa }
            return a.bytes > b.bytes
        }
        chats = rows
        let chatOfPid = Dictionary(rows.map { ($0.pid, $0) }, uniquingKeysWith: { a, _ in a })

        // The programs.
        var out: [ProgRow] = []
        for j in jobs {
            let root = s.roots[j.root]
            guard !root.external else { continue }
            let d = describe(j.sub, snap)
            var owner: ChatRow? = chatOfPid[j.base]
            if owner == nil { owner = rows.first { $0.root == j.root } }
            let seen = cpuState(key: "\(j.pid):\(j.started)", sub: j.sub, snap)
            var note: String?
            if let o = owner {
                if o.status == "busy" { note = "\(o.aiName) is using it" }
                else if let ai = snap.infos[o.pid], let ci = snap.infos[j.pid],
                        abs(Double(ci.started) - Double(ai.started)) < 10_000_000, j.bytes >= 300 * Self.MiB {
                    note = "\(o.aiName) may need it"
                }
            }
            let quiet = max(0, now - seen.quietSince)
            let watching = d.kind == "test" && d.watching
            let pre = watching && quiet >= 3_600_000 && (owner?.status != "busy") && note == nil
            let cwd = Proc.cwd(j.pid) ?? Proc.cwd(root.pid) ?? HOME
            var json: [String: Any] = [
                "id": "\(j.pid):\(j.started)", "kind": d.kind, "name": d.name, "mem": j.bytes, "pre": pre,
                "cpu": seen.pct.rounded(), "busy": seen.recent >= 10, "quietMs": quiet,
                "folder": Streamer.on ? Streamer.project(cwd) : ((Worktrees.info(of: cwd)?.main ?? cwd) as NSString).lastPathComponent,
            ]
            if let o = owner { json["chat"] = o.sid } else { json["terminal"] = true }
            if !j.ports.isEmpty { json["ports"] = j.ports.map { Int($0) } }
            if let note { json["note"] = note }
            if d.compose { json["extra"] = "Its containers stop too" }
            out.append(ProgRow(id: "\(j.pid):\(j.started)", pid: j.pid, started: j.started, bytes: j.bytes, pre: pre, chat: owner?.sid, json: json))
        }
        for l in loose {
            guard let info = snap.infos[l.pid] else { continue }
            let isLeft = left.contains { $0.pid == l.pid }
            let item = found.first { $0.pid == l.pid }
            let seen = cpuState(key: "\(l.pid):\(info.started)", sub: l.sub, snap)
            let cwd = isLeft ? (left.first { $0.pid == l.pid }?.cwd ?? HOME) : (Proc.cwd(l.pid) ?? "")
            var json: [String: Any] = ["id": "\(l.pid):\(info.started)", "mem": l.bytes, "pre": isLeft, "cpu": seen.pct.rounded(),
                                       "quietMs": 0, "terminal": false, "pid": Int(l.pid)]
            // The orbit blows up the runaway's box or the closed terminal's car as it always did (danger.js).
            if isLeft, let lf = left.first(where: { $0.pid == l.pid }) { json["left"] = "left:\(lf.pid):\(Int64(lf.started))" }
            if let item, item.cpu > 0 {
                json["kind"] = "flame"
                json["name"] = Proc.name(l.pid) ?? item.name
                json["burn"] = true
                json["where"] = Self.burning(item.cpuTime, item.cpu)
                json["folder"] = "no terminal"
                if isLeft { json["folder"] = Streamer.on ? Streamer.project(cwd) : (cwd as NSString).lastPathComponent }
            } else {
                let d = describe(l.sub, snap)
                json["kind"] = d.kind
                json["name"] = d.name
                json["where"] = "Left running after its terminal closed"
                json["folder"] = Streamer.on ? Streamer.project(cwd) : (cwd as NSString).lastPathComponent
                if d.compose { json["extra"] = "Its containers stop too" }
            }
            if isLeft, item != nil { json["where"] = "Left running after its terminal closed" }
            let ports = portsOf(l.sub, snap)
            if !ports.isEmpty { json["ports"] = ports.map { Int($0) } }
            out.append(ProgRow(id: json["id"] as? String ?? "", pid: l.pid, started: info.started, bytes: l.bytes, pre: isLeft, chat: nil, json: json))
        }
        out.sort { a, b in
            let la = a.json["where"] != nil, lb = b.json["where"] != nil
            if la != lb { return la }
            return a.bytes > b.bytes
        }
        progs = out
        if viewOpen { for p in out { seenProgs[p.id] = p } }
        let preChats = Set(rows.filter(\.pre).map(\.sid))
        reclaimable = rows.filter(\.pre).reduce(0) { $0 + $1.bytes } + out.filter { $0.pre && !($0.chat.map(preChats.contains) ?? false) }.reduce(0) { $0 + $1.bytes }
        // What a round no longer sees isn't remembered.
        let live = Set(out.map(\.id)).union(jobs.map { "\($0.pid):\($0.started)" })
        cpuSeen = cpuSeen.filter { live.contains($0.key) }
        if portCache.count > 300 { portCache = portCache.filter { snap.infos[$0.key]?.started == $0.value.started } }
        if argCache.count > 600 { argCache = argCache.filter { snap.infos[$0.key]?.started == $0.value.started } }
    }

    private var manager: MainWindowController? { MainWindowController.shared }

    private static func burning(_ cpuTime: Double, _ cpu: Double) -> String {
        if cpuTime >= 3600 { return "Using a full CPU core for \(duration(cpuTime))" }
        return "Using \(Int(cpu.rounded()))% of a CPU core"
    }

    private static func duration(_ seconds: Double) -> String {
        let h = seconds / 3600
        if h >= 48 { return "\(Int((h / 24).rounded())) days" }
        if h >= 24 { return "a day" }
        if h >= 2 { return "\(Int(h.rounded())) hours" }
        if h >= 1 { return "an hour" }
        return "\(max(1, Int((seconds / 60).rounded()))) minutes"
    }

    /// The name an app has in Activity Monitor: the outermost `.app` the process runs from (Chrome's helpers are Google Chrome),
    /// else its own name.
    private static func appName(_ pid: Int32) -> String {
        guard let path = Proc.path(pid) else { return Proc.name(pid) ?? "Other" }
        if let r = path.range(of: ".app/") {
            let app = String(path[..<r.lowerBound])
            return (app as NSString).lastPathComponent
        }
        return Proc.name(pid) ?? (path as NSString).lastPathComponent
    }

    /// Claude or another AI tool's own process, by what it runs as.
    nonisolated static func isAIProcess(_ pid: Int32) -> Bool { Proc.isClaude(pid) || Proc.otherAI(pid) != nil }

    /// A shell that waits for the user (no `-c`, no script to run): one typed inside the session. A `zsh -c …` is a command's wrapper
    /// and `bash ./dev.sh` runs a script: both are programs' roots.
    nonisolated static func isInteractiveShell(_ pid: Int32, _ snap: Proc.Snapshot? = nil) -> Bool {
        guard shells.contains(Proc.name(pid) ?? "") else { return false }
        let args = Proc.arguments(pid) ?? []
        let rest = args.dropFirst()
        return !rest.contains { $0 == "-c" || ($0.hasPrefix("-") && !$0.hasPrefix("--") && $0.contains("c")) } && rest.allSatisfy { $0.hasPrefix("-") }
    }

    private static func aiName(_ pid: Int32) -> String {
        if Proc.isClaude(pid) { return "Claude" }
        return Proc.otherAI(pid) ?? "AI"
    }

    private func portsOf(_ sub: [Int32], _ snap: Proc.Snapshot) -> [UInt16] {
        var all = Set<UInt16>()
        for pid in sub {
            guard let started = snap.infos[pid]?.started else { continue }
            if let hit = portCache[pid], hit.started == started, snap.uptime - hit.at < 15 { all.formUnion(hit.ports); continue }
            let p = Proc.listeningPorts(pid)
            portCache[pid] = (started, p, snap.uptime)
            all.formUnion(p)
        }
        return all.sorted()
    }

    /// CPU of a subtree, the way Runaways measures it (CPU time's change over the wall clock): busy now, and since when it was last busy.
    private func cpuState(key: String, sub: [Int32], _ snap: Proc.Snapshot) -> (pct: Double, recent: Double, quietSince: Double) {
        let ns = sub.reduce(UInt64(0)) { $0 &+ (snap.infos[$1]?.cpuTime ?? 0) }
        var s = cpuSeen[key] ?? Seen(cpu: ns, at: snap.uptime, pct: 0, active: 0, first: snap.wall)
        var pct = 0.0
        if let prev = cpuSeen[key], snap.uptime > prev.at, ns >= prev.cpu {
            pct = Double(ns - prev.cpu) / ((snap.uptime - prev.at) * 1e9) * 100
        }
        let recent = max(pct, s.pct)
        if pct >= 5 { s.active = snap.wall }
        s.cpu = ns
        s.at = snap.uptime
        s.pct = pct
        cpuSeen[key] = s
        return (pct, recent, s.active > 0 ? s.active : s.first)
    }

    // MARK: naming (spec 3.5)

    struct Described {
        var name = "", kind = "gear"
        var watching = false
        var compose = false
    }

    private func argsOf(_ pid: Int32, _ snap: Proc.Snapshot) -> (args: [String], name: String, path: String) {
        let started = snap.infos[pid]?.started ?? 0
        if let hit = argCache[pid], hit.started == started { return (hit.args, hit.name, hit.path) }
        let args = Proc.arguments(pid) ?? [], name = Proc.name(pid) ?? "", path = Proc.path(pid) ?? ""
        argCache[pid] = (started, args, name, path)
        return (args, name, path)
    }

    /// What a process tree is, by the first rule that holds (matched on argv and paths, over every process of the tree).
    func describe(_ sub: [Int32], _ snap: Proc.Snapshot) -> Described {
        let procs = sub.prefix(60).map { argsOf($0, snap) }
        let lines = procs.map { ($0.args.joined(separator: " ") + " " + $0.path).lowercased() }
        let tokens = procs.map { $0.args.map { $0.lowercased() } }
        func any(_ f: (String) -> Bool) -> Bool { lines.contains(where: f) }
        func count(_ s: String) -> Int { lines.filter { $0.contains(s) }.count }
        func hasToken(_ i: Int, _ t: Set<String>) -> Bool { tokens[i].contains { t.contains($0) } }
        var d = Described()
        let titles = procs.map { $0.name.lowercased() }

        if titles.contains(where: { $0.hasPrefix("next-server") }) || any({ $0.contains("next-server (v") })
            || lines.indices.contains(where: { lines[$0].contains("next/dist/bin/next") && hasToken($0, ["dev"]) })
            || any({ $0.contains("next-render-worker") }) {
            d.name = "Next.js dev server"; d.kind = "server"; return d
        }
        if let i = lines.firstIndex(where: { $0.contains("vitest") }) {
            let workers = count("vitest/dist/workers/forks.js")
            d.name = "Vitest"
            if workers > 1 { d.name += ", \(workers) workers" }
            let running = lines.indices.contains { lines[$0].contains("vitest") && hasToken($0, ["run", "--run"]) }
            _ = i
            if !running { d.name += ", watching"; d.watching = true }
            d.kind = "test"
            return d
        }
        if any({ $0.contains("jest-worker/build/workers/processchild.js") || $0.range(of: #"(^|[/ ])jest([ .]|$)"#, options: .regularExpression) != nil }) {
            let workers = count("jest-worker/build/workers/processchild.js")
            d.name = "Jest"
            if workers > 1 { d.name += ", \(workers) workers" }
            if lines.indices.contains(where: { hasToken($0, ["--watch", "--watchall"]) }) { d.name += ", watching"; d.watching = true }
            d.kind = "test"
            return d
        }
        if procs.indices.contains(where: { i in tokens[i].contains { ($0 as NSString).lastPathComponent == "vite" } || lines[i].contains("/vite/bin/vite.js") }) {
            d.name = "Vite dev server"; d.kind = "server"; return d
        }
        if any({ $0.contains("webpack serve") || $0.contains("webpack-dev-server") }) || lines.indices.contains(where: { lines[$0].contains("webpack") && hasToken($0, ["serve"]) }) {
            d.name = "webpack dev server"; d.kind = "server"; return d
        }
        if any({ $0.contains("storybook") }) { d.name = "Storybook"; d.kind = "server"; return d }
        if any({ $0.contains("chrome-headless-shell") || $0.contains("google chrome for testing") || $0.contains("ms-playwright/") }) {
            d.name = "Headless Chrome (Playwright)"; d.kind = "browser"; return d
        }
        if any({ $0.contains(".cache/puppeteer/") }) { d.name = "Headless Chrome (Puppeteer)"; d.kind = "browser"; return d }
        if lines.indices.contains(where: { lines[$0].contains("tsc") && hasToken($0, ["--watch", "-w"]) && tokens[$0].contains { ($0 as NSString).lastPathComponent == "tsc" } }) {
            d.name = "tsc --watch"; return d
        }
        if lines.indices.contains(where: { lines[$0].contains("docker") && (lines[$0].contains("compose up") || lines[$0].contains("docker-compose up")) }) {
            d.name = "docker compose"; d.compose = true; return d
        }
        let servers: [(String, String)] = [("uvicorn", "Uvicorn"), ("flask run", "Flask"), ("manage.py runserver", "Django"), ("rails s", "Rails"), ("php artisan serve", "Laravel")]
        for (needle, label) in servers where any({ $0.contains(needle) }) { d.name = "\(label) server"; d.kind = "server"; return d }
        // Otherwise the first process that isn't only a wrapper: a node script by its file name, else the program.
        let wrappers: Set<String> = ["zsh", "bash", "fish", "sh", "env", "npm", "npx", "pnpm", "yarn", "bun", "login", "caffeinate"]
        for (i, p) in procs.enumerated() where !wrappers.contains(p.name) && !p.name.isEmpty {
            if p.name == "node" {
                // The script's file name: never inline code (-e, -p) or a preloaded module's name, which can hold a token.
                var skip = false, script: String?
                let valued: Set<String> = ["--eval", "--print", "--require", "--import", "--loader", "--experimental-loader", "--env-file", "--conditions", "-C", "--title"]
                for a in procs[i].args.dropFirst() {
                    if skip { skip = false; continue }
                    // -e, -p, -pe, -r (a cluster ending in one of them) and the long flags that take a value.
                    if valued.contains(a) || (a.hasPrefix("-") && !a.hasPrefix("--") && a.count > 1 && "epr".contains(a.last!)) { skip = true; continue }
                    if a.hasPrefix("-") { continue }
                    script = a
                    break
                }
                d.name = script.map { ($0 as NSString).lastPathComponent } ?? "node"
            } else {
                d.name = p.name
            }
            return d
        }
        d.name = procs.first?.name.isEmpty == false ? procs[0].name : "A program"
        return d
    }

    // MARK: the page

    func viewChanged(open: Bool) {
        viewOpen = open
        seenProgs = [:]
        wtTimer?.invalidate()
        wtTimer = nil
        guard open else { return }
        MemoryWatch.shared.refresh()
        refreshWorktrees()
        pushList(force: true)
        let t = Timer(timeInterval: 60, repeats: true) { [weak self] _ in MainActor.assumeIsolated { self?.refreshWorktrees() } }
        RunLoop.main.add(t, forMode: .default)
        wtTimer = t
    }

    private var wtTimer: Timer?

    func pushList(force: Bool) {
        // Nothing goes to the page while its view is closed.
        guard viewOpen else { return }
        if force { refreshWorktrees() }
        guard let json = listJSON() else { return }
        guard force || json != lastJSON else { return }
        lastJSON = json
        manager?.radar.push("cleanup", json)
    }

    func listJSON() -> String? {
        let mem = MemoryWatch.shared.state
        let f = orb + othersTotal == 0 ? 1.0 : min(1.0, Double(mem.app + mem.compressed) / Double(orb + othersTotal))
        let sys = Double(mem.used) - Double(orb + othersTotal) * f
        var memJ: [String: Any] = [
            "ram": mem.ram, "swap": mem.swap, "level": mem.level, "pressure": mem.pressure, "appc": mem.app + mem.compressed,
            "used": mem.used, "free": mem.free, "orb": orb, "oth": othersTotal, "sys": max(0, sys),
            "others": othersTop.map { [$0.0, $0.1] as [Any] },
        ]
        memJ["wired"] = mem.wired
        let (wts, measuring) = worktreeRows()
        var all: [String: Any] = ["mem": memJ, "chats": chats.map(\.json), "programs": progs.map(\.json), "worktrees": wts,
                                  "measuring": measuring, "reclaim": reclaimable]
        all["running"] = running
        guard let data = try? JSONSerialization.data(withJSONObject: all, options: [.sortedKeys]) else { return nil }
        return String(decoding: data, as: UTF8.self)
    }

    // MARK: worktrees (spec 3.6)

    struct WT {
        let top: String
        let main: String
        let branch: String
        let locked: Bool
        let prunable: Bool
    }
    private var wtList: [WT] = []
    private var wtSize: [String: (key: Double, bytes: UInt64)] = [:]
    private var wtLast: [String: Double] = [:]
    private var wtProof: [String: (proof: GitShipProof, at: Double)] = [:]
    private var wtBusy = false
    private var wtAsked = false
    typealias GitShipProof = Git.CleanupProof

    private var cwdCache: (at: Double, list: [(Int32, String)]) = (0, [])

    func refreshWorktrees() {
        guard !wtBusy, let m = manager else { return }
        wtBusy = true
        wtAsked = true
        let folders = m.cleanupFolders()
        let prs: [String: GitPR] = WorktreeShip.shared.status.compactMapValues { $0.pr }
        let sizes = wtSize, proofs = wtProof
        let hop: (@escaping @MainActor () -> Void) -> Void = { work in DispatchQueue.main.async { MainActor.assumeIsolated { work() } } }
        DispatchQueue.global(qos: .utility).async { [weak self] in
            var mains = Set<String>()
            for f in folders { if let i = Worktrees.info(of: f) { mains.insert(i.main) } }
            var list: [WT] = []
            for main in mains.sorted() {
                let realMain = Worktrees.real(main)
                for e in Git.worktreeList(main) where Worktrees.real(e.path) != realMain {
                    let branch = e.branch ?? Worktrees.info(of: e.path)?.branch ?? ""
                    list.append(WT(top: e.path, main: main, branch: branch, locked: e.locked, prunable: e.prunable || !FileManager.default.fileExists(atPath: e.path)))
                }
            }
            hop { self?.wtList = list; self?.pushList(force: false) }
            for w in list where !w.prunable {
                let key = Self.newestTopLevel(w.top)
                var size = sizes[w.top].flatMap { $0.key == key ? $0.bytes : nil }
                if size == nil { size = Self.folderSize(w.top) }
                let last = Self.lastChange(w.top)
                hop { self?.wtSize[w.top] = (key, size ?? 0); self?.wtLast[w.top] = last; self?.pushList(force: false) }
                if let hit = proofs[w.top], Date().timeIntervalSince1970 - hit.at < 600, Git.cleanupProofKey(top: w.top) == hit.proof.key { continue }
                let proof = Git.cleanupProof(top: w.top, pr: prs[w.top])
                hop { self?.wtProof[w.top] = (proof, Date().timeIntervalSince1970); self?.pushList(force: false) }
            }
            hop { self?.wtBusy = false; self?.pushList(force: false) }
        }
    }

    nonisolated private static func newestTopLevel(_ top: String) -> Double {
        let fm = FileManager.default
        var newest = 0.0
        for name in (try? fm.contentsOfDirectory(atPath: top)) ?? [] {
            if let d = (try? fm.attributesOfItem(atPath: top + "/" + name))?[.modificationDate] as? Date { newest = max(newest, d.timeIntervalSince1970) }
        }
        return newest
    }

    /// The size a folder takes on the disk (allocated, as Finder counts), without following links or leaving the disk.
    nonisolated private static func folderSize(_ top: String) -> UInt64 {
        let url = URL(fileURLWithPath: top)
        let keys: [URLResourceKey] = [.totalFileAllocatedSizeKey, .isSymbolicLinkKey, .isDirectoryKey, .volumeIdentifierKey]
        guard let en = FileManager.default.enumerator(at: url, includingPropertiesForKeys: keys, options: [], errorHandler: { _, _ in true }) else { return 0 }
        let rootVolume = (try? url.resourceValues(forKeys: [.volumeIdentifierKey]))?.volumeIdentifier
        var total: UInt64 = 0
        for case let u as URL in en {
            guard let v = try? u.resourceValues(forKeys: Set(keys)) else { continue }
            if v.isSymbolicLink == true { en.skipDescendants(); continue }
            if v.isDirectory == true {
                if let a = v.volumeIdentifier, let b = rootVolume, !a.isEqual(b) { en.skipDescendants() }
                continue
            }
            total += UInt64(v.totalFileAllocatedSize ?? 0)
        }
        return total
    }

    /// The later of the branch's last commit and the newest file changed since (ms since 1970).
    nonisolated private static func lastChange(_ top: String) -> Double {
        var newest = 0.0
        if let t = Git.read(top, ["log", "-1", "--format=%ct"]).flatMap({ Double($0.trimmingCharacters(in: .whitespacesAndNewlines)) }) { newest = t }
        if let files = Git.read(top, ["ls-files", "-z", "--modified", "--others", "--exclude-standard"]) {
            for p in files.split(separator: "\0").prefix(3000) {
                var st = stat()
                if lstat(top + "/" + p, &st) == 0 { newest = max(newest, Double(st.st_mtimespec.tv_sec)) }
            }
        }
        return newest * 1000
    }

    /// What holds a worktree: the chats of this build's sessions that run in it, or the one thing that blocks it (a terminal, a
    /// program, an AI in another app). Looked at from the processes' working folders.
    struct Owners {
        var chats: [String] = []
        var blocker: String?
    }

    private func processCwds(fresh: Bool) -> (list: [(Int32, String)], scan: Scan) {
        if fresh {
            let snap = Proc.snapshot()
            var s = Scan()
            s.snap = snap
            for (name, pid, started) in Detached.sessionRoots(pids: snap.pids) {
                var r = Root(name: name, pid: pid, started: started)
                r.members = [pid]
                var stack = [pid]
                while let p = stack.popLast() { for c in Proc.children(of: p) { if snap.infos[c] != nil { r.members.append(c) }; stack.append(c) } }
                for m in r.members { s.owner[m] = s.roots.count }
                s.roots.append(r)
            }
            return (snap.infos.keys.compactMap { pid in Proc.cwd(pid).map { (pid, $0) } }, s)
        }
        let now = ProcessInfo.processInfo.systemUptime
        if now - cwdCache.at > 15 {
            cwdCache = (now, scan.snap.infos.keys.compactMap { pid in Proc.cwd(pid).map { (pid, $0) } })
        }
        return (cwdCache.list, scan)
    }

    private func owners(of top: String, cwds: [(Int32, String)], scan: Scan, chatSids: [Int: [String]]) -> Owners {
        let t = Worktrees.real(top)
        var o = Owners()
        let briefs = manager?.cleanupLiveBriefs() ?? []
        let byPid = Dictionary(briefs.compactMap { b in b.pid.map { ($0, b) } }, uniquingKeysWith: { a, _ in a })
        for (pid, cwd) in cwds where cwd == t || cwd.hasPrefix(t + "/") {
            if pid == getpid() { continue }
            if let idx = scan.owner[pid] {
                if let sids = chatSids[idx], !sids.isEmpty { for s in sids where !o.chats.contains(s) { o.chats.append(s) } }
                else if o.blocker == nil { o.blocker = "A terminal is open in it" }
            } else if let b = byPid[pid] {
                if o.blocker == nil { o.blocker = "\(WorktreeNudge.name(b)) is open in it" }
            } else if o.blocker == nil {
                o.blocker = "\(Proc.name(pid) ?? "A program") is running in it"
            }
        }
        // A live AI whose own folder is in it holds it too, wherever its process was started from (`codex --cd <worktree>`).
        for b in briefs where !b.cwd.isEmpty {
            let c = Worktrees.real(b.cwd)
            guard c == t || c.hasPrefix(t + "/") else { continue }
            if let pid = b.pid, let idx = scan.owner[pid], let sids = chatSids[idx], !sids.isEmpty {
                for s in sids where !o.chats.contains(s) { o.chats.append(s) }
            } else if o.blocker == nil {
                o.blocker = "\(WorktreeNudge.name(b)) is open in it"
            }
        }
        return o
    }

    /// The name a worktree shows by: its branch, else its folder's name (a detached HEAD has no branch); made up in streamer mode.
    private static func branchName(_ w: WT) -> String {
        let real = w.branch.isEmpty ? (w.top as NSString).lastPathComponent : w.branch
        return Streamer.on ? Streamer.fake("branch", real) : real
    }

    private func worktreeRows() -> ([[String: Any]], Bool) {
        guard viewOpen || wtAsked else { return ([], false) }
        var sidsByRoot: [Int: [String]] = [:]
        for c in chats { sidsByRoot[c.root, default: []].append(c.sid) }
        let (cwds, sc) = processCwds(fresh: false)
        var rows: [[String: Any]] = []
        var measuring = wtList.isEmpty && wtBusy
        for w in wtList {
            let repo = Streamer.on ? Streamer.project(w.main) : (w.main as NSString).lastPathComponent
            let shownBranch = Self.branchName(w)
            var j: [String: Any] = ["id": w.top, "branch": shownBranch, "repo": repo]
            if let l = wtLast[w.top], l > 0 { j["lastMs"] = nowMs() - l }
            if let s = wtSize[w.top] { j["size"] = s.bytes } else if !w.prunable { measuring = true }
            if w.locked { j["state"] = "locked"; j["st"] = "Git has it locked"; rows.append(j); continue }
            if w.prunable {
                j["state"] = "gone"; j["st"] = "Its folder is already gone"; j["pre"] = true
                rows.append(j); continue
            }
            let o = owners(of: w.top, cwds: cwds, scan: sc, chatSids: sidsByRoot)
            if let b = o.blocker {
                j["state"] = "use"; j["detail"] = b; j["users"] = [String]()
                rows.append(j); continue
            }
            if !o.chats.isEmpty { j["users"] = o.chats }
            guard let p = wtProof[w.top]?.proof else { j["state"] = "checking"; j["st"] = "Checking\u{2026}"; rows.append(j); continue }
            if p.unknown {
                j["state"] = "unknown"; j["st"] = p.text
            } else if !o.chats.isEmpty {
                j["state"] = "use"; j["st"] = p.text; j["done"] = p.done
                if !p.done { j["warn"] = ["files": p.files, "commits": p.commits] }
            } else if p.done {
                j["state"] = "done"; j["st"] = p.text; j["pre"] = true
            } else {
                j["state"] = "work"; j["st"] = p.text; j["files"] = p.files; j["commits"] = p.commits
            }
            if !o.chats.isEmpty && p.done { j["pre"] = true }
            rows.append(j)
        }
        let order: [String: Int] = ["done": 0, "gone": 0, "use": 1, "work": 1, "checking": 2, "unknown": 2, "locked": 3]
        rows.sort { a, b in
            let oa = order[a["state"] as? String ?? ""] ?? 2, ob = order[b["state"] as? String ?? ""] ?? 2
            if oa != ob { return oa < ob }
            return (a["size"] as? UInt64 ?? 0) > (b["size"] as? UInt64 ?? 0)
        }
        return (rows, measuring)
    }

    // MARK: running (spec 9): programs, then chats, then worktrees

    private(set) var running = false
    private var halted = false
    private var quitting = false

    func halt() { halted = true }

    private func step(_ id: String, _ kind: String, _ state: String, text: String = "", freed: UInt64 = 0, trashed: UInt64 = 0) {
        let m: [String: Any] = ["id": id, "kind": kind, "state": state, "text": text, "freed": freed, "trashed": trashed]
        guard let data = try? JSONSerialization.data(withJSONObject: m), let json = String(data: data, encoding: .utf8) else { return }
        manager?.radar.push("cleanupStep", json)
    }

    /// The footprint of a process and everything under it, now.
    nonisolated private static func treeBytes(_ root: Int32) -> UInt64 {
        var total: UInt64 = 0
        var stack = [root], n = 0
        while let p = stack.popLast(), n < 600 {
            n += 1
            total += Proc.footprint(p) ?? 0
            stack += Proc.children(of: p)
        }
        return total
    }

    /// Whether the process is one of Orbiterm's to end: it runs under a screen daemon of this build, or it is a leftover or runaway
    /// Runaways found. Anything else is refused, whatever the page said.
    private func isOurs(_ pid: Int32, started: UInt64) -> Bool {
        guard let info = Proc.info(pid), info.uid == getuid(), info.started == started else { return false }
        // Never a session's own screen, shell or AI: those are chats, ended as chats.
        let daemons = Set(Detached.ownedDaemons().map(\.pid))
        if daemons.contains(pid) || MemoryWatch.aiPids().contains(pid) || Self.isAIProcess(pid) { return false }
        // A runaway or a closed terminal's leftover is ended as one, whatever it is (a script runner too).
        if (runaways?.found.contains { $0.pid == pid } ?? false) || (runaways?.left.contains { $0.pid == pid } ?? false) { return true }
        // The session's own shell (the one under the daemon, `zsh -ilc "…; exec zsh -il"`), a shell typed inside it, and anything the
        // AI runs under: those are the chat's.
        if let idx = scan.owner[pid], scan.roots[idx].members.first(where: { Self.shells.contains(Proc.name($0) ?? "") }) == pid { return false }
        if Self.isInteractiveShell(pid) { return false }
        var ais = Set(MemoryWatch.aiPids())
        if let idx = scan.owner[pid] { for m in scan.roots[idx].members where Self.isAIProcess(m) { ais.insert(m) } }
        for a in ais {
            var up = Proc.parent(a) ?? 0
            for _ in 0..<14 where up > 1 {
                if up == pid { return false }
                up = Proc.parent(up) ?? 0
            }
        }
        var cur = pid
        for _ in 0..<20 {
            if daemons.contains(cur) { return true }
            guard let parent = Proc.parent(cur), parent > 1 else { return false }
            cur = parent
        }
        return false
    }

    func run(_ items: [[String: Any]]) {
        guard !running else { return }
        func ids(_ kind: String) -> [String] { items.compactMap { ($0["kind"] as? String) == kind ? $0["id"] as? String : nil } }
        let pids = ids("program"), sids = ids("chat"), tops = ids("worktree")
        guard pids.count + sids.count + tops.count > 0 else { return }
        running = true
        halted = false
        Self.log(["run", "\(pids.count + sids.count + tops.count) items", "ticked: \(sids.count) chats, \(pids.count) programs, \(tops.count) worktrees",
                  "pressure=\(MemoryWatch.shared.state.pressure) swap=\(Self.gib(MemoryWatch.shared.state.swap))"])
        Task { @MainActor in
            var ok = 0, bad = 0, freed: UInt64 = 0, trashed: UInt64 = 0
            // A: programs, all together.
            var names: [String: String] = [:]
            for p in self.seenProgs.values { names[p.id] = p.json["name"] as? String }
            for p in self.progs { names[p.id] = p.json["name"] as? String }
            var work: [(id: String, pid: Int32, started: UInt64)] = []
            for id in pids {
                let f = id.split(separator: ":")
                guard f.count == 2, let pid = Int32(f[0]), let started = UInt64(f[1]) else { continue }
                if Proc.info(pid)?.started != started { step(id, "program", "gone"); Self.log(["stop", "program", "pid=\(pid)", "already gone"]); continue }
                guard self.progs.contains(where: { $0.id == id }) || self.seenProgs[id] != nil, self.isOurs(pid, started: started) else { step(id, "program", "skip"); Self.log(["stop", "program", "pid=\(pid)", "refused", "not one of Orbiterm's"]); continue }
                step(id, "program", "now")
                work.append((id, pid, started))
            }
            let results: [(String, Int32, UInt64, Proc.Ended, UInt64)] = await withTaskGroup(of: (String, Int32, UInt64, Proc.Ended, UInt64).self) { group in
                for w in work {
                    group.addTask {
                        // endTree waits with sleeps: on a dispatch thread, not in the cooperative pool.
                        await withCheckedContinuation { c in
                            DispatchQueue.global(qos: .userInitiated).async {
                                let bytes = Self.treeBytes(w.pid)
                                let r = Proc.endTree(root: w.pid, started: w.started, grace: 5)
                                c.resume(returning: (w.id, w.pid, w.started, r, bytes))
                            }
                        }
                    }
                }
                var out: [(String, Int32, UInt64, Proc.Ended, UInt64)] = []
                for await r in group { out.append(r) }
                return out
            }
            for (id, pid, started, r, bytes) in results {
                let name = names[id] ?? "program"
                switch r {
                case .stopped: ok += 1; freed += bytes; self.step(id, "program", "done", freed: bytes)
                    Self.log(["stop", "program", "\"\(name)\"", "pid=\(pid) started=\(Self.stamp(started))", "ok", "freed=\(Self.gib(bytes))"])
                case .gone: self.step(id, "program", "gone"); Self.log(["stop", "program", "\"\(name)\"", "pid=\(pid)", "already gone"])
                case .failed: bad += 1; self.step(id, "program", "bad", text: "\(name) didn't stop. Try again in a moment.")
                    Self.log(["stop", "program", "\"\(name)\"", "pid=\(pid) started=\(Self.stamp(started))", "fail", "still running"])
                }
            }
            // B: chats, all together (a fresh look first: still there, still idle).
            var ending: [(row: ChatRow, bytes: UInt64, root: Int32, rootStarted: UInt64)] = []
            let current = self.chats
            for sid in sids {
                guard let row = current.first(where: { $0.sid == sid }) else { self.step(sid, "chat", "gone"); continue }
                guard let b = self.manager?.cleanupBrief(sid), b.status == "idle", b.pid == row.pid else {
                    self.step(sid, "chat", "skip", text: "\(row.json["title"] as? String ?? row.title) started working, so it was left alone.")
                    Self.log(["end", "chat", row.ai, "\"\(row.title)\"", "sid=\(sid)", "skipped", "not idle any more"])
                    continue
                }
                if row.json["blocker"] != nil {
                    self.step(sid, "chat", "skip", text: "\(row.json["title"] as? String ?? row.title) was left alone: \((row.json["blocker"] as? String ?? "").lowercased()).")
                    Self.log(["end", "chat", row.ai, "\"\(row.title)\"", "sid=\(sid)", "skipped", "would end more than listed"])
                    continue
                }
                let root = self.scan.roots[row.root]
                let bytes = Self.treeBytes(root.pid)
                self.step(sid, "chat", "now")
                if self.manager?.cleanupEnd(sid) == true { ending.append((row, bytes, root.pid, root.started)) } else {
                    bad += 1
                    self.step(sid, "chat", "bad", text: "\(row.aiName) didn't stop. Try again in a moment.")
                    Self.log(["end", "chat", row.ai, "\"\(row.title)\"", "sid=\(sid)", "fail", "no window to end it"])
                }
            }
            var pending = ending
            let deadline = Date().addingTimeInterval(8)
            while !pending.isEmpty, Date() < deadline {
                try? await Task.sleep(nanoseconds: 250_000_000)
                pending.removeAll { p in
                    guard self.chatGone(p.row, root: p.root, rootStarted: p.rootStarted) else { return false }
                    ok += 1; freed += p.bytes
                    self.step(p.row.sid, "chat", "done", freed: p.bytes)
                    Self.log(["end", "chat", p.row.ai, "\"\(p.row.title)\"", "sid=\(p.row.sid)", "pid=\(p.row.pid)", "ok", "freed=\(Self.gib(p.bytes))"])
                    return true
                }
            }
            for p in pending {
                bad += 1
                self.step(p.row.sid, "chat", "bad", text: "\(p.row.aiName) didn't stop. Try again in a moment.")
                Self.log(["end", "chat", p.row.ai, "\"\(p.row.title)\"", "sid=\(p.row.sid)", "pid=\(p.row.pid)", "fail", "still running after 8s"])
            }
            // C: worktrees, one by one (git's locks), each looked at again right before.
            for top in tops {
                if self.halted || self.quitting { self.step(top, "worktree", "skip"); continue }
                guard let w = self.wtList.first(where: { $0.top == top }) else { self.step(top, "worktree", "gone"); continue }
                // Only one the page could have ticked: git doesn't hold it, and what is in it is known (or its folder is gone).
                let proof = self.wtProof[top]?.proof
                if w.locked || (!w.prunable && (proof == nil || proof!.unknown)) {
                    self.step(top, "worktree", "skip"); Self.log(["trash", "worktree", top, "refused", "locked or not checked"]); continue
                }
                let name = w.branch.isEmpty ? (top as NSString).lastPathComponent : w.branch
                let shown = Self.branchName(w)
                let (cwds, sc) = self.processCwds(fresh: true)
                var sids: [Int: [String]] = [:]
                for c in self.chats { if let idx = sc.owner[c.pid] { sids[idx, default: []].append(c.sid) } }
                let o = self.owners(of: top, cwds: cwds, scan: sc, chatSids: sids)
                if !o.chats.isEmpty || o.blocker != nil {
                    let why = o.blocker ?? "a chat is open in it"
                    self.step(top, "worktree", "use", text: "\(shown) is in use again (\(why)), so it was left alone.")
                    Self.log(["trash", "worktree", name, top, "skipped", "in use: \(why)"])
                    continue
                }
                self.step(top, "worktree", "now")
                let size = self.wtSize[top]?.bytes ?? 0
                let r: [String: Any] = await withCheckedContinuation { c in WorktreeShip.shared.cleanupTrash(top: top, main: w.main, branch: w.branch) { c.resume(returning: $0) } }
                if r["ok"] != nil {
                    ok += 1; trashed += size
                    self.step(top, "worktree", "done", trashed: size)
                    let sha = r["sha"] as? String ?? ""
                    Self.log(["trash", "worktree", name, top.replacingOccurrences(of: HOME, with: "~"), "branch=\(w.branch)@\(sha) kept", "ok", "size=\(Self.gb(size))"])
                } else {
                    bad += 1
                    let title = r["title"] as? String ?? "Couldn't move"
                    let text = r["text"] as? String ?? ""
                    // Git's sentences name the real branch and folder: in streamer mode only the plain verdict is shown.
                    self.step(top, "worktree", "bad", text: Streamer.on ? "Couldn\u{2019}t move" : [title, text].filter { !$0.isEmpty }.joined(separator: " "))
                    Self.log(["trash", "worktree", name, top.replacingOccurrences(of: HOME, with: "~"), "fail", title])
                }
                self.wtList.removeAll { $0.top == top && r["ok"] != nil }
            }
            Self.log(["done", "\(ok) ok, \(bad) failed", "freed=\(Self.gib(freed))", "trash=\(Self.gb(trashed))"])
            self.running = false
            let m: [String: Any] = ["ok": ok, "failed": bad, "freed": freed, "trashed": trashed]
            if let data = try? JSONSerialization.data(withJSONObject: m), let json = String(data: data, encoding: .utf8) {
                self.manager?.radar.push("cleanupStep", "{\"kind\":\"done\",\"id\":\"\",\"state\":\"done\",\"summary\":\(json)}")
            }
            MemoryWatch.shared.refresh()
            self.refreshWorktrees()
        }
    }

    /// The chat is over: its AI is gone, and what is left of its session is nothing but its shell (a pane's chat leaves the shell).
    private func chatGone(_ row: ChatRow, root: Int32, rootStarted: UInt64) -> Bool {
        if let i = Proc.info(row.pid), i.started == row.started { return false }
        guard let r = Proc.info(root), r.started == rootStarted else { return true }
        var left = 0
        var stack = [root]
        while let p = stack.popLast() {
            for c in Proc.children(of: p) {
                stack.append(c)
                if let n = Proc.name(c), !Self.shells.contains(n), snapUser(c) { left += 1 }
            }
        }
        return left == 0
    }

    private func snapUser(_ pid: Int32) -> Bool { Proc.info(pid)?.uid == getuid() }

    // MARK: the log (spec 9.5)

    nonisolated private static let logURL: URL = {
        let dir = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask)[0].appendingPathComponent("Logs/Orbiterm")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("cleanup.log")
    }()

    /// One line per action, fields apart by tabs. Never a command line (it can hold a token), an environment or a file's content.
    nonisolated static func log(_ fields: [String]) {
        let f = ISO8601DateFormatter()
        f.timeZone = .current
        let line = ([f.string(from: Date())] + fields.map { $0.replacingOccurrences(of: "\t", with: " ").replacingOccurrences(of: "\n", with: " ") }).joined(separator: "\t") + "\n"
        let fm = FileManager.default
        let url = logURL
        if let size = (try? fm.attributesOfItem(atPath: url.path))?[.size] as? Int, size > 1 << 20 {
            let old = url.appendingPathExtension("1")
            try? fm.removeItem(at: old)
            try? fm.moveItem(at: url, to: old)
        }
        if !fm.fileExists(atPath: url.path) { fm.createFile(atPath: url.path, contents: nil, attributes: [.posixPermissions: 0o600]) }
        guard let h = try? FileHandle(forWritingTo: url) else { return }
        defer { try? h.close() }
        _ = try? h.seekToEnd()
        try? h.write(contentsOf: Data(line.utf8))
    }

    func showLog() {
        let url = Self.logURL
        if !FileManager.default.fileExists(atPath: url.path) { FileManager.default.createFile(atPath: url.path, contents: nil, attributes: [.posixPermissions: 0o600]) }
        let console = URL(fileURLWithPath: "/System/Applications/Utilities/Console.app")
        NSWorkspace.shared.open([url], withApplicationAt: console, configuration: NSWorkspace.OpenConfiguration(), completionHandler: nil)
    }

    static func openActivityMonitor() {
        NSWorkspace.shared.open(URL(fileURLWithPath: "/System/Applications/Utilities/Activity Monitor.app"))
    }

    nonisolated private static func gib(_ b: UInt64) -> String { String(format: "%.2fGiB", Double(b) / Double(1 << 30)) }
    nonisolated private static func gb(_ b: UInt64) -> String { String(format: "%.2fGB", Double(b) / 1e9) }
    nonisolated private static func stamp(_ us: UInt64) -> String { String(format: "%.3f", Double(us) / 1e6) }

    init() {
        NotificationCenter.default.addObserver(forName: NSApplication.willTerminateNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated {
                guard let self, self.running else { return }
                self.quitting = true
                Self.log(["aborted: app quit"])
            }
        }
    }
}
