import * as THREE from 'three';
import { blob } from '../naso/geom.js';

// 箱庭で拾う食材の小さな3Dモデル（高さ0.3くらい）。足元が y=0。
export function buildItem(kit, id) {
  const g = kit.group(null, 'item-' + id);
  const leaf = (color, x, z, r) => kit.part(g, blob({ a: 0.07, b: 0.14, c: 0.025, p: 2.2, ws: 10, hs: 8 }), color, { pos: [x, 0.13, z], rot: [0.2, r, x * 3], outline: 0.6 });
  const cap = (color, s = 1) => {
    kit.part(g, new THREE.CylinderGeometry(0.045 * s, 0.06 * s, 0.14 * s, 8), '#f2e6d0', { pos: [0, 0.07 * s, 0], outline: 0.6 });
    return kit.part(g, new THREE.SphereGeometry(0.13 * s, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2), color, { pos: [0, 0.13 * s, 0], scl: [1, 0.85, 1], outline: 0.7 });
  };
  const ball = (color, x, y, z, r) => kit.part(g, new THREE.SphereGeometry(r, 10, 8), color, { pos: [x, y, z], outline: 0.6 });
  switch (id) {
    case 'herb':
      leaf('#6fb35a', 0, 0, 0); leaf('#5aa64c', -0.07, 0.03, 1.2); leaf('#7fc06a', 0.07, -0.02, -1.1);
      break;
    case 'mint':
      leaf('#5fc0a8', -0.06, 0, 1.2); leaf('#4fae96', 0.06, 0.02, -1.1);
      ball('#9fdcf0', 0, 0.28, 0.02, 0.05);
      break;
    case 'mush':
      cap('#c98d5a');
      break;
    case 'weird': {
      cap('#8a3aa8');
      [[0.06, 0.03], [-0.05, 0.06], [0.0, -0.08]].forEach(([x, z]) => ball('#f2e04a', x, 0.2, z, 0.022));
      break;
    }
    case 'nut':
      ball('#a9763e', -0.06, 0.08, 0, 0.08); ball('#c9965a', 0.07, 0.08, 0.02, 0.085);
      kit.part(g, new THREE.SphereGeometry(0.085, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#6b4a32', { pos: [-0.06, 0.11, 0], outline: 0.5 });
      break;
    case 'berry':
      ball('#e2483d', -0.05, 0.07, 0, 0.065); ball('#e2483d', 0.06, 0.07, 0.01, 0.065); ball('#d43a33', 0, 0.16, 0, 0.065);
      leaf('#6fb35a', 0, -0.06, 0);
      break;
    case 'acorn':
      kit.part(g, blob({ a: 0.09, b: 0.11, c: 0.09, p: 2.1, ws: 12, hs: 10 }), '#f2c14e', { pos: [0, 0.11, 0], outline: 0.7 });
      kit.part(g, new THREE.SphereGeometry(0.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#8a5a2a', { pos: [0, 0.15, 0], scl: [1, 0.7, 1], outline: 0.6 });
      break;
    default:
      ball('#dddddd', 0, 0.1, 0, 0.1);
  }
  return g;
}

// 見つけたものの上で光るきらきら（輪郭線なし）
export function buildSparkle(kit) {
  const g = kit.group(null, 'sparkle');
  const m = kit.track(new THREE.MeshBasicMaterial({ color: '#fff6c4', transparent: true, opacity: 0.9, depthWrite: false }));
  const star = new THREE.OctahedronGeometry(0.05, 0);
  for (let i = 0; i < 4; i++) {
    const s = kit.part(g, star, m, { pos: [Math.cos(i * 1.57) * 0.22, 0.25 + (i % 2) * 0.12, Math.sin(i * 1.57) * 0.22], scl: [0.6, 1.4, 0.6], outline: 0 });
    s.userData.k = i;
  }
  return g;
}
