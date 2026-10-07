<?php
/**
 * Copia este archivo como config.local.php y ajusta los valores de tu equipo.
 * config.local.php está excluido de Git.
 */

define('APP_DEBUG', true);

define('DB_HOST', '127.0.0.1');
define('DB_PORT', 3306);
define('DB_NAME', 'moviruta');
define('DB_USER', 'root');
define('DB_PASS', '');

// Mosaicos del mapa: 'google' u 'osm'
// define('MAPA_MOSAICOS', 'osm');

// Solo si el proyecto se sirve desde un alias de Apache y la detección automática falla:
// define('BASE_URL', '/MoviRuta');
