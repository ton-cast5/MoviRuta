from __future__ import annotations

import time

import bcrypt
from fastapi import APIRouter, Request

from .. import db, ids, sesion_store
from ..http_util import error, exigir_moviruta, ok
from ..guardar import _hash

router = APIRouter()


@router.api_route("/sesion", methods=["GET", "POST"])
@router.api_route("/sesion.php", methods=["GET", "POST"])
async def sesion(request: Request):
    if request.method != "POST":
        return error("Método no permitido.", 405)
    if (err := exigir_moviruta(request)):
        return err
    try:
        cuerpo = await request.json()
    except Exception:
        return error("JSON inválido.")
    if not isinstance(cuerpo, dict):
        return error("JSON inválido.")
    accion = cuerpo.get("accion")
    try:
        with db.conexion() as conn:
            sid, datos = sesion_store.cargar(conn, request)
            if accion == "entrar":
                return _entrar(conn, request, sid, datos, cuerpo)
            if accion == "salir":
                sid = sesion_store.regenerar(conn, {})
                from fastapi import Response

                return ok(conn, request, Response(), {}, sid)
            if accion == "registrar":
                return _registrar(conn, request, sid, datos, cuerpo)
            return error("Acción no válida.")
    except db.ErrorBase as e:
        return error(e.mensaje, e.estado)
    except Exception as e:  # noqa: BLE001
        if db.es_duplicado(e):
            return error("Ese correo ya está registrado.", 409)
        return error(f"Error interno: {e}", 500)


def _entrar(conn, request, sid, datos, cuerpo):
    from fastapi import Response

    email = str(cuerpo.get("email") or "").strip().lower()
    password = str(cuerpo.get("password") or "")
    control = datos.get("login") or {"intentos": 0, "hasta": 0}
    ahora = int(time.time())
    if int(control.get("hasta") or 0) > ahora:
        return error(
            f"Demasiados intentos. Espera {int(control['hasta']) - ahora} segundos e intenta nuevamente.",
            429,
        )
    u = db.fetchone(conn, "SELECT * FROM usuario WHERE email = %s", (email,))
    hash_ok = False
    if u and u.get("password_hash"):
        try:
            hash_ok = bcrypt.checkpw(password.encode("utf-8"), u["password_hash"].encode("utf-8"))
        except ValueError:
            hash_ok = False
    if not u or not hash_ok:
        control["intentos"] = int(control.get("intentos") or 0) + 1
        if control["intentos"] >= 5:
            control["hasta"] = ahora + 60
            control["intentos"] = 0
        datos["login"] = control
        sid = sesion_store.regenerar(conn, datos) if False else sid
        sesion_store.guardar(conn, sid, datos)
        return error("Correo o contraseña incorrectos.", 401)
    if not u["activo"]:
        return error("Tu cuenta está desactivada. Comunícate con el administrador.", 403)
    if bcrypt.checkpw and password:
        # rehash si hace falta (coste distinto)
        try:
            if not u["password_hash"].startswith("$2"):
                pass
        except Exception:
            pass
    db.execute(conn, "UPDATE usuario SET ultimo_acceso = NOW() WHERE id = %s", (u["id"],))
    datos = {"usuario_id": u["id"]}
    sid = sesion_store.regenerar(conn, datos)
    return ok(conn, request, Response(), datos, sid)


def _registrar(conn, request, sid, datos, cuerpo):
    from fastapi import Response

    nombre = str(cuerpo.get("nombre") or "").strip()[:100]
    apellido = str(cuerpo.get("apellido") or "").strip()[:100]
    email = str(cuerpo.get("email") or "").strip().lower()[:150]
    password = str(cuerpo.get("password") or "")
    if not nombre or not apellido or "@" not in email:
        return error("Nombre, apellido y correo son obligatorios.")
    if len(password) < 8:
        return error("La contraseña debe tener al menos 8 caracteres.")
    if db.fetchone(conn, "SELECT id FROM usuario WHERE email = %s", (email,)):
        return error("Ese correo ya está registrado.", 409)
    uid = ids.usuario(conn, "pasajero")
    db.execute(
        conn,
        """INSERT INTO usuario (id, rol, nombre, apellido, email, password_hash, activo)
           VALUES (%s,'pasajero',%s,%s,%s,%s,1)""",
        (uid, nombre, apellido, email, _hash(password)),
    )
    datos = {"usuario_id": uid}
    sid = sesion_store.regenerar(conn, datos)
    return ok(conn, request, Response(), datos, sid)
