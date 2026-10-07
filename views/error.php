<?php
/** Página de error amigable. Variables: $codigo, $titulo, $mensaje, $detalle. */
$tituloError = $titulo;
$titulo = $tituloError;
require APP_ROOT . '/views/layout/encabezado.php';
?>
<section class="container-xl py-5">
    <div class="mr-tarjeta text-center mx-auto p-5" style="max-width: 560px">
        <div class="mr-error-icono mb-3"><i class="bi bi-<?= $codigo === 403 ? 'shield-lock' : ($codigo === 404 ? 'signpost' : 'exclamation-circle') ?>"></i></div>
        <h1 class="h3"><?= e($tituloError) ?></h1>
        <p class="text-secondary"><?= e($mensaje) ?></p>
        <div class="d-flex justify-content-center gap-2 flex-wrap">
            <a class="btn btn-primary" href="<?= url() ?>"><i class="bi bi-house"></i> Ir al inicio</a>
            <button class="btn btn-outline-primary" type="button" onclick="history.back()"><i class="bi bi-arrow-left"></i> Regresar</button>
        </div>
        <?php if (!empty($detalle)): ?>
            <details class="text-start mt-4 small">
                <summary>Detalle técnico (solo visible en modo desarrollo)</summary>
                <pre class="mt-2 mb-0"><?= e($detalle) ?></pre>
            </details>
        <?php endif; ?>
    </div>
</section>
<?php require APP_ROOT . '/views/layout/pie.php'; ?>
