#!/usr/bin/env python3
"""Actualiza recorridos densos vía API local /api/guardar (sesión admin)."""
from __future__ import annotations

import importlib.util
import json
import urllib.request
from http.cookiejar import CookieJar
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "http://127.0.0.1:8090"
spec = importlib.util.spec_from_file_location("dens", ROOT / "scripts" / "densificar_recorridos.py")
dens = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dens)

cj = CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))


def post(path: str, body: dict) -> dict:
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        BASE + path,
        data=data,
        headers={"Content-Type": "application/json", "X-MoviRuta": "1"},
        method="POST",
    )
    with opener.open(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def get(path: str) -> dict:
    req = urllib.request.Request(BASE + path, headers={"X-MoviRuta": "1"})
    with opener.open(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


login = post("/api/sesion", {"accion": "entrar", "email": "admin@moviruta.local", "password": "moviruta123"})
assert login.get("ok"), login
snap = get("/api/bd")
rutas = {r["id"]: r for r in snap["bd"]["rutas"]}
editados = []
for rid, pts in dens.RUTAS.items():
    r = dict(rutas[rid])
    r["recorrido"] = pts
    # asegurar paradas como lista de ids
    if r.get("paradas") and isinstance(r["paradas"][0], dict):
        r["paradas"] = [p["id"] for p in r["paradas"]]
    editados.append(r)
    print(rid, "antes", len(rutas[rid].get("recorrido") or []), "ahora", len(pts))

out = post("/api/guardar", {"cambios": {"rutas": {"editados": editados, "nuevos": [], "eliminados": []}}})
assert out.get("ok"), out
for rid in dens.RUTAS:
    n = len(next(x for x in out["bd"]["rutas"] if x["id"] == rid)["recorrido"])
    print("OK", rid, n)
