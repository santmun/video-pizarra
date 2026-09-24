# video-pizarra 🎬✏️

Skill para **Claude Code** que crea videos animados estilo pizarrón (dibujo a mano) sobre cualquier tema:
una mascota que actúa, texto que se escribe solo con plumón/gis/lápiz, fondos distintos por escena,
transiciones creativas al ritmo de la música, efectos de sonido y un final tipo storyboard.
Todo se genera con código y sale un MP4 listo para Reels, TikTok, Shorts o YouTube.

Antes de producir, el skill te entrevista (tema, fuentes, formato, personaje, imágenes de referencia,
música, llamado a la acción) y te enseña el storyboard para que lo apruebes.

## Instalación

1. Copia la carpeta `video-pizarra` a `~/.claude/skills/` (en Windows: `%USERPROFILE%\.claude\skills\`).
2. Instala lo necesario (una sola vez):
   - **Node.js 18+** → https://nodejs.org
   - **ffmpeg** → Mac: `brew install ffmpeg` · Windows: `winget install ffmpeg` · Linux: `sudo apt install ffmpeg`
   - **Python 3** con `numpy` y `Pillow` → `pip install numpy pillow`
   - (Opcional, para sincronizar con la música) `librosa` → el skill lo instala en un entorno virtual.
3. Abre Claude Code y pide algo como:
   > "Hazme un video pizarra de 60 segundos explicando qué es el interés compuesto"

La primera vez el skill instalará el navegador que usa para renderizar (`npx playwright install chromium`).

## Hazlo tuyo
Pídelo con tus palabras: tus colores, tu tipografía (cualquier fuente de Google Fonts), tu logo o personaje como mascota, tu foto, tus capturas, tu voz, 16:9 o 9:16, cualquier idioma. Si algo no viene de fábrica, Claude lo adapta.

## Música (opcional)

- **Con Suno**: consigue una API key en https://sunoapi.org y guárdala así:
  ```
  mkdir -p ~/.config/video-pizarra && echo "SUNO_API_KEY=tu_key" > ~/.config/video-pizarra/keys.env
  ```
- **Tu propia canción**: pon el mp3 en `audio/music.mp3` dentro de la carpeta del proyecto. Asegúrate de tener derechos para usarla.
- **Sin música**: el video queda solo con efectos de sonido.

## Qué entrega
- `<nombre>.mp4`: master en alta calidad.
- `<nombre>-movil.mp4`: versión ligera (<30 MB) para mandar por WhatsApp o subir desde el teléfono.
- Una propuesta de caption con información extra y hashtags.

## Tiempos
Construir un video toma de 20 a 40 minutos de trabajo del agente, y el render final unos 3–5 minutos por minuto de video.

## Personaliza
- **Tu mascota o marca**: comparte una imagen de referencia en la entrevista y el skill la redibuja con formas simples para que pueda actuar.
- **Tus colores**: dilos en la entrevista (hex o descripción).
- **Horizontal 16:9**: pídelo en la entrevista.

Hecho con ❤️ por Horizontes IA.


## Bonus: 3 estilos extra
Además del pizarrón incluye `template-estilos/` con **acuarela**, **cuaderno** y **minimal** (mira `catalogo-estilos/`). Pídele a Claude: *"hazme un video en estilo acuarela sobre …"*.
