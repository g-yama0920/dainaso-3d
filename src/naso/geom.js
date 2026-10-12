import * as THREE from 'three';

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export function smooth(e0, e1, x) {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

// UVの継ぎ目で法線が割れないよう、同じ位置の頂点の法線をそろえる（輪郭線が途切れなくなる）
export function weldNormals(g) {
  g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal, sum = new Map();
  const key = (i) => p.getX(i).toFixed(4) + ',' + p.getY(i).toFixed(4) + ',' + p.getZ(i).toFixed(4);
  for (let i = 0; i < p.count; i++) {
    const k = key(i);
    let a = sum.get(k);
    if (!a) sum.set(k, (a = new THREE.Vector3()));
    a.x += n.getX(i); a.y += n.getY(i); a.z += n.getZ(i);
  }
  for (let i = 0; i < p.count; i++) {
    const a = sum.get(key(i)), l = a.length() || 1;
    n.setXYZ(i, a.x / l, a.y / l, a.z / l);
  }
  n.needsUpdate = true;
  return g;
}

// まるみのある箱（超楕円体）。p が大きいほど角ばる。deform(v, n) で形を足し引きできる。
export function blob({ a, b, c, p = 2.5, ws = 48, hs = 32, deform = null }) {
  const g = new THREE.SphereGeometry(1, ws, hs);
  const pos = g.attributes.position, v = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    n.fromBufferAttribute(pos, i);
    const r = Math.pow(Math.pow(Math.abs(n.x), p) + Math.pow(Math.abs(n.y), p) + Math.pow(Math.abs(n.z), p), -1 / p);
    v.copy(n).multiplyScalar(r);
    v.x *= a; v.y *= b; v.z *= c;
    if (deform) deform(v, n);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  return weldNormals(g);
}

// [r, y] の点をなめらかにつないで、弧長で等間隔に並べ直す
export function splinePoints(prof, samples = 24) {
  const curve = new THREE.SplineCurve(prof.map(([r, y]) => new THREE.Vector2(r, y)));
  return curve.getSpacedPoints(samples).map((q) => new THREE.Vector2(Math.max(q.x, 0.0005), q.y));
}

// 回転体。phiStart=π のとき、テクスチャの横まん中（u=0.5）が正面（+z）にくる。
export function lathe(prof, { samples = 24, segs = 40, phiStart = Math.PI, phiLength = Math.PI * 2 } = {}) {
  return new THREE.LatheGeometry(splinePoints(prof, samples), segs, phiStart, phiLength);
}

// とがった耳（先は細く、根元は丸い葉っぱ形）。+y が先、正面が +z。
export function earGeometry(len, wid, thick, cup = 0.5) {
  const prof = [[0.0, 0], [0.55, 0.05], [0.92, 0.2], [1.0, 0.36], [0.82, 0.58], [0.5, 0.8], [0.2, 0.94], [0.0, 1]];
  const g = lathe(prof, { samples: 28, segs: 24, phiStart: 0 });
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) * wid / 2, y = p.getY(i) * len;
    let z = p.getZ(i) * thick / 2;
    const xn = x / (wid / 2);
    z += cup * thick * xn * xn; // 前にくぼむ
    z -= 0.12 * len * Math.pow(y / len, 2); // 先は少し後ろへ反る
    p.setXYZ(i, x, y, z);
  }
  return weldNormals(g);
}

// 盾の形（胸の紋章）
export function shieldShape(w, h) {
  const s = new THREE.Shape(), hw = w / 2, t = h / 2;
  s.moveTo(-hw, t);
  s.quadraticCurveTo(-hw * 0.5, t - h * 0.06, 0, t - h * 0.02);
  s.quadraticCurveTo(hw * 0.5, t - h * 0.06, hw, t);
  s.lineTo(hw, h * 0.02);
  s.quadraticCurveTo(hw * 0.92, -t * 0.62, 0, -t);
  s.quadraticCurveTo(-hw * 0.92, -t * 0.62, -hw, h * 0.02);
  s.lineTo(-hw, t);
  return s;
}

// 上がとがったひざ当て
export function kneeShape(w, h) {
  const s = new THREE.Shape(), hw = w / 2, t = h / 2;
  s.moveTo(0, t);
  s.quadraticCurveTo(hw * 0.9, t * 0.45, hw, -t * 0.15);
  s.quadraticCurveTo(hw * 0.85, -t, 0, -t);
  s.quadraticCurveTo(-hw * 0.85, -t, -hw, -t * 0.15);
  s.quadraticCurveTo(-hw * 0.9, t * 0.45, 0, t);
  return s;
}

export function extrudeShape(shape, depth, bevel, curveSegments = 24) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: curveSegments < 16 ? 2 : 3, curveSegments,
  });
  g.center();
  return weldNormals(g);
}

// 少しふくらんだ丸レンズ。縁の面が z=0、正面が +z。UVは平面で貼る（目の絵がゆがまない）。
export function lensGeometry(rimR, bulge = 0.5) {
  const R = rimR / Math.sin(bulge);
  const g = new THREE.SphereGeometry(R, 32, 10, 0, Math.PI * 2, 0, bulge);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, -R * Math.cos(bulge));
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) / (2 * rimR), 0.5 + p.getY(i) / (2 * rimR));
  return g;
}

// 顔の正面だけを切り出した薄皮。眉・口を描いた絵を正面から投影して貼る。
export function frontDecal(src, { zMin = 0.12, extent = 1.1, inflate = 1.002 } = {}) {
  const pos = src.attributes.position, idx = src.index ? src.index.array : null;
  const n = idx ? idx.length : pos.count, out = [], uv = [];
  for (let i = 0; i < n; i += 3) {
    const ids = idx ? [idx[i], idx[i + 1], idx[i + 2]] : [i, i + 1, i + 2];
    if (ids.some((k) => pos.getZ(k) < zMin)) continue;
    for (const k of ids) {
      const x = pos.getX(k) * inflate, y = pos.getY(k) * inflate, z = pos.getZ(k) * inflate;
      out.push(x, y, z);
      uv.push(0.5 + x / extent, 0.5 + y / extent);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

// 楕円の弧（腰の垂れのすそ毛皮の通り道）
export class ArcCurve extends THREE.Curve {
  constructor(rx, rz, y, a0, a1) {
    super();
    Object.assign(this, { rx, rz, y, a0, a1 });
  }
  getPoint(t, target = new THREE.Vector3()) {
    const a = this.a0 + (this.a1 - this.a0) * t;
    return target.set(Math.sin(a) * this.rx, this.y, Math.cos(a) * this.rz);
  }
}
