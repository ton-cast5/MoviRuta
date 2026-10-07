<?php /** Lista de consultas del pasajero. Variable: $recientes. */ ?>
<?php if (!$recientes): ?>
    <div class="mr-vacio"><i class="bi bi-clock"></i>Aún no has consultado rutas ni paradas. Las que consultes aparecerán aquí.</div>
<?php else: ?>
    <div class="list-group list-group-flush">
        <?php foreach ($recientes as $h): ?>
            <?php if ($h['ruta_id']): ?>
                <a class="list-group-item list-group-item-action d-flex align-items-center gap-3 px-0" href="<?= url('ruta.php?id=' . (int) $h['ruta_id']) ?>">
                    <span class="mr-codigo mr-codigo-sm" style="background: <?= e($h['ruta_color']) ?>"><?= e($h['ruta_codigo']) ?></span>
                    <span class="flex-grow-1"><span class="fw-semibold">Ruta <?= e($h['ruta_nombre']) ?></span> <span class="small text-secondary">(<?= e(texto_sentido($h['ruta_sentido'])) ?>)</span></span>
                    <span class="small text-secondary text-nowrap"><?= e(formato_fecha($h['consultado_en'])) ?></span>
                </a>
            <?php elseif ($h['parada_id']): ?>
                <a class="list-group-item list-group-item-action d-flex align-items-center gap-3 px-0" href="<?= url('parada.php?id=' . (int) $h['parada_id']) ?>">
                    <i class="bi bi-geo-alt-fill text-primary fs-5"></i>
                    <span class="flex-grow-1"><span class="fw-semibold">Parada <?= e($h['parada_nombre']) ?></span>
                        <?php if ($h['parada_referencia']): ?><span class="small text-secondary d-block"><?= e($h['parada_referencia']) ?></span><?php endif; ?></span>
                    <span class="small text-secondary text-nowrap"><?= e(formato_fecha($h['consultado_en'])) ?></span>
                </a>
            <?php endif; ?>
        <?php endforeach; ?>
    </div>
<?php endif; ?>
