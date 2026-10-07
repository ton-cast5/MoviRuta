<?php
/**
 * Pie de página común.
 * Variables opcionales: $scripts (archivos dentro de assets/js), $usaMapa, $sinPie.
 */
$scripts = $scripts ?? [];
?>
</main>

<?php if (empty($sinPie)): $telefonosLineas = Linea::telefonos(); ?>
<footer class="mr-footer">
    <div class="mr-footer-columnas">
        <div class="mr-footer-columna">
            <a class="mr-marca mr-footer-marca" href="<?= url() ?>">
                <img src="<?= asset('img/logo.svg') ?>" alt="" width="32" height="32">
                <span>MoviRuta</span>
            </a>
            <p>Sistema Integral de Información y Planificación del Transporte Público MoviRuta. Conectando personas y ciudades con certeza en tiempo real.</p>
        </div>
        <div class="mr-footer-columna">
            <h2 class="mr-footer-titulo">Servicios y Consulta</h2>
            <a href="<?= url() ?>">Planificador de Trayectos</a>
            <a href="<?= url('rutas.php') ?>">Rutas y Líneas de Transporte</a>
            <a href="<?= url('mapa.php') ?>">Geolocalización en Tiempo Real</a>
            <a href="<?= url('paradas.php?cerca=1') ?>">Paradas Cercanas</a>
            <a href="<?= url('#estado-servicio') ?>">Incidencias Programadas</a>
        </div>
        <div class="mr-footer-columna">
            <h2 class="mr-footer-titulo">Atención y Soporte</h2>
            <?php foreach ($telefonosLineas as $l): ?>
                <p><?= e($l['nombre']) ?>: <a class="mr-footer-dato" href="tel:<?= e(preg_replace('/[^0-9+]/', '', $l['telefono'])) ?>"><?= e($l['telefono']) ?></a></p>
            <?php endforeach; ?>
            <?php if (SOPORTE_EMAIL !== ''): ?>
                <p>Soporte de MoviRuta: <a class="mr-footer-dato" href="mailto:<?= e(SOPORTE_EMAIL) ?>"><?= e(SOPORTE_EMAIL) ?></a></p>
            <?php endif; ?>
            <a href="<?= url('?reportar=1') ?>">Reportar un Accidente</a>
            <a href="<?= url('#estado-servicio') ?>">Estado del Servicio</a>
        </div>
        <div class="mr-footer-columna">
            <h2 class="mr-footer-titulo">Usa MoviRuta en tu Teléfono</h2>
            <p>Consulta rutas, paradas y la ubicación de las unidades desde el navegador de tu teléfono, sin instalar nada.</p>
            <div class="mr-footer-app">
                <i class="bi bi-phone-fill" aria-hidden="true"></i>
                <div>
                    <div class="mr-footer-app-etiqueta">Disponible en</div>
                    <div class="mr-footer-app-valor">Cualquier navegador web</div>
                </div>
            </div>
        </div>
    </div>
    <div class="mr-footer-barra">
        <p>&copy; <?= date('Y') ?> MoviRuta. Todos los derechos reservados.</p>
        <span><?= MAPA_MOSAICOS === 'google' ? 'Datos del mapa &copy; Google' : 'Mapas &copy; colaboradores de OpenStreetMap' ?> · Mapas con <a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a></span>
    </div>
</footer>
<?php endif; ?>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
<?php if (!empty($usaMapa)): ?>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<?php endif; ?>
<script src="<?= asset('js/moviruta.js') ?>"></script>
<?php foreach ($scripts as $script): ?>
<script src="<?= asset('js/' . $script) ?>"></script>
<?php endforeach; ?>
</body>
</html>
