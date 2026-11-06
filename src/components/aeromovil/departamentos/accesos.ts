import type { Departamento } from './tipos';

// Escrito por un bot el 2026-11-06 a partir de `geometriaA1.ts` (puerta de
// ala de gaviota solo del piloto, del montante del parabrisas al arco de
// seguridad, bisagras en el canto del techo con un herraje en cada barra,
// apertura 105°, esquinas redondeadas; capó con bisagra atrás a 55°; cola
// de la cúpula con bisagra delante a 50°; estribo a 22 cm sobre el suelo del
// chasis; comprobaciones del hueco de la puerta 0,50 × 0,80 m), de las fichas
// «Puertas» y «Maleteros» de `componentes.ts`, del changelog y de lo
// encontrado en la web ese día. Lo no comprobado lleva «por confirmar».
//
// Vocabulario:
// · Ala de gaviota: puerta con la bisagra arriba, en el techo, que sube al
//   abrirse (como el DeLorean o el Aptera). Aquí el techo se queda fijo y
//   solo sube la ventanilla con su costado y el panel lateral.
// · Estribo: el tubo del chasis que corre a lo largo del borde inferior del
//   hueco de la puerta. En el modelo está a 22 cm sobre el suelo del chasis,
//   que a su vez está a 23,5 cm del suelo exterior.
// · Muelle (o resorte) de gas: el cilindro que sostiene abierto el portón de
//   un coche. Se elige por la fuerza (N) y la carrera (mm).
// · Junta de bulbo: perfil de goma con una «pinza» que muerde el borde de la
//   chapa y un tubo hueco que se aplasta contra la puerta para cerrar el agua.
// · UN R11: reglamento de la ONU sobre cerraduras y bisagras de puertas (que
//   no se abran en un choque). Obligatorio en coches, no en L7e; el IDIADA lo
//   ensaya.
export const DEPARTAMENTO: Departamento = {
  id: 'accesos', nombre: 'Puertas, maleteros y accesos', lema: 'cómo se entra, cómo se carga y cómo cierra',
  mision: 'Que el piloto entre y salga del Aeromóvil 1 por su puerta de gaviota sin agacharse más que en un coche bajo, que el pasajero tenga una vía de entrada clara y una de salida de emergencia, que las dos puertas, el capó y la cola cierren sin ruido y sin agua, y que la toma de carga y la llave funcionen desde el primer día. El hueco de la puerta mide hoy 0,60 m de alto donde la práctica pide 0,80: ese es el problema número uno de este departamento.',
  responsabilidades: [
    'Puerta del piloto (una a cada lado): corte en la cúpula (del montante del parabrisas al arco de seguridad, esquinas redondeadas) y en la carrocería (panel lateral detrás del salpicadero), bisagras de gaviota en el canto del techo con un herraje en el montante y otro en el arco, apertura de 105°, largo máximo 1,4 m.',
    'Dimensiones del hueco: la comprobación del modelo pide 0,50 m de ancho y 0,80 m de alto (regla de la Shell Eco-marathon para UrbanConcept). En la configuración base de Eugenio el ancho pasa y el alto se queda en 0,60 m. Este departamento tiene que cerrar esa diferencia o justificar por qué basta.',
    'Muelles de gas y cálculo de la puerta: masa, centro de gravedad, par en la bisagra, fuerza y carrera de los dos resortes de 300 N previstos en la ficha «Puertas», y que la puerta no se caiga sobre la cabeza con viento.',
    'Cerradura y manilla: cierre que retenga en marcha y en un golpe (criterio UN R11 como buena práctica), manilla exterior e interior, apertura de emergencia desde fuera sin herramienta y desde dentro sin llave, cierre eléctrico o manual (la ficha prevé eléctrico con apertura manual de emergencia).',
    'Juntas y estanqueidad: perfil de EPDM en todo el contorno (ficha «Puertas»), pestaña en la carrocería para la pinza, drenaje, prueba de agua y de ruido de viento a 100 km/h.',
    'Entrada y salida del pasajero: por el hueco de la puerta del piloto pasando tras el arco, abatiendo el asiento del piloto, o por la cola de la cúpula (portón trasero) sobre el suelo plano. Y una segunda salida para los dos si el vehículo queda sobre una puerta.',
    'Tapa del maletero delantero (capó): bisagra en su borde trasero, abre 55°, un muelle de gas y un cierre con seguro secundario para que no se abra en marcha.',
    'Tapa del maletero trasero (la cola de la cúpula): bisagra en su borde delantero, abre 50°, muelle de gas, cierre, junta; es también la tapa de la cama y, si se decide, la entrada del pasajero.',
    'Toma de carga: conector tipo 2 (el cargador de 3,3 kW de la ficha ya lo prevé) en el morro, lado izquierdo, con tapa, junta y drenaje; cable hasta el cargador bajo el salpicadero.',
    'Llave y arranque: antirrobo (para L7e-C aplica el punto C5 del anexo II del Reglamento 168/2013, «dispositivos contra la utilización no autorizada»), llave o botón, interbloqueo con el inversor.',
    'Peso: 4 kg de herrajes de puertas y 2 kg de maleteros en «Varios» (`MASAS_FIJAS_A1`); cada bisagra, cierre y muelle que se añade se pesa contra eso.',
  ],
  parametros: ['puerta'],
  componentes: ['puertas', 'maleteros'],
  tareas: [
    {
      titulo: 'Fijar las cotas del hueco de la puerta y el objetivo',
      detalle: 'Sacar del modelo las cotas reales del hueco en la configuración base: ancho entre el borde delantero y trasero del panel lateral, alto desde el estribo (a 45,5 cm del suelo exterior) hasta el techo a la altura del piloto (0,60 m), forma del borde superior redondeado. Medir con cinta el hueco de tres coches reales bajos (p. ej. un deportivo de dos plazas, un Twizy y un utilitario) para tener una referencia de lo que la gente acepta, porque el 0,80 m de la comprobación viene de la Shell Eco-marathon (un solo ocupante tumbado) y no de una norma de calle. Fijar un objetivo propio (ancho × alto) con esa referencia.',
      prioridad: 'alta', semanas: 1,
      entregable: 'Hoja con las cotas del hueco actual, las de tres coches reales y el objetivo adoptado',
    },
    {
      titulo: 'Rediseñar el corte de la puerta hasta cumplir el alto del hueco',
      detalle: 'Probar en el modelo, por orden de coste: (1) bajar el estribo de 22 cm a ≈ 8 cm sobre el suelo del chasis, con lo que el hueco crece unos 14 cm (el estribo es un tubo del chasis: coordinar con Chasis, porque también es la viga de choque lateral); (2) alargar la puerta hacia delante hasta el pie del montante (ya llega) y redondear menos las esquinas; (3) adelantar o subir el punto más alto del techo (`parabrisas`, `techo`) sobre el hueco. El techo sigue fijo (decisión de Eugenio del 2026-11-06). Dejar la comprobación «Hueco de la puerta: alto» en verde o documentar con qué alto se queda y por qué.',
      prioridad: 'alta', semanas: 2,
      dependeDe: ['Fijar las cotas del hueco de la puerta y el objetivo'],
      entregable: 'Nueva geometría del corte en el modelo y nota de qué se movió en el chasis',
    },
    {
      titulo: 'Cálculo de la puerta: masa, centro de gravedad, bisagra y muelles de gas',
      detalle: 'Con el corte definitivo: superficie de la puerta (costado de la cúpula + panel lateral), masa con el material elegido (carbono 1,8 mm o vidrio, ver ficha «Carrocería»), más la ventanilla de policarbonato de 4 mm (≈ 4,8 kg/m²) y los herrajes. Calcular el par en la bisagra a lo largo de los 105° de apertura y elegir fuerza, carrera y puntos de anclaje de los muelles de gas de forma que la puerta se sostenga sola a partir de ≈ 30° y no golpee al final. Ejemplo orientativo: 7 kg con el centro a 0,45 m de la bisagra y el muelle actuando a 0,10 m piden ≈ 310 N en total, lo que cuadra con los 2 × 300 N de la ficha con margen; confirmar con la masa real.',
      prioridad: 'alta', semanas: 1,
      dependeDe: ['Rediseñar el corte de la puerta hasta cumplir el alto del hueco'],
      entregable: 'Hoja de cálculo de la puerta y especificación de los muelles (fuerza, carrera, longitud)',
    },
    {
      titulo: 'Diseñar los herrajes de bisagra en el montante y en el arco',
      detalle: 'El modelo cuelga la puerta de dos bisagras en el canto del techo: un herraje con bulón en el montante del parabrisas (acero Ø 30) y otro en el arco de seguridad (acero Ø 38). Dibujar las dos piezas (mecanizadas o soldadas), el eje común, los casquillos, cómo se ajusta la puerta en montaje (holguras de ±2 mm) y cómo se desmonta. Incluir un tope de apertura y comprobar que a 105° la puerta no toca el techo ni el panel solar.',
      prioridad: 'alta', semanas: 2,
      dependeDe: ['Cálculo de la puerta: masa, centro de gravedad, bisagra y muelles de gas'],
      entregable: 'Planos de los dos herrajes y del eje, con material y tratamiento',
    },
    {
      titulo: 'Cerradura, manilla y apertura de emergencia',
      detalle: 'Elegir el cierre (manual de palanca o eléctrico con actuador, ver decisión), dónde engancha en el estribo, la manilla exterior (a ras, en el panel lateral) y la interior, y la apertura de emergencia: desde fuera, un tirador o cable accesible sin herramienta; desde dentro, sin llave y con la puerta a oscuras. Si es eléctrico, qué pasa sin 12 V. Como buena práctica, retención en dos posiciones (seguro y entreabierto) como pide UN R11 en los coches.',
      prioridad: 'alta', semanas: 1,
      dependeDe: ['Rediseñar el corte de la puerta hasta cumplir el alto del hueco'],
      entregable: 'Esquema del cierre con piezas, cableado si lo hay, y procedimiento de emergencia escrito',
    },
    {
      titulo: 'Juntas, pestaña y estanqueidad',
      detalle: 'Diseñar la pestaña (reborde) laminada en el contorno del hueco donde muerde la junta de bulbo, el canal de drenaje en la base, y el solape de la puerta sobre el techo (la bisagra está en el canto del techo: el agua entra por ahí si no hay solape). Elegir el perfil (EPDM, bulbo simple o doble) y pedir muestras. Prever la prueba de manguera y la de viento.',
      prioridad: 'media', semanas: 1,
      dependeDe: ['Rediseñar el corte de la puerta hasta cumplir el alto del hueco'],
      entregable: 'Sección del cierre puerta-carrocería con la junta elegida y el drenaje',
    },
    {
      titulo: 'Decidir si la ventanilla del piloto abre',
      detalle: 'La ventanilla va en la puerta y es fija en el modelo. Sin ventanilla practicable no hay forma de pagar un peaje, coger un tique o ventilar sin abrir la puerta entera. Opciones: fija (prototipo 1), una pequeña corredera dentro del cristal (como en los Microlino y en muchos cuadriciclos), o ventanilla deslizante completa. Pesar contra el coste y la estanqueidad.',
      prioridad: 'baja', semanas: 1,
      entregable: 'Decisión escrita y, si abre, croquis de la corredera',
    },
    {
      titulo: 'Definir la entrada y la salida del pasajero',
      detalle: 'El pasajero va detrás del arco y su puerta no existe. Probar en la maqueta 1:1 de Interior las tres vías: (a) por la puerta del piloto, pasando tras el arco con el asiento del piloto abatido o deslizado hacia delante; (b) por la cola de la cúpula abierta (portón trasero a 50°), entrando de rodillas sobre el suelo plano; (c) una puerta propia detrás del arco (la que descartó Eugenio para no partir el techo). Cronometrar con tres personas de tallas distintas. Es la costura con Interior: la prueba es la misma que su tarea «Entrar y salir: prueba cronometrada con Accesos».',
      prioridad: 'alta', semanas: 1,
      dependeDe: ['Fijar las cotas del hueco de la puerta y el objetivo'],
      entregable: 'Vía elegida, tiempos medidos y cambios necesarios en asiento o portón',
    },
    {
      titulo: 'Salida de emergencia con el vehículo volcado o con la puerta bloqueada',
      detalle: 'Con una puerta de gaviota a cada lado, si el vehículo queda sobre un costado una de las dos puertas no abre y la otra pesa el doble. Definir la segunda salida para los dos ocupantes: la otra puerta (hay que poder cruzar el arco), la cola de la cúpula desde dentro (tirador interior), o el parabrisas expulsable. Escribir el procedimiento y probarlo en la maqueta con el vehículo inclinado.',
      prioridad: 'alta', semanas: 1,
      dependeDe: ['Definir la entrada y la salida del pasajero'],
      entregable: 'Procedimiento de evacuación y lista de tiradores interiores',
    },
    {
      titulo: 'Capó: bisagra, muelle de gas y cierre con seguro secundario',
      detalle: 'Tapa del maletero delantero con bisagra en su borde trasero (abre hacia delante y arriba 55°). Diseñar las dos bisagras, un muelle de gas, el cierre principal y un seguro secundario (gancho) para que, si el cierre falla, el capó no se levante con el viento a 100 km/h (en los coches es obligatorio por eso). Junta perimetral y drenaje a los pasos de rueda. Peso objetivo: dentro de los 2 kg de herrajes de «Maleteros».',
      prioridad: 'media', semanas: 1,
      entregable: 'Plano del capó con herrajes y especificación del muelle',
    },
    {
      titulo: 'Cola de la cúpula: bisagra, muelle, cierre y junta',
      detalle: 'La tapa trasera es la cola de la cúpula con bisagra en su borde delantero (abre 50°). Lleva panel solar encima: pasar el cable por la bisagra con bucle de servicio. Un muelle de gas, cierre con manilla exterior y tirador interior (es salida de emergencia y acceso a la cama), junta de bulbo, y que al abrir no toque la tercera luz de freno ni la barra de luz del borde de fuga.',
      prioridad: 'media', semanas: 1,
      dependeDe: ['Definir la entrada y la salida del pasajero'],
      entregable: 'Plano de la cola con herrajes, paso de cable y cierre',
    },
    {
      titulo: 'Toma de carga: conector, tapa y recorrido del cable',
      detalle: 'Conector tipo 2 (hembra de vehículo, con bloqueo electromecánico para modo 3) en el morro, lado izquierdo, con tapa a ras con junta y drenaje. Cable de 3,3 kW hasta el cargador bajo el salpicadero (a la derecha de la pierna del piloto) por dentro de la carrocería sin pasar por el hueco de la rueda delantera girada 22°. Prever también una toma schuko de emergencia solo si el cargador lo admite.',
      prioridad: 'media', semanas: 1,
      entregable: 'Posición de la toma en el modelo, recorrido del cable y lista de piezas',
    },
    {
      titulo: 'Llave, arranque y antirrobo',
      detalle: 'Definir la secuencia: llave o tarjeta → 12 V → precarga → contactores → «listo». Para L7e-C el anexo II del Reglamento 168/2013 marca aplicable el punto C5 (dispositivos contra la utilización no autorizada); qué reglamento UN concreto pide el Reglamento 44/2014 para un cuadriciclo con volante (R18 de coches o R62 de manillar) está por confirmar. Lo mínimo sensato: inmovilizador que impida activar el inversor sin la llave, y bloqueo del cierre de las puertas.',
      prioridad: 'media', semanas: 1,
      entregable: 'Esquema de arranque y antirrobo, y el requisito legal confirmado',
    },
    {
      titulo: 'Pedir presupuestos de muelles, bisagras, cierres, juntas y toma de carga',
      detalle: 'Enviar los mensajes preparados (Stabilus, Southco, EMKA, Cikautxo, Mennekes, Car Builder Solutions, Castro Composites) con las cotas de la puerta y los cálculos. Comparar y anotar lo elegido en la ficha «Puertas» (La pieza real, escrita a mano) para que el peso entre en el modelo.',
      prioridad: 'alta', semanas: 2,
      dependeDe: ['Cálculo de la puerta: masa, centro de gravedad, bisagra y muelles de gas', 'Juntas, pestaña y estanqueidad'],
      entregable: 'Tabla comparativa de ofertas y fichas rellenas',
    },
    {
      titulo: 'Puerta de prueba en banco: 1.000 aperturas',
      detalle: 'Antes de laminar la puerta definitiva, montar una puerta de prueba (puede ser de contrachapado con la masa real añadida) sobre un bastidor con el montante y el arco en su posición, con las bisagras, los muelles y el cierre reales. Abrir y cerrar 1.000 veces, medir la fuerza en la manilla, el ruido al cerrar y la holgura final de las bisagras. Corregir antes de hacer el molde.',
      prioridad: 'media', semanas: 2,
      dependeDe: ['Diseñar los herrajes de bisagra en el montante y en el arco', 'Cerradura, manilla y apertura de emergencia'],
      entregable: 'Informe del banco con fuerzas, ruido y desgaste',
    },
    {
      titulo: 'Montaje en el prototipo 1 y pruebas de agua, viento y evacuación',
      detalle: 'Puertas, capó, cola, toma de carga y llave montados en el chasis con la carrocería. Prueba de manguera 10 minutos por cada abertura, rodar a 80–100 km/h en circuito y escuchar las juntas, y repetir la evacuación cronometrada con la cúpula cerrada y el vehículo inclinado con un gato.',
      prioridad: 'alta', semanas: 2,
      dependeDe: ['Pedir presupuestos de muelles, bisagras, cierres, juntas y toma de carga', 'Puerta de prueba en banco: 1.000 aperturas'],
      entregable: 'Informe de pruebas con fotos, fugas encontradas y lista de cambios para el prototipo 2',
    },
  ],
  decisiones: [
    {
      tema: 'Cómo llegar a un hueco de puerta de 0,80 m de alto (hoy 0,60 m)',
      contexto: 'La comprobación del modelo pide 0,50 × 0,80 m (regla de la Shell Eco-marathon para UrbanConcept). En la configuración base de Eugenio el alto, medido del estribo (45,5 cm del suelo) al techo sobre el piloto, es 0,60 m. Eugenio ha fijado que el techo no forma parte de la puerta.',
      opciones: [
        { nombre: 'Bajar el estribo hasta ≈ 8 cm sobre el suelo del chasis', pros: 'Gana ≈ 14 cm de un golpe (hueco ≈ 0,74 m); es lo que hace el Aptera, cuya puerta llega casi al suelo', contras: 'El estribo es la viga lateral del chasis: bajarlo cambia la protección de costado y los pies del arco y del montante; el panel lateral de la puerta se hace más alto y pesado', coste: 'Horas de diseño en Chasis; no cambia el coste de piezas' },
        { nombre: 'Estribo donde está y techo más alto sobre el hueco', pros: 'No toca el chasis', contras: 'Sube el punto más alto del coche (1,11 m) y la resistencia aerodinámica; el techo es panel solar y es fijo; necesita 20 cm, que no hay', coste: 'Consumo en todos los kilómetros del vehículo' },
        { nombre: 'Aceptar menos de 0,80 m y facilitar la entrada con el asiento en railes y el volante extraíble', pros: 'Nada que cambiar en carrocería ni chasis; es lo que hacen los deportivos bajos', contras: 'La comprobación sigue en rojo; gente mayor o alta no entra; hay que medir cuánto es «menos»', coste: 'Railes y cierre rápido, que Interior ya propone por otra razón' },
      ],
      recomendacion: 'Bajar el estribo todo lo que Chasis admita (objetivo ≥ 0,74 m de hueco) y, además, asiento en railes y volante extraíble; medir el resultado en la maqueta 1:1 antes de dar la comprobación por cerrada.',
      porQue: 'Lo que Eugenio gana es un coche en el que entra cualquiera del equipo sin maniobras. El estribo se baja en el modelo en una tarde y se ve el efecto; subir el techo cuesta autonomía para siempre.',
      cuando: 'antes de diseñar',
    },
    {
      tema: 'Tipo de bisagra de gaviota',
      contexto: 'La puerta cuelga de dos puntos en el canto del techo, uno en cada barra de acero. Hay que elegir cómo gira.',
      opciones: [
        { nombre: 'Eje simple con bulón en cada barra', pros: 'Dos piezas mecanizadas sencillas; es lo que dibuja el modelo; fácil de ajustar', contras: 'El eje tiene que ser recto entre las dos barras: la curva del techo entre montante y arco manda; la puerta sube en arco y necesita 105° para despejar la cabeza', coste: 'Dos herrajes mecanizados: por confirmar en taller' },
        { nombre: 'Bisagra de cuatro barras (la puerta se separa y luego sube)', pros: 'Despeja la junta del techo sin solape; menos altura total abierta en un garaje', contras: 'Más piezas, más holgura con el tiempo, más cara; difícil con 4 kg de presupuesto', coste: 'Por confirmar; varias veces la anterior' },
        { nombre: 'Muelle de torsión en la bisagra en vez de muelles de gas', pros: 'Sin cilindros a la vista', contras: 'Muelle a medida, no de catálogo; peor para ajustar la fuerza', coste: 'Por confirmar' },
      ],
      recomendacion: 'Eje simple con bulón en cada barra y dos muelles de gas de catálogo, como está en el modelo.',
      porQue: 'Es la solución que se puede fabricar en un taller local y ajustar con una llave; los muelles de gas se cambian por otros de otra fuerza en diez minutos si el cálculo se queda corto.',
      cuando: 'antes de diseñar',
    },
    {
      tema: 'Cierre manual o eléctrico',
      contexto: 'La ficha «Puertas» prevé cierre eléctrico con apertura manual de emergencia (380 € el lote de las dos puertas, estimación del catálogo del proyecto) y ofrece la alternativa manual (220 €).',
      opciones: [
        { nombre: 'Cierre manual de palanca (tipo Southco) con manilla', pros: 'Sin cableado ni actuador; funciona sin 12 V; 0,4 kg menos según la ficha', contras: 'Sin cierre centralizado ni apertura con mando; la manilla exterior tiene que ir a ras para la aerodinámica', coste: '≈ 220 € el lote (estimación de la ficha, sin presupuesto)' },
        { nombre: 'Cierre eléctrico con actuador y apertura manual de emergencia', pros: 'Cierre desde dentro y mando a distancia; manilla exterior puede ser un pulsador a ras', contras: 'Cable, relé, y un modo de fallo más (sin 12 V hay que tirar del cable de emergencia)', coste: '≈ 380 € el lote (estimación de la ficha)' },
      ],
      recomendacion: 'Manual en el prototipo 1, con el hueco y el cableado previstos para pasar a eléctrico en el prototipo 2.',
      porQue: 'En un prototipo que se va a abrir cientos de veces en pruebas, lo que importa es que cierre siempre; la comodidad del mando se añade después sin tocar la puerta.',
      cuando: 'antes de comprar',
    },
    {
      tema: 'Junta de la puerta',
      contexto: 'La ficha prevé perfil de EPDM en todo el contorno. Una puerta de composite no tiene el reborde de chapa de un coche: hay que laminarlo.',
      opciones: [
        { nombre: 'Junta de bulbo con pinza sobre pestaña laminada', pros: 'Es la junta de cualquier coche; se compra por metros; absorbe ±3 mm de holgura', contras: 'Obliga a laminar una pestaña de 8–10 mm en todo el contorno y a controlar su espesor', coste: 'Por metros; pedir muestras (Cikautxo, Car Builder Solutions)' },
        { nombre: 'Junta pegada (perfil en D autoadhesivo)', pros: 'Sin pestaña; se pega en una tarde', contras: 'Se despega con el calor bajo la cúpula; peor estanqueidad en esquinas', coste: 'Más barata; por confirmar' },
      ],
      recomendacion: 'Junta de bulbo con pinza sobre pestaña laminada, y perfil en D pegado solo en la cola si hace falta un segundo cierre.',
      porQue: 'La pestaña es trabajo del molde, no dinero, y la junta de pinza es la única que aguanta años; la pegada vale para tapar una fuga en pruebas.',
      cuando: 'antes de fabricar',
    },
    {
      tema: 'Vía de entrada del pasajero',
      contexto: 'Eugenio decidió puerta solo del piloto, del montante al arco, para no partir el techo. El pasajero va detrás del arco, tumbado, con las piernas a los lados del asiento del piloto.',
      opciones: [
        { nombre: 'Por la puerta del piloto, con su asiento deslizado o abatido', pros: 'Sin aberturas nuevas; los railes del asiento ya los propone Interior', contras: 'Hay que pasar bajo o tras el arco y luego estirar las piernas hacia delante: por probar en la maqueta', coste: '0 € en carrocería' },
        { nombre: 'Por la cola de la cúpula (portón trasero) sobre el suelo plano', pros: 'La cola ya abre 50° y el suelo es plano hasta el respaldo del piloto; entra de rodillas y se tumba', contras: 'Con lluvia entra agua a la cama; el portón tiene que tener tirador interior; hay que apartar el equipaje', coste: '0 € en carrocería; herrajes algo más robustos' },
        { nombre: 'Puerta propia del pasajero detrás del arco', pros: 'Entra como en un coche', contras: 'Parte la cúpula y el panel solar, dos cierres más, y Eugenio ya lo descartó', coste: 'Molde y herrajes nuevos; por confirmar' },
      ],
      recomendacion: 'Probar las dos primeras en la maqueta 1:1 y elegir con el cronómetro; preparar el tirador interior de la cola en cualquier caso, porque es salida de emergencia.',
      porQue: 'Las dos vías baratas ya están en el modelo; nadie sabe cuál es cómoda hasta que tres personas distintas lo intentan. Es una decisión que se toma con un cronómetro, no con un plano.',
      cuando: 'antes de diseñar',
    },
    {
      tema: 'Toma de carga: tipo 2 o schuko',
      contexto: 'El cargador a bordo de la ficha es de 3,3 kW, 230 V monofásico, «tipo 2 o schuko»; el cableado de alta tensión prevé «toma de carga tipo 2 con tapa en el costado izquierdo» y el changelog la sitúa en el morro, lado izquierdo.',
      opciones: [
        { nombre: 'Conector tipo 2 (el de los coches eléctricos en Europa)', pros: 'Carga en cualquier poste público y en un wallbox; bloqueo del cable; es lo que espera la ITV en un eléctrico', contras: 'Conector y electrónica de control (piloto CP/PP) más caros que un enchufe', coste: 'Por confirmar (Mennekes, Phoenix Contact)' },
        { nombre: 'Enchufe schuko con cable fijo', pros: 'Lo más barato; carga en cualquier enchufe', contras: 'No carga en postes públicos; sin bloqueo; menos seguro bajo lluvia', coste: 'Decenas de euros' },
      ],
      recomendacion: 'Tipo 2 en el morro, y un cable tipo 2 a schuko en el maletero para cargar en casa.',
      porQue: 'El cargador ya lo admite y es lo que permite cargar fuera de casa; el cable a schuko cubre el caso barato sin cambiar el coche.',
      cuando: 'antes de comprar',
    },
    {
      tema: 'Material de la puerta: carbono o fibra de vidrio',
      contexto: 'La carrocería de serie es carbono de 1,8 mm con alma de espuma; la ficha ofrece fibra de vidrio como alternativa barata para un primer prototipo (mismo molde). La puerta es la pieza que más se manipula y más golpes recibe.',
      opciones: [
        { nombre: 'Carbono como el resto de la carrocería', pros: 'Más ligera (menos fuerza en bisagras y muelles); mismo acabado', contras: 'Cara; un golpe en el canto la deslamina y no se ve', coste: 'Ficha «Carrocería»: 230 €/m² de material' },
        { nombre: 'Fibra de vidrio con alma', pros: 'Un tercio del precio del material; se repara en el taller; se ve el daño', contras: 'Algo más pesada: hay que recalcular los muelles', coste: 'Ficha «Carrocería»: 70 €/m² de material' },
      ],
      recomendacion: 'Fibra de vidrio en las puertas y tapas del prototipo 1; carbono cuando la geometría ya no cambie.',
      porQue: 'Las puertas del prototipo 1 se van a recortar, taladrar y golpear; es mejor que eso le pase a una pieza barata y reparable.',
      cuando: 'antes de fabricar',
    },
  ],
  partners: [
    { nombre: 'Stabilus', tipo: 'proveedor', pais: 'Alemania', web: 'https://www.stabilus.com/', que: 'Muelles de gas y amortiguadores para portones y capós de automoción; los que llevan los coches de serie.', porQue: 'Proveedor de las fichas «Puertas» y «Maleteros»; tiene catálogo por fuerza y carrera. La web es la del catálogo del proyecto, no recomprobada en esta sesión.', estado: 'por contactar', verificado: false },
    { nombre: 'Southco', tipo: 'proveedor', pais: 'Estados Unidos (con distribución en la UE)', web: 'https://www.southco.com/', que: 'Cierres de palanca y eléctricos, bisagras, manillas a ras y cierres rápidos para vehículos y maquinaria.', porQue: 'Proveedor de la ficha «Puertas» para cierres y bisagras; vende en unidades. Web del catálogo del proyecto, no recomprobada en esta sesión.', estado: 'por contactar', verificado: false },
    { nombre: 'Suspa', tipo: 'proveedor', pais: 'Alemania', que: 'Muelles de gas y amortiguadores; segunda marca de la ficha «Puertas».', porQue: 'Para comparar con Stabilus. Web no comprobada en esta sesión.', estado: 'por contactar', verificado: false },
    { nombre: 'Bansbach easylift', tipo: 'proveedor', pais: 'Alemania', que: 'Muelles de gas configurables en pequeñas cantidades (fuerza y carrera a medida).', porQue: 'Fabricante que suele atender pedidos de pocas unidades. Web no comprobada en esta sesión.', estado: 'por contactar', verificado: false },
    { nombre: 'EMKA', tipo: 'proveedor', pais: 'Alemania', que: 'Cerraduras, bisagras, manillas y juntas para armarios, vehículos y maquinaria; catálogo amplio de cierres de un cuarto de vuelta y de compresión.', porQue: 'Alternativa europea a Southco para cierres y bisagras. Web no comprobada en esta sesión.', estado: 'por contactar', verificado: false },
    { nombre: 'Cikautxo', tipo: 'proveedor', pais: 'España', que: 'Perfiles y piezas de caucho para automoción (juntas de puerta, conductos), en Berriatua (Bizkaia).', porQue: 'Fabricante español de juntas de puerta de serie; si atiende un prototipo, es el más cercano. Web no comprobada en esta sesión.', estado: 'por contactar', verificado: false },
    { nombre: 'Standard Profil', tipo: 'proveedor', pais: 'España / Turquía', que: 'Sistemas de sellado de puertas y ventanillas para fabricantes de coches, con planta en España.', porQue: 'Segundo fabricante de juntas en la península; probablemente solo por volumen, pero puede indicar un distribuidor. Web no comprobada en esta sesión.', estado: 'por contactar', verificado: false },
    { nombre: 'Mennekes', tipo: 'proveedor', pais: 'Alemania', que: 'Inventor del conector tipo 2; vende tomas de vehículo (inlets) con bloqueo y cables.', porQue: 'La toma de carga de referencia en Europa. Web no comprobada en esta sesión.', estado: 'por contactar', verificado: false },
    { nombre: 'Phoenix Contact E-Mobility', tipo: 'proveedor', pais: 'Alemania', que: 'Tomas de vehículo tipo 2 y CCS, controladores de carga para el lado vehículo.', porQue: 'Segunda oferta de toma de carga, con la electrónica de control. Web no comprobada en esta sesión.', estado: 'por contactar', verificado: false },
    { nombre: 'Car Builder Solutions', tipo: 'proveedor', pais: 'Reino Unido', web: 'https://www.carbuilder.com/', que: 'Tienda para constructores de coches propios: muelles de gas, bisagras, cierres, manillas, juntas de puerta por metros, cinturones.', porQue: 'Vende en unidades y envía a España; sirve para la puerta de prueba antes de ir a los fabricantes grandes.', estado: 'por contactar', verificado: true },
    { nombre: 'Castro Composites', tipo: 'proveedor', pais: 'España', web: 'https://www.castrocompositesshop.com/', que: 'Tejidos, resinas, espumas de alma y consumibles para laminar puertas y tapas con su pestaña.', porQue: 'Proveedor de la ficha «Carrocería»; tienda española. Web del catálogo del proyecto, no recomprobada en esta sesión.', estado: 'por contactar', verificado: false },
    { nombre: 'Applus IDIADA', tipo: 'laboratorio', pais: 'España', web: 'https://www.applusidiada.com/', que: 'Servicio técnico de homologación acreditado por ENAC (anexo 35/LE2594); en su alcance figura UN R11 (cerraduras y bisagras de puertas) además de los reglamentos de categoría L. Santa Oliva (Tarragona).', porQue: 'Si se quiere demostrar que las puertas de gaviota no se abren en un golpe, es quien puede ensayarlo con validez oficial.', estado: 'por contactar', verificado: true },
    { nombre: 'CTAG – Centro Tecnológico de Automoción de Galicia', tipo: 'laboratorio', pais: 'España', web: 'https://ctag.com/', que: 'Acreditado (ENAC 621/LE1230) para niebla salina, ciclos de temperatura y humedad, vibración y choque de componentes.', porQue: 'Para envejecer bisagras, cierres y juntas antes de confiar en ellos.', estado: 'por contactar', verificado: true },
    { nombre: 'Aptera Motors', tipo: 'fabricante', pais: 'Estados Unidos', que: 'Vehículo solar de tres ruedas con puertas de ala de gaviota del que Eugenio toma la forma de la puerta (esquinas redondeadas, bisagra en el canto del techo).', porQue: 'Referencia de diseño, no proveedor; sus fotos y vídeos de la puerta abierta son el patrón que sigue el modelo. Web no comprobada en esta sesión.', estado: 'por contactar', verificado: false },
  ],
  mensajes: [
    {
      para: 'Stabilus', canal: 'formulario web', idioma: 'en',
      asunto: 'Gas springs for a gullwing door and two lids on a light electric vehicle prototype',
      cuerpo: 'Hello,\n\nWe are building the first prototype of a light four-wheel electric vehicle (EU category L7e) in Spain. We need gas springs for:\n- two gullwing driver doors (hinge on the roof edge, opening 105°; estimated door mass [7] kg, centre of gravity about [0,45] m from the hinge axis; we plan two springs per door, about 300 N each, lever arm about [0,10] m);\n- a front lid (rear hinge, opens 55°, mass about [3] kg);\n- a rear canopy tail (front hinge, opens 50°, mass about [5] kg).\n\nCould you recommend part numbers (force, stroke, extended length, end fittings), tell us the minimum order quantity and price for prototype quantities (two to four units of each), and whether you have a distributor in Spain?\n\nThank you,\n[nombre]\n[proyecto / web]',
      quePedimos: ['Referencias recomendadas (fuerza, carrera, longitud, terminales) para puerta, capó y cola', 'Cantidad mínima y precio en cantidades de prototipo', 'Distribuidor en España'],
    },
    {
      para: 'Southco', canal: 'formulario web', idioma: 'en',
      asunto: 'Latches and hinges for a composite gullwing door (prototype, Spain)',
      cuerpo: 'Hello,\n\nWe are developing a two-seat electric light vehicle (EU L7e) in Spain with a composite gullwing driver door (hinge axis along the roof edge) and two composite lids. For the first prototype we are looking for:\n- a manual lever latch with striker for the door, with inside release and an outside flush handle, and an emergency cable release; two-position retention (secondary latch) if available;\n- compression latches or push-to-close latches for the front lid and rear canopy tail, with a secondary safety catch for the front lid;\n- heavy-duty hinges or pivot bushings suitable for a door of about [7] kg.\n\nCould you suggest part numbers, prices for prototype quantities and the distributor for Spain?\n\nThank you,\n[nombre]\n[proyecto / web]',
      quePedimos: ['Referencias de cierre de palanca con manilla exterior a ras y apertura de emergencia', 'Cierres para capó y cola con seguro secundario', 'Bisagras o casquillos para una puerta de ~7 kg', 'Precio en cantidades de prototipo y distribuidor en España'],
    },
    {
      para: 'EMKA', canal: 'correo', idioma: 'en',
      asunto: 'Quotation: latches, hinges and sealing profiles for a vehicle prototype',
      cuerpo: 'Hello,\n\nWe are building a light electric vehicle prototype in Spain and need, in prototype quantities (2 to 4 of each): a lever or rotary latch with striker for a composite gullwing door, compression latches for two lids, pivot hinges for a door of about [7] kg, and EPDM bulb sealing profile with clip-on carrier for a laminated flange of about [8–10] mm. Could you send part numbers, prices and lead time to Spain?\n\nThank you,\n[nombre]\n[proyecto / web]',
      quePedimos: ['Referencias de cierres, bisagras y perfil de junta', 'Precio y plazo para 2–4 unidades', 'Envío a España'],
    },
    {
      para: 'Cikautxo', canal: 'correo', idioma: 'es',
      asunto: 'Muestras de perfil de junta de puerta para un prototipo de vehículo eléctrico ligero',
      cuerpo: 'Buenos días,\n\nEstamos construyendo en [ciudad] el primer prototipo de un vehículo eléctrico ligero de cuatro ruedas (categoría L7e). Las dos puertas (de ala de gaviota, de composite) y las dos tapas de maletero llevan una junta de bulbo de EPDM con pinza sobre una pestaña laminada de unos [8–10] mm de espesor; el perímetro total es de unos [12] metros.\n\n¿Podrían indicarnos si disponen de un perfil de catálogo adecuado (o de un distribuidor que lo venda por metros), enviarnos muestras de 30 cm de dos o tres perfiles y darnos precio y plazo para unos 20 metros?\n\nMuchas gracias,\n[nombre]\n[proyecto / web]\n[teléfono]',
      quePedimos: ['Si tienen perfil de bulbo con pinza para pestaña de 8–10 mm', 'Muestras de 30 cm de dos o tres perfiles', 'Precio y plazo para unos 20 metros', 'Distribuidor si no venden cantidades pequeñas'],
    },
    {
      para: 'Mennekes', canal: 'correo', idioma: 'en',
      asunto: 'Type 2 vehicle inlet for a 3.3 kW single-phase on-board charger (prototype)',
      cuerpo: 'Hello,\n\nWe are building a light electric vehicle prototype in Spain with a 3.3 kW single-phase on-board charger. We need a Type 2 vehicle inlet (socket on the vehicle side) with electromechanical locking for Mode 3, IP-rated cover, and if possible the matching charging controller (CP/PP) for the vehicle side. Could you recommend the part numbers, give prices for prototype quantities (two units) and tell us the distributor in Spain?\n\nThank you,\n[nombre]\n[proyecto / web]',
      quePedimos: ['Referencia de toma tipo 2 con bloqueo y tapa', 'Controlador de carga lado vehículo (CP/PP) si lo tienen', 'Precio de dos unidades y distribuidor en España'],
    },
    {
      para: 'Car Builder Solutions', canal: 'correo', idioma: 'en',
      asunto: 'Door hardware for a test door: gas struts, hinges, latches and seals',
      cuerpo: 'Hello,\n\nWe are building a test door for a light electric vehicle prototype in Spain before laminating the final one. For two doors and two lids we would like to order from your catalogue: gas struts of about 300 N (please suggest stroke/length for a door hinged at the top, opening 105°), bulb door seal for a flange of about 8–10 mm (about 20 m), flush exterior handles, a lever latch with striker, and a pair of heavy pivot hinges. Could you send the product codes you recommend, prices, and shipping cost and lead time to Spain?\n\nThank you,\n[nombre]\n[proyecto / web]',
      quePedimos: ['Códigos recomendados de muelles de gas (~300 N), junta de bulbo, manillas a ras, cierre y bisagras', 'Precios', 'Envío y plazo a España'],
    },
    {
      para: 'Castro Composites', canal: 'correo', idioma: 'es',
      asunto: 'Materiales para laminar dos puertas y dos tapas con pestaña (prototipo)',
      cuerpo: 'Buenos días,\n\nPara el prototipo de un vehículo eléctrico ligero vamos a laminar dos puertas de ala de gaviota (≈ [0,9] m² cada una) y dos tapas de maletero (≈ [0,6] y [0,8] m²) en fibra de vidrio con alma de espuma de 5 mm, con una pestaña perimetral de 8–10 mm para la junta de puerta. ¿Podrían recomendarnos y presupuestar el tejido, la resina, la espuma, los consumibles de vacío y el material del molde, con cantidades mínimas y plazo?\n\nGracias,\n[nombre]\n[proyecto / web]',
      quePedimos: ['Lista de materiales para dos puertas y dos tapas con pestaña', 'Precio, cantidad mínima y plazo', 'Material del molde'],
    },
    {
      para: 'Applus IDIADA', canal: 'correo', idioma: 'es',
      asunto: 'Consulta: ensayo de cerraduras y bisagras (UN R11) en puertas de gaviota de un prototipo L7e',
      cuerpo: 'Buenos días,\n\nEstamos construyendo el primer prototipo de un vehículo eléctrico ligero de cuatro ruedas (categoría L7e-CP) con puertas de ala de gaviota de composite, bisagras en el canto del techo y cierre de palanca. Aunque el Reglamento UN R11 no es obligatorio en categoría L, queremos saber si pueden ensayar la cerradura y las bisagras con sus criterios (cargas longitudinal y transversal, no apertura por inercia), con qué muestras (puerta montada en un bastidor con el montante y el arco), y el plazo y presupuesto orientativos.\n\nMuchas gracias,\n[nombre]\n[proyecto / web]\n[teléfono]',
      quePedimos: ['Si pueden ensayar cerradura y bisagras con los criterios de UN R11 en un vehículo L', 'Qué muestras necesitan', 'Plazo y presupuesto orientativo'],
    },
  ],
  referencias: [
    { titulo: 'Reglamento (UE) 168/2013, anexo II: requisitos para L7e-C', url: 'https://legislation.gov.uk/eur/2013/168/annexes/adopted?view=plain', nota: 'C5 (dispositivos contra uso no autorizado), C7 (salientes exteriores) y C10 (masas y dimensiones) aplican a L7e-C; B16 (protección de ocupantes incluidas las puertas) figura como «IF».' },
    { titulo: 'Reglamento Delegado (UE) 3/2014: seguridad funcional (puertas en el anexo XVII)', url: 'https://eur-lex.europa.eu/eli/reg_del/2014/3/oj/eng', nota: 'Artículo 21 / anexo XVII: protección de ocupantes, incluidos los accesorios interiores y las puertas.' },
    { titulo: 'Reglamento Delegado (UE) 44/2014: construcción de los vehículos de categoría L', url: 'https://eur-lex.europa.eu/eli/reg_del/2014/44/oj', nota: 'Antirrobo, salientes exteriores, masas y dimensiones. Dirección oficial EUR-Lex (identificador ELI); el texto no se abrió en esta sesión.' },
    { titulo: 'Applus IDIADA: anexo técnico de acreditación ENAC 35/LE2594', url: 'https://www.enac.es/documents/7020/31cbe02f-803a-439f-98c2-1e92454877dc', nota: 'Servicio técnico designado; en su alcance aparecen UN R11 (cerraduras y bisagras), R43 (cristales), R10 (EMC) y el Reglamento 168/2013 con sus actos delegados.' },
    { titulo: 'CTAG: anexo técnico de acreditación ENAC 621/LE1230 (2025)', url: 'https://ctag.com/wp-content/uploads/2025/10/621_LE1230.pdf', nota: 'Niebla salina (ISO 9227), ciclos térmicos y de humedad, vibración y choque: para envejecer herrajes y juntas.' },
    { titulo: 'Car Builder Solutions: catálogo de cinturones (y herrajes) para constructores', url: 'https://www.carbuilder.com/collections/seatbelts-harnesses-inertia-static?page=1', nota: 'Tienda del Reino Unido que vende en unidades a quien construye su propio coche.' },
    { titulo: 'Euro NCAP 2016: cuadriciclos pesados', url: 'https://www.euroncap.com/nl/pers/persberichten/quadricycle-safety-at-a-standstill', nota: 'La integridad estructural fue el punto más débil: razón para tratar la puerta y el estribo como protección lateral y no solo como acceso.' },
  ],
  revisado: { fecha: '2026-11-06', por: 'bot de interior, accesos y homologación (Claude)' },
};
