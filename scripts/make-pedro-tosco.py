from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import os

INPUT = 'C:/Users/ferna/.gemini/antigravity/brain/49a8af35-02a1-43a6-b80d-54ec28a3e8e4/.user_uploaded/media_1792117229209_5bd41235.jpg'
OUT_DIR = 'C:/Users/ferna/Documents/VoltaPedro/public'

img = Image.open(INPUT).convert('RGB')
w, h = img.size  # 1024 x 1008

# ============================================================
# STEP 1: Cover political text and toucan with sampled colors
# ============================================================
draw = ImageDraw.Draw(img)

# Cover the toucan and PSDB logo (top-left quadrant) with blue from the background
# Sample the blue from the sky area
draw.polygon([(0, 0), (350, 0), (270, 450), (0, 520)], fill=(40, 80, 200))

# Cover "Pedro Dias Deputado Fode..." text row (y ~ 640-710)
draw.rectangle([(0, 635), (820, 715)], fill=(195, 25, 30))

# Cover "45420" big number (y ~ 710-850)
draw.rectangle([(0, 710), (750, 855)], fill=(195, 25, 30))

# Cover "Juntos somos mais fortes" bottom text (y ~ 855-1008)
draw.rectangle([(0, 850), (820, 1008)], fill=(195, 25, 30))

# Cover remaining small text snippets on the right side
draw.rectangle([(750, 635), (1024, 1008)], fill=(195, 25, 30))

# ============================================================
# STEP 2: Generate multiple "tosco" variants
# ============================================================

def pixelate(image, pixel_size):
    """Pixelate by downscaling then upscaling with nearest neighbor"""
    small_w = max(1, image.width // pixel_size)
    small_h = max(1, image.height // pixel_size)
    small = image.resize((small_w, small_h), Image.NEAREST)
    return small.resize(image.size, Image.NEAREST)

def boost_colors(image, saturation=1.5, contrast=1.2, brightness=1.05):
    """Pump up colors for meme aesthetic"""
    image = ImageEnhance.Color(image).enhance(saturation)
    image = ImageEnhance.Contrast(image).enhance(contrast)
    image = ImageEnhance.Brightness(image).enhance(brightness)
    return image

# --- V1: Pixelado médio + cores saturadas (melhor pro site) ---
v1 = pixelate(img, 10)
v1 = boost_colors(v1, saturation=1.6, contrast=1.15, brightness=1.05)
v1.save(os.path.join(OUT_DIR, 'pedro-tosco-v1.png'))
print('V1 saved: pixelado medio + saturado')

# --- V2: Pixelado mais grosso / 8-bit tosco ---
v2 = pixelate(img, 16)
v2 = boost_colors(v2, saturation=1.8, contrast=1.25, brightness=1.08)
v2.save(os.path.join(OUT_DIR, 'pedro-tosco-v2.png'))
print('V2 saved: 8-bit tosco')

# --- V3: Pixelado suave + posterizado (poucas cores, estilo GBA) ---
v3 = pixelate(img, 8)
v3 = boost_colors(v3, saturation=1.4, contrast=1.3)
# Posterize to reduce color palette (tosco look)
v3 = v3.quantize(colors=24, method=Image.Quantize.MEDIANCUT).convert('RGB')
v3 = v3.resize(img.size, Image.NEAREST)
v3.save(os.path.join(OUT_DIR, 'pedro-tosco-v3.png'))
print('V3 saved: posterizado + pixel')

# --- V4: Close-up no rosto (crop acima do texto) + pixel grosso ---
# Pedro's face and sandwich: roughly x:300-1024, y:0-620
face = img.crop((300, 0, 1024, 620))
v4 = pixelate(face, 12)
v4 = boost_colors(v4, saturation=1.7, contrast=1.2, brightness=1.05)
v4.save(os.path.join(OUT_DIR, 'pedro-tosco-v4-face.png'))
print('V4 saved: close-up face pixel')

# --- V5: Cores invertidas / psicodélico tosco ---
from PIL import ImageOps
v5 = pixelate(img, 12)
v5 = boost_colors(v5, saturation=2.0, contrast=1.1)
# Shift hue by swapping channels for psychedelic look
r, g, b = v5.split()
v5_psych = Image.merge('RGB', (b, r, g))  # swap channels
v5_psych = boost_colors(v5_psych, saturation=1.3, contrast=1.1, brightness=1.1)
v5_psych.save(os.path.join(OUT_DIR, 'pedro-tosco-v5-psych.png'))
print('V5 saved: psicodelico canal swap')

print('\nDone! All variants saved to public/')
