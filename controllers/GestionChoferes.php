<?php

final class GestionChoferes extends ControladorGestion
{
    public static function ejecutar(?array $lineas, string $panel): never
    {
        $accion = in_array($_GET['accion'] ?? '', ['nuevo', 'editar'], true) ? $_GET['accion'] : 'lista';
        $lineasDisponibles = Linea::listar($lineas);
        $errores = [];
        $chofer = null;

        if ($accion === 'editar') {
            $chofer = self::exigirEnAlcance(Chofer::buscarPorId((int) entero_entrada($_GET, 'id')), $lineas);
        }
        $datos = $chofer ? [
            'nombre' => $chofer['nombre'], 'email' => $chofer['email'], 'linea_id' => (int) $chofer['linea_id'],
            'numero_licencia' => $chofer['numero_licencia'], 'telefono' => (string) $chofer['telefono'], 'activo' => (bool) $chofer['activo'],
        ] : ['nombre' => '', 'email' => '', 'linea_id' => count($lineasDisponibles) === 1 ? (int) $lineasDisponibles[0]['id'] : 0,
             'numero_licencia' => '', 'telefono' => '', 'activo' => true];

        if ($accion !== 'lista' && es_post()) {
            verificar_csrf();
            $datos = [
                'nombre'          => texto_entrada($_POST, 'nombre', 100),
                'email'           => mb_strtolower(texto_entrada($_POST, 'email', 150)),
                'password'        => is_string($_POST['password'] ?? null) ? $_POST['password'] : '',
                'linea_id'        => (int) entero_entrada($_POST, 'linea_id'),
                'numero_licencia' => mb_strtoupper(texto_entrada($_POST, 'numero_licencia', 30)),
                'telefono'        => texto_entrada($_POST, 'telefono', 30),
                'activo'          => isset($_POST['activo']),
            ];
            $usuarioId = $chofer ? (int) $chofer['usuario_id'] : null;

            if (mb_strlen($datos['nombre']) < 3) $errores[] = 'Escribe el nombre completo del chofer.';
            if (!filter_var($datos['email'], FILTER_VALIDATE_EMAIL)) $errores[] = 'Escribe un correo electrónico válido.';
            elseif (Usuario::emailEnUso($datos['email'], $usuarioId)) $errores[] = 'Ese correo ya está registrado.';
            if (!$chofer && mb_strlen($datos['password']) < 8) $errores[] = 'La contraseña debe tener al menos 8 caracteres.';
            if ($chofer && $datos['password'] !== '' && mb_strlen($datos['password']) < 8) $errores[] = 'La nueva contraseña debe tener al menos 8 caracteres.';
            if (!self::lineaPermitida($datos['linea_id'], $lineas) || !Linea::buscarPorId($datos['linea_id'])) $errores[] = 'Selecciona una línea válida.';
            if ($datos['numero_licencia'] === '') $errores[] = 'Escribe el número de licencia.';
            elseif (Chofer::licenciaEnUso($datos['numero_licencia'], $chofer ? (int) $chofer['id'] : null)) $errores[] = 'Ese número de licencia ya está registrado.';
            if (!self::telefonoValido($datos['telefono'])) $errores[] = 'El teléfono solo puede contener números, espacios y los signos + - ( ).';

            if (!$errores) {
                if ($chofer) {
                    Chofer::actualizar((int) $chofer['id'], $datos);
                    flash('success', 'Los datos del chofer se actualizaron.');
                } else {
                    Chofer::crear($datos);
                    flash('success', 'Chofer registrado. Ya puede iniciar sesión con su correo.');
                }
                redirigir($panel . '/choferes.php');
            }
        }

        self::render('choferes', [
            'titulo'            => 'Choferes',
            'menuActivo'        => 'choferes',
            'panel'             => $panel,
            'accion'            => $accion,
            'chofer'            => $chofer,
            'datos'             => $datos,
            'errores'           => $errores,
            'lineasDisponibles' => $lineasDisponibles,
            'choferes'          => $accion === 'lista' ? Chofer::listar($lineas) : [],
        ]);
    }
}
