/**
 * Página principal: planificador origen/destino, resultados a la izquierda y mapa a la derecha.
 * Flujo: buscar → elegir opción (directa o con transbordo) → ver recorrido y unidades → consultar ETA.
 */
(() => {
    const TEXTO_REPOSO = 'Selecciona una ruta para ver sus unidades en el mapa.';
    const mapa = MR.crearMapa('mapa');
    const capaVehiculos = MR.capaVehiculos(mapa);
    const indicador = MR.indicador(document.getElementById('indicador'));
    const $ = (id) => document.getElementById(id);
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
        const ocupa = panel.offsetHeight ? tarjetaMapa.clientHeight - panel.offsetTop + 8 : 0;
        tarjetaMapa.style.setProperty('--mr-flota-ocupa', `${ocupa}px`);
    }).observe(panel);

    const detalles = new Map();
    const marcadoresParada = new Map();
    let capaParadas = null;
    let dibujos = [];
    let sondeoVehiculos = null;
    let sondeoEta = null;
    let ubicacion = null;
    let seleccion = null; // { rutas: [ids], rutaEtaId, paradaEtaId, tarjeta }
    let modoBusqueda = false;
    let filtro = 'todas';
    const flota = { lista: [], indice: 0, siguiendo: false, enCirculacion: 0 };

    const sinAprox = (texto) => String(texto).replace(/^Aprox\.\s*/i, '');
    const duracion = (texto) => `Duración: aprox. ${sinAprox(texto)}`;
    const precio = (texto) => (texto.startsWith('$') ? `${texto} MXN` : texto);
    const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

    /* ---------- Paradas generales y vista del mapa ---------- */
    async function mostrarParadasGenerales() {
        try {
            const { paradas } = await MR.api('paradas.php');
            capaParadas = L.featureGroup(paradas.map((p) => {
                const codigos = p.rutas.map((r) => MR.esc(r.codigo)).filter((v, i, a) => a.indexOf(v) === i).join(', ');
                const marcador = L.marker([p.latitud, p.longitud], { icon: MR.iconoParada('#065F46'), title: p.nombre })
                    .bindPopup(MR.popupParada(p, `${p.codigo ? `<br><span class="small">Parada #${MR.esc(p.codigo)}</span>` : ''}<br><span class="small">Rutas: ${codigos}</span>`));
                marcadoresParada.set(p.id, marcador);
                return marcador;
            }));
            if (!seleccion) vistaParadas();
            if (!seleccion) indicador.reposo(TEXTO_REPOSO);
        } catch (e) {
            indicador.error(e.message);
        }
    }

    function marcarVista(boton) {
        [btnVistaRuta, btnVistaParadas].forEach((b) => b.classList.toggle('activo', b === boton));
    }

    function vistaParadas(ajustar = true) {
        if (!capaParadas) return;
        capaParadas.addTo(mapa);
        if (ajustar && capaParadas.getLayers().length) mapa.fitBounds(capaParadas.getBounds(), { padding: [30, 30] });
        marcarVista(btnVistaParadas);
    }

    function vistaRuta() {
        if (!dibujos.length) return;
        if (capaParadas) mapa.removeLayer(capaParadas);
        const limites = dibujos.reduce((l, d) => l.extend(d.grupo.getBounds()), L.latLngBounds([]));
        if (limites.isValid()) mapa.fitBounds(limites, { padding: [40, 40] });
        marcarVista(btnVistaRuta);
    }

    /* ---------- Tarjetas (diseño del boceto) ---------- */
    function htmlInsignias() {
        return `<span class="mr-insignia-opcion" data-si-activa>Ruta seleccionada</span>
                ${modoBusqueda ? '<span class="mr-insignia-opcion alternativa" data-si-inactiva>Alternativa</span>' : ''}`;
    }

    function htmlEstado(ruta) {
        return `<span class="mr-estado ${MR.claseEstado(ruta.estado_servicio)}"><i class="bi bi-${MR.iconoEstado(ruta.estado_servicio)}"></i> ${MR.esc(ruta.estado_texto)}</span>`;
    }

    function htmlTramo({ ruta, subir, bajar, duracion_texto: tiempo, paradas_intermedias: intermedias }, indice) {
        const esTransbordo = indice > 0;
        const info = ruta.aviso
            ? `<i class="bi bi-exclamation-triangle"></i><span>${MR.esc(ruta.aviso)}</span>`
            : `<i class="bi bi-info-circle"></i><span>${esTransbordo ? 'Transborda aquí. ' : ''}Baja en ${MR.esc(bajar.nombre)} · ${plural(intermedias, 'parada intermedia', 'paradas intermedias')}.</span>`;
        return `
            <div class="mr-tramo${esTransbordo ? ' es-transbordo' : ''}">
                <div class="mr-tramo-eje">
                    <span class="mr-tramo-punto${esTransbordo ? ' transbordo' : ''}">${esTransbordo ? 'T' : ''}</span>
                    <span class="mr-tramo-linea${esTransbordo ? ' transbordo' : ''}"></span>
                </div>
                <div class="mr-tramo-cuerpo">
                    <div class="mr-tramo-titulo"><span>${MR.esc(ruta.linea)} · Ruta ${MR.esc(ruta.codigo)}</span><span>${MR.esc(duracion(tiempo))}</span></div>
                    <div class="mr-tramo-fila">
                        <span><strong>Origen:</strong> ${MR.esc(subir.nombre)}</span>
                        <span class="mr-tramo-precio"><i class="bi bi-currency-dollar"></i><span>Precio: ${MR.esc(precio(ruta.tarifa_texto))}</span></span>
                    </div>
                    <div class="mr-tramo-info">${info}</div>
                </div>
            </div>`;
    }

    function htmlDestino(nombre) {
        return `
            <div class="mr-tramo">
                <div class="mr-tramo-eje"><span class="mr-tramo-punto destino"></span></div>
                <div class="mr-tramo-cuerpo"><div class="mr-tramo-titulo"><span>Destino: ${MR.esc(nombre)}</span></div></div>
            </div>`;
    }

    function htmlTarjetaRuta(r) {
        return `
            <div class="mr-ruta-tarjeta" role="button" tabindex="0" data-tipo="directa"
                 data-tramos='${JSON.stringify([{ ruta: r.id }])}'>
                <div class="mr-ruta-cabecera">
                    <div class="mr-ruta-cabecera-izq">
                        ${htmlInsignias()}
                        <h3 class="mr-ruta-nombre">${MR.esc(r.linea)}</h3>
                        <div class="mr-ruta-fila"><i class="bi bi-pin-map"></i><span><strong>Origen:</strong> ${MR.esc(r.origen)}</span></div>
                        <div class="mr-ruta-precio"><i class="bi bi-currency-dollar"></i><span><strong>Precio:</strong> <b>${MR.esc(precio(r.tarifa_texto))}</b></span><small>(Tarifa estándar)</small></div>
                    </div>
                    ${MR.insigniaRuta(r)}
                </div>
                <div class="mr-ruta-resumen">
                    <span><i class="bi bi-signpost-2"></i>${plural(r.total_paradas, 'parada', 'paradas')}</span>
                    <span><i class="bi bi-${MR.iconoEstado(r.estado_servicio)}"></i>${MR.esc(r.estado_texto)}</span>
                </div>
                <div class="mr-ruta-acciones">
                    <span class="mr-ruta-insignia"><i class="bi bi-bus-front"></i>Ruta ${MR.esc(r.codigo)} · ${MR.esc(r.sentido)}</span>
                    <a class="mr-enlace-ruta" href="${MR.url('ruta.php?id=' + r.id)}">Ver recorrido completo<i class="bi bi-chevron-right"></i></a>
                </div>
                <div class="mr-itinerario">
                    <div class="mr-tramo">
                        <div class="mr-tramo-eje"><span class="mr-tramo-punto"></span><span class="mr-tramo-linea"></span></div>
                        <div class="mr-tramo-cuerpo">
                            <div class="mr-tramo-titulo"><span>${MR.esc(r.nombre)}</span><span>Hacia ${MR.esc(r.destino)}</span></div>
                            <div class="mr-tramo-fila">
                                <span><strong>Origen:</strong> ${MR.esc(r.origen)}</span>
                                <span class="mr-tramo-precio"><i class="bi bi-currency-dollar"></i><span>Precio: ${MR.esc(precio(r.tarifa_texto))}</span></span>
                            </div>
                            <div class="mr-tramo-info"><i class="bi bi-info-circle"></i><span>Toca la tarjeta para ver las unidades de esta ruta en el mapa.</span></div>
                        </div>
                    </div>
                    ${htmlDestino(r.destino)}
                </div>
                <div data-eta class="mt-2 d-none"></div>
            </div>`;
    }

    function htmlTarjetaOpcion(r) {
        const primero = r.tramos[0];
        const ultimo = r.tramos[r.tramos.length - 1];
        const intermedias = r.tramos.reduce((n, t) => n + t.paradas_intermedias, 0);
        const avisos = r.tramos.filter((t) => t.ruta.estado_servicio !== 'normal');
        const tramos = r.tramos.map((t) => ({ ruta: t.ruta.id, subir: t.subir.id, bajar: t.bajar.id }));
        return `
            <div class="mr-ruta-tarjeta" role="button" tabindex="0" data-tipo="${r.tipo}" data-tramos='${JSON.stringify(tramos)}'>
                <div class="mr-ruta-cabecera">
                    <div class="mr-ruta-cabecera-izq">
                        ${htmlInsignias()}
                        <h3 class="mr-ruta-nombre">${MR.esc(primero.ruta.linea)}</h3>
                        <div class="mr-ruta-fila"><i class="bi bi-pin-map"></i><span><strong>Origen:</strong> ${MR.esc(primero.subir.nombre)}</span></div>
                        <div class="mr-ruta-precio"><i class="bi bi-currency-dollar"></i><span><strong>Precio:</strong> <b>${MR.esc(precio(r.tarifa_total_texto))}</b></span><small>(Tarifa estándar)</small></div>
                    </div>
                    <div class="mr-ruta-duracion">${MR.esc(duracion(r.duracion_total_texto))}</div>
                </div>
                <div class="mr-ruta-resumen">
                    <span><i class="bi bi-${r.transbordos ? 'arrow-left-right' : 'arrow-right'}"></i>${r.transbordos ? plural(r.transbordos, 'transbordo', 'transbordos') : 'Sin transbordos'}</span>
                    <span><i class="bi bi-${r.caminar_texto ? 'person-walking' : 'signpost-2'}"></i>${r.caminar_texto ? MR.esc(r.caminar_texto) : plural(intermedias, 'parada intermedia', 'paradas intermedias')}</span>
                </div>
                <div class="mr-ruta-acciones">
                    <span class="mr-ruta-insignia"><i class="bi bi-bus-front"></i>${r.tramos.map((t) => `Ruta ${MR.esc(t.ruta.codigo)}`).join(' → ')}</span>
                    <button type="button" class="mr-enlace-ruta" data-todas>Mostrar todas las rutas<i class="bi bi-chevron-right"></i></button>
                </div>
                <div class="mr-itinerario">
                    ${r.tramos.map(htmlTramo).join('')}
                    ${htmlDestino(ultimo.bajar.nombre)}
                </div>
                <div class="mr-ruta-pie">
                    ${avisos.length ? htmlEstado(avisos[0].ruta) : htmlEstado(primero.ruta)}
                    <a class="mr-enlace-ruta" href="${MR.url('ruta.php?id=' + primero.ruta.id)}">Ver recorrido completo<i class="bi bi-chevron-right"></i></a>
                </div>
                <div data-eta class="mt-2 d-none"></div>
            </div>`;
    }

    function tarjetas() {
        return [...contenedor.querySelectorAll('.mr-ruta-tarjeta')];
    }

    function aplicarFiltro() {
        document.querySelectorAll('.mr-filtro').forEach((b) => b.classList.toggle('activo', b.dataset.filtro === filtro));
        const lista = tarjetas();
        let visibles = 0;
        lista.forEach((t) => {
            const ver = filtro === 'todas' || t.dataset.tipo === filtro;
            t.classList.toggle('d-none', !ver);
            if (ver) visibles++;
        });
        contenedor.querySelector('[data-sin-filtro]')?.remove();
        if (lista.length && !visibles) {
            const texto = filtro === 'transbordo'
                ? (modoBusqueda ? 'Para este trayecto no hay opciones con transbordo.' : 'Escribe tu origen y destino para ver opciones con transbordo.')
                : 'Para este trayecto no hay rutas directas; revisa las opciones con transbordo.';
            contenedor.insertAdjacentHTML('beforeend', `<div data-sin-filtro>${MR.htmlVacio('funnel', texto)}</div>`);
        }
    }

    /* ---------- Lista inicial de rutas ---------- */
    async function cargarRutasDisponibles() {
        modoBusqueda = false;
        try {
            const { rutas } = await MR.api('rutas.php');
            titulo.textContent = `Rutas disponibles (${rutas.length})`;
            $('totalTodas').textContent = rutas.length;
            contenedor.innerHTML = rutas.length
                ? rutas.map(htmlTarjetaRuta).join('')
                : MR.htmlVacio('signpost', 'Por el momento no hay rutas disponibles.');
            aplicarFiltro();
        } catch (e) {
            contenedor.innerHTML = MR.htmlVacio('exclamation-circle', 'No fue posible cargar las rutas. Intenta nuevamente.');
        }
    }

    /* ---------- Búsqueda ---------- */
    let ultimaBusqueda = null;

    async function buscar(evento) {
        if (evento) evento.preventDefault();
        const origen = ubicacion ? '' : inputOrigen.value.trim();
        const destino = inputDestino.value.trim();
        if (!destino && !origen && !ubicacion) {
            mensaje.innerHTML = '<span class="text-danger">Escribe tu destino o tu punto de partida para buscar rutas.</span>';
            inputDestino.focus();
            return;
        }
        ultimaBusqueda = true;
        mensaje.innerHTML = '<span class="spinner-border spinner-border-sm text-success"></span> Buscando rutas…';
        try {
            const datos = await MR.api('buscar.php', {
                origen, destino,
                lat: ubicacion ? ubicacion.lat.toFixed(6) : '',
                lng: ubicacion ? ubicacion.lng.toFixed(6) : '',
                accesible: optAccesible.checked ? 1 : '',
                menos_transbordos: optMenosTransbordos.checked ? 1 : '',
            });
            mensaje.textContent = '';
            mostrarResultados(datos);
        } catch (e) {
            mensaje.innerHTML = `<span class="text-danger">${MR.esc(e.message)}</span>`;
        }
    }

    function mostrarResultados({ resultados, mensaje: aviso }) {
        modoBusqueda = true;
        const n = resultados.length;
        titulo.textContent = n ? `Rutas encontradas (${plural(n, 'alternativa', 'alternativas')})` : 'Sin resultados';
        $('totalTodas').textContent = n;
        if (!n) {
            contenedor.innerHTML = MR.htmlVacio('signpost', aviso || 'No encontramos rutas.')
                + '<div class="text-center"><button type="button" class="mr-enlace-ruta" data-todas>Mostrar todas las rutas<i class="bi bi-chevron-right"></i></button></div>';
            return;
        }
        contenedor.innerHTML = resultados.map(htmlTarjetaOpcion).join('');
        aplicarFiltro();
        activarTarjeta(tarjetas().find((t) => !t.classList.contains('d-none')) || tarjetas()[0]);
        if (window.matchMedia('(max-width: 991.98px)').matches) contenedor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* ---------- Selección de una opción ---------- */
    async function activarTarjeta(tarjeta) {
        if (!tarjeta) return;
        tarjetas().forEach((t) => {
            t.classList.toggle('activo', t === tarjeta);
            if (t !== tarjeta) t.querySelector('[data-eta]')?.classList.add('d-none');
        });
        const tramos = JSON.parse(tarjeta.dataset.tramos);
        const rutas = tramos.map((t) => t.ruta);
        const actual = { rutas, tarjeta, rutaEtaId: rutas[0], paradaEtaId: tramos[0].subir || null };
        seleccion = actual;

        try {
            await Promise.all(rutas.filter((id) => !detalles.has(id)).map(async (id) => {
                detalles.set(id, await MR.api('rutas.php', { id }));
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
                const datos = await MR.api('vehiculos.php', { rutas: rutas.join(',') });
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
        zonaEta.classList.remove('d-none');
        if (actual.paradaEtaId) elegirParadaEta(actual.paradaEtaId, rutas[0]);
        else {
            if (sondeoEta) sondeoEta.detener();
            zonaEta.innerHTML = '<div class="mr-tramo-info"><i class="bi bi-hand-index"></i><span>Selecciona una parada en el mapa para ver el tiempo aproximado de llegada.</span></div>';
        }
    }

    function elegirParadaEta(paradaId, rutaId) {
        if (!seleccion) return;
        const actual = seleccion;
        actual.paradaEtaId = paradaId;
        actual.rutaEtaId = rutaId;
        const parada = detalles.get(rutaId).paradas.find((p) => p.id === paradaId);
        const zona = actual.tarjeta.querySelector('[data-eta]');
        zona.classList.remove('d-none');

        const consultar = async () => {
            if (seleccion !== actual || actual.paradaEtaId !== paradaId || actual.rutaEtaId !== rutaId) return;
            try {
                const datos = await MR.api('eta.php', { parada_id: paradaId, ruta_id: rutaId });
                zona.innerHTML = `<div class="small fw-semibold mb-1 text-body"><i class="bi bi-clock"></i> Llegadas a ${MR.esc(parada ? parada.nombre : 'la parada')}</div>`
                    + MR.htmlLlegadas(datos.rutas, { sinEncabezado: true });
            } catch (e) {
                zona.innerHTML = `<div class="small text-danger">${MR.esc(e.message)}</div>`;
            }
        };
        zona.innerHTML = '<div class="small text-secondary fw-normal"><span class="spinner-border spinner-border-sm"></span> Calculando tiempo aproximado de llegada…</div>';
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
        tarjetaUnidad.classList.toggle('d-none', !v);
        if (!v) return;
        const campo = (nombre) => tarjetaUnidad.querySelector(`[data-${nombre}]`);
        campo('linea').textContent = v.linea;
        campo('unidad').textContent = `Unidad ${v.unidad}`;
        campo('chofer').textContent = v.chofer ? `Chofer: ${v.chofer}` : 'Chofer: sin asignar';
        campo('salida').textContent = v.hora_salida || 'Sin dato';
        campo('pasajeros').textContent = v.pasajeros_salida === null ? 'Sin dato' : plural(v.pasajeros_salida, 'pasajero', 'pasajeros');
        campo('servicio').innerHTML = v.climatizado ? '<i class="bi bi-snow2"></i> Climatizado' : 'Sin aire acondicionado';
        const equipo = [];
        if (v.tv_a_bordo) equipo.push('<i class="bi bi-tv"></i> TV a bordo');
        if (v.accesible) equipo.push('<i class="bi bi-person-wheelchair"></i> Accesible');
        campo('equipamiento').innerHTML = equipo.length ? equipo.join(' ') : 'Sin equipamiento adicional';
    }

    function pintarPanel() {
        const tituloPanel = panel.querySelector('[data-titulo]');
        const detalle = panel.querySelector('[data-detalle]');
        const varios = flota.lista.length > 1;
        panel.classList.remove('d-none');
        ['[data-anterior]', '[data-siguiente]', '[data-contador]'].forEach((s) => panel.querySelector(s).classList.toggle('d-none', !varios));
        panel.querySelector('[data-seguir]').classList.toggle('d-none', !flota.lista.length);

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
            const llegada = /^Aprox\./i.test(texto) ? `Tiempo aprox. de llegada: ${sinAprox(texto)}.` : texto;
            detalle.innerHTML = `<span>Próxima Parada: ${MR.esc(v.proxima_parada.nombre)}</span><span>•</span><span class="mr-texto-eta">${MR.esc(llegada)}</span>`;
        } else {
            detalle.innerHTML = `<span>Hacia ${MR.esc(v.destino)}</span><span>•</span><span>Ubicación actualizada ${MR.tiempoRelativo(v.actualizado_hace_seg)}</span>`;
        }
        panel.querySelector('[data-contador]').textContent = `${flota.indice + 1} de ${flota.lista.length}`;
    }

    function seguirActual() {
        const v = flota.lista[flota.indice];
        if (v) mapa.setView([v.latitud, v.longitud], Math.max(mapa.getZoom(), 16));
    }

    function alternarSeguir(reencuadrar = true) {
        flota.siguiendo = !flota.siguiendo;
        const boton = panel.querySelector('[data-seguir]');
        boton.setAttribute('aria-pressed', String(flota.siguiendo));
        boton.classList.toggle('activo', flota.siguiendo);
        boton.textContent = flota.siguiendo ? 'Dejar de Seguir' : 'Seguir Vehículo';
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
        panel.classList.add('d-none');
        tarjetaUnidad.classList.add('d-none');
        btnVistaRuta.disabled = true;
        vistaParadas();
        indicador.reposo(TEXTO_REPOSO);
        cargarRutasDisponibles();
    }

    /* ---------- Ubicación actual ---------- */
    async function alternarUbicacion() {
        const etiqueta = btnUbicacion.querySelector('span');
        if (ubicacion) {
            ubicacion = null;
            inputOrigen.value = '';
            inputOrigen.readOnly = false;
            etiqueta.textContent = 'Mi ubicación actual';
            return;
        }
        btnUbicacion.disabled = true;
        etiqueta.textContent = 'Obteniendo ubicación…';
        try {
            ubicacion = await MR.ubicarUsuario();
            MR.mostrarUsuario(mapa, ubicacion);
            mapa.setView([ubicacion.lat, ubicacion.lng], 15);
            inputOrigen.value = 'Mi ubicación actual';
            inputOrigen.readOnly = true;
            etiqueta.textContent = 'Quitar mi ubicación';
            mensaje.innerHTML = '<span class="text-success"><i class="bi bi-check-circle"></i> Usaremos tu ubicación como punto de partida.</span>';
        } catch (e) {
            etiqueta.textContent = 'Mi ubicación actual';
            mensaje.innerHTML = `<span class="text-danger">${MR.esc(e.message)}</span>`;
        } finally {
            btnUbicacion.disabled = false;
        }
    }

    function intercambiar() {
        if (ubicacion) {
            mensaje.innerHTML = '<span class="text-secondary">Quita tu ubicación actual para intercambiar origen y destino.</span>';
            return;
        }
        [inputOrigen.value, inputDestino.value] = [inputDestino.value, inputOrigen.value];
        [inputOrigen, inputDestino].forEach((i) => i.classList.add('mr-destello'));
        setTimeout(() => [inputOrigen, inputDestino].forEach((i) => i.classList.remove('mr-destello')), 350);
    }

    /* ---------- Localizar parada por código o nombre ---------- */
    async function localizarParada(evento) {
        evento.preventDefault();
        const zona = $('mensajeParada');
        const texto = $('buscarParada').value.trim();
        const avisar = (html, clase) => { zona.className = `small ${clase}`; zona.innerHTML = html; };
        if (!texto) {
            avisar('Escribe el código del poste (por ejemplo #108) o el nombre de la parada.', 'text-danger');
            return;
        }
        try {
            const { paradas } = await MR.api('paradas.php', { q: texto });
            if (!paradas.length) {
                avisar('No encontramos ninguna parada con ese código o nombre.', 'text-danger');
                return;
            }
            const p = paradas[0];
            const marcador = marcadoresParada.get(p.id);
            if (flota.siguiendo) alternarSeguir(false);
            if (capaParadas && !mapa.hasLayer(capaParadas)) vistaParadas(false);
            mapa.setView([p.latitud, p.longitud], 17);
            if (marcador) marcador.openPopup();
            avisar(`<i class="bi bi-geo-alt-fill"></i> ${p.codigo ? `Parada #${MR.esc(p.codigo)}: ` : ''}${MR.esc(p.nombre)}${paradas.length > 1 ? ` · ${paradas.length - 1} coincidencia(s) más en <a href="${MR.url('paradas.php')}">Paradas</a>` : ''}`, 'text-success');
            if (window.matchMedia('(max-width: 991.98px)').matches) tarjetaMapa.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (e) {
            avisar(MR.esc(e.message), 'text-danger');
        }
    }

    /* ---------- Reportar accidente ---------- */
    const modalReporte = $('modalReporte');
    const formReporte = $('formReporte');
    modalReporte.addEventListener('show.bs.modal', () => {
        $('mensajeReporte').innerHTML = '';
        if (seleccion) formReporte.ruta_id.value = String(seleccion.rutas[0]);
    });
    formReporte.addEventListener('submit', async (e) => {
        e.preventDefault();
        const zona = $('mensajeReporte');
        const boton = formReporte.querySelector('[type="submit"]');
        if (!formReporte.ruta_id.value) {
            zona.innerHTML = '<span class="text-danger">Selecciona la ruta en la que ocurrió el accidente.</span>';
            return;
        }
        if (formReporte.descripcion.value.trim().length < 10) {
            zona.innerHTML = '<span class="text-danger">Describe brevemente lo que pasó (al menos 10 caracteres).</span>';
            return;
        }
        const datos = new FormData(formReporte);
        boton.disabled = true;
        try {
            if ($('reporteUbicacion').checked) {
                zona.innerHTML = '<span class="text-secondary"><span class="spinner-border spinner-border-sm"></span> Obteniendo tu ubicación…</span>';
                try {
                    const u = ubicacion || await MR.ubicarUsuario();
                    datos.append('lat', u.lat.toFixed(6));
                    datos.append('lng', u.lng.toFixed(6));
                } catch (err) {
                    zona.innerHTML = `<span class="text-danger">${MR.esc(err.message)} Puedes enviar el reporte sin ubicación.</span>`;
                    $('reporteUbicacion').checked = false;
                    return;
                }
            }
            zona.innerHTML = '<span class="text-secondary"><span class="spinner-border spinner-border-sm"></span> Enviando reporte…</span>';
            const respuesta = await MR.enviar('reportar.php', datos);
            formReporte.descripcion.value = '';
            formReporte.contacto.value = '';
            $('reporteUbicacion').checked = false;
            zona.innerHTML = `<div class="alert alert-success py-2 mb-0"><i class="bi bi-check-circle"></i> ${MR.esc(respuesta.mensaje)}</div>`;
        } catch (err) {
            zona.innerHTML = `<span class="text-danger">${MR.esc(err.message)}</span>`;
        } finally {
            boton.disabled = false;
        }
    });

    /* ---------- Imprimir / guardar el mapa en PDF ---------- */
    $('btnImprimirMapa').addEventListener('click', () => {
        document.body.classList.add('mr-imprimir-mapa');
        mapa.invalidateSize();
        setTimeout(() => window.print(), 300);
    });
    window.addEventListener('afterprint', () => {
        document.body.classList.remove('mr-imprimir-mapa');
        mapa.invalidateSize();
    });

    /* ---------- Eventos ---------- */
    $('formBuscar').addEventListener('submit', buscar);
    btnUbicacion.addEventListener('click', alternarUbicacion);
    $('btnIntercambiar').addEventListener('click', intercambiar);
    document.querySelectorAll('.mr-chip[data-destino]').forEach((chip) => chip.addEventListener('click', () => {
        inputDestino.value = chip.dataset.destino;
        inputDestino.focus();
    }));
    [optAccesible, optMenosTransbordos].forEach((o) => o.addEventListener('change', () => { if (ultimaBusqueda) buscar(); }));
    document.querySelectorAll('.mr-filtro').forEach((b) => b.addEventListener('click', () => {
        filtro = b.dataset.filtro;
        aplicarFiltro();
        if (seleccion && seleccion.tarjeta.classList.contains('d-none')) {
            const visible = tarjetas().find((t) => !t.classList.contains('d-none'));
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

    if (new URLSearchParams(location.search).has('reportar')) bootstrap.Modal.getOrCreateInstance(modalReporte).show();
    cargarRutasDisponibles();
    mostrarParadasGenerales();
})();
