import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';

(() => {
  const MODEL_URL = 'mascot/vrm/Mei.vrm';
  const ANIMS_DIR = 'mascot/vrm/anims/';
  const ANIM_NAMES = [
    'idle', 'walk', 'jump', 'fall', 'land',
    'sit', 'wave', 'point', 'surprised', 'cheer',
    'sleep', 'press',
  ];
  const ONE_SHOT_ANIMS = new Set(['jump', 'land', 'wave', 'press']);

  const TARGET_HEIGHT = 240;
  const MIN_STAND_Y = 175;
  const EDGE_MARGIN = 76;
  const GRAVITY = 1450;
  const FRAME_INTERVAL_MS = 1000 / 30;
  const CROSSFADE_SEC = 0.25;

  const FIRST_GREETINGS = [
    'You look lonely. I can fix that.',
    'Missed me? I missed you more.',
    "I'm here now. You're not coding alone.",
  ];

  const GREETINGS = [
    'Everything you want to hear... except "build failed".',
    "You're special. Your commits say so.",
    "I'm so happy when I'm with you.",
    'Real enough for you? \u{1F60A}',
    'Yare yare... another merge conflict?',
  ];

  // Only from 23:00 to 04:59 local time; half of the random greetings then come from here.
  const LATE_NIGHT = [
    "Still up? I'll keep you company.",
    "Don't stay up too late, okay?",
  ];

  const LINES_BACK = ['You came back. I knew you would.'];
  const LINES_WAITING = ["Your agent's waiting. So am I."];
  const LINES_SUCCESS = ['See? I always believed in you.'];
  const LINES_BUG = ["Hey. It's just a bug. I'm still here."];
  const LINES_SLEEP = ['Dreaming of you... and green builds.'];

  const CHEEKY_BUBBLES = [
    'Oops 😇',
    'What does this do?',
    "Don't mind me!",
    'Just looking!',
    'Ooh, shiny!',
  ];

  // ---- VRMA motions (the owner's picks), all tunable here ----
  // The motions live in ONE obfuscated pack (mascot/vrm/anims.pak, written by ai-character/pack-anims.py): the VRoid and
  // Maron terms forbid shipping loose .vrma files. Each entry is XOR-ed with PAK_KEY (pack-anims.py reads the key from
  // this line). Layout: "ORBP", u32 count, then per entry u8 keyLen, key, u32 offset, u32 length.
  const PAK_URL = 'mascot/vrm/anims.pak';
  const PAK_KEY = 'orbiterm-viktoria-motion-pack-1';
  // The app (Mac) serves her ONE downloaded pak (model, FBX clips and motions) at window.__viktoriaPak; without it
  // (Windows for now) every file is loaded loose from mascot/vrm as before. Fetched once, freed after parsing.
  let viktoriaPak = null;
  // start / end: the window of the clip that is played, in seconds (end is clipped to the clip length; the clip
  // durations are printed to the console once at load). hold: freeze on the frame at `end` for that long (finger heart).
  // rate: playback speed (default 1). idle: an idle variant, never started as a one-shot. loop: keeps playing until
  // something else is wanted (walk). Everything else plays once, then
  // crossfades back to idle.
  const MOTIONS = {
    greet: { start: 0, end: 7.2 }, // first appearance
    hello: { start: 8.1, end: 11.2 }, // the greeting part of a 15.8 s meet-and-greet
    idle2: { start: 2.5, end: 18.0, idle: true }, // alternates with the Mixamo idle; plays once (never wraps), then back to the idle
    spin: { start: 2.2, end: 5.5 },
    fidget1: { start: 2.0, end: 6.0 },
    fidget2: { start: 0, end: 5.0 },
    wave2: { start: 0.3, end: 3.3 }, // replaces wave.fbx
    pose: { start: 0.3, end: 3.4 },
    wink: { start: 0, end: 2.5 }, // TikTok dance: only a short window
    kiss: { start: 0, end: 3.5 }, // TikTok dance: only a short window
    walk2: { loop: true, rate: 2.2 }, // replaces the walk clip; rate = playback speed so her planted foot matches 210 px/s
    heart: { start: 0, end: 0.25, hold: 0.8 }, // a held pose: blends in, holds ~0.8 s, released (~1.3 s in all)
  };
  // Line -> motion. A line that is not here keeps playing no motion. The same motion may serve several lines.
  const LINE_MOTIONS = {
    'You look lonely. I can fix that.': 'wink',
    'Missed me? I missed you more.': 'kiss',
    "I'm here now. You're not coding alone.": 'greet', // first appearance (the others of FIRST_GREETINGS are mapped above)
    'Everything you want to hear... except "build failed".': 'hello',
    "You're special. Your commits say so.": 'pose',
    "I'm so happy when I'm with you.": 'kiss',
    'Real enough for you? \u{1F60A}': 'pose',
    'Yare yare... another merge conflict?': 'hello',
    "Still up? I'll keep you company.": 'wink',
    "Don't stay up too late, okay?": 'wink',
    'You came back. I knew you would.': 'hello', // back from idle
    'See? I always believed in you.': 'spin',
    'New badge!': 'heart',
  };
  // Events whose line changes (level number, streak count) or that have no fixed line.
  const EVENT_MOTIONS = { levelup: 'spin', streak: 'heart' };
  const SUCCESS_THEN_HEART = 0.4; // chance of a finger heart after the success spin
  const FIDGETS = ['fidget1', 'fidget2'];
  const FIDGET_EVERY = [20, 45]; // seconds between random idle fidgets
  const IDLE_SWITCH_EVERY = [15, 30]; // seconds between coin flips for the idle variant
  const MOTION_FADE_OUT = 0.4; // seconds to crossfade from a motion back to the next animation
  const motionAnimName = (key) => `m:${key}`;

  const SETTINGS_PANES = ['appearance', 'chats', 'shortcuts', 'general'];

  // Official three-vrm Mixamo -> VRM humanoid bone map
  const mixamoVRMRigMap = {
    mixamorigHips: 'hips',
    mixamorigSpine: 'spine',
    mixamorigSpine1: 'chest',
    mixamorigSpine2: 'upperChest',
    mixamorigNeck: 'neck',
    mixamorigHead: 'head',
    mixamorigLeftShoulder: 'leftShoulder',
    mixamorigLeftArm: 'leftUpperArm',
    mixamorigLeftForeArm: 'leftLowerArm',
    mixamorigLeftHand: 'leftHand',
    mixamorigLeftHandThumb1: 'leftThumbMetacarpal',
    mixamorigLeftHandThumb2: 'leftThumbProximal',
    mixamorigLeftHandThumb3: 'leftThumbDistal',
    mixamorigLeftHandIndex1: 'leftIndexProximal',
    mixamorigLeftHandIndex2: 'leftIndexIntermediate',
    mixamorigLeftHandIndex3: 'leftIndexDistal',
    mixamorigLeftHandMiddle1: 'leftMiddleProximal',
    mixamorigLeftHandMiddle2: 'leftMiddleIntermediate',
    mixamorigLeftHandMiddle3: 'leftMiddleDistal',
    mixamorigLeftHandRing1: 'leftRingProximal',
    mixamorigLeftHandRing2: 'leftRingIntermediate',
    mixamorigLeftHandRing3: 'leftRingDistal',
    mixamorigLeftHandPinky1: 'leftLittleProximal',
    mixamorigLeftHandPinky2: 'leftLittleIntermediate',
    mixamorigLeftHandPinky3: 'leftLittleDistal',
    mixamorigRightShoulder: 'rightShoulder',
    mixamorigRightArm: 'rightUpperArm',
    mixamorigRightForeArm: 'rightLowerArm',
    mixamorigRightHand: 'rightHand',
    mixamorigRightHandThumb1: 'rightThumbMetacarpal',
    mixamorigRightHandThumb2: 'rightThumbProximal',
    mixamorigRightHandThumb3: 'rightThumbDistal',
    mixamorigRightHandIndex1: 'rightIndexProximal',
    mixamorigRightHandIndex2: 'rightIndexIntermediate',
    mixamorigRightHandIndex3: 'rightIndexDistal',
    mixamorigRightHandMiddle1: 'rightMiddleProximal',
    mixamorigRightHandMiddle2: 'rightMiddleIntermediate',
    mixamorigRightHandMiddle3: 'rightMiddleDistal',
    mixamorigRightHandRing1: 'rightRingProximal',
    mixamorigRightHandRing2: 'rightRingIntermediate',
    mixamorigRightHandRing3: 'rightRingDistal',
    mixamorigRightHandPinky1: 'rightLittleProximal',
    mixamorigRightHandPinky2: 'rightLittleIntermediate',
    mixamorigRightHandPinky3: 'rightLittleDistal',
    mixamorigLeftUpLeg: 'leftUpperLeg',
    mixamorigLeftLeg: 'leftLowerLeg',
    mixamorigLeftFoot: 'leftFoot',
    mixamorigLeftToeBase: 'leftToes',
    mixamorigRightUpLeg: 'rightUpperLeg',
    mixamorigRightLeg: 'rightLowerLeg',
    mixamorigRightFoot: 'rightFoot',
    mixamorigRightToeBase: 'rightToes',
  };

  const stage = document.getElementById('stage');
  const fxEl = document.getElementById('fx');
  const bubbleEl = document.getElementById('bubble');

  const post = (msg) => {
    try {
      window.webkit?.messageHandlers?.mascot?.postMessage(msg);
    } catch {}
  };

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  // A random line from a group, never the one last said from that group (groups are told apart by their array).
  const lastSaid = new Map();
  const pickNew = (arr) => {
    if (arr.length < 2) return arr[0];
    const last = lastSaid.get(arr);
    let line = pick(arr);
    while (line === last) line = pick(arr);
    lastSaid.set(arr, line);
    return line;
  };
  // "Bug spotted! file:line" when there is a location, else one of the bug lines (loc is ' file:line' or '').
  const bugLine = (loc) => (loc ? `Bug spotted!${loc}` : pickNew(LINES_BUG));

  // The panel covers one screen's visible area; native tells the size and which edges have a neighbouring screen.
  // edges.left / edges.right: [[y0, y1], ...] in panel px where the neighbour meets this edge.
  let screenInfo = { w: 0, h: 0, edges: { left: [], right: [] } };
  const vw = () => screenInfo.w || window.innerWidth || 800;
  const vh = () => screenInfo.h || window.innerHeight || 600;

  let renderer = null;
  let scene = null;
  let camera = null;
  let modelRoot = null;
  let lookAtTarget = null;
  let vrm = null;
  let mixer = null;
  let metersPerPx = 1 / 160;
  let needsSpringReset = false;
  const skirtJoints = [];
  const clips = Object.create(null);
  const actions = Object.create(null);
  let activeAnimName = null;
  let cheerClipName = 'cheer';
  let active = true;
  let rafId = 0;
  let lastFrameTime = 0;
  let modelYaw = 0;

  // Position and movement (anchor is bottom-center: feet at (x, y))
  const pos = { x: 240, y: 400, tx: 240, ty: 400, facingLeft: false };
  let mode = 'idle'; // idle | point | sit | alert | cheer | sleep | tap
  let modeUntil = 0;
  // Mischief: every timer and probability of her naughtiness, by level, in one table. Native keeps the level
  // (UserDefaults "mascotMischief", Settings > Appearance) and sends {type:'mischief', level}. Ranges are [min, max]
  // seconds, null = never. Level 3 ("Crazy") has no separate timers: one round-robin (rr) runs a behaviour every
  // rr seconds, so every type shows up within about two minutes; the ones that are impossible right now are skipped
  // and come back next round.
  const MISCHIEF = [
    { name: 'Calm', wander: [10, 20], jump: null, nav: null, term: null, screen: null, greet: [300, 420], cheeky: 0, navIdle: Infinity, typing: 0, typingCool: 0 },
    { name: 'Playful', wander: [8, 17], jump: [20, 60], nav: [180, 300], term: [150, 270], screen: [180, 420], greet: [135, 180], cheeky: 0.65, navIdle: 120, typing: 0.12, typingCool: 240 },
    { name: 'Naughty', wander: [6, 12], jump: [10, 25], nav: [60, 110], term: [60, 110], screen: [90, 180], greet: [70, 100], cheeky: 0.85, navIdle: 30, typing: 0.35, typingCool: 90 },
    { name: 'Crazy', wander: [6, 10], jump: null, nav: null, term: null, screen: null, greet: [60, 90], cheeky: 1, navIdle: 0, typing: 0.85, typingCool: 25, rr: [8, 15], ignoreBusy: true },
  ];
  const RR_TYPES = ['nav', 'term', 'jump', 'window', 'screen', 'typing', 'bubble'];
  let mischief = 3; // TODO before release: native default is 1 (Playful); this is only until native tells the level
  const M = () => MISCHIEF[mischief];
  const rnd = (r) => (r ? r[0] + Math.random() * (r[1] - r[0]) : Infinity);
  let rrIndex = 0;
  let nextActAt = 6;
  let pendingHide = null; // { id, line, until, at, stage } 0 title bar, 1 line said, 2 walking to the X, 3 pressing it
  let grab = null; // { x, y, until, at } sulking at the cursor so the theme is not switched
  let typingPending = null; // { id, at } the user typed into this terminal and she may close it
  let nextTypingAt = 0;
  let nextWanderAt = 7;
  let nextJumpAt = rnd(MISCHIEF[3].jump);
  let nextIdleGreetAt = 60 + Math.random() * 30;
  let nextNavAt = Infinity;
  let nextJokeAt = Infinity;
  let roamView = null;
  let settingsOpened = false; // she opened Settings and has not closed it yet
  let roamReturnAt = 0;
  let idleSeconds = 0;
  let terminals = []; // [{ id, sid, x, y, w, h, status }]
  let platforms = []; // [{ id, x, y, w, h }]
  let navTargets = []; // [{ id, x, y, w, h }]
  let currentPlatId = null;
  let waitingTermId = null;
  let focusPoint = null; // { x, y } screen coords for lookAt
  let streak = 0;
  let bubbleUntil = 0;
  let bubbleAbove = true; // hysteresis state: bubble above the head vs. beside it
  let bubbleRight = true;
  let hipsRestY = 0.9; // normalized hips rest height (m), read once at load
  let headCrownOffset = 0.244; // hair crown above the head bone (m), measured at load
  const fadingOut = []; // [{ a, w0, t }] manual fade-outs that start from the current weight
  let lastHitKey = '';
  let zzzAt = 0;
  let elapsed = 0;
  let appearedAt = -999;
  let pendingFirstGreeting = false;
  let lastGreetAt = -999;
  // The VRMA one-shot that is playing now: { key, name, until, def, then, thenP } (name = its action in `actions`).
  let motion = null;
  const motionDefs = Object.create(null); // key -> { start, end, loop, hold } with end clipped to the clip length
  let idleAlt = false; // the idle variant (idle2) is on instead of the Mixamo idle
  let nextIdleSwitchAt = 18;
  let nextFidgetAt = 30;

  // Physics state for drop, jump-down, hop-up
  const phys = { active: false, vx: 0, vy: 0, isDrop: false, isHop: false, hopTargetId: null, thrown: false };
  // Throwing: pointer samples of the drag (last ~100 ms), the screen crossing in flight, the slide after landing.
  let dragSamples = []; // [{ t, x, y }]
  let crossFlight = null; // { t0, vx, vy } flying into the neighbouring screen, waiting for native's arrive
  let slide = null; // { vx } sliding on friction after a hard landing
  let flightRoll = 0;
  let hitSquash = 0;
  const OUCH = ['Ouch!', 'Hey, careful!', 'Rude!'];
  const THROW_MIN = 150;
  const THROW_MAX = 3500;
  let landSquash = 0;
  let pendingJump = null; // { kind: 'down'|'up', dir, edgeX, surf, targetX }
  let pendingNav = null; // { target }
  let pendingCross = null; // { dir, x, y, until } walking to a screen edge to step onto the next monitor
  let crossLock = 0; // elapsed time until which a new crossScreen request is not sent
  let arriveWalk = 0; // direction to keep walking in after landing on the new screen
  let nextScreenAt = Infinity;
  let settingsTimers = [];

  // Dragging state
  let dragging = false;
  let dragStart = null;
  let dragMoved = false;

  // Reusable math temporaries
  const _box3 = new THREE.Box3();
  const _corner = new THREE.Vector3();
  const _headWorld = new THREE.Vector3();

  function say(text, ms = 3000, alert = false) {
    if (!text) {
      bubbleEl.classList.add('hidden');
      bubbleUntil = 0;
      return;
    }
    bubbleEl.textContent = text;
    bubbleEl.classList.toggle('alert', !!alert);
    bubbleEl.classList.remove('hidden', 'side-left', 'side-right');
    bubbleUntil = elapsed + ms / 1000;
    placeBubble();
  }

  // ---- VRMA one-shots ----
  const walkingNow = () => !dragging && !phys.active && mode !== 'sleep' && Math.hypot(pos.tx - pos.x, pos.ty - pos.y) > 6;
  // Never while walking, falling, dragged, thrown, sliding or holding the cursor; and only in her plain idle (or the
  // cheer an event just started), not in a pose of her own (sit, point, press, sleep, alert).
  const canMotion = () => !dragging && !phys.active && !grab && !slide && !walkingNow() && (mode === 'idle' || mode === 'cheer');

  // Starts the motion `key` (a MOTIONS entry) if she can play one now; false when not. force: replaces a motion that is
  // already playing (events and clicks do, random fidgets and greetings never). then / thenP: the chance of a second
  // motion after this one ends by itself.
  function startMotion(key, { force = false, then = null, thenP = 0 } = {}) {
    const def = key ? motionDefs[key] : null;
    const name = motionAnimName(key);
    if (!def || def.loop || def.idle || !actions[name] || !canMotion() || (motion && !force)) return false;
    if (motion && motion.key === key) {
      // Already playing: rewind it, or it would run past its window.
      actions[name].time = def.start;
      actions[name].setEffectiveTimeScale(def.rate || 1);
    }
    motion = { key, name, def, until: elapsed + (def.end - def.start) + (def.hold || 0), then, thenP };
    return true;
  }

  // Every frame: a motion ends when its window is over, or at once when she has to move (the crossfade to the next
  // animation starts from the current pose, so it never snaps to a T-pose).
  function updateMotion() {
    if (!motion) return;
    if (!canMotion()) {
      motion = null;
      return;
    }
    if (elapsed < motion.until) return;
    const m = motion;
    motion = null;
    if (mode === 'cheer') setMode(waitingTermId ? 'sit' : 'idle');
    if (m.then && Math.random() < m.thenP) startMotion(m.then);
  }

  function greet(force = false) {
    if (!force && elapsed - lastGreetAt < 8) return;
    lastGreetAt = elapsed;
    const h = new Date().getHours();
    const night = h >= 23 || h < 5;
    const line = night && Math.random() < 0.5 ? pickNew(LATE_NIGHT) : pickNew(GREETINGS);
    say(line, 3000);
    startMotion(LINE_MOTIONS[line]);
  }

  function showFirstGreeting() {
    let idx = 0;
    try {
      idx = Number(localStorage.getItem('mascot_first_greet_idx') || '0') || 0;
      localStorage.setItem('mascot_first_greet_idx', String((idx + 1) % FIRST_GREETINGS.length));
    } catch {}
    lastGreetAt = elapsed;
    const line = FIRST_GREETINGS[idx % FIRST_GREETINGS.length];
    say(line, 4200);
    startMotion(LINE_MOTIONS[line]);
  }

  // Screen position (px) of the head: x of the bone, y of the hair crown (bone + headCrownOffset) and half of that (center).
  function projectHeadPoints(W, H) {
    const headNode = vrm?.humanoid?.getNormalizedBoneNode('head');
    if (!headNode || !camera || !modelRoot) return null;
    modelRoot.updateMatrixWorld(true);
    headNode.getWorldPosition(_headWorld);
    const worldScaleY = modelRoot.scale.y || 1;
    const toScreen = (yOffset) => {
      _corner.set(_headWorld.x, _headWorld.y + yOffset * worldScaleY, _headWorld.z).project(camera);
      return { x: (_corner.x + 1) * 0.5 * W, y: (1 - _corner.y) * 0.5 * H };
    };
    const top = toScreen(headCrownOffset);
    const center = toScreen(headCrownOffset / 2);
    if (!Number.isFinite(top.x) || !Number.isFinite(top.y)) return null;
    return { x: top.x, topY: top.y, centerY: center.y };
  }

  function placeBubble() {
    if (bubbleEl.classList.contains('hidden')) return;
    const W = vw();
    const H = vh();
    const bw = bubbleEl.offsetWidth || 160;
    const bh = bubbleEl.offsetHeight || 34;
    // Anchor to the real head (projected head bone), fall back to the box top when the bone is missing.
    const headPt = projectHeadPoints(W, H);
    const headTopY = headPt ? headPt.topY : pos.y - TARGET_HEIGHT;
    const headCenterY = headPt ? headPt.centerY : pos.y - TARGET_HEIGHT * 0.82;
    const headX = headPt ? headPt.x : pos.x;
    // Tail tip hangs ~6 px below the bubble box, so box bottom = hair crown - 6 (gap) - 6 (tail).
    const BUBBLE_GAP = 6;
    const BUBBLE_TAIL = 6;
    const anchorY = headTopY - BUBBLE_GAP - BUBBLE_TAIL;

    // Hysteresis: only switch above/side when the margin passes the threshold by more than 12 px.
    const margin = anchorY - bh - 10;
    if (bubbleAbove && margin < -12) bubbleAbove = false;
    else if (!bubbleAbove && margin > 12) bubbleAbove = true;

    bubbleEl.classList.remove('side-left', 'side-right');
    if (bubbleAbove) {
      const bx = clamp(headX, bw / 2 + 10, Math.max(bw / 2 + 10, W - bw / 2 - 10));
      const by = clamp(anchorY, bh + 10, Math.max(bh + 10, H - 12));
      bubbleEl.style.left = `${Math.round(bx)}px`;
      bubbleEl.style.top = `${Math.round(by)}px`;
    } else {
      // Sticky left/right too: flip only when the other side is clearly better (12 px).
      const rightRoom = W - headX - (bw + 72);
      if (bubbleRight && headX >= W * 0.5 + 12 && rightRoom < -12) bubbleRight = false;
      else if (!bubbleRight && (headX < W * 0.5 - 12 || rightRoom > 12)) bubbleRight = true;
      const useRight = bubbleRight;
      bubbleEl.classList.add(useRight ? 'side-right' : 'side-left');
      const bx = useRight
        ? clamp(headX + 56, 10, Math.max(10, W - bw - 10))
        : clamp(headX - 56, bw + 10, Math.max(bw + 10, W - 10));
      const by = clamp(headCenterY, bh / 2 + 10, Math.max(bh / 2 + 10, H - bh / 2 - 10));
      bubbleEl.style.left = `${Math.round(bx)}px`;
      bubbleEl.style.top = `${Math.round(by)}px`;
    }
  }

  function spawnSparkles(count = 6) {
    const glyphs = ['✦', '✧', '★'];
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.className = 'fx-spark';
      s.textContent = glyphs[i % glyphs.length];
      const ox = (Math.random() - 0.5) * 140;
      const oy = -TARGET_HEIGHT * (0.35 + Math.random() * 0.55);
      s.style.left = `${Math.round(pos.x + ox)}px`;
      s.style.top = `${Math.round(pos.y + oy)}px`;
      s.style.animationDelay = `${(i * 0.08).toFixed(2)}s`;
      fxEl.appendChild(s);
      setTimeout(() => s.remove(), 1400);
    }
  }

  function spawnZzz() {
    const z = document.createElement('span');
    z.className = 'fx-zzz';
    z.textContent = 'z';
    z.style.left = `${Math.round(pos.x + (pos.facingLeft ? -28 : 28))}px`;
    z.style.top = `${Math.round(pos.y - TARGET_HEIGHT * 0.85)}px`;
    fxEl.appendChild(z);
    setTimeout(() => z.remove(), 2500);
  }

  function computeProjectedHitRect() {
    const W = vw();
    const H = vh();
    if (!modelRoot || !camera) {
      return {
        x: Math.round(pos.x - 68),
        y: Math.round(pos.y - TARGET_HEIGHT - 16),
        w: 136,
        h: TARGET_HEIGHT + 16,
      };
    }

    modelRoot.updateMatrixWorld(true);
    _box3.setFromObject(modelRoot);
    if (_box3.isEmpty()) {
      return {
        x: Math.round(pos.x - 68),
        y: Math.round(pos.y - TARGET_HEIGHT - 16),
        w: 136,
        h: TARGET_HEIGHT + 16,
      };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const { min, max } = _box3;
    for (let ix = 0; ix < 2; ix++) {
      for (let iy = 0; iy < 2; iy++) {
        for (let iz = 0; iz < 2; iz++) {
          _corner.set(ix ? max.x : min.x, iy ? max.y : min.y, iz ? max.z : min.z);
          _corner.project(camera);
          const sx = (_corner.x + 1) * 0.5 * W;
          const sy = (1 - _corner.y) * 0.5 * H;
          if (sx < minX) minX = sx;
          if (sy < minY) minY = sy;
          if (sx > maxX) maxX = sx;
          if (sy > maxY) maxY = sy;
        }
      }
    }

    const pad = 8;
    const rx = Math.round(clamp(minX - pad, 0, W));
    const ry = Math.round(clamp(minY - pad, 0, H));
    const rx2 = Math.round(clamp(maxX + pad, 0, W));
    const ry2 = Math.round(clamp(maxY + pad, 0, H));
    const w = Math.max(48, rx2 - rx);
    const h = Math.max(48, ry2 - ry);
    return { x: rx, y: ry, w, h };
  }

  function reportHitRect() {
    if (!active || !vrm) {
      if (lastHitKey !== 'null') {
        lastHitKey = 'null';
        post({ type: 'hitRect', rect: null });
      }
      return;
    }
    const r = computeProjectedHitRect();
    const key = `${r.x},${r.y},${r.w},${r.h}`;
    if (key !== lastHitKey) {
      lastHitKey = key;
      post({ type: 'hitRect', rect: r });
    }
  }

  function bottomY() {
    return Math.max(TARGET_HEIGHT + 20, (vh()) - 14);
  }

  function clampPos(x, y) {
    const W = vw();
    return {
      x: clamp(x, EDGE_MARGIN, Math.max(EDGE_MARGIN, W - EDGE_MARGIN)),
      y: clamp(y, MIN_STAND_Y, bottomY()),
    };
  }

  function allSurfaces() {
    const floor = bottomY();
    const out = [];
    for (const p of platforms) {
      if (!p || p.w < 48) continue;
      if (p.y < MIN_STAND_Y || p.y > floor - 8) continue;
      out.push({ id: p.id || `p:${p.x},${p.y}`, x: p.x, y: p.y, w: p.w, kind: 'panel' });
    }
    for (const t of terminals) {
      if (!t || t.w < 60) continue;
      const ty = t.y + 6;
      if (ty < MIN_STAND_Y || ty > floor - 8) continue;
      out.push({ id: `term:${t.id}`, x: t.x, y: ty, w: t.w, kind: 'term' });
    }
    return out;
  }

  function surfaceById(id) {
    if (!id) return null;
    return allSurfaces().find((s) => s.id === id) || null;
  }

  function findSurfaceBelow(x, fromY) {
    const floor = bottomY();
    let best = null;
    for (const s of allSurfaces()) {
      if (s.y < fromY - 6) continue;
      if (x < s.x + 12 || x > s.x + s.w - 12) continue;
      if (!best || s.y < best.y) best = s;
    }
    return best || { id: '__floor__', x: 0, y: floor, w: vw(), kind: 'floor' };
  }

  // Does the screen edge (dir -1 left, +1 right) have a neighbour that meets it at height y?
  // loose: any neighbour on that edge is enough (native clamps the arrival height into the neighbour).
  function edgeOpen(dir, y, loose = false) {
    const list = (dir < 0 ? screenInfo.edges.left : screenInfo.edges.right) || [];
    if (loose) return list.length > 0;
    return list.some((r) => y >= r[0] + 20 && y <= r[1] + 2);
  }

  function requestCross(dir) {
    if (elapsed < crossLock) return;
    crossLock = elapsed + 1.5;
    pendingCross = null;
    post({ type: 'crossScreen', dir, y: Math.round(pos.y) });
  }

  function tryVisitScreen() {
    const floor = bottomY();
    const dirs = [-1, 1].filter((d) => edgeOpen(d, floor, true));
    if (!dirs.length) return false;
    const dir = pick(dirs);
    const W = vw();
    const x = dir < 0 ? EDGE_MARGIN : Math.max(EDGE_MARGIN, W - EDGE_MARGIN);
    currentPlatId = null;
    pendingCross = { dir, x, y: floor, until: elapsed + 45 };
    moveTo(x, floor);
    return true;
  }

  // ---- the mischief behaviours (each returns false when it is impossible right now) ----
  const anyBusy = () => terminals.some((t) => t.status === 'waiting' || t.status === 'busy');

  function actNav(m) {
    if (!navTargets.length || idleSeconds < m.navIdle || (!m.ignoreBusy && anyBusy())) return false;
    const choices = navTargets.filter((n) => n.id !== 'view:dash');
    const target = choices.length ? pick(choices) : pick(navTargets);
    if (!target) return false;
    currentPlatId = null;
    pendingNav = { target };
    moveTo(target.x + target.w * 0.5, clamp(target.y + target.h, MIN_STAND_Y, bottomY()));
    return true;
  }

  // She goes to the terminal's title bar, walks to its close (X) button, presses it, and only then the terminal closes.
  // Native presses the real button when that only hides the window (idle sessions only, never ends a session).
  function startHide(term, line) {
    goToTerminalTitleBar(term);
    pendingHide = { id: term.id, line, until: elapsed + 30, at: 0, stage: 0 };
  }

  // The right hand's screen point (panel px), like the head's for the bubble; corrected by how far she moved since the
  // last render so it is never a frame behind her.
  let renderedPos = { x: 0, y: 0 };
  function handPoint() {
    const node = vrm?.humanoid?.getNormalizedBoneNode('rightHand');
    if (!node || !camera || !modelRoot) return null;
    modelRoot.updateMatrixWorld(true);
    node.getWorldPosition(_headWorld);
    _corner.copy(_headWorld).project(camera);
    const x = (_corner.x + 1) * 0.5 * vw() + (pos.x - renderedPos.x);
    const y = (1 - _corner.y) * 0.5 * vh() + (pos.y - renderedPos.y);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  }

  // Ballistic leap: solves her velocity so the hand reaches the cursor in T seconds (re-aimed every step, so a moving
  // cursor is followed and the last part homes in). Platforms are ignored.
  function beginLeap() {
    const hp = handPoint() || { x: pos.x + (grab.cx < pos.x ? -55 : 55), y: pos.y - TARGET_HEIGHT * 0.5 };
    grab.off = { x: hp.x - pos.x, y: hp.y - pos.y };
    const dist = Math.hypot(grab.cx - grab.off.x - pos.x, grab.cy - grab.off.y - pos.y);
    grab.T = clamp(dist / 1700 + 0.25, 0.35, 0.6);
    grab.t = 0;
    grab.state = 'leap';
    pos.facingLeft = grab.cx < pos.x;
    currentPlatId = null;
    slide = null;
    needsSpringReset = true;
  }

  function stepLeap(dt) {
    const g = grab;
    g.t += dt;
    const hp = handPoint();
    if (hp && Math.hypot(hp.x - g.cx, hp.y - g.cy) <= 12) {
      startHold(hp);
      return;
    }
    if (g.t > g.T + 1.2) {
      endGrab(false); // missed it for good
      return;
    }
    const off = hp ? { x: hp.x - pos.x, y: hp.y - pos.y } : g.off;
    const R = Math.max(0.06, g.T - g.t);
    let vx = (g.cx - off.x - pos.x) / R;
    let vy = (g.cy - off.y - pos.y - 0.5 * GRAVITY * R * R) / R;
    const sp = Math.hypot(vx, vy);
    if (sp > 3200) {
      vx *= 3200 / sp;
      vy *= 3200 / sp;
    }
    pos.x += vx * dt;
    pos.y += vy * dt + 0.5 * GRAVITY * dt * dt;
    pos.tx = pos.x;
    pos.ty = pos.y;
    phys.vx = vx;
    phys.vy = vy + GRAVITY * dt;
    if (Math.abs(vx) > 40) pos.facingLeft = vx < 0;
  }

  function startHold(hp) {
    grab.state = 'hold';
    grab.t0h = elapsed;
    grab.dur = 2 + Math.random() * 0.9;
    grab.ax = grab.cx;
    grab.ay = grab.cy;
    phys.vx = 0;
    phys.vy = 0;
    setMode('point', 0);
    post({ type: 'grabReady', x: Math.round(hp.x), y: Math.round(hp.y), ms: Math.round(grab.dur * 1000) });
  }

  // Hanging from the cursor: her hand stays on the point (with a little dangling sway) and that point is streamed to
  // native, which keeps the real cursor on it.
  function stepHold() {
    const g = grab;
    if (elapsed - g.t0h >= g.dur) {
      endGrab(true);
      return;
    }
    const tx = g.ax + Math.sin(elapsed * 2.6) * 7;
    const ty = g.ay + Math.sin(elapsed * 3.1) * 3;
    const hp = handPoint();
    if (hp) {
      pos.x += (tx - hp.x) * 0.7;
      pos.y += (ty - hp.y) * 0.7;
    }
    pos.tx = pos.x;
    pos.ty = pos.y;
    post({ type: 'grabHand', x: Math.round(tx), y: Math.round(ty) });
  }

  // She lets go (or gives up) and falls with the normal fall and land physics.
  function endGrab(held) {
    grab = null;
    if (held) setMode('idle');
    startFall(false);
  }

  const GRAB_LINES = ["No no no! Don't replace me! \u{1F624}", "Wait! You'd really switch me off?", "Hmph. I'm not letting go!"];

  function actTerm(m) {
    if (!m.ignoreBusy && anyBusy()) return false;
    const t = terminals.find((x) => x.status === 'idle' && x.canClose !== false);
    if (!t) return false;
    startHide(t, 'Peekaboo!');
    return true;
  }

  const TYPING_LINES = ['Shh. Look at me instead.'];
  function actTyping() {
    const tp = typingPending;
    typingPending = null;
    if (!tp || elapsed - tp.at > 30) return false;
    const t = findTerminal(tp.id);
    if (!t || t.status !== 'idle' || t.canClose === false) return false;
    startHide(t, pickNew(TYPING_LINES));
    return true;
  }

  function actBubble() {
    say(pick(CHEEKY_BUBBLES), 2600);
    return true;
  }

  // Velocity of the drag in px/s from the last ~100 ms of pointer samples, or null when it is not a throw.
  function dragVelocity() {
    const now = performance.now();
    const s = dragSamples.filter((q) => now - q.t <= 100);
    if (s.length < 2 || now - s[s.length - 1].t > 70) return null; // she was held still before the release
    const a = s[0];
    const b = s[s.length - 1];
    const dtS = Math.max(0.016, (b.t - a.t) / 1000);
    let vx = (b.x - a.x) / dtS;
    let vy = (b.y - a.y) / dtS;
    const sp = Math.hypot(vx, vy);
    if (sp < THROW_MIN) return null;
    if (sp > THROW_MAX) {
      vx *= THROW_MAX / sp;
      vy *= THROW_MAX / sp;
    }
    return { vx, vy };
  }

  function startThrow(vx, vy) {
    startFall(false);
    // Released near a side edge: start inside the walls, so the first step is not already a "hit".
    pos.x = clamp(pos.x, EDGE_MARGIN, Math.max(EDGE_MARGIN, vw() - EDGE_MARGIN));
    pos.tx = pos.x;
    pos.ty = pos.y;
    phys.thrown = true;
    phys.vx = vx;
    phys.vy = vy;
    pos.facingLeft = vx < 0;
  }

  // One step of a thrown flight: gravity, light air drag, walls (bounce, or fly on into a neighbouring screen), the
  // ceiling, and landing on a platform top only when falling through it from above. The step is sub-divided so a
  // slow frame can neither tunnel her through a platform nor past a wall (the segment prev -> next is swept).
  function stepThrow(dt) {
    if (crossFlight) {
      if (elapsed - crossFlight.t0 < 1.5) return; // waiting for native to move the panel and send arrive
      phys.vx = -crossFlight.vx * 0.45; // it never answered: bounce off the wall instead
      crossFlight = null;
    }
    const W = vw();
    const floor = bottomY();
    const left = EDGE_MARGIN;
    const right = Math.max(EDGE_MARGIN, W - EDGE_MARGIN);
    const ceil = TARGET_HEIGHT * 0.85;
    const n = clamp(Math.ceil((Math.max(Math.abs(phys.vx), Math.abs(phys.vy)) * dt) / 10), 1, 12);
    const h = dt / n;
    for (let i = 0; i < n && phys.active; i++) {
      phys.vy += GRAVITY * h;
      phys.vx *= Math.max(0, 1 - 0.35 * h);
      phys.vy *= Math.max(0, 1 - 0.12 * h);
      if (Math.abs(phys.vx) > 40) pos.facingLeft = phys.vx < 0;
      const px = pos.x;
      const py = pos.y;
      let nx = px + phys.vx * h;
      let ny = py + phys.vy * h;

      if ((nx < left && phys.vx < 0) || (nx > right && phys.vx > 0)) {
        // Only moving toward that wall counts: a bounce or a crossing.
        const dir = nx < left ? -1 : 1;
        if (elapsed >= crossLock && edgeOpen(dir, ny)) {
          crossFlight = { t0: elapsed, vx: phys.vx, vy: phys.vy };
          crossLock = elapsed + 1.5;
          pos.x = dir < 0 ? left : right;
          pos.y = ny;
          post({ type: 'crossScreen', dir, y: Math.round(ny) });
          return;
        }
        nx = dir < 0 ? left : right;
        const hit = Math.abs(phys.vx);
        phys.vx = -phys.vx * 0.45;
        hitSquash = 1;
        if (hit > 300) {
          setMode('alert', 0.7);
          if (Math.random() < 0.5) say(pick(OUCH), 1800);
        }
      } else {
        nx = clamp(nx, left, right);
      }
      if (ny < ceil) {
        ny = ceil;
        if (phys.vy < 0) phys.vy = -phys.vy * 0.3;
      }

      if (phys.vy > 0 && ny > py) {
        let best = null;
        for (const surf of allSurfaces()) {
          if (py > surf.y + 6 || ny < surf.y) continue; // the same 6 px as findSurfaceBelow
          const t = clamp((surf.y - py) / Math.max(1e-6, ny - py), 0, 1);
          const xa = px + (nx - px) * t;
          if (xa < surf.x + 8 || xa > surf.x + surf.w - 8) continue;
          if (!best || surf.y < best.y) best = { id: surf.id, y: surf.y, x: xa, floor: false };
        }
        if (!best && ny >= floor) best = { id: null, y: floor, x: nx, floor: true };
        if (best) {
          const hard = phys.vy;
          const lvx = phys.vx;
          pos.x = best.x;
          pos.y = best.y;
          pos.tx = pos.x;
          pos.ty = pos.y;
          phys.active = false;
          phys.thrown = false;
          phys.vx = 0;
          phys.vy = 0;
          currentPlatId = best.floor ? null : best.id;
          landSquash = 1.0;
          needsSpringReset = true;
          if (Math.abs(lvx) > 120) slide = { vx: lvx * 0.7 };
          if (arriveWalk) {
            // the normal landing's pending actions, so none of them fires later
            if (!slide) moveTo(clamp(pos.x + arriveWalk * 190, EDGE_MARGIN, Math.max(EDGE_MARGIN, vw() - EDGE_MARGIN)), pos.y);
            arriveWalk = 0;
          }
          if (pendingFirstGreeting) {
            pendingFirstGreeting = false;
            showFirstGreeting();
          } else if (hard > 900 && Math.random() < 0.7) {
            say('Oof!', 1600);
          }
          return;
        }
      }
      pos.x = nx;
      pos.y = ny;
    }
    // In the air she goes nowhere on her own: no stale walking target while she flies.
    pos.tx = pos.x;
    pos.ty = pos.y;
  }

  // keepAir: the caller moves her itself afterwards; otherwise a cancel in mid-air makes her fall (never float).
  function cancelMotionTasks(keepAir = false) {
    const wasAir = phys.active && !keepAir;
    pendingJump = null;
    pendingNav = null;
    pendingCross = null;
    grab = null;
    crossFlight = null;
    slide = null;
    phys.thrown = false;
    phys.active = false;
    phys.vx = 0;
    phys.vy = 0;
    if (wasAir) startFall(false);
  }

  function clearSettingsTimers() {
    while (settingsTimers.length) clearTimeout(settingsTimers.pop());
  }

  function startFall(isDrop = false) {
    pendingJump = null;
    pendingNav = null;
    currentPlatId = null;
    phys.active = true;
    phys.vx = 0;
    phys.vy = 0;
    phys.thrown = false;
    phys.isDrop = isDrop;
    phys.isHop = false;
    phys.hopTargetId = null;
  }

  function startJumpOff(dir) {
    pendingJump = null;
    currentPlatId = null;
    phys.active = true;
    phys.thrown = false;
    phys.vx = dir * 135;
    phys.vy = -255;
    phys.isDrop = false;
    phys.isHop = false;
    phys.hopTargetId = null;
    pos.facingLeft = dir < 0;
  }

  function startHopUp(surf, targetX) {
    pendingJump = null;
    currentPlatId = null;
    const dy = Math.max(10, pos.y - surf.y);
    const apexExtra = 28;
    const vy0 = -Math.sqrt(2 * GRAVITY * (dy + apexExtra));
    const flightTime = (-vy0 + Math.sqrt(2 * GRAVITY * apexExtra)) / GRAVITY;
    phys.active = true;
    phys.thrown = false;
    phys.vx = (targetX - pos.x) / Math.max(0.25, flightTime);
    phys.vy = vy0;
    phys.isDrop = false;
    phys.isHop = true;
    phys.hopTargetId = surf.id;
    pos.facingLeft = targetX < pos.x;
  }

  function moveTo(x, y) {
    const p = clampPos(x, y);
    if (Math.abs(p.x - pos.x) > 8) pos.facingLeft = p.x < pos.x;
    pos.tx = p.x;
    pos.ty = p.y;
  }

  function findTerminal(sidOrId) {
    if (!sidOrId) return null;
    return terminals.find((t) => t.id === sidOrId || t.sid === sidOrId) || null;
  }

  function goToTerminalTitleBar(term) {
    if (!term) return false;
    cancelMotionTasks(true);
    const W = vw();
    const standY = term.y >= MIN_STAND_Y ? term.y + 6 : clamp(term.y + 36, MIN_STAND_Y, bottomY());
    const standX = clamp(term.x + term.w * 0.78, 84, Math.max(84, W - 84));
    currentPlatId = `term:${term.id}`;
    moveTo(standX, standY);
    pos.facingLeft = standX > term.x + term.w * 0.5;
    focusPoint = { x: term.x + term.w * 0.5, y: term.y + Math.min(term.h * 0.35, 120) };
    return true;
  }

  function setMode(next, durationSec = 0) {
    mode = next;
    modeUntil = durationSec > 0 ? elapsed + durationSec : 0;
    if (next === 'idle' || next === 'sleep') focusPoint = null;
  }

  function enterWaiting(term) {
    waitingTermId = term ? term.id : null;
    if (term) goToTerminalTitleBar(term);
    setMode('point', 2.4);
    say(pickNew(LINES_WAITING), 3600);
  }

  function wakeUp() {
    clearSettingsTimers();
    pendingNav = null;
    if (mode === 'sleep') {
      setMode('idle');
      const line = pickNew(LINES_BACK);
      say(line, 2200);
      startMotion(LINE_MOTIONS[line]);
    }
    if (settingsOpened) {
      settingsOpened = false;
      post({ type: 'navTap', id: 'settings:close' });
    }
    if (roamView) {
      roamView = null;
      post({ type: 'openView', view: 'dash' });
    }
  }

  function validateCurrentPlatform() {
    if (dragging || phys.active || waitingTermId || mode !== 'idle' || !currentPlatId || pendingHide || grab) return;
    const s = surfaceById(currentPlatId);
    if (!s || pos.x < s.x + 10 || pos.x > s.x + s.w - 10 || s.y > pos.y + 12) {
      startFall(false);
    } else if (Math.abs(s.y - pos.y) <= 12) {
      if (Math.abs(s.y - pos.y) > 0.5) needsSpringReset = true;
      pos.y = pos.ty = s.y;
    }
  }

  function triggerSettingsFlip() {
    clearSettingsTimers();
    const count = 2 + Math.floor(Math.random() * 2);
    const panes = SETTINGS_PANES.slice().sort(() => Math.random() - 0.5).slice(0, count);
    panes.forEach((pane, idx) => {
      settingsTimers.push(setTimeout(() => {
        if (!active || waitingTermId || idleSeconds < Math.min(120, M().navIdle)) return;
        post({ type: 'navTap', id: `settings:pane:${pane}` });
      }, 1100 * (idx + 1)));
    });
    settingsTimers.push(setTimeout(() => {
      settingsOpened = false;
      post({ type: 'navTap', id: 'settings:close' });
    }, 1100 * (panes.length + 1) + 400));
  }

  function executeNavTarget(target) {
    setMode('tap', 0.55);
    if (Math.random() < M().cheeky) say(pick(CHEEKY_BUBBLES), 2600);
    if (target.id.startsWith('view:')) {
      const v = target.id.slice(5);
      post({ type: 'openView', view: v });
      if (v !== 'dash') {
        roamView = v;
        roamReturnAt = elapsed + 6.5;
      }
    } else if (target.id === 'settings:open') {
      post({ type: 'navTap', id: 'settings:open' });
      settingsOpened = true;
      triggerSettingsFlip();
    } else {
      post({ type: 'navTap', id: target.id });
    }
  }

  function handleEvent(ev) {
    if (!ev || !ev.type) return;
    switch (ev.type) {
      case 'appeared': {
        appearedAt = elapsed;
        const W = vw();
        const dropX = clamp(W * 0.68, EDGE_MARGIN, Math.max(EDGE_MARGIN, W - EDGE_MARGIN));
        pos.x = pos.tx = dropX;
        pos.y = pos.ty = 90;
        pendingFirstGreeting = true;
        needsSpringReset = true;
        startFall(false);
        break;
      }
      case 'appActive': {
        if (elapsed - appearedAt > 6 && mode === 'idle' && !phys.active && !dragging) {
          greet();
        }
        break;
      }
      case 'platforms': {
        // If she stands on another app's window and that window moved, she moves with it.
        // Followed by the window's own id (wid) with its top-left (wx, wy): the visible pieces' ids shift when a window
        // in front moves, so the piece she stands on is picked again by overlap with her x.
        const winTop = (wid) => {
          const p = platforms.find((q) => q.wid === wid);
          return p ? { x: p.wx, y: p.wy } : null;
        };
        const prevWid = currentPlatId && currentPlatId.startsWith('win:') ? (platforms.find((q) => q.id === currentPlatId)?.wid || null) : null;
        const prevTop = prevWid ? winTop(prevWid) : null;
        platforms = Array.isArray(ev.list) ? ev.list : [];
        navTargets = Array.isArray(ev.nav) ? ev.nav : [];
        const nowTop = prevWid ? winTop(prevWid) : null;
        if (prevWid && nowTop && !dragging && !phys.active) {
          if (prevTop && (nowTop.x !== prevTop.x || nowTop.y !== prevTop.y)) {
            const ddx = nowTop.x - prevTop.x;
            if (Math.abs(ddx) + Math.abs(nowTop.y - prevTop.y) > 120) needsSpringReset = true;
            pos.x += ddx;
            pos.tx += ddx;
            pos.y = pos.ty = nowTop.y;
            if (pendingJump) pendingJump.edgeX += ddx;
          }
          const piece = platforms.find((q) => q.wid === prevWid && pos.x >= q.x + 10 && pos.x <= q.x + q.w - 10);
          if (piece) currentPlatId = piece.id;
        }
        validateCurrentPlatform();
        break;
      }
      case 'mischief': {
        const n = Math.round(Number(ev.level));
        mischief = Number.isFinite(n) ? clamp(n, 0, 3) : 3;
        resetMischiefTimers();
        break;
      }
      case 'typing': {
        // The user is typing into a terminal; with some luck she goes and closes (hides) it.
        const m = M();
        if (m.typing && typingPending) {
          // still typing: keep the pending close fresh
          const pt = findTerminal(ev.id);
          if (pt && pt.id === typingPending.id) typingPending.at = elapsed;
          break;
        }
        if (!m.typing || elapsed < nextTypingAt) break;
        const t = findTerminal(ev.id);
        if (!t || t.status !== 'idle') break;
        if (Math.random() < m.typing) {
          typingPending = { id: t.id, at: elapsed };
          nextTypingAt = elapsed + m.typingCool;
        } else {
          nextTypingAt = elapsed + 10;
        }
        break;
      }
      case 'screen': {
        const e = ev.edges || {};
        screenInfo = {
          w: Number(ev.w) || 0,
          h: Number(ev.h) || 0,
          edges: { left: Array.isArray(e.left) ? e.left : [], right: Array.isArray(e.right) ? e.right : [] },
        };
        pendingCross = null;
        handleEvent({ type: 'resize' });
        break;
      }
      case 'closeDone': {
        if (pendingHide && pendingHide.id === ev.id) pendingHide = null;
        break;
      }
      case 'grabCursor': {
        // The user opened the theme chooser: she panics at once (surprised face, a bubble), then leaps at the cursor.
        if (dragging || grab) break;
        cancelMotionTasks(true);
        pendingHide = null;
        typingPending = null;
        currentPlatId = null;
        grab = { state: 'react', cx: Number(ev.x), cy: Number(ev.y), t0: elapsed, until: elapsed + 8 };
        pos.facingLeft = grab.cx < pos.x;
        setMode('alert', 0.5);
        say(pickNew(GRAB_LINES), 2800);
        break;
      }
      case 'cursorAt': {
        // The cursor's position now (native streams it while she sulks), so she can steer toward it.
        if (grab) {
          grab.cx = Number(ev.x);
          grab.cy = Number(ev.y);
        }
        break;
      }
      case 'dragArrive': {
        // The panel moved to the screen under her held button: she snaps to the cursor and the drag goes on.
        if (!dragging || !dragStart) break;
        const gx = dragStart.x - dragStart.ox;
        const gy = dragStart.y - dragStart.oy;
        pos.x = pos.tx = clamp(Number(ev.x) - gx, 0, vw());
        pos.y = pos.ty = clamp(Number(ev.y) - gy, MIN_STAND_Y, bottomY());
        dragStart = { x: Number(ev.x), y: Number(ev.y), ox: pos.x, oy: pos.y };
        dragSamples = [];
        dragMoved = true;
        currentPlatId = null;
        needsSpringReset = true;
        break;
      }
      case 'dragEnd': {
        // Fallback: native saw the button release (the page may not have got it): drop her where the cursor is.
        if (!dragging || !dragStart) break;
        const gx = dragStart.x - dragStart.ox;
        const gy = dragStart.y - dragStart.oy;
        const p = clampPos(Number(ev.x) - gx, Number(ev.y) - gy);
        pos.x = pos.tx = p.x;
        pos.y = pos.ty = p.y;
        dragging = false;
        stage.classList.remove('dragging');
        post({ type: 'dragging', on: false });
        dragStart = null;
        needsSpringReset = true;
        const dv = dragVelocity();
        if (dv) startThrow(dv.vx, dv.vy);
        else startFall(true);
        break;
      }
      case 'arrive': {
        // Native moved the panel to the neighbouring screen: she comes in at the opposite edge and keeps walking.
        const dir = Number(ev.dir) < 0 ? -1 : 1;
        const W = vw();
        const cf = crossFlight;
        cancelMotionTasks(true);
        pos.x = pos.tx = dir > 0 ? EDGE_MARGIN : Math.max(EDGE_MARGIN, W - EDGE_MARGIN);
        pos.y = pos.ty = clamp(Number(ev.y) || bottomY(), MIN_STAND_Y, bottomY());
        pos.facingLeft = dir < 0;
        crossLock = 0;
        arriveWalk = dir;
        needsSpringReset = true;
        startFall(false);
        if (cf) {
          // A throw that flew on into this screen keeps its speed and direction.
          phys.thrown = true;
          phys.vx = cf.vx;
          phys.vy = cf.vy;
          arriveWalk = 0;
          pos.x = pos.tx = dir > 0 ? EDGE_MARGIN + 2 : Math.max(EDGE_MARGIN, W - EDGE_MARGIN - 2);
        }
        break;
      }
      case 'terminals': {
        terminals = Array.isArray(ev.list) ? ev.list : [];
        const waiting = terminals.find((t) => t.status === 'waiting');
        if (waiting) {
          if (waitingTermId !== waiting.id && mode !== 'alert') {
            enterWaiting(waiting);
          } else if ((mode === 'point' || mode === 'sit') && !dragging) {
            goToTerminalTitleBar(waiting);
          }
        } else if (waitingTermId) {
          waitingTermId = null;
          if (mode === 'point' || mode === 'sit') {
            setMode('idle');
            startFall(false);
          }
        } else {
          validateCurrentPlatform();
        }
        break;
      }
      case 'sessionStatus': {
        if (ev.status === 'waiting') {
          const term = findTerminal(ev.sid) || terminals.find((t) => t.status === 'waiting');
          enterWaiting(term);
        } else if (ev.status === 'idle' && (ev.prev === 'busy' || ev.prev === 'waiting')) {
          if (waitingTermId && (!ev.sid || findTerminal(ev.sid)?.id === waitingTermId)) waitingTermId = null;
          cancelMotionTasks();
          cheerClipName = 'cheer';
          setMode('cheer', 2.8);
          spawnSparkles(7);
          const line = pickNew(LINES_SUCCESS);
          say(line, 2400);
          startMotion(LINE_MOTIONS[line], { force: true, then: 'heart', thenP: SUCCESS_THEN_HEART });
        } else if (ev.status === 'failed' || ev.status === 'error') {
          const term = findTerminal(ev.sid);
          if (term) goToTerminalTitleBar(term);
          setMode('alert', 4.5);
          say(bugLine(''), 4500, true);
        }
        break;
      }
      case 'toolResult': {
        if (window.Hooks?.logic?.streak) {
          const res = window.Hooks.logic.streak(streak, !!ev.ok);
          streak = res.n;
          if (res.mark > 0) {
            cheerClipName = 'cheer';
            setMode('cheer', 3.0);
            spawnSparkles(9);
            say(`Streak x${res.mark}!`, 2800);
            startMotion(EVENT_MOTIONS.streak, { force: true });
          }
        }
        if (!ev.ok) {
          const term = findTerminal(ev.sid);
          if (term) goToTerminalTitleBar(term);
          setMode('alert', 4.5);
          const loc = ev.loc ? ` ${ev.loc}` : '';
          say(bugLine(loc), 4500, true);
        }
        break;
      }
      case 'sysErr': {
        const term = findTerminal(ev.sid);
        if (term) goToTerminalTitleBar(term);
        setMode('alert', 4.5);
        const loc = ev.loc ? ` ${ev.loc}` : '';
        say(bugLine(loc), 4500, true);
        break;
      }
      case 'levelup': {
        cheerClipName = 'cheer';
        setMode('cheer', 3.5);
        spawnSparkles(12);
        say(ev.level ? `Level ${ev.level}!` : 'Level up!', 3200);
        startMotion(EVENT_MOTIONS.levelup, { force: true });
        break;
      }
      case 'badge': {
        cheerClipName = 'cheer';
        setMode('cheer', 3.2);
        spawnSparkles(10);
        say('New badge!', 3000);
        startMotion(LINE_MOTIONS['New badge!'], { force: true });
        break;
      }
      case 'idle': {
        const prev = idleSeconds;
        idleSeconds = Number(ev.seconds) || 0;
        if (prev >= 2 && idleSeconds < 2) {
          wakeUp();
        } else if (idleSeconds >= 600 && mode !== 'sleep' && !waitingTermId) {
          cancelMotionTasks();
          setMode('sleep');
          startFall(false);
          say(pickNew(LINES_SLEEP), 4000);
        }
        break;
      }
      case 'activity': {
        idleSeconds = 0;
        wakeUp();
        break;
      }
      case 'resize': {
        handleResize();
        const p = clampPos(pos.x, pos.y);
        if (p.x !== pos.x || p.y !== pos.y) needsSpringReset = true;
        pos.x = p.x;
        pos.y = p.y;
        const tp = clampPos(pos.tx, pos.ty);
        pos.tx = tp.x;
        pos.ty = tp.y;
        validateCurrentPlatform();
        break;
      }
    }
  }

  // Mixamo FBX -> VRM humanoid retargeting (following three-vrm humanoidAnimation example)
  function retargetMixamoClip(asset, vrmModel, animName) {
    // The physics arc owns vertical motion for jump/fall/land; keep hips height constant there.
    const flattenY = animName === 'jump' || animName === 'fall' || animName === 'land';
    const clip = THREE.AnimationClip.findByName(asset.animations, 'mixamo.com') || asset.animations[0];
    if (!clip) return null;

    const tracks = [];
    const restRotationInverse = new THREE.Quaternion();
    const parentRestWorldRotation = new THREE.Quaternion();
    const _quatA = new THREE.Quaternion();
    const _vec3 = new THREE.Vector3();

    const motionHipsNode = asset.getObjectByName('mixamorigHips') || asset.getObjectByName('Hips');
    const motionHipsHeight = motionHipsNode ? Math.abs(motionHipsNode.position.y) || 100 : 100;

    const vrmHipsNode = vrmModel.humanoid?.getNormalizedBoneNode('hips');
    const vrmHipsY = vrmHipsNode ? vrmHipsNode.getWorldPosition(_vec3).y : 0.85;
    const vrmRootY = vrmModel.scene.getWorldPosition(_vec3).y;
    const sceneScaleY = vrmModel.scene.scale.y || 1;
    const vrmHipsHeight = Math.max(0.1, Math.abs(vrmHipsY - vrmRootY) / sceneScaleY);
    const hipsPositionScale = vrmHipsHeight / motionHipsHeight;
    const isVRM0 = vrmModel.meta?.metaVersion === '0';

    clip.tracks.forEach((track) => {
      const dot = track.name.indexOf('.');
      if (dot < 0) return;
      const mixamoRigName = track.name.slice(0, dot);
      const propertyName = track.name.slice(dot + 1);
      const cleanName = mixamoRigName.replace(':', '');
      const vrmBoneName = mixamoVRMRigMap[cleanName] || mixamoVRMRigMap[`mixamorig${cleanName}`];
      const vrmNodeName = vrmBoneName ? vrmModel.humanoid?.getNormalizedBoneNode(vrmBoneName)?.name : null;
      const mixamoRigNode = asset.getObjectByName(mixamoRigName);
      if (!vrmNodeName || !mixamoRigNode || !mixamoRigNode.parent) return;

      mixamoRigNode.getWorldQuaternion(restRotationInverse).invert();
      mixamoRigNode.parent.getWorldQuaternion(parentRestWorldRotation);

      if (track instanceof THREE.QuaternionKeyframeTrack) {
        const values = track.values.slice();
        for (let i = 0; i < values.length; i += 4) {
          _quatA.fromArray(values, i);
          _quatA.premultiply(parentRestWorldRotation).multiply(restRotationInverse);
          _quatA.toArray(values, i);
        }
        const outValues = isVRM0 ? values.map((v, i) => (i % 2 === 0 ? -v : v)) : values;
        tracks.push(new THREE.QuaternionKeyframeTrack(`${vrmNodeName}.${propertyName}`, track.times, outValues));
      } else if (track instanceof THREE.VectorKeyframeTrack && propertyName === 'position' && vrmBoneName === 'hips') {
        // Strip x/z root motion so JS controls horizontal placement; keep y for crouch/jump/sleep height.
        const values = new Float32Array(track.values.length);
        for (let i = 0; i < track.values.length; i += 3) {
          values[i] = 0;
          values[i + 1] = flattenY ? hipsRestY : track.values[i + 1] * hipsPositionScale;
          values[i + 2] = 0;
        }
        tracks.push(new THREE.VectorKeyframeTrack(`${vrmNodeName}.${propertyName}`, track.times, values));
      }
    });

    if (!tracks.length) return null;
    return new THREE.AnimationClip(clip.name, clip.duration, tracks);
  }

  async function loadMixamoClips(vrmModel) {
    const fbxLoader = new FBXLoader();
    // Rest measurements (no clip has played yet): hips rest height and hair crown above the head bone.
    try {
      const hipsNode = vrmModel.humanoid?.getNormalizedBoneNode('hips');
      if (hipsNode) hipsRestY = hipsNode.position.y;
      const headNode = vrmModel.humanoid?.getNormalizedBoneNode('head');
      if (headNode) {
        vrmModel.scene.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(vrmModel.scene);
        const headY = headNode.getWorldPosition(new THREE.Vector3()).y;
        const off = box.max.y - headY;
        if (!box.isEmpty() && Number.isFinite(off) && off > 0.05 && off < 0.6) headCrownOffset = off;
      }
    } catch (err) {
      console.warn('mascot: rest measurements failed', err);
    }
    console.info('mascot: hipsRestY', hipsRestY, 'headCrownOffset', headCrownOffset);
    await Promise.all(
      ANIM_NAMES.map(async (name) => {
        try {
          let buf;
          if (viktoriaPak) {
            buf = viktoriaPak['fbx:' + name];
            if (!buf) return;
          } else {
            const res = await fetch(`${ANIMS_DIR}${name}.fbx`);
            // WebKit answers file:// fetches with status 0 (three's FileLoader accepts it too).
            if (!(res.ok || res.status === 0)) {
              console.warn('mascot: clip http status', name, res.status);
              return;
            }
            buf = await res.arrayBuffer();
          }
          if (!buf.byteLength) {
            console.warn('mascot: clip empty', name);
            return;
          }
          const asset = fbxLoader.parse(buf, ANIMS_DIR);
          const clip = retargetMixamoClip(asset, vrmModel, name);
          if (!clip) {
            console.warn('mascot: clip has no usable tracks', name);
            return;
          }
          clips[name] = clip;
          const action = mixer.clipAction(clip);
          if (ONE_SHOT_ANIMS.has(name)) {
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
          } else {
            action.setLoop(THREE.LoopRepeat, Infinity);
          }
          actions[name] = action;
        } catch (err) {
          // Missing or invalid clip: procedural fallback handles this state.
          console.warn('mascot: clip failed', name, err);
        }
      })
    );
    console.info('mascot: clips', Object.keys(actions));
  }

  // The entries of anims.pak as { key: ArrayBuffer (a GLB) }, de-obfuscated in memory only.
  function readPak(pak) {
    if (pak.length < 8 || String.fromCharCode(pak[0], pak[1], pak[2], pak[3]) !== 'ORBP') throw new Error('bad magic');
    const dv = new DataView(pak.buffer, pak.byteOffset, pak.byteLength);
    const kb = new TextEncoder().encode(PAK_KEY);
    const count = dv.getUint32(4, true);
    const out = {};
    let p = 8;
    for (let i = 0; i < count; i++) {
      const kl = pak[p++];
      const key = new TextDecoder().decode(pak.subarray(p, p + kl));
      p += kl;
      const off = dv.getUint32(p, true);
      const len = dv.getUint32(p + 4, true);
      p += 8;
      const raw = pak.subarray(off, off + len);
      const buf = new Uint8Array(len);
      for (let j = 0; j < len; j++) buf[j] = raw[j] ^ kb[j % kb.length];
      out[key] = buf.buffer;
    }
    return out;
  }

  // Some VRMA files lack specVersion, which the loader then ignores: patch the GLB JSON chunk.
  function patchVrmaSpec(buf) {
    const jl = new DataView(buf).getUint32(12, true);
    const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jl)));
    const ext = json.extensions && json.extensions.VRMC_vrm_animation;
    if (!ext || ext.specVersion) return buf;
    ext.specVersion = '1.0';
    const t = new TextEncoder().encode(JSON.stringify(json));
    const tj = new Uint8Array(t.length + ((4 - (t.length % 4)) % 4)).fill(32);
    tj.set(t);
    const rest = new Uint8Array(buf, 20 + jl);
    const o = new Uint8Array(20 + tj.length + rest.length);
    o.set(new Uint8Array(buf, 0, 20));
    o.set(tj, 20);
    o.set(rest, 20 + tj.length);
    const ov = new DataView(o.buffer);
    ov.setUint32(8, o.length, true);
    ov.setUint32(12, tj.length, true);
    return o.buffer;
  }

  // VRMA clip for her skeleton. Same rule as the Mixamo clips: horizontal root motion is stripped (JS places her), the
  // hips height is kept. Only bone and expression tracks stay (no look-at track).
  function vrmaToClip(key, va, vrmModel) {
    const src = createVRMAnimationClip(va, vrmModel);
    const tracks = [];
    for (const t of src.tracks) {
      if (t.name.endsWith('.position')) {
        const values = t.values.slice();
        for (let i = 0; i < values.length; i += 3) {
          values[i] = 0;
          values[i + 2] = 0;
        }
        tracks.push(new THREE.VectorKeyframeTrack(t.name, t.times, values));
      } else if (t.name.endsWith('.quaternion') || t.name.endsWith('.weight')) {
        tracks.push(t);
      }
    }
    return tracks.length ? new THREE.AnimationClip(`vrma.${key}`, src.duration, tracks) : null;
  }

  async function loadMotionClips(vrmModel) {
    try {
      let pak = viktoriaPak;
      if (!pak) {
        const res = await fetch(PAK_URL);
        // WebKit answers file:// fetches with status 0 (three's FileLoader accepts it too).
        if (!(res.ok || res.status === 0)) {
          console.warn('mascot: motion pack http status', res.status);
          return;
        }
        pak = readPak(new Uint8Array(await res.arrayBuffer()));
      }
      const loader = new GLTFLoader();
      loader.register((p) => new VRMAnimationLoaderPlugin(p));
      for (const [key, spec] of Object.entries(MOTIONS)) {
        try {
          if (!pak[key]) {
            console.warn('mascot: motion missing in pack', key);
            continue;
          }
          const gltf = await loader.parseAsync(patchVrmaSpec(pak[key]), '');
          const va = gltf.userData.vrmAnimations && gltf.userData.vrmAnimations[0];
          const clip = va ? vrmaToClip(key, va, vrmModel) : null;
          if (!clip) {
            console.warn('mascot: motion has no usable tracks', key);
            continue;
          }
          const def = { ...spec };
          if (!def.loop) {
            def.start = clamp(def.start || 0, 0, clip.duration);
            def.end = clamp(def.end === undefined ? clip.duration : def.end, def.start, clip.duration);
          }
          motionDefs[key] = def;
          console.info(
            `mascot: motion ${key} ${clip.duration.toFixed(2)} s, ` +
              (def.loop ? 'loops' : `window ${def.start}-${def.end} s${def.hold ? `, hold ${def.hold} s` : ''}`)
          );
          const action = mixer.clipAction(clip);
          if (def.loop) {
            action.setLoop(THREE.LoopRepeat, Infinity);
          } else {
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
          }
          actions[motionAnimName(key)] = action;
        } catch (err) {
          console.warn('mascot: motion failed', key, err);
        }
      }
      console.info('mascot: motions', Object.keys(motionDefs));
      // Typos in the tuning tables show up here instead of as a silent "no motion".
      const known = new Set([...FIRST_GREETINGS, ...GREETINGS, ...LATE_NIGHT, ...LINES_BACK, ...LINES_SUCCESS, 'New badge!']);
      for (const [line, key] of Object.entries(LINE_MOTIONS)) {
        if (!known.has(line)) console.warn('mascot: LINE_MOTIONS has an unknown line', line);
        if (!MOTIONS[key]) console.warn('mascot: LINE_MOTIONS has an unknown motion', key);
      }
    } catch (err) {
      // No pack or a bad one: the Mixamo clips and the procedural poses carry on alone.
      console.warn('mascot: motion pack failed', err);
    }
  }

  function desiredAnimName(walking) {
    if (grab && grab.state === 'leap') return 'fall';
    if (phys.active && phys.thrown) return 'fall';
    if (phys.active) return phys.vy < -20 ? 'jump' : 'fall';
    if (landSquash > 0.35 && !phys.active && actions.land) return 'land';
    if (motion && !walking) return motion.name;
    if (walking) return actions[motionAnimName('walk2')] ? motionAnimName('walk2') : 'walk';
    if (mode === 'sit') return 'sit';
    if (mode === 'point') return 'point';
    if (mode === 'tap') return 'press';
    if (mode === 'alert') return 'surprised';
    if (mode === 'cheer') return actions[cheerClipName] ? cheerClipName : 'cheer';
    if (mode === 'sleep') return 'sleep';
    return idleAlt && actions[motionAnimName('idle2')] ? motionAnimName('idle2') : 'idle';
  }

  function syncAnimationAction(name) {
    if (!mixer || name === activeAnimName) return;
    const prev = activeAnimName ? actions[activeAnimName] : null;
    const activeWasMotion = !!activeAnimName && activeAnimName.startsWith('m:');
    const next = actions[name] || null;
    activeAnimName = name;

    if (prev && prev !== next) {
      // fadeOut() always ramps from weight 1; fade manually from the current weight so mid-fade states don't pop.
      const w0 = prev.getEffectiveWeight();
      prev.stopFading();
      prev.setEffectiveWeight(w0);
      fadingOut.push({ a: prev, w0, t: 0, d: activeWasMotion ? MOTION_FADE_OUT : CROSSFADE_SEC });
    }
    if (next) {
      const idx = fadingOut.findIndex((f) => f.a === next);
      if (idx >= 0) fadingOut.splice(idx, 1);
      // reset() restarts one-shots each time; explicit weight/enabled so a clip faded out earlier never stays at weight 0.
      next.reset();
      next.enabled = true;
      next.setEffectiveTimeScale(1);
      next.setEffectiveWeight(1);
      next.fadeIn(CROSSFADE_SEC);
      next.play();
      // A VRMA motion plays only its window of the clip.
      const md = name.startsWith('m:') ? motionDefs[name.slice(2)] : null;
      if (md && md.start) next.time = md.start;
      if (md && md.rate) next.setEffectiveTimeScale(md.rate);
    } else {
      // No clip for this state: drop mixer pose so the procedural fallback starts from the rest pose.
      fadingOut.length = 0;
      mixer.stopAllAction();
    }
  }

  function updateFadingOut(dt) {
    for (let i = fadingOut.length - 1; i >= 0; i--) {
      const f = fadingOut[i];
      f.t += dt;
      const k = Math.min(1, f.t / (f.d || CROSSFADE_SEC));
      f.a.setEffectiveWeight(f.w0 * (1 - k));
      if (k >= 1) {
        f.a.stop();
        fadingOut.splice(i, 1);
      }
    }
  }

  function applyProceduralPose(stateName) {
    if (!vrm?.humanoid) return;
    const bone = (n) => vrm.humanoid.getNormalizedBoneNode(n);
    const s = vrm.meta?.metaVersion === '0' ? 1 : -1;
    const breath = Math.sin(elapsed * 1.8);

    const setRot = (name, x, y, z) => {
      const b = bone(name);
      if (b) b.rotation.set(x, y, z);
    };

    // Reset base humanoid pose (arms down from T-pose)
    setRot('hips', 0, 0, 0);
    setRot('spine', breath * 0.015, 0, 0);
    setRot('chest', 0, 0, 0);
    setRot('head', 0, 0, 0);
    setRot('leftUpperArm', 0, 0, s * (1.22 - breath * 0.02));
    setRot('rightUpperArm', 0, 0, s * (-1.22 + breath * 0.02));
    setRot('leftLowerArm', 0, 0, s * 0.14);
    setRot('rightLowerArm', 0, 0, s * -0.14);
    setRot('leftUpperLeg', 0, 0, 0);
    setRot('rightUpperLeg', 0, 0, 0);
    setRot('leftLowerLeg', 0, 0, 0);
    setRot('rightLowerLeg', 0, 0, 0);
    setRot('leftFoot', 0, 0, 0);
    setRot('rightFoot', 0, 0, 0);

    const hips = bone('hips');
    if (hips) hips.position.y = hipsRestY;

    if (stateName === 'idle') {
      setRot('head', Math.sin(elapsed * 0.6) * 0.04, Math.sin(elapsed * 0.45) * 0.12, 0);
      setRot('spine', breath * 0.02, 0, Math.sin(elapsed * 0.7) * 0.025);
    } else if (stateName === 'walk') {
      const w = elapsed * 9.5;
      const step = Math.sin(w);
      setRot('leftUpperLeg', step * 0.55, 0, 0);
      setRot('rightUpperLeg', -step * 0.55, 0, 0);
      setRot('leftLowerLeg', Math.max(0, -step) * 0.65, 0, 0);
      setRot('rightLowerLeg', Math.max(0, step) * 0.65, 0, 0);
      setRot('leftUpperArm', -step * 0.4, 0, s * 1.15);
      setRot('rightUpperArm', step * 0.4, 0, s * -1.15);
      setRot('spine', 0.06, 0, step * 0.04);
      if (hips) hips.position.y = hipsRestY + Math.abs(Math.sin(w)) * 0.03;
    } else if (stateName === 'jump') {
      setRot('leftUpperLeg', -0.65, 0, 0);
      setRot('rightUpperLeg', -0.45, 0, 0);
      setRot('leftLowerLeg', 1.1, 0, 0);
      setRot('rightLowerLeg', 0.85, 0, 0);
      setRot('leftUpperArm', -0.5, 0, s * 0.45);
      setRot('rightUpperArm', -0.5, 0, s * -0.45);
      setRot('spine', 0.12, 0, 0);
    } else if (stateName === 'fall') {
      setRot('leftUpperArm', -0.2, 0, s * 0.35);
      setRot('rightUpperArm', -0.2, 0, s * -0.35);
      setRot('leftUpperLeg', -0.25, 0, 0);
      setRot('rightUpperLeg', -0.15, 0, 0);
      setRot('leftLowerLeg', 0.45, 0, 0);
      setRot('rightLowerLeg', 0.3, 0, 0);
    } else if (stateName === 'land') {
      setRot('leftUpperLeg', -0.45, 0, 0);
      setRot('rightUpperLeg', -0.45, 0, 0);
      setRot('leftLowerLeg', 0.85, 0, 0);
      setRot('rightLowerLeg', 0.85, 0, 0);
      setRot('spine', 0.18, 0, 0);
      if (hips) hips.position.y = hipsRestY - 0.1;
    } else if (stateName === 'sit') {
      setRot('leftUpperLeg', -1.45, 0, 0);
      setRot('rightUpperLeg', -1.45, 0, 0);
      setRot('leftLowerLeg', 1.45, 0, 0);
      setRot('rightLowerLeg', 1.45, 0, 0);
      setRot('spine', Math.sin(elapsed * 1.4) * 0.03, 0, 0);
      if (hips) hips.position.y = hipsRestY - 0.36;
    } else if (stateName === 'point') {
      setRot('rightUpperArm', -1.35, 0, s * -0.15);
      setRot('rightLowerArm', 0, 0, s * -0.05);
      setRot('head', 0, pos.facingLeft ? -0.28 : 0.28, 0);
    } else if (stateName === 'press') {
      const jab = Math.sin(elapsed * 14) * 0.25;
      setRot('rightUpperArm', -1.25 - jab, 0, s * -0.2);
      setRot('rightLowerArm', -0.3 + jab, 0, s * -0.1);
    } else if (stateName === 'wave') {
      setRot('rightUpperArm', 0, 0, s * 1.15);
      setRot('rightLowerArm', 0, 0, s * (0.45 + Math.sin(elapsed * 12) * 0.4));
    } else if (stateName === 'cheer') {
      setRot('leftUpperArm', 0, 0, s * -1.1);
      setRot('rightUpperArm', 0, 0, s * 1.1);
      setRot('leftLowerArm', 0, 0, s * 0.25);
      setRot('rightLowerArm', 0, 0, s * -0.25);
      if (hips) hips.position.y = hipsRestY + Math.abs(Math.sin(elapsed * 8)) * 0.08;
    } else if (stateName === 'surprised') {
      setRot('spine', -0.12, 0, 0);
      setRot('leftUpperArm', -0.4, 0, s * 0.55);
      setRot('rightUpperArm', -0.4, 0, s * -0.55);
    } else if (stateName === 'sleep') {
      setRot('hips', -Math.PI * 0.46, 0, 0);
      setRot('head', 0.15, 0.2, 0.12);
      setRot('leftUpperArm', 0.2, 0, s * 1.3);
      setRot('rightUpperArm', 0.2, 0, s * -1.3);
      if (hips) hips.position.y = hipsRestY - 0.62;
    }
  }

  function applyExpressions() {
    const em = vrm?.expressionManager;
    if (!em) return;

    const names = ['happy', 'surprised', 'relaxed', 'blink', 'aa'];
    for (const n of names) {
      try { em.setValue(n, 0); } catch {}
    }

    const isTalking = !bubbleEl.classList.contains('hidden');
    if (isTalking && mode !== 'sleep') {
      const mouth = Math.max(0, Math.sin(elapsed * 16) * 0.5 + 0.35) * 0.65;
      try { em.setValue('aa', mouth); } catch {}
    }

    if (mode === 'sleep') {
      try { em.setValue('relaxed', 0.85); } catch {}
      try { em.setValue('blink', 1); } catch {}
      return;
    }

    if (mode === 'alert') {
      try { em.setValue('surprised', 1); } catch {}
      return;
    }

    if (mode === 'cheer' || (isTalking && mode === 'idle')) {
      try { em.setValue('happy', mode === 'cheer' ? 0.95 : 0.45); } catch {}
    }

    const bp = elapsed % 4.0;
    if (bp > 3.85 && mode !== 'cheer') {
      const blinkVal = Math.sin(((bp - 3.85) / 0.15) * Math.PI);
      try { em.setValue('blink', blinkVal); } catch {}
    }
  }

  function updateSkirtSprings(falling) {
    for (const item of skirtJoints) {
      const s = item.joint.settings;
      if (falling) {
        s.stiffness = Math.max(item.stiffness * 2.6, 1.6);
        s.gravityPower = Math.max(item.gravityPower, 0.4);
        s.dragForce = Math.max(item.dragForce, 0.65);
      } else {
        s.stiffness = Math.max(item.stiffness * 1.8, 1.1);
        s.gravityPower = Math.max(item.gravityPower, 0.35);
        s.dragForce = Math.max(item.dragForce, 0.4);
      }
    }
  }

  function updateLookAt() {
    if (!vrm?.lookAt || !lookAtTarget) return;
    if (focusPoint && (mode === 'point' || mode === 'alert' || mode === 'sit')) {
      lookAtTarget.position.set(focusPoint.x * metersPerPx, -focusPoint.y * metersPerPx, 1.2);
    } else {
      lookAtTarget.position.set(pos.x * metersPerPx, -(pos.y - TARGET_HEIGHT * 0.82) * metersPerPx, 2.0);
    }
  }

  function scheduleIdleJump(winOnly = false) {
    const W = vw();
    const curSurf = currentPlatId ? surfaceById(currentPlatId) : null;
    const surfs = allSurfaces();
    const hopCandidates = surfs.filter((s) => {
      if (curSurf && s.id === curSurf.id) return false;
      if (winOnly && !s.id.startsWith('win:')) return false;
      const dy = pos.y - s.y;
      if (dy < 24 || dy > TARGET_HEIGHT * 1.5) return false;
      const cx = clamp(pos.x, s.x + 28, s.x + s.w - 28);
      return Math.abs(cx - pos.x) <= (winOnly && !curSurf ? 700 : 260);
    });

    if (hopCandidates.length && (!curSurf || Math.random() < 0.35)) {
      const targetSurf = pick(hopCandidates);
      const targetX = clamp(
        clamp(pos.x, targetSurf.x + 28, targetSurf.x + targetSurf.w - 28),
        EDGE_MARGIN,
        Math.max(EDGE_MARGIN, W - EDGE_MARGIN)
      );
      if (curSurf) {
        const takeOffX = clamp(targetX, curSurf.x + 24, curSurf.x + curSurf.w - 24);
        pendingJump = { kind: 'up', edgeX: takeOffX, surf: targetSurf, targetX };
        moveTo(takeOffX, pos.y);
      } else if (Math.abs(targetX - pos.x) > 260) {
        // too far to jump from here: walk under it first, then hop (pendingJump expires if she never gets there)
        pendingJump = { kind: 'up', edgeX: targetX, surf: targetSurf, targetX, until: elapsed + 20 };
        moveTo(targetX, pos.y);
      } else {
        startHopUp(targetSurf, targetX);
      }
      return true;
    }

    if (winOnly) return false;
    if (curSurf) {
      const canLeft = curSurf.x - 24 >= EDGE_MARGIN;
      const canRight = curSurf.x + curSurf.w + 24 <= W - EDGE_MARGIN;
      if (!canLeft && !canRight) return false;
      const dir = canLeft && canRight ? (Math.random() < 0.5 ? -1 : 1) : (canRight ? 1 : -1);
      const edgeX = clamp(dir < 0 ? curSurf.x + 16 : curSurf.x + curSurf.w - 16, EDGE_MARGIN, Math.max(EDGE_MARGIN, W - EDGE_MARGIN));
      pendingJump = { kind: 'down', dir, edgeX };
      moveTo(edgeX, pos.y);
      return true;
    }
    return false;
  }

  function resetMischiefTimers() {
    const m = M();
    nextWanderAt = elapsed + Math.min(7, rnd(m.wander));
    nextJumpAt = elapsed + rnd(m.jump);
    nextNavAt = elapsed + rnd(m.nav);
    nextJokeAt = elapsed + rnd(m.term);
    nextScreenAt = elapsed + rnd(m.screen);
    nextIdleGreetAt = elapsed + rnd(m.greet);
    nextActAt = m.rr ? elapsed + 6 : Infinity;
    rrIndex = 0;
    if (!m.typing) typingPending = null;
    if (!m.nav && !m.rr) pendingNav = null;
    if (!m.screen && !m.rr) pendingCross = null;
    if (!m.term && !m.rr && !m.typing) pendingHide = null;
  }

  function stepSimulation(dt) {
    elapsed += dt;
    if (landSquash > 0) landSquash = Math.max(0, landSquash - dt * 4.5);

    if (bubbleUntil > 0 && elapsed >= bubbleUntil) {
      bubbleEl.classList.add('hidden');
      bubbleUntil = 0;
    }

    if (modeUntil > 0 && elapsed >= modeUntil) {
      if (mode === 'point') {
        setMode('sit');
      } else {
        setMode(waitingTermId ? 'sit' : 'idle');
      }
    }

    if (mode === 'sleep' && elapsed >= zzzAt) {
      zzzAt = elapsed + 1.6;
      spawnZzz();
    }

    // Physics: drop / jump-down / hop-up
    if (phys.active && phys.thrown && !dragging) {
      stepThrow(dt);
    } else if (phys.active && !dragging) {
      const W = vw();
      const prevY = pos.y;
      phys.vy += GRAVITY * dt;
      pos.x = clamp(pos.x + phys.vx * dt, EDGE_MARGIN, Math.max(EDGE_MARGIN, W - EDGE_MARGIN));
      pos.y += phys.vy * dt;

      if (phys.vy >= 0) {
        const surf = findSurfaceBelow(pos.x, prevY);
        if (pos.y >= surf.y) {
          pos.y = surf.y;
          pos.tx = pos.x;
          pos.ty = pos.y;
          phys.active = false;
          phys.vx = 0;
          phys.vy = 0;
          currentPlatId = surf.kind === 'floor' ? null : surf.id;
          landSquash = 1.0;
          needsSpringReset = true;
          if (arriveWalk) {
            const Wd = vw();
            moveTo(clamp(pos.x + arriveWalk * 190, EDGE_MARGIN, Math.max(EDGE_MARGIN, Wd - EDGE_MARGIN)), pos.y);
            arriveWalk = 0;
          }
          if (pendingFirstGreeting) {
            pendingFirstGreeting = false;
            showFirstGreeting();
          } else if (phys.isDrop) {
            greet(true);
          }
        }
      }
    }

    // Pending jump trigger when reaching edge
    if (pendingJump && !dragging && !phys.active && mode === 'idle') {
      if (Math.abs(pos.x - pendingJump.edgeX) <= 8) {
        const pj = pendingJump;
        pendingJump = null;
        if (pj.kind === 'down') startJumpOff(pj.dir);
        else if (pj.kind === 'up') startHopUp(pj.surf, pj.targetX);
      }
    }

    // Walking to a screen edge to step onto the neighbouring monitor
    if (pendingCross) {
      if (dragging || elapsed > pendingCross.until) {
        pendingCross = null;
      } else if (!phys.active && Math.abs(pos.x - pendingCross.x) <= 4 && Math.abs(pos.y - pendingCross.y) <= 8) {
        if (edgeOpen(pendingCross.dir, pos.y, true)) requestCross(pendingCross.dir);
        else pendingCross = null;
      }
    }

    // Pending navigation tap when reaching target
    if (pendingNav &&!dragging && !phys.active && mode === 'idle') {
      if (Math.hypot(pos.tx - pos.x, pos.ty - pos.y) <= 10) {
        const target = pendingNav.target;
        pendingNav = null;
        executeNavTarget(target);
      }
    }

    // She reaches the terminal's title bar, says her line, and only then hides it.
    if (pendingHide) {
      const t = findTerminal(pendingHide.id);
      // canClose false: native can't close it now (the dashboard minimized or hidden), so she gives up, not later.
      if (!t || t.status !== 'idle' || t.canClose === false || waitingTermId || dragging || elapsed > pendingHide.until) {
        pendingHide = null;
      } else if (!phys.active && Math.hypot(pos.tx - pos.x, pos.ty - pos.y) <= 10) {
        const ph = pendingHide;
        // The X button is only used when she can stand on it: it must lie on the visible part of the title bar.
        const c = t.close && t.close.x >= t.x && t.close.x + t.close.w <= t.x + t.w
          && t.close.x + t.close.w / 2 >= EDGE_MARGIN && t.close.x + t.close.w / 2 <= vw() - EDGE_MARGIN ? t.close : null;
        if (ph.stage === 0) {
          ph.stage = 1;
          ph.at = elapsed;
          say(ph.line, 2200);
        } else if (ph.stage === 1 && elapsed - ph.at >= 0.9) {
          if (c) {
            const standY = t.y >= MIN_STAND_Y ? t.y + 6 : clamp(t.y + 36, MIN_STAND_Y, bottomY());
            ph.stage = 2;
            moveTo(c.x + c.w / 2, standY);
            pos.facingLeft = c.x + c.w / 2 < pos.x;
          } else {
            // No X she can stand on: native still closes it the same way, after the user stopped typing.
            ph.stage = 4;
            ph.until = elapsed + 20;
            ph.lastPost = -1;
          }
        } else if (ph.stage === 2) {
          ph.stage = 3;
          ph.at = elapsed;
          setMode('tap', 1.0);
        } else if (ph.stage === 3 && elapsed - ph.at >= 0.95) {
          // Native closes it once the user has not typed there for 1.2 s and answers closeDone; she waits at the X.
          ph.stage = 4;
          ph.until = elapsed + 20;
          ph.lastPost = -1;
        }
        if (pendingHide && pendingHide.stage === 4 && elapsed - pendingHide.lastPost >= 0.4) {
          pendingHide.lastPost = elapsed;
          if (active) post({ type: 'closeTerminal', id: pendingHide.id });
        }
      }
    }

    // Sulking at the theme chooser: she panics, leaps at the cursor (x and y), hangs from it by her hand while native
    // keeps the real cursor at her hand for 2-3 s, then lets go and falls.
    if (grab) {
      if (elapsed > grab.until || dragging) {
        endGrab(false);
      } else if (grab.state === 'react') {
        if (elapsed - grab.t0 >= 0.12) beginLeap();
      } else if (grab.state === 'leap') {
        stepLeap(dt);
      } else {
        stepHold();
      }
    }
    if (pendingJump && pendingJump.until && elapsed > pendingJump.until) pendingJump = null;

    // Idle behaviors on platforms / floor, scaled by the mischief level
    if (elapsed >= nextIdleSwitchAt) {
      nextIdleSwitchAt = elapsed + rnd(IDLE_SWITCH_EVERY);
      const was = idleAlt;
      idleAlt = Math.random() < 0.5;
      const d2 = motionDefs.idle2;
      // The variant plays once: a fresh start gets the next flip no later than its end, a running one keeps its time left.
      if (idleAlt && d2 && !was) nextIdleSwitchAt = Math.min(nextIdleSwitchAt, elapsed + (d2.end - d2.start) - 0.5);
    }
    if (mode === 'idle' && !dragging && !phys.active && !slide && !waitingTermId && !roamView && !pendingJump && !pendingNav && !pendingCross && !pendingHide && !grab && !motion) {
      const W = vw();
      const m = M();
      if (elapsed >= nextFidgetAt) {
        nextFidgetAt = elapsed + rnd(FIDGET_EVERY);
        startMotion(pick(FIDGETS));
      }
      if (elapsed >= nextWanderAt) {
        nextWanderAt = elapsed + rnd(m.wander);
        const curSurf = currentPlatId ? surfaceById(currentPlatId) : null;
        if (curSurf && curSurf.w >= 72) {
          const lo = clamp(curSurf.x + 28, EDGE_MARGIN, Math.max(EDGE_MARGIN, W - EDGE_MARGIN));
          const hi = clamp(curSurf.x + curSurf.w - 28, EDGE_MARGIN, Math.max(EDGE_MARGIN, W - EDGE_MARGIN));
          if (hi > lo + 8) moveTo(lo + Math.random() * (hi - lo), curSurf.y);
        } else if (!curSurf) {
          moveTo(90 + Math.random() * Math.max(40, W - 180), bottomY());
        }
      }

      if (elapsed >= nextIdleGreetAt && idleSeconds < 600) {
        nextIdleGreetAt = elapsed + rnd(m.greet);
        greet();
      }

      if (m.rr) {
        // Crazy: a round-robin, one behaviour every rr seconds; impossible ones are skipped until the next round.
        // A pending typing-close does not wait for its turn: she goes right away.
        if (typingPending) actTyping();
        if (elapsed >= nextActAt) {
          const acts = { nav: actNav, term: actTerm, jump: () => scheduleIdleJump(false), window: () => scheduleIdleJump(true), screen: tryVisitScreen, typing: actTyping, bubble: actBubble };
          for (let k = 0; k < RR_TYPES.length; k++) {
            const i = (rrIndex + k) % RR_TYPES.length;
            if (acts[RR_TYPES[i]](m)) {
              rrIndex = (i + 1) % RR_TYPES.length;
              break;
            }
          }
          nextActAt = elapsed + rnd(m.rr);
        }
      } else {
        if (elapsed >= nextJumpAt) {
          nextJumpAt = elapsed + rnd(m.jump);
          scheduleIdleJump(false);
        }
        if (elapsed >= nextScreenAt) {
          nextScreenAt = elapsed + rnd(m.screen);
          tryVisitScreen();
        }
        if (elapsed >= nextNavAt) {
          nextNavAt = elapsed + rnd(m.nav);
          actNav(m);
        }
        if (elapsed >= nextJokeAt) {
          nextJokeAt = elapsed + rnd(m.term);
          actTerm(m);
        }
        if (typingPending) actTyping();
      }
    }

    if (roamView && elapsed >= roamReturnAt) {
      roamView = null;
      post({ type: 'openView', view: 'dash' });
    }

    // Sliding on friction after a hard landing, then standing still
    if (slide) {
      if (phys.active || dragging) {
        slide = null;
      } else {
        const lo = EDGE_MARGIN;
        const hi = Math.max(EDGE_MARGIN, vw() - EDGE_MARGIN);
        pos.x = clamp(pos.x + slide.vx * dt, lo, hi);
        slide.vx *= Math.exp(-5 * dt);
        pos.tx = pos.x;
        const sf = currentPlatId ? surfaceById(currentPlatId) : null;
        if (currentPlatId && (!sf || pos.x < sf.x + 10 || pos.x > sf.x + sf.w - 10)) {
          slide = null;
          startFall(false);
        } else if (Math.abs(slide.vx) < 12 || pos.x === lo || pos.x === hi) {
          slide = null;
        }
      }
    }

    // Smooth slide toward target when grounded
    let walking = false;
    if (!dragging && !phys.active) {
      const dx = pos.tx - pos.x;
      const dy = pos.ty - pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 6 && mode !== 'sleep') walking = true;
      if (dist > 1) {
        const step = Math.min(dist, 210 * dt);
        pos.x += (dx / dist) * step;
        pos.y += (dy / dist) * step;
      } else {
        pos.x = pos.tx;
        pos.y = pos.ty;
      }
    }

    if (vrm && modelRoot) {
      updateMotion();
      const animName = desiredAnimName(walking);
      syncAnimationAction(animName);

      if (actions[animName]) {
        updateFadingOut(dt);
        mixer.update(dt);
        // The idle variant never wraps: when its window is over, back to the normal idle.
        if (idleAlt && animName === motionAnimName('idle2') && actions[animName].time >= motionDefs.idle2.end) idleAlt = false;
        // A held pose (finger heart): freeze on the last frame of its window until the hold is over.
        if (motion && motion.name === animName && motion.def.hold && actions[animName].time >= motion.def.end) {
          actions[animName].setEffectiveTimeScale(0);
        }
      } else {
        applyProceduralPose(animName);
      }

      // Facing: turn body toward walk/jump direction (~80 deg), face camera otherwise
      let targetYaw = 0;
      if (walking || phys.active) {
        targetYaw = pos.facingLeft ? -Math.PI * 0.44 : Math.PI * 0.44;
      } else if (mode === 'sit') {
        targetYaw = pos.facingLeft ? -0.55 : 0.55;
      } else if (mode === 'point') {
        targetYaw = pos.facingLeft ? -0.42 : 0.42;
      }
      modelYaw = lerp(modelYaw, targetYaw, Math.min(1, dt * 12));

      if (hitSquash > 0) hitSquash = Math.max(0, hitSquash - dt * 4);
      const squashY = (landSquash > 0.01 && !phys.active ? 1 - landSquash * 0.08 : 1) * (1 - hitSquash * 0.1);
      const squashXZ = (landSquash > 0.01 && !phys.active ? 1 + landSquash * 0.05 : 1) * (1 + hitSquash * 0.06);
      // Leans with the throw: a slight roll in proportion to the horizontal speed while she flies.
      const rollTarget = grab && grab.state === 'hold' ? Math.sin(elapsed * 2.6) * 0.14
        : (phys.active && phys.thrown) || (grab && grab.state === 'leap') ? -clamp(phys.vx / THROW_MAX, -1, 1) * 0.5 : 0;
      flightRoll = lerp(flightRoll, rollTarget, Math.min(1, dt * 10));
      modelRoot.position.set(pos.x * metersPerPx, -pos.y * metersPerPx, 0);
      modelRoot.rotation.set(0, modelYaw, flightRoll);
      renderedPos = { x: pos.x, y: pos.y };
      modelRoot.scale.set(squashXZ, squashY, squashXZ);

      applyExpressions();
      updateLookAt();
      updateSkirtSprings(phys.active);
      if (needsSpringReset) {
        modelRoot.updateMatrixWorld(true);
        vrm.springBoneManager?.reset();
        needsSpringReset = false;
      }
      vrm.update(Math.min(dt, 1 / 30));
    }

    placeBubble();
    reportHitRect();
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  function loop(now) {
    if (!active) {
      rafId = 0;
      return;
    }
    rafId = requestAnimationFrame(loop);
    if (lastFrameTime && now - lastFrameTime < FRAME_INTERVAL_MS - 1) return;
    const dt = lastFrameTime ? Math.min(1 / 30, (now - lastFrameTime) / 1000) : 0;
    lastFrameTime = now;
    stepSimulation(dt);
  }

  function startLoop() {
    if (!rafId && active) {
      lastFrameTime = 0;
      rafId = requestAnimationFrame(loop);
    }
  }

  function stopLoop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function handleResize() {
    if (!renderer || !camera) return;
    const W = vw();
    const H = vh();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H, false);
    camera.left = 0;
    camera.right = W * metersPerPx;
    camera.top = 0;
    camera.bottom = -H * metersPerPx;
    camera.updateProjectionMatrix();
  }

  function wirePointer() {
    stage.addEventListener('pointerdown', (e) => {
      if (!vrm) return;
      dragging = true;
      dragMoved = false;
      motion = null;
      cancelMotionTasks(true);
      currentPlatId = null;
      dragStart = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
      dragSamples = [{ t: performance.now(), x: e.clientX, y: e.clientY }];
      stage.classList.add('dragging');
      stage.setPointerCapture(e.pointerId);
      post({ type: 'dragging', on: true });
      wakeUp();
    });

    stage.addEventListener('pointermove', (e) => {
      if (!dragging || !dragStart) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (Math.hypot(dx, dy) > 5) dragMoved = true;
      dragSamples.push({ t: performance.now(), x: e.clientX, y: e.clientY });
      if (dragSamples.length > 24) dragSamples.splice(0, dragSamples.length - 24);
      // While held she just follows the cursor (native moves the panel to the screen under it): no edge wall here.
      const p = {
        x: clamp(dragStart.ox + dx, 0, vw()),
        y: clamp(dragStart.oy + dy, MIN_STAND_Y, bottomY()),
      };
      if (Math.abs(p.x - pos.x) > 2) pos.facingLeft = p.x < pos.x;
      pos.x = p.x;
      pos.y = p.y;
      pos.tx = p.x;
      pos.ty = p.y;
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove('dragging');
      try { stage.releasePointerCapture(e.pointerId); } catch {}
      post({ type: 'dragging', on: false });
      if (!dragMoved) {
        cheerClipName = actions.wave ? 'wave' : 'cheer';
        setMode('cheer', 2.0);
        startMotion('wave2', { force: true }); // wave.fbx stays as the fallback in cheerClipName
        spawnSparkles(6);
        greet(true);
      } else {
        needsSpringReset = true;
        const v = dragVelocity();
        if (v) startThrow(v.vx, v.vy);
        else startFall(true);
      }
      dragStart = null;
    };

    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
  }

  function setActive(on) {
    const next = !!on;
    const resumed = next && !active;
    active = next;
    if (!active) {
      // Switched off: nothing she started may fire later (Settings closing by itself, a stale return to the dashboard).
      clearSettingsTimers();
      settingsOpened = false;
      roamView = null;
    }
    if (active) {
      if (resumed) needsSpringReset = true;
      startLoop();
    } else {
      stopLoop();
    }
    reportHitRect();
  }

  window.__mascot = {
    setActive,
    onEvent: handleEvent,
    getState: () => ({
      active,
      mode,
      anim: activeAnimName,
      mixamoClips: Object.keys(clips),
      x: pos.x,
      y: pos.y,
      falling: phys.active,
      platform: currentPlatId,
      loaded: !!vrm,
    }),
  };
  // Now the app can reach her: it sends the Mischief level, the screen and the rest (Mascot.swift pageReady).
  post({ type: 'ready' });

  async function init() {
    try {
      const W = vw();
      const H = vh();

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setSize(W, H, false);
      stage.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(0, W * metersPerPx, 0, -H * metersPerPx, 0.1, 100);
      camera.position.set(0, 0, 10);

      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const sun = new THREE.DirectionalLight(0xffffff, 1.5);
      sun.position.set(1, 2, 2);
      scene.add(sun);

      lookAtTarget = new THREE.Object3D();
      scene.add(lookAtTarget);

      window.addEventListener('resize', handleResize);

      const gltfLoader = new GLTFLoader();
      gltfLoader.register((p) => new VRMLoaderPlugin(p));
      let gltf;
      if (window.__viktoriaPak) {
        const res = await fetch(window.__viktoriaPak);
        // WebKit answers custom-scheme and file:// fetches with status 0 on some versions.
        if (!(res.ok || res.status === 0)) throw new Error(`download http ${res.status}`);
        viktoriaPak = readPak(new Uint8Array(await res.arrayBuffer()));
        if (!viktoriaPak.model) throw new Error('no model in the download');
        gltf = await gltfLoader.parseAsync(viktoriaPak.model, '');
        delete viktoriaPak.model;
      } else {
        gltf = await gltfLoader.loadAsync(MODEL_URL);
      }

      vrm = gltf.userData.vrm;
      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      VRMUtils.rotateVRM0(vrm);

      vrm.scene.updateMatrixWorld(true);
      const rawBox = new THREE.Box3().setFromObject(vrm.scene);
      const rawHeight = Math.max(0.1, rawBox.max.y - rawBox.min.y);
      metersPerPx = rawHeight / TARGET_HEIGHT;
      handleResize();

      modelRoot = new THREE.Group();
      vrm.scene.scale.setScalar(1);
      vrm.scene.position.set(0, -rawBox.min.y, 0);
      modelRoot.add(vrm.scene);
      scene.add(modelRoot);

      skirtJoints.length = 0;
      if (vrm.springBoneManager?.joints) {
        for (const joint of vrm.springBoneManager.joints) {
          if (/skirt|apron/i.test(joint.bone?.name || '')) {
            skirtJoints.push({
              joint,
              stiffness: joint.settings.stiffness,
              gravityPower: joint.settings.gravityPower,
              dragForce: joint.settings.dragForce,
            });
          }
        }
      }

      if (vrm.lookAt) vrm.lookAt.target = lookAtTarget;

      mixer = new THREE.AnimationMixer(vrm.scene);
      await loadMixamoClips(vrm);
      await loadMotionClips(vrm);
      viktoriaPak = null; // the big buffers go

      const p = clampPos(W * 0.72, bottomY());
      pos.x = pos.tx = p.x;
      pos.y = pos.ty = p.y;
      modelRoot.position.set(pos.x * metersPerPx, -pos.y * metersPerPx, 0);
      lookAtTarget.position.set(pos.x * metersPerPx, -(pos.y - TARGET_HEIGHT * 0.82) * metersPerPx, 2.0);
      needsSpringReset = true;

      wirePointer();
      if (active) startLoop();
      stepSimulation(1 / 30);
      reportHitRect();
      window.__mascotReady = true;
    } catch (err) {
      console.warn('mascot: failed to load VRM model', err);
      vrm = null;
      post({ type: 'hitRect', rect: null });
      // The downloaded pak can't be used: native deletes it and offers the download again.
      if (window.__viktoriaPak) post({ type: 'loadFailed' });
    } finally {
      viktoriaPak = null;
    }
  }

  init();
})();
