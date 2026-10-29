"""Aplicación FastAPI MoviRuta."""
from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Permite `uvicorn backend.app.main:app` desde la raíz del repo
_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from backend.app.routers import bd, guardar, sesion  # noqa: E402

app = FastAPI(title="MoviRuta API", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bd.router, prefix="/api")
app.include_router(sesion.router, prefix="/api")
app.include_router(guardar.router, prefix="/api")

# En local sirve el front; en Vercel los estáticos salen de /web vía rewrites.
import os

_web = _ROOT / "web"
if _web.is_dir() and not os.getenv("VERCEL"):
    app.mount("/", StaticFiles(directory=str(_web), html=True), name="web")
