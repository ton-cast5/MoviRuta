<?php
/** Conexión PDO a Supabase (PostgreSQL) o a MySQL con los datos de api/config.php. */
function conectarBase(array $c, string $zonaHoraria): PDO
{
    $opciones = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 10,
    ];
    if ($c['motor'] === 'pgsql') {
        // El pooler de Supabase (puerto 6543) reparte las conexiones por transacción y no admite sentencias
        // preparadas en el servidor. Abrir la conexión tarda ~1 s, así que se reutiliza entre peticiones.
        $opciones[PDO::ATTR_EMULATE_PREPARES] = true;
        $opciones[PDO::ATTR_PERSISTENT] = true;
        return new PDO(
            "pgsql:host={$c['host']};port={$c['puerto']};dbname={$c['base']};sslmode=require;gssencmode=disable;connect_timeout=10",
            $c['usuario'],
            $c['password'],
            $opciones
        );
    }

    $opciones[PDO::ATTR_EMULATE_PREPARES] = false;
    if (($c['ssl_ca'] ?? '') !== '') {
        $opciones[PDO::MYSQL_ATTR_SSL_CA] = str_starts_with($c['ssl_ca'], '/') ? $c['ssl_ca'] : __DIR__ . '/' . $c['ssl_ca'];
        $opciones[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = true;
    }
    $pdo = new PDO(
        "mysql:host={$c['host']};port={$c['puerto']};dbname={$c['base']};charset=utf8mb4",
        $c['usuario'],
        $c['password'],
        $opciones
    );
    // Las fechas DATETIME se guardan en la hora de México, igual que las copia sincronizar.php desde Supabase.
    $desfase = (new DateTime('now', new DateTimeZone($zonaHoraria)))->format('P');
    $pdo->exec("SET SESSION sql_mode = 'STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO', time_zone = '{$desfase}'");
    return $pdo;
}
