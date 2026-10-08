/**
 * MoviRuta · datos y lógica sin servidor.
 * La primera vez se copian los datos de demostración (datos.js) a localStorage; todo lo que se modifica en los
 * paneles se guarda ahí y se comparte entre las pestañas del mismo navegador.
 * MRServicios.api(endpoint, parámetros) responde con la misma forma que tenía la antigua API JSON.
 */
const MRServicios = (() => {
    const CLAVE_BD = 'moviruta.bd';
    const CLAVE_SESION = 'moviruta.sesion';
    const CLAVE_REPORTES = 'moviruta.reportes-enviados';
    const MIN = 60000;
    const RADIO_CERCANIA_M = 800;
    const PASO_UBICACION_SEG = 5;

    const ROLES = { pasajero: 'Pasajero', chofer: 'Chofer', dueno: 'Dueño de línea', admin: 'Administrador general' };
    const PANELES = { pasajero: 'pasajero/index.html', chofer: 'chofer/index.html', dueno: 'dueno/index.html', admin: 'admin/index.html' };
    const ORDEN_SENTIDO = { ida: 0, vuelta: 1, circular: 2 };

    const cacheGeometria = new Map();

    /* ---------------- Almacenamiento ---------------- */

    function sembrar() {
        const d = JSON.parse(JSON.stringify(window.MR_DATOS_DEMO));
        const ahora = Date.now();
        d.viajes = d.viajes.map(({ hace_min: hace, duracion_min: duracion, ...v }) => ({
            ...v, inicio: ahora - hace * MIN, fin: v.estado === 'finalizado' ? ahora - (hace - duracion) * MIN : null,
        }));
        d.reportes = d.reportes.map(({ hace_min: hace, revisado_hace_min: revisado, ...r }) => ({
            ...r, creado_en: ahora - hace * MIN, revisado_en: revisado === null ? null : ahora - revisado * MIN,
        }));
        d.historial = d.historial.map(({ hace_min: hace, ...h }) => ({ ...h, consultado_en: ahora - hace * MIN }));
        return d;
    }

    function escribir(datos) {
        try { localStorage.setItem(CLAVE_BD, JSON.stringify(datos)); } catch (e) { /* almacenamiento lleno o bloqueado */ }
    }

    function cargar() {
        try {
            const guardado = JSON.parse(localStorage.getItem(CLAVE_BD));
            if (guardado && guardado.version === window.MR_DATOS_DEMO.version) return guardado;
        } catch (e) { /* datos dañados: se vuelven a sembrar */ }
        const nuevo = sembrar();
        escribir(nuevo);
        return nuevo;
    }

    let bd = cargar();

    function guardar() {
        cacheGeometria.clear();
        escribir(bd);
    }

    window.addEventListener('storage', (e) => {
        if (e.key !== CLAVE_BD || !e.newValue) return;
        try { bd = JSON.parse(e.newValue); cacheGeometria.clear(); } catch (err) { /* se conserva la copia actual */ }
    });

    function reiniciarDemo() {
        bd = sembrar();
        guardar();
    }

    const siguienteId = (lista) => lista.reduce((m, x) => Math.max(m, x.id), 0) + 1;

    /* ---------------- Formato ---------------- */

    const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const contiene = (campo, texto) => norm(campo).includes(norm(texto));
    const limpiar = (s, max = 255) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
    const dos = (n) => String(n).padStart(2, '0');

    const textoSentido = (s) => ({ vuelta: 'Vuelta', circular: 'Circuito' }[s] || 'Ida');
    const estadoInfo = (e) => ({
        con_retrasos: { texto: 'Servicio con retrasos', clase: 'aviso', icono: 'warning' },
        suspendida: { texto: 'Servicio suspendido', clase: 'suspendido', icono: 'block' },
    }[e] || { texto: 'Operando con normalidad', clase: 'normal', icono: 'check_circle' });
    const formatoTarifa = (t) => (t === null || t === undefined || t === '' ? 'No disponible' : `$${Number(t).toFixed(2)}`);
    const formatoDistancia = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);

    function formatoMinutosAprox(minutos) {
        const m = Math.max(1, Math.round(minutos));
        if (m >= 60) {
            const resto = m % 60;
            return `Aprox. ${Math.floor(m / 60)} h${resto ? ` ${resto} min` : ''}`;
        }
        return `Aprox. ${m} min`;
    }

    function formatoFecha(t, conHora = true) {
        if (!t) return '—';
        const d = new Date(t);
        const fecha = `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()}`;
        return conHora ? `${fecha} ${dos(d.getHours())}:${dos(d.getMinutes())}` : fecha;
    }

    function formatoHora(t) {
        const d = new Date(t);
        const h = d.getHours();
        return `${h % 12 || 12}:${dos(d.getMinutes())} ${h < 12 ? 'a.m.' : 'p.m.'}`;
    }

    const hora24 = (t) => { const d = new Date(t); return `${dos(d.getHours())}:${dos(d.getMinutes())}`; };

    function formatoDuracion(inicio, fin) {
        if (!inicio) return '—';
        const min = Math.floor(Math.max(0, (fin || Date.now()) - inicio) / MIN);
        return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
    }

    const fechaISO = (d) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;

    /* ---------------- Geometría ---------------- */

    const RAD = Math.PI / 180;

    function distancia(lat1, lng1, lat2, lng2) {
        const dLat = (lat2 - lat1) * RAD;
        const dLng = (lng2 - lng1) * RAD;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLng / 2) ** 2;
        return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(a)));
    }

    function proyectarEnSegmento(a, b, lat, lng) {
        const kx = 111320 * Math.cos(lat * RAD);
        const ky = 110540;
        const ax = a[1] * kx, ay = a[0] * ky, bx = b[1] * kx, by = b[0] * ky, px = lng * kx, py = lat * ky;
        const dx = bx - ax, dy = by - ay;
        const largo2 = dx * dx + dy * dy;
        const t = largo2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / largo2)) : 0;
        return { fraccion: t, desvio: Math.hypot(px - (ax + t * dx), py - (ay + t * dy)) };
    }

    /** Trazado con distancias acumuladas: ubica paradas y vehículos como "metros desde el inicio". */
    class Geometria {
        constructor(puntos) {
            this.puntos = puntos;
            this.acumuladas = [];
            let total = 0;
            puntos.forEach((p, i) => {
                if (i > 0) total += distancia(puntos[i - 1][0], puntos[i - 1][1], p[0], p[1]);
                this.acumuladas.push(total);
            });
            this.longitud = total;
        }

        esValida() { return this.puntos.length >= 2 && this.longitud > 0; }

        distanciaDe(lat, lng) {
            let mejor = { distancia: 0, desvio: Infinity };
            for (let i = 1; i < this.puntos.length; i++) {
                const p = proyectarEnSegmento(this.puntos[i - 1], this.puntos[i], lat, lng);
                if (p.desvio < mejor.desvio) {
                    mejor = { distancia: this.acumuladas[i - 1] + p.fraccion * (this.acumuladas[i] - this.acumuladas[i - 1]), desvio: p.desvio };
                }
            }
            return mejor;
        }

        /** Busca cada parada a partir de la anterior para que en circuitos el inicio y el fin no se confundan. */
        distanciasDeParadas(paradas) {
            const resultado = {};
            let minimo = 0;
            paradas.forEach((p) => {
                const d = this.distanciaDesde(p.latitud, p.longitud, minimo);
                resultado[p.id] = d;
                minimo = d;
            });
            return resultado;
        }

        distanciaDesde(lat, lng, minimo) {
            let mejor = null;
            let mejorDesvio = Infinity;
            for (let i = 1; i < this.puntos.length; i++) {
                if (this.acumuladas[i] < minimo) continue;
                const p = proyectarEnSegmento(this.puntos[i - 1], this.puntos[i], lat, lng);
                const d = this.acumuladas[i - 1] + p.fraccion * (this.acumuladas[i] - this.acumuladas[i - 1]);
                if (d + 1 < minimo) continue;
                if (p.desvio < mejorDesvio - 0.5) { mejorDesvio = p.desvio; mejor = d; }
            }
            return mejor ?? this.distanciaDe(lat, lng).distancia;
        }

        puntoEn(d) {
            const dist = Math.max(0, Math.min(this.longitud, d));
            for (let i = 1; i < this.puntos.length; i++) {
                if (this.acumuladas[i] >= dist) {
                    const tramo = this.acumuladas[i] - this.acumuladas[i - 1];
                    const t = tramo > 0 ? (dist - this.acumuladas[i - 1]) / tramo : 0;
                    const [alat, alng] = this.puntos[i - 1];
                    const [blat, blng] = this.puntos[i];
                    return [alat + (blat - alat) * t, alng + (blng - alng) * t];
                }
            }
            return this.puntos[this.puntos.length - 1];
        }
    }

    function geometria(rutaId) {
        if (!cacheGeometria.has(rutaId)) cacheGeometria.set(rutaId, new Geometria(rutaDe(rutaId)?.recorrido || []));
        return cacheGeometria.get(rutaId);
    }

    /* ---------------- Consultas básicas ---------------- */

    const lineaDe = (id) => bd.lineas.find((l) => l.id === id) || null;
    const usuarioDe = (id) => bd.usuarios.find((u) => u.id === id) || null;
    const paradaDe = (id) => bd.paradas.find((p) => p.id === id) || null;
    const rutaDe = (id) => bd.rutas.find((r) => r.id === id) || null;
    const vehiculoDe = (id) => bd.vehiculos.find((v) => v.id === id) || null;
    const choferDe = (id) => bd.choferes.find((c) => c.id === id) || null;

    const esRutaPublica = (r) => r.activa && !!lineaDe(r.linea_id)?.activa;

    function ordenRutas(a, b) {
        const na = /^\d+$/.test(a.codigo), nb = /^\d+$/.test(b.codigo);
        if (na !== nb) return na ? -1 : 1;
        if (na && Number(a.codigo) !== Number(b.codigo)) return Number(a.codigo) - Number(b.codigo);
        return a.codigo.localeCompare(b.codigo, 'es') || ORDEN_SENTIDO[a.sentido] - ORDEN_SENTIDO[b.sentido];
    }

    const conLinea = (r) => ({ ...r, linea: lineaDe(r.linea_id)?.nombre || '', total_paradas: r.paradas.length });

    function rutasPublicas(busqueda = '', lineaId = null) {
        return bd.rutas.filter(esRutaPublica)
            .filter((r) => !lineaId || r.linea_id === lineaId)
            .filter((r) => {
                if (!busqueda) return true;
                if (norm(r.codigo) === norm(busqueda)) return true;
                if ([r.nombre, r.origen, r.destino, lineaDe(r.linea_id)?.nombre].some((c) => contiene(c, busqueda))) return true;
                return r.paradas.some((id) => { const p = paradaDe(id); return p && (contiene(p.nombre, busqueda) || contiene(p.referencia, busqueda)); });
            })
            .sort(ordenRutas)
            .map(conLinea);
    }

    function rutaPublica(id) {
        const r = rutaDe(id);
        return r && esRutaPublica(r) ? conLinea(r) : null;
    }

    const paradasDeRuta = (rutaId) => (rutaDe(rutaId)?.paradas || [])
        .map((id, i) => { const p = paradaDe(id); return p ? { ...p, orden: i + 1 } : null; })
        .filter(Boolean);

    const idsParadasPublicas = () => new Set(bd.rutas.filter(esRutaPublica).flatMap((r) => r.paradas));
    const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es');

    function paradasPublicas(busqueda = '') {
        const publicas = idsParadasPublicas();
        const codigo = norm(busqueda.replace(/^#/, ''));
        return bd.paradas
            .filter((p) => p.activa && publicas.has(p.id))
            .filter((p) => !busqueda || norm(p.codigo) === codigo || contiene(p.nombre, busqueda) || contiene(p.referencia, busqueda))
            .sort(porNombre);
    }

    function paradaPublica(id) {
        const p = paradaDe(id);
        return p && p.activa ? p : null;
    }

    function paradasCercanas(lat, lng, radio, limite = 10) {
        const publicas = idsParadasPublicas();
        return bd.paradas
            .filter((p) => p.activa && publicas.has(p.id))
            .map((p) => ({ ...p, distancia_m: distancia(lat, lng, p.latitud, p.longitud) }))
            .filter((p) => p.distancia_m <= radio)
            .sort((a, b) => a.distancia_m - b.distancia_m)
            .slice(0, limite);
    }

    function paradasCoincidentes(texto, limite = 15) {
        const codigo = norm(texto.replace(/^#/, ''));
        const t = norm(texto);
        const puntaje = (p) => [norm(p.codigo) === codigo, norm(p.nombre) === t, norm(p.nombre).startsWith(t)];
        return bd.paradas
            .filter((p) => p.activa && (norm(p.codigo) === codigo || contiene(p.nombre, texto) || contiene(p.referencia, texto)))
            .sort((a, b) => {
                const pa = puntaje(a), pb = puntaje(b);
                for (let i = 0; i < pa.length; i++) if (pa[i] !== pb[i]) return pa[i] ? -1 : 1;
                return porNombre(a, b);
            })
            .slice(0, limite);
    }

    const rutasDeParada = (paradaId) => bd.rutas
        .filter((r) => esRutaPublica(r) && r.paradas.includes(paradaId))
        .sort(ordenRutas)
        .map((r) => ({ ...conLinea(r), orden: r.paradas.indexOf(paradaId) + 1 }));

    function porParadas(ids) {
        const agrupado = {};
        ids.forEach((id) => { agrupado[id] = rutasDeParada(id); });
        return agrupado;
    }

    function frecuentes(limite = 4) {
        return bd.paradas
            .filter((p) => p.activa)
            .map((p) => {
                const rutas = rutasDeParada(p.id);
                return {
                    id: p.id, codigo: p.codigo, nombre: p.nombre,
                    total_rutas: new Set(rutas.map((r) => r.codigo)).size,
                    con_avisos: rutas.some((r) => r.estado_servicio !== 'normal'),
                };
            })
            .filter((p) => p.total_rutas > 0)
            .sort((a, b) => b.total_rutas - a.total_rutas || porNombre(a, b))
            .slice(0, limite);
    }

    function conAvisos() {
        const prioridad = { suspendida: 0, con_retrasos: 1, normal: 2 };
        return bd.rutas
            .filter((r) => esRutaPublica(r) && (r.estado_servicio !== 'normal' || r.aviso))
            .sort((a, b) => prioridad[a.estado_servicio] - prioridad[b.estado_servicio] || a.codigo.localeCompare(b.codigo, 'es'));
    }

    /* ---------------- Viajes y ubicación de las unidades ---------------- */

    function viajeCompleto(v) {
        const r = rutaDe(v.ruta_id), veh = vehiculoDe(v.vehiculo_id), c = choferDe(v.chofer_id);
        if (!r || !veh || !c) return null;
        return {
            ...v,
            ruta_codigo: r.codigo, ruta_nombre: r.nombre, ruta_sentido: r.sentido, ruta_color: r.color, ruta_destino: r.destino,
            velocidad_promedio_kmh: r.velocidad_promedio_kmh,
            numero_unidad: veh.numero_unidad, placa: veh.placa, cuenta_con_gps: veh.cuenta_con_gps, linea_id: veh.linea_id,
            climatizado: veh.climatizado, tv_a_bordo: veh.tv_a_bordo, accesible: veh.accesible, vehiculo_activo: veh.activo,
            chofer_nombre: usuarioDe(c.usuario_id)?.nombre || '', linea_nombre: lineaDe(r.linea_id)?.nombre || '',
        };
    }

    const porUnidad = (a, b) => a.numero_unidad.localeCompare(b.numero_unidad, 'es', { numeric: true });
    const viajesEnCurso = () => bd.viajes.filter((v) => v.estado === 'en_curso').map(viajeCompleto).filter(Boolean);

    function enCursoPorRutas(ids) {
        const set = new Set(ids);
        return viajesEnCurso().filter((v) => set.has(v.ruta_id) && v.vehiculo_activo).sort(porUnidad);
    }

    const enCursoPorLineas = (lineas) => viajesEnCurso().filter((v) => !lineas || lineas.includes(v.linea_id)).sort(porUnidad);

    /**
     * DEMOSTRACIÓN: cada unidad con GPS avanza sobre el trazado de su ruta a la velocidad promedio,
     * a partir de la hora de inicio del viaje. La posición cambia en pasos fijos, como un GPS que reporta cada cierto tiempo.
     */
    function ubicaciones(viajes) {
        const ahora = Math.floor(Date.now() / 1000 / PASO_UBICACION_SEG) * PASO_UBICACION_SEG;
        const resultado = new Map();
        viajes.forEach((v) => {
            if (!v.cuenta_con_gps) return;
            const g = geometria(v.ruta_id);
            if (!g.esValida()) return;
            const factor = 0.9 + (v.vehiculo_id % 5) * 0.05;
            const metrosPorSeg = (v.velocidad_promedio_kmh / 3.6) * factor;
            const transcurrido = Math.max(0, ahora - v.inicio / 1000);
            const [lat, lng] = g.puntoEn((transcurrido * metrosPorSeg) % g.longitud);
            resultado.set(v.vehiculo_id, { latitud: Number(lat.toFixed(6)), longitud: Number(lng.toFixed(6)), actualizado_en: ahora });
        });
        return resultado;
    }

    const MARGEN_PASO_M = 30;
    const DISTANCIA_LLEGANDO_M = 120;

    /** Metros que faltan para llegar; null si la unidad ya pasó la parada (rutas que no son circuito). */
    function metrosRestantes(distVehiculo, distParada, longitud, sentido) {
        let restante = distParada - distVehiculo;
        if (restante < -MARGEN_PASO_M) {
            if (sentido !== 'circular') return null;
            restante += longitud;
        }
        return Math.max(0, restante);
    }

    const metrosPorMinuto = (kmh) => Math.max(1, (kmh * 1000) / 60);

    function proximaParada(viaje, lat, lng) {
        const g = geometria(viaje.ruta_id);
        if (!g.esValida()) return null;
        const paradas = paradasDeRuta(viaje.ruta_id);
        const distancias = g.distanciasDeParadas(paradas);
        const distVehiculo = g.distanciaDe(lat, lng).distancia;
        let mejor = null;
        paradas.forEach((p) => {
            const restante = metrosRestantes(distVehiculo, distancias[p.id], g.longitud, viaje.ruta_sentido);
            if (restante !== null && (!mejor || restante < mejor[1])) mejor = [p, restante];
        });
        if (!mejor) return null;
        return {
            nombre: mejor[0].nombre,
            texto: mejor[1] <= DISTANCIA_LLEGANDO_M ? 'Llegando' : formatoMinutosAprox(mejor[1] / metrosPorMinuto(viaje.velocidad_promedio_kmh)),
        };
    }

    function vehiculosConUbicacion(viajes, detalleGestion) {
        const pos = ubicaciones(viajes);
        const ahora = Math.floor(Date.now() / 1000);
        return viajes.map((v) => {
            const u = pos.get(v.vehiculo_id) || null;
            const item = {
                vehiculo_id: v.vehiculo_id, unidad: v.numero_unidad, linea: v.linea_nombre,
                ruta_id: v.ruta_id, ruta_codigo: v.ruta_codigo, ruta_nombre: v.ruta_nombre,
                ruta_sentido: textoSentido(v.ruta_sentido), ruta_color: v.ruta_color, destino: v.ruta_destino,
                con_ubicacion: !!u, latitud: u ? u.latitud : null, longitud: u ? u.longitud : null,
                actualizado_hace_seg: u ? Math.max(0, ahora - u.actualizado_en) : null,
                proxima_parada: u ? proximaParada(v, u.latitud, u.longitud) : null,
                chofer: v.chofer_nombre, hora_salida: formatoHora(v.inicio),
                pasajeros_salida: v.pasajeros_salida ?? null,
                climatizado: !!v.climatizado, tv_a_bordo: !!v.tv_a_bordo, accesible: !!v.accesible,
            };
            if (detalleGestion) {
                item.placa = v.placa;
                item.inicio = formatoFecha(v.inicio);
            }
            return item;
        });
    }

    /** Próximas llegadas a una parada, agrupadas por ruta. ETA = distancia sobre el recorrido ÷ velocidad promedio. */
    function llegadasAParada(paradaId, soloRutaId = null) {
        let rutas = rutasDeParada(paradaId);
        if (soloRutaId) rutas = rutas.filter((r) => r.id === soloRutaId);
        if (!rutas.length) return [];
        const viajes = enCursoPorRutas(rutas.map((r) => r.id));
        const pos = ubicaciones(viajes);
        const ahora = Math.floor(Date.now() / 1000);

        return rutas.map((ruta) => {
            const g = geometria(ruta.id);
            const distParadas = g.esValida() ? g.distanciasDeParadas(paradasDeRuta(ruta.id)) : {};
            const distParada = distParadas[paradaId] ?? null;
            const mpm = metrosPorMinuto(ruta.velocidad_promedio_kmh);
            const llegadas = [];
            let enCirculacion = 0;
            let sinUbicacion = 0;
            viajes.filter((v) => v.ruta_id === ruta.id).forEach((v) => {
                enCirculacion++;
                const u = pos.get(v.vehiculo_id);
                if (!u || distParada === null) { sinUbicacion++; return; }
                const restante = metrosRestantes(g.distanciaDe(u.latitud, u.longitud).distancia, distParada, g.longitud, ruta.sentido);
                if (restante === null) return;
                const minutos = restante / mpm;
                llegadas.push({
                    vehiculo_id: v.vehiculo_id, unidad: v.numero_unidad, minutos: Math.max(1, Math.round(minutos)),
                    texto: restante <= DISTANCIA_LLEGANDO_M ? 'Llegando' : formatoMinutosAprox(minutos),
                    distancia_m: Math.round(restante), actualizado_hace_seg: Math.max(0, ahora - u.actualizado_en),
                });
            });
            llegadas.sort((a, b) => a.distancia_m - b.distancia_m);
            return {
                ruta: {
                    id: ruta.id, codigo: ruta.codigo, nombre: ruta.nombre, sentido: textoSentido(ruta.sentido), destino: ruta.destino,
                    color: ruta.color, estado_servicio: ruta.estado_servicio, estado_texto: estadoInfo(ruta.estado_servicio).texto, aviso: ruta.aviso,
                },
                llegadas, en_circulacion: enCirculacion, sin_ubicacion: sinUbicacion,
            };
        });
    }

    /* ---------------- Detalle de ruta ---------------- */

    function detalleRuta(rutaId) {
        const ruta = rutaPublica(rutaId);
        if (!ruta) return null;
        const paradas = paradasDeRuta(rutaId);
        const g = geometria(rutaId);
        const mpm = metrosPorMinuto(ruta.velocidad_promedio_kmh);
        const distancias = g.esValida() ? g.distanciasDeParadas(paradas) : {};
        return {
            ruta: {
                id: ruta.id, codigo: ruta.codigo, nombre: ruta.nombre, linea: ruta.linea, origen: ruta.origen, destino: ruta.destino,
                sentido: textoSentido(ruta.sentido), es_circuito: ruta.sentido === 'circular', color: ruta.color,
                tarifa: ruta.tarifa, tarifa_texto: formatoTarifa(ruta.tarifa),
                longitud_texto: formatoDistancia(g.longitud), duracion_texto: formatoMinutosAprox(g.longitud / mpm),
                estado_servicio: ruta.estado_servicio, estado_texto: estadoInfo(ruta.estado_servicio).texto, aviso: ruta.aviso,
            },
            paradas: paradas.map((p) => ({
                id: p.id, codigo: p.codigo, nombre: p.nombre, referencia: p.referencia, latitud: p.latitud, longitud: p.longitud,
                orden: p.orden, minutos_desde_origen: Math.round((distancias[p.id] || 0) / mpm),
            })),
            recorrido: g.puntos,
        };
    }

    /* ---------------- Buscador: rutas directas y con un transbordo ---------------- */

    const VELOCIDAD_CAMINANDO_M_MIN = 75;
    const MINUTOS_TRANSBORDO = 8;
    const MAX_TRANSBORDOS = 3;

    function buscar(origen, destino, lat, lng, opciones = {}) {
        const sinResultados = (mensaje) => ({ resultados: [], mensaje });
        const usaUbicacion = Number.isFinite(lat) && Number.isFinite(lng);
        const hayOrigen = usaUbicacion || origen !== '';
        const hayDestino = destino !== '';
        if (!hayOrigen && !hayDestino) return sinResultados('Escribe un destino o un punto de partida para buscar rutas.');

        const datosRuta = new Map();
        function datos(rutaId) {
            if (datosRuta.has(rutaId)) return datosRuta.get(rutaId);
            const ruta = rutaPublica(rutaId);
            const paradas = ruta ? paradasDeRuta(rutaId) : [];
            const g = ruta ? geometria(rutaId) : null;
            const d = !ruta || !g.esValida() || paradas.length < 2 ? null : {
                ruta, paradas, porId: new Map(paradas.map((p) => [p.id, p])), dist: g.distanciasDeParadas(paradas),
                longitud: g.longitud, circuito: ruta.sentido === 'circular', mpm: metrosPorMinuto(ruta.velocidad_promedio_kmh),
            };
            datosRuta.set(rutaId, d);
            return d;
        }

        const paradasOrigen = new Map();
        if (usaUbicacion) {
            paradasCercanas(lat, lng, RADIO_CERCANIA_M, 12).forEach((p) => paradasOrigen.set(p.id, p.distancia_m));
            if (!paradasOrigen.size) return sinResultados(`No encontramos paradas a menos de ${formatoDistancia(RADIO_CERCANIA_M)} de tu ubicación.`);
        } else if (origen !== '') {
            paradasCoincidentes(origen).forEach((p) => paradasOrigen.set(p.id, null));
            if (!paradasOrigen.size) return sinResultados(`No encontramos paradas que coincidan con "${origen}". Prueba con otro nombre o usa tu ubicación.`);
        }
        const paradasDestino = [];
        if (hayDestino) {
            paradasCoincidentes(destino).forEach((p) => paradasDestino.push(p.id));
            if (!paradasDestino.length) return sinResultados(`No encontramos paradas que coincidan con "${destino}". Prueba con otro nombre o consulta la lista de paradas.`);
        }

        const lineasAccesibles = opciones.accesible ? new Set(lineasTotalmenteAccesibles()) : null;
        const permitida = (d) => !lineasAccesibles || lineasAccesibles.has(d.ruta.linea_id);
        const rutasDe = (ids) => [...new Set(ids.flatMap((id) => rutasDeParada(id).map((r) => r.id)))];
        const rutasOrigen = rutasDe([...paradasOrigen.keys()]);
        const rutasDestino = rutasDe(paradasDestino);

        function mejorTramo(d, subir, bajar) {
            let mejor = null;
            subir.forEach((caminar, idSubir) => {
                if (d.dist[idSubir] === undefined) return;
                bajar.forEach((idBajar) => {
                    if (idSubir === idBajar || d.dist[idBajar] === undefined) return;
                    let metros = d.dist[idBajar] - d.dist[idSubir];
                    if (metros <= 0) {
                        if (!d.circuito) return;
                        metros += d.longitud;
                    }
                    const minutos = metros / d.mpm;
                    const puntaje = minutos + (caminar ?? 0) / VELOCIDAD_CAMINANDO_M_MIN;
                    if (!mejor || puntaje < mejor.puntaje) {
                        mejor = { d, subir: d.porId.get(idSubir), bajar: d.porId.get(idBajar), minutos, caminar, puntaje };
                    }
                });
            });
            return mejor;
        }

        const paradasPrincipales = (paradas) => {
            const n = paradas.length;
            return [...new Set([0, Math.floor((n - 1) / 3), Math.floor((2 * (n - 1)) / 3), n - 1])].map((i) => paradas[i].nombre);
        };

        function opcion(tramos) {
            let minutos = 0;
            let tarifa = 0;
            let tarifaConocida = true;
            const salida = tramos.map((t) => {
                const { ruta, paradas } = t.d;
                minutos += t.minutos;
                if (ruta.tarifa === null) tarifaConocida = false; else tarifa += Number(ruta.tarifa);
                return {
                    ruta: {
                        id: ruta.id, codigo: ruta.codigo, nombre: ruta.nombre, linea: ruta.linea, origen: ruta.origen, destino: ruta.destino,
                        sentido: textoSentido(ruta.sentido), color: ruta.color, tarifa_texto: formatoTarifa(ruta.tarifa),
                        estado_servicio: ruta.estado_servicio, estado_texto: estadoInfo(ruta.estado_servicio).texto, aviso: ruta.aviso,
                    },
                    subir: { id: t.subir.id, nombre: t.subir.nombre },
                    bajar: { id: t.bajar.id, nombre: t.bajar.nombre },
                    minutos: t.minutos,
                    duracion_texto: formatoMinutosAprox(t.minutos),
                    paradas_intermedias: t.bajar.orden > t.subir.orden ? t.bajar.orden - t.subir.orden - 1 : paradas.length - t.subir.orden + t.bajar.orden - 1,
                    paradas_frecuentes: paradasPrincipales(paradas),
                };
            });
            const transbordos = tramos.length - 1;
            if (transbordos) minutos += MINUTOS_TRANSBORDO;
            const caminar = tramos[0].caminar;
            return {
                tipo: transbordos ? 'transbordo' : 'directa', transbordos, tramos: salida,
                caminar_texto: caminar !== null && caminar !== undefined ? `${formatoDistancia(caminar)} a pie hasta la parada` : null,
                minutos_total: minutos,
                duracion_total_texto: formatoMinutosAprox(minutos),
                tarifa_total_texto: tarifaConocida ? formatoTarifa(tarifa) : 'No disponible',
                puntaje: minutos + (caminar ?? 0) / VELOCIDAD_CAMINANDO_M_MIN,
            };
        }

        const resultados = [];
        const directas = new Set();
        [...new Set([...rutasOrigen, ...rutasDestino])].forEach((rutaId) => {
            const d = datos(rutaId);
            if (!d || !permitida(d)) return;
            const subir = hayOrigen ? paradasOrigen : new Map([[d.paradas[0].id, null]]);
            const bajar = hayDestino ? paradasDestino : [d.paradas[d.paradas.length - 1].id];
            const tramo = mejorTramo(d, subir, bajar);
            if (tramo) {
                directas.add(rutaId);
                resultados.push(opcion([tramo]));
            }
        });

        if (hayOrigen && hayDestino) {
            const transbordos = [];
            rutasOrigen.forEach((idA) => {
                const a = datos(idA);
                if (!a || directas.has(idA) || !permitida(a)) return;
                rutasDestino.forEach((idB) => {
                    const b = datos(idB);
                    if (!b || idA === idB || directas.has(idB) || !permitida(b)
                        || (a.ruta.codigo === b.ruta.codigo && a.ruta.linea_id === b.ruta.linea_id)) return;
                    let mejor = null;
                    Object.keys(a.dist).map(Number).filter((id) => b.dist[id] !== undefined).forEach((cambio) => {
                        const t1 = mejorTramo(a, paradasOrigen, [cambio]);
                        const t2 = t1 ? mejorTramo(b, new Map([[cambio, null]]), paradasDestino) : null;
                        if (t1 && t2) {
                            const total = t1.puntaje + t2.puntaje + MINUTOS_TRANSBORDO;
                            if (!mejor || total < mejor[2]) mejor = [t1, t2, total];
                        }
                    });
                    if (mejor) transbordos.push(opcion([mejor[0], mejor[1]]));
                });
            });
            transbordos.sort((x, y) => x.puntaje - y.puntaje);
            resultados.push(...transbordos.slice(0, MAX_TRANSBORDOS));
        }

        resultados.sort((x, y) => (opciones.menos_transbordos ? x.transbordos - y.transbordos : 0) || x.puntaje - y.puntaje);
        resultados.forEach((r) => delete r.puntaje);

        if (!resultados.length) {
            return sinResultados(opciones.accesible
                ? 'No encontramos rutas accesibles entre esos puntos. Quita el filtro "Accesible" para ver todas las opciones.'
                : 'No encontramos una ruta entre esos puntos, ni directa ni con un transbordo. Prueba con otra parada cercana o consulta el mapa.');
        }
        return { resultados, mensaje: null };
    }

    /** Líneas cuyas unidades activas son todas accesibles (y tienen al menos una). */
    function lineasTotalmenteAccesibles() {
        const porLinea = new Map();
        bd.vehiculos.filter((v) => v.activo).forEach((v) => porLinea.set(v.linea_id, (porLinea.get(v.linea_id) ?? true) && v.accesible));
        return [...porLinea].filter(([, todas]) => todas).map(([id]) => id);
    }

    /* ---------------- API (misma forma de respuesta que la versión con servidor) ---------------- */

    const formatoRutaParada = (r) => ({ id: r.id, codigo: r.codigo, nombre: r.nombre, destino: r.destino, sentido: textoSentido(r.sentido), color: r.color });
    const numero = (v) => (v === undefined || v === null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

    function error(mensaje) { return new Error(mensaje); }

    const endpoints = {
        rutas(p) {
            if (p.id !== undefined) {
                const d = detalleRuta(Number(p.id));
                if (!d) throw error('La ruta no existe o no está disponible.');
                return d;
            }
            return {
                rutas: rutasPublicas(limpiar(p.q, 80), numero(p.linea_id)).map((r) => ({
                    id: r.id, codigo: r.codigo, nombre: r.nombre, linea: r.linea, origen: r.origen, destino: r.destino,
                    sentido: textoSentido(r.sentido), color: r.color, tarifa_texto: formatoTarifa(r.tarifa),
                    total_paradas: r.total_paradas, estado_servicio: r.estado_servicio, estado_texto: estadoInfo(r.estado_servicio).texto,
                    aviso: r.aviso,
                })),
            };
        },

        paradas(p) {
            if (p.id !== undefined) {
                const parada = paradaPublica(Number(p.id));
                if (!parada) throw error('La parada no existe o no está disponible.');
                return { parada, rutas: rutasDeParada(parada.id).map(formatoRutaParada) };
            }
            const lat = numero(p.lat), lng = numero(p.lng);
            const lista = lat !== null && lng !== null
                ? paradasCercanas(lat, lng, Math.min(3000, Math.max(100, numero(p.radio) ?? RADIO_CERCANIA_M)), 15)
                : paradasPublicas(limpiar(p.q, 80));
            return {
                paradas: lista.map((x) => ({
                    id: x.id, codigo: x.codigo, nombre: x.nombre, referencia: x.referencia, latitud: x.latitud, longitud: x.longitud,
                    distancia_texto: x.distancia_m !== undefined ? formatoDistancia(x.distancia_m) : null,
                    rutas: rutasDeParada(x.id).map(formatoRutaParada),
                })),
            };
        },

        vehiculos(p) {
            let vehiculos;
            if (p.ambito === 'gestion') {
                const u = usuarioActual();
                if (!u || !['dueno', 'admin'].includes(u.rol)) throw error('Debes iniciar sesión.');
                vehiculos = vehiculosConUbicacion(enCursoPorLineas(alcance(u)), true);
            } else {
                const ids = String(p.rutas ?? '').split(',').map(Number).filter((n) => n > 0).slice(0, 50);
                if (!ids.length) throw error('Indica al menos una ruta.');
                vehiculos = vehiculosConUbicacion(enCursoPorRutas(ids), false);
            }
            return { vehiculos, datos_demostracion: true, consultado_en: Math.floor(Date.now() / 1000) };
        },

        eta(p) {
            const paradaId = numero(p.parada_id);
            if (!paradaId || !paradaPublica(paradaId)) throw error('La parada no existe o no está disponible.');
            return { rutas: llegadasAParada(paradaId, numero(p.ruta_id)), datos_demostracion: true };
        },

        buscar(p) {
            return buscar(limpiar(p.origen, 80), limpiar(p.destino, 80), numero(p.lat) ?? NaN, numero(p.lng) ?? NaN, {
                accesible: !!p.accesible, menos_transbordos: !!p.menos_transbordos,
            });
        },

        reportar(p) {
            const ahora = Date.now();
            let recientes = [];
            try { recientes = JSON.parse(sessionStorage.getItem(CLAVE_REPORTES)) || []; } catch (e) { recientes = []; }
            recientes = recientes.filter((t) => t > ahora - 3600 * 1000);
            if (recientes.length && Math.max(...recientes) > ahora - 60 * 1000) throw error('Ya enviaste un reporte hace un momento. Espera un minuto antes de enviar otro.');
            if (recientes.length >= 5) throw error('Alcanzaste el límite de reportes por hora. Si es una emergencia, llama al 911.');

            const rutaId = numero(p.ruta_id);
            const descripcion = limpiar(p.descripcion, 500);
            const errores = [];
            if (!rutaId || !rutaPublica(rutaId)) errores.push('Selecciona la ruta donde ocurrió el accidente.');
            if (descripcion.length < 10) errores.push('Describe brevemente qué pasó (al menos 10 caracteres).');
            if (errores.length) throw error(errores.join(' '));
            const lat = numero(p.lat), lng = numero(p.lng);
            const conUbicacion = lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

            bd.reportes.push({
                id: siguienteId(bd.reportes), ruta_id: rutaId, usuario_id: usuarioActual()?.id ?? null, descripcion,
                contacto: limpiar(p.contacto, 120) || null, latitud: conUbicacion ? lat : null, longitud: conUbicacion ? lng : null,
                estado: 'nuevo', creado_en: ahora, revisado_por: null, revisado_en: null,
            });
            guardar();
            recientes.push(ahora);
            sessionStorage.setItem(CLAVE_REPORTES, JSON.stringify(recientes));
            return { mensaje: 'Gracias. Tu reporte se envió a la línea de transporte. Si hay personas lesionadas, llama al 911.' };
        },
    };

    function api(endpoint, parametros = {}) {
        const fn = endpoints[endpoint];
        if (!fn) throw error('Consulta no disponible.');
        return fn(parametros);
    }

    /* ---------------- Sesión ---------------- */

    const sinPassword = ({ password, ...u }) => u;

    function usuarioActual() {
        const id = Number(localStorage.getItem(CLAVE_SESION));
        const u = id ? usuarioDe(id) : null;
        return u && u.activo ? sinPassword(u) : null;
    }

    const INTENTOS_MAXIMOS = 5;
    const BLOQUEO_SEG = 60;

    function iniciarSesion(email, password) {
        const control = JSON.parse(sessionStorage.getItem('moviruta.login') || '{"intentos":0,"hasta":0}');
        if (control.hasta > Date.now()) return `Demasiados intentos. Espera ${Math.ceil((control.hasta - Date.now()) / 1000)} segundos e intenta nuevamente.`;
        const u = bd.usuarios.find((x) => x.email === norm(email));
        if (!u || u.password !== password) {
            control.intentos++;
            if (control.intentos >= INTENTOS_MAXIMOS) { control.hasta = Date.now() + BLOQUEO_SEG * 1000; control.intentos = 0; }
            sessionStorage.setItem('moviruta.login', JSON.stringify(control));
            return 'Correo o contraseña incorrectos.';
        }
        if (!u.activo) return 'Tu cuenta está desactivada. Comunícate con el administrador.';
        sessionStorage.removeItem('moviruta.login');
        u.ultimo_acceso = Date.now();
        guardar();
        localStorage.setItem(CLAVE_SESION, String(u.id));
        return null;
    }

    function cerrarSesion() { localStorage.removeItem(CLAVE_SESION); }

    /** null = administrador (todas las líneas); arreglo de ids = líneas del dueño. */
    function alcance(usuario) {
        if (usuario.rol === 'admin') return null;
        return bd.lineas.filter((l) => l.dueno_id === usuario.id).map((l) => l.id);
    }

    /* ---------------- Historial del pasajero ---------------- */

    function registrarConsulta(rutaId, paradaId) {
        const u = usuarioActual();
        if (!u || u.rol !== 'pasajero') return;
        const reciente = bd.historial.some((h) => h.usuario_id === u.id && h.ruta_id === rutaId && h.parada_id === paradaId
            && h.consultado_en > Date.now() - 10 * MIN);
        if (reciente) return;
        bd.historial.push({ id: siguienteId(bd.historial), usuario_id: u.id, ruta_id: rutaId, parada_id: paradaId, consultado_en: Date.now() });
        guardar();
    }

    function historial(usuarioId, limite = 50) {
        return bd.historial
            .filter((h) => h.usuario_id === usuarioId)
            .sort((a, b) => b.consultado_en - a.consultado_en)
            .slice(0, limite)
            .map((h) => {
                const r = h.ruta_id ? rutaDe(h.ruta_id) : null;
                const p = h.parada_id ? paradaDe(h.parada_id) : null;
                return { ...h, ruta: r, parada: p };
            })
            .filter((h) => h.ruta || h.parada);
    }

    function borrarHistorial(usuarioId) {
        bd.historial = bd.historial.filter((h) => h.usuario_id !== usuarioId);
        guardar();
    }

    /* ---------------- Gestión (dueño de línea y administrador) ---------------- */

    const dentro = (lineaId, lineas) => lineaId > 0 && (lineas === null || lineas.includes(lineaId));
    const telefonoValido = (t) => t === '' || /^[0-9 +()\-]{7,30}$/.test(t);
    const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

    function lineas(ids = null, soloActivas = false) {
        return bd.lineas
            .filter((l) => (ids === null || ids.includes(l.id)) && (!soloActivas || l.activa))
            .map((l) => ({
                ...l, dueno_nombre: usuarioDe(l.dueno_id)?.nombre || null,
                total_rutas: bd.rutas.filter((r) => r.linea_id === l.id).length,
                total_vehiculos: bd.vehiculos.filter((v) => v.linea_id === l.id).length,
                total_choferes: bd.choferes.filter((c) => c.linea_id === l.id).length,
            }))
            .sort(porNombre);
    }

    function guardarLinea(id, d) {
        const datos = {
            nombre: limpiar(d.nombre, 120), descripcion: limpiar(d.descripcion, 255), telefono: limpiar(d.telefono, 30),
            dueno_id: numero(d.dueno_id), activa: !!d.activa,
        };
        const errores = [];
        if (datos.nombre.length < 3) errores.push('Escribe el nombre de la línea.');
        else if (bd.lineas.some((l) => norm(l.nombre) === norm(datos.nombre) && l.id !== id)) errores.push('Ya existe una línea con ese nombre.');
        if (!telefonoValido(datos.telefono)) errores.push('El teléfono no es válido.');
        if (datos.dueno_id !== null) {
            const dueno = usuarioDe(datos.dueno_id);
            if (!dueno || dueno.rol !== 'dueno' || !dueno.activo) errores.push('Selecciona un dueño de línea válido.');
        }
        if (errores.length) return { errores };
        const registro = { ...datos, descripcion: datos.descripcion || null, telefono: datos.telefono || null };
        if (id) Object.assign(lineaDe(id), registro);
        else bd.lineas.push({ id: siguienteId(bd.lineas), ...registro });
        guardar();
        return { errores: [] };
    }

    function usuarios(rol = null, busqueda = '') {
        return bd.usuarios
            .filter((u) => (!rol || u.rol === rol) && (!busqueda || contiene(u.nombre, busqueda) || contiene(u.email, busqueda)))
            .map(sinPassword)
            .sort(porNombre);
    }

    const ROLES_ASIGNABLES = ['pasajero', 'dueno', 'admin'];

    function guardarUsuario(id, d, actor) {
        const editado = id ? usuarioDe(id) : null;
        const esPropio = editado && editado.id === actor.id;
        const datos = {
            nombre: limpiar(d.nombre, 100), email: norm(limpiar(d.email, 150)), rol: d.rol, activo: !!d.activo,
        };
        const password = String(d.password || '');
        const errores = [];
        if (datos.nombre.length < 3) errores.push('Escribe el nombre completo.');
        if (!emailValido(datos.email)) errores.push('Escribe un correo electrónico válido.');
        else if (bd.usuarios.some((u) => u.email === datos.email && u.id !== id)) errores.push('Ese correo ya está registrado.');
        if (!ROLES_ASIGNABLES.includes(datos.rol)) errores.push('Selecciona un perfil válido.');
        if (!editado && password.length < 8) errores.push('La contraseña debe tener al menos 8 caracteres.');
        if (editado && password && password.length < 8) errores.push('La nueva contraseña debe tener al menos 8 caracteres.');
        if (esPropio && (datos.rol !== 'admin' || !datos.activo)) errores.push('No puedes quitarte el perfil de administrador ni desactivar tu propia cuenta.');
        if (editado && editado.rol === 'dueno' && datos.rol !== 'dueno' && bd.lineas.some((l) => l.dueno_id === editado.id)) {
            errores.push('Este usuario es dueño de una o más líneas. Reasigna esas líneas antes de cambiar su perfil.');
        }
        if (errores.length) return { errores };
        if (editado) {
            Object.assign(editado, datos);
            if (password) editado.password = password;
        } else {
            bd.usuarios.push({ id: siguienteId(bd.usuarios), ...datos, password, ultimo_acceso: null });
        }
        guardar();
        return { errores: [] };
    }

    function choferCompleto(c) {
        const u = usuarioDe(c.usuario_id);
        return {
            ...c, nombre: u?.nombre || '', email: u?.email || '', linea: lineaDe(c.linea_id)?.nombre || '',
            en_viaje: bd.viajes.some((v) => v.chofer_id === c.id && v.estado === 'en_curso'),
        };
    }

    const choferes = (ids) => bd.choferes.filter((c) => ids === null || ids.includes(c.linea_id)).map(choferCompleto).sort(porNombre);
    const choferPorId = (id) => { const c = choferDe(id); return c ? choferCompleto(c) : null; };
    const choferDeUsuario = (usuarioId) => { const c = bd.choferes.find((x) => x.usuario_id === usuarioId); return c ? choferCompleto(c) : null; };

    function guardarChofer(id, d, ids) {
        const chofer = id ? choferDe(id) : null;
        const datos = {
            nombre: limpiar(d.nombre, 100), email: norm(limpiar(d.email, 150)), password: String(d.password || ''),
            linea_id: numero(d.linea_id) || 0, numero_licencia: limpiar(d.numero_licencia, 30).toUpperCase(),
            telefono: limpiar(d.telefono, 30), activo: !!d.activo,
        };
        const usuarioId = chofer ? chofer.usuario_id : null;
        const errores = [];
        if (datos.nombre.length < 3) errores.push('Escribe el nombre completo del chofer.');
        if (!emailValido(datos.email)) errores.push('Escribe un correo electrónico válido.');
        else if (bd.usuarios.some((u) => u.email === datos.email && u.id !== usuarioId)) errores.push('Ese correo ya está registrado.');
        if (!chofer && datos.password.length < 8) errores.push('La contraseña debe tener al menos 8 caracteres.');
        if (chofer && datos.password && datos.password.length < 8) errores.push('La nueva contraseña debe tener al menos 8 caracteres.');
        if (!dentro(datos.linea_id, ids) || !lineaDe(datos.linea_id)) errores.push('Selecciona una línea válida.');
        if (!datos.numero_licencia) errores.push('Escribe el número de licencia.');
        else if (bd.choferes.some((c) => c.numero_licencia === datos.numero_licencia && c.id !== id)) errores.push('Ese número de licencia ya está registrado.');
        if (!telefonoValido(datos.telefono)) errores.push('El teléfono solo puede contener números, espacios y los signos + - ( ).');
        if (errores.length) return { errores };

        if (chofer) {
            const u = usuarioDe(chofer.usuario_id);
            Object.assign(u, { nombre: datos.nombre, email: datos.email, activo: datos.activo });
            if (datos.password) u.password = datos.password;
            Object.assign(chofer, { linea_id: datos.linea_id, numero_licencia: datos.numero_licencia, telefono: datos.telefono || null, activo: datos.activo });
        } else {
            const nuevoUsuario = { id: siguienteId(bd.usuarios), rol: 'chofer', nombre: datos.nombre, email: datos.email, password: datos.password, activo: datos.activo, ultimo_acceso: null };
            bd.usuarios.push(nuevoUsuario);
            bd.choferes.push({ id: siguienteId(bd.choferes), usuario_id: nuevoUsuario.id, linea_id: datos.linea_id, numero_licencia: datos.numero_licencia, telefono: datos.telefono || null, activo: datos.activo });
        }
        guardar();
        return { errores: [] };
    }

    const vehiculoOcupado = (id) => bd.viajes.some((v) => v.vehiculo_id === id && v.estado === 'en_curso');

    function vehiculos(ids) {
        return bd.vehiculos
            .filter((v) => ids === null || ids.includes(v.linea_id))
            .map((v) => {
                const viaje = bd.viajes.find((x) => x.vehiculo_id === v.id && x.estado === 'en_curso');
                return { ...v, linea: lineaDe(v.linea_id)?.nombre || '', ruta_en_curso: viaje ? rutaDe(viaje.ruta_id)?.codigo ?? null : null };
            })
            .sort((a, b) => a.linea.localeCompare(b.linea, 'es') || a.numero_unidad.localeCompare(b.numero_unidad, 'es', { numeric: true }));
    }

    const vehiculoPorId = (id) => vehiculoDe(id);

    function guardarVehiculo(id, d, ids) {
        const actual = id ? vehiculoDe(id) : null;
        const datos = {
            linea_id: numero(d.linea_id) || 0, numero_unidad: limpiar(d.numero_unidad, 20).toUpperCase(),
            placa: limpiar(d.placa, 15).toUpperCase(), modelo: limpiar(d.modelo, 80), capacidad: numero(d.capacidad),
            cuenta_con_gps: !!d.cuenta_con_gps, climatizado: !!d.climatizado, tv_a_bordo: !!d.tv_a_bordo,
            accesible: !!d.accesible, activo: !!d.activo,
        };
        const errores = [];
        if (!dentro(datos.linea_id, ids) || !lineaDe(datos.linea_id)) errores.push('Selecciona una línea válida.');
        if (!datos.numero_unidad) errores.push('Escribe el número de unidad.');
        else if (bd.vehiculos.some((v) => v.linea_id === datos.linea_id && v.numero_unidad === datos.numero_unidad && v.id !== id)) errores.push('Ese número de unidad ya existe en la línea.');
        if (!/^[A-Z0-9-]{4,15}$/.test(datos.placa)) errores.push('La placa debe tener de 4 a 15 letras, números o guiones.');
        else if (bd.vehiculos.some((v) => v.placa === datos.placa && v.id !== id)) errores.push('Esa placa ya está registrada.');
        if (datos.capacidad !== null && (datos.capacidad < 1 || datos.capacidad > 300)) errores.push('La capacidad debe estar entre 1 y 300 pasajeros.');
        if (actual && vehiculoOcupado(id) && (!datos.activo || datos.linea_id !== actual.linea_id)) {
            errores.push('El vehículo está en un viaje en curso; no puede desactivarse ni cambiar de línea hasta que termine.');
        }
        if (errores.length) return { errores };
        const registro = { ...datos, modelo: datos.modelo || null };
        if (actual) Object.assign(actual, registro);
        else bd.vehiculos.push({ id: siguienteId(bd.vehiculos), ...registro });
        guardar();
        return { errores: [] };
    }

    const rutasGestion = (ids) => bd.rutas
        .filter((r) => ids === null || ids.includes(r.linea_id))
        .map(conLinea)
        .sort((a, b) => a.linea.localeCompare(b.linea, 'es') || ordenRutas(a, b));

    const rutaPorId = (id) => { const r = rutaDe(id); return r ? conLinea(r) : null; };

    function guardarRuta(id, d, ids) {
        const datos = {
            linea_id: numero(d.linea_id) || 0, codigo: limpiar(d.codigo, 10).toUpperCase(), nombre: limpiar(d.nombre, 120),
            origen: limpiar(d.origen, 120), destino: limpiar(d.destino, 120), sentido: d.sentido, color: String(d.color || ''),
            tarifa: numero(d.tarifa), velocidad_promedio_kmh: numero(d.velocidad_promedio_kmh),
            estado_servicio: d.estado_servicio, aviso: limpiar(d.aviso, 255) || null, activa: !!d.activa,
            paradas: (d.paradas || []).map(Number).filter((pid) => paradaDe(pid)?.activa),
            recorrido: (d.recorrido || []).slice(0, 2000)
                .filter((p) => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
                .map(([lat, lng]) => [Number(lat.toFixed(6)), Number(lng.toFixed(6))]),
        };
        const errores = [];
        if (!dentro(datos.linea_id, ids) || !lineaDe(datos.linea_id)) errores.push('Selecciona una línea válida.');
        if (!/^[A-Z0-9-]{1,10}$/.test(datos.codigo)) errores.push('El número de ruta solo puede tener letras, números o guiones (máximo 10).');
        if (datos.nombre.length < 3) errores.push('Escribe el nombre de la ruta.');
        if (!datos.origen || !datos.destino) errores.push('Indica el origen y el destino.');
        if (!['ida', 'vuelta', 'circular'].includes(datos.sentido)) errores.push('Selecciona el sentido de circulación.');
        else if (!errores.length && bd.rutas.some((r) => r.linea_id === datos.linea_id && r.codigo === datos.codigo && r.sentido === datos.sentido && r.id !== id)) {
            errores.push('Ya existe una ruta con ese número y sentido en la línea.');
        }
        if (!/^#[0-9A-Fa-f]{6}$/.test(datos.color)) errores.push('Selecciona un color válido.');
        if (datos.tarifa !== null && (datos.tarifa < 0 || datos.tarifa > 9999)) errores.push('La tarifa no es válida.');
        if (datos.velocidad_promedio_kmh === null || datos.velocidad_promedio_kmh < 5 || datos.velocidad_promedio_kmh > 80) errores.push('La velocidad promedio debe estar entre 5 y 80 km/h.');
        if (!['normal', 'con_retrasos', 'suspendida'].includes(datos.estado_servicio)) errores.push('Selecciona el estado del servicio.');
        if (datos.paradas.length < 2) errores.push('Agrega al menos dos paradas activas en el orden del recorrido.');
        if (datos.recorrido.length < 2) errores.push('Dibuja el trazado de la ruta en el mapa (al menos dos puntos).');
        if (errores.length) return { errores };
        if (id) Object.assign(rutaDe(id), datos);
        else bd.rutas.push({ id: siguienteId(bd.rutas), ...datos });
        guardar();
        return { errores: [] };
    }

    const paradasTodas = () => bd.paradas
        .map((p) => ({ ...p, total_rutas: bd.rutas.filter((r) => r.paradas.includes(p.id)).length }))
        .sort(porNombre);

    function guardarParada(id, d, puedeEditar) {
        const datos = {
            codigo: limpiar(d.codigo, 11).replace(/^#/, '').toUpperCase(), nombre: limpiar(d.nombre, 120),
            referencia: limpiar(d.referencia, 255), latitud: numero(d.latitud), longitud: numero(d.longitud),
            activa: puedeEditar ? !!d.activa : true,
        };
        const errores = [];
        if (id && !puedeEditar) errores.push('Solo el administrador general puede modificar paradas existentes.');
        if (datos.codigo && !/^[A-Z0-9-]{1,10}$/.test(datos.codigo)) errores.push('El código de la parada solo puede tener letras, números o guiones (máximo 10).');
        else if (datos.codigo && bd.paradas.some((p) => p.codigo === datos.codigo && p.id !== id)) errores.push('Ese código ya lo tiene otra parada.');
        if (datos.nombre.length < 3) errores.push('Escribe el nombre de la parada.');
        if (datos.latitud === null || datos.longitud === null || Math.abs(datos.latitud) > 90 || Math.abs(datos.longitud) > 180) errores.push('Marca la ubicación de la parada en el mapa.');
        if (errores.length) return { errores };
        const registro = { ...datos, codigo: datos.codigo || null, referencia: datos.referencia || null };
        if (id) Object.assign(paradaDe(id), registro);
        else bd.paradas.push({ id: siguienteId(bd.paradas), ...registro });
        guardar();
        return { errores: [] };
    }

    function reportes(ids, estado = null) {
        return bd.reportes
            .map((r) => {
                const ruta = rutaDe(r.ruta_id);
                return ruta ? {
                    ...r, ruta_codigo: ruta.codigo, ruta_nombre: ruta.nombre, ruta_sentido: ruta.sentido, ruta_color: ruta.color,
                    linea_id: ruta.linea_id, linea: lineaDe(ruta.linea_id)?.nombre || '',
                    reportado_por: usuarioDe(r.usuario_id)?.nombre || null, revisor: usuarioDe(r.revisado_por)?.nombre || null,
                } : null;
            })
            .filter((r) => r && (ids === null || ids.includes(r.linea_id)) && (!estado || r.estado === estado))
            .sort((a, b) => (b.estado === 'nuevo') - (a.estado === 'nuevo') || b.creado_en - a.creado_en);
    }

    function marcarRevisado(id, usuario, ids) {
        const r = bd.reportes.find((x) => x.id === id);
        const ruta = r && rutaDe(r.ruta_id);
        if (!r || !ruta || !dentro(ruta.linea_id, ids) || r.estado !== 'nuevo') return false;
        Object.assign(r, { estado: 'revisado', revisado_por: usuario.id, revisado_en: Date.now() });
        guardar();
        return true;
    }

    /* ---------------- Chofer ---------------- */

    function viajeEnCursoDeChofer(choferId) {
        const v = bd.viajes.filter((x) => x.chofer_id === choferId && x.estado === 'en_curso').sort((a, b) => b.inicio - a.inicio)[0];
        return v ? viajeCompleto(v) : null;
    }

    function historialChofer(choferId, desde, hasta) {
        const inicio = new Date(`${desde}T00:00:00`).getTime();
        const fin = new Date(`${hasta}T00:00:00`).getTime() + 24 * 60 * MIN;
        return bd.viajes
            .filter((v) => v.chofer_id === choferId && v.inicio >= inicio && v.inicio < fin)
            .map(viajeCompleto).filter(Boolean)
            .sort((a, b) => b.inicio - a.inicio);
    }

    const vehiculosDisponibles = (lineaId) => bd.vehiculos
        .filter((v) => v.linea_id === lineaId && v.activo && !vehiculoOcupado(v.id))
        .sort((a, b) => a.numero_unidad.localeCompare(b.numero_unidad, 'es', { numeric: true }));

    function iniciarViaje(chofer, d) {
        const rutaId = numero(d.ruta_id), vehiculoId = numero(d.vehiculo_id), pasajeros = numero(d.pasajeros_salida);
        const ruta = rutaId ? rutaDe(rutaId) : null;
        const vehiculo = vehiculoId ? vehiculoDe(vehiculoId) : null;
        const errores = [];
        if (viajeEnCursoDeChofer(chofer.id)) errores.push('Ya tienes un viaje en curso. Finalízalo antes de iniciar otro.');
        if (!chofer.activo) errores.push('Tu registro de chofer está inactivo. Comunícate con el dueño de tu línea.');
        if (!ruta || ruta.linea_id !== chofer.linea_id || !ruta.activa) errores.push('Selecciona una ruta activa de tu línea.');
        if (!vehiculo || vehiculo.linea_id !== chofer.linea_id || !vehiculo.activo) errores.push('Selecciona un vehículo activo de tu línea.');
        else if (vehiculoOcupado(vehiculoId)) errores.push('Ese vehículo ya está en un viaje en curso. Elige otro.');
        const max = vehiculo?.capacidad || 300;
        if (pasajeros === null || !Number.isInteger(pasajeros) || pasajeros < 0 || pasajeros > max) errores.push(`Escribe cuántos pasajeros llevas al salir (de 0 a ${max}).`);
        if (errores.length) return { errores };
        bd.viajes.push({ id: siguienteId(bd.viajes), chofer_id: chofer.id, vehiculo_id: vehiculoId, ruta_id: rutaId, inicio: Date.now(), fin: null, pasajeros_salida: pasajeros, estado: 'en_curso' });
        guardar();
        return { errores: [] };
    }

    function finalizarViaje(viajeId, choferId) {
        const v = bd.viajes.find((x) => x.id === viajeId && x.chofer_id === choferId && x.estado === 'en_curso');
        if (!v) return false;
        Object.assign(v, { estado: 'finalizado', fin: Date.now() });
        guardar();
        return true;
    }

    /* ---------------- Resúmenes ---------------- */

    function contarPorRol() {
        const conteo = {};
        bd.usuarios.forEach((u) => { conteo[u.rol] = (conteo[u.rol] || 0) + 1; });
        return conteo;
    }

    const contarEnCurso = (ids = null) => enCursoPorLineas(ids).length;
    const contarParadasActivas = () => bd.paradas.filter((p) => p.activa).length;
    const telefonosLineas = () => bd.lineas.filter((l) => l.activa && l.telefono).sort(porNombre);

    return {
        ROLES, PANELES,
        api, reiniciarDemo,
        texto: { norm, textoSentido, estadoInfo, formatoTarifa, formatoDistancia, formatoMinutosAprox, formatoFecha, formatoHora, hora24, formatoDuracion, fechaISO },
        consulta: { rutasPublicas, rutaPublica, paradasPublicas, paradaPublica, rutasDeParada, porParadas, frecuentes, conAvisos, detalleRuta, lineasTotalmenteAccesibles, telefonosLineas },
        sesion: { usuarioActual, iniciarSesion, cerrarSesion, alcance },
        historial: { registrar: registrarConsulta, listar: historial, borrar: borrarHistorial },
        gestion: {
            lineas, guardarLinea, usuarios, guardarUsuario, ROLES_ASIGNABLES,
            choferes, choferPorId, guardarChofer, vehiculos, vehiculoPorId, guardarVehiculo, vehiculoOcupado,
            rutasGestion, rutaPorId, paradasDeRuta, guardarRuta, paradasTodas, paradaDe, guardarParada,
            reportes, marcarRevisado, contarPorRol, contarEnCurso, contarParadasActivas,
        },
        chofer: { deUsuario: choferDeUsuario, viajeEnCurso: viajeEnCursoDeChofer, historial: historialChofer, vehiculosDisponibles, iniciarViaje, finalizarViaje },
    };
})();
