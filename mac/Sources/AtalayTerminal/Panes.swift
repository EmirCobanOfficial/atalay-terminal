import AppKit
import SwiftTerm

// iTerm2's tabs and split panes inside a chat window (ChatWindowController): ⌘T opens a tab, ⌘D and ⇧⌘D split the pane
// in front. The window's own chat or terminal is its first pane; every other one is an ExtraPane, a shell of its own in
// a detached session named after the window's (so it outlives the app too, and comes back into the same window).

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
    static func renamed(_ name: String, kind: PaneKind) -> String? {
        guard extraInfo(name) != nil else { return nil }
        var chars = Array(name)
        chars[prefix.count + 1] = kind.rawValue
        let new = String(chars)
        let p = Process()
        p.executableURL = URL(fileURLWithPath: screen)
        p.arguments = ["-S", name, "-X", "sessionname", new]
        guard (try? p.run()) != nil else { return nil }
        p.waitUntilExit()
        return p.terminationStatus == 0 ? new : nil
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

/// A pane besides the window's own: a shell in its own detached session.
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

    init(owner: ChatWindowController, cwd: String, kind: PaneKind, fontSize: CGFloat) {
        self.owner = owner
        self.cwd = cwd
        self.kind = kind
        super.init()
        terminal = TerminalFactory.makeIdle(chatId: owner.id, fontSize: fontSize, delegate: self)
        try? terminal.setUseMetal(true)
    }

    /// Now in a split rather than a tab of its own (or the other way): its session's name follows, for the next launch.
    func rekind(_ new: PaneKind) {
        guard new != kind else { return }
        kind = new
        if let old = link?.name, let name = Detached.renamed(old, kind: new) { link = DetachedLink(name: name) }
    }

    /// A new shell in a new session next to the window's, or (`session`) one still running from before.
    func start(session: String?, parent: String?, fit: Bool) {
        guard let parent, Detached.available else { return runLocally() }
        if let session {
            link = DetachedLink(name: session)
            // Its scrollback from before (the app quit, or the pane closed a moment ago), above the rows screen
            // repaints: like the window's own terminal (ChatWindowController.attachSession).
            let history = Detached.takeHistory(session)
            if !history.isEmpty {
                terminal.feed(text: history.joined(separator: "\r\n") + String(repeating: "\r\n", count: max(rows, 60) + 1))
            }
            return attach(fit: fit)
        }
        let name = Detached.extraName(parent: parent, kind: kind)
        link = DetachedLink(name: name)
        Detached.start(name: name, cwd: cwd, claudeArgs: nil) { [weak self] ok in
            guard let self, !self.closing else { return }
            ok ? self.attach(fit: fit) : self.runLocally()
        }
    }

    private func runLocally() {
        link = nil
        attached = true
        TerminalFactory.start(terminal, cwd: cwd, claudeArgs: nil)
    }

    private func attach(fit: Bool) {
        guard let link, !attached else { return }
        attached = true
        TerminalFactory.attach(terminal, screenName: link.name, cwd: cwd, fit: fit)
        self.fit()
    }

    /// The session takes this pane's size once it has settled.
    func fit() {
        guard let link, attached else { return }
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
        if let link, attached, !closing {
            let text = String(decoding: terminal.getBufferAsData(kind: .normal), as: UTF8.self)
            Detached.saveHistory(link.name, text: text, rows: rows)
        }
        closing = true
        terminal.terminate()
    }

    /// Ends the pane's shell and session.
    func end() {
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

    override func layout() {
        super.layout()
        let visible = shown
        guard !visible.isEmpty else { return }
        let room = length - CGFloat(visible.count - 1) * dividerThickness
        let total = visible.reduce(CGFloat(0)) { $0 + shares[$1] }
        var pos: CGFloat = 0
        for (n, i) in visible.enumerated() {
            let size = n == visible.count - 1 ? length - pos : (room * shares[i] / max(total, 0.0001)).rounded()
            arrangedSubviews[i].frame = isVertical
                ? NSRect(x: pos, y: 0, width: max(0, size), height: bounds.height)
                : NSRect(x: 0, y: pos, width: bounds.width, height: max(0, size))
            pos += size + dividerThickness
        }
        window?.invalidateCursorRects(for: self)
        needsDisplay = true
    }

    /// The gap after pane `i` (between it and the next shown one).
    private func gap(after i: Int) -> NSRect {
        let f = arrangedSubviews[i].frame
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
        let a = arrangedSubviews[k].frame, b = arrangedSubviews[k + 1].frame
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

/// A tab being dragged: it started, it's over a point of the window, or it was let go there.
enum TabDrag { case began, moved(NSPoint), ended(NSPoint) }

/// The window's tabs, under its header when there are two or more, as in iTerm2. A tab can be dragged: along the bar to
/// move it, or onto a pane to split it there (ChatWindowController).
@MainActor
final class PaneTabBar: NSView {
    var onSelect: ((Int) -> Void)?
    var onClose: ((Int) -> Void)?
    var onDrag: ((Int, TabDrag) -> Void)?
    private let stack = NSStackView()

    override init(frame: NSRect) {
        super.init(frame: frame)
        stack.orientation = .horizontal
        stack.distribution = .fillEqually
        stack.spacing = 4
        stack.translatesAutoresizingMaskIntoConstraints = false
        addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: trailingAnchor),
            stack.topAnchor.constraint(equalTo: topAnchor),
            stack.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])
    }

    required init?(coder: NSCoder) { fatalError("not used") }

    func show(titles: [String], active: Int) {
        stack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        for (i, t) in titles.enumerated() {
            let chip = TabChip(title: t, number: i + 1, active: i == active)
            chip.onSelect = { [weak self] in self?.onSelect?(i) }
            chip.onClose = { [weak self] in self?.onClose?(i) }
            chip.onDrag = { [weak self] in self?.onDrag?(i, $0) }
            stack.addArrangedSubview(chip)
        }
    }

    /// Each tab's AI session figures, in tab order (nil: no AI in that tab). Updated in place, so a chip being dragged
    /// isn't rebuilt under the pointer.
    func setStats(_ stats: [TabStats?]) {
        for (chip, s) in zip(stack.arrangedSubviews.compactMap { $0 as? TabChip }, stats) { chip.stats = s }
    }

    /// Where a tab let go at `point` (window coordinates) goes: before the tab whose middle is past it; nil off the bar.
    func slot(at point: NSPoint) -> Int? {
        let p = convert(point, from: nil)
        guard bounds.insetBy(dx: 0, dy: -12).contains(p) else { return nil }
        let chips = stack.arrangedSubviews
        return chips.firstIndex { p.x < $0.convert($0.bounds, to: self).midX } ?? chips.count
    }

    /// The line that shows slot `i` (window coordinates).
    func marker(at i: Int) -> NSRect {
        let chips = stack.arrangedSubviews
        guard !chips.isEmpty else { return .zero }
        let x = i < chips.count ? chips[i].convert(chips[i].bounds, to: self).minX - 2 : chips[chips.count - 1].convert(chips[chips.count - 1].bounds, to: self).maxX + 2
        return convert(NSRect(x: x - 1.5, y: 0, width: 3, height: bounds.height), to: nil)
    }
}

/// What a tab's chip shows of the AI session in it (Claude, Codex, Antigravity, Cursor): its context and today's counts.
struct TabStats: Equatable {
    var ctx: Int, ctxMax: Double, tools: Int, web: Int, errors: Int
}

private final class TabChip: NSView {
    var onSelect: (() -> Void)?
    var onClose: (() -> Void)?
    var onDrag: ((TabDrag) -> Void)?
    var stats: TabStats? {
        didSet {
            guard stats != oldValue else { return }
            fillStats()
            needsLayout = true
        }
    }
    private var pressedAt: NSPoint?
    private var dragging = false
    private let label = NSTextField(labelWithString: "")
    private let close = NSButton(title: "×", target: nil, action: nil)
    private let meter = CtxMeter()
    private let ctxText = NSTextField(labelWithString: "")
    private let counts = NSTextField(labelWithString: "")

    init(title: String, number: Int, active: Bool) {
        super.init(frame: .zero)
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
        for v in [label, meter, ctxText, counts, close] as [NSView] { addSubview(v) }
        fillStats()
    }

    required init?(coder: NSCoder) { fatalError("not used") }

    override var isFlipped: Bool { true }

    private func fillStats() {
        guard let s = stats else { return }
        meter.frac = s.ctxMax > 0 ? min(1, Double(s.ctx) / s.ctxMax) : 0
        ctxText.stringValue = Self.tok(s.ctx)
        let num: [NSAttributedString.Key: Any] = [.font: Theme.mono(10, .semibold), .foregroundColor: ThemeStore.shared.color("--txt")]
        let dim: [NSAttributedString.Key: Any] = [.font: Theme.mono(10), .foregroundColor: ThemeStore.shared.color("--dim")]
        var err = num
        if s.errors > 0 { err[.foregroundColor] = ThemeStore.shared.color("--red") }
        let a = NSMutableAttributedString()
        for (text, attrs) in [("\(s.tools)", num), (" tools · ", dim), ("\(s.web)", num), (" web · ", dim), ("\(s.errors)", err), (" err", dim)] {
            a.append(NSAttributedString(string: text, attributes: attrs))
        }
        counts.attributedStringValue = a
    }

    /// Two rows when there's room: the name with the context meter, then the counts. Narrower, the counts go first, then
    /// the meter; the name always stays.
    override func layout() {
        super.layout()
        let w = bounds.width, h = bounds.height
        close.frame = NSRect(x: w - 21, y: (h - 16) / 2, width: 16, height: 16)
        let right = w - 26
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
        let titleX: CGFloat = stats == nil ? 22 : 10
        label.frame = NSRect(x: titleX, y: titleY, width: max(0, titleRight - titleX), height: 15)
        if showCounts { counts.frame = NSRect(x: 10, y: h / 2 + 1, width: max(0, right - 10), height: 14) }
    }

    private static func tok(_ n: Int) -> String {
        let d = Double(n)
        if d >= 1e6 { return String(format: "%.1fM", d / 1e6) }
        if d >= 1e4 { return "\(Int((d / 1e3).rounded()))k" }
        if d >= 1e3 { return String(format: "%.1fk", d / 1e3) }
        return "\(n)"
    }

    // A click selects the tab when it's let go; a press that moves a few points drags it instead.
    override func mouseDown(with event: NSEvent) {
        pressedAt = event.locationInWindow
        dragging = false
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
            onSelect?()
            return
        }
        dragging = false
        NSCursor.pop()
        onDrag?(.ended(event.locationInWindow))
    }

    @objc private func closeTab() { onClose?() }
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
