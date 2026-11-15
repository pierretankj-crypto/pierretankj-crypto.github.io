// Intro loader: a drive is machined and assembled while the counter runs to 100.
//  - Each part appears first as a green blueprint wireframe, then a white-hot welding line sweeps
//    across it and turns it into metal, which cools from orange. Sparks spray off the cut line.
//  - When a part locks home: a clunk, a spark burst, a shock ring and a camera kick.
//  - A HUD ring around the drive tracks progress, with live readouts beside it.
//  - Backlit blueprint grid, dust in the light, bloom.
//  - Exit: the drive spins up throwing sparks, bursts into an exploded view while a green scan
//    eats it, and the camera flies through it into the cover.
// The assembly is scrubbed by load progress (capped by real time, so it never jumps).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const NOISE3 = /* glsl */ `
vec3 m289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 m289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 perm(vec4 x){return m289(((x*34.0)+1.0)*x);}
vec4 tis(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise3(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=m289(i);
  vec4 p=perm(perm(perm(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

// where the build front is on a part, in 0..1 along its build axis
const BUILD_FN = /* glsl */ `
float buildT(vec3 wpos){
  vec3 pp = (uPartInv * vec4(wpos, 1.0)).xyz;
  return (dot(pp, uAxis) - uMin) / max(uMax - uMin, 1e-3) + snoise3(pp * 7.0) * 0.03;
}
`;

const TAU = Math.PI * 2;

function gearShape(teeth, rRoot, rTip, holeR) {
  const s = new THREE.Shape();
  const step = TAU / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [[rRoot, a], [rTip, a + step * 0.2], [rTip, a + step * 0.48], [rRoot, a + step * 0.68]];
    pts.forEach(([r, t], k) => (i === 0 && k === 0 ? s.moveTo : s.lineTo).call(s, Math.cos(t) * r, Math.sin(t) * r));
  }
  s.closePath();
  if (holeR) { const h = new THREE.Path(); h.absarc(0, 0, holeR, 0, TAU, true); s.holes.push(h); }
  return s;
}
function hole(s, x, y, r) { const h = new THREE.Path(); h.absarc(x, y, r, 0, TAU, true); s.holes.push(h); }
function extrude(shape, depth, curve = 48) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2, curveSegments: curve });
  g.translate(0, 0, -depth / 2);
  return g;
}
const alongZ = (g) => { g.rotateX(Math.PI / 2); return g; };

// quick: a returning visitor gets the same build in about two seconds, then the fast exit.
export function runGearLoader({ root, gsap, getProgress, onReveal, onDone, quick = false, minDuration = quick ? 1.5 : 6.2 }) {
  const canvas = root.querySelector('.loader__gl');
  const num = root.querySelector('.loader__num');
  const log = [...root.querySelectorAll('.loader__log li')];
  const skipBtn = root.querySelector('.loader__skip');

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!renderer.getContext()) throw new Error('no gl');
  } catch (e) {
    renderer = null;
  }

  // ---------- counter + log only (no WebGL)
  if (!renderer) {
    const o = { v: 0 };
    gsap.to(o, { v: 100, duration: 1.6, ease: 'power2.inOut', onUpdate: () => { num.textContent = String(Math.round(o.v)).padStart(3, '0'); },
      onComplete: () => { onReveal(); gsap.to(root, { opacity: 0, duration: 0.6, onComplete: onDone }); } });
    return;
  }

  const small = window.innerWidth < 760;
  const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.4 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x050404, 1);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 60);

  const key = new THREE.DirectionalLight(0xfff0dc, 2.4); key.position.set(4, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe2b8, 3.6); rim.position.set(-5, 3, -4); scene.add(rim);
  const fill = new THREE.DirectionalLight(0x8fa0b4, 0.35); fill.position.set(-3, -2, 4); scene.add(fill);
  const sweep = new THREE.PointLight(0xfff2dc, 0, 9, 1.6); sweep.position.set(-4, 1.2, 3); scene.add(sweep);
  const weld = new THREE.PointLight(0xffb060, 0, 1.6, 2); scene.add(weld);
  const flashL = new THREE.PointLight(0xffd9a0, 0, 5, 2); scene.add(flashL);

  /* ---------------------------------------------------------------- backdrop */
  const B = {
    uRes: { value: new THREE.Vector2(1, 1) }, uC: { value: new THREE.Vector2(0.5, 0.5) }, uTime: { value: 0 },
    uGlow: { value: 0.4 }, uGreen: { value: 0 }, uCell: { value: 48 },
  };
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: B, depthTest: false, depthWrite: false,
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec2 uRes; uniform vec2 uC; uniform float uTime; uniform float uGlow; uniform float uGreen; uniform float uCell;
      ${NOISE3}
      void main(){
        vec2 uv = gl_FragCoord.xy / uRes;
        vec2 d2 = (uv - uC) * vec2(uRes.x / uRes.y, 1.0);
        float d = length(d2);
        vec3 col = vec3(0.020, 0.016, 0.013);
        float smoke = snoise3(vec3(d2 * 2.2, uTime * 0.08)) * 0.5 + 0.5;
        col += vec3(0.62, 0.40, 0.18) * exp(-d * d * 4.5) * (0.16 + 0.06 * smoke) * uGlow;
        col += vec3(0.25, 0.85, 0.30) * exp(-d * d * 7.0) * 0.10 * uGreen;
        // blueprint grid, brightest near the drive
        vec2 f = fract(gl_FragCoord.xy / uCell); vec2 e = min(f, 1.0 - f) * uCell;
        float line = 1.0 - smoothstep(0.0, 1.1, min(e.x, e.y));
        vec2 f2 = fract(gl_FragCoord.xy / (uCell * 4.0)); vec2 e2 = min(f2, 1.0 - f2) * uCell * 4.0;
        float major = 1.0 - smoothstep(0.0, 1.3, min(e2.x, e2.y));
        float near = exp(-d * 1.8);
        col += mix(vec3(0.75, 0.6, 0.38), vec3(0.4, 1.0, 0.45), uGreen) * (line * 0.018 + major * 0.035) * near;
        col *= mix(0.55, 1.0, smoothstep(1.25, 0.25, length((uv - 0.5) * vec2(1.0, 1.2))));
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  backdrop.frustumCulled = false;
  backdrop.renderOrder = -10;
  scene.add(backdrop);

  /* ---------------------------------------------------------------- materials */
  const D = { uDissolve: { value: 0 }, uTime: { value: 0 } };
  const BASES = {
    gun: { color: 0x2a2a2e, metalness: 1, roughness: 0.3 },
    dark: { color: 0x19191b, metalness: 1, roughness: 0.36 },
    steel: { color: 0xb9b9c0, metalness: 1, roughness: 0.2 },
    brass: { color: 0xc8964e, metalness: 1, roughness: 0.28 },
  };
  const allMats = [];
  function partMaterials(P) {
    const out = {};
    for (const [k, base] of Object.entries(BASES)) {
      const mat = new THREE.MeshStandardMaterial(base);
      mat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, D, P);
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
          .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', `#include <common>
            varying vec3 vWPos;
            uniform float uDissolve; uniform float uTime;
            uniform float uBuild; uniform float uMin; uniform float uMax; uniform vec3 uAxis; uniform mat4 uPartInv;
            ${NOISE3}
            ${BUILD_FN}`)
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
            // build: metal exists below the welding front; above it, only the blueprint wire
            if (uBuild < 0.999) {
              float front = uBuild * 1.12 - 0.06;
              float bd = front - buildT(vWPos);
              if (bd < 0.0) discard;
              float edge = 1.0 - smoothstep(0.0, 0.045, bd);
              float heat = 1.0 - smoothstep(0.0, 0.32, bd);
              totalEmissiveRadiance += vec3(1.0, 0.86, 0.62) * edge * 1.9;
              totalEmissiveRadiance += vec3(1.0, 0.34, 0.06) * heat * heat * 0.75;
            }
            // exit: a noisy green scan sweeps the drive away
            if (uDissolve > 0.0) {
              float dn = snoise3(vWPos * 3.1) * 0.5 + 0.5;
              float dd = (vWPos.x + 2.4) / 4.8 * 0.7 + dn * 0.3;
              float cut = uDissolve * 1.3 - 0.15;
              if (dd < cut) discard;
              float edgeD = 1.0 - smoothstep(0.0, 0.11, dd - cut);
              float crack = pow(1.0 - abs(snoise3(vWPos * 10.0 + uTime * 0.4)), 7.0);
              float blot = smoothstep(0.55, 0.75, snoise3(vWPos * 5.0 - uTime * 0.2) * 0.5 + 0.5);
              totalEmissiveRadiance += vec3(0.32, 1.0, 0.22) * edgeD * (0.55 + crack * 3.2 + blot * 0.9);
            }`);
      };
      mat.customProgramCacheKey = () => 'gear-build';
      out[k] = mat;
      allMats.push(mat);
    }
    return out;
  }

  const wireMats = [];
  function wireMaterial(P) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...P, uTime: D.uTime, uDissolve: D.uDissolve },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `varying vec3 vWPos; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec3 vWPos;
        uniform float uBuild; uniform float uWire; uniform float uWireA; uniform float uMin; uniform float uMax; uniform vec3 uAxis; uniform mat4 uPartInv;
        uniform float uTime; uniform float uDissolve;
        ${NOISE3}
        ${BUILD_FN}
        void main(){
          float bt = buildT(vWPos);
          float drawn = 1.0 - smoothstep(uWire * 1.12 - 0.08, uWire * 1.12 - 0.01, bt);
          float front = uBuild * 1.12 - 0.06;
          float unbuilt = smoothstep(front - 0.03, front + 0.05, bt);
          float tip = exp(-pow((bt - (uWire * 1.12 - 0.04)) * 30.0, 2.0)) * step(uWire, 0.999);
          float flick = 0.82 + 0.18 * sin(uTime * 37.0 + bt * 70.0);
          float on = smoothstep(0.0, 0.03, uWire);
          float a = (drawn * unbuilt * 1.0 + tip * 1.4) * on * uWireA * flick * (1.0 - uDissolve);
          gl_FragColor = vec4(vec3(0.42, 1.0, 0.36) * 1.8, a);
        }`,
    });
    wireMats.push(mat);
    return mat;
  }

  /* ---------------------------------------------------------------- the parts (axis = Z) */
  const rootG = new THREE.Group(); scene.add(rootG);
  const spin = new THREE.Group(); rootG.add(spin);
  const partList = [];
  // a part is a group; its build sweeps along `axis` in its own frame
  function makePart(name, axis, build) {
    const g = new THREE.Group();
    const P = {
      uBuild: { value: 0 }, uWire: { value: 0 }, uWireA: { value: 1 },
      uMin: { value: 0 }, uMax: { value: 1 }, uAxis: { value: new THREE.Vector3(...axis) }, uPartInv: { value: new THREE.Matrix4() },
    };
    const mats = partMaterials(P);
    build(g, mats);
    const wm = wireMaterial(P);
    // bounds along the axis, in the part's frame
    let lo = Infinity, hi = -Infinity;
    const v = new THREE.Vector3();
    const ax = P.uAxis.value;
    g.children.forEach((m) => {
      m.updateMatrix();
      m.traverse((o) => {
        if (!o.isMesh) return;
        const pos = o.geometry.attributes.position;
        o.updateMatrix();
        const mat = o === m ? m.matrix : new THREE.Matrix4().multiplyMatrices(m.matrix, o.matrix);
        for (let i = 0; i < pos.count; i += 3) {
          v.fromBufferAttribute(pos, i).applyMatrix4(mat);
          const d = v.dot(ax); if (d < lo) lo = d; if (d > hi) hi = d;
        }
        // blueprint wireframe
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 24), wm);
        edges.renderOrder = 2;
        o.add(edges);
      });
    });
    P.uMin.value = lo; P.uMax.value = hi;
    const part = { name, g, P, R: 0 };
    partList.push(part);
    spin.add(g);
    return part;
  }

  const ringP = makePart('ring', [0, 1, 0], (g, M) => {
    g.add(new THREE.Mesh(extrude(gearShape(72, 0.935, 1.0, 0.82), 0.34, 64), M.gun));
  });
  ringP.R = 1.0;
  const webP = makePart('web', [0, 1, 0], (g, M) => {
    const s = new THREE.Shape(); s.absarc(0, 0, 0.84, 0, TAU, false);
    hole(s, 0, 0, 0.3);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.26; hole(s, Math.cos(a) * 0.57, Math.sin(a) * 0.57, 0.12); }
    g.add(new THREE.Mesh(extrude(s, 0.12, 40), M.gun));
  });
  webP.R = 0.84;
  const bolts = [];
  const hubP = makePart('hub', [0, 1, 0], (g, M) => {
    g.add(new THREE.Mesh(alongZ(new THREE.CylinderGeometry(0.3, 0.3, 0.72, 64, 1, true)), M.steel));
    const ps = new THREE.Shape(); ps.absarc(0, 0, 0.42, 0, TAU, false); hole(ps, 0, 0, 0.13);
    const plate = new THREE.Mesh(extrude(ps, 0.07, 48), M.steel); plate.position.z = 0.36; g.add(plate);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const b = new THREE.Mesh(alongZ(new THREE.CylinderGeometry(0.038, 0.038, 0.06, 6)), M.dark);
      b.position.set(Math.cos(a) * 0.31, Math.sin(a) * 0.31, 0.42); g.add(b); bolts.push(b);
    }
  });
  hubP.R = 0.42;
  const bearingP = makePart('bearing', [0, 1, 0], (g, M) => {
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 20, 72), M.brass));
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 14, 60), M.steel));
  });
  bearingP.R = 0.36;
  const shaftP = makePart('shaft', [0, 0, 1], (g, M) => {
    g.add(new THREE.Mesh(alongZ(new THREE.CylinderGeometry(0.115, 0.115, 2.9, 48)), M.steel));
    for (const z of [-1.05, 1.05]) {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU;
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.46), M.steel);
        sp.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.12, z); sp.rotation.z = a; g.add(sp);
      }
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.025, 12, 40), M.dark); collar.position.z = z * 0.72; g.add(collar);
    }
  });
  shaftP.R = 0.14;
  const flangeShape = new THREE.Shape();
  for (let i = 0; i <= 160; i++) {
    const t = (i / 160) * TAU;
    const r = 0.46 * (0.7 + 0.3 * Math.pow(Math.abs(Math.cos(2.5 * t)), 2.2));
    (i === 0 ? flangeShape.moveTo : flangeShape.lineTo).call(flangeShape, Math.cos(t) * r, Math.sin(t) * r);
  }
  hole(flangeShape, 0, 0, 0.12);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; hole(flangeShape, Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0.04); }
  const flangeP = [1, -1].map((side) => {
    const p = makePart(side > 0 ? 'f1' : 'f2', [0, 1, 0], (g, M) => {
      const f = new THREE.Mesh(extrude(flangeShape, 0.09, 24), M.dark);
      const neck = new THREE.Mesh(alongZ(new THREE.CylinderGeometry(0.17, 0.2, 0.32, 40)), M.gun);
      neck.position.z = -side * 0.2;
      g.add(f, neck);
    });
    p.R = 0.46;
    return p;
  });
  const home = { ring: 0, web: 0, hub: 0, bearing: -0.42, shaft: 0, f1: 1.3, f2: -1.3 };
  partList.forEach((p) => { p.g.position.z = home[p.name]; });

  /* ---------------------------------------------------------------- sparks (streaks) */
  const SPARKS = small ? 700 : 1400;
  const sv = SPARKS * 2;
  const aP0 = new Float32Array(sv * 3), aV = new Float32Array(sv * 3), aBirth = new Float32Array(sv).fill(-99), aLife = new Float32Array(sv), aEnd = new Float32Array(sv), aHeat = new Float32Array(sv);
  for (let i = 0; i < SPARKS; i++) aEnd[i * 2 + 1] = 1;
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sv * 3), 3));
  sg.setAttribute('aP0', new THREE.BufferAttribute(aP0, 3));
  sg.setAttribute('aV', new THREE.BufferAttribute(aV, 3));
  sg.setAttribute('aBirth', new THREE.BufferAttribute(aBirth, 1));
  sg.setAttribute('aLife', new THREE.BufferAttribute(aLife, 1));
  sg.setAttribute('aEnd', new THREE.BufferAttribute(aEnd, 1));
  sg.setAttribute('aHeat', new THREE.BufferAttribute(aHeat, 1));
  const SU = { uNow: { value: 0 } };
  const sparks = new THREE.LineSegments(sg, new THREE.ShaderMaterial({
    uniforms: SU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec3 aP0; attribute vec3 aV; attribute float aBirth; attribute float aLife; attribute float aEnd; attribute float aHeat;
      uniform float uNow; varying float vA; varying vec3 vC;
      void main(){
        float age = uNow - aBirth;
        float t = max(age - aEnd * 0.035, 0.0);
        vec3 p = aP0 + aV * t + vec3(0.0, -4.2, 0.0) * 0.5 * t * t;
        float k = clamp(age / aLife, 0.0, 1.0);
        vA = (age > 0.0 && age < aLife) ? (1.0 - k) * (1.0 - aEnd * 0.85) : 0.0;
        vC = mix(vec3(1.0, 0.95, 0.8), mix(vec3(1.0, 0.55, 0.15), vec3(0.9, 0.2, 0.05), k), smoothstep(0.0, 0.5, k)) * (1.4 + aHeat * 1.6);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `precision highp float; varying float vA; varying vec3 vC; void main(){ gl_FragColor = vec4(vC, vA); }`,
  }));
  sparks.frustumCulled = false;
  sparks.renderOrder = 3;
  scene.add(sparks);
  let sCursor = 0, sDirty = false;
  function emit(pos, vel, life = 0.7, heat = 0) {
    for (let e = 0; e < 2; e++) {
      const i = sCursor * 2 + e;
      aP0[i * 3] = pos.x; aP0[i * 3 + 1] = pos.y; aP0[i * 3 + 2] = pos.z;
      aV[i * 3] = vel.x; aV[i * 3 + 1] = vel.y; aV[i * 3 + 2] = vel.z;
      aBirth[i] = SU.uNow.value; aLife[i] = life; aHeat[i] = heat;
    }
    sCursor = (sCursor + 1) % SPARKS;
    sDirty = true;
  }
  const tmpV = new THREE.Vector3(), tmpW = new THREE.Vector3(), tmpN = new THREE.Vector3();
  const rand = (a, b) => a + Math.random() * (b - a);
  function burst(worldPos, n, speed, spread = 1, heat = 0.6) {
    for (let i = 0; i < n; i++) {
      tmpV.set(rand(-1, 1), rand(-0.3, 1.2), rand(-1, 1)).normalize().multiplyScalar(speed * rand(0.4, 1.2) * spread);
      emit(worldPos, tmpV, rand(0.35, 0.95), heat);
    }
  }

  /* ---------------------------------------------------------------- shock ring + dust */
  const shockU = { uA: { value: 0 } };
  const shock = new THREE.Mesh(new THREE.RingGeometry(0.97, 1.0, 128), new THREE.ShaderMaterial({
    uniforms: shockU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'precision highp float; uniform float uA; void main(){ gl_FragColor = vec4(vec3(1.0, 0.8, 0.5) * 2.2, uA); }',
  }));
  shock.renderOrder = 4;
  rootG.add(shock);

  const DUST = small ? 160 : 320;
  const dp = new Float32Array(DUST * 3), ds = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) { dp[i * 3] = rand(-4, 4); dp[i * 3 + 1] = rand(-2.5, 2.5); dp[i * 3 + 2] = rand(-3, 2.5); ds[i] = Math.random(); }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  dg.setAttribute('aS', new THREE.BufferAttribute(ds, 1));
  const DU = { uTime: D.uTime, uPx: { value: dpr } };
  const dust = new THREE.Points(dg, new THREE.ShaderMaterial({
    uniforms: DU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `attribute float aS; uniform float uTime; uniform float uPx; varying float vA;
      void main(){ vec3 p = position; p.y = mod(p.y + 2.5 + uTime * (0.03 + aS * 0.07), 5.0) - 2.5; p.x += sin(uTime * 0.3 + aS * 40.0) * 0.08;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.0 + aS * 2.6) * uPx * (6.0 / -mv.z); vA = 0.10 + 0.32 * aS; }`,
    fragmentShader: 'precision highp float; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0, 0.82, 0.55), smoothstep(0.5, 0.0, d) * vA); }',
  }));
  dust.frustumCulled = false;
  scene.add(dust);

  /* ---------------------------------------------------------------- post */
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: small ? 2 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(dpr);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.7, 0.5, 0.86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------------------------------------------------------------- HUD overlay */
  const hud = document.createElement('div');
  hud.className = 'loader__hud';
  hud.setAttribute('aria-hidden', 'true');
  let ticks = '';
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * TAU, major = i % 10 === 0;
    const r0 = major ? 180 : 186, r1 = 193;
    ticks += `<line x1="${(Math.cos(a) * r0).toFixed(1)}" y1="${(Math.sin(a) * r0).toFixed(1)}" x2="${(Math.cos(a) * r1).toFixed(1)}" y2="${(Math.sin(a) * r1).toFixed(1)}"${major ? ' class="mj"' : ''}/>`;
  }
  let segs = '';
  for (let i = 0; i < 4; i++) segs += `<path d="M ${Math.cos(i * TAU / 4 + 0.2) * 160} ${Math.sin(i * TAU / 4 + 0.2) * 160} A 160 160 0 0 1 ${Math.cos(i * TAU / 4 + 1.15) * 160} ${Math.sin(i * TAU / 4 + 1.15) * 160}"/>`;
  hud.innerHTML = `
    <svg viewBox="-210 -210 420 420">
      <g class="hud__ticks">${ticks}</g>
      <circle class="hud__track" r="172"/>
      <circle class="hud__arc" r="172" pathLength="100" stroke-dasharray="0 100" transform="rotate(-90)"/>
      <g class="hud__segs">${segs}</g>
      <circle class="hud__dash" r="148"/>
      <g class="hud__corners"><path d="M-205 -165 V-205 H-165"/><path d="M205 -165 V-205 H165"/><path d="M-205 165 V205 H-165"/><path d="M205 165 V205 H165"/></g>
    </svg>
    <span class="hud__label hud__label--tl"><b lang="ja">組立中</b> Assembly</span>
    <span class="hud__label hud__label--br"><span class="hud__deg">000</span>°</span>`;
  root.appendChild(hud);
  const arc = hud.querySelector('.hud__arc');
  const degEl = hud.querySelector('.hud__deg');
  const jpEl = hud.querySelector('.hud__label--tl b');

  const data = document.createElement('dl');
  data.className = 'loader__data';
  data.setAttribute('aria-hidden', 'true');
  data.innerHTML = `
    <div><dt>RPM</dt><dd data-k="rpm">0000</dd></div>
    <div><dt>Load</dt><dd data-k="load">000%</dd></div>
    <div><dt>Temp</dt><dd data-k="temp">0021°C</dd></div>
    <div><dt>Parts</dt><dd data-k="parts">0 / 7</dd></div>`;
  root.appendChild(data);
  const dv = Object.fromEntries([...data.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const bar = document.createElement('span');
  bar.className = 'loader__bar';
  root.appendChild(bar);
  const flash = document.createElement('span');
  flash.className = 'loader__flash';
  root.appendChild(flash);

  /* ---------------------------------------------------------------- start states */
  const parts = Object.fromEntries(partList.map((p) => [p.name, p]));
  parts.ring.g.position.z = -4; parts.ring.g.scale.setScalar(0.82);
  parts.web.g.position.z = 3.2; parts.web.g.rotation.z = -1.4;
  parts.hub.g.position.z = 3.6;
  parts.bearing.g.position.z = -3.8;
  parts.shaft.g.position.z = 7;
  parts.f1.g.position.z = 5; parts.f1.g.rotation.z = -2.2;
  parts.f2.g.position.z = -5; parts.f2.g.rotation.z = 2.2;
  bolts.forEach((b) => b.scale.setScalar(0.001));
  rootG.rotation.set(0.5, -0.62, 0.15);

  /* ---------------------------------------------------------------- assembly timeline, scrubbed 0..1 */
  const S = { spinV: 0.22, push: 0, explode: 0, kick: 0, temp: 21, fov: 30 };
  const shake = { x: 0, y: 0 };
  const clunk = (part, z, n = 70) => () => {
    gsap.fromTo(flashL, { intensity: 7 }, { intensity: 0, duration: 0.7, ease: 'power2.out' });
    flashL.position.copy(rootG.localToWorld(tmpW.set(0, 0, z)));
    gsap.fromTo(shake, { x: 0.05, y: 0.03 }, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
    gsap.fromTo(S, { kick: 1 }, { kick: 0, duration: 0.6, ease: 'power3.out' });
    shock.position.z = z;
    gsap.fromTo(shock.scale, { x: part.R * 0.9, y: part.R * 0.9 }, { x: part.R * 2.4, y: part.R * 2.4, duration: 0.7, ease: 'power2.out' });
    gsap.fromTo(shockU.uA, { value: 0.9 }, { value: 0, duration: 0.7, ease: 'power2.out' });
    // sparks spray from the rim where it seated
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      spin.localToWorld(tmpW.set(Math.cos(a) * part.R, Math.sin(a) * part.R, z));
      tmpN.set(Math.cos(a), Math.sin(a), 0).transformDirection(spin.matrixWorld);
      tmpV.copy(tmpN).multiplyScalar(rand(1.2, 3.4)).add(tmpW.set(0, rand(0.3, 1.6), 0));
      spin.localToWorld(tmpW.set(Math.cos(a) * part.R, Math.sin(a) * part.R, z));
      emit(tmpW, tmpV, rand(0.4, 1.0), 0.8);
    }
  };
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  const build = (part, at, wireDur, buildDur) => {
    tl.fromTo(part.P.uWire, { value: 0 }, { value: 1, duration: wireDur, ease: 'none' }, at)
      .fromTo(part.P.uBuild, { value: 0 }, { value: 1, duration: buildDur, ease: 'power1.inOut' }, at + wireDur * 0.85);
  };
  build(parts.ring, 0, 0.08, 0.12);
  tl.to(parts.ring.g.position, { z: home.ring, duration: 0.17 }, 0)
    .to(parts.ring.g.scale, { x: 1, y: 1, z: 1, duration: 0.17 }, 0)
    .to(sweep, { intensity: 22, duration: 0.08 }, 0.02).to(sweep.position, { x: 4, duration: 0.3, ease: 'none' }, 0.02).to(sweep, { intensity: 0, duration: 0.1 }, 0.24);
  build(parts.web, 0.16, 0.07, 0.11);
  tl.to(parts.web.g.position, { z: home.web, duration: 0.15, ease: 'back.out(1.3)' }, 0.18).to(parts.web.g.rotation, { z: 0, duration: 0.16 }, 0.18)
    .add(clunk(parts.web, 0, 60), 0.33);
  build(parts.hub, 0.34, 0.04, 0.12);
  build(parts.bearing, 0.36, 0.04, 0.1);
  tl.to(parts.hub.g.position, { z: home.hub, duration: 0.13, ease: 'back.out(1.2)' }, 0.36)
    .to(parts.bearing.g.position, { z: home.bearing, duration: 0.13, ease: 'back.out(1.2)' }, 0.38)
    .add(clunk(parts.hub, 0.4, 50), 0.49)
    .to(bolts.map((b) => b.scale), { x: 1, y: 1, z: 1, duration: 0.05, stagger: 0.008, ease: 'back.out(3)' }, 0.48);
  build(parts.shaft, 0.52, 0.07, 0.13);
  tl.to(parts.shaft.g.position, { z: home.shaft, duration: 0.15, ease: 'power3.inOut' }, 0.56)
    .add(clunk(parts.shaft, 1.2, 40), 0.71);
  build(parts.f1, 0.7, 0.04, 0.12);
  build(parts.f2, 0.72, 0.04, 0.12);
  tl.to(parts.f1.g.position, { z: home.f1, duration: 0.15, ease: 'back.out(1.1)' }, 0.72)
    .to(parts.f2.g.position, { z: home.f2, duration: 0.15, ease: 'back.out(1.1)' }, 0.74)
    .to(parts.f1.g.rotation, { z: 0, duration: 0.16 }, 0.72)
    .to(parts.f2.g.rotation, { z: 0, duration: 0.16 }, 0.74)
    .add(clunk(parts.f2, -1.3, 50), 0.88)
    .to(rootG.rotation, { x: 0.12, y: -1.02, z: 0.08, duration: 1, ease: 'power2.inOut' }, 0)
    .to(B.uGlow, { value: 1, duration: 0.9, ease: 'power1.inOut' }, 0)
    .to(sweep, { intensity: 18, duration: 0.03 }, 0.9).fromTo(sweep.position, { x: -4 }, { x: 4, duration: 0.1, ease: 'none' }, 0.9).to(sweep, { intensity: 0, duration: 0.03 }, 0.97)
    .to({}, { duration: 0.001 }, 1);

  /* ---------------------------------------------------------------- layout */
  let W = 1, H = 1;
  function size() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H, false);
    composer.setSize(W, H);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    B.uRes.value.set(W * dpr, H * dpr);
    B.uCell.value = Math.round(Math.min(W, H) * 0.055 * dpr);
  }
  size();
  window.addEventListener('resize', size);
  const camZ = () => {
    const a = W / H;
    return a < 1.1 ? Math.min(6.4 / Math.max(a, 0.42), 14) : 7.2; // keep the whole drive in frame on tall screens
  };

  /* ---------------------------------------------------------------- per-frame helpers */
  const centerW = new THREE.Vector3(), ndc = new THREE.Vector3();
  function placeHud() {
    centerW.set(0, 0, 0);
    rootG.localToWorld(centerW);
    ndc.copy(centerW).project(camera);
    const x = (ndc.x * 0.5 + 0.5) * W, y = (-ndc.y * 0.5 + 0.5) * H;
    B.uC.value.set(x / W, 1 - y / H);
    const dist = camera.position.distanceTo(centerW);
    const rpx = (1 / dist) * (H / 2) / Math.tan((camera.fov * Math.PI) / 360);
    const s = rpx * 2 * 1.36;
    hud.style.width = hud.style.height = `${s.toFixed(1)}px`;
    hud.style.transform = `translate(${(x - s / 2).toFixed(1)}px, ${(y - s / 2).toFixed(1)}px)`;
  }
  // the part currently being welded throws sparks off its front and pulls the weld light along
  const frontW = new THREE.Vector3();
  function weldFrame(dt) {
    let active = null;
    for (const p of partList) { const b = p.P.uBuild.value; if (b > 0.02 && b < 0.98) { active = p; break; } }
    if (!active) { weld.intensity += (0 - weld.intensity) * Math.min(1, dt * 8); return; }
    const P = active.P, ax = P.uAxis.value;
    const lvl = P.uMin.value + (P.uMax.value - P.uMin.value) * (P.uBuild.value * 1.12 - 0.06);
    weld.intensity += (2.2 - weld.intensity) * Math.min(1, dt * 8);
    const rate = small ? 90 : 170;
    const n = Math.floor(rate * dt + Math.random());
    for (let i = 0; i < n; i++) {
      if (ax.z > 0.5) {               // along the shaft: a ring of sparks round it
        const a = Math.random() * TAU;
        frontW.set(Math.cos(a) * active.R, Math.sin(a) * active.R, lvl);
      } else {                        // across a disc: the two points where the line meets the rim
        const y = THREE.MathUtils.clamp(lvl, -active.R, active.R);
        const x = Math.sqrt(Math.max(active.R * active.R - y * y, 0)) * (Math.random() < 0.5 ? -1 : 1) * rand(0.7, 1.0);
        frontW.set(x, y, rand(-0.12, 0.12));
      }
      active.g.localToWorld(frontW);
      tmpV.set(rand(-1, 1), rand(0.2, 1.4), rand(-1, 1)).normalize().multiplyScalar(rand(0.8, 2.6));
      emit(frontW, tmpV, rand(0.25, 0.7), 1);
    }
    weld.position.copy(frontW);
  }

  /* ---------------------------------------------------------------- run */
  let p = 0, last = performance.now(), start = last, phase = 'build', raf = 0, skipped = false;
  const stages = [0, 0.18, 0.36, 0.56, 0.72, 0.92];
  const builtAt = [0.17, 0.3, 0.46, 0.46, 0.67, 0.82, 0.84];
  function updateUi() {
    const k = stages.reduce((acc, s, i) => (p >= s ? i : acc), 0);
    log.forEach((li, i) => { li.classList.toggle('is-done', i < k || p >= 0.999); li.classList.toggle('is-active', i === k && p < 0.999); });
    arc.setAttribute('stroke-dasharray', `${(p * 100).toFixed(2)} 100`);
    bar.style.transform = `scaleX(${p.toFixed(4)})`;
    dv.load.textContent = `${String(Math.round(p * 100)).padStart(3, '0')}%`;
    dv.parts.textContent = `${builtAt.filter((b) => p >= b).length} / 7`;
  }
  function frame(now) {
    const realDt = Math.min((now - last) / 1000, 0.25);
    const dt = Math.min(realDt, 0.05);
    last = now;
    D.uTime.value += dt;
    B.uTime.value = D.uTime.value;
    SU.uNow.value += dt;
    if (phase === 'build') {
      const timeCap = Math.min(1, (now - start) / 1000 / minDuration);
      const target = skipped ? 1 : Math.min(getProgress(), timeCap);
      p += (target - p) * (1 - Math.exp(-realDt * (skipped ? 12 : 3.4))) + realDt * 0.002;
      p = Math.min(p, target);
      if (target >= 1 && p > 0.996) p = 1;
      tl.progress(p);
      num.textContent = String(Math.round(p * 100)).padStart(3, '0');
      updateUi();
      if (p >= 1) { phase = 'hold'; finish(); }
    }
    spin.rotation.z -= dt * S.spinV;
    // readouts
    const rpm = Math.round(S.spinV * 9.55 * 60);
    dv.rpm.textContent = String(rpm).padStart(4, '0');
    S.temp += ((21 + weld.intensity * 290 + S.spinV * 40) - S.temp) * Math.min(1, dt * 2);
    dv.temp.textContent = `${String(Math.round(S.temp)).padStart(4, '0')}°C`;
    degEl.textContent = String(Math.round(((-spin.rotation.z * 180) / Math.PI) % 360 + 360) % 360).padStart(3, '0');

    weldFrame(dt);
    if (S.spinV > 2) {               // spinning up: sparks fly off the teeth
      const n = Math.floor(S.spinV * 14 * dt * (small ? 0.6 : 1) + Math.random());
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        spin.localToWorld(tmpW.set(Math.cos(a), Math.sin(a), rand(-0.17, 0.17)));
        tmpN.set(-Math.sin(a), Math.cos(a), 0).transformDirection(spin.matrixWorld).multiplyScalar(-S.spinV * 0.55);
        emit(tmpW, tmpN.add(tmpV.set(0, rand(0, 0.8), 0)), rand(0.3, 0.8), 1);
      }
    }
    // exploded view during the exit
    if (S.explode > 0) {
      const e = S.explode;
      parts.f1.g.position.z = home.f1 + e * 2.2; parts.f2.g.position.z = home.f2 - e * 2.2;
      parts.hub.g.position.z = home.hub + e * 1.2; parts.bearing.g.position.z = home.bearing - e * 1.2;
      parts.shaft.g.position.z = home.shaft + e * 0.6;
      parts.web.g.scale.setScalar(1 + e * 0.25); parts.ring.g.scale.setScalar(1 + e * 0.45);
    }

    const cz = camZ();
    const z = cz - p * 0.6 - S.push * (cz - 0.35) - S.kick * 0.18;
    camera.position.set(shake.x * Math.sin(D.uTime.value * 60), 0.25 + Math.sin(D.uTime.value * 0.4) * 0.04 + shake.y * Math.cos(D.uTime.value * 55), z);
    camera.fov = S.fov; camera.updateProjectionMatrix();
    camera.lookAt(0, (W < 900 ? -0.45 : -0.05) * (1 - S.push), 0);
    partList.forEach((pt) => { pt.g.updateMatrixWorld(); pt.P.uPartInv.value.copy(pt.g.matrixWorld).invert(); });
    if (sDirty) {
      ['aP0', 'aV', 'aBirth', 'aLife', 'aHeat'].forEach((k) => { sg.attributes[k].needsUpdate = true; });
      sDirty = false;
    }
    placeHud();
    composer.render(dt);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  function finish() {
    const fast = skipped || quick;
    const t = gsap.timeline({ delay: fast ? 0.05 : 0.35 });
    partList.forEach((pt) => { gsap.to(pt.P.uWireA, { value: 0, duration: 0.4 }); });
    hud.classList.add('is-complete');
    jpEl.textContent = '完了';
    t.to(S, { spinV: 11, duration: fast ? 0.5 : 1.05, ease: 'power2.in' }, 0)
      .to(B.uGreen, { value: 0.7, duration: 0.8, ease: 'power1.out' }, 0)
      .to(rim.color, { r: 0.55, g: 1, b: 0.5, duration: 0.8 }, 0)
      .to(root.querySelectorAll('.loader__top, .loader__bottom, .loader__log, .loader__skip, .loader__data, .loader__bar'), { opacity: 0, y: 10, duration: 0.45, ease: 'power2.in' }, fast ? 0 : 0.35)
      .to(hud, { opacity: 0, scale: 1.25, duration: 0.6, ease: 'power2.in' }, fast ? 0.1 : 0.5)
      .to(S, { explode: 1, duration: 1.2, ease: 'power3.in' }, fast ? 0.15 : 0.6)
      .to(D.uDissolve, { value: 1, duration: fast ? 0.9 : 1.4, ease: 'power1.inOut' }, fast ? 0.2 : 0.65)
      .to(S, { push: 1, fov: 52, duration: fast ? 0.9 : 1.35, ease: 'power3.in' }, fast ? 0.2 : 0.65)
      .add(() => burst(rootG.localToWorld(tmpW.set(0, 0, 0)), small ? 120 : 260, 4.2, 1.2, 1), fast ? 0.6 : 1.25)
      .fromTo(flash, { opacity: 0 }, { opacity: 0.85, duration: 0.18, ease: 'power2.in' }, fast ? 0.75 : 1.5)
      .add(onReveal, fast ? 0.8 : 1.55)
      .to(flash, { opacity: 0, duration: 0.7, ease: 'power2.out' }, fast ? 0.95 : 1.7)
      .to(canvas, { opacity: 0, duration: 0.6, ease: 'power1.out' }, fast ? 0.85 : 1.6)
      .to(root, { backgroundColor: 'rgba(5,4,4,0)', duration: 0.6, ease: 'power1.out' }, fast ? 0.85 : 1.6)
      .add(() => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', size);
        window.removeEventListener('keydown', onKey);
        scene.traverse((o) => { o.geometry?.dispose?.(); });
        allMats.forEach((m) => m.dispose());
        wireMats.forEach((m) => m.dispose());
        composer.dispose?.();
        rt.dispose();
        env.dispose(); pmrem.dispose();
        renderer.dispose();
        renderer.forceContextLoss?.();
        hud.remove(); data.remove(); bar.remove(); flash.remove();
        onDone();
      });
  }
  const skip = () => { skipped = true; };
  skipBtn?.addEventListener('click', skip);
  const onKey = (e) => { if (['Escape', 'Enter', ' '].includes(e.key)) skip(); };
  window.addEventListener('keydown', onKey);
}
