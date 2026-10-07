<?php

/**
 * Origen de las posiciones de los vehículos. La aplicación solo depende de esta interfaz,
 * así la fuente simulada puede sustituirse por una real sin tocar el resto del código.
 */
interface FuenteUbicacion
{
    /**
     * @param array $viajes Viajes en curso (con vehiculo_id, ruta_id, inicio, cuenta_con_gps, velocidad_promedio_kmh).
     * @return array<int, array{latitud: float, longitud: float, actualizado_en: int}> indexado por vehiculo_id;
     *         los vehículos sin información de ubicación no aparecen.
     */
    public function ubicaciones(array $viajes): array;

    /** true si las posiciones son de demostración. */
    public function esSimulada(): bool;
}
