// The parts of the vehicle (2026-11-24): their names, which parts of the mass list they are, which of the 3D's layers show
// them, where their options come from and which design field holds the favourite. The running gear's four first
// (Eugenio: «en rodaje, añade las diferentes partes … que se comporte como un elemento en sí»), then, the same day, the rest of
// the departments' (his «haz lo mismo … para el resto de elemento del vehículo»). Data only (no React): `PanelSubsistema.tsx` draws it.
import type { CapaId } from '../visor/capas';
import type { DepTriciclo } from '../triciclo/campos';
import type { IdSub } from './tipos';
import { GRUPOS_MOTOR } from '../piezasMotor';

export interface Subsistema {
  id: IdSub;
  /** the department tab it lives under */
  dep: DepTriciclo;
  nombre: string;
  /** «Mostrar solo …» */
  solo: string;
  lema: string;
  /** the parts of the mass list (by name) that are this one: the weight and the price in the header read them */
  piezas: RegExp;
  /** the 3D's layers that hold it (`visor/capas.ts`): the page shows these and hides every other */
  capas: CapaId[];
  /**
   * Finer, for parts that share their layers with others (the mirrors, the solar panels and the doors are meshes inside the
   * body's layers, the dashboard and the seats inside the cabin's): only the meshes whose `userData.componente` is one of these
   * (`visor/partes3d.ts`, `visor/fichaSolo.ts`). Without it, every mesh of `capas` is shown.
   */
  componentes?: string[];
  /**
   * Where its options come from. `catalogo`: a list the project already has (the steering's study, the brakes', the wheels', the
   * motor makers'), each with a published or estimated mass and price; the star writes `campo`. `modelo`: the options the page
   * already offers for a design field (`SELECTORES_TRICICLO`); their mass and price are what the model says with each one.
   */
  origen: 'catalogo' | 'modelo';
  /** catalogue parts: the design field that holds the favourite (the wheels have one per axle) */
  campo?: string | { del: string; tras: string };
  /** model parts: the keys of `SELECTORES_TRICICLO` that are this part's decisions */
  selectores?: string[];
  /** the model's own checks (`Resultados.comprobaciones`, by name) that speak of this part, shown next to its options */
  comprobaciones: RegExp;
  /** only some designs have the part (the petrol engine only in the plug-in hybrid) */
  visible?: (P: Record<string, unknown>) => boolean;
  /** what «no favourite» means for this part, when it is not «the project's own estimate» (the reduction gear: none at all) */
  medida?: string;
}

/** The name of each department's TAB: since 2026-11-27 the body's tab is «Chasis y carrocería» and carries the frame too (`pestanaDe`). */
export const NOMBRE_DEP: Record<DepTriciclo, string> = { carroceria: 'Chasis y carrocería', interior: 'Interior', chasis: 'Chasis', rodaje: 'Rodaje', propulsion: 'Motor', energia: 'Batería' };
/** «Partes del rodaje», «Las cuatro partes del motor»… */
export const DE_DEP: Record<DepTriciclo, string> = { carroceria: 'del chasis y la carrocería', interior: 'del interior', chasis: 'del chasis', rodaje: 'del rodaje', propulsion: 'del motor', energia: 'de la batería' };

/** The 3D tags of the motor layer's meshes that belong to these groups of `piezasMotor.ts` (the registry the «Mostrar solo el motor» list reads). */
const delGrupo = (...ids: string[]) => GRUPOS_MOTOR.filter(g => ids.includes(g.id)).flatMap(g => g.componentes);

/**
 * What the page says when the design has none of the part drawn (`Visor3D` `alVacia`): «Este diseño no lleva …», with the
 * part's name and, where the plain sentence would mislead, its own words. Keyed by the entry's id.
 */
export const SIN_PIEZA: Partial<Record<IdSub, string>> = {
  frenos: 'Los frenos de este diseño no están dibujados en el 3D (las ruedas con motor de buje no los llevan dibujados aún); sus opciones, su peso y su precio sí cuentan en la lista.',
  reductora: 'Este diseño no lleva reductora dibujada: el motor de buje mueve la rueda directamente, y solo el híbrido enchufable (con motor central) lleva engranajes.',
  termico: 'Este diseño no lleva motor de gasolina: solo el híbrido enchufable lo tiene.',
  salpicadero: 'Este diseño no lleva salpicadero dibujado con el mando elegido.',
  acabado: 'Este diseño no lleva acabado interior: elige forro, molduras o consola en las opciones de esta parte y aparecerá.',
};

export const SUBSISTEMAS: Subsistema[] = [
  // ── Rodaje
  { id: 'ruedas', dep: 'rodaje', nombre: 'Ruedas', solo: 'las ruedas', lema: 'neumático, llanta y radios: lo único que toca el suelo', piezas: /^Ruedas?\b/, capas: ['ruedas'], componentes: ['rueda'], origen: 'catalogo', campo: { del: 'tRuedaDel', tras: 'tRuedaTras' }, comprobaciones: /^(Neumáticos|Llantas)|rueda/i },
  { id: 'frenos', dep: 'rodaje', nombre: 'Frenos', solo: 'los frenos', lema: 'parar el vehículo, en las cuatro ruedas', piezas: /^Frenos/, capas: ['ruedas'], componentes: ['frenos'], origen: 'catalogo', campo: 'tBiciFreno', comprobaciones: /^Frenada|freno/i },
  { id: 'direccion', dep: 'rodaje', nombre: 'Dirección', solo: 'la dirección', lema: 'las dos ruedas de delante giran con un solo mando', piezas: /^Dirección/, capas: ['direccion', 'ruedas'], origen: 'catalogo', campo: 'tDirOpc', comprobaciones: /giro|dirección|volante|manillar/i },
  { id: 'suspension', dep: 'rodaje', nombre: 'Suspensión', solo: 'la suspensión', lema: 'brazos, manguetas y amortiguadores de cada esquina', piezas: /^(Suspensión|Basculante y)/, capas: ['suspension', 'ruedas'], origen: 'catalogo', campo: 'tBiciSusp', comprobaciones: /^Bajos al suelo|suspensi/i },
  // ── Motor (the powertrain: one 3D layer for all of it, so each part shows its meshes by tag: the groups of `piezasMotor.ts`)
  { id: 'motor', dep: 'propulsion', nombre: 'Motor eléctrico', solo: 'el motor', lema: 'el que mueve el vehículo: en el buje de la rueda o central, con su potencia y su par', piezas: /^(Motor(es)? de buje|Motor eléctrico central)/, capas: ['motor'], componentes: delGrupo('electrico'), origen: 'catalogo', campo: 'tCatMotor', comprobaciones: /^(Motor|MG2|Tensión|El .+ ya lleva)/ },
  { id: 'controlador', dep: 'propulsion', nombre: 'Controlador', solo: 'el motor', lema: 'la electrónica que da al motor la corriente que le pide el acelerador', piezas: /^Controlador/, capas: ['motor'], componentes: delGrupo('controlador'), origen: 'catalogo', campo: 'tCatCtrl', comprobaciones: /^(Controlador|Tensión|El .+ ya lleva)/ },
  { id: 'reductora', dep: 'propulsion', nombre: 'Reductora', solo: 'el motor', lema: 'el engranaje que baja las vueltas del motor central hasta la rueda (el motor de buje no la lleva)', piezas: /^Motor: reductora/, capas: ['motor'], componentes: delGrupo('transmision'), origen: 'catalogo', campo: 'tCatReductora', comprobaciones: /^(Reductora|Velocidad a las rpm|Motor central)/, medida: 'sin reductora (el motor de buje no la lleva)' },
  { id: 'termico', dep: 'propulsion', nombre: 'Motor de gasolina', solo: 'el motor', lema: 'solo en el híbrido enchufable: el que carga la batería y ayuda a mover el vehículo', piezas: /^(Motor de gasolina|Depósito)/, capas: ['motor'], componentes: delGrupo('bloque', 'generador', 'deposito', 'refrigeracion', 'lubricacion', 'escape', 'admision'), origen: 'catalogo', campo: 'tCatTermico', comprobaciones: /gasolina|térmico|Depósito/i, visible: P => P.tPropulsion === 'phev' },
  // ── Carrocería (the options are the page's own choices: material, shape, glazing, solar roof, doors, mirrors)
  { id: 'carenado', dep: 'carroceria', nombre: 'Carrocería', solo: 'la carrocería', lema: 'la piel exterior y los carenados de las ruedas: de qué material y con qué forma de morro y cola', piezas: /^(Carrocería|Carenados y brazos)/, capas: ['carenado'], componentes: ['carroceria'], origen: 'modelo', selectores: ['tMatCarenado', 'tCubierta', 'tColaCorte', 'tConAleta'], comprobaciones: /^(Neumático delantero dentro de su carenado|Carenado delantero|Rueda trasera dentro de la cola)/ },
  { id: 'cristales', dep: 'carroceria', nombre: 'Cúpula', solo: 'los cristales', lema: 'el cristal que cubre la cabina: con montantes o de una pieza', piezas: /^Cúpula/, capas: ['cristales'], componentes: ['cupula', 'cristal-puerta', 'cristal-maletero'], origen: 'modelo', selectores: ['tVentanas'], comprobaciones: /^Cabeza del (piloto|pasajero) a la cúpula/ },
  { id: 'solar', dep: 'carroceria', nombre: 'Paneles solares', solo: 'los paneles solares', lema: 'la energía que el techo recoge: solo en la cúpula, en el morro o hasta la punta de la cola', piezas: /^Paneles solares/, capas: ['carenado', 'cristales'], componentes: ['solar'], origen: 'modelo', selectores: ['tSolarCola', 'tSolarMorro'], comprobaciones: /solar|panel/i },
  { id: 'accesos', dep: 'carroceria', nombre: 'Puertas y maletero', solo: 'la carrocería', lema: 'cómo se entra y cómo se carga: cúpula que se abre o puertas, tapa o portón', piezas: /^(Puertas|Portón|Montantes B y C)/, capas: ['carenado', 'cristales'], componentes: ['puertas', 'maletero', 'cristal-puerta', 'cristal-maletero'], origen: 'modelo', selectores: ['tAcceso', 'tMaletero', 'tPuertas2'], comprobaciones: /^(Puerta|Segunda puerta|Maletero)/ },
  { id: 'retrovisores', dep: 'carroceria', nombre: 'Retrovisores', solo: 'la carrocería', lema: 'cámaras en cápsulas o espejos de gota', piezas: /^Retrovisores/, capas: ['carenado'], componentes: ['retrovisores'], origen: 'modelo', selectores: ['tRetrovisores'], comprobaciones: /retrovisor/i },
  { id: 'luces', dep: 'carroceria', nombre: 'Luces', solo: 'la carrocería', lema: 'el faro del morro: sin faro, uno redondo como el de una moto o una barra de luz por todo el borde', piezas: /^(Faro|Barra de luz)/, capas: ['carenado'], componentes: ['luces'], origen: 'modelo', selectores: ['tFaro'], comprobaciones: /(?!)/ },
  // ── Interior
  { id: 'asientos', dep: 'interior', nombre: 'Asientos', solo: 'los asientos', lema: 'cuántos y de qué tipo, su tapicería y los cinturones', piezas: /^(Asientos|Cinturones|Tapicería)/, capas: ['asientos'], componentes: ['asientos'], origen: 'modelo', selectores: ['tAsientos', 'tTapiz', 'tCostura', 'tCinturon'], comprobaciones: /^(Cabeza|Hombros|Caderas|Rodillas|Pies|Respaldo|Asiento)/ },
  { id: 'mandos', dep: 'interior', nombre: 'Mando', solo: 'el interior', lema: 'con qué se conduce: manillar de moto o volante en una columna', piezas: /^Volante y columna/, capas: ['asientos'], componentes: ['mandos'], origen: 'modelo', selectores: ['tMando'], comprobaciones: /^(Manos del piloto|Manillar|Volante|Vientre del piloto al volante|Rodillas del piloto al volante)/ },
  { id: 'salpicadero', dep: 'interior', nombre: 'Salpicadero', solo: 'el interior', lema: 'la pantallita sobre el depósito, un salpicadero de lado a lado o el blanco con detalles', piezas: /^Salpicadero/, capas: ['asientos'], componentes: ['salpicadero'], origen: 'modelo', selectores: ['tSalpicadero'], comprobaciones: /salpicadero/i },
  { id: 'acabado', dep: 'interior', nombre: 'Acabado interior', solo: 'el interior', lema: 'el forro, las molduras, la consola del techo, la luz ambiente y el reposabrazos', piezas: /^Interior:/, capas: ['asientos', 'carenado'], componentes: ['acabado'], origen: 'modelo', selectores: ['tAcabado', 'tForroColor', 'tMoldura', 'tConsolaTecho', 'tAmbiente', 'tConsolaCentral'], comprobaciones: /(?!)/ },
  // ── Batería
  { id: 'bateria', dep: 'energia', nombre: 'Batería', solo: 'la batería', lema: 'la energía que lleva: cuánta, de qué densidad y dónde va colocada', piezas: /^Batería/, capas: ['baterias'], origen: 'modelo', selectores: ['tBatDisp'], comprobaciones: /^Batería/ },
  // ── Chasis
  { id: 'bastidor', dep: 'chasis', nombre: 'Bastidor', solo: 'el chasis', lema: 'los tubos sobre los que va todo lo demás: de qué material y hasta dónde llegan los largueros', piezas: /^Bastidor/, capas: ['chasis'], origen: 'modelo', selectores: ['tChMat', 'tChLargo'], comprobaciones: /^Bastidor/ },
];

export const subsistema = (id: IdSub) => SUBSISTEMAS.find(s => s.id === id)!;
export const esSub = (v: unknown): v is IdSub => SUBSISTEMAS.some(s => s.id === v);
/** The parts of a department that this design has, in the order they are shown. */
export const partesDe = (dep: string, P: object) => SUBSISTEMAS.filter(s => s.dep === dep && (!s.visible || s.visible(P as Record<string, unknown>)));
/**
 * (2026-11-27, Eugenio: «fusionen esas dos partes del menú, chasis y carrocería… ponlas en un mismo link y vamos a trabajar
 * como si fuesen una cosa sola») one tab for two departments. The departments stay two inside (every mass line, check,
 * section, price and record keeps its `dep`): only the tabs are merged. `pestanaDe` says which tab shows a department,
 * `depsDePestana` which departments a tab shows, in order.
 */
export const DEPS_DE_PESTANA: Partial<Record<string, string[]>> = { carroceria: ['carroceria', 'chasis'] };
export const depsDePestana = (tab: string) => DEPS_DE_PESTANA[tab] ?? [tab];
export const pestanaDe = (dep: string) => Object.entries(DEPS_DE_PESTANA).find(([, ds]) => ds!.includes(dep))?.[0] ?? dep;
/** The tabs of the Triciclo family that have parts, in the menu's order. */
export const PESTANAS_CON_PARTES = ['carroceria', 'interior', 'rodaje', 'propulsion', 'energia'];
/** The parts a TAB shows in its row: those of every department it carries. */
export const partesDePestana = (tab: string, P: object) => depsDePestana(tab).flatMap(d => partesDe(d, P));
/** Does the department have parts (a row of them under its tab)? */
export const tieneSub = (dep: string) => SUBSISTEMAS.some(s => s.dep === dep);
