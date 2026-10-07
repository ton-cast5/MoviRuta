<?php
/**
 * Encabezado común.
 * Variables opcionales: $titulo, $seccion, $usaMapa, $claseCuerpo.
 */
$titulo = $titulo ?? '';
$seccion = $seccion ?? '';
$usaMapa = $usaMapa ?? false;
$usuarioSesion = usuario_actual();

$navegacion = [
    'inicio'  => ['Inicio', '', 'house'],
    'rutas'   => ['Rutas', 'rutas.php', 'signpost-split'],
    'paradas' => ['Paradas', 'paradas.php', 'geo-alt'],
    'mapa'    => ['Mapa', 'mapa.php', 'map'],
];
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= $titulo !== '' ? e($titulo) . ' · ' : '' ?>MoviRuta</title>
    <meta name="description" content="MoviRuta: consulta rutas, paradas, vehículos y tiempos aproximados de llegada del transporte público.">
    <link rel="icon" href="<?= asset('img/favicon.svg') ?>" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <?php if ($usaMapa): ?>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
    <?php endif; ?>
    <link href="<?= asset('css/moviruta.css') ?>" rel="stylesheet">
</head>
<body class="<?= e($claseCuerpo ?? '') ?>"
      data-base="<?= e(BASE_URL) ?>"
      data-mapa-lat="<?= e(MAPA_LAT) ?>"
      data-mapa-lng="<?= e(MAPA_LNG) ?>"
      data-mapa-zoom="<?= e(MAPA_ZOOM) ?>"
      data-mapa-mosaicos="<?= e(MAPA_MOSAICOS) ?>"
      data-actualizacion="<?= e(ACTUALIZACION_SEG) ?>"
      data-fuente-ubicacion="<?= e(UBICACION_FUENTE) ?>">

<a class="visually-hidden-focusable" href="#contenido">Saltar al contenido</a>

<header class="mr-header sticky-top" data-bs-theme="dark">
    <nav class="navbar navbar-expand-lg" aria-label="Navegación principal">
        <div class="mr-header-interior">
            <a class="navbar-brand mr-marca mr-marca-claro" href="<?= url() ?>">
                <img src="<?= asset('img/logo.svg') ?>" alt="" width="36" height="36">
                <span>MoviRuta</span>
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menuPrincipal" aria-controls="menuPrincipal" aria-expanded="false" aria-label="Abrir menú">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="menuPrincipal">
                <ul class="navbar-nav me-auto ms-lg-4 mb-2 mb-lg-0">
                    <?php foreach ($navegacion as $clave => [$texto, $destino, $icono]): ?>
                        <li class="nav-item">
                            <a class="nav-link<?= $seccion === $clave ? ' active' : '' ?>" href="<?= url($destino) ?>"<?= $seccion === $clave ? ' aria-current="page"' : '' ?>>
                                <i class="bi bi-<?= $icono ?>" aria-hidden="true"></i> <?= $texto ?>
                            </a>
                        </li>
                    <?php endforeach; ?>
                </ul>
                <?php if ($usuarioSesion): ?>
                    <div class="dropdown d-flex align-items-center gap-2">
                        <button class="mr-btn-cuenta dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <span class="mr-punto-vivo" aria-hidden="true"></span>
                            <?= e(explode(' ', $usuarioSesion['nombre'])[0]) ?>
                        </button>
                        <span class="mr-avatar mr-avatar-cabecera" aria-hidden="true"><?= e(mb_strtoupper(mb_substr($usuarioSesion['nombre'], 0, 1))) ?></span>
                        <ul class="dropdown-menu dropdown-menu-end" data-bs-theme="light">
                            <li><h6 class="dropdown-header"><?= e(nombre_rol($usuarioSesion['rol'])) ?></h6></li>
                            <li><a class="dropdown-item" href="<?= url(panel_de_rol($usuarioSesion['rol'])) ?>"><i class="bi bi-grid me-2"></i>Mi panel</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <form method="post" action="<?= url('logout.php') ?>">
                                    <?= campo_csrf() ?>
                                    <button class="dropdown-item" type="submit"><i class="bi bi-box-arrow-right me-2"></i>Cerrar sesión</button>
                                </form>
                            </li>
                        </ul>
                    </div>
                <?php else: ?>
                    <div class="d-flex align-items-center gap-2">
                        <a class="mr-btn-cuenta" href="<?= url('login.php') ?>"><span class="mr-punto-vivo" aria-hidden="true"></span> Agregar cuenta</a>
                        <a class="mr-avatar mr-avatar-cabecera mr-avatar-invitado" href="<?= url('login.php') ?>" title="Iniciar sesión"><i class="bi bi-person-fill" aria-hidden="true"></i><span class="visually-hidden">Iniciar sesión</span></a>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </nav>
</header>

<main id="contenido">
<?php $mensajesFlash = obtener_flash(); if ($mensajesFlash): ?>
    <div class="mr-contenedor pt-3">
        <?php foreach ($mensajesFlash as $m): ?>
            <div class="alert alert-<?= e($m['tipo']) ?> alert-dismissible fade show" role="alert">
                <?= e($m['mensaje']) ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>
