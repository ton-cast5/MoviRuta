<?php
require __DIR__ . '/includes/bootstrap.php';

if (es_post()) {
    verificar_csrf();
    cerrar_sesion();
    session_start();
    flash('success', 'Cerraste sesión correctamente.');
}
redirigir('');
