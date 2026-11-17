import AppKit
import Foundation
import WebKit

/// A web view that takes the first click even when its app is in the background (she must be draggable over other apps).
private final class MascotWebView: WKWebView {
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
}

/// The roaming mascot (Viktoria), with her own on/off switch (works with any theme): a transparent, non-activating NSPanel that covers the
/// visible area of the screen she is on, stays on screen whatever has focus (every Space, over full-screen apps), walks
/// on other apps' windows and on the dashboard's own surfaces, can step onto neighbouring monitors, and passes clicks
/// through everywhere except Viktoria's hit rect.
@MainActor
final class Mascot: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
    static let shared = Mascot()

    // Her own on/off switch (Settings > Appearance and View > Show Viktoria), independent of the theme.
    private static let enabledKey = "mascotEnabled"
    /// Posted whenever the switch changes, so the panel, the sidebar and the web pages follow it.
    static let changed = Notification.Name("Mascot.enabledChanged")
    /// Release builds start with her OFF (existing users must not be surprised). The staging build starts with her ON so
    /// she can be tried at once; the bundle id decides (Detached.prefix reads it the same way). Once the user flips the
    /// switch, the saved value wins in both builds.
    private static let defaultEnabled = Bundle.main.bundleIdentifier?.hasSuffix(".staging") == true

    static var isEnabled: Bool {
        get { UserDefaults.standard.object(forKey: enabledKey) as? Bool ?? defaultEnabled }
        set {
            guard newValue != isEnabled else { return }
            UserDefaults.standard.set(newValue, forKey: enabledKey)
            NotificationCenter.default.post(name: changed, object: nil)
        }
    }

    /// Tells the dashboard's web pages (Settings' switch and Mischief block, the panel reporting in app.js).
    func pushEnabledToPage() {
        manager?.mascotPageEval("window.__mascotEnabled = \(Self.isEnabled); window.dispatchEvent(new Event('mascotchange'))")
    }

    private struct CGWin {
        let num: Int
        let own: Bool
        let rect: CGRect // CG global coordinates: top-left origin on the primary display
    }

    private weak var manager: MainWindowController?
    private weak var dashboard: NSWindow?
    private var panel: NSPanel?
    private var webView: WKWebView?
    private var loaded = false
    private var shown = false
    private var screensAsleep = false
    private var hitRect: CGRect?
    private var isDragging = false
    private var dragCrossed = false // the panel moved to another screen under her held button
    private var mouseMonitor: Any?
    private var globalMouseMonitor: Any?
    private var pollTimer: Timer?
    private var observers: [NSObjectProtocol] = []
    private var wsObservers: [NSObjectProtocol] = []
    private var currentScreenID: UInt32?
    private var cgWindows: [CGWin] = []
    private var lastStatus: [String: String] = [:]
    private var lastTerminalsJSON = ""
    private var lastPlatformsJSON = ""
    private var lastIdleSent = -1.0
    private var hasAppearedOnce = false
    private var rawWebPanels: [[String: Any]] = []
    private var rawNavTargets: [[String: Any]] = []
    private var sidebarLocalRects: [SidebarPlatformRect] = []

    private override init() {
        super.init()
    }

    func bind(manager: MainWindowController) {
        self.manager = manager
        self.dashboard = manager.window
        installObservers()
        refresh()
    }

    // MARK: - Mischief level (0 Calm, 1 Playful, 2 Naughty, 3 Crazy)

    private static let mischiefKey = "mascotMischief"

    /// Release builds default to 1 (Playful); the staging build (bundle id ends in ".staging") defaults to 3 (Crazy) for testing.
    private static let defaultMischief = Bundle.main.bundleIdentifier?.hasSuffix(".staging") == true ? 3 : 1

    var mischief: Int {
        let v = UserDefaults.standard.object(forKey: Self.mischiefKey) as? Int ?? Self.defaultMischief
        return min(max(v, 0), 3)
    }

    func setMischief(_ level: Int) {
        UserDefaults.standard.set(min(max(level, 0), 3), forKey: Self.mischiefKey)
        sendEvent(["type": "mischief", "level": mischief])
    }

    /// Tells the settings page (the dashboard's web view) the level, for its Mischief control.
    func pushMischiefToPage() {
        manager?.mascotPageEval("window.__mascotMischief = \(mischief); window.__mascotEnabled = \(Self.isEnabled); window.dispatchEvent(new Event('mascotchange'))")
    }

    // MARK: - Screens

    private static func screenID(_ s: NSScreen) -> UInt32? {
        (s.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber)?.uint32Value
    }

    private var currentScreen: NSScreen? {
        guard let id = currentScreenID else { return nil }
        return NSScreen.screens.first { Self.screenID($0) == id }
    }

    /// Her first screen: the dashboard's, if its window is visible; else the one under the mouse; else the main one.
    private func pickInitialScreen() -> NSScreen? {
        if let w = dashboard, w.isVisible, !w.isMiniaturized, let s = w.screen { return s }
        let loc = NSEvent.mouseLocation
        if let s = NSScreen.screens.first(where: { NSMouseInRect(loc, $0.frame, false) }) { return s }
        return NSScreen.main ?? NSScreen.screens.first
    }

    /// Keeps the panel exactly over the visible frame (no menu bar, no Dock) of her screen. Returns true if it moved.
    @discardableResult
    private func applyScreenFrame() -> Bool {
        guard let panel else { return false }
        var screen = currentScreen
        if screen == nil {
            screen = pickInitialScreen()
            currentScreenID = screen.flatMap { Self.screenID($0) }
        }
        guard let s = screen else { return false }
        let vf = s.visibleFrame
        if panel.frame == vf { return false }
        panel.setFrame(vf, display: true)
        sendScreenInfo()
        return true
    }

    /// Screens that touch `s` on its left (dir -1) or right (dir +1) edge.
    private func neighbours(of s: NSScreen, dir: Int) -> [NSScreen] {
        NSScreen.screens.filter { o in
            guard o !== s else { return false }
            let gap = dir < 0 ? abs(o.frame.maxX - s.frame.minX) : abs(o.frame.minX - s.frame.maxX)
            return gap <= 2
        }
    }

    /// Vertical ranges (panel px, top-left origin) where a neighbour meets this screen's left/right edge.
    private func edgeRanges(of s: NSScreen, dir: Int) -> [[Int]] {
        let pf = s.visibleFrame
        var out: [[Int]] = []
        for o in neighbours(of: s, dir: dir) {
            let lo = max(pf.minY, o.frame.minY)
            let hi = min(pf.maxY, o.frame.maxY)
            guard hi - lo >= 120 else { continue }
            out.append([Int((pf.maxY - hi).rounded()), Int((pf.maxY - lo).rounded())])
        }
        return out
    }

    private func sendScreenInfo() {
        guard loaded, let s = currentScreen, let panel else { return }
        let size = panel.frame.size
        let msg: [String: Any] = [
            "type": "screen",
            "w": Int(size.width.rounded()),
            "h": Int(size.height.rounded()),
            "edges": ["left": edgeRanges(of: s, dir: -1), "right": edgeRanges(of: s, dir: 1)],
        ]
        sendEvent(msg)
    }

    /// JS asked to step past a left/right edge: move the panel to the neighbour and tell JS where she arrives.
    private func crossScreen(dir: Int, y: Double) {
        guard shown, let panel, let cur = currentScreen, dir == -1 || dir == 1, y.isFinite else { return }
        let ay = panel.frame.maxY - CGFloat(y) // AppKit global height of her feet
        let cands = neighbours(of: cur, dir: dir)
        guard let target = cands.first(where: { ay >= $0.visibleFrame.minY && ay <= $0.visibleFrame.maxY })
            ?? cands.min(by: {
                abs(min(max(ay, $0.visibleFrame.minY), $0.visibleFrame.maxY) - ay)
                    < abs(min(max(ay, $1.visibleFrame.minY), $1.visibleFrame.maxY) - ay)
            }) else { return }
        let nf = target.visibleFrame
        let newY = nf.maxY - min(max(ay, nf.minY), nf.maxY)
        currentScreenID = Self.screenID(target)
        lastPlatformsJSON = ""
        lastTerminalsJSON = ""
        panel.setFrame(nf, display: true)
        sendScreenInfo()
        sendEvent(["type": "arrive", "dir": dir, "y": Int(newY.rounded())])
        pollWindows()
        pushTerminalsNow()
    }

    private func screenParametersChanged() {
        guard Self.isEnabled, panel != nil else { return }
        if currentScreen == nil {
            // Her screen is gone: back to the main screen.
            let s = NSScreen.main ?? NSScreen.screens.first
            currentScreenID = s.flatMap { Self.screenID($0) }
            lastPlatformsJSON = ""
            lastTerminalsJSON = ""
        }
        if !applyScreenFrame() { sendScreenInfo() }
        pollWindows()
        pushTerminalsNow()
    }

    // MARK: - Show / hide

    func refresh() {
        guard Self.isEnabled else {
            hidePanel()
            return
        }
        ensurePanel()
        guard let panel else { return }
        if !shown {
            // First show, and every time the theme is switched on again: start on the dashboard's screen.
            currentScreenID = pickInitialScreen().flatMap { Self.screenID($0) }
        }
        applyScreenFrame()
        if !shown {
            shown = true
            panel.orderFront(nil)
            syncActive()
            installMouseMonitors()
            startPolling()
            pollWindows()
            pushTerminalsNow()
            if loaded && !hasAppearedOnce {
                hasAppearedOnce = true
                sendEvent(["type": "appeared"])
            }
        }
    }

    /// Dashboard moved, resized, miniaturized, ...: its surfaces and the visible windows change with it.
    private func dashboardChanged() {
        refresh()
        guard shown else { return }
        pollWindows()
        pushTerminalsNow()
    }

    private func syncActive() {
        eval("window.__mascot?.setActive(\(shown && !screensAsleep ? "true" : "false"))")
    }

    private func hidePanel() {
        releaseCursor()
        if !Self.isEnabled {
            hasAppearedOnce = false
        }
        if shown {
            shown = false
            panel?.orderOut(nil)
            syncActive()
        }
        panel?.ignoresMouseEvents = true
        isDragging = false
        removeMouseMonitors()
        stopPolling()
        if !Self.isEnabled { tearDownPanel() }
    }

    /// Switched off: the panel and its web view (three.js, the VRM, WebGL) are freed, not just hidden; ensurePanel builds
    /// them again when she is switched on.
    private func tearDownPanel() {
        guard panel != nil || webView != nil else { return }
        webView?.stopLoading()
        webView?.navigationDelegate = nil
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "mascot")
        panel?.contentView = nil
        panel?.close()
        webView = nil
        panel = nil
        loaded = false
        hitRect = nil
        lastStatus = [:]
        lastTerminalsJSON = ""
        lastPlatformsJSON = ""
        lastIdleSent = -1.0
    }

    private func ensurePanel() {
        guard panel == nil else { return }
        let screen = pickInitialScreen()
        currentScreenID = screen.flatMap { Self.screenID($0) }
        let frame = screen?.visibleFrame ?? dashboard?.frame ?? NSRect(x: 0, y: 0, width: 1200, height: 800)
        let p = NSPanel(contentRect: frame, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: true)
        p.isOpaque = false
        p.backgroundColor = .clear
        p.hasShadow = false
        p.hidesOnDeactivate = false
        p.canHide = false // Cmd-H does not hide her with the app
        p.isReleasedWhenClosed = false
        p.ignoresMouseEvents = true
        p.level = NSWindow.Level(rawValue: NSWindow.Level.floating.rawValue - 1)
        p.collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle, .fullScreenAuxiliary]

        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        config.lockInspector()
        let ucc = WKUserContentController()
        ucc.add(WeakMessageHandler(self), name: "mascot")
        config.userContentController = ucc

        let wv = MascotWebView(frame: NSRect(origin: .zero, size: frame.size), configuration: config)
        wv.unregisterDraggedTypes() // nothing can be dropped onto her
        wv.lockInspector()
        wv.setValue(false, forKey: "drawsBackground")
        wv.autoresizingMask = [.width, .height]
        wv.navigationDelegate = self
        p.contentView = wv

        let dir = RadarView.webDirectory()
        wv.loadFileURL(dir.appendingPathComponent("mascot.html"), allowingReadAccessTo: dir)

        self.panel = p
        self.webView = wv
    }

    private func installObservers() {
        guard observers.isEmpty else { return }
        let nc = NotificationCenter.default
        if let w = dashboard {
            let winNames: [Notification.Name] = [
                NSWindow.didMoveNotification,
                NSWindow.didResizeNotification,
                NSWindow.didMiniaturizeNotification,
                NSWindow.didDeminiaturizeNotification,
                NSWindow.didEnterFullScreenNotification,
                NSWindow.didExitFullScreenNotification,
                NSWindow.didChangeScreenNotification,
            ]
            for name in winNames {
                observers.append(nc.addObserver(forName: name, object: w, queue: .main) { [weak self] _ in
                    MainActor.assumeIsolated { self?.dashboardChanged() }
                })
            }
        }
        let appNames: [Notification.Name] = [
            NSApplication.didBecomeActiveNotification,
            NSApplication.didResignActiveNotification,
            NSApplication.didHideNotification,
            NSApplication.didUnhideNotification,
        ]
        for name in appNames {
            observers.append(nc.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                MainActor.assumeIsolated {
                    guard let self else { return }
                    if name == NSApplication.didResignActiveNotification { self.releaseCursor() }
                    self.dashboardChanged()
                    if name == NSApplication.didBecomeActiveNotification, Self.isEnabled, self.loaded, self.shown {
                        self.sendEvent(["type": "appActive"])
                    }
                }
            })
        }
        // Her switch (not the theme: the theme no longer shows or hides her, and her colours are her own).
        observers.append(nc.addObserver(forName: Mascot.changed, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated {
                self?.releaseCursor() // switched: let go of the cursor at once
                self?.refresh()
                self?.pushEnabledToPage()
            }
        })
        observers.append(nc.addObserver(forName: NSApplication.willTerminateNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.releaseCursor() }
        })
        observers.append(nc.addObserver(forName: NSApplication.didChangeScreenParametersNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.screenParametersChanged() }
        })

        let ws = NSWorkspace.shared.notificationCenter
        wsObservers.append(ws.addObserver(forName: NSWorkspace.didActivateApplicationNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated {
                guard let self, self.shown else { return }
                self.pollWindows()
            }
        })
        wsObservers.append(ws.addObserver(forName: NSWorkspace.screensDidSleepNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated {
                self?.releaseCursor()
                self?.lastSulkAt = .distantPast
                self?.screensAsleep = true
                self?.syncActive()
            }
        })
        wsObservers.append(ws.addObserver(forName: NSWorkspace.screensDidWakeNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated {
                self?.screensAsleep = false
                self?.syncActive()
            }
        })
    }

    // MARK: - Sulking at the cursor (theme chooser, and Settings > Appearance where her switch lives)

    private var cursorHeld = false
    private var holdTimer: Timer?
    private var lastHoldAt = Date.distantPast
    private var lastSulkAt = Date.distantPast

    /// The user opened the theme chooser or Settings > Appearance (a real click, not her own): by the mischief level's odds she runs to the cursor.
    func onThemeChooserOpened() {
        guard Self.isEnabled, loaded, shown, NSApp.isActive, !screensAsleep, !cursorHeld, let panel else { return }
        let odds = [0.0, 0.3, 0.6, 1.0][mischief]
        guard odds > 0, Double.random(in: 0..<1) < odds else { return }
        let now = Date()
        guard now.timeIntervalSince(lastHoldAt) >= 30, now.timeIntervalSince(lastSulkAt) >= 30 else { return }
        let loc = NSEvent.mouseLocation
        let pf = panel.frame
        guard pf.contains(loc) else { return } // only when the cursor is on her screen
        lastSulkAt = now
        startCursorStream()
        sendEvent(["type": "grabCursor", "x": Int((loc.x - pf.minX).rounded()), "y": Int((pf.maxY - loc.y).rounded())])
    }

    /// She reached the cursor: keep it at her hand for 2-3 s (hand position in panel px) by warping it back to her hand
    /// ~60 times a second; the system cursor is never frozen, so nothing stays stuck if the app dies. Stops at 3 s hard,
    /// when a mouse button goes down, and on resign-active, theme change, hiding, screen sleep and quit.
    /// While she sulks (before the hold) the cursor's position goes to her ~30 times a second so the leap can steer.
    private var streamTimer: Timer?
    private var holdTarget = CGPoint.zero // her hand, panel px: where the cursor is kept

    private func startCursorStream() {
        streamTimer?.invalidate()
        streamTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 30.0, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated {
                guard let self, let panel = self.panel, self.shown, !self.cursorHeld,
                      Date().timeIntervalSince(self.lastSulkAt) <= 6 else {
                    self?.streamTimer?.invalidate()
                    self?.streamTimer = nil
                    return
                }
                let loc = NSEvent.mouseLocation
                let pf = panel.frame
                self.sendEvent(["type": "cursorAt", "x": Int((loc.x - pf.minX).rounded()), "y": Int((pf.maxY - loc.y).rounded())])
            }
        }
    }

    /// Panel px to CG global (top-left origin on the primary display), nil outside the panel.
    private func cgPoint(fromPanel x: CGFloat, _ y: CGFloat) -> CGPoint? {
        guard let panel, let primary = NSScreen.screens.first else { return nil }
        let pf = panel.frame
        let ax = pf.minX + x
        let ay = pf.maxY - y
        guard pf.contains(CGPoint(x: ax, y: ay)) else { return nil }
        return CGPoint(x: ax, y: primary.frame.height - ay)
    }

    func updateHoldTarget(x: Double, y: Double) {
        guard cursorHeld else { return }
        holdTarget = CGPoint(x: x, y: y)
    }

    private func beginCursorHold(handX: Double, handY: Double, ms: Double) {
        guard Self.isEnabled, shown, NSApp.isActive, !screensAsleep, !cursorHeld else { return }
        guard NSEvent.pressedMouseButtons == 0 else { return } // never move a cursor that is dragging something
        let now = Date()
        guard now.timeIntervalSince(lastSulkAt) <= 6 else { return } // a stale request is dropped
        guard now.timeIntervalSince(lastHoldAt) >= 30 else { return }
        guard let first = cgPoint(fromPanel: CGFloat(handX), CGFloat(handY)) else { return }
        lastHoldAt = now
        cursorHeld = true
        streamTimer?.invalidate()
        streamTimer = nil
        holdTarget = CGPoint(x: handX, y: handY)
        let duration = min(max(ms / 1000, 1.0), 3.0)
        CGWarpMouseCursorPosition(first)
        holdTimer?.invalidate()
        holdTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 60.0, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated {
                guard let self, self.cursorHeld else { return }
                if Date().timeIntervalSince(now) >= duration || NSEvent.pressedMouseButtons != 0 {
                    self.releaseCursor()
                } else if let t = self.cgPoint(fromPanel: self.holdTarget.x, self.holdTarget.y) {
                    // The cursor stays on her hand (it dangles, so the target moves a little).
                    CGWarpMouseCursorPosition(t)
                }
            }
        }
        // A second, independent hard limit.
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) { [weak self] in
            MainActor.assumeIsolated { self?.releaseCursor() }
        }
    }

    /// Gives the real cursor back. Safe to call any time, any number of times.
    private func releaseCursor() {
        holdTimer?.invalidate()
        holdTimer = nil
        streamTimer?.invalidate()
        streamTimer = nil
        cursorHeld = false
    }

    // MARK: - Mouse

    private func installMouseMonitors() {
        if mouseMonitor == nil {
            mouseMonitor = NSEvent.addLocalMonitorForEvents(matching: [.mouseMoved, .leftMouseDragged, .leftMouseUp]) { [weak self] event in
                MainActor.assumeIsolated { self?.mouseEvent(event.type) }
                return event
            }
        }
        // While another app is active the local monitor sees nothing; the global one (no permission needed) does.
        if globalMouseMonitor == nil {
            globalMouseMonitor = NSEvent.addGlobalMonitorForEvents(matching: [.mouseMoved, .leftMouseDragged, .leftMouseUp]) { [weak self] event in
                MainActor.assumeIsolated { self?.mouseEvent(event.type) }
            }
        }
    }

    private func removeMouseMonitors() {
        if let m = mouseMonitor {
            NSEvent.removeMonitor(m)
            mouseMonitor = nil
        }
        if let m = globalMouseMonitor {
            NSEvent.removeMonitor(m)
            globalMouseMonitor = nil
        }
    }

    private func mouseEvent(_ type: NSEvent.EventType) {
        if isDragging {
            if type == .leftMouseDragged { checkDragScreen() }
            if type == .leftMouseUp, dragCrossed { sendDragEnd() }
        }
        updateHitTest()
    }

    /// Native-driven drag across monitors: while she is held, the screen under the cursor decides where the panel is.
    private func checkDragScreen() {
        guard shown, let panel else { return }
        let loc = NSEvent.mouseLocation
        guard let s = NSScreen.screens.first(where: { NSMouseInRect(loc, $0.frame, false) }),
              let id = Self.screenID(s), id != currentScreenID else { return }
        currentScreenID = id
        dragCrossed = true
        lastPlatformsJSON = ""
        lastTerminalsJSON = ""
        panel.setFrame(s.visibleFrame, display: true)
        sendScreenInfo()
        let pf = panel.frame
        sendEvent(["type": "dragArrive", "x": Int((loc.x - pf.minX).rounded()), "y": Int((pf.maxY - loc.y).rounded())])
        pollWindows()
        pushTerminalsNow()
    }

    /// Fallback when the page may not get the button release after the panel moved under it.
    private func sendDragEnd() {
        guard let panel else { return }
        let loc = NSEvent.mouseLocation
        let pf = panel.frame
        dragCrossed = false
        sendEvent(["type": "dragEnd", "x": Int((loc.x - pf.minX).rounded()), "y": Int((pf.maxY - loc.y).rounded())])
    }

    private func updateHitTest() {
        guard shown, let panel else { return }
        if isDragging {
            if panel.ignoresMouseEvents { panel.ignoresMouseEvents = false }
            return
        }
        guard let rect = hitRect else {
            if !panel.ignoresMouseEvents { panel.ignoresMouseEvents = true }
            return
        }
        let loc = NSEvent.mouseLocation
        let pf = panel.frame
        let x = loc.x - pf.minX
        let y = pf.maxY - loc.y
        let inside = rect.insetBy(dx: -8, dy: -8).contains(CGPoint(x: x, y: y))
        if panel.ignoresMouseEvents == inside {
            panel.ignoresMouseEvents = !inside
        }
    }

    // MARK: - Window polling

    private func startPolling() {
        guard pollTimer == nil else { return }
        pollTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated {
                guard let self, self.shown, !self.screensAsleep else { return }
                self.applyScreenFrame()
                self.pollWindows()
                self.pushTerminalsNow()
            }
        }
    }

    private func stopPolling() {
        pollTimer?.invalidate()
        pollTimer = nil
    }

    /// Reads the on-screen window list (bounds only, no titles, no Screen Recording permission) and resends platforms.
    private func pollWindows() {
        guard shown, let panel else { return }
        let opts: CGWindowListOption = [.optionOnScreenOnly, .excludeDesktopElements]
        let myPID = Int(ProcessInfo.processInfo.processIdentifier)
        let panelNum = panel.windowNumber
        var out: [CGWin] = []
        if let arr = CGWindowListCopyWindowInfo(opts, kCGNullWindowID) as? [[String: Any]] {
            for d in arr {
                guard (d[kCGWindowLayer as String] as? Int) == 0,
                      ((d[kCGWindowAlpha as String] as? Double) ?? 1) > 0,
                      let num = d[kCGWindowNumber as String] as? Int, num != panelNum,
                      let bd = d[kCGWindowBounds as String] as? [String: Any],
                      let r = CGRect(dictionaryRepresentation: bd as CFDictionary),
                      r.width >= 160, r.height >= 80 else { continue }
                let pid = (d[kCGWindowOwnerPID as String] as? Int) ?? -1
                out.append(CGWin(num: num, own: pid == myPID, rect: r))
            }
        }
        cgWindows = out
        refreshPlatforms()
    }

    /// CG global (top-left origin on the primary display) to panel-local top-left px, for her current screen.
    private func cgToPanelOffset() -> CGPoint? {
        guard let panel, let primary = NSScreen.screens.first else { return nil }
        let pf = panel.frame
        return CGPoint(x: pf.minX, y: primary.frame.height - pf.maxY)
    }

    /// x-ranges of [x0, x1] left uncovered by `occ` rects that span height y.
    private func visibleSegments(_ x0: Double, _ x1: Double, y: Double, occ: [CGRect]) -> [(Double, Double)] {
        var segs: [(Double, Double)] = [(x0, x1)]
        for r in occ where Double(r.minY) <= y && y < Double(r.maxY) {
            let a = Double(r.minX), b = Double(r.maxX)
            var next: [(Double, Double)] = []
            for s in segs {
                if b <= s.0 || a >= s.1 { next.append(s); continue }
                if a > s.0 { next.append((s.0, a)) }
                if b < s.1 { next.append((b, s.1)) }
            }
            segs = next
        }
        return segs
    }

    // MARK: - WKNavigationDelegate

    /// Only her own bundled page may load (file URL of mascot.html in the web folder); anything else is cancelled.
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url, url.isFileURL else { decisionHandler(.cancel); return }
        let ours = RadarView.webDirectory().appendingPathComponent("mascot.html").standardizedFileURL.path
        decisionHandler(url.standardizedFileURL.path == ours ? .allow : .cancel)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        loaded = true
        sendEvent(["type": "mischief", "level": mischief])
        sendScreenInfo()
        syncActive()
        if shown {
            pollWindows()
            pushTerminalsNow()
            if !hasAppearedOnce {
                hasAppearedOnce = true
                sendEvent(["type": "appeared"])
            }
        }
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        // Her actions on the app (views, taps, closing terminals) stop the moment she is switched off or hidden.
        if ["openView", "navTap", "closeTerminal", "hideTerminal"].contains(type), !Self.isEnabled || !shown { return }
        switch type {
        case "hitRect":
            if let r = body["rect"] as? [String: Any],
               let x = (r["x"] as? NSNumber)?.doubleValue,
               let y = (r["y"] as? NSNumber)?.doubleValue,
               let w = (r["w"] as? NSNumber)?.doubleValue,
               let h = (r["h"] as? NSNumber)?.doubleValue,
               x.isFinite, y.isFinite, w.isFinite, h.isFinite, let panel {
                // Her drawn size is about 136 x 256 px: never accept more than ~2x that, and keep the origin on the panel.
                let pw = Double(panel.frame.width), ph = Double(panel.frame.height)
                let cw = min(max(w, 0), 300), ch = min(max(h, 0), 520)
                hitRect = CGRect(x: min(max(x, 0), pw), y: min(max(y, 0), ph), width: cw, height: ch)
            } else {
                hitRect = nil
            }
            updateHitTest()
        case "dragging":
            isDragging = (body["on"] as? Bool) == true
            dragCrossed = false
            updateHitTest()
        case "crossScreen":
            if let dir = (body["dir"] as? NSNumber)?.intValue, let y = (body["y"] as? NSNumber)?.doubleValue {
                crossScreen(dir: dir, y: y)
            }
        // Her mischief in the app never activates it or steals focus from another app.
        case "openView":
            // Going back to the dashboard view undoes her mischief and activates nothing: allowed in the background.
            if NSApp.isActive || (body["view"] as? String) == "dash", let v = body["view"] as? String {
                manager?.mascotOpenView(v)
            }
        case "navTap":
            // Closing the Settings she opened is allowed in the background (it activates nothing).
            if NSApp.isActive || (body["id"] as? String) == "settings:close", let id = body["id"] as? String {
                manager?.mascotNavTap(id)
            }
        case "closeTerminal":
            // She pressed the terminal's X button (the real one, which only hides the window); active app only.
            if let id = body["id"] as? String {
                // Not while the user is still typing there (stray keys must not land elsewhere): she keeps waiting at
                // the X and asks again; no answer until it is quiet for 1.2 s.
                if NSApp.isActive, let t = lastTypedAt[id], Date().timeIntervalSince(t) < 1.2 { break }
                // Keyboard focus could not be parked: nothing was closed and no reply is sent, so she keeps waiting and asks again.
                if NSApp.isActive, manager?.mascotPressClose(id) == false { break }
                sendEvent(["type": "closeDone", "id": id])
            }
        case "grabReady":
            if let x = (body["x"] as? NSNumber)?.doubleValue, let y = (body["y"] as? NSNumber)?.doubleValue,
               x.isFinite, y.isFinite {
                let ms = (body["ms"] as? NSNumber)?.doubleValue ?? 2500
                beginCursorHold(handX: x, handY: y, ms: ms.isFinite ? min(max(ms, 0), 10000) : 2500)
            }
        case "grabHand":
            if let x = (body["x"] as? NSNumber)?.doubleValue, let y = (body["y"] as? NSNumber)?.doubleValue,
               x.isFinite, y.isFinite {
                updateHoldTarget(x: x, y: y)
            }
        case "hideTerminal":
            if NSApp.isActive, let id = body["id"] as? String {
                manager?.mascotHideTerminal(id)
            }
        default:
            break
        }
    }

    // MARK: - Events from native hooks

    func updateSessions(_ list: [SessionBrief]) {
        for b in list where b.live {
            if let prev = lastStatus[b.id], prev != b.status {
                if b.status == "waiting" || (b.status == "idle" && (prev == "busy" || prev == "waiting")) || b.status == "failed" {
                    sendEvent(["type": "sessionStatus", "sid": b.id, "status": b.status, "prev": prev])
                }
            }
            lastStatus[b.id] = b.status
        }
        pushTerminalsNow()
    }

    /// Dashboard point offset: dashboard-relative top-left px to panel-relative top-left px.
    private func dashboardOffset() -> CGPoint? {
        guard let panel, let dw = dashboard else { return nil }
        let pf = panel.frame
        let df = dw.frame
        return CGPoint(x: df.minX - pf.minX, y: pf.maxY - df.maxY)
    }

    private func dashboardOnThisScreen() -> Bool {
        guard let panel, let dw = dashboard else { return false }
        return NSApp.isHidden == false && dw.isVisible && !dw.isMiniaturized && dw.frame.intersects(panel.frame)
    }

    /// CG rects (converted to panel-local) of the other apps' windows in front of window `num`, or nil if `num` is not
    /// on screen.
    private func occluders(inFrontOf num: Int?, off: CGPoint) -> [CGRect]? {
        guard let num, let idx = cgWindows.firstIndex(where: { $0.num == num }) else { return nil }
        return cgWindows[..<idx].filter { !$0.own }.map { localRect($0.rect, off) }
    }

    private func localRect(_ r: CGRect, _ off: CGPoint) -> CGRect {
        CGRect(x: r.minX - off.x, y: r.minY - off.y, width: r.width, height: r.height)
    }

    func pushTerminalsNow() {
        guard Self.isEnabled, loaded, shown, let panel else { return }
        var list: [[String: Any]] = []
        if dashboardOnThisScreen(), let doff = dashboardOffset(), let coff = cgToPanelOffset(),
           let snapshots = manager?.mascotTerminalSnapshots() {
            let dashOcc = occluders(inFrontOf: dashboard?.windowNumber, off: coff)
            for var t in snapshots {
                guard let x = (t["x"] as? NSNumber)?.doubleValue,
                      let y = (t["y"] as? NSNumber)?.doubleValue,
                      let w = (t["w"] as? NSNumber)?.doubleValue else { continue }
                let px = x + Double(doff.x)
                let py = y + Double(doff.y)
                let mid = px + w / 2
                guard mid >= 0, mid <= Double(panel.frame.width), py >= -40, py <= Double(panel.frame.height) else { continue }
                // The terminal's own window, else the dashboard's: the windows of other apps in front of it hide its title bar.
                let wn = (t["wn"] as? NSNumber)?.intValue
                guard let occ = occluders(inFrontOf: wn, off: coff) ?? dashOcc else { continue }
                let segs = visibleSegments(px, px + w, y: py + 6, occ: occ)
                guard let best = segs.max(by: { $0.1 - $0.0 < $1.1 - $1.0 }), best.1 - best.0 >= 60 else { continue }
                t["x"] = Int(best.0.rounded())
                t["y"] = Int(py.rounded())
                t["w"] = Int((best.1 - best.0).rounded())
                t.removeValue(forKey: "wn")
                if let cx = (t["cx"] as? NSNumber)?.doubleValue, let cy = (t["cy"] as? NSNumber)?.doubleValue,
                   let cw = (t["cw"] as? NSNumber)?.doubleValue, let ch = (t["ch"] as? NSNumber)?.doubleValue {
                    t["close"] = ["x": Int((cx + Double(doff.x)).rounded()), "y": Int((cy + Double(doff.y)).rounded()),
                                  "w": Int(cw.rounded()), "h": Int(ch.rounded())]
                }
                for k in ["cx", "cy", "cw", "ch"] { t.removeValue(forKey: k) }
                list.append(t)
            }
        }
        guard let json = jsonString(["type": "terminals", "list": list]) else { return }
        if json == lastTerminalsJSON { return }
        lastTerminalsJSON = json
        eval("window.__mascot?.onEvent(\(json))")
    }

    func updateWebPanels(_ panels: [[String: Any]], friends: [String: Any]?, nav: [[String: Any]] = []) {
        rawWebPanels = panels
        rawNavTargets = nav
        refreshPlatforms()
    }

    func updateSidebarLocalRects(_ rects: [SidebarPlatformRect]) {
        guard rects != sidebarLocalRects else { return }
        sidebarLocalRects = rects
        refreshPlatforms()
    }

    func refreshPlatforms() {
        guard Self.isEnabled, loaded, shown, let panel, let coff = cgToPanelOffset() else { return }
        var platforms: [[String: Any]] = []
        var navTargets: [[String: Any]] = []
        let W = Double(panel.frame.width)
        let H = Double(panel.frame.height)

        func emit(_ id: String, x: Double, y: Double, w: Double, h: Double, occ: [CGRect], extra: [String: Any] = [:]) {
            guard y >= 0, y <= H else { return }
            var k = 0
            for s in visibleSegments(max(0, x), min(W, x + w), y: y, occ: occ) where s.1 - s.0 >= 48 {
                var piece: [String: Any] = [
                    "id": k == 0 ? id : "\(id)#\(k)",
                    "x": Int(s.0.rounded()), "y": Int(y.rounded()),
                    "w": Int((s.1 - s.0).rounded()), "h": Int(h.rounded()),
                ]
                for (key, v) in extra { piece[key] = v }
                platforms.append(piece)
                k += 1
            }
        }

        // 1. Other apps' windows: each one's top edge, minus what the windows in front of it cover.
        let frontToBack = cgWindows
        let screenCG = CGRect(x: coff.x, y: coff.y, width: panel.frame.width, height: panel.frame.height)
        var count = 0
        for (i, win) in frontToBack.enumerated() where !win.own {
            guard win.rect.intersects(screenCG), count < 24 else { continue }
            let occ = frontToBack[..<i].map { localRect($0.rect, coff) }
            let l = localRect(win.rect, coff)
            let before = platforms.count
            emit("win:\(win.num)", x: Double(l.minX), y: Double(l.minY), w: Double(l.width), h: 0, occ: occ,
                 extra: ["wid": "win:\(win.num)", "wx": Int(l.minX.rounded()), "wy": Int(l.minY.rounded())])
            if platforms.count > before { count += 1 }
        }

        // 2. The dashboard's own surfaces, only where the user can see them.
        if dashboardOnThisScreen(), let doff = dashboardOffset(),
           let occ = occluders(inFrontOf: dashboard?.windowNumber, off: coff) {
            let ox = Double(doff.x), oy = Double(doff.y)
            func covered(_ x: Double, _ y: Double) -> Bool {
                occ.contains { $0.contains(CGPoint(x: x, y: y)) }
            }
            if let wz = manager?.mascotWebOriginAndZoom() {
                let wox = Double(wz.origin.x) + ox
                let woy = Double(wz.origin.y) + oy
                let z = Double(wz.zoom)
                for p in rawWebPanels {
                    guard let x = (p["x"] as? NSNumber)?.doubleValue,
                          let y = (p["y"] as? NSNumber)?.doubleValue,
                          let w = (p["w"] as? NSNumber)?.doubleValue,
                          let h = (p["h"] as? NSNumber)?.doubleValue,
                          w > 0, h > 0 else { continue }
                    emit(p["id"] as? String ?? "", x: wox + x * z, y: woy + y * z, w: w * z, h: h * z, occ: occ)
                }
                // Tapping tabs and the like is for the active app only: she never activates it from the background.
                if NSApp.isActive {
                    for n in rawNavTargets {
                        guard let id = n["id"] as? String, !id.isEmpty,
                              let x = (n["x"] as? NSNumber)?.doubleValue,
                              let y = (n["y"] as? NSNumber)?.doubleValue,
                              let w = (n["w"] as? NSNumber)?.doubleValue,
                              let h = (n["h"] as? NSNumber)?.doubleValue,
                              w > 0, h > 0 else { continue }
                        let nx = wox + x * z, ny = woy + y * z, nw = w * z, nh = h * z
                        if covered(nx + nw / 2, ny + nh / 2) { continue }
                        navTargets.append([
                            "id": id,
                            "x": Int(nx.rounded()), "y": Int(ny.rounded()),
                            "w": Int(nw.rounded()), "h": Int(nh.rounded()),
                        ])
                    }
                }
            }

            if let sf = manager?.mascotSidebarFrame() {
                let sx = Double(sf.minX) + ox, sy = Double(sf.minY) + oy
                emit("side:top", x: sx, y: sy, w: Double(sf.width), h: 24, occ: occ)
                let scrollRect = sidebarLocalRects.first(where: { $0.id == "__scroll__" })?.rect
                for item in sidebarLocalRects where item.id != "__scroll__" && item.rect.width > 8 && item.rect.height > 4 {
                    if let sr = scrollRect {
                        if item.rect.minY < sr.minY - 2 || item.rect.minY > sr.maxY - 8 { continue }
                    }
                    let rx = sx + Double(item.rect.minX)
                    let ry = sy + Double(item.rect.minY)
                    let rw = Double(item.rect.width)
                    let rh = Double(item.rect.height)
                    emit(item.id, x: rx, y: ry, w: rw, h: rh, occ: occ)
                    if NSApp.isActive, item.id.hasPrefix("side:") && item.id != "side:favorites", !covered(rx + rw / 2, ry + rh / 2) {
                        let cwd = String(item.id.dropFirst(5))
                        if !cwd.isEmpty {
                            navTargets.append(["id": "fold:\(cwd)", "x": Int(rx.rounded()), "y": Int(ry.rounded()),
                                               "w": Int(rw.rounded()), "h": Int(rh.rounded())])
                        }
                    }
                }
            }
        }

        guard let json = jsonString(["type": "platforms", "list": platforms, "nav": navTargets]) else { return }
        if json == lastPlatformsJSON { return }
        lastPlatformsJSON = json
        eval("window.__mascot?.onEvent(\(json))")
    }

    func onNativeEvents(_ events: [NativeEvent]) {
        guard Self.isEnabled, loaded else { return }
        for e in events {
            if e.kind == "result", let ok = e.ok {
                var payload: [String: Any] = ["type": "toolResult", "sid": e.sid, "ok": ok]
                if !ok, let loc = Self.extractFileLine(e.label) ?? Self.extractFileLine(e.meta) {
                    payload["loc"] = loc
                }
                sendEvent(payload)
            } else if e.kind == "sys",
                      e.meta.localizedCaseInsensitiveContains("err") || e.label.localizedCaseInsensitiveContains("err") {
                var payload: [String: Any] = ["type": "sysErr", "sid": e.sid]
                if let loc = Self.extractFileLine(e.label) ?? Self.extractFileLine(e.meta) {
                    payload["loc"] = loc
                }
                sendEvent(payload)
            }
        }
    }

    func onSocialJSON(_ json: String) {
        guard Self.isEnabled, loaded,
              let obj = try? JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any],
              let type = obj["type"] as? String else { return }
        if type == "xp", obj["levelUp"] as? Bool == true || obj["rankUp"] as? Bool == true {
            sendEvent(["type": "levelup", "level": obj["level"] ?? 0])
        } else if type == "badge" || type == "badge_unlock" {
            sendEvent(["type": "badge"])
        }
    }

    private var lastTypingSent: [String: Date] = [:]
    private var lastTypedAt: [String: Date] = [:] // every keystroke, not throttled

    /// The user typed into a chat terminal: at most once per ~2 s per chat, the mascot hears about it.
    func onTyping(_ chatId: String) {
        if !chatId.isEmpty { lastTypedAt[chatId] = Date() }
        guard Self.isEnabled, loaded, shown, mischief > 0, !chatId.isEmpty else { return }
        let now = Date()
        if let last = lastTypingSent[chatId], now.timeIntervalSince(last) < 2 { return }
        lastTypingSent[chatId] = now
        sendEvent(["type": "typing", "id": chatId])
    }

    func updateIdle(_ seconds: Double) {
        guard Self.isEnabled, loaded else { return }
        if abs(seconds - lastIdleSent) < 1.5 && !(lastIdleSent >= 2 && seconds < 2) { return }
        lastIdleSent = seconds
        sendEvent(["type": "idle", "seconds": seconds])
    }

    private func sendEvent(_ dict: [String: Any]) {
        guard Self.isEnabled, loaded, let json = jsonString(dict) else { return }
        eval("window.__mascot?.onEvent(\(json))")
    }

    private func eval(_ js: String) {
        webView?.evaluateJavaScript("\(js); true", completionHandler: nil)
    }

    private func jsonString(_ obj: Any) -> String? {
        guard let data = try? JSONSerialization.data(withJSONObject: obj, options: [.withoutEscapingSlashes]) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private static func extractFileLine(_ text: String) -> String? {
        guard !text.isEmpty,
              let range = text.range(of: #"[A-Za-z0-9_.-]+\.[A-Za-z0-9]+:\d+"#, options: .regularExpression) else { return nil }
        return String(text[range])
    }
}
