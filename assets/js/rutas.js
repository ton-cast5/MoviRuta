/** Lista de rutas con búsqueda instantánea, filtro por línea y por accesibilidad. */
(() => {
    const { esc, icono, T } = MR;
    const S = MRServicios;
    const $ = (id) => document.getElementById(id);
    const campo = $('q');
    const selectLinea = $('linea');
    const accesibles = $('soloAccesibles');
    const lista = $('listaRutas');

    S.gestion.lineas(null, true).forEach((l) => selectLinea.insertAdjacentHTML('beforeend', `<option value="${l.id}">${esc(l.nombre)}</option>`));
    campo.value = MR.parametro('q') || '';
    selectLinea.value = MR.parametro('linea') || '';
    accesibles.checked = MR.parametro('accesible') === '1';

    function tarjeta(r, i) {
        return `
            <a href="${MR.url('ruta.html?id=' + r.id)}" class="mr-tarjeta mr-tarjeta-interactiva group flex flex-col overflow-hidden mr-anim-subir" style="--retraso:${Math.min(i, 12) * 55}ms">
                <div class="h-1.5 transition-all duration-500 group-hover:h-2" style="background:${esc(r.color)}"></div>
                <div class="flex flex-1 flex-col p-5">
                    <div class="flex items-start gap-3">
                        ${MR.insigniaRuta(r, 'lg')}
                        <div class="min-w-0 flex-1">
                            <h2 class="font-headline-sm text-headline-sm text-on-surface transition-colors group-hover:text-primary">${esc(r.nombre)}</h2>
                            <p class="text-sm text-on-surface-variant">${esc(r.linea)}</p>
                        </div>
                        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-primary transition-all duration-300 group-hover:translate-x-1 group-hover:bg-primary group-hover:text-white">${icono('arrow_forward', 'text-[20px]')}</span>
                    </div>
                    <div class="mt-4 flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2.5 text-sm">
                        ${icono('trip_origin', 'text-[16px] text-secondary')}<span class="truncate font-medium">${esc(r.origen)}</span>
                        <span class="mx-1 h-px min-w-[1.5rem] flex-1 border-t-2 border-dashed border-outline-variant"></span>
                        ${icono('location_on', 'relleno text-[16px] text-error')}<span class="truncate font-medium">${esc(r.destino)}</span>
                    </div>
                    ${r.aviso ? `<p class="mt-3 flex items-start gap-1.5 text-xs text-aviso">${icono('campaign', 'text-[16px]')}<span>${esc(r.aviso)}</span></p>` : ''}
                    <div class="mt-auto flex flex-wrap items-center gap-2 pt-4">
                        <span class="mr-etiqueta">${icono('sync_alt')} ${esc(r.sentido)}</span>
                        <span class="mr-etiqueta">${icono('location_on')} ${r.total_paradas} paradas</span>
                        <span class="mr-etiqueta">${icono('payments')} ${esc(r.tarifa_texto)}</span>
                        ${MR.estadoHtml(r.estado_servicio, r.estado_texto)}
                    </div>
                </div>
            </a>`;
    }

    function pintar() {
        const q = campo.value.trim();
        const lineaId = selectLinea.value;
        const lineasAccesibles = new Set(S.consulta.lineasTotalmenteAccesibles());
        let rutas = S.api('rutas', { q, linea_id: lineaId }).rutas;
        if (accesibles.checked) {
            const idsAccesibles = new Set(S.consulta.rutasPublicas().filter((r) => lineasAccesibles.has(r.linea_id)).map((r) => r.id));
            rutas = rutas.filter((r) => idsAccesibles.has(r.id));
        }
        const filtrado = q || lineaId || accesibles.checked;
        $('limpiar').classList.toggle('hidden', !filtrado);
        $('limpiar').classList.toggle('inline-flex', !!filtrado);
        $('resumen').innerHTML = filtrado
            ? `<strong class="text-on-surface">${rutas.length}</strong> resultado(s) para tu búsqueda.`
            : `<strong class="text-on-surface">${rutas.length}</strong> rutas activas en <strong class="text-on-surface">${selectLinea.options.length - 1}</strong> líneas de transporte.`;
        lista.innerHTML = rutas.length
            ? rutas.map(tarjeta).join('')
            : `<div class="mr-tarjeta mr-anim-escala md:col-span-2 xl:col-span-3">${MR.htmlVacio('signpost', 'No encontramos rutas con esa búsqueda.',
                '<button type="button" class="mr-btn mr-btn-contorno mr-btn-sm mt-2" data-limpiar>Mostrar todas las rutas</button>')}</div>`;

        const parametros = new URLSearchParams();
        if (q) parametros.set('q', q);
        if (lineaId) parametros.set('linea', lineaId);
        if (accesibles.checked) parametros.set('accesible', '1');
        history.replaceState(null, '', `${location.pathname}${parametros.toString() ? '?' + parametros : ''}`);
    }

    function limpiar() {
        campo.value = '';
        selectLinea.value = '';
        accesibles.checked = false;
        pintar();
        campo.focus();
    }

    let espera = null;
    campo.addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(pintar, 180); });
    selectLinea.addEventListener('change', pintar);
    accesibles.addEventListener('change', pintar);
    $('formRutas').addEventListener('submit', (e) => { e.preventDefault(); pintar(); });
    $('limpiar').addEventListener('click', limpiar);
    lista.addEventListener('click', (e) => { if (e.target.closest('[data-limpiar]')) limpiar(); });
    pintar();
})();
