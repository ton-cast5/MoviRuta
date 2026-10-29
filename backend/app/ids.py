"""Generadores atómicos de IDs de cadena."""
from __future__ import annotations

import hashlib
import re

from . import db


def _candado(conn, clave: str) -> None:
    """Bloqueo de transacción para serializar series por prefijo (Postgres)."""
    h = int.from_bytes(hashlib.sha256(clave.encode()).digest()[:8], "big", signed=True)
    db.execute(conn, "SELECT pg_advisory_xact_lock(%s)", (h,))


def _max_int(conn, sql: str, params: tuple) -> int:
    fila = db.fetchone(conn, sql, params)
    return int(fila["n"] or 0) if fila else 0


def usuario(conn, rol: str) -> str:
    _candado(conn, f"usuario:{rol}")
    n = _max_int(
        conn,
        "SELECT MAX(CAST(SUBSTRING(id FROM '([0-9]+)$') AS INTEGER)) AS n FROM usuario WHERE rol = %s AND id LIKE %s",
        (rol, f"USER-{rol}-%"),
    ) + 1
    return f"USER-{rol}-{n:03d}"


def linea(conn, estado: str, siglas: str) -> tuple[str, int]:
    estado = estado.upper()
    siglas = siglas.upper()
    _candado(conn, f"linea:{estado}")
    n = _max_int(conn, "SELECT MAX(serie) AS n FROM linea_transporte WHERE estado_clave = %s", (estado,)) + 1
    return f"{estado}-{n:03d}-{siglas}", n


def ruta_o_parada(conn, tabla: str, estado: str, municipio: str) -> tuple[str, int]:
    if tabla not in {"ruta", "parada"}:
        raise ValueError("tabla inválida")
    estado, municipio = estado.upper(), municipio.zfill(3)
    _candado(conn, f"{tabla}:{estado}:{municipio}")
    n = _max_int(
        conn,
        f"SELECT MAX(serie) AS n FROM {tabla} WHERE estado_clave = %s AND municipio_clave = %s",
        (estado, municipio),
    ) + 1
    return f"{estado}-{municipio}-{n:04d}", n


def viaje(conn, siglas: str, unidad: str) -> str:
    siglas, unidad = siglas.upper(), unidad.upper()
    prefijo = f"{siglas}-{unidad}-"
    _candado(conn, f"viaje:{prefijo}")
    n = _max_int(
        conn,
        "SELECT MAX(CAST(SUBSTRING(id FROM '([0-9]+)$') AS INTEGER)) AS n FROM viaje WHERE id LIKE %s",
        (prefijo + "%",),
    ) + 1
    return f"{prefijo}{n:03d}"


def falla(conn, placa: str, linea_id: str) -> str:
    prefijo = f"{placa}-{linea_id}-"
    _candado(conn, f"falla:{prefijo}")
    n = _max_int(
        conn,
        "SELECT MAX(CAST(SUBSTRING(id FROM '([0-9]+)$') AS INTEGER)) AS n FROM falla_vehiculo WHERE id LIKE %s",
        (prefijo + "%",),
    ) + 1
    return f"{prefijo}{n:03d}"


def reporte(conn, ruta_id: str) -> str:
    prefijo = f"{ruta_id}-"
    _candado(conn, f"reporte:{prefijo}")
    n = _max_int(
        conn,
        "SELECT MAX(CAST(SUBSTRING(id FROM '([0-9]+)$') AS INTEGER)) AS n FROM reporte_accidente WHERE id LIKE %s",
        (prefijo + "%",),
    ) + 1
    return f"{prefijo}{n:03d}"


RE_PLACA = re.compile(r"^[A-Z0-9-]{4,15}$")
RE_SIGLAS = re.compile(r"^[A-Z0-9]{3}$")
RE_ESTADO = re.compile(r"^[A-Z]{3}$")
RE_MUNICIPIO = re.compile(r"^[0-9]{3}$")
