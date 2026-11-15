// «Otras propuestas» for the «seguridad» window. Positions checked on 2026-11-12
// and updated on 2026-11-15: the PP and Vox from their 29-N programmes. No 2026
// proposal on security was found for the Frente Amplio, so the left's card rests
// on Sumar's 2023 programme; the date is in every source title.
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
      nota: 'No hemos encontrado propuestas del Frente Amplio sobre policía y seguridad para el 29-N en sus textos publicados; esta ficha usa el programa de Sumar de 2023.',
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
      cuando: 'Programa para el 29-N, noviembre de 2026',
      idea: 'Más medios y más protección legal para los agentes, y más dureza con el narcotráfico y los disturbios.',
      propone: [
        'Reconocer a policías y guardias civiles como profesión de riesgo y terminar de igualar sus sueldos con los de las policías autonómicas (medida 32).',
        'Contra el narcotráfico: una unidad permanente en la frontera sur, escáneres de contenedores en cuatro puertos y más agentes en la costa andaluza (medida 19).',
        'Defensa jurídica de los agentes desde el primer momento, y juzgar su actuación según lo que sabían al actuar (medida 31).',
        'Más pena por actuar con la cara tapada en disturbios, y una multa mínima de 3.000 euros por vandalismo que no sea delito (medidas 21 a 24).',
        'Presencia policial visible en los barrios con más inseguridad y desalojo inmediato de las ocupaciones (medida 27).',
      ],
      argumento: 'Dicen que a igual peligro corresponde igual reconocimiento, y que el narcotráfico ha ganado terreno porque los cuerpos han perdido medios y unidades.',
      critica: 'Sus críticos dicen que endurecer multas y penas por disturbios puede servir para castigar la protesta, como reprochan a la ley de 2015 que el PP aprobó con su sola mayoría, y que proteger más a los agentes sin un control externo facilita los abusos.',
      fuentes: [
        { url: 'https://www.democrata.es/uploads/s1/35/09/79/8/la-reconstruccion-nacional.pdf', titulo: 'PP · La reconstrucción nacional, programa electoral 29N (10-11-2026), medidas 19, 21 a 24, 27, 31 y 32' },
        { url: 'https://www.moncloa.com/2026/11/10/pp-plan-reconstruccion-3465233/', titulo: 'Moncloa.com (10-11-2026) · El programa electoral del PP para el 29-N' },
        { url: 'https://www.moncloa.com/2026/10/07/feijoo-narco-policias-3444014/', titulo: 'Moncloa.com (7-10-2026) · El plan del PP contra el narcotráfico' },
      ],
    },
    {
      id: 'derecha',
      quien: 'Vox',
      cuando: 'Programa para el 29-N, «Es sentido común», 12 de noviembre de 2026',
      idea: 'Más medios, más sueldo y más reconocimiento para los agentes, y las Fuerzas Armadas en la frontera.',
      propone: [
        'Igualar sueldos y reconocer como profesión de riesgo a policías, guardias civiles, militares y funcionarios de prisiones (medidas 84, 85 y 89).',
        'Que dirijan la Guardia Civil y la Policía personas con experiencia en seguridad, no políticos de partido (medida 82).',
        'Recuperar ya la unidad contra el narcotráfico OCON-Sur, con más medios (medida 86).',
        'Proteger las fronteras de forma permanente con las Fuerzas Armadas, y militarizar la de Ceuta (medidas 1 y 88).',
        'Más medios para Fuerzas Armadas, servicios de inteligencia, Guardia Civil, Policía, Vigilancia Aduanera y prisiones, y más ciberseguridad (medidas 83 y 91).',
      ],
      argumento: 'Dicen que quienes se juegan la vida merecen el mismo sueldo y reconocimiento en todos los cuerpos, y que el narcotráfico y la inmigración ilegal exigen más medios y fronteras protegidas.',
      critica: 'Sus críticos dicen que poner a las Fuerzas Armadas a vigilar fronteras mezcla la defensa con el trabajo policial, y que no explica cuánto costaría igualar los sueldos de todos los cuerpos.',
      fuentes: [
        { url: 'https://men.gsstatic.es/sfAttachPlugin/4847171.pdf', titulo: 'Vox · «Es sentido común», programa electoral 29-N (12-11-2026), copia en PDF publicada por Menorca · Es Diari, medidas 1, 82 a 89 y 91' },
        { url: 'https://www.menorca.info/actualidad/elecciones-29n/2026/11/15/2748997/programa-completo-vox-para-elecciones-generales-2026.html', titulo: 'Menorca · Es Diari · El programa completo de Vox para el 29-N (15-11-2026)' },
      ],
    },
  ],
  revisado: '2026-11-15',
};
