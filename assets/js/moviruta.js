/**
 * MoviRuta · utilidades comunes del frontend:
 * llamadas a la API, mapas Leaflet, capas de rutas/vehículos, actualización periódica y geolocalización.
 */
const MR = (() => {
    const datos = document.body.dataset;
    const config = {
        base: datos.base || '',
        centro: [parseFloat(datos.mapaLat), parseFloat(datos.mapaLng)],
        zoom: parseInt(datos.mapaZoom, 10) || 13,
        mosaicos: datos.mapaMosaicos || 'google',
        actualizacionMs: (parseInt(datos.actualizacion, 10) || 15) * 1000,
    };

    const url = (ruta) => `${config.base}/${String(ruta).replace(/^\//, '')}`;

    function esc(texto) {
        return String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    async function api(ruta, parametros = {}) {
        const consulta = new URLSearchParams();
        Object.entries(parametros).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') consulta.set(k, v);
        });
        const destino = url(`api/${ruta}`) + (consulta.toString() ? `?${consulta}` : '');
        let respuesta;
        try {
            respuesta = await fetch(destino, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
        } catch (e) {
            throw new Error('No hay conexión. Revisa tu internet e intenta nuevamente.');
        }
        let json = null;
        try { json = await respuesta.json(); } catch (e) { /* respuesta no JSON */ }
        if (!respuesta.ok) {
            throw new Error((json && json.error) || 'No fue posible cargar la información. Intenta nuevamente.');
        }
        return json;
    }

    /** POST de un formulario (incluye su campo csrf) a la API; devuelve el JSON o lanza el mensaje de error. */
    async function enviar(ruta, formulario) {
        let respuesta;
        try {
            respuesta = await fetch(url(`api/${ruta}`), {
                method: 'POST', body: formulario, headers: { Accept: 'application/json' }, credentials: 'same-origin',
            });
        } catch (e) {
            throw new Error('No hay conexión. Revisa tu internet e intenta nuevamente.');
        }
        let json = null;
        try { json = await respuesta.json(); } catch (e) { /* respuesta no JSON */ }
        if (!respuesta.ok) {
            throw new Error((json && json.error) || 'No fue posible enviar la información. Intenta nuevamente.');
        }
        return json;
    }

    /* ---------------- Texto para el usuario ---------------- */

    function tiempoRelativo(segundos) {
        if (segundos === null || segundos === undefined) return '';
        if (segundos < 10) return 'hace unos segundos';
        if (segundos < 60) return `hace ${Math.round(segundos)} segundos`;
        const min = Math.round(segundos / 60);
        return min === 1 ? 'hace 1 minuto' : `hace ${min} minutos`;
    }

    function estadoVehiculo(v) {
        return v.con_ubicacion
            ? `<i class="bi bi-broadcast text-success"></i> Ubicación actualizada ${tiempoRelativo(v.actualizado_hace_seg)}`
            : '<i class="bi bi-slash-circle text-secondary"></i> No hay información de ubicación disponible';
    }

    function claseEstado(estado) {
        return { con_retrasos: 'aviso', suspendida: 'suspendido' }[estado] || 'normal';
    }

    function iconoEstado(estado) {
        return { con_retrasos: 'exclamation-triangle-fill', suspendida: 'x-octagon-fill' }[estado] || 'check-circle-fill';
    }

    function insigniaRuta(ruta, pequena = false) {
        return `<span class="mr-codigo${pequena ? ' mr-codigo-sm' : ''}" style="background:${esc(ruta.color)}">${esc(ruta.codigo)}</span>`;
    }

    /* ---------------- Mapa ---------------- */

    const ANIO = new Date().getFullYear();
    const ESCALA_GOOGLE = L.Browser.retina ? 2 : 1;
    const urlGoogle = (capa) => `https://mt{s}.google.com/vt/lyrs=${capa}&hl=es-419&gl=MX&scale=${ESCALA_GOOGLE}&x={x}&y={y}&z={z}`;

    /** Tipos de mapa: [plantilla, opciones de L.tileLayer, nombre visible]. */
    const MOSAICOS = {
        google: {
            mapa: [urlGoogle('m'), { subdomains: '0123', maxZoom: 21, attribution: `Datos del mapa &copy;${ANIO} Google` }, 'Mapa'],
            satelite: [urlGoogle('y'), { subdomains: '0123', maxZoom: 20, attribution: `Imágenes y datos del mapa &copy;${ANIO} Google` }, 'Satélite'],
        },
        osm: {
            mapa: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            }, 'Mapa'],
        },
    };

    /** Miniatura del otro tipo de mapa (esquina inferior izquierda), como en Google Maps. */
    const ControlTipoMapa = L.Control.extend({
        options: { position: 'bottomleft' },
        initialize(capas, options) {
            L.setOptions(this, options);
            this.capas = capas;
            this.actual = 'mapa';
        },
        onAdd(mapa) {
            this.mapa = mapa;
            const boton = this.boton = L.DomUtil.create('button', 'mr-tipo-mapa');
            boton.type = 'button';
            boton.innerHTML = '<span class="mr-tipo-mapa-nombre"></span>';
            L.DomEvent.disableClickPropagation(boton);
            L.DomEvent.on(boton, 'click', this.alternar, this);
            mapa.on('moveend', this.pintar, this);
            this.pintar();
            return boton;
        },
        onRemove(mapa) { mapa.off('moveend', this.pintar, this); },
        otro() { return this.actual === 'mapa' ? 'satelite' : 'mapa'; },
        alternar() {
            const siguiente = this.otro();
            this.mapa.removeLayer(this.capas[this.actual]);
            this.capas[siguiente].addTo(this.mapa).bringToBack();
            this.actual = siguiente;
            this.pintar();
        },
        pintar() {
            const capa = this.capas[this.otro()];
            const z = Math.max(3, Math.min(Math.round(this.mapa.getZoom()) - 1, 18));
            const t = this.mapa.project(this.mapa.getCenter(), z).divideBy(256).floor();
            const urlMiniatura = L.Util.template(capa.options.plantilla, { s: String(Math.abs(t.x + t.y) % 4), x: t.x, y: t.y, z });
            this.boton.style.backgroundImage = `url("${urlMiniatura}")`;
            this.boton.querySelector('.mr-tipo-mapa-nombre').textContent = capa.options.nombre;
            this.boton.title = `Mostrar ${capa.options.nombre.toLowerCase()}`;
        },
    });

    function crearMapa(id, opciones = {}) {
        const mapa = L.map(id, {
            scrollWheelZoom: opciones.scrollWheelZoom ?? true,
            zoomControl: false,
        }).setView(config.centro, config.zoom);
        mapa.attributionControl.setPrefix(false);

        const tipos = MOSAICOS[config.mosaicos] || MOSAICOS.google;
        const capas = {};
        Object.entries(tipos).forEach(([clave, [plantilla, ajustes, nombre]]) => {
            capas[clave] = L.tileLayer(plantilla, { ...ajustes, nombre, plantilla });
        });
        capas.mapa.addTo(mapa);
        mapa.getContainer().classList.add('mr-mapa-google');

        L.control.zoom({ position: 'bottomright', zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(mapa);
        if (capas.satelite) new ControlTipoMapa(capas).addTo(mapa);
        return mapa;
    }

    const iconoParada = (color, destacada = false) => L.divIcon({
        className: 'mr-icono-limpio',
        html: `<div class="mr-marcador-parada${destacada ? ' destacada' : ''}" style="--color:${esc(color)}"></div>`,
        iconSize: destacada ? [22, 22] : [16, 16],
        iconAnchor: destacada ? [11, 11] : [8, 8],
        popupAnchor: [0, -8],
    });

    const iconoVehiculo = (color) => L.divIcon({
        className: 'mr-icono-limpio',
        html: `<div class="mr-marcador-vehiculo" style="--color:${esc(color)}"><i class="bi bi-bus-front-fill"></i></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -16],
    });

    const iconoDestino = () => L.divIcon({
        className: 'mr-icono-limpio',
        html: '<div class="mr-marcador-destino"><i class="bi bi-geo-alt-fill"></i></div>',
        iconSize: [36, 36],
        iconAnchor: [18, 34],
        popupAnchor: [0, -30],
    });

    const iconoUsuario = () => L.divIcon({
        className: 'mr-icono-limpio',
        html: '<div class="mr-marcador-usuario"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
    });

    function popupParada(p, extra = '') {
        return `<strong>${esc(p.nombre)}</strong>${p.referencia ? `<br><span class="text-secondary">${esc(p.referencia)}</span>` : ''}
                ${extra}<br><a href="${url('parada.php?id=' + p.id)}">Ver rutas y llegadas</a>`;
    }

    /**
     * Dibuja el trazado y las paradas de una ruta.
     * opciones: { alSeleccionarParada(parada), destacadas: [ids], destino: id, ajustar: true }
     */
    function dibujarRuta(mapa, detalle, opciones = {}) {
        const color = detalle.ruta.color;
        const grupo = L.featureGroup().addTo(mapa);
        const marcadores = new Map();
        const destacadas = new Set(opciones.destacadas || []);

        registrarRecorrido(detalle.ruta.id, detalle.recorrido);
        if (detalle.recorrido.length > 1) {
            L.polyline(detalle.recorrido, { color: '#000', weight: 9, opacity: 0.22, lineJoin: 'round', interactive: false }).addTo(grupo);
            L.polyline(detalle.recorrido, { color, weight: 6, opacity: 1, lineJoin: 'round' })
                .bindTooltip(`Ruta ${detalle.ruta.codigo} · ${detalle.ruta.nombre}`, { sticky: true })
                .addTo(grupo);
        }
        detalle.paradas.forEach((p) => {
            const esDestino = opciones.destino === p.id;
            const icono = esDestino ? iconoDestino() : iconoParada(color, destacadas.has(p.id));
            const m = L.marker([p.latitud, p.longitud], { icon: icono, title: p.nombre, zIndexOffset: esDestino ? 500 : 0 })
                .bindPopup(popupParada(p))
                .addTo(grupo);
            if (opciones.alSeleccionarParada) m.on('click', () => opciones.alSeleccionarParada(p));
            marcadores.set(p.id, m);
        });
        if (opciones.ajustar !== false && grupo.getLayers().length) {
            mapa.fitBounds(grupo.getBounds(), { padding: [30, 30] });
        }
        return {
            grupo,
            marcadores,
            quitar: () => mapa.removeLayer(grupo),
            destacar(ids) {
                const set = new Set(ids);
                marcadores.forEach((m, id) => m.setIcon(opciones.destino === id ? iconoDestino() : iconoParada(color, set.has(id))));
            },
        };
    }

    /* ---------------- Recorridos para animar las unidades sobre la calle ---------------- */

    /** rutaId → { puntos: [[lat,lng]], acumulado: [m], total, circular } */
    const recorridos = new Map();
    const recorridosPendientes = new Map();
    const METROS_GRADO_LAT = 110540;

    function registrarRecorrido(rutaId, puntos) {
        if (!rutaId || recorridos.has(rutaId) || !puntos || puntos.length < 2) return;
        const acumulado = [0];
        for (let i = 1; i < puntos.length; i++) {
            acumulado.push(acumulado[i - 1] + L.latLng(puntos[i - 1]).distanceTo(puntos[i]));
        }
        const total = acumulado[acumulado.length - 1];
        const circular = L.latLng(puntos[0]).distanceTo(puntos[puntos.length - 1]) < 80;
        recorridos.set(rutaId, { puntos, acumulado, total, circular });
    }

    /** Descarga una sola vez el trazado de las rutas cuyas unidades aparecen en un mapa sin la ruta dibujada. */
    function asegurarRecorrido(rutaId) {
        if (recorridos.has(rutaId) || recorridosPendientes.has(rutaId)) return;
        recorridosPendientes.set(rutaId, api('rutas.php', { id: rutaId })
            .then((d) => registrarRecorrido(rutaId, d.recorrido))
            .catch(() => recorridosPendientes.delete(rutaId)));
    }

    /** Distancia sobre el recorrido del punto más cercano a p, y qué tan lejos queda p del trazado. */
    function proyectar(rec, p) {
        const kx = Math.cos(p.lat * Math.PI / 180) * 111320;
        let mejor = { dist: Infinity, sobre: 0 };
        for (let i = 1; i < rec.puntos.length; i++) {
            const [alat, alng] = rec.puntos[i - 1];
            const [blat, blng] = rec.puntos[i];
            const ax = (alng - p.lng) * kx, ay = (alat - p.lat) * METROS_GRADO_LAT;
            const bx = (blng - p.lng) * kx, by = (blat - p.lat) * METROS_GRADO_LAT;
            const dx = bx - ax, dy = by - ay;
            const largo2 = dx * dx + dy * dy;
            const t = largo2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / largo2)) : 0;
            const cx = ax + t * dx, cy = ay + t * dy;
            const dist = Math.hypot(cx, cy);
            if (dist < mejor.dist) mejor = { dist, sobre: rec.acumulado[i - 1] + t * (rec.acumulado[i] - rec.acumulado[i - 1]) };
        }
        return mejor;
    }

    function puntoEn(rec, metros) {
        const d = ((metros % rec.total) + rec.total) % rec.total;
        let bajo = 1, alto = rec.acumulado.length - 1;
        while (bajo < alto) {
            const medio = (bajo + alto) >> 1;
            if (rec.acumulado[medio] < d) bajo = medio + 1; else alto = medio;
        }
        const tramo = rec.acumulado[bajo] - rec.acumulado[bajo - 1];
        const t = tramo ? (d - rec.acumulado[bajo - 1]) / tramo : 0;
        const [alat, alng] = rec.puntos[bajo - 1];
        const [blat, blng] = rec.puntos[bajo];
        return L.latLng(alat + (blat - alat) * t, alng + (blng - alng) * t);
    }

    /**
     * Capa de vehículos con movimiento continuo.
     * Con el recorrido de la ruta, la unidad avanza sobre la calle a la velocidad medida entre sus dos últimos
     * reportes de ubicación; cada reporte nuevo corrige la posición suavemente y nunca la hace retroceder.
     * Sin recorrido (o fuera de él) se desliza en línea recta hacia la nueva posición.
     * opciones: { alMover(vehiculoId, latLng) } se llama en cada cuadro en que la unidad se mueve.
     */
    function capaVehiculos(mapa, opciones = {}) {
        const estados = new Map();
        const grupo = L.layerGroup().addTo(mapa);
        const MAX_PREDICCION_MS = config.actualizacionMs * 2;
        const SUAVIZADO_MS = 1000;
        const TOLERANCIA_TRAZADO_M = 60;
        const VELOCIDAD_MAX_M_MS = 0.04; // 144 km/h
        let cuadro = null;
        let cuadroAnterior = 0;

        const notificar = (id, pos) => { if (opciones.alMover) opciones.alMover(id, pos); };
        const modulo = (d, total) => ((d % total) + total) % total;
        /** Diferencia a − b sobre un recorrido de longitud total, en el rango (−total/2, total/2]. */
        const diferenciaCircular = (a, b, total) => modulo(a - b + total / 2, total) - total / 2;

        function animar(ahora) {
            const paso = Math.min(250, ahora - (cuadroAnterior || ahora));
            cuadroAnterior = ahora;
            estados.forEach((e, id) => {
                const rec = recorridos.get(e.rutaId);
                if (e.distancia !== null && rec) {
                    let prevista = e.ultimo.sobre + e.velocidad * Math.min(ahora - e.ultimo.t, MAX_PREDICCION_MS);
                    if (!rec.circular) prevista = Math.min(prevista, rec.total);
                    const error = prevista - e.distancia;
                    if (error < -150) {
                        e.distancia = prevista;
                    } else {
                        // Velocidad medida más una corrección proporcional; si va un poco adelantada solo se frena.
                        let rapidez = e.velocidad + error / SUAVIZADO_MS;
                        if (e.velocidad > 0 && error > -40) rapidez = Math.max(rapidez, e.velocidad * 0.5);
                        if (rapidez <= 0 || (e.velocidad === 0 && error < 0.05)) return;
                        e.distancia += rapidez * paso;
                        if (!rec.circular) e.distancia = Math.min(e.distancia, rec.total);
                    }
                    const pos = puntoEn(rec, e.distancia);
                    e.m.setLatLng(pos);
                    notificar(id, pos);
                } else if (e.tween) {
                    const t = Math.min(1, (ahora - e.tween.inicio) / e.tween.duracion);
                    const { desde, hasta } = e.tween;
                    const pos = L.latLng(desde.lat + (hasta.lat - desde.lat) * t, desde.lng + (hasta.lng - desde.lng) * t);
                    e.m.setLatLng(pos);
                    notificar(id, pos);
                    if (t >= 1) e.tween = null;
                }
            });
            cuadro = estados.size ? requestAnimationFrame(animar) : null;
        }

        const iniciarAnimacion = () => { if (!cuadro) { cuadroAnterior = 0; cuadro = requestAnimationFrame(animar); } };

        function saltar(e, id, pos, sobre) {
            e.m.setLatLng(pos);
            e.velocidad = 0;
            e.tween = null;
            e.distancia = sobre;
            notificar(id, pos);
        }

        /** Procesa un reporte de ubicación (posición + momento en que se tomó). */
        function reportar(id, e, rutaId, pos, t) {
            if (Math.abs(t - e.ultimo.t) < 1500 && pos.distanceTo(e.ultimo.pos) < 1) return;
            const rec = recorridos.get(rutaId);
            const proyeccion = rec ? proyectar(rec, pos) : null;
            const sobreTrazado = proyeccion && proyeccion.dist <= TOLERANCIA_TRAZADO_M;
            const mismaRuta = e.rutaId === rutaId;
            const dt = t - e.ultimo.t;
            e.rutaId = rutaId;

            if (!sobreTrazado) {
                const desde = e.m.getLatLng();
                e.distancia = null;
                e.ultimo = { t, pos, sobre: null };
                if (!mismaRuta || dt <= 0 || desde.distanceTo(pos) > 5000) { saltar(e, id, pos, null); return; }
                e.tween = { desde, hasta: pos, inicio: performance.now(), duracion: Math.min(Math.max(dt, 1000), config.actualizacionMs * 3) };
                return;
            }

            if (!mismaRuta || e.ultimo.sobre === null) {
                e.ultimo = { t, pos, sobre: proyeccion.sobre };
                const actual = proyectar(rec, e.m.getLatLng());
                if (actual.dist > TOLERANCIA_TRAZADO_M || !mismaRuta) saltar(e, id, pos, proyeccion.sobre);
                else { e.distancia = proyeccion.sobre + diferenciaCircular(actual.sobre, proyeccion.sobre, rec.total); e.velocidad = 0; e.tween = null; }
                return;
            }

            let avance = proyeccion.sobre - modulo(e.ultimo.sobre, rec.total);
            if (rec.circular && avance < -rec.total / 2) avance += rec.total;
            if (avance < -50 || avance > 5000 || dt > MAX_PREDICCION_MS * 3) {
                e.ultimo = { t, pos, sobre: proyeccion.sobre };
                saltar(e, id, pos, proyeccion.sobre);
                return;
            }
            avance = Math.max(0, avance);
            const sobre = e.ultimo.sobre + avance;
            e.velocidad = dt > 0 ? Math.min(avance / dt, VELOCIDAD_MAX_M_MS) : 0;
            e.distancia = e.distancia === null ? sobre : sobre + diferenciaCircular(e.distancia, sobre, rec.total);
            e.ultimo = { t, pos, sobre };
        }

        return {
            grupo,
            actualizar(vehiculos) {
                const ahora = performance.now();
                const vigentes = new Set();
                vehiculos.forEach((v) => {
                    if (!v.con_ubicacion) return;
                    const id = v.vehiculo_id;
                    vigentes.add(id);
                    asegurarRecorrido(v.ruta_id);
                    const contenido = `<strong>Unidad ${esc(v.unidad)}</strong><br>
                        Ruta ${esc(v.ruta_codigo)} · ${esc(v.ruta_nombre)} (${esc(v.ruta_sentido)})<br>
                        Hacia ${esc(v.destino)}${v.chofer ? `<br>Chofer: ${esc(v.chofer)}` : ''}<br>
                        <span class="text-secondary small">${estadoVehiculo(v)}</span>`;
                    const pos = L.latLng(v.latitud, v.longitud);
                    const t = ahora - (v.actualizado_hace_seg || 0) * 1000;
                    const e = estados.get(id);
                    if (e) {
                        reportar(id, e, v.ruta_id, pos, t);
                        e.m.setPopupContent(contenido);
                        return;
                    }
                    const m = L.marker(pos, { icon: iconoVehiculo(v.ruta_color), zIndexOffset: 1000, title: `Unidad ${v.unidad}` })
                        .bindPopup(contenido)
                        .addTo(grupo);
                    const rec = recorridos.get(v.ruta_id);
                    const proyeccion = rec ? proyectar(rec, pos) : null;
                    const sobre = proyeccion && proyeccion.dist <= TOLERANCIA_TRAZADO_M ? proyeccion.sobre : null;
                    estados.set(id, { m, rutaId: v.ruta_id, ultimo: { t, pos, sobre }, velocidad: 0, distancia: sobre, tween: null });
                });
                estados.forEach((e, id) => {
                    if (!vigentes.has(id)) {
                        grupo.removeLayer(e.m);
                        estados.delete(id);
                    }
                });
                if (estados.size) iniciarAnimacion();
            },
            posicion(vehiculoId) {
                const e = estados.get(vehiculoId);
                return e ? e.m.getLatLng() : null;
            },
            enfocar(vehiculoId) {
                const e = estados.get(vehiculoId);
                if (e) { mapa.setView(e.m.getLatLng(), Math.max(mapa.getZoom(), 15)); e.m.openPopup(); }
            },
        };
    }

    let marcadorUsuarioActual = null;
    function mostrarUsuario(mapa, pos) {
        if (marcadorUsuarioActual) mapa.removeLayer(marcadorUsuarioActual);
        marcadorUsuarioActual = L.marker([pos.lat, pos.lng], { icon: iconoUsuario(), zIndexOffset: 2000, title: 'Tu ubicación' })
            .bindPopup('<strong>Estás aquí</strong>')
            .addTo(mapa);
        return marcadorUsuarioActual;
    }

    /* ---------------- Geolocalización del navegador ---------------- */

    function ubicarUsuario() {
        return new Promise((resolver, rechazar) => {
            if (!('geolocation' in navigator)) {
                rechazar(new Error('Tu navegador no permite obtener la ubicación.'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (p) => resolver({ lat: p.coords.latitude, lng: p.coords.longitude }),
                (e) => {
                    const mensajes = {
                        1: 'No diste permiso para usar tu ubicación. Puedes escribir tu punto de partida.',
                        2: 'No fue posible determinar tu ubicación. Intenta nuevamente.',
                        3: 'La ubicación tardó demasiado en responder. Intenta nuevamente.',
                    };
                    rechazar(new Error(mensajes[e.code] || mensajes[2]));
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        });
    }

    /* ---------------- Actualización periódica (RF-13) ---------------- */

    /** Ejecuta fn de inmediato y cada intervalo; se pausa si la pestaña no está visible. */
    function sondeo(fn, intervalo = config.actualizacionMs) {
        let temporizador = null;
        let activo = true;
        const ejecutar = async () => {
            clearTimeout(temporizador);
            if (!activo) return;
            try { await fn(); } finally {
                if (activo && !document.hidden) temporizador = setTimeout(ejecutar, intervalo);
            }
        };
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && activo) ejecutar();
            else clearTimeout(temporizador);
        });
        ejecutar();
        return {
            detener() { activo = false; clearTimeout(temporizador); },
            reiniciar(nuevaFn) { if (nuevaFn) fn = nuevaFn; activo = true; ejecutar(); },
        };
    }

    /** Controla un indicador ".mr-actualizacion" con su texto y la etiqueta de datos de demostración. */
    function indicador(elemento) {
        if (!elemento) return { cargando() {}, listo() {}, error() {}, reposo() {} };
        const texto = elemento.querySelector('[data-texto]');
        const demo = elemento.querySelector('[data-demo]');
        let ultima = null;
        setInterval(() => {
            if (ultima && !elemento.classList.contains('cargando') && !elemento.classList.contains('error')) {
                texto.textContent = `Información actualizada ${tiempoRelativo((Date.now() - ultima) / 1000)}`;
            }
        }, 5000);
        return {
            cargando() {
                elemento.classList.remove('error');
                elemento.classList.add('cargando');
                texto.textContent = 'Actualizando información…';
            },
            listo(esDemo) {
                ultima = Date.now();
                elemento.classList.remove('cargando', 'error');
                texto.textContent = 'Información actualizada hace unos segundos';
                if (demo) demo.classList.toggle('d-none', !esDemo);
            },
            error(mensaje) {
                elemento.classList.remove('cargando');
                elemento.classList.add('error');
                texto.textContent = mensaje || 'No fue posible actualizar. Se reintentará automáticamente.';
            },
            /** Sin actualización activa (por ejemplo, aún no se elige una ruta). */
            reposo(mensaje) {
                ultima = null;
                elemento.classList.remove('cargando', 'error');
                texto.textContent = mensaje;
                if (demo) demo.classList.add('d-none');
            },
        };
    }

    function htmlVacio(icono, mensaje) {
        return `<div class="mr-vacio"><i class="bi bi-${icono}"></i>${esc(mensaje)}</div>`;
    }

    /** Lista de próximas llegadas (respuesta de api/eta.php). */
    function htmlLlegadas(rutas, opciones = {}) {
        if (!rutas.length) return htmlVacio('signpost', 'Ninguna ruta pasa por esta parada.');
        return rutas.map((r) => {
            const encabezado = opciones.sinEncabezado ? '' : `
                <div class="d-flex align-items-center gap-2 mb-2">
                    ${insigniaRuta(r.ruta, true)}
                    <div class="flex-grow-1 small"><strong>${esc(r.ruta.nombre)}</strong> · ${esc(r.ruta.sentido)} hacia ${esc(r.ruta.destino)}</div>
                    <a class="small" href="${url('ruta.php?id=' + r.ruta.id)}">Ver ruta</a>
                </div>`;
            let cuerpo;
            if (r.ruta.estado_servicio === 'suspendida') {
                cuerpo = `<div class="mr-aviso-servicio suspendido small"><i class="bi bi-x-octagon-fill"></i><div>Servicio suspendido${r.ruta.aviso ? ': ' + esc(r.ruta.aviso) : ''}</div></div>`;
            } else if (r.llegadas.length) {
                cuerpo = r.llegadas.slice(0, 3).map((l, i) => `
                    <div class="mr-eta-fila">
                        <div><div class="fw-semibold">Unidad ${esc(l.unidad)}</div>
                             <div class="small text-secondary">Ubicación actualizada ${tiempoRelativo(l.actualizado_hace_seg)}</div></div>
                        <div class="text-end"><div class="${i === 0 ? 'mr-eta-tiempo' : 'fw-bold'}">${esc(l.texto)}</div>
                             ${i === 0 ? '<div class="small text-secondary">Tiempo aprox. de llegada</div>' : ''}</div>
                    </div>`).join('');
            } else if (r.en_circulacion > 0 && r.sin_ubicacion === r.en_circulacion) {
                cuerpo = `<div class="small text-secondary"><i class="bi bi-slash-circle"></i> Hay ${r.en_circulacion} unidad(es) en circulación, pero no hay información de ubicación disponible para estimar la llegada.</div>`;
            } else if (r.en_circulacion > 0) {
                cuerpo = '<div class="small text-secondary"><i class="bi bi-info-circle"></i> Las unidades en circulación ya pasaron por esta parada.</div>';
            } else {
                cuerpo = '<div class="small text-secondary"><i class="bi bi-moon"></i> No hay unidades en circulación en este momento.</div>';
            }
            const extraSinUbicacion = r.llegadas.length && r.sin_ubicacion
                ? `<div class="small text-secondary mt-1"><i class="bi bi-slash-circle"></i> ${r.sin_ubicacion} unidad(es) más sin información de ubicación.</div>` : '';
            return `<div class="mr-eta mb-2">${encabezado}${cuerpo}${extraSinUbicacion}</div>`;
        }).join('');
    }

    return {
        config, url, esc, api, enviar, tiempoRelativo, estadoVehiculo, claseEstado, iconoEstado, insigniaRuta,
        crearMapa, iconoParada, iconoVehiculo, dibujarRuta, capaVehiculos, mostrarUsuario, popupParada,
        ubicarUsuario, sondeo, indicador, htmlVacio, htmlLlegadas,
    };
})();
