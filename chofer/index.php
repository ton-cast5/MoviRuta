<?php
require __DIR__ . '/_chofer.php';

$viaje = Viaje::enCursoDeChofer((int) $chofer['id']);
$recientes = array_slice(Viaje::historialChofer((int) $chofer['id'], date('Y-m-d', strtotime('-30 days')), date('Y-m-d')), 0, 5);

$titulo = 'Mi perfil';
$menuActivo = 'inicio';
require APP_ROOT . '/views/layout/encabezado.php';
require APP_ROOT . '/views/layout/panel_inicio.php';
?>
<h1 class="h3 mb-3">Mi perfil</h1>
<div class="row g-3 mb-4">
    <div class="col-md-6">
        <div class="mr-tarjeta mr-tarjeta-cuerpo h-100">
            <h2 class="mr-seccion-titulo"><i class="bi bi-person-badge"></i> Datos del chofer</h2>
            <dl class="row small mb-0">
                <dt class="col-5 text-secondary fw-normal">Nombre</dt><dd class="col-7 fw-semibold"><?= e($chofer['nombre']) ?></dd>
                <dt class="col-5 text-secondary fw-normal">Correo</dt><dd class="col-7"><?= e($chofer['email']) ?></dd>
                <dt class="col-5 text-secondary fw-normal">Línea</dt><dd class="col-7"><?= e($chofer['linea']) ?></dd>
                <dt class="col-5 text-secondary fw-normal">Licencia</dt><dd class="col-7"><?= e($chofer['numero_licencia']) ?></dd>
                <dt class="col-5 text-secondary fw-normal">Teléfono</dt><dd class="col-7"><?= e($chofer['telefono'] ?: '—') ?></dd>
                <dt class="col-5 text-secondary fw-normal">Estado</dt><dd class="col-7 mb-0"><?= (int) $chofer['activo'] ? '<span class="mr-estado normal">Activo</span>' : '<span class="mr-estado suspendido">Inactivo</span>' ?></dd>
            </dl>
        </div>
    </div>
    <div class="col-md-6">
        <div class="mr-tarjeta mr-tarjeta-cuerpo h-100">
            <h2 class="mr-seccion-titulo"><i class="bi bi-bus-front"></i> Viaje actual</h2>
            <?php if ($viaje): ?>
                <div class="d-flex gap-2 align-items-center mb-2">
                    <span class="mr-codigo" style="background: <?= e($viaje['ruta_color']) ?>"><?= e($viaje['ruta_codigo']) ?></span>
                    <div><div class="fw-semibold"><?= e($viaje['ruta_nombre']) ?></div><div class="small text-secondary">Unidad <?= e($viaje['numero_unidad']) ?> · desde <?= e(date('H:i', strtotime($viaje['inicio']))) ?></div></div>
                </div>
                <a class="btn btn-primary" href="<?= url('chofer/viaje.php') ?>"><i class="bi bi-eye"></i> Ver viaje actual</a>
            <?php else: ?>
                <p class="text-secondary small">No tienes un viaje en curso.</p>
                <a class="btn btn-primary" href="<?= url('chofer/iniciar.php') ?>"><i class="bi bi-play-circle"></i> Iniciar viaje</a>
            <?php endif; ?>
        </div>
    </div>
</div>

<div class="mr-tarjeta mr-tarjeta-cuerpo">
    <div class="d-flex justify-content-between align-items-center mb-2">
        <h2 class="mr-seccion-titulo mb-0"><i class="bi bi-clock-history"></i> Viajes recientes</h2>
        <a class="small" href="<?= url('chofer/historial.php') ?>">Ver historial</a>
    </div>
    <?php $viajes = $recientes; require APP_ROOT . '/views/partes/tabla_viajes.php'; ?>
</div>
<?php
require APP_ROOT . '/views/layout/panel_fin.php';
require APP_ROOT . '/views/layout/pie.php';
