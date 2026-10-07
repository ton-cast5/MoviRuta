<?php
require __DIR__ . '/includes/bootstrap.php';

$id = entero_entrada($_GET, 'id');
$parada = $id ? Parada::buscarPorId($id) : null;
if (!$parada) {
    mostrar_error(404, 'La parada que buscas no existe o no está disponible.');
}
$rutas = Ruta::deParada($id);

$usuario = usuario_actual();
if ($usuario && $usuario['rol'] === ROL_PASAJERO) {
    Historial::registrar($usuario['id'], null, $id);
}

$titulo = 'Parada ' . $parada['nombre'];
$seccion = 'paradas';
$usaMapa = true;
$scripts = ['parada.js'];
require APP_ROOT . '/views/layout/encabezado.php';
?>
<section class="container-xl py-4">
    <nav aria-label="Ruta de navegación"><ol class="breadcrumb small">
        <li class="breadcrumb-item"><a href="<?= url() ?>">Inicio</a></li>
        <li class="breadcrumb-item"><a href="<?= url('paradas.php') ?>">Paradas</a></li>
        <li class="breadcrumb-item active" aria-current="page"><?= e($parada['nombre']) ?></li>
    </ol></nav>

    <div class="mr-tarjeta mr-tarjeta-cuerpo mb-4 d-flex gap-3 align-items-center">
        <div class="mr-marcador-parada destacada flex-shrink-0" style="--color: var(--mr-verde)"></div>
        <div>
            <h1 class="h3 mb-0"><?= e($parada['nombre']) ?></h1>
            <?php if ($parada['referencia']): ?><div class="text-secondary"><?= e($parada['referencia']) ?></div><?php endif; ?>
        </div>
    </div>

    <div class="row g-4">
        <div class="col-lg-5">
            <h2 class="mr-seccion-titulo"><i class="bi bi-clock"></i> Próximas llegadas</h2>
            <div id="llegadas" aria-live="polite">
                <div class="mr-vacio"><span class="spinner-border spinner-border-sm text-success"></span> Calculando tiempos aproximados…</div>
            </div>
            <p class="small text-secondary">Los tiempos son estimaciones basadas en la ubicación de cada unidad y la velocidad promedio de la ruta.</p>

            <h2 class="mr-seccion-titulo mt-4"><i class="bi bi-signpost-split"></i> Rutas que pasan por aquí</h2>
            <div class="mr-lista">
                <?php foreach ($rutas as $r): $estado = estado_servicio_info($r['estado_servicio']); ?>
                    <a class="mr-resultado" href="<?= url('ruta.php?id=' . (int) $r['id'] . '&parada=' . (int) $parada['id']) ?>">
                        <div class="d-flex gap-2 align-items-center">
                            <span class="mr-codigo" style="background: <?= e($r['color']) ?>"><?= e($r['codigo']) ?></span>
                            <div class="flex-grow-1">
                                <div class="fw-semibold"><?= e($r['nombre']) ?></div>
                                <div class="small text-secondary"><?= e(texto_sentido($r['sentido'])) ?> hacia <?= e($r['destino']) ?> · <?= e(formato_tarifa($r['tarifa'])) ?></div>
                            </div>
                            <span class="mr-estado <?= e($estado['clase']) ?>" title="<?= e($estado['texto']) ?>"><i class="bi bi-<?= e($estado['icono']) ?>"></i></span>
                        </div>
                    </a>
                <?php endforeach; ?>
                <?php if (!$rutas): ?><div class="mr-vacio"><i class="bi bi-signpost"></i>Por ahora ninguna ruta activa pasa por esta parada.</div><?php endif; ?>
            </div>
            <a class="btn btn-outline-primary mt-3" href="<?= url('paradas.php') ?>"><i class="bi bi-arrow-left"></i> Seleccionar otra parada</a>
        </div>
        <div class="col-lg-7">
            <div class="mr-mapa-pegajoso">
                <div id="mapa" class="mr-mapa" role="region" aria-label="Mapa de la parada"></div>
                <div class="mt-2"><?php require APP_ROOT . '/views/partes/indicador.php'; ?></div>
            </div>
        </div>
    </div>
</section>
<script type="application/json" id="datosParada"><?= json_encode([
    'parada' => ['id' => (int) $parada['id'], 'nombre' => $parada['nombre'], 'referencia' => $parada['referencia'],
                 'latitud' => (float) $parada['latitud'], 'longitud' => (float) $parada['longitud']],
    'rutas'  => array_map(fn($r) => (int) $r['id'], $rutas),
], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?></script>
<?php require APP_ROOT . '/views/layout/pie.php'; ?>
