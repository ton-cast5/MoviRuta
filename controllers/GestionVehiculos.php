<?php

final class GestionVehiculos extends ControladorGestion
{
    public static function ejecutar(?array $lineas, string $panel): never
    {
        $accion = in_array($_GET['accion'] ?? '', ['nuevo', 'editar'], true) ? $_GET['accion'] : 'lista';
        $lineasDisponibles = Linea::listar($lineas);
        $errores = [];
        $vehiculo = null;

        if ($accion === 'editar') {
            $vehiculo = self::exigirEnAlcance(Vehiculo::buscarPorId((int) entero_entrada($_GET, 'id')), $lineas);
        }
        $datos = $vehiculo ? [
            'linea_id' => (int) $vehiculo['linea_id'], 'numero_unidad' => $vehiculo['numero_unidad'], 'placa' => $vehiculo['placa'],
            'modelo' => (string) $vehiculo['modelo'], 'capacidad' => $vehiculo['capacidad'],
            'cuenta_con_gps' => (bool) $vehiculo['cuenta_con_gps'], 'activo' => (bool) $vehiculo['activo'],
            'climatizado' => (bool) $vehiculo['climatizado'], 'tv_a_bordo' => (bool) $vehiculo['tv_a_bordo'], 'accesible' => (bool) $vehiculo['accesible'],
        ] : ['linea_id' => count($lineasDisponibles) === 1 ? (int) $lineasDisponibles[0]['id'] : 0, 'numero_unidad' => '', 'placa' => '',
             'modelo' => '', 'capacidad' => null, 'cuenta_con_gps' => true, 'activo' => true,
             'climatizado' => false, 'tv_a_bordo' => false, 'accesible' => false];

        if ($accion !== 'lista' && es_post()) {
            verificar_csrf();
            $datos = [
                'linea_id'       => (int) entero_entrada($_POST, 'linea_id'),
                'numero_unidad'  => mb_strtoupper(texto_entrada($_POST, 'numero_unidad', 20)),
                'placa'          => mb_strtoupper(texto_entrada($_POST, 'placa', 15)),
                'modelo'         => texto_entrada($_POST, 'modelo', 80),
                'capacidad'      => entero_entrada($_POST, 'capacidad'),
                'cuenta_con_gps' => isset($_POST['cuenta_con_gps']),
                'climatizado'    => isset($_POST['climatizado']),
                'tv_a_bordo'     => isset($_POST['tv_a_bordo']),
                'accesible'      => isset($_POST['accesible']),
                'activo'         => isset($_POST['activo']),
            ];
            $id = $vehiculo ? (int) $vehiculo['id'] : null;

            if (!self::lineaPermitida($datos['linea_id'], $lineas) || !Linea::buscarPorId($datos['linea_id'])) $errores[] = 'Selecciona una línea válida.';
            if ($datos['numero_unidad'] === '') $errores[] = 'Escribe el número de unidad.';
            elseif ($datos['linea_id'] && Vehiculo::unidadEnUso($datos['linea_id'], $datos['numero_unidad'], $id)) $errores[] = 'Ese número de unidad ya existe en la línea.';
            if (!preg_match('/^[A-Z0-9\-]{4,15}$/', $datos['placa'])) $errores[] = 'La placa debe tener de 4 a 15 letras, números o guiones.';
            elseif (Vehiculo::placaEnUso($datos['placa'], $id)) $errores[] = 'Esa placa ya está registrada.';
            if ($datos['capacidad'] !== null && ($datos['capacidad'] < 1 || $datos['capacidad'] > 300)) $errores[] = 'La capacidad debe estar entre 1 y 300 pasajeros.';
            if ($vehiculo && Viaje::vehiculoOcupado($id) && (!$datos['activo'] || $datos['linea_id'] !== (int) $vehiculo['linea_id'])) {
                $errores[] = 'El vehículo está en un viaje en curso; no puede desactivarse ni cambiar de línea hasta que termine.';
            }

            if (!$errores) {
                Vehiculo::guardar($id, $datos);
                flash('success', $vehiculo ? 'Los datos del vehículo se actualizaron.' : 'Vehículo registrado.');
                redirigir($panel . '/vehiculos.php');
            }
        }

        self::render('vehiculos', [
            'titulo'            => 'Vehículos',
            'menuActivo'        => 'vehiculos',
            'panel'             => $panel,
            'accion'            => $accion,
            'vehiculo'          => $vehiculo,
            'datos'             => $datos,
            'errores'           => $errores,
            'lineasDisponibles' => $lineasDisponibles,
            'vehiculos'         => $accion === 'lista' ? Vehiculo::listar($lineas) : [],
        ]);
    }
}
