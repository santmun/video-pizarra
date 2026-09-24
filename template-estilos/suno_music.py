"""Generate an instrumental music bed with Suno through api.sunoapi.org.
Usage: SUNO_API_KEY=... python3 suno_music.py "<style>" "<title>" audio/music.mp3
The key can also live in ~/.config/video-pizarra/keys.env as SUNO_API_KEY=...
Tip: ask for an upbeat 100-120 BPM instrumental with a clear pulse so transitions can land on beats."""
import json, os, sys, time, urllib.request, urllib.error

BASE = 'https://api.sunoapi.org'
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

def key():
    if os.environ.get('SUNO_API_KEY'): return os.environ['SUNO_API_KEY']
    for f in ('~/.config/video-pizarra/keys.env', '~/.config/video-pizarra/keys.env'):
        f = os.path.expanduser(f)
        if os.path.exists(f):
            for ln in open(f):
                if ln.startswith('SUNO_API_KEY='): return ln.strip().split('=', 1)[1]
    sys.exit('Falta SUNO_API_KEY (env o ~/.config/video-pizarra/keys.env)')

KEY = key()
def req(path, body=None):
    h = {'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json', 'User-Agent': UA, 'Accept': 'application/json'}
    r = urllib.request.Request(BASE + path, data=json.dumps(body).encode() if body is not None else None, headers=h, method='POST' if body is not None else 'GET')
    return json.loads(urllib.request.urlopen(r, timeout=40).read())

def audio_urls(o, acc):
    if isinstance(o, dict):
        for k, v in o.items():
            if isinstance(v, str) and v.startswith('http') and '.mp3' in v: acc.append(v)
            else: audio_urls(v, acc)
    elif isinstance(o, list):
        for x in o: audio_urls(x, acc)
    return acc

style, title, out = sys.argv[1], sys.argv[2], sys.argv[3]
try:
    r = req('/api/v1/generate', {'customMode': True, 'instrumental': True, 'style': style[:990], 'title': title[:90], 'model': 'V4_5', 'callBackUrl': 'https://example.com/cb'})
except urllib.error.HTTPError as e:
    sys.exit(f'Suno rechazó la petición ({e.code}): {e.read()[:300].decode(errors="ignore")}')
if r.get('code') != 200: sys.exit('Suno rechazó la petición: ' + json.dumps(r)[:300])
task = r['data']['taskId']; print('Suno taskId', task)
for i in range(45):
    time.sleep(8)
    try: d = req(f'/api/v1/generate/record-info?taskId={task}')
    except Exception as e: print('poll', e); continue
    st = (d.get('data') or {}).get('status', '?'); urls = audio_urls(d, [])
    print(f'  [{i}] {st} ({len(urls)} audios)')
    if urls and st in ('SUCCESS', 'FIRST_SUCCESS'):
        url = sorted(urls, key=lambda u: 'stream' in u)[0]
        os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
        open(out, 'wb').write(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=180).read())
        print('OK', out); sys.exit(0)
sys.exit('Suno no terminó a tiempo')
