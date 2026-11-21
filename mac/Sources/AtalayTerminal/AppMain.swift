import AppKit

@main
enum AppMain {
    @MainActor
    static func main() {
        // A terminal's link to its detached session (SyncRelay), not the app.
        let args = CommandLine.arguments
        if args.count > 2, args[1] == "--sync-relay" { SyncRelay.run(Array(args.dropFirst(2))) }
        // Claude Desktop / Claude Code's link to the running app (Mcp.swift): MCP on stdin and stdout, no window.
        if args.count > 1, args[1] == "--mcp-bridge" { McpBridge.run(scope: args.count > 2 ? args[2] : "full") }
        // The session name a parent Orbiterm gave this process's shell (Detached.sessionName) isn't this app's: its own
        // sessions name themselves through the environment of their shells only.
        unsetenv("ORBITERM_SESSION")
        let app = NSApplication.shared
        let delegate = AppDelegate()
        app.delegate = delegate
        app.setActivationPolicy(.regular)
        withExtendedLifetime(delegate) { app.run() }
    }
}
