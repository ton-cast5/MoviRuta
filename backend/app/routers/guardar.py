from fastapi import APIRouter, Request, Response

from .. import db, sesion_store
from ..guardar import ErrorGuardar, aplicar
from ..http_util import error, exigir_moviruta, ok

router = APIRouter()


@router.api_route("/guardar", methods=["GET", "POST"])
@router.api_route("/guardar.php", methods=["GET", "POST"])
async def guardar(request: Request):
    if request.method != "POST":
        return error("Método no permitido.", 405)
    if (err := exigir_moviruta(request)):
        return err
    try:
        cuerpo = await request.json()
    except Exception:
        return error("JSON inválido.")
    if not isinstance(cuerpo, dict) or not isinstance(cuerpo.get("cambios"), dict):
        return error("JSON inválido.")
    try:
        with db.conexion() as conn:
            sid, datos = sesion_store.cargar(conn, request)
            uid = sesion_store.usuario_id(datos)
            aplicar(conn, cuerpo["cambios"], uid, datos)
            return ok(conn, request, Response(), datos, sid)
    except ErrorGuardar as e:
        return error(e.mensaje, e.estado)
    except db.ErrorBase as e:
        return error(e.mensaje, e.estado)
    except Exception as e:  # noqa: BLE001
        if db.es_duplicado(e):
            return error("Ya existe un registro con esos datos.", 409)
        if db.es_fk(e):
            return error("Los datos no cumplen las relaciones de la base.", 400)
        return error(f"Error interno: {e}", 500)
