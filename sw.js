// だいなそー3D：オフラインでも開けるようにする。
// ファイル一覧と版は tools/build_sw.py が書きかえる（手で直さない）。
// つんつ君・2D版（dinaso-…）と同じドメインなので、消すのは「naso3d-」で始まる自分のキャッシュだけ。
var VERSION = "naso3d-v202610130108";
var FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "src/actor.js",
  "src/battle.js",
  "src/brains.js",
  "src/daily.js",
  "src/data.js",
  "src/icons.js",
  "src/lines.js",
  "src/main.js",
  "src/naso/animator.js",
  "src/naso/face.js",
  "src/naso/geom.js",
  "src/naso/index.js",
  "src/naso/materials.js",
  "src/naso/model-proto.js",
  "src/naso/palette.js",
  "src/naso/textures.js",
  "src/save.js",
  "src/screens.js",
  "src/sound.js",
  "src/stage.js",
  "src/ui.js",
  "src/world/diorama.js",
  "src/world/forest.js",
  "src/world/home.js",
  "src/world/items3d.js",
  "src/world/kit.js",
  "src/world/monsters.js",
  "src/world/props.js",
  "src/world/weather.js",
  "vendor/three/addons/controls/OrbitControls.js",
  "vendor/three/addons/geometries/RoundedBoxGeometry.js",
  "vendor/three/addons/utils/BufferGeometryUtils.js",
  "vendor/three/three.module.min.js"
];
var FONT_CACHE = "naso3d-fonts";

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) {
      return Promise.all(FILES.map(function (f) { return c.add(new Request(f, { cache: "reload" })); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k.indexOf("naso3d-") === 0 && k !== VERSION && k !== FONT_CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var u = new URL(e.request.url);
  // 書体（Google Fonts）は一度読んだら端末にとっておく
  if (u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONT_CACHE).then(function (c) {
      return c.match(e.request).then(function (hit) {
        return hit || fetch(e.request).then(function (r) { c.put(e.request, r.clone()); return r; });
      });
    }));
    return;
  }
  if (u.origin !== location.origin) return;
  // 自分のファイル：まず通信で新しいものを取り、だめなら保存しておいたものを使う
  e.respondWith(
    fetch(e.request, { cache: "no-cache" }).then(function (r) {
      var cp = r.clone();
      caches.open(VERSION).then(function (c) { c.put(e.request, cp); });
      return r;
    }).catch(function () {
      return caches.open(VERSION).then(function (c) {
        return c.match(e.request, { ignoreSearch: true }).then(function (m) { return m || c.match("index.html"); });
      });
    })
  );
});
