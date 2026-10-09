-- =====================================================================
--  MoviRuta · esquema de la base de datos (MySQL 5.7+ / 8.x, MariaDB 10.4+)
--  Ejecutar completo en MySQL Workbench (o: mysql -u root < moviruta.sql)
--  y después datos_demo.sql. ¡Borra la base MoviRuta si ya existe!
-- =====================================================================

DROP DATABASE IF EXISTS MoviRuta;
CREATE DATABASE MoviRuta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE MoviRuta;

-- ---------------------------------------------------------------------
--  Catálogos
-- ---------------------------------------------------------------------

CREATE TABLE rol (
    clave       VARCHAR(20)  NOT NULL,
    nombre      VARCHAR(40)  NOT NULL,
    PRIMARY KEY (clave),
    UNIQUE KEY uq_rol_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE sentido_ruta (
    clave       VARCHAR(10)  NOT NULL,
    nombre      VARCHAR(30)  NOT NULL,
    PRIMARY KEY (clave)
) ENGINE=InnoDB;

CREATE TABLE estado_servicio (
    clave       VARCHAR(20)  NOT NULL,
    nombre      VARCHAR(40)  NOT NULL,
    PRIMARY KEY (clave)
) ENGINE=InnoDB;

CREATE TABLE estado_viaje (
    clave       VARCHAR(15)  NOT NULL,
    nombre      VARCHAR(30)  NOT NULL,
    PRIMARY KEY (clave)
) ENGINE=InnoDB;

CREATE TABLE estado_reporte (
    clave       VARCHAR(15)  NOT NULL,
    nombre      VARCHAR(30)  NOT NULL,
    PRIMARY KEY (clave)
) ENGINE=InnoDB;

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

CREATE TABLE tipo_falla (
    clave       VARCHAR(20)  NOT NULL,
    nombre      VARCHAR(60)  NOT NULL,
    PRIMARY KEY (clave)
) ENGINE=InnoDB;

CREATE TABLE estado_falla (
    clave       VARCHAR(15)  NOT NULL,
    nombre      VARCHAR(30)  NOT NULL,
    PRIMARY KEY (clave)
) ENGINE=InnoDB;

INSERT INTO tipo_falla (clave, nombre) VALUES
    ('llanta', 'Llanta ponchada o dañada'), ('clima', 'Aire acondicionado / clima'), ('frenos', 'Frenos'),
    ('motor', 'Motor o transmisión'), ('electrico', 'Luces o sistema eléctrico'), ('puertas', 'Puertas o ventanas'),
    ('rampa', 'Rampa o equipo de accesibilidad'), ('gps', 'GPS o dispositivo de ubicación'),
    ('interior', 'Asientos, carrocería o interior'), ('otro', 'Otra falla');
INSERT INTO estado_falla (clave, nombre) VALUES
    ('pendiente', 'Pendiente'), ('en_reparacion', 'En reparación'), ('resuelta', 'Resuelta');

-- ---------------------------------------------------------------------
--  Usuarios y líneas
-- ---------------------------------------------------------------------

CREATE TABLE usuario (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    rol             VARCHAR(20)  NOT NULL,
    nombre          VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    activo          TINYINT(1)   NOT NULL DEFAULT 1,
    ultimo_acceso   DATETIME     NULL,
    creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_usuario_email (email),
    KEY ix_usuario_rol (rol),
    CONSTRAINT fk_usuario_rol FOREIGN KEY (rol) REFERENCES rol (clave) ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE linea_transporte (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre          VARCHAR(120) NOT NULL,
    descripcion     VARCHAR(255) NULL,
    telefono        VARCHAR(30)  NULL,
    dueno_id        INT UNSIGNED NULL,
    activa          TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_linea_nombre (nombre),
    KEY ix_linea_dueno (dueno_id),
    CONSTRAINT fk_linea_dueno FOREIGN KEY (dueno_id) REFERENCES usuario (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE chofer (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id      INT UNSIGNED NOT NULL,
    linea_id        INT UNSIGNED NOT NULL,
    numero_licencia VARCHAR(30)  NOT NULL,
    telefono        VARCHAR(30)  NULL,
    activo          TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_chofer_usuario (usuario_id),
    UNIQUE KEY uq_chofer_licencia (numero_licencia),
    KEY ix_chofer_linea (linea_id),
    CONSTRAINT fk_chofer_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id),
    CONSTRAINT fk_chofer_linea   FOREIGN KEY (linea_id)   REFERENCES linea_transporte (id)
) ENGINE=InnoDB;

CREATE TABLE vehiculo (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    linea_id        INT UNSIGNED NOT NULL,
    numero_unidad   VARCHAR(20)  NOT NULL,
    placa           VARCHAR(15)  NOT NULL,
    modelo          VARCHAR(80)  NULL,
    capacidad       SMALLINT UNSIGNED NULL,
    cuenta_con_gps  TINYINT(1)   NOT NULL DEFAULT 0,
    climatizado     TINYINT(1)   NOT NULL DEFAULT 0,
    tv_a_bordo      TINYINT(1)   NOT NULL DEFAULT 0,
    accesible       TINYINT(1)   NOT NULL DEFAULT 0,
    activo          TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_vehiculo_placa (placa),
    UNIQUE KEY uq_vehiculo_unidad (linea_id, numero_unidad),
    CONSTRAINT fk_vehiculo_linea FOREIGN KEY (linea_id) REFERENCES linea_transporte (id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
--  Paradas y rutas
-- ---------------------------------------------------------------------

CREATE TABLE parada (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    codigo          VARCHAR(10)  NULL COMMENT 'Código de poste, p. ej. 108 (se muestra como #108)',
    nombre          VARCHAR(120) NOT NULL,
    referencia      VARCHAR(255) NULL,
    latitud         DECIMAL(9,6) NOT NULL,
    longitud        DECIMAL(9,6) NOT NULL,
    activa          TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_parada_codigo (codigo)
) ENGINE=InnoDB;

CREATE TABLE ruta (
    id                      INT UNSIGNED NOT NULL AUTO_INCREMENT,
    linea_id                INT UNSIGNED NOT NULL,
    codigo                  VARCHAR(10)  NOT NULL COMMENT 'Número de ruta visible, p. ej. 1, P1',
    nombre                  VARCHAR(120) NOT NULL,
    origen                  VARCHAR(120) NOT NULL,
    destino                 VARCHAR(120) NOT NULL,
    sentido                 VARCHAR(10)  NOT NULL,
    color                   CHAR(7)      NOT NULL,
    tarifa                  DECIMAL(7,2) NULL,
    velocidad_promedio_kmh  DECIMAL(5,2) NOT NULL,
    estado_servicio         VARCHAR(20)  NOT NULL DEFAULT 'normal',
    aviso                   VARCHAR(255) NULL,
    activa                  TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_ruta_codigo (linea_id, codigo, sentido),
    KEY ix_ruta_sentido (sentido),
    KEY ix_ruta_estado (estado_servicio),
    CONSTRAINT fk_ruta_linea   FOREIGN KEY (linea_id)        REFERENCES linea_transporte (id),
    CONSTRAINT fk_ruta_sentido FOREIGN KEY (sentido)         REFERENCES sentido_ruta (clave) ON UPDATE CASCADE,
    CONSTRAINT fk_ruta_estado  FOREIGN KEY (estado_servicio) REFERENCES estado_servicio (clave) ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Paradas de cada ruta en el orden del recorrido (una parada puede repetirse, p. ej. en circuitos).
CREATE TABLE ruta_parada (
    ruta_id     INT UNSIGNED      NOT NULL,
    orden       SMALLINT UNSIGNED NOT NULL,
    parada_id   INT UNSIGNED      NOT NULL,
    PRIMARY KEY (ruta_id, orden),
    KEY ix_ruta_parada_parada (parada_id),
    CONSTRAINT fk_ruta_parada_ruta   FOREIGN KEY (ruta_id)   REFERENCES ruta (id) ON DELETE CASCADE,
    CONSTRAINT fk_ruta_parada_parada FOREIGN KEY (parada_id) REFERENCES parada (id)
) ENGINE=InnoDB;

-- Trazado de cada ruta sobre el mapa (puntos en orden).
CREATE TABLE recorrido_punto (
    ruta_id     INT UNSIGNED      NOT NULL,
    orden       SMALLINT UNSIGNED NOT NULL,
    latitud     DECIMAL(9,6)      NOT NULL,
    longitud    DECIMAL(9,6)      NOT NULL,
    PRIMARY KEY (ruta_id, orden),
    CONSTRAINT fk_recorrido_ruta FOREIGN KEY (ruta_id) REFERENCES ruta (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
--  Operación
-- ---------------------------------------------------------------------

CREATE TABLE viaje (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
    chofer_id           INT UNSIGNED NOT NULL,
    vehiculo_id         INT UNSIGNED NOT NULL,
    ruta_id             INT UNSIGNED NOT NULL,
    inicio              DATETIME     NOT NULL,
    fin                 DATETIME     NULL,
    pasajeros_salida    SMALLINT UNSIGNED NULL COMMENT 'NULL si el chofer no lo registró',
    estado              VARCHAR(15)  NOT NULL DEFAULT 'en_curso',
    PRIMARY KEY (id),
    KEY ix_viaje_chofer (chofer_id, inicio),
    KEY ix_viaje_vehiculo (vehiculo_id),
    KEY ix_viaje_ruta (ruta_id),
    KEY ix_viaje_estado (estado),
    CONSTRAINT fk_viaje_chofer   FOREIGN KEY (chofer_id)   REFERENCES chofer (id),
    CONSTRAINT fk_viaje_vehiculo FOREIGN KEY (vehiculo_id) REFERENCES vehiculo (id),
    CONSTRAINT fk_viaje_ruta     FOREIGN KEY (ruta_id)     REFERENCES ruta (id),
    CONSTRAINT fk_viaje_estado   FOREIGN KEY (estado)      REFERENCES estado_viaje (clave) ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE reporte_accidente (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ruta_id         INT UNSIGNED NOT NULL,
    usuario_id      INT UNSIGNED NULL COMMENT 'Quién reportó (NULL si fue anónimo)',
    descripcion     VARCHAR(500) NOT NULL,
    contacto        VARCHAR(120) NULL,
    latitud         DECIMAL(9,6) NULL,
    longitud        DECIMAL(9,6) NULL,
    estado          VARCHAR(15)  NOT NULL DEFAULT 'nuevo',
    creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revisado_por    INT UNSIGNED NULL,
    revisado_en     DATETIME     NULL,
    PRIMARY KEY (id),
    KEY ix_reporte_ruta (ruta_id),
    KEY ix_reporte_usuario (usuario_id),
    KEY ix_reporte_revisor (revisado_por),
    KEY ix_reporte_estado (estado),
    CONSTRAINT fk_reporte_ruta    FOREIGN KEY (ruta_id)      REFERENCES ruta (id),
    CONSTRAINT fk_reporte_usuario FOREIGN KEY (usuario_id)   REFERENCES usuario (id) ON DELETE SET NULL,
    CONSTRAINT fk_reporte_revisor FOREIGN KEY (revisado_por) REFERENCES usuario (id) ON DELETE SET NULL,
    CONSTRAINT fk_reporte_estado  FOREIGN KEY (estado)       REFERENCES estado_reporte (clave) ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Fallas o detalles de cada unidad (llanta ponchada, clima descompuesto…) y su atención.
CREATE TABLE falla_vehiculo (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    vehiculo_id     INT UNSIGNED NOT NULL,
    tipo            VARCHAR(20)  NOT NULL,
    descripcion     VARCHAR(500) NULL,
    impide_circular TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '1 = la unidad no puede salir a ruta hasta resolver la falla',
    estado          VARCHAR(15)  NOT NULL DEFAULT 'pendiente',
    reportado_por   INT UNSIGNED NULL,
    viaje_id        INT UNSIGNED NULL COMMENT 'Viaje en el que se detectó (si la unidad estaba en ruta)',
    creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atendido_por    INT UNSIGNED NULL,
    nota_solucion   VARCHAR(255) NULL,
    resuelto_en     DATETIME     NULL,
    PRIMARY KEY (id),
    KEY ix_falla_vehiculo (vehiculo_id, estado),
    KEY ix_falla_tipo (tipo),
    KEY ix_falla_estado (estado),
    KEY ix_falla_reporta (reportado_por),
    KEY ix_falla_viaje (viaje_id),
    KEY ix_falla_atiende (atendido_por),
    CONSTRAINT fk_falla_vehiculo FOREIGN KEY (vehiculo_id)   REFERENCES vehiculo (id),
    CONSTRAINT fk_falla_tipo     FOREIGN KEY (tipo)          REFERENCES tipo_falla (clave) ON UPDATE CASCADE,
    CONSTRAINT fk_falla_estado   FOREIGN KEY (estado)        REFERENCES estado_falla (clave) ON UPDATE CASCADE,
    CONSTRAINT fk_falla_reporta  FOREIGN KEY (reportado_por) REFERENCES usuario (id) ON DELETE SET NULL,
    CONSTRAINT fk_falla_viaje    FOREIGN KEY (viaje_id)      REFERENCES viaje (id)   ON DELETE SET NULL,
    CONSTRAINT fk_falla_atiende  FOREIGN KEY (atendido_por)  REFERENCES usuario (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Rutas y paradas que consultó cada pasajero (una de las dos puede ser NULL).
CREATE TABLE historial_consulta (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id      INT UNSIGNED NOT NULL,
    ruta_id         INT UNSIGNED NULL,
    parada_id       INT UNSIGNED NULL,
    consultado_en   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_historial_usuario (usuario_id, consultado_en),
    KEY ix_historial_ruta (ruta_id),
    KEY ix_historial_parada (parada_id),
    CONSTRAINT fk_historial_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE,
    CONSTRAINT fk_historial_ruta    FOREIGN KEY (ruta_id)    REFERENCES ruta (id)    ON DELETE CASCADE,
    CONSTRAINT fk_historial_parada  FOREIGN KEY (parada_id)  REFERENCES parada (id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- Sesiones de la API (inicio de sesión). Se guardan aquí para que funcionen aunque el sitio corra en varios
-- servidores, como en Vercel. Las filas vencidas se borran solas.
CREATE TABLE sesion (
    id          VARCHAR(128) NOT NULL,
    datos       BLOB         NOT NULL,
    expira      INT UNSIGNED NOT NULL COMMENT 'Fecha de vencimiento (segundos Unix)',
    PRIMARY KEY (id),
    KEY ix_sesion_expira (expira)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
--  Vistas de consulta (para revisar los datos desde Workbench)
-- ---------------------------------------------------------------------

CREATE VIEW vista_rutas AS
SELECT r.id, l.nombre AS linea, r.codigo, r.nombre, s.nombre AS sentido, r.origen, r.destino,
       r.tarifa, e.nombre AS estado_servicio, r.activa,
       (SELECT COUNT(*) FROM ruta_parada rp WHERE rp.ruta_id = r.id) AS total_paradas
FROM ruta r
JOIN linea_transporte l ON l.id = r.linea_id
JOIN sentido_ruta s ON s.clave = r.sentido
JOIN estado_servicio e ON e.clave = r.estado_servicio;

CREATE VIEW vista_viajes_en_curso AS
SELECT v.id, u.nombre AS chofer, ve.numero_unidad, ve.placa, r.codigo AS ruta, r.nombre AS nombre_ruta,
       v.inicio, v.pasajeros_salida
FROM viaje v
JOIN chofer c ON c.id = v.chofer_id
JOIN usuario u ON u.id = c.usuario_id
JOIN vehiculo ve ON ve.id = v.vehiculo_id
JOIN ruta r ON r.id = v.ruta_id
WHERE v.estado = 'en_curso';

CREATE VIEW vista_fallas_abiertas AS
SELECT f.id, l.nombre AS linea, ve.numero_unidad, ve.placa, t.nombre AS tipo, f.descripcion,
       f.impide_circular, e.nombre AS estado, u.nombre AS reportado_por, f.creado_en
FROM falla_vehiculo f
JOIN vehiculo ve ON ve.id = f.vehiculo_id
JOIN linea_transporte l ON l.id = ve.linea_id
JOIN tipo_falla t ON t.clave = f.tipo
JOIN estado_falla e ON e.clave = f.estado
LEFT JOIN usuario u ON u.id = f.reportado_por
WHERE f.estado <> 'resuelta';
