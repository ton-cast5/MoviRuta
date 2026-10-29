(() => {
    const form = document.getElementById('formRegistro');
    const error = document.getElementById('errorRegistro');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        error.classList.add('hidden');
        const nombre = form.nombre.value.trim();
        const apellido = form.apellido.value.trim();
        const email = form.email.value.trim();
        const password = form.password.value;
        const password2 = form.password2.value;
        if (password !== password2) {
            error.textContent = 'Las contraseñas no coinciden.';
            error.classList.remove('hidden');
            return;
        }
        const boton = form.querySelector('button[type="submit"]');
        MRUI.cargando(boton, true, 'Creando cuenta…');
        try {
            const msg = MRServicios.sesion.registrarPasajero({ nombre, apellido, email, password });
            if (msg) {
                error.textContent = msg;
                error.classList.remove('hidden');
                return;
            }
            MRUI.avisoSiguiente('¡Cuenta creada! Bienvenido a MoviRuta.', 'exito');
            location.replace(MR.url(MRServicios.PANELES.pasajero));
        } catch (err) {
            error.textContent = err.message || 'No se pudo registrar.';
            error.classList.remove('hidden');
        } finally {
            MRUI.cargando(boton, false);
        }
    });
})();
