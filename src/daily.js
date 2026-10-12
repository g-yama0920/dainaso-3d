import { dayIdx } from './save.js';
import { PLACES } from './data.js';

// 日ごとに決まるもの（天気・季節・日替わり品・今日のおすすめ）。同じ日なら何度開いても同じになる。
export function hash(n) {
  let x = (n * 2654435761) >>> 0;
  x ^= x >>> 16; x = Math.imul(x, 2246822507) >>> 0; x ^= x >>> 13;
  return x >>> 0;
}
export function rng(seed) {
  let s = hash(seed) || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

export function season(d = new Date()) {
  const m = d.getMonth();
  return m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter';
}

export function weather(day = dayIdx(), d = new Date()) {
  const r = hash(day * 7 + 3) % 100;
  const wet = r < 25, cloudy = r < 45;
  if (wet) return season(d) === 'winter' ? 'snow' : 'rain';
  return cloudy ? 'cloudy' : 'sunny';
}

// 時間帯：0=夜中 1=朝 2=昼 3=夕方 4=夜
export function timeBand(d = new Date()) {
  const h = d.getHours();
  return h < 5 ? 0 : h < 9 ? 1 : h < 17 ? 2 : h < 19 ? 3 : 4;
}

const DAILY = { forest: ['berry', 'acorn', 'mint'] };
export function dailyItem(place, day = dayIdx()) {
  const list = DAILY[place] || [];
  return list.length ? list[hash(day * 13 + place.length) % list.length] : null;
}

// 今日のおすすめ：ひらいている箱庭の中から日替わりで1つ
export function recommended(openIds, day = dayIdx()) {
  const ids = PLACES.map((p) => p.id).filter((id) => openIds.includes(id));
  return ids.length ? ids[hash(day * 31 + 5) % ids.length] : null;
}
