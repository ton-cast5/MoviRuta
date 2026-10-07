<?php

/**
 * Tiempo estimado de llegada (ETA).
 * ETA = distancia que le falta al vehículo sobre el recorrido hasta la parada / velocidad promedio de la ruta.
 * Es una estimación: no considera tráfico ni paradas prolongadas, por eso se muestra como "Aprox. X min".
 */
final class Eta
{
    /** Margen para considerar que el vehículo está en la parada y no que ya pasó. */
    private const MARGEN_PASO_M = 30;
    public const DISTANCIA_LLEGANDO_M = 120;

    /**
     * Próximas llegadas a una parada, agrupadas por ruta.
     */
    public static function llegadasAParada(int $paradaId, ?int $soloRutaId = null): array
    {
        $rutas = Ruta::deParada($paradaId);
        if ($soloRutaId) {
            $rutas = array_values(array_filter($rutas, fn($r) => (int) $r['id'] === $soloRutaId));
        }
        if (!$rutas) {
            return [];
        }

        $viajes = Viaje::enCursoPorRutas(array_map(fn($r) => (int) $r['id'], $rutas));
        $ubicaciones = Seguimiento::fuente()->ubicaciones($viajes);
        $ahora = time();

        $resultado = [];
        foreach ($rutas as $ruta) {
            $rutaId = (int) $ruta['id'];
            $geometria = GeometriaRuta::deRuta($rutaId);
            $distParadas = $geometria->esValida() ? $geometria->distanciasDeParadas(Ruta::paradas($rutaId)) : [];
            $distParada = $distParadas[$paradaId] ?? null;
            $metrosPorMin = max(1.0, (float) $ruta['velocidad_promedio_kmh'] * 1000 / 60);

            $llegadas = [];
            $enCirculacion = 0;
            $sinUbicacion = 0;
            foreach ($viajes as $v) {
                if ((int) $v['ruta_id'] !== $rutaId) {
                    continue;
                }
                $enCirculacion++;
                $u = $ubicaciones[(int) $v['vehiculo_id']] ?? null;
                if (!$u || $distParada === null) {
                    $sinUbicacion++;
                    continue;
                }
                $distVehiculo = $geometria->distanciaDe($u['latitud'], $u['longitud'])['distancia'];
                $restante = self::metrosRestantes($distVehiculo, $distParada, $geometria->longitud, $ruta['sentido']);
                if ($restante === null) {
                    continue;
                }
                $minutos = $restante / $metrosPorMin;
                $llegadas[] = [
                    'vehiculo_id'          => (int) $v['vehiculo_id'],
                    'unidad'               => $v['numero_unidad'],
                    'minutos'              => (int) max(1, round($minutos)),
                    'texto'                => $restante <= self::DISTANCIA_LLEGANDO_M ? 'Llegando' : formato_minutos_aprox($minutos),
                    'distancia_m'          => (int) round($restante),
                    'actualizado_hace_seg' => max(0, $ahora - $u['actualizado_en']),
                ];
            }
            usort($llegadas, fn($a, $b) => $a['distancia_m'] <=> $b['distancia_m']);

            $resultado[] = [
                'ruta' => [
                    'id'              => $rutaId,
                    'codigo'          => $ruta['codigo'],
                    'nombre'          => $ruta['nombre'],
                    'sentido'         => texto_sentido($ruta['sentido']),
                    'destino'         => $ruta['destino'],
                    'color'           => $ruta['color'],
                    'estado_servicio' => $ruta['estado_servicio'],
                    'estado_texto'    => estado_servicio_info($ruta['estado_servicio'])['texto'],
                    'aviso'           => $ruta['aviso'],
                ],
                'llegadas'       => $llegadas,
                'en_circulacion' => $enCirculacion,
                'sin_ubicacion'  => $sinUbicacion,
            ];
        }
        return $resultado;
    }

    /** Metros que faltan para llegar; null si el vehículo ya pasó la parada (rutas que no son circuito). */
    public static function metrosRestantes(float $distVehiculo, float $distParada, float $longitud, string $sentido): ?float
    {
        $restante = $distParada - $distVehiculo;
        if ($restante < -self::MARGEN_PASO_M) {
            if ($sentido !== 'circular') {
                return null;
            }
            $restante += $longitud;
        }
        return max(0.0, $restante);
    }
}
