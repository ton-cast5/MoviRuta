/** Panel del pasajero: accesos rápidos a consulta pública. */
(() => {
    if (!MRUI.permitido) return;
    const S = MRServicios;
    const { esc, icono } = MR;
    const P = MRPanel;
    const u = MRUI.usuario;
    if (!u || P.seccion !== 'inicio') return;

    const destino = document.getElementById('contenido');
    if (!destino) return;
    destino.innerHTML = `
        <div class="grid gap-4 sm:grid-cols-2">
            <a class="mr-stat" href="${MR.url('index.html')}">
                <span class="mr-stat-icono">${icono('search')}</span>
                <p class="mr-stat-valor text-lg">Buscar ruta</p>
                <p class="mr-stat-etiqueta">Planifica tu trayecto</p>
            </a>
            <a class="mr-stat" href="${MR.url('mapa.html')}">
                <span class="mr-stat-icono">${icono('map')}</span>
                <p class="mr-stat-valor text-lg">Mapa en vivo</p>
                <p class="mr-stat-etiqueta">Unidades en tiempo real</p>
            </a>
            <a class="mr-stat" href="${MR.url('paradas.html?cerca=1')}">
                <span class="mr-stat-icono">${icono('near_me')}</span>
                <p class="mr-stat-valor text-lg">Paradas cercanas</p>
                <p class="mr-stat-etiqueta">Según tu ubicación</p>
            </a>
            <a class="mr-stat" href="${MR.url('rutas.html')}">
                <span class="mr-stat-icono">${icono('route')}</span>
                <p class="mr-stat-valor text-lg">Rutas y líneas</p>
                <p class="mr-stat-etiqueta">Consulta tarifas y recorridos</p>
            </a>
        </div>
        <p class="mt-6 text-sm text-on-surface-variant">Hola, <strong>${esc(u.nombre)} ${esc(u.apellido || '')}</strong>. Usa el menú para moverte por MoviRuta.</p>`;
})();
