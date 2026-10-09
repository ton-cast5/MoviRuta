/** Detalle de parada: rutas que pasan, vehículos próximos y ETA por ruta. */
(() => {
    const { esc, icono, T } = MR;
    const S = MRServicios;
    const $ = (id) => document.getElementById(id);
    const paradaId = Number(MR.parametro('id'));
    let datos;
    try {
        datos = S.api('paradas', { id: paradaId });
    } catch (e) {
        MRUI.cabecera({ titulo: 'Parada no disponible', subtitulo: 'La parada que buscas no existe o no está disponible.', icono: 'wrong_location', migas: [['Paradas', 'paradas.html'], ['No encontrada']] });
        $('cuerpoParada').innerHTML = `<div class="mr-tarjeta mr-anim-escala">${MR.htmlVacio('wrong_location', 'La parada que buscas no existe o no está disponible.',
            `<a class="mr-btn mr-btn-primario mt-3" href="${MR.url('paradas.html')}">${icono('location_on')} Ver todas las paradas</a>`)}</div>`;
        return;
    }
    const { parada } = datos;
    const rutas = S.consulta.rutasDeParada(parada.id);
    S.historial.registrar(null, parada.id);

    MRUI.cabecera({
        titulo: parada.nombre,
        antetitulo: `Parada #${parada.codigo}`,
        subtitulo: parada.referencia || '',
        icono: 'location_on',
        migas: [['Paradas', 'paradas.html'], [parada.nombre]],
        extra: `<div class="flex flex-wrap gap-1.5 rounded-xl bg-white/10 p-2 ring-1 ring-white/15">${MR.insigniasRutas(rutas) || '<span class="px-2 text-sm text-white/70">Sin rutas</span>'}</div>`,
    });

    $('rutasParada').innerHTML = rutas.length ? rutas.map((r, i) => `
        <a class="mr-tarjeta mr-tarjeta-interactiva group flex items-center gap-3 p-4 mr-anim-subir" style="--retraso:${i * 60}ms" href="${MR.url(`ruta.html?id=${r.id}&parada=${parada.id}`)}">
            ${MR.insigniaRuta(r)}
            <div class="min-w-0 flex-1">
                <p class="font-semibold text-on-surface group-hover:text-primary">${esc(r.nombre)}</p>
                <p class="text-xs text-on-surface-variant">${esc(T.textoSentido(r.sentido))} hacia ${esc(r.destino)} · ${esc(T.formatoTarifa(r.tarifa))}</p>
            </div>
            <span class="mr-estado ${MR.claseEstado(r.estado_servicio)}" title="${esc(T.estadoInfo(r.estado_servicio).texto)}">${icono(MR.iconoEstado(r.estado_servicio), 'relleno')}</span>
            ${icono('chevron_right', 'text-[20px] text-outline transition-transform group-hover:translate-x-1')}
        </a>`).join('') : `<div class="mr-tarjeta">${MR.htmlVacio('signpost', 'Por ahora ninguna ruta activa pasa por esta parada.')}</div>`;

    const mapa = MR.crearMapa('mapa', { centro: [parada.latitud, parada.longitud], zoom: 15 });
    const capaVehiculos = MR.capaVehiculos(mapa);
    const indicador = MR.indicador($('indicador'));
    const llegadas = $('llegadas');

    const detalles = rutas.map((r) => { try { return S.api('rutas', { id: r.id }); } catch (e) { return null; } }).filter(Boolean);
    const grupos = detalles.map((d) => MR.dibujarRuta(mapa, d, { ajustar: false, destacadas: [parada.id] }).grupo);
    const marcador = L.marker([parada.latitud, parada.longitud], { icon: MR.iconoDestino(), zIndexOffset: 800 })
        .bindPopup(`<strong>${esc(parada.nombre)}</strong>${parada.referencia ? `<br>${esc(parada.referencia)}` : ''}`).addTo(mapa);
    if (grupos.length) mapa.fitBounds(L.featureGroup(grupos).getBounds(), { padding: [40, 40] });
    setTimeout(() => marcador.openPopup(), 900);

    if (!rutas.length) {
        llegadas.innerHTML = MR.htmlVacio('signpost', 'Ninguna ruta activa pasa por esta parada.');
        indicador.reposo('Sin rutas que consultar.');
        return;
    }

    llegadas.innerHTML = MR.esqueletos(Math.min(3, rutas.length), 'h-28');
    MR.sondeo(async () => {
        indicador.cargando();
        try {
            const [eta, vehiculos] = await Promise.all([
                MR.api('eta', { parada_id: parada.id }, 80),
                MR.api('vehiculos', { rutas: rutas.map((r) => r.id).join(',') }, 80),
            ]);
            llegadas.innerHTML = MR.htmlLlegadas(eta.rutas);
            capaVehiculos.actualizar(vehiculos.vehiculos);
            indicador.listo(eta.datos_demostracion);
        } catch (e) {
            indicador.error();
            if (llegadas.querySelector('.mr-esqueleto')) llegadas.innerHTML = MR.htmlVacio('error', e.message);
        }
    });
})();
