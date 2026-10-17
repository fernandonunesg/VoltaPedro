import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const inputPath = 'C:/Users/ferna/.gemini/antigravity/brain/49a8af35-02a1-43a6-b80d-54ec28a3e8e4/.user_uploaded/media_1792117229209_5bd41235.jpg';
const outputDir = 'C:/Users/ferna/.gemini/antigravity/brain/49a8af35-02a1-43a6-b80d-54ec28a3e8e4';

async function generateVariants() {
  const meta = await sharp(inputPath).metadata();
  console.log('Original dimensions:', meta.width, meta.height);

  // Variant 1: Crop on Pedro, pixelated (mosaic 90px), vibrant colors
  // Pedro is mainly from x: 280 to 1024, y: 0 to 950
  const cropPedro = {
    left: 260,
    top: 0,
    width: 1024 - 260,
    height: 950
  };

  // 1. Pixelado clássico (resolução 90px upscale nearest)
  await sharp(inputPath)
    .extract(cropPedro)
    .resize(95, Math.round(95 * (cropPedro.height / cropPedro.width)), { kernel: 'nearest' })
    .resize(764, 950, { kernel: 'nearest' })
    .modulate({ saturation: 1.4, brightness: 1.05 })
    .toFile(path.join(outputDir, 'pedro_v1_pixelado_puro.png'));

  // 2. Pixelado mais suave / retro gamer (150px) com contraste meme
  await sharp(inputPath)
    .extract(cropPedro)
    .resize(140, Math.round(140 * (cropPedro.height / cropPedro.width)), { kernel: 'nearest' })
    .resize(764, 950, { kernel: 'nearest' })
    .modulate({ saturation: 1.5, brightness: 1.08, hue: 15 })
    .linear(1.2, -15) // boost contrast
    .toFile(path.join(outputDir, 'pedro_v2_pixel_contrast.png'));

  // 3. Estilo Posterizado / Warhol / Pop Art Meme (cores saturadas com paleta reduzida)
  await sharp(inputPath)
    .extract(cropPedro)
    .resize(110, Math.round(110 * (cropPedro.height / cropPedro.width)), { kernel: 'nearest' })
    .modulate({ saturation: 2.1, brightness: 1.1, hue: -10 })
    .gamma(1.3)
    .resize(764, 950, { kernel: 'nearest' })
    .toFile(path.join(outputDir, 'pedro_v3_popart_tosco.png'));

  // 4. Pixelado mais radical "8-bit tosco" (60px)
  await sharp(inputPath)
    .extract(cropPedro)
    .resize(60, Math.round(60 * (cropPedro.height / cropPedro.width)), { kernel: 'nearest' })
    .resize(764, 950, { kernel: 'nearest' })
    .modulate({ saturation: 1.6, brightness: 1.05 })
    .toFile(path.join(outputDir, 'pedro_v4_8bit_tosco.png'));

  // 5. Foto inteira (com o tucano e composição original), mas pixelada e com cores vibrantes
  await sharp(inputPath)
    .resize(120, Math.round(120 * (meta.height / meta.width)), { kernel: 'nearest' })
    .resize(meta.width, meta.height, { kernel: 'nearest' })
    .modulate({ saturation: 1.5, brightness: 1.05 })
    .toFile(path.join(outputDir, 'pedro_v5_foto_inteira_pixelada.png'));

  console.log('Done generating all variants!');
}

generateVariants().catch(console.error);
