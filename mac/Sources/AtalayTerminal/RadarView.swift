import AppKit
import WebKit
import UniformTypeIdentifiers

/// The dashboard's page. Its top bar works on the first click while a chat window is in front, like a title bar's
/// buttons (the chat windows' header does the same): WebKit takes that click only to bring the window forward, so the
/// brand (your profile), the gear and the update button did nothing until a second click. The top bar is the page's
/// first 64 CSS px (about 56 drawn), at the app's text size (pageZoom).
final class DashboardWebView: WKWebView {
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool {
        guard let event else { return super.acceptsFirstMouse(for: event) }
        let p = convert(event.locationInWindow, from: nil)
        let fromTop = isFlipped ? p.y : bounds.height - p.y
        return fromTop < 64 * pageZoom || super.acceptsFirstMouse(for: event)
    }
}

/// Whether a friend's spaceship (web/attack.js) would really be seen on the orbit map. macOS calls a window visible
/// (occlusionState) when any pixel of it shows, so a dashboard at the bottom of the pile, its map under another app's
/// window, counted as seen: the ship flew there unseen and only its sounds came. attack.js asks at each attack, at its
/// blast and while a missed one waits to fly, with the map's box as fractions of the page (`rect`). True when the window
/// is on screen and at least half of that box is clear of other apps' windows (normal, floating and panel levels; the
/// Dock, the menu bar and overlays above them don't count). The app's own windows don't count either: a chat window over
/// the dashboard is the page's `covered`, and its panels (the notices, the feed, Viktoria) let everything through. Only
/// the windows' frames are read (no screen recording permission); nothing is shown, raised or focused.
final class AttackBridge: NSObject, WKScriptMessageHandlerWithReply {
    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        let body = message.body as? [String: Any] ?? [:]
        MainActor.assumeIsolated {
            guard body["type"] as? String == "seen", let view = message.webView else { return replyHandler(nil, "unknown request") }
            replyHandler(Self.seen(view, body["rect"] as? [String: Any] ?? [:]), nil)
        }
    }

    @MainActor static func seen(_ view: NSView, _ rect: [String: Any]) -> Bool {
        guard let win = view.window, win.isVisible, !win.isMiniaturized, win.occlusionState.contains(.visible), !NSApp.isHidden,
              let main = NSScreen.screens.first else { return false }
        // The dashboard, or one of its chat windows (ordered with it), has the keys: it's in front of other apps' windows.
        if NSApp.isActive, let key = NSApp.keyWindow, key === win || key.parent === win { return true }
        func part(_ key: String, _ fallback: CGFloat) -> CGFloat {
            guard let n = rect[key] as? NSNumber, n.doubleValue.isFinite else { return fallback }
            return min(max(CGFloat(n.doubleValue), 0), 1)
        }
        let x = part("x", 0), y = part("y", 0), w = min(part("w", 1), 1 - x), h = min(part("h", 1), 1 - y)
        guard w > 0, h > 0 else { return false }
        // The page's top is the view's top, whichever way the view counts.
        let b = view.bounds
        let box = NSRect(x: b.minX + x * b.width, y: view.isFlipped ? b.minY + y * b.height : b.maxY - (y + h) * b.height,
                         width: w * b.width, height: h * b.height)
        let onScreen = win.convertToScreen(view.convert(box, to: nil))
        // Quartz's window frames count from the main display's top left, downwards.
        let map = CGRect(x: onScreen.minX, y: main.frame.maxY - onScreen.maxY, width: onScreen.width, height: onScreen.height)
        let me = Int(getpid()), top = Int(CGWindowLevelForKey(.dockWindow))
        let list = CGWindowListCopyWindowInfo([.optionOnScreenAboveWindow, .excludeDesktopElements], CGWindowID(win.windowNumber)) as? [[String: Any]] ?? []
        let over: [CGRect] = list.compactMap { info in
            guard (info[kCGWindowOwnerPID as String] as? Int) != me,
                  let layer = info[kCGWindowLayer as String] as? Int, layer >= 0, layer < top,
                  (info[kCGWindowAlpha as String] as? Double ?? 1) > 0.1,
                  let d = info[kCGWindowBounds as String] as? NSDictionary,
                  let r = CGRect(dictionaryRepresentation: d as CFDictionary), r.intersects(map) else { return nil }
            return r
        }
        if over.isEmpty { return true }
        let n = 20
        var clear = 0
        for i in 0..<n {
            for j in 0..<n {
                let p = CGPoint(x: map.minX + (CGFloat(i) + 0.5) / CGFloat(n) * map.width,
                                y: map.minY + (CGFloat(j) + 0.5) / CGFloat(n) * map.height)
                if !over.contains(where: { $0.contains(p) }) { clear += 1 }
            }
        }
        return clear * 2 >= n * n
    }
}

/// The animated radar page (Resources/web) in a WKWebView, fed by the engine through `window.__radar`.
@MainActor
final class RadarView: NSObject, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
    let webView: WKWebView
    var onMessage: (([String: Any]) -> Void)?

    override init() {
        let config = WKWebViewConfiguration()
        // Sounds play without a click on the page first, as the message panels' do: the dashboard's pings when sound is on,
        // a theme's own (web/hooks.js).
        config.mediaTypesRequiringUserActionForPlayback = []
        config.lockInspector()
        let ucc = WKUserContentController()
        ucc.addUserScript(WKUserScript(source: Self.terminalLook, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        // A note opened out of the dashboard goes in an app window of its own (NoteWindow), above the terminals.
        ucc.addUserScript(WKUserScript(source: "window.__noteWindows = true;", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        // The community feed is drawn by a panel of its own at the screen's corner (FeedPanel), not inside this page.
        ucc.addUserScript(WKUserScript(source: "window.__nativeFeed = true;", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.userContentController = ucc
        webView = DashboardWebView(frame: NSRect(x: 0, y: 0, width: 1200, height: 800), configuration: config)
        webView.lockInspector()
        super.init()
        ThemeStore.shared.attach(webView, zooms: true)
        ucc.add(WeakMessageHandler(self), name: "radar")
        ucc.addScriptMessageHandler(CloudBridge(), contentWorld: .page, name: "cloud")
        ucc.addScriptMessageHandler(McpPageBridge(), contentWorld: .page, name: "mcp")
        ucc.addScriptMessageHandler(ThemeBridge(), contentWorld: .page, name: "theme")
        ucc.addScriptMessageHandler(KeysBridge(), contentWorld: .page, name: "keys")
        ucc.addScriptMessageHandler(SaversBridge(), contentWorld: .page, name: "savers")
        ucc.addScriptMessageHandler(NotesBridge(), contentWorld: .page, name: "notes")
        ucc.addScriptMessageHandler(NotesAIBridge(), contentWorld: .page, name: "notesai")
        ucc.addScriptMessageHandler(AttackBridge(), contentWorld: .page, name: "attack")
        webView.setValue(false, forKey: "drawsBackground")
        webView.navigationDelegate = self
        webView.uiDelegate = self
        let dir = Self.webDirectory()
        WebIntegrity.check()
        webView.loadFileURL(dir.appendingPathComponent("index.html"), allowingReadAccessTo: dir)
    }

    /// The terminals' font for the pages that show code in it (Source Control, the file editor), the user's iTerm2 one,
    /// as `window.__terminalLook`; their colours are the theme's (ThemeStore).
    static let terminalLook: String = {
        let look = ITermLook.current
        // The font picked in Settings (TerminalFont) at launch; a pick made since, fonts.js passes on to them live.
        let family = TerminalFont.chosen ?? look?.fontName.flatMap { NSFont(name: $0, size: 13)?.familyName } ?? "Menlo"
        let value: [String: Any] = ["font": family, "size": Double(look?.fontSize ?? 13)]
        let json = (try? JSONSerialization.data(withJSONObject: value)).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
        return "window.__terminalLook = \(json);"
    }()

    /// Bundled copy inside the .app, or the source folder when run with `swift run`.
    nonisolated static func webDirectory() -> URL {
        if let res = Bundle.main.resourceURL?.appendingPathComponent("web"),
           FileManager.default.fileExists(atPath: res.appendingPathComponent("index.html").path) {
            return res
        }
        return URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("Resources/web")
    }

    /// Settings' archived chats (web/cloud.js) go to the chats list (Sidebar.swift).
    func handleArchive(_ bridge: ArchiveBridge) {
        webView.configuration.userContentController.addScriptMessageHandler(bridge, contentWorld: .page, name: "archive")
    }

    /// Settings' deleted chats (web/cloud.js) go to the chats list too (Sidebar.swift's trash).
    func handleTrash(_ bridge: TrashBridge) {
        webView.configuration.userContentController.addScriptMessageHandler(bridge, contentWorld: .page, name: "trash")
    }

    /// Source Control's requests (web/git.js) go to Git.swift.
    func handleGit(_ bridge: GitBridge) {
        webView.configuration.userContentController.addScriptMessageHandler(bridge, contentWorld: .page, name: "git")
    }

    /// The spend panel's history (web/app.js) comes from the engine's ledger (Ledger.swift).
    func handleSpend(_ bridge: SpendBridge) {
        webView.configuration.userContentController.addScriptMessageHandler(bridge, contentWorld: .page, name: "spend")
    }

    /// Source Control's files (web/file-editor.js) are read and written by FileEditor.swift.
    func handleFiles(_ bridge: FilesBridge) {
        bridge.web = webView
        webView.configuration.userContentController.addScriptMessageHandler(bridge, contentWorld: .page, name: "files")
    }

    /// A file in Source Control's editor, in a tab of its own (or the one it has), at `line`; `cwd`: the folder its path
    /// is shown from.
    func openFile(_ url: URL, line: Int?, column: Int?, cwd: String) {
        var spec: [String: Any] = ["path": url.standardizedFileURL.path, "cwd": cwd, "home": NSHomeDirectory()]
        if let line { spec["line"] = line }
        if let column { spec["column"] = column }
        callPage("window.GitView && GitView.openFile(spec)", ["spec": spec])
    }

    /// ⌘N: a new file in Source Control's editor, VS Code's Untitled-1.
    func newFile() { callPage("window.GitView && GitView.newFile()") }

    /// What the editor and the notes haven't saved yet goes to disk (the app quits), then `done`.
    func flushFiles(_ done: @escaping @MainActor () -> Void) {
        let js = "await Promise.all([window.FileEditor ? FileEditor.flush() : true, window.Notes && Notes.flush ? Notes.flush() : true]); return true"
        webView.callAsyncJavaScript(js, arguments: [:], in: nil, in: .page) { _ in done() }
    }

    /// The notes' one writer (notes.js) for the note windows (NoteWindow): `done` gets what `body` returns, nil when it
    /// failed.
    func callNotes(_ body: String, _ args: [String: Any], done: (@MainActor (Any?) -> Void)? = nil) {
        webView.callAsyncJavaScript(body, arguments: args, in: nil, in: .page) { result in
            switch result {
            case .success(let value): done?(value)
            case .failure(let error):
                NSLog("dashboard page: notes call failed: %@", String(describing: error))
                done?(nil)
            }
        }
    }

    private func callPage(_ js: String, _ args: [String: Any] = [:]) {
        webView.callAsyncJavaScript(js, arguments: args, in: nil, in: .page) { result in
            if case .failure(let error) = result { NSLog("dashboard page: %@ failed: %@", js, String(describing: error)) }
        }
    }

    func push(_ fn: String, _ json: String) {
        webView.evaluateJavaScript("window.__radar && window.__radar.\(fn)(\(json)); true") { _, error in
            if let error { NSLog("dashboard page: %@ failed: %@", fn, String(describing: error)) }
        }
    }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        if let body = message.body as? [String: Any] { onMessage?(body) }
    }

    /// ⌘R: loads the dashboard page again. Only the page restarts; chats run in their own windows and
    /// detached sessions and don't notice. A page that doesn't answer within 2 s is stuck, so its web
    /// process is ended instead and WebKit starts a fresh one (see below).
    func reload() {
        var answered = false
        webView.evaluateJavaScript("1") { [weak self] _, _ in
            answered = true
            self?.webView.reload()
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            guard let self, !answered else { return }
            NSLog("dashboard page: not answering, restarting its web process")
            // WebKit has no public way to end a hung page's process; its pid is SPI, checked before use.
            guard self.webView.responds(to: NSSelectorFromString("_webProcessIdentifier")),
                  let pid = (self.webView.value(forKey: "_webProcessIdentifier") as? NSNumber)?.int32Value, pid > 0 else {
                self.webView.reload()
                return
            }
            kill(pid, SIGKILL)
        }
    }

    /// If WebKit's page process dies the dashboard would stay blank; load it again (it asks for a fresh init).
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        NSLog("dashboard page: web content process ended, reloading")
        webView.reload()
    }

    /// An `<input type=file>` on the page (your profile's "Choose…" picture, profile-edit.js): WebKit leaves the panel to
    /// the app, Electron opens its own on Windows. Pictures only, one at a time; an iPhone's HEIC too, WebKit opens it.
    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        panel.allowedContentTypes = [.png, .jpeg, .webP, .gif, .heic, .heif]
        guard let window = webView.window else { return completionHandler(panel.runModal() == .OK ? panel.urls : nil) }
        panel.beginSheetModal(for: window) { completionHandler($0 == .OK ? panel.urls : nil) }
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if action.request.url?.isFileURL == true {
            decisionHandler(.allow)
        } else {
            if let url = action.request.url { SafeOpen.open(url) }
            decisionHandler(.cancel)
        }
    }
}

/// WKUserContentController retains its handlers; this breaks the cycle.
final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(ucc, didReceive: message)
    }
}

/// The spend panel's history tabs (web/app.js): the spend of the last days, weeks or months by project, from the engine's
/// ledger (Ledger.swift).
final class SpendBridge: NSObject, WKScriptMessageHandlerWithReply {
    private let engine: RadarEngine

    init(engine: RadarEngine) { self.engine = engine }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        let body = message.body as? [String: Any] ?? [:]
        guard body["type"] as? String == "history" else {
            return MainActor.assumeIsolated { replyHandler(nil, "unknown request") }
        }
        engine.spendHistory(body["range"] as? String ?? "30d") { out in
            MainActor.assumeIsolated { replyHandler(out, nil) }
        }
    }
}
