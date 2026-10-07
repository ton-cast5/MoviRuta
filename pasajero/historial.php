<?php
require dirname(__DIR__) . '/includes/bootstrap.php';
$usuario = requiere_rol(ROL_PASAJERO);

if (es_post()) {
    verificar_csrf();
    Historial::borrar($usuario['id']);
    flash('success', 'Tu historial de consultas se borró.');
    redirigir('pasajero/historial.php');
}

$recientes = Historial::listar($usuario['id'], 100);

$titulo = 'Historial';
$seccion = 'panel';
$menuActivo = 'historial';
require APP_ROOT . '/views/layout/encabezado.php';
require APP_ROOT . '/views/layout/panel_inicio.php';
?>
<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
    <div>
        <h1 class="h3 mb-1">Historial de consultas</h1>
        <p class="text-secondary mb-0">Rutas y paradas que consultaste recientemente.</p>
    </div>
    <?php if ($recientes): ?>
        <form method="post" onsubmit="return confirm('¿Borrar todo tu historial de consultas?')">
            <?= campo_csrf() ?>
            <button class="btn btn-outline-primary btn-sm" type="submit"><i class="bi bi-trash"></i> Borrar historial</button>
        </form>
    <?php endif; ?>
</div>
<div class="mr-tarjeta mr-tarjeta-cuerpo">
    <?php require APP_ROOT . '/views/partes/lista_historial.php'; ?>
</div>
<?php
require APP_ROOT . '/views/layout/panel_fin.php';
require APP_ROOT . '/views/layout/pie.php';
