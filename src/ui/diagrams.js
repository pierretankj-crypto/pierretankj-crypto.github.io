// Live diagrams for the three projects. Each shows how the system works, not a fake screenshot.
import gmail from '../assets/icons/gmail.svg?raw';
import gcal from '../assets/icons/googlecalendar.svg?raw';
import claude from '../assets/icons/claude.svg?raw';
import ghActions from '../assets/icons/githubactions.svg?raw';
import obsidian from '../assets/icons/obsidian.svg?raw';
import fastapi from '../assets/icons/fastapi.svg?raw';

const NS = 'http://www.w3.org/2000/svg';
const pathOf = (svg) => (svg.match(/ d="([^"]+)"/) || [])[1] || '';

function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  parent?.appendChild(n);
  return n;
}
function text(parent, x, y, str, cls, anchor = 'start') {
  const t = el('text', { x, y, class: cls || '', 'text-anchor': anchor }, parent);
  t.textContent = str;
  return t;
}
function icon(parent, svg, x, y, size, color) {
  const g = el('g', { transform: `translate(${x} ${y}) scale(${size / 24})`, class: 'dg-icon' }, parent);
  el('path', { d: pathOf(svg), fill: color }, g);
  return g;
}
function mic(parent, x, y, color) {
  const g = el('g', { transform: `translate(${x} ${y})`, fill: 'none', stroke: color, 'stroke-width': 1.6, 'stroke-linecap': 'round' }, parent);
  el('rect', { x: 7, y: 1, width: 8, height: 13, rx: 4 }, g);
  el('path', { d: 'M3 10a8 8 0 0 0 16 0M11 18v4' }, g);
  return g;
}
function wave(parent, x, y, color) {
  const g = el('g', { transform: `translate(${x} ${y})`, stroke: color, 'stroke-width': 1.8, 'stroke-linecap': 'round' }, parent);
  [[2, 8, 14], [6, 4, 18], [10, 1, 21], [14, 5, 17], [18, 8, 14]].forEach(([px, a, b]) => el('line', { x1: px, y1: a, x2: px, y2: b }, g));
  return g;
}

function node(svg, { x, y, w, h, label, sub, ico, main, big }) {
  const g = el('g', { class: `dg-node${main ? ' is-main' : ''}` }, svg);
  el('rect', { x, y, width: w, height: h, rx: 6 }, g);
  let tx = x + 16;
  if (ico) { ico(g, x + 14, y + h / 2 - 11); tx = x + 48; }
  if (big) {
    text(g, x + w / 2, y + 30, label, '', 'middle');
    text(g, x + w / 2, y + h / 2 + 14, big, 'big', 'middle');
    if (sub) text(g, x + w / 2, y + h - 16, sub, 'sub', 'middle');
  } else {
    text(g, tx, y + h / 2 - (sub ? 2 : -5), label);
    if (sub) text(g, tx, y + h / 2 + 16, sub, 'sub');
  }
  return g;
}
function chip(svg, { x, y, w, h, label }) {
  const g = el('g', { class: 'dg-chip' }, svg);
  el('rect', { x, y, width: w, height: h, rx: 3 }, g);
  text(g, x + 14, y + h / 2 + 4, label);
  return g;
}
function wire(svg, d, dashed) {
  return el('path', { d, class: `dg-path${dashed ? ' dash' : ''}` }, svg);
}
function base(host, vb) {
  const svg = el('svg', { viewBox: vb, preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true' });
  const defs = el('defs', {}, svg);
  const f = el('filter', { id: 'glow', x: '-200%', y: '-200%', width: '500%', height: '500%' }, defs);
  el('feGaussianBlur', { stdDeviation: 3, result: 'b' }, f);
  const m = el('feMerge', {}, f);
  el('feMergeNode', { in: 'b' }, m);
  el('feMergeNode', { in: 'SourceGraphic' }, m);
  host.appendChild(svg);
  return svg;
}

// Moves a glowing dot along a path.
function pulse(gsap, svg, path, { duration = 0.7, delay = 0 } = {}) {
  const dot = el('circle', { r: 4, class: 'dg-pulse', opacity: 0 }, svg);
  const len = path.getTotalLength();
  const o = { t: 0 };
  return gsap.timeline({ delay })
    .set(dot, { attr: { opacity: 1 } })
    .to(o, {
      t: 1, duration, ease: 'power1.inOut',
      onUpdate: () => { const pt = path.getPointAtLength(o.t * len); dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y); },
    })
    .to(dot, { attr: { opacity: 0 }, duration: 0.15 })
    .add(() => dot.remove());
}
function flash(gsap, g, cls = 'is-hit', hold = 0.7) {
  return gsap.timeline().add(() => g.classList.add(cls)).add(() => g.classList.remove(cls), hold);
}

/* ---------------------------------------------------------------- Chief of Staff */
function chief(host, gsap) {
  const svg = base(host, '0 0 640 500');
  const P = {
    gc: wire(svg, 'M184 101 C 214 101, 214 140, 242 140'),
    cc: wire(svg, 'M184 221 C 214 221, 214 180, 242 180'),
    cm: wire(svg, 'M320 220 V 290'),
    live: wire(svg, 'M106 252 V 325 H 242', true),
    mb: wire(svg, 'M398 325 H 456'),
    ab: wire(svg, 'M398 441 C 440 441, 534 420, 534 360', true),
  };
  const lanes = [80, 132, 184, 236].map((cy) => wire(svg, `M398 312 C 428 312, 426 ${cy}, 456 ${cy}`));
  node(svg, { x: 28, y: 70, w: 156, h: 62, label: 'Gmail', sub: 'Inbox', ico: (g, x, y) => icon(g, gmail, x, y, 22, '#EA4335') });
  node(svg, { x: 28, y: 190, w: 156, h: 62, label: 'Calendar', sub: 'Today', ico: (g, x, y) => icon(g, gcal, x, y, 22, '#4285F4') });
  const cl = node(svg, { x: 242, y: 92, w: 156, h: 128, label: 'Claude', sub: 'Strict JSON', main: true, ico: (g, x, y) => icon(g, claude, x, y - 30, 22, '#D97757') });
  const code = el('g', {}, cl);
  text(code, 258, 172, '{ "label":', 'dg-code');
  const codeVal = text(code, 258, 190, '  "reply" }', 'dg-code dg-code--val');
  const merge = node(svg, { x: 242, y: 290, w: 156, h: 70, label: 'Server merge', sub: 'Live data only' });
  const chips = ['Reply', 'Delegate', 'Archive', 'FYI'].map((label, i) => chip(svg, { x: 456, y: 60 + i * 52, w: 156, h: 40, label }));
  const brief = node(svg, { x: 456, y: 290, w: 156, h: 70, label: 'Brief', sub: 'Morning + evening' });
  node(svg, { x: 242, y: 410, w: 156, h: 62, label: 'GitHub Actions', sub: 'Hourly job', ico: (g, x, y) => icon(g, ghActions, x, y, 22, '#2088FF') });
  // move the Claude label up a little to make room for the code lines
  cl.querySelectorAll('text')[0].setAttribute('y', 128);
  cl.querySelectorAll('text')[1].setAttribute('y', 146);

  const words = ['"reply" }', '"delegate" }', '"archive" }', '"fyi" }'];
  let i = 0;
  const run = () => {
    const k = i % 4;
    i++;
    const tl = gsap.timeline();
    tl.add(pulse(gsap, svg, P.gc, { duration: 0.7 }), 0)
      .add(pulse(gsap, svg, P.cc, { duration: 0.7 }), 0.08)
      .add(() => { codeVal.textContent = '  ' + words[k]; cl.classList.add('is-hit'); }, 0.75)
      .add(() => cl.classList.remove('is-hit'), 1.2)
      .add(pulse(gsap, svg, P.cm, { duration: 0.45 }), 1.0)
      .add(pulse(gsap, svg, P.live, { duration: 0.8 }), 0.4)
      .add(() => merge.classList.add('is-hit'), 1.45)
      .add(() => merge.classList.remove('is-hit'), 1.9)
      .add(pulse(gsap, svg, lanes[k], { duration: 0.55 }), 1.5)
      .add(flash(gsap, chips[k], 'is-hit', 0.9), 2.02);
    if (k === 3) {
      tl.add(pulse(gsap, svg, P.ab, { duration: 0.8 }), 2.0)
        .add(pulse(gsap, svg, P.mb, { duration: 0.4 }), 2.3)
        .add(flash(gsap, brief, 'is-hit', 0.9), 2.75);
    }
    tl.to({}, { duration: 0.5 });
    return tl;
  };
  return run;
}

/* ---------------------------------------------------------------- ZENOTH */
function zenoth(host, gsap) {
  const svg = base(host, '0 0 640 500');
  const P = {
    vw: wire(svg, 'M103 122 V 172'),
    wr: wire(svg, 'M178 203 C 205 203, 205 210, 232 210'),
    ctx: wire(svg, 'M317 360 V 270', true),
    vk: wire(svg, 'M232 395 H 178'),
  };
  const laneY = [71, 181, 291];
  const out = laneY.map((y) => wire(svg, `M402 210 C 432 210, 432 ${y}, 462 ${y}`));
  const bus = laneY.map((y) => wire(svg, `M612 ${y} H 624 V 395 H 402`));
  node(svg, { x: 28, y: 60, w: 150, h: 62, label: 'Voice', sub: 'You speak', ico: (g, x, y) => mic(g, x - 1, y, '#efe4cc') });
  node(svg, { x: 28, y: 172, w: 150, h: 62, label: 'faster-whisper', sub: 'Speech to text' });
  const router = node(svg, { x: 232, y: 150, w: 170, h: 120, label: 'Router', big: '< 1 ms', sub: 'No model call', main: true });
  const lanes = [
    node(svg, { x: 462, y: 40, w: 150, h: 62, label: 'Rules', sub: 'Simple' }),
    node(svg, { x: 462, y: 150, w: 150, h: 62, label: 'Claude Haiku', sub: 'Light tasks', ico: (g, x, y) => icon(g, claude, x, y, 20, '#D97757') }),
    node(svg, { x: 462, y: 260, w: 150, h: 62, label: 'Claude Code', sub: 'Background', ico: (g, x, y) => icon(g, claude, x, y, 20, '#D97757') }),
  ];
  lanes.forEach((l) => l.classList.add('dg-lane'));
  const vault = node(svg, { x: 232, y: 360, w: 170, h: 70, label: 'Obsidian vault', sub: 'Memory', ico: (g, x, y) => icon(g, obsidian, x, y, 22, '#A88BFA') });
  node(svg, { x: 28, y: 360, w: 150, h: 70, label: 'Kokoro', sub: 'Speaks back', ico: (g, x, y) => wave(g, x, y, '#efe4cc') });
  const api = el('g', { class: 'dg-node' }, svg);
  el('rect', { x: 28, y: 452, width: 584, height: 32, rx: 4, 'stroke-dasharray': '3 5' }, api);
  icon(api, fastapi, 40, 459, 18, '#05998B');
  text(api, 66, 473, 'FastAPI bridge · 8 endpoints · token-protected · localhost', 'sub');

  let i = 0;
  const order = [1, 0, 2, 1, 2, 0];
  const run = () => {
    const k = order[i % order.length];
    i++;
    const tl = gsap.timeline();
    tl.add(pulse(gsap, svg, P.vw, { duration: 0.45 }), 0)
      .add(pulse(gsap, svg, P.wr, { duration: 0.5 }), 0.45)
      .add(pulse(gsap, svg, P.ctx, { duration: 0.5 }), 0.5)
      .add(() => router.classList.add('is-hit'), 0.95)
      .add(() => router.classList.remove('is-hit'), 1.25)
      .add(pulse(gsap, svg, out[k], { duration: 0.5 }), 1.0)
      .add(flash(gsap, lanes[k], 'is-hit', 0.8), 1.5)
      .add(pulse(gsap, svg, bus[k], { duration: 0.9 }), 1.7)
      .add(() => vault.classList.add('is-hit'), 2.6)
      .add(() => vault.classList.remove('is-hit'), 3.0)
      .add(pulse(gsap, svg, P.vk, { duration: 0.4 }), 2.65)
      .to({}, { duration: 0.6 });
    return tl;
  };
  return run;
}

/* ---------------------------------------------------------------- Petal Finance */
function petal(host, gsap) {
  host.innerHTML = `
    <div class="spec">
      <div class="spec__card"><h4>Donut</h4><svg viewBox="0 0 120 120" data-c="donut"></svg></div>
      <div class="spec__card"><h4>Line</h4><svg viewBox="0 0 200 110" preserveAspectRatio="none" data-c="line"></svg></div>
      <div class="spec__card"><h4>Column</h4><svg viewBox="0 0 200 110" preserveAspectRatio="none" data-c="col"></svg></div>
      <div class="spec__card"><h4>Bar</h4><svg viewBox="0 0 200 110" preserveAspectRatio="none" data-c="bar"></svg></div>
      <div class="spec__foot">
        <span class="kbd" data-kbd><kbd>Ctrl</kbd><kbd>K</kbd></span>
        <span class="pill">Works offline</span>
        <span>WCAG AA</span>
      </div>
    </div>`;
  const shades = ['#f2cf8a', '#d9a95b', '#a77b3a', '#6e5128'];
  // donut
  const donut = host.querySelector('[data-c=donut]');
  el('circle', { cx: 60, cy: 60, r: 42, fill: 'none', stroke: 'rgba(239,228,204,.08)', 'stroke-width': 14 }, donut);
  const segs = shades.map((c) => el('circle', { cx: 60, cy: 60, r: 42, fill: 'none', stroke: c, 'stroke-width': 14, 'stroke-dasharray': '0 264', transform: 'rotate(-90 60 60)', pathLength: 264 }, donut));
  // line
  const line = host.querySelector('[data-c=line]');
  for (let y = 20; y <= 100; y += 20) el('line', { x1: 0, x2: 200, y1: y, y2: y, stroke: 'rgba(239,228,204,.07)', 'vector-effect': 'non-scaling-stroke' }, line);
  const grad = el('linearGradient', { id: 'pf-a', x1: 0, y1: 0, x2: 0, y2: 1 }, el('defs', {}, line));
  el('stop', { offset: 0, 'stop-color': '#d9a95b', 'stop-opacity': 0.35 }, grad);
  el('stop', { offset: 1, 'stop-color': '#d9a95b', 'stop-opacity': 0 }, grad);
  const area = el('path', { fill: 'url(#pf-a)' }, line);
  const lp = el('path', { fill: 'none', stroke: '#f2cf8a', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }, line);
  // columns
  const col = host.querySelector('[data-c=col]');
  const cols = Array.from({ length: 8 }, (_, i) => el('rect', { x: 8 + i * 24, y: 104, width: 14, height: 0, rx: 2, fill: i === 6 ? '#f2cf8a' : '#8f672a' }, col));
  // bars
  const bar = host.querySelector('[data-c=bar]');
  const bars = Array.from({ length: 4 }, (_, i) => el('rect', { x: 0, y: 8 + i * 26, width: 0, height: 14, rx: 2, fill: shades[i] }, bar));
  const kbd = host.querySelector('[data-kbd]');

  const smooth = (pts) => pts.reduce((d, [x, y], i, a) => {
    if (!i) return `M${x} ${y}`;
    const [px, py] = a[i - 1];
    const cx = (px + x) / 2;
    return `${d} C${cx} ${py}, ${cx} ${y}, ${x} ${y}`;
  }, '');
  const st = { line: Array(7).fill(80) };
  const run = () => {
    const tl = gsap.timeline();
    // donut: four shares that always add up to the whole ring
    const raw = shades.map(() => 0.4 + Math.random());
    const sum = raw.reduce((a, b) => a + b, 0);
    let acc = 0;
    segs.forEach((s, i) => {
      const len = (raw[i] / sum) * 264 - 3;
      tl.to(s, { attr: { 'stroke-dasharray': `${Math.max(len, 1)} 264`, 'stroke-dashoffset': -acc }, duration: 1.1, ease: 'power3.inOut' }, 0);
      acc += (raw[i] / sum) * 264;
    });
    // line + area
    const target = st.line.map((_, i) => 25 + Math.random() * 55 - i * 3);
    const o = { k: 0 };
    const from = st.line.slice();
    tl.to(o, {
      k: 1, duration: 1.1, ease: 'power3.inOut',
      onUpdate: () => {
        const pts = from.map((v, i) => [i * (200 / 6), v + (target[i] - v) * o.k]);
        const d = smooth(pts);
        lp.setAttribute('d', d);
        area.setAttribute('d', `${d} L200 110 L0 110 Z`);
      },
      onComplete: () => { st.line = target; },
    }, 0);
    cols.forEach((c, i) => { const h = 18 + Math.random() * 80; tl.to(c, { attr: { y: 104 - h, height: h }, duration: 0.9, ease: 'power3.out' }, 0.05 * i); });
    bars.forEach((b, i) => tl.to(b, { attr: { width: 40 + Math.random() * 155 }, duration: 1, ease: 'power3.inOut' }, 0.06 * i));
    tl.add(() => kbd.classList.add('is-press'), 0.9).add(() => kbd.classList.remove('is-press'), 1.05);
    return tl;
  };
  return run;
}

const builders = { chief, zenoth, petal };

// Mounts one diagram; it cycles while on screen. Returns a destroy function.
export function mountDiagram(host, gsap, reduceMotion) {
  const build = builders[host.dataset.diagram];
  if (!build) return () => {};
  const cycle = build(host, gsap);
  const gap = host.dataset.diagram === "petal" ? 1.8 : 0.2;
  let visible = false, waiting = true, dead = false, tl = null, next = null;
  const loop = () => {
    if (dead) return;
    if (!visible) { waiting = true; return; }
    waiting = false;
    tl = cycle();
    if (reduceMotion) { tl.progress(1); return; }
    tl.eventCallback("onComplete", () => { next = gsap.delayedCall(gap, loop); });
  };
  const io = new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && waiting) loop();
  }, { threshold: 0.2 });
  io.observe(host);
  return () => { dead = true; io.disconnect(); tl?.kill(); next?.kill(); };
}

export function mountDiagrams(gsap, reduceMotion) {
  document.querySelectorAll("[data-diagram]").forEach((host) => mountDiagram(host, gsap, reduceMotion));
}
