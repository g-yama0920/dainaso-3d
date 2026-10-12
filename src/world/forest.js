import { Diorama } from './diorama.js';
import { StaticBatch } from './kit.js';
import * as P from './props.js';
import { rng } from '../daily.js';

// 森の箱庭：まわりを木がかこみ、まん中が広場。木の配置は毎日同じ、採れるものの場所は日替わり。
export function buildForest({ season, weather }) {
  const d = new Diorama({ R: 3.4, weather });
  const b = new StaticBatch();
  P.island(b, d.R, season);
  const r = rng(424242);

  const N = 13;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + r() * 0.3, rr = 2.6 + r() * 0.35, s = 0.85 + r() * 0.4;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (i % 3 === 0) P.pineTree(b, x, z, s * 1.1, season);
    else P.roundTree(b, x, z, s, season, i);
    d.block(x, z, 0.38 * s);
  }
  [[-0.95, 0.85, 1.05], [1.05, -0.7, 0.9]].forEach(([x, z, s], i) => {
    P.roundTree(b, x, z, s, season, i + 2);
    d.block(x, z, 0.4 * s);
  });
  P.log(b, 0.2, 1.7, 0.4); d.block(0.2, 1.7, 0.45);
  P.rock(b, -1.7, -0.9, 1.1, 0.7); d.block(-1.7, -0.9, 0.45);
  P.rock(b, 1.9, 0.8, 0.8, 1.9); d.block(1.9, 0.8, 0.32);
  P.bush(b, -1.9, 1.3, 1, season); d.block(-1.9, 1.3, 0.35);
  P.bush(b, 0.6, -1.95, 0.9, season); d.block(0.6, -1.95, 0.32);
  [[-1.2, -1.9, '#d9573f'], [-1.0, -2.05, '#e8a23a'], [1.6, 1.6, '#d9573f'], [-0.4, 2.2, '#c98d5a']].forEach(([x, z, c]) => P.decoMushroom(b, x, z, 1, c));
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2, rr = 0.8 + r() * 1.8;
    P.grassTuft(b, Math.cos(a) * rr, Math.sin(a) * rr, P.SEASON[season].crown[1]);
  }
  if (season !== 'winter') {
    [[-0.3, -1.5, '#ffffff'], [1.4, -1.5, '#ffd84a'], [-1.4, 0.2, '#f39bb5'], [2.1, -0.4, '#ffffff']].forEach(([x, z, c]) => P.flower(b, x, z, c));
  }
  d.addStatic(b);

  // 採れるものを置ける場所（なそが歩いて行ける所）
  d.spotCandidates = [];
  const rr2 = rng(777);
  for (let i = 0; i < 300 && d.spotCandidates.length < 12; i++) {
    const a = rr2() * Math.PI * 2, rad = 0.6 + Math.sqrt(rr2()) * 1.9;
    const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
    if (!d.walkable(x, z, 0.45)) continue;
    if (d.spotCandidates.some((p) => Math.hypot(p.x - x, p.z - z) < 0.75)) continue;
    d.spotCandidates.push({ x, z });
  }
  return d;
}
