package com.moviruta.app

import android.net.Uri
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Route
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.outlined.Route
import androidx.compose.ui.graphics.vector.ImageVector

/** Sitio web de MoviRuta que la app muestra (el mismo que se publica en Vercel con Supabase). */
object Sitio {
    val ORIGEN: String = BuildConfig.SITIO.trimEnd('/')
    private val HOST: String = Uri.parse(ORIGEN).host.orEmpty()
    val INICIO: String = url("index.html")

    fun url(ruta: String) = "$ORIGEN/${ruta.trimStart('/')}"

    fun esPropia(uri: Uri?): Boolean =
        uri != null && (uri.scheme == "https" || uri.scheme == "http") && uri.host.equals(HOST, ignoreCase = true)

    fun esPropia(url: String?): Boolean = !url.isNullOrEmpty() && esPropia(Uri.parse(url))

    /** Página sin dominio ni consulta: "index.html", "rutas.html", "admin/fallas.html"… Vacío si no es del sitio. */
    fun pagina(url: String?): String {
        if (!esPropia(url)) return ""
        return Uri.parse(url).path.orEmpty().trim('/').ifEmpty { "index.html" }
    }
}

/** Pestañas de la barra inferior; equivalen al menú principal del encabezado de la página web. */
enum class Seccion(val texto: String, val ruta: String, val icono: ImageVector, val iconoActivo: ImageVector) {
    INICIO("Inicio", "index.html", Icons.Outlined.Home, Icons.Filled.Home),
    RUTAS("Rutas", "rutas.html", Icons.Outlined.Route, Icons.Filled.Route),
    PARADAS("Paradas", "paradas.html", Icons.Outlined.LocationOn, Icons.Filled.LocationOn),
    MAPA("Mapa", "mapa.html", Icons.Outlined.Map, Icons.Filled.Map),
    CUENTA("Entrar", "login.html", Icons.Outlined.AccountCircle, Icons.Filled.AccountCircle);

    companion object {
        fun de(pagina: String): Seccion? = when (pagina) {
            "" -> null
            "index.html" -> INICIO
            "rutas.html", "ruta.html" -> RUTAS
            "paradas.html", "parada.html" -> PARADAS
            "mapa.html" -> MAPA
            "login.html" -> CUENTA
            else -> if ('/' in pagina) CUENTA else null
        }
    }
}
