import type { Parametros } from '../geometria';
import type { ExplicacionParametro, Explicaciones } from './tipos';
import { EXPLICACIONES as BALA } from './bala';

// ============================================================================
// Explicaciones de los deslizadores del Triciclo Bala (2026-11-10)
// ============================================================================
// Eugenio: «permite modificar todo lo que se permitía modificar en el
// Apterike… y la reclinación del asiento». Los valores de serie son los de
// TRICICLO_DEFECTO (geometria.ts). El Triciclo es un diseño propio: nada de él
// se ha medido; las masas son estimaciones de piezas de su clase, y lo dicen.
// Las de la forma que no hablan de las ruedas son las del Cuadriciclo (la
// carrocería es la misma); las demás se reescriben, porque aquí las ruedas
// van en otro sitio.

const C = {
  vuelco: 'Vuelco: aceleración lateral que lo tumba',
  cabezaPil: 'Cabeza del piloto a la cúpula',
  cabezaPas: 'Cabeza del pasajero a la cúpula',
  alcance: 'Manos del piloto al manillar (alcance)',
  respaldo: 'Respaldo del piloto al vientre del pasajero',
  neumatico: 'Neumático delantero dentro de su carenado',
  girado: 'Carenado delantero a la carrocería, girado',
  recto: 'Carenado delantero a la carrocería, recto',
  trasera: 'Rueda trasera dentro de la cola',
  bastidor: 'Bastidor dentro de la carrocería',
  seguridad: 'Bastidor: coeficiente de seguridad de los largueros',
  bateria: 'Batería dentro de la carrocería',
};
const t = (k: string) => ('t' + k.slice(1)) as keyof Parametros;
/** La del Cuadriciclo para el mismo deslizador, con sus enlaces pasados a los del Triciclo. */
const desdeBala = (k: keyof Parametros, cambios: Partial<ExplicacionParametro> = {}): ExplicacionParametro => {
  const b = BALA[k]!;
  return { ...b, relacionados: b.relacionados.map(r => (String(r).startsWith('b') ? t(String(r)) : r)), comprobaciones: undefined, ...cambios };
};
const E = (nombre: string, queEs: string, porQueImporta: string, alto: [string[], string[]], bajo: [string[], string[]], relacionados: (keyof Parametros)[], comprobaciones?: string[], referencias: string[] = []): ExplicacionParametro =>
  ({ nombre, queEs, porQueImporta, masAlto: { ventajas: alto[0], desventajas: alto[1] }, masBajo: { ventajas: bajo[0], desventajas: bajo[1] }, referencias, relacionados, ...(comprobaciones ? { comprobaciones } : {}) });

export const EXPLICACIONES: Explicaciones = {
  // ── Carrocería: la forma del Cuadriciclo ────────────────────────────────────
  tCola: desdeBala('bCola'), tPuntaCola: desdeBala('bPuntaCola'), tSuelo: desdeBala('bSuelo', { comprobaciones: [C.bastidor, C.trasera] }),
  tPilY: desdeBala('bPilY', { comprobaciones: [C.cabezaPil, C.vuelco] }), tPasY: desdeBala('bPasY', { comprobaciones: [C.cabezaPas, C.vuelco] }),
  tAncho: E('Ancho de la carrocería', 'El ancho de la carrocería en su punto más ancho (m), sin los carenados de las ruedas delanteras, que van fuera sobre brazos.',
    'Es el sitio para los codos y las rodillas de los dos. La forma se ensancha o se estrecha entera; los carenados delanteros no se mueven con él (eso es la vía).',
    [['Más sitio para hombros, codos y rodillas.'], ['Más área frontal: más aire que empujar.', 'Los carenados, girados, quedan más cerca de la carrocería.']],
    [['Menos área frontal: gasta menos.'], ['Menos sitio dentro; el manillar se estrecha con ella.']], ['tVia', 'tGiro'], [C.girado, C.recto, 'Manillar dentro de la carrocería']),
  tMorro: E('Morro: del eje delantero a la punta', 'Lo que la carrocería sale por delante del eje de las ruedas delanteras (m). Se estira la punta; la cúpula no se mueve.',
    'Un morro largo y afilado abre el aire con más suavidad; uno corto acorta el vehículo. En el Triciclo el eje delantero va por detrás de donde el Cuadriciclo lleva su rueda delantera, así que este valor sale mayor que en el Cuadriciclo con la misma forma.',
    [['Entrada más suave para el aire.', 'Más sitio para la batería en el morro.'], ['Más largo y algo más pesado.']],
    [['Más corto: aparca mejor.'], ['La batería del morro tiene menos sitio.']], ['tPuntaMorro', 'tEjeDel'], [C.bateria]),
  tPuntaMorro: E('Morro: afilado de la punta', 'Lo afilado del cono del morro (sin unidad): más es más en punta.',
    'Cambia solo la punta, no lo largo. Una punta llena deja más sitio dentro; una en aguja es más vistosa, y en este túnel apenas cambia el Cd.',
    [['Aspecto de cohete.'], ['Menos sitio dentro de la punta.']], [['Más sitio dentro para la batería.'], ['Punta más roma, más zona de presión delante.']], ['tMorro']),
  tAleta: desdeBala('bAleta', { queEs: 'La altura de la punta de la aleta de cola sobre el suelo (m).', porQueImporta: 'La aleta ayuda a que el vehículo vaya recto con viento de lado, como la de un avión. Más alta, más efecto y más área expuesta al viento lateral.' }),
  tCupIni: E('Cúpula: dónde empieza a subir', 'Dónde empieza a levantarse la cúpula, medido desde el eje de las ruedas delanteras (m; negativo: por delante del eje).',
    'Una cúpula que empieza antes tiene el parabrisas más tumbado; una que empieza después lo tiene más empinado.',
    [['Parabrisas más empinado: algo más corto.'], ['Menos sitio para la cabeza del piloto si va inclinado hacia delante.']],
    [['Parabrisas más tumbado: entrada más suave del aire.'], ['Más cristal: más calor dentro y algo más de peso.']], ['tCupFin', 'tAlto'], [C.cabezaPil]),
  tCupFin: E('Cúpula: dónde acaba de bajar', 'Dónde termina de bajar la cúpula por detrás, medido desde el eje delantero (m). Al menos 25 cm por delante del eje trasero.',
    'La cúpula que baja más tarde deja más techo al pasajero, sobre todo si se reclina; la que baja antes alarga la cola de un solo trazo.',
    [['Más techo para el pasajero.'], ['La caída de la cola es más brusca.']], [['Caída más larga y suave.'], ['Menos techo sobre la cabeza del pasajero.']], ['tCupIni', 'tRecPas'], [C.cabezaPas]),
  tAlto: E('Alto total (techo de la cúpula)', 'La altura de lo más alto de la cúpula sobre el suelo (m).',
    'Es el techo de los dos. Más alto deja más holgura sobre las cabezas; más bajo reduce el área frontal y baja el centro de gravedad de la piel.',
    [['Más techo para la talla alta.'], ['Más área frontal; algo más de vuelco por la piel más alta.']], [['Menos aire que empujar.'], ['La talla alta roza antes; hay que reclinar.']], ['tRecPil', 'tRecPas', 'tPilY'], [C.cabezaPil, C.cabezaPas]),
  // ── Carrocería: carenados ───────────────────────────────────────────────
  tPodEsc: E('Carenado delantero: tamaño', 'El tamaño del carenado de cada rueda delantera, alrededor de su rueda (×1 es el dibujado para ella).',
    'Los carenados van fuera, al aire, y giran con las ruedas como en el Aptera. Uno más grande deja más holgura al neumático; uno más pequeño ofrece menos área frontal. Pequeño y a la vez estrecho o corto no se puede: el neumático dejaría de caber.',
    [['Más holgura al neumático.'], ['Más área frontal y más piel: más aire y algo más de masa.']], [['Menos área frontal.'], ['El neumático va más justo dentro.']], ['tPodAncho', 'tPodCola'], [C.neumatico, C.girado]),
  tPodAncho: E('Carenado delantero: anchura', 'La anchura del carenado delantero (× la dibujada).', 'Un carenado estrecho corta mejor el aire; uno ancho deja más sitio al neumático.',
    [['Más sitio al neumático.'], ['Más área frontal.']], [['Menos área frontal.'], ['El neumático, más justo.']], ['tPodEsc'], [C.neumatico]),
  tPodCola: E('Carenado delantero: largo de la cola', 'Lo que el carenado se alarga por detrás del eje de la rueda (× lo dibujado).',
    'Una cola larga cierra mejor la estela del carenado, pero al girar entra más hacia la carrocería.',
    [['Estela más pequeña detrás del carenado.'], ['Al girar, su cola se acerca más a la carrocería.']], [['Gira con más holgura.'], ['Estela más grande.']], ['tGiro', 'tVia'], [C.girado]),
  tBrazo: E('Brazo delantero: cuerda del carenado', 'La anchura, de delante a atrás, del carenado aerodinámico del brazo de arriba (m).',
    'Dentro van el brazo de la suspensión y la bieleta de la dirección. Más cuerda, más sitio dentro; menos, menos aire tocando.',
    [['Más sitio para la bieleta y el brazo.'], ['Más piel al aire.']], [['Menos piel y menos masa.'], ['Menos sitio dentro.']], ['tVia']),
  tRuedaDel: E('Ruedas delanteras (en los carenados)', 'El tamaño de las dos ruedas delanteras: 16″, 20″ o 24″ (diámetro exterior del neumático entre paréntesis). Neumático de 70 mm.',
    'Los carenados crecen con la rueda. Una rueda mayor pasa mejor los baches y gira más despacio, pero sube el carenado y su área frontal.',
    [['Pasa mejor baches y bordillos.'], ['Carenados más grandes: más área frontal y más masa.']], [['Carenados más pequeños.'], ['Más golpes en los baches.']], ['tPodEsc', 'tVia'], [C.neumatico, C.girado]),
  tRuedaTras: E('Rueda trasera (dentro de la cola)', 'El tamaño de la rueda trasera, con el motor en el buje: 20″, 24″ o 26″. Neumático de 80 mm.',
    'Va dentro de la cola; una más grande necesita más sitio al hundirse la suspensión.',
    [['Pasa mejor baches.'], ['Menos sitio en la cola.']], [['Más sitio en la cola.'], ['Más golpes.']], ['tRecTras', 'tBasculante'], [C.trasera]),
  tFaldon: E('Rueda trasera: faldón (cuánto asoma)','Cuánto tapa un faldón estrecho bajo la cola la parte de abajo de la rueda trasera: 0 sin faldón (asoma como en el Cuadriciclo), 1 hasta 4 cm del suelo.',
    'Tapar la rueda reduce el aire que remueve. El túnel no distingue cuánto asoma, así que su efecto en el Cd no se calcula aquí.',
    [['Menos rueda al aire.'], ['Roza antes en badenes y bordillos.']], [['Más altura bajo la cola.'], ['Más rueda al aire.']], ['tSuelo']),
  tEspCarenado: E('Espesor de la carrocería', 'El espesor del laminado de la carrocería y de los carenados (mm).', 'Más espesor, más rígida y más pesada; la masa sale de la superficie real de la piel.',
    [['Más rígida y resistente a golpes.'], ['Más masa.']], [['Menos masa.'], ['Más flexible; necesita refuerzos.']], ['tMatCarenado']),
  tEspCristal: E('Espesor de la cúpula (policarbonato)', 'El espesor del policarbonato de la cúpula (mm).', 'Pesa 1,2 kg por m² y mm. También entra en la holgura sobre las cabezas: se mide hasta la cara de dentro.',
    [['Más rígida y aislante.'], ['Más masa, y algo menos de techo.']], [['Menos masa.'], ['Más flexible y ruidosa.']], ['tAlto'], [C.cabezaPil, C.cabezaPas]),
  tMatCarenado: E('Material de la carrocería', 'Con qué se hace el laminado: carbono-lino (1,35 kg/m²·mm), fibra de vidrio (1,85) o fibra de carbono (1,55).', 'Cambia la masa de la piel y de los carenados.',
    [['El carbono es el más rígido.'], ['El carbono es el más caro.']], [['La fibra de vidrio es la más barata.'], ['La fibra de vidrio es la más pesada.']], ['tEspCarenado']),
  // ── Interior ─────────────────────────────────────────────────────────────
  tPilX: E('Piloto: cadera al eje delantero', 'Dónde va la cadera del piloto, detrás del eje de las ruedas delanteras (m). Su sillín, sus plataformas y su respaldo van con él.',
    'Más cerca del eje delantero lleva su peso hacia las dos ruedas de delante, y el triciclo vuelca menos.',
    [['Más espacio para las piernas.'], ['El peso se va atrás: vuelca antes.']], [['Más peso delante: vuelca menos.'], ['Rodillas más cerca del depósito.']], ['tPasX', 'tRecPil'], [C.vuelco, C.cabezaPil, C.alcance]),
  tPasX: E('Pasajero: cadera al eje delantero', 'Dónde va la cadera del pasajero, detrás del eje delantero (m): entre 40 y 62 cm detrás del piloto.',
    'El pasajero es la mitad del peso de los dos y va detrás y alto: es lo que más empuja el centro de gravedad hacia la rueda trasera.',
    [['Más sitio entre los dos.'], ['Vuelca antes; menos techo (la cúpula baja).']], [['Vuelca menos.'], ['Sus rodillas, más cerca del respaldo del piloto.']], ['tPilX', 'tRecPil'], [C.vuelco, C.cabezaPas, C.respaldo]),
  tRecPil: E('Reclinado del piloto', 'Lo que se inclina hacia atrás el respaldo del piloto (° desde la vertical; negativo: inclinado hacia delante, sobre el manillar). El tronco va con él y la cabeza un tercio.',
    'Reclinar baja la cabeza y la lleva atrás, donde la cúpula es más alta: de 0° a 20° la talla alta gana unos 5 cm de techo. Pero los puños quedan más lejos: hay que acercar el manillar.',
    [['Más techo sobre la cabeza.', 'Más cómodo en viajes largos.'], ['Los puños quedan lejos.', 'El respaldo se acerca al pasajero.']],
    [['Las manos llegan mejor al manillar.'], ['Menos techo para la talla alta.']], ['tManX', 'tAlto'], [C.cabezaPil, C.alcance, C.respaldo]),
  tRecPas: E('Reclinado del pasajero', 'Lo que se inclina hacia atrás el respaldo del pasajero (° desde la vertical).',
    'Al pasajero, reclinarse le quita techo: su cabeza va hacia atrás, donde la cúpula ya baja. Inclinado hacia delante, sobre el piloto, gana techo.',
    [['Más cómodo.'], ['Menos techo: la cúpula baja detrás de él.']], [['Más techo.'], ['Su cabeza se acerca a la del piloto.']], ['tCupFin', 'tPasX'], [C.cabezaPas, 'Cabeza del piloto a la del pasajero']),
  tManX: E('Manillar: hacia el piloto', 'Cuánto se acerca el manillar al piloto (m; negativo: más lejos).', 'Si el piloto se reclina, sus manos necesitan el manillar más cerca.',
    [['Llega mejor reclinado.'], ['Menos sitio para las rodillas.']], [['Más sitio para las rodillas.'], ['Hay que estirar los brazos.']], ['tRecPil'], [C.alcance, 'Manillar dentro de la carrocería']),
  tManY: E('Manillar: altura', 'Cuánto sube el manillar sobre su soporte (m).', 'Más alto, la postura es más erguida; más bajo, más deportiva.',
    [['Postura más erguida.'], ['Tapa algo más la vista.']], [['Postura más deportiva.'], ['Hay que inclinarse.']], ['tRecPil'], [C.alcance]),
  tPiesX: E('Plataformas: hacia delante', 'Cuánto se adelantan las plataformas de los pies del piloto (m).', 'Mueve los pies y, con ellos, las rodillas.',
    [['Piernas más estiradas.'], ['Los pies se acercan a la batería.']], [['Rodillas más dobladas.'], ['Postura más recogida.']], ['tPilX']),
  tPiesY: E('Plataformas: altura', 'Cuánto suben las plataformas del piloto (m).', 'Más altas, las rodillas suben.', [['Más altura al suelo para los pies.'], ['Rodillas más altas.']], [['Rodillas más bajas.'], ['Pies más cerca de la panza.']], ['tPilY']),
  tMOcc: E('Masa por ocupante', 'Lo que pesa cada uno de los dos ocupantes (kg).', 'Los dos pesan casi tanto como el vehículo y van altos: suben el centro de gravedad y bajan el umbral de vuelco; y gastan más.',
    [['El cálculo vale para gente más pesada.'], ['Más consumo y más vuelco.']], [['Menos consumo.'], ['Cálculo optimista para un adulto grande.']], ['tPilY', 'tVia'], [C.vuelco, C.seguridad]),
  tMAsiento: E('Un asiento (sillín y respaldo)', 'Lo que pesa cada asiento con su respaldo (kg).', 'Entra en la masa y en el centro de gravedad.', [['Asiento más mullido.'], ['Más masa.']], [['Menos masa.'], ['Menos acolchado.']], []),
  // ── Chasis ─────────────────────────────────────────────────────────────────
  tChD: E('Tubos: diámetro', 'El diámetro exterior de los tubos del bastidor (mm).', 'Un tubo más grueso resiste mucho más la flexión (con la cuarta potencia del diámetro), sin pesar mucho más.',
    [['Bastidor más resistente.'], ['Ocupa más sitio sobre la panza.']], [['Ocupa menos.'], ['Menos resistente: el coeficiente de seguridad baja.']], ['tChT', 'tChMat'], [C.seguridad, C.bastidor]),
  tChT: E('Tubos: pared', 'El espesor de la pared de los tubos (mm).', 'Más pared, más resistencia y más masa.', [['Más resistente.'], ['Más masa.']], [['Menos masa.'], ['Menos resistente.']], ['tChD'], [C.seguridad]),
  tChMat: E('Material de los tubos', 'Aluminio 6061-T6 (2700 kg/m³, 240 MPa usables), acero cromoly 4130 (7850, 460) o tubo de carbono (1550, 500).', 'El cromoly es el clásico de los karts y triciclos: fácil de soldar y reparar.',
    [['El carbono es el más ligero.'], ['El carbono no se suelda: necesita uniones pegadas.']], [['El cromoly se suelda en cualquier taller.'], ['El cromoly es el más pesado.']], ['tChD'], [C.seguridad]),
  tChUniones: E('Uniones, chapas y tornillería', 'La masa de lo que no son tubos: escuadras, soportes, chapas y tornillos (kg).', 'Se suma a la masa del bastidor.', [['Más soportes y refuerzos.'], ['Más masa.']], [['Menos masa.'], ['Menos refuerzos.']], []),
  // ── Rodaje ─────────────────────────────────────────────────────────────────
  tBatalla: E('Batalla: eje delantero a trasero', 'La distancia entre el eje de las dos ruedas delanteras y el de la trasera (m). Moverla mueve la rueda trasera y estira la carrocería.',
    'Con la misma carga, una batalla más larga deja el centro de gravedad relativamente más cerca de las ruedas de delante.',
    [['Más estable en recta.'], ['Gira peor y es más largo.']], [['Más ágil y corto.'], ['La cola se acorta.']], ['tEjeDel', 'tCola'], [C.vuelco, C.trasera]),
  tEjeDel: E('Eje delantero: atrasado', 'Cuánto va el eje de las ruedas delanteras por detrás de donde el Cuadriciclo lleva su rueda delantera (m).',
    'En un triciclo con dos ruedas delante, el vuelco depende de lo cerca que esté el peso de ese eje. Atrasarlo lo acerca al centro de gravedad: más estable. A cambio, la batalla se acorta y los carenados quedan al lado de los pies del piloto.',
    [['Vuelca menos.'], ['Batalla más corta.']], [['Batalla más larga.'], ['Vuelca antes.']], ['tVia', 'tBatalla'], [C.vuelco, C.girado]),
  tVia: E('Vía delantera', 'La distancia entre los centros de las dos ruedas delanteras (m).',
    'Es lo que más evita el vuelco: el umbral crece en proporción a la vía. Con dos adultos a horcajadas, una vía de 1,2 m volcaría por debajo de lo que agarra el neumático. Si los carenados, girados a tope, no caben, sube sola.',
    [['Vuelca mucho menos.'], ['Más ancho total: aparca peor y no entra por puertas estrechas.']], [['Más estrecho.'], ['Vuelca antes de derrapar.']], ['tEjeDel', 'tGiro'], [C.vuelco, C.girado]),
  tGiro: E('Giro máximo de la dirección', 'El ángulo máximo que gira la rueda delantera de dentro de la curva (°); la de fuera gira menos (Ackermann).',
    'Más giro, menos radio de giro; pero los carenados, que giran con las ruedas, se acercan más a la carrocería.',
    [['Gira en menos sitio.'], ['Los carenados se acercan a la carrocería.']], [['Más holgura a los carenados.'], ['Necesita más sitio para dar la vuelta.']], ['tVia', 'tPodCola'], [C.girado]),
  tRecDel: E('Recorrido de la suspensión delantera', 'Lo que pueden subir las ruedas delanteras (mm).', 'Más recorrido, más cómodo en baches; la panza baja más al hundirse.',
    [['Más cómodo.'], ['La panza se acerca al suelo al hundirse.']], [['Más firme.'], ['Menos cómodo.']], ['tSuelo']),
  tRecTras: E('Recorrido de la suspensión trasera', 'Lo que puede subir la rueda trasera (mm). Al hundirse, entra en la cola.', 'Más recorrido, más cómodo, pero la rueda necesita más sitio dentro de la cola.',
    [['Más cómodo.'], ['La rueda roza antes dentro de la cola.']], [['Más sitio para la rueda.'], ['Menos cómodo.']], ['tRuedaTras', 'tBasculante'], [C.trasera]),
  tBasculante: E('Basculante trasero: largo', 'La distancia del pivote del basculante al eje de la rueda trasera (m).', 'Un basculante largo mueve la rueda más en vertical; uno corto deja el pivote más atrás.',
    [['La rueda sube más recta.'], ['El pivote se acerca a los pies del pasajero.']], [['Más compacto.'], ['La rueda sube con más arco.']], ['tRecTras']),
  tMRueda: E('Una rueda con neumático', 'Lo que pesa cada una de las tres ruedas con su neumático (kg).', 'Peso no suspendido: más, más golpes en los baches.', [['Ruedas más robustas.'], ['Más masa.']], [['Menos masa.'], ['Ruedas más frágiles.']], []),
  tMFreno: E('Un freno de disco con pinza', 'Lo que pesa cada freno (kg); lleva tres.', 'Más masa suele ser más disco y más freno.', [['Más capacidad de frenada.'], ['Más masa.']], [['Menos masa.'], ['Menos frenada.']], []),
  tMSuspDel: E('Suspensión delantera (las dos)', 'Brazos, manguetas y amortiguadores de las dos ruedas delanteras (kg).', 'Entra en la masa, cerca del eje delantero y bajo.', [['Piezas más robustas.'], ['Más masa.']], [['Menos masa.'], ['Piezas más ligeras y caras.']], []),
  tMSuspTras: E('Basculante y amortiguador trasero', 'Lo que pesan el basculante y el amortiguador de atrás (kg).', 'Entra en la masa, cerca de la rueda trasera.', [['Más robusto.'], ['Más masa detrás.']], [['Menos masa.'], ['Más ligero.']], []),
  tMDir: E('Dirección: columna, cremallera y bieletas', 'Lo que pesa la dirección completa (kg).', 'Va entre el manillar y el eje delantero.', [['Dirección más robusta.'], ['Más masa.']], [['Menos masa.'], ['Más ligera.']], []),
  // ── Propulsión y energía ────────────────────────────────────────────────────
  tKWNom: E('Potencia nominal', 'La potencia que el motor de buje da sin calentarse (kW).', 'Marca la velocidad que aguanta en llano.', [['Más velocidad sostenida y mejor en cuestas.'], ['Motor más pesado y caro.']], [['Motor más ligero.'], ['Menos velocidad sostenida.']], ['tKWPico', 'tMMotor']),
  tKWPico: E('Potencia máxima', 'La potencia que da unos segundos (kW), para acelerar.', 'Marca la aceleración, limitada por el agarre de la única rueda que empuja.', [['Acelera más.'], ['Más consumo en ciudad si se usa.']], [['Más suave.'], ['Acelera menos.']], ['tKWNom']),
  tMMotor: E('Motor de buje', 'Lo que pesa el motor de la rueda trasera (kg).', 'Va dentro de la rueda: masa no suspendida y detrás, lo que lleva el peso atrás.', [['Motor más potente.'], ['Más masa atrás: algo más de vuelco.']], [['Menos masa.'], ['Menos potencia.']], ['tKWNom'], [C.vuelco]),
  tMInversor: E('Controlador (inversor)', 'Lo que pesa el controlador del motor (kg), bajo el sillín del pasajero.', 'Entra en la masa.', [['Más potencia admitida.'], ['Más masa.']], [['Menos masa.'], ['Menos potencia admitida.']], []),
  tVel: E('Velocidad de cálculo', 'La velocidad a la que se calculan el consumo y la autonomía (km/h).', 'El aire cuesta con el cubo de la velocidad: a 100 km/h gasta mucho más que a 60.', [['Cifras de autovía.'], ['Más consumo y menos autonomía.']], [['Cifras de ciudad.'], ['No representa la carretera.']], ['tKWh']),
  tKWh: E('Batería', 'La energía de la batería (kWh).', 'Va en el morro, donde el Cuadriciclo lleva la rueda delantera, y lo que no cabe, entre los pies del piloto: delante y bajo, que es donde un triciclo con dos ruedas delante quiere el peso.',
    [['Más autonomía.', 'Más peso delante y bajo: vuelca menos.'], ['Más masa y más cara.']], [['Menos masa y más barata.'], ['Menos autonomía.']], ['tWhKg', 'tWhL'], [C.bateria, C.vuelco]),
  tWhKg: E('Densidad del paquete (masa)', 'Cuánta energía cabe en cada kilo del paquete (Wh/kg). NMC en paquete: 150-180; LFP: 110-130.', 'Más densidad, la misma energía pesa menos.', [['Batería más ligera.'], ['Celdas más caras.']], [['Celdas más baratas (LFP).'], ['Más masa.']], ['tKWh']),
  tWhL: E('Densidad del paquete (volumen)', 'Cuánta energía cabe en cada litro del paquete (Wh/L).', 'Decide cuánto sitio ocupa la batería y si cabe en el morro.', [['Más energía en el morro.'], ['Celdas más caras.']], [['Más baratas.'], ['El módulo de entre los pies crece.']], ['tKWh'], [C.bateria]),
  tMVarios: E('Varios: cargador, cables, luces, 12 V', 'Lo que no tiene deslizador propio (kg).', 'Entra en la masa.', [['Más equipamiento.'], ['Más masa.']], [['Menos masa.'], ['Menos equipamiento.']], []),
};
