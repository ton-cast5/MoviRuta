package com.moviruta.app

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.flow.MutableSharedFlow
import org.json.JSONObject
import org.json.JSONTokener

data class Usuario(val nombre: String, val email: String, val rol: String, val rolTexto: String, val panel: String) {
    val iniciales: String
        get() = nombre.split(Regex("\\s+")).filter { it.isNotBlank() }.take(2)
            .joinToString("") { it.first().uppercase() }.ifEmpty { "?" }
}

/** Opción del menú del panel según el perfil (la misma lista MRUI.MENUS de la página). */
data class OpcionMenu(val clave: String, val texto: String, val url: String, val icono: String)

data class InfoPagina(val usuario: Usuario? = null, val menu: List<OpcionMenu> = emptyList(), val seccion: String = "") {
    companion object {
        /** Interpreta el resultado de [GuionesWeb.INFO] devuelto por evaluateJavascript. */
        fun desdeJson(crudo: String?): InfoPagina? {
            val texto = runCatching { JSONTokener(crudo).nextValue() as? String }.getOrNull() ?: return null
            val json = runCatching { JSONObject(texto) }.getOrNull() ?: return null
            val usuario = json.optJSONObject("usuario")?.let {
                Usuario(it.optString("nombre"), it.optString("email"), it.optString("rol"), it.optString("rolTexto"), it.optString("panel"))
            }
            val opciones = json.optJSONArray("menu")
            val menu = buildList {
                if (opciones != null) for (i in 0 until opciones.length()) {
                    val o = opciones.optJSONObject(i) ?: continue
                    add(OpcionMenu(o.optString("clave"), o.optString("texto"), o.optString("url"), o.optString("icono")))
                }
            }
            return InfoPagina(usuario, menu, json.optString("seccion"))
        }
    }
}

/** Estado del navegador interno que observa la interfaz nativa. */
class EstadoWeb {
    var url by mutableStateOf<String?>(null)
    var progreso by mutableIntStateOf(0)
    var cargando by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)
    var info by mutableStateOf(InfoPagina())
    var puedeRegresar by mutableStateOf(false)
    var listo by mutableStateOf(false)

    val avisos = MutableSharedFlow<String>(extraBufferCapacity = 8)

    fun avisar(texto: String) {
        avisos.tryEmit(texto)
    }

    val pagina: String get() = Sitio.pagina(url)
    val seccion: Seccion? get() = Seccion.de(pagina)
    val enPanel: Boolean get() = '/' in pagina

    val titulo: String
        get() = when {
            enPanel -> info.menu.firstOrNull { it.clave == info.seccion }?.texto ?: "Mi panel"
            else -> when (pagina) {
                "rutas.html" -> "Rutas y líneas"
                "ruta.html" -> "Detalle de la ruta"
                "paradas.html" -> "Paradas"
                "parada.html" -> "Detalle de la parada"
                "mapa.html" -> "Mapa en vivo"
                "login.html" -> "Iniciar sesión"
                else -> "MoviRuta"
            }
        }

    val subtitulo: String?
        get() = if (enPanel) info.usuario?.rolTexto?.takeIf { it.isNotBlank() }?.let { "Panel · $it" } else null
}
