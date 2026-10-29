"""Instantánea completa de la base para el front."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from . import db


def _ms(valor) -> int | None:
    if valor is None:
        return None
    if isinstance(valor, datetime):
        return int(valor.timestamp() * 1000)
    return int(valor)


def _bool(v) -> bool:
    return bool(int(v)) if v is not None else False


def _num(v):
    if v is None:
        return None
    if isinstance(v, Decimal):
        return float(v)
    return v


def _lineas_dueno(conn, usuario_id: str | None) -> list[str] | None:
    """None = admin (todas); lista = líneas del dueño; [] = sin alcance."""
    if not usuario_id:
        return []
    u = db.fetchone(conn, "SELECT rol FROM usuario WHERE id = %s", (usuario_id,))
    if not u:
        return []
    if u["rol"] == "admin":
        return None
    if u["rol"] != "dueno":
        return []
    filas = db.fetchall(conn, "SELECT linea_id FROM linea_dueno WHERE usuario_id = %s", (usuario_id,))
    return [f["linea_id"] for f in filas]


def instantanea(conn, usuario_id: str | None) -> dict[str, Any]:
    alcance = _lineas_dueno(conn, usuario_id)
    rol = None
    if usuario_id:
        u = db.fetchone(conn, "SELECT rol FROM usuario WHERE id = %s AND activo = 1", (usuario_id,))
        rol = u["rol"] if u else None
        if not u:
            usuario_id = None
            alcance = []

    usuarios_raw = db.fetchall(
        conn,
        "SELECT id, rol, nombre, apellido, email, activo, ultimo_acceso FROM usuario ORDER BY id",
    )
    lineas = db.fetchall(
        conn,
        "SELECT id, estado_clave, serie, siglas, nombre, descripcion, telefono, activa FROM linea_transporte ORDER BY id",
    )
    duenos = db.fetchall(conn, "SELECT linea_id, usuario_id FROM linea_dueno")
    duenos_por_linea: dict[str, list[str]] = {}
    for d in duenos:
        duenos_por_linea.setdefault(d["linea_id"], []).append(d["usuario_id"])

    choferes_raw = db.fetchall(
        conn,
        "SELECT numero_licencia AS id, usuario_id, linea_id, numero_licencia, telefono, seguro_vida, activo FROM chofer ORDER BY numero_licencia",
    )
    vehiculos = db.fetchall(
        conn,
        """SELECT placa AS id, placa, linea_id, numero_unidad, modelo, capacidad,
                  cuenta_con_gps, climatizado, tv_a_bordo, accesible, activo
           FROM vehiculo ORDER BY placa""",
    )
    paradas = db.fetchall(
        conn,
        """SELECT id, estado_clave, municipio_clave, serie, codigo, nombre, referencia,
                  latitud, longitud, activa FROM parada ORDER BY id""",
    )
    rutas_raw = db.fetchall(
        conn,
        """SELECT id, linea_id, estado_clave, municipio_clave, serie, codigo, nombre, origen, destino,
                  sentido, color, tarifa_edu, tarifa_gral, tarifa_inapam, velocidad_promedio_kmh,
                  estado_servicio, aviso, activa FROM ruta ORDER BY id""",
    )
    rp = db.fetchall(conn, "SELECT ruta_id, orden, parada_id FROM ruta_parada ORDER BY ruta_id, orden")
    rec = db.fetchall(conn, "SELECT ruta_id, orden, latitud, longitud FROM recorrido_punto ORDER BY ruta_id, orden")
    viajes_raw = db.fetchall(
        conn,
        """SELECT id, chofer_id, vehiculo_id, ruta_id, inicio, fin, pasajeros_salida, estado
           FROM viaje ORDER BY inicio DESC""",
    )
    reportes_raw = db.fetchall(
        conn,
        """SELECT id, ruta_id, usuario_id, descripcion, latitud, longitud, estado,
                  creado_en, revisado_por, revisado_en FROM reporte_accidente ORDER BY creado_en DESC""",
    )
    fallas_raw = db.fetchall(
        conn,
        """SELECT id, vehiculo_id, linea_id, tipo, descripcion, impide_circular, estado,
                  reportado_por, viaje_id, creado_en, atendido_por, nota_solucion, resuelto_en
           FROM falla_vehiculo ORDER BY creado_en DESC""",
    )
    estados = db.fetchall(conn, "SELECT clave, nombre FROM estado ORDER BY nombre")
    municipios = db.fetchall(conn, "SELECT estado_clave, clave, nombre FROM municipio ORDER BY estado_clave, clave")

    paradas_ruta: dict[str, list] = {}
    for x in rp:
        paradas_ruta.setdefault(x["ruta_id"], []).append(x["parada_id"])
    recorrido: dict[str, list] = {}
    for x in rec:
        recorrido.setdefault(x["ruta_id"], []).append([float(x["latitud"]), float(x["longitud"])])

    # Usuarios visibles
    chofer_uids = {c["usuario_id"] for c in choferes_raw if alcance is None or c["linea_id"] in (alcance or [])}
    usuarios = []
    for u in usuarios_raw:
        ver_detalle = (
            rol == "admin"
            or (usuario_id and u["id"] == usuario_id)
            or (rol == "dueno" and u["id"] in chofer_uids)
        )
        item = {
            "id": u["id"],
            "rol": u["rol"],
            "nombre": u["nombre"],
            "apellido": u["apellido"],
            "activo": _bool(u["activo"]),
        }
        if ver_detalle:
            item["email"] = u["email"]
            item["ultimo_acceso"] = _ms(u["ultimo_acceso"])
        usuarios.append(item)

    lineas_out = []
    for l in lineas:
        lineas_out.append(
            {
                "id": l["id"],
                "estado_clave": l["estado_clave"],
                "serie": l["serie"],
                "siglas": l["siglas"],
                "nombre": l["nombre"],
                "descripcion": l["descripcion"],
                "telefono": l["telefono"],
                "duenos": duenos_por_linea.get(l["id"], []),
                "activa": _bool(l["activa"]),
            }
        )

    choferes = []
    for c in choferes_raw:
        detalle = rol == "admin" or (alcance is None) or (c["linea_id"] in (alcance or [])) or (
            usuario_id and c["usuario_id"] == usuario_id
        )
        item = {
            "id": c["id"],
            "usuario_id": c["usuario_id"],
            "linea_id": c["linea_id"],
            "activo": _bool(c["activo"]),
        }
        if detalle:
            item["numero_licencia"] = c["numero_licencia"]
            item["telefono"] = c["telefono"]
            item["seguro_vida"] = _bool(c["seguro_vida"])
        choferes.append(item)

    vehiculos_out = [
        {
            "id": v["id"],
            "placa": v["placa"],
            "linea_id": v["linea_id"],
            "numero_unidad": v["numero_unidad"],
            "modelo": v["modelo"],
            "capacidad": v["capacidad"],
            "cuenta_con_gps": _bool(v["cuenta_con_gps"]),
            "climatizado": _bool(v["climatizado"]),
            "tv_a_bordo": _bool(v["tv_a_bordo"]),
            "accesible": _bool(v["accesible"]),
            "activo": _bool(v["activo"]),
        }
        for v in vehiculos
    ]

    paradas_out = [
        {
            "id": p["id"],
            "estado_clave": p["estado_clave"],
            "municipio_clave": p["municipio_clave"],
            "serie": p["serie"],
            "codigo": p["codigo"],
            "nombre": p["nombre"],
            "referencia": p["referencia"],
            "latitud": float(p["latitud"]),
            "longitud": float(p["longitud"]),
            "activa": _bool(p["activa"]),
        }
        for p in paradas
    ]

    rutas = []
    for r in rutas_raw:
        rutas.append(
            {
                "id": r["id"],
                "linea_id": r["linea_id"],
                "estado_clave": r["estado_clave"],
                "municipio_clave": r["municipio_clave"],
                "serie": r["serie"],
                "codigo": r["codigo"],
                "nombre": r["nombre"],
                "origen": r["origen"],
                "destino": r["destino"],
                "sentido": r["sentido"],
                "color": r["color"],
                "tarifa_edu": _num(r["tarifa_edu"]),
                "tarifa_gral": _num(r["tarifa_gral"]),
                "tarifa_inapam": _num(r["tarifa_inapam"]),
                "tarifa": _num(r["tarifa_gral"]),
                "velocidad_promedio_kmh": _num(r["velocidad_promedio_kmh"]),
                "estado_servicio": r["estado_servicio"],
                "aviso": r["aviso"],
                "activa": _bool(r["activa"]),
                "paradas": paradas_ruta.get(r["id"], []),
                "recorrido": recorrido.get(r["id"], []),
            }
        )

    # Viajes: en curso para todos; históricos según alcance
    viajes = []
    for v in viajes_raw:
        linea_ruta = next((r["linea_id"] for r in rutas_raw if r["id"] == v["ruta_id"]), None)
        es_propio = False
        if usuario_id:
            ch = next((c for c in choferes_raw if c["usuario_id"] == usuario_id), None)
            es_propio = bool(ch and ch["id"] == v["chofer_id"])
        visible = v["estado"] == "en_curso" or rol == "admin" or es_propio or (
            alcance is not None and linea_ruta in alcance
        ) or (alcance is None and rol == "admin")
        if alcance is None and rol == "admin":
            visible = True
        elif v["estado"] != "en_curso":
            visible = rol == "admin" or es_propio or (linea_ruta in (alcance or []))
        if not visible and v["estado"] == "en_curso":
            visible = True
        if not visible:
            continue
        viajes.append(
            {
                "id": v["id"],
                "chofer_id": v["chofer_id"],
                "vehiculo_id": v["vehiculo_id"],
                "ruta_id": v["ruta_id"],
                "inicio": _ms(v["inicio"]),
                "fin": _ms(v["fin"]),
                "pasajeros_salida": v["pasajeros_salida"],
                "estado": v["estado"],
            }
        )

    reportes = []
    if rol == "admin" or (alcance is not None and len(alcance or []) >= 0 and rol == "dueno"):
        for r in reportes_raw:
            linea_ruta = next((x["linea_id"] for x in rutas_raw if x["id"] == r["ruta_id"]), None)
            if rol != "admin" and linea_ruta not in (alcance or []):
                continue
            reportes.append(
                {
                    "id": r["id"],
                    "ruta_id": r["ruta_id"],
                    "usuario_id": r["usuario_id"],
                    "descripcion": r["descripcion"],
                    "latitud": float(r["latitud"]) if r["latitud"] is not None else None,
                    "longitud": float(r["longitud"]) if r["longitud"] is not None else None,
                    "estado": r["estado"],
                    "creado_en": _ms(r["creado_en"]),
                    "revisado_por": r["revisado_por"],
                    "revisado_en": _ms(r["revisado_en"]),
                }
            )

    fallas = []
    for f in fallas_raw:
        autorizado = rol == "admin" or f["linea_id"] in (alcance or []) or (
            usuario_id and any(c["usuario_id"] == usuario_id and c["linea_id"] == f["linea_id"] for c in choferes_raw)
        )
        if not autorizado and f["estado"] == "resuelta":
            continue
        item = {
            "id": f["id"],
            "vehiculo_id": f["vehiculo_id"],
            "linea_id": f["linea_id"],
            "tipo": f["tipo"],
            "impide_circular": _bool(f["impide_circular"]),
            "estado": f["estado"],
        }
        if autorizado:
            item.update(
                {
                    "descripcion": f["descripcion"],
                    "reportado_por": f["reportado_por"],
                    "viaje_id": f["viaje_id"],
                    "creado_en": _ms(f["creado_en"]),
                    "atendido_por": f["atendido_por"],
                    "nota_solucion": f["nota_solucion"],
                    "resuelto_en": _ms(f["resuelto_en"]),
                }
            )
            fallas.append(item)
        elif f["estado"] != "resuelta":
            fallas.append(item)

    return {
        "version": "servidor",
        "usuarios": usuarios,
        "lineas": lineas_out,
        "choferes": choferes,
        "vehiculos": vehiculos_out,
        "paradas": paradas_out,
        "rutas": rutas,
        "viajes": viajes,
        "reportes": reportes,
        "fallas": fallas,
        "estados": [{"clave": e["clave"], "nombre": e["nombre"]} for e in estados],
        "municipios": [
            {"estado_clave": m["estado_clave"], "clave": m["clave"], "nombre": m["nombre"]} for m in municipios
        ],
    }
