<?php
require __DIR__ . '/includes/bootstrap.php';

$paradas = Parada::listarPublicas();
$frecuentes = Parada::frecuentes();
$rutas = Ruta::listarPublicas();
$avisos = Ruta::conAvisos();

$titulo = 'Consulta de transporte público';
$seccion = 'inicio';
$usaMapa = true;
$scripts = ['inicio.js'];
require APP_ROOT . '/views/layout/encabezado.php';
?>
<section class="mr-hero" aria-label="Buscador de rutas">
    <span class="mr-hero-luz mr-hero-luz-1" aria-hidden="true"></span>
    <span class="mr-hero-luz mr-hero-luz-2" aria-hidden="true"></span>
    <div class="container-xl position-relative">
        <h1 class="mb-1">Consulta y planifica tus trayectos</h1>
        <p class="lead mb-4">Encuentra las mejores rutas para planificar tu traslado.</p>

        <form id="formBuscar" class="mr-planificador" novalidate>
            <div class="row g-3 align-items-end">
                <div class="col-lg">
                    <div class="mr-planificador-etiqueta">
                        <label for="origen">Punto de partida (origen)</label>
                        <button class="mr-enlace-accion" type="button" id="btnUbicacion">
                            <i class="bi bi-crosshair" aria-hidden="true"></i> <span>Mi ubicación actual</span>
                        </button>
                    </div>
                    <div class="mr-campo-icono">
                        <i class="bi bi-record-circle" aria-hidden="true"></i>
                        <input class="form-control" id="origen" name="origen" list="listaParadas" maxlength="80" autocomplete="off" placeholder="Parada o lugar de partida">
                    </div>
                </div>
                <div class="col-lg-auto d-flex justify-content-center">
                    <button class="mr-btn-intercambiar" type="button" id="btnIntercambiar" title="Intercambiar origen y destino" aria-label="Intercambiar origen y destino">
                        <i class="bi bi-arrow-down-up" aria-hidden="true"></i>
                    </button>
                </div>
                <div class="col-lg">
                    <div class="mr-planificador-etiqueta">
                        <label for="destino">Punto de llegada (destino)</label>
                    </div>
                    <div class="mr-campo-icono mr-campo-destino">
                        <i class="bi bi-geo-alt-fill" aria-hidden="true"></i>
                        <input class="form-control" id="destino" name="destino" list="listaParadas" maxlength="80" autocomplete="off" placeholder="¿A qué parada o lugar vas?">
                    </div>
                </div>
            </div>
            <datalist id="listaParadas">
                <?php foreach ($paradas as $p): ?>
                    <option value="<?= e($p['nombre']) ?>"><?= e($p['referencia']) ?></option>
                <?php endforeach; ?>
            </datalist>

            <div class="mr-planificador-barra">
                <?php if ($frecuentes): ?>
                    <div class="d-flex flex-wrap align-items-center gap-1">
                        <span class="mr-planificador-frecuentes">Frecuentes:</span>
                        <?php foreach ($frecuentes as $f): ?>
                            <button class="mr-chip" type="button" data-destino="<?= e($f['nombre']) ?>"><?= e($f['nombre']) ?></button>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
                <button class="btn btn-primary ms-auto" type="submit"><i class="bi bi-sign-turn-right" aria-hidden="true"></i> Consultar rutas</button>
            </div>
            <div id="mensajeBuscador" class="small text-secondary mt-2" role="status" aria-live="polite"></div>
        </form>
    </div>
</section>

<section class="container-xl py-4 py-lg-5" aria-label="Resultados">
    <div class="row g-4">
        <div class="col-lg-5">
            <div class="d-flex align-items-center justify-content-between mb-2 gap-2 flex-wrap">
                <h2 class="mr-etiqueta-seccion mb-0" id="tituloResultados">Rutas disponibles</h2>
                <button class="mr-enlace-accion d-none" type="button" id="btnTodas">Mostrar todas las rutas <i class="bi bi-chevron-right"></i></button>
            </div>
            <div id="resultados" class="mr-lista" aria-live="polite">
                <div class="mr-vacio"><span class="spinner-border spinner-border-sm text-success"></span> Cargando rutas…</div>
            </div>
            <noscript><div class="alert alert-warning mt-2">Activa JavaScript para buscar rutas y ver el mapa. También puedes consultar la <a href="rutas.php">lista de rutas</a>.</div></noscript>

            <?php if ($rutas): ?>
                <div class="mr-estado-rutas mt-3">
                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <h2 class="mr-etiqueta-seccion mb-0">Estado de las rutas</h2>
                        <a class="small fw-semibold" href="<?= url('mapa.php') ?>">Ver en el mapa</a>
                    </div>
                    <div class="row g-2">
                        <?php foreach ($rutas as $r): $info = estado_servicio_info($r['estado_servicio']); ?>
                            <div class="col-sm-6 col-lg-12 col-xxl-6">
                                <a class="mr-estado-ruta" href="<?= url('ruta.php?id=' . (int) $r['id']) ?>" title="<?= e($info['texto']) ?>">
                                    <span class="mr-codigo mr-codigo-sm" style="background:<?= e($r['color']) ?>"><?= e($r['codigo']) ?></span>
                                    <span class="flex-grow-1 text-truncate"><?= e($r['nombre']) ?> <span class="text-secondary">· <?= e(texto_sentido($r['sentido'])) ?></span></span>
                                    <span class="mr-semaforo <?= e($info['clase']) ?>"><span class="visually-hidden"><?= e($info['texto']) ?></span></span>
                                </a>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            <?php endif; ?>
        </div>

        <div class="col-lg-7">
            <div class="mr-mapa-pegajoso">
                <div class="mr-mapa-tarjeta">
                    <div id="mapa" class="mr-mapa" role="region" aria-label="Mapa de rutas"></div>
                    <div class="mr-mapa-controles" role="group" aria-label="Vista del mapa">
                        <button type="button" id="btnVistaRuta" disabled><i class="bi bi-bezier2" aria-hidden="true"></i> Ruta completa</button>
                        <button type="button" id="btnVistaParadas" class="activo"><i class="bi bi-geo-alt" aria-hidden="true"></i> Paradas</button>
                    </div>
                    <div class="mr-mapa-flota d-none" id="panelVehiculo" aria-live="polite">
                        <div class="mr-mapa-flota-icono"><i class="bi bi-bus-front" aria-hidden="true"></i></div>
                        <div class="flex-grow-1 min-w-0">
                            <div class="fw-semibold" data-titulo></div>
                            <div class="small" data-detalle></div>
                        </div>
                        <div class="d-flex align-items-center gap-1 flex-shrink-0">
                            <button type="button" class="mr-btn-flota d-none" data-anterior aria-label="Vehículo anterior"><i class="bi bi-chevron-left"></i></button>
                            <span class="small d-none" data-contador></span>
                            <button type="button" class="mr-btn-flota d-none" data-siguiente aria-label="Vehículo siguiente"><i class="bi bi-chevron-right"></i></button>
                            <button type="button" class="mr-btn-flota" data-seguir aria-pressed="false">Seguir vehículo</button>
                        </div>
                    </div>
                </div>
                <div class="mt-2"><?php $idIndicador = 'indicador'; require APP_ROOT . '/views/partes/indicador.php'; ?></div>
            </div>
        </div>
    </div>
</section>

<section class="mr-franja-estado" id="estado-servicio" aria-labelledby="tituloEstado">
    <div class="container-xl">
        <?php if (!$avisos): ?>
            <div class="d-flex align-items-center gap-3">
                <div class="mr-franja-icono normal"><i class="bi bi-check-circle-fill" aria-hidden="true"></i></div>
                <div>
                    <h2 class="h5 mb-0" id="tituloEstado">Todas las rutas operan con normalidad</h2>
                    <p class="small text-secondary mb-0">No hay avisos de servicio por el momento.</p>
                </div>
            </div>
        <?php else: ?>
            <div class="d-flex align-items-center gap-3 mb-3">
                <div class="mr-franja-icono aviso"><i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i></div>
                <div>
                    <h2 class="h5 mb-0" id="tituloEstado">Estado del servicio</h2>
                    <p class="small text-secondary mb-0"><?= count($avisos) === 1 ? 'Hay 1 aviso de servicio.' : 'Hay ' . count($avisos) . ' avisos de servicio.' ?> Las demás rutas operan con normalidad.</p>
                </div>
            </div>
            <div class="row g-2">
                <?php foreach ($avisos as $a): $info = estado_servicio_info($a['estado_servicio']); ?>
                    <div class="col-md-6">
                        <a class="mr-aviso-servicio <?= e($info['clase']) ?> text-decoration-none text-reset" href="<?= url('ruta.php?id=' . (int) $a['id']) ?>">
                            <i class="bi bi-<?= e($info['icono']) ?>"></i>
                            <div>
                                <strong>Ruta <?= e($a['codigo']) ?> · <?= e($a['nombre']) ?> (<?= e(texto_sentido($a['sentido'])) ?>)</strong> — <?= e($info['texto']) ?>
                                <?php if ($a['aviso']): ?><div class="small"><?= e($a['aviso']) ?></div><?php endif; ?>
                            </div>
                        </a>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>
</section>

<section class="container-xl py-5" id="como-funciona" aria-labelledby="tituloComo">
    <h2 class="mr-seccion-titulo" id="tituloComo"><i class="bi bi-question-circle"></i> Cómo usar MoviRuta</h2>
    <div class="row g-3">
        <div class="col-md-4"><div class="mr-tarjeta mr-tarjeta-cuerpo h-100 mr-paso"><span class="mr-paso-num">1</span><div><strong>Indica a dónde vas</strong><p class="small text-secondary mb-0">Escribe tu destino y tu punto de partida, o usa tu ubicación actual.</p></div></div></div>
        <div class="col-md-4"><div class="mr-tarjeta mr-tarjeta-cuerpo h-100 mr-paso"><span class="mr-paso-num">2</span><div><strong>Elige una ruta</strong><p class="small text-secondary mb-0">Compara opciones y revisa en el mapa el recorrido, las paradas y los vehículos.</p></div></div></div>
        <div class="col-md-4"><div class="mr-tarjeta mr-tarjeta-cuerpo h-100 mr-paso"><span class="mr-paso-num">3</span><div><strong>Consulta la llegada</strong><p class="small text-secondary mb-0">Selecciona tu parada y mira el tiempo aproximado de llegada de la próxima unidad.</p></div></div></div>
    </div>
</section>
<?php require APP_ROOT . '/views/layout/pie.php'; ?>
