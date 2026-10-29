package com.moviruta.app.ui

import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Login
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.automirrored.outlined.OpenInNew
import androidx.compose.material.icons.outlined.CarCrash
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.outlined.NearMe
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.Route
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.moviruta.app.BuildConfig
import com.moviruta.app.EstadoWeb
import com.moviruta.app.Sitio
import com.moviruta.app.Usuario

/** Menú lateral: secciones públicas, menú del panel según el perfil y la cuenta (lo que en la web está en el encabezado). */
@Composable
fun CajonMoviRuta(
    estado: EstadoWeb,
    onAbrir: (String) -> Unit,
    onCerrarSesion: () -> Unit,
    onCompartir: () -> Unit,
    onNavegador: () -> Unit,
) {
    val info = estado.info
    val usuario = info.usuario
    val actual = estado.url?.let(Uri::parse)
    val esActual = { url: String ->
        val destino = Uri.parse(url)
        actual != null && Sitio.pagina(url) == estado.pagina && destino.query == actual.query && destino.fragment == actual.fragment
    }

    ModalDrawerSheet(windowInsets = WindowInsets(0, 0, 0, 0)) {
        Column(
            Modifier
                .fillMaxHeight()
                .verticalScroll(rememberScrollState())
                .navigationBarsPadding(),
        ) {
            EncabezadoCajon(usuario)
            Spacer(Modifier.height(8.dp))

            Titulo("Explorar")
            Opcion("Inicio", Icons.Outlined.Home, Sitio.url("index.html"), esActual, onAbrir)
            Opcion("Rutas y líneas", Icons.Outlined.Route, Sitio.url("rutas.html"), esActual, onAbrir)
            Opcion("Paradas", Icons.Outlined.LocationOn, Sitio.url("paradas.html"), esActual, onAbrir)
            Opcion("Mapa en vivo", Icons.Outlined.Map, Sitio.url("mapa.html"), esActual, onAbrir)
            Opcion("Paradas cercanas", Icons.Outlined.NearMe, Sitio.url("paradas.html?cerca=1"), esActual, onAbrir)
            Opcion("Estado del servicio", Icons.Outlined.Info, Sitio.url("index.html#estado-servicio"), esActual, onAbrir)
            Opcion("Reportar un accidente", Icons.Outlined.CarCrash, Sitio.url("index.html?reportar=1"), esActual, onAbrir)

            Separador()
            if (usuario != null) {
                Titulo("Mi panel · ${usuario.rolTexto}")
                info.menu.forEach { opcion ->
                    NavigationDrawerItem(
                        label = { Text(opcion.texto) },
                        icon = { Icon(iconoDe(opcion.icono), contentDescription = null) },
                        selected = estado.enPanel && opcion.clave == info.seccion && Sitio.pagina(opcion.url) == estado.pagina,
                        onClick = { onAbrir(opcion.url) },
                        modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
                    )
                }
                NavigationDrawerItem(
                    label = { Text("Cerrar sesión") },
                    icon = { Icon(Icons.AutoMirrored.Outlined.Logout, contentDescription = null) },
                    selected = false,
                    onClick = onCerrarSesion,
                    colors = NavigationDrawerItemDefaults.colors(
                        unselectedIconColor = MaterialTheme.colorScheme.error,
                        unselectedTextColor = MaterialTheme.colorScheme.error,
                    ),
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
                )
            } else {
                Titulo("Cuenta")
                Opcion("Iniciar sesión", Icons.AutoMirrored.Outlined.Login, Sitio.url("login.html"), esActual, onAbrir)
                Opcion("Crear cuenta de pasajero", Icons.Outlined.AccountCircle, Sitio.url("registro.html"), esActual, onAbrir)
            }

            Separador()
            NavigationDrawerItem(
                label = { Text("Compartir MoviRuta") },
                icon = { Icon(Icons.Outlined.Share, contentDescription = null) },
                selected = false,
                onClick = onCompartir,
                modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
            )
            NavigationDrawerItem(
                label = { Text("Abrir en el navegador") },
                icon = { Icon(Icons.AutoMirrored.Outlined.OpenInNew, contentDescription = null) },
                selected = false,
                onClick = onNavegador,
                modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
            )
            Text(
                "MoviRuta ${BuildConfig.VERSION_NAME} · ${Uri.parse(Sitio.ORIGEN).host}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.outline,
                modifier = Modifier.padding(horizontal = 28.dp, vertical = 16.dp),
            )
        }
    }
}

@Composable
private fun EncabezadoCajon(usuario: Usuario?) {
    val colores = MaterialTheme.colorScheme
    Column(
        Modifier
            .fillMaxWidth()
            .background(Brush.linearGradient(listOf(colores.primary, colores.primaryContainer)))
            .statusBarsPadding()
            .padding(horizontal = 20.dp, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Marca()
        if (usuario == null) {
            Text(
                "Rutas, paradas y unidades del transporte público en tiempo real.",
                style = MaterialTheme.typography.bodyMedium,
                color = colores.onPrimaryContainer,
            )
        } else {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = CircleShape, color = colores.secondaryContainer, modifier = Modifier.size(48.dp)) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(usuario.iniciales, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = colores.primary)
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(usuario.nombre, style = MaterialTheme.typography.titleMedium, color = Color.White, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(usuario.email, style = MaterialTheme.typography.bodySmall, color = colores.onPrimaryContainer, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Spacer(Modifier.height(4.dp))
                    Surface(shape = RoundedCornerShape(50), color = colores.secondaryContainer.copy(alpha = 0.25f)) {
                        Text(
                            usuario.rolTexto.uppercase(),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = colores.secondaryContainer,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun Titulo(texto: String) {
    Text(
        texto,
        style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(horizontal = 28.dp, vertical = 12.dp),
    )
}

@Composable
private fun Separador() {
    HorizontalDivider(Modifier.padding(horizontal = 28.dp, vertical = 8.dp))
}

@Composable
private fun Opcion(texto: String, icono: ImageVector, url: String, esActual: (String) -> Boolean, onAbrir: (String) -> Unit) {
    NavigationDrawerItem(
        label = { Text(texto) },
        icon = { Icon(icono, contentDescription = null) },
        selected = esActual(url),
        onClick = { onAbrir(url) },
        modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
    )
}
