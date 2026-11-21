import Darwin
import Foundation

/// Process facts straight from the kernel (libproc / sysctl) instead of spawning `ps`, which cost a
/// fork+exec every few seconds and a pipe read on the engine queue.
enum Proc {
    struct Info {
        let ppid: Int32
        let tty: String?
        /// User + system CPU time in nanoseconds.
        let cpuTime: UInt64
        let rss: UInt64
        let uid: UInt32
        /// When it started, in microseconds since 1970: with the pid, what tells it apart from a later process that got
        /// the same number.
        let started: UInt64
    }

    private static let timebase: (numer: UInt64, denom: UInt64) = {
        var tb = mach_timebase_info_data_t()
        mach_timebase_info(&tb)
        return (UInt64(max(tb.numer, 1)), UInt64(max(tb.denom, 1)))
    }()

    static func info(_ pid: Int32) -> Info? {
        var all = proc_taskallinfo()
        let size = Int32(MemoryLayout<proc_taskallinfo>.size)
        guard proc_pidinfo(pid, PROC_PIDTASKALLINFO, 0, &all, size) == size else { return nil }
        let dev = all.pbsd.e_tdev
        let tty = dev == UInt32.max ? nil : ttyName(dev)
        // Task times are in Mach absolute time units (not nanoseconds) on Apple silicon.
        let ticks = all.ptinfo.pti_total_user &+ all.ptinfo.pti_total_system
        return Info(ppid: Int32(bitPattern: all.pbsd.pbi_ppid), tty: tty,
                    cpuTime: ticks &* timebase.numer / timebase.denom, rss: all.ptinfo.pti_resident_size,
                    uid: all.pbsd.pbi_uid, started: all.pbsd.pbi_start_tvsec &* 1_000_000 &+ all.pbsd.pbi_start_tvusec)
    }

    /// devname() stats /dev entries on every call; terminals keep their device number, so remember them.
    private static let ttyLock = NSLock()
    nonisolated(unsafe) private static var ttyNames: [UInt32: String] = [:]
    private static func ttyName(_ dev: UInt32) -> String? {
        ttyLock.lock()
        defer { ttyLock.unlock() }
        if let known = ttyNames[dev] { return known }
        guard let name = devname(dev_t(bitPattern: dev), S_IFCHR) else { return nil }
        let path = "/dev/" + String(cString: name)
        ttyNames[dev] = path
        return path
    }

    static func parent(_ pid: Int32) -> Int32? {
        var bsd = proc_bsdshortinfo()
        let size = Int32(MemoryLayout<proc_bsdshortinfo>.size)
        guard proc_pidinfo(pid, PROC_PIDT_SHORTBSDINFO, 0, &bsd, size) == size else { return nil }
        return Int32(bitPattern: bsd.pbsi_ppid)
    }

    static func children(of pid: Int32) -> [Int32] { list(UInt32(PROC_PPID_ONLY), UInt32(bitPattern: pid)) }

    /// The file descriptors `pid` has open.
    private static func descriptors(_ pid: Int32) -> [proc_fdinfo] {
        let stride = MemoryLayout<proc_fdinfo>.stride
        let size = proc_pidinfo(pid, PROC_PIDLISTFDS, 0, nil, 0)
        guard size > 0 else { return [] }
        var fds = [proc_fdinfo](repeating: proc_fdinfo(), count: Int(size) / stride + 16)
        let got = proc_pidinfo(pid, PROC_PIDLISTFDS, 0, &fds, Int32(fds.count * stride))
        return got > 0 ? Array(fds.prefix(Int(got) / stride)) : []
    }

    /// The processes of a task `pid` started at `at` (ms): its descendants (five levels down, never itself) that started
    /// within three seconds of it, with theirs. Antigravity runs each background command in a terminal of its own and
    /// copies its output to the task's file itself, so the time is what ties a task to its processes.
    static func started(around at: Double, under pid: Int32) -> [Int32] {
        var all: [Int32] = [], level = children(of: pid)
        for _ in 0..<5 where !level.isEmpty {
            all += level
            level = level.flatMap { children(of: $0) }
        }
        let roots = all.filter { p in info(p).map { abs(Double($0.started) / 1000 - at) < 3_000 } ?? false }
        var found = Set(roots), next = roots
        for _ in 0..<5 where !next.isEmpty {
            next = next.flatMap { children(of: $0) }
            found.formUnion(next)
        }
        return Array(found)
    }

    /// Whether `pid` listens on a TCP port: a server, up and waiting for whoever connects.
    static func listens(_ pid: Int32) -> Bool {
        descriptors(pid).contains { fd in
            guard fd.proc_fdtype == UInt32(PROX_FDTYPE_SOCKET) else { return false }
            var info = socket_fdinfo()
            let size = Int32(MemoryLayout<socket_fdinfo>.size)
            guard proc_pidfdinfo(pid, fd.proc_fd, PROC_PIDFDSOCKETINFO, &info, size) == size else { return false }
            return info.psi.soi_kind == Int32(SOCKINFO_TCP) && info.psi.soi_proto.pri_tcp.tcpsi_state == Int32(TSI_S_LISTEN)
        }
    }

    /// One variable of the process's environment (the user's own processes only; nil when it can't be read or isn't set).
    static func environmentVariable(_ pid: Int32, _ name: String) -> String? {
        var mib: [Int32] = [CTL_KERN, KERN_PROCARGS2, pid]
        var size = 0
        guard sysctl(&mib, 3, nil, &size, nil, 0) == 0, size > MemoryLayout<Int32>.size else { return nil }
        var buf = [UInt8](repeating: 0, count: size)
        guard sysctl(&mib, 3, &buf, &size, nil, 0) == 0 else { return nil }
        let argc = Int(buf.withUnsafeBytes { $0.load(as: Int32.self) })
        var i = MemoryLayout<Int32>.size
        while i < size, buf[i] != 0 { i += 1 }
        while i < size, buf[i] == 0 { i += 1 }
        var index = 0, start = i
        let key = name + "="
        while i < size {
            if buf[i] == 0 {
                // The first argc strings are the arguments (an empty one counts); then the environment, up to the empty end.
                if index >= argc {
                    if i == start { break }
                    let entry = String(decoding: buf[start..<i], as: UTF8.self)
                    if entry.hasPrefix(key) { return String(entry.dropFirst(key.count)) }
                }
                index += 1
                start = i + 1
            }
            i += 1
        }
        return nil
    }

    // MARK: memory, ports, one look at every process (MemoryWatch, Cleanup)

    /// Activity Monitor's "Memory" column: the process's physical footprint (internal + compressed + IOKit), in bytes. Only
    /// the user's own processes can be read; another user's answers EPERM and is nil.
    static func footprint(_ pid: Int32) -> UInt64? {
        var ri = rusage_info_v4()
        let r = withUnsafeMutablePointer(to: &ri) { p in
            p.withMemoryRebound(to: rusage_info_t?.self, capacity: 1) { proc_pid_rusage(pid, RUSAGE_INFO_V4, $0) }
        }
        return r == 0 ? ri.ri_phys_footprint : nil
    }

    /// The TCP ports `pid` listens on.
    static func listeningPorts(_ pid: Int32) -> [UInt16] {
        var ports: [UInt16] = []
        for fd in descriptors(pid) where fd.proc_fdtype == UInt32(PROX_FDTYPE_SOCKET) {
            var info = socket_fdinfo()
            let size = Int32(MemoryLayout<socket_fdinfo>.size)
            guard proc_pidfdinfo(pid, fd.proc_fd, PROC_PIDFDSOCKETINFO, &info, size) == size,
                  info.psi.soi_kind == Int32(SOCKINFO_TCP), info.psi.soi_proto.pri_tcp.tcpsi_state == Int32(TSI_S_LISTEN) else { continue }
            let port = UInt16(bigEndian: UInt16(truncatingIfNeeded: info.psi.soi_proto.pri_tcp.tcpsi_ini.insi_lport))
            if port != 0, !ports.contains(port) { ports.append(port) }
        }
        return ports.sorted()
    }

    /// Every process of the user, read once: what Runaways and MemoryWatch share, so a round scans the table once.
    struct Snapshot {
        var pids: [Int32] = []
        var infos: [Int32: Info] = [:]
        /// Children by parent for the user's processes whose parent isn't launchd (pid 1).
        var children: [Int32: [Int32]] = [:]
        /// Seconds of uptime and ms since 1970 when it was taken.
        var uptime = 0.0
        var wall = 0.0
    }

    static func snapshot() -> Snapshot {
        let me = getuid()
        var s = Snapshot()
        s.uptime = ProcessInfo.processInfo.systemUptime
        s.wall = Date().timeIntervalSince1970 * 1000
        s.pids = all()
        for pid in s.pids where pid > 1 {
            guard let info = Proc.info(pid), info.uid == me else { continue }
            s.infos[pid] = info
            if info.ppid > 1 { s.children[info.ppid, default: []].append(pid) }
        }
        return s
    }

    /// What ending a program came to.
    enum Ended { case gone, stopped, failed }

    /// Ends the process `root` (the one seen at `started`) and everything under it, deepest first: TERM, then, when some are
    /// still the same process after `grace` seconds, KILL. Each signal goes to a pid with the start time it was seen at, never
    /// to a process group (a group can hold processes that left the tree, or belong to someone else's), and only to the user's
    /// own. Blocks up to `grace` + 2 s: call it off the main thread. `.gone`: it was not that process any more.
    static func endTree(root: Int32, started: UInt64, grace: TimeInterval = 5) -> Ended {
        let me = getuid()
        guard root > 1, let r = info(root), r.uid == me, r.started == started else { return .gone }
        typealias P = (pid: Int32, started: UInt64)
        var tree: [P] = []
        func walk(_ pid: Int32, _ depth: Int) {
            guard depth < 30 else { return }
            for child in children(of: pid) { walk(child, depth + 1) }
            if let i = info(pid), i.uid == me { tree.append((pid, i.started)) }
        }
        walk(root, 0)
        let alive = { (list: [P]) in list.filter { t in info(t.pid)?.started == t.started } }
        for t in tree { kill(t.pid, SIGTERM) }
        var deadline = Date().addingTimeInterval(grace)
        while !alive(tree).isEmpty, Date() < deadline { Thread.sleep(forTimeInterval: 0.1) }
        let left = alive(tree)
        if left.isEmpty { return .stopped }
        for t in left { kill(t.pid, SIGKILL) }
        deadline = Date().addingTimeInterval(2)
        while !alive(left).isEmpty, Date() < deadline { Thread.sleep(forTimeInterval: 0.1) }
        return alive(left).isEmpty ? .stopped : .failed
    }

    static func all() -> [Int32] { list(UInt32(PROC_ALL_PIDS), 0) }

    private static func list(_ type: UInt32, _ info: UInt32) -> [Int32] {
        let bytes = proc_listpids(type, info, nil, 0)
        guard bytes > 0 else { return [] }
        var pids = [Int32](repeating: 0, count: Int(bytes) / MemoryLayout<Int32>.size + 32)
        let got = pids.withUnsafeMutableBytes { proc_listpids(type, info, $0.baseAddress, Int32($0.count)) }
        guard got > 0 else { return [] }
        return pids.prefix(Int(got) / MemoryLayout<Int32>.size).filter { $0 > 0 }
    }

    /// Current working directory of one of our processes.
    static func cwd(_ pid: Int32) -> String? {
        var info = proc_vnodepathinfo()
        let size = Int32(MemoryLayout<proc_vnodepathinfo>.size)
        guard proc_pidinfo(pid, PROC_PIDVNODEPATHINFO, 0, &info, size) == size else { return nil }
        let path = withUnsafeBytes(of: info.pvi_cdir.vip_path) { String(decoding: $0.prefix { $0 != 0 }, as: UTF8.self) }
        return path.isEmpty ? nil : path
    }

    /// The process group in front on `pid`'s terminal: the shell's foreground job, or the shell itself.
    static func foregroundGroup(_ pid: Int32) -> Int32? {
        var bsd = proc_bsdinfo()
        let size = Int32(MemoryLayout<proc_bsdinfo>.size)
        guard proc_pidinfo(pid, PROC_PIDTBSDINFO, 0, &bsd, size) == size, bsd.e_tpgid > 0 else { return nil }
        return Int32(bsd.e_tpgid)
    }

    /// Short executable name (p_comm), e.g. "screen"; native Claude runs as its version ("2.1.316"), see isClaude.
    static func name(_ pid: Int32) -> String? {
        var buf = [CChar](repeating: 0, count: 64)
        guard proc_name(pid, &buf, UInt32(buf.count)) > 0 else { return nil }
        return String(cString: buf)
    }

    /// Full path of the file the process runs, e.g. "/Users/me/.local/share/claude/versions/2.1.316".
    static func path(_ pid: Int32) -> String? {
        var buf = [CChar](repeating: 0, count: 4 * Int(MAXPATHLEN)) // PROC_PIDPATHINFO_MAXSIZE, a macro Swift can't import
        guard proc_pidpath(pid, &buf, UInt32(buf.count)) > 0 else { return nil }
        return String(cString: buf)
    }

    /// The process's current argument vector (what `ps -o command` shows; screen rewrites its own).
    static func arguments(_ pid: Int32) -> [String]? {
        var mib: [Int32] = [CTL_KERN, KERN_PROCARGS2, pid]
        var size = 0
        guard sysctl(&mib, 3, nil, &size, nil, 0) == 0, size > MemoryLayout<Int32>.size else { return nil }
        var buf = [UInt8](repeating: 0, count: size)
        guard sysctl(&mib, 3, &buf, &size, nil, 0) == 0 else { return nil }
        let argc = Int(buf.withUnsafeBytes { $0.load(as: Int32.self) })
        var i = MemoryLayout<Int32>.size
        while i < size, buf[i] != 0 { i += 1 } // executable path
        while i < size, buf[i] == 0 { i += 1 } // padding
        var args: [String] = []
        var start = i
        while i < size, args.count < argc {
            if buf[i] == 0 {
                args.append(String(decoding: buf[start..<i], as: UTF8.self))
                start = i + 1
            }
            i += 1
        }
        return args
    }

    /// The environment a process was started with (KERN_PROCARGS2: the strings after its arguments, up to the first
    /// empty one). Only readable for the current user's own processes.
    static func environment(_ pid: Int32) -> [String: String]? {
        var mib: [Int32] = [CTL_KERN, KERN_PROCARGS2, pid]
        var size = 0
        guard sysctl(&mib, 3, nil, &size, nil, 0) == 0, size > MemoryLayout<Int32>.size else { return nil }
        var buf = [UInt8](repeating: 0, count: size)
        guard sysctl(&mib, 3, &buf, &size, nil, 0) == 0 else { return nil }
        let argc = Int(buf.withUnsafeBytes { $0.load(as: Int32.self) })
        var i = MemoryLayout<Int32>.size
        while i < size, buf[i] != 0 { i += 1 } // executable path
        while i < size, buf[i] == 0 { i += 1 } // padding
        var seen = 0
        while i < size, seen < argc { // the arguments
            if buf[i] == 0 { seen += 1 }
            i += 1
        }
        var start = i
        var env: [String: String] = [:]
        while i < size {
            if buf[i] == 0 {
                if i == start { break }
                let entry = String(decoding: buf[start..<i], as: UTF8.self)
                if let eq = entry.firstIndex(of: "=") { env[String(entry[..<eq])] = String(entry[entry.index(after: eq)...]) }
                start = i + 1
            }
            i += 1
        }
        return env
    }
}
