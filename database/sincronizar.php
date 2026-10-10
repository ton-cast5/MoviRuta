<?php
/**
 * Copia toda la información de Supabase (base principal) al MySQL local de WAMP, para tener el respaldo en Workbench.
 *
 *   php database/sincronizar.php            copia solo si algo cambió desde la última vez
 *   php database/sincronizar.php --forzar   copia siempre
 *
 * La tarea programada "MoviRuta - respaldo" la ejecuta cada minuto (ver README). La copia es completa y en una sola
 * transacción: el respaldo nunca queda a medias. Las sesiones de inicio de sesión no se copian.
 * No edites datos directamente en el MySQL local: la siguiente copia los reemplaza con lo que haya en Supabase.
 */
declare(strict_types=1);

require __DIR__ . '/../api/_conexion.php';
$config = require __DIR__ . '/../api/config.php';
date_default_timezone_set($config['zona_horaria']);

const TABLAS = [
    'rol', 'sentido_ruta', 'estado_servicio', 'estado_viaje', 'estado_reporte', 'tipo_falla', 'estado_falla',
    'usuario', 'linea_transporte', 'chofer', 'vehiculo', 'parada', 'ruta', 'ruta_parada', 'recorrido_punto',
    'viaje', 'reporte_accidente', 'falla_vehiculo', 'historial_consulta',
];
const FILAS_POR_INSERT = 200;
const HUELLA = __DIR__ . '/.huella_sincronizacion';
const BITACORA = __DIR__ . '/sincronizacion.log';
const COPIA_OBLIGATORIA_SEG = 1800;

function anotar(string $mensaje): void
{
    $linea = date('Y-m-d H:i:s') . "  {$mensaje}\n";
    if (is_file(BITACORA) && filesize(BITACORA) > 1_000_000) {
        rename(BITACORA, BITACORA . '.anterior');
    }
    file_put_contents(BITACORA, $linea, FILE_APPEND);
    echo $linea;
}

if ($config['motor'] !== 'pgsql') {
    anotar('No hay nada que copiar: la base principal configurada no es Supabase (revisa api/config.local.php).');
    exit(1);
}

try {
    $supabase = conectarBase($config, $config['zona_horaria']);
    $columnasFecha = [];
    foreach ($supabase->query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND data_type = 'timestamp with time zone'") as $c) {
        $columnasFecha[$c['table_name']][] = $c['column_name'];
    }
    $zona = new DateTimeZone($config['zona_horaria']);
    $datos = [];
    foreach (TABLAS as $tabla) {
        $filas = $supabase->query("SELECT * FROM {$tabla} ORDER BY 1, 2")->fetchAll();
        foreach ($columnasFecha[$tabla] ?? [] as $columna) {
            foreach ($filas as &$f) {
                if ($f[$columna] !== null) {
                    $f[$columna] = (new DateTimeImmutable($f[$columna]))->setTimezone($zona)->format('Y-m-d H:i:s');
                }
            }
            unset($f);
        }
        $datos[$tabla] = $filas;
    }
    $supabase = null;
} catch (Throwable $e) {
    anotar('No se pudo leer Supabase: ' . $e->getMessage());
    exit(1);
}

$huella = md5(serialize($datos));
$forzar = in_array('--forzar', $argv, true) || !is_file(HUELLA) || time() - filemtime(HUELLA) > COPIA_OBLIGATORIA_SEG;
if (!$forzar && trim((string) file_get_contents(HUELLA)) === $huella) {
    exit(0);
}

try {
    $mysql = conectarBase($config['respaldo'], $config['zona_horaria']);
    $mysql->beginTransaction();
    $mysql->exec('SET FOREIGN_KEY_CHECKS = 0');
    foreach (array_reverse(TABLAS) as $tabla) {
        $mysql->exec("DELETE FROM {$tabla}");
    }
    $total = 0;
    foreach (TABLAS as $tabla) {
        foreach (array_chunk($datos[$tabla], FILAS_POR_INSERT) as $bloque) {
            $columnas = array_keys($bloque[0]);
            $fila = '(' . implode(', ', array_fill(0, count($columnas), '?')) . ')';
            $mysql->prepare("INSERT INTO {$tabla} (" . implode(', ', $columnas) . ') VALUES ' . implode(', ', array_fill(0, count($bloque), $fila)))
                ->execute(array_merge(...array_map('array_values', $bloque)));
            $total += count($bloque);
        }
    }
    $mysql->exec('SET FOREIGN_KEY_CHECKS = 1');
    $mysql->commit();
} catch (Throwable $e) {
    if (isset($mysql) && $mysql->inTransaction()) {
        $mysql->rollBack();
    }
    anotar('No se pudo escribir en el MySQL local (¿está encendido WAMP?): ' . $e->getMessage());
    exit(1);
}

file_put_contents(HUELLA, $huella);
anotar("Respaldo actualizado: {$total} filas copiadas de Supabase a MySQL.");
