// ============================================================================
// JUEGO VITAL — LA RUTINA DE TUS AMIGOS (2026-08-19, petición de Eugenio: «haz
// que las personas del juego que son los amigos se muevan como dando un paseo
// alrededor de la plaza o que se sienten en bancos»).
//
// Hasta hoy Anita y Javier estaban CLAVADOS donde los plantaste, girando la
// cabeza. Aquí vive la lógica de qué hace cada uno y cuándo, separada del
// dibujo para que se pueda leer (y cambiar) sin tocar el 3D.
//
// La rutina es DETERMINISTA a partir del id de cada persona: la misma persona
// hace siempre el mismo recorrido, a su ritmo. No es aleatorio en cada visita,
// porque una aldea donde tus amigos aparecen cada vez en otro sitio no se
// siente como un sitio, se siente como un salvapantallas.
// ============================================================================
import { BANCOS } from './mapa';

/** Qué está haciendo alguien ahora mismo. */
export type Quehacer = 'paseo' | 'sentado' | 'parado';

/** Un momento de la rutina: qué hace y cuánto dura. */
export interface Tramo { hace: Quehacer; desde: number; hasta: number }

/** Número estable entre 0 y 1 a partir de un texto: el «carácter» de cada uno. */
export function semillaDe(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * La rutina de una persona: una vuelta completa de unos tres minutos con
 * paseos, ratos sentada y paradas a mirar. Cada cual con sus tiempos, para
 * que no vayan todos a la vez como un desfile.
 */
export function rutinaDe(id: string): { ciclo: number; tramos: Tramo[]; banco: number; radio: number; sentido: number; velocidad: number } {
  const s = semillaDe(id);
  const s2 = semillaDe(id + '·2');
  const s3 = semillaDe(id + '·3');

  // Un paseo largo, un rato sentado, otro paseo corto y una parada.
  const paseo1 = 42 + s * 26;
  const sentado = 34 + s2 * 30;
  const paseo2 = 26 + s3 * 22;
  const parado = 14 + s * 12;
  const ciclo = paseo1 + sentado + paseo2 + parado;

  let t = 0;
  const tramos: Tramo[] = [];
  const añade = (hace: Quehacer, dur: number) => { tramos.push({ hace, desde: t, hasta: t + dur }); t += dur; };
  añade('paseo', paseo1);
  añade('sentado', sentado);
  añade('paseo', paseo2);
  añade('parado', parado);

  return {
    ciclo,
    tramos,
    // A cada persona su banco, repartidos: dos que quieran el mismo a la vez
    // se sentarían uno dentro del otro.
    banco: Math.floor(s2 * BANCOS.length) % BANCOS.length,
    // Su carril del paseo: entre 12 y 19 m del centro, para que no vayan en
    // fila india por la misma línea.
    radio: 12 + s * 7,
    sentido: s3 > 0.5 ? 1 : -1,
    // Paso de paseo tranquilo: 0,85 a 1,25 m/s. Un adulto andando va a 1,3.
    velocidad: 0.85 + s2 * 0.4,
  };
}

/** Qué le toca hacer a esta persona en el segundo `t` de la partida. */
export function quehacerEn(rut: ReturnType<typeof rutinaDe>, t: number): { hace: Quehacer; dentro: number } {
  const local = ((t % rut.ciclo) + rut.ciclo) % rut.ciclo;
  for (const tr of rut.tramos) {
    if (local >= tr.desde && local < tr.hasta) return { hace: tr.hace, dentro: local - tr.desde };
  }
  return { hace: 'parado', dentro: 0 };
}

/** Dónde se sienta: en el banco que le toca, con su misma orientación. */
export function asientoDe(rut: ReturnType<typeof rutinaDe>) {
  const b = BANCOS[rut.banco];
  return {
    // Un poco a un lado del centro del banco: caben dos y no se solapan.
    x: b.x + Math.cos(b.rot) * (rut.sentido * 0.5),
    z: b.z - Math.sin(b.rot) * (rut.sentido * 0.5),
    rot: b.rot,
    /** Altura del asiento del banco (`Detalles.tsx`: la tabla va a 0,45). */
    alto: 0.45,
  };
}

/** El punto del paseo en el segundo `t`: una vuelta tranquila a la plaza. */
export function puntoDePaseo(rut: ReturnType<typeof rutinaDe>, t: number) {
  // Velocidad angular = velocidad lineal / radio, para que todos anden al
  // mismo paso aunque unos den una vuelta más larga que otros.
  const w = (rut.velocidad / rut.radio) * rut.sentido;
  const a = semillaDe(String(rut.radio)) * Math.PI * 2 + t * w;
  return { x: Math.cos(a) * rut.radio, z: Math.sin(a) * rut.radio, angulo: a, w };
}
