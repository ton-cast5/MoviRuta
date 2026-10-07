<?php

/** Accidentes reportados por los usuarios: el dueño ve los de sus líneas, el administrador todos. */
final class GestionReportes extends ControladorGestion
{
    public static function ejecutar(?array $lineas, string $panel): never
    {
        if (es_post()) {
            verificar_csrf();
            $reporte = self::exigirEnAlcance(ReporteAccidente::buscarPorId((int) entero_entrada($_POST, 'id')), $lineas);
            ReporteAccidente::marcarRevisado((int) $reporte['id'], (int) usuario_actual()['id']);
            flash('success', 'El reporte se marcó como revisado.');
            redirigir($panel . '/reportes.php');
        }

        self::render('reportes', [
            'titulo'     => 'Reportes de accidentes',
            'menuActivo' => 'reportes',
            'panel'      => $panel,
            'reportes'   => ReporteAccidente::listar($lineas),
        ]);
    }
}
