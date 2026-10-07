<?php /** Vista de gestión de choferes (lista y formulario). */ ?>
<?php if ($accion === 'lista'): ?>
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div><h1 class="h3 mb-1">Choferes</h1><p class="text-secondary mb-0"><?= count($choferes) ?> chofer(es) registrados.</p></div>
        <?php if ($lineasDisponibles): ?>
            <a class="btn btn-primary" href="<?= url($panel . '/choferes.php?accion=nuevo') ?>"><i class="bi bi-plus-lg"></i> Registrar chofer</a>
        <?php endif; ?>
    </div>
    <div class="mr-tarjeta">
        <?php if (!$choferes): ?>
            <div class="mr-vacio"><i class="bi bi-person-vcard"></i><?= $lineasDisponibles ? 'Aún no hay choferes registrados.' : 'No tienes líneas asignadas. Comunícate con el administrador.' ?></div>
        <?php else: ?>
            <div class="table-responsive">
                <table class="table mr-tabla table-hover">
                    <thead><tr><th>Nombre</th><th>Línea</th><th>Licencia</th><th>Teléfono</th><th>Estado</th><th></th></tr></thead>
                    <tbody>
                    <?php foreach ($choferes as $c): ?>
                        <tr>
                            <td><div class="fw-semibold"><?= e($c['nombre']) ?></div><div class="small text-secondary"><?= e($c['email']) ?></div></td>
                            <td class="small"><?= e($c['linea']) ?></td>
                            <td class="small"><?= e($c['numero_licencia']) ?></td>
                            <td class="small"><?= e($c['telefono'] ?: '—') ?></td>
                            <td>
                                <?php if (!(int) $c['activo']): ?><span class="mr-estado suspendido">Inactivo</span>
                                <?php elseif ((int) $c['en_viaje']): ?><span class="mr-estado normal"><i class="bi bi-broadcast"></i> En viaje</span>
                                <?php else: ?><span class="mr-etiqueta">Activo</span><?php endif; ?>
                            </td>
                            <td class="text-end"><a class="btn btn-sm btn-outline-primary" href="<?= url($panel . '/choferes.php?accion=editar&id=' . (int) $c['id']) ?>"><i class="bi bi-pencil"></i> Editar</a></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
<?php else: ?>
    <nav aria-label="Ruta de navegación"><ol class="breadcrumb small"><li class="breadcrumb-item"><a href="<?= url($panel . '/choferes.php') ?>">Choferes</a></li><li class="breadcrumb-item active"><?= $chofer ? 'Editar' : 'Nuevo' ?></li></ol></nav>
    <h1 class="h3 mb-3"><?= $chofer ? 'Editar chofer' : 'Registrar chofer' ?></h1>
    <?php require APP_ROOT . '/views/partes/errores.php'; ?>
    <form class="mr-tarjeta mr-tarjeta-cuerpo" method="post" novalidate style="max-width: 760px">
        <?= campo_csrf() ?>
        <div class="row g-3">
            <div class="col-md-6"><label class="form-label" for="nombre">Nombre completo</label><input class="form-control" id="nombre" name="nombre" value="<?= e($datos['nombre']) ?>" required maxlength="100"></div>
            <div class="col-md-6"><label class="form-label" for="email">Correo (para iniciar sesión)</label><input class="form-control" type="email" id="email" name="email" value="<?= e($datos['email']) ?>" required maxlength="150"></div>
            <div class="col-md-6">
                <label class="form-label" for="password"><?= $chofer ? 'Nueva contraseña (opcional)' : 'Contraseña' ?></label>
                <input class="form-control" type="password" id="password" name="password" minlength="8" maxlength="100" autocomplete="new-password" <?= $chofer ? '' : 'required' ?>>
                <div class="form-text">Mínimo 8 caracteres.<?= $chofer ? ' Déjala vacía para conservar la actual.' : '' ?></div>
            </div>
            <div class="col-md-6">
                <label class="form-label" for="linea_id">Línea</label>
                <select class="form-select" id="linea_id" name="linea_id" required>
                    <option value="">Selecciona una línea</option>
                    <?php foreach ($lineasDisponibles as $l): ?>
                        <option value="<?= (int) $l['id'] ?>"<?= (int) $datos['linea_id'] === (int) $l['id'] ? ' selected' : '' ?>><?= e($l['nombre']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-6"><label class="form-label" for="numero_licencia">Número de licencia</label><input class="form-control" id="numero_licencia" name="numero_licencia" value="<?= e($datos['numero_licencia']) ?>" required maxlength="30"></div>
            <div class="col-md-6"><label class="form-label" for="telefono">Teléfono</label><input class="form-control" type="tel" id="telefono" name="telefono" value="<?= e($datos['telefono']) ?>" maxlength="30"></div>
            <div class="col-12"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="activo" name="activo"<?= $datos['activo'] ? ' checked' : '' ?>><label class="form-check-label" for="activo">Chofer activo (puede iniciar sesión e iniciar viajes)</label></div></div>
        </div>
        <div class="mt-4 d-flex gap-2">
            <button class="btn btn-primary" type="submit"><i class="bi bi-check-lg"></i> Guardar</button>
            <a class="btn btn-outline-primary" href="<?= url($panel . '/choferes.php') ?>">Cancelar</a>
        </div>
    </form>
<?php endif; ?>
