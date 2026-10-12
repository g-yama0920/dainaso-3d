"""確認用の非公開ページ（claude.ai の Artifact）向けに index.html を切り出す。

Artifact は <!doctype>・<html>・<head>・<body> を自動でつけるので、
index.html の ARTIFACT:HEAD / ARTIFACT:BODY の範囲だけを .artifact/index.html に書き出す。
いっしょに載せるファイル（src/ と vendor/ の JS）の一覧を .artifact/files.json に書く。

使い方: python3 tools/build_artifact.py
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
src = (ROOT / "index.html").read_text(encoding="utf-8")


def region(name):
    m = re.search(r"<!-- ARTIFACT:%s[^>]*-->(.*?)<!-- /ARTIFACT:%s -->" % (name, name), src, re.S)
    if not m:
        raise SystemExit("index.html に ARTIFACT:%s の範囲がありません" % name)
    return m.group(1).strip()


out = ROOT / ".artifact"
out.mkdir(exist_ok=True)
(out / "index.html").write_text(region("HEAD") + "\n" + region("BODY") + "\n", encoding="utf-8")
files = {}
for pat in ["src/**/*.js", "vendor/**/*.js"]:
    for p in sorted(ROOT.glob(pat)):
        rel = str(p.relative_to(ROOT))
        files[rel] = rel
(out / "files.json").write_text(json.dumps(files, ensure_ascii=False, indent=1), encoding="utf-8")
print("wrote .artifact/index.html and", len(files), "files")
