# だいなそー 3D

なそといっしょに箱庭をおさんぽして、食材を見つけて、魔物とたたかって、なそ飯をつくって、強くなるスマホ向けアプリ。
2D版「だいなそー」（g-yama0920/dainaso）を、Three.js で3Dとして一から作り直したもの。指示書は [SPEC.md](SPEC.md)。

- 公開URL（予定）: https://g-yama0920.github.io/dainaso-3d/
- ホーム画面に追加すると、アプリのように使える（オフラインでも開ける）。
- 確認用：URL の最後に `?fast` をつけると、修行が60倍の速さでたまる（1分 → 1時間ぶん）。

## いまできること（第1段階：いえ＋森で ひと回り）

- **いえ**：家・かまど・わら人形・立て札の箱庭。なそが自分で歩きまわり、修行や料理をする。なそをタップすると照れる・ハイタッチ・メガネがずれる。
- **おでかけ**：森でなそが歩きまわり、見つけると教えてくれる。タップで拾う。日替わり品あり。今日のおすすめは採れる数が多い。
- **バトル**：たたかう・なそ飯・とくぎ・にげる。負けても何も失わない。
- **りょうり**：食材2つで なそ飯。レシピはずかんにたまる。ひじき・あやしいキノコは なそがこまる（食材はへらない）。
- **たべる**：その日の力がつき、修行がはかどる。
- **修行**：時間でたまる（閉じている間も、最大24時間ぶん）。レベルでとくぎを覚え、箱庭がひらく。
- **ずかん・おみせ**、天気（雨・雪）と季節と時間帯で見た目が変わる、8ビット風の効果音、セーブ、オフライン。

## ファイル

| 場所 | 中身 |
|---|---|
| `index.html` | 画面とデザイン。Three.js は `vendor/` から読む |
| `src/main.js` | ぜんぶをつなぐ本体（いえ⇔おさんぽ、料理、タップ、お祝い） |
| `src/stage.js` | 描画・カメラ・光。ふだんは30fpsで電池を守る |
| `src/actor.js` / `src/brains.js` | なそを歩かせる係／いえとおさんぽでの過ごし方 |
| `src/battle.js` | コマンド式バトル |
| `src/data.js` | 食材・なそ飯・魔物・とくぎ・箱庭・おみせの中身（数値の調整はここ） |
| `src/save.js` / `src/daily.js` | セーブと修行／日替わり（天気・季節・採れるもの・おすすめ） |
| `src/lines.js` | なそのセリフ（第1段階のぶん） |
| `src/ui.js` / `src/screens.js` / `src/icons.js` | 画面の部品／シートの中身／食材の絵 |
| `src/sound.js` | 効果音（2D版の音を引きつぐ） |
| `src/world/` | 箱庭（いえ・森）、小物、拾うもの、魔物、天気 |
| `src/naso/` | なそのモデル・動き・表情 |
| `sw.js` / `manifest.webmanifest` / `icons/` | オフラインとホーム画面用 |
| `tools/build_sw.py` | オフライン用のファイル一覧と版を更新する（公開の前に実行） |
| `tools/build_artifact.py` | 確認用の非公開ページ（claude.ai）向けに切り出す |

## なそのモデルを差し替えるとき（Blender の glTF など）

`src/naso/model-proto.js` の `buildProtoModel()` と同じ形のオブジェクトを返す読み込み関数を作り、`src/naso/index.js` で差し替える。

- `root` … 全体
- `joints` … 動かす関節。名前は `root, hips, spine, head, shoulderL, shoulderR, armL, armR, foreL, foreR, legL, legR`
  （L＝なその左手側＝正面から見て右。ボーンをこの名前にすると、`animator.js` の動きがそのまま使える）
- `face.set({ eyes, mouth, brows, bare })` … 表情
- `props.setSword('back' | 'hand')`・`props.setGlasses(0〜1)` … 剣の持ち方・メガネのずれ
- `dispose()` … 片づけ

大きさは「足元が y=0、正面が +z、身長およそ 2.0」にそろえる。

## 決めごと

- つんつ君（g-yama0920/tuntu）と2D版（g-yama0920/dainaso）は変更しない。
- セーブは `naso3d-` で始まる名前（`naso3d-save-v1`・`naso3d-snd`）。オフライン用キャッシュも `naso3d-` で始める（2D版の sw.js が消す `dinaso-` とは別）。
- サーバー・アカウント・AI・課金・広告は使わない。

## 公開するとき

```bash
python3 tools/build_sw.py
```

そのあと GitHub に送る（`git push`）。GitHub Pages が数分で更新する。
