import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { lathe } from '../naso/geom.js';

// 箱庭の小物。動かない物は StaticBatch に足す。形はローポリで、まとめて使い回す。
const G = {};
const geo = (key, make) => G[key] || (G[key] = make());

export const SEASON = {
  spring: { grass: '#b9d98a', crown: ['#9fd27c', '#8cc76a'], accent: '#f6b8c8', pine: '#6aa86a' },
  summer: { grass: '#a5cd70', crown: ['#6fb85a', '#5aa64c'], accent: null, pine: '#4e8f58' },
  autumn: { grass: '#c8c47c', crown: ['#e39a3e', '#d9662f'], accent: '#f2c14e', pine: '#5f8a55' },
  winter: { grass: '#e6edf0', crown: ['#86ad8f', '#769e80'], accent: null, pine: '#5f8a6a', snow: true },
};
export const C = {
  earth: '#c49a6a', earthDeep: '#a77b4f', trunk: '#8a5a3a', rock: '#aaa59c', rockDeep: '#8f897f',
  snow: '#ffffff', path: '#e2d3b0', wood: '#9a6a44', woodDark: '#7a5236',
};

// 浮かぶ島：上に草、下は土と岩
export function island(b, R, season, { grass } = {}) {
  const top = lathe([[R - 0.05, -0.16], [R + 0.05, -0.08], [R, -0.02], [R - 0.12, 0], [0, 0]], { samples: 14, segs: 56, phiStart: 0 });
  b.add(top, grass || SEASON[season].grass);
  const under = lathe([[0, -R * 0.42], [R * 0.18, -R * 0.38], [R * 0.5, -R * 0.26], [R * 0.82, -R * 0.13], [R - 0.02, -0.14]], { samples: 16, segs: 56, phiStart: 0 });
  b.add(under, C.earth);
  // 島の下にぶら下がる岩
  const rk = geo('rock', () => new THREE.DodecahedronGeometry(0.4, 0));
  [[0.5, 0.3, -R * 0.36, 0.9], [-0.7, -0.4, -R * 0.3, 0.7], [0.1, -0.8, -R * 0.33, 0.6]].forEach(([x, z, y, s]) => {
    b.add(rk, C.earthDeep, { pos: [x * R * 0.4, y, z * R * 0.4], rot: [0.4, x * 2, 0.2], scl: [s, s * 0.8, s] });
  });
}

// まるい木
export function roundTree(b, x, z, s = 1, season = 'summer', seed = 0) {
  const S = SEASON[season];
  b.begin(`tree${x.toFixed(2)},${z.toFixed(2)}`);
  b.add(geo('trunk', () => new THREE.CylinderGeometry(0.09, 0.14, 0.7, 7)), C.trunk, { pos: [x, 0.35 * s, z], scl: [s, s, s] });
  const crown = geo('crown', () => new THREE.SphereGeometry(0.5, 12, 9));
  const col = S.crown[seed % 2];
  b.add(crown, col, { pos: [x, 1.0 * s, z], scl: [s, s * 0.88, s] });
  b.add(crown, S.crown[(seed + 1) % 2], { pos: [x + 0.22 * s, 0.82 * s, z + 0.12 * s], scl: [s * 0.55, s * 0.5, s * 0.55] });
  if (S.snow) b.add(geo('snowcap', () => new THREE.SphereGeometry(0.52, 12, 6, 0, Math.PI * 2, 0, 1.0)), C.snow, { pos: [x, 1.04 * s, z], scl: [s, s * 0.88, s] });
  if (S.accent) {
    const dot = geo('dot', () => new THREE.SphereGeometry(0.07, 6, 5));
    for (let i = 0; i < 5; i++) {
      const a = seed * 1.7 + i * 1.26, h = 0.85 + 0.25 * Math.sin(i * 2.1);
      b.add(dot, S.accent, { pos: [x + Math.cos(a) * 0.47 * s, h * s, z + Math.sin(a) * 0.47 * s], scl: [s, s, s], outline: false });
    }
  }
  b.end();
}

// とんがりの木
export function pineTree(b, x, z, s = 1, season = 'summer') {
  const S = SEASON[season];
  b.begin(`pine${x.toFixed(2)},${z.toFixed(2)}`);
  b.add(geo('trunk', () => new THREE.CylinderGeometry(0.09, 0.14, 0.7, 7)), C.trunk, { pos: [x, 0.3 * s, z], scl: [s, s * 0.8, s] });
  const cone = geo('cone', () => new THREE.ConeGeometry(0.5, 0.7, 8));
  [[0.75, 1], [1.1, 0.78], [1.42, 0.55]].forEach(([y, k]) => {
    b.add(cone, S.pine, { pos: [x, y * s, z], scl: [s * k, s * k, s * k] });
    if (S.snow) b.add(cone, C.snow, { pos: [x, (y + 0.17 * k) * s, z], scl: [s * k * 0.55, s * k * 0.5, s * k * 0.55], outline: false });
  });
  b.end();
}

export function bush(b, x, z, s = 1, season = 'summer') {
  const S = SEASON[season], ball = geo('bush', () => new THREE.SphereGeometry(0.3, 9, 7));
  b.begin(`bush${x.toFixed(2)},${z.toFixed(2)}`);
  b.add(ball, S.crown[1], { pos: [x, 0.2 * s, z], scl: [s * 1.2, s * 0.8, s] });
  b.add(ball, S.crown[0], { pos: [x + 0.2 * s, 0.17 * s, z + 0.1 * s], scl: [s * 0.8, s * 0.65, s * 0.8] });
  if (S.snow) b.add(ball, C.snow, { pos: [x, 0.3 * s, z], scl: [s, s * 0.35, s * 0.85], outline: false });
  b.end();
}

export function rock(b, x, z, s = 1, rot = 0) {
  b.begin(`rock${x.toFixed(2)},${z.toFixed(2)}`);
  b.add(geo('rock', () => new THREE.DodecahedronGeometry(0.4, 0)), C.rock, { pos: [x, 0.12 * s, z], rot: [0.3, rot, 0.1], scl: [s, s * 0.6, s] });
  b.end();
}

export function flower(b, x, z, color = '#ffffff') {
  b.add(geo('stem', () => new THREE.CylinderGeometry(0.012, 0.012, 0.22, 4)), '#5f9a4a', { pos: [x, 0.11, z], outline: false });
  b.add(geo('petal', () => new THREE.SphereGeometry(0.06, 7, 5)), color, { pos: [x, 0.24, z], scl: [1, 0.6, 1] });
  b.add(geo('pistil', () => new THREE.SphereGeometry(0.025, 6, 4)), '#f2c14e', { pos: [x, 0.27, z], outline: false });
}

export function decoMushroom(b, x, z, s = 1, cap = '#d9573f') {
  b.add(geo('mstem', () => new THREE.CylinderGeometry(0.05, 0.07, 0.18, 7)), '#f2e6d0', { pos: [x, 0.09 * s, z], scl: [s, s, s] });
  b.add(geo('mcap', () => new THREE.SphereGeometry(0.13, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)), cap, { pos: [x, 0.17 * s, z], scl: [s, s * 0.8, s] });
}

export function grassTuft(b, x, z, color) {
  const blade = geo('blade', () => new THREE.ConeGeometry(0.035, 0.22, 4));
  for (let i = 0; i < 3; i++) b.add(blade, color, { pos: [x + (i - 1) * 0.05, 0.1, z + (i % 2) * 0.03], rot: [0, 0, (i - 1) * 0.35], outline: false });
}

export function log(b, x, z, rotY = 0) {
  b.begin(`log${x.toFixed(2)},${z.toFixed(2)}`);
  b.add(geo('log', () => new THREE.CylinderGeometry(0.16, 0.16, 0.9, 9)), C.wood, { pos: [x, 0.16, z], rot: [0, rotY, Math.PI / 2] });
  b.end();
}

export function stepStone(b, x, z, s = 1) {
  b.add(geo('step', () => new THREE.CylinderGeometry(0.22, 0.24, 0.05, 8)), C.path, { pos: [x, 0.02, z], scl: [s, 1, s * 0.8] });
}

// なその家（小さなおうち）
export function house(b, x, z, rotY = 0) {
  b.begin('house');
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)), new THREE.Vector3(1, 1, 1));
  const at = (g, color, pos, rot = [0, 0, 0], scl = [1, 1, 1], outline = true) => {
    const l = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scl));
    b.addMatrix(g, color, m.clone().multiply(l), outline);
  };
  at(geo('hwall', () => new RoundedBoxGeometry(1.5, 1.1, 1.3, 2, 0.06)), '#f3e6c8', [0, 0.55, 0]);
  const roof = geo('hroof', () => new THREE.CylinderGeometry(0.06, 1.12, 0.8, 4, 1));
  at(roof, '#c4553b', [0, 1.45, 0], [0, Math.PI / 4, 0], [1.25, 1, 1.1]);
  at(geo('hdoor', () => new RoundedBoxGeometry(0.42, 0.68, 0.08, 2, 0.04)), '#8a5a3a', [0, 0.36, 0.66]);
  at(geo('hknob', () => new THREE.SphereGeometry(0.03, 6, 5)), '#e2b23e', [0.13, 0.36, 0.71], [0, 0, 0], [1, 1, 1], false);
  const win = geo('hwin', () => new RoundedBoxGeometry(0.34, 0.3, 0.06, 2, 0.03));
  at(win, '#9fd3ef', [-0.48, 0.66, 0.66]);
  at(win, '#9fd3ef', [0.76, 0.62, 0.15], [0, Math.PI / 2, 0]);
  at(geo('hchim', () => new RoundedBoxGeometry(0.22, 0.5, 0.22, 2, 0.03)), '#b9b2a6', [0.42, 1.6, -0.2]);
  at(geo('hbeam', () => new THREE.BoxGeometry(1.56, 0.07, 0.07)), '#8a5a3a', [0, 1.08, 0.66]);
  b.end();
}
