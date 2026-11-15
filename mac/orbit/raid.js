// A friend's spaceship attack on the map (the app's attack.js starts it and times its sounds and the dashboard's flames
// to it; the API's attack.ts sends it). A raider (models.js) drops in from deep space, swings onto an orbit of its own
// round the core and goes most of the way round it, slows beside it, turns its nose in and fires three pairs of lasers
// from its wingtips. The third blows the core up: a flash, two rings of the blast, the core itself broken into pieces
// that fly apart glowing at their edges, lumps of debris, sparks, a cloud of smoke, and the map's light going out with
// it; the ship rolls and flies off. Five seconds on the pieces come back, seat themselves, their seams glow and cool,
// and the core is as it was, to the last tick (finish() puts back everything the raid touched). Nothing else on the map
// is harmed: the stations flash and the sessions hurry on a moment as the blast passes. All of it is drawn in the
// scene, so it can't be clicked or get in the way of a click, and all of it follows the time since it began: a frame
// missed, or a slow one, changes nothing.
import * as THREE from 'three';
import { RING_BAND, ringMaterial, setRing } from './batch.js';
import { buildRaider, RAIDER_LENGTH } from './models.js';
import { clamp, easeInOut, easeOut, lerp, rng, TAU } from './util.js';

// When things happen, in ms from its start (start() hands attack.js the ones it needs): onto its orbit by ENTER, slowing
// from SLOW, the three shots from FIRE (GAP apart, each bolt BOLT on its way), the core blown up at BOOM as the third
// lands, the ship away from LEAVE and out of sight by GONE, the pieces on their way back from REFORM, the core whole
// again at WHOLE, its seams cool by END.
const T = { ENTER: 2400, SLOW: 5000, FIRE: 5800, GAP: 140, BOLT: 240, BOOM: 6320, LEAVE: 6900, GONE: 9100, REFORM: 11400, WHOLE: 13800, END: 14500 };
const SHOTS = [0, 1, 2].map((k) => T.FIRE + k * T.GAP);
// The ship on the map: 108 units from nose to nozzles (a car on the lane is 50, the blue box 56 tall), so its shape
// reads at the default zoom.
const SHIP = 3.6;
// Its orbit: the radius (outside the sessions, inside the cars' lane), how far its plane leans back from the screen
// (it shows as an ellipse round the core, the far side at the top), its speed round it (rad/s) and beside the core,
// how far it banks into the turn, and where on it it fires from (right of the core, a little to the near side).
const ORBIT = { R: 262, LEAN: 0.9, W0: 1.2, W1: 0.22, BANK: 0.3, AIM: TAU - 0.3 };
// Warm, like the app.
const AMBER = new THREE.Color('#ffd23f'), ORANGE = new THREE.Color('#ff8a1f'), HOT = new THREE.Color('#ff4a12'), CREAM = new THREE.Color('#ffe7c4');
const PALE = new THREE.Color('#fff4e0'), WHITE = new THREE.Color(1, 1, 1), ASH = new THREE.Color('#6a5b50'), SCORCH = new THREE.Color('#c96a2a');
const ORIGIN = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1), STILL = new THREE.Quaternion();
const easeIn = (x) => x * x * x;
const span = (t, from, ms) => clamp((t - from) / ms, 0, 1);

// How far round its orbit the ship is at t (rad): steady, then slowing over SLOW..FIRE to a drift.
function along(t) {
  let a = (ORBIT.W0 * Math.min(t, T.SLOW)) / 1000;
  if (t > T.SLOW) {
    const d = (T.FIRE - T.SLOW) / 1000, x = Math.min(t - T.SLOW, T.FIRE - T.SLOW) / 1000;
    a += ORBIT.W0 * x - ((ORBIT.W0 - ORBIT.W1) * x * x) / (2 * d);
  }
  if (t > T.FIRE) a += (ORBIT.W1 * (t - T.FIRE)) / 1000;
  return a;
}

// Directions and speeds for n sparks, the same on every run.
function sparkSet(n, seed, v0, v1, life0, life1, cols, size) {
  const r = rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - u * u);
    out.push({ d: new THREE.Vector3(Math.cos(a) * s, u, Math.sin(a) * s), v: v0 + r() * (v1 - v0), life: life0 + r() * (life1 - life0), col: cols[i % cols.length], size: size * (0.7 + r() * 0.7), at: r() });
  }
  return out;
}
const SPARKS = sparkSet(150, 3, 220, 900, 0.5, 1.4, [WHITE, AMBER, ORANGE, PALE, AMBER], 3.4);
const EMBERS = sparkSet(60, 5, 60, 230, 1.5, 3.2, [ORANGE, HOT, AMBER], 2.8);
const HITS = sparkSet(22, 9, 90, 300, 0.25, 0.6, [AMBER, PALE], 2.6);
const GATHER = sparkSet(70, 13, 180, 360, 0.7, 1.1, [AMBER, PALE, ORANGE], 2.8);
const MENDED = sparkSet(50, 17, 80, 260, 0.4, 0.9, [PALE, AMBER], 2.6);
const FIREBALL = sparkSet(10, 21, 40, 110, 0.45, 0.75, [ORANGE, HOT, AMBER], 70);

// A puff of smoke: a ragged cloud, its edge eaten by noise, not a round blob. White; each puff tints it.
let smokeTex = null;
function smoke() {
  if (smokeTex) return smokeTex;
  const s = 128, cv = document.createElement('canvas'), r = rng(11);
  cv.width = cv.height = s;
  const x = cv.getContext('2d'), img = x.createImageData(s, s);
  // Three layers of soft noise, coarse to fine.
  const layers = [[4, 0.5], [9, 0.32], [18, 0.18]].map(([n, w]) => ({ n, w, g: Array.from({ length: (n + 1) * (n + 1) }, () => r()) }));
  const noise = ({ n, g }, u, v) => {
    const ix = Math.min(n - 1, Math.floor(u * n)), iy = Math.min(n - 1, Math.floor(v * n));
    const tx = u * n - ix, ty = v * n - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), at = (i, j) => g[j * (n + 1) + i];
    return lerp(lerp(at(ix, iy), at(ix + 1, iy), sx), lerp(at(ix, iy + 1), at(ix + 1, iy + 1), sx), sy);
  };
  for (let j = 0; j < s; j++) {
    for (let i = 0; i < s; i++) {
      const u = i / (s - 1), v = j / (s - 1), d = Math.hypot(u - 0.5, v - 0.5) * 2;
      const a = clamp((layers.reduce((t, l) => t + l.w * noise(l, u, v), 0) * 1.5 - d * d * 1.05 - 0.12) * 1.7, 0, 1);
      const k = (j * s + i) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
      img.data[k + 3] = Math.round(190 * a * a * (3 - 2 * a));
    }
  }
  x.putImageData(img, 0, 0);
  smokeTex = new THREE.CanvasTexture(cv);
  smokeTex.colorSpace = THREE.SRGBColorSpace;
  return smokeTex;
}

// The part of a polygon on the near side of the line through (mx, my) across (dx, dy).
function clip(poly, mx, my, dx, dy) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const sa = (a[0] - mx) * dx + (a[1] - my) * dy, sb = (b[0] - mx) * dx + (b[1] - my) * dy;
    if (sa <= 0) out.push(a);
    if ((sa < 0 && sb > 0) || (sa > 0 && sb < 0)) {
      const k = sa / (sa - sb);
      out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
    }
  }
  return out;
}
// A disc of radius R broken like glass: a piece in the middle and three rings of them, each the part of the disc
// nearer its own point than any other's.
function shatter(R) {
  const r = rng(41), seeds = [[(r() - 0.5) * R * 0.14, (r() - 0.5) * R * 0.14]];
  for (const [n, f] of [[6, 0.31], [10, 0.6], [15, 0.88]]) {
    const turn = r() * TAU;
    for (let j = 0; j < n; j++) {
      const a = turn + ((j + (r() - 0.5) * 0.7) / n) * TAU, d = R * (f + (r() - 0.5) * 0.12);
      seeds.push([Math.cos(a) * d, Math.sin(a) * d]);
    }
  }
  const disc = Array.from({ length: 56 }, (_, i) => [Math.cos((i / 56) * TAU) * R, Math.sin((i / 56) * TAU) * R]);
  const cells = [];
  seeds.forEach((s, i) => {
    let poly = disc;
    seeds.forEach((o, j) => {
      if (j !== i && poly.length) poly = clip(poly, (s[0] + o[0]) / 2, (s[1] + o[1]) / 2, o[0] - s[0], o[1] - s[1]);
    });
    if (poly.length < 3) return;
    const cx = poly.reduce((t, p) => t + p[0], 0) / poly.length, cy = poly.reduce((t, p) => t + p[1], 0) / poly.length;
    cells.push({ cx, cy, poly: poly.map((p) => [p[0] - cx, p[1] - cy]) });
  });
  return cells;
}

// The core in pieces: its picture (core.js snapshot) cut along the breaks, each piece a flat shard with a seam round
// its edge, all in a frame that faces the camera as the core does, so at rest they are the core, pixel for pixel. With
// them the lumps of debris, the smoke, the flash and the two rings of the blast.
function buildPieces(c) {
  const core = c.core, own = [], r = rng(57);
  const keep = (o) => {
    own.push(o);
    return o;
  };
  const cv = document.createElement('canvas');
  cv.width = cv.height = core.px;
  const pen = cv.getContext('2d');
  const map = keep(new THREE.CanvasTexture(cv));
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const face = keep(new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.01, side: THREE.DoubleSide }));
  const seam = keep(new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  // The pieces' own heat: a glow over each, white-hot at the blast, an ember's while it drifts, none at rest.
  const heat = keep(new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  const root = new THREE.Group();
  const R = core.reach * 1.02;
  const shards = shatter(R).map((cell) => {
    const pos = [], uv = [], rim = [], n = cell.poly.length;
    const at = (p) => [(p[0] + cell.cx) / core.size + 0.5, (p[1] + cell.cy) / core.size + 0.5];
    for (let i = 0; i < n; i++) {
      const a = cell.poly[i], b = cell.poly[(i + 1) % n];
      pos.push(0, 0, 0, a[0], a[1], 0, b[0], b[1], 0);
      uv.push(...at([0, 0]), ...at(a), ...at(b));
      rim.push(a[0], a[1], 1.5, b[0], b[1], 1.5);
    }
    const g = keep(new THREE.BufferGeometry()), l = keep(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    l.setAttribute('position', new THREE.Float32BufferAttribute(rim, 3));
    const holder = new THREE.Group(), mesh = new THREE.Mesh(g, face), hot = new THREE.Mesh(g, heat);
    hot.position.z = 0.6;
    mesh.add(hot);
    holder.add(mesh, new THREE.LineSegments(l, seam));
    root.add(holder);
    // Thrown outward from the middle of the disc, a little toward or away from the eye, tumbling; the ones nearest
    // the middle start back first.
    const d = Math.hypot(cell.cx, cell.cy), a = Math.atan2(cell.cy, cell.cx) + (r() - 0.5) * 0.7;
    return {
      holder, mesh, home: new THREE.Vector3(cell.cx, cell.cy, 0),
      out: new THREE.Vector3(Math.cos(a), Math.sin(a), (r() - 0.5) * 1.3).normalize(), v: 150 + r() * 300 + (1 - d / R) * 90,
      axis: new THREE.Vector3(r() - 0.5, r() - 0.5, (r() - 0.5) * 0.6).normalize(), w: (r() < 0.5 ? -1 : 1) * (2.5 + r() * 6.5),
      wait: 850 * clamp((d / R) * 0.8 + r() * 0.2, 0, 1), takes: 1150 + r() * 300, turn: (r() - 0.5) * 1.6,
    };
  });

  const N = 26;
  const rock = keep(new THREE.MeshStandardMaterial({ color: 0x2b1d14, roughness: 0.85, metalness: 0.25, flatShading: true, emissive: 0xff5a14, emissiveIntensity: 1.4 }));
  const lumps = new THREE.InstancedMesh(keep(new THREE.IcosahedronGeometry(1, 0)), rock, N);
  lumps.frustumCulled = false;
  lumps.visible = false;
  const rocks = sparkSet(N, 23, 170, 520, 0, 1, [ORANGE], 1).map((s) => ({
    d: s.d, v: s.v, size: 2.2 + s.life * 4.3, wait: s.at * 700, shape: new THREE.Vector3(1, 0.55 + r() * 0.45, 0.7 + r() * 0.6),
    axis: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), w: 2 + r() * 7,
  }));

  const puffs = sparkSet(18, 29, 40, 170, 3, 4.6, [ASH], 1).map((s) => {
    const mat = keep(new THREE.SpriteMaterial({ map: smoke(), color: SCORCH.clone(), transparent: true, opacity: 0, depthWrite: false, rotation: s.at * TAU }));
    const sprite = new THREE.Sprite(mat);
    sprite.visible = false;
    return { sprite, mat, d: s.d, reach: s.v, life: s.life, late: s.at * 0.3, from: 40 + s.at * 30, to: 110 + s.size * 80, spin: (s.at - 0.5) * 0.5 };
  });

  const flash = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: c.glowTex, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending })));
  flash.visible = false;
  const ring = () => {
    const m = new THREE.Mesh(RING_BAND, keep(ringMaterial({ glow: 5 })));
    m.visible = false;
    return m;
  };
  // One ring faces the eye, the other spreads across the map's plane, through the lane and the stations.
  const rings = [ring(), ring()];
  rings[1].rotation.x = -Math.PI / 2;
  const all = [root, lumps, flash, ...rings, ...puffs.map((p) => p.sprite)];
  return { own, pen, map, face, seam, heat, root, shards, lumps, rocks, rock, puffs, flash, rings, all };
}

export function makeRaid(c) {
  let run = null; // the attack on the map now
  const P = new THREE.Vector3(), FRONT = new THREE.Vector3();
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _v = new THREE.Vector3(), _w = new THREE.Vector3(), _up = new THREE.Vector3();
  const _m = new THREE.Matrix4(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _one = new THREE.Vector3(1, 1, 1);
  const _col = new THREE.Color();

  // Pointing a +Z nose along d, its top toward up.
  const look = (d, up, out) => out.setFromRotationMatrix(_m.lookAt(d, ORIGIN, up));

  // Where the ship is at t: in from deep space onto its orbit, round it, then away.
  function shipAt(r, t, out) {
    const th = r.th0 + along(clamp(t, 0, T.LEAVE));
    out.copy(r.U).multiplyScalar(Math.cos(th) * ORBIT.R).addScaledVector(r.W, Math.sin(th) * ORBIT.R);
    if (t < T.ENTER) out.lerpVectors(r.from, out, easeOut(Math.max(0, t) / T.ENTER));
    if (t > T.LEAVE) {
      const s = (t - T.LEAVE) / 1000;
      out.addScaledVector(r.tan, ORBIT.W1 * ORBIT.R * s).addScaledVector(r.away, 560 * s * s);
    }
    return out;
  }

  /** Starts one. Null when the map can't show it now (not drawn, or one is already on); else when its moments come,
   *  in ms from now: the shots, the core blowing up, the ship leaving, the pieces starting back, the core whole again,
   *  the end. */
  function start() {
    if (run || !c.SIZE.w || !c.ACT.visible || document.hidden) return null;
    // Its orbit is laid out for the eye: for the view as it is, or for the default one when the camera goes there.
    const view = c.stage(ORBIT.R + SHIP * RAIDER_LENGTH * 0.6) ? c.VIEW0 : c.CAM;
    const U = view.right.clone(), W = view.up.clone().multiplyScalar(Math.cos(ORBIT.LEAN)).addScaledVector(view.fwd, Math.sin(ORBIT.LEAN)).normalize();
    const N = new THREE.Vector3().crossVectors(U, W).normalize();
    const th0 = ORBIT.AIM - along(T.FIRE), thL = th0 + along(T.LEAVE);
    const out = U.clone().multiplyScalar(Math.cos(thL)).addScaledVector(W, Math.sin(thL));
    const tan = U.clone().multiplyScalar(-Math.sin(thL)).addScaledVector(W, Math.cos(thL));
    const ship = buildRaider(c.reflections());
    ship.group.scale.setScalar(SHIP);
    ship.group.visible = false;
    // The glow round the engines' flames: one material, so both burn together.
    ship.glow = new THREE.SpriteMaterial({ map: c.glowTex, color: ORANGE.clone().multiplyScalar(1.7), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
    ship.own.push(ship.glow);
    ship.glows = ship.jets.map((p) => {
      const s = new THREE.Sprite(ship.glow);
      s.position.copy(p);
      ship.group.add(s);
      return s;
    });
    const bits = buildPieces(c);
    c.scene.add(ship.group, ...bits.all);
    run = {
      t0: performance.now(), U, W, N, th0, tan, ship, bits, size: SHIP, thrust: 1, sun: c.sun.intensity,
      from: U.clone().multiplyScalar(1300).addScaledVector(W, 900).addScaledVector(N, 150),
      away: tan.clone().multiplyScalar(0.45).addScaledVector(out, 0.8).addScaledVector(N, 0.5).normalize(),
      jets: ship.jets.map(() => new THREE.Vector3()), guns: ship.muzzles.map(() => new THREE.Vector3()),
      shook: false, jolted: false, drawn: 0,
    };
    c.poke(2600);
    return { fire: T.FIRE, boom: T.BOOM, leave: T.LEAVE, reform: T.REFORM, whole: T.WHOLE, end: T.END };
  }

  // Everything the raid made goes, and what it touched is as it was: the core in sight at its own size, the map's light.
  function finish() {
    const r = run;
    run = null;
    c.scene.remove(r.ship.group, ...r.bits.all);
    for (const o of [...r.ship.own, ...r.bits.own]) o.dispose();
    r.bits.lumps.dispose();
    c.core.group.visible = true;
    c.core.group.scale.setScalar(1);
    c.sun.intensity = r.sun;
  }

  // The core's picture for the pieces, as the core looks (or will look) at `when` of the raid.
  function picture(r, when) {
    c.core.snapshot(r.bits.pen, r.t0 + when);
    r.bits.map.needsUpdate = true;
  }

  function flyShip(r, t, now) {
    const g = r.ship.group;
    g.visible = t < T.GONE;
    if (!g.visible) return;
    shipAt(r, t, P);
    // Its nose along its way, banked into the turn; beside the core it levels out and turns its nose in to fire, then
    // swings away along its way out, with a roll for the fun of it.
    _a.copy(shipAt(r, t + 14, _a)).sub(shipAt(r, t - 14, _b)).normalize();
    const inward = _c.copy(P).negate().normalize();
    const level = easeInOut(span(t, T.FIRE - 650, 550));
    const aim = level * (1 - easeInOut(span(t, T.LEAVE, 450)));
    const bank = ORBIT.BANK * easeInOut(span(t, 600, 1400)) * (1 - level);
    look(_a, _up.copy(r.N).multiplyScalar(Math.cos(bank)).addScaledVector(inward, Math.sin(bank)), _qa);
    _qa.slerp(look(inward, r.N, _qb), aim);
    _qa.multiply(_qb.setFromAxisAngle(Z, TAU * easeInOut(span(t, T.LEAVE + 300, 1000))));
    // A little kick back with each shot.
    for (const ts of SHOTS) if (t >= ts && t < ts + 120) P.addScaledVector(inward, -6 * (1 - (t - ts) / 120));
    g.position.copy(P);
    g.quaternion.copy(_qa);
    g.updateMatrixWorld(true); // the nozzles and the muzzles are found from it below, before the frame renders
    r.jets.forEach((v, i) => g.localToWorld(v.copy(r.ship.jets[i])));
    r.guns.forEach((v, i) => g.localToWorld(v.copy(r.ship.muzzles[i])));
    const thrust = t < T.ENTER ? 1.25 - 0.7 * easeOut(t / T.ENTER) : t < T.SLOW ? 0.55 : t < T.LEAVE ? lerp(0.55, 0.3, span(t, T.SLOW, 600)) : lerp(0.3, 1.6, span(t, T.LEAVE, 500));
    r.thrust = thrust;
    r.ship.glow.opacity = Math.min(1, 0.3 + thrust * 0.55);
    for (const f of r.ship.glows) f.scale.setScalar(2.2 + thrust * 3 + Math.sin(now / 37) * 0.4);
    r.ship.cones.forEach((k, i) => k.scale.set(1, 1, (0.3 + thrust * (i % 2 ? 0.8 : 1)) * (1 + 0.08 * Math.sin(now / 29 + i))));
  }

  // The pieces: at rest until the blast, thrown apart by it (fast, then drifting), and each brought home in its turn.
  function placePieces(r, t) {
    const b = r.bits, tau = Math.max(0, (t - T.BOOM) / 1000);
    const far = (1 - Math.exp(-2.3 * tau)) / 2.3 + 0.035 * tau, spun = (1 - Math.exp(-1.6 * tau)) / 1.6 + 0.06 * tau;
    b.root.quaternion.copy(c.camera.quaternion);
    for (const p of b.shards) {
      const back = easeInOut(span(t, T.REFORM + p.wait, p.takes));
      _v.copy(p.out).multiplyScalar(p.v * far * (1 - back)).applyAxisAngle(Z, p.turn * Math.sin(Math.PI * back));
      p.holder.position.copy(p.home).add(_v);
      p.holder.quaternion.setFromAxisAngle(p.axis, p.w * spun).slerp(STILL, back);
      p.mesh.visible = t >= T.BOOM && t < T.WHOLE;
    }
    // The seams: lit by each hit before the blast, white-hot at it and cooling, bright again as the pieces seat, then
    // gone as they heal.
    let lit = 0, heat = 0;
    if (t < T.BOOM) {
      for (const ts of SHOTS.slice(0, 2)) if (t >= ts + T.BOLT) lit += 0.3 + 0.5 * Math.exp(-(t - ts - T.BOLT) / 120);
    } else if (t < T.REFORM) {
      heat = Math.exp(-3 * tau);
      lit = 0.22 + Math.exp(-1.2 * tau);
    } else if (t < T.WHOLE) {
      heat = span(t, T.REFORM, T.WHOLE - T.REFORM) ** 2;
      lit = 0.22 + 0.7 * heat;
    } else {
      heat = 1 - span(t, T.WHOLE, 500);
      lit = 1 - easeOut(span(t, T.WHOLE, T.END - T.WHOLE - 60));
    }
    b.seam.opacity = Math.min(1, lit);
    b.seam.color.copy(ORANGE).lerp(PALE, heat);
    b.heat.opacity = t < T.BOOM ? 0 : t < T.REFORM ? 0.14 + 0.8 * Math.exp(-2.2 * tau) : 0.14 + 0.45 * heat;
    b.heat.color.copy(HOT).lerp(AMBER, heat);

    // The lumps: flung further, glowing as they go and cooling; drawn back in and gone as the core re-forms.
    b.lumps.visible = t >= T.BOOM && t < T.WHOLE;
    if (b.lumps.visible) {
      const flown = (1 - Math.exp(-1.5 * tau)) / 1.5 + 0.05 * tau;
      b.rocks.forEach((k, i) => {
        const back = easeIn(span(t, T.REFORM + k.wait, 1000));
        _v.copy(k.d).multiplyScalar(k.v * flown * (1 - back));
        _qa.setFromAxisAngle(k.axis, k.w * spun);
        b.lumps.setMatrixAt(i, _m.compose(_v, _qa, _one.copy(k.shape).multiplyScalar(Math.max(0.001, k.size * (1 - back)))));
      });
      b.lumps.instanceMatrix.needsUpdate = true;
      b.rock.emissiveIntensity = 0.1 + 1.3 * Math.exp(-1.3 * tau) + 0.9 * span(t, T.REFORM, 1200);
    }

    // The smoke: scorched at first, then ash, swelling and thinning as it drifts off.
    for (const p of b.puffs) {
      const age = tau - p.late, x = age / p.life;
      p.sprite.visible = t >= T.BOOM && age > 0 && x < 1;
      if (!p.sprite.visible) continue;
      p.sprite.position.copy(p.d).multiplyScalar(p.reach * (1 - Math.exp(-1.4 * age))).addScaledVector(c.CAM.up, 14 * age);
      p.sprite.scale.setScalar(lerp(p.from, p.to, easeOut(x)));
      p.mat.opacity = 0.42 * Math.min(1, age / 0.15) * (1 - x) ** 1.5;
      p.mat.color.copy(SCORCH).lerp(ASH, clamp(age / 0.45, 0, 1));
      p.mat.rotation += p.spin * 0.01;
    }

    // The flash: the blast's, and a smaller one as the core closes.
    const f = b.flash, sig = (t - T.WHOLE) / 1000;
    f.visible = (t >= T.BOOM && tau < 0.55) || (sig > -0.14 && sig < 0.5);
    if (f.visible && tau < 0.55) {
      f.scale.setScalar(90 + 620 * easeOut(clamp(tau / 0.2, 0, 1)));
      f.material.opacity = (1 - tau / 0.55) ** 2;
      f.material.color.copy(WHITE).lerp(AMBER, clamp(tau / 0.4, 0, 1)).multiplyScalar(2);
    } else if (f.visible) {
      f.scale.setScalar(sig < 0 ? 230 : 230 + 110 * easeOut(sig / 0.5));
      f.material.opacity = sig < 0 ? 1 + sig / 0.14 : (1 - sig / 0.5) ** 2;
      f.material.color.copy(PALE).multiplyScalar(1.6);
    }
    f.position.copy(FRONT);

    // The blast's two rings, and one soft ring as the core closes.
    const [face, flat] = b.rings;
    const ringAt = (m, x, from, to, w, glow, col) => {
      m.visible = x > 0 && x < 1;
      if (!m.visible) return;
      setRing(m, from + (to - from) * easeOut(x), w * (1 - x) + 0.8, 26);
      m.material.uniforms.opacity.value = glow * (1 - x) ** 1.3;
      m.material.uniforms.color.value.copy(col);
    };
    face.quaternion.copy(c.camera.quaternion);
    if (t < T.REFORM) ringAt(face, tau, 60, 530, 5, 0.95, _col.copy(AMBER).lerp(ORANGE, clamp(tau, 0, 1)));
    else ringAt(face, sig / 0.7, 70, 220, 3, 0.7, PALE);
    ringAt(flat, (tau - 0.06) / 1.24, 60, 620, 4, 0.8, ORANGE);
  }

  // Each frame, after everything else moved.
  function update(dt, now) {
    const r = run;
    if (!r) return;
    const t = now - r.t0;
    if (t >= T.END) return finish();
    c.poke(400);
    const tau = (t - T.BOOM) / 1000, core = c.core.group;
    FRONT.copy(c.CAM.fwd).multiplyScalar(-8); // just this side of the core, so what's drawn on it isn't behind its disc
    flyShip(r, t, now);

    // The core: shaken by the first two hits, gone from the blast until it's whole again (the pieces stand in for it),
    // then back with a little swell. Its picture is taken as it blows up, and again for the way back: as it will look
    // when it closes, so the pieces meet the real thing exactly.
    if (t < T.BOOM) {
      let shake = 0;
      for (const ts of SHOTS.slice(0, 2)) {
        const x = (t - ts - T.BOLT) / 1000;
        if (x >= 0) shake += 0.07 * Math.exp(-7 * x) * Math.sin(x * 46);
      }
      core.visible = true;
      core.scale.setScalar(1 + shake);
      if (!r.drawn) picture(r, T.BOOM);
      r.drawn = 1;
    } else if (t < T.WHOLE) {
      if (r.drawn < 2) picture(r, T.BOOM);
      if (t >= T.REFORM && r.drawn < 3) picture(r, T.WHOLE);
      if (t >= T.WHOLE - 250 && r.drawn < 4) picture(r, T.WHOLE);
      r.drawn = t >= T.WHOLE - 250 ? 4 : t >= T.REFORM ? 3 : 2;
      core.visible = false;
      core.scale.setScalar(1);
    } else {
      core.visible = true;
      core.scale.setScalar(1 + 0.09 * (1 - easeOut(span(t, T.WHOLE, 450))));
    }
    placePieces(r, t);
    // The map's light is the core's: a glare at the blast, nearly out while it's in pieces, back as it re-forms.
    const sig = (t - T.WHOLE) / 1000;
    c.sun.intensity = r.sun * (t < T.BOOM ? 1 : t < T.REFORM ? 0.22 + 3.2 * Math.exp(-9 * tau) : t < T.WHOLE ? lerp(0.22, 0.8, span(t, T.REFORM, T.WHOLE - T.REFORM) ** 2) : 1 + 0.9 * Math.exp(-6 * sig));
    if (!r.shook && t >= T.BOOM && t < T.BOOM + 500) {
      r.shook = true;
      c.shake(16, 620);
    }
    // The blast reaching the lane and the stations.
    if (!r.jolted && t >= T.BOOM + 300 && t < T.BOOM + 900) {
      r.jolted = true;
      c.jolt();
    }
  }

  // Sparks thrown from `at`, x seconds ago, slowing as they go.
  function burst(set, at, x, drag, bright) {
    if (x < 0) return;
    for (const s of set) {
      if (x >= s.life) continue;
      _v.copy(at).addScaledVector(s.d, (s.v / drag) * (1 - Math.exp(-drag * x)));
      c.glow.add(_v, s.col, bright * (1 - x / s.life), s.size);
    }
  }

  // Inside the frame's glow and line batches.
  function draw(now) {
    const r = run;
    if (!r) return;
    const t = now - r.t0, tau = (t - T.BOOM) / 1000;
    if (t < T.GONE) {
      // Its orbit, faint, while it's on it, and the engines' trail along the way it came.
      const on = 0.16 * easeInOut(span(t, 900, 1300)) * (1 - span(t, T.LEAVE, 700));
      c.lines.circle(ORIGIN, ORBIT.R, r.U, r.W, ORANGE, on, 96);
      for (let k = 1; k <= 18; k++) {
        shipAt(r, t - k * 24, _a).sub(P);
        for (const j of r.jets) c.glow.add(_w.copy(j).add(_a), k < 6 ? AMBER : ORANGE, 0.85 * r.thrust * (1 - k / 19), 3.2 * r.size * (1 - k / 24));
      }
      for (const j of r.jets) c.glow.add(j, ORANGE, 0.8 * r.thrust, 5.5 * r.size);
    }
    // The shots: a pair of bolts from the wingtips to the core, each with a glow charging at its muzzle before it and a
    // flash as it leaves; the first two strike sparks from the core.
    SHOTS.forEach((ts, n) => {
      const x = t - ts;
      for (const g of r.guns) {
        if (x > -130 && x < 0) c.glow.add(g, AMBER, 1.2 * (1 + x / 130), 16);
        if (x >= 0 && x < 80) c.glow.add(g, PALE, 2.2 * (1 - x / 80), 30);
        if (x < 0 || x >= T.BOLT) continue;
        _a.subVectors(FRONT, g);
        const len = _a.length(), k = x / T.BOLT;
        _a.normalize();
        const head = _v.copy(g).addScaledVector(_a, len * k);
        for (let i = 1; i <= 9; i++) c.glow.add(_w.copy(head).addScaledVector(_a, -Math.min(len * k, i * 8)), ORANGE, 1.3 * (1 - i / 10), 12 - i * 0.8);
        c.glow.add(head, AMBER, 1.8, 24);
        c.glow.add(head, WHITE, 2.4, 8);
        c.lines.path([_w.copy(head).addScaledVector(_a, -Math.min(len * k, 60)), head], AMBER, (a) => a, false);
      }
      const hit = (x - T.BOLT) / 1000;
      if (n < 2 && hit >= 0 && hit < 0.6) {
        burst(HITS, FRONT, hit, 4, 1.8);
        c.glow.add(FRONT, PALE, 2.2 * Math.exp(-10 * hit), 70);
        c.lines.circle(FRONT, c.coreR * (1.25 + 0.5 * easeOut(hit / 0.6)), c.CAM.right, c.CAM.up, AMBER, 0.8 * (1 - hit / 0.6), 64);
      }
    });
    if (tau < 0) return;
    // The blast: a ball of fire for a moment, sparks, slower embers; then what's left smoulders where the core was.
    if (tau < 0.8) {
      c.glow.add(ORIGIN, PALE, 3 * Math.exp(-7 * tau), 200);
      for (const f of FIREBALL) {
        if (tau >= f.life) continue;
        c.glow.add(_v.copy(f.d).multiplyScalar(f.v * easeOut(tau / f.life)), f.col, 1.5 * (1 - tau / f.life) ** 2, f.size * (1 + tau / f.life));
      }
    }
    burst(SPARKS, ORIGIN, tau, 3, 2);
    burst(SPARKS, ORIGIN, tau - 0.22, 3.4, 1.4);
    for (const e of EMBERS) {
      if (tau >= e.life) continue;
      _v.copy(e.d).multiplyScalar((e.v / 1.2) * (1 - Math.exp(-1.2 * tau)));
      c.glow.add(_v, e.col, 1.5 * (1 - tau / e.life) * (0.6 + 0.4 * Math.sin(now / 60 + e.at * 40)), e.size);
    }
    // The lumps' tails as they fly.
    if (tau < 1.4) {
      for (const k of r.bits.rocks) {
        for (let i = 0; i < 6; i++) {
          const x = Math.max(0, tau - i * 0.035);
          c.glow.add(_v.copy(k.d).multiplyScalar(k.v * ((1 - Math.exp(-1.5 * x)) / 1.5 + 0.05 * x)), i ? ORANGE : AMBER, 1.3 * (1 - tau / 1.4) * (1 - i / 7), k.size * (1.5 - i * 0.16));
        }
      }
    }
    if (t < T.WHOLE) {
      const flick = 0.75 + 0.25 * Math.sin(now / 90) * Math.sin(now / 37);
      c.glow.add(ORIGIN, HOT, 0.5 * flick * Math.min(1, tau), 80);
      c.glow.add(ORIGIN, ORANGE, 0.35 * flick * Math.min(1, tau), 36);
    }
    // The way back: sparks drawn in from all round, a glow growing where the core closes, and a burst as it does.
    if (t >= T.REFORM && t < T.WHOLE) {
      const p = span(t, T.REFORM, T.WHOLE - T.REFORM);
      for (const s of GATHER) {
        const x = span(t, T.REFORM + s.at * 1300, s.life * 1000);
        if (x <= 0 || x >= 1) continue;
        c.glow.add(_v.copy(s.d).multiplyScalar(s.v * (1 - x) ** 2), s.col, 1.6 * Math.sin(Math.PI * x), s.size);
      }
      c.glow.add(ORIGIN, PALE, 2.2 * p * p, 50 + 90 * p);
      c.lines.circle(ORIGIN, lerp(300, c.coreR * 1.5, easeInOut(p)), c.CAM.right, c.CAM.up, AMBER, 0.5 * p, 72);
    }
    if (t >= T.WHOLE) {
      const sig = (t - T.WHOLE) / 1000;
      burst(MENDED, FRONT, sig, 3.2, 1.6);
      c.glow.add(FRONT, CREAM, 1.6 * Math.exp(-5 * sig), 120);
    }
  }

  return { start, update, draw, active: () => !!run };
}
