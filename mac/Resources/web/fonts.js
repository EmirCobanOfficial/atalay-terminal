'use strict';

// Settings → TERMINALS: the terminals' font and text size, beside the dashboard's own (INTERFACE, cloud.js renderUI). As
// in VS Code, Warp and Discord, the app's size stays apart from the text you read and type in. The font: SF Mono, the
// user's iTerm2 one (the usual one while nothing is picked) or another monospace font on the Mac (TerminalFont.swift);
// the size in points, 9 to 24, the same one the Bigger and Smaller Text keys change in a terminal. Both apply to every
// open terminal at once and Settings sync carries them (account.js). A line of a terminal under them shows the pick at
// the size the terminals draw it.
window.Fonts = (() => {
  const h = window.webkit && window.webkit.messageHandlers;
  if (!h || !h.cloud) return null;
  const cloud = (msg) => h.cloud.postMessage(msg).catch(() => null);
  const theme = (msg) => (h.theme ? h.theme.postMessage(msg).catch(() => null) : Promise.resolve(null));
  const keys = (msg) => (h.keys ? h.keys.postMessage(msg).catch(() => null) : Promise.resolve(null));
  const MIN = 9, MAX = 24;
  let page = null; // Settings' page while the menu is open
  let st = null; // the "terminalFont" reply: size, family (picked), current, usual, iterm
  let families = null;
  let zoom = 1; // the dashboard's text size: the preview is drawn smaller by as much, to match the terminals
  let keyHint = '';

  const css = (f) => (f === 'SF Mono' ? 'ui-monospace, "SF Mono"' : `"${f.replace(/["\\]/g, '')}"`) + ', ui-monospace, Menlo, monospace';

  function paint() {
    if (!page || !page.isConnected || !st) return;
    const pick = page.querySelector('.tf-font'), size = page.querySelector('.tf-size'), note = page.querySelector('.tf-note');
    const demo = page.querySelector('.tf-demo');
    if (!pick || !size) return;
    // The usual font first, as it came; the others by name.
    const usual = `${st.usual}${st.iterm ? ' · as in iTerm2' : ''}`;
    const others = (families || [st.current]).filter((f) => f !== st.usual);
    const on = st.current === st.usual ? '' : st.current;
    setHTML(pick, `<option value="">${esc(usual)}</option>` + others.map((f) => `<option value="${esc(f)}"${f === on ? ' selected' : ''}>${esc(f)}</option>`).join(''));
    pick.value = on;
    pick.disabled = false;
    note.textContent = st.family && st.family !== st.current ? `${st.family} isn't on this Mac · ${st.current} for now` : 'the text in every terminal';
    setHTML(size,
      `<button type="button" data-d="-1" title="Smaller"${st.size <= MIN ? ' disabled' : ''}>−</button>` +
      `<b>${st.size} pt</b>` +
      `<button type="button" data-d="1" title="Bigger"${st.size >= MAX ? ' disabled' : ''}>+</button>`);
    page.querySelector('.tf-keys').textContent = keyHint || 'the terminals change at once';
    if (demo) {
      demo.style.fontFamily = css(st.current);
      demo.style.fontSize = `${(st.size / zoom).toFixed(2)}px`;
    }
  }

  async function load() {
    const [s, list, ui, k] = await Promise.all([
      cloud({ type: 'terminalFont' }),
      families ? null : cloud({ type: 'terminalFonts' }),
      theme({ type: 'ui' }),
      keyHint ? null : keys({ type: 'list' }),
    ]);
    if (s && s.size) st = s;
    if (list && list.families) families = list.families;
    if (ui && ui.scale) zoom = ui.scale;
    const all = (k && k.shortcuts) || [];
    const big = all.find((x) => x.id === 'biggerText'), small = all.find((x) => x.id === 'smallerText');
    if (big && small && big.label && small.label) keyHint = `${big.label} and ${small.label} in a terminal too`;
    paint();
  }

  async function set(msg) {
    const was = st && st.current;
    const r = await cloud(Object.assign({ type: 'terminalFont' }, msg));
    if (r && r.size) st = r;
    paint();
    if (st && st.current !== was) codeFont(st.current);
  }

  // The code in the terminals' font follows at once too: Source Control (git.css's --code-font, git-editor.js) and the
  // file editor (file-editor.js listens for "terminallook"), and the next views opened (window.__terminalLook).
  function codeFont(family) {
    const stack = css(family);
    if (window.__terminalLook) window.__terminalLook.font = family;
    document.documentElement.style.setProperty('--code-font', stack);
    window.dispatchEvent(new CustomEvent('terminallook', { detail: { fontFamily: stack } }));
  }

  // cloud.js calls it when Settings shows.
  function mount(el) {
    page = el;
    if (!page || !page.querySelector('.tf-font')) return;
    page.querySelector('.tf-font').onchange = (e) => set({ family: e.target.value });
    page.querySelector('.tf-size').onclick = (e) => {
      const b = e.target.closest('button[data-d]');
      if (b && st) set({ size: Math.min(MAX, Math.max(MIN, st.size + Number(b.dataset.d))) });
    };
    // The dashboard's text size changed: the preview keeps the terminals' size.
    const scale = page.querySelector('.ui-scale');
    if (scale && !scale.dataset.tf) {
      scale.dataset.tf = '1';
      scale.addEventListener('click', () => setTimeout(() => theme({ type: 'ui' }).then((ui) => ui && ((zoom = ui.scale || 1), paint())), 120));
    }
    load();
  }

  return { mount };
})();
