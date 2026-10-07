<?php /** Vista de gestión de vehículos (lista y formulario). */ ?>
<?php if ($accion === 'lista'): ?>
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div><h1 class="h3 mb-1">Vehículos</h1><p class="text-secondary mb-0"><?= count($vehiculos) ?> vehículo(s) registrados.</p></div>
        <?php if ($lineasDisponibles): ?>
            <a class="btn btn-primary" href="<?= url($panel . '/vehiculos.php?accion=nuevo') ?>"><i class="bi bi-plus-lg"></i> Registrar vehículo</a>
        <?php endif; ?>
    </div>
    <div class="mr-tarjeta">
        <?php if (!$vehiculos): ?>
            <div class="mr-vacio"><i class="bi bi-bus-front"></i><?= $lineasDisponibles ? 'Aún no hay vehículos registrados.' : 'No tienes líneas asignadas. Comunícate con el administrador.' ?></div>
        <?php else: ?>
            <div class="table-responsive">
                <table class="table mr-tabla table-hover">
                    <thead><tr><th>Unidad</th><th>Línea</th><th>Placa</th><th>Modelo</th><th>Capacidad</th><th>GPS</th><th>Estado</th><th></th></tr></thead>
                    <tbody>
                    <?php foreach ($vehiculos as $v): ?>
                        <tr>
                            <td class="fw-semibold"><?= e($v['numero_unidad']) ?></td>
                            <td class="small"><?= e($v['linea']) ?></td>
                            <td class="small"><?= e($v['placa']) ?></td>
                            <td class="small"><?= e($v['modelo'] ?: '—') ?></td>
                            <td class="small"><?= $v['capacidad'] ? (int) $v['capacidad'] : '—' ?></td>
                            <td><?= (int) $v['cuenta_con_gps'] ? '<i class="bi bi-broadcast text-success" title="Con dispositivo de ubicación"></i>' : '<i class="bi bi-slash-circle text-secondary" title="Sin dispositivo de ubicación"></i>' ?></td>
                            <td>
                                <?php if (!(int) $v['activo']): ?><span class="mr-estado suspendido">Inactivo</span>
                                <?php elseif ($v['ruta_en_curso'] !== null): ?><span class="mr-estado normal"><i class="bi bi-broadcast"></i> En ruta <?= e($v['ruta_en_curso']) ?></span>
                                <?php else: ?><span class="mr-etiqueta">Disponible</span><?php endif; ?>
                            </td>
                            <td class="text-end"><a class="btn btn-sm btn-outline-primary" href="<?= url($panel . '/vehiculos.php?accion=editar&id=' . (int) $v['id']) ?>"><i class="bi bi-pencil"></i> Editar</a></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
<?php else: ?>
    <nav aria-label="Ruta de navegación"><ol class="breadcrumb small"><li class="breadcrumb-item"><a href="<?= url($panel . '/vehiculos.php') ?>">Vehículos</a></li><li class="breadcrumb-item active"><?= $vehiculo ? 'Editar' : 'Nuevo' ?></li></ol></nav>
    <h1 class="h3 mb-3"><?= $vehiculo ? 'Editar vehículo' : 'Registrar vehículo' ?></h1>
    <?php require APP_ROOT . '/views/partes/errores.php'; ?>
    <form class="mr-tarjeta mr-tarjeta-cuerpo" method="post" novalidate style="max-width: 760px">
        <?= campo_csrf() ?>
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
            <div class="col-md-3"><label class="form-label" for="numero_unidad">Número de unidad</label><input class="form-control" id="numero_unidad" name="numero_unidad" value="<?= e($datos['numero_unidad']) ?>" required maxlength="20"></div>
            <div class="col-md-3"><label class="form-label" for="placa">Placa</label><input class="form-control text-uppercase" id="placa" name="placa" value="<?= e($datos['placa']) ?>" required maxlength="15" pattern="[A-Za-z0-9\-]{4,15}"></div>
            <div class="col-md-8"><label class="form-label" for="modelo">Modelo / descripción</label><input class="form-control" id="modelo" name="modelo" value="<?= e($datos['modelo']) ?>" maxlength="80"></div>
            <div class="col-md-4"><label class="form-label" for="capacidad">Capacidad (pasajeros)</label><input class="form-control" type="number" id="capacidad" name="capacidad" value="<?= e($datos['capacidad']) ?>" min="1" max="300"></div>
            <div class="col-md-6"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="cuenta_con_gps" name="cuenta_con_gps"<?= $datos['cuenta_con_gps'] ? ' checked' : '' ?>><label class="form-check-label" for="cuenta_con_gps">Cuenta con dispositivo de ubicación (GPS)</label></div></div>
            <div class="col-md-6"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="activo" name="activo"<?= $datos['activo'] ? ' checked' : '' ?>><label class="form-check-label" for="activo">Vehículo activo</label></div></div>
        </div>
        <div class="mt-4 d-flex gap-2">
            <button class="btn btn-primary" type="submit"><i class="bi bi-check-lg"></i> Guardar</button>
            <a class="btn btn-outline-primary" href="<?= url($panel . '/vehiculos.php') ?>">Cancelar</a>
        </div>
    </form>
<?php endif; ?>
