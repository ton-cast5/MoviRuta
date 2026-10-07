<?php
require dirname(__DIR__) . '/includes/bootstrap.php';
$usuario = requiere_rol(ROL_PASAJERO);

$recientes = Historial::listar($usuario['id'], 5);

$titulo = 'Mi panel';
$seccion = 'panel';
$menuActivo = 'inicio';
require APP_ROOT . '/views/layout/encabezado.php';
require APP_ROOT . '/views/layout/panel_inicio.php';
?>
<h1 class="h3 mb-1">Hola, <?= e(explode(' ', $usuario['nombre'])[0]) ?></h1>
<p class="text-secondary">¿A dónde vas hoy?</p>

<div class="row g-3 mb-4">
    <?php foreach ([
        ['Buscar ruta', 'Origen y destino', '', 'search'],
        ['Paradas cercanas', 'Usa tu ubicación', 'paradas.php?cerca=1', 'crosshair'],
        ['Rutas', 'Consulta recorridos', 'rutas.php', 'signpost-split'],
        ['Mapa', 'Vehículos en circulación', 'mapa.php', 'map'],
    ] as [$texto, $sub, $destino, $icono]): ?>
        <div class="col-sm-6 col-xl-3">
            <a class="mr-tarjeta mr-acceso" href="<?= url($destino) ?>">
                <i class="bi bi-<?= $icono ?>"></i>
                <div><div class="fw-semibold"><?= e($texto) ?></div><div class="small text-secondary"><?= e($sub) ?></div></div>
            </a>
        </div>
    <?php endforeach; ?>
</div>

<div class="mr-tarjeta mr-tarjeta-cuerpo">
    <div class="d-flex justify-content-between align-items-center mb-2">
        <h2 class="mr-seccion-titulo mb-0"><i class="bi bi-clock-history"></i> Consultas recientes</h2>
        <a class="small" href="<?= url('pasajero/historial.php') ?>">Ver historial completo</a>
    </div>
    <?php require APP_ROOT . '/views/partes/lista_historial.php'; ?>
</div>
<?php
require APP_ROOT . '/views/layout/panel_fin.php';
require APP_ROOT . '/views/layout/pie.php';
