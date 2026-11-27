import SwiftUI
import WebKit

/// The one place a chat's shown name is decided: the name given to it (Rename) if any, else the engine's own title. The engine
/// applies it to everything it hands out (the page's state, the briefs, the saved chats), so no screen reads a raw title.
/// Names stay on this Mac: nothing here goes to the cloud.
nonisolated enum ChatNames {
    private static let lock = NSLock()
    nonisolated(unsafe) private static var map = UserDefaults.standard.dictionary(forKey: "chatTitles") as? [String: String] ?? [:]
    /// When each name was given (ms), to weigh it against the AI's own rename. Names given before this was kept have none.
    nonisolated(unsafe) private static var givenAt = UserDefaults.standard.dictionary(forKey: "chatTitlesAt") as? [String: Double] ?? [:]
    static func set(_ new: [String: String]) {
        lock.lock()
        var at = givenAt.filter { new[$0.key] != nil }
        let now = Date().timeIntervalSince1970 * 1000
        for (id, name) in new where map[id] != name { at[id] = now }
        map = new
        let changed = at != givenAt
        givenAt = at
        lock.unlock()
        if changed { UserDefaults.standard.set(at, forKey: "chatTitlesAt") }
    }
    static func resolve(_ id: String, _ raw: String) -> String { resolve(id, nil, raw) }
    static func resolve(_ id: String, _ alt: String?, _ raw: String) -> String {
        lock.lock(); defer { lock.unlock() }
        if let t = map[id] ?? alt.flatMap({ map[$0] }), !t.isEmpty { return t }
        return raw
    }

    /// The last /rename value the engine saw in each chat's transcript (kept across launches), so a new one can be told from
    /// one already there: the newest rename wins, whether it was typed here or in the AI.
    nonisolated(unsafe) private static var seen = UserDefaults.standard.dictionary(forKey: "chatCustomSeen") as? [String: String] ?? [:]
    static let superseded = Notification.Name("ChatNameSuperseded")
    /// The engine read a chat's own rename (on the engine's queue). A value not seen before is weighed once against a name typed
    /// here, and the newer wins: one just written (`live`) is newer; else `renamedAt` dates it (read from the transcript, only
    /// when asked, given the time the name was typed). A name typed before typed names kept their time gives way to it.
    static func noteCustom(_ id: String, _ title: String, live: Bool = false, renamedAt: (Double) -> Double? = { _ in nil }) {
        lock.lock()
        guard seen[id] != title else { lock.unlock(); return }
        seen[id] = title
        let all = seen, typed = map[id], at = givenAt[id]
        lock.unlock()
        UserDefaults.standard.set(all, forKey: "chatCustomSeen")
        guard let typed else { return }
        if !live, let at, let renamed = renamedAt(at), renamed < at { return }
        lock.lock()
        let drop = map[id] == typed
        if drop {
            map[id] = nil
            givenAt[id] = nil
        }
        let times = givenAt
        lock.unlock()
        guard drop else { return }
        UserDefaults.standard.set(times, forKey: "chatTitlesAt")
        DispatchQueue.main.async { NotificationCenter.default.post(name: superseded, object: id, userInfo: ["name": typed]) }
    }

    /// The renames remembered of chats no longer on disk are forgotten (`ids`: every Claude chat's id).
    static func prune(keeping ids: Set<String>) {
        lock.lock()
        let kept = seen.filter { ids.contains($0.key) }
        let changed = kept.count != seen.count
        if changed { seen = kept }
        lock.unlock()
        if changed { UserDefaults.standard.set(kept, forKey: "chatCustomSeen") }
    }
}

@MainActor
final class SidebarModel: ObservableObject {
    @Published var items: [ChatItem] = []
    @Published var briefs: [String: SessionBrief] = [:] {
        didSet {
            reviveRunning()
            starConversations()
        }
    }
    @Published var openInTabs: Set<String> = []
    @Published var activeSessionId: String?
    @Published var query = ""
    @Published var expanded: Set<String> = []
    /// Starred chats, in their own section at the top; archived ones out of the list altogether (Settings lists them, as
    /// Claude's and ChatGPT's do, so a stream shows only what's meant to be seen). Kept across launches.
    @Published var favorites = Set(UserDefaults.standard.stringArray(forKey: "chatFavorites") ?? []) {
        didSet { UserDefaults.standard.set(Array(favorites), forKey: "chatFavorites") }
    }
    @Published var archived = Set(UserDefaults.standard.stringArray(forKey: "chatArchived") ?? []) {
        didSet { UserDefaults.standard.set(Array(archived), forKey: "chatArchived") }
    }
    /// Whole folders archived (their chats, later ones too), and chats taken back out of one.
    @Published var archivedFolders = Set(UserDefaults.standard.stringArray(forKey: "chatArchivedFolders") ?? []) {
        didSet { UserDefaults.standard.set(Array(archivedFolders), forKey: "chatArchivedFolders") }
    }
    @Published var restored = Set(UserDefaults.standard.stringArray(forKey: "chatRestored") ?? []) {
        didSet { UserDefaults.standard.set(Array(restored), forKey: "chatRestored") }
    }
    /// Names given to chats (right-click → Rename), over Claude's own titles; kept across launches.
    @Published var customTitles = UserDefaults.standard.dictionary(forKey: "chatTitles") as? [String: String] ?? [:] {
        didSet {
            UserDefaults.standard.set(customTitles, forKey: "chatTitles")
            ChatNames.set(customTitles)
        }
    }
    /// The chat whose name is being edited in its row.
    @Published var renaming: String?
    /// Called after a rename, so the terminal windows show the new name too.
    var onRenamed: ((String) -> Void)?
    /// The app's terminals with no Claude in them, each in the folder it was opened in (MainWindowController.pushTerminals).
    @Published var terminals: [TermRow] = []
    /// Folders opened from the list (its open folder button), the newest first: they stay at its top, chats or none, until
    /// taken out of it or archived. Kept across launches.
    @Published var pinned = UserDefaults.standard.stringArray(forKey: "chatListPinned") ?? [] {
        didSet { UserDefaults.standard.set(pinned, forKey: "chatListPinned") }
    }
    /// Folders folded shut with a click on their strip. Kept across launches.
    @Published var folded = Set(UserDefaults.standard.stringArray(forKey: "chatFolded") ?? []) {
        didSet { UserDefaults.standard.set(Array(folded), forKey: "chatFolded") }
    }
    /// Chats deleted from the list (ChatTrash.swift): out of it, and in Settings' deleted chats for 30 days, where they
    /// can be put back; then their files are deleted from the Mac. Kept across launches.
    @Published var trash = ChatTrash.load() {
        didSet { ChatTrash.save(trash) }
    }
    /// Chats whose files are being deleted right now: out of the trash already, not back in the list.
    @Published private var erasing: Set<String> = []
    /// Chats picked (⌘-click; ⇧-click for all up to it) for deleting or archiving several at once.
    @Published var selectedChats: Set<String> = []
    /// The chat picked last: where a ⇧-click's run starts.
    private var lastPicked: String?
    /// Files of chats were deleted: the engine reads the list again.
    var onErased: (() -> Void)?
    /// The dashboard's streamer mode (Streamer.swift): chats, folders and terminals show made-up names.
    @Published var streamer = false
    /// The linked worktrees on the list now (their state is read while it shows, WorktreeShip.watchList).
    fileprivate var watching = Set<String>()

    /// The same folder however it's written (a trailing slash, `..`).
    static func folderKey(_ cwd: String) -> String {
        let p = (cwd as NSString).standardizingPath
        return p.count > 1 && p.hasSuffix("/") ? String(p.dropLast()) : p
    }

    func pin(_ cwd: String) {
        let key = Self.folderKey(cwd)
        if archivedFolders.contains(cwd) { setFolder(cwd, archived: false) }
        pinned.removeAll { Self.folderKey($0) == key }
        pinned.insert(cwd, at: 0)
    }

    func unpin(_ cwd: String) {
        let key = Self.folderKey(cwd)
        pinned.removeAll { Self.folderKey($0) == key }
    }

    func toggleFold(_ cwd: String) {
        let key = Self.folderKey(cwd)
        if folded.contains(key) { folded.remove(key) } else { folded.insert(key) }
    }

    func title(of item: ChatItem) -> String {
        let real = customTitles[item.id] ?? (item.title.isEmpty ? item.lastPrompt : item.title)
        return streamer ? Streamer.fake("title", real) : real
    }

    /// A folder's path as the list shows it (in a tooltip).
    func shownPath(_ cwd: String) -> String { streamer ? Streamer.folder(cwd) : tildify(cwd) }

    /// A new name for a chat; empty gives it back its own.
    func rename(_ id: String, to name: String) {
        let clean = name.trimmingCharacters(in: .whitespacesAndNewlines)
        customTitles[id] = clean.isEmpty ? nil : String(clean.prefix(120))
        renaming = nil
        onRenamed?(id)
    }

    /// Folders picked with a click on their header, for archiving (or unarchiving) them all at once.
    @Published var selectedFolders: Set<String> = []

    func selectFolder(_ cwd: String) {
        selectedChats = []
        if selectedFolders.remove(cwd) == nil { selectedFolders.insert(cwd) }
    }

    func setSelectedFolders(archived on: Bool) {
        for cwd in selectedFolders { setFolder(cwd, archived: on) }
        selectedFolders = []
    }

    // MARK: picking chats

    /// The chats as the list shows them now, top to bottom (a folded folder's and those behind "+N more" aren't shown).
    private var shownChats: [ChatItem] {
        var out = sections.favorites
        for card in cards where !(folded.contains(Self.folderKey(card.cwd)) && query.isEmpty) {
            let all = expanded.contains(card.cwd) || !query.isEmpty
            out += all ? card.items : Array(card.items.prefix(5))
            for g in card.worktrees { out += all ? g.items : Array(g.items.prefix(3)) }
        }
        return out
    }

    /// The picked chats still in the list.
    var pickedChats: [ChatItem] { everything.filter { selectedChats.contains($0.id) } }

    /// ⌘-click, or a click while some are picked: this chat in or out of the picked ones.
    func pick(_ item: ChatItem) {
        selectedFolders = []
        if selectedChats.remove(item.id) == nil { selectedChats.insert(item.id) }
        lastPicked = item.id
    }

    /// ⇧-click: every chat shown from the one picked last to this one.
    func pick(upTo item: ChatItem) {
        let shown = shownChats.map(\.id)
        guard let from = lastPicked.flatMap({ shown.firstIndex(of: $0) }), let to = shown.firstIndex(of: item.id) else {
            if !selectedChats.contains(item.id) { pick(item) }
            return
        }
        selectedFolders = []
        selectedChats.formUnion(shown[min(from, to)...max(from, to)])
    }

    func clearPicked() {
        selectedChats = []
        selectedFolders = []
        lastPicked = nil
    }

    /// The picked chats into the archive.
    func archivePicked() {
        for item in pickedChats where !isArchived(item) { toggleArchived(item) }
        clearPicked()
    }

    /// The chats a folder's card shows (not its archived or starred ones), for deleting a whole folder's.
    func chats(inFolders cwds: Set<String>) -> [String] {
        let keys = Set(cwds.map(Self.folderKey))
        return cards.filter { keys.contains(Self.folderKey($0.cwd)) }.flatMap { $0.items.map(\.id) + $0.worktrees.flatMap { $0.items.map(\.id) } }
    }

    // MARK: deleting chats

    /// Whether a chat can be deleted here: a saved conversation of Claude Code's, Codex's, Antigravity's or Cursor's, not running
    /// (a running one is ended first).
    func canDelete(_ item: ChatItem) -> Bool {
        guard brief(for: item)?.live != true else { return false }
        switch item.tool {
        case "claude": return ChatTrash.isTranscript(item.path)
        case "codex": return ChatTrash.isCodexLog(item.path, id: item.id)
        case "antigravity": return ChatTrash.isSessionId(item.id)
        case "cursor": return ChatTrash.isCursorChat(item.path, id: item.id)
        default: return false
        }
    }

    /// Of the chats named: those that can be deleted, how many can't because they run, and how many others can't.
    func deletable(_ ids: [String]) -> (chats: [ChatItem], running: Int, others: Int) {
        let wanted = Set(ids)
        var chats: [ChatItem] = [], running = 0, others = 0
        for item in everything where wanted.contains(item.id) {
            if canDelete(item) {
                chats.append(item)
            } else if brief(for: item)?.live == true {
                running += 1
            } else {
                others += 1
            }
        }
        return (chats, running, others)
    }

    /// Into the trash: out of the list (and the favorites), kept 30 days.
    func delete(_ chats: [ChatItem]) {
        let now = nowMs()
        var next = trash
        for item in chats where canDelete(item) {
            next[item.id] = TrashedChat(id: item.id, title: title(of: item), cwd: item.cwd, tool: item.tool, path: item.path, at: now)
        }
        favorites.subtract(chats.map(\.id))
        trash = next
        clearPicked()
    }

    /// Out of the trash, back where it was in the list.
    func putBack(_ id: String) { trash[id] = nil }

    func putBackAll() { trash = [:] }

    /// A deleted chat that runs again (continued in a terminal: `claude --resume`, `codex resume`, `agy --conversation`, `cursor-agent --resume`)
    /// comes back: it's in use.
    private func reviveRunning() {
        guard !trash.isEmpty else { return }
        for b in briefs.values where b.live {
            if trash[b.id] != nil { trash[b.id] = nil }
            if let conv = b.convId, trash[conv] != nil { trash[conv] = nil }
        }
    }

    /// A chat starred before its conversation was known (Antigravity's, Codex's, Cursor's go by their live id,
    /// "ai:<pid>:<start>", until then): the star moves to the conversation, the id its row and its saved chat have.
    private func starConversations() {
        guard !favorites.isEmpty else { return }
        var next = favorites
        for b in briefs.values {
            guard let conv = b.convId, conv != b.id, next.contains(b.id) else { continue }
            next.remove(b.id)
            next.insert(conv)
        }
        if next != favorites { favorites = next }
    }

    /// Deleted from the disk, for good: these chats of the trash. Their names and marks here go with them. One that
    /// couldn't be deleted just now (its tool held its list) stays in the trash, to be tried again.
    func erase(_ ids: [String]) {
        let chats = ids.compactMap { trash[$0] }
        guard !chats.isEmpty else { return }
        let gone = Set(chats.map(\.id))
        erasing.formUnion(gone)
        trash = trash.filter { !gone.contains($0.key) }
        DispatchQueue.global(qos: .utility).async { [weak self] in
            let failed = chats.filter { !ChatTrash.erase($0) }
            DispatchQueue.main.async {
                MainActor.assumeIsolated {
                    guard let self else { return }
                    self.erasing.subtract(gone)
                    for chat in failed where self.trash[chat.id] == nil { self.trash[chat.id] = chat }
                    let done = gone.subtracting(failed.map(\.id))
                    self.favorites.subtract(done)
                    self.archived.subtract(done)
                    self.restored.subtract(done)
                    self.customTitles = self.customTitles.filter { !done.contains($0.key) }
                    self.onErased?()
                }
            }
        }
    }

    /// The chats whose 30 days are over are deleted from the disk. One written to since it was deleted (continued while
    /// the app was closed) comes back instead.
    func emptyExpiredTrash() {
        let all = trash, now = nowMs()
        guard all.values.contains(where: { ChatTrash.expired($0, now: now) }) else { return }
        DispatchQueue.global(qos: .utility).async { [weak self] in
            let due = ChatTrash.due(all, now: now)
            DispatchQueue.main.async {
                MainActor.assumeIsolated {
                    guard let self else { return }
                    // Only what is still as it was read: one put back meanwhile stays.
                    for chat in due.putBack where self.trash[chat.id] == chat { self.trash[chat.id] = nil }
                    self.erase(due.erase.filter { self.trash[$0.id] == $0 }.map(\.id))
                }
            }
        }
    }

    /// For Settings (TrashBridge): the deleted chats by folder, the one deleted last first, each with the days it has left.
    func trashList() -> [[String: Any]] {
        let now = nowMs()
        var order: [String] = []
        var map: [String: [TrashedChat]] = [:]
        for chat in trash.values.sorted(by: { $0.at > $1.at }) {
            if map[chat.cwd] == nil { order.append(chat.cwd) }
            map[chat.cwd, default: []].append(chat)
        }
        let names = labels(for: order)
        return order.map { cwd in
            ["cwd": cwd, "label": names[cwd] ?? projectLabel(cwd),
             "chats": (map[cwd] ?? []).map {
                 ["id": $0.id, "title": $0.title, "tool": $0.tool, "days": ChatTrash.daysLeft($0.at, now: now)]
             }]
        }
    }

    func isArchived(_ item: ChatItem) -> Bool {
        (archived.contains(item.id) || archivedFolders.contains(item.cwd)) && !restored.contains(item.id)
    }

    func toggleFavorite(_ item: ChatItem) {
        guard favorites.remove(item.id) == nil else { return }
        favorites.insert(item.id)
        if isArchived(item) { toggleArchived(item) }
    }

    /// One chat in or out of the archive; out of an archived folder, it alone comes back.
    func toggleArchived(_ item: ChatItem) {
        if isArchived(item) {
            archived.remove(item.id)
            if archivedFolders.contains(item.cwd) { restored.insert(item.id) }
        } else {
            archived.insert(item.id)
            restored.remove(item.id)
            favorites.remove(item.id)
        }
    }

    /// A whole folder in or out of the archive. Out, everything in it comes back, chats archived one by one too.
    func setFolder(_ cwd: String, archived on: Bool) {
        var ids = Set(groups.first { $0.cwd == cwd }?.items.map(\.id) ?? [])
        // A card's worktrees go with it: what the card shows is what's archived.
        var cwds: Set<String> = [cwd]
        if let card = cards.first(where: { Self.folderKey($0.cwd) == Self.folderKey(cwd) }) {
            for g in card.worktrees {
                ids.formUnion(g.items.map(\.id))
                cwds.formUnion(g.items.map(\.cwd))
            }
        }
        if on {
            archivedFolders.formUnion(cwds)
            restored.subtract(ids)
            favorites.subtract(ids)
            // Archived, a folder opened from the list leaves it too.
            unpin(cwd)
        } else {
            archivedFolders.subtract(cwds)
            archived.subtract(ids)
            restored.subtract(ids)
        }
    }

    /// The list as it shows: the starred chats, then the rest by project. The archived ones are in Settings.
    var sections: (favorites: [ChatItem], groups: [(cwd: String, items: [ChatItem])]) {
        let all = groups.flatMap(\.items)
        let favs = all.filter { favorites.contains($0.id) && !isArchived($0) }
        let rest = groups.compactMap { g -> (cwd: String, items: [ChatItem])? in
            let items = g.items.filter { !favorites.contains($0.id) && !isArchived($0) }
            return items.isEmpty ? nil : (g.cwd, items)
        }
        return (favs, rest)
    }

    /// The list's folders, each a card: the ones opened from the list first (as they were opened), then the rest by their
    /// newest chat, then those only a terminal of the app is in; each with its terminals over its chats. Searching, only the
    /// folders with something that matches.
    var cards: [FolderCard] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        var order: [String] = []
        var map: [String: FolderCard] = [:]
        func card(_ cwd: String) -> String {
            let key = Self.folderKey(Worktrees.real(cwd))
            if map[key] == nil {
                order.append(key)
                map[key] = FolderCard(cwd: cwd, items: [], terms: [], pinned: false, worktrees: [], isRepo: Worktrees.info(of: cwd) != nil)
            }
            return key
        }
        /// A linked worktree's chats and terminals sit in its main repo's card (in the same sub folder of it), in a group of
        /// their own. Anything else is its own folder's card, as before.
        func home(_ cwd: String) -> (key: String, wt: WorktreeInfo?) {
            guard let w = Worktrees.info(of: cwd), w.linked else { return (card(cwd), nil) }
            return (card(w.sub.isEmpty ? w.main : w.main + "/" + w.sub), w)
        }
        for p in pinned where !archivedFolders.contains(p) { map[card(p)]?.pinned = true }
        for g in sections.groups {
            let h = home(g.cwd)
            // Two spellings of one folder (a link, /tmp and /private/tmp) are one card: the chats of both, not the last one's.
            if let w = h.wt { map[h.key]?.add(w, items: g.items) } else { map[h.key]?.items += g.items }
        }
        for t in terminals where q.isEmpty || "\(t.title) \(t.job) \(t.cwd)".lowercased().contains(q) {
            let h = home(t.cwd)
            if let w = h.wt { map[h.key]?.add(w, terms: [t]) } else { map[h.key]?.terms.append(t) }
        }
        // The worktree with the newest chat first; those with only a terminal after them.
        for key in order {
            map[key]?.worktrees.sort { ($0.items.first?.mtime ?? 0) > ($1.items.first?.mtime ?? 0) }
            if map[key]?.items.count ?? 0 > 1 { map[key]?.items.sort { $0.mtime > $1.mtime } }
        }
        return order.compactMap { map[$0] }.filter { q.isEmpty || !$0.items.isEmpty || !$0.terms.isEmpty || !$0.worktrees.isEmpty }
    }

    /// The live brief matching a chat row (either by session id for Claude, or by convId for Antigravity).
    func brief(for item: ChatItem) -> SessionBrief? {
        briefs[item.id] ?? briefs.values.first { $0.convId == item.id }
    }

    /// The saved chats in the list or its archive: not the deleted ones (Settings · deleted chats).
    var savedCount: Int { items.filter { trash[$0.id] == nil && !erasing.contains($0.id) }.count }

    /// Every chat, newest first; live sessions without a saved title too. The deleted ones aren't among them.
    private var everything: [ChatItem] {
        var all = items.filter { trash[$0.id] == nil && !erasing.contains($0.id) }
        var known = Set(items.map(\.id))
        for b in briefs.values where b.live && !known.contains(b.id) && (b.convId.map { !known.contains($0) } ?? true) && !b.cwd.isEmpty {
            let tool = b.name == "Antigravity" ? "antigravity" : b.name == "Codex" ? "codex" : b.name == "Cursor" ? "cursor" : "claude"
            // By its conversation once known (the id its saved chat will have, and its tab's and HUD's stars use): a star,
            // a name or an archive given now stays with the chat when it is saved. One row for two processes on it.
            let id = b.convId ?? b.id
            known.insert(id)
            all.append(ChatItem(id: id, path: "", cwd: b.cwd, mtime: Date().timeIntervalSince1970 * 1000, size: 0,
                                title: b.title.isEmpty ? "new chat · \(b.name)" : b.title, lastPrompt: "", tool: tool))
        }
        return all.sorted { $0.mtime > $1.mtime }
    }

    /// For Settings (ArchiveBridge): the archived chats by folder, each folder's newest first.
    func archivedList() -> [[String: Any]] {
        var order: [String] = []
        var map: [String: [ChatItem]] = [:]
        for it in everything where isArchived(it) {
            if map[it.cwd] == nil { order.append(it.cwd) }
            map[it.cwd, default: []].append(it)
        }
        let names = labels(for: order)
        return order.map { cwd in
            ["cwd": cwd, "label": names[cwd] ?? projectLabel(cwd), "whole": archivedFolders.contains(cwd),
             "chats": (map[cwd] ?? []).map { ["id": $0.id, "title": $0.title.isEmpty ? $0.lastPrompt : $0.title, "at": $0.mtime] }]
        }
    }

    func restore(_ id: String) {
        if let item = everything.first(where: { $0.id == id }), isArchived(item) { toggleArchived(item) }
    }

    func restoreAll() {
        archived = []
        archivedFolders = []
        restored = []
    }

    /// Projects ordered by their most recent chat; live sessions without a saved title still show up.
    var groups: [(cwd: String, items: [ChatItem])] {
        var all = everything
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        if !q.isEmpty {
            all = all.filter { "\(customTitles[$0.id] ?? "") \($0.title) \($0.origTitle) \($0.lastPrompt) \($0.cwd)".lowercased().contains(q) }
        }
        var order: [String] = []
        var map: [String: [ChatItem]] = [:]
        for it in all {
            if map[it.cwd] == nil { order.append(it.cwd) }
            map[it.cwd, default: []].append(it)
        }
        return order.map { ($0, map[$0]!) }
    }

    func labels(for cwds: [String]) -> [String: String] {
        guard streamer else { return distinctLabels(for: cwds) }
        return Dictionary(cwds.map { ($0, Streamer.project($0)) }, uniquingKeysWith: { a, _ in a })
    }
}

/// One of the app's terminals with no Claude in it, in the chats list: the folder it was opened in, what runs in it,
/// whether its window shows.
struct TermRow: Identifiable, Equatable {
    let id: String
    let cwd: String
    let title: String
    let job: String
    let shown: Bool
}

/// The chats and terminals of one linked worktree, shown in its main repo's card under "worktree · branch".
struct WorktreeGroup {
    let top: String
    let branch: String
    var items: [ChatItem] = []
    var terms: [TermRow] = []
    /// Its folder is gone (deleted by hand): the chats are still saved.
    var gone: Bool { !FileManager.default.fileExists(atPath: top) }
}

/// A folder of the chats list: its chats, the app's terminals in it, and whether it was opened from the list.
struct FolderCard {
    let cwd: String
    var items: [ChatItem]
    var terms: [TermRow]
    var pinned: Bool
    /// Its linked worktrees (git worktree), each a group inside the card.
    var worktrees: [WorktreeGroup]
    /// Whether the folder is in a git repo: only then a worktree can be made from it.
    var isRepo: Bool

    /// What the card shows: its own and its worktrees' chats and terminals.
    var total: Int { items.count + terms.count + worktrees.reduce(0) { $0 + $1.items.count + $1.terms.count } }

    /// Chats and terminals of the worktree `w`, into its group (made when there isn't one yet).
    mutating func add(_ w: WorktreeInfo, items: [ChatItem] = [], terms: [TermRow] = []) {
        if let i = worktrees.firstIndex(where: { $0.top == w.top }) {
            worktrees[i].items += items
            worktrees[i].terms += terms
        } else {
            worktrees.append(WorktreeGroup(top: w.top, branch: w.branch, items: items, terms: terms))
        }
    }
}

struct SidebarActions {
    let open: (String) -> Void
    let fork: (String) -> Void
    let newTerminal: (String) -> Void
    /// The name sheet for a new worktree of the repo this folder is in (Overlay.swift).
    let newWorktree: (String) -> Void
    /// One of a worktree's actions (WorktreeShip.swift: create, prmerge, openpr, merge, delete, changes) on the folder.
    let ship: (String, String) -> Void
    let reveal: (String) -> Void
    let copyId: (String) -> Void
    /// Delete, for these chats: the app asks first, then they go to Settings' deleted chats for 30 days. True when they were deleted.
    let delete: ([String]) -> Bool
    /// One of the app's terminals (its car id): shows it, or ends it.
    let openTerminal: (String) -> Void
    let endTerminal: (String) -> Void
    /// The open folder button: a folder from the system's picker, kept in the list, with a terminal in it. `done` says whether
    /// one was picked.
    let openFolder: (@escaping (Bool) -> Void) -> Void
}

/// Settings' archived chats (web/cloud.js), out of the chats list as in Claude's and ChatGPT's settings: the list by
/// folder, and taking a chat, a folder or all of them back out.
final class ArchiveBridge: NSObject, WKScriptMessageHandlerWithReply {
    private weak var model: SidebarModel?

    init(model: SidebarModel) { self.model = model }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        let body = message.body as? [String: Any] ?? [:]
        MainActor.assumeIsolated {
            guard let model else { return replyHandler(nil, "no chats list") }
            switch body["type"] as? String {
            case "list": break
            case "restore": if let id = body["id"] as? String { model.restore(id) }
            case "restoreFolder": if let cwd = body["cwd"] as? String { model.setFolder(cwd, archived: false) }
            case "restoreAll": model.restoreAll()
            default: return replyHandler(nil, "unknown request")
            }
            replyHandler(["folders": model.archivedList()], nil)
        }
    }
}

/// Settings' deleted chats (web/cloud.js): the chats deleted from the chats list, by folder, with the days each has
/// left of its 30; putting one or all back, and deleting one or all from the disk now (`confirm` asks first: that
/// can't be undone).
final class TrashBridge: NSObject, WKScriptMessageHandlerWithReply {
    private weak var model: SidebarModel?
    private let confirm: @MainActor (_ title: String, _ text: String) -> Bool

    init(model: SidebarModel, confirm: @escaping @MainActor (_ title: String, _ text: String) -> Bool) {
        self.model = model
        self.confirm = confirm
    }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        let body = message.body as? [String: Any] ?? [:]
        MainActor.assumeIsolated {
            guard let model else { return replyHandler(nil, "no chats list") }
            switch body["type"] as? String {
            case "list": model.emptyExpiredTrash()
            case "putBack": if let id = body["id"] as? String { model.putBack(id) }
            case "putBackAll": model.putBackAll()
            case "erase":
                if let id = body["id"] as? String, let chat = model.trash[id],
                   confirm("Delete “\(clip(chat.title.isEmpty ? "untitled" : chat.title, 60))” now?",
                           "It's deleted from this Mac for good. This can't be undone.") {
                    model.erase([id])
                }
            case "eraseAll":
                let n = model.trash.count
                if n > 0, confirm(n == 1 ? "Delete the chat now?" : "Delete all \(n) chats now?",
                                  "\(n == 1 ? "It's" : "They're") deleted from this Mac for good. This can't be undone.") {
                    model.erase(Array(model.trash.keys))
                }
            default: return replyHandler(nil, "unknown request")
            }
            replyHandler(["folders": model.trashList(), "days": Int(ChatTrash.keep / 86_400_000)], nil)
        }
    }
}

// MARK: the page's list (web/chats.js)

extension SidebarModel {
    /// The chat with this id as the list holds it (not a deleted one).
    func chat(_ id: String) -> ChatItem? { everything.first { $0.id == id } }

    /// A folder card by the key the page knows it by.
    func card(forKey key: String) -> FolderCard? { cards.first { Self.folderKey($0.cwd) == key } }

    /// What a linked worktree's header says on the right (spec 4.3): `+42 −7`, `#48 ✓`, `merged ✓`, `deleted`.
    private static func shipText(_ st: WorktreeStatus?, deleted: Bool) -> String {
        if deleted { return "deleted" }
        guard let st else { return "" }
        func mark(_ kind: String) -> String { kind == "pass" ? " \u{2713}" : kind == "fail" ? " \u{2715}" : kind == "run" ? " \u{25CC}" : "" }
        switch st.phase {
        case "work":
            if let pr = st.pr, pr.state == "CLOSED" { return "#\(pr.number) closed" }
            return "+\(st.add) \u{2212}\(st.del)"
        case "pr":
            guard let pr = st.pr else { return "" }
            return "#\(pr.number)" + (pr.draft ? " draft" : mark(pr.checks.kind))
        case "merged": return "merged \u{2713}"
        case "gone": return "folder gone"
        default: return ""
        }
    }

    /// The list as the page draws it, in the shape the Windows app sends (windows/src/chatlist.js snapshot()): `rows` (every
    /// chat shown, the favorites too), `terms`, `pinned`, `saved`, `live`, `folders` (key -> label, path, cwd, repo, and `wt`
    /// for a linked worktree, which the page puts in its main folder), and `order`, the folders as they are listed. The
    /// titles are `title(of:)`'s, so streamer mode's made-up names are in them already.
    func snapshot() -> [String: Any] {
        let ship = WorktreeShip.shared
        let secs = sections
        let cards = self.cards
        let names = labels(for: cards.map(\.cwd))
        var rows: [[String: Any]] = []
        var terms: [[String: Any]] = []
        var folders: [String: [String: Any]] = [:]
        var order: [String] = []
        var pins: [String] = []
        var tops = Set<String>()
        // A live chat with nothing saved yet has no time of its own (`everything` gives it "now", a new one at every look):
        // it goes without one, so the same list makes the same snapshot and isn't pushed to the page again.
        let saved = Set(items.map(\.id))
        func row(_ item: ChatItem, key: String, fav: Bool) -> [String: Any] {
            let b = brief(for: item)
            let live = b?.live == true
            let inWindow = openInTabs.contains(item.id) || (b.map { openInTabs.contains($0.id) } ?? false)
            var r: [String: Any] = [
                "id": item.id, "cwd": item.cwd, "key": key, "mtime": saved.contains(item.id) ? item.mtime as Any : NSNull(), "size": item.size,
                "title": title(of: item), "lastPrompt": streamer ? "" : item.lastPrompt, "fav": fav, "tool": item.tool,
                "status": live ? (b?.status ?? "busy") as Any : NSNull(), "host": live ? (b?.host ?? "") as Any : NSNull(),
                "open": inWindow,
            ]
            // A renamed chat is still found by the title its AI gave it.
            if !streamer, let named = customTitles[item.id], !item.title.isEmpty, named != item.title { r["origTitle"] = item.title }
            if let b, b.id != item.id { r["sid"] = b.id }
            return r
        }
        func term(_ t: TermRow, key: String) -> [String: Any] {
            let title = t.title.isEmpty ? "terminal" : streamer ? Streamer.project(t.title) : t.title
            let job = t.job.isEmpty ? "" : streamer ? Streamer.fake("cmd", t.job) : t.job
            return ["id": t.id, "cwd": t.cwd, "key": key, "title": title, "job": job, "shown": t.shown,
                    "tip": streamer ? title : "\(t.title) \u{00B7} \(tildify(t.cwd))"]
        }
        for item in secs.favorites { rows.append(row(item, key: Self.folderKey(item.cwd), fav: true)) }
        for card in cards {
            let key = Self.folderKey(card.cwd)
            order.append(key)
            if card.pinned { pins.append(key) }
            // A worktree opened from the list is a card of its own too: what its main card says of it (`wt`) stays.
            if folders[key]?["wt"] == nil {
                folders[key] = ["label": names[card.cwd] ?? projectLabel(card.cwd), "path": shownPath(card.cwd), "cwd": card.cwd, "repo": card.isRepo]
            }
            for item in card.items { rows.append(row(item, key: key, fav: false)) }
            for t in card.terms { terms.append(term(t, key: key)) }
            for g in card.worktrees {
                let wkey = Self.folderKey(g.top)
                let isDeleted = ship.deleted.contains(g.top)
                let st = ship.status[g.top]
                tops.insert(g.top)
                var text = Self.shipText(st, deleted: isDeleted)
                if text.isEmpty && g.gone && !isDeleted { text = "folder gone" }
                let items = WorktreeShip.items(st, deleted: isDeleted, streamer: streamer)
                    .filter { $0.id != "changes" && $0.id != "reveal" }
                    .map { ["id": $0.id, "title": $0.title, "enabled": $0.enabled] as [String: Any] }
                folders[wkey] = [
                    "label": g.branch, "path": streamer ? "worktree" : tildify(g.top), "cwd": g.top, "repo": true,
                    "wt": ["top": g.top, "main": key, "branch": streamer ? Streamer.fake("branch", g.branch) : g.branch,
                           "state": ["text": text, "deleted": isDeleted] as [String: Any], "items": items] as [String: Any],
                ]
                for item in g.items { rows.append(row(item, key: wkey, fav: false)) }
                for t in g.terms { terms.append(term(t, key: wkey)) }
            }
        }
        // The worktrees on the list are the ones whose state is kept fresh (WorktreeShip.watchList), while it can be seen.
        for t in tops.subtracting(watching) { ship.watchList(t) }
        for t in watching.subtracting(tops) { ship.unwatchList(t) }
        watching = tops
        return [
            "rows": rows, "terms": terms, "pinned": pins, "order": order, "saved": savedCount,
            "live": briefs.values.filter(\.live).count, "folders": folders, "folded": Array(folded),
            "active": activeSessionId as Any? ?? NSNull(), "activeAlt": NSNull(),
            "chatsKey": Shortcuts.label(Shortcuts.combo("chatsList")),
        ]
    }

    func snapshotJSON() -> String {
        guard let data = try? JSONSerialization.data(withJSONObject: snapshot(), options: [.sortedKeys]), let json = String(data: data, encoding: .utf8) else { return "null" }
        return json
    }
}

/// The page's menus are native ones: `items` ({id, title, enabled?} or {separator}) popped up where the page says (its px,
/// from the top left of the page); the reply is the picked item's id, or null.
@MainActor
final class ChatMenu: NSObject {
    private var picked: String?

    @objc private func pick(_ item: NSMenuItem) { picked = item.representedObject as? String }

    func run(_ items: [[String: Any]], at: [String: Any], in view: NSView, zoom: CGFloat) -> Any {
        let menu = NSMenu()
        menu.autoenablesItems = false
        for it in items {
            if it["separator"] as? Bool == true { menu.addItem(.separator()); continue }
            guard let id = it["id"] as? String, let title = it["title"] as? String else { continue }
            let mi = NSMenuItem(title: title, action: #selector(pick(_:)), keyEquivalent: "")
            mi.target = self
            mi.representedObject = id
            mi.isEnabled = it["enabled"] as? Bool ?? true
            menu.addItem(mi)
        }
        let x = ((at["x"] as? NSNumber)?.doubleValue ?? 0) * Double(zoom)
        let y = ((at["y"] as? NSNumber)?.doubleValue ?? 0) * Double(zoom)
        let point = NSPoint(x: x, y: view.isFlipped ? y : view.bounds.height - y)
        picked = nil
        menu.popUp(positioning: nil, at: point, in: view)
        return picked ?? NSNull()
    }
}

/// The chats list's requests (web/chats.js, the Windows app's handleChats in main.js): the page draws the list, the app does
/// what's asked of it.
final class ChatsBridge: NSObject, WKScriptMessageHandlerWithReply {
    private weak var model: SidebarModel?
    private let actions: SidebarActions
    /// The page asked for its list (a load, a reload): push it, with the fold and keys.
    var onReady: (() -> Void)?
    /// ⌘B's fold, as the page has it.
    var onClosed: ((Bool) -> Void)?
    private let menu = MainActor.assumeIsolated { ChatMenu() }

    init(model: SidebarModel, actions: SidebarActions) {
        self.model = model
        self.actions = actions
    }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        let body = message.body as? [String: Any] ?? [:]
        let web = message.webView
        MainActor.assumeIsolated {
            guard let model else { return replyHandler(nil, "no chats list") }
            let str = { (k: String) in body[k] as? String ?? "" }
            let list = { (k: String) in (body[k] as? [Any] ?? []).compactMap { $0 as? String } }
            /// The folder cards the page's keys name (a key is the folder as `folderKey` writes it).
            let cwds = { (keys: [String]) in keys.map { model.card(forKey: $0)?.cwd ?? $0 } }
            /// A folder on this Mac, whatever the page sends: never a file or a package (`reveal` opens it, and opening an app
            /// or a script would run it), as the Windows app's handleChats keeps to folders.
            let folder = { () -> String? in
                let p = str("cwd")
                var isDir: ObjCBool = false
                guard p.hasPrefix("/"), FileManager.default.fileExists(atPath: p, isDirectory: &isDir), isDir.boolValue,
                      !NSWorkspace.shared.isFilePackage(atPath: p) else { return nil }
                return p
            }
            switch body["type"] as? String {
            case "ready": onReady?()
            case "open": if !str("id").isEmpty { actions.open(str("id")) }
            case "fork": if !str("id").isEmpty { actions.fork(str("id")) }
            case "newTerminal": actions.newTerminal(str("cwd"))
            case "newWorktree": actions.newWorktree(str("cwd"))
            case "reveal": if let p = folder() { actions.reveal(p) }
            case "copyId": if !str("id").isEmpty { actions.copyId(str("id")) }
            case "showTerminal": actions.openTerminal(str("id"))
            case "endTerminal": actions.endTerminal(str("id"))
            // A worktree's own actions, for a worktree the list shows (its state is read for it), as on Windows.
            case "ship":
                guard ["create", "merge", "prmerge", "delete", "openpr"].contains(str("id")), model.watching.contains(str("top")) else {
                    return replyHandler(false, nil)
                }
                actions.ship(str("id"), str("top"))
            case "unpin": model.unpin(str("cwd"))
            case "favorite": if let item = model.chat(str("id")) { model.toggleFavorite(item) }
            case "archive": if let item = model.chat(str("id")), !model.isArchived(item) { model.toggleArchived(item) }
            case "archiveMany":
                for id in list("ids") { if let item = model.chat(id), !model.isArchived(item) { model.toggleArchived(item) } }
            case "rename": if model.chat(str("id")) != nil { model.rename(str("id"), to: str("name")) }
            case "folders":
                let on = body["on"] as? Bool == true
                for cwd in cwds(list("keys")) { model.setFolder(cwd, archived: on) }
            case "delete":
                return replyHandler(actions.delete(list("ids")), nil)
            case "deleteFolders":
                return replyHandler(actions.delete(model.chats(inFolders: Set(cwds(list("keys"))))), nil)
            case "openFolder":
                actions.openFolder { picked in replyHandler(picked, nil) }
                return
            case "closed": onClosed?(body["on"] as? Bool == true)
            case "menu":
                guard let web else { return replyHandler(nil, nil) }
                let items = body["items"] as? [[String: Any]] ?? []
                return replyHandler(menu.run(items, at: body["at"] as? [String: Any] ?? [:], in: web, zoom: web.pageZoom), nil)
            default: return replyHandler(nil, "unknown request")
            }
            replyHandler(true, nil)
        }
    }
}
