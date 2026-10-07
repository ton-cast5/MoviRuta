<?php
/**
 * GET api/rutas.php                 Lista de rutas (filtros opcionales: q, linea_id)
 * GET api/rutas.php?id={id}         Detalle de la ruta con paradas y recorrido
 */
require __DIR__ . '/_inicio.php';

$id = entero_entrada($_GET, 'id');
if ($id !== null) {
    $detalle = DetalleRuta::obtener($id);
    if (!$detalle) {
        responder_json(['error' => 'La ruta no existe o no está disponible.'], 404);
    }
    responder_json($detalle);
}

$rutas = Ruta::listarPublicas(texto_entrada($_GET, 'q', 80), entero_entrada($_GET, 'linea_id'));
responder_json(['rutas' => array_map(fn($r) => [
    'id'              => (int) $r['id'],
    'codigo'          => $r['codigo'],
    'nombre'          => $r['nombre'],
    'linea'           => $r['linea'],
    'origen'          => $r['origen'],
    'destino'         => $r['destino'],
    'sentido'         => texto_sentido($r['sentido']),
    'color'           => $r['color'],
    'tarifa_texto'    => formato_tarifa($r['tarifa']),
    'total_paradas'   => (int) $r['total_paradas'],
    'estado_servicio' => $r['estado_servicio'],
    'estado_texto'    => estado_servicio_info($r['estado_servicio'])['texto'],
], $rutas)]);
