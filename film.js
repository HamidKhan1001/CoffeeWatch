import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

/* Real-time 3D film: photoscanned CC0 models (Khronos/Poly Haven teacup, Poly Haven vintage kettle),
   HDRI studio lighting, soft shadows, camera flown along a spline by scroll position. */
const wrap = document.getElementById('film');
const emit = (n, d) => window.dispatchEvent(new CustomEvent(n, { detail: d }));
const manager = new THREE.LoadingManager();
manager.onProgress = (_u, l, t) => emit('film-progress', t ? l / t : 0);
manager.onError = u => { console.warn('asset failed', u); if (/\.(glb|gltf|hdr)$/.test(u)) emit('film-fail'); };
const canvas = document.getElementById('filmCanvas');
const params = new URLSearchParams(location.search);
const debugP = params.has('p') ? parseFloat(params.get('p')) : null;

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); }
catch (e) { wrap.classList.add('no-gl'); emit('film-fail'); throw e; }
const small = Math.min(innerWidth, innerHeight) < 700;
renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const BG = new THREE.Color(0x14090a);
const scene = new THREE.Scene();
scene.background = BG;
scene.fog = new THREE.Fog(BG, 1.3, 3.3);
const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 20);

/* Lighting: HDRI for reflections + one warm key for crisp soft shadows */
new RGBELoader(manager).load('assets/models/studio.hdr', tex => {
  tex.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromEquirectangular(tex).texture; tex.dispose(); pm.dispose();
});
scene.environmentIntensity = 0.55;
const key = new THREE.DirectionalLight(0xffd7a8, 3.2);
key.position.set(0.6, 1.1, 0.5);
key.castShadow = true;
key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
Object.assign(key.shadow.camera, { left: -0.7, right: 0.7, top: 0.7, bottom: -0.7, near: 0.1, far: 3 });
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.004; key.shadow.radius = 6;
scene.add(key);
const rim = new THREE.DirectionalLight(0xff8a45, 1.6); rim.position.set(-0.8, 0.5, -0.8); scene.add(rim);
scene.add(new THREE.HemisphereLight(0x6b4b3a, 0x120907, 0.35));

/* Ground: dark walnut-ish counter with a soft radial falloff */
const gtex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#3a2216'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(${20 + Math.random() * 30},${10 + Math.random() * 14},6,${0.08 + Math.random() * 0.14})`; g.lineWidth = 1 + Math.random() * 4; g.beginPath(); const y = Math.random() * 512; g.moveTo(0, y); g.bezierCurveTo(170, y + (Math.random() - .5) * 40, 340, y + (Math.random() - .5) * 40, 512, y + (Math.random() - .5) * 20); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.anisotropy = 8; return t;
})();
const ground = new THREE.Mesh(new THREE.CircleGeometry(8, 64), new THREE.MeshStandardMaterial({ map: gtex, roughness: 0.42, metalness: 0.0 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

/* Floating dust in the light beam */
const dust = (() => {
  const n = 160, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = (Math.random() - .5) * 1.4; a[i * 3 + 1] = Math.random() * 0.8; a[i * 3 + 2] = (Math.random() - .5) * 1.4; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const r = x.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(255,230,190,1)'); r.addColorStop(1, 'rgba(255,230,190,0)'); x.fillStyle = r; x.fillRect(0, 0, 32, 32);
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.006, map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(p); return p;
})();

/* Steam: soft noise sprites rising from the coffee */
const smokeTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  for (let i = 0; i < 26; i++) { const x = 64 + (Math.random() - .5) * 50, y = 64 + (Math.random() - .5) * 50, r = 14 + Math.random() * 26; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  return new THREE.CanvasTexture(c);
})();
const steam = [];
const steamGroup = new THREE.Group(); scene.add(steamGroup);
for (let i = 0; i < 18; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0, color: 0xfff1e0 }));
  s.userData = { t: Math.random(), sp: 0.07 + Math.random() * 0.05, ph: Math.random() * 6.28, ox: (Math.random() - .5) * 0.03, oz: (Math.random() - .5) * 0.03 };
  steamGroup.add(s); steam.push(s);
}

/* Models */
const loader = new GLTFLoader(manager);
const cupRoot = new THREE.Group(); scene.add(cupRoot);
const kettleRoot = new THREE.Group(); scene.add(kettleRoot);
let coffeeTopY = 0.056, cupReady = false, coffeeBuilt = false;
manager.itemStart('latte'); const latteImg = new Image(); latteImg.src = 'assets/latte_surface.jpg'; latteImg.onload = () => { manager.itemEnd('latte'); buildCoffee(); }; latteImg.onerror = () => { manager.itemEnd('latte'); coffeeBuilt = true; checkReady(); };

function prep(root, upgrade) {
  root.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    if (upgrade) o.material = upgrade(o.material);
  });
}
const physical = (old, extra) => {
  const m = new THREE.MeshPhysicalMaterial(Object.assign({
    color: old.color, map: old.map, normalMap: old.normalMap, aoMap: old.aoMap, roughnessMap: old.roughnessMap, metalnessMap: old.metalnessMap,
    roughness: old.roughness, metalness: old.metalness,
  }, extra));
  m.envMapIntensity = 1.0; return m;
};

loader.load('assets/models/teacup.glb', gltf => {
  const m = gltf.scene; prep(m, old => physical(old, { clearcoat: 0.7, clearcoatRoughness: 0.08, roughness: 0.28, metalness: 0 }));
  cupRoot.add(m);
  const box = new THREE.Box3().setFromObject(m); coffeeTopY = box.max.y - 0.013;
  cupReady = true; buildCoffee(); markLoaded();
});
loader.load('assets/models/kettle/kettle.gltf', gltf => {
  const m = gltf.scene; prep(m, old => { old.envMapIntensity = 1.1; return old; });
  const box = new THREE.Box3().setFromObject(m); const h = box.max.y - box.min.y;
  m.scale.setScalar(0.27 / h); m.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(m); m.position.y -= b2.min.y; m.position.x -= (b2.min.x + b2.max.x) / 2; m.position.z -= (b2.min.z + b2.max.z) / 2;
  kettleRoot.add(m); kettleRoot.position.set(-0.5, 0, 0.05); kettleRoot.rotation.y = 0.9;
  markLoaded();
});

/* Coffee surface cut from the real latte photo, edge-feathered */
function buildCoffee() {
  if (coffeeBuilt || !cupReady || !latteImg.complete || !latteImg.naturalWidth) return;
  coffeeBuilt = true; const img = latteImg;
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.drawImage(img, 0, 0, 512, 512);
  g.globalCompositeOperation = 'destination-in';
  const r = g.createRadialGradient(256, 256, 190, 256, 256, 256); r.addColorStop(0, '#fff'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const base = new THREE.Mesh(new THREE.CircleGeometry(0.0485, 64), new THREE.MeshStandardMaterial({ color: 0x4a2412, roughness: 0.15, metalness: 0 }));
  const top = new THREE.Mesh(new THREE.CircleGeometry(0.0485, 64), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.22, metalness: 0 }));
  for (const s of [base, top]) { s.rotation.x = -Math.PI / 2; s.rotation.z = Math.PI; s.position.y = coffeeTopY; cupRoot.add(s); }
  top.position.y += 0.0002; top.receiveShadow = true; base.receiveShadow = true;
  checkReady();
}

let loaded = 0;
let envReady = false, firstFrame = false;
function markLoaded() { ++loaded; checkReady(); }
function checkReady() {
  if (loaded >= 2 && coffeeBuilt && firstFrame && !wrap.classList.contains('ready')) { wrap.classList.add('ready'); window.__ready = true; emit('film-progress', 1); emit('film-ready'); }
}

/* Camera path: positions + look targets (meters). Tuned against the real model scale. */
const P = [
  [0.12, 0.2, 0.22], [0.02, 0.22, 0.14], [-0.17, 0.065, 0.12], [-0.2, 0.14, 0.6],
  [-0.38, 0.25, 0.45], [-0.33, 0.17, 0.35], [-0.12, 0.3, 0.95],
].map(a => new THREE.Vector3(...a));
const T = [
  [-0.05, 0.035, 0.0], [-0.04, 0.05, 0.0], [-0.05, 0.04, -0.02], [-0.25, 0.08, 0.02],
  [-0.5, 0.14, 0.05], [-0.5, 0.14, 0.05], [-0.25, 0.1, 0.0],
].map(a => new THREE.Vector3(...a));
const posCurve = new THREE.CatmullRomCurve3(P, false, 'catmullrom', 0.5);
const tgtCurve = new THREE.CatmullRomCurve3(T, false, 'catmullrom', 0.5);

/* Scroll state */
const panels = [...document.querySelectorAll('.film-panel')];
const bar = document.getElementById('filmBar');
let target = 0, smooth = 0;
function readScroll() {
  const r = wrap.getBoundingClientRect(); const span = r.height - innerHeight;
  target = Math.min(1, Math.max(0, -r.top / span));
  if (debugP !== null) target = debugP;
}
addEventListener('scroll', readScroll, { passive: true });
let portrait = false, pullBack = 1;
function resize() {
  const w = wrap.clientWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
  portrait = w / h < 0.9; pullBack = portrait ? 1 + (1 - w / h) * 1.5 : 1;
  camera.fov = portrait ? 40 : 32;
  if (portrait) camera.setViewOffset(w, h, 0, h * 0.17, w, h); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize(); readScroll(); smooth = target;

const clock = new THREE.Clock(); const tmp = new THREE.Vector3(), look = new THREE.Vector3();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  smooth += (target - smooth) * (debugP !== null ? 1 : 1 - Math.pow(0.0008, dt));
  const p = Math.min(0.9999, Math.max(0, smooth));
  posCurve.getPoint(p, camera.position); tgtCurve.getPoint(p, look);
  camera.position.x += Math.sin(t * 0.35) * 0.004; camera.position.y += Math.cos(t * 0.3) * 0.003;
  if (portrait) look.x += 0.05 * (1 - Math.min(1, Math.max(0, (p - 0.2) / 0.2)));
  if (portrait) { camera.position.sub(look).multiplyScalar(pullBack).add(look); }
  camera.lookAt(look);

  steam.forEach(s => { const d = s.userData; d.t += dt * d.sp; if (d.t > 1) d.t = 0;
    s.position.set(d.ox + Math.sin(t * 0.8 + d.ph) * 0.012 * d.t, coffeeTopY + 0.01 + d.t * 0.17, d.oz + Math.cos(t * 0.6 + d.ph) * 0.01 * d.t);
    const sc = 0.04 + d.t * 0.11; s.scale.set(sc, sc, 1); s.material.opacity = Math.sin(d.t * Math.PI) * 0.34; s.material.rotation = d.ph + t * 0.1; });
  dust.rotation.y = t * 0.02; dust.position.y = Math.sin(t * 0.2) * 0.02;

  panels.forEach(el => { const a = +el.dataset.a, b = +el.dataset.b; const m = Math.min(smooth - a, b - smooth); const v = Math.max(0, Math.min(1, m * 14)); el.style.opacity = v; el.style.transform = `translateY(${(1 - v) * 28}px)`; el.style.pointerEvents = v > 0.5 ? 'auto' : 'none'; });
  bar.style.width = (smooth * 100) + '%';
  renderer.render(scene, camera);
  if (!firstFrame) { firstFrame = true; checkReady(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
