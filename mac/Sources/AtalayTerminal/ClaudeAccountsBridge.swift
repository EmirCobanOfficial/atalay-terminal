import AppKit
import WebKit

/// Settings › Claude's accounts and the top bar's limits popover (web/claude-accounts.js): the accounts and what each has
/// left, adding one (its folder, then Claude's own sign-in in a normal terminal), renaming, colouring, removing.
/// Nothing here touches a credential: Claude Code keeps its own, and Orbiterm only names the folder it uses.
final class ClaudeAccountsBridge: NSObject, WKScriptMessageHandlerWithReply {
    /// Accounts whose sign-in terminal was opened and that have no email yet.
    @MainActor private static var signingIn: [String: Int] = [:]
    @MainActor private static var timers: [String: Timer] = [:]

    @MainActor
    private static func state() -> [String: Any] {
        var s = ClaudeAccounts.webJSON()
        s["signingIn"] = Array(signingIn.keys)
        return s
    }

    @MainActor
    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        let body = message.body as? [String: Any] ?? [:]
        let id = body["id"] as? String ?? ""
        switch body["type"] as? String {
        case "state":
            replyHandler(Self.state(), nil)
        case "add":
            guard let a = ClaudeAccounts.create(label: body["label"] as? String ?? "",
                                                hue: (body["hue"] as? String).flatMap { ClaudeAccounts.validHue($0) ? $0 : nil }) else {
                return replyHandler(nil, "Give the account a name.")
            }
            Self.startSignIn(a)
            replyHandler(Self.state(), nil)
        case "signIn":
            // Again, for an account whose first sign-in didn't finish.
            if let a = ClaudeAccounts.account(id), !a.isDefault { Self.startSignIn(a) }
            replyHandler(Self.state(), nil)
        case "cancelSignIn":
            Self.stopWatching(id)
            replyHandler(Self.state(), nil)
        case "rename":
            ClaudeAccounts.rename(id, to: body["label"] as? String ?? "")
            replyHandler(Self.state(), nil)
        case "hue":
            if let hue = body["hue"] as? String, ClaudeAccounts.validHue(hue) { ClaudeAccounts.update(id) { $0.hue = hue } }
            replyHandler(Self.state(), nil)
        case "remove":
            // Never while one of its chats runs: those would lose their sign-in under them.
            if (MainWindowController.shared?.runningChats(ofAccount: id) ?? 0) > 0 {
                return replyHandler(nil, "A chat is running with this account. End it first.")
            }
            Self.stopWatching(id)
            if let error = ClaudeAccounts.remove(id) { return replyHandler(nil, error) }
            replyHandler(Self.state(), nil)
        default:
            replyHandler(nil, "unknown request")
        }
    }

    /// A normal Orbiterm terminal runs `claude auth login` under the account's folder; Claude's own sign-in opens in the
    /// browser. Its end shows as an email in `claude auth status`, asked every few seconds (a local command, no network
    /// call of ours) until it is there or five minutes have passed.
    @MainActor
    private static func startSignIn(_ a: ClaudeAccount) {
        stopWatching(a.id)
        MainWindowController.shared?.signInAccount(a.id)
        signingIn[a.id] = 0
        timers[a.id] = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { _ in
            MainActor.assumeIsolated {
                signingIn[a.id, default: 0] += 1
                if (signingIn[a.id] ?? 0) > 60 { return stopWatching(a.id) }
                ClaudeAccounts.refreshStatus(a.id) {
                    DispatchQueue.main.async {
                        MainActor.assumeIsolated {
                            if ClaudeAccounts.account(a.id)?.email.isEmpty == false { stopWatching(a.id) }
                        }
                    }
                }
            }
        }
    }

    @MainActor
    private static func stopWatching(_ id: String) {
        timers[id]?.invalidate()
        timers[id] = nil
        signingIn[id] = nil
    }
}
