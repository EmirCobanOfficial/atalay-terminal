'use strict';
// A terminal window's tab bar and the gaps between its split panes (main.js's frames), the Mac's PaneTabBar: a chip for each
// tab with its number, a dot while its AI works or needs you, its name and the AI's context. A click picks it, a double
// click renames it in place, a right click opens its menu (the app's), × ends it. When the chips don't fit at their least
// width the bar scrolls sideways and » lists them all. The terminals are views over this page: it shows only in the bar
// and in the gaps, where a divider is dragged.
(() => {
  const bar = document.getElementById('bar');
  const chips = document.getElementById('chips');
  const more = document.getElementById('more');
  const gaps = document.getElementById('gaps');
  let state = { tabs: [], active: 0, bar: false, dividers: [], height: 30 };
  let editing = -1;
  const tell = (q) => atl.send('term:tabs', q);

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

  // The tab in front stays in view, and » shows while the chips overflow.
  function fit() {
    const over = chips.scrollWidth > chips.clientWidth + 1;
    more.hidden = !over;
    const on = chips.children[state.active];
    if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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
    if (editing < 0) drawChips();
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
