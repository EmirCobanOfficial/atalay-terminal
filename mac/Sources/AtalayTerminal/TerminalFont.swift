import AppKit

/// The terminals' font. Settings (web/fonts.js) picks it from the Mac's monospaced fonts; until then it's the user's
/// iTerm2 one (ITermLook: e.g. a Nerd Font with the prompt's icons), else the system's monospace, SF Mono. Settings sync
/// carries the pick to the user's other computers; one that doesn't have that font keeps its own (`set` refuses it).
enum TerminalFont {
    private static let key = "terminalFontFamily"
    /// The system's monospace (NSFont.monospacedSystemFont), which no font list names.
    static let system = "SF Mono"

    /// The family picked in Settings or on another computer, "" for none.
    static var picked: String { UserDefaults.standard.string(forKey: key) ?? "" }
    /// The family picked, if the terminals can draw in it here (it may have been uninstalled since).
    static var chosen: String? {
        let f = picked
        return !f.isEmpty && make(f, 13) != nil ? f : nil
    }

    /// What the terminals use when nothing is picked: the iTerm2 family, else SF Mono.
    static var usual: String { ITermLook.current?.fontName.flatMap { NSFont(name: $0, size: 13)?.familyName } ?? system }
    static var current: String { chosen ?? usual }

    /// Nil or "": back to the usual one. A name that's too long, has control characters or isn't a font on this Mac is
    /// refused, and the pick stays as it was.
    static func set(_ family: String?) {
        let f = family?.trimmingCharacters(in: .whitespaces) ?? ""
        if f.isEmpty { return UserDefaults.standard.removeObject(forKey: key) }
        guard f.count <= 100, !f.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) }), make(f, 13) != nil
        else { return }
        UserDefaults.standard.set(f, forKey: key)
    }

    static func font(_ size: CGFloat) -> NSFont {
        chosen.flatMap { make($0, size) } ?? ITermLook.current?.fontName.flatMap { NSFont(name: $0, size: size) } ?? Theme.mono(size)
    }

    /// The family's regular face, else its first one (a family with no regular weight); SF Mono is the system's.
    private static func make(_ family: String, _ size: CGFloat) -> NSFont? {
        if family == system { return Theme.mono(size) }
        let fm = NSFontManager.shared
        if let font = fm.font(withFamily: family, traits: [], weight: 5, size: size) { return font }
        return (fm.availableMembers(ofFontFamily: family)?.first?.first as? String).flatMap { NSFont(name: $0, size: size) }
    }

    /// The Mac's monospaced families for Settings' list: SF Mono first, then the rest by name.
    static var families: [String] {
        let names = NSFontManager.shared.availableFontNames(with: .fixedPitchFontMask) ?? []
        let found = Set(names.compactMap { NSFont(name: $0, size: 13)?.familyName }.filter { !$0.hasPrefix(".") && $0 != system })
        return [system] + found.sorted { $0.localizedCaseInsensitiveCompare($1) == .orderedAscending }
    }
}
