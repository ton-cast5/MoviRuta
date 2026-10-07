<?php /** Tabla de viajes de un chofer. Variable: $viajes. */ ?>
<?php if (!$viajes): ?>
    <div class="mr-vacio"><i class="bi bi-calendar-x"></i>No hay viajes registrados en este periodo.</div>
<?php else: ?>
    <div class="table-responsive">
        <table class="table mr-tabla">
            <thead><tr><th>Fecha</th><th>Ruta</th><th>Unidad</th><th>Inicio</th><th>Fin</th><th>Duración</th><th>Estado</th></tr></thead>
            <tbody>
            <?php foreach ($viajes as $v): ?>
                <tr>
                    <td><?= e(formato_fecha($v['inicio'], false)) ?></td>
                    <td><span class="mr-codigo mr-codigo-sm me-1" style="background: <?= e($v['ruta_color']) ?>"><?= e($v['ruta_codigo']) ?></span><?= e($v['ruta_nombre']) ?> <span class="text-secondary small">(<?= e(texto_sentido($v['ruta_sentido'])) ?>)</span></td>
                    <td><?= e($v['numero_unidad']) ?></td>
                    <td><?= e(date('H:i', strtotime($v['inicio']))) ?></td>
                    <td><?= $v['fin'] ? e(date('H:i', strtotime($v['fin']))) : '—' ?></td>
                    <td><?= e(formato_duracion($v['inicio'], $v['fin'])) ?></td>
                    <td><?= match ($v['estado']) {
                        'en_curso'   => '<span class="mr-estado normal"><i class="bi bi-broadcast"></i> En curso</span>',
                        'cancelado'  => '<span class="mr-estado suspendido">Cancelado</span>',
                        default      => '<span class="mr-etiqueta">Finalizado</span>',
                    } ?></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
<?php endif; ?>
