<?php
/** Arranque de las páginas del chofer: exige el rol y carga su registro de chofer. */
require dirname(__DIR__) . '/includes/bootstrap.php';

$usuario = requiere_rol(ROL_CHOFER);
$chofer = Chofer::porUsuario($usuario['id']);
if (!$chofer) {
    mostrar_error(403, 'Tu cuenta de chofer aún no está asociada a una línea. Comunícate con el dueño de tu línea.');
}
$seccion = 'panel';
