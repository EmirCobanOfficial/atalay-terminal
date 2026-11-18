import AppKit
import WebKit

/// A note out of the dashboard in a window of its own (web/note.html, which runs notes.js for that one note), one window
/// per note. Out of the dashboard's page because a note drawn inside it lay under every terminal: they're the
/// dashboard's child windows, always above it.
/// - Unpinned, it rides above the dashboard as its child, like the terminals and friend chats, and the one clicked last
///   is on top of the others.
/// - Pinned ("Keep on top"), it leaves the dashboard and floats above every app, on every desktop, ⌘H included.
/// The dashboard's page stays the only one that writes the notes (NotesStore.save deletes every note missing from what
/// it's given): this window's page sends its note here, and it goes on to the dashboard's `Notes.fromWindow`. So this
/// web view never gets the `notes` handler. Its place and pin are kept per note (`noteWindows`), and the notes still
/// out when the app quits come back at the next launch, as Stickies' do.
@MainActor
final class NoteWindow: NSObject, NSWindowDelegate, WKNavigationDelegate {
    /// The windows out, by note id.
    private static var open: [String: NoteWindow] = [:]
    /// The dashboard window unpinned notes ride above, and its page (the notes' one writer).
    static weak var dashboard: NSWindow?
    static weak var radar: RadarView?
    /// `[noteId: ["onTop": Bool, "frame": String, "open": Bool]]`.
    static let defaultsKey = "noteWindows"
    /// The notes left out at the last quit were opened again (once per run).
    private static var restored = false
    private static var watchingScreens = false

    let id: String
    let window: NSWindow
    let webView: WKWebView
    private(set) var onTop: Bool
    /// Out of the way of a dashboard menu.
    private var steppedAside = false
    private var closing = false
    private var finished = false
    /// Its page has its note (it's shown from then on).
    private var loaded = false
    /// Shown once its page has its note: true takes the keyboard.
    private var pendingFocus: Bool?
    /// Asked to open again while it was closing.
    private var reopen = false
    /// Where the pointer and the window were when the header's drag began.
    private var dragFrom: (mouse: NSPoint, origin: NSPoint)?

    private init(id: String) {
        self.id = id
        let saved = Self.entries()[id] ?? [:]
        onTop = saved["onTop"] as? Bool ?? false
        let frame = Self.startFrame(saved["frame"] as? String)
        window = NSWindow(contentRect: frame, styleMask: [.titled, .closable, .resizable, .fullSizeContentView],
                          backing: .buffered, defer: false)
        let config = WKWebViewConfiguration()
        config.lockInspector()
        let ucc = WKUserContentController()
        let boot: [String: Any] = ["id": id, "onTop": onTop, "streamer": Streamer.on]
        let json = (try? JSONSerialization.data(withJSONObject: boot)).flatMap { String(data: $0, encoding: .utf8) } ?? "null"
        ucc.addUserScript(WKUserScript(source: "window.__NOTE_WINDOW__ = \(json);", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.userContentController = ucc
        webView = WKWebView(frame: NSRect(origin: .zero, size: frame.size), configuration: config)
        webView.lockInspector()
        super.init()
        // The dashboard's theme and text size.
        ThemeStore.shared.attach(webView, zooms: true)
        // Its only handler: never `notes` (the dashboard writes them) nor `cloud`.
        ucc.addScriptMessageHandler(NoteWindowBridge(self), contentWorld: .page, name: "noteWindow")
        webView.setValue(false, forKey: "drawsBackground")
        webView.navigationDelegate = self
        webView.autoresizingMask = [.width, .height]

        // A titled window, as a terminal's: native resize edges, rounded corners and a shadow, and a click makes it key
        // (the Edit menu's Cut, Copy, Paste and Select All reach it). Its strip is the page's; the traffic lights go.
        window.title = "Note"
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        for kind in [NSWindow.ButtonType.closeButton, .miniaturizeButton, .zoomButton] {
            window.standardWindowButton(kind)?.isHidden = true
        }
        window.isOpaque = false
        window.backgroundColor = .clear
        window.hasShadow = true
        window.appearance = NSAppearance(named: .darkAqua)
        window.tabbingMode = .disallowed
        window.isReleasedWhenClosed = false
        window.hidesOnDeactivate = false
        window.minSize = NSSize(width: 280, height: 160)
        window.contentView = webView
        window.initialFirstResponder = webView
        window.setFrame(frame, display: false)
        window.delegate = self
        Self.watchScreens()

        let dir = RadarView.webDirectory()
        WebIntegrity.check()
        webView.loadFileURL(dir.appendingPathComponent("note.html"), allowingReadAccessTo: dir)
    }

    // MARK: opening and closing (the dashboard's notes.js asks)

    /// A note in its window: a new one (shown once its page has the note), or the one out already, brought forward.
    /// `focus` false shows it without taking the keyboard (the notes reopened at launch).
    static func show(id: String, focus: Bool = true) {
        guard NotesStore.validName(id) else { return }
        if let n = open[id] {
            if n.closing { n.reopen = true }
            else if n.loaded { n.show(focus: focus) }
            else { n.pendingFocus = (n.pendingFocus ?? false) || focus }
            return
        }
        let n = NoteWindow(id: id)
        n.pendingFocus = focus
        open[id] = n
    }

    /// The dashboard closes it: its × ("bring it back"), or the note deleted there (`flush` false, its place forgotten).
    static func close(id: String, flush: Bool, deleted: Bool = false) {
        open[id]?.close(flush: flush)
        if deleted { forget(id) }
    }

    /// For the AI tools (NotesTools): the page that holds a note's live text. A note out in its window is written there (that
    /// page knows what's being typed), so the AI's change goes to it; nil when the note isn't out (the dashboard's page has it).
    static func liveView(id: String) -> WKWebView? {
        guard let n = open[id], n.loaded, !n.finished, !n.closing else { return nil }
        return n.webView
    }

    /// Where the notes out in windows are: whether the window floats above every app (Keep on top) or rides above the
    /// dashboard, and whether it is on screen now.
    static func places() -> [String: (onTop: Bool, visible: Bool)] {
        open.mapValues { ($0.onTop, $0.loaded && !$0.finished && $0.window.isVisible) }
    }

    /// ⌘W in a note: it closes as its × does. False when no note is in front.
    static func closeKey() -> Bool {
        guard let n = open.values.first(where: { $0.window.isKeyWindow }) else { return false }
        n.close(flush: true)
        return true
    }

    /// The dashboard's notes are loaded (at launch, or the page loaded again): the notes left out at the last quit come
    /// back once, and the page learns which notes are out (a reloaded page has forgotten).
    static func notesReady() {
        if !restored {
            restored = true
            for (id, e) in entries() where e["open"] as? Bool == true && open[id] == nil { show(id: id, focus: false) }
        }
        radar?.callNotes("window.Notes && Notes.windowsOpen && Notes.windowsOpen(ids)", ["ids": Array(open.keys)])
    }

    /// The dashboard came to the front: unpinned notes opened while it was away ride above it too.
    static func pinAll() {
        for n in open.values where n.window.isVisible { n.attach() }
    }

    /// A menu opened on the dashboard (friends, settings, a question): unpinned notes step out of its way and come back
    /// when it closes, as the terminals do; pinned ones stay.
    static func stepAside(_ aside: Bool) {
        for n in open.values {
            if aside, n.window.isVisible, !n.onTop, !n.steppedAside {
                n.steppedAside = true
                n.window.parent?.removeChildWindow(n.window)
                n.window.orderOut(nil)
            } else if !aside, n.steppedAside {
                n.steppedAside = false
                n.attach()
                n.window.orderFront(nil)
            }
        }
    }

    /// A note hidden from AI or shown again somewhere else: its window's eye follows.
    static func setAiHidden(id: String, on: Bool) {
        open[id]?.webView.evaluateJavaScript("window.Notes && Notes.aiHiddenSet && Notes.aiHiddenSet(\(on)); true", completionHandler: nil)
    }

    /// Streamer mode: the note's name and text blur (style.css).
    static func setStreamer(_ on: Bool) {
        for n in open.values {
            n.webView.evaluateJavaScript("document.documentElement.classList.toggle('streamer', \(on)); true", completionHandler: nil)
        }
    }

    /// The app quits: what each note typed in the last moment goes to the dashboard (which keeps it), then `done`.
    static func flushAll(_ done: @escaping () -> Void) {
        let list = open.values.filter { $0.loaded && !$0.finished }
        guard !list.isEmpty else { return done() }
        var left = list.count
        for n in list {
            n.webView.callAsyncJavaScript(flushJS, arguments: [:], in: nil, in: .page) { _ in
                left -= 1
                if left == 0 { done() }
            }
        }
    }

    private static let flushJS = "return window.Notes && Notes.flush ? await Notes.flush() : true"

    private func show(focus: Bool) {
        guard !closing else { return }
        window.setFrame(Self.fit(window.frame), display: false)
        // Attached before it's ordered in, so it opens in a full-screen dashboard's Space.
        applyOnTop()
        if focus {
            NSApp.activate(ignoringOtherApps: true)
            window.makeKeyAndOrderFront(nil)
            window.makeFirstResponder(webView)
        } else if onTop {
            // Not taking the keyboard from another app.
            window.orderFrontRegardless()
        } else {
            window.orderFront(nil)
        }
        Self.update(id) { [frame = window.frame] in
            $0["open"] = true
            $0["frame"] = NSStringFromRect(frame)
        }
    }

    /// Closed: what was typed last goes first (`flush`), at most 2 s.
    func close(flush: Bool) {
        guard !closing else { return }
        closing = true
        guard flush, loaded else { return finish() }
        var done = false
        let end = { [weak self] in
            guard !done else { return }
            done = true
            self?.finish()
        }
        webView.callAsyncJavaScript(Self.flushJS, arguments: [:], in: nil, in: .page) { _ in end() }
        // Through the run loop, not the main queue (MainWindowController.flushFiles says why).
        RunLoop.main.add(Timer(timeInterval: 2, repeats: false) { _ in MainActor.assumeIsolated { end() } }, forMode: .common)
    }

    private func finish() {
        guard !finished else { return }
        finished = true
        if let sheet = window.attachedSheet { window.endSheet(sheet, returnCode: .cancel) }
        Self.update(id) { [frame = window.frame] in
            $0["open"] = false
            $0["frame"] = NSStringFromRect(frame)
        }
        window.parent?.removeChildWindow(window)
        window.orderOut(nil)
        window.delegate = nil
        webView.navigationDelegate = nil
        webView.configuration.userContentController.removeAllScriptMessageHandlers()
        window.close()
        if Self.open[id] === self { Self.open[id] = nil }
        Self.radar?.callNotes("window.Notes && Notes.windowClosed && Notes.windowClosed(id)", ["id": id])
        if reopen { Self.show(id: id) }
    }

    // MARK: on top, or above the dashboard

    private func applyOnTop() {
        if onTop {
            // A child takes its parent's level and Space: it lets go of the dashboard first.
            window.parent?.removeChildWindow(window)
            window.level = .floating
            // Assigned whole: .canJoinAllSpaces and .moveToActiveSpace exclude each other.
            window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .participatesInCycle]
            // ⌘H leaves it on screen: on top of everything is what the pin is for.
            window.canHide = false
        } else {
            window.level = .normal
            window.collectionBehavior = [.fullScreenAuxiliary, .moveToActiveSpace]
            window.canHide = true
            attach()
        }
    }

    /// Above the dashboard as its child (as Messages' pin), when the dashboard is on screen in this Space.
    private func attach() {
        guard !onTop, !steppedAside, !closing, let d = Self.dashboard, d.isVisible, !d.isMiniaturized, d.isOnActiveSpace,
              window.parent !== d else { return }
        d.addChildWindow(window, ordered: .above)
    }

    private func setOnTop(_ on: Bool) {
        guard on != onTop else { return }
        onTop = on
        Self.update(id) { $0["onTop"] = on }
        applyOnTop()
        // Ordered in again: off a full-screen dashboard's Space and onto every desktop (as a terminal's pin does).
        if on { window.orderOut(nil) }
        window.makeKeyAndOrderFront(nil)
    }

    // MARK: NSWindowDelegate

    /// Clicked: on top of the terminals and chats above the dashboard (AppKit doesn't reorder a parent's children on a
    /// click), as ChatWindow does.
    func windowDidBecomeKey(_ notification: Notification) {
        if !onTop, window.parent == nil { attach() }
        guard let parent = window.parent, parent.childWindows?.last !== window else { return }
        parent.removeChildWindow(window)
        parent.addChildWindow(window, ordered: .above)
    }

    /// ⇧⌘W (performClose): closed as its × does, what was typed last kept first.
    func windowShouldClose(_ sender: NSWindow) -> Bool {
        close(flush: true)
        return false
    }

    func windowDidEndLiveResize(_ notification: Notification) { rememberFrame() }

    private func rememberFrame() {
        Self.update(id) { [frame = window.frame] in $0["frame"] = NSStringFromRect(frame) }
    }

    // MARK: WKNavigationDelegate

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        decisionHandler(PagePolicy.decide(action))
    }

    /// Its page's process died: loaded again, it asks the dashboard for its note anew.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        guard !finished else { return }
        webView.reload()
    }

    // MARK: its page's messages

    /// Every message gets its answer (WebKit throws on a reply handler never called).
    fileprivate func handle(_ body: [String: Any], reply: @escaping @MainActor (Any?) -> Void) {
        guard !finished else { return reply(["error": "this note's window is closed"]) }
        switch body["type"] as? String {
        case "load": load(reply)
        case "save": save(body["json"] as? String, reply)
        case "dragStart":
            dragFrom = (NSEvent.mouseLocation, window.frame.origin)
            reply(nil)
        case "drag":
            // Where the pointer is now, not the page's deltas: right at any text size.
            if let d = dragFrom {
                let m = NSEvent.mouseLocation
                window.setFrameOrigin(NSPoint(x: d.origin.x + m.x - d.mouse.x, y: d.origin.y + m.y - d.mouse.y))
            }
            reply(nil)
        case "dragEnd":
            dragFrom = nil
            window.setFrame(Self.fit(window.frame), display: true)
            rememberFrame()
            reply(nil)
        case "onTop":
            setOnTop(body["on"] as? Bool == true)
            reply(["onTop": onTop])
        case "aiHide":
            // The eye on the note's own window: the dashboard's page keeps the flag (it writes every note) and answers { hidden }.
            guard let radar = Self.radar else { return reply(["error": "the dashboard isn't open"]) }
            let js = "const N = window.Notes; return N && N.setAiHidden ? await N.setAiHidden(id, on) : { error: 'the dashboard is loading' };"
            radar.callNotes(js, ["id": id, "on": body["on"] as? Bool == true]) { value in
                reply(value as? [String: Any] ?? ["error": "the dashboard didn't answer"])
            }
        case "close":
            reply(nil)
            close(flush: true)
        case "confirm": confirm(body, reply)
        case "delete":
            reply(nil)
            delete()
        case "title":
            window.title = String((body["name"] as? String ?? "Note").prefix(80))
            reply(nil)
        default:
            reply(["error": "unknown request"])
        }
    }

    /// The note, from the dashboard's page: `{ json }` (a one-note pad), `{ gone }` (deleted: the window closes) or
    /// `{ wait }` (the dashboard's page is loading; the page asks again).
    private func load(_ reply: @escaping @MainActor (Any?) -> Void) {
        guard let radar = Self.radar else { return reply(["wait": true]) }
        let js = "const N = window.Notes; if (!N || !N.windowNote) return { wait: true }; const json = await N.windowNote(id); return json ? { json } : { gone: true };"
        radar.callNotes(js, ["id": id]) { [weak self] value in
            let answer = value as? [String: Any]
            guard let self, !self.finished else { return reply(["gone": true]) }
            if let json = answer?["json"] as? String {
                reply(["json": json, "onTop": self.onTop, "streamer": Streamer.on])
                if !self.loaded {
                    self.loaded = true
                    self.show(focus: self.pendingFocus ?? false)
                    self.pendingFocus = nil
                }
            } else if answer?["gone"] as? Bool == true {
                reply(["gone": true])
                self.close(flush: false)
            } else {
                reply(["wait": true])
            }
        }
    }

    /// The page's note, kept by the dashboard's page. Only this window's own note: anything else is refused.
    private func save(_ json: String?, _ reply: @escaping @MainActor (Any?) -> Void) {
        guard let json, let pad = (try? JSONSerialization.jsonObject(with: Data(json.utf8))) as? [String: Any],
              let list = pad["notes"] as? [[String: Any]], list.count == 1, let note = list.first,
              note["id"] as? String == id else { return reply(["error": "bad request"]) }
        guard let radar = Self.radar else { return reply(["error": "the dashboard isn't open"]) }
        let js = "const N = window.Notes; return N && N.fromWindow ? await N.fromWindow(note) : { error: 'the dashboard is loading' };"
        radar.callNotes(js, ["note": note]) { value in
            reply(value as? [String: Any] ?? ["error": "the dashboard didn't answer"])
        }
    }

    /// Delete this note? Asked on the note's own window (`{ title, text, ok }`), answered `{ yes }`.
    private func confirm(_ body: [String: Any], _ reply: @escaping @MainActor (Any?) -> Void) {
        let a = NSAlert()
        a.messageText = body["title"] as? String ?? "Are you sure?"
        a.informativeText = body["text"] as? String ?? ""
        a.alertStyle = .warning
        a.addButton(withTitle: body["ok"] as? String ?? "OK").hasDestructiveAction = true
        a.addButton(withTitle: "Cancel")
        a.beginSheetModal(for: window) { response in
            MainActor.assumeIsolated { reply(["yes": response == .alertFirstButtonReturn]) }
        }
    }

    /// Deleted from its window: it closes, and the dashboard deletes the note (the board's undo still has it).
    private func delete() {
        let id = self.id
        close(flush: false)
        Self.forget(id)
        Self.radar?.callNotes("window.Notes && Notes.removeFromWindow && Notes.removeFromWindow(id)", ["id": id])
    }

    // MARK: where it goes, kept

    private static func entries() -> [String: [String: Any]] {
        UserDefaults.standard.dictionary(forKey: defaultsKey) as? [String: [String: Any]] ?? [:]
    }

    private static func update(_ id: String, _ change: (inout [String: Any]) -> Void) {
        var all = entries()
        var e = all[id] ?? [:]
        change(&e)
        all[id] = e
        UserDefaults.standard.set(all, forKey: defaultsKey)
    }

    static func forget(_ id: String) {
        var all = entries()
        guard all.removeValue(forKey: id) != nil else { return }
        UserDefaults.standard.set(all, forKey: defaultsKey)
    }

    /// Where it was left, else 560×440 over the middle of the dashboard (a third down), each one more out cascading.
    private static func startFrame(_ saved: String?) -> NSRect {
        if let saved {
            let r = NSRectFromString(saved)
            if r.width >= 100, r.height >= 100 { return fit(r) }
        }
        let size = NSSize(width: 560, height: 440)
        let area: NSRect
        if let d = dashboard, d.isVisible { area = d.frame }
        else { area = (NSScreen.main ?? NSScreen.screens.first)?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900) }
        let step = CGFloat(open.count % 8) * 28
        let top = area.maxY - max(0, area.height - size.height) / 3
        return fit(NSRect(x: area.midX - size.width / 2 + step, y: top - size.height - step, width: size.width, height: size.height))
    }

    /// All of it on the display it's mostly on (else the dashboard's), cut to fit only where that display is smaller.
    private static func fit(_ frame: NSRect) -> NSRect {
        let screens = NSScreen.screens
        guard !screens.isEmpty else { return frame }
        let overlap = { (s: NSScreen) -> CGFloat in
            let i = s.visibleFrame.intersection(frame)
            return i.isNull ? 0 : i.width * i.height
        }
        let best = screens.max { overlap($0) < overlap($1) } ?? screens[0]
        let s = overlap(best) > 0 ? best : (dashboard?.screen ?? NSScreen.main ?? screens[0])
        let v = s.visibleFrame
        var r = frame
        r.size.width = min(max(r.width, 280), v.width)
        r.size.height = min(max(r.height, 160), v.height)
        r.origin.x = min(max(r.minX, v.minX), v.maxX - r.width)
        r.origin.y = min(max(r.minY, v.minY), v.maxY - r.height)
        return r
    }

    /// A display plugged in, out or moved: the notes on screen follow, whole.
    private static func watchScreens() {
        guard !watchingScreens else { return }
        watchingScreens = true
        NotificationCenter.default.addObserver(forName: NSApplication.didChangeScreenParametersNotification, object: nil, queue: .main) { _ in
            MainActor.assumeIsolated {
                for n in open.values where n.window.isVisible { n.window.setFrame(fit(n.window.frame), display: true) }
            }
        }
    }
}

/// A note window's page (notes.js in note.html) to its NoteWindow. Weak: the user content controller keeps its handler.
final class NoteWindowBridge: NSObject, WKScriptMessageHandlerWithReply {
    private weak var note: NoteWindow?

    init(_ note: NoteWindow) { self.note = note }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        let body = message.body as? [String: Any] ?? [:]
        MainActor.assumeIsolated {
            guard let note else { return replyHandler(["error": "this note's window is closed"], nil) }
            note.handle(body) { replyHandler($0, nil) }
        }
    }
}
