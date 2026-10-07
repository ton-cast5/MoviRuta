<?php
require __DIR__ . '/_admin.php';

$accion = in_array($_GET['accion'] ?? '', ['nuevo', 'editar'], true) ? $_GET['accion'] : 'lista';
$errores = [];
$linea = null;
if ($accion === 'editar') {
    $linea = Linea::buscarPorId((int) entero_entrada($_GET, 'id'));
    if (!$linea) {
        mostrar_error(404, 'La línea no existe.');
    }
}
$duenos = array_filter(Usuario::listar(ROL_DUENO), fn($u) => (int) $u['activo']);
$datos = $linea ? [
    'nombre' => $linea['nombre'], 'descripcion' => (string) $linea['descripcion'], 'telefono' => (string) $linea['telefono'],
    'dueno_id' => $linea['dueno_id'] !== null ? (int) $linea['dueno_id'] : null, 'activa' => (bool) $linea['activa'],
] : ['nombre' => '', 'descripcion' => '', 'telefono' => '', 'dueno_id' => null, 'activa' => true];

if ($accion !== 'lista' && es_post()) {
    verificar_csrf();
    $datos = [
        'nombre'      => texto_entrada($_POST, 'nombre', 120),
        'descripcion' => texto_entrada($_POST, 'descripcion', 255),
        'telefono'    => texto_entrada($_POST, 'telefono', 30),
        'dueno_id'    => entero_entrada($_POST, 'dueno_id'),
        'activa'      => isset($_POST['activa']),
    ];
    if (mb_strlen($datos['nombre']) < 3) $errores[] = 'Escribe el nombre de la línea.';
    elseif (Linea::nombreEnUso($datos['nombre'], $linea ? (int) $linea['id'] : null)) $errores[] = 'Ya existe una línea con ese nombre.';
    if ($datos['telefono'] !== '' && !preg_match('/^[0-9 +()\-]{7,30}$/', $datos['telefono'])) $errores[] = 'El teléfono no es válido.';
    if ($datos['dueno_id'] !== null) {
        $dueno = Usuario::buscarPorId($datos['dueno_id']);
        if (!$dueno || $dueno['rol'] !== ROL_DUENO || !(int) $dueno['activo']) $errores[] = 'Selecciona un dueño de línea válido.';
    }
    if (!$errores) {
        Linea::guardar($linea ? (int) $linea['id'] : null, $datos);
        flash('success', $linea ? 'La línea se actualizó.' : 'Línea creada.');
        redirigir('admin/lineas.php');
    }
}

$titulo = 'Líneas de transporte';
$seccion = 'panel';
$menuActivo = 'lineas';
require APP_ROOT . '/views/layout/encabezado.php';
require APP_ROOT . '/views/layout/panel_inicio.php';
?>
<?php if ($accion === 'lista'): $lineas = Linea::listar(); ?>
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div><h1 class="h3 mb-1">Líneas de transporte</h1><p class="text-secondary mb-0"><?= count($lineas) ?> línea(s).</p></div>
        <a class="btn btn-primary" href="<?= url('admin/lineas.php?accion=nuevo') ?>"><i class="bi bi-plus-lg"></i> Crear línea</a>
    </div>
    <div class="mr-tarjeta">
        <?php if (!$lineas): ?>
            <div class="mr-vacio"><i class="bi bi-diagram-3"></i>Aún no hay líneas registradas.</div>
        <?php else: ?>
            <div class="table-responsive">
                <table class="table mr-tabla table-hover">
                    <thead><tr><th>Línea</th><th>Dueño</th><th>Teléfono</th><th>Rutas</th><th>Vehículos</th><th>Choferes</th><th>Estado</th><th></th></tr></thead>
                    <tbody>
                    <?php foreach ($lineas as $l): ?>
                        <tr>
                            <td><div class="fw-semibold"><?= e($l['nombre']) ?></div><div class="small text-secondary"><?= e($l['descripcion']) ?></div></td>
                            <td class="small"><?= e($l['dueno_nombre'] ?: 'Sin asignar') ?></td>
                            <td class="small"><?= e($l['telefono'] ?: '—') ?></td>
                            <td><?= (int) $l['total_rutas'] ?></td>
                            <td><?= (int) $l['total_vehiculos'] ?></td>
                            <td><?= (int) $l['total_choferes'] ?></td>
                            <td><?= (int) $l['activa'] ? '<span class="mr-etiqueta">Activa</span>' : '<span class="mr-estado suspendido">Inactiva</span>' ?></td>
                            <td class="text-end"><a class="btn btn-sm btn-outline-primary" href="<?= url('admin/lineas.php?accion=editar&id=' . (int) $l['id']) ?>"><i class="bi bi-pencil"></i> Editar</a></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
<?php else: ?>
    <nav aria-label="Ruta de navegación"><ol class="breadcrumb small"><li class="breadcrumb-item"><a href="<?= url('admin/lineas.php') ?>">Líneas</a></li><li class="breadcrumb-item active"><?= $linea ? 'Editar' : 'Nueva' ?></li></ol></nav>
    <h1 class="h3 mb-3"><?= $linea ? 'Editar línea' : 'Crear línea' ?></h1>
    <?php require APP_ROOT . '/views/partes/errores.php'; ?>
    <form class="mr-tarjeta mr-tarjeta-cuerpo" method="post" novalidate style="max-width: 760px">
        <?= campo_csrf() ?>
        <div class="row g-3">
            <div class="col-md-7"><label class="form-label" for="nombre">Nombre</label><input class="form-control" id="nombre" name="nombre" value="<?= e($datos['nombre']) ?>" required maxlength="120"></div>
            <div class="col-md-5"><label class="form-label" for="telefono">Teléfono</label><input class="form-control" type="tel" id="telefono" name="telefono" value="<?= e($datos['telefono']) ?>" maxlength="30"></div>
            <div class="col-12"><label class="form-label" for="descripcion">Descripción</label><input class="form-control" id="descripcion" name="descripcion" value="<?= e($datos['descripcion']) ?>" maxlength="255"></div>
            <div class="col-md-7">
                <label class="form-label" for="dueno_id">Dueño de línea</label>
                <select class="form-select" id="dueno_id" name="dueno_id">
                    <option value="">Sin asignar</option>
                    <?php foreach ($duenos as $d): ?>
                        <option value="<?= (int) $d['id'] ?>"<?= $datos['dueno_id'] === (int) $d['id'] ? ' selected' : '' ?>><?= e($d['nombre']) ?> (<?= e($d['email']) ?>)</option>
                    <?php endforeach; ?>
                </select>
                <div class="form-text">Para agregar un dueño, primero crea su cuenta en <a href="<?= url('admin/usuarios.php?accion=nuevo') ?>">Usuarios</a>.</div>
            </div>
            <div class="col-12"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="activa" name="activa"<?= $datos['activa'] ? ' checked' : '' ?>><label class="form-check-label" for="activa">Línea activa (sus rutas son visibles para pasajeros)</label></div></div>
        </div>
        <div class="mt-4 d-flex gap-2">
            <button class="btn btn-primary" type="submit"><i class="bi bi-check-lg"></i> Guardar</button>
            <a class="btn btn-outline-primary" href="<?= url('admin/lineas.php') ?>">Cancelar</a>
        </div>
    </form>
<?php endif; ?>
<?php
require APP_ROOT . '/views/layout/panel_fin.php';
require APP_ROOT . '/views/layout/pie.php';
