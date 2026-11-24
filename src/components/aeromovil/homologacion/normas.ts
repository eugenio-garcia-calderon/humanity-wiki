// The homologation pre-check (2026-11-17, Eugenio: «Falta un apartado en el menú que sea de homologación… para el
// triciclo, que sea la de homologación europea de triciclo pesado. Y pongas ahí las características de homologación y
// las restricciones que hay según normativa con todo lujo de detalles. Y ver si cumple o no cumple… y qué margen hay
// todavía para ponerle más potencia, más peso, etcétera»).
//
// THE RULES AS DATA. This file is the catalogue: the categories (`CATEGORIAS`), the sources (`FUENTES`) and every
// requirement (`REQUISITOS`). `evaluar.ts` runs them on a `FichaHomologacion` (ficha.ts: the design's own numbers) and
// `PanelHomologacion.tsx` draws the result. How to add a category or a requirement: ../CLAUDE.md, «homologacion/».
//
// Texts read on 2026-11-17. EUR-Lex itself did not answer from here except the consolidated 44/2014; the other EU
// texts were read on legislation.gov.uk, which keeps the EU text as it stood on 31-1-2020 (the UK copy of EU law).
// Where a later amendment may have changed a figure, the requirement says so («por confirmar en EUR-Lex»).
// The UI text is Spanish (it is for Eugenio); the comments are English.

export type IdFuente = 'r168' | 'r168art' | 'r168anx6' | 'r168anx8' | 'r3' | 'r44' | 'r134' | 'r2018' | 'r2019' | 'rd750' | 'permisos' | 'permisoB' | 'b1' | 'r901' | 'r85' | 'r134anx' | 'r168anx3' | 'r168art42' | 'dgtL1eA' | 'rd750anx' | 'rd339' | 'pjc780' | 'en15194' | 'en17860' | 'maq2006' | 'maq2023' | 'r168excl' | 'bat2023' | 'gpsr2023' | 'rgv';

/** The texts behind every figure. `leido`: read on 2026-11-17 (false: cited from memory of the text, to confirm). */
export const FUENTES: Record<IdFuente, { titulo: string; url: string; leido: boolean }> = {
  r168: { titulo: 'Reglamento (UE) 168/2013, anexo I (criterios de clasificación de la categoría L)', url: 'https://legislation.gov.uk/eur/2013/168/annex/I/2016-01-01', leido: true },
  r168art: { titulo: 'Reglamento (UE) 168/2013, artículos 3 (definiciones), 4 (categorías) y 5 (masa en orden de marcha)', url: 'https://legislation.gov.uk/eur/2013/168/article/5/adopted/data.html', leido: true },
  r168anx6: { titulo: 'Reglamento (UE) 168/2013, anexo VI (límites de emisiones y de ruido)', url: 'https://legislation.gov.uk/eur/2013/168/annex/VI/2016-01-01?view=plain', leido: true },
  r168anx8: { titulo: 'Reglamento (UE) 168/2013, anexo VIII (requisitos adicionales de seguridad funcional)', url: 'https://legislation.gov.uk/eur/2013/168/annexes/adopted?view=plain', leido: true },
  r3: { titulo: 'Reglamento Delegado (UE) 3/2014 (seguridad funcional del vehículo), anexos I a XIX', url: 'https://www.legislation.gov.uk/eur/2014/3/data.htm?view=plain', leido: true },
  r44: { titulo: 'Reglamento Delegado (UE) 44/2014 (construcción y requisitos generales), versión consolidada de EUR-Lex del 18-11-2025', url: 'https://eur-lex.europa.eu/eli/reg_del/2014/44/2025-11-18/eng/pdf', leido: true },
  r134: { titulo: 'Reglamento Delegado (UE) 134/2014 (medio ambiente y prestaciones de la propulsión), anexo X: medida de la velocidad máxima y de la potencia', url: 'https://www.legislation.gov.uk/eur/2014/134/pdfs/eur_20140134_2016-10-16_en.pdf', leido: false },
  r2018: { titulo: 'Reglamento (UE) 2018/858 (homologación de turismos M1 y demás vehículos de motor)', url: 'https://eur-lex.europa.eu/eli/reg/2018/858/oj', leido: false },
  r2019: { titulo: 'Reglamento (UE) 2019/2144 (seguridad general de los vehículos de motor: ensayos de choque, ESC, ISA…)', url: 'https://eur-lex.europa.eu/eli/reg/2019/2144/oj', leido: false },
  rd750: { titulo: 'Real Decreto 750/2010 (homologación individual y de series cortas en España)', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2010-9673', leido: false },
  permisos: { titulo: 'Permisos de conducir para triciclos de motor (A1 hasta 15 kW; A o B con 21 años por encima)', url: 'https://practicatest.com/preguntas/qA1A2/cual-de-estos-permisos-autoriza-a-conducir-triciclos-de-motor-de-potencia-maxima-superior-a-15-kw/ZJyToA==', leido: true },
  permisoB: { titulo: 'MAPFRE: qué vehículos se conducen con el permiso B (triciclos de más de 15 kW, desde los 21 años)', url: 'https://www.motor.mapfre.es/consejos-practicos/consejos-de-conduccion/permiso-b-que-vehiculos-puedes-conducir/', leido: true },
  // 2026-11-17 (electronica, from Eugenio's study «Estudio de homologación L7e-A2: híbrido en paralelo»): cited, not reread here
  r901: { titulo: 'Reglamento de Ejecución (UE) 901/2014 (documentos administrativos de homologación): ficha de características, campos 1.8.3, 1.8.5, 1.8.7 y 1.8.9', url: 'https://eur-lex.europa.eu/eli/reg_impl/2014/901/oj', leido: false },
  r85: { titulo: 'Reglamento UN n.º 85 (medida de la potencia neta y de la potencia máxima de 30 minutos de los grupos de tracción eléctricos)', url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:42014X0919(01)', leido: false },
  r134anx: { titulo: 'Reglamento Delegado (UE) 134/2014, anexo X, apéndice 2.4 (par y potencia máximos de la propulsión híbrida: cada modo, el resultado más alto)', url: 'https://www.legislation.gov.uk/eur/2014/134/annex/X', leido: false },
  // 2026-11-24 (L1e-A, «Homologación» page): read that day on legislation.gov.uk (the EU text as it stood on 31-1-2020) and on the BOE
  r168anx3: { titulo: 'Reglamento (UE) 168/2013, anexo III (límites de las series cortas por tipo y año) y anexo I (criterios de L1e-A y medidas máximas)', url: 'https://legislation.gov.uk/eur/2013/168/annexes/adopted?view=plain', leido: true },
  r168art42: { titulo: 'Reglamento (UE) 168/2013, artículo 42 (homologación nacional de series cortas)', url: 'https://legislation.gov.uk/eur/2013/168/chapter/X/2020-01-31/data.html', leido: true },
  dgtL1eA: { titulo: 'DGT, Instrucción 19/V-134 de 24-5-2019: matriculación de vehículos L1e-A', url: 'https://www.dgt.es/export/sites/web-DGT/.galleries/downloads/muevete-con-seguridad/normas-de-trafico/VEH-vehiculos/19.V-134-Matriculacion-de-vehiculos-L1e-A.pdf', leido: true },
  rd750anx: { titulo: 'Real Decreto 750/2010, consolidado: arts. 4.4 y 7.3 (homologación individual), anexo II apéndices 1, 3, 4 y 5', url: 'https://boe.es/buscar/pdf/2010/BOE-A-2010-9994-consolidado.pdf', leido: true },
  // 2026-11-24 (ciclo de pedales con pedaleo asistido): the BOE page of the consolidated RD 339/2014 and the order PJC/780/2025 were read that day;
  // the EN standards are paid texts: only their public catalogue summaries were read
  rd339: { titulo: 'Real Decreto 339/2014 (comercialización y puesta en servicio de bicicletas y otros ciclos), consolidado: arts. 2 a 4, anexos I a VI y disposición transitoria segunda', url: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2014-5399', leido: true },
  pjc780: { titulo: 'Orden PJC/780/2025, de 21 de julio (BOE 23-7-2025): modifica el Reglamento General de Vehículos y define el «ciclo de pedales con pedaleo asistido»', url: 'https://www.boe.es/boe/dias/2025/07/23/pdfs/BOE-A-2025-15231.pdf', leido: true },
  en15194: { titulo: 'UNE-EN 15194:2017+A1:2023 (ciclos con pedaleo asistido, EPAC): ficha pública del catálogo; el texto completo es de pago', url: 'https://genorma.com/en/standards/en-15194-2017-a1-2023/amp', leido: false },
  en17860: { titulo: 'Serie EN 17860 «Carrier cycles»: parte 3 (ciclos de carga ligeros de varias huellas, mecánica) y parte 5 (eléctrica), según el catálogo de EVS', url: 'https://www.evs.ee/en/evs-en-17860-3-2024', leido: false },
  maq2006: { titulo: 'Directiva 2006/42/CE de máquinas (la EN 15194 la cita en su anexo ZA)', url: 'https://eur-lex.europa.eu/eli/dir/2006/42/oj', leido: false },
  maq2023: { titulo: 'Reglamento (UE) 2023/1230 de máquinas (sustituye a la Directiva 2006/42/CE desde el 20-1-2027)', url: 'https://eur-lex.europa.eu/eli/reg/2023/1230/oj', leido: false },
  bat2023: { titulo: 'Reglamento (UE) 2023/1542 (baterías; las selladas de hasta 25 kg para vehículos eléctricos o de propulsión humano-eléctrica son «LMT»)', url: 'https://eur-lex.europa.eu/eli/reg/2023/1542/oj', leido: false },
  gpsr2023: { titulo: 'Reglamento (UE) 2023/988 (seguridad general de los productos)', url: 'https://eur-lex.europa.eu/eli/reg/2023/988/oj', leido: false },
  rgv: { titulo: 'Real Decreto 2822/1998, Reglamento General de Vehículos (texto consolidado; su artículo 22 trata la advertencia acústica)', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1999-1826', leido: false },
  r168excl: { titulo: 'Reglamento (UE) 168/2013, artículo 2, apartado 2, letra h (excluye los ciclos de pedaleo asistido de 250 W y 25 km/h)', url: 'https://www.legislation.gov.uk/eur/2013/168/article/2/adopted', leido: true },
  b1: { titulo: 'RACE: el permiso B1 para cuadriciclos pesados (en consulta desde julio de 2024, no en vigor)', url: 'https://www.race.es/?p=254932', leido: true },
};

/**
 * The categories, in the order Article 4(4) of 168/2013 climbs them: a vehicle that exceeds one criterion of a
 * category goes to the next one whose criteria it meets (L2e → L5e, L6e → L7e), and above the L family, to M1.
 * `ruedas` is the legal count: two wheels on one axle closer than 460 mm count as one (art. 3, punto 72).
 */
// (Within L7e the order is a choice, not the law's: the closed «cuadrimóvil» first, the Twizy's category, then the quads.)
export type IdCategoria = 'EPAC' | 'L1e-A' | 'L3e' | 'L2e' | 'L5e-A' | 'L6e-A' | 'L6e-BP' | 'L7e-CP' | 'L7e-A2' | 'L7e-A1' | 'M1';

export interface Categoria {
  id: IdCategoria;
  /** Its legal name in Spanish. */
  nombre: string;
  /** Legal wheel count (null: any). */
  ruedas: number | null;
  /** One sentence: what it is. */
  resumen: string;
  /** Vehicles on sale that have it. */
  ejemplos: string;
  /** Licence in Spain. */
  permiso: string;
  /** What it costs to homologate, in words. */
  esfuerzo: string;
  fuente: IdFuente;
}

export const CATEGORIAS: Categoria[] = [
  {
    id: 'EPAC', nombre: 'Ciclo de pedales con pedaleo asistido, EN 15194 (fuera del Reglamento 168/2013)', ruedas: null, fuente: 'rd339',
    resumen: 'Ciclo de pedales con un motor eléctrico auxiliar de hasta 250 W continuos, cuya ayuda baja poco a poco y se corta antes de los 25 km/h o cuando se deja de pedalear. Está fuera del Reglamento 168/2013 (artículo 2.2.h): no se homologa como vehículo de motor, no se matricula y no pasa ITV. En España lo regula el Real Decreto 339/2014: el fabricante documenta, ensaya y declara él mismo la conformidad. Con más de dos ruedas se aplica su anexo VI.',
    ejemplos: 'Velomóviles con ayuda eléctrica, bicicletas de carga eléctricas de tres y cuatro ruedas, cuadriciclos de pedales.',
    permiso: 'Ninguno.', esfuerzo: 'Bajo en trámites (sin homologación de vehículo, sin matrícula, sin ITV), pero con ensayos de seguridad, expediente técnico y declaración de conformidad a cargo del fabricante.',
  },
  {
    id: 'L1e-A', nombre: 'L1e-A — ciclo de motor («bicicleta» de tres o cuatro ruedas con motor de ayuda)', ruedas: null, fuente: 'r168anx3',
    resumen: 'Un ciclo diseñado para pedalear, con un motor cuyo fin principal es ayudar a pedalear, que deja de empujar a 25 km/h o antes y de hasta 1.000 W continuos. Los de tres y cuatro ruedas que cumplen eso cuentan como equivalentes a los de dos (anexo I, criterios 9 a 12). Límites de tamaño de todo L1e: 1,00 m de ancho, 4,00 m de largo y 2,50 m de alto. A diferencia de la bicicleta asistida (EPAC, 250 W), SÍ es un vehículo de motor: se homologa y se matricula.',
    ejemplos: 'Bicicletas eléctricas con más de 250 W; velomóviles y cuadriciclos de pedales estrechos con motor de ayuda.',
    permiso: 'La instrucción de la DGT 19/V-134 enumera «permiso de conducir» entre sus obligaciones sin decir cuál (se suele citar el AM): por confirmar con la DGT.',
    esfuerzo: 'Medio: homologación individual (una unidad) o serie corta nacional (hasta 50 al año por tipo), o de tipo UE; ensayos de frenos, electricidad, compatibilidad electromagnética, luces y manipulación.',
  },
  {
    id: 'L3e', nombre: 'L3e — motocicleta de dos ruedas (y L4e, con sidecar)', ruedas: 2, fuente: 'r168',
    resumen: 'Un vehículo de tres o cuatro ruedas en el que cada pareja de ruedas del mismo eje está a 460 mm o menos (centro a centro de la huella) cuenta, para la ley, como de dos ruedas: es una moto (L3e). Subcategorías por potencia: L3e-A1 hasta 11 kW y 0,1 kW/kg (y 125 cm³), L3e-A2 hasta 35 kW y 0,2 kW/kg, L3e-A3 el resto. L4e es la moto con sidecar (asimétrica): ningún Aeromóvil lo es.',
    ejemplos: 'Piaggio MP3 de vía estrecha, Yamaha Tricity.',
    permiso: 'A1, A2 o A según la subcategoría (con el B, solo motos de 125 cm³ y 11 kW tras 3 años de permiso).',
    esfuerzo: 'Como una moto: ABS obligatorio (anexo VIII del 168/2013) y todo lo de L3e.',
  },
  {
    id: 'L2e', nombre: 'L2e-P — ciclomotor de tres ruedas', ruedas: 3, fuente: 'r168',
    resumen: 'Tres ruedas, hasta 45 km/h por construcción, hasta 4 kW de potencia continua, hasta 270 kg en orden de marcha (sin la batería) y como mucho dos plazas.',
    ejemplos: 'Scooters de tres ruedas de 50 cm³, triciclos eléctricos de reparto lentos.',
    permiso: 'AM (desde los 15 años).', esfuerzo: 'El más barato de los de tres ruedas; pero limitado a 45 km/h.',
  },
  {
    id: 'L5e-A', nombre: 'L5e-A — triciclo de motor', ruedas: 3, fuente: 'r168',
    resumen: 'El «triciclo pesado»: tres ruedas que no caben en L2e. Hasta 1000 kg en orden de marcha (sin la batería) y hasta 5 plazas con el conductor. Sin límite de potencia ni de velocidad en la clasificación. Largo hasta 4 m, ancho hasta 2 m, alto hasta 2,5 m.',
    ejemplos: 'Aptera (homologación prevista como triciclo), Morgan 3 Wheeler, Can-Am Spyder, Piaggio MP3 de vía ancha (LT).',
    permiso: 'A1 si no pasa de 15 kW (desde los 16 años); por encima de 15 kW, A o B con 21 años cumplidos.',
    esfuerzo: 'Medio: la lista de la categoría L sin ensayo de choque; la categoría que menos cierra a un tres ruedas rápido.',
  },
  {
    id: 'L6e-A', nombre: 'L6e-A — cuadriciclo ligero de carretera', ruedas: 4, fuente: 'r168',
    resumen: 'Cuatro ruedas, hasta 45 km/h, hasta 4 kW continuos, hasta 425 kg en orden de marcha (sin la batería) y dos plazas.',
    ejemplos: 'Quads ligeros de 45 km/h.', permiso: 'AM (desde los 15 años).', esfuerzo: 'Bajo, pero limitado a 45 km/h.',
  },
  {
    id: 'L6e-BP', nombre: 'L6e-BP — cuadrimóvil ligero de pasajeros («coche sin carné»)', ruedas: 4, fuente: 'r168',
    resumen: 'Como L6e-A pero con habitáculo cerrado (accesible por tres lados como mucho) y hasta 6 kW continuos. Hasta 45 km/h, 425 kg, dos plazas, largo hasta 3 m y ancho hasta 1,5 m.',
    ejemplos: 'Citroën Ami, Aixam, Renault Twizy 45.', permiso: 'AM (desde los 15 años).', esfuerzo: 'Bajo; pero 45 km/h.',
  },
  {
    id: 'L7e-CP', nombre: 'L7e-CP — cuadrimóvil pesado de pasajeros', ruedas: 4, fuente: 'r168',
    resumen: 'Cuatro ruedas, hasta 15 kW continuos, hasta 90 km/h por construcción, hasta 450 kg (sin la batería), habitáculo cerrado accesible por tres lados como mucho y hasta cuatro plazas que NO son a horcajadas. Largo hasta 3,7 m y ancho hasta 1,5 m. Cinturón de tres puntos en todas las plazas.',
    ejemplos: 'Renault Twizy 80, Microlino, Silence S04.', permiso: 'B (el B1 para cuadriciclos está en consulta, no en vigor).',
    esfuerzo: 'Medio: sin ensayo de choque obligatorio (Euro NCAP dio 1–2 estrellas a todos los que probó).',
  },
  {
    id: 'L7e-A2', nombre: 'L7e-A2 — quad pesado de carretera, con asientos', ruedas: 4, fuente: 'r168',
    resumen: 'Cuatro ruedas, solo pasajeros, hasta 15 kW, hasta 450 kg (sin la batería), como mucho dos plazas que NO son a horcajadas. Sin límite de velocidad en la clasificación. Cinturón de tres puntos en todas las plazas (anexo XII del 3/2014).',
    ejemplos: 'Pocos en el mercado.', permiso: 'B.', esfuerzo: 'Medio.',
  },
  {
    id: 'L7e-A1', nombre: 'L7e-A1 — quad pesado de carretera, a horcajadas', ruedas: 4, fuente: 'r168',
    resumen: 'Cuatro ruedas, solo pasajeros, hasta 15 kW, hasta 450 kg en orden de marcha (sin la batería), como mucho dos plazas A HORCAJADAS y dirección por MANILLAR. Sin límite de velocidad en la clasificación.',
    ejemplos: 'Quads de carretera matriculados.', permiso: 'B.', esfuerzo: 'Medio.',
  },
  {
    id: 'M1', nombre: 'M1 — turismo', ruedas: 4, fuente: 'r2018',
    resumen: 'El escalón de arriba: un coche. Al menos cuatro ruedas, hasta 8 plazas además del conductor; sin límite de masa, potencia ni velocidad. Un tres ruedas que no cabe en L5e no puede ser M1 (la categoría M pide cuatro ruedas).',
    ejemplos: 'Cualquier coche.', permiso: 'B.',
    esfuerzo: 'Alto: ensayos de choque frontal y lateral, ESC, ABS, airbags y la lista del Reglamento 2019/2144. En España, la homologación individual (RD 750/2010) admite requisitos alternativos para un solo vehículo.',
  },
];
export const categoria = (id: IdCategoria) => CATEGORIAS.find(c => c.id === id)!;

/** The four outcomes, as the panel shows them. `condicion`: it fails as it is, but a limiter fixes it without redesign. */
export type Estado = 'cumple' | 'no' | 'condicion' | 'comprobar';
export const ETIQUETA_ESTADO: Record<Estado, string> = { cumple: 'Cumple', no: 'No cumple', condicion: 'No cumple tal cual · se arregla limitando', comprobar: 'No se puede comprobar' };

/** The design's numbers a requirement can read (ficha.ts fills them; null = the model does not know it). */
export type Magnitud = 'ruedasLegales' | 'masaOrdenMarcha' | 'potenciaCategoria' | 'vmax' | 'plazas' | 'largo' | 'ancho' | 'alto' | 'kWporKg' | 'radioGiro' | 'repartoDelantero';

export const UNIDAD: Record<Magnitud, { u: string; d: number; nombre: string }> = {
  ruedasLegales: { u: 'ruedas', d: 0, nombre: 'ruedas (las gemelas cuentan como una)' }, masaOrdenMarcha: { u: 'kg', d: 0, nombre: 'masa en orden de marcha' },
  potenciaCategoria: { u: 'kW', d: 1, nombre: 'potencia continua' }, vmax: { u: 'km/h', d: 0, nombre: 'velocidad máxima' }, plazas: { u: 'plazas', d: 0, nombre: 'plazas' },
  largo: { u: 'm', d: 2, nombre: 'largo' }, ancho: { u: 'm', d: 2, nombre: 'ancho' }, alto: { u: 'm', d: 2, nombre: 'alto' }, kWporKg: { u: 'kW/kg', d: 3, nombre: 'potencia por kilo' },
  radioGiro: { u: 'm', d: 1, nombre: 'radio de giro' }, repartoDelantero: { u: '%', d: 0, nombre: 'peso en el eje delantero' },
};

export type Grupo = 'Clasificación' | 'Masas y medidas' | 'Propulsión y velocidad' | 'Frenos, ruedas y dirección' | 'Ocupantes y seguridad pasiva' | 'Visión, luces y mandos' | 'Electricidad, ruido y emisiones' | 'Construcción y papeles' | 'Permiso de conducir';
export const GRUPOS: Grupo[] = ['Clasificación', 'Masas y medidas', 'Propulsión y velocidad', 'Frenos, ruedas y dirección', 'Ocupantes y seguridad pasiva', 'Visión, luces y mandos', 'Electricidad, ruido y emisiones', 'Construcción y papeles', 'Permiso de conducir'];

/** What a requirement's own check (`comprobar`) can see besides the measured values. */
export interface VistaFicha {
  horcajadas: boolean | null; manillar: boolean | null; cerrado: boolean | null; pedaleo: boolean; propulsion: 'electrico' | 'phev' | 'pedaleo';
  parabrisasPlastico: boolean | null; retrovisores: 'espejos' | 'camaras' | null; ruedasCarga: { nombre: string; carga: number; capacidad: number }[] | null;
  masaOrdenMarcha: number | null; potenciaCategoria: number | null; potenciaPico: number | null; vmax: number | null; velocidadDiseno: number | null;
  parejas: { nombre: string; via: number }[]; inclina: boolean; plazas: number | null;
  /** (2026-11-24) for the pedal-cycle checks: mass with the battery, laden mass, front-axle share (%), the rollover threshold (g) and the design's own target for it */
  ruedasFisicas: number; radioGiro: number | null; masaVacio: number | null; masaMaxima: number | null; repartoDelantero: number | null; vuelcoSsf: number | null; vuelcoObjetivo: number | null;
}

export interface Medida {
  magnitud: Magnitud;
  /** The limit per category; a category of `categorias` without an entry has no limit for it («sin límite»). */
  limite: Partial<Record<IdCategoria, number>>;
  sentido: 'max' | 'min' | 'igual';
  /** If it fails, can it be fixed without redesign (a speed or power limiter)? Then the state is `condicion`. */
  limitable?: string;
  /** Does it decide the category (the automatic choice skips a category that fails it)? */
  decide?: boolean;
}

export interface Requisito {
  id: string;
  grupo: Grupo;
  titulo: string;
  /** The rule in full, plain Spanish. */
  detalle: string;
  /** Article / annex / point. */
  ref: string;
  fuente: IdFuente;
  categorias: IdCategoria[];
  medida?: Medida;
  /** A check that is not one number against one limit. Null: the model cannot tell. */
  comprobar?: (f: VistaFicha, cat: IdCategoria) => { estado: Estado; texto: string } | null;
  /** What would be needed to check it, when the model cannot. */
  queHaceFalta?: string;
  /** Applies to this design at all (an electric car has no exhaust)? */
  aplica?: (f: VistaFicha) => boolean;
}

const L_TODAS: IdCategoria[] = ['L1e-A', 'L3e', 'L2e', 'L5e-A', 'L6e-A', 'L6e-BP', 'L7e-A1', 'L7e-A2', 'L7e-CP'];
const L_CON_CARROCERIA: IdCategoria[] = ['L2e', 'L5e-A', 'L6e-A', 'L6e-BP', 'L7e-A1', 'L7e-A2', 'L7e-CP'];
const L7: IdCategoria[] = ['L7e-A1', 'L7e-A2', 'L7e-CP'];
const fmt = (v: number, d = 0) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
/** The tyre speed symbol a top speed needs (ETRTO letters). */
export function simboloVelocidad(kmh: number): string {
  const T: [string, number][] = [['J', 100], ['K', 110], ['L', 120], ['M', 130], ['N', 140], ['P', 150], ['Q', 160], ['R', 170], ['S', 180], ['T', 190], ['H', 210], ['V', 240]];
  return (T.find(([, v]) => v >= kmh) ?? ['W', 270])[0];
}

export const REQUISITOS: Requisito[] = [
  // ─────────────────────────────── Clasificación (anexo I del 168/2013)
  {
    id: 'ruedas', grupo: 'Clasificación', titulo: 'Número de ruedas',
    detalle: 'Cuentan las ruedas que tocan el suelo; dos ruedas montadas en el mismo eje con sus huellas a 460 mm o menos, centro a centro, son «ruedas gemelas» y cuentan como una (artículo 3, punto 72). Por eso un tres ruedas basculante de vía estrecha es una moto (L3e) y uno de vía ancha es un triciclo (L5e).',
    ref: 'Reglamento 168/2013, art. 3.72 y anexo I', fuente: 'r168art', categorias: ['L3e', 'L2e', 'L5e-A', 'L6e-A', 'L6e-BP', 'L7e-A1', 'L7e-A2', 'L7e-CP'],
    medida: { magnitud: 'ruedasLegales', limite: { 'L3e': 2, 'L2e': 3, 'L5e-A': 3, 'L6e-A': 4, 'L6e-BP': 4, 'L7e-A1': 4, 'L7e-A2': 4, 'L7e-CP': 4 }, sentido: 'igual', decide: true },
  },
  {
    id: 'l1eaRuedas', grupo: 'Clasificación', titulo: 'Dos, tres o cuatro ruedas (los ciclos de tres y cuatro equivalen al de dos)',
    detalle: 'L1e-A es, por definición, de dos ruedas; los ciclos de tres y cuatro ruedas que cumplen los criterios 9 a 11 (pedales, ayuda que corta a 25 km/h, 1.000 W) cuentan como «técnicamente equivalentes» (criterio 12 del anexo I). Con las ruedas gemelas (a 460 mm o menos) cuenta el número legal de ruedas.',
    ref: 'Reglamento 168/2013, anexo I, criterio 12', fuente: 'r168anx3', categorias: ['L1e-A'],
    medida: { magnitud: 'ruedasLegales', limite: { 'L1e-A': 4 }, sentido: 'max', decide: true },
  },
  {
    id: 'ruedasM1', grupo: 'Clasificación', titulo: 'Al menos cuatro ruedas',
    detalle: 'La categoría M (turismos) es de vehículos de motor con al menos cuatro ruedas. Un tres ruedas que se pasa de L5e no tiene categoría de turismo a la que subir.',
    ref: 'Reglamento 2018/858, art. 4', fuente: 'r2018', categorias: ['M1'],
    medida: { magnitud: 'ruedasLegales', limite: { M1: 4 }, sentido: 'min', decide: true },
  },
  {
    id: 'gemelas', grupo: 'Clasificación', titulo: 'Vía de cada pareja de ruedas (regla de las ruedas gemelas)',
    detalle: 'Dos ruedas del mismo eje a 460 mm o menos cuentan como una. Mantener cada pareja por encima de 460 mm conserva la categoría de tres o cuatro ruedas; bajar de ahí la convierte en moto.',
    ref: 'Reglamento 168/2013, art. 3.72', fuente: 'r168art', categorias: L_TODAS,
    comprobar: f => {
      if (!f.parejas.length) return { estado: 'cumple', texto: 'No tiene dos ruedas en un mismo eje: no hay ruedas gemelas.' };
      const t = f.parejas.map(p => `${p.nombre}: ${fmt(p.via * 1000)} mm (${p.via > 0.46 ? `${fmt((p.via - 0.46) * 1000)} mm por encima` : 'gemelas: cuentan como una'})`).join(' · ');
      return { estado: 'cumple', texto: t };
    },
  },
  {
    id: 'plazas', grupo: 'Clasificación', titulo: 'Plazas, con el conductor',
    detalle: 'L2e, L6e y L7e-A: dos como mucho. L5e-A: hasta cinco. L7e-CP: hasta cuatro. M1: hasta nueve (ocho más el conductor). Una plaza de conductor es la que cabe un maniquí de varón medio (percentil 50); un sillín a horcajadas también es una plaza (art. 3.29).',
    ref: 'Reglamento 168/2013, anexo I; art. 3.29', fuente: 'r168', categorias: ['L2e', 'L5e-A', 'L6e-A', 'L6e-BP', 'L7e-A1', 'L7e-A2', 'L7e-CP', 'M1'],
    medida: { magnitud: 'plazas', limite: { 'L2e': 2, 'L5e-A': 5, 'L6e-A': 2, 'L6e-BP': 2, 'L7e-A1': 2, 'L7e-A2': 2, 'L7e-CP': 4, M1: 9 }, sentido: 'max', decide: true },
  },
  {
    id: 'horcajadas', grupo: 'Clasificación', titulo: 'Tipo de asiento: a horcajadas o no',
    detalle: 'L7e-A1 exige plazas a horcajadas y dirección por manillar. L7e-A2 y L7e-CP exigen plazas que NO sean a horcajadas. (L5e y L6e no lo fijan.)',
    ref: 'Reglamento 168/2013, anexo I (L7e-A1, L7e-A2, L7e-C)', fuente: 'r168', categorias: L7,
    comprobar: (f, cat) => {
      if (f.horcajadas == null) return null;
      if (cat === 'L7e-A1') {
        const ok = f.horcajadas && f.manillar === true;
        return { estado: ok ? 'cumple' : 'no', texto: ok ? 'Sillines a horcajadas y manillar.' : `L7e-A1 pide ${!f.horcajadas ? 'sillines a horcajadas' : ''}${!f.horcajadas && f.manillar !== true ? ' y ' : ''}${f.manillar !== true ? 'manillar (lleva volante)' : ''}.` };
      }
      return { estado: f.horcajadas ? 'no' : 'cumple', texto: f.horcajadas ? 'Lleva sillines a horcajadas: esta categoría pide asientos (butacas o filas). En Interior, «Asientos».' : 'Asientos, no sillines a horcajadas.' };
    },
  },
  {
    id: 'cerrado', grupo: 'Clasificación', titulo: 'Habitáculo cerrado, accesible por tres lados como mucho',
    detalle: 'L6e-B y L7e-C son «cuadrimóviles»: el conductor y los pasajeros van en un habitáculo cerrado al que se entra por tres lados como mucho. Además, su parabrisas forma parte de ese habitáculo (3/2014, anexo VII, parte 1, punto 2.1.3).',
    ref: 'Reglamento 168/2013, anexo I (L6e-B, L7e-C)', fuente: 'r168', categorias: ['L6e-BP', 'L7e-CP'],
    comprobar: f => f.cerrado == null ? null : { estado: f.cerrado ? 'cumple' : 'no', texto: f.cerrado ? 'Cúpula cerrada: se entra por los lados o levantando la cúpula.' : 'Sin habitáculo cerrado.' },
  },
  // ─────────────────────────────── Masas y medidas
  {
    id: 'masa', grupo: 'Masas y medidas', titulo: 'Masa en orden de marcha (sin la batería de tracción)',
    detalle: 'El vehículo listo para rodar: líquidos, equipo de serie, carrocería, puertas, cristales, herramientas y el depósito de combustible al 90 %. NO cuentan el conductor ni los pasajeros ni, en un eléctrico o un híbrido, las baterías de tracción (art. 5.2.c). Límites: L2e 270 kg, L6e 425 kg, L7e de pasajeros 450 kg, L5e 1000 kg. En la conformidad de la producción se admite un 8 % de diferencia con lo declarado (44/2014, anexo IV, 4.1.5).',
    ref: 'Reglamento 168/2013, art. 5 y anexo I; 44/2014, anexo IV, punto 4.1.5', fuente: 'r168art', categorias: ['L2e', 'L5e-A', 'L6e-A', 'L6e-BP', 'L7e-A1', 'L7e-A2', 'L7e-CP'],
    medida: { magnitud: 'masaOrdenMarcha', limite: { 'L2e': 270, 'L5e-A': 1000, 'L6e-A': 425, 'L6e-BP': 425, 'L7e-A1': 450, 'L7e-A2': 450, 'L7e-CP': 450 }, sentido: 'max', decide: true },
  },
  {
    id: 'largo', grupo: 'Masas y medidas', titulo: 'Largo total',
    detalle: 'Toda la categoría L: hasta 4,00 m; L6e-B hasta 3,00 m y L7e-C hasta 3,70 m. Se mide en orden de marcha, en suelo llano; lo medido puede diferir un 3 % de lo declarado (44/2014, anexo XI, 3.3).',
    ref: 'Reglamento 168/2013, anexo I; 44/2014, anexo XI', fuente: 'r168', categorias: ['L1e-A', 'L2e', 'L5e-A', 'L6e-A', 'L6e-BP', 'L7e-A1', 'L7e-A2', 'L7e-CP'],
    medida: { magnitud: 'largo', limite: { 'L1e-A': 4, 'L2e': 4, 'L5e-A': 4, 'L6e-A': 4, 'L6e-BP': 3, 'L7e-A1': 4, 'L7e-A2': 4, 'L7e-CP': 3.7 }, sentido: 'max', decide: true },
  },
  {
    id: 'ancho', grupo: 'Masas y medidas', titulo: 'Ancho total (sin retrovisores)',
    detalle: 'Toda la categoría L: hasta 2,00 m; todo L1e (incluido L1e-A) hasta 1,00 m; L6e-B y L7e-C hasta 1,50 m.',
    ref: 'Reglamento 168/2013, anexo I', fuente: 'r168', categorias: ['L1e-A', 'L2e', 'L5e-A', 'L6e-A', 'L6e-BP', 'L7e-A1', 'L7e-A2', 'L7e-CP'],
    medida: { magnitud: 'ancho', limite: { 'L1e-A': 1, 'L2e': 2, 'L5e-A': 2, 'L6e-A': 2, 'L6e-BP': 1.5, 'L7e-A1': 2, 'L7e-A2': 2, 'L7e-CP': 1.5 }, sentido: 'max', decide: true },
  },
  {
    id: 'alto', grupo: 'Masas y medidas', titulo: 'Alto total',
    detalle: 'Toda la categoría L: hasta 2,50 m.', ref: 'Reglamento 168/2013, anexo I', fuente: 'r168', categorias: ['L1e-A', 'L2e', 'L5e-A', 'L6e-A', 'L6e-BP', 'L7e-A1', 'L7e-A2', 'L7e-CP'],
    medida: { magnitud: 'alto', limite: { 'L1e-A': 2.5, 'L2e': 2.5, 'L5e-A': 2.5, 'L6e-A': 2.5, 'L6e-BP': 2.5, 'L7e-A1': 2.5, 'L7e-A2': 2.5, 'L7e-CP': 2.5 }, sentido: 'max', decide: true },
  },
  {
    id: 'ejeDelantero', grupo: 'Masas y medidas', titulo: 'Peso en el eje delantero a plena carga: al menos el 30 %',
    detalle: 'Con el vehículo cargado a su masa máxima técnicamente admisible, el eje delantero debe llevar al menos el 30 % de ella (el 20 % si además lleva la carga máxima en el enganche). Aquí se calcula con todas las plazas ocupadas.',
    ref: 'Reglamento 44/2014, anexo XI, apéndice 1, puntos 2.4 y 2.4.1', fuente: 'r44', categorias: L_CON_CARROCERIA,
    medida: { magnitud: 'repartoDelantero', limite: { 'L2e': 30, 'L5e-A': 30, 'L6e-A': 30, 'L6e-BP': 30, 'L7e-A1': 30, 'L7e-A2': 30, 'L7e-CP': 30 }, sentido: 'min' },
    queHaceFalta: 'El reparto por ejes con la carga máxima. En el rombo, «eje delantero» es la rueda del morro: el modelo no reparte el peso entre las cuatro ruedas del rombo.',
  },
  // ─────────────────────────────── Propulsión y velocidad
  {
    id: 'potencia', grupo: 'Propulsión y velocidad', titulo: 'Potencia continua máxima',
    detalle: 'En un eléctrico cuenta la potencia continua máxima: la de 30 minutos en el eje del motor, medida como dice el Reglamento UN 85 (art. 3.35), NO la de pico. En un motor térmico, la potencia neta máxima. Límites: L2e y L6e-A 4 kW, L6e-B 6 kW, L7e-A y L7e-C 15 kW. L5e y M1 no tienen límite. Si se limita por programa, el anexo XVIII del 3/2014 pide dos métodos independientes, que el usuario no pueda cambiar (ni interruptor, ni menú, ni puente) y el 44/2014, anexo II, protección contra la manipulación (salvo en L5e). En un híbrido, el 134/2014 (anexo X, apéndice 2.4) mide la potencia total del conjunto en cada modo y toma el resultado más alto: aquí se suman los dos motores en el modo más potente que deja la electrónica de potencia (Motor › Electrónica de potencia; sin límite configurado, la suma entera), que es lo prudente. El detalle, en «Estudio L7e: potencia del híbrido».',
    ref: 'Reglamento 168/2013, art. 3.35 y anexo I; 3/2014, anexo XVIII; 134/2014, anexo X', fuente: 'r168', categorias: ['L2e', 'L6e-A', 'L6e-BP', 'L7e-A1', 'L7e-A2', 'L7e-CP', 'L5e-A', 'M1'],
    medida: { magnitud: 'potenciaCategoria', limite: { 'L2e': 4, 'L6e-A': 4, 'L6e-BP': 6, 'L7e-A1': 15, 'L7e-A2': 15, 'L7e-CP': 15 }, sentido: 'max', limitable: 'limitar la potencia continua en el controlador (dos métodos independientes, anexo XVIII del 3/2014)' },
  },
  {
    id: 'potenciaL3e', grupo: 'Propulsión y velocidad', titulo: 'Potencia y potencia por kilo (subcategoría de moto)',
    detalle: 'L3e-A1: hasta 11 kW y 0,1 kW por kg; L3e-A2: hasta 35 kW y 0,2 kW por kg; L3e-A3: más. La masa para la relación es la masa en orden de marcha (nota 1 del anexo I).',
    ref: 'Reglamento 168/2013, anexo I (L3e) y notas', fuente: 'r168', categorias: ['L3e'],
    medida: { magnitud: 'kWporKg', limite: { L3e: 0.2 }, sentido: 'max', limitable: 'limitar la potencia (o quedarse en L3e-A3, que no tiene límite)' },
  },
  {
    id: 'vmax', grupo: 'Propulsión y velocidad', titulo: 'Velocidad máxima por construcción',
    detalle: 'La velocidad que el vehículo no puede superar por cómo está hecho. Aquí, la que permite la potencia máxima con el Cd del túnel (la cifra de la pestaña Motor); el régimen máximo del motor y la reductora pueden cortarla antes. L2e y L6e: 45 km/h; L7e-C: 90 km/h. L5e, L7e-A y M1 no tienen tope en la clasificación. Se mide como dice el 134/2014, anexo X. Si el motor da para más, hace falta un limitador «por construcción» (anexo XVIII del 3/2014: dos métodos independientes, no ajustable por el usuario).',
    ref: 'Reglamento 168/2013, anexo I; 3/2014, anexo XVIII; 134/2014, anexo X', fuente: 'r168', categorias: ['L2e', 'L6e-A', 'L6e-BP', 'L7e-CP', 'L5e-A', 'L7e-A1', 'L7e-A2', 'M1'],
    medida: { magnitud: 'vmax', limite: { 'L2e': 45, 'L6e-A': 45, 'L6e-BP': 45, 'L7e-CP': 90 }, sentido: 'max', limitable: 'un limitador de velocidad por construcción' },
  },
  {
    id: 'velocidadDiseno', grupo: 'Propulsión y velocidad', titulo: 'La velocidad para la que está pensado el diseño',
    detalle: 'No es un requisito legal: es la «Velocidad de cálculo» del diseño. Si la categoría limita la velocidad por debajo de ella, el vehículo homologado no podrá ir a la velocidad para la que se diseñó. La elección automática de categoría no elige una cuyo tope esté por debajo de esta velocidad.',
    ref: 'Velocidad de cálculo del diseño (pestaña Motor)', fuente: 'r168', categorias: ['L2e', 'L6e-A', 'L6e-BP', 'L7e-CP'],
    comprobar: (f, cat) => {
      if (f.velocidadDiseno == null) return null;
      const tope = cat === 'L7e-CP' ? 90 : 45;
      return f.velocidadDiseno <= tope ? { estado: 'cumple', texto: `Diseñado para ${fmt(f.velocidadDiseno)} km/h; el tope es ${tope}.` } : { estado: 'no', texto: `Diseñado para ${fmt(f.velocidadDiseno)} km/h: esta categoría lo deja en ${tope} km/h.` };
    },
  },
  {
    id: 'placaVelocidad', grupo: 'Propulsión y velocidad', titulo: 'Placa de velocidad máxima (opcional)',
    detalle: 'Placa redonda blanca de 200 mm con la velocidad en cifras naranjas de al menos 100 mm, en la trasera, entre 0,30 y 1,20 m del suelo. Obligatoria solo en L7e-B; opcional en L1e, L3e, L4e y L5e-A.',
    ref: 'Reglamento 3/2014, anexo XVI', fuente: 'r3', categorias: ['L5e-A', 'L3e'],
    comprobar: () => ({ estado: 'cumple', texto: 'Opcional en esta categoría.' }),
  },
  // ─────────────────────────────── Frenos, ruedas y dirección
  {
    id: 'frenos', grupo: 'Frenos, ruedas y dirección', titulo: 'Frenado (Reglamento UN 78)',
    detalle: 'L2e y L5e cumplen todo el Reglamento UN 78; L6e como L2e; L7e como L5e. ABS: obligatorio solo en motos (L3e: ABS o frenada combinada en L3e-A1, ABS en A2 y A3; anexo VIII del 168/2013); en L5e y L7e no es obligatorio. El ensayo (distancias de parada, eficacia en caliente, freno de estacionamiento) lo hace el servicio técnico en pista con el vehículo cargado.',
    ref: 'Reglamento 3/2014, anexo III; 168/2013, anexo VIII', fuente: 'r3', categorias: L_TODAS,
    queHaceFalta: 'Un prototipo rodando y el ensayo de pista (antes, una prueba propia con acelerómetro desde 50 y 90 km/h).',
  },
  {
    id: 'neumaticosCarga', grupo: 'Frenos, ruedas y dirección', titulo: 'Neumáticos: capacidad de carga',
    detalle: 'Neumáticos homologados (Reglamento UN 75; solo L1e, L2e y L6e de hasta 150 kg pueden llevar neumáticos sin homologar de hasta 67 mm de ancho). Cada neumático debe aguantar la parte de la masa máxima de su eje: todo el eje si es uno solo, la mitad si son dos.',
    ref: 'Reglamento 3/2014, anexo XV, puntos 1.1 y 3.1', fuente: 'r3', categorias: L_TODAS,
    comprobar: f => {
      if (!f.ruedasCarga?.length) return null;
      const malas = f.ruedasCarga.filter(r => r.carga > r.capacidad);
      const t = f.ruedasCarga.map(r => `${r.nombre}: ${fmt(r.carga)} de ${fmt(r.capacidad)} kg (${r.carga > r.capacidad ? `se pasa ${fmt(r.carga - r.capacidad)} kg` : `quedan ${fmt(r.capacidad - r.carga)} kg`})`).join(' · ');
      return { estado: malas.length ? 'no' : 'cumple', texto: t };
    },
    queHaceFalta: 'La carga de cada rueda a plena carga y la capacidad del neumático elegido.',
  },
  {
    id: 'neumaticosVelocidad', grupo: 'Frenos, ruedas y dirección', titulo: 'Neumáticos: código de velocidad',
    detalle: 'El código de velocidad del neumático debe corresponder a la velocidad máxima por construcción del vehículo (o a la del limitador). Un neumático de invierno puede tener uno menor, con aviso en el salpicadero.',
    ref: 'Reglamento 3/2014, anexo XV, punto 4.1.1', fuente: 'r3', categorias: L_TODAS,
    comprobar: f => f.vmax == null ? null : { estado: 'comprobar', texto: `Con ${fmt(f.vmax)} km/h hace falta al menos el código ${simboloVelocidad(f.vmax)}${f.vmax > 90 ? `; limitado a 90 km/h, el ${simboloVelocidad(90)}` : ''}. El catálogo de ruedas del modelo no guarda el código: compruébalo en el neumático elegido.` },
  },
  {
    id: 'giro', grupo: 'Frenos, ruedas y dirección', titulo: 'Dirección: girar en un círculo de 12 m de radio',
    detalle: 'Ensayo en espiral: el vehículo tiene que poder seguir una curva que se cierra hasta un radio final de 12 m a 6 km/h o más; salir de una curva de 50 m de radio a 50 km/h sin oscilar; ser estable en recta a 0,8 de su velocidad máxima; y, al soltar el volante en curva, el giro debe abrirse, no cerrarse. Cada rueda debe poder girar a distinta velocidad (diferencial) y, con carrocería, hace falta marcha atrás.',
    ref: 'Reglamento 3/2014, anexo XIV, puntos 1.2 y 2.4 a 2.7', fuente: 'r3', categorias: L_CON_CARROCERIA,
    medida: { magnitud: 'radioGiro', limite: { 'L2e': 12, 'L5e-A': 12, 'L6e-A': 12, 'L6e-BP': 12, 'L7e-A1': 12, 'L7e-A2': 12, 'L7e-CP': 12 }, sentido: 'max' },
    queHaceFalta: 'El radio de giro (el modelo lo calcula en los Triciclos y el Basculante).',
  },
  // ─────────────────────────────── Ocupantes y seguridad pasiva
  {
    id: 'cinturones', grupo: 'Ocupantes y seguridad pasiva', titulo: 'Cinturones y sus anclajes',
    detalle: 'L2e, L5e, L6e y L7e de más de 270 kg en orden de marcha: cinturón en cada asiento (no en los sillines a horcajadas, que admiten cinturón de dos puntos). L7e-A2, L7e-B2 y L7e-C: de tres puntos (o arnés) en todas las plazas, pese lo que pese; el conductor, siempre de tres puntos. Anclajes: hasta 600 kg, ensayo con 675 daN en la banda del hombro y 675 en la abdominal (1110 si es solo abdominal), durante 0,2 s; por encima de 600 kg, el Reglamento UN 14 como un turismo. Cinturones con marca E (UN 16).',
    ref: 'Reglamento 3/2014, anexo XII (partes 1 a 3) y anexo I (UN 16)', fuente: 'r3', categorias: L_CON_CARROCERIA,
    comprobar: (f, cat) => {
      if (f.masaOrdenMarcha == null) return null;
      const obligan = f.masaOrdenMarcha > 270 || cat === 'L7e-A2' || cat === 'L7e-CP';
      return { estado: 'comprobar', texto: obligan ? `Obligatorios${cat === 'L7e-A2' || cat === 'L7e-CP' ? ', de tres puntos en todas las plazas' : f.horcajadas ? ' (en sillines a horcajadas, de dos puntos)' : ''}: ${fmt(f.masaOrdenMarcha)} kg en orden de marcha${f.masaOrdenMarcha > 270 ? ' > 270 kg' : ''}. Los anclajes se ensayan en el chasis real.` : `Opcionales (${fmt(f.masaOrdenMarcha)} kg ≤ 270 kg).` };
    },
    queHaceFalta: 'Los puntos de anclaje en el bastidor y el ensayo de tracción (675 daN).',
  },
  {
    id: 'asientos', grupo: 'Ocupantes y seguridad pasiva', titulo: 'Asientos',
    detalle: 'Con carrocería, asientos (no solo sillines). Todas las plazas miran hacia delante, con respaldo; el asiento aguanta 10 g hacia delante durante 20 ms. El punto R del conductor (la cadera del maniquí) a 400 mm o más.',
    ref: 'Reglamento 3/2014, anexo XIII', fuente: 'r3', categorias: L_CON_CARROCERIA,
    comprobar: f => f.horcajadas ? { estado: 'comprobar', texto: 'Sillines a horcajadas con carrocería: confirmar con el servicio técnico que se aceptan como asientos (el anexo XIII pide asientos si hay carrocería).' } : { estado: 'comprobar', texto: 'Miran hacia delante en el modelo; falta el ensayo de resistencia (10 g).' },
  },
  {
    id: 'interior', grupo: 'Ocupantes y seguridad pasiva', titulo: 'Interior sin aristas y puertas que no se abren solas',
    detalle: 'En la zona que puede tocar la cabeza, radios de al menos 3,2 mm (2,5 en el salpicadero y el volante); lo blando por debajo de 50 Shore A no cuenta. Cada puerta con cierre que aguante 200 daN hacia fuera sin abrirse.',
    ref: 'Reglamento 3/2014, anexo XVII; 168/2013, anexo VIII', fuente: 'r3', categorias: L_CON_CARROCERIA,
    queHaceFalta: 'Las piezas interiores reales y el ensayo de la puerta (200 daN).',
  },
  {
    id: 'estructura', grupo: 'Ocupantes y seguridad pasiva', titulo: 'Integridad de la estructura (sin ensayo de choque)',
    detalle: 'En la categoría L no hay ensayo de choque obligatorio. El fabricante declara que la estructura aguanta el uso previsto y debe entregar el cálculo si se lo piden tras una retirada por riesgo grave; puede negarse la homologación si hay dudas. Euro NCAP dio 1–2 estrellas a todos los cuadriciclos pesados que probó (2014 y 2016).',
    ref: 'Reglamento 3/2014, anexo XIX; 168/2013, anexo VIII', fuente: 'r3', categorias: L_TODAS,
    queHaceFalta: 'Cálculo del bastidor (el modelo ya da un coeficiente de seguridad a flexión) y, si se quiere, simulación de choque frontal.',
  },
  {
    id: 'salientes', grupo: 'Ocupantes y seguridad pasiva', titulo: 'Salientes exteriores y defensas',
    detalle: 'L2e, L5e, L6e y L7e: salientes exteriores como un turismo (Reglamento UN 26), comprobado sin placa de matrícula. Delante y detrás, sin puntas ni aristas hacia fuera.',
    ref: 'Reglamento 44/2014, anexo VIII, punto 2.1.2.1; 3/2014, anexo VI', fuente: 'r44', categorias: L_CON_CARROCERIA,
    queHaceFalta: 'Revisión de la carrocería con la esfera de 100 mm (radios, retrovisores, manillas).',
  },
  {
    id: 'm1Choque', grupo: 'Ocupantes y seguridad pasiva', titulo: 'Turismo: choque frontal y lateral, airbags, ESC, ABS',
    detalle: 'Un M1 cumple la seguridad general de los coches: choque frontal (UN 94 y 137), lateral (UN 95 y 135), control de estabilidad (UN 140), ABS (UN 13-H), y los sistemas del Reglamento 2019/2144 (adaptación inteligente de la velocidad, registrador de datos, frenada de emergencia…). Para un solo vehículo, la homologación individual española (RD 750/2010) admite requisitos alternativos.',
    ref: 'Reglamentos 2018/858 y 2019/2144; RD 750/2010', fuente: 'r2019', categorias: ['M1'],
    queHaceFalta: 'Ensayos de choque con varias unidades y la electrónica de estabilidad: el salto grande de coste.',
  },
  // ─────────────────────────────── Visión, luces y mandos
  {
    id: 'parabrisas', grupo: 'Visión, luces y mandos', titulo: 'Parabrisas y acristalamiento',
    detalle: 'Solo acristalamiento de seguridad homologado (Reglamento UN 43, como en un turismo). Parabrisas de plástico rígido: permitido solo en L1e a L5e (marcas VIII/A/L o X/A/L). En L5e-B y L7e-C el parabrisas forma parte del habitáculo cerrado.',
    ref: 'Reglamento 3/2014, anexo VII, parte 1, puntos 1.1, 2.1.2 y 2.1.3', fuente: 'r3', categorias: L_CON_CARROCERIA,
    comprobar: (f, cat) => {
      if (f.parabrisasPlastico == null) return null;
      const plasticoOk = cat === 'L2e' || cat === 'L5e-A';
      if (!f.parabrisasPlastico) return { estado: 'comprobar', texto: 'Parabrisas de vidrio: homologado UN 43.' };
      return plasticoOk ? { estado: 'comprobar', texto: 'Cúpula de policarbonato: permitido en esta categoría si el material está homologado UN 43 como parabrisas de plástico rígido.' }
        : { estado: 'no', texto: 'Cúpula de policarbonato: en esta categoría el parabrisas de plástico rígido no está permitido (solo en L1e–L5e). Hace falta un parabrisas de vidrio laminado; confírmalo con el servicio técnico.' };
    },
  },
  {
    id: 'limpia', grupo: 'Visión, luces y mandos', titulo: 'Limpiaparabrisas, lavaparabrisas, desempañado y desescarchado',
    detalle: 'Con parabrisas de acristalamiento de seguridad: limpiaparabrisas de al menos 40 barridos por minuto que limpie el 90 % de la zona de visión A, lavaparabrisas con depósito de al menos 1 litro. Desempañado y desescarchado obligatorios en L5e y L7e (no en L2e ni L6e), salvo si las puertas tapan menos del 75 % del hueco; hasta 15 kW, como el Reglamento UN 122.',
    ref: 'Reglamento 3/2014, anexo VII, partes 2 y 3', fuente: 'r3', categorias: L_CON_CARROCERIA,
    queHaceFalta: 'El modelo no dibuja limpiaparabrisas ni climatización: hay que preverlos en la cúpula.',
  },
  {
    id: 'retrovisores', grupo: 'Visión, luces y mandos', titulo: 'Visión trasera: retrovisores',
    detalle: 'L2e, L5e, L6e y L7e: retrovisores conformes a los Reglamentos UN 81 o 46 (dispositivos de clase II o III del 46); puede añadirse uno de clase I (interior).',
    ref: 'Reglamento 3/2014, anexo X', fuente: 'r3', categorias: L_CON_CARROCERIA,
    comprobar: f => f.retrovisores == null ? null : f.retrovisores === 'espejos'
      ? { estado: 'comprobar', texto: 'Espejos: comprar unos con marca E (UN 46 o 81) y comprobar su campo de visión en el vehículo.' }
      : { estado: 'comprobar', texto: 'Cámaras: el anexo X habla de espejos o de dispositivos UN 46; que el servicio técnico confirme que acepta cámaras (sistemas CMS) en categoría L antes de quitar los espejos.' },
  },
  {
    id: 'luces', grupo: 'Visión, luces y mandos', titulo: 'Luces y catadióptricos',
    detalle: 'Obligatorias en L5e y L7e: luz de carretera y de cruce, de posición delante, intermitentes, de posición detrás, de freno, de matrícula, catadióptrico trasero y catadióptricos laterales. Opcionales: diurna, antiniebla, emergencia, marcha atrás y de gálibo lateral. Ninguna otra. Luz diurna o cruce que se enciende sola. Cruce entre 500 y 1200 mm del suelo; con más de 1300 mm de ancho, dos luces de carretera.',
    ref: 'Reglamento 3/2014, anexo IX (puntos 2.1.11, 2.2.4 a 2.2.6, 2.3)', fuente: 'r3', categorias: L_CON_CARROCERIA,
    queHaceFalta: 'El plano de las luces con alturas y ángulos; comprar faros y pilotos con marca E.',
  },
  {
    id: 'mandos', grupo: 'Visión, luces y mandos', titulo: 'Mandos, testigos, velocímetro y bocina',
    detalle: 'Mandos y testigos con sus símbolos (o el Reglamento UN 121 como un turismo). Velocímetro y cuentakilómetros si pasa de 25 km/h (Reglamento UN 39). Bocina homologada (UN 28 en L3e, L4e y L5e; anexo II del 3/2014).',
    ref: 'Reglamento 3/2014, anexos II y VIII', fuente: 'r3', categorias: L_TODAS,
    queHaceFalta: 'Elegir el cuadro de instrumentos y la bocina con marca E.',
  },
  // ─────────────────────────────── Electricidad, ruido y emisiones
  {
    id: 'electrica', grupo: 'Electricidad, ruido y emisiones', titulo: 'Seguridad eléctrica (alta tensión)',
    detalle: 'Los eléctricos e híbridos cumplen el Reglamento UN 100 y la norma ISO 13063: protección contra el contacto directo e indirecto, resistencia de aislamiento, interbloqueo, etiquetas y seguridad durante la carga.',
    ref: 'Reglamento 3/2014, anexo IV; 168/2013, anexo VIII', fuente: 'r3', categorias: L_TODAS,
    aplica: f => f.propulsion !== 'pedaleo',
    queHaceFalta: 'El esquema de alta tensión y el ensayo de aislamiento; mejor una batería comprada con su certificado UN 100.',
  },
  {
    id: 'cem', grupo: 'Electricidad, ruido y emisiones', titulo: 'Compatibilidad electromagnética (Reglamento UN 10)',
    detalle: 'Todo vehículo L cumple el Reglamento UN 10: no perturba ni se deja perturbar. Si el controlador, el cargador y el convertidor traen su certificado UN 10 como componente, el ensayo del vehículo es más corto.',
    ref: 'Reglamento 44/2014, anexo VII', fuente: 'r44', categorias: L_TODAS,
    queHaceFalta: 'Ensayo en cámara (IDIADA o CTAG) y los certificados de los componentes.',
  },
  {
    id: 'ruido', grupo: 'Electricidad, ruido y emisiones', titulo: 'Ruido',
    detalle: 'L5e-A, L6e y L7e: 80 dB(A); L2e: 76 dB(A) (valores Euro 4 del anexo VI(D); la columna Euro 5 de ese anexo está en blanco en la versión leída, por confirmar en EUR-Lex). Ensayo según el Reglamento UN 9 (L2e, L4e, L5e-A, L6e). Un eléctrico pasa de sobra; suenan la reductora y la rodadura.',
    ref: 'Reglamento 168/2013, anexo VI(D)', fuente: 'r168anx6', categorias: L_TODAS,
    comprobar: f => f.propulsion === 'electrico' ? { estado: 'cumple', texto: 'Eléctrico: previsiblemente muy por debajo (por medir).' } : null,
    queHaceFalta: 'La medida en pista con el motor de gasolina en marcha.',
  },
  {
    id: 'emisiones', grupo: 'Electricidad, ruido y emisiones', titulo: 'Emisiones de escape Euro 5 y diagnosis a bordo (OBD)',
    detalle: 'Con motor de gasolina: Euro 5 en el ciclo WMTC revisado: CO 1000 mg/km, HC 100, HC no metánicos 68, NOx 60 y partículas 4,5; evaporación 1500 mg por ensayo (SHED). Diagnosis a bordo (OBD) de fase I obligatoria. Las fechas de Euro 5+ (OBD de fase II-B) dependen de la subcategoría: por confirmar en el anexo IV consolidado (modificado por el Reglamento 2019/129).',
    ref: 'Reglamento 168/2013, anexo VI(A2) y (C); 44/2014, anexo XII', fuente: 'r168anx6', categorias: L_TODAS,
    aplica: f => f.propulsion === 'phev',
    queHaceFalta: 'El motor de gasolina con su homologación Euro 5 (si viene de un vehículo ya homologado) y el ensayo del conjunto.',
  },
  // ─────────────────────────────── Construcción y papeles
  {
    id: 'matricula', grupo: 'Construcción y papeles', titulo: 'Hueco para la placa de matrícula',
    detalle: 'L5e y L7e: hueco de 280 × 200 mm detrás. L6e y L7e llevan también placa delante; L1e a L5e, no. L2e y L6e: 100 × 175 o 145 × 125 mm.',
    ref: 'Reglamento 44/2014, anexo XIV, puntos 1.3 y 1.4.1', fuente: 'r44', categorias: L_CON_CARROCERIA,
    queHaceFalta: 'Dibujar el hueco en la cola (y en el morro, en un cuadriciclo).',
  },
  {
    id: 'antirrobo', grupo: 'Construcción y papeles', titulo: 'Antirrobo',
    detalle: 'L5e y L7e con manillar: Reglamento UN 62; sin manillar (con volante): Reglamento UN 18 como un N2.',
    ref: 'Reglamento 44/2014, anexo VI, puntos 1.2 y 1.4', fuente: 'r44', categorias: ['L5e-A', 'L7e-A1', 'L7e-A2', 'L7e-CP'],
    comprobar: f => f.manillar == null ? null : { estado: 'comprobar', texto: f.manillar ? 'Con manillar: bloqueo según UN 62.' : 'Con volante: bloqueo según UN 18 (como un camión ligero N2).' },
  },
  {
    id: 'manipulacion', grupo: 'Construcción y papeles', titulo: 'Protección contra la manipulación',
    detalle: 'La placa del fabricante indica la potencia máxima, la velocidad máxima y el ruido en parado. Las unidades de control deben resistir la reprogramación (al menos ISO 15031-7) y la limitación no debe desaparecer al desconectar algo. No se aplica a L3e-A3, L4e-A3 ni L5e.',
    ref: 'Reglamento 44/2014, anexo II', fuente: 'r44', categorias: ['L2e', 'L6e-A', 'L6e-BP', 'L7e-A1', 'L7e-A2', 'L7e-CP', 'L3e'],
    queHaceFalta: 'La programación del controlador con acceso protegido.',
  },
  {
    id: 'durabilidad', grupo: 'Construcción y papeles', titulo: 'Declaración de durabilidad',
    detalle: 'El fabricante declara que los sistemas críticos para la seguridad aguantan el uso normal 1,5 veces la distancia del anexo VII en cinco años (como mucho 60 000 km).',
    ref: 'Reglamento 3/2014, anexo V; 168/2013, anexo VIII', fuente: 'r3', categorias: L_TODAS,
    queHaceFalta: 'Firmarla cuando haya fabricante inscrito.',
  },
  {
    id: 'via', grupo: 'Construcción y papeles', titulo: 'Vía administrativa en España',
    detalle: 'Un solo vehículo: homologación individual (RD 750/2010), con un servicio técnico (IDIADA, INSIA, INTA, TÜV…) y resolución del Ministerio de Industria; después, ITV y matrícula. Pocas unidades: serie corta nacional. Muchas: homologación de tipo europea. Los prototipos se matriculan a nombre del fabricante que los desarrolla.',
    ref: 'RD 750/2010; Reglamento 168/2013, anexo III', fuente: 'rd750', categorias: [...L_TODAS, 'M1'],
    queHaceFalta: 'Inscribir al fabricante y hablar con un servicio técnico (ver el departamento «Homologación» del Aeromóvil 1).',
  },
  // ─────────────────────────────── Ciclo de pedales con pedaleo asistido (2026-11-24)
  {
    id: 'epacRuedas', grupo: 'Clasificación', titulo: 'Dos ruedas o más (con más de dos se aplica el anexo VI)',
    detalle: 'El RD 339/2014 define el ciclo como un vehículo de al menos dos ruedas impulsado sobre todo por la fuerza muscular, normalmente con pedales. Un ciclo de tres o cuatro ruedas entra, pero tiene que cumplir además el anexo VI («especificaciones generales aplicables a los ciclos de más de dos ruedas»); la disposición transitoria segunda lo aplica mientras no haya normas armonizadas para ellos. La Orden PJC/780/2025 distingue ahora en el Reglamento General de Vehículos la bicicleta (dos ruedas) del ciclo de pedales con pedaleo asistido (cualquier número de ruedas).',
    ref: 'RD 339/2014, art. 2 y disposición transitoria segunda; Orden PJC/780/2025', fuente: 'rd339', categorias: ['EPAC'],
    comprobar: f => ({ estado: 'cumple', texto: f.ruedasFisicas > 2 ? `Lleva ${f.ruedasFisicas} ruedas: más de dos, así que se le aplica el anexo VI del RD 339/2014.` : `Lleva ${f.ruedasFisicas} ruedas: es una bicicleta; el anexo VI no se le aplica.` }),
  },
  {
    id: 'epacCorte', grupo: 'Propulsión y velocidad', titulo: 'El motor se corta al dejar de pedalear y baja poco a poco al acercarse a 25 km/h',
    detalle: 'La definición española exige que la potencia del motor «disminuya progresivamente» y se interrumpa antes de llegar a 25 km/h o si el ciclista deja de pedalear (Orden PJC/780/2025; Reglamento 168/2013, art. 2.2.h). Un acelerador que mueve el vehículo sin pedalear lo saca de esta categoría (salvo una ayuda de arranque limitada que fija la EN 15194, apartado 4.2). Se demuestra en ensayo con el controlador definitivo.',
    ref: 'Orden PJC/780/2025; Reglamento 168/2013, art. 2.2.h; EN 15194, apartado 4.2', fuente: 'pjc780', categorias: ['EPAC'],
    queHaceFalta: 'El controlador con la lógica «sin pedaleo no hay motor» (sensor de pedaleo o de par), sin acelerador de puño, y el ensayo de corte a 25 km/h y al dejar de pedalear.',
  },
  {
    id: 'epacTension', grupo: 'Electricidad, ruido y emisiones', titulo: 'Tensión nominal de la batería de 48 V como mucho (corriente continua)',
    detalle: 'El campo de aplicación público de la EN 15194 es el de los ciclos con una tensión nominal de hasta 48 V en corriente continua (o con cargador integrado de 230 V en alterna). Por eso la norma no pide protecciones de alta tensión: por encima de 48 V habría que justificar la seguridad eléctrica con otra norma. La EN 17860-5 (eléctrica de ciclos de carga) es la otra referencia.',
    ref: 'EN 15194, apartado 4.2 (alcance); EN 17860-5', fuente: 'en15194', categorias: ['EPAC'],
    queHaceFalta: 'La tensión nominal de la batería elegida. El modelo calcula la energía de la batería, no su tensión: se compra la batería ya certificada y se mira su ficha.',
  },
  {
    id: 'epacDeclarar', grupo: 'Masas y medidas', titulo: 'Declarar plazas, masa en vacío, carga máxima y velocidad máxima recomendada',
    detalle: 'Anexo VI, punto 1: el fabricante declara el número previsto de ocupantes, la masa en vacío, la carga máxima admisible y la velocidad máxima recomendada. No hay un tope legal de masa ni de medidas en el texto leído: el RD 339/2014 no fija ancho, largo ni alto. Lo que se declare es lo que luego se ensaya (frenos, estabilidad) y lo que va en el manual.',
    ref: 'RD 339/2014, anexo VI, punto 1', fuente: 'rd339', categorias: ['EPAC'],
    comprobar: f => {
      const n = (v: number | null, d = 0, u = '') => v == null ? 'sin calcular' : `${fmt(v, d)}${u}`;
      return { estado: 'comprobar', texto: `El diseño da: ${n(f.plazas)} plaza${f.plazas === 1 ? '' : 's'}; masa en vacío ${n(f.masaVacio, 0, ' kg')} (con batería); a plena carga ${n(f.masaMaxima, 0, ' kg')}; velocidad máxima ${n(f.vmax, 0, ' km/h')}. Hay que firmar esas cifras en el expediente.` };
    },
  },
  {
    id: 'epacEsquinas', grupo: 'Construcción y papeles', titulo: 'Sin esquinas cortantes y con la transmisión protegida',
    detalle: 'Anexo VI, puntos 1.1 y 1.2: ningún borde con el que puedan tocar el cuerpo, las manos o los pies al pedalear o manejarlo puede ser cortante, y la transmisión (cadena, correa, piñones) se protege para que no atrape ropa ni dedos, sea cual sea el sistema.',
    ref: 'RD 339/2014, anexo VI, puntos 1.1 y 1.2', fuente: 'rd339', categorias: ['EPAC'],
    queHaceFalta: 'Revisar la carrocería, el pedalier y la cadena en el prototipo (y proteger la cadena con un cubrecadenas o una caja).',
  },
  {
    id: 'epacFrenos', grupo: 'Frenos, ruedas y dirección', titulo: 'Frenos que actúan por separado en las ruedas delanteras y traseras',
    detalle: 'Anexo VI, punto 2: un freno que actúe de forma independiente sobre las ruedas delanteras y sobre las traseras; palanca del freno delantero a la izquierda del manillar y la del trasero a la derecha; regulables hasta que toque cambiar las pastillas; y, en seco, deben parar el ciclo de forma segura y suave, sin vibración excesiva, sin bloquear la rueda delantera, sin vuelco, sin pérdida de control ni deslizamiento lateral excesivo. Las distancias las fija el ensayo de la parte 3 de la EN 17860 o, si el servicio técnico lo prefiere, la EN 15194 (frenos) con el vehículo cargado.',
    ref: 'RD 339/2014, anexo VI, punto 2; EN 17860-3', fuente: 'rd339', categorias: ['EPAC'],
    queHaceFalta: 'Un prototipo rodando y el ensayo de frenado con la carga máxima declarada.',
  },
  {
    id: 'epacDireccion', grupo: 'Frenos, ruedas y dirección', titulo: 'Dirección: radio de giro declarado a la velocidad máxima recomendada',
    detalle: 'Anexo VI, punto 3: puños o protectores en los extremos del manillar, marca de inserción mínima de la potencia, rueda centrada en la horquilla y, para un ciclo de más de dos ruedas, declarar el radio de giro a la velocidad máxima recomendada.',
    ref: 'RD 339/2014, anexo VI, punto 3', fuente: 'rd339', categorias: ['EPAC'],
    comprobar: f => f.radioGiro == null ? null : { estado: 'comprobar', texto: `El diseño calcula un radio de giro de ${fmt(f.radioGiro, 1)} m: hay que declararlo y comprobarlo en pista a la velocidad recomendada.` },
    queHaceFalta: 'El radio de giro (el modelo lo calcula en los Triciclos y el Basculante).',
  },
  {
    id: 'epacNeumaticos', grupo: 'Frenos, ruedas y dirección', titulo: 'Presión de inflado recomendada marcada en el neumático',
    detalle: 'Anexo VI, punto 4: la presión recomendada para las cargas declaradas va moldeada en el flanco del neumático, visible una vez montado. Comprar neumáticos que la traigan evita el problema; y el manual repite la presión (anexo II).',
    ref: 'RD 339/2014, anexo VI, punto 4; anexo VI, punto 12 f)', fuente: 'rd339', categorias: ['EPAC'],
    comprobar: f => f.ruedasCarga?.length ? { estado: 'comprobar', texto: `${f.ruedasCarga.map(r => `${r.nombre}: ${fmt(r.carga)} kg de carga y ${fmt(r.capacidad)} kg de capacidad`).join(' · ')}. La ley no fija esa capacidad, pero la presión que se marque tiene que corresponder a esa carga.` } : null,
    queHaceFalta: 'Elegir los neumáticos con la presión de uso moldeada y con capacidad de sobra para la carga declarada.',
  },
  {
    id: 'epacEstabilidad', grupo: 'Frenos, ruedas y dirección', titulo: 'Estabilidad: el reparto de masas evita el vuelco lateral y el longitudinal',
    detalle: 'Anexo VI, punto 10: el reparto de masas tiene que evitar el vuelco longitudinal y el lateral en todos los usos previstos. La ley no da un número: el ensayo de estabilidad (parte 3 de la EN 17860) lo concreta. Aquí se compara el umbral de vuelco lateral del diseño con el que el propio editor se exige (el agarre de un neumático de carretera más un 15 %).',
    ref: 'RD 339/2014, anexo VI, punto 10; EN 17860-3', fuente: 'rd339', categorias: ['EPAC'],
    comprobar: f => {
      if (f.vuelcoSsf == null || f.vuelcoObjetivo == null) return null;
      const ok = f.vuelcoSsf >= f.vuelcoObjetivo;
      const rep = f.repartoDelantero != null ? ` Peso en el eje delantero: ${fmt(f.repartoDelantero)} %.` : '';
      return { estado: ok ? 'cumple' : 'no', texto: `Vuelca de lado a ${fmt(f.vuelcoSsf, 2)} g; el editor se exige ${fmt(f.vuelcoObjetivo, 2)} g${ok ? '' : `: te faltan ${fmt(f.vuelcoObjetivo - f.vuelcoSsf, 2)} g (ensanchar la vía o bajar el centro de gravedad)`}.${rep} El ensayo oficial decide.` };
    },
    queHaceFalta: 'El umbral de vuelco del diseño: el modelo lo calcula en los Triciclos (no en el Basculante ni en el Aeromóvil 1).',
  },
  {
    id: 'epacLuces', grupo: 'Visión, luces y mandos', titulo: 'Luces y catadióptricos: faro blanco, piloto rojo, reflector trasero y cuatro laterales amarillos',
    detalle: 'Anexo VI, punto 6 y anexo V: al menos una luz blanca delante y una luz roja detrás (delante 4 a 60 candelas, detrás 4 a 12); un catadióptrico trasero rojo, no triangular (categoría IA del Reglamento UN 3); y cuatro catadióptricos laterales amarillos, no triangulares (categoría IVA): dos en las ruedas delanteras (uno por lado) y dos en las ruedas traseras (uno por lado). Todos homologados UN 3. El modelo del diseño todavía no dibuja ni cuenta faros, piloto ni catadióptricos: hay que añadirlos al diseño.',
    ref: 'RD 339/2014, anexo VI, punto 6, y anexo V', fuente: 'rd339', categorias: ['EPAC'],
    queHaceFalta: 'Poner en el diseño: 1 faro blanco, 1 piloto rojo, 1 catadióptrico rojo trasero y 4 catadióptricos amarillos laterales (uno por rueda), con piezas homologadas UN 3.',
  },
  {
    id: 'epacTimbre', grupo: 'Visión, luces y mandos', titulo: 'Timbre (advertencia acústica)',
    detalle: 'Anexo VI, punto 11: advertencia acústica conforme al artículo 22 del Reglamento General de Vehículos. Es un timbre de bicicleta, no una bocina de vehículo de motor.',
    ref: 'RD 339/2014, anexo VI, punto 11', fuente: 'rd339', categorias: ['EPAC'],
    queHaceFalta: 'Montar un timbre al alcance del conductor.',
  },
  {
    id: 'epacPasajeros', grupo: 'Ocupantes y seguridad pasiva', titulo: 'Sistema de retención para los pasajeros',
    detalle: 'Anexo VI, punto 9: si el ciclo está pensado para llevar pasajeros, cada uno lleva un sistema de retención que lo proteja (un sillín con arnés o cinturón, por ejemplo). La EN 17860-6 (pasajeros) es la referencia técnica que cita el autor del texto; su existencia la confirmo solo en parte (ver «Lo que contrasté»).',
    ref: 'RD 339/2014, anexo VI, punto 9', fuente: 'rd339', categorias: ['EPAC'],
    comprobar: f => f.plazas == null ? null : f.plazas <= 1
      ? { estado: 'cumple', texto: 'Solo lleva al conductor: este punto no se aplica mientras no se declare ningún pasajero.' }
      : { estado: 'comprobar', texto: `Lleva ${f.plazas} plazas, así que ${f.plazas - 1} son de pasajero: cada una necesita su sistema de retención (cinturón o arnés) y declararlo.` },
  },
  {
    id: 'epacExpediente', grupo: 'Construcción y papeles', titulo: 'Expediente técnico y declaración de conformidad del fabricante',
    detalle: 'Antes de comercializar, el fabricante elabora el expediente técnico (anexo III: planos, cálculos, evaluación de riesgos, normas aplicadas, informes de ensayo, manual, declaraciones de los componentes y el control de la producción en serie) y firma la declaración de conformidad (anexo I). Los conserva a disposición de la Administración al menos diez años desde la fabricación o, en serie, desde la última unidad. Sin control previo de la Administración (art. 4): si no lo presenta cuando se lo piden, se presume que el ciclo no cumple.',
    ref: 'RD 339/2014, art. 4 y anexos I y III', fuente: 'rd339', categorias: ['EPAC'],
    queHaceFalta: 'Reunir el expediente según el anexo III y firmar la declaración del anexo I cuando haya fabricante identificado.',
  },
  {
    id: 'epacManual', grupo: 'Construcción y papeles', titulo: 'Manual de instrucciones en castellano con cada unidad',
    detalle: 'Anexo II: en uno o varios idiomas oficiales de la UE; si no hay original en español, traducción al menos al español marcada «Traducción del manual original». Contiene el uso previsto y el mal uso previsible, la carga máxima y el número de plazas, los riesgos residuales, el montaje, el mantenimiento y los ajustes (altura de sillín y manillar con sus marcas, tensión de cadena, frenos y pastillas, cambio, comprobaciones periódicas y presión de los neumáticos). La publicidad no puede contradecirlo.',
    ref: 'RD 339/2014, anexo II y anexo VI, punto 12', fuente: 'rd339', categorias: ['EPAC'],
    queHaceFalta: 'Escribir el manual con el contenido mínimo del anexo II.',
  },
  {
    id: 'epacPlaca', grupo: 'Construcción y papeles', titulo: 'Placa del fabricante en cada unidad y modelo marcado',
    detalle: 'Artículo 3: una placa visible, legible e indeleble con la razón social, la dirección completa del fabricante (o de su representante) y el número de serie; el modelo, identificado de forma legible y permanente. No hace falta bastidor VIN ni matrícula.',
    ref: 'RD 339/2014, art. 3 y anexo VI, punto 7', fuente: 'rd339', categorias: ['EPAC'],
    queHaceFalta: 'Encargar la placa y fijar el formato de los números de serie.',
  },
  {
    id: 'epacMaquinas', grupo: 'Construcción y papeles', titulo: 'Marcado CE de máquinas, cuando corresponda',
    detalle: 'Es un trámite aparte de la homologación de tráfico. La EN 15194 trae un anexo informativo (ZA) que la enlaza con la Directiva de máquinas 2006/42/CE, que el Reglamento (UE) 2023/1230 sustituye desde el 20 de enero de 2027. Si le aplica a este vehículo: evaluación de riesgos, expediente, declaración CE, marcado CE y manual. Que la EN 15194 cubra un cuadriciclo entero no se da por hecho (su definición de bicicleta es de dos ruedas): pide una evaluación escrita de aplicabilidad.',
    ref: 'EN 15194, anexo ZA; Directiva 2006/42/CE; Reglamento (UE) 2023/1230', fuente: 'maq2023', categorias: ['EPAC'],
    queHaceFalta: 'Una evaluación escrita, de un ingeniero o un organismo, de si el vehículo es una máquina a efectos de la normativa de máquinas.',
  },
  {
    id: 'epacPotencia', grupo: 'Propulsión y velocidad', titulo: 'Motor de ayuda de 250 W nominales continuos como mucho',
    detalle: 'La definición española exige un motor eléctrico auxiliar de potencia nominal continua máxima inferior o igual a 250 W: no cuenta la potencia de pico. Con más, el vehículo deja de ser un ciclo de pedales con pedaleo asistido y pasa a ser L1e-A (hasta 1.000 W) o más.',
    ref: 'Orden PJC/780/2025; Reglamento 168/2013, art. 2.2.h; EN 15194', fuente: 'pjc780', categorias: ['EPAC'],
    medida: { magnitud: 'potenciaCategoria', limite: { EPAC: 0.25 }, sentido: 'max', decide: true },
  },
  {
    id: 'epacVelocidad', grupo: 'Propulsión y velocidad', titulo: 'La ayuda se corta a 25 km/h',
    detalle: 'Por encima de 25 km/h solo empujan las piernas. No es un tope a la velocidad del vehículo: cuesta abajo o con las piernas puede ir más rápido. Aquí se compara con la velocidad máxima que alcanza con el motor.',
    ref: 'Orden PJC/780/2025; Reglamento 168/2013, art. 2.2.h', fuente: 'pjc780', categorias: ['EPAC'],
    medida: { magnitud: 'vmax', limite: { EPAC: 25 }, sentido: 'max', limitable: 'cortar la ayuda a 25 km/h en el controlador' },
  },
  {
    id: 'epacPedales', grupo: 'Clasificación', titulo: 'Se mueve pedaleando: la propulsión es sobre todo muscular',
    detalle: 'El RD 339/2014 define el ciclo como propulsado «exclusiva o principalmente por la energía muscular», normalmente con pedales, y la Orden PJC/780/2025 exige que el ciclo lleve pedales. Los pedales no pueden ser decorativos: el motor ayuda, no sustituye. Un pedalier que solo mueve un generador (pedaleo «por cable») no está claro que cuente como pedaleo asistido: a confirmar por escrito. Tampoco puede haber un acelerador independiente de los pedales: eso lo convertiría en vehículo a motor.',
    ref: 'RD 339/2014, art. 2; Orden PJC/780/2025; Reglamento 168/2013, art. 2.2.h', fuente: 'rd339', categorias: ['EPAC'],
    comprobar: f => ({ estado: f.pedaleo ? 'comprobar' : 'no', texto: f.pedaleo ? 'Tiene pedales; si mueven un generador y no las ruedas, confirmar que cuenta como pedaleo asistido. Y comprobar que no hay acelerador independiente.' : 'No tiene pedales.' }),
  },
  // ─────────────────────────────── L1e-A (2026-11-24): its own rule, not the pedal cycle's (two categories, two laws)
  {
    id: 'l1eaPedales', grupo: 'Clasificación', titulo: 'Ciclo de pedales: el motor ayuda a pedalear, no lo sustituye',
    detalle: 'Criterios 9 y 12 del anexo I del Reglamento 168/2013: el vehículo está diseñado para pedalear y el fin principal del motor es ayudar a hacerlo. Unos pedales decorativos no valen. Un pedalier que solo mueve un generador (pedaleo «por cable») no está claro que cuente: a confirmar por escrito con el servicio técnico.',
    ref: 'Reglamento 168/2013, anexo I, criterios 9 y 12', fuente: 'r168anx3', categorias: ['L1e-A'],
    comprobar: f => ({ estado: f.pedaleo ? 'comprobar' : 'no', texto: f.pedaleo ? 'Tiene pedales; si mueven un generador y no las ruedas, confirmar que cuenta como ciclo de pedales.' : 'No tiene pedales.' }),
  },
  {
    id: 'l1eaPotencia', grupo: 'Propulsión y velocidad', titulo: 'Potencia continua de 1.000 W como mucho',
    detalle: 'Criterio 11 del anexo I: potencia nominal continua o neta máxima de 1.000 W o menos. Es la potencia que el controlador mantiene, no la punta: un controlador que limite a 1 kW continuos cumple aunque dé más un instante (hay que declararlo y medirlo, Reglamento 134/2014 anexo X). Todo L1e además tiene un tope de 4 kW de potencia y 45 km/h de diseño.',
    ref: 'Reglamento 168/2013, anexo I, criterio 11', fuente: 'r168anx3', categorias: ['L1e-A'],
    medida: { magnitud: 'potenciaCategoria', limite: { 'L1e-A': 1 }, sentido: 'max', decide: true },
  },
  {
    id: 'l1eaVelocidad', grupo: 'Propulsión y velocidad', titulo: 'La ayuda se corta a 25 km/h o antes',
    detalle: 'Criterio 10 del anexo I: la potencia de la ayuda se corta a una velocidad del vehículo de 25 km/h o menos. No es la velocidad que se alcanza pedaleando solo (cuesta abajo o con las piernas puede ser mayor): es la velocidad a la que el motor deja de empujar. Hay que demostrar el corte en ensayo.',
    ref: 'Reglamento 168/2013, anexo I, criterio 10', fuente: 'r168anx3', categorias: ['L1e-A'],
    medida: { magnitud: 'vmax', limite: { 'L1e-A': 25 }, sentido: 'max', limitable: 'cortar la ayuda a 25 km/h en el controlador' },
  },
  {
    id: 'l1eaLuces', grupo: 'Visión, luces y mandos', titulo: 'Luces y catadióptricos (incluido el reflector trasero)',
    detalle: 'Un L1e lleva alumbrado y señalización homologados (Reglamento 3/2014, anexo IX): al menos luz de cruce, luz de posición trasera, luz de freno y catadióptrico trasero. El modelo del diseño todavía no dibuja ni cuenta los faros, los pilotos ni el reflector trasero, así que no puede comprobarlo: hay que añadirlos al diseño y llevar piezas con marca E. La lista exacta para L1e se confirma con el servicio técnico.',
    ref: 'Reglamento 3/2014, anexo IX (lista para L1e: por confirmar)', fuente: 'r3', categorias: ['L1e-A'],
    queHaceFalta: 'Poner en el diseño el faro, el piloto trasero con luz de freno y un reflector trasero, con sus alturas y ángulos, y comprar piezas con marca E.',
  },
  // ─────────────────────────────── Permiso de conducir
  {
    id: 'permiso', grupo: 'Permiso de conducir', titulo: 'Permiso para conducirlo en España',
    detalle: 'AM (15 años): ciclomotores de dos y tres ruedas y cuadriciclos ligeros (L2e, L6e). A1 (16 años): motos ligeras y triciclos de motor de hasta 15 kW. A: motos y triciclos de motor (los de más de 15 kW, con 21 años). B (18 años): turismos, cuadriciclos (L7e) y triciclos de motor (los de más de 15 kW, con 21 años). El B1 para cuadriciclos pesados desde los 16 años está en consulta desde 2024, no en vigor.',
    ref: 'Reglamento General de Conductores (RD 818/2009), art. 4', fuente: 'permisoB', categorias: ['EPAC', 'L1e-A', 'L2e', 'L5e-A', 'L6e-A', 'L6e-BP', 'L7e-A1', 'L7e-A2', 'L7e-CP', 'M1', 'L3e'],
    comprobar: (f, cat) => {
      const p = f.potenciaCategoria;
      if (cat === 'L5e-A') return p == null ? null : { estado: 'cumple', texto: p <= 15 ? `A1 desde los 16 años (${fmt(p, 1)} kW ≤ 15 kW; te quedan ${fmt(15 - p, 1)} kW antes de necesitar el A o el B con 21 años).` : `${fmt(p, 1)} kW > 15 kW: permiso A o B, con 21 años cumplidos (A1 no vale).` };
      return { estado: 'cumple', texto: categoria(cat).permiso };
    },
  },
];
