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
