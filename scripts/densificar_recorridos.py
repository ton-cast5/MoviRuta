#!/usr/bin/env python3
"""Densifica trazados de rutas Paraíso y actualiza seed + datos.js."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Trazado denso costeiro / calles (demo anterior P2 + Centro)
COSTA = [
    [18.396143, -93.214774],
    [18.396995, -93.215210],
    [18.396254, -93.215507],
    [18.395963, -93.214854],
    [18.396509, -93.216076],
    [18.395442, -93.216682],
    [18.394707, -93.214995],
    [18.395134, -93.215968],
    [18.394876, -93.215404],
    [18.400974, -93.212598],
    [18.402061, -93.212114],
    [18.399986, -93.206631],
    [18.402806, -93.205326],
    [18.403655, -93.204993],
    [18.404971, -93.204776],
    [18.407099, -93.204880],
    [18.407552, -93.204659],
    [18.407852, -93.204282],
    [18.407964, -93.203945],
    [18.407914, -93.202469],
    [18.407708, -93.201234],
    [18.407668, -93.200094],
    [18.407966, -93.197845],
    [18.408273, -93.196826],
    [18.408669, -93.196337],
    [18.408929, -93.196198],
    [18.411829, -93.195045],
    [18.412975, -93.194078],
    [18.413363, -93.193443],
    [18.413547, -93.192515],
    [18.414326, -93.185416],
    [18.414607, -93.183598],
    [18.414663, -93.182461],
    [18.414019, -93.181005],
    [18.413756, -93.180245],
    [18.413597, -93.179442],
    [18.411818, -93.179109],
    [18.413541, -93.178611],
    [18.413229, -93.175210],
    [18.413216, -93.174630],
    [18.413388, -93.173887],
    [18.413801, -93.173259],
    [18.414187, -93.172865],
    [18.415222, -93.172119],
    [18.415895, -93.171772],
    [18.419064, -93.170777],
    [18.420154, -93.170305],
    [18.421282, -93.169698],
    [18.422120, -93.169363],
    [18.425013, -93.167925],
    [18.426125, -93.167509],
    [18.427835, -93.167230],
    [18.428416, -93.166908],
    [18.429388, -93.166176],
    [18.430446, -93.165665],
    [18.430624, -93.165452],
    [18.430793, -93.164935],
    [18.431327, -93.161319],
    [18.429589, -93.160250],
    [18.429594, -93.158371],
    [18.429426, -93.156359],
    [18.429117, -93.155386],
    [18.430194, -93.154771],
    [18.433227, -93.153173],
]


def idx_cerca(lat: float, lng: float) -> int:
    return min(range(len(COSTA)), key=lambda i: (COSTA[i][0] - lat) ** 2 + (COSTA[i][1] - lng) ** 2)


def tramo(a: list[float], b: list[float]) -> list[list[float]]:
    i, j = idx_cerca(*a), idx_cerca(*b)
    if i <= j:
        pts = [list(p) for p in COSTA[i : j + 1]]
    else:
        pts = [list(p) for p in COSTA[i : j - 1 : -1]] if j >= 0 else [list(p) for p in COSTA[i::-1]]
    if not pts:
        return [list(a), list(b)]
    pts[0] = list(a)
    pts[-1] = list(b)
    return pts


def unir(paradas: list[list[float]]) -> list[list[float]]:
    out: list[list[float]] = []
    for k in range(len(paradas) - 1):
        seg = tramo(paradas[k], paradas[k + 1])
        if out:
            seg = seg[1:]
        out.extend(seg)
    return out


RUTAS = {
    "TAB-014-0001": unir([[18.396143, -93.214774], [18.400974, -93.212598], [18.411818, -93.179109]]),
    "TAB-014-0002": unir([[18.411818, -93.179109], [18.400974, -93.212598], [18.396143, -93.214774]]),
    "TAB-014-0003": unir([[18.402806, -93.205326], [18.411818, -93.179109], [18.433227, -93.153173]]),
}


def sql_body() -> str:
    lines = ["DELETE FROM recorrido_punto WHERE ruta_id IN ('TAB-014-0001','TAB-014-0002','TAB-014-0003');"]
    for rid, pts in RUTAS.items():
        for i, (lat, lng) in enumerate(pts, 1):
            lines.append(
                f"INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('{rid}', {i}, {lat}, {lng});"
            )
    return "\n".join(lines)


def patch_datos_js() -> None:
    path = ROOT / "web" / "assets" / "js" / "datos.js"
    text = path.read_text(encoding="utf-8")
    for rid, pts in RUTAS.items():
        lit = json.dumps(pts, separators=(",", ":"))
        # recorrido es un arreglo de pares [[lat,lng],...]; usar non-greedy hasta el cierre ]]
        pattern = rf"(id:\s*'{re.escape(rid)}'[\s\S]*?recorrido:\s*)\[\[[\s\S]*?\]\]"
        text2, n = re.subn(pattern, rf"\1{lit}", text, count=1)
        if n != 1:
            raise SystemExit(f"No se pudo parchear recorrido de {rid} en datos.js (matches={n})")
        text = text2
    path.write_text(text, encoding="utf-8")
    print("datos.js actualizado")


def patch_demo_sql() -> None:
    path = ROOT / "database" / "seeds" / "demo.sql"
    if not path.exists():
        print("demo.sql no existe, se omite")
        return
    text = path.read_text(encoding="utf-8")
    # elimina inserts previos de esas rutas
    text = re.sub(
        r"INSERT INTO recorrido_punto \(ruta_id, orden, latitud, longitud\) VALUES \('(TAB-014-000[123])'[^;]*;\n?",
        "",
        text,
    )
    # añade bloque al final (o reemplaza marcador)
    bloque = "\n-- recorridos densos Paraíso\n" + sql_body() + "\n"
    if "-- recorridos densos Paraíso" in text:
        text = re.sub(r"-- recorridos densos Paraíso[\s\S]*", bloque.strip() + "\n", text, count=1)
    else:
        text = text.rstrip() + "\n" + bloque
    path.write_text(text, encoding="utf-8")
    print("demo.sql actualizado")


def main() -> None:
    for rid, pts in RUTAS.items():
        print(f"{rid}: {len(pts)} puntos")
    out = ROOT / "database" / "seeds" / "densificar_recorridos.sql"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(sql_body() + "\n", encoding="utf-8")
    print("escrito", out)
    # datos.js se reescribe con scripts/parchear_datos_recorrido.py (regex seguro).
    patch_demo_sql()


if __name__ == "__main__":
    main()
