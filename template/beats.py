"""Analyse a music track → audio/beats.json (tempo, beat times, beat strength, sections).
The engine reads it to land transitions on strong beats and shake the camera on hits.
Usage: python3 beats.py audio/music.mp3        (needs: pip install librosa)"""
import json, sys
import numpy as np
import librosa

y, sr = librosa.load(sys.argv[1], sr=22050, mono=True)
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units='time')
tempo = float(np.atleast_1d(tempo)[0])
env = librosa.onset.onset_strength(y=y, sr=sr)
strength = np.interp(beats, librosa.times_like(env, sr=sr), env)
mf = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
sections = librosa.frames_to_time(librosa.segment.agglomerative(mf, 8), sr=sr)
json.dump({'tempo': tempo, 'beats': np.round(beats, 3).tolist(), 'strength': np.round(strength, 3).tolist(),
           'sections': np.round(sections, 2).tolist()}, open('audio/beats.json', 'w'))
print(f'tempo {tempo:.1f} BPM · {len(beats)} beats · beat every {60 / tempo:.3f}s · sections {np.round(sections, 1).tolist()}')
