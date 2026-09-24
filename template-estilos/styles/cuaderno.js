// Cuaderno / bullet journal — hoja punteada/cuadriculada/rayada, pluma azul-negra, marcatextos que se salen de la línea, washi tape y doodles al margen.
import * as L from '../engine/lib.js';
import { BASE, title, para, layoutRich, drawRich, fitCharacter, drawFrame } from '../engine/base.js';

const PAPER = '#FBF8F1', PEN = '#1F2A44', RED = '#D64545';
const HL = { yel: '#FFE66D', pink: '#FFB3C7', green: '#B8F2C4', blue: '#A8D8FF', orange: '#FFC98B' };
const HLS = [HL.yel, HL.pink, HL.green, HL.blue, HL.orange];
let pages = [], grain;
const brand = K => (K.spec.palette || {}).accent; // color de marca del usuario (spec.palette.accent) manda sobre el del estilo
const boil = K => Math.floor(K.t * 5);
const pen = (K, seed) => L.wobbleStroke(K.ctx, PEN, 3.2 * K.u, 1, seed);
function marker(ctx, x, y, w, h, col, p, seed, u) { // highlighter swipe: slanted, soft ends, a bit outside the lines
  if (p <= 0) return; const r = L.rng(seed); ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.85; ctx.fillStyle = col;
  const ww = w * L.E.out(p), sk = h * 0.18; ctx.beginPath(); ctx.moveTo(x + sk, y + (r() - 0.5) * 4 * u); ctx.lineTo(x + ww + sk * 0.4, y + (r() - 0.5) * 5 * u); ctx.quadraticCurveTo(x + ww + sk, y + h / 2, x + ww - sk * 0.2, y + h + (r() - 0.5) * 4 * u); ctx.lineTo(x - sk * 0.3, y + h + (r() - 0.5) * 4 * u); ctx.quadraticCurveTo(x - sk, y + h / 2, x + sk, y); ctx.fill(); ctx.restore();
}
function wobblyRect(K, x, y, w, h, seed, p = 1) { const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], n = Math.max(2, Math.ceil(5 * p)); L.inkPath(K.ctx, pts.slice(0, n), { w: 2.8 * K.u, color: PEN, seed, jitter: 1.4 }); }
function washi(ctx, x, y, w, rot, col, u) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = 0.82; ctx.fillStyle = col; ctx.fillRect(-w / 2, -14 * u, w, 28 * u); ctx.globalAlpha = 0.35; ctx.fillStyle = '#FFFFFF'; for (let k = -w / 2; k < w / 2; k += 14 * u) ctx.fillRect(k, -14 * u, 6 * u, 28 * u); ctx.restore(); }
function doodle(K, kind, x, y, s, seed) {
  const ctx = K.ctx, u = K.u, pts = [];
  if (kind === 'star') { for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? 0.42 : 1) * s; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } }
  else if (kind === 'spiral') { for (let i = 0; i < 40; i++) { const a = i * 0.45, r = s * i / 40; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } }
  else if (kind === 'arrow') { pts.push([x - s, y + s * 0.4], [x - s * 0.3, y - s * 0.2], [x + s * 0.4, y + s * 0.1], [x + s, y - s * 0.3]); L.inkPath(ctx, [[x + s * 0.6, y - s * 0.45], [x + s, y - s * 0.3], [x + s * 0.8, y + s * 0.05]], { w: 2.4 * u, color: PEN, seed }); }
  else if (kind === 'sparkle') { L.inkPath(ctx, [[x - s, y], [x + s, y]], { w: 2.4 * u, color: PEN, seed }); L.inkPath(ctx, [[x, y - s], [x, y + s]], { w: 2.4 * u, color: PEN, seed: seed + 1 }); return; }
  L.inkPath(ctx, pts, { w: 2.4 * u, color: PEN, seed });
}

export default {
  id: 'cuaderno', name: 'Cuaderno / bullet journal',
  fonts: 'Instrument+Serif:ital@0;1&family=Kalam:wght@400;700&family=Caveat:wght@600',
  fontLoads: ['400 80px "Instrument Serif"', 'italic 400 80px "Instrument Serif"', '400 30px Kalam', '700 30px Kalam', '600 40px Caveat'],
  palette: { bg: PAPER, ink: PEN, accent: RED, muted: '#5A6378', panel: PAPER, line: 'rgba(31,42,68,.2)', good: '#2F7D4F', bad: RED, mascot: '#D97757' },
  type: { display: s => `400 ${s}px "Instrument Serif"`, em: s => `italic 400 ${s}px "Instrument Serif"`, body: s => `400 ${s}px Kalam`, bodyEm: s => `700 ${s}px Kalam`, label: s => `700 ${s}px Kalam`, mono: s => `400 ${s}px Kalam`, hand: s => `600 ${s}px Caveat` },
  lh: 1.0, ls: -0.01,
  sfx: 'ink', transDur: 0.75, push: 0.02,
  music: 'lo-fi study beats, warm Rhodes chords, soft vinyl crackle, mellow boom-bap drums, gentle guitar licks, 86 BPM, instrumental, focused and cozy',
  async setup(K) {
    const { W, H, u, vertical: V } = K; grain = L.grainTiles(3, 256, 0.4, 4);
    [0, 1, 2].forEach(v => {
      const c = L.canvas(W, H), x = c.getContext('2d'); L.paper(x, PAPER, { seed: 30 + v, grain: 0.025, blotch: 0.02, fibers: 150 });
      const g = 38 * u;
      if (v === 0) { x.fillStyle = 'rgba(31,42,68,.22)'; for (let yy = g; yy < H; yy += g) for (let xx = g; xx < W; xx += g) { x.beginPath(); x.arc(xx, yy, 1.8 * u, 0, 7); x.fill(); } }
      if (v === 1) { x.strokeStyle = 'rgba(80,140,190,.16)'; x.lineWidth = 1; for (let yy = 0; yy < H; yy += g) { x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); } for (let xx = 0; xx < W; xx += g) { x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx, H); x.stroke(); } }
      if (v === 2) { x.strokeStyle = 'rgba(80,140,190,.25)'; x.lineWidth = 1.2; for (let yy = g * 2; yy < H; yy += g * 1.2) { x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); } x.strokeStyle = 'rgba(214,69,69,.35)'; x.lineWidth = 2; x.beginPath(); x.moveTo(W * (V ? 0.05 : 0.035), 0); x.lineTo(W * (V ? 0.05 : 0.035), H); x.stroke(); }
      // binder holes
      x.fillStyle = '#E4DED2'; const n = V ? 7 : 5; for (let k = 0; k < n; k++) { const hy = H * (k + 0.5) / n; x.beginPath(); x.arc(14 * u, hy, 9 * u, 0, 7); x.fill(); }
      const sh = x.createLinearGradient(0, 0, 60 * u, 0); sh.addColorStop(0, 'rgba(0,0,0,.08)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = sh; x.fillRect(0, 0, 60 * u, H);
      pages.push(c);
    });
  },
  background(K, s) { K.ctx.drawImage(pages[s.i % 3], 0, 0); },
  decor(K, s) { // margin doodles that boil slightly
    const W = K.W, H = K.H, u = K.u, bt = boil(K), r = L.rng(s.i * 3 + 1), kinds = ['star', 'spiral', 'sparkle', 'arrow'];
    const spots = K.vertical ? [[0.9, 0.035], [0.1, 0.035]] : [[0.965, 0.07], [0.965, 0.5], [0.035, 0.93]];
    spots.forEach(([x, y], k) => doodle(K, kinds[(s.i + k) % 4], W * x, H * y, (16 + r() * 10) * u, bt + k * 7));
  },
  headline(K, str, box, p, s, o = {}) {
    const ctx = K.ctx, u = K.u, R = layoutRich(ctx, K.rich(str), box, { font: sz => K.S.type.display(sz), emFont: sz => K.S.type.em(sz), max: (o.size === 'm' ? 120 : 180) * u, min: 18 * u, lh: 1.02, ls: -0.01 });
    const n = R.lines.length, y0 = box.y + (box.h - n * R.lh) / 2; let wi = 0;
    R.lines.forEach((line, i) => { const x0 = o.align === 'center' ? box.x + (box.w - R.widths[i]) / 2 : o.align === 'right' ? box.x + box.w - R.widths[i] : box.x; line.forEach(t => { if (t.em) marker(ctx, x0 + t.x - R.size * 0.06, y0 + i * R.lh + R.size * 0.3, t.width + R.size * 0.12, R.size * 0.62, (brand(K) ? brand(K) + '8C' : HLS[(s.i + wi) % HLS.length]), L.clamp(p * 1.6 - 0.5), wi + i, u); wi++; }); });
    drawRich(K, R, box, p, { align: o.align, color: PEN, emColor: PEN, reveal: 'wipe' });
  },
  text(K, str, box, p, role, s, o = {}) {
    if (role === 'kicker' || role === 'label') { // underlined marker caps
      const r = para(K, str, box, p, { font: sz => K.S.type.label(sz), color: RED, upper: true, ls: 0.12, max: 30, align: o.align || 'left', reveal: 'wipe' }); return r;
    }
    if (role === 'headGood' || role === 'headBad') {
      const ctx = K.ctx; ctx.font = K.S.type.display(Math.min(box.h * 0.9, 64 * K.u)); const tw = ctx.measureText(str).width;
      marker(ctx, box.x - 6 * K.u, box.y + box.h * 0.25, Math.min(box.w, tw + 12 * K.u), box.h * 0.6, role === 'headGood' ? HL.green : HL.pink, p, str.length, K.u);
      return title(K, str, box, p, { color: PEN, max: 64, reveal: 'wipe', valign: 'middle' });
    }
    return BASE.text(K, str, box, p, role, s, { color: role === 'bad' ? '#7A8194' : role === 'body' ? '#3E4760' : PEN, font: sz => K.S.type.body(sz), reveal: role === 'body' || role === 'step' ? 'wipe' : 'fade', ...o });
  },
  panel(K, b, p, s, kind, j = 0) {
    if (p <= 0) return; const ctx = K.ctx, u = K.u;
    if (kind === 'row') { const y = b.y + b.h * 0.94, pts = []; for (let k = 0; k <= 30 * L.E.out(p); k++) pts.push([b.x + b.w * k / 30, y + Math.sin(k * 1.3 + j) * 1.5 * u]); if (pts.length > 1) L.inkPath(ctx, pts, { w: 1.6 * u, color: 'rgba(31,42,68,.45)', seed: j + boil(K) }); return; }
    if (kind === 'note') { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 16 * u; ctx.shadowOffsetY = 6 * u; ctx.globalAlpha = L.clamp(p * 2); ctx.fillStyle = '#FFF4A8'; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.restore(); return; }
    ctx.save(); ctx.globalAlpha = L.clamp(p * 2); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = L.rgba(kind === 'good' ? HL.green : HL.pink, 0.35); ctx.fillRect(b.x + 6 * u, b.y + 6 * u, b.w - 12 * u, b.h - 12 * u); ctx.restore();
    wobblyRect(K, b.x, b.y, b.w, b.h, j + boil(K), p);
    washi(ctx, b.x + b.w / 2, b.y, 150 * u, kind === 'good' ? 0.04 : -0.04, kind === 'good' ? '#7FC8A9' : '#F29CA3', u);
  },
  bullet(K, i, b, p, s) {
    if (p <= 0) return; const ctx = K.ctx, u = K.u, bt = boil(K), [cx, cy] = L.center(b), r = Math.min(b.w, b.h) / 2;
    if (s.type === 'steps') { // circled number
      const pts = []; for (let k = 0; k <= 26 * L.E.out(p); k++) { const a = -1.6 + k / 26 * 6.6; pts.push([cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9]); }
      marker(ctx, cx - r * 0.7, cy - r * 0.4, r * 1.4, r * 0.8, HLS[i % HLS.length], p, i, u); if (pts.length > 1) L.inkPath(ctx, pts, { w: 3 * u, color: PEN, seed: bt + i });
      return L.text(ctx, String(i + 1), cx, cy + r * 0.34, { font: K.S.type.display(r * 1.1), color: PEN, align: 'center', alpha: L.clamp(p * 2 - 0.4) });
    }
    const q = r * 0.62; wobblyRect(K, cx - q, cy - q, q * 2, q * 2, i * 3 + bt, L.clamp(p * 1.5)); // bullet-journal checkbox, then a tick
    const t = L.clamp(p * 1.6 - 0.6); if (t > 0) { const pts = [[cx - q * 0.7, cy], [cx - q * 0.15, cy + q * 0.6], [cx + q * 1.2, cy - q * 1.1]]; const n = t < 0.5 ? 2 : 3; L.inkPath(ctx, pts.slice(0, n), { w: 4 * u, color: RED, seed: i + bt }); }
  },
  number(K, str, box, p, s, o = {}) {
    const ctx = K.ctx, u = K.u, R = layoutRich(ctx, K.rich(str), box, { font: sz => K.S.type.display(sz), max: (o.small ? 140 : 300) * u, min: 20 * u, lh: 1 });
    const w = R.widths[0], cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    if (!o.small) { marker(ctx, cx - w / 2 - R.size * 0.1, cy - R.size * 0.1, w + R.size * 0.2, R.size * 0.45, HL.yel, L.clamp(p * 1.5 - 0.3), 5, u); }
    drawRich(K, R, box, p, { align: 'center', color: o.small ? RED : PEN, reveal: 'wipe' });
    if (!o.small && o.final) { const pts = []; for (let k = 0; k <= 34; k++) { const a = -2.8 + k / 34 * 6.9; pts.push([cx + Math.cos(a) * (w / 2 + R.size * 0.25), cy + Math.sin(a) * R.size * 0.62]); } L.inkPath(ctx, pts, { w: 3.5 * u, color: RED, seed: boil(K) }); }
  },
  quote(K, str, box, p, s) {
    if (p <= 0) return; const ctx = K.ctx, u = K.u, cx = box.x + box.w / 2, cy = box.y + box.h / 2; ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.015); ctx.translate(-cx, -cy);
    K.S.panel(K, box, p, s, 'note'); washi(ctx, cx, box.y, 170 * u, 0.03, '#9CC9E8', u); ctx.restore();
    para(K, '“' + str + '”', L.inset(box, box.w * 0.07, box.h * 0.14), L.clamp(p * 1.3 - 0.2), { font: sz => K.S.type.bodyEm(sz), color: PEN, max: 70, lh: 1.2, reveal: 'wipe' });
  },
  portrait(K, box, p, s) { // pen drawing coloured with markers that slip outside the lines
    if (p <= 0) return; const ctx = K.ctx, u = K.u, f = fitCharacter({ ...box, h: box.h * 0.97 }), bt = boil(K), e = L.E.out(p);
    ctx.save(); ctx.globalAlpha = L.clamp(p * 2); ctx.translate(0, (1 - e) * 40 * u);
    const fill = (pth, c) => { ctx.fillStyle = PAPER; ctx.fill(pth); ctx.save(); ctx.globalAlpha = 0.88; ctx.translate(5 * u / f.s, 6 * u / f.s); ctx.fillStyle = L.mix(c, '#FFFFFF', 0.12); ctx.fill(pth); ctx.restore(); };
    L.character(ctx, f.x, f.y, f.s, K.look, { fill, stroke: L.wobbleStroke(ctx, PEN, 3.6, f.s, bt), ink: PEN, blink: (K.frame % 115) < 4, mood: s.d.mood === 'surprised' ? 'o' : 'smile' });
    ctx.restore();
    doodle(K, 'sparkle', box.x + box.w * 0.86, box.y + box.h * 0.12, 18 * u, bt + 3);
  },
  mascot(K, box, p, s, mood) {
    if (p <= 0) return; const ctx = K.ctx, e = L.E.back(p), bt = boil(K); ctx.save(); ctx.globalAlpha = L.clamp(p * 2);
    const fill = (pth, c) => { ctx.fillStyle = PAPER; ctx.fill(pth); ctx.save(); ctx.globalAlpha = 0.88; ctx.translate(4, 5); ctx.fillStyle = c; ctx.fill(pth); ctx.restore(); };
    L.mascot(ctx, K.spec.mascot, { ...box, y: box.y + (1 - e) * 30 * K.u }, { fill, stroke: L.wobbleStroke(ctx, PEN, 4, 1, bt), color: K.P.mascot, ink: PEN, eyeStyle: mood === 'happy' ? 'happy' : 'dot', bob: Math.sin(K.t * 3) * 3 * K.u });
    ctx.restore();
  },
  media(K, img, box, p, s, frame) {
    if (p <= 0) return; const ctx = K.ctx, u = K.u, [cx, cy] = L.center(box); ctx.save(); ctx.translate(cx, cy); ctx.rotate(0.02 + (1 - L.E.out(p)) * 0.08); ctx.translate(-cx, -cy);
    const o = drawFrame(K, img, box, p, frame, { bezel: '#23262F', shadowColor: 'rgba(40,40,60,.25)' });
    ctx.globalAlpha = L.clamp(p * 2 - 1); washi(ctx, o.x + o.w / 2, o.y + 4 * u, 160 * u, -0.05, '#F2B880', u); ctx.restore();
    doodle(K, 'arrow', o.x - 60 * u, o.y + o.h * 0.3, 40 * u, boil(K));
  },
  prompt(K, str, box, p, s, tp) {
    if (p <= 0) return; const u = K.u; wobblyRect(K, box.x, box.y, box.w, box.h, 41 + boil(K), L.clamp(p * 1.4));
    para(K, '✎ ' + str.slice(0, Math.ceil(str.length * tp)) + (tp < 1 ? '|' : ''), L.inset(box, 22 * u, 10 * u), 1, { font: sz => K.S.type.bodyEm(sz), color: PEN, max: 34, valign: 'middle' });
  },
  caption(K, words, act, box, p) {
    const ctx = K.ctx, u = K.u; ctx.save(); ctx.globalAlpha = p; ctx.font = K.S.type.bodyEm(34 * u);
    const w = Math.min(box.w, ctx.measureText(words.join(' ')).width + 70 * u), x = box.x + (box.w - w) / 2;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.14)'; ctx.shadowBlur = 12 * u; ctx.shadowOffsetY = 4 * u; ctx.fillStyle = '#FFFFFF'; L.rrect(ctx, x, box.y, w, box.h, 6 * u); ctx.fill(); ctx.restore();
    let cx = x + 35 * u; const y = box.y + box.h * 0.68;
    words.forEach((wd, i) => { const ww = ctx.measureText(wd).width; if (i === act) marker(ctx, cx - 4 * u, box.y + box.h * 0.22, ww + 8 * u, box.h * 0.58, HL.yel, 1, i, u); ctx.fillStyle = i <= act ? PEN : '#9AA0AE'; ctx.fillText(wd, cx, y); cx += ctx.measureText(wd + ' ').width; });
    ctx.restore();
  },
  connector(K, a, b, p) { // hand-drawn arrow
    if (p <= 0) return; const u = K.u, e = [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p], pts = []; for (let k = 0; k <= 16; k++) { const t = k / 16; pts.push([a[0] + (e[0] - a[0]) * t, a[1] + (e[1] - a[1]) * t + Math.sin(t * Math.PI) * -12 * u * (K.vertical ? 0 : 1)]); }
    L.inkPath(K.ctx, pts, { w: 2.6 * u, color: PEN, seed: boil(K) });
    if (p > 0.9) { const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), hs = 14 * u; L.inkPath(K.ctx, [[e[0] - Math.cos(ang - 0.5) * hs, e[1] - Math.sin(ang - 0.5) * hs], e, [e[0] - Math.cos(ang + 0.5) * hs, e[1] - Math.sin(ang + 0.5) * hs]], { w: 2.6 * u, color: PEN, seed: boil(K) + 2 }); }
  },
  button(K, str, b, p) {
    if (p <= 0) return; marker(K.ctx, b.x, b.y + b.h * 0.1, b.w, b.h * 0.8, HL.orange, p, 9, K.u); wobblyRect(K, b.x, b.y, b.w, b.h, 13 + boil(K), L.clamp(p * 1.4));
    para(K, str, L.inset(b, b.h * 0.3, b.h * 0.15), L.clamp(p * 2 - 0.6), { font: sz => K.S.type.bodyEm(sz), color: PEN, max: 40, align: 'center' });
  },
  transition(K, A, B, p, info) { // page turn: the old page peels away right→left, its back side curling over the new one
    const { ctx, W, H, u } = K, e = L.E.inOut(info.raw), fx = W * (1 - e * 1.15), curl = Math.min(220 * u, W * 0.18) * Math.sin(Math.PI * Math.min(1, e * 1.1));
    ctx.drawImage(B, 0, 0);
    if (fx > -curl) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, Math.max(0, fx), H); ctx.clip(); ctx.drawImage(A, 0, 0); ctx.restore();
      const sh = ctx.createLinearGradient(fx, 0, fx + curl * 1.6, 0); sh.addColorStop(0, 'rgba(0,0,0,.28)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sh; ctx.fillRect(fx, 0, curl * 1.6, H);
      const g = ctx.createLinearGradient(fx - curl, 0, fx, 0); g.addColorStop(0, '#EAE4D6'); g.addColorStop(0.6, '#F7F3EA'); g.addColorStop(1, '#D9D2C2'); ctx.fillStyle = g; ctx.fillRect(Math.max(0, fx - curl), 0, Math.min(curl, fx + curl), H);
    }
  },
  overlay(K) { L.drawGrain(K.ctx, grain, K.frame, 0.035, 'multiply'); },
};
