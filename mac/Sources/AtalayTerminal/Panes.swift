import AppKit
import SwiftTerm

// iTerm2's tabs and split panes inside a chat window (ChatWindowController): ⌘T opens a tab, ⌘D and ⇧⌘D split the pane
// in front. The window's own chat or terminal is its first pane; every other one is an ExtraPane, a shell of its own in
// a session named after the window's (a pty of the app's own, PtySession; so it comes back into the same window after an
// update's restart).

/// How an extra pane was opened: in its own tab, or split off beside (vertical) or under (horizontal) another pane.
enum PaneKind: Character {
    case tab = "t", vertical = "v", horizontal = "h"
}

extension Detached {
    /// An extra pane's session: `<prefix>x<kind><8 hex>-<the window session's id>`. It must not start with the window's
    /// session name: screen picks sessions by prefix, and `-S name -X quit` refuses when two match. A mirror's window
    /// session is another build's (`atl-` in the staging build): its id is what follows that build's prefix.
    static func extraName(parent: String, kind: PaneKind) -> String {
        let hex = String(UUID().uuidString.lowercased().filter(\.isHexDigit).prefix(8))
        let own = allPrefixes.first(where: parent.hasPrefix) ?? prefix
        return prefix + "x" + String(kind.rawValue) + hex + "-" + parent.dropFirst(own.count)
    }

    /// The same session, renamed for another kind (a tab dragged into a split): it comes back that way after a restart.
    @MainActor
    static func renamed(_ name: String, kind: PaneKind) -> String? {
        guard extraInfo(name) != nil else { return nil }
        var chars = Array(name)
        chars[prefix.count + 1] = kind.rawValue
        let new = String(chars)
        if let pty = Sessions.live[name] {
            pty.rename(to: new)
            return new
        }
        let p = Process()
        p.executableURL = URL(fileURLWithPath: screen)
        p.arguments = ["-S", name, "-X", "sessionname", new]
        guard (try? p.run()) != nil else { return nil }
        p.waitUntilExit()
        return p.terminationStatus == 0 ? new : nil
    }

    /// A running session moved to another window (a tab dragged out or into one): it gets a name that says where it belongs
    /// now, so a restart routes it there. `parent` nil: a window of its own (a plain `<prefix><uuid>` name); else a tab or
    /// split of the window whose session is `parent`. Only pty sessions can move; nil when `name` is none (it keeps its name).
    @MainActor
    static func rehome(_ name: String, parent: String?, kind: PaneKind) -> String? {
        guard let pty = Sessions.live[name] else { return nil }
        let new = parent.map { extraName(parent: $0, kind: kind) } ?? prefix + UUID().uuidString.lowercased()
        pty.rename(to: new)
        return pty.name == new ? new : nil
    }

    /// The window session and the kind of an extra pane's session; nil for any other session.
    static func extraInfo(_ name: String) -> (parent: String, kind: PaneKind)? {
        guard name.hasPrefix(prefix) else { return nil }
        let rest = Array(name.dropFirst(prefix.count))
        guard rest.count > 11, rest[0] == "x", let kind = PaneKind(rawValue: rest[1]), rest[10] == "-",
              rest[2..<10].allSatisfy(\.isHexDigit) else { return nil }
        return (prefix + String(rest[11...]), kind)
    }
}

/// A pane besides the window's own: a shell in a session of its own.
@MainActor
final class ExtraPane: NSObject, LocalProcessTerminalViewDelegate {
    private(set) var terminal: ChatTerminalView!
    private(set) var kind: PaneKind
    let cwd: String
    private(set) var link: DetachedLink?
    weak var owner: ChatWindowController?
    /// Stopped on purpose (closed, or the app quits): its process ending isn't news.
    private var closing = false
    private var attached = false
    private var fitWork: DispatchWorkItem?
    /// The terminal's height in rows, as it last reported it.
    private var rows = 0

    /// `session` names a pty still running (a closed pane brought back, one restored after a restart): the pane takes its
    /// view over. A screen session an older build left (`session`, not a pty): the pane shows it once `start` attaches it.
    /// Without `session`, a new shell starts in a pty of its own, named after the window's session `parent`.
    init(owner: ChatWindowController, cwd: String, kind: PaneKind, fontSize: CGFloat, session: String? = nil, parent: String? = nil,
         size: NSSize? = nil) {
        self.owner = owner
        self.cwd = cwd
        self.kind = kind
        super.init()
        if let session, let pty = Sessions.live[session], !pty.ownerIsLive || pty.owner === owner {
            adopt(pty, fontSize: fontSize)
        } else if let session, Sessions.ended.contains(session) || Sessions.live[session] != nil {
            // Ended already, or shown by another window or pane: nothing to show here (ChatWindowController.adoptPane checks
            // first, so this is only a guard). The pane is closed and shows nothing.
            NSLog("Orbiterm: a pane was asked to show a session that is gone or shown elsewhere (%@)", session)
            terminal = TerminalFactory.makeIdle(chatId: owner.id, fontSize: fontSize, delegate: self)
            closing = true
            attached = true
        } else if session != nil {
            terminal = TerminalFactory.makeIdle(chatId: owner.id, fontSize: fontSize, delegate: self)
            try? terminal.setUseMetal(true)
        } else {
            let name = Detached.extraName(parent: parent ?? Detached.prefix + owner.id.lowercased(), kind: kind)
            adopt(Sessions.start(name: name, cwd: cwd, claudeArgs: nil, fontSize: fontSize, size: size), fontSize: fontSize)
        }
    }

    /// The pane is one of its window's (not left behind by a closed one).
    var isInWindow: Bool { owner?.extras.contains { $0 === self } ?? false }

    /// The pane shows `pty`'s view and hears what it reports from now on. A parked view missed the theme and font changes
    /// made meanwhile.
    private func adopt(_ pty: PtySession, fontSize: CGFloat) {
        pty.owner = self
        terminal = pty.terminal
        terminal.chatId = owner?.id ?? ""
        TerminalFactory.paint(terminal)
        terminal.font = TerminalFont.font(fontSize)
        link = DetachedLink(name: pty.name)
        attached = true
    }

    /// Now in a split rather than a tab of its own (or the other way): its session's name follows, for the next launch.
    func rekind(_ new: PaneKind) {
        guard new != kind else { return }
        kind = new
        if let old = link?.name, let name = Detached.renamed(old, kind: new) {
            link = DetachedLink(name: name)
            // What is kept by name (notes pinned to it, a typed tab name) follows.
            if let m = owner?.manager { m.sessionRenamed(old, to: name) } else { NotesTools.renameSession(from: old, to: name) }
        }
    }

    /// A screen session an older build left (the init made the pane for it): its scrollback from before, then the display.
    /// A pty pane is running already.
    func start(session: String, fit: Bool) {
        guard !attached else { return }
        link = DetachedLink(name: session)
        // Its scrollback from before (the app quit, or the pane closed a moment ago), above the rows screen
        // repaints: like the window's own terminal (ChatWindowController.attachSession).
        let history = Detached.takeHistory(session)
        if !history.isEmpty {
            terminal.feed(text: history.joined(separator: "\r\n") + String(repeating: "\r\n", count: max(rows, 60) + 1))
        }
        attach(fit: fit)
    }

    private func attach(fit: Bool) {
        guard let link, !attached else { return }
        attached = true
        TerminalFactory.attach(terminal, screenName: link.name, cwd: cwd, fit: fit)
        self.fit()
    }

    /// The screen session takes this pane's size once it has settled (a pty takes its view's by itself).
    func fit() {
        guard let link, attached, link.pty == nil else { return }
        fitWork?.cancel()
        let name = link.name
        let work = DispatchWorkItem { Detached.fit(name) }
        fitWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4, execute: work)
    }

    var shellPid: Int32 {
        guard attached else { return 0 }
        if let link { return link.shellPid ?? 0 }
        return terminal.process.shellPid
    }

    var currentFolder: String { (shellPid > 0 ? Proc.cwd(shellPid) : nil) ?? cwd }

    /// Lets go of the session without ending it (the app quits, or ⇧⌘T may bring it back), keeping its scrollback for
    /// the pane that attaches next.
    func detach() {
        if let pty = link?.pty {
            // A pty keeps running with no one showing it: a car on the orbit, or what the next launch brings back.
            pty.owner = nil
            closing = true
            return
        }
        if let link, attached, !closing {
            let text = String(decoding: terminal.getBufferAsData(kind: .normal), as: UTF8.self)
            Detached.saveHistory(link.name, text: text, rows: rows)
        }
        closing = true
        terminal.terminate()
    }

    /// Ends the pane's shell and session.
    func end() {
        guard !closing else { return }
        closing = true
        if let link { Detached.quit(link.name) }
        terminal.terminate()
    }

    // MARK: LocalProcessTerminalViewDelegate

    func sizeChanged(source: LocalProcessTerminalView, newCols: Int, newRows: Int) {
        rows = newRows
        fit()
    }
    func setTerminalTitle(source: LocalProcessTerminalView, title: String) {}
    func hostCurrentDirectoryUpdate(source: TerminalView, directory: String?) {}

    /// Its shell exited (`exit`, Ctrl-D): the pane closes, as in iTerm2.
    func processTerminated(source: TerminalView, exitCode: Int32?) {
        guard !closing else { return }
        closing = true
        if let link { Detached.forgetHistory(link.name) }
        owner?.paneEnded(self)
    }
}

/// Panes side by side (`isVertical`) or one above the other, with a thin orange line between them that can be dragged.
/// Laid out by hand: each pane keeps a share of the room, and a new pane takes half of its neighbour's, as in iTerm2.
/// A hidden pane (⇧⌘↩) gives its room to the others until it shows again.
@MainActor
final class PaneSplitView: NSView {
    var isVertical = true { didSet { needsLayout = true } }
    let dividerThickness: CGFloat = 5
    private(set) var arrangedSubviews: [NSView] = []
    private var shares: [CGFloat] = []
    private var dragging: Int?
    private let minimum: CGFloat = 60

    override var isFlipped: Bool { true }

    func addArrangedSubview(_ v: NSView) { insertArrangedSubview(v, at: arrangedSubviews.count) }

    /// `v` goes in at `i` and takes half the share of `donor` (by default the pane before it, or after it when it's first).
    func insertArrangedSubview(_ v: NSView, at i: Int, from donor: NSView? = nil) {
        v.removeFromSuperview()
        var share: CGFloat = 1
        if !arrangedSubviews.isEmpty {
            let k = donor.flatMap { arrangedSubviews.firstIndex(of: $0) } ?? (i > 0 ? i - 1 : 0)
            share = shares[k] / 2
            shares[k] -= share
        }
        arrangedSubviews.insert(v, at: i)
        shares.insert(share, at: i)
        adopt(v)
    }

    /// `new` takes `old`'s place and share.
    func replaceArrangedSubview(_ old: NSView, with new: NSView) {
        guard let i = arrangedSubviews.firstIndex(of: old) else { return }
        new.removeFromSuperview()
        arrangedSubviews[i] = new
        old.removeFromSuperview()
        adopt(new)
    }

    private func adopt(_ v: NSView) {
        v.translatesAutoresizingMaskIntoConstraints = true
        v.autoresizingMask = []
        addSubview(v)
        needsLayout = true
        window?.invalidateCursorRects(for: self)
    }

    /// A pane taken out leaves its share to the one before it (after it, when it was first).
    override func willRemoveSubview(_ subview: NSView) {
        super.willRemoveSubview(subview)
        guard let i = arrangedSubviews.firstIndex(of: subview) else { return }
        let share = shares.remove(at: i)
        arrangedSubviews.remove(at: i)
        if !shares.isEmpty { shares[i > 0 ? i - 1 : 0] += share }
        needsLayout = true
    }

    func equalize() {
        shares = Array(repeating: 1 / CGFloat(max(1, shares.count)), count: shares.count)
        needsLayout = true
    }

    private var length: CGFloat { isVertical ? bounds.width : bounds.height }

    private var shown: [Int] { arrangedSubviews.indices.filter { !arrangedSubviews[$0].isHidden } }

    /// The title bar over pane `v` (ChatWindowController puts one over each pane of a tab with several).
    private func bar(for v: NSView) -> PaneTitleBar? {
        for case let b as PaneTitleBar in subviews where b.pane === v { return b }
        return nil
    }

    /// Pane `v` in `r`: under its title bar when it has one.
    private func place(_ v: NSView, in r: NSRect) {
        guard let bar = bar(for: v) else { v.frame = r; return }
        bar.isHidden = false
        let h = min(PaneTitleBar.height, r.height)
        bar.frame = NSRect(x: r.minX, y: r.minY, width: r.width, height: h)
        v.frame = NSRect(x: r.minX, y: r.minY + h, width: r.width, height: max(0, r.height - h))
    }

    /// Pane `i`'s whole place, its title bar included.
    func paneRect(_ i: Int) -> NSRect {
        let v = arrangedSubviews[i]
        guard let bar = bar(for: v), !bar.isHidden else { return v.frame }
        return v.frame.union(bar.frame)
    }

    override func layout() {
        super.layout()
        for v in arrangedSubviews where v.isHidden { bar(for: v)?.isHidden = true }
        let visible = shown
        guard !visible.isEmpty else { return }
        let room = length - CGFloat(visible.count - 1) * dividerThickness
        let total = visible.reduce(CGFloat(0)) { $0 + shares[$1] }
        var pos: CGFloat = 0
        for (n, i) in visible.enumerated() {
            let size = n == visible.count - 1 ? length - pos : (room * shares[i] / max(total, 0.0001)).rounded()
            place(arrangedSubviews[i], in: isVertical
                ? NSRect(x: pos, y: 0, width: max(0, size), height: bounds.height)
                : NSRect(x: 0, y: pos, width: bounds.width, height: max(0, size)))
            pos += size + dividerThickness
        }
        window?.invalidateCursorRects(for: self)
        needsDisplay = true
    }

    /// The gap after pane `i` (between it and the next shown one).
    private func gap(after i: Int) -> NSRect {
        let f = paneRect(i)
        return isVertical
            ? NSRect(x: f.maxX, y: 0, width: dividerThickness, height: bounds.height)
            : NSRect(x: 0, y: f.maxY, width: bounds.width, height: dividerThickness)
    }

    override func draw(_ dirtyRect: NSRect) {
        let visible = shown
        NSColor(hex: Theme.accentHex, alpha: 0.45).setFill()
        for i in visible.dropLast() {
            let g = gap(after: i)
            (isVertical ? NSRect(x: g.midX - 0.75, y: g.minY, width: 1.5, height: g.height)
                        : NSRect(x: g.minX, y: g.midY - 0.75, width: g.width, height: 1.5)).fill()
        }
    }

    override func resetCursorRects() {
        for i in shown.dropLast() { addCursorRect(gap(after: i), cursor: isVertical ? .resizeLeftRight : .resizeUpDown) }
    }

    /// Moves the divider after pane `k` to `position` (points from the left, or from the top), within both panes' room.
    func setPosition(_ position: CGFloat, ofDividerAt k: Int) {
        guard k + 1 < arrangedSubviews.count else { return }
        let a = paneRect(k), b = paneRect(k + 1)
        let start = isVertical ? a.minX : a.minY
        let pair = (isVertical ? a.width + b.width : a.height + b.height)
        guard pair > 0 else { return }
        let first = min(max(position - start, minimum), pair - minimum)
        let shareSum = shares[k] + shares[k + 1]
        shares[k] = shareSum * first / pair
        shares[k + 1] = shareSum - shares[k]
        needsLayout = true
    }

    override func mouseDown(with event: NSEvent) {
        let p = convert(event.locationInWindow, from: nil)
        dragging = shown.dropLast().first { gap(after: $0).insetBy(dx: -2, dy: -2).contains(p) }
    }

    override func mouseDragged(with event: NSEvent) {
        guard let k = dragging else { return }
        let p = convert(event.locationInWindow, from: nil)
        setPosition((isVertical ? p.x : p.y) - dividerThickness / 2, ofDividerAt: k)
    }

    override func mouseUp(with event: NSEvent) { dragging = nil }
}

/// What follows the pointer while a tab is dragged (iTerm2's drag out of the bar): a small copy of the tab's chip, and the
/// outline of the window the tab would become when it is let go over no window. Two borderless panels above everything
/// (pinned windows too) that never take the mouse; the chip image is drawn here, a snapshot of a terminal would be blank
/// (Metal).
@MainActor
final class TabDragGhost {
    private let chip: NSPanel
    private let outline: NSPanel

    init(title: String) {
        let label = NSTextField(labelWithString: title)
        label.font = Theme.mono(11, .semibold)
        label.textColor = ThemeStore.shared.color("--accent-soft")
        label.lineBreakMode = .byTruncatingTail
        let width = min(260, max(110, label.intrinsicContentSize.width + 30))
        let view = NSView(frame: NSRect(x: 0, y: 0, width: width, height: 26))
        view.wantsLayer = true
        view.layer?.cornerRadius = 6
        view.layer?.borderWidth = 1
        view.layer?.borderColor = NSColor(hex: Theme.accentHex, alpha: 0.85).cgColor
        view.layer?.backgroundColor = NSColor(hex: Theme.accentHex, alpha: 0.32).cgColor
        label.frame = NSRect(x: 12, y: 5, width: width - 24, height: 16)
        view.addSubview(label)
        chip = Self.panel(view)
        let box = NSView(frame: NSRect(x: 0, y: 0, width: 100, height: 100))
        box.wantsLayer = true
        box.layer?.cornerRadius = 12
        box.layer?.borderWidth = 2
        box.layer?.borderColor = NSColor(hex: Theme.accentHex, alpha: 0.9).cgColor
        box.layer?.backgroundColor = NSColor(hex: Theme.accentHex, alpha: 0.07).cgColor
        box.autoresizingMask = [.width, .height]
        outline = Self.panel(box)
        // Invisible, but ordered in all the time: its window number is the floor of the "which window is under the pointer" query.
        outline.alphaValue = 0
        outline.orderFrontRegardless()
        chip.orderFrontRegardless()
    }

    private static func panel(_ content: NSView) -> NSPanel {
        let p = NSPanel(contentRect: content.frame, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        p.isOpaque = false
        p.backgroundColor = .clear
        p.hasShadow = false
        p.ignoresMouseEvents = true
        p.hidesOnDeactivate = false
        p.isReleasedWhenClosed = false
        p.level = NSWindow.Level(rawValue: NSWindow.Level.floating.rawValue + 1)
        p.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .transient, .ignoresCycle]
        p.contentView = content
        return p
    }

    /// Windows below this number are what the pointer can be over (the ghost's own panels are above it).
    var floor: Int { outline.windowNumber }

    func move(to p: NSPoint) {
        chip.setFrameOrigin(NSPoint(x: p.x - chip.frame.width / 2, y: p.y - chip.frame.height - 6))
        chip.orderFrontRegardless()
    }

    /// The new window's place, or nil to hide it.
    func showOutline(_ frame: NSRect?) {
        guard let frame else { return outline.alphaValue = 0 }
        outline.setFrame(frame, display: true)
        outline.alphaValue = 1
        outline.orderFrontRegardless()
        chip.orderFrontRegardless()
    }

    func close() {
        chip.orderOut(nil)
        outline.orderOut(nil)
    }
}

/// A tab being dragged: it started, it's over a point of the window, or it was let go there.
enum TabDrag { case began, moved(NSPoint), ended(NSPoint) }

/// A menu item that runs a closure (the tab chips' menu, the overflow list).
final class BlockMenuItem: NSMenuItem {
    private let block: () -> Void

    init(title: String, block: @escaping () -> Void) {
        self.block = block
        super.init(title: title, action: #selector(run), keyEquivalent: "")
        target = self
    }

    required init(coder: NSCoder) { fatalError("not used") }

    @objc private func run() { block() }
}

/// The window's tabs, under its header when there are two or more, as in iTerm2. A tab can be dragged: along the bar to
/// move it, onto a pane to split it there, out of the window to tear it off (ChatWindowController). Each chip has a minimum
/// width: when they don't all fit the bar scrolls sideways (wheel or trackpad), keeps the tab in front in view, and a
/// "»" button lists every tab.
@MainActor
final class PaneTabBar: NSView {
    var onSelect: ((Int) -> Void)?
    var onClose: ((Int) -> Void)?
    var onDrag: ((Int, TabDrag) -> Void)?
    /// A tab's name was typed (nil: cancelled); a double-click asks for the editor.
    var onRename: ((Int, String?) -> Void)?
    var onRenameRequest: ((Int) -> Void)?
    var onMenu: ((Int) -> NSMenu?)?
    /// A chip's star was clicked: the chat it shows (TabStats.starId), not a tab index, so it can't star another one.
    var onFavorite: ((String) -> Void)?
    private let clip = NSView()
    private let content = NSView()
    private let more = NSButton(title: "\u{00BB}", target: nil, action: nil)
    private var chips: [TabChip] = []
    private(set) var shownTitles: [String] = []
    private var active = 0
    private var offset: CGFloat = 0
    private var reveal = false
    private let minWidth: CGFloat = 124
    private let spacing: CGFloat = 4
    private var overflowing = false

    override init(frame: NSRect) {
        super.init(frame: frame)
        clip.wantsLayer = true
        clip.layer?.masksToBounds = true
        addSubview(clip)
        clip.addSubview(content)
        more.isBordered = false
        more.font = Theme.mono(14, .semibold)
        more.contentTintColor = ThemeStore.shared.color("--accent-soft")
        more.toolTip = "All tabs"
        more.target = self
        more.action = #selector(showMore)
        more.isHidden = true
        addSubview(more)
    }

    required init?(coder: NSCoder) { fatalError("not used") }

    var isEditing: Bool { chips.contains { $0.isEditing } }

    /// `reveal` false keeps the bar where the user scrolled it (only the names changed).
    func show(titles: [String], active: Int, reveal: Bool = true) {
        chips.forEach { $0.removeFromSuperview() }
        chips = []
        shownTitles = titles
        self.active = active
        more.contentTintColor = ThemeStore.shared.color("--accent-soft")
        for (i, t) in titles.enumerated() {
            let chip = TabChip(title: t, number: i + 1, active: i == active)
            chip.onSelect = { [weak self] in self?.onSelect?(i) }
            chip.onClose = { [weak self] in self?.onClose?(i) }
            chip.onDrag = { [weak self] in self?.onDrag?(i, $0) }
            chip.onRename = { [weak self] in self?.onRename?(i, $0) }
            chip.onRenameRequest = { [weak self] in self?.onRenameRequest?(i) }
            chip.onMenu = { [weak self] in self?.onMenu?(i) }
            chip.onFavorite = { [weak self] in self?.onFavorite?($0) }
            content.addSubview(chip)
            chips.append(chip)
        }
        if reveal { self.reveal = true }
        needsLayout = true
    }

    /// The tab's name is edited in place, starting from `text`.
    func beginRename(at i: Int, text: String) {
        guard chips.indices.contains(i) else { return }
        reveal = true
        layoutSubtreeIfNeeded()
        chips[i].beginEditing(text: text)
    }

    private var lastWidth: CGFloat = 0

    override func layout() {
        super.layout()
        // A narrower window: the tab in front stays in view.
        if bounds.width != lastWidth {
            lastWidth = bounds.width
            reveal = true
        }
        let n = chips.count, h = bounds.height
        let need = CGFloat(n) * minWidth + CGFloat(max(0, n - 1)) * spacing
        overflowing = n > 0 && need > bounds.width
        let viewW = overflowing ? max(0, bounds.width - 24) : bounds.width
        clip.frame = NSRect(x: 0, y: 0, width: viewW, height: h)
        more.isHidden = !overflowing
        more.frame = NSRect(x: viewW + 2, y: (h - 20) / 2, width: 20, height: 20)
        let w = overflowing ? minWidth : (viewW - spacing * CGFloat(max(0, n - 1))) / CGFloat(max(n, 1))
        let total = overflowing ? need : viewW
        for (i, chip) in chips.enumerated() { chip.frame = NSRect(x: CGFloat(i) * (w + spacing), y: 0, width: w, height: h) }
        if reveal, chips.indices.contains(active) {
            let f = chips[active].frame
            if f.minX < offset { offset = f.minX }
            if f.maxX > offset + viewW { offset = f.maxX - viewW }
            reveal = false
        }
        offset = min(max(0, offset), max(0, total - viewW))
        content.frame = NSRect(x: -offset, y: 0, width: total, height: h)
    }

    override func scrollWheel(with event: NSEvent) {
        guard overflowing else { return super.scrollWheel(with: event) }
        let dx = event.scrollingDeltaX, dy = event.scrollingDeltaY
        let d = abs(dx) > abs(dy) ? dx : dy
        offset -= event.hasPreciseScrollingDeltas ? d : d * 12
        needsLayout = true
    }

    @objc private func showMore() {
        let menu = NSMenu()
        for (i, t) in shownTitles.enumerated() {
            let item = BlockMenuItem(title: "\(i + 1)  \(t)") { [weak self] in self?.onSelect?(i) }
            item.state = i == active ? .on : .off
            menu.addItem(item)
        }
        menu.popUp(positioning: nil, at: NSPoint(x: 0, y: 0), in: more)
    }

    /// Each tab's AI session figures, in tab order (nil: no AI in that tab). Updated in place, so a chip being dragged
    /// isn't rebuilt under the pointer.
    func setStats(_ stats: [TabStats?]) {
        for (chip, s) in zip(chips, stats) { chip.stats = s }
    }

    /// Where a tab let go at `point` (window coordinates) goes: before the tab whose middle is past it; nil off the bar.
    func slot(at point: NSPoint) -> Int? {
        let p = convert(point, from: nil)
        guard bounds.insetBy(dx: 0, dy: -12).contains(p) else { return nil }
        return chips.firstIndex { p.x < $0.convert($0.bounds, to: self).midX } ?? chips.count
    }

    /// The line that shows slot `i` (window coordinates), kept inside the visible part of the bar.
    func marker(at i: Int) -> NSRect {
        guard !chips.isEmpty else { return .zero }
        let c = i < chips.count ? chips[i] : chips[chips.count - 1]
        let f = c.convert(c.bounds, to: self)
        var x = i < chips.count ? f.minX - 2 : f.maxX + 2
        x = min(max(x, 1.5), max(1.5, clip.frame.width - 1.5))
        return convert(NSRect(x: x - 1.5, y: 0, width: 3, height: bounds.height), to: nil)
    }
}

/// The slim bar over a pane when its tab holds several (iTerm2's pane title): the pane's name, a dot while its AI works
/// or needs the user, and a close ×. Dragged it moves the pane (to a tab of its own, another split, another window).
/// Placed by the split view that holds the pane (PaneSplitView.place).
@MainActor
final class PaneTitleBar: NSView, NSTextFieldDelegate {
    static let height: CGFloat = 20
    weak var pane: NSView?
    var onSelect: (() -> Void)?
    var onClose: (() -> Void)?
    var onDrag: ((TabDrag) -> Void)?
    var onRename: ((String?) -> Void)?
    var onRenameRequest: (() -> Void)?
    var onMenu: (() -> NSMenu?)?
    /// The star was clicked: the chat in this pane (TabStats.starId).
    var onFavorite: ((String) -> Void)?
    /// Copy this pane's AI last reply / open the env view of this pane's folder.
    var onCopy: (() -> Void)?
    var onEnv: (() -> Void)?
    /// The env view holds unsaved changes of this pane's folder.
    var envUnsaved = false {
        didSet { if envUnsaved != oldValue { paintEnv(); needsLayout = true } }
    }
    var focused = false {
        didSet { if focused != oldValue { paint() } }
    }
    private(set) var title = ""
    private var status = ""
    private var stats: TabStats?
    private let meter = CtxMeter()
    private let ctxText = NSTextField(labelWithString: "")
    private let counts = NSTextField(labelWithString: "")
    private let label = NSTextField(labelWithString: "")
    private let close = NSButton(title: "\u{00D7}", target: nil, action: nil)
    private let dot = NSView()
    private let disc = NSImageView()
    private let star = NSButton()
    private let copyBtn = NSButton()
    private let envBtn = NSButton()
    private var editor: NSTextField?
    private var pressedAt: NSPoint?
    private var dragging = false
    private var secondClick = false

    init(pane: NSView) {
        self.pane = pane
        super.init(frame: .zero)
        wantsLayer = true
        layer?.cornerRadius = 4
        layer?.borderWidth = 1
        label.font = Theme.mono(10.5, .regular)
        label.lineBreakMode = .byTruncatingTail
        close.isBordered = false
        close.font = Theme.mono(12, .medium)
        close.target = self
        close.action = #selector(closePane)
        close.toolTip = "End this chat and stop the AI (a terminal: close it)"
        dot.wantsLayer = true
        dot.layer?.cornerRadius = 3
        dot.isHidden = true
        ctxText.font = Theme.mono(10)
        ctxText.textColor = ThemeStore.shared.color("--txt")
        counts.lineBreakMode = .byTruncatingTail
        disc.isHidden = true
        star.isBordered = false
        star.imagePosition = .imageOnly
        star.imageScaling = .scaleProportionallyDown
        star.refusesFirstResponder = true
        star.focusRingType = .none
        star.target = self
        star.action = #selector(starTapped)
        star.isHidden = true
        copyBtn.isBordered = false
        copyBtn.imagePosition = .imageOnly
        copyBtn.imageScaling = .scaleProportionallyDown
        copyBtn.refusesFirstResponder = true
        copyBtn.focusRingType = .none
        copyBtn.target = self
        copyBtn.action = #selector(copyTapped)
        let copyHelp = "Copy the AI's last reply, all of it (\u{21E7}\u{2318}C)"
        copyBtn.image = NSImage(systemSymbolName: "doc.on.doc", accessibilityDescription: copyHelp)?
            .withSymbolConfiguration(.init(pointSize: 10.5, weight: .bold))
        copyBtn.toolTip = copyHelp
        copyBtn.setAccessibilityLabel(copyHelp)
        copyBtn.isHidden = true
        envBtn.isBordered = false
        envBtn.refusesFirstResponder = true
        envBtn.focusRingType = .none
        envBtn.target = self
        envBtn.action = #selector(envTapped)
        for v in [dot, disc, label, meter, ctxText, counts, copyBtn, envBtn, star, close] as [NSView] { addSubview(v) }
        paint()
    }

    /// The pane's chat star: always shown for a chat (every pane header has its own), outline or filled amber.
    private func paintStar() {
        guard let id = stats?.starId, !id.isEmpty else { star.isHidden = true; return }
        star.isHidden = false
        let on = stats?.starred == true
        let help = on ? "Remove this chat from your favorites" : "Add this chat to your favorites in the sidebar"
        star.image = NSImage(systemSymbolName: on ? "star.fill" : "star", accessibilityDescription: help)?
            .withSymbolConfiguration(.init(pointSize: 11, weight: .bold))
        let amber = ThemeStore.shared.color("--amber")
        star.contentTintColor = on ? (amber.blended(withFraction: 0.2, of: .white) ?? amber) : ThemeStore.shared.color("--accent-soft")
        star.toolTip = help
        star.setAccessibilityLabel(help)
    }

    @objc private func copyTapped() { onCopy?() }
    @objc private func envTapped() { onEnv?() }

    private func paintEnv() {
        let amber = ThemeStore.shared.color("--amber")
        envBtn.attributedTitle = NSAttributedString(string: envUnsaved ? "env\u{2022}" : "env", attributes: [
            .font: Theme.mono(10, .semibold), .foregroundColor: amber])
        envBtn.toolTip = "The env files in this folder and the ones in it: open one to edit or copy from it (\u{21E7}\u{2318}E)."
            + (envUnsaved ? " It has changes not saved." : "")
    }

    @objc private func starTapped() {
        guard let id = stats?.starId, !id.isEmpty else { return }
        onFavorite?(id)
    }

    required init?(coder: NSCoder) { fatalError("not used") }

    override var isFlipped: Bool { true }
    var isEditing: Bool { editor != nil }

    /// The pane's name and the figures of the AI in it (nil: none), shown as the tab chip shows them.
    func set(title: String, stats: TabStats?) {
        guard title != self.title || stats != self.stats else { return }
        self.title = title
        self.stats = stats
        status = stats?.status ?? ""
        label.stringValue = title
        disc.isHidden = stats?.account == nil
        if let m = stats?.account { disc.image = ChatWindowController.disc(m); disc.toolTip = "Claude account: " + m.label }
        if let s = stats {
            meter.frac = s.ctxMax > 0 ? min(1, Double(s.ctx) / s.ctxMax) : 0
            ctxText.stringValue = tokenText(s.ctx)
            counts.attributedStringValue = tabStatsLine(s)
        }
        paint()
        needsLayout = true
    }

    /// Colours: the theme's, brighter for the pane with the keyboard.
    func paint() {
        let t = ThemeStore.shared
        layer?.borderColor = NSColor(hex: Theme.accentHex, alpha: focused ? 0.6 : 0.18).cgColor
        layer?.backgroundColor = focused ? NSColor(hex: Theme.accentHex, alpha: 0.16).cgColor : NSColor.black.withAlphaComponent(0.28).cgColor
        // The figures take the theme's colours again (set() skips an unchanged state).
        if let s = stats {
            counts.attributedStringValue = tabStatsLine(s)
            ctxText.textColor = t.color("--txt")
        }
        paintStar()
        paintEnv()
        copyBtn.contentTintColor = t.color("--accent-soft")
        copyBtn.isHidden = stats == nil
        label.textColor = t.color(focused ? "--accent-soft" : "--dim")
        label.font = Theme.mono(10.5, focused ? .semibold : .regular)
        close.contentTintColor = t.color(focused ? "--accent-soft" : "--dim")
        dot.layer?.removeAllAnimations()
        guard status == "busy" || status == "waiting", let hex = Theme.statusHex[status] else {
            dot.isHidden = true
            toolTip = nil
            return
        }
        dot.isHidden = false
        dot.layer?.backgroundColor = NSColor(hex: hex).cgColor
        toolTip = status == "busy" ? "Working" : "Needs you"
        if status == "waiting", !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion {
            let a = CABasicAnimation(keyPath: "opacity")
            a.fromValue = 1
            a.toValue = 0.3
            a.duration = 0.8
            a.autoreverses = true
            a.repeatCount = .infinity
            dot.layer?.add(a, forKey: "pulse")
        }
        needsLayout = true
    }

    override func layout() {
        super.layout()
        let w = bounds.width, h = bounds.height
        close.frame = NSRect(x: w - 20, y: (h - 16) / 2, width: 16, height: 16)
        dot.frame = NSRect(x: 8, y: (h - 6) / 2, width: 6, height: 6)
        let discX: CGFloat = dot.isHidden ? 8 : 19
        disc.frame = NSRect(x: discX, y: (h - 14) / 2, width: 14, height: 14)
        let x: CGFloat = discX + (disc.isHidden ? 0 : 18)
        // From the right: the context (meter and size), then the counts; the name keeps at least 70 points, so the counts
        // go first when it is narrow, then the meter.
        let hasStar = !(stats?.starId ?? "").isEmpty
        star.frame = NSRect(x: w - 20 - 18, y: (h - 18) / 2, width: 18, height: 18)
        let envW: CGFloat = envUnsaved ? 30 : 26
        envBtn.frame = NSRect(x: w - 20 - (hasStar ? 18 : 0) - envW, y: (h - 18) / 2, width: envW, height: 18)
        copyBtn.frame = NSRect(x: envBtn.frame.minX - 18, y: (h - 18) / 2, width: 18, height: 18)
        var right = (copyBtn.isHidden ? envBtn.frame.minX : copyBtn.frame.minX) - 4
        let minName: CGFloat = 70
        var showMeter = false, showCounts = false
        if stats != nil {
            ctxText.sizeToFit()
            let tw = ctxText.frame.width
            if right - x - minName >= tw + 6 + 36 + 8 { showMeter = true }
            if showMeter {
                ctxText.frame = NSRect(x: right - tw, y: (h - 14) / 2, width: tw, height: 14)
                meter.frame = NSRect(x: right - tw - 6 - 36, y: (h - 5) / 2, width: 36, height: 5)
                right = meter.frame.minX - 8
                counts.sizeToFit()
                let cw = min(counts.frame.width, 170)
                if right - x - minName >= cw + 8 {
                    showCounts = true
                    counts.frame = NSRect(x: right - cw, y: (h - 14) / 2, width: cw, height: 14)
                    right -= cw + 8
                }
            }
        }
        meter.isHidden = !showMeter
        ctxText.isHidden = !showMeter
        counts.isHidden = !showCounts
        label.frame = NSRect(x: x, y: (h - 14) / 2, width: max(0, right - x), height: 14)
        editor?.frame = NSRect(x: 4, y: 1, width: max(40, w - 26), height: h - 2)
    }

    // MARK: renaming in place

    func beginEditing(text: String) {
        guard editor == nil, let w = window else { return }
        let f = NSTextField(string: text)
        f.font = Theme.mono(10.5)
        f.textColor = ThemeStore.shared.color("--txt")
        f.drawsBackground = true
        f.backgroundColor = NSColor.black.withAlphaComponent(0.55)
        f.isBordered = false
        f.focusRingType = .none
        f.lineBreakMode = .byTruncatingTail
        f.delegate = self
        addSubview(f)
        editor = f
        label.isHidden = true
        needsLayout = true
        layoutSubtreeIfNeeded()
        w.makeFirstResponder(f)
        f.currentEditor()?.selectAll(nil)
    }

    private func finishEditing(commit: Bool) {
        guard let f = editor else { return }
        editor = nil
        let text = f.stringValue
        f.delegate = nil
        f.removeFromSuperview()
        label.isHidden = false
        onRename?(commit ? text : nil)
    }

    func control(_ control: NSControl, textView: NSTextView, doCommandBy commandSelector: Selector) -> Bool {
        guard commandSelector == #selector(NSResponder.cancelOperation(_:)) else { return false }
        finishEditing(commit: false)
        return true
    }

    func controlTextDidEndEditing(_ obj: Notification) { finishEditing(commit: true) }

    override func menu(for event: NSEvent) -> NSMenu? { onMenu?() }

    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }

    // A click gives the pane the keyboard (a double-click renames); a press that moves a few points drags the pane.
    override func mouseDown(with event: NSEvent) {
        pressedAt = event.locationInWindow
        dragging = false
        secondClick = event.clickCount == 2
    }

    override func mouseDragged(with event: NSEvent) {
        guard let start = pressedAt, editor == nil else { return }
        let p = event.locationInWindow
        if !dragging, hypot(p.x - start.x, p.y - start.y) > 5 {
            dragging = true
            NSCursor.closedHand.push()
            onDrag?(.began)
        }
        if dragging { onDrag?(.moved(p)) }
    }

    override func mouseUp(with event: NSEvent) {
        defer { pressedAt = nil }
        guard dragging else {
            if secondClick { onRenameRequest?() } else { onSelect?() }
            return
        }
        dragging = false
        NSCursor.pop()
        onDrag?(.ended(event.locationInWindow))
    }

    @objc private func closePane() { onClose?() }
}

/// What a tab's chip shows of the AI session in it (Claude, Codex, Antigravity, Cursor): its context and today's counts.
struct TabStats: Equatable {
    var ctx: Int, ctxMax: Double, tools: Int, web: Int, errors: Int
    /// The session's state as the header shows it: "busy", "waiting" (needs the user), "idle"...
    var status = ""
    /// The Claude account of the session, drawn as its initial disc: only given when the window's tabs use more than one.
    var account: AcctMark?
    /// The id the tab's chat is starred under in the sidebar's favourites (nil: a plain shell, no star), and whether
    /// it is starred.
    var starId: String?
    var starred = false
}

private final class TabChip: NSView, NSTextFieldDelegate {
    var onSelect: (() -> Void)?
    var onClose: (() -> Void)?
    var onDrag: ((TabDrag) -> Void)?
    /// The name typed in place (nil: cancelled), and a double-click's request for the editor, and the right-click menu.
    var onRename: ((String?) -> Void)?
    var onRenameRequest: (() -> Void)?
    var onMenu: (() -> NSMenu?)?
    var onFavorite: ((String) -> Void)?
    private var isActive = false
    private var hovering = false { didSet { if hovering != oldValue { paintStar() } } }
    private var hoverArea: NSTrackingArea?
    /// The chat's star (a chat tab only): filled amber always when favourited, an outline on hover and on the selected tab.
    private let star = NSButton()
    /// Behind a favourited chat's star: a soft amber plate with a glow (22 pt, inside the star's 24 pt target).
    private let plate = NSView()
    var stats: TabStats? {
        didSet {
            guard stats != oldValue else { return }
            fillStats()
            paintStar()
            paintMark()
            needsLayout = true
        }
    }
    private var editor: NSTextField?
    private var secondClick = false
    /// The mark of the session's state: a dot, the header's colour for working or needs-you.
    private let dot = NSView()
    var isEditing: Bool { editor != nil }
    private var pressedAt: NSPoint?
    private var dragging = false
    private let label = NSTextField(labelWithString: "")
    private let close = NSButton(title: "×", target: nil, action: nil)
    private let meter = CtxMeter()
    private let ctxText = NSTextField(labelWithString: "")
    private let counts = NSTextField(labelWithString: "")
    private let disc = NSImageView()

    init(title: String, number: Int, active: Bool) {
        super.init(frame: .zero)
        isActive = active
        wantsLayer = true
        layer?.cornerRadius = 6
        layer?.borderWidth = 1
        layer?.borderColor = NSColor(hex: Theme.accentHex, alpha: active ? 0.75 : 0.22).cgColor
        layer?.backgroundColor = active ? NSColor(hex: Theme.accentHex, alpha: 0.2).cgColor : NSColor.black.withAlphaComponent(0.28).cgColor
        label.stringValue = number <= 9 ? "\(number)  \(title)" : title
        label.font = Theme.mono(11, active ? .semibold : .regular)
        label.textColor = ThemeStore.shared.color(active ? "--accent-soft" : "--dim")
        // A long title (a chat named after its whole first prompt) is cut short with "…": it neither widens its tab past
        // the others' nor the window past the screen. Frames are set in layout(), so nothing here pushes the window.
        label.lineBreakMode = .byTruncatingTail
        ctxText.font = Theme.mono(10)
        ctxText.textColor = ThemeStore.shared.color("--txt")
        counts.font = Theme.mono(10)
        counts.lineBreakMode = .byTruncatingTail
        close.isBordered = false
        close.font = Theme.mono(13, .medium)
        close.contentTintColor = ThemeStore.shared.color(active ? "--accent-soft" : "--dim")
        close.target = self
        close.action = #selector(closeTab)
        close.toolTip = "End this tab"
        dot.wantsLayer = true
        dot.layer?.cornerRadius = 3.5
        dot.isHidden = true
        disc.isHidden = true
        star.isBordered = false
        star.imagePosition = .imageOnly
        star.imageScaling = .scaleProportionallyDown
        star.refusesFirstResponder = true
        star.focusRingType = .none
        star.target = self
        star.action = #selector(starTapped)
        star.isHidden = true
        plate.wantsLayer = true
        plate.isHidden = true
        for v in [dot, disc, label, meter, ctxText, counts, plate, star, close] as [NSView] { addSubview(v) }
        fillStats()
        paintStar()
    }

    private func paintStar() {
        guard let id = stats?.starId, !id.isEmpty else { star.isHidden = true; plate.isHidden = true; return }
        let on = stats?.starred == true
        star.isHidden = !(on || hovering || isActive)
        plate.isHidden = star.isHidden || !on
        if let l = plate.layer {
            let amber = ThemeStore.shared.color("--amber")
            l.cornerRadius = 6
            l.borderWidth = 1
            l.backgroundColor = amber.withAlphaComponent(0.15).cgColor
            l.borderColor = amber.withAlphaComponent(0.45).cgColor
            l.shadowColor = amber.cgColor
            l.shadowOpacity = 0.3
            l.shadowRadius = 5
            l.shadowOffset = .zero
        }
        let name = on ? "star.fill" : "star"
        let help = on ? "Remove this chat from your favorites" : "Add this chat to your favorites in the sidebar"
        let img = NSImage(systemSymbolName: name, accessibilityDescription: help)?
            .withSymbolConfiguration(.init(pointSize: 12, weight: .bold))
        star.image = img
        // The amber a touch lighter on its plate, so it keeps 3:1 against the selected chip in every theme.
        star.contentTintColor = on ? (ThemeStore.shared.color("--amber").blended(withFraction: 0.2, of: .white) ?? ThemeStore.shared.color("--amber")) : ThemeStore.shared.color("--accent-soft")
        star.toolTip = help
        star.setAccessibilityLabel(help)
    }

    @objc private func starTapped() {
        guard let id = stats?.starId, !id.isEmpty else { return }
        onFavorite?(id)
    }

    /// Only its own area is replaced (the chip's tooltip keeps its own). A chip rebuilt under the pointer (a tab's name
    /// changed) gets no mouseEntered: it starts out hovered, so the star doesn't vanish under the pointer.
    override func updateTrackingAreas() {
        super.updateTrackingAreas()
        if let a = hoverArea { removeTrackingArea(a) }
        let a = NSTrackingArea(rect: .zero, options: [.mouseEnteredAndExited, .activeInActiveApp, .inVisibleRect], owner: self)
        addTrackingArea(a)
        hoverArea = a
        if let w = window, NSApp.isActive { hovering = visibleRect.contains(convert(w.mouseLocationOutsideOfEventStream, from: nil)) }
    }

    override func mouseEntered(with event: NSEvent) { hovering = true }
    override func mouseExited(with event: NSEvent) { hovering = false }

    /// Working (the accent) or waiting for the user (the warning colour), as the header's status badge; the waiting dot
    /// pulses, unless Reduce Motion is on. Nothing for any other state.
    private func paintMark() {
        let st = stats?.status ?? ""
        dot.layer?.removeAllAnimations()
        let fav = stats?.starred == true && !(stats?.starId ?? "").isEmpty
        guard st == "busy" || st == "waiting", let hex = Theme.statusHex[st] else {
            dot.isHidden = true
            toolTip = nil
            setAccessibilityLabel(fav ? label.stringValue + ", favorite" : nil)
            return
        }
        dot.isHidden = false
        dot.layer?.backgroundColor = NSColor(hex: hex).cgColor
        toolTip = st == "busy" ? "Working" : "Needs you"
        setAccessibilityLabel(label.stringValue + (st == "busy" ? ", working" : ", needs you") + (fav ? ", favorite" : ""))
        if st == "waiting", !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion {
            let a = CABasicAnimation(keyPath: "opacity")
            a.fromValue = 1
            a.toValue = 0.3
            a.duration = 0.8
            a.autoreverses = true
            a.repeatCount = .infinity
            dot.layer?.add(a, forKey: "pulse")
        }
    }

    // MARK: renaming in place

    func beginEditing(text: String) {
        guard editor == nil, let w = window else { return }
        let f = NSTextField(string: text)
        f.font = Theme.mono(11)
        f.textColor = ThemeStore.shared.color("--txt")
        f.drawsBackground = true
        f.backgroundColor = NSColor.black.withAlphaComponent(0.55)
        f.isBordered = false
        f.focusRingType = .none
        f.lineBreakMode = .byTruncatingTail
        f.delegate = self
        f.frame = NSRect(x: 6, y: (bounds.height - 18) / 2, width: max(40, bounds.width - 30), height: 18)
        addSubview(f)
        editor = f
        label.isHidden = true
        w.makeFirstResponder(f)
        f.currentEditor()?.selectAll(nil)
    }

    private func finishEditing(commit: Bool) {
        guard let f = editor else { return }
        editor = nil
        let text = f.stringValue
        f.delegate = nil
        f.removeFromSuperview()
        label.isHidden = false
        onRename?(commit ? text : nil)
    }

    func control(_ control: NSControl, textView: NSTextView, doCommandBy commandSelector: Selector) -> Bool {
        guard commandSelector == #selector(NSResponder.cancelOperation(_:)) else { return false }
        finishEditing(commit: false)
        return true
    }

    func controlTextDidEndEditing(_ obj: Notification) { finishEditing(commit: true) }

    override func menu(for event: NSEvent) -> NSMenu? { onMenu?() }

    required init?(coder: NSCoder) { fatalError("not used") }

    override var isFlipped: Bool { true }

    private func fillStats() {
        disc.isHidden = stats?.account == nil
        if let m = stats?.account { disc.image = ChatWindowController.disc(m); disc.toolTip = "Claude account: " + m.label }
        guard let s = stats else { return }
        meter.frac = s.ctxMax > 0 ? min(1, Double(s.ctx) / s.ctxMax) : 0
        ctxText.stringValue = Self.tok(s.ctx)
        counts.attributedStringValue = tabStatsLine(s)
    }

    /// Two rows when there's room: the name with the context meter, then the counts. Narrower, the counts go first, then
    /// the meter; the name always stays.
    override func layout() {
        super.layout()
        let w = bounds.width, h = bounds.height
        close.frame = NSRect(x: w - 21, y: (h - 16) / 2, width: 16, height: 16)
        // The star's 24 pt slot is reserved whenever the tab is a chat, shown or not: the title never shifts.
        let hasStar = !(stats?.starId ?? "").isEmpty
        star.frame = NSRect(x: w - 21 - 24, y: (h - 24) / 2, width: 24, height: 24)
        plate.frame = star.frame.insetBy(dx: 1, dy: 1)
        let right = w - 26 - (hasStar ? 24 : 0)
        let showCounts = stats != nil && w >= 230
        let showMeter = stats != nil && w >= 150
        meter.isHidden = !showMeter
        ctxText.isHidden = !showMeter
        counts.isHidden = !showCounts
        let titleY = showCounts ? h / 2 - 15 : (h - 15) / 2
        var titleRight = right
        if showMeter {
            ctxText.sizeToFit()
            let tw = ctxText.frame.width
            ctxText.frame = NSRect(x: right - tw, y: titleY, width: tw, height: 15)
            meter.frame = NSRect(x: right - tw - 6 - 44, y: titleY + 5, width: 44, height: 5)
            titleRight = meter.frame.minX - 8
        }
        label.alignment = stats == nil ? .center : .left
        let discX: CGFloat = dot.isHidden ? 10 : 22
        let titleX: CGFloat = (stats == nil ? 22 : discX) + (disc.isHidden ? 0 : 19)
        disc.frame = NSRect(x: discX, y: titleY, width: 15, height: 15)
        dot.frame = NSRect(x: 10, y: titleY + 4, width: 7, height: 7)
        editor?.frame = NSRect(x: 6, y: (h - 18) / 2, width: max(40, w - 30), height: 18)
        label.frame = NSRect(x: titleX, y: titleY, width: max(0, titleRight - titleX), height: 15)
        if showCounts { counts.frame = NSRect(x: 10, y: h / 2 + 1, width: max(0, right - 10), height: 14) }
    }

    private static func tok(_ n: Int) -> String { tokenText(n) }

    // A click selects the tab when it's let go; a press that moves a few points drags it instead.
    override func mouseDown(with event: NSEvent) {
        pressedAt = event.locationInWindow
        dragging = false
        secondClick = event.clickCount == 2
    }

    override func mouseDragged(with event: NSEvent) {
        guard let start = pressedAt else { return }
        let p = event.locationInWindow
        if !dragging, hypot(p.x - start.x, p.y - start.y) > 5 {
            dragging = true
            NSCursor.closedHand.push()
            onDrag?(.began)
        }
        if dragging { onDrag?(.moved(p)) }
    }

    override func mouseUp(with event: NSEvent) {
        defer { pressedAt = nil }
        guard dragging else {
            if secondClick { onRenameRequest?() } else { onSelect?() }
            return
        }
        dragging = false
        NSCursor.pop()
        onDrag?(.ended(event.locationInWindow))
    }

    @objc private func closeTab() { onClose?() }
}

/// "12k" for a token count, as the chips and pane bars show the context.
fileprivate func tokenText(_ n: Int) -> String {
    let d = Double(n)
    if d >= 1e6 { return String(format: "%.1fM", d / 1e6) }
    if d >= 1e4 { return "\(Int((d / 1e3).rounded()))k" }
    if d >= 1e3 { return String(format: "%.1fk", d / 1e3) }
    return "\(n)"
}

/// "3 tools · 1 web · 0 err": the counts line of a tab chip, and of a pane's title bar.
@MainActor
fileprivate func tabStatsLine(_ s: TabStats) -> NSAttributedString {
    let num: [NSAttributedString.Key: Any] = [.font: Theme.mono(10, .semibold), .foregroundColor: ThemeStore.shared.color("--txt")]
    let dim: [NSAttributedString.Key: Any] = [.font: Theme.mono(10), .foregroundColor: ThemeStore.shared.color("--dim")]
    var err = num
    if s.errors > 0 { err[.foregroundColor] = ThemeStore.shared.color("--red") }
    let a = NSMutableAttributedString()
    for (text, attrs) in [("\(s.tools)", num), (" tools · ", dim), ("\(s.web)", num), (" web · ", dim), ("\(s.errors)", err), (" err", dim)] {
        a.append(NSAttributedString(string: text, attributes: attrs))
    }
    return a
}

/// A tab chip's context meter: the header's context bar, small (the accent fading to amber on a faint track).
private final class CtxMeter: NSView {
    var frac = 0.0 { didSet { if frac != oldValue { needsDisplay = true } } }

    override func draw(_ dirtyRect: NSRect) {
        NSColor.white.withAlphaComponent(0.08).setFill()
        bounds.fill()
        guard frac > 0 else { return }
        let fill = NSRect(x: 0, y: 0, width: bounds.width * frac, height: bounds.height)
        NSGradient(starting: ThemeStore.shared.color("--accent"), ending: ThemeStore.shared.color("--amber"))?.draw(in: fill, angle: 0)
    }
}
