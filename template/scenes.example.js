/* scenes.example.js — a complete, working example (the "Claude Opus 5.5 launched" video).
 * Copy to scenes.js and rewrite per topic. Story arc: HOOK → REVEAL → PROBLEM → TURN → PROOFS → TWIST → CTA.
 * Times passed to helpers are "script seconds" (the engine scales them by config.speed).
 */
bootVideo(async (V) => {
  const { el, P, T, H, PAL, INK, draw, write, pop, popIn, type, comic, stamp, wobble, mover, jump, bubble, sfx,
          face, emote, arms, wave, blink, wink, hop, wiggle, take,
          mascot, drawMascot, popMascot, person, popPerson,
          newScene, show, BG, TR, finale, setTool, tl, S, BEAT } = V;
  const { orange: ORANGE, blue: BLUE, green: GREEN, red: RED, purple: PURPLE, gray: GRAY, chalk: CHALK,
          chalkO: CHALK_O, chalkB: CHALK_B, sepia: SEPIA, graphite: GRAPHITE, cream: CREAM } = PAL;
  let t = 0;

  /* 1 · HOOK (paper + marker): talk to the viewer in the first second */
  const s1 = newScene('paper'); show(s1, 0); setTool('marker');
  { const g = s1.g, a = 0.1;
    write(T(g, 540, 460, '¡Hola!', { size: 170 }), a + 0.2, 0.7);
    const m = mover(g, 276, 600, 2.4), c = mascot(m.g, 0, 0, 1);
    drawMascot(c, a + 0.7, 1.2);
    face(c, a + 2.3, 'happy', { mouth: 'smile' }); wave(c, 'R', a + 2.3, 3, { from: 110, to: 70 });
    write(T(g, 540, 1180, 'soy Clawd,', { size: 120 }), a + 2.2);
    write(T(g, 540, 1300, 'la mascota de Claude', { size: 84, color: ORANGE }), a + 2.9);
    write(T(g, 540, 1500, 'y traigo noticias...', { size: 100 }), a + 4.1);
    draw(P(g, 'M200,1535 C400,1555 700,1520 880,1540', { color: BLUE, w: 8 }), a + 5.1, 0.4);
    face(c, a + 4.3, 'star', { mouth: 'grin', emote: '!' });
    wiggle(c, a + 4.4, 3); hop(c, a + 5.6, 2);
    t = a + 6.9;
  }
  const s2 = newScene('chalk', { filter: 'url(#chalk)' });
  // eye centre = mover pos + scale * (shape.offsetX + eye x, eye y)
  t = TR.zoomInto(s1, s2, t, { x: 276 + 2.4 * (10 + 133.5), y: 600 + 2.4 * 62 });

  /* 2 · REVEAL (chalkboard + chalk) */
  setTool('chalk');
  { const g = s2.g, a = t;
    write(T(g, 540, 520, '22 · septiembre · 2026', { size: 66, color: '#C9D2CC', cls: 'kalam' }), a + 0.2, 1.0);
    write(T(g, 540, 800, 'Claude', { size: 180, color: CHALK }), a + 1.2, 0.7);
    write(T(g, 540, 1070, 'Opus 5.5', { size: 250, color: CHALK_O }), a + 2.0, 0.9);
    draw(P(g, wobble(540, 990, 450, 190, 1.15, 2), { color: CHALK, w: 8 }), a + 3.0, 0.8);
    [[-1, -.2], [-1, .4], [-.7, -.9], [.7, -.9], [1, -.2], [1, .4]].forEach(([dx, dy], k) => {
      const x1 = 540 + dx * 520, y1 = 990 + dy * 250;
      draw(P(g, `M${x1},${y1} L${x1 + dx * 60},${y1 + dy * 60}`, { color: CHALK_O, w: 10 }), a + 3.8 + k * 0.06, 0.18, { sound: false, tool: null });
    });
    sfx('firework', a + 3.5);
    write(T(g, 540, 1340, '¡ya salió!', { size: 130, color: CHALK_B, rot: -6 }), a + 4.4, 0.7);
    write(T(g, 540, 1500, 'el primero de la familia 5.5', { size: 70, color: CHALK, cls: 'kalam' }), a + 5.3, 1.2);
    const m = mover(g, 790, 1590, 0.75), c = mascot(m.g, 0, 0, 1, { theme: null, ink: CHALK, ground: null, shadow: 'shadowW' });
    const flag = el('g', {}, c.hand.R);
    flag.innerHTML = `<path d="M0,0 L0,-150" stroke="${CHALK}" stroke-width="9" stroke-linecap="round"/><path d="M0,-150 L90,-125 L0,-100 Z" fill="none" stroke="${CHALK_O}" stroke-width="8"/>`;
    popMascot(c, a + 4.9); arms(c, a + 5.2, { R: -40 }); face(c, a + 5.6, 'star', { emote: 'sparkle' });
    const md = mover(g, 170, 1800, 0.62), d = person(md.g, 0, 0, 1, { ink: CHALK, outline: true });
    popPerson(d, a + 5.4, { sound: false }); face(d, a + 5.8, 'happy', { mouth: 'grin', take: false });
    for (let i = 0; i < 4; i++) { tl.to(d.armP, { L: 70, R: -70, duration: S(0.1) }, S(a + 6.0 + i * 0.26)); tl.to(d.armP, { L: 40, R: -40, duration: S(0.1) }, S(a + 6.1 + i * 0.26)); sfx('clap', a + 6.1 + i * 0.26, { gain: 0.7 }); }
    hop(c, a + 6.5, 2);
    t = a + 7.6;
  }
  const s3 = newScene('sepia');
  t = TR.eraser(s2, s3, t);

  /* 3 · PROBLEM (parchment + quill) */
  setTool('quill');
  let bag;
  { const g = s3.g, a = t;
    write(T(g, 540, 300, 'Hasta hoy, lo mejor', { size: 92, color: SEPIA }), a + 0.2, 0.8);
    write(T(g, 540, 415, 'era Fable 5.1', { size: 116, color: PURPLE }), a + 1.0, 0.7);
    draw(P(g, 'M320,1060 L320,640 Q540,560 760,640 L760,1060', { color: SEPIA, w: 7, fill: H('sepia') }), a + 1.5, 0.6);
    draw(P(g, 'M280,1060 L800,1060 L800,1120 L280,1120 Z', { color: SEPIA, w: 7, fill: H('sepia') }), a + 2.1, 0.25);
    const m = mover(g, 380.5, 812, 1.45), f = mascot(m.g, 0, 0, 1, { theme: 'purple', ink: SEPIA, ground: null, hat: 'crown' });
    drawMascot(f, a + 2.3, 0.8);
    face(f, a + 3.5, 'happy', { mouth: 'grin', emote: 'sparkle' });
    for (let i = 0; i < 5; i++) { tl.to(f.armP, { R: -45, duration: S(0.12) }, S(a + 3.9 + i * 0.5)); tl.to(f.armP, { R: 0, duration: S(0.15) }, S(a + 4.05 + i * 0.5)); sfx('clink', a + 4.05 + i * 0.5, { gain: 0.5 }); }
    write(T(g, 540, 1330, 'un genio...', { size: 80, color: SEPIA, cls: 'kalam' }), a + 3.9, 0.6);
    write(T(g, 540, 1460, '...pero carísimo', { size: 116, color: RED }), a + 4.7, 0.9);
    for (let i = 0; i < 4; i++) {
      const pm = mover(g, 110 + i * 140, 1760, 0.42), d = person(pm.g, 0, 0, 1, { ink: SEPIA });
      d.armP.R = -70; popPerson(d, a + 5.4 + i * 0.15, { sound: i === 0 ? 'boing' : false });
    }
    const bg = el('g', { transform: 'translate(900,1640)' }, g); bag = el('g', {}, bg);
    draw(P(bag, 'M0,-80 C-22,-80 -28,-62 -16,-50 C-80,-22 -80,70 0,70 C80,70 80,-22 16,-50 C28,-62 22,-80 0,-80 Z', { color: SEPIA, w: 6, fill: H('bag') }), a + 5.9, 0.4);
    write(T(bag, 0, 30, '$$$', { size: 62, color: GREEN }), a + 6.3, 0.3);
    t = a + 7.3;
  }
  const s4 = newScene('graph');
  t = TR.whipDown(s3, s4, t, { drop: bag });

  /* 4 · TURN (graph paper, no tool) */
  setTool(null);
  { const g = s4.g, a = t;
    pop(T(g, 540, 330, 'Opus 5.5 llega a su nivel', { size: 92 }), a + 0.1);
    pop(T(g, 540, 420, 'en casi todo el trabajo', { size: 64, color: GRAY, cls: 'kalam' }), a + 0.6, { rot: 6 });
    pop(T(g, 540, 600, 'y cuesta mucho menos correrlo:', { size: 70, color: BLUE }), a + 1.3);
    draw(P(g, 'M180,700 L180,1350 L920,1350', { w: 7 }), a + 2.0, 0.45, { sound: false });
    const b1 = el('rect', { x: 280, y: 760, width: 180, height: 590, fill: H('gray'), stroke: INK, 'stroke-width': 6 }, g);
    const b2 = el('rect', { x: 620, y: 1000, width: 180, height: 350, fill: H('orange'), stroke: INK, 'stroke-width': 6 }, g);
    gsap.set([b1, b2], { scaleY: 0, transformOrigin: '50% 100%' });
    tl.to(b1, { scaleY: 1, duration: S(0.8), ease: 'elastic.out(1,0.55)' }, S(a + 2.5)); sfx('rise', a + 2.5, { gain: 0.8 });
    pop(T(g, 370, 1425, 'Opus 5', { size: 64 }), a + 3.2, { sound: false });
    tl.to(b2, { scaleY: 1, duration: S(0.8), ease: 'elastic.out(1,0.55)' }, S(a + 3.6)); sfx('rise', a + 3.6, { gain: 0.8 });
    pop(T(g, 710, 1425, 'Opus 5.5', { size: 64, color: ORANGE }), a + 4.2, { sound: false });
    pop(T(g, 870, 800, '−40%', { size: 140, color: GREEN, rot: -4 }), a + 5.1, { rot: -25, sound: 'stamp' });
    const m = mover(g, 633, 876, 0.7), c = mascot(m.g, 0, 0, 1, { ground: null });
    popMascot(c, a + 5.6); face(c, a + 6.0, 'happy', { mouth: 'grin', emote: 'sparkle' }); hop(c, a + 6.3, 2);
    pop(T(g, 540, 1540, 'más barato de correr que Opus 5', { size: 60, cls: 'kalam' }), a + 5.4, { rot: 0, sound: false });
    t = a + 7.4;
  }
  const s5 = newScene(BG.sunburst('#E8874F', '#F29A62'));
  t = TR.expand(s4, s5, t, { x: 620, y: 1000, w: 180, h: 350, color: '#E8874F' });

  /* 5 · PROOF (orange sunburst, kinetic type) */
  { const g = s5.g, a = t;
    pop(T(g, 540, 320, 'Y además escribe', { size: 96, color: CREAM, stroke: INK }), a + 0.1);
    pop(T(g, 540, 500, '+30%', { size: 200, color: CREAM, stroke: INK }), a + 0.6, { sound: 'stamp' });
    pop(T(g, 540, 610, 'más rápido', { size: 90 }), a + 1.1, { rot: 6 });
    const rider = mover(g, -700, 1080, 1);
    tl.to(rider, { x: 540, duration: S(0.55), ease: 'power3.out' }, S(a + 1.3)); sfx('skate', a + 1.3, { dur: 3.8 });
    el('path', { d: 'M-230,40 Q-240,70 -200,72 L200,72 Q240,70 232,40 Z', fill: '#3B2A22', stroke: INK, 'stroke-width': 6 }, rider.g);
    const c = mascot(rider.g, -150, -166, 1.2, { theme: 'cream', ground: null });
    popMascot(c, a + 1.3, { sound: false }); face(c, a + 1.9, 'determined', { mouth: 'grin' });
    comic(g, 290, 800, '¡FIUUU!', a + 2.0, { color: '#FFF3C4', sound: 'whoosh' });
    t = a + 5.4;
  }
  const s6 = newScene('notebook');
  t = TR.slideUp(s5, s6, t);

  /* 6 · PROOF (notebook + pencil) — the full list stays readable */
  setTool('pencil');
  { const g = s6.g, a = t;
    write(T(g, 560, 290, 'Y le ganó a Fable 5.1 en:', { size: 86, color: GRAPHITE }), a + 0.2, 1.1);
    ['programación con agentes', 'trabajo de conocimiento', 'usar la computadora', 'leer gráficas', 'razonamiento multidisciplinario'].forEach((w, k) => {
      const y = 420 + k * 76;
      draw(P(g, `M150,${y - 42} L196,${y - 42} L196,${y + 4} L150,${y + 4} Z`, { color: GRAPHITE, w: 5 }), a + 1.3 + k * 0.34, 0.12, { sound: false });
      write(T(g, 220, y, w, { size: 52, anchor: 'start', color: GRAPHITE, cls: 'kalam' }), a + 1.4 + k * 0.34, 0.3);
      const tk = P(g, `M156,${y - 20} L171,${y - 2} L204,${y - 52}`, { color: GREEN, w: 10 });
      draw(tk, a + 3.6 + k * 0.5, 0.16, { sound: false }); sfx('tick', a + 3.6 + k * 0.5);
    });
    t = a + 6.8;
  }
  const s7 = newScene('blue');
  t = TR.iris(s6, s7, t, { x: 540, y: 1300 });

  /* 7 · PROOF (solid blue, chat bubbles + typewriter) */
  setTool(null);
  let answer;
  { const g = s7.g, a = t;
    pop(T(g, 540, 300, 'Habla más natural:', { size: 110, color: '#FFFFFF' }), a + 0.1);
    pop(T(g, 540, 400, 'pone lo importante primero', { size: 62, color: '#FFD27A', cls: 'kalam' }), a + 0.6, { rot: 0 });
    const m = mover(g, 640, 1520, 1.2), c = mascot(m.g, 0, 0, 1, { ground: null });
    popMascot(c, a + 1.0);
    answer = bubble(g, 520, 960, 1010, 1200, 800, 1500);
    popIn(answer, a + 1.4, { origin: '60% 100%' });
    type(T(answer, 565, 1036, 'lo importante,', { size: 44, anchor: 'start', cls: 'code' }), a + 1.8, 0.8, ORANGE);
    type(T(answer, 565, 1130, 'primero.', { size: 44, anchor: 'start', cls: 'code', color: '#5B554C' }), a + 2.6, 0.5);
    wink(c, a + 3.4);
    t = a + 4.6;
  }
  const s8 = newScene('kraft');
  t = TR.burstDrop(s7, s8, t, { burst: answer });

  /* 8 · PROOF (kraft + brush + rubber stamps) */
  setTool('brush');
  { const g = s8.g, a = t;
    write(T(g, 540, 330, '¿Y el precio?', { size: 116, color: '#2A1B10' }), a + 0.2, 0.8);
    draw(P(g, 'M470,690 L1010,690 L1010,960 L470,960 Z', { color: '#2A1B10', w: 8, fill: H('yellow') }), a + 1.0, 0.4);
    write(T(g, 740, 855, '$4 / $20', { size: 124, color: '#2A1B10' }), a + 1.4, 0.7);
    stamp(g, 930, 690, '−20%', a + 2.2, { color: '#1F7A4D', rot: -12 });
    pop(T(g, 740, 938, 'por millón de tokens (entrada / salida)', { size: 34, color: '#4A3420', cls: 'kalam' }), a + 2.6, { rot: 0, sound: false });
    t = a + 5.0;
  }
  const s9 = newScene('blueprint');
  t = TR.flip(s8, s9, t);

  /* 9 · PROOF (blueprint, self-drawing lines) */
  setTool(null);
  { const g = s9.g, a = t;
    pop(T(g, 540, 300, 'Y lo más importante:', { size: 96, color: '#FFFFFF' }), a + 0.1);
    const m = mover(g, 364, 520, 1.6), c = mascot(m.g, 0, 0, 1, { theme: null, ink: '#FFFFFF', ground: null });
    drawMascot(c, a + 0.4, 1.1);
    pop(T(g, 540, 1020, 'es el mejor portado', { size: 112, color: '#FFFFFF' }), a + 1.9, { sound: 'ding' });
    type(T(g, 540, 1120, 'mejor resultado en la auditoría', { size: 40, cls: 'code', color: '#BFD3F2' }), a + 2.5, 1.0);
    stamp(g, 560, 680, 'APROBADO', a + 3.8, { color: '#7EE2A8', rot: -12, size: 96 });
    t = a + 5.4;
  }
  const s10 = newScene('paper');
  t = TR.flash(s9, s10, t);

  /* 10 · TWIST (paper + marker again: bookend) */
  setTool('marker');
  { const g = s10.g, a = t;
    write(T(g, 540, 400, 'Plot twist:', { size: 130, color: RED, rot: -3 }), a + 0.2, 0.7);
    write(T(g, 540, 560, 'este video lo escribió,', { size: 86 }), a + 1.0, 1.0);
    write(T(g, 540, 660, 'dibujó y animó...', { size: 86 }), a + 2.0, 0.8);
    const m = mover(g, 331, 730, 1.9), c = mascot(m.g, 0, 0, 1);
    drawMascot(c, a + 2.8, 0.9);
    write(T(g, 540, 1240, 'Opus 5.5', { size: 170, color: ORANGE }), a + 4.1, 0.7);
    wink(c, a + 4.7); hop(c, a + 6.0, 2);
    t = a + 7.0;
  }

  /* FINALE + CTA */
  t = finale(t, {
    resets: [[bag, { y: 0, rotation: 0 }], [answer, { scale: 1, opacity: 1 }]],
    cta: (layer, at) => {
      const m = mover(layer, 460, 1480, 0.6), c = mascot(m.g, 0, 0, 1, { ground: null });
      popMascot(c, at + 1.7); face(c, at + 2.3, 'happy', { mouth: 'grin' }); hop(c, at + 2.6, 6, false);
      pop(T(layer, 540, 1780, 'Sígueme para más', { size: 112, color: '#FBF3E6' }), at + 2.1, { sound: 'ding' });
      pop(T(layer, 540, 1860, 'y comenta qué le pides primero', { size: 56, color: '#F5A57B', cls: 'kalam' }), at + 2.6, { rot: 4, sound: 'blip' });
    },
  });
  return t;
}, { speed: 0.8 });
