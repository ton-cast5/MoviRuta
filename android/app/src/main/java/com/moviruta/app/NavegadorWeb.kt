package com.moviruta.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.print.PageRange
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintManager
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.RenderProcessGoneDetail
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature

/** WebView con la página de MoviRuta y las integraciones nativas que la página necesita. */
@SuppressLint("SetJavaScriptEnabled")
class NavegadorWeb(private val actividad: ComponentActivity, private val estado: EstadoWeb) {

    val vista = WebView(actividad)

    private val guionAlInicio = WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)
    private var falloLaCarga = false
    private var ubicacionPendiente: Pair<String, GeolocationPermissions.Callback>? = null
    private var archivosPendientes: ValueCallback<Array<Uri>>? = null

    private val pedirUbicacion = actividad.registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { respuesta ->
        val concedida = respuesta.values.any { it }
        ubicacionPendiente?.let { (origen, callback) -> callback.invoke(origen, concedida, false) }
        ubicacionPendiente = null
        if (!concedida) estado.avisar("MoviRuta no tiene permiso para usar tu ubicación.")
    }

    private val elegirArchivos = actividad.registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { r ->
        archivosPendientes?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(r.resultCode, r.data))
        archivosPendientes = null
    }

    init {
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        configurar()
        vista.webViewClient = Cliente()
        vista.webChromeClient = ClienteChrome()
        vista.setDownloadListener { url, _, _, _, _ -> lanzar(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
        conectarPuente()
    }

    private fun configurar() {
        vista.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            setGeolocationEnabled(true)
            allowFileAccess = false
            allowContentAccess = false
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            mediaPlaybackRequiresUserGesture = true
            userAgentString = "$userAgentString MoviRutaApp/${BuildConfig.VERSION_NAME}"
            if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
                WebSettingsCompat.setAlgorithmicDarkeningAllowed(this, false)
            }
        }
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(vista, false)
        }
        vista.setBackgroundColor(0xFFF7F9FB.toInt())
    }

    private fun conectarPuente() {
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(vista, PUENTE, setOf(Sitio.ORIGEN)) { _, mensaje, _, esPrincipal, _ ->
                if (esPrincipal) atender(mensaje.data)
            }
        } else {
            vista.addJavascriptInterface(PuenteLegado(), PUENTE)
        }
        if (guionAlInicio) WebViewCompat.addDocumentStartJavaScript(vista, GuionesWeb.alIniciar(PUENTE), setOf(Sitio.ORIGEN))
    }

    private inner class PuenteLegado {
        @JavascriptInterface
        fun postMessage(dato: String?) {
            vista.post { if (Sitio.esPropia(vista.url)) atender(dato) }
        }
    }

    private fun atender(dato: String?) {
        when (dato) {
            "imprimir" -> imprimir()
        }
    }

    /* ---------------- Acciones de la interfaz nativa ---------------- */

    fun abrir(url: String) {
        if (estado.error == null && url == vista.url) vista.evaluateJavascript(GuionesWeb.SUBIR, null)
        else vista.loadUrl(url)
    }

    fun recargar() {
        val actual = vista.url
        if (Sitio.esPropia(actual)) vista.reload() else vista.loadUrl(estado.url?.takeIf { Sitio.esPropia(it) } ?: Sitio.INICIO)
    }

    fun regresar() {
        if (vista.canGoBack()) vista.goBack()
    }

    fun cerrarSesion() = vista.evaluateJavascript(GuionesWeb.CERRAR_SESION, null)

    fun guardar(estadoGuardado: Bundle) {
        vista.saveState(estadoGuardado)
    }

    fun restaurar(estadoGuardado: Bundle): Boolean = vista.restoreState(estadoGuardado) != null

    fun pausar() {
        vista.onPause()
        vista.pauseTimers()
        CookieManager.getInstance().flush()
    }

    fun reanudar() {
        vista.resumeTimers()
        vista.onResume()
    }

    fun destruir() {
        vista.stopLoading()
        (vista.parent as? ViewGroup)?.removeView(vista)
        vista.destroy()
    }

    /* ---------------- Impresión (mapa en PDF y horarios) ---------------- */

    private fun imprimir() {
        val gestor = actividad.getSystemService(Context.PRINT_SERVICE) as? PrintManager ?: return
        val nombre = "MoviRuta - ${estado.titulo}"
        val base = vista.createPrintDocumentAdapter(nombre)
        val adaptador = object : PrintDocumentAdapter() {
            override fun onStart() = base.onStart()

            override fun onLayout(
                anteriores: PrintAttributes?, nuevos: PrintAttributes?, cancelar: CancellationSignal?,
                callback: PrintDocumentAdapter.LayoutResultCallback?, extras: Bundle?,
            ) = base.onLayout(anteriores, nuevos, cancelar, callback, extras)

            override fun onWrite(
                paginas: Array<out PageRange>?, destino: ParcelFileDescriptor?, cancelar: CancellationSignal?,
                callback: PrintDocumentAdapter.WriteResultCallback?,
            ) = base.onWrite(paginas, destino, cancelar, callback)

            override fun onFinish() {
                base.onFinish()
                vista.evaluateJavascript(GuionesWeb.DESPUES_DE_IMPRIMIR, null)
            }
        }
        val atributos = PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.NA_LETTER).build()
        gestor.print(nombre, adaptador, atributos)
    }

    /* ---------------- Enlaces externos ---------------- */

    /** Devuelve true si el enlace se abrió fuera de la app (Maps, teléfono, correo, otros sitios…). */
    private fun abrirFuera(uri: Uri): Boolean {
        if (Sitio.esPropia(uri)) return false
        when (uri.scheme?.lowercase()) {
            null, "about", "data", "blob", "javascript" -> return false
            "tel" -> lanzar(Intent(Intent.ACTION_DIAL, uri))
            "intent" -> {
                val intento = runCatching { Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME) }.getOrNull() ?: return true
                intento.addCategory(Intent.CATEGORY_BROWSABLE)
                intento.component = null
                intento.selector = null
                if (!lanzar(intento, avisarSiFalla = false)) {
                    val respaldo = intento.getStringExtra("browser_fallback_url")
                    if (respaldo != null) lanzar(Intent(Intent.ACTION_VIEW, Uri.parse(respaldo)))
                    else estado.avisar("No hay una aplicación para abrir este enlace.")
                }
            }
            else -> lanzar(Intent(Intent.ACTION_VIEW, uri))
        }
        return true
    }

    private fun lanzar(intento: Intent, avisarSiFalla: Boolean = true): Boolean = try {
        actividad.startActivity(intento)
        true
    } catch (e: ActivityNotFoundException) {
        if (avisarSiFalla) estado.avisar("No hay una aplicación para abrir este enlace.")
        false
    } catch (e: SecurityException) {
        if (avisarSiFalla) estado.avisar("No se pudo abrir este enlace.")
        false
    }

    private fun tienePermisoDeUbicacion() =
        listOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION).any {
            ContextCompat.checkSelfPermission(actividad, it) == PackageManager.PERMISSION_GRANTED
        }

    private fun inyectar() {
        if (Sitio.esPropia(vista.url)) vista.evaluateJavascript(GuionesWeb.alIniciar(PUENTE), null)
    }

    private fun leerPagina() {
        if (!Sitio.esPropia(vista.url)) return
        vista.evaluateJavascript(GuionesWeb.INFO) { crudo ->
            InfoPagina.desdeJson(crudo)?.let { estado.info = it }
        }
    }

    private fun mensajeDeError(codigo: Int) = when (codigo) {
        WebViewClient.ERROR_HOST_LOOKUP, WebViewClient.ERROR_CONNECT, WebViewClient.ERROR_TIMEOUT, WebViewClient.ERROR_IO ->
            "Revisa tu conexión a internet (datos móviles o Wi-Fi) e inténtalo de nuevo."
        WebViewClient.ERROR_FAILED_SSL_HANDSHAKE -> "No se pudo establecer una conexión segura con MoviRuta."
        else -> "No se pudo cargar MoviRuta en este momento. Inténtalo de nuevo."
    }

    private inner class Cliente : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
            request.isForMainFrame && abrirFuera(request.url)

        override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) {
            falloLaCarga = false
            estado.cargando = true
            estado.url = url
            estado.info = estado.info.copy(seccion = "")
        }

        override fun onPageCommitVisible(view: WebView, url: String?) {
            if (!guionAlInicio) inyectar()
        }

        override fun onPageFinished(view: WebView, url: String?) {
            estado.cargando = false
            estado.listo = true
            if (!falloLaCarga) {
                estado.error = null
                if (!guionAlInicio) inyectar()
                leerPagina()
            }
            CookieManager.getInstance().flush()
        }

        override fun doUpdateVisitedHistory(view: WebView, url: String?, isReload: Boolean) {
            estado.url = url
            estado.puedeRegresar = view.canGoBack()
        }

        override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
            if (!request.isForMainFrame) return
            falloLaCarga = true
            estado.error = mensajeDeError(error.errorCode)
        }

        override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
            actividad.recreate()
            return true
        }
    }

    private inner class ClienteChrome : WebChromeClient() {
        override fun onProgressChanged(view: WebView, newProgress: Int) {
            estado.progreso = newProgress
        }

        override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
            if (!Sitio.esPropia(origin)) {
                callback.invoke(origin, false, false)
                return
            }
            if (tienePermisoDeUbicacion()) {
                callback.invoke(origin, true, false)
                return
            }
            ubicacionPendiente?.let { (o, c) -> c.invoke(o, false, false) }
            ubicacionPendiente = origin to callback
            pedirUbicacion.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
        }

        override fun onGeolocationPermissionsHidePrompt() {
            ubicacionPendiente = null
        }

        override fun onShowFileChooser(
            webView: WebView, filePathCallback: ValueCallback<Array<Uri>>, fileChooserParams: FileChooserParams,
        ): Boolean {
            archivosPendientes?.onReceiveValue(null)
            archivosPendientes = filePathCallback
            return try {
                elegirArchivos.launch(fileChooserParams.createIntent())
                true
            } catch (e: ActivityNotFoundException) {
                archivosPendientes = null
                false
            }
        }
    }

    private companion object {
        const val PUENTE = "MoviRutaAndroid"
    }
}
