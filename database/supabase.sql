-- =====================================================================
--  MoviRuta · esquema Supabase (PostgreSQL 15+)
--  IDs de cadena (superllaves). Principal en la nube; MySQL es respaldo.
-- =====================================================================

DROP VIEW IF EXISTS vista_fallas_abiertas, vista_viajes_en_curso, vista_rutas;
DROP TABLE IF EXISTS sesion, historial_consulta, falla_vehiculo, reporte_accidente, viaje, recorrido_punto, ruta_parada,
    ruta, parada, vehiculo, chofer, linea_dueno, linea_transporte, usuario, municipio, estado,
    estado_falla, tipo_falla, estado_reporte, estado_viaje, estado_servicio, sentido_ruta, rol CASCADE;

-- ---------------------------------------------------------------------
--  Catálogos
-- ---------------------------------------------------------------------

CREATE TABLE rol (
    clave       VARCHAR(20)  NOT NULL PRIMARY KEY,
    nombre      VARCHAR(40)  NOT NULL CONSTRAINT uq_rol_nombre UNIQUE
);

CREATE TABLE sentido_ruta (
    clave       VARCHAR(10)  NOT NULL PRIMARY KEY,
    nombre      VARCHAR(30)  NOT NULL
);

CREATE TABLE estado_servicio (
    clave       VARCHAR(20)  NOT NULL PRIMARY KEY,
    nombre      VARCHAR(40)  NOT NULL
);

CREATE TABLE estado_viaje (
    clave       VARCHAR(15)  NOT NULL PRIMARY KEY,
    nombre      VARCHAR(30)  NOT NULL
);

CREATE TABLE estado_reporte (
    clave       VARCHAR(15)  NOT NULL PRIMARY KEY,
    nombre      VARCHAR(30)  NOT NULL
);

CREATE TABLE tipo_falla (
    clave       VARCHAR(20)  NOT NULL PRIMARY KEY,
    nombre      VARCHAR(60)  NOT NULL
);

CREATE TABLE estado_falla (
    clave       VARCHAR(15)  NOT NULL PRIMARY KEY,
    nombre      VARCHAR(30)  NOT NULL
);

CREATE TABLE estado (
    clave       CHAR(3)      NOT NULL PRIMARY KEY,
    nombre      VARCHAR(60)  NOT NULL CONSTRAINT uq_estado_nombre UNIQUE
);

CREATE TABLE municipio (
    estado_clave CHAR(3)     NOT NULL,
    clave        CHAR(3)     NOT NULL,
    nombre       VARCHAR(80) NOT NULL,
    PRIMARY KEY (estado_clave, clave),
    CONSTRAINT fk_municipio_estado FOREIGN KEY (estado_clave) REFERENCES estado (clave) ON UPDATE CASCADE
);

INSERT INTO rol (clave, nombre) VALUES
    ('pasajero', 'Pasajero'), ('chofer', 'Chofer'), ('dueno', 'Dueño de línea'), ('admin', 'Administrador general');
INSERT INTO sentido_ruta (clave, nombre) VALUES
    ('ida', 'Ida'), ('vuelta', 'Vuelta'), ('circular', 'Circuito');
INSERT INTO estado_servicio (clave, nombre) VALUES
    ('normal', 'Operando con normalidad'), ('con_retrasos', 'Servicio con retrasos'), ('suspendida', 'Servicio suspendido');
INSERT INTO estado_viaje (clave, nombre) VALUES
    ('en_curso', 'En curso'), ('finalizado', 'Finalizado');
INSERT INTO estado_reporte (clave, nombre) VALUES
    ('nuevo', 'Nuevo'), ('revisado', 'Revisado');
INSERT INTO tipo_falla (clave, nombre) VALUES
    ('llanta', 'Llanta ponchada o dañada'), ('clima', 'Aire acondicionado / clima'), ('frenos', 'Frenos'),
    ('motor', 'Motor o transmisión'), ('electrico', 'Luces o sistema eléctrico'), ('puertas', 'Puertas o ventanas'),
    ('rampa', 'Rampa o equipo de accesibilidad'), ('gps', 'GPS o dispositivo de ubicación'),
    ('interior', 'Asientos, carrocería o interior'), ('otro', 'Otra falla');
INSERT INTO estado_falla (clave, nombre) VALUES
    ('pendiente', 'Pendiente'), ('en_reparacion', 'En reparación'), ('resuelta', 'Resuelta');

INSERT INTO estado (clave, nombre) VALUES ('TAB', 'Tabasco');
INSERT INTO municipio (estado_clave, clave, nombre) VALUES
    ('TAB', '001', 'Balancán'), ('TAB', '002', 'Cárdenas'), ('TAB', '003', 'Centla'),
    ('TAB', '004', 'Centro'), ('TAB', '005', 'Comalcalco'), ('TAB', '006', 'Cunduacán'),
    ('TAB', '007', 'Emiliano Zapata'), ('TAB', '008', 'Huimanguillo'), ('TAB', '009', 'Jalapa'),
    ('TAB', '010', 'Jalpa de Méndez'), ('TAB', '011', 'Jonuta'), ('TAB', '012', 'Macuspana'),
    ('TAB', '013', 'Nacajuca'), ('TAB', '014', 'Paraíso'), ('TAB', '015', 'Tacotalpa'),
    ('TAB', '016', 'Teapa'), ('TAB', '017', 'Tenosique');

-- ---------------------------------------------------------------------
--  Usuarios y líneas
-- ---------------------------------------------------------------------

CREATE TABLE usuario (
    id              VARCHAR(40)  NOT NULL PRIMARY KEY,
    rol             VARCHAR(20)  NOT NULL,
    nombre          VARCHAR(100) NOT NULL,
    apellido        VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    activo          SMALLINT     NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    ultimo_acceso   TIMESTAMPTZ  NULL,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_usuario_email UNIQUE (email),
    CONSTRAINT fk_usuario_rol FOREIGN KEY (rol) REFERENCES rol (clave) ON UPDATE CASCADE,
    CONSTRAINT ck_usuario_id CHECK (id ~ '^USER-(pasajero|chofer|dueno|admin)-[0-9]{3,}$')
);
CREATE INDEX ix_usuario_rol ON usuario (rol);

CREATE TABLE linea_transporte (
    id              VARCHAR(20)  NOT NULL PRIMARY KEY,
    estado_clave    CHAR(3)      NOT NULL,
    serie           SMALLINT     NOT NULL CHECK (serie > 0),
    siglas          CHAR(3)      NOT NULL,
    nombre          VARCHAR(120) NOT NULL,
    descripcion     VARCHAR(255) NULL,
    telefono        VARCHAR(30)  NULL,
    activa          SMALLINT     NOT NULL DEFAULT 1 CHECK (activa IN (0, 1)),
    CONSTRAINT uq_linea_nombre UNIQUE (nombre),
    CONSTRAINT uq_linea_siglas_estado UNIQUE (estado_clave, siglas),
    CONSTRAINT uq_linea_serie_estado UNIQUE (estado_clave, serie),
    CONSTRAINT fk_linea_estado FOREIGN KEY (estado_clave) REFERENCES estado (clave) ON UPDATE CASCADE,
    CONSTRAINT ck_linea_id CHECK (id ~ '^[A-Z]{3}-[0-9]{3}-[A-Z0-9]{3}$')
);
CREATE INDEX ix_linea_estado ON linea_transporte (estado_clave);

CREATE TABLE linea_dueno (
    linea_id    VARCHAR(20) NOT NULL,
    usuario_id  VARCHAR(40) NOT NULL,
    PRIMARY KEY (linea_id, usuario_id),
    CONSTRAINT fk_linea_dueno_linea   FOREIGN KEY (linea_id)   REFERENCES linea_transporte (id) ON DELETE CASCADE,
    CONSTRAINT fk_linea_dueno_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE
);
CREATE INDEX ix_linea_dueno_usuario ON linea_dueno (usuario_id);

CREATE TABLE chofer (
    numero_licencia VARCHAR(30)  NOT NULL PRIMARY KEY,
    usuario_id      VARCHAR(40)  NOT NULL,
    linea_id        VARCHAR(20)  NOT NULL,
    telefono        VARCHAR(30)  NULL,
    seguro_vida     SMALLINT     NOT NULL DEFAULT 0 CHECK (seguro_vida IN (0, 1)),
    activo          SMALLINT     NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    CONSTRAINT uq_chofer_usuario UNIQUE (usuario_id),
    CONSTRAINT fk_chofer_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id),
    CONSTRAINT fk_chofer_linea   FOREIGN KEY (linea_id)   REFERENCES linea_transporte (id)
);
CREATE INDEX ix_chofer_linea ON chofer (linea_id);

CREATE TABLE vehiculo (
    placa           VARCHAR(15)  NOT NULL PRIMARY KEY,
    linea_id        VARCHAR(20)  NOT NULL,
    numero_unidad   VARCHAR(20)  NOT NULL,
    modelo          VARCHAR(80)  NULL,
    capacidad       SMALLINT     NULL CHECK (capacidad >= 0),
    cuenta_con_gps  SMALLINT     NOT NULL DEFAULT 0 CHECK (cuenta_con_gps IN (0, 1)),
    climatizado     SMALLINT     NOT NULL DEFAULT 0 CHECK (climatizado IN (0, 1)),
    tv_a_bordo      SMALLINT     NOT NULL DEFAULT 0 CHECK (tv_a_bordo IN (0, 1)),
    accesible       SMALLINT     NOT NULL DEFAULT 0 CHECK (accesible IN (0, 1)),
    activo          SMALLINT     NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    CONSTRAINT uq_vehiculo_unidad UNIQUE (linea_id, numero_unidad),
    CONSTRAINT fk_vehiculo_linea FOREIGN KEY (linea_id) REFERENCES linea_transporte (id),
    CONSTRAINT ck_vehiculo_placa CHECK (placa ~ '^[A-Z0-9-]{4,15}$')
);

-- ---------------------------------------------------------------------
--  Paradas y rutas
-- ---------------------------------------------------------------------

CREATE TABLE parada (
    id              VARCHAR(20)  NOT NULL PRIMARY KEY,
    estado_clave    CHAR(3)      NOT NULL,
    municipio_clave CHAR(3)      NOT NULL,
    serie           INTEGER      NOT NULL CHECK (serie > 0),
    codigo          VARCHAR(10)  NULL,
    nombre          VARCHAR(120) NOT NULL,
    referencia      VARCHAR(255) NULL,
    latitud         NUMERIC(9,6) NOT NULL,
    longitud        NUMERIC(9,6) NOT NULL,
    activa          SMALLINT     NOT NULL DEFAULT 1 CHECK (activa IN (0, 1)),
    CONSTRAINT uq_parada_codigo UNIQUE (codigo),
    CONSTRAINT uq_parada_serie UNIQUE (estado_clave, municipio_clave, serie),
    CONSTRAINT fk_parada_municipio FOREIGN KEY (estado_clave, municipio_clave)
        REFERENCES municipio (estado_clave, clave) ON UPDATE CASCADE,
    CONSTRAINT ck_parada_id CHECK (id ~ '^[A-Z]{3}-[0-9]{3}-[0-9]{4}$')
);

CREATE TABLE ruta (
    id                      VARCHAR(20)  NOT NULL PRIMARY KEY,
    linea_id                VARCHAR(20)  NOT NULL,
    estado_clave            CHAR(3)      NOT NULL,
    municipio_clave         CHAR(3)      NOT NULL,
    serie                   INTEGER      NOT NULL CHECK (serie > 0),
    codigo                  VARCHAR(10)  NOT NULL,
    nombre                  VARCHAR(250) NOT NULL,
    origen                  VARCHAR(120) NOT NULL,
    destino                 VARCHAR(120) NOT NULL,
    sentido                 VARCHAR(10)  NOT NULL,
    color                   CHAR(7)      NOT NULL,
    tarifa_edu              NUMERIC(7,2) NULL,
    tarifa_gral             NUMERIC(7,2) NULL,
    tarifa_inapam           NUMERIC(7,2) NULL,
    velocidad_promedio_kmh  NUMERIC(5,2) NOT NULL,
    estado_servicio         VARCHAR(20)  NOT NULL DEFAULT 'normal',
    aviso                   VARCHAR(255) NULL,
    activa                  SMALLINT     NOT NULL DEFAULT 1 CHECK (activa IN (0, 1)),
    CONSTRAINT uq_ruta_codigo UNIQUE (linea_id, codigo, sentido),
    CONSTRAINT uq_ruta_serie UNIQUE (estado_clave, municipio_clave, serie),
    CONSTRAINT fk_ruta_linea   FOREIGN KEY (linea_id)        REFERENCES linea_transporte (id),
    CONSTRAINT fk_ruta_municipio FOREIGN KEY (estado_clave, municipio_clave)
        REFERENCES municipio (estado_clave, clave) ON UPDATE CASCADE,
    CONSTRAINT fk_ruta_sentido FOREIGN KEY (sentido)         REFERENCES sentido_ruta (clave) ON UPDATE CASCADE,
    CONSTRAINT fk_ruta_estado  FOREIGN KEY (estado_servicio) REFERENCES estado_servicio (clave) ON UPDATE CASCADE,
    CONSTRAINT ck_ruta_id CHECK (id ~ '^[A-Z]{3}-[0-9]{3}-[0-9]{4}$')
);
CREATE INDEX ix_ruta_sentido ON ruta (sentido);
CREATE INDEX ix_ruta_estado ON ruta (estado_servicio);
CREATE INDEX ix_ruta_linea ON ruta (linea_id);

CREATE TABLE ruta_parada (
    ruta_id     VARCHAR(20) NOT NULL,
    orden       SMALLINT    NOT NULL CHECK (orden > 0),
    parada_id   VARCHAR(20) NOT NULL,
    PRIMARY KEY (ruta_id, orden),
    CONSTRAINT fk_ruta_parada_ruta   FOREIGN KEY (ruta_id)   REFERENCES ruta (id) ON DELETE CASCADE,
    CONSTRAINT fk_ruta_parada_parada FOREIGN KEY (parada_id) REFERENCES parada (id)
);
CREATE INDEX ix_ruta_parada_parada ON ruta_parada (parada_id);

CREATE TABLE recorrido_punto (
    ruta_id     VARCHAR(20)  NOT NULL,
    orden       SMALLINT     NOT NULL CHECK (orden > 0),
    latitud     NUMERIC(9,6) NOT NULL,
    longitud    NUMERIC(9,6) NOT NULL,
    PRIMARY KEY (ruta_id, orden),
    CONSTRAINT fk_recorrido_ruta FOREIGN KEY (ruta_id) REFERENCES ruta (id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
--  Operación
-- ---------------------------------------------------------------------

CREATE TABLE viaje (
    id                  VARCHAR(40)  NOT NULL PRIMARY KEY,
    chofer_id           VARCHAR(30)  NOT NULL,
    vehiculo_id         VARCHAR(15)  NOT NULL,
    ruta_id             VARCHAR(20)  NOT NULL,
    inicio              TIMESTAMPTZ  NOT NULL,
    fin                 TIMESTAMPTZ  NULL,
    pasajeros_salida    SMALLINT     NULL CHECK (pasajeros_salida >= 0),
    estado              VARCHAR(15)  NOT NULL DEFAULT 'en_curso',
    CONSTRAINT fk_viaje_chofer   FOREIGN KEY (chofer_id)   REFERENCES chofer (numero_licencia),
    CONSTRAINT fk_viaje_vehiculo FOREIGN KEY (vehiculo_id) REFERENCES vehiculo (placa),
    CONSTRAINT fk_viaje_ruta     FOREIGN KEY (ruta_id)     REFERENCES ruta (id),
    CONSTRAINT fk_viaje_estado   FOREIGN KEY (estado)      REFERENCES estado_viaje (clave) ON UPDATE CASCADE
);
CREATE INDEX ix_viaje_chofer ON viaje (chofer_id, inicio);
CREATE INDEX ix_viaje_vehiculo ON viaje (vehiculo_id);
CREATE INDEX ix_viaje_ruta ON viaje (ruta_id);
CREATE INDEX ix_viaje_estado ON viaje (estado);

CREATE TABLE reporte_accidente (
    id              VARCHAR(40)  NOT NULL PRIMARY KEY,
    ruta_id         VARCHAR(20)  NOT NULL,
    usuario_id      VARCHAR(40)  NULL,
    descripcion     VARCHAR(500) NOT NULL,
    latitud         NUMERIC(9,6) NULL,
    longitud        NUMERIC(9,6) NULL,
    estado          VARCHAR(15)  NOT NULL DEFAULT 'nuevo',
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    revisado_por    VARCHAR(40)  NULL,
    revisado_en     TIMESTAMPTZ  NULL,
    CONSTRAINT fk_reporte_ruta    FOREIGN KEY (ruta_id)      REFERENCES ruta (id),
    CONSTRAINT fk_reporte_usuario FOREIGN KEY (usuario_id)   REFERENCES usuario (id) ON DELETE SET NULL,
    CONSTRAINT fk_reporte_revisor FOREIGN KEY (revisado_por) REFERENCES usuario (id) ON DELETE SET NULL,
    CONSTRAINT fk_reporte_estado  FOREIGN KEY (estado)       REFERENCES estado_reporte (clave) ON UPDATE CASCADE
);
CREATE INDEX ix_reporte_ruta ON reporte_accidente (ruta_id);
CREATE INDEX ix_reporte_estado ON reporte_accidente (estado);

CREATE TABLE falla_vehiculo (
    id              VARCHAR(60)  NOT NULL PRIMARY KEY,
    vehiculo_id     VARCHAR(15)  NOT NULL,
    linea_id        VARCHAR(20)  NOT NULL,
    tipo            VARCHAR(20)  NOT NULL,
    descripcion     VARCHAR(500) NULL,
    impide_circular SMALLINT     NOT NULL DEFAULT 0 CHECK (impide_circular IN (0, 1)),
    estado          VARCHAR(15)  NOT NULL DEFAULT 'pendiente',
    reportado_por   VARCHAR(40)  NULL,
    viaje_id        VARCHAR(40)  NULL,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    atendido_por    VARCHAR(40)  NULL,
    nota_solucion   VARCHAR(255) NULL,
    resuelto_en     TIMESTAMPTZ  NULL,
    CONSTRAINT fk_falla_vehiculo FOREIGN KEY (vehiculo_id)   REFERENCES vehiculo (placa),
    CONSTRAINT fk_falla_linea    FOREIGN KEY (linea_id)      REFERENCES linea_transporte (id),
    CONSTRAINT fk_falla_tipo     FOREIGN KEY (tipo)          REFERENCES tipo_falla (clave) ON UPDATE CASCADE,
    CONSTRAINT fk_falla_estado   FOREIGN KEY (estado)        REFERENCES estado_falla (clave) ON UPDATE CASCADE,
    CONSTRAINT fk_falla_reporta  FOREIGN KEY (reportado_por) REFERENCES usuario (id) ON DELETE SET NULL,
    CONSTRAINT fk_falla_viaje    FOREIGN KEY (viaje_id)      REFERENCES viaje (id)   ON DELETE SET NULL,
    CONSTRAINT fk_falla_atiende  FOREIGN KEY (atendido_por)  REFERENCES usuario (id) ON DELETE SET NULL
);
CREATE INDEX ix_falla_vehiculo ON falla_vehiculo (vehiculo_id, estado);
CREATE INDEX ix_falla_estado ON falla_vehiculo (estado);

CREATE TABLE sesion (
    id          VARCHAR(128) NOT NULL PRIMARY KEY,
    datos       TEXT         NOT NULL,
    expira      BIGINT       NOT NULL
);
CREATE INDEX ix_sesion_expira ON sesion (expira);

-- ---------------------------------------------------------------------
--  Vistas
-- ---------------------------------------------------------------------

CREATE VIEW vista_rutas WITH (security_invoker = true) AS
SELECT r.id, l.nombre AS linea, r.codigo, r.nombre, s.nombre AS sentido, r.origen, r.destino,
       r.tarifa_edu, r.tarifa_gral, r.tarifa_inapam, e.nombre AS estado_servicio, r.activa,
       (SELECT COUNT(*) FROM ruta_parada rp WHERE rp.ruta_id = r.id) AS total_paradas
FROM ruta r
JOIN linea_transporte l ON l.id = r.linea_id
JOIN sentido_ruta s ON s.clave = r.sentido
JOIN estado_servicio e ON e.clave = r.estado_servicio;

CREATE VIEW vista_viajes_en_curso WITH (security_invoker = true) AS
SELECT v.id, u.nombre || ' ' || u.apellido AS chofer, ve.numero_unidad, ve.placa,
       r.codigo AS ruta, r.nombre AS nombre_ruta, v.inicio, v.pasajeros_salida
FROM viaje v
JOIN chofer c ON c.numero_licencia = v.chofer_id
JOIN usuario u ON u.id = c.usuario_id
JOIN vehiculo ve ON ve.placa = v.vehiculo_id
JOIN ruta r ON r.id = v.ruta_id
WHERE v.estado = 'en_curso';

CREATE VIEW vista_fallas_abiertas WITH (security_invoker = true) AS
SELECT f.id, l.nombre AS linea, ve.numero_unidad, ve.placa, t.nombre AS tipo, f.descripcion,
       f.impide_circular, e.nombre AS estado, u.nombre || ' ' || u.apellido AS reportado_por, f.creado_en
FROM falla_vehiculo f
JOIN vehiculo ve ON ve.placa = f.vehiculo_id
JOIN linea_transporte l ON l.id = f.linea_id
JOIN tipo_falla t ON t.clave = f.tipo
JOIN estado_falla e ON e.clave = f.estado
LEFT JOIN usuario u ON u.id = f.reportado_por
WHERE f.estado <> 'resuelta';

DO $$
DECLARE t text;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
