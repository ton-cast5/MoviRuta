"""Aplicación FastAPI MoviRuta."""
from __future__ import annotations

import os
import sys
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

# Permite `uvicorn backend.app.main:app` desde la raíz del repo
_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from backend.app.routers import bd, guardar, sesion  # noqa: E402

app = FastAPI(title="MoviRuta API", docs_url=None, redoc_url=None)

_ORIGENES = [
    o.strip()
    for o in os.getenv(
        "MOVIRUTA_CORS",
        "https://moviruta.vercel.app,http://localhost:8090,http://127.0.0.1:8090,http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ORIGENES,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-MoviRuta", "Accept"],
)


@app.exception_handler(Exception)
async def _error_generico(_request: Request, exc: Exception):
    from starlette.exceptions import HTTPException as StarletteHTTPException

    if isinstance(exc, StarletteHTTPException):
        raise exc
    if os.getenv("MOVIRUTA_DEBUG") == "1":
        return JSONResponse({"ok": False, "mensaje": f"Error interno: {exc}"}, status_code=500)
    return JSONResponse({"ok": False, "mensaje": "Error interno del servidor."}, status_code=500)

app.include_router(bd.router, prefix="/api")
app.include_router(sesion.router, prefix="/api")
app.include_router(guardar.router, prefix="/api")

# En local sirve el front; en Vercel los estáticos salen de /web vía rewrites.
_web = _ROOT / "web"
if _web.is_dir() and not os.getenv("VERCEL"):
    app.mount("/", StaticFiles(directory=str(_web), html=True), name="web")
