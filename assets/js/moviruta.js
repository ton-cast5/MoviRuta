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
        mosaicos: datos.mapaMosaicos || 'osm',
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

    const MOSAICOS = {
        google: ['https://mt{s}.google.com/vt/lyrs=m&hl=es&x={x}&y={y}&z={z}', {
            subdomains: ['0', '1', '2', '3'],
            maxZoom: 20,
            attribution: 'Datos del mapa &copy; Google',
        }],
        osm: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }],
    };

    function crearMapa(id, opciones = {}) {
        const mapa = L.map(id, { scrollWheelZoom: opciones.scrollWheelZoom ?? true }).setView(config.centro, config.zoom);
        const [plantilla, ajustes] = MOSAICOS[config.mosaicos] || MOSAICOS.osm;
        L.tileLayer(plantilla, ajustes).addTo(mapa);
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
     * opciones: { alSeleccionarParada(parada), destacadas: [ids], ajustar: true }
     */
    function dibujarRuta(mapa, detalle, opciones = {}) {
        const color = detalle.ruta.color;
        const grupo = L.featureGroup().addTo(mapa);
        const marcadores = new Map();
        const destacadas = new Set(opciones.destacadas || []);

        if (detalle.recorrido.length > 1) {
            L.polyline(detalle.recorrido, { color, weight: 6, opacity: 0.85, lineJoin: 'round' })
                .bindTooltip(`Ruta ${detalle.ruta.codigo} · ${detalle.ruta.nombre}`, { sticky: true })
                .addTo(grupo);
        }
        detalle.paradas.forEach((p) => {
            const m = L.marker([p.latitud, p.longitud], { icon: iconoParada(color, destacadas.has(p.id)), title: p.nombre })
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
                marcadores.forEach((m, id) => m.setIcon(iconoParada(color, set.has(id))));
            },
        };
    }

    /** Capa de vehículos que se actualiza moviendo marcadores existentes en lugar de recrearlos. */
    function capaVehiculos(mapa) {
        const marcadores = new Map();
        const grupo = L.layerGroup().addTo(mapa);
        return {
            grupo,
            actualizar(vehiculos) {
                const vigentes = new Set();
                vehiculos.forEach((v) => {
                    if (!v.con_ubicacion) return;
                    vigentes.add(v.vehiculo_id);
                    const contenido = `<strong>Unidad ${esc(v.unidad)}</strong><br>
                        Ruta ${esc(v.ruta_codigo)} · ${esc(v.ruta_nombre)} (${esc(v.ruta_sentido)})<br>
                        Hacia ${esc(v.destino)}${v.chofer ? `<br>Chofer: ${esc(v.chofer)}` : ''}<br>
                        <span class="text-secondary small">${estadoVehiculo(v)}</span>`;
                    let m = marcadores.get(v.vehiculo_id);
                    if (m) {
                        m.setLatLng([v.latitud, v.longitud]);
                        m.setPopupContent(contenido);
                    } else {
                        m = L.marker([v.latitud, v.longitud], { icon: iconoVehiculo(v.ruta_color), zIndexOffset: 1000, title: `Unidad ${v.unidad}` })
                            .bindPopup(contenido)
                            .addTo(grupo);
                        marcadores.set(v.vehiculo_id, m);
                    }
                });
                marcadores.forEach((m, id) => {
                    if (!vigentes.has(id)) {
                        grupo.removeLayer(m);
                        marcadores.delete(id);
                    }
                });
            },
            enfocar(vehiculoId) {
                const m = marcadores.get(vehiculoId);
                if (m) { mapa.setView(m.getLatLng(), Math.max(mapa.getZoom(), 15)); m.openPopup(); }
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
        config, url, esc, api, tiempoRelativo, estadoVehiculo, claseEstado, iconoEstado, insigniaRuta,
        crearMapa, iconoParada, iconoVehiculo, dibujarRuta, capaVehiculos, mostrarUsuario, popupParada,
        ubicarUsuario, sondeo, indicador, htmlVacio, htmlLlegadas,
    };
})();
