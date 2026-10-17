import sharp from 'sharp';
import path from 'path';

const inputPath = 'C:/Users/ferna/.gemini/antigravity/brain/49a8af35-02a1-43a6-b80d-54ec28a3e8e4/.user_uploaded/media_1792117229209_5bd41235.jpg';
const outputDir = 'C:/Users/ferna/.gemini/antigravity/brain/49a8af35-02a1-43a6-b80d-54ec28a3e8e4';

async function run() {
  const meta = await sharp(inputPath).metadata();
  console.log('Original dimensions:', meta.width, meta.height);

  // Focus on Pedro (cropping out the toucan and PSDB logo on the left)
  // Let's find Pedro's face and torso
  const cropPedro = {
    left: 280,
    top: 0,
    width: 1024 - 280,
    height: 1008
  };

  // Test 1: Real 64px pixelation (low-fi / tosco / faithful)
  const low64 = await sharp(inputPath)
    .extract(cropPedro)
    .resize(64, Math.round(64 * (cropPedro.height / cropPedro.width)), { kernel: 'nearest' })
    .png()
    .toBuffer();

  await sharp(low64)
    .resize(744, 1008, { kernel: 'nearest' })
    .modulate({ saturation: 1.5, brightness: 1.05 })
    .toFile(path.join(outputDir, 'pedro_real_pixel_64.png'));

  // Test 2: Real 100px pixelation (medium pixelated / game boy advance / arcade)
  const low100 = await sharp(inputPath)
    .extract(cropPedro)
    .resize(100, Math.round(100 * (cropPedro.height / cropPedro.width)), { kernel: 'nearest' })
    .png()
    .toBuffer();

  await sharp(low100)
    .resize(744, 1008, { kernel: 'nearest' })
    .modulate({ saturation: 1.6, brightness: 1.08 })
    .toFile(path.join(outputDir, 'pedro_real_pixel_100.png'));

  // Test 3: Real 140px pixelation (suave / tosco detalhado)
  const low140 = await sharp(inputPath)
    .extract(cropPedro)
    .resize(140, Math.round(140 * (cropPedro.height / cropPedro.width)), { kernel: 'nearest' })
    .png()
    .toBuffer();

  await sharp(low140)
    .resize(744, 1008, { kernel: 'nearest' })
    .modulate({ saturation: 1.7, brightness: 1.1, hue: -10 })
    .toFile(path.join(outputDir, 'pedro_real_pixel_140.png'));

  // Test 4: Focus close-up on Pedro's face, sunglasses, and eating the sandwich (cutting below the text!)
  // If we crop from top: 0 to top: 620, we get Pedro's face, hair, sunglasses, and eating the sandwich,
  // completely avoiding the big "45420" and "Deputado" texts!
  const faceAndSandwich = {
    left: 320,
    top: 0,
    width: 680,
    height: 600
  };

  const close64 = await sharp(inputPath)
    .extract(faceAndSandwich)
    .resize(80, Math.round(80 * (faceAndSandwich.height / faceAndSandwich.width)), { kernel: 'nearest' })
    .png()
    .toBuffer();

  await sharp(close64)
    .resize(680, 600, { kernel: 'nearest' })
    .modulate({ saturation: 1.6, brightness: 1.08 })
    .toFile(path.join(outputDir, 'pedro_face_pixel_sem_texto.png'));

  console.log('Successfully generated real pixelated versions!');
}

run().catch(console.error);
