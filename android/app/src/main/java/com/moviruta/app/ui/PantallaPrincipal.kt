package com.moviruta.app.ui

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.ViewGroup
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.isImeVisible
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.automirrored.outlined.OpenInNew
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.rounded.Menu
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.moviruta.app.EstadoWeb
import com.moviruta.app.NavegadorWeb
import com.moviruta.app.R
import com.moviruta.app.Seccion
import com.moviruta.app.Sitio
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun PantallaPrincipal(estado: EstadoWeb, navegador: NavegadorWeb) {
    val contexto = LocalContext.current
    val cajon = rememberDrawerState(DrawerValue.Closed)
    val alcance = rememberCoroutineScope()
    val avisos = remember { SnackbarHostState() }
    var confirmarCierre by remember { mutableStateOf(false) }
    var salirPendiente by remember { mutableStateOf(false) }
    val tecladoVisible = WindowInsets.isImeVisible

    LaunchedEffect(estado) {
        estado.avisos.collect { texto ->
            avisos.currentSnackbarData?.dismiss()
            launch { avisos.showSnackbar(texto) }
        }
    }
    LaunchedEffect(salirPendiente) {
        if (salirPendiente) {
            delay(2500)
            salirPendiente = false
        }
    }

    BackHandler(enabled = !cajon.isOpen && !estado.puedeRegresar && !salirPendiente) {
        salirPendiente = true
        estado.avisar("Presiona atrás otra vez para salir de MoviRuta")
    }
    BackHandler(enabled = !cajon.isOpen && estado.puedeRegresar) { navegador.regresar() }
    BackHandler(enabled = cajon.isOpen) { alcance.launch { cajon.close() } }

    val abrir: (String) -> Unit = { destino ->
        alcance.launch { cajon.close() }
        navegador.abrir(destino)
    }
    val urlActual = { estado.url?.takeIf { Sitio.esPropia(it) } ?: Sitio.INICIO }

    ModalNavigationDrawer(
        drawerState = cajon,
        gesturesEnabled = cajon.isOpen,
        drawerContent = {
            CajonMoviRuta(
                estado = estado,
                onAbrir = abrir,
                onCerrarSesion = {
                    alcance.launch { cajon.close() }
                    confirmarCierre = true
                },
                onCompartir = { compartir(contexto, Sitio.INICIO) },
                onNavegador = { abrirEnNavegador(contexto, urlActual()) },
            )
        },
    ) {
        Scaffold(
            topBar = {
                BarraSuperior(
                    estado = estado,
                    onMenu = { alcance.launch { cajon.open() } },
                    onRecargar = navegador::recargar,
                    onCompartir = { compartir(contexto, urlActual()) },
                    onNavegador = { abrirEnNavegador(contexto, urlActual()) },
                )
            },
            bottomBar = { if (!tecladoVisible) BarraInferior(estado, onAbrir = abrir) },
            snackbarHost = { SnackbarHost(avisos) },
            containerColor = MaterialTheme.colorScheme.background,
        ) { relleno ->
            Box(
                Modifier
                    .fillMaxSize()
                    .padding(relleno)
                    .consumeWindowInsets(relleno)
                    .imePadding(),
            ) {
                AndroidView(
                    factory = { navegador.vista.apply { (parent as? ViewGroup)?.removeView(this) } },
                    modifier = Modifier.fillMaxSize(),
                )
                AnimatedVisibility(
                    visible = estado.error != null,
                    enter = fadeIn(),
                    exit = fadeOut(),
                ) {
                    PantallaSinConexion(
                        mensaje = estado.error.orEmpty(),
                        reintentando = estado.cargando,
                        onReintentar = navegador::recargar,
                    )
                }
                AnimatedVisibility(
                    visible = estado.cargando,
                    enter = fadeIn(),
                    exit = fadeOut(),
                    modifier = Modifier.align(Alignment.TopCenter),
                ) {
                    LinearProgressIndicator(
                        progress = { estado.progreso / 100f },
                        modifier = Modifier.fillMaxWidth(),
                        color = MaterialTheme.colorScheme.secondary,
                        trackColor = Color.Transparent,
                    )
                }
            }
        }
    }

    if (confirmarCierre) {
        AlertDialog(
            onDismissRequest = { confirmarCierre = false },
            icon = { Icon(Icons.AutoMirrored.Outlined.Logout, contentDescription = null) },
            title = { Text("¿Cerrar sesión?") },
            text = { Text("Volverás a la página de inicio como invitado. Podrás entrar de nuevo cuando quieras.") },
            confirmButton = {
                TextButton(onClick = {
                    confirmarCierre = false
                    navegador.cerrarSesion()
                }) { Text("Cerrar sesión") }
            },
            dismissButton = { TextButton(onClick = { confirmarCierre = false }) { Text("Cancelar") } },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BarraSuperior(
    estado: EstadoWeb,
    onMenu: () -> Unit,
    onRecargar: () -> Unit,
    onCompartir: () -> Unit,
    onNavegador: () -> Unit,
) {
    val colores = MaterialTheme.colorScheme
    var menuAbierto by remember { mutableStateOf(false) }
    TopAppBar(
        title = {
            if (estado.pagina == "index.html" || estado.pagina.isEmpty()) {
                Marca()
            } else {
                Column {
                    Text(estado.titulo, maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.titleLarge)
                    estado.subtitulo?.let {
                        Text(it, maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.labelMedium, color = colores.onPrimaryContainer)
                    }
                }
            }
        },
        navigationIcon = {
            IconButton(onClick = onMenu) { Icon(Icons.Rounded.Menu, contentDescription = "Abrir menú") }
        },
        actions = {
            IconButton(onClick = onRecargar) { Icon(Icons.Rounded.Refresh, contentDescription = "Actualizar") }
            Box {
                IconButton(onClick = { menuAbierto = true }) { Icon(Icons.Rounded.MoreVert, contentDescription = "Más opciones") }
                DropdownMenu(expanded = menuAbierto, onDismissRequest = { menuAbierto = false }) {
                    DropdownMenuItem(
                        text = { Text("Compartir esta página") },
                        leadingIcon = { Icon(Icons.Outlined.Share, contentDescription = null) },
                        onClick = {
                            menuAbierto = false
                            onCompartir()
                        },
                    )
                    DropdownMenuItem(
                        text = { Text("Abrir en el navegador") },
                        leadingIcon = { Icon(Icons.AutoMirrored.Outlined.OpenInNew, contentDescription = null) },
                        onClick = {
                            menuAbierto = false
                            onNavegador()
                        },
                    )
                }
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = colores.primary,
            titleContentColor = colores.onPrimary,
            navigationIconContentColor = colores.onPrimary,
            actionIconContentColor = colores.onPrimary,
        ),
    )
}

private data class Pestana(val seccion: Seccion, val texto: String, val url: String, val icono: ImageVector, val iconoActivo: ImageVector)

@Composable
private fun BarraInferior(estado: EstadoWeb, onAbrir: (String) -> Unit) {
    val usuario = estado.info.usuario
    val actual = estado.seccion
    val pestanas = Seccion.entries.map { s ->
        if (s == Seccion.CUENTA && usuario != null && usuario.panel.isNotEmpty()) {
            Pestana(s, "Mi panel", usuario.panel, Icons.Outlined.Dashboard, Icons.Filled.Dashboard)
        } else {
            Pestana(s, s.texto, Sitio.url(s.ruta), s.icono, s.iconoActivo)
        }
    }
    NavigationBar {
        pestanas.forEach { p ->
            val elegida = p.seccion == actual
            NavigationBarItem(
                selected = elegida,
                onClick = { onAbrir(p.url) },
                icon = { Icon(if (elegida) p.iconoActivo else p.icono, contentDescription = null) },
                label = { Text(p.texto, maxLines = 1) },
            )
        }
    }
}

@Composable
private fun PantallaSinConexion(mensaje: String, reintentando: Boolean, onReintentar: () -> Unit) {
    Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Surface(shape = CircleShape, color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.45f), modifier = Modifier.size(112.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Outlined.CloudOff, contentDescription = null, modifier = Modifier.size(52.dp), tint = MaterialTheme.colorScheme.primary)
                }
            }
            Spacer(Modifier.height(24.dp))
            Text("Sin conexión con MoviRuta", style = MaterialTheme.typography.headlineSmall, textAlign = TextAlign.Center)
            Spacer(Modifier.height(8.dp))
            Text(
                mensaje,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(28.dp))
            Button(onClick = onReintentar, enabled = !reintentando) {
                if (reintentando) {
                    CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                } else {
                    Icon(Icons.Rounded.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                }
                Spacer(Modifier.width(8.dp))
                Text(if (reintentando) "Conectando…" else "Reintentar")
            }
        }
    }
}

/** Logo y nombre de MoviRuta como en el encabezado de la página web. */
@Composable
fun Marca(modifier: Modifier = Modifier) {
    Row(modifier, verticalAlignment = Alignment.CenterVertically) {
        Surface(shape = RoundedCornerShape(10.dp), color = Color.White, shadowElevation = 2.dp) {
            Image(
                painter = painterResource(R.drawable.ic_logo),
                contentDescription = null,
                modifier = Modifier
                    .padding(horizontal = 8.dp, vertical = 6.dp)
                    .size(width = 46.dp, height = 22.dp),
            )
        }
        Spacer(Modifier.width(12.dp))
        Text(
            buildAnnotatedString {
                append("Movi")
                withStyle(SpanStyle(color = MaterialTheme.colorScheme.secondaryContainer)) { append("Ruta") }
            },
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = Color.White,
        )
    }
}

fun compartir(contexto: Context, url: String) {
    val envio = Intent(Intent.ACTION_SEND)
        .setType("text/plain")
        .putExtra(Intent.EXTRA_SUBJECT, "MoviRuta")
        .putExtra(Intent.EXTRA_TEXT, "Consulta rutas, paradas y unidades en tiempo real con MoviRuta: $url")
    contexto.startActivity(Intent.createChooser(envio, "Compartir MoviRuta"))
}

fun abrirEnNavegador(contexto: Context, url: String) {
    try {
        contexto.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE))
    } catch (_: ActivityNotFoundException) {
    }
}
