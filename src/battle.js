import * as THREE from 'three';
import { MONSTERS, DISHES, SKILLS } from './data.js';
import { SV, stats, addGold, addItem, addXp, addDish, eatToday, itemName } from './save.js';
import { Monster } from './world/monsters.js';
import { L, pick } from './lines.js';
import { play } from './sound.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function pickMonster(place) {
  const list = Object.entries(MONSTERS).filter(([, m]) => m.place === place);
  let tot = 0;
  list.forEach(([, m]) => { tot += m.weight; });
  let r = Math.random() * tot;
  for (const [id, m] of list) { r -= m.weight; if (r <= 0) return id; }
  return list[0][0];
}

function damage(atk, def) {
  return Math.max(1, Math.round(atk * (0.9 + Math.random() * 0.2) - def * 0.5));
}

// コマンド式のバトル。負けても何も失わない（家にもどるだけ）。
// 結果は 'win' | 'lose' | 'escape'。out.hp（おさんぽ中のHP）を書きかえる。
export async function runBattle({ stage, actor, world, ui, out, type, onLevelUp }) {
  const M = MONSTERS[type];
  const mon = new Monster(type);
  // 魔物は なその前に出る（歩ける場所をさがす）
  let mx = actor.x, mz = actor.z;
  for (let i = 0; i < 12; i++) {
    const a = actor.heading + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.5;
    const x = actor.x + Math.sin(a) * 1.45, z = actor.z + Math.cos(a) * 1.45;
    if (world.walkable(x, z, 0.2)) { mx = x; mz = z; break; }
  }
  mon.root.position.set(mx, 0, mz);
  mon.faceTo(actor.x, actor.z);
  stage.scene.add(mon.root);
  actor.stop(null);
  actor.face(mx, mz);
  actor.naso.play('ready');
  SV.seen.mon[type] = (SV.seen.mon[type] || 0) + 1;
  play('encounter');
  stage.hiFps = true;

  // カメラを横から寄せる
  const mid = new THREE.Vector3((actor.x + mx) / 2, 0.55, (actor.z + mz) / 2);
  const line = Math.atan2(mx - actor.x, mz - actor.z);
  const cur = new THREE.Spherical().setFromVector3(stage.camera.position.clone().sub(stage.controls.target)).theta;
  const sides = [line + Math.PI / 2, line - Math.PI / 2];
  const near = (a) => Math.abs(Math.atan2(Math.sin(a - cur), Math.cos(a - cur)));
  const theta = near(sides[0]) < near(sides[1]) ? sides[0] : sides[1];
  const t = Math.tan(THREE.MathUtils.degToRad(stage.camera.fov) / 2);
  stage.focus({ target: mid, dist: Math.max(4, 3.2 / (2 * t * stage.camera.aspect)), polar: 1.1, theta: theta - 0.25 }, 0.9);
  stage.hideBetween(mid, stage.focusEnd());
  stage.controls.enabled = false; // バトル中はカメラを固定

  const updMon = (dt) => mon.update(dt);
  stage.onFrame(updMon);
  let monHp = M.hp;
  const used = {};
  let guard = false;
  const st = () => stats();
  out.hp = Math.min(out.hp, st().maxHp);
  const pos = (o, y) => stage.project(new THREE.Vector3(o.x, y, o.z));
  const hud = () => ui.battleUpdate({ monHp, monMax: M.hp, hp: out.hp, maxHp: st().maxHp });

  ui.battleOpen({ name: M.name, monHp, monMax: M.hp, hp: out.hp, maxHp: st().maxHp });
  ui.say(pick(L.encounter(type)), 2600);
  await ui.battleMsg(`${M.name}が あらわれた！`, 900);

  let result = null;
  while (!result) {
    // ---- なその番 ----
    const skills = SKILLS.filter((s) => SV.lv >= s.lv).map((s) => ({ ...s, used: !!used[s.id] }));
    const dishes = Object.keys(SV.bag).filter((id) => SV.bag[id] > 0).map((id) => ({ id, name: DISHES[id].name, n: SV.bag[id], text: DISHES[id].text, heal: DISHES[id].heal }));
    const cmd = await ui.battleCommand({ skills, dishes });

    if (cmd.type === 'run') {
      ui.say(pick(L.escape), 2200);
      await ui.battleMsg('なそは グミちゃんと いっしょに はなれた。', 900);
      mon.play('leave');
      result = 'escape';
      break;
    }

    if (cmd.type === 'eat') {
      const D = DISHES[cmd.id];
      addDish(cmd.id, -1);
      eatToday(cmd.id);
      actor.naso.play('eat');
      play('munch');
      await wait(900);
      const before = out.hp;
      out.hp = Math.min(st().maxHp, out.hp + D.heal);
      play('yum');
      ui.float(pos(actor.obj.position, 1.6), `+${out.hp - before}`, 'heal');
      hud();
      await ui.battleMsg(`なそは ${D.name}を たべた！ ${D.text}`, 1300);
      actor.naso.play('ready');
    } else {
      // たたかう／とくぎ
      const sk = cmd.type === 'skill' ? SKILLS.find((s) => s.id === cmd.id) : null;
      if (sk) used[sk.id] = true;
      if (sk && sk.guard) {
        guard = true;
        const h = Math.round(st().maxHp * sk.heal);
        out.hp = Math.min(st().maxHp, out.hp + h);
        actor.naso.play('victory');
        play('sparkle');
        ui.float(pos(actor.obj.position, 1.6), `+${h}`, 'heal');
        hud();
        await ui.battleMsg(`なそは ${sk.name}を とった！`, 1100);
        actor.naso.play('ready');
      } else {
        const hits = sk ? sk.hits || 1 : 1, mult = sk ? sk.mult : 1;
        actor.naso.play(sk ? 'skill' : 'attack');
        play('swish');
        if (sk) ui.battleMsg(`なその ${sk.name}！`, 0);
        await wait(sk ? 780 : 500);
        for (let h = 0; h < hits; h++) {
          const crit = Math.random() < 0.08;
          let d = Math.round(damage(st().atk * mult, M.def) * (crit ? 1.5 : 1));
          monHp = Math.max(0, monHp - d);
          mon.play('hurt');
          play('hit');
          ui.float(pos(mon.root.position, 1.0), String(d), crit ? 'crit' : 'dmg');
          hud();
          if (crit) ui.battleMsg('すごい いちげき！', 0);
          if (h < hits - 1) await wait(300);
        }
        await wait(420);
      }
      if (monHp <= 0) {
        // ---- 勝ち ----
        mon.play('die');
        play('win');
        const g = Math.round((M.gold[0] + Math.floor(Math.random() * (M.gold[1] - M.gold[0] + 1))) * st().gold);
        addGold(g);
        const ups = addXp(M.xp);
        let msg = `${M.name}を やっつけた！ ${g}ゴールドと けいけん ${M.xp}を てにいれた。`;
        if (M.drop && Math.random() < M.drop[1]) {
          addItem(M.drop[0], 1);
          out.items[M.drop[0]] = (out.items[M.drop[0]] || 0) + 1;
          msg += ` ${itemName(M.drop[0])}も ひろったよ。`;
        }
        actor.naso.play('victory');
        ui.say(pick(L.win), 2600);
        await ui.battleMsg(msg, 1800);
        if (ups.length) onLevelUp(ups);
        result = 'win';
        break;
      }
    }

    // ---- 魔物の番 ----
    await wait(250);
    if (M.sleepy && Math.random() < M.sleepy) {
      mon.play('sleep');
      await ui.battleMsg(`${M.name}は うとうと している…`, 1100);
      mon.play('idle');
      continue;
    }
    mon.play('attack');
    await wait(340);
    let d = damage(M.atk, st().def);
    if (guard) d = Math.max(0, Math.round(d * 0.2));
    out.hp = Math.max(0, out.hp - d);
    actor.naso.play('hurt');
    play('hurt');
    ui.float(pos(actor.obj.position, 1.5), String(d), 'hurt');
    hud();
    await ui.battleMsg(guard ? `なそは しっかり うけとめた！ ${d}の ダメージ` : `${M.name}の こうげき！ なそは ${d}の ダメージ`, 1000);
    guard = false;
    if (out.hp <= 0) {
      // ---- 負け：何も失わない ----
      play('lose');
      actor.naso.play('tired');
      mon.play('leave');
      ui.say(pick(L.lose), 3200);
      await ui.battleMsg('なそは ちょっと つかれちゃった。ひろったものは ぜんぶ もってかえれるよ。', 2200);
      result = 'lose';
    }
  }

  await wait(result === 'win' ? 500 : 700);
  ui.battleClose();
  stage.showAll();
  stage.controls.enabled = true;
  stage.hiFps = false;
  const i = stage.frameFns.indexOf(updMon);
  if (i >= 0) stage.frameFns.splice(i, 1);
  mon.dispose();
  return result;
}
