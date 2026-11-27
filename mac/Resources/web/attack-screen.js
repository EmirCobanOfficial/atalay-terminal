'use strict';

// (Since v3 the show on the screen is the 3D one, attack-screen3d.js, which takes window.AttackScreen over; this file is its
// layer (the reticle) and the whole show it falls back to when WebGL or the 3D files aren't there.)
// A friend's spaceship attack as the one fired at sees it, on the whole screen (the notices panel, messages.html, has the
// screen for it: Swift's place "attack", level screenSaver, every click passing through, never the focus, over a
// full-screen app and on every Space). attack.js (notices role) calls lock() as LOCKED ON shows, start() as the ship comes,
// cancel() when the sender took it back; the rest runs here, on one clock:
//   lock    the reticle closes onto the middle of the screen (its sender is not named).
//   0       a spaceship comes out of deep space at the middle and grows, banking, until it fills most of the screen's width.
//   FIRE    three shots from its cannons, bolts growing as they come at you; HITS: each lands on "the glass": a white flash,
//           a crack drawn out from the impact (rays, broken rings, shards), the picture shaking; the third is the big one
//           (BOOM) and DANGER names who fired (the notices page's banner, attack.js).
//   LEAVE   the ship rolls away into the distance; GONE: out of sight.
//   REFORM  the cracks seal, from their tips in, and are gone by WHOLE; END: the overlay is taken down.
// The timeline is the one the old map show had (blast 6.32 s after the ship starts, 7.92 s after the fire is answered
// counting the 1.6 s lock), so the attacker's own strike timeline (attack.js strike()) still lines up. Nothing is harmed.
// The ship, shots, sparks, flash and shake only move by transform and opacity (layers kept by the compositor); the cracks
// are SVG lines whose dash grows, each crack its own layer, repainted only while it draws out and while it seals.
// Reduced motion: no ship, shake or flash; one static crack that fades in at the blast and out again.
// It can't be left up: a guard takes it down if its end never comes (and the panel has its own, Messages.swift).
window.AttackScreen = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, x) => a + (b - a) * x;
  const easeOut = (x) => 1 - (1 - x) ** 3;
  const easeIn = (x) => x * x * x;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  // ms from the ship's start (the same numbers the old map show had, raid.js).
  const T = { FIRE: 5500, GAP: 170, BOLT: 480, BOOM: 6320, LEAVE: 6900, GONE: 9100, REFORM: 11400, WHOLE: 13800, END: 14500 };
  const HITS = [T.FIRE + T.BOLT, T.FIRE + T.GAP + T.BOLT, T.FIRE + 2 * T.GAP + T.BOLT]; // the third is BOOM
  const LOCK_GUARD = 4500; // a lock-on with no ship after it (its end never came) is taken down
  const SOUNDS = ['attack-flyby', 'attack-lasers', 'attack-boom', 'attack-rebuild'];

  let root = null;
  let st = null; // the run
  let guard = 0;
  const api = { onChange: null };
  const changed = () => {
    try {
      api.onChange && api.onChange();
    } catch {}
  };

  // Same numbers on every run when a seed is given (the preview page); random otherwise.
  function prng(seed) {
    let a = (seed == null ? Math.floor(Math.random() * 2 ** 31) : seed) >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const el = (tag, cls, parent) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  };
  const sv = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  // ---------- the ship: drawn once as SVG (1000 x 480 units, nose toward you), kept as a layer and only transformed ----------
  // The raider of the orbit map (models.js) seen head on: orange deck, a dark anti-glare panel ahead of a gold canopy, cream
  // stripe along the flanks, cranked delta wings banded orange, cream, orange, a cannon pod at each tip and a nose cannon,
  // an engine on each wing root (intake fan, hot rim), twin fins leaning out, an aerial. Left half drawn, the right mirrored.
  const CANNON = [[52, 268], [948, 268], [500, 374]]; // where the shots leave, in ship units
  const SHIP_W = 1000, SHIP_H = 480;
  const fan = (stroke, width, op) => {
    let s = '';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      s += `<line x1="${(292 + Math.cos(a) * 14).toFixed(1)}" y1="${(308 + Math.sin(a) * 14).toFixed(1)}" x2="${(292 + Math.cos(a + 0.35) * 55).toFixed(1)}" y2="${(308 + Math.sin(a + 0.35) * 55).toFixed(1)}"/>`;
    }
    return `<g stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" opacity="${op}">${s}</g>`;
  };
  function shipSVG() {
    const half = `
      <circle cx="292" cy="308" r="130" fill="url(#g-heat)" class="as-eng-glow"/>
      <path d="M470 300 L360 270 L190 238 L62 232 L26 252 L26 286 L70 306 L200 334 L360 356 L470 352 Z" fill="url(#g-wing)"/>
      <path d="M70 306 L200 334 L360 356 L470 352 L470 336 L360 340 L200 318 L56 296 Z" fill="#1a0d06" opacity=".55"/>
      <path d="M26 252 L62 232 L190 238 L360 270 L470 300" fill="none" stroke="#fff1de" stroke-width="3.2" stroke-linejoin="round" opacity=".85"/>
      <path d="M190 238 L204 332 M330 266 L346 355 M110 240 L124 316" stroke="#4a1d08" stroke-width="2" opacity=".42" fill="none"/>
      <path d="M96 262 L180 266 M240 282 L350 292" stroke="#4a1d08" stroke-width="1.6" opacity=".35" fill="none"/>
      <circle cx="150" cy="288" r="9" fill="none" stroke="#7a2e0a" stroke-width="3" opacity=".7"/>
      <circle cx="150" cy="288" r="3.4" fill="#7a2e0a" opacity=".7"/>
      <rect x="14" y="238" width="78" height="60" rx="26" fill="url(#g-metal)"/>
      <circle cx="52" cy="268" r="31" fill="url(#g-metal)" stroke="#ff8a1f" stroke-width="3.2"/>
      <circle cx="52" cy="268" r="21" fill="#0d0705"/>
      <circle cx="52" cy="268" r="14" fill="url(#g-charge)" class="as-charge"/>
      <circle cx="292" cy="308" r="80" fill="url(#g-shell)"/>
      <circle cx="292" cy="308" r="74" fill="none" stroke="#ffb347" stroke-width="5"/>
      <circle cx="292" cy="308" r="67" fill="none" stroke="#fff1de" stroke-width="2" opacity=".7"/>
      <circle cx="292" cy="308" r="58" fill="#0c0604"/>
      ${fan('#3a2012', 7, 1)}${fan('#ff8a1f', 1.4, 0.75)}
      <circle cx="292" cy="308" r="58" fill="none" stroke="#ff6a1a" stroke-width="2.2" opacity=".8"/>
      <circle cx="292" cy="308" r="19" fill="url(#g-hub)"/>
      <circle cx="292" cy="308" r="19" fill="none" stroke="#ffd9a0" stroke-width="1.6" opacity=".8"/>
      <path d="M440 156 L378 44 L398 36 L474 146 Z" fill="url(#g-fin)"/>
      <path d="M378 44 L398 36" stroke="#fff1de" stroke-width="3" stroke-linecap="round"/>
      <path d="M432 140 L396 78" stroke="#7a2e0a" stroke-width="2" opacity=".5"/>
      <circle cx="26" cy="268" r="4.2" fill="#ffd23f" class="as-nav"/>`;
    return `<svg xmlns="${NS}" viewBox="0 0 ${SHIP_W} ${SHIP_H}" width="${SHIP_W}" height="${SHIP_H}" aria-hidden="true">
    <defs>
      <linearGradient id="g-wing" gradientUnits="userSpaceOnUse" x1="26" y1="0" x2="470" y2="0">
        <stop offset="0" stop-color="#ff9a2c"/><stop offset=".3" stop-color="#ff8a1f"/><stop offset=".31" stop-color="#fff1de"/>
        <stop offset=".4" stop-color="#e9c9a0"/><stop offset=".41" stop-color="#ff8a1f"/><stop offset="1" stop-color="#c24a0c"/>
      </linearGradient>
      <linearGradient id="g-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a77452"/><stop offset=".5" stop-color="#4a2c1c"/><stop offset="1" stop-color="#1a0d07"/></linearGradient>
      <radialGradient id="g-shell" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="#b98055"/><stop offset=".5" stop-color="#4a2a18"/><stop offset="1" stop-color="#150a05"/></radialGradient>
      <radialGradient id="g-hub" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fff0d0"/><stop offset=".5" stop-color="#d8742a"/><stop offset="1" stop-color="#5a2308"/></radialGradient>
      <radialGradient id="g-charge"><stop offset="0" stop-color="#fffbe6"/><stop offset=".45" stop-color="#ffb020"/><stop offset="1" stop-color="#e2480c"/></radialGradient>
      <radialGradient id="g-heat"><stop offset="0" stop-color="#ffd27a" stop-opacity=".9"/><stop offset=".4" stop-color="#ff7a1a" stop-opacity=".55"/><stop offset="1" stop-color="#ff4a12" stop-opacity="0"/></radialGradient>
      <linearGradient id="g-fin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb347"/><stop offset="1" stop-color="#c24a0c"/></linearGradient>
      <linearGradient id="g-deck" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffb05a"/><stop offset=".5" stop-color="#ff7a1a"/><stop offset="1" stop-color="#b8430c"/></linearGradient>
      <linearGradient id="g-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffeab0"/><stop offset=".35" stop-color="#e3a037"/><stop offset=".7" stop-color="#7a4513"/><stop offset="1" stop-color="#26130a"/></linearGradient>
      <linearGradient id="g-belly" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2012"/><stop offset="1" stop-color="#0c0604"/></linearGradient>
      <g id="g-half">${half}</g>
    </defs>
    <use href="#g-half"/>
    <use href="#g-half" transform="translate(1000 0) scale(-1 1)"/>
    <g>
      <path d="M500 62 C566 70 596 150 600 232 C604 304 588 380 542 422 L500 444 L458 422 C412 380 396 304 400 232 C404 150 434 70 500 62 Z" fill="url(#g-deck)"/>
      <path d="M404 232 C410 330 440 400 500 430 C560 400 590 330 596 232 C602 304 588 380 542 422 L500 444 L458 422 C412 380 398 304 404 232 Z" fill="#6a2a08" opacity=".35"/>
      <path d="M470 150 L530 150 L552 218 L448 218 Z" fill="#241208"/>
      <path d="M470 150 L530 150" stroke="#ff8a1f" stroke-width="2.4" opacity=".8"/>
      <path d="M420 250 C418 300 430 350 452 392 M580 250 C582 300 570 350 548 392" stroke="#fff1de" stroke-width="9" stroke-linecap="round" fill="none" opacity=".92"/>
      <path d="M452 296 C452 238 474 206 500 206 C526 206 548 238 548 296 C548 318 526 328 500 328 C474 328 452 318 452 296 Z" fill="url(#g-glass)" stroke="#2a1409" stroke-width="3"/>
      <path d="M500 206 L500 328 M456 268 C480 258 520 258 544 268" stroke="#2a1409" stroke-width="3" fill="none" opacity=".8"/>
      <path d="M462 276 C464 238 480 218 498 212 C486 232 480 254 482 288 Z" fill="#fff" opacity=".42"/>
      <path d="M506 316 C526 314 540 306 546 290 C540 312 526 324 506 326 Z" fill="#ff8a1f" opacity=".5"/>
      <path d="M452 348 L548 348 L540 422 L500 444 L460 422 Z" fill="url(#g-belly)"/>
      <circle cx="500" cy="374" r="26" fill="url(#g-metal)" stroke="#ff8a1f" stroke-width="3"/>
      <circle cx="500" cy="374" r="17" fill="#0d0705"/>
      <circle cx="500" cy="374" r="11" fill="url(#g-charge)" class="as-charge"/>
      <path d="M500 62 L500 14" stroke="#fff1de" stroke-width="3.2" stroke-linecap="round"/>
      <circle cx="500" cy="12" r="5" fill="#ffd23f" class="as-nav"/>
    </g>
  </svg>`;
  }

  // ---------- the cracked glass ----------
  // Rays from the impact, each a few jagged segments, some branching; three rings of broken glass joining neighbouring rays;
  // a little star of splinters at the impact. All in a 2R x 2R box centred on the impact. Each path: its length and how far
  // from the impact it starts, so the picture can draw them as a front moving out from the impact (paintCrack()).
  function makeCrack(rand, R, big) {
    const rnd = (a, b) => a + rand() * (b - a);
    const paths = [];
    const add = (pts, kind, w, r0) => {
      let len = 0;
      for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      paths.push({ d: 'M' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L'), len, kind, w, r0 });
    };
    const walk = (x, y, ang, reach, step, wobble, d0) => {
      const pts = [[x, y, d0]];
      let d = d0;
      while (d < d0 + reach) {
        const s = step * rnd(0.7, 1.3);
        ang += rnd(-wobble, wobble);
        x += Math.cos(ang) * s;
        y += Math.sin(ang) * s;
        d += s;
        pts.push([x, y, d]);
      }
      return pts;
    };
    const n = big ? 14 : 9;
    const rays = [];
    for (let k = 0; k < n; k++) {
      const a = ((k + rnd(-0.34, 0.34)) / n) * TAU;
      const L = R * (big ? rnd(0.6, 1) : rnd(0.5, 1)) * (k % 3 === 0 ? 1 : 0.82);
      const pts = walk(R, R, a, L, R * 0.075, 0.2, 0);
      rays.push({ a, pts, L });
      add(pts, 'ray', big ? 1.7 : 1.4, 0);
      if (rand() < 0.75) {
        const i = 2 + Math.floor(rand() * Math.max(1, pts.length - 4));
        const p = pts[i];
        const side = rand() < 0.5 ? -1 : 1;
        const bpts = walk(p[0], p[1], a + side * rnd(0.4, 0.95), Math.max(R * 0.05, (L - p[2]) * rnd(0.3, 0.7)), R * 0.06, 0.26, p[2]);
        add(bpts, 'branch', 1, p[2]);
      }
    }
    const at = (ray, rad) => {
      const q = ray.pts;
      for (let i = 1; i < q.length; i++) {
        if (q[i][2] >= rad) {
          const f = (rad - q[i - 1][2]) / Math.max(1e-6, q[i][2] - q[i - 1][2]);
          return [lerp(q[i - 1][0], q[i][0], f), lerp(q[i - 1][1], q[i][1], f)];
        }
      }
      return null;
    };
    [0.13, 0.26, 0.44].forEach((f) => {
      const rr = R * f * (big ? 1 : 0.85);
      for (let k = 0; k < n; k++) {
        if (rand() > 0.74) continue;
        const a = at(rays[k], rr * rnd(0.92, 1.08)), b = at(rays[(k + 1) % n], rr * rnd(0.92, 1.08));
        if (!a || !b) continue;
        const mx = (a[0] + b[0]) / 2 + (rand() - 0.5) * rr * 0.16, my = (a[1] + b[1]) / 2 + (rand() - 0.5) * rr * 0.16;
        add([a, [mx, my], b], 'ring', 1, rr);
      }
    });
    for (let k = 0; k < 6; k++) {
      const a = rnd(0, TAU), l = R * rnd(0.025, 0.06);
      add([[R, R], [R + Math.cos(a) * l, R + Math.sin(a) * l]], 'core', 3, 0);
    }
    // Shards: small bright slivers on the rays and rings, where the glass would catch the light.
    const shards = [];
    const spots = paths.filter((p) => p.kind !== 'core');
    for (let i = 0; i < (big ? 22 : 13); i++) {
      const p = spots[Math.floor(rand() * spots.length)];
      const m = /M([\d.]+) ([\d.]+) L([\d.]+) ([\d.]+)/.exec(p.d);
      if (!m) continue;
      const f = rand();
      shards.push({ x: lerp(+m[1], +m[3], f), y: lerp(+m[2], +m[4], f), s: rnd(3, 10), rot: rnd(0, 360), at: p.r0 / R + rnd(0, 0.15), tw: rnd(1.1, 2.4), dl: rnd(0, 1.2) });
    }
    return { paths, shards };
  }

  // ---------- building and taking down ----------
  function build() {
    if (root) return;
    root = el('div');
    root.id = 'atk-screen';
    root.setAttribute('aria-hidden', 'true');
    el('div', 'as-dim', root);
    const world = el('div', 'as-world', root);
    el('div', 'as-ret', root).innerHTML = '<div class="rt"><i class="b1"></i><i class="b2"></i><i class="b3"></i><i class="b4"></i></div>';
    if (reduced()) root.classList.add('still');
    document.body.appendChild(root);
    root._world = world;
    changed();
  }

  // Takes it all down. A show that was running is ended as at its END (its onEnd called once), whatever took it down: its
  // own end, its guard, or the next attack's lock-on cutting in.
  function destroy() {
    clearTimeout(guard);
    guard = 0;
    const end = st && st.opts.onEnd;
    if (st) {
      cancelAnimationFrame(st.raf);
      st.timers.forEach(clearTimeout);
      st = null;
    }
    if (root) {
      root.remove();
      root = null;
      changed();
    }
    try {
      end && end();
    } catch {}
  }

  // The lock-on: the reticle closes onto the middle of the screen. The ship follows with start(), or cancel().
  function lock() {
    destroy();
    build();
    SOUNDS.forEach((s) => window.Sfx && Sfx.preload && Sfx.preload(s));
    guard = setTimeout(destroy, LOCK_GUARD);
  }

  // The ship's whole show. `opts`: onBlast (called at BOOM + 350 ms: attack.js raises DANGER), onEnd, seed (the same
  // cracks each run), manual (the preview page steps it with seek()), t0 (performance.now() its clock starts from).
  function start(opts = {}) {
    // One already running (its lock-on never came for this one): taken down first, never left running beside it.
    if (st) destroy();
    if (!root) build();
    clearTimeout(guard);
    // The panel was given the screen a moment ago; the page may not have its new size yet.
    const begin = (tries) => {
      if (!root) return;
      if (innerWidth < 600 && tries > 0) return void (guard = setTimeout(() => begin(tries - 1), 80));
      run(opts);
    };
    begin(12);
  }

  function run(opts) {
    const S = { opts, timers: [], cues: [], raf: 0, t0: 0 };
    st = S;
    // a guard: whatever happens to the clock (or to the building below), it's down in the end; the preview page's steps
    // stay as long as it likes
    if (!opts.manual) S.timers.push(setTimeout(() => st === S && finish(), T.END + 4000));
    try {
      layOut(S, opts);
    } catch {
      // Something failed half way: nothing left on the screen (the panel lets it go), DANGER still raised.
      try {
        opts.onBlast && opts.onBlast();
      } catch {}
      return void destroy();
    }
    if (opts.manual) return void render(0);
    // t0: the clock already running (attack-screen3d.js falls back to this show with the 3D one's start)
    S.t0 = opts.t0 > 0 ? opts.t0 : performance.now();
    const loop = (now) => {
      if (st !== S) return;
      step(now - S.t0);
      if (st === S) S.raf = requestAnimationFrame(loop);
    };
    S.raf = requestAnimationFrame(loop);
  }

  // Everything of the show put in place for this screen (still out of sight), and its cues.
  function layOut(S, opts) {
    const W = innerWidth, H = innerHeight;
    const calm = reduced();
    const rand = prng(opts.seed);
    const k = clamp(W / 1920, 0.6, 1.8); // sizes in pixels follow the screen
    const world = root._world;
    root.classList.add('on');
    Object.assign(S, { W, H, k, calm, world, rand });
    S.dim = root.querySelector('.as-dim');
    S.ret = root.querySelector('.as-ret');
    // the ship
    const shipW = Math.min(0.78 * W, 1.5 * H), shipH = shipW * (SHIP_H / SHIP_W);
    S.ship = { w: shipW, h: shipH, u: shipW / SHIP_W };
    if (!calm) {
      S.halo = el('div', 'as-halo', world);
      S.warp = el('div', 'as-warp', world);
      S.shipEl = el('div', 'as-ship', world);
      S.shipEl.style.width = `${shipW}px`;
      S.shipEl.style.height = `${shipH}px`;
      S.shipEl.innerHTML = shipSVG();
      S.halo.style.width = S.halo.style.height = `${shipW * 1.7}px`;
    }
    // the impact points (on "the glass"), one for each shot; the third is in the middle
    const pts = [[0.33 * W, 0.4 * H], [0.68 * W, 0.37 * H], [0.5 * W, 0.53 * H]];
    S.hits = pts.map(([x, y], i) => {
      const big = i === 2;
      const R = (big ? 0.5 : 0.28) * Math.max(W, H);
      const crack = makeCrack(rand, R, big);
      const box = el('div', 'as-crack', world);
      box.style.cssText = `left:${(x - R).toFixed(1)}px;top:${(y - R).toFixed(1)}px;width:${(2 * R).toFixed(1)}px;height:${(2 * R).toFixed(1)}px;opacity:0`;
      const svg = sv('svg', { viewBox: `0 0 ${2 * R} ${2 * R}`, width: 2 * R, height: 2 * R }, box);
      const defs = sv('defs', {}, svg);
      const g = sv('radialGradient', { id: `as-milk${i}` }, defs);
      sv('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 0.42 }, g);
      sv('stop', { offset: 0.5, 'stop-color': '#ffe9cf', 'stop-opacity': 0.16 }, g);
      sv('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 }, g);
      const milk = sv('circle', { cx: R, cy: R, r: R * (big ? 0.2 : 0.14), fill: `url(#as-milk${i})`, opacity: 0 }, svg);
      // each line three times: its warm glow (a wide faint stroke, not a filter: attack.css), its dark edge, the line itself
      const glow = sv('g', { class: 'gl' }, svg), dark = sv('g', { class: 'dk' }, svg), lite = sv('g', { class: 'lt' }, svg);
      const els = crack.paths.map((p) => {
        const w = p.w * k * (big ? 1.2 : 1);
        const g = sv('path', { d: p.d, 'stroke-width': (w + 5).toFixed(2) }, glow);
        const a = sv('path', { d: p.d, 'stroke-width': (w + 1.5).toFixed(2) }, dark);
        const b = sv('path', { d: p.d, 'stroke-width': w.toFixed(2) }, lite);
        g.style.strokeDasharray = a.style.strokeDasharray = b.style.strokeDasharray = '0 99999';
        return { p, g, a, b, shown: -1 };
      });
      const shards = crack.shards.map((s) => {
        const d = el('i', 'as-shard', box);
        const sz = s.s * k;
        d.style.cssText = `left:${(s.x - sz / 2).toFixed(1)}px;top:${(s.y - sz / 2).toFixed(1)}px;width:${sz.toFixed(1)}px;height:${sz.toFixed(1)}px;transform:rotate(${s.rot.toFixed(0)}deg);--tw:${s.tw.toFixed(2)}s;--dl:${s.dl.toFixed(2)}s`;
        return { d, s, on: false };
      });
      // the flash of the impact: a ring and a hot core, and sparks
      const burst = el('div', 'as-burst', world);
      burst.style.cssText = `left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;visibility:hidden`;
      burst.innerHTML = '<i class="ring"></i><i class="core"></i>';
      const sparks = [];
      for (let q = 0; q < (big ? 26 : 12); q++) {
        const sp = el('i', 'as-spark', world);
        sp.style.cssText = `left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;visibility:hidden`;
        sparks.push({ sp, a: rand() * TAU, v: (big ? 700 : 420) * k * (0.4 + rand() * 0.9), l: 380 + rand() * (big ? 700 : 380), s: (6 + rand() * 12) * k });
      }
      // the shot that makes it
      let bolt = null;
      if (!calm) {
        const b = el('div', 'as-bolt', world);
        bolt = { b, trail: el('i', 'tr', b), head: el('i', 'hd', b), flare: el('div', 'as-flare', world) };
        b.style.visibility = 'hidden';
      }
      return { x, y, R, big, box, milk, els, shards, burst, ring: burst.firstChild, core: burst.lastChild, sparks, bolt, at: HITS[i], tf: HITS[i] - T.BOLT, u: -1, seal: -1 };
    });
    S.flash = el('div', 'as-flash', root);
    // sounds and cues, each at its moment (the old map show's)
    const snd = (name, vol) => window.Sfx && Sfx.sample && Sfx.sample(name, vol);
    if (!calm) S.cues.push({ at: 0, fn: () => snd('attack-flyby', 0.8) }, { at: T.FIRE, fn: () => snd('attack-lasers', 0.9) });
    S.cues.push({ at: T.BOOM, fn: () => snd('attack-boom', 1) });
    S.cues.push({ at: T.BOOM + 350, fn: () => opts.onBlast && opts.onBlast() });
    if (!calm) S.cues.push({ at: T.LEAVE + 150, fn: () => snd('attack-flyby', 0.4) });
    S.cues.push({ at: T.REFORM, fn: () => snd('attack-rebuild', 0.7) });
    S.cues.push({ at: T.END, fn: () => finish() });
    S.cues.forEach((c) => (c.done = false));
  }

  function step(t) {
    const S = st;
    if (!S) return;
    for (const c of S.cues) {
      if (!c.done && t >= c.at) {
        c.done = true;
        try {
          c.fn();
        } catch {}
        if (st !== S) return;
      }
    }
    // (a frame that fails to draw doesn't stop the clock: DANGER and the end still come)
    try {
      render(t);
    } catch {}
  }

  // The show's end: taken down, its onEnd called (destroy()).
  const finish = () => destroy();

  // ---------- one frame, from the time alone ----------
  const px = (v) => v.toFixed(2);
  function render(t) {
    const S = st;
    if (!S) return;
    const { k, calm } = S;
    // shake of the picture, a little punch toward you and the white flash, at each hit
    let sx = 0, sy = 0, zoom = 1, flash = 0;
    const amp = [11, 11, 30], tau = [380, 380, 820], fl = [0.5, 0.5, 0.95], fd = [130, 130, 300];
    if (!calm) {
      S.hits.forEach((h, i) => {
        const d = t - h.at;
        if (d < 0) return;
        const e = Math.exp(-d / (tau[i] / 3));
        sx += amp[i] * k * e * Math.sin(d * 0.093 + i * 2);
        sy += amp[i] * k * e * Math.cos(d * 0.121 + i);
        zoom += (i === 2 ? 0.014 : 0.006) * Math.exp(-d / 220);
        flash += fl[i] * Math.exp(-d / fd[i]);
      });
    }
    S.world.style.transform = calm ? '' : `translate3d(${px(sx)}px,${px(sy)}px,0) scale(${zoom.toFixed(4)})`;
    S.flash.style.opacity = clamp(flash).toFixed(3);
    // the edges darken with the ship, deeper at the blast, and are clear again as the glass is whole
    const dimUp = calm ? 0 : clamp(t / 3500) * 0.55 + (t > T.BOOM ? 0.3 * Math.exp(-(t - T.BOOM) / 1400) : 0);
    S.dim.style.opacity = (dimUp * (1 - clamp((t - T.REFORM) / (T.WHOLE - T.REFORM)))).toFixed(3);
    // the reticle goes at the blast
    S.ret.style.opacity = (1 - clamp((t - (T.BOOM - 150)) / 250)).toFixed(3);
    if (!calm) renderShip(S, t);
    S.hits.forEach((h, i) => renderHit(S, h, i, t));
  }

  // The ship's place at t: [x, y, scale (of its drawn size), roll (rad), opacity]. Out of deep space at the middle, growing
  // as it nears (steady proportional growth, a little faster at the end), banking; then drifting, firing; then rolling away.
  function shipAt(S, t) {
    const { W, H } = S;
    const s0 = 0.034, s1 = 1;
    const u = clamp(t / (T.FIRE - 200));
    const grow = u * (0.62 + 0.38 * u);
    let s = s0 * (s1 / s0) ** grow;
    let x = lerp(0.56 * W, 0.5 * W, easeOut(u)), y = lerp(0.43 * H, 0.46 * H, easeOut(u));
    let roll = lerp(-0.42, 0, easeOut(u)) + 0.022 * Math.sin(t / 700);
    let op = clamp(t / 260);
    if (t > T.FIRE - 200) {
      const d = t - (T.FIRE - 200);
      s = 1 + 0.05 * clamp(d / 2000);
      x = 0.5 * W + 0.01 * W * Math.sin(d / 900);
      y = 0.46 * H + 0.008 * H * Math.sin(d / 760);
      roll = 0.022 * Math.sin(t / 700);
    }
    // recoil at each shot
    for (let i = 0; i < 3; i++) {
      const d = t - (T.FIRE + i * T.GAP);
      if (d > 0 && d < 260) s *= 1 - 0.018 * Math.sin((d / 260) * Math.PI);
    }
    if (t > T.LEAVE) {
      const v = easeIn(clamp((t - T.LEAVE) / (T.GONE - T.LEAVE)));
      const sh = s;
      s = sh * (0.03 / sh) ** v;
      x = lerp(x, 0.74 * W, easeOut(v));
      y = lerp(y, 0.27 * H, easeOut(v));
      roll = lerp(roll, 0.62, easeOut(v));
      op = 1 - clamp((v - 0.78) / 0.22);
    }
    return [x, y, s, roll, op];
  }

  function renderShip(S, t) {
    const { k } = S;
    const [x, y, s, roll, op] = shipAt(S, t);
    const u = S.ship.u;
    const vis = op > 0.003;
    S.shipEl.style.visibility = S.halo.style.visibility = vis ? 'visible' : 'hidden';
    if (vis) {
      S.shipEl.style.opacity = op.toFixed(3);
      S.shipEl.style.transform = `translate3d(${px(x - S.ship.w / 2)}px,${px(y - S.ship.h / 2)}px,0) rotate(${roll.toFixed(4)}rad) scale(${s.toFixed(4)})`;
      // the engines' glow behind it, breathing; flaring as it leaves
      const flare = t > T.LEAVE ? 1 + 0.8 * Math.exp(-(t - T.LEAVE) / 500) : 1;
      S.halo.style.opacity = clamp(op * (0.5 + 0.12 * Math.sin(t / 95)) * clamp(t / 700) * flare).toFixed(3);
      S.halo.style.transform = `translate3d(${px(x - S.ship.w * 0.85)}px,${px(y - S.ship.w * 0.85)}px,0) scale(${s.toFixed(4)})`;
    }
    // coming out of deep space: a point of light
    const wq = clamp(t / 760);
    const [wx, wy] = shipAt(S, 0);
    S.warp.style.opacity = (Math.sin(wq * Math.PI) ** 0.8).toFixed(3);
    S.warp.style.transform = `translate3d(${px(wx - 150)}px,${px(wy - 150)}px,0) scale(${(0.15 + 0.9 * wq * k).toFixed(3)})`;
    // the shots, from the cannons as the ship carries them
    const cos = Math.cos(roll), sin = Math.sin(roll);
    const muzzle = (i) => {
      const [cx, cy] = CANNON[i];
      const lx = (cx - SHIP_W / 2) * u * s, ly = (cy - SHIP_H / 2) * u * s;
      return [x + lx * cos - ly * sin, y + lx * sin + ly * cos];
    };
    S.hits.forEach((h, i) => {
      const bo = h.bolt;
      const p = (t - h.tf) / T.BOLT;
      const live = p > 0 && p < 1 && op > 0.1;
      bo.b.style.visibility = live ? 'visible' : 'hidden';
      const q = (t - h.tf) / 170; // the muzzle flash
      const fq = q > 0 && q < 1;
      bo.flare.style.opacity = fq ? (Math.sin(q * Math.PI) ** 0.7).toFixed(3) : '0';
      if (fq) {
        const [mx, my] = muzzle(i);
        bo.flare.style.transform = `translate3d(${px(mx - 120)}px,${px(my - 120)}px,0) scale(${((i === 2 ? 1.5 : 1.15) * k * (0.5 + 0.8 * Math.sin(q * Math.PI)) * Math.max(0.5, s)).toFixed(3)})`;
      }
      if (!live) return;
      const [mx, my] = muzzle(i);
      const e = p ** 1.6, e0 = Math.max(0, p - 0.3) ** 1.6;
      const hx = lerp(mx, h.x, e), hy = lerp(my, h.y, e), tx = lerp(mx, h.x, e0), ty = lerp(my, h.y, e0);
      const ang = Math.atan2(hy - ty, hx - tx), len = Math.max(2, Math.hypot(hx - tx, hy - ty));
      const r = (7 + 62 * p ** 2.2) * k * (i === 2 ? 1.45 : 1);
      bo.trail.style.transform = `translate3d(${px(tx)}px,${px(ty)}px,0) rotate(${ang.toFixed(4)}rad) scale(${px(len)},${px(r * 0.9)})`;
      bo.head.style.transform = `translate3d(${px(hx - 60)}px,${px(hy - 60)}px,0) scale(${(r / 38).toFixed(3)})`;
    });
  }

  // Draws a crack: `rr` the radius the cracking has reached (px), `f` how much of every line is left (1 whole, 0 sealed).
  function paintCrack(h, rr, f) {
    h.els.forEach((e) => {
      const p = e.p;
      const a = clamp((rr - p.r0) * (p.kind === 'ring' ? 3 : 1), 0, p.len) * f;
      const key = Math.round(a * 2);
      if (key === e.shown) return;
      e.shown = key;
      e.g.style.strokeDasharray = e.a.style.strokeDasharray = e.b.style.strokeDasharray = `${a.toFixed(1)} 99999`;
    });
  }

  function renderHit(S, h, i, t) {
    const { calm } = S;
    // Reduced motion: only the big one, faded in whole at the blast, out as it seals.
    if (calm && i !== 2) return;
    const d = t - h.at;
    const drawMs = h.big ? 560 : 300;
    const sealQ = clamp((t - T.REFORM - i * 260) / (T.WHOLE - T.REFORM - 600));
    if (d < 0) return;
    const u = calm ? 1 : easeOut(clamp(d / drawMs));
    const f = 1 - easeIn(sealQ) * 0.97;
    h.box.style.opacity = (calm ? clamp(d / 260) * (1 - clamp((sealQ - 0.2) / 0.8)) : 1 - clamp((sealQ - 0.55) / 0.45)).toFixed(3);
    if (u !== h.u || sealQ !== h.seal) {
      h.u = u;
      h.seal = sealQ;
      paintCrack(h, u * h.R * 1.06, f);
      h.milk.setAttribute('opacity', (clamp(u * 3) * (1 - clamp(sealQ * 2))).toFixed(3));
      h.shards.forEach((s) => {
        const on = u > s.s.at && sealQ < 0.5;
        if (on !== s.on) {
          s.on = on;
          s.d.classList.toggle('on', on);
        }
      });
    }
    renderBurst(S, h, d);
  }

  function renderBurst(S, h, d) {
    if (S.calm) return;
    const { k } = S;
    const life = h.big ? 900 : 560;
    const live = d >= 0 && d < life + 700;
    h.burst.style.visibility = d >= 0 && d < life ? 'visible' : 'hidden';
    if (!live) return;
    const x = clamp(d / life);
    h.ring.style.opacity = (1 - x).toFixed(3);
    h.ring.style.transform = `translate3d(-50%,-50%,0) scale(${((h.big ? 2.8 : 1.5) * (0.1 + 0.9 * easeOut(x)) * k).toFixed(3)})`;
    const c = clamp(d / (h.big ? 420 : 240));
    h.core.style.opacity = (1 - c).toFixed(3);
    h.core.style.transform = `translate3d(-50%,-50%,0) scale(${((h.big ? 2.2 : 1.1) * (0.4 + c) * k).toFixed(3)})`;
    h.sparks.forEach((q) => {
      const z = d / q.l;
      q.sp.style.visibility = z < 1 ? 'visible' : 'hidden';
      if (z >= 1) return;
      const r = q.v * (q.l / 1000) * easeOut(z);
      q.sp.style.opacity = (1 - z).toFixed(3);
      q.sp.style.transform = `translate3d(${px(Math.cos(q.a) * r)}px,${px(Math.sin(q.a) * r)}px,0) rotate(${q.a.toFixed(3)}rad) scale(${(q.s * (1 - z * 0.6)).toFixed(2)},1)`;
    });
  }

  return Object.assign(api, {
    lock,
    start,
    cancel: destroy, // the sender took it back during the lock-on
    active: () => !!root,
    hold: () => { // attack-screen3d.js runs the show on this layer: the lock-on's guard must not take it down meanwhile
      clearTimeout(guard);
      guard = 0;
    },
    T,
    seek: (ms) => step(ms), // the preview page: one frame, from the time alone
    end: () => finish(),
  });
})();
