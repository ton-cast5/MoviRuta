/** Panel del pasajero: resumen y accesos a la consulta pública. */
(() => {
    if (!MRUI.permitido) return;
    const S = MRServicios;
    const { esc, icono } = MR;
    const P = MRP;
    const u = MRUI.usuario;
    if (!u) return;

    if (P.seccion === 'historial') {
        MRUI.tituloPanel('Consultas', 'El historial de búsquedas ya no se guarda. Usa el buscador o las paradas frecuentes del panel.');
        P.vista.innerHTML = `<div class="mr-tarjeta p-6">${MR.htmlVacio('manage_search', 'El historial quedó desactivado.',
            `<a class="mr-btn mr-btn-primario mt-3" href="${MR.url('index.html')}">${icono('search')} Buscar trayecto</a>
             <a class="mr-btn mr-btn-contorno mt-3" href="${MR.url('pasajero/index.html')}">${icono('dashboard')} Ir a mi panel</a>`)}</div>`;
        return;
    }

    if (P.seccion !== 'inicio') return;

    const rutas = S.consulta.rutasPublicas();
    const paradas = S.consulta.paradasPublicas();
    const avisos = S.consulta.conAvisos ? S.consulta.conAvisos() : rutas.filter((r) => r.aviso);
    const frecuentes = (S.consulta.frecuentes ? S.consulta.frecuentes(6) : paradas.slice(0, 6));

    MRUI.tituloPanel(
        `Hola, ${u.nombre.split(' ')[0]}`,
        'Consulta rutas, paradas y unidades en vivo. Usa el menú o los accesos de abajo.',
    );

    P.vista.innerHTML = `
        <div class="grid grid-cols-2 gap-4 xl:grid-cols-4">
            ${P.estadistica('Rutas activas', rutas.length, 'route', MR.url('rutas.html'), 0)}
            ${P.estadistica('Paradas', paradas.length, 'location_on', MR.url('paradas.html'), 50)}
            ${P.estadistica('Buscar trayecto', '→', 'search', MR.url('index.html'), 100)}
            ${P.estadistica('Mapa en vivo', '→', 'map', MR.url('mapa.html'), 150)}
        </div>

        <section class="mt-8 mr-revelar">
            <h2 class="mb-3 flex items-center gap-2 font-headline-sm text-headline-sm">${icono('bolt', 'text-secondary')} Accesos rápidos</h2>
            <div class="grid gap-3 sm:grid-cols-2">
                <a class="mr-tarjeta mr-tarjeta-interactiva flex items-center gap-3 p-4" href="${MR.url('index.html')}">
                    <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">${icono('search')}</span>
                    <span><strong class="block">Planificar trayecto</strong><span class="text-sm text-on-surface-variant">Origen, destino y transbordos</span></span>
                </a>
                <a class="mr-tarjeta mr-tarjeta-interactiva flex items-center gap-3 p-4" href="${MR.url('mapa.html')}">
                    <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">${icono('map')}</span>
                    <span><strong class="block">Mapa en vivo</strong><span class="text-sm text-on-surface-variant">Unidades en circulación</span></span>
                </a>
                <a class="mr-tarjeta mr-tarjeta-interactiva flex items-center gap-3 p-4" href="${MR.url('paradas.html?cerca=1')}">
                    <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">${icono('near_me')}</span>
                    <span><strong class="block">Paradas cercanas</strong><span class="text-sm text-on-surface-variant">Según tu ubicación</span></span>
                </a>
                <a class="mr-tarjeta mr-tarjeta-interactiva flex items-center gap-3 p-4" href="${MR.url('rutas.html')}">
                    <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">${icono('route')}</span>
                    <span><strong class="block">Rutas y tarifas</strong><span class="text-sm text-on-surface-variant">Estudiantil, general e INAPAM</span></span>
                </a>
            </div>
        </section>

        ${avisos.length ? `
        <section class="mt-8 mr-revelar">
            <h2 class="mb-3 flex items-center gap-2 font-headline-sm text-headline-sm">${icono('campaign', 'text-secondary')} Avisos del servicio</h2>
            <div class="flex flex-col gap-3">${avisos.slice(0, 5).map((r, i) => `
                <a class="mr-tarjeta block p-4 mr-anim-subir" style="--retraso:${i * 40}ms" href="${MR.url('ruta.html?id=' + encodeURIComponent(r.id))}">
                    <div class="flex items-center gap-2">${MR.insigniaRuta(r, 'sm')}<strong>${esc(r.nombre)}</strong></div>
                    <p class="mt-2 text-sm text-on-surface-variant">${esc(r.aviso)}</p>
                </a>`).join('')}
            </div>
        </section>` : ''}

        <section class="mt-8 mr-revelar">
            <div class="mb-3 flex items-center justify-between gap-2">
                <h2 class="flex items-center gap-2 font-headline-sm text-headline-sm">${icono('location_on', 'text-secondary')} Paradas frecuentes</h2>
                <a class="mr-enlace text-sm" href="${MR.url('paradas.html')}">Ver todas</a>
            </div>
            ${frecuentes.length ? `<div class="grid gap-2 sm:grid-cols-2">${frecuentes.map((p, i) => `
                <a class="mr-tarjeta mr-tarjeta-interactiva flex items-center gap-3 p-3 mr-anim-subir" style="--retraso:${i * 40}ms" href="${MR.url('parada.html?id=' + encodeURIComponent(p.id))}">
                    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-container/40 text-secondary">${icono('location_on', 'text-[20px]')}</span>
                    <span class="min-w-0"><strong class="block truncate">${esc(p.nombre)}</strong>
                    <span class="text-xs text-on-surface-variant">${p.codigo ? `#${esc(p.codigo)}` : ''}${p.referencia ? ` · ${esc(p.referencia)}` : ''}</span></span>
                </a>`).join('')}</div>` : `<div class="mr-tarjeta">${MR.htmlVacio('location_off', 'Aún no hay paradas publicadas.')}</div>`}
        </section>

        <p class="mt-6 text-sm text-on-surface-variant">Sesión de <strong>${esc(u.nombre)} ${esc(u.apellido || '')}</strong>${u.email ? ` · ${esc(u.email)}` : ''}.</p>`;
})();
