import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { C } from './palette.js';
import { surface, outlineMaterial } from './materials.js';
import {
  blob, splinePoints, lathe, earGeometry, shieldShape, kneeShape, extrudeShape,
  lensGeometry, frontDecal, weldNormals, smooth, ArcCurve,
} from './geom.js';
import { hairTexture, chestTexture, skirtTexture, beltTexture, furTexture, buckleTexture } from './textures.js';
import { createFace, FACE_EXTENT } from './face.js';

/*
  コードで組み立てた試作モデル（球・円柱などの組み合わせ）。足元が y=0、正面が +z、身長は約 2.0。

  Blender や AI で作ったモデル（GLB）に差し替えるときは、同じ形のオブジェクトを返す関数を作ればよい：
    root    … 全体（シーンに置くもの）
    joints  … 動かす関節。名前は JOINTS と同じ（GLB ならボーン名をこの名前にする）
    face    … set({ eyes, mouth, brows }) で表情を変える
    dispose … 片づけ
*/
export const JOINTS = ['root', 'hips', 'spine', 'head', 'shoulderL', 'shoulderR', 'armL', 'armR', 'foreL', 'foreR', 'legL', 'legR'];

// 胴の形 [半径, 高さ]（spine から見た高さ）
const TORSO = [[0.39, -0.08], [0.43, 0.02], [0.46, 0.14], [0.47, 0.26], [0.455, 0.36], [0.4, 0.45], [0.29, 0.53], [0.12, 0.575], [0.0, 0.585]];
const FACE_Y = 0.42; // 頭の関節から顔の中心まで
const HAIR_Y = 0.5;
const BANGS = 0.63; // 前髪・横・後ろの毛先の高さ（ぐるりとそろえる）
const W = 1.05; // 胴まわりの横幅（強そうに少し広げる）

// detail：形のこまかさ（1＝いちばん細かい。箱庭の中では小さく映るので 0.55 で十分）
export function buildProtoModel(style = 'toon', { detail = 1 } = {}) {
  const q = (n) => Math.max(5, Math.round(n * detail));
  const toon = style === 'toon';
  const geos = new Set(), mats = new Set(), texs = new Set();
  const T = (t) => (texs.add(t), t);
  const S = (color, o) => {
    const m = surface(style, color, o);
    mats.add(m);
    return m;
  };
  function group(parent, name, pos = [0, 0, 0], rot = [0, 0, 0]) {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(...pos);
    g.rotation.set(...rot);
    parent.add(g);
    return g;
  }
  function part(parent, geo, mat, { pos, rot, scl, outline = 1 } = {}) {
    geos.add(geo);
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    if (scl) m.scale.set(...scl);
    if (toon && outline) {
      const o = new THREE.Mesh(geo, outlineMaterial(outline));
      o.raycast = () => {};
      m.add(o);
    }
    parent.add(m);
    return m;
  }

  const torsoPts = splinePoints(TORSO, q(40));
  const along = (y, f) => {
    for (let i = 1; i < torsoPts.length; i++) {
      if (torsoPts[i].y >= y) {
        const a = torsoPts[i - 1], b = torsoPts[i], k = (y - a.y) / (b.y - a.y || 1);
        return f(i - 1 + k, a.x + (b.x - a.x) * k);
      }
    }
    return f(torsoPts.length - 1, 0);
  };
  const vOf = (y) => along(y, (i) => i / (torsoPts.length - 1));
  const rAt = (y) => along(y, (i, r) => r);

  const face = createFace(style);
  const mSkin = S(C.skin), mNose = S(C.skinLight), mEarIn = S(C.earInner);
  const mHair = S('#ffffff', { map: T(hairTexture()) });
  const mArmor = S(C.armor), mArmorDS = S(C.armor, { side: THREE.DoubleSide });
  const mChest = S('#ffffff', { map: T(chestTexture(vOf)) });
  const mSkirt = S('#ffffff', { map: T(skirtTexture()), side: THREE.DoubleSide });
  const mGold = S(C.gold, { metal: true }), mGoldLight = S(C.goldLight, { metal: true });
  const mNavy = S(C.navy), mGrip = S(C.belt);
  const mBelt = S('#ffffff', { map: T(beltTexture()) });
  const mFur = S('#ffffff', { map: T(furTexture()) });
  const mBuckle = S('#ffffff', { map: T(buckleTexture()), metal: true });
  const mGem = S(C.gem, { rough: 0.15 });
  const mShine = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  mats.add(mShine);

  const root = new THREE.Group();
  root.name = 'naso';
  const body = group(root, 'root');
  const hips = group(body, 'hips', [0, 0.45, 0]);
  const spine = group(hips, 'spine', [0, 0.02, 0]);
  const head = group(spine, 'head', [0, 0.48, 0.04]);
  const J = { root: body, hips, spine, head };

  const rivetGeo = new THREE.SphereGeometry(0.026, q(12), q(10));

  /* ---------- 胴：胸板のふくらみと、まん中の稜線で、厚い胸当てにする ---------- */
  const torsoGeo = new THREE.LatheGeometry(torsoPts, q(64), Math.PI);
  {
    const p = torsoGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(x, z); // a=0 が正面
      const band = smooth(-0.04, 0.12, y) * (1 - smooth(0.42, 0.54, y));
      const ridge = Math.exp(-Math.abs(a) / 0.22) * band;
      const pec = Math.exp(-Math.pow((Math.abs(a) - 0.62) / 0.32, 2)) * Math.exp(-Math.pow((y - 0.34) / 0.1, 2));
      const k = 1 + 0.05 * ridge + 0.05 * pec;
      p.setXYZ(i, x * k, y, z * k);
    }
    weldNormals(torsoGeo);
  }
  part(spine, torsoGeo, mChest, { scl: [W, 1, 0.8] });
  // 首まわりの襟（前はあごがあるので開けておく）
  const open = 1.05;
  part(spine, lathe([[0.4, 0.42], [0.425, 0.47], [0.39, 0.52], [0.32, 0.555], [0.22, 0.575]], { samples: q(14), segs: q(40), phiStart: open, phiLength: Math.PI * 2 - open * 2 }), mArmorDS, { scl: [W, 1, 0.85] });
  const collarRim = new THREE.TorusGeometry(0.335, 0.02, q(8), q(40), Math.PI * 2 - open * 2);
  collarRim.rotateZ(Math.PI / 2 + open);
  collarRim.rotateX(Math.PI / 2);
  part(spine, collarRim, mGold, { pos: [0, 0.54, 0], scl: [W, 1, 0.85], outline: 0.6 });

  const crestY = 0.3;
  const crest = group(spine, 'crest', [0, crestY, rAt(crestY) * 0.8 * 1.05 + 0.022], [-0.08, 0, 0]);
  part(crest, extrudeShape(shieldShape(0.25, 0.27), 0.03, 0.016, q(24)), mGold);
  part(crest, extrudeShape(shieldShape(0.17, 0.19), 0.006, 0.006, q(24)), mGoldLight, { pos: [0, 0.008, 0.03], outline: 0.45 });
  part(crest, new THREE.TorusGeometry(0.05, 0.012, q(10), q(32)), mGold, { pos: [0, 0, 0.045], outline: 0.5 });
  part(crest, new THREE.SphereGeometry(0.046, q(24), q(16)), mGem, { pos: [0, 0, 0.045], scl: [1, 1, 0.6], outline: 0 });
  part(crest, new THREE.CircleGeometry(0.012, 16), mShine, { pos: [-0.016, 0.016, 0.075], outline: 0 });

  /* ---------- ベルト・腰の垂れ（前が開いている）・すその毛皮 ---------- */
  part(hips, lathe([[0.43, -0.04], [0.47, -0.035], [0.487, -0.015], [0.487, 0.1], [0.47, 0.12], [0.43, 0.125]], { samples: q(12), segs: q(56) }), mBelt, { scl: [W, 1, 0.82] });
  const bz = 0.487 * 0.82 + 0.022;
  part(hips, new RoundedBoxGeometry(0.29, 0.19, 0.065, 3, 0.028), mGold, { pos: [0, 0.042, bz] });
  part(hips, new THREE.PlaneGeometry(0.245, 0.15), mBuckle, { pos: [0, 0.042, bz + 0.033], outline: 0 });
  const gap = 0.45, PLATES = 10, SKIRT_SAMPLES = q(12), skirtSegs = PLATES * Math.max(4, Math.round(8 * detail));
  const skirtGeo = lathe([[0.555, -0.28], [0.52, -0.18], [0.49, -0.08], [0.47, 0.0]], { samples: SKIRT_SAMPLES, segs: skirtSegs, phiStart: gap, phiLength: Math.PI * 2 - gap * 2 });
  {
    // 板ごとに少しふくらませて、1枚ずつの板に見せる（模様の板と位置をそろえる）
    const p = skirtGeo.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const u = Math.floor(k / (SKIRT_SAMPLES + 1)) / skirtSegs;
      const f = 1 + 0.035 * (0.5 - 0.5 * Math.cos(2 * Math.PI * PLATES * u));
      p.setX(k, p.getX(k) * f);
      p.setZ(k, p.getZ(k) * f);
    }
    skirtGeo.computeVertexNormals();
  }
  part(hips, skirtGeo, mSkirt, { scl: [W, 1, 0.86] });
  const furRx = 0.6, furRz = 0.495, furY = -0.29;
  part(hips, new THREE.TubeGeometry(new ArcCurve(furRx, furRz, furY, gap, Math.PI * 2 - gap), q(72), 0.062, q(10), false), mFur);
  for (const a of [gap, Math.PI * 2 - gap]) {
    part(hips, new THREE.SphereGeometry(0.062, q(16), q(12)), mFur, { pos: [Math.sin(a) * furRx, furY, Math.cos(a) * furRz] });
  }

  const hands = {};
  for (const s of [1, -1]) {
    const L = s > 0 ? 'L' : 'R'; // L＝なその左（画面の右）

    /* ---------- 脚：少し開いて立つ。とがったひざ当て・大きいブーツ ---------- */
    const leg = group(hips, 'leg' + L, [s * 0.2, -0.05, 0], [0, 0, s * 0.04]);
    part(leg, new THREE.CapsuleGeometry(0.125, 0.1, q(6), q(16)), mArmor, { pos: [0, -0.09, 0] });
    const knee = group(leg, 'knee' + L, [0, -0.17, 0]);
    part(knee, new THREE.CapsuleGeometry(0.115, 0.05, q(6), q(16)), mArmor, { pos: [0, -0.05, 0] });
    part(knee, blob({ a: 0.18, b: 0.135, c: 0.225, p: 2.4, ws: q(32), hs: q(20), deform: (v) => { if (v.y < -0.1) v.y = -0.1 + (v.y + 0.1) * 0.15; } }), mArmor, { pos: [0, -0.125, 0.05] });
    part(knee, new THREE.TorusGeometry(0.122, 0.026, q(10), q(32)), mGold, { pos: [0, -0.015, 0.005], rot: [Math.PI / 2, 0, 0], outline: 0.6 });
    part(knee, extrudeShape(kneeShape(0.22, 0.23), 0.024, 0.018, q(24)), mArmor, { pos: [0, 0.045, 0.135], rot: [-0.3, 0, 0] });
    part(knee, new THREE.SphereGeometry(0.03, q(12), q(10)), mGold, { pos: [0, 0.04, 0.178], outline: 0.6 });
    J['leg' + L] = leg;

    /* ---------- 肩当て：大きく3枚重ね。下の板ほど張り出し、上の板には金の稜線 ---------- */
    const sh = group(spine, 'shoulder' + L, [s * 0.51, 0.45, 0], [0, 0, -s * 0.45]);
    part(sh, new THREE.SphereGeometry(0.17, q(20), q(14)), mNavy, { outline: 0 });
    const th = 1.32;
    [[0.25, 0], [0.27, -0.075], [0.29, -0.15]].forEach(([r, y], i) => {
      const sx = 1 + 0.04 * i;
      part(sh, weldNormals(new THREE.SphereGeometry(r, q(44), q(16), 0, Math.PI * 2, 0, th)), mArmorDS, { pos: [0, y, 0], scl: [sx, 0.8, 0.95] });
      part(sh, new THREE.TorusGeometry(r * Math.sin(th), 0.02, q(8), q(52)), mGold, { pos: [0, y + r * Math.cos(th) * 0.8, 0], rot: [Math.PI / 2, 0, 0], scl: [sx, 0.95, 1], outline: 0.6 });
      if (i > 0) part(sh, rivetGeo, mGold, { pos: [0, y + r * Math.cos(th - 0.12) * 0.8, r * Math.sin(th - 0.12) * 0.95 + 0.004], outline: 0.6 });
    });
    const ridgeArc = 2.0, ridgeGeo = new THREE.TorusGeometry(0.258, 0.024, q(8), q(40), ridgeArc);
    ridgeGeo.rotateZ(Math.PI / 2 - ridgeArc / 2);
    ridgeGeo.rotateY(Math.PI / 2);
    ridgeGeo.scale(1, 0.8, 0.95);
    part(sh, ridgeGeo, mGold, { outline: 0.7 });
    for (const az of [-0.8, 0.8]) {
      const pl = 0.85;
      part(sh, rivetGeo, mGold, { pos: [0.25 * Math.sin(pl) * Math.sin(az), 0.25 * Math.cos(pl) * 0.8, 0.25 * Math.sin(pl) * Math.cos(az) * 0.95], outline: 0.6 });
    }
    J['shoulder' + L] = sh;

    /* ---------- 腕：紺の下着・ひじ当て・手首へ広がる厚い籠手・こぶし ---------- */
    const arm = group(spine, 'arm' + L, [s * 0.47, 0.42, 0], [0, 0, s * 0.26]);
    part(arm, new THREE.CapsuleGeometry(0.095, 0.13, q(6), q(14)), mNavy, { pos: [0, -0.1, 0] });
    const fore = group(arm, 'fore' + L, [0, -0.23, 0], [0, 0, -s * 0.16]);
    part(fore, blob({ a: 0.08, b: 0.08, c: 0.055, p: 2.2, ws: q(16), hs: q(12) }), mArmor, { pos: [s * 0.02, 0.01, -0.09] });
    part(fore, rivetGeo, mGold, { pos: [s * 0.02, 0.01, -0.145], outline: 0.6 });
    part(fore, lathe([[0.0, -0.215], [0.135, -0.21], [0.155, -0.185], [0.13, -0.13], [0.117, -0.06], [0.11, 0.0], [0.092, 0.025], [0.0, 0.03]], { samples: q(22), segs: q(36), phiStart: 0 }), mArmor);
    part(fore, new THREE.TorusGeometry(0.12, 0.016, q(8), q(36)), mGold, { pos: [0, -0.05, 0], rot: [Math.PI / 2, 0, 0], outline: 0.55 });
    part(fore, new THREE.TorusGeometry(0.152, 0.018, q(8), q(40)), mGold, { pos: [0, -0.195, 0], rot: [Math.PI / 2, 0, 0], outline: 0.55 });
    const hand = group(fore, 'hand' + L, [0, -0.305, 0.08], [0.25, 0, 0]); // こぶしを少し前へ
    hands[L] = hand;
    part(hand, blob({ a: 0.135, b: 0.125, c: 0.12, p: 2.3, ws: q(32), hs: q(20) }), mArmor);
    part(hand, new THREE.CapsuleGeometry(0.034, 0.15, q(4), q(12)), mArmor, { pos: [0, 0.035, 0.105], rot: [0, 0, Math.PI / 2], outline: 0.8 });
    part(hand, blob({ a: 0.05, b: 0.06, c: 0.05, p: 2.2, ws: q(16), hs: q(12) }), mArmor, { pos: [-s * 0.1, 0.035, 0.07], rot: [0, 0, s * 0.4] });
    J['arm' + L] = arm;
    J['fore' + L] = fore;
  }

  /* ---------- 剣：ふだんは背中のさや（柄が右肩の上に出る）。戦うときは右手に持つ ---------- */
  const sw = group(spine, 'sword', [-0.62, 0.63, -0.48], [0, 0, 0.9]);
  const hilt = group(sw, 'hilt');
  part(hilt, new THREE.CapsuleGeometry(0.032, 0.24, q(4), q(12)), mGold, { rot: [0, 0, Math.PI / 2] });
  part(hilt, new THREE.CylinderGeometry(0.03, 0.033, 0.17, q(14)), mGrip, { pos: [0, 0.1, 0] });
  for (const y of [0.06, 0.14]) part(hilt, new THREE.TorusGeometry(0.034, 0.008, q(6), q(16)), mGold, { pos: [0, y, 0], rot: [Math.PI / 2, 0, 0], outline: 0.4 });
  part(hilt, new THREE.SphereGeometry(0.048, q(16), q(12)), mGold, { pos: [0, 0.215, 0] });
  part(sw, blob({ a: 0.07, b: 0.46, c: 0.035, p: 2.6, ws: q(20), hs: q(24) }), mNavy, { pos: [0, -0.48, 0] });
  part(sw, new THREE.CylinderGeometry(0.078, 0.078, 0.05, q(20)), mGold, { pos: [0, -0.06, 0], scl: [1, 1, 0.55] });
  part(sw, blob({ a: 0.06, b: 0.07, c: 0.04, p: 2.4, ws: q(16), hs: q(12) }), mGold, { pos: [0, -0.9, 0] });
  // 手に持つ剣：にぎりは こぶしを前後につらぬき、刃は前（少し上向き）へ
  const held = group(hands.R, 'heldSword', [0, 0, 0.02], [-0.6, 0, 0]);
  const mBlade = S('#e9eef6', { metal: true });
  part(held, new THREE.CapsuleGeometry(0.032, 0.26, q(4), q(12)), mGold, { pos: [0, 0, 0.13], rot: [0, 0, Math.PI / 2] });
  part(held, new THREE.CylinderGeometry(0.03, 0.033, 0.22, q(14)), mGrip, { rot: [Math.PI / 2, 0, 0], outline: 0 });
  part(held, new THREE.SphereGeometry(0.048, q(16), q(12)), mGold, { pos: [0, 0, -0.14] });
  part(held, blob({
    a: 0.055, b: 0.42, c: 0.016, p: 2.2, ws: q(16), hs: q(24),
    deform(v) { if (v.y > 0.22) v.x *= Math.max(0.05, (0.42 - v.y) / 0.2); }, // 先をとがらせる
  }), mBlade, { pos: [0, 0, 0.58], rot: [Math.PI / 2, 0, 0] });
  held.visible = false;

  /* ---------- 顔：ぽっちゃりしたほっぺ ---------- */
  const faceGeo = blob({
    a: 0.5, b: 0.43, c: 0.44, p: 2.6, ws: q(72), hs: q(48),
    deform(v, n) {
      const low = smooth(0.1, -0.75, n.y);
      v.x *= 1 + 0.09 * low;
      v.z *= 1 + 0.07 * low * Math.max(0, n.z);
    },
  });
  // 顔の表面の前後位置（メガネや鼻を顔にそわせて置くため）
  const probe = new THREE.Mesh(faceGeo, mSkin), ray = new THREE.Raycaster();
  probe.updateMatrixWorld();
  const surfZ = (x, y) => {
    ray.set(new THREE.Vector3(x, y, 2), new THREE.Vector3(0, 0, -1));
    const hit = ray.intersectObject(probe, false)[0];
    return hit ? hit.point.z : 0.3;
  };
  part(head, faceGeo, mSkin, { pos: [0, FACE_Y, 0] });
  part(head, frontDecal(faceGeo, { extent: FACE_EXTENT }), face.decalMat, { pos: [0, FACE_Y, 0], outline: 0 });
  part(head, blob({ a: 0.05, b: 0.046, c: 0.042, p: 2.1, ws: q(20), hs: q(14) }), mNose, { pos: [0, FACE_Y - 0.19, surfZ(0, -0.19) + 0.012], outline: 0.6 });

  /* ---------- 丸メガネ（濃いサングラス） ---------- */
  const LENS_Y = -0.035; // 顔の中心から見たレンズの高さ
  const glasses = group(head, 'glasses', [0, FACE_Y + LENS_Y, 0]);
  const RIM = 0.135, lensGeo = lensGeometry(RIM - 0.006);
  const z0 = surfZ(0.2, LENS_Y) + 0.035;
  for (const s of [1, -1]) {
    const lg = group(glasses, 'lens', [s * 0.2, 0, z0], [0, s * 0.2, 0]);
    part(lg, lensGeo, face.lensMat, { outline: 0 });
    part(lg, new THREE.TorusGeometry(RIM, 0.02, q(12), q(56)), mGold, { pos: [0, 0, 0.004], outline: 0.8 });
    const temple = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.33, 0.02, z0 - 0.03),
      new THREE.Vector3(s * 0.43, 0.035, 0.3),
      new THREE.Vector3(s * 0.5, 0.045, 0.14),
      new THREE.Vector3(s * 0.52, 0.05, -0.05),
    ]);
    part(glasses, new THREE.TubeGeometry(temple, q(20), 0.012, q(8), false), mGold, { outline: 0.6 });
  }
  const zb = z0 + 0.027;
  const bridge = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.072, 0.03, zb), new THREE.Vector3(0, 0.062, zb + 0.012), new THREE.Vector3(0.072, 0.03, zb));
  part(glasses, new THREE.TubeGeometry(bridge, q(16), 0.013, q(8), false), mGold, { outline: 0.6 });

  /* ---------- 金髪のおかっぱ（前髪・横・後ろの長さをぐるりとそろえる） ---------- */
  const cutFront = BANGS - HAIR_Y;
  part(head, blob({
    a: 0.55, b: 0.58, c: 0.51, p: 2.35, ws: q(72), hs: q(48),
    deform(v) {
      if (v.y < cutFront) v.y = cutFront;
    },
  }), mHair, { pos: [0, HAIR_Y, -0.01] });

  /* ---------- とがった耳（先が細く、丸みがある） ---------- */
  for (const s of [1, -1]) {
    const ear = group(head, 'ear', [s * 0.4, 0.34, -0.05], [-0.08, s * 0.12, -s * 0.7]);
    part(ear, earGeometry(0.46, 0.31, 0.075), mSkin);
    part(ear, earGeometry(0.32, 0.19, 0.04, 0.3), mEarIn, { pos: [0, 0.11, 0.035], outline: 0.5 });
  }

  const glassesY = glasses.position.y;
  const props = {
    // 'back'＝背中にしまう／'hand'＝右手に持つ
    setSword(mode) {
      held.visible = mode === 'hand';
      hilt.visible = mode !== 'hand';
    },
    // メガネのずれ（0＝ふつう、1＝鼻の上までずれる）
    setGlasses(slip) {
      glasses.position.y = glassesY - 0.15 * slip;
    },
  };

  return {
    root,
    joints: J,
    face,
    props,
    dispose() {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      texs.forEach((t) => t.dispose());
      face.dispose();
    },
  };
}
