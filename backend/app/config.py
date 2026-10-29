"""Configuración desde variables de entorno o backend/config.local.json."""
from __future__ import annotations

import json
import os
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
_LOCAL = Path(__file__).resolve().parents[1] / "config.local.json"
_PHP_LOCAL = _ROOT / "api" / "config.local.php"


def _env(nombre: str, omision: str = "") -> str:
    valor = os.getenv(nombre)
    return omision if valor is None or valor == "" else valor


def _cargar_local() -> dict:
    if _LOCAL.is_file():
        return json.loads(_LOCAL.read_text(encoding="utf-8"))
    # Migración temporal: leer password de config.local.php si aún existe
    if _PHP_LOCAL.is_file():
        texto = _PHP_LOCAL.read_text(encoding="utf-8", errors="ignore")
        import re

        def campo(clave: str, default: str = "") -> str:
            m = re.search(rf"'{clave}'\s*=>\s*'([^']*)'", texto)
            return m.group(1) if m else default

        motor = campo("motor", "pgsql")
        return {
            "motor": motor,
            "host": campo("host", "127.0.0.1"),
            "puerto": int(campo("puerto", "6543" if motor == "pgsql" else "3306") or 6543),
            "base": campo("base", "postgres"),
            "usuario": campo("usuario", "root"),
            "password": campo("password", ""),
            "zona_horaria": "America/Mexico_City",
            "respaldo": {
                "motor": "mysql",
                "host": "127.0.0.1",
                "puerto": 3306,
                "base": "MoviRuta",
                "usuario": "root",
                "password": "",
            },
        }
    return {}


def cargar() -> dict:
    local = _cargar_local()
    motor = _env("DB_DRIVER", local.get("motor", "pgsql"))
    mysql_local = {
        "motor": "mysql",
        "host": "127.0.0.1",
        "puerto": 3306,
        "base": "MoviRuta",
        "usuario": "root",
        "password": "",
    }
    respaldo = {**mysql_local, **(local.get("respaldo") or {})}
    return {
        "motor": motor,
        "host": _env("DB_HOST", local.get("host", "127.0.0.1")),
        "puerto": int(_env("DB_PORT", str(local.get("puerto", 6543 if motor == "pgsql" else 3306)))),
        "base": _env("DB_NAME", local.get("base", "postgres" if motor == "pgsql" else "MoviRuta")),
        "usuario": _env("DB_USER", local.get("usuario", "root")),
        "password": _env("DB_PASSWORD", local.get("password", "")),
        "zona_horaria": local.get("zona_horaria", "America/Mexico_City"),
        "respaldo": respaldo,
        "cookie": "moviruta",
        "sesion_segundos": 8 * 3600,
    }


CONFIG = cargar()
