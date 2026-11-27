'use strict';
// A terminal window's tab bar, its bar over a split (the Mac's header) and the gaps between its split panes (main.js's
// frames). The tab bar is the Mac's PaneTabBar: a chip for each
// tab with its number, a dot while its AI works or needs you, its name and the AI's context. A click picks it, a double
// click renames it in place, a right click opens its menu (the app's), × ends it. When the chips don't fit at their least
// width the bar scrolls sideways and » lists them all. The terminals are views over this page: it shows only in the bar
// and in the gaps, where a divider is dragged. A chip pressed and moved past a few pixels is dragged instead: this page only
// reports the pointer's phases (term:drag) and where the chips are (geom); main decides where the drop would land.
(() => {
  const bar = document.getElementById('bar');
  const chips = document.getElementById('chips');
  const more = document.getElementById('more');
  const gaps = document.getElementById('gaps');
  let state = { tabs: [], active: 0, bar: false, dividers: [], height: 30, hud: null };
  let editing = -1;
  const tell = (q) => atl.send('term:tabs', q);
  const DRAG_SLOP = 5;

  // Tokens as the strip writes them: 950, 9.5k, 95k, 1.2M.
  const fmtTok = (n) => {
    n = Math.max(0, Math.trunc(Number(n) || 0));
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e4) return `${Math.round(n / 1e3)}k`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
    return String(n);
  };
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  function drawChips() {
    chips.textContent = '';
    state.tabs.forEach((t, i) => {
      const on = i === state.active;
      const chip = el('div', `chip${on ? ' on' : ''}${t.status === 'ended' ? ' ended' : ''}`);
      chip.setAttribute('role', 'tab');
      chip.setAttribute('aria-selected', String(on));
      const st = t.status === 'busy' || t.status === 'waiting' ? t.status : '';
      const s = t.stats;
      chip.title = [t.title, st === 'busy' ? 'working' : st === 'waiting' ? 'needs you' : '', s ? `${s.tools} tools · ${s.web} web · ${s.errors} err` : '', t.panes > 1 ? `${t.panes} panes` : '']
        .filter(Boolean).join(' · ');
      if (i < 9) chip.append(el('span', 'n', String(i + 1)));
      if (st) chip.append(el('span', `dot ${st}`));
      // The Claude account's initial, only when the window's tabs use more than one.
      if (t.acct && /^\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*$/.test(String(t.acct.hue))) {
        const ac = el('i', 'ac', String(t.acct.initial || '').slice(0, 2));
        ac.style.setProperty('--ah', t.acct.hue);
        ac.title = `Claude account: ${t.acct.label}`;
        chip.append(ac);
        chip.title += ` · ${t.acct.label}`;
      }
      chip.append(el('span', 'name', t.title));
      if (s) {
        const ctx = el('span', 'ctx');
        const meter = el('span', 'bar');
        const fill = el('span');
        fill.style.width = `${s.ctxMax > 0 ? Math.min(1, s.ctx / s.ctxMax) * 100 : 0}%`;
        meter.append(fill);
        ctx.append(meter, el('span', '', fmtTok(s.ctx)));
        chip.append(ctx);
      }
      const x = el('button', 'x', '×');
      x.type = 'button';
      x.title = 'End this tab';
      x.setAttribute('aria-label', `End tab ${i + 1}`);
      x.addEventListener('click', (e) => {
        e.stopPropagation();
        tell({ type: 'close', i });
      });
      chip.append(x);
      chip.addEventListener('pointerdown', (e) => armDrag(e, i, chip, x));
      chip.addEventListener('click', () => editing < 0 && tell({ type: 'select', i }));
      chip.addEventListener('dblclick', (e) => {
        if (e.target !== x) rename(i);
      });
      chip.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        tell({ type: 'menu', i, x: e.clientX, y: e.clientY });
      });
      chips.append(chip);
    });
  }

  // ---------- dragging a chip (the Mac's PaneTabBar drag) ----------
  // A press that moves more than a few pixels is a drag, anything less stays a click. Once it starts the chip holds the
  // pointer, so the moves keep coming while the pointer is over the terminals or another window, and main reads the
  // pointer itself: this page only says which phase the drag is in.
  let drag = null; // { i, x0, y0, pointerId, chip, started, cancelled, finished, seq, raf }
  let seq = 0;
  let swallowClick = false;
  let lastDragEnd = 0;
  let redrawLater = false;
  const tellDrag = (m) => atl.send('term:drag', { kind: 'tab', ...m });

  function armDrag(e, i, chip, x) {
    swallowClick = false;
    if (e.button !== 0 || editing >= 0 || e.target === x || drag) return;
    drag = { i, x0: e.clientX, y0: e.clientY, pointerId: e.pointerId, chip, started: false, cancelled: false, finished: false, seq: 0, raf: 0 };
    tellDrag({ phase: 'arm', seq: 0 });
  }
  window.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pointerId || drag.finished) return;
    // The button came up where no pointerup reached this page (over another window, say): the drag is over, or disarmed.
    if (!(e.buttons & 1)) return endDrag(e, true);
    if (!drag.started) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) <= DRAG_SLOP) return;
      drag.started = true;
      drag.seq = ++seq;
      // The bar's chips holder keeps the pointer, not the chip: a rebuild of the chips must not drop it.
      try { chips.setPointerCapture(e.pointerId); } catch (_) { /* the page is going: lostpointercapture cancels */ }
      document.body.classList.add('dragging');
      tellDrag({ phase: 'start', i: drag.i, seq: drag.seq });
    }
    // One report for each frame is enough: main reads the pointer itself when it gets it.
    if (drag.cancelled || drag.raf) return;
    const d = drag;
    d.raf = requestAnimationFrame(() => {
      d.raf = 0;
      if (!d.cancelled && !d.finished) tellDrag({ phase: 'move', seq: d.seq });
    });
  });
  function endDrag(e, up) {
    if (!drag || e.pointerId !== drag.pointerId || drag.finished) return;
    const d = drag;
    d.finished = true;
    if (d.started) {
      // A cancel always ends the drag: after a pointercancel the pointer never comes back, so the drop must not run.
      if (!d.cancelled) tellDrag({ phase: up ? 'end' : 'cancel', seq: d.seq });
      swallowClick = true;
      lastDragEnd = performance.now();
    }
    if (chips.hasPointerCapture(d.pointerId)) chips.releasePointerCapture(d.pointerId);
    document.body.classList.remove('dragging');
    drag = null;
    // The bar kept the chips as they were while the drag ran, so it draws what came in meanwhile now.
    if (redrawLater) {
      redrawLater = false;
      // After the click that follows the release, which would miss a chip rebuilt before it.
      setTimeout(draw, 0);
    }
  }
  window.addEventListener('pointerup', (e) => endDrag(e, true));
  window.addEventListener('pointercancel', (e) => endDrag(e, false));
  // Capture lost while the button is still down (the chip left the page, say) is a drag that can't go on.
  window.addEventListener('lostpointercapture', (e) => {
    if (drag && drag.started && !drag.finished && e.pointerId === drag.pointerId) endDrag(e, false);
  });
  // A drag that ended by pointercancel or lost capture gets no click: the flag must not eat the next, unrelated one.
  window.addEventListener('pointerdown', () => { swallowClick = false; }, true);
  // The click that follows a drag must not pick or rename anything.
  window.addEventListener('click', (e) => {
    if (!swallowClick) return;
    swallowClick = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);
  window.addEventListener('dblclick', (e) => {
    if (performance.now() - lastDragEnd < 500) e.stopPropagation();
  }, true);
  function cancelDrag() {
    drag.cancelled = true;
    document.body.classList.remove('dragging');
  }
  // Esc drops the drag; nothing is moved and the keys go back to where they were.
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !drag || !drag.started || drag.cancelled || drag.finished) return;
    e.preventDefault();
    e.stopPropagation();
    cancelDrag();
    tellDrag({ phase: 'cancel', seq: drag.seq });
  }, true);
  // Main dropped the drag (Esc in another window, the source went away): stop reporting, and the click still gets swallowed.
  atl.on('term:dragCancel', (m) => {
    if (m && drag && drag.started && !drag.cancelled && m.seq === drag.seq) cancelDrag();
  });

  // ---------- where the chips are ----------
  // Main hit-tests the pointer against the chips (the slot marker, which tab a drop lands in), so it needs their places:
  // each chip's left and right edge and the visible part of the bar, in this page's pixels.
  let geomRaf = 0;
  let geomSent = '';
  function queueGeom() {
    if (geomRaf) return;
    geomRaf = requestAnimationFrame(() => {
      geomRaf = 0;
      if (!state.bar) {
        geomSent = '';
        return;
      }
      const c = chips.getBoundingClientRect();
      const g = {
        chips: [...chips.children].map((k) => {
          const r = k.getBoundingClientRect();
          return [Math.round(r.left), Math.round(r.right)];
        }),
        clip: [Math.round(c.left), Math.round(c.right)],
      };
      const key = JSON.stringify(g);
      if (key === geomSent) return;
      geomSent = key;
      tell({ type: 'geom', ...g });
    });
  }
  chips.addEventListener('scroll', queueGeom);
  window.addEventListener('resize', queueGeom);

  // The tab in front stays in view, and » shows while the chips overflow.
  function fit() {
    const over = chips.scrollWidth > chips.clientWidth + 1;
    more.hidden = !over;
    const on = chips.children[state.active];
    if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    queueGeom();
  }
  chips.addEventListener('wheel', (e) => {
    if (chips.scrollWidth <= chips.clientWidth) return;
    e.preventDefault();
    chips.scrollLeft += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  }, { passive: false });
  new ResizeObserver(fit).observe(chips);
  more.addEventListener('click', () => {
    const r = more.getBoundingClientRect();
    tell({ type: 'more', x: Math.round(r.left), y: Math.round(r.bottom + 2) });
  });
  // The bar takes no typing: a click on its empty part gives the keys back to the pane that had them.
  bar.addEventListener('click', (e) => {
    if (editing < 0 && (e.target === bar || e.target === chips)) tell({ type: 'back' });
  });

  // The chip's name, edited in place: Enter keeps it (empty goes back to the one it's given), Esc or a click away drops it.
  function rename(i) {
    const chip = chips.children[i];
    const t = state.tabs[i];
    if (!chip || !t) return;
    editing = i;
    const name = chip.querySelector('.name');
    const input = el('input');
    input.value = t.title;
    input.setAttribute('aria-label', 'Tab name');
    name.replaceWith(input);
    let done = false;
    const finish = (keep) => {
      if (done) return;
      done = true;
      editing = -1;
      tell(keep ? { type: 'rename', i, name: input.value } : { type: 'renamed' });
      draw();
    };
    input.addEventListener('keydown', (e) => {
      if (e.isComposing) return;
      if (e.key === 'Enter') finish(true);
      else if (e.key === 'Escape') finish(false);
    });
    // The keys come here (the double click's first click gave them to the tab's pane): a blur in the first moment is
    // that, and the field takes them back.
    const started = performance.now();
    input.addEventListener('blur', () => {
      if (performance.now() - started < 500) setTimeout(() => !done && input.focus(), 0);
      else finish(false);
    });
    input.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('dblclick', (e) => e.stopPropagation());
    tell({ type: 'renaming' });
    input.focus();
    input.select();
  }

  // The gaps between panes: dragged, the divider follows the pointer (where the first pane would end).
  function drawGaps() {
    gaps.textContent = '';
    (state.dividers || []).forEach((d, i) => {
      const g = el('div', `gap ${d.dir}`);
      Object.assign(g.style, { left: `${d.x}px`, top: `${d.y}px`, width: `${d.width}px`, height: `${d.height}px` });
      const half = d.dir === 'row' ? d.width / 2 : d.height / 2;
      let raf = 0, pos = 0;
      g.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        g.setPointerCapture(e.pointerId);
        g.classList.add('drag');
      });
      g.addEventListener('pointermove', (e) => {
        if (!g.hasPointerCapture(e.pointerId)) return;
        pos = (d.dir === 'row' ? e.clientX : e.clientY) - half;
        if (!raf) {
          raf = requestAnimationFrame(() => {
            raf = 0;
            tell({ type: 'divider', d: i, pos });
          });
        }
      });
      // Let go, the keys go back to the pane that had them.
      const end = (e) => {
        if (g.hasPointerCapture(e.pointerId)) g.releasePointerCapture(e.pointerId);
        g.classList.remove('drag');
        tell({ type: 'back' });
      };
      g.addEventListener('pointerup', end);
      g.addEventListener('pointercancel', end);
      gaps.append(g);
    });
  }

  // ---------- the window's bar over a split (the Mac's header: ChatWindow.swift's TitleRow and HUDRow) ----------
  // For the pane with the keys: main sends what that pane's strip shows (its term:info) and the window's own state (hudOf),
  // and the pieces show by the Mac's rules: a plain terminal says where it is; an AI its context, model and effort, cost
  // (Claude's only), counts and the tool call it's on; one still starting says so. With two tabs or more the context and
  // the counts are each chip's, and the star and End go (each chip has its ×); with split panes (Mac 2764fef) each pane's
  // slim bar has its own figures, copy, env, star and ×, and this bar keeps the title row, the folder or "starting", the
  // pin, and env while the view is open. Its buttons act for that pane, which main gives the keys back to first.
  const hud = document.getElementById('hud');
  const $ = (id) => document.getElementById(id);
  const hudTitle = $('title');
  const pill = $('pill');
  const actionEl = $('action');
  const sparkEl = $('spark');
  const acctEl = $('acct');
  const wtEl = $('wt');
  const shipEl = $('ship');
  const shipMain = $('shipMain');
  const shipMore = $('shipMore');
  // The Mac's Theme.statusLabel and statusHex (starting and ended in the ended colour).
  const STATUS = { busy: ['WORKING', '--accent'], idle: ['YOUR TURN', '--cyan'], waiting: ['NEEDS YOU', '--warn'], starting: ['STARTING', '--ended'], terminal: ['TERMINAL', '--cyan'], ended: ['ENDED', '--ended'] };
  // A tool call's colour by its kind (the Mac's Theme.catHex), a plan's for the rest.
  const CAT = { web: '--sky', browser: '--blue', read: '--green', search: '--lime', edit: '--amber', bash: '--orange', agent: '--violet', mcp: '--magenta', plan: '--lavender' };
  // Money, durations and clocks as the Mac's header writes them: $0.42, $12; 45s, 3m07, 1h05; 0:42, 1:02:33.
  const fmtUsd = (n) => (n >= 100 ? `$${n.toFixed(0)}` : n >= 0.01 ? `$${n.toFixed(2)}` : n > 0 ? `$${n.toFixed(3)}` : '$0');
  const two = (n) => String(n).padStart(2, '0');
  const fmtDur = (ms) => {
    const s = Math.trunc(Math.max(0, ms) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.trunc(s / 60)}m${two(s % 60)}`;
    return `${Math.trunc(s / 3600)}h${two(Math.trunc((s % 3600) / 60))}`;
  };
  const clock = (ms) => {
    const s = Math.trunc(Math.max(0, ms) / 1000);
    const h = Math.trunc(s / 3600), m = Math.trunc((s % 3600) / 60);
    return h > 0 ? `${h}:${two(m)}:${two(s % 60)}` : `${m}:${two(s % 60)}`;
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const tip = (node, text) => {
    node.title = text;
    node.setAttribute('aria-label', text);
  };
  // The Mac's ChatHUD.status: an AI tool's own in a terminal it runs in, "starting" while a chat's Claude isn't found yet
  // (the app says busy then, chatInfo), else the pane's.
  const statusOf = (i) => {
    if (i.status === 'terminal' && i.tool) return STATUS[i.toolStatus] ? i.toolStatus : 'idle';
    if (!i.status || (!i.chat && i.status === 'busy')) return 'starting';
    return STATUS[i.status] ? i.status : 'ended';
  };
  let hudStatus = '', hudSince = 0, hudAction = null;
  // The pill's clock and the tool call's, every second; while it needs you the pill blinks with it (the Mac's header redraws
  // as often). A clock grown a digit fits the bar again.
  function tickHud() {
    if (hud.hidden) return;
    const now = Date.now();
    const timed = ['busy', 'idle', 'waiting'].includes(hudStatus) && hudSince > 0;
    const dur = actionEl.querySelector('.dur');
    const was = pill.textContent.length + dur.textContent.length;
    pill.textContent = STATUS[hudStatus][0] + (timed ? ` ${clock(now - hudSince)}` : '');
    pill.classList.toggle('blink', hudStatus === 'waiting' && Math.trunc(now / 1000) % 2 === 0);
    dur.textContent = hudAction && hudAction.since > 0 ? fmtDur(now - hudAction.since) : '';
    if (pill.textContent.length + dur.textContent.length !== was) fitHud();
  }
  setInterval(tickHud, 1000);
  // A narrow window drops each row's pieces one at a time, the least needed first, rather than wrapping a row or cutting
  // off its buttons. The title row: the project's name, then the account chip's words (the title keeps 72 px). The figures'
  // row: the sparkline, model and effort, the counts, the cost, the tool call (once its words are down to 120 px), the
  // context. The folder and the tool call's own words give way on their own before that.
  const titleRow = $('hudTitle'), figRow = $('hudRow');
  const TITLE_DROPS = ['#project'].map((s) => hud.querySelector(s));
  const FIG_DROPS = ['#spark', '#model', '#counts', '#cost', '#action', '#ctx'].map((s) => hud.querySelector(s));
  const over = (row) => row.scrollWidth > row.clientWidth;
  const squeezed = (node, px) => !node.hidden && !node.classList.contains('dropped') && node.clientWidth < Math.min(node.scrollWidth, px);
  function fitRow(drops, cramped) {
    for (const node of drops) node.classList.remove('dropped');
    for (const node of drops) {
      if (!cramped()) return;
      node.classList.add('dropped');
    }
  }
  function fitHud() {
    if (hud.hidden) return;
    acctEl.classList.remove('narrow');
    const titleCramped = () => over(titleRow) || squeezed(hudTitle, 72);
    fitRow(TITLE_DROPS, titleCramped);
    // The account's chip keeps its initial and chevron.
    if (!acctEl.hidden && titleCramped()) acctEl.classList.add('narrow');
    fitRow(FIG_DROPS, () => over(figRow) || squeezed(actionEl, 120));
  }
  new ResizeObserver(fitHud).observe(hud);
  // The activity sparkline: a bar for each slice of time, the busiest the full height (the Mac's SparkView).
  const drawSpark = (values) => {
    const max = Math.max(1, ...values);
    const bw = 96 / values.length;
    sparkEl.firstElementChild.innerHTML = values.map((v, x) => {
      const h = v > 0 ? Math.max(3, (v / max) * 16) : 2;
      return `<rect x="${(x * bw + 0.5).toFixed(2)}" y="${(18 - h).toFixed(2)}" width="${Math.max(0.5, bw - 1).toFixed(2)}" height="${h.toFixed(2)}" fill-opacity="${v > 0 ? 0.85 : 0.18}"/>`;
    }).join('');
  };
  // The Claude account's chip (the strip's, terminal.js drawAcct; its note stays under the pane's strip).
  const hueOf = (h) => (typeof h === 'string' && /^\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*$/.test(h) ? h : '255, 176, 87');
  const disc = (m) => `<i class="ac" style="--ah:${hueOf(m.hue)}">${esc(m.initial)}</i>`;
  const CLOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.6"/><path d="M8 4.8V8l2.2 1.4"/></svg>';
  function drawAcct(a) {
    const c = a && a.chip;
    acctEl.hidden = !c;
    if (!c) return;
    const m = c.mark;
    const low = typeof c.left === 'number' && c.left < 20;
    let words = '';
    if (c.pending) words = `<span class="sep"></span><span class="next words">${CLOCK}<span>→</span>${disc(c.pending)}<span>after this reply</span></span>`;
    else if (c.out) words = '<span class="sep"></span><span class="pct">limit</span>';
    else if (low) words = `<span class="sep"></span><span class="pct">${Math.round(c.left)}%</span>`;
    const html = `${disc(m)}<span class="lab">${esc(m.label)}</span>${words}<svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 6l4.5 4.5L12.5 6"/></svg>`;
    acctEl.style.setProperty('--ah', hueOf(m.hue));
    if (c.pending) acctEl.style.setProperty('--ah2', hueOf(c.pending.hue));
    acctEl.classList.toggle('out', !!c.out);
    acctEl.classList.toggle('pending', !!c.pending);
    tip(acctEl, `Claude account: ${m.label}${c.out ? ', out of its limit' : low ? `, ${Math.round(c.left)}% left` : ''}${c.pending ? `, moves to ${c.pending.label} when this reply ends` : ''}`);
    if (html !== acctEl.__html) acctEl.innerHTML = acctEl.__html = html;
  }
  // A linked worktree: the chip and the split button (the strip's, terminal.js drawShip; main's worktreeship.js view).
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
  const checksMark = (k) => (k === 'pass' ? WT_ICON.ok : k === 'fail' ? WT_ICON.bad : k === 'run' ? '<span class="ring"></span>' : '');
  let ship = null;
  function drawShip(v) {
    ship = v || null;
    wtEl.hidden = !v;
    shipEl.hidden = !v || !v.face;
    if (!v) return;
    const t = v.tail;
    let tail = '';
    if (t) {
      const sep = '<span class="sep"></span>';
      if (t.type === 'deleted' || t.type === 'gone') tail = `<span class="tail">${sep}<span class="gone">${t.type === 'deleted' ? 'deleted' : 'folder gone'}</span></span>`;
      else if (t.type === 'nums') tail = `<span class="tail nums">${sep}<span>+${esc(t.add)}</span><span class="del">−${esc(t.del)}</span></span>`;
      else if (t.type === 'closed') tail = `<span class="tail">${sep}<span class="pr">#${esc(t.number)} closed</span></span>`;
      else if (t.type === 'pr') tail = `<span class="tail">${sep}<span class="pr">#${esc(t.number)}${t.draft ? ' draft' : ''}</span>${t.draft ? '' : checksMark(t.checks)}</span>`;
      else if (t.type === 'merged') tail = `<span class="tail">${sep}<span class="pr">merged</span>${WT_ICON.ok}</span>`;
    }
    wtEl.innerHTML = `${WT_ICON.branch}<span class="word">worktree ·</span><span class="br">${esc(v.branch)}</span>${tail}`;
    const dim = v.deleted || v.phase === 'gone';
    wtEl.classList.toggle('dim', dim);
    wtEl.classList.toggle('flat', !dim && !v.clickable);
    wtEl.title = v.tip || '';
    wtEl.setAttribute('aria-label', v.label || '');
    if (!v.face) return;
    shipMain.innerHTML = v.busy ? `<span class="ring"></span><span>${esc(v.busy)}</span>` : `${WT_ICON[v.face.icon] || WT_ICON.pull}<span>${esc(v.face.label)}</span>`;
    shipMain.classList.toggle('busy', !!v.busy);
    shipMain.classList.toggle('off', !v.busy && !v.face.enabled);
    shipMain.title = v.busy ? '' : v.face.tip || '';
    shipMain.setAttribute('aria-label', v.busy || `${v.face.label}. ${v.face.tip || ''}`);
    shipMain.setAttribute('aria-disabled', String(!!v.busy || !v.face.enabled));
    shipMore.setAttribute('aria-label', v.more || 'More actions for this worktree');
  }
  function drawHud() {
    const h = state.hud;
    hud.hidden = !h;
    if (!h) return;
    hud.style.top = `${state.hudTop || 0}px`;
    hud.style.height = `${state.hudHeight || 32}px`;
    const i = h.info || {};
    const st = statusOf(i);
    hudStatus = st;
    hudSince = Number(i.statusSince) || 0;
    hud.style.setProperty('--st', `var(${STATUS[st][1]})`);
    // TitleRow: the hexagon, the project's name, the worktree's chip, the account's, "·", the title (a plain terminal's
    // folder), the split button, the status pill.
    const term = st === 'terminal';
    $('project').textContent = i.project || 'chat';
    const title = term ? i.cwd || '' : i.title || '';
    hudTitle.textContent = title;
    hudTitle.title = title;
    drawShip(h.ship);
    drawAcct(i.acct);
    pill.classList.toggle('waiting', st === 'waiting');
    pill.title = st === 'waiting' && typeof i.waitingFor === 'string' ? i.waitingFor : '';
    // HUDRow: with two tabs or more the context and the counts are each chip's; with split panes (`split`, the Mac's
    // hud.paneSplit) each pane's slim bar has its own figures and its own copy, env, star and ×, so the model, cost, tool
    // call, sparkline, copy, star and End go from here too, and env shows only while the env view is open.
    const split = !!h.split;
    const perTab = h.tabs > 1 || split;
    const s = i.stats;
    const brief = !term && !!i.chat;
    $('where').hidden = !term;
    $('where').textContent = term ? `terminal in ${i.cwd || ''}` : '';
    const ctx = $('ctx');
    ctx.hidden = !brief || perTab || !s;
    if (!ctx.hidden) {
      ctx.querySelector('.bar span').style.width = `${s.ctxMax > 0 ? Math.min(1, s.ctx / s.ctxMax) * 100 : 0}%`;
      ctx.querySelector('.n').textContent = fmtTok(s.ctx) + (s.ctxMax > 0 ? ` / ${fmtTok(s.ctxMax)}` : '');
    }
    const model = [i.model, i.effort].filter((x) => typeof x === 'string' && x).join(' · ');
    $('model').hidden = !brief || !model || split;
    $('model').textContent = model;
    // Only Claude's is priced: another AI tool's would be a $0 it didn't cost.
    const priced = brief && !split && !i.tool && typeof i.cost === 'number' && Number.isFinite(i.cost);
    $('cost').hidden = !priced;
    if (priced) $('cost').textContent = fmtUsd(i.cost);
    const counts = $('counts');
    counts.hidden = !brief || perTab || !s;
    if (!counts.hidden) {
      const agents = Math.trunc(Number(i.agentsRunning) || 0);
      counts.innerHTML = `<b>${esc(s.tools)}</b><i> tools · </i><b>${esc(s.web)}</b><i> web · </i><b${s.errors > 0 ? ' class="err"' : ''}>${esc(s.errors)}</b><i> err</i>` +
        (agents > 0 ? `<span class="ag"> · ⤷${agents}</span>` : '');
    }
    // The tool call it's on ("▸ Bash"), what it's doing (not in streamer mode: it can name a file or a command), how long.
    const a = brief && !split && i.action && i.action.name ? i.action : null;
    hudAction = a;
    actionEl.hidden = !a;
    if (a) {
      actionEl.style.setProperty('--cat', `var(${CAT[a.cat] || '--lavender'})`);
      actionEl.querySelector('.name').textContent = `▸ ${a.name}`;
      actionEl.querySelector('.label').textContent = i.streamer ? '' : String(a.label || '');
      actionEl.title = i.streamer ? '' : [a.name, a.label].filter(Boolean).join(' ');
    }
    $('starting').hidden = term || !!i.chat || st !== 'starting';
    $('starting').textContent = 'starting claude…';
    const spark = brief && !split && Array.isArray(i.spark) ? i.spark.map(Number).filter(Number.isFinite) : [];
    sparkEl.hidden = !spark.length;
    if (spark.length) drawSpark(spark);
    // The buttons: copy (not in a plain terminal), env, the star (one tab only), the pin, End (one tab only); in a split
    // only the pin, and env while its view is open.
    const keys = h.keys || {};
    const copy = $('copy');
    copy.hidden = term || split;
    tip(copy, `Copy the AI's last reply, all of it${keys.copyReply ? ` (${keys.copyReply})` : ''}`);
    const env = $('env');
    const envOpen = !!(h.env && h.env.open), envDirty = !!(h.env && h.env.dirty);
    env.hidden = split && !envOpen;
    env.classList.toggle('on', envOpen);
    env.classList.toggle('dirty', envDirty);
    const ek = keys.envFiles ? ` (${keys.envFiles})` : '';
    env.title = envOpen ? `Back to the terminal${ek}` : `The env files in this folder and the ones in it: open one to edit or copy from it${ek}.${envDirty ? ' It has changes not saved.' : ''}`;
    env.setAttribute('aria-label', envDirty ? 'env files, unsaved changes' : 'env files');
    const star = $('star');
    star.hidden = h.tabs >= 2 || split;
    star.classList.toggle('on', !!i.fav);
    tip(star, i.fav ? 'Remove this chat from your favorites' : 'Add this chat to your favorites in the sidebar');
    const pin = $('pin');
    pin.classList.toggle('on', !!h.pinned);
    tip(pin, h.pinned ? 'Stop keeping this window above all other apps' : 'Keep this window above all other apps');
    const end = $('end');
    end.hidden = h.tabs > 1 || split;
    tip(end, term ? 'Close this terminal' : 'End this chat and stop the AI');
    tickHud();
    fitHud();
  }
  // The bar takes no typing: the keys stay where they are on a press, a button acts for the pane with them (main gives them
  // back to it first), and a click on the bar's empty part gives them back too.
  hud.addEventListener('mousedown', (e) => e.preventDefault());
  const below = (node) => {
    const r = node.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.bottom + 2) };
  };
  hud.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return tell({ type: 'back' });
    if (b.dataset.act) return tell({ type: 'hud', act: b.dataset.act });
    if (b === acctEl) {
      acctEl.classList.add('open');
      return tell({ type: 'hud', act: 'acct', ...below(acctEl) });
    }
    if (b === wtEl) return tell(ship && ship.clickable ? { type: 'hud', act: 'shipChip' } : { type: 'back' });
    if (b === shipMain) return tell(ship && ship.face && ship.face.enabled && !ship.busy ? { type: 'hud', act: 'shipMain' } : { type: 'back' });
    if (b === shipMore) return tell({ type: 'hud', act: 'shipMore', ...below(shipMore) });
  });
  // While a menu from the bar is open its button looks pressed.
  atl.on('term:hudMenu', (m) => {
    if (!m) return;
    if (m.menu === 'acct') acctEl.classList.toggle('open', !!m.open);
    if (m.menu === 'ship') shipMore.classList.toggle('open', !!m.open);
  });

  function draw() {
    document.documentElement.style.setProperty('--bar-h', `${state.height || 30}px`);
    bar.hidden = !state.bar;
    drawHud();
    // Chips are kept while one is being pressed or dragged: rebuilding it would drop the chip the press began on.
    if (drag && !drag.finished) redrawLater = true;
    else if (editing < 0) drawChips();
    // A gap being dragged is kept: the layout under it changes as it moves.
    if (!gaps.querySelector('.drag')) drawGaps();
    else {
      [...gaps.children].forEach((g, i) => {
        const d = state.dividers[i];
        if (d) Object.assign(g.style, { left: `${d.x}px`, top: `${d.y}px`, width: `${d.width}px`, height: `${d.height}px` });
      });
    }
    fit();
  }

  atl.on('term:tabs', (s) => {
    if (!s || !Array.isArray(s.tabs)) return;
    state = s;
    draw();
  });
  // Rename Tab… from the chip's menu.
  atl.on('term:tabsRename', (i) => Number.isInteger(i) && rename(i));
  tell({ type: 'ready' });
})();
