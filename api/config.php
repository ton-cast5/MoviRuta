<?php
/*
 * Conexión a MySQL.
 * - En tu computadora (WAMP) se usan los valores de abajo: MySQL local, usuario root sin contraseña.
 * - En Vercel (u otro servidor) se leen de las variables de entorno DB_HOST, DB_PORT, DB_NAME, DB_USER,
 *   DB_PASSWORD y DB_SSL_CA, así las contraseñas nunca quedan en el código.
 * Para cambiar algo solo en tu computadora, crea api/config.local.php (no se sube a git), por ejemplo:
 *   <?php return ['password' => 'mi-clave', 'puerto' => 3307];
 */
$entorno = static function (string $nombre, string $omision): string {
    $valor = getenv($nombre);
    return $valor === false || $valor === '' ? $omision : $valor;
};

$config = [
    'host'         => $entorno('DB_HOST', '127.0.0.1'),
    'puerto'       => (int) $entorno('DB_PORT', '3306'),
    'base'         => $entorno('DB_NAME', 'MoviRuta'),
    'usuario'      => $entorno('DB_USER', 'root'),
    'password'     => $entorno('DB_PASSWORD', ''),
    // Certificado para conectarse por TLS (obligatorio en las bases de datos en la nube). En Vercel basta el del sistema;
    // si tu proveedor te da su propio ca.pem, guárdalo en api/ y pon DB_SSL_CA=ca.pem.
    'ssl_ca'       => $entorno('DB_SSL_CA', getenv('VERCEL') ? '/etc/pki/tls/certs/ca-bundle.crt' : ''),
    'zona_horaria' => 'America/Mexico_City',
];

$local = __DIR__ . '/config.local.php';
return is_file($local) ? array_merge($config, require $local) : $config;
