import CryptoKit
import Foundation
import WebKit

/// The dashboard's notes (web/notes.js), kept in the app's folder on this Mac: a file for each note, and one for their
/// order and the note pinned to the dashboard. Every file is encrypted (AES-GCM with a 256-bit key) and bound to its
/// name, so a file copied over another doesn't open either; the key is made on this Mac and kept in a file of the
/// app's own that only this user can read (KeyFile).
final class NotesStore {
    static let shared = NotesStore(dir: NotesStore.folder) { try NotesKey.get(create: $0) }

    /// Application Support/atalay-terminal/Notes, the staging build's apart (its key is another).
    static var folder: URL {
        let staging = Bundle.main.bundleIdentifier?.hasSuffix(".staging") == true
        return (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: HOME + "/Library/Application Support"))
            .appendingPathComponent(staging ? "atalay-terminal/Notes (staging)" : "atalay-terminal/Notes")
    }

    enum Failure: Error, CustomStringConvertible {
        /// There are notes, and no key to read them.
        case keyMissing
        /// The key's file isn't a key, or a new one couldn't be written.
        case keyFile
        case notANote(String)
        case badRequest

        var description: String {
            switch self {
            case .keyMissing: return "the notes' key is missing"
            case .keyFile: return "the notes' key couldn't be read or saved"
            case .notANote(let name): return "\(name) isn't a note"
            case .badRequest: return "bad request"
            }
        }
    }

    /// What a file starts with: that it's a note, and the version of how it's laid out.
    static let header = Data("note".utf8) + Data([1])
    /// The file of the notes' order and the pinned one: a name no note has (theirs are letters, digits and dashes).
    static let indexName = "_index"

    /// False for a run with no app bundle (`./dev.sh`).
    static var runsAsApp = Bundle.main.bundleIdentifier != nil

    let dir: URL
    /// Reads and writes, one at a time.
    let queue = DispatchQueue(label: "notes.store", qos: .userInitiated)
    private let makeKey: (_ create: Bool) throws -> SymmetricKey
    private var key: SymmetricKey?
    /// Each file's content as read or written here: a note is written again only when it changed, and only a file read
    /// or written here is ever deleted (one that couldn't be read stays as it is).
    private var known: [String: Data] = [:]

    init(dir: URL, key: @escaping (_ create: Bool) throws -> SymmetricKey) {
        self.dir = dir
        makeKey = key
    }

    static func validName(_ name: String) -> Bool {
        !name.isEmpty && name.count <= 100 && name.unicodeScalars.allSatisfy { $0.isASCII && (CharacterSet.alphanumerics.contains($0) || $0 == "-") }
    }

    private func url(_ name: String) -> URL { dir.appendingPathComponent(name + ".note") }

    private func stored() -> [String] {
        ((try? FileManager.default.contentsOfDirectory(atPath: dir.path)) ?? []).filter { $0.hasSuffix(".note") }.map { String($0.dropLast(5)) }
    }

    /// The key, made the first time only while there's no note it would have to read.
    func theKey(create: Bool) throws -> SymmetricKey {
        if let key { return key }
        let made = try makeKey(create && stored().isEmpty)
        key = made
        return made
    }

    static func seal(_ plain: Data, as name: String, with key: SymmetricKey) throws -> Data {
        let box = try AES.GCM.seal(plain, using: key, authenticating: header + Data(name.utf8))
        guard let combined = box.combined else { throw Failure.notANote(name) }
        return header + combined
    }

    static func open(_ file: Data, as name: String, with key: SymmetricKey) throws -> Data {
        guard file.count >= header.count + 28, file.prefix(header.count) == header else { throw Failure.notANote(name) }
        let box = try AES.GCM.SealedBox(combined: Data(file.dropFirst(header.count)))
        return try AES.GCM.open(box, using: key, authenticating: header + Data(name.utf8))
    }

    /// Every note, in their order, as the page keeps them ({ v, ordered, pinned, current, notes }, JSON); nil when there
    /// are none yet.
    func load() throws -> String? {
        let names = stored()
        guard !names.isEmpty else { return nil }
        let key = try theKey(create: false)
        var index: [String: Any] = [:]
        var notes: [String: [String: Any]] = [:]
        for name in names where name == Self.indexName || Self.validName(name) {
            guard let file = try? Data(contentsOf: url(name)), let plain = try? Self.open(file, as: name, with: key),
                  let object = (try? JSONSerialization.jsonObject(with: plain)) as? [String: Any] else { continue }
            known[name] = plain
            if name == Self.indexName {
                index = object
            } else if object["id"] as? String == name {
                notes[name] = object
            }
        }
        let order = (index["order"] as? [String] ?? []).filter { notes[$0] != nil }
        let changed = { (id: String) in (notes[id]?["at"] as? Double) ?? 0 }
        let rest = notes.keys.filter { !order.contains($0) }.sorted { changed($0) > changed($1) }
        // The layout the files are in: 4 gives every block an id of its own (the page makes the notes that, once). Before the first
        // note is changed to it, the folder is copied as it is (backUpV3); if that can't be done the page is told, and changes nothing.
        let version = index["v"] as? Int ?? 3
        var pad: [String: Any] = ["v": version, "ordered": index["ordered"] as? Bool ?? false, "notes": (order + rest).compactMap { notes[$0] }]
        // `backedUp`: the page may change the notes to v4 only when this says the folder was copied first. Not from a run with
        // no app bundle (`./dev.sh`): it reads the real notes, and changes nothing.
        pad["backedUp"] = version >= 4 || (Self.runsAsApp && backUpV3())
        if let pinned = index["pinned"] as? String { pad["pinned"] = pinned }
        if let current = index["current"] as? String { pad["current"] = current }
        return String(data: try JSONSerialization.data(withJSONObject: pad), encoding: .utf8)
    }

    /// Where the backups of the notes go: next to their folder, "Notes backups" (the staging build's: "Notes (staging) backups").
    var backups: URL { dir.deletingLastPathComponent().appendingPathComponent(dir.lastPathComponent + " backups") }

    /// The folder of notes copied as it is, files still encrypted and opened by the same key, to "<backups>/<date time> v3": putting
    /// it back in place is all it takes to go back. Done again whenever the notes are still v3 and one changed since the last
    /// copy (a downgrade and a new upgrade, say); nothing is written to the notes themselves. False when no copy is there.
    private func backUpV3() -> Bool {
        let fm = FileManager.default
        let newest = stored().compactMap { try? fm.attributesOfItem(atPath: url($0).path)[.modificationDate] as? Date }.max() ?? .distantPast
        if let have = try? fm.contentsOfDirectory(atPath: backups.path) {
            let last = have.filter { $0.hasSuffix(" v3") }.compactMap { try? fm.attributesOfItem(atPath: backups.appendingPathComponent($0).path)[.modificationDate] as? Date }.max()
            if let last, newest <= last { return true }
        }
        let partial = backups.appendingPathComponent(".partial-" + UUID().uuidString)
        do {
            try fm.createDirectory(at: backups, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
            let day = DateFormatter()
            day.locale = Locale(identifier: "en_US_POSIX")
            day.dateFormat = "yyyy-MM-dd HH-mm-ss"
            // Copied under another name and renamed when whole: a copy cut short isn't taken for the backup.
            try fm.copyItem(at: dir, to: partial)
            try fm.setAttributes([.modificationDate: Date()], ofItemAtPath: partial.path)
            try fm.moveItem(at: partial, to: backups.appendingPathComponent("\(day.string(from: Date())) v3"))
            return true
        } catch {
            try? fm.removeItem(at: partial)
            return false
        }
    }

    /// The notes as the page has them now (JSON): each that changed written again, each no longer there deleted.
    func save(_ json: String) throws {
        guard let pad = (try? JSONSerialization.jsonObject(with: Data(json.utf8))) as? [String: Any],
              let list = pad["notes"] as? [[String: Any]] else { throw Failure.badRequest }
        let key = try theKey(create: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
        var order: [String] = []
        for note in list {
            guard let id = note["id"] as? String, Self.validName(id), !order.contains(id) else { continue }
            order.append(id)
            try write(note, as: id, with: key)
        }
        var index: [String: Any] = ["v": pad["v"] as? Int ?? 3, "ordered": pad["ordered"] as? Bool ?? true, "order": order]
        if let pinned = pad["pinned"] as? String { index["pinned"] = pinned }
        if let current = pad["current"] as? String { index["current"] = current }
        try write(index, as: Self.indexName, with: key)
        sweepY(keeping: Set(order))
        // The files the notes hold (Attachments.swift): the ones no note names any more go (after a grace, for a block not yet saved).
        if !order.isEmpty { sweepFiles(keeping: Attachments.referenced(in: list)) }
        let keep = Set(order + [Self.indexName])
        for name in known.keys where !keep.contains(name) {
            try? FileManager.default.removeItem(at: url(name))
            known[name] = nil
        }
    }

    /// The notes AI may not see, from the files' own content as read or written here (what the page last saved): the native
    /// side asks this on every tool call and doesn't take the page's word for it. Two kinds: a note the user hid (the eye),
    /// and a shared note whose owner hasn't let AI read it (`shared.ai` isn't true: the default, whoever's computer this is).
    func hiddenIDs() -> Set<String> {
        queue.sync {
            var out = Set<String>()
            let mark = Data("\"aiHidden\":true".utf8), shared = Data("\"shared\":".utf8)
            for (name, plain) in known where name != Self.indexName && (plain.range(of: mark) != nil || plain.range(of: shared) != nil) {
                guard let o = (try? JSONSerialization.jsonObject(with: plain)) as? [String: Any] else { continue }
                if o["aiHidden"] as? Bool == true { out.insert(name) }
                else if let s = o["shared"] as? [String: Any], s["ai"] as? Bool != true { out.insert(name) }
            }
            return out
        }
    }

    // MARK: a shared note's document

    /// A shared note's Yjs document (what makes edits made offline merge when the line is back) is kept beside its note, "<id>.ydoc",
    /// encrypted with the same key and bound to its name. Only the page that holds the note live writes it; no private note has one.
    static let yHeader = Data("ydoc".utf8) + Data([1])
    private func yURL(_ id: String) -> URL { dir.appendingPathComponent(id + ".ydoc") }

    func loadY(_ id: String) throws -> Data? {
        guard Self.validName(id), let file = try? Data(contentsOf: yURL(id)) else { return nil }
        let key = try theKey(create: false)
        guard file.count >= Self.yHeader.count + 28, file.prefix(Self.yHeader.count) == Self.yHeader else { return nil }
        let box = try AES.GCM.SealedBox(combined: Data(file.dropFirst(Self.yHeader.count)))
        return try? AES.GCM.open(box, using: key, authenticating: Self.yHeader + Data((id + ".ydoc").utf8))
    }

    /// nil deletes it.
    func saveY(_ id: String, _ data: Data?) throws {
        guard Self.validName(id) else { throw Failure.badRequest }
        guard let data else { try? FileManager.default.removeItem(at: yURL(id)); return }
        let key = try theKey(create: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
        let box = try AES.GCM.seal(data, using: key, authenticating: Self.yHeader + Data((id + ".ydoc").utf8))
        guard let combined = box.combined else { throw Failure.badRequest }
        try (Self.yHeader + combined).write(to: yURL(id), options: [.atomic])
        try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: yURL(id).path)
    }

    /// The documents of notes that are gone (removed from the shared note, deleted): nothing of them stays.
    private func sweepY(keeping ids: Set<String>) {
        for f in (try? FileManager.default.contentsOfDirectory(atPath: dir.path)) ?? [] where f.hasSuffix(".ydoc") {
            if !ids.contains(String(f.dropLast(5))) { try? FileManager.default.removeItem(at: dir.appendingPathComponent(f)) }
        }
    }

    private func write(_ object: [String: Any], as name: String, with key: SymmetricKey) throws {
        let plain = try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
        guard known[name] != plain else { return }
        let file = url(name)
        try Self.seal(plain, as: name, with: key).write(to: file, options: [.atomic])
        try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: file.path)
        known[name] = plain
    }
}

/// The notes' key: 32 random bytes in a file of the app's own (KeyFile), the staging build's apart.
enum NotesKey {
    static var name: String { Bundle.main.bundleIdentifier?.hasSuffix(".staging") == true ? "notes-staging" : "notes" }

    static func get(create: Bool) throws -> SymmetricKey { try get(name: name, create: create) }

    static func get(name: String, create: Bool) throws -> SymmetricKey {
        if let data = KeyFile.load(name) {
            // A file that isn't a key is left as it is: a new key in its place would open none of the notes.
            guard data.count == 32 else { throw NotesStore.Failure.keyFile }
            return SymmetricKey(data: data)
        }
        guard create else { throw NotesStore.Failure.keyMissing }
        let key = SymmetricKey(size: .bits256)
        if KeyFile.save(name, key.withUnsafeBytes { Data($0) }, fresh: true) { return key }
        // Made at the same moment elsewhere: that one is the key.
        if KeyFile.load(name) != nil { return try get(name: name, create: false) }
        throw NotesStore.Failure.keyFile
    }
}

/// The dashboard's notes (web/notes.js) to and from NotesStore: { type: "load" } answers { json } (null with no notes
/// yet), { type: "save", json } answers { ok }; either answers { error } when it can't.
final class NotesBridge: NSObject, WKScriptMessageHandlerWithReply {
    private let store: NotesStore

    init(store: NotesStore = .shared) { self.store = store }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        let body = message.body as? [String: Any] ?? [:]
        let type = body["type"] as? String, json = body["json"] as? String
        let store = self.store
        if NotesSync.handle(type, body, store: store, allow: { _ in true }, reply: { answer in replyHandler(answer, nil) }) { return }
        // The projects the board's "move to project" offers: the folders the live sessions are in, and which of the folders the
        // notes are linked to (`dirs`) are gone. Git is asked off the main thread.
        if type == "projects" {
            let known = (body["dirs"] as? [String] ?? []).filter { $0.count < 1024 }.prefix(200)
            DispatchQueue.global(qos: .userInitiated).async {
                let found = NotesProjects.choices(known: Array(known))
                DispatchQueue.main.async { MainActor.assumeIsolated { replyHandler(["list": found.list, "gone": found.gone], nil) } }
            }
            return
        }
        store.queue.async {
            var answer: [String: Any]
            do {
                switch type {
                case "load": answer = ["json": try store.load() ?? NSNull()]
                case "save":
                    guard let json else { throw NotesStore.Failure.badRequest }
                    try store.save(json)
                    answer = ["ok": true]
                default: answer = ["error": "unknown request"]
                }
            } catch {
                answer = ["error": String(describing: error)]
            }
            let reply = answer
            DispatchQueue.main.async { MainActor.assumeIsolated { replyHandler(reply, nil) } }
        }
    }
}

/// The shared notes' side of the notes bridges (the dashboard's `notes` and a note window's `noteWindow`): a ticket for a note's
/// live socket (the page opens it; this side only makes the ticket and the address), its document file, and whether a note holds
/// a password or key before it's shared. Answers true when `type` is one of these.
enum NotesSync {
    static func handle(_ type: String?, _ body: [String: Any], store: NotesStore, allow: @escaping (String) -> Bool,
                       reply: @escaping @MainActor (Any?) -> Void) -> Bool {
        let id = (body["id"] as? String) ?? ""
        switch type {
        case "syncCaps":
            DispatchQueue.main.async { MainActor.assumeIsolated { reply(["share": true, "files": true]) } }
        case "syncTicket":
            guard allow(id) else { DispatchQueue.main.async { MainActor.assumeIsolated { reply(["error": "refused"]) } }; return true }
            Task { @MainActor in reply(await Cloud.shared.notesTicket(id: id)) }
        case "saveY", "loadY":
            guard allow(id), NotesStore.validName(id) else { DispatchQueue.main.async { MainActor.assumeIsolated { reply(["error": "refused"]) } }; return true }
            let b64 = body["b64"] as? String
            store.queue.async {
                var answer: [String: Any] = [:]
                do {
                    if type == "loadY" {
                        if let d = try store.loadY(id) { answer["b64"] = d.base64EncodedString() }
                    } else {
                        if let b64 { guard let d = Data(base64Encoded: b64), d.count <= 4_000_000 else { throw NotesStore.Failure.badRequest }; try store.saveY(id, d) }
                        else { try store.saveY(id, nil) }
                        answer["ok"] = true
                    }
                } catch { answer = ["error": String(describing: error)] }
                let out = answer
                DispatchQueue.main.async { MainActor.assumeIsolated { reply(out) } }
            }
        case "attPick", "attAdd", "attHas", "attRead", "attSave", "attUpload", "attDownload", "attRemove", "attForget", "attAdds":
            // Files in notes (Attachments.swift): only the page's own notes' files, kept on this Mac (what goes to the server goes from here).
            let note = (body["note"] as? String) ?? ""
            if type == "attUpload" && !allow(note) { DispatchQueue.main.async { MainActor.assumeIsolated { reply(["error": "refused"]) } }; return true }
            Attachments.handle(type ?? "", body, store: store, reply: reply)
        case "secretCheck":
            // Only yes or no goes back: the same patterns that mask what AI is shown (redactMore).
            let text = (body["text"] as? String) ?? ""
            let risky = redactMore(text) != text
            DispatchQueue.main.async { MainActor.assumeIsolated { reply(["risky": risky]) } }
        default:
            return false
        }
        return true
    }
}
