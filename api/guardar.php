<?php
/**
 * POST {cambios: {tabla: {nuevos: [...], editados: [...], borrados: [ids]}}}
 * Las tablas usan los nombres de assets/js/servicios.js. Cada fila se valida contra el perfil del usuario con sesión
 * (los permisos se revisan con los datos de MySQL, no con lo que manda el navegador) y todo se guarda en una transacción.
 * Responde con los datos actualizados.
 */
require __DIR__ . '/_base.php';

const SIN_PERMISO = 'No tienes permiso para hacer este cambio.';

final class Guardado
{
    private const ORDEN = ['usuarios', 'lineas', 'paradas', 'choferes', 'vehiculos', 'rutas', 'viajes', 'reportes', 'fallas', 'historial'];

    /** @var array<string, array<int, int>> id que mandó el navegador => id real, para filas nuevas */
    private array $ids = [];
    private array $misLineas;

    public function __construct(private readonly ?array $u)
    {
        $this->misLineas = $u && $u['rol'] === 'dueno' ? lineasDeDueno($u['id']) : [];
    }

    public function aplicar(array $cambios): void
    {
        foreach (array_keys($cambios) as $tabla) {
            if (!in_array($tabla, self::ORDEN, true)) {
                throw new ErrorApi('Cambio no reconocido.');
            }
        }
        foreach (self::ORDEN as $tabla) {
            $c = $cambios[$tabla] ?? null;
            if (!is_array($c)) {
                continue;
            }
            foreach ($this->lista($c, 'nuevos') as $f) {
                $this->ids[$tabla][(int) ($f['id'] ?? 0)] = $this->{'nuevo' . ucfirst($tabla)}($f);
            }
            foreach ($this->lista($c, 'editados') as $f) {
                $this->{'editar' . ucfirst($tabla)}($this->existente($tabla, $f['id'] ?? null), $f);
            }
            foreach ($this->lista($c, 'borrados') as $id) {
                $this->borrar($tabla, (int) $id);
            }
        }
    }

    /* ---------------- Utilidades ---------------- */

    private function lista(array $c, string $clave): array
    {
        $l = $c[$clave] ?? [];
        if (!is_array($l)) {
            throw new ErrorApi('Solicitud no válida.');
        }
        return $l;
    }

    private function existente(string $tabla, mixed $id): int
    {
        if (!is_numeric($id)) {
            throw new ErrorApi('Solicitud no válida.');
        }
        return (int) $id;
    }

    private function ref(string $tabla, mixed $id): ?int
    {
        if ($id === null || $id === '' || !is_numeric($id)) {
            return null;
        }
        return $this->ids[$tabla][(int) $id] ?? (int) $id;
    }

    private function rol(): ?string { return $this->u['rol'] ?? null; }
    private function esAdmin(): bool { return $this->rol() === 'admin'; }

    private function permitir(bool $condicion): void
    {
        if (!$this->u) {
            throw new ErrorApi('Tu sesión terminó. Vuelve a iniciar sesión.', 401);
        }
        if (!$condicion) {
            throw new ErrorApi(SIN_PERMISO, 403);
        }
    }

    /** El administrador gestiona todas las líneas; el dueño solo las suyas. */
    private function lineaPermitida(?int $lineaId): bool
    {
        if (!$lineaId) {
            return false;
        }
        if ($this->esAdmin()) {
            return fila('SELECT id FROM linea_transporte WHERE id = ?', [$lineaId]) !== null;
        }
        return $this->rol() === 'dueno' && in_array($lineaId, $this->misLineas, true);
    }

    private static function texto(mixed $v, int $max): string
    {
        return mb_substr(trim(preg_replace('/\s+/u', ' ', (string) ($v ?? ''))), 0, $max);
    }

    private static function textoONulo(mixed $v, int $max): ?string
    {
        $t = self::texto($v, $max);
        return $t === '' ? null : $t;
    }

    private static function requerido(mixed $v, int $max, string $mensaje): string
    {
        $t = self::texto($v, $max);
        if ($t === '') {
            throw new ErrorApi($mensaje);
        }
        return $t;
    }

    private static function bool(mixed $v): int { return $v ? 1 : 0; }

    private static function numero(mixed $v): ?float
    {
        return $v === null || $v === '' || !is_numeric($v) ? null : (float) $v;
    }

    private static function coordenada(mixed $v, float $limite): ?float
    {
        $n = self::numero($v);
        return $n === null || abs($n) > $limite ? null : round($n, 6);
    }

    private static function insertar(string $sql, array $parametros): int
    {
        ejecutar($sql, $parametros);
        return (int) db()->lastInsertId();
    }

    /* ---------------- Usuarios ---------------- */

    private function datosUsuario(array $f): array
    {
        $email = mb_strtolower(self::texto($f['email'] ?? '', 150));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ErrorApi('Escribe un correo electrónico válido.');
        }
        return [self::requerido($f['nombre'] ?? '', 100, 'Escribe el nombre completo.'), $email, (string) ($f['rol'] ?? ''), self::bool($f['activo'] ?? false)];
    }

    private static function hashPassword(mixed $password, bool $obligatoria): ?string
    {
        $p = (string) ($password ?? '');
        if ($p === '' && !$obligatoria) {
            return null;
        }
        if (strlen($p) < 8) {
            throw new ErrorApi('La contraseña debe tener al menos 8 caracteres.');
        }
        return password_hash($p, PASSWORD_BCRYPT);
    }

    private function nuevoUsuarios(array $f): int
    {
        [$nombre, $email, $rol, $activo] = $this->datosUsuario($f);
        $this->permitir($this->esAdmin() ? in_array($rol, ['pasajero', 'chofer', 'dueno', 'admin'], true) : ($this->rol() === 'dueno' && $rol === 'chofer'));
        return self::insertar(
            'INSERT INTO usuario (rol, nombre, email, password_hash, activo) VALUES (?, ?, ?, ?, ?)',
            [$rol, $nombre, $email, self::hashPassword($f['password'] ?? '', true), $activo]
        );
    }

    private function editarUsuarios(int $id, array $f): void
    {
        $actual = fila('SELECT id, rol FROM usuario WHERE id = ? FOR UPDATE', [$id]) ?? throw new ErrorApi('Ese usuario ya no existe.', 404);
        [$nombre, $email, $rol, $activo] = $this->datosUsuario($f);
        if ($this->esAdmin()) {
            $this->permitir(in_array($rol, ['pasajero', 'chofer', 'dueno', 'admin'], true));
            if ($id === $this->u['id'] && ($rol !== 'admin' || !$activo)) {
                throw new ErrorApi('No puedes quitarte el perfil de administrador ni desactivar tu propia cuenta.');
            }
        } else {
            $chofer = fila('SELECT linea_id FROM chofer WHERE usuario_id = ?', [$id]);
            $this->permitir($this->rol() === 'dueno' && $actual['rol'] === 'chofer' && $rol === 'chofer'
                && $chofer && in_array((int) $chofer['linea_id'], $this->misLineas, true));
        }
        ejecutar('UPDATE usuario SET nombre = ?, email = ?, rol = ?, activo = ? WHERE id = ?', [$nombre, $email, $rol, $activo, $id]);
        $hash = self::hashPassword($f['password'] ?? '', false);
        if ($hash) {
            ejecutar('UPDATE usuario SET password_hash = ? WHERE id = ?', [$hash, $id]);
        }
    }

    /* ---------------- Líneas ---------------- */

    private function datosLinea(array $f): array
    {
        $duenoId = $this->ref('usuarios', $f['dueno_id'] ?? null);
        if ($duenoId !== null && !fila("SELECT id FROM usuario WHERE id = ? AND rol = 'dueno' AND activo = 1", [$duenoId])) {
            throw new ErrorApi('Selecciona un dueño de línea válido.');
        }
        return [
            self::requerido($f['nombre'] ?? '', 120, 'Escribe el nombre de la línea.'), self::textoONulo($f['descripcion'] ?? null, 255),
            self::textoONulo($f['telefono'] ?? null, 30), $duenoId, self::bool($f['activa'] ?? false),
        ];
    }

    private function nuevoLineas(array $f): int
    {
        $this->permitir($this->esAdmin());
        return self::insertar('INSERT INTO linea_transporte (nombre, descripcion, telefono, dueno_id, activa) VALUES (?, ?, ?, ?, ?)', $this->datosLinea($f));
    }

    private function editarLineas(int $id, array $f): void
    {
        $this->permitir($this->esAdmin());
        ejecutar('UPDATE linea_transporte SET nombre = ?, descripcion = ?, telefono = ?, dueno_id = ?, activa = ? WHERE id = ?', [...$this->datosLinea($f), $id]);
    }

    /* ---------------- Paradas ---------------- */

    private function datosParada(array $f, bool $activa): array
    {
        $codigo = self::textoONulo(ltrim((string) ($f['codigo'] ?? ''), '#'), 10);
        $lat = self::coordenada($f['latitud'] ?? null, 90);
        $lng = self::coordenada($f['longitud'] ?? null, 180);
        if ($lat === null || $lng === null) {
            throw new ErrorApi('Marca la ubicación de la parada en el mapa.');
        }
        return [
            $codigo === null ? null : mb_strtoupper($codigo), self::requerido($f['nombre'] ?? '', 120, 'Escribe el nombre de la parada.'),
            self::textoONulo($f['referencia'] ?? null, 255), $lat, $lng, self::bool($activa),
        ];
    }

    private function nuevoParadas(array $f): int
    {
        $this->permitir($this->esAdmin() || $this->rol() === 'dueno');
        $activa = $this->esAdmin() ? ($f['activa'] ?? true) : true;
        return self::insertar('INSERT INTO parada (codigo, nombre, referencia, latitud, longitud, activa) VALUES (?, ?, ?, ?, ?, ?)', $this->datosParada($f, (bool) $activa));
    }

    private function editarParadas(int $id, array $f): void
    {
        if (!$this->esAdmin() && $this->u) {
            throw new ErrorApi('Solo el administrador general puede modificar paradas existentes.', 403);
        }
        $this->permitir($this->esAdmin());
        ejecutar('UPDATE parada SET codigo = ?, nombre = ?, referencia = ?, latitud = ?, longitud = ?, activa = ? WHERE id = ?', [...$this->datosParada($f, (bool) ($f['activa'] ?? false)), $id]);
    }

    /* ---------------- Choferes ---------------- */

    private function datosChofer(array $f): array
    {
        $lineaId = $this->ref('lineas', $f['linea_id'] ?? null);
        $this->permitir($this->lineaPermitida($lineaId));
        return [$lineaId, mb_strtoupper(self::requerido($f['numero_licencia'] ?? '', 30, 'Escribe el número de licencia.')), self::textoONulo($f['telefono'] ?? null, 30), self::bool($f['activo'] ?? false)];
    }

    private function nuevoChoferes(array $f): int
    {
        $datos = $this->datosChofer($f);
        $usuarioId = $this->ref('usuarios', $f['usuario_id'] ?? null);
        if (!$usuarioId || !fila("SELECT id FROM usuario WHERE id = ? AND rol = 'chofer'", [$usuarioId])) {
            throw new ErrorApi('La cuenta del chofer no es válida.');
        }
        return self::insertar('INSERT INTO chofer (linea_id, numero_licencia, telefono, activo, usuario_id) VALUES (?, ?, ?, ?, ?)', [...$datos, $usuarioId]);
    }

    private function editarChoferes(int $id, array $f): void
    {
        $actual = fila('SELECT linea_id FROM chofer WHERE id = ? FOR UPDATE', [$id]) ?? throw new ErrorApi('Ese chofer ya no existe.', 404);
        $this->permitir($this->lineaPermitida((int) $actual['linea_id']));
        ejecutar('UPDATE chofer SET linea_id = ?, numero_licencia = ?, telefono = ?, activo = ? WHERE id = ?', [...$this->datosChofer($f), $id]);
    }

    /* ---------------- Vehículos ---------------- */

    private function datosVehiculo(array $f): array
    {
        $lineaId = $this->ref('lineas', $f['linea_id'] ?? null);
        $this->permitir($this->lineaPermitida($lineaId));
        $placa = mb_strtoupper(self::texto($f['placa'] ?? '', 15));
        if (!preg_match('/^[A-Z0-9-]{4,15}$/', $placa)) {
            throw new ErrorApi('La placa debe tener de 4 a 15 letras, números o guiones.');
        }
        $capacidad = self::numero($f['capacidad'] ?? null);
        if ($capacidad !== null && ($capacidad < 1 || $capacidad > 300)) {
            throw new ErrorApi('La capacidad debe estar entre 1 y 300 pasajeros.');
        }
        return [
            $lineaId, mb_strtoupper(self::requerido($f['numero_unidad'] ?? '', 20, 'Escribe el número de unidad.')), $placa,
            self::textoONulo($f['modelo'] ?? null, 80), $capacidad === null ? null : (int) $capacidad,
            self::bool($f['cuenta_con_gps'] ?? false), self::bool($f['climatizado'] ?? false), self::bool($f['tv_a_bordo'] ?? false),
            self::bool($f['accesible'] ?? false), self::bool($f['activo'] ?? false),
        ];
    }

    private function nuevoVehiculos(array $f): int
    {
        return self::insertar(
            'INSERT INTO vehiculo (linea_id, numero_unidad, placa, modelo, capacidad, cuenta_con_gps, climatizado, tv_a_bordo, accesible, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            $this->datosVehiculo($f)
        );
    }

    private function editarVehiculos(int $id, array $f): void
    {
        $actual = fila('SELECT linea_id FROM vehiculo WHERE id = ? FOR UPDATE', [$id]) ?? throw new ErrorApi('Ese vehículo ya no existe.', 404);
        $this->permitir($this->lineaPermitida((int) $actual['linea_id']));
        $datos = $this->datosVehiculo($f);
        $ocupado = fila("SELECT id FROM viaje WHERE vehiculo_id = ? AND estado = 'en_curso'", [$id]);
        if ($ocupado && (!$datos[9] || $datos[0] !== (int) $actual['linea_id'])) {
            throw new ErrorApi('El vehículo está en un viaje en curso; no puede desactivarse ni cambiar de línea hasta que termine.');
        }
        ejecutar(
            'UPDATE vehiculo SET linea_id = ?, numero_unidad = ?, placa = ?, modelo = ?, capacidad = ?, cuenta_con_gps = ?, climatizado = ?, tv_a_bordo = ?, accesible = ?, activo = ? WHERE id = ?',
            [...$datos, $id]
        );
    }

    /* ---------------- Rutas ---------------- */

    private function datosRuta(array $f): array
    {
        $lineaId = $this->ref('lineas', $f['linea_id'] ?? null);
        $this->permitir($this->lineaPermitida($lineaId));
        $codigo = mb_strtoupper(self::texto($f['codigo'] ?? '', 10));
        if (!preg_match('/^[A-Z0-9-]{1,10}$/', $codigo)) {
            throw new ErrorApi('El número de ruta solo puede tener letras, números o guiones (máximo 10).');
        }
        $color = (string) ($f['color'] ?? '');
        if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
            throw new ErrorApi('Selecciona un color válido.');
        }
        $tarifa = self::numero($f['tarifa'] ?? null);
        if ($tarifa !== null && ($tarifa < 0 || $tarifa > 9999)) {
            throw new ErrorApi('La tarifa no es válida.');
        }
        $velocidad = self::numero($f['velocidad_promedio_kmh'] ?? null);
        if ($velocidad === null || $velocidad < 5 || $velocidad > 80) {
            throw new ErrorApi('La velocidad promedio debe estar entre 5 y 80 km/h.');
        }
        return [
            $lineaId, $codigo, self::requerido($f['nombre'] ?? '', 120, 'Escribe el nombre de la ruta.'),
            self::requerido($f['origen'] ?? '', 120, 'Indica el origen y el destino.'), self::requerido($f['destino'] ?? '', 120, 'Indica el origen y el destino.'),
            (string) ($f['sentido'] ?? ''), $color, $tarifa, $velocidad, (string) ($f['estado_servicio'] ?? ''),
            self::textoONulo($f['aviso'] ?? null, 255), self::bool($f['activa'] ?? false),
        ];
    }

    private function guardarRecorrido(int $rutaId, array $f): void
    {
        $paradas = array_values(array_filter(array_map(fn ($p) => $this->ref('paradas', $p), (array) ($f['paradas'] ?? []))));
        if (count($paradas) < 2) {
            throw new ErrorApi('Agrega al menos dos paradas activas en el orden del recorrido.');
        }
        $puntos = [];
        foreach (array_slice((array) ($f['recorrido'] ?? []), 0, 2000) as $p) {
            $lat = is_array($p) ? self::coordenada($p[0] ?? null, 90) : null;
            $lng = is_array($p) ? self::coordenada($p[1] ?? null, 180) : null;
            if ($lat !== null && $lng !== null) {
                $puntos[] = [$lat, $lng];
            }
        }
        if (count($puntos) < 2) {
            throw new ErrorApi('Dibuja el trazado de la ruta en el mapa (al menos dos puntos).');
        }
        ejecutar('DELETE FROM ruta_parada WHERE ruta_id = ?', [$rutaId]);
        ejecutar('DELETE FROM recorrido_punto WHERE ruta_id = ?', [$rutaId]);
        $st = db()->prepare('INSERT INTO ruta_parada (ruta_id, orden, parada_id) VALUES (?, ?, ?)');
        foreach ($paradas as $i => $paradaId) {
            $st->execute([$rutaId, $i + 1, $paradaId]);
        }
        $st = db()->prepare('INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES (?, ?, ?, ?)');
        foreach ($puntos as $i => [$lat, $lng]) {
            $st->execute([$rutaId, $i + 1, $lat, $lng]);
        }
    }

    private function nuevoRutas(array $f): int
    {
        $id = self::insertar(
            'INSERT INTO ruta (linea_id, codigo, nombre, origen, destino, sentido, color, tarifa, velocidad_promedio_kmh, estado_servicio, aviso, activa) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            $this->datosRuta($f)
        );
        $this->guardarRecorrido($id, $f);
        return $id;
    }

    private function editarRutas(int $id, array $f): void
    {
        $actual = fila('SELECT linea_id FROM ruta WHERE id = ? FOR UPDATE', [$id]) ?? throw new ErrorApi('Esa ruta ya no existe.', 404);
        $this->permitir($this->lineaPermitida((int) $actual['linea_id']));
        ejecutar(
            'UPDATE ruta SET linea_id = ?, codigo = ?, nombre = ?, origen = ?, destino = ?, sentido = ?, color = ?, tarifa = ?, velocidad_promedio_kmh = ?, estado_servicio = ?, aviso = ?, activa = ? WHERE id = ?',
            [...$this->datosRuta($f), $id]
        );
        $this->guardarRecorrido($id, $f);
    }

    /* ---------------- Viajes (chofer) ---------------- */

    private function miChofer(): array
    {
        $this->permitir($this->rol() === 'chofer');
        return fila('SELECT id, linea_id, activo FROM chofer WHERE usuario_id = ? FOR UPDATE', [$this->u['id']]) ?? throw new ErrorApi(SIN_PERMISO, 403);
    }

    private function nuevoViajes(array $f): int
    {
        $chofer = $this->miChofer();
        $this->permitir((int) ($f['chofer_id'] ?? 0) === (int) $chofer['id']);
        if ((int) $chofer['activo'] !== 1) {
            throw new ErrorApi('Tu registro de chofer está inactivo. Comunícate con el dueño de tu línea.');
        }
        if (fila("SELECT id FROM viaje WHERE chofer_id = ? AND estado = 'en_curso' FOR UPDATE", [$chofer['id']])) {
            throw new ErrorApi('Ya tienes un viaje en curso. Finalízalo antes de iniciar otro.');
        }
        $rutaId = $this->ref('rutas', $f['ruta_id'] ?? null);
        $ruta = $rutaId ? fila('SELECT linea_id, activa FROM ruta WHERE id = ?', [$rutaId]) : null;
        if (!$ruta || (int) $ruta['linea_id'] !== (int) $chofer['linea_id'] || (int) $ruta['activa'] !== 1) {
            throw new ErrorApi('Selecciona una ruta activa de tu línea.');
        }
        $vehiculoId = $this->ref('vehiculos', $f['vehiculo_id'] ?? null);
        $vehiculo = $vehiculoId ? fila('SELECT linea_id, activo, capacidad FROM vehiculo WHERE id = ? FOR UPDATE', [$vehiculoId]) : null;
        if (!$vehiculo || (int) $vehiculo['linea_id'] !== (int) $chofer['linea_id'] || (int) $vehiculo['activo'] !== 1) {
            throw new ErrorApi('Selecciona un vehículo activo de tu línea.');
        }
        if (fila("SELECT id FROM viaje WHERE vehiculo_id = ? AND estado = 'en_curso'", [$vehiculoId])) {
            throw new ErrorApi('Ese vehículo ya está en un viaje en curso. Elige otro.');
        }
        if (fila("SELECT id FROM falla_vehiculo WHERE vehiculo_id = ? AND impide_circular = 1 AND estado <> 'resuelta'", [$vehiculoId])) {
            throw new ErrorApi('Esa unidad tiene una falla que le impide circular. Elige otra.');
        }
        $max = (int) ($vehiculo['capacidad'] ?: 300);
        $pasajeros = $f['pasajeros_salida'] ?? null;
        if (!is_int($pasajeros) || $pasajeros < 0 || $pasajeros > $max) {
            throw new ErrorApi("Escribe cuántos pasajeros llevas al salir (de 0 a {$max}).");
        }
        return self::insertar(
            "INSERT INTO viaje (chofer_id, vehiculo_id, ruta_id, inicio, pasajeros_salida, estado) VALUES (?, ?, ?, NOW(), ?, 'en_curso')",
            [$chofer['id'], $vehiculoId, $rutaId, $pasajeros]
        );
    }

    private function editarViajes(int $id, array $f): void
    {
        $chofer = $this->miChofer();
        $viaje = fila('SELECT chofer_id, estado FROM viaje WHERE id = ? FOR UPDATE', [$id]) ?? throw new ErrorApi('Ese viaje ya no existe.', 404);
        $this->permitir((int) $viaje['chofer_id'] === (int) $chofer['id']);
        if ($viaje['estado'] !== 'en_curso' || ($f['estado'] ?? '') !== 'finalizado') {
            throw new ErrorApi('Ese viaje ya no está en curso.');
        }
        ejecutar("UPDATE viaje SET estado = 'finalizado', fin = NOW() WHERE id = ?", [$id]);
    }

    /* ---------------- Reportes de accidentes ---------------- */

    private function nuevoReportes(array $f): int
    {
        $ahora = time();
        $recientes = array_values(array_filter($_SESSION['reportes'] ?? [], fn ($t) => $t > $ahora - 3600));
        if ($recientes && max($recientes) > $ahora - 60) {
            throw new ErrorApi('Ya enviaste un reporte hace un momento. Espera un minuto antes de enviar otro.', 429);
        }
        if (count($recientes) >= 5) {
            throw new ErrorApi('Alcanzaste el límite de reportes por hora. Si es una emergencia, llama al 911.', 429);
        }
        $rutaId = $this->ref('rutas', $f['ruta_id'] ?? null);
        $ruta = $rutaId ? fila('SELECT r.id FROM ruta r JOIN linea_transporte l ON l.id = r.linea_id WHERE r.id = ? AND r.activa = 1 AND l.activa = 1', [$rutaId]) : null;
        if (!$ruta) {
            throw new ErrorApi('Selecciona la ruta donde ocurrió el accidente.');
        }
        $descripcion = self::texto($f['descripcion'] ?? '', 500);
        if (mb_strlen($descripcion) < 10) {
            throw new ErrorApi('Describe brevemente qué pasó (al menos 10 caracteres).');
        }
        $lat = self::coordenada($f['latitud'] ?? null, 90);
        $lng = self::coordenada($f['longitud'] ?? null, 180);
        $conUbicacion = $lat !== null && $lng !== null;
        $id = self::insertar(
            "INSERT INTO reporte_accidente (ruta_id, usuario_id, descripcion, contacto, latitud, longitud, estado, creado_en) VALUES (?, ?, ?, ?, ?, ?, 'nuevo', NOW())",
            [$rutaId, $this->u['id'] ?? null, $descripcion, self::textoONulo($f['contacto'] ?? null, 120), $conUbicacion ? $lat : null, $conUbicacion ? $lng : null]
        );
        $recientes[] = $ahora;
        $_SESSION['reportes'] = $recientes;
        return $id;
    }

    private function editarReportes(int $id, array $f): void
    {
        $r = fila('SELECT r.estado, ru.linea_id FROM reporte_accidente r JOIN ruta ru ON ru.id = r.ruta_id WHERE r.id = ? FOR UPDATE', [$id])
            ?? throw new ErrorApi('Ese reporte ya no existe.', 404);
        $this->permitir($this->lineaPermitida((int) $r['linea_id']));
        if ($r['estado'] !== 'nuevo' || ($f['estado'] ?? '') !== 'revisado') {
            throw new ErrorApi('Ese reporte ya no se puede modificar.');
        }
        ejecutar("UPDATE reporte_accidente SET estado = 'revisado', revisado_por = ?, revisado_en = NOW() WHERE id = ?", [$this->u['id'], $id]);
    }

    /* ---------------- Fallas de vehículos ---------------- */

    /** Los choferes reportan fallas de las unidades de su línea; el dueño y el administrador, de las líneas que gestionan. */
    private function nuevoFallas(array $f): int
    {
        $this->permitir(in_array($this->rol(), ['chofer', 'dueno', 'admin'], true));
        $vehiculoId = $this->ref('vehiculos', $f['vehiculo_id'] ?? null);
        $vehiculo = $vehiculoId ? fila('SELECT linea_id FROM vehiculo WHERE id = ?', [$vehiculoId]) : null;
        $linea = $vehiculo ? (int) $vehiculo['linea_id'] : null;
        if ($this->rol() === 'chofer') {
            $chofer = fila('SELECT linea_id FROM chofer WHERE usuario_id = ?', [$this->u['id']]);
            $this->permitir($chofer !== null && $linea === (int) $chofer['linea_id']);
        } else {
            $this->permitir($this->lineaPermitida($linea));
        }
        $tipo = (string) ($f['tipo'] ?? '');
        if (!fila('SELECT clave FROM tipo_falla WHERE clave = ?', [$tipo])) {
            throw new ErrorApi('Selecciona qué tipo de falla tiene la unidad.');
        }
        $descripcion = self::textoONulo($f['descripcion'] ?? null, 500);
        if ($tipo === 'otro' && mb_strlen((string) $descripcion) < 5) {
            throw new ErrorApi('Describe brevemente la falla.');
        }
        if (fila("SELECT id FROM falla_vehiculo WHERE vehiculo_id = ? AND tipo = ? AND estado <> 'resuelta' FOR UPDATE", [$vehiculoId, $tipo])) {
            throw new ErrorApi('Esa falla ya está reportada para esta unidad y sigue sin resolverse.');
        }
        $viaje = fila("SELECT id FROM viaje WHERE vehiculo_id = ? AND estado = 'en_curso'", [$vehiculoId]);
        return self::insertar(
            "INSERT INTO falla_vehiculo (vehiculo_id, tipo, descripcion, impide_circular, estado, reportado_por, viaje_id, creado_en) VALUES (?, ?, ?, ?, 'pendiente', ?, ?, NOW())",
            [$vehiculoId, $tipo, $descripcion, self::bool($f['impide_circular'] ?? false), $this->u['id'], $viaje['id'] ?? null]
        );
    }

    /** Pendiente → en reparación → resuelta (o directo a resuelta). Solo el dueño de la línea o el administrador. */
    private function editarFallas(int $id, array $f): void
    {
        $falla = fila('SELECT fa.estado, v.linea_id FROM falla_vehiculo fa JOIN vehiculo v ON v.id = fa.vehiculo_id WHERE fa.id = ? FOR UPDATE', [$id])
            ?? throw new ErrorApi('Esa falla ya no existe.', 404);
        $this->permitir($this->lineaPermitida((int) $falla['linea_id']));
        $estado = (string) ($f['estado'] ?? '');
        $permitidos = ['pendiente' => ['en_reparacion', 'resuelta'], 'en_reparacion' => ['resuelta']][$falla['estado']] ?? [];
        if (!in_array($estado, $permitidos, true)) {
            throw new ErrorApi('Esa falla ya no se puede modificar.');
        }
        ejecutar(
            "UPDATE falla_vehiculo SET estado = ?, atendido_por = ?, nota_solucion = COALESCE(?, nota_solucion), resuelto_en = IF(? = 'resuelta', NOW(), NULL) WHERE id = ?",
            [$estado, $this->u['id'], self::textoONulo($f['nota_solucion'] ?? null, 255), $estado, $id]
        );
    }

    /* ---------------- Historial del pasajero ---------------- */

    private function nuevoHistorial(array $f): int
    {
        $this->permitir($this->rol() === 'pasajero');
        $rutaId = $this->ref('rutas', $f['ruta_id'] ?? null);
        $paradaId = $this->ref('paradas', $f['parada_id'] ?? null);
        if (!$rutaId && !$paradaId) {
            throw new ErrorApi('Solicitud no válida.');
        }
        return self::insertar('INSERT INTO historial_consulta (usuario_id, ruta_id, parada_id, consultado_en) VALUES (?, ?, ?, NOW())', [$this->u['id'], $rutaId, $paradaId]);
    }

    private function editarHistorial(int $id, array $f): void
    {
        $this->permitir(false);
    }

    /* ---------------- Borrado ---------------- */

    private function borrar(string $tabla, int $id): void
    {
        $this->permitir($tabla === 'historial' && $this->u !== null);
        ejecutar('DELETE FROM historial_consulta WHERE id = ? AND usuario_id = ?', [$id, $this->u['id']]);
    }
}

/** Convierte errores de MySQL (duplicados, llaves foráneas) en mensajes para el usuario. */
function errorDeBaseDeDatos(PDOException $e): Throwable
{
    $codigo = (int) ($e->errorInfo[1] ?? 0);
    $detalle = (string) ($e->errorInfo[2] ?? '');
    if ($codigo === 1062) {
        $mensajes = [
            'uq_usuario_email' => 'Ese correo ya está registrado.',
            'uq_chofer_licencia' => 'Ese número de licencia ya está registrado.',
            'uq_chofer_usuario' => 'Esa cuenta ya está registrada como chofer.',
            'uq_vehiculo_placa' => 'Esa placa ya está registrada.',
            'uq_vehiculo_unidad' => 'Ese número de unidad ya existe en la línea.',
            'uq_parada_codigo' => 'Ese código ya lo tiene otra parada.',
            'uq_linea_nombre' => 'Ya existe una línea con ese nombre.',
            'uq_ruta_codigo' => 'Ya existe una ruta con ese número y sentido en la línea.',
        ];
        foreach ($mensajes as $indice => $mensaje) {
            if (str_contains($detalle, $indice)) {
                return new ErrorApi($mensaje, 409);
            }
        }
        return new ErrorApi('Ese registro ya existe.', 409);
    }
    if ($codigo === 1452 || $codigo === 1451) {
        return new ErrorApi('Uno de los datos relacionados ya no existe o cambió. Recarga la página e intenta de nuevo.', 409);
    }
    if (in_array($codigo, [1048, 1264, 1265, 1366, 1406], true)) {
        return new ErrorApi('Revisa los datos: alguno está vacío, es demasiado largo o no tiene el formato correcto.');
    }
    return $e;
}

$cambios = entrada()['cambios'] ?? null;
if (!is_array($cambios)) {
    throw new ErrorApi('Solicitud no válida.');
}

$pdo = db();
$pdo->beginTransaction();
try {
    (new Guardado(usuarioSesion()))->aplicar($cambios);
    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    throw $e instanceof PDOException ? errorDeBaseDeDatos($e) : $e;
}

respuestaConDatos();
