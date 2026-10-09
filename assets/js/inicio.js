/**
 * Página principal: planificador origen/destino, resultados a la izquierda y mapa a la derecha.
 * Flujo: buscar → elegir opción (directa o con transbordo) → ver recorrido y unidades → consultar ETA.
 */
(() => {
    const { esc, icono, T } = MR;
    const S = MRServicios;
    const $ = (id) => document.getElementById(id);
    const TEXTO_REPOSO = 'Selecciona una ruta para ver sus unidades en el mapa.';

    const mapa = MR.crearMapa('mapa');
    const capaVehiculos = MR.capaVehiculos(mapa, {
        alMover: (id, posicion) => {
            const v = flota.lista[flota.indice];
            if (flota.siguiendo && v && v.vehiculo_id === id) mapa.panTo(posicion, { animate: false });
        },
        alSeleccionar: (v) => {
            const i = flota.lista.findIndex((x) => x.vehiculo_id === v.vehiculo_id);
            if (i >= 0) { flota.indice = i; pintarPanel(); }
        },
    });
    const indicador = MR.indicador($('indicador'));
    const contenedor = $('resultados');
    const titulo = $('tituloResultados');
    const mensaje = $('mensajeBuscador');
    const inputOrigen = $('origen');
    const inputDestino = $('destino');
    const btnUbicacion = $('btnUbicacion');
    const btnVistaRuta = $('btnVistaRuta');
    const btnVistaParadas = $('btnVistaParadas');
    const optAccesible = $('optAccesible');
    const optMenosTransbordos = $('optMenosTransbordos');
    const panel = $('panelVehiculo');
    const tarjetaUnidad = $('tarjetaUnidad');
    const tarjetaMapa = panel.parentElement;
    new ResizeObserver(() => {
        const ocupa = panel.offsetHeight ? tarjetaMapa.clientHeight - panel.offsetTop + 4 : 0;
        tarjetaMapa.style.setProperty('--mr-flota-ocupa', `${ocupa}px`);
    }).observe(panel);

    const detalles = new Map();
    const marcadoresParada = new Map();
    let capaParadas = null;
    let dibujos = [];
    let sondeoVehiculos = null;
    let sondeoEta = null;
    let ubicacion = null;
    let seleccion = null;
    let modoBusqueda = false;
    let filtro = 'todas';
    let ultimaBusqueda = null;
    const flota = { lista: [], indice: 0, siguiendo: false, enCirculacion: 0 };

    const sinAprox = (texto) => String(texto).replace(/^Aprox\.\s*/i, '');
    const precio = (texto) => (texto.startsWith('$') ? `${texto} MXN` : texto);
    const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
    const avisar = (html, tono = 'text-on-surface-variant') => { mensaje.className = `mt-2 min-h-[1.25rem] text-sm ${tono}`; mensaje.innerHTML = html; };

    /* ---------- Contenido inicial (métricas, frecuentes, estado del servicio) ---------- */
    function contenidoInicial() {
        const rutas = S.consulta.rutasPublicas();
        const paradas = S.consulta.paradasPublicas();
        const enCirculacion = S.api('vehiculos', { rutas: rutas.map((r) => r.id).join(',') }).vehiculos.length;
        $('metricaUnidades').dataset.contar = enCirculacion;
        $('metricaRutas').dataset.contar = rutas.length;
        $('metricaParadas').dataset.contar = paradas.length;

        const frecuentes = S.consulta.frecuentes(7);
        const chips = frecuentes.slice(0, 3);
        const tarjetasFrecuentes = frecuentes.slice(3, 7).length ? frecuentes.slice(3, 7) : frecuentes.slice(0, 4);
        $('chipsFrecuentes').insertAdjacentHTML('beforeend', chips.map((f) => `
            <button type="button" class="rounded-full bg-surface-container px-3 py-1.5 text-label-md font-label-md text-on-surface-variant transition-all hover:-translate-y-0.5 hover:bg-secondary-container hover:text-on-secondary-container active:scale-95" data-destino="${esc(f.nombre)}">${esc(f.nombre)}</button>`).join(''));
        if (!chips.length) $('chipsFrecuentes').classList.add('hidden');

        const tonos = ['bg-secondary', 'bg-primary', 'bg-tertiary', 'bg-primary-container'];
        $('paradasFrecuentes').innerHTML = tarjetasFrecuentes.map((p, i) => `
            <a href="${MR.url('parada.html?id=' + p.id)}" class="mr-tarjeta mr-tarjeta-interactiva group flex items-center justify-between gap-2 p-3" title="${p.con_avisos ? 'Alguna ruta de esta parada tiene avisos' : 'Servicio normal'}">
                <span class="flex min-w-0 items-center gap-2.5">
                    <span class="flex h-8 min-w-[2.25rem] items-center justify-center rounded-lg px-1.5 text-xs font-extrabold text-white ${tonos[i % 4]}" title="Código de parada #${esc(p.codigo)}">${esc(p.codigo)}</span>
                    <span class="truncate text-sm font-semibold text-on-surface group-hover:text-primary">${esc(p.nombre)}</span>
                </span>
                <span class="h-2.5 w-2.5 shrink-0 rounded-full ${p.con_avisos ? 'bg-error' : 'bg-secondary'} ring-4 ${p.con_avisos ? 'ring-error/15' : 'ring-secondary/15'}"></span>
            </a>`).join('');

        const avisos = S.consulta.conAvisos();
        const suspendidas = avisos.filter((a) => a.estado_servicio === 'suspendida');
        const conRetrasos = avisos.filter((a) => a.estado_servicio === 'con_retrasos');
        if (suspendidas.length || conRetrasos.length) {
            const grave = suspendidas.length > 0;
            $('iconoEstado').className = `flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${grave ? 'bg-error-container text-error' : 'bg-aviso-container text-aviso'}`;
            $('iconoEstado').innerHTML = icono(grave ? 'block' : 'warning', 'relleno text-[30px]');
            $('tituloEstado').textContent = grave
                ? (suspendidas.length === 1 ? 'Hay 1 Ruta Suspendida' : `Hay ${suspendidas.length} Rutas Suspendidas`)
                : (conRetrasos.length === 1 ? 'Hay 1 Ruta Con Retrasos' : `Hay ${conRetrasos.length} Rutas Con Retrasos`);
            $('textoEstado').textContent = 'Revisa los avisos antes de salir.';
        }
        $('avisosEstado').innerHTML = avisos.filter((a) => a.aviso).map((a) => `
            <a href="${MR.url('ruta.html?id=' + a.id)}" class="inline-flex max-w-full items-center gap-2 rounded-lg bg-surface-container-low px-2.5 py-1.5 text-xs text-on-surface-variant transition-colors hover:bg-surface-container">
                ${MR.insigniaRuta(a, 'sm')}<span class="truncate">${esc(a.aviso)}</span>
            </a>`).join('');

        const select = $('reporteRuta');
        rutas.forEach((r) => select.insertAdjacentHTML('beforeend', `<option value="${r.id}">Ruta ${esc(r.codigo)} · ${esc(r.nombre)} (${esc(T.textoSentido(r.sentido))})</option>`));
    }

    /* ---------- Paradas generales y vista del mapa ---------- */
    async function mostrarParadasGenerales() {
        try {
            const { paradas } = await MR.api('paradas');
            capaParadas = L.featureGroup(paradas.map((p) => {
                const codigos = p.rutas.map((r) => esc(r.codigo)).filter((v, i, a) => a.indexOf(v) === i).join(', ');
                const marcador = L.marker([p.latitud, p.longitud], { icon: MR.iconoParada('#065F46'), title: p.nombre })
                    .bindPopup(MR.popupParada(p, `<br><span style="font-size:12px">Parada #${esc(p.codigo)} · Rutas: ${codigos}</span>`));
                marcadoresParada.set(p.id, marcador);
                return marcador;
            }));
            if (!seleccion) { vistaParadas(); indicador.reposo(TEXTO_REPOSO); }
        } catch (e) {
            indicador.error(e.message);
        }
    }

    function marcarVista(boton) {
        [btnVistaRuta, btnVistaParadas].forEach((b) => {
            const activo = b === boton;
            b.classList.toggle('!bg-primary', activo);
            b.classList.toggle('!text-white', activo);
        });
    }

    function vistaParadas(ajustar = true) {
        if (!capaParadas) return;
        capaParadas.addTo(mapa);
        if (ajustar && capaParadas.getLayers().length) mapa.flyToBounds(capaParadas.getBounds(), { padding: [30, 30], duration: 0.8 });
        marcarVista(btnVistaParadas);
    }

    function vistaRuta() {
        if (!dibujos.length) return;
        if (capaParadas) mapa.removeLayer(capaParadas);
        const limites = dibujos.reduce((l, d) => l.extend(d.grupo.getBounds()), L.latLngBounds([]));
        if (limites.isValid()) mapa.flyToBounds(limites, { padding: [50, 50], duration: 0.8 });
        marcarVista(btnVistaRuta);
    }

    /* ---------- Tarjetas ---------- */
    function htmlInsignias() {
        return `<div class="mb-2 flex flex-wrap items-center gap-2">
                <span data-si-activa class="items-center gap-1 rounded-full bg-secondary-container px-2.5 py-0.5 text-label-sm font-label-sm uppercase text-on-secondary-container">${icono('check', 'text-[14px]')} Ruta seleccionada</span>
                ${modoBusqueda ? '<span data-si-inactiva class="inline-flex rounded-full bg-surface-container px-2.5 py-0.5 text-label-sm font-label-sm uppercase text-on-surface-variant">Alternativa</span>' : ''}
            </div>`;
    }

    function horaLlegada(minutos) {
        const salida = Number($('horaSalida').value) || 0;
        return T.formatoHora(Date.now() + (salida + minutos) * 60000);
    }

    function htmlTramo({ ruta, subir, bajar, duracion_texto: tiempo, paradas_intermedias: intermedias }, indice) {
        const esTransbordo = indice > 0;
        const info = ruta.aviso
            ? `${icono('warning', 'text-[16px] text-aviso')}<span>${esc(ruta.aviso)}</span>`
            : `${icono('info', 'text-[16px]')}<span>${esTransbordo ? 'Transborda aquí. ' : ''}Baja en <strong class="text-on-surface">${esc(bajar.nombre)}</strong> · ${plural(intermedias, 'parada intermedia', 'paradas intermedias')}.</span>`;
        return `
            <div class="flex gap-4">
                <div class="flex flex-col items-center">
                    <span class="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[3px] border-white text-[10px] font-extrabold text-white shadow-md" style="background:${esc(ruta.color)}">${esTransbordo ? 'T' : ''}</span>
                    <span class="mr-tramo-linea my-1 w-1 flex-1 rounded-full" style="background:${esc(ruta.color)};opacity:.35"></span>
                </div>
                <div class="min-w-0 flex-1 pb-5">
                    <div class="flex items-start justify-between gap-2">
                        <p class="text-sm font-semibold text-on-surface">${esc(ruta.linea)} · Ruta ${esc(ruta.codigo)}</p>
                        <span class="shrink-0 rounded-md bg-secondary-container/40 px-1.5 py-0.5 text-[11px] font-bold text-on-secondary-container">${esc(sinAprox(tiempo))}</span>
                    </div>
                    <p class="mt-0.5 text-sm text-on-surface-variant">${esTransbordo ? 'Toma la ruta en' : 'Sube en'} <strong class="text-on-surface">${esc(subir.nombre)}</strong> · ${esc(precio(ruta.tarifa_texto))}</p>
                    <p class="mt-2 flex items-start gap-1.5 rounded-lg bg-surface-container-low px-2.5 py-1.5 text-xs text-on-surface-variant">${info}</p>
                </div>
            </div>`;
    }

    const htmlDestino = (nombre) => `
        <div class="flex items-center gap-4">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-error text-white shadow-md ring-4 ring-error/15">${icono('location_on', 'relleno text-[14px]')}</span>
            <p class="text-sm font-semibold text-on-surface">Destino: ${esc(nombre)}</p>
        </div>`;

    function htmlTarjetaRuta(r, i) {
        return `
            <article class="mr-ruta-tarjeta mr-tarjeta cursor-pointer overflow-hidden" style="--i:${i}" role="button" tabindex="0" data-tipo="directa" data-tramos='${JSON.stringify([{ ruta: r.id }])}'>
                <div class="mr-ruta-barra"></div>
                <div class="p-5">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            ${htmlInsignias()}
                            <h3 class="font-headline-sm text-headline-sm text-primary">${esc(r.linea)}</h3>
                            <p class="mt-1 flex items-center gap-1.5 text-sm text-on-surface-variant">${icono('trip_origin', 'text-[16px] text-secondary')}<span><strong class="font-semibold text-on-surface">Origen:</strong> ${esc(r.origen)}</span></p>
                        </div>
                        ${MR.insigniaRuta(r, 'lg')}
                    </div>
                    <div class="mt-4 flex flex-wrap items-center gap-2">
                        <span class="inline-flex items-center gap-1.5 rounded-lg bg-secondary-container/40 px-3 py-1.5 text-sm font-bold text-on-secondary-container">${icono('payments', 'text-[18px]')} ${esc(precio(r.tarifa_texto))}</span>
                        <span class="mr-etiqueta">${icono('signpost')} ${plural(r.total_paradas, 'parada', 'paradas')}</span>
                        ${MR.estadoHtml(r.estado_servicio, r.estado_texto)}
                    </div>
                    <div class="mt-4 flex items-center justify-between gap-2 border-t border-surface-container pt-3">
                        <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">${icono('directions_bus', 'text-[16px]')} Ruta ${esc(r.codigo)} · ${esc(r.sentido)}</span>
                        <a class="inline-flex items-center text-sm font-semibold text-secondary hover:underline" href="${MR.url('ruta.html?id=' + r.id)}">Ver recorrido completo ${icono('chevron_right', 'text-[18px]')}</a>
                    </div>
                    <div class="mr-itinerario"><div>
                        ${htmlTramo({
                            ruta: r, subir: { nombre: r.origen }, bajar: { nombre: r.destino },
                            duracion_texto: `${r.total_paradas} paradas`, paradas_intermedias: Math.max(0, r.total_paradas - 2),
                        }, 0)}
                        ${htmlDestino(r.destino)}
                        <div data-eta class="mt-4"></div>
                    </div></div>
                </div>
            </article>`;
    }

    function htmlTarjetaOpcion(r, i) {
        const primero = r.tramos[0];
        const ultimo = r.tramos[r.tramos.length - 1];
        const intermedias = r.tramos.reduce((n, t) => n + t.paradas_intermedias, 0);
        const avisos = r.tramos.filter((t) => t.ruta.estado_servicio !== 'normal');
        const tramos = r.tramos.map((t) => ({ ruta: t.ruta.id, subir: t.subir.id, bajar: t.bajar.id }));
        return `
            <article class="mr-ruta-tarjeta mr-tarjeta cursor-pointer overflow-hidden" style="--i:${i}" role="button" tabindex="0" data-tipo="${r.tipo}" data-tramos='${JSON.stringify(tramos)}' data-minutos="${r.minutos_total}">
                <div class="mr-ruta-barra"></div>
                <div class="p-5">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            ${htmlInsignias()}
                            <h3 class="font-headline-sm text-headline-sm text-primary">${esc(primero.ruta.linea)}</h3>
                            <p class="mt-1 flex items-center gap-1.5 text-sm text-on-surface-variant">${icono('trip_origin', 'text-[16px] text-secondary')}<span><strong class="font-semibold text-on-surface">Origen:</strong> ${esc(primero.subir.nombre)}</span></p>
                        </div>
                        <div class="shrink-0 rounded-xl bg-primary px-3 py-2 text-center text-white shadow-md">
                            <p class="text-[10px] font-semibold uppercase tracking-wider text-on-primary-container">Duración</p>
                            <p class="text-lg font-extrabold leading-tight">${esc(sinAprox(r.duracion_total_texto))}</p>
                        </div>
                    </div>
                    <div class="mt-4 flex flex-wrap items-center gap-2">
                        <span class="inline-flex items-center gap-1.5 rounded-lg bg-secondary-container/40 px-3 py-1.5 text-sm font-bold text-on-secondary-container">${icono('payments', 'text-[18px]')} ${esc(precio(r.tarifa_total_texto))}</span>
                        <span class="mr-etiqueta">${icono(r.transbordos ? 'sync_alt' : 'arrow_forward')} ${r.transbordos ? plural(r.transbordos, 'transbordo', 'transbordos') : 'Sin transbordos'}</span>
                        <span class="mr-etiqueta">${icono(r.caminar_texto ? 'directions_walk' : 'signpost')} ${r.caminar_texto ? esc(r.caminar_texto) : plural(intermedias, 'parada intermedia', 'paradas intermedias')}</span>
                        <span class="mr-etiqueta" data-llegada>${icono('schedule')} Llegas aprox. ${esc(horaLlegada(r.minutos_total))}</span>
                    </div>
                    <div class="mt-4 flex items-center justify-between gap-2 border-t border-surface-container pt-3">
                        <span class="flex flex-wrap items-center gap-1">${r.tramos.map((t) => MR.insigniaRuta(t.ruta, 'sm')).join(icono('chevron_right', 'text-[16px] text-outline'))}</span>
                        <button type="button" class="inline-flex items-center text-sm font-semibold text-secondary hover:underline" data-todas>Mostrar todas las rutas ${icono('chevron_right', 'text-[18px]')}</button>
                    </div>
                    <div class="mr-itinerario"><div>
                        ${r.tramos.map(htmlTramo).join('')}
                        ${htmlDestino(ultimo.bajar.nombre)}
                        <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
                            ${MR.estadoHtml((avisos[0] || primero).ruta.estado_servicio, (avisos[0] || primero).ruta.estado_texto)}
                            <a class="inline-flex items-center text-sm font-semibold text-secondary hover:underline" href="${MR.url('ruta.html?id=' + primero.ruta.id)}">Ver recorrido completo ${icono('chevron_right', 'text-[18px]')}</a>
                        </div>
                        <div data-eta class="mt-4"></div>
                    </div></div>
                </div>
            </article>`;
    }

    const tarjetas = () => [...contenedor.querySelectorAll('.mr-ruta-tarjeta')];

    function aplicarFiltro() {
        document.querySelectorAll('.mr-filtro').forEach((b) => b.classList.toggle('activo', b.dataset.filtro === filtro));
        const lista = tarjetas();
        let visibles = 0;
        lista.forEach((t) => {
            const ver = filtro === 'todas' || t.dataset.tipo === filtro;
            t.classList.toggle('hidden', !ver);
            if (ver) visibles++;
        });
        contenedor.querySelector('[data-sin-filtro]')?.remove();
        if (lista.length && !visibles) {
            const texto = filtro === 'transbordo'
                ? (modoBusqueda ? 'Para este trayecto no hay opciones con transbordo.' : 'Escribe tu origen y destino para ver opciones con transbordo.')
                : 'Para este trayecto no hay rutas directas; revisa las opciones con transbordo.';
            contenedor.insertAdjacentHTML('beforeend', `<div data-sin-filtro class="mr-tarjeta">${MR.htmlVacio('filter_alt_off', texto)}</div>`);
        }
    }

    /* ---------- Lista inicial de rutas ---------- */
    async function cargarRutasDisponibles() {
        modoBusqueda = false;
        contenedor.innerHTML = MR.esqueletos(3, 'h-40');
        try {
            const { rutas } = await MR.api('rutas');
            titulo.textContent = `Rutas disponibles (${rutas.length})`;
            $('totalTodas').textContent = rutas.length;
            contenedor.innerHTML = rutas.length
                ? rutas.map(htmlTarjetaRuta).join('')
                : `<div class="mr-tarjeta">${MR.htmlVacio('signpost', 'Por el momento no hay rutas disponibles.')}</div>`;
            aplicarFiltro();
        } catch (e) {
            contenedor.innerHTML = `<div class="mr-tarjeta">${MR.htmlVacio('error', 'No fue posible cargar las rutas. Intenta nuevamente.')}</div>`;
        }
    }

    /* ---------- Búsqueda ---------- */
    async function buscar(evento) {
        if (evento) evento.preventDefault();
        const origen = ubicacion ? '' : inputOrigen.value.trim();
        const destino = inputDestino.value.trim();
        if (!destino && !origen && !ubicacion) {
            avisar(`${icono('error', 'text-[18px]')} Escribe tu destino o tu punto de partida para buscar rutas.`, 'text-error flex items-center gap-1.5');
            inputDestino.classList.remove('invalido');
            void inputDestino.offsetWidth;
            inputDestino.classList.add('invalido');
            setTimeout(() => inputDestino.classList.remove('invalido'), 1200);
            inputDestino.focus();
            return;
        }
        ultimaBusqueda = true;
        const boton = $('formBuscar').querySelector('[type="submit"]');
        MRUI.cargando(boton, true, 'Buscando rutas…');
        avisar('');
        contenedor.innerHTML = MR.esqueletos(3, 'h-44');
        try {
            const datos = await MR.api('buscar', {
                origen, destino,
                lat: ubicacion ? ubicacion.lat.toFixed(6) : '',
                lng: ubicacion ? ubicacion.lng.toFixed(6) : '',
                accesible: optAccesible.checked ? 1 : '',
                menos_transbordos: optMenosTransbordos.checked ? 1 : '',
            }, 350);
            mostrarResultados(datos);
        } catch (e) {
            avisar(esc(e.message), 'text-error');
            cargarRutasDisponibles();
        } finally {
            MRUI.cargando(boton, false);
        }
    }

    function mostrarResultados({ resultados, mensaje: aviso }) {
        modoBusqueda = true;
        const n = resultados.length;
        titulo.textContent = n ? `Rutas encontradas (${plural(n, 'alternativa', 'alternativas')})` : 'Sin resultados';
        $('totalTodas').textContent = n;
        if (!n) {
            contenedor.innerHTML = `<div class="mr-tarjeta mr-anim-escala">${MR.htmlVacio('wrong_location', aviso || 'No encontramos rutas.',
                `<button type="button" class="mr-btn mr-btn-contorno mr-btn-sm mt-2" data-todas>${icono('list')} Mostrar todas las rutas</button>`)}</div>`;
            return;
        }
        contenedor.innerHTML = resultados.map(htmlTarjetaOpcion).join('');
        aplicarFiltro();
        activarTarjeta(tarjetas().find((t) => !t.classList.contains('hidden')) || tarjetas()[0]);
        if (window.matchMedia('(max-width: 1023.98px)').matches) contenedor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* ---------- Selección de una opción ---------- */
    async function activarTarjeta(tarjeta) {
        if (!tarjeta) return;
        tarjetas().forEach((t) => {
            t.classList.toggle('activo', t === tarjeta);
            t.setAttribute('aria-pressed', String(t === tarjeta));
        });
        const tramos = JSON.parse(tarjeta.dataset.tramos);
        const rutas = tramos.map((t) => t.ruta);
        const actual = { rutas, tarjeta, rutaEtaId: rutas[0], paradaEtaId: tramos[0].subir || null };
        seleccion = actual;

        try {
            await Promise.all(rutas.filter((id) => !detalles.has(id)).map(async (id) => {
                detalles.set(id, await MR.api('rutas', { id }, 60));
            }));
        } catch (e) {
            indicador.error(e.message);
            return;
        }
        if (seleccion !== actual) return;

        dibujos.forEach((d) => d.quitar());
        dibujos = tramos.map((t, i) => MR.dibujarRuta(mapa, detalles.get(t.ruta), {
            destacadas: [t.subir, t.bajar].filter(Boolean),
            destino: i === tramos.length - 1 ? t.bajar : undefined,
            alSeleccionarParada: (p) => elegirParadaEta(p.id, t.ruta),
            ajustar: false,
        }));
        btnVistaRuta.disabled = false;
        vistaRuta();

        flota.indice = 0;
        if (flota.siguiendo) alternarSeguir(false);
        const vehiculos = async () => {
            indicador.cargando();
            try {
                const datos = await MR.api('vehiculos', { rutas: rutas.join(',') }, 80);
                if (seleccion !== actual) return;
                capaVehiculos.actualizar(datos.vehiculos);
                actualizarPanel(datos.vehiculos);
                indicador.listo(datos.datos_demostracion);
            } catch (e) {
                indicador.error();
            }
        };
        if (sondeoVehiculos) sondeoVehiculos.reiniciar(vehiculos); else sondeoVehiculos = MR.sondeo(vehiculos);

        const zonaEta = tarjeta.querySelector('[data-eta]');
        if (actual.paradaEtaId) elegirParadaEta(actual.paradaEtaId, rutas[0]);
        else {
            if (sondeoEta) sondeoEta.detener();
            zonaEta.innerHTML = `<p class="flex items-center gap-2 rounded-lg border border-dashed border-outline-variant px-3 py-2.5 text-xs text-on-surface-variant">${icono('touch_app', 'text-[18px] text-secondary')} Toca una parada en el mapa para ver el tiempo aproximado de llegada.</p>`;
        }
    }

    function elegirParadaEta(paradaId, rutaId) {
        if (!seleccion) return;
        const actual = seleccion;
        actual.paradaEtaId = paradaId;
        actual.rutaEtaId = rutaId;
        const parada = detalles.get(rutaId).paradas.find((p) => p.id === paradaId);
        const zona = actual.tarjeta.querySelector('[data-eta]');

        const consultar = async () => {
            if (seleccion !== actual || actual.paradaEtaId !== paradaId || actual.rutaEtaId !== rutaId) return;
            try {
                const datos = await MR.api('eta', { parada_id: paradaId, ruta_id: rutaId }, 60);
                zona.innerHTML = `<p class="mb-2 flex items-center gap-1.5 text-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant">${icono('schedule', 'text-[16px] text-secondary')} Llegadas a ${esc(parada ? parada.nombre : 'la parada')}</p>`
                    + MR.htmlLlegadas(datos.rutas, { sinEncabezado: true }).replace(/mr-tarjeta p-4/g, '');
            } catch (e) {
                zona.innerHTML = `<p class="text-sm text-error">${esc(e.message)}</p>`;
            }
        };
        zona.innerHTML = `<div class="grid gap-2">${MR.esqueletos(2, 'h-12')}</div>`;
        if (sondeoEta) sondeoEta.reiniciar(consultar); else sondeoEta = MR.sondeo(consultar);
    }

    /* ---------- Unidad sobre el mapa (ficha superior y widget inferior) ---------- */
    function actualizarPanel(vehiculos) {
        flota.lista = vehiculos.filter((v) => v.con_ubicacion);
        flota.enCirculacion = vehiculos.length;
        if (flota.indice >= flota.lista.length) flota.indice = 0;
        pintarPanel();
        if (flota.siguiendo) seguirActual();
    }

    function pintarFicha(v) {
        tarjetaUnidad.classList.toggle('hidden', !v);
        if (!v) return;
        const campo = (nombre) => tarjetaUnidad.querySelector(`[data-${nombre}]`);
        campo('linea').textContent = v.linea;
        campo('unidad').textContent = `Unidad ${v.unidad}`;
        campo('chofer').textContent = v.chofer ? `Chofer: ${v.chofer}` : 'Chofer: sin asignar';
        campo('salida').textContent = v.hora_salida || 'Sin dato';
        campo('pasajeros').textContent = v.pasajeros_salida === null ? 'Sin dato' : plural(v.pasajeros_salida, 'pasajero', 'pasajeros');
        campo('servicio').innerHTML = v.climatizado ? `<span class="inline-flex items-center gap-1">${icono('ac_unit', 'text-[16px]')} Climatizado</span>` : 'Sin aire acondicionado';
        const equipo = [];
        if (v.tv_a_bordo) equipo.push(`<span class="inline-flex items-center gap-1">${icono('tv', 'text-[16px]')} TV</span>`);
        if (v.accesible) equipo.push(`<span class="inline-flex items-center gap-1">${icono('accessible', 'text-[16px]')} Accesible</span>`);
        campo('equipamiento').innerHTML = equipo.length ? equipo.join(' ') : 'Sin equipamiento adicional';
    }

    function pintarPanel() {
        const tituloPanel = panel.querySelector('[data-titulo]');
        const detalle = panel.querySelector('[data-detalle]');
        const varios = flota.lista.length > 1;
        panel.classList.remove('hidden');
        ['[data-anterior]', '[data-siguiente]'].forEach((s) => {
            panel.querySelector(s).classList.toggle('hidden', !varios);
            panel.querySelector(s).classList.toggle('flex', varios);
        });
        panel.querySelector('[data-contador]').classList.toggle('hidden', !varios);
        panel.querySelector('[data-seguir]').classList.toggle('hidden', !flota.lista.length);

        const v = flota.lista[flota.indice];
        pintarFicha(v);
        if (!v) {
            tituloPanel.textContent = flota.enCirculacion ? 'Unidades en circulación' : 'Sin unidades en circulación';
            detalle.textContent = flota.enCirculacion
                ? 'No hay información de ubicación disponible.'
                : 'No hay unidades en circulación en esta ruta en este momento.';
            return;
        }
        tituloPanel.textContent = `Unidad ${v.unidad} - ${v.linea}`;
        if (v.proxima_parada) {
            const texto = v.proxima_parada.texto;
            const llegada = /^Aprox\./i.test(texto) ? `Llega en aprox. ${sinAprox(texto)}` : texto;
            detalle.innerHTML = `<span>Próxima parada: <strong class="text-white">${esc(v.proxima_parada.nombre)}</strong></span><span class="text-white/40">•</span><span class="font-semibold text-secondary-container">${esc(llegada)}</span>`;
        } else {
            detalle.innerHTML = `<span>Hacia ${esc(v.destino)}</span><span class="text-white/40">•</span><span>Ubicación actualizada ${MR.tiempoRelativo(v.actualizado_hace_seg)}</span>`;
        }
        panel.querySelector('[data-contador]').textContent = `${flota.indice + 1} de ${flota.lista.length}`;
    }

    function seguirActual() {
        const v = flota.lista[flota.indice];
        if (!v) return;
        const posicion = capaVehiculos.posicion(v.vehiculo_id) || L.latLng(v.latitud, v.longitud);
        if (mapa.getZoom() < 16) mapa.setView(posicion, 16); else mapa.panTo(posicion, { animate: false });
    }

    function alternarSeguir(reencuadrar = true) {
        flota.siguiendo = !flota.siguiendo;
        const boton = panel.querySelector('[data-seguir]');
        boton.setAttribute('aria-pressed', String(flota.siguiendo));
        boton.querySelector('span:last-child').textContent = flota.siguiendo ? 'Dejar de Seguir' : 'Seguir Vehículo';
        boton.querySelector('.material-symbols-outlined').textContent = flota.siguiendo ? 'close' : 'near_me';
        if (flota.siguiendo) seguirActual(); else if (reencuadrar) vistaRuta();
    }

    function cambiarVehiculo(paso) {
        if (!flota.lista.length) return;
        flota.indice = (flota.indice + paso + flota.lista.length) % flota.lista.length;
        pintarPanel();
        if (flota.siguiendo) seguirActual();
    }

    function volverATodas() {
        seleccion = null;
        ultimaBusqueda = null;
        if (sondeoVehiculos) sondeoVehiculos.detener();
        if (sondeoEta) sondeoEta.detener();
        dibujos.forEach((d) => d.quitar());
        dibujos = [];
        capaVehiculos.actualizar([]);
        if (flota.siguiendo) alternarSeguir(false);
        panel.classList.add('hidden');
        tarjetaUnidad.classList.add('hidden');
        btnVistaRuta.disabled = true;
        vistaParadas();
        indicador.reposo(TEXTO_REPOSO);
        avisar('');
        cargarRutasDisponibles();
    }

    /* ---------- Ubicación actual ---------- */
    async function alternarUbicacion() {
        const etiqueta = btnUbicacion.querySelector('span:last-child');
        if (ubicacion) {
            ubicacion = null;
            inputOrigen.value = '';
            inputOrigen.readOnly = false;
            etiqueta.textContent = 'Mi ubicación actual';
            avisar('');
            return;
        }
        btnUbicacion.disabled = true;
        etiqueta.textContent = 'Obteniendo ubicación…';
        try {
            ubicacion = await MR.ubicarUsuario();
            MR.mostrarUsuario(mapa, ubicacion);
            mapa.flyTo([ubicacion.lat, ubicacion.lng], 15, { duration: 0.8 });
            inputOrigen.value = 'Mi ubicación actual';
            inputOrigen.readOnly = true;
            etiqueta.textContent = 'Quitar mi ubicación';
            avisar(`${icono('check_circle', 'text-[18px]')} Usaremos tu ubicación como punto de partida.`, 'text-secondary flex items-center gap-1.5');
        } catch (e) {
            etiqueta.textContent = 'Mi ubicación actual';
            avisar(esc(e.message), 'text-error');
        } finally {
            btnUbicacion.disabled = false;
        }
    }

    function intercambiar() {
        const boton = $('btnIntercambiar');
        boton.classList.remove('girando');
        void boton.offsetWidth;
        boton.classList.add('girando');
        setTimeout(() => boton.classList.remove('girando'), 520);
        if (ubicacion) {
            avisar('Quita tu ubicación actual para intercambiar origen y destino.');
            return;
        }
        [inputOrigen.value, inputDestino.value] = [inputDestino.value, inputOrigen.value];
        [inputOrigen, inputDestino].forEach((i) => { i.classList.remove('mr-destello'); void i.offsetWidth; i.classList.add('mr-destello'); });
    }

    /* ---------- Localizar parada por código o nombre ---------- */
    async function localizarParada(evento) {
        evento.preventDefault();
        const zona = $('mensajeParada');
        const texto = $('buscarParada').value.trim();
        const mostrar = (html, clase) => { zona.className = `-mt-2 flex items-center gap-1.5 text-sm ${clase}`; zona.innerHTML = html; };
        if (!texto) {
            mostrar(`${icono('error', 'text-[18px]')} Escribe el código del poste (por ejemplo #108) o el nombre de la parada.`, 'text-error');
            return;
        }
        try {
            const { paradas } = await MR.api('paradas', { q: texto });
            if (!paradas.length) {
                mostrar(`${icono('wrong_location', 'text-[18px]')} No encontramos ninguna parada con ese código o nombre.`, 'text-error');
                return;
            }
            const p = paradas[0];
            const marcador = marcadoresParada.get(p.id);
            if (flota.siguiendo) alternarSeguir(false);
            if (capaParadas && !mapa.hasLayer(capaParadas)) vistaParadas(false);
            mapa.flyTo([p.latitud, p.longitud], 17, { duration: 0.9 });
            if (marcador) mapa.once('moveend', () => marcador.openPopup());
            mostrar(`${icono('location_on', 'relleno text-[18px]')}<span>Parada #${esc(p.codigo)}: ${esc(p.nombre)}${paradas.length > 1 ? ` · ${paradas.length - 1} coincidencia(s) más en <a class="mr-enlace" href="${MR.url('paradas.html?q=' + encodeURIComponent(texto))}">Paradas</a>` : ''}</span>`, 'text-secondary');
            if (window.matchMedia('(max-width: 1023.98px)').matches) tarjetaMapa.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (e) {
            mostrar(esc(e.message), 'text-error');
        }
    }

    /* ---------- Reportar accidente ---------- */
    const formReporte = $('formReporte');
    const zonaReporte = $('mensajeReporte');
    document.querySelector('[data-abrir-modal="modalReporte"]').addEventListener('click', () => {
        zonaReporte.innerHTML = '';
        if (seleccion) formReporte.ruta_id.value = String(seleccion.rutas[0]);
    });
    formReporte.addEventListener('submit', async (e) => {
        e.preventDefault();
        const boton = formReporte.querySelector('[type="submit"]');
        const error = (texto) => { zonaReporte.innerHTML = `<p class="mr-errores">${esc(texto)}</p>`; };
        if (!formReporte.ruta_id.value) { error('Selecciona la ruta en la que ocurrió el accidente.'); return; }
        if (formReporte.descripcion.value.trim().length < 10) { error('Describe brevemente lo que pasó (al menos 10 caracteres).'); return; }
        const datos = {
            ruta_id: formReporte.ruta_id.value,
            descripcion: formReporte.descripcion.value,
            contacto: formReporte.contacto.value,
        };
        MRUI.cargando(boton, true, 'Enviando…');
        try {
            if ($('reporteUbicacion').checked) {
                try {
                    const u = ubicacion || await MR.ubicarUsuario();
                    datos.lat = u.lat.toFixed(6);
                    datos.lng = u.lng.toFixed(6);
                } catch (err) {
                    error(`${err.message} Puedes enviar el reporte sin ubicación.`);
                    $('reporteUbicacion').checked = false;
                    return;
                }
            }
            const respuesta = await MR.api('reportar', datos, 300);
            formReporte.reset();
            MRUI.cerrarModal('modalReporte');
            MRUI.aviso(respuesta.mensaje, 'exito', 7000);
        } catch (err) {
            error(err.message);
        } finally {
            MRUI.cargando(boton, false);
        }
    });

    /* ---------- Imprimir: mapa en PDF y horarios ---------- */
    $('btnImprimirMapa').addEventListener('click', () => {
        document.body.classList.add('mr-imprimir-mapa');
        mapa.invalidateSize();
        setTimeout(() => window.print(), 350);
    });

    $('btnHorarios').addEventListener('click', () => {
        const ids = seleccion ? seleccion.rutas : S.consulta.rutasPublicas().map((r) => r.id);
        const fecha = T.formatoFecha(Date.now());
        $('horariosImprimibles').innerHTML = `
            <header style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #004532;padding-bottom:4mm;margin-bottom:6mm">
                <div style="display:flex;align-items:center;gap:10px"><img src="${MR.url('assets/img/logo.svg')}" alt="" width="76" height="36">
                <div><strong style="font-size:20px;color:#004532">MoviRuta</strong><div style="font-size:12px;color:#3f4944">Itinerarios y tiempos estimados de paso</div></div></div>
                <div style="font-size:11px;color:#6f7973;text-align:right">Impreso el ${esc(fecha)}<br>Los tiempos son aproximados y pueden variar con el tráfico.</div>
            </header>
            ${ids.map((id) => {
                let d;
                try { d = S.api('rutas', { id }); } catch (e) { return ''; }
                return `<section>
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:3mm">
                        <span style="background:${esc(d.ruta.color)};color:#fff;font-weight:800;border-radius:6px;padding:4px 10px;font-size:16px">${esc(d.ruta.codigo)}</span>
                        <div><strong style="font-size:16px">${esc(d.ruta.nombre)}</strong> <span style="color:#3f4944">(${esc(d.ruta.sentido)})</span>
                        <div style="font-size:12px;color:#3f4944">${esc(d.ruta.linea)} · ${esc(d.ruta.origen)} → ${esc(d.ruta.destino)} · Tarifa ${esc(d.ruta.tarifa_texto)} · ${esc(d.ruta.longitud_texto)} · ${esc(d.ruta.duracion_texto)}</div></div>
                    </div>
                    ${d.ruta.aviso ? `<p style="font-size:12px;background:#fef3c7;color:#92400e;padding:6px 10px;border-radius:6px;margin-bottom:3mm">Aviso: ${esc(d.ruta.aviso)}</p>` : ''}
                    <table style="width:100%;border-collapse:collapse;font-size:12px">
                        <thead><tr style="background:#f2f4f6;text-align:left">
                            <th style="padding:5px 8px;width:30px">#</th><th style="padding:5px 8px">Parada</th><th style="padding:5px 8px">Referencia</th>
                            <th style="padding:5px 8px;width:70px">Código</th><th style="padding:5px 8px;width:150px;text-align:right">Minutos desde el origen</th></tr></thead>
                        <tbody>${d.paradas.map((p, i) => `<tr style="border-bottom:1px solid #eceef0">
                            <td style="padding:5px 8px;color:#6f7973">${i + 1}</td><td style="padding:5px 8px;font-weight:600">${esc(p.nombre)}</td>
                            <td style="padding:5px 8px;color:#3f4944">${esc(p.referencia || '')}</td><td style="padding:5px 8px">#${esc(p.codigo)}</td>
                            <td style="padding:5px 8px;text-align:right;font-weight:700">${i === 0 ? 'Salida' : `+${p.minutos_desde_origen} min`}</td></tr>`).join('')}</tbody>
                    </table></section>`;
            }).join('')}`;
        document.body.classList.add('mr-imprimir-horarios');
        setTimeout(() => window.print(), 250);
    });

    window.addEventListener('afterprint', () => {
        document.body.classList.remove('mr-imprimir-mapa', 'mr-imprimir-horarios');
        mapa.invalidateSize();
    });

    /* ---------- Eventos ---------- */
    $('formBuscar').addEventListener('submit', buscar);
    btnUbicacion.addEventListener('click', alternarUbicacion);
    $('btnIntercambiar').addEventListener('click', intercambiar);
    $('chipsFrecuentes').addEventListener('click', (e) => {
        const chip = e.target.closest('[data-destino]');
        if (!chip) return;
        inputDestino.value = chip.dataset.destino;
        inputDestino.classList.remove('mr-destello'); void inputDestino.offsetWidth; inputDestino.classList.add('mr-destello');
        inputDestino.focus();
    });
    MRUI.autocompletar(inputOrigen);
    MRUI.autocompletar(inputDestino);
    [optAccesible, optMenosTransbordos].forEach((o) => o.addEventListener('change', () => { if (ultimaBusqueda) buscar(); }));
    $('horaSalida').addEventListener('change', () => {
        tarjetas().forEach((t) => {
            const zona = t.querySelector('[data-llegada]');
            if (zona && t.dataset.minutos) zona.innerHTML = `${icono('schedule')} Llegas aprox. ${esc(horaLlegada(Number(t.dataset.minutos)))}`;
        });
    });
    document.querySelectorAll('.mr-filtro').forEach((b) => b.addEventListener('click', () => {
        filtro = b.dataset.filtro;
        aplicarFiltro();
        if (seleccion && seleccion.tarjeta.classList.contains('hidden')) {
            const visible = tarjetas().find((t) => !t.classList.contains('hidden'));
            if (visible && modoBusqueda) activarTarjeta(visible);
        }
    }));
    $('formParada').addEventListener('submit', localizarParada);
    btnVistaRuta.addEventListener('click', () => { if (flota.siguiendo) alternarSeguir(); else vistaRuta(); });
    btnVistaParadas.addEventListener('click', () => { if (flota.siguiendo) alternarSeguir(false); vistaParadas(); });
    panel.querySelector('[data-seguir]').addEventListener('click', () => alternarSeguir());
    panel.querySelector('[data-anterior]').addEventListener('click', () => cambiarVehiculo(-1));
    panel.querySelector('[data-siguiente]').addEventListener('click', () => cambiarVehiculo(1));
    mapa.on('dragstart', () => { if (flota.siguiendo) alternarSeguir(false); });
    contenedor.addEventListener('click', (e) => {
        if (e.target.closest('[data-todas]')) { volverATodas(); return; }
        if (e.target.closest('a, button')) return;
        const tarjeta = e.target.closest('.mr-ruta-tarjeta');
        if (tarjeta && !tarjeta.classList.contains('activo')) activarTarjeta(tarjeta);
    });
    contenedor.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('mr-ruta-tarjeta')) {
            e.preventDefault();
            activarTarjeta(e.target);
        }
    });

    contenidoInicial();
    if (MR.parametro('reportar') !== null) setTimeout(() => MRUI.abrirModal('modalReporte'), 400);
    const destinoInicial = MR.parametro('destino');
    if (destinoInicial) { inputDestino.value = destinoInicial; buscar(); } else cargarRutasDisponibles();
    mostrarParadasGenerales();
})();
