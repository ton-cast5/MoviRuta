#!/usr/bin/env python3
"""Reescribe el bloque rutas de datos.js con recorridos densos correctos."""
from __future__ import annotations

import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("dens", ROOT / "scripts" / "densificar_recorridos.py")
dens = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dens)

R1 = json.dumps(dens.RUTAS["TAB-014-0001"], separators=(",", ":"))
R2 = json.dumps(dens.RUTAS["TAB-014-0002"], separators=(",", ":"))
R3 = json.dumps(dens.RUTAS["TAB-014-0003"], separators=(",", ":"))

BLOQUE = f"""    rutas: [
        {{
            id: 'TAB-014-0001', linea_id: 'TAB-001-TNL', estado_clave: 'TAB', municipio_clave: '014', codigo: '1',
            nombre: 'Paraíso Centro-Puerto Ceiba', origen: 'Paraíso Centro', destino: 'Puerto Ceiba', sentido: 'ida', color: '#0DAD84',
            tarifa_edu: 8, tarifa_gral: 12, tarifa_inapam: 6, tarifa: 12, velocidad_promedio_kmh: 28, estado_servicio: 'normal', aviso: null, activa: true,
            paradas: ['TAB-014-0001', 'TAB-014-0003', 'TAB-014-0004'],
            recorrido: {R1},
        }},
        {{
            id: 'TAB-014-0002', linea_id: 'TAB-001-TNL', estado_clave: 'TAB', municipio_clave: '014', codigo: '1',
            nombre: 'Puerto Ceiba-Paraíso Centro', origen: 'Puerto Ceiba', destino: 'Paraíso Centro', sentido: 'vuelta', color: '#0DAD84',
            tarifa_edu: 8, tarifa_gral: 12, tarifa_inapam: 6, tarifa: 12, velocidad_promedio_kmh: 28, estado_servicio: 'normal', aviso: null, activa: true,
            paradas: ['TAB-014-0004', 'TAB-014-0003', 'TAB-014-0001'],
            recorrido: {R2},
        }},
        {{
            id: 'TAB-014-0003', linea_id: 'TAB-002-TCP', estado_clave: 'TAB', municipio_clave: '014', codigo: 'P1',
            nombre: 'Terminal Paraíso-La Isla', origen: 'Terminal Paraíso', destino: 'La Isla', sentido: 'ida', color: '#006C49',
            tarifa_edu: 10, tarifa_gral: 15, tarifa_inapam: 7.5, tarifa: 15, velocidad_promedio_kmh: 32, estado_servicio: 'normal', aviso: null, activa: true,
            paradas: ['TAB-014-0002', 'TAB-014-0004', 'TAB-014-0005'],
            recorrido: {R3},
        }},
    ],"""

path = ROOT / "web" / "assets" / "js" / "datos.js"
text = path.read_text(encoding="utf-8")
nuevo, n = re.subn(r"    rutas: \[[\s\S]*?\n    \],\n    viajes:", BLOQUE + "\n    viajes:", text, count=1)
if n != 1:
    raise SystemExit(f"No se reemplazó el bloque rutas (matches={n})")
path.write_text(nuevo, encoding="utf-8")
print("datos.js rutas OK", {k: len(v) for k, v in dens.RUTAS.items()})
