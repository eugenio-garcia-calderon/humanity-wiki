// «Otras propuestas» for the «escalas» window: what other political camps in
// Spain propose on how power and money are shared between the State, the
// regions and the town halls (centralisation versus decentralisation), from
// left to right. Checked on 2026-11-12; Vox and the Frente Amplio updated on
// 2026-11-15 from their 29-N programmes (the latter as reported by the press).
import type { Espectro } from './tipos';

export const ESPECTRO: Espectro | null = {
  tema: 'el reparto del poder entre el Estado, las comunidades y los ayuntamientos',
  modelo: [
    'Ocho escalas, de la persona al planeta, cada una con dinero propio y poder para decidir.',
    'La regla: lo hace la escala más cercana que pueda hacerlo bien.',
    'En cada escala, quienes viven en ella eligen qué es prioritario y un comité técnico decide cómo hacerlo. Todas las cuentas, a la vista.',
    'Las tareas suben solo cuando la escala cercana no puede; la ayuda baja, con préstamos sin intereses, solo ajustados a la subida de los precios, y donaciones puntuales.',
  ],
  limites: [
    'Sus críticos dicen que dar lo mismo por habitante no es dar lo mismo por necesidad: un pueblo envejecido o disperso necesita más, y faltan reglas claras de cuánto se compensa.',
    'También, que la gente participe de verdad en asambleas y votaciones pide tiempo e información; si participa poca gente, deciden unos pocos.',
    'Y que dar dinero propio a la persona y a la comunidad vecinal exige reformar la Constitución y la ley de régimen local.',
  ],
  posturas: [
    {
      id: 'izquierda',
      quien: 'Sumar (programa de 2023) y Frente Amplio (Sumar, Izquierda Unida, Más Madrid y Comuns) en 2026',
      cuando: 'Programa electoral de Sumar de 2023, propuesta en el Congreso (febrero de 2025) y programa «100+15» del Frente Amplio (12 de noviembre de 2026, recogido por la prensa)',
      idea: 'Reconocer que España es un país de naciones, con más autogobierno para las comunidades y más poder y dinero para los ayuntamientos.',
      propone: [
        'Reconocer a España como una realidad plurinacional, un «país de países» (programa de 2023).',
        'Un nuevo pacto territorial, con más autogobierno y más gobierno compartido (programa de 2023).',
        'Un «Estado en red» que saque instituciones de Madrid, como llevar la sede del Defensor del Pueblo a Vigo (Frente Amplio, 2026).',
        'Una ley de gobiernos locales que cambie la ley de régimen local de 2013 y reconozca competencias propias de los ayuntamientos (2025).',
        'Una ley de finanzas locales que fije qué parte de los impuestos del Estado y de las comunidades va a los ayuntamientos (2025).',
      ],
      nota: 'No hemos encontrado un modelo territorial completo del Frente Amplio para el 29-N en sus textos publicados; salvo el «Estado en red», esta ficha usa textos de Sumar de 2023 y 2025.',
      argumento: 'Dicen que España es diversa y que el Estado funciona mejor si lo reconoce, y que los ayuntamientos cerraban sus cuentas con superávit y no necesitaban las limitaciones de la ley de 2013.',
      critica: 'Sus críticos dicen que los pactos con cada comunidad por separado rompen la igualdad entre españoles y dan más a quien más presiona.',
      fuentes: [
        { url: 'https://es.ara.cat/politica/elecciones-generales/programa-sumar-referendum-consulta-mesa-dialogo_1_4754782.html', titulo: 'Ara · El programa territorial de Sumar, programa electoral 2023 (13-07-2023)' },
        { url: 'https://www.ondavasca.com/sumar-propone-en-el-congreso-una-ley-de-gobiernos-locales-para-mejorar-la-financiacion-de-los-ayuntamientos/', titulo: 'Onda Vasca · Sumar propone en el Congreso una ley de gobiernos locales (01-02-2025)' },
        { url: 'https://www.galiciaconfidencial.com/noticia/6089258-frente-amplio-propon-unha-ap-9-gratuita-unha-prestacion-200-euros-cada-menor-e-unha-farmaceutica-publica-santiago', titulo: 'Galicia Confidencial · El programa «100+15» del Frente Amplio: el Defensor del Pueblo a Vigo y un Estado en red (12-11-2026; lo recoge la prensa)' },
      ],
    },
    {
      id: 'centro-izquierda',
      quien: 'PSOE y el Gobierno',
      cuando: 'Modelo de financiación propuesto en enero de 2026 y condonación de deuda aprobada por el Gobierno en diciembre de 2025',
      idea: 'Dar más dinero y más impuestos a las comunidades dentro del sistema actual, y aliviar su deuda.',
      propone: [
        'Un nuevo sistema de financiación que da a las comunidades unos 21.000 millones más en 2027.',
        'Que las comunidades se queden el 55 % del impuesto sobre la renta (hoy el 50 %) y el 56,5 % del IVA, el impuesto sobre lo que se compra (hoy el 50 %).',
        'Gestionar los impuestos «en red», con más funciones para las comunidades, coordinadas con el Estado.',
        'Perdonar a las comunidades unos 83.000 millones de deuda que tienen con el Estado.',
      ],
      argumento: 'Dicen que las comunidades pagan la sanidad, la educación y los servicios sociales, y que necesitan más recursos propios para sostenerlos.',
      critica: 'Sus críticos dicen que el nuevo sistema se pactó con sus socios catalanes y salió adelante con el rechazo de la mayoría de las comunidades, y que perdonar deuda premia a quien más gastó.',
      fuentes: [
        { url: 'https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/hacienda/paginas/2026/090126-modelo-financiacion-comunidades.aspx', titulo: 'La Moncloa · Hacienda propone un nuevo modelo de financiación autonómica (09-01-2026)' },
        { url: 'https://www.hacienda.gob.es/es-ES/Prensa/Noticias/Paginas/2025/20251209-NP-CM-CONDONACION-DEUDA-CCAA.aspx', titulo: 'Ministerio de Hacienda · El Consejo de Ministros aprueba la condonación de deuda de las comunidades (09-12-2025)' },
        { url: 'https://es.euronews.com/2026/09/04/reforma-financiacion-autonomica-avanza-rechazo-territorial', titulo: 'Euronews · La reforma de la financiación autonómica avanza con el rechazo de la mayoría de comunidades (04-09-2026)' },
      ],
    },
    {
      id: 'centro-derecha',
      quien: 'Partido Popular (PP)',
      cuando: 'Programa para el 29-N (noviembre de 2026) y declaración sobre financiación local (marzo de 2026)',
      idea: 'Una financiación común para todas las comunidades, negociada entre todas, y más dinero y margen para los ayuntamientos.',
      propone: [
        'Rechazar los acuerdos con una sola comunidad que le permitan salir del sistema común de financiación.',
        'Negociar un nuevo modelo con todas las comunidades a la vez, con un fondo transitorio para igualar recursos.',
        'Un plan para reforzar la presencia del Estado, sobre todo en Cataluña, País Vasco y Navarra.',
        'Reformar la financiación de los ayuntamientos a la vez que la de las comunidades, sin que pierdan dinero.',
        'Más margen a los ayuntamientos para adaptar sus impuestos y para invertir sus ahorros, por ejemplo en vivienda.',
      ],
      argumento: 'Dicen que cada comunidad es distinta pero todos los españoles deben tener los mismos derechos, y que el ayuntamiento es la administración que mejor conoce lo que necesitan los vecinos.',
      critica: 'Sus críticos dicen que su fondo para igualar recursos no tiene cuantía ni reglas de reparto, y que reforzar la presencia del Estado en unas comunidades concretas choca con su autogobierno.',
      fuentes: [
        { url: 'https://www.democrata.es/elecciones-generales-espana/programa-electoral-pp-29n-propuestas/', titulo: 'Demócrata · El programa del PP para las elecciones del 29-N, «La Reconstrucción Nacional» (noviembre de 2026)' },
        { url: 'https://www.pp.es/storage/2026/03/DECLARACION-PP-JORNADA-DE-FINANACION-LOCAL-DE-BARCELONA.pdf', titulo: 'PP · Declaración de la Jornada de Financiación Local (17-03-2026)' },
      ],
    },
    {
      id: 'derecha',
      quien: 'Vox',
      cuando: 'Programa para el 29-N, «Es sentido común», 12 de noviembre de 2026; plan de desregulación (junio de 2026) y programa para Castilla y León de 2026',
      idea: 'Los mismos derechos y las mismas reglas en toda España, con menos autonomías y menos administración.',
      propone: [
        'Una ley de unidad de mercado: lo que es legal en una comunidad vale en toda España (medida 42).',
        'Los mismos servicios y derechos en educación, sanidad, seguridad y justicia, se viva donde se viva (medida 25).',
        'Un currículo escolar y unos exámenes comunes para todo el país, y una tarjeta sanitaria única (medidas 60 y 66).',
        'Reducir el tamaño del Estado y de las autonomías, y suprimir duplicidades y gasto político (plan de junio de 2026 y programa de Castilla y León).',
      ],
      nota: 'No hemos encontrado en su programa para el 29-N la propuesta de devolver al Estado la educación, la sanidad, la seguridad y la justicia, que sí estaba en su programa de 2023.',
      argumento: 'Dicen que el sistema autonómico ha creado desigualdad entre españoles y un gasto duplicado, y que un solo Estado garantiza los mismos derechos en todas partes.',
      critica: 'Sus críticos dicen que igualar desde el Estado currículos y servicios choca con las competencias que la Constitución da a las comunidades, y que alejar las decisiones de cada territorio no garantiza mejores servicios.',
      fuentes: [
        { url: 'https://men.gsstatic.es/sfAttachPlugin/4847171.pdf', titulo: 'Vox · «Es sentido común», programa electoral 29-N (12-11-2026), copia en PDF publicada por Menorca · Es Diari, medidas 25, 42, 60 y 66' },
        { url: 'https://theobjective.com/espana/politica/2026-06-27/desregulacion-motosierra-vox-podar-marana-burocratica/', titulo: 'The Objective · El programa de desregulación de Vox (27-06-2026)' },
        { url: 'https://www.eldebate.com/uploads/files/2026/03/05/Programa-Electoral-VOX-CYL-2026_compressed.pdf', titulo: 'Vox · Programa electoral de Castilla y León 2026 (medidas 19 y 21)' },
      ],
    },
  ],
  revisado: '2026-11-15',
};
