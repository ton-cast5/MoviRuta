/** Viaje actual del chofer: recorrido de la ruta y posición de su unidad. */
(() => {
    const contenedor = document.getElementById('mapa');
    const rutaId = Number(contenedor.dataset.ruta);
    const vehiculoId = Number(contenedor.dataset.vehiculo);
    const mapa = MR.crearMapa('mapa');
    const capaVehiculos = MR.capaVehiculos(mapa);
    const indicador = MR.indicador(document.getElementById('indicador'));
    const estado = document.getElementById('estadoUbicacion');

    MR.api('rutas.php', { id: rutaId }).then((d) => MR.dibujarRuta(mapa, d)).catch(() => {});

    MR.sondeo(async () => {
        indicador.cargando();
        try {
            const datos = await MR.api('vehiculos.php', { rutas: rutaId });
            const propio = datos.vehiculos.filter((v) => v.vehiculo_id === vehiculoId);
            capaVehiculos.actualizar(propio);
            estado.innerHTML = propio.length ? MR.estadoVehiculo(propio[0]) : 'No hay información de ubicación disponible';
            indicador.listo(datos.datos_demostracion);
        } catch (e) {
            indicador.error();
        }
    });
})();
