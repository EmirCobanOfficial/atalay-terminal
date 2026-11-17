'use strict';
// Viktoria's model and motions are loose files in the Mac app's web folder (mascot/vrm), and electron-builder packs
// whatever is on this PC's disk (it doesn't read .gitignore), so a build made without them would ship a mascot that never
// loads. Called before a packaged build is made: `fail(message)` stops it.
const fs = require('fs');
const path = require('path');

const VRM = path.join(__dirname, '..', '..', 'mac', 'Resources', 'web', 'mascot', 'vrm');
const MOTIONS = ['cheer', 'fall', 'idle', 'jump', 'land', 'point', 'press', 'sit', 'sleep', 'surprised', 'walk', 'wave'];

module.exports = function checkMascotFiles(fail) {
  const need = ['Mei.vrm', 'anims.pak', ...MOTIONS.map((m) => `anims/${m}.fbx`)];
  const missing = need.filter((f) => !fs.existsSync(path.join(VRM, f)));
  if (missing.length) fail(`Viktoria's files are missing from ${VRM}: ${missing.join(', ')}. Copy them in first, a build without them would ship a mascot that never loads`);
};
