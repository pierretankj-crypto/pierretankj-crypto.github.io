// Showcase: tabs (Case studies / Certificates / Achievements / Tech stack), the stack tiles,
// a pointer spotlight on cards, and a "puzzle" assembly whenever a panel's cards appear.
const icons = import.meta.glob('../assets/icons/*.svg', { eager: true, query: '?raw', import: 'default' });
const ico = (name) => (icons[`../assets/icons/${name}.svg`] || '').replace(/<title>.*?<\/title>/, '');
const glyph = (t) => `<svg viewBox="0 0 24 24"><rect x="1.5" y="4" width="21" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="12" y="15.6" text-anchor="middle" font-size="${t.length > 2 ? 8 : 9}" font-family="ui-monospace,monospace" font-weight="700" fill="currentColor">${t}</text></svg>`;

const STACK = [
  ['JavaScript', 'javascript', '#F7DF1E', 'Language'], ['TypeScript', 'typescript', '#4B9BFF', 'Language'], ['Python', 'python', '#5A9FD4', 'Language'],
  ['SQL', '@SQL', '#F2CF8A', 'Language'], ['HTML / CSS', 'html5', '#F06529', 'Language'],
  ['Node.js', 'nodedotjs', '#7CC36A', 'Runtime'], ['FastAPI', 'fastapi', '#1FC1A9', 'Framework'], ['React', 'react', '#61DAFB', 'Framework'],
  ['Tailwind CSS', 'tailwindcss', '#38BDF8', 'Framework'], ['Streamlit', 'streamlit', '#FF4B4B', 'Framework'], ['pandas', 'pandas', '#E70488', 'Library'],
  ['NumPy', 'numpy', '#4DABCF', 'Library'], ['scikit-learn', 'scikitlearn', '#F7931E', 'Library'], ['Vercel', 'vercel', '#FFFFFF', 'Cloud'],
  ['GitHub Actions', 'githubactions', '#2F96FF', 'CI'], ['GitHub Pages', 'githubpages', '#FFFFFF', 'Hosting'], ['Upstash Redis', 'upstash', '#00E9A3', 'Data'],
  ['Google OAuth 2.0', 'google', '#4285F4', 'Auth'], ['Gmail + Calendar APIs', 'gmail', '#EA4335', 'API'],
  ['Claude API', 'claude', '#D97757', 'AI'], ['Claude Code', 'claude', '#D97757', 'AI tooling'], ['Git', 'git', '#F05033', 'Tool'],
  ['Jupyter', 'jupyter', '#F37626', 'Tool'], ['Power BI', '@BI', '#F2C811', 'Analytics'],
];

export function mountShowcase({ root, gsap, reduceMotion }) {
  if (!root) return;
  // stack tiles
  const grid = root.querySelector('[data-stack]');
  grid.innerHTML = STACK.map(([name, icon, color, cat]) => `
    <div class="tile" style="--c:${color}" data-label="${name.toLowerCase()}">
      <span class="tile__icon" aria-hidden="true">${icon.startsWith('@') ? glyph(icon.slice(1)) : ico(icon)}</span>
      <span class="tile__name">${name}</span>
      <span class="tile__cat">${cat}</span>
    </div>`).join('');
  grid.setAttribute('role', 'list');
  grid.querySelectorAll('.tile').forEach((t) => t.setAttribute('role', 'listitem'));

  // tabs
  const tabs = [...root.querySelectorAll('[role=tab]')];
  const ink = root.querySelector('.tabs__ink');
  const list = root.querySelector('.tabs');
  const panels = tabs.map((t) => root.querySelector(`#${t.getAttribute('aria-controls')}`));
  let current = 0;
  const moveInk = (i, instant) => {
    const t = tabs[i];
    if (instant) ink.style.transition = 'none';
    ink.style.width = `${t.offsetWidth}px`;
    ink.style.transform = `translateX(${t.offsetLeft}px)`;
    if (instant) { void ink.offsetWidth; ink.style.transition = ''; }
  };
  const pieces = (panel) => [...panel.querySelectorAll('.card, .tile')];
  function assemble(panel, fast) {
    if (reduceMotion) return;
    const els = pieces(panel);
    gsap.killTweensOf(els);
    gsap.fromTo(els, {
      x: () => gsap.utils.random(-140, 140), y: () => gsap.utils.random(60, 200),
      rotation: () => gsap.utils.random(-14, 14), scale: 0.86, opacity: 0,
    }, {
      x: 0, y: 0, rotation: 0, scale: 1, opacity: 1,
      duration: fast ? 0.8 : 1.15, ease: 'expo.out',
      stagger: { each: fast ? 0.03 : 0.06, from: 'random' },
      clearProps: 'transform,opacity',
    });
    panel.querySelectorAll('[data-to]').forEach((n) => countUp(n));
  }
  function select(i, focus) {
    if (i === current) return;
    tabs[current].setAttribute('aria-selected', 'false');
    tabs[current].tabIndex = -1;
    panels[current].hidden = true;
    current = i;
    tabs[i].setAttribute('aria-selected', 'true');
    tabs[i].tabIndex = 0;
    panels[i].hidden = false;
    if (focus) tabs[i].focus();
    tabs[i].scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    moveInk(i);
    assemble(panels[i], true);
  }
  tabs.forEach((t, i) => t.addEventListener('click', () => select(i)));
  list.addEventListener('keydown', (e) => {
    const k = { ArrowRight: 1, ArrowLeft: -1, Home: 'first', End: 'last' }[e.key];
    if (k === undefined) return;
    e.preventDefault();
    const n = k === 'first' ? 0 : k === 'last' ? tabs.length - 1 : (current + k + tabs.length) % tabs.length;
    select(n, true);
  });
  moveInk(0, true);
  window.addEventListener('resize', () => moveInk(current, true));
  document.fonts?.ready.then(() => moveInk(current, true));

  // first time the showcase scrolls into view, the visible panel assembles like a puzzle
  if (!reduceMotion) {
    pieces(panels[0]).forEach((el) => { el.style.opacity = '0'; });
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      pieces(panels[0]).forEach((el) => { el.style.opacity = ''; });
      assemble(panels[0]);
    }, { threshold: 0.12 });
    io.observe(panels[0]);
  }

  // stat numbers count up when their tab opens
  root.querySelectorAll('.stat').forEach((s) => {
    const m = s.firstChild?.nodeValue?.match(/^(\D*)(\d+)(.*)$/);
    if (!m) return;
    s.firstChild.nodeValue = '';
    const span = document.createElement('span');
    span.dataset.to = m[2];
    span.dataset.pre = m[1];
    span.dataset.post = m[3];
    span.textContent = m[1] + m[2] + m[3];
    s.insertBefore(span, s.firstChild);
  });
  function countUp(n) {
    const to = Number(n.dataset.to);
    if (reduceMotion || !to) return;
    const o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.4, ease: 'power3.out', onUpdate: () => { n.textContent = `${n.dataset.pre}${Math.round(o.v)}${n.dataset.post}`; } });
  }

  // pointer spotlight on cards
  root.addEventListener('pointermove', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });

  // typing a letter lights the matching tool while the stack tab is open
  const tiles = [...grid.querySelectorAll('.tile')];
  const cursor = {};
  window.addEventListener('keydown', (e) => {
    if (panels[3].hidden || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable], dialog, [role=tab]')) return;
    const r = grid.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    const ch = e.key.toLowerCase();
    if (!/^[a-z]$/.test(ch)) return;
    const hits = tiles.filter((t) => t.dataset.label.startsWith(ch));
    if (!hits.length) return;
    cursor[ch] = ((cursor[ch] ?? -1) + 1) % hits.length;
    const t = hits[cursor[ch]];
    t.classList.add('is-lit');
    clearTimeout(t._lit);
    t._lit = setTimeout(() => t.classList.remove('is-lit'), 900);
  });
}
