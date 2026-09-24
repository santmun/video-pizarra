# Modo historia (un solo plano con personaje continuo)

Úsalo para intros, historias, explicaciones con narrativa o cualquier video que deba sentirse **como una película y no como una presentación**. Las escenas tipo `list/stat/compare…` sirven para videos rápidos tipo listicle; el modo historia es lo que hace que el video "se sienta un solo video".

## La idea
- **Un personaje continuo** (`spec.actor`): la mascota nunca se corta. Se dibuja en una capa encima de todas las escenas con una sola trayectoria. Cada escena define dónde está y qué hace (`actor(t)`).
- **La cámara lo sigue** (`scene.cam(t)`): zoom y paneo dentro de la escena. El mundo puede ser más ancho que la pantalla (el fondo se repite solo).
- **Transiciones dentro de la historia** (`scene.trans`): la cámara viaja (pan, whip, drop), entra a un objeto (zoom), o el nuevo mundo se abre desde el personaje (iris). En un pan, el personaje cruza la frontera con medio cuerpo en cada estilo.
- **Cada escena = un escenario + una acción física**: el personaje interactúa con un objeto (lápiz gigante, teclas, marcador, bandera, lupa, caja de regalo…). Nada de "título + viñetas".
- **Se puede mezclar estilos** (`scene.style`): el mundo cambia de estilo alrededor del personaje.

## API
```js
import * as L from './engine/lib.js';
import { title, para, layoutRich } from './engine/base.js';
import { skin, laptop, desk, pencil, giftBox, doodle, strike, room, mug, drafting, key, flag, magnifier, confetti, panelBorder } from './props.js';

export default {
  style: 'acuarela', format: '16:9', camera: false, chrome: false,   // chrome:false = sin encabezados/rótulos de página del estilo
  mascot: 'clawd', actor: { x: 960, y: 850, h: 190 },                // "casa" del personaje en pantalla
  scenes: [
    { style: 'acuarela', type: 'story', dur: 4.5, say: '…',
      cam: t => ({ z: 1 + 0.1 * t / 4.5, x: 960, y: 560 }),             // opcional
      render(K, s, h) { /* dibuja el escenario y el texto; h.A(inicio, dur) = progreso 0→1; h.cue('pop', t) = sonido */ },
      actor(t) { return { x, y, h, pose: { armL, armR, walk, hop, sx, sy, rot, look: [dx, dy], eyes: 'happy'|'dot'|'wide'|'closed', flip }, mood, hide, clip: {x,y,w,h}, after: (K, m) => {/* objeto en la mano: m.handL, m.handR, m.top */} }; } },
    { style: 'patente', type: 'story', dur: 2.6, trans: { type: 'pan', dur: 0.8 }, … },
  ],
};
```
Transiciones (`trans.type`): `pan` (cámara a la derecha), `panL`, `whip` (pan rápido con estela), `drop` (baja a la siguiente página), `zoom` ({x, y, zoom}: entra a un punto), `iris` ({x, y}: se abre desde un punto, apúntalo al personaje), `sweep`, `flip`, `fade`, `cut`. Sin `trans` se usa la del estilo.

Poses útiles: caminar `{ walk: t*18, armL: 25+20*sin(t*18), armR: 25-20*sin(t*18) }` · celebrar `{ armL: 70, armR: 70, hop }` · señalar `{ armR: 50, look: [1,-0.4] }` · caer `{ sx: 1.18, sy: 0.8 }` (squash al aterrizar). **Los brazos son cortos: más de ~80° se esconden tras el cuerpo.**

## Dibujo en vivo (el lápiz que dibuja la escena)
`engine/lib.js`:
- `L.writeOn(ctx, draw, box, p, { tool: 'pencil'|'pen'|'marker'|'brush', lines })`: revela lo que dibuja `draw` de izquierda a derecha, línea por línea, con la herramienta en el borde. Sirve para títulos, listas, íconos y dibujos.
- `L.highlightOn(ctx, box, p, 'rgba(255,214,0,.6)')`: pasada de marcatextos (dibújala antes del texto).
- `L.circleOn(ctx, cx, cy, rx, ry, p, color)` y `L.underlineOn(ctx, x, y, w, p, color)`: tinta a mano que se dibuja sola, para señalar un dato o una captura.
- `L.drawTool(ctx, kind, x, y, escala)`: la herramienta sola (por ejemplo, en la mano del personaje).

Usa el dibujo en vivo en 2–4 momentos clave, no en todo: cuando el texto "se escribe", cuando algo se remarca (una cifra, una palabra, un dato en una captura).

## Props (`props.js`)
Todos toman el material del estilo activo con `skin(K)` (acuarela = acuarela, patente = achurado, manga = tinta gruesa, minimal = sombras suaves…): `room, desk, laptop, mug, drafting, key, pencil, giftBox, doodle, flag, magnifier, confetti, strike, panelBorder, bubble, check`. Crea los tuyos en el mismo patrón: un `Path2D` + `sk.fill(path, color)` + `sk.stroke(path)`.

## Receta para una escena
1. **Escenario** (fondo del estilo + 1–3 objetos del mundo).
2. **Una acción** del personaje con un objeto, que tenga sentido con la escena anterior (de dónde viene) y la siguiente (a dónde va).
3. **Un solo texto** grande (lo demás lo dicen los subtítulos).
4. **Posición de salida = posición de entrada** de la siguiente escena, o una transición que la justifique (salto, caída, carrera).
5. Varía el layout: texto a la izquierda, a la derecha, arriba, dentro de un marco, sobre un objeto. Personaje abajo, arriba de algo, en movimiento.

Ejemplo completo: `historia.example.js` (correlo con `node render.mjs --scenes --query "spec=historia.example.js"`).
