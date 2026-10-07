<?php
require __DIR__ . '/_admin.php';

$titulo = 'Ubicación de vehículos';
$seccion = 'panel';
$menuActivo = 'ubicacion';
$usaMapa = true;
$scripts = ['flota.js'];
$esAdmin = true;
require APP_ROOT . '/views/layout/encabezado.php';
require APP_ROOT . '/views/layout/panel_inicio.php';
require APP_ROOT . '/views/gestion/ubicacion.php';
require APP_ROOT . '/views/layout/panel_fin.php';
require APP_ROOT . '/views/layout/pie.php';
