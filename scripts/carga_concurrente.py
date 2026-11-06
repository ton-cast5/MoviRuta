#!/usr/bin/env python3
"""Prueba de carga efímera contra MoviRuta (producción o local).

Uso:
  python scripts/carga_concurrente.py
  MOVIRUTA_BASE=https://moviruta.vercel.app python scripts/carga_concurrente.py

Mide latencia p50/p95 y tasa de error en ramp-up 10→25→50→100 GET /api/bd.
Opcionalmente registra usuarios loadtest-*@moviruta.local y los deja listados
para limpieza con scripts/limpiar_loadtest.py (requiere DATABASE_URL).
"""
from __future__ import annotations

import json
import os
import statistics
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BASE = os.getenv("MOVIRUTA_BASE", "https://moviruta.vercel.app").rstrip("/")
NIVELES = [int(x) for x in os.getenv("MOVIRUTA_RAMP", "10,25,50,100").split(",") if x.strip()]
TIMEOUT = float(os.getenv("MOVIRUTA_TIMEOUT", "30"))
REGISTRAR = os.getenv("MOVIRUTA_REGISTRAR", "0") == "1"


def hit_bd() -> tuple[bool, float, int]:
    t0 = time.perf_counter()
    req = Request(
        f"{BASE}/api/bd",
        headers={"Accept": "application/json", "X-MoviRuta": "1", "User-Agent": "MoviRuta-LoadTest/1.0"},
        method="GET",
    )
    try:
        with urlopen(req, timeout=TIMEOUT) as resp:
            cuerpo = resp.read()
            ok = resp.status == 200 and b'"ok":true' in cuerpo.replace(b" ", b"")
            return ok, time.perf_counter() - t0, resp.status
    except HTTPError as e:
        return False, time.perf_counter() - t0, e.code
    except (URLError, TimeoutError, OSError):
        return False, time.perf_counter() - t0, 0


def registrar_bot(i: int) -> str | None:
    email = f"loadtest-{uuid.uuid4().hex[:10]}@moviruta.local"
    payload = json.dumps(
        {
            "accion": "registrar",
            "nombre": "Load",
            "apellido": f"Test{i}",
            "email": email,
            "password": f"LoadTest!{uuid.uuid4().hex[:8]}",
        }
    ).encode()
    req = Request(
        f"{BASE}/api/sesion",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "X-MoviRuta": "1",
            "User-Agent": "MoviRuta-LoadTest/1.0",
        },
        method="POST",
    )
    try:
        with urlopen(req, timeout=TIMEOUT) as resp:
            data = json.loads(resp.read().decode())
            return email if data.get("ok") else None
    except Exception:
        return None


def oleada(n: int) -> dict:
    latencias: list[float] = []
    errores = 0
    t0 = time.perf_counter()
    with ThreadPoolExecutor(max_workers=n) as pool:
        futs = [pool.submit(hit_bd) for _ in range(n)]
        for f in as_completed(futs):
            ok, lat, _ = f.result()
            latencias.append(lat)
            if not ok:
                errores += 1
    dur = time.perf_counter() - t0
    latencias.sort()
    p50 = latencias[len(latencias) // 2] if latencias else 0
    p95 = latencias[max(0, int(len(latencias) * 0.95) - 1)] if latencias else 0
    return {
        "n": n,
        "errores": errores,
        "ok": n - errores,
        "p50_ms": round(p50 * 1000, 1),
        "p95_ms": round(p95 * 1000, 1),
        "media_ms": round(statistics.mean(latencias) * 1000, 1) if latencias else 0,
        "duracion_s": round(dur, 2),
        "rps": round(n / dur, 2) if dur else 0,
    }


def main() -> int:
    print(f"Base: {BASE}")
    print(f"Ramp-up: {NIVELES}")
    creados: list[str] = []
    if REGISTRAR:
        print("Registrando bots loadtest-* …")
        with ThreadPoolExecutor(max_workers=10) as pool:
            for email in pool.map(registrar_bot, range(min(20, max(NIVELES)))):
                if email:
                    creados.append(email)
        print(f"  creados: {len(creados)}")
        Path_emails = os.path.join(os.path.dirname(__file__), "_loadtest_emails.txt")
        with open(Path_emails, "w", encoding="utf-8") as f:
            f.write("\n".join(creados))
        print(f"  lista: {Path_emails}")

    resultados = []
    for n in NIVELES:
        print(f"\n→ {n} concurrentes…")
        r = oleada(n)
        resultados.append(r)
        print(
            f"  ok={r['ok']}/{r['n']} err={r['errores']} "
            f"p50={r['p50_ms']}ms p95={r['p95_ms']}ms rps≈{r['rps']}"
        )
        if r["errores"] / r["n"] > 0.25:
            print("  Degradación fuerte (>25% errores). Deteniendo ramp-up.")
            break

    print("\n=== Resumen ===")
    estable = None
    for r in resultados:
        tasa = r["errores"] / r["n"] if r["n"] else 1
        marca = "OK" if tasa <= 0.05 and r["p95_ms"] < 5000 else "DEGRADADO"
        print(f"  {r['n']:3d} · {marca} · p95={r['p95_ms']}ms · err={tasa:.0%}")
        if marca == "OK":
            estable = r["n"]
    if estable:
        print(f"\nCapacidad estimada (lecturas GET /api/bd): ~{estable} usuarios concurrentes sin degradación grave.")
    else:
        print("\nLa API ya degrada desde el primer nivel; revisar DB/cold start Vercel.")
    print("Limpieza: python scripts/limpiar_loadtest.py  (si registraste bots)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
