<?php
require __DIR__ . '/_dueno.php';

$lineas = Linea::listar($lineasDueno);
$enCurso = Viaje::contarEnCurso($lineasDueno);

$titulo = 'Panel del dueño de línea';
$seccion = 'panel';
$menuActivo = 'inicio';
require APP_ROOT . '/views/layout/encabezado.php';
require APP_ROOT . '/views/layout/panel_inicio.php';
?>
<h1 class="h3 mb-1">Resumen de tu línea</h1>
<p class="text-secondary">Administra los choferes, vehículos y rutas de tu línea de transporte.</p>

<?php if (!$lineas): ?>
    <div class="mr-tarjeta mr-vacio"><i class="bi bi-diagram-3"></i>Aún no tienes una línea asignada. Comunícate con el administrador general.</div>
<?php else: ?>
    <div class="row g-3 mb-4">
        <?php foreach ([
            ['Rutas', array_sum(array_column($lineas, 'total_rutas')), 'signpost-split', 'dueno/rutas.php'],
            ['Vehículos', array_sum(array_column($lineas, 'total_vehiculos')), 'bus-front', 'dueno/vehiculos.php'],
            ['Choferes', array_sum(array_column($lineas, 'total_choferes')), 'person-vcard', 'dueno/choferes.php'],
            ['En circulación', $enCurso, 'broadcast', 'dueno/ubicacion.php'],
        ] as [$etiqueta, $valor, $icono, $destino]): ?>
            <div class="col-6 col-xl-3">
                <a class="mr-tarjeta mr-stat d-block text-reset text-decoration-none" href="<?= url($destino) ?>">
                    <i class="bi bi-<?= $icono ?>"></i>
                    <div class="mr-stat-valor"><?= (int) $valor ?></div>
                    <div class="mr-stat-etiqueta"><?= e($etiqueta) ?></div>
                </a>
            </div>
        <?php endforeach; ?>
    </div>
    <?php foreach ($lineas as $l): ?>
        <div class="mr-tarjeta mr-tarjeta-cuerpo mb-3">
            <div class="d-flex justify-content-between flex-wrap gap-2">
                <div>
                    <h2 class="h5 mb-1"><?= e($l['nombre']) ?></h2>
                    <div class="small text-secondary"><?= e($l['descripcion'] ?: 'Sin descripción') ?><?= $l['telefono'] ? ' · Tel. ' . e($l['telefono']) : '' ?></div>
                </div>
                <?= (int) $l['activa'] ? '<span class="mr-estado normal align-self-start">Línea activa</span>' : '<span class="mr-estado suspendido align-self-start">Línea inactiva</span>' ?>
            </div>
        </div>
    <?php endforeach; ?>
<?php endif; ?>
<?php
require APP_ROOT . '/views/layout/panel_fin.php';
require APP_ROOT . '/views/layout/pie.php';
