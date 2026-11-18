'use strict';

// Your profile's numbers (cloud.js renderMe), in the two panels the UX review drew (orbiterm-profil-yeni/ux-inceleme.md):
// on the right, the hours box (TODAY · THIS WEEK · STREAK · TOTAL in one strip, your weeks day by day, your records in
// one line under them); in the identity card on the left, your time with each AI (MOST USED AI); over your badges, the
// ones nearest their next tier (UP NEXT, badges.js puts it there).
//
// The numbers come from the API (GET v1/social/profile/me, its profile.ts) when the page opens and every 5 minutes while
// it's shown; today's bar follows your XP (S.xp.today) in between. UP NEXT reads your badges (badges.js). Your own page
// only: a friend's card keeps its 7 days.
//
// Rules from the research: every number is written on the page (hover only adds the date); bars, not coloured squares;
// a day without work is an empty slot, never marked as missed; days still to come show a dot, days before you joined
// nothing, and the weeks before your first week of work aren't drawn at all; no "longest day" record (it would praise
// overwork) and no "x to your record" countdown; UP NEXT leaves out the badges that pull toward long days and weeks
// (On Fire, Week of Work) and the ones nothing can be done for.
window.ProfileStats = (() => {
  const h = window.webkit && window.webkit.messageHandlers;
  const api = (path) =>
    h && h.cloud ? h.cloud.postMessage({ type: 'social', method: 'GET', path }).catch(() => ({ error: 'offline' })) : Promise.resolve({ error: 'offline' });
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const REFRESH = 5 * 60_000;
  const H = 3600;
  const WEEKS = 5; // the most the chart shows (the API sends 5 weeks)
  const GOOD_DAY = 30 * 60; // a day toward the weekly goal (the API's xp.ts)
  const FIRE = 5 * H; // On Fire's line: the flame mark on a bar
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const DOW_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  // The AIs in a fixed order and colour (the colour follows the AI, whatever its share); the name is always written too.
  const AIS = { claude: ['Claude', 'var(--accent)'], codex: ['Codex', 'var(--amber)'], antigravity: ['Antigravity', 'var(--orange)'] };
  // UP NEXT leaves these out: On Fire and Week of Work pull toward long days and weeks; nothing can be done for Veteran
  // and Founder.
  const NOT_NEXT = new Set(['fire', 'week', 'tenure', 'founder']);
  const FLAME = '<svg class="ps-flame" viewBox="0 0 10 12" aria-hidden="true"><path d="M5 0c.4 2.2 3.8 3.6 3.8 7.2A3.8 3.8 0 0 1 1.2 7.2c0-1.6.8-2.6 1.6-3.2-.1 1.2.4 2 1.1 2.4C3.6 4.2 4.2 2 5 0z"/></svg>';

  const cache = new Map(); // id -> { data, at, loading, failed, lastDrawn }
  const entry = (id) => {
    const key = id || 'me';
    let e = cache.get(key);
    if (!e) {
      // retryAt: after a failed ask, nothing asks again before this time, whatever made the numbers stale.
      e = { data: null, at: 0, loading: false, failed: false, retryAt: 0, lastDrawn: 0 };
      cache.set(key, e);
    }
    return e;
  };

  // ---------- dates and amounts ----------
  const dayMs = (day) => Date.parse(`${day}T00:00:00Z`);
  const addDays = (day, n) => new Date(dayMs(day) + n * 864e5).toISOString().slice(0, 10);
  const dateOf = (day) => new Date(dayMs(day));
  const short = (day) => `${dateOf(day).getUTCDate()} ${MONTHS[dateOf(day).getUTCMonth()]}`;
  const range = (from, to) => {
    const a = dateOf(from), b = dateOf(to);
    return a.getUTCMonth() === b.getUTCMonth() ? `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}` : `${short(from)} – ${short(to)}`;
  };
  const localToday = () => new Date().toLocaleDateString('sv');
  const dur = (s) => window.Xp.dur(s);
  // On a bar: hours with one decimal ("3.4"), minutes under an hour ("25m").
  const barText = (s) => (s < H ? `${Math.max(1, Math.round(s / 60))}m` : (s / H).toFixed(1));
  // A week's total: "8.1h", "40m".
  const weekText = (s) => (s < H ? `${Math.round(s / 60)}m` : `${(s / H).toFixed(1)}h`);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  // ---------- loading ----------
  async function load(id) {
    const key = id || 'me';
    const e = entry(key);
    if (e.loading) return e.data;
    e.loading = true;
    e.at = Date.now();
    const r = await (window.Social?.profile ? window.Social.profile(key) : api(`v1/screens/profile/${encodeURIComponent(key)}`));
    e.loading = false;
    if (r && !r.error) {
      e.data = r;
      e.failed = false;
    } else {
      e.failed = true;
      // Again in a minute, not five.
      e.at = Date.now() - REFRESH + 60_000;
      e.retryAt = Date.now() + 60_000;
    }
    window.dispatchEvent(new CustomEvent('profilestats', { detail: { id: key } }));
    return e.data;
  }

  /** Accepts profile data already fetched by profile.js so both don't ask the API twice. */
  function ingest(id, data) {
    if (!data || data.error) return;
    const e = entry(id || 'me');
    e.data = data;
    e.at = Date.now();
    e.failed = false;
    e.retryAt = 0;
  }

  /** The day they joined, as the identity card's last line says it ("25 Oct 2026"), once it's known. */
  function joined(id) {
    const data = entry(id).data;
    if (!data || !data.joined) return '';
    const d = dateOf(data.joined);
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }

  // ---------- the strip: TODAY · THIS WEEK · STREAK · TOTAL ----------
  // Each with one line under it. A long line has a short form for a narrow box (`alt`). Parts joined by dots (`dots`)
  // never break inside: they go one under the other when there's no room, with no dot left hanging at a line's end.
  const dots = (parts) => `<span class="ps-dl">${parts.map((p) => `<span>${p}</span>`).join('')}</span>`;
  const line = (long, alt) => (alt ? `<span class="ps-lg">${long}</span><span class="ps-sh">${alt}</span>` : long);
  function stripHTML(x, key) {
    const data = entry(key).data;
    const isSelf = !key || key === 'me';
    const goalNum = x.goal || 3;
    const goal = x.week >= goalNum;
    const week = goal ? plural(x.week, 'day', 'days') : `${x.week} of ${goalNum} days`;
    const weekLine = goal ? `<b class="ps-ok">${line('✓ weekly goal reached', '✓ goal reached')}</b>` : '30+ min a day';
    const longest = data && data.records ? Math.max(data.records.streak || 0, x.streak || 0) : 0;
    const cell = (label, value, note) => `<div><label>${label}</label><b>${value}</b><small>${note}</small></div>`;
    if (!isSelf) {
      const todayLine = `${dur(x.last24 ?? 0)} in the last 24 hours`;
      const streakLine = dots([`${goalNum} days a week`, longest ? `longest ${plural(longest, 'week', 'weeks')}` : ''].filter(Boolean));
      return (
        '<div class="ps-strip">' +
        cell('TODAY', dur(x.today), todayLine) +
        cell('THIS WEEK', week, weekLine) +
        cell('STREAK', plural(x.streak, 'week', 'weeks'), streakLine) +
        cell('TOTAL', window.Xp.hours(x.total), `${window.Xp.num(x.xp)} XP`) +
        '</div>'
      );
    }
    // The ceilings (16 hours a day, 70 in any 7 days, the API's xp.ts) told as what comes next, not as a penalty. Past 8
    // hours, half XP and a break: the rested line's reminder, kept here.
    const today = x.full === 'day' ? line("today's hours are in", '16h counted')
      : x.full === 'week' ? line("this week's hours are in", '70h in 7 days')
        : x.rested > 0 ? line(`${dur(x.rested)} more at 2× XP`, `${dur(x.rested)} at 2× XP`)
          : x.today >= 8 * H ? line(dots(['half XP from here', 'take a break']), dots(['½ XP', 'take a break']))
            : line('2× XP again tomorrow', '2× XP tomorrow');
    const streakLine = dots([x.bonus ? `+${x.bonus}% XP` : `${goalNum} days a week`, longest ? `longest ${plural(longest, 'week', 'weeks')}` : ''].filter(Boolean));
    return (
      '<div class="ps-strip">' +
      cell('TODAY', dur(x.today), today) +
      cell('THIS WEEK', week, weekLine) +
      cell('STREAK', plural(x.streak, 'week', 'weeks'), streakLine) +
      cell('TOTAL', window.Xp.hours(x.total), `${window.Xp.num(x.xp)} XP`) +
      '</div>'
    );
  }

  // ---------- your weeks and the records ----------
  // The days with today's time as your XP has it now (it moves between two loads).
  function days(x, key) {
    const data = entry(key).data;
    const d = data.days;
    const seconds = d.seconds.slice();
    const ti = (dayMs(d.end) - dayMs(d.start)) / 864e5;
    if ((!key || key === 'me') && x && d.end === localToday() && ti >= 0 && ti < seconds.length) {
      seconds[ti] = Math.max(seconds[ti] ?? 0, x.today || 0);
    }
    return { seconds, ti };
  }

  // The first week drawn: a week with no work in it that's before you joined, or the one you joined in, isn't drawn (an
  // empty week reads as a week you didn't work). This week always is.
  function firstWeek(seconds, ti, data) {
    let w = 0;
    while (w < WEEKS - 1) {
      const monday = addDays(data.days.start, w * 7);
      const week = seconds.slice(w * 7, w * 7 + 7);
      const worked = week.some((s) => s > 0);
      const before = week.some((s, i) => s == null && w * 7 + i <= ti) || (!!data.joined && data.joined >= monday && data.joined <= addDays(monday, 6));
      if (worked || !before) break;
      w++;
    }
    return w;
  }

  function weeksHTML(x, key) {
    const e = entry(key);
    const data = e.data;
    const isSelf = !key || key === 'me';
    if (!data || !data.days) {
      if (e.failed) {
        return `<h2 class="pp-h ps-head">${isSelf ? 'YOUR WEEKS' : 'WEEKS'} <span>· hours a day</span></h2>` +
          `<div class="ps-wait">can't reach the server · ${isSelf ? 'your' : 'their'} weeks come back with the connection</div>`;
      }
      return `<h2 class="pp-h ps-head">${isSelf ? 'YOUR WEEKS' : 'WEEKS'} <span>· hours a day</span></h2>` +
        '<div class="pv-skel-strip">' +
        Array.from({ length: 4 }, () => '<div><i class="bd-skel" style="width:3.5rem;height:.625rem"></i><i class="bd-skel" style="width:5rem;height:1.375rem"></i><i class="bd-skel" style="width:6.5rem;height:.625rem"></i></div>').join('') +
        '</div>' +
        '<div class="pv-skel-weeks">' +
        [48, 72, 60, 88, 64].map((h) => `<i class="bd-skel" style="height:${h}%"></i>`).join('') +
        '</div>';
    }
    const d = data.days;
    const { seconds, ti } = days(x, key);
    const w0 = firstWeek(seconds, ti, data);
    const n = WEEKS - w0;
    const head = `<h2 class="pp-h ps-head">${n === 1 ? 'THIS WEEK' : `LAST ${n} WEEKS`} <span>· hours a day</span></h2>`;
    const goal = (x && x.goal) || 3;
    const shown = seconds.slice(w0 * 7);
    const max = Math.max(4 * H, ...shown.filter((s) => s != null));
    const ZONE = 96; // the bars' height at the top of the scale
    const px = (s) => Math.round((s / max) * ZONE);
    const lines = [4 * H, 8 * H].filter((s) => s <= max);
    const axis = `<div class="ps-axis" aria-hidden="true">${lines.map((s) => `<span style="bottom:${px(s)}px">${s / H}h</span>`).join('')}</div>`;
    const groups = [];
    for (let w = w0; w < WEEKS; w++) {
      const monday = addDays(d.start, w * 7);
      const week = seconds.slice(w * 7, w * 7 + 7);
      // Days before you joined: nothing, not even the baseline (from the first day that has a value).
      const before = week.findIndex((s, i) => s != null || w * 7 + i >= ti);
      const pre = before < 0 ? 7 : before;
      const real = week.filter((s) => s != null);
      const top = Math.max(0, ...real);
      const slots = week.map((s, i) => {
        const idx = w * 7 + i;
        const day = addDays(monday, i);
        const name = `${DOW[i]} ${short(day)}`;
        if (idx > ti) return `<div class="ps-d future" title="${name} · still to come"><i class="ps-dot"></i></div>`;
        if (s == null) return `<div class="ps-d pre" title="${idx < pre + w * 7 ? `${name} · before joining` : name}"></div>`;
        const today = idx === ti;
        const tip = `${today ? 'Today' : name} · ${s ? dur(s) : 'no time counted'}`;
        if (!s) return `<div class="ps-d${today ? ' today' : ''}" title="${tip}"></div>`;
        // The number on every bar while there's room; in a narrow box only today's and each week's top day.
        const sub = !today && s !== top ? ' sub' : '';
        return `<div class="ps-d${today ? ' today' : ''}" title="${tip}">` +
          (s >= FIRE ? `<span class="ps-f${sub}" role="img" aria-label="5 hours or more">${FLAME}</span>` : '') +
          `<em class="ps-v${sub}">${barText(s)}</em><i class="ps-bar" style="height:${Math.max(3, px(s))}px"></i></div>`;
      }).join('');
      const k = Math.min(pre, 7);
      const base = k < 7 ? `<i class="ps-base" style="--k:${k}"></i>${lines.map((s) => `<i class="ps-line" style="--k:${k};bottom:${px(s)}px"></i>`).join('')}` : '';
      const letters = LETTERS.map((l, i) => `<span${w * 7 + i === ti ? ' class="today"' : ''}>${l}</span>`).join('');
      const todayRow = w === WEEKS - 1 ? `<div class="ps-tr" aria-hidden="true">${LETTERS.map((_, i) => `<span>${w * 7 + i === ti ? 'today' : ''}</span>`).join('')}</div>` : '<div class="ps-tr"></div>';
      // Under the week: its Monday ("this week", "joined 22 Oct"), its total and the weekly goal (a mark and a word). The
      // week you joined in doesn't count days against the goal: it didn't have all of them.
      const joinedHere = data.joined && data.joined > monday && data.joined <= addDays(monday, 6);
      const label = w === WEEKS - 1 ? 'this week' : joinedHere ? `joined ${short(data.joined)}` : short(monday);
      const total = real.reduce((a, s) => a + s, 0);
      const good = real.filter((s) => s >= GOOD_DAY).length;
      const mark = good >= goal ? '<b class="ps-ok">✓ goal</b>' : joinedHere ? '' : `${good} of ${goal} days`;
      const sum = real.length ? [weekText(total), mark].filter(Boolean).join(' · ') : '';
      groups.push(
        `<div class="ps-wk"><div class="ps-zone">${base}${slots}</div><div class="ps-lt">${letters}</div>${todayRow}` +
        `<p class="ps-wl"><b>${label}</b><span>${sum || '&nbsp;'}</span></p></div>`,
      );
    }
    return `${head}<div class="ps-chart">${axis}<div class="ps-plot ps-n${n}" style="--n:${n}">${groups.join('')}</div></div>${recordsHTML(shown, data, isSelf)}`;
  }

  // One line under the chart: the active days and the daily average from its own days, the best week from all your
  // weeks (the API), the busiest day of the week (the API's last 8 weeks; its average in the tooltip).
  function recordsHTML(seconds, data, isSelf) {
    const active = seconds.filter((s) => s != null && s >= GOOD_DAY);
    const best = data.records && data.records.bestWeek;
    const parts = [];
    if (active.length) {
      parts.push(`<b>${active.length}</b> active ${active.length === 1 ? 'day' : 'days'}`);
      parts.push(`<b>${dur(active.reduce((a, s) => a + s, 0) / active.length)}</b> a day on average`);
    }
    if (best) parts.push(`best week <b>${dur(best.seconds)}</b> (${range(best.start, addDays(best.start, 6))})`);
    const w = data.weekdays;
    const top = w ? w.indexOf(Math.max(...w)) : -1;
    if (w && w[top]) {
      const span = data.joined && data.joined > addDays(data.days.end, -56) ? (isSelf ? 'since you joined' : 'since they joined') : 'in the last 8 weeks';
      parts.push(`<span title="${dur(w[top])} on an average ${DOW_LONG[top]}, ${span}">busiest day <b>${DOW_LONG[top]}</b></span>`);
    }
    return `<p class="ps-recs">${parts.length ? dots(parts) : (isSelf ? 'Your records fill in as you work.' : 'No records yet.')}</p>`;
  }

  // ---------- UP NEXT (badges.js puts it over your badges) ----------
  /** The badges nearest their next tier, in one row; nothing before your badges come or while you're signed out (the
   *  badges box says why). */
  function next() {
    const B = window.Badges && window.Badges.mine();
    if (!B || !B.signedIn) return '';
    const head = '<h3 class="ps-ch">UP NEXT</h3>';
    const Art = window.BadgeArt;
    const list = B.badges
      .filter((b) => b.progress && b.tier < b.tiers && !NOT_NEXT.has(b.id) && !(b.tiers === 1 && b.progress.next === 1))
      .map((b) => ({ b, pct: Math.max(0, Math.min(1, b.progress.value / b.progress.next)) }))
      .sort((a, c) => c.pct - a.pct || (a.b.progress.next - a.b.progress.value) - (c.b.progress.next - c.b.progress.value))
      .slice(0, 3);
    if (!list.length) return `<div class="ps-next">${head}<p class="ps-empty">Every badge you can work toward is at its top.</p></div>`;
    return `<div class="ps-next">${head}` + list.map(({ b, pct }) => {
      const tier = Art.tierName(b.id, b.tier + 1, b.tiers);
      return `<div class="ps-nx" style="--q:${Art.glow(b.id, b.tier + 1)[0]}" title="${esc(b.how)}">` +
        `<span class="ps-nart">${Art.svg(b.id, b.tier + 1, 32)}</span>` +
        `<div class="ps-nt"><p><span class="ps-nn"><b>${esc(b.name)}</b>${tier ? ` · ${esc(tier)}` : ''}</span><em>${esc(window.Badges.amount(b.progress))}</em></p>` +
        `<i class="ps-nbar" role="progressbar" aria-label="${esc(`${b.name}${tier ? ` ${tier}` : ''}`)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct * 100)}"><i style="width:${(pct * 100).toFixed(1)}%"></i></i></div></div>`;
    }).join('') + '</div>';
  }

  // ---------- MOST USED AI (in the identity card) ----------
  // Whole percents that add up to 100 (the largest remainders get the leftover points).
  function percents(list) {
    const all = list.reduce((a, t) => a + t.seconds, 0);
    const raw = list.map((t) => (100 * t.seconds) / all);
    const out = raw.map(Math.floor);
    let left = 100 - out.reduce((a, n) => a + n, 0);
    raw.map((v, i) => [v - out[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => left-- > 0 && out[i]++);
    return out;
  }

  // Since when the time is counted: the API's `toolsSince` (the time per AI started being counted on 8 Nov 2026, or
  // later for a newer account), "last 30 days" once a month of it is kept, nothing when an older API doesn't say.
  function span(id) {
    const data = entry(id).data;
    if (!data) return '';
    if (data.toolsSince) return data.joined && data.toolsSince <= data.joined ? (id && id !== 'me' ? 'since they joined' : 'since you joined') : `since ${short(data.toolsSince)}`;
    return data.toolsSpan === '30d' ? 'last 30 days' : '';
  }

  /** The block for the identity card. */
  function ai(id) {
    const key = id || 'me';
    const e = entry(key);
    const data = e.data;
    const sp = span(key);
    const head = `<h3 class="ps-ch">MOST USED AI${sp ? ` <span>· ${sp}</span>` : ''}</h3>`;
    const wrap = (inner) => `<div class="pp-ai">${head}${inner}</div>`;
    if (!data) {
      if (e.failed) return wrap('<p class="ps-empty">can\'t reach the server</p>');
      return wrap('<i class="bd-skel" style="display:block;height:.625rem;margin:.375rem 0 .625rem"></i>' +
        '<i class="bd-skel" style="display:block;width:72%;height:.75rem;margin-bottom:.375rem"></i>' +
        '<i class="bd-skel" style="display:block;width:54%;height:.75rem"></i>');
    }
    const list = (data.tools || []).filter((t) => AIS[t.tool] && t.seconds > 0);
    if (!list.length) return wrap(`<p class="ps-empty">${key === 'me' ? 'Run Claude, Codex or Antigravity in a terminal and it shows here.' : 'No AI time recorded yet.'}</p>`);
    const pct = percents(list);
    const bar = list.map((t, i) => `<i style="flex:${t.seconds} 1 0;background:${AIS[t.tool][1]}" title="${AIS[t.tool][0]} · ${pct[i] || '<1'}%"></i>`).join('');
    const rows = list.map((t, i) =>
      `<div class="ps-ai"><i style="background:${AIS[t.tool][1]}"></i><b>${AIS[t.tool][0]}</b><span>${pct[i] ? `${pct[i]}%` : '&lt;1%'}</span><em>${window.Xp.hours(t.seconds)}</em></div>`).join('');
    return wrap(`<div class="ps-stack" role="img" aria-label="${esc(list.map((t, i) => `${AIS[t.tool][0]} ${pct[i]}%`).join(', '))}">${bar}</div>` +
      `<div class="ps-ais">${rows}</div>` +
      (data.model ? `<p class="ps-model">most used model: <b>${esc(data.model)}</b></p>` : ''));
  }

  // ---------- the hours box ----------
  /** Draws the hours box into `el`; asks the API when its numbers are old or the page just opened. */
  function render(el, x, id, opts) {
    if (!el) return;
    const key = id || 'me';
    const e = entry(key);
    // cloud.js draws the page at least once a minute while it's shown (each heartbeat), so a longer gap means it just
    // opened again.
    const now = Date.now();
    const age = now - e.at;
    const opened = now - e.lastDrawn > 90_000;
    e.lastDrawn = now;
    const stale = age > REFRESH || (opened && age > 30_000) || (e.data && e.data.days && e.data.days.end !== localToday() && age > 60_000);
    if (!opts?.skipFetch && el.closest('#profile-view.on') && stale && !e.loading && now >= e.retryAt) load(key);
    const strip = x || e.data?.strip || null;
    setHTML(el, `<section class="ps-box ps-hours">${strip ? stripHTML(strip, key) : ''}<div class="ps-in">${weeksHTML(strip, key)}</div></section>`);
  }

  return { render, joined, load, ingest, ai, next, data: (id) => entry(id).data };
})();
