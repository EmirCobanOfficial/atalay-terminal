'use strict';

// The 3D show of a friend's spaceship attack (v3: a three.js ship and bolts, glass cracks and fog, and a cockpit frame round
// the screen, each on its own transparent WebGL canvas). It takes over window.AttackScreen from attack-screen.js with the
// same calls (lock, start, cancel, active, onChange, T, seek, end), so messages.js and the preview button need no change.
// attack-screen.js stays under it: its layer (#atk-screen) is the one this show sits on, and it plays the whole show itself
// (the old SVG one, with its reticle) whenever the 3D one can't: no WebGL2, its files missing or not ready in time, or a
// failure as it starts. Its reticle is hidden while the 3D show has the layer (attack.css, #atk-screen.v3): the lock-on
// there is the cockpit's frame and attack.js's strip (LOCKED ON).
//
// Files (made by scripts/attack3d.sh from the research folder, Resources/web/attack3d/):
//   scene3d.js  the scene (three.js, the cockpit frame, cracks, glass)
//   assets.js   ship and flipbooks in base64 (this page is a file:// page: fetch() can't read a file beside it,
//               an image from one taints a WebGL texture; a blob URL has neither problem)
// The notices page lives as long as the app, so neither is read before an attack: both are put in as the lock-on comes
// (lock(), the first thing this page hears of one), the base64 is turned into blob URLs and let go at once, and when the
// show is over the WebGL contexts are lost, the blob URLs revoked and the scene's code itself let go (its globals
// deleted), so an idle page holds none of it. The next attack loads them again.
// One clock (ms, scene3d's T): the lock-on is -1600..0 (attack.js LOCK_MS + HOLD_MS: the frame deploys, the cabin's red
// alert), the ship 0..14500 (shots 5920/6090/6260, hits 60 ms later at 5980/6150/6320, fly-by 8000, seal 11400-13800). The scene is made
// before any of it shows: lock() holds the lock-on back until the scene is ready (LOCK_WAIT at most; attack.js waits on the
// promise lock() gives back before its strip and sound) and the clock starts there, at -1600. The dashboard's start()
// comes 1.6 s after it sent the lock-on, so before 0 here: the ship never waits for it unless it's late (the picture holds
// at 0 meanwhile). Not ready within LOCK_WAIT: the lock-on shows with the old reticle and the old show follows, same clock.
// Frames stop when the page can't be seen (hidden, screen asleep): the blast's DANGER and the end still come on time
// (timers), a sound whose moment passed meanwhile is skipped, and the picture picks up where the clock is.
// Reduced motion: the scene's static frame and cracks, no ship.
(() => {
  const V1 = window.AttackScreen;
  if (!V1) return;
  const BASE = 'attack3d/';
  const DPR_CAP = 1.5; // the scene also caps its internal size at 2560x1440
  const LOCK = 1600; // the lock-on's length (attack.js LOCK_MS + HOLD_MS): the show clock's -1600..0 (scene3d T.LOCK_START)
  const LOCK_WAIT = 1500; // the lock-on held back at most this long for its scene (attack.js LOAD_MS); then the old show
  const LOCK_GUARD = 4600; // a lock-on with no ship after it is let go (attack-screen.js takes its layer down at 4500)
  const SOUND_LATE = 600; // a sound this late (no frames: the page hidden) is skipped
  const DANGER_AFTER = 350; // DANGER (attack.js, opts.onBlast) this long after the big hit
  // The show's sounds: the one table to change for a new sound pack. Times on the show clock (scene3d's T, so they follow
  // the scene); one before 0 plays in the lock-on (whose own beep is attack.js's, with its strip). `calm`: played with
  // reduced motion too (no ship then).
  const SOUNDS = (T) => [
    { at: 0, name: 'attack-flyby', vol: 0.8 }, // the ship out of deep space
    // Silent: wakes the audio before the shots. Sfx rests its context between sounds (the fly-by ends at ~2.2 s) and waking
    // it takes tens of ms, longer with Bluetooth output: the first shot and crack would come late on their frames. The crack
    // (0.24 s, kept awake 0.3 s more) holds it awake until ~140 ms past the first shot, which then keeps it going.
    { at: T.SHOTS[0] - 400, name: 'attack-crack', vol: 0 },
    { at: T.SHOTS[0], name: 'attack-shot', vol: 0.85 }, // 5920, one sound per shot
    { at: T.SHOTS[1], name: 'attack-shot', vol: 0.85 }, // 6090
    { at: T.SHOTS[2], name: 'attack-shot', vol: 0.95 }, // 6260
    { at: T.HITS[0], name: 'attack-crack', vol: 1 }, // 5980, the glass cracks on each hit (the shot lands 60 ms before)
    { at: T.HITS[1], name: 'attack-crack', vol: 1 }, // 6150
    { at: T.HITS[2], name: 'attack-crack', vol: 0.9 }, // 6320, under the boom
    { at: T.HITS[2], name: 'attack-boom', vol: 1, calm: true }, // 6320, the big hit
    { at: T.FLYBY, name: 'attack-flyby', vol: 0.4 }, // 8000
    { at: T.SEAL[0], name: 'attack-rebuild', vol: 0.7, calm: true }, // 11400, the glass seals
  ];
  // Times drawn once before the lock-on shows (its layer still transparent), so every shader is compiled and every texture
  // uploaded before it, not in its frames (the scene is a pure function of t: nothing is left over). -1200: the frame (with
  // reduced motion it's drawn only once faded in); 11000: the ship fading out (its materials turn transparent, another
  // shader). T.LOCK_START comes last: the lock-on's first frame, an empty one.
  const WARM = [-1200, 300, 1500, 3000, 4500, 5700, 6000, 6400, 7200, 8000, 9000, 11000, 12000];
  // What scene3d.js and assets.js leave on window (three.js marks itself too)
  const GLOBALS = ['AttackSceneV3', 'Cracks', 'Glass', '__THREE__', '__ATTACK3D_PACK'];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layer = () => document.getElementById('atk-screen');

  let gl2 = null; // WebGL2 with float render targets here (asked once)
  let failed = false; // the old show for the rest of this page's life
  let fails = 0; // scenes that failed one after another (two: failed)
  let lib = null; // window.AttackSceneV3 while a show needs it
  let loading = null; // the two files on their way
  let P = null; // the scene being made / made for the run below
  let cur = null; // the run: from lock() (its lock-on) to the show's end
  let dropTimer = 0;

  const api = {
    lock,
    start,
    cancel,
    active: () => V1.active(),
    get T() {
      return (lib && lib.T) || V1.T;
    },
    seek: (ms) => V1.seek(ms),
    end: () => (cur ? endRun(cur) : V1.end()),
  };
  Object.defineProperty(api, 'onChange', { get: () => V1.onChange, set: (f) => (V1.onChange = f) });

  function webgl2() {
    if (gl2 === null) {
      gl2 = false;
      try {
        const g = document.createElement('canvas').getContext('webgl2');
        if (g) {
          gl2 = !!(g.getExtension('EXT_color_buffer_float') || g.getExtension('EXT_color_buffer_half_float'));
          const lose = g.getExtension('WEBGL_lose_context');
          lose && lose.loseContext();
        }
      } catch {}
    }
    return gl2;
  }

  function loadScript(src) {
    return new Promise((ok, no) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => {
        s.remove();
        ok();
      };
      s.onerror = () => {
        s.remove();
        no(new Error(src));
      };
      document.head.appendChild(s);
    });
  }

  // The two files, read together (the scene's code only when it isn't here from a show a moment ago). The pack is handed
  // over once and left nowhere else.
  function files() {
    if (!loading) {
      const p = (loading = (async () => {
        // taken off window the moment it's there, whatever happens to the scene's code
        const assets = loadScript(BASE + 'assets.js').then(() => {
          const pack = window.__ATTACK3D_PACK;
          delete window.__ATTACK3D_PACK;
          return pack;
        });
        assets.catch(() => {});
        if (!lib) {
          await loadScript(BASE + 'scene3d.js');
          lib = window.AttackSceneV3;
          if (!lib || !lib.createAttackScene) throw new Error('attack3d: scene missing');
        }
        const pack = await assets;
        if (!pack || !pack.ship) throw new Error('attack3d: assets missing');
        return pack;
      })());
      p.then(() => loading === p && (loading = null), () => loading === p && (loading = null));
    }
    return loading;
  }

  // Lets the scene's code go once nothing needs it (a lock-on coming right after a show keeps it; a run that went to the
  // old show doesn't).
  function dropSoon() {
    clearTimeout(dropTimer);
    dropTimer = setTimeout(() => {
      if (P || loading || (cur && !cur.v1)) return;
      lib = null;
      for (const k of GLOBALS) {
        try {
          delete window[k];
        } catch {
          try {
            window[k] = undefined;
          } catch {}
        }
      }
    }, 0);
  }

  // base64 to bytes (the built-in decoder where there is one)
  function bytes(b64) {
    if (typeof Uint8Array.fromBase64 === 'function') return Uint8Array.fromBase64(b64);
    const bin = atob(b64);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < u.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }

  // A canvas's WebGL context lost now (the cockpit's renderer isn't handed out: its context is reached by its canvas,
  // which gives back the one it has).
  function loseCanvas(c) {
    try {
      const g = c && (c.getContext('webgl2') || c.getContext('webgl'));
      const x = g && g.getExtension('WEBGL_lose_context');
      x && x.loseContext();
    } catch {}
  }

  // ---------- making the scene (before its lock-on shows) ----------
  function prepare() {
    releasePrep(true);
    clearTimeout(dropTimer);
    const p = (P = { dead: false, ok: false, calm: reducedMotion(), urls: [], imgs: [], scene: null, host: null });
    p.ready = (async () => {
      try {
        let pack = await files();
        if (p.dead) return;
        for (let i = 0; i < 12 && innerWidth < 600; i++) await sleep(80); // the panel was given the screen a moment ago
        if (p.dead) return;
        const root = layer();
        if (!root) throw new Error('attack3d: no layer');
        const url = (b64, mime) => {
          const o = URL.createObjectURL(new Blob([bytes(b64)], { type: mime }));
          p.urls.push(o);
          return o;
        };
        // As the approved scene (sahne/preview.html): the cockpit frame on (the scene's default), the glass layer's
        // procedural frost (frostUrl:false) and no vapour wisp atlases (they read as smoke).
        // reduced motion has no ship: its model and flipbooks aren't even decoded
        const sprites = {};
        let shipUrl = null;
        if (!p.calm) {
          for (const [k, v] of Object.entries(pack.sprites)) sprites[k] = { url: url(v.b64, v.mime), json: v.json };
          shipUrl = url(pack.ship, 'model/gltf-binary');
        }
        pack = null; // the base64 goes now; the blobs carry the files
        const host = document.createElement('div');
        host.className = 'as3d';
        // transparent until its lock-on shows (begin()): the frames that warm it up are never seen
        host.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:0';
        root.insertBefore(host, root.querySelector('.as-ret'));
        p.host = host;
        // the <img>s the glass layer decodes its maps with, kept to be emptied with the show (their decoded pixels stay in
        // WebKit's image cache while an element still points at them, whenever the GC comes for it)
        const Img = window.Image;
        let scene;
        window.Image = function (...a) {
          const im = new Img(...a);
          p.imgs.push(im);
          return im;
        };
        window.Image.prototype = Img.prototype;
        try {
          scene = p.scene = lib.createAttackScene({
            container: host,
            reduced: p.calm,
            dpr: Math.min(window.devicePixelRatio || 1, DPR_CAP),
            frostUrl: false,
          });
        } finally {
          window.Image = Img;
        }
        const jobs = [scene.cracksReady];
        if (!p.calm) jobs.push(scene.setSprites(sprites), scene.loadShip(shipUrl, { length: 6.5, nose: '+z' }));
        await Promise.all(jobs);
        if (p.dead) return;
        for (const t of WARM) scene.render(t);
        scene.render(scene.T.LOCK_START);
        p.ok = true;
        fails = 0;
      } catch (e) {
        if (!p.dead && ++fails >= 2) failed = true;
        throw e;
      } finally {
        if (p.dead) dropSoon();
      }
    })();
    p.ready.catch(() => {});
    return p;
  }

  // The decoded pictures three.js holds (the ship's textures, the flipbooks: ImageBitmaps it never closes) let go now.
  function closeBitmaps(root) {
    const seen = new Set();
    const add = (v) => v && v.isTexture && seen.add(v);
    root &&
      root.traverse((o) => {
        for (const m of [].concat(o.material || [])) {
          for (const k in m) add(m[k]);
          if (m.uniforms) for (const k in m.uniforms) add(m.uniforms[k] && m.uniforms[k].value);
        }
      });
    for (const t of seen) {
      const im = t.image;
      if (im && typeof im.close === 'function') {
        try {
          im.close();
        } catch {}
      }
    }
  }

  // Frees a scene that isn't (or is no longer) being shown: contexts (the scene's, the glass layer's, the cockpit's),
  // blobs, nodes; then its code (keepLib: another is being made right away).
  function releasePrep(keepLib = false) {
    const p = P;
    P = null;
    if (p) {
      p.dead = true;
      try {
        if (p.scene) {
          const gl = p.scene.renderer;
          const frame = p.scene.cockpit && p.scene.cockpit.canvas;
          closeBitmaps(p.scene.scene);
          p.scene.dispose();
          gl && gl.forceContextLoss && gl.forceContextLoss();
          loseCanvas(frame);
        }
      } catch {}
      p.imgs.forEach((im) => {
        im.onload = im.onerror = null;
        im.removeAttribute('src');
      });
      p.urls.forEach((u) => URL.revokeObjectURL(u));
      p.urls.length = p.imgs.length = 0;
      p.host && p.host.remove();
      p.scene = p.host = null;
    }
    if (!keepLib) dropSoon();
  }

  // ---------- the calls attack.js makes ----------
  // The lock-on. With the 3D show it gives back a promise, settled when the lock-on shows (attack.js puts up its strip and
  // its sound then): once the scene is made, or after LOCK_WAIT with the old show instead. The run starts here.
  function lock() {
    if (cur) endRun(cur);
    V1.lock();
    // decoded now, not on the shot's frame (V1.lock() loads the old show's sounds only)
    if (window.Sfx && Sfx.preload) ['attack-shot', 'attack-crack'].forEach((n) => Sfx.preload(n));
    if (failed || !webgl2()) return undefined; // the old show: its reticle closes now
    const root = layer();
    if (root) root.classList.add('v3'); // its reticle hidden (attack.css)
    const R = (cur = { opts: null, p: prepare(), T: null, t0: 0, shown: false, v1: false, raf: 0, guard: 0, timers: [], cues: [], drawn: false });
    R.guard = setTimeout(() => cur === R && !R.opts && endRun(R, false), LOCK_GUARD);
    return new Promise((done) => {
      const show = (ok) => {
        if (R.shown) return;
        R.shown = true;
        R.t0 = performance.now() + LOCK;
        if (cur === R) {
          try {
            if (!ok) throw new Error('attack3d: not ready');
            begin(R);
          } catch {
            toV1(R);
          }
        }
        done();
      };
      Promise.race([R.p.ready.then(() => R.p.ok && !R.p.dead), sleep(LOCK_WAIT).then(() => false)]).then(show, () => show(false));
    });
  }

  function cancel() {
    if (cur) endRun(cur, false);
    releasePrep();
    V1.cancel();
  }

  // The ship: the run's lock-on goes on into it (its clock already set). No lock-on before it: the old show, now.
  function start(opts = {}) {
    const R = cur;
    if (!R || R.opts) {
      if (R) endRun(R);
      releasePrep();
      return V1.start(opts);
    }
    R.opts = opts;
    clearTimeout(R.guard);
    V1.hold();
    if (R.v1) {
      cur = null;
      dropSoon();
      return V1.start({ ...opts, t0: R.t0 });
    }
    if (!R.shown) return; // its lock-on is still held back: the show runs from where it shows (begin())
    const now = performance.now();
    if (now > R.t0) R.t0 = now; // late: the ship starts now (the picture held at 0 meanwhile)
    arm(R);
  }

  // The old show instead, on the same layer and the same clock: its reticle seen from now, the 3D scene let go.
  function toV1(R) {
    if (cur !== R || R.v1) return;
    R.v1 = true;
    cancelAnimationFrame(R.raf);
    R.timers.forEach(clearTimeout);
    R.timers.length = 0;
    releasePrep();
    const root = layer();
    if (root) root.classList.remove('v3');
    if (R.opts) {
      clearTimeout(R.guard);
      cur = null;
      V1.start({ ...R.opts, t0: R.t0 });
    }
  }

  // The lock-on shows: the scene's layer seen and drawn from its clock, t = -LOCK now. Until start() the picture doesn't go
  // past 0 and no cue from 0 on comes.
  function begin(R) {
    const { p } = R;
    const scene = p.scene;
    const root = layer();
    if (!root || !scene) throw new Error('attack3d: no layer');
    if (p.host.parentNode !== root) root.insertBefore(p.host, root.querySelector('.as-ret')); // the layer was made again since
    p.host.style.opacity = '';
    if (p.calm) root.classList.add('still');
    R.T = scene.T;
    R.cues = cues(R);
    const loop = () => {
      if (cur !== R) return;
      const t = performance.now() - R.t0;
      if (!due(R, R.opts ? t : Math.min(t, -1))) return;
      try {
        scene.render(R.opts ? t : Math.min(t, 0));
        R.drawn = true;
      } catch {
        // the first frame failing: the old show instead; later, the clock and its cues run on
        if (!R.drawn) return void toV1(R);
      }
      R.raf = requestAnimationFrame(loop);
    };
    R.raf = requestAnimationFrame(loop);
    if (R.opts) arm(R);
  }

  // The run's cues: the sounds (SOUNDS), DANGER, the end. A sound well late (no frames for a while) starts that far in, so
  // it ends where it should; later than SOUND_LATE it's skipped.
  function cues(R) {
    const T = R.T;
    const list = SOUNDS(T)
      .filter((s) => !R.p.calm || s.calm)
      .map((s) => ({ at: s.at, late: SOUND_LATE, fn: (late) => window.Sfx && Sfx.sample && Sfx.sample(s.name, s.vol, late > 100 ? late / 1000 : 0) }));
    list.push({ at: T.HITS[2] + DANGER_AFTER, fn: () => R.opts && R.opts.onBlast && R.opts.onBlast() });
    list.push({ at: T.END, fn: () => endRun(R) });
    return list;
  }

  function due(R, t) {
    for (const c of R.cues) {
      if (c.done || t < c.at) continue;
      c.done = true;
      if (c.late && t - c.at > c.late) continue;
      try {
        c.fn(t - c.at);
      } catch {}
      if (cur !== R) return false;
    }
    return true;
  }

  // DANGER and the end on time with no frames too (rAF stops while the page can't be seen); a guard over it all. Set once
  // the clock is final (start(), or begin() when start() came first).
  function arm(R) {
    const now = performance.now();
    for (const c of R.cues) if (!c.late) R.timers.push(setTimeout(() => cur === R && due(R, performance.now() - R.t0), Math.max(0, R.t0 + c.at - now)));
    R.timers.push(setTimeout(() => cur === R && endRun(R), Math.max(0, R.t0 + R.T.END + 4000 - now)));
  }

  // Takes the run down as the old show's destroy() does: contexts and nodes freed, the layer removed, onEnd called once.
  function endRun(R, callEnd = true) {
    if (cur !== R) return;
    cur = null;
    cancelAnimationFrame(R.raf);
    clearTimeout(R.guard);
    R.timers.forEach(clearTimeout);
    releasePrep();
    V1.cancel(); // the layer (and the panel's screen with it)
    try {
      callEnd && R.opts && R.opts.onEnd && R.opts.onEnd();
    } catch {}
  }

  window.AttackScreen = api;
})();
