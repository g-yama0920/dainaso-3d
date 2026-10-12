import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { outlineUniforms } from './naso/materials.js';
import { smooth } from './naso/geom.js';

// 3Dの舞台：描画・カメラ（箱庭を外からながめる）・光・タップ判定。
// 電池と発熱のため、ふだんは30fps。さわっている間やバトル中だけ60fpsにする。
const POLAR = 0.88; // 真上から測ったカメラの角度（約40°見下ろす）

export class Stage {
  constructor(canvas, app) {
    this.canvas = canvas;
    this.app = app; // 背景の色を変える要素
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 120);
    const c = (this.controls = new OrbitControls(this.camera, canvas));
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.enablePan = false;
    c.minPolarAngle = 0.35;
    c.maxPolarAngle = 1.42;
    c.rotateSpeed = 0.8;
    c.zoomSpeed = 0.9;
    c.addEventListener('start', () => { this.touching = true; this.wake(1500); });
    c.addEventListener('end', () => { this.touching = false; this.wake(1500); });
    this.hemi = new THREE.HemisphereLight('#ffffff', '#cfd3de', 1.35);
    this.sun = new THREE.DirectionalLight('#ffffff', 1.9);
    this.sun.position.set(-4, 8, 6);
    this.scene.add(this.hemi, this.sun);
    this.world = null;
    this.R = 3;
    this.fit = 20;
    this.tween = null;
    this.hiUntil = 0;
    this.hiFps = false;
    this.frameFns = [];
    this.clock = new THREE.Clock();
    this.time = 0;
    this.last = 0;
    this.ray = new THREE.Raycaster();
    new ResizeObserver(() => this.resize()).observe(canvas);
  }

  wake(ms = 1200) {
    this.hiUntil = Math.max(this.hiUntil, performance.now() + ms);
  }

  setWorld(d) {
    if (this.world) this.world.dispose();
    this.world = d;
    this.scene.add(d.group);
    this.R = d.R;
    this.resize();
    this.resetView(true);
  }

  computeFit() {
    const t = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    const w = 2 * this.R + 0.1, h = 2 * this.R + 1.6; // 島ぜんたいが見えるように
    return Math.max(h / (2 * t), w / (2 * t * this.camera.aspect));
  }

  resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    outlineUniforms.uResolution.value.set(w, h);
    const old = this.fit;
    this.fit = this.computeFit();
    this.controls.minDistance = this.fit * 0.3;
    this.controls.maxDistance = this.fit * 1.35;
    if (!this.tween && old) {
      const off = this.camera.position.clone().sub(this.controls.target).multiplyScalar(this.fit / old);
      this.camera.position.copy(this.controls.target).add(off);
    }
    this.wake(300);
  }

  // 箱庭全体が見える、いつもの向き
  resetView(instant = false) {
    this.focus({ target: new THREE.Vector3(0, 0.5, 0), dist: this.fit, polar: POLAR, theta: 0 }, instant ? 0 : 0.8);
  }

  // カメラを動かす（バトルで寄るときなど）
  focus({ target, dist, polar = POLAR, theta }, dur = 0.8) {
    const c = this.controls;
    const from = { target: c.target.clone(), sph: new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(c.target)) };
    const to = { target: target.clone(), sph: new THREE.Spherical(dist, polar, theta === undefined ? from.sph.theta : theta) };
    let dT = (to.sph.theta - from.sph.theta) % (Math.PI * 2);
    if (dT > Math.PI) dT -= Math.PI * 2;
    if (dT < -Math.PI) dT += Math.PI * 2;
    if (dur <= 0) {
      c.target.copy(to.target);
      this.camera.position.setFromSpherical(to.sph).add(c.target);
      c.update();
      this.tween = null;
    } else {
      this.tween = { from, to, dT, t: 0, dur };
    }
    this.wake(dur * 1000 + 400);
  }

  // バトルで寄ったとき、カメラと戦いの間にある木や岩を消す（手前で隠れないように）
  hideBetween(target, camPos) {
    this.hidden = [];
    const w = this.world;
    if (!w || !w.occluders) return;
    const ax = camPos.x, az = camPos.z, bx = target.x, bz = target.z;
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    for (const o of w.occluders) {
      const { x, z, r } = o.userData.occ;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      const d = Math.hypot(ax + dx * t - x, az + dz * t - z);
      if (d < r + 0.45 && t < 0.97) { o.visible = false; this.hidden.push(o); }
    }
  }
  showAll() {
    (this.hidden || []).forEach((o) => { o.visible = true; });
    this.hidden = [];
  }
  // focus() で動いた先のカメラの位置
  focusEnd() {
    const tw = this.tween;
    if (!tw) return this.camera.position.clone();
    return new THREE.Vector3().setFromSpherical(new THREE.Spherical(tw.to.sph.radius, tw.to.sph.phi, tw.from.sph.theta + tw.dT)).add(tw.to.target);
  }

  // 時間帯と天気で、光と空の色を変える
  setAmbience({ band, weather }) {
    const L = {
      0: { sky: ['#232b4a', '#3d3f60'], sun: ['#9fb0ff', 0.7], hemi: ['#8f9ccc', '#5a5a7a', 1.0] },
      1: { sky: ['#f7d9bd', '#f4ecdc'], sun: ['#ffe6c4', 1.7], hemi: ['#ffffff', '#d6d2d8', 1.3] },
      2: { sky: ['#cfe7f4', '#f3ecd9'], sun: ['#ffffff', 1.9], hemi: ['#ffffff', '#cfd3de', 1.35] },
      3: { sky: ['#f2b88a', '#f2dcbc'], sun: ['#ffb37a', 1.6], hemi: ['#ffe0c0', '#cfc6cc', 1.2] },
      4: { sky: ['#2b3456', '#4a4a6a'], sun: ['#a8b8ff', 0.75], hemi: ['#9aa6d4', '#5a5a7a', 1.05] },
    }[band];
    let sun = L.sun[1], hemi = L.hemi[2], sky = L.sky.slice();
    if (weather === 'cloudy') { sun *= 0.55; hemi += 0.2; sky = sky.map((x) => mix(x, '#c9ccd2', 0.45)); }
    if (weather === 'rain') { sun *= 0.4; hemi += 0.12; sky = sky.map((x) => mix(x, '#8e9cab', 0.6)); }
    if (weather === 'snow') { sun *= 0.5; hemi += 0.2; sky = sky.map((x) => mix(x, '#dfe7ee', 0.6)); }
    this.sun.color.set(L.sun[0]);
    this.sun.intensity = sun;
    this.hemi.color.set(L.hemi[0]);
    this.hemi.groundColor.set(L.hemi[1]);
    this.hemi.intensity = hemi;
    this.app.style.setProperty('--sky-top', sky[0]);
    this.app.style.setProperty('--sky-bottom', sky[1]);
    this.app.dataset.dark = band === 0 || band === 4 ? '1' : '0';
    this.wake(300);
  }

  pick(clientX, clientY, objects) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    return this.ray.intersectObjects(objects, true);
  }

  // 3Dの位置 → 画面の位置（CSS px）
  project(v) {
    const p = v.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * this.canvas.clientWidth, y: (-p.y * 0.5 + 0.5) * this.canvas.clientHeight, behind: p.z > 1 };
  }

  onFrame(fn) {
    this.frameFns.push(fn);
  }

  start() {
    const loop = (now) => {
      requestAnimationFrame(loop);
      const hi = this.hiFps || this.touching || now < this.hiUntil || this.tween;
      if (!hi && now - this.last < 1000 / 30 - 3) return;
      this.last = now;
      const dt = Math.min(this.clock.getDelta(), 0.06);
      this.time += dt;
      if (this.tween) this.stepTween(dt);
      this.controls.update();
      for (const f of this.frameFns) f(dt, this.time);
      if (this.world) this.world.update(dt, this.time);
      const dist = this.camera.position.distanceTo(this.controls.target);
      const pxPerUnit = this.canvas.clientHeight / (2 * dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2));
      outlineUniforms.uOutlinePx.value = THREE.MathUtils.clamp(pxPerUnit * 0.0135, 1.0, 4.2);
      this.renderer.render(this.scene, this.camera);
    };
    requestAnimationFrame(loop);
  }

  // 確認用：時間を早送りする（画面が裏にあって描画が止まっているときに使う）
  simulate(sec, dt = 0.05) {
    for (let i = 0; i < Math.round(sec / dt); i++) {
      this.time += dt;
      if (this.tween) this.stepTween(dt);
      for (const f of this.frameFns) f(dt, this.time);
      if (this.world) this.world.update(dt, this.time);
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  stepTween(dt) {
    const tw = this.tween;
    tw.t = Math.min(1, tw.t + dt / tw.dur);
    const k = smooth(0, 1, tw.t), f = tw.from, to = tw.to, c = this.controls;
    c.target.lerpVectors(f.target, to.target, k);
    const s = new THREE.Spherical(
      f.sph.radius + (to.sph.radius - f.sph.radius) * k,
      f.sph.phi + (to.sph.phi - f.sph.phi) * k,
      f.sph.theta + tw.dT * k,
    );
    this.camera.position.setFromSpherical(s).add(c.target);
    if (tw.t >= 1) this.tween = null;
  }
}

function mix(a, b, k) {
  return '#' + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString();
}
