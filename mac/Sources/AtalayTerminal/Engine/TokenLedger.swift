import Foundation
import SQLite3

/// Tokens burned on this Mac, for the leaderboard's Tokens view (the API's src/usage.ts): every reply of Claude Code,
/// Codex and Antigravity, read from their own records, by local day (the day the API counts active time on), tool, model
/// and effort: new input, output, cache reads, cache writes, the part of the output spent reasoning, and the replies.
/// Each file is read on from where it was left, a few minutes apart; the first time, everything the tools still keep, so
/// the API gets the history once. A reply counts once however many lines or files repeat it (Claude writes one over
/// several lines and copies history into forks and resumed chats); what was counted is kept as 64-bit hashes in a file of
/// its own beside the book.
///
/// Kept on this Mac, like the spend ledger. Each day that changed goes to the API whole (Cloud.sendUsage), and the API
/// keeps the larger of each number, so a day sent again never counts twice. Used on its own queue only.
final class TokenLedger: @unchecked Sendable {
    static let shared = TokenLedger()

    /// New input (not read from a cache), output (reasoning included), cache reads, cache writes, reasoning, replies.
    struct Counts: Codable, Equatable {
        var i = 0, o = 0, r = 0, w = 0, t = 0, n = 0

        var isEmpty: Bool { i == 0 && o == 0 && r == 0 && w == 0 }

        mutating func add(_ c: Counts) {
            i += c.i; o += c.o; r += c.r; w += c.w; t += c.t; n += c.n
        }
    }

    /// How far a file was read (by its inode: a file replaced under the same name is read again from its start), and what
    /// reading on needs from before: Claude's last reply (its later lines add what they add to it), Codex's model, effort,
    /// session and running total, Antigravity's replies so far (its model, where a line doesn't name it, is its
    /// conversation's n-th generation's).
    struct Mark: Codable {
        var ino: UInt64 = 0, off: UInt64 = 0
        var last: UInt64?, lastC: Counts?, lastKey: String?, lastDay: String?
        var model: String?, effort: String?, rec: Bool?, total: String?, sid: String?
        var n: Int?
    }

    private struct Book: Codable {
        var version = 1
        /// This book's own id: the API counts one Mac's records once even when it shows up under two device rows.
        var source = ""
        /// "2026-11-14" -> "tool|model|effort" -> that day's totals.
        var days: [String: [String: Counts]] = [:]
        var files: [String: Mark] = [:]
        /// Days changed since they last went out.
        var dirty: Set<String> = []
    }

    /// What goes out in one call: up to a few hundred rows, each a whole day of one tool, model and effort.
    struct Batch {
        let source: String
        let rows: [[String: Any]]
        fileprivate let days: [String: [String: Counts]]
    }

    private let queue = DispatchQueue(label: "atalay.tokens", qos: .utility)
    private let projects: String, codex: String, agy: String
    private let url: URL, seenURL: URL
    private var book = Book()
    private var seen = Set<UInt64>()
    private var unsaved: [UInt64] = []
    private var timer: DispatchSourceTimer?
    /// Antigravity's generations by conversation, for its older lines (read once a pass).
    private var labels: [String: [String]] = [:]

    init(projects: String = (CLAUDE_DIR as NSString).appendingPathComponent("projects"),
         codex: String = ProcessInfo.processInfo.environment["CODEX_HOME"] ?? HOME + "/.codex",
         agy: String = HOME + "/.gemini/antigravity-cli", store: URL? = nil) {
        self.projects = projects
        self.codex = codex
        self.agy = agy
        let base = (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: HOME + "/Library/Application Support")).appendingPathComponent("atalay-terminal")
        // Each build keeps its own, as its spend ledger: staging sends to its own API.
        url = store ?? base.appendingPathComponent(Detached.prefix == "atl-" ? "tokens.json" : "tokens-\(Detached.prefix.dropLast()).json")
        seenURL = url.deletingPathExtension().appendingPathExtension("seen")
        try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        if let data = try? Data(contentsOf: url), let saved = try? JSONDecoder().decode(Book.self, from: data), saved.version == 1 {
            book = saved
            if let data = try? Data(contentsOf: seenURL) {
                seen.reserveCapacity(data.count / 8)
                data.withUnsafeBytes { raw in
                    for k in 0..<(raw.count / 8) { seen.insert(UInt64(littleEndian: raw.loadUnaligned(fromByteOffset: k * 8, as: UInt64.self))) }
                }
            }
        } else {
            // A new book (or one this build can't read) starts over, counted hashes too.
            try? FileManager.default.removeItem(at: seenURL)
        }
        if book.source.isEmpty { book.source = (0..<16).map { _ in String(format: "%02x", UInt8.random(in: 0...255)) }.joined() }
    }

    /// Reads now, then every three minutes.
    func start() {
        queue.async {
            guard self.timer == nil else { return }
            self.read()
            let t = DispatchSource.makeTimerSource(queue: self.queue)
            t.schedule(deadline: .now() + 180, repeating: 180, leeway: .seconds(30))
            t.setEventHandler { self.read() }
            t.resume()
            self.timer = t
        }
    }

    /// The days that changed since they last went out, newest first, as the API takes them: at most `max` rows. Nil when
    /// nothing changed.
    func batch(max: Int = 500) async -> Batch? {
        await withCheckedContinuation { c in queue.async { c.resume(returning: self.makeBatch(max)) } }
    }

    /// A batch reached the API: its days are done, unless they changed since.
    func sent(_ b: Batch) {
        queue.async {
            for (day, kinds) in b.days where self.book.days[day] == kinds { self.book.dirty.remove(day) }
            self.save()
        }
    }

    // MARK: reading

    /// Every file of the three tools, read on; the book saved when anything changed.
    private func read() {
        let t0 = Date()
        var changed = false, present = Set<String>(), keys = Ledger.DayKeys()
        labels.removeAll()
        for (tool, paths) in [(Tool.claude, claudeFiles()), (.codex, codexFiles()), (.agy, agyFiles())] {
            for p in paths {
                present.insert(p)
                if pump(p, tool, &keys) { changed = true }
            }
        }
        // Files their tool deleted: forgotten, so the book doesn't grow with them (what they added stays).
        for p in book.files.keys where !present.contains(p) {
            book.files[p] = nil
            changed = true
        }
        if changed {
            save()
            NSLog("Orbiterm: tokens read in %.1fs, %d days to send", Date().timeIntervalSince(t0), book.dirty.count)
        }
    }

    /// The days as counted so far (the probe's and a debugger's look).
    func snapshot() -> [String: [String: Counts]] { queue.sync { book.days } }

    private enum Tool { case claude, codex, agy }

    /// A folder itself, not a link to one: inside the tools' folders the reader follows no links (one could lead it over
    /// the whole disk, or round in a circle). The tools' own folders may be links (a moved ~/.claude).
    private static func isDir(_ p: String) -> Bool {
        var st = stat()
        return lstat(p, &st) == 0 && (st.st_mode & S_IFMT) == S_IFDIR
    }

    private func claudeFiles() -> [String] {
        var out: [String] = []
        // <project>/<session>.jsonl, and a subagent's under <project>/<session>/…, as the spend ledger walks them.
        func walk(_ dir: String, _ depth: Int) {
            guard let names = try? FileManager.default.contentsOfDirectory(atPath: dir) else { return }
            for n in names {
                let p = (dir as NSString).appendingPathComponent(n)
                if n.hasSuffix(".jsonl") {
                    if depth >= 1 { out.append(p) }
                } else if depth < 6, n != "memory", !n.contains("."), Self.isDir(p) {
                    walk(p, depth + 1)
                }
            }
        }
        walk(projects, 0)
        return out
    }

    private func codexFiles() -> [String] {
        // Archived chats move to archived_sessions: read there again, every reply already counted.
        ["sessions", "archived_sessions"].flatMap { sub -> [String] in
            let root = (codex as NSString).appendingPathComponent(sub)
            guard let e = FileManager.default.enumerator(atPath: root) else { return [] }
            var out: [String] = []
            while let rel = e.nextObject() as? String {
                if (e.fileAttributes?[.type] as? FileAttributeType) == .typeSymbolicLink {
                    e.skipDescendants()
                    continue
                }
                if (rel as NSString).lastPathComponent.hasPrefix("rollout-") && rel.hasSuffix(".jsonl") { out.append((root as NSString).appendingPathComponent(rel)) }
            }
            return out
        }
    }

    private func agyFiles() -> [String] {
        let brain = agy + "/brain"
        return ((try? FileManager.default.contentsOfDirectory(atPath: brain)) ?? [])
            .filter { Self.isDir("\(brain)/\($0)") && Self.isDir("\(brain)/\($0)/.system_generated") && Self.isDir("\(brain)/\($0)/.system_generated/logs") }
            .map { "\(brain)/\($0)/.system_generated/logs/transcript.jsonl" }
            .filter { FileManager.default.fileExists(atPath: $0) }
    }

    /// A line this long without its end is given up on (no record comes near it): the reader goes on after it rather than
    /// hold more and more of it.
    private static let lineMax = 64 << 20

    /// Reads a file on from its mark, whole lines only (a line being written waits for the next pass). True when its
    /// mark moved. A file only, not a link to one.
    private func pump(_ path: String, _ tool: Tool, _ keys: inout Ledger.DayKeys) -> Bool {
        var st = stat()
        guard lstat(path, &st) == 0, (st.st_mode & S_IFMT) == S_IFREG else { return false }
        let size = UInt64(st.st_size), ino = UInt64(st.st_ino)
        var mark = book.files[path] ?? Mark()
        if mark.ino != ino || size < mark.off {
            mark = Mark()
            mark.ino = ino
        }
        guard size > mark.off else {
            guard book.files[path] == nil else { return false }
            book.files[path] = mark
            return true
        }
        guard let fh = FileHandle(forReadingAtPath: path) else { return false }
        defer { try? fh.close() }
        try? fh.seek(toOffset: mark.off)
        var pos = mark.off, rest = Data()
        while pos < size {
            guard let chunk = try? fh.read(upToCount: Int(min(UInt64(4 << 20), size - pos))), !chunk.isEmpty else { break }
            pos += UInt64(chunk.count)
            let data = rest.isEmpty ? chunk : rest + chunk
            guard let nl = data.lastIndex(of: 10) else {
                if data.count > Self.lineMax {
                    // What is left of it, up to its end, reads as a broken line and counts nothing.
                    rest = Data()
                    mark.off = pos
                } else {
                    rest = data
                }
                continue
            }
            Self.eachLine(data[data.startIndex..<nl]) { line in
                switch tool {
                case .claude: claudeLine(line, &mark, &keys)
                case .codex: codexLine(line, &mark, path, &keys)
                case .agy: agyLine(line, &mark, path, &keys)
                }
            }
            rest = Data(data[(nl + 1)...])
            mark.off = pos - UInt64(rest.count)
        }
        book.files[path] = mark
        return true
    }

    private static let assistantKey = Array("\"type\":\"assistant\"".utf8), usageKey = Array("\"usage\"".utf8)

    /// A Claude reply: counted the first time its id comes; a later line of the same reply (the one just counted) adds
    /// what it has more of.
    private func claudeLine(_ line: Data, _ mark: inout Mark, _ keys: inout Ledger.DayKeys) {
        guard Self.has(line, Self.assistantKey), Self.has(line, Self.usageKey),
              let rec = try? JSONSerialization.jsonObject(with: line) as? [String: Any], rec["type"] as? String == "assistant",
              (rec["isApiErrorMessage"] as? Bool) != true, let m = rec["message"] as? [String: Any],
              let u = m["usage"] as? [String: Any], let mid = m["id"] as? String, m["model"] as? String != "<synthetic>" else { return }
        let c = Counts(i: int(u["input_tokens"]), o: int(u["output_tokens"]), r: int(u["cache_read_input_tokens"]),
                       w: int(u["cache_creation_input_tokens"]), t: int((u["output_tokens_details"] as? [String: Any])?["thinking_tokens"]), n: 1)
        let h = Self.hash("c:" + mid)
        if mark.last == h, let had = mark.lastC, let key = mark.lastKey, let day = mark.lastDay {
            let more = Counts(i: max(0, c.i - had.i), o: max(0, c.o - had.o), r: max(0, c.r - had.r), w: max(0, c.w - had.w), t: max(0, c.t - had.t))
            guard !more.isEmpty || more.t > 0 else { return }
            add(day, key, more)
            mark.lastC = Counts(i: max(c.i, had.i), o: max(c.o, had.o), r: max(c.r, had.r), w: max(c.w, had.w), t: max(c.t, had.t), n: 1)
            return
        }
        guard !seen.contains(h) else { return }
        let ts = parseISO(rec["timestamp"] as? String)
        guard ts > 0 else { return }
        remember(h)
        let day = keys.key(ts)
        let key = Self.key("claude", Self.model(m["model"] as? String), (rec["perTurnEffort"] as? String) ?? (rec["effort"] as? String))
        add(day, key, c)
        mark.last = h
        mark.lastC = c
        mark.lastKey = key
        mark.lastDay = day
    }

    private static let codexKeys = ["\"token_usage_record\"", "\"token_count\"", "\"turn_context\"", "\"thread_settings_applied\"", "\"session_meta\""]
        .map { Array($0.utf8) }

    /// Codex: each response's own record where its version writes them; before that, its running total's steps.
    private func codexLine(_ line: Data, _ mark: inout Mark, _ path: String, _ keys: inout Ledger.DayKeys) {
        guard Self.codexKeys.contains(where: { Self.has(line, $0) }),
              let j = try? JSONSerialization.jsonObject(with: line) as? [String: Any] else { return }
        let p = j["payload"] as? [String: Any] ?? [:]
        let ts = parseISO(j["timestamp"] as? String)
        func count(_ u: [String: Any]) {
            let cached = int(u["cached_input_tokens"])
            let c = Counts(i: max(0, int(u["input_tokens"]) - cached), o: int(u["output_tokens"]), r: cached,
                           w: int(u["cache_write_input_tokens"]), t: int(u["reasoning_output_tokens"]), n: 1)
            guard ts > 0, !c.isEmpty else { return }
            add(keys.key(ts), Self.key("codex", Self.model(mark.model), mark.effort), c)
        }
        switch (j["type"] as? String, p["type"] as? String) {
        case ("session_meta", _):
            if let id = p["id"] as? String { mark.sid = id }
        case ("turn_context", _):
            if let m = p["model"] as? String, !m.isEmpty { mark.model = m }
            let settings = (p["collaboration_mode"] as? [String: Any])?["settings"] as? [String: Any]
            if let e = (p["effort"] as? String) ?? (settings?["reasoning_effort"] as? String) ?? (p["reasoning_effort"] as? String) { mark.effort = e }
        case ("event_msg", "thread_settings_applied"):
            let s = p["thread_settings"] as? [String: Any]
            if let m = s?["model"] as? String, !m.isEmpty { mark.model = m }
            if let e = s?["reasoning_effort"] as? String { mark.effort = e }
        case ("token_usage_record", _):
            mark.rec = true
            guard let rid = p["response_id"] as? String, let u = p["usage"] as? [String: Any] else { return }
            let h = Self.hash("x:" + rid)
            guard !seen.contains(h) else { return }
            remember(h)
            count(u)
        case ("event_msg", "token_count"):
            // A log that has records counts them instead.
            guard mark.rec != true, let info = p["info"] as? [String: Any], let last = info["last_token_usage"] as? [String: Any] else { return }
            let total = (info["total_token_usage"] as? [String: Any]).map { t in t.keys.sorted().map { "\($0)=\(int(t[$0]))" }.joined(separator: ";") }
            if let total, total == mark.total { return }
            mark.total = total
            let sid = mark.sid ?? (path as NSString).lastPathComponent
            let h = Self.hash("x:\(sid):\(j["timestamp"] as? String ?? ""):\(int((info["total_token_usage"] as? [String: Any])?["total_tokens"]))")
            guard !seen.contains(h) else { return }
            remember(h)
            count(last)
        default:
            break
        }
    }

    private static let plannerKey = Array("\"PLANNER_RESPONSE\"".utf8)

    /// Antigravity: a reply of its planner. Newer lines name the model with its effort ("gemini-4-argon-medium"); older
    /// ones don't, and then it's its conversation's generation of the same number (conversations/<id>.db).
    private func agyLine(_ line: Data, _ mark: inout Mark, _ path: String, _ keys: inout Ledger.DayKeys) {
        guard Self.has(line, Self.plannerKey), let j = try? JSONSerialization.jsonObject(with: line) as? [String: Any],
              j["type"] as? String == "PLANNER_RESPONSE" else { return }
        let nth = mark.n ?? 0
        mark.n = nth + 1
        let c = Counts(i: int(j["input_tokens"]), o: int(j["output_tokens"]), r: int(j["cache_read_tokens"]), n: 1)
        let ts = parseISO(j["created_at"] as? String)
        guard !c.isEmpty, ts > 0 else { return }
        // brain/<conversation>/.system_generated/logs/transcript.jsonl
        let cid = path.components(separatedBy: "/brain/").last?.split(separator: "/").first.map(String.init) ?? ""
        let h = Self.hash("a:\(cid):\(int(j["step_index"]))")
        guard !seen.contains(h) else { return }
        remember(h)
        var model = "", effort = ""
        if let m = j["model"] as? String, !m.isEmpty {
            (model, effort) = Self.splitEffort(m)
        } else {
            let list = labels[cid] ?? Self.generations(agy + "/conversations/\(cid).db")
            labels[cid] = list
            if let label = list.isEmpty ? nil : list[min(nth, list.count - 1)], !label.isEmpty { (model, effort) = Self.fromLabel(label) }
        }
        add(keys.key(ts), Self.key("antigravity", Self.model(model), effort), c)
    }

    private static let labelPattern = try? NSRegularExpression(pattern: #"(?:Gemini|Claude|GPT|Gemma)[A-Za-z0-9 .\-]{0,40}\([A-Za-z ]{2,20}\)"#)

    /// Each generation's model as Antigravity shows it ("Gemini 4 Argon (Medium)"), in order, from the conversation's
    /// own database (read as it is on disk: these are the older, finished ones).
    private static func generations(_ db: String) -> [String] {
        guard FileManager.default.fileExists(atPath: db), let pattern = labelPattern else { return [] }
        var handle: OpaquePointer?
        guard sqlite3_open_v2("file:\(db)?immutable=1", &handle, SQLITE_OPEN_READONLY | SQLITE_OPEN_URI, nil) == SQLITE_OK else {
            sqlite3_close(handle)
            return []
        }
        defer { sqlite3_close(handle) }
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(handle, "select data from gen_metadata order by idx", -1, &stmt, nil) == SQLITE_OK else { return [] }
        defer { sqlite3_finalize(stmt) }
        var out: [String] = []
        while sqlite3_step(stmt) == SQLITE_ROW {
            let n = Int(sqlite3_column_bytes(stmt, 0))
            guard n > 0, let blob = sqlite3_column_blob(stmt, 0) else {
                out.append("")
                continue
            }
            // The label is plain ASCII inside the record: other bytes become a character no label has.
            let text = String(decoding: UnsafeRawBufferPointer(start: blob, count: n).map { $0 < 0x80 ? $0 : 0x01 }, as: UTF8.self)
            let r = pattern.firstMatch(in: text, range: NSRange(text.startIndex..., in: text))
            out.append(r.flatMap { Range($0.range, in: text).map { String(text[$0]) } } ?? "")
        }
        return out
    }

    // MARK: names

    private static let efforts: Set<String> = ["minimal", "low", "medium", "high", "xhigh", "max", "ultra"]

    /// A model as the API keeps it: lower case, Claude's without "claude-" and a date ("opus-5-5"), only the characters
    /// it takes.
    static func model(_ s: String?) -> String {
        var m = (s ?? "").lowercased().trimmingCharacters(in: .whitespaces)
        if m.hasPrefix("claude-") { m.removeFirst(7) }
        m = m.replacingOccurrences(of: #"-\d{8}$"#, with: "", options: .regularExpression)
        m = m.replacingOccurrences(of: #"[^a-z0-9._-]+"#, with: "-", options: .regularExpression)
        while let f = m.first, !(f.isLetter || f.isNumber) { m.removeFirst() }
        m = String(m.prefix(48))
        return m.isEmpty ? "unknown" : m
    }

    static func effort(_ s: String?) -> String {
        var e = (s ?? "").lowercased().replacingOccurrences(of: #"[^a-z0-9._-]+"#, with: "-", options: .regularExpression)
        while let f = e.first, !(f.isLetter || f.isNumber) { e.removeFirst() }
        return String(e.prefix(16))
    }

    private static func key(_ tool: String, _ model: String, _ effort: String?) -> String { "\(tool)|\(model)|\(Self.effort(effort))" }

    /// "gemini-4-argon-medium" -> ("gemini-4-argon", "medium"); a name without an effort at its end stays whole.
    static func splitEffort(_ s: String) -> (String, String) {
        let m = model(s)
        guard let dash = m.lastIndex(of: "-"), efforts.contains(String(m[m.index(after: dash)...])) else { return (m, "") }
        return (String(m[..<dash]), String(m[m.index(after: dash)...]))
    }

    /// "Gemini 4 Argon (Medium)" -> ("gemini-4-argon", "medium"); "Claude Opus 5.5 (High)" -> ("opus-5-5", "high"), as
    /// Claude names its models.
    static func fromLabel(_ label: String) -> (String, String) {
        var name = label, effort = ""
        if let open = label.lastIndex(of: "("), let close = label.lastIndex(of: ")"), open < close {
            name = String(label[..<open])
            effort = label[label.index(after: open)..<close].trimmingCharacters(in: .whitespaces).lowercased()
        }
        var m = name.lowercased().replacingOccurrences(of: #"[^a-z0-9.]+"#, with: "-", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
        if m.hasPrefix("claude-") { m = String(m.dropFirst(7)).replacingOccurrences(of: ".", with: "-") }
        return (m, efforts.contains(effort) ? effort : "")
    }

    // MARK: the book

    private func add(_ day: String, _ key: String, _ c: Counts) {
        book.days[day, default: [:]][key, default: Counts()].add(c)
        book.dirty.insert(day)
    }

    private func remember(_ h: UInt64) {
        seen.insert(h)
        unsaved.append(h)
    }

    /// The replies it counted first, then the book: a crash in between leaves the old book, whose marks read those replies
    /// again, and they're skipped as counted (a few left out), never counted twice. When they can't be written, neither is
    /// the book (both are tried again at the next save).
    private func save() {
        if !unsaved.isEmpty {
            var bytes = Data(capacity: unsaved.count * 8)
            for h in unsaved { withUnsafeBytes(of: h.littleEndian) { bytes.append(contentsOf: $0) } }
            if !FileManager.default.fileExists(atPath: seenURL.path) {
                FileManager.default.createFile(atPath: seenURL.path, contents: nil, attributes: [.posixPermissions: 0o600])
            }
            guard let fh = try? FileHandle(forWritingTo: seenURL) else { return }
            defer { try? fh.close() }
            do {
                _ = try fh.seekToEnd()
                try fh.write(contentsOf: bytes)
            } catch {
                return
            }
            unsaved.removeAll()
        }
        guard let data = try? JSONEncoder().encode(book) else { return }
        try? data.write(to: url, options: .atomic)
        try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: url.path)
    }

    private func makeBatch(_ max: Int) -> Batch? {
        var rows: [[String: Any]] = [], days: [String: [String: Counts]] = [:]
        for day in book.dirty.sorted(by: >) {
            let kinds = book.days[day] ?? [:]
            let list = kinds.filter { !$0.value.isEmpty }
            if !rows.isEmpty, rows.count + list.count > max { break }
            days[day] = kinds
            for (key, c) in list.sorted(by: { $0.value.i + $0.value.o + $0.value.w > $1.value.i + $1.value.o + $1.value.w }).prefix(max) {
                let p = key.split(separator: "|", maxSplits: 2, omittingEmptySubsequences: false).map(String.init)
                // Only rows the API takes (its usage.ts): a name it wouldn't is left out here, a number past its range
                // kept at its edge.
                guard p.count == 3, Self.tools.contains(p[0]), Self.fits(p[1], 48, empty: false), Self.fits(p[2], 16, empty: true) else { continue }
                let o = Self.clamp(c.o)
                rows.append(["day": day, "tool": p[0], "model": p[1], "effort": p[2], "input": Self.clamp(c.i), "output": o,
                             "cacheRead": Self.clamp(c.r), "cacheWrite": Self.clamp(c.w), "reasoning": min(Self.clamp(c.t), o),
                             "calls": Self.clamp(c.n, 10_000_000)])
            }
        }
        // Days with nothing to send (all their kinds empty) are done at once.
        if rows.isEmpty {
            guard !days.isEmpty else { return nil }
            for day in days.keys { book.dirty.remove(day) }
            save()
            return nil
        }
        return Batch(source: book.source, rows: rows, days: days)
    }

    // MARK: helpers

    private static let tools: Set<String> = ["claude", "codex", "antigravity"]

    /// A name as the API keeps one: lower-case letters, digits, ".", "_" and "-", a letter or digit first, `max` long at most.
    private static func fits(_ s: String, _ max: Int, empty: Bool) -> Bool {
        let b = Array(s.utf8)
        guard let f = b.first else { return empty }
        let alnum = { (c: UInt8) in (c >= 0x61 && c <= 0x7a) || (c >= 0x30 && c <= 0x39) }
        return b.count <= max && alnum(f) && b.allSatisfy { alnum($0) || $0 == 0x2e || $0 == 0x5f || $0 == 0x2d }
    }

    /// A count within what the API takes.
    private static func clamp(_ n: Int, _ top: Int = 1_000_000_000_000) -> Int { Swift.min(Swift.max(n, 0), top) }

    private static func has(_ line: Data, _ key: [UInt8]) -> Bool {
        line.withUnsafeBytes { raw in raw.baseAddress.map { memmem($0, raw.count, key, key.count) != nil } ?? false }
    }

    /// Each line of `data`, without copying it.
    private static func eachLine(_ data: Data, _ body: (Data) -> Void) {
        data.withUnsafeBytes { (raw: UnsafeRawBufferPointer) in
            guard let base = raw.baseAddress else { return }
            var off = 0
            while off < raw.count {
                let nl = memchr(base + off, 10, raw.count - off).map { base.distance(to: UnsafeRawPointer($0)) } ?? raw.count
                if nl > off { body(Data(bytesNoCopy: UnsafeMutableRawPointer(mutating: base + off), count: nl - off, deallocator: .none)) }
                off = nl + 1
            }
        }
    }

    /// FNV-1a: the same on every run (Swift's own hash isn't).
    static func hash(_ s: String) -> UInt64 {
        var h: UInt64 = 0xcbf2_9ce4_8422_2325
        for b in s.utf8 { h = (h ^ UInt64(b)) &* 0x100_0000_01b3 }
        return h
    }
}
