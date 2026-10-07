<?php

/**
 * Posiciones reales: toma el último registro de ubicacion_vehiculo de cada vehículo,
 * siempre que no sea más antiguo que UBICACION_VIGENCIA_SEG.
 * Un dispositivo GPS o un servicio externo solo necesita insertar filas en esa tabla.
 */
final class FuenteUbicacionBaseDatos implements FuenteUbicacion
{
    public function esSimulada(): bool
    {
        return false;
    }

    public function ubicaciones(array $viajes): array
    {
        $ids = array_values(array_unique(array_map(fn($v) => (int) $v['vehiculo_id'], $viajes)));
        if (!$ids) {
            return [];
        }
        $marcas = implode(',', array_fill(0, count($ids), '?'));
        $st = db()->prepare("SELECT u.vehiculo_id, u.latitud, u.longitud, u.registrado_en
                             FROM ubicacion_vehiculo u
                             JOIN (SELECT vehiculo_id, MAX(registrado_en) AS ultima
                                   FROM ubicacion_vehiculo
                                   WHERE vehiculo_id IN ($marcas) AND registrado_en >= NOW() - INTERVAL ? SECOND
                                   GROUP BY vehiculo_id) m
                               ON m.vehiculo_id = u.vehiculo_id AND m.ultima = u.registrado_en");
        $st->execute([...$ids, UBICACION_VIGENCIA_SEG]);

        $resultado = [];
        foreach ($st->fetchAll() as $fila) {
            $resultado[(int) $fila['vehiculo_id']] = [
                'latitud'        => (float) $fila['latitud'],
                'longitud'       => (float) $fila['longitud'],
                'actualizado_en' => strtotime($fila['registrado_en']),
            ];
        }
        return $resultado;
    }
}
