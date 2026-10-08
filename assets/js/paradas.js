/** Lista de paradas: búsqueda instantánea, mapa con todas las paradas y paradas cercanas al usuario. */
(() => {
    const { esc, icono } = MR;
    const S = MRServicios;
    const $ = (id) => document.getElementById(id);
    const campo = $('q');
    const btn = $('btnCercanas');
    const mensaje = $('mensajeCercanas');
    const listaGeneral = $('listaParadas');
    const mapa = MR.crearMapa('mapa');
    const grupo = L.featureGroup().addTo(mapa);
    const marcadores = new Map();
    const todas = S.api('paradas').paradas;

    todas.forEach((p) => {
        marcadores.set(p.id, L.marker([p.latitud, p.longitud], { icon: MR.iconoParada('#006c49'), title: p.nombre })
            .bindPopup(MR.popupParada(p, `<br><span style="font-size:12px">Parada #${esc(p.codigo)}</span>`)).addTo(grupo));
    });
    const encuadrar = () => { if (grupo.getLayers().length) mapa.flyToBounds(grupo.getBounds(), { padding: [30, 30], duration: 0.8 }); };
    if (todas.length) mapa.fitBounds(grupo.getBounds(), { padding: [30, 30] });

    const insignias = (rutas) => MR.insigniasRutas(rutas, 'sm');

    function tarjeta(p, i, extra = '') {
        return `
            <a class="mr-tarjeta mr-tarjeta-interactiva group block p-4 mr-anim-subir" style="--retraso:${Math.min(i, 14) * 40}ms" href="${MR.url('parada.html?id=' + p.id)}" data-parada="${p.id}">
                <div class="flex items-start gap-3">
                    <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-container/40 text-secondary transition-colors group-hover:bg-primary group-hover:text-secondary-container">${icono('location_on', 'relleno text-[22px]')}</span>
                    <div class="min-w-0 flex-1">
                        <div class="flex items-start justify-between gap-2">
                            <h2 class="font-semibold text-on-surface group-hover:text-primary">${esc(p.nombre)}</h2>
                            ${extra || `<span class="shrink-0 rounded bg-surface-container px-1.5 py-0.5 text-[10px] font-bold text-on-surface-variant">#${esc(p.codigo)}</span>`}
                        </div>
                        ${p.referencia ? `<p class="text-xs text-on-surface-variant">${esc(p.referencia)}</p>` : ''}
                        <div class="mt-2 flex flex-wrap gap-1">${insignias(p.rutas)}</div>
                    </div>
                    ${icono('chevron_right', 'text-[20px] text-outline transition-transform group-hover:translate-x-1')}
                </div>
            </a>`;
    }

    function pintar() {
        const q = campo.value.trim();
        const paradas = q ? S.api('paradas', { q }).paradas : todas;
        $('resumen').innerHTML = q
            ? `<strong class="text-on-surface">${paradas.length}</strong> parada(s) coinciden con tu búsqueda.`
            : `<strong class="text-on-surface">${paradas.length}</strong> paradas con servicio. Pasa el cursor sobre una para ubicarla en el mapa.`;
        listaGeneral.innerHTML = paradas.length
            ? paradas.map((p, i) => tarjeta(p, i)).join('')
            : `<div class="mr-tarjeta">${MR.htmlVacio('wrong_location', 'No encontramos paradas con esa búsqueda.')}</div>`;
        history.replaceState(null, '', `${location.pathname}${q ? '?q=' + encodeURIComponent(q) : ''}`);
        if (q && paradas.length) {
            const visibles = paradas.map((p) => [p.latitud, p.longitud]);
            mapa.flyToBounds(L.latLngBounds(visibles), { padding: [50, 50], maxZoom: 16, duration: 0.7 });
        }
    }

    listaGeneral.addEventListener('mouseover', (e) => {
        const item = e.target.closest('[data-parada]');
        if (item) marcadores.get(Number(item.dataset.parada))?.openPopup();
    });

    async function buscarCercanas() {
        const etiqueta = btn.querySelector('span:last-child');
        btn.disabled = true;
        etiqueta.textContent = 'Obteniendo tu ubicación…';
        mensaje.textContent = '';
        try {
            const pos = await MR.ubicarUsuario();
            MR.mostrarUsuario(mapa, pos);
            const { paradas: cercanas } = await MR.api('paradas', { lat: pos.lat.toFixed(6), lng: pos.lng.toFixed(6) });
            $('cercanas').classList.remove('hidden');
            $('todas').classList.add('hidden');
            if (!cercanas.length) {
                $('listaCercanas').innerHTML = `<div class="mr-tarjeta">${MR.htmlVacio('location_off', 'No encontramos paradas cerca de tu ubicación. Revisa el mapa o busca por nombre.')}</div>`;
                mapa.flyTo([pos.lat, pos.lng], 15, { duration: 0.8 });
                return;
            }
            $('listaCercanas').innerHTML = cercanas.map((p, i) => tarjeta(p, i,
                `<span class="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white">${icono('directions_walk', 'text-[14px]')} ${esc(p.distancia_texto)}</span>`)).join('');
            const limites = L.latLngBounds(cercanas.map((p) => [p.latitud, p.longitud])).extend([pos.lat, pos.lng]);
            mapa.flyToBounds(limites, { padding: [50, 50], maxZoom: 16, duration: 0.9 });
        } catch (e) {
            mensaje.innerHTML = `<p class="flex items-start gap-1.5 text-error">${icono('error', 'text-[18px]')}<span>${esc(e.message)}</span></p>`;
        } finally {
            btn.disabled = false;
            etiqueta.textContent = 'Paradas cerca de mí';
        }
    }

    let espera = null;
    campo.value = MR.parametro('q') || '';
    campo.addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(pintar, 180); });
    $('formParadas').addEventListener('submit', (e) => { e.preventDefault(); pintar(); });
    btn.addEventListener('click', buscarCercanas);
    $('btnQuitarCercanas').addEventListener('click', () => {
        $('cercanas').classList.add('hidden');
        $('todas').classList.remove('hidden');
        encuadrar();
    });
    const cercaAlAbrir = MR.parametro('cerca') !== null;
    pintar();
    if (cercaAlAbrir) buscarCercanas();
})();
