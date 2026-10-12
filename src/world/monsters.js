import * as THREE from 'three';
import { createKit } from './kit.js';
import { blob, smooth } from '../naso/geom.js';

// 森の魔物（すべてオリジナル）。正面が +z、足元が y=0。
const INK = '#2a1d14';

function eyes(kit, parent, y, z, gap, r = 0.05, sleepy = false) {
  const shine = kit.track(new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  for (const s of [-1, 1]) {
    kit.part(parent, new THREE.SphereGeometry(r, 10, 8), INK, { pos: [s * gap, y, z], scl: [1, sleepy ? 0.45 : 1.1, 0.6], outline: 0 });
    if (!sleepy) kit.part(parent, new THREE.SphereGeometry(r * 0.35, 6, 5), shine, { pos: [s * gap + r * 0.3, y + r * 0.35, z + r * 0.35], outline: 0 });
  }
}
function smile(kit, parent, y, z, w = 0.07, grin = false) {
  const g = new THREE.TorusGeometry(w, grin ? 0.016 : 0.012, 6, 16, Math.PI);
  kit.part(parent, g, INK, { pos: [0, y, z], rot: [0, 0, Math.PI], outline: 0 });
}

const BUILD = {
  // こけだま：ころころの こけの玉。頭に芽
  moss(kit, b) {
    kit.part(b, blob({ a: 0.38, b: 0.33, c: 0.36, p: 2.1, ws: 24, hs: 16 }), '#7fae4a', { pos: [0, 0.33, 0] });
    [[0.25, 0.45, 0.15], [-0.28, 0.3, 0.12], [0.1, 0.58, -0.2], [-0.15, 0.2, -0.28], [0.3, 0.2, -0.1]].forEach(([x, y, z]) =>
      kit.part(b, new THREE.SphereGeometry(0.07, 8, 6), '#69983c', { pos: [x, y, z], outline: 0 }));
    eyes(kit, b, 0.38, 0.32, 0.11);
    smile(kit, b, 0.27, 0.34, 0.05);
    kit.part(b, new THREE.CylinderGeometry(0.015, 0.02, 0.12, 5), '#5f9a4a', { pos: [0, 0.71, 0], outline: 0.5 });
    for (const s of [-1, 1]) kit.part(b, blob({ a: 0.06, b: 0.03, c: 0.035, p: 2, ws: 10, hs: 6 }), '#8cc76a', { pos: [s * 0.05, 0.77, 0], rot: [0, 0, s * 0.4], outline: 0.5 });
  },
  // どんぐりこぞう：小えだを持った どんぐり
  acornkid(kit, b) {
    kit.part(b, blob({ a: 0.26, b: 0.3, c: 0.25, p: 2.1, ws: 20, hs: 14 }), '#c48a4a', { pos: [0, 0.36, 0] });
    kit.part(b, new THREE.SphereGeometry(0.28, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#7a5230', { pos: [0, 0.48, 0], scl: [1, 0.6, 1] });
    kit.part(b, new THREE.CylinderGeometry(0.02, 0.03, 0.12, 6), '#5a3a20', { pos: [0, 0.68, 0], outline: 0.5 });
    eyes(kit, b, 0.38, 0.23, 0.09, 0.045);
    smile(kit, b, 0.29, 0.25, 0.04, true);
    for (const s of [-1, 1]) kit.part(b, new THREE.SphereGeometry(0.07, 8, 6), '#7a5230', { pos: [s * 0.11, 0.06, 0.04], scl: [1, 0.7, 1.3] });
    kit.part(b, new THREE.CylinderGeometry(0.018, 0.024, 0.42, 5), '#8a5a3a', { pos: [0.3, 0.36, 0.08], rot: [0.3, 0, -0.5], outline: 0.6 });
  },
  // いたずらキノコ：にやにや笑う きのこ
  trick(kit, b) {
    kit.part(b, new THREE.CylinderGeometry(0.15, 0.2, 0.42, 14), '#f2e6d0', { pos: [0, 0.21, 0] });
    kit.part(b, new THREE.SphereGeometry(0.4, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), '#d9573f', { pos: [0, 0.4, 0], scl: [1, 0.75, 1] });
    [[0.2, 0.55, 0.22], [-0.22, 0.52, 0.18], [0.0, 0.66, 0.0], [0.15, 0.5, -0.28], [-0.25, 0.48, -0.15]].forEach(([x, y, z]) =>
      kit.part(b, new THREE.SphereGeometry(0.06, 8, 6), '#fff8ec', { pos: [x, y, z], scl: [1, 0.5, 1], outline: 0 }));
    eyes(kit, b, 0.3, 0.18, 0.07, 0.04);
    smile(kit, b, 0.2, 0.19, 0.06, true);
  },
  // ねぼけフクロウ：いつも ねむそう
  owl(kit, b) {
    kit.part(b, blob({ a: 0.32, b: 0.38, c: 0.3, p: 2.1, ws: 22, hs: 16 }), '#8a6a4a', { pos: [0, 0.42, 0] });
    kit.part(b, blob({ a: 0.22, b: 0.26, c: 0.08, p: 2, ws: 16, hs: 12 }), '#d9c29a', { pos: [0, 0.36, 0.24], outline: 0.5 });
    for (const s of [-1, 1]) {
      kit.part(b, new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16), '#fbf8f0', { pos: [s * 0.12, 0.56, 0.27], rot: [Math.PI / 2, 0, 0], outline: 0.6 });
      kit.part(b, new THREE.SphereGeometry(0.105, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), '#7a5a3a', { pos: [s * 0.12, 0.56, 0.28], rot: [Math.PI / 2 + 0.15, 0, 0], scl: [1, 1, 0.3], outline: 0 });
      kit.part(b, new THREE.SphereGeometry(0.035, 8, 6), INK, { pos: [s * 0.12, 0.53, 0.29], scl: [1, 0.6, 0.5], outline: 0 });
      kit.part(b, new THREE.ConeGeometry(0.06, 0.16, 6), '#7a5a3a', { pos: [s * 0.2, 0.83, 0], rot: [0, 0, -s * 0.35] });
      kit.part(b, blob({ a: 0.08, b: 0.22, c: 0.16, p: 2.2, ws: 12, hs: 10 }), '#6e5238', { pos: [s * 0.32, 0.4, -0.02], rot: [0, 0, s * 0.2] });
      kit.part(b, new THREE.SphereGeometry(0.05, 8, 6), '#e8a23a', { pos: [s * 0.1, 0.04, 0.08], scl: [1, 0.6, 1.4] });
    }
    kit.part(b, new THREE.ConeGeometry(0.04, 0.09, 6), '#e8a23a', { pos: [0, 0.47, 0.32], rot: [Math.PI / 2 + 0.6, 0, 0], outline: 0.6 });
  },
};

export class Monster {
  constructor(type) {
    this.type = type;
    this.kit = createKit('toon');
    this.root = this.kit.group(null, 'mon-' + type);
    this.body = this.kit.group(this.root, 'body');
    BUILD[type](this.kit, this.body);
    this.mats = [];
    this.body.traverse((o) => { if (o.isMesh && o.material.emissive && !this.mats.includes(o.material)) this.mats.push(o.material); });
    this.t = Math.random() * 3;
    this.act = { name: 'appear', t: 0 };
    this.root.scale.setScalar(0.001);
  }
  play(name) {
    this.act = { name, t: 0 };
  }
  faceTo(x, z) {
    this.root.rotation.y = Math.atan2(x - this.root.position.x, z - this.root.position.z);
  }
  update(dt) {
    this.t += dt;
    const a = this.act;
    a.t += dt;
    const b = this.body;
    b.position.set(0, 0, 0);
    b.rotation.set(0, 0, 0);
    const bob = Math.abs(Math.sin(this.t * (this.type === 'owl' ? 2 : 5)));
    b.position.y = 0.05 * bob;
    b.scale.set(1 + 0.04 * (1 - bob), 1 - 0.05 * (1 - bob), 1 + 0.04 * (1 - bob));
    let flash = 0;
    if (a.name === 'appear') {
      const u = Math.min(1, a.t / 0.45);
      this.root.scale.setScalar(Math.max(0.001, smooth(0, 0.6, u) * (1 + 0.2 * Math.sin(Math.PI * u))));
      if (u >= 1) { this.root.scale.setScalar(1); a.name = 'idle'; }
    } else if (a.name === 'attack') {
      const u = Math.min(1, a.t / 0.7);
      b.position.z = 0.7 * Math.sin(Math.PI * u);
      b.rotation.x = 0.25 * Math.sin(Math.PI * u);
      if (u >= 1) a.name = 'idle';
    } else if (a.name === 'hurt') {
      const u = Math.min(1, a.t / 0.5);
      b.position.x = 0.07 * Math.sin(a.t * 60) * (1 - u);
      b.position.z = -0.15 * Math.sin(Math.PI * u);
      flash = a.t < 0.14 ? 1 : 0;
      if (u >= 1) a.name = 'idle';
    } else if (a.name === 'sleep') {
      b.rotation.z = 0.25 * Math.sin(this.t * 1.5);
    } else if (a.name === 'die') {
      const u = Math.min(1, a.t / 0.7);
      b.rotation.y = u * 8;
      b.position.y = 0.4 * u;
      this.root.scale.setScalar(Math.max(0.001, 1 - u));
      flash = 0.6;
    } else if (a.name === 'leave') {
      const u = Math.min(1, a.t / 0.6);
      b.position.z = -1.5 * u;
      this.root.scale.setScalar(Math.max(0.001, 1 - u));
    }
    for (const m of this.mats) m.emissive.setScalar(flash * 0.8);
  }
  get gone() {
    return (this.act.name === 'die' && this.act.t > 0.7) || (this.act.name === 'leave' && this.act.t > 0.6);
  }
  dispose() {
    this.root.removeFromParent();
    this.kit.dispose();
  }
}
