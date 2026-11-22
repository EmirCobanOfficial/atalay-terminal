import Foundation

/// Cursor's usage limit for the top bar: what the CLI's own `/usage` shows, asked of Cursor's server the way it asks
/// (api2.cursor.sh, DashboardService, with the account's access token). The CLI keeps that token in the login Keychain
/// under "cursor-access-token"; it is read the way the CLI reads it, by running /usr/bin/security as a child process (no
/// Keychain call of our own). The token lives in memory for one request: never logged, written down, shown or sent anywhere
/// else. Nothing is renewed or written to Cursor's credentials; without a login, or when the server says no (401/403), no
/// limit shows. The endpoint isn't a public API: when it changes, the limit just goes.
/// The token goes to the address it was asked for and nowhere else: a redirect is refused.
private final class NoRedirect: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(nil)
    }
}

enum CursorUsage {
    enum Outcome {
        /// The limit as the top bar takes it, and when to ask again at the earliest (seconds).
        case value([String: Any])
        /// No login, or the server refused the token: nothing to show.
        case none
        /// A failure that may pass (network, 429, a server error): what was shown stays, and the next ask waits.
        case retry(after: Double)
    }

    private static let base = "https://api2.cursor.sh/aiserver.v1.DashboardService/"

    /// The access token, nil when there is no login (or `security` says no, or is slow): never anything else.
    private static func token() -> String? {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/usr/bin/security")
        p.arguments = ["find-generic-password", "-a", "cursor-user", "-s", "cursor-access-token", "-w"]
        let out = Pipe()
        p.standardInput = FileHandle.nullDevice
        p.standardOutput = out
        p.standardError = FileHandle.nullDevice
        guard (try? p.run()) != nil else { return nil }
        // A prompt of any kind would wait for ever: a few seconds, then it's no.
        let kill = DispatchWorkItem { if p.isRunning { p.terminate() } }
        DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + 5, execute: kill)
        let data = (try? out.fileHandleForReading.readToEnd()) ?? Data()
        p.waitUntilExit()
        kill.cancel()
        guard p.terminationStatus == 0, let s = String(data: data, encoding: .utf8) else { return nil }
        let t = s.trimmingCharacters(in: .whitespacesAndNewlines)
        return t.isEmpty || t.contains(where: \.isWhitespace) ? nil : t
    }

    /// The team a team account asks as (the CLI sends it too), from the CLI's own config.
    private static func team() -> String? {
        let path = (ProcessInfo.processInfo.environment["CURSOR_CONFIG_DIR"] ?? HOME + "/.cursor") + "/cli-config.json"
        guard let data = FileManager.default.contents(atPath: path), let j = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let id = (j["authInfo"] as? [String: Any])?["activeTeamId"] else { return nil }
        let s = "\(id)"
        return s.isEmpty || s == "0" || s.count > 64 ? nil : s
    }

    private static func post(_ method: String, token: String, team: String?) -> (status: Int, json: [String: Any]?, retryAfter: Double?) {
        guard let url = URL(string: base + method) else { return (0, nil, nil) }
        var req = URLRequest(url: url, timeoutInterval: 15)
        req.httpMethod = "POST"
        req.httpBody = Data("{}".utf8)
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer " + token, forHTTPHeaderField: "Authorization")
        if let team { req.setValue(team, forHTTPHeaderField: "x-cursor-team-id") }
        // No cookies, no cache, nothing kept.
        let session = URLSession(configuration: .ephemeral, delegate: NoRedirect(), delegateQueue: nil)
        defer { session.finishTasksAndInvalidate() }
        var result: (Int, [String: Any]?, Double?) = (0, nil, nil)
        let done = DispatchSemaphore(value: 0)
        session.dataTask(with: req) { data, response, _ in
            if let r = response as? HTTPURLResponse {
                result = (r.statusCode, data.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] },
                          (r.value(forHTTPHeaderField: "Retry-After")).flatMap(Double.init))
            }
            done.signal()
        }.resume()
        _ = done.wait(timeout: .now() + 20)
        return result
    }

    private static func number(_ v: Any?) -> Double? {
        if let n = v as? NSNumber { return n.doubleValue }
        if let s = v as? String { return Double(s) }
        return nil
    }

    /// One look: the plan's included usage in percent (`planUsage.totalPercentUsed`, missing when 0) and when the billing
    /// cycle ends, as the top bar's "week" cell says it, with "monthly" for its words.
    static func read() -> Outcome {
        // Only where Cursor is: its folder or its program (the Keychain isn't asked on a Mac without it).
        let fm = FileManager.default
        guard fm.fileExists(atPath: HOME + "/.cursor") || fm.isExecutableFile(atPath: HOME + "/.local/bin/cursor-agent"),
              var t: String = token() else { return .none }
        defer { t = "" }
        let team = team()
        let usage = post("GetCurrentPeriodUsage", token: t, team: team)
        if usage.status == 401 || usage.status == 403 { return .none }
        guard usage.status == 200, let json = usage.json else { return .retry(after: max(usage.retryAfter ?? 0, 600)) }
        // No plan usage at all (a team plan that has none): no limit to show.
        guard let plan = json["planUsage"] as? [String: Any] else { return .none }
        let pct = min(100, max(0, number(plan["totalPercentUsed"]) ?? 0))
        let end = number(json["billingCycleEnd"]) ?? 0
        var name = ""
        let info = post("GetPlanInfo", token: t, team: team)
        if info.status == 200, let n = (info.json?["planInfo"] as? [String: Any])?["planName"] as? String { name = String(n.prefix(40)) }
        return .value(["week": ["pct": pct, "resetsAt": end], "windows": ["week"], "labels": ["week": "monthly"], "monthly": true,
                       "at": Date().timeIntervalSince1970 * 1000, "plan": name, "source": "Cursor", "id": "cursor", "name": "cursor"])
    }
}
