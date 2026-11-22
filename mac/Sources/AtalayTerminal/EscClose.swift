import AppKit

/// Settings › Shortcuts › Swap Esc and ⌘W. On: Esc in a terminal does what ⌘W does (the pane closes, or the window
/// hides; what runs in it goes on, a planet on the orbit map, ⇧⌘T brings it back), whatever runs there. ⌘W in a terminal
/// sends a real Esc to it instead, so Claude's stop and Esc Esc rewind (⌘W ⌘W) stay possible. Outside a terminal both
/// keys keep their meaning: only a terminal as the key window's first responder counts.
@MainActor
enum EscClose {
    /// After an Esc closed a terminal, a second tap this soon and the held key's repeats go nowhere: they'd reach the
    /// window that comes in front next (a Claude there would stop, or open its rewind).
    private static let quiet: TimeInterval = 0.5
    private static var closedAt: TimeInterval = -1
    /// The Esc ⌘W sends is going through the monitors now: it is not a key to turn into a close.
    private(set) static var sending = false

    /// True when the event was used: it closed a terminal, or came right after one.
    static func handle(_ event: NSEvent) -> Bool {
        guard !sending, event.type == .keyDown, event.keyCode == 53 else { return false }
        guard Shortcuts.escCloses, NSApp.modalWindow == nil,
              event.modifierFlags.intersection([.command, .option, .control, .shift]).isEmpty,
              let window = event.window, window.isKeyWindow,
              let chat = window.delegate as? ChatWindowController,
              !chat.envShown, let tv = window.firstResponder as? ChatTerminalView,
              !tv.hasMarkedText() else { return false }
        // In a terminal with the swap on, a repeat or a second tap right after a close never reaches the pty: a held Esc
        // would stop a Claude (or close several windows).
        let now = ProcessInfo.processInfo.systemUptime
        if event.isARepeat || now - closedAt < quiet { return true }
        chat.closeLikeCommandW()
        closedAt = now
        return true
    }

    /// ⌘W with the swap on and a terminal in front: a real Esc key goes to it through the window's event path (other Esc keyDown
    /// monitors, e.g. an agy rewind monitor, see it as they see a typed one). False when the swap is off or no terminal is in front.
    static func sendEsc() -> Bool {
        guard Shortcuts.escCloses, NSApp.modalWindow == nil,
              let window = NSApp.keyWindow, window.delegate is ChatWindowController,
              window.firstResponder is ChatTerminalView else { return false }
        // Held ⌘W repeats: no new Esc each time (Esc Esc would clear the prompt or open the rewind).
        // (isARepeat throws on a non-key event, so look at the type first.)
        if let e = NSApp.currentEvent, e.type == .keyDown, e.isARepeat { return true }
        func key(_ type: NSEvent.EventType) -> NSEvent? {
            NSEvent.keyEvent(with: type, location: .zero, modifierFlags: [], timestamp: ProcessInfo.processInfo.systemUptime,
                             windowNumber: window.windowNumber, context: nil, characters: "\u{1b}",
                             charactersIgnoringModifiers: "\u{1b}", isARepeat: false, keyCode: 53)
        }
        sending = true
        defer { sending = false }
        if let down = key(.keyDown) { NSApp.sendEvent(down) }
        if let up = key(.keyUp) { NSApp.sendEvent(up) }
        return true
    }
}
