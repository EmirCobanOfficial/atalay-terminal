'use strict';
// A terminal window's Claude account (the Mac's ClaudeAccountsChat.swift; spec §4 to §7, option A "title chip"): what the chip
// and the notes under the header show, the menu, and the switch that waits for a reply to end.
// Hard rules: a switch happens only on the user's click (After This Reply is one); nothing counts down, rotates or runs by
// itself; no usage endpoint is asked (the limits come from the status line files and the transcript's 429); no token is read.
// This file decides and describes; main.js does the switching (it restarts the pane's shell) and shows the menu.
const DEFAULT_ID = 'default';
const SEEN_KEY = 'claudeAccountsLowSeen';

const mark = (a) => ({ id: a.id, label: a.label, initial: a.initial, hue: a.hue });
// A name in a native menu's label: Windows takes "&" for the underlined access key, "&&" is a plain "&".
const amp = (s) => (process.platform === 'win32' ? String(s).replace(/&/g, '&&') : String(s));
const hhmm = (ms) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
function clockText(ms, full = false) {
  if (ms - Date.now() < 20 * 3600_000) return hhmm(ms);
  const day = new Date(ms).toLocaleDateString('en-US', { weekday: 'long' });
  return full ? `${day} ${hhmm(ms)}` : day;
}

/** The windows (percent left, when it fills again) of an account, from its status line file. */
function windowsOf(accounts, a) {
  const j = accounts.limits(a);
  const one = (w) => {
    if (!w || typeof w.pct !== 'number') return null;
    const resets = w.resetsAt || 0;
    if (resets > 0 && resets <= Date.now()) return null;
    return { left: 100 - Math.min(100, Math.max(0, w.pct)), resets };
  };
  const five = one(j && j.fiveHour), week = one(j && j.week);
  const lefts = [five && five.left, week && week.left].filter((x) => typeof x === 'number');
  return { five, week, minLeft: lefts.length ? Math.min(...lefts) : null };
}

/**
 * accounts: claudeaccounts.js. settings: the app's settings (get/set), where the 5% notes already shown are kept.
 */
function createAcctWindow({ accounts, settings }) {
  // sid -> account id: the switches waiting for a reply to end (memory only: an app restart drops them).
  const pending = new Map();
  const limitQuiet = new Set(); // sessions whose limit note "Not now" hid, until the next limit hit
  const lowQuiet = new Set(); // 5% notes "Not now" hid
  const went = new Map(); // terminal id -> { note, at }: the quiet note after a switch, until the next prompt
  const last = new Map(); // terminal id -> the note the page shows now
  const showing = new Map(); // terminal id -> the key of the 5% note it shows

  const seen = (k) => (Array.isArray(settings.get(SEEN_KEY)) ? settings.get(SEEN_KEY) : []).includes(k);
  function shown(k) {
    const list = Array.isArray(settings.get(SEEN_KEY)) ? settings.get(SEEN_KEY).slice() : [];
    if (list.includes(k)) return;
    list.push(k);
    settings.set(SEEN_KEY, list.slice(-60));
  }

  /** The account a pane runs under: its Claude session's (the registry it was found in), else the one its shell started with. */
  function idOf(c, s) {
    return (s && s.account) || (c && c.account) || DEFAULT_ID;
  }

  /**
   * What the page shows for one pane: { chip, note } or null (one account only, or another AI tool runs in it, as the Mac).
   * s: the pane's Claude session (engine.live()'s entry), tool: another AI running in it.
   */
  function view(id, c, s, tool) {
    if (!accounts.multiple() || tool) {
      last.delete(id);
      went.delete(id);
      return null;
    }
    const cur = accounts.account(idOf(c, s)) || accounts.defaultAccount();
    const me = mark(cur);
    const w = windowsOf(accounts, cur);
    const sid = s ? s.sessionId : '';
    const pendingTo = s && pending.get(sid) ? accounts.account(pending.get(sid)) : null;
    const out = (w.five ? w.five.left : 100) <= 0 || (w.week ? w.week.left : 100) <= 0 || !!(s && s.limitHit);
    const chip = { mark: me, left: w.minLeft === null ? null : Math.round(w.minLeft), out, pending: pendingTo ? mark(pendingTo) : null };
    let note = null;
    const hold = went.get(id);
    if (!s) {
      // Right after a switch the new Claude has not registered yet: its note stays a little.
      if (hold && Date.now() - hold.at < 30_000) note = hold.note;
      else went.delete(id);
    } else if (hold && hold.note.kind === 'switching') {
      note = hold.note;
    } else if (hold) {
      // Until the next prompt (the chat is busy again after the switch).
      if (s.status === 'busy' && s.statusSince > hold.at) went.delete(id);
      else note = hold.note;
    }
    if (!note && s) note = notice(id, s, cur, me, w);
    if (!(note && note.kind === 'low')) showing.delete(id);
    const prev = last.get(id);
    if (note && note.kind === 'low' && !(prev && prev.kind === 'low' && prev.key === note.key)) shown(note.key);
    if (note) last.set(id, note);
    else last.delete(id);
    return { chip, note };
  }

  /** The limit note wins over the 5% note. */
  function notice(id, s, cur, me, w) {
    if (!s.limitHit) limitQuiet.delete(s.sessionId);
    // The accounts a note may offer: signed in, and outside this account's quota (another organization).
    const others = accounts.all().filter((a) => a.id !== cur.id && (!cur.orgId || a.orgId !== cur.orgId) && (a.isDefault || a.email));
    // What another account has left; one with nothing seen yet (no reply under it so far) counts as having room.
    const room = (a) => { const m = windowsOf(accounts, a).minLeft; return m === null ? 100 : m; };
    const best = others.map((a) => [a, room(a)]).filter(([, r]) => r > 0).sort((x, y) => y[1] - x[1])[0];
    if (s.limitHit && !limitQuiet.has(s.sessionId)) {
      const weekOut = (w.week ? w.week.left : 100) <= 0 && (w.five ? w.five.left : 0) > 0;
      const reset = (weekOut ? w.week && w.week.resets : w.five && w.five.resets) || 0;
      const fills = reset > 0 ? (weekOut ? `on ${clockText(reset)}` : `at ${clockText(reset)}`) : 'later';
      const what = weekOut ? 'weekly limit' : '5-hour limit';
      if (best) return { kind: 'limit', from: me, what, fills, to: mark(best[0]), otherOut: null, sid: s.sessionId };
      if (others.length) {
        const r = (windowsOf(accounts, others[0]).five || {}).resets || 0;
        const otherOut = others.length === 1 ? `${others[0].label} is out too${r > 0 ? `, until ${clockText(r)}` : ''}.` : 'The others are out too.';
        return { kind: 'limit', from: me, what, fills, to: null, otherOut, sid: s.sessionId };
      }
      return null;
    }
    if (s.limitHit) return null;
    // 5% or less in a window, and another account has more than 20% in that window, once per window per reset.
    for (const [name, win] of [['5h', w.five], ['week', w.week]]) {
      if (!win || win.left > 5) continue;
      const alt = others.map((a) => {
        const ow = windowsOf(accounts, a);
        return [a, (ow.minLeft === null ? 100 : ow.minLeft) > 0 ? ((name === '5h' ? ow.five : ow.week) || { left: 100 }).left : 0];
      }).filter(([, l]) => l > 20).sort((x, y) => y[1] - x[1])[0];
      if (!alt) continue;
      const key = `${cur.id}|${name}|${Math.trunc(win.resets)}`;
      const isShowing = showing.get(id) === key;
      if ((seen(key) && !isShowing) || lowQuiet.has(key)) continue;
      showing.set(id, key);
      // Idle only at YOUR TURN: a permission question is still inside the reply.
      return { kind: 'low', from: me, what: name, to: mark(alt[0]), idle: s.status === 'idle', key, sid: s.sessionId };
    }
    return null;
  }

  /** The note's buttons. `a`: { action: 'continue' | 'notNow' | 'dismiss', to, now }. Returns the switch to do now, or null. */
  function noteAction(id, a) {
    const note = last.get(id);
    if (!note) return null;
    if (a.action === 'continue' && accounts.account(a.to)) {
      if (note.kind === 'low' && (!note.idle || !a.now)) {
        pending.set(note.sid, a.to);
        last.delete(id);
        return null;
      }
      last.delete(id);
      return { to: a.to };
    }
    if (a.action === 'notNow') {
      if (note.kind === 'limit') limitQuiet.add(note.sid);
      else if (note.kind === 'low') lowQuiet.add(note.key);
    }
    last.delete(id);
    if (a.action === 'dismiss') went.delete(id);
    return null;
  }

  /** The switches whose reply ended: one runs when its session is at YOUR TURN; one whose session has ended or left, or whose
   *  account is gone or used up, is dropped without switching. live: engine.live(). Returns [{ id, to }]. */
  function due(live, has) {
    const out = [];
    for (const [sid, to] of [...pending]) {
      const s = live.find((x) => !x.ai && x.sessionId === sid);
      const target = accounts.account(to);
      const m = target ? windowsOf(accounts, target).minLeft : null;
      if (!s || !s.tab || !has(s.tab) || !target || (m === null ? 100 : m) <= 0) {
        pending.delete(sid);
        continue;
      }
      // A permission question (NEEDS YOU) is not the end of a reply: it waits.
      if (s.status === 'idle') {
        pending.delete(sid);
        out.push({ id: s.tab, to });
      }
    }
    return out;
  }

  /** The quiet note after a switch, or "Switching to …" while it runs. */
  function setWent(id, note) {
    went.set(id, { note, at: Date.now() });
    last.set(id, note);
  }
  function wentNote(to, fromLabel, fills) {
    return { kind: 'went', to: mark(to), fromLabel, fills: fills || null };
  }
  const switching = (to) => ({ kind: 'switching', to: mark(to) });
  const forget = (id) => {
    went.delete(id);
    last.delete(id);
    showing.delete(id);
  };

  /** Fills text for the "went on" note: when the account left fills again. */
  function fillsOf(a) {
    const r = a ? (windowsOf(accounts, a).five || {}).resets : 0;
    return r > 0 ? `at ${clockText(r)}` : null;
  }

  /**
   * The menu (Electron template): the accounts with what each has left, the switch when the reply ends, add and manage.
   * h: { pick(id), pend(id), cancel(), now(id), settings(add) }.
   */
  function menuTemplate(id, c, s, h) {
    const curId = idOf(c, s);
    const list = accounts.all();
    const curAcc = list.find((a) => a.id === curId);
    // Claude's reply runs: answering, or asking a permission question inside it.
    const working = !!s && (s.status === 'busy' || s.status === 'waiting');
    const pend = s ? pending.get(s.sessionId) : null;
    const t = [{ label: 'Claude Account for This Tab', enabled: false }];
    for (const a of list) {
      const w = windowsOf(accounts, a);
      let sub;
      if (a.id !== curId && curAcc && a.orgId && curAcc.orgId === a.orgId) sub = `shares ${curAcc.label}’s limits`;
      else if (pend === a.id) sub = `◷ next, when this reply ends${w.five ? ` · 5h ${Math.round(w.five.left)}% left` : ''}`;
      else if (!w.five && !w.week) sub = 'no limits seen yet';
      else {
        const wk = w.week ? ` · week ${Math.round(w.week.left)}%` : '';
        if (!w.five) sub = `week ${Math.round(w.week.left)}% left`;
        else if (w.five.left <= 0) sub = `5h used up, fills again ${clockText(w.five.resets)}${wk}`;
        else if (w.five.left < 50) sub = `5h ${Math.round(w.five.left)}% left, fills again ${clockText(w.five.resets)}${wk}`;
        else sub = `5h ${Math.round(w.five.left)}% left${wk}`;
      }
      t.push({ label: amp(`${a.label}${a.email ? `   ${a.email}` : ''}`), type: 'checkbox', checked: a.id === curId, sublabel: sub, click: () => h.pick(a.id) });
      // Windows' menus show no sublabel: it is a dimmed line under the account.
      t.push({ label: amp(`      ${sub}`), enabled: false });
    }
    if (s && working && list.length >= 2) {
      t.push({ type: 'separator' });
      const others = list.filter((a) => a.id !== curId);
      const target = pend ? accounts.account(pend) : null;
      if (target) {
        t.push({ label: amp(`Cancel Switch to ${target.label}`), click: () => h.cancel() });
        t.push({ label: amp(`Continue with ${target.label} Now`), click: () => h.now(target.id) });
      } else if (others.length === 1) {
        t.push({ label: amp(`Switch to ${others[0].label} When This Reply Ends`), click: () => h.pend(others[0].id) });
      } else if (others.length > 1) {
        t.push({ label: 'Switch When This Reply Ends', submenu: others.map((o) => ({ label: amp(o.label), click: () => h.pend(o.id) })) });
      }
    } else if (s && pend && accounts.account(pend)) {
      t.push({ type: 'separator' });
      t.push({ label: amp(`Cancel Switch to ${accounts.account(pend).label}`), click: () => h.cancel() });
    }
    t.push({ type: 'separator' });
    t.push({ label: 'Add Claude Account…', click: () => h.settings(true) });
    t.push({ label: 'Manage Claude Accounts…', click: () => h.settings(false) });
    return t;
  }

  return {
    view, noteAction, due, menuTemplate, idOf, setWent, wentNote, switching, forget, fillsOf, mark,
    pending: { set: (sid, to) => pending.set(sid, to), get: (sid) => pending.get(sid), delete: (sid) => pending.delete(sid) },
    windows: (a) => windowsOf(accounts, a),
  };
}

module.exports = { createAcctWindow, windowsOf, clockText };
