"""Conexión a Postgres (Supabase) o MySQL de respaldo."""
from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator

import psycopg
from psycopg.rows import dict_row

from .config import CONFIG


class ErrorBase(Exception):
    def __init__(self, mensaje: str, estado: int = 503):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.estado = estado


def _dsn_pgsql(cfg: dict) -> str:
    return (
        f"host={cfg['host']} port={cfg['puerto']} dbname={cfg['base']} "
        f"user={cfg['usuario']} password={cfg['password']} "
        f"sslmode=require gssencmode=disable connect_timeout=10"
    )


def conectar(cfg: dict | None = None):
    c = cfg or CONFIG
    if c.get("motor", "pgsql") != "pgsql":
        raise ErrorBase("La API principal debe usar PostgreSQL (Supabase).", 503)
    try:
        conn = psycopg.connect(_dsn_pgsql(c), row_factory=dict_row, autocommit=False)
        conn.execute(f"SET TIME ZONE '{c['zona_horaria']}'")
        return conn
    except Exception as e:  # noqa: BLE001
        raise ErrorBase(
            "No se pudo conectar a Supabase. Revisa DB_HOST / DB_PASSWORD o backend/config.local.json.",
            503,
        ) from e


@contextmanager
def conexion() -> Iterator[Any]:
    conn = conectar()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def fetchall(conn, sql: str, params: tuple | dict | None = None) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return list(cur.fetchall())


def fetchone(conn, sql: str, params: tuple | dict | None = None) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchone()


def execute(conn, sql: str, params: tuple | dict | None = None) -> None:
    with conn.cursor() as cur:
        cur.execute(sql, params)


def es_duplicado(err: BaseException) -> bool:
    return getattr(err, "sqlstate", None) == "23505"


def es_fk(err: BaseException) -> bool:
    return getattr(err, "sqlstate", None) in {"23503", "23502", "23514"}
