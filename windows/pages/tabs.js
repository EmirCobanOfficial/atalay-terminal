'use strict';
// A terminal window's tab bar and the gaps between its split panes (main.js's frames), the Mac's PaneTabBar: a chip for each
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
  let state = { tabs: [], active: 0, bar: false, dividers: [], height: 30 };
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

  function draw() {
    document.documentElement.style.setProperty('--bar-h', `${state.height || 30}px`);
    bar.hidden = !state.bar;
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
