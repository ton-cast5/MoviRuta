/** Detalle de parada: rutas que pasan, vehículos próximos y ETA por ruta (RF-11). */
(() => {
    const { parada, rutas } = JSON.parse(document.getElementById('datosParada').textContent);
    const mapa = MR.crearMapa('mapa');
    const capaVehiculos = MR.capaVehiculos(mapa);
    const indicador = MR.indicador(document.getElementById('indicador'));
    const llegadas = document.getElementById('llegadas');

    mapa.setView([parada.latitud, parada.longitud], 15);

    // Trazados de las rutas que pasan por la parada, con la parada actual destacada.
    Promise.all(rutas.map((id) => MR.api('rutas.php', { id }).catch(() => null))).then((detalles) => {
        const grupos = detalles.filter(Boolean).map((d) => MR.dibujarRuta(mapa, d, { ajustar: false, destacadas: [parada.id] }).grupo);
        const marcador = L.marker([parada.latitud, parada.longitud], { icon: MR.iconoParada('#065F46', true), zIndexOffset: 500 })
            .bindPopup(`<strong>${MR.esc(parada.nombre)}</strong>`).addTo(mapa);
        if (grupos.length) {
            const limites = L.featureGroup(grupos).getBounds();
            mapa.fitBounds(limites, { padding: [30, 30] });
        }
        marcador.openPopup();
    });

    if (!rutas.length) {
        llegadas.innerHTML = MR.htmlVacio('signpost', 'Ninguna ruta activa pasa por esta parada.');
        indicador.listo(false);
        return;
    }

    MR.sondeo(async () => {
        indicador.cargando();
        try {
            const [eta, vehiculos] = await Promise.all([
                MR.api('eta.php', { parada_id: parada.id }),
                MR.api('vehiculos.php', { rutas: rutas.join(',') }),
            ]);
            llegadas.innerHTML = MR.htmlLlegadas(eta.rutas);
            capaVehiculos.actualizar(vehiculos.vehiculos);
            indicador.listo(eta.datos_demostracion);
        } catch (e) {
            indicador.error();
            if (llegadas.querySelector('.spinner-border')) {
                llegadas.innerHTML = MR.htmlVacio('exclamation-circle', e.message);
            }
        }
    });
})();
