import type { Parametros } from '../geometria';
import type { ResultadoTunel, Zona } from './calculo';
import type { CuerpoTunel } from './nuestro';
import { porVelocidad, type PuntoTunel, type TipoPunto } from './puntos';

/**
 * What each critical point means, in plain Spanish, with this car's numbers and
 * concrete options to improve it (2026-11-09, Eugenio: «haz que el agente del
 * túnel de viento haga una explicación de cada uno de estos parámetros cuando se
 * hace click y que incluya opciones de mejora de esos parámetros»).
 *
 * Every sentence is one of two kinds, and the panel says which:
 *  · from the calculation (this tunnel: panel method + boundary layer, not CFD);
 *  · general aerodynamic knowledge, not computed here.
 * The improvement options name the editor's sliders exactly as they read on
 * screen (src/pages/Aeromovil.tsx). Their direction was checked with this tunnel
 * on the default designs on 2026-11-09 where `origen` is 'calculo'; «Probar»
 * recomputes it on the visitor's own design.
 */

export type Origen = 'calculo' | 'general';
export interface Frase { texto: string; origen: Origen }
export interface Mejora {
  texto: string; origen: Origen;
  /** The slider as it reads on screen, and where it is. */
  deslizador?: string; donde?: string;
  /** A concrete change to try with «Probar» (our design only). */
  prueba?: { clave: keyof Parametros; valor: number; desc: string };
  /** Why there is no «Probar»: the slider is already at its end. */
  enElExtremo?: string;
}
export interface Explicacion {
  titulo: string; color: TipoPunto;
  valor: Frase[]; queEs: Frase[]; porQue: Frase[]; comparacion: Frase[]; mejoras: Mejora[];
  notaMejoras?: string;
}

const RHO = 1.2;
const fmt = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (v: number) => `${fmt(v * 100, 0)} %`;
/** A slider value as the editor would show it: two decimals, three when the step is finer (0,995). */
const fmtV = (v: number) => v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
const c = (texto: string): Frase => ({ texto, origen: 'calculo' });
const g = (texto: string): Frase => ({ texto, origen: 'general' });

/** The sliders the options use: label on screen, where it is, range (as in Aeromovil.tsx). */
type Ficha = { n: string; donde: string; min: number; max: number };
const A1: Partial<Record<keyof Parametros, Ficha>> = {
  parabrisas: { n: 'Inclinación del parabrisas', donde: 'Carrocería › Carrocería y cúpula', min: 0.12, max: 0.32 },
  techo: { n: 'Caída del techo', donde: 'Carrocería › Carrocería y cúpula', min: 1, max: 3 },
  colaA1: { n: 'Forma de la cola', donde: 'Carrocería › Carrocería y cúpula', min: 0, max: 1 },
  posMorro: { n: 'Largo del morro (hasta la sección máxima)', donde: 'Carrocería › Carrocería y cúpula', min: -0.12, max: 0.18 },
  morroA1: { n: 'Redondez del morro', donde: 'Carrocería › Carrocería y cúpula', min: 0, max: 1 },
  fMorro: { n: 'Voladizo del morro', donde: 'Carrocería › Carrocería y cúpula', min: 0.15, max: 0.40 },
  cupX1: { n: 'Cúpula: dónde acaba', donde: 'Carrocería › Carrocería y cúpula', min: 0.70, max: 0.995 },
  nU: { n: 'Sección superior de la carrocería', donde: 'Carrocería › Carrocería y cúpula', min: 2.0, max: 3.4 },
  nL: { n: 'Fondo', donde: 'Carrocería › Carrocería y cúpula', min: 2.0, max: 5.0 },
  clear: { n: 'Altura de los bajos', donde: 'Chasis › Chasis', min: 0.10, max: 0.30 },
};
const GOTA: Partial<Record<keyof Parametros, Ficha>> = {
  tailRound: { n: 'Redondez de la punta de cola', donde: 'Carenado aerodinámico', min: 0, max: 0.8 },
  full: { n: 'Plenitud de cola', donde: 'Carenado aerodinámico', min: 0.5, max: 1.4 },
  tipH: { n: 'Altura de la punta de cola', donde: 'Carenado aerodinámico', min: 0.25, max: 0.70 },
  tail: { n: 'Hueco de la cola a la rueda trasera', donde: 'Carenado aerodinámico', min: 0.05, max: 1.4 },
  pmax: { n: 'Posición del espesor máximo', donde: 'Carenado aerodinámico', min: 0.25, max: 0.60 },
  morro: { n: 'Forma del morro', donde: 'Carenado aerodinámico', min: 0, max: 1 },
  overF: { n: 'Hueco del morro a la rueda delantera', donde: 'Carenado aerodinámico', min: 0.05, max: 0.80 },
  nL: { n: 'Fondo', donde: 'Carenado aerodinámico', min: 2.0, max: 5.0 },
  nU: { n: 'Sección superior', donde: 'Carenado aerodinámico', min: 2.0, max: 3.4 },
  clear: { n: 'Altura de los bajos', donde: 'Chasis y ruedas', min: 0.08, max: 0.40 },
};

/** What the garage cars' designers did, or could do (qualitative). */
const GARAJE: Record<string, string> = {
  xl1: 'VW le dio una cola larga que se estrecha hacia atrás y tapó las ruedas traseras, así que el corte final de la cola es pequeño. Lo que le queda son las ruedas delanteras y sus pasos de rueda.',
  unlitro: 'VW lo hizo estrecho (dos plazas, una detrás de otra) y con la cola casi en punta: su estela es de las más pequeñas del garaje.',
  szemission: 'Los equipos de la Shell Eco-marathon estiran la cola hasta donde deja el reglamento y meten las ruedas dentro de la carrocería.',
  aptera: 'Aptera estrecha la cola en forma de gota; las ruedas delanteras van en carenados sobre brazos y la trasera dentro de una quilla. Esos carenados y el final de la quilla dejan sus propias estelas, que este túnel solo ve en parte.',
  twizy: 'Es un coche urbano abierto por los lados, con la trasera casi vertical y las ruedas al aire. Lo que más le bajaría el consumo: cerrar los costados, carenar las ruedas y alargar la cola.',
  jaguarD: 'Coche de carreras de 1955: morro largo y bajo, aleta detrás del piloto para ir recto a mucha velocidad y pasos de rueda abiertos. La cola cortada y las ruedas son lo que más le cuesta.',
  aerorider: 'Velomóvil: un carenado largo y estrecho con las ruedas dentro y la cola casi en punta.',
  nusKruce: 'Coche de estudiantes para la Shell Eco-marathon con forma de coche de ciudad: morro redondo, techo de cristal en arco y ruedas tapadas con discos lisos para que no remuevan el aire. Lo que más le cuesta es la trasera, alta y cortada, y las cuatro ruedas en sus pasos: el reglamento de su categoría le obliga a parecerse a un coche de calle.',
  bala: 'Es un diseño propio, hecho a partir del Aeromóvil Gota como modelo fijo del garaje: morro en punta, cola en cono con aleta y las ruedas delantera y trasera dentro de la carrocería. El túnel solo calcula el cuerpo: los carenados de las ruedas laterales y sus brazos dejan estelas propias que no ve, así que su Cd real será algo más alto.',
};

export interface Contexto {
  punto: PuntoTunel; cuerpo: CuerpoTunel; R: ResultadoTunel; kmh: number;
  /** The other bodies in the tunnel, to compare with. */
  otros: { cuerpo: CuerpoTunel; R: ResultadoTunel }[];
  /** Our design's parameters (only when the body is ours). */
  P?: Parametros;
}

/** Interpolated Cp of a centreline profile at x. */
function cpEn(p: { x: number[]; cp: number[] }, x: number): number {
  for (let i = 0; i + 1 < p.x.length; i++) {
    const a = p.x[i], b = p.x[i + 1];
    if ((a - x) * (b - x) <= 0 && a !== b) return p.cp[i] + (p.cp[i + 1] - p.cp[i]) * (x - a) / (b - a);
  }
  return NaN;
}

export function explicar(cx: Contexto): Explicacion {
  const { punto: pt, cuerpo, R, kmh, otros, P } = cx;
  const q = porVelocidad(R, kmh), G = R.geometria, v = kmh / 3.6, qd = 0.5 * RHO * v * v;
  const nuestro = cuerpo.id === 'aeromovil' && !!P, a1 = P?.disposicion === 'cuatro';
  const fichas = a1 ? A1 : GOTA;
  const desdeMorro = (x: number) => G.xMorro - x;
  const escala = g(`El Cp (coeficiente de presión) dice cuánto empuja el aire en cada punto, comparado con lo que empujaría si se parase del todo contra el coche. Cp 1: el aire parado del todo (a ${kmh} km/h son ${fmt(qd, 0)} Pa, como ${fmt(qd / 9.81, 0)} kg apoyados en cada metro cuadrado). Cp 0: la misma presión que el aire libre, lejos del coche. Cp negativo: el aire pasa más rápido que el coche y tira de la carrocería hacia fuera (succión).`);
  const kWh = (cdParte: number) => qd * cdParte * cuerpo.area / 36; // kWh/100 km: 1 N for 100 km = 1/36 kWh

  /** An option with a slider; for our design, a concrete value to try with «Probar». */
  const opcion = (clave: keyof Parametros, sentido: 1 | -1, paso: number, texto: string, origen: Origen): Mejora | null => {
    const f = fichas[clave];
    if (!f || !nuestro) return null; // garage cars have no sliders: they get the general options instead
    const m: Mejora = { texto, origen, deslizador: f.n, donde: f.donde };
    if (nuestro && P) {
      const actual = Number(P[clave]);
      const nuevo = Math.round(Math.min(f.max, Math.max(f.min, actual + sentido * paso)) * 1000) / 1000;
      if (Math.abs(nuevo - actual) < 1e-6) m.enElExtremo = `«${f.n}» ya está en su extremo (${fmtV(actual)}).`;
      else m.prueba = { clave, valor: nuevo, desc: `«${f.n}» de ${fmtV(actual)} a ${fmtV(nuevo)}` };
    }
    return m;
  };
  const opciones = (...m: (Mejora | null)[]) => m.filter((x): x is Mejora => !!x);
  const notaGaraje = !nuestro ? `${GARAJE[cuerpo.id] ?? 'Es un coche del garaje: su forma la decidió su fabricante.'} Las opciones de abajo son conocimiento general; el «Probar» solo funciona con el diseño del editor, porque es el único cuyos parámetros conoce.` : undefined;
  const nombreOtros = (f: (o: { cuerpo: CuerpoTunel; R: ResultadoTunel }) => string | null) => otros.map(o => { const t = f(o); return t ? `${o.cuerpo.nombre}: ${t}` : null; }).filter((x): x is string => !!x);
  const sinOtros = otros.length ? [] : [c('No hay otros coches en el túnel con los que compararlo: saca alguno del garaje.')];

  switch (pt.tipo) {
    // ------------------------------------------------------------------ stagnation
    case 'remanso': {
      const k = R.criticos.find(x => x.tipo === 'remanso')!, y = k.p[1];
      const comp = nombreOtros(o => { const r = o.R.criticos.find(x => x.tipo === 'remanso'); return r ? `a ${fmt(r.p[1])} m del suelo (${pct(r.p[1] / o.R.geometria.alto)} del alto)` : null; });
      return {
        titulo: 'Punto de remanso', color: 'remanso',
        valor: [c(`Cp ${fmt(k.cp)} ${desdeMorro(k.p[0]) < 0.05 ? 'en la misma punta del morro' : `a ${fmt(desdeMorro(k.p[0]))} m de la punta del morro`}, a ${fmt(y)} m del suelo (${pct(y / G.alto)} del alto del coche). ${Math.abs(1 - k.cp) < 0.005 ? 'El cálculo da 1, como debe ser.' : 'El cálculo da casi 1, como debe ser; lo que falta hasta 1 es el error de los paneles.'}`)],
        queEs: [g('Es el punto del morro donde el aire choca de frente y se para del todo. Ahí la presión es la más alta de todo el coche.'), escala,
          g('Todo coche en marcha tiene un punto de remanso con Cp 1: ese número no se puede mejorar. Lo que cambia de un coche a otro es dónde está y lo deprisa que la presión baja a su alrededor.')],
        porQue: [g('La zona de alta presión alrededor del remanso empuja el coche hacia atrás. Con un morro bien redondeado es pequeña y el aire la deja enseguida, acelerando hacia los lados, así que cuesta poca energía.'),
          g('Su altura reparte el aire: lo que llega por encima del remanso pasa por el techo y lo de debajo, entre el suelo y los bajos. Cuanto más bajo está, menos aire se cuela por debajo del coche.'),
          g('Es el mejor sitio para una toma de aire (refrigeración, ventilación de la cabina): la presión mete el aire sin ayuda. También es donde más se pegan los insectos y la suciedad.')],
        comparacion: comp.length ? comp.map(t => c(`Remanso del ${t}.`)) : sinOtros,
        mejoras: a1 || !nuestro ? opciones(
          opcion('morroA1', -1, 0.15, 'Un morro más afilado (hacia «ojival») deja una zona de alta presión más pequeña. Con el diseño por defecto el túnel lo confirma, pero el efecto es pequeño: la mayor parte del Cd está en el rozamiento y en la cola.', 'calculo'),
          opcion('fMorro', 1, 0.04, 'Un voladizo de morro más largo da al aire más distancia para apartarse poco a poco. Con el diseño por defecto el túnel da un Cd algo más bajo.', 'calculo'),
          opcion('clear', 1, 0.03, 'Subir o bajar el coche mueve el remanso: más alto, el remanso sube, pero queda más hueco bajo el coche y pasa más aire entre el suelo y los bajos. Cambia también el área frontal.', 'general'),
          ...(!nuestro ? [{ texto: 'Redondear el morro y llevar las tomas de aire a la zona de alta presión, en vez de abrir rejillas por todo el frontal.', origen: 'general' as Origen }] : []),
        ) : opciones(
          opcion('morro', -1, 0.2, 'Un morro más afilado deja una zona de alta presión más pequeña; con el diseño por defecto el túnel da un Cd algo más bajo con el morro afilado que con el romo, pero la diferencia es pequeña.', 'calculo'),
          opcion('overF', 1, 0.1, 'Más hueco entre el morro y la rueda delantera da un morro más largo, que aparta el aire más despacio.', 'general'),
          opcion('clear', 1, 0.04, 'La altura de los bajos sube o baja el remanso y cambia cuánto aire pasa por debajo.', 'general'),
        ),
        notaMejoras: notaGaraje,
      };
    }
    // ------------------------------------------------------------------ suction peak
    case 'succion': {
      const cp = pt.cp ?? 0, zona: Zona = pt.zona ?? 'arriba', k = R.criticos.find(x => x.tipo === 'succion' && Math.abs(x.cp - cp) < 1e-9);
      const vLocal = Math.sqrt(Math.max(0, 1 - cp)) * kmh;
      const x = k ? desdeMorro(k.p[0]) : (pt.f ?? 0) * G.largo, y = k ? k.p[1] : pt.ancla[1];
      const masFuerte = (o: { R: ResultadoTunel }) => o.R.criticos.filter(z => z.tipo === 'succion' && z.zona === zona).sort((a, b) => a.cp - b.cp)[0];
      const comp = nombreOtros(o => { const s = masFuerte(o); return s ? `Cp ${fmt(s.cp)} (al ${pct(s.f)} del largo)` : `sin pico de succión en esa zona`; });
      const dondeTxt = zona === 'bajos' ? 'debajo del coche' : zona === 'arriba' ? 'arriba' : zona === 'costado' ? 'en el costado' : 'en la punta';
      const porQue: Frase[] = [g('Una succión fuerte no gasta energía por sí sola. Lo que cuesta es lo que viene detrás: pasado el pico, el aire tiene que volver a frenarse y la presión sube (el «gradiente adverso»). Cuanto más alto es el pico y más corto el camino para recuperar, más fácil es que el aire se despegue antes de tiempo.')];
      if (zona === 'arriba') porQue.push(g('Arriba, la succión tira del coche hacia arriba (sustentación) y quita peso a las ruedas a velocidad. También es donde suele nacer el ruido de viento si hay juntas, montantes o retrovisores que sobresalen.'), c(`Para este coche el cálculo da una sustentación total Cl ${fmt(R.cl)} (delante ${fmt(R.clDel)}, detrás ${fmt(R.clTras)}; negativa es que lo pega al suelo). Es aire ideal con la carretera como espejo: sirve para comparar, no como cifra de diseño.`));
      if (zona === 'bajos') porQue.push(g('Debajo, la succión aprieta el coche contra el suelo (carga aerodinámica): estabiliza, pero si el fondo es rugoso y las ruedas y suspensiones van al aire, ese aire rápido se convierte en rozamiento.'), c(`El cálculo usa la carretera como un espejo y no ve las ruedas ni las piezas de los bajos. Sustentación total Cl ${fmt(R.cl)} (delante ${fmt(R.clDel)}, detrás ${fmt(R.clTras)}).`));
      if (zona === 'costado') porQue.push(g('En los costados tira hacia fuera igual en los dos lados y se anula; con viento de costado deja de ser igual y empuja el coche de lado.'));
      if (zona === 'punta') porQue.push(g('En la punta, el aire acelera al rodear el morro; si la curva es muy cerrada, el pico es alto y corto.'));
      const mej = a1 || !nuestro ? (zona === 'bajos' ? opciones(
        opcion('clear', 1, 0.03, 'Más altura de bajos: el aire pasa menos estrecho entre el suelo y el coche, la succión de abajo baja y también la carga contra el suelo. En el editor también baja el área frontal.', 'calculo'),
        opcion('nL', 1, 0.5, 'Un fondo más plano reparte la succión por todo el fondo en vez de concentrarla.', 'general'),
      ) : zona === 'costado' ? opciones(
        opcion('nU', -1, 0.3, 'Una sección más redondeada (hacia «elíptica») quita las esquinas que el aire tiene que rodear de golpe.', 'general'),
      ) : opciones(
        opcion('parabrisas', 1, 0.03, 'Un parabrisas más tumbado hace la curva del techo más suave: el pico de succión baja. Con el diseño por defecto el túnel lo confirma, y el Cd también baja algo.', 'calculo'),
        opcion('techo', -1, 0.4, 'Ojo, es un compromiso: con un techo que cae en recta desde el pico, la estela se hace más pequeña y el Cd baja, pero el pico de succión del techo sube. Con el diseño por defecto el túnel da las dos cosas.', 'calculo'),
        (pt.f ?? 1) < 0.2 ? opcion('morroA1', 1, 0.15, 'La succión está en el morro: uno más redondo («gota») suaviza la curva de la punta.', 'general') : null,
      )) : (zona === 'bajos' ? opciones(
        opcion('clear', 1, 0.04, 'Más altura de bajos: menos carga contra el suelo; con el diseño por defecto el túnel lo confirma. En el Gota el pico de succión de abajo no baja con ello: el túnel no da una tendencia clara, pruébalo.', 'calculo'),
        opcion('nL', 1, 0.5, 'Un fondo más plano reparte la succión.', 'general'),
      ) : opciones(
        opcion('pmax', -1, 0.08, 'Adelantar el espesor máximo suaviza la curva del techo: con el diseño por defecto el pico de arriba baja un poco.', 'calculo'),
        opcion('nU', -1, 0.3, 'Una sección superior más redondeada quita esquinas que el aire rodea de golpe.', 'general'),
        (pt.f ?? 1) < 0.2 ? opcion('morro', 1, 0.2, 'La succión está en el morro: uno más redondo suaviza la curva.', 'general') : null,
      ));
      if (!nuestro) mej.push({ texto: 'Suavizar la curva donde está el pico (un parabrisas más tumbado, un borde de techo más redondeado, montantes y retrovisores integrados) y dejar detrás un tramo largo para que el aire recupere presión poco a poco.', origen: 'general' });
      return {
        titulo: pt.nombre ?? 'Pico de succión', color: 'succion',
        valor: [c(`Cp ${fmt(cp)} ${dondeTxt}, a ${fmt(x)} m del morro (${pct(x / G.largo)} del largo) y ${fmt(y)} m del suelo. Junto a la piel, el aire va ahí a unos ${fmt(vLocal, 0)} km/h cuando el coche va a ${kmh}: por eso la presión baja ${fmt(-cp * qd, 0)} Pa respecto al aire libre.`)],
        queEs: [g('Aquí el aire va más deprisa que en ningún otro punto de esta zona, porque tiene que rodear una curva de la carrocería. Al ir más rápido, su presión baja (es el principio de Bernoulli) y tira de la carrocería hacia fuera.'), escala],
        porQue, comparacion: comp.length ? comp.map(t => c(`Succión más fuerte ${dondeTxt} del ${t}.`)) : sinOtros,
        mejoras: mej, notaMejoras: notaGaraje,
      };
    }
    // ------------------------------------------------------------------ adverse gradient
    case 'adverso': {
      const K = q.adverso.length / 3, xa = q.advTecho, xs = q.sepTecho;
      const cpA = cpEn(R.perfiles.techo, xa), cpS = cpEn(R.perfiles.techo, xs);
      const largoRec = xa - xs;
      const comp = nombreOtros(o => { const oq = porVelocidad(o.R, kmh), og = o.R.geometria; return `empieza al ${pct((og.xMorro - oq.advTecho) / og.largo)} del largo y tiene ${fmt(oq.advTecho - oq.sepTecho)} m hasta despegarse`; });
      void K;
      const mej = a1 || !nuestro ? opciones(
        opcion('posMorro', 1, 0.06, 'Mover hacia atrás la sección más gruesa con un morro más largo. Con el diseño por defecto el túnel da un Cd algo más bajo, aunque deja menos sitio para la bajada.', 'calculo'),
        opcion('techo', -1, 0.4, 'Un techo que baja antes y en recta hace la subida de presión más larga y más suave: con el diseño por defecto el túnel da una estela más pequeña.', 'calculo'),
        opcion('cupX1', 1, 0.05, 'Llevar la cúpula hasta el final de la cola: si acaba antes, el aire cae de golpe al acabar la cúpula y se despega allí (con el diseño por defecto, acabarla antes de la cola sube el Cd de forma clara).', 'calculo'),
        opcion('colaA1', -1, 0.25, 'Una cola más afilada: el aire tiene más camino para frenarse poco a poco.', 'general'),
      ) : opciones(
        opcion('full', 1, 0.15, 'Una cola más afilada («Plenitud de cola» hacia afilada): la subida de presión se reparte en más longitud. Con el diseño por defecto el túnel da un Cd más bajo.', 'calculo'),
        opcion('pmax', -1, 0.08, 'Adelantar el espesor máximo deja más largo para bajar.', 'general'),
        opcion('tail', 1, 0.15, 'Más hueco de cola alarga la bajada; con el diseño por defecto el túnel apenas lo nota, porque también añade piel que roza.', 'calculo'),
      );
      if (!nuestro) mej.push({ texto: 'Que la carrocería baje poco a poco detrás de su punto más ancho y más alto (una cola larga, sin escalones), en vez de caer de golpe.', origen: 'general' });
      return {
        titulo: 'El aire empieza a frenarse (gradiente adverso)', color: 'adverso',
        valor: [c(`Por arriba empieza a ${fmt(desdeMorro(xa))} m del morro (${pct(desdeMorro(xa) / G.largo)} del largo). Desde ahí la presión sube de Cp ${fmt(cpA)} a Cp ${Number.isFinite(cpS) ? fmt(cpS) : '—'} en ${fmt(largoRec)} m, hasta donde el cálculo prevé que el aire se despegue.`), c('La línea naranja discontinua del 3D la marca alrededor de todo el coche; en la gráfica de la tarjeta son las líneas verticales naranjas.')],
        queEs: [g('Desde aquí hacia atrás, el aire que se había acelerado al rodear el coche tiene que frenarse para volver a la velocidad del aire libre, y su presión sube. Esa subida empuja contra el aire que va pegado a la carrocería: por eso se llama gradiente «adverso».'),
          g('La capa de aire más pegada a la piel (la capa límite) ya ha perdido velocidad por el rozamiento. Si la subida de presión es demasiado fuerte o demasiado larga, se para y se despega: ahí empieza la estela.'), escala],
        porQue: [g('Cuanto más larga y más suave es esta recuperación, más presión recupera la cola, menos estela queda y menos energía cuesta. Es la diferencia entre una gota y un coche cortado.'), c('Su efecto en el consumo se ve en la estela (pincha «Estela» para ver cuánto cuesta en kWh).')],
        comparacion: comp.length ? comp.map(t => c(`${t}.`)) : sinOtros,
        mejoras: mej, notaMejoras: notaGaraje,
      };
    }
    // ------------------------------------------------------------------ separation and bubble
    case 'separacion':
    case 'burbuja': {
      const K = q.separacion.length / 3, dCola = q.xSeparacion - G.xCola;
      const otrasVel = R.porVelocidad.map(p => `${p.kmh} km/h: ${fmt(G.xMorro - p.xSeparacion)} m`).join(' · ');
      const comp = nombreOtros(o => { const oq = porVelocidad(o.R, kmh), og = o.R.geometria; return `se despega de media ${fmt(oq.xSeparacion - og.xCola)} m antes del final y deja ${fmt(oq.areaBase, 3)} m² detrás`; });
      if (pt.tipo === 'burbuja') return {
        titulo: 'Burbuja: se despega y vuelve', color: 'burbuja',
        valor: [c(`El cálculo prevé que el aire se despegue un momento a ${fmt(desdeMorro(pt.ancla[0]))} m del morro y vuelva a pegarse más atrás (por delante de la sección más gruesa, el aire vuelve a acelerar).`)],
        queEs: [g('Es una separación corta: el aire se despega en un tramo de presión que sube, forma un pequeño remolino y vuelve a la carrocería cuando la presión vuelve a bajar.')],
        porQue: [g('Una burbuja añade un poco de arrastre y algo de ruido, y donde vuelve a pegarse el aire es más turbulento. Si crece, puede acabar en una separación de verdad.')],
        comparacion: [], mejoras: [{ texto: 'Suavizar la curva justo antes de la burbuja (menos esquina, más radio).', origen: 'general' }], notaMejoras: notaGaraje,
      };
      const mej = colaMejoras();
      return {
        titulo: q.pegadas === K ? 'Pegado hasta la cola' : 'Separación prevista', color: 'separacion',
        valor: [c(`De media a ${fmt(G.xMorro - q.xSeparacion)} m del morro, ${fmt(dCola)} m antes del final de la cola. Por arriba a ${fmt(desdeMorro(q.sepTecho))} m, por el costado a ${fmt(desdeMorro(q.sepLado))} m y por abajo a ${fmt(desdeMorro(q.sepBajos))} m. ${q.pegadas} de ${K} líneas de la superficie llegan pegadas hasta la punta.`),
          c(`Detrás de la línea quedan ${fmt(q.areaBase, 3)} m² (${pct(q.areaBase / cuerpo.area)} del área frontal). Con la velocidad cambia poco: ${otrasVel} del morro.`)],
        queEs: [g('Es la línea donde el aire deja de seguir la carrocería y se despega. Detrás de ella el aire ya no empuja la cola hacia delante: queda un hueco de aire revuelto a baja presión, la estela, que tira del coche hacia atrás.'),
          c('El túnel la calcula siguiendo la capa de aire pegada a la piel (métodos de Thwaites y de Head) a lo largo de cada línea de la superficie. Es una estimación: un túnel de verdad o un CFD pueden ponerla unos centímetros antes o después.')],
        porQue: [g('Cuanto más atrás y más pequeño es el hueco que deja, menos estela y menos consumo.'),
          g('Una separación limpia en un borde vivo (una cola cortada en seco, tipo Kamm) es estable; una que se mueve por una superficie curva hace que la estela cambie de tamaño y puede dar vibraciones y ruido.'),
          g('La suciedad y el agua de la carretera se acumulan justo donde el aire se despega: la trasera y la luneta.')],
        comparacion: comp.length ? comp.map(t => c(`${t}.`)) : sinOtros,
        mejoras: mej, notaMejoras: notaGaraje,
      };
    }
    // ------------------------------------------------------------------ wake
    case 'estela':
    default: {
      const parte = q.cd.forma + q.cd.estela, comp = nombreOtros(o => { const oq = porVelocidad(o.R, kmh); return `Cd de forma y estela ${fmt(oq.cd.forma + oq.cd.estela, 3)} (${pct((oq.cd.forma + oq.cd.estela) / oq.cd.total)} de su Cd), ${fmt(0.5 * RHO * v * v * (oq.cd.forma + oq.cd.estela) * o.cuerpo.area / 36)} kWh cada 100 km`; });
      return {
        titulo: 'Estela', color: 'estela',
        valor: [c(`El hueco que deja detrás la separación mide ${fmt(q.areaBase, 3)} m². La parte del Cd por forma y estela es ${fmt(parte, 3)} de ${fmt(q.cd.total, 3)} (${pct(parte / q.cd.total)}); a ${kmh} km/h son ${fmt(kWh(parte))} kWh cada 100 km y ${fmt(kWh(parte) * kmh / 100, 2)} kW.`),
          c('La forma dibujada (la burbuja morada y cómo se abre después) es un modelo, no un cálculo: el aire ideal del método de paneles no tiene estela. El tamaño sí sale del cálculo: es el área que deja la línea de separación.')],
        queEs: [g('Es el aire revuelto que deja el coche detrás. Su presión es más baja que la del aire libre, así que tira del coche hacia atrás. En un coche de calle es la mayor parte del arrastre; en uno muy aerodinámico pesa más el rozamiento de la piel.')],
        porQue: [c(`Es energía: con este coche, cada 100 km a ${kmh} km/h se van ${fmt(kWh(parte))} kWh solo en esta parte.`), g('Una estela grande también ensucia la trasera, levanta agua de la carretera y empuja a los coches que vienen detrás.')],
        comparacion: comp.length ? comp.map(t => c(`${t}.`)) : sinOtros,
        mejoras: colaMejoras(), notaMejoras: notaGaraje,
      };
    }
  }

  /** The tail options, shared by separation and wake. */
  function colaMejoras(): Mejora[] {
    if (!nuestro) return [
      { texto: 'Alargar y estrechar la cola (en planta y en alzado) para que la presión se recupere poco a poco y el hueco final sea pequeño.', origen: 'general' },
      { texto: 'Si no hay sitio para una cola larga, cortarla en seco con un borde vivo (cola Kamm): deja menos estela que una trasera redondeada y corta.', origen: 'general' },
      { texto: 'Tapar las ruedas traseras y cerrar los huecos de la trasera.', origen: 'general' },
    ];
    return a1 ? opciones(
      opcion('techo', -1, 0.4, 'Un techo que baja en recta desde el pico deja el hueco final más pequeño: con el diseño por defecto el túnel da una estela más pequeña y un Cd más bajo.', 'calculo'),
      opcion('colaA1', -1, 0.25, 'Una cola más afilada termina en un hueco más pequeño. Con el diseño por defecto el túnel apenas lo nota hacia «afilada» y sí lo nota hacia «llena» (peor).', 'calculo'),
      opcion('cupX1', 1, 0.05, 'La cúpula hasta el final de la cola: si acaba antes, el aire se despega en su final.', 'calculo'),
      opcion('parabrisas', 1, 0.03, 'Un parabrisas más tumbado hace todo el perfil de arriba más suave; con el diseño por defecto también encoge la estela.', 'calculo'),
    ) : opciones(
      opcion('tailRound', -1, 0.3, 'La punta de cola menos roma (hacia «en punta») es lo que más cambia en el Gota: con el diseño por defecto el túnel da menos estela y un Cd claramente más bajo.', 'calculo'),
      opcion('full', 1, 0.15, 'Una cola más afilada («Plenitud de cola») deja menos hueco: con el diseño por defecto el túnel da un Cd más bajo.', 'calculo'),
      opcion('tipH', -1, 0.15, 'Bajar la punta de cola alinea la cola con el aire que viene de los bajos; con el diseño por defecto, algo menos de estela.', 'calculo'),
    );
  }
}
