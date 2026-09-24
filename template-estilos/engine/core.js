// Core: timeline → scene layouts → style primitives. Everything is a pure function of time (renderAt(t)).
import * as L from './lib.js';
import { BASE } from './base.js';

// mods: { styleId: module } — a video can mix styles (scene.style overrides spec.style)
export async function boot(spec, mods) {
  if (mods.id) mods = { [mods.id]: mods };
  const vertical = spec.format === '9:16';
  const W = vertical ? 1080 : 1920, H = vertical ? 1920 : 1080;
  const SS = {};
  for (const [id, mod] of Object.entries(mods)) {
    const st = Object.assign({}, BASE, mod);
    st.palette = Object.assign({}, BASE.palette, mod.palette || {}, spec.palette || {});
    st.type = Object.assign({}, BASE.type, mod.type || {});
    SS[id] = st;
  }
  const mainId = spec.style in SS ? spec.style : Object.keys(SS)[0];
  let S = SS[mainId];
  const use = id => { S = SS[id] || SS[mainId]; K.S = S; K.P = S.palette; };

  // fonts (every style in the video)
  for (const st of Object.values(SS)) if (st.fonts) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = `https://fonts.googleapis.com/css2?family=${st.fonts}&display=block`; document.head.appendChild(l); await new Promise(r => { l.onload = r; l.onerror = r; }); }
  await Promise.all(Object.values(SS).flatMap(st => (st.fontLoads || []).map(f => document.fonts.load(f).catch(() => {}))));
  await document.fonts.ready;

  const main = L.canvas(W, H); main.id = 'stage'; document.body.style.margin = 0; document.body.style.background = '#000'; document.body.appendChild(main);
  const mctx = main.getContext('2d');
  const bufA = L.canvas(W, H), bufB = L.canvas(W, H), camA = L.canvas(W, H), camB = L.canvas(W, H);

  // images used by scenes
  const images = {};
  for (const sc of spec.scenes) for (const src of [sc.src, sc.image].filter(Boolean)) if (!images[src]) images[src] = await L.loadImg(src).catch(() => null);
  const person = spec.person === false ? null : Object.assign({ look: {} }, spec.person || {});
  const photo = person?.photo ? await L.loadImg(person.photo).catch(() => null) : null;

  // beats (optional)
  let beats = null;
  if (spec.beats) try { const r = await fetch(spec.beats); if (r.ok) beats = await r.json(); } catch {}

  const K = {
    W, H, vertical, u: Math.min(W, H) / 1080, spec, S, P: S.palette, L, images, person, photo, beats, base: BASE,
    ctx: mctx, t: 0, frame: 0, fps: spec.fps || 30,
    look: Object.assign({}, L.CHAR_DEFAULT, person?.look || {}),
    cues: [], recording: false,
    cue(name, at, extra = {}) { if (this.recording) this.cues.push({ name, t: this._sceneStart + at, sfx: this.S.sfx, ...extra }); },
    // content boxes live above the caption band; boxFull ignores it (portraits, full-bleed things)
    cap: spec.captions === false ? 1 : (vertical ? 0.78 : 0.84),
    box(x, y, w, h) { const c = this.cap, t = S.safeTop || 0, k = c - t; return { x: x * W, y: (t + y * k) * H, w: w * W, h: h * H * k }; },
    boxFull(x, y, w, h) { return { x: x * W, y: y * H, w: w * W, h: h * H }; },
    font(role, size) { return S.type[role](size * this.u); },
    // --- the person as pixels (photo cutout or the drawn character), cached by height ---
    _subj: {},
    subject(h) {
      h = Math.round(h); if (this._subj[h]) return this._subj[h];
      let c;
      if (photo) {
        const w = Math.round(photo.width * h / photo.height); c = L.canvas(w, h); const x = c.getContext('2d'); x.drawImage(photo, 0, 0, w, h);
        const d = x.getImageData(0, 0, w, h); for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] < 200 ? 0 : d.data[i]; x.putImageData(d, 0, 0);
      } else {
        const B = L.CHAR_BOX, s = h / B.h; c = L.canvas(Math.round(B.w * s), h); const x = c.getContext('2d');
        L.character(x, -B.x * s, -B.y * s, s, this.look, { ink: '#1d1a16' });
      }
      const x = c.getContext('2d'), data = x.getImageData(0, 0, c.width, c.height).data;
      const o = { c, w: c.width, h: c.height, data }; Object.assign(o, L.lumBuf(o));
      return (this._subj[h] = o);
    },
    // rich text: *word* = emphasis
    rich(str) { const out = []; let em = false; for (const part of String(str).split(/(\*)/)) { if (part === '*') { em = !em; continue; } for (const w of part.split(/(\n)|[ \t]+/)) if (w) out.push({ w, em }); } return out; },
  };
  window.K = K;
  for (const id of Object.keys(SS)) { use(id); if (S.setup) await S.setup(K); }
  use(mainId);

  // ---------- timeline ----------
  let acc = 0;
  const scenes = spec.scenes.map((d, i) => { const sid = d.style in SS ? d.style : mainId, sc = { d, i, sid, type: d.type, dur: d.dur || 4, start: acc, tr: SS[sid].transDur ?? 0.5 }; acc += sc.dur; return sc; });
  if (beats && spec.beatSnap !== false && beats.beats?.length) {
    // nudge each cut onto the nearest strong-ish beat within ±0.25 s
    const bt = beats.beats, st = beats.strength || bt.map(() => 1), thr = [...st].sort((a, b) => a - b)[Math.floor(st.length * 0.5)];
    let shift = 0;
    for (const sc of scenes) {
      sc.start += shift; if (sc.i === 0) continue;
      let best = null; bt.forEach((b, j) => { if (st[j] >= thr && Math.abs(b - sc.start) <= 0.25 && (best === null || Math.abs(b - sc.start) < Math.abs(best - sc.start))) best = b; });
      if (best !== null) { const d = best - sc.start; shift += d; sc.start = best; scenes[sc.i - 1].dur += d; }
    }
    acc = scenes[scenes.length - 1].start + scenes[scenes.length - 1].dur;
  }
  const DURATION = acc;

  // ---------- captions: words with times ----------
  let words = spec.words || null; // [{w, s, e}] from a VO transcription (global seconds), or a path to words.json
  if (typeof words === 'string') words = await fetch(words).then(r => r.json()).catch(() => null);
  if (!words) {
    words = [];
    for (const sc of scenes) {
      if (!sc.d.say) continue;
      const ws = sc.d.say.split(/\s+/).filter(Boolean), a = sc.start + 0.25, b = sc.start + sc.dur - 0.25, tot = ws.reduce((n, w) => n + w.length + 2, 0);
      let x = a; for (const w of ws) { const d = (b - a) * (w.length + 2) / tot; words.push({ w, s: x, e: x + d }); x += d; }
    }
  }
  const lines = []; // group into caption lines (≤ 38 chars / sentence breaks / pauses)
  { let cur = []; const push = () => { if (cur.length) lines.push(cur); cur = []; };
    words.forEach((w, j) => { const len = cur.reduce((n, x) => n + x.w.length + 1, 0); if (cur.length && (len + w.w.length > (vertical ? 26 : 40) || w.s - cur[cur.length - 1].e > 0.6)) push(); cur.push(w); if (/[.!?…]$/.test(w.w)) push(); }); push(); }

  // ---------- scene rendering ----------
  function renderScene(sc, local, ctx) {
    use(sc.sid); K.ctx = ctx; ctx.save(); ctx.clearRect(0, 0, W, H);
    const s = { i: sc.i, type: sc.type, d: sc.d, t: local, dur: sc.dur, p: L.clamp(local / sc.dur), variant: sc.i, K };
    S.background(K, s);
    (LAYOUTS[sc.type] || LAYOUTS.statement)(K, s);
    S.decor(K, s);
    ctx.restore();
  }
  function camera(ctx, src, sc, local) {
    use(sc.sid); let z = 1, dx = 0, dy = 0;
    if (S.camera !== false) {
      z = 1 + (S.push ?? 0.03) * L.E.inOut(L.clamp(local / sc.dur));
      if (beats?.beats) { // small bump on strong beats
        const t = sc.start + local; let bump = 0;
        beats.beats.forEach((b, j) => { const st = (beats.strength?.[j] ?? 1); if (t >= b && t < b + 0.25 && st > 1.2) bump = Math.max(bump, (1 - (t - b) / 0.25) * 0.006 * (S.beatBump ?? 1)); });
        z += bump;
      }
    }
    ctx.drawImage(src, (W - W * z) / 2 + dx, (H - H * z) / 2 + dy, W * z, H * z);
  }

  function renderAt(t) {
    K.t = t; K.frame = Math.round(t * K.fps);
    let i = scenes.findIndex(sc => t >= sc.start && t < sc.start + sc.dur); if (i < 0) i = scenes.length - 1;
    const sc = scenes[i], local = t - sc.start;
    use(sc.sid); mctx.save(); mctx.fillStyle = S.palette.bg; mctx.fillRect(0, 0, W, H);
    if (i > 0 && local < sc.tr) {
      const prev = scenes[i - 1];
      renderScene(prev, prev.dur + local, bufA.getContext('2d'));
      renderScene(sc, local, bufB.getContext('2d'));
      const A = camA, B = camB, ax = A.getContext('2d'), bx = B.getContext('2d'); // camera-applied copies
      ax.clearRect(0, 0, W, H); bx.clearRect(0, 0, W, H); camera(ax, bufA, prev, prev.dur); camera(bx, bufB, sc, local);
      use(sc.sid); K.ctx = mctx; S.transition(K, A, B, L.E.inOut(local / sc.tr), { from: prev, to: sc, raw: local / sc.tr });
    } else {
      renderScene(sc, local, bufB.getContext('2d'));
      camera(mctx, bufB, sc, local);
    }
    // captions
    use(sc.sid); K.ctx = mctx;
    if (spec.captions !== false) {
      const ln = lines.find(l => t >= l[0].s - 0.05 && t <= l[l.length - 1].e + 0.35);
      if (ln) { const act = ln.findIndex(w => t >= w.s && t < w.e); const box = vertical ? K.boxFull(0.06, 0.82, 0.88, 0.06) : K.boxFull(0.14, 0.87, 0.72, 0.08); S.caption(K, ln.map(w => w.w), act < 0 ? (t > ln[ln.length - 1].e ? ln.length : -1) : act, box, L.clamp((t - ln[0].s + 0.05) / 0.2)); }
    }
    S.overlay(K, { t });
    mctx.restore();
  }

  // ---------- dry pass: collect sound cues ----------
  const dry = L.canvas(W, H).getContext('2d');
  K.recording = true;
  for (const sc of scenes) { K._sceneStart = sc.start; if (sc.i > 0) { use(sc.sid); K.cue('trans', 0, { style: S.id }); } renderScene(sc, 0.001, dry); }
  K.recording = false;
  const SFX = K.cues.sort((a, b) => a.t - b.t);

  Object.assign(window, { renderAt, DURATION, SFX, VW: W, VH: H, SCENES: scenes.map(s => ({ type: s.type, start: s.start, dur: s.dur, style: s.sid })), STYLE: { id: SS[mainId].id, name: SS[mainId].name, sfx: SS[mainId].sfx, music: SS[mainId].music, mixed: Object.keys(SS).length > 1 } });
  renderAt(Number(new URLSearchParams(location.search).get('t') || 0.9));
  window.READY = true;
}

// ---------- layouts: where things go and when; the style decides how they look ----------
const A = (s, start, dur = 0.6, ease) => Math.max(0, L.prog(s.t, start, dur, ease));
function portraitAndMascot(K, s, por, mas, t0 = 0) {
  if (K.person && s.d.person !== false && por) { K.cue('whoosh', t0); K.S.portrait(K, por, A(s, t0, 0.8), s); }
  if (K.spec.mascot && K.spec.mascot !== 'none' && s.d.mascot !== false && mas) { K.cue('pop', t0 + 0.9); K.S.mascot(K, mas, A(s, t0 + 0.9, 0.5, L.E.back), s, s.d.mood || 'happy'); }
}
export const LAYOUTS = {
  hook(K, s) {
    const V = K.vertical, d = s.d, hasP = K.person && d.person !== false;
    const title = V ? K.box(0.07, 0.06, 0.86, 0.25) : K.box(0.05, 0.09, hasP ? 0.5 : 0.9, 0.44);
    const kick = V ? K.box(0.07, 0.32, 0.86, 0.04) : K.box(0.05, 0.55, 0.5, 0.06);
    const prm = V ? K.box(0.07, 0.375, 0.86, 0.075) : K.box(0.05, 0.67, 0.4, 0.13);
    const por = V ? K.boxFull(0.04, 0.47, 0.92, 0.53) : K.boxFull(0.56, 0.04, 0.43, 0.96);
    const mas = V ? K.box(0.66, 0.66, 0.28, 0.12) : K.box(0.455, 0.64, 0.1, 0.17);
    portraitAndMascot(K, s, hasP ? por : null, mas, 0.05);
    if (d.prompt) { K.cue('type', 0.35, { dur: 1.1 }); K.S.prompt(K, d.prompt, prm, A(s, 0.25, 0.4), s, L.clamp((s.t - 0.35) / 1.1)); }
    K.cue('title', 0.2); K.S.headline(K, d.title, title, A(s, 0.2, 0.8), s, { align: 'left' });
    if (d.kicker) { K.cue('enter', 0.8); K.S.text(K, d.kicker, kick, A(s, 0.8), 'kicker', s); }
  },
  statement(K, s) {
    const V = K.vertical, d = s.d;
    const title = V ? K.box(0.08, 0.22, 0.84, 0.36) : K.box(0.08, 0.16, 0.84, 0.48);
    const sub = V ? K.box(0.1, 0.6, 0.8, 0.1) : K.box(0.14, 0.67, 0.72, 0.12);
    const kick = V ? K.box(0.08, 0.16, 0.84, 0.04) : K.box(0.08, 0.09, 0.84, 0.06);
    if (d.kicker) K.S.text(K, d.kicker, kick, A(s, 0.1), 'kicker', s, { align: 'center' });
    K.cue('title', 0.15); K.S.headline(K, d.title, title, A(s, 0.15, 0.8), s, { align: 'center' });
    if (d.sub) { K.cue('enter', 0.8); K.S.text(K, d.sub, sub, A(s, 0.8), 'body', s, { align: 'center' }); }
    if (d.mascot) K.S.mascot(K, V ? K.box(0.36, 0.73, 0.28, 0.13) : K.box(0.86, 0.74, 0.1, 0.18), A(s, 1.1, 0.5, L.E.back), s, d.mood || 'happy');
  },
  chapter(K, s) {
    const V = K.vertical, d = s.d;
    const kick = V ? K.box(0.1, 0.34, 0.8, 0.08) : K.box(0.1, 0.25, 0.8, 0.13);
    const title = V ? K.box(0.08, 0.44, 0.84, 0.2) : K.box(0.08, 0.42, 0.84, 0.32);
    K.cue('impact', 0.1); K.S.number(K, d.kicker || String(s.i).padStart(2, '0'), kick, A(s, 0.1, 0.6), s, { small: true });
    K.cue('title', 0.35); K.S.headline(K, d.title, title, A(s, 0.35, 0.8), s, { align: 'center' });
  },
  list(K, s) {
    const V = K.vertical, d = s.d, items = d.items || [], n = items.length;
    const title = V ? K.box(0.07, 0.07, 0.86, 0.15) : K.box(0.06, 0.06, 0.88, 0.17);
    const area = V ? K.box(0.07, 0.25, 0.86, 0.6) : K.box(0.08, 0.28, 0.84, 0.64);
    K.cue('title', 0.1); K.S.headline(K, d.title, title, A(s, 0.1, 0.7), s, { align: 'left', size: 'm' });
    const gap = area.h * 0.04, rh = Math.min((area.h - gap * (n - 1)) / n, area.h * 0.3);
    items.forEach((it, j) => {
      const row = { x: area.x, y: area.y + j * (rh + gap), w: area.w, h: rh }, at = 0.6 + j * (d.stagger || 0.45);
      K.cue('enter', at); const p = A(s, at, 0.55);
      K.S.panel(K, row, p, s, 'row', j);
      const bs = rh * 0.62; K.S.bullet(K, j, { x: row.x + rh * 0.2, y: row.y + (rh - bs) / 2, w: bs, h: bs }, p, s);
      K.S.text(K, it, { x: row.x + rh * 0.2 + bs + rh * 0.3, y: row.y + rh * 0.14, w: row.w - bs - rh * 0.8, h: rh * 0.72 }, p, 'item', s);
    });
  },
  stat(K, s) {
    const V = K.vertical, d = s.d;
    const kick = V ? K.box(0.08, 0.2, 0.84, 0.05) : K.box(0.1, 0.1, 0.8, 0.07);
    const num = V ? K.box(0.06, 0.27, 0.88, 0.2) : K.box(0.08, 0.2, 0.84, 0.42);
    const lab = V ? K.box(0.1, 0.5, 0.8, 0.12) : K.box(0.14, 0.66, 0.72, 0.13);
    if (d.kicker) K.S.text(K, d.kicker, kick, A(s, 0.05), 'kicker', s, { align: 'center' });
    const cp = L.E.out(L.clamp((s.t - 0.25) / (d.countDur || 1.4)));
    const v = (d.from || 0) + ((d.value ?? 0) - (d.from || 0)) * cp;
    const str = (d.prefix || '') + v.toLocaleString('es-MX', { minimumFractionDigits: d.decimals || 0, maximumFractionDigits: d.decimals || 0 }) + (d.suffix || '');
    K.cue('count', 0.25, { dur: d.countDur || 1.4 }); K.cue('impact', 0.25 + (d.countDur || 1.4));
    K.S.number(K, str, num, A(s, 0.2, 0.5), s, { final: cp >= 1 });
    if (d.label) { K.cue('enter', 0.9); K.S.text(K, d.label, lab, A(s, 0.9), 'body', s, { align: 'center' }); }
    if (d.mascot) K.S.mascot(K, V ? K.box(0.36, 0.68, 0.28, 0.13) : K.box(0.86, 0.72, 0.1, 0.18), A(s, 1.6, 0.5, L.E.back), s, 'happy');
  },
  compare(K, s) {
    const V = K.vertical, d = s.d;
    const title = V ? K.box(0.07, 0.05, 0.86, 0.1) : K.box(0.06, 0.05, 0.88, 0.13);
    const Lb = V ? K.box(0.07, 0.18, 0.86, 0.36) : K.box(0.05, 0.22, 0.435, 0.7);
    const Rb = V ? K.box(0.07, 0.57, 0.86, 0.36) : K.box(0.515, 0.22, 0.435, 0.7);
    if (d.title) { K.cue('title', 0.1); K.S.headline(K, d.title, title, A(s, 0.1, 0.6), s, { align: 'center', size: 'm' }); }
    [[d.left, Lb, 0.4, 'bad'], [d.right, Rb, 1.3, 'good']].forEach(([side, b, at, tone]) => {
      if (!side) return; K.cue('enter', at); const p = A(s, at, 0.6);
      K.S.panel(K, b, p, s, tone);
      const hb = { x: b.x + b.w * 0.07, y: b.y + b.h * 0.06, w: b.w * 0.86, h: b.h * 0.16 };
      K.S.text(K, side.title, hb, p, tone === 'good' ? 'headGood' : 'headBad', s);
      const items = side.items || [], ih = (b.h * 0.7) / Math.max(items.length, 3);
      items.forEach((it, j) => { const pj = A(s, at + 0.3 + j * 0.22, 0.45); K.S.text(K, (tone === 'good' ? '✓ ' : '✗ ') + it, { x: b.x + b.w * 0.08, y: b.y + b.h * 0.26 + j * ih, w: b.w * 0.84, h: ih * 0.8 }, pj, tone === 'good' ? 'good' : 'bad', s); });
    });
  },
  quote(K, s) {
    const V = K.vertical, d = s.d, hasP = K.person && d.person;
    const txt = V ? K.box(0.08, 0.16, 0.84, 0.36) : K.box(0.08, 0.14, hasP ? 0.56 : 0.84, 0.54);
    const by = V ? K.box(0.08, 0.54, 0.84, 0.05) : K.box(0.08, 0.72, 0.56, 0.07);
    if (hasP) portraitAndMascot(K, s, V ? K.boxFull(0.15, 0.6, 0.7, 0.4) : K.boxFull(0.66, 0.12, 0.32, 0.88), null, 0.3);
    K.cue('title', 0.1); K.S.quote(K, d.text, txt, A(s, 0.1, 0.9), s);
    if (d.by) { K.cue('enter', 0.9); K.S.text(K, '— ' + d.by, by, A(s, 0.9), 'label', s); }
  },
  media(K, s) {
    const V = K.vertical, d = s.d, img = K.images[d.src];
    const title = V ? K.box(0.07, 0.05, 0.86, 0.14) : K.box(0.05, 0.16, 0.4, 0.42);
    const cap = V ? K.box(0.07, 0.2, 0.86, 0.05) : K.box(0.05, 0.62, 0.4, 0.2);
    const mb = V ? K.box(0.08, 0.27, 0.84, 0.66) : K.box(0.48, 0.06, 0.48, 0.88);
    K.cue('whoosh', 0.05); if (img) K.S.media(K, img, mb, A(s, 0.05, 0.8), s, d.frame || 'plain');
    if (d.title) { K.cue('title', 0.3); K.S.headline(K, d.title, title, A(s, 0.3, 0.7), s, { align: 'left', size: 'm' }); }
    if (d.caption) { K.cue('enter', 0.9); K.S.text(K, d.caption, cap, A(s, 0.9), 'body', s); }
  },
  steps(K, s) {
    const V = K.vertical, d = s.d, items = d.items || [], n = items.length;
    const title = V ? K.box(0.07, 0.06, 0.86, 0.13) : K.box(0.06, 0.07, 0.88, 0.17);
    K.cue('title', 0.1); K.S.headline(K, d.title, title, A(s, 0.1, 0.7), s, { align: V ? 'left' : 'center', size: 'm' });
    const boxes = items.map((_, j) => V ? K.box(0.1, 0.24 + j * (0.66 / n), 0.8, 0.66 / n * 0.8) : K.box(0.06 + j * (0.88 / n), 0.36, 0.88 / n * 0.86, 0.5));
    items.forEach((it, j) => {
      const at = 0.6 + j * (d.stagger || 0.5), p = A(s, at, 0.55), b = boxes[j];
      if (j > 0) { const a = boxes[j - 1]; K.S.connector(K, V ? [a.x + a.h * 0.28, a.y + a.h * 0.56] : [a.x + a.w * 0.5 + a.w * 0.2, a.y + a.w * 0.22], V ? [b.x + b.h * 0.28, b.y] : [b.x + b.w * 0.5 - b.w * 0.2, b.y + b.w * 0.22], A(s, at - 0.3, 0.4), s); }
      K.cue('enter', at);
      const bs = V ? b.h * 0.56 : b.w * 0.44;
      K.S.bullet(K, j, V ? { x: b.x, y: b.y, w: bs, h: bs } : { x: b.x + (b.w - bs) / 2, y: b.y, w: bs, h: bs }, p, s);
      K.S.text(K, it, V ? { x: b.x + bs * 1.3, y: b.y, w: b.w - bs * 1.3, h: bs } : { x: b.x, y: b.y + bs * 1.2, w: b.w, h: b.h - bs * 1.2 }, p, 'step', s, { align: V ? 'left' : 'center' });
    });
  },
  cta(K, s) {
    const V = K.vertical, d = s.d, hasP = K.person && d.person !== false;
    const title = V ? K.box(0.07, 0.07, 0.86, 0.22) : K.box(0.05, 0.14, hasP ? 0.5 : 0.9, 0.38);
    const sub = V ? K.box(0.07, 0.3, 0.86, 0.07) : K.box(0.05, 0.55, 0.5, 0.12);
    const chip = V ? K.box(0.15, 0.39, 0.7, 0.06) : K.box(0.05, 0.72, 0.36, 0.1);
    portraitAndMascot(K, s, hasP ? (V ? K.boxFull(0.05, 0.48, 0.9, 0.52) : K.boxFull(0.56, 0.06, 0.42, 0.94)) : null, V ? K.box(0.66, 0.66, 0.28, 0.12) : K.box(0.44, 0.66, 0.1, 0.17), 0.05);
    K.cue('title', 0.15); K.S.headline(K, d.title, title, A(s, 0.15, 0.8), s, { align: 'left' });
    if (d.sub) { K.cue('enter', 0.7); K.S.text(K, d.sub, sub, A(s, 0.7), 'body', s); }
    if (d.button) { K.cue('impact', 1.1); K.S.button(K, d.button, chip, A(s, 1.1, 0.5, L.E.back), s); }
  },
};
