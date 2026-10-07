<?php

class Linea
{
    /**
     * @param int[]|null $ids Limita el resultado a estas líneas (null = todas).
     */
    public static function listar(?array $ids = null, bool $soloActivas = false): array
    {
        if ($ids === []) {
            return [];
        }
        $sql = 'SELECT l.*, u.nombre AS dueno_nombre,
                       (SELECT COUNT(*) FROM ruta r WHERE r.linea_id = l.id) AS total_rutas,
                       (SELECT COUNT(*) FROM vehiculo v WHERE v.linea_id = l.id) AS total_vehiculos,
                       (SELECT COUNT(*) FROM chofer c WHERE c.linea_id = l.id) AS total_choferes
                FROM linea_transporte l LEFT JOIN usuario u ON u.id = l.dueno_id WHERE 1 = 1';
        $params = [];
        if ($ids !== null) {
            $sql .= ' AND l.id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')';
            $params = $ids;
        }
        if ($soloActivas) {
            $sql .= ' AND l.activa = 1';
        }
        $st = db()->prepare($sql . ' ORDER BY l.nombre');
        $st->execute($params);
        return $st->fetchAll();
    }

    public static function buscarPorId(int $id): ?array
    {
        $st = db()->prepare('SELECT * FROM linea_transporte WHERE id = ?');
        $st->execute([$id]);
        return $st->fetch() ?: null;
    }

    /** Identificadores de las líneas que pertenecen a un dueño. */
    public static function idsDeDueno(int $usuarioId): array
    {
        $st = db()->prepare('SELECT id FROM linea_transporte WHERE dueno_id = ? ORDER BY nombre');
        $st->execute([$usuarioId]);
        return array_map('intval', $st->fetchAll(PDO::FETCH_COLUMN));
    }

    public static function nombreEnUso(string $nombre, ?int $exceptoId = null): bool
    {
        $st = db()->prepare('SELECT COUNT(*) FROM linea_transporte WHERE nombre = ? AND id <> ?');
        $st->execute([$nombre, $exceptoId ?? 0]);
        return (int) $st->fetchColumn() > 0;
    }

    public static function guardar(?int $id, array $d): int
    {
        $valores = [$d['nombre'], $d['descripcion'] ?: null, $d['telefono'] ?: null, $d['dueno_id'], $d['activa'] ? 1 : 0];
        if ($id) {
            $st = db()->prepare('UPDATE linea_transporte SET nombre = ?, descripcion = ?, telefono = ?, dueno_id = ?, activa = ? WHERE id = ?');
            $st->execute([...$valores, $id]);
            return $id;
        }
        $st = db()->prepare('INSERT INTO linea_transporte (nombre, descripcion, telefono, dueno_id, activa) VALUES (?, ?, ?, ?, ?)');
        $st->execute($valores);
        return (int) db()->lastInsertId();
    }
}
