'use strict';
// A chat or terminal window (main.js opens it, terminals.js runs its shell): xterm.js on the theme's palette, the way
// VS Code draws its terminal; typing and resizing go to the app, its output comes back. The strip on top shows the
// session's name and status from the dashboard's data.
(() => {
  const css = () => getComputedStyle(document.documentElement);
  const token = (k, d) => css().getPropertyValue(k).trim() || d;
  const palette = () => {
    const a = (i) => token(`--a${i}`, undefined);
    return {
      background: token('--code-bg', '#251200'), foreground: token('--code-fg', '#f5ebe0'), cursor: token('--code-cursor', '#f88008'),
      cursorAccent: token('--caret-text', '#1a0d00'), selectionBackground: token('--selection', '#f88008'), selectionForeground: token('--selection-text', '#1a0d00'),
      black: a(0), red: a(1), green: a(2), yellow: a(3), blue: a(4), magenta: a(5), cyan: a(6), white: a(7),
      brightBlack: a(8), brightRed: a(9), brightGreen: a(10), brightYellow: a(11), brightBlue: a(12), brightMagenta: a(13), brightCyan: a(14), brightWhite: a(15),
    };
  };
  // The cursor: the theme's when it asks for one (--cursor-style block, bar or underline; --cursor-blink 1 or 0), else a
  // blinking block.
  const cursor = () => ({
    cursorStyle: ['block', 'bar', 'underline'].find((s) => s === token('--cursor-style')) || 'block',
    cursorBlink: token('--cursor-blink') !== '0',
  });
  // Electron 45.3's Chromium (156.0.8078.96) turns down a canvas font that starts with a space and goes on drawing in its
  // default 10px sans-serif. xterm.js's WebGL renderer names its glyphs' font that way (" normal 14px …" for all but
  // italic text), so the terminal's text came out small and spaced out in its cells: the font is handed on trimmed.
  for (const Ctx of [window.CanvasRenderingContext2D, window.OffscreenCanvasRenderingContext2D]) {
    const font = Ctx && Object.getOwnPropertyDescriptor(Ctx.prototype, 'font');
    if (!font || !font.set) continue;
    Object.defineProperty(Ctx.prototype, 'font', {
      ...font,
      set(v) {
        font.set.call(this, typeof v === 'string' ? v.trim() : v);
      },
    });
  }
  // The font stack: the family picked in Settings (if any) before the usual fallbacks.
  const stack = (family) => (family ? `"${String(family).replace(/["\\]/g, '')}", ` : '') +
    '"MesloLGS NF", "CaskaydiaCove Nerd Font", "Cascadia Mono", Consolas, monospace';
  const term = new Terminal({
    fontFamily: stack(window.__termFamily),
    fontSize: window.__termFont || 14, lineHeight: 1.1, ...cursor(), scrollback: 10000, allowProposedApi: true,
    // Text never fades into its background (Claude's diffs paint lines green and red), as the Mac app's terminals do.
    minimumContrastRatio: 4.5, theme: palette(),
  });
  const fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  term.loadAddon(new Unicode11Addon.Unicode11Addon());
  term.unicode.activeVersion = '11';
  term.loadAddon(new WebLinksAddon.WebLinksAddon((e, uri) => atl.send('term:open', uri)));
  // Links a program prints itself (OSC 8): a web address in the browser; a file:// one, Ctrl-clicked, as a path is.
  term.options.linkHandler = {
    allowNonHttpProtocols: true,
    activate(e, uri) {
      if (/^https?:/i.test(uri)) atl.send('term:open', uri);
      else if (/^file:/i.test(uri) && e.ctrlKey) atl.send('term:openFile', { url: uri });
    },
  };
  term.open(document.getElementById('term'));
  try {
    const webgl = new WebglAddon.WebglAddon();
    webgl.onContextLoss(() => webgl.dispose());
    term.loadAddon(webgl);
  } catch {}
  // Paths: a text file Ctrl-clicked opens in Source Control's editor (the dashboard), at the line it names
  // ("main.js:12:4"); anything else in its app, as ⌘-click on the Mac. The app says which pieces of a line are files
  // (from the shell's folder when relative), joining one Claude wrapped onto the lines around it; only those underline.
  const termEl = document.getElementById('term');
  const PATHISH = /[\\/]|^~|\.[\w-]{1,16}(?::\d+){0,2}[.,;:!?)\]}'"`]*$/;
  const rowText = (y) => {
    const line = term.buffer.active.getLine(y);
    return line ? line.translateToString(true) : '';
  };
  term.registerLinkProvider({
    provideLinks(y, done) {
      const line = term.buffer.active.getLine(y - 1);
      if (!line) return done(undefined);
      // The line's text and the cell each of its characters starts at (a wide character takes two).
      let text = '';
      const cells = [];
      for (let x = 0; x < line.length; x++) {
        const c = line.getCell(x);
        if (!c || !c.getWidth()) continue;
        const ch = c.getChars() || ' ';
        for (let k = 0; k < ch.length; k++) cells.push(x + 1);
        text += ch;
      }
      text = text.replace(/\s+$/, '');
      const links = [];
      for (const m of text.matchAll(/\S+/g)) {
        let piece = m[0], start = m.index;
        while (piece && '([{<\'"`'.includes(piece[0])) piece = piece.slice(1), start++;
        if (!piece || /:\/\/|^(mailto|tel):/i.test(piece) || !PATHISH.test(piece)) continue;
        links.push({ text: piece, start });
        if (links.length >= 40) break;
      }
      if (!links.length) return done(undefined);
      const rows = [y - 3, y - 2, y - 1, y, y + 1].map(rowText);
      atl.ask('term:paths', { links, rows, at: 2 }).then((found) => {
        const out = [];
        links.forEach((l, i) => {
          if (!found || !found[i]) return;
          const q = { text: l.text, start: l.start, rows, at: 2 };
          out.push({
            range: { start: { x: cells[l.start], y }, end: { x: cells[l.start + l.text.length - 1], y } },
            text: l.text,
            activate: (e) => e.ctrlKey && atl.send('term:openFile', q),
            hover: () => (termEl.title = 'Ctrl+click to open'),
            leave: () => (termEl.title = ''),
          });
        });
        done(out.length ? out : undefined);
      }, () => done(undefined));
    },
  });
  const size = () => ({ cols: term.cols, rows: term.rows });
  const refit = () => {
    try {
      fit.fit();
    } catch {}
  };
  refit();
  new ResizeObserver(refit).observe(document.getElementById('term'));
  addEventListener('resize', refit);
  addEventListener('focus', () => {
    refit();
    term.focus();
  });
  document.addEventListener('visibilitychange', () => !document.hidden && refit());
  addEventListener('themechange', () => Object.assign(term.options, { theme: palette(), ...cursor() }));
  // The terminals' font family changed in Settings ("" is back to the usual stack).
  atl.on('term:family', (f) => {
    term.options.fontFamily = stack(f);
    refit();
  });
  // The terminals' text size changed (View's zoom with a terminal in front, or Settings sync): the grid follows.
  atl.on('term:font', (n) => {
    if (!(n >= 9 && n <= 24) || term.options.fontSize === n) return;
    term.options.fontSize = n;
    refit();
  });
  term.onResize(({ cols, rows }) => atl.send('term:resize', { cols, rows }));
  // When something was last typed (not an Esc, a focus report or a key's escape sequence; a paste counts): agy's rewind
  // waits for a prompt sent a moment ago to start its turn.
  let typedAt = 0;
  term.onData((data) => {
    if (data[0] !== '\x1b' || data.startsWith('\x1b[200~')) typedAt = performance.now();
    atl.send('term:input', data);
  });
  // The AI tool running in this window, as the app tells it (term:info), for the keys it needs, and its own status.
  let tool = null;
  let toolStatus = null;
  // Antigravity's rewind (the Mac's AgyRewind.swift): agy has /rewind but no key for it, and its own Esc Esc only clears
  // the prompt. Esc Esc while it waits for you with an empty prompt types /rewind instead: the second Esc is swallowed,
  // a third never rewinds, and anything unclear lets Esc go to agy as usual. Swapped (Settings › Shortcuts), the Esc
  // the close keys send counts: Ctrl+W Ctrl+W.
  const PROMPT_BOX = ['│', '┃', '|'];
  const agyReady = () => {
    if (tool !== 'Antigravity' || toolStatus !== 'idle' || performance.now() - typedAt <= 1500) return false;
    const b = term.buffer.active;
    const bottom = b.baseY + term.rows - 1;
    for (let y = bottom; y >= Math.max(b.baseY, bottom - 29); y--) {
      const line = b.getLine(y);
      const chars = [...(line ? line.translateToString(true) : '')];
      let lead = 0;
      while (lead < chars.length && (chars[lead] === ' ' || PROMPT_BOX.includes(chars[lead]))) lead++;
      if (lead >= chars.length || !'>❯›!→'.includes(chars[lead])) continue;
      // The bottom-most prompt line decides; anything but ">" (bash mode ! …) is no.
      if (chars[lead] !== '>') return false;
      let rest = chars.slice(lead + 1).join('').trim();
      while (rest && PROMPT_BOX.includes(rest[rest.length - 1])) rest = rest.slice(0, -1).trim();
      // The cursor sits right after the mark, where the placeholder starts: typed text would have moved it.
      if (b.baseY + b.cursorY !== y || b.cursorX > lead + 2) return false;
      return !rest || /^[A-Za-z][A-Za-z0-9 -]* mode: .*\(shift\+tab to cycle\)$/.test(rest);
    }
    return false;
  };
  let lastEsc = -1;
  /** An Esc about to reach the terminal: true when it was the second and /rewind went instead (the Esc is dropped). */
  const agyRewind = () => {
    if (!agyReady()) {
      lastEsc = -1;
      return false;
    }
    const now = performance.now();
    const first = lastEsc;
    const second = first >= 0 && now - first <= 500;
    lastEsc = second ? -1 : now;
    if (!second) return false;
    // At least 150 ms after the Esc that went: closer, a console reads Esc and "/" as Alt+/.
    setTimeout(() => atl.send('term:input', '/rewind\r'), Math.max(0, 150 - (now - first)));
    return true;
  };
  // Copy-on-select, as on the Mac: dragging or double-clicking a selection copies it to the clipboard on mouse release,
  // shows the "COPIED N CHARS" badge in the HUD, and keeps the selection highlighted.
  let mouseDown = false, pendingCopy = false, copyTimer = 0;
  const copiedEl = document.getElementById('copied');
  const showCopied = (n) => {
    if (!(n > 0)) return;
    copiedEl.textContent = `COPIED ${n} CHAR${n === 1 ? '' : 'S'}`;
    copiedEl.hidden = false;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copiedEl.hidden = true), 2200);
  };
  const copySelection = () => {
    if (!term.hasSelection()) return false;
    const text = term.getSelection();
    if (!text) return false;
    atl.send('term:copy', text);
    showCopied(text.length);
    return true;
  };
  document.getElementById('term').addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      mouseDown = true;
      pendingCopy = false;
    }
  }, true);
  term.onSelectionChange(() => {
    if (!term.hasSelection()) {
      pendingCopy = false;
      return;
    }
    if (mouseDown) pendingCopy = true;
  });
  addEventListener('mouseup', () => {
    if (!mouseDown) return;
    mouseDown = false;
    if (pendingCopy && term.hasSelection()) {
      pendingCopy = false;
      copySelection();
    }
  });
  // Ctrl+C copies when something is selected (else it interrupts), Ctrl+V pastes: Windows Terminal's keys. The copy
  // goes through the app, as the page's clipboard API refuses a window without focus. Ctrl+V only keeps xterm.js from
  // sending ^V: the browser's own paste follows and xterm.js takes it (pasting here as well put everything in twice).
  // The keys the app takes in a terminal (Settings › Shortcuts, the app's shortcuts.js): every action's but the
  // dashboard's own (Ctrl+B, Ctrl+R stay the shell's). As it came: Ctrl+N (a new file in Source Control's editor),
  // Ctrl+Shift+N (a new terminal), Ctrl+K (the Ring), Ctrl+W and Ctrl+Shift+W (close the window: what runs in it goes
  // on), as ⌘N, ⇧⌘N, ⌘K, ⌘W and ⇧⌘W are on the Mac. Changes come on term:keys, and
  // whether Esc and the close keys are swapped (below).
  let keys = window.__keys || { app: ['ctrl+shift+n', 'ctrl+n', 'ctrl+k', 'ctrl+w', 'ctrl+shift+w'] };
  atl.on('term:keys', (k) => {
    if (k && Array.isArray(k.app)) keys = k;
  });
  // A key press as a combo, the app's way (shortcuts.js comboOf): the key where it is on the keyboard, whatever the
  // layout makes of it, or what it types when it comes without a place (SendKeys, Remote Desktop, the on-screen
  // keyboard give no scan code); null without Ctrl or Alt (but the F keys), or with the Windows key.
  const NAMED = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', PageUp: 'pageup', PageDown: 'pagedown',
    Home: 'home', End: 'end', Enter: 'return', NumpadEnter: 'return', Tab: 'tab', Space: 'space', Insert: 'insert', Delete: 'delete',
    Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'", Comma: ',',
    Period: '.', Slash: '/', Backquote: '`', NumpadAdd: 'plus', NumpadSubtract: 'numsub', Escape: 'esc',
  };
  const SHIFTED = { '+': '=', _: '-', '{': '[', '}': ']', '|': '\\', ':': ';', '"': "'", '<': ',', '>': '.', '?': '/', '~': '`',
    '!': '1', '@': '2', '#': '3', $: '4', '%': '5', '^': '6', '&': '7', '*': '8', '(': '9', ')': '0' };
  const typedKey = (k) => {
    if (!k) return null;
    if (k.length === 1) {
      const c = SHIFTED[k] || k.toLowerCase();
      return /^[a-z0-9]$/.test(c) || Object.values(NAMED).includes(c) ? c : null;
    }
    const m = /^F([1-9]|1[0-9]|2[0-4])$/.exec(k);
    return m ? `f${m[1]}` : k === ' ' ? 'space' : NAMED[k] || null;
  };
  const comboOf = (e) => {
    if (e.metaKey) return null;
    const c = e.code || '';
    let m;
    const key = (m = /^Key([A-Z])$/.exec(c)) ? m[1].toLowerCase()
      : (m = /^(?:Digit|Numpad)([0-9])$/.exec(c)) ? m[1]
        : (m = /^F([1-9]|1[0-9]|2[0-4])$/.exec(c)) ? `f${m[1]}` : NAMED[c] || typedKey(e.key);
    if (!key || (!e.ctrlKey && !e.altKey && !/^f\d+$/.test(key))) return null;
    return [e.ctrlKey && 'ctrl', e.altKey && 'alt', e.shiftKey && 'shift', key].filter(Boolean).join('+');
  };
  term.attachCustomKeyEventHandler((e) => {
    if (e.type !== 'keydown') return true;
    const k = e.key.toLowerCase();
    if (e.ctrlKey && !e.altKey && k === 'c' && term.hasSelection()) {
      e.preventDefault();
      copySelection();
      // Cleared, as in Windows Terminal: the next Ctrl+C interrupts again.
      term.clearSelection();
      return false;
    }
    const combo = comboOf(e);
    // Esc and the close keys swapped (Settings › Shortcuts, the Mac's EscClose.swift): this handler runs only while the
    // terminal itself has the keys, which is when the swap acts. A plain Esc hides the window as the close keys do,
    // whatever runs here (held, it only hides once); the close keys type a real Esc instead, as the Esc key would. An
    // IME's Esc comes as "Process", never as Escape.
    const plainEsc = e.key === 'Escape' && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey;
    if (keys.escClose) {
      if (plainEsc) {
        e.preventDefault();
        lastEsc = -1;
        if (!e.repeat) atl.send('term:escClose');
        return false;
      }
      if (combo && combo === keys.closePane) {
        e.preventDefault();
        if (!agyRewind()) term.input('\x1b', true);
        return false;
      }
    } else if (plainEsc && !e.repeat && agyRewind()) {
      e.preventDefault();
      return false;
    }
    // Left unhandled, the app's keys reach its menu instead of the shell. Antigravity approves its subagents' steps with
    // Ctrl+K, so while it runs here that key is its own (the Ring is still the middle mouse button away).
    if (combo && keys.app.includes(combo)) return combo === 'ctrl+k' && tool === 'Antigravity';
    if (!e.ctrlKey || e.altKey) return true;
    return k !== 'v';
  });
  atl.on('term:data', (data) => term.write(data));
  atl.on('term:exit', () => term.write('\r\n\x1b[2m[ended]\x1b[0m\r\n'));
  // The local MCP server (the app's mcp.js, the Mac's terminalText): what this terminal shows, as text, for Claude's
  // read_session and for the checks before it types a prompt. The screen in front (Claude's full-screen view is the
  // alternate one), row by row, the last 60,000 characters.
  atl.on('term:screen', (rid) => {
    const b = term.buffer.active;
    const rows = [];
    // Row by row as the screen shows them, wrapped rows not joined: Claude draws its box's top rule the full width of the
    // window, so xterm counts the input row under it as wrapped, and joined the two the input box (❯) was lost and an
    // older prompt above it was taken for typed text.
    for (let y = Math.max(0, b.length - 2000); y < b.length; y++) {
      const line = b.getLine(y);
      if (line) rows.push(line.translateToString(false));
    }
    atl.send('term:screen', { rid, text: rows.map((r) => r.replace(/\s+$/, '')).join('\n').slice(-60000) });
  });
  // Tokens as the Mac's strip writes them: 950, 9.5k, 95k, 1.2M.
  const fmtTok = (n) => {
    n = Math.max(0, Math.trunc(Number(n) || 0));
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e4) return `${Math.round(n / 1e3)}k`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
    return String(n);
  };
  const STATUS = { busy: ['WORKING', '--accent'], idle: ['YOUR TURN', '--cyan'], waiting: ['NEEDS YOU', '--warn'], terminal: ['TERMINAL', '--cyan'], ended: ['ENDED', '--ended'] };
  atl.on('term:info', (i) => {
    tool = i.tool || null;
    toolStatus = i.toolStatus || null;
    document.getElementById('title').textContent = i.title || 'terminal';
    document.title = `${i.title || 'terminal'} · Orbiterm`;
    const [label, color] = STATUS[i.status] || ['', '--dim'];
    document.getElementById('status').textContent = label;
    document.getElementById('where').textContent = i.cwd || '';
    document.body.style.setProperty('--st', `var(${color})`);
    // Streamer mode: the names above are made up already; the terminal itself goes behind frosted glass.
    document.getElementById('veil').hidden = !i.streamer;
    // The AI session in it: the star (in the chats list's favourites or not), its context and today's counts.
    const star = document.getElementById('star');
    star.hidden = !i.chat;
    star.classList.toggle('on', !!i.fav);
    star.title = i.fav ? "Starred. Click to take it out of the chats list's favourites." : "Star this chat in the chats list's favourites.";
    const st = i.stats;
    const ctxEl = document.getElementById('ctx');
    const countsEl = document.getElementById('counts');
    ctxEl.hidden = countsEl.hidden = !st;
    if (st) {
      ctxEl.querySelector('.bar span').style.width = `${st.ctxMax > 0 ? Math.min(1, st.ctx / st.ctxMax) * 100 : 0}%`;
      ctxEl.querySelector('.n').textContent = fmtTok(st.ctx) + (st.ctxMax > 0 ? ` / ${fmtTok(st.ctxMax)}` : '');
      countsEl.innerHTML = `<b>${st.tools}</b><i> tools · </i><b>${st.web}</b><i> web · </i><b${st.errors > 0 ? ' class="err"' : ''}>${st.errors}</b><i> err</i>`;
    }
  });
  // ---------- a linked worktree: the chip and the split button (the Mac's WorktreeChip.swift) ----------
  // The app sends what to show (term:ship, from its worktreeship.js; null: not in a worktree) and does what a click asks:
  // the chip shows the changes in Source Control, the main face opens the next step's sheet, ▾ a menu of everything.
  const wtEl = document.getElementById('wt');
  const shipEl = document.getElementById('ship');
  const shipMain = document.getElementById('shipMain');
  const shipMore = document.getElementById('shipMore');
  const announce = document.getElementById('announce');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const sv = (body) => `<svg viewBox="0 0 16 16" aria-hidden="true">${body}</svg>`;
  const WT_ICON = {
    branch: sv('<circle cx="4.5" cy="3" r="1.6"/><circle cx="4.5" cy="13" r="1.6"/><circle cx="11.5" cy="5" r="1.6"/><path d="M4.5 4.6v6.8M11.5 6.6c0 3.2-7 2.4-7 4.8"/>'),
    pull: sv('<circle cx="4" cy="3.4" r="1.6"/><circle cx="4" cy="12.6" r="1.6"/><circle cx="12" cy="12.6" r="1.6"/><path d="M4 5v6M12 11V6.4a2 2 0 0 0-2-2H7.2M8.8 2.8 7.2 4.4 8.8 6"/>'),
    merge: sv('<circle cx="4" cy="3.4" r="1.6"/><circle cx="4" cy="12.6" r="1.6"/><circle cx="12" cy="9" r="1.6"/><path d="M4 5v6M4.6 4.9C5.6 8 7.8 9 10.4 9"/>'),
    trash: sv('<path d="M2.8 4.4h10.4M6.3 4.4V2.9h3.4v1.5M4.4 4.4l.7 8.6a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.7-8.6M6.9 7v4.4M9.1 7v4.4"/>'),
    ext: sv('<path d="M9 2.5h4.5V7M13.5 2.5 7.6 8.4M11.5 9.6v2.9a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h2.9"/>'),
    chev: sv('<path d="M3.5 6l4.5 4.5L12.5 6"/>'),
    ok: '<svg class="ok" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>',
    bad: '<svg class="bad" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg>',
  };
  shipMore.innerHTML = WT_ICON.chev;
  // The checks' mark: ✓ passed, ✕ failed, a turning ring while they run, nothing when there are none.
  const checksMark = (k) => (k === 'pass' ? WT_ICON.ok : k === 'fail' ? WT_ICON.bad : k === 'run' ? '<span class="ring"></span>' : '');
  let ship = null;
  function drawShip() {
    const v = ship;
    wtEl.hidden = !v;
    shipEl.hidden = !v || !v.face;
    if (!v) return;
    const t = v.tail;
    let tail = '';
    if (t) {
      const sep = '<span class="sep"></span>';
      if (t.type === 'deleted' || t.type === 'gone') tail = `<span class="tail">${sep}<span class="gone">${t.type === 'deleted' ? 'deleted' : 'folder gone'}</span></span>`;
      else if (t.type === 'nums') tail = `<span class="tail nums">${sep}<span>+${t.add}</span><span class="del">−${t.del}</span></span>`;
      else if (t.type === 'closed') tail = `<span class="tail">${sep}<span class="pr">#${t.number} closed</span></span>`;
      else if (t.type === 'pr') tail = `<span class="tail">${sep}<span class="pr">#${t.number}${t.draft ? ' draft' : ''}</span>${t.draft ? '' : checksMark(t.checks)}</span>`;
      else if (t.type === 'merged') tail = `<span class="tail">${sep}<span class="pr">merged</span>${WT_ICON.ok}</span>`;
    }
    wtEl.innerHTML = `${WT_ICON.branch}<span class="word">worktree ·</span><span class="br">${esc(v.branch)}</span>${tail}`;
    const dim = v.deleted || v.phase === 'gone';
    wtEl.classList.toggle('dim', dim);
    wtEl.classList.toggle('flat', !dim && !v.clickable);
    wtEl.title = v.tip || '';
    wtEl.setAttribute('aria-label', v.label || '');
    if (!v.face) return;
    // The next step, or what is under way here (from this window or another of the same worktree).
    shipMain.innerHTML = v.busy ? `<span class="ring"></span><span>${esc(v.busy)}</span>` : `${WT_ICON[v.face.icon] || WT_ICON.pull}<span>${esc(v.face.label)}</span>`;
    shipMain.classList.toggle('busy', !!v.busy);
    shipMain.classList.toggle('off', !v.busy && !v.face.enabled);
    shipMain.title = v.busy ? '' : v.face.tip || '';
    shipMain.setAttribute('aria-label', v.busy || `${v.face.label}. ${v.face.tip || ''}`);
    shipMain.setAttribute('aria-disabled', String(!!v.busy || !v.face.enabled));
    shipMore.setAttribute('aria-label', v.more || 'More actions for this worktree');
  }
  atl.on('term:ship', (v) => {
    const old = ship && ship.tail && ship.tail.type === 'pr' ? ship.tail : null;
    const now = v && v.tail && v.tail.type === 'pr' ? v.tail : null;
    ship = v || null;
    drawShip();
    // Checks finishing is said once (WCAG 4.1.3): the colour isn't the only sign.
    if (old && now && old.number === now.number && old.checks !== now.checks && (now.checks === 'pass' || now.checks === 'fail')) {
      announce.textContent = `PR #${now.number}: ${now.checks === 'pass' ? 'checks passed' : 'a check failed'}.`;
    }
  });
  // While the ▾ menu is open its half looks pressed.
  atl.on('term:shipMenu', (open) => shipMore.classList.toggle('open', !!open));
  wtEl.onclick = () => {
    term.focus();
    if (ship && ship.clickable) atl.send('term:shipChip');
  };
  shipMain.onclick = () => {
    term.focus();
    if (ship && ship.face && ship.face.enabled && !ship.busy) atl.send('term:shipMain');
  };
  shipMore.onclick = () => {
    const r = shipMore.getBoundingClientRect();
    atl.send('term:shipMore', { x: Math.round(r.left), y: Math.round(r.bottom + 2) });
  };

  document.getElementById('hud').addEventListener('mousedown', (e) => e.preventDefault());
  document.getElementById('star').onclick = () => {
    term.focus();
    atl.send('term:favorite');
  };
  document.getElementById('end').onclick = () => atl.send('term:end');
  term.focus();
  atl.send('term:ready', size());
})();
