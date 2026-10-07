<?php

class Parada
{
    /** Paradas activas que atiende al menos una ruta pública. */
    /** Paradas por las que pasan más rutas activas (sugerencias del buscador). */
    public static function frecuentes(int $limite = 4): array
    {
        $st = db()->prepare('SELECT p.id, p.nombre, COUNT(DISTINCT r.codigo) AS total_rutas
                             FROM parada p
                             JOIN ruta_parada rp ON rp.parada_id = p.id
                             JOIN ruta r ON r.id = rp.ruta_id AND r.activa = 1
                             JOIN linea_transporte l ON l.id = r.linea_id AND l.activa = 1
                             WHERE p.activa = 1
                             GROUP BY p.id, p.nombre
                             ORDER BY total_rutas DESC, p.nombre
                             LIMIT ?');
        $st->bindValue(1, $limite, PDO::PARAM_INT);
        $st->execute();
        return $st->fetchAll();
    }

    public static function listarPublicas(string $busqueda = ''): array
    {
        $sql = 'SELECT p.id, p.nombre, p.referencia, p.latitud, p.longitud
                FROM parada p
                WHERE p.activa = 1
                  AND EXISTS (SELECT 1 FROM ruta_parada rp JOIN ruta r ON r.id = rp.ruta_id
                              JOIN linea_transporte l ON l.id = r.linea_id
                              WHERE rp.parada_id = p.id AND r.activa = 1 AND l.activa = 1)';
        $params = [];
        if ($busqueda !== '') {
            $sql .= ' AND (p.nombre LIKE ? OR p.referencia LIKE ?)';
            $params = ["%$busqueda%", "%$busqueda%"];
        }
        $st = db()->prepare($sql . ' ORDER BY p.nombre');
        $st->execute($params);
        return $st->fetchAll();
    }

    /** Todas las paradas (gestión). */
    public static function listarTodas(): array
    {
        return db()->query('SELECT p.*, (SELECT COUNT(*) FROM ruta_parada rp WHERE rp.parada_id = p.id) AS total_rutas
                            FROM parada p ORDER BY p.nombre')->fetchAll();
    }

    public static function contarActivas(): int
    {
        return (int) db()->query('SELECT COUNT(*) FROM parada WHERE activa = 1')->fetchColumn();
    }

    public static function buscarPorId(int $id, bool $soloActiva = true): ?array
    {
        $st = db()->prepare('SELECT * FROM parada WHERE id = ?' . ($soloActiva ? ' AND activa = 1' : ''));
        $st->execute([$id]);
        return $st->fetch() ?: null;
    }

    /**
     * Paradas públicas dentro de un radio, ordenadas por distancia (metros).
     * Un recuadro previo aprovecha el índice de coordenadas antes de calcular la distancia exacta.
     */
    public static function cercanas(float $lat, float $lng, int $radioM, int $limite = 10): array
    {
        $dLat = $radioM / 111320;
        $dLng = $radioM / (111320 * max(cos(deg2rad($lat)), 0.01));
        $st = db()->prepare('SELECT * FROM (
                                SELECT p.id, p.nombre, p.referencia, p.latitud, p.longitud,
                                       6371000 * 2 * ASIN(SQRT(POWER(SIN(RADIANS(p.latitud - ?) / 2), 2)
                                         + COS(RADIANS(?)) * COS(RADIANS(p.latitud)) * POWER(SIN(RADIANS(p.longitud - ?) / 2), 2))) AS distancia_m
                                FROM parada p
                                WHERE p.activa = 1 AND p.latitud BETWEEN ? AND ? AND p.longitud BETWEEN ? AND ?
                                  AND EXISTS (SELECT 1 FROM ruta_parada rp JOIN ruta r ON r.id = rp.ruta_id
                                              JOIN linea_transporte l ON l.id = r.linea_id
                                              WHERE rp.parada_id = p.id AND r.activa = 1 AND l.activa = 1)
                             ) t WHERE distancia_m <= ? ORDER BY distancia_m LIMIT ' . (int) $limite);
        $st->execute([$lat, $lat, $lng, $lat - $dLat, $lat + $dLat, $lng - $dLng, $lng + $dLng, $radioM]);
        return $st->fetchAll();
    }

    /** Paradas cuyo nombre o referencia coincide con un texto (para el buscador origen/destino). */
    public static function coincidentes(string $texto, int $limite = 15): array
    {
        $st = db()->prepare('SELECT p.id, p.nombre, p.referencia, p.latitud, p.longitud FROM parada p
                             WHERE p.activa = 1 AND (p.nombre LIKE ? OR p.referencia LIKE ?)
                             ORDER BY (p.nombre = ?) DESC, (p.nombre LIKE ?) DESC, p.nombre
                             LIMIT ' . (int) $limite);
        $st->execute(["%$texto%", "%$texto%", $texto, "$texto%"]);
        return $st->fetchAll();
    }

    public static function guardar(?int $id, array $d): int
    {
        $valores = [$d['nombre'], $d['referencia'] ?: null, $d['latitud'], $d['longitud'], $d['activa'] ? 1 : 0];
        if ($id) {
            db()->prepare('UPDATE parada SET nombre = ?, referencia = ?, latitud = ?, longitud = ?, activa = ? WHERE id = ?')
                ->execute([...$valores, $id]);
            return $id;
        }
        db()->prepare('INSERT INTO parada (nombre, referencia, latitud, longitud, activa) VALUES (?, ?, ?, ?, ?)')
            ->execute($valores);
        return (int) db()->lastInsertId();
    }

    /** Devuelve los ids de la lista que existen y están activos, conservando el orden. */
    public static function filtrarActivas(array $ids): array
    {
        if (!$ids) {
            return [];
        }
        $st = db()->prepare('SELECT id FROM parada WHERE activa = 1 AND id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')');
        $st->execute($ids);
        $existentes = array_map('intval', $st->fetchAll(PDO::FETCH_COLUMN));
        return array_values(array_filter($ids, fn($id) => in_array($id, $existentes, true)));
    }
}
