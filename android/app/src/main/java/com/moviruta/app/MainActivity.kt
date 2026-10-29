package com.moviruta.app

import android.graphics.Color
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.os.Bundle
import android.os.SystemClock
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.moviruta.app.ui.PantallaPrincipal
import com.moviruta.app.ui.TemaMoviRuta

class MainActivity : ComponentActivity() {

    private val estado = EstadoWeb()
    private lateinit var navegador: NavegadorWeb
    private var vigilanteDeRed: ConnectivityManager.NetworkCallback? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        val bienvenida = installSplashScreen()
        super.onCreate(savedInstanceState)
        val inicio = SystemClock.elapsedRealtime()
        bienvenida.setKeepOnScreenCondition { !estado.listo && SystemClock.elapsedRealtime() - inicio < ESPERA_MAXIMA_MS }

        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT),
        )

        navegador = NavegadorWeb(this, estado)
        if (savedInstanceState == null || !navegador.restaurar(savedInstanceState)) navegador.abrir(Sitio.INICIO)

        setContent {
            TemaMoviRuta {
                PantallaPrincipal(estado, navegador)
            }
        }
        vigilarRed()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        navegador.guardar(outState)
    }

    override fun onResume() {
        super.onResume()
        navegador.reanudar()
    }

    override fun onPause() {
        navegador.pausar()
        super.onPause()
    }

    override fun onDestroy() {
        vigilanteDeRed?.let { getSystemService(ConnectivityManager::class.java)?.unregisterNetworkCallback(it) }
        navegador.destruir()
        super.onDestroy()
    }

    /** Si la página no cargó por falta de red, se vuelve a intentar sola en cuanto regresa la conexión. */
    private fun vigilarRed() {
        val red = getSystemService(ConnectivityManager::class.java) ?: return
        val vigilante = object : ConnectivityManager.NetworkCallback() {
            override fun onCapabilitiesChanged(network: Network, capacidades: NetworkCapabilities) {
                if (!capacidades.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)) return
                runOnUiThread { if (estado.error != null && !estado.cargando) navegador.recargar() }
            }
        }
        runCatching { red.registerDefaultNetworkCallback(vigilante) }.onSuccess { vigilanteDeRed = vigilante }
    }

    private companion object {
        const val ESPERA_MAXIMA_MS = 6000L
    }
}
