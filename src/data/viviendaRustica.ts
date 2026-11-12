// ============================================================================
// LAND PRICES AND ECOLOGICAL HOMES ON RURAL LAND (2026-11-12, Eugenio)
// ============================================================================
// «Añade la regulación de los precios del suelo y la venta del precio urbano
// urbanizable regulado para que no haya especulación con pasar de precios
// rústicos a urbanos urbanizables. Y también la introducción de las viviendas
// ecológicas en terrenos rústicos que fomenten la regeneración […] como máximo se
// puede edificar el 10 % en viviendas de la superficie y otro 10 % en usos
// productivos, y el otro 80 % tiene que ser dedicado a la vegetación […] multas
// graves para quien no cumpla con esa parte de plantación de árboles mínima, y
// habrá formación y asesoramiento sobre cómo plantar, y ayudas a la plantación.»
//
// Source ids point into FUENTES_VIVIENDA (vivienda.ts). Every figure marked
// «propuesta» is ours, for Eugenio to confirm; none of it is law today.

// ── LAND TODAY ──────────────────────────────────────────────────────────────
export const SUELO_HOY = {
  /** Average farmland price 2024, €/ha, and dry arable land (mapa-tierra). */
  tierraMediaHa: 10_248,
  secanoHa: 7_239,
  /** Average urban land price, end of 2025, €/m² (suelo-urbano). */
  urbanoM2: 171,
  /** Share of buildability ceded to the town hall today: 5–15 %, up to 20 % (ley-suelo, art. 18.1.b). */
  cesionMin: 5, cesionMax: 15, cesionTope: 20,
};
/** Dry arable land in €/m² (10.000 m² per hectare). */
export const SECANO_M2 = SUELO_HOY.secanoHa / 10_000;
export const SALTO = SUELO_HOY.urbanoM2 / SECANO_M2;

/** The three kinds of land, in plain words. */
export const CLASES_SUELO: { t: string; d: string }[] = [
  { t: 'Rústico', d: 'Campo: cultivos, pastos, monte. No se puede urbanizar. La ley estatal lo llama «suelo rural».' },
  { t: 'Urbanizable', d: 'Campo que el plan del municipio marca para convertirlo en ciudad. Todavía no tiene calles ni redes.' },
  { t: 'Urbano', d: 'Ya es ciudad: tiene calles, agua, luz y alcantarillado, o está ocupado por edificios.' },
];

// ── THE PROPOSAL FOR LAND ──────────────────────────────────────────────────
/** Fixed margin over rural value plus urbanisation cost (propuesta). */
export const MARGEN_SUELO = 0.1;
/** Price cap per m² of reclassified land until it is built: urbanisation counts only if the seller did it. */
export function precioTope(rusticoM2: number, urbanizarM2: number, urbanizado: boolean) {
  return (rusticoM2 + (urbanizado ? urbanizarM2 : 0)) * (1 + MARGEN_SUELO);
}

/** The essentials, shown first. */
export const SUELO_PROPUESTA: { t: string; d: string }[] = [
  { t: 'Precio tope hasta que se construye', d: 'Cuando un campo pasa a urbanizable, toda venta y toda reventa de ese suelo tiene un precio máximo, hasta que se construye: valor rústico + un margen fijo del 10 %. Así nadie revende con la subida.' },
  { t: 'Urbanizar se paga, especular no', d: 'El coste de urbanizar (calles, agua, luz) solo se suma al precio si quien vende ha urbanizado de verdad, con la obra terminada y recibida.' },
  { t: 'La subida es de todos', d: 'Lo que vale de más el suelo ya urbanizado va a la escala que recalifica (municipio o región) y se dedica a vivienda pública. En cada venta, la escala puede comprar primero a ese precio.' },
];
/** The detail, in a «Más». */
export const SUELO_PROPUESTA_MAS: { t: string; d: string }[] = [
  { t: 'Quién fija el precio', d: 'La región publica cada año el valor del suelo rústico de cada comarca, calculado por lo que produce (como manda hoy la ley para las expropiaciones), y el coste medio de urbanizar.' },
  { t: 'Quién vigila', d: 'El notario y el registro de la propiedad no inscriben una venta por encima del precio tope. La región revisa las operaciones y publica la lista.' },
  { t: 'Qué pasa si se hace trampa', d: 'Una venta por encima del tope no vale. Quien la cobra devuelve el exceso y paga una multa igual a ese exceso. Quien firma una recalificación a cambio de algo responde ante la justicia.' },
];

// ── ECOLOGICAL HOMES ON RURAL LAND ─────────────────────────────────────────
/** Eugenio's split of a rural plot: at most 10 % homes, at most 10 % productive uses, at least 80 % vegetation. */
export const REPARTO_FINCA = { vivienda: 0.1, productivo: 0.1, vegetacion: 0.8 };
/** Minimum trees per hectare of vegetation (propuesta; Eugenio confirms the figure). */
export const ARBOLES_HA = 200;

export const RUSTICA_REGLAS: { t: string; d: string }[] = [
  { t: 'Se puede vivir en el campo si se planta', d: 'Se permite hacer una vivienda ecológica en una finca rústica si la finca se convierte en bosque de alimentos: árboles y plantas que den comida o biomasa (leña, madera, abono) y que retengan agua.' },
  { t: '10 %, 10 %, 80 %', d: 'Como máximo, un 10 % de la finca para viviendas y otro 10 % para usos productivos (obrador, almacén, corral, invernadero). El 80 % restante, vegetación.' },
  { t: 'Materiales que vuelven a la tierra', d: 'Madera, tierra, paja, piedra, cal, corcho: materiales no invasivos, biodegradables y ecológicos. Se evita el plástico y los componentes electrónicos que no hagan falta.' },
  { t: 'Energía renovable', d: 'La casa se abastece con renovables: placas solares, biomasa de la propia finca, agua de lluvia.' },
  { t: 'Nada de basura en la finca', d: 'Prohibido acumular residuos o hacer un vertedero propio. Se multa.' },
  { t: 'Agricultura regenerativa', d: 'Sin arar a fondo, con el suelo siempre cubierto, compost y variedad de especies, en vez de un solo cereal.' },
];

export const RUSTICA_APOYOS: { t: string; d: string }[] = [
  { t: 'Licencia más fácil', d: 'Hoy una casa en suelo rústico es una excepción: la ley estatal reserva ese suelo al campo y al monte, y cada comunidad pone sus condiciones. Con la propuesta, si el proyecto cumple las reglas, la licencia se da en semanas, con una ficha tipo y la oficina técnica comarcal que ayuda a hacerla.' },
  { t: 'Formación y asesoramiento', d: 'Cursos gratis sobre cómo plantar, qué especies van bien en cada clima y cómo retener el agua, y un técnico que visita la finca el primer año.' },
  { t: 'Ayudas a la plantación', d: 'Planta de vivero y ayuda para el riego de los primeros años, pagadas con el tercio para producir de la provincia y la región.' },
  { t: 'Caminos asfaltados', d: 'Ayudas para asfaltar el camino de acceso y mejorar el firme hasta las fincas que se conviertan en bosque de alimentos en vez de campo de cereal, para que se pueda vivir allí todo el año.' },
];

export const RUSTICA_VIGILANCIA: { t: string; d: string }[] = [
  { t: 'Quién vigila', d: 'La oficina técnica comarcal revisa la finca al año, a los tres y a los cinco, y después cada cinco años. Se apoya en fotos de satélite para ver si los árboles crecen.' },
  { t: 'Si no se planta el mínimo', d: 'Multa grave. Propuesta: tres veces lo que cuesta plantar y cuidar los árboles que faltan, y un plazo para hacerlo. Si no se cumple, se retira la licencia de la vivienda.' },
  { t: 'Agricultura regenerativa y obra limpia', d: 'En cada visita, la oficina comarcal mira que el suelo esté cubierto y que no se are a fondo, y en la obra, que no se use plástico ni electrónica que no haga falta. Propuesta: la primera vez, aviso y plazo para corregirlo; si no, multa del doble de lo que cueste corregirlo, y en la obra, retirar lo puesto.' },
  { t: 'Si hay basura o vertedero', d: 'Multa, y la obligación de limpiar. Si se repite, multa grave.' },
  { t: 'Si se edifica de más', d: 'Lo que pasa del 10 % se derriba a cargo del dueño, como hoy cualquier obra ilegal.' },
];

// ── WHAT IS STILL OPEN ─────────────────────────────────────────────────────
export const RUSTICA_RETOS: { t: string; d: string }[] = [
  { t: 'El asfalto no deja pasar el agua', d: 'Asfaltar un camino lo impermeabiliza, justo lo contrario de retener agua. La ayuda cubre el asfalto, como pidió Eugenio; recomendamos ofrecer además, como opción, firmes permeables (tierra estabilizada, zahorra compactada o adoquín con junta verde) donde la pendiente lo permita, y cunetas que lleven el agua a la finca.' },
  { t: 'Que no se llene el campo de casas sueltas', d: 'Una casa en cada finca dispersa los pueblos: más coches, más caminos y más servicios que pagar. Hay que fijar un tamaño mínimo de finca, o un tope de metros por vivienda: en 10 hectáreas, el 10 % son 10.000 m².' },
  { t: 'Incendios', d: 'Casas dentro del bosque son casas en riesgo, y bomberos que tienen que defenderlas. Hacen falta franjas sin vegetación alrededor de cada casa, especies que ardan menos cerca de ella y un acceso para camiones.' },
  { t: 'Agua, luz y basura en casas aisladas', d: 'Llevar redes a cada finca es caro. La propuesta pide que la casa se abastezca sola (renovables, lluvia, depuración natural), pero la recogida de residuos y las urgencias siguen costando más.' },
  { t: 'Comprobar que se planta de verdad', d: 'Plantar es fácil; que los árboles sigan vivos a los diez años, no. La vigilancia por satélite y las visitas tienen un coste para la comarca que aún no está calculado.' },
  { t: 'El suelo es de las comunidades', d: 'Hoy el urbanismo y el suelo rústico los regula cada comunidad autónoma. Esta regla común necesitaría una ley estatal nueva o que cada región la adopte.' },
  { t: 'El precio regulado y el impuesto único', d: 'Que la subida del suelo vaya a la escala funciona como la cesión del 5 al 15 % de hoy, ampliada. Hay que dejar claro que es una condición de la recalificación y no un segundo impuesto.' },
  { t: 'Cómo paga la casa', d: 'Una casa en una finca rústica paga como cualquier otra: tramo básico (10 %) si es donde se vive, secundario (20 %) si es una segunda vivienda. Un 10 % de la superficie para vivienda no debe servir para hacer casas de fin de semana en el monte.' },
];
