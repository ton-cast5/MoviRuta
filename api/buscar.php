<?php
/**
 * GET api/buscar.php?origen=..&destino=..[&lat=..&lng=..]
 * Rutas directas entre un punto de partida (texto o ubicación actual) y un destino.
 */
require __DIR__ . '/_inicio.php';

responder_json(Buscador::buscar(
    texto_entrada($_GET, 'origen', 80),
    texto_entrada($_GET, 'destino', 80),
    decimal_entrada($_GET, 'lat'),
    decimal_entrada($_GET, 'lng')
));
