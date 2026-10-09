<?php
/** POST {accion: "entrar", email, password} · POST {accion: "salir"} */
require __DIR__ . '/_base.php';

const INTENTOS_MAXIMOS = 5;
const BLOQUEO_SEG = 60;

$datos = entrada();

switch ($datos['accion'] ?? '') {
    case 'entrar':
        $control = $_SESSION['login'] ?? ['intentos' => 0, 'hasta' => 0];
        if ($control['hasta'] > time()) {
            throw new ErrorApi('Demasiados intentos. Espera ' . ($control['hasta'] - time()) . ' segundos e intenta nuevamente.', 429);
        }
        $email = mb_strtolower(trim((string) ($datos['email'] ?? '')));
        $password = (string) ($datos['password'] ?? '');
        $u = fila('SELECT id, password_hash, activo FROM usuario WHERE email = ?', [$email]);
        if (!$u || !password_verify($password, $u['password_hash'])) {
            $control['intentos']++;
            if ($control['intentos'] >= INTENTOS_MAXIMOS) {
                $control = ['intentos' => 0, 'hasta' => time() + BLOQUEO_SEG];
            }
            $_SESSION['login'] = $control;
            throw new ErrorApi('Correo o contraseña incorrectos.', 401);
        }
        if ((int) $u['activo'] !== 1) {
            throw new ErrorApi('Tu cuenta está desactivada. Comunícate con el administrador.', 403);
        }
        session_regenerate_id(true);
        unset($_SESSION['login']);
        $_SESSION['usuario_id'] = (int) $u['id'];
        ejecutar('UPDATE usuario SET ultimo_acceso = NOW() WHERE id = ?', [$u['id']]);
        if (password_needs_rehash($u['password_hash'], PASSWORD_BCRYPT)) {
            ejecutar('UPDATE usuario SET password_hash = ? WHERE id = ?', [password_hash($password, PASSWORD_BCRYPT), $u['id']]);
        }
        respuestaConDatos();

    case 'salir':
        $_SESSION = [];
        session_regenerate_id(true);
        respuestaConDatos();

    default:
        throw new ErrorApi('Acción no válida.');
}
