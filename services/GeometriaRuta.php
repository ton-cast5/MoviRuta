<?php

/**
 * Trazado de una ruta con distancias acumuladas. Permite ubicar paradas y vehículos
 * como "metros desde el inicio del recorrido", base del cálculo de ETA.
 */
final class GeometriaRuta
{
    private static array $cache = [];

    /** @var array<array{0: float, 1: float}> */
    public array $puntos;
    /** @var float[] distancia acumulada hasta cada punto */
    public array $acumuladas = [];
    public float $longitud = 0.0;

    private function __construct(array $puntos)
    {
        $this->puntos = $puntos;
        $total = 0.0;
        foreach ($puntos as $i => $p) {
            if ($i > 0) {
                $total += Geo::distancia($puntos[$i - 1][0], $puntos[$i - 1][1], $p[0], $p[1]);
            }
            $this->acumuladas[] = $total;
        }
        $this->longitud = $total;
    }

    public static function deRuta(int $rutaId): self
    {
        return self::$cache[$rutaId] ??= new self(Ruta::recorrido($rutaId));
    }

    public static function dePuntos(array $puntos): self
    {
        return new self($puntos);
    }

    public function esValida(): bool
    {
        return count($this->puntos) >= 2 && $this->longitud > 0;
    }

    /** Metros desde el inicio del recorrido hasta el punto del trazado más cercano. */
    public function distanciaDe(float $lat, float $lng): array
    {
        $mejor = ['distancia' => 0.0, 'desvio' => INF];
        for ($i = 1, $n = count($this->puntos); $i < $n; $i++) {
            $proy = Geo::proyectarEnSegmento($this->puntos[$i - 1], $this->puntos[$i], $lat, $lng);
            if ($proy['desvio'] < $mejor['desvio']) {
                $tramo = $this->acumuladas[$i] - $this->acumuladas[$i - 1];
                $mejor = ['distancia' => $this->acumuladas[$i - 1] + $proy['fraccion'] * $tramo, 'desvio' => $proy['desvio']];
            }
        }
        return $mejor;
    }

    /**
     * Distancia de cada parada sobre el recorrido. Recorre las paradas en orden y busca
     * a partir de la anterior para que en circuitos el inicio y el fin no se confundan.
     */
    public function distanciasDeParadas(array $paradas): array
    {
        $resultado = [];
        $minimo = 0.0;
        foreach ($paradas as $p) {
            $d = $this->distanciaDesde((float) $p['latitud'], (float) $p['longitud'], $minimo);
            $resultado[(int) $p['id']] = $d;
            $minimo = $d;
        }
        return $resultado;
    }

    private function distanciaDesde(float $lat, float $lng, float $minimo): float
    {
        $mejor = null;
        $mejorDesvio = INF;
        for ($i = 1, $n = count($this->puntos); $i < $n; $i++) {
            if ($this->acumuladas[$i] < $minimo) {
                continue;
            }
            $proy = Geo::proyectarEnSegmento($this->puntos[$i - 1], $this->puntos[$i], $lat, $lng);
            $d = $this->acumuladas[$i - 1] + $proy['fraccion'] * ($this->acumuladas[$i] - $this->acumuladas[$i - 1]);
            if ($d + 1 < $minimo) {
                continue;
            }
            if ($proy['desvio'] < $mejorDesvio - 0.5) {
                $mejorDesvio = $proy['desvio'];
                $mejor = $d;
            }
        }
        return $mejor ?? $this->distanciaDe($lat, $lng)['distancia'];
    }

    /** Coordenada ubicada a cierta distancia desde el inicio del recorrido. */
    public function puntoEn(float $distancia): array
    {
        $distancia = max(0, min($this->longitud, $distancia));
        for ($i = 1, $n = count($this->puntos); $i < $n; $i++) {
            if ($this->acumuladas[$i] >= $distancia) {
                $tramo = $this->acumuladas[$i] - $this->acumuladas[$i - 1];
                $t = $tramo > 0 ? ($distancia - $this->acumuladas[$i - 1]) / $tramo : 0;
                $a = $this->puntos[$i - 1];
                $b = $this->puntos[$i];
                return [$a[0] + ($b[0] - $a[0]) * $t, $a[1] + ($b[1] - $a[1]) * $t];
            }
        }
        return end($this->puntos);
    }
}
