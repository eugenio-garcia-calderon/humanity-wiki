/**
 * «Carrocería impresa en 3D y chasis de tubo» (2026-11-27, Eugenio: «¿Y la solución de hacer la carrocería con impresoras 3D? y el
 * chasis tubular metálico. Explora esa opción, en este caso para el vehículo tipo BICICLETA»).
 *
 * THE SECTION AS DATA, pure (no React): `scripts/impresion3d.ts` imports it in Node. Like `datos.ts`: typical figures and project
 * estimates, never a quote or a datasheet; the sources were found with the search engine and seen by their title only.
 */

export type IdPlastico = 'pla' | 'petg' | 'asa' | 'petgcf' | 'pc';
export interface Plastico {
  id: IdPlastico; nombre: string;
  /** g/cm³ */ rho: number;
  /** € per kg of filament, small quantities (estimate) */ eurKg: number;
  /** glass transition, °C: above it the part softens and creeps */ tg: number;
  sol: string; golpes: string; imprimir: string; veredicto: string;
  apto: boolean;
}
export const PLASTICOS: Plastico[] = [
  { id: 'pla', nombre: 'PLA', rho: 1.24, eurKg: 20, tg: 60, sol: 'Malo: se ablanda a ≈ 55–60 °C, una carrocería oscura al sol de verano pasa de eso', golpes: 'Frágil', imprimir: 'Lo más fácil', veredicto: 'Solo para maquetas y para el macho de un molde, nunca para la piel que va a la calle.', apto: false },
  { id: 'petg', nombre: 'PETG', rho: 1.27, eurKg: 22, tg: 80, sol: 'Regular: aguanta más calor, pero amarillea y pierde con años de sol si no se pinta', golpes: 'Bueno: se dobla antes de romper', imprimir: 'Fácil, sin cerramiento', veredicto: 'Válido pintado y en colores claros; el más fácil de los que sirven para la calle.', apto: true },
  { id: 'asa', nombre: 'ASA', rho: 1.07, eurKg: 28, tg: 100, sol: 'Muy bueno: hecho para exterior (es el plástico de retrovisores y rejillas)', golpes: 'Correcto', imprimir: 'Necesita impresora cerrada y ventilación (huele)', veredicto: 'La primera opción para la piel: el más ligero de los que aguantan sol y calor.', apto: true },
  { id: 'petgcf', nombre: 'PETG o nailon con fibra de carbono', rho: 1.30, eurKg: 45, tg: 80, sol: 'Bueno si se pinta', golpes: 'Más rígido, más frágil', imprimir: 'Necesita boquilla de acero endurecido', veredicto: 'Para piezas que deben ser rígidas (soportes, refuerzos, bridas), no para toda la piel.', apto: true },
  { id: 'pc', nombre: 'Policarbonato (PC)', rho: 1.20, eurKg: 40, tg: 110, sol: 'Bueno si se pinta', golpes: 'El más tenaz', imprimir: 'Difícil: alta temperatura, cerramiento, se deforma', veredicto: 'Para zonas que reciben golpes (morro, carenados de ruedas) si la impresora lo permite.', apto: true },
];

/** How the skin is printed: one solid wall, or two skins with a light infill between (a printed sandwich: much stiffer for its weight). */
export type IdPared = 'maciza' | 'sandwich' | 'sandwich-rigido';
export const PAREDES: { id: IdPared; nombre: string; que: string; /** mm of solid plastic per m² equivalent */ mmEquiv: number; espesor: number }[] = [
  { id: 'maciza', nombre: 'Pared maciza de 1,6 mm', que: 'Cuatro pasadas de boquilla de 0,4 mm. Ligera pero flexible: vibra y se abolla en paneles grandes.', mmEquiv: 1.6, espesor: 1.6 },
  { id: 'sandwich', nombre: 'Sándwich 0,8 + 8 + 0,8 mm', que: 'Dos pieles de 0,8 mm con relleno giroide al 8 % entre ellas: 9,6 mm de grueso, rígido como un panel de fibra.', mmEquiv: 0.8 + 0.8 + 8 * 0.08, espesor: 9.6 },
  { id: 'sandwich-rigido', nombre: 'Sándwich 1 + 12 + 1 mm', que: 'Para el suelo, el morro y los bordes de las puertas: más rígido y más resistente a golpes.', mmEquiv: 1 + 1 + 12 * 0.1, espesor: 14 },
];

/** Printers: bed (mm, the side of the usable square), price (€, estimate), effective deposition (g/h with a 0.6–0.8 mm nozzle). */
export type IdImpresora = 'escritorio' | 'mediana' | 'grande' | 'pellets';
export const IMPRESORAS: { id: IdImpresora; nombre: string; cama: number; eur: number; gh: number; nota: string }[] = [
  { id: 'escritorio', nombre: 'De escritorio, 256 mm', cama: 256, eur: 700, gh: 70, nota: 'Las más comunes (cerradas para ASA): baratas, pero la piel sale en cientos de trozos.' },
  { id: 'mediana', nombre: 'Mediana, 350 mm', cama: 350, eur: 1200, gh: 80, nota: 'Cerrada, para ASA: la mitad de trozos que la de escritorio.' },
  { id: 'grande', nombre: 'Grande, 500–600 mm', cama: 550, eur: 4000, gh: 130, nota: 'Boquilla de 0,8 mm: menos trozos y más rápida, pero cuesta varias de escritorio.' },
  { id: 'pellets', nombre: 'Servicio de gran formato con pellets (1 m)', cama: 1000, eur: 0, gh: 1500, nota: 'Una empresa imprime con granza (pellets) a 1–4 kg/h: pocas piezas, pero la pared mínima es de 4–6 mm (pesa más) y la superficie sale rugosa. Se paga por kg.' },
];
/** A print service's price per kg of large-format part, estimate (machine time + material + margin). */
export const EUR_KG_SERVICIO_PELLETS = 60;
/** Usable share of a bed square for a curved shell panel (height, curvature, flanges). */
export const APROVECHAMIENTO_CAMA = 0.5;
/** Extra plastic for the flanges, ribs and joints between panels, and for waste and supports. */
export const EXTRA_UNIONES = 0.15, EXTRA_DESPERDICIO = 0.10;
/** Hours of a person per panel (trim, glue, bolt) and per m² (sand, fill, prime, paint). */
export const H_PIEZA = 0.3, H_M2_ACABADO = 7;
/** Electricity per printer-hour, kWh, and its price, €/kWh. */
export const KWH_HORA = 0.15, EUR_KWH = 0.2;
/** Paint, filler, primer, adhesive and bolts, € per m² of skin (estimate). */
export const EUR_M2_ACABADO = 25;

export interface CalculoImpresion {
  kgPiel: number; kgPlastico: number; piezas: number; horasImpresora: number; dias: number;
  eurMaterial: number; eurImpresoras: number; eurAcabado: number; eurLuz: number; eurTotal: number; horasPersona: number;
}
/** What a printed skin of `area` m² comes to, with `n` printers of a kind. */
export function calcular(area: number, plastico: IdPlastico, pared: IdPared, impresora: IdImpresora, n: number): CalculoImpresion {
  const p = PLASTICOS.find(x => x.id === plastico)!, w = PAREDES.find(x => x.id === pared)!, im = IMPRESORAS.find(x => x.id === impresora)!;
  // a pellet printer cannot lay a thin skin: its minimum wall is ≈ 5 mm of solid plastic
  const mm = impresora === 'pellets' ? Math.max(w.mmEquiv, 5) : w.mmEquiv;
  const kgPiel = area * p.rho * mm * (1 + EXTRA_UNIONES);
  const kgPlastico = kgPiel * (1 + EXTRA_DESPERDICIO);
  const piezas = Math.max(1, Math.ceil(area / ((im.cama / 1000) ** 2 * APROVECHAMIENTO_CAMA)));
  const horasImpresora = kgPlastico * 1000 / im.gh;
  const maquinas = impresora === 'pellets' ? 1 : Math.max(1, n);
  const dias = horasImpresora / maquinas / 20;   // 20 h of printing a day per machine (changes, failures)
  const eurMaterial = impresora === 'pellets' ? kgPlastico * EUR_KG_SERVICIO_PELLETS : kgPlastico * p.eurKg;
  const eurImpresoras = impresora === 'pellets' ? 0 : im.eur * maquinas;
  const eurAcabado = area * EUR_M2_ACABADO;
  const eurLuz = impresora === 'pellets' ? 0 : horasImpresora * KWH_HORA * EUR_KWH;
  const horasPersona = piezas * H_PIEZA + area * H_M2_ACABADO * (impresora === 'pellets' ? 1.6 : 1);   // pellet prints need heavy sanding
  return { kgPiel, kgPlastico, piezas, horasImpresora, dias, eurMaterial, eurImpresoras, eurAcabado, eurLuz, eurTotal: eurMaterial + eurImpresoras + eurAcabado + eurLuz, horasPersona };
}

/** Four ways to get the skin, for the comparison chart. Built per m² so they scale with the design's own skin. */
export interface Ruta { id: string; nombre: string; corto: string; que: string; kgM2: number; eurM2: number; eurFijo: number; hM2: number; repetible: string; pros: string[]; contras: string[] }
export const RUTAS: Ruta[] = [
  { id: 'impresa', nombre: 'Impresa en ASA (sándwich), sin más', corto: 'Impresa', que: 'Paneles impresos en sándwich, pegados y atornillados entre sí por bridas, lijados y pintados.',
    kgM2: 1.07 * (0.8 + 0.8 + 0.64) * (1 + EXTRA_UNIONES), eurM2: 1.07 * 2.24 * 1.15 * 1.1 * 28 + EUR_M2_ACABADO, eurFijo: 4 * 1200, hM2: H_M2_ACABADO + 0.3 / ((0.35 ** 2) * APROVECHAMIENTO_CAMA),
    repetible: 'Cada unidad se vuelve a imprimir: igual de lenta la décima que la primera.', pros: ['Sin moldes: se cambia la forma y se reimprime', 'Un golpe se arregla reimprimiendo un panel', 'Se puede empezar mañana en casa'], contras: ['Cientos de uniones: horas de pegar y lijar', 'El plástico impreso es menos rígido y menos resistente que la fibra', 'Se dilata con el calor 6–8 veces más que el acero'] },
  { id: 'impresa-vidrio', nombre: 'Impresa + una capa de vidrio por fuera', corto: 'Impresa + vidrio', que: 'Lo mismo, con una capa de tejido de vidrio de 200 g/m² laminada por fuera: tapa las uniones, da rigidez, protege del sol y de los golpes.',
    kgM2: 1.07 * 2.24 * 1.15 + 0.45, eurM2: 1.07 * 2.24 * 1.15 * 1.1 * 28 + EUR_M2_ACABADO + 14, eurFijo: 4 * 1200, hM2: H_M2_ACABADO + 0.3 / ((0.35 ** 2) * APROVECHAMIENTO_CAMA) + 2,
    repetible: 'Igual que la impresa, más el laminado.', pros: ['Las uniones dejan de ser puntos débiles', 'Superficie lisa para pintar', 'Sigue sin moldes'], contras: ['Más horas de taller', 'Ya no se reimprime un panel suelto: se repara como la fibra'] },
  { id: 'macho', nombre: 'Macho impreso → molde → piel de vidrio', corto: 'Macho impreso', que: 'Se imprime la forma (el «macho») en PLA, se lija perfecta, se saca un molde de fibra y en el molde se laminan las pieles. Es como se hacen hoy cascos de barco con impresoras grandes.',
    kgM2: 3.7, eurM2: 1.24 * 2.0 * 1.1 * 20 + 25 * 1.5 + 58, eurFijo: 4 * 1200, hM2: 8 + 4 + 4,
    repetible: 'El molde da muchas pieles iguales: es el camino a la serie.', pros: ['La piel es de fibra: la más resistente', 'El molde sirve para muchas unidades', 'Acabado de coche'], contras: ['La primera unidad es la más lenta y cara', 'Cambiar la forma = otro macho y otro molde'] },
  { id: 'taller', nombre: 'Encargo a un taller de composite', corto: 'Taller', que: 'Un taller español hace macho, molde y la primera carrocería en vidrio a partir del 3D (la ruta a medida de «Compras»): de 22.000 a 47.000 € según la estimación de esa página, aquí el punto medio.',
    kgM2: 3.2, eurM2: 0, eurFijo: 34500, hM2: 0.5,
    repetible: 'El taller guarda el molde: más unidades a menor precio.', pros: ['Sin trabajo propio', 'Calidad de profesional'], contras: ['El más caro para una unidad', 'Plazos del taller', 'Cambiar la forma cuesta otro molde'] },
];
/** One route for `area` m²: kg of skin, € of the first unit (with the printers), hours of a person. */
export const ruta = (r: Ruta, area: number) => ({ kg: r.kgM2 * area, eur: r.eurM2 * area + r.eurFijo, horas: r.hM2 * area });

/** Thermal expansion, 1/K: why the printed skin must float on the frame. */
export const DILATACION = { asa: 95e-6, petg: 60e-6, acero: 12e-6, aluminio: 23e-6 };
/** mm a skin of `largo` m grows more than a steel frame over `dT` °C. */
export const holguraDilatacion = (largo: number, dT = 40, plastico: keyof typeof DILATACION = 'asa', chasis: keyof typeof DILATACION = 'acero') =>
  largo * 1000 * dT * (DILATACION[plastico] - DILATACION[chasis]);

export const CHASIS: { nombre: string; que: string; pros: string; contras: string }[] = [
  { nombre: 'Tubo de acero cromoly soldado (TIG)', que: 'Como un cuadro de bicicleta de carga o de un velomóvil de tubo: 25–30 mm, pared de 1–1,5 mm.', pros: 'Se calcula con fórmulas de libro, se repara soldando, aguanta la fatiga.', contras: 'Hay que protegerlo de la corrosión dentro de la carrocería.' },
  { nombre: 'Tubo de acero con uniones soldadas en latón (brazing)', que: 'La técnica de los cuadros de bicicleta artesanos: menos calor, menos deformación.', pros: 'Se hace con un soplete en un taller pequeño.', contras: 'Más lento; las uniones necesitan práctica.' },
  { nombre: 'Tubo de aluminio 6061', que: 'Más grueso para la misma rigidez, ≈ un tercio menos de peso.', pros: 'No se oxida.', contras: 'Soldado pierde resistencia si no se vuelve a tratar (T6); fatiga.' },
  { nombre: 'Uniones atornilladas con abrazaderas (prototipo)', que: 'Tubos cortados y unidos con piezas de acero o de impresión rígida y tornillos.', pros: 'Se monta, se mide y se cambia sin soldar: ideal para el prototipo 0.', contras: 'Más peso y holguras: no para la versión final.' },
];

export const DISENO: string[] = [
  'La carrocería no aguanta nada: todo el peso, los golpes y los anclajes van al chasis de tubo. La piel es la forma y la protección de la lluvia y el viento.',
  'Se sujeta al chasis en 8–12 puntos con tacos de goma y agujeros alargados: la piel tiene que poder dilatarse sin romper ni deformarse.',
  'Cortar la forma en paneles por líneas que tengan sentido (las aristas, el borde de la cúpula, las puertas), con una brida de 15–20 mm por dentro en cada unión para pegar (epoxi o metacrilato) y atornillar.',
  'Las capas de la impresión son el punto débil: orientar cada panel para que las capas vayan a lo largo, no a través de donde se dobla.',
  'Colores claros: una carrocería negra al sol de verano pasa de 70 °C en la superficie.',
  'Las ventanas, aparte: policarbonato termoformado o placa doblada, no impresas (no salen transparentes).',
  'Acabado: lijar las uniones, masilla, imprimación y pintura, o vinilo. Si se lamina una capa de vidrio por fuera, las uniones desaparecen.',
];

export const RIESGOS: string[] = [
  'Un golpe fuerte puede abrir el plástico por una capa y dejar un borde que corta: en una bicicleta con carrocería, el que va dentro y el peatón están cerca. La capa de vidrio por fuera o un borde de goma lo reducen.',
  'El plástico impreso fluye con el tiempo bajo carga y calor (se deforma despacio): por eso no debe sostener nada.',
  'La norma de las bicicletas de pedaleo asistido (EN 15194) no habla de carrocerías; que una carrocería así encaje como bicicleta está por confirmar con la consulta escrita a la DGT de la estrategia del proyecto bicicleta.',
];

export interface FuenteImpresion { titulo: string; url: string; sobre: string }
export const FUENTES_IMPRESION: FuenteImpresion[] = [
  { titulo: 'Local Motors Strati (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Strati_(automobile)', sobre: 'coche con carrocería y chasis impresos (2014)' },
  { titulo: 'LSEV: the world’s first mass-produced 3D printed car (Polymaker)', url: 'https://polymaker.com/lsev-worlds-first-mass-produced-3d-printed-car/', sobre: 'XEV: microcoche eléctrico con piezas exteriores impresas' },
  { titulo: 'World’s first fully 3D printed kayak took 1,012 hours to make (Softpedia)', url: 'https://news.softpedia.com/news/World-s-First-Fully-3D-Printed-Kayak-Took-1012-Hours-to-Make-42-Days-As-It-Were-Video-432849.shtml', sobre: 'kayak de 28 bloques impresos: tiempo de impresora de un objeto grande' },
  { titulo: 'Large-format AM speeds plug production for composite boat molds (CompositesWorld)', url: 'https://compositesworld.com/articles/large-format-am-speeds-plug-production-for-manufacture-of-composite-boat-molds', sobre: 'machos impresos para moldes de fibra' },
  { titulo: 'Thermwood 3D prints large boat hull pattern (CompositesWorld)', url: 'https://compositesworld.com/articles/thermwood-3d-prints-large-boat-hull-pattern', sobre: 'casco de barco impreso como macho' },
  { titulo: 'Facet V1 Velomobile (Instructables)', url: 'https://www.instructables.com/Facet-V1-Velomobile', sobre: 'velomóvil casero' },
  { titulo: 'The Radius T T velomobile (Hackaday)', url: 'https://hackaday.com/2014/07/20/the-radius-t-t-velomobile', sobre: 'velomóvil casero' },
  { titulo: 'PLA vs PETG vs ASA: best filament for outdoor use (JLC3DP)', url: 'https://jlc3dp.com/blog/best-3d-printing-filament-outdoor-use', sobre: 'plásticos al sol' },
  { titulo: 'ASA vs PETG: a comprehensive comparison (Wevolver)', url: 'https://www.wevolver.com/article/asa-vs-petg-a-comprehensive-comparison-and-guide', sobre: 'ASA frente a PETG' },
  { titulo: 'PETG temperature resistance: heat limits (Wevolver)', url: 'https://www.wevolver.com/article/petg-temperature-resistance-heat-limits-and-practical-insights-for-engineers', sobre: 'PETG con calor' },
  { titulo: 'How to split and join large 3D prints (DigiKey Maker.io)', url: 'https://www.digikey.com/en/maker/blogs/2024/how-to-split-and-join-large-3d-prints', sobre: 'cortar y unir piezas grandes' },
  { titulo: 'Los mejores servicios de impresión 3D de gran formato (All3DP)', url: 'https://all3dp.com/es/2/servicio-impresion-3d-gran-escala-gran-formato/', sobre: 'servicios de gran formato' },
  { titulo: 'BigRep Pellex 750: pellets a hasta 4 kg/h (All3DP)', url: 'https://all3dp.com/es/4/pellex-750-bigrep-lleva-los-pellets-a-la-impresion-3d-de-gran-formato-con-hasta-4-kg-h/', sobre: 'velocidad de impresión con pellets' },
];
export const FECHA_IMPRESION = '27-11-2026';
