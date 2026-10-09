<?php
declare(strict_types=1);

const CONFIG_API = __DIR__ . '/config.php';
$GLOBALS['config'] = require CONFIG_API;
date_default_timezone_set($GLOBALS['config']['zona_horaria']);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

final class ErrorApi extends Exception
{
    public function __construct(string $mensaje, public readonly int $codigo = 400)
    {
        parent::__construct($mensaje);
    }
}

function responder(array $datos, int $codigo = 200): never
{
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

set_exception_handler(function (Throwable $e): void {
    if ($e instanceof ErrorApi) {
        responder(['ok' => false, 'mensaje' => $e->getMessage()], $e->codigo);
    }
    error_log('MoviRuta: ' . $e);
    responder(['ok' => false, 'mensaje' => 'Ocurrió un error en el servidor. Intenta de nuevo.'], 500);
});

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = $GLOBALS['config'];
        $opciones = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        if ($c['ssl_ca'] !== '') {
            $opciones[PDO::MYSQL_ATTR_SSL_CA] = str_starts_with($c['ssl_ca'], '/') ? $c['ssl_ca'] : __DIR__ . '/' . $c['ssl_ca'];
            $opciones[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = true;
        }
        try {
            $pdo = new PDO(
                "mysql:host={$c['host']};port={$c['puerto']};dbname={$c['base']};charset=utf8mb4",
                $c['usuario'],
                $c['password'],
                $opciones
            );
        } catch (PDOException $e) {
            error_log('MoviRuta: ' . $e->getMessage());
            throw new ErrorApi('No se pudo conectar con la base de datos MoviRuta. Revisa que MySQL esté encendido y los datos de api/config.php.', 503);
        }
        $pdo->exec("SET SESSION sql_mode = 'STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO'");
    }
    return $pdo;
}

function consultar(string $sql, array $parametros = []): array
{
    $st = db()->prepare($sql);
    $st->execute($parametros);
    return $st->fetchAll();
}

function fila(string $sql, array $parametros = []): ?array
{
    $st = db()->prepare($sql);
    $st->execute($parametros);
    $f = $st->fetch();
    return $f === false ? null : $f;
}

function ejecutar(string $sql, array $parametros = []): int
{
    $st = db()->prepare($sql);
    $st->execute($parametros);
    return $st->rowCount();
}

/*
 * Sesiones guardadas en MySQL (tabla sesion) en lugar de archivos: en Vercel cada petición puede atenderla un
 * servidor distinto, y con archivos la sesión se perdería.
 */
const DURACION_SESION = 8 * 3600;

final class SesionesMySQL implements SessionHandlerInterface
{
    public function open(string $ruta, string $nombre): bool { return true; }
    public function close(): bool { return true; }

    public function read(string $id): string
    {
        return fila('SELECT datos FROM sesion WHERE id = ? AND expira > UNIX_TIMESTAMP()', [$id])['datos'] ?? '';
    }

    public function write(string $id, string $datos): bool
    {
        ejecutar(
            'INSERT INTO sesion (id, datos, expira) VALUES (?, ?, UNIX_TIMESTAMP() + ?) ON DUPLICATE KEY UPDATE datos = VALUES(datos), expira = VALUES(expira)',
            [$id, $datos, DURACION_SESION]
        );
        return true;
    }

    public function destroy(string $id): bool
    {
        ejecutar('DELETE FROM sesion WHERE id = ?', [$id]);
        return true;
    }

    public function gc(int $vigencia): int
    {
        return ejecutar('DELETE FROM sesion WHERE expira < UNIX_TIMESTAMP()');
    }
}

ini_set('session.gc_maxlifetime', (string) DURACION_SESION);
ini_set('session.gc_probability', '1');
ini_set('session.gc_divisor', '100');
session_set_save_handler(new SesionesMySQL(), true);
session_name('moviruta');
session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Lax',
    'secure' => ($_SERVER['HTTPS'] ?? '') === 'on' || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https',
]);
session_start();

/** Cuerpo JSON de una petición POST hecha por la propia aplicación (el encabezado evita envíos desde otros sitios). */
function entrada(): array
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new ErrorApi('Método no permitido.', 405);
    }
    if (($_SERVER['HTTP_X_MOVIRUTA'] ?? '') !== '1') {
        throw new ErrorApi('Solicitud no válida.', 400);
    }
    $datos = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($datos)) {
        throw new ErrorApi('Solicitud no válida.', 400);
    }
    return $datos;
}

/** Usuario con sesión iniciada (o null). */
function usuarioSesion(bool $recargar = false): ?array
{
    static $usuario = false;
    if ($usuario !== false && !$recargar) {
        return $usuario;
    }
    $usuario = null;
    $id = $_SESSION['usuario_id'] ?? null;
    if ($id) {
        $f = fila('SELECT id, rol, nombre, email, activo FROM usuario WHERE id = ?', [$id]);
        if ($f && (int) $f['activo'] === 1) {
            $usuario = ['id' => (int) $f['id'], 'rol' => $f['rol'], 'nombre' => $f['nombre'], 'email' => $f['email']];
        } else {
            unset($_SESSION['usuario_id']);
        }
    }
    return $usuario;
}

/** Ids de las líneas de un dueño. */
function lineasDeDueno(int $usuarioId): array
{
    return array_map('intval', array_column(consultar('SELECT id FROM linea_transporte WHERE dueno_id = ?', [$usuarioId]), 'id'));
}

/* ---------------- Instantánea de datos (misma forma que usa assets/js/servicios.js) ---------------- */

function ent(mixed $v): ?int { return $v === null ? null : (int) $v; }
function dec(mixed $v): ?float { return $v === null ? null : (float) $v; }
function ms(mixed $v): ?int { return $v === null ? null : (int) round((float) $v * 1000); }
function bin(mixed $v): bool { return (int) $v === 1; }

function instantanea(?array $u): array
{
    $esAdmin = $u && $u['rol'] === 'admin';
    $misLineas = $u && $u['rol'] === 'dueno' ? lineasDeDueno($u['id']) : [];
    $miChofer = null;
    $miLineaChofer = null;
    if ($u && $u['rol'] === 'chofer') {
        $c = fila('SELECT id, linea_id FROM chofer WHERE usuario_id = ?', [$u['id']]);
        $miChofer = $c ? (int) $c['id'] : null;
        $miLineaChofer = $c ? (int) $c['linea_id'] : null;
    }

    $choferes = array_map(fn ($c) => [
        'id' => (int) $c['id'], 'usuario_id' => (int) $c['usuario_id'], 'linea_id' => (int) $c['linea_id'],
        'numero_licencia' => $c['numero_licencia'], 'telefono' => $c['telefono'], 'activo' => bin($c['activo']),
    ], consultar('SELECT * FROM chofer ORDER BY id'));
    $usuariosDeMisChoferes = [];
    foreach ($choferes as $i => $c) {
        $visible = $esAdmin || in_array($c['linea_id'], $misLineas, true) || $c['id'] === $miChofer;
        if ($visible) {
            $usuariosDeMisChoferes[$c['usuario_id']] = true;
        } else {
            unset($choferes[$i]['numero_licencia'], $choferes[$i]['telefono']);
        }
    }

    $usuarios = [];
    foreach (consultar('SELECT id, rol, nombre, email, activo, UNIX_TIMESTAMP(ultimo_acceso) AS ultimo_acceso FROM usuario ORDER BY id') as $f) {
        $id = (int) $f['id'];
        $fila = ['id' => $id, 'rol' => $f['rol'], 'nombre' => $f['nombre'], 'activo' => bin($f['activo'])];
        if ($esAdmin || ($u && $u['id'] === $id) || isset($usuariosDeMisChoferes[$id])) {
            $fila['email'] = $f['email'];
            $fila['ultimo_acceso'] = ms($f['ultimo_acceso']);
        }
        $usuarios[] = $fila;
    }

    $lineas = array_map(fn ($l) => [
        'id' => (int) $l['id'], 'nombre' => $l['nombre'], 'descripcion' => $l['descripcion'], 'telefono' => $l['telefono'],
        'dueno_id' => ent($l['dueno_id']), 'activa' => bin($l['activa']),
    ], consultar('SELECT * FROM linea_transporte ORDER BY id'));

    $vehiculos = array_map(fn ($v) => [
        'id' => (int) $v['id'], 'linea_id' => (int) $v['linea_id'], 'numero_unidad' => $v['numero_unidad'], 'placa' => $v['placa'],
        'modelo' => $v['modelo'], 'capacidad' => ent($v['capacidad']), 'cuenta_con_gps' => bin($v['cuenta_con_gps']),
        'climatizado' => bin($v['climatizado']), 'tv_a_bordo' => bin($v['tv_a_bordo']), 'accesible' => bin($v['accesible']),
        'activo' => bin($v['activo']),
    ], consultar('SELECT * FROM vehiculo ORDER BY id'));

    $paradas = array_map(fn ($p) => [
        'id' => (int) $p['id'], 'nombre' => $p['nombre'], 'referencia' => $p['referencia'], 'latitud' => (float) $p['latitud'],
        'longitud' => (float) $p['longitud'], 'codigo' => $p['codigo'], 'activa' => bin($p['activa']),
    ], consultar('SELECT * FROM parada ORDER BY id'));

    $paradasDeRuta = [];
    foreach (consultar('SELECT ruta_id, parada_id FROM ruta_parada ORDER BY ruta_id, orden') as $rp) {
        $paradasDeRuta[(int) $rp['ruta_id']][] = (int) $rp['parada_id'];
    }
    $trazos = [];
    foreach (consultar('SELECT ruta_id, latitud, longitud FROM recorrido_punto ORDER BY ruta_id, orden') as $p) {
        $trazos[(int) $p['ruta_id']][] = [(float) $p['latitud'], (float) $p['longitud']];
    }
    $lineaDeRuta = [];
    $rutas = array_map(function ($r) use ($paradasDeRuta, $trazos, &$lineaDeRuta) {
        $id = (int) $r['id'];
        $lineaDeRuta[$id] = (int) $r['linea_id'];
        return [
            'id' => $id, 'linea_id' => (int) $r['linea_id'], 'codigo' => $r['codigo'], 'nombre' => $r['nombre'],
            'origen' => $r['origen'], 'destino' => $r['destino'], 'sentido' => $r['sentido'], 'color' => $r['color'],
            'tarifa' => dec($r['tarifa']), 'velocidad_promedio_kmh' => (float) $r['velocidad_promedio_kmh'],
            'estado_servicio' => $r['estado_servicio'], 'aviso' => $r['aviso'], 'activa' => bin($r['activa']),
            'paradas' => $paradasDeRuta[$id] ?? [], 'recorrido' => $trazos[$id] ?? [],
        ];
    }, consultar('SELECT * FROM ruta ORDER BY id'));

    $viajes = [];
    foreach (consultar('SELECT id, chofer_id, vehiculo_id, ruta_id, UNIX_TIMESTAMP(inicio) AS inicio, UNIX_TIMESTAMP(fin) AS fin, pasajeros_salida, estado FROM viaje ORDER BY id') as $v) {
        $linea = $lineaDeRuta[(int) $v['ruta_id']] ?? 0;
        $visible = $v['estado'] === 'en_curso' || $esAdmin || in_array($linea, $misLineas, true) || (int) $v['chofer_id'] === $miChofer;
        if ($visible) {
            $viajes[] = [
                'id' => (int) $v['id'], 'chofer_id' => (int) $v['chofer_id'], 'vehiculo_id' => (int) $v['vehiculo_id'],
                'ruta_id' => (int) $v['ruta_id'], 'inicio' => ms($v['inicio']), 'fin' => ms($v['fin']),
                'pasajeros_salida' => ent($v['pasajeros_salida']), 'estado' => $v['estado'],
            ];
        }
    }

    $reportes = [];
    if ($esAdmin || $misLineas) {
        foreach (consultar('SELECT id, ruta_id, usuario_id, descripcion, contacto, latitud, longitud, estado, UNIX_TIMESTAMP(creado_en) AS creado_en, revisado_por, UNIX_TIMESTAMP(revisado_en) AS revisado_en FROM reporte_accidente ORDER BY id') as $r) {
            if ($esAdmin || in_array($lineaDeRuta[(int) $r['ruta_id']] ?? 0, $misLineas, true)) {
                $reportes[] = [
                    'id' => (int) $r['id'], 'ruta_id' => (int) $r['ruta_id'], 'usuario_id' => ent($r['usuario_id']),
                    'descripcion' => $r['descripcion'], 'contacto' => $r['contacto'], 'latitud' => dec($r['latitud']),
                    'longitud' => dec($r['longitud']), 'estado' => $r['estado'], 'creado_en' => ms($r['creado_en']),
                    'revisado_por' => ent($r['revisado_por']), 'revisado_en' => ms($r['revisado_en']),
                ];
            }
        }
    }

    // Fallas: detalle completo para quien gestiona o maneja en la línea; para los demás, solo las abiertas
    // (para saber si una unidad no tiene clima o rampa, o no puede circular).
    $lineaDeVehiculo = array_column($vehiculos, 'linea_id', 'id');
    $fallas = [];
    foreach (consultar('SELECT id, vehiculo_id, tipo, descripcion, impide_circular, estado, reportado_por, viaje_id, UNIX_TIMESTAMP(creado_en) AS creado_en, atendido_por, nota_solucion, UNIX_TIMESTAMP(resuelto_en) AS resuelto_en FROM falla_vehiculo ORDER BY id') as $f) {
        $linea = $lineaDeVehiculo[(int) $f['vehiculo_id']] ?? 0;
        $base = ['id' => (int) $f['id'], 'vehiculo_id' => (int) $f['vehiculo_id'], 'tipo' => $f['tipo'], 'impide_circular' => bin($f['impide_circular']), 'estado' => $f['estado']];
        if ($esAdmin || in_array($linea, $misLineas, true) || $linea === $miLineaChofer) {
            $fallas[] = $base + [
                'descripcion' => $f['descripcion'], 'reportado_por' => ent($f['reportado_por']), 'viaje_id' => ent($f['viaje_id']),
                'creado_en' => ms($f['creado_en']), 'atendido_por' => ent($f['atendido_por']), 'nota_solucion' => $f['nota_solucion'],
                'resuelto_en' => ms($f['resuelto_en']),
            ];
        } elseif ($f['estado'] !== 'resuelta') {
            $fallas[] = $base;
        }
    }

    $historial = $u ? array_map(fn ($h) => [
        'id' => (int) $h['id'], 'usuario_id' => (int) $h['usuario_id'], 'ruta_id' => ent($h['ruta_id']),
        'parada_id' => ent($h['parada_id']), 'consultado_en' => ms($h['consultado_en']),
    ], consultar('SELECT id, usuario_id, ruta_id, parada_id, UNIX_TIMESTAMP(consultado_en) AS consultado_en FROM historial_consulta WHERE usuario_id = ? ORDER BY id', [$u['id']])) : [];

    return [
        'version' => 'servidor',
        'usuarios' => $usuarios, 'lineas' => $lineas, 'choferes' => array_values($choferes), 'vehiculos' => $vehiculos,
        'paradas' => $paradas, 'rutas' => $rutas, 'viajes' => $viajes, 'reportes' => $reportes, 'fallas' => $fallas, 'historial' => $historial,
    ];
}

function respuestaConDatos(array $extra = []): never
{
    $u = usuarioSesion(true);
    responder(['ok' => true, 'sesion_usuario_id' => $u['id'] ?? null, 'bd' => instantanea($u)] + $extra);
}
