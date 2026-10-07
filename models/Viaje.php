<?php

class Viaje
{
    private const SELECT_BASE = 'SELECT vj.*, r.codigo AS ruta_codigo, r.nombre AS ruta_nombre, r.sentido AS ruta_sentido,
                                        r.color AS ruta_color, r.destino AS ruta_destino, r.velocidad_promedio_kmh,
                                        v.numero_unidad, v.placa, v.cuenta_con_gps, v.linea_id,
                                        v.climatizado, v.tv_a_bordo, v.accesible,
                                        u.nombre AS chofer_nombre, l.nombre AS linea_nombre
                                 FROM viaje vj
                                 JOIN ruta r ON r.id = vj.ruta_id
                                 JOIN linea_transporte l ON l.id = r.linea_id
                                 JOIN vehiculo v ON v.id = vj.vehiculo_id
                                 JOIN chofer c ON c.id = vj.chofer_id
                                 JOIN usuario u ON u.id = c.usuario_id';

    public static function enCursoDeChofer(int $choferId): ?array
    {
        $st = db()->prepare(self::SELECT_BASE . " WHERE vj.chofer_id = ? AND vj.estado = 'en_curso' ORDER BY vj.inicio DESC LIMIT 1");
        $st->execute([$choferId]);
        return $st->fetch() ?: null;
    }

    /** Viajes en curso de una o varias rutas. */
    public static function enCursoPorRutas(array $rutaIds): array
    {
        if (!$rutaIds) {
            return [];
        }
        $marcas = implode(',', array_fill(0, count($rutaIds), '?'));
        $st = db()->prepare(self::SELECT_BASE . " WHERE vj.estado = 'en_curso' AND vj.ruta_id IN ($marcas) AND v.activo = 1 ORDER BY v.numero_unidad");
        $st->execute(array_values($rutaIds));
        return $st->fetchAll();
    }

    /** @param int[]|null $lineas null = todas */
    public static function enCursoPorLineas(?array $lineas): array
    {
        if ($lineas === []) {
            return [];
        }
        $sql = self::SELECT_BASE . " WHERE vj.estado = 'en_curso'";
        $params = [];
        if ($lineas !== null) {
            $sql .= ' AND v.linea_id IN (' . implode(',', array_fill(0, count($lineas), '?')) . ')';
            $params = $lineas;
        }
        $st = db()->prepare($sql . ' ORDER BY v.numero_unidad');
        $st->execute($params);
        return $st->fetchAll();
    }

    public static function historialChofer(int $choferId, string $desde, string $hasta): array
    {
        $st = db()->prepare(self::SELECT_BASE . ' WHERE vj.chofer_id = ? AND vj.inicio >= ? AND vj.inicio < ? + INTERVAL 1 DAY
                                                  ORDER BY vj.inicio DESC');
        $st->execute([$choferId, $desde, $hasta]);
        return $st->fetchAll();
    }

    public static function vehiculoOcupado(int $vehiculoId): bool
    {
        $st = db()->prepare("SELECT COUNT(*) FROM viaje WHERE vehiculo_id = ? AND estado = 'en_curso'");
        $st->execute([$vehiculoId]);
        return (int) $st->fetchColumn() > 0;
    }

    public static function iniciar(int $choferId, int $vehiculoId, int $rutaId, int $pasajerosSalida): int
    {
        db()->prepare("INSERT INTO viaje (chofer_id, vehiculo_id, ruta_id, inicio, pasajeros_salida, estado) VALUES (?, ?, ?, NOW(), ?, 'en_curso')")
            ->execute([$choferId, $vehiculoId, $rutaId, $pasajerosSalida]);
        return (int) db()->lastInsertId();
    }

    /** Finaliza el viaje solo si pertenece al chofer y sigue en curso. */
    public static function finalizar(int $viajeId, int $choferId): bool
    {
        $st = db()->prepare("UPDATE viaje SET estado = 'finalizado', fin = NOW() WHERE id = ? AND chofer_id = ? AND estado = 'en_curso'");
        $st->execute([$viajeId, $choferId]);
        return $st->rowCount() > 0;
    }

    public static function contarEnCurso(?array $lineas = null): int
    {
        return count(self::enCursoPorLineas($lineas));
    }
}
