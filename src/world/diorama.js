import * as THREE from 'three';
import { createKit } from './kit.js';
import { createWeather } from './weather.js';

// 箱庭の共通部分：島の上を歩けるか、ものをどこに置くか、片づけ。
// 箱庭は1つずつ読み込み、切りかえるときに dispose() で前の箱庭を捨てる。
export class Diorama {
  constructor({ R, weather, style = 'toon' }) {
    this.R = R;
    this.group = new THREE.Group();
    this.kit = createKit(style);
    this.obstacles = []; // { x, z, r }
    this.taps = []; // { obj, kind } タップできるもの
    this.statics = [];
    this.updaters = [];
    this.weather = createWeather(weather, R);
    if (this.weather) this.group.add(this.weather.obj);
  }
  block(x, z, r) {
    this.obstacles.push({ x, z, r });
  }
  addStatic(batch) {
    const g = batch.build(this.kit.style);
    this.group.add(g);
    this.statics.push(g);
    this.occluders = g.children.filter((c) => c.userData.occ);
  }
  // 島の中で、障害物にぶつからない場所か
  walkable(x, z, margin = 0.35) {
    if (Math.hypot(x, z) > this.R - 0.45) return false;
    for (const o of this.obstacles) if (Math.hypot(x - o.x, z - o.z) < o.r + margin) return false;
    return true;
  }
  // a から b まで、まっすぐ歩けるか
  clearPath(ax, az, bx, bz) {
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.2);
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      if (!this.walkable(ax + (bx - ax) * t, az + (bz - az) * t, 0.25)) return false;
    }
    return true;
  }
  randomPoint(from, tries = 24, minDist = 0.8) {
    for (let i = 0; i < tries; i++) {
      const r = Math.sqrt(Math.random()) * (this.R - 0.5), a = Math.random() * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (!this.walkable(x, z)) continue;
      if (from && Math.hypot(x - from.x, z - from.z) < minDist) continue;
      if (from && !this.clearPath(from.x, from.z, x, z)) continue;
      return { x, z };
    }
    return null;
  }
  onUpdate(fn) {
    this.updaters.push(fn);
  }
  update(dt, t) {
    if (this.weather) this.weather.update(dt, t);
    for (const f of this.updaters) f(dt, t);
  }
  dispose() {
    this.group.removeFromParent();
    if (this.weather) this.weather.dispose();
    this.statics.forEach((g) => g.userData.dispose());
    this.kit.dispose();
  }
}
