/**
 * MoviRuta · utilidades comunes del frontend:
 * consultas a la API local (MRServicios), mapas Leaflet, capas de rutas/vehículos, actualización periódica y geolocalización.
 */
const MR = (() => {
    const config = {
        base: document.body.dataset.base || '.',
        centro: [17.9930, -92.9310],
        zoom: 14,
        actualizacionMs: 10000,
    };

    const url = (ruta) => `${config.base}/${String(ruta).replace(/^\//, '')}`;
    const parametro = (nombre) => new URLSearchParams(location.search).get(nombre);
    const T = MRServicios.texto;

    function esc(texto) {
        return String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    const icono = (nombre, clases = '') => `<span class="material-symbols-outlined ${clases}" aria-hidden="true">${nombre}</span>`;

    /** Consulta la API local con una pequeña espera, para que la interfaz muestre su estado de carga. */
    function api(endpoint, parametros = {}, espera = 140) {
        return new Promise((resolver, rechazar) => {
            setTimeout(() => {
                try { resolver(MRServicios.api(endpoint, parametros)); } catch (e) { rechazar(e); }
            }, espera + Math.random() * espera);
        });
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
            ? `${icono('sensors', 'text-[15px] text-secondary')} Ubicación actualizada ${tiempoRelativo(v.actualizado_hace_seg)}`
            : `${icono('location_disabled', 'text-[15px] text-outline')} No hay información de ubicación disponible`;
    }

    const claseEstado = (estado) => T.estadoInfo(estado).clase;
    const iconoEstado = (estado) => T.estadoInfo(estado).icono;

    function insigniaRuta(ruta, tamano = '') {
        const clase = tamano === 'sm' || tamano === true ? ' mr-codigo-sm' : tamano === 'lg' ? ' mr-codigo-lg' : '';
        return `<span class="mr-codigo${clase}" style="background:${esc(ruta.color)}">${esc(ruta.codigo)}</span>`;
    }

    /** Una insignia por número de ruta (ida y vuelta comparten número). */
    function insigniasRutas(rutas, tamano = '') {
        const vistas = new Map();
        rutas.forEach((r) => {
            const previa = vistas.get(r.codigo);
            if (previa) previa.destinos.push(r.destino);
            else vistas.set(r.codigo, { ruta: r, destinos: [r.destino] });
        });
        return [...vistas.values()].map(({ ruta, destinos }) =>
            `<span title="${esc(ruta.nombre)} · hacia ${esc(destinos.join(' / '))}">${insigniaRuta(ruta, tamano)}</span>`).join('');
    }

    function estadoHtml(estado, texto) {
        const info = T.estadoInfo(estado);
        return `<span class="mr-estado ${info.clase}">${icono(info.icono, 'relleno')}${esc(texto || info.texto)}</span>`;
    }

    function avisoServicioHtml(ruta) {
        if (ruta.estado_servicio === 'normal' && !ruta.aviso) return '';
        const info = T.estadoInfo(ruta.estado_servicio);
        const clase = ruta.estado_servicio === 'suspendida' ? 'suspendido' : 'aviso';
        return `<div class="mr-aviso-servicio ${clase}">${icono(info.icono, 'relleno text-[20px]')}
            <div><strong class="font-semibold">${esc(info.texto)}</strong>${ruta.aviso ? `<div>${esc(ruta.aviso)}</div>` : ''}</div></div>`;
    }

    function htmlVacio(nombreIcono, mensaje, extra = '') {
        return `<div class="mr-vacio">${icono(nombreIcono)}<p>${esc(mensaje)}</p>${extra}</div>`;
    }

    function esqueletos(n = 3, alto = 'h-24') {
        return Array.from({ length: n }, () => `<div class="mr-esqueleto ${alto} w-full"></div>`).join('');
    }

    /* ---------------- Mapa ---------------- */

    const hayMapa = typeof L !== 'undefined';
    const ANIO = new Date().getFullYear();

    function crearMapa(id, opciones = {}) {
        const escala = L.Browser.retina ? 2 : 1;
        const urlGoogle = (capa) => `https://mt{s}.google.com/vt/lyrs=${capa}&hl=es-419&gl=MX&scale=${escala}&x={x}&y={y}&z={z}`;
        const tipos = {
            mapa: [urlGoogle('m'), { subdomains: '0123', maxZoom: 21, attribution: `Datos del mapa &copy;${ANIO} Google` }, 'Mapa'],
            satelite: [urlGoogle('y'), { subdomains: '0123', maxZoom: 20, attribution: `Imágenes y datos del mapa &copy;${ANIO} Google` }, 'Satélite'],
        };
        const mapa = L.map(id, {
            scrollWheelZoom: opciones.scrollWheelZoom ?? true,
            zoomControl: false,
        }).setView(opciones.centro || config.centro, opciones.zoom || config.zoom);
        mapa.attributionControl.setPrefix(false);

        const capas = {};
        Object.entries(tipos).forEach(([clave, [plantilla, ajustes, nombre]]) => {
            capas[clave] = L.tileLayer(plantilla, { ...ajustes, nombre, plantilla });
        });
        capas.mapa.addTo(mapa);
        mapa.getContainer().classList.add('mr-mapa-google');

        L.control.zoom({ position: 'bottomright', zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(mapa);
        new (controlTipoMapa())(capas).addTo(mapa);
        return mapa;
    }

    /** Miniatura del otro tipo de mapa (esquina inferior izquierda), como en Google Maps. */
    let ClaseTipoMapa = null;
    function controlTipoMapa() {
        if (ClaseTipoMapa) return ClaseTipoMapa;
        ClaseTipoMapa = L.Control.extend({
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
        return ClaseTipoMapa;
    }

    const iconoParada = (color, destacada = false) => L.divIcon({
        className: 'mr-icono-limpio',
        html: `<div class="mr-marcador-parada${destacada ? ' destacada' : ''}" style="--color:${esc(color)}"></div>`,
        iconSize: destacada ? [22, 22] : [16, 16],
        iconAnchor: destacada ? [11, 11] : [8, 8],
        popupAnchor: [0, -8],
    });

    const iconoVehiculo = (color, estatico = false) => L.divIcon({
        className: 'mr-icono-limpio',
        html: `<div class="mr-marcador-vehiculo${estatico ? ' estatico' : ''}" style="--color:${esc(color)}">${icono('directions_bus')}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -16],
    });

    const iconoDestino = () => L.divIcon({
        className: 'mr-icono-limpio',
        html: `<div class="mr-marcador-destino">${icono('location_on')}</div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 36],
        popupAnchor: [0, -32],
    });

    const iconoUsuario = () => L.divIcon({
        className: 'mr-icono-limpio',
        html: '<div class="mr-marcador-usuario"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
    });

    function popupParada(p, extra = '') {
        return `<strong>${esc(p.nombre)}</strong>${p.referencia ? `<br><span style="color:#6f7973">${esc(p.referencia)}</span>` : ''}
                ${extra}<br><a href="${url('parada.html?id=' + p.id)}">Ver rutas y llegadas →</a>`;
    }

    /** Polilínea que se dibuja sola al aparecer, con un flujo animado encima. */
    function trazoAnimado(grupo, puntos, color, opciones = {}) {
        L.polyline(puntos, { color: '#000', weight: 9, opacity: 0.18, lineJoin: 'round', interactive: false }).addTo(grupo);
        const linea = L.polyline(puntos, { color, weight: opciones.grosor || 6, opacity: 1, lineJoin: 'round', className: 'mr-trazo-animado' }).addTo(grupo);
        const elemento = linea.getElement && linea.getElement();
        if (elemento) elemento.setAttribute('pathLength', '1');
        if (opciones.flujo !== false) {
            L.polyline(puntos, { color: '#fff', weight: 2, opacity: 0.85, lineCap: 'round', interactive: false, className: 'mr-trazo-flujo' }).addTo(grupo);
        }
        return linea;
    }

    /**
     * Dibuja el trazado y las paradas de una ruta.
     * opciones: { alSeleccionarParada(parada), destacadas: [ids], destino: id, ajustar: true, flujo: true }
     */
    function dibujarRuta(mapa, detalle, opciones = {}) {
        const color = detalle.ruta.color;
        const grupo = L.featureGroup().addTo(mapa);
        const marcadores = new Map();
        const destacadas = new Set(opciones.destacadas || []);

        registrarRecorrido(detalle.ruta.id, detalle.recorrido);
        if (detalle.recorrido.length > 1) {
            trazoAnimado(grupo, detalle.recorrido, color, opciones)
                .bindTooltip(`Ruta ${esc(detalle.ruta.codigo)} · ${esc(detalle.ruta.nombre)}`, { sticky: true });
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
            mapa.fitBounds(grupo.getBounds(), { padding: [40, 40] });
        }
        return {
            grupo,
            marcadores,
            quitar: () => mapa.removeLayer(grupo),
            mostrarParadas(visibles) {
                marcadores.forEach((m) => { if (visibles) grupo.addLayer(m); else grupo.removeLayer(m); });
            },
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

    function asegurarRecorrido(rutaId) {
        if (recorridos.has(rutaId) || recorridosPendientes.has(rutaId)) return;
        recorridosPendientes.set(rutaId, api('rutas', { id: rutaId }, 0)
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
     * opciones: { alMover(vehiculoId, latLng), alSeleccionar(vehiculo) }
     */
    function capaVehiculos(mapa, opciones = {}) {
        const estados = new Map();
        const grupo = L.layerGroup().addTo(mapa);
        const MAX_PREDICCION_MS = config.actualizacionMs * 2;
        const SUAVIZADO_MS = 1000;
        const TOLERANCIA_TRAZADO_M = 60;
        const VELOCIDAD_MAX_M_MS = 0.04;
        let cuadro = null;
        let cuadroAnterior = 0;

        const notificar = (id, pos) => { if (opciones.alMover) opciones.alMover(id, pos); };
        const modulo = (d, total) => ((d % total) + total) % total;
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
                        Hacia ${esc(v.destino)}${v.chofer ? `<br>Chofer: ${esc(v.chofer)}` : ''}
                        ${v.proxima_parada ? `<br>Próxima parada: <b>${esc(v.proxima_parada.nombre)}</b> · ${esc(v.proxima_parada.texto)}` : ''}<br>
                        <span style="color:#6f7973;font-size:12px">${estadoVehiculo(v)}</span>`;
                    const pos = L.latLng(v.latitud, v.longitud);
                    const t = ahora - (v.actualizado_hace_seg || 0) * 1000;
                    const e = estados.get(id);
                    if (e) {
                        e.v = v;
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
                    const estado = { m, v, rutaId: v.ruta_id, ultimo: { t, pos, sobre }, velocidad: 0, distancia: sobre, tween: null };
                    if (opciones.alSeleccionar) m.on('click', () => opciones.alSeleccionar(estado.v));
                    estados.set(id, estado);
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
            enfocar(vehiculoId, abrir = true) {
                const e = estados.get(vehiculoId);
                if (e) { mapa.setView(e.m.getLatLng(), Math.max(mapa.getZoom(), 15), { animate: true }); if (abrir) e.m.openPopup(); }
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

    /* ---------------- Actualización periódica ---------------- */

    /** Ejecuta fn de inmediato y cada intervalo; se pausa si la pestaña no está visible. */
    function sondeo(fn, intervalo = config.actualizacionMs) {
        let temporizador = null;
        let activo = true;
        const ejecutar = async () => {
            clearTimeout(temporizador);
            if (!activo) return;
            try { await fn(); } catch (e) { /* cada página muestra su propio error */ } finally {
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

    /** HTML del indicador de actualización; se controla con indicador(elemento). */
    const htmlIndicador = (texto = 'Cargando información…') => `
        <span class="mr-punto-vivo"></span><span data-texto>${esc(texto)}</span>
        <span data-demo class="hidden mr-etiqueta" title="Las ubicaciones de las unidades son simuladas">${icono('science')}Datos de demostración</span>`;

    function indicador(elemento) {
        if (!elemento) return { cargando() {}, listo() {}, error() {}, reposo() {} };
        if (!elemento.querySelector('[data-texto]')) elemento.innerHTML = htmlIndicador();
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
                if (demo) demo.classList.toggle('hidden', !esDemo);
            },
            error(mensaje) {
                elemento.classList.remove('cargando');
                elemento.classList.add('error');
                texto.textContent = mensaje || 'No fue posible actualizar. Se reintentará automáticamente.';
            },
            reposo(mensaje) {
                ultima = null;
                elemento.classList.remove('cargando', 'error');
                texto.textContent = mensaje;
                if (demo) demo.classList.add('hidden');
            },
        };
    }

    /** Lista de próximas llegadas (respuesta de la consulta "eta"). */
    function htmlLlegadas(rutas, opciones = {}) {
        if (!rutas.length) return htmlVacio('signpost', 'Ninguna ruta pasa por esta parada.');
        return rutas.map((r, indice) => {
            const encabezado = opciones.sinEncabezado ? '' : `
                <div class="flex items-center gap-3 mb-3">
                    ${insigniaRuta(r.ruta)}
                    <div class="flex-1 min-w-0">
                        <p class="font-semibold text-on-surface truncate">${esc(r.ruta.nombre)}</p>
                        <p class="text-xs text-on-surface-variant">${esc(r.ruta.sentido)} · hacia ${esc(r.ruta.destino)}</p>
                    </div>
                    <a class="mr-btn mr-btn-secundario mr-btn-sm" href="${url('ruta.html?id=' + r.ruta.id)}">Ver ruta ${icono('arrow_forward')}</a>
                </div>`;
            let cuerpo;
            if (r.ruta.estado_servicio === 'suspendida') {
                cuerpo = `<div class="mr-aviso-servicio suspendido">${icono('block', 'relleno text-[20px]')}<div>Servicio suspendido${r.ruta.aviso ? ': ' + esc(r.ruta.aviso) : ''}</div></div>`;
            } else if (r.llegadas.length) {
                cuerpo = `<div class="grid gap-2">${r.llegadas.slice(0, 3).map((l, i) => `
                    <div class="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${i === 0 ? 'bg-primary text-white shadow-md' : 'bg-surface-container-low'}">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <span class="material-symbols-outlined relleno ${i === 0 ? 'text-secondary-container' : 'text-secondary'}">directions_bus</span>
                            <div class="min-w-0">
                                <p class="font-semibold text-sm">Unidad ${esc(l.unidad)}</p>
                                <p class="text-[11px] ${i === 0 ? 'text-white/70' : 'text-on-surface-variant'}">Ubicación ${tiempoRelativo(l.actualizado_hace_seg)}</p>
                            </div>
                        </div>
                        <div class="text-right shrink-0">
                            <p class="font-extrabold ${i === 0 ? 'text-lg text-secondary-container' : 'text-sm text-primary'}">${esc(l.texto)}</p>
                            ${i === 0 ? '<p class="text-[10px] uppercase tracking-wider text-white/70">Llegada aprox.</p>' : ''}
                        </div>
                    </div>`).join('')}</div>`;
            } else if (r.en_circulacion > 0 && r.sin_ubicacion === r.en_circulacion) {
                cuerpo = `<p class="flex gap-2 text-sm text-on-surface-variant">${icono('location_disabled', 'text-[18px]')} Hay ${r.en_circulacion} unidad(es) en circulación, pero no hay información de ubicación disponible para estimar la llegada.</p>`;
            } else if (r.en_circulacion > 0) {
                cuerpo = `<p class="flex gap-2 text-sm text-on-surface-variant">${icono('info', 'text-[18px]')} Las unidades en circulación ya pasaron por esta parada.</p>`;
            } else {
                cuerpo = `<p class="flex gap-2 text-sm text-on-surface-variant">${icono('bedtime', 'text-[18px]')} No hay unidades en circulación en este momento.</p>`;
            }
            const extraSinUbicacion = r.llegadas.length && r.sin_ubicacion
                ? `<p class="mt-2 flex gap-1.5 text-xs text-on-surface-variant">${icono('location_disabled', 'text-[16px]')} ${r.sin_ubicacion} unidad(es) más sin información de ubicación.</p>` : '';
            return `<div class="mr-tarjeta p-4 mr-anim-subir" style="--retraso:${indice * 60}ms">${encabezado}${cuerpo}${extraSinUbicacion}</div>`;
        }).join('');
    }

    return {
        config, url, parametro, esc, icono, api, T, tiempoRelativo, estadoVehiculo, claseEstado, iconoEstado, insigniaRuta, insigniasRutas,
        estadoHtml, avisoServicioHtml, htmlVacio, esqueletos, hayMapa,
        crearMapa, iconoParada, iconoVehiculo, iconoDestino, dibujarRuta, trazoAnimado, capaVehiculos, mostrarUsuario, popupParada,
        ubicarUsuario, sondeo, htmlIndicador, indicador, htmlLlegadas,
    };
})();
