import AppKit

/// Esc Esc in an idle Antigravity chat with an empty prompt types `/rewind` (agy has the command but no key for it; its
/// own Esc Esc only clears the prompt). The second Esc is swallowed. A pty session of the app's own passes the keys as they
/// are; a screen session an older build left needs `maptimeout 10` (Detached.tune), or screen would merge that Esc with the
/// text typed right after it. Anything unclear: Esc goes to agy as usual.
/// Called from the one Esc monitor in AppDelegate.installMonitors, after MessagePanel.holds and EscClose.handle.
@MainActor
enum AgyRewind {
    private static var lastEsc = -1.0
    private static var lastView: ObjectIdentifier?

    /// True when the Esc was swallowed.
    static func handle(_ e: NSEvent) -> Bool {
        guard e.type == .keyDown, e.keyCode == 53, !e.isARepeat,
              e.modifierFlags.intersection([.command, .option, .control, .shift]).isEmpty,
              let w = e.window, w.isKeyWindow, let tv = w.firstResponder as? ChatTerminalView, !tv.hasMarkedText()
        else { return false }
        if let chat = w.delegate as? ChatWindowController, chat.envShown { lastEsc = -1; return false }
        // With Esc and ⌘W swapped, a typed Esc closes the terminal (EscClose); only the Esc ⌘W sends counts: ⌘W ⌘W.
        if Shortcuts.escCloses && !EscClose.sending { lastEsc = -1; return false }
        // An Esc counts only while agy is ready for a rewind: text in the prompt, a panel, a running turn all reset it.
        guard tv.agyRewindReady() else { lastEsc = -1; return false }
        let now = ProcessInfo.processInfo.systemUptime
        let second = lastEsc >= 0 && lastView == ObjectIdentifier(tv) && now - lastEsc <= NSEvent.doubleClickInterval
        lastView = ObjectIdentifier(tv)
        // Every second Esc starts over, swallowed or not: a third one never rewinds.
        lastEsc = second ? -1 : now
        guard second else { return false }
        tv.send(txt: "/rewind\r")
        return true
    }
}
