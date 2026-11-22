import AppKit
import SwiftUI

// The env button's view (the header's "env", ChatWindowController.toggleEnv): the env files under the terminal's folder, as a
// tab-like view over the terminal, inside the same window. One file opens at once; several first show a list. Values are
// masked until the user opens them, and always in streamer and party mode. What a file holds stays in this model: it is
// never logged, sent, put in a note or given to the AI tools, and the model goes away when the view is left.

@MainActor
final class EnvModel: ObservableObject {
    enum Phase { case scanning, empty, picker, editor }
    enum Notice: Equatable { case saved, reloaded, changedOnDisk, copiedAll(Int), error(String) }

    let root: String
    @Published var phase = Phase.scanning
    @Published var files: [EnvFiles.Found] = []
    @Published var truncated = false
    @Published var query = ""
    @Published var selection = 0
    @Published var openRel: String?
    @Published var lines: [EnvFiles.Line] = []
    @Published var dirty = false
    @Published var notice: Notice?
    @Published var revealed = Set<UUID>()
    @Published var revealAll = false
    @Published var copied: UUID?
    @Published var filter = ""
    /// More than one file was found: the editor has a way back to the list.
    @Published var hasList = false
    /// The file is hard-linked (shared with another name): shown and copied, not changed.
    @Published var locked = false
    private var crlf = false, finalNewline = true, bom = false
    private var base: Double = 0
    private var loadToken = 0
    private var noticeWork: DispatchWorkItem?
    private var copiedWork: DispatchWorkItem?
    var onLeave: () -> Void = {}
    var onTitle: () -> Void = {}
    /// The "Files" button: the window asks about unsaved changes first.
    var onBack: () -> Void = {}

    init(root: String) { self.root = root }

    // MARK: files

    func scan(refresh: Bool = false) {
        if !refresh { phase = .scanning }
        let root = root
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            let found = EnvFiles.discover(in: root)
            DispatchQueue.main.async {
                MainActor.assumeIsolated {
                    guard let self else { return }
                    self.files = found.files
                    self.truncated = found.truncated
                    self.selection = 0
                    switch found.files.count {
                    case 0: if self.openRel == nil { self.phase = .empty }
                    case 1:
                        self.hasList = false
                        if self.openRel != found.files[0].rel || self.phase != .editor { self.open(found.files[0]) }
                    default:
                        self.hasList = true
                        // Still in a file after a refresh (the view was shown again): it stays.
                        if self.openRel == nil || !found.files.contains(where: { $0.rel == self.openRel }) { self.openRel = nil; self.phase = .picker }
                    }
                }
            }
        }
    }

    var shown: [EnvFiles.Found] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        return q.isEmpty ? files : files.filter { ($0.folder + "/" + $0.name).lowercased().contains(q) }
    }

    func moveSelection(_ step: Int) {
        let n = shown.count
        guard n > 0 else { return }
        selection = min(n - 1, max(0, selection + step))
    }

    func openSelected() {
        let list = shown
        if list.indices.contains(selection) { open(list[selection]) }
    }

    /// Reads and parses off the main thread (a big or odd file must not stall the app); the newest ask wins.
    private func fetch(_ rel: String, then: @escaping (EnvFiles.Content, [EnvFiles.Line]) -> Void, failed: @escaping (Error) -> Void) {
        loadToken += 1
        let token = loadToken, root = root
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            let result = Result { () -> (EnvFiles.Content, [EnvFiles.Line]) in
                let c = try EnvFiles.read(rel, in: root)
                return (c, EnvFiles.parse(c.text))
            }
            DispatchQueue.main.async {
                MainActor.assumeIsolated {
                    guard let self, self.loadToken == token else { return }
                    switch result {
                    case .success(let r): then(r.0, r.1)
                    case .failure(let e): failed(e)
                    }
                }
            }
        }
    }

    func open(_ f: EnvFiles.Found) {
        phase = .scanning
        fetch(f.rel, then: { [weak self] c, lines in self?.load(c, lines, rel: f.rel) }, failed: { [weak self] e in
            guard let self else { return }
            self.openRel = nil
            self.phase = self.hasList ? .picker : .empty
            self.say(.error(Self.words(e)))
        })
    }

    private func load(_ c: EnvFiles.Content, _ parsed: [EnvFiles.Line], rel: String) {
        openRel = rel
        lines = parsed
        crlf = parsed.first?.eol == "\r\n"
        finalNewline = c.text.isEmpty || c.text.utf8.last == 0x0A
        bom = c.bom
        base = c.mtime
        locked = files.first(where: { $0.rel == rel })?.hardLinked ?? false
        dirty = false
        revealed = []
        revealAll = false
        filter = ""
        notice = nil
        phase = .editor
        onTitle()
    }

    /// Back to the list (the caller has asked about unsaved changes).
    func backToList() {
        forgetFile()
        phase = .picker
        onTitle()
    }

    func forgetFile() {
        openRel = nil
        lines = []
        dirty = false
        revealed = []
        revealAll = false
        notice = nil
    }

    // MARK: editing

    func change(_ id: UUID, _ edit: (inout EnvFiles.Line) -> Void) {
        guard let i = lines.firstIndex(where: { $0.id == id }) else { return }
        edit(&lines[i])
        lines[i].changed = true
        dirty = true
        if notice == .saved { notice = nil }
    }

    func addVariable() -> UUID {
        var l = EnvFiles.Line(kind: .pair, raw: "")
        l.changed = true
        lines.append(l)
        dirty = true
        return l.id
    }

    func delete(_ id: UUID) {
        lines.removeAll { $0.id == id }
        dirty = true
    }

    /// The text as it would be saved now.
    var text: String { EnvFiles.text(of: cleaned, crlf: crlf, finalNewline: finalNewline) }

    private var cleaned: [EnvFiles.Line] {
        lines.filter { !($0.kind == .pair && $0.key.isEmpty && $0.value.isEmpty && $0.raw.isEmpty) }
    }

    var duplicates: Set<String> {
        var seen = Set<String>(), dup = Set<String>()
        for l in lines where l.kind == .pair && l.enabled && !l.key.isEmpty { if !seen.insert(l.key).inserted { dup.insert(l.key) } }
        return dup
    }

    @discardableResult
    func save(force: Bool = false) -> Bool {
        guard let rel = openRel else { return false }
        if locked { say(.error("This file is hard-linked; open it from its own folder to edit.")); return false }
        if let bad = cleaned.first(where: { $0.kind == .pair && !EnvFiles.validKey($0.key) }) {
            say(.error(bad.key.isEmpty ? "A variable has no name." : "“\(bad.key)” isn’t a valid name (letters, digits, _ and .)."))
            return false
        }
        do {
            base = try EnvFiles.write(text, bom: bom, rel: rel, in: root, base: force ? nil : base)
            lines = cleaned
            dirty = false
            say(.saved)
            return true
        } catch EnvFiles.Failure.conflict {
            notice = .changedOnDisk
            return false
        } catch {
            say(.error(Self.words(error)))
            return false
        }
    }

    /// Reads the file again, whatever the buffer holds.
    func reload() {
        guard let rel = openRel else { return }
        fetch(rel, then: { [weak self] c, lines in
            self?.load(c, lines, rel: rel)
            self?.say(.reloaded)
        }, failed: { [weak self] _ in self?.say(.error("The file can’t be read any more.")) })
    }

    /// Looks at the file's date: a change on disk (Claude, an editor) reloads at once when nothing here is changed, else asks.
    func poll() {
        guard phase == .editor, let rel = openRel else { return }
        guard let now = EnvFiles.modified(rel, in: root) else {
            if notice != .error("The file is gone.") { say(.error("The file is gone.")) }
            return
        }
        guard abs(now - base) > 0.0005 else { return }
        if dirty { notice = .changedOnDisk } else { reload() }
    }

    func say(_ n: Notice) {
        notice = n
        noticeWork?.cancel()
        switch n { case .saved, .reloaded, .copiedAll: break; default: return }
        let work = DispatchWorkItem { [weak self] in
            MainActor.assumeIsolated { if self?.notice == n { self?.notice = nil } }
        }
        noticeWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5, execute: work)
    }

    private static func words(_ e: Error) -> String {
        switch e as? EnvFiles.Failure {
        case .notAllowed: return "This file isn’t one the env view may open."
        case .notText: return "It isn’t a text file."
        case .tooBig: return "It’s over 1 MB."
        case .readOnly: return "This file is read-only."
        case .hardLinked: return "This file is hard-linked; open it from its own folder to edit."
        case .conflict: return "It changed on disk."
        default: return "The file couldn’t be read or written."
        }
    }

    // MARK: copying

    /// Plain text to the clipboard, marked as a secret so clipboard managers skip it.
    func copy(_ s: String, id: UUID?) {
        let pb = NSPasteboard.general
        pb.clearContents()
        pb.setString(s, forType: .string)
        pb.setData(Data(), forType: NSPasteboard.PasteboardType("org.nspasteboard.ConcealedType"))
        copied = id
        copiedWork?.cancel()
        let work = DispatchWorkItem { [weak self] in MainActor.assumeIsolated { self?.copied = nil } }
        copiedWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2, execute: work)
        if let w = NSApp.keyWindow {
            NSAccessibility.post(element: w, notification: .announcementRequested, userInfo: [.announcement: "Copied", .priority: NSAccessibilityPriorityLevel.low.rawValue])
        }
    }

    /// The whole file as it would be saved, values and all (even masked on screen), for a teammate. Copies in streamer and
    /// party mode too; the screen shows only how many variables went.
    func copyAll() {
        let n = lines.filter { $0.kind == .pair && $0.enabled }.count
        copy(text, id: nil)
        say(.copiedAll(n))
    }

    /// Masks again: the view was left, or hidden.
    func mask() {
        revealed = []
        revealAll = false
    }
}

// MARK: - the view

struct EnvPanel: View {
    @ObservedObject var model: EnvModel
    @ObservedObject var hud: ChatHUD
    @ObservedObject var theme = ThemeStore.shared
    @FocusState private var focus: Field?
    @State private var previous: Field?
    private enum Field: Hashable { case key(UUID), value(UUID), raw(UUID) }

    var body: some View {
        let hex = ThemeStore.shared.hex("--amber")
        VStack(spacing: 0) {
            strip(hex: hex)
            Divider().overlay(Theme.cLineSoft)
            switch model.phase {
            case .scanning: centered("Looking for env files…", symbol: "magnifyingglass")
            case .empty: empty
            case .picker: picker
            case .editor: editor
            }
            if model.phase == .editor { status }
        }
        .background(Color(Theme.terminalBg))
        .clipShape(RoundedRectangle(cornerRadius: 6))
        .overlay(RoundedRectangle(cornerRadius: 6).stroke(Theme.cLineSoft, lineWidth: 1))
        .font(.mono(11.5))
        .onReceive(Timer.publish(every: 1.5, on: .main, in: .common).autoconnect()) { _ in
            if hud.visible { model.poll() }
        }
        .onChange(of: focus) { new in
            // A value shown only because it was being typed in is masked again when the cursor leaves.
            if previous != new, !model.revealAll {
                if case .value(let id)? = previous { model.revealed.remove(id) }
                if case .raw(let id)? = previous { model.revealed.remove(id) }
            }
            previous = new
        }
    }

    // MARK: the top strip: the way back, the file, the actions

    private func strip(hex: UInt32) -> some View {
        HStack(spacing: 10) {
            Button(action: { model.onLeave() }) {
                Label("Terminal", systemImage: "chevron.left").labelStyle(.titleAndIcon)
            }
            .buttonStyle(StripButton())
            .help("Back to the terminal (Esc, ⌘W, ⇧⌘E)")
            if model.phase == .editor, model.hasList {
                Button(action: { model.onBack() }) {
                    Label("Files", systemImage: "list.bullet")
                }
                .buttonStyle(StripButton())
                .help("All env files in this folder")
            }
            Text(title).foregroundColor(Theme.cHi).fontWeight(.semibold).lineLimit(1).truncationMode(.middle)
            if model.dirty { Circle().fill(Theme.cAmber).frame(width: 7, height: 7).help("Unsaved changes") }
            Spacer(minLength: 6)
            if hud.streamer {
                Label("Values hidden", systemImage: "eye.slash").foregroundColor(Theme.cDim)
                    .help("Streamer and party mode hide every value.")
            }
            if model.phase == .editor {
                if !hud.streamer {
                    Button(action: { model.revealAll.toggle(); if !model.revealAll { model.revealed = [] } }) {
                        Label(model.revealAll ? "Hide all" : "Show all", systemImage: model.revealAll ? "eye.slash" : "eye")
                    }
                    .buttonStyle(StripButton(active: model.revealAll))
                    .help(model.revealAll ? "Hide every value again" : "Show every value")
                    .accessibilityLabel(model.revealAll ? "Hide all values" : "Show all values")
                }
                Button(action: { model.copyAll() }) { Label("Copy all", systemImage: "doc.on.doc") }
                    .buttonStyle(StripButton())
                    .help("Copy the whole file with every value, even the hidden ones, to send to a teammate")
                    .accessibilityLabel("Copy all")
                Button(action: { model.save() }) {
                    Label("Save", systemImage: "square.and.arrow.down")
                }
                .buttonStyle(StripButton(active: model.dirty))
                .disabled(!model.dirty || model.locked)
                .help("Save (⌘S)")
                .accessibilityLabel("Save")
            }
        }
        .padding(.horizontal, 10)
        .frame(height: 32)
        .font(.mono(10.5))
    }

    private var title: String {
        let folder = hud.streamer ? Streamer.folder(model.root) : tildify(model.root)
        switch model.phase {
        case .editor:
            guard let rel = model.openRel else { return "env" }
            return "env · " + path(rel)
        default: return "env · " + folder
        }
    }

    /// A file's path below the folder; in streamer and party mode its folders carry made-up names.
    private func path(_ rel: String) -> String {
        guard hud.streamer else { return rel }
        let parts = rel.split(separator: "/").map(String.init)
        return (parts.dropLast().map { Streamer.fake("project", $0) } + [parts.last ?? ""]).joined(separator: "/")
    }

    // MARK: states without a file

    private func centered(_ text: String, symbol: String, detail: String? = nil) -> some View {
        VStack(spacing: 8) {
            Image(systemName: symbol).font(.system(size: 22, weight: .light)).foregroundColor(Theme.cDim)
            Text(text).foregroundColor(Theme.cText)
            if let detail { Text(detail).foregroundColor(Theme.cDim).font(.mono(10.5)).multilineTextAlignment(.center) }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(24)
    }

    private var empty: some View {
        centered("No env files here", symbol: "doc.badge.gearshape",
                 detail: "Looked in this folder and the ones in it for .env, .env.*, *.env and .envrc.\nIt skips hidden and build folders (node_modules, dist, Pods…).")
    }

    // MARK: the list, for more than one file

    private var picker: some View {
        let list = model.shown
        return VStack(spacing: 0) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass").foregroundColor(Theme.cDim)
                Text(model.query.isEmpty ? "Type to filter \(model.files.count) files" : model.query)
                    .foregroundColor(model.query.isEmpty ? Theme.cDim2 : Theme.cHi)
                Spacer()
                Text("↑↓ choose · ↩ open · esc back").foregroundColor(Theme.cDim2).font(.mono(10))
            }
            .padding(.horizontal, 14)
            .frame(height: 34)
            Divider().overlay(Theme.cLineSoft)
            if list.isEmpty {
                centered("No file matches “\(model.query)”", symbol: "magnifyingglass")
            } else {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 0) {
                            ForEach(Array(list.enumerated()), id: \.element.rel) { i, f in
                                if i == 0 || list[i - 1].folder != f.folder {
                                    groupHeader(f.folder, count: list.filter { $0.folder == f.folder }.count)
                                }
                                pickerRow(f, selected: i == model.selection).id(i)
                            }
                            if model.truncated {
                                Text("Deeper folders, or files past the first \(EnvFiles.maxFiles), aren’t listed.")
                                    .foregroundColor(Theme.cDim2).font(.mono(10)).padding(14)
                            }
                        }
                        .padding(.vertical, 6)
                    }
                    .onChange(of: model.selection) { i in proxy.scrollTo(i) }
                }
            }
        }
    }

    private func groupHeader(_ folder: String, count: Int) -> some View {
        let name = folder.isEmpty ? (hud.streamer ? Streamer.folder(model.root) : (model.root as NSString).lastPathComponent) : path(folder + "/x").dropLast(2).description
        return HStack(spacing: 6) {
            Image(systemName: "folder").foregroundColor(Theme.cAmber)
            Text(folder.isEmpty ? "\(name)  (this folder)" : name).foregroundColor(Theme.cAmber).fontWeight(.semibold)
            Text("\(count)").foregroundColor(Theme.cDim2)
        }
        .font(.mono(10.5))
        .padding(.horizontal, 14).padding(.top, 10).padding(.bottom, 4)
        .accessibilityAddTraits(.isHeader)
    }

    private func pickerRow(_ f: EnvFiles.Found, selected: Bool) -> some View {
        Button(action: { model.open(f) }) {
            HStack(spacing: 10) {
                Image(systemName: f.kind == .template ? "doc.badge.ellipsis" : f.kind == .envrc ? "terminal" : "doc.text")
                    .foregroundColor(f.kind == .template ? Theme.cDim : Theme.cAccent).frame(width: 16)
                Text(f.name).foregroundColor(f.kind == .template ? Theme.cDim : Theme.cHi).fontWeight(.semibold)
                if f.kind == .template { badge("template") } else if f.kind == .envrc { badge("direnv") }
                if f.hardLinked { badge("hard link · read only") }
                Spacer()
                Text(f.keys == 1 ? "1 variable" : "\(f.keys) variables").foregroundColor(Theme.cDim)
                Text(Self.ago(f.mtime)).foregroundColor(Theme.cDim2).frame(width: 74, alignment: .trailing)
            }
            .padding(.horizontal, 14)
            .frame(height: 30)
            .background(selected ? Theme.cAccent.opacity(0.16) : Color.clear)
            .overlay(alignment: .leading) { if selected { Rectangle().fill(Theme.cAccent).frame(width: 2) } }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(f.name), \(f.kind == .template ? "template, " : "")\(f.keys) variables")
    }

    private func badge(_ s: String) -> some View {
        Text(s).font(.mono(9.5)).foregroundColor(Theme.cDim)
            .padding(.horizontal, 5).padding(.vertical, 1)
            .overlay(RoundedRectangle(cornerRadius: 3).stroke(Theme.cDim2, lineWidth: 1))
    }

    static func ago(_ t: Double) -> String {
        let f = RelativeDateTimeFormatter()
        f.unitsStyle = .abbreviated
        return f.localizedString(for: Date(timeIntervalSince1970: t), relativeTo: Date())
    }

    // MARK: the editor

    private var editor: some View {
        let dup = model.duplicates
        let big = model.lines.filter { $0.kind == .pair }.count > 15
        return VStack(spacing: 0) {
            if big {
                HStack(spacing: 8) {
                    Image(systemName: "line.3.horizontal.decrease").foregroundColor(Theme.cDim)
                    TextField("Filter by name", text: $model.filter).textFieldStyle(.plain).foregroundColor(Theme.cHi)
                }
                .padding(.horizontal, 14).frame(height: 28)
                Divider().overlay(Theme.cLineSoft)
            }
            if model.locked { lockedBanner }
            if let n = model.notice, case .changedOnDisk = n { changedBanner }
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 0) {
                        ForEach(model.lines.filter { visible($0) }) { l in
                            row(l, duplicate: dup.contains(l.key)).id(l.id)
                        }
                        Button(action: {
                            let id = model.addVariable()
                            DispatchQueue.main.async { focus = .key(id); proxy.scrollTo(id) }
                        }) {
                            Label("Add variable", systemImage: "plus")
                        }
                        .buttonStyle(StripButton())
                        .disabled(model.locked)
                        .padding(.horizontal, 14).padding(.vertical, 10)
                    }
                    .padding(.vertical, 6)
                }
            }
        }
    }

    private func visible(_ l: EnvFiles.Line) -> Bool {
        let q = model.filter.trimmingCharacters(in: .whitespaces).lowercased()
        return q.isEmpty || (l.kind == .pair && l.key.lowercased().contains(q))
    }

    private var lockedBanner: some View {
        HStack(spacing: 10) {
            Image(systemName: "link").foregroundColor(Theme.cAmber)
            Text("This file is hard-linked; open it from its own folder to edit. You can still copy from it.").foregroundColor(Theme.cText)
            Spacer()
        }
        .font(.mono(10.5))
        .padding(.horizontal, 14).frame(height: 30)
        .background(Theme.cAmber.opacity(0.14))
    }

    private var changedBanner: some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill").foregroundColor(Theme.cAmber)
            Text("This file changed on disk while you were editing.").foregroundColor(Theme.cText)
            Spacer()
            Button("Load from disk") { model.reload() }.buttonStyle(StripButton())
            Button("Keep mine and overwrite") { model.save(force: true) }.buttonStyle(StripButton(active: true))
        }
        .font(.mono(10.5))
        .padding(.horizontal, 14).frame(height: 34)
        .background(Theme.cAmber.opacity(0.14))
    }

    @ViewBuilder
    private func row(_ l: EnvFiles.Line, duplicate: Bool) -> some View {
        switch l.kind {
        case .blank:
            Color.clear.frame(height: 8)
        case .comment, .other:
            // A comment or a line that isn't NAME=value can hold a secret too: masked like a value, a click opens it.
            // Plain words (a heading, a `use nix` line) show as they are; one with NAME= or NAME: in it may hold a value and is masked.
            let open = !hud.streamer && (!EnvFiles.looksSecret(l.raw) || model.revealAll || model.revealed.contains(l.id) || focus == .raw(l.id))
            Group {
                if open {
                    TextField("", text: Binding(get: { l.raw }, set: { v in model.change(l.id) { $0.raw = v } }))
                        .textFieldStyle(.plain).disableAutocorrection(true).focused($focus, equals: .raw(l.id)).disabled(model.locked)
                } else {
                    Button(action: {
                        guard !hud.streamer else { return }
                        model.revealed.insert(l.id)
                        DispatchQueue.main.async { focus = .raw(l.id) }
                    }) {
                        Text(l.kind == .comment ? "# ••••••••" : "••••••••••")
                            .frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(l.kind == .comment ? "Hidden comment" : "Hidden line")
                    .help(hud.streamer ? "Hidden in streamer and party mode" : "Click to show and edit")
                }
            }
            .foregroundColor(l.kind == .comment ? Theme.cDim : Theme.cText.opacity(0.8))
            .padding(.horizontal, 14).padding(.vertical, 3)
        case .pair:
            pairRow(l, duplicate: duplicate)
        }
    }

    private func pairRow(_ l: EnvFiles.Line, duplicate: Bool) -> some View {
        let reveal = !hud.streamer && (model.revealAll || model.revealed.contains(l.id) || focus == .value(l.id))
        let invalid = !l.key.isEmpty && !EnvFiles.validKey(l.key)
        return HStack(alignment: .top, spacing: 8) {
            Button(action: { model.change(l.id) { $0.enabled.toggle() } }) {
                Image(systemName: l.enabled ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(l.enabled ? Theme.cGreen : Theme.cDim2)
                    .frame(width: 20, height: 22)
            }
            .buttonStyle(.plain)
            .help(l.enabled ? "On. Click to comment it out (# KEY=value)." : "Off (commented out). Click to turn it on.")
            .disabled(hud.streamer || model.locked)
            TextField("NAME", text: Binding(get: { l.key }, set: { v in model.change(l.id) { $0.key = v } }))
                .textFieldStyle(.plain).disableAutocorrection(true)
                .focused($focus, equals: .key(l.id)).disabled(model.locked)
                .foregroundColor(invalid ? Theme.cRed : Theme.cHi).fontWeight(.semibold)
                .frame(width: 230, alignment: .leading)
            Text("=").foregroundColor(Theme.cDim2).frame(height: 22)
            valueField(l, reveal: reveal)
            HStack(spacing: 2) {
                if duplicate { Image(systemName: "exclamationmark.triangle").foregroundColor(Theme.cAmber).help("This name is set twice in the file.").frame(width: 20, height: 22) }
                Button(action: { model.copy(l.value, id: l.id) }) {
                    Image(systemName: model.copied == l.id ? "checkmark" : "doc.on.doc")
                        .foregroundColor(model.copied == l.id ? Theme.cGreen : Theme.cDim).frame(width: 24, height: 22)
                }
                .buttonStyle(.plain).help("Copy the value").accessibilityLabel("Copy value of \(l.key)")
                if !hud.streamer {
                    Button(action: {
                        if model.revealed.contains(l.id) { model.revealed.remove(l.id) } else { model.revealed.insert(l.id) }
                    }) {
                        Image(systemName: reveal ? "eye.slash" : "eye").foregroundColor(Theme.cDim).frame(width: 24, height: 22)
                    }
                    .buttonStyle(.plain).help(reveal ? "Hide the value" : "Show the value")
                    .accessibilityLabel(reveal ? "Hide value of \(l.key)" : "Show value of \(l.key)")
                }
                Menu {
                    Button("Copy value") { model.copy(l.value, id: l.id) }
                    Button("Copy KEY=value") { model.copy(l.key + "=" + l.value, id: l.id) }
                    Button("Copy name") { model.copy(l.key, id: nil) }
                    Divider()
                    Button("Copy all") { model.copyAll() }
                    Button("Copy as KEY=value") { model.copyAll() }
                    Divider()
                    Button("Delete", role: .destructive) { model.delete(l.id) }.disabled(hud.streamer || model.locked)
                } label: {
                    Image(systemName: "ellipsis").foregroundColor(Theme.cDim)
                        .frame(width: 24, height: 22, alignment: .center).contentShape(Rectangle())
                }
                .menuStyle(.borderlessButton).menuIndicator(.hidden).fixedSize()
                .frame(width: 24, height: 22, alignment: .center)
                .help("More: copy, copy all, delete").accessibilityLabel("More for \(l.key)")
            }
        }
        .opacity(l.enabled ? 1 : 0.55)
        .padding(.horizontal, 14).padding(.vertical, 2)
        .contextMenu {
            Button("Copy value") { model.copy(l.value, id: l.id) }
            Button("Copy KEY=value") { model.copy(l.key + "=" + l.value, id: l.id) }
            Button("Copy name") { model.copy(l.key, id: nil) }
            Button("Copy all") { model.copyAll() }
        }
    }

    @ViewBuilder
    private func valueField(_ l: EnvFiles.Line, reveal: Bool) -> some View {
        if reveal {
            TextField("value", text: Binding(get: { l.value }, set: { v in model.change(l.id) { $0.value = v } }), axis: .vertical)
                .textFieldStyle(.plain).disableAutocorrection(true).lineLimit(1...8)
                .focused($focus, equals: .value(l.id)).disabled(model.locked)
                .foregroundColor(Theme.cText)
                .frame(maxWidth: .infinity, minHeight: 22, alignment: .leading)
        } else {
            // Masked: the same dots for every value, so not even its length shows. A click opens it for typing.
            Button(action: {
                guard !hud.streamer else { return }
                model.revealed.insert(l.id)
                DispatchQueue.main.async { focus = .value(l.id) }
            }) {
                Text(l.value.isEmpty ? "empty" : "••••••••••")
                    .foregroundColor(l.value.isEmpty ? Theme.cDim2 : Theme.cDim)
                    .italic(l.value.isEmpty)
                    .frame(maxWidth: .infinity, minHeight: 22, alignment: .leading)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Hidden value of \(l.key)")
            .help(hud.streamer ? "Hidden in streamer and party mode" : "Click to show and edit")
        }
    }

    // MARK: the bottom line

    private var status: some View {
        HStack(spacing: 10) {
            let n = model.lines.filter { $0.kind == .pair && $0.enabled }.count
            Text("\(n) variable\(n == 1 ? "" : "s")").foregroundColor(Theme.cDim)
            Spacer()
            switch model.notice {
            case .saved?: Label("Saved", systemImage: "checkmark").foregroundColor(Theme.cGreen)
            case .copiedAll(let n)?: Label("Copied \(n) variable\(n == 1 ? "" : "s")", systemImage: "checkmark").foregroundColor(Theme.cGreen)
            case .reloaded?: Label("Reloaded: the file changed on disk", systemImage: "arrow.clockwise").foregroundColor(Theme.cCyan)
            case .error(let m)?: Label(m, systemImage: "exclamationmark.circle").foregroundColor(Theme.cRed)
            default: Text("⌘S save · esc back").foregroundColor(Theme.cDim2)
            }
        }
        .font(.mono(10))
        .padding(.horizontal, 14)
        .frame(height: 24)
        .background(Color.black.opacity(0.16))
        .overlay(alignment: .top) { Rectangle().fill(Theme.cLineSoft).frame(height: 1) }
    }
}

private struct StripButton: ButtonStyle {
    var square = false
    var active = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundColor(active ? Theme.cInk : Theme.cText)
            .padding(.horizontal, square ? 0 : 8)
            .frame(width: square ? 26 : nil, height: 22)
            .background(active ? Theme.cAmber : Color.white.opacity(configuration.isPressed ? 0.16 : 0.07))
            .clipShape(RoundedRectangle(cornerRadius: 4))
            .opacity(configuration.isPressed ? 0.8 : 1)
    }
}

// MARK: - the keys

/// Hosts the panel and owns its keys: Esc steps out of a field, then leaves; ⌘S saves; in the list, arrows, Return and typing
/// choose and filter.
final class EnvHostingView: NSHostingView<EnvPanel> {
    weak var model: EnvModel?
    override var acceptsFirstResponder: Bool { true }

    private var editingText: Bool { (window?.firstResponder as? NSText).map { $0.isDescendant(of: self) } ?? false }

    override func performKeyEquivalent(with event: NSEvent) -> Bool {
        guard let model, window?.isKeyWindow == true else { return false }
        let mods = event.modifierFlags.intersection([.command, .shift, .option, .control])
        if event.keyCode == 53, mods.isEmpty {
            if editingText { window?.makeFirstResponder(self) } else { model.onLeave() }
            return true
        }
        if mods == .command, event.charactersIgnoringModifiers == "s", model.phase == .editor {
            model.save()
            return true
        }
        guard !editingText, window?.firstResponder === self, model.phase == .picker, mods.isEmpty else { return false }
        switch event.keyCode {
        case 125: model.moveSelection(1)
        case 126: model.moveSelection(-1)
        case 36, 76: model.openSelected()
        case 51:
            model.query = String(model.query.dropLast())
            model.selection = 0
        default:
            guard let s = event.characters, s.count == 1, let c = s.unicodeScalars.first, c.value >= 32, c.value != 127 else { return false }
            model.query += s
            model.selection = 0
        }
        return true
    }
}
