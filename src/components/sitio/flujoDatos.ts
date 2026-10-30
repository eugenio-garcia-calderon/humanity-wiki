// ============================================================================
// LOS DATOS DE LA VISTA «FLUJO» (2026-10-30, Eugenio)
// ============================================================================
// «El sistema operativo de la humanidad, para el alcance de país, con España»:
// cada sistema y cada conexión entre sistemas, con mucho detalle — cómo funciona,
// sus indicadores, los fallos del sistema y las mejoras propuestas. Todo lo que se
// ve en la vista Flujo sale de este archivo: para cambiar un texto o un dato se
// cambia aquí, sin tocar el componente (`VistaFlujoSitio.tsx`); los dibujos, en
// `flujoDibujos.tsx`.
//
// El estilo de la casa, para que todo sea homogéneo:
//   · frases cortas, en el castellano de la calle;
//   · cada dato con su año, redondeado (≈ cuando es aproximado);
//   · en `claves` y en `regula`, cada pieza es «Nombre — qué es o qué hace»;
//   · los fallos empiezan por el problema; las mejoras, por un verbo en infinitivo;
//   · el semáforo es honesto: `bien` | `regular` | `mal`, comparando con la UE.

/** El semáforo de un indicador: cómo está España, normalmente comparada con la UE. */
export type Semaforo = 'bien' | 'regular' | 'mal';

/** Un indicador del país: nombre, valor (con unidad), año y semáforo. */
export type Indicador = {
  n: string;
  v: string;
  ano?: number;
  s: Semaforo;
  /** La fuente del dato (INE, Eurostat, CGPJ…). */
  f?: string;
  /** Una coletilla corta: el contexto o la comparación («media UE: 6 %»). */
  nota?: string;
};

/** El detalle que se abre al pinchar un sistema o una conexión. */
export type Detalle = {
  /** Cómo funciona, en 2-4 párrafos cortos. */
  como: string[];
  /** Las piezas clave: instituciones (en un sistema) o leyes y flujos (en una conexión), «Nombre — qué hace». */
  claves: string[];
  /** Los indicadores de España, 4-7. */
  indicadores: Indicador[];
  /** Los fallos del sistema, cada uno emparejado con la mejora que lo ataca (2026-10-30, Eugenio: «mejora el tema de
   *  los fallos y conéctalo con las propuestas de mejora»): parejas [fallo, mejora], 3-5 por elemento. El fallo
   *  empieza por el problema, concreto y con dato; la mejora, por un verbo en infinitivo. */
  arreglos: Array<[string, string]>;
};

/** Un sistema del país: una tarjeta de la pizarra. */
export type Sistema = {
  id: string;
  titulo: string;
  /** Una línea que lo resume, para la tarjeta. */
  resumen: string;
  /** Quién trabaja en él. */
  quien?: string;
  /** Dos datos gancho para la tarjeta: [valor, etiqueta]. */
  destacados: Array<[string, string]>;
  detalle: Detalle;
};

/** Una conexión entre dos sistemas: una flecha que se puede pinchar. */
export type Conexion = {
  de: string;
  a: string;
  /** El nombre corto que va en la pastilla de la flecha. */
  nombre: string;
  resumen: string;
  detalle: Detalle;
};

export const idDe = (c: Conexion) => `${c.de}>${c.a}`;

/** Las constantes vitales del país, para la banda de arriba. */
export const VITALES: Indicador[] = [
  { n: 'Población', f: 'INE', v: '48,8 M', ano: 2024, s: 'bien', nota: '4.º país de la UE' },
  { n: 'PIB', f: 'INE', v: '1,6 billones €', ano: 2024, s: 'bien', nota: '≈32.000 € por persona' },
  { n: 'Paro', f: 'EPA (INE)', v: '10,4 %', ano: 2025, s: 'mal', nota: 'el más alto de la UE' },
  { n: 'Deuda pública', f: 'Banco de España', v: '102 % del PIB', ano: 2024, s: 'mal', nota: 'media UE: ≈82 %' },
  { n: 'Esperanza de vida', f: 'Eurostat', v: '≈84 años', ano: 2023, s: 'bien', nota: 'la más alta de la UE' },
  { n: 'Desigualdad (Gini)', f: 'Eurostat', v: '31,5', ano: 2023, s: 'regular', nota: 'media UE: ≈29,6' },
  { n: 'Alquiler en 10 años', f: 'idealista', v: '+≈70 %', ano: 2024, s: 'mal', nota: 'los sueldos subieron mucho menos' },
];

// ----------------------------------------------------------------------------
// LOS SISTEMAS
// ----------------------------------------------------------------------------
export const SISTEMAS: Sistema[] = [
  {
    id: 'ley', titulo: 'Ley', quien: 'Legisladores, juristas, letrados',
    resumen: 'Las reglas del juego: la Constitución, las leyes y los reglamentos que obligan a todos.',
    destacados: [['1978', 'Constitución vigente'], ['≈11.000', 'normas nuevas al año']],
    detalle: {
      como: [
        'Las Cortes aprueban las leyes; el Gobierno las desarrolla con reglamentos; y el BOE las publica, que es cuando empiezan a obligar.',
        'Hay una jerarquía: la Constitución manda sobre todo; debajo van los tratados (y el derecho de la UE), las leyes orgánicas y ordinarias, y al final los reglamentos.',
        'Las 17 comunidades autónomas también legislan en sus competencias (sanidad, educación, vivienda…), así que una empresa o una familia vive bajo tres capas de normas: la europea, la estatal y la autonómica.',
      ],
      claves: [
        'Constitución de 1978 — la norma suprema; solo el Tribunal Constitucional puede interpretar si algo la contradice',
        'Leyes orgánicas — las que tocan derechos fundamentales; necesitan mayoría absoluta del Congreso',
        'Real decreto-ley — norma urgente del Gobierno con rango de ley; el Congreso la convalida después',
        'BOE — el boletín oficial: lo que no se publica, no obliga',
        'Derecho de la UE — los reglamentos europeos se aplican directos; las directivas hay que transponerlas',
      ],
      indicadores: [
        { n: 'Normas nuevas al año (Estado + CCAA)', f: 'CEOE', v: '≈11.000', ano: 2023, s: 'mal', nota: 'inflación normativa' },
        { n: 'Páginas de normativa estatal al año', f: 'BOE', v: '≈12.000', ano: 2023, s: 'mal' },
        { n: 'Normas con rango de ley por decreto-ley', f: 'Congreso', v: '≈1 de cada 3', ano: 2023, s: 'mal', nota: 'la vía urgente como costumbre' },
        { n: 'Déficit de transposición de directivas UE', f: 'Comisión Europea', v: '1,1 %', ano: 2023, s: 'regular', nota: 'de los peores de la UE' },
        { n: 'Tiempo del Tribunal Constitucional por recurso', f: 'Memorias del TC', v: '≈5 años', ano: 2023, s: 'mal' },
      ],

      arreglos: [
        ['Inflación normativa: se aprueban tantas normas que ni los juristas llegan a leerlas; la seguridad jurídica se resiente.',
         'Poner fecha de caducidad (revisión obligatoria) a las normas temporales, para que el montón deje de crecer solo.'],
        ['Abuso del decreto-ley: la vía pensada para urgencias se usa como atajo ordinario, con menos debate parlamentario.',
         'Reservar el decreto-ley para urgencias reales: lo demás, a las Cortes con debate y plazos.'],
        ['Normas sin consolidar: para saber qué está vigente hay que cruzar la ley original con años de parches.',
         'Publicar textos consolidados oficiales el mismo día que se aprueba un cambio.'],
        ['Casi nadie evalúa si una ley consiguió lo que prometía: se legisla y no se mide.',
         'Evaluar cada ley a los 2-3 años con datos públicos: qué prometía, qué consiguió, qué costó.'],
        ['17 regulaciones autonómicas distintas para lo mismo rompen la unidad de mercado.',
         'Armonizar entre comunidades las reglas que fragmentan el mercado.'],
      ],    },
  },
  {
    id: 'politica', titulo: 'Poder político', quien: 'Cargos electos, partidos, gobiernos de los tres niveles',
    resumen: 'Quien decide el rumbo: elecciones, Cortes, Gobierno, partidos, comunidades y ayuntamientos.',
    destacados: [['66 %', 'votó en las generales de 2023'], ['3', 'niveles de gobierno: Estado, 17 CCAA y ≈8.100 municipios']],
    detalle: {
      como: [
        'Cada cuatro años (como mucho) se vota: el Congreso se reparte por provincias con un sistema proporcional, el Congreso inviste al presidente y el presidente forma Gobierno. El Senado, de segunda lectura, pesa poco.',
        'El poder está muy repartido: el Estado marca las grandes reglas, las 17 comunidades gestionan la mayor parte de los servicios (sanidad, educación) con parlamentos propios, y los ayuntamientos ponen lo cercano.',
        'Entre elecciones, el juego lo llevan los partidos: deciden las listas (cerradas), pactan los gobiernos y marcan la agenda. Desde 2015 casi nadie gobierna solo: coaliciones y pactos de investidura son la norma.',
      ],
      claves: [
        'Congreso de los Diputados — 350 escaños; hace las leyes e inviste (o tumba) al presidente',
        'Senado — cámara territorial de segunda lectura; el Congreso siempre tiene la última palabra',
        'Gobierno — dirige el país y la Administración; gobierna también por decreto-ley',
        'Partidos políticos — deciden candidatos y pactos; con listas cerradas, el partido manda más que el votante',
        'Comunidades autónomas — 17 gobiernos y parlamentos propios; gestionan la mayor parte del gasto social',
        'Ayuntamientos — ≈8.100 municipios; el gobierno más cercano y el que menos dinero maneja',
      ],
      indicadores: [
        { n: 'Participación en las generales', f: 'Mº Interior', v: '66 %', ano: 2023, s: 'regular', nota: 'llegó a superar el 70 % en otras citas' },
        { n: 'Confianza en los partidos', f: 'CIS', v: 'de las más bajas (CIS)', ano: 2024, s: 'mal', nota: 'la clase política, entre los primeros problemas del país' },
        { n: 'Mujeres en el Congreso', f: 'Congreso', v: '≈44 %', ano: 2023, s: 'bien', nota: 'de los parlamentos más igualados de la UE' },
        { n: 'Elecciones generales repetidas por no lograr investidura', v: '2 veces (2016 y 2019)', s: 'mal' },
        { n: 'Bloqueo de la renovación del CGPJ', v: '5 años (2018-2024)', s: 'mal', nota: 'el órgano de gobierno de los jueces, caducado' },
      ],

      arreglos: [
        ['Polarización: los grandes partidos pactan poco incluso en lo que están de acuerdo; los pactos de Estado casi han desaparecido.',
         'Abrir canales de participación continua (paneles ciudadanos, consultas) donde se delibera con datos, fuera de la guerra de bloques.'],
        ['Cortoplacismo: el horizonte real es la siguiente elección (4 años); nadie planifica a 20.',
         'Pactar a largo plazo lo que no cabe en una legislatura: pensiones, agua, energía, educación.'],
        ['Listas cerradas: el votante elige partido, no personas; la lealtad se debe al aparato, no al ciudadano.',
         'Abrir las listas para que el votante pueda ordenar o tachar candidatos.'],
        ['Bloqueo de instituciones: los órganos que exigen acuerdo (CGPJ, RTVE, Tribunal Constitucional) se renuevan tarde o se reparten por cuotas.',
         'Desbloquear por ley las renovaciones: si no hay acuerdo en plazo, mecanismo automático.'],
        ['Las promesas electorales no se evalúan: nadie mide oficialmente qué se cumplió y qué no.',
         'Evaluar en público el cumplimiento de promesas: un panel oficial que compare programa y hechos cada año.'],
      ],    },
  },
  {
    id: 'justicia', titulo: 'Justicia · Seguridad', quien: 'Jueces, fiscales, abogados, policías, personal de prisiones',
    resumen: 'Quien hace cumplir las reglas: juzgados que resuelven conflictos, policía que protege y prisiones que custodian.',
    destacados: [['0,7', 'homicidios por 100.000 hab.: de los países más seguros'], ['≈11', 'jueces por 100.000 hab. (media UE: ≈22)']],
    detalle: {
      como: [
        'Los juzgados se ordenan por materias (civil, penal, contencioso, social) y por pisos: del juzgado de primera instancia a las audiencias, los tribunales superiores y, arriba del todo, el Tribunal Supremo. El CGPJ gobierna a los jueces.',
        'La seguridad se reparte: Policía Nacional en las ciudades, Guardia Civil en el resto del territorio, policías autonómicas donde existen (Ertzaintza, Mossos, Policía Foral) y policías locales en los municipios.',
        'Las prisiones dependen del Ministerio del Interior (y de la Generalitat y el Gobierno Vasco en sus territorios): custodian a unas 56.000 personas con el mandato constitucional de reinsertar.',
      ],
      claves: [
        'Tribunal Supremo — la última palabra judicial en todos los órdenes',
        'CGPJ — el gobierno de los jueces: nombra, asciende y sanciona; sus vocales los eligen las Cortes',
        'Fiscalía — acusa en nombre del Estado; su jefe lo propone el Gobierno',
        'Policía Nacional y Guardia Civil — ≈150.000 agentes; seguridad ciudadana, fronteras y tráfico',
        'Policías autonómicas y locales — la seguridad más cercana; decenas de miles de agentes más',
        'Instituciones Penitenciarias — ≈70 centros; custodia y reinserción',
        'Justicia gratuita y turno de oficio — abogado pagado por el Estado para quien no puede pagarlo',
      ],
      indicadores: [
        { n: 'Jueces por 100.000 habitantes', f: 'CEPEJ', v: '≈11', ano: 2023, s: 'mal', nota: 'media europea: ≈22' },
        { n: 'Duración media de un pleito civil en primera instancia', f: 'CGPJ', v: '≈1 año', ano: 2023, s: 'mal', nota: 'con recursos, varios años' },
        { n: 'Asuntos pendientes en los juzgados', f: 'CGPJ', v: '≈3,5 M', ano: 2024, s: 'mal', nota: 'el atasco crece año a año' },
        { n: 'Homicidios por 100.000 habitantes', f: 'Eurostat', v: '≈0,7', ano: 2023, s: 'bien', nota: 'de los más bajos de la UE: punto fuerte' },
        { n: 'Población reclusa', f: 'Mº Interior', v: '≈56.000', ano: 2024, s: 'regular', nota: 'tasa algo superior a la media de Europa occidental' },
      ],

      arreglos: [
        ['La lentitud es el fallo número uno: un pleito con recursos tarda años, y justicia que llega tarde no es justicia.',
         'Potenciar la mediación y el arbitraje para que no todo acabe en juicio.'],
        ['Faltan medios: la mitad de jueces que la media europea, y una plantilla estable que no da abasto, sostenida por sustitutos e interinos.',
         'Acercar la plantilla de jueces y letrados a la media europea con un plan plurianual.'],
        ['Digitalización desigual: cada comunidad tiene su sistema informático y no se hablan entre sí.',
         'Unificar el expediente judicial digital: un solo sistema compatible en toda España.'],
        ['Politización del CGPJ: las Cortes eligen a sus vocales por cuotas de partido, y su renovación estuvo bloqueada 5 años.',
         'Despolitizar el CGPJ: que la mayoría de sus vocales jueces los elijan los propios jueces, como pide Europa.'],
        ['Macrocausas eternas: la instrucción de los casos grandes (corrupción, fraude) tarda tanto que algunos delitos prescriben.',
         'Poner plazos reales a la instrucción con los medios para cumplirlos.'],
      ],    },
  },
  {
    id: 'administracion', titulo: 'La Administración pública', quien: 'Funcionarios y empleados públicos de los tres niveles',
    resumen: 'La maquinaria del Estado: recauda, paga pensiones, da servicios y tramita, desde Hacienda hasta el ayuntamiento.',
    destacados: [['≈3,5 M', 'empleados públicos'], ['≈38 %', 'del PIB recaudado (media UE: ≈41 %)']],
    detalle: {
      como: [
        'La Administración es la maquinaria que ejecuta lo que la ley manda. Dos piezas mueven el dinero: la AEAT (Hacienda) recauda los impuestos y la Seguridad Social cobra cotizaciones y paga pensiones y prestaciones.',
        'Hay tres niveles: el Estado (ministerios y organismos), las 17 comunidades (que gestionan sanidad, educación y servicios sociales: la mayor parte del gasto cercano) y ≈8.100 ayuntamientos (basura, agua, urbanismo).',
        'Trabajan en ella ≈3,5 millones de personas, entre funcionarios de carrera y personal laboral. Se entra por oposición, un sistema garantista pero lento que puede tardar años.',
      ],
      claves: [
        'AEAT (Hacienda) — recauda los grandes impuestos: IRPF, IVA, Sociedades',
        'Seguridad Social — cotizaciones, pensiones, bajas y prestaciones',
        'Administración General del Estado — ministerios, delegaciones y organismos públicos',
        '17 comunidades autónomas — gestionan la mayor parte del gasto social del país',
        '≈8.100 ayuntamientos — el mostrador más cercano; la mayoría, pueblos de menos de 1.000 vecinos',
        'Función pública — acceso por oposición; ≈3,5 M de empleados públicos',
      ],
      indicadores: [
        { n: 'Recaudación (presión fiscal)', f: 'Eurostat', v: '≈38 % del PIB', ano: 2023, s: 'regular', nota: 'media UE: ≈41 %' },
        { n: 'Economía sumergida', f: 'estimaciones (Gestha)', v: '≈15-20 % del PIB', ano: 2023, s: 'mal', nota: 'estimaciones; muy por encima de los países del norte' },
        { n: 'Empleados públicos', f: 'Función Pública', v: '≈3,5 M', ano: 2024, s: 'regular', nota: '≈1 de cada 6 empleos; en línea con la OCDE' },
        { n: 'Empleados públicos de más de 50 años', f: 'Función Pública', v: '≈4 de cada 10', ano: 2023, s: 'mal', nota: 'jubilación masiva la próxima década' },
        { n: 'Servicios públicos digitales', f: 'Comisión Europea (DESI)', v: 'entre los mejores de la UE', ano: 2024, s: 'bien', nota: 'punto fuerte reconocido en los índices europeos' },
        { n: 'Temporalidad en el sector público', f: 'EPA (INE)', v: '≈30 %', ano: 2022, s: 'mal', nota: 'el objetivo pactado con la UE es el 8 %' },
      ],

      arreglos: [
        ['La burocracia pesa: papeles que la propia Administración ya tiene, plazos que se incumplen y lenguaje que no se entiende.',
         'No pedir nunca al ciudadano un dato que la Administración ya tiene: aplicar de verdad la ley.'],
        ['La cita previa, pensada para ordenar, se ha vuelto barrera: sin cita no hay mostrador, y sin internet no hay cita.',
         'Garantizar atención presencial sin cita para quien la necesite; la cita previa como opción, no como muro.'],
        ['Interinidad crónica: cientos de miles de empleados encadenaron contratos temporales durante años.',
         'Estabilizar las plantillas: sacar a oposición las plazas estructurales en vez de encadenar contratos temporales.'],
        ['Duplicidades entre niveles: tres administraciones hacen a veces lo mismo sin coordinarse, y el ciudadano no sabe a cuál ir.',
         'Clarificar quién hace qué entre Estado, comunidades y ayuntamientos, y eliminar duplicidades.'],
        ['El relevo no está preparado: con 4 de cada 10 empleados cerca de la jubilación, el conocimiento se va por la puerta.',
         'Planificar el relevo generacional: oposiciones ágiles y transferencia del conocimiento antes de las jubilaciones.'],
      ],    },
  },
  {
    id: 'economia', titulo: 'Economía', quien: 'Trabajadores, empresas, bancos, Banco de España',
    resumen: 'El dinero del país: lo que 48,8 millones de personas producen, ganan y gastan cada año.',
    destacados: [['1,6 billones €', 'de PIB en 2024'], ['10,4 %', 'de paro, el más alto de la UE']],
    detalle: {
      como: [
        'España produce ≈1,6 billones de euros al año. Tres de cada cuatro salen de los servicios: turismo, comercio, transporte, banca… La industria aporta ≈16 % y el campo, ≈3 %. El turismo pesa ≈12-13 % del PIB: en 2024 vinieron ≈94 millones de visitantes, récord histórico.',
        'La moneda es el euro: el Banco Central Europeo fija los tipos de interés para los 20 países que lo comparten, y el Banco de España supervisa la banca. España ya no puede devaluar ni imprimir moneda: compite con lo que produce.',
        'El trabajo es la pata coja: hay ≈22 millones de personas empleadas, récord, pero el paro sigue en ≈10,4 % (el más alto de la UE) y el juvenil en ≈26 %. El salario mínimo es de 1.184 €/mes en 14 pagas (2025).',
      ],
      claves: [
        'Euro y BCE — la moneda común; el BCE fija el precio del dinero para toda la zona euro',
        'Banco de España — supervisa la banca y mide la economía; ya no fija tipos ni emite moneda',
        'INE — mide el PIB, el paro (la EPA) y los precios (el IPC): los datos de los que todo depende',
        'SMI — el salario mínimo: 1.184 €/mes en 14 pagas (2025); lo cobran ≈2 M de personas',
        'Turismo — ≈12-13 % del PIB; 2.º país del mundo en visitantes, tras Francia',
      ],
      indicadores: [
        { n: 'PIB', f: 'INE', v: '1,6 billones €', ano: 2024, s: 'bien', nota: '4.ª economía de la UE; por persona, por debajo de la media' },
        { n: 'Paro', f: 'EPA (INE)', v: '10,4 %', ano: 2025, s: 'mal', nota: 'media UE: ≈6 %' },
        { n: 'Paro juvenil', f: 'EPA (INE)', v: '≈26 %', ano: 2025, s: 'mal', nota: 'de los más altos de la UE' },
        { n: 'Inflación', f: 'INE', v: '≈3 %', ano: 2024, s: 'regular', nota: 'el objetivo del BCE es el 2 %' },
        { n: 'Deuda pública', f: 'Banco de España', v: '102 % del PIB', ano: 2024, s: 'mal', nota: 'media UE: ≈82 %' },
        { n: 'Gasto en I+D', f: 'INE', v: '1,5 % del PIB', ano: 2023, s: 'mal', nota: 'media UE: ≈2,2 %' },
      ],

      arreglos: [
        ['El paro no baja del 10 % ni en los años buenos: dobla la media europea y se ceba con los jóvenes y los mayores de 50.',
         'Enlazar la formación con las vacantes reales: FP dual pactada con las empresas de cada comarca.'],
        ['Mercado laboral partido en dos: quien lleva años dentro tiene empleo estable; quien entra encadena contratos cortos y sueldos bajos.',
         'Cerrar la brecha entre fijos y eventuales: que entrar al mercado no condene a encadenar contratos cortos.'],
        ['La productividad lleva ≈20 años casi estancada: se trabaja mucho y se produce poco por hora, así que los sueldos no suben.',
         'Diversificar hacia sectores de más valor por hora trabajada: industria verde, agroalimentaria y tecnológica.'],
        ['Vivienda disparada: el alquiler ha subido ≈70 % en 10 años, mucho más que los sueldos; emanciparse espera hasta los ≈30 años.',
         'Construir vivienda asequible a gran escala y agilizar licencias para que el alquiler deje de comerse el sueldo.'],
        ['Poca inversión en I+D (1,5 % del PIB frente al 2,2 % de la UE): la economía depende demasiado del sol y del ladrillo.',
         'Subir la inversión en I+D hasta la media europea (2,2 % del PIB) con carrera estable para quien investiga.'],
      ],    },
  },
  {
    id: 'empresa', titulo: 'La empresa', quien: 'Empresarios, autónomos, trabajadores',
    resumen: 'Quien produce y da empleo: 3,2 millones de empresas, casi todas muy pequeñas.',
    destacados: [['≈3,2 M', 'empresas activas'], ['94 %', 'con menos de 10 empleados']],
    detalle: {
      como: [
        'En España hay ≈3,2 millones de empresas y ≈3,3 millones de autónomos. El 94 % tiene menos de 10 empleados: el tejido real es el bar, la tienda, el taller y la explotación familiar. Las grandes son una excepción contada.',
        'Esa excepción demuestra que sí se puede: Inditex es la mayor textil del mundo, Iberdrola está entre las mayores eléctricas y el Santander hace banca en una decena de países. Nacieron aquí y compiten con cualquiera.',
        'España exporta ≈390.000 M€ en bienes al año (2023): coches, alimentos, química y maquinaria. El gran cliente es Europa: dos de cada tres euros exportados se quedan en la UE.',
      ],
      claves: [
        'Pymes y micro — el 99,8 % de las empresas; dan ≈2 de cada 3 empleos privados',
        'Autónomos — ≈3,3 M de personas por cuenta propia; desde 2023 cotizan por ingresos reales',
        'Grandes empresas — Inditex, Iberdrola o Santander: las que compiten en el mundo y tiran de las demás',
        'Exportaciones — ≈390.000 M€ al año en bienes (2023); coches, alimentos, química y maquinaria',
        'Patronales y cámaras — CEOE, Cepyme y ATA: la voz de las empresas ante el Gobierno',
      ],
      indicadores: [
        { n: 'Empresas activas', f: 'INE', v: '≈3,2 M', ano: 2024, s: 'bien' },
        { n: 'Con menos de 10 empleados', f: 'INE', v: '94 %', ano: 2024, s: 'regular', nota: 'el tamaño pequeño resta productividad' },
        { n: 'Tamaño medio', f: 'Eurostat', v: '≈5 empleados', ano: 2024, s: 'regular', nota: 'en Alemania, ≈12' },
        { n: 'Autónomos', f: 'Seguridad Social', v: '≈3,3 M', ano: 2024, s: 'regular', nota: 'muchos sin relevo a la vista' },
        { n: 'Exportaciones de bienes', f: 'Mº Economía', v: '≈390.000 M€', ano: 2023, s: 'bien', nota: '≈2 de cada 3 € van a la UE' },
        { n: 'I+D pagada por las empresas', f: 'INE', v: '≈0,8 % del PIB', ano: 2023, s: 'mal', nota: 'media UE: ≈1,5 %' },
      ],

      arreglos: [
        ['Empresas demasiado pequeñas: con un 94 % de micro, falta músculo para innovar, exportar y pagar mejores sueldos.',
         'Premiar el crecimiento: que ganar tamaño no dispare las cargas de golpe, sino poco a poco.'],
        ['Poca innovación: las empresas invierten en I+D casi la mitad que la media europea (≈0,8 % del PIB frente a ≈1,5 %).',
         'Conectar las pymes con universidades y centros tecnológicos para que innovar no sea cosa solo de grandes.'],
        ['Demasiados huevos en la misma cesta: turismo y construcción tiran del empleo pero caen a la vez en cada crisis, y dos de cada tres euros exportados dependen de Europa.',
         'Diversificar la exportación hacia Asia y América para no depender de un solo cliente ni de un solo sector.'],
        ['Sin relevo generacional: miles de bares, comercios y explotaciones agrarias cierran cada año porque nadie toma el testigo cuando el dueño se jubila.',
         'Facilitar el relevo: una ventanilla de traspasos y ayudas a quien coja un negocio viable antes de que cierre.'],
      ],    },
  },
  {
    id: 'servicios', titulo: 'Servicios públicos', quien: 'Sanitarios, docentes, funcionarios',
    resumen: 'Lo que el Estado garantiza a todos: sanidad, educación, pensiones, cuidados y transporte.',
    destacados: [['≈84 años', 'de esperanza de vida, la más alta de la UE'], ['≈10,3 M', 'de pensiones contributivas al mes']],
    detalle: {
      como: [
        'La sanidad es universal: atiende a todos y la gestionan las 17 comunidades. Cuesta ≈7 % del PIB en gasto público, en la media europea, y con eso logra una de las esperanzas de vida más altas del mundo: mucho resultado por el dinero que entra. La grieta son las esperas: ≈120 días de media para operarse (2024).',
        'La educación obligatoria es gratuita y la gestionan también las comunidades. Las pensiones van por otra caja: la Seguridad Social paga ≈10,3 millones de pensiones contributivas cada mes con las cotizaciones de quien trabaja hoy; es un sistema de reparto, sin hucha que dure, y cuesta ≈12-13 % del PIB.',
        'La ley de dependencia ayuda a quien no puede valerse solo, pero con lista de espera de meses o años. Y el transporte tiene un orgullo nacional: el AVE, la 2.ª red de alta velocidad del mundo tras China, con ≈4.000 km.',
      ],
      claves: [
        'Sanidad pública — universal y gratuita en el uso; la gestionan las 17 CCAA',
        'Educación pública — obligatoria y gratuita de los 6 a los 16 años; también autonómica',
        'Pensiones — sistema de reparto: las cotizaciones de hoy pagan las pensiones de hoy',
        'Dependencia — ayudas a quien no puede valerse solo; cofinanciada entre Estado y CCAA',
        'Transporte público — AVE, cercanías y autobuses; la alta velocidad como escaparate',
      ],
      indicadores: [
        { n: 'Esperanza de vida', f: 'Eurostat', v: '≈84 años', ano: 2023, s: 'bien', nota: 'la más alta de la UE' },
        { n: 'Espera media para operarse', f: 'Mº Sanidad', v: '≈120 días', ano: 2024, s: 'mal', nota: 'en máximos históricos' },
        { n: 'Gasto público en sanidad', f: 'Mº Sanidad', v: '≈7 % del PIB', ano: 2023, s: 'regular', nota: 'media UE, con mejores resultados' },
        { n: 'Pensiones pagadas', f: 'Seguridad Social', v: '≈10,3 M', ano: 2025, s: 'regular', nota: 'contributivas; ≈12-13 % del PIB' },
        { n: 'Cotizantes por pensionista', f: 'Seguridad Social', v: '≈2,3', ano: 2024, s: 'mal', nota: 'y bajando al jubilarse la generación más numerosa' },
        { n: 'Abandono escolar temprano', f: 'Eurostat', v: '≈13 %', ano: 2024, s: 'regular', nota: 'media UE: ≈9,5 %' },
      ],

      arreglos: [
        ['Listas de espera récord: ≈120 días para una operación y semanas para el especialista; quien puede se paga un seguro privado (≈12 M de personas ya lo tienen).',
         'Atacar las listas de espera con datos públicos por hospital y cirugía programada también por las tardes.'],
        ['La España vaciada se queda sin servicios: el médico, el colegio o la ventanilla a decenas de kilómetros.',
         'Garantizar servicios mínimos por comarca: consultorio, escuela y transporte a demanda en el medio rural.'],
        ['Dependencia con espera de meses o años: decenas de miles de personas mueren cada año con la ayuda reconocida y sin cobrarla.',
         'Resolver la dependencia en el plazo legal de 6 meses, con financiación suficiente de Estado y CCAA.'],
        ['Pensiones tensionadas por la demografía: ≈2,3 cotizantes por pensionista, y bajando, justo cuando se jubila la generación más numerosa.',
         'Complementar el reparto con ahorro: planes de pensiones de empleo para quien quiera sumar.'],
        ['Abandono escolar del ≈13 %, de los más altos de la UE, y demasiados alumnos repitiendo curso.',
         'Detectar pronto a quien se descuelga: refuerzo individual y plazas de FP atractivas antes de que deje los estudios.'],
      ],    },
  },
  {
    id: 'tecnicas', titulo: 'Técnicas · Ciencias', quien: 'Ingenieros, investigadores, técnicos, operarios',
    resumen: 'La capa que produce de verdad: energía, agua, construcción, transporte, comunicaciones y ciencia.',
    destacados: [['1,5 %', 'del PIB en I+D (media UE: 2,2 %)'], ['10.ª', 'potencia del mundo en ciencia publicada']],
    detalle: {
      como: [
        'La energía va a dos velocidades: en 2024 el ≈57 % de la electricidad fue renovable, récord histórico, con sol y viento cada vez más baratos. Pero el país sigue importando ≈70 % de su energía primaria: el gas y el petróleo vienen de fuera y se pagan a precio de mundo.',
        'El agua y el techo son los frentes tensos: ≈1.200 embalses regulan un país seco donde el regadío usa ≈80 % del agua; y se terminan ≈90.000 viviendas al año frente a las ≈600.000 de 2006, muchas menos que los hogares que se crean.',
        'Moverse y comunicarse funciona bien: AVE con ≈4.000 km, los puertos de Algeciras y Valencia entre los mayores de Europa, y fibra óptica en más del 90 % de los hogares, en cabeza de la UE.',
        'La ciencia tiene una joya y una carencia: España lleva más de 30 años como líder mundial en trasplantes de órganos, pero solo invierte 1,5 % del PIB en I+D y el talento investigador se marcha.',
      ],
      claves: [
        'Red Eléctrica — opera el sistema eléctrico; en 2024, ≈57 % renovable',
        'Embalses y regadío — ≈1.200 embalses; el campo usa ≈80 % del agua',
        'AVE y puertos — ≈4.000 km de alta velocidad; Algeciras y Valencia entre los mayores puertos de Europa',
        'Fibra óptica — llega a más de 9 de cada 10 hogares, en cabeza de la UE',
        'ONT — la organización de trasplantes: líder mundial desde hace más de 30 años',
        'CSIC y universidades — el grueso de la investigación pública del país',
      ],
      indicadores: [
        { n: 'Gasto en I+D', f: 'INE', v: '1,5 % del PIB', ano: 2023, s: 'mal', nota: 'media UE: ≈2,2 %' },
        { n: 'Producción científica', f: 'SCImago', v: '10.ª del mundo', ano: 2024, s: 'bien', nota: 'en número de publicaciones' },
        { n: 'Patentes europeas al año', f: 'Oficina Europea de Patentes', v: '≈2.000', ano: 2024, s: 'mal', nota: 'Alemania: ≈25.000' },
        { n: 'Personal dedicado a I+D', f: 'INE', v: '≈250.000', ano: 2023, s: 'regular', nota: 'creciendo, pero con contratos frágiles' },
        { n: 'Edad de plaza estable del investigador', f: 'Mº Ciencia', v: '≈40 años', ano: 2024, s: 'mal', nota: 'tras encadenar becas y contratos' },
      ],

      arreglos: [
        ['Faltan viviendas: se terminan ≈90.000 al año y se crean bastantes más hogares; el déficit acumulado se estima en cientos de miles (≈600.000 según el Banco de España).',
         'Construir vivienda a escala industrial: suelo público, prefabricación y licencias en meses, no en años.'],
        ['Fuga de talento: investigadores formados aquí encadenan becas y acaban en el extranjero por falta de plazas y de sueldo.',
         'Dar carrera estable al investigador: contratos largos y menos papeleo para quedarse en España.'],
        ['Dependencia tecnológica: chips, nube y software vienen de fuera; cada crisis de suministro para fábricas y obras.',
         'Atraer fabricación de chips y nube europea con los fondos ya aprobados, antes de que caduquen.'],
        ['Agua al límite: sequías más largas, embalses a media carga y un regadío que se lleva ≈80 % del recurso.',
         'Modernizar el agua: goteo, reutilización de depuradas y tarifas que premien el ahorro.'],
      ],    },
  },
  {
    id: 'objetivos', titulo: 'Objetivos', quien: 'Toda la gente: familias, cuidadores, servicios sociales',
    resumen: 'Lo que la gente necesita y quiere: salud, alimento, hogar, seguridad, aprecio y una vida propia.',
    destacados: [['≈84 años', 'de esperanza de vida: la más alta de la UE'], ['1,12', 'hijos por mujer: de los más bajos del mundo']],
    detalle: {
      como: [
        'Un país existe para que su gente viva bien. Eso se puede ordenar en seis necesidades: salud, alimento, hogar, integridad (que nadie te dañe), aprecio y amor, y autonomía (poder decidir tu vida).',
        'España mide el bienestar con encuestas e indicadores: la esperanza de vida, la satisfacción con la propia vida, la tasa AROPE (riesgo de pobreza o exclusión), la edad a la que los jóvenes se van de casa o los hijos por mujer.',
        'La foto es doble: en salud y longevidad España está arriba del todo; en pobreza, vivienda y natalidad, abajo. Se vive mucho, pero cuesta arrancar una vida propia.',
      ],
      claves: [
        'Salud — sanidad pública universal; la base de la esperanza de vida récord',
        'Alimento — dieta mediterránea y despensa propia; la inseguridad alimentaria severa es rara',
        'Hogar — el gran cuello de botella: sin casa asequible, todo lo demás se retrasa',
        'Integridad — uno de los países con menos homicidios del mundo',
        'Aprecio y amor — familia y calle como red; la soledad no deseada crece',
        'Autonomía — empleo y vivienda estables para decidir tu vida; es lo que más tarde llega',
      ],
      indicadores: [
        { n: 'Esperanza de vida', f: 'Eurostat', v: '≈84 años', ano: 2023, s: 'bien', nota: 'la más alta de la UE' },
        { n: 'Satisfacción con la propia vida', f: 'Eurostat', v: '≈7 sobre 10', ano: 2023, s: 'regular', nota: 'en la media de la UE' },
        { n: 'Riesgo de pobreza o exclusión (AROPE)', f: 'INE', v: '≈26 %', ano: 2024, s: 'mal', nota: 'media UE: ≈21 %' },
        { n: 'Edad media de emancipación', f: 'Eurostat', v: '≈30 años', ano: 2023, s: 'mal', nota: 'media UE: ≈26; de las más tardías' },
        { n: 'Hijos por mujer', f: 'INE', v: '1,12', ano: 2023, s: 'mal', nota: 'de los más bajos del mundo; relevo: 2,1' },
        { n: 'Pobreza infantil', f: 'Eurostat', v: '≈28 %', ano: 2023, s: 'mal', nota: 'de las peores de la UE' },
      ],

      arreglos: [
        ['La vivienda inaccesible retrasa toda la vida adulta: emanciparse a los 30 aplaza la pareja, los hijos y el ahorro.',
         'Abaratar la vivienda para jóvenes: más alquiler asequible y suelo público que no se venda.'],
        ['Pobreza infantil enquistada: ≈28 % de los niños en riesgo, de las tasas más altas de la UE, y se hereda.',
         'Implantar una prestación por crianza universal, como los países que frenaron la pobreza infantil.'],
        ['La salud mental juvenil empeora: más ansiedad y autolesiones, con pocos psicólogos en la pública.',
         'Reforzar la salud mental en primaria: psicólogos en centros de salud e institutos.'],
        ['Soledad no deseada en aumento: afecta sobre todo a mayores que viven solos y a jóvenes.',
         'Medir el bienestar (soledad, salud mental, conciliación) con la misma seriedad que el PIB, para llegar a tiempo a quien se queda solo.'],
        ['Natalidad hundida: se tienen menos hijos de los que se desean, por precariedad y vivienda.',
         'Facilitar tener hijos: permisos, escuelas infantiles gratuitas y horarios racionales.'],
      ],    },
  },
  {
    id: 'recursos', titulo: 'Recursos', quien: 'Agricultores, gestores del agua, ingenieros, demógrafos',
    resumen: 'Con qué cuenta España: territorio, sol, agua escasa, campo potente, pocas materias primas y una población que envejece.',
    destacados: [['506.000 km²', 'de territorio: 2.º país más grande de la UE'], ['≈45 %', 'del aceite de oliva del mundo']],
    detalle: {
      como: [
        'Todo sistema funciona con lo que hay debajo: tierra, agua, sol, materiales, tiempo y gente. España tiene mucho de unas cosas y poco de otras.',
        'Sobra sol: es el país con mayor potencial solar de la UE. Falta agua: es un país semiárido que vive de embalses y pasa sequías cada vez más largas.',
        'El campo es potencia mundial (primer viñedo del planeta por superficie, casi la mitad del aceite de oliva), pero el subsuelo da poco: casi todos los combustibles y muchos minerales se compran fuera.',
        'Y el recurso más escaso es la gente joven: la edad media ronda los 45 años y cada generación es más corta que la anterior.',
      ],
      claves: [
        'Territorio — 506.000 km², el segundo país más grande de la UE, con mucho interior vacío',
        'Agua — ≈1.200 grandes presas, de los países con más embalses del mundo; aun así, sequías',
        'Sol — el mayor potencial solar de la UE; la base de la apuesta renovable',
        'Suelo agrícola — primer viñedo mundial por superficie y ≈45 % del aceite de oliva del mundo',
        'Materias primas — poca minería propia: energía, metales y chips se compran fuera',
        'Gente — 48,8 M de habitantes que envejecen; el talento formado a veces se va',
      ],
      indicadores: [
        { n: 'Horas de sol al año', f: 'AEMET', v: '≈2.500-3.000', ano: 2024, s: 'bien', nota: 'de las más altas de Europa' },
        { n: 'Capacidad de los embalses', f: 'MITECO', v: '≈56.000 hm³', ano: 2024, s: 'regular', nota: 'mucha presa, pero lluvia cada vez más irregular' },
        { n: 'Superficie de viñedo', f: 'OIV', v: '≈930.000 ha', ano: 2023, s: 'bien', nota: 'la mayor del mundo' },
        { n: 'Dependencia energética del exterior', f: 'Eurostat', v: '≈70 %', ano: 2023, s: 'mal', nota: 'media UE: ≈58 %' },
        { n: 'Edad media de la población', f: 'INE', v: '≈45 años', ano: 2024, s: 'mal', nota: 'en 2000 era ≈38' },
        { n: 'Mayores de 65 años', f: 'INE', v: '≈20 %', ano: 2024, s: 'mal', nota: 'hacia ≈30 % en 2050' },
      ],

      arreglos: [
        ['El agua está mal repartida: llueve en el norte y se cultiva en el sur, y las sequías son cada vez más largas.',
         'Modernizar el regadío y reutilizar agua depurada antes de pedir más trasvases.'],
        ['Dependencia energética y de materiales: sin gas, petróleo ni minerales clave propios, cada crisis exterior se paga cara.',
         'Asegurar energía y materiales críticos: renovables propias, reciclaje, acuerdos estables y alguna mina propia bien regulada.'],
        ['Invierno demográfico: menos nacimientos que muertes desde 2015; sin migración, la población caería.',
         'Atraer y ordenar la migración que compensa el invierno demográfico.'],
        ['El talento formado aquí se marcha: investigadores y sanitarios que cuesta recuperar.',
         'Retener el talento con carreras estables en ciencia y sanidad.'],
        ['Mucho interior despoblado: la mitad del territorio tiene muy poca gente y pierde servicios.',
         'Fijar población en el interior: empleo ligado a renovables y agro, vivienda asequible y servicios básicos por comarca.'],
      ],    },
  },
  {
    id: 'valores', titulo: 'Valores y principios', quien: 'Familias, escuela, medios, asociaciones, iglesias',
    resumen: 'El pacto de fondo: libertad, igualdad, justicia y pluralismo; una sociedad muy tolerante que desconfía de sus instituciones.',
    destacados: [['1978', 'el pacto de la Constitución'], ['≈9 de cada 10', 'aceptan el matrimonio igualitario: de lo más alto del mundo']],
    detalle: {
      como: [
        'Los valores son el acuerdo tácito sobre lo que está bien. En España el pacto escrito es la Constitución de 1978: libertad, igualdad, justicia y pluralismo político como valores superiores.',
        'La sociedad va por delante del tópico: España está entre los países más tolerantes del mundo con la diversidad sexual y entre los mejores en igualdad de género según varios índices.',
        'El punto débil es la confianza: la gente confía regular en los demás y poco en partidos, gobiernos y grandes instituciones. Y la corrupción que se percibe es mayor que la que se mide.',
      ],
      claves: [
        'Constitución de 1978 — el pacto: libertad, igualdad, justicia y pluralismo como valores superiores',
        'Tolerancia — matrimonio igualitario legal desde 2005; aceptación social de las más altas del mundo',
        'Igualdad de género — entre los 10-15 primeros países del mundo en varios índices',
        'Confianza interpersonal — media: se confía en los cercanos, menos en el desconocido',
        'Confianza institucional — baja: partidos y políticos, siempre al fondo de las encuestas',
        'Transparencia — leyes de transparencia y portales públicos, aún con agujeros',
      ],
      indicadores: [
        { n: 'Aceptación del matrimonio igualitario', f: 'Pew Research', v: '≈9 de cada 10', ano: 2023, s: 'bien', nota: 'de las más altas del mundo' },
        { n: 'Igualdad de género (índices internacionales)', v: 'entre los 10-15 primeros', ano: 2024, s: 'bien' },
        { n: 'Confianza en los demás', f: 'CIS', v: '≈5-6 sobre 10', ano: 2023, s: 'regular', nota: 'media europea' },
        { n: 'Confianza en los partidos políticos', f: 'CIS', v: '≈2-3 sobre 10', ano: 2024, s: 'mal', nota: 'lo peor valorado del país' },
        { n: 'Percepción de corrupción (Transparencia Internacional)', f: 'TI', v: '≈60 sobre 100', ano: 2023, s: 'regular', nota: 'puesto ≈36 del mundo; Dinamarca: 90' },
      ],

      arreglos: [
        ['La desconfianza institucional lo encarece todo: sin confianza no hay pactos de Estado ni reformas que duren.',
         'Ejecutar y contar: la confianza se recupera cumpliendo lo prometido y enseñando las cuentas.'],
        ['Polarización creciente: la política se vive como guerra de bloques y contagia a medios y familias.',
         'Enseñar deliberación desde la escuela: debatir con datos, no con bandos.'],
        ['La corrupción percibida es mayor que la medida: los casos sonados pesan más que los datos, y eso también desgasta.',
         'Blindar los órganos de control (CNMC, Transparencia, RTVE) con nombramientos despolitizados.'],
        ['La transparencia se queda a medias: muchas respuestas tardías o incompletas a quien pide información pública.',
         'Responder a las peticiones de transparencia en plazo y con sanción si no se hace.'],
      ],    },
  },
  {
    id: 'educacion', titulo: 'Educación · Conocimiento', quien: 'Maestros, profesores, investigadores, familias',
    resumen: 'Donde el país aprende: 8 millones de alumnos, universidades públicas potentes y una fábrica de talento con fugas.',
    destacados: [['≈8 M', 'de alumnos no universitarios'], ['13 %', 'de abandono temprano: era el 30 % en 2008']],
    detalle: {
      como: [
        'Por las aulas españolas pasan ≈8 millones de alumnos no universitarios y ≈1,7 millones de universitarios. La red es mayoritariamente pública, con la concertada como segunda pata.',
        'Las comunidades autónomas gestionan la educación; el Estado fija el marco. Ese marco ha cambiado mucho: ocho leyes educativas en democracia, casi una por gobierno.',
        'La gran victoria reciente es el abandono escolar temprano: del 30 % en 2008 al ≈13 % en 2024, aunque sigue sobre la media europea. La FP, y en especial la FP dual (aprender trabajando), crece con fuerza.',
        'Arriba, la universidad pública es buena base pero ninguna española está entre las 100 primeras del mundo, y la investigación vive con un gasto en I+D muy por debajo de la media europea.',
      ],
      claves: [
        'Colegios e institutos — la base: ≈8 M de alumnos, red pública y concertada',
        'FP y FP dual — el oficio con empresa desde el aula; la matrícula que más crece',
        'Universidades — ≈50 públicas y ≈40 privadas; buena base, poca punta',
        'CSIC — el mayor organismo público de investigación del país',
        'Becas — la palanca de igualdad: más de un millón de beneficiarios al año',
        'Leyes educativas — 8 en democracia: el marco cambia casi con cada gobierno',
      ],
      indicadores: [
        { n: 'Abandono escolar temprano', f: 'Eurostat', v: '13 %', ano: 2024, s: 'regular', nota: 'media UE: ≈9,5 %; en 2008 era el 30 %' },
        { n: 'PISA matemáticas', f: 'OCDE (PISA)', v: '≈474 puntos', ano: 2022, s: 'regular', nota: 'en la media OCDE, lejos de los punteros' },
        { n: 'Alumnos que han repetido curso a los 15 años', f: 'OCDE (PISA)', v: '≈22 %', ano: 2022, s: 'mal', nota: 'de las tasas más altas de la OCDE' },
        { n: 'Estudiantes universitarios', f: 'Mº Universidades', v: '≈1,7 M', ano: 2024, s: 'bien' },
        { n: 'Gasto en I+D', f: 'INE', v: '1,5 % del PIB', ano: 2023, s: 'mal', nota: 'media UE: ≈2,2 %' },
      ],

      arreglos: [
        ['La repetición de curso sigue siendo de las más altas de la OCDE: repetir apenas mejora el aprendizaje y multiplica el abandono.',
         'Sustituir la repetición por refuerzo temprano e individual, como hacen los países que mejor puntúan.'],
        ['El origen social pesa demasiado: la diferencia de resultados entre barrios ricos y pobres equivale a cursos enteros.',
         'Dar más recursos a los centros con alumnado vulnerable, no café para todos.'],
        ['Ocho leyes educativas en democracia: cada cambio de gobierno reabre el marco y los centros viven en obras.',
         'Pactar de una vez una ley educativa estable, con el acuerdo de al menos dos tercios del Congreso.'],
        ['Fuga de investigadores: se forman aquí y publican fuera, porque la carrera científica propia no da estabilidad.',
         'Subir el gasto en I+D hacia la media europea con carrera investigadora estable.'],
        ['Desconexión con el empleo: carreras masificadas junto a oficios técnicos sin candidatos.',
         'Duplicar la FP dual y ligar la oferta de plazas a los empleos reales de cada zona.'],
      ],    },
  },
  {
    id: 'ecologia', titulo: 'Ecología', quien: 'Agentes forestales, científicos, agricultores, ecologistas',
    resumen: 'La casa común: el país más biodiverso de Europa occidental, con renovables al alza y un suelo que se seca.',
    destacados: [['57 %', 'de la electricidad fue renovable en 2024'], ['≈75 %', 'del territorio en riesgo de desertificación a largo plazo']],
    detalle: {
      como: [
        'España es el país más biodiverso de Europa occidental: de alta montaña a desierto, con linces, osos y aves que ya no quedan en el resto del continente. Cerca del 30 % del territorio está protegido en la Red Natura 2000, de lo más alto de la UE.',
        'En clima, la foto es mejor de lo que parece: las emisiones bajan y, por persona, España emite menos que la media europea. En 2024 el 57 % de la electricidad fue renovable, gracias sobre todo al sol y al viento.',
        'El talón de Aquiles es el suelo y el agua: ≈75 % del territorio está en riesgo de desertificación a largo plazo, los incendios son cada vez más grandes y virulentos, y el reciclaje sigue lejos del objetivo europeo.',
      ],
      claves: [
        'Red Natura 2000 — ≈30 % del territorio protegido; España es quien más aporta a la red europea',
        'Parques nacionales — 16, de Doñana a Picos de Europa; la joya de la corona',
        'Confederaciones hidrográficas — reparten el agua de cada cuenca; árbitros de las sequías',
        'Ley de cambio climático (2021) — el compromiso: neutralidad de emisiones en 2050',
        'Renovables — sol y viento ya generan más de la mitad de la electricidad',
        'Bomberos y agentes forestales — la primera línea de unos incendios cada vez peores',
      ],
      indicadores: [
        { n: 'Territorio protegido (Red Natura 2000)', f: 'MITECO', v: '≈30 %', ano: 2024, s: 'bien', nota: 'de lo más alto de la UE' },
        { n: 'Electricidad renovable', f: 'Red Eléctrica', v: '57 %', ano: 2024, s: 'bien', nota: 'récord histórico' },
        { n: 'Emisiones de gases de efecto invernadero', f: 'MITECO', v: '≈270 Mt CO2eq', ano: 2023, s: 'regular', nota: 'bajando; por persona, menos que la media UE' },
        { n: 'Reciclaje de residuos urbanos', f: 'Eurostat', v: '≈38-40 %', ano: 2022, s: 'mal', nota: 'objetivo UE: 55 %' },
        { n: 'Superficie quemada en el año negro de 2022', f: 'MITECO', v: '≈300.000 ha', ano: 2022, s: 'mal', nota: 'el peor año en décadas' },
        { n: 'Territorio en riesgo de desertificación', f: 'MITECO', v: '≈75 %', ano: 2023, s: 'mal', nota: 'a largo plazo; el sur y el este, primero' },
      ],

      arreglos: [
        ['La desertificación avanza: tres cuartas partes del territorio en riesgo y el suelo fértil no se recupera a escala humana.',
         'Frenar la desertificación con cubierta vegetal, reforestación y agricultura regenerativa.'],
        ['Incendios de nueva generación: menos fuegos pero más grandes y virulentos, con el monte abandonado como combustible.',
         'Gestionar el monte todo el año: los incendios de verano se apagan en invierno, con ganadería y desbroces.'],
        ['El reciclaje está estancado en ≈38-40 %, lejos del 55 % que exige la UE: más de la mitad de la basura acaba enterrada.',
         'Implantar de verdad la recogida separada de orgánico y el pago por generación de basura.'],
        ['Mar Menor y acuíferos sobreexplotados: años de nitratos y pozos de más han dejado ecosistemas al límite.',
         'Recuperar acuíferos y Mar Menor cerrando pozos ilegales y controlando nitratos en origen.'],
      ],    },
  },
  {
    id: 'salud', titulo: 'Salud', quien: 'Médicos, enfermeras, farmacéuticos, celadores',
    resumen: 'La técnica que cura: sanidad universal, trasplantes líderes del mundo y el MIR que forma a los especialistas.',
    destacados: [['30+ años', 'líder mundial en trasplantes'], ['≈84 años', 'de esperanza de vida: la más alta de la UE']],
    detalle: {
      como: [
        'La sanidad pública atiende a todos y la gestionan las 17 comunidades. La puerta de entrada es el centro de salud (la atención primaria); de ahí se pasa al hospital. Con un gasto en la media europea logra una de las esperanzas de vida más altas del mundo: mucho resultado por cada euro.',
        'Dos piezas son ejemplo mundial. La ONT coordina las donaciones y los trasplantes con un modelo que copian otros países: más de 30 años seguidos como líder mundial. Y el MIR forma a los especialistas: un examen único y años de residencia en hospital que garantizan el nivel.',
        'La tercera pata es la farmacia: ≈22.000 farmacias reparten los medicamentos hasta el último pueblo, una red capilar única en Europa. La grieta del sistema son las esperas y las plantillas: sobran pacientes por médico y faltan enfermeras.',
      ],
      claves: [
        'Sistema Nacional de Salud — universal y gratuito en el uso; lo gestionan las 17 CCAA',
        'Atención primaria — el centro de salud: la puerta de entrada y el filtro de todo el sistema',
        'ONT — coordina donaciones y trasplantes; líder mundial desde hace más de 30 años',
        'MIR — el examen y la residencia que forman a los médicos especialistas',
        'Farmacias — ≈22.000, hasta el último pueblo: la red más capilar de Europa',
      ],
      indicadores: [
        { n: 'Esperanza de vida', f: 'Eurostat', v: '≈84 años', ano: 2023, s: 'bien', nota: 'la más alta de la UE' },
        { n: 'Espera media para operarse', f: 'Mº Sanidad', v: '≈120 días', ano: 2024, s: 'mal', nota: 'en máximos históricos' },
        { n: 'Médicos por 1.000 habitantes', f: 'Eurostat', v: '≈4,5', ano: 2023, s: 'bien', nota: 'de los más altos de la UE' },
        { n: 'Enfermeras por 1.000 habitantes', f: 'Eurostat', v: '≈6,3', ano: 2023, s: 'mal', nota: 'media UE: ≈8' },
        { n: 'Trasplantes al año', f: 'ONT', v: '≈6.000', ano: 2024, s: 'bien', nota: 'líder mundial, 30+ años seguidos' },
      ],
      arreglos: [
        ['La atención primaria está saturada: días de espera para el médico de cabecera y consultas de minutos.', 'Reforzar los centros de salud con más plantilla y un tiempo mínimo por paciente en la agenda.'],
        ['Faltan enfermeras: ≈6,3 por 1.000 habitantes frente a ≈8 en la UE.', 'Formar y contratar enfermeras hasta la media europea, con más plazas universitarias y contratos estables.'],
        ['La salud mental pública tiene pocos psicólogos: la cita tarda meses y quien puede se va a la privada.', 'Poner psicólogos clínicos en los centros de salud y bajar la espera de meses a semanas.'],
        ['La medicina rural se queda sin relevo: plazas que nadie pide y pueblos sin médico fijo.', 'Incentivar las plazas rurales con sueldo, vivienda y puntos de carrera para quien las coja.'],
      ],
    },
  },
  {
    id: 'energia', titulo: 'Energía', quien: 'Ingenieros, operarios de red, instaladores',
    resumen: 'La fuerza del país: electricidad cada vez más renovable sobre una dependencia exterior que no cede.',
    destacados: [['≈57 %', 'de electricidad renovable en 2024: récord'], ['≈70 %', 'de la energía primaria viene de fuera']],
    detalle: {
      como: [
        'La electricidad va por buen camino: en 2024 el ≈57 % fue renovable, récord histórico, con un sol y un viento cada vez más baratos. Siete reactores nucleares aportan otro ≈20 %, con un cierre pactado entre 2027 y 2035 que aún se discute.',
        'El problema es todo lo demás: coches, calderas y fábricas queman petróleo y gas que vienen de fuera. España importa ≈70 % de su energía primaria y la paga a precio de mundo: cada crisis exterior entra por la factura.',
        'El 28 de abril de 2025 la península entera se quedó horas sin luz: el gran apagón. Recordó que la transición no es solo generar limpio, sino sostener la red. Mientras, el autoconsumo crece a golpe de tejado: placas que recortan la factura y descargan el sistema.',
      ],
      claves: [
        'Red Eléctrica — opera el sistema: casa oferta y demanda segundo a segundo',
        'CNMC — regula el mercado eléctrico y los peajes',
        'Centrales nucleares — 7 reactores, ≈20 % de la electricidad; cierre pactado 2027-2035',
        'Renovables — sol y viento: ya más de la mitad de la electricidad',
        'Autoconsumo — placas en tejados de casas y naves; en auge desde 2022',
        'Interconexiones — ≈3 % con Francia: la península es casi una isla eléctrica',
      ],
      indicadores: [
        { n: 'Electricidad renovable', f: 'Red Eléctrica', v: '≈57 %', ano: 2024, s: 'bien', nota: 'récord histórico' },
        { n: 'Energía primaria importada', f: 'Eurostat', v: '≈70 %', ano: 2023, s: 'mal', nota: 'media UE: ≈58 %' },
        { n: 'Electricidad de origen nuclear', f: 'Red Eléctrica', v: '≈20 %', ano: 2024, s: 'regular', nota: '7 reactores; cierre pactado 2027-2035' },
        { n: 'Interconexión eléctrica con Francia', f: 'Red Eléctrica', v: '≈3 %', ano: 2024, s: 'mal', nota: 'el objetivo europeo es el 15 %' },
        { n: 'Gran apagón peninsular', f: 'Red Eléctrica', v: '28 de abril', ano: 2025, s: 'mal', nota: 'horas sin luz en casi toda la península' },
      ],
      arreglos: [
        ['España importa ≈70 % de su energía primaria: el gas y el petróleo vienen de fuera y cada crisis exterior se paga cara.', 'Electrificar coches, calefacción e industria para sustituir importaciones por renovable propia.'],
        ['La red está saturada: renovables e industrias esperan años por un punto de conexión.', 'Invertir en redes y almacenamiento y agilizar los permisos de conexión para quien ya está en cola.'],
        ['El gran apagón del 28 de abril de 2025 dejó la península horas sin luz.', 'Reforzar la robustez del sistema: más almacenamiento, más interconexión con Francia y protocolos de reposición probados.'],
        ['La pobreza energética persiste: hogares que no encienden la calefacción en invierno por no poder pagarla.', 'Automatizar el bono social para quien tiene derecho y rehabilitar primero las viviendas que más gastan.'],
      ],
    },
  },
  {
    id: 'movilidad', titulo: 'Movilidad', quien: 'Ferroviarios, conductores, ingenieros, fábricas de coches',
    resumen: 'Cómo se mueve España: el AVE de récord, las cercanías de diario y una carretera cada vez menos mortal.',
    destacados: [['≈4.000 km', 'de AVE: la 2.ª red del mundo'], ['≈1.150', 'muertes en carretera (eran ≈9.000 en 1989)']],
    detalle: {
      como: [
        'España presume de AVE: ≈4.000 km de alta velocidad, la segunda red del mundo tras China. Pero el tren del día a día son las cercanías, que mueven cada día a muchos más viajeros y acumulan averías y retrasos: el escaparate y el taller no reciben el mismo trato.',
        'En carretera, un éxito callado: de ≈9.000 muertes al año en 1989 a ≈1.150 en 2024, gracias al carné por puntos, los radares y coches más seguros. El parque, eso sí, envejece: ≈14 años de media, de los más viejos de Europa occidental.',
        'España es además el 2.º fabricante de coches de Europa, pero el eléctrico va lento: ≈12 % de las ventas en 2024 contando enchufables, por debajo de la media europea. Las zonas de bajas emisiones ya son obligatorias en las ciudades grandes.',
      ],
      claves: [
        'Adif — construye y mantiene las vías; Renfe las opera, ya con competencia en el AVE',
        'DGT — tráfico, carnés y radares: detrás de la caída histórica de muertes',
        'Cercanías — el tren de diario: mueve a muchos más viajeros que el AVE',
        'Fábricas de coches — 2.º productor europeo: ≈2,4 M de vehículos al año',
        'Zonas de bajas emisiones — obligatorias en los municipios de más de 50.000 habitantes',
      ],
      indicadores: [
        { n: 'Muertes en carretera', f: 'DGT', v: '≈1.150', ano: 2024, s: 'bien', nota: 'de las tasas más bajas de la UE; en 1989 fueron ≈9.000' },
        { n: 'Coche eléctrico (ventas, con enchufables)', f: 'ANFAC', v: '≈12 %', ano: 2024, s: 'mal', nota: 'media UE: ≈20 %' },
        { n: 'Edad media del parque de coches', f: 'ANFAC', v: '≈14 años', ano: 2024, s: 'mal', nota: 'y subiendo año a año' },
        { n: 'Vehículos fabricados', f: 'ANFAC', v: '≈2,4 M', ano: 2024, s: 'bien', nota: '2.º fabricante de Europa, tras Alemania' },
      ],
      arreglos: [
        ['Las cercanías acumulan averías y retrasos mientras el AVE estrena kilómetros: el tren que usa la mayoría es el peor tratado.', 'Priorizar la inversión en cercanías: renovar vías, trenes y señalización donde viaja la gente a diario.'],
        ['El parque envejece (≈14 años de media) y el eléctrico es solo ≈12 % de las ventas.', 'Descontar las ayudas al coche eléctrico en el concesionario, en el momento, y multiplicar los puntos de recarga.'],
        ['El transporte rural es escaso: sin coche propio no hay médico, instituto ni trabajo en media España.', 'Extender el transporte a demanda: autobús o taxi que sale cuando se pide, comarca a comarca.'],
        ['La última milla urbana se atasca: reparto, coche privado y autobús compiten por las mismas calles.', 'Ordenar la última milla con carriles bus y bici, intercambiadores y reparto en horas valle.'],
      ],
    },
  },
  {
    id: 'alimentacion', titulo: 'Alimentación', quien: 'Agricultores, ganaderos, pescadores, industria alimentaria',
    resumen: 'La huerta de Europa: una despensa que alimenta a medio continente y desatiende su propia mesa.',
    destacados: [['≈45 %', 'del aceite de oliva del mundo'], ['≈70.000 M€', 'exportados en alimentos y bebidas']],
    detalle: {
      como: [
        'España es la huerta de Europa: exporta ≈70.000 M€ al año en alimentos y bebidas y produce ≈45 % del aceite de oliva del mundo. Frutas, hortalizas, vino, porcino: la despensa propia da para el país y para medio continente.',
        'La paradoja está en casa: con la dieta mediterránea de bandera, ≈1 de cada 3 niños tiene exceso de peso y cada año se tiran ≈1.200 millones de kilos de comida. Se exporta salud y se come cada vez peor.',
        'El campo que lo produce envejece: la edad media del agricultor ronda los 61 años y el relevo no llega. Y el regadío que lo riega usa ≈80 % del agua de un país que se seca: la gran decisión pendiente.',
      ],
      claves: [
        'MAPA — el ministerio del campo: ayudas, regadíos y la ley contra el desperdicio',
        'PAC — las ayudas europeas: ≈7.000 M€ al año para el campo español',
        'AESAN — vigila la seguridad alimentaria y la nutrición',
        'Cooperativas agrarias — reúnen a miles de pequeños productores para vender juntos',
        'Denominaciones de origen — Rioja, Jabugo…: el sello que protege el nombre y el oficio',
      ],
      indicadores: [
        { n: 'Exportación agroalimentaria', f: 'Mº Economía', v: '≈70.000 M€', ano: 2024, s: 'bien', nota: 'la huerta de Europa' },
        { n: 'Aceite de oliva (cuota mundial)', f: 'MAPA', v: '≈45 %', ano: 2024, s: 'bien', nota: 'primer productor del mundo' },
        { n: 'Niños con exceso de peso', f: 'AESAN', v: '≈1 de cada 3', ano: 2023, s: 'mal', nota: 'de los más altos de Europa' },
        { n: 'Comida desperdiciada al año', f: 'MAPA', v: '≈1.200 M de kg', ano: 2023, s: 'mal', nota: 'sobre todo en los hogares' },
        { n: 'Edad media del agricultor', f: 'MAPA', v: '≈61 años', ano: 2023, s: 'mal', nota: 'el relevo no llega' },
      ],
      arreglos: [
        ['≈1 de cada 3 niños tiene exceso de peso: los ultraprocesados ganan a la dieta mediterránea en su propia casa.', 'Regular la publicidad de ultraprocesados dirigida a niños y garantizar menús escolares sanos para todos.'],
        ['Se tiran ≈1.200 millones de kilos de comida al año mientras hay hogares que no llegan.', 'Aplicar la ley contra el desperdicio: planes en comercios y restaurantes y donación ordenada de excedentes.'],
        ['El agricultor medio tiene ≈61 años y cada año cierran miles de explotaciones sin relevo.', 'Facilitar el relevo: bancos de tierras, traspasos acompañados y crédito para quien empieza.'],
        ['El regadío usa ≈80 % del agua en un país cada vez más seco.', 'Modernizar el riego con goteo y agua regenerada, y ajustar los cultivos al agua que de verdad hay.'],
      ],
    },
  },
  {
    id: 'agua', titulo: 'Agua', quien: 'Confederaciones, regantes, operadores urbanos, ingenieros',
    resumen: 'El recurso que manda: embalses, regadío y desalación en un país que se seca.',
    destacados: [['≈1.200', 'grandes embalses: la hucha de un país seco'], ['≈80 %', 'del agua se la lleva el regadío']],
    detalle: {
      como: [
        'España es un país semiárido que vive de la regulación: ≈1.200 grandes embalses con ≈56.000 hm³ de capacidad, de los países con más presas del mundo. El agua se reparte por cuencas, con las confederaciones hidrográficas de árbitro.',
        'El gran cliente es el campo: el regadío usa ≈80 % del agua. En las ciudades, la asignatura pendiente son las tuberías: ≈25 % del agua urbana se pierde o no se llega a facturar, por fugas y contadores viejos.',
        'Donde falta lluvia, España ha hecho técnica: es líder de Europa en desalación, con las plantas que sostienen el sureste y las islas. Lo que no luce es la depuración: la UE lleva años multando por aguas residuales sin tratar del todo.',
      ],
      claves: [
        'Confederaciones hidrográficas — reparten el agua de cada cuenca; árbitros de las sequías',
        'MITECO — planifica el agua a escala de país y vigila los acuíferos',
        'Embalses — ≈1.200 grandes presas: la hucha del agua',
        'Desaladoras — la mayor capacidad de Europa; sostienen el sureste y las islas',
        'Depuradoras — limpian el agua usada; donde faltan, multa europea',
        'Regadío — ≈80 % del agua: la decisión de fondo de todo el sistema',
      ],
      indicadores: [
        { n: 'Capacidad de los embalses', f: 'MITECO', v: '≈56.000 hm³', ano: 2024, s: 'regular', nota: 'mucha presa, lluvia cada vez más irregular' },
        { n: 'Agua que usa el regadío', f: 'MITECO', v: '≈80 %', ano: 2023, s: 'regular', nota: 'la media mundial ronda el 70 %' },
        { n: 'Pérdidas en las redes urbanas', f: 'INE/AEAS', v: '≈25 %', ano: 2022, s: 'mal', nota: '1 de cada 4 litros no llega al grifo' },
        { n: 'Desalación', f: 'AEDyR', v: 'líder de la UE', ano: 2024, s: 'bien', nota: 'de los primeros países del mundo' },
        { n: 'Multas de la UE por depurar tarde', f: 'Comisión Europea', v: 'desde 2018', ano: 2024, s: 'mal', nota: 'decenas de millones de € ya pagados' },
      ],
      arreglos: [
        ['≈25 % del agua urbana se pierde en las redes: tuberías con décadas y fugas sin localizar.', 'Renovar las redes con planes por municipio y sensores que encuentren las fugas.'],
        ['La depuración sigue incompleta: la UE multa a España desde 2018 por aguas residuales mal tratadas.', 'Terminar las depuradoras pendientes y financiarlas con un canon de saneamiento finalista.'],
        ['Los acuíferos están sobreexplotados y hay miles de pozos ilegales, como alrededor de Doñana.', 'Cerrar los pozos ilegales y medirlo todo: contador en cada captación y vigilancia por satélite.'],
        ['Se planifica con agua que ya no existe: concesiones calculadas con los caudales de un clima que se acabó.', 'Rehacer los planes de cuenca con los caudales reales del clima nuevo y ajustar las concesiones.'],
      ],
    },
  },
  {
    id: 'vivienda', titulo: 'Vivienda', quien: 'Arquitectos, constructores, promotores, ayuntamientos',
    resumen: 'El techo que falta: se construye poco, el alquiler se dispara y casi no hay parque social.',
    destacados: [['≈90.000', 'viviendas nuevas al año; en 2006, ≈600.000'], ['≈1-2 %', 'de vivienda social (media UE: ≈9 %)']],
    detalle: {
      como: [
        'España construye mucho menos de lo que necesita: ≈90.000 viviendas nuevas al año frente a las ≈600.000 de 2006, y se crean bastantes más hogares. El Banco de España cifra el déficit acumulado en ≈600.000 viviendas.',
        'El resultado se paga en el alquiler: +≈70 % en diez años, mucho más que los sueldos. Un joven que alquila dedica en torno a un tercio del sueldo a la casa (solo, mucho más), y la emancipación espera hasta los ≈30 años.',
        'El colchón público apenas existe: la vivienda social de alquiler es ≈1-2 % del parque, frente a ≈9 % en la UE. Donde Viena o Ámsterdam amortiguan con parque público, aquí casi todo queda en manos del mercado.',
      ],
      claves: [
        'Mº Vivienda — las ayudas estatales y la ley; el suelo y las licencias son de CCAA y ayuntamientos',
        'Ayuntamientos — dan las licencias: el trámite que puede tardar más de un año',
        'Promotores y constructoras — levantan la vivienda libre; el sector perdió medio oficio en 2008',
        'Vivienda protegida — se construyó mucha y se vendió; en alquiler apenas queda',
        'Ley de vivienda (2023) — zonas tensionadas y topes al alquiler; aplicación desigual por CCAA',
      ],
      indicadores: [
        { n: 'Viviendas terminadas al año', f: 'Mº Vivienda', v: '≈90.000', ano: 2024, s: 'mal', nota: 'en 2006 fueron ≈600.000' },
        { n: 'Déficit de vivienda acumulado', f: 'Banco de España', v: '≈600.000', ano: 2024, s: 'mal', nota: 'y creciendo cada año' },
        { n: 'Alquiler en 10 años', f: 'idealista', v: '+≈70 %', ano: 2024, s: 'mal', nota: 'los sueldos subieron mucho menos' },
        { n: 'Vivienda social de alquiler', f: 'OCDE', v: '≈1-2 % del parque', ano: 2023, s: 'mal', nota: 'media UE: ≈9 %' },
        { n: 'Edad media de emancipación', f: 'Eurostat', v: '≈30 años', ano: 2023, s: 'mal', nota: 'media UE: ≈26' },
      ],
      arreglos: [
        ['Se construyen ≈90.000 viviendas al año y el déficit acumulado ronda las ≈600.000: no se levanta lo que falta.', 'Construir a escala: suelo público que no se venda, construcción industrializada y objetivos anuales por provincia.'],
        ['El suelo y las licencias van lentos: una licencia puede tardar más de un año y un desarrollo de suelo, una década.', 'Agilizar los trámites con declaración responsable y silencio positivo para la obra que cumple la norma.'],
        ['La vivienda social de alquiler es ≈1-2 % del parque, frente a ≈9 % en la UE: no hay colchón público.', 'Multiplicar el parque social de alquiler y blindarlo por ley para que nunca se venda.'],
        ['En zonas tensionadas conviven vivienda vacía y pisos turísticos con vecinos que no encuentran casa.', 'Movilizar la vivienda vacía con alquiler seguro para el dueño y ordenar los pisos turísticos con licencias y topes por barrio.'],
      ],
    },
  },
  {
    id: 'comunicacion', titulo: 'Comunicación', quien: 'Técnicos de telecomunicaciones, operadoras, informáticos',
    resumen: 'Los nervios del país: fibra líder de Europa por la que también corren bulos y ciberataques.',
    destacados: [['>90 %', 'de hogares con fibra: líder de la UE'], ['≈90 %', 'de la población con cobertura 5G']],
    detalle: {
      como: [
        'España tiene una de las mejores redes de Europa: la fibra óptica llega a más del 90 % de los hogares, en cabeza de la UE, y el 5G cubre ya ≈90 % de la población. Un pueblo pequeño español suele tener mejor internet que media Alemania.',
        'Sobre esa red crecen los centros de datos, atraídos por la energía renovable y los cables submarinos. Pero la capa de arriba es de otros: la nube, los chips y las grandes plataformas son de empresas extranjeras, y lo que corre por la red se decide fuera.',
        'La red también trae problemas nuevos: bulos que corren más que las rectificaciones, ciberataques a pymes y ayuntamientos, y una parte de los mayores que se queda fuera de los trámites digitales. INCIBE es la ventanilla pública de la ciberseguridad, con el 017 como teléfono gratuito.',
      ],
      claves: [
        'Operadoras — Telefónica y compañía: desplegaron la fibra que lidera Europa',
        'CNMC — regula las telecomunicaciones y la competencia',
        'INCIBE — la ciberseguridad de ciudadanos y pymes; el 017 es su teléfono gratuito',
        'Centros de datos — en auge por la energía renovable y los cables submarinos',
        'Medios y plataformas — informan y desinforman; las grandes plataformas, todas extranjeras',
      ],
      indicadores: [
        { n: 'Hogares con fibra óptica', f: 'Comisión Europea (DESI)', v: '>90 %', ano: 2024, s: 'bien', nota: 'líder de la UE' },
        { n: 'Población con cobertura 5G', f: 'Comisión Europea (DESI)', v: '≈90 %', ano: 2024, s: 'bien' },
        { n: 'Gente con habilidades digitales básicas', f: 'Comisión Europea (DESI)', v: '≈66 %', ano: 2023, s: 'bien', nota: 'media UE: ≈56 %' },
        { n: 'Ciberincidentes gestionados por INCIBE', f: 'INCIBE', v: '≈100.000', ano: 2024, s: 'mal', nota: 'crecen año a año' },
        { n: 'Nube, chips y plataformas propias', v: 'muy pocas', ano: 2024, s: 'mal', nota: 'la red es nuestra; lo que corre encima, de fuera' },
      ],
      arreglos: [
        ['Una parte de los mayores se queda fuera: la banca y los trámites ya son digitales y ellos no.', 'Garantizar atención presencial y telefónica en todo servicio esencial y formar en digital a los mayores, pueblo a pueblo.'],
        ['Los bulos corren más que las rectificaciones y erosionan la confianza en todo lo demás.', 'Enseñar a leer la red desde la escuela: verificar fuentes y alfabetización mediática para todas las edades.'],
        ['La dependencia tecnológica es casi total: nube, chips y plataformas son de empresas extranjeras.', 'Aprovechar la energía y la fibra para atraer industria tecnológica, y apostar por nube europea y software abierto.'],
        ['Los ciberataques golpean a pymes y ayuntamientos, que no tienen equipo propio de seguridad.', 'Extender los kits y auditorías de INCIBE: copias de seguridad, doble factor y responsables comarcales de ciberseguridad.'],
      ],
    },
  },
];

// ----------------------------------------------------------------------------
// LAS CONEXIONES
// ----------------------------------------------------------------------------
export const CONEXIONES: Conexion[] = [
  {
    de: 'ley', a: 'economia', nombre: 'reglas del mercado',
    resumen: 'Las reglas de juego de toda la economía: qué se puede vender, a qué precio, con qué moneda y con qué red de seguridad.',
    detalle: {
      como: [
        'La economía no es una selva: cada mercado tiene su reglamento. La ley fija qué es un contrato, qué pasa si no se paga, quién vigila a los bancos y cuánto puede subir un alquiler.',
        'Buena parte de estas reglas ya se escriben en Bruselas y en Fráncfort: el mercado único marca las normas de competencia y el BCE decide los tipos de interés del euro, que encarecen o abaratan todas las hipotecas españolas a la vez.',
      ],
      claves: [
        'Contratos — el Código Civil y el de Comercio: lo pactado obliga, y un juez lo respalda',
        'Moneda — el euro: el BCE pone los tipos de interés y vigila la inflación',
        'Banca — el Banco de España y el BCE supervisan; el Fondo de Garantía cubre 100.000 € por titular y banco',
        'Competencia — la CNMC multa los cárteles y vigila las fusiones',
        'Trabajo — el Estatuto de los Trabajadores y la negociación colectiva fijan el suelo de todo empleo',
        'Vivienda — la Ley de Vivienda de 2023: zonas tensionadas y topes al alquiler',
        'Bolsa — la CNMV vigila a quien pide dinero al público',
      ],
      indicadores: [
        { n: 'Inflación anual', f: 'INE', v: '≈2,5 %', ano: 2025, s: 'regular', nota: 'objetivo del BCE: 2 %' },
        { n: 'Tipo de interés del BCE', f: 'BCE', v: '≈2 %', ano: 2025, s: 'regular' },
        { n: 'Salario mínimo', f: 'BOE', v: '1.184 €/mes', ano: 2025, s: 'regular', nota: 'subió ≈60 % desde 2018' },
        { n: 'Multas de la CNMC al año', f: 'CNMC', v: '≈200-400 M€', ano: 2024, s: 'regular' },
        { n: 'Precio de la vivienda en 10 años', f: 'INE', v: '+≈60 %', ano: 2024, s: 'mal', nota: 'los sueldos subieron mucho menos' },
      ],

      arreglos: [
        ['La vivienda es el mercado peor regulado: ni el tope de alquileres baja los precios ni se construye lo que falta.',
         'Evaluar cada regulación de mercado a los 2 años: si no bajó precios o abusos, cambiarla.'],
        ['Los mercados regulados (luz, banca, teléfono) concentran pocas empresas grandes y las multas llegan tarde.',
         'Reforzar la CNMC con medios y plazos cortos en los mercados concentrados.'],
        ['La letra pequeña sigue ganando pleitos: cláusulas suelo y tarjetas revolving tardaron años en pararse.',
         'Resolver los abusos bancarios y de consumo en meses con arbitraje vinculante, no en años de pleitos.'],
        ['Cumplir las reglas cuesta más a la pyme que a la grande, que tiene abogados para todo.',
         'Adaptar las obligaciones al tamaño de la empresa: guías y modelos oficiales para que la pyme cumpla sin ejército de abogados.'],
      ],    },
  },
  {
    de: 'ley', a: 'empresa', nombre: 'regulación empresarial',
    resumen: 'Todo lo que la ley le marca a una empresa: nacer, contratar, tributar, competir y cerrar.',
    detalle: {
      como: [
        'Una empresa española no da un paso sin cruzarse con la ley: constituirse pasa por notario y Registro Mercantil; contratar, por el Estatuto de los Trabajadores; vender, por las normas de consumo; y cerrar, por la Ley Concursal.',
        'Tres administraciones regulan a la vez: la UE (competencia, datos, producto), el Estado (laboral, fiscal, mercantil) y la comunidad autónoma más el ayuntamiento (licencias, horarios, medio ambiente).',
      ],
      claves: [
        'Crear la empresa — Ley de Sociedades de Capital: estatutos, notario y Registro Mercantil',
        'Contratar — Estatuto de los Trabajadores, convenios colectivos y SMI (1.184 €/mes en 2025)',
        'Tributar — Impuesto de Sociedades (25 %), IVA (21/10/4 %) y cotizaciones sociales (≈30 % del salario)',
        'Competir — CNMC: defensa de la competencia y mercados regulados',
        'Datos — RGPD y Agencia Española de Protección de Datos',
        'Vender — garantía de 3 años, etiquetado, derecho de devolución',
        'Proteger — Ley de Prevención de Riesgos Laborales',
        'Cerrar — Ley Concursal: concurso de acreedores y segunda oportunidad',
      ],
      indicadores: [
        { n: 'Días para crear una empresa', f: 'Banco Mundial', v: '≈13', ano: 2023, s: 'regular', nota: 'en Estonia, horas' },
        { n: 'Coste de crear una SL', v: '≈300-600 €', ano: 2024, s: 'regular' },
        { n: 'Cuña fiscal sobre el trabajo', f: 'OCDE', v: '≈40 %', ano: 2024, s: 'regular', nota: 'media OCDE: ≈34,8 %' },
        { n: 'Empresas con menos de 10 empleados', f: 'INE', v: '94 %', ano: 2024, s: 'regular', nota: 'la regulación pesa más en las pequeñas' },
        { n: 'Pago medio de la Administración a proveedores', f: 'Mº Hacienda', v: '>60 días en muchos ayuntamientos', ano: 2024, s: 'mal', nota: 'la ley marca 30' },
      ],

      arreglos: [
        ['La burocracia frena: una licencia de actividad puede tardar meses según el municipio.',
         'Crear una ventanilla única real: un solo trámite digital para nacer, con silencio administrativo positivo.'],
        ['Efecto escalón: pasar de 49 a 50 empleados dispara obligaciones, y muchas empresas dejan de crecer para evitarlo.',
         'Suavizar los escalones regulatorios para que crecer no castigue.'],
        ['17 normativas autonómicas distintas obligan a una pyme a adaptarse región a región.',
         'Aplicar de verdad la Ley de Unidad de Mercado: aprobado en una comunidad, válido en todas.'],
        ['La morosidad, incluida la pública, ahoga a las pequeñas empresas que ya pagaron el IVA de facturas no cobradas.',
         'Cumplir la ley de morosidad también cuando quien debe es la Administración.'],
      ],    },
  },
  {
    de: 'objetivos', a: 'politica', nombre: 'demandas ciudadanas',
    resumen: 'Cómo llegan al poder las necesidades de la gente: votos, calle, firmas, encuestas y presión organizada.',
    detalle: {
      como: [
        'El canal principal es el voto: cada cuatro años la gente premia o castiga. Pero entre elección y elección las demandas viajan por otros caminos: manifestaciones, huelgas, sindicatos y patronal en el diálogo social, encuestas del CIS y la agenda de los medios.',
        'También hay un canal directo, la iniciativa legislativa popular: 500.000 firmas para que el Congreso debata una propuesta. Existe desde 1984 y casi nunca prospera. Y un canal opaco: los lobbies, que presionan a diario sin un registro estatal obligatorio.',
      ],
      claves: [
        'Elecciones — el mandato: cada 4 años se premia o se castiga con el voto',
        'Manifestaciones y huelgas — el derecho de reunión; la calle como termómetro',
        'Sindicatos y patronal — el diálogo social: negocian SMI, pensiones y reformas laborales',
        'Encuestas del CIS — el barómetro público de preocupaciones, mes a mes',
        'Medios y redes — marcan qué problemas entran en la agenda política',
        'ILP — 500.000 firmas para llevar una propuesta de ley al Congreso',
        'Lobbies — intereses organizados que presionan sin registro estatal obligatorio',
      ],
      indicadores: [
        { n: 'Participación en las generales', f: 'Mº Interior', v: '66 %', ano: 2023, s: 'regular', nota: 'los jóvenes y las rentas bajas votan menos' },
        { n: 'ILP convertidas en ley desde 1984', f: 'Congreso', v: 'menos de 5', s: 'mal', nota: 'de más de un centenar presentadas' },
        { n: 'Afiliación sindical', f: 'OCDE', v: '≈13 %', ano: 2023, s: 'regular', nota: 'por debajo de la media OCDE (≈16 %)' },
        { n: 'Registro estatal de lobbies', v: 'no existe', ano: 2025, s: 'mal', nota: 'solo registros parciales (CNMC, algunas CCAA)' },
      ],

      arreglos: [
        ['La ILP casi nunca se tramita: 500.000 firmas pueden acabar en un cajón si los grupos no la toman en consideración.',
         'Obligar a debatir y votar toda ILP que reúna las firmas, con comparecencia de sus promotores.'],
        ['Los lobbies actúan sin registro obligatorio ni agenda pública: no se sabe quién presiona a quién.',
         'Crear un registro estatal obligatorio de lobbies con agenda pública de reuniones.'],
        ['Entre elecciones la escucha es débil: las encuestas se miran pero no obligan a nada.',
         'Extender los presupuestos participativos municipales con dinero real en juego.'],
        ['Las demandas de quien menos vota (jóvenes, rentas bajas) pesan menos en la agenda que las de quien vota siempre.',
         'Ensayar paneles ciudadanos deliberativos (sorteo, información, propuesta) para temas enquistados.'],
      ],    },
  },
  {
    de: 'valores', a: 'politica', nombre: 'principios y debate',
    resumen: 'Los valores compartidos entran en política por la Constitución, el debate público y el pluralismo de los medios.',
    detalle: {
      como: [
        'La Constitución de 1978 es el pacto de valores: proclama la libertad, la justicia, la igualdad y el pluralismo político como valores superiores, y los derechos fundamentales ponen el suelo del debate: expresión, reunión, asociación.',
        'Sobre ese suelo, los valores se convierten en política a través del debate público: medios, redes, campañas y Parlamento. Cuando el debate funciona, filtra las ideas; cuando se rompe en trincheras, los valores se usan como arma y no como brújula.',
      ],
      claves: [
        'Constitución de 1978 — el pacto: libertad, justicia, igualdad y pluralismo político como valores superiores',
        'Derechos fundamentales — expresión, reunión y asociación: el suelo de cualquier debate',
        'Medios de comunicación — trasladan (y filtran) el debate público a millones de personas',
        'RTVE y medios públicos — mandato legal de pluralismo y servicio público',
        'Debate parlamentario — sesiones de control y grandes debates: los valores, cara a cara',
        'Campañas electorales — donde los principios se convierten en programas y en votos',
      ],
      indicadores: [
        { n: 'Libertad de prensa (clasificación mundial)', f: 'RSF', v: '≈puesto 30', ano: 2024, s: 'regular', nota: 'bien, pero por detrás de los nórdicos' },
        { n: 'Confianza en las noticias', f: 'Reuters Institute', v: '≈33 %', ano: 2024, s: 'mal', nota: 'de las más bajas de Europa occidental' },
        { n: 'Polarización política', v: 'de las más altas de la UE', ano: 2023, s: 'mal', nota: 'según los estudios comparados' },
        { n: 'Quien se informa por redes sociales', f: 'Reuters Institute', v: '≈6 de cada 10', ano: 2024, s: 'regular', nota: 'terreno fértil para los bulos' },
        { n: 'Apoyo a la democracia como mejor sistema', f: 'CIS', v: '≈8 de cada 10', ano: 2023, s: 'bien', nota: 'el pacto de fondo aguanta' },
      ],

      arreglos: [
        ['Polarización mediática: muchos medios funcionan como trincheras de partido, y el lector elige el que le da la razón.',
         'Repartir la publicidad institucional con criterios públicos y transparentes, no por afinidad.'],
        ['Los bulos corren más rápido que los desmentidos, sobre todo en redes, y envenenan el debate.',
         'Reforzar la verificación independiente de bulos y darle alcance en las propias redes.'],
        ['El debate se ha encogido a eslóganes: 20 segundos de bronca ganan a 20 minutos de argumento.',
         'Crear formatos de debate largo y sereno en los medios públicos, con tiempo para los matices.'],
        ['La bronca parlamentaria aleja a la gente de la política: el espectáculo tapa la sustancia.',
         'Serenar el debate parlamentario: sesiones monográficas con tiempo y datos, pensadas para resolver y no para el titular.'],
      ],    },
  },
  {
    de: 'politica', a: 'ley', nombre: 'poder legislativo',
    resumen: 'Cómo una decisión política se convierte en ley: del anteproyecto del Gobierno al BOE.',
    detalle: {
      como: [
        'Casi todas las leyes nacen en el Gobierno: un ministerio redacta el anteproyecto, se abre audiencia pública, informan los órganos consultivos (el Consejo de Estado entre ellos) y el Consejo de Ministros lo aprueba como proyecto de ley.',
        'En el Congreso, el proyecto pasa por ponencia, comisión y pleno, donde se enmienda y se vota. El Senado hace una segunda lectura y puede vetar o enmendar, pero el Congreso siempre decide. Con la sanción real y la publicación en el BOE, la ley empieza a obligar.',
        'Hay atajos: el decreto-ley para urgencias (el Gobierno legisla y el Congreso convalida después) y los trámites de urgencia y lectura única, que acortan plazos a costa de debate.',
      ],
      claves: [
        'Anteproyecto — el ministerio redacta; audiencia pública e informes previos',
        'Consejo de Estado — el dictamen jurídico de más peso; no vincula, pero avisa',
        'Congreso: ponencia, comisión y pleno — donde la ley se enmienda y se vota de verdad',
        'Senado — segunda lectura; puede vetar o enmendar, pero el Congreso tiene la última palabra',
        'Sanción real y BOE — el Rey firma y el boletín publica: desde entonces obliga',
        'Real decreto-ley — el atajo del Gobierno para urgencias, convalidado después por el Congreso',
        'Proposición de ley — la vía de los grupos parlamentarios, los parlamentos autonómicos y la ILP',
      ],
      indicadores: [
        { n: 'Leyes aprobadas por las Cortes al año', f: 'Congreso', v: '≈20-40', ano: 2023, s: 'regular', nota: 'varía mucho según la legislatura' },
        { n: 'Leyes que nacen del Gobierno', f: 'Congreso', v: '≈8 de cada 10', ano: 2023, s: 'regular', nota: 'la oposición legisla poco' },
        { n: 'Tiempo medio de tramitación de una ley', v: '≈6-12 meses', ano: 2023, s: 'regular', nota: 'años si se atasca en comisión' },
        { n: 'Normas con rango de ley que son decretos-leyes', f: 'Congreso', v: '≈1 de cada 3', ano: 2023, s: 'mal', nota: 'el atajo hecho norma' },
        { n: 'Leyes con evaluación posterior de resultados', v: 'casi ninguna', ano: 2024, s: 'mal' },
      ],

      arreglos: [
        ['Enmiendas ómnibus: en una ley de un tema se cuelan reformas de otro sin debate propio; el Tribunal Constitucional lo ha afeado.',
         'Prohibir las enmiendas sin relación con el objeto de la ley, como pide el Tribunal Constitucional.'],
        ['El trámite de urgencia y la lectura única, pensados para excepciones, se usan como norma: menos comparecencias, menos debate.',
         'Reservar el decreto-ley y la urgencia para urgencias de verdad, con control reforzado.'],
        ['El Senado apenas cambia nada: una segunda lectura cara que casi nunca mejora la ley.',
         'Reformar el Senado para que sea una cámara territorial útil o repensar su papel.'],
        ['Muchas leyes se pactan fuera de las Cortes y se votan sin tocar una coma: el Parlamento como trámite.',
         'Devolver el debate a las Cortes: comparecencias públicas de expertos y tiempo real de enmienda antes de votar cada ley.'],
        ['Nadie evalúa después: se aprueba la ley y no se mide si consiguió lo que prometía.',
         'Acompañar cada ley de objetivos medibles y evaluarla en público a los 2-3 años.'],
      ],    },
  },
  {
    de: 'ley', a: 'justicia', nombre: 'código penal y garantías',
    resumen: 'Lo que la ley da a la justicia: los códigos que aplica, las reglas del proceso y las garantías de cada persona.',
    detalle: {
      como: [
        'La justicia no inventa las reglas: las recibe de la ley. El Código Penal dice qué es delito y con qué pena; el Código Civil ordena contratos, familia y herencias; y las leyes procesales marcan cómo se juzga, paso a paso.',
        'La pieza más vieja es la Ley de Enjuiciamiento Criminal: es de 1882 y sigue vigente, parcheada decenas de veces. El proceso penal español del siglo XXI corre sobre una ley del XIX.',
        'La ley también da el escudo: la presunción de inocencia y la tutela judicial efectiva (artículo 24 de la Constitución), el habeas corpus para revisar cualquier detención en horas, y la justicia gratuita para quien no puede pagar abogado.',
      ],
      claves: [
        'Código Penal (1995) — qué es delito y con qué pena; retocado casi cada año',
        'Código Civil (1889) — contratos, familia y herencias; viejo pero remendado',
        'LECrim (1882) — las reglas del proceso penal: aún vigente, con decenas de parches',
        'Ley de Enjuiciamiento Civil (2000) — el proceso civil, mucho más moderna',
        'Presunción de inocencia — nadie es culpable hasta sentencia firme (art. 24 CE)',
        'Habeas corpus — un juez revisa en horas la legalidad de cualquier detención',
        'Justicia gratuita y turno de oficio — abogado para quien no puede pagarlo',
      ],
      indicadores: [
        { n: 'Ley procesal penal vigente', v: 'de 1882', ano: 2025, s: 'mal', nota: 'todos los intentos de sustituirla han fracasado' },
        { n: 'Reformas del Código Penal desde 1995', f: 'BOE', v: '≈30', ano: 2024, s: 'mal', nota: 'se retoca al calor de cada suceso' },
        { n: 'Instrucción de las macrocausas', v: '≈2-5 años', ano: 2023, s: 'mal', nota: 'algunos delitos llegan a prescribir' },
        { n: 'Aforados (políticos, jueces, fiscales…)', v: 'miles', ano: 2024, s: 'mal', nota: 'la cuenta más amplia habla de ≈250.000; en la mayoría de la UE, casi ninguno' },
        { n: 'Habeas corpus y garantías básicas', v: 'funcionan', ano: 2024, s: 'bien', nota: 'el escudo constitucional se respeta' },
      ],

      arreglos: [
        ['La LECrim es decimonónica: pensada para otro mundo, obliga a juzgar delitos informáticos con una ley anterior a la bombilla en muchas casas.',
         'Aprobar de una vez una LECrim nueva: el fiscal instruye y un juez de garantías vigila.'],
        ['La instrucción es lenta: las causas complejas tardan años, y justicia que prescribe es impunidad.',
         'Poner plazos efectivos a la instrucción, con los medios necesarios para cumplirlos.'],
        ['Miles de aforados: cargos que solo puede juzgar un tribunal especial, algo casi único en Europa.',
         'Reducir los aforamientos al mínimo imprescindible, como en el resto de Europa.'],
        ['El Código Penal se reforma al calor de cada suceso mediático, sin evaluar si la pena nueva sirve de algo.',
         'Evaluar cada reforma penal antes de aprobarla: qué problema ataca y con qué evidencia.'],
        ['El mismo juez que investiga decide medidas como la prisión preventiva: el modelo de fiscal instructor lleva décadas pendiente.',
         'Separar investigar y decidir: que medidas como la prisión preventiva las acuerde un juez de garantías distinto del que instruye.'],
      ],    },
  },
  {
    de: 'ley', a: 'administracion', nombre: 'poder ejecutivo',
    resumen: 'La ley le dice a la Administración qué hacer, con qué dinero, en qué plazos y con qué límites.',
    detalle: {
      como: [
        'La Administración solo puede hacer lo que la ley le permite. Dos leyes gemelas de 2015 lo ordenan todo: la 39/2015 regula el procedimiento (plazos, registros, notificaciones, recursos) y la 40/2015, cómo se organiza el sector público y cómo responde por sus daños.',
        'El dinero también entra por ley: los Presupuestos Generales del Estado autorizan cada año qué se gasta y en qué; sin presupuesto nuevo, se prorroga el anterior. Y cuando la Administración calla o se equivoca, la ley da armas al ciudadano: el silencio administrativo, los recursos y la vía contencioso-administrativa.',
      ],
      claves: [
        'Ley 39/2015 — el procedimiento administrativo: plazos, registros, notificaciones y recursos',
        'Ley 40/2015 — la organización del sector público y su responsabilidad por daños',
        'Presupuestos Generales del Estado — ninguna administración gasta sin ley que lo autorice',
        'Silencio administrativo — si no contestan en plazo, la ley decide el sentido: muchas veces, negativo',
        'Recurso contencioso-administrativo — el ciudadano lleva a la Administración ante el juez',
        'Responsabilidad patrimonial — si la Administración causa un daño, debe indemnizar',
        'Ley de contratos del sector público — cómo se compra con dinero público: concursos y transparencia',
      ],
      indicadores: [
        { n: 'Duración de un pleito contra la Administración', f: 'CGPJ', v: '≈1-2 años', ano: 2023, s: 'mal', nota: 'más si llega a instancias superiores' },
        { n: 'Procedimientos con silencio negativo', v: 'la mayoría', ano: 2024, s: 'mal', nota: 'la ley de 2015 prometía lo contrario' },
        { n: 'Presupuestos prorrogados', v: 'varios años en la última década', s: 'mal', nota: 'sin presupuesto nuevo se repite el anterior' },
        { n: 'Plazo legal máximo para resolver un trámite', v: '3-6 meses', ano: 2024, s: 'regular', nota: 'sobre el papel; a menudo se incumple' },
        { n: 'Pleitos contencioso-administrativos al año', f: 'CGPJ', v: '≈200.000', ano: 2023, s: 'regular', nota: 'el ciudadano pleitea mucho contra su Administración' },
      ],

      arreglos: [
        ['El silencio negativo es la norma de hecho: no contestar equivale a decir que no, y encima dentro de la ley.',
         'Generalizar el silencio positivo: si la Administración no contesta en plazo, el sí es automático.'],
        ['Ganar a la Administración tarda años: entre el recurso y el juicio, la razón llega cuando ya no sirve.',
         'Compensar automáticamente al ciudadano que gana: intereses y devolución rápida, sin otro trámite.'],
        ['Se piden papeles que la propia Administración ya tiene, aunque la ley 39/2015 lo prohíbe.',
         'Aplicar de verdad la prohibición de pedir datos que la Administración ya tiene.'],
        ['Cada nivel añade sus propias reglas de procedimiento: el ciudadano se pierde entre ventanillas.',
         'Unificar el procedimiento entre administraciones: una sola ventanilla y las mismas reglas básicas en los tres niveles.'],
        ['La prórroga presupuestaria se ha normalizado: gobernar sin presupuesto nuevo ya no escandaliza.',
         'Recuperar la normalidad presupuestaria: presentar cuentas nuevas cada año y tratar la prórroga como excepción, no como costumbre.'],
      ],    },
  },
  {
    de: 'economia', a: 'empresa', nombre: 'mercado y trabajo',
    resumen: 'Lo que la economía le da y le pide a la empresa: clientes, crédito, trabajadores y reglas de juego.',
    detalle: {
      como: [
        'La empresa vive de la demanda: familias que compran, otras empresas que encargan y un mercado único europeo de ≈450 millones de consumidores sin aduanas. El consumo de los hogares mueve más de la mitad del PIB.',
        'Para crecer necesita crédito (bancos, con el Euríbor que marca el BCE como referencia) y trabajadores (contratos, convenios, SMI). Y desde 2021 hay un extra: los fondos europeos Next Generation, ≈160.000 M€ asignados a España para digitalizar y verdear la economía.',
      ],
      claves: [
        'Demanda — el consumo de las familias mueve más de la mitad del PIB',
        'Crédito — los bancos prestan al precio que marca el BCE; el Euríbor es la referencia de hipotecas y préstamos',
        'Trabajo — contratos, convenios colectivos y SMI: ≈22 M de personas empleadas, récord',
        'Mercado único europeo — ≈450 M de consumidores sin aduanas; el gran cliente de la exportación',
        'Fondos Next Generation — ≈160.000 M€ asignados a España; pagan digitalización, renovables y formación',
        'Turismo — ≈94 M de visitantes (2024) que llenan hoteles, bares y comercios',
      ],
      indicadores: [
        { n: 'Personas trabajando', f: 'EPA (INE)', v: '≈22 M', ano: 2025, s: 'bien', nota: 'récord histórico' },
        { n: 'Euríbor a 12 meses', f: 'Banco de España', v: '≈2 %', ano: 2025, s: 'regular', nota: 'llegó al 4 % en 2023' },
        { n: 'Vacantes sin cubrir', f: 'INE', v: '≈150.000', ano: 2024, s: 'regular', nota: 'conviven con ≈2,5 M de parados' },
        { n: 'Fondos Next Generation asignados', f: 'Comisión Europea', v: '≈160.000 M€', ano: 2024, s: 'regular', nota: 'la ejecución va lenta' },
        { n: 'Exportación que va a la UE', f: 'Mº Economía', v: '≈2 de cada 3 €', ano: 2023, s: 'regular', nota: 'mucha dependencia de un solo cliente' },
      ],

      arreglos: [
        ['El crédito es más caro y escaso para la pyme que para la grande: sin avales, el banco no arriesga.',
         'Ampliar los avales públicos (ICO) para que la pyme financie crecimiento, no solo el día a día.'],
        ['Vacantes sin cubrir junto a paro alto: faltan soldadores, conductores o programadores mientras millones buscan empleo; la formación no casa con el mercado.',
         'Enlazar formación y vacantes: FP dual y recualificación pagada hacia los oficios que faltan.'],
        ['Los fondos europeos llegan despacio y con tanto papeleo que muchas pymes ni los piden.',
         'Simplificar las convocatorias de fondos: una ventanilla, menos papeles y anticipos para la pyme.'],
      ],    },
  },
  {
    de: 'empresa', a: 'administracion', nombre: 'impuestos',
    resumen: 'De aquí sale el dinero público: cada nómina, cada venta y cada beneficio dejan su parte.',
    detalle: {
      como: [
        'La empresa es la gran recaudadora del país: retiene el IRPF de las nóminas, cobra el IVA en cada venta, paga cotizaciones por cada empleado y tributa por sus beneficios en el Impuesto de Sociedades.',
        'Todo junto, España recauda ≈38 % del PIB, algo menos que la media de la UE (≈41 %). Con ese dinero se pagan la sanidad, las pensiones, la educación y todo lo demás.',
      ],
      claves: [
        'Impuesto de Sociedades — 25 % sobre el beneficio; mínimo del 15 % para los grandes grupos',
        'IVA — 21/10/4 % sobre el consumo; la empresa lo cobra al cliente y lo ingresa en Hacienda',
        'IRPF retenido — la empresa adelanta a Hacienda el impuesto de cada nómina',
        'Cotizaciones sociales — ≈30 % del salario a cargo de la empresa; pagan pensiones y paro',
        'Impuestos especiales — gasolina, alcohol, tabaco y electricidad',
        'Agencia Tributaria — recauda y persigue el fraude; cientos de modelos (303, 111, 200…)',
      ],
      indicadores: [
        { n: 'Recaudación total', f: 'Eurostat', v: '≈38 % del PIB', ano: 2023, s: 'regular', nota: 'media UE: ≈41 %' },
        { n: 'Economía sumergida', f: 'estimaciones (Gestha)', v: '≈15-20 % del PIB', ano: 2023, s: 'mal', nota: 'decenas de miles de M€ sin tributar' },
        { n: 'Tipo nominal de Sociedades', v: '25 %', ano: 2025, s: 'regular', nota: 'los grandes grupos pagan menos en efectivo' },
        { n: 'Modelos tributarios distintos', v: 'cientos', ano: 2024, s: 'mal', nota: 'la pyme los paga en horas de gestoría' },
        { n: 'Pago de la Administración a proveedores', f: 'Mº Hacienda', v: '>30 días en muchos casos', ano: 2024, s: 'mal', nota: 'la ley marca 30' },
      ],

      arreglos: [
        ['La economía sumergida (≈15-20 % del PIB) hace que quien cumple pague también por quien no.',
         'Cruzar datos (facturación electrónica, TPV, bancos) para aflorar la economía sumergida.'],
        ['El sistema es tan complejo que una pyme necesita gestoría hasta para empezar: cientos de modelos y 17 haciendas con reglas propias.',
         'Simplificar: menos modelos, borradores precumplimentados también para empresas y una sola ventanilla.'],
        ['La morosidad pública vuelve: la pequeña empresa adelanta el IVA de facturas que la Administración tarda meses en pagar.',
         'Pagar a 30 días o compensar automáticamente las deudas públicas con los impuestos a ingresar.'],
        ['El fraude sofisticado (grandes patrimonios, tramas de facturas) se persigue menos que el error del pequeño.',
         'Publicar cuánto fraude se recupera y de quién, para enfocar los recursos donde más se escapa.'],
      ],    },
  },
  {
    de: 'administracion', a: 'servicios', nombre: 'presupuestos',
    resumen: 'Los Presupuestos reparten el dinero: las CCAA gestionan sanidad y educación; la Seguridad Social, las pensiones.',
    detalle: {
      como: [
        'Cada año, los Presupuestos Generales del Estado reparten el dinero público. Pero la mayor parte del gasto social no la ejecuta el Estado: la sanidad y la educación las gestionan las 17 comunidades con el dinero del sistema de financiación autonómica.',
        'Las pensiones van por otra caja: las paga la Seguridad Social con las cotizaciones, y el Estado transfiere lo que falta. La dependencia se cofinancia entre Estado y comunidades, y ahí cada uno acusa al otro de poner poco.',
      ],
      claves: [
        'PGE — la ley más importante del año: quién recibe qué; cuando no hay mayoría, se prorrogan los viejos',
        'Financiación autonómica — el reparto que paga sanidad y educación en las CCAA; caducado desde 2014',
        'Seguridad Social — caja aparte: las cotizaciones pagan ≈10,3 M de pensiones cada mes',
        'Transferencias del Estado — tapan el agujero entre lo cotizado y lo que cuestan las pensiones',
        'Fondo de dependencia — la cofinanciación Estado-CCAA de los cuidados',
        'Fondo de reserva («la hucha») — llegó a ≈66.000 M€ en 2011, se vació, y vuelve a llenarse despacio desde 2023',
      ],
      indicadores: [
        { n: 'Reforma de la financiación autonómica', v: 'pendiente desde 2014', ano: 2025, s: 'mal', nota: 'caducó y nadie la renueva' },
        { n: 'Gasto en pensiones', f: 'Seguridad Social', v: '≈12-13 % del PIB', ano: 2024, s: 'regular', nota: 'y subiendo al jubilarse la generación más numerosa' },
        { n: 'Gasto público en sanidad', f: 'Mº Sanidad', v: '≈7 % del PIB', ano: 2023, s: 'regular', nota: 'en la media UE' },
        { n: 'Personas esperando la ayuda de dependencia', f: 'IMSERSO', v: '≈250.000', ano: 2024, s: 'mal', nota: 'entre valorar y cobrar pasan meses o años' },
        { n: 'Presupuestos prorrogados', v: '2024 y 2025', ano: 2025, s: 'mal', nota: 'gobernar con cuentas viejas' },
      ],

      arreglos: [
        ['La financiación autonómica caducó en 2014 y sigue sin reforma: comunidades infrafinanciadas que recortan donde más duele.',
         'Reformar la financiación autonómica con criterios claros: población ajustada por edad y dispersión.'],
        ['La dependencia está infrafinanciada: el Estado pone bastante menos de la mitad que prometía la ley.',
         'Financiar la dependencia a medias de verdad y resolver en el plazo legal de 6 meses.'],
        ['La inversión presupuestada no se ejecuta: se anuncia, sale en la foto y se queda sin gastar.',
         'Publicar la ejecución del presupuesto en tiempo real: qué se prometió, qué se gastó y dónde.'],
        ['Dos años seguidos con presupuestos prorrogados: el reparto real se decide a golpe de decreto.',
         'Presupuestar a varios años las inversiones grandes, para que no dependan de cada legislatura.'],
      ],    },
  },
  {
    de: 'empresa', a: 'tecnicas', nombre: 'bienes y productos',
    resumen: 'La empresa fabrica y opera la técnica: construye, genera luz, conecta, cura y alimenta.',
    detalle: {
      como: [
        'La capa técnica no funciona sola: la operan empresas. Constructoras que levantan viviendas y carreteras, eléctricas que generan y distribuyen, telecos que tienden fibra, farmacéuticas que producen medicinas y agroalimentarias que llenan la despensa.',
        'Buena parte se hace por encargo público: el Estado licita obras y concesiones, y la empresa las construye y a veces las explota. Las grandes constructoras e ingenierías españolas, curtidas aquí, gestionan autopistas y aeropuertos por medio mundo.',
      ],
      claves: [
        'Constructoras — de la vivienda a la autopista; las grandes operan en medio mundo',
        'Eléctricas y renovables — generan y distribuyen la luz; del gigante a la cooperativa local',
        'Telecos — la fibra y el 5G que conectan el país, entre los mejores de la UE',
        'Automoción — ≈2,3 M de coches fabricados al año: 2.º productor de Europa, tras Alemania',
        'Agroalimentarias — del campo al súper: la gran huerta de Europa',
        'Farmacéuticas — medicinas y vacunas; España es potencia europea en ensayos clínicos',
        'Obra pública y concesiones — el Estado licita; la empresa construye y a veces explota',
      ],
      indicadores: [
        { n: 'Coches fabricados', f: 'ANFAC', v: '≈2,3 M', ano: 2024, s: 'bien', nota: '2.º productor de Europa' },
        { n: 'Exportación agroalimentaria', f: 'Mº Economía', v: '≈70.000 M€', ano: 2023, s: 'bien', nota: 'la gran huerta de Europa' },
        { n: 'Peso de la construcción', f: 'INE', v: '≈5-6 % del PIB', ano: 2024, s: 'regular', nota: 'en 2006 llegó a ≈10 %' },
        { n: 'Licitaciones públicas desiertas', v: 'en aumento', ano: 2024, s: 'mal', nota: 'los costes suben y los precios públicos no' },
        { n: 'Materiales y componentes críticos', v: 'mayoría importada', ano: 2024, s: 'mal', nota: 'acero, chips, baterías' },
      ],

      arreglos: [
        ['Licitaciones desiertas: los costes de materiales y mano de obra subieron y los precios públicos no se actualizan, así que nadie se presenta.',
         'Actualizar los precios de licitación con índices de costes reales, para que las obras no queden desiertas.'],
        ['Dependencia de materiales importados: acero, chips y componentes vienen de fuera, y cada crisis de suministro para obras y fábricas.',
         'Fabricar en España o en la UE los componentes críticos (chips, baterías) con los fondos ya aprobados.'],
        ['Faltan manos en los oficios: albañiles, electricistas y soldadores se jubilan sin relevo.',
         'Formar en oficios con FP dual a pie de obra: faltan decenas de miles de manos.'],
        ['Se adjudica demasiado al precio más bajo, y lo barato acaba caro en calidad y en plazos.',
         'Comprar público con criterios de calidad y de ciclo de vida, no solo el precio más bajo.'],
      ],    },
  },
  {
    de: 'servicios', a: 'tecnicas', nombre: 'infraestructuras',
    resumen: 'Lo público construye y mantiene el esqueleto: carreteras, vías, embalses, hospitales y colegios.',
    detalle: {
      como: [
        'El Estado, las comunidades y los ayuntamientos construyen y mantienen la infraestructura sobre la que todo funciona: ≈165.000 km de carreteras, ≈4.000 km de AVE, ≈1.200 embalses, y miles de hospitales, colegios y depuradoras.',
        'España construyó mucho y bien durante décadas, con los fondos europeos ayudando. El reto ya no es inaugurar: es conservar lo construido, que envejece. Y conservar luce menos en la foto que cortar una cinta.',
      ],
      claves: [
        'Carreteras — ≈165.000 km; la red de gran capacidad, de las mayores de Europa',
        'AVE — ≈4.000 km: la 2.ª red de alta velocidad del mundo, tras China',
        'Embalses — ≈1.200, más que casi nadie en Europa; regulan un país seco',
        'Hospitales y centros de salud — la red que las CCAA construyen y equipan',
        'Colegios e institutos — el mapa escolar público, hasta en pueblos pequeños',
        'Depuradoras y redes de agua — captan, potabilizan y devuelven el agua limpia',
      ],
      indicadores: [
        { n: 'Red de carreteras', f: 'Mº Transportes', v: '≈165.000 km', ano: 2024, s: 'bien' },
        { n: 'Alta velocidad', f: 'Adif', v: '≈4.000 km', ano: 2024, s: 'bien', nota: '2.ª del mundo; aprovechamiento mejorable' },
        { n: 'Embalses', f: 'MITECO', v: '≈1.200', ano: 2024, s: 'bien', nota: 'capacidad de ≈56.000 hm³' },
        { n: 'Déficit de conservación de carreteras', f: 'AEC', v: '≈10.000 M€', ano: 2024, s: 'mal', nota: 'estimación de la Asociación Española de la Carretera' },
        { n: 'Fiabilidad de cercanías', v: 'en caída', ano: 2024, s: 'mal', nota: 'incidencias casi diarias en Madrid y Barcelona' },
      ],

      arreglos: [
        ['Mantenimiento aplazado: conservar no corta cintas, y el firme, las vías y las depuradoras envejecen (déficit estimado de ≈10.000 M€ solo en carreteras).',
         'Reservar para conservación un porcentaje fijo e intocable de cada presupuesto de obra.'],
        ['Cercanías saturadas mientras el AVE se mima: el tren del trabajo diario falla más que el tren de los viajes.',
         'Priorizar cercanías y la red convencional: fiabilidad para quien viaja a diario.'],
        ['Infraestructura infrautilizada: estaciones de AVE casi sin viajeros y aeropuertos sin vuelos, decididos por política más que por demanda.',
         'Decidir las obras con un análisis coste-beneficio público, publicado antes de licitar.'],
        ['Depuración incumplida: Europa ha multado a España por verter aguas sin depurar del todo.',
         'Renovar las depuradoras pendientes y cerrar de una vez las sanciones europeas.'],
      ],    },
  },
  {
    de: 'tecnicas', a: 'objetivos', nombre: 'cubre las necesidades',
    resumen: 'El cierre del ciclo: la técnica convierte recursos en salud, comida, hogar, movilidad y conexión para 48,8 M de personas.',
    detalle: {
      como: [
        'Todo el mapa desemboca aquí: la técnica convierte energía, agua y materiales en necesidades cubiertas. Y en España casi todo llega a casi todos: agua potable y luz en ≈100 % de los hogares, fibra en más de 9 de cada 10, sanidad universal y comida abundante.',
        'El agujero es la vivienda: la necesidad peor cubierta. Un joven dedica más del 30-40 % de su sueldo al alquiler y no se emancipa hasta los ≈30 años, de lo más tardío de la UE. Hay técnica y hay suelo; lo que falla es ponerlos a trabajar.',
      ],
      claves: [
        'Salud — sanidad universal y la esperanza de vida más alta de la UE (≈84 años)',
        'Alimento — la gran huerta de Europa: comida abundante y variada',
        'Hogar — el eslabón roto: faltan viviendas y el alquiler se come el sueldo joven',
        'Movilidad — AVE, metro y carreteras: moverse es fácil en las ciudades, difícil en el campo',
        'Conexión — fibra en más de 9 de cada 10 hogares y móvil en casi todo el territorio',
        'Agua y luz — cobertura ≈100 %: abrir el grifo y dar al interruptor funciona',
      ],
      indicadores: [
        { n: 'Hogares con agua potable y luz', v: '≈100 %', ano: 2024, s: 'bien' },
        { n: 'Cobertura de fibra óptica', f: 'Comisión Europea (DESI)', v: '>90 %', ano: 2024, s: 'bien', nota: 'de las mejores de la UE' },
        { n: 'Esfuerzo joven por el alquiler', f: 'Consejo de la Juventud', v: '>30-40 % del sueldo', ano: 2024, s: 'mal', nota: 'lo recomendado es no pasar del 30 %' },
        { n: 'Edad de emancipación', f: 'Eurostat', v: '≈30 años', ano: 2024, s: 'mal', nota: 'media UE: ≈26' },
        { n: 'Niños con exceso de peso', f: 'AESAN', v: '≈1 de cada 3', ano: 2023, s: 'mal', nota: 'comida barata no siempre es comida buena' },
      ],

      arreglos: [
        ['La vivienda es la necesidad peor cubierta: hay técnica y suelo, pero no se construye lo que la gente necesita donde lo necesita.',
         'Tratar la vivienda como la primera necesidad sin cubrir: construir, rehabilitar y movilizar la vacía.'],
        ['Soledad no deseada: cada vez más personas mayores (y jóvenes) viven solas y sin red; la técnica conecta pantallas, no compañías.',
         'Mapear la soledad no deseada por barrio y pueblo, y financiar redes de cuidados y compañía.'],
        ['Obesidad infantil subiendo: ≈1 de cada 3 niños tiene exceso de peso.',
         'Abaratar la comida sana y frenar la publicidad de ultraprocesados dirigida a los niños.'],
        ['Cobertura no es acceso: la fibra llega al pueblo, pero sin médico ni escuela cerca, el pueblo se vacía igual.',
         'Medir las necesidades, no solo el PIB: un cuadro público de salud, hogar, alimento y conexión por comarca.'],
      ],    },
  },
  {
    de: 'recursos', a: 'politica', nombre: 'recursos disponibles',
    resumen: 'El poder decide con lo que hay: el dinero, la gente, el agua y la energía marcan lo que la política puede prometer.',
    detalle: {
      como: [
        'Ningún gobierno decide en el vacío: gobierna con los recursos que el país tiene. El presupuesto marca el techo del gasto, la pirámide de población condiciona pensiones y sanidad, y el agua y la energía dictan media agenda.',
        'Por esta flecha también entran los fondos europeos: decenas de miles de millones del plan Next Generation que han dirigido la inversión pública de estos años.',
      ],
      claves: [
        'Presupuesto — la presión fiscal (≈38 % del PIB) marca el techo de lo que se puede gastar',
        'Demografía — la pirámide invertida condiciona pensiones, sanidad y escuelas',
        'Agua — trasvases y sequías enfrentan territorios y tumban o encumbran gobiernos',
        'Energía — el precio de la luz y el despliegue renovable deciden política industrial',
        'Fondos UE — ≈80.000 M€ en transferencias Next Generation dirigen la inversión hasta 2026',
        'Territorio — dónde vive la gente (la España vaciada) reparte escaños y servicios',
      ],
      indicadores: [
        { n: 'Presión fiscal', f: 'Eurostat', v: '≈38 % del PIB', ano: 2023, s: 'regular', nota: 'media UE: ≈41 %' },
        { n: 'Gasto en pensiones', f: 'Seguridad Social', v: '≈12-13 % del PIB', ano: 2024, s: 'regular', nota: 'y subiendo con el envejecimiento' },
        { n: 'Mayores de 65 años', f: 'INE', v: '≈20 %', ano: 2024, s: 'mal', nota: 'cada vez menos cotizantes por pensionista' },
        { n: 'Transferencias Next Generation asignadas a España', f: 'Comisión Europea', v: '≈80.000 M€', ano: 2024, s: 'bien', nota: 'de los mayores receptores de la UE' },
        { n: 'Agua embalsada en los peores momentos de sequía', f: 'MITECO', v: '<30 % en varias cuencas', ano: 2023, s: 'mal' },
      ],

      arreglos: [
        ['Planes sin memoria económica realista: se promete gasto nuevo sin decir de dónde sale el dinero.',
         'Acompañar cada promesa electoral de su coste, validado por la autoridad fiscal independiente (AIReF).'],
        ['La guerra del agua: los trasvases se deciden por pulso político entre territorios, no por planificación a 30 años.',
         'Pactar el agua con datos y a 30 años, cuenca a cuenca, fuera de la pelea partidista.'],
        ['Las pensiones se reforman mirando la próxima elección, no la pirámide de población de 2050.',
         'Planificar pensiones y sanidad con la demografía real, con revisiones automáticas.'],
        ['Dependencia de los fondos UE: sin ellos, la inversión pública propia es de las más bajas de la zona euro.',
         'Mantener la inversión pública cuando se acaben los fondos europeos.'],
      ],    },
  },
  {
    de: 'educacion', a: 'valores', nombre: 'forma la conciencia',
    resumen: 'La escuela, la familia y los medios transmiten los valores: lo que un país cree se aprende de pequeño.',
    detalle: {
      como: [
        'Los valores no nacen solos: se enseñan. La escuela transmite convivencia, igualdad y pensamiento crítico; la familia, los primeros hábitos; y los medios y las redes, cada vez más, el resto.',
        'La pieza decisiva hoy es el criterio: distinguir un dato de un bulo. Un país que lee bien y pregunta «¿y eso quién lo dice?» es más difícil de manipular.',
      ],
      claves: [
        'Educación cívica — la asignatura y el día a día del aula: convivir, debatir, votar',
        'Comprensión lectora — sin leer bien no hay criterio ni ciudadano informado',
        'Pensamiento crítico — la defensa contra el bulo: comprobar antes de compartir',
        'Igualdad desde la infancia — la coeducación que explica la tolerancia española',
        'Medios y redes — hoy forman (o deforman) tanto o más que la escuela',
        'Familia — el primer transmisor: los valores se imitan antes que se estudian',
      ],
      indicadores: [
        { n: 'PISA comprensión lectora', f: 'OCDE (PISA)', v: '≈474 puntos', ano: 2022, s: 'regular', nota: 'en la media OCDE' },
        { n: 'Jóvenes que se informan sobre todo por redes sociales', f: 'Reuters Institute', v: 'la mayoría', ano: 2024, s: 'mal', nota: 'donde el bulo corre más que el desmentido' },
        { n: 'Horas lectivas de educación cívica', v: 'por debajo de la media UE', ano: 2023, s: 'regular' },
        { n: 'Edad del primer móvil propio', v: '≈11 años', ano: 2024, s: 'mal', nota: 'antes de tener criterio formado' },
      ],

      arreglos: [
        ['Los bulos corren más que los desmentidos: lo falso se comparte más rápido y la escuela apenas enseña a detectarlo.',
         'Enseñar a verificar información en todas las etapas, como hace Finlandia desde primaria.'],
        ['Pantallas desde edades tempranas sin acompañamiento: el algoritmo educa antes que el tutor.',
         'Acordar entre familias y centros el uso del móvil, retrasando el primero propio.'],
        ['La educación cívica va arrinconada: pocas horas y cambiantes con cada ley educativa.',
         'Dar horas estables a la educación cívica, pactadas fuera de la pelea partidista.'],
        ['La polarización adulta se cuela en el aula y convierte cualquier contenido en trinchera.',
         'Practicar el debate con reglas en clase: defender con datos, escuchar al contrario.'],
      ],    },
  },
  {
    de: 'educacion', a: 'tecnicas', nombre: 'talento e investigación',
    resumen: 'De la escuela a la ciencia y el oficio: la educación fabrica el talento con el que el país hace cosas.',
    detalle: {
      como: [
        'Toda la técnica del país —de la soldadura al algoritmo— sale de esta flecha: la FP forma los oficios, las ingenierías y los doctorados forman la ciencia, y el CSIC y las universidades producen la investigación.',
        'El flujo tiene dos fugas: jóvenes que no encuentran empleo mientras las empresas no encuentran técnicos, e investigadores formados aquí que acaban trabajando fuera.',
      ],
      claves: [
        'FP y FP dual — el oficio aprendido con empresa; la vía que más crece',
        'Ingenierías y grados STEM — la cantera de la industria y la tecnología',
        'Doctorados — la puerta de la investigación; largos y mal pagados',
        'CSIC y universidades — producen la mayor parte de la ciencia pública',
        'Prácticas y aprendices — el puente del aula al primer empleo',
        'Retorno de talento — programas para recuperar a los que se fueron',
      ],
      indicadores: [
        { n: 'Paro juvenil', f: 'EPA (INE)', v: '≈26 %', ano: 2025, s: 'mal', nota: 'de los más altos de la UE' },
        { n: 'Alumnos de FP', f: 'Mº Educación', v: '≈1,2 M', ano: 2024, s: 'bien', nota: 'creciendo fuerte, aún menos que en la UE' },
        { n: 'Puestos técnicos sin cubrir (soldadores, programadores…)', v: 'decenas de miles', ano: 2024, s: 'mal', nota: 'conviven con el paro juvenil' },
        { n: 'Edad a la que un investigador logra plaza estable', v: '≈40 años', ano: 2024, s: 'mal', nota: 'tras encadenar becas y contratos' },
        { n: 'Gasto en I+D', f: 'INE', v: '1,5 % del PIB', ano: 2023, s: 'mal', nota: 'media UE: ≈2,2 %' },
      ],

      arreglos: [
        ['Desajuste formación-empleo: uno de los paros juveniles más altos de la UE junto a vacantes técnicas sin cubrir.',
         'Ligar las plazas de FP y universidad a los empleos reales de cada comarca, con datos públicos.'],
        ['Precariedad investigadora: encadenar becas y contratos hasta los ≈40 años para lograr una plaza estable.',
         'Crear una carrera investigadora predecible: etapas claras y estabilización antes de los 35.'],
        ['Fuga de talento: el país paga la formación y otro país cobra la productividad.',
         'Retener y recuperar el talento: contratos estables aquí y programas de retorno con plaza real para quien se fue.'],
        ['La orientación llega tarde: muchos eligen carrera sin conocer los oficios técnicos con empleo seguro.',
         'Orientar desde secundaria con visitas reales a talleres, laboratorios y empresas.'],
      ],    },
  },
  {
    de: 'tecnicas', a: 'ecologia', nombre: 'impacto y residuos',
    resumen: 'Toda técnica deja huella: emisiones, basura, agua y costas saturadas; y de la técnica salen también las soluciones.',
    detalle: {
      como: [
        'Cada cosa que el país hace deja marca en su casa: la energía y el transporte emiten CO2, las ciudades generan ≈22 millones de toneladas de basura al año, el regadío se lleva la mayor parte del agua y el turismo presiona las costas.',
        'La misma flecha lleva los arreglos: renovables que desplazan al gas, depuradoras, reciclaje y economía circular. La técnica mancha y la técnica limpia; la cuestión es el saldo.',
      ],
      claves: [
        'Emisiones — energía, transporte e industria generan la mayor parte del CO2',
        'Residuos urbanos — ≈22 M de toneladas al año; más de la mitad acaba enterrada',
        'Regadío — se lleva ≈el 80 % del agua que usa el país',
        'Turismo masivo — ≈94 M de visitantes al año presionan costas e islas',
        'Suelo sellado — cada polígono y urbanización impermeabiliza tierra para siempre',
        'Soluciones — renovables, depuración y economía circular: la técnica también repara',
      ],
      indicadores: [
        { n: 'Agua que se lleva el regadío', f: 'MITECO', v: '≈80 %', ano: 2023, s: 'mal', nota: 'en un país semiárido' },
        { n: 'Residuos urbanos generados', f: 'INE', v: '≈22 M t al año', ano: 2022, s: 'regular' },
        { n: 'Reciclaje de residuos urbanos', f: 'Eurostat', v: '≈38-40 %', ano: 2022, s: 'mal', nota: 'objetivo UE: 55 %' },
        { n: 'Turistas extranjeros', f: 'INE', v: '≈94 M', ano: 2024, s: 'regular', nota: '2.º del mundo; riqueza y presión a la vez' },
        { n: 'Electricidad renovable', f: 'Red Eléctrica', v: '57 %', ano: 2024, s: 'bien', nota: 'la técnica que resta emisiones' },
      ],

      arreglos: [
        ['El reciclaje está lejos del objetivo: más de la mitad de la basura acaba en el vertedero, con multa europea a la vista.',
         'Cobrar la basura por generación y separar el orgánico en todos los municipios.'],
        ['Costas saturadas: en zonas enteras del litoral el verano multiplica la población y el agua y la depuración no dan.',
         'Poner límites de carga turística en las zonas saturadas, como empiezan a hacer las islas.'],
        ['Suelo sellado que no vuelve: el ladrillo ganó terreno fértil que ninguna técnica recupera.',
         'Priorizar la rehabilitación sobre la obra nueva para no sellar más suelo.'],
        ['Depuración incompleta: vertidos y nitratos que acaban en ríos, acuíferos y en el Mar Menor.',
         'Depurar y reutilizar el agua a gran escala: cada litro reutilizado es un litro que no se extrae.'],
      ],    },
  },
  {
    de: 'ecologia', a: 'recursos', nombre: 'límites del planeta',
    resumen: 'La ecología marca lo que se puede extraer: menos agua, menos suelo fértil y un clima que cambia las cuentas del país.',
    detalle: {
      como: [
        'Esta flecha es la factura de vuelta: la naturaleza fija cuánta agua, suelo, pesca y cosecha hay realmente disponible, y esa cantidad está bajando.',
        'Los ríos llevan menos agua que hace décadas, muchos acuíferos están sobreexplotados y el clima ya mueve los cultivos: el olivar y el viñedo buscan el norte y la altura. Planificar con los datos de los años 80 es planificar con un país que ya no existe.',
      ],
      claves: [
        'Agua disponible — los ríos llevan menos caudal que hace 40 años; el clima resta de la cuenta',
        'Acuíferos — la reserva de los años secos; muchos, sobreexplotados o contaminados',
        'Suelo fértil — la erosión y el sellado restan tierra de cultivo cada año',
        'Pesca — cuotas de la UE para que el mar no se vacíe; el límite hecho ley',
        'Clima y cosechas — sequías y calor recortan aceituna, uva y cereal; los cultivos migran',
        'Bosques — madera, pastos y esponja de agua; si arden, se pierde todo a la vez',
      ],
      indicadores: [
        { n: 'Caudal que llega a los ríos', f: 'MITECO', v: 'claramente menos que hace 40 años', ano: 2023, s: 'mal', nota: 'y las previsiones restan más' },
        { n: 'Masas de agua subterránea en mal estado', f: 'MITECO', v: '≈40 %', ano: 2023, s: 'mal' },
        { n: 'Cosecha de aceite en la gran sequía 2022-23', f: 'MAPA', v: '≈la mitad de lo normal', ano: 2023, s: 'mal', nota: 'el clima ya recorta la despensa' },
        { n: 'Territorio en riesgo de desertificación', f: 'MITECO', v: '≈75 %', ano: 2023, s: 'mal', nota: 'a largo plazo' },
        { n: 'Pesca bajo cuotas europeas', v: 'la mayoría de especies comerciales', ano: 2024, s: 'regular', nota: 'el límite que evita vaciar el mar' },
      ],

      arreglos: [
        ['Se planifica como si el agua de los años 80 siguiera ahí: concesiones y regadíos suman más de lo que las cuencas dan hoy.',
         'Planificar con el agua que habrá, no con la que hubo: revisar concesiones cuenca a cuenca.'],
        ['Acuíferos sobreexplotados: se saca más de lo que entra, y la reserva de los años secos se agota.',
         'Poner contador a todos los pozos y cerrar los ilegales.'],
        ['Cultivos en zonas que ya no dan: se insiste en regadíos donde el agua y el clima dicen que no.',
         'Adaptar los cultivos al clima que viene: variedades resistentes y menos regadío nuevo.'],
        ['El suelo fértil perdido no vuelve: erosión y sellado restan capital a las siguientes generaciones.',
         'Proteger los suelos que aún son fértiles y recargar los acuíferos con agua depurada.'],
      ],    },
  },
];
