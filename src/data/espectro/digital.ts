// «Otras propuestas» for the «digital» window: what other political camps in
// Spain propose on digital identity and online dealings with the
// administration, from left to right. Checked on 2026-11-12.
import type { Espectro } from './tipos';

export const ESPECTRO: Espectro | null = {
  tema: 'la identidad digital y los trámites por internet',
  modelo: [
    'Darse de alta una sola vez, con el móvil, el correo y el DNI comprobado.',
    'Para firmar: llega un aviso al móvil, se desbloquea y se escribe el código del SMS. Sin instalar nada.',
    'Para lo grave (vender una casa, una hipoteca, un poder), además se escanea el DNI y la cara.',
    'Un teléfono gratuito, con personas, para quien no tiene móvil.',
    'Una misma firma para todas las administraciones, que valga en toda Europa.',
  ],
  limites: [
    'Sus críticos dicen que el código por SMS se puede robar con un duplicado de la tarjeta del móvil, y que un móvil robado y desbloqueado permite intentar firmar en nombre de otro.',
    'También, que un registro único guarda mucho: un fallo o un abuso afectaría a todos.',
    'Y que no hay un cálculo de cuánto costaría el sistema único ni de cuánto se ahorraría.',
  ],
  posturas: [
    {
      id: 'izquierda',
      quien: 'Sumar (desde 2026, dentro del Frente Amplio)',
      cuando: 'Propuesta en el Congreso (abril de 2025) y declaraciones en el Congreso (febrero de 2026)',
      idea: 'Una identidad y unos pagos digitales europeos, para depender menos de empresas de Estados Unidos.',
      propone: [
        'Aplicar ya en España la identidad digital europea, para que cada persona controle mejor sus pagos y sus datos.',
        'Que el Banco Central Europeo decida emitir el euro digital.',
        'Depender menos de Visa y Mastercard para pagar con tarjeta.',
        'Hacer de la educación financiera y digital una política pública.',
        'Que el Gobierno deje de usar la red X como canal oficial.',
      ],
      nota: 'No hemos encontrado una propuesta concreta sobre la firma digital ni sobre los trámites con la administración en sus textos publicados.',
      argumento: 'Dicen que la identidad, los pagos y la información pública no pueden depender de empresas extranjeras, y que Europa necesita herramientas propias para proteger sus datos.',
      critica: 'Sus críticos dicen que el euro digital y la identidad europea dan a las instituciones más información sobre la vida de cada persona, y que dejar las redes mayoritarias aleja la información pública de mucha gente.',
      fuentes: [
        { url: 'https://www.bolsamania.com/noticias/economia/economia--sumar-llama-a-promover-el-euro-digital-para-replicar-los-aranceles-de-trump-y-hacer-frente-a-visa-y-mastercard--19308122.html', titulo: 'Europa Press, en Bolsamanía · Sumar pide el euro digital y la identidad digital europea (07-04-2025)' },
        { url: 'https://www.cronista.com/espana/politica-es/desde-el-gobierno-le-exigen-a-sanchez-que-rompa-con-x-y-abandone-la-red-al-servicio-del-fascismo-global', titulo: 'El Cronista · Sumar pide a Sánchez que deje la red X (11-02-2026)' },
      ],
    },
    {
      id: 'centro-izquierda',
      quien: 'PSOE y el Gobierno',
      cuando: 'Anuncios y normas del Gobierno, de enero de 2025 a septiembre de 2026',
      idea: 'Llevar el DNI y los trámites al móvil, y ligar la identidad digital a las redes sociales.',
      propone: [
        'El DNI en el móvil, con la aplicación MiDNI (desde abril de 2025).',
        'Abrir los algoritmos de las redes sociales para comprobar que cumplen la ley europea.',
        'Un real decreto para poner en marcha en España la cartera europea de identidad digital.',
        'Que cada cuenta de una red social esté ligada a la identidad digital europea: se puede usar un seudónimo, pero la justicia puede saber quién es en caso de delito.',
        'Que los dueños de las redes respondan personalmente si sus plataformas incumplen la ley.',
      ],
      argumento: 'Dicen que la identidad digital hace los trámites más fáciles, y que en las redes el anonimato protege a quien difunde bulos y comete delitos.',
      critica: 'Sus críticos dicen que ligar cada cuenta a una identidad real pone en riesgo la libertad de expresión, y que hoy siguen conviviendo varios sistemas para identificarse que obligan a instalar programas.',
      fuentes: [
        { url: 'https://www.lamoncloa.gob.es/presidente/actividades/Paginas/2025/220125-sanchez-foro-economico-mundial-davos.aspx', titulo: 'La Moncloa · Sánchez en Davos: acabar con el anonimato en redes (22-01-2025)' },
        { url: 'https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/interior/Paginas/2025/nuevo-dni-digital.aspx', titulo: 'La Moncloa · DNI digital: qué es y cómo activarlo (abril de 2025)' },
        { url: 'https://digital.gob.es/ministerio/participacion-proyectos-normativos/informacion-publica/2026-09-30', titulo: 'Ministerio para la Transformación Digital · Proyecto de real decreto de la cartera europea de identidad digital (2026)' },
      ],
    },
    {
      id: 'centro-derecha',
      quien: 'Partido Popular (PP)',
      cuando: 'Programa para el 29-N (noviembre de 2026) y propuesta en el Congreso (mayo de 2026)',
      idea: 'Menos papeleo y trámites más rápidos, sin que nadie quede fuera por no saber usar internet.',
      propone: [
        'Reducir las cargas administrativas un 25 % antes de 2029, y un 35 % para las pequeñas empresas.',
        'Que una licencia de actividad concedida en una comunidad valga en todas las demás.',
        'Licencias de obra resueltas en tres meses como máximo; si no hay respuesta, se dan por concedidas.',
        'Prohibir las cuentas en redes sociales a menores de 14 años, y con permiso de los padres hasta los 16.',
        'Que la cita previa sea voluntaria y se atienda en persona con o sin cita.',
      ],
      nota: 'No hemos encontrado una propuesta concreta sobre identidad ni firma digital en sus textos publicados.',
      argumento: 'Dicen que la administración debe ahorrar tiempo a la gente, y que la cita previa obligatoria hace perder derechos a quien no consigue cita a tiempo.',
      critica: 'Sus críticos dicen que prohibir las redes a menores exige comprobar la edad de todos los usuarios, con riesgos para la privacidad, y que atender a todos sin cita alarga las colas si no hay más personal.',
      fuentes: [
        { url: 'https://www.democrata.es/elecciones-generales-espana/programa-electoral-pp-29n-propuestas/', titulo: 'Demócrata · El programa del PP para las elecciones del 29-N, «La Reconstrucción Nacional» (noviembre de 2026)' },
        { url: 'https://www.esdiario.com/nacional/260515/187852/pp-declara-guerra-cita-previa-obligatoria-perdieron-derechos-sistema.html', titulo: 'ESdiario · El PP pide en el Congreso que la cita previa deje de ser obligatoria (15-05-2026)' },
      ],
    },
    {
      id: 'derecha',
      quien: 'Vox',
      cuando: 'Plan de desregulación (junio de 2026) y proposición de ley en el Congreso (abril de 2024)',
      idea: 'Menos normas y menos trámites, y que cada persona elija tratar con la administración por internet o en persona.',
      propone: [
        'Eliminar la obligación de pedir cita previa.',
        'Una sola base de datos para toda la administración.',
        'Que cada ley nueva diga qué tres normas deroga, o no se tramita.',
        'Que cada persona elija en cualquier momento si trata con la administración por internet o no (2024).',
        'Reconocer el derecho a una atención presencial y personal en las oficinas (2024).',
      ],
      argumento: 'Dicen que la administración está al servicio de la gente y no al revés, y que el exceso de normas y la obligación de usar internet dejan fuera a mayores y a quien no se maneja.',
      critica: 'Sus críticos dicen que mantener siempre la vía en papel y en persona encarece la administración, y que una sola base de datos reúne mucha información de cada persona en un mismo sitio.',
      fuentes: [
        { url: 'https://theobjective.com/espana/politica/2026-06-27/desregulacion-motosierra-vox-podar-marana-burocratica/', titulo: 'The Objective · El programa de desregulación de Vox (27-06-2026)' },
        { url: 'https://www.congreso.es/public_oficiales/L15/CONG/BOCG/B/BOCG-15-B-104-1.PDF', titulo: 'Congreso · Proposición de ley de Vox para la mejora de la atención a los ciudadanos (26-04-2024)' },
      ],
    },
  ],
  revisado: '2026-11-12',
};
