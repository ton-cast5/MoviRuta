<?php

class Usuario
{
    private const SELECT_BASE = 'SELECT u.id, u.nombre, u.email, u.password_hash, u.activo, u.creado_en,
                                        u.ultimo_acceso, r.clave AS rol, r.nombre AS rol_nombre
                                 FROM usuario u JOIN rol r ON r.id = u.rol_id';

    public static function buscarPorEmail(string $email): ?array
    {
        $st = db()->prepare(self::SELECT_BASE . ' WHERE u.email = ?');
        $st->execute([mb_strtolower($email)]);
        return $st->fetch() ?: null;
    }

    public static function buscarPorId(int $id): ?array
    {
        $st = db()->prepare(self::SELECT_BASE . ' WHERE u.id = ?');
        $st->execute([$id]);
        return $st->fetch() ?: null;
    }

    public static function listar(?string $rol = null, string $busqueda = ''): array
    {
        $sql = self::SELECT_BASE . ' WHERE 1 = 1';
        $params = [];
        if ($rol) {
            $sql .= ' AND r.clave = ?';
            $params[] = $rol;
        }
        if ($busqueda !== '') {
            $sql .= ' AND (u.nombre LIKE ? OR u.email LIKE ?)';
            $params[] = "%$busqueda%";
            $params[] = "%$busqueda%";
        }
        $st = db()->prepare($sql . ' ORDER BY r.id DESC, u.nombre');
        $st->execute($params);
        return $st->fetchAll();
    }

    public static function roles(): array
    {
        return db()->query('SELECT id, clave, nombre FROM rol ORDER BY id')->fetchAll();
    }

    public static function emailEnUso(string $email, ?int $exceptoId = null): bool
    {
        $st = db()->prepare('SELECT COUNT(*) FROM usuario WHERE email = ? AND id <> ?');
        $st->execute([mb_strtolower($email), $exceptoId ?? 0]);
        return (int) $st->fetchColumn() > 0;
    }

    public static function crear(string $nombre, string $email, string $password, string $rol): int
    {
        $st = db()->prepare('INSERT INTO usuario (rol_id, nombre, email, password_hash)
                             SELECT id, ?, ?, ? FROM rol WHERE clave = ?');
        $st->execute([$nombre, mb_strtolower($email), password_hash($password, PASSWORD_DEFAULT), $rol]);
        return (int) db()->lastInsertId();
    }

    public static function actualizar(int $id, string $nombre, string $email, string $rol, bool $activo): void
    {
        $st = db()->prepare('UPDATE usuario SET nombre = ?, email = ?, activo = ?,
                                    rol_id = (SELECT id FROM rol WHERE clave = ?)
                             WHERE id = ?');
        $st->execute([$nombre, mb_strtolower($email), $activo ? 1 : 0, $rol, $id]);
    }

    public static function actualizarDatos(int $id, string $nombre, string $email): void
    {
        $st = db()->prepare('UPDATE usuario SET nombre = ?, email = ? WHERE id = ?');
        $st->execute([$nombre, mb_strtolower($email), $id]);
    }

    public static function cambiarPassword(int $id, string $password): void
    {
        $st = db()->prepare('UPDATE usuario SET password_hash = ? WHERE id = ?');
        $st->execute([password_hash($password, PASSWORD_DEFAULT), $id]);
    }

    public static function cambiarActivo(int $id, bool $activo): void
    {
        $st = db()->prepare('UPDATE usuario SET activo = ? WHERE id = ?');
        $st->execute([$activo ? 1 : 0, $id]);
    }

    public static function registrarAcceso(int $id): void
    {
        db()->prepare('UPDATE usuario SET ultimo_acceso = NOW() WHERE id = ?')->execute([$id]);
    }

    public static function contarPorRol(): array
    {
        return db()->query('SELECT r.clave, COUNT(u.id) AS total FROM rol r
                            LEFT JOIN usuario u ON u.rol_id = r.id GROUP BY r.clave')
                   ->fetchAll(PDO::FETCH_KEY_PAIR);
    }
}
