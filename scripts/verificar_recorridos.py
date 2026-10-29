#!/usr/bin/env python3
import ast
import importlib.util
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("dens", ROOT / "scripts" / "densificar_recorridos.py")
dens = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dens)
for rid, pts in dens.RUTAS.items():
    print("GEN", rid, len(pts), pts[0], "->", pts[-1])

text = (ROOT / "web" / "assets" / "js" / "datos.js").read_text(encoding="utf-8")
for m in re.finditer(r"id: '(TAB-014-000[123])'[\s\S]*?recorrido: (\[[\s\S]*?\n)", text):
    # better: extract with balanced-ish approach
    pass

for rid in ("TAB-014-0001", "TAB-014-0002", "TAB-014-0003"):
    m = re.search(rf"id: '{rid}'[\s\S]*?recorrido: (\[[\s\S]*?\]),\n", text)
    if not m:
        print("MISSING", rid)
        continue
    pts = ast.literal_eval(m.group(1))
    print("JS ", rid, len(pts), pts[0], "->", pts[-1])
