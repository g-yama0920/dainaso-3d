import * as THREE from 'three';

// 雨と雪。島の上だけに降らせる（軽さのため、数は少なめ）
export function createWeather(kind, R) {
  if (kind !== 'rain' && kind !== 'snow') return null;
  const H = 5.5, N = kind === 'rain' ? 220 : 160;
  const xs = new Float32Array(N), zs = new Float32Array(N), ys = new Float32Array(N), ph = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = Math.sqrt(Math.random()) * (R + 0.3), a = Math.random() * Math.PI * 2;
    xs[i] = Math.cos(a) * r; zs[i] = Math.sin(a) * r; ys[i] = Math.random() * H; ph[i] = Math.random() * 6;
  }
  let obj, pos, mat, tex = null;
  if (kind === 'rain') {
    pos = new Float32Array(N * 6);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    mat = new THREE.LineBasicMaterial({ color: '#a9c4e0', transparent: true, opacity: 0.65, depthWrite: false });
    obj = new THREE.LineSegments(g, mat);
  } else {
    pos = new Float32Array(N * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const x = c.getContext('2d'), rg = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = rg; x.fillRect(0, 0, 32, 32);
    tex = new THREE.CanvasTexture(c);
    mat = new THREE.PointsMaterial({ size: 0.12, map: tex, transparent: true, depthWrite: false });
    obj = new THREE.Points(g, mat);
  }
  obj.frustumCulled = false;
  obj.raycast = () => {};
  const speed = kind === 'rain' ? 7 : 0.7;
  function update(dt, t) {
    for (let i = 0; i < N; i++) {
      ys[i] -= speed * dt;
      if (ys[i] < 0) ys[i] += H;
      if (kind === 'rain') {
        pos.set([xs[i], ys[i], zs[i], xs[i] + 0.03, ys[i] + 0.28, zs[i]], i * 6);
      } else {
        pos.set([xs[i] + 0.15 * Math.sin(t * 0.8 + ph[i]), ys[i], zs[i] + 0.12 * Math.cos(t * 0.7 + ph[i])], i * 3);
      }
    }
    obj.geometry.attributes.position.needsUpdate = true;
  }
  update(0, 0);
  return {
    obj, update,
    dispose() { obj.removeFromParent(); obj.geometry.dispose(); mat.dispose(); if (tex) tex.dispose(); },
  };
}
