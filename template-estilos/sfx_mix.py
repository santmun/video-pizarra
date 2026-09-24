"""Mezcla de audio: SFX sintetizados (sin archivos de sonido) según el perfil del estilo + música + voz en off.

Uso:  python3 sfx_mix.py <out.wav> [--music audio/music.mp3] [--vo audio/vo.wav]
Lee sfx.json (lo escribe render.mjs): eventos genéricos (trans, title, enter, whoosh, pop, type, count, impact)
y el perfil de sonido del estilo (paper, ink, digital, film, retro, soft, pop, mechanical, cosmic).
Env: MUSIC_GAIN=0.30  SFX_GAIN=0.55  VO_GAIN=1.0  (la música baja sola cuando habla la voz)"""
import json, os, subprocess, sys, wave
import numpy as np

SR = 44100
rng = np.random.default_rng(7)
args = sys.argv[1:]
OUT = args[0]
def opt(k):
    return args[args.index(k) + 1] if k in args else None

def n(sec): return int(sec * SR)
def tt(sec): return np.arange(n(sec)) / SR
def noise(sec): return rng.standard_normal(n(sec))


def band(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    m = ((f >= lo) & (f <= hi)).astype(float)
    # soft edges
    m = np.convolve(m, np.hanning(41) / np.hanning(41).sum(), 'same')
    return np.fft.irfft(X * m, len(x))


def norm(x, peak=1.0):
    p = np.max(np.abs(x)) or 1
    return x / p * peak


def adsr(length, a=0.005, r=0.1):
    e = np.ones(length); na, nr = max(1, n(a)), max(1, n(r))
    e[:na] = np.linspace(0, 1, na)
    if nr < length: e[-nr:] *= np.linspace(1, 0, nr)
    return e


def decay(sec, tau): return np.exp(-tt(sec) / tau)


def sweep(f0, f1, sec, curve='exp'):
    t = tt(sec)
    f = f0 * (f1 / f0) ** (t / sec) if curve == 'exp' else f0 + (f1 - f0) * t / sec
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def moving_band(x, c0, c1, width=0.8, seg=0.03):
    """noise whose band centre glides c0→c1 (for whooshes)"""
    L = len(x); hop = n(seg); out = np.zeros(L); win = np.hanning(hop * 2)
    for i, s in enumerate(range(0, L - hop * 2, hop)):
        c = c0 * (c1 / c0) ** (s / L)
        out[s:s + hop * 2] += band(x[s:s + hop * 2], c * (1 - width / 2), c * (1 + width)) * win
    return out


def strokes(sec, rate, jitter=0.35):
    """amplitude envelope of hand strokes: bumps at ~rate Hz"""
    L = n(sec); e = np.zeros(L); t = 0.0
    while t < sec:
        d = (1 / rate) * (1 + rng.uniform(-jitter, jitter))
        s, ln = n(t), n(d * 0.85)
        if s + ln > L: ln = L - s
        if ln > 4: e[s:s + ln] += np.hanning(ln) * rng.uniform(0.6, 1.0)
        t += d
    return e


def scribble(sec, lo, hi, rate, crackle=0.0):
    x = band(noise(sec), lo, hi) * strokes(sec, rate)
    if crackle:
        k = np.zeros(n(sec)); idx = rng.integers(0, n(sec), int(sec * 90)); k[idx] = rng.uniform(-1, 1, len(idx))
        x += band(k, 1500, 9000) * crackle * 30
    return norm(x) * adsr(len(x), 0.02, 0.05)


def pingset(freqs, sec, tau):
    t = tt(sec); return sum(np.sin(2 * np.pi * f * t) * np.exp(-t / (tau * (1 - i * 0.15))) for i, f in enumerate(freqs))


# ---------- the sound bank ----------
def S_pop():
    x = sweep(320, 950, 0.14) * decay(0.14, 0.045); c = band(noise(0.01), 2000, 8000) * 0.4
    x[:len(c)] += c; return norm(x) * 0.7
def S_blip(): return norm(sweep(1150, 1650, 0.09) * decay(0.09, 0.03)) * 0.35
def S_boing():
    t = tt(0.5); f = 170 + 260 * (1 - np.exp(-t / 0.08)) + 25 * np.sin(2 * np.pi * 16 * t) * np.exp(-t / 0.2)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)) * 0.6
def S_hop(): return norm(sweep(240, 520, 0.12) * decay(0.12, 0.05)) * 0.35
def S_whoosh(sec=0.7, c0=350, c1=2600):
    x = moving_band(noise(sec), c0, c1); e = np.sin(np.linspace(0, np.pi, len(x))) ** 1.6
    return norm(x * e) * 0.55
def S_whoosh_in():
    x = moving_band(noise(1.35), 250, 4200); e = np.linspace(0, 1, len(x)) ** 2.4; e[-n(0.04):] *= np.linspace(1, 0, n(0.04))
    sub = sweep(60, 220, 1.35) * np.linspace(0, 1, n(1.35)) ** 2 * 0.5
    return norm(x * e + sub) * 0.75
def S_whoosh_down(): return S_whoosh(0.75, 3000, 260)
def S_sparkle():
    out = np.zeros(n(0.9))
    for k in range(7):
        f = rng.uniform(2200, 5200); s = n(k * 0.06); p = pingset([f, f * 1.5], 0.4, 0.09)
        out[s:s + len(p)] += p[:len(out) - s] * (1 - k * 0.08)
    return norm(out) * 0.35
def S_erase(sec): return norm(band(noise(sec), 180, 1600) * strokes(sec, 6, 0.2)) * 0.5 * adsr(n(sec), 0.05, 0.1)
def S_coin():
    a = pingset([2093, 2637, 3136], 0.6, 0.18); out = np.zeros(n(0.75)); out[:len(a)] += a; out[n(0.08):n(0.08) + len(a)] += a[:len(out) - n(0.08)] * 0.8
    return norm(out) * 0.45
def S_rise(): return norm(sweep(180, 720, 0.45) * adsr(n(0.45), 0.05, 0.12) + band(noise(0.45), 800, 3000) * 0.08) * 0.35
def S_stamp():
    t = tt(0.35); body = np.sin(2 * np.pi * 70 * t) * np.exp(-t / 0.07)
    slap = band(noise(0.35), 200, 2500) * np.exp(-t / 0.025)
    return norm(body + slap * 0.9) * 0.85
def S_swell():
    x = moving_band(noise(0.9), 200, 1800) * np.linspace(0, 1, n(0.9)) ** 1.5
    return norm(x + sweep(110, 330, 0.9) * np.linspace(0, 1, n(0.9)) * 0.4) * 0.6
def S_rev():
    t = tt(1.0); f = 55 + 150 * (1 - np.exp(-t / 0.25)); ph = 2 * np.pi * np.cumsum(f) / SR
    saw = sum(np.sin(k * ph) / k for k in range(1, 12))
    return norm(saw * adsr(len(t), 0.02, 0.3) * (0.7 + 0.3 * np.sin(2 * np.pi * 28 * t))) * 0.45
def S_boom():
    t = tt(0.9); return norm(np.sin(2 * np.pi * 48 * t) * np.exp(-t / 0.22) + band(noise(0.9), 40, 400) * np.exp(-t / 0.08)) * 0.9
def S_paper():
    x = band(noise(0.75), 900, 6000) * np.sin(np.linspace(0, np.pi, n(0.75))) ** 0.8
    return norm(x) * 0.4
def S_tick():
    x = band(noise(0.13), 2500, 7000) * np.sin(np.linspace(0, np.pi, n(0.13)))
    b = S_blip(); out = np.zeros(n(0.22)); out[:len(x)] += norm(x) * 0.5; out[n(0.1):n(0.1) + len(b)] += b[:len(out) - n(0.1)]
    return out * 0.8
def S_splash():
    t = tt(0.9); x = band(noise(0.9), 300, 3500) * np.exp(-t / 0.18)
    for k in range(6):
        s = n(0.05 + k * 0.07); f0 = rng.uniform(500, 1200); b = sweep(f0, f0 * 2.2, 0.08) * decay(0.08, 0.025)
        x[s:s + len(b)] += b * 0.5
    return norm(x) * 0.6
def S_type(sec, count):
    out = np.zeros(n(sec) + n(0.05)); count = max(1, int(count or sec * 16))
    for k in range(count):
        s = n(k * sec / count + rng.uniform(0, 0.01))
        c = band(noise(0.012), 1800, 7000) * decay(0.012, 0.003) + np.sin(2 * np.pi * 1700 * tt(0.012)) * decay(0.012, 0.002) * 0.4
        out[s:s + len(c)] += c * rng.uniform(0.6, 1)
    return norm(out) * 0.35
def S_burst():
    t = tt(0.3); return norm(band(noise(0.3), 400, 6000) * np.exp(-t / 0.04) + sweep(600, 180, 0.3) * np.exp(-t / 0.06)) * 0.75
def S_thud():
    t = tt(0.4); return norm(np.sin(2 * np.pi * 85 * t) * np.exp(-t / 0.09) + band(noise(0.4), 60, 900) * np.exp(-t / 0.04) * 0.7) * 0.8
def S_flip():
    out = np.zeros(n(0.4))
    for s in (0, 0.16):
        x = band(noise(0.09), 1200, 7000) * np.sin(np.linspace(0, np.pi, n(0.09))); out[n(s):n(s) + len(x)] += x
    return norm(out) * 0.5
def S_ding(): return norm(pingset([1318.5, 1975.5, 2637, 3951], 1.6, 0.45)) * 0.45
def S_riser(sec):
    x = moving_band(noise(sec), 300, 5000) + sweep(200, 1200, sec) * 0.35
    return norm(x * np.linspace(0, 1, n(sec)) ** 2.2) * 0.55
def S_shimmer():
    out = np.zeros(n(1.6))
    for k in range(14):
        f = rng.uniform(1800, 4800); s = n(k * 0.07); p = pingset([f], 0.7, 0.2)
        out[s:s + len(p)] += p[:len(out) - s]
    return norm(out) * 0.35
def S_card():
    x = band(noise(0.16), 1500, 7000) * np.sin(np.linspace(0, np.pi, n(0.16))); return norm(x) * 0.3

def S_spit():
    t = tt(0.45); x = band(noise(0.45), 500, 5000) * np.exp(-t / 0.09)
    for k in range(5):
        s = n(0.03 + k * 0.05); b = sweep(900, 300, 0.05) * decay(0.05, 0.015); x[s:s + len(b)] += b * 0.6
    return norm(x) * 0.6
def S_kick():
    t = tt(0.4); body = np.sin(2 * np.pi * np.cumsum(120 * np.exp(-t / 0.05) + 55) / SR) * np.exp(-t / 0.09)
    return norm(body + S_whoosh(0.4, 600, 3000)[:len(t)] * 0.5) * 0.85
def S_clap():
    out = np.zeros(n(0.25))
    for d in (0, 0.012, 0.022):
        x = band(noise(0.2), 900, 5000) * decay(0.2, 0.03); out[n(d):n(d) + len(x)] += x[:len(out) - n(d)]
    return norm(out) * 0.5
def S_clink(): return norm(pingset([3136, 4186, 5274], 0.35, 0.07)) * 0.35
def S_grunt():
    t = tt(0.32); f = 130 - 30 * t / 0.32; ph = 2 * np.pi * np.cumsum(f) / SR
    v = sum(np.sin(k * ph) / k for k in range(1, 14)); v = band(v * adsr(len(t), 0.02, 0.12), 250, 1800)
    return norm(v) * 0.4
def S_cash():
    a = pingset([2637, 3520], 0.9, 0.3); d = band(noise(0.25), 200, 2500) * decay(0.25, 0.05)
    out = np.zeros(n(1.0)); out[:len(d)] += d * 0.6; out[n(0.08):n(0.08) + len(a)] += a[:len(out) - n(0.08)]
    return norm(out) * 0.5
def S_firework():
    w = sweep(600, 2400, 0.3) * np.linspace(0.2, 1, n(0.3)) * 0.4
    t = tt(0.7); pop_ = band(noise(0.7), 200, 6000) * np.exp(-t / 0.12)
    out = np.zeros(n(1.0)); out[:len(w)] += w; out[n(0.3):n(0.3) + len(pop_)] += pop_
    return norm(out) * 0.55
def S_slap():
    t = tt(0.2); return norm(band(noise(0.2), 300, 4000) * np.exp(-t / 0.025) + np.sin(2 * np.pi * 180 * t) * np.exp(-t / 0.04) * 0.5) * 0.7
def S_skate(sec):
    t = tt(sec); r = band(noise(sec), 60, 600) * (0.8 + 0.2 * np.sin(2 * np.pi * 7 * t))
    whine = np.sin(2 * np.pi * np.cumsum(900 + 60 * np.sin(2 * np.pi * 0.7 * t)) / SR) * 0.08
    return norm(r + whine) * 0.35 * adsr(len(t), 0.2, 0.4)
def S_steps(sec):
    out = np.zeros(n(sec) + n(0.1))
    for k in range(int(sec / 0.16) + 1):
        x = band(noise(0.06), 150, 1500) * decay(0.06, 0.015); s = n(k * 0.16); out[s:s + len(x)] += x
    return norm(out) * 0.35



# ---------- extra, more "grown-up" sounds ----------
def S_sub():
    t = tt(0.8); return norm(np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t / 0.06)) / SR) * np.exp(-t / 0.28) + band(noise(0.8), 80, 1200) * np.exp(-t / 0.02) * 0.4) * 0.8
def S_ticks(sec):
    out = np.zeros(n(sec) + n(0.05)); k = 0; t = 0.0
    while t < sec:
        c = band(noise(0.008), 2500, 8000) * decay(0.008, 0.002); s = n(t); out[s:s + len(c)] += c * 0.8
        t += 0.03 + 0.09 * (t / sec) ** 2; k += 1  # slows down like a counter settling
    return norm(out) * 0.3
def S_glitch():
    out = np.zeros(n(0.35))
    for k in range(6):
        s = n(rng.uniform(0, 0.28)); d = n(rng.uniform(0.01, 0.05)); x = np.sign(np.sin(2 * np.pi * rng.uniform(80, 900) * tt(d / SR))) * 0.5 + band(noise(d / SR), 1000, 9000)
        x = np.round(x * 4) / 4; out[s:s + len(x)] += x[:len(out) - s]
    return norm(out) * 0.45
def square(f, sec): t = tt(sec); return np.sign(np.sin(2 * np.pi * np.cumsum(np.full(len(t), f) if np.isscalar(f) else f) / SR))
def S_chip_up(): return norm(np.concatenate([square(f, 0.05) for f in (523, 659, 784, 1046)]) * 0.5) * 0.3
def S_chip_down(): return norm(np.concatenate([square(f, 0.05) for f in (1046, 784, 523, 392)])) * 0.28
def S_chip_blip(): return norm(square(988, 0.06) * decay(0.06, 0.03)) * 0.25
def S_chip_coin(): return norm(np.concatenate([square(988, 0.07), square(1319, 0.25) * decay(0.25, 0.1)])) * 0.3
def S_chip_type(sec, count=None):
    out = np.zeros(n(sec) + n(0.03)); c = max(1, int(sec * 14))
    for k in range(c): x = square(rng.choice([660, 700, 740]), 0.018); s = n(k * sec / c); out[s:s + len(x)] += x
    return norm(out) * 0.18
def S_projector(sec):
    out = np.zeros(n(sec) + n(0.02))
    for k in range(int(sec * 24)): x = band(noise(0.006), 1500, 6000) * decay(0.006, 0.002); s = n(k / 24); out[s:s + len(x)] += x
    return norm(out) * 0.12 * adsr(len(out), 0.1, 0.2)
def S_soft_whoosh(): return S_whoosh(0.9, 200, 1400) * 0.7
def S_brush(): return scribble(0.45, 250, 2600, 4) * 0.3
def S_quill(): return scribble(0.5, 2800, 9500, 12, 0.25) * 0.2
def S_pencil(): return scribble(0.3, 2200, 8500, 10, 0.1) * 0.18

BANK = dict(pop=S_pop, blip=S_blip, whoosh=S_whoosh, whoosh_in=S_whoosh_in, whoosh_down=S_whoosh_down, sparkle=S_sparkle,
            rise=S_rise, stamp=S_stamp, swell=S_swell, boom=S_boom, paper=S_paper, tick=S_tick, splash=S_splash, thud=S_thud,
            flip=S_flip, ding=S_ding, shimmer=S_shimmer, card=S_card, clap=S_clap, clink=S_clink, sub=S_sub, glitch=S_glitch,
            chip_up=S_chip_up, chip_down=S_chip_down, chip_blip=S_chip_blip, chip_coin=S_chip_coin, soft_whoosh=S_soft_whoosh,
            brush=S_brush, quill=S_quill, pencil=S_pencil)
TIMED = dict(type=lambda s: S_type(s, None), ticks=S_ticks, chip_type=S_chip_type, projector=S_projector, riser=S_riser)

# generic event → [(sound, gain)] per profile
PROFILES = {
    'soft':       dict(trans=[('soft_whoosh', .6)], title=[('card', .35)], enter=[('card', .3)], whoosh=[('soft_whoosh', .35)], pop=[('blip', .18)], type=[('type', .45)], count=[('ticks', .5)], impact=[('thud', .45)]),
    'paper':      dict(trans=[('paper', .8)], title=[('paper', .3)], enter=[('card', .45)], whoosh=[('paper', .45)], pop=[('card', .35)], type=[('type', .4)], count=[('ticks', .45)], impact=[('stamp', .5)]),
    'ink':        dict(trans=[('brush', 1.0), ('soft_whoosh', .35)], title=[('quill', 1.0)], enter=[('pencil', 1.0)], whoosh=[('soft_whoosh', .3)], pop=[('card', .3)], type=[('type', .35)], count=[('ticks', .4)], impact=[('stamp', .4)]),
    'digital':    dict(trans=[('glitch', .7), ('whoosh', .3)], title=[('blip', .25)], enter=[('tick', .35)], whoosh=[('whoosh', .35)], pop=[('blip', .25)], type=[('type', .5)], count=[('ticks', .5)], impact=[('sub', .6)]),
    'film':       dict(trans=[('swell', .45), ('projector', .8)], title=[('rise', .15)], enter=[('card', .2)], whoosh=[('soft_whoosh', .35)], pop=[('card', .2)], type=[('type', .35)], count=[('ticks', .35)], impact=[('boom', .45)]),
    'retro':      dict(trans=[('chip_down', 1.0)], title=[('chip_up', 1.0)], enter=[('chip_blip', 1.0)], whoosh=[('chip_up', .6)], pop=[('chip_blip', 1.0)], type=[('chip_type', 1.0)], count=[('chip_type', .8)], impact=[('chip_coin', 1.0)]),
    'pop':        dict(trans=[('whoosh_in', .5)], title=[('pop', .35)], enter=[('pop', .28)], whoosh=[('whoosh', .4)], pop=[('pop', .35)], type=[('type', .45)], count=[('ticks', .5)], impact=[('clap', .5), ('sparkle', .4)]),
    'mechanical': dict(trans=[('flip', .7)], title=[('stamp', .35)], enter=[('tick', .4)], whoosh=[('card', .4)], pop=[('tick', .3)], type=[('type', .5)], count=[('ticks', .5)], impact=[('stamp', .6)]),
    'cosmic':     dict(trans=[('shimmer', .35), ('soft_whoosh', .5)], title=[('shimmer', .2)], enter=[('blip', .15)], whoosh=[('soft_whoosh', .35)], pop=[('blip', .2)], type=[('type', .35)], count=[('ticks', .4)], impact=[('sub', .5), ('shimmer', .3)]),
}

meta = json.load(open('sfx.json')); events = meta['events']; DUR = float(meta['duration'])
prof = PROFILES.get((meta.get('style') or {}).get('sfx') or 'soft', PROFILES['soft'])
L = n(DUR + 1.5); fx = np.zeros(L); cache = {}
def render(name, dur):
    if name in TIMED: return TIMED[name](max(0.15, dur or 0.8)) if name != 'projector' else S_projector(0.9)
    if name not in cache: cache[name] = BANK[name]()
    return cache[name]
last = {}
for ev in events:
    for name, g in PROFILES.get(ev.get('sfx') or '', prof).get(ev['name'], []):
        if ev['name'] in ('enter', 'pop', 'title') and ev['t'] - last.get(name, -9) < 0.12: continue  # avoid machine-gun stacking
        last[name] = ev['t']
        x = render(name, ev.get('dur')) * g; s = n(ev['t'])
        if s >= L: continue
        e = min(L, s + len(x)); fx[s:e] += x[:e - s]

def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    a = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)
    return a[:L] if len(a) >= L else np.pad(a, ((0, L - len(a)), (0, 0)))
end = n(DUR)
mus = load(opt('--music')) if opt('--music') and os.path.exists(opt('--music')) else np.zeros((L, 2))
vo = load(opt('--vo')) * float(os.environ.get('VO_GAIN', 1.0)) if opt('--vo') and os.path.exists(opt('--vo')) else np.zeros((L, 2))
env = np.ones(L); env[:n(0.4)] = np.linspace(0, 1, n(0.4)); fo = min(n(2.5), end); env[end - fo:end] = np.linspace(1, 0, fo); env[end:] = 0
duck = np.ones(L)
if np.any(vo):  # sidechain: music dips ~9 dB while the voice talks
    lvl = np.abs(vo).mean(1); w = n(0.25); lvl = np.convolve(lvl, np.ones(w) / w, 'same'); talk = (lvl > lvl.max() * 0.04).astype(float)
    k = n(0.3); talk = np.convolve(talk, np.ones(k) / k, 'same'); duck = 1 - 0.65 * np.clip(talk, 0, 1)
mus *= (env * duck * float(os.environ.get('MUSIC_GAIN', 0.30)))[:, None]
SG = float(os.environ.get('SFX_GAIN', 0.55)) * (0.8 if np.any(vo) else 1)
mix = mus + vo + np.stack([fx * SG * 1.03, fx * SG * 0.97], 1)
mix = (np.tanh(mix * 1.1) / np.tanh(1.1))[:end]
with wave.open(OUT, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
print('mezcla', OUT, f'{len(events)} eventos · perfil {(meta.get("style") or {}).get("sfx")} · {DUR:.2f}s')
