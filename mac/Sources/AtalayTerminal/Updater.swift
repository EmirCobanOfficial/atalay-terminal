import AppKit
import CryptoKit
import Security

/// Installs a newer build offered by the API in two steps. `prepare` downloads its zip, checks the SHA-256 and the
/// Ed25519 signature made with the release key (its public half is AtalayUpdateKey in Info.plist) and unpacks it next to
/// the running app: safe in the background, nothing changes yet. `apply` swaps the bundles once the app has quit, and
/// starts the new build at once or waits for the user to quit. The terminals end with the app and come back with the new
/// build, their AI chats resumed (SessionSnapshot).
@MainActor
enum Updater {
    /// A newer build, checked and unpacked next to the running app (hidden), waiting to replace it.
    struct Staged { let build: Int; let version: String; let url: URL }

    /// Where `prepare` puts it: beside the app, hidden.
    static var stagedURL: URL {
        let current = Bundle.main.bundleURL
        return current.deletingLastPathComponent().appendingPathComponent(".\(current.lastPathComponent).update")
    }

    /// A build an earlier run staged and never restarted into (that restart hung, as in 0.19.0 and 0.19.1, or the app was
    /// force-quit or crashed): only that run knew of it, so every launch since downloaded it again and tried again.
    /// Newer than this build, the same app and signed as this app is: the one to go in. Its zip was checked against the
    /// release key when it came, but it has waited on disk since, where anything can be put; the signature is what still
    /// ties it to a release. Anything else waiting there is stale, and goes (the next check for updates downloads it again).
    static func leftover() -> Staged? {
        let url = stagedURL
        guard FileManager.default.fileExists(atPath: url.path) else { return nil }
        let build = { (b: Bundle?) in Int(b?.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "") ?? 0 }
        if let staged = Bundle(url: url), staged.bundleIdentifier == Bundle.main.bundleIdentifier, build(staged) > build(.main),
           signedAs(Bundle.main.bundleURL, url) {
            return Staged(build: build(staged), version: staged.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "", url: url)
        }
        try? FileManager.default.removeItem(at: url)
        return nil
    }

    /// Whether the app at `url` is signed as the one at `reference` is: a valid signature (every architecture, the code
    /// inside it, strictly) that meets `reference`'s designated requirement, the release certificate for a release. Every
    /// release so far carries the same one; a build signed ad hoc (a development one) takes no other build.
    /// Releases move to Apple's Developer ID (notarized) after this one, so a build signed with Orbiterm's Developer ID
    /// passes too (`developerID`): the self-signed certificate's requirement can't take it.
    nonisolated static func signedAs(_ reference: URL, _ url: URL) -> Bool {
        var ref: SecStaticCode?, requirement: SecRequirement?, code: SecStaticCode?
        guard SecStaticCodeCreateWithPath(reference as CFURL, [], &ref) == errSecSuccess, let ref,
              SecCodeCopyDesignatedRequirement(ref, [], &requirement) == errSecSuccess, let requirement,
              SecStaticCodeCreateWithPath(url as CFURL, [], &code) == errSecSuccess, let code else { return false }
        let flags = SecCSFlags(rawValue: kSecCSCheckAllArchitectures | kSecCSCheckNestedCode | kSecCSStrictValidate)
        if SecStaticCodeCheckValidity(code, flags, requirement) == errSecSuccess { return true }
        guard let developerID = developerID(as: ref) else { return false }
        return SecStaticCodeCheckValidity(code, flags, developerID) == errSecSuccess
    }

    /// Orbiterm's Developer ID team (ATALAY KARAHAN).
    nonisolated private static let team = "8MPHM92P3S"

    /// Orbiterm's Developer ID signature for the app `reference` is: a Developer ID Application certificate Apple issued
    /// to `team`, for `reference`'s own identifier (the release's, or staging's). Nothing else that team signs passes.
    nonisolated private static func developerID(as reference: SecStaticCode) -> SecRequirement? {
        var info: CFDictionary?
        guard SecCodeCopySigningInformation(reference, [], &info) == errSecSuccess,
              let id = (info as? [String: Any])?[kSecCodeInfoIdentifier as String] as? String, !id.isEmpty,
              id.allSatisfy({ $0.isASCII && ($0.isLetter || $0.isNumber || $0 == "." || $0 == "-") }) else { return nil }
        let text = "identifier \"\(id)\" and anchor apple generic"
            + " and certificate 1[field.1.2.840.113635.100.6.2.6] exists"   // issued by Apple's Developer ID CA
            + " and certificate leaf[field.1.2.840.113635.100.6.1.13] exists" // a Developer ID Application certificate
            + " and certificate leaf[subject.OU] = \"\(team)\""
        var requirement: SecRequirement?
        guard SecRequirementCreateWithString(text as CFString, [], &requirement) == errSecSuccess else { return nil }
        return requirement
    }

    enum Failure: Error {
        case noKey, download(Int), badSignature, badBundle, cancelled
        /// The folder holding the app can't be written to (or macOS privacy settings refused it).
        case notWritable
        /// The download went past `Download.limit`, or the server said it would: no release comes near that.
        case tooLarge

        /// Short code the dashboard page turns into a message.
        var code: String { if case .notWritable = self { return "not_writable" }; return "failed" }
    }

    /// `fraction`: how much of the zip has come (0...1) as it comes, for the progress bar.
    static func prepare(_ release: Release, progress: @escaping @MainActor (String) -> Void,
                        fraction: @escaping @MainActor (Double) -> Void = { _ in }) async throws -> Staged {
        guard let raw = (Bundle.main.object(forInfoDictionaryKey: "AtalayUpdateKey") as? String).flatMap({ Data(base64Encoded: $0) }),
              let key = try? Curve25519.Signing.PublicKey(rawRepresentation: raw) else { throw Failure.noKey }
        guard let url = URL(string: release.url) else { throw Failure.download(0) }
        let file = try await Download(onProgress: { f in Task { @MainActor in fraction(f) } }).run(url)
        defer { try? FileManager.default.removeItem(at: file) }
        // Mapped rather than read in: the signature covers the whole zip, so the check needs all of it at once, and this
        // way its pages come from the file as the checks reach them instead of all being copied into memory first.
        let data = try Data(contentsOf: file, options: .alwaysMapped)
        let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        guard digest == release.sha256, let signature = Data(base64Encoded: release.signature),
              key.isValidSignature(signature, for: data) else { throw Failure.badSignature }

        progress("unpacking \(release.version)…")
        let fm = FileManager.default
        let work = fm.temporaryDirectory.appendingPathComponent("atalay-terminal-update-\(release.build)")
        try? fm.removeItem(at: work)
        try fm.createDirectory(at: work, withIntermediateDirectories: true)
        let zip = work.appendingPathComponent("update.zip")
        try data.write(to: zip)
        try run("/usr/bin/ditto", ["-x", "-k", zip.path, work.path])
        guard let app = try fm.contentsOfDirectory(at: work, includingPropertiesForKeys: nil).first(where: { $0.pathExtension == "app" }),
              let bundle = Bundle(url: app), bundle.bundleIdentifier == Bundle.main.bundleIdentifier,
              Int(bundle.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "") == release.build else { throw Failure.badBundle }

        // Put the new bundle next to the running one first, while this app is still open: the swap after quitting is
        // then two renames in one folder, and a folder the app can't write to (or a macOS privacy prompt for it, as
        // in ~/Documents) shows up now instead of after the app is gone.
        let staged = stagedURL
        try? fm.removeItem(at: staged)
        do { try fm.moveItem(at: app, to: staged) } catch { throw Failure.notWritable }
        try? fm.removeItem(at: work)
        return Staged(build: release.build, version: release.version, url: staged)
    }

    /// True while an update's restart quits the app: the terminal sessions are written down for the new build (AppDelegate).
    nonisolated(unsafe) static var relaunching = false

    /// Once this process has quit: swap the bundles (back to the old one if that fails), drop the download quarantine
    /// and, with `relaunch`, start the new build. With `relaunch` the app quits now; without, it's the user's quit.
    /// The new build goes in under its own name (CFBundleName: "Orbiterm.app", where "Atalay's Terminal.app" was),
    /// unless something else already has that name; then it takes the old one's place.
    static func apply(_ staged: Staged, relaunch: Bool) throws {
        let script = """
        while kill -0 \(getpid()) 2>/dev/null; do sleep 0.2; done
        [ -d "$1" ] || exit 0
        dest="$3"
        [ "$dest" = "$2" ] || [ ! -e "$dest" ] || dest="$2"
        rm -rf "$2.old"
        mv "$2" "$2.old" && { mv "$1" "$dest" || { mv "$2.old" "$2"; dest="$2"; }; }
        rm -rf "$2.old" "$1"
        [ -d "$dest" ] || dest="$2"
        xattr -dr com.apple.quarantine "$dest" 2>/dev/null
        \(relaunch ? "open \"$dest\"" : "")
        """
        let current = Bundle.main.bundleURL
        let name = (Bundle(url: staged.url)?.object(forInfoDictionaryKey: "CFBundleName") as? String)?
            .filter { $0 != "/" && $0 != ":" }
        let dest = name.flatMap { $0.isEmpty ? nil : current.deletingLastPathComponent().appendingPathComponent($0 + ".app") } ?? current
        let swap = Process()
        swap.executableURL = URL(fileURLWithPath: "/bin/sh")
        swap.arguments = ["-c", script, "swap", staged.url.path, current.path, dest.path]
        try swap.run()
        guard relaunch else { return }
        // An update's restart writes the terminal sessions down for the new build to start again; a real quit forgets them.
        relaunching = true
        defer { relaunching = false }
        NSApp.terminate(nil)
        // Still here: quitting was cancelled (the user answered Cancel to what the restart would stop). Keep the current build.
        swap.terminate()
        throw Failure.cancelled
    }

    private static func run(_ tool: String, _ args: [String]) throws {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: tool)
        p.arguments = args
        try p.run()
        p.waitUntilExit()
        guard p.terminationStatus == 0 else { throw Failure.badBundle }
    }
}

/// The update's zip, telling how much of it has come as it comes (URLSession's own download says nothing until the end,
/// and a long one looked frozen). Done once: one task in its own session.
private final class Download: NSObject, URLSessionDownloadDelegate, @unchecked Sendable {
    /// The most it takes, in bytes: about ten times a real release's zip (some 20 MB). The link comes from the API, and
    /// the signature check only runs once the whole file is here, so without a cap a bad link could fill the disk first.
    static let limit: Int64 = 200 << 20

    private let onProgress: @Sendable (Double) -> Void
    private var continuation: CheckedContinuation<URL, Error>?
    private let lock = NSLock()

    init(onProgress: @escaping @Sendable (Double) -> Void) { self.onProgress = onProgress }

    func run(_ url: URL) async throws -> URL {
        let session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)
        defer { session.finishTasksAndInvalidate() }
        return try await withCheckedThrowingContinuation { c in
            lock.withLock { continuation = c }
            session.downloadTask(with: AccessKey.request(url)).resume()
        }
    }

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didWriteData _: Int64,
                    totalBytesWritten written: Int64, totalBytesExpectedToWrite total: Int64) {
        // Past the cap, or announced as bigger than it (the size is -1 when the server gives none): stop here. It fails
        // as any other download does, and the cancelled task's own error then finds the wait already over.
        guard written <= Download.limit, total <= Download.limit else {
            finish(.failure(Updater.Failure.tooLarge))
            return downloadTask.cancel()
        }
        if total > 0 { onProgress(min(1, Double(written) / Double(total))) }
    }

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
        let status = (downloadTask.response as? HTTPURLResponse)?.statusCode ?? 0
        guard status == 200 else { return finish(.failure(Updater.Failure.download(status))) }
        // Progress comes now and then, so the last bytes may not have passed the check above.
        guard downloadTask.countOfBytesReceived <= Download.limit else { return finish(.failure(Updater.Failure.tooLarge)) }
        // The file is gone once this returns: keep it.
        let kept = FileManager.default.temporaryDirectory.appendingPathComponent("atalay-terminal-update-\(UUID().uuidString).zip")
        do {
            try FileManager.default.moveItem(at: location, to: kept)
            finish(.success(kept))
        } catch {
            finish(.failure(error))
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error { finish(.failure(error)) }
    }

    private func finish(_ result: Result<URL, Error>) {
        let c = lock.withLock { () -> CheckedContinuation<URL, Error>? in
            defer { continuation = nil }
            return continuation
        }
        c?.resume(with: result)
    }
}
