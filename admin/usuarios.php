<?php
require __DIR__ . '/_admin.php';

// Los choferes se crean desde el módulo Choferes porque requieren línea y licencia.
const ROLES_ASIGNABLES = [ROL_PASAJERO, ROL_DUENO, ROL_ADMIN];

$accion = in_array($_GET['accion'] ?? '', ['nuevo', 'editar'], true) ? $_GET['accion'] : 'lista';
$errores = [];
$editado = null;
if ($accion === 'editar') {
    $editado = Usuario::buscarPorId((int) entero_entrada($_GET, 'id'));
    if (!$editado) {
        mostrar_error(404, 'El usuario no existe.');
    }
    if ($editado['rol'] === ROL_CHOFER) {
        $chofer = Chofer::porUsuario((int) $editado['id']);
        if ($chofer) {
            redirigir('admin/choferes.php?accion=editar&id=' . (int) $chofer['id']);
        }
    }
}
$esPropio = $editado && (int) $editado['id'] === $usuario['id'];
$datos = $editado ? ['nombre' => $editado['nombre'], 'email' => $editado['email'], 'rol' => $editado['rol'], 'activo' => (bool) $editado['activo']]
                  : ['nombre' => '', 'email' => '', 'rol' => ROL_PASAJERO, 'activo' => true];

if ($accion !== 'lista' && es_post()) {
    verificar_csrf();
    $datos = [
        'nombre' => texto_entrada($_POST, 'nombre', 100),
        'email'  => mb_strtolower(texto_entrada($_POST, 'email', 150)),
        'rol'    => texto_entrada($_POST, 'rol', 20),
        'activo' => isset($_POST['activo']),
    ];
    $password = is_string($_POST['password'] ?? null) ? $_POST['password'] : '';

    if (mb_strlen($datos['nombre']) < 3) $errores[] = 'Escribe el nombre completo.';
    if (!filter_var($datos['email'], FILTER_VALIDATE_EMAIL)) $errores[] = 'Escribe un correo electrónico válido.';
    elseif (Usuario::emailEnUso($datos['email'], $editado ? (int) $editado['id'] : null)) $errores[] = 'Ese correo ya está registrado.';
    if (!in_array($datos['rol'], ROLES_ASIGNABLES, true)) $errores[] = 'Selecciona un perfil válido.';
    if (!$editado && mb_strlen($password) < 8) $errores[] = 'La contraseña debe tener al menos 8 caracteres.';
    if ($editado && $password !== '' && mb_strlen($password) < 8) $errores[] = 'La nueva contraseña debe tener al menos 8 caracteres.';
    if ($esPropio && ($datos['rol'] !== ROL_ADMIN || !$datos['activo'])) $errores[] = 'No puedes quitarte el perfil de administrador ni desactivar tu propia cuenta.';
    if ($editado && $editado['rol'] === ROL_DUENO && $datos['rol'] !== ROL_DUENO && Linea::idsDeDueno((int) $editado['id'])) {
        $errores[] = 'Este usuario es dueño de una o más líneas. Reasigna esas líneas antes de cambiar su perfil.';
    }

    if (!$errores) {
        if ($editado) {
            Usuario::actualizar((int) $editado['id'], $datos['nombre'], $datos['email'], $datos['rol'], $datos['activo']);
            if ($password !== '') {
                Usuario::cambiarPassword((int) $editado['id'], $password);
            }
            flash('success', 'La cuenta se actualizó.');
        } else {
            $nuevo = Usuario::crear($datos['nombre'], $datos['email'], $password, $datos['rol']);
            if (!$datos['activo']) {
                Usuario::cambiarActivo($nuevo, false);
            }
            flash('success', 'Cuenta creada.');
        }
        redirigir('admin/usuarios.php');
    }
}

$filtroRol = in_array($_GET['rol'] ?? '', [ROL_PASAJERO, ROL_CHOFER, ROL_DUENO, ROL_ADMIN], true) ? $_GET['rol'] : null;
$busqueda = texto_entrada($_GET, 'q', 80);

$titulo = 'Usuarios';
$seccion = 'panel';
$menuActivo = 'usuarios';
require APP_ROOT . '/views/layout/encabezado.php';
require APP_ROOT . '/views/layout/panel_inicio.php';
?>
<?php if ($accion === 'lista'): $usuarios = Usuario::listar($filtroRol, $busqueda); ?>
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div><h1 class="h3 mb-1">Usuarios</h1><p class="text-secondary mb-0">Cuentas y perfiles de acceso.</p></div>
        <a class="btn btn-primary" href="<?= url('admin/usuarios.php?accion=nuevo') ?>"><i class="bi bi-plus-lg"></i> Crear cuenta</a>
    </div>
    <form class="mr-tarjeta p-3 mb-3 row g-2 mx-0" method="get">
        <div class="col-md-6"><input class="form-control" type="search" name="q" value="<?= e($busqueda) ?>" placeholder="Buscar por nombre o correo" maxlength="80" aria-label="Buscar"></div>
        <div class="col-md-4">
            <select class="form-select" name="rol" aria-label="Perfil">
                <option value="">Todos los perfiles</option>
                <?php foreach ([ROL_PASAJERO, ROL_CHOFER, ROL_DUENO, ROL_ADMIN] as $r): ?>
                    <option value="<?= $r ?>"<?= $filtroRol === $r ? ' selected' : '' ?>><?= e(nombre_rol($r)) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-2 d-grid"><button class="btn btn-primary" type="submit">Filtrar</button></div>
    </form>
    <div class="mr-tarjeta">
        <?php if (!$usuarios): ?>
            <div class="mr-vacio"><i class="bi bi-people"></i>No hay cuentas con esos filtros.</div>
        <?php else: ?>
            <div class="table-responsive">
                <table class="table mr-tabla table-hover">
                    <thead><tr><th>Nombre</th><th>Perfil</th><th>Último acceso</th><th>Estado</th><th></th></tr></thead>
                    <tbody>
                    <?php foreach ($usuarios as $u): ?>
                        <tr>
                            <td><div class="fw-semibold"><?= e($u['nombre']) ?></div><div class="small text-secondary"><?= e($u['email']) ?></div></td>
                            <td class="small"><?= e(nombre_rol($u['rol'])) ?></td>
                            <td class="small"><?= e(formato_fecha($u['ultimo_acceso'])) ?></td>
                            <td><?= (int) $u['activo'] ? '<span class="mr-etiqueta">Activa</span>' : '<span class="mr-estado suspendido">Desactivada</span>' ?></td>
                            <td class="text-end"><a class="btn btn-sm btn-outline-primary" href="<?= url('admin/usuarios.php?accion=editar&id=' . (int) $u['id']) ?>"><i class="bi bi-pencil"></i> Editar</a></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
<?php else: ?>
    <nav aria-label="Ruta de navegación"><ol class="breadcrumb small"><li class="breadcrumb-item"><a href="<?= url('admin/usuarios.php') ?>">Usuarios</a></li><li class="breadcrumb-item active"><?= $editado ? 'Editar' : 'Nueva cuenta' ?></li></ol></nav>
    <h1 class="h3 mb-3"><?= $editado ? 'Editar cuenta' : 'Crear cuenta' ?></h1>
    <?php require APP_ROOT . '/views/partes/errores.php'; ?>
    <form class="mr-tarjeta mr-tarjeta-cuerpo" method="post" novalidate style="max-width: 760px">
        <?= campo_csrf() ?>
        <div class="row g-3">
            <div class="col-md-6"><label class="form-label" for="nombre">Nombre completo</label><input class="form-control" id="nombre" name="nombre" value="<?= e($datos['nombre']) ?>" required maxlength="100"></div>
            <div class="col-md-6"><label class="form-label" for="email">Correo electrónico</label><input class="form-control" type="email" id="email" name="email" value="<?= e($datos['email']) ?>" required maxlength="150"></div>
            <div class="col-md-6">
                <label class="form-label" for="rol">Perfil</label>
                <select class="form-select" id="rol" name="rol"<?= $esPropio ? ' disabled' : '' ?>>
                    <?php foreach (ROLES_ASIGNABLES as $r): ?>
                        <option value="<?= $r ?>"<?= $datos['rol'] === $r ? ' selected' : '' ?>><?= e(nombre_rol($r)) ?></option>
                    <?php endforeach; ?>
                </select>
                <?php if ($esPropio): ?><input type="hidden" name="rol" value="<?= ROL_ADMIN ?>"><?php endif; ?>
                <div class="form-text">Los choferes se registran desde <a href="<?= url('admin/choferes.php?accion=nuevo') ?>">Choferes</a>.</div>
            </div>
            <div class="col-md-6">
                <label class="form-label" for="password"><?= $editado ? 'Nueva contraseña (opcional)' : 'Contraseña' ?></label>
                <input class="form-control" type="password" id="password" name="password" minlength="8" maxlength="100" autocomplete="new-password" <?= $editado ? '' : 'required' ?>>
                <div class="form-text">Mínimo 8 caracteres.</div>
            </div>
            <div class="col-12">
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="activo" name="activo"<?= $datos['activo'] ? ' checked' : '' ?><?= $esPropio ? ' disabled' : '' ?>>
                    <label class="form-check-label" for="activo">Cuenta activa (puede iniciar sesión)</label>
                </div>
                <?php if ($esPropio): ?><input type="hidden" name="activo" value="1"><?php endif; ?>
            </div>
        </div>
        <div class="mt-4 d-flex gap-2">
            <button class="btn btn-primary" type="submit"><i class="bi bi-check-lg"></i> Guardar</button>
            <a class="btn btn-outline-primary" href="<?= url('admin/usuarios.php') ?>">Cancelar</a>
        </div>
    </form>
<?php endif; ?>
<?php
require APP_ROOT . '/views/layout/panel_fin.php';
require APP_ROOT . '/views/layout/pie.php';
