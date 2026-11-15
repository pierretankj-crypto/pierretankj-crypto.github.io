// "Flowing down" type.
//  - The hero name is poured in letter by letter like molten gold, then a slow gold flow keeps
//    running down through the letters (CSS, .hc).
//  - The hero copy drips in word by word.
//  - Section headings drop and settle like a liquid, paragraphs flow in a word at a time.
// Nothing is split or hidden under reduced motion.

export function splitChars(el, cls = 'hc') {
  const text = el.textContent;
  el.textContent = '';
  [...text].forEach((c) => {
    const s = document.createElement('span');
    s.className = cls;
    s.textContent = c;
    el.appendChild(s);
  });
  return [...el.children];
}

export function splitWords(el, cls = 'fw') {
  if (el.dataset.words) return [...el.querySelectorAll(`.${cls}`)];
  el.dataset.words = '1';
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.nodeValue.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const s = document.createElement('span');
          s.className = cls;
          s.textContent = part;
          frag.appendChild(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') {
        walk(n);
      }
    });
  };
  walk(el);
  return [...el.querySelectorAll(`.${cls}`)];
}

// The hero: split now (before first paint settles) so the letters can be poured in later.
export function prepHero({ gsap, reduceMotion }) {
  const hero = document.querySelector('.hero');
  const words = [...hero.querySelectorAll('.hero__word')];
  const chars = words.map((w) => splitChars(w)).flat();
  if (reduceMotion) return { enter() {} };
  const copy = [
    ...splitWords(hero.querySelector('.hero__kana')),
    ...splitWords(hero.querySelector('.hero__role')),
    ...splitWords(hero.querySelector('.hero__pitch p')),
  ];
  gsap.set(chars, { yPercent: -140, scaleY: 1.9, scaleX: 0.72, opacity: 0, filter: 'blur(14px)', transformOrigin: '50% 0%' });
  gsap.set(copy, { yPercent: -90, opacity: 0, filter: 'blur(6px)' });

  // hover: letters sag under the pointer like a liquid
  const name = hero.querySelector('.hero__name');
  const sag = chars.map((c) => gsap.quickTo(c, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.45)' }));
  let entered = false;
  name.addEventListener('pointermove', (e) => {
    if (!entered || e.pointerType !== 'mouse') return;
    chars.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const d = Math.abs(e.clientX - (r.left + r.width / 2)) / r.width;
      sag[i](Math.max(0, 1 - d / 2.2) * r.height * 0.07);
    });
  });
  name.addEventListener('pointerleave', () => sag.forEach((s) => s(0)));

  return {
    enter() {
      const tl = gsap.timeline({ onComplete: () => { entered = true; } });
      // pour: each letter falls, stretched and blurred, lands, squashes, settles
      tl.to(chars, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 0.9, ease: 'power3.in', stagger: { each: 0.07, from: 'start' } }, 0.1)
        .to(chars, { keyframes: [{ scaleY: 0.82, scaleX: 1.12, duration: 0.12, ease: 'power2.out' }, { scaleY: 1, scaleX: 1, duration: 0.9, ease: 'elastic.out(1, 0.38)' }], stagger: { each: 0.07, from: 'start' } }, 1.0)
        .to(copy, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out', stagger: 0.025 }, 0.75);
      return tl;
    },
  };
}

// Section headings: letters drop in and settle like a liquid.
export function flowHeading(gsap, chars) {
  gsap.set(chars, { yPercent: -125, scaleY: 1.7, scaleX: 0.8, opacity: 0, filter: 'blur(8px)', transformOrigin: '50% 0%' });
  return () => {
    const tl = gsap.timeline();
    tl.to(chars, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 0.85, ease: 'power3.in', stagger: 0.028 }, 0)
      .to(chars, { scaleY: 1, scaleX: 1, duration: 1.1, ease: 'elastic.out(1, 0.42)', stagger: 0.028 }, 0.55);
    return tl;
  };
}

// Paragraphs: words flow down into place, a few at a time.
export function flowWords(gsap, ScrollTrigger, selector) {
  document.querySelectorAll(selector).forEach((p) => {
    const words = splitWords(p);
    gsap.set(words, { yPercent: -80, opacity: 0, filter: 'blur(5px)' });
    let done = false;
    ScrollTrigger.create({
      trigger: p, start: 'top 90%', end: 'bottom top',
      onToggle: (self) => {
        if (done) return;
        done = true;
        gsap.to(words, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out', stagger: 0.012 });
        requestAnimationFrame(() => self.kill());
      },
    });
  });
}
