'use strict';

// Friends, requests, statuses and messages, shared by the dashboard (main menu, badges) and the message box.
// Calls go through Swift (the "cloud" handler adds the device token) and live events come from its WebSocket.
window.Social = (() => {
  const h = window.webkit.messageHandlers.cloud;
  const api = (method, path, body) => h.postMessage({ type: 'social', method, path, body }).catch(() => ({ error: 'offline' }));
  // The leaderboard's span and who's on it: friends this week as the old `by=friends`, friends ever with `friends=1`,
  // and an optional Monday `week=YYYY-MM-DD` for past weeks.
  const boardQuery = (by, friends, week) => {
    const base = by === 'all' ? `by=all${friends ? '&friends=1' : ''}` : `by=${friends ? 'friends' : 'week'}`;
    return by !== 'all' && week ? `${base}&week=${encodeURIComponent(week)}` : base;
  };

  // What friends see, and what each status means (like Discord's).
  const PRESENCE = {
    online: { label: 'online', hint: 'friends see you online' },
    idle: { label: 'away', hint: 'also on by itself after 10 min without input' },
    dnd: { label: 'do not disturb', hint: 'no message sounds or pop-ups' },
    invisible: { label: 'invisible', hint: 'you look offline, chat still works' },
    offline: { label: 'offline', hint: '' },
  };
  const dot = (p) => `<i class="pdot p-${p || 'offline'}" title="${PRESENCE[p || 'offline'].label}"></i>`;
  // The app's own id for a message (a random UUID): its row in the chat, and a message sent twice counts once.
  const uuid = () => {
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  };
  const handle = (p) => `${p.name}#${String(p.tag).padStart(4, '0')}`;

  let S = null; // { me: {id, name, tag, status}, friends, incoming, outgoing }
  const subs = new Set();
  const emit = (ev) =>
    subs.forEach((f) => {
      try {
        f(ev, S);
      } catch (e) {
        console.error(e);
      }
    });

  // Your ORB (the economy, CONTRACT v3): the API's `orb` object, all money in units of 1/10000 ORB. Kept from /v1/orb/me,
  // the friends snapshot (`me.orb`), every `orb` push and the answers of a fire or a cancel; `orb_settings` pushes change
  // the shared numbers (price, limits, rate) in place for every label. The heartbeat's copy (cloud.js render) is taken
  // only when no live copy came in the last few seconds: it is a little older than a push, and matters when the socket is down.
  let O = null;
  let orbAt = 0; // when a live copy last came (ms)
  const orbText = (units, signed) => {
    const u = Math.trunc(Number(units) || 0);
    const v = Math.floor(Math.abs(u) / 100) / 100; // floor to 2 decimals, never round up
    const t = v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return signed ? `${u < 0 ? '\u2212' : '+'}${t}` : t;
  };
  const setOrb = (o, beat) => {
    if (!o || typeof o !== 'object') return;
    if (beat && Date.now() - orbAt < 5000) return;
    if (!beat) orbAt = Date.now();
    O = { ...(O || {}), ...o };
    emit({ type: 'orb_state' });
  };
  function loadOrb() {
    return api('GET', 'v1/orb/me').then((r) => {
      if (r && !r.error && r.orb) setOrb(r.orb);
      return r;
    });
  }

  // The API's clock against this computer's (ms, the API ahead when positive), from the friends list and a nudge's answer: the
  // nudge button counts its minute down against it (nudge.ts), so a clock a few seconds off still starts at 59.
  let nudgeSkew = 0;
  const syncNow = (r) => {
    if (r && typeof r.now === 'number' && Number.isFinite(r.now)) nudgeSkew = r.now - Date.now();
  };
  let loading = null;
  function load() {
    loading =
      loading ||
      api('GET', 'v1/social').then((r) => {
        loading = null;
        if (r && !r.error) {
          S = r;
          syncNow(r);
          for (const a of (r.me && r.me.attacksUnseen) || []) atkOwner.set(a.id, a.from.id);
          if (r.me && r.me.orb && typeof r.me.orb === 'object') (O = { ...(O || {}), ...r.me.orb }), (orbAt = Date.now());
          emit({ type: 'snapshot' });
        }
        return r;
      });
    return loading;
  }

  // Notifications from the developer (the admin page): the newest 100 and how many are unread. Loaded when the line
  // (re)connects and kept up by live events.
  let N = null;
  function loadNotes() {
    return api('GET', 'v1/notifications').then((r) => {
      if (r && !r.error) {
        N = { list: r.notifications, unread: r.unread };
        emit({ type: 'notes' });
      }
      return r;
    });
  }

  // Shared notes: the invites waiting for you (the corner notice, the bell and the notes board show them) and the notes you're in.
  // `v1/notes` lists both; live `note.*` events keep them up.
  // Where the app can't share notes yet (a Windows app without its notes bridge) the invites aren't shown either; the Windows app
  // that shares says so before the page loads (preload.js `__notesSharing`).
  const SHARING = window.__platform !== 'win32' || window.__notesSharing === true;
  let NI = []; // invites waiting: { id, title, owner, members, ai, pending }
  let NS = null; // the notes you're in (accepted), or null before the first answer
  function loadNoteInvites() {
    if (!SHARING) return Promise.resolve({ notes: [] });
    return api('GET', 'v1/notes').then((r) => {
      if (r && !r.error && Array.isArray(r.notes)) {
        NI = r.notes.filter((n) => n.pending);
        NS = r.notes.filter((n) => !n.pending);
        emit({ type: 'noteInvites' });
      }
      return r;
    });
  }

  const friend = (id) => (S ? S.friends.find((f) => f.id === id) : null);
  // What this app can show, told to the API on every connect (POST v1/social/caps; the API's live.ts CAPS): friends' nudge and
  // fire buttons grey out with "needs to update" for an app that doesn't say it (an older one), so nobody spends ORB for nothing.
  // `nudge`: shows a nudge it gets. `attack-screen`: the full-screen ship attack (Mac and Windows both; the same
  // condition as attack.js SCREEN). `nudge-chat`: this app reports which chats are open (messages.js, POST v1/social/chats), so a
  // friend's nudge only works while their chat with that friend is open (Mac and Windows both: Messages.swift / main.js chatSeen).
  // Only the main page says it (the notices and chat panels share the app's connection).
  const NUDGE_CHAT = true;
  // `attack-revenge`: a fire back shows even on do not disturb (attack.js arrive).
  const CAPS = ['nudge', ...(NUDGE_CHAT ? ['nudge-chat'] : []), 'attack-screen', 'attack-revenge'];
  const announceCaps = () => {
    if (window.__MESSAGES_ROLE__) return;
    api('POST', 'v1/social/caps', { caps: CAPS }).catch(() => {});
  };
  announceCaps();
  // Who fired at me (attack.js, messages.js): which friend each unseen attack on you is from, so a seen one (`attack_seen`,
  // from another of your computers too) lowers that friend's count. Filled from the live `attack_landed` and from the
  // friends list's `me.attacksUnseen`; one not known here (a count beyond the list's five) makes the list load again.
  const atkOwner = new Map();
  // The ones already counted down here (your own × or chat, then the API's echo of it): not counted again, no reload.
  const atkSeen = new Set();
  // A friend wrote or nudged you (nudge.ts): your three unanswered nudges are answered, so only the minute after your last one
  // still waits (the API decides on send all the same).
  const answered = (f, had) => {
    if (!had || had.why !== 'unanswered') return;
    const mineAt = had.last && had.last.mine ? new Date(had.last.at).getTime() : 0;
    f.nudge = { ...(f.nudge || had), why: 'cooldown', readyAt: mineAt ? mineAt + 60_000 : null };
  };
  const drop = (list, id) => list.filter((r) => r.id !== id);

  // A live event updates the snapshot in place, then every view re-renders from it.
  function event(ev) {
    if (!ev || !ev.type) return;
    // (Re)connected: anything that happened while the line was down is in a fresh snapshot.
    if (ev.type === 'hello') loadNotes(), loadNoteInvites(), loadOrb(), announceCaps();
    // Your ORB changed (an earn, a grant, an attack's cost or refund) or the economy's numbers did: kept before anything else.
    if (ev.type === 'orb' && ev.orb) (O = { ...(O || {}), ...ev.orb }), (orbAt = Date.now());
    // The price or the rules changed (CONTRACT v3): /v1/orb/me and the friends list again.
    if (ev.type === 'orb_settings' && ev.settings) {
      O = { ...(O || {}), ...ev.settings };
      loadOrb();
      if (S) load();
    }
    if (ev.type === 'hello' || !S) {
      load().then(() => emit(ev));
      return;
    }
    switch (ev.type) {
      case 'request':
        if (!S.incoming.some((r) => r.id === ev.request.id)) S.incoming.unshift(ev.request);
        break;
      case 'outgoing':
        if (!S.outgoing.some((r) => r.id === ev.request.id)) S.outgoing.unshift(ev.request);
        break;
      case 'note.invite':
        if (SHARING && ev.note && !NI.some((n) => n.id === ev.note.id)) NI.unshift(ev.note);
        break;
      case 'note.invite_gone':
        NI = drop(NI, ev.id);
        break;
      case 'note.added':
        if (ev.note) {
          NI = drop(NI, ev.note.id);
          NS = [ev.note, ...(NS || []).filter((n) => n.id !== ev.note.id)];
        }
        break;
      case 'note.removed':
      case 'note.unshared':
        if (NS) NS = drop(NS, ev.id);
        break;
      case 'request_gone':
        S.incoming = drop(S.incoming, ev.id);
        S.outgoing = drop(S.outgoing, ev.id);
        break;
      case 'friend':
        S.incoming = drop(S.incoming, ev.requestId);
        S.outgoing = drop(S.outgoing, ev.requestId);
        if (!friend(ev.friend.id)) S.friends.unshift({ ...ev.friend, unread: 0, last: null });
        break;
      case 'unfriended':
        S.friends = drop(S.friends, ev.id);
        break;
      case 'presence': {
        const f = friend(ev.id);
        if (!f) break;
        ev.was = f.presence || 'offline'; // so a view can tell a friend coming online from a status change
        f.presence = ev.presence;
        break;
      }
      case 'status':
        S.me.status = ev.status;
        break;
      // A friend's spaceship-attack switch or shield changed (or yours: your shield; attack.js greys the buttons).
      case 'attack_state': {
        if (ev.id === S.me.id) {
          if ('shieldUntil' in ev) S.me.shieldUntil = ev.shieldUntil;
          break;
        }
        const f = friend(ev.id);
        if (!f) break;
        f.attack = { ...(f.attack || {}) };
        if ('off' in ev) f.attack.off = !!ev.off;
        if ('shieldUntil' in ev) f.attack.shieldUntil = ev.shieldUntil;
        // Your right to fire back at them (they fired at you): given, used up, or given back by a cancel (attack.ts).
        if ('revengeUntil' in ev) f.attack.revengeUntil = ev.revengeUntil;
        // Your cooldown on them: cleared (staging's reset) or the longer one after you cancelled (attack.ts).
        if ('cooldownUntil' in ev) f.attack.cooldownUntil = ev.cooldownUntil;
        break;
      }
      // A fired attack's line in a chat, live (the API sends it 10 s after the fire, once the blast came): the friend's row says
      // it (`attack.last`) and, when it was theirs, counts it as unseen until you look.
      case 'attack_landed': {
        const a = ev.attack;
        const f = a && friend(a.with);
        if (!f) break;
        f.attack = { ...(f.attack || {}), last: { mine: !!a.mine, at: a.at } };
        // Once: a friends list loaded just after it landed already counted it (and named it in `attacksUnseen`).
        if (!a.mine && !atkOwner.has(a.id) && !atkSeen.has(a.id)) {
          f.attack.unseen = (f.attack.unseen || 0) + 1;
          atkOwner.set(a.id, f.id);
        }
        break;
      }
      // Seen on one of your computers (the card's ×, a chat opened): the count follows on all of them.
      case 'attack_seen': {
        let unknown = false;
        for (const id of ev.ids || []) {
          if (atkSeen.has(id)) continue;
          const f = friend(atkOwner.get(id));
          if (!f || !f.attack) {
            unknown = true;
            continue;
          }
          f.attack = { ...f.attack, unseen: Math.max(0, (f.attack.unseen || 0) - 1) };
          atkOwner.delete(id);
          atkSeen.add(id);
        }
        if (unknown) load();
        break;
      }
      // A friend's nudge, or yours from another of your computers (nudge.ts): the row says it (`nudge.last`) and, when it was
      // theirs, counts it as unread until you open the chat. `floored`: a second one from the same friend within a minute (by
      // the nudges' own times, so every page of the app agrees): its line and count, but no shake, card or sound.
      case 'nudge': {
        const n = ev.nudge;
        const f = n && friend(n.with);
        if (!f) break;
        const at = new Date(n.at).getTime();
        const had = f.nudge || {};
        // The same one again: no second buzz, shake or card.
        if (had.lastId === n.id) {
          n.floored = true;
          break;
        }
        f.nudge = { ...had, lastId: n.id, last: { mine: !!n.mine, at: n.at } };
        if (n.mine) {
          if (n.readyAt) (f.nudge.readyAt = n.readyAt), (f.nudge.why = n.why === 'unanswered' ? 'unanswered' : 'cooldown');
        } else {
          f.nudge.unread = (had.unread || 0) + 1;
          n.floored = !!(had.lastIn && at - had.lastIn < 60_000);
          f.nudge.lastIn = at;
          answered(f, had);
        }
        break;
      }
      // Staging test reset (nudge.ts, POST v1/friends/nudge/reset): the limits on that friend's row are gone.
      case 'nudge_reset': {
        const f = friend(ev.id);
        if (f && f.nudge) f.nudge = { ...f.nudge, why: null, readyAt: null, unread: 0, last: null, lastId: null, lastIn: null };
        break;
      }
      // What a friend's app can show changed (the API's `caps`, sent as they connect): "needs to update" goes or comes on their
      // nudge and fire buttons. Only for a friend the API says is online.
      case 'caps': {
        const f = friend(ev.id);
        if (!f) break;
        const caps = Array.isArray(ev.caps) ? ev.caps : [];
        f.nudge = { ...(f.nudge || {}), outdated: !caps.includes('nudge'), away: caps.includes('nudge-chat') && !!ev.away };
        f.attack = { ...(f.attack || {}), outdated: !caps.includes('attack-screen') };
        break;
      }
      // A friend opened or closed their chat with you (the API's `nudge_chat`, only for their apps that report it): the nudge button
      // is ready or greys out with "away" live.
      case 'nudge_chat': {
        const f = friend(ev.id);
        if (f) f.nudge = { ...(f.nudge || {}), away: !!ev.away };
        break;
      }
      // A friend's nudge switch changed (nudge.ts): their button greys out or comes back.
      case 'nudge_state': {
        const f = friend(ev.id);
        if (f) f.nudge = { ...(f.nudge || {}), off: !!ev.off };
        break;
      }
      case 'message': {
        const f = friend(ev.with);
        if (!f) break;
        f.last = { body: ev.message.body, at: ev.message.at, mine: ev.message.mine, sealed: ev.message.sealed, enc: ev.message.enc };
        if (!ev.message.mine) {
          f.unread = (f.unread || 0) + 1;
          answered(f, f.nudge);
        }
        S.friends = [f, ...S.friends.filter((x) => x !== f)];
        break;
      }
      case 'read': {
        const f = friend(ev.with);
        if (f) {
          f.unread = 0;
          // Opening a chat sees that friend's attacks on you too (the API's messages/read).
          if (f.attack && f.attack.unseen) f.attack = { ...f.attack, unseen: 0 };
          if (f.nudge && f.nudge.unread) f.nudge = { ...f.nudge, unread: 0 };
        }
        break;
      }
      case 'notification':
        if (N && !N.list.some((n) => n.id === ev.notification.id)) {
          N.list.unshift(ev.notification);
          N.unread++;
        }
        break;
      case 'notification_gone':
        if (N) {
          const gone = N.list.find((n) => n.id === ev.id);
          N.list = N.list.filter((n) => n.id !== ev.id);
          if (gone && !gone.read) N.unread--;
        }
        break;
      // A friend's new level, sent quietly (no notice): whatever shows them updates.
      // A nickname set or taken off (here or on another of your computers).
      case 'nickname': {
        const f = friend(ev.id);
        if (f) f.nick = ev.nick || null;
        break;
      }
      // Older encrypted messages opened (a Mac that still had their keys): the last ones shown change with them.
      case 'unsealed':
        load();
        break;
      case 'friend_xp': {
        const f = friend(ev.id);
        if (f) f.xp = { ...(f.xp || {}), level: ev.level, rank: ev.rank };
        break;
      }
      // Your community feed switch, changed on another of your computers (synced settings, account.js).
      case 'settings':
        if (ev.set) S.me.prefs = { ...prefs(), ...prefsFrom(ev.set) };
        if (ev.set && 'social.nudges' in ev.set) S.me.nudges = ev.set['social.nudges'] !== false;
        break;
    }
    emit(ev);
  }

  // Settings' "community feed" and the Tokens board's two switches (the API's feed.ts): on unless turned off, kept with
  // the account's synced settings (social.feed, social.tokensName, social.tokensDetail).
  const prefs = () => ({ feed: true, tokensName: true, tokensDetail: true, hitCard: true, ...((S && S.me && S.me.prefs) || {}) });
  const prefsFrom = (set) => Object.fromEntries(['feed', 'tokensName', 'tokensDetail', 'hitCard']
    .filter((k) => `social.${k}` in set).map((k) => [k, set[`social.${k}`] !== false]));

  return {
    PRESENCE,
    dot,
    handle,
    orb: () => O,
    orbText,
    setOrb,
    loadOrb,
    load,
    event,
    on: (f) => (subs.add(f), () => subs.delete(f)),
    state: () => S,
    call: api,
    sharing: SHARING,
    noteInvites: () => (SHARING ? NI : []),
    sharedNotes: () => NS || [],
    loadNoteInvites,
    // Accept a shared note's invite: the answer has the note (`{ note }`); it is on every computer of the account.
    acceptNote: (id) =>
      api('POST', `v1/notes/${id}/accept`, {}).then((r) => {
        if (!r.error) event({ type: 'note.added', note: r.note });
        return r;
      }),
    // Decline an invite (or leave a note: `member` is your own id).
    declineNote: (id, me) =>
      api('DELETE', `v1/notes/${id}/members/${me}`).then((r) => {
        if (!r.error) event({ type: 'note.invite_gone', id });
        return r;
      }),
    notes: () => N,
    loadNotes,
    unreadNotes: () => (N ? N.unread : 0),
    // All of yours read (the notifications view is open).
    readNotes: () =>
      api('POST', 'v1/notifications/read', {}).then((r) => {
        if (!r.error && N) {
          N.list.forEach((n) => (n.read = true));
          N.unread = 0;
          emit({ type: 'notes' });
        }
        return r;
      }),
    friend,
    // What you call a friend: the nickname you gave them (as on Steam), else their name#tag.
    label: (p) => (p && friend(p.id)?.nick) || handle(p),
    nick: (id) => friend(id)?.nick || null,
    setNick: (id, nick) =>
      api('PUT', `v1/friends/${id}/nickname`, { nick }).then((r) => {
        if (!r.error) event({ type: 'nickname', id, nick: r.nick });
        return r;
      }),
    // Unread messages and unseen attacks on you, together (the Friends badge).
    unread: () => (S ? S.friends.reduce((n, f) => n + (f.unread || 0) + ((f.attack && f.attack.unseen) || 0) + ((f.nudge && f.nudge.unread) || 0), 0) : 0),
    // One friend's: what their row's count and the chat's "new messages" marker count.
    unreadOf: (f) => (f ? (f.unread || 0) + ((f.attack && f.attack.unseen) || 0) + ((f.nudge && f.nudge.unread) || 0) : 0),
    // Nudges (nudge.ts): the API's clock, your switch, and the send (its refusals answer 200 with `sent: false` and `why`).
    now: () => Date.now() + nudgeSkew,
    nudgeOn: () => !(S && S.me && S.me.nudges === false),
    setNudges: (on) =>
      api('PUT', 'v1/settings', { set: { 'social.nudges': !!on } }).then((r) => {
        if (!r.error && S) {
          S.me.nudges = !!on;
          emit({ type: 'prefs' });
        }
        return r;
      }),
    // Which friends' chats are open on screen, told to the API (messages.js; it relays it to those friends only, `nudge-chat`).
    nudgeChat: NUDGE_CHAT,
    chats: (ids) => api('POST', 'v1/social/chats', { with: ids }),
    nudge: (id) =>
      api('POST', `v1/friends/${id}/nudge`, {}).then((r) => {
        syncNow(r);
        return r;
      }),
    // Seen: the card's ×, or a click that opens the chat. Here at once; the API tells your other computers.
    attacksSeen: (ids) => {
      ids = (ids || []).filter(Boolean);
      if (!ids.length) return Promise.resolve({ ok: true });
      event({ type: 'attack_seen', ids });
      return api('POST', 'v1/attacks/seen', { ids });
    },
    requests: () => (S ? S.incoming.length : 0),
    dnd: () => !!(S && S.me.status === 'dnd'),
    // In a chat panel the chat opens right there; anywhere else (dashboard, notices) Swift opens its chat panel.
    openChat(id) {
      if (window.Messages && window.Messages.canChat) return window.Messages.open(id);
      h.postMessage({ type: 'openChat', id });
    },
    // Your own actions show at once from their answers; the live echo of the same change then finds nothing to do.
    request: (text) =>
      api('POST', 'v1/friends/requests', { handle: text }).then((r) => {
        if (r.request) event({ type: 'outgoing', request: r.request });
        if (r.friend) event({ type: 'friend', requestId: null, friend: r.friend, accepted: false });
        return r;
      }),
    accept: (id) =>
      api('POST', `v1/friends/requests/${id}/accept`, {}).then((r) => {
        if (r.friend) event({ type: 'friend', requestId: id, friend: r.friend, accepted: false });
        return r;
      }),
    dismiss: (id) =>
      api('DELETE', `v1/friends/requests/${id}`).then((r) => {
        if (!r.error) event({ type: 'request_gone', id });
        return r;
      }),
    unfriend: (id) =>
      api('DELETE', `v1/friends/${id}`).then((r) => {
        if (!r.error) event({ type: 'unfriended', id });
        return r;
      }),
    history: (id, before) => api('GET', `v1/messages/${id}${before ? `?before=${before}` : ''}`),
    // `extra`: { uuid, reply: { uuid, mine, text } }.
    send: (to, body, extra) => api('POST', 'v1/messages', { to, body, uuid: (extra && extra.uuid) || uuid(), ...(extra && extra.reply ? { reply: extra.reply } : {}) }),
    uuid,
    // Whether a message is one sealed end to end before that was retired, not opened yet (`sealed` from the API;
    // `enc` from the Windows app until it drops its own encryption).
    sealed: (m) => !!(m && (m.sealed || m.enc === 'locked' || m.enc === 'bad')),
    // A message in one line, for previews: code says so, an older encrypted one says that.
    preview: (m) => {
      if (!m) return '';
      if (m.sealed || m.enc === 'locked' || m.enc === 'bad') return '🔒 older encrypted message';
      const body = m.body || '';
      const text = body.replace(/```[\s\S]*?(```|$)/g, ' ').replace(/^> .*$/gm, '').replace(/\s+/g, ' ').trim();
      return text || (body.includes('```') ? '</> code' : '');
    },
    read: (id) => api('POST', 'v1/messages/read', { with: id }),
    // Whether friends see your active time (today, this week, in total); your level shows either way.
    setActivity: (show) => api('PATCH', 'v1/me/activity', { show }),
    // Everyone with XP, by this week since Monday ('week') or ever ('all'), everyone or only you and your friends
    // (`friends`; this week's still goes as the old 'friends', which every API knows), and an optional past week.
    leaderboard: (by, friends, week) => api('GET', `v1/leaderboard?${boardQuery(by, friends, week)}`),
    // The same by tokens burned (the leaderboard's Tokens view), optionally of one tool, model and effort; and someone's
    // tokens by AI, model and effort.
    tokens: (by, pick, friends, week) => {
      const p = new URLSearchParams(boardQuery(by, friends, week));
      for (const k of ['tool', 'model', 'effort']) if (pick && pick[k]) p.set(k, pick[k]);
      return api('GET', `v1/leaderboard/tokens?${p}`);
    },
    tokensOf: (id, by, week) =>
      api('GET', `v1/leaderboard/tokens/${encodeURIComponent(id)}?by=${by === 'all' ? 'all' : 'week'}${by !== 'all' && week ? `&week=${encodeURIComponent(week)}` : ''}`),
    weeks: (metric, friends) =>
      api('GET', `v1/leaderboard/weeks?metric=${metric === 'tokens' ? 'tokens' : 'xp'}${friends ? '&friends=1' : ''}`),
    setBoard: (show) => api('PATCH', 'v1/me/leaderboard', { show }),
    prefs,
    setPref: (key, on) =>
      api('PUT', 'v1/settings', { set: { [`social.${key}`]: !!on } }).then((r) => {
        if (!r.error && S) {
          S.me.prefs = { ...prefs(), [key]: !!on };
          emit({ type: 'prefs' });
        }
        return r;
      }),
    // The community feed's recent lines (newest first), and head to head with a friend.
    feed: () => api('GET', 'v1/leaderboard/feed'),
    rivalry: (id) => api('GET', `v1/friends/${id}/rivalry`),
    // A person's whole profile page (identity, hours, badges, weekly tokens, rivalry) in one round trip.
    profile: (id) => api('GET', `v1/screens/profile/${encodeURIComponent(id || 'me')}`),
    // Settings → Feedback: straight to the developer, with who sent it and when.
    feedback: (body) => api('POST', 'v1/feedback', { body }),
    setStatus: (status) =>
      api('PATCH', 'v1/me/status', { status }).then((r) => {
        if (!r.error) event({ type: 'status', status: r.status });
        return r;
      }),
  };
})();
