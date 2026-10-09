/**
 * MoviRuta · interfaz común: encabezado, pie, estructura de los paneles, control de acceso por perfil,
 * avisos emergentes, ventanas modales, confirmaciones, autocompletado de paradas y animaciones.
 */
const MRUI = (() => {
    const { esc, icono, url } = MR;
    const S = MRServicios;
    const cuerpo = document.body;
    const datos = cuerpo.dataset;
    const CLAVE_AVISO = 'moviruta.aviso';
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const NAVEGACION = [
        ['inicio', 'Inicio', 'index.html', 'home'],
        ['rutas', 'Rutas', 'rutas.html', 'route'],
        ['paradas', 'Paradas', 'paradas.html', 'location_on'],
        ['mapa', 'Mapa', 'mapa.html', 'map'],
    ];

    const MENUS = {
        pasajero: [
            ['inicio', 'Mi panel', 'pasajero/index.html', 'dashboard'],
            ['historial', 'Historial', 'pasajero/historial.html', 'history'],
            ['buscar', 'Buscar ruta', 'index.html', 'search'],
            ['rutas', 'Rutas', 'rutas.html', 'route'],
            ['paradas', 'Paradas', 'paradas.html', 'location_on'],
            ['mapa', 'Mapa', 'mapa.html', 'map'],
        ],
        chofer: [
            ['inicio', 'Mi perfil', 'chofer/index.html', 'badge'],
            ['iniciar', 'Iniciar viaje', 'chofer/iniciar.html', 'play_circle'],
            ['viaje', 'Viaje actual', 'chofer/viaje.html', 'directions_bus'],
            ['historial', 'Historial de viajes', 'chofer/historial.html', 'history'],
        ],
        dueno: [
            ['inicio', 'Resumen', 'dueno/index.html', 'dashboard'],
            ['choferes', 'Choferes', 'dueno/choferes.html', 'id_card'],
            ['vehiculos', 'Vehículos', 'dueno/vehiculos.html', 'directions_bus'],
            ['rutas', 'Rutas', 'dueno/rutas.html', 'route'],
            ['paradas', 'Paradas', 'dueno/paradas.html', 'location_on'],
            ['ubicacion', 'Ubicación de vehículos', 'dueno/ubicacion.html', 'sensors'],
            ['reportes', 'Reportes de accidentes', 'dueno/reportes.html', 'car_crash'],
        ],
        admin: [
            ['inicio', 'Resumen', 'admin/index.html', 'dashboard'],
            ['lineas', 'Líneas', 'admin/lineas.html', 'hub'],
            ['usuarios', 'Usuarios', 'admin/usuarios.html', 'group'],
            ['choferes', 'Choferes', 'admin/choferes.html', 'id_card'],
            ['vehiculos', 'Vehículos', 'admin/vehiculos.html', 'directions_bus'],
            ['rutas', 'Rutas', 'admin/rutas.html', 'route'],
            ['paradas', 'Paradas', 'admin/paradas.html', 'location_on'],
            ['ubicacion', 'Ubicación de vehículos', 'admin/ubicacion.html', 'sensors'],
            ['reportes', 'Reportes de accidentes', 'admin/reportes.html', 'car_crash'],
        ],
    };

    const iniciales = (nombre) => String(nombre || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

    /* ---------------- Avisos emergentes ---------------- */

    function contenedorAvisos() {
        let c = document.getElementById('mr-avisos');
        if (!c) {
            c = document.createElement('div');
            c.id = 'mr-avisos';
            c.setAttribute('role', 'status');
            c.setAttribute('aria-live', 'polite');
            cuerpo.appendChild(c);
        }
        return c;
    }

    const ICONOS_AVISO = { exito: 'check_circle', error: 'error', advertencia: 'warning', info: 'info' };

    function aviso(mensaje, tipo = 'exito', duracion = 4800) {
        const el = document.createElement('div');
        el.className = `mr-aviso ${tipo}`;
        el.innerHTML = `${icono(ICONOS_AVISO[tipo] || 'info', 'icono relleno')}
            <p class="flex-1 leading-snug">${esc(mensaje)}</p>
            <button type="button" class="text-outline hover:text-on-surface transition-colors" aria-label="Cerrar aviso">${icono('close', 'text-[18px]')}</button>
            <span class="progreso" style="animation-duration:${duracion}ms"></span>`;
        const cerrar = () => {
            if (el.classList.contains('saliendo')) return;
            el.classList.add('saliendo');
            setTimeout(() => el.remove(), 350);
        };
        el.querySelector('button').addEventListener('click', cerrar);
        contenedorAvisos().appendChild(el);
        setTimeout(cerrar, duracion);
    }

    /** Guarda un aviso para mostrarlo en la siguiente página (después de redirigir). */
    function avisoSiguiente(mensaje, tipo = 'exito') {
        try { sessionStorage.setItem(CLAVE_AVISO, JSON.stringify({ mensaje, tipo })); } catch (e) { /* sin almacenamiento */ }
    }

    function mostrarAvisoPendiente() {
        try {
            const pendiente = JSON.parse(sessionStorage.getItem(CLAVE_AVISO));
            sessionStorage.removeItem(CLAVE_AVISO);
            if (pendiente && pendiente.mensaje) setTimeout(() => aviso(pendiente.mensaje, pendiente.tipo), 350);
        } catch (e) { /* aviso dañado */ }
    }

    function ir(destino, mensaje, tipo) {
        if (mensaje) avisoSiguiente(mensaje, tipo);
        location.href = url(destino);
    }

    /* ---------------- Ventanas modales y confirmación ---------------- */

    let ultimoFoco = null;

    function abrirModal(modal) {
        const el = typeof modal === 'string' ? document.getElementById(modal) : modal;
        if (!el) return;
        ultimoFoco = document.activeElement;
        el.classList.remove('cerrando');
        el.classList.add('abierto');
        cuerpo.style.overflow = 'hidden';
        const enfocable = el.querySelector('[autofocus], input:not([type=hidden]), textarea, select, button');
        if (enfocable) setTimeout(() => enfocable.focus(), 60);
    }

    function cerrarModal(modal) {
        const el = typeof modal === 'string' ? document.getElementById(modal) : modal;
        if (!el || !el.classList.contains('abierto')) return;
        el.classList.add('cerrando');
        setTimeout(() => {
            el.classList.remove('abierto', 'cerrando');
            if (!document.querySelector('.mr-modal.abierto')) cuerpo.style.overflow = '';
            el.dispatchEvent(new CustomEvent('mr:cerrado'));
            if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
        }, 190);
    }

    document.addEventListener('click', (e) => {
        const abrir = e.target.closest('[data-abrir-modal]');
        if (abrir) { e.preventDefault(); abrirModal(abrir.dataset.abrirModal); return; }
        const cerrar = e.target.closest('[data-cerrar-modal]');
        if (cerrar) { cerrarModal(cerrar.closest('.mr-modal')); return; }
        if (e.target.classList && e.target.classList.contains('mr-modal')) cerrarModal(e.target);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const abiertos = document.querySelectorAll('.mr-modal.abierto');
        if (abiertos.length) cerrarModal(abiertos[abiertos.length - 1]);
    });

    function confirmar({ titulo = '¿Confirmas esta acción?', mensaje = '', aceptar = 'Sí, continuar', cancelar = 'Cancelar', peligro = false, icono: nombreIcono } = {}) {
        return new Promise((resolver) => {
            const modal = document.createElement('div');
            modal.className = 'mr-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.innerHTML = `
                <div class="mr-modal-panel max-w-md p-6 text-center">
                    <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${peligro ? 'bg-error-container text-error' : 'bg-secondary-container/50 text-secondary'}">
                        ${icono(nombreIcono || (peligro ? 'warning' : 'help'), 'relleno text-[30px]')}
                    </div>
                    <h2 class="text-headline-sm font-headline-sm text-on-surface">${esc(titulo)}</h2>
                    ${mensaje ? `<p class="mt-2 text-sm text-on-surface-variant">${esc(mensaje)}</p>` : ''}
                    <div class="mt-6 flex justify-center gap-3">
                        <button type="button" class="mr-btn mr-btn-secundario" data-respuesta="no">${esc(cancelar)}</button>
                        <button type="button" class="mr-btn ${peligro ? 'mr-btn-peligro-solido' : 'mr-btn-primario'}" data-respuesta="si" autofocus>${esc(aceptar)}</button>
                    </div>
                </div>`;
            let respuesta = false;
            modal.addEventListener('click', (e) => {
                const b = e.target.closest('[data-respuesta]');
                if (b) { respuesta = b.dataset.respuesta === 'si'; cerrarModal(modal); }
            });
            modal.addEventListener('mr:cerrado', () => { modal.remove(); resolver(respuesta); });
            cuerpo.appendChild(modal);
            abrirModal(modal);
        });
    }

    /* ---------------- Animaciones ---------------- */

    const observador = 'IntersectionObserver' in window && !reducido
        ? new IntersectionObserver((entradas) => {
            entradas.forEach((en) => {
                if (!en.isIntersecting) return;
                en.target.classList.add('visible');
                if (en.target.dataset.contar !== undefined) contar(en.target);
                en.target.querySelectorAll('[data-contar]').forEach(contar);
                observador.unobserve(en.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
        : null;

    function revelar(raiz = document) {
        raiz.querySelectorAll('.mr-revelar:not(.visible)').forEach((el) => {
            if (observador) observador.observe(el);
            else { el.classList.add('visible'); el.querySelectorAll('[data-contar]').forEach(contar); }
        });
    }

    /** Cuenta de 0 al valor del atributo data-contar. */
    function contar(el) {
        const final = Number(el.dataset.contar);
        if (!Number.isFinite(final) || el.dataset.contado) return;
        el.dataset.contado = '1';
        if (reducido || final === 0) { el.textContent = final.toLocaleString('es-MX'); return; }
        const duracion = 1100;
        let inicio = null;
        const paso = (ahora) => {
            if (inicio === null) inicio = ahora;
            const t = Math.min(1, (ahora - inicio) / duracion);
            const suave = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.round(final * suave).toLocaleString('es-MX');
            if (t < 1) requestAnimationFrame(paso);
        };
        requestAnimationFrame(paso);
    }

    function contarVisibles(raiz = document) {
        raiz.querySelectorAll('[data-contar]').forEach((el) => {
            if (el.closest('.mr-revelar:not(.visible)')) return;
            contar(el);
        });
    }

    document.addEventListener('pointerdown', (e) => {
        const boton = e.target.closest('.mr-btn, .mr-onda-contenedor');
        if (!boton || boton.disabled || reducido) return;
        const r = boton.getBoundingClientRect();
        const tam = Math.max(r.width, r.height);
        const onda = document.createElement('span');
        onda.className = 'mr-onda';
        onda.style.cssText = `width:${tam}px;height:${tam}px;left:${e.clientX - r.left - tam / 2}px;top:${e.clientY - r.top - tam / 2}px`;
        boton.appendChild(onda);
        setTimeout(() => onda.remove(), 650);
    });

    /** Pone un botón en estado de carga (con giro) y lo restaura. */
    function cargando(boton, activo, texto = 'Cargando…') {
        if (!boton) return;
        if (activo) {
            boton.dataset.htmlOriginal = boton.innerHTML;
            boton.disabled = true;
            boton.innerHTML = `<span class="mr-giro"></span> ${esc(texto)}`;
        } else if (boton.dataset.htmlOriginal !== undefined) {
            boton.disabled = false;
            boton.innerHTML = boton.dataset.htmlOriginal;
            delete boton.dataset.htmlOriginal;
        }
    }

    /* ---------------- Autocompletado de paradas ---------------- */

    function resaltar(texto, busqueda) {
        const t = S.texto.norm(texto);
        const b = S.texto.norm(busqueda);
        const i = b ? t.indexOf(b) : -1;
        if (i < 0) return esc(texto);
        return `${esc(texto.slice(0, i))}<mark>${esc(texto.slice(i, i + b.length))}</mark>${esc(texto.slice(i + b.length))}`;
    }

    /** Lista desplegable de paradas que coinciden con lo que se escribe en el campo. */
    function autocompletar(campo, opciones = {}) {
        const contenedor = campo.parentElement;
        contenedor.classList.add('relative');
        let lista = null;
        let activa = -1;
        let resultados = [];

        const cerrar = () => { if (lista) { lista.remove(); lista = null; } activa = -1; campo.setAttribute('aria-expanded', 'false'); };
        const elegir = (p) => {
            campo.value = p.nombre;
            cerrar();
            campo.dispatchEvent(new Event('change', { bubbles: true }));
            if (opciones.alElegir) opciones.alElegir(p);
        };
        const pintar = () => {
            const texto = campo.value.trim();
            resultados = S.consulta.paradasPublicas(texto).slice(0, 7);
            if (!resultados.length || (resultados.length === 1 && S.texto.norm(resultados[0].nombre) === S.texto.norm(texto))) { cerrar(); return; }
            if (!lista) {
                lista = document.createElement('div');
                lista.className = 'mr-sugerencias no-scrollbar';
                lista.setAttribute('role', 'listbox');
                contenedor.appendChild(lista);
                campo.setAttribute('aria-expanded', 'true');
            }
            lista.innerHTML = `${texto ? '' : '<p class="px-2 pb-1 pt-1.5 text-label-sm font-label-sm uppercase text-outline">Sugerencias rápidas</p>'}` +
                resultados.map((p, i) => `
                <button type="button" class="mr-sugerencia${i === activa ? ' activa' : ''}" data-i="${i}" role="option">
                    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary-container/40 text-secondary">${icono('location_on', 'text-[18px]')}</span>
                    <span class="min-w-0 flex-1">
                        <span class="block truncate text-sm font-semibold text-on-surface">${resaltar(p.nombre, texto)}</span>
                        <span class="block truncate text-xs text-on-surface-variant">${esc(p.referencia || 'Parada de transporte')}</span>
                    </span>
                    <span class="rounded bg-surface-container px-1.5 py-0.5 text-[10px] font-bold text-on-surface-variant">#${esc(p.codigo)}</span>
                </button>`).join('');
        };
        campo.setAttribute('autocomplete', 'off');
        campo.setAttribute('aria-autocomplete', 'list');
        campo.addEventListener('input', pintar);
        campo.addEventListener('focus', pintar);
        campo.addEventListener('blur', () => setTimeout(cerrar, 150));
        campo.addEventListener('keydown', (e) => {
            if (!lista) return;
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                activa = (activa + (e.key === 'ArrowDown' ? 1 : -1) + resultados.length) % resultados.length;
                pintar();
            } else if (e.key === 'Enter' && activa >= 0) {
                e.preventDefault();
                elegir(resultados[activa]);
            } else if (e.key === 'Escape') {
                cerrar();
            }
        });
        contenedor.addEventListener('mousedown', (e) => {
            const b = e.target.closest('.mr-sugerencia');
            if (b) { e.preventDefault(); elegir(resultados[Number(b.dataset.i)]); }
        });
    }

    /* ---------------- Encabezado ---------------- */

    const usuario = S.sesion.usuarioActual();

    function htmlCuenta() {
        if (!usuario) {
            return `
                <a href="${url('login.html')}" class="mr-onda-contenedor relative overflow-hidden flex items-center gap-2 rounded-lg bg-secondary-container px-4 py-2 font-label-md text-label-md text-on-secondary-container transition-all hover:bg-secondary-fixed hover:shadow-brillo active:scale-95">
                    ${icono('person_add', 'text-[20px]')}<span class="hidden sm:inline">Iniciar sesión</span>
                    <span class="absolute -right-1 -top-1 mr-ping"></span>
                </a>
                <a href="${url('login.html')}" class="hidden h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-primary-container bg-primary-container text-on-primary-container transition-transform hover:scale-105 md:flex" aria-label="Iniciar sesión">
                    ${icono('account_circle', 'text-[28px]')}
                </a>`;
        }
        return `
            <a href="${url(S.PANELES[usuario.rol])}" class="hidden items-center gap-2 rounded-lg bg-secondary-container px-4 py-2 font-label-md text-label-md text-on-secondary-container transition-all hover:bg-secondary-fixed hover:shadow-brillo active:scale-95 lg:flex">
                ${icono('space_dashboard', 'text-[20px]')} Mi panel
            </a>
            <div class="relative" data-menu-cuenta>
                <button type="button" class="flex items-center gap-2 rounded-full p-0.5 pr-2 text-white transition-colors hover:bg-white/10" aria-haspopup="true" aria-expanded="false" data-abrir-cuenta>
                    <span class="mr-avatar h-10 w-10 border-2 border-secondary-container/60 text-sm">${esc(iniciales(usuario.nombre))}</span>
                    ${icono('expand_more', 'hidden text-[20px] text-white/70 sm:inline')}
                </button>
                <div class="mr-menu-cuenta absolute right-0 top-full mt-2 hidden w-72 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5" data-panel-cuenta>
                    <div class="flex items-center gap-3 bg-surface-container-low p-4">
                        <span class="mr-avatar h-11 w-11 text-sm">${esc(iniciales(usuario.nombre))}</span>
                        <div class="min-w-0">
                            <p class="truncate font-semibold text-on-surface">${esc(usuario.nombre)}</p>
                            <p class="truncate text-xs text-on-surface-variant">${esc(usuario.email)}</p>
                            <span class="mt-1 inline-block rounded-full bg-secondary-container/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-secondary-container">${esc(S.ROLES[usuario.rol])}</span>
                        </div>
                    </div>
                    <nav class="p-2 text-sm">
                        <a href="${url(S.PANELES[usuario.rol])}" class="flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium text-on-surface transition-colors hover:bg-surface-container-low">${icono('space_dashboard', 'text-[20px] text-secondary')} Ir a mi panel</a>
                        <button type="button" data-cerrar-sesion class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 font-medium text-error transition-colors hover:bg-error-container/60">${icono('logout', 'text-[20px]')} Cerrar sesión</button>
                    </nav>
                </div>
            </div>`;
    }

    function encabezado() {
        const destino = document.getElementById('mr-encabezado');
        if (!destino) return;
        const actual = datos.pagina || '';
        const enlaces = NAVEGACION.map(([clave, texto, ruta, ic]) =>
            `<a class="mr-nav-enlace${clave === actual ? ' activo' : ''}" href="${url(ruta)}"${clave === actual ? ' aria-current="page"' : ''}>${icono(ic)}${texto}</a>`).join('');
        const encabezadoEl = document.createElement('header');
        encabezadoEl.id = 'mr-encabezado';
        encabezadoEl.className = 'mr-encabezado fixed inset-x-0 top-0 z-[1500] bg-primary shadow-encabezado';
        encabezadoEl.setAttribute('data-oculto-impresion', '');
        encabezadoEl.innerHTML = `
            <div class="mx-auto flex h-20 max-w-[1440px] items-center justify-between gap-4 px-margin md:px-margin-tablet lg:px-margin-desktop">
                <div class="flex items-center gap-6 lg:gap-10">
                    <a href="${url('index.html')}" class="group flex items-center gap-3">
                        <span class="flex h-11 items-center rounded-xl bg-white px-2.5 shadow-md transition-transform duration-500 group-hover:-rotate-3 group-hover:scale-105">
                            <img src="${url('assets/img/logo.svg')}" alt="" width="59" height="28" class="h-7 w-auto">
                        </span>
                        <span class="font-headline-md text-headline-md font-bold tracking-tight text-white">Movi<span class="text-secondary-container">Ruta</span></span>
                    </a>
                    <nav class="hidden items-center gap-1 md:flex" aria-label="Principal">${enlaces}</nav>
                </div>
                <div class="flex items-center gap-3">
                    ${htmlCuenta()}
                    <button type="button" class="flex h-10 w-10 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 md:hidden" aria-label="Abrir menú" aria-expanded="false" data-abrir-menu>
                        ${icono('menu')}
                    </button>
                </div>
            </div>
            <nav class="mr-menu-movil hidden border-t border-white/10 bg-primary px-margin pb-4 pt-2 md:hidden" data-menu-movil aria-label="Principal">
                <div class="grid gap-1">${enlaces}${usuario ? `<a class="mr-nav-enlace" href="${url(S.PANELES[usuario.rol])}">${icono('space_dashboard')}Mi panel</a>` : ''}</div>
            </nav>`;
        destino.replaceWith(encabezadoEl);

        const botonMenu = encabezadoEl.querySelector('[data-abrir-menu]');
        const menuMovil = encabezadoEl.querySelector('[data-menu-movil]');
        botonMenu.addEventListener('click', () => {
            const abierto = menuMovil.classList.toggle('hidden') === false;
            botonMenu.setAttribute('aria-expanded', String(abierto));
            botonMenu.innerHTML = icono(abierto ? 'close' : 'menu');
        });

        const cuenta = encabezadoEl.querySelector('[data-menu-cuenta]');
        if (cuenta) {
            const boton = cuenta.querySelector('[data-abrir-cuenta]');
            const panel = cuenta.querySelector('[data-panel-cuenta]');
            boton.addEventListener('click', (e) => {
                e.stopPropagation();
                const abierto = panel.classList.toggle('hidden') === false;
                boton.setAttribute('aria-expanded', String(abierto));
            });
            document.addEventListener('click', (e) => {
                if (!cuenta.contains(e.target)) { panel.classList.add('hidden'); boton.setAttribute('aria-expanded', 'false'); }
            });
        }
        encabezadoEl.addEventListener('click', async (e) => {
            if (!e.target.closest('[data-cerrar-sesion]')) return;
            S.sesion.cerrarSesion();
            ir('index.html', 'Cerraste sesión. ¡Hasta pronto!', 'info');
        });

        const alDesplazar = () => encabezadoEl.classList.toggle('desplazado', window.scrollY > 8);
        window.addEventListener('scroll', alDesplazar, { passive: true });
        alDesplazar();
    }

    /* ---------------- Pie de página ---------------- */

    function pie() {
        const destino = document.getElementById('mr-pie');
        if (!destino) return;
        const telefonos = S.consulta.telefonosLineas().map((l) => `
            <li class="flex items-start gap-2">${icono('call', 'text-[18px] text-secondary-container mt-0.5')}
                <span><span class="block text-white/60 text-xs">${esc(l.nombre)}</span>
                <a href="tel:${esc(String(l.telefono).replace(/[^0-9+]/g, ''))}" class="font-semibold text-white hover:text-secondary-container">${esc(l.telefono)}</a></span>
            </li>`).join('');
        const enlace = (ruta, texto) => `<li><a href="${url(ruta)}" class="text-white/70 hover:text-secondary-container">${texto}</a></li>`;
        const pieEl = document.createElement('footer');
        pieEl.className = 'mr-pie relative overflow-hidden bg-[#00291e] text-white';
        pieEl.setAttribute('data-oculto-impresion', '');
        pieEl.innerHTML = `
            <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-secondary/20 blur-3xl"></div>
            <div class="pointer-events-none absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-primary-container/40 blur-3xl"></div>
            <div class="relative mx-auto grid max-w-[1440px] gap-10 px-margin py-14 md:grid-cols-2 md:px-margin-tablet lg:grid-cols-4 lg:px-margin-desktop">
                <div class="mr-revelar">
                    <a href="${url('index.html')}" class="flex items-center gap-3">
                        <span class="flex h-11 items-center rounded-xl bg-white px-2.5"><img src="${url('assets/img/logo.svg')}" alt="" width="59" height="28" class="h-7 w-auto"></span>
                        <span class="text-headline-sm font-headline-sm font-bold">Movi<span class="text-secondary-container">Ruta</span></span>
                    </a>
                    <p class="mt-4 text-sm leading-relaxed text-white/70">Sistema Integral de Información y Planificación del Transporte Público MoviRuta. Conectando personas y ciudades con certeza en tiempo real.</p>
                </div>
                <div class="mr-revelar" style="--retraso:80ms">
                    <h2 class="mb-4 text-label-sm font-label-sm uppercase tracking-widest text-secondary-container">Servicios y consulta</h2>
                    <ul class="grid gap-2.5 text-sm">
                        ${enlace('index.html', 'Planificador de trayectos')}
                        ${enlace('rutas.html', 'Rutas y líneas de transporte')}
                        ${enlace('mapa.html', 'Geolocalización en tiempo real')}
                        ${enlace('paradas.html?cerca=1', 'Paradas cercanas')}
                        ${enlace('index.html#estado-servicio', 'Incidencias programadas')}
                    </ul>
                </div>
                <div class="mr-revelar" style="--retraso:160ms">
                    <h2 class="mb-4 text-label-sm font-label-sm uppercase tracking-widest text-secondary-container">Atención y soporte</h2>
                    <ul class="grid gap-3 text-sm">
                        ${telefonos}
                        ${enlace('index.html?reportar=1', 'Reportar un accidente')}
                        ${enlace('index.html#estado-servicio', 'Estado del servicio')}
                    </ul>
                </div>
                <div class="mr-revelar" style="--retraso:240ms">
                    <h2 class="mb-4 text-label-sm font-label-sm uppercase tracking-widest text-secondary-container">Usa MoviRuta en tu teléfono</h2>
                    <p class="text-sm leading-relaxed text-white/70">Consulta rutas, paradas y la ubicación de las unidades desde el navegador de tu teléfono, sin instalar nada.</p>
                    <div class="mt-4 inline-flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur transition-colors hover:bg-white/10">
                        ${icono('smartphone', 'text-[30px] text-secondary-container')}
                        <div><p class="text-[10px] uppercase tracking-widest text-white/60">Disponible en</p><p class="text-sm font-semibold">Cualquier navegador web</p></div>
                    </div>
                </div>
            </div>
            <div class="relative border-t border-white/10">
                <div class="mx-auto flex max-w-[1440px] flex-col gap-2 px-margin py-5 text-xs text-white/55 md:flex-row md:items-center md:justify-between md:px-margin-tablet lg:px-margin-desktop">
                    <p>&copy; ${new Date().getFullYear()} MoviRuta. Todos los derechos reservados.</p>
                    <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>Datos del mapa &copy; Google · Mapas con <a href="https://leafletjs.com" target="_blank" rel="noopener" class="underline hover:text-white">Leaflet</a></span>
                        <button type="button" data-reiniciar-demo class="inline-flex items-center gap-1 hover:text-secondary-container">${icono('restart_alt', 'text-[15px]')} Restablecer datos de demostración</button>
                    </div>
                </div>
            </div>`;
        destino.replaceWith(pieEl);
        pieEl.querySelector('[data-reiniciar-demo]').addEventListener('click', async () => {
            const si = await confirmar({
                titulo: '¿Restablecer los datos de demostración?',
                mensaje: 'Se borrarán los cambios hechos en los paneles (líneas, rutas, viajes, reportes…) y se cerrará la sesión.',
                aceptar: 'Sí, restablecer', peligro: true, icono: 'restart_alt',
            });
            if (!si) return;
            S.reiniciarDemo();
            S.sesion.cerrarSesion();
            ir('index.html', 'Los datos de demostración se restablecieron.', 'info');
        });
    }

    /* ---------------- Cabecera de las páginas públicas ---------------- */

    /**
     * Franja verde con migas, título y subtítulo. Se configura con data-* en #mr-cabecera
     * (data-titulo, data-subtitulo, data-icono, data-migas='[["Rutas","rutas.html"],["Ruta 1"]]') o llamándola con opciones.
     */
    function cabecera(opciones = {}) {
        const el = document.getElementById('mr-cabecera');
        if (!el) return;
        const d = el.dataset;
        const o = {
            titulo: d.titulo || '', subtitulo: d.subtitulo || '', icono: d.icono || '', antetitulo: d.antetitulo || '',
            migas: d.migas ? JSON.parse(d.migas) : [], extra: '', insignia: '', ...opciones,
        };
        const migas = [['Inicio', 'index.html'], ...o.migas];
        el.className = 'relative overflow-hidden bg-primary pb-28 pt-8 lg:pt-10';
        el.setAttribute('data-oculto-impresion', '');
        el.innerHTML = `
            <div class="mr-hero-rejilla"></div>
            <div class="mr-hero-luz uno -right-24 -top-48 h-[26rem] w-[26rem] bg-secondary/30 blur-[100px]"></div>
            <div class="mr-hero-luz dos -bottom-32 left-[10%] h-72 w-72 bg-primary-container/70 blur-[80px]"></div>
            <div class="relative mx-auto max-w-[1440px] px-margin md:px-margin-tablet lg:px-margin-desktop">
                <nav aria-label="Ruta de navegación" class="mr-anim-aparecer">
                    <ol class="flex flex-wrap items-center gap-1 text-label-md font-label-md text-on-primary-container">
                        ${migas.map(([texto, ruta], i) => `<li class="flex items-center gap-1">${i ? icono('chevron_right', 'text-[16px] text-white/40') : ''}${ruta && i < migas.length - 1
                            ? `<a href="${url(ruta)}" class="transition-colors hover:text-white">${esc(texto)}</a>`
                            : `<span class="text-white" aria-current="page">${esc(texto)}</span>`}</li>`).join('')}
                    </ol>
                </nav>
                <div class="mt-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                    <div class="flex min-w-0 items-start gap-4">
                        ${o.insignia ? `<div class="mr-anim-escala">${o.insignia}</div>` : o.icono ? `<span class="mr-anim-escala hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-secondary-container ring-1 ring-white/15 sm:flex">${icono(o.icono, 'text-[30px]')}</span>` : ''}
                        <div class="min-w-0">
                            ${o.antetitulo ? `<p class="mr-anim-subir text-label-sm font-label-sm uppercase tracking-widest text-secondary-container">${esc(o.antetitulo)}</p>` : ''}
                            <h1 class="mr-anim-subir font-headline-xl-mobile text-headline-xl-mobile text-white md:font-headline-xl md:text-headline-xl" style="--retraso:70ms">${esc(o.titulo)}</h1>
                            ${o.subtitulo ? `<p class="mr-anim-subir mt-2 max-w-2xl text-body-md text-on-primary-container" style="--retraso:140ms">${esc(o.subtitulo)}</p>` : ''}
                        </div>
                    </div>
                    ${o.extra ? `<div class="mr-anim-subir shrink-0" style="--retraso:200ms">${o.extra}</div>` : ''}
                </div>
            </div>`;
    }

    /* ---------------- Paneles por perfil ---------------- */

    /** Ruta de la página actual desde la raíz del sitio (para volver después de iniciar sesión). */
    function paginaActual() {
        const partes = location.pathname.split('/').filter(Boolean);
        const n = datos.base === '..' ? 2 : 1;
        return partes.slice(-n).join('/') + location.search;
    }

    /** Verifica que haya sesión con alguno de los perfiles permitidos; si no, redirige. */
    function verificarAcceso() {
        if (!datos.rol) return true;
        const permitidos = datos.rol.split(',');
        if (!usuario) {
            avisoSiguiente('Inicia sesión para entrar a tu panel.', 'info');
            location.replace(url(`login.html?volver=${encodeURIComponent(paginaActual())}`));
            return false;
        }
        if (!permitidos.includes(usuario.rol)) {
            avisoSiguiente('Tu cuenta no tiene acceso a esa sección.', 'advertencia');
            location.replace(url(S.PANELES[usuario.rol]));
            return false;
        }
        return true;
    }

    function panel() {
        const contenido = document.getElementById('mr-panel');
        if (!contenido || !usuario) return;
        const menu = MENUS[usuario.rol] || [];
        const seccion = contenido.dataset.seccion || 'inicio';
        const titulo = contenido.dataset.titulo || 'Mi panel';
        const subtitulo = contenido.dataset.subtitulo || '';
        document.body.dataset.seccion = seccion;
        const envoltura = document.createElement('div');
        envoltura.className = 'min-h-screen pt-20';
        envoltura.innerHTML = `
            <section class="relative overflow-hidden bg-primary pb-24 pt-10" data-oculto-impresion>
                <div class="mr-hero-rejilla"></div>
                <div class="mr-hero-luz uno -right-20 -top-40 h-96 w-96 bg-secondary/30 blur-[90px]"></div>
                <div class="mr-hero-luz dos -left-20 top-10 h-64 w-64 bg-primary-container/60 blur-[70px]"></div>
                <div class="relative mx-auto max-w-[1440px] px-margin md:px-margin-tablet lg:px-margin-desktop">
                    <p class="mr-anim-subir flex items-center gap-2 text-label-sm font-label-sm uppercase tracking-widest text-secondary-container">
                        ${icono('verified_user', 'text-[16px]')} Panel · ${esc(S.ROLES[usuario.rol])}
                    </p>
                    <h1 data-titulo-panel class="mr-anim-subir mt-2 font-headline-xl-mobile text-headline-xl-mobile text-white md:font-headline-xl md:text-headline-xl" style="--retraso:80ms">${esc(titulo)}</h1>
                    <p data-subtitulo-panel class="mr-anim-subir mt-2 max-w-2xl text-body-md text-on-primary-container empty:hidden" style="--retraso:160ms">${esc(subtitulo)}</p>
                </div>
            </section>
            <div class="relative mx-auto -mt-16 grid max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-6 px-margin pb-16 md:px-margin-tablet lg:grid-cols-[264px_minmax(0,1fr)] lg:px-margin-desktop">
                <aside class="mr-tarjeta mr-anim-escala h-fit p-3 lg:sticky lg:top-24" data-oculto-impresion>
                    <div class="mb-2 hidden items-center gap-3 rounded-lg bg-surface-container-low p-3 lg:flex">
                        <span class="mr-avatar h-11 w-11 text-sm">${esc(iniciales(usuario.nombre))}</span>
                        <div class="min-w-0">
                            <p class="truncate text-sm font-semibold text-on-surface">${esc(usuario.nombre)}</p>
                            <p class="truncate text-xs text-on-surface-variant">${esc(usuario.email)}</p>
                        </div>
                    </div>
                    <nav class="mr-panel-nav no-scrollbar flex gap-1 overflow-x-auto lg:flex-col" aria-label="Menú del panel">
                        ${menu.map(([clave, texto, ruta, ic]) => `<a href="${url(ruta)}" class="${clave === seccion ? 'activo' : ''}"${clave === seccion ? ' aria-current="page"' : ''}>${icono(ic)}${texto}</a>`).join('')}
                        <button type="button" data-cerrar-sesion-panel class="mt-1 hidden items-center gap-3 rounded-[.6rem] px-[.85rem] py-[.65rem] text-sm font-semibold text-error transition-colors hover:bg-error-container/60 lg:flex">${icono('logout')}Cerrar sesión</button>
                    </nav>
                </aside>
                <main id="contenido" class="min-w-0 mr-anim-subir" style="--retraso:120ms"></main>
            </div>`;
        contenido.replaceWith(envoltura);
        const principal = envoltura.querySelector('main');
        principal.id = 'contenido';
        while (contenido.firstChild) principal.appendChild(contenido.firstChild);
        envoltura.querySelector('[data-cerrar-sesion-panel]').addEventListener('click', () => {
            S.sesion.cerrarSesion();
            ir('index.html', 'Cerraste sesión. ¡Hasta pronto!', 'info');
        });
    }

    function tituloPanel(titulo, subtitulo) {
        const h1 = document.querySelector('[data-titulo-panel]');
        const p = document.querySelector('[data-subtitulo-panel]');
        if (h1 && titulo !== undefined) h1.textContent = titulo;
        if (p && subtitulo !== undefined) p.textContent = subtitulo;
    }

    /* ---------------- Arranque ---------------- */

    const permitido = verificarAcceso();
    if (permitido) {
        encabezado();
        cabecera();
        panel();
        pie();
        mostrarAvisoPendiente();
        document.addEventListener('DOMContentLoaded', () => {
            revelar();
            contarVisibles();
        });
    }

    window.addEventListener('storage', (e) => {
        if (e.key === 'moviruta.sesion' && datos.rol) location.reload();
    });

    return {
        usuario: permitido ? usuario : null, permitido, iniciales, cabecera, aviso, avisoSiguiente, ir, abrirModal, cerrarModal, confirmar,
        revelar, contar, contarVisibles, cargando, autocompletar, tituloPanel, MENUS,
    };
})();
