"""Contact sheet of QA stills → contact.jpg (open it to review a whole video at a glance).
Usage: python3 contact.py [cols]"""
import glob, sys
from PIL import Image
fs = sorted(glob.glob('stills/*.jpg')); cols = int(sys.argv[1]) if len(sys.argv) > 1 else 10
if not fs: sys.exit('no stills — run: node render.mjs --every 1.2')
w0, h0 = Image.open(fs[0]).size; W = 180; Hh = int(W * h0 / w0)
rows = (len(fs) + cols - 1) // cols
c = Image.new('RGB', (W * cols, Hh * rows), 'white')
for i, f in enumerate(fs): c.paste(Image.open(f).resize((W, Hh)), ((i % cols) * W, (i // cols) * Hh))
c.save('contact.jpg', quality=82); print('contact.jpg', len(fs), 'frames')
