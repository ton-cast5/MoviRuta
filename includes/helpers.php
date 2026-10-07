<?php
/**
 * Funciones de apoyo usadas en toda la aplicación.
 */

function e($valor): string
{
    return htmlspecialchars((string) $valor, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function url(string $ruta = ''): string
{
    return BASE_URL . '/' . ltrim($ruta, '/');
}

function asset(string $ruta): string
{
    $archivo = APP_ROOT . '/assets/' . ltrim($ruta, '/');
    $version = is_file($archivo) ? filemtime($archivo) : 0;
    return url('assets/' . ltrim($ruta, '/')) . '?v=' . $version;
}

function redirigir(string $ruta): never
{
    header('Location: ' . url($ruta));
    exit;
}

/* ---------- Mensajes flash (retroalimentación tras una acción) ---------- */

function flash(string $tipo, string $mensaje): void
{
    $_SESSION['flash'][] = ['tipo' => $tipo, 'mensaje' => $mensaje];
}

function obtener_flash(): array
{
    $mensajes = $_SESSION['flash'] ?? [];
    unset($_SESSION['flash']);
    return $mensajes;
}

/* ---------- Protección CSRF para formularios ---------- */

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function campo_csrf(): string
{
    return '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">';
}

function verificar_csrf(): void
{
    $enviado = $_POST['csrf'] ?? '';
    if (!is_string($enviado) || !hash_equals(csrf_token(), $enviado)) {
        mostrar_error(400, 'La sesión del formulario expiró. Recarga la página e intenta nuevamente.');
    }
}

function es_post(): bool
{
    return ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST';
}

/* ---------- Lectura y saneamiento de entradas ---------- */

function texto_entrada(array $origen, string $clave, int $max = 255): string
{
    $valor = $origen[$clave] ?? '';
    if (!is_string($valor)) {
        return '';
    }
    $valor = trim(preg_replace('/\s+/u', ' ', $valor) ?? '');
    return mb_substr($valor, 0, $max);
}

function entero_entrada(array $origen, string $clave): ?int
{
    $valor = $origen[$clave] ?? null;
    if ($valor === null || $valor === '') {
        return null;
    }
    $filtrado = filter_var($valor, FILTER_VALIDATE_INT);
    return $filtrado === false ? null : $filtrado;
}

function decimal_entrada(array $origen, string $clave): ?float
{
    $valor = $origen[$clave] ?? null;
    if ($valor === null || $valor === '') {
        return null;
    }
    $filtrado = filter_var($valor, FILTER_VALIDATE_FLOAT);
    return $filtrado === false ? null : (float) $filtrado;
}

function coordenadas_validas(?float $lat, ?float $lng): bool
{
    return $lat !== null && $lng !== null && $lat >= -90 && $lat <= 90 && $lng >= -180 && $lng <= 180;
}

/** Lista de enteros positivos a partir de "1,2,3" o de un arreglo. */
function lista_ids($valor): array
{
    if (is_string($valor)) {
        $valor = explode(',', $valor);
    }
    if (!is_array($valor)) {
        return [];
    }
    $ids = [];
    foreach ($valor as $v) {
        $n = filter_var($v, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($n !== false) {
            $ids[$n] = $n;
        }
    }
    return array_values($ids);
}

/* ---------- Respuestas y errores ---------- */

function es_peticion_api(): bool
{
    return defined('PETICION_API');
}

function responder_json($datos, int $codigo = 200): never
{
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function registrar_error(Throwable $e): void
{
    $carpeta = APP_ROOT . '/logs';
    if (!is_dir($carpeta)) {
        @mkdir($carpeta, 0775, true);
    }
    $linea = sprintf(
        "[%s] %s: %s en %s:%d\n%s\n\n",
        date('Y-m-d H:i:s'),
        get_class($e),
        $e->getMessage(),
        $e->getFile(),
        $e->getLine(),
        $e->getTraceAsString()
    );
    @error_log($linea, 3, $carpeta . '/app.log');
}

function mostrar_error(int $codigo, string $mensaje, ?Throwable $e = null): never
{
    if (es_peticion_api()) {
        responder_json(['error' => $mensaje], $codigo);
    }
    http_response_code($codigo);
    $titulo = match ($codigo) {
        403 => 'Acceso no permitido',
        404 => 'No encontrado',
        400 => 'Solicitud no válida',
        default => 'Algo salió mal',
    };
    $detalle = (APP_DEBUG && $e) ? $e->getMessage() . "\n" . $e->getFile() . ':' . $e->getLine() : null;
    $seccion = '';
    require APP_ROOT . '/views/error.php';
    exit;
}

/* ---------- Formato para la interfaz ---------- */

function texto_sentido(string $sentido): string
{
    return match ($sentido) {
        'vuelta'   => 'Vuelta',
        'circular' => 'Circuito',
        default    => 'Ida',
    };
}

function estado_servicio_info(string $estado): array
{
    return match ($estado) {
        'con_retrasos' => ['texto' => 'Servicio con retrasos', 'clase' => 'aviso', 'icono' => 'exclamation-triangle-fill'],
        'suspendida'   => ['texto' => 'Servicio suspendido', 'clase' => 'suspendido', 'icono' => 'x-octagon-fill'],
        default        => ['texto' => 'Operando con normalidad', 'clase' => 'normal', 'icono' => 'check-circle-fill'],
    };
}

function formato_tarifa($tarifa): string
{
    return $tarifa === null ? 'No disponible' : '$' . number_format((float) $tarifa, 2);
}

function formato_distancia(float $metros): string
{
    return $metros < 1000 ? (string) (round($metros / 10) * 10) . ' m' : number_format($metros / 1000, 1) . ' km';
}

function formato_minutos_aprox(float $minutos): string
{
    $m = (int) max(1, round($minutos));
    if ($m >= 60) {
        $h = intdiv($m, 60);
        $resto = $m % 60;
        return 'Aprox. ' . $h . ' h' . ($resto ? ' ' . $resto . ' min' : '');
    }
    return 'Aprox. ' . $m . ' min';
}

function formato_fecha(?string $fecha, bool $conHora = true): string
{
    if (!$fecha) {
        return '—';
    }
    $t = strtotime($fecha);
    return $conHora ? date('d/m/Y H:i', $t) : date('d/m/Y', $t);
}

function formato_duracion(?string $inicio, ?string $fin): string
{
    if (!$inicio) {
        return '—';
    }
    $seg = max(0, ($fin ? strtotime($fin) : time()) - strtotime($inicio));
    $min = intdiv($seg, 60);
    return $min >= 60 ? intdiv($min, 60) . ' h ' . ($min % 60) . ' min' : $min . ' min';
}
