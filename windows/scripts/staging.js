'use strict';
// The app against the shared staging API (https://api-staging.orbiterm.dev), or the local one when STAGING_API_URL is
// http://127.0.0.1:4800 (api/ next to app/ and windows/: `docker compose up -d` there), never the live one: a staging
// run like the Mac's dev.sh and STAGING build, for trying things without touching real users' data. The shared one
// answers only calls with its access key (its src/gate.ts), read from %USERPROFILE%\.atalay-terminal\staging-access-key
// and sent with every call; a staging package carries it in src/accesskey.js (gitignored, taken out again after the
// build), the local API has no gate and needs none. Its calls are signed with a key of its own, ~/.atalay-terminal/client-key-windows-staging (made here once and registered with
// the local API, whose admin token is in api/.env), so the release key, which only a release's guard holds
// (scripts/guard.js), is never needed here. It keeps its own profile ("Atalay's Terminal (staging)") and its own session
// host, so it runs next to the installed app.
//   npm run staging                  the app from the sources
//   npm run staging -- --packaged    a packaged build made as a release is (dist-staging\win-unpacked, "Orbiterm
//                                    Staging"), its guard built with this key and two decoys beside it, run from there
const cp = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const API = (process.env.STAGING_API_URL || 'https://api-staging.orbiterm.dev').replace(/\/+$/, '');
const local = /^http:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(API);
const accessFile = process.env.ATALAY_ACCESS_KEY_FILE || path.join(os.homedir(), '.atalay-terminal', 'staging-access-key');
const root = path.join(__dirname, '..');
const envFile = path.join(root, '..', '..', 'orbiterm-api', '.env');
const keyFile = path.join(os.homedir(), '.atalay-terminal', 'client-key-windows-staging');
const packaged = process.argv.includes('--packaged');

function fail(msg) {
  console.error(`staging: ${msg}`);
  process.exit(1);
}

const newKey = () => `k${crypto.randomBytes(4).toString('hex')}:${crypto.randomBytes(32).toString('hex')}`;
// Readable by this user only, like an SSH key.
function writePrivate(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, { mode: 0o600 });
  if (process.platform === 'win32') {
    cp.execFileSync('icacls', [file, '/inheritance:r', '/grant:r', `${os.userInfo().username}:F`], { stdio: 'ignore', windowsHide: true });
  }
}

// Only against a remote API: its access key, from a file this user alone can read.
let access = null;
if (!local) {
  access = fs.existsSync(accessFile) ? fs.readFileSync(accessFile, 'utf8').trim() : '';
  if (!access) fail(`the staging API (${API}) needs its access key, and ${accessFile} is missing or empty: put the key there, or use the local API (STAGING_API_URL=http://127.0.0.1:4800)`);
}
const gated = access ? { 'x-orbiterm-access': access } : {};
const accessModule = path.join(root, 'src', 'accesskey.js');

(async () => {
  const health = await fetch(`${API}/health`, { headers: gated }).then((r) => r.ok, () => false);
  if (!health) fail(local ? `no local API at ${API}: start it with \`docker compose up -d\` in api/ (Docker Desktop running)` : `the staging API at ${API} didn't answer (is the access key right?)`);
  // The local API's admin token is in api/.env; the shared one's, if this PC may register keys there, in
  // ~/.atalay-terminal/staging-admin-token. Without one the key is taken as registered already.
  const tokenFile = path.join(os.homedir(), '.atalay-terminal', 'staging-admin-token');
  const token = local
    ? ((fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '').match(/^ADMIN_TOKEN=(.+)$/m) || [])[1]
    : fs.existsSync(tokenFile) ? fs.readFileSync(tokenFile, 'utf8').trim() : null;
  if (!token && local) fail(`no ADMIN_TOKEN in ${envFile}`);

  // Registering a key again changes nothing; a fresh database (`docker compose down -v`) gets it back this way.
  const register = async (line, fields) => {
    const [id, secret] = line.trim().split(':');
    const r = await fetch(`${API}/v1/admin/client-keys/${id}`, {
      method: 'PUT',
      headers: { ...gated, authorization: `Bearer ${token.trim()}`, 'content-type': 'application/json' },
      body: JSON.stringify({ secret, ...fields }),
    });
    if (!r.ok) fail(`the local API refused key ${id}: ${r.status} ${await r.text()}`);
    return id;
  };
  if (!fs.existsSync(keyFile)) writePrivate(keyFile, newKey() + '\n');
  if (token) {
    const id = await register(fs.readFileSync(keyFile, 'utf8'), { label: `windows staging ${os.hostname()}`, platform: 'windows' });
    console.log(`staging: key ${id} registered with ${API}`);
  } else {
    console.log(`staging: no admin token for ${API}: key ${fs.readFileSync(keyFile, 'utf8').split(':')[0]} has to be registered there already`);
  }
  const profile = path.join(process.env.APPDATA || os.homedir(), "Atalay's Terminal (staging)");

  if (!packaged) {
    // ORBITERM_STAGING: the version goes out as "<next minor>-staging", as the package's does (main.js cloudVersion).
    const env = { ...process.env, ATALAY_API_URL: API, ATALAY_CLIENT_KEY_FILE: keyFile, ORBITERM_STAGING: '1' };
    if (access) env.ATALAY_ACCESS_KEY = access;
    else delete env.ATALAY_ACCESS_KEY;
    const app = cp.spawn(require('electron'), ['.', `--user-data-dir=${profile}`], { cwd: root, env, stdio: 'inherit' });
    app.on('exit', (code) => process.exit(code ?? 0));
    return;
  }

  // The packaged build: its guard holds the key among two decoys, as a release's does.
  if (process.platform !== 'win32') fail('a packaged build is made on Windows');
  const decoys = `${keyFile}.decoys`;
  if (!fs.existsSync(decoys)) writePrivate(decoys, `${newKey()}\n${newKey()}\n`);
  if (token) {
    for (const line of fs.readFileSync(decoys, 'utf8').split('\n').filter((l) => l.trim())) {
      await register(line, { label: `windows staging decoy ${os.hostname()}`, decoy: true });
    }
    console.log(`staging: its 2 decoys registered with ${API}`);
  }
  cp.execFileSync(process.execPath, [path.join(__dirname, 'fetch-rtk.js')], { stdio: 'inherit' });
  fs.rmSync(path.join(root, 'src', 'clientkey.js'), { force: true });
  // The access key goes into the staging package's sources, and out of them again as soon as it is built.
  fs.rmSync(accessModule, { force: true });
  if (access) {
    // Out again however the build ends: Ctrl+C, Ctrl+Break or the console window closed, not only an error (the
    // `finally` below). A hard kill runs nothing: the next staging or release run takes a leftover out first.
    const drop = () => fs.rmSync(accessModule, { force: true });
    process.on('exit', drop);
    for (const sig of ['SIGINT', 'SIGBREAK', 'SIGHUP', 'SIGTERM']) process.on(sig, () => process.exit(130));
    // Readable by this user only while it is there (mode 0o600 means nothing on Windows: icacls).
    writePrivate(accessModule, `module.exports = ${JSON.stringify(access)};\n`);
  }
  const builder = require('electron-builder');
  try {
    await build(builder);
  } finally {
    fs.rmSync(accessModule, { force: true });
  }
  const unpacked = path.join(root, 'dist-staging', 'win-unpacked');
  const exe = 'Orbiterm Staging.exe';
  cp.execFileSync(process.execPath, [path.join(__dirname, 'guard.js'), unpacked, keyFile, exe], { stdio: 'inherit' });
  const env = { ...process.env };
  delete env.ATALAY_API_URL;
  delete env.ATALAY_CLIENT_KEY_FILE;
  delete env.ATALAY_ACCESS_KEY;
  console.log(`staging: starting ${path.join(unpacked, exe)}`);
  const app = cp.spawn(path.join(unpacked, exe), [`--user-data-dir=${profile}`], { env, stdio: 'inherit' });
  app.on('exit', (code) => process.exit(code ?? 0));
})().catch((e) => fail(e.message));

// A staging package says which API it speaks to (main.js): the local one when that is what this run was told.
function build(builder) {
  return builder.build({
    targets: builder.Platform.WINDOWS.createTarget('dir'),
    publish: 'never',
    config: {
      productName: 'Orbiterm Staging',
      directories: { output: 'dist-staging' },
      // main.js: a staging package speaks to the staging API and never updates.
      extraMetadata: { productName: 'Orbiterm Staging', orbitermStaging: true, orbitermStagingApi: API },
    },
  });
}
