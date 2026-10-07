<?php
/**
 * Punto de arranque común: configuración, sesión, autocarga y manejo de errores.
 * Todas las páginas y endpoints lo incluyen en su primera línea.
 */

define('APP_ROOT', dirname(__DIR__));

require APP_ROOT . '/config/config.php';
require APP_ROOT . '/config/database.php';
require APP_ROOT . '/includes/helpers.php';
require APP_ROOT . '/includes/auth.php';

date_default_timezone_set(APP_TIMEZONE);

if (!defined('BASE_URL')) {
    $raiz = str_replace('\\', '/', APP_ROOT);
    $docRoot = isset($_SERVER['DOCUMENT_ROOT']) ? str_replace('\\', '/', (string) realpath($_SERVER['DOCUMENT_ROOT'])) : '';
    $base = ($docRoot !== '' && stripos($raiz, $docRoot) === 0) ? substr($raiz, strlen($docRoot)) : '';
    define('BASE_URL', rtrim($base, '/'));
}

spl_autoload_register(function (string $clase): void {
    foreach (['models', 'services', 'controllers'] as $carpeta) {
        $archivo = APP_ROOT . "/$carpeta/$clase.php";
        if (is_file($archivo)) {
            require $archivo;
            return;
        }
    }
});

ini_set('display_errors', APP_DEBUG ? '1' : '0');
error_reporting(E_ALL);

set_error_handler(function (int $nivel, string $mensaje, string $archivo, int $linea): bool {
    if (!(error_reporting() & $nivel)) {
        return false;
    }
    throw new ErrorException($mensaje, 0, $nivel, $archivo, $linea);
});

set_exception_handler(function (Throwable $e): void {
    registrar_error($e);
    if (es_peticion_api()) {
        responder_json(['error' => 'Ocurrió un problema al obtener la información. Intenta nuevamente.'], 500);
    }
    mostrar_error(500, 'No fue posible completar la operación. Intenta nuevamente en unos momentos.', $e);
});

if (PHP_SAPI !== 'cli' && session_status() === PHP_SESSION_NONE) {
    session_name('MOVIRUTA_SESION');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => BASE_URL === '' ? '/' : BASE_URL . '/',
        'httponly' => true,
        'secure'   => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'samesite' => 'Lax',
    ]);
    ini_set('session.use_strict_mode', '1');
    session_start();
}
