<?php
/** Arranque común de los endpoints JSON: errores en formato JSON y solo lectura (GET). */
define('PETICION_API', true);
require dirname(__DIR__) . '/includes/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    header('Allow: GET');
    responder_json(['error' => 'Método no permitido.'], 405);
}
// La sesión solo se lee; liberarla evita bloquear peticiones simultáneas del mismo usuario.
if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}
