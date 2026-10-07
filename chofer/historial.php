<?php
require __DIR__ . '/_chofer.php';

$validarFecha = function (string $valor, string $porDefecto): string {
    $f = DateTime::createFromFormat('Y-m-d', $valor);
    return ($f && $f->format('Y-m-d') === $valor) ? $valor : $porDefecto;
};
$desde = $validarFecha(texto_entrada($_GET, 'desde', 10), date('Y-m-d', strtotime('-30 days')));
$hasta = $validarFecha(texto_entrada($_GET, 'hasta', 10), date('Y-m-d'));
if ($desde > $hasta) {
    [$desde, $hasta] = [$hasta, $desde];
}

$viajes = Viaje::historialChofer((int) $chofer['id'], $desde, $hasta);
$finalizados = count(array_filter($viajes, fn($v) => $v['estado'] === 'finalizado'));

$titulo = 'Historial de viajes';
$menuActivo = 'historial';
require APP_ROOT . '/views/layout/encabezado.php';
require APP_ROOT . '/views/layout/panel_inicio.php';
?>
<h1 class="h3 mb-1">Historial de viajes</h1>
<p class="text-secondary">Consulta los viajes que realizaste en un periodo.</p>

<form class="mr-tarjeta p-3 mb-3 row g-2 align-items-end mx-0" method="get">
    <div class="col-sm-4"><label class="form-label" for="desde">Desde</label><input class="form-control" type="date" id="desde" name="desde" value="<?= e($desde) ?>" max="<?= date('Y-m-d') ?>"></div>
    <div class="col-sm-4"><label class="form-label" for="hasta">Hasta</label><input class="form-control" type="date" id="hasta" name="hasta" value="<?= e($hasta) ?>" max="<?= date('Y-m-d') ?>"></div>
    <div class="col-sm-4 d-grid"><button class="btn btn-primary" type="submit"><i class="bi bi-funnel"></i> Consultar</button></div>
</form>

<p class="small text-secondary"><?= count($viajes) ?> viaje(s) del <?= e(formato_fecha($desde, false)) ?> al <?= e(formato_fecha($hasta, false)) ?> · <?= $finalizados ?> finalizado(s).</p>
<div class="mr-tarjeta">
    <?php require APP_ROOT . '/views/partes/tabla_viajes.php'; ?>
</div>
<?php
require APP_ROOT . '/views/layout/panel_fin.php';
require APP_ROOT . '/views/layout/pie.php';
