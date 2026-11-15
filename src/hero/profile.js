// Cover profile: Pierre's backlit side portrait standing in front of the aura.
//  - Hover: a scanning lens turns the part of him under the pointer into the mech's side profile
//    (aligned head to head), with a green crackle rim that heals behind the pointer.
//  - Disintegration: every so often (and on click) he breaks apart into embers blown back off his
//    head, the mech hologram stands in his place, then the embers fly back and he reassembles.
// Everything is drawn into the hero's own scene/renderer, in buffer pixels.
import * as THREE from 'three';
import photoUrl from '../assets/img/profile-cutout.webp';
import mechUrl from '../assets/img/mech-atlas.webp';

const IMG_ASPECT = 1280 / 1136;
const CELL_ASPECT = 512 / 704;

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
// dissolve order: from the back of the head towards the face, broken up by noise
float dfield(vec2 uv){ return uv.x * 0.62 + (snoise(uv * vec2(5.0, 6.0)) * 0.5 + 0.5) * 0.3 + (1.0 - uv.y) * 0.08; }
`;
const CELLULAR = /* glsl */ `
vec2 hash22(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
float hash(float n){ return fract(sin(n) * 43758.5453); }
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

const rectVert = /* glsl */ `
uniform vec4 uRect; uniform vec2 uRes; varying vec2 vUv;
void main(){ vUv = uv; vec2 px = uRect.xy + uv * uRect.zw; gl_Position = vec4(px / uRes * 2.0 - 1.0, 0.0, 1.0); }
`;

const plateFrag = /* glsl */ `
precision highp float;
uniform sampler2D tPhoto;
uniform sampler2D tMech;
uniform sampler2D tMask;
uniform float uTime;
uniform float uD;        // disintegration 0..1
uniform float uMech;     // mech hologram presence 0..1
uniform float uFade;
uniform vec3 uAlign;     // xy: anchor on the photo (uv, y up); z: mech cell height in photo heights
uniform vec2 uAnchor;    // anchor in the mech's side-profile cell (uv, y up)
uniform vec4 uRect;
varying vec2 vUv;
${NOISE}
${CELLULAR}
const vec3 PHOS = vec3(0.22, 1.0, 0.12);
const vec3 W3 = vec3(0.299, 0.587, 0.114);
vec4 cell(vec2 uv){
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
  return texture2D(tMech, vec2((uv.x + 1.0) * 0.25, uv.y));
}
void main(){
  vec4 ph = texture2D(tPhoto, vUv);
  float aspect = ${IMG_ASPECT.toFixed(5)};
  float cw = uAlign.z * ${CELL_ASPECT.toFixed(5)} / aspect;
  vec2 la = uAnchor + vec2((vUv.x - uAlign.x) / cw, (vUv.y - uAlign.y) / uAlign.z);

  // the mech, as a hologram
  float gt = floor(uTime * 24.0);
  float row = floor(vUv.y * 90.0);
  float slice = step(0.93, hash(row * 1.7 + gt)) * (hash(row + gt * 3.1) - 0.5) * 0.02;
  vec2 q = la + vec2(slice, 0.0);
  float ca = 0.004;
  vec4 mc = cell(q);
  vec3 mcol = vec3(cell(q + vec2(ca, 0.0)).r, mc.g, cell(q - vec2(ca, 0.0)).b);
  vec2 e = vec2(1.5 / (cw * uRect.z), 1.5 / (uAlign.z * uRect.w));
  float ax = cell(q + vec2(e.x, 0.0)).a - cell(q - vec2(e.x, 0.0)).a;
  float ay = cell(q + vec2(0.0, e.y)).a - cell(q - vec2(0.0, e.y)).a;
  float medge = clamp(length(vec2(ax, ay)) * 1.4, 0.0, 1.0);
  float scan = 0.72 + 0.28 * sin(vUv.y * uRect.w * 1.2 + uTime * 9.0);
  float flick = 0.88 + 0.12 * hash(gt);
  vec3 holo = clamp(mix(vec3(dot(mcol, W3)), mcol, 1.3), 0.0, 1.0) * 1.15 * scan * flick;
  holo += PHOS * medge * 1.4;
  float ma = clamp(mc.a + medge * 0.6, 0.0, 1.0);

  // hover lens (inside his silhouette only)
  float tm = texture2D(tMask, vUv).r;
  vec2 wp = vec2(vUv.x * aspect, vUv.y);
  vec2 w = worley(wp * 14.0, uTime * 1.3);
  float n = snoise(wp * 7.0 + vec2(0.0, uTime * 0.35));
  float fL = tm + n * 0.16 - w.x * 0.14;
  float mL = smoothstep(0.44, 0.5, fL);
  float rim = smoothstep(0.26, 0.44, fL) * (1.0 - smoothstep(0.47, 0.58, fL));
  float vein = 1.0 - smoothstep(0.0, 0.07, w.y - w.x);
  vec3 glass = vec3(0.003, 0.012, 0.006) + PHOS * 0.02 * (0.6 + 0.4 * sin(vUv.y * uRect.w * 1.2));
  vec3 lensC = mix(glass, holo, ma);
  vec3 person = mix(ph.rgb, lensC, mL);
  person = mix(person, person * vec3(0.4, 0.8, 0.45), rim * 0.6);
  person += PHOS * rim * (0.2 + vein * 1.4);

  // disintegration
  float f = dfield(vUv);
  float cut = uD * 1.35 - 0.2;
  float keep = smoothstep(cut, cut + 0.015, f);
  float burn = exp(-pow((f - cut) * 60.0, 2.0)) * step(0.001, uD) * step(uD, 0.999);
  float crackle = pow(1.0 - abs(snoise(vUv * 40.0 + uTime)), 6.0);
  float pa = ph.a * keep;

  // the mech stands in his place while he is gone
  float build = smoothstep(0.0, 0.25, uMech - (1.0 - vUv.y) * 0.75);   // materialises bottom-up
  float frame = smoothstep(1.0, 0.86, vUv.y) * smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x); // no hard cut at the photo's edges
  float mA = ma * build * 0.9 * frame;
  vec3 col = holo * mA * (1.0 - pa) + person * pa;
  float a = pa + mA * (1.0 - pa);
  vec3 hot = mix(vec3(1.0, 0.45, 0.12), vec3(1.0, 0.9, 0.6), crackle) * 1.35;
  col += hot * burn * ph.a;
  a = max(a, burn * ph.a);
  gl_FragColor = vec4(col * uFade, a * uFade);
}
`;

const emberVert = /* glsl */ `
attribute vec2 aUv;
attribute vec3 aCol;
attribute vec4 aRnd;
uniform vec4 uRect;
uniform vec2 uRes;
uniform float uD;
uniform float uTime;
uniform float uPx;
uniform float uFade;
varying vec4 vC;
${NOISE}
void main(){
  float f = dfield(aUv);
  float cut = uD * 1.35 - 0.2;
  float t = clamp((cut - f) / 0.34, 0.0, 1.0);
  vec2 base = uRect.xy + aUv * uRect.zw;
  vec2 dir = normalize(vec2(-1.0, 0.5) + (aRnd.xy - 0.5) * 1.1);
  float dist = (0.18 + aRnd.z * 0.7) * uRect.w;
  vec2 swirl = vec2(sin(t * 6.0 + aRnd.w * 20.0), cos(t * 5.0 + aRnd.x * 17.0)) * 0.05 * uRect.w * t;
  vec2 p = base + dir * dist * (t * t * 0.85 + t * 0.15) + swirl + vec2(0.0, t * t * 0.16 * uRect.w);
  gl_Position = vec4(p / uRes * 2.0 - 1.0, 0.0, 1.0);
  float vis = step(0.0001, t) * (1.0 - smoothstep(0.5, 1.0, t)) * uFade;
  vec3 ember = mix(vec3(1.0, 0.72, 0.36), vec3(1.0, 0.3, 0.06), t) * (1.1 + aRnd.w * 1.3);
  vC = vec4(mix(aCol, ember, smoothstep(0.04, 0.4, t)), vis);
  gl_PointSize = uPx * (0.7 + aRnd.y * 0.7) * (1.0 - t * 0.55);
}
`;
const emberFrag = /* glsl */ `
precision highp float;
varying vec4 vC;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.15, d) * vC.a;
  gl_FragColor = vec4(vC.rgb * a, a);
}
`;

const trailFrag = /* glsl */ `
precision highp float;
uniform sampler2D tPrev; uniform vec2 uPos; uniform vec2 uLast; uniform float uRad; uniform float uPaint; uniform float uDecay;
varying vec2 vUv;
float segDist(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0); return length(pa - ba * h); }
void main(){
  float prev = max(texture2D(tPrev, vUv).r * uDecay - 0.003, 0.0);
  vec2 k = vec2(${IMG_ASPECT.toFixed(5)}, 1.0);
  float b = smoothstep(uRad, uRad * 0.25, segDist(vUv * k, uLast * k, uPos * k)) * uPaint;
  gl_FragColor = vec4(max(prev, b), 0.0, 0.0, 1.0);
}
`;
const fsVert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export function createProfile({ renderer, scene, gsap, reduceMotion, uTime, uRes, uFade }) {
  const loadTex = (url, srgb) => new Promise((res, rej) => new THREE.TextureLoader().load(url, (t) => {
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.anisotropy = 4;
    res(t);
  }, undefined, rej));

  const rtOpts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
  let rtA = new THREE.WebGLRenderTarget(180, 160, rtOpts);
  let rtB = new THREE.WebGLRenderTarget(180, 160, rtOpts);
  const T = {
    tPrev: { value: null }, uPos: { value: new THREE.Vector2(0.6, 0.6) }, uLast: { value: new THREE.Vector2(0.6, 0.6) },
    uRad: { value: 0.085 }, uPaint: { value: 0 }, uDecay: { value: 0.97 },
  };
  const trailScene = new THREE.Scene();
  const tq = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: T, vertexShader: fsVert, fragmentShader: trailFrag, depthTest: false, depthWrite: false }));
  tq.frustumCulled = false;
  trailScene.add(tq);
  const trailCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const P = {
    tPhoto: { value: null }, tMech: { value: null }, tMask: { value: rtA.texture },
    uTime, uRes, uFade,
    uD: { value: 0 }, uMech: { value: 0 },
    uAlign: { value: new THREE.Vector3(0.675, 0.625, 1.75) },
    uAnchor: { value: new THREE.Vector2(0.67, 0.745) },
    uRect: { value: new THREE.Vector4(0, 0, 100, 100) },
    uPx: { value: 4 },
  };
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0), new THREE.ShaderMaterial({
    uniforms: P, vertexShader: rectVert, fragmentShader: plateFrag,
    transparent: true, premultipliedAlpha: true, depthTest: false, depthWrite: false,
  }));
  plate.frustumCulled = false;
  plate.renderOrder = 5;
  plate.visible = false;
  scene.add(plate);

  let embers = null;
  let alphaMap = null, amW = 0, amH = 0;
  let rect = { x: 0, y: 0, w: 1, h: 1 }; // css px, y from top
  if (import.meta.env.DEV) window.__profile = { P, T };

  function buildEmbers(img) {
    const small = window.innerWidth < 760;
    const sw = small ? 170 : 250, sh = Math.round(sw / IMG_ASPECT);
    const c = document.createElement('canvas');
    c.width = sw; c.height = sh;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, sw, sh);
    const px = ctx.getImageData(0, 0, sw, sh).data;
    alphaMap = new Uint8Array(sw * sh); amW = sw; amH = sh;
    const uvs = [], cols = [], rnd = [];
    const lin = (v) => Math.pow(v / 255, 2.2);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4;
      alphaMap[y * sw + x] = px[i + 3];
      if (px[i + 3] < 140) continue;
      uvs.push((x + 0.5) / sw, 1 - (y + 0.5) / sh);
      cols.push(lin(px[i]), lin(px[i + 1]), lin(px[i + 2]));
      rnd.push(Math.random(), Math.random(), Math.random(), Math.random());
    }
    const g = new THREE.BufferGeometry();
    const n = uvs.length / 2;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aUv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
    g.setAttribute('aCol', new THREE.BufferAttribute(new Float32Array(cols), 3));
    g.setAttribute('aRnd', new THREE.BufferAttribute(new Float32Array(rnd), 4));
    embers = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: P, vertexShader: emberVert, fragmentShader: emberFrag,
      transparent: true, premultipliedAlpha: true, depthTest: false, depthWrite: false,
    }));
    embers.frustumCulled = false;
    embers.renderOrder = 6;
    embers.visible = false;
    embers.userData.sw = sw;
    scene.add(embers);
  }

  // ---------- layout: where he stands, in css px and buffer px
  function layout({ W, H, dpr, narrow, innerTop }) {
    let h, eyeX, top;
    if (narrow) {
      // phones: his face sits in the space above the text, chin on the text block
      h = Math.min(H * 0.44, W * 1.05);
      eyeX = W * 0.42;
      top = Math.max(innerTop - h * 0.62, 56);
    } else {
      h = H * 0.93;
      eyeX = W * 0.41;
      top = H - h * 0.97;
    }
    const w = h * IMG_ASPECT;
    rect = { x: eyeX - 0.68 * w, y: top, w, h };
    P.uRect.value.set(rect.x * dpr, (H - top - h) * dpr, w * dpr, h * dpr);
    if (embers) P.uPx.value = (w * dpr / embers.userData.sw) * 1.5;
  }

  // ---------- pointer → lens
  const pos = { x: 0.6, y: 0.6 };
  let scanning = false, lastPaint = -10;
  const toUv = (cx, cy) => ({ x: (cx - rect.x) / rect.w, y: 1 - (cy - rect.y) / rect.h });
  function over(cx, cy) {
    const p = toUv(cx, cy);
    if (!alphaMap || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return false;
    return alphaMap[Math.min(amH - 1, Math.floor((1 - p.y) * amH)) * amW + Math.min(amW - 1, Math.floor(p.x * amW))] > 90;
  }
  function pointer(cx, cy, isMouse) {
    const p = toUv(cx, cy);
    const was = scanning;
    scanning = isMouse && over(cx, cy) && P.uD.value < 0.05;
    if (scanning) {
      if (!was) T.uLast.value.set(p.x, p.y);
      pos.x = p.x; pos.y = p.y;
      lastPaint = performance.now();
    }
    return scanning;
  }
  function leave() { scanning = false; }

  // ---------- per frame
  function update(dt) {
    if (!plate.visible) return;
    T.tPrev.value = rtA.texture;
    T.uPos.value.set(pos.x, pos.y);
    T.uPaint.value = scanning ? 1 : 0;
    T.uDecay.value = Math.exp(-dt * (scanning ? 1.1 : 1.8));
    if (scanning || performance.now() - lastPaint < 2500) {
      const prevTarget = renderer.getRenderTarget();
      renderer.setRenderTarget(rtB);
      renderer.render(trailScene, trailCam);
      renderer.setRenderTarget(prevTarget);
      [rtA, rtB] = [rtB, rtA];
      P.tMask.value = rtA.texture;
    }
    T.uLast.value.copy(T.uPos.value);
    if (embers) embers.visible = P.uD.value > 0.001 && P.uD.value < 0.999;
  }

  // ---------- disintegration cycle
  let busy = false, timer = 0, auto = false;
  function disintegrate() {
    if (busy || reduceMotion || !embers) return;
    busy = true;
    scanning = false;
    gsap.timeline({ onComplete: () => { busy = false; } })
      .to(P.uD, { value: 1, duration: 2.6, ease: 'power1.in' }, 0)
      .to(P.uMech, { value: 1, duration: 1.8, ease: 'power2.out' }, 0.9)
      .to(P.uD, { value: 0, duration: 2.4, ease: 'power2.inOut' }, 5.6)
      .to(P.uMech, { value: 0, duration: 1.4, ease: 'power2.in' }, 6.1);
  }
  function schedule(delay) {
    clearTimeout(timer);
    if (!auto) return;
    timer = setTimeout(() => {
      if (!scanning) disintegrate();
      schedule(16000);
    }, delay);
  }

  const ready = Promise.all([loadTex(photoUrl, true), loadTex(mechUrl, true)]).then(([p, m]) => {
    P.tPhoto.value = p;
    P.tMech.value = m;
    buildEmbers(p.image);
    plate.visible = true;
  });

  const api = {
    ready,
    layout,
    update,
    pointer,
    leave,
    over,
    disintegrate,
    start(firstDelay = 4000) { auto = !reduceMotion; schedule(firstDelay); },
    stop() { auto = false; clearTimeout(timer); },
    get busy() { return busy; },
    get rect() { return rect; },
  };
  if (import.meta.env.DEV) Object.assign(window.__profile, { api, kill: () => gsap.killTweensOf([P.uD, P.uMech]) });
  return api;
}
