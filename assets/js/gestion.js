/** Paneles de gestión del dueño de línea y del administrador general. */
(() => {
    const u = MRUI.usuario;
    if (!u) return;
    const S = MRServicios;
    const G = S.gestion;
    const { esc, icono, T } = MR;
    const P = MRP;
    const esAdmin = u.rol === 'admin';
    const ids = S.sesion.alcance(u);
    const lineasDisponibles = G.lineas(ids);
    const opcionesLineas = lineasDisponibles.map((l) => [l.id, l.nombre]);
    const sinLineas = () => `<div class="mr-tarjeta">${MR.htmlVacio('hub', 'No tienes líneas asignadas. Comunícate con el administrador general.')}</div>`;
    const lineaInicial = () => (lineasDisponibles.length === 1 ? lineasDisponibles[0].id : '');

    const secciones = {
        inicio: esAdmin ? inicioAdmin : inicioDueno,
        lineas: esAdmin ? lineas : null,
        usuarios: esAdmin ? usuarios : null,
        choferes, vehiculos, fallas, rutas, paradas, ubicacion, reportes,
    };
    (secciones[P.seccion] || (() => P.noEncontrado('Esta sección no existe.', 'index', 'Volver al resumen')))();

    /* ================= Resumen ================= */

    function tablaLineas(lista, conEditar) {
        return P.tabla(['Línea', 'Dueño', 'Teléfono', 'Rutas', 'Vehículos', 'Choferes', 'Estado', ...(conEditar ? [''] : [])], lista.map((l) => `
            <tr>
                <td><p class="font-semibold">${esc(l.nombre)}</p>${l.descripcion ? `<p class="text-xs text-on-surface-variant">${esc(l.descripcion)}</p>` : ''}</td>
                <td class="text-sm">${esc(l.dueno_nombre || 'Sin asignar')}</td>
                <td class="whitespace-nowrap text-sm">${esc(l.telefono || '—')}</td>
                <td>${l.total_rutas}</td><td>${l.total_vehiculos}</td><td>${l.total_choferes}</td>
                <td>${P.estadoActivo(l.activa, 'Activa', 'Inactiva')}</td>
                ${conEditar ? `<td class="text-right">${P.btnEditar(P.enlace('lineas', `accion=editar&id=${l.id}`))}</td>` : ''}
            </tr>`));
    }

    function inicioAdmin() {
        const porRol = G.contarPorRol();
        const suma = (campo) => lineasDisponibles.reduce((s, l) => s + l[campo], 0);
        const nuevos = G.reportes(null, 'nuevo').length;
        const stats = [
            ['Líneas', lineasDisponibles.length, 'hub', P.enlace('lineas')],
            ['Rutas', suma('total_rutas'), 'route', P.enlace('rutas')],
            ['Paradas activas', G.contarParadasActivas(), 'location_on', P.enlace('paradas')],
            ['Vehículos', suma('total_vehiculos'), 'directions_bus', P.enlace('vehiculos')],
            ['Fallas abiertas', S.fallas.contarAbiertas(null), 'car_repair', P.enlace('fallas')],
            ['Choferes', suma('total_choferes'), 'id_card', P.enlace('choferes')],
            ['En circulación', G.contarEnCurso(), 'sensors', P.enlace('ubicacion')],
            ['Pasajeros', porRol.pasajero || 0, 'group', P.enlace('usuarios', 'rol=pasajero')],
            ['Dueños de línea', porRol.dueno || 0, 'business_center', P.enlace('usuarios', 'rol=dueno')],
        ];
        P.vista.innerHTML = `
            ${nuevos ? avisoReportes(nuevos) : ''}
            <div class="grid grid-cols-2 gap-4 xl:grid-cols-4">${stats.map(([e, v, ic, h], i) => P.estadistica(e, v, ic, h, i * 50)).join('')}</div>
            <section class="mt-8 mr-revelar">
                <div class="mb-3 flex items-center justify-between gap-2">
                    <h2 class="flex items-center gap-2 font-headline-sm text-headline-sm">${icono('hub', 'text-secondary')} Líneas de transporte</h2>
                    <a class="mr-enlace text-sm" href="${P.enlace('lineas')}">Administrar</a>
                </div>
                ${tablaLineas(lineasDisponibles, false)}
            </section>`;
    }

    function avisoReportes(n) {
        return `
            <a href="${P.enlace('reportes')}" class="mb-6 flex items-center gap-3 rounded-xl bg-error-container p-4 text-on-error-container shadow-sm transition-transform hover:-translate-y-0.5 mr-anim-subir">
                <span class="relative flex h-10 w-10 items-center justify-center rounded-full bg-error text-white">${icono('car_crash')}<span class="absolute -right-0.5 -top-0.5 mr-ping"></span></span>
                <span class="flex-1"><strong>${n} reporte(s) de accidente sin revisar.</strong> <span class="text-sm">Atiéndelos y márcalos como revisados.</span></span>
                ${icono('chevron_right')}
            </a>`;
    }

    function inicioDueno() {
        MRUI.tituloPanel('Resumen de tu línea', 'Administra los choferes, vehículos y rutas de tu línea de transporte.');
        if (!lineasDisponibles.length) { P.vista.innerHTML = sinLineas(); return; }
        const suma = (campo) => lineasDisponibles.reduce((s, l) => s + l[campo], 0);
        const nuevos = G.reportes(ids, 'nuevo').length;
        const stats = [
            ['Rutas', suma('total_rutas'), 'route', P.enlace('rutas')],
            ['Vehículos', suma('total_vehiculos'), 'directions_bus', P.enlace('vehiculos')],
            ['Fallas abiertas', S.fallas.contarAbiertas(ids), 'car_repair', P.enlace('fallas')],
            ['Choferes', suma('total_choferes'), 'id_card', P.enlace('choferes')],
            ['En circulación', G.contarEnCurso(ids), 'sensors', P.enlace('ubicacion')],
        ];
        P.vista.innerHTML = `
            ${nuevos ? avisoReportes(nuevos) : ''}
            <div class="grid grid-cols-2 gap-4 xl:grid-cols-4">${stats.map(([e, v, ic, h], i) => P.estadistica(e, v, ic, h, i * 60)).join('')}</div>
            <div class="mt-8 flex flex-col gap-4">
                ${lineasDisponibles.map((l, i) => `
                    <section class="mr-tarjeta flex flex-wrap items-start justify-between gap-3 p-5 mr-revelar" style="--retraso:${i * 80}ms">
                        <div class="flex items-start gap-3">
                            <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">${icono('hub')}</span>
                            <div>
                                <h2 class="font-headline-sm text-headline-sm">${esc(l.nombre)}</h2>
                                <p class="text-sm text-on-surface-variant">${esc(l.descripcion || 'Sin descripción')}${l.telefono ? ` · Tel. ${esc(l.telefono)}` : ''}</p>
                            </div>
                        </div>
                        ${l.activa ? `<span class="mr-estado normal">${icono('check_circle', 'relleno')}Línea activa</span>` : `<span class="mr-estado suspendido">${icono('block')}Línea inactiva</span>`}
                    </section>`).join('')}
            </div>`;
    }

    /* ================= Líneas (administrador) ================= */

    function lineas() {
        if (P.accion === 'lista') {
            P.vista.innerHTML = P.encabezado('Líneas de transporte', `${lineasDisponibles.length} línea(s).`, P.boton('Crear línea', P.enlace('lineas', 'accion=nuevo')))
                + (lineasDisponibles.length ? tablaLineas(lineasDisponibles, true) : `<div class="mr-tarjeta">${MR.htmlVacio('hub', 'Aún no hay líneas registradas.')}</div>`);
            return;
        }
        const linea = P.accion === 'editar' ? lineasDisponibles.find((l) => l.id === P.id) : null;
        if (P.accion === 'editar' && !linea) { P.noEncontrado('La línea no existe.', 'lineas', 'Volver a líneas'); return; }
        const d = linea || { nombre: '', descripcion: '', telefono: '', dueno_id: null, activa: true };
        const duenos = G.usuarios('dueno').filter((x) => x.activo).map((x) => [x.id, `${x.nombre} (${x.email})`]);
        P.vista.innerHTML = `
            ${P.migas('Líneas', 'lineas', linea ? 'Editar' : 'Nueva')}
            ${P.encabezado(linea ? 'Editar línea' : 'Crear línea')}
            <form id="formulario" class="mr-tarjeta max-w-3xl p-6" novalidate>
                <div class="grid gap-4 md:grid-cols-12">
                    ${P.campo('nombre', 'Nombre', P.entrada('nombre', d.nombre, 'required maxlength="120"'), { clase: 'md:col-span-7' })}
                    ${P.campo('telefono', 'Teléfono', P.entrada('telefono', d.telefono, 'type="tel" maxlength="30"'), { clase: 'md:col-span-5', opcional: true })}
                    ${P.campo('descripcion', 'Descripción', P.entrada('descripcion', d.descripcion, 'maxlength="255"'), { clase: 'md:col-span-12', opcional: true })}
                    ${P.campo('dueno_id', 'Dueño de línea', P.selector('dueno_id', duenos, d.dueno_id, 'Sin asignar'), {
                        clase: 'md:col-span-7', ayuda: `Para agregar un dueño, primero crea su cuenta en <a href="${P.enlace('usuarios', 'accion=nuevo')}">Usuarios</a>.` })}
                    <div class="md:col-span-12">${P.interruptor('activa', 'Línea activa (sus rutas son visibles para pasajeros)', d.activa)}</div>
                </div>
                ${P.pieFormulario(P.enlace('lineas'))}
            </form>`;
        P.alGuardar(document.getElementById('formulario'), (datos) => G.guardarLinea(linea?.id || null, datos),
            { volverA: 'admin/lineas.html', mensaje: linea ? 'La línea se actualizó.' : 'Línea creada.' });
    }

    /* ================= Usuarios (administrador) ================= */

    function usuarios() {
        if (P.accion === 'lista') {
            const rol = S.ROLES[MR.parametro('rol')] ? MR.parametro('rol') : '';
            const q = (MR.parametro('q') || '').slice(0, 80);
            P.vista.innerHTML = `
                ${P.encabezado('Usuarios', 'Cuentas y perfiles de acceso.', P.boton('Crear cuenta', P.enlace('usuarios', 'accion=nuevo'), 'person_add'))}
                <form id="filtros" class="mr-tarjeta mb-5 grid gap-3 p-4 md:grid-cols-[1fr_260px]">
                    <div class="relative">
                        ${icono('search', 'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline')}
                        <input class="mr-campo !pl-10" type="search" name="q" value="${esc(q)}" placeholder="Buscar por nombre o correo" maxlength="80" aria-label="Buscar">
                    </div>
                    ${P.selector('rol', Object.entries(S.ROLES), rol, 'Todos los perfiles', 'aria-label="Perfil"')}
                </form>
                <div id="listaUsuarios"></div>`;
            const filtros = document.getElementById('filtros');
            const pintar = () => {
                const { q: busqueda, rol: perfil } = P.leer(filtros);
                const lista = G.usuarios(perfil || null, busqueda.trim());
                history.replaceState(null, '', `?${new URLSearchParams(Object.entries({ q: busqueda.trim(), rol: perfil }).filter(([, v]) => v))}`);
                document.getElementById('listaUsuarios').innerHTML = lista.length ? P.tabla(['Nombre', 'Perfil', 'Último acceso', 'Estado', ''], lista.map((x) => `
                    <tr>
                        <td><div class="flex items-center gap-3"><span class="mr-avatar h-9 w-9 text-xs">${esc(MRUI.iniciales(x.nombre))}</span><div><p class="font-semibold">${esc(x.nombre)}${x.id === u.id ? ' <span class="mr-etiqueta ml-1">Tú</span>' : ''}</p><p class="text-xs text-on-surface-variant">${esc(x.email)}</p></div></div></td>
                        <td class="text-sm">${esc(S.ROLES[x.rol])}</td>
                        <td class="whitespace-nowrap text-sm">${esc(x.ultimo_acceso ? T.formatoFecha(x.ultimo_acceso) : 'Nunca')}</td>
                        <td>${P.estadoActivo(x.activo, 'Activa', 'Desactivada')}</td>
                        <td class="text-right">${P.btnEditar(x.rol === 'chofer' ? editarChoferDeUsuario(x.id) : P.enlace('usuarios', `accion=editar&id=${x.id}`))}</td>
                    </tr>`)) : `<div class="mr-tarjeta">${MR.htmlVacio('group_off', 'No hay cuentas con esos filtros.')}</div>`;
            };
            filtros.addEventListener('input', pintar);
            filtros.addEventListener('submit', (e) => e.preventDefault());
            pintar();
            return;
        }
        const editado = P.accion === 'editar' ? G.usuarios().find((x) => x.id === P.id) : null;
        if (P.accion === 'editar' && !editado) { P.noEncontrado('El usuario no existe.', 'usuarios', 'Volver a usuarios'); return; }
        if (editado?.rol === 'chofer') { location.replace(editarChoferDeUsuario(editado.id)); return; }
        const esPropio = editado?.id === u.id;
        const d = editado || { nombre: '', email: '', rol: 'pasajero', activo: true };
        P.vista.innerHTML = `
            ${P.migas('Usuarios', 'usuarios', editado ? 'Editar' : 'Nueva cuenta')}
            ${P.encabezado(editado ? 'Editar cuenta' : 'Crear cuenta')}
            <form id="formulario" class="mr-tarjeta max-w-3xl p-6" novalidate>
                <div class="grid gap-4 md:grid-cols-2">
                    ${P.campo('nombre', 'Nombre completo', P.entrada('nombre', d.nombre, 'required maxlength="100" autocomplete="off"'))}
                    ${P.campo('email', 'Correo electrónico', P.entrada('email', d.email, 'type="email" required maxlength="150" autocomplete="off"'))}
                    ${P.campo('rol', 'Perfil', P.selector('rol', G.ROLES_ASIGNABLES.map((r) => [r, S.ROLES[r]]), d.rol, '', esPropio ? 'disabled' : ''), {
                        ayuda: `Los choferes se registran desde <a href="${P.enlace('choferes', 'accion=nuevo')}">Choferes</a>.` })}
                    ${P.campo('password', editado ? 'Nueva contraseña' : 'Contraseña', P.entrada('password', '', 'type="password" minlength="8" maxlength="100" autocomplete="new-password"'), {
                        opcional: !!editado, ayuda: `Mínimo 8 caracteres.${editado ? ' Déjala vacía para conservar la actual.' : ''}` })}
                    <div class="md:col-span-2">${P.interruptor('activo', 'Cuenta activa (puede iniciar sesión)', d.activo, esPropio ? 'disabled' : '')}</div>
                </div>
                ${P.pieFormulario(P.enlace('usuarios'))}
            </form>`;
        P.alGuardar(document.getElementById('formulario'),
            (datos) => G.guardarUsuario(editado?.id || null, esPropio ? { ...datos, rol: 'admin', activo: true } : datos, u),
            { volverA: 'admin/usuarios.html', mensaje: editado ? 'La cuenta se actualizó.' : 'Cuenta creada.' });
    }

    function editarChoferDeUsuario(usuarioId) {
        const c = G.choferes(null).find((x) => x.usuario_id === usuarioId);
        return c ? P.enlace('choferes', `accion=editar&id=${c.id}`) : P.enlace('usuarios');
    }

    /* ================= Choferes ================= */

    function choferes() {
        const lista = G.choferes(ids);
        if (P.accion === 'lista') {
            P.vista.innerHTML = P.encabezado('Choferes', `${lista.length} chofer(es) registrado(s).`,
                lineasDisponibles.length ? P.boton('Registrar chofer', P.enlace('choferes', 'accion=nuevo'), 'person_add') : '')
                + (!lineasDisponibles.length ? sinLineas() : lista.length ? P.tabla(['Nombre', 'Línea', 'Licencia', 'Teléfono', 'Estado', ''], lista.map((c) => `
                    <tr>
                        <td><div class="flex items-center gap-3"><span class="mr-avatar h-9 w-9 text-xs">${esc(MRUI.iniciales(c.nombre))}</span><div><p class="font-semibold">${esc(c.nombre)}</p><p class="text-xs text-on-surface-variant">${esc(c.email)}</p></div></div></td>
                        <td class="text-sm">${esc(c.linea)}</td>
                        <td class="text-sm font-medium">${esc(c.numero_licencia)}</td>
                        <td class="whitespace-nowrap text-sm">${esc(c.telefono || '—')}</td>
                        <td>${!c.activo ? `<span class="mr-estado suspendido">${icono('block')}Inactivo</span>` : c.en_viaje ? `<span class="mr-estado normal">${icono('sensors')}En viaje</span>` : `<span class="mr-etiqueta">${icono('check_circle', 'text-secondary')}Activo</span>`}</td>
                        <td class="text-right">${P.btnEditar(P.enlace('choferes', `accion=editar&id=${c.id}`))}</td>
                    </tr>`)) : `<div class="mr-tarjeta">${MR.htmlVacio('id_card', 'Aún no hay choferes registrados.')}</div>`);
            return;
        }
        const chofer = P.accion === 'editar' ? lista.find((c) => c.id === P.id) : null;
        if (P.accion === 'editar' && !chofer) { P.noEncontrado('El chofer no existe o no pertenece a tus líneas.', 'choferes', 'Volver a choferes'); return; }
        if (!lineasDisponibles.length) { P.vista.innerHTML = sinLineas(); return; }
        const d = chofer || { nombre: '', email: '', linea_id: lineaInicial(), numero_licencia: '', telefono: '', activo: true };
        P.vista.innerHTML = `
            ${P.migas('Choferes', 'choferes', chofer ? 'Editar' : 'Nuevo')}
            ${P.encabezado(chofer ? 'Editar chofer' : 'Registrar chofer')}
            <form id="formulario" class="mr-tarjeta max-w-3xl p-6" novalidate>
                <div class="grid gap-4 md:grid-cols-2">
                    ${P.campo('nombre', 'Nombre completo', P.entrada('nombre', d.nombre, 'required maxlength="100" autocomplete="off"'))}
                    ${P.campo('email', 'Correo (para iniciar sesión)', P.entrada('email', d.email, 'type="email" required maxlength="150" autocomplete="off"'))}
                    ${P.campo('password', chofer ? 'Nueva contraseña' : 'Contraseña', P.entrada('password', '', 'type="password" minlength="8" maxlength="100" autocomplete="new-password"'), {
                        opcional: !!chofer, ayuda: `Mínimo 8 caracteres.${chofer ? ' Déjala vacía para conservar la actual.' : ''}` })}
                    ${P.campo('linea_id', 'Línea', P.selector('linea_id', opcionesLineas, d.linea_id, 'Selecciona una línea', 'required'))}
                    ${P.campo('numero_licencia', 'Número de licencia', P.entrada('numero_licencia', d.numero_licencia, 'required maxlength="30" style="text-transform:uppercase"'))}
                    ${P.campo('telefono', 'Teléfono', P.entrada('telefono', d.telefono, 'type="tel" maxlength="30"'), { opcional: true })}
                    <div class="md:col-span-2">${P.interruptor('activo', 'Chofer activo (puede iniciar sesión e iniciar viajes)', d.activo)}</div>
                </div>
                ${P.pieFormulario(P.enlace('choferes'))}
            </form>`;
        P.alGuardar(document.getElementById('formulario'), (datos) => G.guardarChofer(chofer?.id || null, datos, ids),
            { volverA: `${u.rol}/choferes.html`, mensaje: chofer ? 'Los datos del chofer se actualizaron.' : 'Chofer registrado. Ya puede iniciar sesión.' });
    }

    /* ================= Vehículos ================= */

    function vehiculos() {
        const lista = G.vehiculos(ids);
        const equipo = (v) => {
            const items = [[v.climatizado, 'ac_unit', 'Climatizado'], [v.tv_a_bordo, 'tv', 'TV a bordo'], [v.accesible, 'accessible', 'Accesible']].filter(([si]) => si);
            return items.length ? items.map(([, ic, t]) => `<span title="${t}" class="text-primary">${icono(ic, 'text-[20px]')}</span>`).join('') : '<span class="text-outline">—</span>';
        };
        if (P.accion === 'lista') {
            P.vista.innerHTML = P.encabezado('Vehículos', `${lista.length} vehículo(s) registrado(s).`,
                lineasDisponibles.length ? P.boton('Registrar vehículo', P.enlace('vehiculos', 'accion=nuevo')) : '')
                + (!lineasDisponibles.length ? sinLineas() : lista.length ? P.tabla(['Unidad', 'Línea', 'Placa', 'Modelo', 'Capacidad', 'GPS', 'Equipamiento', 'Estado', ''], lista.map((v) => `
                    <tr>
                        <td><span class="flex items-center gap-2 font-semibold"><span class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">${icono('directions_bus', 'text-[18px]')}</span>${esc(v.numero_unidad)}</span></td>
                        <td class="text-sm">${esc(v.linea)}</td>
                        <td class="whitespace-nowrap text-sm font-medium">${esc(v.placa)}</td>
                        <td class="text-sm">${esc(v.modelo || '—')}</td>
                        <td class="text-sm">${v.capacidad || '—'}</td>
                        <td>${v.cuenta_con_gps ? `<span title="Con dispositivo de ubicación" class="text-secondary">${icono('sensors')}</span>` : `<span title="Sin dispositivo de ubicación" class="text-outline">${icono('location_disabled')}</span>`}</td>
                        <td><span class="flex gap-1">${equipo(v)}</span></td>
                        <td>
                            ${!v.activo ? `<span class="mr-estado suspendido">${icono('block')}Inactivo</span>` : v.ruta_en_curso !== null ? `<span class="mr-estado normal">${icono('sensors')}En ruta ${esc(v.ruta_en_curso)}</span>` : v.fuera_de_servicio ? `<span class="mr-estado suspendido">${icono('car_repair')}Fuera de servicio</span>` : `<span class="mr-etiqueta">${icono('check_circle', 'text-secondary')}Disponible</span>`}
                            ${v.fallas_abiertas ? `<a class="mr-enlace mt-1 flex items-center gap-1 text-xs" href="${P.enlace('fallas', `vehiculo=${v.id}`)}">${icono('warning', 'text-[15px]')}${v.fallas_abiertas} falla(s) abierta(s)</a>` : ''}
                        </td>
                        <td class="text-right">${P.btnEditar(P.enlace('vehiculos', `accion=editar&id=${v.id}`))}</td>
                    </tr>`)) : `<div class="mr-tarjeta">${MR.htmlVacio('directions_bus', 'Aún no hay vehículos registrados.')}</div>`);
            return;
        }
        const vehiculo = P.accion === 'editar' ? lista.find((v) => v.id === P.id) : null;
        if (P.accion === 'editar' && !vehiculo) { P.noEncontrado('El vehículo no existe o no pertenece a tus líneas.', 'vehiculos', 'Volver a vehículos'); return; }
        if (!lineasDisponibles.length) { P.vista.innerHTML = sinLineas(); return; }
        const d = vehiculo || { linea_id: lineaInicial(), numero_unidad: '', placa: '', modelo: '', capacidad: '', cuenta_con_gps: true, climatizado: false, tv_a_bordo: false, accesible: false, activo: true };
        P.vista.innerHTML = `
            ${P.migas('Vehículos', 'vehiculos', vehiculo ? 'Editar' : 'Nuevo')}
            ${P.encabezado(vehiculo ? 'Editar vehículo' : 'Registrar vehículo')}
            <form id="formulario" class="mr-tarjeta max-w-3xl p-6" novalidate>
                <div class="grid gap-4 md:grid-cols-12">
                    ${P.campo('linea_id', 'Línea', P.selector('linea_id', opcionesLineas, d.linea_id, 'Selecciona una línea', 'required'), { clase: 'md:col-span-6' })}
                    ${P.campo('numero_unidad', 'Número de unidad', P.entrada('numero_unidad', d.numero_unidad, 'required maxlength="20"'), { clase: 'md:col-span-3' })}
                    ${P.campo('placa', 'Placa', P.entrada('placa', d.placa, 'required maxlength="15" style="text-transform:uppercase"'), { clase: 'md:col-span-3' })}
                    ${P.campo('modelo', 'Modelo / descripción', P.entrada('modelo', d.modelo, 'maxlength="80"'), { clase: 'md:col-span-8', opcional: true })}
                    ${P.campo('capacidad', 'Capacidad (pasajeros)', P.entrada('capacidad', d.capacidad, 'type="number" min="1" max="300"'), { clase: 'md:col-span-4', opcional: true })}
                    <div class="md:col-span-6">${P.interruptor('cuenta_con_gps', 'Cuenta con dispositivo de ubicación (GPS)', d.cuenta_con_gps)}</div>
                    <div class="md:col-span-6">${P.interruptor('activo', 'Vehículo activo', d.activo)}</div>
                    <div class="md:col-span-12 mt-2 rounded-xl bg-surface-container-low p-4">
                        <p class="mr-etiqueta-campo">Servicio y equipamiento <span class="font-normal normal-case tracking-normal text-outline">(se muestra a los pasajeros)</span></p>
                        <div class="mt-2 grid gap-3 md:grid-cols-3">
                            ${P.interruptor('climatizado', `${icono('ac_unit', 'text-[18px] text-primary')} Climatizado`, d.climatizado)}
                            ${P.interruptor('tv_a_bordo', `${icono('tv', 'text-[18px] text-primary')} TV a bordo`, d.tv_a_bordo)}
                            ${P.interruptor('accesible', `${icono('accessible', 'text-[18px] text-primary')} Accesible`, d.accesible)}
                        </div>
                    </div>
                </div>
                ${P.pieFormulario(P.enlace('vehiculos'))}
            </form>`;
        P.alGuardar(document.getElementById('formulario'), (datos) => G.guardarVehiculo(vehiculo?.id || null, datos, ids),
            { volverA: `${u.rol}/vehiculos.html`, mensaje: vehiculo ? 'El vehículo se actualizó.' : 'Vehículo registrado.' });
    }

    /* ================= Fallas de vehículos ================= */

    function fallas() {
        const unidades = G.vehiculos(ids);
        if (!lineasDisponibles.length) { P.vista.innerHTML = sinLineas(); return; }

        if (P.accion === 'nuevo') {
            const pedida = Number(MR.parametro('vehiculo')) || '';
            P.vista.innerHTML = `
                ${P.migas('Fallas de vehículos', 'fallas', 'Registrar')}
                ${P.encabezado('Registrar falla', 'Anota un detalle o descompostura que detectaste en una unidad.')}
                <form id="formulario" class="mr-tarjeta max-w-3xl p-6" novalidate>
                    <div class="grid gap-4 md:grid-cols-2">
                        ${P.campo('vehiculo_id', 'Unidad', P.selector('vehiculo_id', unidades.map((v) => [v.id, `${v.numero_unidad} · ${v.placa} (${v.linea})`]), pedida, 'Selecciona la unidad', 'required'))}
                        ${P.campo('tipo', 'Tipo de falla', P.selector('tipo', Object.entries(S.fallas.TIPOS).map(([k, t]) => [k, t.texto]), '', 'Selecciona el tipo', 'required'))}
                        ${P.campo('descripcion', 'Detalles', '<textarea class="mr-campo" id="descripcion" name="descripcion" rows="3" maxlength="500"></textarea>', { clase: 'md:col-span-2', opcional: true })}
                        <div class="md:col-span-2">${P.interruptor('impide_circular', 'La unidad no puede circular hasta que se repare', false)}</div>
                    </div>
                    ${P.pieFormulario(P.enlace('fallas'), 'Registrar falla')}
                </form>`;
            P.alGuardar(document.getElementById('formulario'), (datos) => S.fallas.reportar(u, datos, ids),
                { volverA: `${u.rol}/fallas.html`, mensaje: 'Falla registrada.' });
            return;
        }

        let filtro = ['abiertas', 'resueltas', 'todas'].includes(MR.parametro('estado')) ? MR.parametro('estado') : 'abiertas';
        const vehiculoId = Number(MR.parametro('vehiculo')) || null;
        const unidad = vehiculoId ? unidades.find((v) => v.id === vehiculoId) : null;
        P.vista.innerHTML = `
            ${P.encabezado('Fallas de vehículos', 'Llantas ponchadas, clima descompuesto y otros detalles que reportan los choferes. Las unidades con una falla que les impide circular no se pueden usar para iniciar viajes.',
                P.boton('Registrar falla', P.enlace('fallas', `accion=nuevo${unidad ? `&vehiculo=${unidad.id}` : ''}`)))}
            <div class="mb-5 flex flex-wrap items-center gap-3">
                <div class="mr-pestanas w-fit" role="tablist" id="filtroFallas">
                    <button class="mr-pestana" type="button" data-estado="abiertas">Abiertas</button>
                    <button class="mr-pestana" type="button" data-estado="resueltas">Resueltas</button>
                    <button class="mr-pestana" type="button" data-estado="todas">Todas</button>
                </div>
                ${unidad ? `<a class="mr-etiqueta hover:bg-surface-container-high" href="${P.enlace('fallas')}" title="Quitar filtro">${icono('directions_bus', 'text-[16px]')} Unidad ${esc(unidad.numero_unidad)} ${icono('close', 'text-[16px]')}</a>` : ''}
            </div>
            <div id="listaFallas" class="flex flex-col gap-4"></div>`;
        const coincide = (estado) => (f) => (estado === 'todas' || (estado === 'resueltas') === (f.estado === 'resuelta'));
        const pintar = () => {
            const todas = S.fallas.listar(ids, vehiculoId);
            const lista = todas.filter(coincide(filtro));
            document.querySelectorAll('#filtroFallas [data-estado]').forEach((b) => {
                const n = todas.filter(coincide(b.dataset.estado)).length;
                b.classList.toggle('activa', b.dataset.estado === filtro);
                b.setAttribute('aria-selected', String(b.dataset.estado === filtro));
                b.innerHTML = `${{ abiertas: 'Abiertas', resueltas: 'Resueltas', todas: 'Todas' }[b.dataset.estado]} <span class="ml-1 rounded-full bg-black/10 px-1.5 text-[11px]">${n}</span>`;
            });
            document.getElementById('listaFallas').innerHTML = lista.length ? lista.map((f, i) => P.tarjetaFalla(f, i, [
                f.estado === 'pendiente' ? `<button class="mr-btn mr-btn-contorno mr-btn-sm" type="button" data-atender="${f.id}" data-estado="en_reparacion">${icono('build')} En reparación</button>` : '',
                f.estado !== 'resuelta' ? `<button class="mr-btn mr-btn-primario mr-btn-sm" type="button" data-atender="${f.id}" data-estado="resuelta">${icono('task_alt')} Marcar resuelta</button>` : '',
            ].join(''))).join('') : `<div class="mr-tarjeta">${MR.htmlVacio('verified', filtro === 'abiertas' ? 'No hay fallas abiertas. ¡Todas las unidades están en orden!' : 'No hay fallas registradas.')}</div>`;
        };
        document.getElementById('filtroFallas').addEventListener('click', (e) => {
            const b = e.target.closest('[data-estado]');
            if (!b) return;
            filtro = b.dataset.estado;
            const q = new URLSearchParams(location.search);
            q.set('estado', filtro);
            history.replaceState(null, '', `?${q}`);
            pintar();
        });
        document.getElementById('listaFallas').addEventListener('click', async (e) => {
            const b = e.target.closest('[data-atender]');
            if (!b) return;
            const id = Number(b.dataset.atender);
            const estado = b.dataset.estado;
            const nota = await pedirNota(estado);
            if (nota === null) return;
            const { errores } = S.fallas.atender(id, u, ids, estado, nota);
            if (errores.length) MRUI.aviso(errores[0], 'advertencia');
            else MRUI.aviso(estado === 'resuelta' ? 'La falla se marcó como resuelta.' : 'La falla quedó en reparación.');
            pintar();
        });
        pintar();
    }

    /** Pide una nota opcional al cambiar el estado de una falla. Devuelve null si se cancela. */
    function pedirNota(estado) {
        const resolver = estado === 'resuelta';
        return new Promise((terminar) => {
            const modal = document.createElement('div');
            modal.className = 'mr-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.innerHTML = `
                <form class="mr-modal-panel max-w-md p-6" novalidate>
                    <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary-container/50 text-secondary">${icono(resolver ? 'task_alt' : 'build', 'relleno text-[30px]')}</div>
                    <h2 class="text-headline-sm font-headline-sm text-on-surface">${resolver ? 'Marcar la falla como resuelta' : 'Mandar la unidad a reparación'}</h2>
                    <p class="mt-1 text-sm text-on-surface-variant">${resolver ? 'La unidad podrá volver a circular si no tiene otras fallas que lo impidan.' : 'La falla seguirá abierta hasta que la marques como resuelta.'}</p>
                    ${P.campo('nota_solucion', resolver ? '¿Qué se reparó?' : 'Nota', `<textarea class="mr-campo" id="nota_solucion" name="nota_solucion" rows="3" maxlength="255" placeholder="${resolver ? 'Ej. Se cambió la llanta por una nueva.' : 'Ej. Se llevó al taller de la línea.'}"></textarea>`, { clase: 'mt-4', opcional: true })}
                    <div class="mt-6 flex justify-end gap-3">
                        <button type="button" class="mr-btn mr-btn-secundario" data-cerrar-modal>Cancelar</button>
                        <button type="submit" class="mr-btn mr-btn-primario">${icono('check')} ${resolver ? 'Marcar resuelta' : 'Guardar'}</button>
                    </div>
                </form>`;
            let valor = null;
            modal.querySelector('form').addEventListener('submit', (e) => {
                e.preventDefault();
                valor = modal.querySelector('textarea').value;
                MRUI.cerrarModal(modal);
            });
            modal.addEventListener('mr:cerrado', () => { modal.remove(); terminar(valor); });
            document.body.appendChild(modal);
            MRUI.abrirModal(modal);
        });
    }

    /* ================= Rutas ================= */

    function rutas() {
        const lista = G.rutasGestion(ids);
        if (P.accion === 'lista') {
            P.vista.innerHTML = P.encabezado('Rutas', `${lista.length} ruta(s).`,
                lineasDisponibles.length ? P.boton('Crear ruta', P.enlace('rutas', 'accion=nuevo')) : '')
                + (!lineasDisponibles.length ? sinLineas() : lista.length ? P.tabla(['Ruta', 'Línea', 'Recorrido', 'Paradas', 'Servicio', 'Publicada', ''], lista.map((r) => `
                    <tr>
                        <td><span class="flex items-center gap-2">${MR.insigniaRuta(r, 'sm')}<span class="font-semibold">${esc(r.nombre)}</span></span></td>
                        <td class="text-sm">${esc(r.linea)}</td>
                        <td class="text-sm">${esc(T.textoSentido(r.sentido))}: ${esc(r.origen)} → ${esc(r.destino)}</td>
                        <td class="text-sm">${r.total_paradas}</td>
                        <td>${MR.estadoHtml(r.estado_servicio)}</td>
                        <td>${P.estadoActivo(r.activa, 'Sí', 'No')}</td>
                        <td class="whitespace-nowrap text-right">
                            ${r.activa ? `<a class="mr-btn mr-btn-secundario mr-btn-sm mr-btn-icono" href="${MR.url('ruta.html?id=' + r.id)}" title="Ver como pasajero">${icono('visibility')}</a>` : ''}
                            ${P.btnEditar(P.enlace('rutas', `accion=editar&id=${r.id}`))}
                        </td>
                    </tr>`)) : `<div class="mr-tarjeta">${MR.htmlVacio('route', 'Aún no hay rutas registradas.')}</div>`);
            return;
        }
        const ruta = P.accion === 'editar' ? lista.find((r) => r.id === P.id) : null;
        if (P.accion === 'editar' && !ruta) { P.noEncontrado('La ruta no existe o no pertenece a tus líneas.', 'rutas', 'Volver a rutas'); return; }
        if (!lineasDisponibles.length) { P.vista.innerHTML = sinLineas(); return; }
        editorRuta(ruta);
    }

    function editorRuta(ruta) {
        const d = ruta ? { ...ruta, aviso: ruta.aviso || '', tarifa: ruta.tarifa ?? '' } : {
            linea_id: lineaInicial(), codigo: '', nombre: '', origen: '', destino: '', sentido: 'ida', color: '#10B981', tarifa: '',
            velocidad_promedio_kmh: 18, estado_servicio: 'normal', aviso: '', activa: true, paradas: [], recorrido: [],
        };
        const disponibles = G.paradasTodas().filter((p) => p.activa);
        const porId = new Map(disponibles.map((p) => [p.id, p]));
        let seleccion = d.paradas.filter((pid) => porId.has(pid));
        let puntos = d.recorrido.map((p) => p.slice());
        let dibujando = false;

        P.vista.innerHTML = `
            ${P.migas('Rutas', 'rutas', ruta ? 'Editar' : 'Nueva')}
            ${P.encabezado(ruta ? 'Editar ruta' : 'Crear ruta', 'Completa los datos, agrega las paradas en orden y dibuja el trazado sobre el mapa.')}
            <form id="formulario" novalidate>
                <section class="mr-tarjeta mb-6 p-6">
                    <h3 class="mb-4 flex items-center gap-2 font-headline-sm text-headline-sm">${icono('info', 'text-secondary')} Datos de la ruta</h3>
                    <div class="grid gap-4 md:grid-cols-12">
                        ${P.campo('linea_id', 'Línea', P.selector('linea_id', opcionesLineas, d.linea_id, 'Selecciona una línea', 'required'), { clase: 'md:col-span-6' })}
                        ${P.campo('codigo', 'Número', P.entrada('codigo', d.codigo, 'required maxlength="10" style="text-transform:uppercase"'), { clase: 'md:col-span-2' })}
                        ${P.campo('nombre', 'Nombre', P.entrada('nombre', d.nombre, 'required maxlength="120"'), { clase: 'md:col-span-4' })}
                        ${P.campo('origen', 'Origen', P.entrada('origen', d.origen, 'required maxlength="120"'), { clase: 'md:col-span-4' })}
                        ${P.campo('destino', 'Destino', P.entrada('destino', d.destino, 'required maxlength="120"'), { clase: 'md:col-span-4' })}
                        ${P.campo('sentido', 'Sentido de circulación', P.selector('sentido', [['ida', 'Ida'], ['vuelta', 'Vuelta'], ['circular', 'Circuito (regresa al inicio)']], d.sentido), { clase: 'md:col-span-4' })}
                        ${P.campo('color', 'Color', `<div class="flex items-center gap-2"><input class="h-11 w-14 cursor-pointer rounded-lg border border-outline-variant bg-white p-1" type="color" id="color" name="color" value="${esc(d.color)}"><span id="vistaCodigo"></span></div>`, { clase: 'md:col-span-3' })}
                        ${P.campo('tarifa', 'Tarifa ($)', P.entrada('tarifa', d.tarifa, 'type="number" step="0.5" min="0"'), { clase: 'md:col-span-2', opcional: true })}
                        ${P.campo('velocidad_promedio_kmh', 'Velocidad prom. (km/h)', P.entrada('velocidad_promedio_kmh', d.velocidad_promedio_kmh, 'type="number" step="0.5" min="5" max="80" required'), { clase: 'md:col-span-3' })}
                        ${P.campo('estado_servicio', 'Estado del servicio', P.selector('estado_servicio', [['normal', 'Operando con normalidad'], ['con_retrasos', 'Con retrasos'], ['suspendida', 'Suspendido']], d.estado_servicio), { clase: 'md:col-span-4' })}
                        ${P.campo('aviso', 'Aviso para pasajeros', P.entrada('aviso', d.aviso, 'maxlength="255" placeholder="Ej. Desvío temporal por obras en…"'), { clase: 'md:col-span-12', opcional: true })}
                        <div class="md:col-span-12">${P.interruptor('activa', 'Ruta publicada (visible para pasajeros)', d.activa)}</div>
                        <p class="mr-ayuda md:col-span-12">La velocidad promedio se usa para estimar los tiempos aproximados de llegada.</p>
                    </div>
                </section>
                <div class="grid gap-6 xl:grid-cols-12">
                    <section class="mr-tarjeta p-6 xl:col-span-5">
                        <h3 class="mb-3 flex items-center gap-2 font-headline-sm text-headline-sm">${icono('format_list_numbered', 'text-secondary')} Paradas en orden <span class="mr-etiqueta" id="totalParadas">0</span></h3>
                        <div class="flex gap-2">
                            ${P.selector('selectorParada', disponibles.map((p) => [p.id, p.nombre]), '', 'Selecciona una parada…', 'aria-label="Parada para agregar"')}
                            <button class="mr-btn mr-btn-secundario shrink-0" type="button" id="btnAgregarParada">${icono('add')} Agregar</button>
                        </div>
                        <p class="mr-ayuda mb-3">También puedes hacer clic en una parada del mapa. Arrastra las paradas para cambiar el orden. ¿Falta una? <a href="${P.enlace('paradas', 'accion=nuevo')}" target="_blank" rel="noopener">Registrarla</a>.</p>
                        <ol id="listaSeleccion" class="flex flex-col gap-2"></ol>
                    </section>
                    <section class="mr-tarjeta p-6 xl:col-span-7">
                        <h3 class="mb-3 flex items-center gap-2 font-headline-sm text-headline-sm">${icono('draw', 'text-secondary')} Trazado en el mapa</h3>
                        <div class="mb-3 flex flex-wrap gap-2">
                            <button class="mr-btn mr-btn-contorno mr-btn-sm" type="button" id="btnDibujar">${icono('edit')} <span>Dibujar trazado</span></button>
                            <button class="mr-btn mr-btn-secundario mr-btn-sm" type="button" id="btnDesdeParadas">${icono('auto_fix_high')} Unir paradas en orden</button>
                            <button class="mr-btn mr-btn-secundario mr-btn-sm" type="button" id="btnDeshacer">${icono('undo')} Deshacer punto</button>
                            <button class="mr-btn mr-btn-secundario mr-btn-sm" type="button" id="btnBorrarTrazado">${icono('delete')} Borrar trazado</button>
                        </div>
                        <div class="mr-mapa-tarjeta relative h-[460px] overflow-hidden rounded-xl ring-1 ring-black/5">
                            <div id="mapa" class="mr-mapa"></div>
                            <div id="avisoDibujo" class="mr-mapa-capa pointer-events-none absolute left-1/2 top-3 hidden -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg">${icono('ads_click', 'text-[18px]')} Haz clic sobre las calles para agregar puntos</div>
                        </div>
                        <p class="mr-ayuda">Activa "Dibujar trazado" y haz clic sobre las calles por donde circula la ruta. <span id="totalPuntos" class="font-semibold"></span></p>
                    </section>
                </div>
                ${P.pieFormulario(P.enlace('rutas'), 'Guardar ruta')}
            </form>`;

        const form = document.getElementById('formulario');
        const inputColor = document.getElementById('color');
        const lista = document.getElementById('listaSeleccion');
        const btnDibujar = document.getElementById('btnDibujar');
        const mapa = MR.crearMapa('mapa');
        const marcadores = new Map();
        const linea = L.polyline(puntos, { color: inputColor.value, weight: 5, opacity: 0.85 }).addTo(mapa);
        const vertices = L.layerGroup().addTo(mapa);

        disponibles.forEach((p) => {
            const m = L.marker([p.latitud, p.longitud], { icon: MR.iconoParada('#94A3B8'), title: p.nombre })
                .bindTooltip(p.nombre)
                .on('click', () => {
                    if (dibujando) { puntos.push([p.latitud, p.longitud]); pintarTrazado(); return; }
                    if (!seleccion.includes(p.id)) { seleccion.push(p.id); pintarParadas(); MRUI.aviso(`Parada "${p.nombre}" agregada.`, 'info', 1800); }
                })
                .addTo(mapa);
            marcadores.set(p.id, m);
        });

        function pintarParadas() {
            const color = inputColor.value;
            document.getElementById('totalParadas').textContent = seleccion.length;
            document.getElementById('vistaCodigo').innerHTML = MR.insigniaRuta({ codigo: form.codigo.value.toUpperCase() || '#', color });
            lista.innerHTML = seleccion.length ? seleccion.map((pid, i) => `
                <li draggable="true" data-indice="${i}" class="group flex cursor-grab items-center gap-2 rounded-lg border border-surface-container bg-surface-container-lowest p-2 transition-all hover:border-secondary/40 hover:shadow-sm active:cursor-grabbing">
                    ${icono('drag_indicator', 'text-[20px] text-outline')}
                    <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style="background:${esc(color)}">${i + 1}</span>
                    <span class="min-w-0 flex-1 truncate text-sm font-semibold">${esc(porId.get(pid).nombre)}</span>
                    <button type="button" class="mr-btn mr-btn-sm mr-btn-icono mr-btn-secundario" data-mover="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">${icono('arrow_upward', 'text-[18px]')}</button>
                    <button type="button" class="mr-btn mr-btn-sm mr-btn-icono mr-btn-secundario" data-mover="${i}" data-dir="1" ${i === seleccion.length - 1 ? 'disabled' : ''} aria-label="Bajar">${icono('arrow_downward', 'text-[18px]')}</button>
                    <button type="button" class="mr-btn mr-btn-sm mr-btn-icono mr-btn-peligro" data-quitar="${i}" aria-label="Quitar">${icono('close', 'text-[18px]')}</button>
                </li>`).join('') : `<li class="rounded-lg border-2 border-dashed border-outline-variant">${MR.htmlVacio('add_location_alt', 'Aún no agregas paradas.')}</li>`;
            marcadores.forEach((m, pid) => {
                const orden = seleccion.indexOf(pid);
                m.setIcon(MR.iconoParada(orden >= 0 ? color : '#94A3B8', orden >= 0));
                m.setTooltipContent(orden >= 0 ? `${orden + 1}. ${porId.get(pid).nombre}` : porId.get(pid).nombre);
            });
        }

        function pintarTrazado() {
            linea.setLatLngs(puntos);
            linea.setStyle({ color: inputColor.value });
            vertices.clearLayers();
            if (dibujando) puntos.forEach((p) => L.circleMarker(p, { radius: 4, color: '#004532', weight: 2, fillColor: '#fff', fillOpacity: 1 }).addTo(vertices));
            document.getElementById('totalPuntos').textContent = puntos.length ? `Puntos del trazado: ${puntos.length}.` : '';
        }

        lista.addEventListener('click', (e) => {
            const mover = e.target.closest('[data-mover]');
            const quitar = e.target.closest('[data-quitar]');
            if (mover) {
                const i = Number(mover.dataset.mover);
                const j = i + Number(mover.dataset.dir);
                [seleccion[i], seleccion[j]] = [seleccion[j], seleccion[i]];
            } else if (quitar) {
                seleccion.splice(Number(quitar.dataset.quitar), 1);
            } else return;
            pintarParadas();
        });

        let arrastrado = null;
        lista.addEventListener('dragstart', (e) => {
            const li = e.target.closest('[data-indice]');
            if (!li) return;
            arrastrado = Number(li.dataset.indice);
            li.classList.add('opacity-40');
            e.dataTransfer.effectAllowed = 'move';
        });
        lista.addEventListener('dragover', (e) => {
            if (arrastrado === null) return;
            e.preventDefault();
            lista.querySelectorAll('[data-indice]').forEach((li) => li.classList.remove('ring-2', 'ring-secondary'));
            e.target.closest('[data-indice]')?.classList.add('ring-2', 'ring-secondary');
        });
        lista.addEventListener('drop', (e) => {
            e.preventDefault();
            const destino = e.target.closest('[data-indice]');
            if (destino && arrastrado !== null) {
                const [pid] = seleccion.splice(arrastrado, 1);
                seleccion.splice(Number(destino.dataset.indice), 0, pid);
            }
            arrastrado = null;
            pintarParadas();
        });
        lista.addEventListener('dragend', () => { arrastrado = null; pintarParadas(); });

        document.getElementById('btnAgregarParada').addEventListener('click', () => {
            const sel = document.getElementById('selectorParada');
            const pid = Number(sel.value);
            if (pid && !seleccion.includes(pid)) { seleccion.push(pid); pintarParadas(); }
            else if (pid) MRUI.aviso('Esa parada ya está en la ruta.', 'advertencia', 2200);
            sel.value = '';
        });

        btnDibujar.addEventListener('click', () => {
            dibujando = !dibujando;
            btnDibujar.classList.toggle('mr-btn-primario', dibujando);
            btnDibujar.classList.toggle('mr-btn-contorno', !dibujando);
            btnDibujar.querySelector('span:last-child').textContent = dibujando ? 'Terminar de dibujar' : 'Dibujar trazado';
            mapa.getContainer().style.cursor = dibujando ? 'crosshair' : '';
            const aviso = document.getElementById('avisoDibujo');
            aviso.classList.toggle('hidden', !dibujando);
            aviso.classList.toggle('flex', dibujando);
            pintarTrazado();
        });

        mapa.on('click', (e) => {
            if (!dibujando) return;
            puntos.push([Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))]);
            pintarTrazado();
        });

        document.getElementById('btnDeshacer').addEventListener('click', () => { puntos.pop(); pintarTrazado(); });
        document.getElementById('btnBorrarTrazado').addEventListener('click', async () => {
            if (puntos.length && !(await MRUI.confirmar({ titulo: '¿Borrar todo el trazado?', mensaje: 'Tendrás que dibujarlo de nuevo.', aceptar: 'Borrar', peligro: true, icono: 'delete' }))) return;
            puntos = [];
            pintarTrazado();
        });
        document.getElementById('btnDesdeParadas').addEventListener('click', async () => {
            if (seleccion.length < 2) { MRUI.aviso('Agrega al menos dos paradas para generar el trazado.', 'advertencia'); return; }
            if (puntos.length && !(await MRUI.confirmar({ titulo: '¿Reemplazar el trazado?', mensaje: 'Se reemplazará el trazado actual por líneas rectas entre las paradas.', aceptar: 'Reemplazar', icono: 'auto_fix_high' }))) return;
            puntos = seleccion.map((pid) => [porId.get(pid).latitud, porId.get(pid).longitud]);
            if (form.sentido.value === 'circular') puntos.push(puntos[0].slice());
            pintarTrazado();
            mapa.fitBounds(linea.getBounds(), { padding: [30, 30] });
        });

        inputColor.addEventListener('input', () => { pintarParadas(); pintarTrazado(); });
        form.codigo.addEventListener('input', pintarParadas);

        P.alGuardar(form, (datos) => G.guardarRuta(ruta?.id || null, { ...datos, paradas: seleccion, recorrido: puntos }, ids),
            { volverA: `${u.rol}/rutas.html`, mensaje: ruta ? 'La ruta se actualizó.' : 'Ruta creada.' });

        pintarParadas();
        pintarTrazado();
        if (puntos.length > 1) mapa.fitBounds(linea.getBounds(), { padding: [30, 30] });
        else if (disponibles.length) mapa.fitBounds(L.latLngBounds(disponibles.map((p) => [p.latitud, p.longitud])), { padding: [30, 30] });
    }

    /* ================= Paradas ================= */

    function paradas() {
        const todas = G.paradasTodas();
        if (P.accion === 'lista') {
            P.vista.innerHTML = `
                ${P.encabezado('Paradas', `${todas.length} parada(s). Las paradas se comparten entre rutas y líneas.${esAdmin ? '' : ' Solo el administrador puede modificar las existentes.'}`,
                    P.boton('Registrar parada', P.enlace('paradas', 'accion=nuevo'), 'add_location_alt'))}
                <div class="mr-tarjeta mb-5 p-4">
                    <div class="relative">
                        ${icono('search', 'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline')}
                        <input class="mr-campo !pl-10" type="search" id="filtroParadas" placeholder="Filtrar por código, nombre o referencia" aria-label="Filtrar paradas">
                    </div>
                </div>
                ${P.tabla(['Código', 'Nombre', 'Referencia', 'Rutas', 'Estado', ...(esAdmin ? [''] : [])], todas.map((p) => `
                    <tr data-texto="${esc(T.norm(`${p.codigo || ''} ${p.nombre} ${p.referencia || ''}`))}">
                        <td class="text-sm font-medium">${p.codigo ? `#${esc(p.codigo)}` : '—'}</td>
                        <td class="font-semibold">${esc(p.nombre)}</td>
                        <td class="text-sm text-on-surface-variant">${esc(p.referencia || '—')}</td>
                        <td class="text-sm">${p.total_rutas}</td>
                        <td>${P.estadoActivo(p.activa, 'Activa', 'Inactiva')}</td>
                        ${esAdmin ? `<td class="text-right">${P.btnEditar(P.enlace('paradas', `accion=editar&id=${p.id}`))}</td>` : ''}
                    </tr>`), { idCuerpo: 'tablaParadas', pie: `<div id="sinCoincidencias" class="hidden">${MR.htmlVacio('search_off', 'No hay paradas que coincidan.')}</div>` })}`;
            document.getElementById('filtroParadas').addEventListener('input', (e) => {
                const termino = T.norm(e.target.value);
                let visibles = 0;
                document.querySelectorAll('#tablaParadas [data-texto]').forEach((tr) => {
                    const ok = !termino || tr.dataset.texto.includes(termino);
                    tr.classList.toggle('hidden', !ok);
                    if (ok) visibles++;
                });
                document.getElementById('sinCoincidencias').classList.toggle('hidden', visibles > 0);
            });
            return;
        }
        if (P.accion === 'editar' && !esAdmin) { P.noEncontrado('Solo el administrador general puede modificar paradas existentes.', 'paradas', 'Volver a paradas'); return; }
        const parada = P.accion === 'editar' ? todas.find((p) => p.id === P.id) : null;
        if (P.accion === 'editar' && !parada) { P.noEncontrado('La parada no existe.', 'paradas', 'Volver a paradas'); return; }
        const d = parada || { codigo: '', nombre: '', referencia: '', latitud: '', longitud: '', activa: true };
        P.vista.innerHTML = `
            ${P.migas('Paradas', 'paradas', parada ? 'Editar' : 'Nueva')}
            ${P.encabezado(parada ? 'Editar parada' : 'Registrar parada')}
            <form id="formulario" class="mr-tarjeta p-6" novalidate>
                <input type="hidden" id="latitud" name="latitud" value="${esc(d.latitud)}">
                <input type="hidden" id="longitud" name="longitud" value="${esc(d.longitud)}">
                <div class="grid gap-4 md:grid-cols-12">
                    ${P.campo('codigo', 'Código', P.entrada('codigo', d.codigo || '', 'maxlength="10" placeholder="Ej. 108" style="text-transform:uppercase"'), { clase: 'md:col-span-2', opcional: true })}
                    ${P.campo('nombre', 'Nombre de la parada', P.entrada('nombre', d.nombre, 'required maxlength="120"'), { clase: 'md:col-span-4' })}
                    ${P.campo('referencia', 'Punto de referencia', P.entrada('referencia', d.referencia || '', 'maxlength="255" placeholder="Ej. Frente al mercado, esquina con…"'), { clase: 'md:col-span-6', opcional: true })}
                    <div class="md:col-span-12">
                        <p class="mr-etiqueta-campo">Ubicación</p>
                        <div class="mr-mapa-tarjeta relative h-[420px] overflow-hidden rounded-xl ring-1 ring-black/5"><div id="mapa" class="mr-mapa"></div></div>
                        <p class="mt-2 text-sm" id="estadoUbicacion"></p>
                    </div>
                    ${esAdmin ? `<div class="md:col-span-12">${P.interruptor('activa', 'Parada activa', d.activa)}</div>` : ''}
                </div>
                ${P.pieFormulario(P.enlace('paradas'))}
            </form>`;
        const lat = document.getElementById('latitud');
        const lng = document.getElementById('longitud');
        const estado = document.getElementById('estadoUbicacion');
        const mapa = MR.crearMapa('mapa');
        let marcador = null;
        const pendiente = () => { estado.innerHTML = `<span class="flex items-center gap-1.5 text-on-surface-variant">${icono('touch_app', 'text-[18px]')} Haz clic en el mapa para marcar dónde está la parada.</span>`; };
        function colocar(latlng) {
            lat.value = latlng.lat.toFixed(6);
            lng.value = latlng.lng.toFixed(6);
            if (marcador) marcador.setLatLng(latlng);
            else {
                marcador = L.marker(latlng, { icon: MR.iconoDestino(), draggable: true }).addTo(mapa);
                marcador.on('dragend', () => colocar(marcador.getLatLng()));
            }
            estado.innerHTML = `<span class="flex items-center gap-1.5 text-secondary">${icono('check_circle', 'text-[18px]')} Ubicación marcada (${lat.value}, ${lng.value}). Arrastra el marcador para ajustarla.</span>`;
        }
        todas.filter((p) => p.id !== parada?.id).forEach((p) => L.marker([p.latitud, p.longitud], { icon: MR.iconoParada('#94A3B8'), title: p.nombre, interactive: false, opacity: 0.6 }).addTo(mapa));
        if (d.latitud !== '' && d.longitud !== '') {
            const inicial = L.latLng(Number(d.latitud), Number(d.longitud));
            colocar(inicial);
            mapa.setView(inicial, 16);
        } else pendiente();
        mapa.on('click', (e) => colocar(e.latlng));
        P.alGuardar(document.getElementById('formulario'), (datos) => G.guardarParada(parada?.id || null, datos, esAdmin),
            { volverA: `${u.rol}/paradas.html`, mensaje: parada ? 'La parada se actualizó.' : 'Parada registrada. Ya puedes agregarla a una ruta.' });
    }

    /* ================= Ubicación de vehículos ================= */

    function ubicacion() {
        P.vista.innerHTML = `
            ${P.encabezado('Ubicación de vehículos', `Unidades en circulación${esAdmin ? ' de todas las líneas' : ' de tu línea'}. La información se actualiza automáticamente.`)}
            <div class="grid gap-6 xl:grid-cols-12">
                <div class="xl:col-span-8">
                    <div class="mr-mapa-tarjeta relative h-[560px] overflow-hidden rounded-xl bg-surface-container shadow-xl ring-1 ring-black/5 mr-anim-escala">
                        <div id="mapa" class="mr-mapa" role="region" aria-label="Mapa de la flota"></div>
                    </div>
                    <div class="mt-3 mr-actualizacion" id="indicador"></div>
                </div>
                <section class="mr-tarjeta h-fit p-5 xl:col-span-4">
                    <h3 class="mb-3 flex items-center gap-2 font-headline-sm text-headline-sm">${icono('directions_bus', 'text-secondary')} En circulación <span class="mr-etiqueta" id="totalFlota">…</span></h3>
                    <div id="listaFlota" class="flex flex-col gap-2">${MR.esqueletos(3, 'h-20')}</div>
                </section>
            </div>`;
        const mapa = MR.crearMapa('mapa');
        const capa = MR.capaVehiculos(mapa);
        const indicador = MR.indicador(document.getElementById('indicador'));
        const listaEl = document.getElementById('listaFlota');
        let primeraVez = true;
        MR.sondeo(async () => {
            indicador.cargando();
            try {
                const { vehiculos: flota, datos_demostracion: demo } = await MR.api('vehiculos', { ambito: 'gestion' }, 60);
                capa.actualizar(flota);
                document.getElementById('totalFlota').textContent = flota.length;
                listaEl.innerHTML = flota.length ? flota.map((v) => `
                    <div class="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-surface-container-low">
                        ${MR.insigniaRuta({ codigo: v.ruta_codigo, color: v.ruta_color }, 'sm')}
                        <div class="min-w-0 flex-1 text-sm">
                            <p class="font-semibold">Unidad ${esc(v.unidad)} <span class="font-normal text-on-surface-variant">· ${esc(v.placa)}</span></p>
                            <p>${esc(v.chofer)} · desde ${esc(v.inicio)}</p>
                            <p class="flex items-center gap-1 text-xs text-on-surface-variant">${MR.estadoVehiculo(v)}</p>
                        </div>
                        ${v.con_ubicacion ? `<button class="mr-btn mr-btn-secundario mr-btn-sm mr-btn-icono" type="button" data-enfocar="${v.vehiculo_id}" aria-label="Ver en el mapa" title="Ver en el mapa">${icono('my_location', 'text-[18px]')}</button>` : ''}
                    </div>`).join('') : MR.htmlVacio('bedtime', 'No hay unidades en circulación en este momento.');
                const conUbicacion = flota.filter((v) => v.con_ubicacion);
                if (primeraVez && conUbicacion.length) {
                    mapa.fitBounds(L.latLngBounds(conUbicacion.map((v) => [v.latitud, v.longitud])), { padding: [40, 40], maxZoom: 15 });
                    primeraVez = false;
                }
                indicador.listo(demo);
            } catch (e) {
                indicador.error();
            }
        });
        listaEl.addEventListener('click', (e) => {
            const b = e.target.closest('[data-enfocar]');
            if (b) capa.enfocar(Number(b.dataset.enfocar));
        });
    }

    /* ================= Reportes de accidentes ================= */

    function reportes() {
        let filtro = ['nuevo', 'revisado'].includes(MR.parametro('estado')) ? MR.parametro('estado') : '';
        P.vista.innerHTML = `
            ${P.encabezado('Reportes de accidentes', 'Accidentes que los usuarios reportaron en tus rutas. Márcalos como revisados cuando los atiendas.')}
            <div class="mr-pestanas mb-5 w-fit" role="tablist" id="filtroReportes">
                <button class="mr-pestana" type="button" data-estado="">Todos</button>
                <button class="mr-pestana" type="button" data-estado="nuevo">Nuevos</button>
                <button class="mr-pestana" type="button" data-estado="revisado">Revisados</button>
            </div>
            <div id="listaReportes" class="flex flex-col gap-4"></div>`;
        const pintar = () => {
            const todos = G.reportes(ids);
            const lista = filtro ? todos.filter((r) => r.estado === filtro) : todos;
            document.querySelectorAll('#filtroReportes [data-estado]').forEach((b) => {
                const n = b.dataset.estado ? todos.filter((r) => r.estado === b.dataset.estado).length : todos.length;
                b.classList.toggle('activa', b.dataset.estado === filtro);
                b.setAttribute('aria-selected', String(b.dataset.estado === filtro));
                b.innerHTML = `${{ '': 'Todos', nuevo: 'Nuevos', revisado: 'Revisados' }[b.dataset.estado]} <span class="ml-1 rounded-full bg-black/10 px-1.5 text-[11px]">${n}</span>`;
            });
            document.getElementById('listaReportes').innerHTML = lista.length ? lista.map((r, i) => `
                <article class="mr-tarjeta p-5 mr-anim-subir ${r.estado === 'nuevo' ? 'border-l-4 border-l-error' : ''}" style="--retraso:${Math.min(i, 10) * 50}ms">
                    <div class="flex flex-wrap items-start gap-4">
                        ${MR.insigniaRuta({ codigo: r.ruta_codigo, color: r.ruta_color })}
                        <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="font-semibold">${esc(r.ruta_nombre)} · ${esc(T.textoSentido(r.ruta_sentido))}</span>
                                ${r.estado === 'nuevo' ? `<span class="mr-estado suspendido">${icono('emergency_home', 'relleno')}Nuevo</span>` : `<span class="mr-etiqueta">${icono('task_alt', 'text-secondary')}Revisado</span>`}
                            </div>
                            <p class="text-xs text-on-surface-variant">${esc(r.linea)} · ${esc(T.formatoFecha(r.creado_en))}</p>
                            <p class="mt-3 text-on-surface">${esc(r.descripcion)}</p>
                            <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                                <span class="flex items-center gap-1">${icono('person', 'text-[16px]')} ${esc(r.reportado_por || 'Usuario sin cuenta')}</span>
                                ${r.contacto ? `<span class="flex items-center gap-1">${icono('call', 'text-[16px]')} ${esc(r.contacto)}</span>` : ''}
                                ${r.latitud !== null ? `<a class="mr-enlace flex items-center gap-1" href="https://www.google.com/maps?q=${r.latitud},${r.longitud}" target="_blank" rel="noopener">${icono('location_on', 'text-[16px]')} Ver lugar en el mapa</a>` : ''}
                                ${r.estado === 'revisado' ? `<span class="flex items-center gap-1">${icono('verified', 'text-[16px]')} Revisado por ${esc(r.revisor || '—')} el ${esc(T.formatoFecha(r.revisado_en))}</span>` : ''}
                            </div>
                        </div>
                        ${r.estado === 'nuevo' ? `<button class="mr-btn mr-btn-contorno mr-btn-sm" type="button" data-revisar="${r.id}">${icono('done_all')} Marcar como revisado</button>` : ''}
                    </div>
                </article>`).join('') : `<div class="mr-tarjeta">${MR.htmlVacio('verified_user', filtro === 'nuevo' ? 'No hay reportes nuevos. ¡Todo en orden!' : 'No hay reportes de accidentes.')}</div>`;
        };
        document.getElementById('filtroReportes').addEventListener('click', (e) => {
            const b = e.target.closest('[data-estado]');
            if (!b) return;
            filtro = b.dataset.estado;
            history.replaceState(null, '', filtro ? `?estado=${filtro}` : location.pathname);
            pintar();
        });
        document.getElementById('listaReportes').addEventListener('click', (e) => {
            const b = e.target.closest('[data-revisar]');
            if (!b) return;
            if (G.marcarRevisado(Number(b.dataset.revisar), u, ids)) MRUI.aviso('El reporte se marcó como revisado.');
            else MRUI.aviso('Ese reporte ya no se puede modificar.', 'advertencia');
            pintar();
        });
        pintar();
    }
})();
