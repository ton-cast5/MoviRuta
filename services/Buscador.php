<?php

/**
 * Búsqueda de rutas directas entre un punto de partida y un destino.
 * El origen puede ser un texto (nombre de parada o referencia) o la ubicación actual del usuario;
 * el destino es un texto. No se calculan transbordos.
 */
final class Buscador
{
    private const VELOCIDAD_CAMINANDO_M_MIN = 75;

    public static function buscar(string $origen, string $destino, ?float $lat, ?float $lng): array
    {
        $usaUbicacion = coordenadas_validas($lat, $lng);
        $hayOrigen = $usaUbicacion || $origen !== '';
        $hayDestino = $destino !== '';

        if (!$hayOrigen && !$hayDestino) {
            return self::sinResultados('Escribe un destino o un punto de partida para buscar rutas.');
        }

        // parada_id => metros a pie desde el usuario (null si el origen es un texto)
        $paradasOrigen = [];
        if ($usaUbicacion) {
            foreach (Parada::cercanas($lat, $lng, RADIO_CERCANIA_M, 12) as $p) {
                $paradasOrigen[(int) $p['id']] = ['nombre' => $p['nombre'], 'caminar_m' => (float) $p['distancia_m']];
            }
            if (!$paradasOrigen) {
                return self::sinResultados('No encontramos paradas a menos de ' . formato_distancia(RADIO_CERCANIA_M) . ' de tu ubicación.');
            }
        } elseif ($origen !== '') {
            foreach (Parada::coincidentes($origen) as $p) {
                $paradasOrigen[(int) $p['id']] = ['nombre' => $p['nombre'], 'caminar_m' => null];
            }
            if (!$paradasOrigen) {
                return self::sinResultados('No encontramos paradas que coincidan con "' . $origen . '". Prueba con otro nombre o usa tu ubicación.');
            }
        }

        $paradasDestino = [];
        if ($hayDestino) {
            foreach (Parada::coincidentes($destino) as $p) {
                $paradasDestino[(int) $p['id']] = ['nombre' => $p['nombre']];
            }
            if (!$paradasDestino) {
                return self::sinResultados('No encontramos paradas que coincidan con "' . $destino . '". Prueba con otro nombre o consulta la lista de paradas.');
            }
        }

        $rutasCandidatas = [];
        foreach (Ruta::porParadas(array_keys($paradasOrigen + $paradasDestino)) as $rutas) {
            foreach ($rutas as $r) {
                $rutasCandidatas[(int) $r['id']] = true;
            }
        }

        $resultados = [];
        foreach (array_keys($rutasCandidatas) as $rutaId) {
            $opcion = self::mejorOpcion($rutaId, $paradasOrigen, $paradasDestino, $hayOrigen, $hayDestino);
            if ($opcion) {
                $resultados[] = $opcion;
            }
        }
        usort($resultados, fn($a, $b) => $a['puntaje'] <=> $b['puntaje']);
        foreach ($resultados as &$r) {
            unset($r['puntaje']);
        }

        if (!$resultados) {
            return self::sinResultados('No encontramos una ruta directa entre esos puntos. Prueba con otra parada cercana o consulta el mapa.');
        }
        return ['resultados' => $resultados, 'mensaje' => null];
    }

    private static function mejorOpcion(int $rutaId, array $origenes, array $destinos, bool $hayOrigen, bool $hayDestino): ?array
    {
        $ruta = Ruta::buscarPorId($rutaId);
        if (!$ruta) {
            return null;
        }
        $paradas = Ruta::paradas($rutaId);
        $geometria = GeometriaRuta::deRuta($rutaId);
        if (!$geometria->esValida() || count($paradas) < 2) {
            return null;
        }
        $dist = $geometria->distanciasDeParadas($paradas);
        $circuito = $ruta['sentido'] === 'circular';
        $metrosPorMin = max(1.0, (float) $ruta['velocidad_promedio_kmh'] * 1000 / 60);
        $primera = $paradas[0];
        $ultima = $paradas[count($paradas) - 1];

        $candidatosSubir = $hayOrigen ? array_filter($paradas, fn($p) => isset($origenes[(int) $p['id']])) : [$primera];
        $candidatosBajar = $hayDestino ? array_filter($paradas, fn($p) => isset($destinos[(int) $p['id']])) : [$ultima];

        $mejor = null;
        foreach ($candidatosSubir as $subir) {
            foreach ($candidatosBajar as $bajar) {
                if ((int) $subir['id'] === (int) $bajar['id']) {
                    continue;
                }
                $tramo = $dist[(int) $bajar['id']] - $dist[(int) $subir['id']];
                if ($tramo <= 0) {
                    if (!$circuito) {
                        continue;
                    }
                    $tramo += $geometria->longitud;
                }
                $caminar = $hayOrigen ? ($origenes[(int) $subir['id']]['caminar_m'] ?? null) : null;
                $minutosViaje = $tramo / $metrosPorMin;
                $puntaje = $minutosViaje + ($caminar ?? 0) / self::VELOCIDAD_CAMINANDO_M_MIN;
                if ($mejor === null || $puntaje < $mejor['puntaje']) {
                    $mejor = compact('subir', 'bajar', 'tramo', 'caminar', 'minutosViaje', 'puntaje');
                }
            }
        }
        if (!$mejor) {
            return null;
        }

        $ordenSubir = (int) $mejor['subir']['orden'];
        $ordenBajar = (int) $mejor['bajar']['orden'];
        $intermedias = $ordenBajar > $ordenSubir ? $ordenBajar - $ordenSubir - 1 : count($paradas) - $ordenSubir + $ordenBajar - 1;
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
                'color'           => $ruta['color'],
                'tarifa_texto'    => formato_tarifa($ruta['tarifa']),
                'estado_servicio' => $ruta['estado_servicio'],
                'estado_texto'    => $estado['texto'],
                'aviso'           => $ruta['aviso'],
            ],
            'subir'              => ['id' => (int) $mejor['subir']['id'], 'nombre' => $mejor['subir']['nombre']],
            'bajar'              => ['id' => (int) $mejor['bajar']['id'], 'nombre' => $mejor['bajar']['nombre']],
            'caminar_texto'      => $mejor['caminar'] !== null ? formato_distancia($mejor['caminar']) . ' a pie hasta la parada' : null,
            'duracion_texto'     => formato_minutos_aprox($mejor['minutosViaje']),
            'paradas_intermedias' => $intermedias,
            'paradas_frecuentes' => self::paradasPrincipales($paradas),
            'puntaje'            => $mejor['puntaje'],
        ];
    }

    /** Primera, última y hasta dos paradas intermedias repartidas en el recorrido. */
    private static function paradasPrincipales(array $paradas): array
    {
        $n = count($paradas);
        $indices = array_unique([0, (int) floor(($n - 1) / 3), (int) floor(2 * ($n - 1) / 3), $n - 1]);
        return array_map(fn($i) => $paradas[$i]['nombre'], array_values($indices));
    }

    private static function sinResultados(string $mensaje): array
    {
        return ['resultados' => [], 'mensaje' => $mensaje];
    }
}
