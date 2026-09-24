"""Contact sheet of stills: python3 contact.py <dir> <out.jpg> [cols]"""
import sys, glob
from PIL import Image
files = sorted(glob.glob(sys.argv[1] + '/*.jpg')); cols = int(sys.argv[3]) if len(sys.argv) > 3 else 3
ims = [Image.open(f) for f in files]; w, h = ims[0].size; tw = 640; th = int(h * tw / w)
rows = (len(ims) + cols - 1) // cols; sheet = Image.new('RGB', (cols * tw + (cols + 1) * 8, rows * th + (rows + 1) * 8), '#111')
for i, im in enumerate(ims): sheet.paste(im.resize((tw, th)), (8 + (i % cols) * (tw + 8), 8 + (i // cols) * (th + 8)))
sheet.save(sys.argv[2], quality=85); print(sys.argv[2], sheet.size)
