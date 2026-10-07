<?php
require __DIR__ . '/includes/bootstrap.php';

$paradas = Parada::listarPublicas();
$frecuentes = Parada::frecuentes(7);
$chips = array_slice($frecuentes, 0, 3);
$paradasFrecuentes = array_slice($frecuentes, 3, 4) ?: array_slice($frecuentes, 0, 4);
$rutas = Ruta::listarPublicas();
$avisos = Ruta::conAvisos();
$suspendidas = array_filter($avisos, fn($a) => $a['estado_servicio'] === 'suspendida');
$coloresInsignia = ['secundario', 'primario', 'terciario', 'primario-cont'];

$titulo = 'Consulta de transporte público';
$seccion = 'inicio';
$usaMapa = true;
$scripts = ['inicio.js'];
require APP_ROOT . '/views/layout/encabezado.php';
?>
<section class="mr-hero" aria-label="Planificador de trayectos">
    <span class="mr-hero-luz mr-hero-luz-1" aria-hidden="true"></span>
    <span class="mr-hero-luz mr-hero-luz-2" aria-hidden="true"></span>
    <div class="mr-contenedor position-relative">
        <div class="mr-hero-texto">
            <h1>Consulta y planifica tus trayectos en tiempo real</h1>
            <p>Encuentra las mejores rutas para planificar tu traslado.</p>
        </div>

        <form id="formBuscar" class="mr-planificador" novalidate>
            <div class="row g-3 align-items-center">
                <div class="col-lg-4">
                    <div class="mr-planificador-etiqueta">
                        <label for="origen">Punto de partida (origen)</label>
                        <button class="mr-enlace-ubicacion" type="button" id="btnUbicacion">
                            <i class="bi bi-crosshair" aria-hidden="true"></i> <span>Mi ubicación actual</span>
                        </button>
                    </div>
                    <div class="mr-campo-icono">
                        <i class="bi bi-record-circle" aria-hidden="true"></i>
                        <input class="mr-campo" id="origen" name="origen" list="listaParadas" maxlength="80" autocomplete="off" placeholder="Paraíso Centro">
                    </div>
                </div>
                <div class="col-lg-1 d-flex justify-content-center">
                    <button class="mr-btn-intercambiar" type="button" id="btnIntercambiar" title="Intercambiar origen y destino" aria-label="Intercambiar origen y destino">
                        <i class="bi bi-arrow-down-up" aria-hidden="true"></i>
                    </button>
                </div>
                <div class="col-lg-4">
                    <div class="mr-planificador-etiqueta">
                        <label for="destino">Punto de llegada (destino)</label>
                        <span class="mr-planificador-sugerencia">Sugerencias rápidas</span>
                    </div>
                    <div class="mr-campo-icono mr-campo-destino">
                        <i class="bi bi-geo-alt-fill" aria-hidden="true"></i>
                        <input class="mr-campo" id="destino" name="destino" list="listaParadas" maxlength="80" autocomplete="off" placeholder="Plaza de Armas">
                    </div>
                </div>
                <div class="col-lg-3 d-none d-lg-block" aria-hidden="true"></div>
            </div>
            <datalist id="listaParadas">
                <?php foreach ($paradas as $p): ?>
                    <option value="<?= e($p['nombre']) ?>"><?= e($p['referencia']) ?></option>
                <?php endforeach; ?>
            </datalist>

            <div class="mr-planificador-barra">
                <div class="d-flex flex-wrap align-items-center gap-1">
                    <?php if ($chips): ?>
                        <span class="mr-planificador-frecuentes">Frecuentes:</span>
                        <?php foreach ($chips as $f): ?>
                            <button class="mr-chip" type="button" data-destino="<?= e($f['nombre']) ?>"><?= e($f['nombre']) ?></button>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
                <div class="d-flex flex-wrap align-items-center gap-2 mr-planificador-opciones">
                    <label class="mr-opcion" title="Solo líneas en las que todas las unidades tienen rampa o espacio para silla de ruedas">
                        <input type="checkbox" id="optAccesible">
                        <span><i class="bi bi-person-wheelchair mr-icono-primario" aria-hidden="true"></i> Accesible 100%</span>
                    </label>
                    <label class="mr-opcion" title="Muestra primero las rutas directas">
                        <input type="checkbox" id="optMenosTransbordos">
                        <span><i class="bi bi-person-walking mr-icono-secundario" aria-hidden="true"></i> Menos transbordos</span>
                    </label>
                    <button class="mr-btn-consultar" type="submit"><i class="bi bi-sign-turn-right-fill" aria-hidden="true"></i> <span>Consultar Rutas</span></button>
                </div>
            </div>
            <div id="mensajeBuscador" class="small text-secondary mt-2" role="status" aria-live="polite"></div>
        </form>
    </div>
</section>

<section class="mr-seccion-principal" aria-label="Resultados y mapa">
    <div class="mr-contenedor">
        <div class="row g-4 align-items-start">
            <div class="col-lg-5 d-flex flex-column mr-columna-resultados">
                <div class="mr-filtros" role="group" aria-label="Filtrar resultados">
                    <button type="button" class="mr-filtro activo" data-filtro="todas">Todas (<span id="totalTodas"><?= count($rutas) ?></span>)</button>
                    <button type="button" class="mr-filtro" data-filtro="directa"><i class="bi bi-train-front mr-icono-secundario" aria-hidden="true"></i> Transporte Directo</button>
                    <button type="button" class="mr-filtro" data-filtro="transbordo"><i class="bi bi-bus-front mr-icono-primario-cont" aria-hidden="true"></i> Transbordos</button>
                </div>

                <form class="mr-buscar-parada" id="formParada" role="search">
                    <i class="bi bi-pin-map" aria-hidden="true"></i>
                    <label class="visually-hidden" for="buscarParada">Buscar parada por código o nombre</label>
                    <input id="buscarParada" type="search" maxlength="80" autocomplete="off" placeholder="Buscar por código de poste o parada (ej. #108, #114)...">
                    <button type="submit">Localizar</button>
                </form>
                <div id="mensajeParada" class="small d-none" role="status" aria-live="polite"></div>

                <div class="d-flex align-items-center justify-content-between pt-1">
                    <h2 class="mr-etiqueta-seccion mb-0" id="tituloResultados">Rutas disponibles (<?= count($rutas) ?>)</h2>
                    <span class="mr-en-vivo"><span class="mr-en-vivo-punto"></span> En vivo</span>
                </div>
                <div id="resultados" class="mr-lista" aria-live="polite">
                    <div class="mr-vacio"><span class="spinner-border spinner-border-sm text-success"></span> Cargando rutas…</div>
                </div>
                <noscript><div class="alert alert-warning mt-2">Activa JavaScript para buscar rutas y ver el mapa. También puedes consultar la <a href="rutas.php">lista de rutas</a>.</div></noscript>

                <?php if ($paradasFrecuentes): ?>
                    <div class="mr-paradas-frecuentes">
                        <div class="d-flex align-items-center justify-content-between mb-2 gap-2">
                            <h2 class="mr-etiqueta-seccion mb-0">Paradas&nbsp; frecuentes:</h2>
                            <a class="mr-enlace-mini" href="<?= url('paradas.php') ?>">Ver paradas en el mapa</a>
                        </div>
                        <div class="row g-1">
                            <?php foreach ($paradasFrecuentes as $i => $p): ?>
                                <div class="col-6">
                                    <a class="mr-parada-frecuente" href="<?= url('parada.php?id=' . (int) $p['id']) ?>">
                                        <span class="d-flex align-items-center gap-2 min-w-0">
                                            <?php if ($p['codigo'] !== null): ?>
                                                <span class="mr-insignia-parada <?= $coloresInsignia[$i % 4] ?>" title="Código de parada #<?= e($p['codigo']) ?>"><?= e($p['codigo']) ?></span>
                                            <?php endif; ?>
                                            <span class="text-truncate"><?= e($p['nombre']) ?></span>
                                        </span>
                                        <span class="mr-semaforo <?= (int) $p['con_avisos'] ? 'suspendido' : '' ?>" title="<?= (int) $p['con_avisos'] ? 'Alguna ruta de esta parada tiene avisos' : 'Servicio normal' ?>"></span>
                                    </a>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                <?php endif; ?>
            </div>

            <div class="col-lg-7 d-flex flex-column gap-2">
                <div class="mr-mapa-pegajoso">
                    <div class="mr-mapa-tarjeta">
                        <div id="mapa" class="mr-mapa" role="region" aria-label="Mapa de rutas"></div>
                        <div class="mr-mapa-controles" role="group" aria-label="Vista del mapa">
                            <button type="button" id="btnVistaRuta" disabled><i class="bi bi-sign-merge-right" aria-hidden="true"></i> Ruta completa</button>
                            <button type="button" id="btnVistaParadas" class="activo"><i class="bi bi-pin-map" aria-hidden="true"></i> Paradas</button>
                        </div>
                        <div class="mr-mapa-unidad d-none" id="tarjetaUnidad" aria-live="polite">
                            <div class="mr-mapa-unidad-encabezado">
                                <span data-linea></span>
                                <span class="mr-pastilla-disponible">Disponible</span>
                            </div>
                            <h3 data-unidad></h3>
                            <p data-chofer></p>
                            <div class="mr-mapa-unidad-filas">
                                <div><span><span class="mr-punto secundario"></span>Hora de salida:</span><strong data-salida></strong></div>
                                <div><span><span class="mr-punto primario-cont"></span>Salió con:</span><strong data-pasajeros></strong></div>
                                <div><span><span class="mr-punto secundario"></span>Servicio:</span><strong class="secundario" data-servicio></strong></div>
                                <div><span><span class="mr-punto primario-cont"></span>Equipamiento:</span><strong data-equipamiento></strong></div>
                            </div>
                        </div>
                        <div class="mr-mapa-flota d-none" id="panelVehiculo" aria-live="polite">
                            <div class="d-flex align-items-center gap-3 min-w-0 flex-grow-1">
                                <div class="mr-mapa-flota-icono"><i class="bi bi-bus-front" aria-hidden="true"></i></div>
                                <div class="min-w-0">
                                    <div class="mr-mapa-flota-titulo" data-titulo></div>
                                    <div class="mr-mapa-flota-detalle" data-detalle></div>
                                </div>
                            </div>
                            <div class="d-flex align-items-center gap-1 flex-shrink-0">
                                <button type="button" class="mr-btn-flota d-none" data-anterior aria-label="Vehículo anterior"><i class="bi bi-chevron-left"></i></button>
                                <span class="small d-none" data-contador></span>
                                <button type="button" class="mr-btn-flota d-none" data-siguiente aria-label="Vehículo siguiente"><i class="bi bi-chevron-right"></i></button>
                                <button type="button" class="mr-btn-flota" data-seguir aria-pressed="false">Seguir Vehículo</button>
                            </div>
                        </div>
                    </div>
                    <div class="d-flex align-items-center justify-content-between gap-2 flex-wrap mt-2">
                        <?php $idIndicador = 'indicador'; require APP_ROOT . '/views/partes/indicador.php'; ?>
                        <button type="button" class="mr-btn-reportar" data-bs-toggle="modal" data-bs-target="#modalReporte">
                            <i class="bi bi-exclamation-triangle" aria-hidden="true"></i> <span>Reportar Accidente</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<section class="mr-franja-estado" id="estado-servicio" aria-labelledby="tituloEstado">
    <div class="mr-contenedor d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-4">
        <div class="d-flex align-items-center gap-3">
            <div class="mr-franja-icono <?= $suspendidas ? 'suspendido' : 'normal' ?>">
                <i class="bi bi-<?= $suspendidas ? 'x-octagon-fill' : 'check-circle-fill' ?>" aria-hidden="true"></i>
            </div>
            <div>
                <h2 class="mr-franja-titulo" id="tituloEstado"><?= $suspendidas ? (count($suspendidas) === 1 ? 'Hay 1 Ruta Suspendida' : 'Hay ' . count($suspendidas) . ' Rutas Suspendidas') : 'Rutas Operando Con Normalidad' ?></h2>
                <p class="mr-franja-texto">
                    <?= $suspendidas ? 'Revisa los avisos antes de salir.' : 'Sin incidentes críticos reportados hasta el momento.' ?>
                    <?php foreach ($avisos as $a): if (!$a['aviso']) continue; ?>
                        <a class="text-reset" href="<?= url('ruta.php?id=' . (int) $a['id']) ?>">Ruta <?= e($a['codigo']) ?>: <?= e($a['aviso']) ?></a>
                    <?php endforeach; ?>
                </p>
            </div>
        </div>
        <div class="d-flex flex-wrap align-items-center gap-2 flex-shrink-0">
            <button type="button" class="mr-btn-utilidad" id="btnImprimirMapa" title="Abre la ventana de impresión; elige «Guardar como PDF» para descargarlo">
                <i class="bi bi-download" aria-hidden="true"></i> <span>Descargar Mapa PDF</span>
            </button>
        </div>
    </div>
</section>

<div class="modal fade" id="modalReporte" tabindex="-1" aria-labelledby="tituloReporte" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <form class="modal-content" id="formReporte" novalidate>
            <?= campo_csrf() ?>
            <div class="modal-header">
                <h2 class="modal-title fs-5" id="tituloReporte"><i class="bi bi-exclamation-triangle text-danger"></i> Reportar accidente</h2>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
                <div class="alert alert-danger small py-2"><i class="bi bi-telephone-fill"></i> Si hay personas lesionadas o en peligro, llama primero al <strong>911</strong>.</div>
                <div class="mb-3">
                    <label class="form-label" for="reporteRuta">Ruta</label>
                    <select class="form-select" id="reporteRuta" name="ruta_id" required>
                        <option value="">Selecciona la ruta</option>
                        <?php foreach ($rutas as $r): ?>
                            <option value="<?= (int) $r['id'] ?>">Ruta <?= e($r['codigo']) ?> · <?= e($r['nombre']) ?> (<?= e(texto_sentido($r['sentido'])) ?>)</option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="mb-3">
                    <label class="form-label" for="reporteDescripcion">¿Qué pasó?</label>
                    <textarea class="form-control" id="reporteDescripcion" name="descripcion" rows="3" maxlength="500" required placeholder="Ej. Choque entre un auto y la unidad en la esquina de…"></textarea>
                </div>
                <div class="mb-3">
                    <label class="form-label" for="reporteContacto">Teléfono o correo de contacto <span class="text-secondary fw-normal">(opcional)</span></label>
                    <input class="form-control" id="reporteContacto" name="contacto" maxlength="120">
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="reporteUbicacion">
                    <label class="form-check-label" for="reporteUbicacion">Incluir mi ubicación actual</label>
                </div>
                <div id="mensajeReporte" class="small mt-3" role="status" aria-live="polite"></div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline-primary" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-danger"><i class="bi bi-send"></i> Enviar reporte</button>
            </div>
        </form>
    </div>
</div>
<?php require APP_ROOT . '/views/layout/pie.php'; ?>
