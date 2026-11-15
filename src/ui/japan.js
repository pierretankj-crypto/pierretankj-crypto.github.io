// Japanese accents and the text animations that go with them.
//  - Each section's big vertical kanji drifts against the scroll while ink pours down into it.
//  - Japanese labels beside the section names decode out of scrambling katakana when they arrive.
//  - Japanese lines type themselves out, with a caret.
//  - The cover's vertical line drops in character by character (CSS, keyed on .is-entered).
//  - About paragraphs light up word by word as you read down.
// Under reduced motion everything is shown in its final state.
import { splitWords } from './textfx.js';

const NOISE = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン創造光夢力技術';
const pick = () => NOISE[Math.floor(Math.random() * NOISE.length)];

export function mountJapan({ gsap, ScrollTrigger, reduceMotion }) {
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* vertical kanji: an outline layer and an ink layer */
  $$('.sec-kanji').forEach((el) => {
    const text = el.textContent.trim();
    el.innerHTML = `<span class="sec-kanji__line">${text}</span><span class="sec-kanji__fill">${text}</span>`;
    el.classList.add('is-built');
    if (reduceMotion) return;
    const fill = el.querySelector('.sec-kanji__fill');
    const section = el.closest('section');
    gsap.fromTo(fill, { clipPath: 'inset(0% 0% 100% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
      scrollTrigger: { trigger: section, start: 'top 75%', end: 'center 35%', scrub: 0.8 },
    });
    gsap.fromTo(el, { yPercent: 22 }, {
      yPercent: -22, ease: 'none',
      scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
    });
  });

  /* cover line: characters for the CSS drop-in */
  $$('.hero__tate').forEach((el) => {
    const text = el.textContent;
    el.textContent = '';
    [...text].forEach((c, i) => {
      const s = document.createElement('span');
      s.className = 'tc';
      s.style.setProperty('--i', i);
      s.textContent = c;
      el.appendChild(s);
    });
  });

  if (reduceMotion) return;

  /* labels decode out of scrambling katakana */
  $$('.kicker__jp, .proj__jp').forEach((el) => {
    const final = [...el.textContent];
    el.textContent = '';
    // the real word stays in the page; the scramble only plays over it, and always lands on it
    const spans = final.map((c) => {
      const s = document.createElement('span');
      s.className = 'jc';
      s.textContent = c;
      el.appendChild(s);
      return s;
    });
    el.style.opacity = '0';
    const run = () => {
      el.style.opacity = '';
      const start = performance.now();
      let done = false;
      const finish = () => { done = true; spans.forEach((s, i) => { s.textContent = final[i]; }); };
      const step = (now) => {
        if (done) return;
        const t = now - start;
        let settled = 0;
        spans.forEach((s, i) => {
          const at = 260 + i * 170;
          if (t >= at) { s.textContent = final[i]; settled++; } else if (Math.random() < 0.6) s.textContent = pick();
        });
        if (settled < spans.length) requestAnimationFrame(step); else done = true;
      };
      requestAnimationFrame(step);
      setTimeout(finish, 260 + spans.length * 170 + 150);
    };
    ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: run });
  });

  /* Japanese lines type themselves out */
  $$('.jp-type').forEach((el) => {
    const final = [...el.textContent];
    el.textContent = '';
    const out = document.createElement('span');
    const caret = document.createElement('span');
    caret.className = 'caret';
    el.append(out, caret);
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => {
        let i = 0;
        const tick = () => {
          out.textContent = final.slice(0, ++i).join('');
          if (i < final.length) setTimeout(tick, final[i - 1] === '、' ? 260 : 110);
          else el.classList.add('is-done');
        };
        setTimeout(tick, 350);
      },
    });
  });

  /* paragraphs light up word by word with the scroll */
  $$('[data-scrub]').forEach((p) => {
    const words = splitWords(p, 'sw');
    gsap.fromTo(words, { opacity: 0.16 }, {
      opacity: 1, ease: 'none', stagger: 0.12,
      scrollTrigger: { trigger: p, start: 'top 85%', end: 'bottom 55%', scrub: 0.6 },
    });
  });
}
