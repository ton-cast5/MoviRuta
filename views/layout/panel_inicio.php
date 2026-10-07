<?php
/**
 * Apertura del panel de cada perfil con su menú lateral.
 * Variables: $menuActivo (clave de la opción actual), $titulo.
 */
$rolPanel = usuario_actual()['rol'];
$menus = [
    ROL_PASAJERO => [
        'inicio'    => ['Mi panel', 'pasajero/', 'grid'],
        'historial' => ['Historial', 'pasajero/historial.php', 'clock-history'],
        'buscar'    => ['Buscar ruta', '', 'search'],
        'rutas'     => ['Rutas', 'rutas.php', 'signpost-split'],
        'paradas'   => ['Paradas', 'paradas.php', 'geo-alt'],
        'mapa'      => ['Mapa', 'mapa.php', 'map'],
    ],
    ROL_CHOFER => [
        'inicio'    => ['Mi perfil', 'chofer/', 'person-badge'],
        'iniciar'   => ['Iniciar viaje', 'chofer/iniciar.php', 'play-circle'],
        'viaje'     => ['Viaje actual', 'chofer/viaje.php', 'bus-front'],
        'historial' => ['Historial de viajes', 'chofer/historial.php', 'clock-history'],
    ],
    ROL_DUENO => [
        'inicio'    => ['Resumen', 'dueno/', 'grid'],
        'choferes'  => ['Choferes', 'dueno/choferes.php', 'person-vcard'],
        'vehiculos' => ['Vehículos', 'dueno/vehiculos.php', 'bus-front'],
        'rutas'     => ['Rutas', 'dueno/rutas.php', 'signpost-split'],
        'paradas'   => ['Paradas', 'dueno/paradas.php', 'geo-alt'],
        'ubicacion' => ['Ubicación de vehículos', 'dueno/ubicacion.php', 'broadcast'],
        'reportes'  => ['Reportes de accidentes', 'dueno/reportes.php', 'exclamation-triangle'],
    ],
    ROL_ADMIN => [
        'inicio'    => ['Resumen', 'admin/', 'grid'],
        'lineas'    => ['Líneas', 'admin/lineas.php', 'diagram-3'],
        'usuarios'  => ['Usuarios', 'admin/usuarios.php', 'people'],
        'choferes'  => ['Choferes', 'admin/choferes.php', 'person-vcard'],
        'vehiculos' => ['Vehículos', 'admin/vehiculos.php', 'bus-front'],
        'rutas'     => ['Rutas', 'admin/rutas.php', 'signpost-split'],
        'paradas'   => ['Paradas', 'admin/paradas.php', 'geo-alt'],
        'ubicacion' => ['Ubicación de vehículos', 'admin/ubicacion.php', 'broadcast'],
        'reportes'  => ['Reportes de accidentes', 'admin/reportes.php', 'exclamation-triangle'],
    ],
];
$menu = $menus[$rolPanel] ?? [];
?>
<div class="container-xl py-4">
    <div class="row g-4">
        <aside class="col-lg-3">
            <div class="mr-panel-menu">
                <div class="mr-panel-perfil">
                    <div class="mr-avatar"><?= e(mb_strtoupper(mb_substr(usuario_actual()['nombre'], 0, 1))) ?></div>
                    <div>
                        <div class="fw-semibold"><?= e(usuario_actual()['nombre']) ?></div>
                        <div class="small text-secondary"><?= e(nombre_rol($rolPanel)) ?></div>
                    </div>
                </div>
                <nav class="nav flex-lg-column mr-panel-nav" aria-label="Menú del panel">
                    <?php foreach ($menu as $clave => [$texto, $destino, $icono]): ?>
                        <a class="nav-link<?= ($menuActivo ?? '') === $clave ? ' active' : '' ?>" href="<?= url($destino) ?>">
                            <i class="bi bi-<?= $icono ?>" aria-hidden="true"></i><span><?= e($texto) ?></span>
                        </a>
                    <?php endforeach; ?>
                </nav>
            </div>
        </aside>
        <div class="col-lg-9">
