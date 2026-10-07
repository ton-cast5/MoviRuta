<?php
require __DIR__ . '/_chofer.php';

$choferId = (int) $chofer['id'];
$lineaId = (int) $chofer['linea_id'];

if (Viaje::enCursoDeChofer($choferId)) {
    flash('info', 'Ya tienes un viaje en curso. Finalízalo antes de iniciar otro.');
    redirigir('chofer/viaje.php');
}

$rutas = array_values(array_filter(Ruta::listarGestion([$lineaId]), fn($r) => (int) $r['activa']));
$vehiculos = Vehiculo::disponibles($lineaId);
$errores = [];

if (es_post()) {
    verificar_csrf();
    $rutaId = entero_entrada($_POST, 'ruta_id');
    $vehiculoId = entero_entrada($_POST, 'vehiculo_id');

    // Validación en servidor: ruta y vehículo deben pertenecer a la línea del chofer y estar disponibles.
    $ruta = $rutaId ? Ruta::buscarPorId($rutaId, false) : null;
    $vehiculo = $vehiculoId ? Vehiculo::buscarPorId($vehiculoId) : null;

    if (!(int) $chofer['activo']) {
        $errores[] = 'Tu registro de chofer está inactivo. Comunícate con el dueño de tu línea.';
    }
    if (!$ruta || (int) $ruta['linea_id'] !== $lineaId || !(int) $ruta['activa']) {
        $errores[] = 'Selecciona una ruta activa de tu línea.';
    }
    if (!$vehiculo || (int) $vehiculo['linea_id'] !== $lineaId || !(int) $vehiculo['activo']) {
        $errores[] = 'Selecciona un vehículo activo de tu línea.';
    } elseif (Viaje::vehiculoOcupado($vehiculoId)) {
        $errores[] = 'Ese vehículo ya está en un viaje en curso. Elige otro.';
    }

    if (!$errores) {
        Viaje::iniciar($choferId, $vehiculoId, $rutaId);
        flash('success', 'Viaje iniciado. ¡Buen recorrido!');
        redirigir('chofer/viaje.php');
    }
}

$titulo = 'Iniciar viaje';
$menuActivo = 'iniciar';
require APP_ROOT . '/views/layout/encabezado.php';
require APP_ROOT . '/views/layout/panel_inicio.php';
?>
<h1 class="h3 mb-1">Iniciar viaje</h1>
<p class="text-secondary">Selecciona la ruta y el vehículo con los que vas a circular.</p>

<?php require APP_ROOT . '/views/partes/errores.php'; ?>

<div class="mr-tarjeta mr-tarjeta-cuerpo" style="max-width: 640px">
    <?php if (!$rutas || !$vehiculos): ?>
        <div class="mr-vacio">
            <i class="bi bi-exclamation-circle"></i>
            <?= !$rutas ? 'Tu línea no tiene rutas activas.' : 'No hay vehículos disponibles en este momento: todos están en circulación o inactivos.' ?>
            Comunícate con el dueño de tu línea.
        </div>
    <?php else: ?>
        <form method="post" novalidate>
            <?= campo_csrf() ?>
            <div class="mb-3">
                <label class="form-label" for="ruta_id">Ruta</label>
                <select class="form-select" id="ruta_id" name="ruta_id" required>
                    <option value="">Selecciona una ruta</option>
                    <?php foreach ($rutas as $r): ?>
                        <option value="<?= (int) $r['id'] ?>"<?= (int) ($_POST['ruta_id'] ?? 0) === (int) $r['id'] ? ' selected' : '' ?>>
                            Ruta <?= e($r['codigo']) ?> · <?= e($r['nombre']) ?> (<?= e(texto_sentido($r['sentido'])) ?>: <?= e($r['origen']) ?> → <?= e($r['destino']) ?>)
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="mb-4">
                <label class="form-label" for="vehiculo_id">Vehículo</label>
                <select class="form-select" id="vehiculo_id" name="vehiculo_id" required>
                    <option value="">Selecciona un vehículo</option>
                    <?php foreach ($vehiculos as $v): ?>
                        <option value="<?= (int) $v['id'] ?>"<?= (int) ($_POST['vehiculo_id'] ?? 0) === (int) $v['id'] ? ' selected' : '' ?>>
                            Unidad <?= e($v['numero_unidad']) ?> · <?= e($v['placa']) ?><?= (int) $v['cuenta_con_gps'] ? '' : ' (sin GPS)' ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <button class="btn btn-primary" type="submit"><i class="bi bi-play-circle"></i> Iniciar viaje</button>
            <a class="btn btn-outline-primary" href="<?= url('chofer/') ?>">Cancelar</a>
        </form>
    <?php endif; ?>
</div>
<?php
require APP_ROOT . '/views/layout/panel_fin.php';
require APP_ROOT . '/views/layout/pie.php';
