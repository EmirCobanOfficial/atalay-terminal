'use strict';

// Badges on the dashboard (the API: badges.ts; the art: badge-art.js), as CS:GO's collectibles. Your inventory is on
// your profile (cloud.js renderMe): the ones you have, the next tier's progress on hover, how rare each is; click one
// (or right click it) to display it. The displayed one shows beside your name wherever it's shown (the top bar, friends' lists,
// the leaderboard), as CS:GO shows its one display item; a friend's card opens their whole inventory, as looking into a
// Steam inventory. Signed-in accounts only: a guest sees the badges grey and a way to sign in. At level 60 a button
// resets the level for that year's Service Medal (CS:GO's prestige): the medal is the year's it's taken in.
window.Badges = (() => {
  if (!window.BadgeArt) return null;
  const h = window.webkit && window.webkit.messageHandlers;
  if (!h || !h.cloud) return null;
  const api = (method, path, body) => h.cloud.postMessage({ type: 'social', method, path, body }).catch(() => ({ error: 'offline' }));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  // A badge's rarity, how many in a hundred have it, as a number whatever the API sent.
  const pct = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const say = (m) => (typeof window.toast === 'function' ? window.toast(m) : console.warn(m));
  const Art = window.BadgeArt;

  let mine = null; // GET v1/badges
  let showEl = null, invEl = null; // profile: the displayed badge's slot, the inventory
  let viewOwner = null; // null for self, or account id when viewing someone else
  const boundEls = new WeakSet();
  const subs = new Set(); // told when your badges load or the displayed one changes (your card on the friends list)
  // A badge just put on display lands in its slot (and beside your name) for a moment: drawn with the landing until then.
  let landing = null, landingUntil = 0;
  const lands = (id) => landing === id && Date.now() < landingUntil;
  const changed = () => subs.forEach((f) => f());
  const friends = new Map(); // id -> { at, data }
  // While your profile is being edited (profile-edit.js): the badge picked there and not saved yet shows in its slot
  // (undefined: none picked, the saved one shows; null: none), and displaying one from the page picks it there too.
  let preview, picker = null;
  const shownId = () => (preview !== undefined ? preview : mine && mine.featured);

  const tierLine = (b) => Art.tierName(b.id, b.tier, b.tiers);
  const title = (b) => `${b.name}${b.tier ? ` · ${tierLine(b) || 'earned'}` : ''}`;
  const amount = (p) => {
    if (!p) return '';
    const hours = p.unit === 'h';
    const v = hours ? Math.floor(p.value / 3600) : p.value;
    const next = hours ? p.next / 3600 : p.next;
    // Service counts its days in seconds (badges.ts), On Fire counts days.
    if (p.unit === 'days' && p.next >= 86400) return `${Math.floor(p.value / 86400)} / ${Math.round(p.next / 86400)} days`;
    return `${Math.min(v, next)} / ${next}${p.unit ? ` ${hours ? 'h' : p.unit}` : ''}`;
  };

  /** A displayed badge beside a name, its card on hover (`owner`: whose it is, an account id, or none for yours). */
  function small(b, size = 18, owner) {
    if (!b) return '';
    const t = Art.tierName(b.id, b.tier);
    // An empty title keeps a row's own tooltip off the badge, where its card shows instead.
    return `<span class="bdg-mini" title="" aria-label="${esc(b.name || Art.name(b.id))}${t ? ` · ${esc(t)}` : ''}" data-bid="${esc(b.id)}" data-bt="${Number(b.tier) || 0}"${owner ? ` data-owner="${esc(owner)}"` : ''}>${Art.svg(b.id, b.tier, size)}</span>`;
  }

  // ---------- a badge beside a name, on hover: its card, big ----------
  // The badge large in its metal, its name in its colour, its tier and the steps to the top one, what it's for, how many
  // players have it and when its owner got it: from your inventory for yours, else from the owner's (GET v1/badges/:id,
  // which shows anyone their displayed one), what's known drawn at once and the rest when it comes.
  let card = null, cardFor = null;
  function hoverCard(el) {
    const id = el.dataset.bid, tier = +el.dataset.bt, owner = el.dataset.owner || null;
    cardFor = el;
    const theirs = owner ? friends.get(owner)?.data : null;
    const known = (theirs && !theirs.error && theirs.badges?.find((x) => x.id === id)) || (!owner && mine?.badges.find((x) => x.id === id)) || null;
    const general = mine?.badges.find((x) => x.id === id) || null; // what it's for and how rare: the same for everyone
    drawCard(el, { id, tier, tiers: known?.tiers ?? general?.tiers ?? 1, how: known?.how ?? general?.how ?? '', rare: known?.rare ?? general?.rare ?? null, earnedAt: known?.earnedAt ?? null });
    if (owner && !known) {
      api('GET', `v1/badges/${owner}`).then((d) => {
        friends.set(owner, { at: Date.now(), data: d });
        const b = d && !d.error && d.badges?.find((x) => x.id === id);
        if (b && cardFor === el && el.isConnected) drawCard(el, { ...b, tier });
      });
    }
  }
  function drawCard(el, b) {
    if (!card) {
      card = document.createElement('div');
      card.className = 'bdg-hover';
      document.body.appendChild(card);
    }
    const tierText = Art.tierName(b.id, b.tier, b.tiers);
    const steps = b.tiers > 1 && !b.id.startsWith('service-')
      ? `<span class="steps">${Array.from({ length: b.tiers }, (_, i) => `<i class="${i < b.tier ? 'on' : ''}"></i>`).join('')}</span>` : '';
    card.style.setProperty('--q', Art.glow(b.id, b.tier)[0]);
    card.innerHTML =
      `<div class="bh-top"><div class="bh-art">${Art.svg(b.id, b.tier, 96)}</div><div class="bh-name"><b>${esc(b.name || Art.name(b.id))}</b>` +
      `<span class="q">${esc(tierText || 'Earned')}${b.tiers > 1 && !b.id.startsWith('service-') ? ` · tier ${Number(b.tier) || 0} of ${Number(b.tiers) || 0}` : ''}</span>${steps}</div></div>` +
      (b.how ? `<p>${esc(b.how)}</p>` : '') +
      (b.rare != null ? `<small class="tp-rare${b.rare <= 5 ? ' rare' : ''}">${b.rare <= 5 ? 'Rare · ' : ''}${pct(b.rare)}% of players have ${b.tiers > 1 ? 'this tier' : 'it'}</small>` : '') +
      (b.earnedAt ? `<small>Earned ${esc(new Date(b.earnedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }))}</small>` : '');
    const r = el.getBoundingClientRect();
    card.classList.add('on');
    const w = card.offsetWidth, h = card.offsetHeight;
    const left = r.right + 12 + w < innerWidth ? r.right + 12 : Math.max(8, r.left - 12 - w);
    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(Math.max(8, Math.min(innerHeight - h - 8, r.top + r.height / 2 - h / 2)))}px`;
  }
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest?.('.bdg-mini[data-bid]');
    if (el && el !== cardFor) hoverCard(el);
    else if (!el && cardFor) {
      cardFor = null;
      card?.classList.remove('on');
    }
  });
  document.addEventListener('scroll', () => {
    cardFor = null;
    card?.classList.remove('on');
  }, { capture: true, passive: true });

  function tile(b, own) {
    const p = b.progress;
    const fill = p ? Math.max(0, Math.min(100, (100 * p.value) / p.next)) : 0;
    return (
      `<div class="bdg${b.tier ? '' : ' locked'}${own && mine && mine.featured === b.id ? ' shown' : ''}${own && lands(b.id) ? ' just' : ''}" data-badge="${esc(b.id)}" title="${esc(b.how)}">` +
      `${Art.svg(b.id, b.tier, own ? 64 : 48)}<b>${esc(b.name)}</b><small>${esc(b.tier ? tierLine(b) || 'earned' : 'locked')}</small>` +
      (own && p && b.tier < b.tiers && !(b.tiers === 1 && p.next === 1) ? `<i class="bdg-bar"><i style="width:${fill.toFixed(0)}%"></i></i><em>${esc(amount(p))}</em>` : '') +
      (b.tier ? `<span class="bdg-rare${b.rare && b.rare <= 5 ? ' rare' : ''}">${b.rare <= 5 ? 'rare · ' : ''}${pct(b.rare)}% have ${b.tiers > 1 ? 'this tier' : 'it'}</span>` : '') +
      (own && mine && mine.featured === b.id ? '<span class="bdg-flag">displayed</span>' : '') +
      '</div>'
    );
  }

  async function load() {
    const r = await api('GET', 'v1/badges');
    if (!r || r.error) return mine;
    mine = r;
    renderShowcase();
    paintTop();
    changed();
    return mine;
  }

  // Your displayed badge beside your name in the top bar (after the name's own markup, which cloud.js redraws).
  function paintTop() {
    const name = document.querySelector('.brand b .htag')?.parentElement;
    if (!name) return;
    name.querySelector(':scope > .bdg-mini')?.remove();
    const b = mine && mine.featured && mine.badges.find((x) => x.id === mine.featured);
    // Before the Orb (cloud.js) when it's there: name, badge, then the money.
    const orb = name.querySelector(':scope > .orb-chip');
    if (b && b.tier) (orb || name).insertAdjacentHTML(orb ? 'beforebegin' : 'beforeend', small(b, 18));
    if (b && lands(b.id)) name.querySelector(':scope > .bdg-mini')?.classList.add('pop');
  }

  /** Displays one of yours beside your name (`id`), or none (null); `quiet`: no toast (the profile's Save says it). */
  async function feature(id, quiet) {
    const b = id && mine && mine.badges.find((x) => x.id === id);
    const r = await api('PUT', 'v1/badges/featured', { badge: id || null });
    if (r.error) {
      if (!quiet) say(r.error === 'not_yours' ? 'not earned yet' : "couldn't change it · try again");
      return r;
    }
    // Put on display, as CS:GO's collectibles: a chain's hard landing that rings on (sounds/badge-equip, its hit
    // 0.36 s in), the badge dropping into its slot to land on that hit.
    if (r.featured) {
      landing = r.featured;
      landingUntil = Date.now() + 1300;
      window.Sfx?.sample('badge-equip', 0.65); // about -20 LUFS, as the badge's reveal (messages.js)
    }
    if (mine) mine.featured = r.featured;
    renderShowcase();
    paintTop();
    changed();
    if (!quiet) say(r.featured ? `${b ? b.name : 'Your badge'} shows beside your name now` : 'no badge beside your name now');
    return r;
  }

  // One of yours clicked, or right clicked (the shortcut): display it, or stop. The menu opens where the right click
  // was, or under the badge clicked.
  function contextMenu(e) {
    const t = e.target.closest('.bdg[data-badge], .sc-item[data-badge], .sc-slot[data-badge]');
    hideTip();
    document.querySelector('.bdg-ctx')?.remove();
    if (!t || !mine || viewOwner) return;
    e.preventDefault();
    const b = mine.badges.find((x) => x.id === t.dataset.badge);
    if (!b) return;
    const m = document.createElement('div');
    m.className = 'mn-ctx bdg-ctx';
    m.setAttribute('role', 'menu');
    m.style.position = 'fixed';
    const at = e.type === 'contextmenu' ? { x: e.clientX, y: e.clientY } : (({ left, bottom }) => ({ x: left, y: bottom + 4 }))(t.getBoundingClientRect());
    m.style.left = `${Math.max(8, Math.min(at.x, innerWidth - 240))}px`;
    m.style.top = `${Math.max(8, Math.min(at.y, innerHeight - 60))}px`;
    m.innerHTML = !b.tier
      ? `<button type="button" disabled>🔒 not earned yet · ${esc(b.how)}</button>`
      : shownId() === b.id
        ? '<button type="button" role="menuitem" data-c="off">✕ Stop displaying</button>'
        : '<button type="button" role="menuitem" data-c="on">★ Display beside my name</button>';
    m.onclick = (ev) => {
      const c = ev.target.closest('[data-c]');
      m.remove();
      if (!c) return;
      const id = c.dataset.c === 'on' ? b.id : null;
      if (picker) picker(id);
      else feature(id);
    };
    m.onkeydown = (ev) => {
      if (ev.key !== 'Escape') return;
      ev.stopPropagation();
      m.remove();
      t.focus?.();
    };
    document.body.appendChild(m);
    m.querySelector('button:not(:disabled)')?.focus();
    setTimeout(() => document.addEventListener('mousedown', function off(ev) {
      if (!m.contains(ev.target)) m.remove();
      document.removeEventListener('mousedown', off, true);
    }, true));
  }

  // Level 60: this year's Service Medal waits, as CS:GO's "Get Service Medal": a wide banner in gold with light running
  // round its edge, the next medal big and gleaming, this year's six levels under it (a year's medal can't be had after
  // 1 January), and a button that asks once more before the level goes back to 1.
  let asking = false;
  function medalBanner() {
    if (!mine || !mine.prestige || !mine.prestige.can) return '';
    const year = new Date().getFullYear();
    const id = `service-${year}`;
    const have = mine.badges.find((b) => b.id === id)?.tier || 0;
    if (have >= 6) return '';
    const next = have + 1;
    const pips = Array.from({ length: 6 }, (_, i) => `<i class="${i < have ? 'on' : i === have ? 'next' : ''}" style="--p:${Art.glow(id, i + 1)[0]}"></i>`).join('');
    return (
      `<div class="sm-banner" style="--rc:${Art.glow(id, next)[0]}"><div class="sm-art"><span class="sm-medal">${Art.svg(id, next, 132)}${Art.gleam(id, next, 'sm-shine')}</span></div>` +
      `<div class="sm-text"><small>LEVEL 60 · MAX LEVEL</small><b>${year} SERVICE MEDAL</b>` +
      `<span>${have ? `Level ${next} of this year's medal` : "This year's medal"} is yours to take: start again at level 1 for it. Your XP total, your badges and your place on the leaderboard stay.</span>` +
      `<span class="sm-pips">${pips}<em>${have} of 6 this year · gone on 1 January</em></span></div>` +
      (asking
        ? '<div class="sm-ask"><span>back to level 1?</span><button type="button" class="sm-btn" data-b="prestige-go">✓ yes, get it</button><button type="button" class="sm-no" data-b="prestige-no">cancel</button></div>'
        : '<button type="button" class="sm-btn" data-b="prestige">GET SERVICE MEDAL</button>') +
      '</div>'
    );
  }

  async function onClick(e) {
    const b = e.target.closest('[data-b]');
    if (!b) return;
    if (b.dataset.b === 'signin') return window.Cloud?.openSettings();
    if (b.dataset.b === 'prestige' || b.dataset.b === 'prestige-no') {
      asking = b.dataset.b === 'prestige';
      return renderShowcase();
    }
    if (b.dataset.b === 'prestige-go') {
      asking = false;
      b.disabled = true;
      const r = await api('POST', 'v1/badges/prestige', {});
      if (r.error) {
        b.disabled = false;
        return say(r.error === 'not_yet' ? 'not yet · level 60 first (6 medals a year at most)' : "couldn't do it · try again");
      }
      say(`Service Medal ${r.badge.slice(8)}, level ${r.tier} · back to level 1`);
      window.webkit.messageHandlers.cloud.postMessage({ type: 'refresh' }).then((s) => s && window.Cloud?.render(s)).catch(() => {});
      load();
    }
  }

  // ---------- your profile (cloud.js renderMe): CS:GO's inventory screen ----------
  // The badge you display in a slot at the top right, your badges under it as CS:GO's inventory: only the ones you have
  // (what's left to earn isn't shown), dark tiles of fixed colours with the badge's own colour along the bottom, a card on
  // hover that says what each one is for and how far the next tier is. A click on one offers to display it.
  const ORDER = (a, b) => (a.rare ?? 100) - (b.rare ?? 100);
  const colour = (b) => (b.tier ? Art.glow(b.id, b.tier)[0] : '90, 95, 102');
  const enrichBadge = (b) => {
    const general = mine?.badges.find((x) => x.id === b.id) || null;
    return {
      ...b,
      name: b.name || Art.name(b.id),
      tiers: b.tiers ?? general?.tiers ?? 1,
      how: b.how ?? general?.how ?? '',
      rare: b.rare ?? b.rarity ?? general?.rare ?? null,
    };
  };

  function renderShowcase() {
    if (viewOwner) {
      const d = friends.get(viewOwner)?.data;
      if (showEl && showEl.isConnected) {
        const raw = d && !d.error && d.featured && d.badges?.find((x) => x.id === d.featured && x.tier);
        const b = raw ? enrichBadge(raw) : null;
        setHTML(showEl, b
          ? `<div class="sc-slot on" style="--q:${colour(b)}" data-badge="${esc(b.id)}" title="The badge they display beside their name"><small>DISPLAYED</small>${Art.svg(b.id, b.tier, 112)}<b>${esc(b.name)}</b><span>${esc(tierLine(b) || 'earned')}</span></div>`
          : '');
      }
      if (!invEl || !invEl.isConnected) return;
      if (!d) return setHTML(invEl, '<div class="mn-empty">loading…</div>');
      if (d.error) return setHTML(invEl, '<div class="mn-empty">badges unavailable</div>');
      const list = (d.badges || []).filter((b) => b.tier).map(enrichBadge).sort(ORDER);
      setHTML(invEl,
        `<div class="sc-bar"><h2 class="sc-title">BADGES · ${list.length}</h2>${list.length ? '<span class="sc-count">the rarest first · hover one for what it is</span>' : ''}</div>` +
        (list.length
          ? `<div class="sc-grid">${list.map((b) => item(b, false, d.featured === b.id)).join('')}</div>`
          : '<div class="mn-empty">no badges yet</div>'));
      return;
    }
    if (showEl && showEl.isConnected) {
      const id = shownId();
      const b = id && mine && (mine.badges || []).find((x) => x.id === id && x.tier);
      setHTML(showEl, b
        ? `<div class="sc-slot on${lands(b.id) ? ' land' : ''}" style="--q:${colour(b)}" data-badge="${esc(b.id)}" title="Displayed beside your name"><small>DISPLAYED</small>${Art.svg(b.id, b.tier, 112)}<b>${esc(b.name)}</b><span>${esc(tierLine(b) || 'earned')}</span></div>`
        : `<div class="sc-slot"><small>DISPLAYED</small><i>◆</i><span>${mine && !mine.signedIn ? 'sign in to earn badges' : 'click one of your badges to display it beside your name'}</span></div>`);
    }
    if (!invEl || !invEl.isConnected) return;
    if (!mine) return setHTML(invEl, '<div class="mn-empty">loading…</div>');
    const list = (mine.badges || []).filter((b) => b.tier).sort(ORDER);
    const prestige = medalBanner();
    const guest = mine.signedIn ? '' : '<p class="bdg-sum bdg-guest"><b>Badges are for signed-in accounts.</b> Sign in (GitHub or e-mail) and what you\'ve done so far counts at once. <button type="button" class="mn-btn go" data-b="signin">sign in</button></p>';
    setHTML(invEl,
      guest + prestige +
      `<div class="sc-bar"><h2 class="sc-title">BADGES · ${list.length}</h2>${list.length && mine.signedIn ? '<span class="sc-count">click one to display it beside your name</span>' : ''}</div>` +
      // The badges nearest their next tier, right over yours (profile-stats.js).
      (window.ProfileStats?.next() || '') +
      (list.length
        ? `<div class="sc-grid">${list.map((b) => item(b, true, false)).join('')}</div>`
        : mine.signedIn ? '<div class="mn-empty">no badges yet · they come as you work, one at a time</div>' : ''));
  }

  function item(b, own = true, isFeatured = false) {
    const shown = own ? shownId() === b.id : isFeatured;
    const interactive = own ? ` role="button" tabindex="0" aria-haspopup="menu" aria-label="${esc(`${b.name}, ${tierLine(b) || 'earned'}${shown ? ', displayed beside your name' : ''}`)}"` : '';
    return (
      `<div class="sc-item${shown ? ' shown' : ''}${own && lands(b.id) ? ' just' : ''}" data-badge="${esc(b.id)}" style="--q:${colour(b)}"${interactive}>` +
      `<div class="sc-art">${Art.svg(b.id, b.tier, 84)}</div><b>${esc(b.name)}</b><span>${esc(tierLine(b) || 'earned')}</span>` +
      (shown ? '<em class="sc-flag">★</em>' : '') + (b.tier && b.rare != null && b.rare <= 5 ? '<em class="sc-rare">RARE</em>' : '') +
      '<i class="sc-q"></i></div>'
    );
  }

  // The card on hover, as CS:GO's: the name in the badge's colour, its tier, what it's for, how far to the next tier,
  // how many have it, when you got it.
  let tip = null;
  function showTip(t) {
    const id = t.dataset.badge;
    let b = null;
    if (viewOwner) {
      const raw = id && friends.get(viewOwner)?.data?.badges?.find((x) => x.id === id);
      if (raw) b = enrichBadge(raw);
    } else {
      b = id && mine && mine.badges.find((x) => x.id === id);
    }
    if (!b) return hideTip();
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'sc-tip';
      document.body.appendChild(tip);
    }
    const p = !viewOwner ? b.progress : null;
    const next = b.tier < b.tiers ? Art.tierName(b.id, b.tier + 1, b.tiers) : '';
    const steps = b.tiers > 1 && !b.id.startsWith('service-') ? `<span class="steps">${Array.from({ length: b.tiers }, (_, i) => `<i class="${i < b.tier ? 'on' : ''}"></i>`).join('')}</span>` : '';
    tip.style.setProperty('--q', colour(b));
    tip.innerHTML =
      `<b>${esc(b.name)}</b><span class="q">${esc(tierLine(b) || 'Earned')}${b.tiers > 1 && !b.id.startsWith('service-') ? ` · tier ${Number(b.tier) || 0} of ${Number(b.tiers) || 0}` : ''}</span>${steps}` +
      (b.how ? `<p>${esc(b.how)}</p>` : '') +
      (p && b.tier < b.tiers && !(b.tiers === 1 && p.next === 1)
        ? `<div class="tp-prog"><label>${next ? `to ${esc(next)}` : 'progress'}</label><i><i style="width:${Math.max(0, Math.min(100, (100 * p.value) / p.next)).toFixed(0)}%"></i></i><small>${esc(amount(p))}</small></div>`
        : '') +
      (b.rare != null ? `<small class="tp-rare${b.rare <= 5 ? ' rare' : ''}">${b.rare <= 5 ? 'Rare · ' : ''}${pct(b.rare)}% of players have ${b.tiers > 1 ? 'this tier' : 'it'}</small>` : '') +
      (b.earnedAt ? `<small>Earned ${esc(new Date(b.earnedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }))}</small>` : '') +
      (!viewOwner && mine?.signedIn ? `<em>${shownId() === b.id ? '★ displayed beside your name · click to stop' : 'click to display it beside your name'}</em>` : '');
    const r = t.getBoundingClientRect();
    tip.classList.add('on');
    const w = tip.offsetWidth, h = tip.offsetHeight;
    const left = r.right + 10 + w < innerWidth ? r.right + 10 : Math.max(8, r.left - 10 - w);
    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(Math.max(8, Math.min(innerHeight - h - 8, r.top)))}px`;
  }
  function hideTip() {
    tip?.classList.remove('on');
  }

  /** Any profile: the displayed badge's slot and the inventory (`id`: account id or none/'me' for yours). */
  function mountShowcase(slot, inv, id, opts) {
    showEl = slot;
    invEl = inv;
    viewOwner = id && id !== 'me' ? id : null;
    if (!invEl) return;
    if (showEl && !boundEls.has(showEl)) {
      boundEls.add(showEl);
      showEl.addEventListener('contextmenu', contextMenu);
    }
    if (!boundEls.has(invEl)) {
      boundEls.add(invEl);
      invEl.addEventListener('contextmenu', contextMenu);
      invEl.addEventListener('click', onClick);
      // A click (or Return) on one: the same menu as the right click, under it (Apple: a context menu is a shortcut, what
      // it does is somewhere in sight too).
      invEl.addEventListener('click', (e) => {
        if (!viewOwner && e.target.closest('.sc-item[data-badge]')) contextMenu(e);
      });
      invEl.addEventListener('keydown', (e) => {
        if (!viewOwner && (e.key === 'Enter' || e.key === ' ') && e.target.closest?.('.sc-item[data-badge]')) contextMenu(e);
      });
      invEl.addEventListener('mouseover', (e) => {
        const t = e.target.closest('.sc-item');
        if (t) showTip(t);
      });
      invEl.addEventListener('mouseout', (e) => {
        if (!e.relatedTarget?.closest?.('.sc-item')) hideTip();
      });
      invEl.closest('.body')?.addEventListener('scroll', hideTip, { passive: true });
    }
    renderShowcase();
    if (viewOwner) {
      if (opts?.skipFetch) return;
      const owner = viewOwner;
      const cached = friends.get(owner);
      if (!cached || Date.now() - cached.at >= 60_000) {
        api('GET', `v1/badges/${encodeURIComponent(owner)}`).then((d) => {
          friends.set(owner, { at: Date.now(), data: d });
          if (viewOwner === owner) renderShowcase();
        });
      }
    } else {
      load();
    }
  }

  /** Accepts badges already fetched by profile.js so we don't ask twice. */
  function ingest(id, d) {
    if (!id || id === 'me') return;
    friends.set(id, { at: Date.now(), data: d || { error: 'unavailable' } });
    if (viewOwner === id) renderShowcase();
  }

  window.Social?.on((ev) => {
    if (ev.type === 'badge' || ev.type === 'badge_featured' || (ev.type === 'account' && ev.event !== 'devices') || ev.type === 'hello') load();
  });
  setTimeout(load, 3000);

  /** profile-edit.js: the badge picked and not saved yet (undefined: none picked), and who takes a pick from the page. */
  function setPreview(id, onPick) {
    preview = id;
    picker = onPick || null;
    renderShowcase();
  }

  // amount: "62 / 100 h", for your profile's UP NEXT (profile-stats.js).
  return { small, mountShowcase, load, ingest, paintTop, feature, preview: setPreview, mine: () => mine, on: (f) => subs.add(f), amount };
})();
