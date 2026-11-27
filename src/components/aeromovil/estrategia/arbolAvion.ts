// The third strategy (2026-11-27): «Aeromóvil avión». Eugenio: «el aeromóvil avión … todo gira en torno a ese modelo [el
// Aeromóvil Alado] … cada uno con su homologación, sus costes, sus planes, su estrategia».
//
// Same rules as `arbol.ts`: `comprobado: 'leido'` only when the source was read and says it. NOTHING here was read: the sources
// were found with the search engine and seen by their title only (Eugenio asked not to be asked for web permissions), so every
// node is `por-confirmar`. The page is public: no personal figures. Ids start with `a-` (the root is `avion`).
import type { NodoEstrategia } from './arbol';

const F = {
  rd765: { titulo: 'Real Decreto 765/2022, uso de aeronaves motorizadas ultraligeras (ULM) (BOE)', url: 'https://www.boe.es/eli/es/rd/2022/09/20/765/con' },
  rd141: { titulo: 'Real Decreto 141/2025, requisitos esenciales de aeronavegabilidad de los ULM (BOE)', url: 'https://www.boe.es/eli/es/rd/2025/02/25/141/con' },
  aesaUlm: { titulo: 'AESA: declaraciones de cumplimiento del diseño ULM', url: 'https://www.seguridadaerea.gob.es/es/ambitos/aeronaves/aeronavegabilidad-inicial/aeronaves-no-easa/declaraciones-de-cumplimiento-del-diseno-ulm' },
  aesaAficionados: { titulo: 'AESA: construcción de aeronaves por aficionados', url: 'https://www.seguridadaerea.gob.es/es/ambitos/aeronaves/aeronavegabilidad-inicial/aeronaves-no-easa/construccion-de-aeronaves-por-aficionados' },
  aesaLicencia: { titulo: 'AESA: licencia de piloto de ULM', url: 'https://www.seguridadaerea.gob.es/es/ambitos/licencias-y-medicina-aeronautica/licencias-al-personal-de-vuelo/licencia-de-piloto-de-ulm' },
  easaOptOut: { titulo: 'EASA: «opt-out», artículo 2(8) a 2(11) del Reglamento 2018/1139', url: 'https://www.easa.europa.eu/en/node/101982' },
  aircar: { titulo: 'AvWeb: el AirCar obtiene el certificado de aeronavegabilidad eslovaco', url: 'https://avweb.com/aviation-news/aircar-notches-slovakian-airworthiness-certification/' },
  palv: { titulo: 'PAL-V: «FlyDrive company PAL-V clears essential certification milestone»', url: 'https://www.pal-v.com/en/press/flydrive-company-pal-v-clears-essential-certification-milestone' },
  palvEasa: { titulo: 'AIAA (8-9-2026): PAL-V alcanza un hito clave de certificación con EASA', url: 'https://aiaa.org/2026/09/08/pal-v-reaches-key-easa-certification-milestone-for-flying-car/' },
};

export const RAIZ_AVION = 'avion';

export const ARBOL_AVION: NodoEstrategia[] = [
  {
    id: 'avion', padre: null, tipo: 'meta', titulo: 'Un Aeromóvil que vuela: el «Aeromóvil Alado»', estado: 'ahora',
    resumen: 'Un vehículo ligero con alas, alrededor del diseño «Aeromóvil Alado». La primera victoria no es volar: es saber en qué cajón legal cabe, qué pesa y quién lo puede certificar.',
    detalle: [
      'Es el proyecto más largo de los tres: un avión se certifica con otra autoridad (AESA en España, EASA en Europa) y con otras reglas que un coche.',
      'Los otros dos proyectos le sirven: la carrocería de compuesto, la aerodinámica y el tren eléctrico son los mismos oficios.',
      'Ninguna fuente de este árbol se ha abierto todavía: todo está «por confirmar» leyendo el BOE y las páginas de AESA.',
    ],
  },

  // ------------------------------------------------------------------ what it is, legally
  {
    id: 'a-legal', padre: 'avion', tipo: 'decision', titulo: '¿Qué es para la ley?', estado: 'ahora',
    resumen: 'Cuatro cajones, del más barato al más caro. Cada uno decide quién certifica, qué licencia hace falta y si se puede vender.',
  },
  {
    id: 'a-ulm', padre: 'a-legal', tipo: 'opcion', titulo: 'Ultraligero (ULM), regulación española', estado: 'prometedora', comprobado: 'por-confirmar',
    resumen: 'Aeronave ligera que la Unión Europea deja a cada país. En España la regula el Real Decreto 765/2022 y sus requisitos de aeronavegabilidad el 141/2025: el fabricante declara a AESA que el diseño los cumple.',
    detalle: [
      'El límite de masa máxima al despegue de un biplaza terrestre ronda los 600 kg con la exclusión («opt-out») que permite el Reglamento europeo 2018/1139: por confirmar en el texto del Real Decreto.',
      'La masa máxima incluye a los dos ocupantes, el combustible o la batería y el equipaje: un Aeromóvil de 300 kg en vacío deja ≈ 300 kg para todo lo demás.',
      'Vale en España; volar a otro país necesita el permiso de ese país.',
    ],
    aFavor: ['El cajón más barato para vender en serie corta en España', 'Licencia de piloto de ULM, más corta que la de avión', 'Un fabricante español (ELA Aviación, el autogiro del garaje) trabaja así'],
    enContra: ['Solo España', 'La carretera es otra homologación aparte', 'Masa máxima ajustada para un vehículo que también rueda'],
    descarta: 'Se descarta si el Aeromóvil Alado con dos personas pasa del límite de masa del ULM, o si AESA no acepta un ULM que también circule por carretera.',
    siguiente: 'Leer el RD 765/2022 y el RD 141/2025 y apuntar los tres números que deciden: masa máxima, velocidad de pérdida y plazas.',
    fuentes: [F.rd765, F.rd141, F.aesaUlm, F.easaOptOut],
  },
  {
    id: 'a-aficionado', padre: 'a-legal', tipo: 'opcion', titulo: 'Construcción por aficionados', estado: 'por-explorar', comprobado: 'por-confirmar',
    resumen: 'Quien vuela el avión lo ha construido él mismo (la mayor parte): certificado especial de AESA, sin poder venderlo. Es el camino de un prototipo que vuela.',
    aFavor: ['El camino del primer prototipo volador', 'Sin certificación de fabricante'],
    enContra: ['No se puede vender ni usar para negocio', 'Hay que construir uno mismo la mayor parte'],
    fuentes: [F.aesaAficionados],
  },
  {
    id: 'a-easa', padre: 'a-legal', tipo: 'opcion', titulo: 'Certificación europea (EASA)', estado: 'despues', comprobado: 'por-confirmar',
    resumen: 'Certificado de tipo de EASA y organización de diseño y producción aprobadas: vale en toda Europa y se puede vender, pero cuesta años y millones.',
    detalle: ['Es lo que está haciendo PAL-V con su Liberty, un autogiro que rueda: según los titulares, EASA aprobó su base de certificación y su organización de producción, y en 2026 anunció otro hito.'],
    aFavor: ['Toda Europa', 'Vender en serie'], enContra: ['Años y millones', 'Ingeniería de certificación dedicada'],
    fuentes: [F.palv, F.palvEasa],
  },
  {
    id: 'a-doble', padre: 'a-legal', tipo: 'opcion', titulo: 'Coche volador: dos homologaciones', estado: 'por-explorar', comprobado: 'por-confirmar',
    resumen: 'Si además rueda por carretera, necesita las dos: la de aeronave (uno de los cajones de arriba) y la de vehículo (L7e o turismo, como el Aeromóvil coche).',
    detalle: ['El AirCar de Klein Vision (Eslovaquia) obtuvo en 2022 un certificado de aeronavegabilidad de su autoridad nacional, según los titulares; la parte de carretera va aparte.'],
    aFavor: ['Lo que hace único al Aeromóvil'], enContra: ['Dos autoridades, dos expedientes, y lo que una pide (peso, seguridad en choque) va contra lo que pide la otra'],
    fuentes: [F.aircar],
  },

  // ------------------------------------------------------------------ how it flies
  {
    id: 'a-como', padre: 'avion', tipo: 'decision', titulo: '¿Cómo vuela?', estado: 'ahora',
    resumen: 'Tres maneras de levantarse del suelo. La forma del Aeromóvil Alado apunta a la primera.',
  },
  {
    id: 'a-ala', padre: 'a-como', tipo: 'opcion', titulo: 'Ala fija que se pliega', estado: 'prometedora', comprobado: 'por-confirmar',
    resumen: 'Alas que se despliegan para volar y se recogen para rodar, como el AirCar. La que mejor encaja con una carrocería en gota.',
    aFavor: ['La más eficiente en crucero', 'Planea si el motor falla'], enContra: ['Necesita pista', 'El mecanismo de plegado pesa y hay que certificarlo'],
  },
  {
    id: 'a-rotor', padre: 'a-como', tipo: 'opcion', titulo: 'Rotor de autogiro', estado: 'por-explorar', comprobado: 'por-confirmar',
    resumen: 'Un rotor libre encima y una hélice detrás, como el PAL-V o el ELA del garaje: despega en poco espacio y baja despacio.',
    aFavor: ['Pista corta', 'Hay fabricante en España (ELA Aviación)'], enContra: ['El rotor plegado sobre un vehículo bajo es difícil', 'Menos eficiente que un ala'],
  },
  {
    id: 'a-vtol', padre: 'a-como', tipo: 'opcion', titulo: 'Despegue vertical eléctrico (eVTOL)', estado: 'despues', comprobado: 'por-confirmar',
    resumen: 'Varios rotores eléctricos, sin pista. El más caro de certificar y el que más batería necesita.',
    enContra: ['Las baterías de hoy dan minutos de vuelo con dos personas', 'Certificación aún en construcción en Europa'],
  },

  // ------------------------------------------------------------------ the first small wins
  {
    id: 'a-pasos', padre: 'avion', tipo: 'decision', titulo: 'Los primeros pasos', estado: 'ahora',
    resumen: 'Pasos de días, no de meses, antes de cortar ningún molde.',
  },
  {
    id: 'a-p1', padre: 'a-pasos', tipo: 'paso', titulo: '1 · Leer las tres normas españolas', estado: 'ahora', comprobado: 'por-confirmar',
    resumen: 'El RD 765/2022 (uso de ULM), el RD 141/2025 (aeronavegabilidad de ULM) y la página de AESA de construcción por aficionados: apuntar masa máxima, velocidad de pérdida, plazas y qué se declara.',
    siguiente: 'Pasar los números a la página de homologación del proyecto avión, como «leído».',
    fuentes: [F.rd765, F.rd141, F.aesaAficionados],
  },
  {
    id: 'a-p2', padre: 'a-pasos', tipo: 'paso', titulo: '2 · Pesar el Aeromóvil Alado contra el límite', estado: 'por-explorar',
    resumen: 'Con el editor: masa en vacío, más dos personas, más batería y equipaje, frente a la masa máxima del ULM. Si no cabe, decidir qué quitar antes de dibujar alas.',
  },
  {
    id: 'a-p3', padre: 'a-pasos', tipo: 'paso', titulo: '3 · Hablar con quien ya lo hace', estado: 'por-explorar',
    resumen: 'Un fabricante español de ULM o autogiros y una escuela de pilotos de ULM: qué les costó certificar y qué piden a un diseño nuevo.',
    preguntas: ['¿Quieres que el primer prototipo volador sea de construcción por aficionados (tú lo construyes y lo vuelas, sin venderlo) o ir directo a un ULM que se pueda vender?'],
  },
  {
    id: 'a-p4', padre: 'a-pasos', tipo: 'paso', titulo: '4 · Licencia de piloto de ULM', estado: 'despues', comprobado: 'por-confirmar',
    resumen: 'Para probar lo que se diseña hace falta volar: la licencia de piloto de ULM es la más corta. Requisitos en la página de AESA.',
    fuentes: [F.aesaLicencia],
  },
];
