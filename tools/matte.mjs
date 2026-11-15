// Cuts the studio portrait out of its plain backdrop.
// Usage: node tools/matte.mjs   (reads src/assets/source/portrait.jpg)
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SRC = 'src/assets/source/portrait.jpg';
const OUT_DIR = 'src/assets/img';
const DEBUG = process.argv.includes('--debug');
mkdirSync(OUT_DIR, { recursive: true });

const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, N = W * H;
const lum = (i) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

// 1. Model the backdrop (a soft vignette) with a quadratic surface per channel,
//    fitted on areas the subject never reaches.
const isSureBackdrop = (x, y) =>
  y < 46 || (x < 165 && y < 455) || (x > 535 && y < 455) || (x < 40 && y < 560) || (x > 668 && y < 520);

const basis = (x, y) => { const u = x / W - 0.5, v = y / H - 0.5; return [1, u, v, u * u, u * v, v * v]; };
const fit = [0, 1, 2].map((c) => {
  const A = Array.from({ length: 6 }, () => new Float64Array(7));
  for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) {
    if (!isSureBackdrop(x, y)) continue;
    const b = basis(x, y), val = data[(y * W + x) * 3 + c];
    for (let i = 0; i < 6; i++) { for (let j = 0; j < 6; j++) A[i][j] += b[i] * b[j]; A[i][6] += b[i] * val; }
  }
  for (let i = 0; i < 6; i++) {            // Gauss-Jordan
    let p = i; for (let r = i + 1; r < 6; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]];
    const d = A[i][i]; for (let j = i; j < 7; j++) A[i][j] /= d;
    for (let r = 0; r < 6; r++) if (r !== i) { const f = A[r][i]; for (let j = i; j < 7; j++) A[r][j] -= f * A[i][j]; }
  }
  return A.map((row) => row[6]);
});
const bg = new Float32Array(N * 3);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const b = basis(x, y), o = (y * W + x) * 3;
  for (let c = 0; c < 3; c++) { let s = 0; for (let i = 0; i < 6; i++) s += fit[c][i] * b[i]; bg[o + c] = s; }
}

// 2. Score how unlike the backdrop each pixel is. Darker and more colourful both count;
//    brighter counts extra, because the white collar sits right against the backdrop.
const score = new Float32Array(N);
for (let p = 0; p < N; p++) {
  const o = p * 3;
  const L = lum(o), BL = 0.299 * bg[o] + 0.587 * bg[o + 1] + 0.114 * bg[o + 2];
  const chroma = Math.hypot((data[o] - data[o + 1]) - (bg[o] - bg[o + 1]), (data[o + 2] - data[o + 1]) - (bg[o + 2] - bg[o + 1]));
  score[p] = Math.max(BL - L, (L - BL) * 2.6, chroma * 1.6);
}

const T_BIN = 9, T0 = 7, T1 = 30;

// The right collar wing is the same white as the backdrop, so nothing separates them.
// This short wall across the top of the collar stops the backdrop flooding into the shirt.
const WALLS = [[414, 461, 431, 469]];
const wall = new Uint8Array(N);
for (const [x0, y0, x1, y1] of WALLS) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + (x1 - x0) * i / steps), y = Math.round(y0 + (y1 - y0) * i / steps);
    for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) wall[(y + dy) * W + x + dx] = 1;
  }
}

// 3. Flood the backdrop in from the top and side edges.
const backdrop = new Uint8Array(N);
const stack = [];
const seed = (x, y) => { const p = y * W + x; if (!backdrop[p] && !wall[p] && score[p] < T_BIN) { backdrop[p] = 1; stack.push(p); } };
for (let x = 0; x < W; x++) seed(x, 0);
for (let y = 0; y < H; y++) { seed(0, y); seed(W - 1, y); }
while (stack.length) {
  const p = stack.pop(), x = p % W, y = (p / W) | 0;
  if (x > 0) seed(x - 1, y); if (x < W - 1) seed(x + 1, y);
  if (y > 0) seed(x, y - 1); if (y < H - 1) seed(x, y + 1);
}

// 4. Keep only the largest solid region, so specks in the backdrop drop out.
const solid = new Uint8Array(N); for (let p = 0; p < N; p++) solid[p] = backdrop[p] ? 0 : 1;   // walls count as solid
const label = new Int32Array(N); let best = 0, bestSize = 0, next = 0;
for (let s = 0; s < N; s++) {
  if (!solid[s] || label[s]) continue;
  const id = ++next; let size = 0; const q = [s]; label[s] = id;
  while (q.length) {
    const p = q.pop(), x = p % W, y = (p / W) | 0; size++;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx; if (solid[n] && !label[n]) { label[n] = id; q.push(n); }
    }
  }
  if (size > bestSize) { bestSize = size; best = id; }
}
for (let p = 0; p < N; p++) solid[p] = label[p] === best ? 1 : 0;

const morph = (src, grow) => {
  const out = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = grow ? 0 : 1;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = Math.min(W - 1, Math.max(0, x + dx)), ny = Math.min(H - 1, Math.max(0, y + dy));
      const s = src[ny * W + nx]; if (grow ? s : !s) v = grow ? 1 : 0;
    }
    out[y * W + x] = v;
  }
  return out;
};
const core = morph(morph(solid, false), false);
const reach = morph(morph(solid, true), true);

// 5. Soft alpha only in the band around the outline, then a light blur.
const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
let alpha = new Float32Array(N);
for (let p = 0; p < N; p++) alpha[p] = core[p] ? 1 : reach[p] ? smooth(T0, T1, score[p]) : 0;
const blur = (src) => {
  const k = [0.2, 0.6, 0.2], tmp = new Float32Array(N), out = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0; for (let i = -1; i <= 1; i++) s += k[i + 1] * src[y * W + Math.min(W - 1, Math.max(0, x + i))]; tmp[y * W + x] = s;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0; for (let i = -1; i <= 1; i++) s += k[i + 1] * tmp[Math.min(H - 1, Math.max(0, y + i)) * W + x]; out[y * W + x] = s;
  }
  return out;
};
const soft = blur(alpha);
for (let p = 0; p < N; p++) alpha[p] = core[p] ? 1 : soft[p];

// 6. Colour the soft edge from the solid subject next to it, so no pale backdrop
//    fringe survives: grow the solid colours outward a few pixels.
const ext = new Float32Array(N * 3), has = new Uint8Array(N);
for (let p = 0; p < N; p++) if (core[p]) { has[p] = 1; for (let c = 0; c < 3; c++) ext[p * 3 + c] = data[p * 3 + c]; }
for (let pass = 0; pass < 5; pass++) {
  const add = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const p = y * W + x; if (has[p] || alpha[p] <= 0) continue;
    let n = 0, r = 0, g = 0, b = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const q = (y + dy) * W + x + dx; if (!has[q]) continue;
      n++; r += ext[q * 3]; g += ext[q * 3 + 1]; b += ext[q * 3 + 2];
    }
    if (n) add.push([p, r / n, g / n, b / n]);
  }
  for (const [p, r, g, b] of add) { has[p] = 1; ext[p * 3] = r; ext[p * 3 + 1] = g; ext[p * 3 + 2] = b; }
}
const rgba = Buffer.alloc(N * 4);
for (let p = 0; p < N; p++) {
  const o = p * 3, a = alpha[p];
  for (let c = 0; c < 3; c++) {
    let v = data[o + c];
    if (!core[p] && a > 0) v = has[p] ? ext[o + c] : (v - (1 - a) * bg[o + c]) / Math.max(a, 0.05);
    rgba[p * 4 + c] = Math.min(255, Math.max(0, Math.round(v)));
  }
  rgba[p * 4 + 3] = Math.round(a * 255);
}

const img = () => sharp(rgba, { raw: { width: W, height: H, channels: 4 } });
await img().png({ compressionLevel: 9 }).toFile(`${OUT_DIR}/portrait-cutout.png`);
await img().webp({ quality: 90, alphaQuality: 95, effort: 6 }).toFile(`${OUT_DIR}/portrait-cutout.webp`);
await sharp(SRC).webp({ quality: 88, effort: 6 }).toFile(`${OUT_DIR}/portrait.webp`);

if (DEBUG) {
  const a8 = Buffer.alloc(N); for (let p = 0; p < N; p++) a8[p] = Math.round(alpha[p] * 255);
  await sharp(a8, { raw: { width: W, height: H, channels: 1 } }).png().toFile('reference/matte-alpha.png');
  await sharp({ create: { width: W, height: H, channels: 4, background: '#1f7a3a' } })
    .composite([{ input: await img().png().toBuffer() }]).png().toFile('reference/matte-on-green.png');
}
const covered = alpha.reduce((s, a) => s + a, 0) / N;
console.log(`portrait ${W}x${H}, subject covers ${(covered * 100).toFixed(1)}% of the frame`);
