// Generates PWA + Apple touch icons (brand tile with cream paw motif) using pure-JS pngjs.
// Run: node scripts/generate-icons.mjs
import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public');
mkdirSync(OUT, { recursive: true });

const BRAND = [47, 82, 53];      // #2f5235 forest
const BRAND_DK = [34, 58, 41];   // radial edge
const CREAM = [243, 247, 243];   // paw colour

const lerp = (a, b, t) => Math.round(a + (b - a) * t);
const dist = (x, y, cx, cy) => Math.hypot(x - cx, y - cy);

function makeIcon(size) {
  const png = new PNG({ width: size, height: size });
  const r = size * 0.22;            // corner radius (rounded tile)
  const cx = size / 2, cy = size / 2;
  const maxD = Math.hypot(cx, cy);

  // Paw geometry (relative to size)
  const pad = (px, py, pr) => ({ x: cx + px * size, y: cy + py * size, r: pr * size });
  const pads = [
    pad(0.0, 0.12, 0.16),    // main palm
    pad(-0.2, -0.16, 0.085), // toes
    pad(-0.07, -0.24, 0.085),
    pad(0.07, -0.24, 0.085),
    pad(0.2, -0.16, 0.085),
  ];

  const inRounded = (x, y) => {
    const dx = Math.max(r - x, x - (size - r), 0);
    const dy = Math.max(r - y, y - (size - r), 0);
    return dx * dx + dy * dy <= r * r || (x >= r && x <= size - r) || (y >= r && y <= size - r);
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      if (!inRounded(x, y)) { png.data[idx + 3] = 0; continue; } // transparent outside tile

      // radial brand gradient background
      const t = dist(x, y, cx, cy) / maxD;
      let R = lerp(BRAND[0], BRAND_DK[0], t);
      let G = lerp(BRAND[1], BRAND_DK[1], t);
      let B = lerp(BRAND[2], BRAND_DK[2], t);

      // paw pads (cream) with soft edge anti-aliasing
      let paw = 0;
      for (const p of pads) {
        const d = dist(x, y, p.x, p.y);
        const edge = p.r - d;
        if (edge > -1.5) paw = Math.max(paw, Math.min(1, (edge + 1.5) / 3));
      }
      if (paw > 0) {
        R = lerp(R, CREAM[0], paw);
        G = lerp(G, CREAM[1], paw);
        B = lerp(B, CREAM[2], paw);
      }

      png.data[idx] = R; png.data[idx + 1] = G; png.data[idx + 2] = B; png.data[idx + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  writeFileSync(join(OUT, name), makeIcon(size));
  console.log(`✅ ${name} (${size}×${size})`);
}
console.log('Icons written to public/');
