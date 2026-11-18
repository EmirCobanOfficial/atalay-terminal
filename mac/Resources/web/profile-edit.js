'use strict';

// "Edit profile" on your profile page (cloud.js renderMe): a panel slides in on the page's right, as Discord's profile
// editor beside its preview, and the page on its left is that preview. It shows the picture, the links and the badge
// being changed as they're changed: the real page, not a copy of it (GitHub edits its profile in place). Apple's rule for
// it: a panel, not a sheet, for input changed often while its result is watched. One Save sends it all (the picture, the
// links, the displayed badge, the hacker name); Esc, Cancel or ✕ with something changed asks first. The name is sent with
// cloud.js's rename, the same as the first launch's; guests change it here too (picture and links need the account).
//
// The picture: Choose…, dropped on the panel or on the page's picture, or pasted (⌘V) while the panel is open; then
// "Adjust picture", a sheet with a square frame to move it in (dragged, or with the arrow keys: WCAG's way without
// dragging) and a zoom (1×–4×, − and +), and the three sizes it shows at. Cut to a 512×512 JPEG (profile.js cut()), the
// square the cards show, and sent with Save.
// The links: one "Add a link" field that tells the site from the address as it's typed (profile.js detect()), a link a
// site, six at most; what's wrong shows once Return is pressed or the field is left, never while it's typed (NN/g).
window.ProfileEdit = (() => {
  const P = window.Profile;
  if (!P) return null;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const A = () => window.Account?.state();
  const B = () => window.Badges?.mine();
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WARN = '<svg class="pe-wi" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8 15.2 14.2H.8z"/><path d="M8 6.3v3.7M8 11.9v.2"/></svg>';
  const warn = (text, cls = 'pe-err') => `<p class="${cls}"${cls === 'pe-err' ? ' role="alert"' : ''}>${WARN}<span>${esc(text)}</span></p>`;

  let el = null; // the panel: an <aside> in the profile view (cloud.js)
  let who = { name: '', tag: '', rc: 'var(--accent-rgb)' }; // your name, tag and rank colour, as the page has them
  // The draft while the panel is open. pic: undefined (as saved), { data } (a new one, cut and not sent yet) or 'remove'
  // (none of your own: GitHub's again, or your initial); links: { site: url } as they'll be saved; featured: undefined
  // (as saved), a badge's id or null (none); base: the links as they were when the panel opened (or last synced from the
  // account), what the draft is compared with, so a sign in from the panel can't make the draft look like deleting them all.
  let D = null;
  const fresh = () => { const L = savedLinks(); return { pic: undefined, small: false, links: L, base: L, featured: undefined, name: undefined, nameErr: '', picErr: '', linkErr: '', showErr: false, noSuggest: false, busy: false, status: '' }; };

  function savedLinks() {
    const a = A();
    const L = a && a.signedIn && a.links && typeof a.links === 'object' ? a.links : {};
    const out = {};
    for (const s of P.SITES) {
      const url = P.safe(s.id, L[s.id]);
      if (url) out[s.id] = url;
    }
    return out;
  }
  const sameLinks = (x, y) => P.SITES.every((s) => (x[s.id] || '') === (y[s.id] || ''));
  const savedFeatured = () => B()?.featured ?? null;
  const typed = () => !!(el && el.querySelector('.pe-in')?.value.trim());
  // The name being typed (D.name: undefined while untouched), changed once it differs from the one you have.
  const nameChanged = () => !!D && D.name !== undefined && D.name.trim() !== who.name;
  const NAME_MAX = () => window.Cloud?.nameMax || 16;
  const dirty = () => !!D && (D.pic !== undefined || nameChanged() || !sameLinks(D.links, D.base) || (D.featured !== undefined && D.featured !== savedFeatured()));
  // GitHub's picture once you remove yours (the server goes back to it once signed in with GitHub).
  const githubPic = (a) => (a && a.github ? `https://github.com/${encodeURIComponent(a.github)}.png?size=256` : null);
  const emit = () => window.dispatchEvent(new Event('profiledraft'));
  // In sight: the profile view shows, and no window (Settings, an update) is over it.
  const visible = () => !!(el && D && el.isConnected && !el.hidden && el.offsetParent !== null && !document.getElementById('cloudui')?.classList.contains('on'));

  /** What the page shows while the panel is open: the picture and the links being edited (null: not editing). */
  function look(a) {
    if (!D) return null;
    const avatar = D.pic === undefined ? (a && a.signedIn ? a.avatar : null) : D.pic === 'remove' ? githubPic(a) : D.pic.data;
    return { avatar, links: D.links };
  }

  // ---------- open, close ----------
  function open() {
    el = document.querySelector('#profile-view .pe');
    if (!el) return;
    bind();
    if (D) return focusIn();
    D = fresh();
    el.innerHTML = skeleton();
    el.style.setProperty('--rc', who.rc);
    el.hidden = false;
    document.getElementById('profile-view')?.classList.add('editing');
    requestAnimationFrame(() => el && D && el.classList.add('on'));
    window.Badges?.preview(undefined, pickBadge);
    paint();
    emit();
    focusIn();
  }

  // Closed: with nothing changed at once, else after "Discard changes?" (force: without asking).
  function close(force) {
    if (!D || !el) return;
    if (D.busy) return;
    if (!force && (dirty() || typed())) return ask();
    D = null;
    closeCrop();
    window.Badges?.preview(undefined, null);
    document.getElementById('profile-view')?.classList.remove('editing');
    el.classList.remove('on');
    const gone = el;
    const done = () => {
      if (D) return;
      gone.hidden = true;
      gone.innerHTML = '';
    };
    if (reduced()) done();
    else setTimeout(done, 160);
    emit();
    document.querySelector('#profile-view .pp-edit')?.focus();
  }

  function focusIn() {
    el?.querySelector('.pe-body button:not([disabled]), .pe-body input:not([hidden])')?.focus();
  }

  function ask() {
    if (el.querySelector('.pe-ask')) return el.querySelector('[data-ask=keep]').focus();
    const box = document.createElement('div');
    box.className = 'pe-ask';
    box.setAttribute('role', 'alertdialog');
    box.setAttribute('aria-labelledby', 'pe-ask-t');
    box.setAttribute('aria-describedby', 'pe-ask-p');
    box.innerHTML =
      '<div class="pe-ask-in"><b id="pe-ask-t">Discard changes?</b><p id="pe-ask-p">Your picture, links and badge stay as they were.</p>' +
      '<div class="pe-row"><button type="button" class="pe-btn" data-ask="keep">Keep editing</button><button type="button" class="pe-btn pe-danger" data-ask="discard">Discard</button></div></div>';
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ask]');
      if (!b) return;
      box.remove();
      if (b.dataset.ask === 'discard') close(true);
      else focusIn();
    });
    el.appendChild(box);
    box.querySelector('[data-ask=keep]').focus();
  }

  // ---------- the panel ----------
  const skeleton = () =>
    '<div class="pe-head"><h2 id="pe-title">Edit profile</h2><button type="button" class="pe-x" data-pe="cancel" aria-label="Close" title="Close · Esc">✕</button></div>' +
    '<div class="pe-body">' +
    '<div class="pe-signin" hidden></div>' +
    '<section class="pe-sec pe-need" aria-labelledby="pe-h-pic"><h3 class="pe-h" id="pe-h-pic">PICTURE</h3><div class="pe-pic-host"></div>' +
    '<input class="pe-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/heic,image/heif,.heic,.heif" hidden></section>' +
    '<section class="pe-sec" aria-labelledby="pe-h-name"><h3 class="pe-h" id="pe-h-name">NAME</h3><div class="pe-name-host"></div></section>' +
    '<section class="pe-sec pe-need" aria-labelledby="pe-h-links"><h3 class="pe-h" id="pe-h-links">LINKS</h3><ul class="pe-list"></ul><div class="pe-linkerr"></div><div class="pe-suggest-host"></div>' +
    '<div class="pe-add"><label class="pe-label" for="pe-add-in">Add a link</label>' +
    '<div class="pe-field"><span class="pe-fi" aria-hidden="true"></span><input id="pe-add-in" class="pe-in" type="text" maxlength="200" spellcheck="false" autocomplete="off" autocapitalize="off" aria-describedby="pe-live pe-add-hint">' +
    '<button type="button" class="pe-btn" data-pe="add" disabled>Add</button></div>' +
    '<div class="pe-live" id="pe-live" aria-live="polite"></div>' +
    '<p class="pe-hint" id="pe-add-hint">Paste a GitHub, LinkedIn, X, Instagram, YouTube or website address</p></div>' +
    '<p class="pe-hint pe-full" hidden>6 of 6 · remove one to add another</p>' +
    '<p class="pe-hint pe-privacy">Everyone who sees your card sees these links.</p></section>' +
    '<section class="pe-sec pe-need" aria-labelledby="pe-h-badge"><h3 class="pe-h" id="pe-h-badge">DISPLAYED BADGE</h3><div class="pe-badges-host"></div></section>' +
    '</div>' +
    '<div class="pe-foot"><p class="pe-status" aria-live="polite"></p><button type="button" class="pe-btn" data-pe="cancel">Cancel</button>' +
    '<button type="button" class="pe-btn pe-primary" data-pe="save" disabled>Save</button></div>';

  function paint() {
    if (!D || !el) return;
    const can = P.takes();
    const a = A();
    const signin = el.querySelector('.pe-signin');
    signin.hidden = can;
    signin.innerHTML = can
      ? ''
      : a && a.signedIn
        ? '<p class="pe-note">Your server doesn\'t keep pictures and links yet.</p>'
        : '<p class="pe-note">Sign in to put a picture, links and a badge on your card. What you\'ve done so far counts at once.</p><button type="button" class="pe-btn pe-primary" data-pe="signin">Sign in…</button>';
    el.querySelectorAll('.pe-need').forEach((s) => (s.hidden = !can));
    paintPic();
    paintName();
    paintLinks();
    paintLive();
    paintBadges();
    paintFoot();
  }

  function paintPic() {
    const host = el.querySelector('.pe-pic-host');
    const a = A();
    const v = look(a);
    const own = D.pic === undefined ? !!(a && a.avatarCustom) : D.pic !== 'remove';
    const pic = v.avatar
      ? `<img class="pe-pic" alt="" src="${esc(v.avatar)}">`
      : `<span class="pe-pic pe-mono" aria-hidden="true">${esc((who.name || '?').trim().charAt(0).toUpperCase() || '?')}</span>`;
    host.innerHTML =
      `<div class="pe-drop">${pic}<div class="pe-drop-txt"><p>Drop a picture here, or</p><div class="pe-row">` +
      `<button type="button" class="pe-btn" data-pe="choose"${D.busy ? ' disabled' : ''}>Choose…</button>` +
      (own ? `<button type="button" class="pe-btn" data-pe="remove"${D.busy ? ' disabled' : ''}>${a && a.github ? 'Use GitHub picture' : 'Remove'}</button>` : '') +
      '</div></div><span class="pe-over" aria-hidden="true">Drop to use this picture</span></div>' +
      '<p class="pe-hint">PNG, JPEG, WebP or GIF, up to 15 MB</p>' +
      (D.picErr ? warn(D.picErr) : D.small ? warn('This picture is small and may look blurry', 'pe-warn') : '');
  }

  // The field is made once a panel and kept (cloud.js redraws the page, and calls this, as your XP moves): what's typed
  // and the caret stay; your saved name shows until you type.
  function paintName() {
    const host = el.querySelector('.pe-name-host');
    let input = host.querySelector('.pe-nm');
    if (!input) {
      host.innerHTML =
        '<label class="pe-label" for="pe-nm">Hacker name</label>' +
        `<div class="pe-field pe-nmf"><input id="pe-nm" class="pe-nm" type="text" maxlength="${NAME_MAX()}" spellcheck="false" autocomplete="off" autocapitalize="off" aria-describedby="pe-nm-hint"><i class="pe-tag" title="Your tag: names can repeat, name + tag can't"></i><span class="pe-count" aria-hidden="true"></span></div>` +
        '<div class="pe-nmerr"></div><p class="pe-hint" id="pe-nm-hint">Friends add you with your name and tag · names can repeat, name + tag can\'t</p>';
      input = host.querySelector('.pe-nm');
    }
    host.querySelector('.pe-tag').textContent = who.tag;
    if (D.name === undefined && document.activeElement !== input) input.value = who.name;
    input.disabled = D.busy;
    host.querySelector('.pe-count').textContent = `${input.value.length}/${NAME_MAX()}`;
    host.querySelector('.pe-nmf').classList.toggle('bad', !!D.nameErr);
    host.querySelector('.pe-nmerr').innerHTML = D.nameErr ? warn(D.nameErr) : '';
  }

  function paintLinks() {
    const ids = P.SITES.filter((s) => D.links[s.id]);
    el.querySelector('#pe-h-links').textContent = `LINKS · ${ids.length} of ${P.SITES.length}`;
    const list = el.querySelector('.pe-list');
    list.hidden = !ids.length;
    list.innerHTML = ids.map((s) => {
      const url = D.links[s.id];
      return `<li class="pe-li" title="${esc(url)}"><span class="pe-ic">${s.glyph}</span><span class="pe-lt"><b>${s.label}</b><small>${esc(P.shortText(s.id, url))}</small></span>` +
        `<button type="button" class="pe-del" data-del="${s.id}" aria-label="Remove the ${s.label} link" title="Remove"${D.busy ? ' disabled' : ''}>✕</button></li>`;
    }).join('');
    el.querySelector('.pe-linkerr').innerHTML = D.linkErr ? warn(D.linkErr) : '';
    // Signed in with GitHub and no GitHub link: offer it (Apple: don't ask for what the system knows).
    const a = A();
    const gh = a && a.github && !D.links.github && !D.noSuggest ? P.normalize('github', a.github) : null;
    el.querySelector('.pe-suggest-host').innerHTML = gh
      ? `<div class="pe-suggest"><span class="pe-ic">${P.ICONS.github}</span><span>Add <b>${esc(gh.replace(/^https:\/\//, ''))}</b>?</span><button type="button" class="pe-btn" data-pe="suggest">Add</button></div>`
      : '';
    const full = ids.length >= P.SITES.length;
    el.querySelector('.pe-add').hidden = full;
    el.querySelector('.pe-full').hidden = !full;
  }

  // Under the field: the site the address is of ("YouTube · press Return to add", and whether it replaces a link), the
  // sites a bare name could be of, or, once Return was pressed or the field left, what's wrong with it.
  function paintLive() {
    const input = el.querySelector('.pe-in');
    const d = P.detect(input.value);
    const s = d && d.id ? P.site(d.id) : null;
    const fi = el.querySelector('.pe-fi');
    fi.innerHTML = s ? s.glyph : P.ICONS.link;
    fi.classList.toggle('on', !!s);
    el.querySelector('[data-pe=add]').disabled = !d || D.busy;
    let html = '', bad = false;
    if (d && d.names) {
      if (d.names.length) {
        html = `<div class="pe-which"><span>Which site?</span>${d.names.map((id) => `<button type="button" class="pe-chip" data-site="${id}"><span class="pe-ic">${P.site(id).glyph}</span>${P.site(id).label}</button>`).join('')}</div>`;
      } else if (D.showErr) {
        bad = true;
        html = warn(`That isn't a link · paste the page's address, like ${P.site('github').fix}`);
      }
    } else if (d && d.error) {
      bad = D.showErr;
      html = D.showErr ? warn(d.error) : s ? `<p class="pe-det"><b>${s.label}</b></p>` : '';
    } else if (d && d.url) {
      const had = D.links[d.id];
      html = `<p class="pe-det"><b>${s.label}</b> · press Return to add</p>` +
        (had === d.url ? '<p class="pe-det pe-repl">Already on your card</p>' : had ? `<p class="pe-det pe-repl">Replaces your ${s.label} link</p>` : '');
    }
    // Same HTML: leave it, or a chip being clicked is replaced under the mouse and the click is lost.
    const live = el.querySelector('.pe-live');
    const was = live.cloneNode(false);
    was.innerHTML = html;
    if (live.innerHTML !== was.innerHTML) live.innerHTML = html;
    input.setAttribute('aria-invalid', String(bad));
    input.closest('.pe-field').classList.toggle('bad', bad);
  }

  function paintBadges() {
    const host = el.querySelector('.pe-badges-host');
    const m = B();
    if (!window.Badges || !m) return (host.innerHTML = '<p class="pe-hint">Loading…</p>');
    const list = m.badges.filter((b) => b.tier).sort((x, y) => x.rare - y.rare);
    if (!list.length) return (host.innerHTML = '<p class="pe-hint">No badges yet · they come as you work</p>');
    const cur = D.featured !== undefined ? D.featured : m.featured ?? null;
    const opt = (id, art, name) =>
      `<button type="button" role="radio" class="pe-bdg" data-badge="${esc(id)}" aria-checked="${(cur || '') === id}" tabindex="${(cur || '') === id ? 0 : -1}" title="${esc(name)}">${art}<span>${esc(name)}</span></button>`;
    host.innerHTML =
      '<div class="pe-badges" role="radiogroup" aria-labelledby="pe-h-badge">' +
      opt('', '<i class="pe-none" aria-hidden="true"></i>', 'None') +
      list.map((b) => opt(b.id, window.BadgeArt.svg(b.id, b.tier, 30), b.name)).join('') +
      '</div><p class="pe-hint">Shows beside your name: the top bar, friends\' lists, the leaderboard.</p>';
  }

  function paintFoot() {
    const save = el.querySelector('[data-pe=save]');
    save.disabled = D.busy || !(dirty() || typed());
    save.textContent = D.busy ? 'Saving…' : 'Save';
    el.querySelectorAll('[data-pe=cancel]').forEach((b) => (b.disabled = D.busy));
    const st = el.querySelector('.pe-status');
    st.textContent = D.status;
    st.classList.toggle('bad', !!D.status && !D.busy);
  }

  const changed = () => {
    D.status = '';
    paintFoot();
    emit();
  };

  // ---------- links ----------
  function put(id, url) {
    D.links = { ...D.links, [id]: url };
    D.linkErr = '';
    paintLinks();
    changed();
  }
  // Return, Add, or Save with an address typed: it goes on the list (in place of its site's link), or what's wrong
  // shows under the field. false: something's wrong.
  function addTyped() {
    const input = el.querySelector('.pe-in');
    const d = P.detect(input.value);
    if (!d) return true;
    if (d.url) {
      put(d.id, d.url);
      input.value = '';
      D.showErr = false;
      paintLive();
      paintFoot();
      return true;
    }
    D.showErr = true;
    paintLive();
    input.focus();
    return false;
  }

  // ---------- the displayed badge ----------
  function pickBadge(id) {
    if (!D) return;
    D.featured = id || null;
    window.Badges?.preview(D.featured, pickBadge);
    paintBadges();
    changed();
  }

  // ---------- save ----------
  const PIC_ERRORS = { offline: "Can't reach the server · try again", rate_limited: 'Too many tries in a minute · wait a moment and try again', sign_in: 'Sign in first · Settings › Account' };
  async function save() {
    if (!D || D.busy) return;
    if (!addTyped()) return;
    if (nameChanged() && D.name.trim().length < 2) {
      D.nameErr = 'Use at least 2 characters';
      paintName();
      return el.querySelector('.pe-nm')?.focus();
    }
    if (!dirty()) return close(true);
    D.busy = true;
    D.status = 'Saving…';
    D.picErr = D.linkErr = D.nameErr = '';
    paint();
    let failed = '';
    if (nameChanged()) {
      const r = window.Cloud?.rename ? await window.Cloud.rename(D.name.trim()) : { error: 'offline' };
      if (!r || r.error) {
        failed = 'name';
        D.nameErr = (r && r.text) || "Couldn't change the name · try again";
      } else D.name = undefined;
    }
    if (D.pic !== undefined) {
      const removing = D.pic === 'remove';
      const r = removing ? await P.api('DELETE', 'v1/me/avatar') : await P.api('PUT', 'v1/me/avatar', { image: D.pic.data });
      if (!r || r.error) {
        failed = 'picture';
        D.picErr = PIC_ERRORS[r && r.error] || (removing ? "Couldn't remove the picture · try again" : "Couldn't upload the picture · try again");
      } else {
        D.pic = undefined;
        D.small = false;
      }
    }
    if (!sameLinks(D.links, D.base)) {
      // The sites this app knows: only their links change, a site added later keeps its link (src/profile.ts).
      const r = await P.api('PUT', 'v1/me/profile', { links: D.links, sites: P.SITES.map((s) => s.id) });
      if (!r || r.error) {
        failed = failed || 'links';
        D.linkErr = r && r.error === 'bad_link' ? "One of the links isn't a page of its site · remove it and add it again" : P.errText(r && r.error);
      }
    }
    if (D.featured !== undefined && D.featured !== savedFeatured() && window.Badges) {
      const r = await window.Badges.feature(D.featured, true);
      if (!r || r.error) failed = failed || (r && r.error === 'not_yours' ? "That badge isn't earned yet" : "Couldn't change the displayed badge · try again");
    }
    await window.Account?.load();
    if (!D) return;
    D.base = savedLinks();
    D.busy = false;
    if (!failed) {
      P.say('Profile saved');
      return close(true);
    }
    D.status = failed === 'picture' || failed === 'links' || failed === 'name' ? "Some changes weren't saved · see above" : failed;
    paint();
    emit();
  }

  // ---------- the panel's clicks and keys ----------
  function onClick(e) {
    if (!D) return;
    const b = e.target.closest('[data-pe], [data-del], [data-site], [data-badge]');
    if (!b || b.disabled) return;
    if (b.dataset.del) {
      const { [b.dataset.del]: _, ...rest } = D.links;
      if (b.dataset.del === 'github') D.noSuggest = true;
      D.links = rest;
      paintLinks();
      paintLive();
      changed();
      return el.querySelector('.pe-in')?.focus();
    }
    if (b.dataset.site) {
      const input = el.querySelector('.pe-in');
      const url = P.normalize(b.dataset.site, input.value);
      if (!url) return;
      put(b.dataset.site, url);
      input.value = '';
      paintLive();
      return input.focus();
    }
    if (b.dataset.badge !== undefined) return pickBadge(b.dataset.badge);
    const act = b.dataset.pe;
    if (act === 'cancel') return close();
    if (act === 'save') return save();
    if (act === 'choose') return el.querySelector('.pe-file').click();
    if (act === 'remove') {
      D.pic = A()?.avatarCustom ? 'remove' : undefined;
      D.small = false;
      D.picErr = '';
      paintPic();
      changed();
      return el.querySelector('[data-pe=choose]')?.focus();
    }
    if (act === 'add') return addTyped();
    if (act === 'suggest') {
      const url = P.normalize('github', A()?.github);
      if (url) put('github', url);
      return;
    }
    if (act === 'signin') return window.Cloud?.openSettings('account');
  }

  function bind() {
    // The profile view is made once (cloud.js), the panel's insides each time it opens: one listener each, on the panel.
    const pe = document.querySelector('#profile-view .pe');
    if (!pe || pe.__bound) return;
    pe.__bound = true;
    // badges.js loads after this file: its news is asked for here.
    window.Badges?.on(() => D && el && !D.busy && (paintBadges(), paintFoot()));
    pe.addEventListener('click', onClick);
    pe.addEventListener('change', (e) => {
      const f = e.target.closest('.pe-file');
      if (!f || !f.files || !f.files[0]) return;
      const file = f.files[0];
      f.value = '';
      pick(file);
    });
    pe.addEventListener('input', (e) => {
      // The name: letters, digits, _ . - and single spaces between words, as the first launch takes it (cloud.js).
      const nm = D && e.target.closest('.pe-nm');
      if (nm) {
        const v = nm.value;
        const clean = v.replace(/[^A-Za-z0-9_. -]/g, '').replace(/ {2,}/g, ' ').replace(/^ /, '').slice(0, NAME_MAX());
        if (clean !== v) {
          const at = Math.max(0, (nm.selectionStart || 0) - (v.length - clean.length));
          nm.value = clean;
          nm.setSelectionRange(at, at);
        }
        D.name = nm.value;
        D.nameErr = '';
        paintName();
        return changed();
      }
      if (!D || !e.target.closest('.pe-in')) return;
      D.showErr = false;
      paintLive();
      paintFoot();
    });
    pe.addEventListener('keydown', (e) => {
      if (!D) return;
      if (e.key === 'Enter' && e.target.closest('.pe-in')) {
        e.preventDefault();
        return addTyped();
      }
      if (e.key === 'Enter' && e.target.closest('.pe-nm')) {
        e.preventDefault();
        return save();
      }
      // The badges as one radio group: the arrows move the pick.
      const r = e.target.closest('.pe-bdg');
      const step = r && { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (step) {
        e.preventDefault();
        const all = [...pe.querySelectorAll('.pe-bdg')];
        const next = all[(all.indexOf(r) + step + all.length) % all.length];
        pickBadge(next.dataset.badge);
        pe.querySelector(`.pe-bdg[data-badge="${CSS.escape(next.dataset.badge)}"]`)?.focus();
      }
    });
    pe.addEventListener('focusout', (e) => {
      if (!D || !e.target.closest('.pe-in') || !e.target.value.trim()) return;
      D.showErr = true;
      paintLive();
    });
  }

  // ---------- the picture: picked, dropped or pasted, then adjusted ----------
  async function pick(file) {
    if (!D || D.busy) return;
    let p;
    try {
      p = await P.open(file);
    } catch (e) {
      D.picErr = P.errText(e.message);
      D.small = false;
      return paintPic();
    }
    if (!D) return URL.revokeObjectURL(p.url);
    D.picErr = '';
    paintPic();
    openCrop(p);
  }

  // Dropped on the panel's picture or on the page's while editing. Only a file that's a picture lights the place up
  // (Apple: a drop target shows only while something it takes is over it).
  const ZONES = '.pe-drop, #profile-view.editing .pp-pic';
  const pictureDrag = (e) => {
    const dt = e.dataTransfer;
    if (!dt || !D || D.busy || C || !P.takes() || ![...(dt.types || [])].includes('Files')) return false;
    const items = [...(dt.items || [])].filter((i) => i.kind === 'file');
    return !items.length || items.some((i) => !i.type || /^image\//.test(i.type));
  };
  let over = null;
  const setOver = (z) => {
    if (over === z) return;
    over?.classList.remove('over');
    over = z;
    z?.classList.add('over');
  };
  // A file let go anywhere else while editing goes nowhere: the web view would open it in place of the dashboard.
  const fileDrag = (e) => !!D && [...(e.dataTransfer?.types || [])].includes('Files');
  document.addEventListener('dragover', (e) => {
    const z = e.target.closest?.(ZONES);
    if (!z || !pictureDrag(e)) {
      setOver(null);
      if (fileDrag(e)) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'none';
      }
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setOver(z);
  });
  document.addEventListener('dragleave', (e) => {
    if (over && !over.contains(e.relatedTarget)) setOver(null);
  });
  document.addEventListener('dragend', () => setOver(null));
  document.addEventListener('drop', (e) => {
    const z = e.target.closest?.(ZONES);
    setOver(null);
    if (fileDrag(e)) e.preventDefault();
    if (!z || !D || !P.takes()) return;
    e.preventDefault();
    const f = [...(e.dataTransfer.files || [])][0];
    if (f) pick(f);
  });
  // ⌘V while the panel is open: a picture copied (a screenshot, an image from a page). Text still pastes into the field.
  document.addEventListener('paste', (e) => {
    if (!visible() || D.busy || C || !P.takes()) return;
    const cd = e.clipboardData;
    const f = [...(cd?.files || [])].find((x) => /^image\//.test(x.type)) ||
      [...(cd?.items || [])].filter((i) => i.kind === 'file' && /^image\//.test(i.type)).map((i) => i.getAsFile()).find(Boolean);
    if (!f) return;
    e.preventDefault();
    pick(f);
  });

  // "Adjust picture": the picture under a square frame (what's in it is what the cards show), the rest dimmed; moved by
  // dragging it or with the arrow keys (4 px, 16 with Shift), zoomed with the slider, − and + or the scroll wheel.
  // Under it the sizes it shows at: a card, a list, the top bar. Apply puts it in the panel; Save sends it.
  const STAGE = 288, FRAME = 224; // the stage, and the square frame in its middle (CSS px)
  let C = null; // the sheet while it's open: { wrap, img, range, p, z, cx, cy, base }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function openCrop(p) {
    closeCrop();
    const wrap = document.createElement('div');
    wrap.className = 'pe-crop-wrap';
    wrap.innerHTML =
      `<div class="pe-crop" role="dialog" aria-modal="true" aria-labelledby="pe-crop-t" style="--rc:${who.rc}">` +
      '<h2 id="pe-crop-t">Adjust picture</h2>' +
      '<div class="pe-stage" tabindex="0" role="img" aria-roledescription="picture frame" aria-label="Your picture in its frame · drag it or use the arrow keys to move it" aria-describedby="pe-crop-hint">' +
      `<img class="pe-stage-img" alt="" src="${esc(p.url)}" draggable="false"><i class="pe-mask" aria-hidden="true"></i></div>` +
      '<p class="pe-hint" id="pe-crop-hint">Drag to move it · the arrow keys move it too, Shift for bigger steps</p>' +
      '<div class="pe-zoom"><button type="button" class="pe-btn pe-sq" data-z="out" aria-label="Zoom out" title="Zoom out">−</button>' +
      '<input class="pe-range" type="range" min="1" max="4" step="0.01" value="1" aria-label="Zoom">' +
      '<button type="button" class="pe-btn pe-sq" data-z="in" aria-label="Zoom in" title="Zoom in">+</button><button type="button" class="pe-btn" data-z="reset">Reset</button></div>' +
      '<div class="pe-sizes" aria-hidden="true"><figure><i data-s="96"></i><figcaption>96 · card</figcaption></figure><figure><i data-s="40"></i><figcaption>40 · list</figcaption></figure>' +
      '<figure><i data-s="24"></i><figcaption>24 · top bar</figcaption></figure></div>' +
      `<div class="pe-crop-warn" hidden>${warn('This picture is small and may look blurry', 'pe-warn')}</div>` +
      '<div class="pe-crop-foot"><button type="button" class="pe-btn" data-c="cancel">Cancel</button><button type="button" class="pe-btn pe-primary" data-c="apply">Apply</button></div></div>';
    document.body.appendChild(wrap);
    C = { wrap, p, z: 1, cx: p.w / 2, cy: p.h / 2, base: FRAME / Math.min(p.w, p.h) };
    C.img = wrap.querySelector('.pe-stage-img');
    C.range = wrap.querySelector('.pe-range');
    const stage = wrap.querySelector('.pe-stage');
    // Dragging moves the picture with the pointer.
    stage.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      stage.focus();
      stage.setPointerCapture(e.pointerId);
      const from = { x: e.clientX, y: e.clientY, cx: C.cx, cy: C.cy };
      const move = (ev) => {
        const k = C.base * C.z;
        C.cx = from.cx - (ev.clientX - from.x) / k;
        C.cy = from.cy - (ev.clientY - from.y) / k;
        layout();
      };
      const up = () => {
        stage.removeEventListener('pointermove', move);
        stage.removeEventListener('pointerup', up);
        stage.removeEventListener('pointercancel', up);
        stage.classList.remove('grab');
      };
      stage.classList.add('grab');
      stage.addEventListener('pointermove', move);
      stage.addEventListener('pointerup', up);
      stage.addEventListener('pointercancel', up);
    });
    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      zoomTo(C.z * Math.exp(-e.deltaY * 0.0025));
    }, { passive: false });
    stage.addEventListener('keydown', (e) => {
      const n = e.shiftKey ? 16 : 4;
      const d = { ArrowLeft: [n, 0], ArrowRight: [-n, 0], ArrowUp: [0, n], ArrowDown: [0, -n] }[e.key];
      if (d) {
        e.preventDefault();
        const k = C.base * C.z;
        // The picture moves the way the arrow points.
        C.cx += d[0] / k;
        C.cy += d[1] / k;
        return layout();
      }
      if (e.key === '+' || e.key === '=') zoomTo(C.z + 0.25);
      if (e.key === '-') zoomTo(C.z - 0.25);
    });
    C.range.addEventListener('input', () => zoomTo(+C.range.value));
    wrap.addEventListener('click', (e) => {
      const z = e.target.closest('[data-z]');
      if (z) return zoomTo(z.dataset.z === 'in' ? C.z + 0.25 : z.dataset.z === 'out' ? C.z - 0.25 : 1, z.dataset.z === 'reset');
      const c = e.target.closest('[data-c]');
      if (c) return c.dataset.c === 'apply' ? applyCrop() : closeCrop(true);
    });
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.target.closest('button')) {
        e.preventDefault();
        applyCrop();
      }
      // Tab stays in the sheet (it's modal).
      if (e.key === 'Tab') {
        const f = [...wrap.querySelectorAll('button, input, [tabindex="0"]')].filter((x) => !x.disabled);
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) {
          e.preventDefault();
          f[f.length - 1].focus();
        } else if (!e.shiftKey && i === f.length - 1) {
          e.preventDefault();
          f[0].focus();
        }
      }
    });
    layout();
    requestAnimationFrame(() => wrap.classList.add('on'));
    stage.focus();
  }

  function zoomTo(z, reset) {
    if (!C) return;
    C.z = clamp(z, 1, 4);
    if (reset) {
      C.cx = C.p.w / 2;
      C.cy = C.p.h / 2;
    }
    layout();
  }

  // The square cut, in the picture's own pixels: its side is the picture's short side over the zoom.
  const cropBox = () => {
    const side = Math.min(C.p.w, C.p.h) / C.z;
    return { x: C.cx - side / 2, y: C.cy - side / 2, side };
  };

  function layout() {
    const { p } = C;
    const k = C.base * C.z;
    const side = Math.min(p.w, p.h) / C.z;
    // The frame stays filled: the picture can't be moved past its edges.
    C.cx = clamp(C.cx, side / 2, p.w - side / 2);
    C.cy = clamp(C.cy, side / 2, p.h - side / 2);
    C.img.style.width = `${p.w * k}px`;
    C.img.style.height = `${p.h * k}px`;
    C.img.style.transform = `translate(${STAGE / 2 - C.cx * k}px, ${STAGE / 2 - C.cy * k}px)`;
    if (+C.range.value !== C.z) C.range.value = C.z;
    C.range.style.setProperty('--fill', `${((C.z - 1) / 3) * 100}%`);
    C.range.setAttribute('aria-valuetext', `${C.z.toFixed(1)}×`);
    const b = cropBox();
    C.wrap.querySelectorAll('.pe-sizes i').forEach((i) => {
      const s = +i.dataset.s, f = s / b.side;
      i.style.backgroundImage = `url("${p.url}")`;
      i.style.backgroundSize = `${p.w * f}px ${p.h * f}px`;
      i.style.backgroundPosition = `${-b.x * f}px ${-b.y * f}px`;
    });
    C.wrap.querySelector('.pe-crop-warn').hidden = b.side >= 256;
  }

  function applyCrop() {
    if (!C || !D) return;
    const b = cropBox();
    try {
      D.pic = { data: P.cut(C.p.img, b) };
      D.small = b.side < 256;
      D.picErr = '';
    } catch {
      D.picErr = "Couldn't make the picture small enough to send · try another";
    }
    closeCrop();
    paintPic();
    changed();
    el?.querySelector('[data-pe=choose]')?.focus();
  }

  function closeCrop(refocus) {
    if (!C) return;
    URL.revokeObjectURL(C.p.url);
    C.wrap.remove();
    C = null;
    if (refocus) el?.querySelector('[data-pe=choose]')?.focus();
  }

  // Esc: the sheet first, then "Discard changes?", then the panel (which asks when something changed). The big
  // picture (profile.js) and a badge's menu (badges.js) close themselves first.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (e.defaultPrevented || document.querySelector('.pic-zoom, .bdg-ctx, .acct-menu, .acct-confirm')) return;
    // A Discard / remove box from another view that is still open (hidden) must not block the panel's Esc.
    if ([...document.querySelectorAll('.mn-confirm')].some((b) => b.offsetParent !== null)) return;
    if (C) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return closeCrop(true);
    }
    if (!visible()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const q = el.querySelector('.pe-ask');
    if (q) {
      q.remove();
      return focusIn();
    }
    close();
  }, true);

  // The account (after a save, a sign in) and the badges change what the panel shows; the field keeps what's typed.
  window.addEventListener('account', () => {
    if (!D || D.busy || !el) return;
    // Links you haven't touched follow the account (a sign in made from the panel brings its links in).
    if (sameLinks(D.links, D.base)) D.links = D.base = savedLinks();
    paint();
  });

  /** cloud.js, as it draws the page: your name, tag and rank colour for the panel's NAME and initial. */
  function sync(w) {
    who = w;
    bind();
    if (!D || !el) return;
    el.style.setProperty('--rc', w.rc);
    paintName();
  }

  return { open, close, look, sync, isOpen: () => !!D, dirty };
})();
