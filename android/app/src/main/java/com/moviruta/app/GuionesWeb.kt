package com.moviruta.app

import org.json.JSONObject

/** Código que la app ejecuta dentro de la página web de MoviRuta. */
object GuionesWeb {

    /**
     * En la app el encabezado web se sustituye por la barra superior, la barra inferior y el menú lateral nativos,
     * así que se oculta y se quita el hueco de 5rem (pt-20, 100vh-5rem…) que la página reserva para él.
     */
    private val CSS = """
        #mr-encabezado { display: none !important; }
        html.mr-app main#contenido.pt-20, html.mr-app .min-h-screen.pt-20 { padding-top: 0 !important; }
        html.mr-app .h-\[calc\(100vh-5rem\)\] { height: 100vh !important; }
        html.mr-app .min-h-\[calc\(100vh-5rem\)\] { min-height: 100vh !important; }
        html.mr-app .scroll-mt-24 { scroll-margin-top: 1rem !important; }
        html.mr-app #mr-avisos { top: 1rem !important; left: 1rem; right: 1rem; align-items: center; }
        @media (min-width: 1024px) { html.mr-app .lg\:top-24 { top: 1.5rem !important; } }
        html.mr-app { -webkit-tap-highlight-color: transparent; }
        /* El menú del panel vive en el cajón nativo: sin aside ni scroll horizontal web */
        html.mr-app aside[data-oculto-impresion], html.mr-app .mr-panel-nav { display: none !important; }
        html.mr-app .lg\:grid-cols-\[264px_minmax\(0\,1fr\)\] { grid-template-columns: minmax(0,1fr) !important; }
    """.trimIndent()

    /** Se ejecuta al iniciar cada documento: marca el modo app y envía window.print() al servicio de impresión de Android. */
    fun alIniciar(puente: String) = """
        (function () {
          if (window.__moviRutaApp) return;
          window.__moviRutaApp = true;
          var aplicar = function () {
            var raiz = document.documentElement;
            if (!raiz) return false;
            raiz.classList.add('mr-app');
            if (!document.getElementById('mr-app-estilo')) {
              var estilo = document.createElement('style');
              estilo.id = 'mr-app-estilo';
              estilo.textContent = ${JSONObject.quote(CSS)};
              (document.head || raiz).appendChild(estilo);
            }
            return true;
          };
          if (!aplicar()) document.addEventListener('readystatechange', aplicar, { once: true });
          window.print = function () {
            try { $puente.postMessage('imprimir'); } catch (e) { }
          };
        })();
    """.trimIndent()

    /** Usuario con sesión, menú de su panel y sección actual (MRServicios y MRUI son constantes globales de la página). */
    val INFO = """
        (function () {
          try {
            var S = typeof MRServicios !== 'undefined' ? MRServicios : null;
            var U = typeof MRUI !== 'undefined' ? MRUI : null;
            var base = typeof MR !== 'undefined' && MR.url ? MR.url : function (r) { return r; };
            var abs = function (r) { return new URL(base(r), location.href).href; };
            var u = S && S.sesion ? S.sesion.usuarioActual() : null;
            var menu = u && U && U.MENUS && U.MENUS[u.rol] ? U.MENUS[u.rol] : [];
            return JSON.stringify({
              usuario: u ? {
                nombre: u.nombre || '', email: u.email || '', rol: u.rol || '',
                rolTexto: (S.ROLES && S.ROLES[u.rol]) || u.rol || '',
                panel: S.PANELES && S.PANELES[u.rol] ? abs(S.PANELES[u.rol]) : ''
              } : null,
              menu: menu.map(function (m) { return { clave: m[0], texto: m[1], url: abs(m[2]), icono: m[3] }; }),
              seccion: (document.body && (document.body.dataset.seccion || document.body.dataset.pagina)) || ''
            });
          } catch (e) {
            return JSON.stringify({ usuario: null, menu: [], seccion: '' });
          }
        })();
    """.trimIndent()

    val CERRAR_SESION = """
        (function () {
          try { MRServicios.sesion.cerrarSesion(); } catch (e) { }
          try { MRUI.ir('index.html', 'Cerraste sesión. ¡Hasta pronto!', 'info'); }
          catch (e) { location.href = '/index.html'; }
        })();
    """.trimIndent()

    const val SUBIR = "window.scrollTo({ top: 0, behavior: 'smooth' });"

    const val DESPUES_DE_IMPRIMIR = "window.dispatchEvent(new Event('afterprint'));"
}
