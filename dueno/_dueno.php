<?php
/** Arranque de las páginas del dueño de línea: exige el rol y limita todo a sus líneas. */
require dirname(__DIR__) . '/includes/bootstrap.php';

$usuario = requiere_rol(ROL_DUENO);
$lineasDueno = Linea::idsDeDueno($usuario['id']);
