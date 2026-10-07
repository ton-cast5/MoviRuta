# MoviRuta

**Movilidad + Ruta.** Sistema web de consulta y seguimiento del transporte público: rutas, paradas, vehículos, ubicación y tiempo estimado de llegada (ETA), con cuatro perfiles: pasajero, chofer, dueño de línea y administrador general.

Stack: HTML5, CSS3, JavaScript, Bootstrap 5 · PHP 8.1+ · Apache (XAMPP/WAMP) · MySQL 8 · Leaflet.js con mosaicos de Google Maps u OpenStreetMap.

---

## Instalación (XAMPP o WAMP)

1. Copia la carpeta `MoviRuta` dentro de `htdocs` (XAMPP) o `www` (WAMP).
2. Importa la base de datos desde MySQL Workbench o phpMyAdmin, en este orden:
   - `database/moviruta.sql` (esquema)
   - `database/datos_demo.sql` (datos de demostración)
3. Copia `config/config.local.example.php` como `config/config.local.php` y ajusta usuario, contraseña y puerto de MySQL.
4. Abre `http://localhost/MoviRuta/`.

Sin Apache también puede probarse con el servidor de PHP: `php -S 127.0.0.1:8090 -t .` (en ese modo no se aplican los `.htaccess`).

### Cuentas de demostración

Contraseña de todas: `moviruta123`

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

> Los datos incluidos son **ficticios** y solo sirven para demostrar el sistema: rutas urbanas en Villahermosa (líneas Transportes Urbanos del Centro y Autotransportes Grijalva) y rutas foráneas desde Paraíso, Tabasco (línea Transportes Costa Paraíso: Paraíso – Villahermosa por Comalcalco, Jalpa de Méndez y Nacajuca, y Paraíso – La Isla). Las paradas y trazados siguen calles y carreteras reales de OpenStreetMap.

### Mapa

`MAPA_MOSAICOS` en `config/config.local.php` elige el fondo del mapa: `'google'` (predeterminado) u `'osm'` (OpenStreetMap). Con `'google'` los mapas imitan la interfaz de Google Maps (zoom abajo a la derecha, miniatura para cambiar entre **Mapa** y **Satélite**, ventanas emergentes y atribución al estilo de Google, y mosaicos en alta resolución en pantallas retina). Leaflet sigue siendo la librería del mapa en ambos casos. Los mosaicos de Google se cargan directamente desde sus servidores sin clave de API; las condiciones de uso de Google piden usar su API oficial, así que para un despliegue público conviene cambiar a `'osm'` o contratar la API.

### Portada

- **Planificador**: origen (texto o "Mi ubicación actual") y destino. Encuentra rutas directas y opciones con **un transbordo** (se suman los tiempos de cada tramo más 8 min de cambio de unidad, y las tarifas de cada ruta). Opciones: **Accesible 100%** (solo líneas cuyas unidades activas son todas accesibles) y **Menos transbordos** (primero las directas).
- **Resultados**: chips *Todas / Transporte Directo / Transbordos*, itinerario por tramos y tiempo aproximado de llegada a la parada donde se sube.
- **Localizar parada** por código de poste (`#108`) o por nombre.
- **Mapa**: recorrido de la opción elegida (pin rojo en el destino), ficha de la unidad (chofer, hora de salida, pasajeros al salir, climatizado, TV a bordo, accesible) y widget inferior con la próxima parada.
- **Reportar accidente**: cualquier persona puede enviar un reporte (ruta, descripción, contacto y ubicación opcionales; máximo uno por minuto y cinco por hora por sesión). El dueño de la línea y el administrador los revisan en *Reportes de accidentes*.
- **Descargar Mapa PDF**: abre la impresión del navegador mostrando solo el mapa; desde ahí se elige "Guardar como PDF".

---

## Estructura

```text
MoviRuta/
├── index.php, rutas.php, ruta.php, paradas.php, parada.php, mapa.php   Consulta pública
├── login.php, logout.php                                               Autenticación
├── pasajero/  chofer/  dueno/  admin/                                  Panel de cada perfil
├── api/                       Endpoints JSON (lectura; reportar.php recibe reportes por POST)
├── controllers/               Gestión compartida dueño/admin (choferes, vehículos, rutas, paradas)
├── models/                    Acceso a datos (PDO, consultas preparadas)
├── services/                  Lógica: geometría del recorrido, ETA, búsqueda, fuentes de ubicación
├── views/                     Layout, parciales y vistas de gestión
├── includes/                  Arranque, sesión, permisos y utilidades
├── config/                    Configuración y conexión a MySQL
├── assets/css, js, img        Recursos del frontend
└── database/                  Esquema y datos de demostración
```

## Navegación (jerárquica)

```text
Inicio · Rutas · Paradas · Mapa · Iniciar sesión
                                     └── Identificación del rol
                                          ├── Pasajero        → panel, historial
                                          ├── Chofer          → perfil, iniciar viaje (con pasajeros al salir), viaje actual, historial
                                          ├── Dueño de línea  → choferes, vehículos, rutas, paradas, ubicación, reportes (solo su línea)
                                          └── Administrador   → líneas, usuarios, choferes, vehículos, rutas, paradas, ubicación, reportes
```

Los permisos se validan en el servidor en cada página (`requiere_rol()`), y el dueño de línea solo puede leer o modificar registros cuya línea le pertenece, aunque escriba la URL manualmente.

## Base de datos

| Tabla | Representa |
|---|---|
| `rol`, `usuario` | Perfiles y cuentas |
| `linea_transporte` | Líneas; cada una tiene un dueño (`dueno_id`) |
| `chofer` | Pertenece a una línea |
| `vehiculo` | Pertenece a una línea; equipamiento: climatizado, TV a bordo, accesible |
| `ruta` | Pertenece a una línea; sentido, tarifa, velocidad promedio y estado del servicio |
| `parada` | Paradas compartidas entre rutas, con código de poste opcional (`#108`) |
| `ruta_parada` | Paradas de cada ruta en orden |
| `recorrido` | Trazado de cada ruta (puntos en orden) |
| `viaje` | Chofer + vehículo + ruta, con inicio/fin y pasajeros al salir |
| `ubicacion_vehiculo` | Posiciones reportadas por un GPS real |
| `historial_consulta` | Rutas y paradas consultadas por el pasajero |
| `reporte_accidente` | Accidentes reportados por los usuarios; estado nuevo/revisado |

## API

| Endpoint | Descripción |
|---|---|
| `GET api/rutas.php` · `?q=` · `?linea_id=` | Lista y búsqueda de rutas |
| `GET api/rutas.php?id={id}` | Ruta con paradas, tiempos desde el origen y trazado |
| `GET api/paradas.php` · `?q=` | Lista de paradas (`q` acepta nombre o código, p. ej. `#108`) |
| `GET api/paradas.php?id={id}` | Parada y rutas que pasan por ella |
| `GET api/paradas.php?lat=&lng=` | Paradas cercanas con sus rutas |
| `GET api/vehiculos.php?rutas=1,2` | Vehículos en circulación y su ubicación |
| `GET api/vehiculos.php?ambito=gestion` | Flota del dueño o del administrador (requiere sesión) |
| `GET api/eta.php?parada_id={id}[&ruta_id=]` | Tiempo aproximado de llegada |
| `GET api/buscar.php?origen=&destino=[&lat=&lng=][&accesible=1][&menos_transbordos=1]` | Rutas directas y con un transbordo entre dos puntos |
| `POST api/reportar.php` (`csrf`, `ruta_id`, `descripcion`, `contacto`, `lat`, `lng`) | Reportar un accidente |

## Ubicación de vehículos y ETA

- `UBICACION_FUENTE = 'simulada'` (predeterminado): `services/FuenteUbicacionSimulada.php` mueve cada unidad en circulación sobre su recorrido a la velocidad promedio de la ruta. La interfaz muestra la etiqueta **"Ubicaciones de demostración"**. Las unidades registradas sin GPS aparecen como "No hay información de ubicación disponible".
- `UBICACION_FUENTE = 'base_datos'`: `services/FuenteUbicacionBaseDatos.php` usa la última fila de `ubicacion_vehiculo` de cada unidad (máximo `UBICACION_VIGENCIA_SEG` de antigüedad). Para conectar un GPS real basta con insertar filas en esa tabla.
- ETA = distancia que falta sobre el recorrido hasta la parada ÷ velocidad promedio de la ruta. Se muestra siempre como "Aprox. X min" (o "Aprox. X h Y min" en trayectos foráneos).

La información de vehículos y ETA se actualiza cada `ACTUALIZACION_SEG` segundos (15 por defecto) sin recargar la página, y se pausa cuando la pestaña no está visible.
