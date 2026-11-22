import AppKit
import CryptoKit
import Foundation
import UniformTypeIdentifiers

/// Files in notes. A private note's files stay on this Mac, in "<Notes folder>/files/<sha256>", encrypted like the notes (the
/// notes' key, bound to the file's name); a file of a shared note goes to the server's storage with an address the API signs
/// (the PUT and the GET happen here, in Swift, never in the page, so the storage needs no CORS), and a copy fetched from it is
/// kept in the same folder as a cache. The page asks through the notes' bridges (NotesSync.handle) and never sees a path.
enum Attachments {
    static let maxFile = 20 * 1024 * 1024
    /// Programs and installers: not added, to keep friends safe (the server checks the name, this the first bytes too).
    static let blocked: Set<String> = [
        "exe", "msi", "bat", "cmd", "com", "scr", "ps1", "vbs", "hta", "lnk", "cpl", "jar", "app", "pkg", "dmg", "command",
        "js", "jse", "wsf", "wsh", "vbe", "reg", "url", "msix", "msp", "appx", "appinstaller", "iso", "img", "vhd", "vhdx",
        "terminal", "webloc", "inetloc", "fileloc", "workflow", "action", "sh", "scpt",
    ]
    /// Pictures a note draws in place; everything else is a card (SVG and HTML never run).
    static let pictures: Set<String> = ["image/png", "image/jpeg", "image/gif", "image/webp"]

    static func hex(_ d: Data) -> String { SHA256.hash(data: d).map { String(format: "%02x", $0) }.joined() }

    static func validBlockId(_ s: String) -> Bool { !s.isEmpty && s.count <= 64 && s.utf8.allSatisfy { ($0 >= 48 && $0 <= 57) || ($0 >= 65 && $0 <= 90) || ($0 >= 97 && $0 <= 122) || $0 == 45 || $0 == 95 } }

    static func validSha(_ s: String) -> Bool { s.count == 64 && s.utf8.allSatisfy { ($0 >= 48 && $0 <= 57) || ($0 >= 97 && $0 <= 102) } }

    /// What the first bytes say: a Windows program (MZ), a Mac one (Mach-O, fat) or a script that asks to run (#!).
    static func looksLikeProgram(_ d: Data) -> Bool {
        let b = [UInt8](d.prefix(4))
        if b.count >= 2, b[0] == 0x4d, b[1] == 0x5a { return true }
        if b.count >= 2, b[0] == 0x23, b[1] == 0x21 { return true } // "#!": a script that asks to run
        if b.count == 4 {
            let w = UInt32(b[0]) << 24 | UInt32(b[1]) << 16 | UInt32(b[2]) << 8 | UInt32(b[3])
            return [0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe, 0xcafebabe, 0xbebafeca].contains(w)
        }
        return false
    }

    /// The picture type the bytes are, nil for anything else.
    static func pictureType(_ d: Data) -> String? {
        let b = [UInt8](d.prefix(12))
        if b.count >= 8, b[0] == 0x89, b[1] == 0x50, b[2] == 0x4e, b[3] == 0x47 { return "image/png" }
        if b.count >= 3, b[0] == 0xff, b[1] == 0xd8, b[2] == 0xff { return "image/jpeg" }
        if b.count >= 4, b[0] == 0x47, b[1] == 0x49, b[2] == 0x46, b[3] == 0x38 { return "image/gif" }
        if b.count >= 12, b[0] == 0x52, b[1] == 0x49, b[2] == 0x46, b[3] == 0x46, b[8] == 0x57, b[9] == 0x45, b[10] == 0x42, b[11] == 0x50 { return "image/webp" }
        return nil
    }

    /// A name safe to show and to save under (the server's rules: NFC, no control or direction characters, no / \ :, no leading dot).
    static func cleanName(_ raw: String) -> String {
        var n = raw.precomposedStringWithCanonicalMapping
        let bad = CharacterSet(charactersIn: "/\\:*?\"<>|")
        n = String(String.UnicodeScalarView(n.unicodeScalars.filter { s in
            let v = s.value
            if v < 0x20 || (0x7f...0x9f).contains(v) || (0x200b...0x200f).contains(v) || (0x202a...0x202e).contains(v) || (0x2066...0x2069).contains(v) || v == 0xfeff { return false }
            return true
        }.map { bad.contains($0) ? "_" : $0 }.reduce(into: String.UnicodeScalarView()) { $0.append($1) }))
        n = n.trimmingCharacters(in: .whitespaces)
        while n.hasPrefix(".") { n.removeFirst() }
        while n.hasSuffix(".") || n.hasSuffix(" ") { n.removeLast() }
        if n.isEmpty { n = "file" }
        if n.count > 120 {
            let ext = (n as NSString).pathExtension
            let tail = ext.isEmpty || ext.count > 11 ? "" : "." + ext
            n = String(n.prefix(120 - tail.count)) + tail
        }
        return n
    }

    static func ext(_ name: String) -> String { (name as NSString).pathExtension.lowercased() }

    /// Keeps `data` (a file the user added) and says what it is: `{ sha, name, size, mime }`, or `{ error }`.
    static func add(_ data: Data, name raw: String, mime given: String?, store: NotesStore) -> [String: Any] {
        let name = cleanName(raw)
        if data.isEmpty { return ["error": "empty"] }
        if data.count > maxFile { return ["error": "too_big"] }
        if blocked.contains(ext(name)) || looksLikeProgram(data) { return ["error": "blocked_type"] }
        var mime = (given ?? "").lowercased()
        if mime.isEmpty || mime == "application/octet-stream" { mime = UTType(filenameExtension: ext(name))?.preferredMIMEType ?? "application/octet-stream" }
        // A picture is drawn only when its bytes are one (a name or a type can say anything).
        if pictures.contains(mime) || mime.hasPrefix("image/") { mime = pictureType(data) ?? (mime == "image/svg+xml" ? mime : "application/octet-stream") }
        let sha = hex(data)
        guard store.putFile(data, sha: sha) else { return ["error": "disk"] }
        return ["sha": sha, "name": name, "size": data.count, "mime": mime]
    }

    /// The shas the notes' blocks name (a file block's `f.sha`), for the sweep after a save.
    static func referenced(in notes: [[String: Any]]) -> Set<String> {
        var out = Set<String>()
        for n in notes {
            for b in (n["blocks"] as? [[String: Any]]) ?? [] {
                if let f = b["f"] as? [String: Any], let s = f["sha"] as? String { out.insert(s) }
            }
        }
        return out
    }

    /// Called on the main thread by the notes' bridges.
    static func handle(_ type: String, _ body: [String: Any], store: NotesStore, reply: @escaping @MainActor (Any?) -> Void) {
        nonisolated(unsafe) let reply = reply
        func done(_ v: Any?) { nonisolated(unsafe) let v = v; DispatchQueue.main.async { MainActor.assumeIsolated { reply(v) } } }
        switch type {
        case "attPick":
            let panel = MainActor.assumeIsolated { NSOpenPanel() }
            MainActor.assumeIsolated {
            panel.allowsMultipleSelection = true
            panel.canChooseDirectories = false
            panel.message = "Choose files to add to the note"
            panel.prompt = "Add"
            panel.begin { result in
                guard result == .OK else { return reply(["files": [Any](), "errors": [Any]()]) }
                let urls = panel.urls
                store.queue.async {
                    var files: [[String: Any]] = [], errors: [String] = []
                    for u in urls.prefix(10) {
                        // The size is looked at before the file is read: a huge file isn't pulled into memory to be refused.
                        let size = (try? u.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
                        if size > maxFile { errors.append("too_big"); continue }
                        guard let d = try? Data(contentsOf: u) else { errors.append("read"); continue }
                        let r = add(d, name: u.lastPathComponent, mime: nil, store: store)
                        if let e = r["error"] as? String { errors.append(e) } else { files.append(r) }
                    }
                    let out = (files, errors)
                    DispatchQueue.main.async { MainActor.assumeIsolated { reply(["files": out.0, "errors": out.1]) } }
                }
            }
            }
        case "attAdd":
            guard let b64 = body["b64"] as? String, b64.count <= 28_000_000, let d = Data(base64Encoded: b64) else { return done(["error": "read"]) }
            let name = (body["name"] as? String) ?? "file", mime = body["mime"] as? String
            store.queue.async { done(add(d, name: name, mime: mime, store: store)) }
        case "attHas":
            let shas = (body["shas"] as? [String] ?? []).filter(validSha).prefix(500)
            store.queue.async { done(["have": shas.filter { store.hasFile($0) }]) }
        case "attRead":
            guard let sha = body["sha"] as? String, validSha(sha) else { return done(["error": "bad_request"]) }
            store.queue.async {
                guard let d = store.getFile(sha: sha) else { return done(["error": "missing"]) }
                done(["b64": d.base64EncodedString()])
            }
        case "attSave":
            guard let sha = body["sha"] as? String, validSha(sha) else { return done(["error": "bad_request"]) }
            // The name comes from a block (any member can write it): a name that is a program's or a script's gets ".txt" after it,
            // so what is saved can't be one the system would run when it's opened.
            var name = cleanName((body["name"] as? String) ?? "file")
            if blocked.contains(ext(name)) { name += ".txt" }
            let saveName = name
            store.queue.async {
                guard let d = store.getFile(sha: sha) else { return done(["error": "missing"]) }
                done(save(d, name: saveName))
            }
        case "attAdds":
            // The blocks added on this Mac that haven't gone up yet, kept here (the dashboard and the note windows are pages with
            // storage of their own; a list in each would lose entries).
            let add = (body["add"] as? [String] ?? []).filter(validBlockId), remove = (body["remove"] as? [String] ?? []).filter(validBlockId)
            store.queue.async { done(["ids": store.pendingAdds(add: add, remove: remove)]) }
        case "attForget":
            let shas = (body["shas"] as? [String] ?? []).filter(validSha)
            store.queue.async { store.removeFiles(shas); done(["ok": true]) }
        case "attUpload":
            guard let note = body["note"] as? String, let sha = body["sha"] as? String, validSha(sha), UUID(uuidString: note) != nil else { return done(["error": "bad_request"]) }
            let name = cleanName((body["name"] as? String) ?? "file"), mime = (body["mime"] as? String) ?? "application/octet-stream"
            Task { @MainActor in
                let data: Data? = await withCheckedContinuation { c in store.queue.async { c.resume(returning: store.getFile(sha: sha)) } }
                guard let data else { return reply(["error": "missing"]) }
                reply(await upload(data, sha: sha, note: note.lowercased(), name: name, mime: mime))
            }
        case "attDownload":
            guard let att = body["att"] as? String, UUID(uuidString: att) != nil else { return done(["error": "bad_request"]) }
            Task { @MainActor in
                let r = await download(att.lowercased())
                guard let (data, sha) = r.data else { return reply(["error": r.error ?? "offline"]) }
                let served = r.name
                let stored: Bool = await withCheckedContinuation { c in store.queue.async { c.resume(returning: store.putFile(data, sha: sha)) } }
                reply(stored ? ["ok": true, "sha": sha, "name": served ?? ""] : ["error": "disk"])
            }
        case "attRemove":
            guard let att = body["att"] as? String, UUID(uuidString: att) != nil else { return done(["error": "bad_request"]) }
            Task { @MainActor in
                // `restore`: a block is back in the note (the uploader's app asks to bring its file back).
                let restore = body["restore"] as? Bool == true
                let r = restore ? await Cloud.shared.social("POST", "v1/attachments/\(att.lowercased())/restore", body: [:])
                                : await Cloud.shared.social("DELETE", "v1/attachments/\(att.lowercased())", body: nil)
                reply((r as? [String: Any])?["error"] == nil ? ["ok": true] : r)
            }
        default:
            done(["error": "unknown request"])
        }
    }

    // MARK: to and from the server's storage

    /// Downloads waiting for one of two places, in order.
    @MainActor
    final class Slots {
        private var free: Int
        private var waiting: [CheckedContinuation<Void, Never>] = []
        init(_ n: Int) { free = n }
        func acquire() async {
            if free > 0 { free -= 1; return }
            await withCheckedContinuation { waiting.append($0) }
        }
        func release() {
            if waiting.isEmpty { free += 1 } else { waiting.removeFirst().resume() }
        }
    }
    @MainActor static let downloadSlot = Slots(2)

    /// A session that keeps nothing on disk, for the transfers (their addresses are signed and short-lived).
    private static let session: URLSession = {
        let c = URLSessionConfiguration.ephemeral
        c.urlCache = nil
        c.timeoutIntervalForRequest = 60
        c.timeoutIntervalForResource = 300
        return URLSession(configuration: c)
    }()

    /// Adds `data` to a shared note: the API checks and signs, the bytes go straight to the storage with the headers it signed,
    /// the API looks at what arrived. `{ att }` (the attachment's id) or `{ error }` (the API's code, "offline", "put_<status>").
    @MainActor
    static func upload(_ data: Data, sha: String, note: String, name: String, mime: String) async -> [String: Any] {
        guard hex(data) == sha else { return ["error": "changed"] }
        let made = await Cloud.shared.social("POST", "v1/notes/\(note)/attachments", body: ["name": name, "size": data.count, "mime": mime, "sha256": sha])
        guard let m = made as? [String: Any] else { return ["error": "offline"] }
        if let e = m["error"] as? String { return ["error": e] }
        // The same file is already in this note (a retry, the same file in two blocks): nothing to send.
        if m["done"] as? Bool == true, let id = m["id"] as? String { return ["att": id] }
        guard let id = m["id"] as? String, let s = m["url"] as? String, let url = URL(string: s), let headers = m["headers"] as? [String: String] else { return ["error": "bad_answer"] }
        var req = URLRequest(url: url)
        req.httpMethod = "PUT"
        for (k, v) in headers where k.lowercased() != "content-length" { req.setValue(v, forHTTPHeaderField: k) }
        do {
            let (_, response) = try await session.upload(for: req, from: data)
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            guard (200..<300).contains(status) else { return ["error": "put_\(status)"] }
        } catch { return ["error": "offline"] }
        let finished = await Cloud.shared.social("POST", "v1/attachments/\(id)/done", body: [:])
        if let e = (finished as? [String: Any])?["error"] as? String { return ["error": e] }
        return ["att": id]
    }

    /// A file of a shared note, streamed by the API (it counts the bytes against the account's day) and checked here against the size
    /// and the SHA-256 the API says it has. `data` is the bytes and their sha, `name` the server's name for it, or `error`.
    @MainActor
    static func download(_ att: String) async -> (data: (Data, String)?, name: String?, error: String?) {
        // At most two at a time on this Mac (the API lets an account stream two), one after the other in the order asked: a note full of
        // pictures doesn't ask for them all at once. If the API still says it's busy (another computer of the account), wait as it says
        // and ask again; busy is never shown as an error.
        await downloadSlot.acquire()
        defer { downloadSlot.release() }
        var got = await Cloud.shared.fileData("v1/attachments/\(att)/file")
        var tries = 0
        while got.error == "too_many_downloads", tries < 40 {
            tries += 1
            let wait = min(10, max(1, Double(got.headers["retry-after"] ?? "") ?? 3))
            try? await Task.sleep(nanoseconds: UInt64(wait * 1_000_000_000))
            got = await Cloud.shared.fileData("v1/attachments/\(att)/file")
        }
        guard let data = got.data else { return (nil, nil, got.error ?? "offline") }
        guard let sha = got.headers["x-attachment-sha256"], validSha(sha), let size = Int(got.headers["x-attachment-size"] ?? ""), size <= maxFile else { return (nil, nil, "bad_answer") }
        guard data.count == size, hex(data) == sha else { return (nil, nil, "damaged") }
        if looksLikeProgram(data) { return (nil, nil, "blocked_type") }
        let name = got.headers["x-attachment-name"]?.removingPercentEncoding.map(cleanName)
        return ((data, sha), name, nil)
    }

    // MARK: saving a file out

    /// Writes the file to Downloads under its name (never over another file) with the system's download mark, so the system warns
    /// before it's opened, and shows it in Finder. Nothing is opened.
    static func save(_ data: Data, name: String) -> [String: Any] {
        let fm = FileManager.default
        guard let dir = fm.urls(for: .downloadsDirectory, in: .userDomainMask).first else { return ["error": "disk"] }
        let base = (name as NSString).deletingPathExtension, ext = (name as NSString).pathExtension
        var target = dir.appendingPathComponent(name), n = 1
        while fm.fileExists(atPath: target.path) {
            n += 1
            target = dir.appendingPathComponent(ext.isEmpty ? "\(base) \(n)" : "\(base) \(n).\(ext)")
        }
        do {
            try data.write(to: target, options: [.withoutOverwriting])
            var values = URLResourceValues()
            values.quarantineProperties = ["LSQuarantineType": "LSQuarantineTypeOtherDownload", "LSQuarantineAgentName": "Orbiterm"]
            var u = target
            try? u.setResourceValues(values)
        } catch { return ["error": "disk"] }
        DispatchQueue.main.async { NSWorkspace.shared.activateFileViewerSelecting([target]) }
        return ["ok": true, "name": target.lastPathComponent]
    }
}

// MARK: the folder of files

extension NotesStore {
    static let fileHeader = Data("file".utf8) + Data([1])
    private var filesDir: URL { dir.appendingPathComponent("files") }
    private func fileURL(_ sha: String) -> URL { filesDir.appendingPathComponent(sha) }
    private func fileAAD(_ sha: String) -> Data { Self.fileHeader + Data(("file:" + sha).utf8) }

    func hasFile(_ sha: String) -> Bool { FileManager.default.fileExists(atPath: fileURL(sha).path) }

    /// Keeps a file, encrypted, under its SHA-256. False when it couldn't be kept.
    func putFile(_ data: Data, sha: String) -> Bool {
        guard Attachments.validSha(sha), let key = try? theKey(create: true) else { return false }
        if hasFile(sha) { try? FileManager.default.setAttributes([.modificationDate: Date()], ofItemAtPath: fileURL(sha).path); return true }
        do {
            try FileManager.default.createDirectory(at: filesDir, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
            let box = try AES.GCM.seal(data, using: key, authenticating: fileAAD(sha))
            guard let combined = box.combined else { return false }
            try (Self.fileHeader + combined).write(to: fileURL(sha), options: [.atomic])
            try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: fileURL(sha).path)
            return true
        } catch { return false }
    }

    /// A file's bytes, nil when it isn't here, doesn't open, or isn't what its name says.
    func getFile(sha: String) -> Data? {
        guard Attachments.validSha(sha), let file = try? Data(contentsOf: fileURL(sha)), let key = try? theKey(create: false),
              file.count >= Self.fileHeader.count + 28, file.prefix(Self.fileHeader.count) == Self.fileHeader,
              let box = try? AES.GCM.SealedBox(combined: Data(file.dropFirst(Self.fileHeader.count))),
              let plain = try? AES.GCM.open(box, using: key, authenticating: fileAAD(sha)), Attachments.hex(plain) == sha else { return nil }
        return plain
    }

    /// The ids of file blocks added on this Mac and not yet uploaded, in the order added (newest last, 2000 at most), changed by `add`
    /// and `remove` and returned. A plain file of ids in the files folder; only this queue touches it.
    func pendingAdds(add: [String], remove: [String]) -> [String] {
        let url = filesDir.appendingPathComponent("_adds.json")
        var ids = ((try? Data(contentsOf: url)).flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [String]) ?? []
        if add.isEmpty && remove.isEmpty { return ids }
        ids.removeAll { remove.contains($0) || add.contains($0) }
        ids += add
        if ids.count > 2000 { ids.removeFirst(ids.count - 2000) }
        try? FileManager.default.createDirectory(at: filesDir, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
        if let d = try? JSONSerialization.data(withJSONObject: ids) { try? d.write(to: url, options: [.atomic]) }
        return ids
    }

    func removeFiles(_ shas: [String]) {
        for s in shas where Attachments.validSha(s) { try? FileManager.default.removeItem(at: fileURL(s)) }
    }

    /// Files no block names go, once they are 10 minutes old (a block just added may not have been saved yet).
    func sweepFiles(keeping shas: Set<String>) {
        let fm = FileManager.default
        for f in (try? fm.contentsOfDirectory(atPath: filesDir.path)) ?? [] where Attachments.validSha(f) && !shas.contains(f) {
            let at = try? fm.attributesOfItem(atPath: fileURL(f).path)[.modificationDate] as? Date
            if let at, Date().timeIntervalSince(at) > 600 { try? fm.removeItem(at: fileURL(f)) }
        }
    }
}
