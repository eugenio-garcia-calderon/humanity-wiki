// «Otras propuestas» for the «presupuestos» window: what each camp proposes on
// public spending. Camps checked on 2026-11-12, during the campaign for the
// general election of 29 November 2026. Every card says when its proposals
// were published (`cuando`). The model's figures are read from the data.
import type { Espectro } from './tipos';
import { ESCALAS, TERCIOS, RESERVA_MIN_LIBRE } from '../modeloSocioeconomico';

const tercios = TERCIOS.map((t, i) => `${i === TERCIOS.length - 1 ? 'y ' : ''}${t.id === 'libre' ? 'uno libre' : 'uno para ' + t.corto.toLowerCase()}`).join(', ').replace(', y ', ' y ');

export const ESPECTRO: Espectro | null = {
  tema: 'el gasto público',
  modelo: [
    `Cada una de las ${ESCALAS.length} escalas, de la persona al planeta, recibe la misma parte por habitante.`,
    `Cada escala reparte lo suyo en tercios: ${tercios}.`,
    'Su asamblea elige las prioridades y su comité técnico las cumple al menor coste.',
    `Al menos un ${Math.round(RESERVA_MIN_LIBRE * 100)} % del tercio libre va a una caja de ahorro común que nunca baja de cero.`,
  ],
  limites: [
    'Con el reparto inicial, la sanidad y la educación recibirían bastante menos que hoy: para dar lo mismo tendrían que costar varias veces menos.',
    'La pensión igual al salario mínimo no cabe en lo que las escalas dedican a apoyo mutuo, y falta decidir de dónde sale.',
  ],
  posturas: [
    {
      id: 'izquierda',
      quien: 'Frente Amplio (Sumar, Izquierda Unida, Más Madrid y Catalunya en Comú)',
      cuando: 'Propuestas de campaña de noviembre de 2026, documento fiscal de Izquierda Unida de 2025 y postura de Sumar en abril de 2025',
      idea: 'Gastar más en servicios públicos, pagado con impuestos a quien más tiene, y no más en defensa.',
      propone: [
        'Subir el límite de gasto público en unos 3,8 puntos del PIB, lo que produce el país en un año (Izquierda Unida, 2025).',
        'Dedicar lo recaudado a las grandes fortunas a trenes, sanidad, educación y vivienda.',
        'Una aplicación para que cada persona reparta ese dinero entre esas cuatro áreas.',
        'Oponerse al aumento del gasto en defensa anunciado por el Gobierno (Sumar, 2025).',
      ],
      argumento: 'Dicen que España recauda y gasta menos que los países europeos de su entorno, y que cerrar esa diferencia amplía derechos sin poner en riesgo las cuentas.',
      critica: 'Sus críticos dicen que es gasto fijo que depende de ingresos inciertos y que, si no llegan, sube el déficit.',
      fuentes: [
        { url: 'https://izquierdaunida.org/wp-content/uploads/2025/11/2025-11-06-documento-reforma-fiscal-resumen-ejecutivo.pdf', titulo: 'Izquierda Unida · Propuesta de reforma fiscal, resumen (noviembre de 2025)' },
        { url: 'https://www.democrata.es/elecciones-generales-espana/frente-amplio-lanza-tax-the-rich-aplicacion-decidir-donde-invertir-impuestos-ultrarricos/', titulo: 'Demócrata · El Frente Amplio lanza «Tax the Rich» (6-11-2026)' },
        { url: 'https://www.eldiario.es/politica/sumar-muestra-desacuerdo-nuevo-gasto-defensa-anunciado-sanchez-objeciones-gobierno_1_12237585.html', titulo: 'elDiario.es · Sumar muestra su desacuerdo con el nuevo gasto en defensa (22-4-2025)' },
      ],
    },
    {
      id: 'centro-izquierda',
      quien: 'PSOE y el Gobierno',
      cuando: 'Límite de gasto de noviembre de 2025, plan de defensa de abril de 2025 y declaraciones de noviembre de 2026',
      idea: 'Seguir subiendo el gasto social mientras baja el déficit, con más apoyo de Europa.',
      propone: [
        'Subir el límite de gasto del Estado un 8,5 % en 2026, por encima de 200.000 millones (2025).',
        'Llegar al 2 % del PIB (lo que produce el país en un año) en defensa, con 10.471 millones más (2025), pero no al 5 % que pide la OTAN, la alianza militar occidental.',
        'Ampliar el presupuesto de la Unión Europea (2026).',
      ],
      argumento: 'Dicen que el déficit es el mejor en 18 años y que decir no al 5 % en defensa protege el dinero de la educación.',
      critica: 'Se le reprocha que el gasto crece más que la economía y que solo ha presentado tres Presupuestos en ocho años.',
      fuentes: [
        { url: 'https://forbes.es/economia/835512/pp-vox-y-junts-confirman-que-tumbaran-en-el-congreso-la-senda-de-deficit-del-gobierno/', titulo: 'Forbes · PP, Vox y Junts tumbarán la senda de déficit del Gobierno (27-11-2025)' },
        { url: 'https://es.ara.cat/politica/sanchez-aprueba-plan-inversiones-cumplir-2-defensa-ano_1_5354478.html', titulo: 'Ara · Sánchez anuncia otros 10.471 millones para cumplir con el 2 % en defensa (abril de 2025)' },
        { url: 'https://www.democrata.es/economia/arcadi-espana-afirma-que-el-psoe-mantendra-una-fiscalidad-progresiva-y-progresista/', titulo: 'Demócrata · Arcadi España: el PSOE mantendrá una fiscalidad progresiva (2-11-2026)' },
      ],
    },
    {
      id: 'centro-derecha',
      quien: 'Partido Popular (PP)',
      cuando: 'Programa para el 29-N, noviembre de 2026',
      idea: 'Revisar todo el gasto y quitar dinero a lo que no funciona antes de gastar más.',
      propone: [
        'Auditar todo el gasto, los organismos y las empresas públicas en 100 días, como base del primer Presupuesto.',
        'Menos ministerios, altos cargos y asesores; los organismos nuevos tendrán fecha de caducidad.',
        'Ningún gasto nuevo sin un plan para pagarlo, y evaluar cada año los programas, quitando fondos a los que no funcionan.',
        'Elecciones si los Presupuestos se prorrogan dos años seguidos.',
      ],
      argumento: 'Dicen que el gasto está «descontrolado» y crece más que la economía, y que antes de gastar más hay que saber en qué se gasta y si sirve.',
      critica: 'Sus críticos dicen que la auditoría no concreta qué gasto se recortaría, mientras promete más de 300.000 millones en infraestructuras en 15 años.',
      fuentes: [
        { url: 'https://www.democrata.es/uploads/s1/35/09/79/8/la-reconstruccion-nacional.pdf', titulo: 'PP · La reconstrucción nacional, programa electoral 29N (10-11-2026), medidas 1 a 5, 65 y 117' },
        { url: 'https://www.democrata.es/en/general-elections-spain/pp-election-manifesto-for-29n-read-here-feijoo-249-proposals/amp/', titulo: 'Demócrata · El programa del PP para el 29N (10-11-2026)' },
      ],
    },
    {
      id: 'derecha',
      quien: 'Vox',
      cuando: 'Plan fiscal en el Congreso de 2024, plan de desregulación de junio de 2026 y propuestas de campaña de octubre de 2026',
      idea: 'Recortar el gasto político y el tamaño del Estado y de las autonomías.',
      propone: [
        'Pasar de 22 a 12 ministerios (2024).',
        'Auditar el gasto y quitar las subvenciones a partidos, sindicatos y organizaciones empresariales (2024).',
        'Recortar organismos, subvenciones y el gasto que no sea de servicios esenciales para pagar su bajada de impuestos (2026).',
        'Reducir el tamaño de las autonomías y derogar tres normas por cada ley nueva (2026).',
      ],
      argumento: 'Dicen que el gasto político y la burocracia sobran, y que recortarlos permite bajar impuestos sin tocar los servicios esenciales.',
      critica: 'Sus críticos dicen que no concreta qué subvenciones recortaría ni cuánto ahorraría, y que eso no alcanza para pagar una bajada de impuestos de decenas de miles de millones.',
      fuentes: [
        { url: 'https://forbes.es/economia/452984/vox-presenta-en-el-congreso-su-plan-fiscal-reduccion-del-iva-dos-tipos-de-irpf-y-deducciones-por-hijo/', titulo: 'Forbes · Vox presenta en el Congreso su plan fiscal (26-4-2024)' },
        { url: 'https://www.democrata.es/elecciones-generales-espana/vox-lleva-29n-su-receta-economica-con-rebajas-fiscales-recorte-gasto-reforma-pensiones/', titulo: 'Demócrata · Vox lleva al 29N su receta económica (7-10-2026)' },
        { url: 'https://theobjective.com/espana/politica/2026-06-27/desregulacion-motosierra-vox-podar-marana-burocratica/', titulo: 'The Objective · El plan de desregulación de Vox (27-6-2026)' },
      ],
    },
  ],
  revisado: '2026-11-12',
};
