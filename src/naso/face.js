import * as THREE from 'three';
import { C } from './palette.js';

// 表情。目はサングラスの奥にうっすら見えるだけ。眉と口は顔に描く。
//   eyes  : 'normal'（横長）| 'smile'（アーチ）| 'closed' | 'wide'
//   mouth : 'smile' | 'grin'（口を開けて笑う）| 'open' | 'o' | 'wavy'（こまった口）
//   brows : 'normal' | 'up' | 'sad'（こまり眉）
//   bare  : true でメガネの上に素の目を描く（メガネがずれたとき）
export const FACE_EXTENT = 1.1; // 顔の絵が受けもつ幅（顔の中心から ±0.55）

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function texOf(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function drawLens(g, eyes) {
  const S = 256, m = S / 2;
  g.clearRect(0, 0, S, S);
  const bg = g.createRadialGradient(m - 30, m - 36, 8, m, m, m + 8);
  bg.addColorStop(0, '#2d3b50'); bg.addColorStop(0.6, '#161d29'); bg.addColorStop(1, '#090c12');
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  // うっすら見える目
  g.lineCap = 'round'; g.lineJoin = 'round';
  const line = 'rgba(150,168,198,0.4)', fill = 'rgba(110,128,160,0.16)';
  if (eyes === 'normal') {
    roundRect(g, m - 60, m - 16, 120, 34, 17);
    g.fillStyle = fill; g.fill(); g.strokeStyle = line; g.lineWidth = 6; g.stroke();
    g.fillStyle = 'rgba(190,205,228,0.45)'; g.fillRect(m - 3, m - 9, 6, 20);
  } else if (eyes === 'smile') {
    g.beginPath(); g.moveTo(m - 52, m + 20); g.quadraticCurveTo(m, m - 40, m + 52, m + 20);
    g.strokeStyle = line; g.lineWidth = 12; g.stroke();
  } else if (eyes === 'closed') {
    g.beginPath(); g.moveTo(m - 52, m + 2); g.quadraticCurveTo(m, m + 14, m + 52, m + 2);
    g.strokeStyle = line; g.lineWidth = 9; g.stroke();
  } else if (eyes === 'wide') {
    g.beginPath(); g.ellipse(m, m, 34, 32, 0, 0, Math.PI * 2);
    g.fillStyle = fill; g.fill(); g.strokeStyle = line; g.lineWidth = 6; g.stroke();
    g.beginPath(); g.arc(m, m, 9, 0, Math.PI * 2); g.fillStyle = 'rgba(190,205,228,0.55)'; g.fill();
  }
  // レンズの反射（左上のうすい帯と、右下の白い点）
  g.fillStyle = 'rgba(255,255,255,0.09)';
  g.beginPath(); g.moveTo(30, 96); g.lineTo(96, 30); g.lineTo(128, 30); g.lineTo(30, 128); g.closePath(); g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(184, 186, 11, 0, Math.PI * 2); g.fill();
}

function drawFace(g, { mouth, brows, bare }) {
  const S = 512, k = S / FACE_EXTENT;
  const X = (x) => S / 2 + x * k, Y = (y) => S / 2 - y * k;
  g.clearRect(0, 0, S, S);
  g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = C.ink;
  // 眉：細く、ゆるいアーチ
  const by = brows === 'up' ? 0.03 : 0;
  g.lineWidth = 0.013 * k;
  for (const s of [-1, 1]) {
    g.beginPath();
    if (brows === 'sad') {
      g.moveTo(X(s * 0.27), Y(0.148));
      g.quadraticCurveTo(X(s * 0.19), Y(0.16), X(s * 0.1), Y(0.188));
    } else {
      g.moveTo(X(s * 0.27), Y(0.148 + by));
      g.quadraticCurveTo(X(s * 0.19), Y(0.185 + by), X(s * 0.1), Y(0.158 + by));
    }
    g.stroke();
  }
  // メガネがずれたときだけ見える、横長の目
  if (bare) {
    for (const s of [-1, 1]) {
      const cx = X(s * 0.2), cy = Y(0.05), w = 0.1 * k, h = 0.045 * k;
      g.beginPath(); g.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
      g.fillStyle = '#1d2530'; g.fill();
      g.beginPath(); g.arc(cx + w * 0.18, cy - h * 0.12, h * 0.22, 0, Math.PI * 2);
      g.fillStyle = '#ffffff'; g.fill();
    }
    g.strokeStyle = C.ink;
  }
  // 口
  const my = -0.305;
  if (mouth === 'smile') {
    g.lineWidth = 0.014 * k;
    g.beginPath(); g.moveTo(X(-0.058), Y(my)); g.quadraticCurveTo(X(0), Y(my - 0.05), X(0.058), Y(my)); g.stroke();
  } else if (mouth === 'wavy') {
    g.lineWidth = 0.012 * k;
    g.beginPath(); g.moveTo(X(-0.06), Y(my - 0.02));
    g.bezierCurveTo(X(-0.035), Y(my + 0.01), X(-0.015), Y(my + 0.01), X(0), Y(my - 0.015));
    g.bezierCurveTo(X(0.015), Y(my - 0.04), X(0.035), Y(my - 0.04), X(0.06), Y(my - 0.01));
    g.stroke();
  } else {
    g.beginPath();
    if (mouth === 'grin') {
      g.moveTo(X(-0.075), Y(my + 0.008));
      g.quadraticCurveTo(X(0), Y(my - 0.012), X(0.075), Y(my + 0.008));
      g.quadraticCurveTo(X(0.05), Y(my - 0.1), X(0), Y(my - 0.1));
      g.quadraticCurveTo(X(-0.05), Y(my - 0.1), X(-0.075), Y(my + 0.008));
    } else {
      const rx = mouth === 'o' ? 0.026 : 0.045, ry = mouth === 'o' ? 0.03 : 0.042;
      g.ellipse(X(0), Y(my - 0.03), rx * k, ry * k, 0, 0, Math.PI * 2);
    }
    g.closePath();
    g.save(); g.clip();
    g.fillStyle = C.mouth; g.fillRect(0, 0, S, S);
    g.fillStyle = C.tongue; g.beginPath(); g.ellipse(X(0), Y(my - 0.085), 0.045 * k, 0.03 * k, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    g.lineWidth = 0.011 * k; g.stroke();
  }
}

export function createFace(style) {
  const lensCanvas = canvas(256, 256), faceCanvas = canvas(512, 512);
  const lensTex = texOf(lensCanvas), faceTex = texOf(faceCanvas);
  const lensMat = style === 'toon'
    ? new THREE.MeshBasicMaterial({ map: lensTex })
    : new THREE.MeshStandardMaterial({ map: lensTex, roughness: 0.08, metalness: 0 });
  const decalMat = new THREE.MeshBasicMaterial({
    map: faceTex, transparent: true, depthWrite: false, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const cur = { eyes: '', mouth: '', brows: '', bare: null };
  function set({ eyes = 'normal', mouth = 'smile', brows = 'normal', bare = false } = {}) {
    if (eyes !== cur.eyes) {
      drawLens(lensCanvas.getContext('2d'), eyes);
      lensTex.needsUpdate = true;
    }
    if (mouth !== cur.mouth || brows !== cur.brows || bare !== cur.bare) {
      drawFace(faceCanvas.getContext('2d'), { mouth, brows, bare });
      faceTex.needsUpdate = true;
    }
    Object.assign(cur, { eyes, mouth, brows, bare });
  }
  set();
  return {
    lensMat, decalMat, set,
    get current() { return { ...cur }; },
    dispose() { lensTex.dispose(); faceTex.dispose(); lensMat.dispose(); decalMat.dispose(); },
  };
}
