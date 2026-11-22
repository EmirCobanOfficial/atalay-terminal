import Foundation

/// The env button's file side (EnvView.swift): finds the env-style files under a terminal's folder, and reads and writes
/// them. Foundation only. Nothing here logs, sends or stores what a file holds, and no error text carries it. Every read
/// and write checks the path again (`resolve`): inside the folder, no `..`, no symlink out, a regular file, an env name,
/// at most 1 MB.
enum EnvFiles {
    /// The largest file read or written.
    static let maxSize = 1 << 20
    static let maxFiles = 100
    static let maxDepth = 4
    private static let maxVisited = 20_000
    /// A quoted value may run over as many lines as it needs, up to this many characters; past that the line stands alone.
    static let maxValueChars = 64 << 10
    /// The most characters all the quoted values of a file may take to look for their ends (a file of unclosed quotes).
    private static let quoteBudget = 4 << 20
    private static let budget: TimeInterval = 1.5

    /// Folders never entered (besides every hidden one: .git, .venv, .cache ...).
    static let skipped: Set<String> = [
        "node_modules", "build", "dist", "out", "target", "vendor", "pods", "carthage", "deriveddata", "coverage", "venv",
        "__pycache__", "site-packages", "bower_components", "storybook-static", "library", "tmp", "temp", "bin", "obj",
    ]

    enum Kind: String { case env, template, envrc }

    struct Found: Equatable {
        /// Path below the folder, "/"-separated: what the page holds and sends back.
        let rel: String
        let name: String
        /// The subproject's folder below the folder ("" for the folder itself).
        let folder: String
        let kind: Kind
        let size: Int
        let mtime: Double
        /// Enabled variables in it.
        let keys: Int
        /// Another name for the same file exists (a hard link, maybe from another worktree): shown, but only read.
        let hardLinked: Bool
    }

    struct Listing {
        var files: [Found] = []
        /// More files than the limit, or a limit of time or depth stopped the walk.
        var truncated = false
    }

    // MARK: names

    private static let templateWords: Set<String> = ["example", "sample", "template", "dist", "tpl", "default", "defaults"]

    /// What an env-style file is by its name, nil for any other file:
    /// `.env`, `.env.<anything>` (.env.local, .env.production ...), `<name>.env`, `.envrc`, and a template of them
    /// (`.env.example`, `app.env.sample`). A template word as the last part marks it a template.
    static func kind(of name: String) -> Kind? {
        let n = name.lowercased()
        if n == ".envrc" { return .envrc }
        let last = n.split(separator: ".").last.map(String.init) ?? ""
        let templated = templateWords.contains(last)
        if n == ".env" { return .env }
        if n.hasPrefix(".env."), n.count > 5 { return templated ? .template : .env }
        if n.hasSuffix(".env"), n.count > 4 { return .env }
        if templated, n.contains(".env."), !n.hasPrefix("."), !n.hasSuffix(".") { return .template }
        return nil
    }

    // MARK: discovery

    /// The env files under `root`, including subfolders: depth up to 4, 100 files, 1.5 seconds. Hidden and heavy folders
    /// aren't entered; a symlinked folder isn't followed; a symlinked file counts only when it points inside `root`. When
    /// `root` is the home folder or the disk's root, only its own files are looked at.
    static func discover(in root: String, home: String = NSHomeDirectory()) -> Listing {
        let fm = FileManager.default
        let realRoot = real(root)
        let shallow = realRoot == real(home) || realRoot == "/"
        var out = Listing()
        let start = Date()
        var visited = 0
        var queue: [(dir: String, rel: String, depth: Int)] = [(realRoot, "", 0)]
        while !queue.isEmpty {
            if Date().timeIntervalSince(start) > budget { out.truncated = true; break }
            let (dir, rel, depth) = queue.removeFirst()
            guard let names = try? fm.contentsOfDirectory(atPath: dir) else { continue }
            var subdirs: [String] = []
            for name in names.sorted() {
                visited += 1
                if visited > maxVisited || Date().timeIntervalSince(start) > budget { out.truncated = true; break }
                let path = dir + "/" + name
                var st = stat()
                guard lstat(path, &st) == 0 else { continue }
                let mode = st.st_mode & S_IFMT
                if mode == S_IFDIR {
                    if shallow || depth >= maxDepth { if depth >= maxDepth { out.truncated = true }; continue }
                    if name.hasPrefix(".") || skipped.contains(name.lowercased()) { continue }
                    // A Python virtualenv named env.
                    if fm.fileExists(atPath: path + "/pyvenv.cfg") { continue }
                    subdirs.append(name)
                } else if mode == S_IFREG || mode == S_IFLNK {
                    guard let k = kind(of: name) else { continue }
                    let relPath = rel.isEmpty ? name : rel + "/" + name
                    guard let info = check(relPath, in: realRoot, shallow: shallow) else { continue }
                    if out.files.count >= maxFiles { out.truncated = true; continue }
                    let keys = (try? readFile(info.real)).map { parse($0.text).filter { $0.kind == .pair && $0.enabled }.count } ?? 0
                    out.files.append(Found(rel: relPath, name: name, folder: rel, kind: k, size: info.size, mtime: info.mtime, keys: keys, hardLinked: info.nlink > 1))
                }
            }
            for s in subdirs { queue.append((dir + "/" + s, rel.isEmpty ? s : rel + "/" + s, depth + 1)) }
            if out.truncated && visited > maxVisited { break }
        }
        out.files.sort(by: order)
        return out
    }

    /// Folder groups, the folder itself first; in a group .env, .env.local, the rest, .envrc, the templates last.
    static func order(_ a: Found, _ b: Found) -> Bool {
        if a.folder != b.folder {
            if a.folder.isEmpty != b.folder.isEmpty { return a.folder.isEmpty }
            return a.folder.localizedStandardCompare(b.folder) == .orderedAscending
        }
        func rank(_ f: Found) -> Int {
            if f.kind == .template { return 4 }
            if f.kind == .envrc { return 3 }
            let n = f.name.lowercased()
            return n == ".env" ? 0 : n == ".env.local" ? 1 : 2
        }
        if rank(a) != rank(b) { return rank(a) < rank(b) }
        return a.name.localizedStandardCompare(b.name) == .orderedAscending
    }

    // MARK: the check every read and write goes through

    struct Info { let real: String; let size: Int; let mtime: Double; let mode: mode_t; let nlink: Int }

    /// The file `rel` below `root`, if it may be read or written: no `..` or absolute part, no hidden or skipped folder on
    /// the way, an env name, and as the file it really is (links followed) a regular file inside `root`, at most 1 MB.
    /// The file a link points at must itself have an env name and lie in no hidden or skipped folder, and have one name
    /// only (a hard link may be a file from outside).
    static func check(_ rel: String, in root: String, shallow: Bool? = nil) -> Info? {
        let realRoot = real(root)
        let parts = rel.split(separator: "/", omittingEmptySubsequences: false).map(String.init)
        guard !rel.isEmpty, !rel.hasPrefix("/"), !parts.contains(where: { $0.isEmpty || $0 == "." || $0 == ".." }),
              !rel.contains("\0"), kind(of: parts[parts.count - 1]) != nil else { return nil }
        let isShallow = shallow ?? (realRoot == real(NSHomeDirectory()) || realRoot == "/")
        if isShallow && parts.count > 1 { return nil }
        if parts.count - 1 > maxDepth { return nil }
        for dir in parts.dropLast() where dir.hasPrefix(".") || skipped.contains(dir.lowercased()) { return nil }
        let prefix = (realRoot == "/" ? "" : realRoot) + "/"
        let resolved = real(prefix + rel)
        guard resolved.hasPrefix(prefix) else { return nil }
        let inner = resolved.dropFirst(prefix.count).split(separator: "/").map(String.init)
        guard let name = inner.last, kind(of: name) != nil else { return nil }
        if isShallow && inner.count > 1 { return nil }
        for dir in inner.dropLast() where dir.hasPrefix(".") || skipped.contains(dir.lowercased()) { return nil }
        var st = stat()
        guard stat(resolved, &st) == 0, st.st_mode & S_IFMT == S_IFREG, Int(st.st_size) <= maxSize else { return nil }
        return Info(real: resolved, size: Int(st.st_size), mtime: mtime(st), mode: st.st_mode & 0o7777, nlink: Int(st.st_nlink))
    }

    /// The path with every link resolved, as the system does it (Foundation's version turns /private/tmp into /tmp, a link).
    static func real(_ p: String) -> String {
        var buf = [CChar](repeating: 0, count: Int(PATH_MAX))
        return realpath(p, &buf) != nil ? String(cString: buf) : URL(fileURLWithPath: p).standardizedFileURL.path
    }

    private static func mtime(_ st: stat) -> Double { Double(st.st_mtimespec.tv_sec) + Double(st.st_mtimespec.tv_nsec) / 1e9 }

    /// No link anywhere in the path, as the system itself checks it at the open.
    private static let noLinks = O_NOFOLLOW_ANY

    // MARK: read and write

    struct Content { let text: String; let bom: Bool; let mtime: Double }
    enum Failure: Error { case notAllowed, notText, conflict, tooBig, readOnly, hardLinked, failed }

    static func read(_ rel: String, in root: String) throws -> Content {
        guard let info = check(rel, in: root) else { throw Failure.notAllowed }
        return try readFile(info.real)
    }

    /// Opens without following a link and without blocking (a FIFO swapped in is refused), looks at what it opened, and
    /// reads at most 1 MB and a byte.
    fileprivate static func readFile(_ realPath: String) throws -> Content {
        let fd = open(realPath, O_RDONLY | O_NONBLOCK | noLinks)
        guard fd >= 0 else { throw Failure.failed }
        defer { close(fd) }
        var st = stat()
        guard fstat(fd, &st) == 0, st.st_mode & S_IFMT == S_IFREG else { throw Failure.notAllowed }
        guard Int(st.st_size) <= maxSize else { throw Failure.tooBig }
        var data = Data()
        var buf = [UInt8](repeating: 0, count: 64 << 10)
        while data.count <= maxSize {
            let n = Foundation.read(fd, &buf, min(buf.count, maxSize + 1 - data.count))
            if n < 0 { throw Failure.failed }
            if n == 0 { break }
            data.append(buf, count: n)
        }
        guard data.count <= maxSize else { throw Failure.tooBig }
        guard !data.prefix(8192).contains(0) else { throw Failure.notText }
        let bom = data.starts(with: [0xEF, 0xBB, 0xBF])
        guard let text = String(data: bom ? data.dropFirst(3) : data, encoding: .utf8) else { throw Failure.notText }
        return Content(text: text, bom: bom, mtime: mtime(st))
    }

    /// When the file last changed; nil when it is gone or not allowed any more.
    static func modified(_ rel: String, in root: String) -> Double? { check(rel, in: root)?.mtime }

    /// Writes the file whole and atomically: a new file next to it (made through the folder's own descriptor, so a folder
    /// swapped for a link meanwhile changes nothing), the same permissions, owner, attributes and access list, fsynced, then
    /// renamed over it. `base` is the mtime the text was read at: a file changed since is a conflict (nil forces). A link
    /// inside the folder is written through to the file it points at. A read-only file is refused. Returns the new mtime.
    static func write(_ text: String, bom: Bool, rel: String, in root: String, base: Double?) throws -> Double {
        guard let info = check(rel, in: root) else { throw Failure.notAllowed }
        var data = Data(bom ? [0xEF, 0xBB, 0xBF] : [])
        data.append(Data(text.utf8))
        guard data.count <= maxSize else { throw Failure.tooBig }
        let dir = (info.real as NSString).deletingLastPathComponent
        let name = (info.real as NSString).lastPathComponent
        let dfd = open(dir, O_RDONLY | O_DIRECTORY | noLinks)
        guard dfd >= 0 else { throw Failure.failed }
        defer { close(dfd) }
        var now = stat()
        guard fstatat(dfd, name, &now, AT_SYMLINK_NOFOLLOW) == 0, now.st_mode & S_IFMT == S_IFREG else { throw Failure.notAllowed }
        // A hard-linked file is shared with another name: a write would replace this name only and cut the link.
        guard now.st_nlink == 1 else { throw Failure.hardLinked }
        guard faccessat(dfd, name, W_OK, 0) == 0 else { throw Failure.readOnly }
        if let base, abs(mtime(now) - base) > 0.0005 { throw Failure.conflict }
        let tmp = ".orbiterm-env-" + String(UUID().uuidString.prefix(8).lowercased())
        let fd = openat(dfd, tmp, O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW, 0o600)
        guard fd >= 0 else { throw Failure.failed }
        var done = false
        defer { if !done { unlinkat(dfd, tmp, 0) } }
        let src = openat(dfd, name, O_RDONLY | O_NONBLOCK | O_NOFOLLOW)
        if src >= 0 {
            _ = fcopyfile(src, fd, nil, copyfile_flags_t(COPYFILE_XATTR | COPYFILE_ACL))
            close(src)
        }
        _ = fchown(fd, now.st_uid, now.st_gid)
        guard fchmod(fd, now.st_mode & 0o7777) == 0 else { close(fd); throw Failure.failed }
        let ok = data.withUnsafeBytes { buf -> Bool in
            var offset = 0
            while offset < buf.count {
                let n = Foundation.write(fd, buf.baseAddress! + offset, buf.count - offset)
                if n <= 0 { return false }
                offset += n
            }
            return true
        }
        guard ok, fsync(fd) == 0 else { close(fd); throw Failure.failed }
        close(fd)
        guard renameat(dfd, tmp, dfd, name) == 0 else { throw Failure.failed }
        done = true
        var st = stat()
        _ = fstatat(dfd, name, &st, AT_SYMLINK_NOFOLLOW)
        return mtime(st)
    }

    // MARK: the text as lines

    struct Line: Identifiable, Equatable {
        enum Kind { case blank, comment, pair, other }
        var id = UUID()
        var kind: Kind
        /// The text as it was read: written back as it is while the line isn't changed.
        var raw: String
        var key = ""
        var value = ""
        /// A `# KEY=value` line is a variable switched off.
        var enabled = true
        var export = false
        var quote: Character?
        /// What stands between the name and the value (`=`, ` = `, `: `).
        var sep = "="
        /// What follows the value: a comment on the same line.
        var trailing = ""
        /// This line's own end of line ("\n" or "\r\n"); "" for a line made here (the file's own is used).
        var eol = ""
        var changed = false
    }

    private static func isKey(_ s: Substring) -> Bool {
        guard let f = s.unicodeScalars.first, f.isASCII, f == "_" || CharacterSet.letters.contains(f) else { return false }
        return s.unicodeScalars.allSatisfy { $0.isASCII && (CharacterSet.alphanumerics.contains($0) || $0 == "_" || $0 == "." || $0 == "-") }
    }

    static func validKey(_ s: String) -> Bool { isKey(Substring(s)) }

    /// The text's lines. A quoted value of a variable may run over several lines (up to 50): one line here. Every line is
    /// looked at once, so the time is that of the text's size.
    static func parse(_ text: String) -> [Line] {
        var raws = text.unicodeScalars.split(separator: "\n", omittingEmptySubsequences: false).map { String($0) }
        if raws.last == "" { raws.removeLast() }
        var lines: [Line] = []
        var i = 0
        var budget = quoteBudget
        var unclosed = Set<Character>()
        while i < raws.count {
            var raw = raws[i]
            i += 1
            var eol = "\n"
            if raw.last == "\r" { raw.removeLast(); eol = "\r\n" }
            let trimmed = raw.trimmingCharacters(in: .whitespaces)
            func plain(_ r: String) -> Line { Line(kind: trimmed.hasPrefix("#") ? .comment : .other, raw: r, eol: eol) }
            if trimmed.isEmpty { lines.append(Line(kind: .blank, raw: raw, eol: eol)); continue }
            var body = Substring(trimmed)
            var enabled = true
            if body.hasPrefix("#") {
                enabled = false
                body = body.dropFirst()
                while body.first == " " || body.first == "\t" { body = body.dropFirst() }
            }
            var export = false
            if body.hasPrefix("export ") { body = body.dropFirst(7).drop(while: { $0 == " " || $0 == "\t" }); export = true }
            // NAME, blanks, = (or : on a live line), blanks.
            guard let sepAt = body.firstIndex(where: { $0 == "=" || $0 == ":" || $0 == " " || $0 == "\t" }) else {
                lines.append(plain(raw)); continue
            }
            let name = body[body.startIndex..<sepAt]
            guard isKey(name) else { lines.append(plain(raw)); continue }
            // A commented `# KEY: v` is a switched-off variable only for a name written as env names are (not `# Note: …`).
            if !enabled, commentTags.contains(String(name)) { lines.append(plain(raw)); continue }
            let colonOK = enabled || name.unicodeScalars.allSatisfy { $0.isASCII && (CharacterSet.uppercaseLetters.contains($0) || CharacterSet.decimalDigits.contains($0) || $0 == "_") }
            var j = sepAt
            while j < body.endIndex, body[j] == " " || body[j] == "\t" { j = body.index(after: j) }
            guard j < body.endIndex, body[j] == "=" || (body[j] == ":" && colonOK) else { lines.append(plain(raw)); continue }
            j = body.index(after: j)
            while j < body.endIndex, body[j] == " " || body[j] == "\t" { j = body.index(after: j) }
            let sep = String(body[sepAt..<j])
            let rest = body[j...]
            var value = "", quote: Character?, trailing = ""
            if let q = rest.first, q == "\"" || q == "'" {
                quote = q
                guard !unclosed.contains(q), let (inner, after, used) = quoted(q, first: String(rest.dropFirst()), raws: raws, from: i, budget: &budget, unclosed: &unclosed) else {
                    lines.append(plain(raw)); continue
                }
                let afterTrim = after.trimmingCharacters(in: .whitespaces)
                guard afterTrim.isEmpty || afterTrim.hasPrefix("#") else { lines.append(plain(raw)); continue }
                for k in 0..<used { raw += "\n" + raws[i + k].replacingOccurrences(of: "\r", with: "") }
                i += used
                value = inner
                trailing = afterTrim.isEmpty ? "" : " " + afterTrim
            } else {
                var s = String(rest)
                if let r = s.range(of: #"\s#"#, options: .regularExpression) {
                    trailing = " " + String(s[s.index(after: r.lowerBound)...])
                    s = String(s[..<r.lowerBound])
                }
                value = s.trimmingCharacters(in: .whitespaces)
            }
            lines.append(Line(kind: .pair, raw: raw, key: String(name), value: value, enabled: enabled, export: export, quote: quote,
                              sep: sep, trailing: trailing, eol: eol))
        }
        return lines
    }

    /// A quoted value's end: on its first line (`first`, what follows the opening quote) or on a later one (`raws` from `from`),
    /// however many, up to 64 KB. The value, what follows the closing quote, and how many more lines it took; nil when it
    /// doesn't close in time (`unclosed` then remembers a quote that reached the end of the text: no later one can close either).
    /// Each character is looked at once; `budget` bounds all the looking in one text.
    private static func quoted(_ q: Character, first: String, raws: [String], from: Int, budget: inout Int, unclosed: inout Set<Character>) -> (String, String, Int)? {
        var value = "", escaped = false, used = 0
        var line = first
        while true {
            var i = line.startIndex
            while i < line.endIndex {
                let c = line[i]
                if escaped { escaped = false } else if c == "\\", q == "\"" { escaped = true } else if c == q {
                    value += line[line.startIndex..<i]
                    return (value, String(line[line.index(after: i)...]), used)
                }
                i = line.index(after: i)
            }
            budget -= line.utf8.count + 1
            if budget < 0 { unclosed.insert(q); return nil }
            guard from + used < raws.count else { unclosed.insert(q); return nil }
            value += line + "\n"
            if value.utf8.count > maxValueChars { return nil }
            escaped = false
            line = raws[from + used].replacingOccurrences(of: "\r", with: "")
            used += 1
        }
    }

    /// Uppercase words that start a comment (`# TODO: …`), never a switched-off variable.
    private static let commentTags: Set<String> = ["TODO", "FIXME", "NOTE", "WARNING", "HACK", "XXX", "BUG", "OPTIMIZE"]

    private static let secretLike = try! NSRegularExpression(pattern: #"[A-Za-z_][A-Za-z0-9_.-]*\s*[=:]"#)

    /// A comment or a plain line that has a NAME followed by = or : in it: may hold a value, so it is masked like one.
    static func looksSecret(_ text: String) -> Bool {
        // `# TODO: …` and its kind only tag a comment.
        var text = text
        let t = text.drop(while: { $0 == "#" || $0 == " " || $0 == "\t" })
        if let colon = t.firstIndex(of: ":"), commentTags.contains(String(t[t.startIndex..<colon])) { text = String(t[t.index(after: colon)...]) }
        if secretLike.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) != nil { return true }
        // A run of 20 or more characters with no space, letters and digits mixed: a key, a token, a hash.
        return text.split(whereSeparator: { $0 == " " || $0 == "\t" }).contains { w in
            w.count >= 20 && w.contains(where: \.isLetter) && w.contains(where: \.isNumber)
        }
    }

    /// The line as it is written: as read while unchanged, else `KEY=value` in the style it had.
    static func serialize(_ l: Line) -> String {
        guard l.changed || l.kind == .pair && l.raw.isEmpty else { return l.raw }
        switch l.kind {
        case .pair:
            var q = l.quote
            var v = l.value
            if q == nil, v.contains(where: { " \t#'\"\n\r".contains($0) }) || v.hasPrefix(" ") { q = "\"" }
            if q == "'" && v.contains("'") { q = "\"" }
            if q == "\"" { v = escapeQuotes(v) }
            let body = (l.export ? "export " : "") + l.key + l.sep + (q.map { String($0) + v + String($0) } ?? v) + l.trailing
            return l.enabled ? body : "# " + body
        default:
            return l.raw
        }
    }

    /// A `"` that a backslash doesn't protect gets one.
    private static func escapeQuotes(_ s: String) -> String {
        var out = "", escaped = false
        for c in s {
            if escaped { out.append(c); escaped = false; continue }
            if c == "\\" { out.append(c); escaped = true; continue }
            if c == "\"" { out.append("\\\"") } else { out.append(c) }
        }
        return out
    }

    /// The whole text, each line with its own end of line (`crlf`: the one for a line made here) and the final one the
    /// file had.
    static func text(of lines: [Line], crlf: Bool, finalNewline: Bool) -> String {
        var out = ""
        for (n, l) in lines.enumerated() {
            let eol = l.eol.isEmpty ? (crlf ? "\r\n" : "\n") : l.eol
            out += serialize(l).replacingOccurrences(of: "\n", with: eol)
            if n < lines.count - 1 || finalNewline { out += eol }
        }
        return out
    }
}
