#!/usr/bin/env node
/**
 * Rasterizes public/icon.svg into the PNG icons the manifest + iOS need.
 * Requires the `sharp` devDependency.  Run:  `npm run generate:icons`
 *
 * Maskable icons get extra padding so the glyph survives Android's circular
 * mask; the badge is a small monochrome-friendly mark for the notification.
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../public/', import.meta.url));
const svg = readFileSync(root + 'icon.svg');
mkdirSync(root + 'icons', { recursive: true });

const targets = [
  { file: 'icons/icon-192.png', size: 192, pad: 0 },
  { file: 'icons/icon-512.png', size: 512, pad: 0 },
  { file: 'icons/maskable-512.png', size: 512, pad: 64 },
  { file: 'icons/apple-touch-icon.png', size: 180, pad: 0 },
  { file: 'icons/badge-72.png', size: 72, pad: 8 },
];

for (const { file, size, pad } of targets) {
  const inner = size - pad * 2;
  const resized = await sharp(svg).resize(inner, inner).png().toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 10, g: 132, b: 255, alpha: pad ? 1 : 0 },
    },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toFile(root + file);
  console.log(`✓ ${file} (${size}×${size})`);
}

console.log('\n✅ Icons generated in public/icons/');
