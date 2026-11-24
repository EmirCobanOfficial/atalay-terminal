import * as THREE from 'three';
import { rgba } from './theme.js';
import { TAU } from './util.js';

// Solar view (index.js SOLAR): the pieces that don't need the scene. The orbits' plane is y = 0.

// The point at fraction t of the way from A to B around the centre: the angle goes round the short way, the radius
// runs from A's to B's with an outward bulge in the middle, so a link never cuts across the core. For two points nearly
// opposite, `sign` (the way it went last time, +1 or -1) keeps it from flipping sides from one frame to the next.
export function transferPoint(A, B, t, bulge, out, sign = 0) {
  const ra = Math.hypot(A.x, A.z), rb = Math.hypot(B.x, B.z);
  const a0 = Math.atan2(A.z, A.x);
  let d = Math.atan2(B.z, B.x) - a0;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  if (sign && Math.abs(d) > Math.PI * 0.8 && Math.sign(d) !== sign) d += sign * TAU;
  const a = a0 + d * t, r = ra + (rb - ra) * t + bulge * Math.sin(Math.PI * t);
  return out.set(Math.cos(a) * r, A.y + (B.y - A.y) * t, Math.sin(a) * r);
}
// Which way round transferPoint goes from A to B now (+1 or -1); nearly opposite, the way it went before (prev).
export function transferSign(A, B, prev = 0) {
  let d = Math.atan2(B.z, B.x) - Math.atan2(A.z, A.x);
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  if (prev && Math.abs(d) > Math.PI * 0.8) return prev;
  return d < 0 ? -1 : 1;
}

// A line drawn as a few strands twisted around it, like the fibres of a cord: the first on it, the others off it
// across the screen by up to `amp` in the middle and none at the ends, waving slowly. alpha: a number or alpha(t).
const _tan = new THREE.Vector3(), _perp = new THREE.Vector3();
export function drawStrands(lines, pts, buf, fwd, color, alpha, { strands = 2, amp = 3, time = 0, phase = 0, dashed = false } = {}) {
  const n = pts.length;
  const af = typeof alpha === 'function' ? alpha : () => alpha;
  const faint = (t) => af(t) * 0.5;
  for (let s = 0; s < strands; s++) {
    if (!s) {
      lines.path(pts, color, af, dashed);
      continue;
    }
    const ph = phase + s * 2.1;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      _tan.subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]);
      _perp.crossVectors(_tan, fwd).normalize();
      buf[i].copy(pts[i]).addScaledVector(_perp, amp * Math.sin(Math.PI * t) * Math.sin(ph + t * 9 + time * (1.1 + s * 0.4)));
    }
    lines.path(buf, color, faint, false);
  }
}

// The core's eye: an iris, a pupil and a glint, sprites in the core's group (so a raid takes them with it). They face
// the camera like the rest of the core; the pupil and, a little, the iris move to where it looks (gx, gy from -1 to 1,
// right and up on the screen), the pupil widens with the activity, and now and then it blinks.
const S = 256;
function canvas() {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  return c;
}
function texture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function buildEye(radius) {
  const group = new THREE.Group();
  const sprite = (map, size, order, opts = {}) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, ...opts }));
    s.scale.setScalar(size);
    s.renderOrder = order;
    group.add(s);
    return s;
  };
  const ic = canvas(), ix = ic.getContext('2d'), irisTex = texture(ic);
  const iris = sprite(irisTex, radius * 2, 1);
  const pc = canvas(), px = pc.getContext('2d');
  const g = px.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.82, 'rgba(0,0,0,0.96)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  px.fillStyle = g;
  px.fillRect(0, 0, S, S);
  const PUPIL = 0.46; // of the iris's radius, at rest
  const pupil = sprite(texture(pc), radius * 2 * PUPIL, 1.1);
  const gc = canvas(), gx = gc.getContext('2d');
  const gg = gx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gg.addColorStop(0, 'rgba(255,255,255,0.95)');
  gg.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  gg.addColorStop(1, 'rgba(255,255,255,0)');
  gx.fillStyle = gg;
  gx.fillRect(0, 0, S, S);
  const glint = sprite(texture(gc), radius * 0.42, 1.2, { blending: THREE.AdditiveBlending });

  // The iris in the theme's colours: lighter at its rim, deep near the pupil, with fine fibres and a dark ring round it.
  // Dimmed, so a light accent (Emir's bone) doesn't bloom over the pupil.
  function paint(theme) {
    const C = S / 2, dim = (c, k) => c.clone().multiplyScalar(k);
    ix.clearRect(0, 0, S, S);
    const rg = ix.createRadialGradient(C, C, C * 0.3, C, C, C * 0.98);
    rg.addColorStop(0, rgba(dim(theme.accent, 0.22)));
    rg.addColorStop(0.55, rgba(dim(theme.accent, 0.62)));
    rg.addColorStop(0.86, rgba(dim(theme.soft, 0.72)));
    rg.addColorStop(1, rgba(theme.tint('#1a0b02')));
    ix.fillStyle = rg;
    ix.beginPath();
    ix.arc(C, C, C * 0.98, 0, TAU);
    ix.fill();
    ix.lineWidth = 1.2;
    for (let i = 0; i < 140; i++) {
      const a = (i / 140) * TAU + Math.sin(i * 7.3) * 0.02, r0 = C * (0.34 + 0.06 * Math.sin(i * 3.1)), r1 = C * (0.8 + 0.12 * Math.sin(i * 5.7));
      ix.strokeStyle = i % 3 ? 'rgba(255,240,220,0.10)' : 'rgba(0,0,0,0.22)';
      ix.beginPath();
      ix.moveTo(C + Math.cos(a) * r0, C + Math.sin(a) * r0);
      ix.lineTo(C + Math.cos(a) * r1, C + Math.sin(a) * r1);
      ix.stroke();
    }
    ix.lineWidth = C * 0.06;
    ix.strokeStyle = 'rgba(0,0,0,0.55)';
    ix.beginPath();
    ix.arc(C, C, C * 0.95, 0, TAU);
    ix.stroke();
    irisTex.needsUpdate = true;
  }

  // Blinks: a quick close and a slower open, every few seconds, now and then twice.
  let nextBlink = 2500, blinkAt = -1, twice = false;
  function lid(now) {
    if (blinkAt < 0 && now > nextBlink) {
      blinkAt = now;
      twice = Math.random() < 0.18;
    }
    if (blinkAt < 0) return 1;
    const u = now - blinkAt;
    const v = u < 70 ? 1 - u / 70 : u < 180 ? (u - 70) / 110 : 1;
    if (u >= 180) {
      blinkAt = twice ? now + 90 : -1;
      if (twice) twice = false;
      else nextBlink = now + 3500 + Math.random() * 4500;
    }
    return Math.max(0.06, v);
  }

  const _o = new THREE.Vector3();
  return {
    group,
    paint,
    // right, up, fwd: the camera's axes; heat 0..1.
    update(now, gx2, gy2, heat, right, up, fwd) {
      const l = lid(now);
      const place = (s, k, toward) => s.position.copy(_o.set(0, 0, 0).addScaledVector(right, gx2 * k * radius).addScaledVector(up, gy2 * k * radius).addScaledVector(fwd, -toward));
      place(iris, 0.12, 2);
      place(pupil, 0.42, 3);
      glint.position.copy(_o.set(0, 0, 0).addScaledVector(right, (-0.32 + gx2 * 0.06) * radius).addScaledVector(up, (0.34 + gy2 * 0.06) * radius).addScaledVector(fwd, -4));
      const p = radius * 2 * PUPIL * (0.82 + 0.38 * heat + 0.03 * Math.sin(now / 1700));
      iris.scale.set(radius * 2, radius * 2 * l, 1);
      pupil.scale.set(p, p * l, 1);
      glint.scale.set(radius * 0.42, radius * 0.42 * l, 1);
      glint.material.opacity = l > 0.5 ? 1 : l;
    },
  };
}
