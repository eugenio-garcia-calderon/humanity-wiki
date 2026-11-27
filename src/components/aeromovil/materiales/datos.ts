/**
 * «Materiales y estructura» (2026-11-27, Eugenio: «Extrae el conocimiento de Internet sobre cuándo utilizar y en qué partes del
 * vehículo una fibra u otra… y también un poco comparativa a la hora de hacer el chasis de fibra completa o hacer un híbrido entre
 * los metales y la fibra, que creo que va por ahí la solución para el aeromóvil. carbono, vidrio, aramida o lino… compara tema de
 * peso, tema de seguridad, tema de economía, y vamos haciendo ahí unas gráficas»).
 *
 * THE SECTION AS DATA. Pure module (no React): `scripts/materiales.ts` imports it in Node.
 *
 * Honesty rules, the same as `compras/`:
 * - The material figures are the typical values of the technical literature for a woven 0/90 laminate laid by hand and vacuum
 *   bagged (fibre volume 45–50 %), not a datasheet of a product we picked. Each comes as a range [min, max] and a middle value the
 *   charts use. Before cutting a mould, ask for the datasheet of the exact fabric and resin.
 * - Prices are estimates for buying small quantities in Europe (a prototype), not quotes: no shop page was opened for them.
 * - The web pages in `FUENTES` were found with the search engine and read from their title only (`leida: false`): they say where
 *   to check, not that it was checked.
 */

export type IdMaterial = 'carbono' | 'vidrio' | 'aramida' | 'lino' | 'aluminio' | 'acero';
export type Rango = [number, number];

export interface Material {
  id: IdMaterial;
  nombre: string;
  corto: string;
  fibra: boolean;
  /** the laminate (or the metal sheet): bending stiffness E in GPa and density in g/cm³ */
  E: Rango; e: number;
  rho: number;
  /** fibre mass fraction of the laminate (the rest is resin); 1 for a metal */
  wf: number;
  /** € per kg of dry fabric (or of metal sheet), small quantities */
  eurKg: Rango; eur: number;
  /** energy absorbed per kg when a tube is crushed end-on, kJ/kg (crash boxes) */
  sea: Rango; seaMedio: number;
  /** kg of CO₂ per kg of fibre (or metal) made, cradle to gate */
  co2: Rango; co2Medio: number;
  /** how it breaks, in one sentence */
  rotura: string;
  usar: string[];
  evitar: string[];
  ojo?: string;
}

/** The resin of every laminate: epoxy, small quantities. */
export const RESINA = { nombre: 'Epoxi de laminado', eurKg: [15, 30] as Rango, eur: 22, co2: 6, co2Rango: [4, 8] as Rango, rho: 1.15 };

export const MATERIALES: Material[] = [
  {
    id: 'carbono', nombre: 'Fibra de carbono', corto: 'Carbono', fibra: true,
    E: [50, 70], e: 60, rho: 1.5, wf: 0.61,
    eurKg: [60, 110], eur: 85,
    sea: [40, 100], seaMedio: 70,
    co2: [20, 40], co2Medio: 25,
    rotura: 'Se rompe de golpe, sin avisar, en astillas que cortan; un golpe puede dañarla por dentro sin que se vea por fuera.',
    usar: ['Donde manda la rigidez por kilo: el suelo y los largueros de la bañera, el borde de las puertas, el marco de la cúpula.',
      'Tubos y brazos rectos (tubo comprado, no laminado por nosotros).', 'Tiras de refuerzo dentro de una pieza de vidrio o lino: poco carbono, donde hace falta.'],
    evitar: ['Pegada a aluminio sin una capa de vidrio en medio (corrosión galvánica).', 'Cerca de la batería sin aislar: conduce la electricidad.',
      'Donde rozan piedras o el suelo sin otra capa encima.'],
    ojo: 'Es la que más energía absorbe por kilo al aplastarse, pero solo si el tubo está diseñado para romperse de forma progresiva (con un chaflán que inicia la rotura) y se ha ensayado.',
  },
  {
    id: 'vidrio', nombre: 'Fibra de vidrio (E)', corto: 'Vidrio', fibra: true,
    E: [17, 24], e: 20, rho: 1.85, wf: 0.645,
    eurKg: [8, 20], eur: 12,
    sea: [30, 70], seaMedio: 50,
    co2: [1.5, 3], co2Medio: 2,
    rotura: 'Se agrieta y blanquea donde se ha dañado: el daño se ve; aguanta golpes mejor que el carbono.',
    usar: ['La piel del prototipo entera: barata, fácil, se repara en cualquier taller.', 'La capa que separa el carbono del aluminio (no conduce).',
      'Carenados de las ruedas, bajos y todo lo que recibe piedras.', 'Las pieles de un sándwich cuando el presupuesto no da para carbono.'],
    evitar: ['Piezas donde cada kilo cuenta y se puede pagar carbono: pesa casi el doble para la misma rigidez.'],
  },
  {
    id: 'aramida', nombre: 'Aramida (Kevlar, Twaron)', corto: 'Aramida', fibra: true,
    E: [24, 32], e: 28, rho: 1.32, wf: 0.556,
    eurKg: [120, 220], eur: 160,
    sea: [25, 60], seaMedio: 35,
    co2: [10, 30], co2Medio: 20,
    rotura: 'No se parte: se dobla y se deshilacha como una tela; para lo que atraviesa (una astilla, una piedra) y mantiene la pieza en una.',
    usar: ['Una capa por dentro de la bañera y de las puertas: que nada la atraviese y que el carbono roto no entre en la cabina.',
      'Bajos y zonas que pueden recibir un golpe punzante.', 'Mezclada con carbono en el mismo tejido (híbrido carbono-aramida) en zonas de impacto.'],
    evitar: ['Piezas que trabajan a compresión o flexión fuerte: aguanta poco a compresión.', 'Al sol sin pintura (la luz ultravioleta la degrada) y sin sellar (absorbe agua).',
      'Piezas que haya que lijar o mecanizar: se deshilacha y necesita herramientas especiales.'],
  },
  {
    id: 'lino', nombre: 'Fibra de lino', corto: 'Lino', fibra: true,
    E: [8, 14], e: 10, rho: 1.3, wf: 0.516,
    eurKg: [30, 70], eur: 45,
    sea: [15, 45], seaMedio: 30,
    co2: [0.4, 1.5], co2Medio: 0.9,
    rotura: 'Frágil como el vidrio pero menos fuerte; amortigua las vibraciones y el ruido mejor que ninguna.',
    usar: ['Paneles exteriores que no aguantan el coche: capó, cola, tapas, puertas por fuera.', 'Paneles interiores y salpicadero: quita vibraciones y ruido.',
      'Donde se quiere enseñar la fibra y contar que es un material de origen vegetal.'],
    evitar: ['La estructura que protege a los ocupantes: es la menos resistente de las cuatro.', 'Sin sellar: absorbe humedad y se hincha.',
      'Pensar que es la barata: comprado en poca cantidad cuesta como el carbono por metro cuadrado de panel.'],
    ojo: 'Su CO₂ es el más bajo, pero en un panel la resina pesa casi la mitad: el ahorro de CO₂ frente al vidrio es pequeño si la resina no es de origen vegetal.',
  },
  {
    id: 'aluminio', nombre: 'Aluminio (chapa, tubo 6061)', corto: 'Aluminio', fibra: false,
    E: [69, 70], e: 69, rho: 2.7, wf: 1,
    eurKg: [5, 9], eur: 7,
    sea: [15, 35], seaMedio: 25,
    co2: [8, 16], co2Medio: 12,
    rotura: 'Se dobla en pliegues ordenados antes de romperse: avisa, y lo que se dobló se ve y se cambia.',
    usar: ['Las cajas de choque atornilladas delante y detrás (se cambian después de un golpe).', 'Subchasis donde se anclan suspensión, dirección y motor.',
      'Insertos pegados dentro de la fibra para atornillar.'],
    evitar: ['Tocando carbono directamente (corrosión galvánica).', 'Soldar tubo 6061-T6 sin volver a tratarlo: junto a la soldadura pierde cerca de la mitad de su resistencia.'],
    ojo: 'El CO₂ es del aluminio nuevo; el reciclado emite una fracción de eso.',
  },
  {
    id: 'acero', nombre: 'Acero (cromoly 4130)', corto: 'Acero', fibra: false,
    E: [205, 210], e: 205, rho: 7.85, wf: 1,
    eurKg: [1.5, 6], eur: 3,
    sea: [10, 25], seaMedio: 17,
    co2: [1.5, 2.5], co2Medio: 2,
    rotura: 'El más previsible: se deforma mucho antes de romper, se calcula con fórmulas de libro y se repara soldando.',
    usar: ['El arco antivuelco y los pilares de la cúpula.', 'El bastidor de tubo del primer prototipo: barato, se suelda en cualquier taller.', 'Anclajes de cinturones y asientos.'],
    evitar: ['Pieles y paneles: pesa más del doble que cualquier fibra para la misma rigidez.'],
  },
];

export const material = (id: IdMaterial) => MATERIALES.find(m => m.id === id)!;

// ── The equal panel: what each material weighs, costs and emits for the same bending stiffness ──────────────────────────────
/** The reference: a 2 mm glass skin, the usual body panel of a small kit car or velomobile. */
export const PANEL_REF = { material: 'vidrio' as IdMaterial, espesor: 2 };

export interface Panel {
  id: IdMaterial;
  /** mm, kg/m², €/m² and kg CO₂/m², middle values */
  espesor: number; kg: number; eur: number; co2: number;
  /** €/m² and CO₂ at the ends of the price and CO₂ ranges */
  eurRango: Rango; co2Rango: Rango;
}

/**
 * Same bending stiffness means same E·t³, so t = t_ref · (E_ref / E)^(1/3); mass = ρ · t. The fabric's price and CO₂ apply to the
 * fibre's share of that mass and the resin's to the rest. A minimum-thickness rule is NOT applied: a carbon skin thinner than
 * ≈ 0,6 mm (two plies) breaks with a stone, whatever the sum says.
 */
export function panelIgual(m: Material, E = m.e): Panel {
  const ref = material(PANEL_REF.material), t = PANEL_REF.espesor * Math.cbrt(ref.e / E), kg = m.rho * t;
  const fibra = kg * m.wf, resina = kg - fibra;
  const eur = (pf: number, pr: number) => fibra * pf + resina * pr, co2 = (cf: number, cr: number) => fibra * cf + resina * cr;
  return {
    id: m.id, espesor: t, kg, eur: eur(m.eur, RESINA.eur), co2: co2(m.co2Medio, RESINA.co2),
    eurRango: [eur(m.eurKg[0], RESINA.eurKg[0]), eur(m.eurKg[1], RESINA.eurKg[1])],
    co2Rango: [co2(m.co2[0], RESINA.co2Rango[0]), co2(m.co2[1], RESINA.co2Rango[1])],
  };
}
export const PANELES = MATERIALES.map(m => panelIgual(m));

// ── Which material where ────────────────────────────────────────────────────────────────────────────────────────────────────
export interface Zona { zona: string; trabajo: string; primera: string; alternativa: string; no: string }
export const ZONAS: Zona[] = [
  { zona: 'Bañera y suelo (la célula de los ocupantes)', trabajo: 'no deformarse, que nada entre, rigidez a torsión',
    primera: 'Sándwich: pieles de vidrio y núcleo de espuma de 10–20 mm; tiras de carbono en los largueros del suelo; una capa de aramida por dentro',
    alternativa: 'Pieles de carbono si hay presupuesto (la bañera pesa ≈ un tercio menos)', no: 'Lino solo; aramida como material principal' },
  { zona: 'Morro y cola (zonas de choque)', trabajo: 'aplastarse poco a poco y absorber la energía antes de que llegue a la bañera',
    primera: 'Cajas de choque de aluminio atornilladas a la bañera: se cambian después de un golpe', alternativa: 'Tubos de carbono o vidrio con chaflán de inicio de rotura (ensayados)',
    no: 'Aramida (aguanta poco a compresión) o lino' },
  { zona: 'Arco antivuelco y pilares de la cúpula', trabajo: 'aguantar el coche entero boca abajo',
    primera: 'Tubo de acero cromoly 4130 doblado, con su anclaje a la bañera', alternativa: 'Tubo de carbono comprado (no laminado por nosotros)', no: 'Solo la piel de fibra' },
  { zona: 'Anclajes: suspensión, dirección, motor, cinturones, asientos', trabajo: 'llevar fuerzas grandes a un punto',
    primera: 'Subchasis o insertos de metal pegados y atornillados a la fibra', alternativa: 'Refuerzos locales de carbono con casquillos metálicos', no: 'Tornillos en la fibra sin inserto' },
  { zona: 'Piel exterior superior: capó, cola, puertas por fuera', trabajo: 'la forma aerodinámica; casi no lleva carga',
    primera: 'Lino (o lino con una capa de carbono, la «carbono-lino» del selector de la carrocería)', alternativa: 'Vidrio: lo más barato y fácil de reparar', no: 'Aluminio o acero: pesan más del doble' },
  { zona: 'Carenados de las ruedas y sus brazos', trabajo: 'piedras, golpes de bordillo, vibración',
    primera: 'Vidrio, con lino si se quiere menos vibración; los brazos de tubo metálico', alternativa: 'Carbono con una capa de aramida', no: 'Carbono solo: se astilla con una piedra' },
  { zona: 'Bajos y fondo plano', trabajo: 'roce con el suelo y piedras',
    primera: 'Vidrio con una capa de aramida', alternativa: 'Panel de aluminio atornillado, fácil de cambiar', no: 'Carbono a la vista' },
  { zona: 'Caja de la batería', trabajo: 'aislar la electricidad y aguantar un fuego',
    primera: 'Vidrio (no conduce) con resina resistente al fuego, o caja de aluminio', alternativa: 'Basalto', no: 'Carbono sin aislar: conduce y puede provocar un cortocircuito' },
  { zona: 'Interior: salpicadero, paneles de puertas', trabajo: 'aspecto, ruido, vibración', primera: 'Lino', alternativa: 'Vidrio forrado', no: '—' },
  { zona: 'Cúpula', trabajo: 'que se vea a través', primera: 'Policarbonato (no es una fibra)', alternativa: 'Vidrio laminado si la homologación lo pide en el parabrisas', no: '—' },
];

// ── Chassis architectures ───────────────────────────────────────────────────────────────────────────────────────────────────
export type IdArquitectura = 'acero-vidrio' | 'aluminio-lino' | 'hibrido-vidrio' | 'hibrido-carbono' | 'monocasco-vidrio' | 'monocasco-carbono';
export type Criterio = 'peso' | 'seguridad' | 'prototipo' | 'serie' | 'taller' | 'reparar' | 'co2';
export const CRITERIOS: { id: Criterio; nombre: string; que: string }[] = [
  { id: 'peso', nombre: 'Peso', que: 'cuánto pesan estructura y piel juntas (5 = la más ligera)' },
  { id: 'seguridad', nombre: 'Seguridad', que: 'protege la cabina, absorbe el choque y se comporta como se calculó, sin ensayos caros (5 = la más segura)' },
  { id: 'prototipo', nombre: 'Coste del prototipo', que: 'materiales y moldes de una unidad (5 = la más barata)' },
  { id: 'serie', nombre: 'Coste en serie', que: 'por unidad, a unos cientos al año (5 = la más barata)' },
  { id: 'taller', nombre: 'Hacerlo nosotros', que: 'que lo pueda hacer un taller pequeño sin autoclave ni ingeniería de cálculo de compuestos (5 = lo más fácil)' },
  { id: 'reparar', nombre: 'Reparación', que: 'que un golpe se arregle sin tirar la estructura (5 = lo más fácil)' },
  { id: 'co2', nombre: 'CO₂', que: 'lo que emite fabricar sus materiales (5 = lo que menos)' },
];

export interface Arquitectura {
  id: IdArquitectura;
  nombre: string;
  corto: string;
  que: string;
  /** structure + skin of a 3,6–4,0 m two-seat tandem quadricycle, kg: estimate, see `comoMasa` */
  masa: Rango;
  comoMasa: string;
  /** materials and moulds for ONE unit, thousands of €, without labour */
  prototipo: Rango;
  /** workshop hours for one unit */
  horas: Rango;
  notas: Record<Criterio, 1 | 2 | 3 | 4 | 5>;
  ejemplos: string[];
  pros: string[];
  contras: string[];
}

export const ARQUITECTURAS: Arquitectura[] = [
  {
    id: 'acero-vidrio', nombre: 'Bastidor de tubo de acero + piel de vidrio', corto: 'Acero + vidrio',
    que: 'Una jaula de tubo soldado lleva todas las cargas; la piel de vidrio solo da la forma. Es lo que hay hoy en el diseño (el bastidor de tubos dentro de la carrocería).',
    masa: [55, 75], comoMasa: '≈ 25 m de tubo de 30 × 1,5 mm (1,05 kg/m) + uniones ≈ 30 kg; piel de 12 m² a 2,5–3,5 kg/m²',
    prototipo: [3, 5], horas: [200, 350],
    notas: { peso: 2, seguridad: 4, prototipo: 5, serie: 5, taller: 5, reparar: 5, co2: 4 },
    ejemplos: ['Kit cars y buggies', 'Muchos cuadriciclos ligeros', 'Coches de Shell Eco-marathon de primer año'],
    pros: ['Lo más barato y lo más rápido de hacer.', 'Se calcula con fórmulas de libro y se repara soldando.', 'El arco antivuelco sale del mismo bastidor.'],
    contras: ['La más pesada: la piel no trabaja y aun así pesa.', 'Hay que oxidar-proteger el acero dentro de la piel.'],
  },
  {
    id: 'aluminio-lino', nombre: 'Bastidor de tubo de aluminio + piel de lino o vidrio', corto: 'Aluminio + lino',
    que: 'Lo mismo con tubo de aluminio, más grueso para tener la misma rigidez, y una piel más ligera.',
    masa: [45, 62], comoMasa: 'el bastidor pesa ≈ 2/3 del de acero para la misma rigidez (≈ 20 kg); piel de lino ≈ 2,4–3,3 kg/m²',
    prototipo: [4, 7], horas: [220, 380],
    notas: { peso: 3, seguridad: 3, prototipo: 4, serie: 4, taller: 3, reparar: 3, co2: 3 },
    ejemplos: ['Lotus Elise: bañera de aluminio pegada y paneles de compuesto (según los titulares encontrados)', 'Velomóviles con cuadro de aluminio'],
    pros: ['10–15 kg menos que el acero.', 'No se oxida.'],
    contras: ['La soldadura le quita resistencia si no se vuelve a tratar (o se pega, como la Elise).', 'Fatiga: el aluminio no tiene un límite por debajo del cual dure siempre.'],
  },
  {
    id: 'hibrido-vidrio', nombre: 'Híbrido: bañera de sándwich de vidrio + subchasis de metal', corto: 'Híbrido (vidrio)',
    que: 'La célula de los ocupantes es una bañera de sándwich (pieles de vidrio, núcleo de espuma) que trabaja; delante y detrás, dos subchasis de tubo donde se anclan ruedas, dirección y motor, con cajas de choque de aluminio atornilladas. La parte de arriba de la piel no lleva carga.',
    masa: [40, 52], comoMasa: 'bañera ≈ 5 m² a ≈ 3 kg/m² = 15 kg; dos subchasis ≈ 10–14 kg; arco ≈ 4 kg; piel superior ≈ 7 m² a ≈ 2 kg/m²',
    prototipo: [5, 9], horas: [300, 500],
    notas: { peso: 4, seguridad: 5, prototipo: 3, serie: 4, taller: 3, reparar: 4, co2: 4 },
    ejemplos: ['BMW i3: célula de pasajeros de carbono sobre un módulo de aluminio (según los titulares encontrados)', 'Coches de carreras: bañera de fibra con subchasis de tubo'],
    pros: ['El metal está donde las cargas se concentran y donde se dan los golpes: se cambia o se suelda.', 'La fibra está donde se ahorra peso: la piel grande que trabaja.',
      'La bañera se puede pasar a carbono más adelante con el mismo molde.'],
    contras: ['Dos técnicas a la vez (soldar y laminar) y la unión pegada metal-fibra, que hay que ensayar.', 'Hace falta un molde de la bañera.'],
  },
  {
    id: 'hibrido-carbono', nombre: 'Híbrido: bañera de sándwich de carbono + subchasis de metal', corto: 'Híbrido (carbono)',
    que: 'El mismo esquema con pieles de carbono en la bañera y una capa de aramida por dentro, y capas de vidrio donde la fibra toca el aluminio.',
    masa: [34, 45], comoMasa: 'la bañera baja a ≈ 9–10 kg; el resto como el híbrido de vidrio',
    prototipo: [7, 13], horas: [320, 520],
    notas: { peso: 5, seguridad: 5, prototipo: 2, serie: 3, taller: 2, reparar: 4, co2: 3 },
    ejemplos: ['BMW i3 (célula de carbono, módulo de aluminio)', 'Volkswagen XL1: monocasco de carbono con piezas de aluminio (según los titulares encontrados)'],
    pros: ['Casi tan ligera como el monocasco de carbono, con los golpes en el metal.'],
    contras: ['El carbono se rompe sin avisar: la bañera necesita cálculo de compuestos.', 'Corrosión galvánica en cada unión con aluminio si no se aísla.'],
  },
  {
    id: 'monocasco-vidrio', nombre: 'Monocasco de sándwich de vidrio (todo de fibra)', corto: 'Monocasco vidrio',
    que: 'La piel entera es la estructura: sándwich en todo el coche, metal solo en insertos y en el arco.',
    masa: [42, 55], comoMasa: '12 m² a ≈ 3,2 kg/m² + insertos y refuerzos ≈ 6 kg',
    prototipo: [5, 9], horas: [300, 500],
    notas: { peso: 3, seguridad: 3, prototipo: 3, serie: 4, taller: 3, reparar: 2, co2: 4 },
    ejemplos: ['Velomóviles de vidrio (Quest, en su versión de vidrio)', 'Muchos barcos'],
    pros: ['Sin soldaduras: una pieza.', 'Barato de material.'],
    contras: ['Un golpe fuerte daña la estructura, no un panel.', 'Las zonas de choque hay que diseñarlas en fibra y ensayarlas.'],
  },
  {
    id: 'monocasco-carbono', nombre: 'Monocasco de carbono (todo de fibra)', corto: 'Monocasco carbono',
    que: 'La piel entera es la estructura, de carbono: la opción más ligera.',
    masa: [25, 35], comoMasa: '12 m² a ≈ 2 kg/m² (pieles de carbono de 0,6 mm y núcleo) + insertos ≈ 5 kg',
    prototipo: [10, 22], horas: [350, 600],
    notas: { peso: 5, seguridad: 3, prototipo: 1, serie: 1, taller: 1, reparar: 1, co2: 1 },
    ejemplos: ['Volkswagen XL1 (monocasco de carbono)', 'Velomóviles de carbono', 'Aptera: carrocería-estructura de compuesto («BinC», según los titulares encontrados)'],
    pros: ['La más ligera: unos 35 kg menos que el bastidor de acero con piel de vidrio (comparando el centro de las dos horquillas).', 'La que más energía absorbe por kilo, bien diseñada.'],
    contras: ['La más cara de material y de moldes, y lenta de fabricar en serie.', 'Necesita cálculo por elementos finitos y ensayos de choque propios.',
      'Un golpe puede dañarla sin que se vea; repararla es de especialista.'],
  },
];

/** What the project recommends, in the green box. */
export const RECOMENDACION = {
  titulo: 'Sí: el híbrido para el vehículo de serie; para el primer prototipo, el bastidor de tubo',
  frases: [
    'Prototipo 1: bastidor de tubo (el de hoy) con piel de vidrio, o de vidrio y lino donde no hay carga. Es lo más barato y lo más rápido, y sirve para probar la forma y la mecánica.',
    'Prototipo 2 y serie: bañera de sándwich de vidrio con tiras de carbono y una capa de aramida por dentro, subchasis de tubo delante y detrás con cajas de choque de aluminio atornilladas, y arco antivuelco de cromoly. Pesa ≈ 15–25 kg menos que el bastidor de acero y cuesta una fracción del monocasco de carbono.',
    'La bañera de carbono se deja para cuando haya dinero: el mismo molde sirve, y es el paso que más peso quita.',
    'Cada unión de carbono con aluminio lleva una capa de vidrio en medio y tornillería de acero inoxidable o titanio.',
  ],
};

// ── Joining metal and fibre ─────────────────────────────────────────────────────────────────────────────────────────────────
export const UNIONES: { titulo: string; texto: string }[] = [
  { titulo: 'Corrosión galvánica', texto: 'El carbono conduce la electricidad y, con agua, hace de pila con el aluminio: el aluminio se come. Una capa de vidrio (o un velo aislante) entre los dos, sellante en los bordes y tornillos de acero inoxidable o titanio. El vidrio, el lino y la aramida no conducen.' },
  { titulo: 'Pegar mejor que atornillar', texto: 'Un adhesivo estructural (epoxi o metacrilato) reparte la carga por toda la superficie; un tornillo la concentra en un agujero, que en la fibra es un punto débil. Donde haya tornillo, un inserto metálico pegado.' },
  { titulo: 'Se dilatan distinto', texto: 'El aluminio se dilata con el calor mucho más que el carbono: una unión pegada larga entre los dos trabaja en cada cambio de temperatura. Uniones cortas o un adhesivo flexible.' },
];

// ── Safety ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const SEGURIDAD: string[] = [
  'Los cuadriciclos se homologan sin un ensayo de choque como el de los coches; cuando Euro NCAP chocó varios por su cuenta, los resultados fueron malos. La estructura es lo único que protege: hay que diseñarla como si el ensayo existiera.',
  'Tres trabajos distintos, mejor de materiales distintos: una célula que no se deforme ni deje entrar nada (sándwich con aramida por dentro), unas zonas delante y detrás que se aplasten poco a poco (cajas de choque de metal o tubos de fibra ensayados) y un arco que aguante el vuelco (tubo de acero).',
  'El carbono absorbe más energía por kilo que el metal, pero solo con una forma y un inicio de rotura bien diseñados; el metal se dobla de forma previsible aunque el diseño no sea perfecto. Sin presupuesto para ensayos, el metal en las zonas de choque es lo prudente.',
  'Un golpe al carbono puede dejar una delaminación dentro que no se ve: después de un golpe, la estructura de carbono se inspecciona (con ultrasonidos o golpeando con una moneda y escuchando).',
];

// ── Sources (seen in the search engine only) ────────────────────────────────────────────────────────────────────────────────
export interface Fuente { titulo: string; url: string; sobre: string; leida: false }
export const FUENTES: Fuente[] = [
  { titulo: 'Materials & Processes: Fibers for composites (CompositesWorld)', url: 'https://compositesworld.com/articles/the-fiber', sobre: 'propiedades de las fibras', leida: false },
  { titulo: 'TMM4175: fibers (NTNU)', url: 'https://folk.ntnu.no/nilspv/TMM4175/fibers.html', sobre: 'tabla de propiedades de carbono, vidrio, aramida', leida: false },
  { titulo: 'Crashworthiness Assessment of Carbon/Glass Epoxy Hybrid Composite Tubes Subjected to Axial Loads', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9572766/', sobre: 'energía absorbida al aplastar tubos', leida: false },
  { titulo: 'Experimental and Numerical Assessment of Crashworthiness: a review (Univ. de Bolonia, 2025)', url: 'https://cris.unibo.it/bitstream/11585/1004971/1/2025-Experimental%20and%20Numerical%20Assessment%20of%20Crashworthiness-A%20review.pdf', sobre: 'revisión de absorción de choque', leida: false },
  { titulo: 'Strain rate effects on the energy absorption of rapidly manufactured composite tubes (ORNL)', url: 'https://www.ornl.gov/publication/strain-rate-effects-energy-absorption-rapidly-manufactured-composite-tubes', sobre: 'tubos de compuesto en choque', leida: false },
  { titulo: 'Under the skin: how natural fibres are providing an alternative to carbonfibre (Autocar)', url: 'https://www.autocar.co.uk/node/105609', sobre: 'lino en coches', leida: false },
  { titulo: 'Bcomp ampliTex fabric is incorporated into bus A/C panels (CompositesWorld)', url: 'https://compositesworld.com/news/bcomp-amplitex-fabric-is-incorporated-into-bus-ac-panels', sobre: 'tejidos de lino técnicos', leida: false },
  { titulo: 'Life cycle assessment of natural and synthetic fibre composites (J. Manuf. Mater. Process., 2019)', url: 'https://www.mdpi.com/2504-4494/3/4/92', sobre: 'CO₂ de fabricar cada fibra', leida: false },
  { titulo: 'Sustainability of natural fibres as reinforcements (Univ. de Plymouth)', url: 'https://plymouth.ac.uk/research/materials-and-structures-research-group/sustainability-of-natural-fibres-as-reinforcements-for-polymer-matrix-composites-2007-2011', sobre: 'CO₂ y energía del lino', leida: false },
  { titulo: 'Galvanic Corrosion: Carbon Fiber and Aluminum (Composite Envisions)', url: 'https://compositeenvisions.com/wp-content/uploads/2022/10/Galvanic-Corrosion-Carbon-Fiber-and-Aluminum.pdf', sobre: 'corrosión carbono-aluminio', leida: false },
  { titulo: 'What is Galvanic Corrosion? How is it prevented? (Dark Aero)', url: 'https://darkaero.com/knowledge/composites/what-is-galvanic-corrosion', sobre: 'cómo aislar carbono y metal', leida: false },
  { titulo: 'Lotus is light (Gardner)', url: 'https://www.gardnerweb.com/articles/lotus-is-light', sobre: 'estructura de la Lotus Elise', leida: false },
  { titulo: 'BMW: carbon fiber for affordable lightweight vehicle design? (PlasticsToday)', url: 'https://www.plasticstoday.com/plastics-processing/bmw-carbon-fiber-for-affordable-lightweight-vehicle-design-', sobre: 'célula de carbono del BMW i3', leida: false },
  { titulo: 'Body structures (European Aluminium, Aluminium Automotive Manual)', url: 'https://european-aluminium.eu/wp-content/uploads/2022/11/1_aam_body-structures.pdf', sobre: 'estructuras de aluminio: espaciotubular, chapa', leida: false },
  { titulo: 'The XL1 (Volkswagen Newsroom)', url: 'https://www.volkswagen-newsroom.com/en/the-xl1-3163', sobre: 'monocasco de carbono del XL1', leida: false },
  { titulo: 'Lightweight handcrafted hybrid heavy on CFRP, aluminum (PlasticsToday)', url: 'https://www.plasticstoday.com/plastics-processing/lightweight-handcrafted-hybrid-heavy-on-cfrp-aluminum', sobre: 'XL1: carbono y aluminio', leida: false },
  { titulo: 'What is Aptera’s body made of? (Aptera)', url: 'https://aptera.us/article/what-is-apteras-body-made-of/', sobre: 'carrocería-estructura del Aptera', leida: false },
  { titulo: 'Aptera reveals first composite production parts for BinC vehicle (CompositesWorld)', url: 'https://compositesworld.com/news/aptera-reveals-first-composite-production-parts-for-binc-vehicle', sobre: 'Aptera «BinC»', leida: false },
  { titulo: 'Quest: technische gegevens (Velomobiel.nl)', url: 'https://en.velomobiel.nl/quest/technische_gegevens.php', sobre: 'velomóvil de carbono o de vidrio', leida: false },
  { titulo: 'Euro NCAP’s Spotlight Falls on Heavy Quadricycles (Euro NCAP)', url: 'https://www.euroncap.com/nl/pers/persberichten/euro-ncap-s-spotlight-falls-on-heavy-quadricycles', sobre: 'choque de cuadriciclos pesados', leida: false },
  { titulo: 'Quadricycle safety ‘way below’ cars says EuroNCAP (ETSC)', url: 'https://etsc.eu/quadricycle-safety-way-below-cars-says-euroncap/', sobre: 'seguridad de los cuadriciclos', leida: false },
  { titulo: 'Aramid fiber pricing (ChemAnalyst)', url: 'https://chemanalyst.com/Pricing-data/aramid-fiber-1616', sobre: 'precio de la aramida', leida: false },
  { titulo: 'Carbon Fibre Prices, Trend, Chart (IMARC)', url: 'https://www.imarcgroup.com/carbon-fibre-pricing-report', sobre: 'precio de la fibra de carbono', leida: false },
];

export const FECHA = '27-11-2026';

/** The weighted score of an architecture for some importances (0–3 each). 0–100. */
export function puntuacion(a: Arquitectura, importancia: Partial<Record<Criterio, number>>): number {
  const total = CRITERIOS.reduce((s, c) => s + (importancia[c.id] ?? 0), 0);
  if (!total) return 0;
  return Math.round(CRITERIOS.reduce((s, c) => s + (importancia[c.id] ?? 0) * (a.notas[c.id] - 1) / 4, 0) / total * 100);
}
/** Ready-made importances: the page opens with the first one. */
export const PRESETS: { id: string; nombre: string; que: string; importancia: Record<Criterio, number> }[] = [
  { id: 'equilibrio', nombre: 'Ultraligero y económico', que: 'el objetivo del proyecto: peso y seguridad primero, el coste después', importancia: { peso: 3, seguridad: 3, prototipo: 2, serie: 2, taller: 2, reparar: 1, co2: 1 } },
  { id: 'prototipo', nombre: 'Primer prototipo', que: 'hacerlo ya, con poco dinero y en un taller pequeño', importancia: { peso: 1, seguridad: 3, prototipo: 3, serie: 0, taller: 3, reparar: 1, co2: 0 } },
  { id: 'serie', nombre: 'Vehículo de serie', que: 'cientos al año: peso, seguridad, coste por unidad y reparar en cualquier taller', importancia: { peso: 3, seguridad: 3, prototipo: 0, serie: 3, taller: 0, reparar: 2, co2: 2 } },
];
export const IMPORTANCIA_INICIAL = PRESETS[0].importancia;
