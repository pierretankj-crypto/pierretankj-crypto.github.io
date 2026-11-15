// The full-screen case-study reader, shared by the Projects section and Showcase › Case studies.
// The reader is its own scroll container with its own Lenis instance; the page's Lenis ignores it
// (data-lenis-prevent), so wheel, trackpad, touch and keyboard scrolling all work inside it.
// A project case study adds a narrated walkthrough with chapters, a muted clip per step that plays
// while the step is on screen, and live diagrams.
import Lenis from 'lenis';
import { cases } from '../content.js';
import { projects } from '../projects.js';
import { businesses } from '../business.js';
import { mountDiagram } from './diagrams.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const clock = (t) => `${Math.floor(t / 60)}:${pad(Math.floor(t % 60))}`;

const GROUPS = {
  cases: { list: cases, noun: 'Case study', from: 0 },
  projects: { list: projects, noun: 'Project', from: 1 },
  business: { list: businesses, noun: 'Business', from: 1 },
};

const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>';

function mediaHTML(s, c) {
  const md = s.media || (s.img ? { type: 'img', src: s.img, fit: s.fit } : null);
  if (!md) return '';
  if (md.type === 'clip') {
    return `
      <figure class="cs-step__media cs-clip" style="aspect-ratio:${c.ratio || '16 / 9'}">
        <video muted loop playsinline preload="none" poster="${md.poster}" data-src="${md.src}" aria-label="${esc(s.title)}: screen recording"></video>
        <button class="cs-clip__btn" type="button" aria-label="Pause clip" data-clip-toggle>${ICON_PAUSE}</button>
      </figure>`;
  }
  if (md.type === 'gallery') {
    return `<div class="cs-step__media cs-gallery" role="group" aria-label="${esc(md.label || s.title)}">${md.items.map((src, k) => `<figure><img src="${src}" alt="${esc(md.label || s.title)}, photo ${k + 1}" loading="lazy" decoding="async"></figure>`).join('')}</div>`;
  }
  if (md.type === 'diagram') {
    return `<div class="cs-step__media cs-diagram"><div class="proj__visual" data-diagram="${md.name}" role="img" aria-label="${esc(md.label)}"></div></div>`;
  }
  const cls = md.portrait || md.fit === 'portrait' ? ' cs-step__img--portrait' : md.fit === 'dark' ? ' cs-step__img--dark' : md.wide ? ' cs-step__img--wide' : '';
  return `<figure class="cs-step__img${cls}"><img src="${md.src}" alt="${esc(s.alt || s.title)}" loading="lazy" decoding="async"></figure>`;
}

export function mountCases({ grid, dialog, lenis, gsap, reduceMotion }) {
  if (!dialog) return { open: () => {} };

  /* Showcase cards */
  if (grid) {
    grid.innerHTML = cases.map((c, i) => `
      <button class="card" type="button" data-case="${c.id}" aria-haspopup="dialog">
        <span class="card__img${c.coverFit === 'contain' ? ' card__img--contain' : ''}">
          <img src="${c.cover}" alt="" loading="lazy" decoding="async" width="1100" height="618">
        </span>
        <span class="card__body">
          <span class="card__title">${esc(c.title)}</span>
          <span class="card__desc">${esc(c.desc)}</span>
          <span class="card__foot">
            <span class="card__meta">${pad(i)} · ${esc(c.label)}</span>
            <span class="card__btn">Details <span aria-hidden="true">→</span></span>
          </span>
        </span>
      </button>`).join('');
  }

  const body = dialog.querySelector('.sheet__body');
  const crumb = dialog.querySelector('.sheet__crumb');
  const content = dialog.querySelector('.sheet__content');
  const bar = dialog.querySelector('.sheet__bar');
  const closeBtn = dialog.querySelector('.sheet__close');
  let opener = null;
  let inner = null;
  let tick = null;
  let observers = [];
  let cleanups = [];
  let group = 'cases';

  const setProgress = () => {
    const max = dialog.scrollHeight - dialog.clientHeight;
    bar.style.setProperty('--p', max > 0 ? (dialog.scrollTop / max).toFixed(4) : 0);
  };
  dialog.addEventListener('scroll', setProgress, { passive: true });

  function teardown() {
    observers.forEach((o) => o.disconnect());
    observers = [];
    cleanups.forEach((f) => f());
    cleanups = [];
    body.querySelectorAll('video').forEach((v) => { v.pause(); v.removeAttribute('src'); v.load(); });
  }

  function watch(fn, opts) {
    const o = new IntersectionObserver(fn, { root: dialog, ...opts });
    observers.push(o);
    return o;
  }

  function revealSteps() {
    if (reduceMotion) return;
    const steps = [...body.querySelectorAll('.cs-step')];
    steps.forEach((s) => s.classList.add('is-pre'));
    const io = watch((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.remove('is-pre'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    steps.forEach((s) => io.observe(s));
  }

  /* step clips: load when close, play while at least half on screen, pause otherwise */
  function wireClips() {
    const clips = [...body.querySelectorAll('.cs-clip video')];
    if (!clips.length) return;
    const load = (v) => { if (!v.src) { v.src = v.dataset.src; } };
    const near = watch((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { load(en.target); near.unobserve(en.target); }
    }), { rootMargin: '80% 0px 80% 0px' });
    const setBtn = (v) => {
      const b = v.parentElement.querySelector('[data-clip-toggle]');
      const playing = !v.paused;
      b.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
      b.setAttribute('aria-label', playing ? 'Pause clip' : 'Play clip');
    };
    clips.forEach((v) => {
      near.observe(v);
      v.addEventListener('play', () => setBtn(v));
      v.addEventListener('pause', () => setBtn(v));
      if (reduceMotion) setBtn(v);
    });
    if (reduceMotion) return; // nothing plays until asked
    const vis = watch((entries) => entries.forEach((en) => {
      const v = en.target;
      if (en.intersectionRatio >= 0.5 && !v.dataset.held) { load(v); v.play().catch(() => {}); }
      else if (en.intersectionRatio < 0.5) v.pause();
    }), { threshold: [0, 0.5] });
    clips.forEach((v) => vis.observe(v));
  }

  /* walkthrough: chapter buttons seek, the current chapter lights up */
  function wireFilm() {
    const film = body.querySelector('.cs-film video');
    if (!film) return;
    const chapters = [...body.querySelectorAll('[data-seek]')].filter((b) => b.closest('.cs-chapters'));
    const times = chapters.map((b) => Number(b.dataset.seek));
    const mark = () => {
      let k = -1;
      times.forEach((t, i) => { if (film.currentTime + 0.25 >= t) k = i; });
      chapters.forEach((b, i) => b.classList.toggle('is-on', i === k));
    };
    film.addEventListener('timeupdate', mark);
    film.addEventListener('play', () => body.querySelectorAll('.cs-clip video').forEach((v) => v.pause()));
    const outOfView = watch(([en]) => { if (!en.isIntersecting) film.pause(); }, { threshold: 0 });
    outOfView.observe(film);
  }

  function seekFilm(t) {
    const film = body.querySelector('.cs-film video');
    if (!film) return;
    const go = () => {
      film.currentTime = t;
      film.play().catch(() => {});
    };
    if (film.readyState >= 1) go();
    else { film.preload = 'auto'; film.addEventListener('loadedmetadata', go, { once: true }); film.load(); }
    const frame = body.querySelector('.cs-film');
    const r = frame.getBoundingClientRect();
    if (r.top < 64 || r.bottom > window.innerHeight) {
      if (inner) inner.scrollTo(frame, { offset: -88, duration: 0.9 });
      else frame.scrollIntoView({ block: 'start' });
    }
  }

  function headHTML(c) {
    const links = (c.links || []).map((l) => `<a class="link" href="${l.href}" target="_blank" rel="noopener">${esc(l.label)}<span class="link__arrow" aria-hidden="true">↗</span></a>`).join('');
    return `
      <header class="cs-head">
        <div>
          <p class="cs-kind">${esc(c.kind)}</p>
          <h2 class="cs-title" id="sheet-title">${esc(c.title)}</h2>
        </div>
        <div class="cs-intro">
          <p>${esc(c.intro)}</p>
          <ul class="tags">${c.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
          ${links ? `<div class="cs-links">${links}</div>` : ''}
          <p class="cs-note">${esc(c.note || 'Code available on request.')}</p>
        </div>
      </header>`;
  }

  function filmHTML(c) {
    const f = c.film;
    const chapters = [{ chapter: 'Introduction', at: 0 }, ...c.steps.filter((s) => s.at !== undefined)];
    return `
      <section class="cs-film" aria-label="Walkthrough video">
        <div class="cs-film__frame">
          <video controls playsinline preload="metadata" poster="${f.poster}" src="${f.src}"></video>
        </div>
        <div class="cs-film__side">
          <p class="cs-film__label">Walkthrough · ${f.length}${f.sound ? ' · narrated' : ''}</p>
          <p class="cs-film__hint">Jump to a part:</p>
          <ol class="cs-chapters">
            ${chapters.map((s) => `<li><button type="button" data-seek="${s.at}"><span class="cs-chapters__t">${clock(s.at)}</span><span>${esc(s.chapter)}</span></button></li>`).join('')}
          </ol>
        </div>
      </section>`;
  }

  function collageHTML(c) {
    return `<div class="cs-collage">${c.gallery.map((src, k) => `<figure><img src="${src}" alt="${k === 0 ? esc(c.title) + ': custom keyboard built for a customer' : ''}" decoding="async"></figure>`).join('')}</div>`;
  }

  function stepsHTML(c) {
    return `
      <ol class="cs-steps">
        ${c.steps.map((s, k) => `
          <li class="cs-step${s.media?.wide ? ' cs-step--wide' : ''}">
            <div class="cs-step__copy">
              <p class="cs-step__no">[${pad(k)}]</p>
              <h3 class="cs-step__title">${esc(s.title)}</h3>
              <p class="cs-step__text">${s.text}</p>
              ${s.at !== undefined && c.film ? `<button class="cs-step__watch" type="button" data-seek="${s.at}">${ICON_PLAY}Watch this part · ${clock(s.at)}</button>` : ''}
            </div>
            ${mediaHTML(s, c)}
          </li>`).join('')}
      </ol>`;
  }

  function render(g, id) {
    teardown();
    group = g;
    const { list, noun, from } = GROUPS[g];
    const i = list.findIndex((c) => c.id === id);
    const c = list[i];
    const prev = list[(i - 1 + list.length) % list.length];
    const next = list[(i + 1) % list.length];
    crumb.textContent = `${noun} ${pad(i + from)} / ${pad(list.length - 1 + from)} · ${c.kind}`;
    closeBtn.setAttribute('aria-label', `Close ${noun.toLowerCase()}`);
    dialog.classList.toggle('sheet--project', g !== 'cases');
    body.innerHTML = `
      ${headHTML(c)}
      ${c.film ? filmHTML(c) : c.gallery ? collageHTML(c) : c.coverPortrait ? '' : `<figure class="cs-cover"><img src="${c.cover}" alt="${esc(c.title)}, cover slide" width="1100" height="618"></figure>`}
      ${stepsHTML(c)}
      <nav class="cs-next" aria-label="More ${noun.toLowerCase()}s">
        <button class="cs-next__btn" type="button" data-go="${prev.id}"><small>← Previous</small><span>${esc(prev.title)}</span></button>
        <button class="cs-next__btn" type="button" data-go="${next.id}" style="text-align:right"><small>Next →</small><span>${esc(next.title)}</span></button>
      </nav>`;
    if (inner) inner.scrollTo(0, { immediate: true, force: true });
    dialog.scrollTop = 0;
    setProgress();
    revealSteps();
    wireClips();
    wireFilm();
    body.querySelectorAll('[data-diagram]').forEach((host) => cleanups.push(mountDiagram(host, gsap, reduceMotion)));
    inner?.resize();
    // images and posters change the height after they load
    body.querySelectorAll('img').forEach((im) => im.addEventListener('load', () => inner?.resize(), { once: true }));
  }

  function open(g, id, from) {
    opener = from || document.activeElement;
    dialog.classList.remove('is-closing');
    if (!dialog.open) dialog.showModal();
    lenis?.stop();
    if (!reduceMotion && !inner) {
      inner = new Lenis({ wrapper: dialog, content, duration: 1.05, smoothWheel: true });
      tick = (t) => inner?.raf(t * 1000);
      gsap.ticker.add(tick);
    }
    render(g, id);
    closeBtn.focus({ preventScroll: true });
  }
  function close() {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    body.querySelectorAll('video').forEach((v) => v.pause());
    dialog.classList.add('is-closing');
    const done = () => { dialog.classList.remove('is-closing'); dialog.close(); };
    if (reduceMotion) done(); else setTimeout(done, 300);
  }
  dialog.addEventListener('close', () => {
    teardown();
    if (inner) { gsap.ticker.remove(tick); inner.destroy(); inner = null; }
    lenis?.start();
    opener?.focus?.({ preventScroll: true });
  });
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  closeBtn.addEventListener('click', close);
  dialog.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (go) { render(group, go.dataset.go); closeBtn.focus({ preventScroll: true }); return; }
    const seek = e.target.closest('[data-seek]');
    if (seek) { seekFilm(Number(seek.dataset.seek)); return; }
    const tog = e.target.closest('[data-clip-toggle]');
    if (tog) {
      const v = tog.parentElement.querySelector('video');
      if (!v.src) v.src = v.dataset.src;
      if (v.paused) { delete v.dataset.held; v.play().catch(() => {}); } else { v.dataset.held = '1'; v.pause(); }
    }
  });
  grid?.addEventListener('click', (e) => {
    const card = e.target.closest('[data-case]');
    if (card) open('cases', card.dataset.case, card);
  });

  return { open };
}
