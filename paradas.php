<?php
require __DIR__ . '/includes/bootstrap.php';

$busqueda = texto_entrada($_GET, 'q', 80);
$paradas = Parada::listarPublicas($busqueda);
$rutasPorParada = Ruta::porParadas(array_map(fn($p) => (int) $p['id'], $paradas));

$titulo = 'Paradas';
$seccion = 'paradas';
$usaMapa = true;
$scripts = ['filtro.js', 'paradas.js'];
require APP_ROOT . '/views/layout/encabezado.php';
?>
<section class="container-xl py-4">
    <nav aria-label="Ruta de navegación"><ol class="breadcrumb small"><li class="breadcrumb-item"><a href="<?= url() ?>">Inicio</a></li><li class="breadcrumb-item active" aria-current="page">Paradas</li></ol></nav>
    <h1 class="h3 mb-1">Paradas</h1>
    <p class="text-secondary">Consulta qué rutas pasan por cada parada y cuánto falta aproximadamente para la próxima unidad.</p>

    <div class="row g-4">
        <div class="col-lg-5">
            <form class="mr-tarjeta p-3 mb-3" method="get" role="search">
                <div class="d-flex gap-2">
                    <div class="mr-campo-icono flex-grow-1">
                        <i class="bi bi-search" aria-hidden="true"></i>
                        <label class="visually-hidden" for="q">Buscar parada</label>
                        <input class="form-control" type="search" id="q" name="q" value="<?= e($busqueda) ?>" maxlength="80" placeholder="Nombre o referencia" data-filtro="#listaParadas">
                    </div>
                    <button class="btn btn-primary" type="submit" aria-label="Buscar"><i class="bi bi-search"></i></button>
                </div>
                <button class="btn btn-secondary w-100 mt-2" type="button" id="btnCercanas" data-auto="<?= isset($_GET['cerca']) ? '1' : '0' ?>">
                    <i class="bi bi-crosshair"></i> <span>Paradas cerca de mí</span>
                </button>
                <div id="mensajeCercanas" class="small mt-2" role="status" aria-live="polite"></div>
            </form>

            <div id="cercanas" class="mb-3 d-none">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h2 class="mr-seccion-titulo mb-0"><i class="bi bi-pin-map"></i> Cerca de ti</h2>
                    <button class="btn btn-sm btn-outline-primary" type="button" id="btnQuitarCercanas">Ver todas</button>
                </div>
                <div class="mr-lista" id="listaCercanas"></div>
            </div>

            <div class="mr-lista" id="listaParadas">
                <?php foreach ($paradas as $p): $rutas = $rutasPorParada[(int) $p['id']] ?? []; ?>
                    <a class="mr-resultado" href="<?= url('parada.php?id=' . (int) $p['id']) ?>" data-parada="<?= (int) $p['id'] ?>"
                       data-texto="<?= e(mb_strtolower($p['nombre'] . ' ' . $p['referencia'])) ?>">
                        <div class="d-flex justify-content-between gap-2">
                            <div>
                                <h2 class="mr-resultado-titulo"><?= e($p['nombre']) ?></h2>
                                <?php if ($p['referencia']): ?><div class="small text-secondary"><?= e($p['referencia']) ?></div><?php endif; ?>
                            </div>
                            <i class="bi bi-chevron-right text-secondary"></i>
                        </div>
                        <div class="d-flex flex-wrap gap-1 mt-2">
                            <?php foreach ($rutas as $r): ?>
                                <span class="mr-codigo mr-codigo-sm" style="background: <?= e($r['color']) ?>" title="<?= e($r['nombre'] . ' hacia ' . $r['destino']) ?>"><?= e($r['codigo']) ?></span>
                            <?php endforeach; ?>
                        </div>
                    </a>
                <?php endforeach; ?>
            </div>
            <div id="sinCoincidencias" class="mr-vacio <?= $paradas ? 'd-none' : '' ?>"><i class="bi bi-geo-alt"></i>No encontramos paradas con esa búsqueda. <a href="<?= url('paradas.php') ?>">Mostrar todas</a></div>
        </div>
        <div class="col-lg-7">
            <div class="mr-mapa-pegajoso"><div id="mapa" class="mr-mapa" role="region" aria-label="Mapa de paradas"></div></div>
        </div>
    </div>
</section>
<script type="application/json" id="datosParadas"><?= json_encode(array_map(fn($p) => [
    'id' => (int) $p['id'], 'nombre' => $p['nombre'], 'referencia' => $p['referencia'],
    'latitud' => (float) $p['latitud'], 'longitud' => (float) $p['longitud'],
], $paradas), JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?></script>
<?php require APP_ROOT . '/views/layout/pie.php'; ?>
