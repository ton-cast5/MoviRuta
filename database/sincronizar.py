#!/usr/bin/env python3
"""Copia Supabase → MySQL local (Workbench). Uso: python database/sincronizar.py [--forzar]"""
from __future__ import annotations

import hashlib
import json
import sys
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pymysql
import psycopg
from psycopg.rows import dict_row

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from backend.app.config import CONFIG  # noqa: E402

TABLAS = [
    "rol", "sentido_ruta", "estado_servicio", "estado_viaje", "estado_reporte", "tipo_falla", "estado_falla",
    "estado", "municipio", "usuario", "linea_transporte", "linea_dueno", "chofer", "vehiculo", "parada", "ruta",
    "ruta_parada", "recorrido_punto", "viaje", "reporte_accidente", "falla_vehiculo",
]
HUELLA = Path(__file__).with_name(".huella_sincronizacion")
BITACORA = Path(__file__).with_name("sincronizacion.log")
COPIA_OBLIGATORIA_SEG = 1800
FILAS = 200


def anotar(msg: str) -> None:
    linea = f"{datetime.now():%Y-%m-%d %H:%M:%S}  {msg}\n"
    if BITACORA.is_file() and BITACORA.stat().st_size > 1_000_000:
        BITACORA.rename(BITACORA.with_suffix(".log.anterior"))
    BITACORA.open("a", encoding="utf-8").write(linea)
    print(linea, end="")


def main() -> int:
    if CONFIG.get("motor") != "pgsql":
        anotar("La base principal no es Supabase (pgsql).")
        return 1
    zona = ZoneInfo(CONFIG["zona_horaria"])
    try:
        pg = psycopg.connect(
            f"host={CONFIG['host']} port={CONFIG['puerto']} dbname={CONFIG['base']} "
            f"user={CONFIG['usuario']} password={CONFIG['password']} sslmode=require gssencmode=disable",
            row_factory=dict_row,
        )
        fechas = {}
        with pg.cursor() as cur:
            cur.execute(
                """SELECT table_name, column_name FROM information_schema.columns
                   WHERE table_schema='public' AND data_type='timestamp with time zone'"""
            )
            for r in cur.fetchall():
                fechas.setdefault(r["table_name"], []).append(r["column_name"])
        datos = {}
        with pg.cursor() as cur:
            for t in TABLAS:
                cur.execute(f"SELECT * FROM {t} ORDER BY 1")
                filas = list(cur.fetchall())
                for col in fechas.get(t, []):
                    for f in filas:
                        if f.get(col) is not None:
                            f[col] = f[col].astimezone(zona).replace(tzinfo=None)
                datos[t] = filas
        pg.close()
    except Exception as e:  # noqa: BLE001
        anotar(f"No se pudo leer Supabase: {e}")
        return 1

    # Huella estable
    huella = hashlib.md5(json.dumps(datos, default=str, sort_keys=True).encode()).hexdigest()
    forzar = "--forzar" in sys.argv or not HUELLA.is_file() or time.time() - HUELLA.stat().st_mtime > COPIA_OBLIGATORIA_SEG
    if not forzar and HUELLA.read_text(encoding="utf-8").strip() == huella:
        return 0

    r = CONFIG["respaldo"]
    try:
        my = pymysql.connect(
            host=r["host"], port=int(r["puerto"]), user=r["usuario"], password=r["password"],
            database=r["base"], charset="utf8mb4", autocommit=False,
        )
        with my.cursor() as cur:
            cur.execute("SET FOREIGN_KEY_CHECKS=0")
            for t in reversed(TABLAS):
                cur.execute(f"DELETE FROM `{t}`")
            for t in TABLAS:
                filas = datos[t]
                if not filas:
                    continue
                cols = list(filas[0].keys())
                placeholders = ", ".join(["%s"] * len(cols))
                colsql = ", ".join(f"`{c}`" for c in cols)
                sql = f"INSERT INTO `{t}` ({colsql}) VALUES ({placeholders})"
                for i in range(0, len(filas), FILAS):
                    lote = [tuple(f[c] for c in cols) for f in filas[i : i + FILAS]]
                    cur.executemany(sql, lote)
            cur.execute("SET FOREIGN_KEY_CHECKS=1")
        my.commit()
        my.close()
        HUELLA.write_text(huella, encoding="utf-8")
        total = sum(len(v) for v in datos.values())
        anotar(f"Respaldo OK · {total} filas en {len(TABLAS)} tablas.")
        return 0
    except Exception as e:  # noqa: BLE001
        anotar(f"Fallo al escribir MySQL: {e}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
