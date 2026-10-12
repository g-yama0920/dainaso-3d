import * as THREE from 'three';
import { C } from './palette.js';

// 塗りは2種類。
//   'toon' … アニメ塗り（3段の影）＋濃い茶色の輪郭線。2D版にいちばん近い。
//   'soft' … やわらかい立体（フィギュア風）。輪郭線なし。
let gradientTex = null;
function toonGradient() {
  if (!gradientTex) {
    gradientTex = new THREE.DataTexture(new Uint8Array([105, 185, 255]), 3, 1, THREE.RedFormat);
    gradientTex.minFilter = gradientTex.magFilter = THREE.NearestFilter;
    gradientTex.generateMipmaps = false;
    gradientTex.needsUpdate = true;
  }
  return gradientTex;
}

export function surface(style, color, { map = null, metal = false, rough = 0.6, side = THREE.FrontSide } = {}) {
  if (style === 'toon') return new THREE.MeshToonMaterial({ color, map, side, gradientMap: toonGradient() });
  return new THREE.MeshStandardMaterial({ color, map, side, metalness: metal ? 0.7 : 0, roughness: metal ? 0.3 : rough });
}

// 輪郭線：裏返した外殻を、画面上で一定の太さ（CSS px）だけ外へずらして描く。
// 縦長の画面でも縦横の太さがそろうよう、解像度で割ってから戻す。
export const outlineUniforms = {
  uOutlinePx: { value: 3 },
  uResolution: { value: new THREE.Vector2(1, 1) },
};
const outlineMats = new Map();
export function outlineMaterial(scale = 1) {
  let m = outlineMats.get(scale);
  if (m) return m;
  m = new THREE.MeshBasicMaterial({ color: C.ink, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uOutlinePx = outlineUniforms.uOutlinePx;
    sh.uniforms.uResolution = outlineUniforms.uResolution;
    sh.vertexShader = 'uniform float uOutlinePx;\nuniform vec2 uResolution;\n' + sh.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
  vec2 oDir = ( normalMatrix * normal ).xy;
  float oLen = length( oDir );
  oDir = oLen > 1e-5 ? oDir / oLen : vec2( 0.0 );
  gl_Position.xy += oDir * ( 2.0 * uOutlinePx * ${scale.toFixed(2)} ) / uResolution * gl_Position.w;`
    );
  };
  m.customProgramCacheKey = () => 'naso-outline-' + scale;
  outlineMats.set(scale, m);
  return m;
}
