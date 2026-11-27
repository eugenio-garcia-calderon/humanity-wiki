/**
 * The «Aeromóvil avión» homologation (2026-11-27): which legal box an aircraft that also rolls fits in, in Spain and in Europe.
 * THE TEXT AS DATA; `PaginaHomologacionAvion.tsx` draws it.
 *
 * NOTHING here was read from the legal texts: the sources were found with the search engine and seen by their title only
 * (Eugenio asked not to be asked for web permissions). Every figure is marked `porConfirmar` and the page says so. Before relying
 * on one, read the consolidated BOE text and AESA's page, and move it to `leido`.
 */

export interface FuenteAvion { titulo: string; url: string }
export const FUENTES_AVION: Record<string, FuenteAvion> = {
  rd765: { titulo: 'Real Decreto 765/2022, uso de aeronaves motorizadas ultraligeras (ULM) — BOE, texto consolidado', url: 'https://www.boe.es/eli/es/rd/2022/09/20/765/con' },
  rd141: { titulo: 'Real Decreto 141/2025, requisitos esenciales de aeronavegabilidad de los ULM — BOE', url: 'https://www.boe.es/eli/es/rd/2025/02/25/141/con' },
  aesaUlm: { titulo: 'AESA: declaraciones de cumplimiento del diseño ULM', url: 'https://www.seguridadaerea.gob.es/es/ambitos/aeronaves/aeronavegabilidad-inicial/aeronaves-no-easa/declaraciones-de-cumplimiento-del-diseno-ulm' },
  aesaCda: { titulo: 'AESA: guía para la emisión de certificados de aeronavegabilidad de aeronaves no EASA (AI-CANO-P02-GU02)', url: 'https://www.seguridadaerea.gob.es/sites/default/files/AI-CANO-P02-GU02_Ed_02_Guia_para_la_emision_de_CDA_no_EASA.pdf' },
  aesaAficionados: { titulo: 'AESA: construcción de aeronaves por aficionados', url: 'https://www.seguridadaerea.gob.es/es/ambitos/aeronaves/aeronavegabilidad-inicial/aeronaves-no-easa/construccion-de-aeronaves-por-aficionados' },
  aesaLicencia: { titulo: 'AESA: licencia de piloto de ULM', url: 'https://www.seguridadaerea.gob.es/es/ambitos/licencias-y-medicina-aeronautica/licencias-al-personal-de-vuelo/licencia-de-piloto-de-ulm' },
  easaOptOut: { titulo: 'EASA: «opt-out», artículo 2(8) a 2(11) del Reglamento (UE) 2018/1139', url: 'https://www.easa.europa.eu/en/node/101982' },
  easaAnexoI: { titulo: 'Reglamento (UE) 2018/1139, anexo I: aeronaves fuera del reglamento europeo', url: 'https://legislation.gov.uk/eur/2018/1139/annex/I/division/1/data.pdf' },
  aircar: { titulo: 'AvWeb: el AirCar obtiene el certificado de aeronavegabilidad eslovaco', url: 'https://avweb.com/aviation-news/aircar-notches-slovakian-airworthiness-certification/' },
  palv: { titulo: 'PAL-V: «FlyDrive company PAL-V clears essential certification milestone»', url: 'https://www.pal-v.com/en/press/flydrive-company-pal-v-clears-essential-certification-milestone' },
  palvEasa: { titulo: 'AIAA (8-9-2026): PAL-V alcanza un hito clave de certificación con EASA', url: 'https://aiaa.org/2026/09/08/pal-v-reaches-key-easa-certification-milestone-for-flying-car/' },
};

/** The ULM limits the design is weighed against. Figures to confirm in the BOE: the page says so beside each. */
export const LIMITES_ULM = {
  /** maximum take-off mass of a two-seat landplane with the national opt-out, kg */
  masaMaxima: 600,
  /** what the design must still carry on top of its empty mass besides the occupants: luggage, kg */
  equipaje: 20,
};

export interface FilaAvion { concepto: string; norma: string; ref: string; fuente: string }
/** What the ULM box asks, as far as the titles and general knowledge say: EVERY row to confirm. */
export const TABLA_ULM: FilaAvion[] = [
  { concepto: 'Quién lo regula', norma: 'Los ULM quedan fuera del reglamento europeo de aviación y los regula cada país; España, con el Real Decreto 765/2022 (uso) y el 141/2025 (aeronavegabilidad).', ref: 'Reglamento 2018/1139, anexo I y art. 2(8); RD 765/2022; RD 141/2025', fuente: 'easaOptOut' },
  { concepto: 'Masa máxima al despegue', norma: 'Hasta 600 kg para un biplaza terrestre con la exclusión que permite el reglamento europeo (sin ella, 450 kg).', ref: 'Reglamento 2018/1139, art. 2(8); RD 765/2022', fuente: 'rd765' },
  { concepto: 'Plazas', norma: 'Dos como mucho, con el piloto.', ref: 'RD 765/2022', fuente: 'rd765' },
  { concepto: 'Velocidad de pérdida', norma: 'Hay un máximo de velocidad de pérdida con los flaps fuera: el número exacto, en el Real Decreto.', ref: 'RD 765/2022', fuente: 'rd765' },
  { concepto: 'Diseño', norma: 'El fabricante declara a AESA que el diseño cumple los requisitos esenciales de aeronavegabilidad, con su expediente técnico.', ref: 'RD 141/2025; AESA', fuente: 'aesaUlm' },
  { concepto: 'Cada unidad', norma: 'Certificado de aeronavegabilidad (restringido) emitido por AESA y matrícula de aeronave.', ref: 'Guía AESA AI-CANO-P02-GU02', fuente: 'aesaCda' },
  { concepto: 'Piloto', norma: 'Licencia de piloto de ULM.', ref: 'AESA', fuente: 'aesaLicencia' },
  { concepto: 'Por carretera', norma: 'Nada de esto lo deja circular: rodar por la vía pública es otra homologación, la de vehículo (como el Aeromóvil coche).', ref: 'Reglamento 168/2013 o 2018/858', fuente: 'aircar' },
];

export interface ViaAvion { id: string; nombre: string; quien: string; vale: string; vender: string; cuando: string; ojo: string; fuentes: string[] }
export const VIAS_AVION: ViaAvion[] = [
  { id: 'ulm', nombre: 'Ultraligero (ULM) español', quien: 'AESA, con la declaración del fabricante', vale: 'España', vender: 'Sí',
    cuando: 'El primer Aeromóvil avión que se pueda vender: el cajón más barato con licencia de piloto corta.', ojo: 'Masa máxima ajustada para un vehículo que también rueda; volar a otro país necesita su permiso.', fuentes: ['rd765', 'rd141', 'aesaUlm'] },
  { id: 'aficionado', nombre: 'Construcción por aficionados', quien: 'AESA, certificado especial', vale: 'España', vender: 'No',
    cuando: 'El primer prototipo que vuela, construido en su mayor parte por quien lo va a volar.', ojo: 'No se puede vender ni usar para negocio.', fuentes: ['aesaAficionados'] },
  { id: 'easa', nombre: 'Certificado de tipo europeo (EASA)', quien: 'EASA, con organización de diseño y producción aprobadas', vale: 'Toda la UE', vender: 'Sí',
    cuando: 'La serie en Europa. Es lo que hace PAL-V con su autogiro que rueda.', ojo: 'Años y millones; ingeniería de certificación dedicada.', fuentes: ['palv', 'palvEasa'] },
  { id: 'doble', nombre: 'Coche volador: aeronave + vehículo', quien: 'La autoridad de aviación y la de vehículos, cada una lo suyo', vale: 'Según cada una', vender: 'Sí, con las dos',
    cuando: 'Si el Aeromóvil Alado tiene que rodar por carretera además de volar.', ojo: 'Lo que pide una (peso mínimo) va contra lo que pide la otra (estructura de choque). El AirCar tiene el certificado de aeronave eslovaco desde 2022.', fuentes: ['aircar'] },
];

export const PASOS_AVION: { titulo: string; texto: string }[] = [
  { titulo: 'Leer las normas', texto: 'RD 765/2022, RD 141/2025 y las páginas de AESA: pasar cada fila de la tabla de «por confirmar» a «leído», con sus números.' },
  { titulo: 'Elegir el cajón', texto: 'Construcción por aficionados para el prototipo que vuela; ULM para el que se vende en España; EASA si la serie es europea.' },
  { titulo: 'Que quepa en la masa', texto: 'El Aeromóvil Alado con dos personas, batería y equipaje por debajo de la masa máxima: es el número que decide todo lo demás.' },
  { titulo: 'Decidir si rueda por carretera', texto: 'Si sí, la homologación de vehículo va en paralelo (la del Aeromóvil coche) y sus requisitos entran en el diseño desde el principio.' },
  { titulo: 'Expediente técnico y ensayos', texto: 'Cálculo de estructura, peso y centrado, ensayos en tierra y en vuelo, manual de vuelo y de mantenimiento: lo que pida el cajón elegido.' },
];

export const NO_COMPROBADO = [
  'Ningún texto legal de esta página se ha abierto: se encontraron con el buscador y se citan por su título.',
  'El límite de 600 kg, la velocidad de pérdida y lo que se declara a AESA, por confirmar en el BOE.',
  'Si AESA acepta como ULM una aeronave que también es vehículo de carretera: sin consultar.',
  'El editor no calcula todavía alas, sustentación ni velocidad de pérdida: solo la masa.',
];
