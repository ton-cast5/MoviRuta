/** Detalle de ruta: mapa con recorrido y paradas, vehículos en circulación y ETA a la parada elegida. */
(() => {
    const detalle = JSON.parse(document.getElementById('datosRuta').textContent);
    const rutaId = detalle.ruta.id;
    const mapa = MR.crearMapa('mapa');
    const capaVehiculos = MR.capaVehiculos(mapa);
    const indicador = MR.indicador(document.getElementById('indicador'));
    const panelEta = document.getElementById('panelEta');
    const lista = document.getElementById('listaParadas');
    const listaVehiculos = document.getElementById('listaVehiculos');
    const contador = document.getElementById('contadorVehiculos');

    const dibujo = MR.dibujarRuta(mapa, detalle, { alSeleccionarParada: (p) => seleccionarParada(p.id, false) });
    let paradaActual = null;
    let sondeoEta = null;

    MR.sondeo(async () => {
        indicador.cargando();
        try {
            const datos = await MR.api('vehiculos.php', { rutas: rutaId });
            capaVehiculos.actualizar(datos.vehiculos);
            mostrarVehiculos(datos.vehiculos);
            indicador.listo(datos.datos_demostracion);
        } catch (e) {
            indicador.error();
        }
    });

    function mostrarVehiculos(vehiculos) {
        contador.textContent = vehiculos.length;
        if (!vehiculos.length) {
            listaVehiculos.innerHTML = MR.htmlVacio('moon', 'No hay unidades en circulación en esta ruta en este momento.');
            return;
        }
        listaVehiculos.innerHTML = vehiculos.map((v) => `
            <div class="d-flex align-items-center gap-3 py-2 border-bottom">
                <div class="mr-marcador-vehiculo flex-shrink-0" style="--color:${MR.esc(v.ruta_color)}${v.con_ubicacion ? '' : ';opacity:.45'}"><i class="bi bi-bus-front-fill"></i></div>
                <div class="flex-grow-1">
                    <div class="fw-semibold">Unidad ${MR.esc(v.unidad)}</div>
                    <div class="small text-secondary">${MR.estadoVehiculo(v)}</div>
                </div>
                ${v.con_ubicacion ? `<button class="btn btn-sm btn-secondary" type="button" data-enfocar="${v.vehiculo_id}">Ver en mapa</button>` : ''}
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
            mapa.setView([parada.latitud, parada.longitud], Math.max(mapa.getZoom(), 15));
            dibujo.marcadores.get(paradaId)?.openPopup();
        }
        panelEta.innerHTML = `<div class="small text-secondary"><span class="spinner-border spinner-border-sm"></span> Calculando para ${MR.esc(parada.nombre)}…</div>`;

        const consultar = async () => {
            if (paradaActual !== paradaId) return;
            try {
                const datos = await MR.api('eta.php', { parada_id: paradaId, ruta_id: rutaId });
                panelEta.innerHTML = `
                    <div class="d-flex justify-content-between align-items-start mb-2 gap-2">
                        <div><div class="fw-semibold">${MR.esc(parada.nombre)}</div>
                             ${parada.referencia ? `<div class="small text-secondary">${MR.esc(parada.referencia)}</div>` : ''}</div>
                        <a class="small text-nowrap" href="${MR.url('parada.php?id=' + paradaId)}">Otras rutas aquí</a>
                    </div>` + MR.htmlLlegadas(datos.rutas, { sinEncabezado: true });
            } catch (e) {
                panelEta.innerHTML = `<div class="small text-danger">${MR.esc(e.message)}</div>`;
            }
        };
        if (sondeoEta) sondeoEta.reiniciar(consultar); else sondeoEta = MR.sondeo(consultar);
    }

    lista.addEventListener('click', (e) => {
        const li = e.target.closest('li[data-parada]');
        if (li) seleccionarParada(Number(li.dataset.parada));
    });

    if (detalle.parada_inicial) seleccionarParada(detalle.parada_inicial);
})();
