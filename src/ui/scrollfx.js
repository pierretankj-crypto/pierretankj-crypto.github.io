// Scroll choreography. Everything here is skipped under reduced motion, and nothing is hidden
// unless JS has already taken charge of revealing it.
//  1. Hero fly-through: the aura zooms into its core, PIERRE and TAN part, the copy lifts away.
//  2. Headings flip in letter by letter.
//  3. Each project diagram opens through a rotating gear-shaped iris; its text drifts at its own depth.
//  4. The portrait swings round to face you.
//  5. Two lines of giant type slide against each other with the scroll, and lean with its speed.
//  6. Panels lean with scroll velocity.
//  7. The contact heading assembles from scattered letters as you arrive.
//  8. A gear in the corner turns with the scroll and reports progress; click to go back up.

import { flowHeading, flowWords } from './textfx.js';

export function mountScrollFx({ gsap, ScrollTrigger, lenis, aura, reduceMotion }) {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  progressGear({ gsap, lenis, reduceMotion });
  if (reduceMotion) return;

  /* 1. hero fly-through */
  const hero = $('.hero');
  const lines = $$('.hero__line', hero);
  gsap.timeline({
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6,
      onUpdate: (st) => aura?.setScroll(st.progress) },
  })
    .to(lines[0], { xPercent: -22, ease: 'none' }, 0)
    .to(lines[1], { xPercent: 22, ease: 'none' }, 0)
    .to($('.hero__name'), { opacity: 0.15, yPercent: -20, ease: 'none' }, 0)
    .to($('.hero__row'), { y: -120, opacity: 0, ease: 'none' }, 0)
    .to($('.hero__status'), { y: -40, opacity: 0, ease: 'none' }, 0);

  /* 2. headings: letters drop in and settle like a liquid; paragraphs flow down word by word */
  flowWords(gsap, ScrollTrigger, '.lead:not([data-scrub]), .sec-sub, .proj__sum, .contact__sub');
  $$('.section .h2, .proj__title, .tl__title').forEach((h) => {
    const chars = split(h);
    const play = flowHeading(gsap, chars);
    let done = false;
    ScrollTrigger.create({
      trigger: h, start: 'top 88%', end: 'bottom top',
      onToggle: (self) => {
        if (done) return;
        done = true;
        play();
        requestAnimationFrame(() => self.kill());
      },
    });
  });

  /* 3. project diagrams open through a gear-shaped iris */
  $$('.proj').forEach((proj) => {
    const vis = $('.proj__visual', proj);
    const text = $('.proj__text', proj);
    const st = { r: 0, a: 0 };
    const draw = () => { vis.style.clipPath = gearPolygon(st.r, st.a); };
    draw();
    gsap.to(st, {
      r: 1, a: 50, ease: 'none', onUpdate: draw,
      onComplete: () => { vis.style.clipPath = 'none'; },
      onReverseComplete: draw,
      scrollTrigger: { trigger: vis, start: 'top 95%', end: 'top 30%', scrub: 0.7,
        onLeave: () => { vis.style.clipPath = 'none'; }, onEnterBack: draw },
    });
    gsap.fromTo(vis.firstElementChild, { scale: 1.18 }, {
      scale: 1, ease: 'none', transformOrigin: '50% 50%',
      scrollTrigger: { trigger: vis, start: 'top 95%', end: 'top 30%', scrub: 0.7 },
    });
    gsap.fromTo(text, { y: 70 }, { y: -30, ease: 'none', scrollTrigger: { trigger: proj, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
  });

  /* 4. portrait swings round */
  const media = $('.about__media');
  if (media) {
    gsap.fromTo(media, { rotateY: -24, rotateX: 10, scale: 0.88, transformPerspective: 1100, transformOrigin: '30% 50%' }, {
      rotateY: 0, rotateX: 0, scale: 1, ease: 'none',
      scrollTrigger: { trigger: '#about', start: 'top bottom', end: 'top 15%', scrub: 0.8 },
    });
  }

  /* 5. the type band */
  $$('[data-band]').forEach((row) => {
    const dir = Number(row.dataset.band);
    gsap.fromTo(row, { xPercent: dir < 0 ? 0 : -28 }, {
      xPercent: dir < 0 ? -28 : 0, ease: 'none',
      scrollTrigger: { trigger: '.band', start: 'top bottom', end: 'bottom top', scrub: 0.5 },
    });
  });

  /* 6. lean with scroll speed */
  const leaners = [...$$('.proj__visual, .cards, .stack-grid'), ...$$('[data-band]')];
  const setters = leaners.map((el) => {
    const isBand = el.hasAttribute('data-band');
    return gsap.quickTo(el, isBand ? 'skewX' : 'skewY', { duration: 0.6, ease: 'power3.out' });
  });
  const clamp = gsap.utils.clamp(-5, 5);
  if (lenis) {
    lenis.on('scroll', ({ velocity }) => {
      const v = clamp(velocity * 0.12);
      setters.forEach((set, i) => set(leaners[i].hasAttribute('data-band') ? -v * 1.6 : v * 0.45));
    });
  }

  /* 7. contact heading assembles */
  const ch = $('.contact__h');
  if (ch) {
    const chars = split(ch);
    gsap.fromTo(chars, {
      x: () => gsap.utils.random(-260, 260), y: () => gsap.utils.random(-160, 200),
      rotation: () => gsap.utils.random(-90, 90), opacity: 0, scale: () => gsap.utils.random(0.4, 1.6),
    }, {
      x: 0, y: 0, rotation: 0, opacity: 1, scale: 1, ease: 'power2.out', stagger: { each: 0.01, from: 'random' },
      scrollTrigger: { trigger: '#contact', start: 'top 85%', end: 'top 25%', scrub: 0.9 },
    });
    gsap.fromTo('.contact__glow', { scale: 0.7, opacity: 0 }, {
      scale: 1.1, opacity: 1, ease: 'none',
      scrollTrigger: { trigger: '#contact', start: 'top bottom', end: 'bottom bottom', scrub: 1 },
    });
  }
}

// Wraps each letter in a span (words kept together so lines still wrap normally).
function split(el) {
  if (el.dataset.split) return [...el.querySelectorAll('.split-char')];
  el.dataset.split = '1';
  el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  // keep any trailing element (like the dimmed "· Singapore" in timeline titles) out of the split
  const tail = el.querySelector(':scope > span');
  tail?.remove();
  const text = el.textContent.replace(/\s+/g, ' ').trim();
  const out = document.createElement('span');
  out.setAttribute('aria-hidden', 'true');
  text.split(' ').forEach((word, i, arr) => {
    const w = document.createElement('span');
    w.className = 'split-word';
    [...word].forEach((c) => { const s = document.createElement('span'); s.className = 'split-char'; s.textContent = c; w.appendChild(s); });
    out.appendChild(w);
    if (i < arr.length - 1) out.appendChild(document.createTextNode(' '));
  });
  el.textContent = '';
  el.appendChild(out);
  if (tail) { el.appendChild(document.createTextNode(' ')); el.appendChild(tail); }
  return [...out.querySelectorAll('.split-char')];
}

// A gear-shaped clip-path: radius r (0..1 of the frame's diagonal), rotated a degrees.
function gearPolygon(r, a) {
  const teeth = 18, pts = [];
  const R = r * 78, depth = Math.min(R * 0.12, 6);
  for (let i = 0; i < teeth; i++) {
    const t0 = (i / teeth) * 360 + a, step = 360 / teeth;
    [[R - depth, t0], [R, t0 + step * 0.22], [R, t0 + step * 0.5], [R - depth, t0 + step * 0.72]].forEach(([rr, t]) => {
      const rad = (t * Math.PI) / 180;
      pts.push(`${(50 + Math.cos(rad) * rr).toFixed(2)}% ${(50 + Math.sin(rad) * rr * 1.25).toFixed(2)}%`);
    });
  }
  return `polygon(${pts.join(',')})`;
}

function progressGear({ gsap, lenis, reduceMotion }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'scrollgear';
  btn.setAttribute('aria-label', 'Back to top');
  const teeth = 12, ro = 26, ri = 21;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2, s = (Math.PI * 2) / teeth;
    [[ri, a0], [ro, a0 + s * 0.2], [ro, a0 + s * 0.5], [ri, a0 + s * 0.7]].forEach(([r, t], k) => {
      d += `${i === 0 && k === 0 ? 'M' : 'L'}${(Math.cos(t) * r).toFixed(2)} ${(Math.sin(t) * r).toFixed(2)}`;
    });
  }
  btn.innerHTML = `<svg viewBox="-30 -30 60 60" aria-hidden="true"><g class="sg-rot"><path class="sg-body" d="${d}Z"/></g><circle class="sg-ring" r="15" pathLength="100" stroke-dasharray="0 100" transform="rotate(-90)"/></svg><span class="scrollgear__pct">0%</span>`;
  document.body.appendChild(btn);
  const rot = btn.querySelector('.sg-rot');
  const ring = btn.querySelector('.sg-ring');
  const pct = btn.querySelector('.scrollgear__pct');
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? window.scrollY / max : 0;
    rot.setAttribute('transform', `rotate(${(p * 720).toFixed(1)})`);
    ring.setAttribute('stroke-dasharray', `${(p * 100).toFixed(1)} 100`);
    pct.textContent = `${Math.round(p * 100)}%`;
    btn.classList.toggle('is-on', window.scrollY > window.innerHeight * 0.8);
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
  btn.addEventListener('click', () => {
    if (lenis) lenis.scrollTo(0, { duration: reduceMotion ? 0 : 1.8 });
    else window.scrollTo(0, 0);
    document.querySelector('.nav__mark')?.focus({ preventScroll: true });
  });
}
