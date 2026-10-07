<?php
/**
 * GET api/eta.php?parada_id={id}[&ruta_id={id}]
 * Tiempo aproximado de llegada de los vehículos en circulación a una parada.
 */
require __DIR__ . '/_inicio.php';

$paradaId = entero_entrada($_GET, 'parada_id');
if ($paradaId === null || !Parada::buscarPorId($paradaId)) {
    responder_json(['error' => 'Selecciona una parada válida.'], 400);
}

responder_json([
    'parada_id'          => $paradaId,
    'rutas'              => Eta::llegadasAParada($paradaId, entero_entrada($_GET, 'ruta_id')),
    'datos_demostracion' => Seguimiento::fuente()->esSimulada(),
    'consultado_en'      => time(),
]);
