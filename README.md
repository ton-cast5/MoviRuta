# MoviRuta

**Movilidad + Ruta.** Consulta y gestión del transporte público: rutas, paradas, vehículos, ubicación y ETA, con perfiles pasajero, chofer, dueño de línea y administrador.

Stack: HTML/JS/CSS estático (`web/`) · **FastAPI (Python)** · Leaflet · **Supabase PostgreSQL** (principal) · **MySQL** (respaldo Workbench) · app Android (WebView + Compose MD3).

## Estructura

```text
MoviRuta/
  backend/app/     # FastAPI: /api/bd, /api/sesion, /api/guardar
  web/             # Front estático
  database/        # supabase.sql, moviruta.sql, seeds/demo.sql, sincronizar.py
  android/         # APK Kotlin + Compose
  api/index.py     # Entrada ASGI para Vercel
```

## Identificadores (cadena)

| Entidad | Ejemplo |
|---|---|
| Línea | `TAB-001-TNL` |
| Ruta / parada | `TAB-014-0001` (estado-municipio INEGI-serie) |
| Vehículo | placa (`16J-101`) |
| Usuario | `USER-pasajero-001` |
| Chofer | número de licencia |
| Viaje | `TNL-16J-001` |
| Reporte | `{id_ruta}-{n}` (`TAB-014-0001-001`) |

Registro público solo para **pasajeros**. Dueños y choferes los asigna admin/dueño. Multi-dueño vía `linea_dueno`. Tarifas: `tarifa_edu`, `tarifa_gral`, `tarifa_inapam`.

## Local (API + web)

```powershell
$env:TEMP='D:\Temp\MoviRuta\tmp'; $env:TMP=$env:TEMP
$env:PYTHONPATH='D:\MoviRuta'
D:\Temp\MoviRuta\venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8090
```

Abre `http://127.0.0.1:8090/`. Credenciales demo: `*@moviruta.local` / `moviruta123`.

Configuración: variables `DB_*` o `api/config.local.php` (leído por `backend/app/config.py`).

## Base de datos

1. Supabase: ejecuta `database/supabase.sql` y `database/seeds/demo.sql`.
2. MySQL Workbench: `database/moviruta.sql`, luego sincroniza:
   ```powershell
   D:\Temp\MoviRuta\venv\Scripts\python.exe D:\MoviRuta\database\sincronizar.py --forzar
   ```
3. El respaldo no copia `sesion`. No edites MySQL a mano: la sync lo sobrescribe.

## Vercel

`vercel.json` sirve `web/` y monta Python en `/api`. Variables: `DB_DRIVER=pgsql`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.

Comprobar: `https://<tu-dominio>/api/bd` → `{"ok":true,...}`.

## Android

Proyecto en `android/`. Gradle en `D:\.gradle`. APK release:

```powershell
$env:GRADLE_USER_HOME='D:\.gradle'
cd D:\MoviRuta\android
.\gradlew.bat assembleRelease
```

Salida: `android/app/build/outputs/apk/release/`. En modo app se oculta el menú horizontal del panel web (cajón nativo).

## Sin servidor

Abrir `web/index.html` usa `datos.js` en localStorage (demostración; no persiste en BD).
