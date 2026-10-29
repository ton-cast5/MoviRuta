"""Respuestas JSON comunes."""
from __future__ import annotations

from fastapi.responses import JSONResponse

from . import sesion_store
from .snapshot import instantanea


def ok(conn, request, response, datos_sesion: dict, sid: str) -> JSONResponse:
    sesion_store.guardar(conn, sid, datos_sesion)
    sesion_store.fijar_cookie(response, request, sid)
    uid = sesion_store.usuario_id(datos_sesion)
    cuerpo = {"ok": True, "sesion_usuario_id": uid, "bd": instantanea(conn, uid)}
    out = JSONResponse(cuerpo)
    sesion_store.fijar_cookie(out, request, sid)
    out.headers["Cache-Control"] = "no-store"
    out.headers["X-Content-Type-Options"] = "nosniff"
    return out


def error(mensaje: str, estado: int = 400) -> JSONResponse:
    out = JSONResponse({"ok": False, "mensaje": mensaje}, status_code=estado)
    out.headers["Cache-Control"] = "no-store"
    out.headers["X-Content-Type-Options"] = "nosniff"
    return out


def exigir_moviruta(request) -> JSONResponse | None:
    if request.headers.get("x-moviruta") != "1":
        return error("Petición no válida.", 400)
    return None
