import AppKit
import SwiftUI

// A chat window's Claude account (spec §4 to §7, option A "Başlık çipi"): the chip in the title row, its menu, the switch that
// waits for a reply to end, the limit note and the one-time 5% note, the quiet note after a switch.
// Hard rules: a switch happens only on the user's click (After This Reply is one); nothing counts down, rotates or runs by
// itself; no usage endpoint is asked (the limits come from the status line files and the transcript's 429); no token is read.

struct AcctMark: Equatable {
    let id: String
    let label: String
    let initial: String
    let hue: String

    init(_ a: ClaudeAccount) { id = a.id; label = a.label; initial = a.initial; hue = a.hue }

    var color: Color { Color(nsColor: nsColor) }
    var nsColor: NSColor {
        let p = hue.split(separator: ",").compactMap { Double($0.trimmingCharacters(in: .whitespaces)) }
        guard p.count == 3 else { return NSColor(calibratedRed: 1, green: 0.69, blue: 0.34, alpha: 1) }
        return NSColor(calibratedRed: p[0] / 255, green: p[1] / 255, blue: p[2] / 255, alpha: 1)
    }
}

/// What the title button shows.
struct AcctChipState: Equatable {
    var mark: AcctMark
    /// The smaller of the two windows' % left, when known.
    var left: Int?
    /// A window is used up (0%), or the transcript's last reply was a rate-limit error.
    var out: Bool
    /// The switch waiting for the reply to end.
    var pending: AcctMark?
}

enum AcctNoteKind: Equatable {
    case limit(from: AcctMark, what: String, fills: String, to: AcctMark?, otherOut: String?)
    case low(from: AcctMark, what: String, to: AcctMark, idle: Bool, key: String)
    case went(to: AcctMark, fromLabel: String, fills: String?)
    case switching(to: AcctMark)
}

struct AcctNote: Equatable {
    var kind: AcctNoteKind
    var sid: String
}

enum AcctAction {
    case continueWith(String, now: Bool)
    case notNow
    case dismiss
}

// MARK: - the chip

struct AccountChip: View {
    let state: AcctChipState
    let narrow: Bool
    let onOpen: () -> Void
    @State private var hover = false

    var body: some View {
        let hue = state.mark.color
        let waiting = state.pending != nil
        let lowNum = state.left.flatMap { $0 < 20 && !state.out ? $0 : nil }
        Button(action: onOpen) {
            HStack(spacing: 5) {
                AcctDisc(mark: state.mark, size: 16)
                if !narrow {
                    Text(state.mark.label).font(.mono(11, .semibold)).foregroundColor(hue).lineLimit(1)
                    if let to = state.pending {
                        Rectangle().fill(hue.opacity(0.4)).frame(width: 1, height: 12)
                        Image(systemName: "clock").font(.system(size: 11)).foregroundColor(to.color)
                        Text("\u{2192}").font(.system(size: 11)).foregroundColor(Theme.cText)
                        AcctDisc(mark: to, size: 14)
                        Text("after this reply").font(.system(size: 11, weight: .medium)).foregroundColor(Color(nsColor: .secondaryLabelColor))
                    } else if state.out {
                        Rectangle().fill(hue.opacity(0.35)).frame(width: 1, height: 12)
                        Text("limit").font(.mono(11, .bold)).foregroundColor(Theme.cRed)
                    } else if let n = lowNum {
                        Rectangle().fill(hue.opacity(0.35)).frame(width: 1, height: 12)
                        Text("\(n)%").font(.mono(11, .bold)).foregroundColor(Theme.cRed)
                    }
                } else if waiting, let to = state.pending {
                    Image(systemName: "clock").font(.system(size: 10)).foregroundColor(to.color)
                    AcctDisc(mark: to, size: 12)
                }
                Image(systemName: "chevron.down").font(.system(size: 8, weight: .bold)).foregroundColor(hue.opacity(0.85))
            }
            .padding(.leading, 3)
            .padding(.trailing, narrow ? 5 : 7)
            .frame(height: 22)
            .background(Capsule().fill(state.out ? Theme.cRed.opacity(0.10) : hue.opacity(hover ? 0.20 : 0.10)))
            .overlay(Capsule().strokeBorder(state.out ? Theme.cRed.opacity(0.7) : hue.opacity(hover ? 1 : 0.55),
                                            style: StrokeStyle(lineWidth: 1, dash: waiting ? [3, 2] : [])))
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .onHover { hover = $0 }
        .help("The Claude account this terminal uses. Click to switch.")
        .accessibilityLabel("Claude account: \(state.mark.label)"
            + (state.out ? ", out of its 5-hour limit" : lowNum.map { ", \($0)% left" } ?? "")
            + (state.pending.map { ", moves to \($0.label) when this reply ends" } ?? ""))
        .accessibilityAddTraits(.isButton)
    }
}

struct AcctDisc: View {
    let mark: AcctMark
    let size: CGFloat

    var body: some View {
        Text(mark.initial)
            .font(.system(size: size * 0.6, weight: .heavy))
            .foregroundColor(Theme.cInk)
            .frame(width: size, height: size)
            .background(Circle().fill(mark.color))
            .overlay(Circle().strokeBorder(Color.black.opacity(0.35), lineWidth: 1))
    }
}

// MARK: - the notes (the worktree note's slot)

struct AccountNoteBar: View {
    let note: AcctNote
    let act: (AcctAction) -> Void
    @ObservedObject var theme = ThemeStore.shared
    @State private var hoverGo = false
    @State private var hoverNot = false

    var body: some View {
        GeometryReader { geo in
            let wide = geo.size.width >= 420
            let tint: Color = { if case .limit = note.kind { return Theme.cRed }; if case .low = note.kind { return Theme.cAmber }; return Theme.cAccent }()
            HStack(spacing: 8) {
                Image(systemName: icon).font(.system(size: 13)).foregroundColor(iconColor)
                text(wide: wide)
                    .font(.system(size: 12))
                    .lineSpacing(2)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityLabel(spoken)
                buttons
            }
            .padding(.horizontal, 12)
            .frame(maxHeight: .infinity)
            .background(tint.opacity(isLimit ? 0.08 : 0.06))
            .overlay(alignment: .top) { Rectangle().fill(tint.opacity(0.2)).frame(height: 1) }
            .overlay(alignment: .bottom) { Rectangle().fill(tint.opacity(isLimit ? 0.4 : 0.42)).frame(height: 1) }
        }
        .accessibilityElement(children: .contain)
    }

    private var isLimit: Bool { if case .limit = note.kind { return true }; return false }
    private var icon: String {
        switch note.kind {
        case .limit, .low: return "gauge.with.dots.needle.0percent"
        case .went: return "checkmark.circle"
        case .switching: return "arrow.triangle.2.circlepath"
        }
    }
    private var iconColor: Color {
        switch note.kind {
        case .limit: return Color(red: 1, green: 0.54, blue: 0.54)
        case .low: return Theme.cAmber
        default: return Theme.cAccentSoft
        }
    }
    private var spoken: String {
        switch note.kind {
        case .limit(let f, let what, let fills, let to, let out):
            return "\(f.label) is out of its \(what)." + " It fills again \(fills)." + (to.map { " Continue with \($0.label)?" } ?? " " + (out ?? ""))
        case .low(let f, let what, let to, let idle, _):
            return "\(f.label) has 5% \(what == "week" ? "of its week " : "")left. " + (idle ? "Continue with \(to.label)?" : "Switch to \(to.label) when this reply ends?")
        case .went(let to, let from, let fills):
            return "This chat went on with \(to.label). \(from) fills again \(fills ?? "later")."
        case .switching(let to): return "Switching to \(to.label)\u{2026}"
        }
    }

    private func text(wide: Bool) -> Text {
        let hi = Theme.cHi, dim = theme.swiftUI("--txt2")
        switch note.kind {
        case .limit(let f, let what, let fills, let to, let out):
            let main = Text("\(f.label) is out of its \(what).").fontWeight(.semibold).foregroundColor(hi)
            guard wide else { return main }
            if to == nil, let out { return main + Text(" It fills again \(fills). \(out)").foregroundColor(dim) }
            return main + Text(" It fills again \(fills).").foregroundColor(dim)
        case .low(let f, let what, let to, let idle, _):
            let main = Text(what == "week" ? "\(f.label) has 5% of its week left." : "\(f.label) has 5% left.").fontWeight(.semibold).foregroundColor(hi)
            guard wide else { return main }
            return main + Text(idle ? " Continue with \(to.label)?" : " Switch to \(to.label) when this reply ends?").foregroundColor(dim)
        case .went(let to, let from, let fills):
            let main = Text("This chat went on with \(to.label).").fontWeight(.semibold).foregroundColor(hi)
            guard wide else { return main }
            return main + Text(fills.map { " \(from) fills again \($0)." } ?? "").foregroundColor(dim)
        case .switching(let to):
            return Text("Switching to \(to.label)\u{2026}").foregroundColor(Theme.cAccentSoft)
        }
    }

    @ViewBuilder private var buttons: some View {
        switch note.kind {
        case .limit(_, _, _, let to, _):
            if let to { go(to, "Continue with \(to.label)", now: true) }
            notNow("Not now", help: "Hide this until the next limit hit.")
        case .low(_, _, let to, let idle, _):
            go(to, idle ? "Continue with \(to.label)" : "After this reply", now: idle)
            notNow("Not now", help: "Hide this until that window fills again.")
        case .went:
            notNow("Dismiss", help: "Hide this note.", dismiss: true)
        case .switching:
            EmptyView()
        }
    }

    private func go(_ to: AcctMark, _ title: String, now: Bool) -> some View {
        Button { act(.continueWith(to.id, now: now)) } label: {
            HStack(spacing: 6) {
                AcctDisc(mark: to, size: 16)
                Text(title).font(.system(size: 12, weight: .semibold)).foregroundColor(hoverGo ? Theme.cHi : Theme.cAccentSoft)
            }
            .padding(.leading, 6).padding(.trailing, 10)
            .frame(height: 24)
            .background(RoundedRectangle(cornerRadius: 6).fill(Theme.cAccent.opacity(hoverGo ? 0.14 : 0.12)))
            .overlay(RoundedRectangle(cornerRadius: 6).stroke(Theme.cAccent, lineWidth: 1))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onHover { hoverGo = $0 }
    }

    private func notNow(_ title: String, help: String, dismiss: Bool = false) -> some View {
        Button { act(dismiss ? .dismiss : .notNow) } label: {
            Text(title).font(.system(size: 12)).foregroundColor(hoverNot ? Theme.cHi : theme.swiftUI("--txt3"))
                .padding(.horizontal, 6).frame(height: 24).contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onHover { hoverNot = $0 }
        .help(help)
    }
}

// MARK: - the window's side of it

/// The windows (percent left, when it fills again) of an account, from its status line file.
struct AcctWindows {
    var five: (left: Double, resets: Double)?
    var week: (left: Double, resets: Double)?

    init(_ a: ClaudeAccount) {
        let j = ClaudeAccounts.limits(of: a)
        func one(_ key: String) -> (Double, Double)? {
            guard let w = j?[key] as? [String: Any], let pct = (w["pct"] as? NSNumber)?.doubleValue else { return nil }
            let resets = (w["resetsAt"] as? NSNumber)?.doubleValue ?? 0
            if resets > 0, resets <= Date().timeIntervalSince1970 * 1000 { return nil }
            return (100 - min(100, max(0, pct)), resets)
        }
        five = one("fiveHour")
        week = one("week")
    }

    var minLeft: Double? { [five?.left, week?.left].compactMap { $0 }.min() }
}

private func clockText(_ ms: Double, full: Bool = false) -> String {
    let d = Date(timeIntervalSince1970: ms / 1000)
    let f = DateFormatter()
    if d.timeIntervalSinceNow < 20 * 3600 { f.dateFormat = "HH:mm" } else { f.dateFormat = full ? "EEEE HH:mm" : "EEEE" }
    return f.string(from: d)
}

extension ChatWindowController {
    /// The Claude session (or plain terminal) of the pane the user is in, when an account applies there: not a Codex,
    /// Antigravity or Cursor chat.
    private func acctTarget(_ pane: ChatTerminalView? = nil) -> (tv: ChatTerminalView, pty: PtySession?, brief: SessionBrief?)? {
        let tv = pane ?? focusedTerminal
        // The engine's match by window, else the live AI nearest the pane's shell: the match follows a shell that just
        // started (a switch's) only once the window tells it, and a Claude must never be taken for a plain terminal.
        let shell = tv === terminal ? shellPid : extras.first { $0.terminal === tv }?.shellPid ?? 0
        let brief = briefFor(tv) ?? (shell > 0 ? manager?.nearestBrief(under: shell) : nil)
        if let b = brief, b.id.hasPrefix("ai:") { return nil }
        let pty = sessionName(of: tv).flatMap { Sessions.live[$0] }
        return (tv, pty, brief)
    }

    /// The account of a Claude session as a mark (nil when there is only one account or the session is not Claude's).
    func acctMark(_ b: SessionBrief) -> AcctMark? {
        guard ClaudeAccounts.multiple, !b.id.hasPrefix("ai:") else { return nil }
        return ClaudeAccounts.account(b.account.isEmpty ? ClaudeAccounts.defaultId : b.account).map(AcctMark.init)
    }

    private func acctId(_ t: (tv: ChatTerminalView, pty: PtySession?, brief: SessionBrief?)) -> String {
        // While a switch is under way the brief may still be the leaving Claude's: the session's account is the new one.
        if let b = t.brief, b.live, !b.account.isEmpty, hud.switching[b.id] == nil { return b.account }
        return t.pty?.account ?? ClaudeAccounts.defaultId
    }

    /// Called whenever the engine's brief of this window changes and when the focus moves: the chip, the notes, and a
    /// pending switch whose reply has ended.
    func acctRefresh() {
        if !ClaudeAccounts.multiple { hud.pendingSwitch.removeAll() }
        // Every pane's waiting switch, not only the one in front: a reply that ends in a tab behind still switches then.
        if ClaudeAccounts.multiple, !hud.mirror, acctRunPending() { return }
        guard ClaudeAccounts.multiple, !hud.mirror, let t = acctTarget(), let cur = ClaudeAccounts.account(acctId(t)) else {
            if hud.acct != nil { hud.acct = nil }
            if hud.acctNote != nil, !hud.acctHold { hud.acctNote = nil }
            return
        }
        let b = t.brief
        let me = AcctMark(cur)
        let w = AcctWindows(cur)
        let sid = b?.id ?? ""
        let pendingMark = hud.pendingSwitch[sid].flatMap { ClaudeAccounts.account($0) }.map(AcctMark.init)
        let out = (w.five?.left ?? 100) <= 0 || (w.week?.left ?? 100) <= 0 || b?.limitHit == true
        let state = AcctChipState(mark: me, left: w.minLeft.map { Int($0.rounded()) }, out: out, pending: pendingMark)
        if hud.acct != state { hud.acct = state }
        // The notes: the limit note wins over the 5% note; a "went on" note stays until the next prompt.
        guard let b, b.live else {
            // Right after a switch the new Claude has not registered yet: its note stays a little.
            if case .went? = hud.acctNote?.kind, Date().timeIntervalSince1970 * 1000 - hud.wentAt < 30_000 { return }
            if !hud.acctHold { hud.acctNote = nil }
            return
        }
        if case .went? = hud.acctNote?.kind {
            // Until the next prompt (the chat is busy again after the switch).
            if b.status == "busy", b.statusSince > hud.wentAt { hud.acctNote = nil }
            return
        }
        if hud.acctHold { return }
        // "Not now" on a limit note lasts until the next limit hit: the hit is over once a normal reply came.
        if !b.limitHit { hud.limitQuiet.remove(b.id) }
        // The accounts a note may offer: signed in, and outside this account's quota (another organization).
        let others = ClaudeAccounts.all.filter { $0.id != cur.id && (cur.orgId.isEmpty || $0.orgId != cur.orgId) && ($0.isDefault || !$0.email.isEmpty) }
        // What another account has left; one with nothing seen yet (no reply under it so far) counts as having room.
        func room(_ a: ClaudeAccount) -> Double { AcctWindows(a).minLeft ?? 100 }
        let best = others.map { ($0, room($0)) }.filter { $0.1 > 0 }.max { $0.1 < $1.1 }?.0
        var note: AcctNote?
        if b.limitHit, !hud.limitQuiet.contains(b.id) {
            let weekOut = (w.week?.left ?? 100) <= 0 && (w.five?.left ?? 0) > 0
            let reset = (weekOut ? w.week?.resets : w.five?.resets) ?? 0
            let fills = reset > 0 ? (weekOut ? "on \(clockText(reset))" : "at \(clockText(reset))") : "later"
            let what = weekOut ? "weekly limit" : "5-hour limit"
            if let best {
                note = AcctNote(kind: .limit(from: me, what: what, fills: fills, to: AcctMark(best), otherOut: nil), sid: b.id)
            } else if let first = others.first {
                let r = AcctWindows(first).five?.resets ?? 0
                note = AcctNote(kind: .limit(from: me, what: what, fills: fills, to: nil,
                                             otherOut: others.count == 1 ? "\(first.label) is out too\(r > 0 ? ", until \(clockText(r))" : "")." : "The others are out too."), sid: b.id)
            }
        } else if !b.limitHit {
            // 5% or less in a window, and another account has more than 20% in that window, once per window per reset.
            for (name, win) in [("5h", w.five), ("week", w.week)] {
                guard let win, win.left <= 5 else { continue }
                // The one with the most left in that window (nothing seen yet counts as room), usable in both.
                let alt = others.map { a -> (ClaudeAccount, Double) in
                    let ow = AcctWindows(a)
                    return (a, (ow.minLeft ?? 100) > 0 ? ((name == "5h" ? ow.five : ow.week)?.left ?? 100) : 0)
                }.filter { $0.1 > 20 }.max { $0.1 < $1.1 }?.0
                guard let alt else { continue }
                let key = "\(cur.id)|\(name)|\(Int(win.resets))"
                var showing = false
                if case .low(_, _, _, _, let k)? = hud.acctNote?.kind, k == key { showing = true }
                if (ClaudeAccountsNotes.seen(key) && !showing) || hud.lowQuiet.contains(key) { continue }
                // Idle only at YOUR TURN: a permission question is still inside the reply.
                note = AcctNote(kind: .low(from: me, what: name, to: AcctMark(alt), idle: b.status == "idle", key: key), sid: b.id)
                break
            }
        }
        if hud.acctNote != note {
            hud.acctNote = note
            // Announced once (medium priority), as the worktree note is.
            if let note, let w = window {
                let text: String
                switch note.kind {
                case .limit(let f, let what, _, let to, _): text = "\(f.label) is out of its \(what)." + (to.map { " Continue with \($0.label) is in the note under the header." } ?? "")
                case .low(let f, _, let to, _, _): text = "\(f.label) has 5% left. Switch to \(to.label) is in the note under the header."
                default: text = ""
                }
                if !text.isEmpty { NSAccessibility.post(element: w, notification: .announcementRequested, userInfo: [.announcement: text, .priority: NSAccessibilityPriorityLevel.medium.rawValue]) }
            }
            if case .low(_, _, _, _, let key)? = note?.kind { ClaudeAccountsNotes.shown(key) }
        }
    }

    // MARK: the note's buttons

    func acctNoteAction(_ a: AcctAction) {
        guard let note = hud.acctNote else { return }
        switch a {
        case .continueWith(let id, let now):
            switch note.kind {
            case .low(_, _, _, let idle, _) where !idle || !now:
                hud.pendingSwitch[note.sid] = id
                hud.acctNote = nil
                acctRefresh()
            default:
                hud.acctNote = nil
                // The pane of the session the note is about (gone meanwhile: nothing switches).
                if let tv = allTerminals.first(where: { acctTarget($0)?.brief?.id == note.sid }) { acctPerform(id, now: true, pane: tv) }
            }
        case .notNow:
            switch note.kind {
            case .limit: hud.limitQuiet.insert(note.sid)
            case .low(_, _, _, _, let key): hud.lowQuiet.insert(key)
            default: break
            }
            hud.acctNote = nil
        case .dismiss:
            hud.acctNote = nil
        }
    }

    // MARK: the menu

    func acctMenu() {
        guard let t = acctTarget(), let window else { return }
        let curId = acctId(t)
        let b = t.brief
        // Claude's reply runs: answering, or asking a permission question inside it.
        let working = b?.live == true && (b?.status == "busy" || b?.status == "waiting")
        let pending = b.flatMap { hud.pendingSwitch[$0.id] }
        let menu = NSMenu()
        menu.autoenablesItems = false
        let title = "Claude Account for This Tab"
        if #available(macOS 14, *) { menu.addItem(NSMenuItem.sectionHeader(title: title)) } else {
            let h = NSMenuItem(title: title, action: nil, keyEquivalent: ""); h.isEnabled = false; menu.addItem(h)
        }
        let accounts = ClaudeAccounts.all
        for a in accounts {
            let w = AcctWindows(a)
            let sub: String = {
                if a.id != curId, !a.orgId.isEmpty, accounts.first(where: { $0.id == curId })?.orgId == a.orgId, let c = accounts.first(where: { $0.id == curId }) {
                    return "shares \(c.label)\u{2019}s limits"
                }
                if pending == a.id { return "\u{25F7} next, when this reply ends" + (w.five.map { " \u{00B7} 5h \(Int($0.left.rounded()))% left" } ?? "") }
                guard w.five != nil || w.week != nil else { return "no limits seen yet" }
                let wk = w.week.map { " \u{00B7} week \(Int($0.left.rounded()))%" } ?? ""
                guard let f = w.five else { return "week \(Int(w.week?.left.rounded() ?? 0))% left" }
                if f.left <= 0 { return "5h used up, fills again \(clockText(f.resets))" + wk }
                if f.left < 50 { return "5h \(Int(f.left.rounded()))% left, fills again \(clockText(f.resets))" + wk }
                return "5h \(Int(f.left.rounded()))% left" + wk
            }()
            let item = BlockMenuItem(title: a.label + (a.email.isEmpty ? "" : "   " + a.email)) { [weak self] in
                DispatchQueue.main.async { self?.acctPick(a.id) }
            }
            item.state = a.id == curId ? .on : .off
            item.image = Self.disc(AcctMark(a))
            if #available(macOS 14.4, *) { item.subtitle = sub } else { item.toolTip = sub }
            menu.addItem(item)
        }
        if let b, b.live, working, accounts.count >= 2 {
            menu.addItem(.separator())
            let others = accounts.filter { $0.id != curId }
            if let pending, let target = ClaudeAccounts.account(pending) {
                menu.addItem(BlockMenuItem(title: "Cancel Switch to \(target.label)") { [weak self] in
                    DispatchQueue.main.async { self?.hud.pendingSwitch[b.id] = nil; self?.acctRefresh() }
                })
                menu.addItem(BlockMenuItem(title: "Continue with \(target.label) Now") { [weak self] in
                    DispatchQueue.main.async { self?.hud.pendingSwitch[b.id] = nil; self?.acctPerform(target.id, now: true) }
                })
            } else if others.count == 1, let o = others.first {
                menu.addItem(BlockMenuItem(title: "Switch to \(o.label) When This Reply Ends") { [weak self] in
                    DispatchQueue.main.async { self?.hud.pendingSwitch[b.id] = o.id; self?.acctRefresh() }
                })
            } else if others.count > 1 {
                let sub = NSMenu()
                for o in others {
                    sub.addItem(BlockMenuItem(title: o.label) { [weak self] in
                        DispatchQueue.main.async { self?.hud.pendingSwitch[b.id] = o.id; self?.acctRefresh() }
                    })
                }
                let parent = NSMenuItem(title: "Switch When This Reply Ends", action: nil, keyEquivalent: "")
                parent.submenu = sub
                menu.addItem(parent)
            }
        } else if let b, let pending, let target = ClaudeAccounts.account(pending) {
            menu.addItem(.separator())
            menu.addItem(BlockMenuItem(title: "Cancel Switch to \(target.label)") { [weak self] in
                DispatchQueue.main.async { self?.hud.pendingSwitch[b.id] = nil; self?.acctRefresh() }
            })
        }
        menu.addItem(.separator())
        menu.addItem(BlockMenuItem(title: "Add Claude Account\u{2026}") { [weak self] in
            DispatchQueue.main.async { self?.manager?.openClaudeSettings(add: true) }
        })
        menu.addItem(BlockMenuItem(title: "Manage Claude Accounts\u{2026}") { [weak self] in
            DispatchQueue.main.async { self?.manager?.openClaudeSettings(add: false) }
        })
        var loc = window.mouseLocationOutsideOfEventStream
        // From the menu bar (Chat › Claude Account…) the pointer is outside the window: under the title row instead.
        if let content = window.contentView, !content.bounds.contains(loc) { loc = NSPoint(x: 180, y: content.bounds.height - 34) }
        menu.popUp(positioning: nil, at: NSPoint(x: max(8, loc.x - 20), y: loc.y - 6), in: window.contentView)
    }

    /// The initial on its colour, 16 pt, for a menu row's image.
    static func disc(_ m: AcctMark) -> NSImage {
        let size = NSSize(width: 16, height: 16)
        return NSImage(size: size, flipped: false) { r in
            m.nsColor.setFill()
            NSBezierPath(ovalIn: r.insetBy(dx: 0.5, dy: 0.5)).fill()
            let s = NSAttributedString(string: m.initial, attributes: [.font: NSFont.systemFont(ofSize: 9.5, weight: .heavy),
                                                                      .foregroundColor: NSColor(calibratedRed: 0.1, green: 0.05, blue: 0, alpha: 1)])
            let sz = s.size()
            s.draw(at: NSPoint(x: (r.width - sz.width) / 2, y: (r.height - sz.height) / 2))
            return true
        }
    }

    /// The menu's pick: a switch on the user's own click.
    private func acctPick(_ id: String) {
        guard let t = acctTarget(), id != acctId(t), let to = ClaudeAccounts.account(id), let window else { return }
        let b = t.brief
        let pane = t.tv
        if let b, b.live, b.status == "busy" || b.status == "waiting" {
            // Claude is answering (or asking a permission question inside its reply): a sheet first, because switching
            // now stops the reply.
            let alert = NSAlert()
            alert.messageText = "Continue this chat with \(to.label)?"
            alert.informativeText = "Claude is still answering. After this reply, the same chat goes on with \(to.label) without stopping. Continue Now stops the reply here."
            alert.addButton(withTitle: "After This Reply")
            alert.addButton(withTitle: "Continue Now")
            alert.addButton(withTitle: "Cancel")
            alert.beginSheetModal(for: window) { [weak self] r in
                guard let self else { return }
                if r == .alertFirstButtonReturn { self.hud.pendingSwitch[b.id] = id; self.acctRefresh() }
                else if r == .alertSecondButtonReturn { self.acctPerform(id, now: true, pane: pane) }
            }
            return
        }
        acctPerform(id, now: true, pane: pane)
    }

    /// The switches waiting for a reply to end, in every pane of this window. One runs when its session is at YOUR TURN; one
    /// whose session has ended or left the window, or whose account is gone or used up, is dropped without switching.
    /// True when one ran (the window is refreshed again by the engine's next brief).
    private func acctRunPending() -> Bool {
        guard !hud.pendingSwitch.isEmpty else { return false }
        var panes: [String: (tv: ChatTerminalView, brief: SessionBrief)] = [:]
        for tv in allTerminals { if let b = acctTarget(tv)?.brief, b.live { panes[b.id] = (tv, b) } }
        var ran = false
        for (sid, to) in hud.pendingSwitch {
            guard let p = panes[sid], let target = ClaudeAccounts.account(to), (AcctWindows(target).minLeft ?? 100) > 0 else {
                hud.pendingSwitch[sid] = nil
                continue
            }
            // A permission question (NEEDS YOU) is not the end of a reply: it waits.
            if p.brief.status == "idle" {
                hud.pendingSwitch[sid] = nil
                acctPerform(to, now: true, pane: p.tv)
                ran = true
            }
        }
        return ran
    }

    // MARK: the switch itself

    /// Goes on in the same pane with another account: the terminal's shell (and Claude in it) ends and the same view starts a
    /// new one with the account's environment, resuming the chat (PtySession.restart); nothing is typed. The chat's history
    /// is shared between accounts (their `projects` is one folder), so the resumed chat is the same one. A plain terminal
    /// restarts in its folder, after a question if something runs in it.
    func acctPerform(_ id: String, now: Bool, pane: ChatTerminalView? = nil) {
        guard let t = acctTarget(pane), let to = ClaudeAccounts.account(id), let pty = t.pty else { return NSSound.beep() }
        let inFront = t.tv === focusedTerminal
        let from = ClaudeAccounts.account(acctId(t))
        let fromLabel = from?.label ?? "The other account"
        let fromFills = from.flatMap { AcctWindows($0).five?.resets }.flatMap { $0 > 0 ? "at " + clockText($0) : nil }
        let folder = pty.shellPid.flatMap { Proc.cwd($0) } ?? cwd
        // The chat in this pane: its brief, else (no brief yet: a Claude that just started, e.g. right after another switch)
        // the Claude chat the session was started to resume, while it is on its way or runs.
        let chat: (id: String, cwd: String, pid: Int32)? = {
            if let b = t.brief, b.live, !b.id.hasPrefix("ai:") { return (b.id, b.cwd.isEmpty ? folder : b.cwd, b.pid ?? -1) }
            guard let a = pty.ai, a.tool == "claude" else { return nil }
            let runs = pty.shellPid.map { Self.runsAgent($0) } ?? false
            return hud.switching[a.id] != nil || runs ? (a.id, folder, -1) : nil
        }()
        if let chat {
            if let top = Worktrees.info(of: chat.cwd)?.top { ClaudeAccounts.remember(to.id, inRepo: top) }
            // The same chat in the same pane: only this session's shell (and the Claude in it) ends, and a new one resumes it
            // with the account's environment. A restart already under way: nothing (one click at a time).
            let was = (pty.ai, pty.aiSeen)
            pty.ai = ("claude", chat.id)
            pty.aiSeen = false
            guard pty.restart(cwd: chat.cwd, claudeArgs: ["--resume", chat.id], account: to.id) else {
                (pty.ai, pty.aiSeen) = was
                return NSSound.beep()
            }
            // "starting" until the new Claude is up, never ended; given up after 30 s (Claude didn't come back).
            hud.switching[chat.id] = chat.pid
            DispatchQueue.main.asyncAfter(deadline: .now() + 30) { [weak self] in
                guard let self, self.hud.switching[chat.id] == chat.pid else { return }
                self.hud.switching[chat.id] = nil
                self.acctSwitchShown()
            }
            acctSwitchShown()
            // The chip shows the new account at once (after this call: a waiting switch runs from inside acctRefresh).
            DispatchQueue.main.async { [weak self] in self?.acctRefresh() }
            // The quiet note is about the pane in front (a tab behind whose reply ended switches without one).
            guard inFront else { return }
            hud.wentAt = Date().timeIntervalSince1970 * 1000
            hud.acctNote = AcctNote(kind: .went(to: AcctMark(to), fromLabel: fromLabel, fills: fromFills), sid: chat.id)
            if let w = window { NSAccessibility.post(element: w, notification: .announcementRequested, userInfo: [.announcement: "This chat went on with \(to.label)", .priority: NSAccessibilityPriorityLevel.medium.rawValue]) }
            return
        }
        // A plain terminal, or a chat that ended: restarted in its folder; asked first when something runs in it.
        let go = { [weak self] in
            pty.ai = nil
            pty.restart(cwd: folder, claudeArgs: nil, account: to.id)
            if inFront { self?.hud.acctNote = nil }
        }
        if paneRuns(t.tv), let window {
            let alert = NSAlert()
            alert.messageText = "Restart this terminal with \(to.label)?"
            alert.informativeText = "What runs in it stops."
            alert.addButton(withTitle: "Restart")
            alert.addButton(withTitle: "Cancel")
            alert.beginSheetModal(for: window) { r in if r == .alertFirstButtonReturn { go() } }
        } else {
            go()
        }
    }
}

/// The 5% note shows once per account, window and reset: the keys already shown are kept (the file is the app's own).
enum ClaudeAccountsNotes {
    private static let key = "claudeAccountsLowSeen"
    static func seen(_ k: String) -> Bool { (UserDefaults.standard.stringArray(forKey: key) ?? []).contains(k) }
    static func shown(_ k: String) {
        var list = UserDefaults.standard.stringArray(forKey: key) ?? []
        guard !list.contains(k) else { return }
        list.append(k)
        UserDefaults.standard.set(Array(list.suffix(60)), forKey: key)
    }
}
