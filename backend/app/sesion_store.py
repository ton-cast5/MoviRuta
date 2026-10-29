"""Sesiones en tabla `sesion` + cookie HttpOnly `moviruta`."""
from __future__ import annotations

import json
import secrets
import time
from typing import Any

from fastapi import Request, Response

from .config import CONFIG
from . import db

DURACION = CONFIG["sesion_segundos"]
COOKIE = CONFIG["cookie"]


def _ahora() -> int:
    return int(time.time())


def _leer_fila(conn, sid: str) -> dict | None:
    return db.fetchone(conn, "SELECT id, datos, expira FROM sesion WHERE id = %s", (sid,))


def cargar(conn, request: Request) -> tuple[str, dict[str, Any]]:
    sid = request.cookies.get(COOKIE) or ""
    datos: dict[str, Any] = {}
    if sid:
        fila = _leer_fila(conn, sid)
        if fila and int(fila["expira"]) > _ahora():
            try:
                datos = json.loads(fila["datos"] or "{}")
            except json.JSONDecodeError:
                datos = {}
            return sid, datos
        if fila:
            db.execute(conn, "DELETE FROM sesion WHERE id = %s", (sid,))
    sid = secrets.token_urlsafe(32)
    return sid, datos


def guardar(conn, sid: str, datos: dict[str, Any]) -> None:
    expira = _ahora() + DURACION
    payload = json.dumps(datos, ensure_ascii=False)
    db.execute(
        conn,
        """
        INSERT INTO sesion (id, datos, expira) VALUES (%s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET datos = EXCLUDED.datos, expira = EXCLUDED.expira
        """,
        (sid, payload, expira),
    )
    # GC ligero
    db.execute(conn, "DELETE FROM sesion WHERE expira < %s", (_ahora(),))


def regenerar(conn, datos: dict[str, Any]) -> str:
    sid = secrets.token_urlsafe(32)
    guardar(conn, sid, datos)
    return sid


def fijar_cookie(response: Response, request: Request, sid: str) -> None:
    https = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
    response.set_cookie(
        key=COOKIE,
        value=sid,
        httponly=True,
        samesite="lax",
        secure=https,
        path="/",
    )


def usuario_id(datos: dict) -> str | None:
    uid = datos.get("usuario_id")
    return str(uid) if uid else None
