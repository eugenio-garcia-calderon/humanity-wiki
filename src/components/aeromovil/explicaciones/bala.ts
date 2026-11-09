import type { Explicaciones } from './tipos';

// ============================================================================
// Explicaciones de los deslizadores del Cuadriciclo Bala (2026-11-09)
// ============================================================================
// Eugenio: «permíteme editarlo». Cada deslizador del Bala abre su cuadro como
// los del Aeromóvil 1 y del Gota. Los valores «de serie» son los del Bala del
// garaje (geometria.ts, BALA_DEFECTO); los del Gota, de PARAMETROS_GOTA. Las
// tallas sentado son de ANSUR II (2012). Lo demás es razonamiento, no medida:
// el Bala es un diseño propio y nada de él se ha medido.

const C = {
  cabezaPil: 'Cabeza del piloto a la cúpula',
  cabezaPas: 'Cabeza del pasajero a la cúpula',
  ruedaDel: 'Rueda delantera dentro de la carrocería',
  ruedaTras: 'Rueda trasera dentro de la carrocería',
  neumatico: 'Neumático lateral dentro de su carenado',
  carenado: 'Carenado lateral a la carrocería',
  manillar: 'Manillar dentro de la carrocería',
};

export const EXPLICACIONES: Explicaciones = {
  // ── Medidas ───────────────────────────────────────────────────────────────
  bBatalla: {
    nombre: 'Batalla: eje delantero a trasero',
    queEs: 'La distancia, en metros, del eje de la rueda delantera al de la trasera. Las dos ruedas laterales van siempre a mitad de batalla, como en el Gota.',
    porQueImporta: 'Es el esqueleto del vehículo: todo lo que hay entre las dos ruedas del eje (la cúpula, los dos ocupantes, la cola) se estira o se encoge con ella. Más batalla da un Bala más largo y más estable en recta, con la cúpula más alargada; menos batalla, uno más corto y ágil. El largo total es morro + batalla + cola.',
    masAlto: {
      ventajas: ['Más estable en recta y sobre baches: los golpes de una rueda inclinan menos el vehículo.', 'La cúpula se alarga y su subida y su bajada son más suaves para el aire.', 'Las laterales, a mitad de batalla, quedan más lejos de los pies del piloto.'],
      desventajas: ['Más largo y más pesado (más piel y más chasis).', 'Gira peor: con el mismo giro de la rueda delantera, el radio de giro crece con la batalla.', 'Más difícil de aparcar.'],
    },
    masBajo: {
      ventajas: ['Más corto, ligero y manejable.', 'Menos piel que fabricar.'],
      desventajas: ['La cúpula se acorta y cae antes: con la cúpula acabando 25 cm por delante del eje trasero como mínimo, el deslizador «Cúpula: dónde acaba de bajar» pierde recorrido.', 'Más nervioso en recta.'],
    },
    referencias: ['Bala del garaje: 2,45 m', 'Aeromóvil Gota: 2,60 m'],
    relacionados: ['bCupFin', 'bMorro', 'bCola', 'bPasX'],
    comprobaciones: [C.ruedaTras],
  },
  bVia: {
    nombre: 'Vía de las ruedas laterales',
    queEs: 'La distancia, en metros, entre los centros de las dos ruedas laterales, que van fuera de la carrocería en sus carenados, sobre dos brazos.',
    porQueImporta: 'Es lo que da estabilidad de lado: cuanto más separadas, más difícil es volcar en una curva, porque el Bala no se inclina (sus carenados son fijos). A cambio, el vehículo se hace más ancho y los brazos más largos y más expuestos al aire. Nunca baja de lo necesario para dejar 3 cm entre cada carenado y la carrocería: si se ensancha la carrocería, la vía sube sola y el deslizador lo avisa.',
    masAlto: {
      ventajas: ['Más estable en curva: más difícil de volcar.', 'Más hueco entre los carenados y la carrocería.'],
      desventajas: ['Más ancho total: ocupa más carril y más plaza de aparcamiento.', 'Brazos más largos: más peso, más flexión y más área frontal (más aire que empujar).'],
    },
    masBajo: {
      ventajas: ['Más estrecho y algo menos de área frontal.', 'Brazos más cortos y rígidos.'],
      desventajas: ['Vuelca antes en una curva rápida.', 'Los carenados se acercan a la carrocería (el mínimo son 3 cm).'],
    },
    referencias: ['Bala del garaje: 1,10 m (1,26 m de ancho total)', 'Aeromóvil Gota: 1,05 m'],
    relacionados: ['bAncho', 'bRuedaLat'],
    comprobaciones: [C.carenado],
  },
  bAncho: {
    nombre: 'Ancho de la carrocería',
    queEs: 'El ancho de la carrocería en su punto más ancho (los codos y las rodillas), en metros, sin los carenados de las ruedas laterales.',
    porQueImporta: 'Es casi todo el área frontal de la carrocería: con el mismo alto, un Bala más estrecho tiene menos aire que apartar. Pero dentro van dos personas a horcajadas, y los hombros, los codos y el manillar tienen que caber. El interior (manillar, estriberas, asidero) se estrecha con la carrocería cuando esta es más estrecha que la de serie; el manillar, como mucho hasta el 70 % de su ancho: más estrecho no se puede llevar, y entonces asoma y la comprobación lo dice.',
    masAlto: {
      ventajas: ['Más sitio para hombros, codos y rodillas.', 'Más holgura para el manillar.'],
      desventajas: ['Más área frontal: más consumo a velocidad.', 'Obliga a separar las ruedas laterales (la vía sube si hace falta).'],
    },
    masBajo: {
      ventajas: ['Menos área frontal: menos aire que empujar.', 'Más «bala»: la idea de Eugenio era una moto ultra carenada estrecha.'],
      desventajas: ['El manillar y los codos se quedan sin sitio: mira «Manillar dentro de la carrocería».', 'Ir dentro es más estrecho para ponerse y quitarse el casco.'],
    },
    referencias: ['Bala del garaje: 0,85 m'],
    relacionados: ['bVia', 'bAlto'],
    comprobaciones: [C.manillar, C.carenado],
  },
  bSuelo: {
    nombre: 'Altura libre al suelo',
    queEs: 'Lo que hay, en centímetros, entre el suelo y lo más bajo de la panza de la carrocería.',
    porQueImporta: 'Más altura pasa mejor por badenes, rampas de garaje y caminos, pero sube con ella todo lo que va en el suelo del vehículo (el chasis, las estriberas y las plataformas de los pies) y estrecha la parte baja de la sección, porque el techo de la cúpula no se mueve. Las ruedas se quedan en el suelo.',
    masAlto: {
      ventajas: ['Pasa mejor badenes y rampas.', 'Menos riesgo de rozar la panza al cargar dos personas.'],
      desventajas: ['Asoma más rueda por debajo (más aire en las ruedas).', 'Pasa más aire por debajo del vehículo.'],
    },
    masBajo: {
      ventajas: ['Menos rueda a la vista y menos aire por debajo.', 'El centro de gravedad baja.'],
      desventajas: ['Roza antes en badenes y rampas.'],
    },
    referencias: ['Bala del garaje: 12,4 cm', 'Aeromóvil Gota: 21 cm'],
    relacionados: ['bAlto', 'bPilY', 'bPasY'],
    comprobaciones: [C.ruedaDel, C.ruedaTras],
  },
  // ── Morro y cola ───────────────────────────────────────────────────────────
  bMorro: {
    nombre: 'Morro: del eje delantero a la punta',
    queEs: 'Lo que sobresale el morro por delante del eje de la rueda delantera, en metros, hasta la punta del cono azul marino.',
    porQueImporta: 'Un morro más largo hace la punta más afilada y aparta el aire más despacio, como el morro de un cohete. Uno más corto acerca la punta a la rueda delantera, que va dentro de la carrocería: si se acorta demasiado, la rueda asoma por delante.',
    masAlto: {
      ventajas: ['La punta se afila: el aire se aparta más despacio.', 'Más sitio para la rueda delantera dentro del morro.'],
      desventajas: ['Más largo total y más piel.', 'Un morro largo y en punta es más frágil en un golpe y se ve peor al aparcar.'],
    },
    masBajo: {
      ventajas: ['Más corto total.'],
      desventajas: ['La rueda delantera se acerca a la piel del morro: mira «Rueda delantera dentro de la carrocería».', 'El aire se aparta de golpe.'],
    },
    referencias: ['Bala del garaje: 0,60 m'],
    relacionados: ['bPuntaMorro', 'bRuedaDT'],
    comprobaciones: [C.ruedaDel],
  },
  bPuntaMorro: {
    nombre: 'Morro: afilado de la punta',
    queEs: 'La forma del cono del morro (el exponente de la ojiva): con poco, la punta es llena y redondeada; con mucho, es una aguja.',
    porQueImporta: 'Decide cómo se reparte el estrechamiento del morro: una ojiva llena se mantiene gruesa casi hasta la punta y se cierra al final; una en aguja se estrecha desde el principio. Con el mismo largo de morro, la llena da más sitio dentro y la afilada aparta el aire más poco a poco.',
    masAlto: {
      ventajas: ['Punta más fina: el aire se aparta más poco a poco.'],
      desventajas: ['Menos sitio dentro del morro para la rueda delantera y los faros.', 'Una punta muy fina es más frágil.'],
    },
    masBajo: {
      ventajas: ['Más volumen en el morro.'],
      desventajas: ['Punta más roma.'],
    },
    referencias: ['Bala del garaje: 0,75'],
    relacionados: ['bMorro'],
    comprobaciones: [C.ruedaDel],
  },
  bCola: {
    nombre: 'Cola: del eje trasero a la punta',
    queEs: 'Lo que sobresale la cola por detrás del eje de la rueda trasera, en metros, hasta la punta del cono de cola.',
    porQueImporta: 'La cola es donde se decide la estela: una cola larga deja que el aire se vuelva a juntar poco a poco detrás del vehículo, y eso es lo que más baja la resistencia en una forma de gota. Una cola corta lo despega antes y deja más estela. El túnel de viento lo puede probar («Probar»).',
    masAlto: {
      ventajas: ['El aire se cierra más despacio: menos estela.', 'Más sitio dentro de la cola (y para la rueda trasera).'],
      desventajas: ['Más largo total y más piel (más rozamiento).', 'Más difícil de aparcar y más expuesto por detrás.'],
    },
    masBajo: {
      ventajas: ['Más corto total.'],
      desventajas: ['Más estela y más consumo a velocidad.', 'La rueda trasera se acerca a la piel de la cola: mira «Rueda trasera dentro de la carrocería».'],
    },
    referencias: ['Bala del garaje: 0,65 m'],
    relacionados: ['bPuntaCola', 'bCupFin', 'bAleta'],
    comprobaciones: [C.ruedaTras],
  },
  bPuntaCola: {
    nombre: 'Cola: altura de la punta',
    queEs: 'La altura sobre el suelo, en metros, a la que se cierra la punta del cono de cola.',
    porQueImporta: 'Una punta de cola baja alinea la cola con el aire que viene de debajo del vehículo; una alta, con el que baja por la cúpula. Cambia también lo que se ve de la cola y dónde queda el piloto trasero.',
    masAlto: {
      ventajas: ['La cola baja menos desde la cúpula: el aire de arriba tiene una bajada más suave.'],
      desventajas: ['El aire de debajo tiene que subir más para juntarse con el de arriba.'],
    },
    masBajo: {
      ventajas: ['La cola se alinea con el aire de los bajos.'],
      desventajas: ['La bajada desde la cúpula es más pronunciada.'],
    },
    referencias: ['Bala del garaje: 0,47 m'],
    relacionados: ['bCola', 'bAlto'],
  },
  bAleta: {
    nombre: 'Aleta: altura de la punta',
    queEs: 'La altura sobre el suelo, en metros, de la punta de la aleta de cola (su borde de ataque).',
    porQueImporta: 'La aleta ayuda a que el vehículo vaya recto con viento de costado, como la deriva de un avión, y es parte de la estética de cohete. Más alta estabiliza más pero añade algo de rozamiento y de superficie expuesta al viento de lado.',
    masAlto: {
      ventajas: ['Más estabilidad en recta con viento lateral (conocimiento general, no calculado aquí).'],
      desventajas: ['Más superficie lateral: el viento de costado empuja más la cola.', 'Algo más de rozamiento.'],
    },
    masBajo: {
      ventajas: ['Menos rozamiento y menos superficie lateral.'],
      desventajas: ['Menos efecto estabilizador.'],
    },
    referencias: ['Bala del garaje: 1,00 m'],
    relacionados: ['bCola'],
  },
  // ── Cúpula ────────────────────────────────────────────────────────────────
  bCupIni: {
    nombre: 'Cúpula: dónde empieza a subir',
    queEs: 'La distancia, en metros, detrás del eje delantero, desde la que la línea de arriba sube para formar la cúpula sobre los dos ocupantes.',
    porQueImporta: 'Si la cúpula empieza antes, la subida es larga y suave (un parabrisas muy tumbado); si empieza después, la subida es corta y empinada. Una subida suave es mejor para el aire, pero el cristal es más largo y deja entrar más sol.',
    masAlto: {
      ventajas: ['Más capó delante del piloto (más sitio para el salpicadero).'],
      desventajas: ['La subida es más empinada: más succión en lo alto del parabrisas.'],
    },
    masBajo: {
      ventajas: ['Subida más suave para el aire.'],
      desventajas: ['Más cristal sobre el morro: más calor dentro con sol.'],
    },
    referencias: ['Bala del garaje: 0,15 m'],
    relacionados: ['bCupFin', 'bAlto'],
    comprobaciones: [C.manillar],
  },
  bCupFin: {
    nombre: 'Cúpula: dónde acaba de bajar',
    queEs: 'La distancia, en metros, detrás del eje delantero, hasta la que baja la cúpula antes de seguir como línea de la cola. Acaba al menos 25 cm por delante del eje trasero.',
    porQueImporta: 'Una cúpula que acaba más atrás baja más despacio hacia la cola: el aire de arriba la sigue mejor y se despega más tarde. Una que acaba antes cae más deprisa detrás del pasajero.',
    masAlto: {
      ventajas: ['Bajada más suave hacia la cola: menos estela (conocimiento general; «Probar» lo calcula).', 'Más altura sobre la cabeza del pasajero.'],
      desventajas: ['Más cristal detrás.'],
    },
    masBajo: {
      ventajas: ['Cúpula más corta y menos cristal.'],
      desventajas: ['La cola cae más deprisa: el aire se despega antes.', 'Menos altura sobre el pasajero.'],
    },
    referencias: ['Bala del garaje: 2,00 m'],
    relacionados: ['bCupIni', 'bBatalla', 'bCola'],
    comprobaciones: [C.cabezaPas],
  },
  bAlto: {
    nombre: 'Alto total (techo de la cúpula)',
    queEs: 'La altura sobre el suelo, en metros, de lo más alto de la cúpula. Todo lo que está por encima de la parte más ancha de la carrocería se estira o se encoge con ella.',
    porQueImporta: 'Es la holgura sobre las cabezas. Con el Bala de serie, sobre la cabeza del piloto quedan unos 7 cm si es de talla media y 1 cm si es alto, sentado erguido y sin casco; el pasajero va algo más justo. Las cifras del diseño abierto están en «Comprobaciones». Subirla da sitio para el casco; bajarla quita área frontal y aire.',
    masAlto: {
      ventajas: ['Más sitio sobre las cabezas: con casco hace falta más que sin él.'],
      desventajas: ['Más área frontal: más consumo a velocidad.', 'Más cristal y más superficie lateral al viento.'],
    },
    masBajo: {
      ventajas: ['Menos área frontal y menos aire que empujar.'],
      desventajas: ['Las cabezas tocan la cúpula: mira las comprobaciones de cabeza.'],
    },
    referencias: ['Bala del garaje: 1,452 m', 'Talla sentado, hombres: 91,8 cm (media) y 97,7 cm (percentil 95), ANSUR II 2012'],
    relacionados: ['bPilY', 'bPasY', 'bSuelo'],
    comprobaciones: [C.cabezaPil, C.cabezaPas],
  },
  // ── Ocupantes ─────────────────────────────────────────────────────────────
  bPilX: {
    nombre: 'Piloto: cadera al eje delantero',
    queEs: 'La distancia, en metros, de la cadera del piloto al eje de la rueda delantera. Con el piloto se mueven la parte delantera del sillín, la trasera del depósito y las plataformas de los pies; el manillar se queda sobre la rueda.',
    porQueImporta: 'Más atrás, el piloto va más estirado hacia el manillar y su cabeza queda bajo la parte más alta de la cúpula; más adelante, va más recogido y su cabeza se acerca a la bajada del parabrisas.',
    masAlto: {
      ventajas: ['La cabeza queda bajo lo más alto de la cúpula.'],
      desventajas: ['Brazos más estirados hasta el manillar.', 'Empuja al pasajero hacia atrás (va al menos 40 cm detrás).'],
    },
    masBajo: {
      ventajas: ['Postura más recogida, brazos menos estirados.'],
      desventajas: ['La cabeza se acerca a la bajada de la cúpula.'],
    },
    referencias: ['Bala del garaje: 1,06 m'],
    relacionados: ['bPasX', 'bPilY'],
    comprobaciones: [C.cabezaPil],
  },
  bPilY: {
    nombre: 'Piloto: altura del sillín',
    queEs: 'La altura sobre el suelo, en metros, del sillín bajo el piloto.',
    porQueImporta: 'Más alto se ve mejor y se apoyan mejor los pies, pero la cabeza sube hacia la cúpula. Más bajo deja más sitio sobre la cabeza.',
    masAlto: {
      ventajas: ['Mejor visibilidad por encima del morro.'],
      desventajas: ['Menos sitio sobre la cabeza.'],
    },
    masBajo: {
      ventajas: ['Más sitio sobre la cabeza.'],
      desventajas: ['Las rodillas suben respecto a la cadera.'],
    },
    referencias: ['Bala del garaje: 0,44 m'],
    relacionados: ['bAlto', 'bPilX'],
    comprobaciones: [C.cabezaPil],
  },
  bPasX: {
    nombre: 'Pasajero: cadera al eje delantero',
    queEs: 'La distancia, en metros, de la cadera del pasajero al eje delantero. Va entre 40 y 62 cm detrás del piloto. Con él se mueven la parte trasera del sillín, el respaldo, el asidero y las estriberas.',
    porQueImporta: 'Más cerca del piloto, el vehículo puede ser más corto, pero las rodillas del pasajero quedan pegadas a la espalda del piloto. Más lejos, va más holgado, pero su cabeza se acerca a la bajada de la cúpula.',
    masAlto: {
      ventajas: ['Más espacio para las rodillas del pasajero.'],
      desventajas: ['Su cabeza se acerca a la bajada de la cúpula hacia la cola.'],
    },
    masBajo: {
      ventajas: ['Su cabeza queda bajo lo más alto de la cúpula.'],
      desventajas: ['Rodillas contra la espalda del piloto.'],
    },
    referencias: ['Bala del garaje: 1,54 m'],
    relacionados: ['bPilX', 'bPasY', 'bCupFin'],
    comprobaciones: [C.cabezaPas],
  },
  bPasY: {
    nombre: 'Pasajero: altura del sillín',
    queEs: 'La altura sobre el suelo, en metros, de la parte trasera del sillín, donde va el pasajero (un escalón por encima del piloto en el de serie).',
    porQueImporta: 'Un pasajero más alto ve por encima del piloto, como en una moto, pero su cabeza se acerca a la cúpula.',
    masAlto: {
      ventajas: ['El pasajero ve por encima del piloto.'],
      desventajas: ['Menos sitio sobre su cabeza.'],
    },
    masBajo: {
      ventajas: ['Más sitio sobre su cabeza.'],
      desventajas: ['Ve menos hacia delante.'],
    },
    referencias: ['Bala del garaje: 0,47 m'],
    relacionados: ['bAlto', 'bPasX'],
    comprobaciones: [C.cabezaPas],
  },
  // ── Ruedas ────────────────────────────────────────────────────────────────
  bRuedaDT: {
    nombre: 'Ruedas delantera y trasera',
    queEs: 'El tamaño de las dos ruedas del eje central, que van dentro de la carrocería (solo asoma la parte de abajo).',
    porQueImporta: 'Una rueda más grande rueda mejor por baches y adoquines, pero ocupa más sitio dentro del morro y de la cola.',
    masAlto: {
      ventajas: ['Pasa mejor por baches y bordillos.', 'Algo menos de resistencia a la rodadura.'],
      desventajas: ['Se acerca a la piel del morro y de la cola: mira las comprobaciones de las ruedas.'],
    },
    masBajo: {
      ventajas: ['Más sitio dentro del morro y de la cola.'],
      desventajas: ['Nota más los baches.'],
    },
    referencias: ['Bala del garaje y Aeromóvil Gota: 24″'],
    relacionados: ['bMorro', 'bCola'],
    comprobaciones: [C.ruedaDel, C.ruedaTras],
  },
  bRuedaLat: {
    nombre: 'Ruedas laterales',
    queEs: 'El tamaño de las dos ruedas de los lados. Su carenado crece o se encoge con la rueda.',
    porQueImporta: 'Una rueda mayor rueda mejor, pero su carenado también crece: más área frontal y más brazo.',
    masAlto: {
      ventajas: ['Pasa mejor por baches.'],
      desventajas: ['Carenados más grandes: más área frontal y más aire.'],
    },
    masBajo: {
      ventajas: ['Carenados más pequeños: menos área frontal.'],
      desventajas: ['Nota más los baches.'],
    },
    referencias: ['Bala del garaje y Aeromóvil Gota: 20″'],
    relacionados: ['bVia'],
    comprobaciones: [C.neumatico, C.carenado],
  },
};
