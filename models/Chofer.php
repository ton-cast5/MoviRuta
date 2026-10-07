<?php

class Chofer
{
    private const SELECT_BASE = 'SELECT c.*, u.nombre, u.email, u.activo AS usuario_activo, l.nombre AS linea
                                 FROM chofer c
                                 JOIN usuario u ON u.id = c.usuario_id
                                 JOIN linea_transporte l ON l.id = c.linea_id';

    public static function porUsuario(int $usuarioId): ?array
    {
        $st = db()->prepare(self::SELECT_BASE . ' WHERE c.usuario_id = ?');
        $st->execute([$usuarioId]);
        return $st->fetch() ?: null;
    }

    public static function buscarPorId(int $id): ?array
    {
        $st = db()->prepare(self::SELECT_BASE . ' WHERE c.id = ?');
        $st->execute([$id]);
        return $st->fetch() ?: null;
    }

    /** @param int[]|null $lineas null = todas las líneas */
    public static function listar(?array $lineas): array
    {
        if ($lineas === []) {
            return [];
        }
        $sql = 'SELECT c.*, u.nombre, u.email, l.nombre AS linea,
                       (SELECT COUNT(*) FROM viaje v WHERE v.chofer_id = c.id AND v.estado = \'en_curso\') AS en_viaje
                FROM chofer c
                JOIN usuario u ON u.id = c.usuario_id
                JOIN linea_transporte l ON l.id = c.linea_id';
        $params = [];
        if ($lineas !== null) {
            $sql .= ' WHERE c.linea_id IN (' . implode(',', array_fill(0, count($lineas), '?')) . ')';
            $params = $lineas;
        }
        $st = db()->prepare($sql . ' ORDER BY l.nombre, u.nombre');
        $st->execute($params);
        return $st->fetchAll();
    }

    public static function licenciaEnUso(string $licencia, ?int $exceptoId = null): bool
    {
        $st = db()->prepare('SELECT COUNT(*) FROM chofer WHERE numero_licencia = ? AND id <> ?');
        $st->execute([$licencia, $exceptoId ?? 0]);
        return (int) $st->fetchColumn() > 0;
    }

    /** Crea la cuenta de usuario (rol chofer) y el registro de chofer en una transacción. */
    public static function crear(array $d): int
    {
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $usuarioId = Usuario::crear($d['nombre'], $d['email'], $d['password'], ROL_CHOFER);
            $st = $pdo->prepare('INSERT INTO chofer (usuario_id, linea_id, numero_licencia, telefono, activo) VALUES (?, ?, ?, ?, ?)');
            $st->execute([$usuarioId, $d['linea_id'], $d['numero_licencia'], $d['telefono'] ?: null, $d['activo'] ? 1 : 0]);
            $id = (int) $pdo->lastInsertId();
            $pdo->commit();
            return $id;
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function actualizar(int $id, array $d): void
    {
        $chofer = self::buscarPorId($id);
        $pdo = db();
        $pdo->beginTransaction();
        try {
            Usuario::actualizarDatos((int) $chofer['usuario_id'], $d['nombre'], $d['email']);
            Usuario::cambiarActivo((int) $chofer['usuario_id'], (bool) $d['activo']);
            if (!empty($d['password'])) {
                Usuario::cambiarPassword((int) $chofer['usuario_id'], $d['password']);
            }
            $st = $pdo->prepare('UPDATE chofer SET linea_id = ?, numero_licencia = ?, telefono = ?, activo = ? WHERE id = ?');
            $st->execute([$d['linea_id'], $d['numero_licencia'], $d['telefono'] ?: null, $d['activo'] ? 1 : 0, $id]);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }
}
