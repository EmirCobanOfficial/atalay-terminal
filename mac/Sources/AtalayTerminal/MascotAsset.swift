import CryptoKit
import Foundation
import WebKit

/// Viktoria is not in the app: her model, clips and motions are ONE obfuscated pak (ai-character/pack-viktoria.py) that
/// the app downloads the first time the user asks for her (the repo is public and the licenses forbid raw files in it).
/// The file lives in Application Support/atalay-terminal/viktoria/viktoria.pak; without it no panel is made.
@MainActor
final class MascotAsset {
    static let shared = MascotAsset()
    /// Posted on every state change (progress included, at most 4 times a second); pages follow it (Mascot.pushAssetToPage).
    static let changed = Notification.Name("MascotAsset.changed")

    enum State: Equatable {
        case none
        case downloading(got: Int64, total: Int64)
        case failed(String)
        case ready
    }

    private static let shaKey = "viktoriaPakSHA"
    private static let sizeKey = "viktoriaPakSize"

    private(set) var state: State = .none
    var isReady: Bool { state == .ready }

    /// Application Support/atalay-terminal/viktoria, the staging build's apart (removing one must not remove the other's).
    nonisolated static var folder: URL {
        let staging = Bundle.main.bundleIdentifier?.hasSuffix(".staging") == true
        return (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: HOME + "/Library/Application Support"))
            .appendingPathComponent(staging ? "atalay-terminal/viktoria (staging)" : "atalay-terminal/viktoria")
    }
    nonisolated static var pakURL: URL { folder.appendingPathComponent("viktoria.pak") }

    private var run: Task<Void, Never>?
    private var loader: Loader?
    /// Which download is the live one: a cancelled run that wakes late must not touch the next one's state or files.
    private var runID = 0
    /// The pak on disk is being hashed (once per launch); she isn't ready until it matches.
    private var verifying = false

    private init() {
        // Stray halves of a download that never finished.
        for f in (try? FileManager.default.contentsOfDirectory(atPath: Self.folder.path)) ?? [] where f.hasSuffix(".part") {
            try? FileManager.default.removeItem(at: Self.folder.appendingPathComponent(f))
        }
        let size = UserDefaults.standard.object(forKey: Self.sizeKey) as? Int
        let sha = UserDefaults.standard.string(forKey: Self.shaKey)
        guard let size, size > 0, let sha, FileManager.default.fileExists(atPath: Self.pakURL.path) else { return }
        checkPak(size: Int64(size), sha: sha, tries: 1)
    }

    /// A pak from an earlier run is hashed once, off the main thread, before she may come up: a changed or damaged file
    /// (gone, wrong size, wrong hash) is deleted and the user is offered the download again. A transient read error (the
    /// file locked or not readable for a moment) is not that: the file and the settings stay, she is just not ready yet,
    /// and the check is tried again a few seconds later (6 tries in all; after that, kept until the next launch).
    private static let verifyTries = 6
    private static let verifyWait: Duration = .seconds(5)
    /// The pending wait between two checks; get() and remove() cancel it.
    private var retry: Task<Void, Never>?

    private func checkPak(size: Int64, sha: String, tries: Int) {
        verifying = true
        Task { [weak self] in
            let r = await Task.detached { Self.check(Self.pakURL, size: size, sha: sha) }.value
            guard let self, self.verifying else { return }
            switch r {
            case .busy:
                guard tries < Self.verifyTries else { self.verifying = false; return } // not ready, but the pak is kept
                self.retry = Task { [weak self] in
                    try? await Task.sleep(for: Self.verifyWait)
                    guard let self, !Task.isCancelled, self.verifying else { return }
                    self.retry = nil
                    self.checkPak(size: size, sha: sha, tries: tries + 1)
                }
            case .ok:
                self.verifying = false
                self.set(.ready)
            case .bad:
                self.verifying = false
                self.discardPak()
                self.set(.failed("checksum"))
            }
        }
    }

    private func stopRetry() {
        retry?.cancel()
        retry = nil
    }

    /// The file can't be used (damaged, or the page couldn't read it): gone, and the user can try again.
    func discardPak() {
        try? FileManager.default.removeItem(at: Self.pakURL)
        UserDefaults.standard.removeObject(forKey: Self.shaKey)
        UserDefaults.standard.removeObject(forKey: Self.sizeKey)
    }

    /// The mascot page couldn't use the pak (mascot.js posts loadFailed): delete it, she goes down, Try again shows.
    /// Only if the file no longer matches: when it still does (the page failed for another reason, e.g. no GPU) she stays
    /// ready, just not drawn, and downloading again would change nothing.
    func loadFailed() {
        guard isReady, !verifying else { return }
        let size = UserDefaults.standard.object(forKey: Self.sizeKey) as? Int
        let sha = UserDefaults.standard.string(forKey: Self.shaKey)
        verifying = true
        Task { [weak self] in
            let ok: Bool
            if let size, let sha { ok = await Task.detached { Self.verify(Self.pakURL, size: Int64(size), sha: sha) }.value } else { ok = false }
            guard let self, self.verifying else { return }
            self.verifying = false
            guard self.isReady, !ok else { return }
            self.discardPak()
            self.set(.failed("unreadable"))
        }
    }

    /// The pak's bytes for the mascot page's `viktoria://pak`; nil unless she is ready.
    nonisolated static func bytes() -> Data? {
        try? Data(contentsOf: pakURL, options: .mappedIfSafe)
    }

    var json: String {
        let o: [String: Any]
        switch state {
        case .none: o = ["state": "none"]
        case .downloading(let got, let total): o = ["state": "downloading", "got": got, "total": total]
        case .failed(let why): o = ["state": "failed", "reason": why]
        case .ready: o = ["state": "ready"]
        }
        let data = (try? JSONSerialization.data(withJSONObject: o)) ?? Data("{\"state\":\"none\"}".utf8)
        return String(decoding: data, as: UTF8.self)
    }

    // MARK: - Actions (the pages send mascotGet, mascotCancel, mascotRemove)

    /// Asks the API where the pak is, downloads it, checks size and SHA-256, puts it in place, and turns her on.
    func get() {
        // The user asked while the launch check is only waiting to retry (the UI shows nothing downloaded): drop that
        // check; the download replaces the old file. A check that is reading the file right now is still waited for.
        if retry != nil {
            stopRetry()
            verifying = false
        }
        switch state {
        case .downloading, .ready: return
        case .none, .failed: break
        }
        if verifying { return }
        runID += 1
        let id = runID
        set(.downloading(got: 0, total: 0))
        run = Task { [weak self] in await self?.fetch(id) }
    }

    /// Stops a download in progress (back to nothing downloaded).
    func cancel() {
        guard case .downloading = state else { return }
        runID += 1
        run?.cancel()
        loader?.cancel()
        run = nil
        loader = nil
        set(.none)
    }

    /// Turns her off, deletes the file; nothing downloaded.
    func remove() {
        runID += 1
        verifying = false
        stopRetry()
        run?.cancel()
        loader?.cancel()
        run = nil
        loader = nil
        Mascot.storedEnabled = false // the panel goes first (refresh), then the file
        let wasReady = isReady
        state = .none
        try? FileManager.default.removeItem(at: Self.folder)
        UserDefaults.standard.removeObject(forKey: Self.shaKey)
        UserDefaults.standard.removeObject(forKey: Self.sizeKey)
        announce(readinessChanged: wasReady)
    }

    // MARK: - Download

    private struct Offer { let sha: String; let size: Int64; let url: URL }

    private func fetch(_ id: Int) async {
        // 1. Where is it? (the API's /v1/assets/viktoria, signed like its other calls)
        let answer = await Cloud.shared.publicGet("v1/assets/viktoria") // signed by the app, no device token needed
        guard id == runID else { return }
        guard let a = answer, a["error"] == nil,
              let sha = a["sha256"] as? String, sha.count == 64,
              let size = (a["size"] as? NSNumber)?.int64Value, size > 0,
              let s = a["url"] as? String, let url = URL(string: s), Self.allowed(url) else {
            return fail("no answer")
        }
        let offer = Offer(sha: sha.lowercased(), size: size, url: url)
        set(.downloading(got: 0, total: size))

        // 2. Download it into the folder (its own file, so the move afterwards is atomic).
        let dir = Self.folder
        do { try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true) } catch { return fail("disk") }
        let part = dir.appendingPathComponent("viktoria-\(UUID().uuidString).part") // its own name per run
        let l = Loader(total: size) { [weak self] got in
            Task { @MainActor in
                guard let self, id == self.runID, case .downloading = self.state else { return }
                self.set(.downloading(got: got, total: size))
            }
        }
        loader = l
        let error = await l.download(offer.url, to: part)
        if loader === l { loader = nil }
        guard id == runID else { try? FileManager.default.removeItem(at: part); return }
        if let error { try? FileManager.default.removeItem(at: part); return fail(error) }

        // 3. Size and SHA-256, off the main thread.
        let ok = await Task.detached { Self.verify(part, size: offer.size, sha: offer.sha) }.value
        guard id == runID else { try? FileManager.default.removeItem(at: part); return }
        guard ok else { try? FileManager.default.removeItem(at: part); return fail("checksum") }

        // 4. In place (any old pak is replaced), remembered, and she is switched on: the user asked for her.
        let dest = Self.pakURL
        do {
            if FileManager.default.fileExists(atPath: dest.path) {
                _ = try FileManager.default.replaceItemAt(dest, withItemAt: part)
            } else {
                try FileManager.default.moveItem(at: part, to: dest)
            }
        } catch { try? FileManager.default.removeItem(at: part); return fail("disk") }
        for f in (try? FileManager.default.contentsOfDirectory(atPath: dir.path)) ?? [] where f != "viktoria.pak" {
            try? FileManager.default.removeItem(at: dir.appendingPathComponent(f))
        }
        UserDefaults.standard.set(offer.sha, forKey: Self.shaKey)
        UserDefaults.standard.set(Int(offer.size), forKey: Self.sizeKey)
        run = nil
        Mascot.storedEnabled = true
        set(.ready)
    }

    /// https, or plain http to this Mac (a local test through the API's VIKTORIA_URL).
    private static func allowed(_ url: URL) -> Bool {
        if url.scheme == "https" { return true }
        // (staging builds only: a release build takes https alone)
        guard Bundle.main.bundleIdentifier?.hasSuffix(".staging") == true else { return false }
        return url.scheme == "http" && ["127.0.0.1", "localhost"].contains(url.host ?? "")
    }

    nonisolated private static func verify(_ file: URL, size: Int64, sha: String) -> Bool {
        check(file, size: size, sha: sha) == .ok
    }

    /// `ok`; `bad` (gone, wrong size, wrong hash); or `busy`: a transient error (locked, no permission for a moment,
    /// too many open files) says nothing about the file, so it must not be judged.
    enum Check: Sendable { case ok, bad, busy }

    nonisolated private static func check(_ file: URL, size: Int64, sha: String) -> Check {
        func fromError(_ e: Error) -> Check {
            let ns = e as NSError
            let gone = (ns.domain == NSCocoaErrorDomain && [NSFileNoSuchFileError, NSFileReadNoSuchFileError].contains(ns.code))
                || (ns.domain == NSPOSIXErrorDomain && ns.code == Int(ENOENT))
                || ((ns.userInfo[NSUnderlyingErrorKey] as? NSError).map { $0.domain == NSPOSIXErrorDomain && $0.code == Int(ENOENT) } ?? false)
            return gone ? .bad : .busy
        }
        let n: Int64
        do {
            guard let v = (try FileManager.default.attributesOfItem(atPath: file.path)[.size] as? NSNumber)?.int64Value else { return .busy }
            n = v
        } catch { return fromError(error) }
        guard n == size else { return .bad }
        let h: FileHandle
        do { h = try FileHandle(forReadingFrom: file) } catch { return fromError(error) }
        defer { try? h.close() }
        var hasher = SHA256()
        do {
            while let chunk = try h.read(upToCount: 1 << 20), !chunk.isEmpty {
                hasher.update(data: chunk)
            }
        } catch { return .busy }
        return hasher.finalize().map { String(format: "%02x", $0) }.joined() == sha ? .ok : .bad
    }

    private func fail(_ reason: String) {
        run = nil
        set(.failed(reason))
    }

    private func set(_ new: State) {
        guard new != state else { return }
        let wasReady = isReady
        state = new
        announce(readinessChanged: wasReady != isReady)
    }

    private func announce(readinessChanged: Bool) {
        // Her panel is made or freed when "ready" flips (Mascot.refresh); the pages follow every change.
        if readinessChanged { NotificationCenter.default.post(name: Mascot.changed, object: nil) }
        NotificationCenter.default.post(name: Self.changed, object: nil)
    }

    // MARK: - The download task (its callbacks come on URLSession's queue)

    private final class Loader: NSObject, URLSessionDownloadDelegate, @unchecked Sendable {
        private let progress: @Sendable (Int64) -> Void
        private var session: URLSession?
        private var task: URLSessionDownloadTask?
        private var done: CheckedContinuation<String?, Never>?
        private var dest: URL?
        private var failure: String?
        private var lastReport = Date.distantPast
        private let lock = NSLock()

        init(total: Int64, progress: @escaping @Sendable (Int64) -> Void) {
            self.progress = progress
        }

        /// nil on success (the file is at `dest`), else a short reason.
        func download(_ url: URL, to dest: URL) async -> String? {
            await withCheckedContinuation { (c: CheckedContinuation<String?, Never>) in
                lock.lock()
                self.dest = dest
                self.done = c
                let cfg = URLSessionConfiguration.ephemeral
                cfg.urlCache = nil
                cfg.requestCachePolicy = .reloadIgnoringLocalCacheData
                cfg.timeoutIntervalForRequest = 30
                let s = URLSession(configuration: cfg, delegate: self, delegateQueue: nil)
                let t = s.downloadTask(with: AccessKey.request(url, timeout: 30))
                session = s
                task = t
                lock.unlock()
                t.resume()
            }
        }

        func cancel() {
            lock.lock(); let t = task; lock.unlock()
            t?.cancel()
        }

        func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didWriteData bytesWritten: Int64,
                        totalBytesWritten: Int64, totalBytesExpectedToWrite: Int64) {
            let now = Date()
            lock.lock()
            let due = now.timeIntervalSince(lastReport) >= 0.25
            if due { lastReport = now }
            lock.unlock()
            if due { progress(totalBytesWritten) }
        }

        func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
            // The temporary file is gone when this returns: move it now.
            let status = (downloadTask.response as? HTTPURLResponse)?.statusCode ?? 0
            lock.lock(); let d = dest; lock.unlock()
            guard (200..<300).contains(status), let d else { setFailure("http \(status)"); return }
            do { try FileManager.default.moveItem(at: location, to: d) } catch { setFailure("disk") }
        }

        func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
            lock.lock()
            if let error, failure == nil { failure = (error as NSError).code == NSURLErrorCancelled ? "cancelled" : "network" }
            let c = done, f = failure
            done = nil
            lock.unlock()
            session.finishTasksAndInvalidate()
            c?.resume(returning: f)
        }

        private func setFailure(_ why: String) {
            lock.lock(); if failure == nil { failure = why }; lock.unlock()
        }
    }
}

/// `viktoria://pak`, the one thing the mascot page may fetch from outside its folder: the downloaded pak's bytes.
/// Registered only on the mascot web view's configuration; anything else is a 404.
final class ViktoriaSchemeHandler: NSObject, WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        let url = urlSchemeTask.request.url
        let path = url?.path ?? ""
        let ok = url?.scheme == "viktoria" && url?.host == "pak" && (path.isEmpty || path == "/")
        let data = ok ? MascotAsset.bytes() : nil
        let headers = ["Access-Control-Allow-Origin": "*", "Cache-Control": "no-store"]
        guard let url, let data, let r = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers
            .merging(["Content-Type": "application/octet-stream", "Content-Length": String(data.count)]) { a, _ in a }) else {
            if let url, let r = HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: ["Access-Control-Allow-Origin": "*"]) {
                urlSchemeTask.didReceive(r)
                urlSchemeTask.didReceive(Data())
                urlSchemeTask.didFinish()
            } else {
                urlSchemeTask.didFailWithError(URLError(.badURL))
            }
            return
        }
        urlSchemeTask.didReceive(r)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}
}
