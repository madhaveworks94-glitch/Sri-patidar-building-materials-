# Runs in GitHub Actions after "npx cap add android": brands the icon and locks text size.
import glob, os
from PIL import Image, ImageDraw

OR = (242, 106, 33, 255)
WHITE = (255, 255, 255, 255)
RES = 'android/app/src/main/res'
SIZES = {'mdpi': (48, 108), 'hdpi': (72, 162), 'xhdpi': (96, 216), 'xxhdpi': (144, 324), 'xxxhdpi': (192, 432)}

def glyph(d, s, box):
    # white receipt with orange lines; box = fraction of canvas the receipt occupies
    w, h = s * box * 0.62, s * box
    x0, y0 = (s - w) / 2, (s - h) / 2
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=s * box * 0.07, fill=WHITE)
    for i in range(4):
        y = y0 + h * (0.2 + i * 0.17)
        d.rectangle([x0 + w * 0.2, y, x0 + w * (0.8 if i < 3 else 0.55), y + h * 0.045], fill=OR)

def legacy(s, round_):
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    if round_: d.ellipse([0, 0, s - 1, s - 1], fill=OR)
    else: d.rounded_rectangle([0, 0, s - 1, s - 1], radius=s * 0.22, fill=OR)
    glyph(d, s, 0.56)
    return im

def foreground(s):
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0)); glyph(ImageDraw.Draw(im), s, 0.52)
    return im

for dens, (legacy_px, fg_px) in SIZES.items():
    folder = f'{RES}/mipmap-{dens}'
    os.makedirs(folder, exist_ok=True)
    legacy(legacy_px, False).save(f'{folder}/ic_launcher.png')
    legacy(legacy_px, True).save(f'{folder}/ic_launcher_round.png')
    foreground(fg_px).save(f'{folder}/dukaan_fg.png')

os.makedirs(f'{RES}/values', exist_ok=True)
open(f'{RES}/values/dukaan_colors.xml', 'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="dukaan_bg">#F26A21</color>\n</resources>\n')
os.makedirs(f'{RES}/mipmap-anydpi-v26', exist_ok=True)
xml = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/dukaan_bg"/>\n    <foreground android:drawable="@mipmap/dukaan_fg"/>\n</adaptive-icon>\n'
for n in ('ic_launcher', 'ic_launcher_round'):
    open(f'{RES}/mipmap-anydpi-v26/{n}.xml', 'w').write(xml)

# Lock the app's text size so it ignores the phone's font scaling
for f in glob.glob('android/app/src/main/java/**/MainActivity.java', recursive=True):
    pkg = next(l.strip() for l in open(f) if l.startswith('package '))
    open(f, 'w').write(pkg + '\n\nimport android.os.Bundle;\nimport com.getcapacitor.BridgeActivity;\n\npublic class MainActivity extends BridgeActivity {\n    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        super.onCreate(savedInstanceState);\n        this.bridge.getWebView().getSettings().setTextZoom(100);\n    }\n}\n')
print('icons and text size done')
