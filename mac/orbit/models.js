import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

let G = null;
function geometries() {
  if (G) return G;
  const base = new THREE.CylinderGeometry(13, 15.5, 3, 6);
  G = {
    base,
    baseEdges: new THREE.EdgesGeometry(base),
    core: new THREE.OctahedronGeometry(6.5, 0),
    ring: new THREE.TorusGeometry(11.5, 0.8, 6, 48),
    ring2: new THREE.TorusGeometry(15, 0.35, 4, 64),
    spire: new THREE.CylinderGeometry(0.45, 0.8, 9, 6),
    tip: new THREE.SphereGeometry(0.75, 8, 6),
  };
  return G;
}

// Tool station: hexagonal platform, glowing crystal core, two rings and antennas.
export function buildStation(col) {
  const g = geometries();
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x3a302a, metalness: 0.72, roughness: 0.36, flatShading: true, emissive: col, emissiveIntensity: 0.05 });
  group.add(new THREE.Mesh(g.base, metal));
  group.add(new THREE.LineSegments(g.baseEdges, new THREE.LineBasicMaterial({ color: col.clone().multiplyScalar(1.4), transparent: true, opacity: 0.55 })));
  const coreMat = new THREE.MeshStandardMaterial({ color: 0x0c0806, emissive: col, emissiveIntensity: 0.9, metalness: 0.2, roughness: 0.3, flatShading: true });
  const core = new THREE.Mesh(g.core, coreMat);
  core.position.y = 11;
  group.add(core);
  const ring = new THREE.Mesh(g.ring, new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(1.3), transparent: true, opacity: 0.85 }));
  ring.position.y = 11;
  group.add(ring);
  const ring2 = new THREE.Mesh(g.ring2, new THREE.MeshBasicMaterial({ color: col.clone(), transparent: true, opacity: 0.35 }));
  ring2.position.y = 11;
  ring2.rotation.x = Math.PI / 2;
  group.add(ring2);
  const tipMat = new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2) });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const s = new THREE.Mesh(g.spire, metal);
    s.position.set(Math.cos(a) * 10.5, 5.5, Math.sin(a) * 10.5);
    group.add(s);
    const t = new THREE.Mesh(g.tip, tipMat);
    t.position.set(Math.cos(a) * 10.5, 10.4, Math.sin(a) * 10.5);
    group.add(t);
  }
  return { group, core, coreMat, ring, ring2 };
}

// A runaway process (index.js): a blue box shaped like an old police telephone box, with no sign or emblem on it, that
// index.js sends tumbling out of control and on fire. Corner posts, a plain band under a stepped roof, a lamp on top,
// and on each side two doors with lit windows over raised panels. Centred on its middle, +Y up, 40 units tall.
export function buildBlueBox() {
  const group = new THREE.Group();
  const blue = new THREE.MeshStandardMaterial({ color: 0x163a7a, metalness: 0.15, roughness: 0.55, emissive: 0x0a1a40, emissiveIntensity: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0d2350, metalness: 0.15, roughness: 0.6 });
  const pane = new THREE.MeshBasicMaterial({ color: 0xfff0c8 });
  const light = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const geos = [];
  const add = (parent, w, h, d, mat, x, y, z) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    geos.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const H = 34, W = 16;
  add(group, W - 1.6, H - 4, W - 1.6, blue, 0, -2, 0);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(group, 2, H, 2, dark, x * (W / 2 - 1), 0, z * (W / 2 - 1));
  add(group, W + 1, 1.6, W + 1, dark, 0, -H / 2 - 0.8, 0);
  add(group, W, 2.6, W, dark, 0, H / 2 - 2.3, 0);
  add(group, W + 0.6, 1.2, W + 0.6, blue, 0, H / 2 - 0.4, 0);
  add(group, W - 3, 1.4, W - 3, blue, 0, H / 2 + 0.9, 0);
  const lamp = add(group, 2, 2.6, 2, light, 0, H / 2 + 3, 0);
  add(group, 2.8, 0.6, 2.8, dark, 0, H / 2 + 4.6, 0);
  for (let f = 0; f < 4; f++) {
    const side = new THREE.Group();
    side.rotation.y = (f * Math.PI) / 2;
    group.add(side);
    const z = W / 2 - 0.72;
    add(side, 0.5, H - 6, 0.4, dark, 0, -2.5, z + 0.1);
    for (const door of [-1, 1]) {
      const cx = door * 3.4;
      for (const [px, py] of [[-1.15, 0], [1.15, 0], [-1.15, -2], [1.15, -2]]) add(side, 1.9, 1.6, 0.3, pane, cx + px, H / 2 - 6 + py, z);
      for (const py of [4, -3.5, -11]) add(side, 4.8, 6, 0.5, dark, cx, py - 2, z);
    }
  }
  return { group, blue, lamp, own: [blue, dark, pane, light, ...geos] };
}

// Terminal car: a plain terminal (a shell, maybe running `npm run dev`) is a flying roadster, so it never reads as a
// Claude session (hexagon). Modelled on the 2026 flying Roadster's look, in a real car's proportions: a long, low body
// with fenders rising over the wheels, a fastback cabin (windshield, side windows and rear window in gold-tinted
// glass, framed by pillars and a painted roof), light strips at the nose and a full-width tail light, spoked wheels, a
// rear wing on fins, and thrusters: twin nozzles at the back, vents along the sides and a fan under the floor. Paint
// and glass reflect a small studio (carStudio). +Z is forward; the wheels stand on y = 0.
export const CAR_LENGTH = 29.5; // nose to nozzles, in model units

// A shape lofted through cross-sections (each a ring of [x, y] points at a z). `keep(k, i)` picks which panels
// (between sections k and k+1, ring edge i) to build, so one outline can be split between two materials; caps close
// both ends.
function loft(sections, keep = () => true, caps = true) {
  const n = sections[0].pts.length, pos = [];
  const v = (sec, i) => [sec.pts[i % n][0], sec.pts[i % n][1], sec.z];
  for (let k = 0; k < sections.length - 1; k++) {
    for (let i = 0; i < n; i++) {
      if (!keep(k, i)) continue;
      const a = v(sections[k], i), b = v(sections[k], i + 1), c = v(sections[k + 1], i + 1), d = v(sections[k + 1], i);
      pos.push(...a, ...d, ...b, ...b, ...d, ...c);
    }
  }
  for (const sec of caps ? [sections[0], sections[sections.length - 1]] : []) {
    const cy = sec.pts.reduce((t, p) => t + p[1], 0) / n;
    for (let i = 0; i < n; i++) pos.push(0, cy, sec.z, ...v(sec, i), ...v(sec, i + 1));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // Smooth panels, crisp creases.
  return toCreasedNormals(g, 0.6);
}
// Body cross-section: from the middle of the deck down the right side (shoulder: the fender crest; beltline crease;
// chine: the widest line; rocker; floor), then mirrored up the left side.
function hull(z, w, top, shoulder, belt, chine, floor) {
  const right = [[0.45 * w, top - 0.04], [0.8 * w, shoulder], [0.97 * w, belt], [w, chine], [0.93 * w, floor + 0.55], [0.7 * w, floor]];
  return { z, pts: [[0, top], ...right, [0, floor], ...[...right].reverse().map(([x, y]) => [-x, y])] };
}
// Cabin cross-section: a trapezoid with a chamfered roof. Ring edges: 0 and 4 the sides, 1-3 the top, 5 the floor.
const cabin = (z, base, roof, y0, y1) => ({
  z,
  pts: [[-base, y0], [-roof, y1 - 0.35], [-roof * 0.6, y1], [roof * 0.6, y1], [roof, y1 - 0.35], [base, y0]],
});
// A thin rod between two points (pillars, light strips).
function bar(a, b, r, mat) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 6), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

let C = null;
function carGeometries() {
  if (C) return C;
  const body = loft([
    hull(14.2, 2.4, 1.65, 1.75, 1.7, 1.45, 1.05), // the nose
    hull(13.6, 4.1, 2.0, 2.2, 2.1, 1.7, 0.9),
    hull(12.4, 5.3, 2.4, 2.75, 2.6, 2.0, 0.8),
    hull(10.5, 6.0, 2.75, 3.4, 3.2, 2.25, 0.72),
    hull(8.4, 6.3, 2.95, 3.95, 3.7, 2.45, 0.7), // front axle: the fenders rise over the wheels
    hull(5.6, 6.05, 3.3, 3.55, 3.35, 2.35, 0.65), // the cowl, where the windshield starts
    hull(1, 5.95, 3.4, 3.5, 3.3, 2.25, 0.62), // the doors
    hull(-4, 6.2, 3.5, 3.65, 3.45, 2.35, 0.62),
    hull(-8.4, 6.6, 3.6, 4.05, 3.8, 2.55, 0.68), // rear axle, the widest point
    hull(-11.6, 6.35, 3.55, 3.75, 3.55, 2.5, 0.85),
    hull(-13.6, 5.95, 3.35, 3.4, 3.25, 2.35, 1.1),
    hull(-14.2, 5.7, 3.2, 3.25, 3.1, 2.3, 1.2), // a flat, wide tail
  ]);
  const greenhouse = [
    cabin(5.8, 4.1, 3.5, 3.3, 3.42), // the windshield's foot, in the cowl
    cabin(1.6, 4.35, 3.3, 3.35, 5.85), // windshield top, the roof starts
    cabin(-2.6, 4.45, 3.35, 3.45, 5.95),
    cabin(-9.6, 4.7, 2.9, 3.6, 3.68), // the rear window comes down to the deck
  ];
  const isGlass = (k, i) =>
    i !== 5 &&
    (k === 0 || // the windshield, wrapping round to the front of the side windows
      (k === 1 && (i === 0 || i === 4)) || // the side windows (the roof between them is painted)
      (k === 2 && i >= 1 && i <= 3)); // the rear window (painted sail panels beside it)
  const glass = loft(greenhouse, isGlass, false);
  const roof = loft(greenhouse, (k, i) => i !== 5 && !isGlass(k, i), false);
  const tire = new THREE.CylinderGeometry(1.85, 1.85, 1.3, 24);
  tire.rotateZ(Math.PI / 2);
  const rim = new THREE.CylinderGeometry(1.22, 1.22, 1.36, 18);
  rim.rotateZ(Math.PI / 2);
  // Spokes (five bars across the rim) and a hub, one geometry.
  const parts = [];
  for (let k = 0; k < 5; k++) {
    const spoke = new THREE.BoxGeometry(1.42, 0.24, 2.25);
    spoke.rotateX((k / 5) * Math.PI);
    parts.push(spoke);
  }
  const hub = new THREE.CylinderGeometry(0.32, 0.32, 1.46, 10);
  hub.rotateZ(Math.PI / 2);
  parts.push(hub);
  const spokes = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  const nozzle = new THREE.CylinderGeometry(0.65, 0.85, 1.2, 12);
  nozzle.rotateX(Math.PI / 2);
  const fan = new THREE.TorusGeometry(1.9, 0.26, 8, 28);
  fan.rotateX(Math.PI / 2);
  C = {
    body,
    bodyEdges: new THREE.EdgesGeometry(body, 32),
    glass,
    roof,
    roofEdges: new THREE.EdgesGeometry(roof, 25),
    tire,
    rim,
    spokes,
    nozzle,
    fan,
    wing: new THREE.BoxGeometry(9.8, 0.28, 2.3),
    fin: new THREE.BoxGeometry(0.28, 1.6, 2.0),
    vent: new THREE.BoxGeometry(0.2, 0.32, 1.5),
    mirror: new THREE.BoxGeometry(0.9, 0.45, 0.6),
    intake: new THREE.BoxGeometry(4.0, 0.3, 0.2),
    taillight: new THREE.BoxGeometry(10.6, 0.22, 0.2),
  };
  return C;
}

// Materials every car shares (the per-car ones change with what the terminal does).
let M = null;
function carMaterials(envMap) {
  return (M ||= {
    trim: new THREE.MeshStandardMaterial({ color: 0x0b0c0f, metalness: 0.4, roughness: 0.5, envMap, envMapIntensity: 0.5 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0a0a0c, metalness: 0, roughness: 0.9 }),
    rim: new THREE.MeshStandardMaterial({ color: 0x15181d, metalness: 0.8, roughness: 0.35, envMap, envMapIntensity: 0.8 }),
    spokes: new THREE.MeshStandardMaterial({ color: 0xc0c8d2, metalness: 1, roughness: 0.2, envMap }),
    head: new THREE.MeshBasicMaterial({ color: 0xe6f6ff }),
    tail: new THREE.MeshBasicMaterial({ color: 0xff2238 }),
  });
}

// What the cars' paint and glass reflect: a dark studio with soft lights, warm on one side (like the core), cool on
// the other and white strips overhead, so curves and creases show as highlights instead of one flat tone.
export function carStudio() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080a);
  const panel = (w, h, color, k, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  panel(14, 6, 0xffffff, 2, 0, 10, 0); // overhead softbox
  panel(26, 0.9, 0xffffff, 3, 0, 6, 11); // long strips ahead and behind
  panel(26, 0.9, 0xffffff, 3, 0, 6, -11);
  panel(9, 6, 0xffa04a, 2, -13, 1, 0); // warm side
  panel(9, 6, 0x7f9fff, 1.3, 13, 1, 0); // cool side
  return scene;
}

export function buildRoadster(accent, envMap) {
  const g = carGeometries(), mat = carMaterials(envMap);
  const group = new THREE.Group();
  // Dark paint under a clear coat; glass like a helmet visor, gold and mirror-like.
  const metal = new THREE.MeshPhysicalMaterial({
    color: 0x1b1f26, metalness: 0.55, roughness: 0.36, clearcoat: 1, clearcoatRoughness: 0.24,
    envMap, emissive: accent, emissiveIntensity: 0.02, side: THREE.DoubleSide,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x5a3e10, metalness: 1, roughness: 0.08, envMap, envMapIntensity: 1.2,
    emissive: 0xc98a28, emissiveIntensity: 0.1, side: THREE.DoubleSide,
  });
  const edge = new THREE.LineBasicMaterial({ color: accent.clone().multiplyScalar(1.2), transparent: true, opacity: 0.26 });
  const fanMat = new THREE.MeshBasicMaterial({ color: accent.clone().multiplyScalar(1.4), transparent: true, opacity: 0.85 });
  const own = [metal, glassMat, edge, fanMat];
  const add = (geo, m, x, y, z) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    group.add(o);
    return o;
  };
  const addBar = (a, b, r, m) => {
    const mesh = bar(a, b, r, m);
    own.push(mesh.geometry);
    group.add(mesh);
  };
  group.add(
    new THREE.Mesh(g.body, metal),
    new THREE.LineSegments(g.bodyEdges, edge),
    new THREE.Mesh(g.glass, glassMat),
    new THREE.Mesh(g.roof, metal),
    new THREE.LineSegments(g.roofEdges, edge),
  );

  for (const x of [-1, 1]) {
    // Pillars: A between the windshield and the side window, B behind the door.
    addBar(V(x * 4.1, 3.3, 5.8), V(x * 3.3, 5.5, 1.6), 0.17, mat.trim);
    addBar(V(x * 4.4, 3.4, -0.6), V(x * 3.33, 5.55, -0.6), 0.15, mat.trim);
    add(g.mirror, metal, x * 4.85, 3.85, 4.3);
    // Light strips along the nose's upper edges.
    addBar(V(x * 2.6, 1.92, 13.95), V(x * 4.95, 2.56, 12.55), 0.13, mat.head);
  }
  add(g.intake, mat.trim, 0, 1.35, 14.22);
  add(g.taillight, mat.tail, 0, 2.95, -14.25);

  // Wheels: tire, dark rim, bright spokes; their outer faces flush with the fenders.
  for (const [wx, z] of [[5.75, 8.4], [6.05, -8.4]]) {
    for (const x of [-1, 1]) {
      add(g.tire, mat.rubber, x * wx, 1.85, z);
      add(g.rim, mat.rim, x * wx, 1.85, z);
      add(g.spokes, mat.spokes, x * wx, 1.85, z);
    }
  }

  // The rear wing on two fins, in dark carbon.
  add(g.wing, mat.trim, 0, 5.0, -12.7).rotation.x = -0.1;
  for (const x of [-1, 1]) add(g.fin, mat.trim, x * 3.3, 4.2, -12.5);

  // Thrusters: twin nozzles at the back, vents along the chines, a lift fan under the floor.
  const jets = [];
  for (const x of [-1, 1]) {
    add(g.nozzle, mat.trim, x * 2.7, 2.15, -14.5);
    jets.push({ at: V(x * 2.7, 2.15, -15.5), main: true });
    for (const [vx, y, z] of [[6.02, 2.3, 4.0], [6.27, 2.37, -4.6]]) {
      add(g.vent, mat.trim, x * vx, y, z);
      jets.push({ at: V(x * (vx + 0.5), y - 0.25, z), main: false });
    }
  }
  add(g.fan, fanMat, 0, 0.5, -1);
  jets.push({ at: V(0, -0.8, -1), main: false, fan: true });
  return { group, metal, glassMat, own, jets: jets.map((j) => j.at), jetKinds: jets };
}

// A friend's raider (raid.js flies it in a spaceship attack): a small two-engine fighter in the app's warm colours,
// built the way the roadster is, so it sits beside the cars and the blue box as one of them. A lofted fuselage (orange
// deck with a dark anti-glare panel ahead of the canopy, a cream stripe along the flanks, a dark belly and nose cone),
// a gold-tinted canopy under two bows, cranked delta wings banded orange, cream, orange, with a cannon pod at each tip
// (the lasers leave from their muzzles), an engine on each wing root with an intake cone and a ringed nozzle, twin
// fins leaning out, a nose probe and an aerial. Paint and glass reflect the cars' studio. +Z is forward; centred on
// its middle.
export const RAIDER_LENGTH = 30; // nose to nozzles, in model units

// Fuselage cross-section: from the spine down the right side (deck edge, shoulder, chine: the widest line, lower
// flank, belly edge) to the keel, then mirrored up the left side. Ring edges: 0-1 and 10-11 the deck, 2 and 9 the
// flanks, 3-8 the belly.
function fuselage(z, w, top, bottom) {
  const h = top - bottom;
  const right = [[0.4 * w, top - 0.05 * h], [0.8 * w, bottom + 0.74 * h], [w, bottom + 0.46 * h], [0.86 * w, bottom + 0.2 * h], [0.5 * w, bottom + 0.03 * h]];
  return { z, pts: [[0, top], ...right, [0, bottom], ...[...right].reverse().map(([x, y]) => [-x, y])] };
}
// A wing's cross-section `span` out from the ship's middle: its leading edge at z = le, its trailing edge at z = te,
// t thick, around the height y. In the loft's own frame (x back along the chord, z out along the span): the wing is
// turned into place after. Ring edges: 0-3 the upper side, 4-7 the lower.
function airfoil(span, le, te, t, y) {
  const at = (f, k) => [f * (le - te) - le, y + k * t];
  return { z: span, pts: [at(0, 0), at(0.12, 0.4), at(0.4, 0.5), at(0.75, 0.28), at(1, 0), at(0.75, -0.2), at(0.4, -0.36), at(0.12, -0.32)] };
}
// A fin's cross-section `up` from its root: a diamond, sharp at z = le and z = te, t thick. In the loft's frame too
// (y back along the chord, z up).
function blade(up, le, te, t) {
  const mid = -(le * 0.62 + te * 0.38);
  return { z: up, pts: [[0, -le], [t / 2, mid], [0, -te], [-t / 2, mid]] };
}
// A shape turned on a lathe round the Z axis, from [radius, z] points.
const turned = (pts, segments = 24) => new THREE.LatheGeometry(pts.map(([r, z]) => new THREE.Vector2(r, z)), segments).rotateX(Math.PI / 2);

export function buildRaider(envMap) {
  const group = new THREE.Group();
  const own = [];
  const keep = (o) => {
    own.push(o);
    return o;
  };
  // Paint under a clear coat, like the cars'; glass like theirs, gold and mirror-like.
  const paint = (color, o) => keep(new THREE.MeshPhysicalMaterial({ color, metalness: 0.5, roughness: 0.36, clearcoat: 1, clearcoatRoughness: 0.3, envMap, side: THREE.DoubleSide, ...o }));
  const orange = paint(0xd9660a, { emissive: 0xf88008, emissiveIntensity: 0.05 });
  const cream = paint(0xd8c8ae, { metalness: 0.3 });
  const dark = keep(new THREE.MeshStandardMaterial({ color: 0x14110e, metalness: 0.65, roughness: 0.42, envMap, envMapIntensity: 0.7, side: THREE.DoubleSide }));
  const glass = keep(new THREE.MeshPhysicalMaterial({ color: 0x5a3e10, metalness: 1, roughness: 0.08, envMap, envMapIntensity: 1.2, emissive: 0xc98a28, emissiveIntensity: 0.14, side: THREE.DoubleSide }));
  const edge = keep(new THREE.LineBasicMaterial({ color: 0xfff0d8, transparent: true, opacity: 0.34 }));
  const lamp = keep(new THREE.MeshBasicMaterial({ color: 0xffb84a }));
  const tail = keep(new THREE.MeshBasicMaterial({ color: 0xff4a1c }));
  const burn = keep(new THREE.MeshBasicMaterial({ color: 0xffdca8 }));
  // The engines' flames: two crisp cones behind each nozzle, a pale one inside an orange one, growing with the thrust
  // (raid.js adds a glow around them).
  const flame = (color, opacity) => keep(new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  const jetOut = flame(0xff7a1a, 0.42), jetIn = flame(0xffe0b0, 0.8);

  const add = (geo, mat, x = 0, y = 0, z = 0, parent = group) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  // The creases of a lofted shape as thin warm lines, as on the cars; the shape itself is only measured.
  const creases = (shape, angle, parent = group) => {
    const l = new THREE.LineSegments(keep(new THREE.EdgesGeometry(shape, angle)), edge);
    shape.dispose();
    parent.add(l);
    return l;
  };
  const rod = (a, b, r, mat) => {
    const m = bar(a, b, r, mat);
    keep(m.geometry);
    group.add(m);
  };

  // The fuselage, nose to tail, and its paint: which panels of the one outline each colour takes.
  const F = [
    fuselage(15, 0.3, 0.12, -0.28), // the nose
    fuselage(14.1, 0.95, 0.5, -0.68),
    fuselage(12.4, 1.65, 0.92, -1.08),
    fuselage(9.8, 2.3, 1.32, -1.46),
    fuselage(6.6, 2.85, 1.68, -1.76), // the canopy starts
    fuselage(2.6, 3.2, 1.98, -1.94),
    fuselage(-2, 3.35, 2.12, -1.98), // the widest, where the wings and engines meet it
    fuselage(-6.4, 3.2, 2.02, -1.86),
    fuselage(-10, 2.75, 1.7, -1.6),
    fuselage(-12.6, 2.15, 1.32, -1.24),
    fuselage(-13.6, 1.7, 1.05, -0.98), // the tail plate
  ];
  const deck = (i) => i <= 1 || i >= 10, flank = (i) => i === 2 || i === 9;
  // The anti-glare panel: the middle of the deck from the nose cone back to the canopy's foot.
  const shade = (k, i) => k >= 1 && k <= 3 && (i === 0 || i === 11);
  add(keep(loft(F, (k, i) => k === 0 || shade(k, i))), dark); // with the nose cone, and the plates closing both ends
  add(keep(loft(F, (k, i) => k > 0 && deck(i) && !shade(k, i), false)), orange);
  add(keep(loft(F, (k, i) => k > 0 && flank(i), false)), cream);
  add(keep(loft(F, (k, i) => k > 0 && !deck(i) && !flank(i), false)), dark);
  creases(loft(F), 26);

  // The canopy: glass from its foot in the deck back over the seat, then a painted fairing down into the spine.
  const cab = [cabin(8.7, 0.85, 0.45, 1.28, 1.62), cabin(6.9, 1.42, 0.95, 1.22, 2.74), cabin(4.4, 1.62, 1.15, 1.3, 3.3), cabin(2, 1.55, 1.02, 1.5, 3.14), cabin(-1.6, 1.05, 0.55, 1.9, 2.32)];
  add(keep(loft(cab, (k, i) => i !== 5 && k < 3, false)), glass);
  add(keep(loft(cab, (k, i) => i !== 5 && k === 3, false)), orange);
  const at = (s, i) => V(s.pts[i][0], s.pts[i][1], s.z);
  for (const s of [cab[1], cab[3]]) for (let i = 0; i < 5; i++) rod(at(s, i), at(s, i + 1), 0.1, dark); // its two bows
  for (let k = 0; k < 3; k++) for (const i of [0, 5]) rod(at(cab[k], i), at(cab[k + 1], i), 0.09, dark); // its sills

  // The wings: one geometry for both sides (the left one mirrored), painted by panel like the fuselage.
  const W = [airfoil(2.2, 3.4, -8.8, 1, -0.4), airfoil(6.4, -0.4, -9.2, 0.72, -0.2), airfoil(10.6, -3.68, -9.41, 0.46, 0.16), airfoil(12.3, -5, -9.5, 0.36, 0.3)];
  const wing = (pick) => loft(W, pick, false).rotateY(Math.PI / 2);
  const wingParts = [[keep(wing((k, i) => k !== 1 && i < 4)), orange], [keep(wing((k, i) => k === 1 && i < 4)), cream], [keep(wing((k, i) => i >= 4)), dark]];
  // The fins: orange with a cream tip.
  const FIN = [blade(0, -7.4, -13.3, 0.5), blade(3.1, -10.4, -14.3, 0.26), blade(4.5, -11.75, -14.75, 0.14)];
  const fin = (pick, caps) => loft(FIN, pick, caps).rotateX(-Math.PI / 2);
  const finParts = [[keep(fin((k) => k === 0, true)), orange], [keep(fin((k) => k === 1, false)), cream]];
  // An engine: its painted shell, the dark nozzle, the intake's dark throat with a cone in it, the glow inside the
  // nozzle and a lit ring round its lip.
  const shell = keep(turned([[0.86, -4.5], [1.12, -4.15], [1.42, -4.6], [1.72, -6.2], [1.84, -9.2], [1.7, -12], [1.44, -13.5]]));
  const nozzle = keep(turned([[1.5, -13.3], [1.6, -13.8], [1.34, -15], [1.14, -15], [1, -14.1]]));
  const throat = keep(new THREE.CircleGeometry(0.92, 20));
  const spike = keep(new THREE.ConeGeometry(0.46, 1.5, 16).rotateX(Math.PI / 2));
  const glowDisc = keep(new THREE.CircleGeometry(1.04, 20).rotateY(Math.PI));
  const lip = keep(new THREE.TorusGeometry(1.26, 0.07, 6, 28));
  const coneOut = keep(new THREE.ConeGeometry(0.9, 5.6, 14, 1, true).rotateX(-Math.PI / 2).translate(0, 0, -2.8));
  const coneIn = keep(new THREE.ConeGeometry(0.5, 3, 12, 1, true).rotateX(-Math.PI / 2).translate(0, 0, -1.5));
  // A cannon pod on a wing's tip: its painted body, the barrel, a lit muzzle and a red lamp behind.
  const pod = keep(new THREE.CapsuleGeometry(0.5, 5, 6, 12).rotateX(Math.PI / 2));
  const barrel = keep(new THREE.CylinderGeometry(0.17, 0.2, 3.4, 10).rotateX(Math.PI / 2));
  const muzzle = keep(new THREE.SphereGeometry(0.3, 10, 8));
  const rear = keep(new THREE.SphereGeometry(0.28, 10, 8));

  const jets = [], muzzles = [], cones = [];
  for (const x of [1, -1]) {
    const side = new THREE.Group();
    side.scale.x = x;
    group.add(side);
    for (const [geo, mat] of wingParts) add(geo, mat, 0, 0, 0, side);
    creases(wing(), 30, side);
    for (const [geo, mat] of [[shell, orange], [nozzle, dark]]) add(geo, mat, 4.25, 0.45, 0, side);
    add(throat, dark, 4.25, 0.45, -4.55, side);
    add(spike, cream, 4.25, 0.45, -4.2, side);
    add(glowDisc, burn, 4.25, 0.45, -14.2, side);
    add(lip, lamp, 4.25, 0.45, -14.98, side);
    cones.push(add(coneOut, jetOut, 4.25, 0.45, -14.9, side), add(coneIn, jetIn, 4.25, 0.45, -14.9, side));
    jets.push(V(x * 4.25, 0.45, -15.3));
    const f = new THREE.Group();
    f.position.set(4.25, 2.05, 0);
    f.rotation.z = -0.32; // leaning out
    side.add(f);
    for (const [geo, mat] of finParts) add(geo, mat, 0, 0, 0, f);
    creases(fin(), 30, f);
    add(pod, orange, 12.45, 0.32, -6.6, side);
    add(barrel, dark, 12.45, 0.32, -2.2, side);
    add(muzzle, lamp, 12.45, 0.32, -0.4, side);
    add(rear, tail, 12.45, 0.32, -9.75, side);
    muzzles.push(V(x * 12.45, 0.32, -0.2));
  }
  rod(V(0, -0.08, 14.9), V(0, -0.08, 16.7), 0.07, dark); // the nose probe
  rod(V(0, 2.0, -4.1), V(0, 3.5, -5.1), 0.06, dark); // the aerial, raked back, a lamp on its tip
  add(muzzle, lamp, 0, 3.5, -5.1).scale.setScalar(0.5);
  add(keep(new THREE.BoxGeometry(0.45, 0.1, 7)), lamp, 0, -2.0, -1); // a light strip along the keel
  return { group, own, jets, muzzles, cones };
}
