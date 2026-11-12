// «Otras propuestas» for the «seguridad» window. Positions checked on 2026-11-12.
// No 2026 campaign programme on security was found for Sumar or Vox, so their
// cards rest on their 2023 programmes; the date is in every source title.
import type { Espectro } from './tipos';

export const ESPECTRO: Espectro | null = {
  tema: 'la policía y la seguridad',
  modelo: [
    'Un solo cuerpo de «guardianes» en lugar de unos 1.700: el mismo sueldo por el mismo puesto, una sola escalera de mando civil y una sola academia.',
    'Una sección en cada escala, de la calle al continente, y el ejército dentro, como sección de defensa y emergencias.',
    'Un solo teléfono, el 112, que manda a quien esté más cerca.',
    'Cámara en el uniforme, número visible y una inspección independiente que publica quejas y usos de la fuerza.',
    'Ciudadanos guardianes: formación voluntaria y gratuita para proteger, mediar y avisar, sin armas.',
  ],
  limites: [
    'Sus críticos dicen que un cuerpo único exige reformar la Constitución y los estatutos de Cataluña, el País Vasco y Navarra, y meter en él al ejército, todavía más.',
    'También, que unificar concentra mucho poder en un solo mando y puede alejar a la policía de cada pueblo.',
    'Y que los ciudadanos guardianes pueden acabar en patrullas que se toman la justicia por su mano, y que igualar sueldos al alza cuesta dinero cada año.',
  ],
  posturas: [
    {
      id: 'izquierda',
      quien: 'Sumar (programa de 2023), con Podemos, ERC, Bildu y BNG en la reforma de la ley de seguridad ciudadana',
      cuando: 'Programa electoral de 2023 y acuerdo en el Congreso de 2024',
      idea: 'Menos poder para multar y más control externo sobre cómo actúa la policía.',
      propone: [
        'Derogar la ley de seguridad ciudadana de 2015, que llaman «ley mordaza», y prohibir las pelotas de goma.',
        'Desmilitarizar la Guardia Civil.',
        'Número de identificación visible en cada agente, cámaras personales reguladas y organismos de fuera de la policía que controlen su actuación.',
        'Prohibir las identificaciones por el aspecto de la persona para aplicar la ley de extranjería.',
        'Mejorar los sueldos, las pensiones y la jornada de los policías.',
      ],
      argumento: 'Dicen que la ley de 2015 sirve para disuadir de protestar con multas, y que los abusos solo se corrigen si alguien de fuera del cuerpo controla a la policía.',
      critica: 'Sus críticos, entre ellos los sindicatos policiales, dicen que estos cambios restan autoridad a los agentes y los dejan más desprotegidos en la calle.',
      fuentes: [
        { url: 'https://www.eldiario.es/politica/sumar-prohibira-pelotas-goma-convertir-delito-devolucion-migrantes-frontera_1_10356866.html', titulo: 'elDiario.es (6-7-2023) · Las propuestas de seguridad del programa de Sumar' },
        { url: 'https://www.publico.es/politica/sumar-propone-desarmar-policia-programa-electoral.html', titulo: 'Público (12-7-2023) · Sumar propone desmilitarizar la Guardia Civil' },
        { url: 'https://www.elsaltodiario.com/leyes-mordaza/eh-bildu-anuncia-un-acuerdo-gobieno-acabar-ley-mordaza', titulo: 'El Salto (3-10-2024) · El acuerdo para reformar la «ley mordaza»' },
      ],
    },
    {
      id: 'centro-izquierda',
      quien: 'PSOE y el Gobierno',
      cuando: 'Acuerdos y planes del Gobierno de 2024 a 2026',
      idea: 'Reformar la ley de seguridad ciudadana sin derogarla entera, y ampliar medios y policías pactando con cada comunidad.',
      propone: [
        'Reforma pactada en 2024: sin pelotas de goma, la falta de respeto a un agente pasa a falta leve y las multas tienen en cuenta la renta de cada persona.',
        'Cámaras personales para la Policía Nacional: 10,3 millones de euros adjudicados en 2024.',
        'Ampliar la Policía Foral de Navarra de 1.200 a 1.600 agentes, con todo el tráfico de Navarra (acuerdo de julio de 2026).',
        'Subir el gasto en seguridad y defensa al 2 % del PIB (lo que produce el país en un año) en 2025, con 10.471 millones más.',
      ],
      argumento: 'Dicen que la reforma quita las sanciones pensadas para disuadir de manifestarse, y que el gasto en defensa sube sin subir impuestos ni el déficit.',
      critica: 'Se le reprocha, sobre todo desde los sindicatos de Policía Nacional y Guardia Civil, que en 2026 bloqueara su jubilación anticipada por lo que costaría, aunque mossos, ertzainas y policías locales ya la tienen.',
      fuentes: [
        { url: 'https://www.elsaltodiario.com/leyes-mordaza/eh-bildu-anuncia-un-acuerdo-gobieno-acabar-ley-mordaza', titulo: 'El Salto (3-10-2024) · El acuerdo del Gobierno para reformar la «ley mordaza»' },
        { url: 'https://www.eldiario.es/navarra/gobiernos-central-navarro-acuerdan-ampliar-policia-foral-1-600-efectivos_1_13419014.html', titulo: 'elDiario.es (30-7-2026) · Los Gobiernos central y navarro amplían la Policía Foral a 1.600 agentes' },
        { url: 'https://www.lamoncloa.gob.es/presidente/actividades/paginas/2025/220425-sanchez-plan-seguridad-defensa.aspx', titulo: 'La Moncloa (22-4-2025) · Plan Industrial y Tecnológico para la Seguridad y la Defensa' },
      ],
    },
    {
      id: 'centro-derecha',
      quien: 'Partido Popular (PP)',
      cuando: 'Programa electoral de 2023 y propuestas de 2026',
      idea: 'Más medios y más protección legal para los agentes, y mantener la ley de seguridad ciudadana.',
      propone: [
        'Reconocer a policías y guardias civiles como profesión de riesgo y adelantar su jubilación (proposición de ley de 2026, que el Gobierno frenó).',
        'Terminar de igualar sus sueldos (2023) con los de las policías autonómicas.',
        'Recuperar y hacer permanentes las unidades contra el crimen organizado, como OCON-Sur, y atacar el dinero del narcotráfico.',
        'Reforzar la autoridad de los agentes; votó en contra de reformar la ley de seguridad ciudadana.',
        'Subir las Fuerzas Armadas hasta 140.000 militares (2023).',
      ],
      argumento: 'Dicen que a igual peligro corresponde igual reconocimiento, y que el narcotráfico ha ganado terreno porque los cuerpos han perdido medios y unidades.',
      critica: 'Sus críticos dicen que la ley de 2015, aprobada por el PP con su sola mayoría, sirve para multar protestas, y que reforzar la autoridad de los agentes sin un control externo facilita los abusos.',
      fuentes: [
        { url: 'https://www.elindependiente.com/espana/2023/07/05/el-plan-de-seguridad-de-feijoo-mejoras-para-policias-revision-del-sistema-de-viogen-y-reservistas-militares/', titulo: 'El Independiente (5-7-2023) · El plan de seguridad del programa del PP' },
        { url: 'https://www.elespanol.com/espana/20260910/gobierno-bloquea-jubilacion-anticipada-policia-guardia-civil-coste-arcas-publicas/1003744379538_0.html', titulo: 'El Español (10-9-2026) · El Gobierno frena la ley del PP de jubilación anticipada de policías' },
        { url: 'https://www.moncloa.com/2026/10/07/feijoo-narco-policias-3444014/', titulo: 'Moncloa.com (7-10-2026) · El plan del PP contra el narcotráfico' },
      ],
    },
    {
      id: 'derecha',
      quien: 'Vox',
      cuando: 'Programa electoral de 2023',
      idea: 'Un sistema de seguridad del Estado: las policías autonómicas se integran poco a poco en los cuerpos nacionales.',
      propone: [
        'Suprimir poco a poco las policías autonómicas e integrar a sus agentes en los cuerpos nacionales; mientras, igualar sus sueldos.',
        'Devolver al Estado la seguridad, el tráfico, la protección civil y las prisiones.',
        'El mismo sueldo y jubilación para Fuerzas Armadas, Guardia Civil, Policía Nacional, Vigilancia Aduanera y policías autonómicas y locales.',
        'Más pena por agredir o resistirse a un agente, y presencia policial en cada barrio.',
        'Un mando integrado de fronteras, con unidades militares en Ceuta, Melilla y Canarias.',
      ],
      argumento: 'Dicen que un solo sistema nacional evita duplicidades y diferencias entre agentes que hacen el mismo trabajo, y da la misma seguridad en todo el país.',
      critica: 'Sus críticos dicen que la Constitución y los estatutos de Cataluña, el País Vasco y Navarra recogen sus policías propias, así que haría falta reformarlos, y los partidos de esas comunidades lo rechazan.',
      fuentes: [
        { url: 'https://theobjective.com/wp-content/uploads/2023/07/programa-vox-23j.pdf', titulo: 'Vox · Programa electoral de las elecciones generales de 2023 (PDF)' },
      ],
    },
  ],
  revisado: '2026-11-12',
};
