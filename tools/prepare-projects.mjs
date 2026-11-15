// Builds the media for the three project case studies from the demo videos and screenshots
// in reference/projects/<id>/. Output: src/assets/projects/<id>/.
//   film.mp4 + film.webp   the full narrated walkthrough (captions and sound kept)
//   loop.mp4 + loop.webp   a short muted loop for the Projects row
//   <step>.mp4 + .webp     one muted clip per case-study step, cropped above the burned-in captions
//   <still>.webp           screenshots
// Usage: node tools/prepare-projects.mjs [--only=chief,zenoth,petal] [--force]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import ffmpeg from 'ffmpeg-static';
import sharp from 'sharp';

const args = process.argv.slice(2);
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const force = args.includes('--force');

// crop: the part of the frame kept for clips (fractions of width/height), so captions drop out.
const PROJECTS = {
  chief: {
    film: 'reference/projects/chief/chief-of-staff-demo.mp4', poster: 31,
    crop: { x: 0, y: 0, w: 1, h: 0.835 },
    loop: [26.5, 10],
    clips: { boot: [20.6, 5.4], triage: [26.5, 11], drafts: [38.6, 11], brief: [50.4, 16], ask: [70.4, 15], palette: [86.2, 4.6] },
    stills: { dashboard: 'reference/projects/chief/dashboard.png' },
  },
  zenoth: {
    film: 'reference/projects/zenoth/zenoth-demo.mp4', poster: 14,
    crop: { x: 0.075, y: 0.015, w: 0.85, h: 0.845 },
    loop: [8, 10],
    clips: {
      core: [8, 10], reflex: [18.4, 8], pulse: [27.2, 7], forge: [35, 15], nexus: [50.6, 12], vault: [63.4, 12],
      protocols: [75.6, 10], voice: [88.5, 11], legion: [100, 10], bridge: [111.5, 7],
    },
    stills: { preview: 'reference/projects/zenoth/preview.png', 'nexus-shot': 'reference/projects/zenoth/nexus.png' },
  },
  petal: {
    film: 'reference/projects/petal/petal-finance-demo.mp4', poster: 6,
    crop: { x: 0, y: 0, w: 1, h: 0.875 },
    loop: [4, 12],
    clips: {
      glance: [4, 11], expense: [23, 12], palette: [36.2, 5], search: [43, 9], calendar: [53, 8],
      goals: [62, 12], accounts: [74.6, 11], trends: [87, 13], theme: [100.2, 7.5],
    },
    stills: {
      'dashboard-light': 'reference/projects/petal/dashboard-light.png', 'dashboard-dark': 'reference/projects/petal/dashboard-dark.png',
      budgets: 'reference/projects/petal/budgets.png', trends: 'reference/projects/petal/trends.png',
      'accounts-dark': 'reference/projects/petal/accounts-dark.png', transactions: 'reference/projects/petal/transactions.png',
      mobile: 'reference/projects/petal/mobile.png',
    },
  },
};

const run = (a) => execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...a], { stdio: ['ignore', 'ignore', 'inherit'] });
const fresh = (out) => force || !existsSync(out);
const kb = (f) => `${Math.round(statSync(f).size / 1024)} KB`;
const cropF = ({ x, y, w, h }) => `crop=floor(iw*${w}/2)*2:floor(ih*${h}/2)*2:floor(iw*${x}):floor(ih*${y})`;
const hasAudio = (file) => {
  try { execFileSync(ffmpeg, ['-hide_banner', '-i', file], { stdio: 'pipe' }); } catch (e) { return /Audio:/.test(String(e.stderr)); }
  return false;
};

async function poster(src, at, out, vf) {
  const tmp = `${out}.png`;
  run(['-ss', String(at), '-i', src, '-frames:v', '1', '-vf', vf, tmp]);
  await sharp(tmp).webp({ quality: 74, effort: 6 }).toFile(out);
  (await import('node:fs')).rmSync(tmp);
}

function clip(src, [start, dur], out, vf, width, crf) {
  run([
    '-ss', String(start), '-t', String(dur), '-i', src, '-an',
    '-vf', `${vf},scale=${width}:-2:flags=lanczos,fps=30`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-movflags', '+faststart', out,
  ]);
}

for (const [id, p] of Object.entries(PROJECTS)) {
  if (only.length && !only.includes(id)) continue;
  const dir = `src/assets/projects/${id}`;
  mkdirSync(dir, { recursive: true });
  const crop = cropF(p.crop);

  // 1. full walkthrough
  const film = `${dir}/film.mp4`;
  if (fresh(film)) {
    const audio = hasAudio(p.film);
    run([
      '-i', p.film, '-vf', 'scale=1280:-2:flags=lanczos,fps=30',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      ...(audio ? ['-c:a', 'aac', '-b:a', '96k', '-ac', '2'] : ['-an']),
      '-movflags', '+faststart', film,
    ]);
    console.log(id, 'film', kb(film), audio ? '(with sound)' : '(silent)');
  }
  if (fresh(`${dir}/film.webp`)) await poster(p.film, p.poster, `${dir}/film.webp`, 'scale=1280:-2:flags=lanczos');

  // 2. row loop
  const loop = `${dir}/loop.mp4`;
  if (fresh(loop)) {
    clip(p.film, p.loop, loop, crop, 1100, 30);
    await poster(p.film, p.loop[0] + 1, `${dir}/loop.webp`, `${crop},scale=1100:-2:flags=lanczos`);
    console.log(id, 'loop', kb(loop));
  }

  // 3. step clips
  for (const [name, span] of Object.entries(p.clips)) {
    const out = `${dir}/${name}.mp4`;
    if (!fresh(out)) continue;
    clip(p.film, span, out, crop, 1100, 31);
    await poster(p.film, span[0] + Math.min(1, span[1] / 4), `${dir}/${name}.webp`, `${crop},scale=1100:-2:flags=lanczos`);
    console.log(id, name, kb(out));
  }

  // 4. stills
  for (const [name, src] of Object.entries(p.stills)) {
    const out = `${dir}/${name}.webp`;
    if (!fresh(out)) continue;
    const m = await sharp(src).metadata();
    await sharp(src).resize(Math.min(m.width, 1600)).webp({ quality: 84, effort: 6 }).toFile(out);
    console.log(id, name, kb(out));
  }
}
