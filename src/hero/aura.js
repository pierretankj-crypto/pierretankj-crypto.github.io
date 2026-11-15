// Hero "aura" scene.
// The three frames of the Aged Echo storyboard (Core Cycle, Chronos-Flow, Eternal Cycle) are
// aligned on their core gem and played as one living plate: the energy flows round the disc,
// light runs along the orbital rings, embers orbit and rise, and each frame hands over to the
// next through an expanding wave of light. Everything is drawn in "plate units":
// origin on the gem, y up, 1 unit = the plate's height.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import coreUrl from '../assets/img/aura-core.webp';
import surgeUrl from '../assets/img/aura-surge.webp';
import eternalUrl from '../assets/img/aura-eternal.webp';
import { createProfile } from './profile.js';

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
float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<3;i++){ s+=a*snoise(p); p=p*2.03+17.1; a*=0.5; } return s; }
`;

const plateFrag = /* glsl */ `
precision highp float;
uniform sampler2D tFrom;
uniform sampler2D tTo;
uniform vec2 uRes;
uniform vec2 uCenter;
uniform float uScale;
uniform float uTime;
uniform float uFromDim;
uniform float uIgR;
uniform float uFront;
uniform float uWaveR;
uniform float uWaveA;
uniform float uFlash;
uniform vec2 uMouse;
uniform float uMouseOn;
uniform float uEnergy;
uniform float uZoom;
uniform float uFade;
${NOISE}
const float ASPECT = 16.0/9.0;
const vec3 W = vec3(0.299, 0.587, 0.114);
vec3 plate(sampler2D t, vec2 p){
  vec2 uv = vec2(p.x / ASPECT + 0.5, p.y + 0.5);
  return texture2D(t, clamp(uv, 0.0, 1.0)).rgb;
}
void main(){
  vec2 p = (gl_FragCoord.xy - uCenter) / (uScale * uZoom);
  vec2 pp = p + uMouse * 0.012;                 // plate parallax
  float r = length(pp);
  vec2 dir = pp / max(r, 1e-4);
  vec2 tang = vec2(-dir.y, dir.x);

  // flowing aura (two-phase flow map, so the distortion never accumulates)
  float aura = smoothstep(0.30, 0.40, r) * (1.0 - smoothstep(0.82, 1.0, r));
  vec2 nf = vec2(snoise(pp * 2.1 + vec2(0.0, uTime * 0.16)), snoise(pp * 2.1 + vec2(5.2, -uTime * 0.14)));
  vec2 flow = (tang * 0.9 + nf * 0.75) * aura * (0.6 + 0.4 * uEnergy);
  float t = uTime * 0.21;
  float ph1 = fract(t), ph2 = fract(t + 0.5);
  float wA = 1.0 - abs(1.0 - 2.0 * ph1);
  vec2 oA = flow * (ph1 - 0.5) * 0.085;
  vec2 oB = flow * (ph2 - 0.5) * 0.085;

  // shockwave
  float dw = r - uWaveR;
  float wave = exp(-dw * dw * 380.0) * uWaveA;
  float pt = fract(uTime / 3.4);
  float prr = 0.30 + pt * 0.85;
  float pring = exp(-pow((r - prr) * 26.0, 2.0)) * (1.0 - pt) * (1.0 - pt) * uEnergy;
  vec2 sw = dir * (wave * 0.03 + pring * 0.007);

  vec3 fromC = plate(tFrom, pp - oA - sw) * wA + plate(tFrom, pp - oB - sw) * (1.0 - wA);
  vec3 toC   = plate(tTo,   pp - oA - sw) * wA + plate(tTo,   pp - oB - sw) * (1.0 - wA);
  float fl = dot(fromC, W);
  fromC = mix(fromC, vec3(fl) * vec3(1.0, 0.86, 0.7), uFromDim * 0.55) * (1.0 - uFromDim * 0.62);

  float ig = 1.0 - smoothstep(uIgR - 0.05, uIgR + 0.012, r);
  vec3 col = mix(fromC, toC, ig);
  float lum = dot(col, W);

  // soft edge so the plate dissolves into smoke, never shows a frame
  vec2 q = pp / vec2(0.86, 0.455);
  float m = 1.0 - smoothstep(0.52, 1.0, length(q));
  m *= m * (3.0 - 2.0 * m);

  // background smoke, slowly turning round the core
  float ang = uTime * 0.035;
  mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  vec2 s2 = rot * p * 1.35;
  vec2 warp = vec2(snoise(s2 * 0.7 + vec2(uTime * 0.025, 0.0)), snoise(s2 * 0.7 + vec2(3.7, -uTime * 0.02)));
  float s = fbm(s2 + 0.55 * warp);
  s = clamp(s * 0.5 + 0.5, 0.0, 1.0);
  float fall = 1.0 - smoothstep(0.1, 1.45, length(p * vec2(0.8, 1.0)));
  vec3 smoke = vec3(0.010, 0.0075, 0.005) + vec3(0.20, 0.115, 0.042) * pow(s, 3.2) * fall;
  smoke += vec3(0.30, 0.17, 0.06) * exp(-r * r * 6.0) * 0.09 * (0.7 + 0.3 * uEnergy);
  col = mix(smoke, col, m);

  // living corona: twisted noise gives spiral ribbons of light that race round the disc
  float ga0 = atan(pp.y, pp.x);
  float tw = uTime * 0.75 - r * 7.5;
  vec2 q2 = mat2(cos(tw), -sin(tw), sin(tw), cos(tw)) * pp;
  float n1 = snoise(q2 * 4.6 + vec2(0.0, uTime * 0.35));
  float n2 = snoise(q2 * 10.5 - vec2(uTime * 0.6, 0.0));
  float rib = pow(max(0.0, 0.5 + 0.5 * n1), 3.0) + 0.7 * pow(max(0.0, 0.5 + 0.5 * n2), 5.0);
  float outer = smoothstep(0.31, 0.37, r) * exp(-max(r - 0.36, 0.0) * 4.2);
  float corona = rib * outer;
  col += vec3(1.0, 0.58, 0.20) * corona * 0.62 * uEnergy;
  col += vec3(1.0, 0.86, 0.56) * pow(corona, 2.0) * 0.5 * uEnergy;
  // the rim of the disc breathes
  float rim = exp(-pow((r - 0.352) * 34.0, 2.0));
  col += vec3(1.0, 0.74, 0.40) * rim * (0.16 + 0.10 * sin(uTime * 2.4)) * uEnergy;
  // long rays turning slowly out of the core
  float lrays = pow(abs(cos(ga0 * 5.0 + uTime * 0.22)), 22.0) + 0.6 * pow(abs(cos(ga0 * 8.0 - uTime * 0.31 + 1.3)), 30.0);
  col += vec3(1.0, 0.70, 0.36) * lrays * exp(-r * 2.4) * smoothstep(0.30, 0.44, r) * 0.10 * uEnergy;
  // pulse rings
  col += vec3(1.0, 0.72, 0.38) * pring * 0.30 * (0.3 + m);

  // ignition / hand-over front: a ring of light that lights the engravings it passes
  float front = exp(-pow((r - uIgR) * 20.0, 2.0)) * uFront;
  col += vec3(1.0, 0.70, 0.36) * front * (0.12 + lum * 1.1) * (0.35 + m);

  // light running along the tilted orbital rings
  const float TILT = 0.309;
  vec2 rc = pp - vec2(0.014, 0.017);
  vec2 rr = vec2(rc.x * cos(TILT) + rc.y * sin(TILT), -rc.x * sin(TILT) + rc.y * cos(TILT));
  vec2 er = rr / vec2(0.75, 0.23);
  float e = length(er);
  float th = atan(er.y, er.x);
  float band = smoothstep(0.58, 0.70, e) * (1.0 - smoothstep(1.0, 1.1, e));
  float behind = step(0.0, rr.y) * (1.0 - smoothstep(0.30, 0.36, r));
  float sp = uTime * 0.95;
  float sweep = pow(0.5 + 0.5 * cos(th - sp), 34.0) + 0.75 * pow(0.5 + 0.5 * cos(th + 2.6 - sp * 1.0), 48.0);
  col += vec3(1.0, 0.76, 0.42) * sweep * band * (1.0 - behind * 0.85) * smoothstep(0.12, 0.5, lum) * 0.75 * m * uEnergy;

  // a slow glint turning across the disc, as if the astrolabe rotates under a lamp
  float discM = 1.0 - smoothstep(0.30, 0.345, r);
  float ga = atan(pp.y, pp.x);
  float glint = pow(0.5 + 0.5 * cos(ga - uTime * 0.6), 12.0) * discM * smoothstep(0.22, 0.65, lum) * smoothstep(0.05, 0.16, r);
  col += vec3(1.0, 0.86, 0.62) * glint * 0.36 * uEnergy;

  // the core: pulse, anamorphic streak and fine rays
  float pulse = (0.7 + 0.3 * sin(uTime * 2.2)) * (0.35 + 0.65 * uEnergy) + uFlash * 2.2;
  col += vec3(1.0, 0.74, 0.40) * (exp(-r * 34.0) * 0.8 + exp(-r * 8.0) * 0.07 + exp(-r * 3.2) * 0.035) * pulse;
  float streak = exp(-abs(pp.y) * 210.0) * exp(-abs(pp.x) * 3.0) * (0.10 * uEnergy + uFlash * 1.2);
  col += vec3(1.0, 0.66, 0.32) * streak;
  float rays = pow(abs(cos(ga * 3.0 + uTime * 0.12)), 90.0) * exp(-r * 9.5) * 0.16;
  col += vec3(1.0, 0.82, 0.55) * rays * pulse;

  // shockwave rim
  col += vec3(1.0, 0.68, 0.32) * wave * 0.55 * (0.35 + m);

  // the visitor's pointer carries a little lamp
  float md = length(p - uMouse);
  float ml = exp(-md * md * 12.0) * uMouseOn;
  col += col * ml * 0.32 + vec3(0.28, 0.16, 0.06) * ml * 0.03;

  col *= (0.95 + 0.05 * sin(uTime * 0.55)) * uFade;
  gl_FragColor = vec4(col, 1.0);
}
`;

const plateVert = /* glsl */ `
void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const sparkVert = /* glsl */ `
attribute vec4 aSeed;
attribute float aType;
uniform float uTime;
uniform float uScale;
uniform float uDpr;
uniform float uIntensity;
uniform vec2 uRes;
uniform vec2 uCenter;
uniform vec2 uMouse;
uniform float uZoom;
uniform float uFade;
varying float vAlpha;
varying vec3 vColor;
void main(){
  vec2 p; float size; float alpha; vec3 color;
  if (aType < 0.5) {                        // orbiting the rings
    float k = mix(0.62, 1.06, aSeed.y);
    float speed = (0.15 + aSeed.z * 0.2) / k;
    float th = aSeed.x * 6.2831853 + uTime * speed;
    vec2 e = vec2(cos(th) * 0.75 * k, sin(th) * 0.23 * k + (aSeed.w - 0.5) * 0.028);
    float c = cos(0.309), s = sin(0.309);
    p = vec2(e.x * c - e.y * s, e.x * s + e.y * c) + vec2(0.014, 0.017);
    float front = step(sin(th), 0.0);
    float r = length(p);
    float hidden = (1.0 - front) * (1.0 - smoothstep(0.29, 0.36, r));
    alpha = (0.35 + 0.65 * front) * (1.0 - hidden * 0.96) * (0.5 + 0.5 * sin(uTime * (1.5 + aSeed.z * 4.0) + aSeed.x * 40.0));
    size = mix(1.3, 4.0, aSeed.z * aSeed.z) * (0.75 + 0.5 * front);
    color = mix(vec3(1.0, 0.62, 0.26), vec3(1.0, 0.9, 0.7), aSeed.w);
    p -= uMouse * 0.012;
  } else if (aType < 1.5) {                 // embers lifting off the disc
    float life = 2.4 + aSeed.z * 3.2;
    float age = fract(uTime / life + aSeed.x);
    float a0 = aSeed.y * 6.2831853;
    vec2 start = vec2(cos(a0), sin(a0)) * (0.16 + aSeed.w * 0.22);
    vec2 dir = normalize(start);
    p = start + dir * age * (0.34 + aSeed.z * 0.62) + vec2(sin(age * 7.0 + aSeed.x * 20.0) * 0.035, age * age * 0.28);
    alpha = sin(age * 3.14159) * (0.55 + 0.45 * sin(uTime * 11.0 + aSeed.x * 90.0));
    size = mix(1.2, 4.4, aSeed.w) * (1.0 - age * 0.5);
    color = mix(vec3(1.0, 0.88, 0.62), vec3(1.0, 0.38, 0.08), age);
    p -= uMouse * 0.018;
  } else if (aType > 2.5) {                 // a stream spiralling into the core, gathering power
    float life = 1.7 + aSeed.z * 1.6;
    float age = fract(uTime / life + aSeed.x);
    float r0 = 0.48 + aSeed.y * 0.62;
    float rr = mix(r0, 0.035, age * age);
    float th = aSeed.w * 6.2831853 + age * (2.6 + aSeed.z * 2.2) + uTime * 0.2;
    p = vec2(cos(th), sin(th) * 0.92) * rr;
    alpha = smoothstep(0.0, 0.18, age) * (1.0 - smoothstep(0.82, 1.0, age)) * 0.85;
    size = mix(1.1, 3.0, aSeed.z) * (0.55 + 0.7 * age);
    color = mix(vec3(1.0, 0.52, 0.18), vec3(1.0, 0.93, 0.78), age);
    p -= uMouse * 0.014;
  } else {                                  // dust in the room
    vec2 base = (aSeed.xy - 0.5) * vec2(2.8, 1.4);
    p.x = base.x + sin(uTime * 0.06 + aSeed.z * 30.0) * 0.03;
    p.y = mod(base.y + 0.7 + uTime * (0.012 + aSeed.z * 0.03), 1.4) - 0.7;
    p -= uMouse * (0.02 + aSeed.z * 0.04);
    alpha = 0.10 + 0.22 * aSeed.w;
    size = 0.8 + aSeed.z * 1.8;
    color = vec3(0.95, 0.80, 0.56);
  }
  vAlpha = alpha * uIntensity * uFade;
  vColor = color;
  vec2 px = uCenter + p * uScale * uZoom;
  gl_Position = vec4(px / uRes * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = size * uDpr * clamp(uScale / 760.0, 0.7, 1.5);
}
`;

const sparkFrag = /* glsl */ `
precision highp float;
varying float vAlpha;
varying vec3 vColor;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vColor * 2.6, a * a * vAlpha);
}
`;

const finishShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes; varying vec2 vUv;
    void main(){
      vec2 c = vUv - 0.5;
      float d = length(c * vec2(uRes.x / uRes.y, 1.0)) / max(1.0, uRes.x / uRes.y);
      vec2 off = c * d * 0.008;
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      float vig = smoothstep(0.92, 0.2, length(c * vec2(1.0, 1.15)) * 1.15);
      col *= mix(0.32, 1.0, vig);
      float g = fract(sin(dot(vUv * uRes + fract(uTime) * 91.7, vec2(12.9898, 78.233))) * 43758.5453);
      col += (g - 0.5) * 0.018;
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }`,
};

function loadTexture(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.anisotropy = 4;
      resolve(t);
    }, undefined, reject);
  });
}

export function createAura(canvas, { gsap, reduceMotion = false, onProgress } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  if (!renderer.getContext()) return null;
  renderer.setClearColor(0x0b0907, 1);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.92;

  const small = window.matchMedia('(max-width: 760px)').matches;
  let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const MAX_PX = 2.2e6;                       // cap the drawing buffer (~1900x1150)
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const U = {
    tFrom: { value: null }, tTo: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) }, uCenter: { value: new THREE.Vector2(0, 0) }, uScale: { value: 800 },
    uTime: { value: 0 }, uFromDim: { value: 1 }, uIgR: { value: 0 }, uFront: { value: 0 },
    uWaveR: { value: 0 }, uWaveA: { value: 0 }, uFlash: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) }, uMouseOn: { value: 0 }, uEnergy: { value: 0.25 },
    uZoom: { value: 1 }, uFade: { value: 1 },
  };
  const plateMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: plateVert, fragmentShader: plateFrag, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), plateMat);
  quad.frustumCulled = false;
  scene.add(quad);

  // particles
  const counts = small ? [760, 300, 200, 320] : [1500, 620, 420, 700];
  const total = counts[0] + counts[1] + counts[2];
  const seeds = new Float32Array(total * 4);
  const types = new Float32Array(total);
  let k = 0;
  counts.forEach((n, type) => { for (let i = 0; i < n; i++, k++) { for (let j = 0; j < 4; j++) seeds[k * 4 + j] = Math.random(); types[k] = type; } });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  g.setAttribute('aType', new THREE.BufferAttribute(types, 1));
  const SU = {
    uTime: U.uTime, uScale: U.uScale, uRes: U.uRes, uCenter: U.uCenter, uMouse: U.uMouse, uZoom: U.uZoom, uFade: U.uFade,
    uDpr: { value: dpr }, uIntensity: { value: 0.35 },
  };
  const sparkMat = new THREE.ShaderMaterial({
    uniforms: SU, vertexShader: sparkVert, fragmentShader: sparkFrag,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(g, sparkMat);
  points.frustumCulled = false;
  points.renderOrder = 1;
  scene.add(points);

  // Pierre's profile, standing in front of the aura
  const profile = createProfile({ renderer, scene, gsap, reduceMotion, uTime: U.uTime, uRes: U.uRes, uFade: U.uFade });

  // post
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(dpr);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.52, 0.68, 0.66);
  composer.addPass(bloom);
  const finish = new ShaderPass(finishShader);
  composer.addPass(finish);
  composer.addPass(new OutputPass());

  const hero = canvas.closest('.hero') || canvas.parentElement;
  // layout
  let W = 1, H = 1, cx = 0, cy = 0, scale = 800, quality = 1;
  function layout() {
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    const narrow = W <= 760 || W < H * 0.9;
    let disc;
    cx = W * (narrow ? 0.56 : 0.58);
    const innerEl = hero.querySelector('.hero__inner');
    const innerTop = innerEl ? innerEl.offsetTop : H * 0.55;
    if (narrow) {
      // fit the disc into the space between the nav and the hero text block
      const inner = hero.querySelector('.hero__inner');
      const top = 64, bottom = inner ? inner.offsetTop + 24 : H * 0.55;
      const free = Math.max(bottom - top, 1);
      disc = Math.max(Math.min(W * 0.86, free * 0.9), Math.min(W * 0.6, 240));
      cy = top + free / 2;
    } else {
      disc = Math.min(H * 0.62, W * 0.46);
      cy = H * 0.41;
    }
    scale = disc / 0.69;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(MAX_PX / (W * H))) * quality;
    renderer.setPixelRatio(dpr);
    composer.setPixelRatio(dpr);
    SU.uDpr.value = Math.max(dpr, 0.75);
    renderer.setSize(W, H, false);
    composer.setSize(W, H);
    U.uRes.value.set(W * dpr, H * dpr);
    U.uCenter.value.set(cx * dpr, (H - cy) * dpr);
    U.uScale.value = scale * dpr;
    finish.uniforms.uRes.value.set(W * dpr, H * dpr);
    profile.layout({ W, H, dpr, narrow, innerTop });
    const pr = profile.rect;
    hero.style.setProperty('--scan-x', `${Math.max(90, pr.x + pr.w * 0.5)}px`);
    hero.style.setProperty('--scan-y', `${Math.max(110, pr.y + pr.h * 0.04)}px`);
  }
  layout();

  // pointer
  const mouse = { x: 0, y: 0, tx: 0, ty: 0, on: 0, ton: 0 };
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.tx = (e.clientX - r.left - cx) / scale;
    mouse.ty = (cy - (e.clientY - r.top)) / scale;
    mouse.ton = e.pointerType === 'mouse' ? 1 : 0;
    const scanning = profile.pointer(e.clientX - r.left, e.clientY - r.top, e.pointerType === 'mouse');
    hero.classList.toggle('is-scanning', scanning);
    if (scanning) hero.classList.add('has-scanned');
  };
  const onLeave = () => { mouse.ton = 0; mouse.tx = 0; mouse.ty = 0; profile.leave(); hero.classList.remove('is-scanning'); };
  hero.addEventListener('pointermove', onMove, { passive: true });
  hero.addEventListener('pointerleave', onLeave);

  // textures
  const loader = new THREE.TextureLoader();
  const urls = [coreUrl, surgeUrl, eternalUrl];
  let done = 0;
  const plates = Promise.all(urls.map((u) => loadTexture(loader, u).then((t) => { done++; onProgress?.(done / urls.length); return t; })));

  let tex = [];
  let stage = 0;
  let running = false;
  let visible = true;
  let raf = 0;
  let clock = 0;
  let last = performance.now();
  let cycleTimer = null;
  let ignited = false;
  const perf = { n: 0, t: 0 };

  function frame(now) {
    raf = 0;
    const rawDt = (now - last) / 1000;
    const dt = Math.min(rawDt, 0.05);
    last = now;
    clock += dt;
    U.uTime.value = clock;
    finish.uniforms.uTime.value = clock;
    mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 3);
    mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 3);
    mouse.on += (mouse.ton - mouse.on) * Math.min(1, dt * 2.5);
    U.uMouse.value.set(mouse.x, mouse.y);
    U.uMouseOn.value = mouse.on;
    profile.update(dt);
    composer.render(dt);
    // adaptive resolution: only judge real foreground frames (a throttled or hidden tab is not a slow GPU),
    // step down when frames run long, climb back when there is headroom
    if (rawDt < 0.1 && document.visibilityState === 'visible') { perf.n++; perf.t += rawDt; }
    if (perf.n >= 60) {
      const avg = perf.t / perf.n;
      if (avg > 0.024 && quality > 0.56) { quality = Math.max(0.55, quality - 0.15); layout(); }
      else if (avg < 0.0175 && quality < 1) { quality = Math.min(1, quality + 0.15); layout(); }
      perf.n = 0; perf.t = 0;
    }
    if (running && visible) raf = requestAnimationFrame(frame);
  }
  function play() {
    if (reduceMotion) { composer.render(0); return; }
    running = true;
    if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  function pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  const io = new IntersectionObserver(([en]) => {
    visible = en.isIntersecting && en.intersectionRatio > 0;
    if (visible && running && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }, { threshold: [0, 0.01] });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    if (visible && running && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  });
  let resizeT = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { layout(); if (!running) composer.render(0); }, 120); });

  // hand-over from the current frame to the next, through an expanding wave
  function handOver(next, { dur = 2.6, flash = 0 } = {}) {
    U.tFrom.value = U.tTo.value;
    U.tTo.value = tex[next];
    U.uFromDim.value = 0;
    stage = next;
    const tl = gsap.timeline();
    tl.fromTo(U.uIgR, { value: 0 }, { value: 1.35, duration: dur, ease: 'power2.inOut' }, 0)
      .fromTo(U.uFront, { value: 0 }, { value: 1, duration: 0.4, ease: 'power1.out' }, 0)
      .to(U.uFront, { value: 0, duration: 0.8, ease: 'power1.in' }, dur - 0.8)
      .fromTo(U.uWaveR, { value: 0.05 }, { value: 1.25, duration: dur * 0.9, ease: 'power2.out' }, 0)
      .fromTo(U.uWaveA, { value: 0.55 }, { value: 0, duration: dur * 0.9, ease: 'power1.in' }, 0);
    if (flash) tl.fromTo(U.uFlash, { value: flash }, { value: 0, duration: 1.2, ease: 'power2.out' }, 0);
    return tl;
  }
  function scheduleCycle() {
    clearTimeout(cycleTimer);
    cycleTimer = setTimeout(() => {
      if (!running) return scheduleCycle();
      handOver((stage + 1) % tex.length, { dur: 2.8, flash: 0.35 });
      scheduleCycle();
    }, 9000);
  }

  function ignite() {
    if (ignited || !tex.length) return;
    ignited = true;
    if (reduceMotion) {
      U.tFrom.value = tex[0]; U.tTo.value = tex[0]; U.uFromDim.value = 0; U.uIgR.value = 2; U.uEnergy.value = 1;
      SU.uIntensity.value = 1; U.uTime.value = 3.0; composer.render(0);
      return;
    }
    // dormant core → lit core, with a flash and the first shockwave
    U.tFrom.value = tex[0]; U.tTo.value = tex[0]; U.uFromDim.value = 1;
    const tl = gsap.timeline();
    tl.fromTo(U.uFlash, { value: 1.4 }, { value: 0, duration: 1.6, ease: 'power2.out' }, 0)
      .fromTo(U.uIgR, { value: 0 }, { value: 1.35, duration: 2.2, ease: 'expo.out' }, 0.05)
      .fromTo(U.uFront, { value: 1.2 }, { value: 0, duration: 2.2, ease: 'power2.in' }, 0.05)
      .fromTo(U.uWaveR, { value: 0.02 }, { value: 1.3, duration: 2.0, ease: 'expo.out' }, 0.05)
      .fromTo(U.uWaveA, { value: 1.0 }, { value: 0, duration: 2.0, ease: 'power2.in' }, 0.05)
      .to(U.uEnergy, { value: 1, duration: 2.4, ease: 'power2.out' }, 0)
      .to(SU.uIntensity, { value: 1, duration: 2.4, ease: 'power2.out' }, 0.1)
      .add(() => { U.uFromDim.value = 0; });
    tl.add(() => {
      // surge: Chronos-Flow, then the Eternal Cycle, then back round to the core
      handOver(1, { dur: 2.6, flash: 0.4 });
      scheduleCycle();
    }, 5.2);
    profile.start(3600);
  }

  // click / tap on the hero sends a pulse out from the core
  hero.addEventListener('click', (e) => {
    if (!ignited || reduceMotion) return;
    if (e.target.closest('a, button')) return;
    const r = canvas.getBoundingClientRect();
    if (profile.over(e.clientX - r.left, e.clientY - r.top)) { profile.disintegrate(); return; }
    gsap.fromTo(U.uWaveR, { value: 0.02 }, { value: 1.2, duration: 1.6, ease: 'expo.out' });
    gsap.fromTo(U.uWaveA, { value: 0.9 }, { value: 0, duration: 1.6, ease: 'power2.in' });
    gsap.fromTo(U.uFlash, { value: 0.9 }, { value: 0, duration: 1.0, ease: 'power2.out' });
  });

  const ready = Promise.all([plates, profile.ready]).then(([t]) => {
    tex = t;
    U.tFrom.value = tex[0];
    U.tTo.value = tex[0];
    U.uFromDim.value = 1;
    U.uIgR.value = 0;
    // compile and draw one frame before showing the canvas
    composer.render(0);
    canvas.closest('.hero')?.classList.add('gl-ready');
    play();
  });

  return {
    ready,
    ignite,
    layout: () => { layout(); if (!running) composer.render(0); },
    setScroll(p) {
      U.uZoom.value = 1 + p * p * 0.9;
      U.uFade.value = 1 - p * 0.75;
      if (!running) composer.render(0);
    },
    center: () => ({ x: cx, y: cy, disc: scale * 0.69 }),
    setMotion(on) {
      if (on) { play(); scheduleCycle(); profile.start(2500); } else { pause(); clearTimeout(cycleTimer); profile.stop(); composer.render(0); }
    },
  };
}
