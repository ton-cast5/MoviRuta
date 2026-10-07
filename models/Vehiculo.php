<?php

class Vehiculo
{
    /** @param int[]|null $lineas null = todas las líneas */
    public static function listar(?array $lineas): array
    {
        if ($lineas === []) {
            return [];
        }
        $sql = 'SELECT v.*, l.nombre AS linea,
                       (SELECT r.codigo FROM viaje vj JOIN ruta r ON r.id = vj.ruta_id
                        WHERE vj.vehiculo_id = v.id AND vj.estado = \'en_curso\' LIMIT 1) AS ruta_en_curso
                FROM vehiculo v JOIN linea_transporte l ON l.id = v.linea_id';
        $params = [];
        if ($lineas !== null) {
            $sql .= ' WHERE v.linea_id IN (' . implode(',', array_fill(0, count($lineas), '?')) . ')';
            $params = $lineas;
        }
        $st = db()->prepare($sql . ' ORDER BY l.nombre, v.numero_unidad');
        $st->execute($params);
        return $st->fetchAll();
    }

    public static function buscarPorId(int $id): ?array
    {
        $st = db()->prepare('SELECT v.*, l.nombre AS linea FROM vehiculo v JOIN linea_transporte l ON l.id = v.linea_id WHERE v.id = ?');
        $st->execute([$id]);
        return $st->fetch() ?: null;
    }

    /** Vehículos activos de una línea que no están en un viaje en curso. */
    public static function disponibles(int $lineaId): array
    {
        $st = db()->prepare('SELECT v.* FROM vehiculo v
                             WHERE v.linea_id = ? AND v.activo = 1
                               AND NOT EXISTS (SELECT 1 FROM viaje vj WHERE vj.vehiculo_id = v.id AND vj.estado = \'en_curso\')
                             ORDER BY v.numero_unidad');
        $st->execute([$lineaId]);
        return $st->fetchAll();
    }

    public static function placaEnUso(string $placa, ?int $exceptoId = null): bool
    {
        $st = db()->prepare('SELECT COUNT(*) FROM vehiculo WHERE placa = ? AND id <> ?');
        $st->execute([$placa, $exceptoId ?? 0]);
        return (int) $st->fetchColumn() > 0;
    }

    public static function unidadEnUso(int $lineaId, string $unidad, ?int $exceptoId = null): bool
    {
        $st = db()->prepare('SELECT COUNT(*) FROM vehiculo WHERE linea_id = ? AND numero_unidad = ? AND id <> ?');
        $st->execute([$lineaId, $unidad, $exceptoId ?? 0]);
        return (int) $st->fetchColumn() > 0;
    }

    public static function guardar(?int $id, array $d): int
    {
        $valores = [$d['linea_id'], $d['numero_unidad'], $d['placa'], $d['modelo'] ?: null, $d['capacidad'],
                    $d['cuenta_con_gps'] ? 1 : 0, $d['activo'] ? 1 : 0];
        if ($id) {
            $st = db()->prepare('UPDATE vehiculo SET linea_id = ?, numero_unidad = ?, placa = ?, modelo = ?, capacidad = ?,
                                        cuenta_con_gps = ?, activo = ? WHERE id = ?');
            $st->execute([...$valores, $id]);
            return $id;
        }
        $st = db()->prepare('INSERT INTO vehiculo (linea_id, numero_unidad, placa, modelo, capacidad, cuenta_con_gps, activo)
                             VALUES (?, ?, ?, ?, ?, ?, ?)');
        $st->execute($valores);
        return (int) db()->lastInsertId();
    }
}
