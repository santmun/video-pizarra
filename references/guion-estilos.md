# Guion: tipos de escena y cómo escribirlo

## Tipos de escena (campos)
Todos aceptan `dur` (segundos) y `say` (lo que se narra → subtítulos). En títulos, `*palabra*` = énfasis (cada estilo lo pinta a su manera: color, subrayado, marcatextos…). `\n` fuerza salto de línea.

| type | campos | para qué |
|---|---|---|
| `hook` | `title`, `kicker`, `prompt`, `person` (false para ocultar) | Apertura: promesa + persona + (opcional) una "caja de prompt" que se teclea |
| `statement` | `title`, `sub`, `kicker`, `mascot` | Una idea fuerte en grande |
| `chapter` | `kicker` ("01"), `title` | Separador de sección |
| `list` | `title`, `items[]` (2–5, ≤ 6 palabras c/u), `stagger` | Enumerar |
| `stat` | `value`, `from`, `prefix`, `suffix`, `decimals`, `label`, `kicker`, `countDur`, `mascot` | Cifra que cuenta hacia arriba |
| `compare` | `title`, `left:{title,items}`, `right:{title,items}` | Antes/después, mito/realidad, A vs B (izquierda = lo malo) |
| `quote` | `text`, `by`, `person` (true para mostrarla) | Testimonio o frase |
| `media` | `src`, `frame` (`phone`/`browser`/`plain`), `title`, `caption` | Captura real, prueba social, producto |
| `steps` | `title`, `items[]` (2–4) | Proceso/método |
| `cta` | `title`, `sub`, `button` | Cierre con llamada a la acción |

Nivel del video: `style`, `format` ('16:9' | '9:16'), `fps` (30), `person` ({photo, look} o false), `mascot`, `captions` (true/false), `words` (ruta a words.json o arreglo), `beats` (ruta a beats.json), `palette` (sobrescribe colores del estilo, p.ej. `{accent:'#00B3A4', bg:'#FFFFFF'}` para la marca), `font` (`{display:'Bebas Neue', body:'Poppins'}`, cualquier fuente de Google Fonts), `mascotColor` ('#hex'), `mascot` también acepta `{image:'assets/logo.png'}` (su logo o personaje como mascota).

## Escribir un guion que retenga
1. **Gancho en 3 s**: la escena 1 es un `hook` con la promesa o la sorpresa ("Nadie dibujó esto."). Nada de "hola, bienvenidos".
2. **Tensión → solución → prueba → acción**: problema (statement/compare), cómo se resuelve (list/steps), prueba real (stat/media/quote), CTA.
3. **Una idea por escena**. Si una frase tiene dos ideas, son dos escenas.
4. **El título en pantalla no repite la narración palabra por palabra**: la resume en ≤ 7 palabras con 1–2 palabras enfatizadas.
5. **Ritmo**: 2.5–3.5 s para frases cortas, 4–6 s para listas/pasos/capturas. Varía el tipo de escena cada vez.
6. **Cifras concretas** (con fuente del usuario) valen más que adjetivos.
7. **Duración de escena con voz en off**: la escena dura lo que tarda su frase + ~0.3 s.
8. Vertical (9:16): títulos aún más cortos; máximo 4 items en listas.

## Ejemplo de estructura (45 s)
hook 4.5 · statement 3 · compare 5 · list 5 · stat 4 · media 4.5 · quote 4 · steps 5 · chapter 3 · cta 4.5
