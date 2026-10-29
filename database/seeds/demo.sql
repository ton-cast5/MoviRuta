-- Datos de demostración · Paraíso, Tabasco (municipio 014)
-- Contraseña de todas las cuentas: moviruta123
-- Ejecutar después de supabase.sql / moviruta.sql

TRUNCATE falla_vehiculo, reporte_accidente, viaje, recorrido_punto, ruta_parada,
    ruta, parada, vehiculo, chofer, linea_dueno, linea_transporte, usuario, sesion CASCADE;

-- password: moviruta123
INSERT INTO usuario (id, rol, nombre, apellido, email, password_hash, activo) VALUES
    ('USER-admin-001', 'admin', 'Administrador', 'General', 'admin@moviruta.local', '$2b$12$v6VY7iVe9sJYHwFWWLYo0u5v1Cue2g8n9nTOwNh7L/r1t5043S8LK', 1),
    ('USER-dueno-001', 'dueno', 'Martha', 'Jiménez', 'dueno.paraiso@moviruta.local', '$2b$12$v6VY7iVe9sJYHwFWWLYo0u5v1Cue2g8n9nTOwNh7L/r1t5043S8LK', 1),
    ('USER-dueno-002', 'dueno', 'Roberto', 'Salinas', 'dueno.grijalva@moviruta.local', '$2b$12$v6VY7iVe9sJYHwFWWLYo0u5v1Cue2g8n9nTOwNh7L/r1t5043S8LK', 1),
    ('USER-chofer-001', 'chofer', 'María', 'López', 'chofer.maria@moviruta.local', '$2b$12$v6VY7iVe9sJYHwFWWLYo0u5v1Cue2g8n9nTOwNh7L/r1t5043S8LK', 1),
    ('USER-chofer-002', 'chofer', 'Juan', 'Pérez', 'chofer.juan@moviruta.local', '$2b$12$v6VY7iVe9sJYHwFWWLYo0u5v1Cue2g8n9nTOwNh7L/r1t5043S8LK', 1),
    ('USER-chofer-003', 'chofer', 'Javier', 'Hernández', 'chofer.javier@moviruta.local', '$2b$12$v6VY7iVe9sJYHwFWWLYo0u5v1Cue2g8n9nTOwNh7L/r1t5043S8LK', 1),
    ('USER-pasajero-001', 'pasajero', 'Sofía', 'Hernández', 'pasajero@moviruta.local', '$2b$12$v6VY7iVe9sJYHwFWWLYo0u5v1Cue2g8n9nTOwNh7L/r1t5043S8LK', 1);

INSERT INTO linea_transporte (id, estado_clave, serie, siglas, nombre, descripcion, telefono, activa) VALUES
    ('TAB-001-TNL', 'TAB', 1, 'TNL', 'Transportadora Nicole', 'Servicio local en Paraíso y costa (demostración).', '933 000 0001', 1),
    ('TAB-002-TCP', 'TAB', 2, 'TCP', 'Transportes Costa Paraíso', 'Paraíso – Puerto Ceiba – La Isla (demostración).', '933 000 0003', 1);

INSERT INTO linea_dueno (linea_id, usuario_id) VALUES
    ('TAB-001-TNL', 'USER-dueno-001'),
    ('TAB-001-TNL', 'USER-dueno-002'),
    ('TAB-002-TCP', 'USER-dueno-001');

INSERT INTO chofer (numero_licencia, usuario_id, linea_id, telefono, seguro_vida, activo) VALUES
    ('DEMO-LIC-0001', 'USER-chofer-001', 'TAB-001-TNL', '933 100 0001', 1, 1),
    ('DEMO-LIC-0002', 'USER-chofer-002', 'TAB-001-TNL', '933 100 0002', 0, 1),
    ('DEMO-LIC-0003', 'USER-chofer-003', 'TAB-002-TCP', '933 100 0003', 1, 1);

INSERT INTO vehiculo (placa, linea_id, numero_unidad, modelo, capacidad, cuenta_con_gps, climatizado, tv_a_bordo, accesible, activo) VALUES
    ('16J-101', 'TAB-001-TNL', '16J', 'Autobús urbano 2020', 40, 1, 1, 0, 1, 1),
    ('16J-102', 'TAB-001-TNL', '17J', 'Microbús 2018', 30, 1, 0, 0, 0, 1),
    ('TCP-301', 'TAB-002-TCP', '01', 'Van 2021', 15, 1, 1, 1, 0, 1);

INSERT INTO parada (id, estado_clave, municipio_clave, serie, codigo, nombre, referencia, latitud, longitud, activa) VALUES
    ('TAB-014-0001', 'TAB', '014', 1, '201', 'Paraíso Centro', 'Frente al Palacio Municipal de Paraíso', 18.396143, -93.214774, 1),
    ('TAB-014-0002', 'TAB', '014', 2, '202', 'Terminal Paraíso', 'Av. Benito Juárez, junto a la terminal ADO', 18.402806, -93.205326, 1),
    ('TAB-014-0003', 'TAB', '014', 3, '203', 'Mercado de Paraíso', 'Mercado Municipal, Calle Melchor Ocampo', 18.400974, -93.212598, 1),
    ('TAB-014-0004', 'TAB', '014', 4, '204', 'Puerto Ceiba', 'Poblado Puerto Ceiba, Paraíso', 18.411818, -93.179109, 1),
    ('TAB-014-0005', 'TAB', '014', 5, '205', 'La Isla', 'Ranchería Andrés García (La Isla), Paraíso', 18.433227, -93.153173, 1),
    ('TAB-004-0001', 'TAB', '004', 1, '101', 'Paseo Tabasco', 'Av. Paseo Tabasco, Villahermosa', 17.993309, -92.934917, 1);

INSERT INTO ruta (id, linea_id, estado_clave, municipio_clave, serie, codigo, nombre, origen, destino, sentido, color,
                  tarifa_edu, tarifa_gral, tarifa_inapam, velocidad_promedio_kmh, estado_servicio, aviso, activa) VALUES
    ('TAB-014-0001', 'TAB-001-TNL', 'TAB', '014', 1, '1', 'Paraíso Centro-Puerto Ceiba', 'Paraíso Centro', 'Puerto Ceiba',
     'ida', '#0DAD84', 8.00, 12.00, 6.00, 28.00, 'normal', NULL, 1),
    ('TAB-014-0002', 'TAB-001-TNL', 'TAB', '014', 2, '1', 'Puerto Ceiba-Paraíso Centro', 'Puerto Ceiba', 'Paraíso Centro',
     'vuelta', '#0DAD84', 8.00, 12.00, 6.00, 28.00, 'normal', NULL, 1),
    ('TAB-014-0003', 'TAB-002-TCP', 'TAB', '014', 3, 'P1', 'Terminal Paraíso-La Isla', 'Terminal Paraíso', 'La Isla',
     'ida', '#006C49', 10.00, 15.00, 7.50, 32.00, 'normal', NULL, 1);

INSERT INTO ruta_parada (ruta_id, orden, parada_id) VALUES
    ('TAB-014-0001', 1, 'TAB-014-0001'), ('TAB-014-0001', 2, 'TAB-014-0003'), ('TAB-014-0001', 3, 'TAB-014-0004'),
    ('TAB-014-0002', 1, 'TAB-014-0004'), ('TAB-014-0002', 2, 'TAB-014-0003'), ('TAB-014-0002', 3, 'TAB-014-0001'),
    ('TAB-014-0003', 1, 'TAB-014-0002'), ('TAB-014-0003', 2, 'TAB-014-0004'), ('TAB-014-0003', 3, 'TAB-014-0005');

INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES
    ('TAB-014-0001', 1, 18.396143, -93.214774), ('TAB-014-0001', 2, 18.400974, -93.212598), ('TAB-014-0001', 3, 18.411818, -93.179109),
    ('TAB-014-0002', 1, 18.411818, -93.179109), ('TAB-014-0002', 2, 18.400974, -93.212598), ('TAB-014-0002', 3, 18.396143, -93.214774),
    ('TAB-014-0003', 1, 18.402806, -93.205326), ('TAB-014-0003', 2, 18.411818, -93.179109), ('TAB-014-0003', 3, 18.433227, -93.153173);

INSERT INTO viaje (id, chofer_id, vehiculo_id, ruta_id, inicio, fin, pasajeros_salida, estado) VALUES
    ('TNL-16J-001', 'DEMO-LIC-0001', '16J-101', 'TAB-014-0001', NOW() - INTERVAL '25 minutes', NULL, 18, 'en_curso'),
    ('TCP-01-001', 'DEMO-LIC-0003', 'TCP-301', 'TAB-014-0003', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '90 minutes', 10, 'finalizado');

INSERT INTO reporte_accidente (id, ruta_id, usuario_id, descripcion, latitud, longitud, estado, creado_en) VALUES
    ('TAB-014-0001-001', 'TAB-014-0001', 'USER-pasajero-001',
     'Choque leve entre unidad y motocicleta cerca del mercado, sin lesionados graves.',
     18.400900, -93.212500, 'nuevo', NOW() - INTERVAL '40 minutes');

INSERT INTO falla_vehiculo (id, vehiculo_id, linea_id, tipo, descripcion, impide_circular, estado, reportado_por, viaje_id, creado_en) VALUES
    ('16J-102-TAB-001-TNL-001', '16J-102', 'TAB-001-TNL', 'clima', 'Aire acondicionado no enfría.', 0, 'pendiente',
     'USER-chofer-002', NULL, NOW() - INTERVAL '1 day');

-- recorridos densos Paraíso
DELETE FROM recorrido_punto WHERE ruta_id IN ('TAB-014-0001','TAB-014-0002','TAB-014-0003');
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 1, 18.396143, -93.214774);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 2, 18.396995, -93.21521);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 3, 18.396254, -93.215507);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 4, 18.395963, -93.214854);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 5, 18.396509, -93.216076);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 6, 18.395442, -93.216682);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 7, 18.394707, -93.214995);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 8, 18.395134, -93.215968);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 9, 18.394876, -93.215404);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 10, 18.400974, -93.212598);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 11, 18.402061, -93.212114);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 12, 18.399986, -93.206631);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 13, 18.402806, -93.205326);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 14, 18.403655, -93.204993);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 15, 18.404971, -93.204776);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 16, 18.407099, -93.20488);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 17, 18.407552, -93.204659);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 18, 18.407852, -93.204282);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 19, 18.407964, -93.203945);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 20, 18.407914, -93.202469);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 21, 18.407708, -93.201234);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 22, 18.407668, -93.200094);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 23, 18.407966, -93.197845);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 24, 18.408273, -93.196826);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 25, 18.408669, -93.196337);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 26, 18.408929, -93.196198);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 27, 18.411829, -93.195045);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 28, 18.412975, -93.194078);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 29, 18.413363, -93.193443);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 30, 18.413547, -93.192515);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 31, 18.414326, -93.185416);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 32, 18.414607, -93.183598);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 33, 18.414663, -93.182461);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 34, 18.414019, -93.181005);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 35, 18.413756, -93.180245);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 36, 18.413597, -93.179442);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 37, 18.411818, -93.179109);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 1, 18.411818, -93.179109);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 2, 18.413597, -93.179442);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 3, 18.413756, -93.180245);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 4, 18.414019, -93.181005);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 5, 18.414663, -93.182461);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 6, 18.414607, -93.183598);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 7, 18.414326, -93.185416);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 8, 18.413547, -93.192515);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 9, 18.413363, -93.193443);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 10, 18.412975, -93.194078);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 11, 18.411829, -93.195045);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 12, 18.408929, -93.196198);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 13, 18.408669, -93.196337);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 14, 18.408273, -93.196826);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 15, 18.407966, -93.197845);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 16, 18.407668, -93.200094);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 17, 18.407708, -93.201234);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 18, 18.407914, -93.202469);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 19, 18.407964, -93.203945);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 20, 18.407852, -93.204282);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 21, 18.407552, -93.204659);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 22, 18.407099, -93.20488);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 23, 18.404971, -93.204776);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 24, 18.403655, -93.204993);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 25, 18.402806, -93.205326);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 26, 18.399986, -93.206631);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 27, 18.402061, -93.212114);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 28, 18.400974, -93.212598);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 29, 18.396143, -93.214774);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 1, 18.402806, -93.205326);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 2, 18.403655, -93.204993);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 3, 18.404971, -93.204776);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 4, 18.407099, -93.20488);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 5, 18.407552, -93.204659);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 6, 18.407852, -93.204282);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 7, 18.407964, -93.203945);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 8, 18.407914, -93.202469);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 9, 18.407708, -93.201234);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 10, 18.407668, -93.200094);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 11, 18.407966, -93.197845);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 12, 18.408273, -93.196826);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 13, 18.408669, -93.196337);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 14, 18.408929, -93.196198);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 15, 18.411829, -93.195045);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 16, 18.412975, -93.194078);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 17, 18.413363, -93.193443);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 18, 18.413547, -93.192515);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 19, 18.414326, -93.185416);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 20, 18.414607, -93.183598);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 21, 18.414663, -93.182461);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 22, 18.414019, -93.181005);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 23, 18.413756, -93.180245);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 24, 18.413597, -93.179442);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 25, 18.411818, -93.179109);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 26, 18.413541, -93.178611);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 27, 18.413229, -93.17521);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 28, 18.413216, -93.17463);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 29, 18.413388, -93.173887);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 30, 18.413801, -93.173259);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 31, 18.414187, -93.172865);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 32, 18.415222, -93.172119);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 33, 18.415895, -93.171772);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 34, 18.419064, -93.170777);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 35, 18.420154, -93.170305);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 36, 18.421282, -93.169698);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 37, 18.42212, -93.169363);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 38, 18.425013, -93.167925);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 39, 18.426125, -93.167509);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 40, 18.427835, -93.16723);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 41, 18.428416, -93.166908);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 42, 18.429388, -93.166176);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 43, 18.430446, -93.165665);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 44, 18.430624, -93.165452);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 45, 18.430793, -93.164935);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 46, 18.431327, -93.161319);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 47, 18.429589, -93.16025);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 48, 18.429594, -93.158371);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 49, 18.429426, -93.156359);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 50, 18.429117, -93.155386);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 51, 18.430194, -93.154771);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 52, 18.433227, -93.153173);
