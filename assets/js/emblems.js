// Pictures for the small pin board, one per project.
// Each one is drawn on a canvas: the red channel is pin height, the green channel is pin brightness.

const S = 256;

function canvas() {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.fillStyle = 'rgb(0, 235, 0)';
  x.fillRect(0, 0, S, S);
  x.lineCap = 'round';
  x.lineJoin = 'round';
  return [c, x];
}

// height 0..1 and brightness 0..1 packed into a colour
const col = (h, b = 0.92) => `rgb(${Math.round(h * 255)}, ${Math.round(b * 255)}, 0)`;

function soften(x, px = 1.2) {
  // a touch of blur so slopes read as slopes, not stairs
  const c2 = document.createElement('canvas');
  c2.width = c2.height = S;
  const y = c2.getContext('2d', { willReadFrequently: true });
  y.filter = `blur(${px}px)`;
  y.drawImage(x.canvas, 0, 0);
  return y.getImageData(0, 0, S, S);
}

const draw = {
  glassbox(x) {
    // an isometric cube drawn as a wire frame, back edges low, front edges high, one clause in the middle
    const c = [128, 136], a = 70;
    const P = (X, Y, Z) => [c[0] + (X - Z) * a * 0.866, c[1] + (X + Z) * a * 0.5 - Y * a];
    const v = {};
    for (const X of [-1, 1]) for (const Y of [-1, 1]) for (const Z of [-1, 1]) v[`${X}${Y}${Z}`] = P(X * 0.62, Y * 0.62, Z * 0.62);
    const edge = (p, q, h, w) => { x.strokeStyle = col(h); x.lineWidth = w; x.beginPath(); x.moveTo(...v[p]); x.lineTo(...v[q]); x.stroke(); };
    const back = [['-1-1-1', '1-1-1'], ['-1-1-1', '-11-1'], ['-1-1-1', '-1-11']];
    for (const [p, q] of back) edge(p, q, 0.34, 15);
    x.fillStyle = col(1.0, 1);
    x.beginPath(); x.arc(c[0], c[1] - 4, 21, 0, Math.PI * 2); x.fill();
    const front = [['1-1-1', '11-1'], ['1-1-1', '1-11'], ['-11-1', '11-1'], ['-11-1', '-111'], ['-1-11', '1-11'], ['-1-11', '-111'], ['111', '11-1'], ['111', '1-11'], ['111', '-111']];
    for (const [p, q] of front) edge(p, q, 0.8, 18);
  },
  candor(x) {
    // a seal with a check mark and two ribbon tails
    x.fillStyle = col(0.42);
    x.beginPath(); x.moveTo(96, 160); x.lineTo(70, 236); x.lineTo(98, 218); x.lineTo(116, 244); x.lineTo(128, 172); x.fill();
    x.beginPath(); x.moveTo(160, 160); x.lineTo(186, 236); x.lineTo(158, 218); x.lineTo(140, 244); x.lineTo(128, 172); x.fill();
    x.fillStyle = col(0.55);
    x.beginPath();
    for (let i = 0; i < 48; i++) {
      const r = i % 2 ? 84 : 94, t = (i / 48) * Math.PI * 2;
      x.lineTo(128 + r * Math.cos(t), 112 + r * Math.sin(t));
    }
    x.fill();
    x.strokeStyle = col(0.9); x.lineWidth = 12;
    x.beginPath(); x.arc(128, 112, 64, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = col(1.0, 1); x.lineWidth = 22;
    x.beginPath(); x.moveTo(98, 114); x.lineTo(120, 136); x.lineTo(162, 88); x.stroke();
  },
  trace(x) {
    // a shield: raised rim, lower field, and a trace line running through it
    const shield = (s) => {
      x.beginPath();
      x.moveTo(128, 32 + s);
      x.bezierCurveTo(160, 52 + s, 186, 56 + s * 0.5, 210 - s, 56 + s * 0.5);
      x.bezierCurveTo(212 - s, 140, 186 - s * 0.6, 196 - s * 0.6, 128, 230 - s);
      x.bezierCurveTo(70 + s * 0.6, 196 - s * 0.6, 44 + s, 140, 46 + s, 56 + s * 0.5);
      x.bezierCurveTo(70, 56 + s * 0.5, 96, 52 + s, 128, 32 + s);
      x.closePath();
    };
    x.fillStyle = col(0.95); shield(0); x.fill();
    x.fillStyle = col(0.3); shield(24); x.fill();
    x.strokeStyle = col(0.9, 1); x.lineWidth = 16;
    x.beginPath(); x.moveTo(78, 132); x.lineTo(100, 132); x.lineTo(114, 100); x.lineTo(136, 168); x.lineTo(152, 120); x.lineTo(162, 132); x.lineTo(186, 132); x.stroke();
  },
  veritas(x) {
    // the double turnstile: "is a valid consequence of"
    x.fillStyle = col(1.0, 1);
    x.fillRect(66, 54, 26, 148);
    x.fillRect(92, 94, 104, 22);
    x.fillRect(92, 142, 104, 22);
    x.fillStyle = col(0.45);
    x.fillRect(176, 196, 26, 26);
  },
  lucid(x) {
    // an ARC-style puzzle grid: cells at three heights
    const g = [
      '0000000',
      '0221220',
      '0210120',
      '0003000',
      '0210120',
      '0221220',
      '0000000',
    ];
    const n = 7, cs = 30, o = (S - n * cs) / 2;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const v = +g[r][c];
      x.fillStyle = col([0.12, 0.45, 0.72, 1.0][v], [0.5, 0.8, 0.92, 1][v]);
      x.fillRect(o + c * cs + 3, o + r * cs + 3, cs - 6, cs - 6);
    }
  },
  graphtm(x) {
    // a benzene ring with a nitro group: the classic Ames-positive pattern
    const cx = 108, cy = 140, R = 54;
    const pts = [];
    for (let i = 0; i < 6; i++) { const t = Math.PI / 6 + i * Math.PI / 3; pts.push([cx + R * Math.cos(t), cy + R * Math.sin(t)]); }
    x.strokeStyle = col(0.55); x.lineWidth = 14;
    x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(...p) : x.moveTo(...p))); x.closePath(); x.stroke();
    x.lineWidth = 11;
    for (const i of [0, 2, 4]) {
      const a = pts[i], b = pts[(i + 1) % 6];
      const k = 0.78, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const ix = cx + (mx - cx) * k, iy = cy + (my - cy) * k;
      const dx = (b[0] - a[0]) * 0.32, dy = (b[1] - a[1]) * 0.32;
      x.beginPath(); x.moveTo(ix - dx, iy - dy); x.lineTo(ix + dx, iy + dy); x.stroke();
    }
    const top = pts[4];
    const N = [top[0] + 34, top[1] - 46];
    x.lineWidth = 14; x.beginPath(); x.moveTo(...top); x.lineTo(...N); x.stroke();
    const O1 = [N[0] + 56, N[1] - 8], O2 = [N[0] + 8, N[1] - 54];
    x.beginPath(); x.moveTo(...N); x.lineTo(...O1); x.moveTo(...N); x.lineTo(...O2); x.stroke();
    for (const [p, r, h] of [[N, 21, 1.0], [O1, 19, 0.85], [O2, 19, 0.85]]) {
      x.fillStyle = col(h, 1); x.beginPath(); x.arc(p[0], p[1], r, 0, Math.PI * 2); x.fill();
    }
    for (const p of pts) { x.fillStyle = col(0.75); x.beginPath(); x.arc(p[0], p[1], 14, 0, Math.PI * 2); x.fill(); }
  },
  vsclaude(x) {
    // Pixie, the companion from vsclaude
    x.strokeStyle = col(0.6); x.lineWidth = 14;
    x.beginPath(); x.moveTo(96, 92); x.lineTo(92, 46); x.moveTo(160, 92); x.lineTo(164, 46); x.stroke();
    x.fillStyle = col(0.95, 1);
    x.beginPath(); x.arc(92, 40, 12, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(164, 40, 12, 0, Math.PI * 2); x.fill();
    x.fillStyle = col(0.78);
    roundRect(x, 50, 84, 156, 112, 26); x.fill();
    x.fillStyle = col(0.18, 0.35);
    x.beginPath(); x.arc(102, 132, 17, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(154, 132, 17, 0, Math.PI * 2); x.fill();
    x.fillStyle = col(0.95, 1);
    x.beginPath(); x.arc(107, 126, 6, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(159, 126, 6, 0, Math.PI * 2); x.fill();
    x.fillStyle = col(0.35, 0.4);
    roundRect(x, 114, 162, 28, 9, 4); x.fill();
    x.fillStyle = col(0.42);
    roundRect(x, 92, 212, 72, 22, 10); x.fill();
  },
  pixie(x) {
    // Pixie at its laptop, from Claude Code, in motion, drawn from the real sprite's pixels
    const cell = 10.704, ox = -53.97, oy = -33.10;
    const R = [
      [12.00, 24.50, 10.00, 1.20, 0.56, 0.8],
      [12.50, 17.50, 9.00, 7.00, 0.36, 0.5],
      [13.20, 18.30, 7.60, 5.40, 0.5, 0.95],
      [14.00, 19.10, 4.00, 0.70, 0.3, 0.55],
      [14.00, 20.50, 6.00, 0.70, 0.3, 0.55],
      [14.00, 21.90, 4.00, 0.70, 0.3, 0.55],
      [11.50, 18.50, 1.60, 2.60, 0.56, 0.8],
      [14.50, 18.50, 1.60, 2.60, 0.56, 0.8],
      [18.50, 18.50, 1.60, 2.60, 0.56, 0.8],
      [21.50, 18.50, 1.60, 2.60, 0.56, 0.8],
      [13.00, 5.60, 1.00, 2.80, 0.74, 0.92],
      [12.40, 4.40, 2.20, 1.60, 0.9, 1.0],
      [20.00, 5.60, 1.00, 2.80, 0.74, 0.92],
      [19.40, 4.40, 2.20, 1.60, 0.9, 1.0],
      [11.00, 8.00, 12.00, 11.00, 0.74, 0.92],
      [10.00, 9.00, 14.00, 9.00, 0.74, 0.92],
      [12.00, 8.60, 10.00, 1.00, 0.9, 1.0],
      [11.00, 17.60, 12.00, 1.40, 0.56, 0.8],
      [13.30, 11.40, 3.00, 3.20, 0.14, 0.3],
      [15.00, 11.80, 0.90, 0.90, 1.0, 1.0],
      [18.70, 11.40, 3.00, 3.20, 0.14, 0.3],
      [20.40, 11.80, 0.90, 0.90, 1.0, 1.0],
      [15.90, 16.00, 2.40, 0.80, 0.56, 0.8],
    ];
    for (const [cx, cy, cw, ch, h, b] of R) {
      x.fillStyle = col(h, b);
      x.fillRect(ox + cx * cell, oy + cy * cell, cw * cell, ch * cell);
    }
  },
  thgtm(x) {
    // a hierarchical graph with an echo ring around the root: a trajectory remembered over time
    const top = [128, 62], mid = [[78, 128], [178, 128]], bot = [[48, 196], [100, 196], [156, 196], [208, 196]];
    x.strokeStyle = col(0.5); x.lineWidth = 12;
    x.beginPath();
    for (const m of mid) { x.moveTo(...top); x.lineTo(...m); }
    x.moveTo(...mid[0]); x.lineTo(...bot[0]); x.moveTo(...mid[0]); x.lineTo(...bot[1]);
    x.moveTo(...mid[1]); x.lineTo(...bot[2]); x.moveTo(...mid[1]); x.lineTo(...bot[3]);
    x.stroke();
    x.strokeStyle = col(0.32); x.lineWidth = 8;
    x.beginPath(); x.arc(top[0], top[1], 36, 0, Math.PI * 2); x.stroke();
    for (const [p, r, h] of [[top, 22, 1.0], [mid[0], 18, 0.85], [mid[1], 18, 0.85], ...bot.map(b => [b, 15, 0.7])]) {
      x.fillStyle = col(h, 1); x.beginPath(); x.arc(p[0], p[1], r, 0, Math.PI * 2); x.fill();
    }
  },
  ditm(x) {
    // Boolean data diffusing into noise from left to right
    const n = 8, cs = 26, o = (S - n * cs) / 2;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const clean = (r + c) % 3 === 0 || r === c;
      const noise = c / (n - 1);
      const on = rnd() < noise * 0.85 ? rnd() < 0.5 : clean;
      x.fillStyle = col(on ? 0.95 : 0.12, on ? 1 : 0.6);
      x.fillRect(o + c * cs + 3, o + r * cs + 3, cs - 6, cs - 6);
    }
  },
  reins(x) {
    // an agent trajectory where one step is blocked and repaired by the cheapest detour
    const ys = 160, xs = [40, 92, 144, 196, 228];
    x.strokeStyle = col(0.5); x.lineWidth = 12;
    x.beginPath(); x.moveTo(xs[0], ys); x.lineTo(xs[1], ys); x.moveTo(xs[3], ys); x.lineTo(xs[4], ys); x.stroke();
    x.strokeStyle = col(0.18, 0.5); x.lineWidth = 6; x.setLineDash([8, 8]);
    x.beginPath(); x.moveTo(xs[1], ys); x.lineTo(xs[3], ys); x.stroke(); x.setLineDash([]);
    x.strokeStyle = col(0.9, 1); x.lineWidth = 12;
    x.beginPath(); x.moveTo(xs[1], ys); x.quadraticCurveTo(144, 50, xs[3], ys); x.stroke();
    for (const [px, h] of [[xs[0], 0.75], [xs[1], 0.8], [xs[3], 0.8], [xs[4], 0.75]]) { x.fillStyle = col(h, 1); x.beginPath(); x.arc(px, ys, 16, 0, Math.PI * 2); x.fill(); }
    x.fillStyle = col(1.0, 1); x.beginPath(); x.arc(144, 104, 15, 0, Math.PI * 2); x.fill();
    x.strokeStyle = col(0.25, 0.4); x.lineWidth = 8;
    x.beginPath(); x.moveTo(132, ys - 12); x.lineTo(156, ys + 12); x.moveTo(156, ys - 12); x.lineTo(132, ys + 12); x.stroke();
  },
  attn(x) {
    // tokens in a row with attention arcs between them, the edges of a graph
    const xs = [40, 76, 112, 148, 184, 220], y = 190;
    const arcs = [[0, 2, 0.55], [1, 4, 0.8], [2, 5, 0.65], [0, 5, 1.0], [3, 4, 0.45]];
    for (const [a, b, h] of arcs) {
      x.strokeStyle = col(h); x.lineWidth = 9;
      const mx = (xs[a] + xs[b]) / 2, r = (xs[b] - xs[a]) / 2;
      x.beginPath(); x.ellipse(mx, y, r, r * 1.1, 0, Math.PI, 0); x.stroke();
    }
    for (const px of xs) { x.fillStyle = col(0.9, 1); x.beginPath(); x.arc(px, y, 14, 0, Math.PI * 2); x.fill(); }
  },
  mneme(x) {
    // a textbook turning into a stack of flash cards
    const card = (X, Y, h) => {
      x.fillStyle = col(h); roundRect(x, X, Y, 132, 92, 10); x.fill();
      x.strokeStyle = col(h + 0.18 > 1 ? 1 : h + 0.18, 1); x.lineWidth = 7;
      x.beginPath(); x.moveTo(X + 20, Y + 34); x.lineTo(X + 108, Y + 34); x.moveTo(X + 20, Y + 58); x.lineTo(X + 84, Y + 58); x.stroke();
    };
    card(36, 120, 0.35); card(62, 92, 0.58); card(88, 64, 0.8);
  },
  pocketos(x) {
    // a phone with a desktop inside: two windows and a dock
    x.strokeStyle = col(0.95, 1); x.lineWidth = 12;
    roundRect(x, 70, 26, 116, 204, 22); x.stroke();
    x.fillStyle = col(0.6); roundRect(x, 88, 54, 58, 46, 6); x.fill();
    x.fillStyle = col(0.8); roundRect(x, 110, 92, 60, 52, 6); x.fill();
    x.fillStyle = col(0.45); roundRect(x, 92, 186, 72, 18, 8); x.fill();
  },
  nexus(x) {
    // the 121-hole star board of Chinese Checkers, with one marble hopping out of its home triangle
    const R = 4, sz = 9.2, cells = [];
    for (let q = -2 * R; q <= 2 * R; q++) for (let r = -2 * R; r <= 2 * R; r++) {
      const s = -q - r;
      const inHex = Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= R;
      const tip = (a, b2, c2) => a > R && a <= 2 * R && b2 <= 0 && c2 <= 0 && b2 >= -R && c2 >= -R;
      if (inHex || tip(q, r, s) || tip(r, q, s) || tip(s, q, r) || tip(-q, -r, -s) || tip(-r, -q, -s) || tip(-s, -q, -r)) cells.push([q, r]);
    }
    const px = ([q, r]) => [128 + sz * Math.sqrt(3) * (q + r / 2), 128 + sz * 1.5 * r];
    const key = ([q, r]) => q + ',' + r;
    const start = [-1, 5], land = [[-1, 3], [-1, 1], [-1, -1]], over = new Set([[-1, 4], [-1, 2], [-1, 0]].map(key));
    for (const c of cells) {
      const [X, Y] = px(c);
      const k = key(c);
      const home = c[1] > R && k !== key(start);
      const h = home ? 0.95 : over.has(k) ? 0.7 : 0.34;
      x.fillStyle = col(h, home || over.has(k) ? 1 : 0.6);
      x.beginPath(); x.arc(X, Y, home || over.has(k) ? 7 : 4.8, 0, Math.PI * 2); x.fill();
    }
    x.strokeStyle = col(0.8, 1); x.lineWidth = 4.5;
    let from = px(start);
    for (const l of land) {
      const to = px(l);
      x.beginPath(); x.moveTo(...from); x.quadraticCurveTo((from[0] + to[0]) / 2 + 17, (from[1] + to[1]) / 2, ...to); x.stroke();
      from = to;
    }
    x.fillStyle = col(1.0, 1); x.beginPath(); x.arc(...from, 7.6, 0, Math.PI * 2); x.fill();
  },
  idm(x) {
    // a star schema: one fact table in the middle, four dimension tables around it
    const dims = [[128, 40], [216, 128], [128, 216], [40, 128]];
    x.strokeStyle = col(0.4); x.lineWidth = 9;
    x.beginPath(); for (const d of dims) { x.moveTo(128, 128); x.lineTo(...d); } x.stroke();
    x.fillStyle = col(0.62);
    for (const [px, py] of dims) { roundRect(x, px - 26, py - 19, 52, 38, 7); x.fill(); }
    x.fillStyle = col(0.95, 1); roundRect(x, 90, 98, 76, 60, 9); x.fill();
    x.strokeStyle = col(0.7, 0.85); x.lineWidth = 6;
    x.beginPath(); x.moveTo(102, 118); x.lineTo(154, 118); x.moveTo(102, 138); x.lineTo(154, 138); x.stroke();
  },
  sleep(x) {
    // a 24-hour dial with tonight's sleep marked, and a crescent moon in the middle
    const c = 128, r = 98;
    const ang = h => (h / 24) * Math.PI * 2 - Math.PI / 2;
    x.strokeStyle = col(0.34); x.lineWidth = 8;
    x.beginPath(); x.arc(c, c, r, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = col(0.55); x.lineWidth = 8;
    for (const h of [0, 6, 12, 18]) {
      const a = ang(h);
      x.beginPath(); x.moveTo(c + (r - 22) * Math.cos(a), c + (r - 22) * Math.sin(a)); x.lineTo(c + (r - 10) * Math.cos(a), c + (r - 10) * Math.sin(a)); x.stroke();
    }
    x.strokeStyle = col(0.9, 1); x.lineWidth = 18;
    x.beginPath(); x.arc(c, c, r, ang(23), ang(31)); x.stroke();
    x.fillStyle = col(0.95, 1); x.beginPath(); x.arc(c - 4, c + 6, 40, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgb(0, 235, 0)'; x.beginPath(); x.arc(c + 16, c - 8, 36, 0, Math.PI * 2); x.fill();
  },
  thermo(x) {
    // a house with a thermometer inside: heat risk is an indoor problem
    x.strokeStyle = col(0.55); x.lineWidth = 12;
    x.beginPath(); x.moveTo(50, 122); x.lineTo(128, 52); x.lineTo(206, 122); x.stroke();
    x.beginPath(); x.moveTo(72, 108); x.lineTo(72, 214); x.lineTo(184, 214); x.lineTo(184, 108); x.stroke();
    x.fillStyle = col(0.6); roundRect(x, 116, 104, 24, 92, 12); x.fill();
    x.fillStyle = col(1.0, 1); roundRect(x, 123, 132, 10, 64, 5); x.fill();
    x.beginPath(); x.arc(128, 194, 17, 0, Math.PI * 2); x.fill();
  },
};

function roundRect(x, X, Y, W, H, r) {
  x.beginPath();
  x.moveTo(X + r, Y);
  x.arcTo(X + W, Y, X + W, Y + H, r);
  x.arcTo(X + W, Y + H, X, Y + H, r);
  x.arcTo(X, Y + H, X, Y, r);
  x.arcTo(X, Y, X + W, Y, r);
  x.closePath();
}

const cache = new Map();
export function emblem(name) {
  if (cache.has(name)) return cache.get(name);
  const [, x] = canvas();
  (draw[name] || draw.glassbox)(x);
  const img = soften(x, 1.1);
  cache.set(name, img);
  return img;
}

export const emblemNames = Object.keys(draw);
