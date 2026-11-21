import AppKit
import SwiftTerm

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    let engine = RadarEngine()
    private var controller: MainWindowController!
    private var monitors: [Any] = []

    func applicationDidFinishLaunching(_ notification: Notification) {
        // A build an earlier run staged but never restarted into goes in first: nothing runs yet, so nothing can stop
        // the quit, and the new build comes up in its place (the swap's script opens it).
        if let staged = Updater.leftover() { try? Updater.apply(staged, relaunch: true) }
        // The pages checked against this build's own before anything signs a call (WebIntegrity); and what the shared
        // URL cache kept of the API's calls (token and signature included) before they went through a session of their
        // own (Cloud.session) goes.
        WebIntegrity.check()
        URLCache.shared.removeAllCachedResponses()
        NSApp.appearance = NSAppearance(named: .darkAqua)
        Mur47.registerFonts()
        buildMenu()
        controller = MainWindowController(engine: engine)
        controller.showWindow(nil)
        // The token savers this build ships go on by themselves the first time (Settings turns them off).
        TokenSavers.autoStart()
        // The notes' tools on Orbiterm's MCP server, for the AIs inside Orbiterm and, when the Claude access is on, Claude Desktop / Dispatch, each checked against the notes' own mode at every call;
        // they reach the AIs through the notes-only launcher, which offers no session tool.
        McpConnect.writeLauncher()
        NotesAI.launcher = McpConnect.notesLauncher
        for t in NotesTools.all {
            McpRegistry.register(McpTool(name: t.name, title: t.title, description: t.description, props: t.props, required: t.required,
                                         readOnly: t.readOnly, audience: t.audience, enabled: { NotesAI.mode != .off },
                                         handler: { a, c in t.handler(a, NotesCaller(peer: c.peer, insideScreen: c.insideScreen, hubMode: c.mode)) }))
        }
        NotesAI.autoStart()
        AIColors.autoStart()
        controller.window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        installMonitors()
        if !Trackpad.start() { NSLog("Orbiterm: trackpad finger tracking unavailable; ⌃ and the middle mouse button open the Ring") }
        NSWorkspace.shared.notificationCenter.addObserver(forName: NSWorkspace.didWakeNotification, object: nil, queue: .main) { _ in
            Trackpad.start()
            // Sleep kills the live line to the API without a word; open a fresh one.
            MainActor.assumeIsolated { Social.shared.kick() }
        }
        engine.start()
        McpHub.shared.onChange = { [weak self] in self?.controller.pushMcp() }
        McpHub.shared.start()
        controller.restoreSessions()
        HangWatchdog.shared.start()
        Cloud.shared.installUpdatesRightAway = CommandLine.arguments.contains("--update")
        // An update restarts the app only when that stops nothing: no AI is working or waiting for the user in a terminal,
        // no job runs in a plain shell (the restart ends the shells; idle AI chats resume), no worktree job is under way and no
        // env file holds unsaved changes.
        Cloud.shared.canRestart = { [weak self] in (self?.controller?.restartInterrupts().isEmpty ?? true) && !ShipJobs.running && !(self?.controller?.hasUnsavedEnv ?? false) }
        Cloud.shared.start()
        UpdateWatch.shared.start()
        // Load the notices' page now, so a message can pop up at any time; the chat window follows a little later,
        // hidden, so opening a chat is instant.
        _ = MessagePanel.notices
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { MessagePanel.warmChat() }
        // A newer build than last time (it updated itself, maybe while the user was away): say so in the corner, with
        // what's new in it, once; its notes count as unread in the notifications until they're opened.
        let build = Cloud.shared.build, last = UserDefaults.standard.integer(forKey: "lastRunBuild")
        if build > 0 {
            if last > 0, build > last {
                UserDefaults.standard.set(build, forKey: MainWindowController.whatsNewKey)
                MessagePanel.notices.announce(updated: Cloud.shared.version, build: build)
            }
            UserDefaults.standard.set(build, forKey: "lastRunBuild")
        }
        handleLaunchArguments()
    }

    // Closing the dashboard keeps the app (and every running chat) alive; the Dock icon brings it back.
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }

    // A downloaded update waiting for the user to step away goes in now: the next launch is the new build.
    func applicationWillTerminate(_ notification: Notification) {
        McpHub.shared.stop()
        Cloud.shared.installOnQuit()
    }

    private var finishingWindow: NSPanel?

    /// "Finishing Creating PR…": a small panel over the screen while a quit waits for a job.
    private func finishingPanel(_ what: String) {
        let label = NSTextField(labelWithString: "\(what) Orbiterm quits right after.")
        label.font = .systemFont(ofSize: 13, weight: .medium)
        label.sizeToFit()
        let panel = NSPanel(contentRect: NSRect(x: 0, y: 0, width: label.frame.width + 40, height: 44), styleMask: [.titled, .hudWindow, .utilityWindow], backing: .buffered, defer: false)
        panel.title = "Orbiterm"
        label.frame.origin = NSPoint(x: 20, y: 10)
        panel.contentView?.addSubview(label)
        panel.level = .floating
        panel.center()
        panel.makeKeyAndOrderFront(nil)
        finishingWindow = panel
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        controller.showDashboard()
        return true
    }

    /// A quit waiting for a worktree job (push, merge, delete): while it waits a second quit asks nothing more, and when it ends the
    /// ordinary quit runs inside this same answer (never a "no" followed by a new quit: that would skip its question and its cleanup).
    private var quitWaiting = false
    private var quitWaited = false

    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        // Only a call that reaches this delegate while waiting; a quit from code (an update restart) is stopped by Cloud.quitPending.
        if quitWaiting { return .terminateLater }
        // Env changes not saved are asked about first, before any job or quit question; Cancel keeps the app.
        if !(controller?.confirmEnvBeforeQuit() ?? true) { return .terminateCancel }
        // A push, merge or delete under way (a worktree's sheet, its chat-ending phase included) finishes first: no half-done job. A small
        // panel says what is being finished; then the usual quit goes on, or after three minutes whatever still runs.
        if !quitWaited, ShipJobs.running {
            quitWaiting = true
            Cloud.shared.quitPending = true
            finishingPanel(WorktreeShip.shared.busy.values.first ?? "A worktree job is finishing.")
            let started = Date()
            // In the common modes: the quit waits in the modal run loop, where a default-mode timer never fires.
            let timer = Timer(timeInterval: 0.3, repeats: true) { t in
                MainActor.assumeIsolated {
                    guard !ShipJobs.running || Date().timeIntervalSince(started) > 180 else { return }
                    t.invalidate()
                    self.finishingWindow?.orderOut(nil)
                    self.finishingWindow = nil
                    self.quitWaiting = false
                    self.quitWaited = true
                    switch self.quitFlow() {
                    case .terminateNow: NSApp.reply(toApplicationShouldTerminate: true)
                    case .terminateCancel:
                        self.quitWaited = false
                        Cloud.shared.quitPending = false
                        NSApp.reply(toApplicationShouldTerminate: false)
                    default: break   // the flow answers itself, later
                    }
                }
            }
            RunLoop.main.add(timer, forMode: .common)
            return .terminateLater
        }
        quitWaited = false
        return quitFlow()
    }

    private func quitFlow() -> NSApplication.TerminateReply {
        // An update's restart ends the terminals too, but they come back with the new build (the snapshot): it only asks when
        // that would cut something off. Any other quit closes all of them for good.
        let relaunch = Updater.relaunching
        let forced = Cloud.shared.overdueForcedUpdate
        if relaunch {
            let lost = controller?.restartInterrupts() ?? []
            if !lost.isEmpty, !forced {
                let a = NSAlert()
                a.messageText = "Restart to update?"
                let shown = lost.prefix(3).joined(separator: ", ") + (lost.count > 3 ? " and \(lost.count - 3) more" : "")
                a.informativeText = "Orbiterm restarts to update. What runs in its terminals stops: \(shown). Claude, Codex and Antigravity chats come back after the restart and continue where they were."
                a.alertStyle = .warning
                a.addButton(withTitle: "Restart")
                a.addButton(withTitle: "Cancel")
                if a.runModal() != .alertFirstButtonReturn { return .terminateCancel }
            }
        } else {
            let total = Sessions.live.count + (Detached.available ? Detached.ownedDaemons().count : 0)
            if total > 0, !forced {
                let a = NSAlert()
                a.messageText = total == 1 ? "1 terminal is still running" : "\(total) terminals are still running"
                a.informativeText = "Quitting closes every terminal and everything running in it: chats, panes, plain terminals and their programs, including hidden ones. Conversations stay saved and can be resumed."
                a.alertStyle = .warning
                a.addButton(withTitle: "Quit")
                a.addButton(withTitle: "Cancel")
                if a.runModal() != .alertFirstButtonReturn { return .terminateCancel }
            }
        }
        // A file edited in the last second is saved first (Source Control's editor saves a second after a change).
        guard let controller else { return .terminateNow }
        controller.flushFiles {
            let shells = controller.terminateAll(relaunching: relaunch)
            // The reply goes through the run loop, like flushFiles' `done`: a quit asked for from a main-queue job waits
            // in a run loop nested in that job, where the main queue runs nothing. A block queued from another thread
            // waits for the run loop's next wake-up, so it is woken.
            DispatchQueue.global(qos: .userInitiated).async {
                Detached.killTrees(shells)
                // Screen sessions an older build left: a real quit closes them (the quit-all), an update keeps them.
                if !relaunch, Detached.available { Detached.quitAll() }
                RunLoop.main.perform(inModes: [.common]) { MainActor.assumeIsolated { NSApp.reply(toApplicationShouldTerminate: true) } }
                CFRunLoopWakeUp(CFRunLoopGetMain())
            }
        }
        return .terminateLater
    }

    /// `--new-terminal <folder>` / `--open-session <id>` (repeatable) / `--shortcuts`: open windows or the pie right after launch.
    private func handleLaunchArguments() {
        let args = CommandLine.arguments
        if let i = args.firstIndex(of: "--new-terminal"), i + 1 < args.count {
            controller.newTerminal(in: args[i + 1])
        }
        let sessions = args.indices.filter { args[$0] == "--open-session" && $0 + 1 < args.count }.map { args[$0 + 1] }
        if !sessions.isEmpty { controller.openWhenReady(sessions) }
        if args.contains("--shortcuts") {
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
                guard let f = self?.controller.window?.frame else { return }
                self?.controller.overlay.showShortcuts(at: NSPoint(x: f.midX, y: f.midY))
            }
        }
    }

    private func installMonitors() {
        // While the level-up takeover plays, keys do nothing, as if the app were hacked for a moment (MessagePanel);
        // once its lock is over, a key ends it.
        if let m = NSEvent.addLocalMonitorForEvents(matching: [.keyDown, .keyUp], handler: { event in
            if MessagePanel.holds(event) { return nil }
            // ⌘V, ⌘C, ⌘X and ⌘A in the message panels (MessagePanel.editKey).
            if event.type == .keyDown, MessagePanel.editKey(event) { return nil }
            return event
        }) { monitors.append(m) }

        // Four-finger click anywhere in the app opens the shortcut pie at the pointer (a three-finger click is Settings' choice: many
        // people drag or scroll with them, and each such drag opened the pie). With two-finger
        // secondary click on, macOS delivers it as a right click, so that is caught before any context menu.
        if let m = NSEvent.addLocalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown], handler: { [weak self] event in
            guard Shortcuts.fingersOpen, let self else { return event }
            self.controller.overlay.showShortcuts(at: NSEvent.mouseLocation)
            return nil
        }) { monitors.append(m) }
        // The same with a mouse: ⌃ and its middle button (the wheel pressed), or what was set in Settings › Shortcuts.
        if let m = NSEvent.addLocalMonitorForEvents(matching: .otherMouseDown, handler: { [weak self] event in
            guard Shortcuts.wheelOpens(event), let self else { return event }
            self.controller.overlay.showShortcuts(at: NSEvent.mouseLocation)
            return nil
        }) { monitors.append(m) }

        // The mouse wheel over a terminal goes to the program in front when that is Claude (see ChatTerminalView).
        if let m = NSEvent.addLocalMonitorForEvents(matching: .scrollWheel, handler: { event in
            guard let hit = event.window?.contentView?.hitTest(event.locationInWindow),
                  let tv = sequence(first: hit, next: { $0.superview }).first(where: { $0 is ChatTerminalView }) as? ChatTerminalView,
                  tv.wheelGoesToProgram() else { return event }
            tv.allowMouseReporting = true
            // Not in the middle of a drag that goes to Claude (it ends with the mouse button).
            DispatchQueue.main.async { if !tv.mouseToProgram { tv.allowMouseReporting = false } }
            return event
        }) { monitors.append(m) }

        // Fn+Control with an arrow (or F, C, R) tiles a chat window like macOS does, which it doesn't for windows
        // pinned above the dashboard. On Apple keyboards Fn turns the arrows into Home/End/Page Up/Page Down.
        if let m = NSEvent.addLocalMonitorForEvents(matching: .keyDown, handler: { event in
            if MessagePanel.holds(event) { return nil }
            let mods = event.modifierFlags.intersection([.control, .option, .command, .shift])
            guard mods == .control, CGEventSource.flagsState(.combinedSessionState).contains(.maskSecondaryFn),
                  [123, 124, 125, 126, 115, 119, 116, 121, 3, 8, 15].contains(event.keyCode),
                  let chat = event.window?.delegate as? ChatWindowController else { return event }
            chat.tile(key: event.keyCode)
            return nil
        }) { monitors.append(m) }

        // Editing keys the Mac way, in Claude's prompt and the shell's line: Shift/Option+Return a new line (ESC CR),
        // Option+Delete deletes a word back, Option+fn+Delete a word ahead, Option+←/→ jump a word. Option types
        // characters otherwise, so these go as Meta by hand. Not when the program enabled the kitty keyboard
        // protocol: SwiftTerm encodes keys itself then.
        if let m = NSEvent.addLocalMonitorForEvents(matching: .keyDown, handler: { event in
            if MessagePanel.holds(event) { return nil }
            let mods = event.modifierFlags.intersection(.deviceIndependentFlagsMask).subtracting([.numericPad, .function, .capsLock])
            guard mods == .shift || mods == .option, let tv = event.window?.firstResponder as? ChatTerminalView,
                  tv.keyboardEnhancementFlags.isEmpty else { return event }
            let bytes: [UInt8]
            switch (event.keyCode, mods == .option) {
            case (36, _), (76, _): bytes = [0x1B, 0x0D]
            case (51, true): bytes = [0x1B, 0x7F]
            case (117, true): bytes = [0x1B, 0x64]
            case (123, true): bytes = [0x1B, 0x62]
            case (124, true): bytes = [0x1B, 0x66]
            default: return event
            }
            tv.send(data: bytes[...])
            return nil
        }) { monitors.append(m) }
        // The one monitor for Esc (monitors run in no fixed order, so each Esc feature is a step of this chain): the key lock,
        // then Esc closes the terminal in front as ⌘W does, when Settings › Shortcuts swaps Esc and ⌘W, whatever runs in it (EscClose).
        if let m = NSEvent.addLocalMonitorForEvents(matching: .keyDown, handler: { event in
            if MessagePanel.holds(event) { return nil }
            return EscClose.handle(event) || AgyRewind.handle(event) ? nil : event
        }) { monitors.append(m) }
    }

    // MARK: menu

    private func buildMenu() {
        let main = NSMenu()
        func submenu(_ title: String) -> NSMenu {
            let item = NSMenuItem()
            let menu = NSMenu(title: title)
            item.submenu = menu
            main.addItem(item)
            return menu
        }
        @discardableResult
        func add(_ menu: NSMenu, _ title: String, _ action: Selector, _ key: String,
                 _ mods: NSEvent.ModifierFlags = [.command], target: AnyObject? = nil) -> NSMenuItem {
            let item = NSMenuItem(title: title, action: action, keyEquivalent: key)
            item.keyEquivalentModifierMask = mods
            item.target = target
            menu.addItem(item)
            return item
        }
        // An action whose keys the user can change (Shortcuts, the dashboard's Settings › Shortcuts).
        @discardableResult
        func keyed(_ menu: NSMenu, _ id: String, _ title: String, _ action: Selector, target: AnyObject? = nil) -> NSMenuItem {
            let item = Shortcuts.item(id, title: title, action: action, target: target)
            menu.addItem(item)
            return item
        }

        let app = submenu("Orbiterm")
        add(app, "About Orbiterm", #selector(NSApplication.orderFrontStandardAboutPanel(_:)), "")
        app.addItem(.separator())
        // Apple's place for an app's settings (HIG, The menu bar): the dashboard's Settings, on the category used last
        // (web/cloud.js). No key: it's clicked, like the gear (Atalay, 2026-11-15); ⌘, stays out of the user's keys
        // (Shortcuts.reserved).
        add(app, "Settings…", #selector(showSettings), "", target: self)
        // Clean Up: what slows the Mac down, ticked and ended on one page (Cleanup.swift). No key unless the user sets one.
        keyed(app, "cleanUp", "Clean Up…", #selector(showCleanup), target: self)
        app.addItem(.separator())
        add(app, "Hide Orbiterm", #selector(NSApplication.hide(_:)), "h")
        add(app, "Hide Others", #selector(NSApplication.hideOtherApplications(_:)), "h", [.command, .option])
        app.addItem(.separator())
        add(app, "Quit Orbiterm", #selector(NSApplication.terminate(_:)), "q")

        // iTerm2's keys (its Shell and Window menus, read from iTerm2 3.7): tabs and split panes in the chat or terminal
        // window in front (Panes.swift).
        let file = submenu("Chat")
        keyed(file, "newTerminal", "New Terminal…", #selector(newTerminal), target: self)
        keyed(file, "newWorktree", "New Worktree…", #selector(newWorktree), target: self)
        keyed(file, "moveToWorktree", "Open in a Worktree…", #selector(moveToWorktree), target: self)
        // The window in front, when it is in a worktree: send its work as a pull request, merge it here, or delete the worktree
        // (WorktreeShip.swift). Merge and Delete have no key: rare, and Delete can't be undone by a slip of the finger.
        file.addItem(.separator())
        keyed(file, "createPR", "Create Pull Request…", #selector(createPR), target: self)
        add(file, "Merge into Base Branch…", #selector(mergeWorktree), "", target: self)
        add(file, "Delete Worktree…", #selector(deleteWorktree), "", target: self)
        file.addItem(.separator())
        // VS Code's: a new file in Source Control's editor.
        keyed(file, "newFile", "New File", #selector(newFile), target: self)
        keyed(file, "newTab", "New Tab", #selector(newTab), target: self)
        keyed(file, "newTabNext", "New Tab Next to Current Tab", #selector(newTab), target: self)
        keyed(file, "splitVertically", "Split Vertically", #selector(splitVertically), target: self)
        keyed(file, "splitHorizontally", "Split Horizontally", #selector(splitHorizontally), target: self)
        keyed(file, "shortcutsWheel", "Ring", #selector(showShortcuts), target: self)
        file.addItem(.separator())
        keyed(file, "closePane", "Close", #selector(closePane), target: self)
        keyed(file, "closeWindow", "Close Terminal Window", #selector(NSWindow.performClose(_:)))
        keyed(file, "undoClose", "Undo Close", #selector(undoClose), target: self)

        let edit = submenu("Edit")
        // The file editor's (a web page cuts only through the menu); a terminal has nothing to cut.
        add(edit, "Cut", #selector(NSText.cut(_:)), "x")
        add(edit, "Copy", #selector(NSText.copy(_:)), "c")
        keyed(edit, "envFiles", "Env Files", #selector(envFiles), target: self)
        keyed(edit, "copyReply", "Copy Claude's Last Reply", #selector(copyReply), target: self)
        add(edit, "Paste", #selector(NSText.paste(_:)), "v")
        add(edit, "Select All", #selector(NSText.selectAll(_:)), "a")
        // As in iTerm2: find in the terminal in front (its find bar), and clear it.
        edit.addItem(.separator())
        let find = #selector(NSResponder.performTextFinderAction(_:))
        keyed(edit, "find", "Find…", find).tag = NSTextFinder.Action.showFindInterface.rawValue
        keyed(edit, "findNext", "Find Next", find).tag = NSTextFinder.Action.nextMatch.rawValue
        keyed(edit, "findPrevious", "Find Previous", find).tag = NSTextFinder.Action.previousMatch.rawValue
        keyed(edit, "findSelection", "Use Selection for Find", find).tag = NSTextFinder.Action.setSearchString.rawValue
        edit.addItem(.separator())
        keyed(edit, "clearBuffer", "Clear Buffer", #selector(clearBuffer), target: self)

        let view = submenu("View")
        add(view, "Dashboard", #selector(showDashboard), "", target: self)
        keyed(view, "reloadDashboard", "Reload Dashboard", #selector(reloadDashboard), target: self)
        keyed(view, "chatsList", "Chats List", #selector(toggleSidebar), target: self)
        // Viktoria's own switch (the same flag as Settings > Appearance); the checkmark and the title ("Get Viktoria…"
        // until she is downloaded) are set in validateMenuItem.
        add(view, "Show Viktoria", #selector(toggleViktoria), "", target: self)
        view.addItem(.separator())
        keyed(view, "biggerText", "Bigger Text", #selector(fontBigger), target: self)
        keyed(view, "smallerText", "Smaller Text", #selector(fontSmaller), target: self)
        keyed(view, "defaultText", "Default Text Size", #selector(fontReset), target: self)
        view.addItem(.separator())
        keyed(view, "fullScreen", "Enter Full Screen", #selector(NSWindow.toggleFullScreen(_:)))
        view.addItem(.separator())
        keyed(view, "scrollLineUp", "Scroll Up One Line", #selector(scrollLineUp), target: self)
        keyed(view, "scrollLineDown", "Scroll Down One Line", #selector(scrollLineDown), target: self)
        keyed(view, "scrollPageUp", "Scroll Up One Page", #selector(scrollPageUp), target: self)
        keyed(view, "scrollPageDown", "Scroll Down One Page", #selector(scrollPageDown), target: self)
        keyed(view, "scrollTop", "Scroll to Top", #selector(scrollTop), target: self)
        keyed(view, "scrollBottom", "Scroll to Bottom", #selector(scrollBottom), target: self)

        let window = submenu("Window")
        add(window, "Minimize", #selector(NSWindow.performMiniaturize(_:)), "m")
        add(window, "Zoom", #selector(NSWindow.performZoom(_:)), "")
        window.addItem(.separator())
        keyed(window, "nextTab", "Select Next Tab", #selector(nextTab), target: self)
        keyed(window, "previousTab", "Select Previous Tab", #selector(previousTab), target: self)
        keyed(window, "moveTabLeft", "Move Tab Left", #selector(moveTabLeft), target: self)
        keyed(window, "moveTabRight", "Move Tab Right", #selector(moveTabRight), target: self)
        keyed(window, "nextPane", "Next Pane", #selector(nextPane), target: self)
        keyed(window, "previousPane", "Previous Pane", #selector(previousPane), target: self)
        keyed(window, "paneAbove", "Select Pane Above", #selector(paneAbove), target: self)
        keyed(window, "paneBelow", "Select Pane Below", #selector(paneBelow), target: self)
        keyed(window, "paneLeft", "Select Pane Left", #selector(paneLeft), target: self)
        keyed(window, "paneRight", "Select Pane Right", #selector(paneRight), target: self)
        keyed(window, "dividerUp", "Move Divider Up", #selector(dividerUp), target: self)
        keyed(window, "dividerDown", "Move Divider Down", #selector(dividerDown), target: self)
        keyed(window, "dividerLeft", "Move Divider Left", #selector(dividerLeft), target: self)
        keyed(window, "dividerRight", "Move Divider Right", #selector(dividerRight), target: self)
        keyed(window, "maximizePane", "Maximize Active Pane", #selector(maximizePane), target: self)
        // ⌘1–⌘9: that tab of the window in front, as in iTerm2.
        for n in 1...9 { add(window, "Select Tab \(n)", #selector(selectTabNumber(_:)), "\(n)", target: self).tag = n }
        window.addItem(.separator())
        add(window, "Bring All to Front", #selector(NSApplication.arrangeInFront(_:)), "")

        // The notes of the version you're on, and the features few people find (windows on the dashboard, cloud.js);
        // every shortcut at a glance, read-only (web/cheatsheet.js; Settings › Shortcuts changes them).
        let help = submenu("Help")
        add(help, "What's New", #selector(showWhatsNew), "", target: self)
        add(help, "Tips", #selector(showTips), "", target: self)
        keyed(help, "keyboardShortcuts", "Keyboard Shortcuts", #selector(showShortcutList), target: self)
        help.addItem(.separator())

        NSApp.mainMenu = main
        NSApp.windowsMenu = window
        NSApp.helpMenu = help
    }

    /// Not downloaded yet: opens the Themes view, where "Get Viktoria" is. Downloaded: her switch.
    @objc private func toggleViktoria() {
        if MascotAsset.shared.isReady { Mascot.isEnabled.toggle() } else { controller.showDashboard(); controller.mascotOpenView("themes") }
    }
    /// The checkmark of View > Show Viktoria; every other item of this delegate stays enabled as before.
    @objc func validateMenuItem(_ item: NSMenuItem) -> Bool {
        if item.action == #selector(toggleViktoria) {
            let ready = MascotAsset.shared.isReady
            item.title = ready ? "Show Viktoria" : "Get Viktoria…"
            item.state = ready && Mascot.isEnabled ? .on : .off
        }
        // Open in a Worktree…: for the AI chat in front (live, in a git folder), whatever the note's setting says; else shown, not usable.
        if item.action == #selector(moveToWorktree) { return controller.movableChat() != nil }
        // The pull request, merge and delete items: usable when the window in front is a worktree's and its status allows it.
        let shipIds: [Selector: String] = [#selector(createPR): "create", #selector(mergeWorktree): "merge", #selector(deleteWorktree): "delete"]
        if let id = item.action.flatMap({ shipIds[$0] }) {
            guard let c = controller.shipFront(), let top = c.hud.wtTop else { return false }
            let ship = WorktreeShip.shared
            let st = ship.status[top]
            if id == "merge" { item.title = "Merge into \(st.map { Streamer.on ? Streamer.fake("branch", $0.base) : $0.base } ?? "Base Branch")…" }
            return !ship.deleted.contains(top) && ship.busy[top] == nil && WorktreeShip.items(st).first { $0.id == id }?.enabled == true
        }
        return true
    }
    private func shipMenu(_ id: String) {
        guard let c = controller.shipFront(), let top = c.hud.wtTop else { return NSSound.beep() }
        WorktreeShip.shared.handle(id, top: top, from: c)
    }
    @objc private func createPR() { shipMenu("create") }
    @objc private func mergeWorktree() { shipMenu("merge") }
    @objc private func deleteWorktree() { shipMenu("delete") }
    @objc private func newTerminal() { controller.overlay.showNewTerminal() }
    @objc private func moveToWorktree() { controller.moveToWorktree() }
    @objc private func newWorktree() { controller.overlay.showNewTerminal(worktree: true) }
    @objc private func newFile() { controller.newFile() }
    @objc private func newTab() { controller.newTab() }
    @objc private func splitVertically() { controller.split(vertical: true) }
    @objc private func splitHorizontally() { controller.split(vertical: false) }
    @objc private func closePane() { controller.closePane() }
    @objc private func nextTab() { controller.selectPane(step: 1, tabs: true) }
    @objc private func previousTab() { controller.selectPane(step: -1, tabs: true) }
    @objc private func moveTabLeft() { controller.moveTab(step: -1) }
    @objc private func moveTabRight() { controller.moveTab(step: 1) }
    @objc private func undoClose() { controller.undoClose() }
    @objc private func nextPane() { controller.selectPane(step: 1) }
    @objc private func previousPane() { controller.selectPane(step: -1) }
    @objc private func paneAbove() { controller.selectPane(dx: 0, dy: 1) }
    @objc private func paneBelow() { controller.selectPane(dx: 0, dy: -1) }
    @objc private func paneLeft() { controller.selectPane(dx: -1, dy: 0) }
    @objc private func paneRight() { controller.selectPane(dx: 1, dy: 0) }
    @objc private func dividerUp() { controller.moveDivider(dx: 0, dy: 1) }
    @objc private func dividerDown() { controller.moveDivider(dx: 0, dy: -1) }
    @objc private func dividerLeft() { controller.moveDivider(dx: -1, dy: 0) }
    @objc private func dividerRight() { controller.moveDivider(dx: 1, dy: 0) }
    @objc private func maximizePane() { controller.toggleMaximize() }
    @objc private func selectTabNumber(_ sender: NSMenuItem) { controller.selectTab(number: sender.tag) }
    /// The terminal in front (a chat's or a terminal's, the pane with the keyboard).
    private var frontTerminal: ChatTerminalView? { NSApp.keyWindow?.firstResponder as? ChatTerminalView }
    @objc private func clearBuffer() { frontTerminal?.clearBuffer() }
    @objc private func scrollLineUp() { frontTerminal?.scrollBuffer(.lineUp) }
    @objc private func scrollLineDown() { frontTerminal?.scrollBuffer(.lineDown) }
    @objc private func scrollPageUp() { frontTerminal?.scrollBuffer(.pageUp) }
    @objc private func scrollPageDown() { frontTerminal?.scrollBuffer(.pageDown) }
    @objc private func scrollTop() { frontTerminal?.scrollBuffer(.top) }
    @objc private func scrollBottom() { frontTerminal?.scrollBuffer(.bottom) }
    /// The chat window in front: Claude's last reply onto the clipboard, all of it.
    /// The chat window in front: its env files, over the terminal (or back).
    @objc private func envFiles() { (NSApp.keyWindow?.delegate as? ChatWindowController)?.toggleEnv() }
    @objc private func copyReply() { (NSApp.keyWindow?.delegate as? ChatWindowController)?.copyLastReply() }
    @objc private func showShortcuts() { controller.overlay.showShortcuts(at: NSEvent.mouseLocation) }
    @objc private func showDashboard() { controller.showDashboard() }
    @objc private func reloadDashboard() { controller.radar.reload() }
    @objc private func toggleSidebar() { controller.toggleSidebar() }
    @objc private func showWhatsNew() { controller.openWhatsNew("notes") }
    @objc private func showTips() { controller.openWhatsNew("tips") }
    @objc private func showSettings() { controller.openSettings() }
    @objc private func showCleanup() { controller.showCleanup() }
    @objc private func showShortcutList() { controller.openShortcutList() }
    @objc private func fontBigger() { controller.changeFont(by: 1) }
    @objc private func fontSmaller() { controller.changeFont(by: -1) }
    @objc private func fontReset() { controller.changeFont(by: nil) }
}
