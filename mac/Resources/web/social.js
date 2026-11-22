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

  let loading = null;
  function load() {
    loading =
      loading ||
      api('GET', 'v1/social').then((r) => {
        loading = null;
        if (r && !r.error) {
          S = r;
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
  // Where the app can't share notes yet (Windows) the invites aren't shown either.
  const SHARING = window.__platform !== 'win32';
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
  const drop = (list, id) => list.filter((r) => r.id !== id);

  // A live event updates the snapshot in place, then every view re-renders from it.
  function event(ev) {
    if (!ev || !ev.type) return;
    // (Re)connected: anything that happened while the line was down is in a fresh snapshot.
    if (ev.type === 'hello') loadNotes(), loadNoteInvites();
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
        break;
      }
      case 'message': {
        const f = friend(ev.with);
        if (!f) break;
        f.last = { body: ev.message.body, at: ev.message.at, mine: ev.message.mine, sealed: ev.message.sealed, enc: ev.message.enc };
        if (!ev.message.mine) f.unread = (f.unread || 0) + 1;
        S.friends = [f, ...S.friends.filter((x) => x !== f)];
        break;
      }
      case 'read': {
        const f = friend(ev.with);
        if (f) f.unread = 0;
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
        break;
    }
    emit(ev);
  }

  // Settings' "community feed" and the Tokens board's two switches (the API's feed.ts): on unless turned off, kept with
  // the account's synced settings (social.feed, social.tokensName, social.tokensDetail).
  const prefs = () => ({ feed: true, tokensName: true, tokensDetail: true, ...((S && S.me && S.me.prefs) || {}) });
  const prefsFrom = (set) => Object.fromEntries(['feed', 'tokensName', 'tokensDetail']
    .filter((k) => `social.${k}` in set).map((k) => [k, set[`social.${k}`] !== false]));

  return {
    PRESENCE,
    dot,
    handle,
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
    unread: () => (S ? S.friends.reduce((n, f) => n + (f.unread || 0), 0) : 0),
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
