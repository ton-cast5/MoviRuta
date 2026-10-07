<?php
/**
 * Conexión única a MySQL mediante PDO con consultas preparadas reales.
 */
final class Database
{
    private static ?PDO $conexion = null;

    public static function conexion(): PDO
    {
        if (self::$conexion === null) {
            $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
            self::$conexion = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
            // Alinea NOW() de MySQL con la zona horaria de PHP.
            self::$conexion->exec("SET time_zone = '" . date('P') . "'");
        }
        return self::$conexion;
    }
}

function db(): PDO
{
    return Database::conexion();
}
