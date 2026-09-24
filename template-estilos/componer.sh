#!/bin/zsh
# La persona se grabó a cámara: su video (A-roll, ya limpio) es la base y la animación va ENCIMA solo en los tramos
# animados (RANGES de timing.js). Fuera de esos tramos se ve su cara. Voz de la grabación normalizada a -14 LUFS.
# Uso: ./componer.sh <aroll.mov|mp4> [nombre]     → nombre.mp4 + nombre-movil.mp4 (< 25 MB para mandar)
set -e
AROLL=${1:?"falta el video base (A-roll)"}; NAME=${2:-video-final}
EN=$(node -e "import('./timing.js').then(m=>{const r=m.RANGES||[];console.log(r.length?r.map(([a,b])=>'between(t,'+a+','+b+')').join('+'):'1')})")
node render.mjs _anim.mp4
ffmpeg -y -v error -i "$AROLL" -i _anim.mp4 -filter_complex \
 "[1:v]scale=iw:ih,setpts=PTS-STARTPTS[an];[0:v][an]overlay=0:0:enable='$EN'[v];[0:a]loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
 -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 44100 -shortest -movflags +faststart "$NAME.mp4"
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$NAME.mp4"); BR=$(python3 -c "print(max(1200, min(6000, int(25*8*1000/float($D) - 160))))")
ffmpeg -y -v error -i "$NAME.mp4" -c:v libx264 -preset slow -b:v ${BR}k -pass 1 -an -f mp4 /dev/null
ffmpeg -y -v error -i "$NAME.mp4" -c:v libx264 -preset slow -b:v ${BR}k -pass 2 -c:a aac -b:a 128k -movflags +faststart "$NAME-movil.mp4"
rm -f ffmpeg2pass*; echo "LISTO $NAME.mp4 ($(du -h $NAME.mp4 | cut -f1)) · $NAME-movil.mp4 ($(du -h $NAME-movil.mp4 | cut -f1)) · ${D}s"
