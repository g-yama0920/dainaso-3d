import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Diorama } from './diorama.js';
import { StaticBatch } from './kit.js';
import * as P from './props.js';
import { lathe } from '../naso/geom.js';

// いえ（拠点）の箱庭：小さな家、かまど（料理）、わら人形（修行）、おでかけの立て札
export function buildHome({ season, weather }) {
  const d = new Diorama({ R: 3.0, weather });
  const b = new StaticBatch();
  P.island(b, d.R, season);

  P.house(b, -1.15, -1.2, 0.5);
  d.block(-1.15, -1.2, 1.0);
  P.roundTree(b, -2.2, 0.35, 0.95, season, 1); d.block(-2.2, 0.35, 0.42);
  P.roundTree(b, 0.25, -2.3, 0.8, season, 0); d.block(0.25, -2.3, 0.36);
  P.pineTree(b, 2.15, -1.55, 0.9, season); d.block(2.15, -1.55, 0.38);
  P.bush(b, -0.75, 2.45, 1, season);
  P.bush(b, 2.5, 0.3, 0.9, season);
  P.rock(b, 1.0, 2.35, 0.7, 0.4);
  [[-0.55, -0.4], [-0.32, -0.05], [-0.08, 0.3]].forEach(([x, z]) => P.stepStone(b, x, z, 1));
  if (season !== 'winter') {
    [[-2.45, -0.5, '#f39bb5'], [-2.3, -0.75, '#ffffff'], [0.9, -2.2, '#ffd84a'], [1.15, -2.35, '#f39bb5'], [-1.4, 2.2, '#ffffff'], [-1.2, 2.4, '#ffd84a'], [2.4, 1.0, '#f39bb5']]
      .forEach(([x, z, c]) => P.flower(b, x, z, c));
  }
  [[0.4, 1.9], [-1.9, 1.4], [2.0, 1.7], [-0.2, -1.2]].forEach(([x, z]) => P.grassTuft(b, x, z, P.SEASON[season].crown[1]));
  d.addStatic(b);

  // かまど（タップで料理）
  const kamado = buildKamado(d.kit);
  kamado.position.set(1.35, 0, -1.0);
  kamado.rotation.y = Math.atan2(-1.35, 1.0);
  d.group.add(kamado);
  d.block(1.35, -1.0, 0.45);
  d.taps.push({ obj: kamado, kind: 'kamado' });

  // わら人形（タップで なそのようす）
  const dummy = buildDummy(d.kit);
  dummy.position.set(1.5, 0, 1.1);
  dummy.rotation.y = Math.atan2(-1.5, -1.1);
  d.group.add(dummy);
  d.block(1.5, 1.1, 0.3);
  d.taps.push({ obj: dummy, kind: 'dummy' });

  // おでかけの立て札
  const sign = buildSign(d.kit, 'おでかけ');
  sign.position.set(-1.75, 0, 1.45);
  sign.rotation.y = Math.atan2(1.75, -1.45) * 0.6;
  d.group.add(sign);
  d.block(-1.75, 1.45, 0.22);
  d.taps.push({ obj: sign, kind: 'sign' });

  // なそが立つ場所
  d.spots = {
    cook: { x: 0.85, z: -0.35, face: [1.35, -1.0] },
    train: { x: 0.9, z: 0.6, face: [1.5, 1.1] },
    door: { x: -0.7, z: -0.5 },
  };
  const fire = kamado.userData.fire;
  d.onUpdate((dt, t) => {
    fire.scale.set(1 + 0.15 * Math.sin(t * 13), 1 + 0.25 * Math.sin(t * 9 + 1), 1);
  });
  return d;
}

function buildKamado(kit) {
  const g = kit.group(null, 'kamado');
  kit.part(g, lathe([[0.46, 0], [0.48, 0.14], [0.43, 0.38], [0.31, 0.53], [0.001, 0.58]], { samples: 14, segs: 24 }), '#b9b2a6');
  [[0.3, 0.2, 0.3], [-0.32, 0.28, 0.22], [0.1, 0.45, -0.3], [-0.2, 0.12, -0.38]].forEach(([x, y, z]) =>
    kit.part(g, new THREE.SphereGeometry(0.06, 6, 5), '#a39c90', { pos: [x, y, z], outline: 0 }));
  kit.part(g, new THREE.CircleGeometry(0.17, 16, 0, Math.PI), kit.track(new THREE.MeshBasicMaterial({ color: '#3a2a20' })), { pos: [0, 0.02, 0.455], outline: 0 });
  const fire = kit.group(g, 'fire', [0, 0.02, 0.44]);
  kit.part(fire, new THREE.ConeGeometry(0.08, 0.2, 6), kit.track(new THREE.MeshBasicMaterial({ color: '#ff9a3c' })), { pos: [0, 0.1, 0], outline: 0 });
  kit.part(fire, new THREE.ConeGeometry(0.045, 0.12, 6), kit.track(new THREE.MeshBasicMaterial({ color: '#ffe08a' })), { pos: [0, 0.07, 0.02], outline: 0 });
  kit.part(g, lathe([[0.001, 0.54], [0.17, 0.55], [0.24, 0.62], [0.25, 0.74], [0.22, 0.79]], { samples: 10, segs: 20 }), '#3b3f4a');
  kit.part(g, new THREE.TorusGeometry(0.225, 0.02, 6, 24), '#4a4f5c', { pos: [0, 0.79, 0], rot: [Math.PI / 2, 0, 0], outline: 0.6 });
  kit.part(g, new THREE.CircleGeometry(0.21, 20), '#d9a35a', { pos: [0, 0.775, 0], rot: [-Math.PI / 2, 0, 0], outline: 0 });
  g.userData.fire = fire;
  return g;
}

function buildDummy(kit) {
  const g = kit.group(null, 'dummy');
  kit.part(g, new THREE.CylinderGeometry(0.05, 0.065, 1.3, 7), '#8a5a3a', { pos: [0, 0.65, 0] });
  kit.part(g, new THREE.CapsuleGeometry(0.2, 0.28, 4, 10), '#e6c46a', { pos: [0, 0.78, 0] });
  kit.part(g, new THREE.SphereGeometry(0.17, 12, 9), '#e6c46a', { pos: [0, 1.22, 0] });
  kit.part(g, new THREE.CylinderGeometry(0.035, 0.035, 0.85, 6), '#8a5a3a', { pos: [0, 0.95, 0], rot: [0, 0, Math.PI / 2] });
  for (const y of [0.62, 0.95]) kit.part(g, new THREE.TorusGeometry(0.205, 0.02, 6, 20), '#b48a5c', { pos: [0, y, 0], rot: [Math.PI / 2, 0, 0], outline: 0.5 });
  kit.part(g, new THREE.TorusGeometry(0.07, 0.018, 6, 18), '#d9573f', { pos: [0, 0.8, 0.205], outline: 0.5 });
  return g;
}

function buildSign(kit, text) {
  const g = kit.group(null, 'sign');
  kit.part(g, new THREE.CylinderGeometry(0.04, 0.05, 0.9, 6), '#8a5a3a', { pos: [0, 0.45, 0] });
  kit.part(g, new RoundedBoxGeometry(0.78, 0.32, 0.06, 2, 0.03), '#c99a62', { pos: [0, 0.82, 0] });
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const x = c.getContext('2d');
  x.fillStyle = '#3a2a1a';
  x.font = '700 46px "Zen Maru Gothic", "Hiragino Maru Gothic ProN", sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text + ' →', 128, 50);
  const tex = kit.track(new THREE.CanvasTexture(c));
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = kit.track(new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  kit.part(g, new THREE.PlaneGeometry(0.72, 0.27), m, { pos: [0, 0.82, 0.032], outline: 0 });
  return g;
}
