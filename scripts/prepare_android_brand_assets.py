from pathlib import Path
from PIL import Image, ImageOps

source = Path('/home/ubuntu/upload/654545BB-6DD7-4F3E-8696-CBFCA824F27B.png')
out = Path('/home/ubuntu/orderakan/assets/images')

img = Image.open(source).convert('RGBA')
img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
canvas = Image.new('RGBA', (1024, 1024), (255, 255, 255, 0))
canvas.alpha_composite(img, ((1024 - img.width) // 2, (1024 - img.height) // 2))

# Keep the complete user logo for the standard and adaptive foreground assets.
canvas.save(out / 'icon.png', optimize=True)
canvas.save(out / 'android-icon-foreground.png', optimize=True)
canvas.save(out / 'splash-icon.png', optimize=True)
canvas.save(out / 'favicon.png', optimize=True)

# Adaptive background: opaque white, matching the light logo background.
Image.new('RGBA', (1024, 1024), (255, 255, 255, 255)).save(
    out / 'android-icon-background.png', optimize=True
)

# Monochrome adaptive icon: preserve alpha and use a solid dark silhouette.
alpha = canvas.getchannel('A')
mono = Image.new('RGBA', (1024, 1024), (18, 55, 43, 0))
mono.putalpha(alpha)
mono.save(out / 'android-icon-monochrome.png', optimize=True)

print('Prepared Android brand assets from the supplied logo.')
for name in ('icon.png', 'android-icon-foreground.png', 'android-icon-background.png', 'android-icon-monochrome.png', 'splash-icon.png', 'favicon.png'):
    p = out / name
    print(name, p.stat().st_size)
