import AppKit
import WebKit

/// Saved shortcut folders, kept in ~/Library/Application Support/atalay-terminal: the 5 slices of the pie, and the 14
/// places around the new-terminal folder picker.
final class ShortcutStore {
    struct Slot: Codable {
        let name: String
        let dir: String
    }

    let count: Int
    private(set) var slots: [Slot?]
    private let url: URL

    init(file: String, count: Int) {
        self.count = count
        slots = Array(repeating: nil, count: count)
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: HOME + "/Library/Application Support")
        url = base.appendingPathComponent("atalay-terminal/" + file)
        if let data = try? Data(contentsOf: url), let saved = try? JSONDecoder().decode([Slot?].self, from: data) {
            slots = Array((saved + Array(repeating: nil, count: count)).prefix(count))
        }
    }

    var json: [Any] {
        slots.map { s -> Any in
            guard let s else { return NSNull() }
            var isDir: ObjCBool = false
            let missing = !(FileManager.default.fileExists(atPath: s.dir, isDirectory: &isDir) && isDir.boolValue)
            // `git`: a repo's folder (the Ring's right-click offers a worktree there). Absent on Windows: no entry then.
            return ["name": s.name, "dir": s.dir, "display": tildify(s.dir), "missing": missing, "git": !missing && Worktrees.info(of: s.dir) != nil]
        }
    }

    func save(_ raw: Any?) throws {
        guard let list = raw as? [Any], list.count == count else { throw err("need \(count) slots") }
        var next: [Slot?] = []
        for item in list {
            guard let d = item as? [String: Any], let dirRaw = d["dir"] as? String else {
                next.append(nil)
                continue
            }
            let dir = FolderLister.expand(dirRaw)
            // A slot that is already saved stays as it is, even if its folder was renamed or removed since: only
            // new folders are checked, so a missing one never blocks changing or clearing the others.
            if let kept = slots.compactMap({ $0 }).first(where: { $0.dir == dir }) {
                next.append(kept)
                continue
            }
            var isDir: ObjCBool = false
            guard FileManager.default.fileExists(atPath: dir, isDirectory: &isDir), isDir.boolValue else { throw err("not a folder: \(dirRaw)") }
            let name = (d["name"] as? String).flatMap { $0.isEmpty ? nil : String($0.prefix(40)) } ?? (dir as NSString).lastPathComponent
            next.append(Slot(name: name, dir: dir))
        }
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try JSONEncoder().encode(next).write(to: url, options: .atomic)
        slots = next
    }

    private func err(_ msg: String) -> NSError { NSError(domain: "shortcuts", code: 1, userInfo: [NSLocalizedDescriptionKey: msg]) }
}

/// Folder listing for the in-app picker (folders only, with git / Claude badges).
enum FolderLister {
    static func expand(_ p: String) -> String {
        if p == "~" { return HOME }
        if p.hasPrefix("~/") { return HOME + String(p.dropFirst(1)) }
        return p
    }

    static func list(_ raw: String, projects: String) -> [String: Any] {
        var dir = URL(fileURLWithPath: expand(raw.isEmpty ? "~" : raw)).standardizedFileURL.path
        // A folder that is gone (renamed in Finder): open the nearest one that still exists.
        var isDir: ObjCBool = false
        while dir != "/", !(FileManager.default.fileExists(atPath: dir, isDirectory: &isDir) && isDir.boolValue) {
            dir = (dir as NSString).deletingLastPathComponent
        }
        let parent: Any = dir == "/" ? NSNull() : (dir as NSString).deletingLastPathComponent
        let fm = FileManager.default
        guard let names = try? fm.contentsOfDirectory(atPath: dir) else {
            return ["path": dir, "display": tildify(dir), "parent": parent, "error": fm.isReadableFile(atPath: dir) ? "cannot open" : "no permission", "entries": []]
        }
        var entries: [[String: Any]] = []
        for n in names {
            if entries.count >= 600 { break }
            let full = (dir as NSString).appendingPathComponent(n)
            var isDir: ObjCBool = false
            guard fm.fileExists(atPath: full, isDirectory: &isDir), isDir.boolValue, !n.hasSuffix(".app") else { continue }
            let mtime = ((try? fm.attributesOfItem(atPath: full))?[.modificationDate] as? Date)?.timeIntervalSince1970 ?? 0
            let encoded = String(full.unicodeScalars.map { CharacterSet.alphanumerics.contains($0) && $0.isASCII ? Character($0) : "-" })
            entries.append([
                "name": n, "path": full, "hidden": n.hasPrefix("."), "modified": mtime * 1000,
                "git": fm.fileExists(atPath: full + "/.git"),
                // A folder made with `git worktree add` (its .git is a file that points into the main repo's).
                "worktree": Worktrees.isLinkedRoot(full),
                "claude": fm.fileExists(atPath: projects + "/" + encoded),
            ])
        }
        entries.sort { ($0["name"] as! String).localizedStandardCompare($1["name"] as! String) == .orderedAscending }
        return ["path": dir, "display": tildify(dir), "parent": parent, "entries": entries]
    }

    static func places(recents: [(path: String, t: Double)]) -> [String: Any] {
        let fav = finderFavorites() ?? [("Home", HOME), ("Desktop", HOME + "/Desktop"), ("Documents", HOME + "/Documents"),
                                         ("Downloads", HOME + "/Downloads")]
        let favorites: [[String: Any]] = fav.compactMap { name, path in
            var isDir: ObjCBool = false
            guard FileManager.default.fileExists(atPath: path, isDirectory: &isDir), isDir.boolValue else { return nil }
            var place: [String: Any] = ["name": name, "path": path, "display": tildify(path)]
            place["icon"] = icon(for: path)
            return place
        }
        let rec: [[String: Any]] = recents.map { ["name": ($0.path as NSString).lastPathComponent, "path": $0.path, "display": tildify($0.path), "t": $0.t] }
        return ["home": HOME, "favorites": favorites, "recents": rec]
    }

    /// Favorites from the Finder sidebar, in Finder's order. Read every time the picker opens, so it follows
    /// Finder. The list is a keyed archive (.sfl4 on macOS 26, .sfl3/.sfl2 before) of items with bookmarks;
    /// the path comes from the bookmark's stored values, without resolving it. Nil if it can't be read.
    private static func finderFavorites() -> [(name: String, path: String)]? {
        let base = HOME + "/Library/Application Support/com.apple.sharedfilelist/com.apple.LSSharedFileList.FavoriteItems."
        guard let data = ["sfl4", "sfl3", "sfl2"].lazy.compactMap({ FileManager.default.contents(atPath: base + $0) }).first,
              let root = try? NSKeyedUnarchiver.unarchivedObject(
                  ofClasses: [NSDictionary.self, NSArray.self, NSString.self, NSNumber.self, NSData.self, NSUUID.self], from: data) as? NSDictionary,
              let items = root["items"] as? [NSDictionary] else { return nil }
        let favorites: [(name: String, path: String)] = items.compactMap { item in
            guard (item["visibility"] as? Int ?? 0) == 0, let bookmark = item["Bookmark"] as? Data,
                  let values = URL.resourceValues(forKeys: [.pathKey, .localizedNameKey], fromBookmarkData: bookmark),
                  let path = values.path else { return nil }
            return (values.localizedName ?? (path as NSString).lastPathComponent, path)
        }
        return favorites.isEmpty ? nil : favorites
    }

    private static func icon(for path: String) -> String? {
        switch path {
        case HOME: return "home"
        case HOME + "/Desktop": return "desktop"
        case HOME + "/Documents": return "doc"
        case HOME + "/Downloads": return "down"
        default: return ["Repos", "Projects", "Developer", "Code", "GitHub"].contains((path as NSString).lastPathComponent) ? "code" : nil
        }
    }
}

/// Borderless panel over the whole screen that hosts the shortcut pie and the folder picker
/// (Resources/web/overlay.html) above every app window, including a full-screen dashboard.
final class OverlayPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }
}

@MainActor
final class OverlayController: NSObject, WKScriptMessageHandlerWithReply, WKNavigationDelegate {
    weak var manager: MainWindowController?
    let store = ShortcutStore(file: "shortcuts.json", count: 5)
    let around = ShortcutStore(file: "picker-shortcuts.json", count: 14)
    private let panel: OverlayPanel
    private let webView: WKWebView
    private let blur = NSVisualEffectView()
    private var ready = false
    private var pending: (() -> Void)?
    private var hideWork: DispatchWorkItem?
    /// The window a Create PR / Merge / Delete sheet dropped from: the panel sits on its frame while the sheet is open, and the window
    /// gets the keyboard back when it closes.
    private weak var anchorWindow: NSWindow?

    override init() {
        panel = OverlayPanel(contentRect: NSRect(x: 0, y: 0, width: 800, height: 600), styleMask: [.borderless, .nonactivatingPanel],
                             backing: .buffered, defer: false)
        let config = WKWebViewConfiguration()
        config.lockInspector()
        webView = WKWebView(frame: .zero, configuration: config)
        webView.lockInspector()
        super.init()
        ThemeStore.shared.attach(webView)
        config.userContentController.addScriptMessageHandler(self, contentWorld: .page, name: "overlay")
        webView.navigationDelegate = self
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = false
        panel.level = .popUpMenu
        panel.collectionBehavior = [.fullScreenAuxiliary, .moveToActiveSpace]
        panel.hidesOnDeactivate = false
        panel.isReleasedWhenClosed = false
        panel.appearance = NSAppearance(named: .darkAqua)

        let root = NSView()
        blur.material = .fullScreenUI
        blur.blendingMode = .behindWindow
        blur.state = .active
        blur.alphaValue = 0
        webView.setValue(false, forKey: "drawsBackground")
        for v in [blur, webView] as [NSView] {
            v.translatesAutoresizingMaskIntoConstraints = false
            root.addSubview(v)
            NSLayoutConstraint.activate([
                v.topAnchor.constraint(equalTo: root.topAnchor), v.bottomAnchor.constraint(equalTo: root.bottomAnchor),
                v.leadingAnchor.constraint(equalTo: root.leadingAnchor), v.trailingAnchor.constraint(equalTo: root.trailingAnchor),
            ])
        }
        panel.contentView = root
        let dir = RadarView.webDirectory()
        WebIntegrity.check()
        webView.loadFileURL(dir.appendingPathComponent("overlay.html"), allowingReadAccessTo: dir)
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        decisionHandler(PagePolicy.decide(action))
    }

    var isVisible: Bool { panel.isVisible }

    /// Pie menu centred on a screen point (four-finger click).
    func showShortcuts(at point: NSPoint) {
        let screen = NSScreen.screens.first(where: { NSMouseInRect(point, $0.frame, false) }) ?? NSScreen.main ?? NSScreen.screens[0]
        let f = screen.frame
        present(on: screen) { [weak self] in
            let how = Shortcuts.ringHint.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "\"", with: "\\\"")
            self?.webView.evaluateJavaScript("Overlay.shortcuts(\(point.x - f.minX), \(f.maxY - point.y), \"\(how)\")")
        }
        // Found it: the dashboard stops offering its tip.
        manager?.wheelOpened()
    }

    /// Folder picker for a new terminal; `worktree`: opened for a new worktree (Chat → New Worktree…), its main button the sheet's.
    func showNewTerminal(worktree: Bool = false) {
        let screen = NSScreen.main ?? NSScreen.screens[0]
        present(on: screen) { [weak self] in self?.webView.evaluateJavaScript("Overlay.newTerminal({ worktree: \(worktree) })") }
    }

    /// The name sheet for a new worktree of the repo `dir` is in, on its own (the chats list's ⎇, a menu): no picker.
    /// `moving`: the chat this was opened from (its window, session, AI's name, folder's name): the sheet offers that chat's AI and
    /// says it keeps running; when the worktree is there, the new AI opens in the usual place and the old chat's strip says so
    /// (MainWindowController.finishMove). Nothing of the old chat is closed.
    func showNewWorktree(from dir: String, ai: String? = nil, moving: (window: String, sid: String, tool: String, folder: String)? = nil) {
        let screen = NSScreen.main ?? NSScreen.screens[0]
        var opts: [String: Any] = ["dir": dir]
        if let ai { opts["ai"] = ai }
        if let moving { opts["moving"] = ["replacing": moving.window, "sid": moving.sid, "tool": moving.tool, "folder": moving.folder] }
        let arg = (try? JSONSerialization.data(withJSONObject: [opts], options: [])).flatMap { String(data: $0, encoding: .utf8) } ?? "[{}]"
        present(on: screen) { [weak self] in self?.webView.evaluateJavaScript("Overlay.newWorktree(\(arg)[0].dir, \(arg)[0])") }
    }

    /// The Create PR, Merge or Delete sheet of the worktree `top` (web/worktree.js). `window`: the chat window it drops from; the panel
    /// takes its frame, so only that window is covered (its header, 62 pt, stays bright) and the others stay usable. Without one it
    /// stands alone in the middle of the screen, as the name sheet does. The panel's blur isn't touched for a window's sheet (0).
    func showShip(kind: String, top: String, window: NSWindow?) {
        let screen = window?.screen ?? NSScreen.main ?? NSScreen.screens[0]
        let anchored = window != nil
        let opts: [String: Any] = ["kind": kind, "top": top, "anchored": anchored]
        let arg = (try? JSONSerialization.data(withJSONObject: [opts], options: [])).flatMap { String(data: $0, encoding: .utf8) } ?? "[{}]"
        // A sheet that is at work (or the name sheet making a worktree) is never replaced: the panel stays where it is.
        let open = { [weak self] in
            guard let self else { return }
            self.anchorWindow = window
            self.present(on: screen, frame: window?.frame, blurred: !anchored) { [weak self] in self?.webView.evaluateJavaScript("Overlay.ship(\(arg)[0])") }
        }
        guard ready, panel.isVisible else { return open() }
        webView.evaluateJavaScript("!!(window.Worktree && Worktree.isBusy())") { busy, _ in
            MainActor.assumeIsolated { if busy as? Bool == true { NSSound.beep() } else { open() } }
        }
    }

    /// The sheet's progress: the step that has just started ("commit", "push", "pr", "merge", "end", "trash", "branch").
    func shipStep(_ name: String) {
        webView.evaluateJavaScript("window.Worktree && Worktree.shipStep('\(name)')")
    }

    /// The page's progress line: "made" (git is done), "copied" (n files).
    private func step(_ name: String, _ n: Int) {
        webView.evaluateJavaScript("window.Worktree && Worktree.step('\(name)', \(n))")
    }

    private func present(on screen: NSScreen, frame: NSRect? = nil, blurred: Bool = true, _ js: @escaping () -> Void) {
        hideWork?.cancel()
        panel.setFrame(frame ?? screen.frame, display: true)
        if !panel.isVisible {
            blur.alphaValue = 0
            panel.orderFrontRegardless()
            if blurred {
                NSAnimationContext.runAnimationGroup { ctx in
                    ctx.duration = 0.22
                    blur.animator().alphaValue = 0.85
                }
            }
        } else if !blurred {
            // A sheet that sits on a window: no blur of the screen (the panel was showing another page a moment ago).
            blur.alphaValue = 0
        }
        panel.makeKey()
        if ready { js() } else { pending = js }
    }

    func hide() {
        guard panel.isVisible else { return }
        WorktreeShip.shared.clearSession()
        // The window a sheet dropped from has the keyboard again.
        if let w = anchorWindow {
            anchorWindow = nil
            if w.isVisible { w.makeKeyAndOrderFront(nil) }
        }
        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = 0.2
            blur.animator().alphaValue = 0
        }
        let work = DispatchWorkItem { [weak self] in self?.panel.orderOut(nil) }
        hideWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.22, execute: work)
    }

    /// The overlay page's process died: reload it; it reports "ready" again.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        ready = false
        webView.reload()
    }

    /// Whether `top` is a linked worktree the app knows (a sheet's request can't point git at any other folder).
    private func shipKnows(_ top: String) -> Bool {
        // Exactly a worktree's own folder (never a folder inside one, never the main repo), the one the app already read or reads now.
        if WorktreeShip.shared.status[top]?.top == top { return true }
        guard let info = Worktrees.info(of: top) else { return false }
        return info.linked && info.top == top && Worktrees.real(top) == top
    }

    /// "picker": the places around the new-terminal folder picker; anything else, the pie.
    private func slots(_ body: [String: Any]) -> ShortcutStore { body["set"] as? String == "picker" ? around : store }

    // MARK: WKScriptMessageHandlerWithReply

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else {
            replyHandler(nil, "bad message")
            return
        }
        switch type {
        case "ready":
            ready = true
            pending?()
            pending = nil
            replyHandler(true, nil)
        case "listDir":
            replyHandler(FolderLister.list(body["path"] as? String ?? "~", projects: manager?.engine.projects ?? ""), nil)
        case "places":
            guard let manager else { return replyHandler(FolderLister.places(recents: []), nil) }
            manager.engine.recentFolders(12) { recents in replyHandler(FolderLister.places(recents: recents), nil) }
        case "getSlots":
            replyHandler(["slots": slots(body).json], nil)
        case "saveSlots":
            do {
                let set = slots(body)
                try set.save(body["slots"])
                replyHandler(["slots": set.json], nil)
            } catch {
                replyHandler(["error": error.localizedDescription], nil)
            }
        case "newTerminal":
            let dir = FolderLister.expand(body["dir"] as? String ?? "")
            hide()
            if !dir.isEmpty { manager?.newTerminal(in: dir, nudgeTold: body["told"] as? Bool == true) }
            replyHandler(true, nil)
        // The new-worktree sheet. Reads of files only (the picker asks as the selection moves)...
        case "gitInfo":
            let p = FolderLister.expand(body["path"] as? String ?? "")
            if let info = Worktrees.info(of: p) {
                replyHandler(["repo": true, "worktree": info.linked, "branch": info.branch, "ais": manager?.aiTools(inTreeOf: p) ?? []], nil)
            } else {
                replyHandler(["repo": false, "worktree": false, "branch": ""], nil)
            }
        // ...git, off the main thread: what the sheet shows, and the worktree itself.
        case "worktreeInfo":
            let dir = body["dir"] as? String ?? ""
            Git.queue.async {
                let answer = Git.describe(dir)
                DispatchQueue.main.async { MainActor.assumeIsolated { replyHandler(answer, nil) } }
            }
        case "worktreeCreate":
            let dir = body["dir"] as? String ?? "", name = body["name"] as? String ?? ""
            let ai = Git.worktreeAIs.contains(body["ai"] as? String ?? "") ? body["ai"] as? String ?? "claude" : "claude"
            UserDefaults.standard.set(ai, forKey: Git.worktreeAIKey)
            Git.queue.async { [weak self] in
                var answer = Git.addWorktree(from: dir, name: name)
                if answer["ok"] != nil {
                    DispatchQueue.main.async { MainActor.assumeIsolated { self?.step("made", 0) } }
                    let list = answer["copy"] as? [String] ?? []
                    let done = Worktrees.copy(list, from: answer["source"] as? String ?? "", to: answer["path"] as? String ?? "")
                    answer["copied"] = done.copied
                    answer["warnings"] = done.warnings
                    DispatchQueue.main.async { MainActor.assumeIsolated { self?.step("copied", done.copied) } }
                }
                answer["source"] = nil
                answer["copy"] = nil
                DispatchQueue.main.async { MainActor.assumeIsolated { replyHandler(answer, nil) } }
            }
        // The worktree is there: the AI starts in it (also "Open … anyway" after a copy warning).
        case "worktreeOpen":
            let path = body["path"] as? String ?? ""
            let ai = body["ai"] as? String ?? "claude"
            hide()
            if path.isEmpty {
            } else if let replacing = body["replacing"] as? String, let sid = body["sid"] as? String {
                manager?.finishMove(replacing: replacing, sid: sid, path: path, ai: ai)
            } else {
                manager?.newChat(in: path, ai: ai)
            }
            replyHandler(true, nil)
        // The Create PR / Merge / Delete sheets (web/worktree.js; WorktreeShip.swift does the work, git off the main thread).
        case "shipInfo":
            let top = body["top"] as? String ?? "", kind = body["kind"] as? String ?? ""
            guard shipKnows(top) else { return replyHandler(["error": "This isn't a worktree."], nil) }
            WorktreeShip.shared.page(for: kind, top: top) { replyHandler($0, nil) }
        case "shipCreatePR":
            let top = body["top"] as? String ?? ""
            guard shipKnows(top) else { return replyHandler(["kind": "nothing", "title": "This isn't a worktree."], nil) }
            WorktreeShip.shared.createPR(top: top, title: body["title"] as? String ?? "", body: body["body"] as? String ?? "", into: body["into"] as? String ?? "") { replyHandler($0, nil) }
        case "shipMerge":
            let top = body["top"] as? String ?? ""
            guard shipKnows(top) else { return replyHandler(["kind": "nothing", "title": "This isn't a worktree."], nil) }
            WorktreeShip.shared.mergeLocal(top: top, message: body["message"] as? String ?? "") { replyHandler($0, nil) }
        case "shipMergePR":
            let top = body["top"] as? String ?? ""
            guard shipKnows(top) else { return replyHandler(["kind": "nothing", "title": "This isn't a worktree."], nil) }
            WorktreeShip.shared.mergePR(top: top, number: (body["number"] as? NSNumber)?.intValue ?? 0, sha: body["sha"] as? String ?? "",
                                        method: body["method"] as? String ?? "merge") { replyHandler($0, nil) }
        case "shipPushBase":
            let top = body["top"] as? String ?? ""
            guard shipKnows(top) else { return replyHandler(["kind": "nothing", "title": "This isn't a worktree."], nil) }
            WorktreeShip.shared.pushBase(top: top) { replyHandler($0, nil) }
        case "shipDelete":
            let top = body["top"] as? String ?? ""
            guard shipKnows(top) else { return replyHandler(["kind": "nothing", "title": "This isn't a worktree."], nil) }
            WorktreeShip.shared.delete(top: top, deleteBranch: body["deleteBranch"] as? Bool == true, force: body["force"] as? Bool == true,
                                       ids: body["ids"] as? [String] ?? [], sha: body["sha"] as? String ?? "") { replyHandler($0, nil) }
        case "shipAsk":
            WorktreeShip.shared.ask(body["prompt"] as? String ?? "", sid: body["sid"] as? String ?? "") { replyHandler($0, nil) }
        case "shipCopy":
            NSPasteboard.general.clearContents()
            NSPasteboard.general.setString(body["text"] as? String ?? "", forType: .string)
            replyHandler(true, nil)
        case "shipOpenURL":
            let top = body["top"] as? String ?? ""
            let host = WorktreeShip.shared.status[top]?.remote?.host ?? ""
            replyHandler(WorktreeShip.shared.open(body["url"] as? String ?? "", host: host), nil)
        case "shipShowChanges":
            // Any folder of a repo the app shows (the base's folder too): Source Control only opens what it lists.
            let top = body["top"] as? String ?? ""
            hide()
            if !top.isEmpty { manager?.showSourceControl(root: top) }
            replyHandler(true, nil)
        case "shipShowChat":
            let sid = body["sid"] as? String ?? ""
            hide()
            manager?.showChat(sessionId: sid)
            replyHandler(true, nil)
        case "revealFolder":
            let path = body["path"] as? String ?? ""
            var isDir: ObjCBool = false
            if FileManager.default.fileExists(atPath: path, isDirectory: &isDir), isDir.boolValue {
                // The overlay floats above every window, Finder's included: it goes first.
                hide()
                NSWorkspace.shared.activateFileViewerSelecting([URL(fileURLWithPath: path)])
            }
            replyHandler(true, nil)
        case "done":
            hide()
            replyHandler(true, nil)
        default:
            replyHandler(nil, "unknown message")
        }
    }
}
