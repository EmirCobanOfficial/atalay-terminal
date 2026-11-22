import Foundation

/// Cursor's CLI (cursor-agent, `agent`) writes no log of what it is doing that Orbiterm can follow, but it runs hooks
/// (~/.cursor/hooks.json, https://cursor.com/docs/hooks) with the conversation id, the model and the event's data on stdin.
/// Orbiterm's script keeps each conversation's events in a file of its own (`dir/<conversation id>.jsonl`, one line per
/// event) and, for the events of the conversation itself, which cursor-agent process (its pid) is in which conversation
/// (`dir/pid/<pid>`). The engine reads those (RadarEngine.readCursorEvents): the turn open or over, the tools it calls,
/// its subagents, its tokens. The script decides nothing and prints nothing, so Cursor asks and acts as usual; and it
/// does nothing at all when no cursor-agent is above it (the Cursor editor runs the same hooks file).
enum CursorHooks {
    private static let support = (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
        ?? URL(fileURLWithPath: HOME + "/Library/Application Support")).appendingPathComponent("atalay-terminal")
    static let dir = support.appendingPathComponent("cursor-events").path
    static let pidDir = dir + "/pid"
    private static let scriptURL = support.appendingPathComponent("cursor-hook.sh")
    private static let script = #"""
    #!/bin/sh
    # Orbiterm: Cursor's CLI (cursor-agent) runs this on its hooks (~/.cursor/hooks.json), the event's JSON on stdin. The event
    # goes to its conversation's file for the dashboard; nothing is printed, Cursor decides nothing differently. It does
    # nothing when no cursor-agent is above it (the Cursor editor runs the same hooks).
    dir="$HOME/Library/Application Support/atalay-terminal/cursor-events"
    event="$1"
    json=$(cat | tr '\n\r' '  ')
    [ -n "$json" ] || exit 0
    agent=$(/bin/ps -ax -o pid=,ppid=,command= | /usr/bin/awk -v me="$$" '
      { pp[$1] = $2; cmd[$1] = $0 }
      END { p = pp[me]; n = 0
        while (p > 1 && n < 10) { if (index(cmd[p], "cursor-agent/versions/") > 0) { print p; exit } p = pp[p]; n++ } }')
    [ -n "$agent" ] || exit 0
    field() { printf '%s' "$json" | /usr/bin/grep -oE '"'"$1"'"[[:space:]]*:[[:space:]]*"([^"\\]|\\.)*"' | head -n 1 | sed 's/^"[^"]*"[[:space:]]*:[[:space:]]*"//; s/"$//'; }
    sid=$(field conversation_id)
    case "$sid" in ''|*[!A-Za-z0-9._-]*) exit 0 ;; esac
    # A big payload (a tool's whole output, a file written) is cut down to the fields the dashboard reads.
    if [ "${#json}" -gt 16000 ]; then
      small='{"truncated":true'
      for k in conversation_id generation_id model tool_use_id tool_name hook_event_name status subagent_id subagent_type parent_conversation_id command cwd path file_path; do
        v=$(field $k)
        [ -n "$v" ] && small="$small,\"$k\":\"$v\""
      done
      for k in text prompt; do
        v=$(field $k | LC_ALL=en_US.UTF-8 cut -c1-4000 | LC_ALL=en_US.UTF-8 sed -E 's/\\u[0-9a-fA-F]{0,3}$//; s/\\+$//')
        [ -n "$v" ] && small="$small,\"$k\":\"$v\""
      done
      json="$small}"
    fi
    mkdir -p "$dir/pid" 2>/dev/null
    # Parallel tool calls run this at once: one at a time appends (a lock folder), or their lines would interleave.
    lock="$dir/.lock-$sid"; n=0
    age() { echo $(( $(date +%s) - $(stat -f %m "$1" 2>/dev/null || date +%s) )); }
    until mkdir "$lock" 2>/dev/null; do
      n=$((n + 1))
      # A lock older than 3 s was left by a hook that died: whoever moves it away first (one winner) clears it.
      if [ $((n % 25)) -eq 0 ] && [ "$(age "$lock")" -ge 3 ] && mv "$lock" "$lock.stale.$$" 2>/dev/null; then
        # It may have been a live lock taken after the look: only an old one goes, a young one goes back.
        if [ "$(age "$lock.stale.$$")" -ge 3 ]; then rm -rf "$lock.stale.$$"; else mv "$lock.stale.$$" "$lock" 2>/dev/null || rm -rf "$lock.stale.$$"; fi
      fi
      sleep 0.02
    done
    echo $$ > "$lock/pid" 2>/dev/null
    printf '{"e":"%s","t":%s000,"agent":%s,"p":%s}\n' "$event" "$(date +%s)" "$agent" "$json" >> "$dir/$sid.jsonl"
    # Only our own lock is let go.
    [ "$(cat "$lock/pid" 2>/dev/null)" = "$$" ] && rm -rf "$lock"
    case "$event" in
      sessionStart|beforeSubmitPrompt|stop) printf '%s' "$sid" > "$dir/pid/$agent" ;;
    esac
    exit 0
    """#
    /// The events it takes. None of them can change what Cursor does: our script prints nothing.
    static let events = ["sessionStart", "sessionEnd", "beforeSubmitPrompt", "stop", "preToolUse", "postToolUse", "postToolUseFailure",
                         "afterAgentResponse", "preCompact"]

    /// Whether `command` is one of ours (the script, any event).
    private static func ours(_ command: String?) -> Bool { command?.contains("cursor-hook.sh") == true }

    /// Writes the script and adds its hooks to Cursor's hooks.json, next to the user's own; once there, nothing changes. A
    /// hooks.json that doesn't read as JSON is left alone; without Cursor's folder, nothing. Old event files go.
    static func install() {
        let cursor = HOME + "/.cursor"
        guard FileManager.default.fileExists(atPath: cursor) else { return }
        try? FileManager.default.createDirectory(atPath: pidDir, withIntermediateDirectories: true)
        if (try? String(contentsOf: scriptURL, encoding: .utf8)) != script {
            try? script.write(to: scriptURL, atomically: true, encoding: .utf8)
            try? FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: scriptURL.path)
        }
        prune()
        // A hooks.json that is a link (dotfiles) is written through: its target changes, the link stays.
        let file = URL(fileURLWithPath: cursor + "/hooks.json").resolvingSymlinksInPath().path
        var root: [String: Any] = [:]
        if let data = FileManager.default.contents(atPath: file) {
            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
            root = json
        }
        var hooks = root["hooks"] as? [String: Any] ?? [:]
        var changed = false
        // A permission hook an earlier build added (it must print an answer; ours prints nothing): taken out again.
        for event in ["beforeMCPExecution"] {
            guard let list = hooks[event] as? [[String: Any]], list.contains(where: { ours($0["command"] as? String) }) else { continue }
            let kept = list.filter { !ours($0["command"] as? String) }
            hooks[event] = kept.isEmpty ? nil : kept
            changed = true
        }
        for event in events {
            let command = "/bin/sh '\(scriptURL.path)' \(event)"
            var list = hooks[event] as? [[String: Any]] ?? []
            guard !list.contains(where: { $0["command"] as? String == command }) else { continue }
            list.append(["command": command, "timeout": 5])
            hooks[event] = list
            changed = true
        }
        guard changed else { return }
        root["hooks"] = hooks
        if root["version"] == nil { root["version"] = 1 }
        guard let out = try? JSONSerialization.data(withJSONObject: root, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]) else { return }
        try? out.write(to: URL(fileURLWithPath: file), options: .atomic)
    }

    /// When our hooks went into hooks.json (its last change, seconds), nil when they aren't there. A cursor-agent started
    /// before that never read them.
    static var installedAt: Double? {
        guard installed else { return nil }
        let file = URL(fileURLWithPath: HOME + "/.cursor/hooks.json").resolvingSymlinksInPath().path
        return ((try? FileManager.default.attributesOfItem(atPath: file))?[.modificationDate] as? Date)?.timeIntervalSince1970
    }

    /// The offset of the first line of an event file from `since` (ms) on, the end when there is none: where a process
    /// that resumed a chat begins reading, past what earlier processes wrote, but at its own turn when it is mid-turn.
    static func offset(of path: String, since: Double) -> UInt64 {
        guard let size = ((try? FileManager.default.attributesOfItem(atPath: path))?[.size] as? NSNumber)?.uint64Value,
              let fh = FileHandle(forReadingAtPath: path) else { return 0 }
        defer { try? fh.close() }
        let from = size > 2 << 20 ? size - (2 << 20) : 0
        try? fh.seek(toOffset: from)
        guard let data = try? fh.readToEnd() else { return size }
        var pos = from, first = from > 0
        for line in data.split(separator: 0x0A, omittingEmptySubsequences: false) {
            let start = pos
            pos += UInt64(line.count) + 1
            if first { first = false; continue }
            if let j = try? JSONSerialization.jsonObject(with: Data(line)) as? [String: Any], let t = j["t"] as? Double, t >= since { return start }
        }
        return size
    }

    /// Whether our hooks are in hooks.json now.
    static var installed: Bool {
        guard let data = FileManager.default.contents(atPath: HOME + "/.cursor/hooks.json"),
              let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let hooks = root["hooks"] as? [String: Any] else { return false }
        return hooks.values.contains { ($0 as? [[String: Any]] ?? []).contains { ours($0["command"] as? String) } }
    }

    /// Event files of conversations quiet for two weeks, and pointers of processes quiet for a day, go.
    private static func prune() {
        let fm = FileManager.default
        for (folder, age) in [(dir, 14 * 86_400.0), (pidDir, 86_400.0)] {
            guard let names = try? fm.contentsOfDirectory(atPath: folder) else { continue }
            for name in names where name != "pid" {
                let path = folder + "/" + name
                if let m = (try? fm.attributesOfItem(atPath: path))?[.modificationDate] as? Date, Date().timeIntervalSince(m) > age {
                    try? fm.removeItem(atPath: path)
                }
            }
        }
    }

    /// The conversation a cursor-agent process (`pid`, started at `since` seconds) is in, from its last pointer.
    static func conversation(ofPid pid: Int32, since: Double) -> String? {
        let path = pidDir + "/\(pid)"
        guard let m = (try? FileManager.default.attributesOfItem(atPath: path))?[.modificationDate] as? Date,
              m.timeIntervalSince1970 >= since - 5,
              let s = try? String(contentsOfFile: path, encoding: .utf8) else { return nil }
        let id = s.trimmingCharacters(in: .whitespacesAndNewlines)
        return id.isEmpty ? nil : id
    }

    static func log(of conversation: String) -> String { dir + "/" + conversation + ".jsonl" }
}
