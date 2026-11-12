// «Otras propuestas» for the «pensiones» window. Camps checked on 2026-11-12,
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
      cuando: 'Propuestas de campaña para el 29-N, octubre de 2026, y programa electoral de 2023',
      idea: 'Pasar a un sistema mixto: parte de reparto, como hoy, y parte de ahorro que se invierte.',
      propone: [
        'Combinar el sistema actual con una parte de capitalización (cada persona ahorra en una cuenta que se invierte), con Suecia como modelo.',
        'Empezar a capitalizar un fondo público de pensiones.',
        'Que el ahorro personal para la jubilación no pague impuestos, con condiciones.',
        'Que las pensiones contributivas no paguen impuesto sobre la renta (2023).',
      ],
      argumento: 'Dicen que el sistema actual está «quebrado» y que su coste empuja la deuda, así que hace falta un ahorro propio que lo complemente; niegan que quieran privatizarlo.',
      critica: 'Sus críticos dicen que el cambio obliga durante años a pagar las pensiones de hoy y a la vez ahorrar para las de mañana, y que pone en riesgo las pensiones.',
      fuentes: [
        { url: 'https://www.democrata.es/elecciones-generales-espana/vox-lleva-29n-su-receta-economica-con-rebajas-fiscales-recorte-gasto-reforma-pensiones/', titulo: 'Demócrata · Vox lleva al 29N su receta económica (7-10-2026)' },
        { url: 'https://www.finect.com/usuario/eduardogarcia/articulos/revalorizar-capitalizar-o-jubilarse-antes-que-proponen-los-partidos-sobre-pensiones-el-29n', titulo: 'Finect · Qué proponen los partidos sobre pensiones el 29N (10-11-2026)' },
        { url: 'https://maldita.es/desinfo/20261023/punto-del-programa-de-vox-las-pensiones-contributivas-estara-n-exentas-en-el-irpf-no-por-doble-tributacio-n-sino-por-justicia-con-quienes-han-tributado-durante-toda-su-vida-laboral-1915/', titulo: 'Maldita · La exención de las pensiones en el IRPF, del programa de Vox (23-10-2026)' },
      ],
    },
  ],
  revisado: '2026-11-12',
};
