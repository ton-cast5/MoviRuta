/** Lista de paradas: mapa con todas las paradas y búsqueda de paradas cercanas al usuario (RF-09). */
(() => {
    const paradas = JSON.parse(document.getElementById('datosParadas').textContent);
    const mapa = MR.crearMapa('mapa');
    const marcadores = new Map();
    const grupo = L.featureGroup().addTo(mapa);
    const btn = document.getElementById('btnCercanas');
    const mensaje = document.getElementById('mensajeCercanas');
    const seccionCercanas = document.getElementById('cercanas');
    const listaCercanas = document.getElementById('listaCercanas');
    const listaGeneral = document.getElementById('listaParadas');

    paradas.forEach((p) => {
        marcadores.set(p.id, L.marker([p.latitud, p.longitud], { icon: MR.iconoParada('#059669'), title: p.nombre })
            .bindPopup(MR.popupParada(p)).addTo(grupo));
    });
    if (paradas.length) mapa.fitBounds(grupo.getBounds(), { padding: [20, 20] });

    // Al pasar sobre una parada de la lista se resalta en el mapa.
    listaGeneral.addEventListener('mouseover', (e) => {
        const item = e.target.closest('[data-parada]');
        if (item) marcadores.get(Number(item.dataset.parada))?.openPopup();
    });

    async function buscarCercanas() {
        const etiqueta = btn.querySelector('span');
        btn.disabled = true;
        etiqueta.textContent = 'Obteniendo tu ubicación…';
        mensaje.textContent = '';
        try {
            const pos = await MR.ubicarUsuario();
            MR.mostrarUsuario(mapa, pos);
            const { paradas: cercanas } = await MR.api('paradas.php', { lat: pos.lat.toFixed(6), lng: pos.lng.toFixed(6) });
            seccionCercanas.classList.remove('d-none');
            listaGeneral.classList.add('d-none');
            if (!cercanas.length) {
                listaCercanas.innerHTML = MR.htmlVacio('geo-alt', 'No encontramos paradas cerca de tu ubicación. Revisa el mapa o busca por nombre.');
                mapa.setView([pos.lat, pos.lng], 15);
                return;
            }
            listaCercanas.innerHTML = cercanas.map((p) => `
                <a class="mr-resultado" href="${MR.url('parada.php?id=' + p.id)}">
                    <div class="d-flex justify-content-between gap-2">
                        <div><h3 class="mr-resultado-titulo">${MR.esc(p.nombre)}</h3>
                             ${p.referencia ? `<div class="small text-secondary">${MR.esc(p.referencia)}</div>` : ''}</div>
                        <span class="mr-etiqueta text-nowrap"><i class="bi bi-person-walking"></i> ${MR.esc(p.distancia_texto)}</span>
                    </div>
                    <div class="d-flex flex-wrap gap-1 mt-2">${p.rutas.map((r) => MR.insigniaRuta(r, true)).join('')}</div>
                    <div class="small text-secondary mt-1">${p.rutas.map((r) => `Ruta ${MR.esc(r.codigo)} hacia ${MR.esc(r.destino)}`).join(' · ')}</div>
                </a>`).join('');
            const limites = L.latLngBounds(cercanas.map((p) => [p.latitud, p.longitud])).extend([pos.lat, pos.lng]);
            mapa.fitBounds(limites, { padding: [40, 40], maxZoom: 16 });
        } catch (e) {
            mensaje.innerHTML = `<span class="text-danger">${MR.esc(e.message)}</span>`;
        } finally {
            btn.disabled = false;
            etiqueta.textContent = 'Paradas cerca de mí';
        }
    }

    btn.addEventListener('click', buscarCercanas);
    document.getElementById('btnQuitarCercanas').addEventListener('click', () => {
        seccionCercanas.classList.add('d-none');
        listaGeneral.classList.remove('d-none');
        if (paradas.length) mapa.fitBounds(grupo.getBounds(), { padding: [20, 20] });
    });
    if (btn.dataset.auto === '1') buscarCercanas();
})();
