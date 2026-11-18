'use strict';

// The community feed's panel (Messages.swift FeedPanel): the lines of the feed at the top left of the physical screen,
// over whatever app is in front. community.js on the dashboard decides what shows and when; this only draws what it
// hands over (through Swift) and says when nothing is left, so the panel can go away. Drawing: feed-draw.js.
(() => {
  const box = document.getElementById('killfeed');
  const lines = new Map(); // id -> element
  const tell = (empty) => window.webkit?.messageHandlers?.feed?.postMessage({ type: 'feedState', empty });

  window.__feed = {
    add(id, kind, html) {
      if (!id || lines.has(id)) return;
      tell(false);
      lines.set(id, KillFeed.add(box, kind, html));
    },
    out(id) {
      const el = lines.get(id);
      if (!el) return;
      lines.delete(id);
      KillFeed.dissolve(el, () => lines.size || tell(true));
    },
    clear() {
      for (const el of lines.values()) el.remove();
      lines.clear();
      tell(true);
    },
  };
  window.webkit?.messageHandlers?.feed?.postMessage({ type: 'ready' });
})();
