import AppKit
import WebKit

/// The community feed (the white lines that dissolve, Rainbow Six style) at the top left corner of the physical screen,
/// just under the menu bar, above whatever app is in front, the way the notices panel is. It is a see-through panel that
/// never takes a click or the keyboard. The dashboard page (community.js) decides what shows and when and hands each
/// line over (`add`, `out`, `clear`); the page in this panel (feed.html) only draws them, and says when none is left so
/// the panel goes away.
@MainActor
final class FeedPanel: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
    static let shared = FeedPanel()
    private static var created = false

    /// Empties the panel if it was ever made (a reloaded dashboard), without making it just to clear it.
    static func clearIfCreated() {
        if created { shared.clear() }
    }

    private final class Panel: NSPanel {
        override var canBecomeKey: Bool { false }
        override var canBecomeMain: Bool { false }
    }

    /// Room for four lines and their dissolve; the lines inside are only as wide as their words.
    private static let size = CGSize(width: 560, height: 190)
    private static let margin: CGFloat = 12
    private static let kinds: Set<String> = ["badge", "top", "goal", "fire", "fires"]

    private let panel = Panel(contentRect: NSRect(x: 0, y: 0, width: FeedPanel.size.width, height: FeedPanel.size.height),
                              styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: true)
    private let webView: WKWebView
    private var ready = false
    /// Scripts that arrived before the page finished loading.
    private var waiting: [String] = []

    private override init() {
        let config = WKWebViewConfiguration()
        config.lockInspector()
        let ucc = WKUserContentController()
        config.userContentController = ucc
        webView = WKWebView(frame: NSRect(origin: .zero, size: Self.size), configuration: config)
        webView.lockInspector()
        super.init()
        Self.created = true
        ThemeStore.shared.attach(webView)
        ucc.add(WeakMessageHandler(self), name: "feed")
        webView.setValue(false, forKey: "drawsBackground")
        webView.navigationDelegate = self
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = false
        panel.hidesOnDeactivate = false
        panel.isReleasedWhenClosed = false
        // Like the notices: above everything, on every space, and every click goes through to what is under it.
        panel.level = .floating
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.ignoresMouseEvents = true
        webView.autoresizingMask = [.width, .height]
        panel.contentView = webView
        let dir = RadarView.webDirectory()
        webView.loadFileURL(dir.appendingPathComponent("feed.html"), allowingReadAccessTo: dir)
    }

    func add(id: String, kind: String, html: String) {
        guard Self.kinds.contains(kind), !id.isEmpty, id.count <= 32, html.count <= 4000 else { return }
        place()
        run("window.__feed && __feed.add(\(Self.literal(id)), \(Self.literal(kind)), \(Self.literal(html)))")
    }

    func out(id: String) {
        guard id.count <= 32 else { return }
        run("window.__feed && __feed.out(\(Self.literal(id)))")
    }

    func clear() {
        run("window.__feed && __feed.clear()")
    }

    /// Top left of the screen the app is on (the chats' display), inside what the menu bar and the Dock leave.
    private func place() {
        let v = MessagePanel.home().visibleFrame
        let size = Self.size
        panel.setFrame(NSRect(x: v.minX + Self.margin, y: v.maxY - Self.margin - size.height, width: size.width, height: size.height), display: true)
        if !panel.isVisible { panel.orderFrontRegardless() }
    }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        switch type {
        case "ready":
            ready = true
            let scripts = waiting
            waiting = []
            scripts.forEach(run)
        // The last line has dissolved: the panel goes away until the next one.
        case "feedState":
            // A stale "empty" can arrive just after a new line was drawn, so "not empty" brings the panel back.
            if body["empty"] as? Bool == true { panel.orderOut(nil) } else if body["empty"] as? Bool == false, !panel.isVisible { panel.orderFrontRegardless() }
        default: break
        }
    }

    /// The page's process died: load it again; what was on it is gone with it.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        ready = false
        waiting = []
        panel.orderOut(nil)
        webView.reload()
    }

    /// The panel stays on its own page.
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        decisionHandler(PagePolicy.decide(action))
    }

    /// A string as a JavaScript literal (JSON), so nothing in it can break out of the call.
    private static func literal(_ value: String) -> String {
        guard let data = try? JSONSerialization.data(withJSONObject: [value]), let array = String(data: data, encoding: .utf8) else { return "\"\"" }
        return String(array.dropFirst().dropLast())
    }

    private func run(_ js: String) {
        guard ready else {
            waiting.append(js)
            return
        }
        webView.evaluateJavaScript(js + "; true") { _, error in
            if let error { NSLog("feed page: %@", String(describing: error)) }
        }
    }
}
