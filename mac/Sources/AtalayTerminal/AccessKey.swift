import CryptoKit
import Foundation

/// The shared staging API answers only requests that carry its access key (the API's src/gate.ts); anything else gets a
/// plain 404. build-app.sh writes the key from ~/.atalay-terminal/staging-access-key into AccessKey+Build.swift
/// (gitignored) for a staging build that talks to that API, and compiles with ACCESS_KEY. Release builds, and staging
/// builds pointed at a local API, have none and send nothing extra.
enum AccessKey {
    #if ACCESS_KEY
    /// Kept masked, like ClientKey's, so the key isn't a plain string in the program.
    private static let value: String? = String(decoding: zip(embeddedMask, embeddedData).map { $0 ^ $1 }, as: UTF8.self)
    #else
    private static let value: String? = nil
    #endif

    /// The API: Info.plist's AtalayAPIURL. ATALAY_API_URL overrides it only in the staging build and when run unbundled
    /// (development): in the released app it would let anyone point the app, and its signed calls, at a server of theirs.
    static let api: URL = {
        let id = Bundle.main.bundleIdentifier
        let mayRedirect = id == nil || id?.hasSuffix(".staging") == true
        return URL(string: (mayRedirect ? ProcessInfo.processInfo.environment["ATALAY_API_URL"] : nil)
            ?? Bundle.main.object(forInfoDictionaryKey: "AtalayAPIURL") as? String ?? "http://127.0.0.1:4800")!
    }()

    private static func isAPI(_ url: URL?) -> Bool {
        guard let url, let host = url.host?.lowercased() else { return false }
        func port(_ u: URL) -> Int { u.port ?? (u.scheme?.lowercased() == "https" ? 443 : 80) }
        return url.scheme?.lowercased() == api.scheme?.lowercased() && host == api.host?.lowercased() && port(url) == port(api)
    }

    /// Adds the header to a request for the API's own address, never to another server's (a release's zip on GitHub, a
    /// file bucket).
    static func add(_ req: inout URLRequest) {
        guard let value, isAPI(req.url) else { return }
        req.setValue(value, forHTTPHeaderField: "x-orbiterm-access")
    }

    /// The same for a call that is made from a URL alone.
    static func request(_ url: URL, timeout: TimeInterval = 60) -> URLRequest {
        var req = URLRequest(url: url, timeoutInterval: timeout)
        add(&req)
        return req
    }

    /// A page's WebSocket can't carry a header, so a note's or the live line's address carries this instead: an HMAC of
    /// its one-use ticket under the key. It proves the key without giving it away, and is no use for any other ticket.
    static func proof(ticket: String) -> String? {
        guard let value else { return nil }
        let mac = HMAC<SHA256>.authenticationCode(for: Data(ticket.utf8), using: SymmetricKey(data: Data(value.utf8)))
        return mac.map { String(format: "%02x", $0) }.joined()
    }
}
