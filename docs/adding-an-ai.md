# Adding an AI

Everything a Claude Code session gets in Orbiterm, as a checklist, so a new AI CLI (Cursor, Gemini CLI, OpenCode…) gets
all of it and nothing is forgotten. Each item says what the user sees, where it lives on the Mac and on Windows, what the
CLI has to give us, how Claude Code, Codex and Antigravity (agy) give it today, and how to check it by hand. The
[status matrix](#status-matrix) shows where each AI stands, Cursor included; the [order of work](#order-of-work) is at
the end.

Where things are:

- **Mac**: `mac/Sources/AtalayTerminal/`, written here without that prefix (`Engine/…` is the engine).
- **`web/`** is `mac/Resources/web/`, the dashboard's pages. The Windows app loads them as they are
  (`windows/src/main.js:114`): a change there is a change on both.
- **`orbit/`** is `mac/orbit/`, the orbit map, built into `web/orbit.js` with `cd mac/orbit && npm run build`.
- **Windows**: `windows/src/`, written here without that prefix; `pages/` is `windows/pages/` (its own chats list and
  chat window).
- Line numbers are from `develop` on 21 Nov 2026. When one has moved, search for the name in brackets.

## How an AI becomes a session

1. **A process becomes a session.** Claude Code writes its own registry, `~/.claude/sessions/<pid>.json`. Any other AI is
   found by its program's name in a table (`Engine/Support.swift:415` `Proc.otherAIs`; Windows `runaways.js:42`
   `AI_TOOLS`) and becomes an `OtherAI` (`Engine/Model.swift:67`) with the id `ai:<pid>:<start>`.
2. **Its own records fill it in**: hooks, logs, databases, read by a reader written for that AI (`readCodexLog`,
   `readAntigravity` in `Engine/RadarEngine.swift`, the same names in `engine.js`). An AI without a reader is a planet
   that knows only its CPU and its folder: Gemini, OpenCode and the rest today. Cursor has its own reader, from its hooks (see
   [Cursor](#cursor-cursor-agent)).
3. **`snapshot()`** (`Engine/RadarEngine.swift:2320`, `engine.js:4037`) turns the sessions into the page's JSON (orbit,
   panels, top bar) and into `SessionBrief`s (`Engine/Model.swift:218`) for the native side: chat windows, Dock, chats
   list, MCP, Discord.

Most of the work for a new AI is step 2. What comes after already works for any `OtherAI` whose fields are set:

| The reader sets on `OtherAI` | What it drives |
|---|---|
| `turnOpen`, `turnStart` (nil: no records) | working or your turn; nil falls back to the CPU (item 3) |
| `waitsForUser`, `call`, `agentWaiting` | needs you, and what for |
| `title`, `prompt` | planet label, chat window title, chats list, notices |
| `model`, `effort`, `ctx`, `ctxMax` | chat window header, card, the `ctx 80%+` flag |
| calls through `otherTool`, `otherResult`, `otherText`, `otherTokens` | bolts on the map, ticker, log, files, research, shells, tokens, tools · web · err |
| `agents` | Workers panel, purple satellites, ⤷N |
| `convId` | the live chat's row in the chats list, resume |
| `log` | MCP's last reply (`McpEngine.logPath`) |

Two rules every reader so far keeps: read the CLI's files and databases read-only, and change its settings only through
its own commands (`<cli> mcp add`) or a hooks file it documents, next to the user's own entries, never over them.

## The checklist

### On the map

**1. Recognised as a session**
- **Sees:** a planet a few seconds after the CLI starts, in Orbiterm's terminal or any other; it blows up when the CLI
  quits.
- **Mac:** `Engine/Support.swift:415` (`Proc.otherAIs`), `:424` (`otherAI`: the program's name, or the script Node, Bun
  or Python runs); `Engine/RadarEngine.swift:1161` (`pollOthers`, every 3 s). Claude: `:1055` (`pollRegistry`).
- **Win:** `runaways.js:42` (`AI_TOOLS`), `:47` (`AI_PACKAGES`, npm packages run by node), `:50` (`aiTool`), `:501`
  (`ais`: only processes with a terminal among their parents) → `engine.js:3146` (`setOthers`). Claude: `engine.js:2978`.
- **Needs:** a program (or script) name that is fixed and only its own; on the Mac it runs as the user, on a tty.
- **Today:** Claude: its registry file (pid, session id, folder, status, name). Codex: the program `codex` (its npm
  launcher's child is the same session). agy: the program `agy` (its `-p`, `/usage` runs are skipped).
- **Check:** start it in an Orbiterm terminal and in another terminal app: a planet for each. Quit it: the planet blows up.

**2. A planet that orbits while it works**
- **Sees:** a hexagon in the session's colour circles the core while it works (three dots run round its ring), with the
  chat's title under it; it parks at the edge of the view when it's your turn or it needs you (rings pulse out of it).
- **Shared:** `orbit/index.js:341` (`homeKindOf`: only `busy` orbits, `idle` and `waiting` park), `:352` (`Session`),
  `:1524` (`drawStatusFx`), `:1876` (`onStatus`, ripples on a change).
- **Needs:** nothing of its own, only a right status (item 3). A planet that never orbits is a status that never says
  `busy`.
- **Check:** send a prompt that takes a minute: the planet leaves the edge, orbits the whole turn, parks when the answer
  is done.

**3. Status: working, needs you, your turn, ended**
- **Sees:** WORKING, NEEDS YOU, YOUR TURN: the planet's colour, the card, the chat window's pill and its clock, the chats
  list.
- **Mac:** `Engine/RadarEngine.swift:2283` (`statusOf`, Claude), `:1280` (`otherStatus`); the CPU fallback at `:1209`
  (1 % CPU or more in the last 10 s) and `:1263` (`runningCommand`, a shell it runs).
- **Win:** `engine.js:3990` (`statusOf`), `:3247` (`otherStatus`), the CPU fallback at `:3179`.
- **Needs:** **when a turn starts and when it ends** (a hook, or a line in a log or a database), and when it waits for
  the user. Without them the CPU is all there is, and a TUI waiting on its model uses less than 1 %: the planet parks in
  the middle of a turn and never says it needs you.
- **Today:** Claude: its registry's `status` (busy, idle, waiting, shell). Codex: its log's `task_started`,
  `task_complete`, `turn_aborted`. agy: the status in `conversation_summaries.db`, its steps database and its CLI log,
  and background work after a turn (`agyPendingWork`).
- **Check:** a long turn stays WORKING all the way, while the model thinks too; YOUR TURN a second or two after the
  answer; Ctrl+C in the middle of a turn: YOUR TURN.

**4. Subagents: the Workers panel and purple satellites**
- **Sees:** each subagent is a small violet hexagon orbiting its session (dim and still when parked, gone with a spark
  when done, right-click › Dismiss), a row in the Workers panel (what it does, its tool, its time), ⤷N in the chat
  window's header. A session waiting on background subagents stays WORKING.
- **Mac:** `Engine/RadarEngine.swift:2299` (`agentView`: running while a call is open or it wrote in the last 3 min,
  parked until 30 min of quiet, gone once ended), `:1901` (`readAntigravityAgents`); `web/app.js:1652` (`renderWorkers`);
  `orbit/index.js:450` (`syncDrones`), `:618` (`Drone`), `:1708` (Dismiss).
- **Win:** `engine.js:4020` (`agentView`), `:3762` (`readAntigravityAgents`); the panel and the map are the shared ones.
- **Needs:** for each subagent an id, its parent session, a description or type, its start, its calls and **an end
  signal**; one waiting for a permission makes its session wait (`agentWaiting`).
- **Today:** Claude: `<session>/subagents/agent-*.jsonl` and their `.meta.json` (description, type, `finished`), ended by
  SubagentHandback, a task-notification or an interrupt (`noteEnds`, `:738`). agy: its child conversations
  (`parent_conversation_id` in `conversation_summaries.db`) and their transcripts. Codex: none read.
- **Check:** ask for two subagents in parallel: two satellites and two Workers rows; each leaves the map when it's done;
  the session stays WORKING until both are.

**5. Its work on the map and in the panels**
- **Sees:** a bolt from the planet to a tool station for every call; the ticker, the log (prompts and replies too), the
  tool mix, Files (⚠ when two chats write one file), Research, Shells; the card's tools · web · err and sparkline.
- **Mac:** `Engine/RadarEngine.swift:1333` (`otherTool`), `:1369` (`otherResult`), `:1409` (`otherText`); a tool's name to
  its category in `codexCall` (`:2178`) and `agyTool` (`:2132`), the categories in `Engine/Support.swift:102` (`CATS`);
  `orbit/index.js:1382` (`wireHit`).
- **Win:** `engine.js:3314` (`otherTool`), `:347` (`codexCall`), `:691` (`agyTool`).
- **Needs:** each tool call with an id, its name, its input (the command, the file, the URL) and its result (done or
  failed); the prompt's and the reply's text.
- **Today:** Claude: its transcript (`tool_use`, `tool_result`). Codex: its log's `*_call`, `*_call_output`,
  `web_search_call`. agy: its transcript and steps database.
- **Check:** ask it to read a file, edit it, run a command and search the web: four bolts; the file in Files, the
  command in Shells, the search in Research.

### Needs you

**6. Needs-you alerts**
- **Sees:** the planet parks and pulses; a number on the Dock icon (the taskbar button on Windows); a notice in the
  screen's corner while Orbiterm isn't in front; a sound; the mascot reacts.
- **Mac:** `MainWindowController.swift:519` (Dock badge, `requestUserAttention`), `WaitNotifier.swift:25` (corner
  notice), `Mascot.swift:895`. **Shared:** `web/app.js:790` (`transitions` → `ping('waiting')`), `web/hooks.js`
  (`data-waiting` for themes).
- **Win:** `main.js:1326` (`badge`), `:2118` (`updateWaits`), `:2159` (`waitNotice`). No toast and no taskbar flash yet.
- **Needs:** the `waiting` status (item 3) and a few words on what for (`waitingFor`: "approval: npm test").
- **Today:** Claude: its registry's `waitingFor`. Codex: "approval: <command>" from its hook (item 7). agy: the step or
  confirmation its log shows.
- **Check:** with Orbiterm behind another app, make it ask to run a command: Dock number, corner notice naming the
  command, sound. Answer it: all three go.

**7. Knowing it asks (hooks Orbiterm installs)**
- **Sees:** nothing by itself; it is what makes item 6 exact.
- **Mac:** `Engine/CodexHooks.swift:39` (`install`: a script on Codex's `PermissionRequest`, dropped again by
  `PostToolUse`, `Stop`, `Interrupt`, `UserPromptSubmit`), `Engine/RadarEngine.swift:1703` (`readAgyConfirmations`).
- **Win:** `codexhooks.js:48` (`EVENTS`), `:108` (`install`); `engine.js:3580`.
- **Needs:** a hook that runs **before** the CLI asks the user, with its session id and the command, and hooks that tell
  the question was answered; else a log line for each. Our hook decides nothing: the CLI asks as usual.
- **Today:** Claude: nothing needed (its registry says `waiting`). Codex: `~/.codex/hooks.json` (the user trusts it once
  in Codex's `/hooks`). agy: "Surfacing tool confirmation" and `ask_question` in its CLI log, a step WAITING.
- **Check:** as in item 6, then approve once and deny once: NEEDS YOU goes within a second both times.

### What a session shows

**8. Name, title, last prompt**
- **Sees:** the planet's label, the card, the chat window's title row, the chats list's row, the corner notice.
- **Mac:** `snapshot` (`Engine/RadarEngine.swift:2320`): Claude's `name`, `title`, `lastPrompt`; another AI's `title`,
  else its folder, and `prompt`.
- **Win:** `engine.js:4037`, the card at `:4109`.
- **Needs:** the chat's title, if the CLI makes one, and the user's last prompt.
- **Today:** Claude: its transcript's `ai-title` and `last-prompt`, its registry's `name`. Codex: the prompt from its log;
  no title while it runs (the folder shows; the chats list has its title). agy: the title in
  `conversation_summaries.db`, the prompt from USER_INPUT.
- **Check:** after the first prompt the planet's label is the chat's title (or the prompt), not the folder.

**9. Model, effort, context**
- **Sees:** "opus 5.5 · high" and the context bar (120k / 1M) in the chat window's header and on the card; `ctx 80%+`.
- **Mac:** `ChatWindow.swift:212` (`HUDRow`); `Engine/Support.swift:33` (`contextLimit`: Claude's window by model, less
  with /autocompact).
- **Win:** `engine.js:2510` (Claude), `:3897` (Codex), `:3414` (`readAgyModel`); `pages/terminal.js:233` (context bar).
- **Needs:** the model's id, the reasoning effort, the context the last request used and the window's size.
- **Today:** Claude: its transcript's model, effort and usage; the window from `PRICES`. Codex: `thread_settings_applied`
  or `turn_context` (model), `token_count` (`last_token_usage`, `model_context_window`); no effort. agy: model and effort
  from its CLI log, tokens from its transcript (on Windows its window is a guess: 1M for Gemini, else 200k).
- **Check:** the header shows the model picked; change it in the chat: the header follows; the bar grows with the chat.

**10. Tokens and spend**
- **Sees:** the top bar's tokens today; the spend panel's rows by AI and model, with $ for Claude only ("no price" for
  the others).
- **Mac:** `Engine/RadarEngine.swift:1392` (`otherTokens`: an unpriced row per tool and model), `Engine/Support.swift:12`
  (`PRICES`), `Engine/Ledger.swift` (spend history, Claude), `web/app.js:1742` (`AI_ORDER`).
- **Win:** `engine.js:3374` (`otherTokens`), `ledger.js`.
- **Needs:** each reply's input, output and cache tokens with its model, and a key so a reply read twice counts once.
- **Today:** Claude: its transcript's usage, priced. Codex: `token_count`. agy: its transcript's usage.
- **Check:** the spend panel's today has a row for the AI and its model, growing with each reply.

**11. The chat window's header**
- **Sees:** the status pill and its clock, ⚠ NEEDS YOU · what for, the context bar, model · effort, cost, tools · web ·
  err, ⤷N subagents, ▸ the call running now and for how long, a sparkline, Copy last reply (⇧⌘C), "starting codex…"
  before the session shows up; with tabs, each tab's chip has its own context and counts.
- **Mac:** `ChatWindow.swift:212` (`HUDRow`), `:437` (NEEDS YOU), `:792` (`aiName`), `Panes.swift:363` (`TabStats`),
  `LastReply.swift` (Claude's transcript only).
- **Win:** `pages/terminal.js:233` (`term:info`): title, status, folder, context bar, tools · web · err. No model, cost,
  call, sparkline or copy yet, for any AI.
- **Needs:** items 3, 5, 8 and 9; for Copy last reply, the reply's text on disk.
- **Today:** Claude: all of it. Codex and agy: all but cost and Copy last reply.
- **Check:** open it from the chats list and watch the header through one turn.

### Top bar, XP and the leaderboard

**12. Usage limits in the top bar**
- **Sees:** a column per AI: what's left of its 5-hour and weekly windows, a bar each, and when it fills again; the same
  whichever chat is in front.
- **Mac:** `Engine/RadarEngine.swift:2575` (`limitsByAI`), `Engine/Limits.swift` (Claude), `Engine/CodexUsage.swift`,
  `Engine/AgyUsage.swift`; `web/app.js:1228` (`renderLimits`).
- **Win:** `limits.js` (Claude), `engine.js:1784` (`refreshCodexUsage`), `:1863` (`refreshAgyUsage`), `:4204`.
- **Needs:** a way to read the account's % used and reset time per window, without a turn and without touching its
  credentials: a status line hook, a local server, or a `-p /usage`-like command with JSON out.
- **Today:** Claude: its status line (`statusLine` in `~/.claude/settings.json` runs our script, which keeps
  `rate_limits`; the user's own status line still runs through it). Codex: `codex app-server`'s
  `account/rateLimits/read`, only while a Codex runs. agy: `agy -p /usage --output-format json --log-file /dev/null`,
  never during a turn. The last reading is kept on disk (`Limits.save`) and shows for a week.
- **Check:** a column within a minute of starting the CLI; the numbers match the CLI's own usage screen.

**13. Tokens on the leaderboard**
- **Sees:** the leaderboard's Tokens view and its AI filter (All AIs, Claude, Codex, Antigravity).
- **Mac:** `Engine/TokenLedger.swift` (every reply of the three, from disk) → `Cloud.sendUsage` (`Cloud.swift:300`);
  `web/cloud.js:1634` (`AI_NAMES`), `:1978` (the filter). orbiterm-api's usage must accept the new tool.
- **Win:** `tokenledger.js:34` (`TOOLS`).
- **Needs:** every past reply's tokens on disk, with model, time and an id that doesn't change.
- **Today:** Claude `~/.claude/projects`, Codex `~/.codex/sessions` and `archived_sessions`, agy
  `~/.gemini/antigravity-cli/brain`.
- **Check:** after a few replies the day's tokens show under the AI's filter.

**14. XP, flames and time per AI**
- **Sees:** XP and flames while any session works; on the profile, the time per AI and the per-AI hour badges.
- **Mac:** `MainWindowController.swift:97` (any busy session → `Activity.work()`), `Activity.swift:23` (`toolAtWork`:
  only claude, codex, gemini, antigravity), `Vendor.swift:11` (each maker's signing team), `Cloud.swift:242` (the
  heartbeat's `tools`); `web/profile-stats.js:33`, `web/profile.js:370`, `web/inbox.js:131`, `web/badge-art.js:39`,
  `web/leaderboard.css:22`. orbiterm-api's badges must know the key too.
- **Win:** `main.js:385` (`isActive`), `:421` (`noteToolsAtWork`), `vendor.js`.
- **Needs:** item 3 right (XP follows WORKING); the program's signing team, if it has one.
- **Today:** Claude, Codex, agy and Gemini count; the first three only when the program carries its maker's signature.
- **Check:** work only with it for ten minutes: XP grows, and the profile's time per AI shows it.

### The chats list

**15. Saved chats in the list**
- **Sees:** its past chats in the chats list under their folders, with a tag (`codex`, `agy`), title and time; their
  folders among the folder picker's recent ones.
- **Mac:** `Engine/RadarEngine.swift:2675` (`scanHistory`), `:2714` (`scanAgyHistory`), `:2807` (`scanCodexHistory`);
  `Engine/Model.swift:276` (`ChatItem.tool`); `Sidebar.swift:1135` (the tag).
- **Win:** `engine.js:2093`, `:2158`, `:2258`; `pages/chats.js:84` (the tag).
- **Needs:** its saved chats: id, folder, title or first prompt, last change.
- **Today:** Claude: `~/.claude/projects/*/<id>.jsonl`. Codex: the threads in its `state_N.sqlite`. agy:
  `conversation_summaries.db`.
- **Check:** a chat made in another terminal app shows in the list within two minutes, under its folder, with its tag.

**16. Opening and resuming a chat**
- **Sees:** a click on a saved chat opens it in a window, resumed; a click on a running one brings its window (or its
  terminal app) forward; a running chat is one row, not two.
- **Mac:** `MainWindowController.swift:945` (`openSession`: `claude --resume <id>` and `--fork-session`,
  `codex resume <id>`, `agy --conversation <id>`), `ChatWindow.swift:788` (resume flags), `Sidebar.swift:379`
  (`brief(for:)`, by session id or `convId`).
- **Win:** `main.js:1747` (`openSession`), `chatlist.js:102`.
- **Needs:** a command that resumes a chat by its id; the running session's chat id (`convId`), so its live row and its
  saved one are the same.
- **Today:** Claude: resume and fork. Codex, agy: resume.
- **Check:** quit the CLI, click its chat: it comes back with its history. A running one isn't listed twice.

**17. Deleting chats**
- **Sees:** Delete in the chats list; 30 days in Settings › deleted chats, back with a click; then gone from the CLI too.
- **Mac:** `ChatTrash.swift:294` (`erase`), `Sidebar.swift:169` (`canDelete`). **Win:** `chattrash.js`.
- **Needs:** what one chat is on disk (files, rows), or a delete command of the CLI's.
- **Today:** Claude: its transcript. Codex: `codex delete --force <id>`. agy: its rows, files and cache entries.
- **Check:** delete, put back, delete for good: gone from the list and from the CLI's own resume list.

### Starting, ending, quitting

**18. Starting it from Orbiterm**
- **Sees:** the new worktree sheet and Open in a worktree offer Claude, Codex, Antigravity or a terminal; the window says
  "starting codex…" until the session shows.
- **Mac:** `web/worktree.js:12` (`AIS`), `Git.swift:527` (`worktreeAIs`), `MainWindowController.swift:849` (`newChat`),
  `ChatTerminal.swift:415` (`shellArgs`: only `claude`, `codex` and `agy` run as given), `ChatWindow.swift:792`.
- **Win:** no AI picker yet, for any AI: its new chat buttons open a plain terminal (`main.js:1435`).
- **Needs:** a command that starts it in a folder.
- **Check:** new worktree, pick it: its window opens in the worktree and its planet shows.

**19. Its window and pane**
- **Sees:** a click on its planet opens the window or the split pane it runs in; the pane is a session, not a flying car;
  the tab's chip shows its figures.
- **Mac:** `Engine/RadarEngine.swift:2253` (`matchTabs`: up its parents to one of Orbiterm's shells),
  `ChatWindow.swift:1368` (`runsAgent`), `MainWindowController.swift:949` (an `ai:` session opens its pane).
- **Win:** `engine.js:3941` (`matchTabs`).
- **Needs:** nothing more than item 1: any CLI started in Orbiterm is a child of its shell.
- **Check:** split a window, start it in the second pane, click its planet: that pane comes forward.

**20. Ending, quitting, coming back**
- **Sees:** End (on the card or the window) stops it and all it started, its planet blows up; quitting Orbiterm closes
  every terminal, an update's restart keeps them; after a relaunch its window comes back.
- **Mac:** `MainWindowController.swift:442` (`endSession`: SIGTERM to the whole tree), `AppDelegate.swift:87`,
  `Detached.swift:310` (`runningSessions`: Claude comes back as a chat, the others as a terminal whose AI item 1 finds
  again).
- **Win:** `engine.js:1593` (`dismiss`), `main.js:258` (`quitIfIdle`), `sessionhost.js`, `host.cs`.
- **Needs:** that it ends cleanly on SIGTERM and Ctrl+C.
- **Check:** End from the card: the process is gone and leaves nothing running (Runaways stays quiet).

### Integrations

**21. Claude reaching it (MCP)**
- **Sees:** Claude Desktop or Claude Code (Settings › Claude) lists the session, reads its last reply, waits for it, and
  in "watch and type" sends it a prompt.
- **Mac:** `Mcp.swift:409` (`targets`: Claude, Codex and agy only), `:526` (`lastReply`), `:902` (`McpReply`), `:584`
  (`placeholders`: its empty input box), `:624` (is the AI in front), `:649` (`bypassing`: its flags that turn
  approvals off), `:688` (`settingsBypass`: its config files).
- **Win:** `mcp.js:471` (`targets`), `:606` (`lastReply`), `:117` (`BYPASS_FLAGS`).
- **Needs:** its last reply on disk; its input line's prompt mark and placeholder text; every flag, mode and setting
  that turns its approvals off (typing into it is refused then).
- **Today:** the three.
- **Check:** from Claude Desktop, `list_sessions` shows it with the right status; `read_session` returns its last
  reply; started with approvals off, `send_prompt` refuses.

**22. Notes tools**
- **Sees:** with Notes › AI on, the AI reads (and in write mode changes) the user's notes through `orbiterm-notes`.
- **Mac:** `NotesAI.swift:30` (`Tool`: its `mcp add` and `mcp remove`, where it keeps them); `web/notes.js:2474`.
- **Win:** `notesai.js:188` (`addArgs`), `:101`.
- **Needs:** an `mcp add <name> -- <command>` of its own and a config file that says what's added.
- **Today:** `claude mcp add --scope user`, `codex mcp add`, `agy mcp add`.
- **Check:** turn Notes › AI on: its own MCP list has `orbiterm-notes`; ask it for your notes.

**23. Token savers (rtk, caveman)**
- **Sees:** Settings' token savers work for it too: shorter command output (rtk), terse answers (caveman).
- **Mac:** `TokenSavers.swift`; `web/cloud.js:914`. **Win:** `savers.js`.
- **Needs:** a hook before a shell command that can rewrite it (rtk); a place for rules on every session (an
  `AGENTS.md`, a plugin, a session-start hook) for caveman.
- **Today:** Claude: hooks in `settings.json`. Codex: `hooks.json` and `AGENTS.md`. agy: plugins.
- **Check:** turn each off and on: its config changes and comes back as it was.

**24. Colours follow the theme**
- **Sees:** its TUI draws in Orbiterm's theme (Settings › Interface › AI tools use the theme's colours).
- **Mac:** `AIColors.swift`; `web/settings.js:112`. **Win:** `aicolors.js:76`.
- **Needs:** a theme setting of its own that draws in the terminal's 16 colours.
- **Today:** Claude `dark-ansi`, Codex `[tui] theme = "ansi"`, agy `colorScheme: terminal`.
- **Check:** change Orbiterm's theme: its text takes the new colours at once.

**25. Worktrees**
- **Sees:** a ⎇ worktree label on its card in a linked worktree; a note in its window when a second AI starts in the same
  folder, with Open in a worktree.
- **Mac:** `snapshot`'s `wt` (`Worktrees.info`), `WorktreeNudge.swift:47` (`aiOf`: only claude, codex and agy can move),
  `:56` (`others`). **Win:** not yet, for any AI.
- **Needs:** its folder (item 1) and a start command (item 18) to move it.
- **Check:** start it where Claude works: the note shows in the second window.

**26. Run by Claude as a subagent**
- **Sees:** when Claude runs the CLI in a shell (`codex exec …`), a violet satellite on Claude's planet while it works.
- **Mac:** `Engine/Support.swift:123` (`externalAISubAgentTool`: codex, agy, gemini). **Win:** `engine.js:154`.
- **Needs:** its program's name in that list.
- **Check:** ask Claude to run it once with a prompt: a satellite named after it until the command ends.

**27. Its name and picture in the small lists**
- **Sees:** its name kept in streamer mode, its picture on Discord, its tag in the chats list, its colour on the
  leaderboard and the profile.
- **Mac:** `web/app.js:186` and `ChatWindow.swift:142` (names streamer mode keeps), `DiscordPresence.swift:94` (`asset`;
  the pictures are in the Discord application), `Sidebar.swift:391` (a live chat's tool: anything but Codex or agy is
  filed as Claude), `web/profile-stats.js:33`, `web/leaderboard.css:22`, `web/badge-art.js:39`.
- **Win:** `discord.js:36`, `chatlist.js:105`, `pages/chats.js:84`.
- **Check:** streamer mode on: its name stays, its folder is made up.

**28. Source Control**
- **Sees:** the repo it works in is in Source Control with its chip, and the files it wrote carry its mark.
- **Mac:** `Engine/RadarEngine.swift:2657` (`gitSources`: Claude's sessions only), `Git.swift:297` (`repos`).
- **Win:** `engine.js:1602` (`gitSources`: Claude's folders and the folders of files any AI wrote).
- **Needs:** item 5, with the files it writes.
- **Today:** Claude on both. Codex and agy on Windows; on the Mac only when a Claude session or a terminal is in that
  repo too.
- **Check:** let it edit a file in a repo nothing else works in: the repo shows in Source Control.

## Status matrix

✓ works · partial · ✗ missing. The Cursor column is Mac, as built on 22 Nov 2026 (checked ones: "real" = with a real
cursor-agent 2026.11.19 run on a pty and Orbiterm's engine reading it; "code" = written from the docs and the code, not
run). Windows has none of Cursor yet: see its port list at the end.

| # | Item | Claude | Codex | agy | Cursor (Mac) |
|---|---|---|---|---|---|
| 1 | Recognised | ✓ registry | ✓ process | ✓ process | ✓ real: `node …/cursor-agent/versions/<v>/index.js`; `-p`, `status`, `ls`, `mcp`, `worker-server` skipped |
| 2 | Orbits while working | ✓ | ✓ | ✓ | ✓ real: turn open from `beforeSubmitPrompt` to `stop` |
| 3 | Status | ✓ | ✓ | ✓ | ✓ real: working, needs you, your turn, Ctrl+C = your turn |
| 4 | Subagents | ✓ | ✗ none read | ✓ | ✓ real: each Task call (two in parallel) is a satellite and a Workers row, with its own tool count; ended on its result |
| 5 | Its work on the map | ✓ | ✓ | ✓ | ✓ real, every kind (checked one by one in `araştırma/cursor-parite/LISTE.md`): web search and fetch (from its transcript: no hook fires for them), read, edit (its Read + Write under one call id is one edit), Grep/Glob, shell, MCP (`server.tool`), Task; prompts and replies in the log. No web results (hosts, result count) and no per-call model |
| 6 | Needs-you alerts | ✓ | ✓ | ✓ | ✓ real (follows 3 and 7) |
| 7 | Knowing it asks | ✓ registry | ✓ hooks | ✓ log | partial, real: no hook says "asking"; a shell or write call out 4 s with no shell below it is taken as asking (20 s for web, MCP, browser) |
| 8 | Name, title, prompt | ✓ | partial | ✓ | ✓ real: title from the chat's `meta.json` (comes after the first turn), prompt from `beforeSubmitPrompt` |
| 9 | Model, effort, context | ✓ | partial | ✓ | partial, real: model is always "default" in hooks (shown "auto"); context only at `preCompact` (`context_tokens`, window size: code); the turn's `input_tokens` is a sum over its model calls, not the context; no effort |
| 10 | Tokens and spend | ✓ priced | partial | partial | ✓ real: unpriced row "Cursor / auto" from `stop` (input less cache reads, output, cache reads) |
| 11 | Chat window header | ✓ | partial | partial | partial: status, title, tools, subagents, running call, tokens; no cost, no copy |
| 12 | Usage limits | ✓ status line | ✓ app-server | ✓ `-p /usage` | ✓ real: `Engine/CursorUsage.swift` asks Cursor's server (`DashboardService/GetCurrentPeriodUsage`, `GetPlanInfo`) with the token `/usr/bin/security` prints; a monthly % in the "week" cell (words "monthly", reset as a date), every 5 min with a Cursor running, 30 min without; no login or 401/403 = no column |
| 13 | Tokens on the leaderboard | ✓ | ✓ | ✓ | ✓ real (TokenLedger run on the real hook events; its day key was 1970 until 22 Nov): `TokenLedger` reads the `stop` events from when hooks went in (Cursor keeps no counts on disk); API `cursor` tool, migration 046 |
| 14 | XP, time per AI | ✓ | ✓ | ✓ | ✓ code: `toolAtWork` "cursor", heartbeat `tools`, API badge counter `tool:cursor`, Cursor badge and Polyglot; Vendor check = its own folder |
| 15 | Saved chats in the list | ✓ | ✓ | ✓ | ✓ real files, code list: `~/.cursor/chats/<md5 of folder>/<id>/meta.json`, tag `cursor` |
| 16 | Resume | ✓ and fork | ✓ | ✓ | ✓ code: `cursor-agent --resume <id>` (live row = same id as the session's `convId`, real) |
| 17 | Delete | ✓ | ✓ | ✓ | ✓ code: no CLI command; its chat folder and transcript folder are deleted after the 30 days |
| 18 | Start from Orbiterm | ✓ Mac | ✓ Mac | ✓ Mac | ✓ code: picker entry, `cursor-agent` in the folder |
| 19 | Window and pane | ✓ | ✓ | ✓ | ✓ code (it is a child of the window's shell, as any CLI) |
| 20 | End, quit, come back | ✓ | ✓ | ✓ | ✓ code once recognised (SIGTERM to the tree); the TUI leaves a `worker-server` process behind, no tty, ignored |
| 21 | Claude reaching it (MCP) | ✓ | ✓ | ✓ | ✓ code: target, last reply from `afterAgentResponse`, `→` prompt mark and its two placeholders, bypass: `-f`, `--force`, `--yolo`, `--auto-review`, `--approve-mcps`, `approvalMode`, `permissions.allow`, "Run Everything" footer |
| 22 | Notes tools | ✓ | ✓ | ✓ | ✓ code: `mcp.json` written directly (`mcpServers.<name>.command`), the user's servers kept; `agent mcp` has no add |
| 23 | Token savers | ✓ | ✓ | ✓ | partial, real: Cursor runs Claude's hooks from `~/.claude/settings.json`, so rtk already rewrote its shell command (`cat` became `rtk read`); caveman untested |
| 24 | Theme colours | ✓ | ✓ | ✓ | ✗ no theme setting found in its CLI or package |
| 25 | Worktrees | ✓ Mac | ✓ Mac | ✓ Mac | ✓ code: label, picker, "open in a worktree" (`aiOf` "cursor") |
| 26 | Run by Claude | — | ✓ | ✓ | ✓ code: `cursor-agent` in `externalAISubAgentTool` (not `agent`: too common) |
| 27 | Name and picture | ✓ | ✓ | ✓ | partial: streamer mode keeps it, tag, colour (cyan), badge emblem, leaderboard filter; Discord asset "cursor" has to be uploaded to the Discord application |
| 28 | Source Control | ✓ | partial: Windows | partial: Windows | ✓ code: its sessions are members of the repo, its writes (`Write` tool path) carry its chip |

Windows has none of 18 and 25 for any AI, and its chat window header is smaller (item 11).

## Cursor (cursor-agent)

How it works in Orbiterm now (Mac), and what was found with a real cursor-agent 2026.11.19-f005e9d, logged in, free plan:

- **Process.** `agent` and `cursor-agent` are a bash launcher; the TUI is `node …/versions/<v>/index.js` (ps shows
  `~/.local/bin/cursor-agent --disable-sigusr1 …`), its Node is `versions/<v>/node`. `Proc.otherAI` knows it by that
  folder. A second process, `index.js worker-server` (parent 1, no tty), stays after the TUI; it is not a session.
  `-p` runs fire only `sessionStart`, tool and `sessionEnd` hooks, no `beforeSubmitPrompt` or `stop`, so they are skipped.
- **Hooks.** `~/.cursor/hooks.json` (`{"version":1,"hooks":{"<event>":[{"command":…,"timeout":5}]}}`; a project's
  `.cursor/hooks.json` too). The same file also runs the Cursor editor, so `Engine/CursorHooks.swift`'s script does
  nothing when no cursor-agent is above it. It is written like `CodexHooks` (next to the user's own entries, once there
  nothing changes, a hooks.json that is a link is written through), and the script prints nothing: Cursor decides nothing differently.
  Events taken: `sessionStart`, `sessionEnd`, `beforeSubmitPrompt`, `stop`, `preToolUse`, `postToolUse`,
  `postToolUseFailure`, `afterAgentResponse`, `preCompact`, `beforeMCPExecution` (only for its `mcp_server_name`). Each goes as one line (appended under a lock folder: parallel tool calls run the hook at once) to
  `~/Library/Application Support/atalay-terminal/cursor-events/<conversation id>.jsonl`, with the cursor-agent's pid; a
  pointer `pid/<pid>` says which conversation a process is in (updated on prompt, session start, stop). Big payloads are
  cut to their ids.
- **What the TUI fires** (real): `sessionStart`, `beforeSubmitPrompt` (prompt), `preToolUse` / `postToolUse` /
  `postToolUseFailure` (tool name, input, `tool_use_id`, duration, shell output), `afterAgentResponse` and `stop`
  (`status` completed or aborted, `input_tokens` including the cache reads and writes, `output_tokens`, `cache_read_tokens`,
  `cache_write_tokens`), `sessionEnd` only on a clean exit (not on SIGTERM). `model` is always `default` (Auto). It also
  fires `beforeShellExecution` (with the command after rtk's rewrite). **`subagentStart` and `subagentStop` never
  fired**, so subagents are the Task tool's calls. Cursor runs each hook twice when the folder is reached by two paths
  (`/tmp` and `/private/tmp`), so every event is kept by `tool_use_id` / `generation_id`.
- **No hook for web calls, one id for an edit** (real, 22 Nov 2026). `WebSearch` and `WebFetch` fire **no** hook (the model
  reaches them through `GetDynamicTools` / `CallDynamicTool` of the `cursor` namespace): they are read from the chat's
  transcript (`~/.cursor/projects/<folder>/agent-transcripts/<id>/<id>.jsonl`, a subagent's under `subagents/`), one line per call,
  no times, no results (`readCursorTranscripts`); a call ends when the next line or the turn's `stop` comes. Its edit tool
  fires a `Read` and then a `Write` under the **same** `tool_use_id`: one edit (`cursorReadBecameEdit`). A big tool result is
  spilled to `~/.cursor/projects/<folder>/agent-tools/<id>.txt` with a `Write` hook: not the user's file, skipped. A payload cut
  by the script keeps `file_path`, `command` at the top. Its paths come relative (`m.py`): resolved against the folder.
- **Subagents** (real). A Task call (`preToolUse`, input `description`, `prompt`, `subagent_type`, `model`) runs a
  conversation of its own: its `Read`/`Shell` events come as a separate event file, named by its id, with the same
  cursor-agent pid and no session start; the Task's `postToolUse` output names it (`{"agentId":…,"isBackground":false}`).
  Until then its file goes to the oldest Task without one. A background Task ends when its file is quiet for 2 minutes.
- **Approvals** (real). In allowlist mode the TUI asks before a shell command ("Run (once) (y)", `approvalMode` in
  `~/.cursor/cli-config.json`). `preToolUse` fires before the question and `postToolUse` after the answer, nothing in
  between, and the TUI uses 2 to 3 % CPU all the time (so CPU is no sign): a call out for 4 s with no `zsh -c` child
  under the process is taken as asking. Cursor's shell runs as `zsh -c '… read -d … __cursor_command …'`, a long wrapper,
  so the card shows the hook's command instead.
- **Chats** (real). `~/.cursor/chats/<md5 of the real folder path>/<id>/{meta.json,store.db}`; `meta.json` has
  `cwd`, `createdAtMs`, `updatedAtMs`, `hasConversation`, `isSubagent` and, after the first turn, `title`. Transcripts:
  `~/.cursor/projects/<folder with every other character a dash>/agent-transcripts/<id>/<id>.jsonl` (Claude-like
  lines: `role`, `message.content`, a final `{"type":"turn_ended"}`); a subagent's under `…/<id>/subagents/`. The
  CLI's `--resume [chatId]`, `--continue`, `-w`, `--list-models`, `-f`/`--force`/`--yolo`, `--auto-review` are in
  `--help`.
- **Tokens.** Only in hooks (and `-p --output-format stream-json`'s `result.usage`); the counts are per turn, so the
  leaderboard has them from the moment the hooks went in.
- **Limits.** The TUI's `/usage` has no command behind it, so Orbiterm asks the server the TUI asks: POST `https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage` and `GetPlanInfo`, body `{}`, `Authorization: Bearer <token>` (`x-cursor-team-id` from `cli-config.json` `authInfo.activeTeamId` for a team). Shown: `planUsage.totalPercentUsed` (missing = 0; no `planUsage` = no column), reset `billingCycleEnd` (ms as text), plan `planInfo.planName`. Real run on the free plan: 200, 0 %. The token is the CLI's own Keychain item (`security find-generic-password -a cursor-user -s cursor-access-token -w`, run as a child process: no Security.framework call of our own), kept in memory for the request only, never logged or stored; nothing is renewed or written to Cursor's credentials. New weekly-pool plans may need `GetSandUsageStatus` (not tried, the account is Free). Not an official API: it may change without notice.
- **Claude's hooks.** Cursor runs the hooks of `~/.claude/settings.json` (rtk's rewrote a command in the real run).

## Windows port list for Kerem

The web pages and the orbit map are done (tag, filter, colours, picker, badge). In `windows/src`:

- [ ] `runaways.js` `AI_TOOLS` / `AI_PACKAGES`: match `node.exe …\cursor-agent\versions\<v>\index.js` (under `agent.cmd`
  and PowerShell), skip `-p`, `status`, `ls`, `mcp`, `worker-server` (1)
- [ ] `cursorhooks.js` like `codexhooks.js`: write a `.cmd` or PowerShell script (no `ps`, `awk` or `grep` there: find the
  cursor-agent above the hook with the process table) and add the nine events to `%USERPROFILE%\.cursor\hooks.json`;
  same event files and `pid\<pid>` pointers (5, 7, 3)
- [ ] `engine.js`: `readCursorEvents` as in `RadarEngine.readCursorEvents` (turn from `beforeSubmitPrompt` / `stop`, calls
  by `tool_use_id`, Task calls as subagents and their files by `agentId`, the "asking" rule: shell, write 4 s, web, MCP
  20 s with no shell child), called from `setOthers` (`:3146`); `otherStatus` branch; title from
  `%USERPROFILE%\.cursor\chats\<md5>\<id>\meta.json` (2, 3, 4, 5, 8, 9)
- [ ] `engine.js` `otherTokens` from `stop`: new input = `input_tokens` − `cache_read_tokens` (its input holds the cache reads and writes; for the leaderboard
  also − `cache_write_tokens`, writes counted apart), output, cache reads (10)
- [ ] `tokenledger.js` `TOOLS`: a `cursor` reader of the `stop` events (13); `main.js` `noteToolsAtWork` and `vendor.js`
  ("cursor": its folder under `cursor-agent`) (14)
- [ ] `engine.js` `scanHistory`: Cursor's `meta.json` list; `main.js` `openSession` (`cursor-agent --resume <id>`);
  `chattrash.js` (chat folder + transcript folder); `chatlist.js:105`, `pages/chats.js:84` tag `cursor` (15, 16, 17)
- [ ] `mcp.js` `targets`, `lastReply` (`afterAgentResponse`), `BYPASS_FLAGS` (`-f`, `--force`, `--yolo`, `--auto-review`,
  `--approve-mcps`) and `cli-config.json`'s `approvalMode` / `permissions.allow`; prompt mark `→` (21); `notesai.js`:
  write `mcp.json` directly (22); `engine.js` `externalAISubAgentTool` (`cursor-agent`) (26); `discord.js` `asset` (27)
- [ ] `limits`: Cursor's token is `%APPDATA%\Cursor\auth.json` `accessToken` (the CLI writes a file there on Windows); same two POSTs as the Mac's `CursorUsage.swift`, a `refreshCursorUsage` and its pool in `limitsByAI` (`:4204`); token in memory only, 401/403 = no column (12)
- [ ] Not on Windows yet for any AI: AI picker (18), worktrees (25), header (11), toast (6).

## Order of work

On the Mac first, in a staging build, an item's **Check** passed before the next:

1. **Facts.** Install the CLI and use it: its process (`ps -o comm,args`), its folders (`~/.<cli>/`), its hooks, its
   headless JSON. Write them down with doc links, as in the Cursor section.
2. **Recognised** (1): its row in `Proc.otherAIs`, or a match on its script's path in `Proc.otherAI`.
3. **Status** (2, 3, 8, 9): a reader `read<Ai>(O, cwd:)` called from `pollOthers` like `readCodexLog`, and its folder in
   `startWatch` (`Engine/RadarEngine.swift:337`) so changes come at once: `turnOpen`, `turnStart`, `prompt`, `title`,
   `model`, `effort`, `ctx`, `ctxMax`, `convId`, `log`. Its branch in `otherStatus` if it needs one.
4. **Needs you** (6, 7): a hook installer like `Engine/CodexHooks.swift`, or its log; `waitsForUser` and `call`.
5. **Its work** (5, 10): its tool names to `CATS` (like `codexCall`); `otherTool`, `otherResult`, `otherText`,
   `otherTokens` with keys that don't change when a record is read again.
6. **Subagents** (4): `O.agents` with the keys `agentView` gives (`id`, `sid`, `desc`, `type`, `model`, `running`,
   `parked`, `ended`, `firstTs`, `lastTs`, `tools`, `errors`, `web`, `cost`, `tok`, `pending`), and `agentWaiting`.
7. **Limits** (12): `Engine/<Ai>Usage.swift` and its pool in `limitsByAI`; `AI_ORDER` in `web/app.js`.
8. **Chats list** (15, 16, 17): `scan<Ai>History`, a `ChatItem.tool`, its resume in `openSession`, its delete in
   `ChatTrash`, its tag in `Sidebar.swift`, the live-row tool at `Sidebar.swift:391`.
9. **Starting it** (18, 25): `web/worktree.js` `AIS`, `Git.worktreeAIs`, `newChat`, `ChatTerminal.shellArgs`,
   `ChatHUD.aiName`, `WorktreeNudge.aiOf`, the resume flags at `ChatWindow.swift:788`.
10. **Integrations** (21–24, 26): `McpTools.targets`, `lastReply` / `McpReply`, `placeholders`, `bypassing`,
    `settingsBypass`; `NotesAI.Tool`; `TokenSavers`; `AIColors`; `externalAISubAgentTool`.
11. **The small lists** (13, 14, 27): `TokenLedger`, `Activity.toolAtWork`, `Vendor.teams`, streamer mode's names,
    `DiscordPresence.asset` (and its picture in the Discord application), the profile, leaderboard and badge names and
    colours; orbiterm-api's tool keys for usage and badges.
12. **Walk all 28 Checks** once more, then fill its column in the matrix above.

Then Windows, for Kerem: the same items in `windows/src`. The web pages and the orbit map are shared and need nothing. Its
items for Cursor are in the Windows port list above; for the next AI, copy these:

- [ ] `runaways.js` `AI_TOOLS` / `AI_PACKAGES` (Windows runs npm CLIs as `node.exe` under `.cmd` shims) (1)
- [ ] `engine.js`: the reader, called from `setOthers`, and its branch in `otherStatus` (2, 3, 8, 9)
- [ ] a hook installer like `codexhooks.js` (6, 7); a tool mapper, `otherTool`, `otherTokens` (5, 10); subagents (4); limits (12)
- [ ] `scanHistory`, `openSession`, `chattrash.js`, `chatlist.js`, `pages/chats.js` (15, 16, 17)
- [ ] `mcp.js`, `notesai.js`, `savers.js`, `aicolors.js`, `externalAISubAgentTool` (21-24, 26)
- [ ] `tokenledger.js`, `main.js` `noteToolsAtWork`, `vendor.js`, `discord.js` (13, 14, 27)
