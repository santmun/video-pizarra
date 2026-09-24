"""Frases dichas → tiempos. Genera timing.js para sincronizar las escenas a la voz real.
Uso:  python3 anclas.py audio/words.json anclas.json > timing.js
anclas.json:
  { "anclas": [["hook", "hazme un video"], ["tokens", "no consume"], ...],   # nombre, frase (en orden de aparición)
    "rangos": [["hook", "cara2"], ["lista", "cara3"]],                       # opcional: tramos donde va la animación encima
    "fin": "end",                                                            # opcional: nombre para el final del audio
    "adelanto": 0.08 }                                                       # la escena entra 0.08 s antes de la palabra (se siente a tiempo)
Cada frase se busca DESPUÉS de la anterior (sin acentos, sin puntuación, sin mayúsculas). El tiempo es el inicio de su
primera palabra. Si una frase no aparece, se detiene y dice cuál: corrige la frase, no inventes el tiempo."""
import json, re, sys, unicodedata

def norm(s): return re.sub(r'[^a-z0-9ñ ]', '', unicodedata.normalize('NFKD', s.lower()).encode('ascii', 'ignore').decode().replace('n~', 'ñ')).strip()

words = json.load(open(sys.argv[1])); spec = json.load(open(sys.argv[2]))
W = [(norm(w.get('w', w.get('word', w.get('text', '')))), w.get('s', w.get('start')), w.get('e', w.get('end'))) for w in words]
W = [w for w in W if w[0]]
TM, i = {}, 0
for name, phrase in spec['anclas']:
    toks = norm(phrase).split()
    for j in range(i, len(W) - len(toks) + 1):
        if all(W[j + k][0] == toks[k] for k in range(len(toks))): TM[name] = round(max(0, W[j][1] - spec.get('adelanto', 0.08)), 3); i = j + 1; break
    else: sys.exit(f'✗ no encontré "{phrase}" ({name}) después de {W[i][1] if i < len(W) else "el final"}s')
if spec.get('fin'): TM[spec['fin']] = round(W[-1][2] + 0.4, 3)
out = f'export const TM = {json.dumps(TM)};\n'
if spec.get('rangos'): out += 'export const RANGES = ' + json.dumps([[TM[a], TM[b]] for a, b in spec['rangos']]) + ';\n'
print(out, end='')
for k, v in TM.items(): print(f'{v:8.2f}s  {k}', file=sys.stderr)
