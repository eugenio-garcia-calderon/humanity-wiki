// Data for two sections of the «Justicia» window (Eugenio, 2026-11-12):
// tougher on repeat offending — a reintegration centre for a first minor
// offence, prison the second time («una oportunidad, pero no dos»); no
// difference between «hurto» and «robo»; whoever steals returns ten times what
// was stolen. And squatting: fast eviction by the courts and the public
// guardians, no private eviction companies, and a housing alternative for the
// evicted person paid by the public side, never by the owner.
// Source ids live in FUENTES_JUSTICIA (justicia.ts).
import type { Paso } from './justicia';

/** Today, in figures. */
export const REINCIDENCIA_HOY = {
  /** % of people released from prison in 2009 who were back in prison within ten years (reincidencia-2022). */
  tasa: 19.98,
  tasaCondicional: 12.62,
  tasaSinCondicional: 24.87,
  cohorte: 19_909,
  /** Adults convicted in 2025 and their crimes (ine-condenados-2025). */
  condenados2025: 306_237,
  delitos2025: 461_224,
  hurtosPct2025: 16.4,
  /** Cost of one inmate per day, State administration, 2024 (space-2025). */
  costeDia: 82.93,
  /** Average time in prison, months, vs European average (space-2025-prensa). */
  estanciaMeses: 20,
  estanciaEuropaMeses: 8.8,
};

/**
 * ESTIMATE of ours for «una oportunidad, pero no dos», counting only thefts:
 * convicted thefts a year (INE share × crimes), the share of repeaters taken
 * from the prison study (a different population: a rough proxy), 12 months in
 * prison the second time (middle of today's 6-18 months) and a 6-month
 * reintegration programme. The centre's cost has no source: we show, as a
 * ceiling, what it would cost per day like a prison.
 */
export function estimacionReincidencia() {
  const r = REINCIDENCIA_HOY;
  const hurtos = r.delitos2025 * (r.hurtosPct2025 / 100);
  const segunda = hurtos * (r.tasa / 100);
  const primera = hurtos - segunda;
  const mesesCarcel = 12;
  const mesesCentro = 6;
  const plazasCarcel = segunda * (mesesCarcel / 12);
  const plazasCentro = primera * (mesesCentro / 12);
  return {
    hurtos, primera, segunda, mesesCarcel, mesesCentro, plazasCarcel, plazasCentro,
    costeCarcel: (plazasCarcel * r.costeDia * 365) / 1e6, // M€ a year
    techoCentro: (plazasCentro * r.costeDia * 365) / 1e6, // M€ a year, ceiling
  };
}

export const OCUPACION_HOY = {
  /** Recorded cases of trespass and usurpation, Ministry of the Interior (ocupacion-2025). */
  casos2025: 14_875,
  casos2024: 16_426,
};

/** «Hurto» and «robo» today, in plain words (Código Penal, arts. 234-242). */
export const HURTO_ROBO: { t: string; d: string; pena: string }[] = [
  { t: 'Hurto leve', d: 'Coger algo ajeno sin fuerza ni violencia, si vale 400 € o menos.', pena: 'Multa de 1 a 3 meses (una cantidad al día que fija el juez según lo que gana la persona).' },
  { t: 'Hurto', d: 'Lo mismo, si vale más de 400 €.', pena: 'Cárcel de 6 a 18 meses.' },
  { t: 'Robo con fuerza', d: 'Romper una cerradura, una ventana o un coche para llevarse algo. Da igual lo que valga.', pena: 'Cárcel de 1 a 3 años.' },
  { t: 'Robo con violencia o intimidación', d: 'Empujar, golpear o amenazar a una persona para quitarle algo.', pena: 'Cárcel de 2 a 5 años.' },
];

/** What exists today to reintegrate (Código Penal and penitentiary rules). */
export const REINSERCION_HOY: { t: string; d: string }[] = [
  { t: 'Suspensión de la pena', d: 'Si es la primera condena y la pena no pasa de 2 años, el juez puede dejarla en suspenso: no se entra en prisión si no se vuelve a delinquir en un plazo y se cumplen condiciones (pagar a la víctima, un curso, un tratamiento).' },
  { t: 'Trabajos en beneficio de la comunidad', d: 'Jornadas de trabajo no pagado en tareas útiles, en lugar de cárcel o de multa. Solo si la persona acepta.' },
  { t: 'Centros de inserción social', d: 'Para presos en régimen abierto: salen a trabajar o a formarse de día y duermen en el centro.' },
  { t: 'Programas en prisión', d: 'Formación, trabajo en talleres y tratamiento de adicciones. La Constitución dice que las penas de prisión se orientan a la reeducación y la reinserción.' },
];

/** The journey of a person who commits a minor property offence. */
export const CAMINO_HOY: Paso[] = [
  { t: 'Primera vez: hurto de 150 €', d: 'Juicio por delito leve. Una multa, y devolver lo robado o su valor.' },
  { t: 'Segunda y tercera vez', d: 'Más multas. Hasta 2026, un hurto de menos de 400 € se castigaba con multa, por muchas veces que se repitiera.', vuelta: true },
  { t: 'Desde abril de 2026', d: 'Con tres condenas previas por delitos parecidos (una al menos leve), el hurto de menos de 400 € se castiga como un hurto normal: de 6 a 18 meses de cárcel.', fuente: 'lo-1-2026' },
  { t: 'Si la pena es corta', d: 'Puede quedar en suspenso, aunque la reforma de 2026 hace que los delitos leves anteriores cuenten en contra.', fuente: 'lo-1-2026' },
];

export const CAMINO_PROPUESTA: Paso[] = [
  { t: 'Primera vez: un robo sin violencia, sea del valor que sea', d: 'Juicio rápido. Devuelve diez veces lo robado y entra en un centro de reinserción: formación, trabajo, reparación a la víctima y seguimiento.', tiempo: 'Propuesta: una oportunidad' },
  { t: 'Si cumple', d: 'Termina el programa, ha pagado lo que debe y su antecedente queda en suspenso.' },
  { t: 'Segunda vez', d: 'Cárcel directamente, sin suspensión. Y vuelve a devolver diez veces lo robado.', tiempo: 'Propuesta: no hay segunda oportunidad' },
  { t: 'Si hubo violencia o amenazas', d: 'No hay centro de reinserción: juicio y prisión desde la primera vez. El delito se sigue llamando robo; la violencia lo agrava.', vuelta: false },
];

/** The reintegration centre, as proposed. */
export const CENTRO_REINSERCION: { t: string; d: string }[] = [
  { t: 'Formación', d: 'Terminar estudios básicos o aprender un oficio. Si hay una adicción, tratarla.' },
  { t: 'Trabajo', d: 'Trabajo de verdad, con sueldo. Una parte del sueldo paga lo que se debe a la víctima.' },
  { t: 'Reparación', d: 'Devolver lo robado multiplicado por diez y, si la víctima quiere, un encuentro con ella.' },
  { t: 'Seguimiento', d: 'Una persona de referencia durante el programa y un tiempo después. Si deja el programa, va a la cárcel.' },
];

/** How the tenfold repayment is collected, as proposed. */
export const DIEZ_VECES: { t: string; d: string }[] = [
  { t: 'Primero, la víctima', d: 'De lo que se cobre, primero se le devuelve a la víctima lo robado y sus daños. El resto va a un fondo para víctimas de delitos que no cobran porque nadie paga. Este reparto es una propuesta para debatir.' },
  { t: 'Embargo', d: 'Si tiene bienes o ahorros, se embargan. Del sueldo se descuenta una parte, como en cualquier deuda, respetando lo mínimo para vivir que hoy protege la ley.' },
  { t: 'Trabajo', d: 'Si no tiene con qué pagar, paga con trabajo en el centro de reinserción o en la cárcel, con una parte del sueldo retenida.' },
  { t: 'La deuda no se borra', d: 'Lo que no se pague queda como deuda hasta pagarse. No se mete a nadie en prisión solo por no poder pagar.' },
];

/** Squatting today. */
export const OCUPACION_TIPOS: { t: string; d: string; pena: string }[] = [
  { t: 'Allanamiento de morada', d: 'Entrar o quedarse sin permiso en la casa donde vive alguien. Si la policía los pilla entrando o recién entrados, puede sacarlos en el acto.', pena: 'Cárcel de 6 meses a 2 años.' },
  { t: 'Usurpación', d: 'Ocupar una vivienda o local en el que nadie vive: un piso vacío, de un banco o de un particular.', pena: 'Multa de 3 a 6 meses.' },
];

export const OCUPACION_LEYES: { t: string; d: string; fuente: string }[] = [
  { t: 'Desahucio exprés (2018)', d: 'Una persona, una entidad sin ánimo de lucro o una administración con vivienda social puede pedir al juzgado civil que recupere su casa. Los ocupantes tienen 5 días para enseñar un título (un contrato); si no lo tienen, el juez ordena el desalojo y avisa a los servicios sociales. No sirve para empresas ni bancos.', fuente: 'ley-5-2018' },
  { t: 'Juicio rápido (2025)', d: 'Desde abril de 2025, el allanamiento y la usurpación pueden ir por juicio rápido, el del juzgado de guardia.', fuente: 'sepin-ocupacion' },
];

/** The proposal for squatting. Times are a proposal to discuss. */
export const OCUPACION_PROPUESTA: { t: string; d: string; plazo?: string }[] = [
  { t: 'Casa habitada', d: 'Si alguien ocupa la casa donde vive otra persona, los guardianes públicos la desalojan en el acto, con el juez de guardia de la comisaría.', plazo: 'Propuesta: el mismo día' },
  { t: 'Vivienda vacía', d: 'El propietario denuncia una vez. El juez de guardia comprueba quién es el dueño y si los ocupantes tienen algún contrato. Si no lo tienen, ordena el desalojo y lo hacen los guardianes públicos.', plazo: 'Propuesta: en 72 horas' },
  { t: 'Sin empresas privadas de desalojo', d: 'Si lo público desaloja rápido, nadie necesita contratar a una empresa. Echar a alguien a la fuerza sin un juez seguiría siendo delito, y cobrar por hacerlo quedaría prohibido.' },
  { t: 'Siempre una alternativa', d: 'A la persona desalojada, los servicios sociales de su municipio le ofrecen un sitio donde vivir del parque público de vivienda. Nunca a costa del propietario: su casa se le devuelve, y su desalojo no espera a que haya alternativa.' },
];

export const RETOS_REINCIDENCIA: { t: string; d: string; fuente?: string }[] = [
  { t: 'Proporcionalidad', d: 'La Constitución pide que la pena se ajuste a lo que se ha hecho. Llevarse 20 € de una caja y 20.000 € de una cuenta no es lo mismo, y tampoco empujar a alguien para quitarle el bolso. «Un robo es un robo» puede valer para el nombre del delito, pero la pena tendría que seguir teniendo grados: por lo robado y, sobre todo, por la violencia.', fuente: 'constitucion' },
  { t: 'Diez veces, si no hay con qué', d: 'Quien roba por necesidad muchas veces no tiene bienes. Diez veces 200 € son 2.000 € que quizá no pague nunca. Sin trabajo dentro del programa, el diez por uno se queda en papel.' },
  { t: 'La cárcel cuesta', d: 'Un preso cuesta a la Administración del Estado unos 83 € al día, unos 30.000 € al año, y en España ya se pasa en prisión más del doble de tiempo que la media europea.', fuente: 'space-2025' },
  { t: 'Más cárcel no siempre es menos delito', d: 'Las investigaciones dicen que disuade más la certeza de que te pillen que el tamaño del castigo, y que las penas largas pueden aumentar la reincidencia. En España, quien sale en libertad condicional vuelve a prisión la mitad de veces que quien cumple entera, aunque no son grupos comparables del todo.', fuente: 'nij-disuasion' },
  { t: 'Hoy ya existe algo parecido', d: 'La suspensión de la pena solo es para quien delinque por primera vez, y desde 2026 los hurtos repetidos ya llevan a prisión. La propuesta va más allá: cárcel a la segunda, y no a la cuarta.', fuente: 'lo-1-2026' },
];

export const RETOS_OCUPACION: { t: string; d: string; fuente?: string }[] = [
  { t: 'Casa habitada o piso vacío', d: 'No es lo mismo quedarse en la casa de una familia que en un piso vacío de un banco. La primera ya es un delito grave; la segunda hoy se castiga con multa. La propuesta trata las dos rápido, pero el castigo puede seguir siendo distinto.' },
  { t: 'No confundir con quien deja de pagar', d: 'Un inquilino que deja de pagar el alquiler no es un ocupante: entró con contrato. Eso es un desahucio por impago, con otras reglas, y también tiene que ser rápido.' },
  { t: 'Hacen falta viviendas', d: 'Una alternativa para cada persona desalojada necesita viviendas públicas libres, y hoy hay muy pocas. Es la pieza que une esta ventana con la de Vivienda.' },
  { t: 'Familias vulnerables y menores', d: 'Hoy la ley obliga a avisar a los servicios sociales y los tribunales exigen valorar la situación de las familias vulnerables y de los niños antes de desalojar. La propuesta lo mantiene: la valoración y la alternativa se hacen a la vez que el desalojo, sin retrasar la devolución de la casa.', fuente: 'ley-5-2018' },
  { t: 'Rápido, pero con juez', d: 'Comprobar en 72 horas quién es el dueño y si hay contrato exige registros conectados. Sin juez, cualquiera podría echar a un inquilino legal diciendo que es un ocupante.' },
  { t: 'Prohibir las empresas', d: 'Hoy no hay una ley propia para estas empresas. En 2025 se propuso en el Congreso prohibirlas con multas de hasta 600.000 €, sin que haya salido adelante.', fuente: 'sumar-desokupa' },
];
