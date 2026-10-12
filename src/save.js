import { ITEMS, DISHES, LV_XP, MAX_LV, baseStats, PLACES } from './data.js';

// セーブは端末の中だけ。キーは つんつ君・2D版（dinaso-…）と重ならない名前にする
const KEY = 'naso3d-save-v1';
const DAY_MS = 86400000;

export const FAST = /[?&]fast\b/.test(location.search); // 確認用：修行が60倍で進む

export function dayIdx(d = new Date()) {
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / DAY_MS);
}

function fresh() {
  return {
    v: 1,
    gold: 30,
    inv: {}, // 食材の数
    bag: {}, // 作ったなそ飯の数
    seen: { item: {}, dish: {}, mon: {} }, // ずかん
    xp: 0,
    lv: 1,
    trainAt: Date.now(),
    today: null, // { day, dish } その日に食べた なそ飯
    firstDay: null,
    lastDay: null,
    openDays: 0,
    lastOpenTs: 0,
    picks: null, // { day, place, spots: [...] } その日の採れるもの
  };
}

function load() {
  const s = fresh();
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (o && o.v === 1) {
      for (const k of Object.keys(s)) if (o[k] !== undefined && o[k] !== null) s[k] = o[k];
      s.seen = { item: {}, dish: {}, mon: {}, ...(o.seen || {}) };
    }
  } catch (e) { /* こわれていたら はじめから */ }
  return s;
}

export const SV = load();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(SV)); } catch (e) { /* 保存できなくても遊べる */ }
}

/* ---------- もちもの ---------- */
export function addItem(id, n = 1) {
  SV.inv[id] = (SV.inv[id] || 0) + n;
  if (SV.inv[id] <= 0) delete SV.inv[id];
  if (n > 0) SV.seen.item[id] = (SV.seen.item[id] || 0) + n;
}
export function addDish(id, n = 1) {
  SV.bag[id] = (SV.bag[id] || 0) + n;
  if (SV.bag[id] <= 0) delete SV.bag[id];
}
export function addGold(n) {
  SV.gold = Math.max(0, SV.gold + n);
}

/* ---------- その日の力（なそ飯） ---------- */
export function todayPower() {
  const t = SV.today;
  if (!t || t.day !== dayIdx() || !DISHES[t.dish]) return null;
  return { dish: t.dish, ...DISHES[t.dish].power };
}
export function eatToday(dishId) {
  SV.today = { day: dayIdx(), dish: dishId };
}
export function stats() {
  const b = baseStats(SV.lv), p = todayPower() || {};
  return {
    maxHp: b.maxHp + (p.hp || 0),
    atk: b.atk + (p.atk || 0),
    def: b.def + (p.def || 0),
    gold: p.gold || 1,
    train: p.dish ? Math.max(1.5, p.train || 1.5) : 1, // なそ飯を食べた日は 修行がはかどる
  };
}

/* ---------- 修行（時間でたまる） ---------- */
export const TRAIN_PER_HOUR = 6;

// けいけんを足して、上がったレベルを返す
export function addXp(n) {
  const before = SV.lv;
  SV.xp += n;
  while (SV.lv < MAX_LV && SV.xp >= LV_XP[SV.lv + 1]) SV.lv++;
  const ups = [];
  for (let l = before + 1; l <= SV.lv; l++) ups.push(l);
  return ups;
}

// 前回から今までの修行をまとめて足す（閉じていた間も、最大24時間ぶん）
export function accrueTraining(now = Date.now()) {
  const hours = Math.min(24, Math.max(0, (now - SV.trainAt) / 3600000)) * (FAST ? 60 : 1);
  SV.trainAt = now;
  const gain = hours * TRAIN_PER_HOUR * stats().train;
  const ups = addXp(gain);
  return { gain, ups, hours };
}

export function xpInfo() {
  const cur = LV_XP[SV.lv], next = SV.lv < MAX_LV ? LV_XP[SV.lv + 1] : null;
  return { lv: SV.lv, xp: Math.floor(SV.xp), cur, next, rate: next ? (SV.xp - cur) / (next - cur) : 1 };
}

export function placeOpen(p) {
  return p.ready && SV.lv >= p.lv;
}
export function placesOpenedAt(lv) {
  return PLACES.filter((p) => p.lv === lv);
}

/* ---------- ひらいた日の記録 ---------- */
export function recordOpen() {
  const t = dayIdx(), now = Date.now();
  const first = SV.firstDay === null;
  const hours = SV.lastOpenTs ? (now - SV.lastOpenTs) / 3600000 : 0;
  const absence = SV.lastDay === null ? 0 : t - SV.lastDay;
  if (first) SV.firstDay = t;
  if (SV.lastDay !== t) { SV.openDays++; SV.lastDay = t; }
  SV.lastOpenTs = now;
  return { first, hours, absence, openDays: SV.openDays };
}

export function itemName(id) {
  return (ITEMS[id] || DISHES[id] || { name: id }).name;
}
