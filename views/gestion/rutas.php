<?php /** Vista de gestión de rutas (lista y editor con mapa). */ ?>
<?php if ($accion === 'lista'): ?>
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div><h1 class="h3 mb-1">Rutas</h1><p class="text-secondary mb-0"><?= count($rutas) ?> ruta(s).</p></div>
        <?php if ($lineasDisponibles): ?>
            <a class="btn btn-primary" href="<?= url($panel . '/rutas.php?accion=nuevo') ?>"><i class="bi bi-plus-lg"></i> Crear ruta</a>
        <?php endif; ?>
    </div>
    <div class="mr-tarjeta">
        <?php if (!$rutas): ?>
            <div class="mr-vacio"><i class="bi bi-signpost-split"></i><?= $lineasDisponibles ? 'Aún no hay rutas registradas.' : 'No tienes líneas asignadas. Comunícate con el administrador.' ?></div>
        <?php else: ?>
            <div class="table-responsive">
                <table class="table mr-tabla table-hover">
                    <thead><tr><th>Ruta</th><th>Línea</th><th>Recorrido</th><th>Paradas</th><th>Servicio</th><th>Publicada</th><th></th></tr></thead>
                    <tbody>
                    <?php foreach ($rutas as $r): $estado = estado_servicio_info($r['estado_servicio']); ?>
                        <tr>
                            <td><div class="d-flex align-items-center gap-2"><span class="mr-codigo mr-codigo-sm" style="background: <?= e($r['color']) ?>"><?= e($r['codigo']) ?></span><span class="fw-semibold"><?= e($r['nombre']) ?></span></div></td>
                            <td class="small"><?= e($r['linea']) ?></td>
                            <td class="small"><?= e(texto_sentido($r['sentido'])) ?>: <?= e($r['origen']) ?> → <?= e($r['destino']) ?></td>
                            <td class="small"><?= (int) $r['total_paradas'] ?></td>
                            <td><span class="mr-estado <?= e($estado['clase']) ?>"><i class="bi bi-<?= e($estado['icono']) ?>"></i> <?= e($estado['texto']) ?></span></td>
                            <td><?= (int) $r['activa'] ? '<span class="mr-etiqueta">Sí</span>' : '<span class="mr-estado suspendido">No</span>' ?></td>
                            <td class="text-end text-nowrap">
                                <?php if ((int) $r['activa']): ?><a class="btn btn-sm btn-secondary" href="<?= url('ruta.php?id=' . (int) $r['id']) ?>" title="Ver como pasajero"><i class="bi bi-eye"></i></a><?php endif; ?>
                                <a class="btn btn-sm btn-outline-primary" href="<?= url($panel . '/rutas.php?accion=editar&id=' . (int) $r['id']) ?>"><i class="bi bi-pencil"></i> Editar</a>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
<?php else: ?>
    <nav aria-label="Ruta de navegación"><ol class="breadcrumb small"><li class="breadcrumb-item"><a href="<?= url($panel . '/rutas.php') ?>">Rutas</a></li><li class="breadcrumb-item active"><?= $ruta ? 'Editar' : 'Nueva' ?></li></ol></nav>
    <h1 class="h3 mb-3"><?= $ruta ? 'Editar ruta' : 'Crear ruta' ?></h1>
    <?php require APP_ROOT . '/views/partes/errores.php'; ?>
    <form method="post" id="formRuta" novalidate>
        <?= campo_csrf() ?>
        <input type="hidden" name="paradas_json" id="paradas_json">
        <input type="hidden" name="recorrido_json" id="recorrido_json">

        <div class="mr-tarjeta mr-tarjeta-cuerpo mb-3">
            <h2 class="mr-seccion-titulo"><i class="bi bi-info-circle"></i> Datos de la ruta</h2>
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label" for="linea_id">Línea</label>
                    <select class="form-select" id="linea_id" name="linea_id" required>
                        <option value="">Selecciona una línea</option>
                        <?php foreach ($lineasDisponibles as $l): ?>
                            <option value="<?= (int) $l['id'] ?>"<?= (int) $datos['linea_id'] === (int) $l['id'] ? ' selected' : '' ?>><?= e($l['nombre']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-4 col-md-2"><label class="form-label" for="codigo">Número</label><input class="form-control" id="codigo" name="codigo" value="<?= e($datos['codigo']) ?>" required maxlength="10"></div>
                <div class="col-8 col-md-4"><label class="form-label" for="nombre">Nombre</label><input class="form-control" id="nombre" name="nombre" value="<?= e($datos['nombre']) ?>" required maxlength="120"></div>
                <div class="col-md-4"><label class="form-label" for="origen">Origen</label><input class="form-control" id="origen" name="origen" value="<?= e($datos['origen']) ?>" required maxlength="120"></div>
                <div class="col-md-4"><label class="form-label" for="destino">Destino</label><input class="form-control" id="destino" name="destino" value="<?= e($datos['destino']) ?>" required maxlength="120"></div>
                <div class="col-md-4">
                    <label class="form-label" for="sentido">Sentido de circulación</label>
                    <select class="form-select" id="sentido" name="sentido">
                        <?php foreach (['ida' => 'Ida', 'vuelta' => 'Vuelta', 'circular' => 'Circuito (regresa al inicio)'] as $v => $t): ?>
                            <option value="<?= $v ?>"<?= $datos['sentido'] === $v ? ' selected' : '' ?>><?= $t ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-4 col-md-2"><label class="form-label" for="color">Color</label><input class="form-control form-control-color w-100" type="color" id="color" name="color" value="<?= e($datos['color']) ?>"></div>
                <div class="col-4 col-md-2"><label class="form-label" for="tarifa">Tarifa ($)</label><input class="form-control" type="number" step="0.5" min="0" id="tarifa" name="tarifa" value="<?= e($datos['tarifa']) ?>"></div>
                <div class="col-4 col-md-3"><label class="form-label" for="velocidad_promedio_kmh">Velocidad prom. (km/h)</label><input class="form-control" type="number" step="0.5" min="5" max="80" id="velocidad_promedio_kmh" name="velocidad_promedio_kmh" value="<?= e($datos['velocidad_promedio_kmh']) ?>" required></div>
                <div class="col-md-5">
                    <label class="form-label" for="estado_servicio">Estado del servicio</label>
                    <select class="form-select" id="estado_servicio" name="estado_servicio">
                        <?php foreach (['normal' => 'Operando con normalidad', 'con_retrasos' => 'Con retrasos', 'suspendida' => 'Suspendido'] as $v => $t): ?>
                            <option value="<?= $v ?>"<?= $datos['estado_servicio'] === $v ? ' selected' : '' ?>><?= $t ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-12"><label class="form-label" for="aviso">Aviso para pasajeros (opcional)</label><input class="form-control" id="aviso" name="aviso" value="<?= e($datos['aviso']) ?>" maxlength="255" placeholder="Ej. Desvío temporal por obras en…"></div>
                <div class="col-12"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="activa" name="activa"<?= $datos['activa'] ? ' checked' : '' ?>><label class="form-check-label" for="activa">Ruta publicada (visible para pasajeros)</label></div></div>
                <div class="col-12 small text-secondary">La velocidad promedio se usa para estimar los tiempos aproximados de llegada.</div>
            </div>
        </div>

        <div class="row g-3">
            <div class="col-lg-5">
                <div class="mr-tarjeta mr-tarjeta-cuerpo h-100">
                    <h2 class="mr-seccion-titulo"><i class="bi bi-geo-alt"></i> Paradas en orden</h2>
                    <div class="input-group mb-2">
                        <select class="form-select" id="selectorParada" aria-label="Parada para agregar">
                            <option value="">Selecciona una parada…</option>
                            <?php foreach ($paradasDisponibles as $p): ?>
                                <option value="<?= (int) $p['id'] ?>"><?= e($p['nombre']) ?></option>
                            <?php endforeach; ?>
                        </select>
                        <button class="btn btn-secondary" type="button" id="btnAgregarParada"><i class="bi bi-plus-lg"></i> Agregar</button>
                    </div>
                    <p class="small text-secondary mb-2">También puedes hacer clic en una parada del mapa para agregarla. ¿Falta una parada? <a href="<?= url($panel . '/paradas.php?accion=nuevo') ?>" target="_blank" rel="noopener">Registrarla</a>.</p>
                    <ol class="list-group list-group-numbered mr-editor-lista" id="listaSeleccion"></ol>
                    <div id="sinParadas" class="mr-vacio small">Aún no agregas paradas.</div>
                </div>
            </div>
            <div class="col-lg-7">
                <div class="mr-tarjeta mr-tarjeta-cuerpo">
                    <h2 class="mr-seccion-titulo"><i class="bi bi-bezier2"></i> Trazado en el mapa</h2>
                    <div class="d-flex flex-wrap gap-2 mb-2">
                        <button class="btn btn-sm btn-outline-primary" type="button" id="btnDibujar"><i class="bi bi-pencil"></i> <span>Dibujar trazado</span></button>
                        <button class="btn btn-sm btn-secondary" type="button" id="btnDesdeParadas"><i class="bi bi-magic"></i> Unir paradas en orden</button>
                        <button class="btn btn-sm btn-secondary" type="button" id="btnDeshacer"><i class="bi bi-arrow-counterclockwise"></i> Deshacer punto</button>
                        <button class="btn btn-sm btn-secondary" type="button" id="btnBorrarTrazado"><i class="bi bi-trash"></i> Borrar trazado</button>
                    </div>
                    <div id="mapa" class="mr-mapa" style="height: 440px"></div>
                    <div class="small text-secondary mt-2" id="ayudaTrazado">Activa "Dibujar trazado" y haz clic sobre las calles por donde circula la ruta. <span id="totalPuntos"></span></div>
                </div>
            </div>
        </div>

        <div class="mt-4 d-flex gap-2">
            <button class="btn btn-primary" type="submit"><i class="bi bi-check-lg"></i> Guardar ruta</button>
            <a class="btn btn-outline-primary" href="<?= url($panel . '/rutas.php') ?>">Cancelar</a>
        </div>
    </form>
    <script type="application/json" id="datosEditor"><?= json_encode([
        'paradasDisponibles' => array_map(fn($p) => ['id' => (int) $p['id'], 'nombre' => $p['nombre'], 'referencia' => $p['referencia'],
                                                    'latitud' => (float) $p['latitud'], 'longitud' => (float) $p['longitud']], $paradasDisponibles),
        'paradas'   => array_values($datos['paradas']),
        'recorrido' => array_values($datos['recorrido']),
    ], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?></script>
<?php endif; ?>
