'use strict';

// GitHub's contribution calendar on a profile (araştırma/github-takvim/SPEC.md): a box in the right column, the theme's
// accent in five steps. Off until the owner turns it on, from the switch on their own card; then anyone who can open
// their profile sees it. The API reads GitHub with its own token (src/github.ts), so there is nothing to sign in to here:
//   GET v1/screens/profile/<id|me>/github → { login, total, restricted, from: 'YYYY-MM-DD', counts: [..], levels: [0..4], fetchedAt }
//        (counts[i] and levels[i] are the day from + i; 404 not shown to you, 410 gone, 503 not reachable)
//   PUT v1/me/profile { githubCalendar: bool } → { githubCalendar }
// The profile answer says whether to draw it at all (`identity.github`: { login, on }, null for nothing). Anything that
// came from GitHub goes through esc() and the link through Profile.normalize(): the page never builds markup from it raw.
window.GhCal = (() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  const OUT = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.5h5v5M9.5 2.5 3 9"/></svg>';
  // The last day GitHub gave is "today" only while it is (a day either way: GitHub's days run in the commits' time zone).
  const isToday = (day) => Math.abs(ms(day) - ms(new Date().toLocaleDateString('en-CA'))) <= 864e5;
  const FRESH_MS = 60_000; // as profile.js CACHE_MS
  const FAIL_MS = 5_000;

  const num = (n) => Number(n || 0).toLocaleString('en-US');
  const ms = (d) => Date.parse(`${d}T00:00:00Z`);
  const addDays = (d, n) => new Date(ms(d) + n * 864e5).toISOString().slice(0, 10);
  const shortDay = (d) => {
    const x = new Date(ms(d));
    return `${DOW[x.getUTCDay()]} ${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`;
  };
  const contrib = (n) => (n === 0 ? 'No contributions' : `${num(n)} ${n === 1 ? 'contribution' : 'contributions'}`);
  const ago = (iso) => {
    const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
    if (!Number.isFinite(s) || s < 90) return 'just now';
    const m = Math.round(s / 60);
    if (m < 60) return `${m} minutes ago`;
    const h = Math.round(m / 60);
    if (h < 24) return h === 1 ? '1 hour ago' : `${h} hours ago`;
    const d = Math.round(h / 24);
    return d === 1 ? '1 day ago' : `${d} days ago`;
  };

  const cache = new Map(); // key ('me' or an id) -> { at, state: 'ok' | 'down' | 'gone' | 'none', cal }
  const loading = new Set();
  const choice = new Map(); // key -> the switch as you set it (until the profile answer says so itself)
  const mounted = new Map(); // key -> { host, gh, isSelf }: what to draw again after a switch
  const tell = (detail) => window.dispatchEvent(new CustomEvent('ghcal', { detail }));

  /** Fetches the calendar (60 s in the cache, 5 s after a failure). `force` skips the cache. Fires 'ghcal' when it lands. */
  async function load(key, force) {
    const c = cache.get(key);
    if (loading.has(key)) return;
    if (!force && c && Date.now() - c.at < (c.state === 'ok' ? FRESH_MS : FAIL_MS)) return;
    loading.add(key);
    let r;
    try {
      r = await window.Profile?.api('GET', `v1/screens/profile/${encodeURIComponent(key)}/github`);
    } catch {
      r = { error: 'offline' };
    }
    loading.delete(key);
    const at = Date.now();
    const days = r && !r.error && Array.isArray(r.counts) && Array.isArray(r.levels) && typeof r.from === 'string' && /^\d{4}-\d\d-\d\d$/.test(r.from);
    if (days) cache.set(key, { at, state: 'ok', cal: r });
    // Not shown to you (it was turned off meanwhile), gone from GitHub, or not reachable: an old answer stays, quietly.
    else if (c?.state === 'ok' && (!r || r.error !== 'not_found')) cache.set(key, { ...c, at: at - FRESH_MS + FAIL_MS });
    else cache.set(key, { at, state: r?.error === 'gone' ? 'gone' : r?.error === 'not_found' ? 'none' : 'down', cal: null });
    tell({ key });
  }

  // ---------- drawing ----------
  function calHTML(cal, wait) {
    const n = wait ? 53 * 7 : Math.min(cal.counts.length, 53 * 7 + 6);
    const first = wait ? '2000-01-02' : cal.from; // a Sunday for the skeleton
    const off = new Date(ms(first)).getUTCDay(); // GitHub's weeks start on Sunday; the first one can start later
    const weeks = Math.ceil((off + n) / 7);
    const wds = [[1, 'Mon'], [3, 'Wed'], [5, 'Fri']].map(([r, t]) => `<span class="gh-wd" style="grid-row:${r + 2}">${t}</span>`).join('');
    const parts = [];
    // A month's name over the first week that starts in it, never closer than 3 weeks to the one before.
    let lastM = -1;
    let lastCol = -9;
    if (!wait) {
      for (let w = 0; w < weeks; w++) {
        const m = new Date(ms(addDays(first, w * 7 - off))).getUTCMonth();
        if (m !== lastM && w - lastCol >= 3) {
          parts.push(`<span class="gh-m" style="grid-column:${w + 1} / span 3">${MONTHS[m]}</span>`);
          lastCol = w;
        }
        lastM = m;
      }
    }
    let busiest = { n: 0, day: '' };
    const last = wait || !isToday(addDays(first, n - 1)) ? -1 : n - 1;
    for (let i = 0; i < n; i++) {
      const lv = wait ? 0 : Math.max(0, Math.min(4, Math.trunc(Number(cal.levels[i])) || 0));
      const c = wait ? 0 : Math.max(0, Math.trunc(Number(cal.counts[i])) || 0);
      if (!wait && c > busiest.n) busiest = { n: c, day: addDays(first, i) };
      parts.push(`<i class="gh-d l${lv}${i === last ? ' today' : ''}" style="grid-column:${Math.floor((off + i) / 7) + 1};grid-row:${((off + i) % 7) + 2}" data-i="${i}"></i>`);
    }
    const label = wait ? 'GitHub contributions, loading'
      : `GitHub contributions in the last year: ${num(cal.total)}.` + (busiest.n > 0 ? ` Busiest day: ${shortDay(busiest.day)}, ${contrib(busiest.n).toLowerCase()}.` : '');
    return `<div class="gh-cal" style="--weeks:${weeks}" role="img" aria-label="${esc(label)}"><div class="gh-wds" aria-hidden="true">${wds}</div>` +
      `<div class="gh-scroll"><div class="gh-weeks${wait ? ' sk' : ' in'}">${parts.join('')}</div></div></div>`;
  }
  const KEY = `<span class="gh-key" aria-hidden="true"><span>Less</span>${[0, 1, 2, 3, 4].map((l) => `<i class="gh-d l${l}"></i>`).join('')}<span>More</span></span>`;

  /** The card's markup, or '' when this viewer sees nothing. `gh` is the profile answer's { login, on }. */
  function html(key, gh, isSelf) {
    if (!gh) return '';
    const on = isSelf && choice.has(key) ? choice.get(key) : !!gh.on;
    if (!isSelf && !on) return '';
    const c = cache.get(key);
    const state = !c ? 'wait' : c.state;
    if (!isSelf && (state === 'down' || state === 'gone' || state === 'none')) return '';
    const login = String((c?.cal?.login) || gh.login || '');
    const url = login ? window.Profile?.normalize('github', login) : '';
    const who = login
      ? (url
        ? `<a class="gh-login" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="Open github.com/${esc(login)}">@${esc(login)}${OUT}</a>`
        : `<span class="gh-login">@${esc(login)}</span>`)
      : '';
    const vis = isSelf
      ? `<div class="gh-vis">${on ? '' : `<span class="gh-only">${LOCK}Only you see this</span>`}` +
        `<label class="gh-sw"><span>Show on profile</span><button type="button" class="hk-sw" role="switch" aria-checked="${on}" data-gh-sw title="Show your GitHub contributions to everyone who opens your profile"><i></i></button></label></div>`
      : '';
    const head = `<div class="gh-head"><h2>GITHUB${who}</h2>${vis}</div>`;
    let body;
    let at = '';
    if (state === 'down') body = '<div class="gh-wait">Can\'t reach GitHub · your contributions come back on their own</div>';
    else if (state === 'gone') body = '<div class="gh-wait">GitHub can\'t find this account any more</div>';
    else if (state === 'none') return '';
    else if (state === 'wait') {
      body = calHTML(null, true) + `<div class="gh-foot"><i class="bd-skel" style="display:block;width:15rem;max-width:60%;height:.875rem"></i>${KEY}</div>`;
    } else {
      const cal = c.cal;
      at = cal.fetchedAt ? ` title="From GitHub · updated ${esc(ago(cal.fetchedAt))}"` : ' title="From GitHub"';
      const total = Number(cal.total) || 0;
      body = calHTML(cal, false) + `<div class="gh-foot">${total
        ? `<span${at}><b>${num(total)}</b> ${total === 1 ? 'contribution' : 'contributions'} in the last year</span>`
        : `<span${at}>No contributions in the last year</span>`}${KEY}</div>` +
        (isSelf && login ? `<p class="gh-note">Private work counts only if you turned on Private contributions <a href="https://github.com/${esc(encodeURIComponent(login))}" target="_blank" rel="noopener noreferrer">on GitHub</a>.</p>` : '');
    }
    return `<section class="pv-gh" aria-label="GitHub contributions">${head}${body}<div class="gh-tip" role="presentation"></div></section>`;
  }

  /** Draws the card into `el` (nothing changes when it would look the same). A calendar already drawn keeps its scroll
   *  and doesn't fade in again; the first one opens at today, on the right. */
  function mount(el, key, gh, isSelf) {
    if (!el) return;
    mounted.set(key, { el, gh, isSelf });
    const out = html(key, gh, isSelf);
    if (el.__h === out) return;
    const prev = el.querySelector('.gh-scroll');
    const had = !!el.querySelector('.gh-weeks:not(.sk)');
    const kept = prev ? prev.scrollLeft : 0;
    el.__h = out;
    el.innerHTML = out;
    const weeks = el.querySelector('.gh-weeks:not(.sk)');
    const sc = el.querySelector('.gh-scroll');
    if (weeks && had) weeks.classList.remove('in');
    const sec = el.querySelector('.pv-gh');
    if (sec) {
      const c = cache.get(key);
      sec.__cal = c?.state === 'ok' ? c.cal : null;
    }
    if (sc) {
      sc.scrollLeft = weeks && !had ? sc.scrollWidth : kept;
      sc.classList.toggle('cut', sc.scrollLeft > 2);
    }
  }

  // ---------- the switch ----------
  async function toggle(key, on) {
    const m = mounted.get(key);
    const was = choice.has(key) ? choice.get(key) : !!m?.gh?.on;
    choice.set(key, on);
    if (m) mount(m.el, key, m.gh, m.isSelf);
    const r = await window.Profile?.api('PUT', 'v1/me/profile', { githubCalendar: on });
    if (!r || r.error) {
      choice.set(key, was);
      const again = mounted.get(key);
      if (again) mount(again.el, key, again.gh, again.isSelf);
      window.Profile?.say(window.Profile.errText(r?.error || 'offline'));
      return;
    }
    // From now on the server says the same: a copy of the profile answer in the page that still says otherwise is stale.
    tell({ key, changed: true });
  }
  document.addEventListener('click', (e) => {
    const sw = e.target.closest?.('[data-gh-sw]');
    if (!sw || !sw.closest('.pv-gh') || sw.disabled) return;
    e.preventDefault();
    toggle('me', sw.getAttribute('aria-checked') !== 'true');
  });

  // ---------- the tip over a square, and the fade on the calendar's cut edge ----------
  function tip(sec, cell) {
    const t = sec.querySelector('.gh-tip');
    if (!t) return;
    const cal = sec.__cal;
    const i = cell ? Number(cell.dataset.i) : -1;
    if (!cal || !Number.isInteger(i) || i < 0 || i >= cal.counts.length) {
      t.classList.remove('on');
      return;
    }
    const day = addDays(cal.from, i);
    t.innerHTML = `<b>${esc(contrib(Math.max(0, Math.trunc(Number(cal.counts[i])) || 0)))}</b> · ${i === cal.counts.length - 1 && isToday(day) ? 'Today' : esc(shortDay(day))}`;
    const s = sec.getBoundingClientRect();
    const c = cell.getBoundingClientRect();
    const half = t.offsetWidth / 2;
    t.style.left = `${Math.max(half + 4, Math.min(s.width - half - 4, c.left + c.width / 2 - s.left))}px`;
    t.style.top = `${c.top - s.top}px`;
    t.classList.add('on');
  }
  document.addEventListener('pointerover', (e) => {
    const cell = e.target.closest?.('.pv-gh .gh-weeks:not(.sk) .gh-d');
    document.querySelectorAll('.pv-gh .gh-tip.on').forEach((t) => { if (!cell || !t.closest('.pv-gh').contains(cell)) t.classList.remove('on'); });
    if (cell) tip(cell.closest('.pv-gh'), cell);
  });
  document.addEventListener('scroll', (e) => {
    const sc = e.target;
    if (!sc.classList?.contains('gh-scroll')) return;
    sc.classList.toggle('cut', sc.scrollLeft > 2);
    sc.closest('.pv-gh')?.querySelector('.gh-tip')?.classList.remove('on');
  }, true);

  // Another computer of yours switched it: the page asks again.
  window.Social?.on?.((ev) => {
    if (ev.type === 'account' && ev.event === 'profile') {
      // The computer that switched it hears this too: its calendar stays as it is, only the profile is asked again.
      choice.clear();
      tell({ key: 'me', stale: true });
    }
  });

  return { html, mount, load, toggle };
})();
