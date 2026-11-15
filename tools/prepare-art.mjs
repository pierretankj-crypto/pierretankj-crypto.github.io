// Prepares the hero aura plates, the hologram mech atlas and the case-study images.
// Usage: node tools/prepare-art.mjs [--debug]
import sharp from 'sharp';
import { mkdirSync, readdirSync } from 'node:fs';

const DEBUG = process.argv.includes('--debug');
const IMG = 'src/assets/img';
const WORK = 'src/assets/work';
mkdirSync(IMG, { recursive: true });
mkdirSync(WORK, { recursive: true });

/* ------------------------------------------------------------------ */
/* 1. Mech sheet: key out the white page, split the four views         */
/* ------------------------------------------------------------------ */
async function mech() {
  const { data, info } = await sharp('src/assets/raw/mech-sheet.jpg')
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const dark = new Float32Array(N);         // distance from paper white
  const chroma = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    dark[i] = 255 - Math.min(r, g, b);
    chroma[i] = Math.max(r, g, b) - Math.min(r, g, b);
  }
  // Flood the paper from every border pixel.
  const bg = new Uint8Array(N);
  const stack = [];
  const seed = (x, y) => { const i = y * W + x; if (!bg[i] && dark[i] < 34 && chroma[i] < 22) { bg[i] = 1; stack.push(i); } };
  for (let x = 0; x < W; x++) { seed(x, 0); seed(x, H - 1); }
  for (let y = 0; y < H; y++) { seed(0, y); seed(W - 1, y); }
  while (stack.length) {
    const i = stack.pop(), x = i % W, y = (i / W) | 0;
    if (x > 0) seed(x - 1, y); if (x < W - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1); if (y < H - 1) seed(x, y + 1);
  }
  // Distance (in px, up to 3) from the flooded paper, for a soft anti-aliased edge.
  const near = new Uint8Array(N).fill(9);
  for (let i = 0; i < N; i++) if (bg[i]) near[i] = 0;
  for (let pass = 1; pass <= 3; pass++) {
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x; if (near[i] <= pass) continue;
      if (near[i - 1] === pass - 1 || near[i + 1] === pass - 1 || near[i - W] === pass - 1 || near[i + W] === pass - 1) near[i] = pass;
    }
  }
  const out = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    let a;
    if (bg[i]) a = 0;
    else if (near[i] <= 2) a = Math.min(1, Math.max(0, (dark[i] - 10) / 70)); // edge band: alpha from ink density
    else a = 1;
    let r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    if (a > 0 && a < 1) { // un-mix the white paper out of edge pixels
      r = Math.min(255, Math.max(0, (r - 255 * (1 - a)) / a));
      g = Math.min(255, Math.max(0, (g - 255 * (1 - a)) / a));
      b = Math.min(255, Math.max(0, (b - 255 * (1 - a)) / a));
    }
    out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b; out[i * 4 + 3] = Math.round(a * 255);
  }
  // The views overlap in x (an antenna reaches over its neighbour), so split them
  // by connected components, each assigned to the nearest of four view centres.
  const label = new Int32Array(N).fill(-1);
  const comps = [];
  for (let i0 = 0; i0 < N; i0++) {
    if (out[i0 * 4 + 3] === 0 || label[i0] >= 0) continue;
    const id = comps.length; let sx = 0, n = 0;
    const st = [i0]; label[i0] = id;
    while (st.length) {
      const i = st.pop(), x = i % W, y = (i / W) | 0; sx += x; n++;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (j >= 0 && label[j] < 0 && out[j * 4 + 3] > 0) { label[j] = id; st.push(j); }
      }
    }
    comps.push({ cx: sx / n, n });
  }
  // Seed centres from the four largest components, then assign the rest.
  const big = [...comps.keys()].sort((a, b) => comps[b].n - comps[a].n).slice(0, 4).sort((a, b) => comps[a].cx - comps[b].cx);
  const centres = big.map((k) => comps[k].cx);
  console.log('mech view centres:', centres.map(Math.round).join(', '), 'components:', comps.length);
  const owner = comps.map((c) => centres.reduce((best, cx, k) => (Math.abs(c.cx - cx) < Math.abs(c.cx - centres[best]) ? k : best), 0));

  let top = H, bot = 0;
  const box = centres.map(() => ({ x0: W, x1: 0, m: 0, mx: 0 }));
  for (let i = 0; i < N; i++) {
    if (label[i] < 0 || out[i * 4 + 3] < 8) continue;
    const x = i % W, y = (i / W) | 0, v = owner[label[i]];
    if (y < top) top = y; if (y > bot) bot = y;
    if (x < box[v].x0) box[v].x0 = x; if (x > box[v].x1) box[v].x1 = x;
    box[v].m += 1; box[v].mx += x;
  }
  // Each view turns about its centre of mass, not its bounding box (antennas skew that).
  for (const b of box) b.axis = b.mx / b.m - b.x0;
  // Shared vertical extent so all views keep the same ground line and scale.
  top = Math.max(0, top - 8); bot = Math.min(H - 1, bot + 8);
  const cellH = bot - top + 1;
  const cellW = Math.ceil(Math.max(...box.map((b) => 2 * Math.max(b.axis, b.x1 - b.x0 + 1 - b.axis)))) + 24;
  const cells = [];
  for (let v = 0; v < 4; v++) {
    const b = box[v], w = b.x1 - b.x0 + 1;
    const piece = Buffer.alloc(w * cellH * 4);
    for (let y = 0; y < cellH; y++) for (let x = 0; x < w; x++) {
      const i = (y + top) * W + (x + b.x0);
      if (label[i] < 0 || owner[label[i]] !== v) continue;
      out.copy(piece, (y * w + x) * 4, i * 4, i * 4 + 4);
    }
    cells.push({ input: await sharp(piece, { raw: { width: w, height: cellH, channels: 4 } }).png().toBuffer(), w, axis: b.axis });
  }
  // Atlas order = turntable order: front, right profile, back, left profile.
  // Sheet order is front, left profile, back, right profile.
  const order = [0, 3, 2, 1];
  const atlasW = cellW * 4;
  const comp = order.map((src, k) => ({
    input: cells[src].input,
    left: k * cellW + Math.round(cellW / 2 - cells[src].axis),
    top: 0,
  }));
  const atlas = sharp({ create: { width: atlasW, height: cellH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comp);
  const atlasBuf = await atlas.png().toBuffer();
  // Power-of-two friendly size for the GPU: 2048 wide.
  const scale = 2048 / atlasW;
  await sharp(atlasBuf).resize(2048, Math.round(cellH * scale), { kernel: 'lanczos3' })
    .webp({ quality: 90, alphaQuality: 95 }).toFile(`${IMG}/mech-atlas.webp`);
  // Single still for the no-WebGL fallback.
  await sharp(cells[0].input).webp({ quality: 88, alphaQuality: 95 }).toFile(`${IMG}/mech-front.webp`);
  if (DEBUG) {
    await sharp(atlasBuf).flatten({ background: '#1e7c3a' }).resize(1600).png().toFile('reference/mech-atlas-on-green.png');
  }
  console.log('mech atlas cell', cellW, 'x', cellH, '-> 2048 x', Math.round(cellH * scale));
}

/* ------------------------------------------------------------------ */
/* 2. Aura sheet: lift the two key frames, align them on the core gem  */
/* ------------------------------------------------------------------ */
async function brightestNear(buf, w, h, cx, cy, rad) {
  // Box-blurred luminance peak near (cx, cy).
  const { data } = await sharp(buf).greyscale().blur(3).raw().toBuffer({ resolveWithObject: true });
  let best = -1, bx = cx, by = cy;
  for (let y = cy - rad; y <= cy + rad; y++) for (let x = cx - rad; x <= cx + rad; x++) {
    const v = data[y * w + x]; if (v > best) { best = v; bx = x; by = y; }
  }
  return { x: bx, y: by, v: best };
}

async function aura() {
  const SRC = 'src/assets/raw/aura-sheet.jpg';
  // Panel interiors inside the brass frames (measured from the sheet).
  const panels = {
    core: { left: 44, top: 112, width: 616, height: 344 },
    surge: { left: 44, top: 562, width: 616, height: 358 },
    eternal: { left: 44, top: 1022, width: 616, height: 356 },
  };
  const OUT_W = 1600, OUT_H = 900;          // 16:9 plate, gem at the centre
  const meta = {};
  for (const [name, r] of Object.entries(panels)) {
    const buf = await sharp(SRC).extract(r).png().toBuffer();
    const gem = await brightestNear(buf, r.width, r.height, Math.round(r.width / 2), Math.round(r.height / 2), 40);
    meta[name] = { gem, w: r.width, h: r.height };
  }
  console.log('aura gems:', JSON.stringify(Object.fromEntries(Object.entries(meta).map(([k, m]) => [k, [m.gem.x, m.gem.y, m.gem.v]]))));
  // Disc scale per frame (outer engraved ring radius, measured by eye on the sheet).
  const discR = { core: 150, surge: 150, eternal: 140 };
  const scaleBase = 2.3;                    // px of output per px of the core frame
  for (const [name, r] of Object.entries(panels)) {
    const s = scaleBase * (discR.core / discR[name]);
    const W2 = Math.round(r.width * s), H2 = Math.round(r.height * s);
    const gx = Math.round(meta[name].gem.x * s), gy = Math.round(meta[name].gem.y * s);
    const up = await sharp(SRC).extract(r)
      .resize(W2, H2, { kernel: 'lanczos3' })
      .sharpen({ sigma: 1.1, m1: 0.6, m2: 1.4 })
      .modulate({ saturation: 1.04 })
      .png().toBuffer();
    // Place the upscaled frame so its gem lands on the plate centre; pad with black.
    const left = Math.round(OUT_W / 2 - gx), top = Math.round(OUT_H / 2 - gy);
    const ex = { left: Math.max(0, -left), top: Math.max(0, -top) };
    const cw = Math.min(W2 - ex.left, OUT_W - Math.max(0, left));
    const ch = Math.min(H2 - ex.top, OUT_H - Math.max(0, top));
    const cut = await sharp(up).extract({ left: ex.left, top: ex.top, width: cw, height: ch }).png().toBuffer();
    await sharp({ create: { width: OUT_W, height: OUT_H, channels: 3, background: '#0a0705' } })
      .composite([{ input: cut, left: Math.max(0, left), top: Math.max(0, top) }])
      .jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toFile(`${IMG}/aura-${name}.jpg`);
  }
  // WebP copies for the page (the JPEGs stay as masters for the share image).
  for (const name of ['core', 'surge', 'eternal']) {
    await sharp(`${IMG}/aura-${name}.jpg`).webp({ quality: 86, smartSubsample: true, effort: 6 }).toFile(`${IMG}/aura-${name}.webp`);
  }
  // Light still for the no-WebGL fallback and the share image.
  await sharp(`${IMG}/aura-eternal.jpg`).resize(1200).webp({ quality: 80 }).toFile(`${IMG}/aura-still.webp`);
}

/* ------------------------------------------------------------------ */
/* 3. Case-study images from the old site                              */
/* ------------------------------------------------------------------ */
const WORK_MAP = {
  'ebo-cover': 11, 'ebo-1': 12, 'ebo-2': 13, 'ebo-3': 14, 'ebo-4': 15, 'ebo-5': 16,
  'pd-cover': 17, 'pd-1': 18, 'pd-2': 19, 'pd-3': 20, 'pd-4': 21, 'pd-5': 22,
  'nesso-cover': 23, 'nesso-1': 24, 'nesso-2': 25, 'nesso-3': 26, 'nesso-4': 27, 'nesso-5': 28,
  'cyber-cover': 29, 'cyber-1': 30, 'cyber-2': 31, 'cyber-3': 32, 'cyber-4': 33,
  'eco-cover': 34, 'eco-1': 35, 'eco-2': 36, 'eco-3': 37, 'eco-4': 38, 'eco-5': 39, 'eco-6': 40, 'eco-7': 41,
};
async function work() {
  const dir = 'reference/old-site';
  const files = readdirSync(dir);
  for (const [name, idx] of Object.entries(WORK_MAP)) {
    const f = files.find((x) => x.startsWith(`site-image-${idx}.`));
    const img = sharp(`${dir}/${f}`);
    const m = await img.metadata();
    const w = Math.min(m.width, 1600);
    await sharp(`${dir}/${f}`).resize(w).flatten({ background: '#ffffff' })
      .webp({ quality: name.endsWith('cover') ? 82 : 86 }).toFile(`${WORK}/${name}.webp`);
  }
  console.log('work images:', Object.keys(WORK_MAP).length);
}

/* ------------------------------------------------------------------ */
/* 4. Portrait card: the cut-out on a warm studio backdrop             */
/* ------------------------------------------------------------------ */
async function portrait() {
  const W = 700, H = 933;
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efe6d1"/><stop offset="1" stop-color="#d3bf99"/></linearGradient>
      <radialGradient id="l" cx="0.5" cy="0.3" r="0.55"><stop offset="0" stop-color="#fbf4e3" stop-opacity="0.9"/><stop offset="1" stop-color="#fbf4e3" stop-opacity="0"/></radialGradient>
      <radialGradient id="v" cx="0.5" cy="0.45" r="0.75"><stop offset="0.6" stop-color="#5a4426" stop-opacity="0"/><stop offset="1" stop-color="#5a4426" stop-opacity="0.35"/></radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#l)"/><rect width="100%" height="100%" fill="url(#v)"/>
  </svg>`);
  await sharp(bg).composite([{ input: `${IMG}/portrait-cutout.png` }])
    .modulate({ saturation: 0.96 })
    .webp({ quality: 90 }).toFile(`${IMG}/portrait-card.webp`);
}

/* ------------------------------------------------------------------ */
/* 5. Share image                                                      */
/* ------------------------------------------------------------------ */
async function share() {
  const title = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0.45" stop-color="#0b0907" stop-opacity="0"/><stop offset="1" stop-color="#0b0907" stop-opacity="0.95"/></linearGradient></defs>
    <rect width="1200" height="630" fill="url(#s)"/>
    <text x="60" y="560" font-family="Didot, 'Bodoni 72', Georgia, serif" font-size="96" letter-spacing="4" fill="#f2dfb4">PIERRE TAN</text>
    <text x="64" y="598" font-family="Menlo, Consolas, monospace" font-size="20" letter-spacing="4" fill="#c2b59b">AI &amp; DATA ENGINEERING · NANYANG POLYTECHNIC</text>
  </svg>`);
  await sharp(`${IMG}/aura-core.jpg`).extract({ left: 200, top: 135, width: 1200, height: 630 })
    .composite([{ input: title }]).jpeg({ quality: 84 }).toFile('public/share.jpg');
}

/* ------------------------------------------------------------------ */
/* 6. Cover profile: backlit side portrait, keyed off its white page   */
/* ------------------------------------------------------------------ */
async function profile() {
  const { data, info } = await sharp('src/assets/raw/profile.jpg').removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const dark = new Float32Array(N);
  for (let i = 0; i < N; i++) dark[i] = 255 - Math.min(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
  // flood the white page from the top and side edges (the shoulders run off the bottom edge)
  const bg = new Uint8Array(N);
  const st = [];
  const seed = (x, y) => { const i = y * W + x; if (!bg[i] && dark[i] < 18) { bg[i] = 1; st.push(i); } };
  for (let x = 0; x < W; x++) seed(x, 0);
  for (let y = 0; y < H; y++) { seed(0, y); seed(W - 1, y); }
  for (let x = 0; x < W; x++) seed(x, H - 1);
  while (st.length) {
    const i = st.pop(), x = i % W, y = (i / W) | 0;
    if (x > 0) seed(x - 1, y); if (x < W - 1) seed(x + 1, y); if (y > 0) seed(x, y - 1); if (y < H - 1) seed(x, y + 1);
  }
  // distance (px, capped) from the page, so the soft backlit halo gets a graded alpha
  const CAP = 16;
  const dist = new Uint8Array(N).fill(CAP);
  for (let i = 0; i < N; i++) if (bg[i]) dist[i] = 0;
  for (let pass = 1; pass < CAP; pass++) {
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x; if (dist[i] <= pass) continue;
      if (dist[i - 1] === pass - 1 || dist[i + 1] === pass - 1 || dist[i - W] === pass - 1 || dist[i + W] === pass - 1) dist[i] = pass;
    }
  }
  const out = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    let a = 1;
    if (bg[i]) a = 0;
    else if (dist[i] < CAP) a = Math.min(1, Math.max(0, (dark[i] - 4) / 120)) ** 0.85;
    let r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    if (a > 0 && a < 1) {
      r = Math.min(255, Math.max(0, (r - 255 * (1 - a)) / a));
      g = Math.min(255, Math.max(0, (g - 255 * (1 - a)) / a));
      b = Math.min(255, Math.max(0, (b - 255 * (1 - a)) / a));
    }
    out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b; out[i * 4 + 3] = Math.round(a * 255);
  }
  const img = sharp(out, { raw: { width: W, height: H, channels: 4 } });
  await img.clone().webp({ quality: 90, alphaQuality: 100 }).toFile(`${IMG}/profile-cutout.webp`);
  if (DEBUG) {
    await img.clone().png().toBuffer().then((b) => sharp({ create: { width: W, height: H, channels: 3, background: '#120d08' } })
      .composite([{ input: b }]).png().toFile('reference/profile-on-dark.png'));
  }
  console.log('profile', W, 'x', H);
}

const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
const steps = { mech, aura, work, portrait, share, profile };
for (const [name, fn] of Object.entries(steps)) if (!only || only.split(',').includes(name)) await fn();
