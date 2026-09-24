"""Transcribe la voz en off con tiempos por palabra → audio/words.json, y muestra dónde empieza cada frase
para ajustar la duración (`dur`) de cada escena al audio.
Uso: python3 vo_words.py audio/vo.wav [idioma=es]
Usa AssemblyAI (recomendado: capta el habla baja y da tiempos exactos). Llave en ASSEMBLYAI_API_KEY o en
~/.config/video-estilos-pro/keys.env (ASSEMBLYAI_API_KEY=...). Sin llave, cae a faster-whisper (menos preciso:
se come palabras dichas en voz baja; NO lo uses para decidir cortes)."""
import json, os, subprocess, sys, time, urllib.request
path = sys.argv[1]; lang = sys.argv[2] if len(sys.argv) > 2 else 'es'
def aai_key():
    if os.environ.get('ASSEMBLYAI_API_KEY'): return os.environ['ASSEMBLYAI_API_KEY']
    for f in ('~/.config/video-estilos-pro/keys.env', '~/.config/video-pizarra/keys.env', '~/.config/horizontes/assemblyai.env'):
        f = os.path.expanduser(f)
        if os.path.exists(f):
            for ln in open(f):
                if ln.startswith('ASSEMBLYAI_API_KEY='): return ln.strip().split('=', 1)[1]
words = []
key = aai_key()
if key:
    mp3 = '/tmp/_vo_words.mp3'; subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', path, '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '128k', mp3], check=True)
    B, Hh = 'https://api.assemblyai.com/v2', {'authorization': key}
    up = json.load(urllib.request.urlopen(urllib.request.Request(f'{B}/upload', data=open(mp3, 'rb').read(), headers={**Hh, 'content-type': 'application/octet-stream'})))['upload_url']
    tid = json.load(urllib.request.urlopen(urllib.request.Request(f'{B}/transcript', data=json.dumps({'audio_url': up, 'language_code': lang, 'disfluencies': True, 'punctuate': True, 'format_text': True}).encode(), headers={**Hh, 'content-type': 'application/json'})))['id']
    while True:
        r = json.load(urllib.request.urlopen(urllib.request.Request(f'{B}/transcript/{tid}', headers=Hh)))
        if r['status'] in ('completed', 'error'): break
        time.sleep(3)
    if r['status'] != 'completed': sys.exit('AssemblyAI falló: ' + str(r.get('error')))
    words = [{'w': w['text'], 's': round(w['start'] / 1000, 3), 'e': round(w['end'] / 1000, 3)} for w in r['words']]
else:
    print('⚠️  Sin ASSEMBLYAI_API_KEY: uso faster-whisper (menos preciso). Revisa los tiempos a mano.')
    from faster_whisper import WhisperModel
    segs, _ = WhisperModel('small', device='cpu', compute_type='int8').transcribe(path, language=lang, word_timestamps=True)
    for s in segs:
        for w in s.words: words.append({'w': w.word.strip(), 's': round(w.start, 3), 'e': round(w.end, 3)})
os.makedirs('audio', exist_ok=True); json.dump(words, open('audio/words.json', 'w'), ensure_ascii=False)
print(f'{len(words)} palabras → audio/words.json   (duración voz: {words[-1]["e"]:.2f}s)\n')
line, start = [], None
for w in words:
    if start is None: start = w['s']
    line.append(w['w'])
    if w['w'].endswith(('.', '?', '!', '…')): print(f'{start:7.2f}s  {" ".join(line)}'); line, start = [], None
if line: print(f'{start:7.2f}s  {" ".join(line)}')
