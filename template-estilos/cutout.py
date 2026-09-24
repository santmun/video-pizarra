"""Recorta a la persona de una foto (quita el fondo) → assets/persona.png listo para el video.
Uso: python3 cutout.py foto.jpg [assets/persona.png]
Necesita: pip install "rembg[cpu]" pillow   (el modelo se descarga solo la primera vez, ~170 MB)
No es IA generativa: solo separa a la persona del fondo."""
import sys
from PIL import Image
from rembg import remove, new_session

src = sys.argv[1]; out = sys.argv[2] if len(sys.argv) > 2 else 'assets/persona.png'
im = Image.open(src).convert('RGB')
im.thumbnail((1600, 1600))
cut = remove(im, session=new_session('u2net_human_seg'), post_process_mask=True)
bbox = cut.getchannel('A').point(lambda a: 255 if a > 40 else 0).getbbox()
if not bbox: sys.exit('No encontré a una persona en la foto. Usa una foto de frente, de medio cuerpo, con buena luz.')
cut = cut.crop(bbox)
# keep head-to-chest framing: max height = 1.25 × width
w, h = cut.size
if h > w * 1.25: cut = cut.crop((0, 0, w, int(w * 1.25)))
cut.save(out)
print(f'OK {out} {cut.size[0]}x{cut.size[1]} — revisa que la cabeza no esté cortada y que no queden restos del fondo')
