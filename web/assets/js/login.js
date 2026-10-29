/** Inicio de sesión simulado con las cuentas guardadas en el navegador. */
(() => {
    const S = MRServicios;
    const { esc, icono } = MR;
    const $ = (id) => document.getElementById(id);

    /** Solo se regresa a páginas del panel que corresponde al perfil. */
    function destino(usuario) {
        const panel = S.PANELES[usuario.rol];
        const carpeta = panel.split('/')[0] + '/';
        const volver = MR.parametro('volver') || '';
        return volver.startsWith(carpeta) && !volver.includes('..') && !/^[a-z]+:/i.test(volver) ? volver : panel;
    }

    const actual = S.sesion.usuarioActual();
    if (actual) {
        location.replace(MR.url(destino(actual)));
        return;
    }

    const CUENTAS = [
        ['pasajero@moviruta.local', 'Pasajero', 'person', 'Sofía Hernández'],
        ['chofer.juan@moviruta.local', 'Chofer', 'steering', 'Juan Pérez'],
        ['dueno.centro@moviruta.local', 'Dueño de línea', 'business_center', 'Laura Méndez'],
        ['admin@moviruta.local', 'Administrador', 'admin_panel_settings', 'Administrador General'],
    ];
    $('cuentasDemo').innerHTML = CUENTAS.map(([email, rol, ic, nombre], i) => `
        <button type="button" data-email="${esc(email)}" class="mr-anim-subir group flex items-center gap-2 rounded-xl bg-white/10 p-2.5 text-left ring-1 ring-white/10 transition-all hover:-translate-y-0.5 hover:bg-white/20 hover:ring-secondary-container/60" style="--retraso:${320 + i * 60}ms">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container transition-transform group-hover:scale-110">${icono(ic, 'text-[20px]')}</span>
            <span class="min-w-0"><strong class="block text-sm">${esc(rol)}</strong><span class="block truncate text-[11px] text-primary-fixed-dim">${esc(nombre)}</span></span>
        </button>`).join('');

    const form = $('formLogin');
    const email = $('email');
    const password = $('password');
    const error = $('errorLogin');

    $('cuentasDemo').addEventListener('click', (e) => {
        const b = e.target.closest('[data-email]');
        if (!b) return;
        email.value = b.dataset.email;
        password.value = 'moviruta123';
        [email, password].forEach((c) => c.classList.remove('invalido'));
        error.classList.add('hidden');
        form.querySelector('[type=submit]').focus();
        form.classList.remove('mr-anim-escala');
        void form.offsetWidth;
        form.classList.add('mr-anim-escala');
    });

    $('btnVerPassword').addEventListener('click', (e) => {
        const visible = password.type === 'text';
        password.type = visible ? 'password' : 'text';
        e.currentTarget.querySelector('span').textContent = visible ? 'visibility' : 'visibility_off';
        e.currentTarget.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
    });

    function mostrarError(mensaje) {
        error.innerHTML = `${icono('error', 'text-[20px]')}<span>${esc(mensaje)}</span>`;
        error.classList.remove('hidden');
        error.classList.add('flex');
        const tarjeta = form.closest('.rounded-2xl');
        tarjeta.classList.remove('mr-sacudir');
        void tarjeta.offsetWidth;
        tarjeta.classList.add('mr-sacudir');
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const valido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
        email.classList.toggle('invalido', !valido);
        password.classList.toggle('invalido', !password.value);
        if (!valido || !password.value) { mostrarError('Escribe tu correo y tu contraseña.'); return; }

        const boton = form.querySelector('[type=submit]');
        MRUI.cargando(boton, true, 'Entrando…');
        setTimeout(() => {
            const fallo = S.sesion.iniciarSesion(email.value.trim(), password.value);
            if (fallo) {
                MRUI.cargando(boton, false);
                mostrarError(fallo);
                password.select();
                return;
            }
            const usuario = S.sesion.usuarioActual();
            MRUI.ir(destino(usuario), `¡Hola, ${usuario.nombre.split(' ')[0]}! Bienvenido a tu panel.`);
        }, 450);
    });
})();
