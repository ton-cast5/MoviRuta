<?php

/** Historial de rutas y paradas consultadas por un pasajero. */
class Historial
{
    public static function registrar(int $usuarioId, ?int $rutaId, ?int $paradaId): void
    {
        // Evita duplicar la misma consulta si se recarga la página en pocos minutos.
        $st = db()->prepare('SELECT COUNT(*) FROM historial_consulta
                             WHERE usuario_id = ? AND ruta_id <=> ? AND parada_id <=> ? AND consultado_en > NOW() - INTERVAL 10 MINUTE');
        $st->execute([$usuarioId, $rutaId, $paradaId]);
        if ((int) $st->fetchColumn() > 0) {
            return;
        }
        db()->prepare('INSERT INTO historial_consulta (usuario_id, ruta_id, parada_id) VALUES (?, ?, ?)')
            ->execute([$usuarioId, $rutaId, $paradaId]);
    }

    public static function listar(int $usuarioId, int $limite = 50): array
    {
        $st = db()->prepare('SELECT h.consultado_en, h.ruta_id, h.parada_id,
                                    r.codigo AS ruta_codigo, r.nombre AS ruta_nombre, r.sentido AS ruta_sentido, r.color AS ruta_color,
                                    p.nombre AS parada_nombre, p.referencia AS parada_referencia
                             FROM historial_consulta h
                             LEFT JOIN ruta r ON r.id = h.ruta_id
                             LEFT JOIN parada p ON p.id = h.parada_id
                             WHERE h.usuario_id = ?
                             ORDER BY h.consultado_en DESC LIMIT ' . (int) $limite);
        $st->execute([$usuarioId]);
        return $st->fetchAll();
    }

    public static function borrar(int $usuarioId): void
    {
        db()->prepare('DELETE FROM historial_consulta WHERE usuario_id = ?')->execute([$usuarioId]);
    }
}
