<?php /** Vista de gestión de reportes de accidentes. */ ?>
<div class="mb-3">
    <h1 class="h3 mb-1">Reportes de accidentes</h1>
    <p class="text-secondary mb-0">Accidentes que los usuarios reportaron en tus rutas. Márcalos como revisados cuando los atiendas.</p>
</div>
<?php if (!$reportes): ?>
    <div class="mr-tarjeta mr-vacio"><i class="bi bi-shield-check"></i>No hay reportes de accidentes.</div>
<?php else: ?>
    <div class="d-flex flex-column gap-3">
        <?php foreach ($reportes as $r): ?>
            <div class="mr-tarjeta mr-tarjeta-cuerpo">
                <div class="d-flex gap-3 align-items-start flex-wrap">
                    <span class="mr-codigo" style="background: <?= e($r['ruta_color']) ?>"><?= e($r['ruta_codigo']) ?></span>
                    <div class="flex-grow-1 min-w-0">
                        <div class="d-flex align-items-center gap-2 flex-wrap">
                            <span class="fw-semibold"><?= e($r['ruta_nombre']) ?> · <?= e(texto_sentido($r['ruta_sentido'])) ?></span>
                            <?php if ($r['estado'] === 'nuevo'): ?>
                                <span class="mr-estado suspendido"><i class="bi bi-exclamation-octagon-fill"></i> Nuevo</span>
                            <?php else: ?>
                                <span class="mr-etiqueta">Revisado</span>
                            <?php endif; ?>
                        </div>
                        <div class="small text-secondary"><?= e($r['linea']) ?> · <?= e(formato_fecha($r['creado_en'])) ?></div>
                        <p class="mb-2 mt-2"><?= e($r['descripcion']) ?></p>
                        <div class="small text-secondary d-flex flex-wrap gap-3">
                            <span><i class="bi bi-person"></i> <?= e($r['reportado_por'] ?? 'Usuario sin cuenta') ?></span>
                            <?php if ($r['contacto']): ?><span><i class="bi bi-telephone"></i> <?= e($r['contacto']) ?></span><?php endif; ?>
                            <?php if ($r['latitud'] !== null): ?>
                                <a href="https://www.google.com/maps?q=<?= e($r['latitud']) ?>,<?= e($r['longitud']) ?>" target="_blank" rel="noopener"><i class="bi bi-geo-alt"></i> Ver lugar en el mapa</a>
                            <?php endif; ?>
                            <?php if ($r['estado'] === 'revisado'): ?>
                                <span><i class="bi bi-check2-circle"></i> Revisado por <?= e($r['revisor'] ?? '—') ?> el <?= e(formato_fecha($r['revisado_en'])) ?></span>
                            <?php endif; ?>
                        </div>
                    </div>
                    <?php if ($r['estado'] === 'nuevo'): ?>
                        <form method="post">
                            <?= campo_csrf() ?>
                            <input type="hidden" name="id" value="<?= (int) $r['id'] ?>">
                            <button class="btn btn-sm btn-outline-primary" type="submit"><i class="bi bi-check2"></i> Marcar como revisado</button>
                        </form>
                    <?php endif; ?>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>
