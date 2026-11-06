/**
 * MoviRuta · DATOS DE DEMOSTRACIÓN (modo sin servidor)
 * Alineados al seed de Paraíso (TAB-014-…). Las contraseñas no se envían al cliente; el login usa el API.
 */
window.MR_DATOS_DEMO = {
    version: 6,
    estados: [{ clave: 'TAB', nombre: 'Tabasco' }],
    municipios: [
        { estado_clave: 'TAB', clave: '001', nombre: 'Centro' },
        { estado_clave: 'TAB', clave: '004', nombre: 'Centro (ref.)' },
        { estado_clave: 'TAB', clave: '014', nombre: 'Paraíso' },
    ],
    usuarios: [
        { id: 'USER-admin-001', rol: 'admin', nombre: 'Administrador', apellido: 'General', email: 'admin@moviruta.local', activo: true, ultimo_acceso: null },
        { id: 'USER-dueno-001', rol: 'dueno', nombre: 'Martha', apellido: 'Jiménez', email: 'dueno.paraiso@moviruta.local', activo: true, ultimo_acceso: null },
        { id: 'USER-dueno-002', rol: 'dueno', nombre: 'Roberto', apellido: 'Salinas', email: 'dueno.grijalva@moviruta.local', activo: true, ultimo_acceso: null },
        { id: 'USER-chofer-001', rol: 'chofer', nombre: 'María', apellido: 'López', email: 'chofer.maria@moviruta.local', activo: true, ultimo_acceso: null },
        { id: 'USER-chofer-002', rol: 'chofer', nombre: 'Juan', apellido: 'Pérez', email: 'chofer.juan@moviruta.local', activo: true, ultimo_acceso: null },
        { id: 'USER-chofer-003', rol: 'chofer', nombre: 'Javier', apellido: 'Hernández', email: 'chofer.javier@moviruta.local', activo: true, ultimo_acceso: null },
        { id: 'USER-pasajero-001', rol: 'pasajero', nombre: 'Sofía', apellido: 'Hernández', email: 'pasajero@moviruta.local', activo: true, ultimo_acceso: null },
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
        { id: '16J-101', placa: '16J-101', linea_id: 'TAB-001-TNL', numero_unidad: '16J', modelo: 'Autobús urbano 2020', capacidad: 40, cuenta_con_gps: true, climatizado: true, tv_a_bordo: false, accesible: true, activo: true, cuenta_con_seguro: true, nombre_seguro: 'Qualitas', poliza_seguro: 'QA-16J101-2026' },
        { id: '16J-102', placa: '16J-102', linea_id: 'TAB-001-TNL', numero_unidad: '17J', modelo: 'Microbús 2018', capacidad: 30, cuenta_con_gps: true, climatizado: false, tv_a_bordo: false, accesible: false, activo: true, cuenta_con_seguro: false, nombre_seguro: null, poliza_seguro: null },
        { id: 'TCP-301', placa: 'TCP-301', linea_id: 'TAB-002-TCP', numero_unidad: '01', modelo: 'Van 2021', capacidad: 15, cuenta_con_gps: true, climatizado: true, tv_a_bordo: true, accesible: false, activo: true, cuenta_con_seguro: true, nombre_seguro: 'GNP', poliza_seguro: 'GNP-TCP301-2026' },
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
            recorrido: [[18.396143,-93.214774],[18.396638,-93.214554],[18.397627,-93.214105],[18.398489,-93.213718],[18.399144,-93.213423],[18.399847,-93.213098],[18.400609,-93.212763],[18.400974,-93.212598],[18.40131,-93.212446],[18.402061,-93.212114],[18.401723,-93.211165],[18.401369,-93.21028],[18.401301,-93.210081],[18.401186,-93.209783],[18.401076,-93.209488],[18.400931,-93.209129],[18.400823,-93.208814],[18.400766,-93.208631],[18.400452,-93.207711],[18.400292,-93.2073],[18.400171,-93.206994],[18.40005,-93.20674],[18.400174,-93.206535],[18.400603,-93.206357],[18.401,-93.206165],[18.401598,-93.205874],[18.402289,-93.205552],[18.402515,-93.205444],[18.403655,-93.204993],[18.404296,-93.204848],[18.404659,-93.204795],[18.404971,-93.204776],[18.405152,-93.204776],[18.40538,-93.204778],[18.405973,-93.204832],[18.406339,-93.20486],[18.406833,-93.204901],[18.407099,-93.20488],[18.407259,-93.204836],[18.407552,-93.204659],[18.407722,-93.204466],[18.407852,-93.204282],[18.407925,-93.204086],[18.407968,-93.203852],[18.407959,-93.203272],[18.407914,-93.202469],[18.407708,-93.201234],[18.407663,-93.200779],[18.407652,-93.200478],[18.407668,-93.200094],[18.407864,-93.198459],[18.407966,-93.197845],[18.408125,-93.197191],[18.408273,-93.196826],[18.408496,-93.196516],[18.408669,-93.196337],[18.408929,-93.196198],[18.4093,-93.196041],[18.410643,-93.195573],[18.41152,-93.195214],[18.411829,-93.195045],[18.41262,-93.194427],[18.412975,-93.194078],[18.4132,-93.193802],[18.413363,-93.193443],[18.413461,-93.193134],[18.413547,-93.192515],[18.41363,-93.191432],[18.413698,-93.190859],[18.413902,-93.189057],[18.414122,-93.187261],[18.414326,-93.185416],[18.414464,-93.184455],[18.414566,-93.183744],[18.414587,-93.183496],[18.414609,-93.183251],[18.414653,-93.183005],[18.414663,-93.182461],[18.414352,-93.181753],[18.414091,-93.181172],[18.414019,-93.181005],[18.413756,-93.180245],[18.413658,-93.179722],[18.413597,-93.179442],[18.413541,-93.178611],[18.412708,-93.178847],[18.411818,-93.179109]],
        },
        {
            id: 'TAB-014-0002', linea_id: 'TAB-001-TNL', estado_clave: 'TAB', municipio_clave: '014', codigo: '1',
            nombre: 'Puerto Ceiba-Paraíso Centro', origen: 'Puerto Ceiba', destino: 'Paraíso Centro', sentido: 'vuelta', color: '#0DAD84',
            tarifa_edu: 8, tarifa_gral: 12, tarifa_inapam: 6, tarifa: 12, velocidad_promedio_kmh: 28, estado_servicio: 'normal', aviso: null, activa: true,
            paradas: ['TAB-014-0004', 'TAB-014-0003', 'TAB-014-0001'],
            recorrido: [[18.411818,-93.179109],[18.412708,-93.178847],[18.413541,-93.178611],[18.413597,-93.179442],[18.413658,-93.179722],[18.413756,-93.180245],[18.414019,-93.181005],[18.414091,-93.181172],[18.414352,-93.181753],[18.414605,-93.182329],[18.414822,-93.182732],[18.415081,-93.183157],[18.415158,-93.183344],[18.415094,-93.183565],[18.414943,-93.183765],[18.414721,-93.18396],[18.414586,-93.184241],[18.414256,-93.187273],[18.414113,-93.188412],[18.414029,-93.189085],[18.413931,-93.190263],[18.41388,-93.190878],[18.413846,-93.191229],[18.413671,-93.19223],[18.413636,-93.19249],[18.41361,-93.192759],[18.413575,-93.193028],[18.413481,-93.193489],[18.413383,-93.1937],[18.413262,-93.193906],[18.413101,-93.194096],[18.412752,-93.194441],[18.412325,-93.194784],[18.411802,-93.195172],[18.411589,-93.195281],[18.41083,-93.19561],[18.410121,-93.195851],[18.409173,-93.196232],[18.409006,-93.196321],[18.408831,-93.196425],[18.408475,-93.196727],[18.40836,-93.196928],[18.408263,-93.19714],[18.408089,-93.197898],[18.407948,-93.198789],[18.407835,-93.199621],[18.407769,-93.20032],[18.407792,-93.200823],[18.40786,-93.201513],[18.407945,-93.202053],[18.40798,-93.202276],[18.408037,-93.202659],[18.40806,-93.203126],[18.40806,-93.203369],[18.408066,-93.203753],[18.40802,-93.204139],[18.407898,-93.204423],[18.407671,-93.20471],[18.407451,-93.204858],[18.407301,-93.204933],[18.407105,-93.204993],[18.406659,-93.204992],[18.406212,-93.204945],[18.405961,-93.204919],[18.405634,-93.204903],[18.405184,-93.20488],[18.404639,-93.204901],[18.404405,-93.204943],[18.403756,-93.205061],[18.403479,-93.205162],[18.403078,-93.205319],[18.40265,-93.205516],[18.402451,-93.205613],[18.401844,-93.205888],[18.401662,-93.205974],[18.400727,-93.206432],[18.400246,-93.206646],[18.400168,-93.206877],[18.400292,-93.2073],[18.400393,-93.207564],[18.400766,-93.208631],[18.399901,-93.208855],[18.400165,-93.209488],[18.400437,-93.210135],[18.400645,-93.210636],[18.400234,-93.210848],[18.399835,-93.211055],[18.400216,-93.211898],[18.400408,-93.212329],[18.400609,-93.212763],[18.400974,-93.212598],[18.40131,-93.212446],[18.401626,-93.213317],[18.400974,-93.213581],[18.400189,-93.213881],[18.399451,-93.214191],[18.398814,-93.214458],[18.397936,-93.214825],[18.396995,-93.21521],[18.396254,-93.215507],[18.395963,-93.214854],[18.396143,-93.214774]],
        },
        {
            id: 'TAB-014-0003', linea_id: 'TAB-002-TCP', estado_clave: 'TAB', municipio_clave: '014', codigo: 'P1',
            nombre: 'Terminal Paraíso-La Isla', origen: 'Terminal Paraíso', destino: 'La Isla', sentido: 'ida', color: '#006C49',
            tarifa_edu: 10, tarifa_gral: 15, tarifa_inapam: 7.5, tarifa: 15, velocidad_promedio_kmh: 32, estado_servicio: 'normal', aviso: null, activa: true,
            paradas: ['TAB-014-0002', 'TAB-014-0004', 'TAB-014-0005'],
            recorrido: [[18.402806,-93.205326],[18.403655,-93.204993],[18.404296,-93.204848],[18.404659,-93.204795],[18.404971,-93.204776],[18.405152,-93.204776],[18.40538,-93.204778],[18.405973,-93.204832],[18.406339,-93.20486],[18.406833,-93.204901],[18.407099,-93.20488],[18.407259,-93.204836],[18.407552,-93.204659],[18.407722,-93.204466],[18.407852,-93.204282],[18.407925,-93.204086],[18.407968,-93.203852],[18.407959,-93.203272],[18.407914,-93.202469],[18.407708,-93.201234],[18.407663,-93.200779],[18.407652,-93.200478],[18.407668,-93.200094],[18.407864,-93.198459],[18.407966,-93.197845],[18.408125,-93.197191],[18.408273,-93.196826],[18.408496,-93.196516],[18.408669,-93.196337],[18.408929,-93.196198],[18.4093,-93.196041],[18.410643,-93.195573],[18.41152,-93.195214],[18.411829,-93.195045],[18.41262,-93.194427],[18.412975,-93.194078],[18.4132,-93.193802],[18.413363,-93.193443],[18.413461,-93.193134],[18.413547,-93.192515],[18.41363,-93.191432],[18.413698,-93.190859],[18.413902,-93.189057],[18.414122,-93.187261],[18.414326,-93.185416],[18.414464,-93.184455],[18.414566,-93.183744],[18.414587,-93.183496],[18.414609,-93.183251],[18.414653,-93.183005],[18.414663,-93.182461],[18.414352,-93.181753],[18.414091,-93.181172],[18.414019,-93.181005],[18.413756,-93.180245],[18.413658,-93.179722],[18.413597,-93.179442],[18.413541,-93.178611],[18.412708,-93.178847],[18.411818,-93.179109],[18.412708,-93.178847],[18.413541,-93.178611],[18.413481,-93.177838],[18.413415,-93.177009],[18.413327,-93.176145],[18.413229,-93.17521],[18.413216,-93.17463],[18.413292,-93.174123],[18.413388,-93.173887],[18.413523,-93.173681],[18.413801,-93.173259],[18.414187,-93.172865],[18.414418,-93.172698],[18.414632,-93.172543],[18.415222,-93.172119],[18.415895,-93.171772],[18.416692,-93.171481],[18.417636,-93.171219],[18.418524,-93.170964],[18.418861,-93.170847],[18.419064,-93.170777],[18.420154,-93.170305],[18.421282,-93.169698],[18.421558,-93.169458],[18.42182,-93.169427],[18.42212,-93.169363],[18.422896,-93.168987],[18.425013,-93.167925],[18.425827,-93.167621],[18.426125,-93.167509],[18.427013,-93.167378],[18.427835,-93.16723],[18.428416,-93.166908],[18.428958,-93.166444],[18.429388,-93.166176],[18.429874,-93.165962],[18.430182,-93.165811],[18.430446,-93.165665],[18.430624,-93.165452],[18.430639,-93.16527],[18.430657,-93.1651],[18.430793,-93.164935],[18.430536,-93.164533],[18.430302,-93.164181],[18.430463,-93.16403],[18.430439,-93.163861],[18.43061,-93.163352],[18.430878,-93.162555],[18.431327,-93.161319],[18.431115,-93.161013],[18.429589,-93.16025],[18.429591,-93.159536],[18.429594,-93.158371],[18.429426,-93.156359],[18.429138,-93.155496],[18.429489,-93.155136],[18.433227,-93.153173]],
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
