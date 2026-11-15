// Projects section: each row shows the real app in a browser window, playing a short muted loop
// from its walkthrough while the row is on screen. The window and the "Read the case study"
// button open the project's case study.
import { projects } from '../projects.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function mountProjects({ root, reader, reduceMotion }) {
  if (!root) return;
  root.querySelectorAll('[data-screen]').forEach((host) => {
    const p = projects.find((x) => x.id === host.dataset.screen);
    if (!p) return;
    host.innerHTML = `
      <span class="screen" style="--ratio:${p.ratio}">
        <span class="screen__bar" aria-hidden="true"><i></i><i></i><i></i><span class="screen__url">${esc(p.url)}</span></span>
        <span class="screen__view">
          <video muted loop playsinline preload="none" poster="${p.loop.poster}" data-src="${p.loop.src}" aria-hidden="true"></video>
        </span>
      </span>
      <span class="screen__cta" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>Watch the walkthrough</span>`;
    host.setAttribute('aria-label', `${p.title}: watch the walkthrough and read the case study`);

    const v = host.querySelector('video');
    if (reduceMotion) return;
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting) {
        if (!v.src) v.src = v.dataset.src;
        v.play().catch(() => {});
      } else v.pause();
    }, { threshold: 0.35 }).observe(host);
  });

  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-project]');
    if (t) reader.open('projects', t.dataset.project, t);
  });
}
