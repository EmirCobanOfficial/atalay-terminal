import AppKit

/// Finger count on the trackpad, read through the private MultitouchSupport framework (the same
/// technique MiddleClick uses). Only used to recognise a four-finger click inside the app.
private var mtFingers: Int32 = 0
private var mtLastFour: Double = 0
private var mtLastThree: Double = 0
/// When each finger on the trackpad first touched it (by its identifier), to tell fingers that came down together
/// from a thumb or palm that was already resting there.
private var mtSeen: [Int32: Double] = [:]
private let mtLock = NSLock()
/// Fingers that came down within this of each other (a click with three fingers, not a resting hand plus two).
private let threeTogether = 0.15

private let contactCallback: @convention(c) (Int32, UnsafeMutableRawPointer?, Int32, Double, Int32) -> Int32 = { _, touches, fingers, _, _ in
    let now = ProcessInfo.processInfo.systemUptime
    mtFingers = fingers
    if fingers >= 4 { mtLastFour = now }
    // MTTouch is 96 bytes; its identifier (the finger's id while it stays down) sits at byte 16.
    guard let touches, fingers > 0 else {
        mtLock.lock(); mtSeen.removeAll(); mtLock.unlock()
        return 0
    }
    var ids = Set<Int32>()
    for i in 0..<Int(fingers) { ids.insert(touches.load(fromByteOffset: i * 96 + 16, as: Int32.self)) }
    mtLock.lock()
    for id in ids where mtSeen[id] == nil { mtSeen[id] = now }
    for id in mtSeen.keys where !ids.contains(id) { mtSeen[id] = nil }
    // The three newest fingers touched down together; anything older is a resting thumb or palm and is ignored.
    let times = mtSeen.values.sorted(by: >)
    if times.count >= 3, times[0] - times[2] <= threeTogether { mtLastThree = now }
    mtLock.unlock()
    return 0
}

enum Trackpad {
    private typealias CreateList = @convention(c) () -> Unmanaged<CFMutableArray>?
    private typealias Register = @convention(c) (UnsafeMutableRawPointer?, @convention(c) (Int32, UnsafeMutableRawPointer?, Int32, Double, Int32) -> Int32) -> Void
    private typealias Start = @convention(c) (UnsafeMutableRawPointer?, Int32) -> Void

    private static var devices: CFMutableArray?

    /// Starts listening on every multitouch device; false when the framework is unavailable.
    @discardableResult
    static func start() -> Bool {
        guard let lib = dlopen("/System/Library/PrivateFrameworks/MultitouchSupport.framework/MultitouchSupport", RTLD_NOW),
              let c = dlsym(lib, "MTDeviceCreateList"), let r = dlsym(lib, "MTRegisterContactFrameCallback"),
              let s = dlsym(lib, "MTDeviceStart") else { return false }
        let createList = unsafeBitCast(c, to: CreateList.self)
        let register = unsafeBitCast(r, to: Register.self)
        let startDevice = unsafeBitCast(s, to: Start.self)
        guard let list = createList()?.takeRetainedValue() else { return false }
        devices = list
        for i in 0..<CFArrayGetCount(list) {
            guard let dev = CFArrayGetValueAtIndex(list, i) else { continue }
            let ptr = UnsafeMutableRawPointer(mutating: dev)
            register(ptr, contactCallback)
            startDevice(ptr, 0)
        }
        return CFArrayGetCount(list) > 0
    }

    /// True when four or more fingers are (or were a moment ago) on the trackpad.
    static var fourFingersDown: Bool {
        mtFingers >= 4 || ProcessInfo.processInfo.systemUptime - mtLastFour < 0.25
    }

    /// True when three fingers that touched down together are (or were a moment ago) on the trackpad: a thumb or palm
    /// resting there before doesn't count, so a two-finger click beside it stays a right click.
    static var threeFingersDown: Bool {
        ProcessInfo.processInfo.systemUptime - mtLastThree < 0.25
    }
}
