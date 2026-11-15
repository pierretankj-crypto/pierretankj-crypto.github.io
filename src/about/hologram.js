// About photo → mech.
// Moving the pointer over the portrait paints a scanning lens: inside it the photo turns into the
// mech, lined up so its helmet sits on Pierre's face, with a green crackling rim (the gear-dissolve
// look). The lens heals behind the pointer. Click / Enter / tap projects the whole mech as a
// hologram turning through its four views.
import * as THREE from 'three';
import photoUrl from '../assets/img/portrait-card.webp';
import mechUrl from '../assets/img/mech-atlas.webp';

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod289(i);
  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0); m=m*m; m=m*m;
  vec3 x=2.0*fract(p*C.www)-1.0; vec3 h=abs(x)-0.5; vec3 ox=floor(x+0.5); vec3 a0=x-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.0*dot(m,g);
}
float hash(float n){ return fract(sin(n) * 43758.5453); }
float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 hash22(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
// cellular noise: x = F1, y = F2
vec2 worley(vec2 p, float t){
  vec2 n = floor(p), f = fract(p); float f1 = 8.0, f2 = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 o = hash22(n + g); o = 0.5 + 0.45 * sin(t + 6.2831 * o);
    float d = length(g + o - f);
    if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
  }
  return vec2(f1, f2);
}
`;

const trailFrag = /* glsl */ `
precision highp float;
uniform sampler2D tPrev;
uniform vec2 uPos;
uniform vec2 uLast;
uniform float uRad;
uniform float uPaint;
uniform float uDecay;
uniform float uAspect;
varying vec2 vUv;
float segDist(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0); return length(pa - ba * h); }
void main(){
  float prev = texture2D(tPrev, vUv).r;
  prev = max(prev * uDecay - 0.003, 0.0);
  vec2 k = vec2(uAspect, 1.0);
  float d = segDist(vUv * k, uLast * k, uPos * k);
  float b = smoothstep(uRad, uRad * 0.25, d) * uPaint;
  gl_FragColor = vec4(max(prev, b), 0.0, 0.0, 1.0);
}
`;

const mainFrag = /* glsl */ `
precision highp float;
uniform sampler2D tPhoto;
uniform sampler2D tMech;
uniform sampler2D tMask;
uniform vec2 uRes;
uniform float uTime;
uniform float uH;
uniform float uView;
uniform float uGlitch;
uniform float uCellAspect;
uniform vec3 uAlign;    // xy: where the anchor sits on the card (uv, y up); z: cell height in card heights
uniform vec2 uAnchor;   // the anchor in the front view's cell (uv, y up)
uniform vec2 uTilt;
varying vec2 vUv;
${NOISE}
const vec3 W = vec3(0.299, 0.587, 0.114);
const vec3 PHOS = vec3(0.55, 1.0, 0.36);

vec4 cell(vec2 uv, float idx){
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
  return texture2D(tMech, vec2((uv.x + idx) * 0.25, uv.y));
}

// the hologram room: dark glass, a faint grid, scan noise
vec3 room(vec2 uv, float aspect, float gt){
  vec3 c = mix(vec3(0.010, 0.020, 0.013), vec3(0.026, 0.040, 0.028), uv.y);
  vec2 gg = abs(fract(vec2((uv.x - 0.5) * aspect, uv.y) * 13.0) - 0.5);
  c += vec3(0.3, 0.7, 0.35) * smoothstep(0.46, 0.5, max(gg.x, gg.y)) * 0.05;
  c += vec3(0.2, 0.5, 0.25) * (hash2(uv * uRes + gt) - 0.5) * 0.03;
  return c;
}

// the mech, styled as a hologram, on top of 'bg'
vec3 holo(vec3 bg, vec2 l, float idx, vec2 uv, float tw, float slice, float gt, float sx, float sy){
  float ca = 0.0035 + tw * 0.03 + uGlitch * 0.01;
  vec2 q = l + vec2(slice, 0.0);
  vec4 mc = cell(q, idx);
  vec4 mR = cell(q + vec2(ca, 0.0), idx);
  vec4 mB = cell(q - vec2(ca, 0.0), idx);
  vec3 mcol = vec3(mR.r * mR.a, mc.g * mc.a, mB.b * mB.a) / max(mc.a, 0.001);
  float ma = clamp(max(mc.a, max(mR.a, mB.a) * 0.7), 0.0, 1.0);
  vec2 e = vec2(sx, sy);
  float ax = cell(q + vec2(e.x, 0.0), idx).a - cell(q - vec2(e.x, 0.0), idx).a;
  float ay = cell(q + vec2(0.0, e.y), idx).a - cell(q - vec2(0.0, e.y), idx).a;
  float edge = clamp(length(vec2(ax, ay)) * 1.4, 0.0, 1.0);
  vec3 h = clamp(mix(vec3(dot(mcol * 1.22, W)), mcol * 1.22, 1.3), 0.0, 1.0);
  float scan = 0.74 + 0.26 * sin(uv.y * uRes.y * 1.25 + uTime * 9.0);
  float band = exp(-pow((uv.y - fract(uTime * 0.21)) * 26.0, 2.0));
  float flick = 0.9 + 0.1 * hash(gt);
  vec3 hcol = h * scan * flick + PHOS * band * 0.2 + vec3(0.015, 0.035, 0.025);
  vec3 c = mix(bg, hcol, ma * (0.88 + 0.08 * band) * (1.0 - tw * 0.35));
  c += PHOS * edge * (0.75 + 0.25 * flick);
  return c;
}

void main(){
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  float gt = floor(uTime * 24.0);
  float row = floor(uv.y * 54.0);
  float slice = step(0.9, hash(row * 1.7 + gt)) * (hash(row + gt * 3.1) - 0.5) * 0.09 * uGlitch;

  // ---------- photo (with interference while the full projector warms up)
  float warm = clamp(uH * (1.0 - uH) * 4.0, 0.0, 1.0);
  vec2 puv = uv + vec2(slice * warm * 1.5, 0.0);
  float ca0 = 0.005 * warm;
  vec3 photo = vec3(texture2D(tPhoto, puv + vec2(ca0, 0.0)).r, texture2D(tPhoto, puv).g, texture2D(tPhoto, puv - vec2(ca0, 0.0)).b);

  // ---------- lens: the aligned mech under the pointer
  float cw = uAlign.z * uCellAspect / aspect;               // cell width in card widths
  vec2 la = uAnchor + vec2((uv.x - uAlign.x - uTilt.x * 0.006) / cw, (uv.y - uAlign.y) / uAlign.z);
  vec3 lensScene = holo(room(uv, aspect, gt), la, 0.0, uv, 0.0, slice * 0.5, gt, 1.6 / (cw * uRes.x), 1.6 / (uAlign.z * uRes.y));

  float tm = texture2D(tMask, uv).r;
  vec2 wp = vec2(uv.x * aspect, uv.y);
  vec2 w = worley(wp * 16.0, uTime * 1.3);
  float n = snoise(wp * 7.0 + vec2(0.0, uTime * 0.35));
  float field = tm + n * 0.16 - w.x * 0.14;
  float mL = smoothstep(0.44, 0.5, field);
  float rim = smoothstep(0.26, 0.44, field) * (1.0 - smoothstep(0.47, 0.58, field));
  float vein = 1.0 - smoothstep(0.0, 0.07, w.y - w.x);                       // cell borders: the crackle
  float speck = step(0.55, snoise(wp * 46.0 + uTime * 2.0)) * rim;
  vec3 base = mix(photo, lensScene, mL);
  base = mix(base, base * vec3(0.55, 0.85, 0.6), rim * 0.6);                 // photo tinted where the scan bites
  base += PHOS * (rim * (0.25 + vein * 1.5) + speck * 0.8) * (0.85 + 0.15 * sin(uTime * 20.0));

  // ---------- full projection: projector pad, cone, the mech turning
  vec3 scene = room(uv, aspect, gt);
  vec2 dp = (uv - vec2(0.5, 0.07)) * vec2(aspect, 1.0);
  float el = length(dp * vec2(1.0, 4.4));
  float pad = exp(-pow((el - 0.27) * 22.0, 2.0)) + 0.6 * exp(-pow((el - 0.19) * 30.0, 2.0));
  float hgt = uv.y - 0.07;
  float halfW = 0.2 + hgt * 0.34;
  float cone = (1.0 - smoothstep(halfW * 0.55, halfW, abs(uv.x - 0.5))) * step(0.0, hgt) * exp(-hgt * 1.9);
  cone *= 0.82 + 0.18 * sin(uv.x * 140.0 + uTime * 1.5) * sin(uv.x * 37.0 - uTime);
  scene += PHOS * (cone * 0.16 + pad * 0.55 + exp(-el * 5.0) * 0.25);
  vec2 mg = vec2(uv.x * 34.0, uv.y * 22.0 - uTime * 1.6);
  scene += PHOS * step(0.94, hash2(floor(mg))) * smoothstep(0.32, 0.0, length(fract(mg) - 0.5)) * cone * 0.9;
  float mh = 0.82, mw = mh * uCellAspect / aspect;
  vec2 l = vec2((uv.x - 0.5 - uTilt.x * 0.012) / mw + 0.5, (uv.y - 0.125 - sin(uTime * 1.3) * 0.006) / mh);
  float f = fract(uView);
  float turn = smoothstep(0.76, 1.0, f);
  float tw = sin(turn * 3.14159);
  float idx = mod(floor(uView) + step(0.5, turn), 4.0);
  l.x = (l.x - 0.5) / mix(1.0, 0.18, tw) + 0.5 + tw * (hash(row + gt) - 0.5) * 0.05;
  scene = holo(scene, l, idx, uv, tw, slice, gt, 1.6 / (mw * uRes.x), 1.6 / (mh * uRes.y));

  float nf = snoise(uv * vec2(6.0, 8.0)) * 0.5 + 0.5;
  float fieldF = (1.0 - uv.y) * 0.8 + nf * 0.2;
  float thr = uH * 1.32 - 0.16;
  float mF = 1.0 - smoothstep(thr - 0.015, thr + 0.015, fieldF);
  float burn = exp(-pow((fieldF - thr) * 38.0, 2.0)) * step(0.002, uH) * step(uH, 0.998);
  vec3 col = mix(base, scene, mF);
  col += PHOS * burn * 1.1 + vec3(1.0, 1.0, 0.9) * burn * burn * 0.7;
  float vig = smoothstep(1.15, 0.35, length((uv - 0.5) * vec2(1.0, 1.2)));
  col *= mix(1.0, mix(0.55, 1.0, vig), mF);
  gl_FragColor = vec4(col, 1.0);
}
`;

const vert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const DEG = ['000°', '090°', '180°', '270°'];

export function createHologram(button, { gsap, reduceMotion = false }) {
  const canvas = button.querySelector('.holo__gl');
  const degEl = button.querySelector('.holo__deg');
  const stateEl = button.querySelector('.holo__state');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
    if (!renderer.getContext()) throw new Error('no gl');
  } catch (e) {
    return fallback(button, { stateEl });
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(dpr);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); m.frustumCulled = false; return m; };

  // trail (ping-pong)
  const rtOpts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
  let rtA = new THREE.WebGLRenderTarget(180, 240, rtOpts);
  let rtB = new THREE.WebGLRenderTarget(180, 240, rtOpts);
  const T = {
    tPrev: { value: null }, uPos: { value: new THREE.Vector2(0.5, 0.6) }, uLast: { value: new THREE.Vector2(0.5, 0.6) },
    uRad: { value: 0.13 }, uPaint: { value: 0 }, uDecay: { value: 0.97 }, uAspect: { value: 0.75 },
  };
  const trailScene = new THREE.Scene();
  const tq = quad();
  tq.material = new THREE.ShaderMaterial({ uniforms: T, vertexShader: vert, fragmentShader: trailFrag, depthTest: false, depthWrite: false });
  trailScene.add(tq);

  const U = {
    tPhoto: { value: null }, tMech: { value: null }, tMask: { value: rtA.texture },
    uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uH: { value: 0 },
    uView: { value: 0 }, uGlitch: { value: 0 }, uCellAspect: { value: 512 / 704 },
    // helmet over the face: anchor (the mech's eyes) → Pierre's eyes
    uAlign: { value: new THREE.Vector3(0.5, 0.69, 1.7) },
    uAnchor: { value: new THREE.Vector2(0.5, 0.714) },
    uTilt: { value: new THREE.Vector2(0, 0) },
  };
  const scene = new THREE.Scene();
  const mq = quad();
  mq.material = new THREE.ShaderMaterial({ uniforms: U, vertexShader: vert, fragmentShader: mainFrag, depthTest: false, depthWrite: false });
  scene.add(mq);
  if (import.meta.env.DEV) window.__holo = { U, T, draw: () => draw() };

  function size() {
    const w = button.clientWidth, h = button.clientHeight;
    renderer.setSize(w, h, false);
    U.uRes.value.set(w * dpr, h * dpr);
    T.uAspect.value = w / Math.max(h, 1);
  }
  size();

  const load = (url) => new Promise((res, rej) => new THREE.TextureLoader().load(url, (t) => {
    t.colorSpace = THREE.NoColorSpace; // display-space shader, no post chain
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.anisotropy = 4;
    res(t);
  }, undefined, rej));

  let full = false, scanning = false, raf = 0, last = 0, t = 0, view = 0, visible = true, tween = null, lastPaint = -10;
  const pos = { x: 0.5, y: 0.6 };

  function draw() {
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
  }
  function step(dt) {
    T.tPrev.value = rtA.texture;
    T.uDecay.value = Math.exp(-dt * (scanning ? 1.1 : 1.9));
    renderer.setRenderTarget(rtB);
    renderer.render(trailScene, camera);
    [rtA, rtB] = [rtB, rtA];
    U.tMask.value = rtA.texture;
    T.uLast.value.copy(T.uPos.value);
  }
  function loop(now) {
    raf = 0;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += reduceMotion ? 0 : dt;
    U.uTime.value = reduceMotion ? 2.0 : t;
    if (!reduceMotion && U.uH.value > 0.55) view += dt / 1.9;
    U.uView.value = reduceMotion ? 0 : view;
    if (!reduceMotion && Math.random() < dt * 0.3) gsap.fromTo(U.uGlitch, { value: 1 }, { value: 0, duration: 0.35, ease: 'power2.out' });
    const idx = Math.floor(view + (view % 1 > 0.88 ? 1 : 0)) % 4;
    if (degEl && full && degEl.textContent !== DEG[idx]) degEl.textContent = DEG[idx];
    T.uPos.value.set(pos.x, pos.y);
    T.uPaint.value = scanning ? 1 : 0;
    step(dt);
    draw();
    const busy = full || scanning || U.uH.value > 0.001 || now - lastPaint < 2600;
    if (busy && visible) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  new ResizeObserver(() => { size(); draw(); }).observe(button);

  function setState() {
    button.classList.toggle('is-on', full);
    button.classList.toggle('is-scan', scanning && !full);
    if (stateEl) stateEl.textContent = full ? 'Projecting' : scanning ? 'Scanning' : 'Standby';
  }
  function setFull(next) {
    if (next === full) return;
    full = next;
    button.setAttribute('aria-pressed', String(full));
    setState();
    tween?.kill();
    if (reduceMotion) { U.uH.value = full ? 1 : 0; view = 0; kick(); return; }
    if (full) {
      gsap.fromTo(U.uGlitch, { value: 1 }, { value: 0, duration: 0.6 });
      tween = gsap.to(U.uH, { value: 1, duration: 1.2, ease: 'power2.inOut' });
    } else {
      tween = gsap.to(U.uH, { value: 0, duration: 0.85, ease: 'power2.inOut', onComplete: () => { view = 0; if (degEl) degEl.textContent = DEG[0]; } });
    }
    kick();
  }

  const toUv = (e) => {
    const r = button.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: 1 - (e.clientY - r.top) / r.height };
  };
  let down = null;
  button.style.touchAction = 'pan-y';
  button.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return;
    const p = toUv(e); pos.x = p.x; pos.y = p.y; T.uPos.value.set(p.x, p.y); T.uLast.value.set(p.x, p.y);
    scanning = true; lastPaint = performance.now(); setState(); kick();
  });
  button.addEventListener('pointermove', (e) => {
    const p = toUv(e);
    pos.x = p.x; pos.y = p.y;
    U.uTilt.value.set((p.x - 0.5) * 2, (p.y - 0.5) * 2);
    if (e.pointerType === 'mouse' || down) { scanning = true; lastPaint = performance.now(); setState(); kick(); }
  }, { passive: true });
  button.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') { scanning = false; lastPaint = performance.now(); setFull(false); setState(); kick(); }
  });
  button.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
    const p = toUv(e); pos.x = p.x; pos.y = p.y; T.uPos.value.set(p.x, p.y); T.uLast.value.set(p.x, p.y);
    scanning = true; lastPaint = performance.now(); setState(); kick();
  });
  const endTouch = () => { if (!down) return; down = null; scanning = false; lastPaint = performance.now(); setState(); };
  button.addEventListener('pointerup', endTouch);
  button.addEventListener('pointercancel', endTouch);
  button.addEventListener('click', () => setFull(!full));
  button.addEventListener('keydown', (e) => { if (e.key === 'Escape' && full) setFull(false); });

  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (!visible && full) setFull(false);
    if (visible) kick();
  }).observe(button);

  Promise.all([load(photoUrl), load(mechUrl)]).then(([p, m]) => {
    U.tPhoto.value = p;
    U.tMech.value = m;
    step(0.016);
    draw();
    button.classList.add('gl-ready');
  }).catch(() => fallback(button, { stateEl }));

  return { setFull };
}

// No WebGL: a CSS version that still shows the mech.
function fallback(button, { stateEl }) {
  const img = document.createElement('img');
  img.className = 'holo__mech';
  img.src = new URL('../assets/img/mech-front.webp', import.meta.url).href;
  img.alt = '';
  button.insertBefore(img, button.querySelector('.holo__hud'));
  button.classList.add('no-gl');
  const set = (on) => {
    button.classList.toggle('is-on', on);
    button.setAttribute('aria-pressed', String(on));
    if (stateEl) stateEl.textContent = on ? 'Projecting' : 'Standby';
  };
  button.addEventListener('click', () => set(!button.classList.contains('is-on')));
  return { setFull: set };
}
