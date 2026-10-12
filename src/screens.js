// シートの中身（りょうり・たべる・なそのようす・おでかけ・ずかん・おみせ）
import { ITEMS, DISHES, DISH_ORDER, MONSTERS, SKILLS, PLACES, SHOP } from './data.js';
import { SV, stats, todayPower, xpInfo, placeOpen, TRAIN_PER_HOUR } from './save.js';
import { iconSvg } from './icons.js';
import { esc } from './ui.js';

const count = (n) => `<span class="n">×${n}</span>`;

// りょうり：食材を2つえらぶ
export function cookBody(sel) {
  const ids = Object.keys(ITEMS).filter((id) => (SV.inv[id] || 0) > 0);
  if (!ids.length) {
    return `<p class="empty">しょくざいが まだ ないよ。<br>「おでかけ」で 森へ さがしに行くか、「おみせ」で 買ってこようね。</p>`;
  }
  const used = (id) => sel.filter((x) => x === id).length;
  const cells = ids.map((id) => {
    const left = SV.inv[id] - used(id);
    return `<button type="button" class="cell${used(id) ? ' on' : ''}" data-act="pick" data-id="${id}"${left <= 0 || sel.length >= 2 ? ' disabled' : ''}>
      ${iconSvg(id, 44)}<b>${esc(ITEMS[id].name)}</b>${count(left)}</button>`;
  }).join('');
  const slot = (i) => sel[i]
    ? `<button type="button" class="slot full" data-act="unpick" data-i="${i}">${iconSvg(sel[i], 36)}<small>${esc(ITEMS[sel[i]].name)}</small></button>`
    : `<div class="slot">？</div>`;
  return `<div class="pot">${slot(0)}<span class="plus">＋</span>${slot(1)}
      <button type="button" class="go" data-act="cook"${sel.length === 2 ? '' : ' disabled'}>つくる</button></div>
    <p class="note">しょくざいを 2つ えらんでね。おなじものを 2つでも いいよ。</p>
    <div class="grid">${cells}</div>`;
}

// たべる：作ったなそ飯
export function eatBody() {
  const ids = DISH_ORDER.filter((id) => (SV.bag[id] || 0) > 0);
  const p = todayPower();
  const head = p
    ? `<p class="note">きょうの力：<b>${esc(DISHES[p.dish].name)}</b>（${esc(DISHES[p.dish].text)}）。べつの なそ飯を たべると、入れかわるよ。</p>`
    : `<p class="note">なそ飯を たべると、その日の力が つくよ。しゅぎょうも はかどるんだ。</p>`;
  if (!ids.length) return head + `<p class="empty">なそ飯が まだ ないよ。「りょうり」で つくろうね。</p>`;
  return head + `<div class="list">${ids.map((id) => `
    <button type="button" class="row" data-act="eat" data-id="${id}">${iconSvg(id, 44)}
      <span><b>${esc(DISHES[id].name)}</b> ${count(SV.bag[id])}<small>回復 ${DISHES[id].heal}・${esc(DISHES[id].text)}</small></span>
      <em>たべる</em></button>`).join('')}</div>`;
}

// なそのようす（修行・強さ）
export function statusBody() {
  const x = xpInfo(), s = stats(), p = todayPower();
  const bar = `<div class="xp"><i style="width:${Math.round(x.rate * 100)}%"></i></div>`;
  const next = x.next ? `つぎの レベルまで あと ${Math.ceil(x.next - SV.xp)}` : 'いまは これが さいこうレベル';
  const skills = SKILLS.map((k) => `<li class="${SV.lv >= k.lv ? 'got' : ''}"><b>${SV.lv >= k.lv ? esc(k.name) : '？？？'}</b><small>${SV.lv >= k.lv ? esc(k.desc) : `Lv${k.lv}で おぼえる`}</small></li>`).join('');
  const nextPlace = PLACES.find((pl) => !placeOpen(pl));
  return `<div class="stat-top"><div class="lvbig">Lv<b>${x.lv}</b></div>
      <div class="stat-xp">${bar}<small>けいけん ${x.xp}　${next}</small></div></div>
    <dl class="stats"><div><dt>HP</dt><dd>${s.maxHp}</dd></div><div><dt>こうげき</dt><dd>${s.atk}</dd></div><div><dt>まもり</dt><dd>${s.def}</dd></div></dl>
    <p class="note">なそは いつも しゅぎょうしているよ。1時間に けいけん ${Math.round(TRAIN_PER_HOUR * s.train * 10) / 10}${s.train > 1 ? '（なそ飯で はかどり中）' : ''}。<br>
    きょうの力：${p ? `<b>${esc(DISHES[p.dish].name)}</b>（${esc(DISHES[p.dish].text)}）` : 'まだ なそ飯を たべていないよ'}</p>
    ${nextPlace ? `<p class="note">つぎの箱庭：<b>${esc(nextPlace.name)}</b>（Lv${nextPlace.lv}で ひらく${nextPlace.ready ? '' : '・じゅんびちゅう'}）</p>` : ''}
    <h3>とくぎ</h3><ul class="skills">${skills}</ul>`;
}

// おでかけ：箱庭をえらぶ
export function outingBody(rec) {
  return `<div class="places">${PLACES.map((p) => {
    const open = placeOpen(p), reached = SV.lv >= p.lv;
    const tag = open ? (p.id === rec ? '<em class="rec">きょうの おすすめ</em>' : '') : `<em>${reached ? 'じゅんびちゅう' : `Lv${p.lv}で ひらく`}</em>`;
    return `<button type="button" class="place${open ? '' : ' locked'}" data-act="go" data-id="${p.id}"${open ? '' : ' disabled'}>
      <b>${open || reached ? esc(p.name) : '？？？'}</b>${tag}<small>${open || reached ? esc(p.desc) : 'まだ ひみつ'}</small></button>`;
  }).join('')}</div>`;
}

// ずかん
export function zukanBody(tab) {
  const tabs = [['item', 'しょくざい'], ['dish', 'なそ飯'], ['mon', 'まもの']]
    .map(([k, n]) => `<button type="button" class="ztab" data-act="ztab" data-id="${k}" aria-pressed="${tab === k}">${n}</button>`).join('');
  let cells = '', total = 0, got = 0;
  if (tab === 'item') {
    const ids = Object.keys(ITEMS);
    total = ids.length;
    cells = ids.map((id) => {
      const n = SV.seen.item[id] || 0;
      if (n) got++;
      return `<div class="zcell${n ? '' : ' unknown'}">${n ? iconSvg(id, 44) : '<span class="q">？</span>'}<b>${n ? esc(ITEMS[id].name) : '？？？'}</b><small>${n ? esc(ITEMS[id].desc) : ''}</small></div>`;
    }).join('');
  } else if (tab === 'dish') {
    total = DISH_ORDER.length;
    cells = DISH_ORDER.map((id) => {
      const n = SV.seen.dish[id] || 0, D = DISHES[id];
      if (n) got++;
      const how = D.from ? D.from.map((f) => ITEMS[f].name).join('＋') : 'レシピにない くみあわせ';
      return `<div class="zcell${n ? '' : ' unknown'}">${n ? iconSvg(id, 44) : '<span class="q">？</span>'}<b>${n ? esc(D.name) : '？？？'}</b><small>${n ? esc(how + '　' + D.text) : '2つの しょくざいで つくれる'}</small></div>`;
    }).join('');
  } else {
    const ids = Object.keys(MONSTERS);
    total = ids.length;
    cells = ids.map((id) => {
      const n = SV.seen.mon[id] || 0, M = MONSTERS[id];
      if (n) got++;
      return `<div class="zcell${n ? '' : ' unknown'}"><span class="q mon">${n ? '◆' : '？'}</span><b>${n ? esc(M.name) : '？？？'}</b><small>${n ? esc(M.desc) + `<br>であった かず ${n}` : ''}</small></div>`;
    }).join('');
  }
  return `<div class="ztabs">${tabs}</div><p class="note">${got} / ${total}</p><div class="zgrid">${cells}</div>`;
}

// おみせ
export function shopBody() {
  return `<p class="note">もっているゴールド：<b>${SV.gold.toLocaleString('ja-JP')}G</b>　家具は もうすぐ 入荷するよ。</p>
    <div class="list">${SHOP.map((id) => {
    const I = ITEMS[id];
    return `<button type="button" class="row" data-act="buy" data-id="${id}"${SV.gold < I.shop ? ' disabled' : ''}>${iconSvg(id, 44)}
      <span><b>${esc(I.name)}</b> ${count(SV.inv[id] || 0)}<small>${esc(I.desc)}</small></span><em>${I.shop}G</em></button>`;
  }).join('')}</div>`;
}

