import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { surface, outlineMaterial } from '../naso/materials.js';

// 小物を作る道具。part() でアニメ塗り＋輪郭線のメッシュを作り、dispose() でまとめて片づける。
export function createKit(style = 'toon') {
  const geos = new Set(), mats = new Map(), extra = new Set();
  const toon = style === 'toon';
  function mat(color, o) {
    const key = color + (o ? JSON.stringify(o) : '');
    let m = mats.get(key);
    if (!m) mats.set(key, (m = surface(style, color, o || {})));
    return m;
  }
  function group(parent, name = '', pos, rot, scl) {
    const g = new THREE.Group();
    g.name = name;
    if (pos) g.position.set(...pos);
    if (rot) g.rotation.set(...rot);
    if (scl) g.scale.set(...scl);
    if (parent) parent.add(g);
    return g;
  }
  function part(parent, geo, material, { pos, rot, scl, outline = 1 } = {}) {
    geos.add(geo);
    const m = new THREE.Mesh(geo, typeof material === 'string' ? mat(material) : material);
    if (pos) m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    if (scl) m.scale.set(...scl);
    if (toon && outline) {
      const o = new THREE.Mesh(geo, outlineMaterial(outline));
      o.raycast = () => {};
      m.add(o);
    }
    if (parent) parent.add(m);
    return m;
  }
  return {
    style, mat, group, part,
    track(x) { extra.add(x); return x; },
    dispose() {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      extra.forEach((x) => x.dispose && x.dispose());
      geos.clear(); mats.clear(); extra.clear();
    },
  };
}

// 動かない物（島・木・岩・家…）を、色つきの1つのメッシュにまとめる。描く回数が減って、電池にやさしい。
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
// 木や岩のように視界をさえぎる物は begin(名前)〜end() でかこむと、1本ずつ消せるメッシュになる。
export class StaticBatch {
  constructor() {
    this.items = [];
    this.cur = '';
  }
  begin(key) { this.cur = key; return this; }
  end() { this.cur = ''; return this; }
  add(geo, color, { pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1], outline = true } = {}) {
    const m = new THREE.Matrix4().compose(_v.set(...pos), _q.setFromEuler(_e.set(...rot)), _s.set(...scl));
    this.items.push({ geo, color: new THREE.Color(color), m, outline, group: this.cur });
    return this;
  }
  addMatrix(geo, color, matrix, outline = true) {
    this.items.push({ geo, color: new THREE.Color(color), m: matrix.clone(), outline, group: this.cur });
    return this;
  }
  // まとめたメッシュを返す。さえぎる物は userData.occ（中心と半径）つきの小グループになる
  build(style = 'toon') {
    const out = new THREE.Group(), made = [];
    const groups = [...new Set(this.items.map((it) => it.group))];
    for (const key of groups) {
      const holder = key ? new THREE.Group() : out;
      if (key) { holder.name = key; out.add(holder); }
      this.buildGroup(style, this.items.filter((it) => it.group === key), holder, made);
      if (key) {
        const box = new THREE.Box3().setFromObject(holder), c = box.getCenter(new THREE.Vector3());
        holder.userData.occ = { x: c.x, z: c.z, r: Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2 };
      }
    }
    out.userData.dispose = () => made.forEach((x) => x.dispose());
    return out;
  }
  buildGroup(style, items, out, made) {
    for (const withOutline of [true, false]) {
      const list = items.filter((it) => it.outline === withOutline);
      if (!list.length) continue;
      const parts = list.map((it) => {
        let g = it.geo.index ? it.geo.toNonIndexed() : it.geo.clone();
        for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
        g.applyMatrix4(it.m);
        const n = g.attributes.position.count, c = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { c[i * 3] = it.color.r; c[i * 3 + 1] = it.color.g; c[i * 3 + 2] = it.color.b; }
        g.setAttribute('color', new THREE.BufferAttribute(c, 3));
        return g;
      });
      const merged = mergeGeometries(parts, false);
      parts.forEach((g) => g.dispose());
      const material = surface(style, '#ffffff');
      material.vertexColors = true;
      const mesh = new THREE.Mesh(merged, material);
      mesh.raycast = () => {}; // 地面のタップは別に判定する
      if (style === 'toon' && withOutline) mesh.add(new THREE.Mesh(merged, outlineMaterial(1)));
      out.add(mesh);
      made.push(merged, material);
    }
  }
}
