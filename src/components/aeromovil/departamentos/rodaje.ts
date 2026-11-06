import type { Departamento } from './tipos';

/**
 * Suspensión, dirección, frenos y ruedas del Aeromóvil 1 (escrito el
 * 2026-11-06 por un bot a partir de `componentes.ts`, `geometriaA1.ts`
 * (función `tubosMecanica`), el changelog del día y búsquedas en la web).
 * Precios con fuente; lo no comprobado dice «por confirmar». Webs de
 * partners encontradas de verdad; `verificado: false` = no se pudo abrir su
 * web o confirmar que hagan exactamente esto.
 *
 * Lo que hay hoy en el 3D: delante, una columna McPherson por rueda (muelle y
 * amortiguador en una pieza, anclada a la torreta del chasis), brazo inferior
 * en A fabricado en tubo Ø 25 × 2,5 con rótula, mangueta de clase Twizy y
 * barra estabilizadora Ø 18. Detrás, un brazo tirado por rueda (tubo Ø 30 ×
 * 2,5) con pivote en el larguero 38 cm por delante del eje, un tirante Ø 22
 * y un amortiguador con muelle tumbado (≈ 20–30°) anclado bajo el suelo del
 * maletero; sin torretas traseras. Dirección: cremallera manual 10 cm por
 * delante del eje, dos bieletas, columna con cardán y volante Ø 300 inclinado
 * 35°; giro máximo 22° (radio ≈ 4,3 m). Frenos: discos ventilados Ø 214
 * delante y Ø 204 detrás (Twizy), pinza flotante, bomba de doble circuito.
 * Ruedas 13″: 125/80 R13 delante (Ø 530 mm) y 145/80 R13 detrás (Ø 562 mm).
 * Batalla 2,05 m, vías 1,22 / 1,00 m, 19 cm de altura de bajos, 90 mm de
 * recorrido. Peso estimado: 4 × 8 kg de ruedas, 4 × 2,8 kg de frenos, 26 kg de
 * suspensión comprada más los brazos, 7 kg de dirección.
 *
 * Vocabulario (explicado al aparecer): McPherson, brazo tirado, mangueta,
 * buje, rótula, bieleta, cremallera, Ackermann, caída, avance, convergencia,
 * tasa de muelle, coilover, PCD, índice de carga, índice de velocidad,
 * palier, junta homocinética, repartidor de frenada, servofreno.
 */
export const DEPARTAMENTO: Departamento = {
  id: 'rodaje', nombre: 'Suspensión, dirección, frenos y ruedas', lema: 'lo que toca el suelo y lo que lo gobierna',
  mision:
    'Poner el Aeromóvil 1 sobre cuatro ruedas de verdad, con las piezas de la clase del Renault Twizy que ya usa el 3D como referencia (neumáticos 125/80 R13 y 145/80 R13, discos de 214 y 204 mm, columnas McPherson delante) y lo que hay que fabricar o buscar en otro sitio porque nuestro coche no es un Twizy: es 1,6 m más largo, tiene 36 cm más de batalla, 13 cm más de vía delante y 8 cm menos detrás, lleva brazos tirados con amortiguador tumbado en el eje trasero y tiene que ir a 140 km/h, 60 km/h más que un Twizy. El trabajo es decidir qué se compra de desguace, qué se compra nuevo y qué se fabrica, diseñar los brazos y la geometría (ángulos de las ruedas) para que el coche vaya recto y frene, montarlo, alinearlo y rodar.',
  responsabilidades: [
    'La geometría de los ejes: batalla, vías, altura, recorrido de 90 mm, giro de 22°, y los ángulos de las ruedas (caída, avance, convergencia: cuánto se inclina y se abre cada rueda) que el 3D no calcula todavía.',
    'La suspensión delantera: columnas McPherson, brazos inferiores fabricados, manguetas y rótulas, barra estabilizadora, y su anclaje a las torretas del chasis.',
    'La suspensión trasera: brazos tirados, tirantes, los soportes de buje, los amortiguadores tumbados con muelle y su barra estabilizadora.',
    'La dirección: cremallera, bieletas, columna con cardán y absorción de impacto, volante; que el radio de giro sea ≈ 4,3 m y que no haya nada que roce con las ruedas giradas y hundidas.',
    'Los frenos: discos, pinzas, pastillas, bomba, repartidor, latiguillos, pedal y freno de estacionamiento; que frenen lo que pide la norma para un L7e y que convivan con el freno regenerativo del motor.',
    'Las ruedas: llantas (patrón de tornillos del Twizy: 3 × 98 mm, no 4 como dice hoy la ficha), neumáticos con índice de carga y de velocidad suficientes para 140 km/h, presiones.',
    'Los bujes, rodamientos y palieres: lo que gira y lo que lleva el par del motor a las ruedas traseras (con «Propulsión» en la frontera de la reductora).',
    'Las compras de desguace y de recambio: qué Twizy de desguace comprar, qué piezas valen tal cual, cuáles recortadas y cuáles no.',
    'Las pruebas: alineación en banco, pesos por rueda en báscula, primera rodadura, frenada medida, y lo que haga falta repetir.',
    'El registro: peso y coste reales de cada pieza en su ficha de componente, frente a los estimados.',
  ],
  parametros: ['B', 'viaF', 'viaR', 'neumF', 'neumR', 'mRueda', 'mSuspension', 'mFrenos', 'mDireccion'],
  componentes: ['ruedas', 'frenos', 'suspension', 'direccion'],
  tareas: [
    {
      titulo: 'Congelar la geometría de los ejes y corregir la ficha de ruedas',
      detalle: 'Fijar por escrito batalla 2,05 m, vías 1,22 / 1,00 m, altura de bajos 19 cm, recorrido 90 mm, giro 22°, radios de rueda 265 / 281 mm. Y corregir la ficha «Ruedas y neumáticos»: las llantas del Twizy son 4B × 13 con patrón 3 × 98 mm, ET 23,5, centro de 60,1 mm y tornillos M12 × 1,5 (datos de ajuste publicados por koleso.ee), no «4 tornillos». Cualquier llanta o buje que se compre tiene que ser 3 × 98.',
      prioridad: 'alta', semanas: 0.5, entregable: 'Hoja de geometría «versión A» con fecha; ficha de ruedas corregida (3 × 98, 4B × 13, ET 23,5).',
    },
    {
      titulo: 'Leer qué pide la norma a frenos, dirección y neumáticos de un L7e',
      detalle: 'El Reglamento Delegado (UE) 3/2014 (seguridad funcional de los vehículos de categoría L) dice en su anexo III, punto 1.3, que los L7e cumplen el Reglamento ONU n.º 78 «como se prescribe para la categoría L5e» (leído el 2026-11-07 en la versión de legislation.gov.uk); los neumáticos van por el anexo XV (Reglamentos ONU 30, 54 o 75 según el tipo: comprobar cuál admite el L7e). Sacar de ahí, con «Homologación»: la deceleración mínima que tiene que dar el freno de servicio y el de estacionamiento (y la pendiente que este debe aguantar), si hace falta doble circuito (sí en el 3D), y qué marcado deben llevar los neumáticos. Son los números contra los que se mide la prueba de frenada.',
      prioridad: 'alta', semanas: 0.5, entregable: 'Nota de una página: deceleración exigida, requisitos del freno de estacionamiento, marcado de neumáticos y referencias de artículo.',
    },
    {
      titulo: 'Decidir qué se compra de un Twizy de desguace y qué no',
      detalle: 'Ver las decisiones «Twizy de desguace entero o piezas sueltas» y las de cada sistema. Lo que encaja tal cual: manguetas delanteras con sus bujes, columnas McPherson delanteras, discos, pinzas y bomba de freno, bujes traseros (llevan el estriado del palier), cremallera y columna. Lo que no: los brazos (nuestras vías son otras), las columnas McPherson traseras (nuestro eje trasero es de brazos tirados), los palieres (nuestra vía trasera es 8 cm más estrecha y la reductora puede ser otra). Precio de referencia: un brazo trasero usado de Twizy cuesta 71,91 € IVA incl. en Desguace Malvarrosa (Valencia) vía rrr.lt; una pinza delantera nueva 133,58 € + 35,70 € de depósito y la bomba 182,68 € (IVA alemán incl.) en der-ersatzteile-profi.de, nov. 2026.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Congelar la geometría de los ejes y corregir la ficha de ruedas'], entregable: 'Lista de piezas Twizy con tres columnas: «vale tal cual», «vale recortada o adaptada», «no vale», con precio de desguace y de nuevo.',
    },
    {
      titulo: 'Calcular la cinemática de la suspensión delantera (McPherson)',
      detalle: 'Con la mangueta real del Twizy medida (altura de la rótula, inclinación del eje de la columna, posición del anclaje de la bieleta) y nuestros puntos duros (torreta a `yTow`, pivotes del brazo en el larguero a ±0,32 m del centro), dibujar en 2D y 3D cómo cambian la caída (inclinación de la rueda vista de frente), el avance (inclinación del eje de giro visto de lado) y la convergencia (si las ruedas apuntan hacia dentro) a lo largo de los 90 mm de recorrido. Objetivo para un coche así: caída −0,5° a −1°, avance 3–5°, convergencia ≈ 0 en estático, y que el cambio de vía con el recorrido sea pequeño. Se puede hacer con un programa gratuito de cinemática de suspensión o con la UMH.',
      prioridad: 'alta', semanas: 2, dependeDe: ['Decidir qué se compra de un Twizy de desguace y qué no'], entregable: 'Informe de cinemática: gráficas de caída, avance y convergencia frente al recorrido; coordenadas definitivas de la rótula, la torreta y el anclaje de la bieleta.',
    },
    {
      titulo: 'Diseñar los brazos inferiores delanteros',
      detalle: 'Brazos en A en tubo Ø 25 × 2,5 (como en el 3D) con dos casquillos de goma en el larguero y la rótula del Twizy en la punta (vale la rótula de recambio, 20–40 € según `componentes.ts`). Dibujar con las coordenadas de la cinemática, calcular el tubo con la carga de bache (3 veces el peso sobre la rueda) y dejar el anclaje de la barra estabilizadora.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Calcular la cinemática de la suspensión delantera (McPherson)'], entregable: 'Plano de los dos brazos con lista de material (tubo, casquillos, alojamiento de rótula).',
    },
    {
      titulo: 'Diseñar el brazo tirado trasero y el soporte del buje',
      detalle: 'Un brazo tirado = un brazo que pivota en el chasis por delante de la rueda y la lleva «arrastrada»; con el amortiguador tumbado deja el maletero plano (es lo que pidió Eugenio). Dibujar el brazo (tubo Ø 30 × 2,5 con tirante Ø 22, como en el 3D), una placa donde atornillar el buje trasero del Twizy (que lleva el rodamiento y el estriado del palier), el anclaje inferior del amortiguador a 5 cm detrás del eje y el de la barra estabilizadora. Calcular la caída que gana la rueda al hundirse (en un brazo tirado puro, ninguna) y el par de frenada que entra en el pivote.',
      prioridad: 'alta', semanas: 1.5, dependeDe: ['Decidir qué se compra de un Twizy de desguace y qué no'], entregable: 'Plano de los brazos traseros con la placa de buje, los casquillos del pivote y el cálculo del tubo.',
    },
    {
      titulo: 'Elegir muelles y amortiguadores',
      detalle: 'Delante, columnas McPherson del Twizy (`componentes.ts` estima 130 € cada una, KYB/Monroe en Autodoc) con muelle ≈ 25 N/mm; comprobar que la tasa vale con nuestros ≈ 110 kg por eje delantero más el ocupante. Detrás, un amortiguador con muelle (coilover) de quad o kart-cross de 300–350 mm, tumbado: como está inclinado, cada mm de rueda mueve menos el amortiguador (relación de instalación), así que el muelle tiene que ser más duro que los 30 N/mm que dice la ficha; calcularlo con el ángulo real del 3D. Ver la decisión «Amortiguador trasero».',
      prioridad: 'alta', semanas: 1, dependeDe: ['Diseñar el brazo tirado trasero y el soporte del buje'], entregable: 'Referencias de los cuatro amortiguadores y muelles con tasa (N/mm), longitud y carrera; cálculo de la relación de instalación trasera.',
    },
    {
      titulo: 'Diseñar la dirección: cremallera, bieletas y columna',
      detalle: 'Con la cremallera del Twizy (manual, ≈ 250–400 € nueva según `componentes.ts`; usada 180 €) 10 cm por delante del eje: alargar las bieletas 6 cm por lado (nuestra vía es 13 cm mayor) con bieletas regulables de rosca, comprobar la geometría de Ackermann (que en curva la rueda interior gire más que la exterior) con la posición del anclaje en la mangueta, y que a 22° de giro y 90 mm de hundimiento la rueda no toque la carrocería (el 3D lo comprueba: 21 mm de holgura). Columna con cardán y tramo colapsable hasta el volante Ø 300 a 35°.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Calcular la cinemática de la suspensión delantera (McPherson)'], entregable: 'Plano de la dirección: cremallera, bieletas (largo y rosca), columna (tramos, cardanes), volante; radio de giro calculado.',
    },
    {
      titulo: 'Diseñar el sistema de frenos',
      detalle: 'Discos y pinzas del Twizy en las cuatro ruedas, bomba de doble circuito, repartidor (válvula que limita el freno trasero para que no bloquee antes), latiguillos y pedal. Calcular el reparto con nuestras masas (≈ 45 % delante en vacío, más con frenada) y la fuerza de pedal sin servo; ver la decisión «Servofreno». Freno de estacionamiento: ver decisión. Dejar claro con «Propulsión» cómo se suma el freno regenerativo (el pedal manda primero al motor, después a los discos).',
      prioridad: 'alta', semanas: 1, dependeDe: ['Leer qué pide la norma a frenos, dirección y neumáticos de un L7e'], entregable: 'Esquema hidráulico, cálculo de reparto y fuerza de pedal, lista de piezas con referencias.',
    },
    {
      titulo: 'Elegir neumáticos y llantas',
      detalle: 'Ver la decisión «Neumáticos para 140 km/h». El neumático de serie del Twizy, Continental Conti.eContact 125/80 R13 65M, tiene índice de velocidad M = 130 km/h (y 65 = 290 kg por rueda): no llega a los 140 km/h de objetivo. Existen 125/80 R13 65T y 145/80 R13 75T (T = 190 km/h) de otras marcas, según los listados de ajuste del Twizy. Precio de referencia del eContact: 86,52 € IVA incl. en reifen.com (Alemania), 74 € por unidad comprando 4 en oponeo.ie, nov. 2026. Llantas 4B × 13 ET 23,5 en 3 × 98: las del Twizy (acero, de desguace) o aluminio del mismo patrón.',
      prioridad: 'alta', semanas: 0.5, dependeDe: ['Congelar la geometría de los ejes y corregir la ficha de ruedas'], entregable: 'Referencia de neumáticos (medida, índices) y llantas (patrón, ancho, ET) con precio y proveedor.',
    },
    {
      titulo: 'Decidir los palieres',
      detalle: 'Un palier es el eje con dos juntas homocinéticas que lleva el giro de la reductora a cada rueda trasera. Nuestra vía trasera (1,00 m) es 8 cm más estrecha que la del Twizy (1,08 m), y la reductora puede no ser la del Twizy: lo normal es que haya que recortar o encargar palieres. Ver la decisión «Palieres».',
      prioridad: 'media', semanas: 1, dependeDe: ['Diseñar el brazo tirado trasero y el soporte del buje', 'Propulsión: Elegir la reductora con diferencial'], entregable: 'Largo exacto de cada palier (rueda extendida y comprimida), estriados en cada extremo, y quién los hace a qué precio.',
    },
    {
      titulo: 'Comprar las piezas de desguace',
      detalle: 'Con la lista «vale tal cual», comprar en Desguace Malvarrosa (vende Twizy despiezado en eBay y rrr.lt), en otros desguaces y en eBay: manguetas y bujes delanteros, columnas McPherson delanteras, bujes traseros, discos, pinzas, bomba, cremallera y columna, cuatro llantas. Comprobar al recibir: rodamientos sin holgura, discos sin surcos, pinzas sin óxido en el pistón.',
      prioridad: 'alta', semanas: 2, dependeDe: ['Decidir qué se compra de un Twizy de desguace y qué no'], entregable: 'Piezas recibidas, revisadas y pesadas; tabla de precio pagado por pieza.',
    },
    {
      titulo: 'Comprar las piezas nuevas',
      detalle: 'Pastillas, rótulas, bieletas regulables, latiguillos, repartidor, muelles y amortiguadores traseros, neumáticos, rodamientos de rueda (SKF o equivalente, vía Autodoc), tornillería de rueda M12 × 1,5. Pedir presupuesto por 10 unidades de lo que se vaya a repetir en el prototipo 2.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Elegir muelles y amortiguadores', 'Elegir neumáticos y llantas', 'Diseñar el sistema de frenos'], entregable: 'Piezas recibidas; presupuestos a 1 y 10 unidades archivados.',
    },
    {
      titulo: 'Fabricar los brazos y los soportes',
      detalle: 'Cortar, entallar y soldar los dos brazos inferiores delanteros, los dos brazos tirados con sus tirantes, las placas de buje y los soportes de barra estabilizadora, en el mismo taller y con el mismo soldador que el chasis (son piezas de seguridad). Pintar.',
      prioridad: 'alta', semanas: 2, dependeDe: ['Diseñar los brazos inferiores delanteros', 'Diseñar el brazo tirado trasero y el soporte del buje', 'Chasis: Soldar el chasis del prototipo 1'], entregable: 'Brazos y soportes terminados, medidos contra el plano y pesados.',
    },
    {
      titulo: 'Montar la suspensión y la dirección en el chasis',
      detalle: 'Sobre el chasis en la bancada: brazos, columnas, manguetas, bujes, cremallera, bieletas, columna y volante. Ajustar las bieletas para convergencia cero y comprobar a mano el giro a tope sin roces.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Fabricar los brazos y los soportes', 'Comprar las piezas de desguace', 'Comprar las piezas nuevas'], entregable: 'Chasis rodante (sin carrocería) con fotos; holguras medidas con la rueda girada 22°.',
    },
    {
      titulo: 'Montar los frenos y probarlos en parado',
      detalle: 'Discos, pinzas, bomba, repartidor, latiguillos, pedal y freno de estacionamiento. Purgar los dos circuitos, comprobar que no hay fugas con el pedal pisado 5 minutos, medir la fuerza de pedal necesaria para bloquear las ruedas en el aire y comprobar que el freno de estacionamiento aguanta el coche en una rampa del 18 % (el valor exacto lo da la norma; comprobarlo en la tarea de la norma).',
      prioridad: 'alta', semanas: 1, dependeDe: ['Montar la suspensión y la dirección en el chasis'], entregable: 'Frenos purgados y sin fugas; fuerza de pedal medida; prueba de rampa.',
    },
    {
      titulo: 'Pesar por rueda y alinear',
      detalle: 'Con batería, motor, asientos y carrocería montados, poner el coche sobre cuatro básculas (o una, rueda a rueda) y anotar el peso en cada una, con y sin ocupantes. Comprobar que ninguna rueda pasa de 290 kg (índice 65) y que el reparto se parece al 45/55 que supone el 3D. Alinear: caída, avance y convergencia según el informe de cinemática, con cuerdas y nivel o en un taller de alineación.',
      prioridad: 'alta', semanas: 0.5, dependeDe: ['Montar los frenos y probarlos en parado', 'Carrocería: Montaje en seco sobre el chasis'], entregable: 'Pesos por rueda (kg) en las cuatro condiciones y hoja de alineación.',
    },
    {
      titulo: 'Primera rodadura y ajuste de alineación',
      detalle: 'En pista cerrada o explanada, a baja velocidad: que el coche vaya recto con el volante centrado, que no haya ruidos en los brazos, que los amortiguadores no toquen tope en un bache. Subir la velocidad por escalones (30, 50, 80 km/h) comprobando temperatura de bujes y discos con la mano o un termómetro. Corregir convergencia si tira a un lado.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Pesar por rueda y alinear'], entregable: 'Informe de la primera rodadura: velocidades alcanzadas, incidencias, ajustes hechos.',
    },
    {
      titulo: 'Prueba de frenada medida',
      detalle: 'Desde 50 km/h en llano seco, frenar a fondo y medir la distancia (con una app GPS de deceleración o cinta); repetir tres veces en frío y tres en caliente. Comparar con la deceleración que pide el Reglamento ONU 78 para un L7e (el valor sale de la tarea de la norma). Si no llega: revisar reparto, pastillas o pedal antes de pensar en servo.',
      prioridad: 'alta', semanas: 0.5, dependeDe: ['Primera rodadura y ajuste de alineación', 'Leer qué pide la norma a frenos, dirección y neumáticos de un L7e'], entregable: 'Tabla de frenadas: velocidad, distancia, deceleración media, temperatura; veredicto frente a la norma.',
    },
    {
      titulo: 'Cerrar el registro de pesos y costes',
      detalle: 'Escribir en las fichas «Ruedas y neumáticos», «Frenos», «Suspensión» y «Dirección» el proveedor, el precio pagado y el peso real por unidad, y actualizar los deslizadores `mRueda`, `mFrenos`, `mSuspension` y `mDireccion` del diseño con los pesos medidos.',
      prioridad: 'media', semanas: 0.25, dependeDe: ['Prueba de frenada medida'], entregable: 'Las cuatro fichas rellenas en «La pieza real, escrita a mano».',
    },
  ],
  decisiones: [
    {
      tema: 'Twizy de desguace entero, piezas sueltas de desguace, o piezas nuevas',
      contexto: 'Casi todo el rodaje del 3D es «clase Twizy». Un Twizy accidentado o sin batería tiene manguetas, bujes, columnas, discos, pinzas, bomba, cremallera, columna, llantas, palieres y además la reductora con diferencial (9,23:1) que «Propulsión» tiene como alternativa.',
      opciones: [
        { nombre: 'Un Twizy de desguace entero (siniestro o sin batería)', pros: 'Todo a la vez, con las piezas montadas como referencia de medidas; sobra para vender lo que no se use (carrocería, asientos); sirve de banco de pruebas de la electrónica.', contras: 'Hay que almacenarlo y despiezarlo; precio por confirmar (no se ha encontrado una fuente fiable); puede traer piezas dañadas.', coste: 'Por confirmar: pedir a desguaces y mirar subastas' },
        { nombre: 'Piezas sueltas de desguace (Desguace Malvarrosa y otros, vía rrr.lt y eBay)', pros: 'Se compra solo lo que vale; precios públicos (brazo trasero 71,91 € IVA incl. en nov. 2026); envío a casa.', contras: 'Cada pieza llega de un coche distinto; hay que revisar una a una; `componentes.ts` estima 450 € la suspensión completa usada, 300 € los frenos y 180 € la dirección.', coste: '≈ 930 € el rodaje completo usado (suma de las alternativas «desguace» de `componentes.ts`)' },
        { nombre: 'Todo nuevo de recambio (Autodoc, Motordoctor, der-ersatzteile-profi)', pros: 'Piezas con garantía y factura; pinza nueva 133,58 € + depósito, bomba 182,68 € (der-ersatzteile-profi.de, IVA alemán incl.).', contras: 'El doble o el triple; algunas piezas (manguetas, bujes) solo en concesionario Renault.', coste: '≈ 1.080 € suspensión + 870 € frenos + 520 € dirección + 660 € ruedas = ≈ 3.130 € (estimaciones de serie de `componentes.ts`)' },
      ],
      recomendacion: 'Piezas sueltas de desguace para lo que no se desgasta (manguetas, bujes, columnas, cremallera, columna, llantas) y nuevo para lo que sí (pastillas, rótulas, latiguillos, rodamientos, neumáticos). Un Twizy entero solo si aparece por menos de lo que suman las piezas.',
      porQue: 'Ahorra unos 2.000 € sin tocar la seguridad: lo que frena y lo que gira se compra nuevo; lo que es un trozo de hierro fundido se compra usado y se revisa.',
      cuando: 'antes de comprar',
    },
    {
      tema: 'Amortiguador trasero tumbado: coilover de quad/kart-cross, columna McPherson del Twizy adaptada, o a medida',
      contexto: 'El eje trasero del 3D no es el del Twizy: brazo tirado con el amortiguador casi horizontal bajo el suelo del maletero, para que el maletero sea plano y grande. La columna McPherson del Twizy es una pieza estructural que no se puede tumbar.',
      opciones: [
        { nombre: 'Coilover de quad o kart-cross (muelle sobre amortiguador, con ojos en los dos extremos)', pros: 'Se vende por longitud y tasa; se monta con dos bulones en cualquier ángulo; regulable en altura; ≈ 1,3 kg.', contras: 'Hay que calcular la tasa con la relación de instalación (tumbado trabaja menos) y comprobar la carrera.', coste: '≈ 260 € cada uno en gama Öhlins/Fox según `componentes.ts`; genéricos por confirmar' },
        { nombre: 'Amortiguador y muelle del Twizy trasero, separados y adaptados', pros: 'Aprovecha piezas de desguace.', contras: 'El muelle del Twizy está pensado para trabajar vertical sobre una columna; adaptarlo tumbado es un apaño con tope de carrera incierto.', coste: 'Barato, pero horas y riesgo' },
        { nombre: 'Amortiguador a medida (fabricante de competición)', pros: 'Exactamente la tasa, la carrera y la longitud que salen del cálculo.', contras: 'Caro y con plazo; sin sentido antes de haber rodado con uno de catálogo.', coste: 'Por confirmar' },
      ],
      recomendacion: 'Coilover de catálogo de quad/kart-cross, elegido con el cálculo de la relación de instalación.',
      porQue: 'Es la pieza pensada para montarse en cualquier ángulo con dos bulones, con tasas y longitudes de catálogo; si el prototipo pide otra tasa, se cambia el muelle por 40 €.',
      cuando: 'antes de comprar',
    },
    {
      tema: 'Neumáticos para 140 km/h',
      contexto: 'El 3D exige 140 km/h sostenidos. El neumático de serie del Twizy (Continental Conti.eContact 125/80 R13 65M) tiene índice de velocidad M = 130 km/h. Montarlo sería rodar por encima de lo que el neumático admite.',
      opciones: [
        { nombre: '125/80 R13 65T delante y 145/80 R13 75T detrás (T = 190 km/h), de otras marcas', pros: 'Misma medida que el 3D (Ø 530 / 562 mm), 290 / 387 kg por rueda, velocidad de sobra; aparecen como opción en los listados de ajuste del Twizy.', contras: 'Son neumáticos de coche pequeño antiguo, no de baja resistencia a la rodadura; el consumo a 100 km/h sube algo.', coste: 'Por confirmar (pedir a reifen.com / oponeo); el eContact 65M de referencia cuesta 74–87 € la unidad, nov. 2026' },
        { nombre: 'Continental Conti.eContact 65M / 75M (los del Twizy) y limitar el coche a 130 km/h', pros: 'Baja resistencia a la rodadura (etiqueta D, 70 dB); es el que lleva el Twizy de serie (Renault eligió a Continental como suministrador único, 2012).', contras: 'Renuncia a los 140 km/h del objetivo; habría que cambiar el parámetro del diseño.', coste: '86,52 € IVA incl. (reifen.com, nov. 2026)' },
        { nombre: '155/70 R13 (Ø 547 mm) en las cuatro ruedas, con índices altos', pros: 'Medida muy común: muchas marcas, índices T/H, precios bajos; el 3D ya la tiene como opción (`NEUMATICOS`).', contras: '3 cm más ancho delante (más resistencia al aire y más huella); hay que revisar las holguras con la rueda girada; llantas de 4,5–5J.', coste: 'Por confirmar; suele ser más barato que el 125/80' },
      ],
      recomendacion: 'La primera (65T / 75T) para el prototipo 1; medir el consumo real y, si la pérdida frente al eContact es grande, decidir entre bajar a 130 km/h o buscar un neumático EV con índice alto.',
      porQue: 'Un índice de velocidad no es una recomendación: es el límite del neumático. Y los 140 km/h son un objetivo de Eugenio que el motor ya cumple; no se tira por el neumático sin haberlo medido.',
      cuando: 'antes de comprar',
    },
    {
      tema: 'Llantas: acero del Twizy, aluminio 3 × 98 o aerodinámicas de disco',
      contexto: 'El patrón del Twizy es 3 × 98 mm con centro de 60,1 mm (poco común). La ficha actual dice «4 tornillos» y llanta 4,5J: hay que ajustarla a lo que existe.',
      opciones: [
        { nombre: 'Llantas de acero 4B × 13 ET 23,5 del Twizy, de desguace', pros: 'Encajan seguro; 45 € y 1,5 kg más por rueda según `componentes.ts`.', contras: 'Pesadas (masa no suspendida: la que más se nota en confort) y sin cara aerodinámica.', coste: '≈ 45 € cada una (alternativa «acero» de `componentes.ts`)' },
        { nombre: 'Llantas de aluminio 13″ en 3 × 98 (hay para Twizy y para pequeños Citroën/Peugeot de los 90)', pros: 'Más ligeras (≈ 5 kg); se pueden tapar con un disco plano como el SZEmission.', contras: 'Pocas referencias en 3 × 98; comprobar ET y centro.', coste: '≈ 90 € cada una (estimación de `componentes.ts`)' },
        { nombre: 'Llantas forjadas a medida', pros: '3,5 kg por llanta.', contras: 'Precio de competición; sin sentido en el prototipo 1.', coste: '≈ 260 € cada una (alternativa «forjada» de `componentes.ts`)' },
      ],
      recomendacion: 'Acero del Twizy para montar y rodar; aluminio 3 × 98 con tapacubos plano cuando se mida el Cd.',
      porQue: 'La llanta de acero cuesta la cuarta parte y no condiciona nada; los 6 kg se recuperan cuando se compren las de aluminio con el patrón ya confirmado en el coche.',
      cuando: 'antes de comprar',
    },
    {
      tema: 'Dirección: cremallera del Twizy o cremallera de kart-cross',
      contexto: 'El 3D lleva cremallera manual 10 cm por delante del eje, bieletas a las manguetas y columna con cardán. Con 110 kg sobre el eje delantero no hace falta asistencia.',
      opciones: [
        { nombre: 'Cremallera y columna del Twizy (desguace o recambio)', pros: 'Encaja con las manguetas del Twizy (misma rótula de bieleta); 2,6 vueltas; ≈ 180 € usada, 250–400 € nueva (`componentes.ts`).', contras: 'Nuestras bieletas tienen que ser 6 cm más largas (regulables de rosca); comprobar el Ackermann con la nueva vía.', coste: '≈ 180–400 €' },
        { nombre: 'Cremallera corta de aluminio de kart-cross + columna de aluminio', pros: '2 kg menos; relación más directa.', contras: 'Hay que adaptar las rótulas de las bieletas a las manguetas del Twizy; más cara.', coste: '≈ 800 € con volante de carbono (alternativa «kart» de `componentes.ts`)' },
      ],
      recomendacion: 'Cremallera y columna del Twizy con bieletas regulables.',
      porQue: 'Está diseñada para estas mismas manguetas y pesos; los 2 kg del kart-cross no valen 400 € ni el riesgo de rótulas que no casan.',
      cuando: 'antes de comprar',
    },
    {
      tema: 'Servofreno y freno de estacionamiento',
      contexto: 'La ficha «Frenos» pone servo eléctrico y freno de mano eléctrico sobre las pinzas traseras. Un Twizy (474 kg) no lleva servo y usa freno de mano por cable. El nuestro pesa ≈ 385 kg en vacío y ≈ 545 kg con dos personas.',
      opciones: [
        { nombre: 'Sin servo, bomba del Twizy y freno de estacionamiento por cable sobre las pinzas traseras', pros: 'Lo que lleva el Twizy a un peso parecido; sin electrónica; barato (bomba nueva 182,68 € en der-ersatzteile-profi.de, nov. 2026).', contras: 'Más fuerza de pedal; con el regenerativo activo casi no se nota, pero sin él hay que pisar.', coste: '≈ 150 € de bomba y repartidor + cable y palanca' },
        { nombre: 'Servofreno eléctrico (bomba de vacío eléctrica + servo de coche pequeño)', pros: 'Pedal suave; parecido a un coche.', contras: 'Bomba de vacío, depósito, cableado, 3–4 kg y otro componente que puede fallar.', coste: '≈ 150–300 € más (estimación propia, por confirmar)' },
        { nombre: 'Freno de estacionamiento eléctrico (actuadores en las pinzas)', pros: 'Un botón; sin cable ni palanca.', contras: 'Pinzas específicas con motor, unidad de control y lógica de seguridad; la norma exige que aguante sin corriente.', coste: 'Por confirmar; alto para un prototipo' },
      ],
      recomendacion: 'Sin servo y freno de estacionamiento por cable en el prototipo 1; corregir la ficha «Frenos».',
      porQue: 'Con 545 kg y discos de 214 mm el pedal es asumible, como demuestra el Twizy; el servo se decide con la fuerza de pedal medida, no antes. El cable es lo que un servicio técnico entiende sin preguntas.',
      cuando: 'antes de diseñar',
    },
    {
      tema: 'Palieres: del Twizy recortados o a medida',
      contexto: 'Nuestra vía trasera es 8 cm más estrecha que la del Twizy y la reductora puede no ser la suya (depende de «Propulsión»). Un palier demasiado largo trabaja con las juntas homocinéticas en ángulos malos y rompe.',
      opciones: [
        { nombre: 'Palieres del Twizy recortados y vueltos a estriar por un taller de ejes', pros: 'Estriado de rueda ya compatible con los bujes del Twizy; piezas de desguace.', contras: 'Recortar y estriar un eje templado lo hace un taller especializado; solo vale si la reductora es la del Twizy o tiene el mismo estriado.', coste: 'Por confirmar con un taller de transmisiones' },
        { nombre: 'Palieres a medida (GKN/Löbro o taller de ejes de competición)', pros: 'Largo y estriados exactos para nuestra reductora y nuestros bujes; juntas nuevas.', contras: 'Hay que dar el estriado de los dos extremos y los largos extendido/comprimido; plazo.', coste: 'Por confirmar; HP Academy explica dónde encargarlos' },
        { nombre: 'Palieres de catálogo de otro coche con el mismo estriado en ambos extremos', pros: 'Barato si existe.', contras: 'Encontrar la combinación exacta es una lotería.', coste: 'Por confirmar' },
      ],
      recomendacion: 'Esperar a que «Propulsión» cierre la reductora; si es la del Twizy, recortar los suyos; si no, a medida.',
      porQue: 'El palier es la última pieza que se define porque depende de dos decisiones ajenas (reductora y vía). Decidirlo antes es pagar dos veces.',
      cuando: 'antes de comprar',
    },
  ],
  partners: [
    { nombre: 'Desguace Malvarrosa', tipo: 'proveedor', pais: 'España', web: 'https://www.ebay.de/str/desguacemalvarrosa', que: 'Desguace en Riba-roja de Túria (Valencia) que vende piezas usadas con envío, con tienda en eBay (más de 41.000 artículos vendidos) y en rrr.lt; tiene Twizy despiezados (brazo trasero OEM 545045810R a 71,91 € IVA incl., nov. 2026).', porQue: 'Es el desguace español que apareció con piezas de Twizy a la venta con precio público y envío; punto de partida para manguetas, bujes, columnas, cremallera y llantas.', estado: 'por contactar', verificado: true },
    { nombre: 'rrr.lt (mercado de piezas usadas)', tipo: 'proveedor', pais: 'Lituania (vendedores de toda la UE)', web: 'https://rrr.lt/en/', que: 'Mercado online con más de 6.900 desguaces y 41 millones de anuncios; filtra por modelo (Renault Twizy) y envía a toda Europa.', porQue: 'Para encontrar la pieza de Twizy que un desguace concreto no tiene, comparando precio entre desguaces de España y del resto de Europa.', estado: 'por contactar', verificado: true },
    { nombre: 'Autodoc', tipo: 'proveedor', pais: 'Alemania (tienda en español)', web: 'https://www.autodoc.es/', que: 'Recambio nuevo por modelo: para el Twizy (MAM) tiene discos, pastillas, amortiguadores, rótulas, bieletas, rodamientos de rueda (SKF) y fuelles de palier.', porQue: 'Es el proveedor que ya cita `componentes.ts` para columnas, discos y pinzas; catálogo filtrado por Twizy con precios a la vista.', estado: 'por contactar', verificado: true },
    { nombre: 'Motordoctor', tipo: 'proveedor', pais: 'Alemania (tienda en español)', web: 'https://www.motordoctor.es/', que: 'Recambio nuevo con catálogo por modelo; rótulas de suspensión y juntas homocinéticas para Twizy.', porQue: 'Segunda tienda para comparar precio de rótulas, bieletas y rodamientos (`componentes.ts` la cita para manguetas y rótulas).', estado: 'por contactar', verificado: true },
    { nombre: 'Der Ersatzteile Profi', tipo: 'proveedor', pais: 'Alemania', web: 'https://www.der-ersatzteile-profi.de/renault/twizy-mam/bremsanlage-g123', que: 'Recambio nuevo de Twizy con precios públicos: pinza delantera 133,58 € + 35,70 € de depósito, bomba de freno 182,68 € (IVA alemán incl., envío gratis), latiguillos por metros.', porQue: 'Es la única tienda que encontramos con pinzas y bomba de Twizy nuevas y con precio visible; sirve de referencia aunque se compre en otro sitio.', estado: 'por contactar', verificado: true },
    { nombre: 'reifen.com', tipo: 'proveedor', pais: 'Alemania', web: 'https://www.reifen.com/en-de/12580-r13-65m-continental-econtact-4019238321791', que: 'Neumáticos online con envío a España: Continental Conti.eContact 125/80 R13 65M a 86,52 € IVA incl. (nov. 2026), etiqueta D/D/B 70 dB.', porQue: 'Precio público de referencia del neumático del Twizy; para comprar en España se compara con tiendas locales.', estado: 'por contactar', verificado: true },
    { nombre: 'Continental (Conti.eContact)', tipo: 'fabricante', pais: 'Alemania', web: 'https://tyrepress.com/2012/02/first-oe-approval-for-conti-e-tyre', que: 'Fabricante del neumático de serie del Twizy (Renault lo eligió como suministrador único en 2012); la gama eContact es de baja resistencia a la rodadura para eléctricos.', porQue: 'Si se quiere un neumático EV en 125/80 R13 con índice de velocidad superior a M, es a quien preguntar; su web de producto no se pudo abrir desde aquí, por eso el enlace es a la noticia.', estado: 'por contactar', verificado: false },
    { nombre: 'KYB Europe', tipo: 'fabricante', pais: 'Alemania / Japón', web: 'https://kyb-europe.com/', que: 'Amortiguadores y columnas McPherson de recambio con catálogo electrónico por modelo.', porQue: 'Proveedor que cita `componentes.ts` para las columnas McPherson delanteras (≈ 130 € cada una); su catálogo dice si hay referencia para el Twizy.', estado: 'por contactar', verificado: true },
    { nombre: 'Öhlins', tipo: 'fabricante', pais: 'Suecia', web: 'https://www.ohlins.com/', que: 'Amortiguadores de moto, quad y competición (TTX, STX), con muelles de distintas tasas y distribuidores en España.', porQue: 'Para el coilover trasero tumbado: amortiguador con ojos en los extremos, carrera y tasa de catálogo (alternativa «coilover» de `componentes.ts`, ≈ 260 € cada uno).', estado: 'por contactar', verificado: true },
    { nombre: 'Brembo (Brembo Parts)', tipo: 'fabricante', pais: 'Italia', web: 'https://www.bremboparts.com/europe/en/', que: 'Discos, pastillas, pinzas y bombas de freno para coche y moto, con catálogo por vehículo y soporte posventa.', porQue: 'Proveedor que cita `componentes.ts` para la bomba y para la alternativa de discos y pinzas de moto (1 kg menos por rueda).', estado: 'por contactar', verificado: true },
    { nombre: 'GKN Automotive (Löbro / Spidan)', tipo: 'fabricante', pais: 'Reino Unido / Alemania', web: 'https://www.gknautomotive.com/', que: 'Palieres y juntas homocinéticas de primer equipo y recambio (marcas Löbro y Spidan); documentación técnica pública sobre palieres.', porQue: 'Para los palieres a medida o el estriado compatible con los bujes del Twizy; su red de distribuidores en España da la referencia.', estado: 'por contactar', verificado: true },
    { nombre: 'Oreca Store', tipo: 'proveedor', pais: 'Francia', web: 'https://en.oreca-store.com/', que: 'Tienda europea de competición: volantes Sparco, desmontajes rápidos, columnas y bases de volante, cinturones, pedaleras.', porQue: 'Para el volante Ø 300 y el desmontaje rápido de la columna (que facilita la entrada por la puerta de gaviota), con envío desde la UE.', estado: 'por contactar', verificado: true },
    { nombre: 'INSIA (laboratorio de neumáticos y ensayos, UPM)', tipo: 'universidad', pais: 'España', web: 'https://insia-upm.es/en/ensayos-y-homologaciones/', que: 'Seis bancos de ensayo de neumáticos acreditados por ENAC bajo los Reglamentos ONU 30, 54, 108 y 109; ensayos e informes de sistemas y componentes.', porQue: 'Si hay que demostrar que un neumático aguanta la carga y la velocidad de nuestro coche, o medir frenada con instrumentación, está en Madrid y es un servicio técnico reconocido.', estado: 'por contactar', verificado: true },
    { nombre: 'I3E — Universidad Miguel Hernández (Elche)', tipo: 'universidad', pais: 'España', web: 'https://i3e.umh.es/', que: 'Diseño de detalle de chasis y sistemas mecánicos de vehículos, selección de componentes normalizados, planos de fabricación y ensayos estáticos y de fatiga.', porQue: 'Para la cinemática de la suspensión y el cálculo de los brazos, si no se hace en casa; la misma universidad que puede calcular el chasis.', estado: 'por contactar', verificado: true },
    { nombre: 'Applus IDIADA', tipo: 'laboratorio', pais: 'España', web: 'https://www.applusidiada.com/', que: 'Ensayos de frenos y de neumáticos con fines de homologación, pistas de pruebas, servicio técnico de homologación.', porQue: 'Cuando el prototipo 2 tenga que pasar la frenada del Reglamento 78 con informe oficial; para el prototipo 1, solo saber qué miden y cómo.', estado: 'por contactar', verificado: true },
    { nombre: 'Locost Builders (foro)', tipo: 'comunidad', pais: 'Reino Unido', web: 'https://locostbuilders.co.uk/', que: 'Foro de constructores de deportivos ligeros tipo Seven: hilos sobre brazos de suspensión, cremalleras adaptadas, palieres recortados y alineación en garaje.', porQue: 'Gente que lleva veinte años adaptando suspensiones y direcciones de coches de desguace a chasis propios.', estado: 'por contactar', verificado: true },
    { nombre: 'HP Academy (formación)', tipo: 'comunidad', pais: 'Nueva Zelanda (contenido en español)', web: 'https://www.hpacademy.com/es/blog/donde-comprar-ejes-y-palieres-personalizados/', que: 'Artículo en español sobre dónde y cómo encargar ejes y palieres a medida, y cursos de fabricación de competición.', porQue: 'Explica qué datos hay que dar a un taller de ejes (estriados, largos, juntas) para que el palier salga bien a la primera.', estado: 'por contactar', verificado: true },
  ],
  mensajes: [
    {
      para: 'Desguace Malvarrosa', canal: 'correo', idioma: 'es',
      asunto: 'Piezas de Renault Twizy (suspensión, bujes, frenos, dirección, llantas) para un prototipo',
      cuerpo: 'Hola,\n\nSomos el proyecto Aeromóvil 1 de humanity.wiki. Estamos construyendo el primer prototipo de un vehículo eléctrico ligero y usamos piezas de Renault Twizy (MAM) para el rodaje. Hemos visto que tenéis Twizy despiezados.\n\n¿Tenéis disponibles y a qué precio (con envío a [ciudad]):\n- 2 manguetas delanteras completas con buje y rodamiento\n- 2 columnas McPherson delanteras (amortiguador + muelle)\n- 2 bujes traseros con rodamiento (los del estriado del palier)\n- 4 discos y 4 pinzas de freno, bomba de freno y pedal\n- Cremallera de dirección con bieletas, columna y volante\n- 4 llantas 4B × 13 (3 × 98)\n- 2 palieres\n- Reductora con diferencial (nos interesa también)\n\n¿Tenéis algún Twizy entero sin batería o siniestro que vendáis completo? Nos interesaría saber el precio.\n\nGracias,\n[Nombre]\n[Teléfono] · [correo]',
      quePedimos: ['Precio de cada pieza y del lote', 'Kilómetros y año del coche de origen', 'Estado (fotos de bujes, discos y pistones de pinza)', 'Precio de un Twizy entero si lo tienen', 'Plazo y coste de envío', 'Garantía de pieza usada'],
    },
    {
      para: 'Der Ersatzteile Profi', canal: 'correo', idioma: 'en',
      asunto: 'Quotation: new Renault Twizy brake parts (calipers, master cylinder, discs, pads) for 1 and 10 vehicles',
      cuerpo: 'Hello,\n\nWe are Aeromóvil 1 (humanity.wiki, Spain), building a light electric vehicle prototype that uses Renault Twizy (MAM) brake components. We saw your Twizy brake catalogue.\n\nCould you quote, with shipping to Spain:\n- 2 front calipers (OE 410019559R / 410119463R) and 2 rear calipers\n- 1 brake master cylinder (OE 460107438R)\n- 4 brake discs (front Ø 214 mm, rear Ø 204 mm) and 2 sets of pads\n- 5 m of brake line\n\nPlease give unit prices and the price for 10 sets, as we plan a second prototype and a small series.\n\nThank you,\n[Name]\n[Phone] · [e-mail]',
      quePedimos: ['Unit price and price for 10 sets (excl. VAT, with Spanish VAT applied)', 'Whether the core deposit applies and how it is refunded', 'Lead time', 'Brand of each part (OE or aftermarket)', 'Shipping cost to Spain and payment terms'],
    },
    {
      para: 'KYB Europe', canal: 'formulario web', idioma: 'en',
      asunto: 'Front MacPherson struts for Renault Twizy and custom spring rates for a light EV prototype',
      cuerpo: 'Dear KYB Europe team,\n\nWe are Aeromóvil 1 (humanity.wiki, Spain), building a four-wheel light electric vehicle prototype (L7e, ~385 kg kerb, ~545 kg with two occupants) that uses Renault Twizy (MAM) front knuckles and MacPherson struts.\n\nCould you tell us:\n1. Your references for Twizy front struts and their availability in Spain.\n2. Whether coil springs of approx. 25 N/mm with the Twizy seat dimensions are available, or who could supply them.\n3. Unit price and price for 10 sets.\n\nThank you,\n[Name]\n[Phone] · [e-mail]',
      quePedimos: ['Strut references for Twizy front', 'Spring options and rates', 'Unit price and price for 10', 'Lead time and Spanish distributor', 'Datasheet (length, stroke, damping)'],
    },
    {
      para: 'Öhlins', canal: 'formulario web', idioma: 'en',
      asunto: 'Rear coilover shock absorbers (horizontal mounting) for a light EV prototype — spec and quotation',
      cuerpo: 'Dear Öhlins team,\n\nWe are Aeromóvil 1 (humanity.wiki, Spain), building a prototype of a four-wheel light electric vehicle (~545 kg with two occupants, 55 % on the rear axle). The rear suspension uses trailing arms with a coil-over shock mounted almost horizontally (20–30° from horizontal) under the boot floor, eye-to-eye, with approx. [330] mm extended length and [90] mm wheel travel at a motion ratio of about [0.6].\n\nCould you recommend a shock from your ATV/quad or motorsport range for this application, with a spring of about [X] N/mm, and quote 2 units and 20 units (10 vehicles)? A Spanish distributor contact would also help.\n\nThank you,\n[Name]\n[Phone] · [e-mail]',
      quePedimos: ['Recommended model and spring rate', 'Unit price and price for 20 units', 'Lead time', 'Datasheet (lengths, stroke, eye sizes, adjustments)', 'Spanish distributor'],
    },
    {
      para: 'GKN Automotive (Löbro / Spidan)', canal: 'formulario web', idioma: 'en',
      asunto: 'Custom-length driveshafts with Renault Twizy wheel-side spline for a light EV prototype',
      cuerpo: 'Dear GKN Automotive aftermarket team,\n\nWe are Aeromóvil 1 (humanity.wiki, Spain), building a light electric vehicle prototype (L7e, 15 kW nominal / 32 kW peak, ~110 N·m at the motor, 8:1 reduction) with a rear track of 1.00 m. We use Renault Twizy (MAM) rear hubs, so the wheel-side spline is the Twizy one; the gearbox side is [Twizy / to be defined].\n\nCould you tell us whether Löbro/Spidan can supply driveshafts of custom length (approx. [X] mm compressed / [Y] mm extended) with those splines, what information you need from us, and the price for 2 and for 20 units? If this is not something you do, could you point us to a workshop in Spain that shortens and re-splines shafts?\n\nThank you,\n[Name]\n[Phone] · [e-mail]',
      quePedimos: ['Whether custom-length shafts are possible', 'Information required (splines, lengths, angles)', 'Price for 2 and for 20 units', 'Lead time', 'Alternative workshop in Spain'],
    },
    {
      para: 'Oreca Store', canal: 'correo', idioma: 'en',
      asunto: 'Steering wheel, quick release and column parts for a light vehicle prototype',
      cuerpo: 'Hello,\n\nWe are Aeromóvil 1 (humanity.wiki, Spain), building a light electric vehicle prototype with a 300 mm steering wheel on a column tilted 35°. To ease entry through a gull-wing door we want a quick-release hub.\n\nCould you quote:\n- 1 Sparco 300 mm steering wheel (flat, suede or leather)\n- 1 quick-release hub compatible with it and with a [20 mm] shaft (weld-on or bolt-on)\n- 1 universal joint and splined shaft section for a [20 mm] column\n\nWith shipping to Spain, and the price for 10 sets.\n\nThank you,\n[Name]\n[Phone] · [e-mail]',
      quePedimos: ['Unit price and price for 10 sets', 'Compatibility of hub, wheel and shaft', 'Lead time and shipping to Spain', 'Datasheets', 'Payment terms'],
    },
    {
      para: 'I3E — Universidad Miguel Hernández (Elche)', canal: 'correo', idioma: 'es',
      asunto: 'Colaboración: cinemática de suspensión y cálculo de brazos de un prototipo de vehículo ligero',
      cuerpo: 'Buenos días,\n\nSomos el proyecto Aeromóvil 1 de humanity.wiki (Luz & Humanidad), un vehículo eléctrico ligero de cuatro ruedas (L7e, 3,94 m, ≈ 385 kg) con suspensión McPherson delante (manguetas de Renault Twizy) y brazos tirados con amortiguador tumbado detrás. Tenemos el 3D con los puntos duros y queremos cerrar la cinemática (caída, avance, convergencia en 90 mm de recorrido) y el cálculo de los brazos antes de fabricarlos.\n\n¿Podrían presupuestar ese trabajo, o plantearlo como proyecto de fin de grado o máster con un alumno de Ingeniería Mecánica?\n\nGracias,\n[Nombre]\n[Teléfono] · [correo]',
      quePedimos: ['Precio y plazo del estudio de cinemática', 'Precio del cálculo de brazos', 'Posibilidad de TFG/TFM', 'Qué ficheros necesitan', 'Qué entregan'],
    },
  ],
  referencias: [
    { titulo: 'Reglamento (UE) n.º 168/2013 — homologación de vehículos de categoría L (español)', url: 'https://boe.gob.es/doue/2013/060/L00052-00128.pdf', nota: 'La categoría L7e y qué reglamentos delegados aplican a frenos, dirección y neumáticos.' },
    { titulo: 'Reglamento Delegado (UE) n.º 3/2014 — seguridad funcional de los vehículos L (español)', url: 'https://www.boe.es/doue/2014/007/L00001-00102.pdf', nota: 'Los anexos de frenado (remite al Reglamento ONU 78), dirección, neumáticos y velocidad máxima de los L7e.' },
    { titulo: 'Reglamento Delegado (UE) 3/2014 — anexos (III frenado, XV neumáticos), versión de legislation.gov.uk', url: 'https://www.legislation.gov.uk/eur/2014/3/attachment/1', nota: 'Anexo III, punto 1.3: los L7e cumplen el Reglamento ONU 78 como se prescribe para L5e. Leído el 2026-11-07; contrastar con el DOUE.' },
    { titulo: 'Reglamento ONU n.º 78 — frenado de vehículos de categoría L (publicado en el DOUE)', url: 'https://eur-lex.europa.eu/eli/reg/2015/78/oj', nota: 'Deceleraciones mínimas del freno de servicio y de estacionamiento (leer las de L5e); es la vara de medir de la prueba de frenada.' },
    { titulo: 'Reglamento ONU n.º 30 — neumáticos de turismos (Naciones Unidas)', url: 'https://digitallibrary.un.org/record/597096', nota: 'Marcado, índices de carga y velocidad de los neumáticos de coche que montamos.' },
    { titulo: 'Datos de ajuste de ruedas del Renault Twizy MAM 2012–2024 (koleso.ee)', url: 'https://koleso.ee/en/valuveljed/renault/twizy/3908/mam-2012-2024/7888', nota: 'PCD 3 × 98, centro 60,1 mm, tornillos M12 × 1,5 a 75 N·m, llanta 4B × 13 ET 23,5, neumáticos 125/80 R13 65M/65T y 145/80 R13 75M/75T.' },
    { titulo: 'Continental Conti.eContact 125/80 R13 65M en reifen.com', url: 'https://www.reifen.com/en-de/12580-r13-65m-continental-econtact-4019238321791', nota: 'Precio público (86,52 € IVA incl., nov. 2026) y etiqueta europea D/D/B 70 dB del neumático del Twizy.' },
    { titulo: 'Continental Conti.eContact 125/80 R13 65M en oponeo.ie', url: 'https://www.oponeo.ie/tyre/continental-conti-econtact-125-80-r13-65-m', nota: '74 € la unidad comprando 4; explica que 65 = 290 kg y M = 130 km/h.' },
    { titulo: 'Renault elige a Continental como suministrador único del Twizy (Tyrepress, 2012)', url: 'https://tyrepress.com/2012/02/first-oe-approval-for-conti-e-tyre', nota: 'Confirma que el eContact es el neumático de serie del Twizy.' },
    { titulo: 'Brazo trasero usado de Twizy (Desguace Malvarrosa, en rrr.lt)', url: 'https://rrr.lt/en/used-part/mlv519647-renault-twizy-rear-control-arm', nota: 'Precio público de una pieza de desguace de Twizy (71,91 € IVA incl.) y ejemplo de cómo se compra.' },
    { titulo: 'Catálogo de frenos de Twizy en Der Ersatzteile Profi', url: 'https://www.der-ersatzteile-profi.de/renault/twizy-mam/bremsanlage-g123', nota: 'Pinzas nuevas (133,58 € + depósito) y bomba (182,68 €) con referencias OE.' },
    { titulo: 'Catálogo de piezas de Twizy en Autodoc', url: 'https://www.autodoc.parts/spares/renault/twizy/twizy-mam/19805-80', nota: 'Categorías disponibles para el Twizy: discos, pastillas, amortiguadores, rótulas, bieletas, rodamientos.' },
    { titulo: 'GKN: tecnología de palieres Löbro (PDF)', url: 'https://www.gknautomotive.com/globalassets/downloads/aftermarket-download-archive-files/driveshafts-technology/driveshafts_technology_loebro_gb.pdf', nota: 'Cómo funcionan las juntas homocinéticas y qué ángulos admiten: lo que hay que respetar al diseñar el brazo tirado.' },
    { titulo: 'Dónde comprar ejes y palieres a medida (HP Academy, en español)', url: 'https://www.hpacademy.com/es/blog/donde-comprar-ejes-y-palieres-personalizados/', nota: 'Qué datos pedirá un taller de ejes y qué opciones hay.' },
    { titulo: 'INSIA-UPM: ensayos y homologaciones (neumáticos y componentes)', url: 'https://insia-upm.es/en/ensayos-y-homologaciones/', nota: 'Bancos de neumáticos acreditados y ensayos de componentes a medida, en Madrid.' },
    { titulo: 'Reglas globales de la Shell Eco-marathon', url: 'https://www.shellecomarathon.com/about/global-rules.html', nota: 'Requisitos de frenos, dirección y radio de giro de los UrbanConcept: la referencia de la que viene el SZEmission.' },
  ],
  revisado: { fecha: '2026-11-06', por: 'bot de producto y compras (Claude), con webs comprobadas el mismo día' },
};
