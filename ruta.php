<?php
require __DIR__ . '/includes/bootstrap.php';

$id = entero_entrada($_GET, 'id');
$detalle = $id ? DetalleRuta::obtener($id) : null;
if (!$detalle) {
    mostrar_error(404, 'La ruta que buscas no existe o no está disponible.');
}
$ruta = $detalle['ruta'];
$paradaInicial = entero_entrada($_GET, 'parada');

$usuario = usuario_actual();
if ($usuario && $usuario['rol'] === ROL_PASAJERO) {
    Historial::registrar($usuario['id'], $ruta['id'], null);
}
$estado = estado_servicio_info($ruta['estado_servicio']);

$titulo = 'Ruta ' . $ruta['codigo'] . ' · ' . $ruta['nombre'];
$seccion = 'rutas';
$usaMapa = true;
$scripts = ['ruta.js'];
require APP_ROOT . '/views/layout/encabezado.php';
?>
<section class="container-xl py-4">
    <nav aria-label="Ruta de navegación"><ol class="breadcrumb small">
        <li class="breadcrumb-item"><a href="<?= url() ?>">Inicio</a></li>
        <li class="breadcrumb-item"><a href="<?= url('rutas.php') ?>">Rutas</a></li>
        <li class="breadcrumb-item active" aria-current="page">Ruta <?= e($ruta['codigo']) ?></li>
    </ol></nav>

    <div class="mr-tarjeta mr-tarjeta-cuerpo mb-4">
        <div class="d-flex gap-3 align-items-start flex-wrap">
            <span class="mr-codigo" style="background: <?= e($ruta['color']) ?>; min-width: 3rem; height: 3rem; font-size: 1.3rem"><?= e($ruta['codigo']) ?></span>
            <div class="flex-grow-1">
                <h1 class="h3 mb-1"><?= e($ruta['nombre']) ?></h1>
                <div class="text-secondary"><?= e($ruta['linea']) ?></div>
            </div>
            <span class="mr-estado <?= e($estado['clase']) ?>"><i class="bi bi-<?= e($estado['icono']) ?>"></i> <?= e($estado['texto']) ?></span>
        </div>
        <?php if ($ruta['aviso']): ?>
            <div class="mr-aviso-servicio <?= e($estado['clase'] === 'normal' ? 'aviso' : $estado['clase']) ?> mt-3"><i class="bi bi-megaphone-fill"></i><div><?= e($ruta['aviso']) ?></div></div>
        <?php endif; ?>
        <div class="row g-3 mt-1">
            <div class="col-6 col-md-4 col-lg-2 mr-dato">Origen<strong><?= e($ruta['origen']) ?></strong></div>
            <div class="col-6 col-md-4 col-lg-2 mr-dato">Destino<strong><?= e($ruta['destino']) ?></strong></div>
            <div class="col-6 col-md-4 col-lg-2 mr-dato">Sentido<strong><?= e($ruta['sentido']) ?></strong></div>
            <div class="col-6 col-md-4 col-lg-2 mr-dato">Duración del recorrido<strong><?= e($ruta['duracion_texto']) ?></strong></div>
            <div class="col-6 col-md-4 col-lg-2 mr-dato">Longitud<strong><?= e($ruta['longitud_texto']) ?></strong></div>
            <div class="col-6 col-md-4 col-lg-2 mr-dato">Tarifa<strong><?= e($ruta['tarifa_texto']) ?></strong></div>
        </div>
    </div>

    <div class="row g-4">
        <div class="col-lg-5">
            <div class="mr-tarjeta mr-tarjeta-cuerpo mb-3" aria-live="polite">
                <h2 class="mr-seccion-titulo"><i class="bi bi-clock"></i> Tiempo aproximado de llegada</h2>
                <div id="panelEta">
                    <div class="small text-secondary"><i class="bi bi-hand-index"></i> Selecciona una parada del recorrido o del mapa para ver cuánto falta aproximadamente para que llegue una unidad.</div>
                </div>
            </div>

            <ul class="nav nav-pills mb-3" role="tablist">
                <li class="nav-item" role="presentation"><button class="nav-link active" data-bs-toggle="pill" data-bs-target="#tabRecorrido" type="button" role="tab">Recorrido completo</button></li>
                <li class="nav-item" role="presentation"><button class="nav-link" data-bs-toggle="pill" data-bs-target="#tabVehiculos" type="button" role="tab">Vehículos <span class="badge text-bg-light" id="contadorVehiculos">…</span></button></li>
            </ul>
            <div class="tab-content">
                <div class="tab-pane fade show active" id="tabRecorrido" role="tabpanel">
                    <div class="mr-tarjeta mr-tarjeta-cuerpo">
                        <p class="small text-secondary mb-2"><i class="bi bi-arrow-down"></i> <?= e($ruta['sentido']) ?>: de <?= e($ruta['origen']) ?> a <?= e($ruta['destino']) ?><?= $ruta['es_circuito'] ? ' (el recorrido regresa al inicio)' : '' ?>.</p>
                        <ol class="mr-recorrido" id="listaParadas" style="--color: <?= e($ruta['color']) ?>">
                            <?php foreach ($detalle['paradas'] as $p): ?>
                                <li data-parada="<?= $p['id'] ?>">
                                    <button type="button">
                                        <span class="d-flex justify-content-between gap-2">
                                            <span class="mr-parada-nombre"><?= e($p['nombre']) ?></span>
                                            <span class="small text-secondary text-nowrap"><?= $p['minutos_desde_origen'] ? '+' . $p['minutos_desde_origen'] . ' min' : 'Inicio' ?></span>
                                        </span>
                                        <?php if ($p['referencia']): ?><span class="mr-parada-ref d-block"><?= e($p['referencia']) ?></span><?php endif; ?>
                                    </button>
                                </li>
                            <?php endforeach; ?>
                        </ol>
                        <p class="small text-secondary mt-2 mb-0">Los tiempos desde el inicio son aproximados y pueden variar por el tráfico.</p>
                    </div>
                </div>
                <div class="tab-pane fade" id="tabVehiculos" role="tabpanel">
                    <div class="mr-tarjeta mr-tarjeta-cuerpo" id="listaVehiculos">
                        <div class="mr-vacio"><span class="spinner-border spinner-border-sm text-success"></span> Consultando vehículos…</div>
                    </div>
                </div>
            </div>
            <a class="btn btn-outline-primary mt-3" href="<?= url('rutas.php') ?>"><i class="bi bi-arrow-left"></i> Ver todas las rutas</a>
        </div>
        <div class="col-lg-7">
            <div class="mr-mapa-pegajoso">
                <div id="mapa" class="mr-mapa" role="region" aria-label="Mapa de la ruta"></div>
                <div class="mt-2"><?php require APP_ROOT . '/views/partes/indicador.php'; ?></div>
            </div>
        </div>
    </div>
</section>
<script type="application/json" id="datosRuta"><?= json_encode($detalle + ['parada_inicial' => $paradaInicial], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?></script>
<?php require APP_ROOT . '/views/layout/pie.php'; ?>
