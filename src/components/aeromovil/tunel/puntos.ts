import type { PorVelocidad, ResultadoTunel, Zona } from './calculo';

/**
 * The critical points of one body at one speed, as the 3D view labels them and
 * the card lists them: same ids, same texts, same anchors. Pure (no three.js).
 */
export type TipoPunto = 'remanso' | 'succion' | 'adverso' | 'separacion' | 'estela' | 'burbuja';
export interface PuntoTunel {
  /** Stable within a result and speed: 'remanso', 'succion-0'…, 'adverso', 'separacion', 'estela', 'burbuja'. */
  id: string;
  tipo: TipoPunto;
  /** The label's text in the 3D view and the row's text in the card. */
  etiqueta: string;
  /** Where the leader starts (on the −z side, the one the default views look at) and the label's offset from it. */
  ancla: [number, number, number]; desplaza: [number, number, number];
  cp?: number; zona?: Zona; f?: number; nombre?: string;
}

const fmt = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });

/** The wake model behind the separation line, at one speed (its SHAPE is a model, not a calculation). */
export function modeloEstela(q: PorVelocidad) {
  const K = q.separacion.length / 3, sep: { x: number; y: number; z: number }[] = [];
  for (let k = 0; k < K; k++) sep.push({ x: q.separacion[3 * k], y: q.separacion[3 * k + 1], z: q.separacion[3 * k + 2] });
  // ring: this half bottom → top, then the mirror half top → bottom
  const anillo = [...sep, ...[...sep].reverse().map(p => ({ ...p, z: -p.z }))];
  let yc = 0; for (const p of anillo) yc += p.y; yc /= anillo.length;
  const polar = anillo.map(p => ({ fi: Math.atan2(p.y - yc, p.z), r: Math.hypot(p.y - yc, p.z), x: p.x })).sort((a, b) => a.fi - b.fi);
  const Lb = 1.2 * Math.sqrt(Math.max(0.01, q.areaBase)), Lmax = Lb + 2.5;
  /** Size of the wake section relative to the separation loop, d metres behind it. */
  const f = (d: number) => d < Lb ? 1 - 0.2 * Math.sin(Math.PI / 2 * d / Lb) : 0.8 + 0.08 * (d - Lb);
  const en = (fi: number) => {
    const n = polar.length; let k = 0;
    while (k < n && polar[k].fi < fi) k++;
    const a = polar[(k - 1 + n) % n], b = polar[k % n];
    let da = b.fi - a.fi; if (da <= 0) da += 2 * Math.PI;
    let t = fi - a.fi; if (t < 0) t += 2 * Math.PI;
    const u = Math.min(1, Math.max(0, t / da));
    return { r: a.r + (b.r - a.r) * u, x: a.x + (b.x - a.x) * u };
  };
  /** How deep in the wake (0 outside, else 1 at the base fading to 0 at Lmax). */
  const dentro = (x: number, y: number, z: number) => {
    const fi = Math.atan2(y - yc, z), r = Math.hypot(y - yc, z), e = en(fi), d = e.x - x;
    if (d < 0.02 || d > Lmax || e.r < 0.015) return 0;
    return r < e.r * f(d) ? 1 - d / Lmax : 0;
  };
  /** A point of the wake surface: ring point k, d metres behind the separation. */
  const superficie = (k: number, d: number): [number, number, number] => {
    const p = anillo[k], s = f(d);
    return [p.x - d, Math.max(0.005, yc + (p.y - yc) * s), p.z * s];
  };
  const Kh = anillo.length / 2;
  return { anillo, yc, Lb, Lmax, f, dentro, en, superficie, kArriba: Kh - 1, kLado: Kh >> 1, kLado2: anillo.length - 1 - (Kh >> 1) };
}

export const porVelocidad = (R: ResultadoTunel, kmh: number) => R.porVelocidad.find(v => v.kmh === kmh) ?? R.porVelocidad[1];

/** The points that get a label (and a row in the card), in the order they are laid out on screen. */
export function puntosDe(R: ResultadoTunel, kmh: number): PuntoTunel[] {
  const q = porVelocidad(R, kmh), K = q.separacion.length / 3, out: PuntoTunel[] = [];
  const lado = (p: number[]): [number, number, number] => [p[0], p[1], -Math.abs(p[2])];
  const en = (a: number[], k: number) => [a[3 * k], a[3 * k + 1], a[3 * k + 2]];
  let rango = 0;
  for (const k of R.criticos) {
    if (k.tipo === 'remanso') {
      out.push({ id: 'remanso', tipo: 'remanso', etiqueta: `Remanso · Cp ${fmt(k.cp)}`, ancla: lado(k.p), desplaza: [0.3, 0.3, -0.15], cp: k.cp, zona: k.zona, f: k.f, nombre: k.nombre });
      continue;
    }
    // behind the separation the real air has left: no ideal-flow peak there; the three strongest get a label
    if (k.p[0] < q.xSeparacion - 0.02 || rango >= 3) continue;
    // two peaks with the same name on one car (two places under the nose, say) are numbered, so neither label nor row is ambiguous
    const repetidos = out.filter(p => p.tipo === 'succion' && p.nombre?.startsWith(k.nombre)).length;
    const nombre = repetidos ? `${k.nombre} (${repetidos + 1})` : k.nombre;
    out.push({ id: `succion-${rango}`, tipo: 'succion', etiqueta: `${nombre} · Cp ${fmt(k.cp)}`, ancla: lado(k.p), desplaza: [0, 0.32 + 0.15 * rango, -0.3], cp: k.cp, zona: k.zona, f: k.f, nombre });
    rango++;
  }
  out.push({ id: 'adverso', tipo: 'adverso', etiqueta: 'El aire empieza a frenarse (gradiente adverso)', ancla: en(q.adverso, K - 1) as [number, number, number], desplaza: [-0.55, 0.22, -0.15] });
  out.push({ id: 'separacion', tipo: 'separacion', etiqueta: q.pegadas === K ? 'Pegado hasta la cola' : 'Separación prevista', ancla: lado(en(q.separacion, K >> 1)), desplaza: [0.15, -0.38, -0.35] });
  const E = modeloEstela(q), pasos = 18, sBurb = Math.max(1, Math.round(E.Lb / E.Lmax * pasos));
  out.push({ id: 'estela', tipo: 'estela', etiqueta: q.areaBase < 0.02 ? 'Estela muy pequeña (forma estimada)' : 'Estela (forma estimada)', ancla: E.superficie(E.kLado2, E.Lmax * Math.min(pasos, sBurb + 3) / pasos), desplaza: [-0.3, 0.45, -0.2] });
  if (q.burbujas.length) out.push({ id: 'burbuja', tipo: 'burbuja', etiqueta: 'Burbuja: se despega y vuelve', ancla: lado(q.burbujas.slice(0, 3)), desplaza: [0.1, 0.25, -0.25] });
  return out;
}
