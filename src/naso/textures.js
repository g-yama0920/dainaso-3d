import * as THREE from 'three';
import { C } from './palette.js';

// 模様はすべてキャンバスに描いて貼る（画像ファイルなし）。
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
export function toTex(c, repeatX = 1) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeatX !== 1) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = repeatX; }
  return t;
}
function rng(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}
// 金の線：茶色のふち → 金 の順に重ねて、2D版のような線にする
function goldStroke(g, draw, w) {
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); draw(); g.strokeStyle = C.ink; g.lineWidth = w + 8; g.stroke();
  g.beginPath(); draw(); g.strokeStyle = C.gold; g.lineWidth = w; g.stroke();
}

// 髪：上がつむじ。なめらかな毛すじと、つやの帯（天使の輪）
export function hairTexture() {
  const W = 1024, H = 512, c = canvas(W, H), g = c.getContext('2d'), r = rng(7);
  const base = g.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, '#fde9a2');
  base.addColorStop(0.3, '#f6d064');
  base.addColorStop(0.55, '#ebbd4c');
  base.addColorStop(1, C.hairDeep);
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  const band = g.createLinearGradient(0, H * 0.12, 0, H * 0.28);
  band.addColorStop(0, 'rgba(255,249,222,0)');
  band.addColorStop(0.5, 'rgba(255,249,222,0.8)');
  band.addColorStop(1, 'rgba(255,249,222,0)');
  g.fillStyle = band; g.fillRect(0, H * 0.12, W, H * 0.16);
  g.lineCap = 'round';
  const N = 34;
  for (let i = 0; i < N; i++) {
    const x = ((i + 0.2 + r() * 0.6) / N) * W, top = H * (0.04 + r() * 0.1), bend = (r() - 0.5) * 18;
    g.strokeStyle = `rgba(176,124,44,${0.28 + r() * 0.2})`;
    g.lineWidth = 2 + r() * 1.6;
    g.beginPath(); g.moveTo(x, top);
    g.bezierCurveTo(x + bend, H * 0.25, x + bend * 0.5, H * 0.4, x, H * 0.75);
    g.stroke();
  }
  return toTex(c);
}

// 胸当て：u=0.5 が正面。vOf(y) は胴の高さ y → テクスチャの縦位置（0=下, 1=上）
export function chestTexture(vOf) {
  const W = 2048, H = 512, c = canvas(W, H), g = c.getContext('2d');
  const base = g.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, '#fbfcfe'); base.addColorStop(1, '#e9edf4');
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  const X = (du) => (0.5 + du) * W, Y = (y) => (1 - vOf(y)) * H;
  // まん中の合わせ目
  g.strokeStyle = '#aeb8c9'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(X(0), Y(0.17)); g.lineTo(X(0), Y(-0.08)); g.stroke();
  for (const s of [-1, 1]) {
    // 紋章の左右から肩へのびる金の唐草
    goldStroke(g, () => {
      g.moveTo(X(s * 0.05), Y(0.36));
      g.bezierCurveTo(X(s * 0.075), Y(0.43), X(s * 0.125), Y(0.445), X(s * 0.138), Y(0.405));
      g.bezierCurveTo(X(s * 0.146), Y(0.375), X(s * 0.12), Y(0.36), X(s * 0.112), Y(0.385));
    }, 14);
    // 下の小さなうず
    goldStroke(g, () => {
      g.moveTo(X(s * 0.07), Y(0.2));
      g.bezierCurveTo(X(s * 0.085), Y(0.25), X(s * 0.122), Y(0.245), X(s * 0.124), Y(0.215));
      g.bezierCurveTo(X(s * 0.125), Y(0.19), X(s * 0.1), Y(0.188), X(s * 0.1), Y(0.207));
    }, 11);
    // わきの留め具
    for (const y of [0.2, 0.13]) {
      g.beginPath(); g.arc(X(s * 0.16), Y(y), 15, 0, Math.PI * 2);
      g.fillStyle = C.navy; g.fill(); g.lineWidth = 5; g.strokeStyle = C.ink; g.stroke();
    }
  }
  return toTex(c);
}

// 腰の垂れ：白い板に金の縦すじ
export function skirtTexture() {
  const W = 1024, H = 256, c = canvas(W, H), g = c.getContext('2d');
  const base = g.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, '#f7f8fb'); base.addColorStop(1, '#e3e8f1');
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  const N = 10;
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * W;
    g.fillStyle = '#9aa5b8'; g.fillRect(x - 2, 0, 4, H);
    if (i < N) {
      const m = x + W / N / 2;
      g.fillStyle = C.ink; g.fillRect(m - 9, 0, 18, H);
      g.fillStyle = C.gold; g.fillRect(m - 5, 0, 10, H);
    }
  }
  return toTex(c);
}

// ベルト：こげ茶にステッチ
export function beltTexture() {
  const W = 1024, H = 64, c = canvas(W, H), g = c.getContext('2d');
  g.fillStyle = C.belt; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 0, W, 6); g.fillRect(0, H - 6, W, 6);
  g.fillStyle = C.beltStitch;
  for (const y of [H * 0.3, H * 0.7]) for (let x = 0; x < W; x += 22) g.fillRect(x, y - 1.5, 13, 3);
  return toTex(c);
}

// すその毛皮：クリーム色に短い毛の線
export function furTexture() {
  const W = 256, H = 64, c = canvas(W, H), g = c.getContext('2d'), r = rng(3);
  g.fillStyle = C.fur; g.fillRect(0, 0, W, H);
  g.strokeStyle = C.furLine; g.lineWidth = 3; g.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const x = (i / 14) * W + r() * 6, y = 6 + r() * (H - 22);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4 + r() * 3, y + 12 + r() * 4); g.stroke();
  }
  return toTex(c, 14);
}

// バックルの正面：金地に目のような刻み
export function buckleTexture() {
  const W = 256, H = 160, c = canvas(W, H), g = c.getContext('2d');
  const base = g.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, C.goldLight); base.addColorStop(1, C.gold);
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#9a6b1c'; g.lineWidth = 7; g.lineJoin = 'round';
  g.strokeRect(22, 20, W - 44, H - 40);
  g.beginPath();
  g.moveTo(58, H / 2); g.quadraticCurveTo(W / 2, 22, W - 58, H / 2); g.quadraticCurveTo(W / 2, H - 22, 58, H / 2);
  g.stroke();
  g.beginPath(); g.arc(W / 2, H / 2, 15, 0, Math.PI * 2); g.fillStyle = '#9a6b1c'; g.fill();
  return toTex(c);
}

// 地面に落ちる丸い影
export function shadowTexture() {
  const S = 256, c = canvas(S, S), g = c.getContext('2d');
  const r = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  r.addColorStop(0, 'rgba(42,29,20,0.34)');
  r.addColorStop(0.55, 'rgba(42,29,20,0.22)');
  r.addColorStop(1, 'rgba(42,29,20,0)');
  g.fillStyle = r; g.fillRect(0, 0, S, S);
  return toTex(c);
}
