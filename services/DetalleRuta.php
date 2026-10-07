<?php

/** Información completa de una ruta: datos, paradas en orden con tiempo aproximado y trazado. */
final class DetalleRuta
{
    public static function obtener(int $rutaId): ?array
    {
        $ruta = Ruta::buscarPorId($rutaId);
        if (!$ruta) {
            return null;
        }
        $paradas = Ruta::paradas($rutaId);
        $geometria = GeometriaRuta::deRuta($rutaId);
        $metrosPorMin = max(1.0, (float) $ruta['velocidad_promedio_kmh'] * 1000 / 60);
        $distancias = $geometria->esValida() ? $geometria->distanciasDeParadas($paradas) : [];

        $paradasDetalle = [];
        foreach ($paradas as $p) {
            $d = $distancias[(int) $p['id']] ?? 0.0;
            $paradasDetalle[] = [
                'id'                => (int) $p['id'],
                'nombre'            => $p['nombre'],
                'referencia'        => $p['referencia'],
                'latitud'           => (float) $p['latitud'],
                'longitud'          => (float) $p['longitud'],
                'orden'             => (int) $p['orden'],
                'minutos_desde_origen' => (int) round($d / $metrosPorMin),
            ];
        }

        $estado = estado_servicio_info($ruta['estado_servicio']);
        return [
            'ruta' => [
                'id'              => (int) $ruta['id'],
                'codigo'          => $ruta['codigo'],
                'nombre'          => $ruta['nombre'],
                'linea'           => $ruta['linea'],
                'origen'          => $ruta['origen'],
                'destino'         => $ruta['destino'],
                'sentido'         => texto_sentido($ruta['sentido']),
                'es_circuito'     => $ruta['sentido'] === 'circular',
                'color'           => $ruta['color'],
                'tarifa'          => $ruta['tarifa'] !== null ? (float) $ruta['tarifa'] : null,
                'tarifa_texto'    => formato_tarifa($ruta['tarifa']),
                'longitud_texto'  => formato_distancia($geometria->longitud),
                'duracion_texto'  => formato_minutos_aprox($geometria->longitud / $metrosPorMin),
                'estado_servicio' => $ruta['estado_servicio'],
                'estado_texto'    => $estado['texto'],
                'aviso'           => $ruta['aviso'],
            ],
            'paradas'   => $paradasDetalle,
            'recorrido' => $geometria->puntos,
        ];
    }
}
