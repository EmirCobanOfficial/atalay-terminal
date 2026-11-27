'use strict';
// Where a dragged tab, pane or window would land: the geometry and the decisions of tabdrag.js, kept free of Electron so they
// run (and are tested) in plain node. Everything is in DIP; a rect is { x, y, width, height }, an edge is 'left' | 'right' |
// 'top' | 'bottom'. The rules and their numbers are the Mac's (ChatWindow.swift tabDrop / paneDrop / paneSpot, Panes.swift
// slot code), with the points taken as DIP and the Mac's y-up edges mirrored (its .maxY is the top here).
//
// A `view` is one terminal window as plain data, built by tabdrag.js from a frame:
//   { key, outer, content, tabs, active, barH, headH, geom, rects, accepts }
// `outer` is its visible bounds on screen (title bar included), `content` its content bounds on screen, `geom` the chip spans
// of its tab bar in content coordinates ({ chips: [[l, r], ...], clip: [l, r] }), `rects` a Map of pane id to rect in content
// coordinates, `key` whatever the caller wants back (the frame). `hit` says what the pointer is over: { kind: 'self' } (the
// dragged item's own window), { kind: 'frame', view } or { kind: 'none' } (no terminal window).

// Pixels the pointer travels before a chip or strip drag starts (the renderers use their own copy).
const DRAG_SLOP = 5;
// Pixels above or below the bar that still count as the bar (Panes.swift: 12 pt).
const SLOT_SLOP = 12;
// A pointer within this fraction of a pane's half size from its middle (both axes) is the pane's centre.
const CENTRE = 0.2;
// Pixels below the bar (or below the content top without one) where a drop inside the own window tears off.
const TEAR_BELOW = 40;
// A torn-off window puts the pointer this far below its top.
const TEAR_POINTER_Y = 30;
// A dragged window must travel further than this to count as a drag, not a click or a resize.
const MOVE_MIN = 8;
// Sampling of a window drag.
const TICK_MS = 50;
// A window must hover over another's header this long before the merge mark shows.
const HEADER_MS = 350;
// At rest means at most this many DIP of pointer travel per 100 ms.
const REST_SPEED = 4;
// "Deep" inside a pane: inside its rect inset by this much.
const REST_INSET = 24;
// Resting deep in a pane this long arms the split preview.
const REST_MS = 300;
// An armed preview clears when the pointer is this far from where it armed.
const REARM = 60;
// The strip of a pane page (#hud: 32 px plus its 1 px border).
const STRIP_H = 33;
// The drop zone's animations, in the overlay page's CSS (here for the record).
const FADE_MS = 150;
const SLIDE_MS = 70;

function contains(r, p) {
  return p.x >= r.x && p.x < r.x + r.width && p.y >= r.y && p.y < r.y + r.height;
}

function inset(r, d) {
  return { x: r.x + d, y: r.y + d, width: r.width - 2 * d, height: r.height - 2 * d };
}

// The Mac's nearest edge: whichever of the pointer's offsets from the middle is larger, as a share of the size, decides the
// axis; a tie goes to the vertical one.
function nearestEdge(r, p) {
  const dx = (p.x - (r.x + r.width / 2)) / r.width;
  const dy = (p.y - (r.y + r.height / 2)) / r.height;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'top' : 'bottom';
}

// The edge, or null for the centre (the Mac's paneSpot).
function spotAt(r, p) {
  const dx = (p.x - (r.x + r.width / 2)) / r.width;
  const dy = (p.y - (r.y + r.height / 2)) / r.height;
  if (Math.abs(dx) < CENTRE && Math.abs(dy) < CENTRE) return null;
  return nearestEdge(r, p);
}

// The half of a rect on an edge's side.
function halfRect(r, edge) {
  const w = r.width / 2;
  const h = r.height / 2;
  if (edge === 'left') return { x: r.x, y: r.y, width: w, height: r.height };
  if (edge === 'right') return { x: r.x + w, y: r.y, width: w, height: r.height };
  if (edge === 'top') return { x: r.x, y: r.y, width: r.width, height: h };
  return { x: r.x, y: r.y + h, width: r.width, height: h };
}

// The bar slot under x: the first chip whose middle is right of the pointer, else the chip count.
function slotAt(geom, x) {
  const chips = geom.chips;
  for (let i = 0; i < chips.length; i++) if ((chips[i][0] + chips[i][1]) / 2 > x) return i;
  return chips.length;
}

// The 3 px marker at a chip boundary, clamped into the visible part of the bar so a scrolled-away chip's boundary still
// shows at the edge.
function markerRect(geom, i, barH) {
  const n = geom.chips.length;
  if (!n) return null;
  const clip = geom.clip || [0, geom.chips[n - 1][1] + 6];
  const lo = clip[0] + 1.5;
  const raw = i < n ? geom.chips[i][0] - 2 : geom.chips[n - 1][1] + 2;
  const x = Math.min(Math.max(raw, lo), Math.max(lo, clip[1] - 1.5));
  return { x: x - 1.5, y: 0, width: 3, height: barH };
}

// The chip spans of a bar that never reported its own: n equal chips with 6 px of padding and 4 px gaps.
function evenGeom(n, width) {
  const w = Math.max((width - 12 - 4 * (n - 1)) / Math.max(n, 1), 0);
  const chips = [];
  for (let i = 0; i < n; i++) chips.push([6 + i * (w + 4), 6 + i * (w + 4) + w]);
  return { chips, clip: [6, Math.max(width - 6, 6)] };
}

function local(view, p) {
  return { x: p.x - view.content.x, y: p.y - view.content.y };
}

// On the tab bar, with the slop above and below it. Only a window with 2+ tabs has a bar.
function inBar(view, lp) {
  return view.tabs > 1 && lp.y >= -SLOT_SLOP && lp.y < view.barH + SLOT_SLOP && lp.x >= 0 && lp.x < view.content.width;
}

// Where a tab or pane coming from outside would be inserted: the bar's slot when the pointer is on the bar, else the end.
function incomingSlot(view, lp) {
  return inBar(view, lp) ? slotAt(view.geom, lp.x) : view.tabs;
}

// The Mac's header zone: the native title bar, the tab bar and the first strip (over a split, the window's bar: `headH`).
function headerRect(view) {
  return { x: 0, y: 0, width: view.content.width, height: view.barH + (view.headH || STRIP_H) };
}

// The mark for something joining as a tab at a slot: a slot marker in the bar, or the whole header when there is no bar.
function incomingMark(view, slot) {
  if (view.tabs > 1) return { rect: markerRect(view.geom || evenGeom(view.tabs, view.content.width), slot, view.barH), marker: true };
  return { rect: headerRect(view), marker: false };
}

function paneAt(rects, lp, excludeId) {
  for (const [id, r] of rects) if (id !== excludeId && contains(r, lp)) return id;
  return null;
}

// A dragged chip (port of ChatWindow.swift tabDrop). `i` is the dragged tab's index in `self`.
function tabDrop({ p, self, i, hit }) {
  if (hit.kind === 'frame') {
    const v = hit.view;
    if (!v.accepts) return null;
    const lp = local(v, p);
    const id = paneAt(v.rects, lp);
    const edge = id ? spotAt(v.rects.get(id), lp) : null;
    if (id && edge) return { type: 'windowSplit', to: v.key, target: id, edge };
    return { type: 'window', to: v.key, slot: incomingSlot(v, lp) };
  }
  const lp = local(self, p);
  if (inBar(self, lp)) return { type: 'slot', slot: slotAt(self.geom, lp.x) };
  if (hit.kind === 'none' && !contains(self.outer, p)) return { type: 'detach', at: { x: p.x, y: p.y } };
  const tearInside = contains(self.outer, p) && lp.y > self.barH + TEAR_BELOW ? { type: 'detach', at: { x: p.x, y: p.y } } : null;
  if (i === self.active) return tearInside;
  const id = paneAt(self.rects, lp);
  if (id) return { type: 'join', target: id, edge: nearestEdge(self.rects.get(id), lp) };
  return tearInside;
}

// A dragged pane strip (port of ChatWindow.swift paneDrop). `id` is the dragged pane.
function paneDrop({ p, self, id, hit }) {
  if (hit.kind === 'frame') {
    const v = hit.view;
    if (!v.accepts) return null;
    const lp = local(v, p);
    const t = paneAt(v.rects, lp);
    if (t) return { type: 'windowSplit', to: v.key, target: t, edge: nearestEdge(v.rects.get(t), lp) };
    return { type: 'window', to: v.key, slot: incomingSlot(v, lp) };
  }
  if (hit.kind !== 'self' && !contains(self.outer, p)) return { type: 'detach', at: { x: p.x, y: p.y } };
  const lp = local(self, p);
  if (inBar(self, lp)) return { type: 'tab', slot: slotAt(self.geom, lp.x) };
  // Over the native title bar, which is the Mac's header.
  if (lp.y < 0) return { type: 'tab', slot: self.tabs };
  const t = paneAt(self.rects, lp, id);
  if (t) return { type: 'split', target: t, edge: nearestEdge(self.rects.get(t), lp) };
  const own = self.rects.get(id);
  if (own && contains(own, lp)) return null;
  return lp.y > self.barH + TEAR_BELOW ? { type: 'detach', at: { x: p.x, y: p.y } } : null;
}

// Screen point p over the window's header zone: from the top of its title bar to the bottom of the first strip.
function inHeader(view, p) {
  const bottom = view.content.y + view.barH + (view.headH || STRIP_H);
  return p.y >= view.outer.y && p.y < bottom && p.x >= view.content.x && p.x < view.content.x + view.content.width;
}

// A window drag over a pane body: the pane, the edge (null = centre) and the pane's rect in SCREEN coordinates.
function paneTargetAt(view, p) {
  if (inHeader(view, p)) return null;
  const lp = local(view, p);
  const id = paneAt(view.rects, lp);
  if (!id) return null;
  const r = view.rects.get(id);
  return { id, edge: spotAt(r, lp), rect: { x: r.x + view.content.x, y: r.y + view.content.y, width: r.width, height: r.height } };
}

// Hovering a window drag over a header (port of the header part of ChatWindow.swift's repin tick): the mark shows once the same
// target has been under the pointer for HEADER_MS, and hides when the target changes. Pure: returns a new state.
function headerStep(hst, targetKey, now) {
  let next = { hover: hst.hover, since: hst.since, candidate: hst.candidate };
  let show = null;
  let hide = false;
  if (targetKey !== next.hover) {
    hide = next.candidate != null;
    next = { hover: targetKey, since: now, candidate: null };
  } else if (targetKey && !next.candidate && now - next.since > HEADER_MS) {
    next.candidate = targetKey;
    show = targetKey;
  }
  return { hst: next, show, hide };
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Resting a dragged window over a pane body (port of ChatWindow.swift's dwell). `hit` is { key, id, edge, rect } or null, `p` the
// pointer, `shift` whether Shift is held. Pure: returns a new state and what to show or hide. lastP / lastAt survive a clear.
function dwellStep(st, hit, p, now, shift) {
  const s = Object.assign({}, st);
  const clear = () => {
    s.spot = null;
    s.pane = null;
    s.byShift = false;
  };
  if (!hit) {
    const hide = s.spot != null;
    clear();
    return { st: s, show: null, hide };
  }
  const dt = Math.max(now - s.lastAt, 1);
  const speed = s.lastP ? (dist(p, s.lastP) / dt) * 100 : Infinity;
  s.lastP = { x: p.x, y: p.y };
  s.lastAt = now;
  let hide = false;
  if (shift) {
    s.byShift = true;
    s.pane = hit.id;
    s.spot = hit;
    return { st: s, show: hit, hide: false };
  }
  if (s.byShift) {
    hide = hide || s.spot != null;
    clear();
  }
  if (s.spot && (s.spot.key !== hit.key || s.spot.id !== hit.id || dist(p, s.armP) > REARM)) {
    hide = true;
    clear();
  }
  if (s.spot) {
    s.spot = hit;
    return { st: s, show: hit, hide: false };
  }
  const deep = contains(inset(hit.rect, REST_INSET), p);
  if (hit.id !== s.pane || !deep || speed > REST_SPEED) {
    s.pane = deep ? hit.id : null;
    s.since = now;
  } else if (now - s.since > REST_MS) {
    s.armP = { x: p.x, y: p.y };
    s.spot = hit;
    return { st: s, show: hit, hide };
  }
  return { st: s, show: null, hide };
}

// The new window of a tear-off: the source's size (shrunk only to fit the work area), the pointer 30 px below its top and
// centred on it, the whole window kept inside the work area of the display the pointer is on.
function tearBounds(size, p, wa) {
  const width = Math.min(size.width, wa.width);
  const height = Math.min(size.height, wa.height);
  const x = Math.min(Math.max(Math.round(p.x - width / 2), wa.x), wa.x + wa.width - width);
  const y = Math.min(Math.max(Math.round(p.y - TEAR_POINTER_Y), wa.y), wa.y + wa.height - height);
  return { x, y, width, height };
}

// The topmost window of a front-to-back snapshot ({ hwnd, l, t, r, b } in physical pixels) at a physical point, leaving out
// the hwnds in `skip` (our own overlays, the dragged window). null when there is none.
function pickTop(phys, snapshot, skip) {
  for (const w of snapshot) {
    if (skip && skip.has(w.hwnd)) continue;
    if (phys.x >= w.l && phys.x < w.r && phys.y >= w.t && phys.y < w.b) return w.hwnd;
  }
  return null;
}

module.exports = {
  DRAG_SLOP, SLOT_SLOP, CENTRE, TEAR_BELOW, TEAR_POINTER_Y, MOVE_MIN, TICK_MS, HEADER_MS, REST_SPEED, REST_INSET, REST_MS, REARM,
  STRIP_H, FADE_MS, SLIDE_MS,
  contains, inset, nearestEdge, spotAt, halfRect, slotAt, markerRect, evenGeom, local, inBar, incomingSlot, headerRect,
  incomingMark, paneAt, tabDrop, paneDrop, inHeader, paneTargetAt, headerStep, dwellStep, tearBounds, pickTop,
};
