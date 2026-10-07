/**
 * Página principal: buscador origen/destino, resultados a la izquierda y mapa a la derecha.
 * Flujo: buscar → elegir ruta → ver recorrido y vehículos → elegir parada → consultar ETA.
 */
(() => {
    const TEXTO_REPOSO = 'Selecciona una ruta para ver sus vehículos en el mapa.';
    const mapa = MR.crearMapa('mapa');
    const capaVehiculos = MR.capaVehiculos(mapa);
    const indicador = MR.indicador(document.getElementById('indicador'));
    const contenedor = document.getElementById('resultados');
    const titulo = document.getElementById('tituloResultados');
    const mensaje = document.getElementById('mensajeBuscador');
    const inputOrigen = document.getElementById('origen');
    const inputDestino = document.getElementById('destino');
    const btnUbicacion = document.getElementById('btnUbicacion');
    const btnTodas = document.getElementById('btnTodas');
    const btnVistaRuta = document.getElementById('btnVistaRuta');
    const btnVistaParadas = document.getElementById('btnVistaParadas');
    const panel = document.getElementById('panelVehiculo');

    const detalles = new Map();
    let capaParadas = null;
    let rutaDibujada = null;
    let sondeoVehiculos = null;
    let sondeoEta = null;
    let ubicacion = null;
    let seleccion = null; // { rutaId, paradaEtaId, tarjeta }
    const flota = { lista: [], indice: 0, siguiendo: false, enCirculacion: 0 };

    /* ---------- Paradas generales y vista del mapa ---------- */
    async function mostrarParadasGenerales() {
        try {
            const { paradas } = await MR.api('paradas.php');
            capaParadas = L.featureGroup(paradas.map((p) =>
                L.marker([p.latitud, p.longitud], { icon: MR.iconoParada('#065F46'), title: p.nombre })
                    .bindPopup(MR.popupParada(p, `<br><span class="small">Rutas: ${p.rutas.map((r) => MR.esc(r.codigo)).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</span>`))
            ));
            if (!seleccion) vistaParadas();
            if (!seleccion) indicador.reposo(TEXTO_REPOSO);
        } catch (e) {
            indicador.error(e.message);
        }
    }

    function marcarVista(boton) {
        [btnVistaRuta, btnVistaParadas].forEach((b) => b.classList.toggle('activo', b === boton));
    }

    function vistaParadas() {
        if (!capaParadas) return;
        capaParadas.addTo(mapa);
        if (capaParadas.getLayers().length) mapa.fitBounds(capaParadas.getBounds(), { padding: [30, 30] });
        marcarVista(btnVistaParadas);
    }

    function vistaRuta() {
        if (!rutaDibujada) return;
        if (capaParadas) mapa.removeLayer(capaParadas);
        mapa.fitBounds(rutaDibujada.grupo.getBounds(), { padding: [40, 40] });
        marcarVista(btnVistaRuta);
    }

    /* ---------- Lista inicial de rutas ---------- */
    async function cargarRutasDisponibles() {
        titulo.textContent = 'Rutas disponibles';
        btnTodas.classList.add('d-none');
        try {
            const { rutas } = await MR.api('rutas.php');
            if (!rutas.length) {
                contenedor.innerHTML = MR.htmlVacio('signpost', 'Por el momento no hay rutas disponibles.');
                return;
            }
            contenedor.innerHTML = rutas.map((r) => `
                <div class="mr-resultado" role="button" tabindex="0" data-ruta="${r.id}" style="--color:${MR.esc(r.color)}">
                    <div class="d-flex gap-2 align-items-start">
                        ${MR.insigniaRuta(r)}
                        <div class="flex-grow-1 min-w-0">
                            <h3 class="mr-resultado-titulo">${MR.esc(r.nombre)}</h3>
                            <div class="mr-tramo">${MR.esc(r.origen)} <i class="bi bi-arrow-right"></i> ${MR.esc(r.destino)}</div>
                            <div class="small text-secondary">${MR.esc(r.linea)} · ${MR.esc(r.sentido)} · ${r.total_paradas} paradas</div>
                        </div>
                        <div class="text-end flex-shrink-0">
                            <span class="mr-precio">${MR.esc(r.tarifa_texto)}</span>
                            <div class="mt-1"><span class="mr-estado ${MR.claseEstado(r.estado_servicio)}" title="${MR.esc(r.estado_texto)}"><i class="bi bi-${MR.iconoEstado(r.estado_servicio)}"></i></span></div>
                        </div>
                    </div>
                    <div data-eta class="mt-2 d-none"></div>
                </div>`).join('');
        } catch (e) {
            contenedor.innerHTML = MR.htmlVacio('exclamation-circle', 'No fue posible cargar las rutas. Intenta nuevamente.');
        }
    }

    /* ---------- Búsqueda ---------- */
    async function buscar(evento) {
        evento.preventDefault();
        const origen = ubicacion ? '' : inputOrigen.value.trim();
        const destino = inputDestino.value.trim();
        if (!destino && !origen && !ubicacion) {
            mensaje.innerHTML = '<span class="text-danger">Escribe tu destino o tu punto de partida para buscar rutas.</span>';
            inputDestino.focus();
            return;
        }
        mensaje.innerHTML = '<span class="spinner-border spinner-border-sm text-success"></span> Buscando rutas…';
        try {
            const datos = await MR.api('buscar.php', {
                origen, destino,
                lat: ubicacion ? ubicacion.lat.toFixed(6) : '',
                lng: ubicacion ? ubicacion.lng.toFixed(6) : '',
            });
            mensaje.textContent = '';
            mostrarResultados(datos);
        } catch (e) {
            mensaje.innerHTML = `<span class="text-danger">${MR.esc(e.message)}</span>`;
        }
    }

    function mostrarResultados({ resultados, mensaje: aviso }) {
        btnTodas.classList.remove('d-none');
        titulo.textContent = resultados.length
            ? `Rutas encontradas (${resultados.length} ${resultados.length === 1 ? 'opción' : 'opciones'})`
            : 'Sin resultados';
        if (!resultados.length) {
            contenedor.innerHTML = MR.htmlVacio('signpost', aviso || 'No encontramos rutas.');
            return;
        }
        resultados.forEach((r) => {
            r.paradas_frecuentes = r.paradas_frecuentes.filter((n) => n !== r.subir.nombre && n !== r.bajar.nombre);
        });
        contenedor.innerHTML = resultados.map((r, i) => `
            <div class="mr-resultado mr-resultado-viaje" role="button" tabindex="0" data-ruta="${r.ruta.id}" data-subir="${r.subir.id}" data-bajar="${r.bajar.id}" style="--color:${MR.esc(r.ruta.color)}">
                <div class="d-flex gap-2 align-items-start justify-content-between">
                    <div class="min-w-0">
                        <span class="mr-insignia-opcion${i === 0 ? '' : ' alternativa'}">${i === 0 ? 'Opción recomendada' : 'Alternativa'}</span>
                        <h3 class="mr-resultado-titulo mt-2 d-flex align-items-center gap-2">${MR.insigniaRuta(r.ruta, true)} ${MR.esc(r.ruta.nombre)}</h3>
                        <div class="small text-secondary">${MR.esc(r.ruta.linea)} · ${MR.esc(r.ruta.sentido)} hacia ${MR.esc(r.ruta.destino)}</div>
                    </div>
                    <div class="text-end flex-shrink-0">
                        <div class="mr-duracion">${MR.esc(r.duracion_texto)}</div>
                        <span class="mr-precio">${MR.esc(r.ruta.tarifa_texto)}</span>
                    </div>
                </div>
                <ol class="mr-itinerario">
                    <li class="subir">
                        <div class="fw-semibold">Sube en ${MR.esc(r.subir.nombre)}</div>
                        ${r.caminar_texto ? `<div class="small text-secondary"><i class="bi bi-person-walking"></i> ${MR.esc(r.caminar_texto)}</div>` : ''}
                        <div class="small text-secondary">${r.paradas_intermedias} ${r.paradas_intermedias === 1 ? 'parada intermedia' : 'paradas intermedias'}${r.paradas_frecuentes.length ? ` · Pasa por ${r.paradas_frecuentes.map(MR.esc).join(', ')}` : ''}</div>
                    </li>
                    <li class="bajar"><div class="fw-semibold">Baja en ${MR.esc(r.bajar.nombre)}</div></li>
                </ol>
                <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-2">
                    <span class="mr-estado ${MR.claseEstado(r.ruta.estado_servicio)}"><i class="bi bi-${MR.iconoEstado(r.ruta.estado_servicio)}"></i> ${MR.esc(r.ruta.estado_texto)}</span>
                    <a class="mr-enlace-accion" href="${MR.url('ruta.php?id=' + r.ruta.id)}">Ver recorrido completo <i class="bi bi-chevron-right"></i></a>
                </div>
                ${r.ruta.aviso ? `<div class="small mt-2 text-warning-emphasis"><i class="bi bi-exclamation-triangle"></i> ${MR.esc(r.ruta.aviso)}</div>` : ''}
                <div data-eta class="mt-2 d-none"></div>
            </div>`).join('');
        activarTarjeta(contenedor.querySelector('.mr-resultado'));
    }

    /* ---------- Selección de una ruta ---------- */
    async function activarTarjeta(tarjeta) {
        if (!tarjeta) return;
        contenedor.querySelectorAll('.mr-resultado').forEach((t) => {
            t.classList.toggle('activo', t === tarjeta);
            if (t !== tarjeta) t.querySelector('[data-eta]')?.classList.add('d-none');
        });
        const rutaId = Number(tarjeta.dataset.ruta);
        const subir = tarjeta.dataset.subir ? Number(tarjeta.dataset.subir) : null;
        const bajar = tarjeta.dataset.bajar ? Number(tarjeta.dataset.bajar) : null;
        seleccion = { rutaId, tarjeta, paradaEtaId: subir };

        let detalle = detalles.get(rutaId);
        try {
            if (!detalle) {
                detalle = await MR.api('rutas.php', { id: rutaId });
                detalles.set(rutaId, detalle);
            }
        } catch (e) {
            indicador.error(e.message);
            return;
        }
        if (seleccion.rutaId !== rutaId) return;

        if (rutaDibujada) rutaDibujada.quitar();
        rutaDibujada = MR.dibujarRuta(mapa, detalle, {
            destacadas: [subir, bajar].filter(Boolean),
            alSeleccionarParada: (p) => elegirParadaEta(p.id),
            ajustar: false,
        });
        btnVistaRuta.disabled = false;
        vistaRuta();

        flota.indice = 0;
        if (flota.siguiendo) alternarSeguir(false);
        const vehiculos = async () => {
            indicador.cargando();
            try {
                const datos = await MR.api('vehiculos.php', { rutas: rutaId });
                if (!seleccion || seleccion.rutaId !== rutaId) return;
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
        if (subir) elegirParadaEta(subir);
        else {
            if (sondeoEta) sondeoEta.detener();
            zonaEta.innerHTML = '<div class="small text-secondary"><i class="bi bi-hand-index"></i> Selecciona una parada en el mapa para ver el tiempo aproximado de llegada. <a href="' + MR.url('ruta.php?id=' + rutaId) + '">Ver recorrido completo</a></div>';
        }
    }

    function elegirParadaEta(paradaId) {
        if (!seleccion) return;
        seleccion.paradaEtaId = paradaId;
        const detalle = detalles.get(seleccion.rutaId);
        const parada = detalle.paradas.find((p) => p.id === paradaId);
        const zona = seleccion.tarjeta.querySelector('[data-eta]');
        zona.classList.remove('d-none');
        const rutaId = seleccion.rutaId;

        const consultar = async () => {
            if (!seleccion || seleccion.paradaEtaId !== paradaId || seleccion.rutaId !== rutaId) return;
            try {
                const datos = await MR.api('eta.php', { parada_id: paradaId, ruta_id: rutaId });
                zona.innerHTML = `<div class="small fw-semibold mb-1"><i class="bi bi-clock"></i> Llegadas a ${MR.esc(parada ? parada.nombre : 'la parada')}</div>`
                    + MR.htmlLlegadas(datos.rutas, { sinEncabezado: true });
            } catch (e) {
                zona.innerHTML = `<div class="small text-danger">${MR.esc(e.message)}</div>`;
            }
        };
        zona.innerHTML = '<div class="small text-secondary"><span class="spinner-border spinner-border-sm"></span> Calculando tiempo aproximado de llegada…</div>';
        if (sondeoEta) sondeoEta.reiniciar(consultar); else sondeoEta = MR.sondeo(consultar);
    }

    /* ---------- Panel del vehículo sobre el mapa ---------- */
    function actualizarPanel(vehiculos) {
        flota.lista = vehiculos.filter((v) => v.con_ubicacion);
        flota.enCirculacion = vehiculos.length;
        if (flota.indice >= flota.lista.length) flota.indice = 0;
        pintarPanel();
        if (flota.siguiendo) seguirActual();
    }

    function pintarPanel() {
        const tituloPanel = panel.querySelector('[data-titulo]');
        const detalle = panel.querySelector('[data-detalle]');
        const varios = flota.lista.length > 1;
        panel.classList.remove('d-none');
        ['[data-anterior]', '[data-siguiente]', '[data-contador]'].forEach((s) => panel.querySelector(s).classList.toggle('d-none', !varios));
        panel.querySelector('[data-seguir]').classList.toggle('d-none', !flota.lista.length);

        const v = flota.lista[flota.indice];
        if (!v) {
            tituloPanel.textContent = flota.enCirculacion ? 'Unidades en circulación' : 'Sin unidades en circulación';
            detalle.textContent = flota.enCirculacion
                ? 'No hay información de ubicación disponible.'
                : 'No hay unidades en circulación en esta ruta en este momento.';
            return;
        }
        tituloPanel.textContent = `Unidad ${v.unidad} · ${v.linea}`;
        detalle.innerHTML = v.proxima_parada
            ? `Próxima parada: ${MR.esc(v.proxima_parada.nombre)} <span class="mx-1">•</span> <span class="mr-texto-eta">${MR.esc(v.proxima_parada.texto)}</span>`
            : `Hacia ${MR.esc(v.destino)} <span class="mx-1">•</span> Ubicación actualizada ${MR.tiempoRelativo(v.actualizado_hace_seg)}`;
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
        boton.textContent = flota.siguiendo ? 'Dejar de seguir' : 'Seguir vehículo';
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
        if (sondeoVehiculos) sondeoVehiculos.detener();
        if (sondeoEta) sondeoEta.detener();
        if (rutaDibujada) { rutaDibujada.quitar(); rutaDibujada = null; }
        capaVehiculos.actualizar([]);
        if (flota.siguiendo) alternarSeguir(false);
        panel.classList.add('d-none');
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
    }

    /* ---------- Eventos ---------- */
    document.getElementById('formBuscar').addEventListener('submit', buscar);
    btnUbicacion.addEventListener('click', alternarUbicacion);
    document.getElementById('btnIntercambiar').addEventListener('click', intercambiar);
    document.querySelectorAll('.mr-chip[data-destino]').forEach((chip) => chip.addEventListener('click', () => {
        inputDestino.value = chip.dataset.destino;
        inputDestino.focus();
    }));
    btnTodas.addEventListener('click', volverATodas);
    btnVistaRuta.addEventListener('click', () => { if (flota.siguiendo) alternarSeguir(); else vistaRuta(); });
    btnVistaParadas.addEventListener('click', () => { if (flota.siguiendo) alternarSeguir(false); vistaParadas(); });
    panel.querySelector('[data-seguir]').addEventListener('click', () => alternarSeguir());
    panel.querySelector('[data-anterior]').addEventListener('click', () => cambiarVehiculo(-1));
    panel.querySelector('[data-siguiente]').addEventListener('click', () => cambiarVehiculo(1));
    mapa.on('dragstart', () => { if (flota.siguiendo) alternarSeguir(false); });
    contenedor.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        const tarjeta = e.target.closest('.mr-resultado');
        if (tarjeta && !tarjeta.classList.contains('activo')) activarTarjeta(tarjeta);
    });
    contenedor.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('mr-resultado')) {
            e.preventDefault();
            activarTarjeta(e.target);
        }
    });

    cargarRutasDisponibles();
    mostrarParadasGenerales();
})();
