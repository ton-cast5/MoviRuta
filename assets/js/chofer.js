/** Panel del chofer: perfil, inicio y fin de viajes, viaje actual en el mapa e historial. */
(() => {
    const u = MRUI.usuario;
    if (!u) return;
    const S = MRServicios;
    const { esc, icono, T } = MR;
    const P = MRP;
    const chofer = S.chofer.deUsuario(u.id);

    if (!chofer) {
        P.vista.innerHTML = `<div class="mr-tarjeta mr-anim-escala">${MR.htmlVacio('link_off', 'Tu cuenta de chofer aún no está asociada a una línea. Comunícate con el dueño de tu línea.')}</div>`;
        return;
    }

    const estadoViaje = (estado) => ({
        en_curso: `<span class="mr-estado normal">${icono('sensors')}En curso</span>`,
        cancelado: `<span class="mr-estado suspendido">${icono('cancel')}Cancelado</span>`,
    }[estado] || `<span class="mr-etiqueta">${icono('task_alt')}Finalizado</span>`);

    function tablaViajes(viajes) {
        if (!viajes.length) return `<div class="mr-tarjeta">${MR.htmlVacio('event_busy', 'No hay viajes registrados en este periodo.')}</div>`;
        return P.tabla(['Fecha', 'Ruta', 'Unidad', 'Inicio', 'Fin', 'Duración', 'Estado'], viajes.map((v) => `
            <tr>
                <td class="whitespace-nowrap">${esc(T.formatoFecha(v.inicio, false))}</td>
                <td><span class="flex items-center gap-2">${MR.insigniaRuta({ codigo: v.ruta_codigo, color: v.ruta_color }, 'sm')}<span>${esc(v.ruta_nombre)} <span class="text-xs text-on-surface-variant">(${esc(T.textoSentido(v.ruta_sentido))})</span></span></span></td>
                <td class="font-semibold">${esc(v.numero_unidad)}</td>
                <td>${esc(T.hora24(v.inicio))}</td>
                <td>${v.fin ? esc(T.hora24(v.fin)) : '—'}</td>
                <td class="whitespace-nowrap">${esc(T.formatoDuracion(v.inicio, v.fin))}</td>
                <td>${estadoViaje(v.estado)}</td>
            </tr>`));
    }

    const hace30 = () => { const d = new Date(); d.setDate(d.getDate() - 30); return T.fechaISO(d); };
    const hoy = () => T.fechaISO(new Date());

    /* ---------- Mi perfil ---------- */
    if (P.seccion === 'inicio') {
        MRUI.tituloPanel(`Hola, ${u.nombre.split(' ')[0]}`, `Chofer de ${chofer.linea}. Inicia tu viaje y los pasajeros verán tu unidad en el mapa.`);
        const viaje = S.chofer.viajeEnCurso(chofer.id);
        const recientes = S.chofer.historial(chofer.id, hace30(), hoy()).slice(0, 5);
        const dato = (etiqueta, valor) => `<div class="mr-dato">${esc(etiqueta)}<strong>${valor}</strong></div>`;
        P.vista.innerHTML = `
            <div class="grid gap-6 md:grid-cols-2">
                <section class="mr-tarjeta p-5 mr-anim-subir">
                    <div class="mb-4 flex items-center gap-3">
                        <span class="mr-avatar h-14 w-14 text-lg">${esc(MRUI.iniciales(chofer.nombre))}</span>
                        <div><h2 class="font-headline-sm text-headline-sm">${esc(chofer.nombre)}</h2><p class="text-sm text-on-surface-variant">${esc(chofer.email)}</p></div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        ${dato('Línea', esc(chofer.linea))}
                        ${dato('Licencia', esc(chofer.numero_licencia))}
                        ${dato('Teléfono', esc(chofer.telefono || '—'))}
                        ${dato('Estado', chofer.activo ? '<span class="mr-estado normal">Activo</span>' : '<span class="mr-estado suspendido">Inactivo</span>')}
                    </div>
                </section>
                <section class="relative overflow-hidden rounded-xl bg-primary p-5 text-white shadow-xl mr-anim-subir" style="--retraso:90ms">
                    <div class="mr-hero-rejilla"></div>
                    <div class="mr-hero-luz uno -right-16 -top-16 h-48 w-48 bg-secondary/40 blur-[60px]"></div>
                    <div class="relative">
                        <h2 class="flex items-center gap-2 text-label-sm font-label-sm uppercase tracking-widest text-secondary-container">${icono('directions_bus', 'text-[18px]')} Viaje actual</h2>
                        ${viaje ? `
                            <div class="mt-4 flex items-center gap-3">
                                ${MR.insigniaRuta({ codigo: viaje.ruta_codigo, color: viaje.ruta_color }, 'lg')}
                                <div><p class="text-lg font-bold">${esc(viaje.ruta_nombre)}</p><p class="text-sm text-primary-fixed-dim">Unidad ${esc(viaje.numero_unidad)} · desde las ${esc(T.hora24(viaje.inicio))}</p></div>
                            </div>
                            <p class="mt-4 flex items-center gap-2 text-sm"><span class="mr-punto-vivo"></span> En circulación · ${esc(T.formatoDuracion(viaje.inicio, null))}</p>
                            <a class="mr-btn mr-btn-claro mt-5" href="${P.enlace('viaje')}">${icono('visibility')} Ver viaje actual</a>` : `
                            <p class="mt-4 text-primary-fixed-dim">No tienes un viaje en curso.</p>
                            <a class="mr-btn mr-btn-claro mt-5" href="${P.enlace('iniciar')}">${icono('play_circle')} Iniciar viaje</a>`}
                    </div>
                </section>
            </div>
            <section class="mt-6 mr-revelar">
                <div class="mb-3 flex items-center justify-between gap-2">
                    <h2 class="flex items-center gap-2 font-headline-sm text-headline-sm">${icono('history', 'text-secondary')} Viajes recientes</h2>
                    <a class="mr-enlace text-sm" href="${P.enlace('historial')}">Ver historial</a>
                </div>
                ${tablaViajes(recientes)}
            </section>`;
    }

    /* ---------- Iniciar viaje ---------- */
    if (P.seccion === 'iniciar') {
        if (S.chofer.viajeEnCurso(chofer.id)) {
            MRUI.ir('chofer/viaje.html', 'Ya tienes un viaje en curso. Finalízalo antes de iniciar otro.', 'info');
            return;
        }
        const rutas = S.gestion.rutasGestion([chofer.linea_id]).filter((r) => r.activa);
        const vehiculos = S.chofer.vehiculosDisponibles(chofer.linea_id);
        if (!rutas.length || !vehiculos.length) {
            P.vista.innerHTML = `<div class="mr-tarjeta mr-anim-escala">${MR.htmlVacio('error',
                `${!rutas.length ? 'Tu línea no tiene rutas activas.' : 'No hay vehículos disponibles en este momento: todos están en circulación o inactivos.'} Comunícate con el dueño de tu línea.`)}</div>`;
            return;
        }
        const opcion = (nombre, valor, contenido, i) => `
            <label class="group relative flex cursor-pointer items-center gap-3 rounded-xl border-2 border-surface-container bg-surface-container-lowest p-4 transition-all hover:border-secondary/50 hover:shadow-md has-[:checked]:border-secondary has-[:checked]:bg-secondary-container/20 mr-anim-subir" style="--retraso:${i * 50}ms">
                <input class="peer sr-only" type="radio" name="${nombre}" value="${valor}">
                ${contenido}
                <span class="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-outline-variant text-transparent transition-all peer-checked:border-secondary peer-checked:bg-secondary peer-checked:text-white">${icono('check', 'text-[16px]')}</span>
            </label>`;
        const equipo = (v) => [
            v.cuenta_con_gps ? icono('sensors', 'text-[16px] text-secondary') : icono('location_disabled', 'text-[16px] text-outline'),
            v.climatizado ? icono('ac_unit', 'text-[16px]') : '', v.tv_a_bordo ? icono('tv', 'text-[16px]') : '', v.accesible ? icono('accessible', 'text-[16px]') : '',
        ].join('');
        P.vista.innerHTML = `
            <form id="formViaje" class="flex max-w-3xl flex-col gap-6" novalidate>
                <section class="mr-tarjeta p-5">
                    <h2 class="mb-1 flex items-center gap-2 font-headline-sm text-headline-sm">${icono('route', 'text-secondary')} 1. Ruta</h2>
                    <p class="mb-4 text-sm text-on-surface-variant">¿Qué ruta vas a recorrer?</p>
                    <div class="grid gap-3 sm:grid-cols-2">${rutas.map((r, i) => opcion('ruta_id', r.id, `
                        ${MR.insigniaRuta(r)}
                        <span class="min-w-0"><span class="block font-semibold">${esc(r.nombre)}</span><span class="block text-xs text-on-surface-variant">${esc(T.textoSentido(r.sentido))}: ${esc(r.origen)} → ${esc(r.destino)}</span></span>`, i)).join('')}
                    </div>
                </section>
                <section class="mr-tarjeta p-5">
                    <h2 class="mb-1 flex items-center gap-2 font-headline-sm text-headline-sm">${icono('directions_bus', 'text-secondary')} 2. Vehículo</h2>
                    <p class="mb-4 text-sm text-on-surface-variant">Solo aparecen las unidades activas que no están en circulación.</p>
                    <div class="grid gap-3 sm:grid-cols-2">${vehiculos.map((v, i) => opcion('vehiculo_id', v.id, `
                        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-white">${icono('directions_bus')}</span>
                        <span class="min-w-0"><span class="block font-semibold">Unidad ${esc(v.numero_unidad)}</span><span class="flex items-center gap-1 text-xs text-on-surface-variant">${esc(v.placa)}${v.capacidad ? ` · ${v.capacidad} lugares` : ''} <span class="ml-1 flex gap-0.5 text-primary">${equipo(v)}</span></span></span>`, i)).join('')}
                    </div>
                </section>
                <section class="mr-tarjeta p-5">
                    <h2 class="mb-4 flex items-center gap-2 font-headline-sm text-headline-sm">${icono('groups', 'text-secondary')} 3. Pasajeros al salir</h2>
                    <div class="flex items-center gap-3">
                        <button type="button" class="mr-btn mr-btn-secundario mr-btn-icono" data-paso="-1" aria-label="Menos">${icono('remove')}</button>
                        <input class="mr-campo !w-28 text-center text-xl font-bold" type="number" id="pasajeros_salida" name="pasajeros_salida" min="0" max="300" value="0" inputmode="numeric" aria-label="Pasajeros al salir">
                        <button type="button" class="mr-btn mr-btn-secundario mr-btn-icono" data-paso="1" aria-label="Más">${icono('add')}</button>
                    </div>
                    <p class="mr-ayuda">Se muestra a los pasajeros como "Salió con X pasajeros".</p>
                </section>
                <div class="flex flex-wrap gap-2">
                    <button class="mr-btn mr-btn-primario !px-6 !py-3" type="submit">${icono('play_circle')} Iniciar viaje</button>
                    <a class="mr-btn mr-btn-contorno" href="${P.enlace('index')}">Cancelar</a>
                </div>
            </form>`;
        const form = document.getElementById('formViaje');
        const pasajeros = document.getElementById('pasajeros_salida');
        if (rutas.length === 1) form.querySelector('[name=ruta_id]').checked = true;
        if (vehiculos.length === 1) form.querySelector('[name=vehiculo_id]').checked = true;
        form.addEventListener('click', (e) => {
            const b = e.target.closest('[data-paso]');
            if (b) pasajeros.value = Math.max(0, Math.min(300, (Number(pasajeros.value) || 0) + Number(b.dataset.paso)));
        });
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const datos = {
                ruta_id: form.querySelector('[name=ruta_id]:checked')?.value,
                vehiculo_id: form.querySelector('[name=vehiculo_id]:checked')?.value,
                pasajeros_salida: pasajeros.value,
            };
            const { errores } = S.chofer.iniciarViaje(chofer, datos);
            if (errores.length) { P.errores(form, errores); return; }
            MRUI.ir('chofer/viaje.html', 'Viaje iniciado. ¡Buen recorrido!');
        });
    }

    /* ---------- Viaje actual ---------- */
    if (P.seccion === 'viaje') {
        const viaje = S.chofer.viajeEnCurso(chofer.id);
        if (!viaje) {
            P.vista.innerHTML = `<div class="mr-tarjeta mr-anim-escala">${MR.htmlVacio('directions_bus', 'No tienes un viaje en curso.',
                `<a class="mr-btn mr-btn-primario mt-3" href="${P.enlace('iniciar')}">${icono('play_circle')} Iniciar viaje</a>`)}</div>`;
            return;
        }
        const dato = (etiqueta, valor, idValor = '') => `<div class="mr-dato">${esc(etiqueta)}<strong${idValor ? ` id="${idValor}"` : ''}>${valor}</strong></div>`;
        P.vista.innerHTML = `
            <section class="mr-tarjeta p-5 mr-anim-subir">
                <div class="flex flex-wrap items-center gap-3">
                    ${MR.insigniaRuta({ codigo: viaje.ruta_codigo, color: viaje.ruta_color }, 'lg')}
                    <div class="min-w-0 flex-1">
                        <p class="font-headline-sm text-headline-sm">${esc(viaje.ruta_nombre)}</p>
                        <p class="text-sm text-on-surface-variant">${esc(T.textoSentido(viaje.ruta_sentido))} hacia ${esc(viaje.ruta_destino)} · Unidad ${esc(viaje.numero_unidad)} (${esc(viaje.placa)})</p>
                    </div>
                    <span class="mr-estado normal !px-3 !py-1.5 !text-xs"><span class="mr-punto-vivo"></span> En curso</span>
                </div>
                <div class="mt-5 grid grid-cols-2 gap-4 border-t border-surface-container pt-4 md:grid-cols-4">
                    ${dato('Salida', esc(T.hora24(viaje.inicio)))}
                    ${dato('Tiempo transcurrido', esc(T.formatoDuracion(viaje.inicio, null)), 'transcurrido')}
                    ${dato('Pasajeros al salir', viaje.pasajeros_salida ?? '—')}
                    ${dato('Ubicación de la unidad', 'Consultando…', 'estadoUbicacion')}
                </div>
            </section>
            <div class="mr-mapa-tarjeta relative mt-6 h-[460px] overflow-hidden rounded-xl bg-surface-container shadow-xl ring-1 ring-black/5 mr-anim-escala" style="--retraso:120ms">
                <div id="mapa" class="mr-mapa" role="region" aria-label="Mapa del viaje actual"></div>
            </div>
            <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div class="mr-actualizacion" id="indicador"></div>
                <button class="mr-btn mr-btn-peligro-solido" type="button" id="btnFinalizar">${icono('stop_circle')} Finalizar viaje</button>
            </div>`;

        const mapa = MR.crearMapa('mapa');
        const capa = MR.capaVehiculos(mapa);
        const indicador = MR.indicador(document.getElementById('indicador'));
        const estado = document.getElementById('estadoUbicacion');
        MR.api('rutas', { id: viaje.ruta_id }).then((d) => MR.dibujarRuta(mapa, d)).catch(() => {});
        MR.sondeo(async () => {
            indicador.cargando();
            document.getElementById('transcurrido').textContent = T.formatoDuracion(viaje.inicio, null);
            try {
                const datos = await MR.api('vehiculos', { rutas: viaje.ruta_id }, 60);
                const propio = datos.vehiculos.filter((v) => v.vehiculo_id === viaje.vehiculo_id);
                capa.actualizar(propio);
                estado.innerHTML = propio.length ? `<span class="flex items-center gap-1 text-sm font-semibold">${MR.estadoVehiculo(propio[0])}</span>` : 'Sin información';
                indicador.listo(datos.datos_demostracion);
            } catch (e) {
                indicador.error();
            }
        });
        document.getElementById('btnFinalizar').addEventListener('click', async () => {
            const ok = await MRUI.confirmar({
                titulo: '¿Finalizar el viaje?', mensaje: 'Tu unidad dejará de mostrarse en el mapa y el viaje se guardará en tu historial.',
                aceptar: 'Finalizar viaje', peligro: true, icono: 'stop_circle',
            });
            if (!ok) return;
            if (S.chofer.finalizarViaje(viaje.id, chofer.id)) MRUI.ir('chofer/historial.html', 'Viaje finalizado y registrado en tu historial.');
            else MRUI.ir('chofer/viaje.html', 'No fue posible finalizar el viaje: ya no está en curso.', 'advertencia');
        });
    }

    /* ---------- Historial de viajes ---------- */
    if (P.seccion === 'historial') {
        const valida = (v, d) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : d);
        let desde = valida(MR.parametro('desde'), hace30());
        let hasta = valida(MR.parametro('hasta'), hoy());
        if (desde > hasta) [desde, hasta] = [hasta, desde];
        const viajes = S.chofer.historial(chofer.id, desde, hasta);
        const finalizados = viajes.filter((v) => v.estado === 'finalizado').length;
        const minutos = viajes.filter((v) => v.fin).reduce((s, v) => s + (v.fin - v.inicio) / 60000, 0);
        P.vista.innerHTML = `
            <form class="mr-tarjeta mb-5 grid items-end gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]" method="get">
                ${P.campo('desde', 'Desde', `<input class="mr-campo" type="date" id="desde" name="desde" value="${desde}" max="${hoy()}">`)}
                ${P.campo('hasta', 'Hasta', `<input class="mr-campo" type="date" id="hasta" name="hasta" value="${hasta}" max="${hoy()}">`)}
                <button class="mr-btn mr-btn-primario" type="submit">${icono('filter_alt')} Consultar</button>
            </form>
            <div class="mb-5 grid grid-cols-3 gap-4">
                <div class="mr-tarjeta mr-stat mr-anim-subir"><span class="mr-stat-icono">${icono('route')}</span><p class="mr-stat-valor" data-contar="${viajes.length}">0</p><p class="mr-stat-etiqueta">Viajes</p></div>
                <div class="mr-tarjeta mr-stat mr-anim-subir" style="--retraso:70ms"><span class="mr-stat-icono">${icono('task_alt')}</span><p class="mr-stat-valor" data-contar="${finalizados}">0</p><p class="mr-stat-etiqueta">Finalizados</p></div>
                <div class="mr-tarjeta mr-stat mr-anim-subir" style="--retraso:140ms"><span class="mr-stat-icono">${icono('timer')}</span><p class="mr-stat-valor"><span data-contar="${Math.round(minutos / 60)}">0</span> h</p><p class="mr-stat-etiqueta">Horas al volante</p></div>
            </div>
            <p class="mb-3 text-sm text-on-surface-variant">Del ${esc(T.formatoFecha(new Date(`${desde}T12:00`).getTime(), false))} al ${esc(T.formatoFecha(new Date(`${hasta}T12:00`).getTime(), false))}.</p>
            ${tablaViajes(viajes)}`;
    }
})();
