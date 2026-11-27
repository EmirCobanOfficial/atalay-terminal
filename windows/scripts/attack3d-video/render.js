// Makes Windows' video of the spaceship attack (mac/Resources/web/attack3d/show.webm + video.js) from the 3D show's own
// files (attack3d/scene3d.js, assets.js): each frame drawn offline at its t (the scene is a pure function of t), the
// canvases put together in their paint order, encoded by ffmpeg as VP9 with alpha. Run again after scripts/attack3d.sh.
//   cd windows && npx electron scripts/attack3d-video/render.js            (needs ffmpeg with libvpx-vp9 on PATH)
// It renders at 60 fps to a temporary file, then encodes the 30 fps one (crf 44: ~12 MB) that ships.
const { app, BrowserWindow } = require('electron');
app.commandLine.appendSwitch('force-device-scale-factor', '1');
const path = require('path'), fs = require('fs');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');
const WEB = path.join(__dirname, '..', '..', '..', 'mac', 'Resources', 'web');
const OUT = path.join(WEB, 'attack3d');
const FPS = 60, SHIP_FPS = 30, SHIP_CRF = 44, CRF = 30, W = 1920, H = 1080;
const os = require('os');
const tmp = path.join(os.tmpdir(), 'attack3d-video-60.webm');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: W, height: H, show: false, transparent: true, frame: false, useContentSize: true, enableLargerThanScreen: true,
    webPreferences: { backgroundThrottling: false, offscreen: true } });
  win.setContentSize(W, H);
  await win.loadFile(path.join(__dirname, 'render.html'));
  const ex = (s) => win.webContents.executeJavaScript(s);
  const info = await ex(`R.setup(${JSON.stringify(pathToFileURL(WEB).href.replace(/\/?$/, '/'))}, { dpr: 1 })`);
  if (info.iw !== W || info.ih !== H) throw new Error(`page is ${info.iw}x${info.ih}`);
  await ex(fs.readFileSync(path.join(__dirname, 'compose.js'), 'utf8') + ';1');
  const { LOCK_START, END } = info.T;
  const n = Math.round(((END - LOCK_START) * FPS) / 1000) + 1;
  console.log(`T ${LOCK_START}..${END}, ${n} frames at ${FPS} fps, crf ${CRF}`);
  const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-crf', String(CRF), '-b:v', '0', '-deadline', 'good', '-cpu-used', '2', '-row-mt', '1',
    '-tile-columns', '2', '-auto-alt-ref', '0', '-g', String(FPS * 2), '-an', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((ok, no) => ff.on('exit', (c) => (c === 0 ? ok() : no(new Error('ffmpeg ' + c)))));
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const t = LOCK_START + (i * 1000) / FPS;
    const px = await ex(`R.frame(${t})`);
    const buf = Buffer.from(px.buffer || px, px.byteOffset || 0, px.byteLength || px.length);
    if (buf.length !== W * H * 4) throw new Error('frame size ' + buf.length);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 120 === 0) console.log(`frame ${i}/${n} t=${Math.round(t)} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  ff.stdin.end();
  await done;
  // the shipped one: 30 fps, decoded with libvpx so the alpha comes along
  const enc = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-c:v', 'libvpx-vp9', '-i', tmp, '-r', String(SHIP_FPS), '-c:v', 'libvpx-vp9',
    '-pix_fmt', 'yuva420p', '-crf', String(SHIP_CRF), '-b:v', '0', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1', '-tile-columns', '2',
    '-auto-alt-ref', '0', '-g', String(SHIP_FPS * 2), '-an', path.join(OUT, 'show.webm')], { stdio: 'inherit' });
  await new Promise((ok, no) => enc.on('exit', (c) => (c === 0 ? ok() : no(new Error('ffmpeg ' + c)))));
  fs.rmSync(tmp, { force: true });
  const info2 = { src: 'show.webm', fps: SHIP_FPS, w: W, h: H, T: info.T };
  fs.writeFileSync(path.join(OUT, 'video.js'), [
    "'use strict';",
    '// Written by windows/scripts/attack3d-video/render.js from scene3d.js and assets.js; do not edit.',
    "// The clock of show.webm (ms, scene3d's T): frame 0 is T.LOCK_START, the last one T.END.",
    'window.__ATTACK3D_VIDEO = ' + JSON.stringify(info2) + ';',
    '',
  ].join('\n'));
  console.log(`done ${((Date.now() - t0) / 1000).toFixed(1)}s, show.webm ${(fs.statSync(path.join(OUT, 'show.webm')).size / 1048576).toFixed(1)} MB`);
  app.quit();
}).catch((e) => { console.log('ERR', e && e.stack || e); app.exit(1); });
