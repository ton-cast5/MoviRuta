<?php
/**
 * Configuración general de MoviRuta.
 * Los valores propios de cada equipo (credenciales, puerto, depuración) se
 * definen en config/config.local.php, que no se sube al repositorio.
 */

$configLocal = __DIR__ . '/config.local.php';
if (is_file($configLocal)) {
    require $configLocal;
}

defined('APP_NAME')     || define('APP_NAME', 'MoviRuta');
defined('APP_DEBUG')    || define('APP_DEBUG', false);
defined('APP_TIMEZONE') || define('APP_TIMEZONE', 'America/Mexico_City');

// Base de datos MySQL
defined('DB_HOST') || define('DB_HOST', '127.0.0.1');
defined('DB_PORT') || define('DB_PORT', 3306);
defined('DB_NAME') || define('DB_NAME', 'moviruta');
defined('DB_USER') || define('DB_USER', 'root');
defined('DB_PASS') || define('DB_PASS', '');

// Centro y zoom inicial del mapa (Leaflet), Villahermosa, Tabasco
defined('MAPA_LAT')  || define('MAPA_LAT', 17.9930);
defined('MAPA_LNG')  || define('MAPA_LNG', -92.9310);
defined('MAPA_ZOOM') || define('MAPA_ZOOM', 14);

// Mosaicos del mapa: 'google' (Google Maps) u 'osm' (OpenStreetMap)
defined('MAPA_MOSAICOS') || define('MAPA_MOSAICOS', 'google');

/*
 * Fuente de ubicación de vehículos:
 *  - 'simulada'   : movimiento de demostración calculado sobre el recorrido.
 *  - 'base_datos' : últimas posiciones registradas en la tabla ubicacion_vehiculo
 *                   (donde escribiría un GPS real).
 */
defined('UBICACION_FUENTE')       || define('UBICACION_FUENTE', 'simulada');
defined('UBICACION_VIGENCIA_SEG') || define('UBICACION_VIGENCIA_SEG', 300);

// Intervalo de actualización de vehículos y ETA en la interfaz
defined('ACTUALIZACION_SEG') || define('ACTUALIZACION_SEG', 15);

// Radio para considerar una parada "cercana" al usuario
defined('RADIO_CERCANIA_M') || define('RADIO_CERCANIA_M', 800);

// Correo de atención mostrado en el pie de página (vacío = no se muestra)
defined('SOPORTE_EMAIL') || define('SOPORTE_EMAIL', '');
