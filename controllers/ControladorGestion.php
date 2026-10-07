<?php

/**
 * Base de los módulos de gestión compartidos entre el dueño de línea y el administrador.
 * $lineas = null  → administrador (todas las líneas)
 * $lineas = [ids] → dueño (solo sus líneas). Toda lectura y escritura se valida contra este alcance.
 */
abstract class ControladorGestion
{
    protected static function lineaPermitida($lineaId, ?array $lineas): bool
    {
        $lineaId = (int) $lineaId;
        return $lineaId > 0 && ($lineas === null || in_array($lineaId, $lineas, true));
    }

    /** Obtiene el registro a editar o termina con 404 si no existe o está fuera del alcance. */
    protected static function exigirEnAlcance(?array $registro, ?array $lineas): array
    {
        if (!$registro || !self::lineaPermitida($registro['linea_id'], $lineas)) {
            mostrar_error(404, 'El registro no existe o no pertenece a tu línea.');
        }
        return $registro;
    }

    protected static function render(string $vista, array $variables): never
    {
        extract($variables);
        $seccion = 'panel';
        require APP_ROOT . '/views/layout/encabezado.php';
        require APP_ROOT . '/views/layout/panel_inicio.php';
        require APP_ROOT . '/views/gestion/' . $vista . '.php';
        require APP_ROOT . '/views/layout/panel_fin.php';
        require APP_ROOT . '/views/layout/pie.php';
        exit;
    }

    protected static function telefonoValido(string $telefono): bool
    {
        return $telefono === '' || preg_match('/^[0-9 +()\-]{7,30}$/', $telefono) === 1;
    }
}
