<?php
/**
 * Pie de página común.
 * Variables opcionales: $scripts (archivos dentro de assets/js), $usaMapa, $sinPie.
 */
$scripts = $scripts ?? [];
?>
</main>

<?php if (empty($sinPie)): ?>
<footer class="mr-footer">
    <div class="container-xl">
        <div class="row g-4">
            <div class="col-md-6 col-lg-4">
                <a class="mr-marca mb-2 d-inline-flex" href="<?= url() ?>">
                    <img src="<?= asset('img/logo.svg') ?>" alt="" width="32" height="32">
                    <span>Movi<strong>Ruta</strong></span>
                </a>
                <p class="small mb-0">Sistema de consulta y seguimiento del transporte público. Consulta rutas, paradas, vehículos y tiempos aproximados de llegada.</p>
            </div>
            <div class="col-6 col-md-3 col-lg-3">
                <h2 class="mr-footer-titulo">Servicios y consulta</h2>
                <ul class="list-unstyled small">
                    <li><a href="<?= url() ?>">Planificador de trayectos</a></li>
                    <li><a href="<?= url('rutas.php') ?>">Consulta de rutas</a></li>
                    <li><a href="<?= url('paradas.php') ?>">Consulta de paradas</a></li>
                    <li><a href="<?= url('mapa.php') ?>">Mapa de vehículos</a></li>
                    <li><a href="<?= url('paradas.php?cerca=1') ?>">Paradas cercanas</a></li>
                </ul>
            </div>
            <div class="col-6 col-md-3 col-lg-2">
                <h2 class="mr-footer-titulo">Atención y soporte</h2>
                <ul class="list-unstyled small">
                    <li><a href="<?= url('#como-funciona') ?>">Cómo usar MoviRuta</a></li>
                    <li><a href="<?= url('#estado-servicio') ?>">Estado del servicio</a></li>
                    <?php if (SOPORTE_EMAIL !== ''): ?>
                        <li><a href="mailto:<?= e(SOPORTE_EMAIL) ?>"><?= e(SOPORTE_EMAIL) ?></a></li>
                    <?php endif; ?>
                </ul>
            </div>
            <div class="col-md-6 col-lg-3">
                <h2 class="mr-footer-titulo">Aplicación</h2>
                <ul class="list-unstyled small">
                    <?php if (usuario_actual()): ?>
                        <li><a href="<?= url(panel_de_rol(usuario_actual()['rol'])) ?>">Mi panel</a></li>
                    <?php else: ?>
                        <li><a href="<?= url('login.php') ?>">Iniciar sesión</a></li>
                    <?php endif; ?>
                    <li><a href="<?= url('mapa.php') ?>">Usar mi ubicación</a></li>
                </ul>
            </div>
        </div>
    </div>
    <div class="mr-footer-barra">
        <div class="container-xl d-flex flex-wrap justify-content-between gap-2">
            <span>&copy; <?= date('Y') ?> MoviRuta</span>
            <span><?= MAPA_MOSAICOS === 'google' ? 'Datos del mapa &copy; Google' : 'Mapas &copy; colaboradores de OpenStreetMap' ?> · Mapas con <a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a></span>
        </div>
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
