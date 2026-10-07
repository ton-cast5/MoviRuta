<?php

/** Cálculos geográficos básicos (distancias en metros). */
final class Geo
{
    private const RADIO_TIERRA_M = 6371000;

    public static function distancia(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return 2 * self::RADIO_TIERRA_M * asin(min(1, sqrt($a)));
    }

    /**
     * Proyecta un punto sobre el segmento A-B usando una aproximación plana local
     * (suficiente para distancias urbanas). Devuelve la fracción [0..1] a lo largo del segmento
     * y la distancia en metros del punto al segmento.
     */
    public static function proyectarEnSegmento(array $a, array $b, float $lat, float $lng): array
    {
        $kx = 111320 * cos(deg2rad($lat));
        $ky = 110540;
        $ax = $a[1] * $kx; $ay = $a[0] * $ky;
        $bx = $b[1] * $kx; $by = $b[0] * $ky;
        $px = $lng * $kx;  $py = $lat * $ky;

        $dx = $bx - $ax;
        $dy = $by - $ay;
        $largo2 = $dx * $dx + $dy * $dy;
        $t = $largo2 > 0 ? max(0, min(1, (($px - $ax) * $dx + ($py - $ay) * $dy) / $largo2)) : 0;
        $cx = $ax + $t * $dx;
        $cy = $ay + $t * $dy;
        return ['fraccion' => $t, 'desvio' => sqrt(($px - $cx) ** 2 + ($py - $cy) ** 2)];
    }
}
