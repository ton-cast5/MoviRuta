/** Ubicación de una parada: clic en el mapa para colocarla y arrastre para ajustarla. */
(() => {
    const lat = document.getElementById('latitud');
    const lng = document.getElementById('longitud');
    const estado = document.getElementById('estadoUbicacion');
    const mapa = MR.crearMapa('mapa');
    let marcador = null;

    function colocar(latlng) {
        lat.value = latlng.lat.toFixed(6);
        lng.value = latlng.lng.toFixed(6);
        if (marcador) marcador.setLatLng(latlng);
        else {
            marcador = L.marker(latlng, { icon: MR.iconoParada('#059669', true), draggable: true }).addTo(mapa);
            marcador.on('dragend', () => colocar(marcador.getLatLng()));
        }
        estado.innerHTML = '<span class="text-success"><i class="bi bi-check-circle"></i> Ubicación marcada. Arrastra el marcador para ajustarla.</span>';
    }

    if (lat.value && lng.value) {
        const inicial = L.latLng(parseFloat(lat.value), parseFloat(lng.value));
        colocar(inicial);
        mapa.setView(inicial, 16);
    }
    mapa.on('click', (e) => colocar(e.latlng));
})();
