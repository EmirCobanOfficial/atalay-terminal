'use strict';

// STAGING ONLY, to delete once the community feed, head to head and the goal's moment are kept or dropped: this file,
// its <script> in index.html, the SocialTest lines in cloud.js (renderBoard, boardAction) and community.js (h2hDemo,
// goalNow, goalDone), `.lb-st` in cloud.css, and the API's POST v1/leaderboard/dev/feed (feed.ts, DEV_TOOLS=1). In the
// staging build (its version ends in "-staging") a strip under the fire test shows each of them without real users:
//   feed     a line about a friend of yours at the dashboard's top left, on your screen only: a rare badge, a new #1,
//            the goal, on fire, the hottest flame, a count of flames; or ×6, all six at once, to watch them wait their
//            turn, stack and dissolve
//   goal     the weekly goal's moment, played now as if the goal were reached
//   head to head  REAL (the API's) or DEMO (made up) on a friend's card in Friends
//   attack   🚀 ATTACK ME: a friend's spaceship attack on yourself, the map in sight (attack.js)
window.SocialTest = (() => {
  const st = { h2h: 'real' };
  try {
    Object.assign(st, JSON.parse(localStorage.getItem('social-test') || '{}'));
  } catch {}
  let goal = false;
  // The test strips (this one and fire-test.js) stay hidden, and the board looks as users see it, until Option-Shift-T shows them
  // (Atalay, 2026-11-15); the same keys hide them again.
  const shown = () => {
    try {
      return localStorage.getItem('staging-tests') === '1';
    } catch {
      return false;
    }
  };
  addEventListener(
    'keydown',
    (e) => {
      if (!staging || !(e.altKey && e.shiftKey && e.code === 'KeyT')) return;
      e.preventDefault();
      try {
        localStorage.setItem('staging-tests', shown() ? '0' : '1');
      } catch {}
      dispatchEvent(new Event('staging-tests'));
    },
    true,
  );
  const on = (version) => /-staging$/.test(version || '');
  // Whether this is the staging build, asked once (the app's state names its version).
  let staging = false;
  try {
    window.webkit.messageHandlers.cloud.postMessage({ type: 'state' }).then((s) => (staging = on(s && s.version))).catch(() => {});
  } catch {}
  const api = (path, body) =>
    window.webkit.messageHandlers.cloud.postMessage({ type: 'social', method: 'POST', path, body }).catch(() => ({ error: 'offline' }));
  const btn = (key, val, label, picked) => `<button type="button" data-st="${key}:${val}" class="${picked ? 'on' : ''}">${label}</button>`;
  const strip = () =>
    '<div class="lb-ft lb-st"><b>SOCIAL TEST · staging</b>' +
    `<span>feed</span><div class="lb-seg">${btn('feed', 'badge', 'BADGE')}${btn('feed', 'top', '#1')}${btn('feed', 'goal', 'GOAL')}` +
    `${btn('feed', 'fire', 'FIRE')}${btn('feed', 'fire2', 'HOTTEST')}${btn('feed', 'fires', '7 ON FIRE')}${btn('feed', 'all', '×6')}</div>` +
    `<span>goal</span><div class="lb-seg">${btn('goal', 'play', '▶ PLAY')}</div>` +
    `<span>head to head</span><div class="lb-seg">${btn('h2h', 'real', 'REAL', st.h2h === 'real')}${btn('h2h', 'demo', 'DEMO', st.h2h === 'demo')}</div>` +
    // A friend's spaceship attack on yourself (attack.js test(), the API's POST v1/friends/dev/attack in attack.ts).
    (window.Attack?.test ? `<span>attack</span><div class="lb-seg">${btn('attack', 'me', '🚀 ATTACK ME')}</div>` : '') + '</div>';
  // A click on the strip: true when the leaderboard is to be drawn again.
  function click(target) {
    const b = target.closest('[data-st]');
    if (!b) return false;
    const [key, val] = b.dataset.st.split(':');
    const said = (r, what) => typeof window.toast === 'function' && window.toast(r && r.error ? `test: ${r.error}` : what);
    if (key === 'feed') {
      // Why nothing would show: the feed off or do not disturb hide it, as for real lines.
      const why = !Social.prefs().feed ? 'test: announcements are off (Settings › General)' : Social.dnd() ? 'test: do not disturb hides the feed' : '';
      if (why) {
        said(null, why);
        return false;
      }
      // ×6: each kind once, sent together; they come in one by one, 2 seconds apart, in this order.
      const kinds = val === 'all' ? ['badge', 'top', 'fire', 'fire2', 'fires', 'goal'] : [val];
      kinds.reduce((p, kind) => p.then(() => api('v1/leaderboard/dev/feed', { kind })), Promise.resolve())
        .then((r) => said(r, kinds.length > 1 ? `${kinds.length} test lines sent · see the top left` : 'test line sent · see the top left'));
      return false;
    }
    if (key === 'attack') {
      window.Attack?.test();
      return false;
    }
    if (key === 'goal') {
      goal = true;
      return true;
    }
    st.h2h = val;
    try {
      localStorage.setItem('social-test', JSON.stringify(st));
    } catch {}
    return true;
  }
  return {
    on,
    strip,
    click,
    // community.js asks: a made-up head to head; the goal's moment played now (once).
    shown,
    h2hDemo: () => staging && shown() && st.h2h === 'demo',
    goalNow: () => staging && shown() && goal,
    goalDone: () => (goal = false),
  };
})();
