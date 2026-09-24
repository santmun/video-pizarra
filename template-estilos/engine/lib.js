// Drawing helpers shared by every style (canvas 2D, deterministic: no Math.random, seeds only)

export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function gauss(r) { let u = 0, v = 0; while (!u) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// smooth value noise
export function noise2(seed = 7) {
  const r = rng(seed), P = new Float32Array(256 * 256).map(() => r());
  const f = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = f(x - xi), yf = f(y - yi);
    const g = (i, j) => P[((yi + j) & 255) * 256 + ((xi + i) & 255)];
    const a = g(0, 0) + (g(1, 0) - g(0, 0)) * xf, b = g(0, 1) + (g(1, 1) - g(0, 1)) * xf;
    return a + (b - a) * yf;
  };
}

export const loadImg = src => new Promise((ok, err) => { const i = new Image(); i.onload = () => ok(i); i.onerror = err; i.src = src; });
export function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

export const lum = (d, i) => (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;

// paper texture: base color + fibers + blotches
export function paper(ctx, base = '#F3ECDD', { seed = 3, grain = 0.06, blotch = 0.05, fibers = 900 } = {}) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  const n = noise2(seed), r = rng(seed);
  const img = ctx.getImageData(0, 0, W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const v = (n(x / 180, y / 180) - 0.5) * blotch * 255 + (n(x / 9, y / 9) - 0.5) * 0.35 * grain * 255 + (r() - 0.5) * grain * 255;
    d[i] += v; d[i + 1] += v; d[i + 2] += v * 0.9;
  }
  ctx.putImageData(img, 0, 0);
  ctx.save(); ctx.globalAlpha = 0.05; ctx.strokeStyle = '#6b5a40'; ctx.lineWidth = 0.6;
  for (let k = 0; k < fibers; k++) { const x = r() * W, y = r() * H, a = r() * 6.3, l = 6 + r() * 18; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * l / 2 + r() * 4, y + Math.sin(a) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke(); }
  ctx.restore();
}

export function grainOverlay(ctx, amt = 0.08, seed = 11, mono = true) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const r = rng(seed), img = ctx.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = (r() - 0.5) * amt * 255; d[i] += v; d[i + 1] += mono ? v : (r() - 0.5) * amt * 255; d[i + 2] += mono ? v : (r() - 0.5) * amt * 255; }
  ctx.putImageData(img, 0, 0);
}

// Tyler-Hobbs style watercolor: recursively deformed polygon, stacked translucent layers
function deform(pts, depth, r, amp) {
  if (depth === 0) return pts;
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1, v1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    out.push(pts[i]);
    const len = Math.hypot(x2 - x1, y2 - y1), m = gauss(r) * len * amp * (v1 ?? 1);
    const nx = -(y2 - y1) / (len || 1), ny = (x2 - x1) / (len || 1);
    out.push([(x1 + x2) / 2 + nx * m + gauss(r) * 2, (y1 + y2) / 2 + ny * m + gauss(r) * 2, (v1 ?? 1) * (0.7 + r() * 0.6)]);
  }
  return deform(out, depth - 1, r, amp);
}
export function watercolor(ctx, poly, color, { seed = 1, layers = 26, alpha = 0.045, amp = 0.35, spread = 1 } = {}) {
  const r = rng(seed);
  const base = deform(poly.map(p => [p[0], p[1], 0.6 + r() * 0.8]), 2, r, amp * 0.8);
  ctx.save(); ctx.fillStyle = color; ctx.globalAlpha = alpha;
  for (let l = 0; l < layers; l++) {
    const pts = deform(base, 3, r, amp * 0.5 * spread);
    ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
export const circlePoly = (cx, cy, rx, ry = rx, n = 14) => Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * 6.283) * rx, cy + Math.sin(i / n * 6.283) * ry]);
export const rectPoly = (x, y, w, h) => [[x, y], [x + w / 2, y], [x + w, y], [x + w, y + h / 2], [x + w, y + h], [x + w / 2, y + h], [x, y + h], [x, y + h / 2]];

// wobbly ink line (hand-inked)
export function inkPath(ctx, pts, { w = 3, color = '#1d1a16', seed = 5, jitter = 1.2, closed = false } = {}) {
  const r = rng(seed);
  ctx.save(); ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) {
    ctx.lineWidth = w * (pass ? 0.55 : 1); ctx.globalAlpha = pass ? 0.5 : 0.92;
    ctx.beginPath();
    const P = closed ? [...pts, pts[0]] : pts;
    P.forEach(([x, y], i) => { const jx = x + gauss(r) * jitter, jy = y + gauss(r) * jitter; i ? ctx.lineTo(jx, jy) : ctx.moveTo(jx, jy); });
    ctx.stroke();
  }
  ctx.restore();
}

// Clawd (Claude mascot) as Path2D pieces in local coords (~230 x 171)
export const CLAWD = {
  body: 'M9,5 Q100,-1 188,3 Q197,4 197,12 L199,127 Q199,136 190,136 L13,139 Q4,139 4,130 L2,13 Q2,6 9,5 Z',
  armL: 'M5,64 L-20,64 Q-26,64 -26,70 L-26,88 Q-26,94 -20,94 L5,94 Z',
  armR: 'M196,56 L220,56 Q226,56 226,62 L226,80 Q226,86 220,86 L196,86 Z',
  legs: [30, 60, 124, 154].map(x => `M${x},134 L${x},165 Q${x},171 ${x + 6},171 L${x + 11},171 Q${x + 17},171 ${x + 17},165 L${x + 17},134 Z`),
  eyes: [[65.5, 64], [133.5, 62]],
};
export function clawd(ctx, x, y, s, { fill = '#D97757', ink = '#1d1a16', lw = 5, eye = '#1d1a16', eyeStyle = 'dot', shade = null, noStroke = false, fillFn = null } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round';
  const parts = [CLAWD.armL, CLAWD.armR, ...CLAWD.legs, CLAWD.body].map(d => new Path2D(d));
  parts.forEach(p => { if (fillFn) fillFn(p, fill); else if (fill) { ctx.fillStyle = fill; ctx.fill(p); } if (!noStroke) { ctx.strokeStyle = ink; ctx.lineWidth = lw / s; ctx.stroke(p); } });
  if (shade) { ctx.save(); ctx.clip(parts[parts.length - 1]); ctx.fillStyle = shade; ctx.fillRect(0, 95, 200, 60); ctx.restore(); }
  ctx.fillStyle = eye;
  CLAWD.eyes.forEach(([ex, ey]) => {
    ctx.beginPath();
    if (eyeStyle === 'dot') ctx.ellipse(ex, ey, 8, 11, 0, 0, 7);
    else if (eyeStyle === 'square') ctx.rect(ex - 9, ey - 9, 18, 18);
    else if (eyeStyle === 'happy') { ctx.lineWidth = 7; ctx.strokeStyle = eye; ctx.moveTo(ex - 10, ey + 3); ctx.quadraticCurveTo(ex, ey - 10, ex + 10, ey + 3); ctx.stroke(); return; }
    ctx.fill();
  });
  ctx.restore();
}

// text helpers
export function text(ctx, s, x, y, { font, color = '#111', align = 'left', base = 'alphabetic', ls = 0, rot = 0, stroke = null, sw = 0, alpha = 1 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base; ctx.globalAlpha = alpha;
  if (ls) ctx.letterSpacing = ls + 'px';
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.lineJoin = 'round'; ctx.strokeText(s, 0, 0); }
  ctx.fillText(s, 0, 0); ctx.restore();
}
export function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

// box blur on a Float32 luminance buffer
export function blurL(L, w, h, r) {
  const t = new Float32Array(L.length), o = new Float32Array(L.length);
  for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x <= r; x++) s += L[y * w + Math.min(w - 1, Math.max(0, x))]; for (let x = 0; x < w; x++) { t[y * w + x] = s / (2 * r + 1); s += L[y * w + Math.min(w - 1, x + r + 1)] - L[y * w + Math.max(0, x - r)]; } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += t[Math.min(h - 1, Math.max(0, y)) * w + x]; for (let y = 0; y < h; y++) { o[y * w + x] = s / (2 * r + 1); s += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; } }
  return o;
}
export function lumBuf(S) { const L = new Float32Array(S.w * S.h), A = new Float32Array(S.w * S.h); for (let i = 0; i < L.length; i++) { L[i] = lum(S.data, i * 4); A[i] = S.data[i * 4 + 3] / 255; } return { L, A }; }
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

const WASH_TEX = new Map(), PAPER_TEX = new Map();
// watercolor-ish fill for a Path2D: jittered translucent passes + granulation + pooled edge
export function washFill(ctx, seed = 1, { passes = 5, alpha = 0.3, jit = 3, gran = 0.18, pool = 0.35 } = {}) {
  const r = rng(seed), key = seed + '|' + gran;
  let tex = WASH_TEX.get(key);
  if (!tex) { tex = canvas(256, 256); const tx = tex.getContext('2d'), n = noise2(seed + 3), im = tx.createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) { const v = n((i % 256) / 9, (i >> 8) / 9) * 0.6 + n((i % 256) / 30, (i >> 8) / 30) * 0.4; im.data[i * 4 + 3] = 255 * gran * v; }
    tx.putImageData(im, 0, 0); const b = canvas(256, 256), bx = b.getContext('2d'); bx.filter = 'blur(2px)'; for (const [dx, dy] of [[0, 0], [-256, 0], [0, -256], [-256, -256], [256, 0], [0, 256]]) bx.drawImage(tex, dx, dy); tex = b; WASH_TEX.set(key, tex); }
  return (p, c) => {
    ctx.save(); ctx.fillStyle = c;
    for (let k = 0; k < passes; k++) { ctx.save(); ctx.globalAlpha = alpha; ctx.translate(gauss(r) * jit, gauss(r) * jit); ctx.fill(p); ctx.restore(); }
    ctx.clip(p); ctx.globalAlpha = 1; ctx.fillStyle = ctx.createPattern(tex, 'repeat'); ctx.fillRect(-2000, -2000, 4000, 4000);
    ctx.restore();
    ctx.save(); ctx.strokeStyle = mix(c, '#000000', 0.25); ctx.globalAlpha = pool * 0.6; ctx.lineWidth = 6; ctx.stroke(p); ctx.globalAlpha = pool * 0.3; ctx.lineWidth = 11; ctx.stroke(p); ctx.restore();
  };
}
export function wobbleStroke(ctx, ink, lw, s, seed = 2) {
  const r = rng(seed);
  return (p, w = lw) => { ctx.strokeStyle = ink; for (let k = 0; k < 2; k++) { ctx.save(); ctx.translate(gauss(r) * 1.2, gauss(r) * 1.2); ctx.globalAlpha = k ? 0.45 : 0.95; ctx.lineWidth = (w * (k ? 0.5 : 1)) / s; ctx.stroke(p); ctx.restore(); } };
}

// paper cut-out fill: soft drop shadow + flat color + fiber texture
export function paperTex(seed = 1, amt = 0.1) {
  const key = seed + '|' + amt; if (PAPER_TEX.has(key)) return PAPER_TEX.get(key);
  const t = canvas(512, 512), x = t.getContext('2d'), im = x.createImageData(512, 512), n = noise2(seed), r = rng(seed);
  for (let i = 0; i < 512 * 512; i++) { const v = (n((i % 512) / 5, (i >> 9) / 5) - 0.5) * 0.6 + (r() - 0.5) * 0.8; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v > 0 ? 255 : 0; im.data[i * 4 + 3] = Math.abs(v) * 255 * amt; }
  x.putImageData(im, 0, 0); PAPER_TEX.set(key, t); return t;
}
export function cutFill(ctx, { shadow = 'rgba(20,15,10,.35)', blur = 14, dx = 5, dy = 8, seed = 1 } = {}) {
  const tex = paperTex(seed, 0.16);
  return (p, c) => {
    ctx.save(); ctx.shadowColor = shadow; ctx.shadowBlur = blur; ctx.shadowOffsetX = dx; ctx.shadowOffsetY = dy; ctx.fillStyle = c; ctx.fill(p); ctx.restore();
    ctx.save(); ctx.clip(p); ctx.fillStyle = ctx.createPattern(tex, 'repeat'); ctx.fillRect(-3000, -3000, 6000, 6000); ctx.restore();
  };
}
// jagged "scissor cut" polygon path from a rect
export function cutRect(x, y, w, h, seed = 1, j = 2.5) {
  const r = rng(seed), p = new Path2D(), pts = [];
  const seg = (x1, y1, x2, y2) => { const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 40)); for (let i = 0; i < n; i++) pts.push([x1 + (x2 - x1) * i / n + gauss(r) * j, y1 + (y2 - y1) * i / n + gauss(r) * j]); };
  seg(x, y, x + w, y); seg(x + w, y, x + w, y + h); seg(x + w, y + h, x, y + h); seg(x, y + h, x, y);
  pts.forEach(([a, b], i) => i ? p.lineTo(a, b) : p.moveTo(a, b)); p.closePath(); return p;
}

// halftone dots of a luminance buffer (dark = big dot) into ctx at (ox, oy)
export function halftone(ctx, L, A, w, h, ox, oy, { cell = 9, angle = 0.26, color = '#0078BF', gamma = 1, maxR = null, invert = false } = {}) {
  const ca = Math.cos(angle), sa = Math.sin(angle), R = maxR || cell * 0.62, diag = Math.hypot(w, h);
  ctx.save(); ctx.fillStyle = color;
  for (let v = -diag; v < diag; v += cell) for (let u = -diag; u < diag; u += cell) {
    const x = u * ca - v * sa + w / 2, y = u * sa + v * ca + h / 2;
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const i = (y | 0) * w + (x | 0); if (A[i] < 0.5) continue;
    let d = invert ? L[i] : 1 - L[i]; d = Math.pow(Math.max(0, d), gamma);
    const r = R * Math.sqrt(d); if (r < 0.4) continue;
    ctx.beginPath(); ctx.arc(ox + x, oy + y, r, 0, 7); ctx.fill();
  }
  ctx.restore();
}

// banknote-style line engraving: horizontal lines whose thickness follows darkness
export function engrave(ctx, L, A, w, h, ox, oy, { step = 6, maxW = 5, color = '#2b2118', wave = 3, freq = 0.02, angle = 0, minW = 0.25 } = {}) {
  ctx.save(); ctx.fillStyle = color; ctx.translate(ox + w / 2, oy + h / 2); ctx.rotate(angle); ctx.translate(-w / 2, -h / 2);
  const ca = Math.cos(-angle), sa = Math.sin(-angle);
  const sample = (x, y) => { const X = Math.round(x), Y = Math.round(y); if (X < 0 || Y < 0 || X >= w || Y >= h) return -1; const i = Y * w + X; return A[i] < 0.5 ? -1 : L[i]; };
  for (let y0 = -h * 0.3; y0 < h * 1.3; y0 += step) {
    let run = [];
    const flush = () => { if (run.length > 1) { ctx.beginPath(); run.forEach(([x, y, t], i) => i ? ctx.lineTo(x, y - t) : ctx.moveTo(x, y - t)); for (let i = run.length - 1; i >= 0; i--) ctx.lineTo(run[i][0], run[i][1] + run[i][2]); ctx.closePath(); ctx.fill(); } run = []; };
    for (let x = 0; x <= w; x += 2) {
      const y = y0 + Math.sin(x * freq + y0 * 0.01) * wave;
      // sample in un-rotated image space
      const cx = x - w / 2, cy = y - h / 2, sx = cx * Math.cos(angle) - cy * Math.sin(angle) + w / 2, sy = cx * Math.sin(angle) + cy * Math.cos(angle) + h / 2;
      const l = sample(sx, sy);
      if (l < 0) { flush(); continue; }
      const t = Math.max(minW, (1 - l) * maxW / 2);
      run.push([x, y, t]);
    }
    flush();
  }
  ctx.restore();
}

// ---------- easing / timing ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const E = {
  linear: t => t,
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  inOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  back: t => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  expo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  step: (t, n = 6) => Math.floor(t * n) / n,
};
// progress of a window [start, start+dur] at time t, eased
export const prog = (t, start, dur, ease = E.out) => ease(clamp((t - start) / (dur || 1e-6)));

// ---------- text ----------
// Wrap text to maxW with the current ctx.font. Honors \n.
export function wrap(ctx, str, maxW) {
  const out = [];
  for (const para of String(str).split('\n')) {
    let line = '';
    for (const w of para.split(/\s+/).filter(Boolean)) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test;
    }
    out.push(line);
  }
  return out;
}
// Largest font size (<= max) whose wrapped lines fit the box. fontFn(size) → css font string.
export function fit(ctx, str, fontFn, box, { max = 200, min = 14, lh = 1.05, ls = 0 } = {}) {
  let size = max;
  for (; size > min; size -= Math.max(1, size * 0.04)) {
    ctx.font = fontFn(size); ctx.letterSpacing = (ls * size) + 'px';
    const lines = wrap(ctx, str, box.w);
    const wid = Math.max(...lines.map(l => ctx.measureText(l).width));
    if (lines.length * size * lh <= box.h && wid <= box.w) return { size, lines, lh: size * lh, font: fontFn(size) };
  }
  ctx.font = fontFn(min); ctx.letterSpacing = (ls * min) + 'px';
  return { size: min, lines: wrap(ctx, str, box.w), lh: min * lh, font: fontFn(min) };
}

// ---------- geometry ----------
export const inset = (b, dx, dy = dx) => ({ x: b.x + dx, y: b.y + dy, w: b.w - 2 * dx, h: b.h - 2 * dy });
export const center = b => [b.x + b.w / 2, b.y + b.h / 2];
export function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
export function rgba(h, a) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; }
export function mix(h1, h2, t) { const a = hexRgb(h1), b = hexRgb(h2); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
export function star(ctx, x, y, r, n = 5, inner = 0.45, rot = -Math.PI / 2) { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, rr = i % 2 ? r * inner : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); }

// ---------- the person as a drawn character (any gender / look) ----------
// Local coords: origin = base of neck; head top ≈ -250, shoulders ≈ 130, bust bottom = 410. Scale s.
const HAIR = {
  swoop: { front: 'M-90,-72 C-108,-170 -64,-240 8,-242 C84,-244 118,-192 102,-116 C98,-98 94,-86 86,-72 C88,-122 70,-152 34,-160 C6,-150 -18,-164 -46,-156 C-70,-146 -82,-112 -84,-84 Z', lines: 'M-40,-214 C-10,-200 30,-200 70,-206 M-60,-180 C-30,-170 -4,-176 20,-190' },
  short: { front: 'M-86,-80 C-96,-170 -50,-232 6,-234 C70,-236 104,-180 90,-86 C84,-124 60,-150 20,-156 C-10,-152 -50,-160 -70,-130 C-78,-116 -82,-100 -86,-80 Z', lines: 'M-30,-210 C0,-200 30,-202 60,-196' },
  long: { back: 'M-104,-110 C-124,-236 124,-252 106,-110 L124,150 Q60,176 0,166 Q-60,176 -124,150 Z', front: 'M-90,-60 C-104,-180 -40,-238 10,-238 C82,-238 112,-170 94,-60 C84,-140 44,-172 -18,-164 C-52,-152 -78,-118 -90,-60 Z', lines: 'M-20,-222 C-40,-190 -60,-150 -70,-100' },
  bob: { back: 'M-108,-100 C-118,-234 118,-250 108,-100 L112,36 Q70,52 44,34 L-44,34 Q-70,52 -112,36 Z', front: 'M-88,-94 C-94,-204 92,-218 88,-94 C62,-120 -62,-124 -88,-94 Z', lines: 'M-50,-180 L-44,-110 M0,-190 L2,-116 M50,-180 L46,-110' },
  bun: { back: 'M-44,-262 a44,44 0 1,0 88,0 a44,44 0 1,0 -88,0 Z', front: 'M-86,-86 C-92,-196 -40,-234 0,-234 C40,-234 92,-196 86,-86 C62,-154 -62,-154 -86,-86 Z', lines: 'M-40,-214 C-10,-226 20,-226 50,-212' },
  ponytail: { back: 'M58,-204 C168,-210 170,-40 120,50 C104,-40 96,-120 48,-176 Z', front: 'M-86,-86 C-92,-196 -40,-234 0,-234 C40,-234 92,-196 86,-86 C62,-154 -62,-154 -86,-86 Z', lines: 'M-40,-214 C-10,-226 20,-226 50,-212' },
  curly: { curly: true },
  bald: { front: 'M-86,-60 C-92,-90 -90,-110 -80,-126 L-74,-80 Z M86,-60 C92,-90 90,-110 80,-126 L74,-80 Z' },
};
function curlyPath(back) {
  const p = new Path2D(), n = back ? 13 : 10, R = back ? 118 : 104, r = back ? 40 : 34;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (back ? 0.92 : 1.02) + i / (n - 1) * Math.PI * (back ? 1.16 : 0.96);
    const x = Math.cos(a) * R, y = -110 + Math.sin(a) * R * (back ? 1.05 : 1);
    p.moveTo(x + r, y); p.arc(x, y, r, 0, Math.PI * 2);
  }
  if (back) { p.moveTo(-118 + 40, -40); p.arc(-118, -40, 40, 0, 7); p.moveTo(118 + 40, -40); p.arc(118, -40, 40, 0, 7); }
  return p;
}
const BODY = {
  torso: 'M-236,410 C-232,242 -176,152 -74,128 Q0,152 74,128 C176,152 232,242 236,410 Z',
  neck: 'M-36,40 L-38,136 Q0,162 38,136 L36,40 Z',
  earL: 'M-78,-78 C-104,-86 -108,-34 -80,-22 Z', earR: 'M78,-78 C104,-86 108,-34 80,-22 Z',
  face: 'M-80,-124 C-84,-40 -66,28 -30,60 Q0,82 30,60 C66,28 84,-40 80,-124 C78,-192 -78,-192 -80,-124 Z',
  browL: 'M-54,-88 Q-36,-98 -14,-92', browR: 'M14,-92 Q36,-98 54,-88',
  nose: 'M-2,-44 Q-12,-10 -2,-4 Q6,-2 10,-8',
  mouth: 'M-26,22 Q2,38 30,18', mouthO: 'M-12,24 a12,14 0 1,0 24,0 a12,14 0 1,0 -24,0',
  collar: 'M-74,128 Q0,184 74,128',
  beard: 'M-80,-34 C-78,40 -40,90 0,92 C40,90 78,40 80,-34 C70,14 46,34 20,30 Q0,20 -20,30 C-46,34 -70,14 -80,-34 Z',
  stache: 'M-30,8 Q0,-6 30,8 Q0,2 -30,8 Z',
};
export const CHAR_DEFAULT = { skin: '#E9B48F', hair: '#2A211C', hairStyle: 'short', shirt: '#2B2F3A', glasses: false, beard: false, accessory: null };
// Draw the character. fill(path, color, part) and stroke(path, widthMul) let each style render its own way.
export function character(ctx, x, y, s, look = {}, { fill, stroke, ink = '#1d1a16', outline = true, features = true, mood = 'smile', blink = false } = {}) {
  const L = Object.assign({}, CHAR_DEFAULT, look), hair = HAIR[L.hairStyle] || HAIR.short, P = d => new Path2D(d);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const F = fill || ((p, c) => { ctx.fillStyle = c; ctx.fill(p); });
  const K = stroke || ((p, m = 1) => { ctx.strokeStyle = ink; ctx.lineWidth = 4.5 * m / s; ctx.stroke(p); });
  const part = (p, c, name) => { F(p, c, name); if (outline) K(p, 1); };
  if (hair.curly) part(curlyPath(true), L.hair, 'hairBack'); else if (hair.back) part(P(hair.back), L.hair, 'hairBack');
  part(P(BODY.torso), L.shirt, 'torso');
  part(P(BODY.neck), L.skin, 'neck'); part(P(BODY.earL), L.skin, 'ear'); part(P(BODY.earR), L.skin, 'ear');
  part(P(BODY.face), L.skin, 'face');
  if (L.beard) part(P(BODY.beard), L.hair, 'beard');
  if (hair.curly) part(curlyPath(false), L.hair, 'hair'); else if (hair.front) part(P(hair.front), L.hair, 'hair');
  if (outline) K(P(BODY.collar), 1.1);
  if (features) {
    if (hair.lines && outline) K(P(hair.lines), 0.6);
    K(P(BODY.browL), 1.5); K(P(BODY.browR), 1.5);
    ctx.fillStyle = ink;
    for (const ex of [-34, 34]) { ctx.beginPath(); if (blink) ctx.rect(ex - 9, -63, 18, 3); else ctx.ellipse(ex, -62, 7, 8.8, 0, 0, 7); ctx.fill(); }
    K(P(BODY.nose), 0.8);
    if (L.beard) K(P(BODY.stache), 0.8);
    if (mood === 'o') K(P(BODY.mouthO), 1); else if (mood !== 'none') K(P(BODY.mouth), 1);
    if (L.glasses) { const g = new Path2D(); g.roundRect(-64, -84, 54, 44, 12); g.roundRect(10, -84, 54, 44, 12); g.moveTo(-10, -66); g.lineTo(10, -66); K(g, 0.9); }
  }
  ctx.restore();
}
// character bounding box in local units (for fitting into a layout box)
export const CHAR_BOX = { x: -240, y: -310, w: 480, h: 720 };

// ---------- mascots ----------
export const MASCOTS = {
  clawd: { body: CLAWD.body, parts: [CLAWD.armL, CLAWD.armR, ...CLAWD.legs], eyes: CLAWD.eyes, eyeR: [8, 11], box: { x: -30, y: -5, w: 260, h: 180 }, color: '#D97757' },
  bot: {
    body: 'M20,40 Q20,10 50,10 L170,10 Q200,10 200,40 L200,120 Q200,150 170,150 L50,150 Q20,150 20,120 Z',
    parts: ['M104,10 L104,-18 M116,10 L116,-18', 'M110,-30 a12,12 0 1,0 0.1,0 Z', 'M0,60 Q-4,80 0,100 L20,100 L20,60 Z', 'M220,60 Q224,80 220,100 L200,100 L200,60 Z', 'M60,150 L60,178 L96,178 L96,150 Z', 'M124,150 L124,178 L160,178 L160,150 Z'],
    eyes: [[80, 70], [140, 70]], eyeR: [11, 13], box: { x: -10, y: -44, w: 240, h: 226 }, color: '#5B8DEF',
  },
  blob: {
    body: 'M30,120 C0,60 40,0 110,4 C180,8 222,60 196,124 C184,156 150,170 110,168 C66,170 42,150 30,120 Z',
    parts: ['M60,160 Q56,184 76,186 Q92,184 88,162 Z', 'M132,162 Q128,184 148,186 Q164,184 160,160 Z'],
    eyes: [[86, 80], [136, 78]], eyeR: [9, 12], box: { x: 0, y: 0, w: 222, h: 190 }, color: '#7BC47F',
  },
};
// Draw mascot fitted to box (feet on the box bottom). Returns scale used.
// Acting: set a pose before any style draws the mascot (all styles go through mascot()).
// pose({ armL, armR (deg, + = raise), walk (phase rad), hop (px up), sx, sy (squash), rot (rad), look:[dx,dy], eyes:'happy'|'dot'|'closed'|'wide', color, flip })
export let POSE = null;
export function pose(p) { POSE = p || null; }
// after each draw: canvas-space anchors to attach props / continue motion
export const MLAST = { handL: [0, 0], handR: [0, 0], top: [0, 0], center: [0, 0], s: 1 };
const PIV = { clawd: { L: [5, 79], R: [196, 71], hL: [-24, 79], hR: [224, 71], arms: [0, 1], legs: [2, 3, 4, 5] } };
// overrides globales del video (spec.mascotColor, spec.mascot = { image }) — los pone core.js
export const MOPTS = { color: null, image: null };
function imageMascot(ctx, img, box, bob) { // la mascota es una imagen (logo, personaje propio): respeta hop/rot/sx/sy/flip
  const P = POSE || {}, s = Math.min(box.w / img.width, box.h / img.height), w = img.width * s, h = img.height * s, fx = box.x + box.w / 2, fy = box.y + box.h + bob - (P.hop || 0);
  ctx.save(); ctx.translate(fx, fy); ctx.rotate(P.rot || 0); ctx.scale((P.sx || 1) * (P.flip ? -1 : 1), P.sy || 1); ctx.drawImage(img, -w / 2, -h, w, h); ctx.restore();
  MLAST.handL = [fx - w * 0.55, fy - h * 0.45]; MLAST.handR = [fx + w * 0.55, fy - h * 0.45]; MLAST.top = [fx, fy - h]; MLAST.center = [fx, fy - h / 2]; MLAST.s = s; return s;
}
export function mascot(ctx, kind, box, { fill, stroke, color, ink = '#1d1a16', eye = null, eyeStyle = 'dot', outline = true, bob = 0 } = {}) {
  if (MOPTS.image) return imageMascot(ctx, MOPTS.image, box, bob);
  const M = typeof kind === 'object' ? kind : MASCOTS[kind]; if (!M) return 0;
  const P = POSE || {}, pv = PIV[typeof kind === 'string' ? kind : ''] || null;
  const s = Math.min(box.w / M.box.w, box.h / M.box.h);
  ctx.save(); ctx.translate(box.x + box.w / 2 - (M.box.x + M.box.w / 2) * s, box.y + box.h - (M.box.y + M.box.h) * s + bob - (P.hop || 0)); ctx.scale(s, s);
  // squash / stretch / rotate / flip around the feet centre
  const fx = M.box.x + M.box.w / 2, fy = M.box.y + M.box.h;
  ctx.translate(fx, fy); ctx.rotate(P.rot || 0); ctx.scale((P.sx || 1) * (P.flip ? -1 : 1), P.sy || 1); ctx.translate(-fx, -fy);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const c = P.color || MOPTS.color || color || M.color;
  const F = fill || ((p, col) => { ctx.fillStyle = col; ctx.fill(p); });
  const K = stroke || ((p) => { ctx.strokeStyle = ink; ctx.lineWidth = 5 / s * Math.min(1, s * 1.4); ctx.stroke(p); });
  const toCanvas = (x, y) => { const m = ctx.getTransform(); return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]; };
  const armIdx = pv ? pv.arms : [];
  const drawPart = (d, i) => {
    ctx.save();
    if (pv && i === pv.arms[0] && P.armL) { ctx.translate(...pv.L); ctx.rotate(P.armL * Math.PI / 180); ctx.translate(-pv.L[0], -pv.L[1]); }
    if (pv && i === pv.arms[1] && P.armR) { ctx.translate(...pv.R); ctx.rotate(-P.armR * Math.PI / 180); ctx.translate(-pv.R[0], -pv.R[1]); }
    if (pv && pv.legs.includes(i) && P.walk !== undefined) { const k = pv.legs.indexOf(i); ctx.translate(0, -Math.max(0, Math.sin(P.walk + (k % 2) * Math.PI)) * 12); }
    if (pv && i === pv.arms[0]) MLAST.handL = toCanvas(...pv.hL);
    if (pv && i === pv.arms[1]) MLAST.handR = toCanvas(...pv.hR);
    const p = new Path2D(d); F(p, c, 'body'); if (outline) K(p);
    ctx.restore();
  };
  // legs/other parts behind the body, arms in front so raised arms stay visible
  M.parts.forEach((d, i) => { if (!armIdx.includes(i)) drawPart(d, i); });
  { const p = new Path2D(M.body); F(p, c, 'body'); if (outline) K(p); }
  M.parts.forEach((d, i) => { if (armIdx.includes(i)) drawPart(d, i); });
  MLAST.top = toCanvas(fx, M.box.y); MLAST.center = toCanvas(fx, M.box.y + M.box.h / 2); MLAST.s = s;
  const es = P.eyes || eyeStyle, lk = P.look || [0, 0];
  ctx.fillStyle = eye || ink;
  for (const [ex0, ey0] of M.eyes) {
    const ex = ex0 + lk[0] * 5, ey = ey0 + lk[1] * 5;
    ctx.beginPath();
    if (es === 'square') ctx.rect(ex - M.eyeR[0], ey - M.eyeR[0], M.eyeR[0] * 2, M.eyeR[0] * 2);
    else if (es === 'happy') { ctx.strokeStyle = eye || ink; ctx.lineWidth = 7; ctx.moveTo(ex - 10, ey + 3); ctx.quadraticCurveTo(ex, ey - 10, ex + 10, ey + 3); ctx.stroke(); continue; }
    else if (es === 'closed') { ctx.strokeStyle = eye || ink; ctx.lineWidth = 6; ctx.moveTo(ex - 10, ey); ctx.lineTo(ex + 10, ey); ctx.stroke(); continue; }
    else if (es === 'wide') ctx.ellipse(ex, ey, M.eyeR[0] * 1.35, M.eyeR[1] * 1.35, 0, 0, 7);
    else ctx.ellipse(ex, ey, M.eyeR[0], M.eyeR[1], 0, 0, 7);
    ctx.fill();
  }
  ctx.restore();
  return s;
}

// ---------- film grain tiles (cheap per-frame grain) ----------
export function grainTiles(n = 4, size = 256, amt = 0.5, seed = 9) {
  const r = rng(seed); return Array.from({ length: n }, () => { const c = canvas(size, size), x = c.getContext('2d'), im = x.createImageData(size, size); for (let i = 0; i < size * size; i++) { const v = r() * 255; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255 * amt; } x.putImageData(im, 0, 0); return c; });
}
export function drawGrain(ctx, tiles, frame, alpha = 0.08, mode = 'overlay') {
  const t = tiles[Math.floor(frame / 2) % tiles.length]; ctx.save(); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = mode; ctx.fillStyle = ctx.createPattern(t, 'repeat'); ctx.translate((frame * 37) % 256, (frame * 71) % 256); ctx.fillRect(-256, -256, ctx.canvas.width + 512, ctx.canvas.height + 512); ctx.restore();
}
// pixel-process a subject into a new canvas: fn(r,g,b,a,x,y,L) → [r,g,b,a]
export function mapPixels(subj, fn) {
  const c = canvas(subj.w, subj.h), x = c.getContext('2d'), im = x.createImageData(subj.w, subj.h), d = subj.data;
  for (let y = 0, i = 0; y < subj.h; y++) for (let xx = 0; xx < subj.w; xx++, i++) { const k = i * 4; if (d[k + 3] < 10) continue; const o = fn(d[k], d[k + 1], d[k + 2], d[k + 3], xx, y, subj.L[i]); im.data[k] = o[0]; im.data[k + 1] = o[1]; im.data[k + 2] = o[2]; im.data[k + 3] = o[3] ?? d[k + 3]; }
  x.putImageData(im, 0, 0); return c;
}
// memo helper for per-size treatments
export function memo(fn) { const m = new Map(); return (...a) => { const k = a.join('|'); if (!m.has(k)) m.set(k, fn(...a)); return m.get(k); }; }

// ---------- live drawing: a tool (pencil / marker / brush / pen) follows the edge of what is being drawn ----------
// drawTool: the tip is at (x, y). kind: 'pencil' | 'marker' | 'brush' | 'pen'
export function drawTool(ctx, kind, x, y, s = 1, { color = '#E0483E', ang = -0.75 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.strokeStyle = '#1d1a16'; ctx.lineWidth = 3;
  ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 12; ctx.shadowOffsetX = 6; ctx.shadowOffsetY = 8;
  if (kind === 'marker') { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(18, -10); ctx.lineTo(18, 10); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#2B2F3A'; ctx.fillRect(18, -16, 150, 32); ctx.shadowColor = 'transparent'; ctx.strokeRect(18, -16, 150, 32); ctx.fillStyle = color; ctx.fillRect(130, -16, 38, 32); }
  else if (kind === 'brush') { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(12, 0, 16, 7, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#C9A24A'; ctx.fillRect(26, -7, 24, 14); ctx.fillStyle = '#6B4B3A'; ctx.fillRect(50, -5, 150, 10); }
  else if (kind === 'pen') { ctx.fillStyle = '#1C1B22'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(16, -6); ctx.lineTo(16, 6); ctx.closePath(); ctx.fill(); ctx.fillStyle = color; ctx.fillRect(16, -8, 140, 16); }
  else { ctx.fillStyle = '#F3E3C3'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(26, -11); ctx.lineTo(26, 11); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#2B2B2B'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8, -3.5); ctx.lineTo(8, 3.5); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#E9B44C'; ctx.fillRect(26, -11, 150, 22); ctx.shadowColor = 'transparent'; ctx.strokeRect(26, -11, 150, 22); ctx.fillStyle = '#E8A2A8'; ctx.fillRect(176, -11, 22, 22); ctx.strokeRect(176, -11, 22, 22); }
  ctx.restore();
}
// writeOn: reveal draw(ctx) inside box left→right, line by line (lines = number of text lines), with the tool at the edge
export function writeOn(ctx, draw, box, p, { tool = 'pencil', lines = 1, toolScale = 0.9, color, noTool = false } = {}) {
  if (p <= 0) return; if (p >= 1) { draw(ctx); return; }
  const n = lines, lh = box.h / n, f = p * n, cur = Math.min(n - 1, Math.floor(f)), fx = f - cur;
  ctx.save(); ctx.beginPath();
  if (cur > 0) ctx.rect(box.x - 60, box.y - 60, box.w + 120, cur * lh + 60);
  ctx.rect(box.x - 60, box.y + cur * lh - (cur ? 0 : 60), (box.w + 60) * fx + 60, lh + (cur ? 0 : 60) + (cur === n - 1 ? 60 : 0));
  ctx.clip(); draw(ctx); ctx.restore();
  if (!noTool) drawTool(ctx, tool, box.x + box.w * fx, box.y + cur * lh + lh * (0.55 + 0.25 * Math.sin(p * 90)), toolScale, { color });
}
// highlightOn: marker swipe behind a box (draw it BEFORE the text)
export function highlightOn(ctx, box, p, color = 'rgba(255,214,0,.55)', { tool = true, seed = 3 } = {}) {
  if (p <= 0) return; const r = rng(seed), w = box.w * clamp(p);
  ctx.save(); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(box.x, box.y + r() * 6); ctx.lineTo(box.x + w, box.y + r() * 6 - 3); ctx.lineTo(box.x + w - 6, box.y + box.h - r() * 6); ctx.lineTo(box.x + 4, box.y + box.h + r() * 4); ctx.closePath(); ctx.fill(); ctx.restore();
  if (tool && p < 1) drawTool(ctx, 'marker', box.x + w, box.y + box.h * 0.6, 0.8, { color: color.replace(/[\d.]+\)$/, '1)') });
}
// circleOn / underlineOn: hand-drawn ink that draws itself
export function circleOn(ctx, cx, cy, rx, ry, p, color = '#E0483E', { w = 6, tool = 'pen', seed = 5 } = {}) {
  if (p <= 0) return; const r = rng(seed), n = 60, pts = [];
  for (let k = 0; k <= n * 1.12 * clamp(p); k++) { const a = -2.4 + k / n * Math.PI * 2, j = 1 + (r() - 0.5) * 0.04 + k / n * 0.06; pts.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]); }
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.restore();
  if (tool && p < 1 && pts.length) drawTool(ctx, tool, ...pts[pts.length - 1], 0.8, { color });
}
export function underlineOn(ctx, x, y, w, p, color = '#E0483E', { lw = 7, tool = 'pen' } = {}) {
  if (p <= 0) return; const q = clamp(p); ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + w * q / 2, y + 8, x + w * q, y - 4); ctx.stroke(); ctx.restore();
  if (tool && p < 1) drawTool(ctx, tool, x + w * q, y - 4, 0.8, { color });
}
