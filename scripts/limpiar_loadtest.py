#!/usr/bin/env python3
"""Borra usuarios de prueba loadtest-*@moviruta.local y sus sesiones.

Requiere DATABASE_URL o las mismas vars que el backend (config.local.json).
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.app import db  # noqa: E402


def main() -> int:
    with db.conexion() as conn:
        filas = db.fetchall(
            conn,
            "SELECT id, email FROM usuario WHERE email LIKE 'loadtest-%%@moviruta.local'",
        )
        if not filas:
            print("No hay usuarios loadtest-* que borrar.")
            return 0
        ids = [f["id"] for f in filas]
        print(f"Borrando {len(ids)} usuarios loadtest…")
        # Sesiones que referencian esos ids en JSON
        db.execute(conn, "DELETE FROM sesion WHERE datos LIKE '%loadtest-%'")
        for uid in ids:
            db.execute(conn, "DELETE FROM sesion WHERE datos LIKE %s", (f'%"{uid}"%',))
        db.execute(
            conn,
            "DELETE FROM usuario WHERE email LIKE 'loadtest-%%@moviruta.local'",
        )
        print("Listo.")
    # limpia lista local si existe
    lista = Path(__file__).with_name("_loadtest_emails.txt")
    if lista.is_file():
        lista.unlink()
        print("Eliminado scripts/_loadtest_emails.txt")
    return 0


if __name__ == "__main__":
    sys.exit(main())
