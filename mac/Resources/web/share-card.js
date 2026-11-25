'use strict';

// The share card: a 1200×1500 picture of your week (or last week), made on a canvas, for Copy image / Post on X / Save
// image. Opened by the Share button on the leaderboard's "You" card and on your profile (cloud.js, profile.js), and from the
// bell's "Your week is final" row (inbox.js). The picture is the viewer's own theme: palette() reads the colours the app
// is wearing. The flame, the podium's metals, the badges and the rank colour are not a theme's: they mean something, so
// they look the same on every card. Spec: research/paylasim-karti/SPEC.md.

window.ShareCard = (() => {
/** The card's colours from the page's theme tokens (style.css :root, written by the app's theme), each text colour pushed
 *  until it reads (WCAG AA, 4.5:1) on the card's ground, wherever a theme puts it. */
function palette() {
  const cs = getComputedStyle(document.documentElement);
  const tok = (n, d) => cs.getPropertyValue(n).trim() || d;
  const parse = (v, d) => {
    const m = /^#([0-9a-f]{6})$/i.exec(v.trim());
    if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
    const t = v.split(',').map((x) => Number(x.trim()));
    return t.length === 3 && t.every(Number.isFinite) ? t : d;
  };
  const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const hex = (c) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  const trip = (c) => c.join(', ');
  const WHITE = [255, 255, 255], BLACK = [0, 0, 0];

  const bg = parse(tok('--bg', '#0a0705'), [10, 7, 5]);
  const deep = parse(tok('--deep-rgb', '5, 3, 2'), [5, 3, 2]);
  const panel = parse(tok('--panel-rgb', '22, 13, 7'), [22, 13, 7]);
  const accent = parse(tok('--accent-rgb', '248, 128, 8'), [248, 128, 8]);
  const soft = parse(tok('--accent-soft', '#ffb057'), [255, 176, 87]);
  const amber = parse(tok('--amber', '#ffd23f'), [255, 210, 63]);
  // Text sits on the ground and, in places, on a glow of the accent over it: measure against the lighter of the two.
  const lit = mix(bg, soft, 0.22);
  const dark = lum(bg) < 0.4;
  const legible = (c, min, on = lit) => {
    let out = c;
    for (let i = 0; i < 25 && ratio(out, on) < min; i++) out = mix(out, dark ? WHITE : BLACK, 0.08);
    return out;
  };
  const AA = 4.5;
  const hi = legible(parse(tok('--hi', '#fff8f0'), [255, 248, 240]), 7);
  const molten = [mix(amber, WHITE, 0.6), amber, mix(accent, amber, 0.25), mix(accent, BLACK, 0.2)].map((c) => legible(c, 3));
  return {
    bg: hex(bg),
    panel: trip(panel),
    deepRGB: trip(deep),
    hi: hex(hi),
    txt2: hex(legible(parse(tok('--txt2', '#d9c3a8'), [217, 195, 168]), AA)),
    txt3: hex(legible(parse(tok('--txt3', '#b39a82'), [179, 154, 130]), AA)),
    soft: hex(legible(soft, AA)),
    softRGB: trip(soft),
    accent: trip(accent),
    amber: hex(legible(amber, AA)),
    amberRGB: trip(amber),
    amberPale: hex(mix(amber, WHITE, 0.75)),
    anonBg: hex(mix(panel, soft, 0.07)),
    molten: molten.map(hex),
    /** A rank's colour ("r, g, b") as text: itself, or pushed until it reads. */
    rcText: (rgb) => trip(legible(parse(rgb, soft), AA)),
  };
}

// The app's mark, inline: a file:// image would make the canvas unreadable for export.
const LOGO = 'data:image/png;base64,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';

const Card = (() => {
  const W = 1200, H = 1500, P = 80;
  const SANS = '"Orbiterm Card", system-ui, sans-serif';
  const MONO = '"Orbiterm Card Mono", ui-monospace, monospace';
  // The colours are the viewer's theme's (palette(), above), taken again for every picture.
  let K = palette();
  // The podium's metals (badges' own): #1 gold, #2 silver, #3 bronze; light, mid, dark for the numeral.
  const METAL = {
    1: { rgb: '242, 185, 59', g: ['#fff1a8', '#f2b93b', '#a36f0a'] },
    2: { rgb: '199, 208, 216', g: ['#ffffff', '#c7d0d8', '#7d8893'] },
    3: { rgb: '201, 138, 85', g: ['#f2c08d', '#c98a55', '#7a4019'] },
  };
  const FLAME = new Path2D('M5 0c.4 2.2 3.8 3.6 3.8 7.2A3.8 3.8 0 0 1 1.2 7.2c0-1.6.8-2.6 1.6-3.2-.1 1.2.4 2 1.1 2.4C3.6 4.2 4.2 2 5 0z');
  const CROWN = new Path2D('M2 16h20l1.2-11-5.6 4.6L12 1 6.4 9.6.8 5z');
  const TAGLINE = 'for Claude Code, Codex, Antigravity & Cursor';
  const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const rgba = (rgb, a) => `rgba(${rgb}, ${a})`;
  function rr(x, l, t, w, h, r) {
    const [a, b, c, d] = Array.isArray(r) ? r : [r, r, r, r];
    x.beginPath();
    x.moveTo(l + a, t);
    x.arcTo(l + w, t, l + w, t + h, b);
    x.arcTo(l + w, t + h, l, t + h, c);
    x.arcTo(l, t + h, l, t, d);
    x.arcTo(l, t, l + w, t, a);
    x.closePath();
  }
  function glow(x, cx, cy, r, rgb, a) {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, rgba(rgb, a));
    g.addColorStop(1, rgba(rgb, 0));
    x.fillStyle = g;
    x.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  // Text with tracking (em), drawn letter by letter: canvas letterSpacing isn't in every WebKit the app runs on.
  function tw(x, s, em, size) {
    const ch = [...s];
    return ch.reduce((a, c) => a + x.measureText(c).width, 0) + em * size * (ch.length - 1);
  }
  function track(x, s, l, y, em, size, align = 'left') {
    const w = tw(x, s, em, size);
    let cx = align === 'right' ? l - w : align === 'center' ? l - w / 2 : l;
    for (const c of s) { x.fillText(c, cx, y); cx += x.measureText(c).width + em * size; }
    return w;
  }
  function fit(x, s, max) {
    if (x.measureText(s).width <= max) return s;
    let t = s;
    while (t.length > 1 && x.measureText(`${t}…`).width > max) t = t.slice(0, -1);
    return `${t.trimEnd()}…`;
  }
  const num = (n) => Number(n || 0).toLocaleString('en-US');
  // Xp.dur: 2h 40m · 2h · 45m
  const dur = (s) => { const m = Math.floor((s || 0) / 60); return m < 60 ? `${m}m` : m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m / 60}h`; };

  /** The one pill inside the step: none for #1 (the crown says it); TOP x% when it is 10% or better, else BEST RANK YET, else TOP x% up to 50%. */
  function pillText(d) {
    if (!d.rank || d.rank.pos === 1) return '';
    const pct = Math.max(1, Math.ceil((100 * d.rank.pos) / d.rank.total));
    if (pct <= 10) return `TOP ${pct}%`;
    if (d.best) return 'BEST RANK YET';
    return pct <= 50 ? `TOP ${pct}%` : '';
  }

  async function draw(d) {
    K = palette();
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const x = cv.getContext('2d');
    x.textBaseline = 'alphabetic';
    const ranked = !!d.rank;
    const metal = ranked ? METAL[d.rank.pos] : null;
    const mRGB = metal ? metal.rgb : ranked ? K.accent : d.rc;
    const fire = d.live ? d.fire || 0 : 0;
    const blue = fire === 2;
    const showHours = d.hours != null;
    // The stage: the step stands on the floor line; with the hours kept off the card, it takes their place.
    const S = { x: 300, w: 600, top: 420, floor: showHours ? 1070 : 1240 };

    // 1. ground: dark warm, a stage light from below the step, a cool-warm wash from the top left, the orbit around the
    //    step, the app's scan lines, a vignette.
    x.fillStyle = K.bg;
    x.fillRect(0, 0, W, H);
    glow(x, 160, -40, 900, K.softRGB, 0.07);
    glow(x, 600, S.floor, 760, mRGB, 0.2);
    if (fire) glow(x, 600, S.floor, 460, blue ? '90, 160, 255' : '255, 120, 10', 0.26);
    x.save();
    x.translate(600, S.top + 320);
    x.rotate(-0.16);
    x.lineWidth = 2;
    x.strokeStyle = rgba(K.softRGB, 0.11);
    x.beginPath(); x.ellipse(0, 0, 540, 150, 0, 0, Math.PI * 2); x.stroke();
    x.setLineDash([3, 14]);
    x.strokeStyle = rgba(K.softRGB, 0.07);
    x.beginPath(); x.ellipse(0, 0, 700, 232, 0, 0, Math.PI * 2); x.stroke();
    x.setLineDash([]);
    x.shadowColor = rgba(K.accent, 0.95);
    x.shadowBlur = 18;
    x.fillStyle = K.soft;
    x.beginPath(); x.arc(540 * Math.cos(-2.55), 150 * Math.sin(-2.55), 6.5, 0, Math.PI * 2); x.fill();
    x.restore();
    x.fillStyle = 'rgba(255, 255, 255, 0.016)';
    for (let y = 0; y < H; y += 3) x.fillRect(0, y, W, 1);
    const v = x.createRadialGradient(600, 720, 320, 600, 720, 1060);
    v.addColorStop(0, 'rgba(0, 0, 0, 0)');
    v.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    x.fillStyle = v;
    x.fillRect(0, 0, W, H);

    // 2. top line: which week (left), the flame (right)
    x.font = `600 26px ${MONO}`;
    x.fillStyle = K.soft;
    let ex = P + track(x, d.week.label, P, 112, 0.16, 26);
    x.fillStyle = K.txt3;
    if (d.week.range) track(x, ` · ${d.week.range}`, ex, 112, 0.16, 26);
    // A past week that's written down (the API's `final`) gets a FINAL pill where the flame's pill
    // sits on a live week: a check and FINAL in amber. Before it's written down (Monday 00:00-15:10 in Istanbul), no pill.
    if (!d.live && d.final !== false) {
      const col = K.amber;
      x.font = `600 24px ${MONO}`;
      const w = 22 + 24 + 12 + tw(x, 'FINAL', 0.14, 24) + 24;
      const l = W - P - w;
      rr(x, l, 76, w, 52, 26);
      x.fillStyle = rgba(K.amberRGB, 0.12);
      x.fill();
      x.lineWidth = 2;
      x.strokeStyle = rgba(K.amberRGB, 0.55);
      x.stroke();
      x.save();
      x.lineWidth = 4;
      x.lineCap = 'round';
      x.lineJoin = 'round';
      x.strokeStyle = col;
      x.shadowColor = rgba(K.amberRGB, 0.7);
      x.shadowBlur = 8;
      x.beginPath(); x.moveTo(l + 23, 103); x.lineTo(l + 31, 111); x.lineTo(l + 46, 93); x.stroke();
      x.restore();
      x.fillStyle = col;
      track(x, 'FINAL', l + 58, 111, 0.14, 24);
    }
    if (fire) {
      const lab = blue ? 'HOTTEST FLAME' : 'ON FIRE';
      const col = blue ? '#9fd0ff' : '#ff9a1f';
      x.font = `600 24px ${MONO}`;
      const w = 22 + 22 + 12 + tw(x, lab, 0.14, 24) + 24;
      const l = W - P - w;
      rr(x, l, 76, w, 52, 26);
      x.fillStyle = blue ? 'rgba(90, 160, 255, 0.14)' : 'rgba(255, 120, 10, 0.14)';
      x.fill();
      x.lineWidth = 2;
      x.strokeStyle = blue ? 'rgba(159, 208, 255, 0.55)' : 'rgba(255, 154, 31, 0.55)';
      x.stroke();
      x.save();
      x.translate(l + 22, 89);
      x.scale(2.2, 2.2);
      x.shadowColor = blue ? 'rgba(90, 160, 255, 0.9)' : 'rgba(255, 120, 10, 0.9)';
      x.shadowBlur = 8;
      x.fillStyle = col;
      x.fill(FLAME);
      x.restore();
      x.fillStyle = col;
      track(x, lab, l + 56, 111, 0.14, 24);
    }

    // 3. who: the picture in its rank-coloured frame (the profile's), the name, LEVEL · RANK; the top three badges right
    const AV = 136, ay = 176;
    x.save();
    x.shadowColor = rgba(d.rc, 0.45);
    x.shadowBlur = 40;
    rr(x, P - 6, ay - 6, AV + 12, AV + 12, 9);
    x.fillStyle = `rgb(${d.rc})`;
    x.fill();
    x.restore();
    rr(x, P - 3, ay - 3, AV + 6, AV + 6, 6);
    x.fillStyle = `rgb(${K.panel})`;
    x.fill();
    x.save();
    rr(x, P, ay, AV, AV, 4);
    x.clip();
    if (d.anon) {
      x.fillStyle = K.anonBg;
      x.fillRect(P, ay, AV, AV);
      x.fillStyle = K.txt3;
      x.font = `700 64px ${SANS}`;
      x.textAlign = 'center';
      x.fillText('?', P + AV / 2, ay + AV / 2 + 23);
      x.textAlign = 'left';
    } else if (d.avatar) {
      const s = Math.min(d.avatar.naturalWidth || d.avatar.width, d.avatar.naturalHeight || d.avatar.height);
      const iw = d.avatar.naturalWidth || d.avatar.width, ih = d.avatar.naturalHeight || d.avatar.height;
      x.drawImage(d.avatar, (iw - s) / 2, (ih - s) / 2, s, s, P, ay, AV, AV);
    } else {
      x.fillStyle = `rgb(${K.panel})`;
      x.fillRect(P, ay, AV, AV);
      const g = x.createLinearGradient(P, ay, P + AV, ay + AV);
      g.addColorStop(0, rgba(d.rc, 0.6));
      g.addColorStop(1, rgba(d.rc, 0.2));
      x.fillStyle = g;
      x.fillRect(P, ay, AV, AV);
      x.shadowColor = 'rgba(0, 0, 0, 0.45)';
      x.shadowBlur = 16;
      x.shadowOffsetY = 4;
      x.fillStyle = K.hi;
      x.font = `700 64px ${SANS}`;
      x.textAlign = 'center';
      x.fillText((d.name || '?').trim().charAt(0).toUpperCase(), P + AV / 2, ay + AV / 2 + 23);
      x.textAlign = 'left';
    }
    x.restore();
    const B = 104, bg = 14;
    const badges = (d.badges || []).slice(0, 3);
    const bw = badges.length ? badges.length * B + (badges.length - 1) * bg : 0;
    badges.forEach((b, i) => {
      const bx = W - P - bw + i * (B + bg), by = ay + (AV - B) / 2;
      glow(x, bx + B / 2, by + B / 2, 74, b.rim, 0.3);
      if (b.img) x.drawImage(b.img, bx, by, B, B);
    });
    const nx = P + AV + 36;
    const nmax = W - P - (bw ? bw + 32 : 0) - nx;
    x.font = `700 58px ${SANS}`;
    x.fillStyle = d.anon ? K.txt2 : K.hi;
    x.fillText(fit(x, d.anon ? 'Anonymous' : d.name, nmax), nx, ay + 64);
    x.font = `600 24px ${MONO}`;
    x.fillStyle = `rgb(${K.rcText(d.rc)})`;
    track(x, `LEVEL ${d.level} · ${d.rankName.toUpperCase()}`, nx, ay + 114, 0.14, 24);

    // 4. the step: the podium's, struck in the metal, standing on the floor; the flame burns inside it from its foot
    const sh = S.floor - S.top;
    const step = () => rr(x, S.x, S.top, S.w, sh + 2, [40, 40, 0, 0]);
    x.save();
    x.shadowColor = rgba(mRGB, 0.3);
    x.shadowBlur = 70;
    step();
    x.fillStyle = `rgb(${K.panel})`;
    x.fill();
    x.restore();
    step();
    const sg = x.createLinearGradient(0, S.top, 0, S.floor);
    sg.addColorStop(0, rgba(mRGB, 0.3));
    sg.addColorStop(1, rgba(mRGB, 0.05));
    x.fillStyle = sg;
    x.fill();
    x.save();
    step();
    x.clip();
    const fl = fire ? Fire.still(S.w, sh, { reach: [blue ? 360 / 1.45 : 360, 0, 0], scale: 44, look: blue ? 'blue' : 'orange', t: d.t }) : null;
    if (fl) {
      const fx = fl.getContext('2d');
      fx.globalCompositeOperation = 'destination-in';
      const mg = fx.createLinearGradient(0, 0, 0, sh);
      mg.addColorStop(0, 'rgba(0, 0, 0, 0)');
      mg.addColorStop(0.45, 'rgba(0, 0, 0, 1)');
      fx.fillStyle = mg;
      fx.fillRect(0, 0, S.w, sh);
      x.globalAlpha = 0.9;
      x.drawImage(fl, S.x, S.top);
      x.globalAlpha = 1;
    } else {
      glow(x, 600, S.floor, 340, mRGB, 0.3);
    }
    x.fillStyle = 'rgba(255, 255, 255, 0.24)';
    x.fillRect(S.x, S.top, S.w, 2);
    x.restore();
    step();
    x.lineWidth = 2;
    x.strokeStyle = rgba(mRGB, 0.34);
    x.stroke();

    // the numeral: "#7" (ranked) or "LV 23" (not ranked this week); white over a flame, metal or molten without one
    const big = ranked ? num(d.rank.pos) : String(d.level);
    const pre = ranked ? '#' : 'LV';
    let size = 320;
    const preFont = (s) => (ranked ? `800 ${Math.round(s * 0.46)}px ${SANS}` : `600 ${Math.round(s * 0.2)}px ${MONO}`);
    const widths = (s) => {
      x.font = preFont(s);
      const pw = ranked ? x.measureText(pre).width : tw(x, pre, 0.14, s * 0.2);
      x.font = `800 ${s}px ${SANS}`;
      return { pw, bw: tw(x, big, -0.04, s), gap: s * 0.04 };
    };
    let m = widths(size);
    while (m.pw + m.gap + m.bw > S.w - 96 && size > 120) m = widths((size -= 8));
    x.font = `800 ${size}px ${SANS}`;
    const cap = x.measureText('8').actualBoundingBoxAscent;
    const base = S.top + 92 + cap;
    const left = 600 - (m.pw + m.gap + m.bw) / 2;
    const paint = (fn) => {
      if (fl) {
        x.save();
        x.shadowColor = 'rgba(40, 12, 0, 0.85)';
        x.shadowBlur = 30;
        x.shadowOffsetY = 8;
        x.fillStyle = '#ffffff';
        fn();
        x.shadowColor = 'rgba(40, 12, 0, 1)';
        x.shadowBlur = 3;
        x.shadowOffsetY = 0;
        fn();
        x.restore();
      } else {
        x.save();
        const g = x.createLinearGradient(0, base - cap, 0, base);
        const stops = metal ? metal.g : K.molten;
        stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
        x.fillStyle = g;
        x.shadowColor = rgba(mRGB, 0.45);
        x.shadowBlur = 48;
        fn();
        x.restore();
      }
    };
    paint(() => {
      x.font = preFont(size);
      if (ranked) {
        x.fillText(pre, left, base - cap + x.measureText(pre).actualBoundingBoxAscent);
      } else {
        track(x, pre, left, base - cap + x.measureText('L').actualBoundingBoxAscent, 0.14, size * 0.2);
      }
      x.font = `800 ${size}px ${SANS}`;
      track(x, big, left + m.pw + m.gap, base, -0.04, size);
    });
    if (ranked && d.rank.pos === 1) {
      x.save();
      x.translate(600 - 48, S.top - 60);
      x.scale(4, 4);
      const cg = x.createLinearGradient(0, 0, 0, 18);
      cg.addColorStop(0, '#fff1a8');
      cg.addColorStop(0.5, '#f2b93b');
      cg.addColorStop(1, '#a36f0a');
      x.shadowColor = 'rgba(242, 185, 59, 0.75)';
      x.shadowBlur = 6;
      x.fillStyle = cg;
      x.fill(CROWN);
      x.restore();
    }
    const sub = ranked ? `of ${num(d.rank.total)} hackers` : d.rankName;
    x.font = `500 34px ${SANS}`;
    x.textAlign = 'center';
    x.save();
    if (fl) {
      x.shadowColor = 'rgba(40, 12, 0, 0.95)';
      x.shadowBlur = 10;
      x.fillStyle = 'rgba(255, 248, 240, 0.95)';
    } else {
      x.fillStyle = K.txt2;
    }
    x.fillText(sub, 600, base + 78);
    x.restore();
    x.textAlign = 'left';
    const pill = pillText(d);
    if (pill) {
      x.font = `600 24px ${MONO}`;
      const w = tw(x, pill, 0.14, 24) + 48;
      const py = base + 112;
      rr(x, 600 - w / 2, py, w, 50, 25);
      x.fillStyle = rgba(K.deepRGB, 0.62);
      x.fill();
      x.lineWidth = 2;
      x.strokeStyle = rgba(K.amberRGB, 0.55);
      x.stroke();
      x.fillStyle = K.amber;
      track(x, pill, 600, py + 34, 0.14, 24, 'center');
    }

    // the floor: the podium's glowing line
    const lg = x.createLinearGradient(0, 0, W, 0);
    lg.addColorStop(0, rgba(K.softRGB, 0));
    lg.addColorStop(0.16, rgba(K.softRGB, 0.55));
    lg.addColorStop(0.84, rgba(K.softRGB, 0.55));
    lg.addColorStop(1, rgba(K.softRGB, 0));
    x.save();
    x.shadowColor = rgba(K.accent, 0.6);
    x.shadowBlur = 24;
    x.fillStyle = lg;
    x.fillRect(0, S.floor - 1, W, 2);
    x.restore();

    // 5. the week: the hours (left) and a bar a day, Monday first (right). Not ranked and no hours this week: all time.
    if (showHours) {
      const hy = S.floor + 168;
      const week = d.hours >= 60;
      const parts = dur(week ? d.hours : d.totalHours).split(' ');
      let hx = P;
      for (const p of parts) {
        const n = p.slice(0, -1), u = p.slice(-1);
        x.font = `800 128px ${SANS}`;
        x.fillStyle = K.hi;
        hx += track(x, n, hx, hy, -0.04, 128) + 4;
        x.font = `700 60px ${SANS}`;
        x.fillStyle = K.txt2;
        x.fillText(u, hx, hy);
        hx += x.measureText(u).width + 26;
      }
      x.font = `500 32px ${SANS}`;
      x.fillStyle = K.txt2;
      x.fillText(week ? (d.live ? 'coded this week' : d.week.last ? 'coded last week' : 'coded that week') : 'coded in all', P, hy + 54);
      if (week && d.days) {
        const bx = 652, bwid = W - P - bx, col = bwid / 7, bh = 118;
        const top = Math.max(8 * 3600, ...d.days.map((s) => s || 0));
        // A past week has no today; its best day glows instead.
        if (!d.live) d = { ...d, today: d.days.reduce((b, s, i, a) => ((s || 0) > (a[b] || 0) ? i : b), 0) };
        x.fillStyle = rgba(K.accent, 0.28);
        x.fillRect(bx, hy + 2, bwid, 2);
        d.days.forEach((s, i) => {
          const cx = bx + col * i + col / 2, w = Math.round(col * 0.56);
          x.font = `600 22px ${MONO}`;
          x.fillStyle = i === d.today ? K.hi : K.txt3;
          x.textAlign = 'center';
          x.fillText(DOW[i], cx, hy + 54);
          x.textAlign = 'left';
          if (s == null) {
            x.fillStyle = rgba(K.accent, 0.35);
            x.beginPath(); x.arc(cx, hy - 10, 4, 0, Math.PI * 2); x.fill();
            return;
          }
          const h = s ? Math.max(10, (bh * s) / top) : 5;
          rr(x, cx - w / 2, hy - h, w, h, [8, 8, 0, 0]);
          if (s) {
            const g = x.createLinearGradient(0, hy - h, 0, hy);
            g.addColorStop(0, K.amberPale);
            g.addColorStop(0.4, K.amber);
            g.addColorStop(1, rgba(K.amberRGB, 0.55));
            x.save();
            if (i === d.today) { x.shadowColor = rgba(K.accent, 0.75); x.shadowBlur = 20; }
            x.fillStyle = g;
            x.fill();
            x.restore();
          } else {
            x.fillStyle = rgba(K.amberRGB, 0.18);
            x.fill();
          }
          if (s >= 5 * 3600) {
            x.save();
            x.translate(cx - 8, hy - h - 30);
            x.scale(1.6, 1.6);
            x.shadowColor = 'rgba(255, 120, 10, 0.9)';
            x.shadowBlur = 6;
            x.fillStyle = '#ff9a1f';
            x.fill(FLAME);
            x.restore();
          }
        });
      }
    }

    // 6. the signature: the app's mark and name, what it's for, where to get it. Small and quiet, as Monkeytype's.
    const fy = H - 68;
    if (d.logo) {
      x.save();
      x.shadowColor = 'rgba(255, 136, 0, 0.6)';
      x.shadowBlur = 12;
      x.drawImage(d.logo, P, fy - 33, 48, 38);
      x.restore();
    }
    x.font = `600 28px ${MONO}`;
    x.save();
    x.shadowColor = rgba(K.accent, 0.55);
    x.shadowBlur = 14;
    x.fillStyle = K.hi;
    const bwm = track(x, 'ORBITERM', P + 64, fy, 0.2, 28);
    x.restore();
    x.font = `600 28px ${MONO}`;
    const urlW = x.measureText('orbiterm.dev').width;
    const tagX = P + 64 + bwm + 22, tagMax = W - P - urlW - 28 - tagX;
    let ts = 24;
    do { x.font = `500 ${ts}px ${SANS}`; } while (x.measureText(TAGLINE).width > tagMax && (ts -= 1) > 18);
    x.fillStyle = K.txt3;
    x.fillText(TAGLINE, tagX, fy);
    x.font = `600 28px ${MONO}`;
    x.fillStyle = K.soft;
    x.textAlign = 'right';
    x.fillText('orbiterm.dev', W - P, fy);
    x.textAlign = 'left';
    return cv;
  }

  /** The text "Post on X" puts in the post (the person edits it there). No hashtags; the link counts 23 of 280. */
  function caption(d) {
    const url = 'https://orbiterm.dev/?ref=card';
    let line;
    if (d.rank) {
      const n = `#${num(d.rank.pos)} of ${num(d.rank.total)}`;
      line = d.live
        ? `${n} on the Orbiterm board this week${d.live && d.fire ? ' 🔥' : '.'}`
        : `Finished ${n} on the Orbiterm board ${d.week.last ? 'last week' : `the week of ${d.week.start}`}.`;
    } else {
      line = `Level ${d.level} ${d.rankName} on Orbiterm.`;
    }
    const h = d.hours == null ? '' : d.hours >= 60 ? `${dur(d.hours)} of coding with my AI agents.` : `${dur(d.totalHours)} of coding with my AI agents so far.`;
    return `${line}${h ? `\n${h}` : ''}\n\n${url}`;
  }
  const fileName = (d) => `orbiterm-week-${d.week.start}.png`;
  return { draw, caption, fileName, W, H };
})();

  // ---------------------------------------------------------------------------------------------------------------------
  // What goes on the card: your row of the board, your badges, your picture, as one plain object for Card.draw().
  // ---------------------------------------------------------------------------------------------------------------------
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dayAt = (start, i) => new Date(Date.parse(`${start}T00:00:00Z`) + i * 864e5);
  const addDays = (start, n) => dayAt(start, n).toISOString().slice(0, 10);
  const localMonday = () => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.toLocaleDateString('sv');
  };
  const rangeText = (start) => {
    const a = dayAt(start, 0), b = dayAt(start, 6);
    return a.getUTCMonth() === b.getUTCMonth()
      ? `${a.getUTCDate()}–${b.getUTCDate()} ${MON[b.getUTCMonth()]}`
      : `${a.getUTCDate()} ${MON[a.getUTCMonth()]} – ${b.getUTCDate()} ${MON[b.getUTCMonth()]}`;
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const bridge = () => window.webkit?.messageHandlers?.cloud || null;

  // Monday to Sunday from the API's rolling seven days (`days`, ending on `daysEnd`): this week, days to come are null.
  function liveDays(days, daysEnd) {
    const since = daysEnd ? new Date(`${daysEnd}T00:00:00Z`).getUTCDay() || 7 : 7;
    const out = days.slice(-since);
    while (out.length < 7) out.push(null);
    return { days: out.slice(0, 7), today: Math.min(6, since - 1) };
  }

  let fontsReady = null;
  function fonts() {
    fontsReady = fontsReady || Promise.all([
      document.fonts.load('800 64px "Orbiterm Card"'), document.fonts.load('700 64px "Orbiterm Card"'),
      document.fonts.load('500 32px "Orbiterm Card"'), document.fonts.load('600 24px "Orbiterm Card Mono"'),
    ]).catch(() => {});
    return fontsReady;
  }

  // An image as the card needs it. The app fetches it itself and hands over a data: address, so the picture never depends on
  // a server's CORS headers (no change to the files bucket). Without that bridge (a plain browser) it is the page's own try,
  // which works only where the server allows it; if it doesn't, the card is drawn without it.
  function decode(src, cors) {
    return new Promise((res) => {
      const i = new Image();
      const t = setTimeout(() => res(null), 4000);
      if (cors) i.crossOrigin = 'anonymous';
      i.onload = () => { clearTimeout(t); res(i); };
      i.onerror = () => { clearTimeout(t); res(null); };
      i.src = src;
    });
  }
  async function pic(url) {
    if (!url) return null;
    const h = bridge();
    if (h) {
      const data = await Promise.race([h.postMessage({ type: 'fetchImage', url }).catch(() => null), sleep(5000).then(() => null)]);
      return typeof data === 'string' && data.startsWith('data:image/') ? decode(data, false) : null;
    }
    return decode(`${url}${url.includes('?') ? '&' : '?'}card=1`, true);
  }

  async function data(weekArg) {
    const S = (window.Cloud && Cloud.state && Cloud.state()) || {};
    const xp = S.xp || {};
    const A = (window.Account && Account.state && Account.state()) || {};
    const W = await Social.weeks('xp').catch(() => null);
    const wkOK = !!W && !W.error;
    const cur = (wkOK && W.current) || localMonday();
    const live = !weekArg || weekArg >= cur;
    const start = live ? cur : weekArg;
    const b = await Social.leaderboard('week', false, live ? undefined : start).catch(() => null);
    const me = b && !b.error && b.me && b.me.pos ? b.me : null;
    const level = (me && me.level) || xp.level || 1;
    const rk = window.Xp ? Xp.rank(level) : { name: 'Genin', color: '255, 176, 87' };
    const last = start === addDays(cur, -7);
    // Offline there is no row to say it: your own setting (listed on the board or not) does.
    const anon = me ? !!me.anon : xp.board === false;

    let days = null, today = -1;
    if (me && me.days) {
      if (live) ({ days, today } = liveDays(me.days, me.daysEnd));
      else days = me.days.slice(0, 7);
    }
    // Record: a better place than any earlier final week's, once there are two to beat.
    const finals = (wkOK ? W.weeks || [] : []).filter((w) => w.final && w.place && w.week < start);
    const best = !!me && finals.length >= 2 && me.pos < Math.min(...finals.map((w) => w.place));
    const shownHours = xp.show !== false;
    const d = {
      key: start, live, final: live ? undefined : b && b.final !== false, anon, level, rankName: rk.name, rc: rk.color, best,
      week: me
        ? { label: live ? 'THIS WEEK' : last ? 'LAST WEEK' : `WEEK OF ${dayAt(start, 0).getUTCDate()} ${MON[dayAt(start, 0).getUTCMonth()]}`, range: live || last ? rangeText(start) : '', start, last }
        : { label: 'ALL TIME', range: '', start, last: false },
      rank: me ? { pos: me.pos, total: b.total || me.pos } : null,
      name: S.hackerName || '', fire: live && me ? me.fire || 0 : 0,
      days: me ? days : null, today,
      hours: shownHours ? (days ? days.reduce((a, v) => a + (v || 0), 0) : 0) : null, totalHours: xp.total || 0,
      offline: !me && !(b && !b.error),
      badges: [], avatar: null, logo: null,
    };
    if (!me) d.live = true;

    // Pictures: your avatar, up to three badges (your displayed one first, then the higher tier, then the rarer), the logo.
    const jobs = [decode(LOGO, false).then((i) => { d.logo = i; })];
    if (!anon && A.signedIn && A.avatar) jobs.push(pic(A.avatar).then((i) => { d.avatar = i; }));
    const B = A.signedIn && window.Badges ? Badges.mine() : null;
    if (B && B.badges && window.BadgeArt) {
      const earned = B.badges.filter((x) => x.tier)
        .sort((x, y) => (y.id === B.featured) - (x.id === B.featured) || y.tier - x.tier || (x.rare ?? 100) - (y.rare ?? 100)).slice(0, 3);
      d.badges = earned.map((x) => ({ id: x.id, tier: x.tier, rim: BadgeArt.glow(x.id, x.tier)[0], img: null }));
      d.badges.forEach((x) => jobs.push(pic(BadgeArt.src(x.id, x.tier)).then((i) => { x.img = i; })));
    }
    await Promise.all(jobs);
    return d;
  }

  // ---------------------------------------------------------------------------------------------------------------------
  // The sheet: the picture, Copy image, Post on X, Save image.
  // ---------------------------------------------------------------------------------------------------------------------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const isMac = !/Windows/.test(navigator.userAgent);
  const KEY = isMac ? '⌘V' : 'Ctrl+V';
  const I = {
    share: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 10.25V1.75M5.25 4.5 8 1.75l2.75 2.75"/><path d="M5.75 6.75H4.5a1.25 1.25 0 0 0-1.25 1.25v5a1.25 1.25 0 0 0 1.25 1.25h7a1.25 1.25 0 0 0 1.25-1.25V8a1.25 1.25 0 0 0-1.25-1.25h-1.25"/></svg>',
    copy: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.25" y="5.25" width="8.5" height="8.5" rx="1.5"/><path d="M10.75 5.25V3.75a1.5 1.5 0 0 0-1.5-1.5h-5.5a1.5 1.5 0 0 0-1.5 1.5v5.5a1.5 1.5 0 0 0 1.5 1.5h1.5"/></svg>',
    check: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.25 8.5 3 3 6.5-7"/></svg>',
    save: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v8.25M4.75 7 8 10.25 11.25 7"/><path d="M2.75 11v1.75a1.25 1.25 0 0 0 1.25 1.25h8a1.25 1.25 0 0 0 1.25-1.25V11"/></svg>',
    x: '<svg viewBox="0 0 16 16" aria-hidden="true"><path class="x-logo" d="M12.2 1.5h2.2L9.6 7l5.6 7.5h-4.4L7.4 10l-3.9 4.5H1.3l5.2-5.9L1.1 1.5h4.5l3.1 4.1zm-.8 11.7h1.2L5 2.7H3.7z"/></svg>',
    close: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7"/></svg>',
  };
  const NOTE = {
    normal: 'Shows your <b>name, picture, level, rank, hours and badges</b>. Never your projects, files or chats.',
    anon: 'You\'re <b>Anonymous</b> on the board, so the card leaves out your name and picture too.',
    hidden: 'You keep your hours to yourself, so they stay <b>off the card</b>.',
    offline: 'You\'re offline, so the card shows your <b>level</b> instead of your rank.',
    nobody: 'You\'re not on this week\'s board yet, so the card shows your <b>level</b> instead of your rank.',
  };
  const noteFor = (d) => (d.anon ? NOTE.anon : !d.rank ? (d.offline ? NOTE.offline : NOTE.nobody) : d.hours == null ? NOTE.hidden : NOTE.normal);

  /** The three buttons and the line under them (the bell's row uses them too). */
  const actsHTML = () =>
    `<div class="shc-acts"><button type="button" class="shc-btn primary" data-act="copy" disabled>${I.copy}<span>Copy image</span></button>` +
    `<button type="button" class="shc-btn glass" data-act="x" disabled>${I.x}<span>Post on X</span></button>` +
    `<button type="button" class="shc-btn glass" data-act="save" disabled>${I.save}<span>Save image</span></button></div>` +
    '<p class="shc-hint" data-hint aria-live="polite"></p>';

  function hint(root, kind, path) {
    const el = root.querySelector('[data-hint]');
    const copyBtn = root.querySelector('[data-act=copy]');
    el.classList.toggle('bad', kind === 'fail' || kind === 'savefail');
    copyBtn.classList.toggle('done', kind === 'copy');
    copyBtn.querySelector('span').textContent = kind === 'copy' ? '✓ Copied' : 'Copy image';
    copyBtn.querySelector('svg').outerHTML = kind === 'copy' ? I.check : I.copy;
    el.innerHTML = {
      copy: `Copied. Paste it anywhere with <kbd>${KEY}</kbd>.`,
      x: `Image copied. In your post, press <kbd>${KEY}</kbd> to add it.`,
      save: `Saved to Downloads.${path ? ` <button type="button" data-reveal>${isMac ? 'Show in Finder' : 'Show in folder'}</button>` : ''}`,
      fail: 'Couldn\'t copy the picture. Save it instead.',
      savefail: 'Couldn\'t save the picture. Check that Orbiterm may write to your Downloads folder, then try again.',
      retry: '',
    }[kind] || '';
    if (path) el.dataset.path = path;
  }

  const png64 = (url) => url.slice(url.indexOf(',') + 1);
  async function toClipboard(url, name) {
    const h = bridge();
    if (h) {
      const r = await h.postMessage({ type: 'shareImage', action: 'copy', png: png64(url), name }).catch(() => null);
      if (r && r.ok) return true;
      if (r) return false;
    }
    try {
      const blob = await (await fetch(url)).blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return true;
    } catch {
      return false;
    }
  }
  async function toDisk(url, name) {
    const h = bridge();
    if (h) {
      const r = await h.postMessage({ type: 'shareImage', action: 'save', png: png64(url), name }).catch(() => null);
      return r && r.ok ? r.path || true : null;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    return true;
  }
  // The post's compose screen opens in the browser (the app opens any https address there).
  function post(text) {
    const a = document.createElement('a');
    a.href = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    a.rel = 'noopener noreferrer';
    a.click();
  }

  /** The card for one week as a PNG address; a canvas the images made unreadable is drawn again without them. */
  async function render(d) {
    await fonts();
    let cv = await Card.draw(d);
    try {
      return cv.toDataURL('image/png');
    } catch {
      cv = await Card.draw({ ...d, avatar: null, logo: null, badges: (d.badges || []).map((x) => ({ ...x, img: null })) });
      return cv.toDataURL('image/png');
    }
  }

  /** Wires a sheet's picture and buttons (`root` has [data-img], [data-act], [data-hint]) to the card of `state.start`.
   *  `state.weeks` is [last, this] when the picture can switch. Returns { paint, week }. */
  function wire(root, state) {
    const pre = root.querySelector('[data-pre]');
    const img = root.querySelector('[data-img]');
    const cache = new Map();
    let cur = null, seq = 0;
    const buttons = () => root.querySelectorAll('[data-act]');
    async function paint(start) {
      const my = ++seq;
      state.start = start;
      buttons().forEach((b) => { b.disabled = true; });
      pre?.classList.add('wait');
      pre?.classList.remove('land');
      hint(root, '');
      try {
        if (!cache.has(start)) {
          const d = await data(start);
          cache.set(start, { d, url: await render(d) });
        }
        if (my !== seq) return;
        cur = cache.get(start);
        img.src = cur.url;
        pre?.classList.remove('wait');
        if (pre) { void pre.offsetWidth; pre.classList.add('land'); }
        root.dispatchEvent(new CustomEvent('sharecard:ready', { detail: cur.d }));
        buttons().forEach((b) => { b.disabled = false; });
      } catch {
        if (my !== seq) return;
        pre?.classList.remove('wait');
        const note = root.querySelector('[data-hint]');
        note.classList.add('bad');
        note.innerHTML = 'Couldn\'t make the picture. <button type="button" data-retry>Try again</button>';
      }
    }
    async function act(kind) {
      if (!cur) return;
      const name = Card.fileName(cur.d);
      if (kind === 'save') {
        const r = await toDisk(cur.url, name);
        return hint(root, r ? 'save' : 'savefail', typeof r === 'string' ? r : '');
      }
      const ok = await toClipboard(cur.url, name);
      if (!ok) return hint(root, 'fail');
      hint(root, kind === 'x' ? 'x' : 'copy');
      if (kind === 'x') setTimeout(() => post(Card.caption(cur.d)), 600);
    }
    root.addEventListener('click', (e) => {
      const w = e.target.closest('[data-week]');
      if (w && state.weeks && w.dataset.week !== state.start) {
        const seg = root.querySelector('.shc-seg');
        seg.style.setProperty('--i', state.weeks.indexOf(w.dataset.week));
        seg.querySelectorAll('[data-week]').forEach((x) => x.setAttribute('aria-checked', String(x.dataset.week === w.dataset.week)));
        return paint(w.dataset.week);
      }
      if (e.target.closest('[data-retry]')) return paint(state.start);
      const rv = e.target.closest('[data-reveal]');
      if (rv) return bridge()?.postMessage({ type: 'revealFile', path: root.querySelector('[data-hint]').dataset.path || '' });
      const b = e.target.closest('[data-act]');
      if (b && !b.disabled) act(b.dataset.act);
    });
    return { paint, act, ready: () => !!cur };
  }

  const segHTML = (weeks, start) => weeks
    ? `<div class="bd-seg shc-seg" role="radiogroup" aria-label="Which week" style="--n:2;--i:${Math.max(0, weeks.indexOf(start))}"><i class="bd-seg-thumb"></i>` +
      weeks.map((k, i) => `<button type="button" role="radio" data-week="${k}" aria-checked="${k === start}">${i === 0 ? 'Last week' : 'This week'}</button>`).join('') + '</div>'
    : '';

  let openRoot = null, opening = false;
  /** Share your week: `week` (a Monday) is that week's card with no switch (the board's own week); without it, Last week | This
   *  week when last week has your place, opening on Last week on Mondays and Tuesdays (and from the bell). `from`: where it was
   *  opened (focus goes back there). */
  async function open({ week, from } = {}) {
    if (openRoot || opening) return;
    opening = true;
    const opener = document.activeElement;
    let weeks = null, start = week, state, root;
    // `opening` can never stay true: whatever throws between here and the modal standing, it goes back down.
    try {
    if (!week) {
      const W = await Social.weeks('xp').catch(() => null);
      const cur = (W && !W.error && W.current) || localMonday();
      const last = addDays(cur, -7);
      const lastRow = W && !W.error && (W.weeks || []).find((w) => w.week === last);
      // Monday and Tuesday by the clock the weeks are cut on (Istanbul), not the computer's.
      const wd = ['Mon', 'Tue'].includes(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Istanbul', weekday: 'short' }).format(new Date()));
      if (lastRow && lastRow.place) {
        weeks = [last, cur];
        start = from === 'bell' || wd ? last : cur;
      } else start = cur;
    }
    state = { start, weeks };
    const note = '<p class="shc-note" data-note>Shows your <b>name, picture, level, rank, hours and badges</b>. Never your projects, files or chats.</p>';
    const host = document.createElement('div');
    host.innerHTML =
      '<div class="shc-scrim" data-scrim><div class="shc-sheet" role="dialog" aria-modal="true" aria-labelledby="shc-t">' +
      '<div class="shc-pre wait" data-pre><img alt="" data-img></div>' +
      `<div class="shc-side"><h2 class="shc-title" id="shc-t">Share your week</h2>${segHTML(weeks, start)}` +
      `<p class="shc-sub">A picture of your week, ready to paste on X, Reddit, Discord or Instagram.</p>${actsHTML()}${note}</div>` +
      `<button type="button" class="shc-x" data-close aria-label="Close" title="Close · Esc">${I.close}</button></div></div>`;
    root = host.firstElementChild;
    document.body.appendChild(root);
    openRoot = root;
    } finally {
      opening = false;
    }
    const w = wire(root, state);
    root.addEventListener('sharecard:ready', (e) => { root.querySelector('[data-note]').innerHTML = noteFor(e.detail); });
    const close = () => {
      if (!openRoot) return;
      removeEventListener('keydown', onKey, true);
      root.remove();
      openRoot = null;
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    };
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); return close(); }
      if (e.key === 'Tab') {
        const f = [...root.querySelectorAll('button:not([disabled]), [href]')];
        if (!f.length) return e.preventDefault();
        const i = f.indexOf(document.activeElement);
        const to = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1);
        if (!root.contains(document.activeElement)) { e.preventDefault(); return f[0].focus(); }
        if ((e.shiftKey && i <= 0) || (!e.shiftKey && i === f.length - 1)) { e.preventDefault(); f[to].focus(); }
        return;
      }
      const copyKey = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c' && !String(getSelection() || '');
      if (copyKey || (e.key === 'Enter' && !e.target.closest?.('button, a'))) {
        e.preventDefault();
        if (w.ready()) w.act('copy');
      }
    }
    addEventListener('keydown', onKey, true);
    root.addEventListener('click', (e) => {
      if (e.target === root || e.target.closest('[data-close]')) close();
    });
    await w.paint(start);
    root.querySelector('[data-act=copy]')?.focus({ preventScroll: true });
  }

  return { open, mount: (root, state) => wire(root, state), actsHTML, icon: I.share, data, Card, palette };
})();
