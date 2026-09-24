"""Transcribe la voz en off con tiempos por palabra → audio/words.json, y muestra dónde empieza cada frase
para ajustar la duración (`dur`) de cada escena al audio.
Uso: python3 vo_words.py audio/vo.wav [idioma=es]
Necesita: pip install faster-whisper   (o openai-whisper como respaldo)"""
import json, sys
path = sys.argv[1]; lang = sys.argv[2] if len(sys.argv) > 2 else 'es'
words = []
try:
    from faster_whisper import WhisperModel
    model = WhisperModel('small', device='cpu', compute_type='int8')
    segs, _ = model.transcribe(path, language=lang, word_timestamps=True, vad_filter=True)
    for s in segs:
        for w in s.words: words.append({'w': w.word.strip(), 's': round(w.start, 3), 'e': round(w.end, 3)})
except ImportError:
    import whisper
    r = whisper.load_model('small').transcribe(path, language=lang, word_timestamps=True)
    for s in r['segments']:
        for w in s.get('words', []): words.append({'w': w['word'].strip(), 's': round(w['start'], 3), 'e': round(w['end'], 3)})
json.dump(words, open('audio/words.json', 'w'), ensure_ascii=False)
print(f'{len(words)} palabras → audio/words.json   (duración voz: {words[-1]["e"]:.2f}s)\n')
line, start = [], None
for w in words:  # print sentences with start time, to map scenes
    if start is None: start = w['s']
    line.append(w['w'])
    if w['w'].endswith(('.', '?', '!', '…')):
        print(f'{start:7.2f}s  {" ".join(line)}'); line, start = [], None
if line: print(f'{start:7.2f}s  {" ".join(line)}')
