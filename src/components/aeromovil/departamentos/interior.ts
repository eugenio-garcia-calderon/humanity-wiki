import type { Departamento } from './tipos';

// Escrito por un bot el 2026-11-06 a partir de `geometriaA1.ts` (asientos de
// velomóvil, piloto a 0,62 m del eje delantero reclinado 39°, pasajero a
// 1,31 m reclinado 30° con las piernas a los lados del asiento del piloto,
// volante y pedales regulables, 22 comprobaciones), `componentes.ts` (fichas
// «Asiento» y «Equipo»), el changelog del Aeromóvil 1 y lo encontrado en la
// web ese mismo día. Lo que no se pudo comprobar lleva «por confirmar».
//
// Vocabulario que se usa abajo, para quien no es ingeniero:
// · Punto H: el punto de la cadera del ocupante sentado. Todo el puesto de
//   conducción (volante, pedales, techo, cinturón) se mide desde ahí.
// · Percentil 5 mujer / percentil 95 hombre: la mujer más baja que aún queda
//   dentro del 95 % de la población (≈ 1,51 m) y el hombre más alto que queda
//   dentro del 95 % (≈ 1,87 m). Si caben los dos, cabe casi todo el mundo.
//   (Cifras aproximadas de antropometría europea; la base española la tiene
//   el IBV.)
// · Baquet: asiento de una pieza, de fibra, como el de un coche de carreras.
// · UN R16 / R14 / R17: reglamentos de la ONU (UNECE) sobre cinturones,
//   anclajes de cinturón y asientos con reposacabezas. El Reglamento (UE)
//   3/2014 los hace obligatorios o no según la categoría del vehículo.
export const DEPARTAMENTO: Departamento = {
  id: 'interior', nombre: 'Interior y ergonomía', lema: 'el puesto de conducción y el pasajero: asientos, mandos, visibilidad',
  mision: 'Que una persona de 1,51 m y otra de 1,87 m se sienten en el Aeromóvil 1, lleguen al volante y a los pedales, vean la carretera, se abrochen un cinturón que de verdad sujete, y aguanten dos horas sin dolor de cuello ni cristales empañados. Y que el pasajero, tumbado detrás del arco con las piernas a los lados del asiento del piloto, vaya igual de seguro y pueda convertir su plaza en cama. Todo ello con 7 kg por asiento y sin romper ninguna de las 22 comprobaciones del modelo.',
  responsabilidades: [
    'Puesto de conducción: posición del asiento del piloto (hoy a 0,62 m del eje delantero, reclinado 39°), alcance del volante (Ø 300 mm, inclinado 35°, 12 cm más cerca de serie) y de los pedales (3 cm más cerca y 8 cm más bajos de serie), para el percentil 5 mujer y el 95 hombre.',
    'Plaza del pasajero: asiento tumbado (30° de serie, hasta 85° con el deslizador), piernas estiradas a los lados del asiento del piloto, respaldo abatible para hacer cama sobre el suelo plano del maletero (≈ 1,37 × 0,64 m, 72 cm de alto, medido en el modelo «Sin pasajero»).',
    'Retención: cinturones, anclajes y reposacabezas de las dos plazas. Para matricular, cinturón homologado UN R16 y anclajes que resistan el ensayo UN R14 (30 kN, es decir, unas 3 toneladas de tirón en cada anclaje). En el modelo el arco de seguridad queda 30 cm detrás del cuello del piloto: es el sitio natural del anclaje alto.',
    'Asientos: carcasa (fibra de vidrio o carbono tipo velomóvil o baquet ligero), espuma, tapizado, railes o taladros de fijación; presupuesto de masa 7 kg por asiento (deslizador «Un asiento», rango 4–14 kg).',
    'Mandos y salpicadero: volante y columna (con cardán y absorción de impacto), pedal de acelerador electrónico y pedal de freno con bomba, pantalla CAN de 7″ con los testigos que exige el anexo VIII del Reglamento (UE) 3/2014 (identificación de mandos y testigos luminosos), claxon, intermitentes, limpiaparabrisas.',
    'Visibilidad: lo que ve el piloto por el parabrisas plano (1,00 m de largo desde 0,75 m del morro) y por las ventanillas; retrovisores (dos gotas en la base de los montantes) o cámaras; que el arco y el reposacabezas del piloto no tapen al pasajero.',
    'Ventilación, calefacción mínima y desempañado del parabrisas de policarbonato (obligatorio con parabrisas: anexo VII del 3/2014, «dispositivos de desescarchado y desempañado»).',
    'Ruido y vibración en cabina: objetivo de confort propio (el legal, 80 dB(A) exterior según UN R9, lo lleva Homologación) y aislamiento del motor que va justo detrás de las caderas del pasajero.',
    'Materiales y acabados: espuma, tela o cuero técnico, moqueta del suelo plano; inflamabilidad (ensayo ISO 3795 / FMVSS 302, el CTAG lo tiene acreditado), resistencia al sol a través de la cúpula, limpieza.',
    'Maniquíes y comprobaciones: mantener en verde «Cúpula sobre la cabeza», «Hombros a la cúpula», «Rodillas al salpicadero» y «Pies dentro del morro» de piloto y pasajero, y «Volante a la cúpula». Hoy, en la configuración base de Eugenio, fallan «Rodillas del piloto al salpicadero» (−28 mm) y «Cúpula sobre la cabeza del pasajero» (0 mm).',
    'Peso: lo que no es asiento entra en «Varios» (25 kg de presupuesto para cables, cargador, luces, cierres, pantalla, extintor, bombas y ventilación). Cada cosa que añade Interior la resta de ahí.',
    'Seguridad pasiva del habitáculo: nada punzante al alcance de la cabeza, acolchado en el arco de seguridad y en el travesaño del salpicadero, extintor accesible.',
  ],
  parametros: ['plazas', 'xPil', 'xPas', 'recPil', 'recPas', 'altPil', 'altPas', 'volAlt', 'volDist', 'pedDist', 'pedAlt', 'mAsiento', 'mOcc'],
  componentes: ['asientos', 'varios'],
  tareas: [
    {
      titulo: 'Fijar los maniquíes de referencia y la tabla de cotas del puesto',
      detalle: 'Elegir las dos personas límite (percentil 5 mujer ≈ 1,51 m y percentil 95 hombre ≈ 1,87 m; confirmar las cifras con la base antropométrica del IBV o de RAMSIS) y sacar del modelo, para cada una, la posición del punto H, de los ojos, de las manos en el volante y de los pies en el reposapiés. Hoy el modelo usa un solo maniquí (piernas 0,45 + 0,47 m, tronco 0,5 m, cuello 0,2 m). Sale una tabla con las cotas y qué deslizador (`xPil`, `altPil`, `volDist`, `volAlt`, `pedDist`, `pedAlt`, `recPil`) hay que mover para cada persona.',
      prioridad: 'alta', semanas: 1,
      entregable: 'Tabla de cotas del puesto para P5 mujer y P95 hombre, y rango necesario de cada regulación',
    },
    {
      titulo: 'Poner en verde las dos comprobaciones rojas del interior',
      detalle: 'En la configuración base de Eugenio (23:08) fallan «Rodillas del piloto al salpicadero y la carrocería» (−28 mm) y «Cúpula sobre la cabeza del pasajero» (0 mm). Probar en el modelo: subir el arco del salpicadero (`yDash`, hoy ligado a `hip + 0,42`), bajar 1–2 cm el asiento del piloto (`altPil`), alargar los pedales (`pedDist`), y para el pasajero bajar su asiento (`altPas`) o tumbarlo más (`recPas`). Anotar qué cambio cuesta menos y qué pierde (p. ej. tumbar al pasajero le quita visión).',
      prioridad: 'alta', semanas: 1,
      dependeDe: ['Fijar los maniquíes de referencia y la tabla de cotas del puesto'],
      entregable: 'Configuración base con las 22 comprobaciones en verde y nota de qué se cambió',
    },
    {
      titulo: 'Maqueta de ergonomía a escala 1:1 («buck»)',
      detalle: 'Construir con tablero, perfil de aluminio o tubo barato el suelo, el estribo (a 45,5 cm del suelo en el modelo), el travesaño del salpicadero, el arco de seguridad, dos asientos provisionales y un volante en su posición, con las cotas del modelo. Sentar al menos 8 personas de tallas distintas, cronometrar entrar y salir, medir dónde tocan (cabeza, rodillas, hombros) y fotografiar. Es la prueba que ningún programa sustituye: en el Aeromóvil el piloto va reclinado 39° con la cabeza casi recta y el pasajero tumbado con las piernas a los lados del asiento de delante, y nadie sabe aún si eso es cómodo.',
      prioridad: 'alta', semanas: 3,
      dependeDe: ['Poner en verde las dos comprobaciones rojas del interior'],
      entregable: 'Maqueta física, hoja de medidas por persona y lista de cambios al modelo',
    },
    {
      titulo: 'Definir el asiento del piloto: carcasa, espuma, tapizado y fijación',
      detalle: 'Con la decisión «Tipo de asiento del piloto» tomada: dibujar la carcasa (respaldo curvo que se ahueca en los riñones y abraza los hombros, 3,5 cm; base acolchada de 3 cm; reposacabezas casi vertical, 26 cm de ancho, como en `asientoPiezas`), elegir espuma (densidad y espesor por zona) y tela, y definir cómo se fija al travesaño del asiento y al módulo de batería que lo sostiene. Si es de catálogo (Tillett B5: 5,7–6,7 kg, £968 sin IVA en sportseats4u.co.uk), comprobar que cabe en los 0,50 m de ancho del asiento del modelo.',
      prioridad: 'alta', semanas: 2,
      dependeDe: ['Maqueta de ergonomía a escala 1:1 («buck»)'],
      entregable: 'Plano del asiento del piloto, lista de materiales y peso calculado (objetivo ≤ 7 kg)',
    },
    {
      titulo: 'Definir el asiento del pasajero y el mecanismo de cama',
      detalle: 'El pasajero va tumbado detrás del arco con las piernas a los lados del asiento del piloto. Su respaldo tiene que abatirse hasta quedar plano con el suelo del maletero (a 46,5 cm del suelo exterior en el modelo) para la cama de ≈ 1,37 m. Diseñar la bisagra del respaldo, el pasador que lo bloquea en marcha (tiene que aguantar la carga del cinturón si el anclaje va en el asiento) y la base fija. Medir en la maqueta si entre las piernas del pasajero y el asiento del piloto quedan los ±20 cm de rodillas y ±27 cm de pies del modelo.',
      prioridad: 'alta', semanas: 2,
      dependeDe: ['Maqueta de ergonomía a escala 1:1 («buck»)'],
      entregable: 'Plano del asiento del pasajero con el respaldo abatible y el cálculo del pasador',
    },
    {
      titulo: 'Geometría de cinturones y puntos de anclaje en el chasis',
      detalle: 'Para cada plaza, situar los tres anclajes (dos abajo, uno alto). Piloto: el alto en el arco de seguridad (30 cm detrás del cuello, tubo cromoly Ø 38) o en el estribo trasero; abajo en el travesaño del asiento. Pasajero: no hay estructura detrás de su cabeza (el arco de cola se quitó el 2026-11-06), así que o se añade un tubo de anclaje al chasis o el cinturón va integrado en el asiento. Con el tronco a 39° el cinturón de hombro tiende a subirse al cuello: comprobar el ángulo con el maniquí. Pasar a Chasis las cargas: UN R14 pide 30 kN por anclaje (el CTAG y el INSIA lo ensayan).',
      prioridad: 'alta', semanas: 2,
      dependeDe: ['Fijar los maniquíes de referencia y la tabla de cotas del puesto'],
      entregable: 'Croquis con los 6 anclajes, ángulos de cinturón y cargas para Chasis',
    },
    {
      titulo: 'Reposacabezas de las dos plazas',
      detalle: 'Altura y distancia a la nuca para P5 y P95 con la cabeza recta (el modelo pone el reposacabezas a un tercio del reclinado, ≈ 14° para el piloto). Si el asiento es de catálogo, el reposacabezas viene integrado; si es propio, diseñar el soporte y el acolchado. Comprobar que el del piloto no tapa la visión del pasajero ni choca con el arco al abatir.',
      prioridad: 'media', semanas: 1,
      dependeDe: ['Definir el asiento del piloto: carcasa, espuma, tapizado y fijación'],
      entregable: 'Cotas del reposacabezas en cada plaza',
    },
    {
      titulo: 'Volante, columna y su regulación',
      detalle: 'Columna de la cremallera (a 0,10 m delante del eje, 16 cm sobre el suelo del chasis) al volante (0,32 m delante de las caderas, 0,34 m por encima, de serie), con junta cardán y tramo que se arruga en un choque. Decidir si la columna regula (altura y profundidad) o si se regula el asiento y el volante es extraíble (cierre rápido) para entrar. El volante de Ø 300 mm a 35° tiene hoy 9,7 cm a la cúpula: la comprobación pide 4 cm.',
      prioridad: 'media', semanas: 1,
      dependeDe: ['Maqueta de ergonomía a escala 1:1 («buck»)'],
      entregable: 'Plano de la columna con los rangos de regulación y la lista de piezas',
    },
    {
      titulo: 'Pedalera: acelerador y freno',
      detalle: 'Sin pedales de bicicleta (es eléctrico): pedal de acelerador electrónico (potenciómetro, dos pistas, al inversor por CAN o analógico) y pedal de freno sobre la bomba de doble circuito con servo eléctrico de la ficha «Frenos». Posición de serie: reposapiés a 0,83 m delante de las caderas y 8 cm sobre el suelo del chasis. Decidir caja de pedales deslizante (regula el piloto) o fija (regula el asiento). Freno de mano eléctrico: botón en el salpicadero.',
      prioridad: 'media', semanas: 1,
      dependeDe: ['Fijar los maniquíes de referencia y la tabla de cotas del puesto'],
      entregable: 'Plano de la pedalera y especificación del pedal electrónico',
    },
    {
      titulo: 'Salpicadero y pantalla: lista de testigos obligatorios',
      detalle: 'Pantalla de 7″ con CAN (velocidad, batería, consumo) más los testigos que pide el anexo VIII del Reglamento (UE) 3/2014: largas, intermitentes, luces de posición, freno de mano, fallo de frenos, y los del vehículo eléctrico (listo para rodar, aviso de alta tensión). Velocímetro conforme a UN R39 (el IDIADA lo tiene en su alcance). Hacer la lista, elegir pantalla (ficha «Equipo»: AEM / Haltech) y dibujar el salpicadero bajo el parabrisas sin que asome por el capó (ya corregido en el modelo).',
      prioridad: 'media', semanas: 1,
      entregable: 'Lista de testigos con su símbolo y color, y boceto del salpicadero',
    },
    {
      titulo: 'Ventilación, calefacción mínima y desempañado',
      detalle: 'Calcular el caudal de aire y la potencia para desempañar un parabrisas de policarbonato de ≈ 1,0 × 0,85 m con dos personas respirando dentro en invierno: un ventilador en el salpicadero (ya en «Equipo») y una resistencia PTC (calefactor eléctrico de cerámica que se autorregula) de 300–500 W en el conducto, con salidas en la base del parabrisas; entrada de aire fresco por el morro y salida por la cola. Ver si el calor del circuito de refrigeración del motor (bomba de 12 V y radiador pequeño en la cola) se puede aprovechar. Es obligatorio para matricular (anexo VII del 3/2014).',
      prioridad: 'alta', semanas: 2,
      entregable: 'Esquema de conductos, potencia eléctrica y lista de piezas',
    },
    {
      titulo: 'Visibilidad: ángulos de visión y retrovisión',
      detalle: 'Desde los ojos de P5 y P95 (tabla de cotas): ángulo hacia abajo por el parabrisas (cuánta carretera se ve delante del morro de 0,75 m), lateral por las ventanillas, y hacia atrás. Decidir retrovisores (UN R46) o cámaras: en el modelo hay dos retrovisores «gota» en la base de los montantes y una cámara en el techo. Para matricular, el anexo X del 3/2014 (visión trasera) remite a los reglamentos UN de espejos; las cámaras valen solo con homologación aparte (ficha «Luces»).',
      prioridad: 'media', semanas: 1,
      dependeDe: ['Fijar los maniquíes de referencia y la tabla de cotas del puesto'],
      entregable: 'Diagrama de visión por maniquí y decisión espejos/cámaras',
    },
    {
      titulo: 'Ruido y vibración en cabina',
      detalle: 'Fijar un objetivo de confort (p. ej. ≤ 70 dB(A) a 100 km/h dentro; por confirmar con una medida en el Twizy, que ronda valores altos por ir sin cristales). Identificar las fuentes: motor y reductora justo detrás del pasajero, viento en las juntas de las puertas, rodadura. Prever aislante bajo el suelo del maletero y en el mamparo del motor, y pesarlo contra «Varios».',
      prioridad: 'baja', semanas: 1,
      entregable: 'Objetivo de ruido y lista de aislantes con su peso',
    },
    {
      titulo: 'Materiales de tapizado y acabado',
      detalle: 'Elegir espuma, tela y moqueta con ensayo de inflamabilidad (ISO 3795 / FMVSS 302, acreditado en el CTAG), resistentes al sol (la cúpula deja pasar mucha luz) y lavables. Pedir muestras y precio por m². Definir el acabado del arco de seguridad (acolchado) y del travesaño del salpicadero.',
      prioridad: 'baja', semanas: 1,
      dependeDe: ['Definir el asiento del piloto: carcasa, espuma, tapizado y fijación'],
      entregable: 'Muestrario con precio y certificado de inflamabilidad',
    },
    {
      titulo: 'Entrar y salir: prueba cronometrada con Accesos',
      detalle: 'En la maqueta, con el hueco de la puerta real (hoy 0,60 m de alto en la configuración base; la comprobación pide 0,80 × 0,50 m) y el arco en su sitio, cronometrar entrar y salir el piloto y el pasajero (por el hueco tras el arco, abatiendo el asiento o por el portón trasero). Objetivo orientativo: salir en menos de 10 s sin ayuda. Es la costura entre Interior y Accesos: quien llegue segundo comprueba que las dos geometrías coinciden.',
      prioridad: 'alta', semanas: 1,
      dependeDe: ['Maqueta de ergonomía a escala 1:1 («buck»)', 'Fijar las cotas del hueco de la puerta y el objetivo'],
      entregable: 'Tiempos de entrada y salida por persona y vía, con vídeo',
    },
    {
      titulo: 'Pedir presupuestos de asientos, cinturones y pantalla',
      detalle: 'Enviar los mensajes preparados abajo (Tillett, Car Builder Solutions, Schroth, Sparco, Castro Composites) con las cotas del puesto. Comparar precio, plazo y peso, y anotar la pieza elegida en la ficha «La pieza real, escrita a mano» de cada componente para que el peso entre en el modelo.',
      prioridad: 'alta', semanas: 2,
      dependeDe: ['Definir el asiento del piloto: carcasa, espuma, tapizado y fijación', 'Geometría de cinturones y puntos de anclaje en el chasis'],
      entregable: 'Tabla comparativa de ofertas y fichas de componentes rellenas',
    },
    {
      titulo: 'Estudio de ergonomía con el IBV o con RAMSIS',
      detalle: 'Con el buck hecho y las cotas fijadas, encargar una revisión externa: el IBV (Valencia) puede medir postura y confort con personas reales y sensores de presión en el asiento; una licencia o un servicio con RAMSIS (maniquí digital que usan casi todos los fabricantes) comprueba alcance, visión y postura para toda la población. Pedir presupuesto de las dos cosas antes de decidir.',
      prioridad: 'media', semanas: 4,
      dependeDe: ['Maqueta de ergonomía a escala 1:1 («buck»)'],
      entregable: 'Informe de ergonomía externo con los cambios recomendados',
    },
    {
      titulo: 'Montar el interior en el prototipo 1 y probar con personas',
      detalle: 'Asientos, cinturones, volante, pedalera, pantalla, ventilación y tapizado montados en el chasis real. Repetir la sesión de la maqueta con las mismas personas, ahora con la cúpula cerrada: cabeza, hombros, rodillas, visión, empañado con dos personas dentro durante 20 minutos, ruido a 50 y 100 km/h en circuito.',
      prioridad: 'alta', semanas: 2,
      dependeDe: ['Pedir presupuestos de asientos, cinturones y pantalla', 'Ventilación, calefacción mínima y desempañado'],
      entregable: 'Informe de pruebas con fotos y medidas, y lista de cambios para el prototipo 2',
    },
  ],
  decisiones: [
    {
      tema: 'Tipo de asiento del piloto',
      contexto: 'La ficha «Asiento» prevé un baquet de composite de 7 kg a 650 € (estimación del catálogo del proyecto, sin presupuesto). El modelo dibuja un asiento de velomóvil con respaldo curvo; un baquet de catálogo no tiene esa curva y pesa parecido. Hay que decidir antes de pedir nada.',
      opciones: [
        { nombre: 'Baquet ligero de catálogo (Tillett B5 o similar)', pros: 'Se compra hoy; 5,7–6,7 kg con reposacabezas; carcasa probada; cabe en 0,50 m', contras: 'Respaldo recto, no el curvo de velomóvil; sin homologación para calle (es pieza de competición: «Not FIA approved» en la B5); tapizado de carreras', coste: '£968 sin IVA la B5 de fibra de vidrio (sportseats4u.co.uk, 2026); la ficha del proyecto estima 650 €/ud' },
        { nombre: 'Carcasa propia de fibra desde el STEP del modelo', pros: 'La forma exacta del modelo (lumbar, hombros, reposacabezas a 14°); se integra con el módulo de batería; 4–5 kg si sale bien', contras: 'Hay que hacer molde y laminar; dos o tres iteraciones; nadie garantiza la resistencia hasta ensayarla', coste: 'Material ≈ 100–200 € por asiento con los precios de la ficha «Carrocería» (vidrio 70 €/m²); el molde es trabajo, no dinero. Por confirmar' },
        { nombre: 'Asiento de serie de desguace (Twizy)', pros: 'Barato; lleva anclajes y cinturón ya homologados en un L7e', contras: 'Pesa mucho más (por confirmar) y es vertical: no cabe bajo la cúpula baja del Aeromóvil', coste: 'Por confirmar en desguace' },
      ],
      recomendacion: 'Prototipo 1 con baquet de catálogo (Tillett B5 o equivalente) y, en paralelo, el molde de la carcasa propia para el prototipo 2.',
      porQue: 'Lo que Eugenio gana es tiempo: el prototipo 1 rueda con un asiento que existe, y la carcasa propia (que es la que da la postura de velomóvil) se desarrolla sin bloquear nada. Cambiar de uno a otro después es quitar cuatro tornillos.',
      cuando: 'antes de comprar',
    },
    {
      tema: 'Cinturón: 3 puntos con retractor, arnés de 4 puntos o cinturón integrado en el asiento',
      contexto: 'La ficha dice «cinturón de 4 puntos». Para matricular como L7e-CP el anexo XII del Reglamento (UE) 3/2014 exige cinturones y anclajes conformes a los reglamentos UN (R16 y R14). Un arnés de competición sin marca «E» no vale para calle. Y con el tronco a 39° el cinturón de hombro necesita un anclaje alto bien colocado.',
      opciones: [
        { nombre: '3 puntos con retractor, homologado UN R16', pros: 'Es lo que se matricula; se compra hecho (Securon vende cinturones E-marcados para fabricantes pequeños; Car Builder Solutions los tiene en catálogo); el anclaje alto cae en el arco de seguridad', contras: 'Con el asiento reclinado hay que comprobar que la banda no se sube al cuello; el pasajero no tiene estructura detrás para el anclaje alto', coste: '£61–108 por cinturón (carbuilder.com y arnoldclarkautoparts.com, 2026)' },
        { nombre: 'Arnés de 4 puntos', pros: 'Sujeta mejor en circuito con el cuerpo tumbado; es lo que dibuja la ficha', contras: 'Sin homologación para calle salvo modelos concretos (Schroth tiene arneses con homologación ECE para vehículos determinados: por confirmar si admiten uno nuevo); más incómodo a diario; sin retractor', coste: 'Por confirmar (pedir a Schroth)' },
        { nombre: 'Cinturón integrado en el asiento («belt-in-seat»)', pros: 'Resuelve el anclaje alto del pasajero sin añadir tubo al chasis', contras: 'El asiento tiene que aguantar los 30 kN del R14: asiento pesado y caro, fuera del presupuesto de 7 kg', coste: 'Por confirmar; muy por encima de las otras dos' },
      ],
      recomendacion: '3 puntos con retractor homologado en las dos plazas para matricular; arnés de 4 puntos solo en las pruebas en circuito, montado en los mismos anclajes.',
      porQue: 'El cinturón homologado es la pieza más barata de todo el interior y la única que la ITV mira con lupa. El arnés se añade para el circuito sin cambiar nada del chasis.',
      cuando: 'antes de diseñar',
    },
    {
      tema: 'Asiento del pasajero: fijo, abatible o extraíble',
      contexto: 'Eugenio quiere que al tumbar el asiento del pasajero quede una cama sobre el suelo plano del maletero. El modelo ya mide el hueco «Sin pasajero» (≈ 630 L, 1,37 × 0,64 m). Hay que decidir cómo desaparece el asiento.',
      opciones: [
        { nombre: 'Respaldo abatible sobre bisagra, base fija', pros: 'Mecanismo sencillo (bisagra + pasador); la base hace de colchón; se usa en todos los coches', contras: 'El pasador tiene que aguantar la carga del cinturón si el anclaje va en el asiento; la base ocupa parte de la cama', coste: 'Herrajes de catálogo, decenas de euros (por confirmar)' },
        { nombre: 'Asiento extraíble entero', pros: 'La cama queda totalmente plana y gana el espacio de la base', contras: 'Hay que sacarlo y guardarlo (no cabe en el maletero delantero); anclajes rápidos que aguanten el cinturón: más caros', coste: 'Por confirmar' },
        { nombre: 'Asiento fijo (sin cama en el prototipo 1)', pros: 'Nada que diseñar ni que pueda fallar', contras: 'Pierde la función que pidió Eugenio', coste: '0 €' },
      ],
      recomendacion: 'Respaldo abatible sobre bisagra con pasador, base fija, en el prototipo 1.',
      porQue: 'Es lo que hace cualquier banqueta trasera y permite probar la cama ya en el primer prototipo; si la base molesta, el extraíble se decide con datos del prototipo 1.',
      cuando: 'antes de diseñar',
    },
    {
      tema: 'Regulación: ¿regula la columna y la pedalera, o regula el asiento?',
      contexto: 'El modelo tiene cuatro deslizadores de regulación (volante altura/distancia, pedales distancia/altura). En un coche real cada regulación es un mecanismo, peso y dinero. Con dos tallas límite tan distintas (1,51 y 1,87 m) algo tiene que moverse unos 20 cm.',
      opciones: [
        { nombre: 'Asiento sobre railes (≈ 20 cm) + volante extraíble; columna y pedales fijos', pros: 'Un solo mecanismo (railes de catálogo); los railes también sirven para abatir hacia delante y dejar pasar al pasajero', contras: 'El asiento está sobre el módulo de batería: los railes suben el punto H 2–3 cm y comen holgura de cabeza (hoy 168 mm para el piloto: hay margen)', coste: 'Railes de catálogo, por confirmar' },
        { nombre: 'Asiento fijo + pedalera deslizante + columna regulable', pros: 'El piloto no se mueve: la cabeza queda siempre bajo el punto más alto del techo', contras: 'Dos mecanismos; la pedalera regulable (tipo caja de pedales de competición) es cara y pesada', coste: 'Por confirmar (pedir a proveedores de pedaleras de competición)' },
        { nombre: 'Todo fijo, hecho a medida del primer piloto', pros: 'Lo más barato y ligero para el prototipo 1', contras: 'Solo una persona lo conduce bien; no sirve para la sesión de ergonomía con varias tallas', coste: '0 €' },
      ],
      recomendacion: 'Asiento sobre railes de catálogo y volante extraíble; pedalera y columna fijas en el prototipo 1.',
      porQue: 'Resuelve las dos tallas con una sola pieza que se compra hecha, y el mismo rail abate el asiento para que pase el pasajero. Eugenio gana un prototipo que puede conducir cualquiera del equipo.',
      cuando: 'antes de diseñar',
    },
    {
      tema: 'Pantalla e instrumentación',
      contexto: 'Hace falta velocímetro, estado de la batería, y los testigos luminosos obligatorios. La ficha «Equipo» propone una pantalla CAN de 7″.',
      opciones: [
        { nombre: 'Pantalla CAN de competición (AEM, AiM o similar)', pros: 'Lee el inversor y el BMS por CAN; configurable; testigos programables', contras: 'Hay que programarla; los símbolos legales (anexo VIII del 3/2014) no vienen de serie', coste: 'La ficha «Equipo» estima 600 € para todo el lote; precio de la pantalla por confirmar' },
        { nombre: 'Cuadro de instrumentos de Twizy de desguace', pros: 'Ya tiene los testigos legales y está homologado en un L7e', contras: 'Habla el CAN de Renault: casi imposible de alimentar desde otro inversor sin ingeniería inversa', coste: 'Por confirmar en desguace' },
        { nombre: 'Tablet o móvil con app', pros: 'Barato y flexible', contras: 'No vale para matricular (velocímetro y testigos tienen que ser del vehículo); se apaga con el calor del sol bajo la cúpula', coste: '0–300 €' },
      ],
      recomendacion: 'Pantalla CAN configurable con los testigos legales programados, más un bloque de testigos físicos si la pantalla no puede mostrarlos con el color y símbolo exigidos.',
      porQue: 'Es la única opción que enseña los datos del inversor y del BMS y que se puede dejar conforme a la norma. Programarla es trabajo, no dinero.',
      cuando: 'antes de comprar',
    },
    {
      tema: 'Desempañado del parabrisas',
      contexto: 'Dos personas dentro de una cúpula de policarbonato en invierno empañan el cristal en minutos. Para matricular es obligatorio un dispositivo de desempañado (anexo VII del 3/2014). El policarbonato no admite los hilos calefactores de un cristal de coche.',
      opciones: [
        { nombre: 'Ventilador + resistencia PTC en conducto hacia la base del parabrisas', pros: 'Piezas de catálogo (ventilador 12 V y PTC de 300–500 W); se enciende solo cuando hace falta', contras: 'Hasta 500 W de la batería (≈ 1 km de autonomía por cada 10 minutos encendido, por confirmar con el consumo del modelo)', coste: 'Por confirmar; decenas de euros en piezas' },
        { nombre: 'Película calefactora transparente pegada al parabrisas', pros: 'Desempaña en toda la superficie, sin conductos', contras: 'Producto poco habitual para policarbonato curvo; coste y suministro por confirmar', coste: 'Por confirmar' },
        { nombre: 'Solo ventilación con aire exterior', pros: 'Sin consumo', contras: 'No desempaña con lluvia y frío; no cumple el anexo VII', coste: '0 €' },
      ],
      recomendacion: 'Ventilador + resistencia PTC con salidas en la base del parabrisas, y entrada de aire fresco por el morro.',
      porQue: 'Es lo que llevan los coches sin motor térmico que calentar; piezas de catálogo y un cálculo de una tarde.',
      cuando: 'antes de diseñar',
    },
    {
      tema: 'Retrovisión: espejos o cámaras',
      contexto: 'El modelo lleva dos retrovisores «gota» en la base de los montantes y una cámara en el techo. Las cámaras ahorran resistencia aerodinámica y 1 kg (ficha «Luces»), pero para matricular hacen falta espejos conformes a los reglamentos UN que cita el anexo X del 3/2014.',
      opciones: [
        { nombre: 'Dos espejos homologados (de moto o de coche pequeño)', pros: 'Se matricula; baratos; sin pantalla', contras: 'Resistencia aerodinámica y anchura; vibran a 100 km/h en un brazo largo', coste: 'Ficha «Luces»: incluidos en los 320 € del lote' },
        { nombre: 'Cámaras + pantalla', pros: 'Menos resistencia; −1 kg; visión nocturna mejor', contras: 'Homologación de sistema cámara-monitor aparte, cara y lenta; latencia; deslumbramiento en la pantalla', coste: 'Ficha «Luces»: 420 € el kit, sin contar la homologación' },
      ],
      recomendacion: 'Espejos homologados en el prototipo 1, con la cámara trasera del techo como extra para aparcar.',
      porQue: 'Nadie ha matriculado un cuadriciclo con cámaras en lugar de espejos sin una homologación aparte; en el prototipo 1 el objetivo es rodar y medir, no ganar 1 kg.',
      cuando: 'antes de comprar',
    },
  ],
  partners: [
    { nombre: 'Tillett Racing Seats', tipo: 'proveedor', pais: 'Reino Unido', web: 'https://tillett.co.uk', que: 'Baquets ligeros de fibra de vidrio y carbono (B5: 5,7–6,7 kg; B6, B7 ultraligero). Lista de precios en su web; la B5 de fibra sale a £968 sin IVA en un distribuidor.', porQue: 'Es el proveedor de la ficha «Asiento» del proyecto y el baquet más ligero de catálogo que cabe en 0,50 m.', estado: 'por contactar', verificado: true },
    { nombre: 'Car Builder Solutions', tipo: 'proveedor', pais: 'Reino Unido', web: 'https://www.carbuilder.com/', que: 'Tienda para quien construye su propio coche: cinturones de 3 puntos con retractor marcados «E» (ECE R16) desde £32, cinturones Securon, railes, juntas de puerta, muelles de gas, manillas.', porQue: 'Vende en unidades sueltas lo que los fabricantes grandes solo venden por miles, y marca qué piezas pasan la homologación individual británica (IVA), que es el equivalente de nuestra homologación individual.', estado: 'por contactar', verificado: true },
    { nombre: 'Securon', tipo: 'proveedor', pais: 'Reino Unido', que: 'Cinturones de seguridad de 3 y 4 puntos con retractor, homologados ECE R16, para restauraciones y fabricantes pequeños (el de 3 puntos retráctil cuesta £108 en arnoldclarkautoparts.com).', porQue: 'Es la marca que aparece en todos los catálogos de piezas para constructores artesanales; se compra a través de Car Builder Solutions.', estado: 'por contactar', verificado: false },
    { nombre: 'Schroth Safety Products', tipo: 'proveedor', pais: 'Alemania', que: 'Arneses de 4 y 6 puntos de competición y algunos modelos con homologación ECE para uso en calle en vehículos concretos.', porQue: 'Si se quiere arnés de 4 puntos homologado para calle, es el fabricante europeo al que preguntar. Web no comprobada en esta sesión.', estado: 'por contactar', verificado: false },
    { nombre: 'Sparco', tipo: 'proveedor', pais: 'Italia', web: 'https://www.sparco.com/', que: 'Baquets de fibra (gama básica ≈ 9 kg según la ficha «Asiento»), volantes, cinturones, extintores.', porQue: 'Proveedor de la ficha; cubre asiento, volante y extintor en un solo pedido. La web es la del catálogo del proyecto; no se recomprobó en esta sesión.', estado: 'por contactar', verificado: false },
    { nombre: 'OMP Racing', tipo: 'proveedor', pais: 'Italia', que: 'Baquets, volantes y arneses de competición; gama básica más barata que Sparco según la ficha «Asiento».', porQue: 'Segunda oferta para comparar con Sparco y Tillett. Web no comprobada en esta sesión.', estado: 'por contactar', verificado: false },
    { nombre: 'Instituto de Biomecánica de Valencia (IBV)', tipo: 'universidad', pais: 'España', web: 'https://www.ibv.org', que: 'Grupo de Factores Humanos: evaluación ergonómica con personas reales, antropometría, confort de asientos (sensores de presión), diseño centrado en el usuario. Universitat Politècnica de València, ibv@ibv.upv.es, +34 96 111 11 80.', porQue: 'Es el centro español de referencia en ergonomía aplicada a productos, a dos horas de Madrid; puede medir el buck con gente de todas las tallas.', estado: 'por contactar', verificado: true },
    { nombre: 'Human Solutions GmbH (RAMSIS)', tipo: 'proveedor', pais: 'Alemania', que: 'RAMSIS, el maniquí digital que usa el 90 % de los fabricantes de coches para comprobar postura, alcance y visión de toda la población (desarrollado por la TU de Múnich con la industria alemana).', porQue: 'Es el programa que sustituye al buck cuando el buck ya ha dicho lo básico; licencia o servicio puntual. Web no comprobada en esta sesión.', estado: 'por contactar', verificado: false },
    { nombre: 'INSIA – Universidad Politécnica de Madrid', tipo: 'laboratorio', pais: 'España', web: 'https://insia-upm.es/en/ensayos-y-homologaciones/', que: 'Laboratorio de seguridad pasiva: ensayos de choque y de sistemas de retención (UN R16, R17, R94, R100), maniquíes Hybrid III del 50 y del 95. Campus Sur UPM, Madrid; insia.insia@upm.es, +34 91 067 88 50.', porQue: 'Está en Madrid y ensaya exactamente cinturones y asientos; además asesora al Ministerio en reglamentación.', estado: 'por contactar', verificado: true },
    { nombre: 'CTAG – Centro Tecnológico de Automoción de Galicia', tipo: 'laboratorio', pais: 'España', web: 'https://ctag.com/', que: 'Acreditado por ENAC (anexo 621/LE1230, 2025) para anclajes de cinturón UN R14 (30 kN), reposacabezas y respaldos UN R17, inflamabilidad de materiales ISO 3795 / FMVSS 302, EMC UN R10, vibración y clima. Porriño (Pontevedra).', porQue: 'Puede ensayar los anclajes y los tapizados del Aeromóvil con acreditación oficial, que es lo que un servicio técnico de homologación aceptará.', estado: 'por contactar', verificado: true },
    { nombre: 'AEM Electronics', tipo: 'proveedor', pais: 'Estados Unidos', web: 'https://www.aemelectronics.com/', que: 'Pantallas CAN de 7″ configurables para vehículos de competición y prototipos.', porQue: 'Proveedor de la ficha «Equipo»; la web es la del catálogo del proyecto, no recomprobada en esta sesión.', estado: 'por contactar', verificado: false },
    { nombre: 'Castro Composites', tipo: 'proveedor', pais: 'España', web: 'https://www.castrocompositesshop.com/', que: 'Tejidos de vidrio y carbono, resinas, espumas de alma y consumibles para laminar la carcasa propia del asiento y el salpicadero.', porQue: 'Proveedor de la ficha «Carrocería» (carbono 200 g/m² ≈ 40 €/m², epoxi ≈ 25 €/kg); tienda española con envío en unidades. Web del catálogo del proyecto, no recomprobada en esta sesión.', estado: 'por contactar', verificado: false },
    { nombre: 'SPAL Automotive', tipo: 'proveedor', pais: 'Italia', que: 'Ventiladores axiales y centrífugos de 12 V para automoción (los de los radiadores y los de habitáculo de muchos coches).', porQue: 'Para el ventilador del desempañado y el del radiador pequeño de la cola. Web no comprobada en esta sesión.', estado: 'por contactar', verificado: false },
  ],
  mensajes: [
    {
      para: 'Tillett Racing Seats', canal: 'correo', idioma: 'en',
      asunto: 'Lightweight seats for a two-seat electric L7e prototype (Spain)',
      cuerpo: 'Hello,\n\nWe are building the first prototype of a light four-wheel electric vehicle (EU category L7e, about 385 kg, tandem 1+1) in [ciudad], Spain. The driver sits reclined at about 39 degrees under a low canopy, with the head almost upright; the passenger sits behind, reclined 30 to 45 degrees. The seat bay is 0.50 m wide and the seat rests on a flat battery module.\n\nWe are considering your B5 or B6 shells (GRP first, carbon later). Could you tell us:\n- weight and price (ex VAT, delivered to Spain) of the B5 and B6 in GRP and in carbon, with headrest;\n- external width at the hips and shoulders, and the overall height of the shell;\n- which fixing kits you offer (side mounts, rails) and their weight;\n- whether any of your seats have been used in a road-registered low-volume vehicle, and if so how the seat belt was anchored;\n- lead time for two seats.\n\nThank you,\n[nombre]\n[proyecto / web]\n[teléfono]',
      quePedimos: ['Peso y precio sin IVA de B5 y B6 en vidrio y carbono, con reposacabezas, puestos en España', 'Ancho exterior en cadera y hombros, y alto de la carcasa', 'Kits de fijación (soportes laterales, railes) y su peso', 'Si algún asiento suyo va en un vehículo matriculado de serie corta y cómo se ancló el cinturón', 'Plazo de entrega para dos asientos'],
    },
    {
      para: 'Car Builder Solutions', canal: 'correo', idioma: 'en',
      asunto: 'E-marked seat belts and seat rails for a low-volume electric vehicle prototype',
      cuerpo: 'Hello,\n\nWe are building a two-seat electric light vehicle prototype (EU category L7e) in Spain and will go through individual approval. We need, for two seating positions:\n- three-point retracting seat belts with ECE R16 E-mark (the driver seat is reclined about 39 degrees, the upper anchorage will be on a steel roll hoop behind the driver);\n- seat rails (about 200 mm travel) and quick-release steering wheel boss, if you stock them;\n- door rubber seals (bulb type, for a composite gullwing door) and gas struts (we expect about 300 N each).\n\nCould you send us the product codes you recommend, prices, the approval marking of each belt, and shipping cost and lead time to Spain?\n\nThank you,\n[nombre]\n[proyecto / web]',
      quePedimos: ['Códigos y precio de cinturones de 3 puntos con retractor marcados ECE R16', 'Railes de asiento (~200 mm) y cierre rápido de volante', 'Juntas de puerta de bulbo y muelles de gas de ~300 N', 'Marca de homologación de cada cinturón', 'Gastos de envío y plazo a España'],
    },
    {
      para: 'Schroth Safety Products', canal: 'correo', idioma: 'en',
      asunto: 'Road-legal (ECE R16) four-point harness for a new two-seat L7e vehicle',
      cuerpo: 'Hello,\n\nWe are developing a two-seat electric L7e vehicle in Spain with a reclined driving position (about 39 degrees) and a steel roll hoop behind the driver. We would like to know whether any of your four-point harnesses can be fitted with ECE R16 approval in a newly designed vehicle going through individual approval, or whether the ECE approval is restricted to the specific car models listed in your catalogue.\n\nIf it is possible, could you tell us the harness model, the anchorage requirements (position, angles, load), the price for two sets and the lead time?\n\nThank you,\n[nombre]\n[proyecto / web]',
      quePedimos: ['Si existe arnés de 4 puntos con homologación ECE R16 válida en un vehículo nuevo con homologación individual', 'Modelo, requisitos de anclaje (posición, ángulos, carga)', 'Precio de dos juegos y plazo'],
    },
    {
      para: 'Sparco', canal: 'correo', idioma: 'en',
      asunto: 'Quotation: two lightweight seats, steering wheel and extinguisher for an L7e prototype',
      cuerpo: 'Hello,\n\nWe are building the first prototype of a light electric four-wheel vehicle (EU L7e, tandem 1+1) in Spain. Could you quote, delivered to Spain:\n- two fibreglass bucket seats with integrated headrest, as light as possible (our budget is 7 kg per seat), external width at the hips not above 0.50 m;\n- one 300 mm steering wheel with quick-release hub;\n- one hand-held extinguisher with bracket.\n\nPlease include weight per item, price ex VAT and lead time.\n\nThank you,\n[nombre]\n[proyecto / web]',
      quePedimos: ['Dos baquets de fibra de vidrio con reposacabezas, peso ≤ 7 kg, ancho ≤ 0,50 m', 'Volante de 300 mm con cierre rápido', 'Extintor con soporte', 'Peso, precio sin IVA y plazo'],
    },
    {
      para: 'Instituto de Biomecánica de Valencia (IBV)', canal: 'correo', idioma: 'es',
      asunto: 'Estudio de ergonomía del puesto de conducción de un vehículo eléctrico ligero (prototipo)',
      cuerpo: 'Buenos días,\n\nEstamos desarrollando en [ciudad] el Aeromóvil 1, un vehículo eléctrico ligero de cuatro ruedas (categoría L7e, ≈ 385 kg, tándem 1+1) con una postura poco habitual: el piloto va reclinado unos 39° con la cabeza casi recta bajo una cúpula baja, y el pasajero va tumbado detrás, con las piernas a los lados del asiento del piloto. Tenemos un modelo paramétrico 3D y vamos a construir una maqueta a escala 1:1 del habitáculo.\n\nNos gustaría saber si podrían hacer un estudio de ergonomía del puesto (postura, alcance de mandos, visión, confort del asiento con sensores de presión) con personas desde el percentil 5 femenino hasta el 95 masculino, sobre nuestra maqueta o en sus instalaciones, y qué supondría en plazo y coste. También nos interesa saber si disponen de datos antropométricos de población española que podamos usar para fijar las tallas límite del diseño.\n\nAdjuntamos [planos / capturas del modelo].\n\nMuchas gracias,\n[nombre]\n[proyecto / web]\n[teléfono]',
      quePedimos: ['Si pueden hacer el estudio sobre nuestra maqueta 1:1 o en sus instalaciones', 'Plazo y presupuesto del estudio con personas P5 mujer a P95 hombre', 'Qué mediciones incluyen (postura, alcance, visión, presión en el asiento)', 'Si tienen datos antropométricos de población española y en qué condiciones'],
    },
    {
      para: 'INSIA – Universidad Politécnica de Madrid', canal: 'correo', idioma: 'es',
      asunto: 'Consulta: ensayo de cinturones y anclajes (UN R16 / R14) para un prototipo L7e',
      cuerpo: 'Buenos días,\n\nEstamos construyendo en [ciudad] el primer prototipo de un vehículo eléctrico ligero de cuatro ruedas de categoría L7e-CP (≈ 385 kg, dos plazas en tándem, chasis tubular de aluminio con arco de seguridad de acero). Queremos preparar desde el principio los cinturones y sus anclajes para una homologación individual.\n\nNos gustaría saber:\n- si pueden ensayar los anclajes de cinturón (UN R14) y el conjunto asiento-cinturón (UN R16) de un vehículo de categoría L, y qué muestras o parte del chasis necesitan;\n- si ofrecen asesoría previa para colocar bien los anclajes con un asiento reclinado unos 39°;\n- plazo y presupuesto orientativo de cada ensayo.\n\nAdjuntamos [croquis de los anclajes].\n\nMuchas gracias,\n[nombre]\n[proyecto / web]\n[teléfono]',
      quePedimos: ['Si ensayan R14 y R16 en categoría L y qué muestras necesitan', 'Asesoría previa para los anclajes con asiento reclinado', 'Plazo y presupuesto orientativo por ensayo'],
    },
    {
      para: 'Castro Composites', canal: 'correo', idioma: 'es',
      asunto: 'Presupuesto de materiales para la carcasa de dos asientos y un salpicadero (prototipo)',
      cuerpo: 'Buenos días,\n\nPara el prototipo de un vehículo eléctrico ligero queremos laminar dos carcasas de asiento (unos 0,6 m² cada una, con respaldo curvo) y un salpicadero, en fibra de vidrio con alma de espuma para la primera unidad y en carbono más adelante. ¿Podrían recomendarnos y presupuestar: tejido de vidrio y de carbono, resina epoxi, espuma de alma de 5 mm, consumibles de laminado al vacío y el material para hacer el molde a partir de un modelo fresado? Indíquennos cantidades mínimas, precio y plazo.\n\nGracias,\n[nombre]\n[proyecto / web]',
      quePedimos: ['Lista de materiales recomendada para dos carcasas de asiento y un salpicadero', 'Precio y cantidad mínima de cada material', 'Material para el molde', 'Plazo de entrega'],
    },
  ],
  referencias: [
    { titulo: 'Reglamento Delegado (UE) 3/2014: seguridad funcional de los vehículos de categoría L (texto)', url: 'https://eur-lex.europa.eu/eli/reg_del/2014/3/oj/eng', nota: 'Anexo VII desempañado, VIII mandos y testigos, X visión trasera, XII cinturones y anclajes, XIII asientos, XVII protección de ocupantes (interior y puertas).' },
    { titulo: 'Reglamento 3/2014, capítulo II: qué anexo trata cada tema', url: 'https://www.legislation.gov.uk/eur/2014/3/chapter/II/data.html', nota: 'Artículos 7–23 con el anexo que aplica a frenos, seguridad eléctrica, cristales, visión, cinturones, asientos, dirección, neumáticos y ocupantes.' },
    { titulo: 'Reglamento (UE) 168/2013, anexo II: lista de requisitos para L7e-C', url: 'https://legislation.gov.uk/eur/2013/168/annexes/adopted?view=plain', nota: 'Para L7e-C aplican, entre otros, B6 (cristales y desempañado), B7 (mandos y testigos), B9 (visión trasera), B11 (cinturones y anclajes), B12 (asientos); B16 (protección de ocupantes, reposacabezas y puertas) figura como «IF» (condicional).' },
    { titulo: 'Tillett B5 GRP: precio y peso en un distribuidor', url: 'https://www.sportseats4u.co.uk/?p=16757', nota: 'Desde £967,99 sin IVA, 5,7–6,7 kg, «Not FIA approved». Consultado 2026-11-06.' },
    { titulo: 'Securon 3 puntos retráctil 700/BLACK: precio', url: 'https://www.arnoldclarkautoparts.com/products/securon-harness-3-point-retracting-black-700-black', nota: '£108,48; «confirms to ECE R16 approval». Consultado 2026-11-06.' },
    { titulo: 'Car Builder Solutions: cinturones con retractor marcados E', url: 'https://www.carbuilder.com/collections/seatbelts-harnesses-inertia-static?page=1', nota: 'Cinturón retráctil con stalk de 150 mm, £32,40, ECE R16.08; cinturones Securon £61–82 «E marked, IVA compliant».' },
    { titulo: 'RAMSIS (TU Múnich): qué es el maniquí digital', url: 'https://www.mec.ed.tum.de/en/lfe/research/software/ramsis/', nota: 'Desarrollado por la cátedra de ergonomía de la TUM con la industria alemana; lo vende Human Solutions GmbH; lo usa el 90 % de los fabricantes.' },
    { titulo: 'IBV, Grupo de Factores Humanos', url: 'https://factoreshumanos.ibv.org/portfolio-types/proyecto/', nota: 'Servicios de evaluación ergonómica y antropometría; dirección y teléfono de contacto.' },
    { titulo: 'INSIA-UPM: ensayos de seguridad pasiva', url: 'https://upm.es/recursosidi/offers-resources/servicios-cientifico-tecnologico/servicios-servicios-cientifico-tecnologico/ensayos-de-seguridad-pasiva/?print=pdf', nota: 'Ensayos de choque y de retención (UN R16, R17, R94, R100), maniquíes Hybrid III 50 y 95.' },
    { titulo: 'CTAG: anexo técnico de acreditación ENAC 621/LE1230 (2025)', url: 'https://ctag.com/wp-content/uploads/2025/10/621_LE1230.pdf', nota: 'Anclajes R14 (30 kN), reposacabezas y respaldos R17, inflamabilidad ISO 3795 / FMVSS 302, EMC R10, vibración, clima.' },
    { titulo: 'Euro NCAP, abril 2016: «Quadricycle safety at a standstill»', url: 'https://www.euroncap.com/nl/pers/persberichten/quadricycle-safety-at-a-standstill', nota: 'Cuatro cuadriciclos pesados con 1–2 estrellas; la protección del conductor «muy baja». Argumento para cuidar cinturones, estructura y reposacabezas aunque la ley no lo exija.' },
  ],
  revisado: { fecha: '2026-11-06', por: 'bot de interior, accesos y homologación (Claude)' },
};
