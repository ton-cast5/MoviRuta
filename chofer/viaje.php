<?php
require __DIR__ . '/_chofer.php';

$viaje = Viaje::enCursoDeChofer((int) $chofer['id']);

if (es_post()) {
    verificar_csrf();
    $viajeId = entero_entrada($_POST, 'viaje_id');
    if ($viajeId && Viaje::finalizar($viajeId, (int) $chofer['id'])) {
        flash('success', 'Viaje finalizado y registrado en tu historial.');
        redirigir('chofer/historial.php');
    }
    flash('warning', 'No fue posible finalizar el viaje: ya no está en curso.');
    redirigir('chofer/viaje.php');
}

$titulo = 'Viaje actual';
$menuActivo = 'viaje';
$usaMapa = (bool) $viaje;
$scripts = $viaje ? ['viaje-chofer.js'] : [];
require APP_ROOT . '/views/layout/encabezado.php';
require APP_ROOT . '/views/layout/panel_inicio.php';
?>
<h1 class="h3 mb-3">Viaje actual</h1>

<?php if (!$viaje): ?>
    <div class="mr-tarjeta mr-vacio">
        <i class="bi bi-bus-front"></i>
        No tienes un viaje en curso.
        <div class="mt-3"><a class="btn btn-primary" href="<?= url('chofer/iniciar.php') ?>"><i class="bi bi-play-circle"></i> Iniciar viaje</a></div>
    </div>
<?php else: ?>
    <div class="mr-tarjeta mr-tarjeta-cuerpo mb-3">
        <div class="d-flex gap-3 align-items-center flex-wrap">
            <span class="mr-codigo" style="background: <?= e($viaje['ruta_color']) ?>"><?= e($viaje['ruta_codigo']) ?></span>
            <div class="flex-grow-1">
                <div class="fw-semibold"><?= e($viaje['ruta_nombre']) ?> · <?= e(texto_sentido($viaje['ruta_sentido'])) ?> hacia <?= e($viaje['ruta_destino']) ?></div>
                <div class="small text-secondary">Unidad <?= e($viaje['numero_unidad']) ?> (<?= e($viaje['placa']) ?>)</div>
            </div>
            <span class="mr-estado normal"><i class="bi bi-broadcast"></i> En curso</span>
        </div>
        <div class="row g-3 mt-1">
            <div class="col-6 col-md-3 mr-dato">Salida<strong><?= e(date('H:i', strtotime($viaje['inicio']))) ?></strong></div>
            <div class="col-6 col-md-3 mr-dato">Tiempo transcurrido<strong><?= e(formato_duracion($viaje['inicio'], null)) ?></strong></div>
            <div class="col-6 col-md-2 mr-dato">Pasajeros al salir<strong><?= $viaje['pasajeros_salida'] !== null ? (int) $viaje['pasajeros_salida'] : '—' ?></strong></div>
            <div class="col-6 col-md-4 mr-dato">Ubicación de la unidad<strong id="estadoUbicacion">Consultando…</strong></div>
        </div>
    </div>

    <div id="mapa" class="mr-mapa mb-2" role="region" aria-label="Mapa del viaje actual"
         data-ruta="<?= (int) $viaje['ruta_id'] ?>" data-vehiculo="<?= (int) $viaje['vehiculo_id'] ?>"></div>
    <?php require APP_ROOT . '/views/partes/indicador.php'; ?>

    <form method="post" class="mt-3" onsubmit="return confirm('¿Finalizar el viaje actual?')">
        <?= campo_csrf() ?>
        <input type="hidden" name="viaje_id" value="<?= (int) $viaje['id'] ?>">
        <button class="btn btn-primary" type="submit"><i class="bi bi-stop-circle"></i> Finalizar viaje</button>
    </form>
<?php endif; ?>
<?php
require APP_ROOT . '/views/layout/panel_fin.php';
require APP_ROOT . '/views/layout/pie.php';
