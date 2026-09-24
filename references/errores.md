# Errores que ya cometimos (no los repitas)

Salen de producir videos reales con este skill y del feedback del creador. Revísalos antes de mostrar un borrador.

## Dirección y narrativa
1. **"Se siente como presentación".** Poner una escena tipo diapositiva tras otra (título + viñetas + transición) aunque cada una se vea bien. → Para intros e historias usa el **modo historia** (`references/historia.md`): personaje continuo, cámara que lo sigue, transiciones dentro de la historia.
2. **Entradas y salidas sin sentido.** El personaje aparece en otro lado en cada escena. → La posición final de una escena = la inicial de la siguiente, o una transición que lo justifique (salta, cae, corre, la cámara entra a un objeto).
3. **El mismo layout en todas las escenas** (texto arriba, personaje al centro abajo). → Varía: texto a un lado, dentro de un marco, sobre un objeto; personaje en movimiento, arriba de algo, montado en algo.
4. **Personaje decorativo.** El personaje solo está parado. → En cada escena hace algo físico con un objeto del mundo (dibuja, teclea, tacha, escala, sostiene, empuja).
5. **Escenas sobresaturadas.** Título + subtítulo + lista + etiquetas + gráfica. → 1 texto grande + 1 elemento + el personaje. La narración (subtítulos) carga el resto.
6. **Fondos planos sin mundo.** → Cada escena tiene un escenario (cuarto, mesa de dibujo, viñetas, plotter, cuaderno, periódico).
7. **Hook recargado.** Meter a la persona, texto, prompt y mascota en el primer segundo. → Un solo foco (por ejemplo solo la computadora escribiendo el prompt) y algo que pasa (la mascota sale de la pantalla).
8. **Música que no pidieron.** → Pregunta si quiere música; si no le gusta, quítala (los SFX solos funcionan).
9. **Encabezados innecesarios.** Líneas superiores, "Edición especial p. 9", números de escena. → En historias usa `chrome: false`.

## Datos, privacidad y honestidad
10. **Nombres de terceros.** Usar el nombre de un miembro, cliente o alumno en pantalla. → Pon "un miembro de la comunidad" / "un cliente" salvo permiso explícito.
11. **Prometer lo que no se regala.** Mostrar estilos premium y decir "te regalo el skill" cuando el regalo es otro. → Que lo que se ve coincida con lo que se entrega, o dilo claro.
12. **"100% código" con IA generativa.** Nunca uses imágenes o video generados por IA como base si el video dice que es 100% código. (La música de Suno sí es IA de audio: no digas que la música es código.)
13. **Cifras inventadas.** Si falta una captura o cifra real, usa un marcador que diga "MOCKUP" y avísale al usuario.

## Técnicos
14. **Brazos escondidos**: la pose con brazos > ~80° los mete detrás del cuerpo. Usa 40–75°.
15. **La cámara pierde el mundo**: si la escena pasa de 1920 px, usa `cam` (el motor dibuja con la cámara y repite el fondo); no metas cosas fuera de pantalla sin cámara.
16. **"Fantasmas" en cuadros de prueba**: un cuadro en plena transición muestra dos escenas a la vez. Antes de diagnosticar un bug, revisa si el tiempo cae dentro de `trans.dur`.
17. **Highlights que no terminan**: si la animación de un highlight depende de un progreso ya limitado a 1, nunca acaba y la herramienta se queda flotando. Pasa el tiempo sin limitar.
18. **Transición `iris`/`zoom` a ciegas**: apunta `x, y` al personaje o al objeto en coordenadas de pantalla (aplica la cámara de la escena).

## Proceso
- Muestra el guion/storyboard antes de renderizar algo grande.
- Revisa cuadros de **cada** escena y de **cada** transición (`node render.mjs --stills …` + `contact.py`) antes de mandar un borrador.
- Manda borradores al celular en versión `-movil` (< 30 MB) y ábrelos en la compu si lo pide.
