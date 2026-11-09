import type { Departamento } from './tipos';

/**
 * Carrocería, cúpula y aerodinámica del Aeromóvil 1 (escrito el 2026-11-06 por
 * un bot a partir de `componentes.ts`, `geometriaA1.ts`, el changelog del día
 * y búsquedas en la web). Todo precio lleva su fuente; lo que no se pudo
 * comprobar dice «por confirmar». Las webs de los partners se encontraron de
 * verdad; `verificado: false` = no se pudo abrir su web o confirmar que hagan
 * exactamente esto.
 *
 * Vocabulario que se usa abajo (explicado la primera vez que aparece):
 * laminado, molde, gelcoat, Cd, CFD, túnel de viento, policarbonato,
 * termoformado, ETFE, EPDM, prepreg, infusión.
 */
export const DEPARTAMENTO: Departamento = {
  id: 'carroceria', nombre: 'Carrocería, cúpula y aerodinámica', lema: 'la piel: forma, cristales, paneles solares y resistencia al aire',
  mision:
    'Convertir la forma que ya existe en el 3D (3,94 m de largo, 1,55 m de ancho, 1,11 m de alto, morro redondeado tipo Aptera, cabina con parabrisas plano y techo solar que baja hasta la cola) en una piel real que se pueda fabricar una vez, pesar, pintar y montar sobre el chasis: la carrocería baja (morro, costados, cubierta y cola), la cúpula (los montantes, el parabrisas y las dos ventanillas), las gomas, los paneles solares integrados y el acabado. Y comprobar, antes de gastar en moldes, que la forma frena al aire tan poco como dice el cálculo (Cd estimado ≈ 0,12–0,16; el SZEmission en que se inspira publica 0,1365).',
  responsabilidades: [
    'La forma exterior: congelar la geometría del 3D (STEP) como «versión A» antes de fabricar ningún molde; cualquier cambio posterior pasa por aquí.',
    'La piel de fibra: elegir material (fibra de vidrio o carbono), espesor, alma y resina; definir dónde se parte la carrocería en piezas (morro, costados, capó, cola, puertas) y cómo se unen al chasis.',
    'Los moldes y el utillaje: moldes fresados en espuma de poliuretano, cunas de montaje y plantillas de corte.',
    'La cúpula y los cristales: parabrisas y dos ventanillas en policarbonato (plástico transparente muy resistente al golpe) o vidrio, con sus marcos y gomas.',
    'Los paneles solares integrados en el techo, el capó y el lomo: su forma, su pegado y su conexión (el regulador y el cableado son de «Energía»).',
    'La aerodinámica: calcular el Cd (coeficiente de resistencia al aire: cuanto más bajo, menos energía gasta el coche a velocidad) por ordenador (CFD) y, si se puede pagar, en túnel de viento.',
    'El acabado: gelcoat (la capa de color que se da en el molde) o pintura, la banda negra de los bajos, el morro azul marino y el logo.',
    'El peso de la piel: hoy el modelo estima 24–36 kg según material; cada pieza real se pesa y se escribe en su ficha de componente.',
    'Las juntas con los demás departamentos: la puerta como piel es nuestra, las bisagras y cierres son de «Accesos»; la piel ancla en el chasis, los anclajes los define «Chasis» con nosotros.',
    'La documentación: planos de cada pieza, hoja de laminado (qué capas, en qué orden), y el registro de pesos y costes reales frente a los estimados.',
  ],
  parametros: ['L', 'fMorro', 'W', 'H', 'deck', 'morroA1', 'posMorro', 'colaA1', 'nU', 'nL', 'cupX0', 'cupX1', 'cupW', 'techoW', 'parabrisas', 'techo', 'inicioSolar', 'jaguar', 'jagAlto', 'jagLargo', 'jagAncho', 'matCarenado', 'espCarenado', 'espCristal'],
  componentes: ['carroceria', 'cupula', 'solar'],
  tareas: [
    {
      titulo: 'Congelar la forma: «versión A» del STEP',
      detalle: 'Exportar la geometría actual desde «Exportar» (el STEP de 12 capas que ya genera `aeromovil_1_cad.py`), guardarla con fecha y nombre («A1-piel-vA-2026-11») y decidir con Eugenio que a partir de aquí la forma no cambia sin pasar por este departamento. Sin esto, cualquier molde se queda viejo antes de terminarlo.',
      prioridad: 'alta', semanas: 0.5, entregable: 'Fichero STEP «versión A» + hoja con las 12 medidas principales (largo, ancho, alto, batalla, vías, altura de bajos, alto de cubierta, base y techo de la cabina, inicio y fin de la cúpula).',
    },
    {
      titulo: 'Partir la piel en piezas fabricables',
      detalle: 'Decidir las líneas de corte: pieza del morro (la azul, hasta `uNariz`), capó (tapa del maletero delantero), dos costados, cubierta/lomo con las dos franjas solares, cola (tapa del maletero trasero), y la cúpula en tres: parabrisas con sus montantes, y las dos puertas (ventanilla + costado de cúpula + panel lateral). Cada pieza tiene que salir del molde sin quedarse enganchada (sin «contrasalidas»: partes que se meten hacia dentro y atrapan la pieza).',
      prioridad: 'alta', semanas: 1, dependeDe: ['Congelar la forma: «versión A» del STEP'], entregable: 'Plano de despiece con 8–10 piezas numeradas, la línea de corte de cada una y por dónde se desmolda.',
    },
    {
      titulo: 'Elegir material y espesor de la piel para el prototipo 1',
      detalle: 'Ver la decisión «Material de la carrocería». Para el prototipo 1 la recomendación es fibra de vidrio con alma de espuma (más barata, se repara fácil, 6–8 kg más que el carbono). Escribir la hoja de laminado: capas, gramajes, orientación y resina.',
      prioridad: 'alta', semanas: 0.5, dependeDe: ['Partir la piel en piezas fabricables'], entregable: 'Hoja de laminado por pieza (tabla: capa, tejido, g/m², orientación) y peso estimado por pieza.',
    },
    {
      titulo: 'Calcular el Cd por ordenador (CFD) con la forma congelada',
      detalle: 'CFD = simular por ordenador cómo pasa el aire alrededor del coche. Subir el STEP a SimScale (tiene plan gratuito con proyectos públicos, según su web; precio del plan profesional por confirmar) o encargarlo a una ingeniería, y obtener el Cd y el área frontal a 100 km/h con las ruedas giradas 0°. Comparar con el 0,12–0,16 que estima el modelo y con el 0,1365 publicado del SZEmission. Si sale más de 0,20, revisar la unión cúpula-carrocería, el borde de fuga de la cola y los pasos de rueda antes de fabricar el molde.',
      prioridad: 'alta', semanas: 2, dependeDe: ['Congelar la forma: «versión A» del STEP'], entregable: 'Informe de CFD: Cd, CdA (m²), imágenes de las zonas donde el aire se despega, y la lista de cambios recomendados.',
    },
    {
      titulo: 'Pedir presupuesto del molde fresado',
      detalle: 'Con el despiece, pedir a un taller de modelos (Modelporex u otro) el fresado de los moldes en poliuretano de alta densidad desde el STEP. En `componentes.ts` se estima 3.500 € el molde de carbono y 2.200 € el de vidrio (en dos mitades): hay que sustituir esa cifra por la real.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Partir la piel en piezas fabricables'], entregable: 'Tres presupuestos comparados (precio, plazo, material del molde, acabado de la superficie).',
    },
    {
      titulo: 'Pedir presupuesto de materiales de laminado',
      detalle: 'Castro Composites y otro proveedor: tejido de vidrio o carbono, espuma de 5 mm, resina epoxi, gelcoat blanco y negro, consumibles de vacío. La superficie la da «Rendimiento» en el 3D (`res.areas.carroceria`); pedir un 35 % más por recortes.',
      prioridad: 'alta', semanas: 0.5, dependeDe: ['Elegir material y espesor de la piel para el prototipo 1'], entregable: 'Lista de materiales con precio unitario, cantidad y total; plazo de entrega.',
    },
    {
      titulo: 'Elegir el taller de laminado (o laminar nosotros)',
      detalle: 'Un laminado de vidrio con alma de espuma en molde abierto es trabajo de taller de composites de barcos, de kart-cross o de un makerspace con bomba de vacío. Pedir precio a dos talleres y compararlo con hacerlo nosotros (horas, espacio, extracción de aire). Para un primer prototipo lo normal es que lamine el taller y nosotros aprendamos a su lado.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Pedir presupuesto de materiales de laminado'], entregable: 'Taller elegido, precio por pieza o por el conjunto, y calendario.',
    },
    {
      titulo: 'Probeta: laminar un trozo de 50 × 50 cm y pesarlo',
      detalle: 'Antes de la carrocería entera, laminar una probeta plana con la hoja de laminado elegida, medir el espesor real y pesarla. El modelo usa 1,85 kg por m² y mm para vidrio y 1,55 para carbono (`MATERIALES_CARENADO`): si la probeta da otra cosa, corregir `espCarenado` en el diseño para que el peso total sea verdad.',
      prioridad: 'alta', semanas: 0.5, dependeDe: ['Elegir el taller de laminado (o laminar nosotros)'], entregable: 'Probeta medida: espesor (mm), masa (g), kg/m², y el ajuste hecho en el diseño.',
    },
    {
      titulo: 'Definir los cristales: parabrisas y ventanillas',
      detalle: 'Ver la decisión «Cristales». Medir en el 3D la curvatura del parabrisas (sube casi recto desde el capó y llega horizontal al techo) y la de las ventanillas (planas o casi), y decidir policarbonato termoformado (calentado y curvado sobre un molde) o vidrio. Pedir la ficha técnica del Lexan Margard (policarbonato con capa dura antirrayas) y comprobar el espesor mínimo que admite el curvado.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Congelar la forma: «versión A» del STEP'], entregable: 'Plano de los tres cristales con curvaturas, espesor y material; nombre del proveedor que los hace.',
    },
    {
      titulo: 'Comprobar qué exige la ley a los cristales de un L7e',
      detalle: 'Un cuadriciclo pesado (categoría L7e del Reglamento (UE) 168/2013) tiene los requisitos de acristalamiento en el anexo VII del Reglamento Delegado (UE) 3/2014, que remite al Reglamento ONU n.º 43 (vidrio de seguridad). Lo que dice ese anexo, leído el 2026-11-07 en la versión publicada por legislation.gov.uk: el punto 2.1.2 permite parabrisas de plástico rígido solo en L1e–L5e (motos, triciclos); el L7e no está en la lista, así que para circular el parabrisas tendría que ser vidrio de seguridad homologado, y el plástico queda para las ventanillas. Confirmarlo con «Homologación» en el texto en español del DOUE y decidir: policarbonato en el prototipo 1 (pista cerrada) y vidrio en el que circule.',
      prioridad: 'alta', semanas: 0.5, dependeDe: ['Definir los cristales: parabrisas y ventanillas'], entregable: 'Nota de una página: qué dice el anexo VII del 3/2014 y el R43 para el parabrisas y las ventanillas de un L7e, y qué cristalero puede hacer un parabrisas de vidrio laminado a medida.',
    },
    {
      titulo: 'Diseñar las gomas y los marcos de los cristales',
      detalle: 'El 3D lleva una goma negra de 2,5 cm alrededor del parabrisas y de cada ventanilla (`G_T`). Elegir el perfil de goma (EPDM: caucho que aguanta sol y lluvia) que encaja con el espesor del cristal y el canto de la fibra, y cómo se pega el cristal (adhesivo de poliuretano, como en los coches).',
      prioridad: 'media', semanas: 0.5, dependeDe: ['Definir los cristales: parabrisas y ventanillas'], entregable: 'Perfil de goma elegido (referencia de catálogo), metros necesarios y adhesivo.',
    },
    {
      titulo: 'Diseñar la integración de los paneles solares',
      detalle: 'El 3D pone células en la parte plana del techo (desde el borde del parabrisas hasta la cola), en el capó y en dos franjas del lomo. Medir en el 3D las áreas y curvaturas de cada zona y pedir a Solbian, Sunbeam y Sono Solar si pueden laminar paneles flexibles a esa forma. Dato para comparar: el Solbian SP 144 publica 144 W en 1490 × 546 mm y 1,9 kg (≈ 177 W/m², ≈ 2,3 kg/m², 2 mm de espesor), cerca de los 200 W/m² y 2,2 kg/m² que usa el modelo.',
      prioridad: 'media', semanas: 1, dependeDe: ['Congelar la forma: «versión A» del STEP'], entregable: 'Plano de las zonas solares con área (m²), curvatura máxima, potencia estimada y lista de paneles de catálogo o a medida que encajan.',
    },
    {
      titulo: 'Fabricar los moldes',
      detalle: 'Fresado de los moldes en el taller elegido, sellado y encerado de la superficie (para que la pieza no se pegue) y una primera inspección: medir el molde contra el STEP en 10 puntos.',
      prioridad: 'alta', semanas: 4, dependeDe: ['Pedir presupuesto del molde fresado', 'Partir la piel en piezas fabricables'], entregable: 'Moldes terminados, con la hoja de medición (desviación en mm en 10 puntos).',
    },
    {
      titulo: 'Laminar las piezas de la carrocería baja',
      detalle: 'Morro, capó, costados, cubierta y cola, con el gelcoat en el molde (blanco; negro en la banda de los bajos; azul marino en el morro), las capas de la hoja de laminado y la espuma. Pesar cada pieza al desmoldar y escribirlo en la ficha «Carrocería» (la pieza real, escrita a mano).',
      prioridad: 'alta', semanas: 4, dependeDe: ['Fabricar los moldes', 'Probeta: laminar un trozo de 50 × 50 cm y pesarlo'], entregable: 'Piezas desmoldadas y pesadas; tabla peso real vs estimado.',
    },
    {
      titulo: 'Laminar la cúpula y las dos puertas como piel',
      detalle: 'La parte de fibra de la cúpula (marco del parabrisas, montantes, techo con su hueco para el panel solar) y las dos puertas (costado de cúpula + panel lateral). Dejar los insertos (placas metálicas embebidas en la fibra) donde «Accesos» ponga las bisagras y los cierres, y donde «Chasis» ponga los herrajes del montante del parabrisas y del arco de seguridad.',
      prioridad: 'alta', semanas: 3, dependeDe: ['Laminar las piezas de la carrocería baja'], entregable: 'Cúpula y puertas desmoldadas, con los insertos en su sitio y pesadas.',
    },
    {
      titulo: 'Encargar los cristales',
      detalle: 'Con el plano de cristales aprobado, encargar parabrisas y ventanillas (termoformado o corte), con el tratamiento antirrayas y el filtro UV. Pedir una ventanilla de más: la primera que se monte se suele rayar.',
      prioridad: 'alta', semanas: 4, dependeDe: ['Definir los cristales: parabrisas y ventanillas', 'Comprobar qué exige la ley a los cristales de un L7e'], entregable: 'Cristales recibidos, medidos contra el plano y pesados.',
    },
    {
      titulo: 'Montaje en seco sobre el chasis',
      detalle: 'Poner todas las piezas sobre el chasis real sin pegar nada: comprobar holguras con las ruedas (el 3D exige que la rueda delantera girada 22° y hundida 9 cm no toque), con el arco de seguridad bajo la cúpula (mínimo 5 mm), y que el hueco de la puerta mide al menos 0,50 × 0,80 m. Marcar dónde hay que recortar.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Laminar la cúpula y las dos puertas como piel', 'Chasis: Soldar el chasis del prototipo 1'], entregable: 'Lista de ajustes (qué pieza, cuánto recortar o rellenar) y fotos del montaje.',
    },
    {
      titulo: 'Pegar los cristales y las gomas',
      detalle: 'Pegar los cristales con adhesivo de poliuretano sobre el marco de fibra, poner las gomas y comprobar que no entra agua con una manguera durante 10 minutos.',
      prioridad: 'media', semanas: 0.5, dependeDe: ['Encargar los cristales', 'Montaje en seco sobre el chasis'], entregable: 'Cristales pegados; prueba de agua superada (o lista de puntos que gotean).',
    },
    {
      titulo: 'Pegar los paneles solares y sacar el cableado',
      detalle: 'Pegar los paneles flexibles con el adhesivo que indique el fabricante, llevar los cables por dentro de la cúpula hasta donde «Energía» ponga el regulador MPPT, y medir la potencia al sol de mediodía con un vatímetro.',
      prioridad: 'media', semanas: 1, dependeDe: ['Diseñar la integración de los paneles solares', 'Laminar la cúpula y las dos puertas como piel'], entregable: 'Paneles pegados; medida de potencia real (W) al sol y a qué hora.',
    },
    {
      titulo: 'Acabado: lijar, pintar o pulir el gelcoat',
      detalle: 'Si el gelcoat sale bien, lijar y pulir basta para el prototipo; si no, imprimación y pintura en un taller de pintura de carrocerías. Logo de Luz & Humanidad en lo alto del morro azul (como lo lleva el 3D).',
      prioridad: 'baja', semanas: 1, dependeDe: ['Pegar los cristales y las gomas'], entregable: 'Carrocería acabada; fotos de las cinco vistas junto a los renders del 3D.',
    },
    {
      titulo: 'Medir el coche real: Cd por «coast-down» y pesos',
      detalle: 'Coast-down = dejar el coche rodar en punto muerto desde 80 km/h en llano y medir cuánto tarda en frenar solo; con la masa real se saca la resistencia del aire y de la rodadura. Hacerlo en pista cerrada con «Homologación». Comparar con el CFD y escribir el Cd medido en la referencia del diseño.',
      prioridad: 'media', semanas: 1, dependeDe: ['Acabado: lijar, pintar o pulir el gelcoat', 'Rodaje: Primera rodadura y ajuste de alineación'], entregable: 'Cd y CdA medidos; peso de la piel completa; tabla estimado vs real.',
    },
    {
      titulo: 'Cerrar el registro de pesos y costes de la piel',
      detalle: 'Escribir en las fichas «Carrocería», «Parabrisas y ventanillas» y «Paneles solares» del catálogo el proveedor, el precio pagado y el peso real de cada pieza, para que el 3D calcule con datos de verdad.',
      prioridad: 'media', semanas: 0.5, dependeDe: ['Medir el coche real: Cd por «coast-down» y pesos'], entregable: 'Las tres fichas rellenas en «La pieza real, escrita a mano».',
    },
  ],
  decisiones: [
    {
      tema: 'Material de la carrocería (fibra de vidrio, carbono o carbono-lino)',
      contexto: 'Es la decisión que más cambia el coste del departamento y la que fija el peso de la piel (hoy entre 24 y 36 kg según la opción). El molde es el mismo para las tres.',
      opciones: [
        { nombre: 'Fibra de vidrio con alma de espuma', pros: 'La más barata; se lamina en cualquier taller; se repara con un kit; perdona errores.', contras: '6–8 kg más que el carbono (≈ 36 kg de piel según `componentes.ts`).', coste: '≈ 70 €/m² de laminado + molde ≈ 2.200 € (estimación de `componentes.ts`, nov. 2026; tejidos y resinas en Castro Composites)' },
        { nombre: 'Fibra de carbono con alma de espuma', pros: 'La más ligera y rígida (≈ 28 kg a 1,8 mm); es lo que lleva el SZEmission y el Aptera.', contras: 'Triple de precio del tejido; pide vacío y más cuidado; se astilla en vez de abollarse.', coste: '≈ 230 €/m² + molde ≈ 3.500 € (estimación de `componentes.ts`). Tejido biaxial de carbono 300 g/m² a 25–28 € en Castro Composites, según su web, nov. 2026 (unidad de precio por confirmar: metro o m²)' },
        { nombre: 'Carbono-lino', pros: 'Entre las dos en peso (1,35 kg/m²·mm); acabado natural visible.', contras: 'Menos rígido que el carbono puro; absorbe humedad si no se sella bien.', coste: '≈ 190 €/m² + molde ≈ 3.500 € (estimación de `componentes.ts`)' },
      ],
      recomendacion: 'Fibra de vidrio para el prototipo 1; carbono para el segundo, con el mismo molde.',
      porQue: 'El primer prototipo va a cambiar: se recorta, se repara y se vuelve a pegar. Con vidrio cada error cuesta decenas de euros; con carbono, cientos. Los 6–8 kg de diferencia son el 2 % del peso del coche y no cambian ninguna comprobación del 3D. Cambiar de vidrio a carbono después cuesta solo el material y las horas, no el molde.',
      cuando: 'antes de comprar',
    },
    {
      tema: 'Cómo se hace el molde',
      contexto: 'Sin molde no hay piel. Las piezas son grandes (hasta 3,9 m) y de doble curvatura, así que el molde es lo que fija la precisión de la forma.',
      opciones: [
        { nombre: 'Molde macho fresado en poliuretano de alta densidad desde el STEP', pros: 'Sale directo del 3D; precisión de ±1 mm; sirve para varias piezas.', contras: 'Hay que sellarlo y pulirlo; un bloque de 4 m es caro de fresar y de transportar.', coste: '≈ 2.200–3.500 € según `componentes.ts`; el real lo da el taller (Modelporex, por confirmar)' },
        { nombre: 'Molde de cuadernas de madera cortadas a láser + espuma + masilla', pros: 'Lo más barato; se puede hacer en un taller propio.', contras: 'Muchas horas de lijado; precisión de ±5 mm; la superficie se nota en la pieza.', coste: 'Materiales ≈ 400–800 € (estimación propia, por confirmar) + 60–100 horas' },
        { nombre: 'Molde hembra sacado de un macho impreso en 3D por tramos', pros: 'Se imprime en piezas de 30 cm y se encolan; bueno para la pieza del morro y los marcos.', contras: 'Para 4 m de carrocería son demasiados tramos; se ven las juntas.', coste: 'Por confirmar; vale para piezas pequeñas (morro, marcos de ventanilla)' },
      ],
      recomendacion: 'Fresado desde el STEP para las piezas grandes; impresión 3D solo para la pieza del morro y los marcos.',
      porQue: 'El Cd depende de que la forma real sea la del CFD; con ±5 mm en 4 m la cola y la unión cúpula-carrocería cambian y el cálculo deja de valer. El sobrecoste del fresado (unos 2.000 € sobre el molde casero) es menos que un segundo molde.',
      cuando: 'antes de fabricar',
    },
    {
      tema: 'Cristales: policarbonato termoformado, policarbonato plano o vidrio',
      contexto: 'El parabrisas es plano de lado a lado pero curvo de perfil (sale del capó y llega horizontal al techo), y las ventanillas van en la puerta. El material fija peso, precio y lo que diga la homologación.',
      opciones: [
        { nombre: 'Policarbonato 4 mm con capa dura (Lexan Margard), termoformado', pros: 'La mitad de peso que el vidrio; no se rompe; es lo que llevan planeadores y ultraligeros.', contras: 'Se raya con los años aunque lleve capa dura; el termoformado necesita un molde; y el anexo VII del Reglamento Delegado (UE) 3/2014 solo permite parabrisas de plástico rígido en L1e–L5e, no en L7e: para circular, el parabrisas tendría que ser vidrio (confirmar con «Homologación»).', coste: '≈ 55 €/m² la plancha de 4 mm + ≈ 1.200 € de molde y formado (estimaciones de `componentes.ts`)' },
        { nombre: 'Policarbonato 4 mm plano, curvado en frío al montarlo', pros: 'Sin molde; se corta y se pega; vale para ventanillas casi planas.', contras: 'El parabrisas tiene demasiada curva de perfil para doblarlo en frío sin que quede tensado y se agriete con el tiempo.', coste: 'Solo la plancha (≈ 55 €/m²)' },
        { nombre: 'Vidrio laminado hecho a medida', pros: 'Es lo que la ley espera en un parabrisas; no se raya; limpiaparabrisas sin problema.', contras: 'El doble de peso (≈ 10 kg/m² a 4 mm); un parabrisas curvo a medida es caro y lento; se rompe en el montaje.', coste: 'Por confirmar con un cristalero de automoción' },
      ],
      recomendacion: 'Policarbonato termoformado para las ventanillas y, en el prototipo 1, también para el parabrisas; vidrio laminado en el parabrisas del vehículo que circule, porque el anexo VII del 3/2014 no admite plástico en el parabrisas de un L7e.',
      porQue: 'El prototipo 1 sirve para rodar en pista cerrada y enseñar el coche; el policarbonato quita 5–6 kg y no se rompe. La decisión de vidrio es reversible: el marco de fibra es el mismo y solo cambia el cristal pegado. Pero conviene dibujar ya el marco con el espesor del vidrio (4–5 mm laminado) para no rehacerlo.',
      cuando: 'antes de comprar',
    },
    {
      tema: 'Paneles solares: a medida o de catálogo',
      contexto: 'El techo plano, el capó y el lomo tienen curvatura suave en una dirección y casi ninguna en la otra; los paneles flexibles de catálogo (barcos, caravanas) aguantan eso. A medida cuesta más pero cubre toda la superficie.',
      opciones: [
        { nombre: 'Paneles flexibles de catálogo (Solbian SP, Sunbeam Tough)', pros: 'Precio y ficha conocidos; se compran hoy; 2 mm de espesor, ≈ 2,3 kg/m² (Solbian SP 144: 144 W, 1,9 kg, 1490 × 546 mm según su ficha).', contras: 'Rectángulos: dejan franjas sin células en las zonas que se estrechan (la cola).', coste: 'Por confirmar: pedir precio de SP 144 y SP 118 Q (Solbian) y Tough 111 W (Sunbeam)' },
        { nombre: 'Panel a medida laminado a la forma', pros: 'Cubre toda la zona; sigue la curva; se pega sin juntas visibles.', contras: 'Mínimo de pedido y utillaje; plazo largo; precio por confirmar.', coste: 'Por confirmar (Solbian «SP Custom», Sono Solar «solar body panels»)' },
        { nombre: 'Células sueltas laminadas por nosotros en ETFE', pros: 'Lo más barato por vatio; forma libre.', contras: 'Una laminación mal hecha se delamina al sol en meses; pide prensa y práctica.', coste: 'Células + ETFE ≈ la mitad del panel de catálogo (estimación propia, por confirmar)' },
      ],
      recomendacion: 'Catálogo para el prototipo 1 (dos o tres paneles en el techo, uno en el capó); a medida para el prototipo 2 si el primero demuestra que los kilómetros solares merecen la pena.',
      porQue: 'El modelo estima unos pocos kilómetros al día de sol; con catálogo se mide el dato real en semanas y sin utillaje. Si el a medida da un 30 % más de superficie, se decide con la medida en la mano.',
      cuando: 'antes de comprar',
    },
    {
      tema: 'Comprobar la aerodinámica: solo CFD, o CFD y túnel de viento',
      contexto: 'El Cd estimado por el modelo es una fórmula aproximada. El consumo a 100 km/h (y por tanto la autonomía de ≈ 500 km) depende sobre todo de él.',
      opciones: [
        { nombre: 'CFD en la nube (SimScale) hecho por nosotros', pros: 'Barato o gratis en plan comunitario (proyectos públicos); se repite con cada cambio de forma.', contras: 'Un CFD mal planteado da un Cd bonito y falso; hace falta alguien que sepa leerlo.', coste: 'Plan gratuito con proyectos públicos, según su web; profesional por confirmar' },
        { nombre: 'CFD encargado a una ingeniería o centro (Applus IDIADA, CTAG)', pros: 'Resultado fiable y firmado; sirve para el dosier de homologación.', contras: 'Más caro y con plazo.', coste: 'Por confirmar; pedir presupuesto' },
        { nombre: 'Túnel de viento con maqueta a escala (IDR/UPM) o coche real', pros: 'Es la medida, no la simulación.', contras: 'Hace falta maqueta o coche terminado; el túnel ACLA16 del IDR es de ingeniería del viento (edificios, puentes): hay que confirmar que ensayan vehículos y a qué precio.', coste: 'Por confirmar con el IDR' },
      ],
      recomendacion: 'CFD en SimScale antes del molde, y coast-down con el coche real al final; túnel solo si el coast-down y el CFD discrepan en más de un 20 %.',
      porQue: 'El molde es la decisión cara; el CFD la protege por poco dinero. El coast-down es la prueba de verdad y cuesta una tarde de pista.',
      cuando: 'antes de fabricar',
    },
    {
      tema: 'Acabado: gelcoat en el molde o pintura después',
      contexto: 'El 3D lleva pintura blanca perlada, bajos negros y morro azul marino. Cómo se consigue cambia horas y precio.',
      opciones: [
        { nombre: 'Gelcoat de color en el molde', pros: 'Sale pintado del molde; aguanta golpes; sin taller de pintura.', contras: 'Acabado algo menos fino; las reparaciones se notan; el cambio de color en el morro y los bajos se enmascara en el molde.', coste: 'Gelcoat incluido en los materiales de laminado (Castro Composites)' },
        { nombre: 'Imprimación y pintura de automoción en taller', pros: 'Acabado de coche; el perlado y el logo salen bien.', contras: 'Un taller de pintura cobra por horas de preparación; añade 1–2 semanas.', coste: 'Por confirmar con un taller de chapa y pintura local' },
      ],
      recomendacion: 'Gelcoat blanco y negro en el molde para el prototipo 1; pintura solo del morro azul y del logo.',
      porQue: 'El prototipo va a recibir retoques; un gelcoat se lija y se vuelve a pulir. La pintura perlada se deja para el coche que se enseñe.',
      cuando: 'antes de fabricar',
    },
  ],
  partners: [
    { nombre: 'Castro Composites', tipo: 'proveedor', pais: 'España', web: 'https://www.castrocompositesshop.com/', que: 'Tejidos de vidrio y carbono, resinas epoxi, gelcoats, espumas, consumibles de vacío; venta online con precios públicos.', porQue: 'Es el proveedor que ya cita `componentes.ts`; tienda española con catálogo abierto y precios por metro (tejido biaxial de carbono 300 g/m² a 25–28 € sin IVA, según su web, nov. 2026).', estado: 'por contactar', verificado: true },
    { nombre: 'Modelporex', tipo: 'taller', pais: 'España', web: 'https://www.modelporex.com/', que: 'Modelos y moldes fresados en poliestireno expandido, poliuretano, pasta de modelar y madera; moldes para fibra de vidrio; sector automoción y movilidad ligera.', porQue: 'Taller de modelos en Palau-solità i Plegamans (Barcelona) que figura en el directorio de proveedores de Catalunya con moldes para fibra y automoción: lo que necesita nuestro molde fresado desde el STEP.', estado: 'por contactar', verificado: true },
    { nombre: 'Mecaplex', tipo: 'fabricante', pais: 'Suiza', web: 'https://glastroesch.com/en/about-us/divisions/mecaplex', que: 'Cúpulas y cristales de policarbonato y acrílico termoformados para aviones ligeros, planeadores y helicópteros; cita también acristalamiento de automoción.', porQue: 'Hace exactamente lo que es nuestro parabrisas: una pieza transparente curvada en caliente con precisión aeronáutica. Es caro, pero es la referencia para pedir presupuesto y ficha.', estado: 'por contactar', verificado: true },
    { nombre: 'SABIC (Lexan Margard)', tipo: 'fabricante', pais: 'Países Bajos / global', web: 'https://www.sabic.com/en/industries/mass-transportation/specialty-vehicles/heavy-vehicles', que: 'Plancha de policarbonato Lexan Margard con capa dura antirrayas y filtro UV, en 3–6 mm; variante formable para acristalamiento de vehículos.', porQue: 'Es el material que ya cita la ficha «Parabrisas y ventanillas»; su distribuidor local corta la plancha y Mecaplex u otro taller la forma.', estado: 'por contactar', verificado: true },
    { nombre: 'Solbian', tipo: 'fabricante', pais: 'Italia', web: 'https://www.solbian.eu/', que: 'Paneles solares flexibles de 2 mm con células SunPower de contacto posterior (serie SP: 52–144 W); ficha técnica pública con pesos y medidas.', porQue: 'Es el proveedor que ya cita la ficha «Paneles solares»; sus paneles de barco aguantan curvatura y pisadas. La ficha SP que encontramos la publica un distribuidor (Sailectron, Austria): confirmar con Solbian quién atiende España hoy.', estado: 'por contactar', verificado: false },
    { nombre: 'SUNBEAMsystem', tipo: 'fabricante', pais: 'Suecia', web: 'https://shop.sunbeamsystem.com/about-us/', que: 'Paneles flexibles serie Tough y Nordic (54–116 W) para barcos, muy resistentes al pisado; venta directa en su tienda.', porQue: 'Segunda fuente de paneles de catálogo para comparar precio y peso con Solbian.', estado: 'por contactar', verificado: true },
    { nombre: 'Sono Solar (Sono Motors GmbH)', tipo: 'fabricante', pais: 'Alemania', web: 'https://sono-solar.com/', que: 'Integración solar para vehículos: paneles de carrocería con forma 3D (techo, capó, puertas) por moldeo de polímero, electrónica de carga y desarrollo a medida; kit solar homologado en autobuses en Alemania.', porQue: 'Es la única empresa europea que vende paneles solares con forma de pieza de carrocería; si el prototipo 2 quiere todo el techo cubierto, es a quien preguntar. Su web no dice si venden a proyectos pequeños: preguntarlo.', estado: 'por contactar', verificado: true },
    { nombre: 'EMKA', tipo: 'fabricante', pais: 'Alemania (fabricación en España)', web: 'https://www.emka.com/', que: 'Perfiles de junta de EPDM a medida y cantoneras, con producción propia en España según su web.', porQue: 'Las gomas de 2,5 cm del parabrisas y las ventanillas del 3D son un perfil de EPDM a medida; EMKA lo fabrica y tiene planta en España.', estado: 'por contactar', verificado: true },
    { nombre: 'AIMPLAS (Instituto Tecnológico del Plástico)', tipo: 'laboratorio', pais: 'España', web: 'https://www.aimplas.es/', que: 'Ensayos de piezas de plástico y composite para automoción (mecánicos, climáticos, envejecimiento, piezas pintadas) con laboratorio acreditado ISO 17025; prototipado y piezas ligeras.', porQue: 'En Paterna (Valencia). Si hay que demostrar que una pieza de fibra o un cristal de policarbonato aguanta, aquí se ensaya con informe.', estado: 'por contactar', verificado: true },
    { nombre: 'CTAG (Centro Tecnológico de Automoción de Galicia)', tipo: 'laboratorio', pais: 'España', web: 'https://ctag.com/', que: 'Centro tecnológico de automoción reconocido por el Ministerio: ensayos, prototipos y proyectos de composites (participa en proyectos europeos de piezas composite).', porQue: 'Alternativa a AIMPLAS en el noroeste; útil si el laminado se hace en Galicia (donde está Castro Composites).', estado: 'por contactar', verificado: true },
    { nombre: 'IDR/UPM (Instituto «Ignacio Da Riva»)', tipo: 'universidad', pais: 'España', web: 'https://www.upm.es/recursosidi/infraestructura/tunel-de-viento-acla16/', que: 'Túnel de viento ACLA16 en el campus de Montegancedo (ETSIAE, Madrid) para ingeniería del viento: edificios, puentes, energía eólica y «efectos del viento sobre vehículos».', porQue: 'Es el túnel de viento universitario más cercano a un proyecto de Madrid; su web no publica tarifas ni dice que ensayen coches de serie: preguntarlo por el formulario de la UPM.', estado: 'por contactar', verificado: true },
    { nombre: 'Applus IDIADA', tipo: 'laboratorio', pais: 'España', web: 'https://www.applusidiada.com/', que: 'Servicio técnico de homologación (E9), ensayos de seguridad pasiva, aerodinámica y CFD, neumáticos, vehículos especiales y certificación individual.', porQue: 'Si el CFD tiene que firmarlo alguien para un dosier, o el coche necesita un ensayo oficial, IDIADA (Tarragona) es el laboratorio español de referencia. Caro: pedir presupuesto solo de lo imprescindible.', estado: 'por contactar', verificado: true },
    { nombre: 'SimScale', tipo: 'proveedor', pais: 'Alemania', web: 'https://www.simscale.com/', que: 'CFD en la nube desde el navegador; tiene proyectos públicos de «flujo incompresible sobre un vehículo» que sirven de plantilla.', porQue: 'Permite calcular el Cd de nuestro STEP sin instalar nada ni comprar un servidor. Precio del plan profesional por confirmar.', estado: 'por contactar', verificado: true },
    { nombre: 'SZEnergy Team (Universidad Széchenyi, Győr)', tipo: 'comunidad', pais: 'Hungría', web: 'https://szenergy.hu/en/our-racing-cars/', que: 'El equipo que diseñó y construyó el SZEmission (monocasco de carbono, 95 kg, Cd 0,1365), varias veces campeón de la Shell Eco-marathon Europa.', porQue: 'Nuestra forma sale de las fotos de su coche. Saben qué laminado, qué molde y qué Cd real; un correo de un proyecto abierto como humanity.wiki puede abrir una conversación.', estado: 'por contactar', verificado: true },
  ],
  mensajes: [
    {
      para: 'Castro Composites', canal: 'correo', idioma: 'es',
      asunto: 'Presupuesto de materiales para la carrocería de un prototipo (≈ [X] m² de laminado)',
      cuerpo: 'Hola,\n\nSomos el proyecto Aeromóvil 1 de humanity.wiki (Luz & Humanidad), un vehículo eléctrico ligero de cuatro ruedas (categoría L7e) del que vamos a construir un primer prototipo. La carrocería es una piel de fibra con alma de espuma laminada en molde abierto con vacío, de unos [X] m² (carrocería baja + cúpula + dos puertas).\n\nQueremos pedir presupuesto de:\n- Tejido de vidrio [o carbono] para un laminado de [1,8] mm: [gramajes y metros según nuestra hoja de laminado adjunta].\n- Espuma de alma de 5 mm (PVC o PET), [X] m².\n- Resina epoxi de laminado con endurecedor lento, [X] kg.\n- Gelcoat epoxi blanco y negro, [X] kg.\n- Consumibles de vacío (peel ply, malla, film, masilla, manguera) para [X] m².\n\n¿Nos podéis indicar también qué sistema de resina recomendáis para laminar en un taller sin horno, y si tenéis un distribuidor o técnico que pueda asesorarnos en la primera pieza?\n\nGracias,\n[Nombre]\n[Teléfono] · [correo]\nhumanity.wiki',
      quePedimos: ['Precio unitario de cada material (sin IVA) y precio para la cantidad completa', 'Plazo de entrega', 'Mínimo de pedido por referencia', 'Ficha técnica de la resina y del gelcoat (tiempo de gel, temperatura de uso)', 'Recomendación de laminado para 1,8 mm con alma de 5 mm', 'Condiciones de pago y envío'],
    },
    {
      para: 'Modelporex', canal: 'correo', idioma: 'es',
      asunto: 'Presupuesto de moldes fresados desde STEP para la carrocería de un prototipo de vehículo ligero',
      cuerpo: 'Hola,\n\nSomos el proyecto Aeromóvil 1 de humanity.wiki. Tenemos la carrocería de un vehículo ligero de cuatro ruedas (3,94 × 1,55 × 1,11 m) modelada en STEP y queremos fresar los moldes para laminar la piel en fibra de vidrio con vacío.\n\nEl despiece es de [8–10] piezas: morro, capó, dos costados, cubierta, cola, marco de cúpula y dos puertas. Adjuntamos el STEP y el plano de despiece.\n\n¿Nos podéis presupuestar los moldes en poliuretano de alta densidad (o el material que recomendéis), con la superficie sellada y lista para encerar?\n\nNos interesa saber también si podéis fabricar una cuna de montaje para posicionar las piezas sobre el chasis.\n\nGracias,\n[Nombre]\n[Teléfono] · [correo]',
      quePedimos: ['Precio por molde y precio del conjunto (sin IVA)', 'Material del molde y densidad', 'Precisión de fresado (± mm) y acabado de superficie', 'Plazo de fabricación', 'Si incluye sellado y pulido o lo hacemos nosotros', 'Transporte: medidas máximas de bloque que pueden fresar y enviar', 'Condiciones de pago'],
    },
    {
      para: 'Mecaplex', canal: 'correo', idioma: 'en',
      asunto: 'Quotation request: thermoformed polycarbonate windscreen and two side windows for a light-vehicle prototype',
      cuerpo: 'Dear Mecaplex team,\n\nWe are Aeromóvil 1, an open project by humanity.wiki (Spain) building the first prototype of a lightweight four-wheel electric vehicle (EU category L7e). The cabin has a windscreen that is flat side-to-side but curved in profile (it rises from the bonnet and meets the roof tangentially), plus two nearly flat door windows.\n\nWe would like a quotation for:\n- 1 windscreen, polycarbonate 4 mm with hard coat and UV filter, thermoformed to the attached STEP surface (approx. [W] × [H] mm).\n- 2 side windows, polycarbonate 3–4 mm, same coating (approx. [W] × [H] mm each).\n- Optionally 1 spare side window.\n\nCould you tell us whether you can work from our STEP file, what minimum bend radius the hard-coated sheet allows, and whether any of your glazing is marked under UN Regulation No. 43 for road use?\n\nThank you,\n[Name]\n[Phone] · [e-mail]\nhumanity.wiki',
      quePedimos: ['Unit price and price for 10 units (excl. VAT)', 'Lead time', 'Minimum order', 'Material datasheet (thickness, coating, UV)', 'Whether the part can carry a UN R43 marking', 'Tooling cost and whether the mould stays ours', 'Payment and shipping terms'],
    },
    {
      para: 'Solbian', canal: 'correo', idioma: 'en',
      asunto: 'Flexible solar panels for the roof and bonnet of an electric light-vehicle prototype',
      cuerpo: 'Dear Solbian team,\n\nWe are Aeromóvil 1 (humanity.wiki, Spain), building the first prototype of a four-wheel electric light vehicle with solar panels integrated in the roof, bonnet and rear deck. The roof is flat across and curves gently down to the tail; usable areas are approx. roof [X] m², bonnet [X] m², side decks 2 × [X] m².\n\nWe would like:\n- A quotation for catalogue panels that fit those areas (for example SP 144 and SP 118 Q), with the ETFE front sheet and rear junction box.\n- To know whether an SP Custom panel could be laminated to our roof shape (STEP attached), and its price and minimum order.\n- Your recommended adhesive and the maximum bending radius of the panel.\n\nThe panels will feed a 96 V traction battery through an MPPT controller. Who serves Spain today (Solbian Italy or a distributor)?\n\nThank you,\n[Name]\n[Phone] · [e-mail]',
      quePedimos: ['Unit price and price for 10 units (excl. VAT)', 'Lead time', 'Minimum order for custom panels', 'Datasheet: W, dimensions, weight, thickness, cell efficiency', 'Maximum bending radius and adhesive', 'Warranty and certifications', 'Who distributes in Spain'],
    },
    {
      para: 'SUNBEAMsystem', canal: 'correo', idioma: 'en',
      asunto: 'Quotation: Tough series flexible panels for a solar-assisted electric vehicle prototype',
      cuerpo: 'Hello,\n\nWe are Aeromóvil 1 (humanity.wiki, Spain), building a prototype of a light electric vehicle with solar panels bonded to the roof and bonnet. We are comparing flexible panels and would like a quotation for Tough 111 W Flush and Tough 58 W Flush (or whichever sizes best cover a roof of approx. [L] × [W] mm with gentle single curvature).\n\nPlease also tell us the maximum bending radius, the recommended adhesive for a painted composite surface, and the panel weight.\n\nThank you,\n[Name]\n[Phone] · [e-mail]',
      quePedimos: ['Unit price and price for 10 units (excl. VAT)', 'Lead time and minimum order', 'Datasheet (W, size, weight, thickness)', 'Bending radius and adhesive', 'Warranty', 'Shipping to Spain'],
    },
    {
      para: 'Sono Solar (Sono Motors GmbH)', canal: 'formulario web', idioma: 'en',
      asunto: 'Solar body panels for a small-series light electric vehicle (L7e) — feasibility and pricing',
      cuerpo: 'Dear Sono Solar team,\n\nWe are Aeromóvil 1, an open-source project by humanity.wiki (Spain) developing a four-wheel light electric vehicle (L7e, ~385 kg, 27 kWh) with the roof, bonnet and rear deck covered by solar cells. We are building the first prototype now and plan a small series afterwards.\n\nWe would like to know whether your 3D-shaped solar body panels could be produced for our roof (approx. [X] m², single curvature, STEP available) and bonnet, what the tooling and unit cost would be for 1 and for 10 vehicles, and whether your charge electronics can feed a 96 V traction battery.\n\nThank you,\n[Name]\n[Phone] · [e-mail]',
      quePedimos: ['Feasibility for a one-off prototype and for 10 units', 'Tooling cost and unit price', 'Lead time', 'Panel datasheet (W/m², kg/m², thickness)', 'Electronics compatible with a 96 V battery', 'Minimum order'],
    },
    {
      para: 'EMKA', canal: 'correo', idioma: 'es',
      asunto: 'Perfil de junta EPDM a medida para parabrisas y ventanillas de un prototipo de vehículo ligero',
      cuerpo: 'Hola,\n\nSomos el proyecto Aeromóvil 1 de humanity.wiki. Estamos construyendo el primer prototipo de un vehículo eléctrico ligero con carrocería de fibra y cristales de policarbonato de [4] mm pegados sobre un marco de fibra de [3] mm de canto.\n\nNecesitamos unos [12] metros de perfil de junta de EPDM que cubra el borde del cristal y el canto de la fibra (anchura visible ≈ 25 mm), más [6] metros de junta de puerta. ¿Tenéis un perfil de catálogo que encaje, y si no, cuál es el coste de un perfil a medida y su mínimo?\n\nGracias,\n[Nombre]\n[Teléfono] · [correo]',
      quePedimos: ['Referencia de catálogo que encaje (o coste del perfil a medida)', 'Precio por metro y por rollo (sin IVA)', 'Mínimo de pedido', 'Plazo', 'Ficha técnica (dureza, resistencia UV, temperatura)', 'Muestras'],
    },
    {
      para: 'IDR/UPM (Instituto «Ignacio Da Riva»)', canal: 'formulario web', idioma: 'es',
      asunto: 'Consulta: ensayo en túnel de viento de una maqueta a escala de un vehículo ligero',
      cuerpo: 'Buenos días,\n\nSomos el proyecto Aeromóvil 1 de humanity.wiki, un vehículo eléctrico ligero de cuatro ruedas (3,94 m) con carrocería aerodinámica inspirada en el SZEmission de la Shell Eco-marathon. Tenemos la geometría en STEP y un cálculo CFD propio; querríamos contrastarlo con una medida en túnel de viento.\n\n¿Ensayan vehículos o maquetas de vehículos en el túnel ACLA16? En ese caso, ¿qué escala de maqueta recomiendan, qué miden (fuerzas, Cd), cuánto dura un ensayo y cuál es su tarifa para un proyecto sin ánimo de lucro?\n\nGracias,\n[Nombre]\n[Teléfono] · [correo]',
      quePedimos: ['Si ensayan vehículos y a qué escala', 'Tarifa por hora o por ensayo', 'Qué entregan (Cd, fuerzas, visualización)', 'Plazo para reservar', 'Quién hace la maqueta y qué precisión necesita'],
    },
    {
      para: 'SZEnergy Team (Universidad Széchenyi, Győr)', canal: 'correo', idioma: 'en',
      asunto: 'An open-source road vehicle inspired by SZEmission — a few questions from Spain',
      cuerpo: 'Dear SZEnergy Team,\n\nCongratulations on your results at Shell Eco-marathon. We are Aeromóvil 1, an open project by humanity.wiki (Spain): a four-wheel road-legal light electric vehicle (L7e) whose body shape is openly inspired by SZEmission, enlarged and adapted to a tandem 1+1 cabin. Our 3D model, drawings and component list are public on humanity.wiki.\n\nWe are about to build the first prototype and would be grateful for your advice on three points:\n1. Which lay-up (fibres, core, resin, cure) you used for the body and what it weighs per m².\n2. How you made the moulds (CNC-milled foam? from which supplier?).\n3. How your published Cd of 0.1365 was measured (CFD, wind tunnel, coast-down).\n\nWe would be happy to credit the team and to share back whatever we learn.\n\nBest regards,\n[Name]\n[Phone] · [e-mail]\nhumanity.wiki',
      quePedimos: ['Body lay-up and weight per m²', 'Mould method and supplier', 'How the Cd was measured', 'Whether they would accept a short video call'],
    },
  ],
  referencias: [
    { titulo: 'Reglamento (UE) n.º 168/2013 — homologación de vehículos de categoría L (texto en español, DOUE)', url: 'https://boe.gob.es/doue/2013/060/L00052-00128.pdf', nota: 'Define el cuadriciclo pesado L7e y remite a los reglamentos delegados. Es la ley que decide qué es nuestro coche.' },
    { titulo: 'Reglamento Delegado (UE) n.º 3/2014 — seguridad funcional de los vehículos L (texto en español, DOUE)', url: 'https://www.boe.es/doue/2014/007/L00001-00102.pdf', nota: 'Aquí están los requisitos de acristalamiento, limpiaparabrisas y campo de visión para L7e; remite al Reglamento ONU 43.' },
    { titulo: 'Reglamento Delegado (UE) 3/2014 — anexos (incluido el VII, acristalamiento), versión de legislation.gov.uk', url: 'https://www.legislation.gov.uk/eur/2014/3/attachment/1', nota: 'Anexo VII, punto 2.1.2: parabrisas de plástico rígido solo en L1e–L5e. Es la línea que obliga a vidrio en el parabrisas de un L7e que circule. Leído el 2026-11-07; contrastar con el texto del DOUE.' },
    { titulo: 'Reglamento ONU n.º 43 — vidrios de seguridad y su instalación (publicado en el DOUE)', url: 'https://eur-lex.europa.eu/eli/reg/2014/43(2)/oj/eng', nota: 'Qué se admite como parabrisas y ventanillas, incluido el plástico rígido; su anexo 21 es el que cita el 3/2014 para los vehículos L.' },
    { titulo: 'Ficha técnica Solbian serie SP (distribuida por Sailectron)', url: 'https://www.seapower.hr/wp-content/uploads/2023/01/Datasheet-SP.pdf', nota: 'SP 144: 144 W, 1490 × 546 mm, 1,9 kg, 2 mm; células SunPower de contacto posterior. Sirve para comprobar los 200 W/m² y 2,2 kg/m² del modelo.' },
    { titulo: 'SABIC: plancha de policarbonato formable con capa dura para acristalamiento (Plastics Today)', url: 'https://www.plasticstoday.com/automotive-and-mobility/sabic-introduces-formable-hard-coated-polycarbonate-sheet-glazing', nota: 'Explica que la capa dura de las planchas Margard limita el curvado y que hay una variante formable.' },
    { titulo: 'Folleto Lexan Margard (Polymershapes, distribuidor)', url: 'https://www.polymershapes.com/wp-content/uploads/2020/04/Polymershapes_SABIC_Brochure-LEXAN-MARGARD-SHEET-protection-performance.pdf', nota: 'Propiedades, espesores y resistencia a la abrasión del policarbonato con capa dura.' },
    { titulo: 'Túnel de viento ACLA16 del IDR/UPM', url: 'https://www.upm.es/recursosidi/infraestructura/tunel-de-viento-acla16/', nota: 'Ficha oficial del túnel: aplicaciones, responsable y formulario de contacto. No publica tarifas.' },
    { titulo: 'Catálogo de servicios de AIMPLAS para automoción (PDF)', url: 'https://contenidos.aimplas.es/hubfs/Catalogos-ENG/automotive-plastics-aimplas.pdf', nota: 'Qué ensayos hacen a piezas de plástico y composite, con laboratorio acreditado ISO 17025.' },
    { titulo: 'SZEnergy Team: sus coches de competición (SZEmission)', url: 'https://szenergy.hu/en/our-racing-cars/', nota: 'Datos publicados del coche en que se inspira nuestra forma: 95 kg, Cd 0,1365, monocasco de carbono.' },
    { titulo: 'Reglas globales de la Shell Eco-marathon', url: 'https://www.shellecomarathon.com/about/global-rules.html', nota: 'De aquí sale el hueco mínimo de puerta de 500 × 800 mm que comprueba el 3D, y los requisitos de visibilidad y parabrisas de los UrbanConcept.' },
    { titulo: 'Aptera y los composites: cómo se hace su carrocería (CompositesWorld)', url: 'https://www.compositesworld.com/news/on-atypical-for-most-of-us-modes-of-transportation', nota: 'El otro coche en que se inspira la cabina (parabrisas, puertas de gaviota, morro): qué materiales y procesos usa.' },
    { titulo: 'SimScale: simulación CFD de flujo sobre un vehículo (proyecto público de ejemplo)', url: 'https://www.simscale.com/projects/agarc_a_carriz/incompressible_cfd_simulation_over_a_vehicle/', nota: 'Una plantilla pública de CFD externo que se puede copiar para calcular nuestro Cd.' },
    { titulo: 'Catálogo de proveedores de Catalunya: ficha de Modelporex', url: 'https://suppliers.catalonia.com/detail/modelporex-sl/1879', nota: 'Confirma qué hace el taller de moldes (materiales, sectores, dirección) antes de escribirles.' },
  ],
  revisado: { fecha: '2026-11-06', por: 'bot de producto y compras (Claude), con webs comprobadas el mismo día' },
};
