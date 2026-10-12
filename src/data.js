// ゲームの中身（食材・なそ飯・魔物・とくぎ・箱庭・おみせ）。数値はさわりながら調整する。

// 食材。where＝採れる箱庭、daily＝その日だけ湧く日替わり品、shop＝おみせの値段、bad＝なそが苦手
export const ITEMS = {
  herb: { name: 'やくそう', where: 'forest', desc: 'にがいけど、げんきが出る草。旅のときも いつも持ってた。' },
  mush: { name: 'きのこ', where: 'forest', desc: '森の木かげに生える、ふつうの きのこ。スープにすると おいしい。' },
  nut: { name: '木の実', where: 'forest', desc: 'かたい からの中に、あまい実が入っている。' },
  weird: { name: 'あやしいキノコ', where: 'forest', bad: true, rare: true, desc: 'むらさき色に きいろの点。なそは にがて。' },
  berry: { name: '森いちご', daily: 'forest', desc: 'その日だけ実る、あまずっぱい いちご。' },
  acorn: { name: 'きんいろどんぐり', daily: 'forest', desc: 'その日だけ落ちている、きらきらの どんぐり。' },
  mint: { name: 'しずくハーブ', daily: 'forest', desc: 'その日だけ しずくをつける、すーっとする葉っぱ。' },
  flour: { name: 'こむぎこ', shop: 8, desc: 'パンや おかしの もと。' },
  cheese: { name: 'チーズ', shop: 12, desc: 'こくのある チーズ。とろけると しあわせ。' },
  chili: { name: 'とうがらし', shop: 10, desc: 'からい！ でも力がわく。' },
  jerky: { name: '干し肉', shop: 15, desc: '旅のおとも。かむほど あじが出る。' },
  hijiki: { name: 'ひじき', shop: 3, bad: true, desc: '体にいいらしい。でも なそは にがて。' },
};

// なそ飯。from＝2つの食材（順番は問わない）。power＝その日の力（atk/def/hp は足し算、gold/train は倍率）
export const DISHES = {
  bread: { name: '焼きたてパン', from: ['flour', 'flour'], heal: 20, power: { hp: 10 }, text: 'さいだいHPが 10 上がる' },
  soup: { name: 'きのこスープ', from: ['mush', 'herb'], heal: 25, power: { def: 2 }, text: 'まもりが 2 上がる' },
  spicy: { name: 'ピリ辛干し肉', from: ['jerky', 'chili'], heal: 20, power: { atk: 4 }, text: 'こうげきが 4 上がる（からい！）' },
  gratin: { name: 'きのこのチーズ焼き', from: ['mush', 'cheese'], heal: 30, power: { atk: 2, def: 1 }, text: 'こうげき+2・まもり+1' },
  cookie: { name: '木の実クッキー', from: ['nut', 'flour'], heal: 15, power: { atk: 1, def: 1, hp: 5 }, text: 'こうげき・まもり・HPが すこしずつ上がる' },
  tart: { name: '森いちごタルト', from: ['berry', 'flour'], heal: 30, power: { train: 2 }, text: 'しゅぎょうが とても はかどる（2ばい）' },
  dango: { name: 'どんぐりだんご', from: ['acorn', 'flour'], heal: 25, power: { gold: 1.5 }, text: 'もらえるゴールドが 1.5ばい' },
  tea: { name: 'しずくハーブティー', from: ['mint', 'herb'], heal: 60, power: { def: 1 }, text: 'たくさん回復・まもり+1' },
  jerkycheese: { name: '干し肉のチーズのせ', from: ['jerky', 'cheese'], heal: 35, power: { hp: 15 }, text: 'さいだいHPが 15 上がる' },
  makanai: { name: 'なそのまかないめし', from: null, heal: 15, power: {}, text: 'おなかが みたされる' },
};
export const DISH_ORDER = ['bread', 'soup', 'spicy', 'gratin', 'cookie', 'tart', 'dango', 'tea', 'jerkycheese', 'makanai'];

export function recipeFor(a, b) {
  for (const id of DISH_ORDER) {
    const f = DISHES[id].from;
    if (f && ((f[0] === a && f[1] === b) || (f[0] === b && f[1] === a))) return id;
  }
  return 'makanai';
}

// 魔物（すべてオリジナル）。weight＝出やすさ、drop＝[食材, 確率]
export const MONSTERS = {
  moss: { name: 'こけだま', place: 'forest', hp: 14, atk: 5, def: 1, xp: 3, gold: [4, 6], drop: ['herb', 0.4], weight: 4, desc: '森の しめった場所で ころころ転がっている、こけの かたまり。' },
  acornkid: { name: 'どんぐりこぞう', place: 'forest', hp: 18, atk: 6, def: 2, xp: 4, gold: [5, 8], drop: ['nut', 0.5], weight: 3, desc: '小えだを ふりまわす、げんきな どんぐり。' },
  trick: { name: 'いたずらキノコ', place: 'forest', hp: 22, atk: 7, def: 2, xp: 5, gold: [6, 9], drop: ['mush', 0.5], weight: 2, desc: 'にやにや笑って、ほうしを とばしてくる。' },
  owl: { name: 'ねぼけフクロウ', place: 'forest', hp: 30, atk: 9, def: 3, xp: 8, gold: [10, 14], drop: ['acorn', 0.3], weight: 1, sleepy: 0.3, desc: '昼でも ねむそう。でも つばさの一撃は 強い。' },
};

// とくぎ（1回のバトルで それぞれ1回まで）
export const SKILLS = [
  { id: 'power', lv: 2, name: 'ちからため斬り', desc: 'ちからを ためて、つよく斬る', mult: 1.8 },
  { id: 'guard', lv: 3, name: 'まもりのかまえ', desc: 'つぎの こうげきを ほとんど うけとめて、HPも すこし回復', guard: true, heal: 0.15 },
  { id: 'twin', lv: 4, name: 'つむじ斬り', desc: 'くるっと まわって 2回 斬る', hits: 2, mult: 1.0 },
  { id: 'light', lv: 6, name: 'ひかりの一閃', desc: 'グミちゃんを まもる、ひかりの一撃', mult: 2.6 },
];

// レベルに必要な けいけん（index＝レベル）
export const LV_XP = [0, 0, 30, 80, 150, 250, 380, 550, 760, 1000, 1300];
export const MAX_LV = LV_XP.length - 1;

export function baseStats(lv) {
  return { maxHp: 30 + 8 * (lv - 1), atk: 8 + 2 * (lv - 1), def: 3 + (lv - 1) };
}

// 箱庭。lv＝ひらくのに必要な なそのレベル。ready＝もう作ってあるか
export const PLACES = [
  { id: 'forest', name: '森', lv: 1, ready: true, desc: 'さいしょの おさんぽ先。やくそう・きのこ・木の実' },
  { id: 'beach', name: '海辺', lv: 5, ready: false, desc: 'あかるい 浜べ。貝や 魚が とれるらしい' },
  { id: 'cave', name: '洞窟', lv: 9, ready: false, desc: 'くらくて、宝物が ねむっている' },
  { id: 'meadow', name: '草原', lv: 13, ready: false, desc: 'ひろくて、生き物が たくさん' },
  { id: 'snow', name: '雪山', lv: 17, ready: false, desc: 'さむくて、強い魔物が いる' },
  { id: 'sky', name: '空の島', lv: 22, ready: false, desc: 'いちばん とおい、さいごの場所' },
];

export const SHOP = ['flour', 'cheese', 'chili', 'jerky', 'hijiki'];
