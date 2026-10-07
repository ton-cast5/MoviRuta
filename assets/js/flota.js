/** Ubicación de la flota en circulación para dueño de línea y administrador. */
(() => {
    const mapa = MR.crearMapa('mapa');
    const capaVehiculos = MR.capaVehiculos(mapa);
    const indicador = MR.indicador(document.getElementById('indicador'));
    const lista = document.getElementById('listaFlota');
    const total = document.getElementById('totalFlota');
    let primeraVez = true;

    MR.sondeo(async () => {
        indicador.cargando();
        try {
            const datos = await MR.api('vehiculos.php', { ambito: 'gestion' });
            const vehiculos = datos.vehiculos;
            capaVehiculos.actualizar(vehiculos);
            total.textContent = vehiculos.length;
            lista.innerHTML = vehiculos.length ? vehiculos.map((v) => `
                <div class="d-flex gap-2 py-2 border-bottom align-items-start">
                    ${MR.insigniaRuta({ codigo: v.ruta_codigo, color: v.ruta_color }, true)}
                    <div class="flex-grow-1 small">
                        <div class="fw-semibold">Unidad ${MR.esc(v.unidad)} <span class="text-secondary fw-normal">· ${MR.esc(v.placa)}</span></div>
                        <div>${MR.esc(v.chofer)} · desde ${MR.esc(v.inicio)}</div>
                        <div class="text-secondary">${MR.estadoVehiculo(v)}</div>
                    </div>
                    ${v.con_ubicacion ? `<button class="btn btn-sm btn-secondary" type="button" data-enfocar="${v.vehiculo_id}" aria-label="Ver en mapa"><i class="bi bi-geo"></i></button>` : ''}
                </div>`).join('') : MR.htmlVacio('moon', 'No hay unidades en circulación en este momento.');

            const conUbicacion = vehiculos.filter((v) => v.con_ubicacion);
            if (primeraVez && conUbicacion.length) {
                mapa.fitBounds(L.latLngBounds(conUbicacion.map((v) => [v.latitud, v.longitud])), { padding: [40, 40], maxZoom: 15 });
                primeraVez = false;
            }
            indicador.listo(datos.datos_demostracion);
        } catch (e) {
            indicador.error(e.message);
        }
    });

    lista.addEventListener('click', (e) => {
        const b = e.target.closest('[data-enfocar]');
        if (b) capaVehiculos.enfocar(Number(b.dataset.enfocar));
    });
})();
