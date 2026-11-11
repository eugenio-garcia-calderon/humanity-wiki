// A conscious being drawn whole: the body, its seven energy centres, the
// layers of its aura and the mesh of its neuronal field (2026-11-11, Eugenio:
// «que los seres humanos sean una silueta entera del ser humano con todos sus
// niveles energéticos, más que solamente la cabeza»). Shared by the schema and
// the picture, so both show the same person.
//
// The figure faces the viewer. It is drawn in a 700-unit frame centred on
// (0,0), from the crown (y −350) to the feet (y +350), and scaled to `alto`.
import type { Punto } from './geometria';

const BASE = 700;

/** The seven centres, root to crown, with their traditional colours. Artwork paint. */
export const CENTROS: { y: number; color: string }[] = [
  { y: 58, color: '#ff5c5c' },    // root
  { y: -28, color: '#ff9f45' },   // sacral
  { y: -100, color: '#ffd84d' },  // solar plexus
  { y: -165, color: '#6ee08a' },  // heart
  { y: -236, color: '#5ec8ff' },  // throat
  { y: -308, color: '#8a7dff' },  // third eye
  { y: -356, color: '#d39bff' },  // crown
];

/** Points of the body other drawings connect to, in the 700 frame; x is towards the side it faces. */
const PARTES = {
  corona: { x: 0, y: -356 },
  cerebro: { x: 0, y: -308 },
  boca: { x: 10, y: -272 },
  oido: { x: 40, y: -298 },
  corazon: { x: 0, y: -165 },
} as const;
export type Parte = keyof typeof PARTES;

/** Where a part of a being of height `alto` sits, relative to its centre. */
export function parteDelSer(parte: Parte, alto: number, espejo?: boolean): Punto {
  const k = alto / BASE, p = PARTES[parte];
  return { x: (espejo ? -p.x : p.x) * k, y: p.y * k };
}

// The right half of the silhouette, from under the chin down to the crotch, as
// cubic segments [c1x, c1y, c2x, c2y, x, y]. The left half is its mirror.
const INICIO: [number, number] = [15, -254];
const MITAD: number[][] = [
  [16, -248, 17, -241, 18, -234],    // neck
  [34, -226, 70, -228, 86, -214],    // shoulder slope
  [97, -205, 101, -192, 100, -176],  // shoulder
  [101, -140, 104, -110, 107, -80],  // upper arm, outside
  [111, -46, 116, -12, 118, 18],     // forearm, outside
  [122, 40, 128, 62, 122, 80],       // hand
  [116, 92, 102, 82, 103, 58],       // fingertips round to the palm side
  [104, 44, 104, 30, 103, 18],       // wrist, inside
  [100, -14, 94, -46, 90, -78],      // forearm, inside
  [86, -118, 76, -150, 64, -168],    // upper arm, inside, to the armpit
  [60, -130, 50, -100, 50, -62],     // ribs to waist
  [50, -24, 64, 0, 66, 30],          // waist to hip
  [68, 90, 58, 140, 52, 190],        // thigh to knee
  [52, 240, 44, 292, 38, 318],       // calf to ankle
  [44, 330, 58, 338, 56, 348],       // foot
  [50, 354, 22, 354, 14, 348],       // sole
  [12, 336, 14, 326, 14, 316],       // inner ankle
  [16, 280, 20, 232, 18, 190],       // inner calf to knee
  [16, 140, 10, 92, 0, 74],          // inner thigh to the crotch
];

function silueta() {
  const n = (v: number) => +v.toFixed(1);
  let d = `M${INICIO[0]},${INICIO[1]}`;
  for (const [a, b, c, e, x, y] of MITAD) d += ` C${a},${b} ${c},${e} ${x},${y}`;
  // Back up the left side: each segment reversed and mirrored.
  for (let i = MITAD.length - 1; i >= 0; i--) {
    const [a, b, c, e] = MITAD[i];
    const [px, py] = i > 0 ? MITAD[i - 1].slice(4) : INICIO;
    d += ` C${n(-c)},${e} ${n(-a)},${b} ${n(-px)},${py}`;
  }
  // The head: an ellipse resting on the neck.
  return d + ' Z M0,-346 A38,48 0 1 1 0,-250 A38,48 0 1 1 0,-346 Z';
}
export const CUERPO = silueta();

/**
 * The being, centred on (0,0), `alto` units tall.
 * `pre` is the id prefix of the drawing it lives in ('cz' for the schema,
 * 'va' for the picture), whose <defs> hold `<pre>-rg-<hex>`, `<pre>-cabeza-<hex>`
 * and `<pre>-malla-<hex>`, and whose CSS has `<pre>-latido` / `<pre>-respira`.
 * `capas`: 'todas' draws every aura layer and the mesh field around the body;
 * 'cuerpo' only the body, its glow and its centres (the schema draws the field).
 */
export function Ser({ alto, color, luz, pre, capas = 'todas' }: {
  alto: number; color: string; luz: string; pre: 'cz' | 'va'; capas?: 'todas' | 'cuerpo';
}) {
  const k = alto / BASE;
  const c = color.replace('#', '');
  const todas = capas === 'todas';
  const rc = todas ? 8 : 13;                          // centre radius, in the 700 frame
  const linea = (px: number) => px / k;               // a stroke of px screen units
  return (
    <g transform={`scale(${k})`}>
      {todas && (
        <g>
          {/* Aura, outside in: spiritual, mental, the neuronal field (a mesh, like the matrix), emotional */}
          <ellipse cy={-20} rx={196} ry={418} fill="none" stroke="#d39bff" strokeOpacity={0.22} strokeWidth={linea(1.4)} className={`${pre}-latido`} style={{ animationDelay: '-3s' }} />
          <ellipse cy={-20} rx={176} ry={400} fill="none" stroke={luz} strokeOpacity={0.3} strokeWidth={linea(1.2)} strokeDasharray={`${linea(3)} ${linea(9)}`} />
          <g className={`${pre}-respira`}>
            <ellipse cy={-20} rx={168} ry={392} fill={`url(#${pre}-malla-${c})`} mask={`url(#${pre}-fundido)`} opacity={0.85} />
          </g>
          <ellipse cy={-20} rx={150} ry={380} fill={`url(#${pre}-rg-${c})`} fillOpacity={0.3} className={`${pre}-latido`} />
          <ellipse cy={-20} rx={150} ry={380} fill="none" stroke={color} strokeOpacity={0.45} strokeWidth={linea(1.4)} />
        </g>
      )}
      {/* The etheric glow that hugs the body */}
      <path d={CUERPO} fill="none" stroke={color} strokeOpacity={0.1} strokeWidth={linea(todas ? 22 : 9)} strokeLinejoin="round" />
      <path d={CUERPO} fill="none" stroke={color} strokeOpacity={0.2} strokeWidth={linea(todas ? 10 : 4)} strokeLinejoin="round" />
      {/* The physical body */}
      <path d={CUERPO} fill={`url(#${pre}-cabeza-${c})`} stroke={color} strokeOpacity={0.95} strokeWidth={linea(1.6)} strokeLinejoin="round" />
      {/* The brain, where the neuronal field is born. (The pulse classes animate
          `opacity`, so pulsing shapes keep their faintness in fill-/stroke-opacity.) */}
      <circle cy={-300} r={46} fill={`url(#${pre}-rg-${c})`} fillOpacity={0.8} className={`${pre}-latido`} />
      {/* The channel that joins the centres, and the seven centres */}
      <line x1={0} y1={CENTROS[0].y} x2={0} y2={CENTROS[6].y} stroke={luz} strokeOpacity={0.35} strokeWidth={linea(todas ? 1.4 : 0.9)} />
      {CENTROS.map((ce, i) => (
        <g key={i} transform={`translate(0,${ce.y})`}>
          <circle r={rc * 2.6} fill={ce.color} fillOpacity={0.22} className={`${pre}-latido`} style={{ animationDelay: `${-i * 0.6}s` }} />
          <circle r={rc * 1.6} fill={ce.color} fillOpacity={0.35} />
          <circle r={rc} fill={ce.color} />
          <circle r={rc * 0.45} fill="#ffffff" opacity={0.9} />
        </g>
      ))}
    </g>
  );
}
