"""Aplicar cambios del cliente en una sola transacción."""
from __future__ import annotations

import re
from typing import Any

import bcrypt

from . import db, ids
from .snapshot import _lineas_dueno


class ErrorGuardar(Exception):
    def __init__(self, mensaje: str, estado: int = 400):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.estado = estado


def _txt(v, maximo: int) -> str:
    return str(v or "").strip()[:maximo]


def _bool01(v) -> int:
    return 1 if v in (True, 1, "1", "true", "True") else 0


def _mapa(nuevos: list) -> dict:
    return {str(x.get("id")): x for x in nuevos if x.get("id") is not None}


def _resolver(mapa: dict, valor):
    if valor is None:
        return None
    s = str(valor)
    return mapa.get(s, s)


def _actor(conn, uid: str | None) -> dict | None:
    if not uid:
        return None
    return db.fetchone(conn, "SELECT * FROM usuario WHERE id = %s AND activo = 1", (uid,))


def _alcance(conn, uid: str | None):
    return _lineas_dueno(conn, uid)


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def aplicar(conn, cambios: dict, usuario_id: str | None, datos_sesion: dict) -> None:
    actor = _actor(conn, usuario_id)
    alcance = _alcance(conn, usuario_id)
    id_usuarios: dict[str, str] = {}
    id_lineas: dict[str, str] = {}
    id_paradas: dict[str, str] = {}
    id_rutas: dict[str, str] = {}

    orden = ["usuarios", "lineas", "paradas", "choferes", "vehiculos", "rutas", "viajes", "reportes", "fallas"]
    for clave in cambios:
        if clave not in orden:
            raise ErrorGuardar(f"Colección no permitida: {clave}")

    for tabla in orden:
        if tabla not in cambios:
            continue
        bloque = cambios.get(tabla) or {}
        if not isinstance(bloque, dict):
            raise ErrorGuardar("Formato de cambios inválido.")
        nuevos = bloque.get("nuevos") or []
        editados = bloque.get("editados") or []
        borrados = bloque.get("borrados") or []
        if borrados:
            raise ErrorGuardar("No se pueden borrar registros de esa colección.", 403)
        if not nuevos and not editados:
            continue

        if tabla == "usuarios":
            _usuarios(conn, nuevos, editados, actor, alcance, id_usuarios)
        elif tabla == "lineas":
            _lineas(conn, nuevos, editados, actor, id_usuarios, id_lineas)
        elif tabla == "paradas":
            _paradas(conn, nuevos, editados, actor, id_paradas)
        elif tabla == "choferes":
            _choferes(conn, nuevos, editados, actor, alcance, id_usuarios, id_lineas)
        elif tabla == "vehiculos":
            _vehiculos(conn, nuevos, editados, actor, alcance, id_lineas)
        elif tabla == "rutas":
            _rutas(conn, nuevos, editados, actor, alcance, id_lineas, id_paradas, id_rutas)
        elif tabla == "viajes":
            _viajes(conn, nuevos, editados, actor)
        elif tabla == "reportes":
            _reportes(conn, nuevos, editados, actor, alcance, datos_sesion, usuario_id, id_rutas)
        elif tabla == "fallas":
            _fallas(conn, nuevos, editados, actor, alcance, usuario_id)


def _usuarios(conn, nuevos, editados, actor, alcance, mapa):
    for fila in nuevos + editados:
        es_nuevo = fila in nuevos
        nombre = _txt(fila.get("nombre"), 100)
        apellido = _txt(fila.get("apellido"), 100)
        email = _txt(fila.get("email"), 150).lower()
        rol = _txt(fila.get("rol"), 20)
        activo = _bool01(fila.get("activo", True))
        password = fila.get("password") or ""
        if not nombre or not apellido or not email or "@" not in email:
            raise ErrorGuardar("Nombre, apellido y correo son obligatorios.")
        if rol not in {"pasajero", "chofer", "dueno", "admin"}:
            raise ErrorGuardar("Rol no válido.")
        if not actor or actor["rol"] not in {"admin", "dueno"}:
            raise ErrorGuardar("No tienes permiso para gestionar usuarios.", 403)
        if actor["rol"] == "dueno" and rol != "chofer":
            raise ErrorGuardar("Como dueño solo puedes gestionar choferes.", 403)
        if es_nuevo and (not isinstance(password, str) or len(password) < 8):
            raise ErrorGuardar("La contraseña debe tener al menos 8 caracteres.")
        if es_nuevo:
            uid = ids.usuario(conn, rol)
            db.execute(
                conn,
                """INSERT INTO usuario (id, rol, nombre, apellido, email, password_hash, activo)
                   VALUES (%s,%s,%s,%s,%s,%s,%s)""",
                (uid, rol, nombre, apellido, email, _hash(password), activo),
            )
            mapa[str(fila.get("id"))] = uid
        else:
            uid = str(fila.get("id"))
            if actor["rol"] == "admin" and uid == actor["id"] and (rol != "admin" or not activo):
                raise ErrorGuardar("No puedes quitarte el rol de administrador ni desactivarte.")
            if password:
                if len(str(password)) < 8:
                    raise ErrorGuardar("La contraseña debe tener al menos 8 caracteres.")
                db.execute(
                    conn,
                    """UPDATE usuario SET rol=%s, nombre=%s, apellido=%s, email=%s, password_hash=%s, activo=%s
                       WHERE id=%s""",
                    (rol, nombre, apellido, email, _hash(str(password)), activo, uid),
                )
            else:
                db.execute(
                    conn,
                    """UPDATE usuario SET rol=%s, nombre=%s, apellido=%s, email=%s, activo=%s WHERE id=%s""",
                    (rol, nombre, apellido, email, activo, uid),
                )


def _lineas(conn, nuevos, editados, actor, mapa_usuarios, mapa_lineas):
    if not actor or actor["rol"] != "admin":
        raise ErrorGuardar("Solo el administrador gestiona líneas.", 403)
    for fila in nuevos + editados:
        es_nuevo = fila in nuevos
        nombre = _txt(fila.get("nombre"), 120)
        descripcion = _txt(fila.get("descripcion"), 255) or None
        telefono = _txt(fila.get("telefono"), 30) or None
        activa = _bool01(fila.get("activa", True))
        estado = _txt(fila.get("estado_clave"), 3).upper()
        siglas = _txt(fila.get("siglas"), 3).upper()
        duenos = fila.get("duenos") or []
        if isinstance(duenos, str):
            duenos = [duenos]
        if not nombre:
            raise ErrorGuardar("El nombre de la línea es obligatorio.")
        if es_nuevo:
            if not ids.RE_ESTADO.match(estado) or not ids.RE_SIGLAS.match(siglas):
                raise ErrorGuardar("Estado (3 letras) y siglas (3) son obligatorios.")
            lid, serie = ids.linea(conn, estado, siglas)
            db.execute(
                conn,
                """INSERT INTO linea_transporte (id, estado_clave, serie, siglas, nombre, descripcion, telefono, activa)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
                (lid, estado, serie, siglas, nombre, descripcion, telefono, activa),
            )
            mapa_lineas[str(fila.get("id"))] = lid
        else:
            lid = str(fila["id"])
            db.execute(
                conn,
                """UPDATE linea_transporte SET nombre=%s, descripcion=%s, telefono=%s, activa=%s WHERE id=%s""",
                (nombre, descripcion, telefono, activa, lid),
            )
        db.execute(conn, "DELETE FROM linea_dueno WHERE linea_id = %s", (lid,))
        for d in duenos:
            did = _resolver(mapa_usuarios, d)
            u = db.fetchone(conn, "SELECT id, rol, activo FROM usuario WHERE id = %s", (did,))
            if not u or u["rol"] != "dueno" or not u["activo"]:
                raise ErrorGuardar("Cada dueño debe ser un usuario activo con rol dueño.")
            db.execute(conn, "INSERT INTO linea_dueno (linea_id, usuario_id) VALUES (%s,%s)", (lid, did))


def _paradas(conn, nuevos, editados, actor, mapa):
    if not actor or actor["rol"] not in {"admin", "dueno"}:
        raise ErrorGuardar("No tienes permiso para gestionar paradas.", 403)
    for fila in nuevos + editados:
        es_nuevo = fila in nuevos
        if not es_nuevo and actor["rol"] != "admin":
            raise ErrorGuardar("Solo el administrador edita paradas existentes.", 403)
        nombre = _txt(fila.get("nombre"), 120)
        if not nombre:
            raise ErrorGuardar("El nombre de la parada es obligatorio.")
        try:
            lat = round(float(fila["latitud"]), 6)
            lng = round(float(fila["longitud"]), 6)
        except (KeyError, TypeError, ValueError) as e:
            raise ErrorGuardar("Coordenadas de parada inválidas.") from e
        codigo = _txt(fila.get("codigo"), 10).lstrip("#").upper() or None
        referencia = _txt(fila.get("referencia"), 255) or None
        activa = _bool01(fila.get("activa", True)) if actor["rol"] == "admin" else 1
        if es_nuevo:
            estado = _txt(fila.get("estado_clave"), 3).upper()
            municipio = _txt(fila.get("municipio_clave"), 3).zfill(3)
            if not ids.RE_ESTADO.match(estado) or not ids.RE_MUNICIPIO.match(municipio):
                raise ErrorGuardar("Estado y municipio (INEGI 3 dígitos) son obligatorios.")
            pid, serie = ids.ruta_o_parada(conn, "parada", estado, municipio)
            db.execute(
                conn,
                """INSERT INTO parada (id, estado_clave, municipio_clave, serie, codigo, nombre, referencia, latitud, longitud, activa)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (pid, estado, municipio, serie, codigo, nombre, referencia, lat, lng, activa),
            )
            mapa[str(fila.get("id"))] = pid
        else:
            db.execute(
                conn,
                """UPDATE parada SET codigo=%s, nombre=%s, referencia=%s, latitud=%s, longitud=%s, activa=%s WHERE id=%s""",
                (codigo, nombre, referencia, lat, lng, activa, str(fila["id"])),
            )


def _choferes(conn, nuevos, editados, actor, alcance, mapa_usuarios, mapa_lineas):
    if not actor or actor["rol"] not in {"admin", "dueno"}:
        raise ErrorGuardar("No tienes permiso para gestionar choferes.", 403)
    for fila in nuevos + editados:
        es_nuevo = fila in nuevos
        licencia = _txt(fila.get("numero_licencia") or fila.get("id"), 30).upper()
        linea_id = _resolver(mapa_lineas, fila.get("linea_id"))
        telefono = _txt(fila.get("telefono"), 30) or None
        seguro = _bool01(fila.get("seguro_vida", False))
        activo = _bool01(fila.get("activo", True))
        if not licencia or not linea_id:
            raise ErrorGuardar("Licencia y línea son obligatorias.")
        if alcance is not None and linea_id not in alcance:
            raise ErrorGuardar("No administras esa línea.", 403)
        if es_nuevo:
            usuario_id = _resolver(mapa_usuarios, fila.get("usuario_id"))
            u = db.fetchone(conn, "SELECT id, rol FROM usuario WHERE id = %s", (usuario_id,))
            if not u or u["rol"] != "chofer":
                raise ErrorGuardar("El usuario del chofer debe tener rol chofer.")
            db.execute(
                conn,
                """INSERT INTO chofer (numero_licencia, usuario_id, linea_id, telefono, seguro_vida, activo)
                   VALUES (%s,%s,%s,%s,%s,%s)""",
                (licencia, usuario_id, linea_id, telefono, seguro, activo),
            )
        else:
            db.execute(
                conn,
                """UPDATE chofer SET linea_id=%s, telefono=%s, seguro_vida=%s, activo=%s WHERE numero_licencia=%s""",
                (linea_id, telefono, seguro, activo, licencia),
            )


def _vehiculos(conn, nuevos, editados, actor, alcance, mapa_lineas):
    if not actor or actor["rol"] not in {"admin", "dueno"}:
        raise ErrorGuardar("No tienes permiso para gestionar vehículos.", 403)
    for fila in nuevos + editados:
        es_nuevo = fila in nuevos
        placa = _txt(fila.get("placa") or fila.get("id"), 15).upper()
        linea_id = _resolver(mapa_lineas, fila.get("linea_id"))
        unidad = _txt(fila.get("numero_unidad"), 20).upper()
        if not ids.RE_PLACA.match(placa) or not linea_id or not unidad:
            raise ErrorGuardar("Placa, unidad y línea son obligatorias.")
        if alcance is not None and linea_id not in alcance:
            raise ErrorGuardar("No administras esa línea.", 403)
        modelo = _txt(fila.get("modelo"), 80) or None
        capacidad = fila.get("capacidad")
        capacidad = int(capacidad) if capacidad not in (None, "") else None
        flags = {k: _bool01(fila.get(k, False)) for k in ("cuenta_con_gps", "climatizado", "tv_a_bordo", "accesible", "activo")}
        if not es_nuevo:
            ocupado = db.fetchone(
                conn,
                "SELECT id FROM viaje WHERE vehiculo_id = %s AND estado = 'en_curso'",
                (placa,),
            )
            actual = db.fetchone(conn, "SELECT linea_id, activo FROM vehiculo WHERE placa = %s", (placa,))
            if ocupado and actual and (str(actual["linea_id"]) != str(linea_id) or (actual["activo"] and not flags["activo"])):
                raise ErrorGuardar("No puedes cambiar de línea ni desactivar una unidad en viaje.")
        campos = (
            linea_id,
            unidad,
            modelo,
            capacidad,
            flags["cuenta_con_gps"],
            flags["climatizado"],
            flags["tv_a_bordo"],
            flags["accesible"],
            flags["activo"],
            placa,
        )
        if es_nuevo:
            db.execute(
                conn,
                """INSERT INTO vehiculo (placa, linea_id, numero_unidad, modelo, capacidad,
                    cuenta_con_gps, climatizado, tv_a_bordo, accesible, activo)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (placa, *campos[:-1]),
            )
        else:
            db.execute(
                conn,
                """UPDATE vehiculo SET linea_id=%s, numero_unidad=%s, modelo=%s, capacidad=%s,
                    cuenta_con_gps=%s, climatizado=%s, tv_a_bordo=%s, accesible=%s, activo=%s WHERE placa=%s""",
                campos,
            )


def _rutas(conn, nuevos, editados, actor, alcance, mapa_lineas, mapa_paradas, mapa_rutas):
    if not actor or actor["rol"] not in {"admin", "dueno"}:
        raise ErrorGuardar("No tienes permiso para gestionar rutas.", 403)
    for fila in nuevos + editados:
        es_nuevo = fila in nuevos
        linea_id = _resolver(mapa_lineas, fila.get("linea_id"))
        if alcance is not None and linea_id not in alcance:
            raise ErrorGuardar("No administras esa línea.", 403)
        codigo = _txt(fila.get("codigo"), 10).upper()
        origen = _txt(fila.get("origen"), 120)
        destino = _txt(fila.get("destino"), 120)
        nombre = _txt(fila.get("nombre"), 250) or f"{origen}-{destino}"
        if origen and destino:
            nombre = f"{origen}-{destino}"
        sentido = _txt(fila.get("sentido"), 10)
        color = _txt(fila.get("color"), 7).upper()
        if not re.fullmatch(r"#[0-9A-F]{6}", color):
            raise ErrorGuardar("Color de ruta inválido.")
        if sentido not in {"ida", "vuelta", "circular"}:
            raise ErrorGuardar("Sentido de ruta inválido.")
        tarifa_edu = fila.get("tarifa_edu")
        tarifa_gral = fila.get("tarifa_gral", fila.get("tarifa"))
        tarifa_inapam = fila.get("tarifa_inapam")

        def money(v):
            if v in (None, ""):
                return None
            n = float(v)
            if n < 0 or n > 9999:
                raise ErrorGuardar("Tarifa fuera de rango.")
            return n

        te, tg, ti = money(tarifa_edu), money(tarifa_gral), money(tarifa_inapam)
        vel = float(fila.get("velocidad_promedio_kmh") or 0)
        if vel < 5 or vel > 80:
            raise ErrorGuardar("La velocidad promedio debe estar entre 5 y 80 km/h.")
        estado_serv = _txt(fila.get("estado_servicio") or "normal", 20)
        aviso = _txt(fila.get("aviso"), 255) or None
        activa = _bool01(fila.get("activa", True))
        paradas = [_resolver(mapa_paradas, p) for p in (fila.get("paradas") or [])]
        recorrido = fila.get("recorrido") or []
        if len(paradas) < 2 or len(recorrido) < 2:
            raise ErrorGuardar("La ruta necesita al menos 2 paradas y 2 puntos de recorrido.")
        if es_nuevo:
            estado = _txt(fila.get("estado_clave"), 3).upper()
            municipio = _txt(fila.get("municipio_clave"), 3).zfill(3)
            rid, serie = ids.ruta_o_parada(conn, "ruta", estado, municipio)
            db.execute(
                conn,
                """INSERT INTO ruta (id, linea_id, estado_clave, municipio_clave, serie, codigo, nombre, origen, destino,
                    sentido, color, tarifa_edu, tarifa_gral, tarifa_inapam, velocidad_promedio_kmh, estado_servicio, aviso, activa)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (rid, linea_id, estado, municipio, serie, codigo, nombre, origen, destino, sentido, color, te, tg, ti, vel, estado_serv, aviso, activa),
            )
            mapa_rutas[str(fila.get("id"))] = rid
        else:
            rid = str(fila["id"])
            db.execute(
                conn,
                """UPDATE ruta SET linea_id=%s, codigo=%s, nombre=%s, origen=%s, destino=%s, sentido=%s, color=%s,
                    tarifa_edu=%s, tarifa_gral=%s, tarifa_inapam=%s, velocidad_promedio_kmh=%s,
                    estado_servicio=%s, aviso=%s, activa=%s WHERE id=%s""",
                (linea_id, codigo, nombre, origen, destino, sentido, color, te, tg, ti, vel, estado_serv, aviso, activa, rid),
            )
            db.execute(conn, "DELETE FROM ruta_parada WHERE ruta_id = %s", (rid,))
            db.execute(conn, "DELETE FROM recorrido_punto WHERE ruta_id = %s", (rid,))
        for i, p in enumerate(paradas, 1):
            db.execute(conn, "INSERT INTO ruta_parada (ruta_id, orden, parada_id) VALUES (%s,%s,%s)", (rid, i, p))
        for i, pt in enumerate(recorrido[:2000], 1):
            db.execute(
                conn,
                "INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES (%s,%s,%s,%s)",
                (rid, i, float(pt[0]), float(pt[1])),
            )


def _viajes(conn, nuevos, editados, actor):
    if not actor or actor["rol"] != "chofer":
        raise ErrorGuardar("Solo un chofer gestiona viajes.", 403)
    chofer = db.fetchone(conn, "SELECT * FROM chofer WHERE usuario_id = %s AND activo = 1", (actor["id"],))
    if not chofer:
        raise ErrorGuardar("No hay perfil de chofer activo.", 403)
    for fila in nuevos:
        vehiculo_id = _txt(fila.get("vehiculo_id"), 15).upper()
        ruta_id = str(fila.get("ruta_id"))
        pasajeros = fila.get("pasajeros_salida")
        if db.fetchone(conn, "SELECT id FROM viaje WHERE chofer_id = %s AND estado = 'en_curso'", (chofer["numero_licencia"],)):
            raise ErrorGuardar("Ya tienes un viaje en curso.")
        ruta = db.fetchone(conn, "SELECT * FROM ruta WHERE id = %s AND activa = 1", (ruta_id,))
        veh = db.fetchone(conn, "SELECT * FROM vehiculo WHERE placa = %s AND activo = 1", (vehiculo_id,))
        if not ruta or not veh or ruta["linea_id"] != chofer["linea_id"] or veh["linea_id"] != chofer["linea_id"]:
            raise ErrorGuardar("Ruta o vehículo no disponibles para tu línea.")
        if db.fetchone(conn, "SELECT id FROM viaje WHERE vehiculo_id = %s AND estado = 'en_curso'", (vehiculo_id,)):
            raise ErrorGuardar("Esa unidad ya está en un viaje.")
        if db.fetchone(
            conn,
            "SELECT id FROM falla_vehiculo WHERE vehiculo_id = %s AND estado <> 'resuelta' AND impide_circular = 1",
            (vehiculo_id,),
        ):
            raise ErrorGuardar("La unidad tiene una falla que impide circular.")
        if pasajeros is not None:
            pasajeros = int(pasajeros)
            cap = veh["capacidad"] or 300
            if pasajeros < 0 or pasajeros > cap:
                raise ErrorGuardar("Número de pasajeros inválido.")
        linea = db.fetchone(conn, "SELECT siglas FROM linea_transporte WHERE id = %s", (chofer["linea_id"],))
        vid = ids.viaje(conn, linea["siglas"], veh["numero_unidad"])
        db.execute(
            conn,
            """INSERT INTO viaje (id, chofer_id, vehiculo_id, ruta_id, inicio, pasajeros_salida, estado)
               VALUES (%s,%s,%s,%s,NOW(),%s,'en_curso')""",
            (vid, chofer["numero_licencia"], vehiculo_id, ruta_id, pasajeros),
        )
    for fila in editados:
        if fila.get("estado") != "finalizado":
            raise ErrorGuardar("Solo se puede finalizar un viaje.")
        v = db.fetchone(conn, "SELECT * FROM viaje WHERE id = %s", (str(fila["id"]),))
        if not v or v["chofer_id"] != chofer["numero_licencia"] or v["estado"] != "en_curso":
            raise ErrorGuardar("No puedes finalizar ese viaje.", 403)
        db.execute(conn, "UPDATE viaje SET estado = 'finalizado', fin = NOW() WHERE id = %s", (v["id"],))


def _reportes(conn, nuevos, editados, actor, alcance, datos_sesion, usuario_id, mapa_rutas):
    import time

    ahora = int(time.time())
    historial = [t for t in (datos_sesion.get("reportes") or []) if ahora - int(t) < 3600]
    for fila in nuevos:
        if len(historial) >= 5 or (historial and ahora - int(historial[-1]) < 60):
            raise ErrorGuardar("Demasiados reportes. Espera un momento.", 429)
        ruta_id = _resolver(mapa_rutas, fila.get("ruta_id"))
        desc = _txt(fila.get("descripcion"), 500)
        if len(desc) < 10:
            raise ErrorGuardar("Describe el accidente con al menos 10 caracteres.")
        ruta = db.fetchone(
            conn,
            """SELECT r.id FROM ruta r JOIN linea_transporte l ON l.id = r.linea_id
               WHERE r.id = %s AND r.activa = 1 AND l.activa = 1""",
            (ruta_id,),
        )
        if not ruta:
            raise ErrorGuardar("Ruta no válida.")
        lat = lng = None
        if fila.get("latitud") is not None and fila.get("longitud") is not None:
            lat, lng = float(fila["latitud"]), float(fila["longitud"])
        rid = ids.reporte(conn, ruta_id)
        db.execute(
            conn,
            """INSERT INTO reporte_accidente (id, ruta_id, usuario_id, descripcion, latitud, longitud, estado)
               VALUES (%s,%s,%s,%s,%s,%s,'nuevo')""",
            (rid, ruta_id, usuario_id, desc, lat, lng),
        )
        historial.append(ahora)
    datos_sesion["reportes"] = historial
    for fila in editados:
        if not actor or actor["rol"] not in {"admin", "dueno"}:
            raise ErrorGuardar("No puedes revisar reportes.", 403)
        if fila.get("estado") != "revisado":
            raise ErrorGuardar("Estado de reporte inválido.")
        r = db.fetchone(conn, "SELECT r.*, ru.linea_id FROM reporte_accidente r JOIN ruta ru ON ru.id = r.ruta_id WHERE r.id = %s", (str(fila["id"]),))
        if not r or r["estado"] != "nuevo":
            raise ErrorGuardar("Ese reporte ya no se puede revisar.")
        if actor["rol"] == "dueno" and (alcance is None or r["linea_id"] not in alcance):
            raise ErrorGuardar("No administras la línea de ese reporte.", 403)
        db.execute(
            conn,
            "UPDATE reporte_accidente SET estado='revisado', revisado_por=%s, revisado_en=NOW() WHERE id=%s",
            (actor["id"], r["id"]),
        )


def _fallas(conn, nuevos, editados, actor, alcance, usuario_id):
    if not actor:
        raise ErrorGuardar("Inicia sesión para reportar fallas.", 401)
    for fila in nuevos:
        placa = _txt(fila.get("vehiculo_id"), 15).upper()
        tipo = _txt(fila.get("tipo"), 20)
        desc = _txt(fila.get("descripcion"), 500) or None
        impide = _bool01(fila.get("impide_circular", False))
        veh = db.fetchone(conn, "SELECT * FROM vehiculo WHERE placa = %s", (placa,))
        if not veh:
            raise ErrorGuardar("Vehículo no encontrado.")
        if actor["rol"] == "dueno" and (alcance is None or veh["linea_id"] not in alcance):
            raise ErrorGuardar("No administras esa unidad.", 403)
        if actor["rol"] == "chofer":
            ch = db.fetchone(conn, "SELECT linea_id FROM chofer WHERE usuario_id = %s", (actor["id"],))
            if not ch or ch["linea_id"] != veh["linea_id"]:
                raise ErrorGuardar("No perteneces a la línea de esa unidad.", 403)
        if actor["rol"] not in {"admin", "dueno", "chofer"}:
            raise ErrorGuardar("No tienes permiso.", 403)
        if tipo == "otro" and (not desc or len(desc) < 5):
            raise ErrorGuardar("Describe la falla.")
        if db.fetchone(
            conn,
            "SELECT id FROM falla_vehiculo WHERE vehiculo_id = %s AND tipo = %s AND estado <> 'resuelta'",
            (placa, tipo),
        ):
            raise ErrorGuardar("Ya hay una falla abierta de ese tipo en la unidad.")
        viaje = db.fetchone(
            conn,
            "SELECT id FROM viaje WHERE vehiculo_id = %s AND estado = 'en_curso'",
            (placa,),
        )
        fid = ids.falla(conn, placa, veh["linea_id"])
        db.execute(
            conn,
            """INSERT INTO falla_vehiculo (id, vehiculo_id, linea_id, tipo, descripcion, impide_circular, estado, reportado_por, viaje_id)
               VALUES (%s,%s,%s,%s,%s,%s,'pendiente',%s,%s)""",
            (fid, placa, veh["linea_id"], tipo, desc, impide, usuario_id, viaje["id"] if viaje else None),
        )
    for fila in editados:
        if not actor or actor["rol"] not in {"admin", "dueno"}:
            raise ErrorGuardar("No puedes atender fallas.", 403)
        estado = _txt(fila.get("estado"), 15)
        nota = _txt(fila.get("nota_solucion"), 255) or None
        f = db.fetchone(conn, "SELECT * FROM falla_vehiculo WHERE id = %s", (str(fila["id"]),))
        if not f:
            raise ErrorGuardar("Falla no encontrada.", 404)
        if actor["rol"] == "dueno" and (alcance is None or f["linea_id"] not in alcance):
            raise ErrorGuardar("No administras esa falla.", 403)
        actual = f["estado"]
        if not (
            (actual == "pendiente" and estado in {"en_reparacion", "resuelta"})
            or (actual == "en_reparacion" and estado == "resuelta")
        ):
            raise ErrorGuardar("Transición de estado no permitida.")
        if estado == "resuelta":
            db.execute(
                conn,
                """UPDATE falla_vehiculo SET estado=%s, nota_solucion=%s, atendido_por=%s, resuelto_en=NOW()
                   WHERE id=%s""",
                (estado, nota, actor["id"], f["id"]),
            )
        else:
            db.execute(
                conn,
                """UPDATE falla_vehiculo SET estado=%s, nota_solucion=%s, atendido_por=%s WHERE id=%s""",
                (estado, nota, actor["id"], f["id"]),
            )
