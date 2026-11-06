"""Configuración pública del front (sin secretos de DB)."""
from __future__ import annotations

import os

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ..config import _cargar_local

router = APIRouter()


def _clave_google() -> str:
    local = _cargar_local()
    return (
        os.getenv("GOOGLE_MAPS_API_KEY")
        or os.getenv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY")
        or str(local.get("google_maps_api_key") or "")
    ).strip()


@router.api_route("/config", methods=["GET"])
@router.api_route("/config.php", methods=["GET"])
async def config_publica():
    """Clave de Maps JS (restringida por HTTP referrer en Google Cloud)."""
    out = JSONResponse(
        {
            "ok": True,
            "google_maps_api_key": _clave_google(),
            "mapas": "google" if _clave_google() else "osm",
        }
    )
    out.headers["Cache-Control"] = "public, max-age=60"
    out.headers["X-Content-Type-Options"] = "nosniff"
    return out
