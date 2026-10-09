/** Panel del pasajero: accesos rápidos e historial de consultas. */
(() => {
    const u = MRUI.usuario;
    if (!u) return;
    const S = MRServicios;
    const { esc, icono, T } = MR;
    const P = MRP;

    function htmlHistorial(items) {
        if (!items.length) {
            return MR.htmlVacio('history', 'Aún no has consultado rutas ni paradas. Las que consultes aparecerán aquí.',
                `<a class="mr-btn mr-btn-primario mt-3" href="${MR.url('index.html')}">${icono('search')} Buscar una ruta</a>`);
        }
        return `<ul class="flex flex-col gap-1">${items.map((h, i) => {
            const fecha = `<span class="whitespace-nowrap text-xs text-on-surface-variant">${esc(T.formatoFecha(h.consultado_en))}</span>`;
            const clase = 'group flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-surface-container-low';
            const contenido = h.ruta ? `
                <a class="${clase}" href="${MR.url(`ruta.html?id=${h.ruta.id}${h.parada ? `&parada=${h.parada.id}` : ''}`)}">
                    ${MR.insigniaRuta(h.ruta, 'sm')}
                    <span class="min-w-0 flex-1">
                        <span class="font-semibold text-on-surface group-hover:text-primary">Ruta ${esc(h.ruta.nombre)}</span>
                        <span class="text-sm text-on-surface-variant">(${esc(T.textoSentido(h.ruta.sentido))})</span>
                        ${h.parada ? `<span class="block text-xs text-on-surface-variant">Parada ${esc(h.parada.nombre)}</span>` : ''}
                    </span>${fecha}
                </a>` : `
                <a class="${clase}" href="${MR.url('parada.html?id=' + h.parada.id)}">
                    <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary-container/60 text-on-secondary-container">${icono('location_on', 'text-[18px] relleno')}</span>
                    <span class="min-w-0 flex-1">
                        <span class="font-semibold text-on-surface group-hover:text-primary">Parada ${esc(h.parada.nombre)}</span>
                        ${h.parada.referencia ? `<span class="block truncate text-xs text-on-surface-variant">${esc(h.parada.referencia)}</span>` : ''}
                    </span>${fecha}
                </a>`;
            return `<li class="mr-anim-subir" style="--retraso:${Math.min(i, 15) * 40}ms">${contenido}</li>`;
        }).join('')}</ul>`;
    }

    if (P.seccion === 'inicio') {
        MRUI.tituloPanel(`Hola, ${u.nombre.split(' ')[0]}`, '¿A dónde vas hoy? Planea tu viaje o retoma una consulta reciente.');
        const accesos = [
            ['Buscar ruta', 'Origen y destino', 'index.html', 'search'],
            ['Paradas cercanas', 'Usa tu ubicación', 'paradas.html?cerca=1', 'near_me'],
            ['Rutas', 'Consulta recorridos', 'rutas.html', 'route'],
            ['Mapa', 'Vehículos en circulación', 'mapa.html', 'map'],
        ];
        const avisos = S.consulta.conAvisos();
        P.vista.innerHTML = `
            <div class="grid grid-cols-2 gap-4 xl:grid-cols-4">
                ${accesos.map(([texto, sub, destino, ic], i) => `
                    <a class="mr-tarjeta mr-tarjeta-interactiva group flex flex-col gap-3 p-5 mr-anim-subir" style="--retraso:${i * 70}ms" href="${MR.url(destino)}">
                        <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-md transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">${icono(ic)}</span>
                        <span><span class="block font-semibold text-on-surface">${esc(texto)}</span><span class="text-sm text-on-surface-variant">${esc(sub)}</span></span>
                    </a>`).join('')}
            </div>
            <div class="mt-6 grid gap-6 xl:grid-cols-3">
                <section class="mr-tarjeta p-5 xl:col-span-2 mr-revelar">
                    <div class="mb-3 flex items-center justify-between gap-2">
                        <h2 class="flex items-center gap-2 font-headline-sm text-headline-sm">${icono('history', 'text-secondary')} Consultas recientes</h2>
                        <a class="mr-enlace text-sm" href="${P.enlace('historial')}">Ver historial completo</a>
                    </div>
                    ${htmlHistorial(S.historial.listar(u.id, 5))}
                </section>
                <section class="mr-tarjeta p-5 mr-revelar" style="--retraso:120ms">
                    <h2 class="mb-3 flex items-center gap-2 font-headline-sm text-headline-sm">${icono('campaign', 'text-secondary')} Avisos del servicio</h2>
                    ${avisos.length ? `<ul class="flex flex-col gap-3">${avisos.map((r) => `
                        <li><a class="flex gap-3 rounded-lg p-2 transition-colors hover:bg-surface-container-low" href="${MR.url('ruta.html?id=' + r.id)}">
                            ${MR.insigniaRuta(r, 'sm')}
                            <span class="min-w-0 flex-1 text-sm">
                                <span class="flex flex-wrap items-center gap-2 font-semibold">${esc(r.nombre)} ${MR.estadoHtml(r.estado_servicio)}</span>
                                ${r.aviso ? `<span class="mt-1 block text-on-surface-variant">${esc(r.aviso)}</span>` : ''}
                            </span>
                        </a></li>`).join('')}</ul>` : MR.htmlVacio('verified', 'Todas las rutas operan con normalidad.')}
                </section>
            </div>`;
    }

    if (P.seccion === 'historial') {
        const pintar = () => {
            const items = S.historial.listar(u.id, 100);
            P.vista.innerHTML = `
                ${P.encabezado('Historial de consultas', `${items.length} consulta(s) guardada(s) en este navegador.`,
                    items.length ? `<button class="mr-btn mr-btn-peligro" type="button" id="btnBorrar">${icono('delete')} Borrar historial</button>` : '')}
                <div class="mr-tarjeta p-3 md:p-4">${htmlHistorial(items)}</div>`;
            document.getElementById('btnBorrar')?.addEventListener('click', async () => {
                const ok = await MRUI.confirmar({
                    titulo: '¿Borrar tu historial?', mensaje: 'Se eliminarán todas las rutas y paradas que consultaste. Esta acción no se puede deshacer.',
                    aceptar: 'Borrar historial', peligro: true, icono: 'delete',
                });
                if (!ok) return;
                if (S.historial.borrar(u.id)) MRUI.aviso('Tu historial de consultas se borró.');
                else MRUI.aviso('No se pudo borrar tu historial. Intenta de nuevo.', 'advertencia');
                pintar();
            });
        };
        pintar();
    }
})();
