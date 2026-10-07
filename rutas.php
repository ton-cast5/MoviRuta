<?php
require __DIR__ . '/includes/bootstrap.php';

$busqueda = texto_entrada($_GET, 'q', 80);
$lineaId = entero_entrada($_GET, 'linea');
$rutas = Ruta::listarPublicas($busqueda, $lineaId);
$lineas = Linea::listar(null, true);

$titulo = 'Rutas';
$seccion = 'rutas';
$scripts = ['filtro.js'];
require APP_ROOT . '/views/layout/encabezado.php';
?>
<section class="container-xl py-4">
    <nav aria-label="Ruta de navegación"><ol class="breadcrumb small"><li class="breadcrumb-item"><a href="<?= url() ?>">Inicio</a></li><li class="breadcrumb-item active" aria-current="page">Rutas</li></ol></nav>
    <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
        <div>
            <h1 class="h3 mb-1">Rutas de transporte</h1>
            <p class="text-secondary mb-0">Busca por número, nombre, origen, destino o parada.</p>
        </div>
    </div>

    <form class="mr-tarjeta p-3 mb-4" method="get" role="search">
        <div class="row g-2">
            <div class="col-md-7">
                <label class="visually-hidden" for="q">Buscar ruta</label>
                <div class="mr-campo-icono">
                    <i class="bi bi-search" aria-hidden="true"></i>
                    <input class="form-control" type="search" id="q" name="q" value="<?= e($busqueda) ?>" maxlength="80" placeholder="Ej. 2, Altabrisa, Plaza de Armas…" data-filtro="#listaRutas">
                </div>
            </div>
            <div class="col-md-3">
                <label class="visually-hidden" for="linea">Línea</label>
                <select class="form-select" id="linea" name="linea" onchange="this.form.submit()">
                    <option value="">Todas las líneas</option>
                    <?php foreach ($lineas as $l): ?>
                        <option value="<?= (int) $l['id'] ?>"<?= $lineaId === (int) $l['id'] ? ' selected' : '' ?>><?= e($l['nombre']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2 d-grid">
                <button class="btn btn-primary" type="submit">Buscar</button>
            </div>
        </div>
    </form>

    <?php if ($busqueda !== '' || $lineaId): ?>
        <p class="small text-secondary"><?= count($rutas) ?> resultado(s). <a href="<?= url('rutas.php') ?>">Mostrar todas las rutas</a></p>
    <?php endif; ?>

    <div class="row g-3" id="listaRutas">
        <?php foreach ($rutas as $r): $estado = estado_servicio_info($r['estado_servicio']); ?>
            <div class="col-md-6 col-xl-4" data-texto="<?= e(mb_strtolower($r['codigo'] . ' ' . $r['nombre'] . ' ' . $r['origen'] . ' ' . $r['destino'] . ' ' . $r['linea'])) ?>">
                <a class="mr-resultado h-100" href="<?= url('ruta.php?id=' . (int) $r['id']) ?>">
                    <div class="d-flex gap-2 align-items-start">
                        <span class="mr-codigo" style="background: <?= e($r['color']) ?>"><?= e($r['codigo']) ?></span>
                        <div class="flex-grow-1">
                            <h2 class="mr-resultado-titulo"><?= e($r['nombre']) ?></h2>
                            <div class="small text-secondary"><?= e($r['linea']) ?></div>
                        </div>
                    </div>
                    <div class="mr-trayecto mt-2"><?= e($r['origen']) ?> <i class="bi bi-arrow-right"></i> <?= e($r['destino']) ?></div>
                    <div class="d-flex flex-wrap gap-2 mt-2 align-items-center">
                        <span class="mr-etiqueta"><i class="bi bi-arrow-left-right"></i> <?= e(texto_sentido($r['sentido'])) ?></span>
                        <span class="mr-etiqueta"><i class="bi bi-geo-alt"></i> <?= (int) $r['total_paradas'] ?> paradas</span>
                        <span class="mr-etiqueta"><i class="bi bi-cash"></i> <?= e(formato_tarifa($r['tarifa'])) ?></span>
                        <span class="mr-estado <?= e($estado['clase']) ?>"><i class="bi bi-<?= e($estado['icono']) ?>"></i> <?= e($estado['texto']) ?></span>
                    </div>
                </a>
            </div>
        <?php endforeach; ?>
    </div>
    <div id="sinCoincidencias" class="mr-vacio <?= $rutas ? 'd-none' : '' ?>"><i class="bi bi-signpost"></i>No encontramos rutas con esa búsqueda. <a href="<?= url('rutas.php') ?>">Mostrar todas las rutas</a></div>
</section>
<?php require APP_ROOT . '/views/layout/pie.php'; ?>
