// Acuarela de estudio — papel de acuarela, manchas que se expanden, contorno de tinta que "hierve"; personaje dibujado.
import * as L from '../engine/lib.js';
import { BASE, title, para, fitCharacter, drawFrame } from '../engine/base.js';

const INK = '#241D18', TERRA = '#C4663F', SAGE = '#8FA7A1', SKY = '#9CC3D5', SAND = '#E7B98A', PAPER = '#F1E8D6';
let paperC, washes = {}, blob;
const boil = K => Math.floor(K.t * 8); // line boil: 8 redraws per second
const WASH = L.memo((w, h, color, seed) => { const c = L.canvas(Math.ceil(w + 80), Math.ceil(h + 80)), x = c.getContext('2d'); L.watercolor(x, L.rectPoly(40, 40, w, h), color, { seed: +seed, layers: 22, alpha: 0.06, amp: 0.12 }); return c; });

export default {
  id: 'acuarela', name: 'Acuarela de estudio',
  fonts: 'Fraunces:ital,opsz,wght@1,9..144,500;1,9..144,700&family=Caveat:wght@600;700&family=DM+Sans:wght@500;700',
  fontLoads: ['italic 500 60px Fraunces', 'italic 700 60px Fraunces', '600 40px Caveat', '700 40px Caveat', '500 30px "DM Sans"', '700 30px "DM Sans"'],
  palette: { bg: PAPER, ink: INK, accent: TERRA, muted: '#6E5E50', panel: '#FBF5EA', line: 'rgba(36,29,24,.2)', good: '#4E7D5B', bad: '#A4553A', mascot: '#D97757' },
  type: { display: s => `italic 500 ${s}px Fraunces`, em: s => `italic 700 ${s}px Fraunces`, body: s => `500 ${s}px "DM Sans"`, bodyEm: s => `700 ${s}px "DM Sans"`, label: s => `700 ${s}px Caveat`, mono: s => `500 ${s}px "DM Sans"`, hand: s => `700 ${s}px Caveat` },
  lh: 1.02, ls: -0.01,
  sfx: 'paper', transDur: 0.7, push: 0.025,
  music: 'warm acoustic indie, fingerpicked guitar, soft piano, light brushed percussion, hopeful and curious, 96 BPM, instrumental, storybook feel',
  async setup(K) {
    const { W, H } = K;
    paperC = L.canvas(W, H); L.paper(paperC.getContext('2d'), PAPER, { seed: 9, grain: 0.05, blotch: 0.07 });
    // three background wash variants
    const vars = [[SAND, SAGE, '#F2CF9C'], [SKY, SAND, '#DDE7D8'], ['#E9C3B0', SAGE, SAND]];
    vars.forEach((cols, v) => {
      const c = L.canvas(W, H), x = c.getContext('2d'); x.drawImage(paperC, 0, 0);
      L.watercolor(x, L.rectPoly(-80, -60, W + 160, H * 0.75), cols[0], { seed: 2 + v, layers: 28, alpha: 0.035, amp: 0.2 });
      L.watercolor(x, L.circlePoly(W * (0.7 - v * 0.2), H * 0.35, W * 0.27, H * 0.33), cols[2], { seed: 5 + v, layers: 24, alpha: 0.045 });
      L.watercolor(x, L.rectPoly(-80, H * 0.76, W + 160, H * 0.35), cols[1], { seed: 7 + v, layers: 26, alpha: 0.045, amp: 0.15 });
      washes[v] = c;
    });
    // bleed mask for the transition: a deformed blob, unit radius
    const r = L.rng(4); blob = L.circlePoly(0, 0, 1, 1, 24).map(([x, y]) => { const k = 0.85 + r() * 0.3; return [x * k, y * k]; });
  },
  background(K, s) { K.ctx.drawImage(washes[s.i % 3], 0, 0); },
  headline(K, str, box, p, s, o = {}) { title(K, str, box, p, { align: o.align, size: o.size, color: INK, emColor: '#9A4127', reveal: 'wipe', emStyle: 'highlight', emBg: 'rgba(196,102,63,.28)', valign: 'middle' }); },
  text(K, str, box, p, role, s, o = {}) {
    if (role === 'kicker' || role === 'label') return para(K, str, box, p, { font: sz => K.S.type.hand(sz), color: '#9A4127', max: 46, align: o.align || 'left' });
    if (role === 'headBad' || role === 'headGood') return title(K, str, box, p, { color: role === 'headGood' ? '#4E7D5B' : '#A4553A', max: 72, reveal: 'wipe' });
    return BASE.text(K, str, box, p, role, s, { color: role === 'bad' ? '#8A7B6E' : role === 'body' ? '#5E5046' : INK, ...o });
  },
  panel(K, b, p, s, kind, j = 0) {
    if (p <= 0) return; const ctx = K.ctx, col = kind === 'good' ? '#A9C8A8' : kind === 'bad' ? '#E4B9A4' : ['#F2D6A8', '#CFE0E4', '#E9CBBB', '#DCE4C8'][j % 4];
    const c = WASH(Math.round(b.w), Math.round(b.h), col, 11 + j + (kind === 'good' ? 50 : 0));
    ctx.save(); ctx.beginPath(); ctx.rect(b.x - 40, b.y - 40, (b.w + 80) * L.E.inOut(p), b.h + 80); ctx.clip(); ctx.drawImage(c, b.x - 40, b.y - 40); ctx.restore();
  },
  bullet(K, i, b, p) {
    if (p <= 0) return; const ctx = K.ctx, [cx, cy] = L.center(b), r = Math.min(b.w, b.h) / 2, n = 28, pts = [];
    const rr = L.rng(i * 7 + boil(K)); for (let k = 0; k <= n * L.E.out(p); k++) { const a = -1.9 + k / n * 6.5; pts.push([cx + Math.cos(a) * r * (0.95 + rr() * 0.08), cy + Math.sin(a) * r * (0.95 + rr() * 0.08)]); }
    if (pts.length > 1) L.inkPath(ctx, pts, { w: 3.2 * K.u, color: INK, seed: boil(K) + i });
    L.text(ctx, String(i + 1), cx, cy + r * 0.32, { font: K.S.type.hand(r * 1.1), color: '#9A4127', align: 'center', alpha: L.clamp(p * 2 - 0.5) });
  },
  number(K, str, box, p, s, o) { title(K, str, box, p, { align: 'center', color: o?.small ? '#9A4127' : TERRA, reveal: 'wipe', max: o?.small ? 130 : 300 }); },
  quote(K, str, box, p) { title(K, '“' + str + '”', box, p, { size: 'm', max: 100, color: INK, reveal: 'wipe' }); },
  portrait(K, box, p, s) {
    if (p <= 0) return; const { ctx } = K, f = fitCharacter({ ...box, h: box.h * 0.98 }), bt = boil(K);
    ctx.save(); ctx.globalAlpha = L.clamp(p * 1.6); ctx.translate(0, (1 - L.E.out(p)) * 50 * K.u);
    const glow = WASH(Math.round(box.w * 0.8), Math.round(box.h * 0.8), '#E2A77B', 31); ctx.drawImage(glow, box.x + box.w * 0.1 - 40, box.y + box.h * 0.08 - 40);
    const wf = L.washFill(ctx, 5, { alpha: 0.36, gran: 0.1 });
    L.character(ctx, f.x, f.y, f.s, K.look, { fill: (pth, c, n) => { ctx.fillStyle = '#F6EEDF'; ctx.fill(pth); wf(pth, c, n); }, stroke: L.wobbleStroke(ctx, INK, 4.5, f.s, bt), ink: INK, mood: s.d.mood === 'surprised' ? 'o' : 'smile', blink: (K.frame % 110) < 4 });
    ctx.restore();
  },
  mascot(K, box, p, s, mood) {
    if (p <= 0) return; const ctx = K.ctx, bt = boil(K); ctx.save(); ctx.globalAlpha = L.clamp(p * 2);
    L.mascot(ctx, K.spec.mascot, { ...box, y: box.y + (1 - L.E.back(p)) * 30 * K.u }, { fill: L.washFill(ctx, 8, { alpha: 0.38 }), stroke: L.wobbleStroke(ctx, INK, 5, 1, bt), color: K.P.mascot, ink: INK, eyeStyle: mood === 'happy' ? 'happy' : 'dot', bob: Math.sin(K.t * 3) * 3 * K.u });
    ctx.restore();
  },
  media(K, img, box, p, s, frame) { // taped onto the page, slightly rotated
    const { ctx, u } = K; if (p <= 0) return; const [cx, cy] = L.center(box); ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.025 + (1 - L.E.out(p)) * 0.08); ctx.translate(-cx, -cy);
    const o = drawFrame(K, img, box, p, frame, { bezel: '#2A2420', shadowColor: 'rgba(60,40,20,.3)' });
    ctx.globalAlpha = L.clamp(p * 2 - 1); ctx.fillStyle = 'rgba(232,205,150,.75)';
    for (const [x, y, a] of [[o.x + 20 * u, o.y + 6 * u, -0.5], [o.x + o.w - 20 * u, o.y + 6 * u, 0.45]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillRect(-55 * u, -16 * u, 110 * u, 32 * u); ctx.restore(); }
    ctx.restore();
  },
  prompt(K, str, box, p, s, tp) {
    if (p <= 0) return; const { ctx, u } = K; K.S.panel(K, box, p, s, 'note', 3);
    L.inkPath(ctx, [[box.x, box.y], [box.x + box.w, box.y], [box.x + box.w, box.y + box.h], [box.x, box.y + box.h]], { closed: true, w: 2.4 * u, color: INK, seed: boil(K) });
    para(K, '> ' + str.slice(0, Math.ceil(str.length * tp)) + (tp < 1 || (K.frame >> 3) % 2 ? '▍' : ''), L.inset(box, 22 * u, 14 * u), 1, { color: INK, max: 32, valign: 'middle' });
  },
  caption(K, words, act, box, p) {
    const { ctx, u } = K; ctx.save(); ctx.globalAlpha = p; ctx.font = K.S.type.bodyEm(34 * u);
    const w = ctx.measureText(words.join(' ')).width + 70 * u, x = box.x + (box.w - w) / 2;
    L.rrect(ctx, x, box.y, w, box.h, box.h / 2); ctx.fillStyle = 'rgba(36,29,24,.84)'; ctx.fill();
    let cx = x + 35 * u; words.forEach((wd, i) => { ctx.fillStyle = i <= act ? '#F6C98E' : 'rgba(255,255,255,.6)'; ctx.fillText(wd, cx, box.y + box.h * 0.66); cx += ctx.measureText(wd + ' ').width; });
    ctx.restore();
  },
  connector(K, a, b, p) { if (p <= 0) return; const m = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 30 * K.u], pts = []; for (let k = 0; k <= 20 * p; k++) { const t = k / 20; pts.push([(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * m[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * m[1] + t * t * b[1]]); } if (pts.length > 1) L.inkPath(K.ctx, pts, { w: 3 * K.u, color: INK, seed: boil(K) }); },
  button(K, str, b, p) { if (p <= 0) return; K.S.panel(K, b, p, null, 'good', 1); para(K, str, L.inset(b, b.h * 0.3, b.h * 0.18), L.clamp(p * 2 - 0.6), { font: sz => K.S.type.hand(sz), color: INK, max: 48, align: 'center' }); },
  transition(K, A, B, p, info) { // the next page bleeds in like wet paint from the centre
    const { ctx, W, H } = K, R = Math.hypot(W, H) * 0.62 * L.E.inOut(info.raw); ctx.drawImage(A, 0, 0);
    ctx.save(); ctx.beginPath(); blob.forEach(([x, y], i) => { const px = W * 0.5 + x * R, py = H * 0.5 + y * R; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath(); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(160,90,60,.25)'; ctx.lineWidth = 14; ctx.beginPath(); blob.forEach(([x, y], i) => { const px = W * 0.5 + x * R, py = H * 0.5 + y * R; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath(); ctx.stroke(); ctx.restore();
  },
  overlay(K) { const ctx = K.ctx; ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.35; ctx.drawImage(paperC, 0, 0); ctx.restore(); },
};
