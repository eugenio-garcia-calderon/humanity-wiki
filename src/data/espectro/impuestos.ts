// «Otras propuestas» for the «impuestos» window (the «Recaudación» window: the
// single tax). Camps checked on 2026-11-12, during the campaign for the general
// election of 29 November 2026; Vox's card updated on 2026-11-15. The PP and Vox
// from their 29-N programmes (PP 10-11-2026, Vox 12-11-2026); the Frente Amplio
// from its campaign proposals as reported by the press (no full programme
// published on 2026-11-15); the PSOE from the tax law it passed in government
// (its programme was being presented on 2026-11-15, contents not yet public).
// Every card says when its proposals were published (`cuando`).
// The model's rates and figures are read from the data, never repeated here.
import type { Espectro } from './tipos';
import { TRAMOS, EMPLEADORES, TIPO_GENERAL, cuentasPais, porcentaje } from '../modeloSocioeconomico';

const pct = (t: number) => `${Math.round(t * 100)} %`;
const compras = TRAMOS.map(t => `${pct(t.tipo)} ${t.nombre.toLowerCase()}`);
const tramosCompras = `${compras.slice(0, -1).join(', ')} y ${compras[compras.length - 1]}`;
const tiposSueldos = EMPLEADORES.filter(e => e.tramo !== null).map(e => Math.round(e.tipo * 100));
const tramosSueldos = `${tiposSueldos.slice(0, -1).join(', ')} o ${tiposSueldos[tiposSueldos.length - 1]} %`;
const recaudaPIB = porcentaje(cuentasPais('literal').pctPIB, 0);

export const ESPECTRO: Espectro | null = {
  tema: 'los impuestos',
  modelo: [
    'Un solo impuesto sustituye a los impuestos y cotizaciones de hoy.',
    `Se cobra en el momento de pagar, sumado al precio como hoy el IVA, en cuatro tramos: ${tramosCompras}.`,
    `Los sueldos pagan ${tramosSueldos} según el tamaño de la empresa; las compras entre empresas, un ${pct(TIPO_GENERAL)}, sin deducir nada.`,
    'Lo recaudado se reparte al instante en ocho partes iguales, una por escala, de la persona al planeta.',
  ],
  limites: [
    `Recaudaría en torno al ${recaudaPIB} de lo que produce el país en un año, frente al 38 % de hoy: habría menos servicios públicos, y la sanidad y la educación tendrían que costar mucho menos para dar lo mismo.`,
    'Por el mismo trabajo, quien está en una empresa grande aporta cuatro veces más que quien está en una pequeña.',
    'Al no deducirse nada entre empresas, el impuesto se acumula en cada eslabón y encarece algo los precios.',
  ],
  posturas: [
    {
      id: 'izquierda',
      quien: 'Frente Amplio (Sumar, Izquierda Unida, Más Madrid y Catalunya en Comú), con Ada Colau',
      cuando: 'Propuestas de campaña para el 29-N, noviembre de 2026, y documento fiscal de Izquierda Unida de noviembre de 2025',
      idea: 'Que paguen más las grandes fortunas, la banca y las grandes empresas.',
      propone: [
        'Un impuesto del 2 % sobre los patrimonios de más de un millón de euros, y del 3 % por encima de 50 millones.',
        'Un impuesto del 10 % a quien tenga más de cuatro viviendas, salvo que baje los alquileres a precios asequibles.',
        'Quitar deducciones a la banca y a las grandes empresas para que paguen más sobre sus beneficios reales.',
        'Recaudar así más de 10.000 millones al año para servicios públicos, pensiones y trenes.',
      ],
      argumento: 'Dicen que las grandes empresas y la banca pagan de verdad entre el 7 y el 9 % de sus beneficios, frente al 19 o 20 % de las pequeñas, y que quien más tiene debe aportar más.',
      critica: 'Sus críticos dicen que los grandes patrimonios pueden irse a otro país, que se recaudaría menos de lo previsto y que las cifras son cálculos de la propia coalición.',
      fuentes: [
        { url: 'https://www.democrata.es/economia/colau-plantea-gravar-a-los-ultrarricos-y-subir-impuestos-a-banca-y-grandes-empresas/', titulo: 'Demócrata · Colau plantea gravar a los ultrarricos y subir impuestos a banca y grandes empresas (5-11-2026)' },
        { url: 'https://izquierdaunida.org/wp-content/uploads/2025/11/2025-11-06-documento-reforma-fiscal-resumen-ejecutivo.pdf', titulo: 'Izquierda Unida · Propuesta de reforma fiscal, resumen (noviembre de 2025)' },
      ],
    },
    {
      id: 'centro-izquierda',
      quien: 'PSOE y el Gobierno',
      cuando: 'Ley fiscal aprobada en diciembre de 2024 y declaraciones de campaña de noviembre de 2026',
      idea: 'Mantener unos impuestos progresivos, en los que paga más quien más gana, para sostener el Estado del bienestar.',
      propone: [
        'Un impuesto mínimo del 15 % sobre el beneficio de las grandes multinacionales.',
        'Un impuesto a la banca sobre sus intereses y comisiones, del 1 al 7 %.',
        'Subir el impuesto sobre la renta (IRPF) de los ahorros de más de 300.000 euros al año.',
        'Bajar el impuesto de sociedades a las empresas que facturan menos de un millón de euros.',
      ],
      argumento: 'Dicen que España recauda menos que Italia, Alemania o Francia, y que la bajada del impuesto sobre la renta que proponen otros quitaría unos 85.000 millones, lo que gastan en educación todas las administraciones.',
      critica: 'Se le reprocha no ajustar el impuesto sobre la renta (IRPF) a la inflación, con lo que se paga más sin que cambie la ley, y crear impuestos nuevos en lugar de gastar mejor.',
      fuentes: [
        { url: 'https://www.infobae.com/espana/agencias/2024/12/19/principales-medidas-del-paquete-fiscal-del-gobierno-aprobado-este-jueves/', titulo: 'Infobae (Europa Press) · Principales medidas del paquete fiscal aprobado (19-12-2024)' },
        { url: 'https://www.democrata.es/economia/arcadi-espana-afirma-que-el-psoe-mantendra-una-fiscalidad-progresiva-y-progresista/', titulo: 'Demócrata · Arcadi España afirma que el PSOE mantendrá una fiscalidad progresiva (2-11-2026)' },
      ],
    },
    {
      id: 'centro-derecha',
      quien: 'Partido Popular (PP)',
      cuando: 'Programa para el 29-N, noviembre de 2026',
      idea: 'Bajar el impuesto sobre la renta a las clases medias, a los jóvenes y a las familias.',
      propone: [
        'Ajustar los tramos del impuesto sobre la renta (IRPF) a la inflación, y que no lo pague quien cobra el salario mínimo.',
        'Rebajarlo a los jóvenes de 18 a 35 años en sus cuatro primeras declaraciones: 100 %, 75 %, 50 % y 25 %.',
        'IVA (el impuesto que va en el precio) del 0 % en los alimentos básicos mientras dure la crisis de precios.',
        'Quitar el impuesto del 7 % sobre la producción de electricidad y eximir del IVA a los autónomos que facturan menos de 85.000 euros.',
      ],
      argumento: 'Dicen que la inflación ha subido los impuestos sin que nadie lo votara y que hay que devolver ese dinero a quien trabaja y a las familias.',
      critica: 'Sus críticos dicen que no calcula cuánto cuestan las rebajas ni cómo se pagan, a la vez que promete reducir el déficit y la deuda.',
      fuentes: [
        { url: 'https://www.democrata.es/en/general-elections-spain/pp-election-manifesto-for-29n-read-here-feijoo-249-proposals/amp/', titulo: 'Demócrata · El programa del PP para el 29N (10-11-2026)' },
        { url: 'https://www.democrata.es/uploads/s1/35/09/79/8/la-reconstruccion-nacional.pdf', titulo: 'PP · La reconstrucción nacional, programa electoral 29N (10-11-2026)' },
      ],
    },
    {
      id: 'derecha',
      quien: 'Vox',
      cuando: 'Programa para el 29-N, «Es sentido común», 12 de noviembre de 2026, y propuestas de campaña de octubre de 2026',
      idea: 'Una gran rebaja de impuestos, pagada recortando gasto político y subvenciones.',
      propone: [
        'Bajar y simplificar el impuesto sobre la renta (IRPF), menos cuantos más hijos; en octubre habló de dos tipos, 15 % y 25 %.',
        'Bajar el IVA (el impuesto que va en el precio), el general y el reducido, empezando por los productos básicos, y el impuesto de sociedades.',
        'Cuota cero de autónomos para quien gane menos del salario mínimo, y desde 50 euros para quien gane más.',
        'Que la primera vivienda de una familia española no pague impuestos: IVA del 0 % si es nueva y sin impuesto de transmisiones si es usada.',
        'Un impuesto a las remesas, el dinero que se envía al extranjero.',
      ],
      argumento: 'Dicen que el trabajo y las familias pagan demasiado y que la rebaja se puede pagar quitando gasto superfluo, organismos y subvenciones.',
      critica: 'Sus críticos dicen que el programa no dice cuánto costarían las rebajas ni cómo se pagan, y que las rentas altas ahorrarían mucho más que las bajas.',
      fuentes: [
        { url: 'https://men.gsstatic.es/sfAttachPlugin/4847171.pdf', titulo: 'Vox · «Es sentido común», programa electoral 29-N (12-11-2026), copia en PDF publicada por Menorca · Es Diari, medidas 2, 21 y 34' },
        { url: 'https://www.infobae.com/espana/2026/11/13/consulta-en-pdf-el-programa-electoral-de-vox-deportacion-de-migrantes-prioridad-nacional-y-derogacion-de-leyes-de-genero/', titulo: 'Infobae · El programa electoral de Vox para el 29-N, en PDF (13-11-2026)' },
        { url: 'https://www.democrata.es/elecciones-generales-espana/vox-lleva-29n-su-receta-economica-con-rebajas-fiscales-recorte-gasto-reforma-pensiones/', titulo: 'Demócrata · Vox lleva al 29N su receta económica (7-10-2026)' },
      ],
    },
  ],
  revisado: '2026-11-15',
};
