// Tree: a leaf is a tile id (string). A split is { dir: "h" | "v", a, b, r }
// "h" = side by side (a left, b right), "v" = stacked (a top, b bottom), r = size of a

export function getRects(t, r = { x: 0, y: 0, w: 100, h: 100 }, out = {}) {
  if (!t) return out;
  if (typeof t === "string") { out[t] = r; return out; }
  if (t.dir === "h") {
    getRects(t.a, { ...r, w: r.w * t.r }, out);
    getRects(t.b, { x: r.x + r.w * t.r, y: r.y, w: r.w * (1 - t.r), h: r.h }, out);
  } else {
    getRects(t.a, { ...r, h: r.h * t.r }, out);
    getRects(t.b, { x: r.x, y: r.y + r.h * t.r, w: r.w, h: r.h * (1 - t.r) }, out);
  }
  return out;
}

// Split the target leaf and put the new id next to it
export function insert(t, target, id, aspect) {
  if (!t) return id;
  const rects = getRects(t);
  const go = (n) => {
    if (typeof n === "string") {
      if (n !== target) return n;
      const r = rects[n];
      return { dir: r.w * aspect >= r.h ? "h" : "v", a: n, b: id, r: 0.5 };
    }
    return { ...n, a: go(n.a), b: go(n.b) };
  };
  return go(t);
}

// Remove a leaf; its sibling takes the space
export function remove(t, id) {
  if (!t || t === id) return null;
  if (typeof t === "string") return t;
  const a = remove(t.a, id), b = remove(t.b, id);
  return a && b ? { ...t, a, b } : a || b;
}

// Repairs the tree if it doesn't match the tile list (old saves, cloud data)
export function fit(t, ids, aspect) {
  let tree = t;
  const have = Object.keys(getRects(tree));
  have.forEach((id) => { if (!ids.includes(id)) tree = remove(tree, id); });
  ids.forEach((id) => {
    if (have.includes(id)) return;
    const keys = Object.keys(getRects(tree));
    tree = insert(tree, keys[keys.length - 1], id, aspect);
  });
  return tree;
}

// Closest tile in a direction. rects is the { id: rect } map. Returns an id or null
// Closest tile that sits beside the current one in a direction
export function neighbor(rects, from, dir) {
  const a = rects[from];
  if (!a) return null;
  const eps = 0.01;
  const horiz = dir === "left" || dir === "right";
  const mid = (r) => (horiz ? r.y + r.h / 2 : r.x + r.w / 2);
  let best = null, bestScore = Infinity;

  for (const [id, r] of Object.entries(rects)) {
    if (id === from) continue;

    // distance between facing edges (negative = wrong side)
    const gap =
      dir === "right" ? r.x - (a.x + a.w) :
      dir === "left"  ? a.x - (r.x + r.w) :
      dir === "down"  ? r.y - (a.y + a.h) :
                        a.y - (r.y + r.h);
    if (gap < -eps) continue;

    // must overlap on the other axis, so no diagonal jumps
    const overlap = horiz
      ? Math.min(a.y + a.h, r.y + r.h) - Math.max(a.y, r.y)
      : Math.min(a.x + a.w, r.x + r.w) - Math.max(a.x, r.x);
    if (overlap <= eps) continue;

    // nearest edge first, then closest center
    const score = gap * 1000 + Math.abs(mid(r) - mid(a));
    if (score < bestScore) { bestScore = score; best = id; }
  }
  return best;
}