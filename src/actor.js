import * as THREE from 'three';
import { shadowTexture } from './naso/textures.js';

// なそを箱庭の上で歩かせる係。プレイヤーは直接操作しない（なそが自分で歩き回る）。
export const NASO_SCALE = 0.72; // 箱庭の中では少し小さく（家や木とのつりあい）

export class Actor {
  constructor(naso, scene) {
    this.naso = naso;
    this.obj = naso.root;
    this.obj.scale.setScalar(NASO_SCALE);
    this.target = null;
    this.cb = null;
    this.speed = 0.95;
    this.heading = 0;
    this.want = null; // 向きたい角度
    const sm = (this.shadowMat = new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, toneMapped: false }));
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.95), sm);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.raycast = () => {};
    scene.add(this.obj, this.shadow);
  }
  get x() { return this.obj.position.x; }
  get z() { return this.obj.position.z; }

  place(x, z, heading = 0) {
    this.obj.position.set(x, 0, z);
    this.heading = heading;
    this.want = null;
    this.target = null;
    this.cb = null;
  }
  walkTo(x, z, cb) {
    this.target = { x, z };
    this.cb = cb || null;
    if (this.naso.action !== 'walk') this.naso.play('walk');
  }
  stop(clip = 'idle') {
    this.target = null;
    this.cb = null;
    if (clip) this.naso.play(clip);
  }
  face(x, z) {
    this.want = Math.atan2(x - this.x, z - this.z);
  }
  get moving() {
    return !!this.target;
  }

  update(dt) {
    if (this.target) {
      const dx = this.target.x - this.x, dz = this.target.z - this.z, d = Math.hypot(dx, dz);
      if (d < 0.05) {
        const cb = this.cb;
        this.target = null;
        this.cb = null;
        this.naso.play('idle');
        if (cb) cb();
      } else {
        const step = Math.min(d, this.speed * dt);
        this.obj.position.x += (dx / d) * step;
        this.obj.position.z += (dz / d) * step;
        this.want = Math.atan2(dx, dz);
      }
    }
    if (this.want !== null) {
      let diff = this.want - this.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      const turn = Math.sign(diff) * Math.min(Math.abs(diff), 7 * dt);
      this.heading += turn;
      if (Math.abs(diff) < 0.01) this.want = null;
    }
    this.obj.rotation.y = this.heading;
    this.naso.update(dt);
    const lift = this.naso.lift * NASO_SCALE;
    this.shadow.position.set(this.x, 0.006, this.z);
    this.shadow.scale.setScalar(NASO_SCALE * (1 - Math.min(0.45, lift * 0.7)));
    this.shadowMat.opacity = 1 - Math.min(0.6, lift);
  }
}
