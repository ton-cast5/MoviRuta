<?php

/**
 * DATOS DE DEMOSTRACIÓN.
 * Calcula la posición de cada vehículo en circulación avanzando sobre el trazado de su ruta
 * a la velocidad promedio configurada, a partir de la hora de inicio del viaje.
 * Solo se simulan vehículos registrados con dispositivo GPS; el resto aparece "sin ubicación".
 */
final class FuenteUbicacionSimulada implements FuenteUbicacion
{
    private const PASO_SEG = 10;

    public function esSimulada(): bool
    {
        return true;
    }

    public function ubicaciones(array $viajes): array
    {
        // La posición se actualiza en pasos fijos, como lo haría un GPS que reporta cada cierto tiempo.
        $ahora = intdiv(time(), self::PASO_SEG) * self::PASO_SEG;
        $resultado = [];

        foreach ($viajes as $viaje) {
            if (!(int) $viaje['cuenta_con_gps']) {
                continue;
            }
            $geometria = GeometriaRuta::deRuta((int) $viaje['ruta_id']);
            if (!$geometria->esValida()) {
                continue;
            }
            // Variación ligera por unidad para que no todas avancen exactamente igual.
            $factor = 0.9 + ((int) $viaje['vehiculo_id'] % 5) * 0.05;
            $metrosPorSeg = (float) $viaje['velocidad_promedio_kmh'] / 3.6 * $factor;
            $transcurrido = max(0, $ahora - strtotime($viaje['inicio']));
            $distancia = fmod($transcurrido * $metrosPorSeg, $geometria->longitud);

            [$lat, $lng] = $geometria->puntoEn($distancia);
            $resultado[(int) $viaje['vehiculo_id']] = [
                'latitud'        => round($lat, 6),
                'longitud'       => round($lng, 6),
                'actualizado_en' => $ahora,
            ];
        }
        return $resultado;
    }
}
