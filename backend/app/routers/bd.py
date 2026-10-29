from fastapi import APIRouter, Request, Response

from .. import db, sesion_store
from ..http_util import error, ok

router = APIRouter()


@router.api_route("/bd", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@router.api_route("/bd.php", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def bd(request: Request):
    if request.method != "GET":
        return error("Método no permitido.", 405)
    try:
        with db.conexion() as conn:
            sid, datos = sesion_store.cargar(conn, request)
            response = Response()
            return ok(conn, request, response, datos, sid)
    except db.ErrorBase as e:
        return error(e.mensaje, e.estado)
    except Exception as e:  # noqa: BLE001
        return error(f"Error interno: {e}", 500)
