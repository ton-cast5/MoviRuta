<?php /** Indicador de actualización periódica de vehículos/ETA. Variable opcional: $idIndicador. */ ?>
<div class="mr-actualizacion" id="<?= e($idIndicador ?? 'indicador') ?>">
    <span class="mr-punto-vivo" aria-hidden="true"></span>
    <span data-texto aria-live="polite">Cargando información…</span>
    <span class="mr-etiqueta mr-etiqueta-demo d-none" data-demo title="Las posiciones de los vehículos son simuladas con fines de demostración.">
        <i class="bi bi-info-circle"></i> Ubicaciones de demostración
    </span>
</div>
