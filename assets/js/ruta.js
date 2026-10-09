/** Detalle de ruta: mapa con recorrido y paradas, vehículos en circulación y ETA a la parada elegida. */
(() => {
    const { esc, icono } = MR;
    const S = MRServicios;
    const $ = (id) => document.getElementById(id);
    const rutaId = Number(MR.parametro('id'));
    let detalle;
    try {
        detalle = S.api('rutas', { id: rutaId });
    } catch (e) {
        MRUI.cabecera({ titulo: 'Ruta no disponible', subtitulo: 'La ruta que buscas no existe o no está disponible.', icono: 'wrong_location', migas: [['Rutas', 'rutas.html'], ['No encontrada']] });
        document.querySelector('#contenido > section:last-child').innerHTML = `<div class="mr-tarjeta mr-anim-escala">${MR.htmlVacio('wrong_location', 'La ruta que buscas no existe o no está disponible.',
            `<a class="mr-btn mr-btn-primario mt-3" href="${MR.url('rutas.html')}">${icono('route')} Ver todas las rutas</a>`)}</div>`;
        return;
    }
    const { ruta } = detalle;
    S.historial.registrar(ruta.id, null);

    MRUI.cabecera({
        titulo: ruta.nombre,
        antetitulo: ruta.linea,
        subtitulo: `${ruta.origen} → ${ruta.destino}`,
        insignia: `<span class="mr-codigo mr-codigo-lg ring-4 ring-white/20" style="background:${esc(ruta.color)}">${esc(ruta.codigo)}</span>`,
        migas: [['Rutas', 'rutas.html'], [`Ruta ${ruta.codigo}`]],
        extra: `<div class="rounded-full bg-white p-1">${MR.estadoHtml(ruta.estado_servicio, ruta.estado_texto)}</div>`,
    });

    const dato = (etiqueta, valor, nombreIcono) => `
        <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-container/40 text-on-secondary-container">${icono(nombreIcono, 'text-[20px]')}</span>
            <div class="min-w-0"><p class="text-[11px] font-bold uppercase tracking-wider text-outline">${etiqueta}</p><p class="truncate font-semibold text-on-surface">${esc(valor)}</p></div>
        </div>`;
    $('datosRuta').innerHTML = `
        ${ruta.aviso ? `<div class="mb-4">${MR.avisoServicioHtml(ruta)}</div>` : ''}
        <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            ${dato('Origen', ruta.origen, 'trip_origin')}
            ${dato('Destino', ruta.destino, 'location_on')}
            ${dato('Sentido', ruta.sentido, 'sync_alt')}
            ${dato('Duración', ruta.duracion_texto, 'timer')}
            ${dato('Longitud', ruta.longitud_texto, 'straighten')}
            ${dato('Tarifa', ruta.tarifa_texto, 'payments')}
        </div>`;

    $('textoSentido').innerHTML = `${icono('south', 'text-[18px] text-secondary')} ${esc(ruta.sentido)}: de <strong class="text-on-surface">${esc(ruta.origen)}</strong> a <strong class="text-on-surface">${esc(ruta.destino)}</strong>${ruta.es_circuito ? ' (el recorrido regresa al inicio)' : ''}.`;
    const lista = $('listaParadas');
    lista.style.setProperty('--color', ruta.color);
    lista.innerHTML = detalle.paradas.map((p, i) => `
        <li data-parada="${p.id}" style="--i:${i}">
            <button type="button">
                <span class="flex items-center justify-between gap-2">
                    <span class="font-semibold text-on-surface">${esc(p.nombre)}</span>
                    <span class="shrink-0 rounded-md ${i === 0 ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'} px-1.5 py-0.5 text-[11px] font-bold">${p.minutos_desde_origen ? '+' + p.minutos_desde_origen + ' min' : 'Inicio'}</span>
                </span>
                <span class="mt-0.5 block text-xs text-on-surface-variant">${p.referencia ? esc(p.referencia) + ' · ' : ''}Parada #${esc(p.codigo)}</span>
            </button>
        </li>`).join('');

    const mapa = MR.crearMapa('mapa');
    const capaVehiculos = MR.capaVehiculos(mapa);
    const indicador = MR.indicador($('indicador'));
    const panelEta = $('panelEta');
    const listaVehiculos = $('listaVehiculos');
    const dibujo = MR.dibujarRuta(mapa, detalle, { alSeleccionarParada: (p) => seleccionarParada(p.id, false) });
    let paradaActual = null;
    let sondeoEta = null;

    MR.sondeo(async () => {
        indicador.cargando();
        try {
            const datos = await MR.api('vehiculos', { rutas: rutaId }, 80);
            capaVehiculos.actualizar(datos.vehiculos);
            mostrarVehiculos(datos.vehiculos);
            indicador.listo(datos.datos_demostracion);
        } catch (e) {
            indicador.error();
        }
    });

    function mostrarVehiculos(vehiculos) {
        $('contadorVehiculos').textContent = vehiculos.length;
        if (!vehiculos.length) {
            listaVehiculos.innerHTML = MR.htmlVacio('bedtime', 'No hay unidades en circulación en esta ruta en este momento.');
            return;
        }
        listaVehiculos.innerHTML = vehiculos.map((v) => `
            <div class="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-surface-container-low">
                <div class="mr-marcador-vehiculo estatico shrink-0" style="--color:${esc(v.ruta_color)}${v.con_ubicacion ? '' : ';opacity:.45'}">${icono('directions_bus')}</div>
                <div class="min-w-0 flex-1">
                    <p class="font-semibold">Unidad ${esc(v.unidad)} ${v.chofer ? `<span class="font-normal text-on-surface-variant">· ${esc(v.chofer)}</span>` : ''}</p>
                    <p class="flex items-center gap-1 text-xs text-on-surface-variant">${MR.estadoVehiculo(v)}</p>
                    ${v.proxima_parada ? `<p class="mt-0.5 text-xs text-on-surface-variant">Próxima parada: <strong class="text-on-surface">${esc(v.proxima_parada.nombre)}</strong> · <span class="font-semibold text-secondary">${esc(v.proxima_parada.texto)}</span></p>` : ''}
                </div>
                ${v.con_ubicacion ? `<button class="mr-btn mr-btn-secundario mr-btn-sm" type="button" data-enfocar="${v.vehiculo_id}">${icono('my_location')} Ver</button>` : ''}
            </div>`).join('');
    }

    listaVehiculos.addEventListener('click', (e) => {
        const boton = e.target.closest('[data-enfocar]');
        if (boton) capaVehiculos.enfocar(Number(boton.dataset.enfocar));
    });

    function seleccionarParada(paradaId, centrar = true) {
        const parada = detalle.paradas.find((p) => p.id === paradaId);
        if (!parada) return;
        paradaActual = paradaId;
        dibujo.destacar([paradaId]);
        lista.querySelectorAll('li').forEach((li) => li.classList.toggle('activa', Number(li.dataset.parada) === paradaId));
        if (centrar) {
            mapa.flyTo([parada.latitud, parada.longitud], Math.max(mapa.getZoom(), 15), { duration: 0.7 });
            mapa.once('moveend', () => dibujo.marcadores.get(paradaId)?.openPopup());
        }
        panelEta.innerHTML = `<div class="grid gap-2">${MR.esqueletos(2, 'h-14')}</div>`;

        const consultar = async () => {
            if (paradaActual !== paradaId) return;
            try {
                const datos = await MR.api('eta', { parada_id: paradaId, ruta_id: rutaId }, 80);
                panelEta.innerHTML = `
                    <div class="mb-3 flex items-start justify-between gap-2">
                        <div><p class="font-semibold text-on-surface">${esc(parada.nombre)}</p>
                             ${parada.referencia ? `<p class="text-xs text-on-surface-variant">${esc(parada.referencia)}</p>` : ''}</div>
                        <a class="shrink-0 text-sm font-semibold text-secondary hover:underline" href="${MR.url('parada.html?id=' + paradaId)}">Otras rutas aquí</a>
                    </div>` + MR.htmlLlegadas(datos.rutas, { sinEncabezado: true }).replace(/mr-tarjeta p-4/g, '');
            } catch (e) {
                panelEta.innerHTML = `<p class="text-sm text-error">${esc(e.message)}</p>`;
            }
        };
        if (sondeoEta) sondeoEta.reiniciar(consultar); else sondeoEta = MR.sondeo(consultar);
    }

    lista.addEventListener('click', (e) => {
        const li = e.target.closest('li[data-parada]');
        if (li) seleccionarParada(Number(li.dataset.parada));
    });

    document.querySelectorAll('[data-pestana]').forEach((b) => b.addEventListener('click', () => {
        document.querySelectorAll('[data-pestana]').forEach((x) => {
            const activa = x === b;
            x.classList.toggle('activa', activa);
            x.setAttribute('aria-selected', String(activa));
        });
        document.querySelectorAll('[data-panel]').forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== b.dataset.pestana));
    }));

    const inicial = Number(MR.parametro('parada'));
    if (inicial) setTimeout(() => seleccionarParada(inicial), 600);
})();
