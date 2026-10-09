# MoviRuta

**Movilidad + Ruta.** Sistema web de consulta y seguimiento del transporte público: rutas, paradas, vehículos, ubicación y tiempo estimado de llegada (ETA), con cuatro perfiles: pasajero, chofer, dueño de línea y administrador general.

Stack: HTML5 · Tailwind CSS (CDN) · JavaScript sin frameworks · Leaflet.js con mosaicos de Google Maps. **No necesita servidor, PHP ni base de datos.**

---

## Cómo abrirlo

- **Doble clic** en `index.html` (recomendado con Chrome o Edge).
- O con un servidor estático, que es lo más fiel a un despliegue real:
  - Extensión *Live Server* de VS Code / Cursor: clic derecho en `index.html` → *Open with Live Server*.
  - Python: `python -m http.server 5173` y abrir `http://127.0.0.1:5173/`.
  - Apache (XAMPP/WAMP): copiar la carpeta a `htdocs`/`www`; el `.htaccess` ya usa `index.html` como portada.

Se necesita conexión a internet para Tailwind, Leaflet y los mosaicos del mapa. Las fuentes (Inter y Material Symbols) están incluidas en `assets/fuentes/`.

> Firefox aísla `localStorage` y las fuentes cuando se abren archivos con `file://`; si algo se ve raro o se pierde la sesión al cambiar de página, usa un servidor estático o Chrome/Edge.

### Instalar en el celular (app web)

MoviRuta se puede agregar a la pantalla de inicio y abre a pantalla completa con su propio ícono (`manifest.webmanifest` e íconos en `assets/img/`). Tiene que estar publicado en una dirección **https** (por ejemplo GitHub Pages, Netlify o Vercel); con doble clic (`file://`) no aparece la opción.

- **Android (Chrome):** menú ⋮ → *Agregar a la pantalla principal* / *Instalar app*.
- **iPhone (Safari):** botón Compartir → *Agregar a inicio*.

### Cuentas de demostración

Contraseña de todas: `moviruta123` (en *Iniciar sesión* hay botones para entrar con un clic).

| Perfil | Correo |
|---|---|
| Administrador general | admin@moviruta.local |
| Dueño de línea (Transportes Urbanos del Centro) | dueno.centro@moviruta.local |
| Dueño de línea (Autotransportes Grijalva) | dueno.grijalva@moviruta.local |
| Dueño de línea (Transportes Costa Paraíso) | dueno.paraiso@moviruta.local |
| Chofer sin viaje en curso | chofer.juan@moviruta.local |
| Chofer con viaje en curso (urbano) | chofer.maria@moviruta.local |
| Chofer con viaje en curso (foráneo, Paraíso – Villahermosa) | chofer.javier@moviruta.local |
| Pasajero | pasajero@moviruta.local |

> Los datos incluidos son **ficticios** y solo sirven para demostrar el sistema: rutas urbanas en Villahermosa (Transportes Urbanos del Centro y Autotransportes Grijalva) y rutas foráneas desde Paraíso, Tabasco (Transportes Costa Paraíso). Las paradas y trazados siguen calles y carreteras reales de OpenStreetMap.

### Dónde se guardan los datos

- Los datos iniciales están en `assets/js/datos.js` (`window.MR_DATOS_DEMO`).
- Al abrir el sitio por primera vez se copian a `localStorage` (clave `moviruta.bd`); a partir de ahí, todo lo que se crea o edita en los paneles (líneas, rutas, paradas, viajes, reportes…) se guarda **solo en ese navegador**.
- La sesión vive en `localStorage` (`moviruta.sesion`), así que se comparte entre pestañas; cerrar sesión en una la cierra en todas.
- **Restablecer la demo:** botón *Restablecer datos de demostración* en el pie de página (o borrar los datos del sitio en el navegador).

Como no hay servidor, el inicio de sesión y los permisos son una **simulación** para la demo: sirven para la navegación y la experiencia de uso, pero no protegen nada. Para un despliegue real se necesitaría un backend que valide la sesión y los permisos.

---

## Páginas

```text
Inicio · Rutas · Paradas · Mapa · Iniciar sesión
                                     └── Identificación del rol
                                          ├── Pasajero        → panel, historial
                                          ├── Chofer          → perfil, iniciar viaje (con pasajeros al salir), viaje actual, historial
                                          ├── Dueño de línea  → choferes, vehículos, rutas, paradas, ubicación, reportes (solo su línea)
                                          └── Administrador   → líneas, usuarios, choferes, vehículos, rutas, paradas, ubicación, reportes
```

Si alguien abre un panel sin sesión, se le envía a *Iniciar sesión* y luego regresa a la página que pidió. Si abre el panel de otro perfil, se le lleva al suyo.

### Portada

- **Planificador**: origen (texto o "Mi ubicación actual") y destino. Encuentra rutas directas y opciones con **un transbordo** (suma los tiempos de cada tramo más 8 min de cambio de unidad, y las tarifas de cada ruta). Opciones **Accesible 100%** y **Menos transbordos**.
- **Resultados**: chips *Todas / Transporte Directo / Transbordos*, itinerario por tramos y tiempo aproximado de llegada a la parada donde se sube.
- **Localizar parada** por código de poste (`#108`) o por nombre.
- **Mapa**: recorrido de la opción elegida, unidades en movimiento, ficha de la unidad y la próxima parada.
- **Estado del servicio**: avisos de rutas con retrasos o suspendidas.
- **Reportar accidente**: ruta, descripción, contacto y ubicación opcionales (máximo uno por minuto y cinco por hora por pestaña). El dueño de la línea y el administrador los revisan en *Reportes de accidentes*.
- **Descargar Mapa PDF** y **Horarios imprimibles**: usan la impresión del navegador ("Guardar como PDF").

### Paneles de gestión

- **Editor de rutas**: datos de la ruta, paradas en orden (agregar desde la lista o haciendo clic en el mapa, reordenar arrastrando o con flechas) y trazado dibujado sobre el mapa (o generado uniendo las paradas).
- **Editor de paradas**: se coloca con un clic en el mapa y el marcador se puede arrastrar. El dueño de línea puede registrar paradas nuevas; solo el administrador modifica las existentes.
- **Ubicación de vehículos**: flota de la línea (o de todas, para el administrador) en el mapa en tiempo real.

---

## Estructura

```text
MoviRuta/
├── index.html, rutas.html, ruta.html, paradas.html, parada.html, mapa.html   Consulta pública
├── login.html                                                               Iniciar sesión
├── manifest.webmanifest                                                     App web instalable (nombre, colores e íconos)
├── pasajero/  chofer/  dueno/  admin/                                       Panel de cada perfil
└── assets/
    ├── css/moviruta.css        Estilos propios y animaciones (sobre Tailwind)
    ├── fuentes/                Inter y Material Symbols
    ├── img/                    Logo, favicon e íconos de la app
    └── js/
        ├── tailwind-config.js  Paleta, tipografía y espaciados del diseño
        ├── datos.js            Datos de demostración
        ├── servicios.js        "Backend" simulado: datos en localStorage, sesión, búsqueda, ETA, gestión
        ├── moviruta.js         Utilidades comunes y mapas (Leaflet)
        ├── interfaz.js         Encabezado, menú, pie, panel lateral, avisos, diálogos y animaciones
        ├── panel.js            Formularios, tablas y utilidades de los paneles
        ├── inicio.js, rutas.js, ruta.js, paradas.js, parada.js, mapa.js, login.js   Páginas públicas
        └── pasajero.js, chofer.js, gestion.js (dueño y administrador)              Paneles
```

Orden de carga de los scripts: `tailwind-config.js` → `datos.js` → `servicios.js` → `moviruta.js` → `interfaz.js` → (`panel.js` en los paneles) → script de la página.

## Ubicación de vehículos y ETA

- Las unidades en circulación se **simulan** moviéndose sobre su recorrido a la velocidad promedio de la ruta; la interfaz lo indica con la etiqueta "Ubicaciones de demostración". Cuando un chofer inicia un viaje, su unidad aparece en el mapa; al finalizarlo, desaparece y el viaje pasa a su historial.
- ETA = distancia que falta sobre el recorrido hasta la parada ÷ velocidad promedio de la ruta. Se muestra como "Aprox. X min" (o "Aprox. X h Y min" en trayectos foráneos).
- La información se actualiza cada 10 segundos sin recargar la página y se pausa cuando la pestaña no está visible.

## Mapa

Leaflet con mosaicos de Google (Mapa y Satélite) cargados directamente desde sus servidores, sin clave de API. Las condiciones de uso de Google piden usar su API oficial, así que para un despliegue público conviene cambiar a OpenStreetMap o contratar la API.

---

La versión anterior en PHP + MySQL sigue disponible en el historial de git.
