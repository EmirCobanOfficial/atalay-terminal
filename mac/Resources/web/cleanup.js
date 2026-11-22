'use strict';
// Clean Up (araştırma/cleanup/SPEC.md; the app's side is Cleanup.swift and MemoryWatch.swift): the calm line on the map when the
// Mac runs low on memory, and the view in the middle of the dashboard that lists what an AI chat, a terminal or a finished
// worktree holds, ticks what to close, names every item in a summary and ends them on one click. The page only draws and asks:
// the app decides what is listed, what is ticked and whether the line shows, and does every ending itself (and never one
// nobody clicked). The same file runs in the Windows app, which answers the same messages.
window.Cleanup = (() => {
  const WIN = window.__platform === 'win32';
  const MACHINE = WIN ? 'PC' : 'Mac';
  const TRASH = WIN ? 'Recycle Bin' : 'Trash';
  const ACTIVITY = WIN ? 'Task Manager' : 'Activity Monitor';
  const OSNAME = WIN ? 'Windows' : 'macOS';
  const M = 60e3, H = 3600e3, D = 24 * H;
  const GiB = 1073741824, MiB = 1048576;
  const SVG = {
    chip: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3.5" y="3.5" width="9" height="9" rx="1.6"/><rect x="6" y="6" width="4" height="4" rx=".6"/><path d="M6 1.5v2M10 1.5v2M6 12.5v2M10 12.5v2M1.5 6h2M1.5 10h2M12.5 6h2M12.5 10h2"/></svg>',
    x: '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2 2l6 6M8 2 2 8"/></svg>',
    sparkle: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><path d="M7 1.8 8.3 5.7 12.2 7 8.3 8.3 7 12.2 5.7 8.3 1.8 7 5.7 5.7z"/><path d="M12.6 10.6l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z"/></svg>',
    chats: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M3 3h10a1.5 1.5 0 0 1 1.5 1.5v5.5A1.5 1.5 0 0 1 13 11.5H8.2L5 14v-2.5H3A1.5 1.5 0 0 1 1.5 10V4.5A1.5 1.5 0 0 1 3 3z"/></svg>',
    gear: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="8" cy="8" r="2.3"/><path d="M8 1.6v2.1M8 12.3v2.1M1.6 8h2.1M12.3 8h2.1M3.5 3.5l1.5 1.5M11 11l1.5 1.5M3.5 12.5 5 11M11 5l1.5-1.5"/></svg>',
    branch: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="4.5" cy="3.5" r="1.7"/><circle cx="4.5" cy="12.5" r="1.7"/><circle cx="11.5" cy="5.5" r="1.7"/><path d="M4.5 5.2v5.6M11.5 7.2c0 2.6-2.2 3.2-5.4 4"/></svg>',
    claude: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M8 1.8v12.4M1.8 8h12.4M3.6 3.6l8.8 8.8M12.4 3.6l-8.8 8.8"/></svg>',
    cursor: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M8 1.6 13.6 4.8v6.4L8 14.4 2.4 11.2V4.8z"/><path d="M8 8 2.4 4.8M8 8l5.6-3.2M8 8v6.4"/></svg>',
    codex: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M8 1.6 13.6 4.8v6.4L8 14.4 2.4 11.2V4.8z"/><path d="M5.6 6.6 7.4 8 5.6 9.4M8.6 9.6h2"/></svg>',
    agy: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 10.5 8 6l4.5 4.5"/><ellipse cx="8" cy="8" rx="6.4" ry="2.6" transform="rotate(-20 8 8)" opacity=".6"/></svg>',
    test: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M6 1.8h4M6.6 1.8v4.3L2.9 12.4a1.2 1.2 0 0 0 1 1.8h8.2a1.2 1.2 0 0 0 1-1.8L9.4 6.1V1.8"/><path d="M4.6 9.6h6.8"/></svg>',
    server: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="2" y="2.5" width="12" height="4.5" rx="1.2"/><rect x="2" y="9" width="12" height="4.5" rx="1.2"/><path d="M4.6 4.75h.01M4.6 11.25h.01M7 4.75h4.4M7 11.25h4.4"/></svg>',
    browser: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="1.8" y="2.5" width="12.4" height="11" rx="1.6"/><path d="M1.8 5.8h12.4M4.2 4.15h.01M6.2 4.15h.01"/></svg>',
    flame: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M8 14.4c2.8 0 4.6-1.9 4.6-4.4 0-3.3-3-4.6-2.9-8.2C7.4 3 5.8 5 6.1 7.3 5.1 6.9 4.6 6 4.6 5c-1 1-1.2 2.6-1.2 3.6 0 3.3 2 5.8 4.6 5.8z"/></svg>',
    check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.2 8.4 6.5 11.6 12.8 4.6"/></svg>',
    warn: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M8 2.2 14.4 13.4H1.6z"/><path d="M8 6.6v3M8 11.6h.01"/></svg>',
    trash: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.6 4.2h10.8M6.2 4.2V2.6h3.6v1.6M4 4.2l.7 9.2h6.6l.7-9.2"/></svg>',
    resume: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h10a1.5 1.5 0 0 1 1.5 1.5v5.5A1.5 1.5 0 0 1 13 11.5H8.2L5 14v-2.5H3A1.5 1.5 0 0 1 1.5 10V4.5A1.5 1.5 0 0 1 3 3z"/><path d="M6.6 5.6 9.4 7.3 6.6 9z"/></svg>',
    log: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 2.2h5.6L12.4 5v8.8H4z"/><path d="M6.2 7.4h4M6.2 9.8h4M6.2 12h2.4"/></svg>',
    inuse: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="3.4" y="7" width="9.2" height="7" rx="1.4"/><path d="M5.6 7V5a2.4 2.4 0 0 1 4.8 0v2"/></svg>',
  };

  const send = (msg) => {
    try { window.webkit.messageHandlers.radar.postMessage(msg); } catch {}
  };
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // ---------- what the app sent, and what is ticked ----------
  let DATA = null;            // { mem, chats, programs, worktrees, measuring } (Cleanup.swift listJSON)
  let MEM = null;             // the line's short status { pressure, swap, reclaim, show }
  let open = false;
  let phase = 'pick';         // pick | run | done
  let sheet = false;
  const sel = new Set();      // ids (a chat's session, a program's pid:started, a worktree's folder)
  const manual = new Set();   // ids the user ticked or unticked: they never come back by themselves
  const auto = new Set();     // ids whose tick-by-itself was applied already
  const steps = new Map();    // id -> { s: 'now' | 'done' | 'bad' | 'gone' | 'use', text }
  const kinds = new Map();    // id -> chat | program | worktree
  let plan = [];              // what this run does, in the order of SPEC 9
  let freed = 0, trashed = 0;
  let pressed = false, deferred = false;
  let held = null;            // a list that came while the summary was open: it waits (the summary names what it names)
  let heard = '';             // the last thing said to the screen reader

  const fmt = (b, disk) => {
    const g = disk ? b / 1e9 : b / GiB;
    if (g >= 1) return `${g >= 10 ? Math.round(g) : g.toFixed(1)} GB`;
    const m = disk ? b / 1e6 : b / MiB;
    return `${Math.max(1, Math.round(m))} MB`;
  };
  const fmtSz = (b, disk) => { const s = fmt(b, disk).split(' '); return `${s[0]} <small>${s[1]}</small>`; };
  const span = (ms) => {
    if (ms >= 2 * D) return `${Math.round(ms / D)} days`;
    if (ms >= D) return 'a day';
    if (ms >= 2 * H) return `${Math.round(ms / H)} hours`;
    if (ms >= H) return 'an hour';
    const m = Math.round(ms / M);
    return m <= 1 ? 'a minute' : `${m} minutes`;
  };
  const idleWords = (ms) => `Idle for ${span(ms)}`;
  const ago = (ms) => (ms >= 14 * D ? `${Math.round(ms / (7 * D))} weeks ago` : ms >= 2 * D ? `${Math.round(ms / D)} days ago` : ms >= D ? 'yesterday' : ms >= 2 * H ? `${Math.round(ms / H)} hours ago` : 'an hour ago');

  const chats = () => (DATA ? DATA.chats : []);
  const progs = () => (DATA ? DATA.programs : []);
  const wts = () => (DATA ? DATA.worktrees : []);
  const chat = (id) => chats().find((c) => c.id === id);
  const aiKey = (c) => c.aiKey || (c.ai === 'Codex' ? 'codex' : c.ai === 'Antigravity' ? 'agy' : c.ai === 'Cursor' ? 'cursor' : 'claude');

  // what can be ticked (SPEC 6.3)
  const chatFree = (c) => c.status === 'idle' && !c.blocker;
  const progLocked = (p) => !!(p.chat && sel.has(p.chat));              // ends with its chat
  const wtUsers = (w) => (w.users || []).filter((u) => chat(u));
  const wtFree = (w) => w.state !== 'checking' && w.state !== 'unknown' && w.state !== 'locked' && !w.detail && wtUsers(w).every((u) => sel.has(u));
  const wtOff = (w) => ['checking', 'unknown', 'locked'].includes(w.state) || !!w.detail || (wtUsers(w).length > 0 && !wtFree(w));
  const progOff = () => false;

  // The tick-by-itself rules are the app's (`pre`); a row gets it once, and what the user changed stays as they left it.
  function adopt() {
    const live = new Set();
    for (const c of chats()) { live.add(c.id); kinds.set(c.id, 'chat'); }
    for (const p of progs()) { live.add(p.id); kinds.set(p.id, 'program'); }
    for (const w of wts()) { live.add(w.id); kinds.set(w.id, 'worktree'); }
    for (const id of [...sel]) if (!live.has(id)) sel.delete(id);
    if (phase !== 'pick') return;
    const said = [];
    for (const c of chats()) {
      if (c.status !== 'idle' && sel.has(c.id)) {
        sel.delete(c.id);
        said.push(`${c.title} ${c.status === 'busy' ? 'started working' : 'is waiting for you'}, so it was unticked.`);
      }
      if (c.pre && !auto.has(c.id)) { auto.add(c.id); if (!manual.has(c.id) && chatFree(c)) sel.add(c.id); }
    }
    for (const p of progs()) if (p.pre && !auto.has(p.id)) { auto.add(p.id); if (!manual.has(p.id)) sel.add(p.id); }
    for (const w of wts()) if (w.pre && !auto.has(w.id)) { auto.add(w.id); if (!manual.has(w.id)) sel.add(w.id); }
    // a worktree whose chat is unticked goes back to "in use"
    for (const w of wts()) if (sel.has(w.id) && !wtFree(w)) sel.delete(w.id);
    if (said.length) say(said[0]);
  }

  function totals() {
    let mem = 0, disk = 0, n = 0, c = 0, p = 0, w = 0, unknownSize = 0;
    for (const x of chats()) if (sel.has(x.id) && chatFree(x)) { mem += x.mem; n++; c++; }
    for (const x of progs()) if (sel.has(x.id) && !progLocked(x)) { mem += x.mem; n++; p++; }
    for (const x of wts()) if (sel.has(x.id) && wtFree(x)) { if (x.size == null) unknownSize++; else disk += x.size; n++; w++; }
    return { mem, disk, n, chats: c, progs: p, wts: w, unknownSize };
  }

  // ---------- say it to a screen reader ----------
  function say(t) {
    const el = $('#cu-live');
    if (!el || t === heard) return;
    heard = t;
    el.textContent = t;
  }

  // ====================================================================================================================
  // The memory line on the map
  // ====================================================================================================================
  function party() { return $('#party')?.getAttribute('aria-checked') === 'true'; }

  function stripHTML(out, m) {
    const sw = m.swap >= GiB ? `<span class="cu-num">${fmt(m.swap)}</span> had to go onto the disk. ` : '';
    return `<div class="cu-strip${out ? ' out' : ''}" role="status" aria-label="Memory">` +
      `<button type="button" class="x" title="Hide until it gets worse" aria-label="Hide">${SVG.x}</button>` +
      `<span class="ico" aria-hidden="true">${SVG.chip}</span>` +
      `<span class="txt"><b>${out ? `Your ${MACHINE} is almost out of memory` : `Your ${MACHINE} is running low on memory`}</b>` +
      `<span>${sw}Chats and programs you aren’t using hold <span class="cu-num">${fmt(m.reclaim || 0)}</span>.</span></span>` +
      '<button type="button" class="go" data-go="view">Clean Up…</button></div>';
  }

  let stripOn = false;
  function renderStrip() {
    const wrap = $('#mapwrap');
    if (!wrap) return;
    const want = !!(MEM && MEM.show) && !open && !party();
    const cur = wrap.querySelector('.cu-strip');
    if (!want) {
      if (cur && !cur.classList.contains('leaving')) {
        cur.classList.add('leaving');
        setTimeout(() => cur.remove(), 160);
      }
      stripOn = false;
      return;
    }
    const out = MEM.pressure === 'out';
    const html = stripHTML(out, MEM);
    if (cur && !cur.classList.contains('leaving')) {
      if (cur.__h !== html) {
        const el = document.createElement('div');
        el.innerHTML = html;
        const next = el.firstChild;
        next.style.animation = 'none';
        next.__h = html;
        cur.replaceWith(next);
      }
    } else {
      const el = document.createElement('div');
      el.innerHTML = html;
      el.firstChild.__h = html;
      wrap.appendChild(el.firstChild);
    }
    if (!stripOn) say(`Your ${MACHINE} is ${out ? 'almost out of' : 'running low on'} memory. Clean Up can free ${fmt(MEM.reclaim || 0)}.`);
    stripOn = true;
  }

  function memory(m) {
    MEM = m;
    renderStrip();
  }

  // ====================================================================================================================
  // The view
  // ====================================================================================================================
  function heroHTML() {
    const mm = DATA.mem;
    if (phase === 'done') {
      const bad = [...steps.values()].filter((s) => s.s === 'bad' || s.s === 'use').length;
      return `<section class="cu-hero fine" aria-labelledby="cu-h"><div class="cu-done"><span class="ring">${SVG.check}</span><div>` +
        '<div class="cu-eyebrow">Clean up · done</div>' +
        `<h2 id="cu-h">Freed <span class="cu-count" data-n="${freed}">${fmt(freed)}</span> of memory</h2>` +
        `<p class="cu-lead">${trashed ? `${fmt(trashed, true)} of worktrees is in the ${TRASH}. Empty the ${TRASH} to get that disk space back.` : `Nothing went to the ${TRASH}.`}` +
        `${bad ? (bad === 1 ? ' One didn’t work; it’s marked below.' : ` ${bad} didn’t work; they’re marked below.`) : ''}</p>` +
        '<p class="cu-lead">What’s on the disk clears as your ' + MACHINE + ' needs that memory again.</p></div></div>' + meterHTML() + '</section>';
    }
    const word = mm.pressure;
    const fine = word === 'fine', out = word === 'out';
    const some = chats().some(chatFree) || progs().length || wts().length;
    const title = fine ? `Your ${MACHINE} has enough memory` : out ? `Your ${MACHINE} is almost out of memory` : `Your ${MACHINE} is running low on memory`;
    const lead = fine
      ? (some ? `Nothing is slowing it down. You can still end old chats${WIN ? '' : ' and remove finished worktrees'}.` : 'Nothing is slowing it down.')
      : `When memory runs out, your ${MACHINE} uses the disk instead, and everything gets slower. ${fmt(mm.swap)} is there now. Close what you aren’t using.`;
    const badge = fine ? 'Memory is fine' : out ? 'Almost out' : 'Low on memory';
    const others = (mm.others || []).length
      ? `Other apps: ${mm.others.map(([n, b]) => `<b>${esc(n)}</b> ${fmt(b)}`).join(' · ')}. Orbiterm never closes other apps. `
      : 'Orbiterm never closes other apps. ';
    return `<section class="cu-hero${fine ? ' fine' : out ? ' out' : ''}" aria-labelledby="cu-h">` +
      `<div class="cu-eyebrow">Memory<span class="cu-press"><i></i>${badge}</span></div>` +
      `<h2 id="cu-h">${title}</h2><p class="cu-lead">${lead}</p>${meterHTML()}` +
      `<p class="cu-others">${others}<button type="button" class="wt-link" data-act="am">Open ${ACTIVITY}</button></p></section>`;
  }

  function meterHTML() {
    // The picture: memory as a box (RAM); what didn't fit, past its wall, on the disk. Proportional; the numbers are measured.
    const mm = DATA.mem, ram = mm.ram || 1;
    const orb = mm.orb, oth = mm.oth;
    const f = orb + oth ? Math.min(1, mm.appc / (orb + oth)) : 1;
    const parts = [orb * f, oth * f, Math.max(0, mm.sys)];
    const segW = parts.map((p) => (p / ram) * 100);
    const swapBig = mm.swap >= GiB;
    const W = swapBig ? (100 * ram) / (ram + Math.min(mm.swap, ram)) : 100; // % of the track that is memory
    const t = totals(), pick = phase === 'pick' ? Math.min(t.mem, orb) : 0;
    const pickPct = orb ? (pick / orb) * 100 : 0;
    const pickCenter = segW[0] - (segW[0] * pickPct) / 200;
    const disk = swapBig
      ? `<span class="cu-wall" data-l="${fmt(ram)} · all of your ${MACHINE}’s memory" data-s="${fmt(ram)}"></span><span class="cu-disk" style="width:calc(${100 - W}% - 0.875rem)" data-l="On the disk"></span>`
      : '';
    return `<div class="cu-meter" role="img" aria-label="Memory: chats and programs ${fmt(orb)}, other apps ${fmt(oth)}, ${OSNAME} ${fmt(mm.sys)}${swapBig ? `, ${fmt(mm.swap)} on the disk` : ''}">` +
      `<div class="cu-track"><div class="cu-ram" style="width:${W}%">` +
      `<span class="cu-seg orb" style="width:${segW[0]}%"><span class="cu-pick" style="width:${pickPct}%"></span></span>` +
      `<span class="cu-seg oth" style="width:${segW[1]}%"></span><span class="cu-seg sys" style="width:${segW[2]}%"></span></div>${disk}` +
      (pick ? `<span class="cu-picktag" style="left:calc(${(pickCenter * W) / 100}%)">−${fmt(pick)}</span>` : '') + '</div>' +
      `<ul class="cu-legend"><li><i class="orb"></i>Chats and programs <b>${fmt(orb)}</b></li><li><i class="oth"></i>Other apps <b>${fmt(oth)}</b></li>` +
      `<li><i class="sys"></i>${OSNAME} <b>${fmt(mm.sys)}</b></li><li><i class="free"></i>Free <b>${fmt(mm.free)}</b></li>` +
      (swapBig ? `<li><i class="disk"></i>On the disk <b>${fmt(mm.swap)}</b></li>` : '') + '</ul></div>';
  }

  function stepHTML(id, verb) {
    const st = steps.get(id);
    if (!st) return null;
    const words = { end: ['Ending…', 'Ended', 'Didn’t stop'], stop: ['Stopping…', 'Stopped', 'Didn’t stop'], trash: ['Moving…', `In the ${TRASH}`, 'Couldn’t move'] }[verb];
    let cls = st.s, word;
    if (st.s === 'now') word = words[0];
    else if (st.s === 'done') word = words[1];
    else if (st.s === 'gone') { cls = 'done'; word = 'Already gone'; }
    else if (st.s === 'use') { cls = 'bad'; word = 'Still in use'; }
    else word = words[2];
    return `<span class="cu-step ${cls}"><span class="dot"></span>${word}${cls === 'bad' ? '<button type="button" class="wt-link" data-act="retry">Try Again</button>' : ''}</span>`;
  }

  function rowHTML({ id, tile, tileCls = '', title, d, k, st, size, disk, off, checked, verb, reason }) {
    const step = stepHTML(id, verb);
    const gone = steps.get(id)?.s === 'done' || steps.get(id)?.s === 'gone';
    const dis = off || phase !== 'pick';
    const sizeHTML = size == null ? (disk ? '<span class="cu-skel"></span>' : '—') : fmtSz(size, disk);
    return `<label class="cu-row${checked ? ' on' : ''}${off ? ' off' : ''}${gone ? ' gone' : ''}" data-id="${esc(id)}">` +
      `<input type="checkbox" class="cu-cb" ${checked ? 'checked' : ''} ${dis ? 'disabled' : ''} aria-describedby="${esc(id)}-d"${reason ? ` aria-label="${esc(title)}. ${esc(reason)}"` : ''}>` +
      `<span class="cu-tile ${tileCls}" aria-hidden="true">${tile}</span>` +
      `<span class="cu-t"><b>${esc(title)}</b><span class="d" id="${esc(id)}-d">${d}</span>${k ? `<span class="d k">${k}</span>` : ''}</span>` +
      `<span class="cu-st${step ? '' : st.cls ? ' ' + st.cls : ''}">${step || st.html}</span>` +
      `<span class="cu-size">${sizeHTML}</span></label>`;
  }

  function chatRow(c) {
    const free = chatFree(c);
    let st = { html: '' };
    if (c.status === 'busy') st = { html: '<span class="pill busy">WORKING</span>' };
    if (c.status === 'waiting') st = { html: '<span class="pill waiting">NEEDS YOU</span>' };
    const wt = c.wt ? ` · <span class="wt">⎇ ${esc(c.wt)}</span>` : '';
    const when = c.blocker ? `${c.blocker}, so it can’t be ended here` : c.status === 'idle' ? idleWords(c.idleMs) : c.status === 'busy' ? 'Working now, so it can’t be ended here' : 'Waiting for you, so it can’t be ended here';
    const kids = c.kids && (c.kids.length > 1 || (c.kids[0] && c.kids[0][0] !== c.ai)) ? c.kids.map(([n, b]) => `<span>${esc(n)} <i>${fmt(b)}</i></span>`).join('') : '';
    return rowHTML({
      id: c.id, tile: SVG[aiKey(c)], tileCls: aiKey(c), title: c.title,
      d: `<em>${esc(c.ai)}</em> · ${esc(c.folder)}${wt} · ${when}`, k: kids, st, size: c.mem,
      off: !free, checked: sel.has(c.id), verb: 'end', reason: free ? '' : when,
    });
  }

  function progRow(p) {
    const locked = progLocked(p);
    const owner = p.chat ? chat(p.chat) : null;
    let st = { html: p.ports && p.ports.length ? p.ports.map((x) => `<span class="cu-port">:${x}</span>`).join(' ') : '' };
    if (locked) st = { cls: 'with', html: 'Ends with its chat' };
    else if (p.note) st = { cls: 'warn', html: `${SVG.warn}${esc(p.note)}` };
    const cpu = p.busy ? `Busy · ${p.cpu}% CPU` : `Quiet for ${span(p.quietMs || 0)}`;
    let d;
    if (p.where) d = `${esc(p.where)} · ${esc(p.folder)}`;
    else if (owner) d = `In “${esc(owner.title)}” · ${esc(owner.folder)} · ${cpu}`;
    else d = `In a terminal · ${esc(p.folder)} · ${cpu}`;
    return rowHTML({ id: p.id, tile: SVG[p.kind] || SVG.gear, tileCls: p.burn ? 'burn' : '', title: p.name, d, k: p.extra ? esc(p.extra) : '', st, size: p.mem, checked: sel.has(p.id) || locked, off: locked, verb: 'stop' });
  }

  function wtRow(w) {
    const users = wtUsers(w), free = wtFree(w), off = wtOff(w);
    let st, d = `${esc(w.repo)} · ${w.lastMs != null ? `last change ${ago(w.lastMs)}` : 'last change unknown'}`;
    if (w.state === 'gone') st = { cls: 'ok', html: `${SVG.check}Its folder is already gone` };
    else if (w.state === 'locked') st = { html: `${SVG.inuse}Git has it locked` };
    else if (w.detail) { st = { html: `${SVG.inuse}In use` }; d = `${esc(w.repo)} · ${esc(w.detail)}`; }
    else if (w.state === 'checking') st = { html: 'Checking…' };
    else if (w.state === 'unknown') st = { cls: 'warn', html: `${SVG.warn}${esc(w.st)}` };
    else if (users.length && !free) { st = { html: `${SVG.inuse}In use` }; d = `${esc(w.repo)} · ${esc(chat(users[0]).ai)} is open in it`; }
    else if (users.length && free) st = { cls: 'with', html: 'Free once its chat ends' };
    else if (w.state === 'done') st = { cls: 'ok', html: `${SVG.check}${esc(w.st)}` };
    else st = { cls: 'warn', html: `${SVG.warn}${esc(w.st)}` };
    const reason = w.state === 'locked' ? 'Git has it locked' : w.detail ? 'In use' : w.state === 'checking' ? 'Checking' : w.state === 'unknown' ? w.st : users.length && !free ? 'In use' : '';
    return rowHTML({ id: w.id, tile: SVG.branch, title: w.branch || (w.id.split('/').pop()), d, st, size: w.state === 'gone' ? undefined : w.size, disk: true, off, checked: sel.has(w.id) && free, verb: 'trash', reason });
  }

  function groupHTML(key, icon, title, sub, rows, sumHTML) {
    if (!rows.length) return '';
    return `<section class="cu-group" data-g="${key}" aria-labelledby="g-${key}"><div class="cu-gh">` +
      `<input type="checkbox" class="cu-cb" data-all="${key}" aria-label="Tick all ${title.toLowerCase()}" ${phase !== 'pick' ? 'disabled' : ''}>` +
      `<span class="wt-ico" aria-hidden="true">${icon}</span><div><h3 id="g-${key}">${title}</h3><p>${sub}</p></div><div class="cu-gsum">${sumHTML}</div></div>` +
      `<div class="cu-rows" role="list">${rows.join('')}</div></section>`;
  }

  function viewHTML() {
    if (!DATA) return `<section class="panel cv-cleanup"><header><span class="tag">clean.up</span><span class="meta">…</span></header><div class="body cu-body"></div></section>`;
    const t = totals();
    const done = phase === 'done';
    const gs = (v, disk, w) => (v ? `<b>${fmt(v, disk)}</b>${w}` : '<b>—</b>nothing ticked');
    const ok = (id) => !done || ['done', 'gone'].includes(steps.get(id)?.s);
    const chatMem = chats().filter((c) => sel.has(c.id) && ok(c.id)).reduce((a, c) => a + c.mem, 0);
    const progMem = progs().filter((p) => sel.has(p.id) && !progLocked(p) && ok(p.id)).reduce((a, p) => a + p.mem, 0);
    const wtList = wts();
    const measuring = DATA.measuring || wtList.some((w) => w.state !== 'gone' && w.size == null);
    const groups =
      groupHTML('chats', SVG.chats, 'Chats', 'Ending a chat frees its memory. It stays in your chats list, so you can pick it up later.', chats().map(chatRow), gs(chatMem, false, done ? 'freed' : 'frees')) +
      groupHTML('programs', SVG.gear, 'Programs', 'Test runs, dev servers and browsers your chats or terminals started. Stopping one leaves its chat open.', progs().map(progRow), gs(progMem, false, done ? 'freed' : 'frees')) +
      groupHTML('worktrees', SVG.branch, 'Worktrees', `Extra copies of a project for side work. Removing one moves its folder to the ${TRASH}. Its branch stays.`, wtList.map(wtRow),
        measuring && !done ? '<b><span class="cu-skel"></span></b>measuring' : gs(t.disk, true, done ? `in the ${TRASH}` : 'of disk'));
    const empty = !chats().some(chatFree) && !progs().length && !wtList.length && phase === 'pick';
    const body = heroHTML() + (empty
      ? '<section class="cu-empty"><svg viewBox="0 0 192 120" aria-hidden="true"><defs><radialGradient id="pl" cx="35%" cy="30%"><stop offset="0" stop-color="#ffd9a8"/><stop offset=".45" stop-color="#ffb057"/><stop offset="1" stop-color="#f88008"/></radialGradient></defs>' +
        '<ellipse cx="96" cy="60" rx="78" ry="26" fill="none" stroke="rgba(248,128,8,.35)" stroke-width="1.5"/><ellipse cx="96" cy="60" rx="92" ry="34" fill="none" stroke="rgba(248,128,8,.15)" stroke-dasharray="3 5"/>' +
        '<circle cx="96" cy="60" r="22" fill="url(#pl)"/><path d="M93 50l1.8 5.2 5.2 1.8-5.2 1.8L93 64l-1.8-5.2L86 57l5.2-1.8z" fill="#1a0d00"/><circle class="cu-ember" r="3.2" fill="#ffd23f"/></svg>' +
        // The Windows app lists no worktrees (yet): it doesn't promise them.
        `<h3>Nothing to clean up</h3><p>${WIN ? 'No idle chats or leftover programs right now.' : 'No idle chats, leftover programs or finished worktrees right now.'}</p></section>`
      : groups);
    const n = chats().length + progs().length + wtList.length;
    const meta = empty ? 'all tidy' : `${n} listed · ${DATA.mem.pressure === 'fine' ? 'memory is fine' : `${fmt(DATA.mem.swap)} on the disk`}`;
    return `<section class="panel cv-cleanup"><header><span class="tag">clean.up</span><span class="meta">${meta}</span></header>` +
      `<div class="body cu-body"><div class="cu-scroll"><div class="cu-in">${body}</div></div>${empty ? '' : barHTML(t)}</div></section>`;
  }

  function failText() {
    for (const st of steps.values()) if ((st.s === 'bad' || st.s === 'use') && st.text) return st.text;
    return 'Try again in a moment.';
  }

  function barHTML(t) {
    if (phase === 'run') {
      const done = plan.filter((id) => !['now'].includes(steps.get(id)?.s || '')).filter((id) => steps.has(id)).length;
      return `<div class="cu-bar" style="--p:${(done / Math.max(1, plan.length)) * 100}%"><span class="cu-prog"></span><p class="cu-sum"><b>Cleaning up…</b> ${done} of ${plan.length}</p>` +
        '<div class="cu-acts"><button type="button" class="wt-btn glass" data-act="halt">Stop After This One</button><button type="button" class="wt-btn go" disabled>Cleaning Up…</button></div></div>';
    }
    if (phase === 'done') {
      const bad = plan.filter((id) => ['bad', 'use'].includes(steps.get(id)?.s)).length, okN = plan.length - bad;
      return `<div class="cu-bar" role="${bad ? 'alert' : 'status'}"><p class="cu-sum">${bad ? `<b>${okN} of ${plan.length} cleaned up.</b> ${esc(failText())}` : `<b>Done.</b> ${okN} cleaned up. Every step is in the log.`}</p>` +
        `<div class="cu-acts"><button type="button" class="wt-btn glass" data-act="log">${SVG.log} Show Log</button>` +
        (bad ? '<button type="button" class="wt-btn glass" data-act="back">Back to Dashboard</button><button type="button" class="wt-btn go" data-act="retry">Try Again</button>'
          : '<button type="button" class="wt-btn go" data-act="back">Back to Dashboard</button>') + '</div></div>';
    }
    const parts = [];
    if (t.mem) parts.push(`frees about <span class="cu-num">${fmt(t.mem)}</span> of memory`);
    if (t.wts) parts.push(t.unknownSize ? `${t.wts} worktree${t.wts === 1 ? '' : 's'} go${t.wts === 1 ? 'es' : ''} to the ${TRASH} (still measuring)` : `<span class="cu-num">${fmt(t.disk, true)}</span> of worktrees goes to the ${TRASH}`);
    return `<div class="cu-bar"><p class="cu-sum">${t.n ? `<b>${t.n} ticked</b> · ${parts.join(' · ')}` : '<b>Nothing ticked.</b> Tick what you want to close.'}</p>` +
      `<div class="cu-acts"><button type="button" class="wt-btn go" data-act="confirm" ${t.n ? '' : 'disabled'}>Clean Up…</button></div></div>`;
  }

  // ====================================================================================================================
  // The summary: every item by name, before anything happens
  // ====================================================================================================================
  const pickedChats = () => chats().filter((c) => sel.has(c.id) && chatFree(c));
  const pickedProgs = () => progs().filter((p) => sel.has(p.id) && !progLocked(p));
  const pickedWts = () => wts().filter((w) => sel.has(w.id) && wtFree(w));

  function sheetHTML() {
    const t = totals();
    const cs = pickedChats(), ps = pickedProgs(), ws = pickedWts();
    const sec = (h, sum, items) => (items.length ? `<section class="cu-sec"><h4>${h}<span>${sum}</span></h4><ul>${items.join('')}</ul></section>` : '');
    const notDone = ws.filter((w) => w.state === 'work' || (wtUsers(w).length && w.warn));
    const notes = [];
    if (cs.length) notes.push(`<p class="wt-note">${SVG.resume}<span>${cs.length === 1 ? 'The chat stays' : 'The chats stay'} in your chats list. Open one to pick up where you left off.</span></p>`);
    // Windows asks only a program with a window to close (a console one has nothing to hear it): the rest stop at once.
    if (ps.length) notes.push(`<p class="wt-note">${SVG.gear}<span>${WIN ? 'Programs with a window are asked to close first. The rest stop at once.' : 'Programs get a few seconds to stop on their own first.'}</span></p>`);
    if (ws.length) notes.push(`<p class="wt-note">${SVG.trash}<span>Worktree folders go to the ${TRASH}. You can put them back from there. <b>Branches stay.</b></span></p>`);
    for (const w of notDone) {
      const files = w.files || (w.warn && w.warn.files) || 0, commits = w.commits || (w.warn && w.warn.commits) || 0;
      notes.push(`<p class="wt-note warn">${SVG.warn}<span><b>${esc(w.branch || w.id.split('/').pop())}</b>: ${files ? `${files} file${files === 1 ? '' : 's'} ${files === 1 ? 'isn’t' : 'aren’t'} committed. ${files === 1 ? 'It goes' : 'They go'} to the ${TRASH} with the folder.` : `its commits stay on the ${esc(w.branch || 'branch')} branch.`}</span></p>`);
      void commits;
    }
    const sub = [t.mem ? `Frees about ${fmt(t.mem)} of memory` : '', t.disk ? `${fmt(t.disk, true)} of worktrees goes to the ${TRASH}` : t.wts ? `${t.wts} worktree${t.wts === 1 ? '' : 's'} go${t.wts === 1 ? 'es' : ''} to the ${TRASH} (still measuring)` : ''].filter(Boolean).join(' · ');
    return `<div class="wt-alone cu-sheet on" role="presentation"><div class="wt ship" role="dialog" aria-modal="true" aria-labelledby="cs-t" aria-describedby="cs-s"><div class="wt-card">` +
      `<div class="wt-head"><span class="wt-ico">${SVG.sparkle}</span><div><h2 class="wt-t" id="cs-t">Clean up ${t.n} item${t.n === 1 ? '' : 's'}?</h2><p class="wt-sub" id="cs-s">${sub}</p></div></div>` +
      '<div class="cu-list">' +
      sec(`End ${cs.length} chat${cs.length === 1 ? '' : 's'}`, fmt(cs.reduce((a, c) => a + c.mem, 0)), cs.flatMap((c) => [`<li><b>${esc(c.title)}</b><span>${esc(c.ai)} · ${esc(c.folder)}</span><code>${fmt(c.mem)}</code></li>`, ...progs().filter((p) => p.chat === c.id).map((p) => `<li><b>${esc(p.name)}</b><span>stops with it</span><code></code></li>`)])) +
      sec(`Stop ${ps.length} program${ps.length === 1 ? '' : 's'}`, fmt(ps.reduce((a, p) => a + p.mem, 0)), ps.map((p) => `<li><b>${esc(p.name)}</b><span>${esc((p.chat && chat(p.chat)?.folder) || p.folder)}</span><code>${fmt(p.mem)}</code></li>`)) +
      sec(`Move ${ws.length} worktree${ws.length === 1 ? '' : 's'} to the ${TRASH}`, ws.some((w) => w.size == null) ? 'measuring' : fmt(ws.reduce((a, w) => a + (w.size || 0), 0), true),
        ws.map((w) => `<li${notDone.includes(w) ? ' class="warn"' : ''}><b>${esc(w.branch || w.id.split('/').pop())}</b><span>${esc(w.repo)}</span><code>${w.size == null ? '…' : fmt(w.size, true)}</code></li>`)) +
      `</div><div class="wt-notes">${notes.join('')}</div>` +
      '<div class="wt-act"><button type="button" class="wt-btn glass" data-act="cancel">Cancel</button><button type="button" class="wt-btn go" data-act="run">Clean Up <span class="k">↩</span></button></div>' +
      '</div></div></div>';
  }

  function showSheet() {
    if (!totals().n) return;
    sheet = true;
    document.querySelector('.cu-sheet')?.remove();
    const el = document.createElement('div');
    el.innerHTML = sheetHTML();
    document.body.appendChild(el.firstChild);
    document.querySelector('.cu-sheet [data-act="run"]')?.focus({ preventScroll: true });
    send({ type: 'modal', open: true });
  }
  function hideSheet() {
    if (!sheet) return;
    sheet = false;
    document.querySelector('.cu-sheet')?.remove();
    send({ type: 'modal', open: false });
    if (held) { const j = held; held = null; update(j); }
  }

  // ====================================================================================================================
  // Rendering and events
  // ====================================================================================================================
  function render() {
    const host = window.Cloud && document.getElementById('cleanup-view');
    if (!host || !open) return;
    if (pressed || sheet) { deferred = true; return; }
    deferred = false;
    adopt();
    const scroll = host.querySelector('.cu-scroll');
    const keep = scroll ? scroll.scrollTop : 0;
    const active = document.activeElement;
    const focusId = active && host.contains(active) ? (active.closest('.cu-row')?.dataset.id || (active.dataset.all ? `all:${active.dataset.all}` : null) || (active.dataset.act ? `act:${active.dataset.act}` : null)) : null;
    host.innerHTML = viewHTML();
    const next = host.querySelector('.cu-scroll');
    if (next) next.scrollTop = keep;
    for (const g of host.querySelectorAll('[data-all]')) {
      const rows = [...host.querySelectorAll(`.cu-group[data-g="${g.dataset.all}"] .cu-row .cu-cb:not(:disabled)`)];
      const on = rows.filter((r) => r.checked).length;
      g.checked = rows.length > 0 && on === rows.length;
      g.indeterminate = on > 0 && on < rows.length;
      g.classList.toggle('mixed', g.indeterminate);
      if (!rows.length) g.disabled = true;
    }
    if (focusId) {
      const el = focusId.startsWith('all:') ? host.querySelector(`[data-all="${focusId.slice(4)}"]`)
        : focusId.startsWith('act:') ? host.querySelector(`[data-act="${focusId.slice(4)}"]`)
        : [...host.querySelectorAll('.cu-row')].find((r) => r.dataset.id === focusId)?.querySelector('.cu-cb');
      el?.focus({ preventScroll: true });
    }
  }

  function update(json) {
    if (sheet) { held = json; return; }
    DATA = json;
    // a run the app is not doing (this page was reloaded) is not one
    if (phase === 'run' && json.running === false && !plan.length) phase = 'pick';
    if (open) render();
  }

  function step(s) {
    if (!s) return;
    if (s.kind === 'done') {
      const sum = s.summary || {};
      freed = (sum.freed != null ? sum.freed : freed);
      trashed = (sum.trashed != null ? sum.trashed : trashed);
      phase = 'done';
      say(`Done. Freed ${fmt(freed)} of memory.`);
      if (open) render();
      return;
    }
    const id = s.id;
    if (s.state === 'skip') {
      steps.delete(id);
      sel.delete(id);
      manual.add(id);
      plan = plan.filter((x) => x !== id);
      if (s.text) say(s.text);
    } else {
      steps.set(id, { s: s.state, text: s.text || '' });
      if (s.state === 'done') {
        if (s.kind !== 'worktree') freed += s.freed || 0;
        else trashed += s.trashed || 0;
        // a runaway and a closed terminal's leftover blow up on the orbit as they always did
        const p = progs().find((x) => x.id === id);
        if (p && p.burn && p.pid) window.Orbit?.blowUp?.(p.pid);
        if (p && p.left) window.Orbit?.terminalGone?.(p.left);
      }
    }
    if (open) render();
  }

  function items() {
    return [
      ...pickedProgs().map((p) => ({ kind: 'program', id: p.id })),
      ...pickedChats().map((c) => ({ kind: 'chat', id: c.id })),
      ...pickedWts().map((w) => ({ kind: 'worktree', id: w.id })),
    ];
  }

  function run() {
    const list = items();
    if (!list.length) return;
    plan = list.map((i) => i.id);
    steps.clear();
    freed = 0;
    trashed = 0;
    phase = 'run';
    hideSheet();
    say(`Cleaning up ${list.length} item${list.length === 1 ? '' : 's'}.`);
    send({ type: 'cleanupRun', items: list });
    render();
  }

  function retry() {
    const failed = plan.filter((id) => ['bad', 'use'].includes(steps.get(id)?.s));
    if (!failed.length) return;
    const list = failed.map((id) => ({ kind: kinds.get(id) || 'program', id }));
    for (const id of failed) steps.delete(id);
    plan = failed;
    phase = 'run';
    send({ type: 'cleanupRetry', items: list });
    render();
  }

  function reset() {
    phase = 'pick';
    steps.clear();
    sel.clear();
    manual.clear();
    auto.clear();
    plan = [];
    freed = trashed = 0;
  }

  // The app opened the view (cloud.js showView) or closed it.
  function show() {
    open = true;
    if (phase !== 'run') reset();
    renderStrip();
    render();
    send({ type: 'cleanupView', open: true });
  }
  function hide() {
    if (!open) return;
    hideSheet();
    open = false;
    if (phase === 'done') reset();
    send({ type: 'cleanupView', open: false });
    renderStrip();
  }
  const back = () => { reset(); window.GitView?.view('dash'); };

  document.addEventListener('pointerdown', () => { pressed = true; }, true);
  const unpress = () => { pressed = false; if (deferred) setTimeout(render, 0); };
  document.addEventListener('pointerup', unpress, true);
  document.addEventListener('pointercancel', unpress, true);

  document.addEventListener('change', (e) => {
    if (!open || phase !== 'pick' || !e.target.closest('#cleanup-view')) return;
    const all = e.target.closest('[data-all]');
    if (all) {
      const g = all.dataset.all;
      const ids = [...document.querySelectorAll(`#cleanup-view .cu-group[data-g="${g}"] .cu-row`)].filter((r) => !r.querySelector('.cu-cb').disabled).map((r) => r.dataset.id);
      const allOn = ids.every((id) => sel.has(id));
      for (const id of ids) { manual.add(id); allOn ? sel.delete(id) : sel.add(id); }
      return render();
    }
    const row = e.target.closest('.cu-row');
    if (!row) return;
    const id = row.dataset.id;
    manual.add(id);
    e.target.checked ? sel.add(id) : sel.delete(id);
    for (const w of wts()) if (!wtFree(w)) sel.delete(w.id);
    render();
  });

  document.addEventListener('click', (e) => {
    const strip = e.target.closest('.cu-strip');
    if (strip) {
      if (e.target.closest('.x')) {
        send({ type: 'cleanupDismiss' });
        MEM = { ...MEM, show: false };
        return renderStrip();
      }
      if (e.target.closest('.go')) return send({ type: 'cleanupOpen' });
      return;
    }
    const b = e.target.closest('[data-act]');
    if (!b || !(b.closest('#cleanup-view') || b.closest('.cu-sheet'))) return;
    const a = b.dataset.act;
    if (a === 'am') send({ type: 'openActivityMonitor' });
    else if (a === 'confirm') showSheet();
    else if (a === 'cancel') hideSheet();
    else if (a === 'run') run();
    else if (a === 'halt') send({ type: 'cleanupHalt' });
    else if (a === 'log') send({ type: 'cleanupLog' });
    else if (a === 'back') back();
    else if (a === 'retry') retry();
  });

  // Esc: the summary first, then back to the dashboard (not while it cleans). Enter in the summary runs it; ⌘↩ opens it.
  const escape = () => {
    if (sheet) return hideSheet();
    if (phase === 'run') return;
    back();
  };
  addEventListener('keydown', (e) => {
    if (!open) return;
    // Enter runs only from the Clean Up button itself (Cancel, or nothing focused, never starts it); a held key or a chord doesn't count.
    if (e.key === 'Enter' && sheet) {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return e.preventDefault();
      if (document.activeElement?.matches?.('.cu-sheet [data-act="run"]')) { e.preventDefault(); run(); }
      return;
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.repeat && phase === 'pick' && !sheet) { e.preventDefault(); showSheet(); }
  });

  // The party switch hides the line (a recorded show); the page asks again when it changes.
  new MutationObserver(renderStrip).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['aria-checked'], attributeOldValue: false });

  const live = document.createElement('div');
  live.id = 'cu-live';
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)';
  document.body.appendChild(live);

  return { open: show, close: hide, update, step, memory, escape, prefs: (p) => { window.__cleanupPrefs = p; window.Cloud?.renderCleanup?.(); } };
})();
