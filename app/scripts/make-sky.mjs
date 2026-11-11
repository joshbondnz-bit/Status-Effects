// Draws the pixel-art sky backgrounds (the same drawing as the background prototype) and saves them as PNGs.
// Run from the app folder:  node scripts/make-sky.mjs
// Writes assets/sky/*.png and src/skyStars.ts (where the twinkling stars sit).
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const W = 100, H = 214; // the art's own pixels
const SCALE = 10;       // each art pixel becomes 10×10 image pixels, so phones show crisp blocks

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map(r => r.map(v => (v + .5) / 16));
const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function makeArt() {
  const px = new Uint8Array(W * H * 3);
  const put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; px.set(c, (y * W + x) * 3); };
  const get = (x, y) => [...px.subarray((y * W + x) * 3, (y * W + x) * 3 + 3)];
  const blend = (x, y, c, a) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; put(x, y, mix(get(x, y), hex(c), a)); };
  // A stepped (dithered) gradient through [position, colour] stops, 5 bands between stops.
  const dithered = stops => {
    for (let y = 0; y < H; y++) {
      const t = y / (H - 1);
      let i = 0; while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
      const [p0, c0] = stops[i], [p1, c1] = stops[i + 1];
      const u = Math.min(1, Math.max(0, (t - p0) / (p1 - p0))) * 5;
      for (let x = 0; x < W; x++) {
        const step = Math.floor(u) + (u % 1 > BAYER[y & 3][x & 3] ? 1 : 0);
        put(x, y, mix(hex(c0), hex(c1), Math.min(step, 5) / 5));
      }
    }
  };
  return { px, put, blend, dithered };
}

function drawSky(dark, morn) {
  const { px, blend, dithered } = makeArt();
  const r = rng('night'.length * 977 + 13);
  const twinkles = [];
  if (dark) {
    dithered(morn ? [[0, '#0d0b18'], [.35, '#17131f'], [.7, '#2a1c33'], [1, '#4a2638']] : [[0, '#07060f'], [.55, '#17131f'], [1, '#17131f']]);
    const n = morn ? 26 : 46;
    for (let i = 0; i < n; i++) {
      const x = Math.floor(r() * W), y = Math.floor(Math.pow(r(), 1.7) * H * .75);
      const a = (morn ? .45 : .8) * (1 - y / (H * .75));
      blend(x, y, '#fff3d6', a);
      if (r() < .12 && !morn) [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => blend(x + dx, y + dy, '#fff3d6', a * .45));
      else if (r() < .2 && twinkles.length < 7 && y < H * .5) twinkles.push([x, y]);
    }
    // Moon: a crescent, high at night, low and pale near dawn
    const mx = 80, my = morn ? 44 : 14, R = 6;
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
      if (x * x + y * y <= R * R + 1 && (x + 3) * (x + 3) + (y - 1) * (y - 1) > R * R) blend(mx + x, my + y, '#efe2c2', morn ? .45 : .9);
    }
  } else {
    dithered(morn ? [[0, '#9fb6e3'], [.35, '#cdd8ee'], [.65, '#f0e2d0'], [1, '#f2c3a4']] : [[0, '#8fa8dc'], [.4, '#c3cfea'], [.72, '#ece6da'], [1, '#ece6da']]);
    // A pixel sun with a dithered glow (low and warm in the morning), and white clouds with a shaded underside
    const sx = morn ? 24 : 20, sy = morn ? 60 : 16, sun = morn ? '#f5a95e' : '#f7d35a';
    for (let y = -10; y <= 10; y++) for (let x = -10; x <= 10; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d <= 5) blend(sx + x, sy + y, sun, 1);
      else if (d <= 9 && BAYER[(y + 12) & 3][(x + 12) & 3] < (9 - d) / 6) blend(sx + x, sy + y, sun, .45);
    }
    const cloud = (cx, cy, s) => {
      for (let y = -3 * s; y <= 3 * s; y++) for (let x = -9 * s; x <= 9 * s; x++) {
        const d = (x * x) / (81 * s * s) + (y * y) / (9 * s * s) + (y > 0 ? .25 : 0) - (Math.abs(x + 3 * s) < 4 * s && y < 0 ? .35 : 0);
        if (d < 1) blend(cx + x, cy + y, y >= 2 * s ? '#d6def0' : '#ffffff', y >= 2 * s ? .8 : .95);
      }
    };
    cloud(66, 14, 1); cloud(30, 40, .8); cloud(84, 52, .7); cloud(50, 78, .6);
  }
  return { px, twinkles };
}

// ---- A minimal PNG writer (RGB, no extras) ----
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = buf => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0); out.write(type, 4, 'ascii'); data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function png(px) {
  const w = W * SCALE, h = H * SCALE, row = 1 + w * 3;
  const raw = Buffer.alloc(row * h);
  for (let y = 0; y < h; y++) {
    const sy = Math.floor(y / SCALE);
    for (let x = 0; x < w; x++) {
      const s = (sy * W + Math.floor(x / SCALE)) * 3, d = y * row + 1 + x * 3;
      raw[d] = px[s]; raw[d + 1] = px[s + 1]; raw[d + 2] = px[s + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync('assets/sky', { recursive: true });
const stars = {};
for (const [name, dark, morn] of [['night', true, false], ['dawn', true, true], ['day', false, false], ['morning', false, true]]) {
  const { px, twinkles } = drawSky(dark, morn);
  const file = png(px);
  writeFileSync(`assets/sky/${name}.png`, file);
  stars[name] = twinkles.map(([x, y]) => [+(x / W).toFixed(4), +(y / H).toFixed(4)]);
  console.log(`assets/sky/${name}.png  ${(file.length / 1024).toFixed(0)} KB`);
}
writeFileSync('src/skyStars.ts', `// Made by scripts/make-sky.mjs: where the twinkling stars sit on each sky, as fractions of its width and height.
export const SKY_ART = { width: ${W}, height: ${H} } as const;
export const SKY_STARS: Record<'night' | 'dawn' | 'day' | 'morning', [number, number][]> = ${JSON.stringify(stars)};
`);
