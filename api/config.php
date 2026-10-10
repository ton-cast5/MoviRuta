<?php
/*
 * Conexiones de la API.
 * - Base principal: Supabase (PostgreSQL). Es la que lee y escribe el sitio, en Vercel y en tu computadora.
 * - Respaldo: MySQL de WAMP (Workbench). database/sincronizar.php copia ahí todo lo de Supabase cada minuto.
 *
 * En Vercel los datos de Supabase se leen de las variables de entorno DB_DRIVER, DB_HOST, DB_PORT, DB_NAME, DB_USER
 * y DB_PASSWORD, así las contraseñas nunca quedan en el código. En tu computadora van en api/config.local.php
 * (no se sube a git), por ejemplo:
 *   <?php return ['motor' => 'pgsql', 'host' => 'aws-0-us-east-1.pooler.supabase.com', 'puerto' => 6543,
 *                 'base' => 'postgres', 'usuario' => 'postgres.cnklvwiidyquhrqsgxvf', 'password' => 'tu-clave'];
 * Sin config.local.php ni variables, la API usa directamente el MySQL local (modo sin internet).
 */
$entorno = static function (string $nombre, string $omision): string {
    $valor = getenv($nombre);
    return $valor === false || $valor === '' ? $omision : $valor;
};

$motor = $entorno('DB_DRIVER', 'mysql');
$mysqlLocal = [
    'motor'    => 'mysql',
    'host'     => '127.0.0.1',
    'puerto'   => 3306,
    'base'     => 'MoviRuta',
    'usuario'  => 'root',
    'password' => '',
    'ssl_ca'   => '',
];

$config = [
    'motor'        => $motor,
    'host'         => $entorno('DB_HOST', '127.0.0.1'),
    'puerto'       => (int) $entorno('DB_PORT', $motor === 'pgsql' ? '6543' : '3306'),
    'base'         => $entorno('DB_NAME', $motor === 'pgsql' ? 'postgres' : 'MoviRuta'),
    'usuario'      => $entorno('DB_USER', 'root'),
    'password'     => $entorno('DB_PASSWORD', ''),
    // Solo MySQL en la nube: certificado para TLS. Supabase siempre usa TLS (sslmode=require).
    'ssl_ca'       => $entorno('DB_SSL_CA', $motor === 'mysql' && getenv('VERCEL') ? '/etc/pki/tls/certs/ca-bundle.crt' : ''),
    'zona_horaria' => 'America/Mexico_City',
    'respaldo'     => $mysqlLocal,
];

$local = __DIR__ . '/config.local.php';
if (is_file($local)) {
    $propia = require $local;
    $propia['respaldo'] = array_merge($mysqlLocal, $propia['respaldo'] ?? []);
    $config = array_merge($config, $propia);
}
return $config;
