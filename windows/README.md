# Orbiterm for Windows

**Out as a pre-release**: [the releases repo's windows release](https://github.com/atalaykarahan/orbiterm-releases/releases/tag/windows).
It's built in the open, like the rest of the app, but its installers are built and published on the Windows PC, not on
GitHub's machines, since they carry the app's API key (below).

The Windows app: Electron around the same dashboard the Mac app shows (`mac/Resources/web`, used as it is), with
terminals from xterm.js and node-pty (ConPTY), the way VS Code runs its terminal on Windows. It talks to the same API
(friends, messages, levels, notifications) as the Mac app.

## Run and build

```sh
cd windows
npm install          # node-pty comes prebuilt (N-API, loads in Electron as it is): nothing to compile
npm start            # the app, from the sources
npm run staging      # the same against the local API, never the live one (below)
npm run staging -- --packaged   # a packaged build with its guard, as a release is made, against the local API
npm run dist         # dist/Atalays-Terminal-Setup-<version>.exe, with its guard (on Windows, with the release key)
npm run release -- "what changed"     # a signed build, published as the update every installed copy takes
```

`npm run staging` is for trying things without touching real users' data, as the Mac's `dev.sh` and staging build
are: the private API repo cloned as `api/` next to `mac/` and `windows/` (gitignored there), running in Docker
(`docker compose up -d` in `api/`, with an `ADMIN_TOKEN` of its own in `api/.env`). It registers a key of its own with
that API (`~/.atalay-terminal/client-key-windows-staging`, so the release key is never needed there) and keeps its own
profile, so it runs next to the installed app.

The app's API calls are signed with a key of its own (the API refuses unsigned ones). The key never goes to GitHub: it
lives in `~/.atalay-terminal/client-key-windows` on the Mac (`scripts/new-key.sh` makes a fresh one before a release;
the old one is revoked a month later) and is copied by hand to the Windows PC, which keeps it like an SSH key in
`~/.atalay-terminal/client-key-windows` (readable by its user only, with `client-key-windows.decoys` beside it). The
key never goes into the app's JavaScript: a release's build compiles it into `resources/guard.node` (`native/guard.c`,
built by `scripts/guard.js` with a pinned zig it fetches), a small native part that signs only inside that release's
own `Orbiterm.exe` and `app.asar`. The packaged app can't be run as plain Node, inspected or edited (Electron fuses),
opens no developer tools, and its guard stops signing when it's started with a debugging switch or its pages or
node-pty were changed.

### Releases and updates

Installed copies look for updates every minute (and on waking or unlocking the PC), as the Mac's heartbeat does, in the
`windows` release of [orbiterm-releases](https://github.com/atalaykarahan/orbiterm-releases)
(electron-updater; package.json's `publish`): they read its latest.yml (about 1 KB) with a time limit and hand over to
electron-updater only when it names a newer version, so a release shows within a minute of going out. It's a pre-release, so it never becomes the repo's latest, the Mac's `.dmg` link keeps working, and a newer
Mac release can't hide the Windows files. An update downloads by itself and goes in when the app quits, or right away
when nothing would be stopped by a restart and the PC has been left alone for 10 minutes (or "right away" is on in
Settings). New users download `Orbiterm-Setup.exe` from that release (also there under the old name, `Atalays-Terminal-Setup.exe`); it's always the newest.

A release, on the Windows PC:

1. A fresh key for this release (the one before stops earning XP 10 minutes after this release is out and stops working
   24 hours after). With the admin token on this PC (`~/.atalay-terminal/admin-token`, readable by its user only, or
   `$env:ATALAY_ADMIN_TOKEN`), step 3 makes it, with its two decoys, and marks it live once the release is out: nothing
   to do here. Without it: on the Mac, `windows/scripts/new-key.sh`, then here, without it ever showing:
   `$env:ATALAY_CLIENT_KEY = (Get-Clipboard -Raw).Trim(); node scripts/clientkey.js --save; Remove-Item Env:ATALAY_CLIENT_KEY`
2. Raise `version` in package.json to the next version, the one the Mac's next release takes too: the two apps are one
   product with one version number (0.13.0 is the first they share), so the admin page compares them alike.
3. `npm run release -- "what changed" "what else"`: builds the app, its guard over it, then the installer, and replaces
   the release's files
   (`latest.yml`, the installer and its blockmap; `--dry-run` only shows them). It signs in to GitHub as git does on
   this PC (or with `$env:GH_TOKEN`).

## How it's put together

The dashboard's pages call the app through `window.webkit.messageHandlers.<name>.postMessage(...)`, as WKWebView has it
on the Mac. `src/preload.js` gives them the same object over Electron's IPC, so the pages run unchanged; the app answers
in `src/main.js` and pushes to them with `window.__radar.*`, `window.__messages.*` as the Mac app does.

| File | What it does | From the Mac app |
|------|--------------|------------------|
| `src/main.js` | windows, IPC between pages and the parts below, keys | MainWindowController, AppDelegate |
| `src/preload.js` | `window.webkit.messageHandlers` over IPC, the values the Mac injects into pages | RadarView, Messages, Overlay |
| `src/engine.js` | Claude Code's sessions and transcripts (`%USERPROFILE%\.claude`) into the dashboard's state, and what the other AI tools do from their own records (Codex's logs, Antigravity's databases through `node:sqlite`, Cursor's hook events and transcripts), counted with Claude's; while a Codex runs, its account limits from `codex app-server` | Engine/*.swift |
| `src/ledger.js` | spend.ledger's history: each past day's spend by project and model, read once from the transcripts and kept in `%LOCALAPPDATA%\atalay-terminal\ledger.json` (Claude Code deletes transcripts after 30 days) | Ledger.swift |
| `src/tokenledger.js` | the leaderboard's Tokens view: tokens burned by Claude Code, Codex, Antigravity and Cursor, read from their own records (Cursor's from its hook events) by day, tool, model and effort, kept in `tokens.json` (+ `.seen` hashes) beside the spend ledger and sent to the API a day at a time (`node:sqlite` for Antigravity's older generations) | TokenLedger.swift |
| `src/terminals.js` | shells and Claude in ConPTY, one per chat or terminal (a window, a tab or a split pane), in the session host | ChatTerminal, Detached |
| `src/host.cs`, `src/sessionhost.js` | the session host, which keeps them running without the app, and the app's line to it | Detached (screen) |
| `src/mcp.js`, `src/mcpbridge.cs`, `src/mcpshared.js` | Settings › Claude, the local MCP server: Claude Desktop and Claude Code on this PC list and read the AI sessions in the app's terminals and, if allowed, type a prompt into one. `mcpbridge.cs`, compiled like the session host into `%LOCALAPPDATA%\atalay-terminal-mcp`, is both the bridge Claude runs (`orbiterm-mcp.exe`, `orbiterm-mcp-notes.exe`, `-s` for staging) and the owner-only named pipe's server the app starts; the token and `audit.log` are in `%APPDATA%\Atalay's Terminal\mcp` | Mcp.swift, Support.swift redactMore, LastReply |
| `src/git.js` | Source Control's requests: the repos, diffs, history, commit, push | Git.swift |
| `src/gitship.js` | a linked worktree's git side: what a folder is (from its `.git` file), the worktree's status (branch, base, counts, upstream), its pull request through GitHub CLI when it's there and signed in, the sheets' data, and Create PR (commit, push, then gh or the host's form in the browser), Merge (locally, or the PR on GitHub) and Delete (the folder to the Recycle Bin, git's record, the branch) | GitShip.swift, Worktrees.swift |
| `src/worktreeship.js` | a worktree's next step: its status kept while a window of it or the chats list shows, the header button's face and ▾ menu, the sheets' data (web/worktree-ship.js in the overlay) and what they do, nothing done without a sheet's own button; chats a delete ends keep their windows, ended | WorktreeShip.swift, WorktreeChip.swift |
| `src/cloud.js` | the API: hacker name, heartbeat (XP, the AI tools at work for their badges), friends and messages, the Roadmap, the account (signing out and deleting it keep the token here), the live socket, notifications | Cloud, Social, ClientKey |
| `src/unseal.js` | the messages sealed end to end before it was retired: with the keys this PC still has (the vault file, sealed by Windows), it hands the server each old message's own key, read only | Unseal |
| `src/files.js` | Source Control's editor's files: a text file Ctrl-clicked in a terminal opens there (the path worked out from the shell's folder, a path Claude wrapped joined again), read and written only once opened; anything else in its app, a program only shown in its folder | FileEditor.swift, ChatTerminal |
| `src/power.js` | power save: the map's switch, on by itself below 20% on battery or in Energy Saver (read with the process list) | PowerSaver.swift |
| `src/termfont.js` | the terminals' font family picked in Settings: the monospaced families of this PC (one PowerShell call, kept for the session), the pick kept and checked | TerminalFont.swift |
| `src/themes.js` | the themes: every colour token from a palette, into each page; Settings' interface font and text size | Themes.swift |
| `src/aicolors.js` | the AI tools in the theme's colours: Claude Code, Codex and Antigravity on their themes that use the terminal's 16 colours, each one's own given back when it's turned off | AIColors.swift |
| `src/runaways.js` | the process list: what burns a core where nobody sees it (DANGER), what closed terminals left running (amber cars), what runs in the app's terminals (their cars), the AI tools besides Claude running in a terminal (Codex, Gemini…: planets); each process's memory, the PC's, the ports listened on, and Clean Up's stop of a program's tree (by pid and creation time) | Runaways, MainWindowController, RadarEngine, Proc |
| `src/cleanup.js` | Clean Up: the PC's memory (the map's line, the view's picture), the idle chats and heavy programs of the app's terminals and what closed ones left running, ticked on the page and ended only after its summary; the cards' `mem`; its log, `%LOCALAPPDATA%\Orbiterm\Logs\cleanup.log`. No worktrees yet | Cleanup.swift, MemoryWatch.swift |
| `src/savers.js` | the token savers, rtk and caveman, on for Claude Code, Codex and Antigravity (`scripts/fetch-rtk.js` gets rtk for the build) | TokenSavers |
| `src/limits.js` | Claude's 5-hour and weekly limits for the top bar: a script of the app's as Claude Code's status line, a status line of the user's own run through it | Limits |
| `src/cursorhooks.js`, `src/cursorhooks.cs` | Cursor's CLI (cursor-agent): a small program of the app's (compiled at first use, as the session host is) on its hooks in `%USERPROFILE%\.cursor\hooks.json`, beside the user's own, that keeps each conversation's events in `%LOCALAPPDATA%\atalay-terminal\cursor-events` for the engine and the token ledger; only the usual profile installs it | Engine/CursorHooks.swift |
| `src/cursorusage.js` | Cursor's monthly usage limit for the top bar, asked of Cursor's server with the CLI's own token from `%APPDATA%\Cursor\auth.json` (read for the request, never kept) | Engine/CursorUsage.swift |
| `src/overlay.js` | the Ring's and the folder picker's folders (overlay.html) | Overlay.swift |
| `src/chatlist.js`, `pages/chats.*` | the chats list beside the dashboard (a view of its own in the dashboard window): every saved chat by project, each folder a card with the app's terminals in it, folders opened from the list, favourites, the archive (Settings lists it) | Sidebar.swift |
| `src/notewindow.js` | a note out of the dashboard in a window of its own (web/note.html): above the dashboard, or pinned above every app; its place and pin kept, the notes left out at the last quit reopened; the dashboard's page stays the notes' one writer | NoteWindow.swift |
| `src/notesstore.js` | the notes on this PC, encrypted (AES-256-GCM, the key sealed by Windows): a file for each note, a shared note's Yjs document beside it (`<id>.ydoc`), the files the notes hold (`files\<sha256>`), a copy of the folder before the notes become v4 (`Notes backups`) | NotesStore.swift, Attachments.swift (the files folder) |
| `src/notessync.js` | the shared notes' side of the notes bridges: a note's socket ticket (the page opens the socket), its document file, the secrets check before a share, the file messages | NotesStore.swift (NotesSync) |
| `src/attachments.js` | files in notes: added (20 MB, no programs), read, saved to Downloads with the mark of the web; a shared note's uploaded to the storage address the API signs and downloaded as the API streams it, checked by size and SHA-256 | Attachments.swift |
| `src/notesprojects.js` | the notes' projects: a folder's project (a repo's main folder, worktrees included; no git process), broad folders, the board's "move to project" list | NotesTools.swift (NotesProjects), Git.swift (projectDir, broad, covers) |
| `src/notestools.js`, `src/notesai.js` | the notes as AI tools on the local MCP server (list, read, add, edit, rewrite, create, pin, show; an AI's own project first) and Settings' switch that lets the AIs have them | NotesTools.swift, NotesAI.swift |
| `src/feedpanel.js` | the community feed's lines (web/feed.html) in a see-through, click-through window at the top left of the screen | FeedPanel.swift |
| `src/shortcuts.js` | Settings › Shortcuts: the menu's keys as the user set them (`settings.json` `shortcuts`), recording new ones, the Ring's middle click (with Ctrl, alone or off) and its keys, Esc and the close keys swapped, the tab and pane keys a terminal window takes only when it has tabs or a split | Shortcuts.swift, EscClose.swift |
| `src/envfiles.js`, `src/envbridge.js`, `pages/env.*` | the strip's env button (Ctrl+Shift+E): the .env, .env.*, *.env and .envrc files under the terminal's folder (4 folders down, 100 files, hidden and heavy folders skipped), a list, then one file's lines with the values masked until opened; Copy all, Save (a copy renamed over it, CRLF/LF, BOM and untouched lines kept), the file changing on disk; every read and write checks the path again (inside the folder, no link out, an env name, at most 1 MB) | EnvFiles.swift, EnvView.swift |
| `src/sharecard.js` | the share card's picture to the clipboard or Downloads, shown in Explorer, and its badges and avatars fetched for it (an allow-list, every redirect checked) | Cloud.swift (CloudBridge share part) |
| `pages/terminal.*` | a chat or terminal (a window's tab or pane): xterm.js and its header, which is also its pane's title bar in a split (the model and effort, the cost, the tool at work, the subagents running, what it waits for; dimmed without the keys, renamed with a double click, a right click to move it to a tab or a window), its right-click menu (Copy, Paste, Select All, Find, Clear), Find, a dropped file's path, Copy Claude's last reply, pinned above every app, End's "End this chat?" | ChatWindow, ChatTerminal |
| `src/panes.js`, `pages/tabs.*` | a terminal window's tabs and split panes: each tab a tree of panes, each pane a terminal's own view (`WebContentsView`) that moves between tabs, splits and windows with its session running on; the tab bar (chips with the number, the busy / needs-you dot, the name, the context, ×; rename in place, a right-click menu, » when they don't fit) and the dividers, the window's own page under the views; the layouts kept in `settings.json` (`terminalLayout`, `tabNames`) for the sessions the host brings back | ChatWindow (tabs), Panes.swift, MainWindowController (merge, move) |

### The session host

Windows has no `screen`, so the app brings its own: `src/host.cs`, compiled at first use by the C# compiler that comes
with Windows (.NET Framework's `csc.exe`) into `%LOCALAPPDATA%\atalay-terminal-host`. Every chat and terminal runs in a
pseudo console it holds, so the app can quit, update or crash and Claude keeps working; at the next launch the windows
attach again (hidden, as on the Mac: a click on the dashboard opens one; in the tabs and splits they were in), starting from the end of the output the host
kept. What's typed into a session waits in a queue of its own, written by a thread of its own, so a big paste into one
never holds up the others' typing, resizing or End. It runs outside the app's folder because an update's installer ends everything that runs from there; it ends by
itself once its last session has and no app is connected, and uninstalling ends it (`build/installer.nsh`). The
installed app and a development run (`npm start`) each have their own. Without it (it couldn't be built or started) the
chats run in the app, through node-pty, and end with it.

## Not like the Mac app (yet)

- Closing the dashboard keeps the app going while a chat or terminal runs (starting the app again brings it back, as
  the Dock does on the Mac); with none, it quits.
- Tabs and split panes as on the Mac (File > New Tab, Split Vertically / Horizontally; the Window menu's tab and pane
  items, Move Tab to New Window, Merge All Windows), but a tab or pane is moved with the menus only: no dragging a tab
  out of the bar or onto another window. Ctrl+W closes the tab or pane with the keys (it keeps running, in a window of
  its own out of sight, and Undo Close puts it back), or with only one the window; Ctrl+Shift+W the whole window; its
  × hides it too. What runs goes on as a planet or car on the orbit, as ⌘W and ⇧⌘W do on the Mac; a click opens it
  again, in its tab. Its End button (or Window > End This Terminal), or a chip's ×, ends it.
- The Mac's tab and pane keys with ⌘ as Ctrl and ⌥ as Alt (Settings › Shortcuts lists them), but where a shell needs
  the Ctrl key: ⌘D (Split Vertically) is Ctrl+Shift+D and ⇧⌘D Ctrl+Alt+Shift+D, as Ctrl+D is the end of input; ⌘T
  (New Tab) is Windows Terminal's Ctrl+Shift+T, as Ctrl+T is Claude Code's (its task list) and Codex's (its
  transcript), so ⇧⌘T (Undo Close) is Ctrl+Alt+Shift+T and ⌥⌘T (New Tab Next to Current Tab) Ctrl+Alt+Shift+N (Ctrl+Alt
  and a letter alone is AltGr on many keyboards: AltGr+T is ₺ on a Turkish one); ⌃⌘ and an
  arrow (a divider) is Ctrl+Alt+Shift and the arrow. The keys between tabs (Ctrl+Shift+] and [, Ctrl+1 to 9,
  Windows' Ctrl+Tab too) act only in a window with two tabs or more, and the pane keys (Ctrl+] and [, Ctrl+Alt and an
  arrow, Ctrl+Shift+Enter to maximize) only in a split tab: elsewhere they go to the shell as before (Ctrl+[ is its Esc).
- No four-finger click (Mac trackpads only): Ctrl and the middle mouse button (or Ctrl+K) open the Ring,
  Ctrl+N a new file in Source Control's editor, Ctrl+Shift+N a new terminal, Ctrl+Shift+T a new tab, Ctrl+W and Ctrl+Shift+W
  close the tab or the window, in the terminal windows too (where they'd otherwise go to the shell); Ctrl++ and Ctrl+- there are the terminals' text size,
  as ⌘+ and ⌘− on the Mac. While Antigravity runs in one, its Ctrl+K is Antigravity's, which approves its subagents'
  steps with it.
  Ctrl+B (⌘B) opens and closes the chats list in the dashboard window only: in a terminal it stays the shell's (and
  Claude's, which runs a command in the background with it).
- No iTerm2: a chat started in another terminal shows on the dashboard and can be opened as a copy.
- No New Worktree… or Open in a Worktree… yet: a worktree made by `claude -w` or `git worktree add` gets the header's
  Create PR / Merge / Delete worktree button and the chats list's items all the same. The worktree items are in the File
  menu (there's no Chat menu), and Delete sends the folder to the Recycle Bin.
- Updates come from the releases repo's `windows` release (above), not from the API's offer, which is the Mac app's.
- No What's New after an update (`web/whatsnew.js` leaves Windows out).
- The folder picker's favourites are a fixed list (home, Desktop, Documents, Downloads…), not Explorer's Quick Access.
