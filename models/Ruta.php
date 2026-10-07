<?php

class Ruta
{
    private const SELECT_BASE = 'SELECT r.*, l.nombre AS linea,
                                        (SELECT COUNT(*) FROM ruta_parada rp WHERE rp.ruta_id = r.id) AS total_paradas
                                 FROM ruta r JOIN linea_transporte l ON l.id = r.linea_id';

    /** Números de ruta puramente numéricos primero (1, 2, 10…), después los alfanuméricos (P1, P2…). */
    private const ORDEN_CODIGO = "r.codigo NOT REGEXP '^[0-9]+$', CAST(r.codigo AS UNSIGNED), r.codigo";

    /**
     * Rutas visibles para el público. $busqueda compara número, nombre, origen, destino y paradas.
     */
    public static function listarPublicas(string $busqueda = '', ?int $lineaId = null): array
    {
        $sql = self::SELECT_BASE . ' WHERE r.activa = 1 AND l.activa = 1';
        $params = [];
        if ($busqueda !== '') {
            $like = "%$busqueda%";
            $sql .= ' AND (r.codigo = ? OR r.nombre LIKE ? OR r.origen LIKE ? OR r.destino LIKE ? OR l.nombre LIKE ?
                           OR EXISTS (SELECT 1 FROM ruta_parada rp JOIN parada p ON p.id = rp.parada_id
                                      WHERE rp.ruta_id = r.id AND (p.nombre LIKE ? OR p.referencia LIKE ?)))';
            array_push($params, $busqueda, $like, $like, $like, $like, $like, $like);
        }
        if ($lineaId) {
            $sql .= ' AND r.linea_id = ?';
            $params[] = $lineaId;
        }
        $st = db()->prepare($sql . ' ORDER BY ' . self::ORDEN_CODIGO . ', r.sentido');
        $st->execute($params);
        return $st->fetchAll();
    }

    /** @param int[]|null $lineas null = todas (gestión: incluye rutas inactivas) */
    public static function listarGestion(?array $lineas): array
    {
        if ($lineas === []) {
            return [];
        }
        $sql = self::SELECT_BASE;
        $params = [];
        if ($lineas !== null) {
            $sql .= ' WHERE r.linea_id IN (' . implode(',', array_fill(0, count($lineas), '?')) . ')';
            $params = $lineas;
        }
        $st = db()->prepare($sql . ' ORDER BY l.nombre, ' . self::ORDEN_CODIGO . ', r.sentido');
        $st->execute($params);
        return $st->fetchAll();
    }

    public static function buscarPorId(int $id, bool $soloPublica = true): ?array
    {
        $sql = self::SELECT_BASE . ' WHERE r.id = ?' . ($soloPublica ? ' AND r.activa = 1 AND l.activa = 1' : '');
        $st = db()->prepare($sql);
        $st->execute([$id]);
        return $st->fetch() ?: null;
    }

    public static function paradas(int $rutaId): array
    {
        $st = db()->prepare('SELECT p.id, p.nombre, p.referencia, p.latitud, p.longitud, rp.orden
                             FROM ruta_parada rp JOIN parada p ON p.id = rp.parada_id
                             WHERE rp.ruta_id = ? ORDER BY rp.orden');
        $st->execute([$rutaId]);
        return $st->fetchAll();
    }

    /** Puntos del trazado como [[lat, lng], ...]. */
    public static function recorrido(int $rutaId): array
    {
        $st = db()->prepare('SELECT latitud, longitud FROM recorrido WHERE ruta_id = ? ORDER BY orden');
        $st->execute([$rutaId]);
        return array_map(fn($p) => [(float) $p['latitud'], (float) $p['longitud']], $st->fetchAll());
    }

    /** Rutas públicas que pasan por una parada. */
    public static function deParada(int $paradaId): array
    {
        $st = db()->prepare('SELECT r.id, r.codigo, r.nombre, r.origen, r.destino, r.sentido, r.color, r.tarifa,
                                    r.velocidad_promedio_kmh, r.estado_servicio, r.aviso, l.nombre AS linea, rp.orden
                             FROM ruta_parada rp
                             JOIN ruta r ON r.id = rp.ruta_id
                             JOIN linea_transporte l ON l.id = r.linea_id
                             WHERE rp.parada_id = ? AND r.activa = 1 AND l.activa = 1
                             ORDER BY ' . self::ORDEN_CODIGO . ', r.sentido');
        $st->execute([$paradaId]);
        return $st->fetchAll();
    }

    /** Rutas públicas por parada para un conjunto de paradas: [parada_id => [rutas...]]. */
    public static function porParadas(array $paradaIds): array
    {
        if (!$paradaIds) {
            return [];
        }
        $marcas = implode(',', array_fill(0, count($paradaIds), '?'));
        $st = db()->prepare("SELECT rp.parada_id, rp.orden, r.id, r.codigo, r.nombre, r.destino, r.sentido, r.color
                             FROM ruta_parada rp
                             JOIN ruta r ON r.id = rp.ruta_id
                             JOIN linea_transporte l ON l.id = r.linea_id
                             WHERE rp.parada_id IN ($marcas) AND r.activa = 1 AND l.activa = 1
                             ORDER BY " . self::ORDEN_CODIGO);
        $st->execute(array_values($paradaIds));
        $agrupado = [];
        foreach ($st->fetchAll() as $fila) {
            $agrupado[(int) $fila['parada_id']][] = $fila;
        }
        return $agrupado;
    }

    /** Rutas con aviso o estado distinto de "normal", para la sección de estado del servicio. */
    public static function conAvisos(): array
    {
        return db()->query("SELECT r.id, r.codigo, r.nombre, r.sentido, r.color, r.estado_servicio, r.aviso
                            FROM ruta r JOIN linea_transporte l ON l.id = r.linea_id
                            WHERE r.activa = 1 AND l.activa = 1 AND (r.estado_servicio <> 'normal' OR r.aviso IS NOT NULL)
                            ORDER BY FIELD(r.estado_servicio, 'suspendida', 'con_retrasos', 'normal'), r.codigo")
                   ->fetchAll();
    }

    public static function codigoEnUso(int $lineaId, string $codigo, string $sentido, ?int $exceptoId = null): bool
    {
        $st = db()->prepare('SELECT COUNT(*) FROM ruta WHERE linea_id = ? AND codigo = ? AND sentido = ? AND id <> ?');
        $st->execute([$lineaId, $codigo, $sentido, $exceptoId ?? 0]);
        return (int) $st->fetchColumn() > 0;
    }

    /**
     * Guarda la ruta con sus paradas (en orden) y su trazado en una sola transacción.
     * @param int[] $paradas
     * @param array<array{0: float, 1: float}> $recorrido
     */
    public static function guardar(?int $id, array $d, array $paradas, array $recorrido): int
    {
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $valores = [$d['linea_id'], $d['codigo'], $d['nombre'], $d['origen'], $d['destino'], $d['sentido'], $d['color'],
                        $d['tarifa'], $d['velocidad_promedio_kmh'], $d['estado_servicio'], $d['aviso'] ?: null, $d['activa'] ? 1 : 0];
            if ($id) {
                $pdo->prepare('UPDATE ruta SET linea_id = ?, codigo = ?, nombre = ?, origen = ?, destino = ?, sentido = ?, color = ?,
                                      tarifa = ?, velocidad_promedio_kmh = ?, estado_servicio = ?, aviso = ?, activa = ?
                               WHERE id = ?')->execute([...$valores, $id]);
                $pdo->prepare('DELETE FROM ruta_parada WHERE ruta_id = ?')->execute([$id]);
                $pdo->prepare('DELETE FROM recorrido WHERE ruta_id = ?')->execute([$id]);
            } else {
                $pdo->prepare('INSERT INTO ruta (linea_id, codigo, nombre, origen, destino, sentido, color, tarifa,
                                                 velocidad_promedio_kmh, estado_servicio, aviso, activa)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')->execute($valores);
                $id = (int) $pdo->lastInsertId();
            }

            $stParada = $pdo->prepare('INSERT INTO ruta_parada (ruta_id, parada_id, orden) VALUES (?, ?, ?)');
            foreach (array_values($paradas) as $i => $paradaId) {
                $stParada->execute([$id, $paradaId, $i + 1]);
            }
            $stPunto = $pdo->prepare('INSERT INTO recorrido (ruta_id, orden, latitud, longitud) VALUES (?, ?, ?, ?)');
            foreach (array_values($recorrido) as $i => [$lat, $lng]) {
                $stPunto->execute([$id, $i + 1, $lat, $lng]);
            }
            $pdo->commit();
            return $id;
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }
}
