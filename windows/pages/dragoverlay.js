'use strict';
// A drag overlay's page (src/dragoverlay.js loads it twice, role "ghost" and role "box"). Main sends `term:overlay` messages:
// the ghost gets { title }, the box { mode: 'zone' | 'outline' | 'none', rect, animated, marker }.
(() => {
  const role = new URLSearchParams(location.search).get('role') === 'ghost' ? 'ghost' : 'box';
  document.body.classList.add(role);
  const chip = document.getElementById('chip');
  const box = document.getElementById('box');
  const num = (n) => typeof n === 'number' && Number.isFinite(n);
  let shown = false;

  function hideBox() {
    box.hidden = true;
    box.classList.remove('anim');
    shown = false;
  }

  function place(r) {
    box.style.left = typeof r.x === 'number' ? `${r.x}px` : r.x;
    box.style.top = typeof r.y === 'number' ? `${r.y}px` : r.y;
    box.style.width = typeof r.width === 'number' ? `${r.width}px` : r.width;
    box.style.height = typeof r.height === 'number' ? `${r.height}px` : r.height;
  }

  function drawBox(m) {
    if (m.mode === 'outline') {
      // The window is the outline, so the div just fills it; no transition, the frame follows the pointer at once.
      box.className = 'outline';
      place({ x: 0, y: 0, width: '100%', height: '100%' });
      box.style.opacity = '1';
      box.hidden = false;
      shown = true;
      return;
    }
    const r = m.rect;
    if (m.mode !== 'zone' || !r || !num(r.x) || !num(r.y) || !num(r.width) || !num(r.height) || r.width <= 0 || r.height <= 0) {
      hideBox();
      return;
    }
    const animated = m.animated === true;
    box.className = m.marker === true ? 'zone marker' : 'zone';
    if (!shown) {
      // First show: the rect is set while still invisible and the style is flushed, so the fade runs from nothing.
      box.hidden = false;
      box.style.opacity = animated ? '0' : '1';
      place(r);
      if (animated) {
        void box.offsetWidth;
        box.classList.add('anim');
        box.style.opacity = '1';
      }
      shown = true;
      return;
    }
    // Already shown: a window drag's preview slides to the new place, anything else jumps there.
    box.classList.toggle('anim', animated);
    box.style.opacity = '1';
    place(r);
  }

  atl.on('term:overlay', (m) => {
    if (!m || typeof m !== 'object') return;
    if (role === 'ghost') {
      // textContent, never markup: a tab's title is whatever its shell set.
      if (typeof m.title === 'string') chip.textContent = m.title.slice(0, 200);
      chip.hidden = false;
    } else if (m.mode === 'zone' || m.mode === 'outline') {
      drawBox(m);
    } else if (m.mode === 'none') {
      hideBox();
    }
  });
})();
