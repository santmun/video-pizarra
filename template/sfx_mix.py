"""Synthesizes every SFX procedurally (no sample files needed), places them from sfx.json
(written by render.mjs) and mixes them with an optional music bed.

Usage: python3 sfx_mix.py <duration_s> <out.wav> [music.mp3]
  SWELL=1   music swells into every transition hit (reads hits.json + audio/beats.json)
  MUSIC_GAIN=0.30  SFX_GAIN=0.6"""
import json, subprocess, sys
import numpy as np

SR = 44100
rng = np.random.default_rng(7)
DUR = float(sys.argv[1]); OUT = sys.argv[2]


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


SCR = {  # scribble flavours per drawing tool
    'scr_marker': (1700, 6500, 9, 0.0, 0.26), 'scr_chalk': (1100, 7500, 7, 0.9, 0.34),
    'scr_quill': (2800, 9500, 12, 0.25, 0.22), 'scr_pencil': (2200, 8500, 10, 0.1, 0.2),
    'scr_brush': (250, 2600, 4, 0.0, 0.24), 'draw_soft': (400, 3000, 5, 0.0, 0.1),
}
FIXED = dict(pop=S_pop, blip=S_blip, boing=S_boing, hop=S_hop, whoosh=S_whoosh, whoosh_in=S_whoosh_in,
             whoosh_down=S_whoosh_down, sparkle=S_sparkle, coin=S_coin, rise=S_rise, stamp=S_stamp, swell=S_swell,
             rev=S_rev, boom=S_boom, paper=S_paper, tick=S_tick, splash=S_splash, burst=S_burst, thud=S_thud,
             flip=S_flip, ding=S_ding, shimmer=S_shimmer, card=S_card, spit=S_spit, kick=S_kick, clap=S_clap,
             clink=S_clink, grunt=S_grunt, cash=S_cash, firework=S_firework, slap=S_slap)
cache = {}

def make(ev):
    name, d = ev['name'], ev.get('dur') or 0.5
    if name in SCR:
        lo, hi, rate, cr, g = SCR[name]; return scribble(max(d, 0.1), lo, hi, rate, cr) * g
    if name == 'erase': return S_erase(d)
    if name == 'type': return S_type(d, ev.get('n'))
    if name == 'riser': return S_riser(d)
    if name == 'skate': return S_skate(d)
    if name == 'steps': return S_steps(d)
    if name not in cache: cache[name] = FIXED[name]()
    return cache[name]


events = json.load(open('sfx.json'))
L = n(DUR + 1)
fx = np.zeros(L)
missing = set()
for ev in events:
    if ev['name'] not in FIXED and ev['name'] not in SCR and ev['name'] not in ('erase', 'type', 'riser', 'skate', 'steps'):
        missing.add(ev['name']); continue
    x = make(ev) * ev.get('gain', 1)
    s = n(ev['t'])
    if s >= L: continue
    e = min(L, s + len(x)); fx[s:e] += x[:e - s]
if missing: print('missing sfx:', missing)

# music bed (optional)
import os
MUSIC = sys.argv[3] if len(sys.argv) > 3 else None
if MUSIC and os.path.exists(MUSIC):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', MUSIC, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    mus = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)
    mus = mus[:L] if len(mus) >= L else np.pad(mus, ((0, L - len(mus)), (0, 0)))
else:
    mus = np.zeros((L, 2))
env = np.ones(L); env[:n(0.4)] = np.linspace(0, 1, n(0.4))
fo = n(2.8); end = n(DUR)
env[end - fo:end] = np.linspace(1, 0, fo); env[end:] = 0
mus *= env[:, None] * float(os.environ.get('MUSIC_GAIN', 0.30))

# swell the music into every transition hit
if os.environ.get('SWELL') == '1' and os.path.exists('hits.json') and os.path.exists('audio/beats.json'):
    hits = [h['t'] for h in json.load(open('hits.json'))]
    beat = 60 / json.load(open('audio/beats.json'))['tempo']
    g = np.zeros(L); tv = np.arange(L) / SR
    for h in hits:
        pre = (tv > h - 2 * beat) & (tv <= h)
        g[pre] = np.maximum(g[pre], ((tv[pre] - (h - 2 * beat)) / (2 * beat)) ** 2)
        post = (tv > h) & (tv < h + 1.2)
        g[post] = np.maximum(g[post], np.exp(-(tv[post] - h) / 0.35))
    mus *= (1 + 0.75 * g)[:, None]

# gentle stereo spread for fx and soft-clip the sum
SG = float(os.environ.get('SFX_GAIN', 0.6))
mix = mus + np.stack([fx * SG * 1.03, fx * SG * 0.97], 1)
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix = mix[:end]
pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
import wave
with wave.open(OUT, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('mixed', OUT, f'{len(events)} sfx events, {DUR:.2f}s')
