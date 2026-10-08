/** Piezas comunes de los paneles: encabezados de sección, tablas, formularios y validación. */
const MRP = (() => {
    const { esc, icono } = MR;
    const vista = document.getElementById('vista');
    const seccion = document.body.dataset.seccion || 'inicio';
    const accionUrl = MR.parametro('accion');
    const accion = ['nuevo', 'editar'].includes(accionUrl) ? accionUrl : 'lista';
    const id = Number(MR.parametro('id')) || null;

    /** URL de una página del panel del usuario actual. */
    const enlace = (pagina, consulta = '') => MR.url(`${MRUI.usuario?.rol}/${pagina}.html${consulta ? `?${consulta}` : ''}`);

    function encabezado(titulo, descripcion = '', acciones = '') {
        return `
            <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 class="font-headline-md text-headline-md text-on-surface">${esc(titulo)}</h2>
                    ${descripcion ? `<p class="mt-1 text-sm text-on-surface-variant">${descripcion}</p>` : ''}
                </div>
                ${acciones ? `<div class="flex flex-wrap gap-2">${acciones}</div>` : ''}
            </div>`;
    }

    function migas(texto, pagina, actual) {
        return `
            <nav class="mb-3 flex items-center gap-1 text-sm text-on-surface-variant" aria-label="Ruta de navegación">
                <a class="mr-enlace" href="${enlace(pagina)}">${esc(texto)}</a>
                ${icono('chevron_right', 'text-[18px] text-outline')}
                <span aria-current="page">${esc(actual)}</span>
            </nav>`;
    }

    const boton = (texto, href, ic = 'add', clase = 'mr-btn-primario') =>
        `<a class="mr-btn ${clase}" href="${href}">${icono(ic)} ${esc(texto)}</a>`;

    function tabla(columnas, filas, opciones = {}) {
        return `
            <div class="mr-tarjeta overflow-hidden">
                <div class="mr-tabla-contenedor">
                    <table class="mr-tabla">
                        <thead><tr>${columnas.map((c) => `<th${c === '' ? ' class="w-1"' : ''}>${esc(c)}</th>`).join('')}</tr></thead>
                        <tbody${opciones.idCuerpo ? ` id="${opciones.idCuerpo}"` : ''}>${filas.map((f, i) => f.replace('<tr', `<tr style="--i:${Math.min(i, 20)}"`)).join('')}</tbody>
                    </table>
                </div>
                ${opciones.pie || ''}
            </div>`;
    }

    const btnEditar = (href) => `<a class="mr-btn mr-btn-contorno mr-btn-sm" href="${href}">${icono('edit')} Editar</a>`;

    /* ---------- Formularios ---------- */

    function campo(nombre, etiqueta, control, opciones = {}) {
        return `
            <div class="${opciones.clase || ''}">
                <label class="mr-etiqueta-campo" for="${nombre}">${esc(etiqueta)}${opciones.opcional ? ' <span class="font-normal normal-case tracking-normal text-outline">(opcional)</span>' : ''}</label>
                ${control}
                ${opciones.ayuda ? `<p class="mr-ayuda">${opciones.ayuda}</p>` : ''}
            </div>`;
    }

    const entrada = (nombre, valor = '', atributos = '') =>
        `<input class="mr-campo" id="${nombre}" name="${nombre}" value="${esc(valor ?? '')}" ${atributos}>`;

    const selector = (nombre, opciones, valor, vacio = '', atributos = '') => `
        <select class="mr-campo" id="${nombre}" name="${nombre}" ${atributos}>
            ${vacio ? `<option value="">${esc(vacio)}</option>` : ''}
            ${opciones.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(valor ?? '') ? ' selected' : ''}>${esc(t)}</option>`).join('')}
        </select>`;

    const interruptor = (nombre, etiqueta, marcado, atributos = '') => `
        <label class="mr-interruptor">
            <input type="checkbox" id="${nombre}" name="${nombre}"${marcado ? ' checked' : ''} ${atributos}>
            <span class="pista"></span><span>${etiqueta}</span>
        </label>`;

    /** Lee el formulario como objeto; las casillas se convierten en booleanos. */
    function leer(form) {
        const datos = {};
        form.querySelectorAll('input[name], select[name], textarea[name]').forEach((c) => {
            datos[c.name] = c.type === 'checkbox' ? c.checked : c.value;
        });
        return datos;
    }

    function errores(form, lista) {
        let caja = form.querySelector('[data-errores]');
        if (!caja) {
            caja = document.createElement('div');
            caja.dataset.errores = '';
            form.prepend(caja);
        }
        if (!lista.length) { caja.innerHTML = ''; return; }
        caja.innerHTML = `
            <div class="mr-errores mb-5" role="alert">
                <p class="flex items-center gap-2 font-semibold">${icono('error')} Revisa lo siguiente:</p>
                <ul>${lista.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
            </div>`;
        caja.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /** Conecta el envío del formulario con la función que guarda y vuelve a la lista. */
    function alGuardar(form, guardar, { volverA, mensaje }) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const enviar = form.querySelector('[type=submit]');
            MRUI.cargando(enviar, true, 'Guardando…');
            setTimeout(() => {
                const resultado = guardar(leer(form));
                if (resultado.errores.length) {
                    MRUI.cargando(enviar, false);
                    errores(form, resultado.errores);
                    return;
                }
                MRUI.ir(volverA, mensaje);
            }, 250);
        });
    }

    const pieFormulario = (cancelar, texto = 'Guardar') => `
        <div class="mt-6 flex flex-wrap gap-2 border-t border-surface-container pt-5">
            <button class="mr-btn mr-btn-primario" type="submit">${icono('check')} ${esc(texto)}</button>
            <a class="mr-btn mr-btn-contorno" href="${cancelar}">Cancelar</a>
        </div>`;

    function noEncontrado(mensaje, pagina, texto) {
        vista.innerHTML = `<div class="mr-tarjeta mr-anim-escala">${MR.htmlVacio('search_off', mensaje,
            `<a class="mr-btn mr-btn-primario mt-3" href="${enlace(pagina)}">${icono('arrow_back')} ${esc(texto)}</a>`)}</div>`;
    }

    /** Tarjeta de estadística con conteo animado. */
    const estadistica = (etiqueta, valor, ic, href, retraso = 0) => `
        <a class="mr-tarjeta mr-tarjeta-interactiva mr-stat mr-anim-subir" style="--retraso:${retraso}ms" href="${href}">
            <span class="mr-stat-icono">${icono(ic)}</span>
            <p class="mr-stat-valor" data-contar="${Number(valor) || 0}">0</p>
            <p class="mr-stat-etiqueta">${esc(etiqueta)}</p>
        </a>`;

    const estadoActivo = (activo, si = 'Activo', no = 'Inactivo') =>
        activo ? `<span class="mr-etiqueta">${icono('check_circle', 'text-secondary')}${esc(si)}</span>` : `<span class="mr-estado suspendido">${icono('block')}${esc(no)}</span>`;

    return {
        vista, seccion, accion, id, enlace, encabezado, migas, boton, tabla, btnEditar,
        campo, entrada, selector, interruptor, leer, errores, alGuardar, pieFormulario, noEncontrado, estadistica, estadoActivo,
    };
})();
