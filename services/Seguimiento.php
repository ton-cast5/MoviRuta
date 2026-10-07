<?php

/**
 * Vehículos en circulación y su estado de ubicación.
 * Distingue siempre entre "con ubicación" y "sin información de ubicación".
 */
final class Seguimiento
{
    private static ?FuenteUbicacion $fuente = null;

    public static function fuente(): FuenteUbicacion
    {
        return self::$fuente ??= (UBICACION_FUENTE === 'base_datos'
            ? new FuenteUbicacionBaseDatos()
            : new FuenteUbicacionSimulada());
    }

    public static function vehiculosDeRutas(array $rutaIds): array
    {
        return self::conUbicacion(Viaje::enCursoPorRutas($rutaIds), false);
    }

    /** Vista de gestión: incluye chofer y placa. @param int[]|null $lineas */
    public static function vehiculosDeLineas(?array $lineas): array
    {
        return self::conUbicacion(Viaje::enCursoPorLineas($lineas), true);
    }

    public static function conUbicacion(array $viajes, bool $detalleGestion): array
    {
        $ubicaciones = self::fuente()->ubicaciones($viajes);
        $ahora = time();
        $vehiculos = [];
        foreach ($viajes as $v) {
            $u = $ubicaciones[(int) $v['vehiculo_id']] ?? null;
            $item = [
                'vehiculo_id'          => (int) $v['vehiculo_id'],
                'unidad'               => $v['numero_unidad'],
                'linea'                => $v['linea_nombre'],
                'ruta_id'              => (int) $v['ruta_id'],
                'ruta_codigo'          => $v['ruta_codigo'],
                'ruta_nombre'          => $v['ruta_nombre'],
                'ruta_sentido'         => texto_sentido($v['ruta_sentido']),
                'ruta_color'           => $v['ruta_color'],
                'destino'              => $v['ruta_destino'],
                'con_ubicacion'        => $u !== null,
                'latitud'              => $u['latitud'] ?? null,
                'longitud'             => $u['longitud'] ?? null,
                'actualizado_hace_seg' => $u ? max(0, $ahora - $u['actualizado_en']) : null,
                'proxima_parada'       => $u ? self::proximaParada($v, (float) $u['latitud'], (float) $u['longitud']) : null,
            ];
            if ($detalleGestion) {
                $item['placa'] = $v['placa'];
                $item['chofer'] = $v['chofer_nombre'];
                $item['inicio'] = formato_fecha($v['inicio']);
            }
            $vehiculos[] = $item;
        }
        return $vehiculos;
    }

    /** Siguiente parada sobre el recorrido y tiempo aproximado para llegar a ella. */
    private static function proximaParada(array $viaje, float $lat, float $lng): ?array
    {
        $rutaId = (int) $viaje['ruta_id'];
        $geometria = GeometriaRuta::deRuta($rutaId);
        if (!$geometria->esValida()) {
            return null;
        }
        $paradas = Ruta::paradas($rutaId);
        $distancias = $geometria->distanciasDeParadas($paradas);
        $distVehiculo = $geometria->distanciaDe($lat, $lng)['distancia'];
        $mejor = null;
        foreach ($paradas as $p) {
            $d = $distancias[(int) $p['id']] ?? null;
            if ($d === null) {
                continue;
            }
            $restante = Eta::metrosRestantes($distVehiculo, $d, $geometria->longitud, $viaje['ruta_sentido']);
            if ($restante !== null && ($mejor === null || $restante < $mejor[1])) {
                $mejor = [$p, $restante];
            }
        }
        if ($mejor === null) {
            return null;
        }
        $minutos = $mejor[1] / max(1.0, (float) $viaje['velocidad_promedio_kmh'] * 1000 / 60);
        return [
            'nombre' => $mejor[0]['nombre'],
            'texto'  => $mejor[1] <= Eta::DISTANCIA_LLEGANDO_M ? 'Llegando' : formato_minutos_aprox($minutos),
        ];
    }
}
