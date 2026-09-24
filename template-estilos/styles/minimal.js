// Minimal blanco premium — aire, tipografía fina y enorme, sombras suaves, un solo acento; todo entra lento y preciso.
import * as L from '../engine/lib.js';
import { BASE, title, para, drawFrame } from '../engine/base.js';

// chrome: header/footer labels (scene numbers, rules, HUDs). Off with `chrome: false` in the video spec.
const CH = K => K.spec.chrome !== false;

const BG = '#FAFAF7', INK = '#161616', MUTED = '#8C8C88', LINE = 'rgba(22,22,22,.10)';
let ACC = '#FF4F00'; // background() lo cambia por el color de marca si el video trae palette.accent
const SLOW = t => 1 - Math.pow(1 - t, 4); // precise, long-tail ease
// soft-shadowed cutout, pre-rendered per height
const SHADOWED = L.memo(h => {
  const S = window.K.subject(h), pad = 90, c = L.canvas(S.w + pad * 2, S.h + pad), x = c.getContext('2d');
  x.shadowColor = 'rgba(20,20,20,.16)'; x.shadowBlur = 60; x.shadowOffsetX = 18; x.shadowOffsetY = 24;
  x.drawImage(L.mapPixels(S, (r, g, b, a, px, py) => [r, g, b, a * L.clamp((S.h - py) / (S.h * 0.1))]), pad, pad * 0.5);
  return { c, pad };
});

export default {
  id: 'minimal', name: 'Minimal blanco',
  fonts: 'Inter+Tight:wght@200;300;400;600&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400',
  fontLoads: ['200 60px "Inter Tight"', '300 60px "Inter Tight"', '400 60px "Inter Tight"', '600 60px "Inter Tight"', '400 30px Inter', '500 30px Inter', '400 20px "JetBrains Mono"'],
  palette: { bg: BG, ink: INK, accent: ACC, muted: MUTED, panel: '#FFFFFF', line: LINE, good: INK, bad: MUTED, mascot: INK },
  type: { display: s => `300 ${s}px "Inter Tight"`, em: s => `400 ${s}px "Inter Tight"`, body: s => `400 ${s}px Inter`, bodyEm: s => `500 ${s}px Inter`, label: s => `500 ${s}px Inter`, mono: s => `400 ${s}px "JetBrains Mono"`, thin: s => `200 ${s}px "Inter Tight"`, semi: s => `600 ${s}px "Inter Tight"` },
  ls: -0.04, lh: 1.0,
  sfx: 'soft', transDur: 0.7, push: 0.015,
  music: 'minimal modern piano and soft electronic textures, sparse, elegant, calm confidence, gentle pulse, 92 BPM, instrumental, luxury brand film',
  background(K, s) {
    ACC = K.P.accent;
    const { ctx, W, H, u } = K; ctx.fillStyle = (K.spec.palette || {}).bg || BG; ctx.fillRect(0, 0, W, H);
    // one hairline + a quiet index — the only ornaments
    if (CH(K)) {
const m = 80 * u, y = K.vertical ? 100 * u : 70 * u, lp = SLOW(L.clamp(s.t / 1.2));
    ctx.fillStyle = LINE; ctx.fillRect(m, y, (W - 2 * m) * lp, 1);
    L.text(ctx, String(s.i + 1).padStart(2, '0'), m, y - 18 * u, { font: K.S.type.mono(16 * u), color: MUTED, alpha: lp });
    ctx.fillStyle = ACC; ctx.beginPath(); ctx.arc(W - m - 4 * u, y - 24 * u, 4 * u * lp, 0, 7); ctx.fill();
    }
  },
  headline(K, str, box, p, s, o = {}) {
    const top = (K.vertical ? 130 : 100) * K.u; if (box.y < top) box = { ...box, y: top, h: box.h - (top - box.y) };
    title(K, str, box, SLOW(p), { align: o.align, size: o.size, color: INK, emColor: ACC, reveal: 'rise', valign: 'middle', max: o.size === 'm' ? 110 : 200 });
  },
  text(K, str, box, p, role, s, o = {}) {
    const top = (K.vertical ? 130 : 100) * K.u; if (box.y < top) box = { ...box, y: top, h: box.h - (top - box.y) };
    if (role === 'kicker' || role === 'label') return para(K, str, box, p, { font: sz => K.S.type.label(sz), color: role === 'kicker' ? ACC : MUTED, upper: role === 'kicker', ls: role === 'kicker' ? 0.18 : 0, max: role === 'kicker' ? 20 : 28, align: o.align || 'left' });
    if (role === 'headBad' || role === 'headGood') return title(K, str, box, p, { color: role === 'headGood' ? INK : MUTED, max: 60, reveal: 'rise', font: sz => K.S.type.semi(sz) });
    return BASE.text(K, str, box, p, role, s, { color: role === 'bad' ? '#A6A6A2' : role === 'body' ? '#6E6E6A' : INK, font: role === 'item' || role === 'step' ? (sz => K.S.type.display(sz)) : undefined, max: role === 'item' ? 56 : role === 'step' ? 44 : 44, ...o });
  },
  panel(K, b, p, s, kind) {
    if (p <= 0) return; const { ctx, u } = K, e = SLOW(p);
    if (kind === 'row') { ctx.fillStyle = LINE; ctx.fillRect(b.x, b.y + b.h, b.w * e, 1); return; }
    ctx.save(); ctx.globalAlpha = L.clamp(p * 1.5); ctx.translate(0, (1 - e) * 16 * u);
    ctx.shadowColor = 'rgba(20,20,20,.07)'; ctx.shadowBlur = 50 * u; ctx.shadowOffsetY = 18 * u; L.rrect(ctx, b.x, b.y, b.w, b.h, 28 * u); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.shadowColor = 'transparent'; if (kind === 'good') { ctx.fillStyle = ACC; ctx.beginPath(); ctx.arc(b.x + b.w - 34 * u, b.y + 34 * u, 6 * u, 0, 7); ctx.fill(); }
    ctx.restore();
  },
  bullet(K, i, b, p) { if (p <= 0) return; para(K, String(i + 1).padStart(2, '0'), b, SLOW(p), { font: sz => K.S.type.mono(sz), color: ACC, max: b.h * 0.42 / K.u, align: 'center' }); },
  number(K, str, box, p, s, o) { title(K, str, box, SLOW(p), { align: 'center', color: o?.small ? ACC : INK, emColor: ACC, reveal: 'rise', max: o?.small ? 110 : 320, font: sz => K.S.type.thin(sz), ls: -0.05 }); },
  quote(K, str, box, p) { title(K, '“' + str + '”', box, p, { size: 'm', max: 90, color: INK, reveal: 'words', font: sz => K.S.type.thin(sz), lh: 1.08 }); },
  portrait(K, box, p, s) {
    if (p <= 0) return; const { ctx, u } = K, R = SHADOWED(Math.round(box.h * 0.95)), e = SLOW(p);
    ctx.save(); ctx.globalAlpha = L.clamp(p * 1.3); ctx.drawImage(R.c, box.x + (box.w - R.c.width) / 2 + (1 - e) * 40 * u, box.y + box.h - R.c.height + R.pad * 0.5); ctx.restore();
  },
  mascot(K, box, p, s, mood) {
    if (p <= 0) return; const { ctx, u } = K; ctx.save(); ctx.globalAlpha = L.clamp(p * 1.6); ctx.shadowColor = 'rgba(0,0,0,.12)'; ctx.shadowBlur = 24 * u; ctx.shadowOffsetY = 10 * u;
    L.mascot(ctx, K.spec.mascot, { ...box, y: box.y + (1 - SLOW(p)) * 20 * u }, { color: INK, outline: false, eye: '#FFFFFF', eyeStyle: mood === 'happy' ? 'happy' : 'dot', bob: Math.sin(K.t * 1.8) * 3 * u });
    ctx.restore();
  },
  media(K, img, box, p, s, frame) { drawFrame(K, img, box, SLOW(p), frame, { bezel: '#161616', shadowColor: 'rgba(20,20,20,.14)', barColor: '#F1F1EE' }); },
  prompt(K, str, box, p, s, tp) {
    if (p <= 0) return; const { ctx, u } = K, e = SLOW(p);
    ctx.fillStyle = INK; ctx.fillRect(box.x, box.y + box.h - 1, box.w * e, 1.5 * u);
    L.text(ctx, 'Prompt', box.x, box.y + 22 * u, { font: K.S.type.label(18 * u), color: MUTED, alpha: e });
    para(K, str.slice(0, Math.ceil(str.length * tp)) + (tp < 1 || (K.frame >> 3) % 2 ? '|' : ''), { x: box.x, y: box.y + 30 * u, w: box.w, h: box.h - 40 * u }, 1, { font: sz => K.S.type.display(sz), color: INK, max: 40, valign: 'middle' });
  },
  caption(K, words, act, box, p) { // quiet: text only, active word in accent
    const { ctx, u } = K; ctx.save(); ctx.globalAlpha = p; ctx.font = K.S.type.bodyEm(32 * u);
    const w = ctx.measureText(words.join(' ')).width; let cx = box.x + (box.w - w) / 2;
    ctx.fillStyle = 'rgba(250,250,247,.85)'; L.rrect(ctx, cx - 24 * u, box.y + box.h * 0.1, w + 48 * u, box.h * 0.8, 10 * u); ctx.fill();
    words.forEach((wd, i) => { ctx.fillStyle = i === act ? ACC : i < act ? INK : '#B4B4B0'; ctx.fillText(wd, cx, box.y + box.h * 0.63); cx += ctx.measureText(wd + ' ').width; });
    ctx.restore();
  },
  connector(K, a, b, p) { if (p <= 0) return; const ctx = K.ctx; ctx.save(); ctx.strokeStyle = 'rgba(22,22,22,.25)'; ctx.lineWidth = 1.2 * K.u; ctx.beginPath(); ctx.moveTo(...a); const e = SLOW(p); ctx.lineTo(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e); ctx.stroke(); ctx.restore(); },
  button(K, str, b, p) {
    if (p <= 0) return; const { ctx, u } = K, e = SLOW(p); ctx.save(); ctx.globalAlpha = L.clamp(p * 1.5);
    L.rrect(ctx, b.x, b.y, b.w, b.h, b.h / 2); ctx.fillStyle = INK; ctx.fill(); ctx.restore();
    para(K, str, L.inset(b, b.h * 0.4, b.h * 0.22), e, { font: sz => K.S.type.label(sz), color: '#FFFFFF', max: 30, align: 'center' });
  },
  transition(K, A, B, p, info) { // crossfade + short, parallel drift
    const { ctx, W, H, u } = K, r = SLOW(info.raw), d = (K.vertical ? 0 : 60) * u, dy = K.vertical ? 60 * u : 0;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 1 - L.clamp(info.raw * 1.6); ctx.drawImage(A, -d * r, -dy * r); ctx.restore();
    ctx.save(); ctx.globalAlpha = L.clamp(info.raw * 1.5 - 0.3); ctx.drawImage(B, d * (1 - r), dy * (1 - r)); ctx.restore();
  },
};
