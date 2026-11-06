#!/usr/bin/env python3
"""Obtiene trazados por calles (OSRM) entre paradas demo y actualiza seed/datos/API."""
from __future__ import annotations

import importlib.util
import json
import math
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PARADAS = {
    "centro": [18.396143, -93.214774],
    "mercado": [18.400974, -93.212598],
    "terminal": [18.402806, -93.205326],
    "puerto": [18.411818, -93.179109],
    "isla": [18.433227, -93.153173],
}

CADENAS = {
    "TAB-014-0001": ["centro", "mercado", "puerto"],
    "TAB-014-0002": ["puerto", "mercado", "centro"],
    "TAB-014-0003": ["terminal", "puerto", "isla"],
}


def osrm_tramo(a: list[float], b: list[float]) -> list[list[float]]:
    path = f"{a[1]},{a[0]};{b[1]},{b[0]}"
    url = (
        f"https://router.project-osrm.org/route/v1/driving/{path}"
        "?overview=full&geometries=geojson&steps=false"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "MoviRuta/1.0"})
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.loads(r.read().decode())
    if data.get("code") != "Ok":
        raise RuntimeError(f"OSRM falló {a}->{b}: {data}")
    coords = data["routes"][0]["geometry"]["coordinates"]
    pts = [[lat, lng] for lng, lat in coords]
    if not pts:
        return [list(a), list(b)]
    pts[0] = list(a)
    pts[-1] = list(b)
    return pts


def simplificar(pts: list[list[float]], min_m: float = 18.0) -> list[list[float]]:
    """Quita puntos casi colineales muy juntos sin perder forma."""
    if len(pts) <= 2:
        return pts

    def dist(p, q):
        R = 6371000.0
        p1, p2 = math.radians(p[0]), math.radians(q[0])
        dp = math.radians(q[0] - p[0])
        dl = math.radians(q[1] - p[1])
        x = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
        return 2 * R * math.asin(math.sqrt(x))

    out = [pts[0]]
    for p in pts[1:-1]:
        if dist(out[-1], p) >= min_m:
            out.append(p)
    if dist(out[-1], pts[-1]) > 1:
        out.append(pts[-1])
    else:
        out[-1] = pts[-1]
    return out


def unir(claves: list[str]) -> list[list[float]]:
    out: list[list[float]] = []
    for i in range(len(claves) - 1):
        a, b = PARADAS[claves[i]], PARADAS[claves[i + 1]]
        seg = simplificar(osrm_tramo(a, b))
        if out:
            seg = seg[1:]
        out.extend(seg)
    return out


def generar() -> dict[str, list[list[float]]]:
    rutas = {}
    for rid, cadena in CADENAS.items():
        pts = unir(cadena)
        rutas[rid] = pts
        print(f"{rid}: {len(pts)} pts")
    return rutas


def escribir_sql(rutas: dict[str, list[list[float]]]) -> Path:
    lines = [
        "DELETE FROM recorrido_punto WHERE ruta_id IN ('TAB-014-0001','TAB-014-0002','TAB-014-0003');"
    ]
    for rid, pts in rutas.items():
        for i, (lat, lng) in enumerate(pts, 1):
            lines.append(
                "INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) "
                f"VALUES ('{rid}', {i}, {lat}, {lng});"
            )
    out = ROOT / "database" / "seeds" / "densificar_recorridos.sql"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return out


def parchear_datos(rutas: dict[str, list[list[float]]]) -> None:
    spec = importlib.util.spec_from_file_location(
        "parche", ROOT / "scripts" / "parchear_datos_recorrido.py"
    )
    # reescritura directa del bloque rutas con dens.RUTAS inyectado
    dens_path = ROOT / "scripts" / "densificar_recorridos.py"
    text = dens_path.read_text(encoding="utf-8")
    # actualiza RUTAS en densificar para que parchear_datos lo use
    # más simple: llamar la lógica de parchear aquí
    path = ROOT / "web" / "assets" / "js" / "datos.js"
    js = path.read_text(encoding="utf-8")
    import re

    r1 = json.dumps(rutas["TAB-014-0001"], separators=(",", ":"))
    r2 = json.dumps(rutas["TAB-014-0002"], separators=(",", ":"))
    r3 = json.dumps(rutas["TAB-014-0003"], separators=(",", ":"))
    bloque = f"""    rutas: [
        {{
            id: 'TAB-014-0001', linea_id: 'TAB-001-TNL', estado_clave: 'TAB', municipio_clave: '014', codigo: '1',
            nombre: 'Paraíso Centro-Puerto Ceiba', origen: 'Paraíso Centro', destino: 'Puerto Ceiba', sentido: 'ida', color: '#0DAD84',
            tarifa_edu: 8, tarifa_gral: 12, tarifa_inapam: 6, tarifa: 12, velocidad_promedio_kmh: 28, estado_servicio: 'normal', aviso: null, activa: true,
            paradas: ['TAB-014-0001', 'TAB-014-0003', 'TAB-014-0004'],
            recorrido: {r1},
        }},
        {{
            id: 'TAB-014-0002', linea_id: 'TAB-001-TNL', estado_clave: 'TAB', municipio_clave: '014', codigo: '1',
            nombre: 'Puerto Ceiba-Paraíso Centro', origen: 'Puerto Ceiba', destino: 'Paraíso Centro', sentido: 'vuelta', color: '#0DAD84',
            tarifa_edu: 8, tarifa_gral: 12, tarifa_inapam: 6, tarifa: 12, velocidad_promedio_kmh: 28, estado_servicio: 'normal', aviso: null, activa: true,
            paradas: ['TAB-014-0004', 'TAB-014-0003', 'TAB-014-0001'],
            recorrido: {r2},
        }},
        {{
            id: 'TAB-014-0003', linea_id: 'TAB-002-TCP', estado_clave: 'TAB', municipio_clave: '014', codigo: 'P1',
            nombre: 'Terminal Paraíso-La Isla', origen: 'Terminal Paraíso', destino: 'La Isla', sentido: 'ida', color: '#006C49',
            tarifa_edu: 10, tarifa_gral: 15, tarifa_inapam: 7.5, tarifa: 15, velocidad_promedio_kmh: 32, estado_servicio: 'normal', aviso: null, activa: true,
            paradas: ['TAB-014-0002', 'TAB-014-0004', 'TAB-014-0005'],
            recorrido: {r3},
        }},
    ],"""
    nuevo, n = re.subn(r"    rutas: \[[\s\S]*?\n    \],\n    viajes:", bloque + "\n    viajes:", js, count=1)
    if n != 1:
        raise SystemExit(f"No se pudo actualizar datos.js (matches={n})")
    # bump version para refrescar localStorage offline
    nuevo2, nv = re.subn(r"version:\s*\d+", lambda m: f"version: {int(m.group(0).split(':')[1])+1}", nuevo, count=1)
    path.write_text(nuevo2 if nv else nuevo, encoding="utf-8")
    print("datos.js OK")


def subir_api(rutas: dict[str, list[list[float]]]) -> None:
    from http.cookiejar import CookieJar

    BASE = "http://127.0.0.1:8090"
    cj = CookieJar()
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

    def post(path: str, body: dict) -> dict:
        data = json.dumps(body).encode()
        req = urllib.request.Request(
            BASE + path,
            data=data,
            headers={"Content-Type": "application/json", "X-MoviRuta": "1"},
            method="POST",
        )
        with op.open(req, timeout=120) as r:
            return json.loads(r.read().decode())

    def get(path: str) -> dict:
        req = urllib.request.Request(BASE + path, headers={"X-MoviRuta": "1"})
        with op.open(req, timeout=60) as r:
            return json.loads(r.read().decode())

    login = post("/api/sesion", {"accion": "entrar", "email": "admin@moviruta.local", "password": "moviruta123"})
    assert login.get("ok"), login
    snap = get("/api/bd")
    por_id = {r["id"]: r for r in snap["bd"]["rutas"]}
    editados = []
    for rid, pts in rutas.items():
        r = dict(por_id[rid])
        if r.get("paradas") and isinstance(r["paradas"][0], dict):
            r["paradas"] = [p["id"] for p in r["paradas"]]
        r["recorrido"] = pts
        editados.append(r)
    out = post("/api/guardar", {"cambios": {"rutas": {"editados": editados, "nuevos": [], "eliminados": []}}})
    assert out.get("ok"), out
    for rid in rutas:
        n = len(next(x for x in out["bd"]["rutas"] if x["id"] == rid)["recorrido"])
        print("API", rid, n)


def main() -> None:
    rutas = generar()
    escribir_sql(rutas)
    parchear_datos(rutas)
    # actualiza densificar_recorridos.RUTAS embebido: dump json para otros scripts
    (ROOT / "database" / "seeds" / "recorridos_osrm.json").write_text(
        json.dumps(rutas), encoding="utf-8"
    )
    try:
        subir_api(rutas)
    except Exception as e:
        print("API no disponible:", e)


if __name__ == "__main__":
    main()
