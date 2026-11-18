import AppKit
import Foundation

/// Independent update watcher: checks the open `/v1/releases/latest` endpoint without a client key, heartbeat, or UI,
/// so a Mac whose heartbeat or key has broken still discovers and stages new builds.
@MainActor
final class UpdateWatch {
    static let shared = UpdateWatch()

    private static let session: URLSession = {
        let c = URLSessionConfiguration.ephemeral
        c.urlCache = nil
        c.requestCachePolicy = .reloadIgnoringLocalCacheData
        return URLSession(configuration: c)
    }()

    private var started = false
    private var checking = false
    private var lastCheck: Date?
    private var timer: Timer?

    func start() {
        guard !started else { return }
        started = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 20) {
            Task { @MainActor in await UpdateWatch.shared.check() }
        }
        let t = Timer(timeInterval: 1800, repeats: true) { _ in
            Task { @MainActor in await UpdateWatch.shared.check() }
        }
        t.tolerance = 60
        RunLoop.main.add(t, forMode: .common)
        timer = t
        NSWorkspace.shared.notificationCenter.addObserver(forName: NSWorkspace.didWakeNotification, object: nil, queue: .main) { _ in
            Task { @MainActor in await UpdateWatch.shared.check() }
        }
    }

    func checkNow() {
        if let lastCheck, Date().timeIntervalSince(lastCheck) < 5 { return }
        Task { @MainActor in await check() }
    }

    func check() async {
        guard !checking else { return }
        checking = true
        defer { checking = false }
        lastCheck = Date()
        guard Cloud.shared.build > 0 else { return }

        let url = Cloud.shared.apiBaseURL.appendingPathComponent("v1/releases/latest")
        let req = URLRequest(url: url, timeoutInterval: 20)

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await Self.session.data(for: req)
        } catch {
            return
        }
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { return }

        let release: Release
        do {
            release = try JSONDecoder().decode(Release.self, from: data)
        } catch {
            return
        }

        guard release.build > Cloud.shared.build else { return }
        Cloud.shared.offerUpdate(release, allowRetryIfForced: true)
    }
}
