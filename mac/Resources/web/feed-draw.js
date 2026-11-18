'use strict';

// The community feed's drawing, in one copy: a line appears in the box, and later dissolves and closes the gap.
// community.js (the decisions: the switch, do not disturb, what waits, what is on screen) uses it where the page draws
// the feed itself (the Windows app), and feed.js (the Mac app's see-through panel at the screen's corner) uses it for
// the lines community.js hands over. Styles: feed.css.
window.KillFeed = (() => {
  const FADE = 650; // the dissolve (feed.css .kf-out)
  const CLOSE = 220; // the lines under it closing the gap
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // `html` is built by community.js from fixed templates, every field escaped there.
  function add(box, kind, html) {
    const el = document.createElement('div');
    el.className = `kf-line k-${kind}`;
    el.innerHTML = html;
    box.appendChild(el);
    return el;
  }
  // Fades out with a little blur, then the lines under it close the gap; `done` when it's gone.
  function dissolve(el, done) {
    el.classList.add('kf-out');
    const still = reduced();
    setTimeout(() => {
      const s = el.style;
      s.height = `${el.offsetHeight}px`;
      void el.offsetHeight;
      s.height = s.marginBottom = s.paddingTop = s.paddingBottom = '0px';
      setTimeout(() => {
        el.remove();
        if (done) done();
      }, still ? 0 : CLOSE);
    }, still ? 300 : FADE);
  }
  return { add, dissolve };
})();
