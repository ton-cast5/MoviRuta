from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock

import bcrypt
from fastapi import APIRouter, Request

from .. import db, ids, sesion_store
from ..http_util import error, exigir_moviruta, ok
from ..guardar import _hash

router = APIRouter()

# Bloqueo por email + IP (no por cookie): intentos fallidos recientes.
_INTENTOS: dict[str, list[float]] = defaultdict(list)
_LOCK = Lock()
_MAX_FALLIDOS = 5
_VENTANA_S = 300
_BLOQUEO_S = 60


def _clave_intento(email: str, request: Request) -> str:
    ip = (request.client.host if request.client else "") or "0"
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if forwarded:
        ip = forwarded
    return f"{email}|{ip}"


def _bloqueado(clave: str) -> int:
    ahora = time.time()
    with _LOCK:
        marcas = [t for t in _INTENTOS[clave] if ahora - t < _VENTANA_S]
        _INTENTOS[clave] = marcas
        if len(marcas) >= _MAX_FALLIDOS:
            espera = int(_BLOQUEO_S - (ahora - marcas[-1]))
            return max(1, espera)
    return 0


def _registrar_fallo(clave: str) -> None:
    with _LOCK:
        _INTENTOS[clave].append(time.time())


def _limpiar_fallos(clave: str) -> None:
    with _LOCK:
        _INTENTOS.pop(clave, None)


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
    except Exception:
        return error("Error interno del servidor.", 500)


def _entrar(conn, request, sid, datos, cuerpo):
    from fastapi import Response

    email = str(cuerpo.get("email") or "").strip().lower()
    password = str(cuerpo.get("password") or "")
    clave = _clave_intento(email or "anon", request)
    espera = _bloqueado(clave)
    if espera:
        return error(
            f"Demasiados intentos. Espera {espera} segundos e intenta nuevamente.",
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
        _registrar_fallo(clave)
        # Regenerar id de sesión en fallo para no reutilizar el mismo sid
        sid = sesion_store.regenerar(conn, {})
        return error("Correo o contraseña incorrectos.", 401)
    if not u["activo"]:
        return error("Tu cuenta está desactivada. Comunícate con el administrador.", 403)
    _limpiar_fallos(clave)
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
