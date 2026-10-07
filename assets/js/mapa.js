/** Mapa general: rutas seleccionables, vehículos en circulación y rutas cercanas al usuario. */
(() => {
    const mapa = MR.crearMapa('mapa');
    const capaVehiculos = MR.capaVehiculos(mapa);
    const indicador = MR.indicador(document.getElementById('indicador'));
    const lista = document.getElementById('listaRutas');
    const resumen = document.getElementById('resumenVehiculos');
    const dibujos = new Map();

    const seleccionadas = () => [...lista.querySelectorAll('input:checked')].map((i) => Number(i.value));

    async function sincronizarRutas(ajustar = false, refrescarVehiculos = true) {
        const ids = seleccionadas();
        dibujos.forEach((d, id) => {
            if (!ids.includes(id)) { d.quitar(); dibujos.delete(id); }
        });
        await Promise.all(ids.filter((id) => !dibujos.has(id)).map(async (id) => {
            try {
                const detalle = await MR.api('rutas.php', { id });
                if (seleccionadas().includes(id) && !dibujos.has(id)) dibujos.set(id, MR.dibujarRuta(mapa, detalle, { ajustar: false }));
            } catch (e) { /* la ruta dejó de estar disponible */ }
        }));
        if (ajustar && dibujos.size) {
            mapa.fitBounds(L.featureGroup([...dibujos.values()].map((d) => d.grupo)).getBounds(), { padding: [30, 30] });
        }
        if (refrescarVehiculos) sondeo.reiniciar();
    }

    const sondeo = MR.sondeo(async () => {
        const ids = seleccionadas();
        if (!ids.length) {
            capaVehiculos.actualizar([]);
            resumen.textContent = 'Selecciona al menos una ruta para ver sus vehículos.';
            indicador.listo(false);
            return;
        }
        indicador.cargando();
        try {
            const datos = await MR.api('vehiculos.php', { rutas: ids.join(',') });
            capaVehiculos.actualizar(datos.vehiculos);
            const con = datos.vehiculos.filter((v) => v.con_ubicacion).length;
            const sin = datos.vehiculos.length - con;
            resumen.textContent = datos.vehiculos.length
                ? `${datos.vehiculos.length} unidad(es) en circulación · ${con} con ubicación${sin ? ` · ${sin} sin información de ubicación` : ''}`
                : 'No hay unidades en circulación en las rutas seleccionadas.';
            indicador.listo(datos.datos_demostracion);
        } catch (e) {
            indicador.error();
        }
    });

    lista.addEventListener('change', () => sincronizarRutas());
    document.getElementById('btnTodas').addEventListener('click', () => {
        lista.querySelectorAll('input').forEach((i) => { i.checked = true; });
        sincronizarRutas(true);
    });
    document.getElementById('btnNinguna').addEventListener('click', () => {
        lista.querySelectorAll('input').forEach((i) => { i.checked = false; });
        sincronizarRutas();
    });

    /* ---------- Rutas y paradas cercanas (RF-09) ---------- */
    const btnUbicacion = document.getElementById('btnUbicacion');
    const mensaje = document.getElementById('mensajeUbicacion');
    btnUbicacion.addEventListener('click', async () => {
        const etiqueta = btnUbicacion.querySelector('span');
        btnUbicacion.disabled = true;
        etiqueta.textContent = 'Obteniendo tu ubicación…';
        mensaje.textContent = '';
        try {
            const pos = await MR.ubicarUsuario();
            MR.mostrarUsuario(mapa, pos);
            const { paradas } = await MR.api('paradas.php', { lat: pos.lat.toFixed(6), lng: pos.lng.toFixed(6) });
            const contenedor = document.getElementById('cercanas');
            contenedor.classList.remove('d-none');
            if (!paradas.length) {
                document.getElementById('listaCercanas').innerHTML = '<div class="text-secondary">No hay paradas cerca de tu ubicación.</div>';
                mapa.setView([pos.lat, pos.lng], 15);
                return;
            }
            document.getElementById('listaCercanas').innerHTML = paradas.slice(0, 5).map((p) => `
                <a class="mr-resultado p-2" href="${MR.url('parada.php?id=' + p.id)}">
                    <div class="d-flex justify-content-between"><strong>${MR.esc(p.nombre)}</strong><span class="text-secondary">${MR.esc(p.distancia_texto)}</span></div>
                    <div class="d-flex flex-wrap gap-1 mt-1">${p.rutas.map((r) => MR.insigniaRuta(r, true)).join('')}</div>
                </a>`).join('');

            // Muestra solo las rutas que pasan por las paradas cercanas.
            const cercanas = new Set(paradas.flatMap((p) => p.rutas.map((r) => r.id)));
            lista.querySelectorAll('input').forEach((i) => { i.checked = cercanas.has(Number(i.value)); });
            await sincronizarRutas();
            const limites = L.latLngBounds(paradas.map((p) => [p.latitud, p.longitud])).extend([pos.lat, pos.lng]);
            mapa.fitBounds(limites, { padding: [40, 40], maxZoom: 16 });
            mensaje.innerHTML = `<span class="text-success"><i class="bi bi-check-circle"></i> ${cercanas.size} ruta(s) cerca de ti.</span>`;
        } catch (e) {
            mensaje.innerHTML = `<span class="text-danger">${MR.esc(e.message)}</span>`;
        } finally {
            btnUbicacion.disabled = false;
            etiqueta.textContent = 'Rutas cerca de mí';
        }
    });

    sincronizarRutas(true, false);
})();
