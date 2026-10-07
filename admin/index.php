<?php
require __DIR__ . '/_admin.php';

$lineas = Linea::listar();
$porRol = Usuario::contarPorRol();
$enCurso = Viaje::contarEnCurso();
$totalParadas = Parada::contarActivas();

$titulo = 'Administración general';
$seccion = 'panel';
$menuActivo = 'inicio';
require APP_ROOT . '/views/layout/encabezado.php';
require APP_ROOT . '/views/layout/panel_inicio.php';
?>
<h1 class="h3 mb-1">Administración general</h1>
<p class="text-secondary">Vista global de MoviRuta.</p>

<div class="row g-3 mb-4">
    <?php foreach ([
        ['Líneas', count($lineas), 'diagram-3', 'admin/lineas.php'],
        ['Rutas', array_sum(array_column($lineas, 'total_rutas')), 'signpost-split', 'admin/rutas.php'],
        ['Paradas activas', $totalParadas, 'geo-alt', 'admin/paradas.php'],
        ['Vehículos', array_sum(array_column($lineas, 'total_vehiculos')), 'bus-front', 'admin/vehiculos.php'],
        ['Choferes', array_sum(array_column($lineas, 'total_choferes')), 'person-vcard', 'admin/choferes.php'],
        ['En circulación', $enCurso, 'broadcast', 'admin/ubicacion.php'],
        ['Pasajeros', $porRol[ROL_PASAJERO] ?? 0, 'people', 'admin/usuarios.php?rol=pasajero'],
        ['Dueños de línea', $porRol[ROL_DUENO] ?? 0, 'person-workspace', 'admin/usuarios.php?rol=dueno'],
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

<div class="mr-tarjeta">
    <div class="mr-tarjeta-cuerpo pb-0 d-flex justify-content-between align-items-center">
        <h2 class="mr-seccion-titulo mb-0"><i class="bi bi-diagram-3"></i> Líneas de transporte</h2>
        <a class="small" href="<?= url('admin/lineas.php') ?>">Administrar</a>
    </div>
    <div class="table-responsive mt-2">
        <table class="table mr-tabla">
            <thead><tr><th>Línea</th><th>Dueño</th><th>Rutas</th><th>Vehículos</th><th>Choferes</th><th>Estado</th></tr></thead>
            <tbody>
            <?php foreach ($lineas as $l): ?>
                <tr>
                    <td class="fw-semibold"><?= e($l['nombre']) ?></td>
                    <td class="small"><?= e($l['dueno_nombre'] ?: 'Sin asignar') ?></td>
                    <td><?= (int) $l['total_rutas'] ?></td>
                    <td><?= (int) $l['total_vehiculos'] ?></td>
                    <td><?= (int) $l['total_choferes'] ?></td>
                    <td><?= (int) $l['activa'] ? '<span class="mr-etiqueta">Activa</span>' : '<span class="mr-estado suspendido">Inactiva</span>' ?></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
<?php
require APP_ROOT . '/views/layout/panel_fin.php';
require APP_ROOT . '/views/layout/pie.php';
