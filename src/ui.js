// 画面の部品（セリフ窓・お知らせ・数字・下の操作パネル・タブ・シート・バトル画面）
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export { esc };

let H = {};
export function init(handlers) {
  H = handlers;
  document.querySelectorAll('.tabs [data-tab]').forEach((b) => b.addEventListener('click', () => { if (!b.disabled) H.tab(b.dataset.tab); }));
  $('bar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (b && !b.disabled) H.bar(b.dataset.act);
  });
  $('sheet').addEventListener('click', (e) => {
    if (e.target === $('sheet') || e.target.closest('[data-close]')) { closeSheet(); return; }
    const b = e.target.closest('[data-act]');
    if (b && !b.disabled && sheetClick) sheetClick(b.dataset.act, b.dataset, b);
  });
  $('snd').addEventListener('click', () => H.sound());
}

/* ---------- 上：ステータス ---------- */
export function setHud({ lv, gold, hp, maxHp, showHp }) {
  $('hud-lv').textContent = 'Lv' + lv;
  $('gold').textContent = Number(gold).toLocaleString('ja-JP');
  $('hud-hp').hidden = !showHp;
  if (showHp) {
    $('hud-hpbar').style.width = Math.max(0, Math.min(100, (hp / maxHp) * 100)) + '%';
    $('hud-hpnum').textContent = `${Math.max(0, Math.round(hp))}/${maxHp}`;
  }
}
export function setSound(on) {
  $('snd').textContent = on ? '音 ON' : '音 OFF';
  $('snd').setAttribute('aria-pressed', String(on));
}

/* ---------- セリフ窓 ---------- */
let sayTimer = 0, sayToken = 0;
export function say(text, ms = 3400) {
  const el = $('say');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => { el.hidden = true; }, ms);
  return ++sayToken;
}
const readMs = (t) => Math.max(2600, Math.min(5200, 1400 + t.length * 110));
// いくつかのセリフを順番に。途中で別の say が来たら止める
export async function sayQueue(lines) {
  for (const t of lines) {
    const ms = readMs(t);
    const my = say(t, ms);
    await new Promise((r) => setTimeout(r, ms + 250));
    if (sayToken !== my) return;
  }
}

/* ---------- お知らせ・数字 ---------- */
export function toast(html) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = html;
  $('toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), 2200);
  setTimeout(() => el.remove(), 2700);
}
export function float(p, text, cls = 'dmg') {
  if (!p || p.behind) return;
  const el = document.createElement('div');
  el.className = 'float ' + cls;
  el.textContent = text;
  el.style.left = p.x + 'px';
  el.style.top = p.y + 'px';
  $('floats').appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

/* ---------- 下：操作パネル・タブ ---------- */
export function setBar(html) {
  $('bar').innerHTML = html;
  $('bar').hidden = !html;
}
export function setTab(name) {
  document.querySelectorAll('.tabs [data-tab]').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === name ? 'page' : 'false'));
}
export function lockTabs(on) {
  document.querySelectorAll('.tabs [data-tab]').forEach((b) => { b.disabled = on; });
}

/* ---------- シート（下から出る画面） ---------- */
let sheetClick = null, sheetId = null;
export function openSheet(id, title, body, onClick) {
  sheetId = id;
  sheetClick = onClick || null;
  $('sheet-title').textContent = title;
  $('sheet-body').innerHTML = body;
  $('sheet').hidden = false;
}
export function sheetOpen(id) {
  return !$('sheet').hidden && (!id || sheetId === id);
}
export function closeSheet() {
  $('sheet').hidden = true;
  sheetId = null;
  sheetClick = null;
  if (H.sheetClosed) H.sheetClosed();
}

/* ---------- バトル ---------- */
export function battleOpen({ name, monHp, monMax, hp, maxHp }) {
  $('bt-mon').textContent = name;
  battleUpdate({ monHp, monMax, hp, maxHp });
  $('bt-msg').textContent = '';
  $('bt-cmds').innerHTML = '';
  $('battle').hidden = false;
  $('app').classList.add('battling');
  setBar('');
  lockTabs(true);
}
export function battleUpdate({ monHp, monMax, hp, maxHp }) {
  $('bt-monhp').style.width = Math.max(0, (monHp / monMax) * 100) + '%';
  $('bt-hp').style.width = Math.max(0, (hp / maxHp) * 100) + '%';
  $('bt-hpnum').textContent = `${Math.max(0, Math.round(hp))}/${maxHp}`;
  setHud({ lv: H.lv(), gold: H.gold(), hp, maxHp, showHp: true });
}
export function battleMsg(text, ms = 900) {
  $('bt-msg').textContent = text;
  return new Promise((r) => setTimeout(r, ms));
}
export function battleClose() {
  $('battle').hidden = true;
  $('app').classList.remove('battling');
  lockTabs(false);
}
// コマンドをえらぶまで待つ
export function battleCommand({ skills, dishes }) {
  const box = $('bt-cmds');
  return new Promise((resolve) => {
    const main = () => {
      box.innerHTML = `
        <button type="button" data-c="attack">たたかう</button>
        <button type="button" data-c="eat"${dishes.length ? '' : ' disabled'}>なそ飯</button>
        <button type="button" data-c="skill"${skills.some((s) => !s.used) ? '' : ' disabled'}>とくぎ</button>
        <button type="button" data-c="run">にげる</button>`;
      $('bt-msg').textContent = 'なそは どうする？';
    };
    const sub = (kind) => {
      const list = kind === 'eat'
        ? dishes.map((d) => `<button type="button" class="wide" data-c="eat" data-id="${d.id}"><b>${esc(d.name)}</b><small>×${d.n}　回復${d.heal}・${esc(d.text)}</small></button>`)
        : skills.map((s) => `<button type="button" class="wide" data-c="skill" data-id="${s.id}"${s.used ? ' disabled' : ''}><b>${esc(s.name)}</b><small>${s.used ? 'このバトルでは つかった' : esc(s.desc)}</small></button>`);
      box.innerHTML = `<div class="sub">${list.join('')}<button type="button" class="back" data-c="back">もどる</button></div>`;
      $('bt-msg').textContent = kind === 'eat' ? 'どの なそ飯を たべる？' : 'どの とくぎを つかう？';
    };
    box.onclick = (e) => {
      const b = e.target.closest('[data-c]');
      if (!b || b.disabled) return;
      const c = b.dataset.c, id = b.dataset.id;
      if (c === 'back') { main(); return; }
      if ((c === 'eat' || c === 'skill') && !id) { sub(c); return; }
      box.onclick = null;
      box.innerHTML = '';
      resolve({ type: c, id });
    };
    main();
  });
}
