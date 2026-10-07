<?php

final class GestionRutas extends ControladorGestion
{
    private const SENTIDOS = ['ida', 'vuelta', 'circular'];
    private const ESTADOS = ['normal', 'con_retrasos', 'suspendida'];

    public static function ejecutar(?array $lineas, string $panel): never
    {
        $accion = in_array($_GET['accion'] ?? '', ['nuevo', 'editar'], true) ? $_GET['accion'] : 'lista';
        $lineasDisponibles = Linea::listar($lineas);
        $errores = [];
        $ruta = null;

        if ($accion === 'editar') {
            $ruta = self::exigirEnAlcance(Ruta::buscarPorId((int) entero_entrada($_GET, 'id'), false), $lineas);
        }
        $datos = $ruta ? [
            'linea_id' => (int) $ruta['linea_id'], 'codigo' => $ruta['codigo'], 'nombre' => $ruta['nombre'],
            'origen' => $ruta['origen'], 'destino' => $ruta['destino'], 'sentido' => $ruta['sentido'], 'color' => $ruta['color'],
            'tarifa' => $ruta['tarifa'], 'velocidad_promedio_kmh' => $ruta['velocidad_promedio_kmh'],
            'estado_servicio' => $ruta['estado_servicio'], 'aviso' => (string) $ruta['aviso'], 'activa' => (bool) $ruta['activa'],
            'paradas' => array_map(fn($p) => (int) $p['id'], Ruta::paradas((int) $ruta['id'])),
            'recorrido' => Ruta::recorrido((int) $ruta['id']),
        ] : [
            'linea_id' => count($lineasDisponibles) === 1 ? (int) $lineasDisponibles[0]['id'] : 0, 'codigo' => '', 'nombre' => '',
            'origen' => '', 'destino' => '', 'sentido' => 'ida', 'color' => '#10B981', 'tarifa' => null,
            'velocidad_promedio_kmh' => 18, 'estado_servicio' => 'normal', 'aviso' => '', 'activa' => true,
            'paradas' => [], 'recorrido' => [],
        ];

        if ($accion !== 'lista' && es_post()) {
            verificar_csrf();
            $datos = self::leerFormulario();
            $errores = self::validar($datos, $lineas, $ruta ? (int) $ruta['id'] : null);
            if (!$errores) {
                Ruta::guardar($ruta ? (int) $ruta['id'] : null, $datos, $datos['paradas'], $datos['recorrido']);
                flash('success', $ruta ? 'La ruta se actualizó.' : 'Ruta creada.');
                redirigir($panel . '/rutas.php');
            }
        }

        $paradasDisponibles = array_values(array_filter(Parada::listarTodas(), fn($p) => (int) $p['activa']));
        self::render('rutas', [
            'titulo'             => 'Rutas',
            'menuActivo'         => 'rutas',
            'panel'              => $panel,
            'accion'             => $accion,
            'ruta'               => $ruta,
            'datos'              => $datos,
            'errores'            => $errores,
            'lineasDisponibles'  => $lineasDisponibles,
            'paradasDisponibles' => $paradasDisponibles,
            'rutas'              => $accion === 'lista' ? Ruta::listarGestion($lineas) : [],
            'usaMapa'            => $accion !== 'lista',
            'scripts'            => $accion !== 'lista' ? ['editor-ruta.js'] : [],
        ]);
    }

    private static function leerFormulario(): array
    {
        $paradas = json_decode((string) ($_POST['paradas_json'] ?? '[]'), true);
        $recorrido = json_decode((string) ($_POST['recorrido_json'] ?? '[]'), true);

        $puntos = [];
        if (is_array($recorrido)) {
            foreach (array_slice($recorrido, 0, 2000) as $p) {
                if (is_array($p) && count($p) === 2 && is_numeric($p[0]) && is_numeric($p[1])) {
                    $puntos[] = [round((float) $p[0], 6), round((float) $p[1], 6)];
                }
            }
        }
        return [
            'linea_id'               => (int) entero_entrada($_POST, 'linea_id'),
            'codigo'                 => mb_strtoupper(texto_entrada($_POST, 'codigo', 10)),
            'nombre'                 => texto_entrada($_POST, 'nombre', 120),
            'origen'                 => texto_entrada($_POST, 'origen', 120),
            'destino'                => texto_entrada($_POST, 'destino', 120),
            'sentido'                => texto_entrada($_POST, 'sentido', 10),
            'color'                  => texto_entrada($_POST, 'color', 7),
            'tarifa'                 => decimal_entrada($_POST, 'tarifa'),
            'velocidad_promedio_kmh' => decimal_entrada($_POST, 'velocidad_promedio_kmh'),
            'estado_servicio'        => texto_entrada($_POST, 'estado_servicio', 15),
            'aviso'                  => texto_entrada($_POST, 'aviso', 255),
            'activa'                 => isset($_POST['activa']),
            'paradas'                => is_array($paradas) ? lista_ids($paradas) : [],
            'recorrido'              => $puntos,
        ];
    }

    private static function validar(array &$d, ?array $lineas, ?int $id): array
    {
        $errores = [];
        if (!self::lineaPermitida($d['linea_id'], $lineas) || !Linea::buscarPorId($d['linea_id'])) $errores[] = 'Selecciona una línea válida.';
        if (!preg_match('/^[A-Z0-9\-]{1,10}$/u', $d['codigo'])) $errores[] = 'El número de ruta solo puede tener letras, números o guiones (máximo 10).';
        if (mb_strlen($d['nombre']) < 3) $errores[] = 'Escribe el nombre de la ruta.';
        if ($d['origen'] === '' || $d['destino'] === '') $errores[] = 'Indica el origen y el destino.';
        if (!in_array($d['sentido'], self::SENTIDOS, true)) $errores[] = 'Selecciona el sentido de circulación.';
        elseif (!$errores && Ruta::codigoEnUso($d['linea_id'], $d['codigo'], $d['sentido'], $id)) $errores[] = 'Ya existe una ruta con ese número y sentido en la línea.';
        if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $d['color'])) $errores[] = 'Selecciona un color válido.';
        if ($d['tarifa'] !== null && ($d['tarifa'] < 0 || $d['tarifa'] > 9999)) $errores[] = 'La tarifa no es válida.';
        if ($d['velocidad_promedio_kmh'] === null || $d['velocidad_promedio_kmh'] < 5 || $d['velocidad_promedio_kmh'] > 80) $errores[] = 'La velocidad promedio debe estar entre 5 y 80 km/h.';
        if (!in_array($d['estado_servicio'], self::ESTADOS, true)) $errores[] = 'Selecciona el estado del servicio.';

        $d['paradas'] = Parada::filtrarActivas($d['paradas']);
        if (count($d['paradas']) < 2) $errores[] = 'Agrega al menos dos paradas activas en el orden del recorrido.';
        if (count($d['recorrido']) < 2) $errores[] = 'Dibuja el trazado de la ruta en el mapa (al menos dos puntos).';
        foreach ($d['recorrido'] as [$lat, $lng]) {
            if (!coordenadas_validas($lat, $lng)) {
                $errores[] = 'El trazado contiene puntos no válidos.';
                break;
            }
        }
        return $errores;
    }
}
