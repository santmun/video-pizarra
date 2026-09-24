---
name: video-pizarra
description: Crea videos animados estilo pizarrón / dibujo a mano (whiteboard) sobre CUALQUIER tema — con una mascota que actúa, texto escrito a plumón/gis/lápiz, fondos distintos por escena, transiciones creativas al ritmo de la música, efectos de sonido y un final tipo storyboard — todo generado con código (SVG + GSAP) y renderizado a MP4 vertical u horizontal. Antes de producir, entrevista al usuario (tema, fuentes, formato, personaje, imágenes de referencia, música, CTA) para asegurar un buen video. Úsalo cuando alguien pida "un video animado", "video tipo pizarrón", "whiteboard animation", "video explicativo animado", "video con dibujos", "video de noticia animado", "reel animado sobre X", "hazme un video de [tema] con una mascota", o quiera explicar un tema/noticia/lanzamiento/concepto en video corto sin grabarse, aunque no diga "pizarrón".
---

# video-pizarra

Convierte cualquier tema en un video animado de ~60–75 s que se siente dibujado a mano: una mascota que actúa, frases escritas en vivo, cada escena con su propio fondo y herramienta, transiciones que conectan una escena con la siguiente y caen en el beat de la música.

Todo el motor ya está hecho en `template/`. Tu trabajo es **entender bien el video que la persona quiere**, escribir una historia clara y construir las escenas con el API del motor. No reescribas el motor.

## Flujo

1. **Entrevista** (no te la saltes: es lo que separa un video bueno de uno genérico)
2. **Investigar y verificar datos**
3. **Storyboard → aprobación**
4. **Construir `scenes.js`**
5. **QA visual con capturas**
6. **Música, beats, efectos y render final**
7. **Entregar + caption**

---

## 1 · Entrevista

Usa la herramienta de preguntas (máx. 4 por tanda, cada una con opción recomendada primero). Si la persona ya respondió algo en su mensaje, no lo vuelvas a preguntar. Pregunta en el idioma del usuario.

**Tanda 1 — el contenido**
- **Tema y la UNA idea** que el espectador debe llevarse. ¿Hay links, artículos, notas o datos que el video deba usar? (Pídelos: los datos correctos importan más que la animación.)
- **Formato**: vertical 9:16 para Reels/TikTok/Shorts (recomendado) u horizontal 16:9 para YouTube.
- **Duración**: 45–60 s, 60–75 s (recomendado para explicar algo) o 90 s.
- **Tono y público**: divertido/cercano, serio/profesional, épico. ¿Para quién es?

**Tanda 2 — lo visual**
- **Personaje**: la mascota por defecto (un bicho cuadrado con bracitos), su propia mascota o marca, o sin mascota. ¿Quiere un segundo personaje humano que represente al espectador?
- **Imágenes de referencia**: pide explícitamente capturas de estilos que le gusten, su mascota/logo, colores de marca o un video de referencia. Léelas con Read y describe qué vas a tomar de cada una antes de seguir.
- **Colores / marca**: ¿paleta propia? ¿Debe llevar logo o nombre (o explícitamente NO)?
- **Idioma** del texto en pantalla.

**Tanda 3 — sonido y cierre**
- **Música**: generar con Suno (necesita `SUNO_API_KEY` de sunoapi.org), usar un mp3 propio (que lo ponga en `audio/music.mp3`) o sin música (solo efectos).
- **CTA final**: seguir + comentar (default para alcance), link en bio, producto/servicio, o ninguno.
- **Hook**: propón 2–3 hooks concretos para ESTE tema (ver `references/storytelling.md`) y deja que elija.

Cierra con un **resumen**: lo que respondió vs. lo que tú decidiste por defecto, en dos grupos separados. Si corrige algo, vuelve a mostrar el resumen antes de seguir.

## 2 · Investigar y verificar

- Si el tema es noticia o tiene cifras, busca fuentes (WebSearch/WebFetch) y anota cada dato con su fuente.
- Solo pon en pantalla datos que aparecen en las fuentes. **No calcules ni inventes cifras derivadas** (p. ej. "precio anterior" deducido de un porcentaje). Si un dato solo viene de medios secundarios, díselo a la persona.
- Guarda las fuentes: las necesitarás para el caption.

## 3 · Storyboard → aprobación

Lee `references/storytelling.md` y escribe `STORYBOARD.md` en la carpeta del proyecto: una tabla con, por escena, **fondo · herramienta · texto en pantalla · qué hace el personaje · transición de salida**. Muéstrale a la persona un resumen corto (una línea por escena) y **espera su aprobación** antes de animar. Cambiar un storyboard cuesta minutos; cambiar un video, horas.

Reglas que vienen de lo que ya funcionó (y de lo que no):
- **Hook en el primer segundo.** La primera frase aparece en ~0.2 s. Nada de intros lentas ni escenas de "contexto" antes del hook.
- **El texto explica, el personaje actúa.** Cada escena tiene un titular grande y claro arriba + una línea de apoyo. Los gags visuales refuerzan el texto; nunca lo reemplazan (un video "solo con acciones" no se entiende).
- **Una idea por escena**, en orden de historia: hook → revelación → problema → giro → pruebas → twist/cierre → CTA.
- **Fondos distintos** por escena y **herramienta distinta** (plumón, gis, pluma, lápiz, pincel) — y varias escenas **sin** herramienta (el texto rebota, se teclea o se estampa).
- **Transiciones motivadas y rápidas** (0.4–0.8 s): algo de la escena causa el paso a la siguiente (entrar al ojo, borrar, algo cae, una barra se expande, un círculo de tinta, algo revienta, la tarjeta se voltea, destello). No repitas la misma transición seguida.

## 4 · Construir

```bash
PROJ=~/Documents/<slug-del-video>      # o la carpeta que pida la persona
mkdir -p "$PROJ/audio" && cp -R ~/.claude/skills/video-pizarra/template/. "$PROJ/"
cd "$PROJ" && npm install && npx playwright install chromium
cp scenes.example.js scenes.js           # punto de partida: el ejemplo completo
```

Antes de escribir escenas, lee **`references/engine-api.md`** (API completo, coordenadas, transiciones, personajes, sonidos) y revisa `scenes.example.js`: es un video real terminado con todos los patrones. Reescribe `scenes.js` para el nuevo tema siguiendo el storyboard.

- Formato horizontal: `bootVideo(build, { width: 1920, height: 1080 })` y recalcula posiciones.
- Mascota propia: define su silueta con `mascotShape` (ver engine-api) a partir de la imagen de referencia; dibújala con formas simples (cuerpo, brazos, piernas, ojos) para que pueda actuar. Si es muy compleja, usa `image()` con un PNG transparente y anímala como bloque.
- Colores de marca: `palette` y `hatches` en la config.
- Previsualiza en vivo con `npx serve .` (o cualquier servidor estático) y abre `index.html`.

## 5 · QA visual (obligatorio antes del render final)

```bash
node render.mjs --every 1.2 && python3 contact.py 10    # hoja de contacto de todo el video
```
Abre `contact.jpg` con Read. Revisa: texto cortado o encimado, personajes tapando texto, escenas en negro/vacías, elementos fuera de cuadro, legibilidad en teléfono. Para las transiciones: `node render.mjs --stills 12.1,12.3,12.5` alrededor de cada una. Corrige y vuelve a revisar. Los errores típicos y sus soluciones están en `references/lessons.md` — léelo si algo se ve raro.

## 6 · Música, beats, efectos y render

- **Suno** (si hay key): `python3 suno_music.py "<estilo>" "<título>" audio/music.mp3` (instrumental, 100–120 BPM, pulso claro, acorde al tono).
- **Beats**: `python3 -m venv .venv && .venv/bin/pip install librosa && .venv/bin/python beats.py audio/music.mp3` → `audio/beats.json`. Con esto las transiciones caen en golpes fuertes y la cámara se sacude en los acentos. Sin música, sáltalo.
- **Render final**: `./build.sh <nombre>` → `<nombre>.mp4` (master) + `<nombre>-movil.mp4` (<30 MB, para mandar por chat/teléfono). Incluye efectos de sonido sintetizados, subida de música en transiciones y volumen normalizado a −14 LUFS.

El render tarda ~3–5 min por minuto de video. Córrelo en segundo plano y avisa a la persona.

## 7 · Entregar

- Entrega la versión móvil (y dónde está el master). Si la persona está en otro dispositivo, envíala como archivo.
- Resume en 3–5 líneas qué tiene el video (historia, escenas clave).
- Ofrece un **caption** con información **extra** que no está en el video (contexto, detalles para devs, detrás de cámaras), con CTA de comentario y hashtags, más una nota de qué datos vienen de qué fuente.
- Si pide cambios, edita `scenes.js` y vuelve a QA → build. Mantén copias `scenes_vN.js` por versión.
