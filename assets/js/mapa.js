/** Mapa general: rutas seleccionables, vehículos en circulación y rutas cercanas al usuario. */
(() => {
    const { esc, icono } = MR;
    const S = MRServicios;
    const $ = (id) => document.getElementById(id);
    const mapa = MR.crearMapa('mapa');
    const capaVehiculos = MR.capaVehiculos(mapa);
    const indicador = MR.indicador($('indicador'));
    const lista = $('listaRutas');
    const resumen = $('resumenVehiculos');
    const dibujos = new Map();

    const rutas = S.api('rutas').rutas;
    lista.innerHTML = rutas.map((r, i) => `
        <label class="group flex cursor-pointer items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-surface-container-low mr-anim-subir" style="--retraso:${300 + i * 40}ms">
            <input class="h-4 w-4 cursor-pointer accent-primary" type="checkbox" value="${r.id}" checked>
            ${MR.insigniaRuta(r, 'sm')}
            <span class="min-w-0 flex-1 text-sm"><span class="font-medium text-on-surface">${esc(r.nombre)}</span> <span class="text-on-surface-variant">(${esc(r.sentido)})</span></span>
            ${r.estado_servicio !== 'normal' ? `<span class="mr-estado ${MR.claseEstado(r.estado_servicio)}" title="${esc(r.estado_texto)}">${icono(MR.iconoEstado(r.estado_servicio), 'relleno')}</span>` : ''}
            <a href="${MR.url('ruta.html?id=' + r.id)}" class="opacity-0 transition-opacity group-hover:opacity-100" title="Ver detalle de la ruta">${icono('open_in_new', 'text-[16px] text-secondary')}</a>
        </label>`).join('');

    const seleccionadas = () => [...lista.querySelectorAll('input:checked')].map((i) => Number(i.value));

    async function sincronizarRutas(ajustar = false, refrescarVehiculos = true) {
        const ids = seleccionadas();
        $('cuentaRutas').textContent = ids.length;
        dibujos.forEach((d, id) => {
            if (!ids.includes(id)) { d.quitar(); dibujos.delete(id); }
        });
        await Promise.all(ids.filter((id) => !dibujos.has(id)).map(async (id) => {
            try {
                const detalle = await MR.api('rutas', { id }, 40);
                if (seleccionadas().includes(id) && !dibujos.has(id)) dibujos.set(id, MR.dibujarRuta(mapa, detalle, { ajustar: false }));
            } catch (e) { /* la ruta dejó de estar disponible */ }
        }));
        if (ajustar && dibujos.size) {
            const limites = L.featureGroup([...dibujos.values()].map((d) => d.grupo)).getBounds();
            const enEscritorio = window.matchMedia('(min-width: 768px)').matches;
            mapa.fitBounds(limites, { paddingTopLeft: [enEscritorio ? 400 : 20, 30], paddingBottomRight: [30, enEscritorio ? 30 : 260] });
        }
        if (refrescarVehiculos) sondeo.reiniciar();
    }

    const sondeo = MR.sondeo(async () => {
        const ids = seleccionadas();
        if (!ids.length) {
            capaVehiculos.actualizar([]);
            resumen.textContent = 'Selecciona al menos una ruta para ver sus vehículos.';
            $('cuentaUnidades').textContent = '0';
            $('cuentaGps').textContent = '0';
            indicador.reposo('Sin rutas seleccionadas.');
            return;
        }
        indicador.cargando();
        try {
            const datos = await MR.api('vehiculos', { rutas: ids.join(',') }, 60);
            capaVehiculos.actualizar(datos.vehiculos);
            const con = datos.vehiculos.filter((v) => v.con_ubicacion).length;
            const sin = datos.vehiculos.length - con;
            $('cuentaUnidades').textContent = datos.vehiculos.length;
            $('cuentaGps').textContent = con;
            resumen.textContent = datos.vehiculos.length
                ? `${datos.vehiculos.length} unidad(es) en circulación · ${con} con ubicación${sin ? ` · ${sin} sin información de ubicación` : ''}`
                : 'No hay unidades en circulación en las rutas seleccionadas.';
            indicador.listo(datos.datos_demostracion);
        } catch (e) {
            indicador.error();
        }
    });

    lista.addEventListener('change', () => sincronizarRutas());
    $('btnTodas').addEventListener('click', () => {
        lista.querySelectorAll('input').forEach((i) => { i.checked = true; });
        sincronizarRutas(true);
    });
    $('btnNinguna').addEventListener('click', () => {
        lista.querySelectorAll('input').forEach((i) => { i.checked = false; });
        sincronizarRutas();
    });

    const btnPlegar = $('btnPlegar');
    btnPlegar.addEventListener('click', () => {
        const plegado = $('cuerpoPanel').classList.toggle('hidden');
        btnPlegar.setAttribute('aria-expanded', String(!plegado));
        btnPlegar.querySelector('span').textContent = plegado ? 'expand_less' : 'expand_more';
    });

    /* ---------- Rutas y paradas cercanas ---------- */
    const btnUbicacion = $('btnUbicacion');
    const mensaje = $('mensajeUbicacion');
    btnUbicacion.addEventListener('click', async () => {
        const etiqueta = btnUbicacion.querySelector('span:last-child');
        btnUbicacion.disabled = true;
        etiqueta.textContent = 'Obteniendo tu ubicación…';
        mensaje.textContent = '';
        try {
            const pos = await MR.ubicarUsuario();
            MR.mostrarUsuario(mapa, pos);
            const { paradas } = await MR.api('paradas', { lat: pos.lat.toFixed(6), lng: pos.lng.toFixed(6) });
            $('cercanas').classList.remove('hidden');
            if (!paradas.length) {
                $('listaCercanas').innerHTML = '<p class="text-sm text-on-surface-variant">No hay paradas cerca de tu ubicación.</p>';
                mapa.flyTo([pos.lat, pos.lng], 15, { duration: 0.8 });
                return;
            }
            $('listaCercanas').innerHTML = paradas.slice(0, 5).map((p, i) => `
                <a class="block rounded-lg bg-surface-container-low p-2.5 transition-colors hover:bg-surface-container mr-anim-subir" style="--retraso:${i * 50}ms" href="${MR.url('parada.html?id=' + p.id)}">
                    <span class="flex justify-between gap-2 text-sm"><strong class="font-semibold">${esc(p.nombre)}</strong><span class="text-on-surface-variant">${esc(p.distancia_texto)}</span></span>
                    <span class="mt-1 flex flex-wrap gap-1">${MR.insigniasRutas(p.rutas, 'sm')}</span>
                </a>`).join('');

            const cercanas = new Set(paradas.flatMap((p) => p.rutas.map((r) => r.id)));
            lista.querySelectorAll('input').forEach((i) => { i.checked = cercanas.has(Number(i.value)); });
            await sincronizarRutas();
            const limites = L.latLngBounds(paradas.map((p) => [p.latitud, p.longitud])).extend([pos.lat, pos.lng]);
            mapa.flyToBounds(limites, { padding: [60, 60], maxZoom: 16, duration: 0.9 });
            mensaje.innerHTML = `<p class="flex items-center gap-1.5 text-secondary">${icono('check_circle', 'text-[18px]')} ${cercanas.size} ruta(s) cerca de ti.</p>`;
        } catch (e) {
            mensaje.innerHTML = `<p class="flex items-start gap-1.5 text-error">${icono('error', 'text-[18px]')}<span>${esc(e.message)}</span></p>`;
        } finally {
            btnUbicacion.disabled = false;
            etiqueta.textContent = 'Rutas cerca de mí';
        }
    });

    sincronizarRutas(true, false);
})();
