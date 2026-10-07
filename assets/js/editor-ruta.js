/** Editor de rutas (dueño/administrador): paradas en orden y trazado dibujado sobre el mapa. */
(() => {
    const datos = JSON.parse(document.getElementById('datosEditor').textContent);
    const porId = new Map(datos.paradasDisponibles.map((p) => [p.id, p]));
    let seleccion = datos.paradas.filter((id) => porId.has(id));
    let puntos = datos.recorrido.slice();
    let dibujando = false;

    const mapa = MR.crearMapa('mapa');
    const inputColor = document.getElementById('color');
    const lista = document.getElementById('listaSeleccion');
    const sinParadas = document.getElementById('sinParadas');
    const selector = document.getElementById('selectorParada');
    const btnDibujar = document.getElementById('btnDibujar');
    const totalPuntos = document.getElementById('totalPuntos');
    const marcadores = new Map();
    const linea = L.polyline(puntos, { color: inputColor.value, weight: 5, opacity: 0.85 }).addTo(mapa);
    const vertices = L.layerGroup().addTo(mapa);

    datos.paradasDisponibles.forEach((p) => {
        const m = L.marker([p.latitud, p.longitud], { icon: MR.iconoParada('#94A3B8'), title: p.nombre })
            .bindTooltip(p.nombre)
            .on('click', () => {
                if (dibujando) { puntos.push([p.latitud, p.longitud]); renderTrazado(); return; }
                if (!seleccion.includes(p.id)) { seleccion.push(p.id); renderParadas(); }
            })
            .addTo(mapa);
        marcadores.set(p.id, m);
    });

    function renderParadas() {
        sinParadas.classList.toggle('d-none', seleccion.length > 0);
        lista.innerHTML = seleccion.map((id, i) => `
            <li class="list-group-item">
                <span class="flex-grow-1 small fw-semibold">${MR.esc(porId.get(id).nombre)}</span>
                <button type="button" class="btn btn-sm btn-light" data-mover="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir"><i class="bi bi-arrow-up"></i></button>
                <button type="button" class="btn btn-sm btn-light" data-mover="${i}" data-dir="1" ${i === seleccion.length - 1 ? 'disabled' : ''} aria-label="Bajar"><i class="bi bi-arrow-down"></i></button>
                <button type="button" class="btn btn-sm btn-light text-danger" data-quitar="${i}" aria-label="Quitar"><i class="bi bi-x-lg"></i></button>
            </li>`).join('');
        marcadores.forEach((m, id) => {
            const orden = seleccion.indexOf(id);
            m.setIcon(MR.iconoParada(orden >= 0 ? inputColor.value : '#94A3B8', orden >= 0));
            m.setTooltipContent(orden >= 0 ? `${orden + 1}. ${porId.get(id).nombre}` : porId.get(id).nombre);
        });
    }

    function renderTrazado() {
        linea.setLatLngs(puntos);
        linea.setStyle({ color: inputColor.value });
        vertices.clearLayers();
        if (dibujando) {
            puntos.forEach((p) => L.circleMarker(p, { radius: 4, color: '#065F46', weight: 2, fillColor: '#fff', fillOpacity: 1 }).addTo(vertices));
        }
        totalPuntos.textContent = puntos.length ? `Puntos del trazado: ${puntos.length}.` : '';
    }

    lista.addEventListener('click', (e) => {
        const mover = e.target.closest('[data-mover]');
        const quitar = e.target.closest('[data-quitar]');
        if (mover) {
            const i = Number(mover.dataset.mover);
            const j = i + Number(mover.dataset.dir);
            [seleccion[i], seleccion[j]] = [seleccion[j], seleccion[i]];
        } else if (quitar) {
            seleccion.splice(Number(quitar.dataset.quitar), 1);
        } else return;
        renderParadas();
    });

    document.getElementById('btnAgregarParada').addEventListener('click', () => {
        const id = Number(selector.value);
        if (id && !seleccion.includes(id)) { seleccion.push(id); renderParadas(); }
        selector.value = '';
    });

    btnDibujar.addEventListener('click', () => {
        dibujando = !dibujando;
        btnDibujar.classList.toggle('active', dibujando);
        btnDibujar.querySelector('span').textContent = dibujando ? 'Terminar de dibujar' : 'Dibujar trazado';
        mapa.getContainer().style.cursor = dibujando ? 'crosshair' : '';
        renderTrazado();
    });

    mapa.on('click', (e) => {
        if (!dibujando) return;
        puntos.push([Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))]);
        renderTrazado();
    });

    document.getElementById('btnDeshacer').addEventListener('click', () => { puntos.pop(); renderTrazado(); });
    document.getElementById('btnBorrarTrazado').addEventListener('click', () => {
        if (!puntos.length || confirm('¿Borrar todo el trazado?')) { puntos = []; renderTrazado(); }
    });
    document.getElementById('btnDesdeParadas').addEventListener('click', () => {
        if (seleccion.length < 2) { alert('Agrega al menos dos paradas para generar el trazado.'); return; }
        if (puntos.length && !confirm('Se reemplazará el trazado actual por líneas rectas entre las paradas. ¿Continuar?')) return;
        puntos = seleccion.map((id) => [porId.get(id).latitud, porId.get(id).longitud]);
        if (document.getElementById('sentido').value === 'circular') puntos.push(puntos[0]);
        renderTrazado();
    });

    inputColor.addEventListener('input', () => { renderParadas(); renderTrazado(); });

    document.getElementById('formRuta').addEventListener('submit', (e) => {
        if (seleccion.length < 2 || puntos.length < 2) {
            e.preventDefault();
            alert('La ruta necesita al menos dos paradas y un trazado en el mapa.');
            return;
        }
        document.getElementById('paradas_json').value = JSON.stringify(seleccion);
        document.getElementById('recorrido_json').value = JSON.stringify(puntos);
    });

    renderParadas();
    renderTrazado();
    if (puntos.length > 1) mapa.fitBounds(linea.getBounds(), { padding: [30, 30] });
    else if (datos.paradasDisponibles.length) mapa.fitBounds(L.latLngBounds(datos.paradasDisponibles.map((p) => [p.latitud, p.longitud])), { padding: [30, 30] });
})();
