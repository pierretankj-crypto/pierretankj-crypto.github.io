import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createAura } from './hero/aura.js';
import { mountDiagrams } from './ui/diagrams.js';
import { mountCases } from './ui/cases.js';
import { mountProjects } from './ui/projects.js';
import { mountShowcase } from './ui/showcase.js';
import { mountScrollFx } from './ui/scrollfx.js';
import { mountJapan } from './ui/japan.js';
import { runGearLoader } from './loader/gearLoader.js';
import { prepHero } from './ui/textfx.js';

gsap.registerPlugin(ScrollTrigger);
// dev only: ?slowmo plays every GSAP animation at a fifth of the speed, for checking VFX frame by frame
if (import.meta.env.DEV && new URLSearchParams(location.search).has('slowmo')) gsap.globalTimeline.timeScale(0.2);

const html = document.documentElement;
const reduceMotion = html.classList.contains('reduce-motion');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ------------------------------------------------------------ smooth scroll */
let lenis = null;
if (!reduceMotion) {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 0.95 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  if (import.meta.env.DEV) window.__lenis = lenis;
}
const scrollToHash = (hash) => {
  const target = hash === '#top' ? 0 : $(hash);
  if (target === null) return;
  if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4 });
  else if (target === 0) window.scrollTo(0, 0);
  else target.scrollIntoView();
};
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || a.getAttribute('href').length < 2) return;
  e.preventDefault();
  closeMenu();
  scrollToHash(a.getAttribute('href'));
  if (a.getAttribute('href') !== '#top') {
    const t = $(a.getAttribute('href'));
    t?.setAttribute('tabindex', '-1');
    setTimeout(() => t?.focus({ preventScroll: true }), lenis ? 900 : 0);
  }
});

/* ------------------------------------------------------------ nav */
const nav = $('[data-nav]');
const toggle = $('.nav__toggle');
const menu = $('#menu');
function closeMenu() {
  if (!menu || menu.hidden) return;
  menu.hidden = true;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open menu');
  lenis?.start();
}
toggle?.addEventListener('click', () => {
  const open = menu.hidden;
  menu.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  nav.classList.add('is-solid');
  if (open) lenis?.stop(); else lenis?.start();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

let lastY = 0;
function onScroll() {
  const y = window.scrollY;
  const heroH = $('.hero').offsetHeight;
  nav.classList.toggle('is-solid', y > heroH * 0.6 || !menu.hidden);
  const down = y > lastY + 4, up = y < lastY - 4;
  if (down && y > heroH && menu.hidden) nav.classList.add('is-hidden');
  if (up || y < heroH) nav.classList.remove('is-hidden');
  lastY = y;
}
window.addEventListener('scroll', onScroll, { passive: true });
nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));

const links = $$('.nav__links a');
const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const id = en.target.id;
    links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === `#${id}`));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
$$('main > section[id]').forEach((s) => io.observe(s));

/* ------------------------------------------------------------ hero name fit */
const nameEl = $('.hero__name');
function fitName() {
  const words = $$('.hero__word', nameEl);
  nameEl.style.setProperty('--name-size', '100px');
  const ws = words.map((w) => w.getBoundingClientRect().width);
  const W = nameEl.clientWidth;
  const stacked = window.innerWidth <= 520;
  let size = stacked ? (100 * W) / Math.max(...ws) : (100 * W) / (ws[0] + ws[1] + 34);
  size = Math.min(size * 0.995, window.innerHeight * (stacked ? 0.16 : 0.25));
  nameEl.style.setProperty('--name-size', `${size.toFixed(1)}px`);
  aura?.layout(); // the disc fits itself around the text block on narrow screens
}

/* ------------------------------------------------------------ hero aura + loader */
const hero = $('.hero');
const progress = { tex: 0, fonts: 0 };
let aura = null;
const heroText = prepHero({ gsap, reduceMotion });
fitName();
aura = createAura($('.hero__gl'), {
  gsap,
  reduceMotion,
  onProgress: (p) => { progress.tex = p; },
});
if (!aura) progress.tex = 1;
document.fonts?.ready.then(fitName);
window.addEventListener('resize', fitName);
document.fonts?.ready.then(() => { progress.fonts = 1; });
if (!document.fonts) progress.fonts = 1;

function enterHero() {
  if (hero.classList.contains('is-entered')) return;
  hero.classList.add('is-entered');
  heroText.enter();
  if (aura) aura.ready.then(() => aura.ignite());
}

const loader = $('.loader');
if (html.classList.contains('no-loader') || !loader) {
  loader?.classList.add('is-gone');
  requestAnimationFrame(enterHero);
} else {
  lenis?.stop();
  html.style.overflow = 'hidden';
  window.scrollTo(0, 0);
  const bail = setTimeout(() => { progress.tex = 1; progress.fonts = 1; }, 9000); // never hold anyone hostage
  // the full intro plays once; after that, a two-second version
  const SEEN = 'pt-intro-seen';
  let seen = false;
  try { seen = localStorage.getItem(SEEN) === '1'; } catch (e) { /* storage blocked */ }
  runGearLoader({
    root: loader,
    gsap,
    quick: seen,
    getProgress: () => progress.tex * 0.8 + progress.fonts * 0.2,
    onReveal: () => {
      try { localStorage.setItem(SEEN, '1'); } catch (e) { /* storage blocked */ }
      enterHero();
    },
    onDone: () => {
      clearTimeout(bail);
      loader.classList.add('is-gone');
      html.style.overflow = '';
      lenis?.start();
      ScrollTrigger.refresh();
    },
  });
}

/* ------------------------------------------------------------ motion toggle (hero loop) */
const motionBtn = $('[data-motion-toggle]');
if (motionBtn) {
  if (reduceMotion || !aura) motionBtn.hidden = true;
  motionBtn.addEventListener('click', () => {
    const paused = motionBtn.getAttribute('aria-pressed') === 'true';
    motionBtn.setAttribute('aria-pressed', String(!paused));
    motionBtn.setAttribute('aria-label', paused ? 'Pause background animation' : 'Play background animation');
    aura?.setMotion(paused);
  });
}

/* ------------------------------------------------------------ about hologram */
// loaded only when the About section comes near, so it never competes with the intro
const holo = $('.holo');
if (holo) {
  const holoIo = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return;
    holoIo.disconnect();
    import('./about/hologram.js').then(({ createHologram }) => createHologram(holo, { gsap, reduceMotion }));
  }, { rootMargin: '700px 0px' });
  holoIo.observe(holo);
}

/* ------------------------------------------------------------ sections */
mountDiagrams(gsap, reduceMotion);
const reader = mountCases({ grid: $('[data-cases]'), dialog: $('.sheet'), lenis, gsap, reduceMotion });
mountProjects({ root: $('#work'), reader, reduceMotion });
$('#showcase')?.addEventListener('click', (e) => {
  const card = e.target.closest('[data-biz]');
  if (card) reader.open('business', card.dataset.biz, card);
});
mountShowcase({ root: $('#showcase'), gsap, reduceMotion });
mountScrollFx({ gsap, ScrollTrigger, lenis, aura, reduceMotion });
mountJapan({ gsap, ScrollTrigger, reduceMotion });

/* ------------------------------------------------------------ timeline gear */
(function timeline() {
  const root = $('[data-timeline]');
  if (!root) return;
  const gear = $('.timeline__gear', root);
  const rot = $('.gear-rot', gear);
  const ns = 'http://www.w3.org/2000/svg';
  const teeth = 12, ro = 46, ri = 37;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2, step = (Math.PI * 2) / teeth;
    const pts = [[ri, a0], [ro, a0 + step * 0.18], [ro, a0 + step * 0.5], [ri, a0 + step * 0.68]];
    pts.forEach(([r, a], k) => { d += `${i === 0 && k === 0 ? 'M' : 'L'}${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`; });
  }
  d += 'Z';
  const body = document.createElementNS(ns, 'path'); body.setAttribute('d', d); body.setAttribute('class', 'gear-body'); rot.appendChild(body);
  const hole = document.createElementNS(ns, 'circle'); hole.setAttribute('r', 16); hole.setAttribute('class', 'gear-hole'); rot.appendChild(hole);
  for (let i = 0; i < 4; i++) {
    const s = document.createElementNS(ns, 'rect');
    s.setAttribute('x', -2.5); s.setAttribute('y', -34); s.setAttribute('width', 5); s.setAttribute('height', 16);
    s.setAttribute('class', 'gear-hub'); s.setAttribute('transform', `rotate(${i * 90})`);
    rot.appendChild(s);
  }
  const hub = document.createElementNS(ns, 'circle'); hub.setAttribute('r', 5); hub.setAttribute('class', 'gear-hub'); rot.appendChild(hub);

  const rail = $('.timeline__rail', root);
  const fill = $('.timeline__fill', root);
  const items = $$('.tl', root);
  if (reduceMotion) { items.forEach((i) => i.classList.add('is-on')); fill.style.setProperty('--p', 1); return; }
  const st = { p: 0 };
  const apply = () => {
    const h = rail.offsetHeight;
    const y = st.p * h;
    gear.style.setProperty('--gy', `${y}px`);
    const radiusPx = gear.getBoundingClientRect().width / 2 || 22;
    rot.setAttribute('transform', `rotate(${((y / radiusPx) * 180) / Math.PI})`);
    fill.style.setProperty('--p', st.p);
    items.forEach((it) => it.classList.toggle('is-on', it.offsetTop <= y + 14));
  };
  apply();
  gsap.to(st, {
    p: 1, ease: 'none', onUpdate: apply,
    scrollTrigger: { trigger: $('.timeline__list', root), start: 'top 62%', end: 'bottom 62%', scrub: 0.8 },
  });
})();

/* ------------------------------------------------------------ copy email */
const toast = $('.toast');
let toastT = 0;
function say(msg) {
  toast.textContent = msg;
  toast.classList.add('is-on');
  clearTimeout(toastT);
  toastT = setTimeout(() => toast.classList.remove('is-on'), 2200);
}
$$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
  const v = b.dataset.copy;
  try { await navigator.clipboard.writeText(v); }
  catch (e) {
    const t = document.createElement('textarea'); t.value = v; document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } catch (er) { /* ignore */ }
    t.remove();
  }
  b.textContent = 'Copied';
  say('Email copied');
  setTimeout(() => { b.textContent = 'Copy email'; }, 2200);
}));

window.addEventListener('load', () => ScrollTrigger.refresh());
