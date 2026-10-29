"""Entrada serverless de Vercel → FastAPI."""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from backend.app.main import app  # noqa: E402

# Vercel Python espera `app` (ASGI)
__all__ = ["app"]
