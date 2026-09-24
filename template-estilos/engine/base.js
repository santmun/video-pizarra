// Default primitives. A style overrides any of these; it can call BASE.x(K, ...) or the helpers below.
import * as L from './lib.js';

// ---------- rich text layout: tokens [{w, em}] fitted into a box ----------
export function layoutRich(ctx, tokens, box, o) { ctx.save(); try { return layoutRich_(ctx, tokens, box, o); } finally { ctx.restore(); } }
function layoutRich_(ctx, tokens, box, { font, emFont = font, max = 180, min = 16, lh = 1.05, ls = 0, upper = false }) {
  const T = tokens.map(t => ({ ...t, w: upper ? t.w.toUpperCase() : t.w }));
  for (let size = max; ; size -= Math.max(1, size * 0.04)) {
    if (size < min) size = min;
    const f = font(size), ef = emFont(size); ctx.font = f; ctx.letterSpacing = ls * size + 'px'; const space = ctx.measureText(' ').width;
    const lines = []; let cur = [], cw = 0;
    for (const t of T) {
      if (t.w === '\n') { lines.push(cur); cur = []; cw = 0; continue; }
      ctx.font = t.em ? ef : f; ctx.letterSpacing = ls * size + 'px'; const wd = ctx.measureText(t.w).width;
      if (cur.length && cw + space + wd > box.w) { lines.push(cur); cur = []; cw = 0; }
      cur.push({ ...t, x: cw ? cw + space : 0, width: wd }); cw = (cw ? cw + space : 0) + wd;
    }
    if (cur.length) lines.push(cur);
    const widths = lines.map(l => l.length ? l[l.length - 1].x + l[l.length - 1].width : 0);
    if ((lines.length * size * lh <= box.h && Math.max(...widths) <= box.w) || size === min) return { size, lines, widths, lh: size * lh, font: f, emFont: ef, ls: ls * size };
  }
}
// draw a laid-out rich text with a reveal. opts: color, emColor, align, valign, reveal, emStyle, emBg, shadow, stroke
export function drawRich(K, R, box, p, o = {}) {
  const ctx = K.ctx, n = R.lines.length, total = n * R.lh;
  const y0 = o.valign === 'top' ? box.y : o.valign === 'bottom' ? box.y + box.h - total : box.y + (box.h - total) / 2;
  const reveal = o.reveal || 'rise', allChars = R.lines.reduce((a, l) => a + l.reduce((b, t) => b + t.w.length + 1, 0), 0);
  let charIdx = 0, wordIdx = 0; const nWords = R.lines.reduce((a, l) => a + l.length, 0);
  R.lines.forEach((line, i) => {
    const lw = R.widths[i], x0 = o.align === 'center' ? box.x + (box.w - lw) / 2 : o.align === 'right' ? box.x + box.w - lw : box.x;
    const base = y0 + i * R.lh + R.size * 0.82;
    let lp = reveal === 'rise' ? L.E.out(L.clamp(p * (n + 0.6) - i * 0.8)) : 1;
    ctx.save();
    if (reveal === 'rise') { ctx.beginPath(); ctx.rect(box.x - 40, y0 + i * R.lh - R.size * 0.1, box.w + 80, R.lh + R.size * 0.25); ctx.clip(); ctx.translate(0, (1 - lp) * R.lh * 1.1); }
    if (reveal === 'wipe') { ctx.beginPath(); ctx.rect(box.x - 20, 0, (box.w + 40) * L.E.inOut(L.clamp(p * 1.1 - i * 0.05)), K.H); ctx.clip(); }
    if (reveal === 'fade') ctx.globalAlpha = L.clamp(p * 1.4 - i * 0.2);
    for (const t of line) {
      let a = 1, sc = 1;
      if (reveal === 'words') { const wp = L.clamp(p * (nWords + 1) * 0.9 - wordIdx); a = L.clamp(wp * 2); sc = 0.85 + 0.15 * L.E.back(wp); }
      let txt = t.w;
      if (reveal === 'type') { const vis = Math.floor(p * allChars) - charIdx; txt = vis <= 0 ? '' : t.w.slice(0, vis); }
      charIdx += t.w.length + 1; wordIdx++;
      if (!txt) continue;
      const x = x0 + t.x;
      ctx.save(); ctx.globalAlpha *= a;
      if (sc !== 1) { ctx.translate(x + t.width / 2, base - R.size * 0.35); ctx.scale(sc, sc); ctx.translate(-(x + t.width / 2), -(base - R.size * 0.35)); }
      if (t.em && o.emStyle === 'highlight') { ctx.fillStyle = o.emBg || K.P.accent; ctx.fillRect(x - R.size * 0.08, base - R.size * 0.72, (t.width + R.size * 0.16) * L.clamp(lp * 1.2), R.size * 0.84); }
      if (t.em && o.emStyle === 'box') { ctx.fillStyle = o.emBg || K.P.accent; ctx.fillRect(x - R.size * 0.1, base - R.size * 0.82, t.width + R.size * 0.2, R.size * 1.0); }
      ctx.font = t.em ? R.emFont : R.font; ctx.letterSpacing = R.ls + 'px';
      ctx.fillStyle = t.em ? (o.emColor || K.P.accent) : (o.color || K.P.ink);
      if (o.shadow) { ctx.save(); ctx.fillStyle = o.shadow; ctx.fillText(txt, x + (o.shadowX ?? R.size * 0.04), base + (o.shadowY ?? R.size * 0.04)); ctx.restore(); }
      if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.strokeW || R.size * 0.08; ctx.lineJoin = 'round'; ctx.strokeText(txt, x, base); }
      ctx.fillText(txt, x, base);
      if (t.em && o.emStyle === 'underline') { ctx.fillStyle = o.emBg || K.P.accent; ctx.fillRect(x, base + R.size * 0.1, t.width * L.clamp(lp), R.size * 0.07); }
      ctx.restore();
    }
    ctx.restore();
  });
  ctx.letterSpacing = '0px';
  return { y0, total };
}
// convenience: rich headline in one call
export function title(K, str, box, p, o = {}) {
  const R = layoutRich(K.ctx, K.rich(str), box, { font: o.font || (sz => K.S.type.display(sz)), emFont: o.emFont || o.font || (sz => (K.S.type.em || K.S.type.display)(sz)), max: (o.max || (o.size === 'm' ? 120 : 190)) * K.u, min: 18 * K.u, lh: o.lh ?? K.S.lh ?? 1.02, ls: o.ls ?? K.S.ls ?? -0.02, upper: o.upper ?? K.S.upper });
  return drawRich(K, R, box, p, o);
}
export function para(K, str, box, p, o = {}) {
  const R = layoutRich(K.ctx, K.rich(str), box, { font: o.font || (sz => K.S.type.body(sz)), emFont: o.emFont || o.font || (sz => (K.S.type.bodyEm || K.S.type.body)(sz)), max: (o.max || 54) * K.u, min: 14 * K.u, lh: o.lh ?? 1.25, ls: o.ls ?? 0, upper: o.upper });
  return drawRich(K, R, box, p, { reveal: 'fade', valign: 'middle', ...o });
}
// fit an image (cover) inside a box, clipped by a path
export function cover(ctx, img, b) { const s = Math.max(b.w / img.width, b.h / img.height), w = img.width * s, h = img.height * s; ctx.drawImage(img, b.x + (b.w - w) / 2, b.y + (b.h - h) / 2 * 0.2, w, h); }
export function contain(img, b) { const s = Math.min(b.w / img.width, b.h / img.height); return { x: b.x + (b.w - img.width * s) / 2, y: b.y + (b.h - img.height * s) / 2, w: img.width * s, h: img.height * s }; }
// device frames. returns inner box
export function frameBox(img, b, frame) {
  if (frame === 'phone') { const h = b.h, w = Math.min(b.w, h * 0.49); return { outer: { x: b.x + (b.w - w) / 2, y: b.y, w, h }, r: w * 0.13, pad: w * 0.035 }; }
  if (frame === 'browser') { const r = contain({ width: img.width, height: img.height + img.width * 0.06 }, b); return { outer: r, r: 14, pad: 0, bar: r.w * 0.06 }; }
  const r = contain(img, b); return { outer: r, r: 16, pad: 0 };
}
export function drawFrame(K, img, b, p, frame, o = {}) {
  const ctx = K.ctx, F = frameBox(img, b, frame), O = F.outer;
  ctx.save();
  const e = L.E.out(p); ctx.globalAlpha = L.clamp(p * 2); ctx.translate(0, (1 - e) * 60 * K.u);
  if (o.shadow !== false) { ctx.shadowColor = o.shadowColor || 'rgba(0,0,0,.35)'; ctx.shadowBlur = 40 * K.u; ctx.shadowOffsetY = 18 * K.u; }
  L.rrect(ctx, O.x, O.y, O.w, O.h, F.r); ctx.fillStyle = frame === 'phone' ? (o.bezel || '#111') : (o.card || '#fff'); ctx.fill(); ctx.shadowColor = 'transparent';
  if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.strokeW || 3; ctx.stroke(); }
  let inner = { x: O.x + F.pad, y: O.y + F.pad, w: O.w - F.pad * 2, h: O.h - F.pad * 2 };
  if (F.bar) { ctx.fillStyle = o.barColor || '#E9E9EC'; L.rrect(ctx, O.x, O.y, O.w, F.bar, [F.r, F.r, 0, 0]); ctx.fill(); ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(O.x + F.bar * (0.6 + i * 0.5), O.y + F.bar / 2, F.bar * 0.16, 0, 7); ctx.fill(); }); inner = { x: O.x, y: O.y + F.bar, w: O.w, h: O.h - F.bar }; }
  ctx.save(); L.rrect(ctx, inner.x, inner.y, inner.w, inner.h, frame === 'phone' ? F.r * 0.75 : F.bar ? [0, 0, F.r, F.r] : F.r); ctx.clip();
  if (frame === 'phone') cover(ctx, img, inner); else ctx.drawImage(img, inner.x, inner.y, inner.w, inner.h);
  if (o.filter) o.filter(ctx, inner);
  ctx.restore(); ctx.restore();
  return O;
}
// person pixels fitted to a box (bottom-center). returns {x,y,w,h,subj}
export function fitSubject(K, box, scale = 1) {
  const subj = K.subject(box.h * scale), w = subj.w, h = subj.h;
  return { x: box.x + (box.w - w) / 2, y: box.y + box.h - h, w, h, subj };
}
// character (vector) fitted to box
export function fitCharacter(box) { const B = L.CHAR_BOX, s = Math.min(box.w / B.w, box.h / B.h) ; return { s, x: box.x + box.w / 2 - (B.x + B.w / 2) * s, y: box.y + box.h - (B.y + B.h) * s }; }

export const BASE = {
  id: 'base', name: 'Base', fonts: 'Inter:wght@500;700;900&family=JetBrains+Mono:wght@500', fontLoads: ['900 40px Inter', '500 40px Inter', '700 40px Inter', '500 40px "JetBrains Mono"'],
  palette: { bg: '#F4F2EE', ink: '#16161A', accent: '#E4572E', accent2: '#2E6BE4', muted: '#6B6B75', panel: '#FFFFFF', line: 'rgba(0,0,0,.12)', good: '#2E9E5B', bad: '#C8453B' },
  type: { display: s => `900 ${s}px Inter`, body: s => `500 ${s}px Inter`, bodyEm: s => `700 ${s}px Inter`, mono: s => `500 ${s}px "JetBrains Mono"`, label: s => `700 ${s}px Inter` },
  sfx: 'soft', music: 'minimal modern electronic, warm synth plucks, soft kick, 110 BPM, instrumental, clean, optimistic',
  transDur: 0.5,
  background(K) { K.ctx.fillStyle = K.P.bg; K.ctx.fillRect(0, 0, K.W, K.H); },
  decor() {}, overlay() {},
  headline(K, str, box, p, s, o = {}) { title(K, str, box, p, { align: o.align, size: o.size, emStyle: 'color' }); },
  text(K, str, box, p, role, s, o = {}) {
    const P = K.P, map = {
      kicker: { font: sz => K.S.type.label(sz), color: P.accent, max: 34, upper: true, ls: 0.08 },
      body: { color: P.muted, max: 50 }, label: { color: P.muted, max: 34 },
      item: { color: P.ink, max: 52 }, step: { color: P.ink, max: 40 },
      headGood: { font: sz => K.S.type.display(sz), color: P.good, max: 64 }, headBad: { font: sz => K.S.type.display(sz), color: P.bad, max: 64 },
      good: { color: P.ink, max: 40 }, bad: { color: P.muted, max: 40 },
    }[role] || {};
    para(K, str, box, p, { align: o.align || 'left', ...map, ...o });
  },
  panel(K, b, p, s, kind) {
    const ctx = K.ctx; ctx.save(); ctx.globalAlpha = L.clamp(p * 1.5); const e = L.E.out(p);
    ctx.translate(0, (1 - e) * 30 * K.u); ctx.shadowColor = 'rgba(0,0,0,.08)'; ctx.shadowBlur = 24 * K.u; ctx.shadowOffsetY = 8 * K.u;
    L.rrect(ctx, b.x, b.y, b.w, b.h, 18 * K.u); ctx.fillStyle = kind === 'bad' ? L.mix(K.P.panel, K.P.bad, 0.06) : kind === 'good' ? L.mix(K.P.panel, K.P.good, 0.08) : K.P.panel; ctx.fill(); ctx.restore();
  },
  bullet(K, i, b, p) {
    const ctx = K.ctx, [cx, cy] = L.center(b), r = Math.min(b.w, b.h) / 2 * L.E.back(p);
    if (r <= 0) return; ctx.fillStyle = K.P.accent; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    L.text(ctx, String(i + 1), cx, cy + r * 0.05, { font: K.S.type.label(r * 1.05), color: K.P.panel, align: 'center', base: 'middle' });
  },
  number(K, str, box, p, s, o = {}) { title(K, str, box, p, { align: 'center', color: K.P.accent, reveal: 'fade', max: o.small ? 120 : 300 }); },
  quote(K, str, box, p, s) { title(K, '“' + str + '”', box, p, { align: 'left', size: 'm', font: sz => K.S.type.em ? K.S.type.em(sz) : K.S.type.display(sz), reveal: 'words' }); },
  portrait(K, box, p, s) {
    const f = fitSubject(K, box), ctx = K.ctx, e = L.E.out(p);
    ctx.save(); ctx.globalAlpha = L.clamp(p * 1.6); ctx.drawImage(f.subj.c, f.x, f.y + (1 - e) * 80 * K.u); ctx.restore();
  },
  mascot(K, box, p, s, mood) {
    if (p <= 0) return; const ctx = K.ctx, [cx, cy] = [box.x + box.w / 2, box.y + box.h];
    ctx.save(); ctx.translate(cx, cy); ctx.scale(p, p); ctx.translate(-cx, -cy);
    L.mascot(ctx, K.spec.mascot, box, { color: K.P.mascot, ink: K.P.ink, eyeStyle: mood === 'happy' ? 'happy' : 'dot', bob: Math.sin(K.t * 4) * 4 * K.u });
    ctx.restore();
  },
  media(K, img, box, p, s, frame) { drawFrame(K, img, box, p, frame); },
  prompt(K, str, box, p, s, tp) {
    const ctx = K.ctx; if (p <= 0) return; ctx.save(); ctx.globalAlpha = L.clamp(p * 1.5);
    L.rrect(ctx, box.x, box.y, box.w, box.h, 16 * K.u); ctx.fillStyle = K.P.panel; ctx.fill(); ctx.strokeStyle = K.P.line; ctx.lineWidth = 2; ctx.stroke();
    const vis = str.slice(0, Math.floor(str.length * tp)), f = L.fit(ctx, str, sz => K.S.type.mono(sz), L.inset(box, box.h * 0.22, box.h * 0.18), { max: 34 * K.u, lh: 1.25 });
    ctx.font = f.font; ctx.fillStyle = K.P.ink; let n = 0; const ib = L.inset(box, box.h * 0.22, box.h * 0.18);
    f.lines.forEach((ln, i) => { const part = vis.slice(n, n + ln.length); n += ln.length + 1; ctx.fillText(part, ib.x, ib.y + f.size + i * f.lh); if (part.length < ln.length || i === f.lines.length - 1) { if ((K.frame >> 3) % 2 === 0 || tp < 1) { const cw = ctx.measureText(part).width; ctx.fillStyle = K.P.accent; ctx.fillRect(ib.x + cw + 4, ib.y + f.size * 0.15 + i * f.lh, f.size * 0.5, f.size * 1.0); ctx.fillStyle = K.P.ink; } } });
    ctx.restore();
  },
  caption(K, words, act, box, p) {
    const ctx = K.ctx; ctx.save(); ctx.globalAlpha = p; ctx.font = K.S.type.label(34 * K.u);
    const full = words.join(' '), w = Math.min(box.w, ctx.measureText(full).width + 70 * K.u), x = box.x + (box.w - w) / 2;
    L.rrect(ctx, x, box.y, w, box.h, box.h / 2); ctx.fillStyle = 'rgba(15,15,20,.78)'; ctx.fill();
    let cx = x + 35 * K.u; words.forEach((wd, i) => { ctx.fillStyle = i === act ? '#FFD166' : i < act ? '#fff' : 'rgba(255,255,255,.55)'; ctx.fillText(wd, cx, box.y + box.h * 0.66); cx += ctx.measureText(wd + ' ').width; });
    ctx.restore();
  },
  connector(K, a, b, p) { const ctx = K.ctx; if (p <= 0) return; ctx.save(); ctx.strokeStyle = K.P.muted; ctx.lineWidth = 4 * K.u; ctx.setLineDash([10 * K.u, 10 * K.u]); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p); ctx.stroke(); ctx.restore(); },
  button(K, str, b, p) {
    const ctx = K.ctx; if (p <= 0) return; const [cx, cy] = L.center(b); ctx.save(); ctx.translate(cx, cy); ctx.scale(p, p); ctx.translate(-cx, -cy);
    L.rrect(ctx, b.x, b.y, b.w, b.h, b.h / 2); ctx.fillStyle = K.P.accent; ctx.fill();
    const f = L.fit(ctx, str, sz => K.S.type.label(sz), L.inset(b, b.h * 0.4, b.h * 0.22), { max: 40 * K.u }); ctx.font = f.font; ctx.fillStyle = K.P.panel; ctx.textAlign = 'center'; ctx.fillText(f.lines[0], cx, cy + f.size * 0.35); ctx.restore();
  },
  transition(K, A, B, p) { // push: old slides left, new comes from the right
    const ctx = K.ctx; ctx.drawImage(A, -p * K.W * 0.35, 0); ctx.globalAlpha = 1; ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 40; ctx.drawImage(B, (1 - p) * K.W, 0); ctx.restore();
  },
};
