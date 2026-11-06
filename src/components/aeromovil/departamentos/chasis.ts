import type { Departamento } from './tipos';

/**
 * Chasis y estructura del Aeromóvil 1 (escrito el 2026-11-06 por un bot a
 * partir de `componentes.ts`, `geometriaA1.ts` (función `tubosEstructuraV1`),
 * `chasisCelosia.ts` (la versión 2, pendiente), el changelog del día y
 * búsquedas en la web). Precios con fuente; lo no comprobado dice «por
 * confirmar». Webs de partners encontradas de verdad; `verificado: false` =
 * no se pudo confirmar que hagan exactamente esto.
 *
 * Lo que hay hoy en el 3D (versión 1, «largueros»): dos largueros Ø 40 × 2 mm
 * entre ejes que suben con el fondo hacia el morro y la cola, siete
 * travesaños Ø 32 × 2, torretas delanteras para las columnas McPherson, arco
 * del salpicadero, estribos Ø 32 × 2 (los tubos bajo las puertas), soporte
 * bajo del amortiguador trasero tumbado, pies y travesaño del suelo del
 * maletero; todo en aluminio 6061-T6. Y en acero cromoly: los dos montantes
 * del parabrisas (Ø 30 × 2), el arco de seguridad entre piloto y pasajero
 * (Ø 38 × 2,5, sigue la cúpula por dentro de estribo a estribo) y sus pies.
 * La versión 2 («celosía», triangulada como un Caterham Seven) la está
 * diseñando otro bot sobre los mismos puntos duros (`ContextoChasis`).
 *
 * Vocabulario (explicado al aparecer): larguero, travesaño, celosía, nudo,
 * torreta, estribo, arco de seguridad, 6061-T6, cromoly, TIG, T6, entallado,
 * plantilla de soldadura, rigidez a torsión, FEA, par galvánico.
 */
export const DEPARTAMENTO: Departamento = {
  id: 'chasis', nombre: 'Chasis y estructura', lema: 'el esqueleto: largueros, celosía, arco de seguridad y anclajes',
  mision:
    'Fabricar el esqueleto que ya está dibujado tubo a tubo en el 3D: una estructura tubular soldada que lleva al piloto, al pasajero y los 160 kg de batería, sostiene la carrocería, recibe la suspensión en sus torretas y pivotes, y protege a las personas con el arco de seguridad y los montantes de acero. Para el prototipo 1 hay que elegir entre la versión 1 (largueros y travesaños, la que está hoy en el 3D) y la versión 2 (celosía triangulada), decidir el material (el 3D propone aluminio 6061-T6 con tratamiento T6 tras soldar; la alternativa es acero cromoly, que se suelda y ya está), resolver cómo se une el arco de acero a un chasis de aluminio (no se pueden soldar entre sí), cortar, soldar, medir y ensayar. El chasis estimado pesa 19–25 kg más 6 kg de uniones y herrajes; su coste estimado en `componentes.ts` es el tubo (9 €/m en aluminio, 16 €/m en cromoly) más 900 € de soldadura con plantilla y 300 € de T6.',
  responsabilidades: [
    'Los puntos duros: las coordenadas exactas donde anclan suspensión, dirección, batería, motor, asientos, cinturones, carrocería y cúpula (`ContextoChasis` en el 3D). Nadie los mueve sin avisar aquí.',
    'La elección de versión (largueros o celosía) y de material (aluminio 6061-T6 o cromoly) para el prototipo 1, con sus números: peso, coste, rigidez y facilidad de reparación.',
    'El cálculo estructural: la viga entre ejes que ya comprueba el 3D (coeficiente de seguridad), más la rigidez a torsión (cuánto se retuerce el chasis entre eje delantero y trasero: lo que decide si el coche se siente «de una pieza»), las cargas de la suspensión y del arco.',
    'El arco de seguridad y los montantes del parabrisas: tubo, radio de curvado, cómo se unen al resto y qué carga tienen que aguantar.',
    'Los planos de fabricación: lista de corte (el 3D ya la genera: largo, diámetro, pared, ángulos de los extremos), DXF de las plantillas de curvado y el plano de la bancada de soldadura.',
    'La compra de tubo y herrajes, y la elección del taller de corte, curvado y soldadura.',
    'La soldadura y lo que viene después: probetas, tratamiento térmico (si es aluminio), medición del chasis contra el CAD, protección contra la corrosión.',
    'Los ensayos: torsión en bancada con el chasis desnudo, carga estática sobre el arco, y qué ensayo de choque haría falta para homologar (no para el prototipo 1).',
    'Los anclajes de todo lo demás: insertos y pletinas para la carrocería, cinturones de cuatro puntos, módulos de batería de 9 cm, motor, reductora, cargador y suelo del maletero.',
    'El registro: peso real del chasis frente a los 19–25 kg estimados, coste real frente al estimado, y lo aprendido para la versión 2.',
  ],
  parametros: ['spineD', 'spineT', 'matChasis', 'chasis', 'extraChasis', 'clear'],
  componentes: ['chasis'],
  tareas: [
    {
      titulo: 'Congelar los puntos duros del chasis',
      detalle: 'Sacar del 3D (`contextoChasis()`) la lista de nudos (los puntos donde se cruzan o terminan tubos) con sus coordenadas: torretas delanteras, pivotes de los brazos tirados, soporte del amortiguador trasero, cremallera, arco del salpicadero, estribos, arco de seguridad, suelo del maletero, módulos de batería, motor. Escribirla en una tabla con fecha. A partir de aquí, cualquier cambio de batalla (2,05 m), vías (1,22/1,00 m) o altura de bajos (19 cm) pasa por este departamento.',
      prioridad: 'alta', semanas: 0.5, entregable: 'Tabla de puntos duros (nombre, x, y, z en mm) «versión A», con fecha, y el STEP del chasis exportado.',
    },
    {
      titulo: 'Decidir material y versión para el prototipo 1',
      detalle: 'Ver las decisiones «Material del chasis» y «Largueros o celosía». La recomendación es cromoly (acero al cromo-molibdeno 25CrMo4 / 4130) para todo el chasis del prototipo 1, versión 1 (largueros), y dejar el aluminio y la celosía para el prototipo 2 con los datos del primero. Cambiar `matChasis` en el diseño y comprobar que el peso y el coeficiente de seguridad del 3D siguen bien.',
      prioridad: 'alta', semanas: 0.5, dependeDe: ['Congelar los puntos duros del chasis'], entregable: 'Decisión escrita con los tres números: peso del chasis, coste estimado y coeficiente de seguridad de la viga, para la opción elegida y para la descartada.',
    },
    {
      titulo: 'Resolver la unión del arco de acero con el resto del chasis',
      detalle: 'En el 3D el arco de seguridad, sus pies y los montantes del parabrisas son de acero y el resto de aluminio. Acero y aluminio no se sueldan entre sí y, en contacto con agua, el aluminio se corroe (par galvánico). Si se elige cromoly para todo, el problema desaparece: se suelda. Si se mantiene aluminio, diseñar pletinas atornilladas con junta aislante en los cuatro pies (dos del arco, dos de los montantes) y en los dos puntos de los estribos.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Decidir material y versión para el prototipo 1'], entregable: 'Plano de las seis uniones acero-aluminio (o nota de que no hacen falta por ser todo acero).',
    },
    {
      titulo: 'Calcular la rigidez a torsión y las cargas de suspensión (FEA)',
      detalle: 'FEA = cálculo por ordenador que divide la estructura en trocitos y mira cuánto se deforma cada uno. El 3D ya calcula la viga entre ejes (coeficiente de seguridad con piloto, pasajero y batería). Falta: (1) la torsión: aplicar un par entre las torretas delanteras con el eje trasero fijo y sacar N·m por grado; (2) las cargas de bache (3 veces el peso en una rueda) y de frenada en las torretas y los pivotes; (3) el arco de seguridad con una carga lateral y otra vertical del orden de las que pide la FIA para jaulas (ver referencia, Lista Técnica 35). Se puede hacer en FreeCAD (gratis) o encargarlo a la UMH o a una ingeniería.',
      prioridad: 'alta', semanas: 2, dependeDe: ['Decidir material y versión para el prototipo 1'], entregable: 'Informe con rigidez a torsión (N·m/°), tensión máxima en cada caso de carga frente al límite del material (240 MPa aluminio soldado y tratado, 460 MPa cromoly), y los tubos que hay que engordar.',
    },
    {
      titulo: 'Terminar y comparar la versión 2 (celosía)',
      detalle: 'La función `tubosCelosia` de `chasisCelosia.ts` está vacía: la rellena otro bot. Cuando esté, usar `evaluarChasis` para comparar las dos versiones con los mismos puntos duros: masa, número de tubos, metros, nudos, triángulos y rigidez. Un chasis triangulado como el Caterham gana rigidez a torsión con tubos más finos, a cambio de muchos más cortes y soldaduras.',
      prioridad: 'media', semanas: 2, dependeDe: ['Calcular la rigidez a torsión y las cargas de suspensión (FEA)'], entregable: 'Tabla versión 1 vs versión 2: kg, m de tubo, n.º de nudos, N·m/° y horas de soldadura estimadas.',
    },
    {
      titulo: 'Revisar la lista de corte y los DXF que genera el 3D',
      detalle: 'El 3D produce la lista de corte (largo, diámetro, pared, material, y «curvar con la plantilla del DXF» para los tubos curvos) y los planos. Revisar tubo a tubo: que los extremos lleven el entallado (el recorte en «boca de pez» para que un tubo abrace a otro), que los largos incluyan 2 % de margen y que los tubos curvos (arco, montantes, largueros que suben en las puntas) tengan radio de curvado compatible con una curvadora de rodillos (radio mínimo ≈ 3 veces el diámetro, por confirmar con el taller).',
      prioridad: 'alta', semanas: 1, dependeDe: ['Decidir material y versión para el prototipo 1'], entregable: 'Lista de corte revisada y DXF por tubo, numerados como en el 3D.',
    },
    {
      titulo: 'Diseñar la bancada (plantilla) de soldadura',
      detalle: 'Una mesa plana con topes que sujeta cada tubo en su sitio mientras se suelda; sin ella el chasis sale torcido por la contracción de la soldadura. Diseñarla a partir de los puntos duros: una base de perfil de acero o tablero fenólico con cunas cortadas a láser en las coordenadas de las torretas, pivotes y estribos.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Congelar los puntos duros del chasis'], entregable: 'Plano de la bancada y DXF de las cunas; lista de material.',
    },
    {
      titulo: 'Pedir presupuesto de tubo',
      detalle: 'Cromoly: Osborn Metals (Francia) vende 25CrMo4 en medidas de competición desde 300 € el pedido mínimo (orientativo, según su ficha en DirectIndustry); pedir Ø 40 × 2, Ø 32 × 2, Ø 30 × 2, Ø 38 × 2,5 y Ø 25 × 1,5 en los metros de la lista de corte más un 15 %. Aluminio 6061-T6: Alu-Stock (`componentes.ts` estima 9 €/m el Ø 40 × 2; confirmar). Para medidas sueltas, RS Components vende tubo de aluminio por metro.',
      prioridad: 'alta', semanas: 0.5, dependeDe: ['Revisar la lista de corte y los DXF que genera el 3D'], entregable: 'Dos presupuestos de tubo (cromoly y aluminio) con precio por metro, longitudes de barra, mínimo y plazo.',
    },
    {
      titulo: 'Pedir presupuesto de corte láser de tubo y curvado',
      detalle: 'Un láser de tubo corta cada tubo a su largo con el entallado ya hecho y marcado, desde el DXF: ahorra días de amoladora y mejora el ajuste. Initube (Lliçà de Vall, Barcelona) hace corte láser y mecanizado de tubo; preguntar si curvan o quién curva el arco y los montantes.',
      prioridad: 'alta', semanas: 0.5, dependeDe: ['Revisar la lista de corte y los DXF que genera el 3D'], entregable: 'Presupuesto de corte (por tubo y total), de curvado, y plazo.',
    },
    {
      titulo: 'Elegir el taller de soldadura y el soldador',
      detalle: 'TIG = soldadura con electrodo de tungsteno y gas, la que se usa en tubo fino de competición. Para cromoly hace falta un soldador con experiencia en tubo de pared 1,5–2,5 mm; para aluminio, además, uno cualificado en aluminio (certificado EN ISO 9606-2) y un horno de T6 después. Visitar dos talleres (chasis de kart-cross, cuadros de bici, calderería fina), enseñar la lista de corte y pedir precio por el chasis completo soldado en nuestra bancada.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Diseñar la bancada (plantilla) de soldadura', 'Pedir presupuesto de corte láser de tubo y curvado'], entregable: 'Taller elegido, precio (`componentes.ts` estima 900 €), horas y fecha; nombre y cualificación del soldador.',
    },
    {
      titulo: 'Soldar probetas y romperlas',
      detalle: 'Antes del chasis, soldar tres uniones en T con el mismo tubo, el mismo soldador y los mismos parámetros, y ensayarlas a tracción o doblado (la UMH ofrece ensayos estáticos; INSIA también). En aluminio, una probeta con T6 y otra sin: la diferencia es lo que recupera el tratamiento (el 3D supone el 90 %).',
      prioridad: 'alta', semanas: 1, dependeDe: ['Elegir el taller de soldadura y el soldador'], entregable: 'Tres probetas ensayadas: carga de rotura y dónde rompió (en el tubo o en la soldadura).',
    },
    {
      titulo: 'Construir la bancada y recibir los tubos',
      detalle: 'Montar la bancada en el taller de soldadura, nivelarla y comprobar las cunas con una cinta y un nivel láser contra la tabla de puntos duros (±1 mm). Recibir, contar y numerar los tubos cortados.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Pedir presupuesto de tubo', 'Pedir presupuesto de corte láser de tubo y curvado', 'Elegir el taller de soldadura y el soldador'], entregable: 'Bancada montada y medida; tubos numerados en estantería.',
    },
    {
      titulo: 'Soldar el chasis del prototipo 1',
      detalle: 'Punteado completo en la bancada (soldaduras cortas que fijan todo), medición, y después cordones definitivos alternando lados para repartir la contracción. Fotografiar cada nudo. Dejar sin soldar las pletinas de anclaje de la carrocería hasta el montaje en seco.',
      prioridad: 'alta', semanas: 2, dependeDe: ['Construir la bancada y recibir los tubos', 'Soldar probetas y romperlas'], entregable: 'Chasis soldado, con fotos de cada nudo y el peso en báscula.',
    },
    {
      titulo: 'Tratamiento térmico (solo si el chasis es de aluminio)',
      detalle: 'La soldadura destempla el 6061-T6 alrededor de cada cordón; el tratamiento T6 (calentar a ≈ 530 °C, enfriar rápido en agua y envejecer a ≈ 175 °C unas horas) lo recupera, pero un chasis de 3 m puede retorcerse en el temple. Hace falta un horno grande (Bodycote u otro tratamientista con cuba de temple de 3,5 m) y volver a medir después. En cromoly no hay tratamiento: como mucho un alivio de tensiones a 600 °C, opcional.',
      prioridad: 'media', semanas: 2, dependeDe: ['Soldar el chasis del prototipo 1'], entregable: 'Certificado del tratamiento (temperaturas y tiempos) y medición del chasis después.',
    },
    {
      titulo: 'Medir el chasis contra el CAD',
      detalle: 'Con el chasis en la bancada, medir los puntos duros con cinta, escuadra y nivel láser (o con un brazo de medición si el taller lo tiene) y compararlos con la tabla «versión A». Lo que importa: que las torretas delanteras y los pivotes traseros estén a ±1 mm, porque de ahí sale la alineación de las ruedas.',
      prioridad: 'alta', semanas: 0.5, dependeDe: ['Soldar el chasis del prototipo 1'], entregable: 'Tabla puntos duros: CAD vs real (desviación en mm) y lista de correcciones.',
    },
    {
      titulo: 'Ensayo de torsión en bancada',
      detalle: 'Fijar el eje trasero a la bancada, colgar un peso conocido en un brazo sobre una torreta delantera y medir con dos relojes comparadores cuánto gira el eje delantero. Rigidez = par / ángulo. Compararla con el FEA; si la real es menos de la mitad de la calculada, hay un nudo mal soldado o un tubo que falta.',
      prioridad: 'media', semanas: 0.5, dependeDe: ['Medir el chasis contra el CAD'], entregable: 'Rigidez a torsión medida (N·m/°) frente a la calculada.',
    },
    {
      titulo: 'Soldar los anclajes de lo demás',
      detalle: 'Pletinas y soportes para: carrocería (donde «Carrocería» ponga los insertos, tras el montaje en seco), cinturones de cuatro puntos (con placas de refuerzo), módulos de batería de 9 cm (bandejas sobre el suelo del chasis), motor y reductora (silentblocks), cargador bajo el salpicadero, suelo del maletero. Cada anclaje de cinturón y de batería lleva su propio cálculo.',
      prioridad: 'alta', semanas: 1.5, dependeDe: ['Medir el chasis contra el CAD', 'Carrocería: Montaje en seco sobre el chasis'], entregable: 'Chasis con todos los anclajes; plano actualizado.',
    },
    {
      titulo: 'Proteger contra la corrosión',
      detalle: 'El cromoly se oxida: limpiar, imprimación epoxi y pintura (o recubrimiento en polvo, que necesita horno de 200 °C). El aluminio solo necesita limpieza y, en las uniones con acero, junta aislante. Pintar después del ensayo de torsión y antes de montar nada.',
      prioridad: 'media', semanas: 0.5, dependeDe: ['Ensayo de torsión en bancada'], entregable: 'Chasis pintado; ficha de la pintura.',
    },
    {
      titulo: 'Ensayo de carga estática sobre el arco de seguridad',
      detalle: 'Con el chasis desnudo, aplicar sobre el arco una carga vertical y otra lateral con gato y célula de carga, en escalones, hasta la carga de diseño del FEA, midiendo la deformación. Es el ensayo que dice si el arco protege de verdad. Hacerlo con la UMH o INSIA, que tienen bancada y célula.',
      prioridad: 'media', semanas: 1, dependeDe: ['Calcular la rigidez a torsión y las cargas de suspensión (FEA)', 'Ensayo de torsión en bancada'], entregable: 'Curva carga-deformación del arco y deformación permanente al descargar.',
    },
    {
      titulo: 'Documentar el camino a homologación del chasis',
      detalle: 'Un L7e no pasa un choque frontal como un coche, pero el Reglamento Delegado (UE) 44/2014 fija requisitos de construcción y el 3/2014 de seguridad funcional; y si se quiere vender como vehículo completo, el servicio técnico (Applus IDIADA, INSIA en lo suyo) dirá qué ensayos de estructura exige. Para el prototipo 1 basta con saberlo y escribirlo; el ensayo se paga en el prototipo 2.',
      prioridad: 'baja', semanas: 1, dependeDe: ['Decidir material y versión para el prototipo 1'], entregable: 'Nota de dos páginas con los artículos que afectan al chasis y la lista de ensayos que pediría un servicio técnico, con su coste orientativo.',
    },
    {
      titulo: 'Cerrar el registro de peso y coste del chasis',
      detalle: 'Escribir en la ficha «Chasis tubular» el peso real en báscula, el coste real (tubo + corte + soldadura + tratamiento + pintura) y el proveedor, para que el 3D calcule con lo que pasó de verdad y la versión 2 arranque de ahí.',
      prioridad: 'media', semanas: 0.25, dependeDe: ['Proteger contra la corrosión'], entregable: 'Ficha «Chasis» rellena en «La pieza real, escrita a mano» y una línea en el changelog.',
    },
  ],
  decisiones: [
    {
      tema: 'Material del chasis: aluminio 6061-T6, acero cromoly o tubo de carbono',
      contexto: 'El 3D está en aluminio 6061-T6 (19 kg de tubo + 6 kg de herrajes). El material fija el peso, el coste, si hace falta horno después de soldar y si el arco de acero se puede soldar al resto.',
      opciones: [
        { nombre: 'Aluminio 6061-T6, soldado TIG y tratado T6 después', pros: 'El más ligero de los tres soldables (≈ 19 kg de tubo); es lo que tiene hoy el 3D.', contras: 'La soldadura destempla el material: sin T6 pierde más de la mitad de la resistencia; el T6 de un chasis de 3 m retuerce y necesita un horno y una cuba grandes; el arco de acero no se puede soldar a él (seis uniones atornilladas con aislante); se repara mal en carretera.', coste: 'Tubo ≈ 9 €/m (Alu-Stock, estimación de `componentes.ts`) + soldadura ≈ 900 € + T6 ≈ 300 € (estimaciones de `componentes.ts`; el T6 real de 3 m por confirmar con Bodycote)' },
        { nombre: 'Acero cromoly (25CrMo4 / AISI 4130), soldado TIG, sin tratamiento', pros: 'Se suelda y ya está; el arco y los montantes se sueldan al resto; tubos más finos (1,5 mm) por su resistencia (460 MPa); se repara en cualquier taller; es lo que usan jaulas, kart-cross y Formula Student.', contras: 'Unos 6 kg más que el aluminio (≈ 25 kg de tubo); hay que pintarlo para que no se oxide.', coste: '≈ 1.500 € en total según `componentes.ts` (tubo ≈ 16 €/m); Osborn Metals vende 25CrMo4 en medidas de competición desde 300 € el pedido (orientativo, DirectIndustry)' },
        { nombre: 'Tubo de carbono pultrusionado con uniones de aluminio encoladas', pros: 'La mitad de peso (≈ 11 kg).', contras: 'Sin soldadura: cada nudo es una pieza mecanizada y encolada; caro; un golpe lo astilla sin avisar.', coste: '≈ 4.800 € según `componentes.ts`' },
      ],
      recomendacion: 'Cromoly para todo el chasis del prototipo 1.',
      porQue: 'Quita de golpe tres riesgos del aluminio (horno de T6, retorcido en el temple, unión acero-aluminio) a cambio de 6 kg, que es el 1,5 % del coche. Cuando el prototipo 1 ruede y se sepa qué tubos sobran, el aluminio o la celosía en el prototipo 2 ahorrarán peso con conocimiento. Cambiar a aluminio después cuesta un chasis nuevo, no una modificación: por eso se decide ahora y se escribe.',
      cuando: 'antes de diseñar',
    },
    {
      tema: 'Largueros y travesaños (versión 1) o celosía triangulada (versión 2)',
      contexto: 'La versión 1 está dibujada tubo a tubo y tiene lista de corte; la versión 2 la está diseñando otro bot con los mismos puntos duros. Una celosía (muchos tubos finos formando triángulos, como el Caterham Seven) es mucho más rígida a torsión por kilo, pero tiene el doble o el triple de cortes y soldaduras.',
      opciones: [
        { nombre: 'Versión 1: dos largueros Ø 40 × 2 y travesaños', pros: 'Pocos tubos (≈ 40), cortes sencillos, bancada simple; ya tiene cálculo de viga y lista de corte.', contras: 'Poca rigidez a torsión: un chasis de «escalera» se retuerce; el 3D no lo calcula todavía.', coste: 'Tubo + ≈ 900 € de soldadura (estimación de `componentes.ts`)' },
        { nombre: 'Versión 2: celosía triangulada', pros: 'Rigidez a torsión varias veces mayor con tubos de Ø 25 × 1,5; es como se hacen los chasis tubulares de verdad.', contras: 'Más tubos (60–100), más entallados y más horas de soldadura; el diseño no está terminado.', coste: 'Por calcular con `evaluarChasis` cuando esté; estimar el doble de horas de soldadura' },
        { nombre: 'Versión 1 reforzada: largueros + diagonales en los dos planos laterales y en el suelo', pros: 'Gana buena parte de la rigidez de la celosía con una docena de tubos más; sale de la versión 1 sin rediseñar.', contras: 'Hay que recalcular; las diagonales del suelo compiten con las bandejas de batería.', coste: '≈ 10–12 tubos más (+ 15 % de tubo y horas, estimación propia)' },
      ],
      recomendacion: 'Versión 1 reforzada con diagonales para el prototipo 1; versión 2 cuando su diseño esté terminado y comparado.',
      porQue: 'El prototipo 1 tiene que existir pronto para medir lo que el 3D solo estima; una celosía sin terminar lo retrasa semanas. Las diagonales son baratas y se deciden con el FEA de torsión. Lo que se aprenda de la bancada y del soldador sirve igual para la celosía.',
      cuando: 'antes de diseñar',
    },
    {
      tema: 'Cómo se unen el arco de seguridad y los montantes de acero al chasis',
      contexto: 'Solo existe si el chasis es de aluminio. En el 3D hay seis puntos donde el acero llega al aluminio: los dos pies del arco en los largueros, los dos extremos del arco en los estribos y los dos montantes del parabrisas en los estribos.',
      opciones: [
        { nombre: 'Todo el chasis en cromoly (ver decisión de material)', pros: 'Se suelda todo; sin par galvánico.', contras: '+6 kg.', coste: 'Incluido en el chasis' },
        { nombre: 'Pletinas de acero soldadas al arco y atornilladas a pletinas de aluminio soldadas al chasis, con junta aislante y tornillería inoxidable', pros: 'Es lo normal en jaulas atornilladas; desmontable.', contras: 'Doce tornillos M10 y seis juntas; hay que calcular la pletina y comprobar los tornillos cada revisión.', coste: '≈ 150 € de pletinas y tornillería (estimación propia, por confirmar)' },
        { nombre: 'Casquillos de aluminio encolados en el arco de acero con adhesivo estructural', pros: 'Sin tornillos a la vista.', contras: 'El adhesivo no está pensado para cargas de choque sin ensayo previo; no se desmonta.', coste: 'Por confirmar' },
      ],
      recomendacion: 'La primera: todo en cromoly. Si Eugenio quiere aluminio, la segunda (pletinas atornilladas con aislante).',
      porQue: 'Una unión que falla en un vuelco no se puede probar «un poco»; la soldadura del mismo material es la que tiene historial. Las pletinas atornilladas son la segunda mejor y son estándar en competición.',
      cuando: 'antes de diseñar',
    },
    {
      tema: 'Cómo se cortan y preparan los tubos',
      contexto: 'Un chasis tiene 40–100 extremos de tubo que deben abrazar a otro tubo (entallado). Hacerlo bien es lo que separa una soldadura sana de un hueco relleno de material.',
      opciones: [
        { nombre: 'Corte láser de tubo desde el DXF (Initube u otro)', pros: 'Cada tubo llega cortado, entallado y marcado; ajuste de décimas; horas de taller a cero.', contras: 'Coste por pieza y plazo; hay que tener los DXF perfectos antes.', coste: 'Por confirmar con presupuesto' },
        { nombre: 'Sierra de cinta + entalladora manual (sierra de corona) + amoladora', pros: 'Barato; se hace en el propio taller; permite corregir sobre la marcha.', contras: '1–2 horas por nudo complicado; el ajuste depende de la mano; los tubos curvos son difíciles.', coste: 'Entalladora ≈ 150–400 € (por confirmar) + horas' },
        { nombre: 'Mixto: láser para los tubos rectos de la celosía, manual para los curvos y los ajustes', pros: 'Lo mejor de cada uno.', contras: 'Dos proveedores que coordinar.', coste: 'Por confirmar' },
      ],
      recomendacion: 'Corte láser para los tubos rectos; curvado y ajuste manual para el arco, los montantes y los largueros curvos.',
      porQue: 'El láser cuesta menos que las horas que ahorra y, sobre todo, evita que el primer chasis salga con huecos en los nudos. Los tubos curvos los va a tocar el taller de todas formas.',
      cuando: 'antes de fabricar',
    },
    {
      tema: 'Quién suelda y con qué procedimiento',
      contexto: 'La soldadura es la operación que decide si el chasis aguanta. En tubo fino, TIG; en aluminio, además, un soldador cualificado y horno después.',
      opciones: [
        { nombre: 'Taller profesional de chasis (kart-cross, Formula Student, cuadros de bici) con TIG', pros: 'Experiencia en tubo fino; bancada propia a veces; responde por el trabajo.', contras: 'Cuesta (≈ 900 € estimados) y hay que esperar su hueco.', coste: '≈ 900 € (estimación de `componentes.ts`)' },
        { nombre: 'Soldarlo nosotros con un equipo TIG alquilado', pros: 'Aprendizaje; horas gratis.', contras: 'Un chasis es lo peor para aprender a soldar: tubo fino, posiciones malas, 100 nudos. Las probetas lo dirían.', coste: 'Alquiler + gas + material (por confirmar)' },
        { nombre: 'MIG en vez de TIG', pros: 'Más rápido y fácil.', contras: 'Más aporte de calor y menos control en pared de 1,5 mm; no es lo que se hace en chasis tubulares de competición.', coste: 'Algo menos' },
      ],
      recomendacion: 'Taller profesional con TIG, con nosotros al lado y las probetas rotas antes.',
      porQue: 'El chasis sostiene a dos personas y 160 kg de batería a 140 km/h. El precio de la soldadura profesional es el 3 % del coste del coche.',
      cuando: 'antes de fabricar',
    },
    {
      tema: 'Hasta dónde se verifica el chasis del prototipo 1',
      contexto: 'Hay tres niveles: cálculo, ensayos en bancada y ensayo de choque. Cada uno cuesta un orden de magnitud más que el anterior.',
      opciones: [
        { nombre: 'FEA + torsión en bancada + carga estática sobre el arco', pros: 'Barato (cálculo propio o UMH; bancada con gato y relojes); cubre lo que de verdad decide si el coche rueda seguro en pista cerrada.', contras: 'No es un ensayo oficial; no vale para homologar.', coste: 'Horas + ensayo en universidad (por confirmar; cientos de euros)' },
        { nombre: 'Lo anterior + ensayo de choque en laboratorio (Applus IDIADA)', pros: 'Es la prueba de verdad y la que pediría un servicio técnico.', contras: 'Destruye un chasis (hace falta un segundo) y cuesta miles de euros.', coste: 'Por confirmar con IDIADA; se asume en el prototipo 2' },
      ],
      recomendacion: 'La primera para el prototipo 1; documentar qué pediría IDIADA para hacerlo en el 2.',
      porQue: 'El prototipo 1 va a rodar en pista cerrada con casco y cinturones; lo que hay que saber es que no se parte y que el arco aguanta. El choque se paga cuando la forma del chasis sea la definitiva.',
      cuando: 'antes de probar',
    },
  ],
  partners: [
    { nombre: 'Osborn Metals', tipo: 'fabricante', pais: 'Francia', web: 'https://www.osbornmetals.com/', que: 'Tubos de acero aleado soldados y sin soldadura para aeronáutica y competición: 25CrMo4 (su marca OM GT750, en estado +SR, +N o templado), AISI 4130, 15CrMoV6; de Ø 2 a 120 mm y pared 0,4–10 mm; medidas de competición en stock desde 300 € el pedido (orientativo, según DirectIndustry).', porQue: 'Es el proveedor europeo de tubo cromoly con precisión aeronáutica y stock de medidas de jaula; evita comprar tubo chino sin certificado de colada.', estado: 'por contactar', verificado: true },
    { nombre: 'Alu-Stock', tipo: 'proveedor', pais: 'España', web: 'https://www.alu-stock.es/', que: 'Almacén de aluminio: tubo, perfil y chapa 6061-T6 y 6082-T6 por metro, catálogo con medidas.', porQue: 'Es el proveedor que ya cita `componentes.ts` para el Ø 40 × 2 (≈ 9 €/m estimados); el aluminio de la versión 2 o de los anclajes sale de aquí.', estado: 'por contactar', verificado: true },
    { nombre: 'RS Components (RS Online España)', tipo: 'proveedor', pais: 'España', web: 'https://es.rs-online.com/', que: 'Tubo de aluminio y acero por metro, tornillería, insertos, juntas aislantes, relojes comparadores y células de carga; envío en 24–48 h.', porQue: 'Para lo que falta a última hora (un tubo de 1 m, los tornillos inoxidables de las pletinas, los relojes del ensayo de torsión) sin mínimo de pedido.', estado: 'por contactar', verificado: true },
    { nombre: 'Initube', tipo: 'taller', pais: 'España', web: 'https://www.initube.es/', que: 'Corte láser y mecanizado de tubos y perfiles metálicos desde fichero; plasma de alta definición para piezas grandes; más de 1.000 clientes en 13 sectores (según Interempresas, 2025).', porQue: 'Taller de corte láser de tubo en Lliçà de Vall (Barcelona): nuestros 40–100 tubos llegarían cortados y entallados desde el DXF del 3D.', estado: 'por contactar', verificado: true },
    { nombre: 'Bodycote', tipo: 'proveedor', pais: 'Reino Unido (plantas en Europa; España por confirmar)', web: 'https://www.bodycote.com/', que: 'Tratamientos térmicos industriales: solubilizado y envejecido (T6) de aluminio, alivio de tensiones, normalizado de aceros.', porQue: 'Si el chasis es de aluminio hace falta un horno y una cuba de temple de 3,5 m; Bodycote es la red de tratamientos más grande de Europa. Hay que confirmar qué planta española tiene hornos de ese tamaño y su precio (`componentes.ts` estima 300 €).', estado: 'por contactar', verificado: false },
    { nombre: 'INSIA (Instituto Universitario de Investigación del Automóvil, UPM)', tipo: 'universidad', pais: 'España', web: 'https://insia-upm.es/en/ensayos-y-homologaciones/', que: 'Servicio técnico autorizado por el Ministerio: ensayos de estructuras (vuelco de autobuses, Reglamento 66), dispositivos de acoplamiento, protección de carga; laboratorio de neumáticos acreditado por ENAC; ensayos e informes a medida para la industria.', porQue: 'En el Campus Sur de la UPM (Madrid). Tienen bancada, células de carga y experiencia en ensayar estructuras de vehículos: el sitio para romper probetas y cargar el arco con informe.', estado: 'por contactar', verificado: true },
    { nombre: 'I3E — Universidad Miguel Hernández (Elche)', tipo: 'universidad', pais: 'España', web: 'https://i3e.umh.es/', que: 'Diseño y optimización de sistemas mecánicos, carrocerías y componentes de vehículos: diseño conceptual de vehículos especiales, diseño de detalle de chasis con análisis estructural, planos de fabricación, análisis de fallos, y ensayos estáticos y de fatiga de componentes (ficha de capacidades del instituto).', porQue: 'Es exactamente nuestra lista de tareas de chasis (FEA, rigidez, planos, ensayos) ofrecida por una universidad pública a empresas. La ficha da un contacto directo del departamento de Ingeniería Mecánica.', estado: 'por contactar', verificado: true },
    { nombre: 'Applus IDIADA', tipo: 'laboratorio', pais: 'España', web: 'https://www.applusidiada.com/', que: 'Servicio técnico de homologación (E9) y laboratorio de ensayos de seguridad pasiva (choque), componentes y vehículos especiales; certificación individual de vehículos.', porQue: 'Quien dirá qué ensayo de estructura exige un L7e para circular y quien lo haría. Para el prototipo 1, solo una consulta de alcance y precio.', estado: 'por contactar', verificado: true },
    { nombre: 'FIA (Federación Internacional del Automóvil) — estructuras de seguridad', tipo: 'institución', pais: 'Francia', web: 'https://www.fia.com/sites/default/files/lt_35-calcul_armatures_2024.11.15.pdf', que: 'Lista Técnica 35: cómo se calculan y ensayan las jaulas de seguridad de competición (cargas, deformaciones admisibles, materiales).', porQue: 'No vamos a homologar una jaula FIA, pero sus cargas y su método son la referencia pública más clara para dimensionar y ensayar nuestro arco.', estado: 'por contactar', verificado: true },
    { nombre: 'Locost Builders (foro)', tipo: 'comunidad', pais: 'Reino Unido', web: 'https://locostbuilders.co.uk/', que: 'Foro de constructores aficionados de chasis tubulares tipo Lotus/Caterham Seven: bancadas, soldadura, materiales, errores típicos, fotos de miles de chasis.', porQue: 'Veinte años de gente que ha soldado chasis de tubo en garajes; cualquier duda práctica (entallado, contracción, orden de soldadura) tiene hilo.', estado: 'por contactar', verificado: true },
    { nombre: 'HP Academy (formación)', tipo: 'comunidad', pais: 'Nueva Zelanda (contenido en español)', web: 'https://www.hpacademy.com/es/articulos-tecnicos/cromo-molibdeno-vs-acero-dulce-en-la-fabricacion/', que: 'Artículos y cursos de fabricación de competición: cromoly frente a acero dulce, soldadura TIG, ejes y palieres a medida.', porQue: 'Explica en español y sin jerga lo que hay detrás de nuestras decisiones de material y soldadura; útil para que Eugenio pueda seguir la conversación con el taller.', estado: 'por contactar', verificado: true },
  ],
  mensajes: [
    {
      para: 'Osborn Metals', canal: 'correo', idioma: 'en',
      asunto: 'Quotation: 25CrMo4 (4130) seamless tube for a light-vehicle prototype chassis',
      cuerpo: 'Dear Osborn Metals team,\n\nWe are Aeromóvil 1, an open project by humanity.wiki (Spain) building the first prototype of a four-wheel light electric vehicle (EU category L7e, ~385 kg). The chassis is a TIG-welded tubular space frame in chromoly steel.\n\nWe would like a quotation for 25CrMo4 (or AISI 4130) seamless tube, condition +N or +SR as you recommend for TIG welding without post-weld heat treatment:\n- Ø 40 × 2.0 mm: [X] m\n- Ø 38 × 2.5 mm: [X] m\n- Ø 32 × 2.0 mm: [X] m\n- Ø 30 × 2.0 mm: [X] m\n- Ø 25 × 1.5 mm: [X] m\n\nPlease include bar lengths available, mill certificate (EN 10204 3.1), and delivery to [city], Spain. We may order the same set again for a second prototype.\n\nThank you,\n[Name]\n[Phone] · [e-mail]',
      quePedimos: ['Price per metre for each size and for the full list (excl. VAT)', 'Price for 10 sets', 'Minimum order and bar lengths', 'Lead time', 'Material certificate (EN 10204 3.1) and condition (+N / +SR)', 'Recommended filler for TIG', 'Shipping cost to Spain and payment terms'],
    },
    {
      para: 'Alu-Stock', canal: 'correo', idioma: 'es',
      asunto: 'Presupuesto de tubo de aluminio 6061-T6 para el chasis de un prototipo de vehículo ligero',
      cuerpo: 'Hola,\n\nSomos el proyecto Aeromóvil 1 de humanity.wiki. Estamos fabricando el primer prototipo de un vehículo eléctrico ligero de cuatro ruedas con chasis tubular soldado y necesitamos tubo redondo de aluminio 6061-T6 (o 6082-T6 si lo tenéis en estas medidas):\n- Ø 40 × 2 mm: [X] m\n- Ø 32 × 2 mm: [X] m\n- Ø 28 × 2 mm: [X] m\n- Ø 25 × 1,5 mm: [X] m\n\n¿Nos podéis indicar precio por metro, longitudes de barra, si entregáis certificado de material y plazo de entrega a [ciudad]?\n\nGracias,\n[Nombre]\n[Teléfono] · [correo]',
      quePedimos: ['Precio por metro de cada medida (sin IVA) y total', 'Precio para 10 juegos', 'Longitudes de barra y mínimo', 'Plazo', 'Certificado de material y estado (T6)', 'Coste de envío y condiciones de pago'],
    },
    {
      para: 'Initube', canal: 'correo', idioma: 'es',
      asunto: 'Presupuesto de corte láser de tubo (≈ [60] tubos con entallado) para un chasis tubular',
      cuerpo: 'Hola,\n\nSomos el proyecto Aeromóvil 1 de humanity.wiki. Tenemos el chasis tubular de un prototipo de vehículo ligero dibujado en 3D, con lista de corte y DXF por tubo: unos [60] tubos de acero cromoly (Ø 25 a 40 mm, pared 1,5–2,5 mm) con entallado en los extremos y marcado de número.\n\n¿Podéis cortarlos por láser desde nuestros ficheros? Adjuntamos la lista de corte y tres DXF de muestra. Nos interesa saber también si aportáis vosotros el tubo o lo enviamos nosotros, y si curváis tubo (tenemos un arco y dos montantes curvos) o nos podéis recomendar quién.\n\nGracias,\n[Nombre]\n[Teléfono] · [correo]',
      quePedimos: ['Precio por tubo y total (sin IVA)', 'Precio para 10 chasis', 'Formato de fichero que necesitan', 'Si aportan el tubo y a qué precio', 'Plazo', 'Si curvan tubo (radio mínimo) o quién lo hace', 'Condiciones de pago y transporte'],
    },
    {
      para: 'Bodycote', canal: 'formulario web', idioma: 'es',
      asunto: 'Consulta: tratamiento T6 de un chasis tubular de aluminio 6061 soldado (3,1 m)',
      cuerpo: 'Buenos días,\n\nSomos el proyecto Aeromóvil 1 de humanity.wiki. Estudiamos fabricar el chasis de un prototipo de vehículo ligero en tubo de aluminio 6061 soldado TIG, de unos 3,1 × 1,0 × 0,9 m y 20 kg, y devolverlo al estado T6 después de soldar.\n\n¿Qué planta de España puede hacer el solubilizado, temple y envejecido de una pieza de ese tamaño, con qué plazo y precio orientativo, y qué distorsión cabe esperar? ¿Recomiendan un útil de sujeción durante el temple?\n\nGracias,\n[Nombre]\n[Teléfono] · [correo]',
      quePedimos: ['Planta que puede tratar una pieza de 3,1 m', 'Precio orientativo y para 10 unidades', 'Plazo', 'Ciclo recomendado (temperaturas y tiempos) y certificado', 'Distorsión esperable y si hace falta útil', 'Condiciones'],
    },
    {
      para: 'INSIA (Instituto Universitario de Investigación del Automóvil, UPM)', canal: 'correo', idioma: 'es',
      asunto: 'Consulta: ensayo de probetas soldadas y carga estática sobre el arco de seguridad de un prototipo L7e',
      cuerpo: 'Buenos días,\n\nSomos el proyecto Aeromóvil 1 de humanity.wiki, un vehículo eléctrico ligero de cuatro ruedas (categoría L7e) del que estamos construyendo el primer prototipo en Madrid. El chasis es tubular soldado (cromoly) con un arco de seguridad entre los dos ocupantes.\n\nQuerríamos saber si podrían hacer, y con qué coste y plazo:\n1. Ensayo de tracción/doblado de tres probetas de unión soldada en T (tubo Ø 32 × 2).\n2. Ensayo de carga estática (vertical y lateral) sobre el arco de seguridad con el chasis desnudo, registrando carga y deformación.\n3. Orientación sobre qué ensayos de estructura exigiría la homologación de un L7e.\n\nGracias,\n[Nombre]\n[Teléfono] · [correo]',
      quePedimos: ['Precio y plazo de cada ensayo', 'Qué entregan (informe, curvas)', 'Requisitos de la pieza (útiles, dimensiones)', 'Si pueden orientar sobre homologación de L7e'],
    },
    {
      para: 'I3E — Universidad Miguel Hernández (Elche)', canal: 'correo', idioma: 'es',
      asunto: 'Colaboración: cálculo estructural (FEA) y ensayo del chasis tubular de un prototipo de vehículo ligero',
      cuerpo: 'Buenos días,\n\nSomos el proyecto Aeromóvil 1 de humanity.wiki (Luz & Humanidad), un vehículo eléctrico ligero de cuatro ruedas (L7e, 3,94 m, ≈ 385 kg) con el chasis tubular ya dibujado en 3D (STEP y lista de corte). Hemos visto en su ficha de capacidades el diseño de detalle de chasis con análisis estructural y los ensayos estáticos y de fatiga.\n\nNos gustaría pedirles presupuesto de:\n1. Análisis por elementos finitos del chasis (rigidez a torsión, casos de carga de suspensión y frenada, carga sobre el arco de seguridad) con propuesta de refuerzos.\n2. Ensayo de torsión y de carga estática del chasis fabricado.\n\n¿Sería posible también plantearlo como proyecto de fin de grado o máster con un alumno?\n\nGracias,\n[Nombre]\n[Teléfono] · [correo]',
      quePedimos: ['Precio y plazo del FEA', 'Precio y plazo de los ensayos', 'Qué ficheros necesitan', 'Posibilidad de TFG/TFM', 'Qué entregan (informe, modelo)'],
    },
    {
      para: 'Applus IDIADA', canal: 'formulario web', idioma: 'es',
      asunto: 'Consulta de alcance: ensayos de estructura y homologación de un cuadriciclo pesado (L7e) prototipo',
      cuerpo: 'Buenos días,\n\nSomos el proyecto Aeromóvil 1 de humanity.wiki. Estamos construyendo el primer prototipo de un cuadriciclo pesado eléctrico (L7e-A, ≈ 385 kg, 15 kW nominales) con chasis tubular de cromoly y carrocería de fibra, y queremos saber desde el principio qué ensayos de estructura y seguridad pediría la homologación (de tipo o individual) para que el segundo prototipo ya los pase.\n\n¿Podrían indicarnos el alcance de una consulta de homologación para un L7e, qué ensayos de estructura (si alguno) aplican, y un coste y plazo orientativos?\n\nGracias,\n[Nombre]\n[Teléfono] · [correo]',
      quePedimos: ['Lista de ensayos que aplican a un L7e', 'Diferencia entre homologación de tipo e individual para nuestro caso', 'Coste y plazo orientativos', 'Qué documentación hace falta'],
    },
  ],
  referencias: [
    { titulo: 'Reglamento (UE) n.º 168/2013 — homologación de vehículos de categoría L (español)', url: 'https://boe.gob.es/doue/2013/060/L00052-00128.pdf', nota: 'La categoría L7e, sus límites de masa y potencia y los reglamentos delegados que la desarrollan.' },
    { titulo: 'Reglamento Delegado (UE) n.º 44/2014 — construcción y requisitos generales de los vehículos L (español)', url: 'https://www.boe.es/doue/2014/025/L00001-00102.pdf', nota: 'Requisitos de construcción que afectan al chasis y a los anclajes (cinturones, estructura).' },
    { titulo: 'Reglamento Delegado (UE) n.º 44/2014 — versión consolidada (EUR-Lex)', url: 'https://eur-lex.europa.eu/eli/reg_del/2014/44/oj', nota: 'Para leer la última versión en vigor.' },
    { titulo: 'FIA Lista Técnica 35: cálculo de estructuras de seguridad (jaulas)', url: 'https://www.fia.com/sites/default/files/lt_35-calcul_armatures_2024.11.15.pdf', nota: 'Cargas y criterios de deformación con los que se verifican las jaulas de competición: referencia para dimensionar y ensayar nuestro arco.' },
    { titulo: 'Cromoly 4130 o acero dulce: cuál usar (HP Academy, en español)', url: 'https://www.hpacademy.com/es/articulos-tecnicos/cromo-molibdeno-vs-acero-dulce-en-la-fabricacion/', nota: 'Explica sin jerga por qué el cromoly permite tubos más finos y qué cuidados pide al soldar.' },
    { titulo: 'Osborn Metals: tubo 25CrMo4 OM GT750 (ficha en DirectIndustry)', url: 'https://www.directindustry.com/prod/osborn-metals-sa-bujon/product-197988-2227859.html', nota: 'Estados de entrega, diámetros y el «desde 300 €» orientativo del pedido de medidas de competición.' },
    { titulo: 'Initube: 10 años de corte y mecanizado de tubos (Interempresas)', url: 'https://www.interempresas.net/MetalMecanica/632042-Initube-cumple-10-anos-consolidada-en-el-corte-y-mecanizado-de-tubos-y-perfiles-metalicos.html', nota: 'Qué hace el taller y dónde está (Lliçà de Vall, Barcelona).' },
    { titulo: 'Caterham: chasis tubular más ligero con tecnología de tubo de bicicleta (Motor Authority)', url: 'https://www.motorauthority.com/news/1030635_ionic-seven-chassis-made-lighter-thanks-to-bicycle-tech', nota: 'El Seven es la referencia de la versión 2 (celosía): cómo bajaron el peso con tubos de pared variable.' },
    { titulo: 'Caterham 7 (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Caterham_7', nota: 'Historia y construcción del chasis en celosía que inspira la versión 2.' },
    { titulo: 'INSIA-UPM: ensayos y homologaciones', url: 'https://insia-upm.es/en/ensayos-y-homologaciones/', nota: 'Qué ensayos hacen y cómo contactar.' },
    { titulo: 'Ficha de capacidades del I3E (UMH): diseño de vehículos y análisis estructural (PDF)', url: 'https://i3e.umh.es/files/2022/03/Ficha_I3E_DIS-VEH_capacidad-cono.pdf', nota: 'La oferta a empresas: diseño de chasis, FEA, planos, ensayos estáticos y de fatiga, con contacto.' },
    { titulo: 'Applus IDIADA: servicios de ensayos de seguridad pasiva (PDF)', url: 'https://www.applusidiada.com/dam/PDFServices/IDIADA/GLOBAL/servicios-de-ensayos-de-seguridad-pasiva_es.pdf', nota: 'Qué ensayos de choque y estructura hace el laboratorio.' },
    { titulo: 'Foro Locost Builders', url: 'https://locostbuilders.co.uk/', nota: 'Experiencia práctica de constructores de chasis tubulares en garaje: bancadas, soldadura, errores.' },
  ],
  revisado: { fecha: '2026-11-06', por: 'bot de producto y compras (Claude), con webs comprobadas el mismo día' },
};
