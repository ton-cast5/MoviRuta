# MoviRuta

**Movilidad + Ruta.** Sistema web de consulta y seguimiento del transporte público: rutas, paradas, vehículos, ubicación y tiempo estimado de llegada (ETA), con cuatro perfiles: pasajero, chofer, dueño de línea y administrador general.

Stack: HTML5 · Tailwind CSS (CDN) · JavaScript sin frameworks · Leaflet.js con mosaicos de Google Maps · API en PHP 8 · base de datos **Supabase** (PostgreSQL) con respaldo en **MySQL** (Workbench).

El sitio funciona de dos formas:

- **Con base de datos** (Vercel, o WAMP en tu computadora): todo lo que se guarda en los paneles va a la base y el servidor valida la sesión y los permisos.
- **Sin servidor** (doble clic en `index.html`, GitHub Pages): usa los datos de demostración guardados en el navegador. Útil para enseñar el diseño, pero no guarda nada en la base de datos.

La página detecta sola en qué modo está; en el pie dice "Conectado a la base de datos MoviRuta" cuando usa la base.

---

## Base de datos: Supabase (principal) + MySQL Workbench (respaldo)

```text
Vercel (sitio público) ─┐
                        ├──► Supabase · proyecto MoviRuta (PostgreSQL) ── base principal: aquí se lee y se escribe
WAMP (tu computadora) ──┘                     │
                                              │  database/sincronizar.php, cada minuto (tarea programada de Windows)
                                              ▼
                              MySQL de WAMP · base MoviRuta (Workbench) ── respaldo con la misma información
```

- Las dos bases tienen **las mismas tablas, columnas, llaves foráneas y nombres** (`database/supabase.sql` y `database/moviruta.sql`).
- La copia a MySQL es completa y en una sola transacción, y solo se hace cuando algo cambió en Supabase. Queda anotada en `database/sincronizacion.log`.
- La tarea programada **"MoviRuta - respaldo"** ejecuta la copia cada minuto mientras tu computadora esté encendida (y WAMP también). Para copiar en el momento: `php database/sincronizar.php --forzar`.
- ⚠️ **No edites datos directamente en Workbench**: el MySQL es un espejo y la siguiente copia lo deja igual que Supabase. Los cambios se hacen desde el sitio (o en Supabase).
- La API se conecta a Supabase con el usuario `moviruta_api`, que solo puede leer y escribir las tablas de MoviRuta. La API pública de Supabase (`anon`) no tiene acceso a ninguna tabla.

### Crear todo desde cero

1. **Supabase**: en el proyecto MoviRuta → *SQL Editor*, ejecuta `database/supabase.sql` y después `database/supabase_datos_demo.sql`. Crea el usuario de la API (cambia la clave):
   ```sql
   CREATE ROLE moviruta_api LOGIN NOINHERIT PASSWORD 'una-clave-larga';
   GRANT USAGE ON SCHEMA public TO moviruta_api;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO moviruta_api;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO moviruta_api;
   -- y en cada tabla: CREATE POLICY api_moviruta ON <tabla> FOR ALL TO moviruta_api USING (true) WITH CHECK (true);
   ```
2. **MySQL (Workbench)**: ejecuta `database/moviruta.sql` (crea la base **MoviRuta**; ⚠️ la borra si ya existía). Los datos llegan solos con la sincronización.
3. **`api/config.local.php`** (no se sube a git) con la conexión a Supabase:
   ```php
   <?php return ['motor' => 'pgsql', 'host' => 'aws-0-us-east-1.pooler.supabase.com', 'puerto' => 6543,
                 'base' => 'postgres', 'usuario' => 'moviruta_api.cnklvwiidyquhrqsgxvf', 'password' => 'una-clave-larga'];
   ```
   Sin este archivo la API usa directamente el MySQL local (sirve si no tienes internet, pero esos cambios no llegan a Supabase y la siguiente sincronización los reemplaza).
4. **Tarea programada** (una sola vez):
   ```powershell
   schtasks /Create /F /SC MINUTE /MO 1 /TN "MoviRuta - respaldo" /TR '"D:\wamp64\bin\php\php8.3.28\php-win.exe" "D:\MoviRuta\database\sincronizar.php"'
   ```
5. En `php.ini` y `phpForApache.ini` de WAMP deben estar activas `extension=pdo_pgsql` y `extension=pgsql`.

## Cómo abrirlo en tu computadora (WAMP)

1. Enciende WAMP (Apache y MySQL).
2. El archivo `D:\wamp64\alias\moviruta.conf` publica la carpeta en Apache:
   ```apache
   Alias /MoviRuta "D:/MoviRuta/"
   <Directory "D:/MoviRuta/">
     Options -Indexes +FollowSymLinks
     AllowOverride all
     Require local
   </Directory>
   ```
   Reinicia los servicios de WAMP y abre `http://localhost/MoviRuta/`.

Sin Apache también sirve el servidor de PHP: `php -S 127.0.0.1:8090` dentro de la carpeta y abrir `http://127.0.0.1:8090/`. Desde tu computadora cada página tarda 1–2 segundos porque los datos vienen de Supabase (en Estados Unidos); en Vercel la API está junto a Supabase y responde mucho más rápido.

### Tablas

- Catálogos: `rol`, `sentido_ruta`, `estado_servicio`, `estado_viaje`, `estado_reporte`, `tipo_falla`, `estado_falla`.
- Tablas: `usuario`, `linea_transporte`, `chofer`, `vehiculo`, `parada`, `ruta`, `ruta_parada` (paradas en orden), `recorrido_punto` (trazado), `viaje`, `reporte_accidente`, `falla_vehiculo`, `historial_consulta` y `sesion` (sesiones de la API; no se copia al respaldo).
- Vistas para consultar desde Workbench o Supabase: `vista_rutas`, `vista_viajes_en_curso`, `vista_fallas_abiertas`.
- Las contraseñas se guardan cifradas con bcrypt.

## Publicar en Vercel

La API en PHP corre en Vercel con `vercel-php` (configurado en `vercel.json`) y usa la misma base de Supabase. En **Vercel → proyecto moviruta → Settings → Environment Variables** (Production y Preview):

| Variable | Valor |
|---|---|
| `DB_DRIVER` | `pgsql` |
| `DB_HOST` | `aws-0-us-east-1.pooler.supabase.com` |
| `DB_PORT` | `6543` |
| `DB_NAME` | `postgres` |
| `DB_USER` | `moviruta_api.cnklvwiidyquhrqsgxvf` |
| `DB_PASSWORD` | la clave de `moviruta_api` (la misma de `api/config.local.php`) |

Cada `git push` publica de nuevo. Para comprobarlo, abre `https://moviruta.vercel.app/api/bd.php`: debe responder `{"ok":true,...}`.

Si la base no responde, el sitio sigue funcionando con los datos de demostración y muestra un aviso.

## Cómo abrirlo sin servidor

- **Doble clic** en `index.html` (recomendado con Chrome o Edge).
- O con un servidor estático: extensión *Live Server* de VS Code / Cursor, o `python -m http.server 5173`.

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

**Con base de datos:** al abrir cada página, `api/bd.php` entrega los datos que el usuario puede ver; cada cambio se manda a `api/guardar.php`, que revisa la sesión y los permisos con los datos de la base (un chofer solo maneja unidades de su línea, un dueño solo administra sus líneas, etc.) y guarda todo en una transacción en Supabase; al minuto queda también en el MySQL de respaldo. El inicio de sesión (`api/sesion.php`) bloquea un minuto después de 5 intentos fallidos.

**Sin servidor:** los datos iniciales de `assets/js/datos.js` se copian a `localStorage` (clave `moviruta.bd`) y lo que se edita se guarda **solo en ese navegador**; el botón *Restablecer datos de demostración* del pie los regresa al inicio. En este modo el inicio de sesión y los permisos son una simulación que no protege nada.

---

## Páginas

```text
Inicio · Rutas · Paradas · Mapa · Iniciar sesión
                                     └── Identificación del rol
                                          ├── Pasajero        → panel, historial
                                          ├── Chofer          → perfil, iniciar viaje (con pasajeros al salir), viaje actual, fallas de unidad, historial
                                          ├── Dueño de línea  → choferes, vehículos, fallas, rutas, paradas, ubicación, reportes (solo su línea)
                                          └── Administrador   → líneas, usuarios, choferes, vehículos, fallas, rutas, paradas, ubicación, reportes
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
- **Fallas de vehículos**: el chofer reporta detalles de la unidad (llanta ponchada, clima que no enfría, frenos, puertas, rampa…) y si le impiden circular; el dueño de la línea la pasa a *en reparación* y luego a *resuelta* con una nota. Mientras una falla que impide circular esté abierta, la unidad no se puede usar para iniciar viajes; si la falla es del clima o de la rampa, los pasajeros dejan de ver la unidad como climatizada o accesible.

---

## Estructura

```text
MoviRuta/
├── index.html, rutas.html, ruta.html, paradas.html, parada.html, mapa.html   Consulta pública
├── login.html                                                               Iniciar sesión
├── manifest.webmanifest                                                     App web instalable (nombre, colores e íconos)
├── pasajero/  chofer/  dueno/  admin/                                       Panel de cada perfil
├── api/                                                                     API en PHP (bd.php, sesion.php, guardar.php, config.php)
├── database/                                                                Esquemas y datos de Supabase (supabase*.sql) y MySQL (moviruta.sql,
│                                                                            datos_demo.sql), y sincronizar.php (Supabase → MySQL)
├── vercel.json, .vercelignore                                               Publicación en Vercel
└── assets/
    ├── css/moviruta.css        Estilos propios y animaciones (sobre Tailwind)
    ├── fuentes/                Inter y Material Symbols
    ├── img/                    Logo, favicon e íconos de la app
    └── js/
        ├── tailwind-config.js  Paleta, tipografía y espaciados del diseño
        ├── datos.js            Datos de demostración
        ├── servicios.js        Datos (de la API o de localStorage), sesión, búsqueda, ETA, gestión
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
