'use strict';
// Cursor's usage limit for the top bar, the Windows side of the Mac's CursorUsage.swift: what the CLI's own /usage shows,
// asked of Cursor's server the way it asks (api2.cursor.sh, DashboardService, with the account's access token). On
// Windows the CLI keeps that token under %APPDATA%\Cursor (auth.json, or DPAPI-sealed in auth.dpapi; the Mac keeps it in the
// Keychain). It is read for one look and lives in memory for it only: never logged, written down, shown or sent anywhere
// but to the address it was asked for (a redirect is not followed). Nothing is renewed or written to Cursor's
// credentials; without a login, or when the server says no (401/403), no limit shows. The endpoint isn't a public API:
// when it changes, the limit just goes.
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const HOST = 'api2.cursor.sh';
const BASE = '/aiserver.v1.DashboardService/';

const clean = (t) => (typeof t === 'string' && (t = t.trim()) && t.length < 16_384 && !/\s/.test(t) ? t : null);

// Windows' DPAPI for this user, through PowerShell (Node has none): the blob goes in on stdin, the access token comes out
// on stdout, and neither is ever on a command line, in a file or in a log. Null on any failure.
function unprotect(b64) {
  return new Promise((resolve) => {
    const { execFile } = require('child_process');
    const script = '$ErrorActionPreference="Stop"; Add-Type -AssemblyName System.Security; ' +
      '$b = [Convert]::FromBase64String([Console]::In.ReadToEnd().Trim()); ' +
      '$p = [Security.Cryptography.ProtectedData]::Unprotect($b, $null, "CurrentUser"); ' +
      '$j = [Text.Encoding]::UTF8.GetString($p) | ConvertFrom-Json; [Console]::Out.Write([string]$j.accessToken)';
    const child = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { windowsHide: true, timeout: 15_000, maxBuffer: 64 * 1024 }, (err, out) => resolve(err ? null : clean(out)));
    child.stdin.end(b64);
  });
}

// The access token, null when there is no login (or the files read as anything else): never anything but the token.
// Older CLIs keep it in auth.json itself; newer ones write auth.json as { storedIn: "os-secret-store" } and keep it in
// auth.dpapi next to it, { version: 1, dpapi: "<base64 DPAPI blob for this user>" } holding { accessToken, refreshToken }.
async function token(authFile) {
  try {
    const j = JSON.parse(fs.readFileSync(authFile, 'utf8').replace(/^﻿/, ''));
    if (j && typeof j.accessToken === 'string') return clean(j.accessToken);
    if (!j || j.storedIn !== 'os-secret-store' || process.platform !== 'win32') return null;
    const w = JSON.parse(fs.readFileSync(path.join(path.dirname(authFile), 'auth.dpapi'), 'utf8').replace(/^﻿/, ''));
    if (!w || typeof w.dpapi !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(w.dpapi) || w.dpapi.length > 65_536) return null;
    return await unprotect(w.dpapi);
  } catch {
    return null;
  }
}

// The team a team account asks as (the CLI sends it too), from the CLI's own config.
function team(cursorDir) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(cursorDir, 'cli-config.json'), 'utf8').replace(/^﻿/, ''));
    const id = j && j.authInfo && j.authInfo.activeTeamId;
    if (id === undefined || id === null) return null;
    const s = String(id);
    return !s || s === '0' || s.length > 64 || !/^[\w-]+$/.test(s) ? null : s;
  } catch {
    return null;
  }
}

// One POST with an empty body: its status, its JSON (null when it has none) and Retry-After (s). Status 0: no answer. No
// redirect is followed (https.request never does), no cookie or cache kept.
function post(method, tok, teamId) {
  return new Promise((resolve) => {
    const body = '{}';
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), Authorization: `Bearer ${tok}` };
    if (teamId) headers['x-cursor-team-id'] = teamId;
    let settled = false;
    const done = (v) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    const req = https.request({ host: HOST, path: BASE + method, method: 'POST', headers, timeout: 15_000 }, (res) => {
      const chunks = [];
      let size = 0;
      res.on('data', (c) => {
        size += c.length;
        if (size <= 1 << 20) chunks.push(c);
      });
      res.on('end', () => {
        let json = null;
        try {
          const j = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          json = j && typeof j === 'object' && !Array.isArray(j) ? j : null;
        } catch {}
        const ra = Number(res.headers['retry-after']);
        done({ status: res.statusCode || 0, json, retryAfter: Number.isFinite(ra) ? ra : null });
      });
      res.on('error', () => done({ status: 0, json: null, retryAfter: null }));
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => done({ status: 0, json: null, retryAfter: null }));
    req.end(body);
  });
}

const number = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null);

/**
 * One look: the plan's included usage in percent (`planUsage.totalPercentUsed`, missing when 0) and when the billing cycle
 * ends, as the top bar's "week" cell says it, with "monthly" for its words. Resolves to { kind: 'value', value } (to ask
 * again in 5 or 30 minutes), { kind: 'none' } (no login, a refusal, no plan usage: nothing to show) or { kind: 'retry',
 * after } (seconds: a failure that may pass, what was shown stays). Never rejects. `authFile`, `cursorDir` and `post` are
 * for tests.
 */
async function readCursorUsage({
  authFile = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Cursor', 'auth.json'),
  cursorDir = process.env.CURSOR_CONFIG_DIR || path.join(os.homedir(), '.cursor'),
  post: ask = post,
} = {}) {
  try {
    // Only where Cursor's CLI has logged in: no file, no request.
    let tok = await token(authFile);
    if (!tok) return { kind: 'none' };
    const teamId = team(cursorDir);
    try {
      const usage = await ask('GetCurrentPeriodUsage', tok, teamId);
      if (usage.status === 401 || usage.status === 403) return { kind: 'none' };
      if (usage.status !== 200 || !usage.json) return { kind: 'retry', after: Math.max(usage.retryAfter || 0, 600) };
      // No plan usage at all (a team plan that has none): no limit to show.
      const plan = usage.json.planUsage;
      if (!plan || typeof plan !== 'object') return { kind: 'none' };
      const pct = Math.min(100, Math.max(0, number(plan.totalPercentUsed) ?? 0));
      const end = number(usage.json.billingCycleEnd) ?? 0;
      let name = '';
      const info = await ask('GetPlanInfo', tok, teamId);
      const n = info.status === 200 && info.json && info.json.planInfo && info.json.planInfo.planName;
      if (typeof n === 'string') name = n.slice(0, 40);
      return {
        kind: 'value',
        value: {
          week: { pct, resetsAt: end }, windows: ['week'], labels: { week: 'monthly' }, monthly: true,
          at: Date.now(), plan: name, source: 'Cursor', id: 'cursor', name: 'cursor',
        },
      };
    } finally {
      tok = null;
    }
  } catch {
    return { kind: 'retry', after: 600 };
  }
}

module.exports = { readCursorUsage };
