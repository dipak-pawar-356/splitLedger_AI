const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4F46E5"/>
      <stop offset="60%" stop-color="#6366F1"/>
      <stop offset="100%" stop-color="#0EA5E9"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10B981"/>
      <stop offset="100%" stop-color="#34D399"/>
    </linearGradient>
    <linearGradient id="splitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#EEF2FF"/>
    </linearGradient>
  </defs>

  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  <rect x="8" y="8" width="496" height="496" rx="104" fill="none" stroke="#FFFFFF" stroke-opacity="0.15" stroke-width="10"/>

  <!-- Left Ledger Card -->
  <rect x="88" y="120" width="144" height="272" rx="28" fill="url(#splitGrad)"/>
  <rect x="116" y="160" width="88" height="16" rx="8" fill="#4F46E5" fill-opacity="0.85"/>
  <rect x="116" y="196" width="60" height="12" rx="6" fill="#94A3B8"/>
  <rect x="116" y="224" width="76" height="12" rx="6" fill="#CBD5E1"/>
  <rect x="116" y="336" width="88" height="28" rx="10" fill="#4F46E5"/>

  <!-- Right Ledger Card -->
  <rect x="280" y="120" width="144" height="272" rx="28" fill="url(#splitGrad)"/>
  <rect x="308" y="160" width="88" height="16" rx="8" fill="#0EA5E9" fill-opacity="0.85"/>
  <rect x="308" y="196" width="68" height="12" rx="6" fill="#94A3B8"/>
  <rect x="308" y="224" width="52" height="12" rx="6" fill="#CBD5E1"/>
  <rect x="308" y="336" width="88" height="28" rx="10" fill="url(#accentGrad)"/>

  <!-- Center Split Line and Core Indicator -->
  <line x1="220" y1="256" x2="292" y2="256" stroke="#FFFFFF" stroke-width="16" stroke-linecap="round"/>
  <circle cx="256" cy="256" r="22" fill="url(#accentGrad)"/>
  <circle cx="256" cy="256" r="10" fill="#FFFFFF"/>

  <!-- AI Sparkle Top Right -->
  <g transform="translate(350, 60) scale(1.5)">
    <path d="M 32 0 Q 32 32 64 32 Q 32 32 32 64 Q 32 32 0 32 Q 32 32 32 0 Z" fill="#FDE047"/>
    <circle cx="32" cy="32" r="7" fill="#FFFFFF"/>
  </g>

  <!-- AI Sparkle Bottom Left -->
  <g transform="translate(56, 360) scale(0.9)">
    <path d="M 24 0 Q 24 24 48 24 Q 24 24 24 48 Q 24 24 0 24 Q 24 24 24 0 Z" fill="#67E8F9"/>
  </g>
</svg>`;

async function generateAll() {
  const publicDir = path.join(__dirname, '..', 'public');
  const appDir = path.join(__dirname, '..', 'src', 'app');

  // 1. Write SVG icons
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);
  fs.writeFileSync(path.join(appDir, 'icon.svg'), svgContent);

  const svgBuffer = Buffer.from(svgContent);

  // 2. Generate PNG sizes
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(svgBuffer).resize(64, 64).png().toFile(path.join(publicDir, 'icon-64.png'));
  await sharp(svgBuffer).resize(32, 32).png().toFile(path.join(publicDir, 'icon-32.png'));
  await sharp(svgBuffer).resize(16, 16).png().toFile(path.join(publicDir, 'icon-16.png'));

  // 3. Generate multi-resolution ICO for browsers
  const png16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const png48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();

  function createIco(images) {
    const count = images.length;
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // reserved
    header.writeUInt16LE(1, 2); // type 1 = ICO
    header.writeUInt16LE(count, 4);

    let offset = 6 + count * 16;
    const entries = [];
    for (const img of images) {
      const entry = Buffer.alloc(16);
      entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
      entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
      entry.writeUInt8(0, 2); // color palette
      entry.writeUInt8(0, 3); // reserved
      entry.writeUInt16LE(1, 4); // color planes
      entry.writeUInt16LE(32, 6); // bits per pixel
      entry.writeUInt32LE(img.buffer.length, 8); // image size
      entry.writeUInt32LE(offset, 12); // image offset
      entries.push(entry);
      offset += img.buffer.length;
    }

    return Buffer.concat([header, ...entries, ...images.map((img) => img.buffer)]);
  }

  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: png16 },
    { width: 32, height: 32, buffer: png32 },
    { width: 48, height: 48, buffer: png48 },
  ]);

  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);

  console.log('Successfully generated SplitLedger AI icons and favicons in public/ and src/app/!');
}

generateAll().catch(console.error);
