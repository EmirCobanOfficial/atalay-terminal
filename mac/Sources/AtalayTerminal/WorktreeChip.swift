import SwiftUI
import AppKit

// The chat window's title row, for a window in a linked worktree (spec 4.1): the chip "⎇ vega +42 −7" (a click shows the
// worktree's changes in Source Control) and the split button whose face is the next step (Create PR, Merge PR, Delete
// worktree) with a ▾ for every action. Colours are the theme's own tokens, drawn over the header as it is: no background of
// their own.

/// A ring that turns (checks running, an action at work); with Reduce Motion it stands still as three quarters of a ring.
struct RingSpinner: View {
    let size: CGFloat
    let base: Color
    let head: Color
    @State private var spin = false

    var body: some View {
        let reduce = NSWorkspace.shared.accessibilityDisplayShouldReduceMotion
        ZStack {
            Circle().stroke(base, lineWidth: 1.5)
            Circle().trim(from: 0, to: reduce ? 0.75 : 0.25).stroke(head, style: StrokeStyle(lineWidth: 1.5, lineCap: .butt))
                .rotationEffect(.degrees(spin && !reduce ? 360 : 0))
        }
        .frame(width: size, height: size)
        .onAppear {
            guard !reduce else { return }
            withAnimation(.linear(duration: 0.8).repeatForever(autoreverses: false)) { spin = true }
        }
    }
}

/// The mark of a pull request's checks: ✓ passed, ✕ failed, a ring while they run, nothing when there are none.
struct ChecksMark: View {
    let kind: String

    var body: some View {
        switch kind {
        case "pass":
            Image(systemName: "checkmark").font(.system(size: 8.5, weight: .bold)).foregroundColor(Theme.cAccentSoft)
        case "fail":
            Image(systemName: "xmark").font(.system(size: 8.5, weight: .bold)).foregroundColor(Theme.cRed)
        case "run":
            RingSpinner(size: 9, base: ThemeStore.shared.swiftUI("--amber", opacity: 0.3), head: Theme.cAmber)
        default:
            EmptyView()
        }
    }
}

extension WorktreeStatus {
    /// The chip's tooltip (spec 11).
    func chipTip(deleted: Bool) -> String {
        if deleted { return "This worktree was deleted. Its folder is in the Trash." }
        switch phase {
        case "gone": return "The folder of \(branch) is gone."
        case "merged": return "\(branch) is merged into \(base)"
        case "nothing", "detached": return "\(branch) has no changes yet. Made from \(base)."
        case "pr":
            let c = pr?.checks.kind ?? "none"
            let n = pr?.checks.passed.count ?? 0
            let tail = c == "run" ? " · checks running" : c == "pass" ? " · \(n) check\(n == 1 ? "" : "s") passed" : c == "fail" ? " · \(pr?.checks.failed.count ?? 1) check failed" : ""
            return "Show \(branch)'s changes · PR #\(pr?.number ?? 0) into \(base)\(tail)"
        default:
            let commits = "\(ahead) commit\(ahead == 1 ? "" : "s")"
            let loose = dirty > 0 ? ", \(dirty) file\(dirty == 1 ? "" : "s") not committed" : ""
            return "Show \(branch)'s changes · \(commits)\(loose) · +\(add) \u{2212}\(del) since \(base)"
        }
    }

    /// What VoiceOver reads for the chip (spec 16).
    func chipLabel(deleted: Bool) -> String {
        if deleted { return "\(branch) worktree, deleted." }
        var s = "\(branch) worktree."
        switch phase {
        case "work": s += " \(ahead) commit\(ahead == 1 ? "" : "s") and \(dirty) file\(dirty == 1 ? "" : "s") not committed. \(add) lines added, \(del) removed. Show changes."
        case "pr": s += " Pull request \(pr?.number ?? 0). Show changes."
        case "merged": s += " Merged."
        default: break
        }
        return s
    }
}

struct WorktreeChipView: View {
    let branch: String
    let st: WorktreeStatus?
    let deleted: Bool
    /// ≥ 960 pt: "worktree ·" before the branch. Under 640 pt only a pull request's, merged's or deleted's tail stays.
    let wide: Bool
    let compact: Bool
    var streamer = false
    let action: () -> Void
    @State private var hover = false

    var body: some View {
        let phase = deleted ? "deleted" : (st?.phase ?? "")
        let dim = deleted || phase == "gone"
        let soft = Theme.cAccentSoft
        let tx3 = ThemeStore.shared.swiftUI("--txt3")
        let clickable = !dim && st != nil && phase != "nothing"
        Button(action: { if clickable { action() } }) {
            HStack(spacing: 5) {
                Image(systemName: "arrow.triangle.branch").font(.system(size: 9)).foregroundColor(dim ? Theme.cDim : soft)
                if wide { Text("worktree \u{00B7}").fontWeight(.regular).foregroundColor(tx3) }
                Text(branch).fontWeight(.semibold).foregroundColor(dim ? Theme.cDim : soft).lineLimit(1)
                tail(phase: phase, soft: soft)
            }
            .font(.mono(10.5))
            .padding(.horizontal, 6)
            .frame(height: 20)
            .background(RoundedRectangle(cornerRadius: 3).fill(dim ? Color.clear : Theme.cAccent.opacity(hover && clickable ? 0.14 : 0.06)))
            .overlay(RoundedRectangle(cornerRadius: 3).stroke(dim ? Theme.cDim.opacity(0.5) : (hover && clickable ? soft : soft.opacity(0.55)), lineWidth: 1))
            .frame(height: 24)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onHover { hover = $0 }
        // Streamer mode: nothing real in a tooltip or for VoiceOver.
        .help(streamer ? "" : st?.chipTip(deleted: deleted) ?? "")
        .accessibilityLabel(streamer ? "\(branch) worktree" : st?.chipLabel(deleted: deleted) ?? "\(branch) worktree")
        .accessibilityAddTraits(clickable ? .isButton : [])
    }

    @ViewBuilder
    private func tail(phase: String, soft: Color) -> some View {
        let sep = Rectangle().fill(soft.opacity(0.4)).frame(width: 1, height: 10)
        let numbers = !compact
        if deleted {
            sep.opacity(0.6)
            Text("deleted").foregroundColor(Theme.cDim)
        } else if phase == "gone" {
            sep.opacity(0.6)
            Text("folder gone").foregroundColor(Theme.cDim)
        } else if phase == "work", let st {
            if st.pr?.state == "CLOSED", let pr = st.pr {
                sep
                Text("#\(pr.number) closed").fontWeight(.semibold).foregroundColor(ThemeStore.shared.swiftUI("--txt2"))
            } else if numbers {
                sep
                Text("+\(st.add)").foregroundColor(soft)
                Text("\u{2212}\(st.del)").foregroundColor(ThemeStore.shared.swiftUI("--red-soft"))
            }
        } else if phase == "pr", let pr = st?.pr {
            sep
            HStack(spacing: 4) {
                Text("#\(pr.number)\(pr.draft ? " draft" : "")").fontWeight(.semibold).foregroundColor(ThemeStore.shared.swiftUI("--txt2"))
                if !pr.draft { ChecksMark(kind: pr.checks.kind) }
            }
        } else if phase == "merged" {
            sep
            HStack(spacing: 4) {
                Text("merged").fontWeight(.semibold).foregroundColor(ThemeStore.shared.swiftUI("--txt2"))
                ChecksMark(kind: "pass")
            }
        }
    }
}

/// The split button: the next step, and ▾ with everything (the menu itself is popped up by the window, as a system menu).
struct WorktreeShipButton: View {
    let st: WorktreeStatus
    let busy: String?
    let menuOpen: Bool
    var streamer = false
    let onMain: (String) -> Void
    let onMore: () -> Void
    @State private var hoverMain = false
    @State private var hoverMore = false

    var body: some View {
        let face = WorktreeShip.face(st, streamer: streamer)
        let soft = Theme.cAccentSoft
        let active = busy == nil && face.enabled
        HStack(spacing: 0) {
            Button(action: { if active { onMain(face.kind) } }) {
                HStack(spacing: 5) {
                    if let busy {
                        RingSpinner(size: 10, base: soft.opacity(0.3), head: soft)
                        Text(busy)
                    } else {
                        Image(systemName: face.symbol).font(.system(size: 12))
                        Text(face.label)
                    }
                }
                .font(.system(size: 11.5, weight: .semibold))
                .foregroundColor(hoverMain && active ? Theme.cHi : soft)
                .opacity(busy == nil && !face.enabled ? 0.42 : 1)
                .padding(.leading, 8)
                .padding(.trailing, 9)
                .frame(height: 24)
                .background(Theme.cAccent.opacity(hoverMain && active ? 0.14 : 0))
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .onHover { hoverMain = $0 }
            .help(busy == nil ? face.tip : "")
            .accessibilityLabel(busy ?? "\(face.label). \(face.tip)")
            .accessibilityAddTraits(.isButton)
            Rectangle().fill(Theme.cAccent.opacity(0.5)).frame(width: 1, height: 22)
            Button(action: onMore) {
                Image(systemName: "chevron.down").font(.system(size: 9, weight: .semibold))
                    .foregroundColor(hoverMore || menuOpen ? Theme.cHi : soft)
                    .frame(width: 18, height: 24)
                    .background(Theme.cAccent.opacity(hoverMore || menuOpen ? 0.14 : 0))
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .onHover { hoverMore = $0 }
            .help("More for this worktree")
            .accessibilityLabel(streamer ? "More actions for this worktree" : "More actions for the \(st.branch) worktree")
        }
        .frame(height: 24)
        .clipShape(RoundedRectangle(cornerRadius: 6))
        .overlay(RoundedRectangle(cornerRadius: 6).stroke(Theme.cAccent, lineWidth: 1))
        .animation(.easeOut(duration: 0.15), value: face.label)
    }
}
