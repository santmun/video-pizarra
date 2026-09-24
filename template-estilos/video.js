// Tu video: un solo objeto. Tipos de escena: hook, statement, chapter, list, stat, compare, quote, media, steps, cta.
// *asteriscos* = palabras enfatizadas en cualquier título. `say` = lo que se narra (se vuelve subtítulos).
// Cambia `style` por 'acuarela', 'cuaderno' o 'minimal' y vuelve a renderizar: el guion no cambia.
export default {
  style: 'acuarela',
  format: '16:9',            // '16:9' (YouTube) | '9:16' (Reels/TikTok/Shorts)
  fps: 30,
  // Persona: con foto → python3 cutout.py tu-foto.jpg  (crea assets/persona.png) y descomenta `photo`.
  // Sin foto se dibuja un personaje con este `look`. hairStyle: swoop | short | long | bob | bun | ponytail | curly | bald
  person: { /* photo: 'assets/persona.png', */ name: 'Ana', look: { skin: '#D9A07E', hair: '#2B1D16', hairStyle: 'long', shirt: '#2F4858', glasses: false, beard: false } },
  mascot: 'bot',             // 'clawd' | 'bot' | 'blob' | 'none'
  captions: true,
  // words: 'audio/words.json',   // subtítulos exactos desde tu voz en off (python3 vo_words.py audio/vo.wav)
  // beats: 'audio/beats.json',   // cortes en el beat de la música (python3 beats.py audio/music.mp3)
  // palette: { accent: '#00A6A6' },  // color de tu marca
  scenes: [
    { type: 'hook', dur: 4.5, title: 'Trabaja *4 horas* menos a la semana', kicker: 'productividad real', prompt: '¿En qué se me va el tiempo?', say: 'Vas a recuperar cuatro horas a la semana con tres cambios simples.' },
    { type: 'statement', dur: 3.5, kicker: 'el problema', title: 'No te falta tiempo. Te sobran *interrupciones.*', sub: 'Cada notificación te cuesta 20 minutos de enfoque.', say: 'No te falta tiempo: te sobran interrupciones.' },
    { type: 'list', dur: 5, title: 'Los *3 cambios*', items: ['Bloques de enfoque de 90 min', 'Notificaciones en lote', 'Reuniones de 25 minutos'], say: 'Bloques de enfoque, notificaciones en lote y reuniones más cortas.' },
    { type: 'stat', dur: 4, kicker: 'en promedio', value: 23, suffix: ' min', label: 'tardas en recuperar el foco tras una interrupción', say: 'Tardas veintitrés minutos en recuperar el foco.' },
    { type: 'compare', dur: 5, title: 'Antes vs *después*', left: { title: 'Antes', items: ['Correo abierto todo el día', 'Reuniones de 1 hora', 'Multitarea'] }, right: { title: 'Después', items: ['Correo 2 veces al día', 'Reuniones de 25 min', 'Una cosa a la vez'] }, say: 'Así se ve una semana antes y después.' },
    { type: 'media', dur: 4.5, src: 'assets/ejemplo-captura.png', frame: 'phone', title: 'Los números *no mienten*', caption: 'Reemplaza esta captura por una tuya.', say: 'Y los resultados se notan en tus números.' },
    { type: 'quote', dur: 4, text: 'Terminé mi semana el jueves por primera vez en años.', by: 'Alumna del curso', say: 'Terminé mi semana el jueves por primera vez en años.' },
    { type: 'steps', dur: 5, title: 'Empieza en *3 pasos*', items: ['Mide tu semana', 'Elige un cambio', 'Repite 14 días'], say: 'Mide tu semana, elige un cambio y repítelo catorce días.' },
    { type: 'chapter', dur: 3, kicker: '01', title: 'Mide tu *semana*', say: 'Paso uno: mide tu semana.' },
    { type: 'cta', dur: 4.5, title: 'Descarga la *plantilla*', sub: 'gratis, en la descripción', button: 'Descárgala aquí ↓', say: 'Descarga la plantilla gratis en la descripción.' },
  ],
};
