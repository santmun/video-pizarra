// Ejemplo del MODO HISTORIA: un solo plano, la mascota es un personaje continuo y la cámara la sigue por 3 estilos.
// Tema genérico (productividad). Léelo junto con references/historia.md y cópialo como punto de partida.
import * as L from './engine/lib.js';
import { title, layoutRich } from './engine/base.js';
import { skin, laptop, desk, pencil, room, mug, key, doodle, strike, confetti } from './props.js';

const W = 1920, H = 1080, FLOOR = 850;
const T = (K, str, box, p, o = {}) => title(K, str, box, p, { font: sz => K.S.type.display(sz), emFont: sz => (K.S.type.em || K.S.type.display)(sz), color: K.P.ink, emColor: K.P.accent, align: 'center', ...o });
function lay(K, str, box, o = {}) { // same layout as T → line count + rects of *emphasized* words
  const R = layoutRich(K.ctx, K.rich(str), box, { font: sz => K.S.type.display(sz), emFont: sz => (K.S.type.em || K.S.type.display)(sz), max: (o.max || 190) * K.u, min: 18 * K.u, lh: K.S.lh ?? 1.02, ls: K.S.ls ?? -0.02, upper: K.S.upper });
  const tot = R.lines.length * R.lh, y0 = box.y + (box.h - tot) / 2, em = [];
  R.lines.forEach((ln, i) => { const x0 = o.align === 'left' ? box.x : box.x + (box.w - R.widths[i]) / 2; ln.forEach(t => t.em && em.push({ x: x0 + t.x - 8, y: y0 + i * R.lh + R.size * 0.18, w: t.width + 16, h: R.size * 0.78 })); });
  return { n: R.lines.length, em, box: { x: box.x, y: y0, w: box.w, h: tot } };
}
// a title written by hand, with a marker pass on the *emphasized* words (p can go past 1)
function TW(K, str, box, p, o = {}, tool = 'pencil') { const lo = lay(K, str, box, o); lo.em.forEach(r => L.highlightOn(K.ctx, r, L.clamp((p - 0.8) / 0.3), 'rgba(255,214,0,.6)')); L.writeOn(K.ctx, () => T(K, str, box, 1, o), lo.box, L.clamp(p / 0.8), { tool, lines: lo.n }); }
const walk = t => ({ walk: t * 18, armL: 25 + 20 * Math.sin(t * 18), armR: 25 - 20 * Math.sin(t * 18), hop: Math.abs(Math.sin(t * 9)) * 8 });
function hop(t, pts, hgt = 110, dur = 0.35) { if (t <= pts[0][2]) return pts[0]; for (let i = 1; i < pts.length; i++) { const [x, y, ta] = pts[i], [px, py] = pts[i - 1]; if (t < ta - dur) return [px, py]; if (t < ta) { const q = (t - ta + dur) / dur; return [L.lerp(px, x, L.E.inOut(q)), L.lerp(py, y, q) - Math.sin(q * Math.PI) * hgt]; } } return pts[pts.length - 1]; }
const LAP = { x: 610, y: FLOOR - 465, w: 700 }, SCR = { x: 645, y: 420, w: 630, h: 364 };
const KEYS = 'FOCO', KW = 190, KX0 = 560, KY = 700;

export default {
  style: 'acuarela', format: '16:9', fps: 30, camera: false, chrome: false,
  person: false, mascot: 'blob', actor: { x: 960, y: FLOOR, h: 180 },
  scenes: [
    // 1 · la laptop muestra el problema; la mascota sale de la pantalla y cae junto a la taza
    { style: 'acuarela', type: 'story', dur: 4.2, say: 'Mi calendario estaba lleno… y no avanzaba nada.',
      cam: t => ({ z: 1 + 0.12 * L.E.inOut(L.clamp(t / 2)) * (1 - L.E.inOut(L.clamp((t - 2.2) / 1))), x: 960, y: 580 }),
      render(K, s, h) { const sk = skin(K); room(K, sk, { t: s.t }); desk(K, FLOOR, -20, W + 20, sk); const scr = laptop(K, LAP.x, LAP.y, LAP.w, sk);
        for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { const p = h.A(0.2 + (r * 5 + c) * 0.06, 0.2); if (p > 0) { const b = new Path2D(); b.rect(scr.x + 30 + c * 118, scr.y + 30 + r * 80, 104 * p, 62); sk.fill(b, ['#E9CBBB', '#CFE0E4', '#F2D6A8'][(r + c) % 3]); } }
        mug(K, 1470, FLOOR, s.t > 2.9 ? Math.sin((s.t - 2.9) * 22) * 0.25 * Math.exp(-(s.t - 2.9) * 4) : 0, sk); },
      actor(t) { if (t < 2.0) return { hide: true }; const q = L.clamp((t - 2.0) / 0.9), g = L.E.back(L.clamp((t - 2.0) / 0.35));
        return { x: L.lerp(960, 1250, L.E.inOut(q)), y: L.lerp(SCR.y + SCR.h * 0.85, FLOOR, q) - Math.sin(q * Math.PI) * 220, h: 180 * Math.max(0.05, g), clip: t < 2.3 ? SCR : null, pose: { armL: 50, armR: 50, eyes: t > 2.95 ? 'happy' : 'wide' } }; } },

    // 2 · cae a la hoja del cuaderno y tacha el "antes" arrastrando un plumón
    { style: 'cuaderno', type: 'story', dur: 4.2, trans: { type: 'drop', dur: 0.6 }, say: 'Juntas, correos, notificaciones: todo el día apagando fuegos.',
      render(K, s, h) { TW(K, 'Antes: *apagar fuegos*', { x: 160, y: 90, w: 1100, h: 170 }, s.t / 1.0, { align: 'left' });
        ['Juntas eternas', 'Correo abierto todo el día', 'Notificaciones'].forEach((it, i) => { const y = 440 + i * 170, t0 = 0.5 + i * 1.1, p = L.clamp((s.t - t0) / 0.8), ltr = i % 2 === 0;
          K.S.text(K, it, { x: 330, y: y - 95, w: 900, h: 80 }, h.A(0.2 + i * 0.2, 0.4), 'item', s, { align: 'left' }); if (p > 0) strike(K, ltr ? 320 : 1250 - 930 * p, y - 55, 930 * p, 1, '#E0483E'); }); },
      actor(t) { const i = Math.min(2, Math.max(0, Math.floor((t - 0.5) / 1.1))), lt = t - 0.5 - i * 1.1, ltr = i % 2 === 0, y = 440 + i * 170;
        if (t < 0.5) return { x: 320, y: 440, h: 110 };
        if (lt < 0.8) { const x = ltr ? L.lerp(320, 1250, lt / 0.8) : L.lerp(1250, 320, lt / 0.8); return { x, y, h: 110, pose: { ...walk(t), flip: !ltr }, after: (K, m) => pencil(K, ltr ? m.handL[0] : m.handR[0], ltr ? m.handL[1] : m.handR[1], 80, ltr ? Math.PI + 0.35 : -0.35, skin(K)) }; }
        const q = L.clamp((lt - 0.8) / 0.3); return { x: ltr ? 1280 : 290, y: i < 2 ? L.lerp(y, y + 170, q) - Math.sin(q * Math.PI) * 50 : y, h: 110, pose: { armL: 40, armR: 40, flip: !ltr } }; } },

    // 3 · teclas gigantes: cada brinco escribe una letra
    { style: 'minimal', type: 'story', dur: 3.4, trans: { type: 'pan', dur: 0.7 }, say: 'Hasta que cambié una sola cosa: bloques de foco.',
      render(K, s, h) { const n = L.clamp(Math.floor((s.t - 0.4) / 0.35) + 1, 0, 4); T(K, KEYS.slice(0, n) || ' ', { x: 160, y: 150, w: 1600, h: 320 }, 1, { reveal: 'none', max: 260 });
        [...KEYS].forEach((ch, i) => key(K, KX0 + i * (KW + 20), KY, KW, ch, s.t > 0.4 + i * 0.35 && s.t < 0.4 + i * 0.35 + 0.2 ? 1 : 0)); },
      actor(t) { const pts = [[KX0 + KW / 2, KY, 0]]; [...KEYS].forEach((_, i) => pts.push([KX0 + i * (KW + 20) + KW / 2, KY, 0.4 + i * 0.35])); const [x, y] = hop(t, pts, 80, 0.3); return { x, y, h: 130, pose: { armL: 40, armR: 40, eyes: t > 1.9 ? 'happy' : 'wide' } }; } },

    // 4 · el camino: la cámara acompaña a la mascota y cada parada se dibuja al llegar
    { style: 'cuaderno', type: 'story', dur: 5.0, trans: { type: 'pan', dur: 0.7 }, say: 'Noventa minutos sin interrupciones, pausa, y repetir.',
      cam: t => ({ z: 1, x: L.clamp(L.lerp(600, 1900, L.clamp((t - 0.3) / 4)) + 250, 960, 1900), y: 540 }),
      render(K, s, h) { const sk = skin(K), t = s.t; TW(K, 'El *método*', { x: 160, y: 90, w: 900, h: 170 }, t / 0.9, { align: 'left' });
        [['frame', '90 min de foco', 900], ['note', 'Pausa', 1400], ['page', 'Repetir', 1900]].forEach(([k, lab, x], i) => { const at = 1.0 + i * 1.3; L.writeOn(K.ctx, () => doodle(K, k, x, 470, 80, sk), { x: x - 100, y: 380, w: 200, h: 190 }, L.clamp((t - at) / 0.6), { lines: 2 }); L.writeOn(K.ctx, () => K.S.text(K, lab, { x: x - 220, y: 590, w: 440, h: 70 }, 1, 'step', s, { align: 'center' }), { x: x - 200, y: 595, w: 400, h: 60 }, L.clamp((t - at - 0.4) / 0.5)); }); },
      actor(t) { const x = L.lerp(600, 1900, L.clamp((t - 0.3) / 4)); return { x, y: FLOOR, h: 150, pose: t < 4.3 ? walk(t) : { armL: 70, armR: 70, eyes: 'happy' } }; } },

    // 5 · de regreso al cuarto: el cierre se pinta con pincel
    { style: 'acuarela', type: 'story', dur: 4.2, trans: { type: 'panL', dur: 0.8 }, say: 'Recuperé cuatro horas a la semana. Tu turno.',
      render(K, s, h) { const sk = skin(K); room(K, sk, { t: s.t }); desk(K, FLOOR, -20, W + 20, sk); mug(K, 1470, FLOOR, 0, sk);
        TW(K, 'Recuperé *4 horas*', { x: 640, y: 120, w: 680, h: 220 }, (s.t - 0.2) / 1.2, {}, 'brush'); confetti(K, s.t, 1.8, ['#C4663F', '#E9B44C', '#8FA7A1'], { n: 40 }); },
      actor(t) { return { x: 1100, y: FLOOR, h: 180, pose: t > 1.8 ? { armL: 70, armR: 70, hop: Math.abs(Math.sin(t * 8)) * 25, eyes: 'happy' } : { armR: 50 } }; } },
  ],
};
