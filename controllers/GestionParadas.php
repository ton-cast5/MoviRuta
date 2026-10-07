<?php

/**
 * Las paradas son compartidas entre líneas. El dueño puede consultarlas y registrar nuevas
 * para sus rutas; modificar paradas existentes es exclusivo del administrador.
 */
final class GestionParadas extends ControladorGestion
{
    public static function ejecutar(bool $puedeEditarExistentes, string $panel): never
    {
        $accion = in_array($_GET['accion'] ?? '', ['nuevo', 'editar'], true) ? $_GET['accion'] : 'lista';
        if ($accion === 'editar' && !$puedeEditarExistentes) {
            mostrar_error(403, 'Solo el administrador general puede modificar paradas existentes.');
        }
        $errores = [];
        $parada = null;
        if ($accion === 'editar') {
            $parada = Parada::buscarPorId((int) entero_entrada($_GET, 'id'), false);
            if (!$parada) {
                mostrar_error(404, 'La parada no existe.');
            }
        }
        $datos = $parada ? [
            'nombre' => $parada['nombre'], 'referencia' => (string) $parada['referencia'],
            'latitud' => (float) $parada['latitud'], 'longitud' => (float) $parada['longitud'], 'activa' => (bool) $parada['activa'],
        ] : ['nombre' => '', 'referencia' => '', 'latitud' => null, 'longitud' => null, 'activa' => true];

        if ($accion !== 'lista' && es_post()) {
            verificar_csrf();
            $datos = [
                'nombre'     => texto_entrada($_POST, 'nombre', 120),
                'referencia' => texto_entrada($_POST, 'referencia', 255),
                'latitud'    => decimal_entrada($_POST, 'latitud'),
                'longitud'   => decimal_entrada($_POST, 'longitud'),
                'activa'     => $puedeEditarExistentes ? isset($_POST['activa']) : true,
            ];
            if (mb_strlen($datos['nombre']) < 3) $errores[] = 'Escribe el nombre de la parada.';
            if (!coordenadas_validas($datos['latitud'], $datos['longitud'])) $errores[] = 'Marca la ubicación de la parada en el mapa.';

            if (!$errores) {
                Parada::guardar($parada ? (int) $parada['id'] : null, $datos);
                flash('success', $parada ? 'La parada se actualizó.' : 'Parada registrada. Ya puedes agregarla a una ruta.');
                redirigir($panel . '/paradas.php');
            }
        }

        self::render('paradas', [
            'titulo'        => 'Paradas',
            'menuActivo'    => 'paradas',
            'panel'         => $panel,
            'accion'        => $accion,
            'parada'        => $parada,
            'datos'         => $datos,
            'errores'       => $errores,
            'puedeEditar'   => $puedeEditarExistentes,
            'paradas'       => $accion === 'lista' ? Parada::listarTodas() : [],
            'usaMapa'       => $accion !== 'lista',
            'scripts'       => $accion !== 'lista' ? ['editor-parada.js'] : [],
        ]);
    }
}
