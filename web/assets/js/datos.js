/**
 * MoviRuta · DATOS DE DEMOSTRACIÓN (modo sin servidor)
 * Alineados al seed de Paraíso (TAB-014-…). Contraseña: moviruta123
 */
window.MR_DATOS_DEMO = {
    version: 4,
    estados: [{ clave: 'TAB', nombre: 'Tabasco' }],
    municipios: [
        { estado_clave: 'TAB', clave: '001', nombre: 'Centro' },
        { estado_clave: 'TAB', clave: '004', nombre: 'Centro (ref.)' },
        { estado_clave: 'TAB', clave: '014', nombre: 'Paraíso' },
    ],
    usuarios: [
        { id: 'USER-admin-001', rol: 'admin', nombre: 'Administrador', apellido: 'General', email: 'admin@moviruta.local', password: 'moviruta123', activo: true, ultimo_acceso: null },
        { id: 'USER-dueno-001', rol: 'dueno', nombre: 'Martha', apellido: 'Jiménez', email: 'dueno.paraiso@moviruta.local', password: 'moviruta123', activo: true, ultimo_acceso: null },
        { id: 'USER-dueno-002', rol: 'dueno', nombre: 'Roberto', apellido: 'Salinas', email: 'dueno.grijalva@moviruta.local', password: 'moviruta123', activo: true, ultimo_acceso: null },
        { id: 'USER-chofer-001', rol: 'chofer', nombre: 'María', apellido: 'López', email: 'chofer.maria@moviruta.local', password: 'moviruta123', activo: true, ultimo_acceso: null },
        { id: 'USER-chofer-002', rol: 'chofer', nombre: 'Juan', apellido: 'Pérez', email: 'chofer.juan@moviruta.local', password: 'moviruta123', activo: true, ultimo_acceso: null },
        { id: 'USER-chofer-003', rol: 'chofer', nombre: 'Javier', apellido: 'Hernández', email: 'chofer.javier@moviruta.local', password: 'moviruta123', activo: true, ultimo_acceso: null },
        { id: 'USER-pasajero-001', rol: 'pasajero', nombre: 'Sofía', apellido: 'Hernández', email: 'pasajero@moviruta.local', password: 'moviruta123', activo: true, ultimo_acceso: null },
    ],
    lineas: [
        { id: 'TAB-001-TNL', estado_clave: 'TAB', siglas: 'TNL', nombre: 'Transportadora Nicole', descripcion: 'Servicio local en Paraíso y costa (demostración).', telefono: '933 000 0001', duenos: ['USER-dueno-001', 'USER-dueno-002'], activa: true },
        { id: 'TAB-002-TCP', estado_clave: 'TAB', siglas: 'TCP', nombre: 'Transportes Costa Paraíso', descripcion: 'Paraíso – Puerto Ceiba – La Isla (demostración).', telefono: '933 000 0003', duenos: ['USER-dueno-001'], activa: true },
    ],
    choferes: [
        { id: 'DEMO-LIC-0001', usuario_id: 'USER-chofer-001', linea_id: 'TAB-001-TNL', numero_licencia: 'DEMO-LIC-0001', telefono: '933 100 0001', seguro_vida: true, activo: true },
        { id: 'DEMO-LIC-0002', usuario_id: 'USER-chofer-002', linea_id: 'TAB-001-TNL', numero_licencia: 'DEMO-LIC-0002', telefono: '933 100 0002', seguro_vida: false, activo: true },
        { id: 'DEMO-LIC-0003', usuario_id: 'USER-chofer-003', linea_id: 'TAB-002-TCP', numero_licencia: 'DEMO-LIC-0003', telefono: '933 100 0003', seguro_vida: true, activo: true },
    ],
    vehiculos: [
        { id: '16J-101', placa: '16J-101', linea_id: 'TAB-001-TNL', numero_unidad: '16J', modelo: 'Autobús urbano 2020', capacidad: 40, cuenta_con_gps: true, climatizado: true, tv_a_bordo: false, accesible: true, activo: true },
        { id: '16J-102', placa: '16J-102', linea_id: 'TAB-001-TNL', numero_unidad: '17J', modelo: 'Microbús 2018', capacidad: 30, cuenta_con_gps: true, climatizado: false, tv_a_bordo: false, accesible: false, activo: true },
        { id: 'TCP-301', placa: 'TCP-301', linea_id: 'TAB-002-TCP', numero_unidad: '01', modelo: 'Van 2021', capacidad: 15, cuenta_con_gps: true, climatizado: true, tv_a_bordo: true, accesible: false, activo: true },
    ],
    paradas: [
        { id: 'TAB-014-0001', estado_clave: 'TAB', municipio_clave: '014', codigo: '201', nombre: 'Paraíso Centro', referencia: 'Frente al Palacio Municipal de Paraíso', latitud: 18.396143, longitud: -93.214774, activa: true },
        { id: 'TAB-014-0002', estado_clave: 'TAB', municipio_clave: '014', codigo: '202', nombre: 'Terminal Paraíso', referencia: 'Av. Benito Juárez, junto a la terminal ADO', latitud: 18.402806, longitud: -93.205326, activa: true },
        { id: 'TAB-014-0003', estado_clave: 'TAB', municipio_clave: '014', codigo: '203', nombre: 'Mercado de Paraíso', referencia: 'Mercado Municipal, Calle Melchor Ocampo', latitud: 18.400974, longitud: -93.212598, activa: true },
        { id: 'TAB-014-0004', estado_clave: 'TAB', municipio_clave: '014', codigo: '204', nombre: 'Puerto Ceiba', referencia: 'Poblado Puerto Ceiba, Paraíso', latitud: 18.411818, longitud: -93.179109, activa: true },
        { id: 'TAB-014-0005', estado_clave: 'TAB', municipio_clave: '014', codigo: '205', nombre: 'La Isla', referencia: 'Ranchería Andrés García (La Isla), Paraíso', latitud: 18.433227, longitud: -93.153173, activa: true },
    ],
    rutas: [
        {
            id: 'TAB-014-0001', linea_id: 'TAB-001-TNL', estado_clave: 'TAB', municipio_clave: '014', codigo: '1',
            nombre: 'Paraíso Centro-Puerto Ceiba', origen: 'Paraíso Centro', destino: 'Puerto Ceiba', sentido: 'ida', color: '#0DAD84',
            tarifa_edu: 8, tarifa_gral: 12, tarifa_inapam: 6, tarifa: 12, velocidad_promedio_kmh: 28, estado_servicio: 'normal', aviso: null, activa: true,
            paradas: ['TAB-014-0001', 'TAB-014-0003', 'TAB-014-0004'],
            recorrido: [[18.396143,-93.214774],[18.396995,-93.21521],[18.396254,-93.215507],[18.395963,-93.214854],[18.396509,-93.216076],[18.395442,-93.216682],[18.394707,-93.214995],[18.395134,-93.215968],[18.394876,-93.215404],[18.400974,-93.212598],[18.402061,-93.212114],[18.399986,-93.206631],[18.402806,-93.205326],[18.403655,-93.204993],[18.404971,-93.204776],[18.407099,-93.20488],[18.407552,-93.204659],[18.407852,-93.204282],[18.407964,-93.203945],[18.407914,-93.202469],[18.407708,-93.201234],[18.407668,-93.200094],[18.407966,-93.197845],[18.408273,-93.196826],[18.408669,-93.196337],[18.408929,-93.196198],[18.411829,-93.195045],[18.412975,-93.194078],[18.413363,-93.193443],[18.413547,-93.192515],[18.414326,-93.185416],[18.414607,-93.183598],[18.414663,-93.182461],[18.414019,-93.181005],[18.413756,-93.180245],[18.413597,-93.179442],[18.411818,-93.179109]],
        },
        {
            id: 'TAB-014-0002', linea_id: 'TAB-001-TNL', estado_clave: 'TAB', municipio_clave: '014', codigo: '1',
            nombre: 'Puerto Ceiba-Paraíso Centro', origen: 'Puerto Ceiba', destino: 'Paraíso Centro', sentido: 'vuelta', color: '#0DAD84',
            tarifa_edu: 8, tarifa_gral: 12, tarifa_inapam: 6, tarifa: 12, velocidad_promedio_kmh: 28, estado_servicio: 'normal', aviso: null, activa: true,
            paradas: ['TAB-014-0004', 'TAB-014-0003', 'TAB-014-0001'],
            recorrido: [[18.411818,-93.179109],[18.413597,-93.179442],[18.413756,-93.180245],[18.414019,-93.181005],[18.414663,-93.182461],[18.414607,-93.183598],[18.414326,-93.185416],[18.413547,-93.192515],[18.413363,-93.193443],[18.412975,-93.194078],[18.411829,-93.195045],[18.408929,-93.196198],[18.408669,-93.196337],[18.408273,-93.196826],[18.407966,-93.197845],[18.407668,-93.200094],[18.407708,-93.201234],[18.407914,-93.202469],[18.407964,-93.203945],[18.407852,-93.204282],[18.407552,-93.204659],[18.407099,-93.20488],[18.404971,-93.204776],[18.403655,-93.204993],[18.402806,-93.205326],[18.399986,-93.206631],[18.402061,-93.212114],[18.400974,-93.212598],[18.396143,-93.214774]],
        },
        {
            id: 'TAB-014-0003', linea_id: 'TAB-002-TCP', estado_clave: 'TAB', municipio_clave: '014', codigo: 'P1',
            nombre: 'Terminal Paraíso-La Isla', origen: 'Terminal Paraíso', destino: 'La Isla', sentido: 'ida', color: '#006C49',
            tarifa_edu: 10, tarifa_gral: 15, tarifa_inapam: 7.5, tarifa: 15, velocidad_promedio_kmh: 32, estado_servicio: 'normal', aviso: null, activa: true,
            paradas: ['TAB-014-0002', 'TAB-014-0004', 'TAB-014-0005'],
            recorrido: [[18.402806,-93.205326],[18.403655,-93.204993],[18.404971,-93.204776],[18.407099,-93.20488],[18.407552,-93.204659],[18.407852,-93.204282],[18.407964,-93.203945],[18.407914,-93.202469],[18.407708,-93.201234],[18.407668,-93.200094],[18.407966,-93.197845],[18.408273,-93.196826],[18.408669,-93.196337],[18.408929,-93.196198],[18.411829,-93.195045],[18.412975,-93.194078],[18.413363,-93.193443],[18.413547,-93.192515],[18.414326,-93.185416],[18.414607,-93.183598],[18.414663,-93.182461],[18.414019,-93.181005],[18.413756,-93.180245],[18.413597,-93.179442],[18.411818,-93.179109],[18.413541,-93.178611],[18.413229,-93.17521],[18.413216,-93.17463],[18.413388,-93.173887],[18.413801,-93.173259],[18.414187,-93.172865],[18.415222,-93.172119],[18.415895,-93.171772],[18.419064,-93.170777],[18.420154,-93.170305],[18.421282,-93.169698],[18.42212,-93.169363],[18.425013,-93.167925],[18.426125,-93.167509],[18.427835,-93.16723],[18.428416,-93.166908],[18.429388,-93.166176],[18.430446,-93.165665],[18.430624,-93.165452],[18.430793,-93.164935],[18.431327,-93.161319],[18.429589,-93.16025],[18.429594,-93.158371],[18.429426,-93.156359],[18.429117,-93.155386],[18.430194,-93.154771],[18.433227,-93.153173]],
        },
    ],
    viajes: [
        { id: 'TNL-16J-001', chofer_id: 'DEMO-LIC-0001', vehiculo_id: '16J-101', ruta_id: 'TAB-014-0001', hace_min: 25, pasajeros_salida: 18, estado: 'en_curso' },
        { id: 'TCP-01-001', chofer_id: 'DEMO-LIC-0003', vehiculo_id: 'TCP-301', ruta_id: 'TAB-014-0003', hace_min: 120, duracion_min: 30, pasajeros_salida: 10, estado: 'finalizado' },
    ],
    reportes: [
        { id: 'TAB-014-0001-001', ruta_id: 'TAB-014-0001', usuario_id: 'USER-pasajero-001', descripcion: 'Choque leve cerca del mercado (demostración).', latitud: 18.4009, longitud: -93.2125, estado: 'nuevo', hace_min: 40, revisado_por: null, revisado_hace_min: null },
    ],
    fallas: [
        { id: '16J-102-TAB-001-TNL-001', vehiculo_id: '16J-102', tipo: 'clima', descripcion: 'Aire acondicionado no enfría.', impide_circular: false, estado: 'pendiente', reportado_por: 'USER-chofer-002', viaje_id: null, hace_min: 1440, atendido_por: null, nota_solucion: null, resuelto_hace_min: null },
    ],
};
