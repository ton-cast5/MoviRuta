<?php
/**
 * POST api/reportar.php   (csrf, ruta_id, descripcion, [contacto], [lat, lng])
 * Registra un accidente reportado por un usuario, con o sin sesión. Lo revisan el dueño de la línea y el administrador.
 */
define('PETICION_API', true);
require dirname(__DIR__) . '/includes/bootstrap.php';

const REPORTES_ESPERA_SEG = 60;
const REPORTES_MAX_POR_HORA = 5;

if (!es_post()) {
    header('Allow: POST');
    responder_json(['error' => 'Método no permitido.'], 405);
}
verificar_csrf();

$ahora = time();
$recientes = array_values(array_filter($_SESSION['reportes_enviados'] ?? [], fn($t) => is_int($t) && $t > $ahora - 3600));
if ($recientes && max($recientes) > $ahora - REPORTES_ESPERA_SEG) {
    responder_json(['error' => 'Ya enviaste un reporte hace un momento. Espera un minuto antes de enviar otro.'], 429);
}
if (count($recientes) >= REPORTES_MAX_POR_HORA) {
    responder_json(['error' => 'Alcanzaste el límite de reportes por hora. Si es una emergencia, llama al 911.'], 429);
}

$rutaId = entero_entrada($_POST, 'ruta_id');
$descripcion = texto_entrada($_POST, 'descripcion', 500);
$contacto = texto_entrada($_POST, 'contacto', 120);
$lat = decimal_entrada($_POST, 'lat');
$lng = decimal_entrada($_POST, 'lng');

$errores = [];
if (!$rutaId || !Ruta::buscarPorId($rutaId)) $errores[] = 'Selecciona la ruta donde ocurrió el accidente.';
if (mb_strlen($descripcion) < 10) $errores[] = 'Describe brevemente qué pasó (al menos 10 caracteres).';
if (!coordenadas_validas($lat, $lng)) {
    $lat = $lng = null;
}
if ($errores) {
    responder_json(['error' => implode(' ', $errores)], 422);
}

$usuario = usuario_actual();
ReporteAccidente::crear($rutaId, $usuario ? (int) $usuario['id'] : null, $descripcion, $contacto, $lat, $lng);
$recientes[] = $ahora;
$_SESSION['reportes_enviados'] = $recientes;

responder_json(['mensaje' => 'Gracias. Tu reporte se envió a la línea de transporte. Si hay personas lesionadas, llama al 911.']);
