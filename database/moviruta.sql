-- =====================================================================
-- MoviRuta · Esquema de base de datos (MySQL 8 / MariaDB 10.5+)
-- Ejecutar primero este archivo y después datos_demo.sql
-- =====================================================================

CREATE DATABASE IF NOT EXISTS moviruta
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE moviruta;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS reporte_accidente, historial_consulta, ubicacion_vehiculo, viaje, recorrido, ruta_parada,
    parada, ruta, vehiculo, chofer, linea_transporte, usuario, rol;
SET FOREIGN_KEY_CHECKS = 1;

-- Perfiles del sistema: pasajero, chofer, dueño de línea, administrador general
CREATE TABLE rol (
    id      TINYINT UNSIGNED PRIMARY KEY,
    clave   VARCHAR(20) NOT NULL UNIQUE,
    nombre  VARCHAR(50) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE usuario (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    rol_id         TINYINT UNSIGNED NOT NULL,
    nombre         VARCHAR(100) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    activo         TINYINT(1) NOT NULL DEFAULT 1,
    creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso  DATETIME NULL,
    CONSTRAINT fk_usuario_rol FOREIGN KEY (rol_id) REFERENCES rol(id)
) ENGINE=InnoDB;

-- Una línea pertenece a un dueño (usuario con rol dueño)
CREATE TABLE linea_transporte (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre       VARCHAR(120) NOT NULL UNIQUE,
    descripcion  VARCHAR(255) NULL,
    telefono     VARCHAR(30) NULL,
    dueno_id     INT UNSIGNED NULL,
    activa       TINYINT(1) NOT NULL DEFAULT 1,
    creado_en    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_linea_dueno FOREIGN KEY (dueno_id) REFERENCES usuario(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE chofer (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id       INT UNSIGNED NOT NULL UNIQUE,
    linea_id         INT UNSIGNED NOT NULL,
    numero_licencia  VARCHAR(30) NOT NULL UNIQUE,
    telefono         VARCHAR(30) NULL,
    activo           TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT fk_chofer_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT fk_chofer_linea   FOREIGN KEY (linea_id)   REFERENCES linea_transporte(id)
) ENGINE=InnoDB;

CREATE TABLE vehiculo (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    linea_id        INT UNSIGNED NOT NULL,
    numero_unidad   VARCHAR(20) NOT NULL,
    placa           VARCHAR(15) NOT NULL UNIQUE,
    modelo          VARCHAR(80) NULL,
    capacidad       SMALLINT UNSIGNED NULL,
    cuenta_con_gps  TINYINT(1) NOT NULL DEFAULT 1,
    climatizado     TINYINT(1) NOT NULL DEFAULT 0,
    tv_a_bordo      TINYINT(1) NOT NULL DEFAULT 0,
    accesible       TINYINT(1) NOT NULL DEFAULT 0,   -- rampa o espacio para silla de ruedas
    activo          TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY uq_vehiculo_unidad (linea_id, numero_unidad),
    CONSTRAINT fk_vehiculo_linea FOREIGN KEY (linea_id) REFERENCES linea_transporte(id)
) ENGINE=InnoDB;

CREATE TABLE ruta (
    id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    linea_id                INT UNSIGNED NOT NULL,
    codigo                  VARCHAR(10) NOT NULL,
    nombre                  VARCHAR(120) NOT NULL,
    origen                  VARCHAR(120) NOT NULL,
    destino                 VARCHAR(120) NOT NULL,
    sentido                 ENUM('ida','vuelta','circular') NOT NULL DEFAULT 'ida',
    color                   CHAR(7) NOT NULL DEFAULT '#10B981',
    tarifa                  DECIMAL(6,2) NULL,
    velocidad_promedio_kmh  DECIMAL(4,1) NOT NULL DEFAULT 18.0,
    estado_servicio         ENUM('normal','con_retrasos','suspendida') NOT NULL DEFAULT 'normal',
    aviso                   VARCHAR(255) NULL,
    activa                  TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY uq_ruta_codigo (linea_id, codigo, sentido),
    CONSTRAINT fk_ruta_linea FOREIGN KEY (linea_id) REFERENCES linea_transporte(id)
) ENGINE=InnoDB;

-- Las paradas se comparten entre rutas (una parada puede atender varias rutas)
CREATE TABLE parada (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo      VARCHAR(10) NULL UNIQUE,              -- número del poste o letrero de la parada
    nombre      VARCHAR(120) NOT NULL,
    referencia  VARCHAR(255) NULL,
    latitud     DECIMAL(9,6) NOT NULL,
    longitud    DECIMAL(9,6) NOT NULL,
    activa      TINYINT(1) NOT NULL DEFAULT 1,
    KEY idx_parada_coordenadas (latitud, longitud)
) ENGINE=InnoDB;

-- Paradas de cada ruta en el orden en que se recorren
CREATE TABLE ruta_parada (
    ruta_id    INT UNSIGNED NOT NULL,
    parada_id  INT UNSIGNED NOT NULL,
    orden      SMALLINT UNSIGNED NOT NULL,
    PRIMARY KEY (ruta_id, orden),
    UNIQUE KEY uq_ruta_parada (ruta_id, parada_id),
    CONSTRAINT fk_rp_ruta   FOREIGN KEY (ruta_id)   REFERENCES ruta(id) ON DELETE CASCADE,
    CONSTRAINT fk_rp_parada FOREIGN KEY (parada_id) REFERENCES parada(id)
) ENGINE=InnoDB;

-- Trazado (línea en el mapa) de cada ruta como secuencia ordenada de puntos
CREATE TABLE recorrido (
    ruta_id   INT UNSIGNED NOT NULL,
    orden     SMALLINT UNSIGNED NOT NULL,
    latitud   DECIMAL(9,6) NOT NULL,
    longitud  DECIMAL(9,6) NOT NULL,
    PRIMARY KEY (ruta_id, orden),
    CONSTRAINT fk_recorrido_ruta FOREIGN KEY (ruta_id) REFERENCES ruta(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE viaje (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    chofer_id    INT UNSIGNED NOT NULL,
    vehiculo_id  INT UNSIGNED NOT NULL,
    ruta_id      INT UNSIGNED NOT NULL,
    inicio       DATETIME NOT NULL,
    fin          DATETIME NULL,
    pasajeros_salida  SMALLINT UNSIGNED NULL,          -- capturado por el chofer al iniciar

    estado       ENUM('en_curso','finalizado','cancelado') NOT NULL DEFAULT 'en_curso',
    KEY idx_viaje_estado (estado, ruta_id),
    KEY idx_viaje_chofer (chofer_id, inicio),
    CONSTRAINT fk_viaje_chofer   FOREIGN KEY (chofer_id)   REFERENCES chofer(id),
    CONSTRAINT fk_viaje_vehiculo FOREIGN KEY (vehiculo_id) REFERENCES vehiculo(id),
    CONSTRAINT fk_viaje_ruta     FOREIGN KEY (ruta_id)     REFERENCES ruta(id)
) ENGINE=InnoDB;

-- Posiciones reportadas por un GPS real (usada cuando UBICACION_FUENTE = 'base_datos')
CREATE TABLE ubicacion_vehiculo (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehiculo_id    INT UNSIGNED NOT NULL,
    viaje_id       INT UNSIGNED NULL,
    latitud        DECIMAL(9,6) NOT NULL,
    longitud       DECIMAL(9,6) NOT NULL,
    registrado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ubicacion_vehiculo (vehiculo_id, registrado_en),
    CONSTRAINT fk_ubicacion_vehiculo FOREIGN KEY (vehiculo_id) REFERENCES vehiculo(id) ON DELETE CASCADE,
    CONSTRAINT fk_ubicacion_viaje    FOREIGN KEY (viaje_id)    REFERENCES viaje(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Historial de consultas del pasajero (rutas y paradas consultadas)
CREATE TABLE historial_consulta (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id     INT UNSIGNED NOT NULL,
    ruta_id        INT UNSIGNED NULL,
    parada_id      INT UNSIGNED NULL,
    consultado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_historial_usuario (usuario_id, consultado_en),
    CONSTRAINT fk_historial_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT fk_historial_ruta    FOREIGN KEY (ruta_id)    REFERENCES ruta(id) ON DELETE CASCADE,
    CONSTRAINT fk_historial_parada  FOREIGN KEY (parada_id)  REFERENCES parada(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Accidentes reportados por usuarios; los revisa el dueño de la línea o el administrador
CREATE TABLE reporte_accidente (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ruta_id        INT UNSIGNED NOT NULL,
    usuario_id     INT UNSIGNED NULL,                  -- NULL si se reportó sin iniciar sesión
    descripcion    VARCHAR(500) NOT NULL,
    contacto       VARCHAR(120) NULL,
    latitud        DECIMAL(9,6) NULL,
    longitud       DECIMAL(9,6) NULL,
    estado         ENUM('nuevo','revisado') NOT NULL DEFAULT 'nuevo',
    creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revisado_por   INT UNSIGNED NULL,
    revisado_en    DATETIME NULL,
    KEY idx_reporte_ruta (ruta_id, estado, creado_en),
    CONSTRAINT fk_reporte_ruta     FOREIGN KEY (ruta_id)      REFERENCES ruta(id) ON DELETE CASCADE,
    CONSTRAINT fk_reporte_usuario  FOREIGN KEY (usuario_id)   REFERENCES usuario(id) ON DELETE SET NULL,
    CONSTRAINT fk_reporte_revisor  FOREIGN KEY (revisado_por) REFERENCES usuario(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO rol (id, clave, nombre) VALUES
    (1, 'pasajero', 'Pasajero'),
    (2, 'chofer',   'Chofer'),
    (3, 'dueno',    'Dueño de línea'),
    (4, 'admin',    'Administrador general');
