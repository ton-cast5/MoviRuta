<?php

/**
 * Búsqueda de rutas entre un punto de partida y un destino: rutas directas y opciones con un transbordo
 * (bajar de una ruta y subir a otra en la misma parada).
 * El origen puede ser un texto (nombre o código de parada) o la ubicación actual del usuario;
 * el destino es un texto.
 */
final class Buscador
{
    private const VELOCIDAD_CAMINANDO_M_MIN = 75;
    /** Minutos que se suman por cambiar de unidad (espera estimada en la parada de transbordo). */
    private const MINUTOS_TRANSBORDO = 8;
    private const MAX_TRANSBORDOS = 3;

    /** @var array<int, array|null> datos de cada ruta consultada durante la búsqueda */
    private static array $rutas = [];

    /**
     * $opciones: accesible (solo líneas con todas sus unidades accesibles),
     *            menos_transbordos (primero las directas, después las de transbordo).
     */
    public static function buscar(string $origen, string $destino, ?float $lat, ?float $lng, array $opciones = []): array
    {
        $usaUbicacion = coordenadas_validas($lat, $lng);
        $hayOrigen = $usaUbicacion || $origen !== '';
        $hayDestino = $destino !== '';
        $soloAccesibles = !empty($opciones['accesible']);

        if (!$hayOrigen && !$hayDestino) {
            return self::sinResultados('Escribe un destino o un punto de partida para buscar rutas.');
        }

        // parada_id => metros a pie desde el usuario (null si el origen es un texto)
        $paradasOrigen = [];
        if ($usaUbicacion) {
            foreach (Parada::cercanas($lat, $lng, RADIO_CERCANIA_M, 12) as $p) {
                $paradasOrigen[(int) $p['id']] = (float) $p['distancia_m'];
            }
            if (!$paradasOrigen) {
                return self::sinResultados('No encontramos paradas a menos de ' . formato_distancia(RADIO_CERCANIA_M) . ' de tu ubicación.');
            }
        } elseif ($origen !== '') {
            foreach (Parada::coincidentes($origen) as $p) {
                $paradasOrigen[(int) $p['id']] = null;
            }
            if (!$paradasOrigen) {
                return self::sinResultados('No encontramos paradas que coincidan con "' . $origen . '". Prueba con otro nombre o usa tu ubicación.');
            }
        }

        $paradasDestino = [];
        if ($hayDestino) {
            foreach (Parada::coincidentes($destino) as $p) {
                $paradasDestino[(int) $p['id']] = null;
            }
            if (!$paradasDestino) {
                return self::sinResultados('No encontramos paradas que coincidan con "' . $destino . '". Prueba con otro nombre o consulta la lista de paradas.');
            }
        }

        $lineasAccesibles = $soloAccesibles ? array_flip(Vehiculo::lineasTotalmenteAccesibles()) : null;
        $permitida = fn(array $d) => $lineasAccesibles === null || isset($lineasAccesibles[(int) $d['ruta']['linea_id']]);

        $rutasOrigen = self::rutasDe(array_keys($paradasOrigen));
        $rutasDestino = self::rutasDe(array_keys($paradasDestino));

        // Directas
        $resultados = [];
        $rutasDirectas = [];
        foreach (array_unique([...$rutasOrigen, ...$rutasDestino]) as $rutaId) {
            $d = self::datosRuta($rutaId);
            if (!$d || !$permitida($d)) {
                continue;
            }
            $subir = $hayOrigen ? $paradasOrigen : [(int) $d['paradas'][0]['id'] => null];
            $bajar = $hayDestino ? array_keys($paradasDestino) : [(int) end($d['paradas'])['id']];
            $tramo = self::mejorTramo($d, $subir, $bajar);
            if ($tramo) {
                $rutasDirectas[$rutaId] = true;
                $resultados[] = self::opcion([$tramo]);
            }
        }

        // Con un transbordo (solo si hay origen y destino)
        if ($hayOrigen && $hayDestino) {
            $transbordos = [];
            foreach ($rutasOrigen as $idA) {
                $a = self::datosRuta($idA);
                if (!$a || isset($rutasDirectas[$idA]) || !$permitida($a)) {
                    continue;
                }
                foreach ($rutasDestino as $idB) {
                    $b = self::datosRuta($idB);
                    if (!$b || $idA === $idB || isset($rutasDirectas[$idB]) || !$permitida($b)
                        || ($a['ruta']['codigo'] === $b['ruta']['codigo'] && $a['ruta']['linea_id'] === $b['ruta']['linea_id'])) {
                        continue;
                    }
                    $mejor = null;
                    foreach (array_intersect(array_keys($a['dist']), array_keys($b['dist'])) as $cambio) {
                        $t1 = self::mejorTramo($a, $paradasOrigen, [$cambio]);
                        $t2 = $t1 ? self::mejorTramo($b, [$cambio => null], array_keys($paradasDestino)) : null;
                        if ($t1 && $t2) {
                            $total = $t1['puntaje'] + $t2['puntaje'] + self::MINUTOS_TRANSBORDO;
                            if ($mejor === null || $total < $mejor[2]) {
                                $mejor = [$t1, $t2, $total];
                            }
                        }
                    }
                    if ($mejor) {
                        $transbordos[] = self::opcion([$mejor[0], $mejor[1]]);
                    }
                }
            }
            usort($transbordos, fn($x, $y) => $x['puntaje'] <=> $y['puntaje']);
            array_push($resultados, ...array_slice($transbordos, 0, self::MAX_TRANSBORDOS));
        }

        $menosTransbordos = !empty($opciones['menos_transbordos']);
        usort($resultados, fn($x, $y) => $menosTransbordos
            ? [$x['transbordos'], $x['puntaje']] <=> [$y['transbordos'], $y['puntaje']]
            : $x['puntaje'] <=> $y['puntaje']);
        foreach ($resultados as &$r) {
            unset($r['puntaje']);
        }
        unset($r);

        if (!$resultados) {
            return self::sinResultados($soloAccesibles
                ? 'No encontramos rutas accesibles entre esos puntos. Quita el filtro "Accesible" para ver todas las opciones.'
                : 'No encontramos una ruta entre esos puntos, ni directa ni con un transbordo. Prueba con otra parada cercana o consulta el mapa.');
        }
        return ['resultados' => $resultados, 'mensaje' => null];
    }

    /** @param int[] $paradaIds @return int[] ids de rutas públicas que pasan por esas paradas */
    private static function rutasDe(array $paradaIds): array
    {
        $ids = [];
        foreach (Ruta::porParadas($paradaIds) as $rutas) {
            foreach ($rutas as $r) {
                $ids[(int) $r['id']] = true;
            }
        }
        return array_keys($ids);
    }

    private static function datosRuta(int $rutaId): ?array
    {
        if (array_key_exists($rutaId, self::$rutas)) {
            return self::$rutas[$rutaId];
        }
        $ruta = Ruta::buscarPorId($rutaId);
        $paradas = $ruta ? Ruta::paradas($rutaId) : [];
        $geometria = $ruta ? GeometriaRuta::deRuta($rutaId) : null;
        if (!$ruta || !$geometria->esValida() || count($paradas) < 2) {
            return self::$rutas[$rutaId] = null;
        }
        return self::$rutas[$rutaId] = [
            'ruta'      => $ruta,
            'paradas'   => $paradas,
            'porId'     => array_column($paradas, null, 'id'),
            'dist'      => $geometria->distanciasDeParadas($paradas),
            'longitud'  => $geometria->longitud,
            'circuito'  => $ruta['sentido'] === 'circular',
            'mpm'       => max(1.0, (float) $ruta['velocidad_promedio_kmh'] * 1000 / 60),
        ];
    }

    /**
     * Mejor forma de recorrer una ruta subiendo en alguna de $subir y bajando en alguna de $bajar.
     * @param array<int, float|null> $subir parada_id => metros a pie (null si no aplica)
     * @param int[] $bajar
     */
    private static function mejorTramo(array $d, array $subir, array $bajar): ?array
    {
        $mejor = null;
        foreach ($subir as $idSubir => $caminar) {
            if (!isset($d['dist'][$idSubir])) {
                continue;
            }
            foreach ($bajar as $idBajar) {
                if ($idSubir === $idBajar || !isset($d['dist'][$idBajar])) {
                    continue;
                }
                $metros = $d['dist'][$idBajar] - $d['dist'][$idSubir];
                if ($metros <= 0) {
                    if (!$d['circuito']) {
                        continue;
                    }
                    $metros += $d['longitud'];
                }
                $minutos = $metros / $d['mpm'];
                $puntaje = $minutos + ($caminar ?? 0) / self::VELOCIDAD_CAMINANDO_M_MIN;
                if ($mejor === null || $puntaje < $mejor['puntaje']) {
                    $mejor = ['d' => $d, 'subir' => $d['porId'][$idSubir], 'bajar' => $d['porId'][$idBajar],
                              'minutos' => $minutos, 'caminar' => $caminar, 'puntaje' => $puntaje];
                }
            }
        }
        return $mejor;
    }

    /** @param array[] $tramos uno (directa) o dos (con transbordo) */
    private static function opcion(array $tramos): array
    {
        $salida = [];
        $minutos = 0;
        $tarifa = 0.0;
        $tarifaConocida = true;
        foreach ($tramos as $t) {
            $ruta = $t['d']['ruta'];
            $paradas = $t['d']['paradas'];
            $ordenSubir = (int) $t['subir']['orden'];
            $ordenBajar = (int) $t['bajar']['orden'];
            $estado = estado_servicio_info($ruta['estado_servicio']);
            $minutos += $t['minutos'];
            if ($ruta['tarifa'] === null) {
                $tarifaConocida = false;
            } else {
                $tarifa += (float) $ruta['tarifa'];
            }
            $salida[] = [
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
                'subir'               => ['id' => (int) $t['subir']['id'], 'nombre' => $t['subir']['nombre']],
                'bajar'               => ['id' => (int) $t['bajar']['id'], 'nombre' => $t['bajar']['nombre']],
                'duracion_texto'      => formato_minutos_aprox($t['minutos']),
                'paradas_intermedias' => $ordenBajar > $ordenSubir ? $ordenBajar - $ordenSubir - 1 : count($paradas) - $ordenSubir + $ordenBajar - 1,
                'paradas_frecuentes'  => self::paradasPrincipales($paradas),
            ];
        }
        $primero = $tramos[0];
        $transbordos = count($tramos) - 1;
        if ($transbordos) {
            $minutos += self::MINUTOS_TRANSBORDO;
        }

        // Las claves de la primera ruta se conservan en la raíz para las opciones directas.
        return $salida[0] + [
            'tipo'               => $transbordos ? 'transbordo' : 'directa',
            'transbordos'        => $transbordos,
            'tramos'             => $salida,
            'caminar_texto'      => $primero['caminar'] !== null ? formato_distancia($primero['caminar']) . ' a pie hasta la parada' : null,
            'duracion_total_texto' => formato_minutos_aprox($minutos),
            'tarifa_total_texto' => $tarifaConocida ? formato_tarifa($tarifa) : 'No disponible',
            'puntaje'            => $minutos + ($primero['caminar'] ?? 0) / self::VELOCIDAD_CAMINANDO_M_MIN,
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
