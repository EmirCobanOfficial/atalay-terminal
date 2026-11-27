'use strict';

// Notification sounds, synthesized (no audio files): a message chime, a rising arpeggio for a friend request, a
// bright chord when a request is accepted, a soft two-note call when a friend comes online, a soft blip when a message
// goes out, and for your own choices a happy "accepted" and a falling "declined". Your progress has its own: a coin
// for the daily bonus, for the level-up takeover a burst of static, then a ringing "ding" for a new level or a brass
// fanfare for a new rank, a fire catching for five hours of work in a day; a new badge's reveal plays recorded sounds
// (sounds/, from Artlist; so is the nudge). Do not disturb silences what comes in, not what you do (the level-up, the badges and the
// flames wait for it to end and then play).
window.Sfx = (() => {
  let ctx = null;
  let out = null;
  let idle = 0;
  // When the last sound playing ends (ms): the context rests only after it.
  let until = 0;

  function context() {
    if (!ctx) {
      ctx = new AudioContext();
      // A short echo gives the tones a little space without sounding like an alarm.
      const delay = ctx.createDelay(1);
      const feedback = ctx.createGain();
      const wet = ctx.createGain();
      out = ctx.createGain();
      delay.delayTime.value = 0.13;
      feedback.gain.value = 0.28;
      wet.gain.value = 0.3;
      out.gain.value = 0.9;
      out.connect(ctx.destination);
      out.connect(delay);
      delay.connect(feedback).connect(delay);
      delay.connect(wet).connect(ctx.destination);
    }
    return ctx;
  }

  function audio(ms = 2500) {
    context();
    if (ctx.state === 'suspended') ctx.resume();
    // A running context keeps a real-time audio thread busy; rest it between sounds, once the last one has ended.
    until = Math.max(until, Date.now() + ms);
    clearTimeout(idle);
    idle = setTimeout(() => ctx.state === 'running' && ctx.suspend(), until - Date.now());
    return ctx;
  }

  // One soft bell-like note: a sine with a quieter octave above, quick attack, gentle fade.
  function note(freq, at, { dur = 0.45, vol = 0.11, type = 'sine', bright = 0.35 } = {}) {
    const c = ctx;
    const t = c.currentTime + at;
    for (const [mult, level] of [[1, 1], [2, bright]]) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.value = freq * mult;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol * level, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * (mult === 1 ? 1 : 0.6));
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  // A brass-like note: two slightly detuned saws through a filter that opens fast and closes slowly.
  function horn(freq, at, dur, vol) {
    const t = ctx.currentTime + at;
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    f.type = 'lowpass';
    f.Q.value = 1.4;
    f.frequency.setValueAtTime(freq * 1.5, t);
    f.frequency.exponentialRampToValueAtTime(freq * 7, t + 0.05);
    f.frequency.exponentialRampToValueAtTime(freq * 2.6, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(vol * 0.72, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.3);
    f.connect(g).connect(out);
    for (const cents of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = cents;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.35);
    }
  }

  // A soft rising whoosh under a fanfare.
  function swell(from, to, at, dur, vol) {
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // A burst of digital noise through a band-pass, chopped on and off: a screen being hijacked.
  function noise(at, dur, vol) {
    const t = ctx.currentTime + at;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (Math.floor(i / 380) % 3 ? 1 : 0.15);
    const src = ctx.createBufferSource();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.buffer = buf;
    f.type = 'bandpass';
    f.frequency.value = 1900;
    f.Q.value = 0.7;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out);
    src.start(t);
    src.stop(t + dur);
  }

  // How long the longer sounds ring, so the audio doesn't rest before they end.
  let slotGain = 1; // the relative level of the attack feedback synths (slot())
  const LENGTH = { 'attack-launch': 1100, 'attack-hitmark': 200, 'attack-confirm': 1400, levelup: 3000, rankup: 4200, glitch: 1200, fire: 3200, alarm: 2800, lockon: 1700, locktick: 300, hit: 800, boom: 2000, nudge: 1800 };
  let nudgeEnd = 0; // when the nudge's buzz playing now ends (performance.now)

  // PROTOTYPE, not wired to anything yet (the user picks a variant first): a phone's vibration motor buzzing on a desk, synthesized
  // in real time to match araştırma/durtme-ses/buzz prototype (Python). variant 'A' = two 0.62 s pulses, 'B' = three 0.38 s pulses
  // with more rattle, 'C' = one 1.34 s buzz whose rattle swells. Each pulse = a harmonic stack (a PeriodicWave with 1/h^1.4 rolloff
  // and scattered phases, so it hums instead of clicking) at 160-195 Hz that sags at spin-up and spin-down, an amplitude wobble
  // (23 Hz, the off-centre weight), and band-passed noise chopped once per turn (the chatter against the wood), all through a
  // small desk body (high-pass 210, peaks at 320 Hz and 1.8 kHz, low-pass 3.2 kHz). 18 ms attack, 45 ms release: no clicks.
  const BUZZ = {
    A: { p: [[0.03, 0.62], [0.76, 0.62]], f0: 170, wob: 0.28, rat: 0.30, swell: false },
    B: { p: [[0.03, 0.38], [0.51, 0.38], [0.99, 0.38]], f0: 195, wob: 0.35, rat: 0.60, swell: false },
    C: { p: [[0.03, 1.34]], f0: 160, wob: 0.30, rat: 0.30, swell: true },
  };
  function nudgeBuzz(variant) {
    const c = ctx, v = BUZZ[variant] || BUZZ.A, t0 = c.currentTime + 0.01, LEVEL = 0.16;
    // The desk: one shared filter chain for every pulse.
    const hp = c.createBiquadFilter(), pk1 = c.createBiquadFilter(), pk2 = c.createBiquadFilter(), lp = c.createBiquadFilter(), master = c.createGain();
    hp.type = 'highpass'; hp.frequency.value = 210; hp.Q.value = 0.7;
    pk1.type = 'peaking'; pk1.frequency.value = 320; pk1.Q.value = 2; pk1.gain.value = 6;
    pk2.type = 'peaking'; pk2.frequency.value = 1800; pk2.Q.value = 1.2; pk2.gain.value = 4;
    lp.type = 'lowpass'; lp.frequency.value = 3200; lp.Q.value = 0.7;
    master.gain.value = LEVEL;
    hp.connect(pk1).connect(pk2).connect(lp).connect(master).connect(out);
    // Harmonic stack: sum sin(h*theta + 0.37*h*h)/h^1.4 up to 3.6 kHz (PeriodicWave: real = a*sin(phi), imag = a*cos(phi)).
    const H = Math.min(29, Math.floor(3600 / v.f0)), re = new Float32Array(H + 1), im = new Float32Array(H + 1);
    for (let h = 1; h <= H; h++) { const a = 1 / Math.pow(h, 1.4), ph = 0.37 * h * h; re[h] = a * Math.sin(ph); im[h] = a * Math.cos(ph); }
    const wave = c.createPeriodicWave(re, im);
    // One second of noise for the chatter, shared.
    const nb = c.createBuffer(1, Math.ceil(c.sampleRate * 1.5), c.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // chatter shape: max(0, sin)^3, a knock once per turn.
    const curve = new Float32Array(257);
    for (let i = 0; i < 257; i++) curve[i] = Math.pow(Math.max(0, (i - 128) / 128), 3);
    let end = 0;
    for (const [st, d] of v.p) {
      const t = t0 + st, e = t + d;
      end = Math.max(end, e);
      // Motor speed curve: starts 28% low (spin-up, tau 90 ms), drops 14% over the last 100 ms (spin-down).
      const N = Math.max(8, Math.round(d * 200)), fc = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const x = (i / (N - 1)) * d, td = Math.min(1, Math.max(0, (x - (d - 0.1)) / 0.1));
        fc[i] = v.f0 * (1 - 0.28 * Math.exp(-x / 0.09)) * (1 - 0.14 * td * td) * (1 + 0.012 * Math.sin(2 * Math.PI * 3.1 * x));
      }
      // Pulse envelope.
      const env = c.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(1, t + 0.018);
      env.gain.setValueAtTime(1, e - 0.045);
      env.gain.linearRampToValueAtTime(0, e);
      env.connect(hp);
      // The motor tone with its wobble.
      const o = c.createOscillator(), wg = c.createGain(), lfo = c.createOscillator(), ld = c.createGain(), tg = c.createGain();
      o.setPeriodicWave(wave);
      o.frequency.setValueCurveAtTime(fc, t, d);
      wg.gain.value = 1;
      lfo.frequency.value = 23; ld.gain.value = v.wob;
      lfo.connect(ld).connect(wg.gain);
      tg.gain.value = 0.9;
      o.connect(wg).connect(tg).connect(env);
      // The chatter: noise through a band-pass, gated by a once-per-turn knock that follows the same speed curve.
      const ns = c.createBufferSource(), bp = c.createBiquadFilter(), knock = c.createGain(), co = c.createOscillator(), shaper = c.createWaveShaper(), rg = c.createGain();
      ns.buffer = nb;
      bp.type = 'bandpass'; bp.frequency.value = 1600; bp.Q.value = 0.8;
      co.type = 'sine';
      co.frequency.setValueCurveAtTime(fc, t, d);
      shaper.curve = curve;
      knock.gain.value = 0;
      co.connect(shaper).connect(knock.gain);
      rg.gain.setValueAtTime(v.swell ? v.rat * 0.35 : v.rat, t);
      if (v.swell) rg.gain.linearRampToValueAtTime(v.rat, e);
      ns.connect(bp).connect(knock).connect(rg).connect(env);
      ns.start(t, 0.05);
      ns.stop(e + 0.02);
      o.start(t); o.stop(e + 0.02);
      lfo.start(t); lfo.stop(e + 0.02);
      co.start(t); co.stop(e + 0.02);
    }
    setTimeout(() => { try { master.disconnect(); } catch (_) {} }, (end - c.currentTime) * 1000 + 300);
    return (end - t0) * 1000;
  }

  const SOUNDS = {
    // A chat needs you (an approval): two short even beeps and a higher one, like a console asking for a key.
    wait() {
      note(783.99, 0, { dur: 0.14, type: 'triangle', vol: 0.1, bright: 0.25 });
      note(783.99, 0.16, { dur: 0.14, type: 'triangle', vol: 0.1, bright: 0.25 });
      note(1174.66, 0.32, { dur: 0.42, type: 'triangle', vol: 0.09, bright: 0.25 });
    },
    // Incoming message: two quick rising notes, like a HUD ping.
    message() {
      note(880, 0, { dur: 0.32 });
      note(1318.5, 0.085, { dur: 0.5 });
    },
    // A friend's nudge (nudge.ts): a buzzing rattle of 1.4 s that lasts as long as the shake (MSN-like, synthesized): twelve
    // short bursts 115 ms apart (each 85 ms of a square wave through a 900 Hz low-pass, its gain trembling at 30 Hz), the
    // pitch alternating 150 / 175 Hz like a phone shuddering on a desk, strong at first and fading over the last third.
    // Low and buzzy, so it's unlike the message's two rising pings, the request arpeggio and every attack sound.
    nudge() {
      const c = ctx;
      // One at a time, as the shake: a second (another friend's, or yours going out) while one rings adds nothing.
      if (performance.now() < nudgeEnd) return;
      nudgeEnd = performance.now() + 1400;
      // The recorded buzz (sounds/nudge.m4a, Artlist, 0.77 s) twice back to back, a phone buzzing twice, so it fills the 1.4 s
      // shake; through the same output as the synths. The synthesized one below is the fallback if it can't be loaded or decoded.
      buffer('nudge').then((buf) => {
        if (!buf) return SOUNDS.nudgeSynth();
        const g = c.createGain();
        g.gain.value = 0.9;
        g.connect(out);
        const t = c.currentTime;
        for (const at of [0, 1.4 - buf.duration]) {
          const src = c.createBufferSource();
          src.buffer = buf;
          src.connect(g);
          src.start(t + Math.max(0, at));
        }
      }).catch(() => SOUNDS.nudgeSynth());
    },
    nudgeSynth() {
      const c = ctx;
      for (let i = 0; i < 12; i++) {
        const t = c.currentTime + i * 0.115;
        const peak = 0.09 * (i < 6 ? 1 : Math.max(0.25, 1 - (i - 5) * 0.12));
        const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), depth = c.createGain();
        o.type = 'square';
        o.frequency.value = i % 2 ? 175 : 150;
        f.type = 'lowpass';
        f.frequency.value = 900;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(peak, t + 0.012);
        g.gain.setValueAtTime(peak, t + 0.07);
        g.gain.linearRampToValueAtTime(0.0001, t + 0.088);
        lfo.frequency.value = 30;
        depth.gain.value = peak * 0.39;
        lfo.connect(depth).connect(g.gain);
        o.connect(f).connect(g).connect(out);
        o.start(t);
        lfo.start(t);
        o.stop(t + 0.1);
        lfo.stop(t + 0.1);
      }
    },
    // Friend request: a rising arpeggio.
    request() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, i * 0.07, { dur: 0.38, type: 'triangle', vol: 0.09, bright: 0.2 }));
    },
    // Request accepted: a bright chord with a sparkle on top.
    friend() {
      [523.25, 659.25, 783.99].forEach((f) => note(f, 0, { dur: 0.7, type: 'triangle', vol: 0.07, bright: 0.15 }));
      note(2093, 0.12, { dur: 0.35, vol: 0.05, bright: 0 });
    },
    // A friend came online: two soft rising notes, lower and quieter than a message.
    online() {
      note(587.33, 0, { dur: 0.3, type: 'triangle', vol: 0.075, bright: 0.2 });
      note(880, 0.1, { dur: 0.5, type: 'triangle', vol: 0.075, bright: 0.2 });
    },
    // You accepted a request: a quick rising run that lands on a chord.
    accept() {
      [659.25, 783.99, 987.77].forEach((f, i) => note(f, i * 0.055, { dur: 0.3, type: 'triangle', vol: 0.08, bright: 0.2 }));
      [783.99, 987.77, 1318.5].forEach((f) => note(f, 0.18, { dur: 0.6, vol: 0.06, bright: 0.25 }));
    },
    // You declined or removed: two falling notes, a soft "nope".
    decline() {
      note(392, 0, { dur: 0.22, type: 'triangle', vol: 0.1, bright: 0.1 });
      note(293.66, 0.13, { dur: 0.42, type: 'triangle', vol: 0.1, bright: 0.1 });
    },
    // The level-up takeover starts: stuttering static and a falling "error" blip.
    glitch() {
      noise(0, 0.1, 0.1);
      noise(0.14, 0.06, 0.08);
      noise(0.24, 0.14, 0.09);
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(880, t);
      o.frequency.exponentialRampToValueAtTime(110, t + 0.28);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.03, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.32);
    },
    // Daily bonus: two quick bright notes, like a coin.
    xp() {
      note(1567.98, 0, { dur: 0.12, type: 'triangle', vol: 0.07, bright: 0.3 });
      note(2093, 0.075, { dur: 0.5, type: 'triangle', vol: 0.07, bright: 0.3 });
    },
    // A new level: a quick rising run landing on a ringing major chord, an MMO's "ding".
    levelup() {
      swell(130.81, 261.63, 0, 0.7, 0.05);
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, i * 0.06, { dur: 0.3, type: 'triangle', vol: 0.08, bright: 0.25 }));
      [1046.5, 1318.5, 1567.98].forEach((f) => note(f, 0.26, { dur: 1.9, vol: 0.055, bright: 0.45 }));
      [2093, 2637].forEach((f, i) => note(f, 0.34 + i * 0.1, { dur: 1.2, vol: 0.03, bright: 0 }));
    },
    // A new rank: a brass fanfare climbing in fourths, a long bright chord, bells on top.
    rankup() {
      swell(98, 196, 0.3, 1.4, 0.06);
      [[392, 0], [523.25, 0.13], [698.46, 0.26], [783.99, 0.39]].forEach(([f, t]) => horn(f, t, 0.16, 0.05));
      [523.25, 659.25, 783.99, 1174.66].forEach((f) => horn(f, 0.6, 1.7, 0.035));
      [2093, 2637, 3135.96, 4186].forEach((f, i) => note(f, 0.68 + i * 0.09, { dur: 0.9, vol: 0.028, bright: 0 }));
      note(1046.5, 0.6, { dur: 2.4, vol: 0.04, bright: 0.5 });
    },
    // On fire: a burner catching (a low thump under a rising whoosh), the crackle of the fire, and a short brass hit.
    fire() {
      const t = ctx.currentTime;
      const n = Math.floor(ctx.sampleRate * 1.8);
      const buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const whoosh = ctx.createBufferSource();
      const f = ctx.createBiquadFilter();
      const g = ctx.createGain();
      whoosh.buffer = buf;
      f.type = 'bandpass';
      f.Q.value = 0.8;
      f.frequency.setValueAtTime(180, t);
      f.frequency.exponentialRampToValueAtTime(2200, t + 0.45);
      f.frequency.exponentialRampToValueAtTime(600, t + 1.7);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.14);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.75);
      whoosh.connect(f).connect(g).connect(out);
      whoosh.start(t);
      whoosh.stop(t + 1.8);
      swell(110, 48, 0, 0.5, 0.14);
      // Crackles: very short clicks of bright noise, scattered.
      for (let i = 0; i < 30; i++) {
        const at = t + 0.2 + Math.random() * 2.2;
        const len = 0.004 + Math.random() * 0.014;
        const c = ctx.createBufferSource();
        const hp = ctx.createBiquadFilter();
        const cg = ctx.createGain();
        c.buffer = buf;
        hp.type = 'highpass';
        hp.frequency.value = 1800 + Math.random() * 3000;
        cg.gain.setValueAtTime(0.04 + Math.random() * 0.12, at);
        cg.gain.exponentialRampToValueAtTime(0.0001, at + len);
        c.connect(hp).connect(cg).connect(out);
        c.start(at, Math.random() * 1.5, len + 0.01);
      }
      [[196, 0.22], [293.66, 0.3], [392, 0.38]].forEach(([fr, at]) => horn(fr, at, 0.12, 0.045));
      [392, 493.88, 587.33].forEach((fr) => horn(fr, 0.5, 1.1, 0.03));
    },
    // Engine failure, for a runaway process: a starship's warning. Two bursts of three urgent beeps (a hard fifth, square
    // and triangle through a soft filter), each burst over a low thump, the echo ringing after them. About two seconds.
    alarm() {
      const t = ctx.currentTime;
      const beep = (at, dur) => {
        const f = ctx.createBiquadFilter();
        const g = ctx.createGain();
        f.type = 'lowpass';
        f.frequency.value = 2600;
        f.Q.value = 0.7;
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.1, at + 0.008);
        g.gain.setValueAtTime(0.1, at + dur - 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        f.connect(g).connect(out);
        for (const [freq, type] of [[880, 'square'], [1318.5, 'triangle']]) {
          const o = ctx.createOscillator();
          o.type = type;
          o.frequency.value = freq;
          o.connect(f);
          o.start(at);
          o.stop(at + dur + 0.02);
        }
      };
      const thump = (at) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(120, at);
        o.frequency.exponentialRampToValueAtTime(46, at + 0.35);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.32, at + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.4);
        o.connect(g).connect(out);
        o.start(at);
        o.stop(at + 0.45);
      };
      for (const burst of [0, 0.95]) {
        thump(t + burst);
        for (let i = 0; i < 3; i++) beep(t + burst + i * 0.21, 0.15);
      }
    },
    // A friend's lock-on (attack.js), our own tone: five short beeps rising in pitch and coming quicker (740 to 1245 Hz,
    // 70 ms each, 300, 240, 180 and 140 ms apart), then a 200 ms lock tone with its fifth, a fighter cockpit's "locked on".
    // A thin square wave through a soft filter (3 kHz), quieter than the alarm so DANGER stays the loudest moment. About
    // 1.2 s, so the ship arrives as it ends. The pitch drifts up to 2% each time, so the ear doesn't tire of it.
    lockon() {
      const t = ctx.currentTime;
      const drift = 1 + (Math.random() - 0.5) * 0.04;
      const tone = (freq, at, dur, vol) => {
        const f = ctx.createBiquadFilter();
        const g = ctx.createGain();
        const o = ctx.createOscillator();
        f.type = 'lowpass';
        f.frequency.value = 3000;
        o.type = 'square';
        o.frequency.value = freq * drift;
        g.gain.setValueAtTime(0.0001, t + at);
        g.gain.exponentialRampToValueAtTime(vol, t + at + 0.008);
        g.gain.setValueAtTime(vol, t + at + dur - 0.025);
        g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
        o.connect(f).connect(g).connect(out);
        o.start(t + at);
        o.stop(t + at + dur + 0.02);
      };
      [[740, 0], [880, 0.3], [988, 0.54], [1109, 0.72], [1245, 0.86]].forEach(([fr, at]) => tone(fr, at, 0.07, 0.085));
      tone(1319, 1.0, 0.2, 0.085);
      tone(1976, 1.0, 0.2, 0.04);
    },
    // Your own press on "fire at" (attack.js): one soft, short lock tick, the target's lock-on in miniature.
    locktick() {
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 1319;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.12);
    },
    // END IT pressed: a punch that lands. A low thump, a crack of noise and a short metallic ring, all at once.
    hit() {
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.22);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.55, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.3);
      const n = Math.floor(ctx.sampleRate * 0.14);
      const buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
      const crack = ctx.createBufferSource();
      const bp = ctx.createBiquadFilter();
      const cg = ctx.createGain();
      crack.buffer = buf;
      bp.type = 'bandpass';
      bp.frequency.value = 1700;
      bp.Q.value = 0.8;
      cg.gain.value = 0.5;
      crack.connect(bp).connect(cg).connect(out);
      crack.start(t);
      for (const [fr, vol] of [[1240, 0.05], [1870, 0.03]]) {
        const r = ctx.createOscillator();
        const rg = ctx.createGain();
        r.type = 'triangle';
        r.frequency.value = fr;
        rg.gain.setValueAtTime(vol, t);
        rg.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        r.connect(rg).connect(out);
        r.start(t);
        r.stop(t + 0.36);
      }
    },
    // The attacker's three feedback sounds (attack.js "hit feel"). Fallbacks for sounds/attack-launch|hitmark|confirm.m4a:
    // when a recording of that name exists (sounds.js) it plays instead (slot()). `slotGain` is the relative level.
    // S1: engines catching and flying away, a short whoosh falling in pitch (about 0.9 s), no impact at the end.
    'attack-launch'() {
      const c = ctx, t = c.currentTime, G = slotGain, dur = 0.9;
      const n = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, n, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
      src.buffer = buf;
      bp.type = 'bandpass';
      bp.Q.value = 1.1;
      bp.frequency.setValueAtTime(2600, t);
      bp.frequency.exponentialRampToValueAtTime(300, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5 * G, t + 0.07);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(bp).connect(g).connect(c.destination);
      src.start(t);
      const o = c.createOscillator(), og = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(190, t);
      o.frequency.exponentialRampToValueAtTime(46, t + dur * 0.8);
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.1 * G, t + 0.05);
      og.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.85);
      o.connect(og).connect(c.destination);
      o.start(t);
      o.stop(t + dur);
    },
    // S2: a dry hit-marker tick, 90 ms, a click on a short body; the pitch moves a little each time.
    'attack-hitmark'() {
      const c = ctx, t = c.currentTime, G = slotGain, k = 1 + (Math.random() - 0.5) * 0.06;
      const n = Math.floor(c.sampleRate * 0.03);
      const buf = c.createBuffer(1, n, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3;
      const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
      src.buffer = buf;
      bp.type = 'bandpass';
      bp.frequency.value = 3000 * k;
      bp.Q.value = 1.4;
      g.gain.value = 0.9 * G;
      src.connect(bp).connect(g).connect(c.destination);
      src.start(t);
      const o = c.createOscillator(), og = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(420 * k, t);
      o.frequency.exponentialRampToValueAtTime(150 * k, t + 0.08);
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.7 * G, t + 0.003);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(og).connect(c.destination);
      o.start(t);
      o.stop(t + 0.1);
    },
    // S3: the hit confirmed (about 1.2 s): a low thump, a distant muffled boom, a small bright metallic note on top.
    'attack-confirm'() {
      const c = ctx, t = c.currentTime, G = slotGain;
      const o = c.createOscillator(), og = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.35);
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.9 * G, t + 0.006);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(og).connect(c.destination);
      o.start(t);
      o.stop(t + 0.65);
      const n = Math.floor(c.sampleRate * 1.0);
      const buf = c.createBuffer(1, n, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.22));
      const src = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain();
      src.buffer = buf;
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(900, t + 0.04);
      lp.frequency.exponentialRampToValueAtTime(120, t + 1);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.55 * G, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
      src.connect(lp).connect(g).connect(c.destination);
      src.start(t + 0.04);
      for (const [fr, v] of [[1480, 0.12], [2217, 0.07]]) {
        const r = c.createOscillator(), rg = c.createGain();
        r.type = 'triangle';
        r.frequency.value = fr;
        rg.gain.setValueAtTime(0.0001, t + 0.05);
        rg.gain.exponentialRampToValueAtTime(v * G, t + 0.058);
        rg.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        r.connect(rg).connect(c.destination);
        r.start(t + 0.05);
        r.stop(t + 0.52);
      }
    },
    // The runaway's box blowing up on the orbit: a deep rumbling blast with a sub drop under it, crackling as it fades.
    boom() {
      const t = ctx.currentTime;
      const n = Math.floor(ctx.sampleRate * 1.2);
      const buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.28));
      const blast = ctx.createBufferSource();
      const lp = ctx.createBiquadFilter();
      const bg = ctx.createGain();
      blast.buffer = buf;
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2400, t);
      lp.frequency.exponentialRampToValueAtTime(180, t + 0.9);
      bg.gain.value = 0.7;
      blast.connect(lp).connect(bg).connect(out);
      blast.start(t);
      swell(90, 28, 0, 0.7, 0.5);
      for (let i = 0; i < 18; i++) {
        const at = t + 0.15 + Math.random() * 0.8;
        const c = ctx.createBufferSource();
        const hp = ctx.createBiquadFilter();
        const g = ctx.createGain();
        c.buffer = buf;
        hp.type = 'highpass';
        hp.frequency.value = 1500 + Math.random() * 2500;
        g.gain.setValueAtTime(0.05 + Math.random() * 0.1, at);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.012);
        c.connect(hp).connect(g).connect(out);
        c.start(at, Math.random() * 0.3, 0.02);
      }
    },
    // Message sent: a short, low-key blip.
    send() {
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(1250, t);
      o.frequency.exponentialRampToValueAtTime(760, t + 0.07);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.1);
    },
  };

  // A sound that is another's unless the theme gives it one of its own (hooks.js): two chats writing the same file sound
  // as a chat that needs you.
  const SAME = { clash: 'wait', nudgeOut: 'nudge' };
  // Moments the app marks without a sound of its own (hooks.js): only a theme's file plays for them.
  const THEMED = ['streak', 'streak-break', 'back', 'theme-kept'];

  let warned = false;
  function warnIfSilent() {
    if (warned || !ctx || ctx.state === 'running') return;
    warned = true;
    const msg = `notification sounds blocked: audio context is ${ctx.state}`;
    const h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.messages;
    if (h) h.postMessage({ type: 'log', msg });
    else console.warn(msg);
  }

  // Recorded sounds (sounds/*.m4a), and where in each its moment is (s): the impact's burst, the shine's ring (the
  // badge's reveal lines them up on the moment the badge shows), a badge put on display landing. They play through the
  // audio context, from sounds.js (the files in base64, loaded on first use), never through an <audio> element: macOS
  // takes one that played for music (Now Playing), and the keyboard's play key then played the badge's sound again.
  const SAMPLES = { 'badge-impact': 1.62, 'badge-shine': 1.07, 'badge-equip': 0.36 };
  const decoded = new Map();
  let sounds = null;
  const soundsJs = () =>
    window.__SOUNDS ? Promise.resolve() : (sounds = sounds || new Promise((ok) => {
      const s = document.createElement('script');
      s.src = 'sounds.js';
      s.onload = s.onerror = () => ok();
      document.head.append(s);
    }));
  function buffer(name) {
    if (!decoded.has(name)) {
      decoded.set(name, soundsJs().then(() => {
        const b64 = window.__SOUNDS && window.__SOUNDS[name];
        if (!b64) return null;
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        return context().decodeAudioData(bytes.buffer);
      }).catch(() => null));
    }
    return decoded.get(name);
  }
  // A theme's own recording (hooks.js) is a file a page can't read: an <audio> element plays it, and lets go of it once
  // it's over, so it doesn't stay the computer's Now Playing.
  function playFile(src, vol, from) {
    try {
      const a = new Audio(src);
      a.volume = vol;
      a.currentTime = from;
      a.onended = () => { a.removeAttribute('src'); a.load(); };
      a.play().catch(() => {});
    } catch {}
  }

  return {
    /** Loads a recorded sound ahead, so it starts on time (a promise of it, for a picture that must start with it). */
    preload: (name) => buffer(name),
    /** Where in the recorded sound its moment is, in ms. */
    hit: (name) => Math.round(1000 * (SAMPLES[name] || 0)),
    /** The attack feedback slots: sounds/<name>.m4a if there is one, else the synthesized fallback, at level `vol`. */
    slot(name, vol = 1) {
      buffer(name).then((buf) => {
        if (buf) return this.sample(name, vol);
        slotGain = vol;
        this.play(name);
      });
    },
    /** Plays a recorded sound from the start, or from `from` s in (yours: do not disturb doesn't silence it). */
    sample(name, vol = 1, from = 0) {
      const own = Hooks.soundOf(name);
      if (own === 'none') return;
      // The theme's own recording, its moment at the same point in it as the app's.
      if (own) return playFile(own, vol, from);
      buffer(name).then((buf) => {
        if (!buf) return;
        const c = audio(Math.ceil((buf.duration - from) * 1000) + 300);
        const src = c.createBufferSource(), g = c.createGain();
        src.buffer = buf;
        g.gain.value = vol;
        src.connect(g).connect(c.destination);
        const start = () => src.start(0, Math.min(from, buf.duration));
        if (c.state === 'running') start();
        else c.resume().then(start).catch(() => {});
      });
    },
    play(name) {
      const yours = ['send', 'accept', 'decline', 'levelup', 'rankup', 'glitch', 'fire', 'hit', 'boom', 'theme-kept', 'locktick', 'attack-launch', 'attack-hitmark', 'attack-confirm', 'nudgeOut'].includes(name);
      const base = SOUNDS[name] ? name : SAME[name];
      if ((!base && !THEMED.includes(name)) || (window.Social && window.Social.dnd() && !yours)) return;
      // The theme's own sound, or its silence, instead of the app's (a theme-only one has nothing else).
      if (Hooks.sound(name) || !base || (base !== name && Hooks.sound(base))) return;
      try {
        audio(LENGTH[base] || 2500);
        SOUNDS[base]();
        setTimeout(warnIfSilent, 600);
      } catch {}
    },
  };
})();
