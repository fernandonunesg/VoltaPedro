import sharp from 'sharp';
import path from 'path';

const inputPath = 'C:/Users/ferna/.gemini/antigravity/brain/49a8af35-02a1-43a6-b80d-54ec28a3e8e4/.user_uploaded/media_1792117229209_5bd41235.jpg';
const outputDir = 'C:/Users/ferna/.gemini/antigravity/brain/49a8af35-02a1-43a6-b80d-54ec28a3e8e4';

async function makeToscoEdits() {
  // 1. Create a "Censored / Tarja Preta" or "Red Patch" over the political text
  // Let's create an SVG overlay to cover the text on the chest with a red patch and funny badge
  // Dimensions of original: 1024x1008
  // Text area is roughly x: 0 to 900, y: 640 to 1008
  
  // Let's make an SVG with a funny neobrutalist yellow/black tape: "TÔ CHEGANDO EM 5 MIN" or clean red patch
  const patchSvg = Buffer.from(`
    <svg width="1024" height="1008">
      <!-- Cobrir o tucano e texto da esquerda com fundo amarelo do site -->
      <path d="M 0 0 L 340 0 L 260 450 L 0 550 Z" fill="#FBBF24" />
      
      <!-- Cobrir o texto da camisa com vermelho da camisa -->
      <rect x="0" y="660" width="820" height="348" fill="#C81824" />
      
      <!-- Tarja tosca e divertida estilo fita zebrada / neobrutalista -->
      <g transform="rotate(-4 450 780)">
        <rect x="50" y="720" width="680" height="90" fill="#1C1917" rx="12" />
        <text x="390" y="780" font-family="Arial Black, Impact, sans-serif" font-weight="900" font-size="44" fill="#FBBF24" text-anchor="middle" letter-spacing="2">⚠️ TÔ CHEGANDO (CONFIA)</text>
      </g>
    </svg>
  `);

  const patched = await sharp(inputPath)
    .composite([{ input: patchSvg, top: 0, left: 0 }])
    .png()
    .toBuffer();

  // Agora pixelar o resultado para ficar tosco/retrô fiel
  const pixelPatchedSmall = await sharp(patched)
    .resize(110, Math.round(110 * (1008 / 1024)), { kernel: 'nearest' })
    .png()
    .toBuffer();

  await sharp(pixelPatchedSmall)
    .resize(1024, 1008, { kernel: 'nearest' })
    .modulate({ saturation: 1.5, brightness: 1.05 })
    .toFile(path.join(outputDir, 'pedro_tosco_tarja_pixel.png'));

  // 2. Versão com o vermelho limpo na camisa (sem texto nenhum) + pixelado
  const cleanRedSvg = Buffer.from(`
    <svg width="1024" height="1008">
      <path d="M 0 0 L 340 0 L 280 430 L 0 520 Z" fill="#EAB308" />
      <rect x="0" y="650" width="820" height="358" fill="#BA141E" />
    </svg>
  `);

  const cleanPatched = await sharp(inputPath)
    .composite([{ input: cleanRedSvg, top: 0, left: 0 }])
    .png()
    .toBuffer();

  // Pixelado 80px (bem tosco e pixelado)
  const p80 = await sharp(cleanPatched)
    .resize(85, Math.round(85 * (1008 / 1024)), { kernel: 'nearest' })
    .png()
    .toBuffer();

  await sharp(p80)
    .resize(1024, 1008, { kernel: 'nearest' })
    .modulate({ saturation: 1.55, brightness: 1.08 })
    .toFile(path.join(outputDir, 'pedro_tosco_limpo_pixel85.png'));

  // 3. Versão Pop-Art / Dithered / Cores Trocadas (Estilo Warhol tosco)
  // Hue shift (camisa roxa/azul ou fundo psicodélico)
  await sharp(p80)
    .resize(1024, 1008, { kernel: 'nearest' })
    .modulate({ saturation: 2.2, hue: 130, brightness: 1.1 })
    .toFile(path.join(outputDir, 'pedro_tosco_psicodelico_cores.png'));

  console.log('Finished tosco edits!');
}

makeToscoEdits().catch(console.error);
