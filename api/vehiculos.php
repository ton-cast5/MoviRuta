<?php
/**
 * GET api/vehiculos.php?rutas=1,2         Vehículos en circulación de esas rutas con su ubicación
 * GET api/vehiculos.php?ambito=gestion    Flota en circulación del dueño (sus líneas) o del administrador (todas)
 */
require __DIR__ . '/_inicio.php';

if (($_GET['ambito'] ?? '') === 'gestion') {
    $usuario = requiere_rol(ROL_DUENO, ROL_ADMIN);
    $lineas = $usuario['rol'] === ROL_ADMIN ? null : Linea::idsDeDueno($usuario['id']);
    $vehiculos = Seguimiento::vehiculosDeLineas($lineas);
} else {
    $rutas = array_slice(lista_ids($_GET['rutas'] ?? ''), 0, 50);
    if (!$rutas) {
        responder_json(['error' => 'Indica al menos una ruta.'], 400);
    }
    $vehiculos = Seguimiento::vehiculosDeRutas($rutas);
}

responder_json([
    'vehiculos'          => $vehiculos,
    'datos_demostracion' => Seguimiento::fuente()->esSimulada(),
    'consultado_en'      => time(),
]);
