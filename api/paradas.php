<?php
/**
 * GET api/paradas.php                       Lista de paradas (filtro opcional: q, por nombre, referencia o código "#108")
 * GET api/paradas.php?id={id}               Detalle de la parada y rutas que pasan por ella
 * GET api/paradas.php?lat=..&lng=..         Paradas cercanas a una ubicación, con sus rutas
 */
require __DIR__ . '/_inicio.php';

$formatoRuta = fn($r) => [
    'id'      => (int) $r['id'],
    'codigo'  => $r['codigo'],
    'nombre'  => $r['nombre'],
    'destino' => $r['destino'],
    'sentido' => texto_sentido($r['sentido']),
    'color'   => $r['color'],
];

$id = entero_entrada($_GET, 'id');
if ($id !== null) {
    $parada = Parada::buscarPorId($id);
    if (!$parada) {
        responder_json(['error' => 'La parada no existe o no está disponible.'], 404);
    }
    responder_json([
        'parada' => [
            'id'         => (int) $parada['id'],
            'codigo'     => $parada['codigo'],
            'nombre'     => $parada['nombre'],
            'referencia' => $parada['referencia'],
            'latitud'    => (float) $parada['latitud'],
            'longitud'   => (float) $parada['longitud'],
        ],
        'rutas' => array_map($formatoRuta, Ruta::deParada($id)),
    ]);
}

$lat = decimal_entrada($_GET, 'lat');
$lng = decimal_entrada($_GET, 'lng');
if ($lat !== null || $lng !== null) {
    if (!coordenadas_validas($lat, $lng)) {
        responder_json(['error' => 'La ubicación recibida no es válida.'], 400);
    }
    $radio = min(3000, max(100, entero_entrada($_GET, 'radio') ?? RADIO_CERCANIA_M));
    $paradas = Parada::cercanas($lat, $lng, $radio, 15);
} else {
    $paradas = Parada::listarPublicas(texto_entrada($_GET, 'q', 80));
}

$rutasPorParada = Ruta::porParadas(array_map(fn($p) => (int) $p['id'], $paradas));
responder_json([
    'paradas' => array_map(fn($p) => [
        'id'             => (int) $p['id'],
        'codigo'         => $p['codigo'] ?? null,
        'nombre'         => $p['nombre'],
        'referencia'     => $p['referencia'],
        'latitud'        => (float) $p['latitud'],
        'longitud'       => (float) $p['longitud'],
        'distancia_texto' => isset($p['distancia_m']) ? formato_distancia((float) $p['distancia_m']) : null,
        'rutas'          => array_map($formatoRuta, $rutasPorParada[(int) $p['id']] ?? []),
    ], $paradas),
]);
