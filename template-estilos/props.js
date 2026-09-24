// Props for the story, rendered with the material of whichever style is active (so they belong to that world).
import * as L from './engine/lib.js';

const boil = K => Math.floor(K.t * 8);
const HATCH = L.memo((color, gap, ang) => { const c = L.canvas(64, 64), x = c.getContext('2d'); x.strokeStyle = color; x.lineWidth = 1.2; for (let k = -64; k < 128; k += gap) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + 64 * Math.tan(ang), 64); x.stroke(); } return c; });

// skin(K) → { fill(path, color), stroke(path, width) , ink, paper, accent }
export function skin(K) {
  const ctx = K.ctx, id = K.S.id, P = K.P;
  const flat = (p, c) => { ctx.fillStyle = c; ctx.fill(p); };
  const line = (ink, w0) => (p, w = 1) => { ctx.strokeStyle = ink; ctx.lineWidth = w0 * w * K.u; ctx.lineJoin = ctx.lineCap = 'round'; ctx.stroke(p); };
  switch (id) {
    case 'acuarela-viva': { const wf = L.washFill(ctx, 21, { alpha: 0.45, gran: 0.1 }); return { fill: (p, c) => { ctx.fillStyle = '#FFFCF7'; ctx.fill(p); wf(p, c); }, stroke: L.wobbleStroke(ctx, '#141414', 4.2, 1, boil(K)), ink: '#141414', paper: '#FFFCF7', accent: '#D83A34', soft: '#F3E6D8',
      pal: { win: '#FFF4EA', cloud: '#FFFFFF', books: ['#D97757', '#141414', '#D83A34', '#F3E6D8', '#D97757'], leaf: '#2A2A2A', pot: '#D83A34', shade: '#D97757', desk: '#1E1E1E', rail: '#1E1E1E', mug: '#FFFFFF', key: '#FFFFFF', bar: '#F0B59A', board: '#FFFFFF', lid: '#141414', base: '#D97757' } }; }
    case 'acuarela': { const wf = L.washFill(ctx, 21, { alpha: 0.4, gran: 0.12 }); return { fill: (p, c) => { ctx.fillStyle = '#F6EEDF'; ctx.fill(p); wf(p, c); }, stroke: L.wobbleStroke(ctx, '#241D18', 4, 1, boil(K)), ink: '#241D18', paper: '#F6EEDF', accent: '#C4663F', soft: '#E9CBBB' }; }
    case 'cuaderno': { const pen = '#1F2A44'; return { fill: (p, c) => { ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = c; ctx.fill(p); ctx.restore(); }, stroke: L.wobbleStroke(ctx, pen, 3.2, 1, boil(K)), ink: pen, paper: '#FFFDF7', accent: '#E0483E', soft: '#FFE066' }; }
    case 'patente': { const ink = '#2B2118'; return { fill: (p, c) => { ctx.save(); ctx.clip(p); ctx.fillStyle = ctx.createPattern(HATCH(ink, 5, 0.6), 'repeat'); ctx.fillRect(-4000, -4000, 8000, 8000); ctx.restore(); }, stroke: line(ink, 2.2), ink, paper: '#EDE2C6', accent: '#8E2A1E', soft: '#D9CBA6' }; }
    case 'generativo': { const ink = '#1C1B22', or = '#D9653B'; return { fill: (p, c) => { ctx.save(); ctx.clip(p); ctx.fillStyle = ctx.createPattern(HATCH(c === 'ink' ? ink : or, 4, 0.35), 'repeat'); ctx.fillRect(-4000, -4000, 8000, 8000); ctx.restore(); }, stroke: line(ink, 1.6), ink, paper: '#F5F2EA', accent: or, soft: or }; }
    case 'manga': { const ink = '#111111'; return { fill: (p, c) => { ctx.fillStyle = c === 'dark' ? ink : '#FFFFFF'; ctx.fill(p); }, stroke: line(ink, 5), ink, paper: '#FFFFFF', accent: ink, soft: '#DDDDDD' }; }
    case 'minimal': return { fill: (p, c) => { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.08)'; ctx.shadowBlur = 30 * K.u; ctx.shadowOffsetY = 10 * K.u; ctx.fillStyle = c; ctx.fill(p); ctx.restore(); }, stroke: () => {}, ink: '#141414', paper: '#FFFFFF', accent: P.accent, soft: '#F0EEEA' };
    case 'datos': return { fill: flat, stroke: line('#1C1A17', 1.4), ink: '#1C1A17', paper: '#FBEFE3', accent: '#2A5C8A', soft: '#F2DFCB' };
    default: return { fill: flat, stroke: line(P.ink, 3), ink: P.ink, paper: P.panel, accent: P.accent, soft: P.panel };
  }
}
const rr = (x, y, w, h, r) => { const p = new Path2D(); p.roundRect(x, y, w, h, r); return p; };

// laptop seen from the front; returns the screen box (canvas coords)
export function laptop(K, x, y, w, sk = skin(K), { screen = null } = {}) {
  const h = w * 0.62, sx = x + w * 0.05, sy = y + w * 0.05, sw = w * 0.9, sh = h - w * 0.1;
  const lid = rr(x, y, w, h, w * 0.03), base = new Path2D(); base.moveTo(x - w * 0.08, y + h); base.lineTo(x + w * 1.08, y + h); base.lineTo(x + w * 1.02, y + h + w * 0.045); base.lineTo(x - w * 0.02, y + h + w * 0.045); base.closePath();
  sk.fill(lid, K.S.id === 'generativo' ? 'ink' : sk.pal?.lid || '#3A4250'); sk.stroke(lid);
  const scr = rr(sx, sy, sw, sh, w * 0.015); K.ctx.fillStyle = screen || sk.paper; K.ctx.fill(scr); sk.stroke(scr, 0.6);
  sk.fill(base, sk.pal?.base || sk.soft); sk.stroke(base);
  return { x: sx, y: sy, w: sw, h: sh };
}
export function desk(K, y, x0 = -20, x1 = K.W + 20, sk = skin(K)) {
  const top = new Path2D(); top.rect(x0, y, x1 - x0, 44 * K.u); sk.fill(top, sk.pal?.desk || '#A0694A'); sk.stroke(top);
  const legs = new Path2D(); legs.moveTo(x0 + 120 * K.u, y + 44 * K.u); legs.lineTo(x0 + 130 * K.u, K.H + 10); legs.moveTo(x1 - 120 * K.u, y + 44 * K.u); legs.lineTo(x1 - 130 * K.u, K.H + 10); sk.stroke(legs, 1.2);
}
export function pencil(K, x, y, len, ang, sk = skin(K)) {
  const c = K.ctx; c.save(); c.translate(x, y); c.rotate(ang);
  const body = new Path2D(); body.rect(0, -len * 0.06, len * 0.8, len * 0.12); const tip = new Path2D(); tip.moveTo(len * 0.8, -len * 0.06); tip.lineTo(len, 0); tip.lineTo(len * 0.8, len * 0.06); tip.closePath();
  sk.fill(body, '#E9B44C'); sk.stroke(body); sk.fill(tip, sk.paper); sk.stroke(tip); c.restore();
}
export function giftBox(K, x, y, w, open = 0, sk = skin(K)) { // (x,y) = bottom centre
  const c = K.ctx, h = w * 0.72, bx = x - w / 2, by = y - h;
  const box = new Path2D(); box.rect(bx, by, w, h); sk.fill(box, sk.accent); sk.stroke(box);
  const rib = new Path2D(); rib.rect(x - w * 0.07, by, w * 0.14, h); sk.fill(rib, '#F3D36B'); sk.stroke(rib, 0.6);
  c.save(); c.translate(bx - w * 0.04, by); c.rotate(-open * 0.9); c.translate(0, -open * w * 0.25);
  const lid = new Path2D(); lid.rect(0, -w * 0.18, w * 1.08, w * 0.18); sk.fill(lid, sk.accent); sk.stroke(lid);
  const bow = new Path2D(); bow.ellipse(w * 0.42, -w * 0.24, w * 0.12, w * 0.07, -0.4, 0, 7); bow.ellipse(w * 0.66, -w * 0.24, w * 0.12, w * 0.07, 0.4, 0, 7); sk.fill(bow, '#F3D36B'); sk.stroke(bow, 0.6);
  c.restore();
  return { x: bx, y: by, w, h };
}
export function bubble(K, x, y, w, h, tailX, tailY, sk = skin(K)) {
  const p = new Path2D(); p.roundRect(x, y, w, h, h * 0.35); const t = new Path2D(); t.moveTo(tailX - 18 * K.u, y + h - 2); t.lineTo(tailX, tailY); t.lineTo(tailX + 22 * K.u, y + h - 2);
  sk.fill(p, sk.paper); sk.fill(t, sk.paper); sk.stroke(p); sk.stroke(t);
}
export function check(K, x, y, s, p, color, sk = skin(K)) { if (p <= 0) return; const pts = [[x, y], [x + s * 0.35, y + s * 0.35], [x + s, y - s * 0.5]]; const q = L.clamp(p); const path = new Path2D(); path.moveTo(...pts[0]); if (q < 0.4) path.lineTo(L.lerp(pts[0][0], pts[1][0], q / 0.4), L.lerp(pts[0][1], pts[1][1], q / 0.4)); else { path.lineTo(...pts[1]); path.lineTo(L.lerp(pts[1][0], pts[2][0], (q - 0.4) / 0.6), L.lerp(pts[1][1], pts[2][1], (q - 0.4) / 0.6)); } K.ctx.save(); K.ctx.strokeStyle = color; K.ctx.lineWidth = 7 * K.u; K.ctx.lineCap = K.ctx.lineJoin = 'round'; K.ctx.stroke(path); K.ctx.restore(); }
export function strike(K, x, y, w, p, color) { if (p <= 0) return; const c = K.ctx; c.save(); c.strokeStyle = color; c.lineWidth = 6 * K.u; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w * L.clamp(p), y - 4 * K.u); c.stroke(); c.restore(); }
// small doodle icons for the method path
export function doodle(K, kind, cx, cy, r, sk = skin(K)) {
  const p = new Path2D();
  if (kind === 'chat') { p.roundRect(cx - r, cy - r * 0.7, r * 2, r * 1.3, r * 0.4); p.moveTo(cx - r * 0.4, cy + r * 0.6); p.lineTo(cx - r * 0.7, cy + r); p.lineTo(cx - r * 0.1, cy + r * 0.6); }
  if (kind === 'page') { p.rect(cx - r * 0.75, cy - r, r * 1.5, r * 2); for (let k = 0; k < 4; k++) { p.moveTo(cx - r * 0.5, cy - r * 0.55 + k * r * 0.4); p.lineTo(cx + r * 0.5, cy - r * 0.55 + k * r * 0.4); } }
  if (kind === 'frame') { p.rect(cx - r, cy - r * 0.7, r * 2, r * 1.4); p.moveTo(cx - r * 0.3, cy - r * 0.35); p.lineTo(cx + r * 0.45, cy); p.lineTo(cx - r * 0.3, cy + r * 0.35); p.closePath(); }
  if (kind === 'note') { p.ellipse(cx - r * 0.35, cy + r * 0.55, r * 0.35, r * 0.26, -0.3, 0, 7); p.moveTo(cx, cy + r * 0.5); p.lineTo(cx, cy - r * 0.8); p.lineTo(cx + r * 0.6, cy - r * 0.5); }
  sk.fill(p, sk.soft); sk.stroke(p);
}

// ---------- environment pieces ----------
export function room(K, sk = skin(K), { t = 0 } = {}) { // cozy desk corner: window, shelf, lamp, plant
  const c = K.ctx, pal = sk.pal || {}, win = new Path2D(); win.rect(170, 110, 420, 330); sk.fill(win, pal.win || '#BFDCE8'); sk.stroke(win);
  const bars = new Path2D(); bars.moveTo(380, 110); bars.lineTo(380, 440); bars.moveTo(170, 275); bars.lineTo(590, 275); sk.stroke(bars, 0.8);
  for (const [x, y, r] of [[260 + Math.sin(t * 0.3) * 20, 180, 38], [480 + Math.sin(t * 0.25 + 1) * 20, 220, 30]]) { const cl = new Path2D(); cl.ellipse(x, y, r * 1.6, r * 0.7, 0, 0, 7); sk.fill(cl, pal.cloud || '#FFFFFF'); }
  const shelf = new Path2D(); shelf.rect(1380, 300, 400, 18); sk.fill(shelf, pal.desk || '#A0694A'); sk.stroke(shelf);
  [['#C4663F', 40, 150], ['#8FA7A1', 34, 130], ['#E7B98A', 46, 160], ['#5E6E8C', 30, 120], ['#C4663F', 38, 140]].map((b, i) => pal.books ? [pal.books[i], b[1], b[2]] : b).reduce((x, [col, w, hh]) => { const b = new Path2D(); b.rect(x, 300 - hh, w, hh); sk.fill(b, col); sk.stroke(b, 0.7); return x + w + 6; }, 1400);
  const lampP = new Path2D(); lampP.moveTo(420, 850); lampP.lineTo(470, 620); lampP.lineTo(560, 560); sk.stroke(lampP, 1.4); const shade = new Path2D(); shade.moveTo(520, 520); shade.lineTo(620, 540); shade.lineTo(580, 610); shade.closePath(); sk.fill(shade, pal.shade || '#E9B44C'); sk.stroke(shade);
  const pot = new Path2D(); pot.moveTo(1590, 850); pot.lineTo(1575, 760); pot.lineTo(1695, 760); pot.lineTo(1680, 850); pot.closePath();
  for (let k = 0; k < 6; k++) { const lf = new Path2D(), a = -Math.PI / 2 + (k - 2.5) * 0.35 + Math.sin(t * 1.5 + k) * 0.04; lf.ellipse(1635 + Math.cos(a) * 70, 760 + Math.sin(a) * 70, 22, 60, a + Math.PI / 2, 0, 7); sk.fill(lf, pal.leaf || '#7FA67A'); sk.stroke(lf, 0.6); }
  sk.fill(pot, pal.pot || '#C4663F'); sk.stroke(pot);
}
export function mug(K, x, y, tilt = 0, sk = skin(K)) { const c = K.ctx; c.save(); c.translate(x, y); c.rotate(tilt); const m = new Path2D(); m.roundRect(-34, -80, 68, 80, 8); const hd = new Path2D(); hd.ellipse(38, -42, 18, 22, 0, 0, 7); sk.stroke(hd, 1.2); sk.fill(m, '#F3F0E8'); sk.stroke(m); const st = new Path2D(); st.moveTo(-8, -92); st.quadraticCurveTo(-20, -112, -6, -128); st.moveTo(10, -92); st.quadraticCurveTo(-2, -112, 12, -128); sk.stroke(st, 0.6); c.restore(); }
export function drafting(K, sk = skin(K)) { // ruler, triangle and compass on the sheet
  const r = new Path2D(); r.rect(1250, 900, 560, 50); sk.fill(r, sk.soft); sk.stroke(r); for (let i = 0; i < 28; i++) { const tk = new Path2D(); tk.moveTo(1262 + i * 20, 900); tk.lineTo(1262 + i * 20, 900 + (i % 5 ? 12 : 22)); sk.stroke(tk, 0.5); }
  const tri = new Path2D(); tri.moveTo(120, 960); tri.lineTo(420, 960); tri.lineTo(120, 700); tri.closePath(); sk.stroke(tri);
  const cp = new Path2D(); cp.moveTo(1620, 520); cp.lineTo(1560, 760); cp.moveTo(1620, 520); cp.lineTo(1690, 760); cp.moveTo(1590, 640); cp.lineTo(1660, 640); sk.stroke(cp, 1.2); const hub = new Path2D(); hub.arc(1620, 515, 14, 0, 7); sk.fill(hub, sk.soft); sk.stroke(hub);
}
export function key(K, x, y, w, ch, down = 0, sk = skin(K)) { // giant keycap; (x,y) top-left of cap at rest
  const c = K.ctx, d = down * 14, base = new Path2D(); base.roundRect(x, y + 18, w, w * 0.62, 18); c.save(); c.fillStyle = 'rgba(0,0,0,.06)'; c.fill(base); c.restore();
  const cap = new Path2D(); cap.roundRect(x, y + d, w, w * 0.62, 18); sk.fill(cap, '#FFFFFF'); c.save(); c.strokeStyle = '#E6E3DE'; c.lineWidth = 2; c.stroke(cap); c.restore();
  L.text(c, ch, x + w / 2, y + d + w * 0.44, { font: K.S.type.display(w * 0.4), color: down > 0.5 ? K.P.accent : '#141414', align: 'center' });
}
export function flag(K, x, y, h, wave, sk = skin(K)) { const pole = new Path2D(); pole.moveTo(x, y); pole.lineTo(x, y - h); sk.stroke(pole, 1.4); const f = new Path2D(); f.moveTo(x, y - h); f.quadraticCurveTo(x + h * 0.3, y - h - 10 * Math.sin(wave), x + h * 0.6, y - h + 6); f.lineTo(x + h * 0.6, y - h * 0.62 + 6); f.quadraticCurveTo(x + h * 0.3, y - h * 0.6 - 10 * Math.sin(wave + 1), x, y - h * 0.62); f.closePath(); sk.fill(f, sk.accent); sk.stroke(f, 0.6); }
export function magnifier(K, x, y, r, ang, sk = skin(K)) { const c = K.ctx; c.save(); c.translate(x, y); c.rotate(ang); const h = new Path2D(); h.rect(-6, 0, 12, r * 1.6); sk.fill(h, '#6B4B3A'); sk.stroke(h); const g = new Path2D(); g.arc(0, -r, r, 0, 7); c.save(); c.globalAlpha = 0.25; c.fillStyle = '#BFE3F2'; c.fill(g); c.restore(); sk.stroke(g, 1.4); c.restore(); }
export function confetti(K, t, t0, colors, { n = 60, seed = 3, strips = false } = {}) { if (t < t0) return; const c = K.ctx, r = L.rng(seed), dt = t - t0; for (let k = 0; k < n; k++) { const x = r() * K.W, v = 180 + r() * 260, y = -40 + (dt * v) + r() * -300, a = dt * (2 + r() * 5) + r() * 6; if (y > K.H + 40) continue; c.save(); c.translate(x + Math.sin(dt * 2 + k) * 30, y); c.rotate(a); c.fillStyle = colors[k % colors.length]; if (strips) c.fillRect(-26, -6, 52, 12); else { c.beginPath(); c.arc(0, 0, 6 + (k % 3) * 3, 0, 7); c.fill(); } c.restore(); } }
export function panelBorder(K, x, y, w, h, sk = skin(K)) { const p = new Path2D(); p.rect(x, y, w, h); sk.stroke(p, 1.3); }

// ---- material real y "tachar" (aprendido en la intro Opus 5.5) ----
// X de plumón en dos trazos sobre (x,y), semitamaño a; q = progreso 0→1. Dibuja la herramienta en la punta mientras traza.
export function redX(K, x, y, a, q, { w = 16, color = '#D83A34', tool = 'marker' } = {}) { if (q <= 0) return; const c = K.ctx, q1 = L.clamp(q * 2), q2 = L.clamp(q * 2 - 1);
  c.save(); c.strokeStyle = color; c.lineWidth = w * K.u; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - a, y - a); c.lineTo(x - a + 2 * a * q1, y - a + 2 * a * q1);
  if (q2 > 0) { c.moveTo(x + a, y - a); c.lineTo(x + a - 2 * a * q2, y - a + 2 * a * q2); } c.stroke(); c.restore();
  if (tool && q < 1) L.drawTool(c, tool, q < 0.5 ? x - a + 2 * a * q1 : x + a - 2 * a * q2, q < 0.5 ? y - a + 2 * a * q1 : y - a + 2 * a * q2, 1, { color }); }
// logo/ícono real (imagen) como sticker: borde blanco redondeado + sombra, entra con rebote. p = progreso de entrada.
export function sticker(K, img, x, y, size, p, { rot = 0, radius = 0.22 } = {}) { const e = L.E.back(L.clamp(p)); if (e <= 0) return; const c = K.ctx, S = size;
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(e, e); c.shadowColor = 'rgba(0,0,0,.22)'; c.shadowBlur = 30; c.shadowOffsetY = 12;
  c.fillStyle = '#FFFFFF'; c.beginPath(); c.roundRect(-S / 2 - 10, -S / 2 - 10, S + 20, S + 20, S * (radius + 0.04)); c.fill(); c.shadowColor = 'transparent';
  c.beginPath(); c.roundRect(-S / 2, -S / 2, S, S, S * radius); c.clip(); if (img) c.drawImage(img, -S / 2, -S / 2, S, S); c.restore(); }
// captura real (post, dashboard, tweet) en tarjeta con sombra que entra deslizándose desde la derecha. Devuelve el rect final (para highlights).
export function shotCard(K, img, box, p, { from = 900, radius = 20 } = {}) { const q = L.E.out(L.clamp(p)), X = box.x + (1 - q) * from, c = K.ctx; if (q <= 0) return box;
  c.save(); c.globalAlpha = L.clamp(q * 1.5); c.shadowColor = 'rgba(0,0,0,.28)'; c.shadowBlur = 40; c.shadowOffsetY = 16; c.fillStyle = '#FFFFFF'; c.beginPath(); c.roundRect(X - 10, box.y - 10, box.w + 20, box.h + 20, radius + 8); c.fill(); c.shadowColor = 'transparent';
  c.beginPath(); c.roundRect(X, box.y, box.w, box.h, radius); c.clip(); if (img) c.drawImage(img, X, box.y, box.w, box.h); c.restore(); return { ...box, x: X }; }
// logos de redes dibujados en código (marcas planas): 'ig' | 'yt' | 'tt' | 'in'. s = tamaño en px, p = escala de entrada.
export function social(K, kind, x, y, s, p) { if (p <= 0) return; const c = K.ctx; c.save(); c.translate(x, y); c.scale(p * s / 100, p * s / 100); c.shadowColor = 'rgba(0,0,0,.25)'; c.shadowBlur = 20; c.shadowOffsetY = 8;
  const sq = () => { c.beginPath(); c.roundRect(-50, -50, 100, 100, 24); };
  if (kind === 'ig') { const g = c.createLinearGradient(-50, 50, 50, -50); [['0', '#FEDA75'], ['.3', '#FA7E1E'], ['.55', '#D62976'], ['.8', '#962FBF'], ['1', '#4F5BD5']].forEach(([o, col]) => g.addColorStop(+o, col)); c.fillStyle = g; sq(); c.fill(); c.shadowColor = 'transparent';
    c.strokeStyle = '#fff'; c.lineWidth = 7; c.beginPath(); c.roundRect(-30, -30, 60, 60, 17); c.stroke(); c.beginPath(); c.arc(0, 0, 14, 0, 7); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(19, -19, 4.5, 0, 7); c.fill(); }
  if (kind === 'yt') { c.fillStyle = '#FF0000'; c.beginPath(); c.roundRect(-62, -44, 124, 88, 26); c.fill(); c.shadowColor = 'transparent'; c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-14, -22); c.lineTo(-14, 22); c.lineTo(24, 0); c.closePath(); c.fill(); }
  if (kind === 'tt') { c.fillStyle = '#111'; sq(); c.fill(); c.shadowColor = 'transparent'; const note = (dx, dy, col) => { c.strokeStyle = col; c.lineWidth = 11; c.lineCap = 'round'; c.beginPath(); c.moveTo(4 + dx, -30 + dy); c.lineTo(4 + dx, 14 + dy); c.stroke(); c.beginPath(); c.arc(-10 + dx, 14 + dy, 14, 0, 7); c.stroke(); c.beginPath(); c.moveTo(4 + dx, -30 + dy); c.quadraticCurveTo(10 + dx, -14 + dy, 26 + dx, -12 + dy); c.stroke(); };
    note(-3, -3, '#25F4EE'); note(3, 3, '#FE2C55'); note(0, 0, '#fff'); }
  if (kind === 'in') { c.fillStyle = '#0A66C2'; sq(); c.fill(); c.shadowColor = 'transparent'; L.text(c, 'in', 0, 22, { font: '700 64px Inter, sans-serif', color: '#fff', align: 'center' }); }
  c.restore(); }
// moneda/ficha vista de lado (para pilas: tokens, dinero, puntos); (x,y) = centro de la cara superior
export function coin(K, x, y, r = 80, { face = '#D97757', side = '#B8573A', mark = 'T' } = {}, sk = skin(K)) { const c = new Path2D(); c.ellipse(x, y + 22, r, r * 0.3, 0, 0, Math.PI); c.lineTo(x - r, y); c.ellipse(x, y, r, r * 0.3, 0, Math.PI, 0, true); c.closePath(); sk.fill(c, side); sk.stroke(c, 0.9);
  const t = new Path2D(); t.ellipse(x, y, r, r * 0.3, 0, 0, 7); sk.fill(t, face); sk.stroke(t, 0.9); if (mark) L.text(K.ctx, mark, x, y + r * 0.12, { font: `700 ${r * 0.36}px Fraunces, serif`, color: '#141414', align: 'center' }); }
// engrane (configurar / ajustes); ang = giro
export function gear(K, x, y, r, ang = 0, { color = '#141414', hole = '#FBF1E6' } = {}, sk = skin(K)) { const g = new Path2D(), n = 9; for (let i = 0; i < n * 2; i++) { const a0 = ang + i * Math.PI / n, rr = i % 2 ? r * 0.78 : r; g.lineTo(x + Math.cos(a0 - 0.14) * rr, y + Math.sin(a0 - 0.14) * rr); g.lineTo(x + Math.cos(a0 + 0.14) * rr, y + Math.sin(a0 + 0.14) * rr); } g.closePath(); sk.fill(g, color); sk.stroke(g); const h = new Path2D(); h.arc(x, y, r * 0.3, 0, 7); sk.fill(h, hole); sk.stroke(h); }
// íconos animados de oficios/acciones para listas habladas; t = segundos desde que apareció. kind: 'code' | 'edit' | 'anim'
export function oficio(K, kind, x, y, t, sk = skin(K)) { const c = K.ctx;
  if (kind === 'code') { const m = new Path2D(); m.roundRect(x - 130, y - 90, 260, 170, 12); sk.fill(m, '#1F2A44'); sk.stroke(m); const st = new Path2D(); st.moveTo(x - 30, y + 80); st.lineTo(x - 45, y + 110); st.lineTo(x + 45, y + 110); st.lineTo(x + 30, y + 80); sk.stroke(st);
    L.text(c, '</>', x - 100, y - 40, { font: '700 34px "IBM Plex Mono", monospace', color: '#FFD84D' }); [[150, '#7FD1FF'], [110, '#FF8A7A'], [170, '#9BE39B']].forEach(([w, col], i) => { c.fillStyle = col; c.fillRect(x - 100 + (i === 1 ? 24 : 0), y - 10 + i * 26, w * L.clamp(t * 3 - i * 0.6), 10); }); }
  if (kind === 'edit') { const tr = new Path2D(); tr.roundRect(x - 140, y - 60, 280, 120, 10); sk.fill(tr, '#F3E6D8'); sk.stroke(tr);
    [[-128, 80, '#6FA8DC'], [-44, 60, '#F6B26B'], [20, 100, '#93C47D']].forEach(([dx, w, col], i) => { const cl = new Path2D(); cl.roundRect(x + dx, y - 40 + (i % 2) * 44, w, 36, 6); sk.fill(cl, col); sk.stroke(cl, 0.7); });
    const ph = x - 130 + 260 * ((t * 0.9) % 1); c.fillStyle = '#E0483E'; c.fillRect(ph - 2, y - 72, 4, 144); c.beginPath(); c.moveTo(ph - 10, y - 78); c.lineTo(ph + 10, y - 78); c.lineTo(ph, y - 64); c.fill();
    L.text(c, '✂', x + 110, y - 78, { font: '48px sans-serif', color: '#1F2A44', align: 'center' }); }
  if (kind === 'anim') { c.save(); c.setLineDash([6, 10]); c.strokeStyle = '#1F2A44'; c.lineWidth = 3; c.beginPath(); for (let k = 0; k <= 40; k++) { const u = k / 40, bx = x - 140 + 280 * u, by = y + 60 - Math.abs(Math.sin(u * Math.PI * 2)) * 130; k ? c.lineTo(bx, by) : c.moveTo(bx, by); } c.stroke(); c.restore();
    const u = (t * 0.8) % 1, bx = x - 140 + 280 * u, by = y + 60 - Math.abs(Math.sin(u * Math.PI * 2)) * 130, sq = by > y + 45 ? 0.75 : 1; const b = new Path2D(); b.ellipse(bx, by - 22 * sq, 24 / sq, 24 * sq, 0, 0, 7); sk.fill(b, '#D97757'); sk.stroke(b);
    [0, 0.25, 0.5, 0.75, 1].forEach(k => { const d = new Path2D(), kx = x - 140 + 280 * k, ky = y + 105; d.moveTo(kx, ky - 11); d.lineTo(kx + 11, ky); d.lineTo(kx, ky + 11); d.lineTo(kx - 11, ky); d.closePath(); sk.fill(d, u >= k - 0.02 ? '#FFD84D' : '#FFFFFF'); sk.stroke(d, 0.7); }); } }
