'use strict';
// A terminal window's tabs and split panes (main.js), the Mac's Panes.swift: each tab is a tree whose leaves are the ids of
// the terminals in it and whose other nodes split their place side by side ("row") or one above the other ("col"), each
// child's share of it in `sizes` (adding up to 1). Plain data, so a window's layout can be kept in settings.json and come
// back with its sessions at the next launch.

const leaf = (n) => typeof n === 'string';

/** Every terminal in `node`, left to right and top to bottom. */
function ids(node) {
  if (!node) return [];
  return leaf(node) ? [node] : node.kids.flatMap(ids);
}

const has = (node, id) => ids(node).includes(id);

/**
 * `node` with terminal `id` split off `target`: after it (right or below) or `before` it, in a `dir` split. Only the
 * target's place is halved, as in iTerm2; the others keep theirs.
 */
function insert(node, target, id, dir, before = false) {
  if (leaf(node)) return node !== target ? node : { dir, kids: before ? [id, node] : [node, id], sizes: [0.5, 0.5] };
  const i = node.kids.indexOf(target);
  if (i >= 0 && node.dir === dir) {
    const kids = node.kids.slice(), sizes = node.sizes.slice();
    const half = sizes[i] / 2;
    sizes[i] = half;
    kids.splice(before ? i : i + 1, 0, id);
    sizes.splice(before ? i : i + 1, 0, half);
    return { dir, kids, sizes };
  }
  return { dir: node.dir, kids: node.kids.map((k) => insert(k, target, id, dir, before)), sizes: node.sizes.slice() };
}

/** `node` without terminal `id` (its place goes to the panes beside it), or null when nothing is left. A split left with one pane gives way to it. */
function remove(node, id) {
  if (!node) return null;
  if (leaf(node)) return node === id ? null : node;
  const kids = [], sizes = [];
  node.kids.forEach((k, i) => {
    const r = remove(k, id);
    if (r) {
      kids.push(r);
      sizes.push(node.sizes[i]);
    }
  });
  if (!kids.length) return null;
  if (kids.length === 1) return kids[0];
  const sum = sizes.reduce((a, b) => a + b, 0) || 1;
  return { dir: node.dir, kids, sizes: sizes.map((s) => s / sum) };
}

/**
 * A tree read back from settings.json, kept to the terminals in `live` (null when none of them is left): each is taken
 * out of `live` as it's placed, so none shows twice. The ones gone leave no hole: their split closes up around them.
 */
function clean(node, live) {
  if (leaf(node)) return live.delete(node) ? node : null;
  if (!node || !Array.isArray(node.kids) || !['row', 'col'].includes(node.dir)) return null;
  const kids = [], sizes = [];
  node.kids.forEach((k, i) => {
    const c = clean(k, live);
    if (!c) return;
    kids.push(c);
    sizes.push(Number(node.sizes && node.sizes[i]) > 0 ? Number(node.sizes[i]) : 1);
  });
  if (!kids.length) return null;
  if (kids.length === 1) return kids[0];
  const sum = sizes.reduce((a, b) => a + b, 0);
  return { dir: node.dir, kids, sizes: sizes.map((s) => s / sum) };
}

/**
 * Where each terminal of `node` goes in `r` ({ x, y, width, height }), `gap` px between panes: `rects` (id -> rect),
 * `paths` (id -> the child indexes down to it) and the gaps (`dividers`: the path to their split, which gap of it `k`,
 * its direction, its rect, and `from`/`to`, the span of the two panes it parts) for dragging.
 */
function layout(node, r, gap) {
  const rects = new Map(), paths = new Map(), dividers = [];
  const walk = (n, box, path) => {
    if (leaf(n)) {
      rects.set(n, box);
      paths.set(n, path);
      return;
    }
    const row = n.dir === 'row';
    const start = row ? box.x : box.y, end = start + (row ? box.width : box.height);
    const room = Math.max(0, end - start - gap * (n.kids.length - 1));
    const edges = [start];
    let at = start;
    n.kids.forEach((k, i) => {
      const len = i === n.kids.length - 1 ? Math.max(0, end - at) : Math.max(0, Math.round(room * n.sizes[i]));
      walk(k, row ? { x: at, y: box.y, width: len, height: box.height } : { x: box.x, y: at, width: box.width, height: len }, [...path, i]);
      at += len;
      if (i < n.kids.length - 1) {
        dividers.push({ path, k: i, dir: n.dir, ...(row ? { x: at, y: box.y, width: gap, height: box.height } : { x: box.x, y: at, width: box.width, height: gap }) });
        at += gap;
        edges.push(at);
      }
    });
    edges.push(end + gap);
    // Each gap's two panes: from the first one's start to the second one's end.
    for (const d of dividers) if (d.path === path) Object.assign(d, { from: edges[d.k], to: edges[d.k + 2] - gap });
  };
  if (node) walk(node, r, []);
  return { rects, paths, dividers };
}

/** The split at `path` in `node`. */
function at(node, path) {
  let n = node;
  for (const i of path) n = n && !leaf(n) ? n.kids[i] : null;
  return n && !leaf(n) ? n : null;
}

/** Moves gap `k` of the split at `path` to `pos` (px along it, inside `from`…`to`): the two panes beside it share their place anew, neither under 10% of it. */
function setDivider(node, d, pos, gap) {
  const n = at(node, d.path);
  if (!n || !(d.k >= 0 && d.k < n.kids.length - 1) || !(d.to - d.from > gap)) return false;
  const pair = n.sizes[d.k] + n.sizes[d.k + 1];
  const f = Math.min(0.9, Math.max(0.1, (pos - d.from) / (d.to - d.from - gap)));
  n.sizes[d.k] = pair * f;
  n.sizes[d.k + 1] = pair * (1 - f);
  return true;
}

/**
 * The pane that way from `id` (`dx` right is +1, `dy` up is +1), the Mac's selectPane(dx:dy:): the nearest whose middle is
 * that way, the one straight across before one off to the side. Null when there's none.
 */
function neighbor(rects, id, dx, dy) {
  const cur = rects.get(id);
  if (!cur) return null;
  const mid = (r) => [r.x + r.width / 2, r.y + r.height / 2];
  const [cx, cy] = mid(cur);
  let best = null, bestScore = Infinity;
  for (const [other, r] of rects) {
    if (other === id) continue;
    const [ox, oy] = mid(r);
    const x = ox - cx, y = cy - oy;
    const along = x * dx + y * dy;
    if (along <= 10) continue;
    const score = along + 2 * Math.abs(x * dy - y * dx);
    if (score < bestScore) {
      best = other;
      bestScore = score;
    }
  }
  return best;
}

/** The way the split right around terminal `id` runs ("row" or "col"), or null when `id` is a tab of its own. */
function dirOf(node, id) {
  if (!node || leaf(node)) return null;
  if (node.kids.includes(id)) return node.dir;
  for (const k of node.kids) {
    const d = dirOf(k, id);
    if (d) return d;
  }
  return null;
}

module.exports = { ids, has, insert, remove, clean, layout, at, setDivider, neighbor, dirOf };
