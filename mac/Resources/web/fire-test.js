'use strict';

// STAGING ONLY, to delete before the release: this file, its <script> in index.html, the FireTest
// lines in cloud.js (test()), `.lb-ft` in cloud.css, and the API's POST v1/leaderboard/fire-test. The hottest flame is
// blue (Atalay, 2026-11-15). In the staging build (its version ends in "-staging") a strip at the leaderboard's
// top shows the flames (the API's fire.ts) before anyone has one:
//   cards   real (the API's) · mix (by turns: the hottest, the orange one, none) · all orange · all hottest
//   edges   the screen's edges of a flame on the notices panel, through the local API (DEV_TOOLS=1)
window.FireTest = (() => {
  const st = { cards: 'real' };
  try {
    Object.assign(st, JSON.parse(localStorage.getItem('fire-test') || '{}'));
  } catch {}
  const on = (version) => /-staging$/.test(version || '');
  // i: the card's place in its list (0 first), for the turns.
  const tier = (real, i) => ({ mix: [2, 1, 0][i % 3], all1: 1, all2: 2 })[st.cards] ?? real;
  const look = () => 'blue';
  const btn = (key, val, label) => `<button type="button" data-ft="${key}:${val}" class="${st[key] === val ? 'on' : ''}">${label}</button>`;
  const strip = () =>
    '<div class="lb-ft"><b>FIRE TEST · staging</b>' +
    `<span>cards</span><div class="lb-seg">${btn('cards', 'real', 'REAL')}${btn('cards', 'mix', 'MIX')}${btn('cards', 'all1', 'ALL 1')}${btn('cards', 'all2', 'ALL 2')}</div>` +
    `<span>edges</span><div class="lb-seg">${btn('edges', '1', '▶ 1')}${btn('edges', '2', '▶ 2')}</div></div>`;
  // A click on the strip: true when the cards are to be drawn again.
  function click(target) {
    const b = target.closest('[data-ft]');
    if (!b) return false;
    const [key, val] = b.dataset.ft.split(':');
    if (key === 'edges') {
      window.webkit.messageHandlers.cloud
        .postMessage({ type: 'social', method: 'POST', path: 'v1/leaderboard/fire-test', body: { fire: Number(val) } })
        .catch(() => {});
      return false;
    }
    st[key] = val;
    try {
      localStorage.setItem('fire-test', JSON.stringify(st));
    } catch {}
    return true;
  }
  return { on, tier, look, strip, click };
})();
