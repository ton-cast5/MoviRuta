<?php
/** Arranque de las páginas del administrador general. */
require dirname(__DIR__) . '/includes/bootstrap.php';

$usuario = requiere_rol(ROL_ADMIN);
