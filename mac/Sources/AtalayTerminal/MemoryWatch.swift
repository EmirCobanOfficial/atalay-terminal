import AppKit
import Darwin

/// The one round that looks at the Mac's memory and at what Orbiterm's sessions run, every five seconds (it replaces
/// Runaways' own timer: one look at the process table, shared). It reads the Mac's memory as Activity Monitor shows it,
/// measures every session's tree (the card's `mem`), lets Runaways and Clean Up read the same snapshot, and decides whether the
/// map offers a Clean Up. Nothing here closes anything: the strip is only a suggestion, and a click opens the page.
@MainActor
final class MemoryWatch {
    static let shared = MemoryWatch()

    @MainActor struct State: Equatable {
        var ram: UInt64 = 0
        var swap: UInt64 = 0
        /// kern.memorystatus_vm_pressure_level: 1 normal, 2 warn, 4 critical.
        var level = 1
        var app: UInt64 = 0
        var wired: UInt64 = 0
        var compressed: UInt64 = 0
        var used: UInt64 { min(ram, app + wired + compressed) }
        var free: UInt64 { ram - used }
        /// The words the strip, the page's hero and its badge use: fine, low, out.
        var pressure: String {
            if level >= 4 { return "out" }
            let limit = UInt64(Cleanup.swapGB) * MemoryWatch.GiB
            if level >= 2 || swap >= limit { return "low" }
            return "fine"
        }
    }

    static let GiB: UInt64 = 1 << 30
    static let MiB: UInt64 = 1 << 20

    private(set) var state = State()
    private weak var manager: MainWindowController?
    private var runaways: Runaways?
    private var timer: Timer?
    private var source: DispatchSourceMemoryPressure?
    private var lastOthersAt = 0.0

    // The strip (spec 4.2): when the Mac has been tight a while and Orbiterm has something to give back.
    private var tightSince: Double?
    private var outSince: Double?
    private var fineSince: Double?
    private(set) var shown = false
    private var lastJSON = ""

    func start(manager: MainWindowController, runaways: Runaways) {
        self.manager = manager
        self.runaways = runaways
        Cleanup.shared.runaways = runaways
        let t = Timer(timeInterval: 5, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.tick() }
        }
        t.tolerance = 0.5
        RunLoop.main.add(t, forMode: .default)
        timer = t
        // The system says when pressure changes: a round at once, only measuring (no cache walking on the event).
        let src = DispatchSource.makeMemoryPressureSource(eventMask: [.normal, .warning, .critical], queue: .main)
        src.setEventHandler { [weak self] in MainActor.assumeIsolated { self?.tick() } }
        src.resume()
        source = src
    }

    // MARK: what the card reads (the engine's queue)

    struct Tree {
        var bytes: UInt64
        var top: [(String, UInt64)]
    }
    nonisolated private static let lock = NSLock()
    nonisolated(unsafe) private static var trees: [Int32: Tree] = [:]
    nonisolated(unsafe) private static var ai: [Int32] = []

    /// What the AI process `pid` and everything it started hold (its session's whole tree), and its heaviest parts.
    nonisolated static func tree(of pid: Int32) -> Tree? {
        lock.lock()
        defer { lock.unlock() }
        return trees[pid]
    }

    nonisolated static func publish(_ next: [Int32: Tree]) {
        lock.lock()
        trees = next
        lock.unlock()
    }

    /// The live AI processes (from the engine's sessions), for finding which of a session's processes is the AI.
    nonisolated static func setAIPids(_ pids: [Int32]) {
        lock.lock()
        ai = pids
        lock.unlock()
    }

    nonisolated static func aiPids() -> [Int32] {
        lock.lock()
        defer { lock.unlock() }
        return ai
    }

    /// A round now (the view opened, a clean up ended).
    func refresh() { tick() }

    // MARK: the round

    private func tick() {
        let snap = Proc.snapshot()
        runaways?.sample(snap)
        state = Self.read()
        let cleanup = Cleanup.shared
        let withOthers = cleanup.viewOpen || snap.uptime - lastOthersAt >= 30
        if withOthers { lastOthersAt = snap.uptime }
        cleanup.round(snap, others: withOthers)
        decide(snap.uptime)
        pushMemory()
        if cleanup.viewOpen { cleanup.pushList(force: false) }
    }

    /// The strip's rule, from counts only: tight for two minutes (or critical for ten seconds) and what Clean Up would tick
    /// by itself holds enough memory; it goes after five calm minutes, or when little is left to give.
    private func decide(_ t: Double) {
        // Suggestions off: the line goes at once.
        if !Cleanup.suggest { shown = false; return }
        let thr = UInt64(Cleanup.swapGB) * Self.GiB
        let tight = state.level >= 2 || state.swap >= thr
        if tight { tightSince = tightSince ?? t } else { tightSince = nil }
        if state.level >= 4 { outSince = outSince ?? t } else { outSince = nil }
        if state.level == 1 && state.swap < thr { fineSince = fineSince ?? t } else { fineSince = nil }
        let reclaim = Cleanup.shared.reclaimable
        if shown {
            if let f = fineSince, t - f >= 300 { shown = false }
            if reclaim < 512 * Self.MiB { shown = false }
            return
        }
        guard Cleanup.suggest, !blocked() else { return }
        if let o = outSince, t - o >= 10, reclaim >= 512 * Self.MiB { shown = true }
        else if let s = tightSince, t - s >= 120, reclaim >= Self.GiB { shown = true }
    }

    /// Hidden with × earlier: it comes back when the level reaches critical, the disk holds 2 GB more, or six hours passed.
    private func blocked() -> Bool {
        guard let d = UserDefaults.standard.dictionary(forKey: "cleanupDismissed"),
              let swap = (d["swap"] as? NSNumber)?.uint64Value, let level = (d["level"] as? NSNumber)?.intValue,
              let at = (d["at"] as? NSNumber)?.doubleValue else { return false }
        if state.level >= 4 && level < 4 { return false }
        if state.swap >= swap + 2 * Self.GiB { return false }
        if nowMs() - at >= 6 * 3_600_000 { return false }
        return true
    }

    /// Settings changed (the suggestion switched off hides the line now).
    func prefsChanged() {
        if !Cleanup.suggest { shown = false }
        pushMemory()
    }

    /// The × on the strip: it goes at once, and stays away until it gets worse (spec 4.2).
    func dismiss() {
        UserDefaults.standard.set(["swap": NSNumber(value: state.swap), "level": state.level, "at": nowMs()], forKey: "cleanupDismissed")
        shown = false
        pushMemory()
    }

    /// The strip's short status for the page (only when it changes; nothing at all while the strip is away).
    func pushMemory(force: Bool = false) {
        var m: [String: Any] = ["pressure": state.pressure, "show": shown]
        if shown {
            func round1(_ b: UInt64) -> Double { (Double(b) / Double(Self.GiB) * 10).rounded() / 10 * Double(Self.GiB) }
            m["swap"] = round1(state.swap)
            m["reclaim"] = round1(Cleanup.shared.reclaimable)
        }
        guard let data = try? JSONSerialization.data(withJSONObject: m, options: [.sortedKeys]), let json = String(data: data, encoding: .utf8) else { return }
        guard force || json != lastJSON else { return }
        lastJSON = json
        manager?.radar.push("memory", json)
    }

    // MARK: the Mac's memory (no admin rights: sysctl and host statistics)

    static func read() -> State {
        var s = State()
        var size = MemoryLayout<UInt64>.size
        var ram: UInt64 = 0
        if sysctlbyname("hw.memsize", &ram, &size, nil, 0) == 0 { s.ram = ram }
        var level: Int32 = 1
        size = MemoryLayout<Int32>.size
        if sysctlbyname("kern.memorystatus_vm_pressure_level", &level, &size, nil, 0) == 0 { s.level = Int(level) }
        var swap = xsw_usage()
        size = MemoryLayout<xsw_usage>.size
        if sysctlbyname("vm.swapusage", &swap, &size, nil, 0) == 0 { s.swap = swap.xsu_used }
        var info = vm_statistics64_data_t()
        var count = mach_msg_type_number_t(MemoryLayout<vm_statistics64_data_t>.size / MemoryLayout<integer_t>.size)
        let ok = withUnsafeMutablePointer(to: &info) { p in
            p.withMemoryRebound(to: integer_t.self, capacity: Int(count)) { host_statistics64(mach_host_self(), HOST_VM_INFO64, $0, &count) }
        }
        if ok == KERN_SUCCESS {
            let page = UInt64(getpagesize())
            // Activity Monitor's "App Memory", Wired and Compressed (htop's formula).
            s.app = UInt64(info.internal_page_count &- info.purgeable_count) * page
            s.wired = UInt64(info.wire_count) * page
            s.compressed = UInt64(info.compressor_page_count) * page
        }
        return s
    }
}
