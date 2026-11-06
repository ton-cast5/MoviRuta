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

INSERT INTO vehiculo (placa, linea_id, numero_unidad, modelo, capacidad, cuenta_con_gps, climatizado, tv_a_bordo, accesible, activo, cuenta_con_seguro, nombre_seguro, poliza_seguro) VALUES
    ('16J-101', 'TAB-001-TNL', '16J', 'Autobús urbano 2020', 40, 1, 1, 0, 1, 1, 1, 'Qualitas', 'QA-16J101-2026'),
    ('16J-102', 'TAB-001-TNL', '17J', 'Microbús 2018', 30, 1, 0, 0, 0, 1, 0, NULL, NULL),
    ('TCP-301', 'TAB-002-TCP', '01', 'Van 2021', 15, 1, 1, 1, 0, 1, 1, 'GNP', 'GNP-TCP301-2026');

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

-- recorridos densos Paraíso (OSRM)
DELETE FROM recorrido_punto WHERE ruta_id IN ('TAB-014-0001','TAB-014-0002','TAB-014-0003');
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 1, 18.396143, -93.214774);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 2, 18.396638, -93.214554);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 3, 18.397627, -93.214105);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 4, 18.398489, -93.213718);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 5, 18.399144, -93.213423);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 6, 18.399847, -93.213098);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 7, 18.400609, -93.212763);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 8, 18.400974, -93.212598);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 9, 18.40131, -93.212446);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 10, 18.402061, -93.212114);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 11, 18.401723, -93.211165);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 12, 18.401369, -93.21028);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 13, 18.401301, -93.210081);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 14, 18.401186, -93.209783);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 15, 18.401076, -93.209488);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 16, 18.400931, -93.209129);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 17, 18.400823, -93.208814);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 18, 18.400766, -93.208631);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 19, 18.400452, -93.207711);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 20, 18.400292, -93.2073);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 21, 18.400171, -93.206994);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 22, 18.40005, -93.20674);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 23, 18.400174, -93.206535);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 24, 18.400603, -93.206357);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 25, 18.401, -93.206165);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 26, 18.401598, -93.205874);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 27, 18.402289, -93.205552);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 28, 18.402515, -93.205444);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 29, 18.403655, -93.204993);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 30, 18.404296, -93.204848);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 31, 18.404659, -93.204795);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 32, 18.404971, -93.204776);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 33, 18.405152, -93.204776);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 34, 18.40538, -93.204778);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 35, 18.405973, -93.204832);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 36, 18.406339, -93.20486);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 37, 18.406833, -93.204901);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 38, 18.407099, -93.20488);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 39, 18.407259, -93.204836);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 40, 18.407552, -93.204659);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 41, 18.407722, -93.204466);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 42, 18.407852, -93.204282);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 43, 18.407925, -93.204086);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 44, 18.407968, -93.203852);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 45, 18.407959, -93.203272);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 46, 18.407914, -93.202469);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 47, 18.407708, -93.201234);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 48, 18.407663, -93.200779);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 49, 18.407652, -93.200478);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 50, 18.407668, -93.200094);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 51, 18.407864, -93.198459);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 52, 18.407966, -93.197845);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 53, 18.408125, -93.197191);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 54, 18.408273, -93.196826);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 55, 18.408496, -93.196516);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 56, 18.408669, -93.196337);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 57, 18.408929, -93.196198);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 58, 18.4093, -93.196041);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 59, 18.410643, -93.195573);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 60, 18.41152, -93.195214);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 61, 18.411829, -93.195045);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 62, 18.41262, -93.194427);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 63, 18.412975, -93.194078);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 64, 18.4132, -93.193802);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 65, 18.413363, -93.193443);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 66, 18.413461, -93.193134);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 67, 18.413547, -93.192515);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 68, 18.41363, -93.191432);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 69, 18.413698, -93.190859);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 70, 18.413902, -93.189057);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 71, 18.414122, -93.187261);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 72, 18.414326, -93.185416);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 73, 18.414464, -93.184455);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 74, 18.414566, -93.183744);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 75, 18.414587, -93.183496);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 76, 18.414609, -93.183251);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 77, 18.414653, -93.183005);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 78, 18.414663, -93.182461);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 79, 18.414352, -93.181753);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 80, 18.414091, -93.181172);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 81, 18.414019, -93.181005);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 82, 18.413756, -93.180245);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 83, 18.413658, -93.179722);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 84, 18.413597, -93.179442);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 85, 18.413541, -93.178611);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 86, 18.412708, -93.178847);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0001', 87, 18.411818, -93.179109);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 1, 18.411818, -93.179109);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 2, 18.412708, -93.178847);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 3, 18.413541, -93.178611);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 4, 18.413597, -93.179442);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 5, 18.413658, -93.179722);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 6, 18.413756, -93.180245);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 7, 18.414019, -93.181005);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 8, 18.414091, -93.181172);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 9, 18.414352, -93.181753);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 10, 18.414605, -93.182329);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 11, 18.414822, -93.182732);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 12, 18.415081, -93.183157);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 13, 18.415158, -93.183344);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 14, 18.415094, -93.183565);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 15, 18.414943, -93.183765);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 16, 18.414721, -93.18396);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 17, 18.414586, -93.184241);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 18, 18.414256, -93.187273);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 19, 18.414113, -93.188412);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 20, 18.414029, -93.189085);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 21, 18.413931, -93.190263);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 22, 18.41388, -93.190878);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 23, 18.413846, -93.191229);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 24, 18.413671, -93.19223);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 25, 18.413636, -93.19249);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 26, 18.41361, -93.192759);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 27, 18.413575, -93.193028);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 28, 18.413481, -93.193489);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 29, 18.413383, -93.1937);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 30, 18.413262, -93.193906);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 31, 18.413101, -93.194096);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 32, 18.412752, -93.194441);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 33, 18.412325, -93.194784);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 34, 18.411802, -93.195172);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 35, 18.411589, -93.195281);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 36, 18.41083, -93.19561);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 37, 18.410121, -93.195851);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 38, 18.409173, -93.196232);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 39, 18.409006, -93.196321);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 40, 18.408831, -93.196425);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 41, 18.408475, -93.196727);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 42, 18.40836, -93.196928);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 43, 18.408263, -93.19714);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 44, 18.408089, -93.197898);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 45, 18.407948, -93.198789);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 46, 18.407835, -93.199621);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 47, 18.407769, -93.20032);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 48, 18.407792, -93.200823);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 49, 18.40786, -93.201513);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 50, 18.407945, -93.202053);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 51, 18.40798, -93.202276);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 52, 18.408037, -93.202659);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 53, 18.40806, -93.203126);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 54, 18.40806, -93.203369);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 55, 18.408066, -93.203753);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 56, 18.40802, -93.204139);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 57, 18.407898, -93.204423);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 58, 18.407671, -93.20471);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 59, 18.407451, -93.204858);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 60, 18.407301, -93.204933);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 61, 18.407105, -93.204993);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 62, 18.406659, -93.204992);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 63, 18.406212, -93.204945);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 64, 18.405961, -93.204919);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 65, 18.405634, -93.204903);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 66, 18.405184, -93.20488);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 67, 18.404639, -93.204901);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 68, 18.404405, -93.204943);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 69, 18.403756, -93.205061);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 70, 18.403479, -93.205162);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 71, 18.403078, -93.205319);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 72, 18.40265, -93.205516);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 73, 18.402451, -93.205613);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 74, 18.401844, -93.205888);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 75, 18.401662, -93.205974);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 76, 18.400727, -93.206432);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 77, 18.400246, -93.206646);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 78, 18.400168, -93.206877);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 79, 18.400292, -93.2073);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 80, 18.400393, -93.207564);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 81, 18.400766, -93.208631);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 82, 18.399901, -93.208855);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 83, 18.400165, -93.209488);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 84, 18.400437, -93.210135);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 85, 18.400645, -93.210636);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 86, 18.400234, -93.210848);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 87, 18.399835, -93.211055);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 88, 18.400216, -93.211898);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 89, 18.400408, -93.212329);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 90, 18.400609, -93.212763);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 91, 18.400974, -93.212598);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 92, 18.40131, -93.212446);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 93, 18.401626, -93.213317);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 94, 18.400974, -93.213581);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 95, 18.400189, -93.213881);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 96, 18.399451, -93.214191);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 97, 18.398814, -93.214458);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 98, 18.397936, -93.214825);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 99, 18.396995, -93.21521);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 100, 18.396254, -93.215507);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 101, 18.395963, -93.214854);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0002', 102, 18.396143, -93.214774);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 1, 18.402806, -93.205326);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 2, 18.403655, -93.204993);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 3, 18.404296, -93.204848);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 4, 18.404659, -93.204795);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 5, 18.404971, -93.204776);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 6, 18.405152, -93.204776);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 7, 18.40538, -93.204778);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 8, 18.405973, -93.204832);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 9, 18.406339, -93.20486);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 10, 18.406833, -93.204901);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 11, 18.407099, -93.20488);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 12, 18.407259, -93.204836);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 13, 18.407552, -93.204659);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 14, 18.407722, -93.204466);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 15, 18.407852, -93.204282);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 16, 18.407925, -93.204086);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 17, 18.407968, -93.203852);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 18, 18.407959, -93.203272);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 19, 18.407914, -93.202469);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 20, 18.407708, -93.201234);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 21, 18.407663, -93.200779);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 22, 18.407652, -93.200478);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 23, 18.407668, -93.200094);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 24, 18.407864, -93.198459);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 25, 18.407966, -93.197845);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 26, 18.408125, -93.197191);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 27, 18.408273, -93.196826);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 28, 18.408496, -93.196516);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 29, 18.408669, -93.196337);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 30, 18.408929, -93.196198);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 31, 18.4093, -93.196041);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 32, 18.410643, -93.195573);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 33, 18.41152, -93.195214);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 34, 18.411829, -93.195045);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 35, 18.41262, -93.194427);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 36, 18.412975, -93.194078);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 37, 18.4132, -93.193802);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 38, 18.413363, -93.193443);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 39, 18.413461, -93.193134);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 40, 18.413547, -93.192515);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 41, 18.41363, -93.191432);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 42, 18.413698, -93.190859);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 43, 18.413902, -93.189057);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 44, 18.414122, -93.187261);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 45, 18.414326, -93.185416);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 46, 18.414464, -93.184455);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 47, 18.414566, -93.183744);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 48, 18.414587, -93.183496);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 49, 18.414609, -93.183251);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 50, 18.414653, -93.183005);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 51, 18.414663, -93.182461);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 52, 18.414352, -93.181753);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 53, 18.414091, -93.181172);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 54, 18.414019, -93.181005);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 55, 18.413756, -93.180245);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 56, 18.413658, -93.179722);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 57, 18.413597, -93.179442);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 58, 18.413541, -93.178611);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 59, 18.412708, -93.178847);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 60, 18.411818, -93.179109);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 61, 18.412708, -93.178847);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 62, 18.413541, -93.178611);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 63, 18.413481, -93.177838);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 64, 18.413415, -93.177009);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 65, 18.413327, -93.176145);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 66, 18.413229, -93.17521);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 67, 18.413216, -93.17463);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 68, 18.413292, -93.174123);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 69, 18.413388, -93.173887);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 70, 18.413523, -93.173681);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 71, 18.413801, -93.173259);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 72, 18.414187, -93.172865);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 73, 18.414418, -93.172698);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 74, 18.414632, -93.172543);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 75, 18.415222, -93.172119);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 76, 18.415895, -93.171772);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 77, 18.416692, -93.171481);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 78, 18.417636, -93.171219);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 79, 18.418524, -93.170964);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 80, 18.418861, -93.170847);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 81, 18.419064, -93.170777);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 82, 18.420154, -93.170305);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 83, 18.421282, -93.169698);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 84, 18.421558, -93.169458);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 85, 18.42182, -93.169427);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 86, 18.42212, -93.169363);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 87, 18.422896, -93.168987);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 88, 18.425013, -93.167925);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 89, 18.425827, -93.167621);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 90, 18.426125, -93.167509);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 91, 18.427013, -93.167378);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 92, 18.427835, -93.16723);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 93, 18.428416, -93.166908);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 94, 18.428958, -93.166444);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 95, 18.429388, -93.166176);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 96, 18.429874, -93.165962);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 97, 18.430182, -93.165811);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 98, 18.430446, -93.165665);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 99, 18.430624, -93.165452);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 100, 18.430639, -93.16527);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 101, 18.430657, -93.1651);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 102, 18.430793, -93.164935);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 103, 18.430536, -93.164533);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 104, 18.430302, -93.164181);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 105, 18.430463, -93.16403);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 106, 18.430439, -93.163861);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 107, 18.43061, -93.163352);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 108, 18.430878, -93.162555);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 109, 18.431327, -93.161319);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 110, 18.431115, -93.161013);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 111, 18.429589, -93.16025);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 112, 18.429591, -93.159536);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 113, 18.429594, -93.158371);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 114, 18.429426, -93.156359);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 115, 18.429138, -93.155496);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 116, 18.429489, -93.155136);
INSERT INTO recorrido_punto (ruta_id, orden, latitud, longitud) VALUES ('TAB-014-0003', 117, 18.433227, -93.153173);
