<?php
require __DIR__ . '/includes/bootstrap.php';

$rutas = Ruta::listarPublicas();

$titulo = 'Mapa';
$seccion = 'mapa';
$usaMapa = true;
$scripts = ['mapa.js'];
require APP_ROOT . '/views/layout/encabezado.php';
?>
<section class="container-fluid px-lg-4 py-3">
    <div class="row g-3">
        <div class="col-lg-3 order-2 order-lg-1">
            <div class="mr-tarjeta mr-tarjeta-cuerpo">
                <h1 class="h5 mb-3"><i class="bi bi-map text-primary"></i> Mapa de transporte</h1>
                <button class="btn btn-primary w-100 mb-2" type="button" id="btnUbicacion"><i class="bi bi-crosshair"></i> <span>Rutas cerca de mí</span></button>
                <div id="mensajeUbicacion" class="small mb-2" role="status" aria-live="polite"></div>
                <div id="cercanas" class="d-none mb-3">
                    <h2 class="h6">Paradas cercanas</h2>
                    <div id="listaCercanas" class="mr-lista small"></div>
                </div>

                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h2 class="h6 mb-0">Rutas</h2>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" type="button" id="btnTodas">Todas</button>
                        <button class="btn btn-outline-primary" type="button" id="btnNinguna">Ninguna</button>
                    </div>
                </div>
                <div id="listaRutas" class="vstack gap-1">
                    <?php foreach ($rutas as $r): ?>
                        <label class="d-flex align-items-center gap-2 p-1 rounded" style="cursor:pointer">
                            <input class="form-check-input m-0" type="checkbox" value="<?= (int) $r['id'] ?>" checked>
                            <span class="mr-codigo mr-codigo-sm" style="background: <?= e($r['color']) ?>"><?= e($r['codigo']) ?></span>
                            <span class="small flex-grow-1"><?= e($r['nombre']) ?> <span class="text-secondary">(<?= e(texto_sentido($r['sentido'])) ?>)</span></span>
                            <?php if ($r['estado_servicio'] !== 'normal'): $estado = estado_servicio_info($r['estado_servicio']); ?>
                                <span class="mr-estado <?= e($estado['clase']) ?>" title="<?= e($estado['texto']) ?>"><i class="bi bi-<?= e($estado['icono']) ?>"></i></span>
                            <?php endif; ?>
                        </label>
                    <?php endforeach; ?>
                </div>
                <hr>
                <?php require APP_ROOT . '/views/partes/indicador.php'; ?>
                <div class="small text-secondary mt-2"><i class="bi bi-bus-front-fill"></i> <span id="resumenVehiculos">—</span></div>
            </div>
        </div>
        <div class="col-lg-9 order-1 order-lg-2">
            <div id="mapa" class="mr-mapa mr-mapa-completo" role="region" aria-label="Mapa general de rutas y vehículos"></div>
        </div>
    </div>
</section>
<?php $sinPie = true; require APP_ROOT . '/views/layout/pie.php'; ?>
