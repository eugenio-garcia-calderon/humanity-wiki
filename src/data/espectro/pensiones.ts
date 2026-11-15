// «Otras propuestas» for the «pensiones» window. Camps checked on 2026-11-12
// (Vox updated on 2026-11-15 from its 29-N programme),
// during the campaign for the general election of 29 November 2026. Every card
// says when its proposals were published (`cuando`).
// The model's figures are read from pensionesPropuesta.ts.
import type { Espectro } from './tipos';
import { SMI_MES, PAGAS, PIERDEN } from '../pensionesPropuesta';
import { euros, numero } from '../modeloSocioeconomico';

export const ESPECTRO: Espectro | null = {
  tema: 'las pensiones',
  modelo: [
    `Una sola pensión por persona, igual al salario mínimo: ${euros(SMI_MES)} al mes en ${PAGAS} pagas.`,
    'No hay pensión máxima ni mínima: el mismo número para todos.',
    'Quien necesite más (hijos a cargo, riesgo de exclusión o de desahucio) lo pide a los servicios sociales, como ayuda aparte.',
    'Se anima a cada persona a ahorrar por su cuenta.',
    'Las cotizaciones van pasando a un fondo que invierte y que, con lo que rinda, acabará pagando las pensiones; hasta entonces se pagan como hoy.',
  ],
  limites: [
    `Unos ${numero(PIERDEN / 1e6, 1)} millones de pensiones bajarían: quien cotizó más cobraría lo mismo que quien cotizó menos.`,
    'El rendimiento del fondo no está garantizado: hay años de pérdidas, y con más personas jubiladas haría falta un fondo mayor o más años.',
    'Las cuentas del impuesto único todavía no dicen de dónde sale el dinero de la pensión durante la transición.',
  ],
  posturas: [
    {
      id: 'izquierda',
      quien: 'Frente Amplio (Sumar, Izquierda Unida, Más Madrid y Catalunya en Comú); aparte, Podemos',
      cuando: 'Propuestas de campaña para el 29-N, noviembre de 2026',
      idea: 'Subir las pensiones más bajas y adelantar la jubilación, pagándolo con impuestos nuevos.',
      propone: [
        'Que ninguna pensión quede por debajo del salario mínimo (Frente Amplio).',
        'Jubilarse como muy tarde a los 65 años (Frente Amplio) o bajar la edad a 63 (Podemos).',
        'Pagar esas medidas, unos 20.000 millones al año, con impuestos nuevos a las grandes fortunas y la banca.',
        'Subir las pensiones mínimas y las no contributivas, y rechazar la «mochila austriaca», una hucha por trabajador que se lleva de un empleo a otro (Podemos).',
      ],
      argumento: 'Dicen que una pensión por debajo del salario mínimo no da para vivir y que el sistema público se sostiene si aportan más quienes más tienen.',
      critica: 'Sus críticos dicen que cuesta mucho y que adelantar la jubilación choca con que se vive más años y hay menos trabajadores por cada pensionista.',
      fuentes: [
        { url: 'https://www.finect.com/usuario/eduardogarcia/articulos/revalorizar-capitalizar-o-jubilarse-antes-que-proponen-los-partidos-sobre-pensiones-el-29n', titulo: 'Finect · Qué proponen los partidos sobre pensiones el 29N (10-11-2026)' },
        { url: 'https://www.democrata.es/economia/colau-plantea-gravar-a-los-ultrarricos-y-subir-impuestos-a-banca-y-grandes-empresas/', titulo: 'Demócrata · Colau plantea gravar a los ultrarricos (5-11-2026)' },
      ],
    },
    {
      id: 'centro-izquierda',
      quien: 'PSOE y el Gobierno',
      cuando: 'Compromisos de campaña para el 29-N, noviembre de 2026',
      idea: 'Mantener el sistema público actual y garantizar que las pensiones suban con los precios.',
      propone: [
        'Subir las pensiones con el IPC (la subida de los precios) durante cuatro años más.',
        'Reformar la Constitución para asegurar esa subida.',
        'Terminar la legislatura con 20.000 millones en el Fondo de Reserva de las pensiones.',
        'Mantener las reformas de 2021 y 2023, con una cotización extra que llena ese fondo.',
      ],
      argumento: 'Dicen que el sistema público no está en quiebra, como afirman sus rivales, y que atar las pensiones a los precios protege a los jubilados.',
      critica: 'Se le reprocha que el gasto en pensiones crece más deprisa que los ingresos y que la reforma lo paga con más cotizaciones, lo que encarece contratar.',
      fuentes: [
        { url: 'https://www.finect.com/usuario/eduardogarcia/articulos/revalorizar-capitalizar-o-jubilarse-antes-que-proponen-los-partidos-sobre-pensiones-el-29n', titulo: 'Finect · Qué proponen los partidos sobre pensiones el 29N (10-11-2026)' },
        { url: 'https://www.democrata.es/politica/ampliacion-sanchez-se-compromete-a-blindar-las-pensiones-en-la-constitucion-y-reclama-apoyo-para-ir-mucho-mas-lejos/', titulo: 'Demócrata · Sánchez se compromete a blindar las pensiones en la Constitución (8-11-2026)' },
      ],
    },
    {
      id: 'centro-derecha',
      quien: 'Partido Popular (PP)',
      cuando: 'Programa para el 29-N, noviembre de 2026',
      idea: 'Garantizar las pensiones como compromiso de Estado y favorecer que quien quiera siga trabajando.',
      propone: [
        'Que las pensiones suban cada año con el IPC (la subida de los precios).',
        'Reconstruir el Pacto de Toledo, el acuerdo de todos los partidos sobre pensiones.',
        'Deducciones en el impuesto sobre la renta para quien compagine pensión y trabajo («jubilación activa»).',
        'Blindar por ley la caja única de la Seguridad Social y que las pensiones suban aunque no haya Presupuestos.',
      ],
      argumento: 'Dicen que las pensiones son un compromiso de Estado que debe quedar fuera de la pelea entre partidos, también para los jóvenes que cobrarán las suyas.',
      critica: 'Sus críticos dicen que promete subirlas con los precios sin decir cómo pagará ese gasto creciente, y le recuerdan que en enero de 2026 votó contra el decreto que las subía.',
      fuentes: [
        { url: 'https://www.democrata.es/uploads/s1/35/09/79/8/la-reconstruccion-nacional.pdf', titulo: 'PP · La reconstrucción nacional, programa electoral 29N (10-11-2026), medidas 18 y 108' },
        { url: 'https://www.finect.com/usuario/eduardogarcia/articulos/revalorizar-capitalizar-o-jubilarse-antes-que-proponen-los-partidos-sobre-pensiones-el-29n', titulo: 'Finect · Qué proponen los partidos sobre pensiones el 29N (10-11-2026)' },
        { url: 'https://orain.eus/es/politica/2026/01/27/pp-vox-junts-tumban-la-subida-las-pensiones-la-prorroga-del-escudo-social/', titulo: 'Orain · PP, Vox y Junts tumban la subida de las pensiones y la prórroga del escudo social (27-1-2026)' },
      ],
    },
    {
      id: 'derecha',
      quien: 'Vox',
      cuando: 'Programa para el 29-N, «Es sentido común», 12 de noviembre de 2026',
      idea: 'Asegurar las pensiones con una economía más productiva y más nacimientos.',
      propone: [
        'Garantizar que el sistema de pensiones se pueda pagar, con una economía más productiva (medida 7).',
        'Un plan nacional de natalidad, con más ventajas para las familias numerosas y escuela infantil gratis de 0 a 3 años (medida 94).',
        'Que el Estado pague la cotización a la Seguridad Social de quien cuida de sus hijos (medida 94).',
        'Más dinero para mayores y dependientes: ayuda a domicilio y plazas en residencias (medida 95).',
      ],
      nota: 'No hemos encontrado una reforma concreta de las pensiones en su programa para el 29-N; el sistema mixto, con una parte de ahorro invertido, que planteó en 2025 ya no aparece.',
      argumento: 'Dicen que las pensiones solo se sostienen con más trabajadores y empleos más productivos, y que por eso la clave es el crecimiento y la natalidad.',
      critica: 'Sus críticos dicen que más nacimientos tardarían más de veinte años en dar nuevos cotizantes, y que su programa no explica cómo se pagan las pensiones mientras tanto.',
      fuentes: [
        { url: 'https://men.gsstatic.es/sfAttachPlugin/4847171.pdf', titulo: 'Vox · «Es sentido común», programa electoral 29-N (12-11-2026), copia en PDF publicada por Menorca · Es Diari, medidas 7, 94 y 95' },
        { url: 'https://www.infobae.com/espana/2026/11/13/consulta-en-pdf-el-programa-electoral-de-vox-deportacion-de-migrantes-prioridad-nacional-y-derogacion-de-leyes-de-genero/', titulo: 'Infobae · El programa electoral de Vox para el 29-N, en PDF (13-11-2026)' },
      ],
    },
  ],
  revisado: '2026-11-15',
};
