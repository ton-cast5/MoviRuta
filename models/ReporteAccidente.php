<?php

class ReporteAccidente
{
    public static function crear(int $rutaId, ?int $usuarioId, string $descripcion, string $contacto, ?float $lat, ?float $lng): int
    {
        db()->prepare('INSERT INTO reporte_accidente (ruta_id, usuario_id, descripcion, contacto, latitud, longitud) VALUES (?, ?, ?, ?, ?, ?)')
            ->execute([$rutaId, $usuarioId, $descripcion, $contacto ?: null, $lat, $lng]);
        return (int) db()->lastInsertId();
    }

    /** @param int[]|null $lineas null = todas las líneas (administrador) */
    public static function listar(?array $lineas, ?string $estado = null): array
    {
        if ($lineas === []) {
            return [];
        }
        $sql = 'SELECT ra.*, r.codigo AS ruta_codigo, r.nombre AS ruta_nombre, r.sentido AS ruta_sentido, r.color AS ruta_color,
                       r.linea_id, l.nombre AS linea, u.nombre AS reportado_por, rv.nombre AS revisor
                FROM reporte_accidente ra
                JOIN ruta r ON r.id = ra.ruta_id
                JOIN linea_transporte l ON l.id = r.linea_id
                LEFT JOIN usuario u ON u.id = ra.usuario_id
                LEFT JOIN usuario rv ON rv.id = ra.revisado_por
                WHERE 1 = 1';
        $params = [];
        if ($lineas !== null) {
            $sql .= ' AND r.linea_id IN (' . implode(',', array_fill(0, count($lineas), '?')) . ')';
            $params = $lineas;
        }
        if ($estado !== null) {
            $sql .= ' AND ra.estado = ?';
            $params[] = $estado;
        }
        $st = db()->prepare($sql . " ORDER BY ra.estado = 'nuevo' DESC, ra.creado_en DESC LIMIT 200");
        $st->execute($params);
        return $st->fetchAll();
    }

    public static function buscarPorId(int $id): ?array
    {
        $st = db()->prepare('SELECT ra.*, r.linea_id FROM reporte_accidente ra JOIN ruta r ON r.id = ra.ruta_id WHERE ra.id = ?');
        $st->execute([$id]);
        return $st->fetch() ?: null;
    }

    public static function marcarRevisado(int $id, int $usuarioId): void
    {
        db()->prepare("UPDATE reporte_accidente SET estado = 'revisado', revisado_por = ?, revisado_en = NOW() WHERE id = ? AND estado = 'nuevo'")
            ->execute([$usuarioId, $id]);
    }

    /** @param int[]|null $lineas */
    public static function contarNuevos(?array $lineas): int
    {
        return count(self::listar($lineas, 'nuevo'));
    }
}
