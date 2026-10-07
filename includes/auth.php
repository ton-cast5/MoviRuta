<?php
/**
 * Autenticación, sesiones y control de acceso por rol.
 * Los permisos se validan siempre en el servidor; ocultar botones no es suficiente.
 */

const ROL_PASAJERO = 'pasajero';
const ROL_CHOFER   = 'chofer';
const ROL_DUENO    = 'dueno';
const ROL_ADMIN    = 'admin';

const INTENTOS_MAXIMOS_LOGIN = 5;
const BLOQUEO_LOGIN_SEG      = 60;

function usuario_actual(): ?array
{
    return $_SESSION['usuario'] ?? null;
}

function panel_de_rol(string $rol): string
{
    return match ($rol) {
        ROL_CHOFER => 'chofer/',
        ROL_DUENO  => 'dueno/',
        ROL_ADMIN  => 'admin/',
        default    => 'pasajero/',
    };
}

function nombre_rol(string $rol): string
{
    return match ($rol) {
        ROL_CHOFER => 'Chofer',
        ROL_DUENO  => 'Dueño de línea',
        ROL_ADMIN  => 'Administrador general',
        default    => 'Pasajero',
    };
}

/**
 * Intenta iniciar sesión. Devuelve null si fue correcto o el mensaje de error para el usuario.
 */
function iniciar_sesion(string $email, string $password): ?string
{
    $bloqueo = $_SESSION['login_bloqueado_hasta'] ?? 0;
    if ($bloqueo > time()) {
        return 'Demasiados intentos. Espera ' . ($bloqueo - time()) . ' segundos e intenta nuevamente.';
    }

    $usuario = Usuario::buscarPorEmail($email);
    $valido = $usuario && password_verify($password, $usuario['password_hash']);

    if (!$valido) {
        $_SESSION['login_intentos'] = ($_SESSION['login_intentos'] ?? 0) + 1;
        if ($_SESSION['login_intentos'] >= INTENTOS_MAXIMOS_LOGIN) {
            $_SESSION['login_bloqueado_hasta'] = time() + BLOQUEO_LOGIN_SEG;
            $_SESSION['login_intentos'] = 0;
        }
        return 'Correo o contraseña incorrectos.';
    }
    if (!(int) $usuario['activo']) {
        return 'Tu cuenta está desactivada. Comunícate con el administrador.';
    }

    session_regenerate_id(true);
    unset($_SESSION['login_intentos'], $_SESSION['login_bloqueado_hasta']);
    $_SESSION['usuario'] = [
        'id'     => (int) $usuario['id'],
        'nombre' => $usuario['nombre'],
        'email'  => $usuario['email'],
        'rol'    => $usuario['rol'],
    ];
    Usuario::registrarAcceso((int) $usuario['id']);
    return null;
}

function cerrar_sesion(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 3600, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
}

/**
 * Exige sesión iniciada con alguno de los roles indicados.
 * Revalida contra la base de datos para que una desactivación o cambio de rol aplique de inmediato.
 */
function requiere_rol(string ...$roles): array
{
    $sesion = usuario_actual();
    if (!$sesion) {
        if (es_peticion_api()) {
            mostrar_error(401, 'Debes iniciar sesión.');
        }
        $_SESSION['volver_a'] = $_SERVER['REQUEST_URI'] ?? '';
        flash('info', 'Inicia sesión para continuar.');
        redirigir('login.php');
    }

    $usuario = Usuario::buscarPorId($sesion['id']);
    if (!$usuario || !(int) $usuario['activo']) {
        if (es_peticion_api()) {
            mostrar_error(401, 'Tu sesión ya no es válida.');
        }
        cerrar_sesion();
        session_start();
        flash('warning', 'Tu sesión ya no es válida. Inicia sesión nuevamente.');
        redirigir('login.php');
    }
    $_SESSION['usuario']['rol'] = $usuario['rol'];
    $_SESSION['usuario']['nombre'] = $usuario['nombre'];

    if ($roles && !in_array($usuario['rol'], $roles, true)) {
        mostrar_error(403, 'No tienes permiso para acceder a esta sección.');
    }
    return $_SESSION['usuario'];
}
