#!/bin/bash
# Rebuilds the 3D spaceship-attack show (v3) into Resources/web/attack3d/ from the research folder. One command:
#   scripts/attack3d.sh
# Reads (never writes) <orbiterm>/ara*/ekran-saldirisi-v3/{sahne,cracks,vfx}:
#   scene3d.js  esbuild bundle (iife that sets window.AttackSceneV3, a plain property so the loader can delete it after the
#               show): three r186 from orbit/node_modules, scene.js with what it imports (sahne/cockpit.js: the cockpit frame
#               and the lock-on phase, its own canvas), the meshopt decoder (wasm inside three's module) and the two scripts
#               the scene looks for on window (cracks.js -> Cracks, glass.js -> Glass, its decompression fog included)
#   assets.js   the files the scene really uses, base64 (window.__ATTACK3D_PACK): ship.glb, the exhaust / exhaust_back
#               flipbooks (impact too, only once scene.js places its sprites); no vapour atlases, no frost map (see below).
#               The notices page is a file:// page
#               where fetch() can't read a file next to it (like sounds.js), so they ride in a script and attack-screen3d.js
#               turns them into blob URLs, only when an attack comes.
# attack-screen3d.js (the loader, hand written) is not touched. Run it again after the scene's last pass.
set -euo pipefail
cd "$(dirname "$0")/.."
MAC="$PWD"
# (the research folder's name isn't ASCII; another folder matching ara* may sit beside it: the one with the scene wins)
SRC=""
for d in "$MAC"/../../ara*/ekran-saldirisi-v3; do
  [ -f "$d/sahne/scene.js" ] && { SRC="$d"; break; }
done
[ -n "$SRC" ] || { echo "v3 scene not found under $MAC/../../ara*/ekran-saldirisi-v3" >&2; exit 1; }
M="$MAC/orbit/node_modules"
[ -x "$M/.bin/esbuild" ] || { echo "orbit/node_modules missing: cd orbit && npm install" >&2; exit 1; }
OUT="$MAC/Resources/web/attack3d"
mkdir -p "$OUT"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cat > "$TMP/entry.js" <<EOF
import '$SRC/cracks/cracks.js';
import '$SRC/cracks/glass.js';
import * as scene from '$SRC/sahne/scene.js';
window.AttackSceneV3 = scene;
EOF
NODE_PATH="$M" "$M/.bin/esbuild" "$TMP/entry.js" --bundle --format=iife --minify \
  --target=es2020,safari16 --legal-comments=none --log-level=warning --outfile="$OUT/scene3d.js"
# the lock-on's timeline (T.LOCK_START / FRAME_DEPLOYED / FRAME_RETRACT, from cockpit.js) must be in it: the loader starts there
for k in LOCK_START FRAME_DEPLOYED FRAME_RETRACT; do
  grep -q "$k" "$OUT/scene3d.js" || { echo "scene3d.js has no T.$k (cockpit.js missing?)" >&2; exit 1; }
done

# No frost map and no vapour atlases: the approved scene (sahne/preview.html) runs with frostUrl:false (the glass layer's
# procedural frost) and without the slit/sink wisps (they read as smoke). The loader mirrors that.
SRC="$SRC" OUT="$OUT" node - <<'JS'
const fs = require('fs'), path = require('path');
const { SRC, OUT } = process.env;
const b64 = (p) => fs.readFileSync(path.resolve(SRC, p)).toString('base64');
const json = (p) => JSON.parse(fs.readFileSync(path.join(SRC, p), 'utf8'));
const sprite = (n) => { const j = json(`vfx/${n}.json`); return { b64: b64(`vfx/${n}.webp`), mime: 'image/webp', json: { columns: j.columns, rows: j.rows, frames: j.frames, fps: j.fps, loop: j.loop } }; };
// The impact flipbook (a 4096x2048 atlas) only rides along once the scene draws it (glass.js draws the impacts for now).
const scene = fs.readFileSync(path.join(SRC, 'sahne/scene.js'), 'utf8');
const sprites = { exhaust: sprite('exhaust'), exhaustBack: sprite('exhaust_back') };
if (/impactS\s*(\[|\.forEach|\.map)/.test(scene)) sprites.impact = sprite('impact');
const pack = { ship: b64('sahne/ship.glb'), sprites };
fs.writeFileSync(path.join(OUT, 'assets.js'), "'use strict';\n// Written by scripts/attack3d.sh from the v3 research folder; do not edit.\nwindow.__ATTACK3D_PACK = " + JSON.stringify(pack) + ';\n');
console.log(`assets: ship, sprites ${Object.keys(sprites).join(' ')}`);
JS
ls -l "$OUT" | awk 'NR>1{print $5, $9}'
du -ck "$OUT"/* | tail -1 | awk '{print "total " $1 " KB"}'
