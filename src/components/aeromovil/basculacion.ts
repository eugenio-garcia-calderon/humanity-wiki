// ============================================================================
// THE TILT SYSTEM (2026-11-16): what makes a car with pods on parallelograms lean, sized piece by piece
// ============================================================================
// Eugenio: «basculación tiene que ser un menú entero dentro de rodaje … tiene que ir todo mucho más detallado en
// cuanto a qué tipo de tecnología de basculación activa se va a utilizar, como la que se utilizó en el Smera, donde se
// describe cada uno de los componentes y se dibujan también en 3D … que todas las piezas de la basculación y todos los
// componentes estén especificados para que los ingenieros entiendan qué es lo que tienen que construir».
//
// The geometry (which pods move, how far, the arms' turn β for a lean φ) is geometriaTriciclo.ts `poseBascula`. Here:
// for each axle on arms, a ROCKER on the centre line, its shaft along the car, joined to the two upper arms by two PUSH
// RODS so that rocker, rods and arms make a second parallelogram: the rocker turns exactly as the arms do (β). Whatever
// turns the rocker leans the car, and whatever holds it holds the lean. Three ways of turning or holding it:
//   - 'electrica'  ACTIVE, ELECTRIC (Lumeneo Smera, Toyota i-Road): a brushless motor through a planetary stage and a
//                  self-locking worm on each rocker shaft; a computer leans the car from the speed, the steering angle
//                  and an inertial sensor.
//   - 'hidraulica' ACTIVE, HYDRAULIC (Carver, «Dynamic Vehicle Control»): two double-acting cylinders on each rocker,
//                  fed by an electric pump through a valve block that follows the steering torque.
//   - 'libre'      FREE, WITH A LOCK (Piaggio MP3, Yamaha Niken): the rider leans it like a motorbike; a damper calms
//                  the rocker and a brake on its disc locks it upright when stopped.
//
// HOW IT IS SIZED (estimates of a first design, to be checked by the engineer who builds it)
// - The moment to beat is the car leaning with nobody balancing it: stopped at the full lean, M = m·g·h·sin φmax,
//   about the road under its centre line (h the centre of gravity's height), times a margin (wind, kerbs, a quick
//   change of lean), plus the inertia of a lean from upright to full in the time the tilt rate gives.
// - Each axle carries its share by the load on it. Through the linkage the rocker turns dβ/dφ times as fast as the
//   car leans, so it needs dφ/dβ times the moment (power in = power out).
// - Electric: the motor at 3 000 rpm, the gear ratio whatever brings that down to the rocker's speed; 55 % for the
//   planetary stage and the worm together (a worm that holds the load when the motor stops is a poor one), 48 V.
// - Hydraulic: 120 bar; each cylinder pushes or pulls at the rocker's end; the pump's power is pressure × flow / 60 %.
// - Free: the brake holds the full design moment with pads on both faces (μ 0,40) at 85 % of the disc's radius.
// - Masses by rules of thumb for parts of their class (each written beside its formula): not quoted parts.

export type TecBascula = 'electrica' | 'hidraulica' | 'libre';
export const TECNOLOGIAS_BASCULA: { k: TecBascula; n: string }[] = [
  { k: 'electrica', n: 'Activa eléctrica (como el Smera y el Toyota i-Road)' },
  { k: 'hidraulica', n: 'Activa hidráulica (como el Carver)' },
  { k: 'libre', n: 'Libre con bloqueo (como la Piaggio MP3)' },
];

/** One axle on arms, as the tilt system needs it. */
export interface EjeTilt {
  nombre: string;          // 'delantero', 'trasero' or 'lateral'
  x: number;               // the arms' x (m)
  yPivote: number;         // height of the upper arm's inner pivot (m)
  zp: number;              // the upper arm's inner pivot off the centre line (m)
  Lk: number;              // the upper arm's length (m)
  via: number;             // the axle's track (m)
  parte: number;           // the share of the weight on this axle (0…1)
  /** the rocker's turn β (rad) for a lean φ (rad) */
  beta: (phi: number) => number;
}
export interface EntradaTilt {
  tec: TecBascula;
  masa: number;            // the whole car with its riders (kg)
  cgY: number;             // its centre of gravity over the road (m)
  phiMax: number;          // full lean (rad)
  velocidad: number;       // tilt rate (°/s)
  margen: number;          // design margin over the static moment
  brazo: number;           // the rocker's half-length, shaft to rod (m)
  bloqueo: number;         // locked upright below this speed (km/h)
  ejes: EjeTilt[];
}
export interface ComponenteTilt {
  id: string;
  nombre: string;
  cantidad: number;
  /** what it does, in plain words */
  funcion: string;
  /** what to build or buy: each line a figure or a material */
  ficha: string[];
  /** the mass of all of them together (kg) */
  kg: number;
  /** where (the first of them, if several): x, y on the centre line */
  x: number; y: number;
  /** the axle it belongs to, or null for the whole system */
  eje: string | null;
}
export interface Tilt {
  tec: TecBascula;
  momentoEstatico: number;   // m·g·h·sin φmax (N·m)
  momentoDiseno: number;     // with margin and inertia (N·m)
  tiempo: number;            // upright to full lean (s)
  porEje: { nombre: string; relacion: number; parBalancin: number; velBalancin: number; potencia: number }[];
  potenciaTotal: number;     // peak, at the motor's or pump's input (W)
  energiaCurva: number;      // to lean from upright to full and back, once (J)
  componentes: ComponenteTilt[];
  kg: number;
}

const g = 9.81, V = 48, RPM_MOTOR = 3000, ETA_ELEC = 0.55, BAR = 120, ETA_BOMBA = 0.6, MU = 0.4;
const f1 = (v: number) => v.toLocaleString('es-ES', { maximumFractionDigits: 1 });
const f0 = (v: number) => Math.round(v).toLocaleString('es-ES');

export function dimensionarTilt(e: EntradaTilt): Tilt {
  const w = e.velocidad * Math.PI / 180, tiempo = e.phiMax / Math.max(1e-6, w);
  const Mest = e.masa * g * e.cgY * Math.sin(e.phiMax);
  // the roll inertia about the road: the mass at the centre of gravity's height, plus its own (a box 1 m wide by 1,2 m high)
  const I = e.masa * (e.cgY ** 2 + (1 + 1.44) / 12), alfa = w / Math.max(0.05, Math.min(0.3, tiempo / 2));
  const Mdis = e.margen * Mest + I * alfa;
  const comp: ComponenteTilt[] = [];
  const porEje = e.ejes.map(q => {
    const ph = e.phiMax / 2, d = 1e-3, rel = (q.beta(ph + d) - q.beta(ph - d)) / (2 * d);
    const par = Mdis * q.parte / Math.max(0.2, rel), wb = w * rel, P = par * wb;
    return { q, nombre: q.nombre, relacion: rel, parBalancin: par, velBalancin: wb, potencia: P };
  });
  let potenciaTotal = 0;
  for (const a of porEje) {
    const q = a.q, betaMax = q.beta(e.phiMax), yR = q.yPivote - 0.12, x = q.x;
    // the rocker and its rods: aluminium 7075; the rods' ends on spherical bearings
    const kgBal = 0.35 + 0.0035 * a.parBalancin;
    comp.push({ id: `balancin-${q.nombre}`, nombre: `Balancín ${q.nombre}`, cantidad: 1, eje: q.nombre, x, y: yR,
      funcion: 'Palanca en el centro del coche, con su eje a lo largo: gira lo mismo que los brazos y hace de segundo paralelogramo con ellos. Lo que la gira, inclina el coche.',
      ficha: [`Brazo de ${f0(e.brazo * 1000)} mm a cada lado del eje`, `Par: ${f0(a.parBalancin)} N·m de diseño`, `Gira ±${f1(betaMax * 180 / Math.PI)}° (los brazos giran ${f1(a.relacion)} veces lo que se inclina el coche)`, 'Aluminio 7075-T6 mecanizado; eje de acero 42CrMo4 de 25 mm en dos rodamientos de rodillos cónicos'],
      kg: kgBal });
    comp.push({ id: `bieletas-${q.nombre}`, nombre: `Bieletas del balancín ${q.nombre}`, cantidad: 2, eje: q.nombre, x, y: yR,
      funcion: 'Unen cada punta del balancín con el brazo superior de su lado, paralelas a la línea de los pivotes: así balancín y brazos giran siempre lo mismo.',
      ficha: [`Largo entre rótulas: ${f0(Math.hypot(0.12, q.zp) * 1000)} mm`, `Fuerza: ${f0(a.parBalancin / e.brazo / 2)} N cada una`, 'Tubo de acero 25CrMo4 de 16 × 2 mm, rótulas M10 a cada lado'],
      kg: 2 * (0.15 + 0.45 * Math.hypot(0.12, q.zp)) });
    if (e.tec === 'electrica') {
      const rpmB = a.velBalancin * 60 / (2 * Math.PI), i = RPM_MOTOR / Math.max(0.1, rpmB), P = a.potencia / ETA_ELEC, Tm = a.parBalancin / (i * ETA_ELEC);
      potenciaTotal += P;
      comp.push({ id: `actuador-${q.nombre}`, nombre: `Actuador eléctrico ${q.nombre}`, cantidad: 1, eje: q.nombre, x: x - 0.16, y: yR,
        funcion: 'Gira el balancín. Un motor sin escobillas a través de una etapa planetaria y un tornillo sin fin que no se deja mover desde fuera: si el motor se para, la inclinación se queda donde está.',
        ficha: [`Motor sin escobillas de ${V} V: ${f0(P)} W de pico, ${f1(Tm)} N·m a ${f0(RPM_MOTOR)} rpm, ${f0(P / (V * 0.9))} A`, `Reducción total 1:${f0(i)} (planetaria y sin fin, rendimiento ${f0(ETA_ELEC * 100)} %)`, `En el balancín: ${f0(a.parBalancin)} N·m a ${f1(rpmB)} rpm`, 'Codificador absoluto en el eje del balancín (la inclinación, a 0,1°)'],
        kg: (0.5 + 2.2 * P / 1000) + (0.8 + 0.006 * a.parBalancin) });
    } else if (e.tec === 'hidraulica') {
      const F = a.parBalancin / (2 * e.brazo), A = F / (BAR * 1e5), dmm = Math.max(16, Math.ceil(Math.sqrt(4 * A / Math.PI) * 1000 / 2) * 2);
      const carrera = 2 * e.brazo * Math.sin(betaMax) + 0.01, Q = 2 * (Math.PI * (dmm / 1000) ** 2 / 4) * e.brazo * a.velBalancin, P = BAR * 1e5 * Q / ETA_BOMBA;
      potenciaTotal += P;
      comp.push({ id: `cilindros-${q.nombre}`, nombre: `Cilindros hidráulicos ${q.nombre}`, cantidad: 2, eje: q.nombre, x, y: yR - 0.2,
        funcion: 'Uno en cada punta del balancín, del suelo de la carrocería a la punta: uno empuja y el otro tira. Con sus válvulas cerradas, la inclinación queda fija.',
        ficha: [`Doble efecto, Ø ${dmm} mm, vástago Ø ${Math.max(10, Math.round(dmm * 0.5))} mm, carrera ${f0(carrera * 1000)} mm`, `Fuerza: ${f0(F)} N cada uno a ${BAR} bar`, 'Cuerpo de acero, rótulas a cada lado'],
        kg: 2 * (0.4 + 0.02 * dmm + 2.0 * carrera) });
      comp.push({ id: `caudal-${q.nombre}`, nombre: `Caudal del eje ${q.nombre}`, cantidad: 0, eje: q.nombre, x, y: yR, funcion: '(cuenta del grupo hidráulico)', ficha: [`${f1(Q * 60000)} L/min a ${BAR} bar`], kg: 0 });
    } else {
      const N = a.parBalancin / (2 * MU * 0.085 * 0.85);
      comp.push({ id: `freno-${q.nombre}`, nombre: `Bloqueo del balancín ${q.nombre}`, cantidad: 1, eje: q.nombre, x: x - 0.06, y: yR,
        funcion: `Un disco en el eje del balancín y una pinza que lo aprieta: por debajo de ${f0(e.bloqueo)} km/h o al aparcar, el coche se queda derecho; en marcha, suelta y el piloto lo inclina como una moto.`,
        ficha: ['Disco de acero inoxidable de 170 mm', `Pinza de dos pistones con actuador eléctrico; aprieta ${f0(N)} N`, `Aguanta ${f0(a.parBalancin)} N·m`],
        kg: 0.45 + 0.5 + 0.35 });
      comp.push({ id: `amortiguador-${q.nombre}`, nombre: `Amortiguador de basculación ${q.nombre}`, cantidad: 1, eje: q.nombre, x: x - 0.12, y: yR,
        funcion: 'Frena el giro del balancín para que la inclinación no oscile: el coche se inclina con suavidad y no cabecea.',
        ficha: ['Amortiguador rotativo hidráulico en el eje del balancín, regulable', `Par de frenado ~${f0(a.parBalancin * 0.15)} N·m a ${f1(a.velBalancin * 60 / (2 * Math.PI))} rpm`],
        kg: 0.7 });
    }
  }
  const x0 = e.ejes[0]?.x ?? 0, y0 = e.ejes[0] ? e.ejes[0].yPivote - 0.12 : 0.5;
  if (e.tec === 'hidraulica') {
    const Q = comp.filter(c => c.id.startsWith('caudal-')).reduce((s, c) => s + parseFloat(c.ficha[0].replace(',', '.')), 0);
    comp.push({ id: 'grupo-hidraulico', nombre: 'Grupo hidráulico', cantidad: 1, eje: null, x: x0 - 0.35, y: y0 - 0.1,
      funcion: 'Bomba con su motor eléctrico, bloque de válvulas proporcionales, acumulador y depósito: da presión a los cilindros cuando la centralita lo pide.',
      ficha: [`Bomba de engranajes con motor de ${V} V: ${f0(potenciaTotal)} W de pico`, `Caudal: ${f1(Q)} L/min a ${BAR} bar`, 'Bloque de válvulas proporcionales de 4 vías y válvulas de bloqueo pilotadas, una por cilindro', 'Acumulador de 0,3 L, depósito de 0,5 L de aceite ISO VG 32'],
      kg: 1.5 + 2.5 * potenciaTotal / 1000 + 1.2 + 0.9 + 0.7 + 0.5 });
  }
  const activa = e.tec !== 'libre';
  comp.push({ id: 'centralita', nombre: 'Centralita de basculación', cantidad: 1, eje: null, x: x0 - 0.5, y: y0,
    funcion: activa
      ? `Decide cuánto inclinar: la que equilibra la curva (tan φ = v²/(R·g)) con la velocidad, el giro del volante y el sensor inercial, y la limita a ${f0(e.phiMax * 180 / Math.PI)}°. Mueve el ${e.tec === 'electrica' ? 'motor' : 'bloque de válvulas'}; si algo falla, deja el coche derecho y bloqueado.`
      : `Suelta o bloquea el balancín: lo bloquea derecho por debajo de ${f0(e.bloqueo)} km/h y al quitar el contacto, y avisa al piloto si va inclinado al pararse.`,
    ficha: [`Microcontrolador de seguridad (doble núcleo en paralelo), ${V} V; bus CAN con el resto del coche`, activa ? `Lazo de control a 500 Hz; de derecho a ${f0(e.phiMax * 180 / Math.PI)}° en ${f1(tiempo)} s` : 'Mando del bloqueo y aviso en el salpicadero'],
    kg: 0.35 });
  comp.push({ id: 'sensores', nombre: 'Sensores', cantidad: 3, eje: null, x: x0 - 0.5, y: y0 - 0.05,
    funcion: 'Lo que la centralita necesita saber: cuánto está inclinado el coche, cómo gira y cuánto gira el volante.',
    ficha: ['Unidad inercial de 6 ejes (acelerómetros y giróscopos) en el centro de gravedad', 'Codificador absoluto en cada balancín', 'Sensor de ángulo del volante'],
    kg: 0.05 + 0.08 * e.ejes.length + 0.1 });
  comp.push({ id: 'cableado', nombre: 'Cableado y fusibles', cantidad: 1, eje: null, x: x0 - 0.5, y: y0, funcion: 'Potencia y señales.', ficha: [activa ? `Cable de potencia de ${potenciaTotal > 1500 ? 10 : 6} mm²` : 'Cable de señal', 'Fusible y relé de corte de la basculación'], kg: 0.5 });
  const visibles = comp.filter(c => c.cantidad > 0);
  // energy for one bend: the actuators' input power over the time up and back (a triangle of speed: half the peak)
  const energiaCurva = potenciaTotal * 2 * tiempo * 0.5;
  return { tec: e.tec, momentoEstatico: Mest, momentoDiseno: Mdis, tiempo, porEje: porEje.map(({ q: _q, ...r }) => r), potenciaTotal, energiaCurva, componentes: visibles, kg: visibles.reduce((s, c) => s + c.kg, 0) };
}
