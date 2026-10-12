"""sw.js の「オフライン用に保存するファイル一覧」と版を書きかえる。

ファイルを足したり変えたりしたら、公開の前にこれを実行する：
    python3 tools/build_sw.py
版（naso3d-vYYYYMMDDHHMM）が変わると、みんなの端末で新しいものに入れかわる。
"""
import datetime
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
files = ["./", "index.html", "manifest.webmanifest"]
for pat in ["icons/*.png", "src/**/*.js", "vendor/**/*.js"]:
    files += sorted(str(p.relative_to(ROOT)) for p in ROOT.glob(pat))
version = "naso3d-v" + datetime.datetime.now().strftime("%Y%m%d%H%M")

sw = ROOT / "sw.js"
src = sw.read_text(encoding="utf-8")
src = re.sub(r'var VERSION = "[^"]*";', 'var VERSION = "%s";' % version, src)
src = re.sub(r"var FILES = \[[^\]]*\];", "var FILES = [\n  " + ",\n  ".join('"%s"' % f for f in files) + "\n];", src, flags=re.S)
sw.write_text(src, encoding="utf-8")
print(version, len(files), "files")
