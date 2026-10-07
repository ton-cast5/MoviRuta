<?php /** Ubicación de los vehículos en circulación (dueño: sus líneas; administrador: todas). */ ?>
<h1 class="h3 mb-1">Ubicación de vehículos</h1>
<p class="text-secondary">Unidades en circulación<?= $esAdmin ? ' de todas las líneas' : ' de tu línea' ?>. La información se actualiza automáticamente.</p>
<div class="row g-3">
    <div class="col-xl-8">
        <div id="mapa" class="mr-mapa" role="region" aria-label="Mapa de la flota"></div>
        <div class="mt-2"><?php require APP_ROOT . '/views/partes/indicador.php'; ?></div>
    </div>
    <div class="col-xl-4">
        <div class="mr-tarjeta mr-tarjeta-cuerpo">
            <h2 class="mr-seccion-titulo"><i class="bi bi-bus-front"></i> En circulación <span class="badge text-bg-light" id="totalFlota">…</span></h2>
            <div id="listaFlota"><div class="mr-vacio"><span class="spinner-border spinner-border-sm text-success"></span> Consultando…</div></div>
        </div>
    </div>
</div>
