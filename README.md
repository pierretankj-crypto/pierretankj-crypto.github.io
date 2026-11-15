# Pierre Tan · Portfolio

**Live site: [pierretankj-crypto.github.io](https://pierretankj-crypto.github.io/)**

The portfolio of Pierre Tan, AI and data engineering student at Nanyang Polytechnic, Singapore. It shows three projects as case studies with their walkthrough videos, five diploma and industry case studies, two businesses with proof of sales, and the experience behind them.

Built with AI as a creative partner: the ideas, art direction and content are mine, and Claude Code helped write the code.

## What's inside

- **Intro loader:** a 3D drive is machined and assembled in Three.js while the page loads. Each part appears as a blueprint wireframe and is welded into metal, with sparks, a HUD and bloom. Returning visitors get a two-second version.
- **Cover:** a shader-driven brass astrolabe with a flowing aura, particles and a portrait that can be scanned into a hologram.
- **Case-study reader:** project case studies with a narrated walkthrough, chapter buttons, a clip per feature and live architecture diagrams.
- **Scroll motion:** GSAP and Lenis, with Japanese accents (labels that decode, lines that type themselves, kanji that fill with ink).
- **Accessible by default:** keyboard navigation, focus states, screen-reader labels, and a reduced-motion mode that shows everything without animation.

## Tech

Vite · Three.js (WebGL shaders, post-processing) · GSAP and ScrollTrigger · Lenis · plain HTML, CSS and JavaScript modules. Fonts: Bodoni Moda, Geist, Geist Mono and Shippori Mincho via Fontsource.

## Run it locally

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # writes dist/
```

The site deploys to GitHub Pages from `main` with the workflow in `.github/workflows/deploy.yml`.

## Project structure

```
index.html              page markup
src/main.js             start-up: smooth scroll, loader, cover, sections
src/loader/             intro loader (Three.js)
src/hero/               cover aura and portrait effects (WebGL)
src/about/              About hologram
src/ui/                 case-study reader, projects, showcase, scroll and type effects
src/content.js          diploma and industry case studies
src/projects.js         project case studies (walkthroughs, steps, diagrams)
src/business.js         business case studies with proof
src/styles/main.css     all styles
public/                 résumé PDF, certificate, share image
tools/                  media scripts and the résumé source (tools/resume)
```

The media scripts in `tools/` rebuild images and video clips from source files that are kept off this repository.

## Credits

Typefaces are open source (SIL Open Font License). Computer Modern for the résumé comes from the `computer-modern` package (OFL). The mech design used for the hologram effect is fan art of an existing character and is not my original design.

© 2026 Pierre Tan
