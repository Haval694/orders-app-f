from pathlib import Path
from PIL import Image

assets = [
    Path('/home/ubuntu/orderakan/assets/images/icon.png'),
    Path('/home/ubuntu/orderakan/assets/images/splash-icon.png'),
    Path('/home/ubuntu/orderakan/assets/images/favicon.png'),
]

for path in assets:
    image = Image.open(path).convert('RGBA')
    image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    alpha = image.getchannel('A')
    rgb = image.convert('RGB').quantize(colors=256, method=Image.Quantize.MEDIANCUT)
    optimized = rgb.convert('RGBA')
    optimized.putalpha(alpha)
    optimized.save(path, format='PNG', optimize=True, compress_level=9)
    print(f'{path.name}: {optimized.size} {path.stat().st_size} bytes')
