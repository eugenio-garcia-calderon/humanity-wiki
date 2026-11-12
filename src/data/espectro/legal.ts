// «Otras propuestas» for the «legal» window. Positions checked on 2026-11-12.
// The subject is who writes the rules (State, regions, towns) and how many there
// are. Sumar's card rests on its 2023 programme; the date is in every source title.
import type { Espectro } from './tipos';

export const ESPECTRO: Espectro | null = {
  tema: 'quién hace las normas',
  modelo: [
    'Una sola norma común por cada materia básica (ruido, aire, residuos, licencias, suelo), igual en todo el país y, a futuro, en Europa.',
    'Las escalas pequeñas solo ajustan dentro de los márgenes que fija esa norma común.',
    'Licencias en tres niveles, iguales en todas partes (aviso, declaración responsable o licencia), y una ventanilla única en el móvil.',
    'Por cada norma nueva salen dos de la misma materia, y cada norma tiene fecha de revisión: si nadie la revisa, deja de valer.',
  ],
  limites: [
    'Sus críticos dicen que choca con la autonomía que la Constitución da a comunidades y municipios, y que los tribunales ya anularon intentos parecidos en 2017 y en 2026.',
    'También, que llevar materias a una norma común exige reformar la Constitución y los estatutos, con tres quintos del Congreso y del Senado.',
    'Y que una norma igual para todos puede pasar por alto lo que sí debe ser distinto, como el clima de cada sitio o el tipo de calle.',
  ],
  posturas: [
    {
      id: 'izquierda',
      quien: 'Sumar (programa de 2023); ERC, Bildu y BNG piden más autogobierno todavía',
      cuando: 'Programa electoral de Sumar de 2023 y pacto de ERC con el PSC de 2024',
      idea: 'Más autogobierno para las comunidades, dentro de un Estado que reconozca varias naciones.',
      propone: [
        'Reconocer a España como un país plurinacional, «un país de países», con un nuevo pacto territorial.',
        'Desarrollar más el autogobierno y el gobierno compartido entre el Estado y las comunidades.',
        'Que el acuerdo entre el Gobierno y la Generalitat se vote en Cataluña.',
        'ERC: que la Generalitat gestione y recaude todos los impuestos que se pagan en Cataluña (pacto de 2024 con el PSC).',
      ],
      nota: 'No hemos encontrado una propuesta concreta sobre reducir el número de normas en sus textos publicados.',
      argumento: 'Dicen que España es diversa y que cada territorio debe poder decidir sus propias normas sobre lo que le afecta, cerca de quien las vive.',
      critica: 'Sus críticos dicen que más normas propias en cada comunidad multiplican las diferencias y los trámites para quien vive o trabaja en varias, y que recaudar por separado debilita la caja común.',
      fuentes: [
        { url: 'https://es.ara.cat/politica/elecciones-generales/programa-sumar-referendum-consulta-mesa-dialogo_1_4754782.html', titulo: 'Ara (13-7-2023) · El modelo territorial en el programa de Sumar' },
        { url: 'https://www.elindependiente.com/espana/cataluna/2024/07/30/el-pacto-psc-erc-cede-la-gestion-de-los-impuestos-el-blindaje-del-catalan-y-la-entrada-en-la-gestion-del-aeropuerto-de-el-prat/', titulo: 'El Independiente (30-7-2024) · El pacto PSC-ERC sobre los impuestos en Cataluña' },
      ],
    },
    {
      id: 'centro-izquierda',
      quien: 'PSOE y el Gobierno',
      cuando: 'Acuerdos del Gobierno de 2024 a 2026',
      idea: 'Un modelo más federal, con acuerdos entre el Estado y cada comunidad.',
      propone: [
        'Un «modelo tributario federal»: más poder de las comunidades para regular, recaudar e inspeccionar impuestos, empezando por Cataluña (acuerdo de julio de 2025).',
        'Que la agencia tributaria de Cataluña trabaje en red con la del Estado y recaude poco a poco el IRPF (el impuesto sobre la renta).',
        'Traspasos pactados: todo el tráfico de Navarra a la Policía Foral (2026) y una línea de Rodalies, los trenes de cercanías, a Cataluña.',
      ],
      nota: 'No hemos encontrado una propuesta concreta sobre reducir el número de normas en sus textos publicados.',
      argumento: 'Dicen que las comunidades deben ser más responsables de lo que gastan y recaudan, sin dejar de aportar a la solidaridad entre territorios.',
      critica: 'Sus críticos, entre ellos gobiernos autonómicos del PP y algunos del propio PSOE, dicen que pactar con una sola comunidad rompe la igualdad entre territorios; Castilla y León anunció que lo llevaría al Tribunal Constitucional.',
      fuentes: [
        { url: 'https://www.diariodeleon.es/nacional/250715/2054150/gobierno-generalitat-pactan-cambio-financiacion-apoyos-suficientescyl-recurrira-tribunal-constitucional-acuerdo.html', titulo: 'Diario de León (15-7-2025) · El Gobierno y la Generalitat pactan un cambio de la financiación' },
        { url: 'https://www.elindependiente.com/espana/cataluna/2024/07/30/el-pacto-psc-erc-cede-la-gestion-de-los-impuestos-el-blindaje-del-catalan-y-la-entrada-en-la-gestion-del-aeropuerto-de-el-prat/', titulo: 'El Independiente (30-7-2024) · El pacto PSC-ERC: impuestos y Rodalies' },
        { url: 'https://www.eldiario.es/navarra/gobiernos-central-navarro-acuerdan-ampliar-policia-foral-1-600-efectivos_1_13419014.html', titulo: 'elDiario.es (30-7-2026) · El traspaso del tráfico a la Policía Foral de Navarra' },
      ],
    },
    {
      id: 'centro-derecha',
      quien: 'Partido Popular (PP)',
      cuando: 'Programa para el 29-N (noviembre de 2026) y plan contra la burocracia de octubre de 2025',
      idea: 'Menos normas y menos trámites, y acuerdos territoriales con todas las comunidades a la vez.',
      propone: [
        'Regla del tres por uno: por cada norma nueva, quitar tres.',
        'Reducir las cargas administrativas un 25 % antes de 2029, y un 35 % para las pequeñas y medianas empresas.',
        'Más silencio administrativo positivo: si la administración no responde a tiempo, la respuesta es sí.',
        'Pactar la financiación autonómica con todas las comunidades en la Conferencia de Presidentes, sin acuerdos con una sola.',
        'Una sola prueba de acceso a la universidad para todo el país.',
      ],
      argumento: 'Dicen que el exceso de normas frena la inversión y el empleo: según el Instituto de Estudios Económicos, en 2024 se publicaron en España 1,3 millones de páginas de normas.',
      critica: 'Sus críticos dicen que quitar normas por cuota puede eliminar protecciones útiles, y que no concreta qué normas quitaría.',
      fuentes: [
        { url: 'https://www.moncloa.com/2026/11/10/pp-plan-reconstruccion-3465233/', titulo: 'Moncloa.com (10-11-2026) · El programa electoral del PP para el 29-N' },
        { url: 'https://www.eldebate.com/espana/20251020/feijoo-anuncia-plan-contra-burocracia-cada-nueva-norma-eliminaremos-tres-menos-boe-pib_346523.html', titulo: 'El Debate (20-10-2025) · El plan de Feijóo contra la burocracia' },
      ],
    },
    {
      id: 'derecha',
      quien: 'Vox',
      cuando: 'Plan de desregulación de junio de 2026 y programa electoral de 2023',
      idea: 'Un Estado unitario: una sola norma para todo el país y menos poder para las comunidades.',
      propone: [
        'Devolver al Estado la educación, la sanidad, la seguridad y la justicia, y limitar lo que las comunidades pueden legislar (2023).',
        'Una ley de mercado único que esté por encima de las normas de las 17 comunidades, y usar el artículo 150.3 de la Constitución (que deja al Estado fijar principios comunes incluso en lo que es de las comunidades) para fijar normas comunes.',
        'Regla del tres por uno: por cada norma nueva, quitar tres.',
        'El silencio administrativo positivo como regla general, y una sola base de datos para toda la administración.',
      ],
      argumento: 'Dicen que el exceso de normas es un impuesto oculto de más de 70.000 millones de euros, unos 4.410 euros por hogar, y que 17 normas distintas rompen la unidad del mercado.',
      critica: 'Sus críticos dicen que recentralizar exige reformar la Constitución y los estatutos, y que quitar normas en bloque puede eliminar protecciones sociales y ambientales.',
      fuentes: [
        { url: 'https://www.elindependiente.com/espana/2026/06/27/plan-desregularizacion-vox-milei-elecciones-2027/', titulo: 'El Independiente (27-6-2026) · El plan de desregulación de Vox' },
        { url: 'https://theobjective.com/wp-content/uploads/2023/07/programa-vox-23j.pdf', titulo: 'Vox · Programa electoral de las elecciones generales de 2023 (PDF)' },
      ],
    },
  ],
  revisado: '2026-11-12',
};
