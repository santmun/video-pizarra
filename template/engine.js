/* video-pizarra · engine.js
 * Hand-drawn "whiteboard" video engine: SVG + GSAP, rendered frame by frame (deterministic).
 * The project's scenes.js calls:  bootVideo(async (V) => { ...build scenes with V.* ... }, config)
 * Everything here is a pure function of time: renderAt(t) seeks the paused timeline and re-applies
 * proxy transforms, so frames can be rendered in any order.
 * Full API reference: references/engine-api.md
 */
(function () {
const NS = 'http://www.w3.org/2000/svg';

window.bootVideo = async function bootVideo(build, cfg = {}) {
  await document.fonts.ready;
  const fonts = cfg.fontLoads || ['700 100px Caveat', '400 60px Kalam', '500 40px "JetBrains Mono"'];
  await Promise.all(fonts.map(f => document.fonts.load(f)));

  const params = new URLSearchParams(location.search);
  const MODE = (params.get('mode') || cfg.mode || 'A').toUpperCase();   // A = transitions land on beats
  const SPEED = cfg.speed ?? 0.8;                                        // global tempo (0.8 = 20% faster)
  const W = cfg.width || 1080, Hh = cfg.height || 1920;
  const CX = W / 2, CY = Hh / 2;
  const S = t => t * SPEED;
  const tl = gsap.timeline({ paused: true });
  const strokes = [], updaters = [], SFX = [], HITS = [];
  const sfx = (name, at, o = {}) => SFX.push({ name, t: S(at), dur: o.dur != null ? S(o.dur) : null, gain: o.gain ?? 1, n: o.n });

  /* ---------- palette (overridable) ---------- */
  const PAL = Object.assign({
    ink: '#2A1F1C', orange: '#D9703F', blue: '#2F62C8', green: '#23885A', red: '#CF3E36', purple: '#6452C4', gray: '#8C857B',
    chalk: '#F3F0E6', chalkO: '#F5A57B', chalkB: '#A9CBF5', sepia: '#3B2A1A', graphite: '#4A4744', cream: '#FFF6EA',
    paper: '#ECE9E2', teal: '#5DB8B2',
  }, cfg.palette || {});
  const INK = PAL.ink;

  /* ---------- stage ---------- */
  const svg = document.getElementById('stage');
  svg.setAttribute('viewBox', `0 0 ${W} ${Hh}`);
  svg.style.width = W + 'px'; svg.style.height = Hh + 'px';
  svg.innerHTML = `
  <defs>
    <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" seed="7"/>
      <feColorMatrix values="0 0 0 0 .35  0 0 0 0 .3  0 0 0 0 .25  0 0 0 -1.1 .62"/></filter>
    <filter id="rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence id="roughN" type="fractalNoise" baseFrequency=".022" numOctaves="2" seed="4" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter>
    <filter id="chalk" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence id="chalkN" type="fractalNoise" baseFrequency=".022" numOctaves="2" seed="9" result="w"/>
      <feDisplacementMap in="SourceGraphic" in2="w" scale="6" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="2" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.4 0 0 0 1.75" result="m"/><feComposite in="d" in2="m" operator="in"/></filter>
    <filter id="fibers" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".006 .18" numOctaves="3" seed="3"/>
      <feColorMatrix values="0 0 0 0 .35  0 0 0 0 .22  0 0 0 0 .1  0 0 0 -1.3 .75"/></filter>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>
    <filter id="vblur" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur id="vblurS" stdDeviation="0 0"/></filter>
    <radialGradient id="sepiaVig" cx="50%" cy="48%" r="70%"><stop offset="55%" stop-color="#6b4a22" stop-opacity="0"/><stop offset="100%" stop-color="#5a3a14" stop-opacity=".55"/></radialGradient>
    <radialGradient id="flashG" cx="50%" cy="42%" r="70%"><stop offset="0%" stop-color="#fff"/><stop offset="60%" stop-color="#FFF8E6"/><stop offset="100%" stop-color="#FFE9C2"/></radialGradient>
    <pattern id="graphMinor" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40,0 L0,0 0,40" fill="none" stroke="#D5E1F4" stroke-width="1.5"/></pattern>
    <pattern id="graphMajor" width="200" height="200" patternUnits="userSpaceOnUse"><path d="M200,0 L0,0 0,200" fill="none" stroke="#AFC4E8" stroke-width="2.5"/></pattern>
    <pattern id="bpMinor" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40,0 L0,0 0,40" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="1.5"/></pattern>
    <pattern id="bpMajor" width="200" height="200" patternUnits="userSpaceOnUse"><path d="M200,0 L0,0 0,200" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="2.5"/></pattern>
    <pattern id="halftone" width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="18" cy="18" r="3" fill="#fff" fill-opacity=".12"/></pattern>
    <clipPath id="screenClip" clipPathUnits="userSpaceOnUse"><rect id="screenClipR" x="0" y="0" width="${W}" height="${Hh}" rx="0"/></clipPath>
  </defs>
  <rect width="${W}" height="${Hh}" fill="#231C18"/>
  <g id="finaleBg" opacity="0"><rect width="${W}" height="${Hh}" fill="#231C18"/></g>
  <g id="scenes"></g><g id="screen"></g>
  <rect id="flash" width="${W}" height="${Hh}" fill="url(#flashG)" opacity="0"/>
  <rect width="${W}" height="${Hh}" filter="url(#grain)" opacity=".22"/>
  <g id="tools"></g>`;
  const defs = svg.querySelector('defs');
  const scenesL = document.getElementById('scenes'), screenL = document.getElementById('screen');

  function el(tag, attrs = {}, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  }

  /* ---------- beat grid (audio/beats.json, optional) ---------- */
  let BEATS = [], STR = [], DOWN = new Set(), BEAT = 0.5, STRONG = [];
  try {
    const bj = await (await fetch(cfg.beatsUrl || 'audio/beats.json')).json();
    BEATS = bj.beats; STR = bj.strength; BEAT = 60 / bj.tempo;
    let best = 0, bestSum = -1;
    for (let ph = 0; ph < 4; ph++) { let sum = 0; for (let i = ph; i < STR.length; i += 4) sum += STR[i]; if (sum > bestSum) { bestSum = sum; best = ph; } }
    for (let i = best; i < BEATS.length; i += 4) DOWN.add(i);
    const thr = [...STR].sort((a, b) => b - a)[Math.floor(STR.length * 0.28)];
    STRONG = BEATS.filter((b, i) => STR[i] >= thr);
  } catch (e) { console.warn('no beats.json: transitions will not snap to the music'); }
  // nudge a transition so its "hit" lands on the nearest strong beat (small window keeps pacing tight)
  function align(t, H) {
    const hit = S(t + H);
    HITS.push({ orig: hit, t: hit });
    if (MODE !== 'A' || !BEATS.length) return t;
    let bestI = -1, bestScore = -1e9;
    BEATS.forEach((b, i) => {
      const d = b - hit;
      if (d < -0.25 || d > 0.7) return;
      const score = STR[i] * (DOWN.has(i) ? 1.4 : 1) - 1.6 * Math.abs(d);
      if (score > bestScore) { bestScore = score; bestI = i; }
    });
    if (bestI < 0) return t;
    HITS[HITS.length - 1].t = BEATS[bestI];
    return t + (BEATS[bestI] - hit) / SPEED;
  }

  /* ---------- hatch fills ---------- */
  const HATCH = Object.assign({
    orange: ['#E8874F', '#B24F22'], purple: ['#A99BEA', '#5A48B8'], gray: ['#D3CDC2', '#8C857B'],
    yellow: ['#F6DE8A', '#C79A2A'], blue: ['#C9DAFB', '#4D78D0'], bag: ['#E3D3AE', '#9C7F45'],
    cream: ['#FBF3E6', '#B98E5B'], shadow: ['none', '#6F675D'], shadowW: ['none', '#ffffff'],
    sepia: ['#D9BF8E', '#7A5A2E'], kraftTag: ['#F4E7C8', '#9C7F45'], teal: ['#5DB8B2', '#23706B'],
    skin: ['#F4CFAE', '#C98E63'], hard: ['#F6C744', '#B8860B'], white: ['#FFFFFF', '#C9C3B8'],
    green: ['#9FD8B0', '#23885A'], red: ['#F2A29B', '#B8322A'], pink: ['#F6B8C8', '#C2507A'],
    black: ['#3A3A40', '#111116'], tan: ['#E3B48C', '#A5764C'],
  }, cfg.hatches || {});
  const addHatch = (k, base, line) => defs.insertAdjacentHTML('beforeend', `
    <pattern id="h-${k}" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(38)">
      ${base !== 'none' ? `<rect width="7" height="7" fill="${base}"/>` : ''}
      <line x1="1" y1="0" x2="1" y2="7" stroke="${line}" stroke-width="1.3" opacity=".42"/>
      <line x1="0" y1="4" x2="7" y2="4" stroke="${line}" stroke-width="0.9" opacity=".2"/></pattern>`);
  for (const [k, [b, l]] of Object.entries(HATCH)) addHatch(k, b, l);
  const H = k => `url(#h-${k})`;

  /* ---------- drawing tools that follow the stroke ---------- */
  const toolsL = document.getElementById('tools');
  const MARKER_SVG = c => `<g transform="rotate(32) scale(1.25)"><ellipse cx="18" cy="-120" rx="20" ry="110" fill="#000" opacity=".08" transform="translate(14,10)"/>
      <path class="tip" d="M0,0 L-8,-22 L8,-22 Z" fill="${c}"/><rect x="-11" y="-40" width="22" height="19" rx="3" fill="#3a3a3a"/>
      <rect x="-15" y="-230" width="30" height="192" rx="7" fill="#F5F3EE" stroke="#222" stroke-width="3"/>
      <rect class="tip" x="-15" y="-120" width="30" height="34" fill="${c}"/><rect x="-15" y="-236" width="30" height="40" rx="7" fill="#2b2b2b"/></g>`;
  const TOOLS = {
    marker: MARKER_SVG(INK),
    chalk: `<g transform="rotate(24)"><circle r="7" fill="#fff" opacity=".35"/><rect x="-12" y="-150" width="24" height="152" rx="8" fill="#F4F1E8" stroke="#C9C3B4" stroke-width="2"/></g>`,
    quill: `<g transform="rotate(28)"><path d="M0,0 L-5,-28 L5,-28 Z" fill="#2b2118"/><path d="M0,-28 L0,-330" stroke="#CDBB98" stroke-width="5" stroke-linecap="round"/>
      <path d="M0,-70 C-48,-130 -56,-250 -14,-340 C0,-290 20,-170 0,-70 Z" fill="#FBF6EC" stroke="#A8987A" stroke-width="2.5"/>
      <path d="M0,-100 C30,-150 40,-250 12,-330 C4,-280 -4,-170 0,-100 Z" fill="#F1E8D6" stroke="#A8987A" stroke-width="2"/></g>`,
    pencil: `<g transform="rotate(30) scale(1.15)"><ellipse cx="16" cy="-150" rx="18" ry="140" fill="#000" opacity=".08" transform="translate(14,10)"/>
      <path d="M0,0 L-4,-13 L4,-13 Z" fill="#3a3a3a"/><path d="M-4,-13 L-14,-44 L14,-44 L4,-13 Z" fill="#EBCB9B"/>
      <rect x="-14" y="-260" width="28" height="216" fill="#F4C430"/><rect x="-14" y="-260" width="9" height="216" fill="#E0AE1A"/>
      <rect x="-14" y="-284" width="28" height="24" fill="#BDBDBD" stroke="#999" stroke-width="1.5"/><rect x="-14" y="-314" width="28" height="30" rx="6" fill="#EE8FA3"/></g>`,
    brush: `<g transform="rotate(30) scale(1.2)"><path d="M0,0 C-11,-14 -13,-36 -11,-54 L11,-54 C13,-36 11,-14 0,0 Z" fill="#1c1c1c"/>
      <rect x="-12" y="-88" width="24" height="36" rx="3" fill="#C9CDD2" stroke="#8d9299" stroke-width="2"/><path d="M-12,-88 L-8,-290 Q0,-300 8,-290 L12,-88 Z" fill="#B5462E"/></g>`,
  };
  const toolEls = {};
  for (const [k, s] of Object.entries(TOOLS)) { const g = el('g', { visibility: 'hidden' }, toolsL); g.innerHTML = s; toolEls[k] = g; }
  const state = { tool: null };

  /* ---------- primitives ---------- */
  const toRoot = (node, x, y) => { const p = svg.createSVGPoint(); p.x = x; p.y = y; return p.matrixTransform(node.getCTM()); };
  function P(parent, d, { color = INK, w = 7, fill = 'none', fo = 1, cap = 'round', opacity = 1 } = {}) {
    const p = el('path', { d, fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': cap, 'stroke-linejoin': 'round', opacity }, parent);
    p._color = color;
    if (fill !== 'none') { const f = el('path', { d, fill, stroke: 'none', 'fill-opacity': 0 }, parent); parent.insertBefore(f, p); p._fill = f; p._fo = fo; }
    const len = p.getTotalLength();
    p.setAttribute('stroke-dasharray', len + ' ' + len); p.setAttribute('stroke-dashoffset', len); p._len = len;
    return p;
  }
  function done(p) { p.setAttribute('stroke-dashoffset', 0); if (p._fill) p._fill.setAttribute('fill-opacity', p._fo); }
  function draw(p, at, dur, { ease = 'power1.inOut', tool = state.tool, sound = true } = {}) {
    const a = S(at), d = S(dur);
    tl.fromTo(p, { attr: { 'stroke-dashoffset': p._len } }, { attr: { 'stroke-dashoffset': 0 }, duration: d, ease }, a);
    strokes.push({ kind: 'path', node: p, start: a, dur: d, ease: gsap.parseEase(ease), color: p._color, tool });
    if (p._fill) tl.fromTo(p._fill, { attr: { 'fill-opacity': 0 } }, { attr: { 'fill-opacity': p._fo }, duration: S(0.35), ease: 'power1.out' }, a + d);
    if (sound && tool && dur > 0.12) sfx('scr_' + tool, at, { dur, gain: 0.8 });
    else if (sound && !tool && dur > 0.25) sfx('draw_soft', at, { dur, gain: 0.5 });
  }
  let clipId = 0;
  function T(parent, x, y, text, { size = 80, color = INK, anchor = 'middle', cls = 'hand', rot = 0, stroke = null } = {}) {
    const outer = el('g', { transform: `translate(${x},${y}) rotate(${rot})` }, parent);
    const g = el('g', {}, outer);
    const attrs = { x: 0, y: 0, 'font-size': size, fill: color, 'text-anchor': anchor, class: cls };
    if (stroke) Object.assign(attrs, { stroke, 'stroke-width': size * 0.09, 'paint-order': 'stroke', 'stroke-linejoin': 'round' });
    const t = el('text', attrs, g);
    t.textContent = text;
    const b = t.getBBox();
    const id = 'c' + (clipId++);
    const cp = el('clipPath', { id, clipPathUnits: 'userSpaceOnUse' }, g);
    const r = el('rect', { x: b.x - 16, y: b.y - 24, width: 0, height: b.height + 48 }, cp);
    t.setAttribute('clip-path', `url(#${id})`);
    Object.assign(t, { _b: b, _r: r, _color: color, _g: g, _outer: outer });
    return t;
  }
  const show_ = t => t._r.setAttribute('width', t._b.width + 32);
  function write(t, at, dur, { tool = state.tool } = {}) {
    dur = dur ?? Math.min(1.6, 0.25 + t.textContent.length * 0.045);
    const a = S(at), d = S(dur);
    tl.fromTo(t._r, { attr: { width: 0 } }, { attr: { width: t._b.width + 32 }, duration: d, ease: 'none' }, a);
    strokes.push({ kind: 'text', node: t, start: a, dur: d, color: t._color, tool });
    if (tool) sfx('scr_' + tool, at, { dur, gain: 0.8 });
  }
  function pop(t, at, { rot = -10, sound = 'pop' } = {}) {
    show_(t);
    gsap.set(t._g, { scale: 0, transformOrigin: '50% 60%' });
    tl.fromTo(t._g, { scale: 0, rotation: rot }, { scale: 1, rotation: 0, duration: S(0.5), ease: 'back.out(2.6)', immediateRender: false }, S(at));
    if (sound) sfx(sound, at);
  }
  function popIn(g, at, { sound = 'pop', origin = '50% 50%', rot = 0 } = {}) {
    gsap.set(g, { scale: 0, transformOrigin: origin });
    tl.fromTo(g, { scale: 0, rotation: rot }, { scale: 1, rotation: 0, duration: S(0.5), ease: 'back.out(2.2)', immediateRender: false }, S(at));
    if (sound) sfx(sound, at);
  }
  function type(t, at, dur, caretColor) {
    const n = t.textContent.length; dur = dur ?? n * 0.055;
    tl.fromTo(t._r, { attr: { width: 0 } }, { attr: { width: t._b.width + 32 }, duration: S(dur), ease: `steps(${n})` }, S(at));
    if (caretColor) {
      const c = el('rect', { x: t._b.x, y: t._b.y + 6, width: 5, height: t._b.height - 8, fill: caretColor, opacity: 0 }, t._g);
      tl.set(c, { opacity: 1 }, S(at));
      tl.fromTo(c, { attr: { x: t._b.x } }, { attr: { x: t._b.x + t._b.width + 4 }, duration: S(dur), ease: `steps(${n})` }, S(at));
      tl.to(c, { opacity: 0, duration: S(0.1), repeat: 5, yoyo: true }, S(at + dur));
    }
    sfx('type', at, { dur, n });
  }
  function comic(parent, x, y, txt, at, { color = '#FFD23F', size = 120, rot = -8, life = 1.1, sound = null } = {}) {
    const t = T(parent, x, y, txt, { size, color, rot, stroke: INK });
    pop(t, at, { rot: rot * 2, sound });
    tl.to(t._g, { scale: 1.08, duration: S(0.12), yoyo: true, repeat: 3, ease: 'sine.inOut' }, S(at + 0.5));
    tl.to(t._g, { opacity: 0, scale: 1.25, duration: S(0.3) }, S(at + life));
    return t;
  }
  // scale about the element's own local origin, driven by a proxy (GSAP's origin math breaks inside rotated groups)
  function stampFx(inner, at, peak = 0.9) {
    const k = { s: 2.6, o: 0 };
    inner.setAttribute('opacity', 0);
    tl.to(k, { s: 1, o: peak, duration: S(0.22), ease: 'power4.in' }, S(at));
    updaters.push(() => { inner.setAttribute('transform', `scale(${k.s.toFixed(4)})`); inner.setAttribute('opacity', k.o.toFixed(3)); });
  }
  function stamp(parent, x, y, txt, at, { color = PAL.green, rot = -10, size = 88 } = {}) {
    const sg = el('g', { transform: `translate(${x},${y}) rotate(${rot})` }, parent);
    const inner = el('g', {}, sg);
    const tt = el('text', { 'font-size': size, 'text-anchor': 'middle', fill: color, class: 'hand' }, inner);
    tt.textContent = txt;
    const b = tt.getBBox();
    el('rect', { x: b.x - 24, y: b.y - 6, width: b.width + 48, height: b.height + 12, rx: 16, fill: 'none', stroke: color, 'stroke-width': 7 }, inner);
    stampFx(inner, at);
    sfx('stamp', at + 0.18);
    return sg;
  }
  function wobble(cx, cy, rx, ry, turns = 1.18, seed = 1) {
    let d = ''; const n = 90;
    for (let i = 0; i <= n; i++) {
      const a = -Math.PI * 0.6 + (i / n) * Math.PI * 2 * turns, k = 1 + 0.04 * Math.sin(i * 0.37 * seed) + 0.03 * Math.cos(i * 0.23);
      d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rx * k).toFixed(1) + ',' + (cy + Math.sin(a) * ry * k).toFixed(1);
    }
    return d;
  }
  function specks(g, seed = 11, n = 120, color = '#3a2e27') {
    let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) el('circle', { cx: (rnd() * W).toFixed(1), cy: (rnd() * Hh).toFixed(1), r: (0.6 + rnd() * 1.4).toFixed(2), fill: color, opacity: (0.2 + rnd() * 0.45).toFixed(2) }, g);
  }
  function mover(parent, x = 0, y = 0, s = 1, r = 0) {
    const g = el('g', {}, parent);
    const m = { x, y, s, r, g };
    const apply = () => g.setAttribute('transform', `translate(${m.x.toFixed(2)} ${m.y.toFixed(2)}) rotate(${m.r.toFixed(2)}) scale(${m.s.toFixed(4)})`);
    apply(); updaters.push(apply);
    return m;
  }
  function jump(m, at, to, { dur = 0.5, height = 120, sound = 'hop' } = {}) {
    const fx = m._lx ?? m.x, fy = m._ly ?? m.y, fs = m._ls ?? m.s, ts = to.s ?? fs;
    tl.to(m, { keyframes: [
      { x: fx + (to.x - fx) / 2, y: Math.min(fy, to.y) - height, s: (fs + ts) / 2, duration: S(dur / 2), ease: 'power2.out' },
      { x: to.x, y: to.y, s: ts, duration: S(dur / 2), ease: 'power2.in' }] }, S(at));
    m._lx = to.x; m._ly = to.y; m._ls = ts;
    if (sound) sfx(sound, at, { gain: 0.6 });
  }
  function bubble(parent, x0, y0, x1, y1, tx, ty, { fill = '#fff', ink = INK, w = 7 } = {}) {
    const r = 34, bx = Math.max(x0 + r + 20, Math.min(x1 - r - 80, tx - 40));
    const tail = ty > y1 ? `L${bx + 70},${y1} L${tx},${ty} L${bx},${y1}` : '';
    const d = `M${x0 + r},${y0} L${x1 - r},${y0} Q${x1},${y0} ${x1},${y0 + r} L${x1},${y1 - r} Q${x1},${y1} ${x1 - r},${y1} ${tail} L${x0 + r},${y1} Q${x0},${y1} ${x0},${y1 - r} L${x0},${y0 + r} Q${x0},${y0} ${x0 + r},${y0} Z`;
    const g = el('g', {}, parent);
    el('path', { d, fill, stroke: ink, 'stroke-width': w, 'stroke-linejoin': 'round' }, g);
    return g;
  }

  /* ---------- faces, eyes, emotes ---------- */
  const STAR = r => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; d += (i ? 'L' : 'M') + (Math.cos(a) * rr).toFixed(1) + ',' + (Math.sin(a) * rr).toFixed(1); } return d + 'Z'; };
  const HEART = k => `M0,${14 * k} C${-24 * k},${-2 * k} ${-20 * k},${-22 * k} ${-7 * k},${-20 * k} C${-2 * k},${-19 * k} 0,${-15 * k} 0,${-11 * k} C0,${-15 * k} ${2 * k},${-19 * k} ${7 * k},${-20 * k} C${20 * k},${-22 * k} ${24 * k},${-2 * k} 0,${14 * k} Z`;
  function EYE(st, ink, side, big) {
    const hl = [INK, PAL.sepia, PAL.graphite].includes(ink) ? '#fff' : 'none';
    switch (st) {
      case 'normal': return big ? `<rect x="-7.5" y="-14" width="15" height="28" rx="7" fill="${ink}"/><circle cx="-2.5" cy="-7" r="2.8" fill="${hl}"/>` : `<circle r="4.5" fill="${ink}"/>`;
      case 'lookR': return big ? `<rect x="-3.5" y="-14" width="15" height="28" rx="7" fill="${ink}"/>` : `<circle cx="3" r="4.5" fill="${ink}"/>`;
      case 'lookU': return big ? `<rect x="-7.5" y="-20" width="15" height="28" rx="7" fill="${ink}"/>` : `<circle cy="-3" r="4.5" fill="${ink}"/>`;
      case 'happy': return `<path d="M-11,6 Q0,-12 11,6" fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round"/>`;
      case 'closed': return `<path d="M-10,2 L10,2" fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round"/>`;
      case 'star': return `<path d="${STAR(big ? 17 : 11)}" fill="#F6C744" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>`;
      case 'heart': return `<path d="${HEART(big ? .95 : .6)}" fill="#E8577E" stroke="${ink}" stroke-width="3"/>`;
      case 'swirl': return `<path d="M0,0 m-2,0 a2,2 0 1,1 4,0 a5,5 0 1,1 -10,0 a8,8 0 1,1 16,0 a11,11 0 1,1 -22,0" fill="none" stroke="${ink}" stroke-width="3"/>`;
      case 'wide': return big ? `<circle r="13" fill="#fff" stroke="${ink}" stroke-width="3"/><circle r="5.5" fill="${ink}"/>` : `<circle r="8" fill="#fff" stroke="${ink}" stroke-width="2.5"/><circle r="3.5" fill="${ink}"/>`;
      case 'determined': return `<rect x="-7.5" y="-8" width="15" height="20" rx="6" fill="${ink}"/><path d="M${-13 * side},-24 L${11 * side},-15" stroke="${ink}" stroke-width="6" stroke-linecap="round"/>`;
      case 'sad': return `<path d="M-10,-2 Q0,8 10,-2" fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round"/><path d="M${-12 * side},-18 L${8 * side},-24" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`;
    }
    return '';
  }
  const EYE_STATES = ['normal', 'lookR', 'lookU', 'happy', 'closed', 'star', 'heart', 'swirl', 'wide', 'determined', 'sad'];
  const MOUTHS = {
    smile: i => `<path d="M-14,-4 Q0,10 14,-4" fill="none" stroke="${i}" stroke-width="5" stroke-linecap="round"/>`,
    o: i => `<ellipse rx="8" ry="10" fill="#5A2230" stroke="${i}" stroke-width="3"/>`,
    O: i => `<ellipse rx="13" ry="16" fill="#5A2230" stroke="${i}" stroke-width="3"/>`,
    grin: i => `<path d="M-18,-6 L18,-6 Q16,16 0,16 Q-16,16 -18,-6 Z" fill="#5A2230" stroke="${i}" stroke-width="3"/><path d="M-15,-6 L15,-6 L14,0 L-14,0 Z" fill="#fff"/>`,
    flat: i => `<path d="M-10,0 L10,0" stroke="${i}" stroke-width="5" stroke-linecap="round"/>`,
    frown: i => `<path d="M-14,6 Q0,-8 14,6" fill="none" stroke="${i}" stroke-width="5" stroke-linecap="round"/>`,
  };
  function buildFace(c, parent, eyePts, mouthPt, ink, big) {
    c.eyesWrap = el('g', {}, parent); c.eyeSets = {};
    EYE_STATES.forEach(st => {
      const g = el('g', { opacity: st === 'normal' ? 1 : 0 }, c.eyesWrap);
      eyePts.forEach(([x, y], i) => { const e = el('g', { transform: `translate(${x},${y})` }, g); e.innerHTML = EYE(st, ink, i ? -1 : 1, big); });
      c.eyeSets[st] = g;
    });
    c.mouthSets = {};
    Object.entries(MOUTHS).forEach(([k, fn]) => { const g = el('g', { transform: `translate(${mouthPt[0]},${mouthPt[1]})`, opacity: 0 }, parent); g.innerHTML = fn(ink); c.mouthSets[k] = g; });
    c.state = 'normal'; c.mouth = null;
  }
  // never snap faces: eyes squash shut, body does a take, emote pops, new eyes open
  function face(c, at, st, { mouth, emote: em, take = true } = {}) {
    tl.to(c.eyesWrap, { scaleY: 0.1, duration: S(0.07), transformOrigin: '50% 50%' }, S(at));
    if (st && st !== c.state) { tl.set(c.eyeSets[c.state], { opacity: 0 }, S(at + 0.07)); tl.set(c.eyeSets[st], { opacity: 1 }, S(at + 0.07)); c.state = st; }
    if (mouth !== undefined && mouth !== c.mouth) {
      if (c.mouth) tl.set(c.mouthSets[c.mouth], { opacity: 0 }, S(at + 0.07));
      if (mouth) tl.set(c.mouthSets[mouth], { opacity: 1 }, S(at + 0.07));
      c.mouth = mouth;
    }
    tl.to(c.eyesWrap, { scaleY: 1, duration: S(0.16), ease: 'back.out(3)' }, S(at + 0.07));
    if (take) tl.to(c.sq, { scaleY: 0.9, scaleX: 1.07, duration: S(0.08), yoyo: true, repeat: 1, transformOrigin: '50% 100%' }, S(at));
    if (em) emote(c, at + 0.1, em);
  }
  const EMOTE = {
    sweat: `<path d="M0,-24 C11,-6 17,4 17,11 A17,17 0 0 1 -17,11 C-17,4 -11,-6 0,-24 Z" fill="#8FD3F4" stroke="${INK}" stroke-width="4"/>`,
    heart: `<path d="${HEART(1.3)}" fill="#E8577E" stroke="${INK}" stroke-width="4"/>`,
    '!': `<text y="28" font-size="96" text-anchor="middle" class="hand" fill="${PAL.red}" stroke="${INK}" stroke-width="7" paint-order="stroke">!</text>`,
    '?': `<text y="28" font-size="96" text-anchor="middle" class="hand" fill="#FFD23F" stroke="${INK}" stroke-width="7" paint-order="stroke">?</text>`,
    sparkle: `<path d="M0,-28 L7,-7 L28,0 L7,7 L0,28 L-7,7 L-28,0 L-7,-7 Z" fill="#F6C744" stroke="${INK}" stroke-width="3.5"/>`,
    bulb: `<g><path d="M-26,-40 L-36,-52 M0,-50 L0,-66 M26,-40 L36,-52 M-36,-12 L-50,-12 M36,-12 L50,-12" stroke="#F6C744" stroke-width="6" stroke-linecap="round"/>
      <circle cy="-12" r="24" fill="#FFE27A" stroke="${INK}" stroke-width="4"/><rect x="-11" y="10" width="22" height="16" rx="3" fill="#B9B2A6" stroke="${INK}" stroke-width="3"/></g>`,
    zzz: `<text y="10" font-size="56" class="kalam" fill="${PAL.blue}">z<tspan dy="-18" font-size="42">z</tspan><tspan dy="-14" font-size="30">z</tspan></text>`,
    swirl: `<path d="M0,0 m-3,0 a3,3 0 1,1 6,0 a8,8 0 1,1 -16,0 a13,13 0 1,1 26,0" fill="none" stroke="${PAL.purple}" stroke-width="5"/>`,
    anger: `<path d="M-18,-6 L-6,-6 L-6,-18 M6,-18 L6,-6 L18,-6 M18,6 L6,6 L6,18 M-6,18 L-6,6 L-18,6" fill="none" stroke="${PAL.red}" stroke-width="6" stroke-linecap="round"/>`,
    music: `<path d="M-8,14 a8,6 0 1,1 0.1,0 M0,14 L0,-22 L18,-16" fill="none" stroke="${INK}" stroke-width="5"/>`,
  };
  function emote(c, at, kind) {
    const g = el('g', { transform: `translate(${c.emoteAt[0]},${c.emoteAt[1]})` }, c.sq);
    const inner = el('g', { opacity: 0 }, g); inner.innerHTML = EMOTE[kind];
    const k = 1 / (c.k || 1);
    tl.fromTo(inner, { scale: 0, opacity: 1 }, { scale: k, duration: S(0.35), ease: 'back.out(3)', transformOrigin: '50% 50%', immediateRender: false }, S(at));
    tl.to(inner, { y: -20 * k, duration: S(1.0), ease: 'sine.out' }, S(at));
    tl.to(inner, { opacity: 0, duration: S(0.3) }, S(at + 1.1));
    sfx(kind === 'heart' || kind === 'sparkle' ? 'sparkle' : kind === 'bulb' ? 'ding' : 'blip', at, { gain: 0.5 });
  }
  function arms(c, at, { L, R, dur = 0.2, ease = 'back.out(2)' } = {}) {
    const v = {}; if (L != null) v.L = L; if (R != null) v.R = R;
    tl.to(c.armP, { ...v, duration: S(dur), ease }, S(at));
  }
  function wave(c, side, at, n = 3, { from = 60, to = 30, speed = 0.14 } = {}) {
    tl.to(c.armP, { [side]: side === 'L' ? from : -from, duration: S(0.15) }, S(at));
    tl.to(c.armP, { [side]: side === 'L' ? to : -to, duration: S(speed), yoyo: true, repeat: n * 2 - 1, ease: 'sine.inOut' }, S(at + 0.15));
  }

  /* ---------- mascot rig (default shape = a blocky critter; pass `shape` for your own) ---------- */
  const BLOCKY = {
    body: 'M9,5 Q100,-1 188,3 Q197,4 197,12 L199,127 Q199,136 190,136 L13,139 Q4,139 4,130 L2,13 Q2,6 9,5 Z',
    armL: 'M5,64 L-20,64 Q-26,64 -26,70 L-26,88 Q-26,94 -20,94 L5,94 Z',
    armR: 'M196,56 L220,56 Q226,56 226,62 L226,80 Q226,86 220,86 L196,86 Z',
    legs: [30, 60, 124, 154].map(x => `M${x},134 L${x},165 Q${x},171 ${x + 6},171 L${x + 11},171 Q${x + 17},171 ${x + 17},165 L${x + 17},134 Z`),
    eyes: [[65.5, 64], [133.5, 62]], mouth: [100, 104],
    pivotL: [5, 79], pivotR: [196, 71], handL: [-26, 79], handR: [226, 71],
    width: 220, height: 171, offsetX: 10, emoteAt: [205, -40],
  };
  const SHAPE = Object.assign({}, BLOCKY, cfg.mascotShape || {});
  function mascot(parent, x, y, s, { theme = cfg.mascotTheme || 'orange', ink = INK, ground = '#B9B2A6', shadow = 'shadow', hat = null, shape = SHAPE } = {}) {
    const outer = el('g', { transform: `translate(${x + shape.offsetX * s},${y}) scale(${s})` }, parent);
    const w = 7.5 / s, cxm = shape.width / 2 - shape.offsetX;
    const sh = el('ellipse', { cx: cxm, cy: shape.height + 5, rx: shape.width * 0.58, ry: 11, fill: H(shadow), opacity: 0 }, outer);
    const gr = ground ? P(outer, `M${cxm - 290},${shape.height + 6} L${cxm + 290},${shape.height + 6}`, { color: ground, w: 2.2 / s }) : null;
    const g = el('g', {}, outer), sq = el('g', {}, g);
    const fill = theme ? H(theme) : 'none';
    const c = { g, sq, outer, shadow: sh, ground: gr, k: s, emoteAt: shape.emoteAt };
    c.legs = shape.legs.map(d => P(sq, d, { color: ink, w, fill }));
    c.armG = { L: el('g', {}, sq), R: el('g', {}, sq) };
    c.arms = [P(c.armG.L, shape.armL, { color: ink, w, fill }), P(c.armG.R, shape.armR, { color: ink, w, fill })];
    c.hand = { L: el('g', { transform: `translate(${shape.handL})` }, c.armG.L), R: el('g', { transform: `translate(${shape.handR})` }, c.armG.R) };
    c.body = P(sq, shape.body, { color: ink, w, fill });
    c.armP = { L: 0, R: 0 };
    updaters.push(() => {
      c.armG.L.setAttribute('transform', `rotate(${c.armP.L.toFixed(2)} ${shape.pivotL})`);
      c.armG.R.setAttribute('transform', `rotate(${c.armP.R.toFixed(2)} ${shape.pivotR})`);
    });
    buildFace(c, el('g', {}, sq), shape.eyes, shape.mouth, ink, true);
    gsap.set(c.eyesWrap, { scaleY: 0, transformOrigin: '50% 50%' });
    if (hat === 'hard' || hat === 'crown' || hat === 'party') {
      c.hat = el('g', { opacity: 0 }, sq);
      const hx = cxm;
      c.hat.innerHTML = hat === 'hard'
        ? `<path d="M${hx - 70},4 Q${hx - 70},-58 ${hx},-58 Q${hx + 70},-58 ${hx + 70},4 Z" fill="${H('hard')}" stroke="${INK}" stroke-width="${w}"/><path d="M${hx - 86},4 L${hx + 86},4" stroke="${INK}" stroke-width="${w * 1.6}" stroke-linecap="round"/>`
        : hat === 'crown'
        ? `<path d="M${hx - 58},4 L${hx - 58},-50 L${hx - 29},-22 L${hx},-64 L${hx + 29},-22 L${hx + 58},-50 L${hx + 58},4 Z" fill="${H('yellow')}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>`
        : `<path d="M${hx - 34},4 L${hx},-80 L${hx + 34},4 Z" fill="${H('pink')}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/><circle cx="${hx}" cy="-84" r="10" fill="#FFD23F" stroke="${INK}" stroke-width="${w * .6}"/>`;
    }
    return c;
  }
  function drawMascot(c, at, dur = 1.1, opts = {}) {
    if (c.ground) draw(c.ground, at, dur * 0.5, { sound: false, ...opts });
    draw(c.body, at, dur * 0.7, opts);
    c.arms.forEach((a, i) => draw(a, at + dur * 0.7 + i * 0.1, dur * 0.18, { ...opts, sound: false }));
    c.legs.forEach((l, i) => draw(l, at + dur * 0.85 + i * 0.07, dur * 0.14, { ...opts, sound: false }));
    tl.to(c.shadow, { attr: { opacity: 0.7 }, duration: S(0.4) }, S(at + dur));
    tl.to(c.eyesWrap, { scaleY: 1, duration: S(0.25), ease: 'back.out(3)' }, S(at + dur + 0.3));
    if (c.hat) tl.to(c.hat, { opacity: 1, duration: S(0.2) }, S(at + dur));
    sfx('blip', at + dur + 0.3, { gain: 0.6 });
  }
  function popMascot(c, at, { sound = 'boing' } = {}) {
    [c.body, ...c.arms, ...c.legs].forEach(done);
    if (c.ground) done(c.ground);
    if (c.hat) c.hat.setAttribute('opacity', 1);
    gsap.set(c.g, { scale: 0, transformOrigin: '50% 100%' });
    tl.fromTo(c.g, { scale: 0 }, { scale: 1, duration: S(0.55), ease: 'back.out(2.4)', immediateRender: false }, S(at));
    tl.to(c.shadow, { attr: { opacity: 0.7 }, duration: S(0.3) }, S(at));
    tl.to(c.eyesWrap, { scaleY: 1, duration: S(0.2), ease: 'back.out(3)' }, S(at + 0.35));
    if (sound) sfx(sound, at, { gain: 0.8 });
  }
  const blink = (c, at) => tl.to(c.eyesWrap, { scaleY: 0.1, duration: S(0.08), yoyo: true, repeat: 1, transformOrigin: '50% 50%' }, S(at));
  function wink(c, at) {
    const set = c.eyeSets[c.state].children[0];
    tl.to(set, { scaleY: 0.1, duration: S(0.1), yoyo: true, repeat: 1, repeatDelay: S(0.25), transformOrigin: '50% 50%' }, S(at));
    sfx('blip', at + 0.1, { gain: 0.5 });
  }
  function hop(c, at, n = 2, sound = true, h = 40) {
    tl.to(c.g, { y: -h, duration: BEAT / 4, ease: 'power2.out', yoyo: true, repeat: n * 2 - 1 }, S(at));
    if (c.shadow) tl.to(c.shadow, { attr: { rx: 95 }, duration: BEAT / 4, ease: 'power2.out', yoyo: true, repeat: n * 2 - 1 }, S(at));
    if (sound) for (let i = 0; i < n; i++) sfx('hop', at + i * (BEAT / 2) / SPEED, { gain: 0.55 });
  }
  function wiggle(c, at, n = 3) {
    c.legs.forEach((l, i) => tl.to([l, l._fill].filter(Boolean), { y: -7, duration: BEAT / 4, yoyo: true, repeat: n * 2 - 1, ease: 'sine.inOut' }, S(at) + (i % 2) * BEAT / 4));
  }
  const take = (c, at, k = 0.12) => tl.to(c.sq, { scaleY: 1 - k, scaleX: 1 + k * 0.7, duration: S(0.08), yoyo: true, repeat: 1, transformOrigin: '50% 100%' }, S(at));

  /* ---------- human character (the viewer's stand-in) ---------- */
  function person(parent, x, y, s, { ink = INK, outline = false, shirt = 'teal', hair = '#3A2A22', skin = 'skin', glasses = true, hairD = null, brows = false, chain = false } = {}) {
    const outer = el('g', { transform: `translate(${x},${y}) scale(${s})` }, parent);
    const w = 6.5 / s, f = k => outline ? 'none' : H(k);
    const g = el('g', {}, outer), sq = el('g', {}, g);
    const c = { g, sq, outer, k: s, emoteAt: [62, -300], parts: [] };
    const add = (d, o) => { const p = P(sq, d, { color: ink, w, ...o }); c.parts.push(p); return p; };
    add('M-18,-72 L-21,-8', { w: w * 1.6 }); add('M18,-72 L21,-8', { w: w * 1.6 });
    add('M-38,-2 Q-24,-18 -8,-4 Z', { fill: outline ? 'none' : ink }); add('M38,-2 Q24,-18 8,-4 Z', { fill: outline ? 'none' : ink });
    c.armG = { L: el('g', {}, sq), R: el('g', {}, sq) };
    const shirtCol = HATCH[shirt] ? HATCH[shirt][0] : shirt;
    const arm = (G, sx) => {
      c.parts.push(P(G, `M${48 * sx},-146 L${73 * sx},-90`, { color: ink, w: w * 3.2 }));
      if (!outline) c.parts.push(P(G, `M${48 * sx},-146 L${73 * sx},-90`, { color: shirtCol, w: w * 1.7 }));
      c.parts.push(P(G, `M${73 * sx - 10},-86 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0`, { color: ink, w: w * 0.8, fill: f(skin) }));
    };
    arm(c.armG.L, -1); arm(c.armG.R, 1);
    c.hand = { L: el('g', { transform: 'translate(-74,-86)' }, c.armG.L), R: el('g', { transform: 'translate(74,-86)' }, c.armG.R) };
    add('M-50,-158 Q0,-178 50,-158 L58,-62 Q0,-48 -58,-62 Z', { fill: HATCH[shirt] ? f(shirt) : (outline ? 'none' : shirt) });
    add('M-44,-214 a44,44 0 1,0 88,0 a44,44 0 1,0 -88,0', { fill: f(skin) });
    add(hairD || 'M-46,-222 Q-44,-270 0,-264 Q46,-270 47,-220 Q32,-242 16,-232 Q0,-252 -14,-234 Q-30,-248 -46,-222 Z', { fill: outline ? 'none' : hair });
    if (brows) { add('M-30,-229 Q-18,-236 -6,-231', { w: w * 1.1 }); add('M6,-231 Q18,-236 30,-229', { w: w * 1.1 }); }
    if (chain) add('M-18,-160 Q0,-128 18,-160', { color: '#C9CDD2', w: w * 0.6 });
    if (glasses) { add('M-31,-212 a14,14 0 1,0 28,0 a14,14 0 1,0 -28,0'); add('M3,-212 a14,14 0 1,0 28,0 a14,14 0 1,0 -28,0'); add('M-3,-214 L3,-214', { w: w * 0.7 }); }
    c.armP = { L: 0, R: 0 };
    updaters.push(() => {
      c.armG.L.setAttribute('transform', `rotate(${c.armP.L.toFixed(2)} -48 -146)`);
      c.armG.R.setAttribute('transform', `rotate(${c.armP.R.toFixed(2)} 48 -146)`);
    });
    buildFace(c, el('g', {}, sq), [[-17, -211], [17, -211]], [0, -184], ink, false);
    gsap.set(c.eyesWrap, { scaleY: 0, transformOrigin: '50% 50%' });
    return c;
  }
  function drawPerson(c, at, dur = 1.2) {
    const n = c.parts.length;
    c.parts.forEach((p, i) => draw(p, at + (i / n) * dur * 0.85, dur * 0.2, { sound: i === 0 }));
    tl.to(c.eyesWrap, { scaleY: 1, duration: S(0.25), ease: 'back.out(3)' }, S(at + dur + 0.1));
  }
  function popPerson(c, at, { sound = 'boing' } = {}) {
    c.parts.forEach(done);
    gsap.set(c.g, { scale: 0, transformOrigin: '50% 100%' });
    tl.fromTo(c.g, { scale: 0 }, { scale: 1, duration: S(0.55), ease: 'back.out(2.4)', immediateRender: false }, S(at));
    tl.to(c.eyesWrap, { scaleY: 1, duration: S(0.2), ease: 'back.out(3)' }, S(at + 0.35));
    if (sound) sfx(sound, at, { gain: 0.7 });
  }
  // external art (e.g. a vectorised reference character): an <image> or inline SVG that pops/moves like any group
  function image(parent, href, x, y, w, h) { return el('image', { href, x, y, width: w, height: h }, parent); }

  /* ---------- scenes: outer (finale) > inner (transitions) > cam (drift/shake) > bg + content ---------- */
  const SC = [];
  function newScene(bgFn, { filter = 'url(#rough)' } = {}) {
    const outer = el('g', { 'clip-path': 'url(#screenClip)' }, scenesL);
    const inner = el('g', {}, outer), cam = el('g', {}, inner), bg = el('g', {}, cam);
    (typeof bgFn === 'string' ? BG[bgFn] : bgFn)(bg);
    const content = el('g', { filter }, cam);
    const border = el('rect', { width: W, height: Hh, rx: 70, fill: 'none', stroke: '#F7F1E6', 'stroke-width': 26, opacity: 0 }, outer);
    gsap.set(outer, { display: 'none' });
    const sc = { outer, inner, cam, bg, content, g: content, border, i: SC.length, t0: null, t1: null, camFn: null };
    SC.push(sc);
    return sc;
  }
  const show = (sc, at) => { if (sc.t0 == null) sc.t0 = S(at); tl.set(sc.outer, { display: 'inline' }, S(at)); };
  const hide = (sc, at) => { if (sc.t1 == null) sc.t1 = S(at); tl.set(sc.outer, { display: 'none' }, S(at)); };
  const hsh = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const camZ = (sc, t) => 1.025 + 0.05 * Math.min(1, Math.max(0, (t - sc.t0) / ((sc.t1 ?? sc.t0 + 8) - sc.t0)));
  const FIN = { on: 0 };
  updaters.push(T => {
    const seed = 1 + (Math.floor(T * 12) % 7);                   // living line: wobble re-seeds 12x/s
    document.getElementById('roughN').setAttribute('seed', seed);
    document.getElementById('chalkN').setAttribute('seed', seed + 3);
    for (const sc of SC) {
      if (FIN.on || sc.t0 == null) { sc.cam.setAttribute('transform', ''); continue; }
      let z, fx = CX, fy = CY;
      if (sc.camFn) ({ z, fx, fy } = sc.camFn(T)); else z = camZ(sc, T);
      let dx = 0, dy = 0;
      for (const b of STRONG) { const d = T - b; if (d >= 0 && d < 0.35) { const k = Math.exp(-d / 0.07) * 7; dx += (hsh(b * 13) - .5) * 2 * k; dy += (hsh(b * 7 + 3) - .5) * 2 * k; } }
      sc.cam.setAttribute('transform', `translate(${CX} ${CY}) scale(${z.toFixed(4)}) translate(${(-fx + dx).toFixed(2)} ${(-fy + dy).toFixed(2)})`);
    }
  });

  const R = (g, a) => el('rect', Object.assign({ x: -60, y: -60, width: W + 120, height: Hh + 120 }, a), g);
  const BG = {
    paper(g) { R(g, { fill: PAL.paper }); R(g, { filter: 'url(#grain)', opacity: .5 }); specks(g, 11); },
    chalk(g) {
      R(g, { fill: '#1F2823' });
      [[.23, .22, 380, 160], [.7, .6, 460, 200], [.39, .83, 420, 170], [.81, .16, 260, 120]].forEach(([x, y, rx, ry]) => el('ellipse', { cx: x * W, cy: y * Hh, rx, ry, fill: '#DDE6DF', opacity: .07, filter: 'url(#soft)' }, g));
      R(g, { filter: 'url(#grain)', opacity: .35 }); specks(g, 5, 90, '#E8EDE6');
    },
    sepia(g) {
      R(g, { fill: '#E7D3A9' }); R(g, { filter: 'url(#grain)', opacity: .7 });
      [[.17, .86, 90], [.83, .14, 60], [.89, .78, 40]].forEach(([x, y, r]) => el('circle', { cx: x * W, cy: y * Hh, r, fill: 'none', stroke: '#9C7440', 'stroke-width': 6, opacity: .18 }, g));
      R(g, { fill: 'url(#sepiaVig)' }); specks(g, 23, 90, '#5a3a14');
    },
    graph(g) { R(g, { fill: '#F8FAFD' }); R(g, { fill: 'url(#graphMinor)' }); R(g, { fill: 'url(#graphMajor)' }); },
    notebook(g) {
      R(g, { fill: '#FBFAF4' });
      for (let y = 250; y < Hh + 60; y += 70) el('line', { x1: -60, x2: W + 60, y1: y, y2: y, stroke: '#BCD0EC', 'stroke-width': 2.5 }, g);
      el('line', { x1: 96, x2: 96, y1: -60, y2: Hh + 60, stroke: '#E9A3A3', 'stroke-width': 3 }, g);
      R(g, { filter: 'url(#grain)', opacity: .3 });
    },
    blue(g) { R(g, { fill: '#2F5FC4' }); R(g, { fill: 'url(#halftone)' }); },
    kraft(g) { R(g, { fill: '#C49E6C' }); R(g, { filter: 'url(#fibers)', opacity: .8 }); R(g, { filter: 'url(#grain)', opacity: .6 }); },
    blueprint(g) { R(g, { fill: '#15335B' }); R(g, { fill: 'url(#bpMinor)' }); R(g, { fill: 'url(#bpMajor)' });
      el('rect', { x: 40, y: 40, width: W - 80, height: Hh - 80, fill: 'none', stroke: '#fff', 'stroke-opacity': .35, 'stroke-width': 3 }, g); },
    solid: color => g => R(g, { fill: color }),
    sunburst(color = '#E8874F', rayColor = '#F29A62') { return g => { R(g, { fill: color }); const rg = el('g', {}, g);
      for (let k = 0; k < 18; k++) { const a1 = k / 18 * Math.PI * 2, a2 = a1 + Math.PI / 36, L = Math.max(W, Hh) * 1.4;
        rg.insertAdjacentHTML('beforeend', `<path d="M${CX},${CY} L${CX + Math.cos(a1) * L},${CY + Math.sin(a1) * L} L${CX + Math.cos(a2) * L},${CY + Math.sin(a2) * L} Z" fill="${rayColor}"/>`); }
      g._rays = rg; }; },
  };

  /* ---------- motivated transitions: each returns the new time cursor ---------- */
  const TR = {
    // camera flies into a point (e.g. the mascot's eye); the dark pupil becomes the next scene
    zoomInto(from, to, t, { x, y }) {
      t = align(t, 0.55); const at = t;
      hide(from, at + 0.75);
      const z = camZ(from, S(at + 0.05)), px = CX + (x - CX) * z, py = CY + (y - CY) * z;
      tl.to(from.inner, { scale: 60, svgOrigin: `${px} ${py}`, duration: S(0.6), ease: 'power4.in' }, S(at + 0.05));
      sfx('whoosh_in', at - 0.3, { gain: 0.9 });
      show(to, at + 0.55);
      tl.fromTo(to.inner, { opacity: 0 }, { opacity: 1, duration: S(0.2), immediateRender: false }, S(at + 0.55));
      return at + 0.75;
    },
    // a felt eraser wipes left→right, revealing the next scene underneath
    eraser(from, to, t) {
      t = align(t, 0.0); const at = t, Wd = 0.7;
      const cp = el('clipPath', { id: 'wipe' + to.i, clipPathUnits: 'userSpaceOnUse' }, defs);
      const r = el('rect', { x: 0, y: 0, width: 0, height: Hh }, cp);
      to.inner.setAttribute('clip-path', `url(#wipe${to.i})`);
      const er = el('g', { opacity: 0 }, screenL);
      er.innerHTML = `<g transform="rotate(-8)"><rect x="-70" y="-190" width="140" height="380" rx="18" fill="#7C5A3C"/><rect x="-70" y="-190" width="140" height="70" rx="18" fill="#9A7350"/><rect x="-78" y="110" width="156" height="90" rx="10" fill="#EDE8DE"/></g>`;
      show(to, at); tl.set(er, { opacity: 1 }, S(at));
      tl.fromTo(r, { attr: { width: 0 } }, { attr: { width: W }, duration: S(Wd), ease: 'power2.inOut' }, S(at));
      tl.fromTo(er, { x: -80, y: CY }, { x: W + 80, duration: S(Wd), ease: 'power2.inOut' }, S(at));
      tl.to(er, { y: CY - 260, duration: S(Wd / 4), yoyo: true, repeat: 3, ease: 'sine.inOut' }, S(at));
      tl.set(er, { opacity: 0 }, S(at + Wd)); tl.set(to.inner, { attr: { 'clip-path': 'none' } }, S(at + Wd));
      sfx('erase', at, { dur: Wd }); hide(from, at + Wd);
      return at + Wd;
    },
    // an object falls out of frame and the camera whips down after it (vertical motion blur)
    whipDown(from, to, t, { drop = null } = {}) {
      t = align(t, 0.3); const at = t;
      if (drop) { tl.to(drop, { y: -50, rotation: -12, duration: S(0.12), ease: 'power2.out' }, S(at)); tl.to(drop, { y: 700, rotation: 25, duration: S(0.35), ease: 'power2.in' }, S(at + 0.12)); }
      show(to, at + 0.3);
      tl.set([from.outer, to.outer], { attr: { filter: 'url(#vblur)' } }, S(at + 0.3));
      tl.fromTo('#vblurS', { attr: { stdDeviation: '0 0' } }, { attr: { stdDeviation: '0 50' }, duration: S(0.2), ease: 'power2.in', yoyo: true, repeat: 1, immediateRender: false }, S(at + 0.3));
      tl.fromTo(from.inner, { y: 0 }, { y: -Hh, duration: S(0.4), ease: 'power3.inOut', immediateRender: false }, S(at + 0.3));
      tl.fromTo(to.inner, { y: Hh }, { y: 0, duration: S(0.4), ease: 'power3.inOut' }, S(at + 0.3));
      tl.set([from.outer, to.outer], { attr: { filter: 'none' } }, S(at + 0.7));
      sfx('whoosh_down', at + 0.25); hide(from, at + 0.7);
      return at + 0.7;
    },
    // a shape from the current scene (bar, card, button) swells to become the next background
    expand(from, to, t, { x, y, w, h, color }) {
      t = align(t, 0.45); const at = t;
      const rect = el('rect', { x, y, width: w, height: h, fill: color }, to.bg);
      to.bg.insertBefore(rect, to.bg.firstChild);
      show(to, at);
      const kids = [...to.bg.children].filter(n => n !== rect);
      gsap.set(kids, { opacity: 0 });
      tl.fromTo(rect, { attr: { x, y, width: w, height: h } }, { attr: { x: -60, y: -60, width: W + 120, height: Hh + 120 }, duration: S(0.45), ease: 'expo.inOut' }, S(at));
      tl.to(kids, { opacity: 1, duration: S(0.3) }, S(at + 0.4));
      if (to.bg._rays) tl.fromTo(to.bg._rays, { rotation: 0 }, { rotation: 40, svgOrigin: `${CX} ${CY}`, duration: S(8), ease: 'none', immediateRender: false }, S(at + 0.4));
      sfx('swell', at - 0.2); hide(from, at + 0.45);
      return at + 0.45;
    },
    // screen shakes, then a sheet of paper slides up over it
    slideUp(from, to, t) {
      t = align(t, 0.2); const at = t;
      tl.to(from.inner, { x: 14, duration: S(0.03), yoyo: true, repeat: 5, ease: 'none' }, S(at + 0.18));
      sfx('boom', at + 0.18);
      show(to, at + 0.3);
      const sl = { y: Hh + 180, r: 9 }, t0 = S(at + 0.3), t1 = S(at + 0.8);
      tl.to(sl, { y: 0, r: 0, duration: S(0.5), ease: 'power3.out' }, t0);
      updaters.push(T => { if (T < t0) return; to.inner.setAttribute('transform', T >= t1 ? '' : `rotate(${sl.r.toFixed(3)} ${CX} ${Hh}) translate(0 ${sl.y.toFixed(2)})`); });
      sfx('paper', at + 0.3); hide(from, at + 0.8);
      return at + 0.8;
    },
    // an ink circle bursts out of a point
    iris(from, to, t, { x, y }) {
      t = align(t, 0.55); const at = t;
      const cp = el('clipPath', { id: 'iris' + to.i, clipPathUnits: 'userSpaceOnUse' }, defs);
      const c = el('circle', { cx: x, cy: y, r: 0 }, cp);
      to.inner.setAttribute('clip-path', `url(#iris${to.i})`);
      show(to, at);
      tl.fromTo(c, { attr: { r: 0 } }, { attr: { r: Math.hypot(W, Hh) }, duration: S(0.55), ease: 'power3.in' }, S(at));
      tl.set(to.inner, { attr: { 'clip-path': 'none' } }, S(at + 0.55));
      sfx('splash', at); hide(from, at + 0.55);
      return at + 0.55;
    },
    // something (a speech bubble) balloons and bursts; the next scene drops in with a bounce
    burstDrop(from, to, t, { burst = null } = {}) {
      t = align(t, 0.25); const at = t;
      if (burst) { tl.to(burst, { scale: 1.2, duration: S(0.2), ease: 'power2.out', transformOrigin: '50% 50%' }, S(at)); tl.to(burst, { scale: 0, opacity: 0, duration: S(0.1), ease: 'power2.in' }, S(at + 0.2)); }
      sfx('burst', at + 0.22);
      show(to, at + 0.25);
      tl.fromTo(to.inner, { y: -Hh - 30 }, { y: 0, duration: S(0.6), ease: 'bounce.out' }, S(at + 0.25));
      sfx('thud', at + 0.5); sfx('thud', at + 0.7, { gain: 0.45 });
      hide(from, at + 0.85);
      return at + 0.85;
    },
    // the whole frame flips like a card; the next scene is on the back
    flip(from, to, t) {
      t = align(t, 0.22); const at = t;
      const f = { a: 1, b: 0, on: 0 }, end = S(at + 0.5);
      const M = k => `translate(${CX} ${CY}) scale(${Math.max(k, 0.0001)} ${0.94 + 0.06 * k}) translate(${-CX} ${-CY})`;
      updaters.push(T => { if (f.on) { from.inner.setAttribute('transform', M(f.a)); to.inner.setAttribute('transform', M(f.b)); } else if (T >= end) to.inner.setAttribute('transform', ''); });
      tl.set(f, { on: 1 }, S(at));
      tl.to(f, { a: 0, duration: S(0.22), ease: 'power2.in' }, S(at));
      sfx('flip', at);
      hide(from, at + 0.22); show(to, at + 0.22);
      tl.to(f, { b: 1, duration: S(0.28), ease: 'power2.out' }, S(at + 0.22));
      tl.set(f, { on: 0 }, S(at + 0.5));
      return at + 0.5;
    },
    // warm white flash
    flash(from, to, t) {
      t = align(t, 0.25); const at = t, fl = document.getElementById('flash');
      tl.to(fl, { opacity: 1, duration: S(0.25), ease: 'power2.in' }, S(at));
      sfx('riser', at - 0.5, { dur: 0.75 });
      hide(from, at + 0.25); show(to, at + 0.25);
      tl.to(fl, { opacity: 0, duration: S(0.4), ease: 'power2.out' }, S(at + 0.28));
      sfx('shimmer', at + 0.22);
      return at + 0.4;
    },
  };

  /* ---------- finale: every scene flies into one storyboard mosaic ---------- */
  function finale(t, { resets = [], cta = null } = {}) {
    t = align(t, 0.0); const at = t;
    const n = SC.length, cols = n > 9 ? 4 : n > 4 ? 3 : 2, rows = Math.ceil(n / cols);
    const s = Math.min((W - (cols + 1) * 14) / cols / W, (Hh * 0.74 - (rows + 1) * 16) / rows / Hh);
    const cw = W * s, ch = Hh * s, gx = (W - cols * cw) / (cols + 1), top = 90;
    const slot = i => { const r = Math.floor(i / cols), inRow = Math.min(cols, n - r * cols), x0 = (W - (inRow * cw + (inRow - 1) * gx)) / 2;
      return { x: x0 + (i % cols) * (cw + gx), y: top + r * (ch + 16) }; };
    tl.to('#finaleBg', { opacity: 1, duration: S(0.2) }, S(at));
    tl.set('#screenClipR', { attr: { rx: 70 } }, S(at));
    const last = n - 1;
    const px = SC.map((sc, i) => { const p = slot(i);
      return i === last ? { x: 0, y: 0, s: 1, r: 0, o: 1, tx: p.x, ty: p.y } : { x: p.x + (i % 2 ? 320 : -320), y: p.y + 1000, s, r: (i % 2 ? 14 : -14), o: 0, tx: p.x, ty: p.y }; });
    updaters.push(() => SC.forEach((sc, i) => {
      if (!FIN.on) { sc.outer.removeAttribute('transform'); sc.outer.removeAttribute('opacity'); return; }
      const q = px[i];
      sc.outer.setAttribute('transform', `translate(${q.x} ${q.y}) rotate(${q.r} ${CX * q.s} ${CY * q.s}) scale(${q.s})`);
      sc.outer.setAttribute('opacity', q.o);
      sc.inner.setAttribute('transform', ''); sc.inner.setAttribute('opacity', 1); sc.inner.setAttribute('clip-path', 'none');
      sc.outer.removeAttribute('filter');
    }));
    tl.set(FIN, { on: 1 }, S(at));
    SC.forEach((sc, i) => {
      const q = px[i];
      if (i === last) tl.to(q, { x: q.tx, y: q.ty, s, duration: S(1.1), ease: 'power3.inOut' }, S(at));
      else { show(sc, at); tl.to(q, { x: q.tx, y: q.ty, r: 0, o: 1, duration: S(0.8), ease: 'back.out(1.4)' }, S(at + 0.5 + i * 0.09)); }
      tl.to(sc.border, { opacity: 1, duration: S(0.3) }, S(at + 0.4));
    });
    resets.forEach(([target, vars]) => tl.set(target, vars, S(at)));   // undo transition leftovers (dropped props, popped bubbles)
    sfx('whoosh', at); for (let i = 0; i < n - 1; i++) sfx('card', at + 0.5 + i * 0.09, { gain: 0.5 });
    const layer = el('g', {}, screenL);
    if (cta) cta(layer, at);
    return at + 6.2;
  }

  /* ---------- tools follow whichever stroke is being drawn ---------- */
  function placeTools(tt) {
    let s = null;
    for (const st of strokes) if (st.tool && tt >= st.start && tt < st.start + st.dur) s = st;
    for (const k in toolEls) toolEls[k].setAttribute('visibility', 'hidden');
    if (!s) return;
    const p = (tt - s.start) / s.dur;
    let pt;
    if (s.kind === 'path') { const q = s.node.getPointAtLength(s.node._len * s.ease(p)); pt = toRoot(s.node, q.x, q.y); }
    else { const b = s.node._b; pt = toRoot(s.node, b.x + b.width * p, b.y + b.height * (0.62 + 0.14 * Math.sin(tt * 38))); }
    const te = toolEls[s.tool];
    if (s.tool === 'marker') te.querySelectorAll('.tip').forEach(n => n.setAttribute('fill', s.color));
    te.setAttribute('transform', `translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)})`);
    te.setAttribute('visibility', 'visible');
  }

  const V = {
    W, Hh, CX, CY, PAL, INK, H, S, tl, BEAT, MODE, defs, screen: screenL,
    el, P, done, draw, T, write, pop, popIn, type, comic, stamp, stampFx, wobble, specks, mover, jump, bubble, image, sfx, align,
    face, emote, arms, wave, blink, wink, hop, wiggle, take,
    mascot, drawMascot, popMascot, person, drawPerson, popPerson,
    newScene, show, hide, camZ, BG, TR, finale, addHatch,
    setTool: name => { state.tool = name; },
    onFrame: fn => updaters.push(fn),
  };
  const end = await build(V);
  tl.to({}, { duration: 0.01 }, S(end ?? 0));

  function renderAt(tt) { tl.seek(tt, true); updaters.forEach(f => f(tt)); placeTools(tt); }
  window.VW = W; window.VH = Hh;
  window.DURATION = tl.duration();
  window.SFX = SFX; window.HITS = HITS;
  window.renderAt = renderAt;
  window.READY = true;
  if (!params.has('render')) {
    document.body.classList.add('preview');
    const fitK = () => document.documentElement.style.setProperty('--k', Math.min(innerWidth / W, innerHeight / Hh) * 0.96);
    fitK(); addEventListener('resize', fitK);
    const t0 = performance.now();
    gsap.ticker.add(() => renderAt(((performance.now() - t0) / 1000) % window.DURATION));
  } else renderAt(0);
};
})();
