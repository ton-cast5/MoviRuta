<?php /** Vista de gestión de paradas (lista y formulario con mapa). */ ?>
<?php if ($accion === 'lista'): ?>
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div><h1 class="h3 mb-1">Paradas</h1><p class="text-secondary mb-0"><?= count($paradas) ?> parada(s). Las paradas se comparten entre rutas y líneas.</p></div>
        <a class="btn btn-primary" href="<?= url($panel . '/paradas.php?accion=nuevo') ?>"><i class="bi bi-plus-lg"></i> Registrar parada</a>
    </div>
    <div class="mr-tarjeta p-3 mb-3">
        <label class="visually-hidden" for="filtroParadas">Filtrar paradas</label>
        <input class="form-control" type="search" id="filtroParadas" placeholder="Filtrar por nombre o referencia" data-filtro="#tablaParadas">
    </div>
    <div class="mr-tarjeta">
        <div class="table-responsive">
            <table class="table mr-tabla table-hover">
                <thead><tr><th>Código</th><th>Nombre</th><th>Referencia</th><th>Rutas</th><th>Estado</th><?php if ($puedeEditar): ?><th></th><?php endif; ?></tr></thead>
                <tbody id="tablaParadas">
                <?php foreach ($paradas as $p): ?>
                    <tr data-texto="<?= e(mb_strtolower($p['codigo'] . ' ' . $p['nombre'] . ' ' . $p['referencia'])) ?>">
                        <td class="small"><?= $p['codigo'] !== null ? '#' . e($p['codigo']) : '—' ?></td>
                        <td class="fw-semibold"><?= e($p['nombre']) ?></td>
                        <td class="small"><?= e($p['referencia'] ?: '—') ?></td>
                        <td class="small"><?= (int) $p['total_rutas'] ?></td>
                        <td><?= (int) $p['activa'] ? '<span class="mr-etiqueta">Activa</span>' : '<span class="mr-estado suspendido">Inactiva</span>' ?></td>
                        <?php if ($puedeEditar): ?>
                            <td class="text-end"><a class="btn btn-sm btn-outline-primary" href="<?= url($panel . '/paradas.php?accion=editar&id=' . (int) $p['id']) ?>"><i class="bi bi-pencil"></i> Editar</a></td>
                        <?php endif; ?>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <div id="sinCoincidencias" class="mr-vacio d-none">No hay paradas que coincidan.</div>
    </div>
    <script src="<?= asset('js/filtro.js') ?>" defer></script>
<?php else: ?>
    <nav aria-label="Ruta de navegación"><ol class="breadcrumb small"><li class="breadcrumb-item"><a href="<?= url($panel . '/paradas.php') ?>">Paradas</a></li><li class="breadcrumb-item active"><?= $parada ? 'Editar' : 'Nueva' ?></li></ol></nav>
    <h1 class="h3 mb-3"><?= $parada ? 'Editar parada' : 'Registrar parada' ?></h1>
    <?php require APP_ROOT . '/views/partes/errores.php'; ?>
    <form class="mr-tarjeta mr-tarjeta-cuerpo" method="post" novalidate>
        <?= campo_csrf() ?>
        <input type="hidden" id="latitud" name="latitud" value="<?= e($datos['latitud']) ?>">
        <input type="hidden" id="longitud" name="longitud" value="<?= e($datos['longitud']) ?>">
        <div class="row g-3">
            <div class="col-md-2"><label class="form-label" for="codigo">Código</label><input class="form-control text-uppercase" id="codigo" name="codigo" value="<?= e($datos['codigo']) ?>" maxlength="10" placeholder="Ej. 108"></div>
            <div class="col-md-4"><label class="form-label" for="nombre">Nombre de la parada</label><input class="form-control" id="nombre" name="nombre" value="<?= e($datos['nombre']) ?>" required maxlength="120"></div>
            <div class="col-md-6"><label class="form-label" for="referencia">Punto de referencia</label><input class="form-control" id="referencia" name="referencia" value="<?= e($datos['referencia']) ?>" maxlength="255" placeholder="Ej. Frente al mercado, esquina con…"></div>
            <div class="col-12">
                <label class="form-label">Ubicación</label>
                <div id="mapa" class="mr-mapa" style="height: 400px"></div>
                <div class="small mt-1" id="estadoUbicacion"><?= $datos['latitud'] !== null ? '<span class="text-success"><i class="bi bi-check-circle"></i> Ubicación marcada. Arrastra el marcador para ajustarla.</span>' : '<span class="text-secondary">Haz clic en el mapa para marcar dónde está la parada.</span>' ?></div>
            </div>
            <?php if ($puedeEditar): ?>
                <div class="col-12"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="activa" name="activa"<?= $datos['activa'] ? ' checked' : '' ?>><label class="form-check-label" for="activa">Parada activa</label></div></div>
            <?php endif; ?>
        </div>
        <div class="mt-4 d-flex gap-2">
            <button class="btn btn-primary" type="submit"><i class="bi bi-check-lg"></i> Guardar</button>
            <a class="btn btn-outline-primary" href="<?= url($panel . '/paradas.php') ?>">Cancelar</a>
        </div>
    </form>
<?php endif; ?>
