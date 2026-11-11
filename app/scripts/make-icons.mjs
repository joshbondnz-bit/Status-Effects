// Placeholder app icon, splash and Android icons: a pixel heart on the night sky.
// Replace the PNGs in assets/ with the real artwork when it's ready (same file names and sizes).
// Run from the app folder:  node scripts/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

// The heart, 15 × 13. R red, h highlight, D shade; an outline is added around it.
const HEART = [
  '..RRRR...RRRR..',
  '.RhhRRR.RRRRRR.',
  'RhhRRRRRRRRRRRD',
  'RhRRRRRRRRRRRRD',
  'RRRRRRRRRRRRRRD',
  'RRRRRRRRRRRRRDD',
  '.RRRRRRRRRRRDD.',
  '..RRRRRRRRRDD..',
  '...RRRRRRRDD...',
  '....RRRRRDD....',
  '.....RRRDD.....',
  '......RDD......',
  '.......D.......',
];
const PAL = { R: [229, 72, 79], h: [255, 154, 134], D: [141, 29, 51], O: [12, 9, 18] };
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map(r => r.map(v => (v + .5) / 16));
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/** Heart with outline as a grid of colours (null = empty). */
function heartGrid() {
  const H = HEART.length + 2, W = HEART[0].length + 2;
  const at = (x, y) => (y >= 0 && y < HEART.length && x >= 0 && x < HEART[0].length ? HEART[y][x] : '.');
  const g = [];
  for (let y = 0; y < H; y++) {
    const row = [];
    for (let x = 0; x < W; x++) {
      const c = at(x - 1, y - 1);
      if (c !== '.') row.push(PAL[c]);
      else if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x - 1 + dx, y - 1 + dy) !== '.')) row.push(PAL.O);
      else row.push(null);
    }
    g.push(row);
  }
  return g;
}

/**
 * Draw an image `size` px square on a grid of `cells` art pixels. `bg` paints the background
 * (null = transparent), `heartCells` sets how many art pixels wide the heart is drawn.
 */
function draw(size, cells, { bg, heartScale = 1, color }) {
  const px = new Uint8Array(size * size * 4);
  const cell = size / cells;
  const heart = heartGrid();
  const hw = heart[0].length * heartScale, hh = heart.length * heartScale;
  const ox = Math.floor((cells - hw) / 2), oy = Math.floor((cells - hh) / 2) + (heartScale > 1 ? 1 : 0);
  const stars = [[4, 4], [26, 3], [21, 7], [7, 25], [28, 22], [12, 2], [2, 15]];
  for (let cy = 0; cy < cells; cy++) for (let cx = 0; cx < cells; cx++) {
    let c = null;
    if (bg) {
      // Night sky: dithered from near-black at the top to a deep purple at the bottom, with a few stars.
      const u = (cy / (cells - 1)) * 4;
      const step = Math.floor(u) + (u % 1 > BAYER[cy & 3][cx & 3] ? 1 : 0);
      c = mix(hex('#07060f'), hex('#2a1c33'), Math.min(step, 4) / 4);
      if (stars.some(([sx, sy]) => sx === cx && sy === cy)) c = mix(c, hex('#fff3d6'), 0.7);
    }
    const hx = Math.floor((cx - ox) / heartScale), hy = Math.floor((cy - oy) / heartScale);
    const hc = hy >= 0 && hy < heart.length && hx >= 0 && hx < heart[0].length && cx >= ox && cy >= oy ? heart[hy][hx] : null;
    if (hc) c = color ?? hc;
    for (let y = Math.round(cy * cell); y < Math.round((cy + 1) * cell); y++) for (let x = Math.round(cx * cell); x < Math.round((cx + 1) * cell); x++) {
      const k = (y * size + x) * 4;
      if (c) { px[k] = c[0]; px[k + 1] = c[1]; px[k + 2] = c[2]; px[k + 3] = 255; }
    }
  }
  return px;
}

// ---- PNG writer (RGB or RGBA) ----
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = buf => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0); out.write(type, 4, 'ascii'); data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function png(size, rgba, alpha) {
  const ch = alpha ? 4 : 3, row = 1 + size * ch, raw = Buffer.alloc(row * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) for (let i = 0; i < ch; i++) raw[y * row + 1 + x * ch + i] = rgba[(y * size + x) * 4 + i];
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = alpha ? 6 : 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const save = (name, size, img, alpha) => { const b = png(size, img, alpha); writeFileSync(`assets/${name}.png`, b); console.log(`assets/${name}.png ${size}px ${(b.length / 1024).toFixed(0)} KB`); };

// iOS icon: no transparency allowed. Heart drawn 2× on a 48-cell grid, leaving room for the rounded corners.
save('icon', 1024, draw(1024, 48, { bg: true, heartScale: 2 }), false);
// Splash: the heart alone on transparent (the splash background colour is set in app.json).
save('splash-icon', 1024, draw(1024, 32, { bg: false, heartScale: 1 }), true);
// Android adaptive icon: heart in the middle (safe zone), sky as the background layer, white heart for themed icons.
save('android-icon-foreground', 512, draw(512, 34, { bg: false, heartScale: 1 }), true);
save('android-icon-background', 512, draw(512, 32, { bg: true, heartScale: 0.0001 }), true);
save('android-icon-monochrome', 432, draw(432, 34, { bg: false, heartScale: 1, color: [255, 255, 255] }), true);
save('favicon', 48, draw(48, 24, { bg: true, heartScale: 1 }), true);
