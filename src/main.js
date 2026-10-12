import { Stage } from './stage.js';
import { Naso } from './naso/index.js';
import { Actor } from './actor.js';
import { HomeBrain, OutingBrain, walkVia } from './brains.js';
import { buildHome } from './world/home.js';
import { buildForest } from './world/forest.js';
import { buildItem, buildSparkle } from './world/items3d.js';
import { runBattle, pickMonster } from './battle.js';
import * as ui from './ui.js';
import * as scr from './screens.js';
import { ITEMS, DISHES, SKILLS, PLACES, recipeFor } from './data.js';
import {
  SV, save, dayIdx, addItem, addDish, addGold, stats, eatToday, accrueTraining, recordOpen, placeOpen, placesOpenedAt,
} from './save.js';
import { season, weather, timeBand, dailyItem, recommended, rng } from './daily.js';
import { L, pick } from './lines.js';
import { play, soundOn, setSound } from './sound.js';
import { iconSvg } from './icons.js';

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const stage = new Stage($('cv'), $('app'));
const naso = new Naso({ detail: 0.55 }); // 箱庭では小さく映るので、形は少しあらくして軽くする
const actor = new Actor(naso, stage.scene);
const env = { season: season(), weather: weather(), band: timeBand() };
stage.setAmbience(env);

let mode = 'home', world = null, brain = null, out = null, busy = false;
const pendingUps = [];
let taps = new Map();

const openIds = () => PLACES.filter(placeOpen).map((p) => p.id);
const placeName = (id) => (PLACES.find((p) => p.id === id) || { name: id }).name;

function hud() {
  ui.setHud({ lv: SV.lv, gold: SV.gold, hp: out ? out.hp : 0, maxHp: stats().maxHp, showHp: mode === 'outing' });
}

/* ---------- いえ ---------- */
function enterHome(lines = []) {
  mode = 'home';
  out = null;
  world = buildHome(env);
  stage.setWorld(world);
  actor.place(-0.35, 0.55, 0);
  naso.play('idle');
  brain = new HomeBrain(actor, world);
  taps = new Map(world.taps.map((t) => [t.obj, () => tapProp(t.kind)]));
  ui.setTab('home');
  barHome();
  hud();
  if (lines.length) ui.sayQueue(lines);
}
function barHome() {
  ui.setBar('<button type="button" data-act="cook">りょうり</button><button type="button" data-act="eat">たべる</button><button type="button" data-act="status">なそのようす</button>');
}
function tapProp(kind) {
  if (busy) return;
  play('cursor');
  if (kind === 'kamado') openCook();
  else if (kind === 'dummy') openStatus();
  else if (kind === 'sign') openOuting();
}

/* ---------- おさんぽ ---------- */
// その日の採れるもの（同じ日は同じ。拾ったものは、その日はもう出ない）
function daySpots(place) {
  const day = dayIdx();
  if (!SV.picks || typeof SV.picks !== 'object') SV.picks = {};
  let P = SV.picks[place];
  if (!P || P.day !== day || !Array.isArray(P.spots)) {
    const r = rng(day * 101 + 7);
    const cand = world.spotCandidates.map((_, i) => i);
    for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
    const bonus = recommended(openIds()) === place ? 2 : 0; // 今日のおすすめは たくさん採れる
    const daily = dailyItem(place, day);
    const fixed = [['herb', 3], ['mush', 3], ['nut', 2], ['weird', 0.6]];
    const pickFixed = () => {
      let tot = 0;
      fixed.forEach((f) => { tot += f[1]; });
      let x = r() * tot;
      for (const [id, w] of fixed) { x -= w; if (x <= 0) return id; }
      return 'herb';
    };
    const spots = cand.slice(0, Math.min(cand.length, 6 + bonus)).map((ci, k) => ({ ci, item: k < 2 && daily ? daily : pickFixed(), state: 'hidden' }));
    P = SV.picks[place] = { day, spots };
    save();
  }
  return P.spots
    .filter((d) => d.state !== 'taken' && world.spotCandidates[d.ci])
    .map((d) => ({ d, ...world.spotCandidates[d.ci], item: d.item, state: d.state, obj: null }));
}
function setSpot(s, state) {
  s.state = state;
  s.d.state = state;
  save();
}
function showItem(s, pop) {
  const g = buildItem(world.kit, s.item);
  g.add(buildSparkle(world.kit));
  g.position.set(s.x, 0, s.z);
  g.userData.born = pop ? stage.time : -10;
  world.group.add(g);
  s.obj = g;
  taps.set(g, () => pickSpot(s));
}
function pickSpot(s) {
  if (s.state !== 'shown' || mode !== 'outing') return;
  setSpot(s, 'taken');
  taps.delete(s.obj);
  s.obj.removeFromParent();
  s.obj = null;
  addItem(s.item, 1);
  out.items[s.item] = (out.items[s.item] || 0) + 1;
  save();
  play('tap');
  ui.toast(`${iconSvg(s.item, 26)}<span>${ITEMS[s.item].name}を ひろった</span>`);
  ui.say(pick(L.picked(s.item)), 2000);
  brain.picked();
  barOuting();
  if (!out.spots.some((x) => x.state !== 'taken')) setTimeout(() => { if (mode === 'outing' && !busy) ui.say(pick(L.empty), 3600); }, 2400);
}

function goOuting(place) {
  if (busy) return;
  ui.closeSheet();
  if (mode === 'outing' && out && out.place === place) return;
  mode = 'outing';
  world = buildForest(env); // 第1段階は 森だけ
  stage.setWorld(world);
  world.hub = { x: 0, z: 0.1 };
  out = { place, hp: stats().maxHp, items: {}, spots: daySpots(place) };
  taps = new Map();
  out.spots.filter((s) => s.state === 'shown').forEach((s) => showItem(s, false));
  actor.place(0, 0.9, 0);
  naso.play('idle');
  brain = new OutingBrain(actor, world, { spots: out.spots, onFind, onEncounter });
  ui.setTab('outing');
  barOuting();
  hud();
  play('ok');
  const lines = [pick(L.depart), pick(L.arrive(placeName(place)))];
  if (!out.spots.length) lines.push(pick(L.empty));
  ui.sayQueue(lines);
}
function barOuting() {
  if (!out) return;
  const n = Object.values(out.items).reduce((a, b) => a + b, 0);
  const left = out.spots.filter((s) => s.state !== 'taken').length;
  ui.setBar(`<span class="chip">${placeName(out.place)}　ひろった ${n}　のこり ${left}</span><button type="button" data-act="home">いえに かえる</button>`);
}
function onFind(s) {
  setSpot(s, 'shown');
  showItem(s, true);
  naso.play('find');
  play('sparkle');
  ui.say(pick(ITEMS[s.item].bad ? L.findBad : L.find(s.item)), 3200);
}
async function onEncounter() {
  if (busy || mode !== 'outing' || ui.sheetOpen()) return;
  busy = true;
  brain.pause();
  const res = await runBattle({ stage, actor, world, ui, out, type: pickMonster(out.place), onLevelUp: (ups) => pendingUps.push(...ups) });
  save();
  if (res === 'lose') {
    await wait(900);
    busy = false;
    returnHome(true);
    return;
  }
  stage.resetView();
  naso.play('idle');
  busy = false;
  brain.resume(1.5);
  barOuting();
  hud();
  celebrate();
}
function returnHome(tired = false) {
  if (busy) return;
  const got = out ? Object.entries(out.items) : [];
  const lines = [tired ? 'ただいま。ちょっと やすめば、また げんきに なるよ' : pick(L.home)];
  if (got.length) lines.push(`きょうは ${got.map(([id, n]) => `${ITEMS[id].name}×${n}`).join('、')}を もってかえったよ`);
  play('ok');
  enterHome(lines);
  celebrate();
}

/* ---------- 料理・食べる ---------- */
let cookSel = [];
function openCook() {
  if (mode !== 'home') return;
  cookSel = [];
  const render = () => ui.openSheet('cook', 'りょうり（かまど）', scr.cookBody(cookSel), (act, ds) => {
    if (act === 'pick' && cookSel.length < 2) { cookSel.push(ds.id); play('cursor'); render(); }
    if (act === 'unpick') { cookSel.splice(Number(ds.i), 1); render(); }
    if (act === 'cook' && cookSel.length === 2) { const [a, b] = cookSel; ui.closeSheet(); doCook(a, b); }
  });
  render();
}
async function doCook(a, b) {
  if (busy || mode !== 'home') return;
  const bad = [a, b].find((id) => ITEMS[id].bad);
  busy = true;
  brain.pause();
  actor.stop(null);
  if (bad) {
    // にがてな食べもの：こまった顔をするだけ。食材はへらない
    naso.play('troubled');
    play('oops');
    ui.say(pick(L.bad(bad)), 3200);
    await wait(2600);
    busy = false;
    brain.resume(1.5);
    return;
  }
  addItem(a, -1);
  addItem(b, -1);
  const id = recipeFor(a, b), D = DISHES[id];
  const s = world.spots.cook;
  await new Promise((res) => walkVia(actor, world, s.x, s.z, res));
  actor.face(...s.face);
  naso.play('cook');
  play('sizzle');
  ui.say(pick(L.cookStart(D.name)), 2800);
  await wait(3000);
  addDish(id, 1);
  const first = !SV.seen.dish[id];
  SV.seen.dish[id] = (SV.seen.dish[id] || 0) + 1;
  const g = first ? 20 : 3;
  addGold(g);
  save();
  hud();
  naso.play(first ? 'happy' : 'idle');
  play(first ? 'fanfare' : 'yum');
  ui.toast(`${iconSvg(id, 26)}<span>${D.name}が できた！ +${g}G</span>`);
  ui.say(pick(id === 'makanai' ? L.makanai : first ? L.newRecipe(D.name) : L.cookDone(D.name)), 3600);
  await wait(1600);
  busy = false;
  brain.resume(3);
}
function openEat() {
  if (mode !== 'home') return;
  ui.openSheet('eat', 'たべる', scr.eatBody(), (act, ds) => {
    if (act === 'eat') { ui.closeSheet(); doEat(ds.id); }
  });
}
async function doEat(id) {
  if (busy || !SV.bag[id]) return;
  busy = true;
  addDish(id, -1);
  eatToday(id);
  save();
  brain.pause();
  actor.stop(null);
  naso.play('eat');
  play('munch');
  ui.say(pick(L.eat(id)), 2600);
  await wait(2400);
  play('yum');
  naso.play('happy');
  ui.say(pick(L.ate), 3000);
  ui.toast(`<span>きょうの力：${DISHES[id].text}</span>`);
  hud();
  busy = false;
  brain.resume(2.5);
}

/* ---------- ようす・おでかけ・ずかん・おみせ ---------- */
function openStatus() {
  ui.openSheet('status', 'なそのようす', scr.statusBody());
}
function openOuting() {
  ui.setTab('outing');
  ui.openSheet('outing', 'おでかけ', scr.outingBody(recommended(openIds())), (act, ds) => {
    if (act === 'go') goOuting(ds.id);
  });
}
let zTab = 'item';
function openZukan() {
  ui.setTab('zukan');
  ui.openSheet('zukan', 'ずかん', scr.zukanBody(zTab), (act, ds) => {
    if (act === 'ztab') { zTab = ds.id; openZukan(); }
  });
}
function openShop() {
  ui.setTab('shop');
  ui.openSheet('shop', 'おみせ', scr.shopBody(), (act, ds) => {
    if (act !== 'buy') return;
    const I = ITEMS[ds.id];
    if (SV.gold < I.shop) return;
    addGold(-I.shop);
    addItem(ds.id, 1);
    save();
    play('buy');
    hud();
    openShop();
  });
}

/* ---------- レベルアップのお祝い ---------- */
function levelLines(lv) {
  const lines = [pick(L.levelUp(lv))];
  SKILLS.filter((s) => s.lv === lv).forEach((s) => lines.push(pick(L.newSkill(s.name))));
  placesOpenedAt(lv).filter((p) => p.ready).forEach((p) => lines.push(pick(L.newPlace(p.name))));
  return lines;
}
function celebrate() {
  const ups = pendingUps.splice(0);
  if (!ups.length) return;
  play('fanfare');
  if (!busy) naso.play('happy');
  ui.sayQueue(ups.flatMap(levelLines));
  hud();
}

/* ---------- タップ ---------- */
let down = null;
const canvas = $('cv');
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  const ok = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10 && performance.now() - down.t < 450;
  down = null;
  if (ok) onTap(e.clientX, e.clientY);
});
function onTap(x, y) {
  const objs = [naso.root, ...taps.keys()];
  const hits = stage.pick(x, y, objs);
  if (!hits.length) return;
  for (let o = hits[0].object; o; o = o.parent) {
    if (o === naso.root) { poke(); return; }
    if (taps.has(o)) { taps.get(o)(); return; }
  }
}
let lastPoke = '';
function poke() {
  if (busy) return;
  const k = pick(['shy', 'hifive', 'glasses'].filter((x) => x !== lastPoke));
  lastPoke = k;
  brain.pause();
  actor.stop(null);
  naso.play(k);
  play(k === 'glasses' ? 'clink' : 'tap');
  ui.say(pick(L.poke[k]), 2400);
  setTimeout(() => { if (!busy) brain.resume(1); }, 2300);
}

/* ---------- タブ・下のボタン ---------- */
ui.init({
  tab(name) {
    play('cursor');
    if (name === 'home') {
      ui.closeSheet();
      if (mode === 'outing') returnHome();
    } else if (name === 'outing') openOuting();
    else if (name === 'zukan') openZukan();
    else if (name === 'shop') openShop();
  },
  bar(act) {
    play('cursor');
    if (act === 'cook') openCook();
    else if (act === 'eat') openEat();
    else if (act === 'status') openStatus();
    else if (act === 'home') returnHome();
  },
  sheetClosed() {
    ui.setTab(mode === 'outing' ? 'outing' : 'home');
  },
  sound() {
    setSound(!soundOn);
    ui.setSound(soundOn);
  },
  lv: () => SV.lv,
  gold: () => SV.gold,
});
ui.setSound(soundOn);

/* ---------- 毎フレーム ---------- */
stage.onFrame((dt, t) => {
  actor.update(dt);
  if (brain) brain.update(dt);
  if (!out) return;
  for (const s of out.spots) {
    if (!s.obj) continue;
    const age = t - s.obj.userData.born;
    s.obj.scale.setScalar(age < 0.5 ? Math.max(0.01, Math.sin((age / 0.5) * Math.PI * 0.75) * 1.25) : 1);
    s.obj.position.y = 0.05 + 0.05 * Math.sin(t * 3 + s.x);
    s.obj.rotation.y = t * 0.8;
    const sp = s.obj.getObjectByName('sparkle');
    if (sp) sp.rotation.y = -t * 2.2;
  }
});

// 修行は時間でたまる（開いている間も1分ごとに）。時間帯の光も合わせる
function tick() {
  const r = accrueTraining();
  save();
  if (r.ups.length) { pendingUps.push(...r.ups); if (!busy) celebrate(); }
  hud();
}
setInterval(() => {
  tick();
  const b = timeBand();
  if (b !== env.band) { env.band = b; stage.setAmbience(env); }
}, 60000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { save(); return; }
  if (SV.lastDay !== dayIdx()) { location.reload(); return; } // 日がかわったら、天気や採れるものを新しく
  tick();
});

/* ---------- はじまり ---------- */
const o = recordOpen();
const rep = accrueTraining();
save();
const hello = [];
if (o.first) hello.push(...L.first, ...L.firstGuide);
else hello.push(pick(o.absence >= 2 ? L.absent : L.greet[env.band]));
if (!o.first && rep.gain >= 1) hello.push(pick(L.train(Math.floor(rep.gain))));
rep.ups.forEach((lv) => hello.push(...levelLines(lv)));
const di = dailyItem('forest');
if (di) hello.push(pick(L.hint[di]));
const rec = recommended(openIds());
if (rec) hello.push(pick(L.recommend(placeName(rec))));
enterHome();
stage.start();
naso.play(rep.ups.length ? 'happy' : 'wave');
if (rep.ups.length) play('fanfare');
setTimeout(() => ui.sayQueue(hello), 500);
$('loading').hidden = true;
window.__naso3dStarted = true;
window.__naso3d = { stage, naso, actor, SV, get world() { return world; }, get out() { return out; }, encounter: () => onEncounter() }; // 確認用

// オフラインでも開けるように（https のときだけ）
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
