// The artistic view of the consciousness map: the same theory told without a
// single word (2026-11-11, Eugenio: «hazlo mucho más artístico sin nada de texto,
// pero con símbolos, arte para que la gente lo entienda sin el lenguaje»).
//
// It is a fixed picture, not the editable map. Person 1 (magenta) on the left,
// person 2 (orange) on the right, the lattice in the centre, and three lanes,
// top to bottom (order set by Eugenio on 2026-11-11: sun, lotus, moon —
// meditation sits between waking and sleep):
//   sun   — awake: a voice leaves the mouth as a code of shapes, the air of the
//           matrix vibrates, it reaches the ear and the other brain decodes it;
//   lotus — meditating: coherent waves and three beams of light — to the other
//           mind (telepathy, straight across), to a nearby object (extraocular
//           vision) and to a far landscape (remote vision);
//   moon  — asleep: both fields stretch out and merge in the hypercampo (∞),
//           and dream images travel both ways.
// The editable schema with words is one choice away in the «Vista» menu.
//
// No visible text on purpose. Screen readers get the description in a
// visually hidden paragraph and an aria-label per lane (aria-labels do not
// show a hover tooltip, unlike an SVG <title>).
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Cherry, Ear, Eye, Hand, Lightbulb, MoveHorizontal, Wind } from 'lucide-react';
import { cn } from '../../utils/cn';
import { TINTES, type Canal, type MapaConciencia } from '../../data/concienciaMapa';
import { aleatorio, type Punto } from './geometria';
import { CABEZA } from './MapaSintergico';

const { ORO, VIOLETA, AZUL, TURQUESA, ROSA, CORAL, LUZ } = TINTES;
// Night-sky paint, the same as the schema's. Artwork, not interface chrome.
const NOCHE = '#070b1f';
const TINTA = '#0b1030';
const BLANCO = '#ffffff';
const COLORES = [ORO, VIOLETA, AZUL, TURQUESA, ROSA, CORAL, LUZ];
const idc = (c: string) => c.replace('#', '');

// ── Layout (world units; the drawing is 1800 × 1000) ─────────────────────────
const W = 1800, H = 1000;
const S = 1.55;                                   // head scale
const P1 = { x: 190, y: 500 }, P2 = { x: 1610, y: 500 };
const MZ = { x: 900, y: 500, rx: 235, ry: 462 };  // the matrix
const Y: Record<Canal, number> = { vigilia: 215, meditacion: 515, onirico: 815 };
const SOBRE = 88;                                 // medallion above its lane's flow

/** A point of a head (mouth, ear, brain) in world units; offsets from MapaSintergico's profile. */
const en = (p: Punto, espejo: boolean, dx: number, dy: number): Punto => ({ x: p.x + (espejo ? -dx : dx) * S, y: p.y + dy * S });
const BOCA_1 = en(P1, false, 62, 20);
const CEREBRO_1 = en(P1, false, 6, -28);
const OIDO_2 = en(P2, true, 2, -2);
const CEREBRO_2 = en(P2, true, 6, -28);

const f = (n: number) => n.toFixed(1);

function seno(x0: number, x1: number, y: number, amp: number, onda: number) {
  const pts: string[] = [];
  for (let x = x0; x <= x1; x += 4) pts.push(`${x},${f(y + amp * Math.sin(((x - x0) / onda) * 2 * Math.PI))}`);
  return 'M' + pts.join(' L');
}

/** The lemniscate (∞) centred on (cx, cy). */
function lemniscata(cx: number, cy: number, a: number) {
  const pts: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const t = (i / 120) * 2 * Math.PI;
    const d = 1 + Math.sin(t) ** 2;
    pts.push(`${f(cx + (a * Math.cos(t)) / d)},${f(cy + (a * Math.sin(t) * Math.cos(t)) / d)}`);
  }
  return 'M' + pts.join(' L') + ' Z';
}

/** A pill-shaped speech bubble with its tail at the bottom, on one side. */
function bocadillo(cx: number, cy: number, w: number, h: number, lado: 'izq' | 'der') {
  const r = h / 2, x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  const cola = lado === 'izq'
    ? `H${x0 + r + 26} L${x0 + r - 22},${y1 + 26} L${x0 + r + 6},${y1}`
    : `H${x1 - r - 6} L${x1 - r + 22},${y1 + 26} L${x1 - r - 26},${y1}`;
  return `M${x0 + r},${y0} H${x1 - r} A${r},${r} 0 0 1 ${x1 - r},${y1} ${cola} H${x0 + r} A${r},${r} 0 0 1 ${x0 + r},${y0} Z`;
}

const estrella = (r: number) => `M0,${-r} L${r * 0.22},${-r * 0.22} L${r},0 L${r * 0.22},${r * 0.22} L0,${r} L${-r * 0.22},${r * 0.22} L${-r},0 L${-r * 0.22},${-r * 0.22} Z`;

// ── Small pieces ─────────────────────────────────────────────────────────────

/** A beam of light along a path: a soft glow and a flowing dashed core. */
function Haz({ d, color, ancho = 2.2, punteado = false, glow = 12 }: { d: string; color: string; ancho?: number; punteado?: boolean; glow?: number }) {
  return (
    <g>
      <path d={d} stroke={color} strokeOpacity={0.22} strokeWidth={glow} fill="none" strokeLinecap="round" filter="url(#va-difuso)" />
      <path d={d} stroke={color} strokeOpacity={0.85} strokeWidth={ancho} fill="none" strokeLinecap="round" strokeDasharray={punteado ? '2 10' : '14 10'} className="va-flujo" />
    </g>
  );
}

/** Glowing particles travelling along a path, staggered. */
function Chispas({ d, color, n = 3, dur = 3, r = 5, alReves = false }: { d: string; color: string; n?: number; dur?: number; r?: number; alReves?: boolean }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          <circle r={r * 2.8} fill={`url(#va-rg-${idc(color)})`} />
          <circle r={r} fill={BLANCO} />
          <animateMotion path={d} dur={`${dur}s`} begin={`${(-i * dur) / n}s`} repeatCount="indefinite"
            {...(alReves ? { keyPoints: '1;0', keyTimes: '0;1', calcMode: 'linear' } : {})} />
        </g>
      ))}
    </g>
  );
}

/** Rings that spread from a point and fade: the matrix vibrating. */
function Ondas({ x, y, color, rx = 150, ry = 70, dur = 3.6, n = 3 }: { x: number; y: number; color: string; rx?: number; ry?: number; dur?: number; n?: number }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <ellipse key={i} cx={x} cy={y} rx={8} ry={8 * (ry / rx)} fill="none" stroke={color} strokeWidth={1.6} strokeOpacity={0}>
          <animate attributeName="rx" from={8} to={rx} dur={`${dur}s`} begin={`${(-i * dur) / n}s`} repeatCount="indefinite" />
          <animate attributeName="ry" from={8 * (ry / rx)} to={ry} dur={`${dur}s`} begin={`${(-i * dur) / n}s`} repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.8;0" dur={`${dur}s`} begin={`${(-i * dur) / n}s`} repeatCount="indefinite" />
        </ellipse>
      ))}
    </g>
  );
}

/** The code of a language: three shapes that light up in turn. */
function Codigo({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  const formas = [
    <circle r={10} />,
    <path d="M0,-11 L11,8 H-11 Z" />,
    <rect x={-9} y={-9} width={18} height={18} rx={2} />,
  ];
  return (
    <g fill="none" stroke={color} strokeWidth={2.6} strokeLinejoin="round">
      {formas.map((forma, i) => (
        <g key={i} transform={`translate(${cx + (i - 1) * 34},${cy})`} opacity={0.4}>
          {forma}
          <animate attributeName="opacity" values="0.35;1;0.35" dur="2.4s" begin={`${-2.4 + i * 0.8}s`} repeatCount="indefinite" />
        </g>
      ))}
    </g>
  );
}

function Medallon({ x, y, color, children }: { x: number; y: number; color: string; children: ReactNode }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={82} fill={`url(#va-rg-${idc(color)})`} opacity={0.32} className="va-latido" />
      <circle r={46} fill={TINTA} opacity={0.88} />
      <circle r={46} fill="none" stroke={color} strokeOpacity={0.85} strokeWidth={1.6} />
      <circle r={53} fill="none" stroke={color} strokeOpacity={0.35} strokeDasharray="2 6" className="va-giro" />
      {children}
    </g>
  );
}

/** A lucide icon centred on (x, y) inside the drawing. */
function Icono({ I, x, y, tam, color, ancho = 1.8 }: { I: typeof Eye; x: number; y: number; tam: number; color: string; ancho?: number }) {
  return <I x={x - tam / 2} y={y - tam / 2} width={tam} height={tam} color={color} strokeWidth={ancho} aria-hidden />;
}

function Persona({ p, color, espejo }: { p: Punto; color: string; espejo?: boolean }) {
  const c = idc(color);
  return (
    <g transform={`translate(${p.x},${p.y})`} pointerEvents="none">
      <circle r={255} fill={`url(#va-rg-${c})`} opacity={0.2} className="va-respira" />
      {/* The neuronal field is a distortion of the lattice, so it is the same mesh. */}
      <g className="va-giro-lento"><circle r={196} fill={`url(#va-malla-${c})`} mask="url(#va-fundido)" /></g>
      <circle r={196} fill="none" stroke={color} strokeOpacity={0.35} strokeDasharray="2 10" className="va-giro" />
      <circle r={134} fill={TINTA} opacity={0.5} />
      <circle r={134} fill="none" stroke={color} strokeOpacity={0.6} strokeWidth={1.4} />
      <g transform={`scale(${espejo ? -S : S},${S})`}>
        <path d={CABEZA} fill={`url(#va-cabeza-${c})`} stroke={color} strokeWidth={1.6 / S} strokeOpacity={0.9} />
        <circle cx={6} cy={-28} r={32} fill={`url(#va-rg-${c})`} className="va-latido" />
        <circle cx={6} cy={-28} r={7} fill={LUZ} opacity={0.95} />
        {[[-14, -38], [24, -44], [-6, -6], [22, -14], [-22, -18]].map(([px, py], i) => (
          <g key={i}>
            <line x1={6} y1={-28} x2={px} y2={py} stroke={LUZ} strokeOpacity={0.35} strokeWidth={0.8 / S} />
            <circle cx={px} cy={py} r={2.4} fill={LUZ} opacity={0.75} />
          </g>
        ))}
      </g>
    </g>
  );
}

// ── The three lanes ──────────────────────────────────────────────────────────

/** Awake: voice → a code of shapes → the air vibrates → the ear → the other brain lights up. */
function Vigilia() {
  const y = Y.vigilia;
  const dBoca = `M${f(BOCA_1.x)},${f(BOCA_1.y)} C320,440 360,320 432,268`;
  const dOido = `M1392,266 C1470,300 1550,380 ${f(OIDO_2.x)},${f(OIDO_2.y - 8)}`;
  const sentidos = [Eye, Ear, Hand, Wind, Cherry];
  return (
    <g>
      <Haz d={dBoca} color={ORO} punteado />
      <Chispas d={dBoca} color={ORO} n={2} dur={2.4} r={3.5} />

      {/* The voice leaves as a code of shapes */}
      <path d={bocadillo(480, 205, 124, 72, 'izq')} fill={TINTA} fillOpacity={0.9} stroke={ORO} strokeOpacity={0.8} strokeWidth={1.6} />
      <Codigo cx={480} cy={205} color={ORO} />

      {/* Sound: arcs that travel to the other side */}
      {Array.from({ length: 6 }, (_, i) => (
        <path key={i} d="M0,-26 Q18,0 0,26 M-13,-16 Q-2,0 -13,16" stroke={ORO} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0}>
          <animateMotion path={`M572,${y} H1230`} dur="4.2s" begin={`${-i * 0.7}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;0.8;0.8;0" keyTimes="0;0.08;0.5;0.9;1" dur="4.2s" begin={`${-i * 0.7}s`} repeatCount="indefinite" />
        </path>
      ))}

      {/* The air of the matrix: particles pushed and released, a wave of pressure */}
      {[-20, 0, 20].map((dy, fila) => Array.from({ length: 23 }, (_, i) => {
        const x = 724 + i * 16;
        return (
          <circle key={`${fila}-${i}`} cx={x} cy={y + dy} r={2.6} fill={LUZ} opacity={0.7}>
            <animate attributeName="cx" values={`${x - 6};${x + 6};${x - 6}`} dur="1.4s" begin={`${-((23 - i) * 0.09 + fila * 0.05)}s`} repeatCount="indefinite" />
          </circle>
        );
      }))}
      <Ondas x={900} y={y} color={ORO} rx={190} ry={60} dur={4.2} />

      {/* The ear receives */}
      <circle cx={1268} cy={y} r={34} fill={`url(#va-rg-${idc(ORO)})`} opacity={0.5} className="va-latido" />
      <Icono I={Ear} x={1268} y={y} tam={50} color={LUZ} ancho={1.6} />

      {/* …and the brain decodes: the shapes become light */}
      <path d={bocadillo(1350, 205, 112, 72, 'der')} fill={TINTA} fillOpacity={0.9} stroke={ORO} strokeOpacity={0.8} strokeWidth={1.6} />
      <g>
        <g transform="translate(1350,205) scale(0.8) translate(-1350,-205)"><Codigo cx={1350} cy={205} color={ORO} /></g>
        <animate attributeName="opacity" values="1;1;0;0;1" keyTimes="0;0.35;0.5;0.88;1" dur="4.2s" repeatCount="indefinite" />
      </g>
      <g transform="translate(1350,205)" opacity={0}>
        <circle r={30} fill={`url(#va-rg-${idc(LUZ)})`} />
        <path d={estrella(22)} fill={LUZ} />
        <circle r={5} fill={BLANCO} />
        <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.35;0.5;0.88;1" dur="4.2s" repeatCount="indefinite" />
      </g>
      <Haz d={dOido} color={ORO} punteado />
      <Chispas d={dOido} color={ORO} n={2} dur={2.4} r={3.5} />
      <circle cx={CEREBRO_2.x} cy={CEREBRO_2.y} r={38} fill={`url(#va-rg-${idc(ORO)})`} className="va-latido" style={{ animationDelay: '-1.2s' }} />

      {/* Sun: awake, with the five senses around it */}
      <Medallon x={900} y={y - SOBRE} color={ORO}>
        <g className="va-giro-sol">
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1={0} y1={-21} x2={0} y2={i % 2 ? -29 : -35} stroke={ORO} strokeWidth={2.4} strokeLinecap="round" transform={`rotate(${i * 30})`} />
          ))}
        </g>
        <circle r={22} fill={`url(#va-rg-${idc(LUZ)})`} />
        <circle r={15} fill={ORO} />
        {sentidos.map((I, i) => {
          const a = ((-150 + i * 30) * Math.PI) / 180;
          const x = Math.cos(a) * 78, yy = Math.sin(a) * 78;
          return (
            <g key={i}>
              <circle cx={x} cy={yy} r={15} fill={TINTA} stroke={ORO} strokeOpacity={0.55} />
              <Icono I={I} x={x} y={yy} tam={17} color={LUZ} ancho={2} />
            </g>
          );
        })}
      </Medallon>
    </g>
  );
}

/** Asleep: both fields stretch out and merge in the hypercampo; dreams travel both ways. */
function Onirico() {
  const y = Y.onirico;
  const d1 = `M${f(CEREBRO_1.x)},${f(CEREBRO_1.y)} C230,640 330,${y} 450,${y}`;
  const d2 = `M${f(CEREBRO_2.x)},${f(CEREBRO_2.y)} C1570,640 1470,${y} 1350,${y}`;
  const inf = lemniscata(900, y, 100);
  const suenos: { forma: ReactNode; color: string }[] = [
    { forma: <path d={estrella(7)} fill={LUZ} />, color: LUZ },
    { forma: <path d="M-9,0 Q-4.5,-7 0,0 Q4.5,-7 9,0" fill="none" stroke={LUZ} strokeWidth={1.8} strokeLinecap="round" />, color: LUZ },
    { forma: <circle r={4.5} fill={ROSA} />, color: ROSA },
    { forma: <path d="M0,0 C3,-3 6,1 3,5 C-1,9 -8,4 -6,-2 C-4,-9 6,-10 9,-3" fill="none" stroke={AZUL} strokeWidth={1.8} strokeLinecap="round" />, color: AZUL },
    { forma: <path d="M0,-6 L6,5 H-6 Z" fill={CORAL} />, color: CORAL },
    { forma: <path d={estrella(5)} fill={BLANCO} />, color: BLANCO },
  ];
  return (
    <g>
      <Haz d={d1} color={ROSA} />
      <Haz d={d2} color={CORAL} />

      {/* Each dreamer's field reaches out across the matrix… */}
      <g className="va-respira-x" style={{ transformOrigin: `440px ${y}px` }}>
        <ellipse cx={690} cy={y} rx={250} ry={80} fill={`url(#va-malla-${idc(ROSA)})`} mask="url(#va-fundido)" />
        <ellipse cx={690} cy={y} rx={250} ry={80} fill={`url(#va-rg-${idc(ROSA)})`} opacity={0.2} />
      </g>
      <g className="va-respira-x" style={{ transformOrigin: `1360px ${y}px`, animationDelay: '-3s' }}>
        <ellipse cx={1110} cy={y} rx={250} ry={80} fill={`url(#va-malla-${idc(CORAL)})`} mask="url(#va-fundido)" />
        <ellipse cx={1110} cy={y} rx={250} ry={80} fill={`url(#va-rg-${idc(CORAL)})`} opacity={0.2} />
      </g>

      {/* …and where they meet, the hypercampo: ∞ */}
      <ellipse cx={900} cy={y} rx={150} ry={86} fill={`url(#va-rg-${idc(LUZ)})`} opacity={0.5} className="va-latido" />
      <ellipse cx={900} cy={y} rx={110} ry={60} fill={`url(#va-malla-${idc(LUZ)})`} mask="url(#va-fundido)" opacity={0.7} />
      <path d={inf} stroke={AZUL} strokeOpacity={0.5} strokeWidth={14} fill="none" filter="url(#va-difuso)" />
      <path d={inf} stroke={LUZ} strokeWidth={2.6} fill="none" />
      <Chispas d={inf} color={ROSA} n={1} dur={5} r={4.5} />
      <Chispas d={inf} color={CORAL} n={1} dur={5} r={4.5} alReves />

      {/* Dream images drift to both sleepers */}
      {[-1, 1].map(lado => suenos.map((s, i) => {
        const dur = 7;
        const empieza = -(i * dur) / suenos.length - (lado > 0 ? dur / 12 : 0);
        const camino = `M0,0 C${lado * 80},${-34 + i * 4} ${lado * 180},${30 - i * 9} ${lado * 300},${-12 + i * 5}`;
        return (
          <g key={`${lado}-${i}`} transform={`translate(${900 + lado * 40},${y + (i % 3 - 1) * 16})`}>
            <g opacity={0}>
              {s.forma}
              <animateMotion path={camino} dur={`${dur}s`} begin={`${empieza}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.75;1" dur={`${dur}s`} begin={`${empieza}s`} repeatCount="indefinite" />
            </g>
          </g>
        );
      }))}

      {/* Moon: asleep */}
      <Medallon x={900} y={y - SOBRE} color={AZUL}>
        <circle r={20} fill={LUZ} mask="url(#va-luna)" />
        {[[-24, -16, 5], [22, 12, 4], [-18, 20, 3]].map(([x, yy, r], i) => (
          <path key={i} d={estrella(r)} transform={`translate(${x},${yy})`} fill={LUZ}>
            <animate attributeName="opacity" values="0.3;1;0.3" dur="3s" begin={`${-i}s`} repeatCount="indefinite" />
          </path>
        ))}
      </Medallon>
    </g>
  );
}

/** Meditating: coherent waves, and three beams of direct perception. */
function Meditacion() {
  const y = Y.meditacion;
  const d1 = `M${f(CEREBRO_1.x)},${f(CEREBRO_1.y)} C290,440 360,${y} 440,${y}`;
  // In the middle lane the two brains are level: telepathy goes straight across.
  const telepatia = `M930,${y} C1130,${y - 8} 1400,${y - 36} ${f(CEREBRO_2.x - 6)},${f(CEREBRO_2.y + 10)}`;
  const OBJ = { x: 1250, y: y + 85 }, LEJOS = { x: 1675, y: y + 268 };
  const extraocular = `M930,${y + 5} C1030,${y + 20} 1120,${y + 72} ${OBJ.x - 42},${OBJ.y}`;
  const remota = `M930,${y + 10} C1150,${y + 92} 1420,${y + 292} ${LEJOS.x - 78},${LEJOS.y + 4}`;
  return (
    <g>
      <Haz d={d1} color={VIOLETA} />
      <Chispas d={d1} color={VIOLETA} n={2} dur={2.6} r={3.5} />

      {/* Coherence: three waves in step */}
      <g clipPath="url(#va-recorte-coherencia)">
        <g>
          {[-24, 0, 24].map((dy, i) => (
            <path key={i} d={seno(376, 860, y + dy, 11, 64)} stroke={i === 1 ? LUZ : VIOLETA} strokeOpacity={i === 1 ? 0.9 : 0.6} strokeWidth={i === 1 ? 2.4 : 1.8} fill="none" />
          ))}
          <animateTransform attributeName="transform" type="translate" from="0 0" to="64 0" dur="2.2s" repeatCount="indefinite" />
        </g>
      </g>

      {/* The point of stillness in the matrix */}
      <Ondas x={900} y={y} color={VIOLETA} rx={160} ry={72} dur={4.5} />
      <circle cx={900} cy={y} r={40} fill={`url(#va-rg-${idc(LUZ)})`} className="va-latido" />
      <path d={estrella(13)} transform={`translate(900,${y})`} fill={BLANCO} />

      {/* Telepathy: to the other mind */}
      <Haz d={telepatia} color={VIOLETA} />
      <Chispas d={telepatia} color={VIOLETA} n={3} dur={3.4} r={4} />
      <circle cx={CEREBRO_2.x} cy={CEREBRO_2.y} r={44} fill={`url(#va-rg-${idc(VIOLETA)})`} className="va-latido" style={{ animationDelay: '-2.2s' }} />

      {/* Extraocular vision: a hand that sees, and an object it perceives */}
      <Haz d={extraocular} color={VIOLETA} />
      <Chispas d={extraocular} color={VIOLETA} n={2} dur={2.4} r={3.5} />
      <g transform={`translate(${OBJ.x},${OBJ.y})`}>
        <rect x={-38} y={-30} width={76} height={60} rx={7} fill={TINTA} stroke={VIOLETA} strokeOpacity={0.85} strokeWidth={1.6} />
        <g>
          <circle cx={13} cy={-10} r={7} fill={LUZ} />
          <path d="M-28,22 L-6,-6 L6,8 L14,0 L30,22 Z" fill={VIOLETA} />
          <animate attributeName="opacity" values="0.35;1;0.35" dur="2.4s" repeatCount="indefinite" />
        </g>
      </g>
      <g transform={`translate(${OBJ.x - 70},${OBJ.y + 16}) scale(1.35)`}>
        <Hand x={-12} y={-12} width={24} height={24} color={LUZ} strokeWidth={1.6} aria-hidden />
        <path d="M-3.4,3 Q1,0 5.4,3 Q1,6 -3.4,3 Z" fill={TINTA} stroke={LUZ} strokeWidth={0.8} />
        <circle cx={1} cy={3} r={1.2} fill={LUZ} />
      </g>

      {/* Remote vision: a landscape far away */}
      <Haz d={remota} color={VIOLETA} punteado />
      <Chispas d={remota} color={VIOLETA} n={3} dur={4.4} r={3} />
      <g transform={`translate(${LEJOS.x},${LEJOS.y})`}>
        <ellipse rx={110} ry={50} fill={`url(#va-rg-${idc(VIOLETA)})`} opacity={0.45} className="va-latido" style={{ animationDelay: '-1s' }} />
        <line x1={-100} y1={30} x2={100} y2={30} stroke={VIOLETA} strokeOpacity={0.4} />
        <path d="M-90,30 L-52,-12 L-34,6 L-2,-36 L28,2 L46,-12 L90,30 Z" fill="url(#va-montana)" stroke={VIOLETA} strokeOpacity={0.7} strokeWidth={1.4} strokeLinejoin="round" />
        <path d="M-2,-36 L-12,-22 L-4,-25 L3,-20 L9,-27 Z" fill={LUZ} opacity={0.85} />
        <circle cx={52} cy={-34} r={7} fill={LUZ} opacity={0.9} />
      </g>

      {/* Lotus: meditating */}
      <Medallon x={900} y={y - SOBRE} color={VIOLETA}>
        {[-64, -32, 0, 32, 64].map(a => (
          <path key={a} d="M0,10 C-9,0 -8,-16 0,-26 C8,-16 9,0 0,10 Z" transform={`rotate(${a} 0 10)`}
            fill="url(#va-petalo)" stroke={LUZ} strokeOpacity={0.6} strokeWidth={0.9} />
        ))}
        <path d="M-24,13 Q0,24 24,13" stroke={VIOLETA} strokeWidth={2} fill="none" strokeLinecap="round" />
        <circle cy={-32} r={4} fill={BLANCO}>
          <animate attributeName="opacity" values="0.3;1;0.3" dur="3.2s" repeatCount="indefinite" />
        </circle>
      </Medallon>
    </g>
  );
}

// ── The picture ──────────────────────────────────────────────────────────────

const CARRILES: { canal: Canal; color: string; alto: number; nombre: string; Dibujo: typeof Vigilia }[] = [
  { canal: 'vigilia', color: ORO, alto: 210, nombre: 'Despiertos: por los sentidos', Dibujo: Vigilia },
  { canal: 'meditacion', color: VIOLETA, alto: 240, nombre: 'Meditando: percepción directa', Dibujo: Meditacion },
  { canal: 'onirico', color: AZUL, alto: 210, nombre: 'Dormidos: por el hipercampo', Dibujo: Onirico },
];

export function VistaArtistica({ mapa, foco, onFoco, onClaves, className }: {
  mapa: MapaConciencia;
  foco: Canal | null;
  onFoco(c: Canal | null): void;
  onClaves(id: string): void;
  className?: string;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [tam, setTam] = useState<{ w: number; h: number } | null>(null);
  const [pista, setPista] = useState(true);

  useLayoutEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medir = () => setTam({ w: el.clientWidth, h: el.clientHeight });
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) svg.current?.pauseAnimations(); } catch { /* old browser */ }
  }, []);

  const estrellas = useMemo(() => {
    const r = aleatorio(1934);
    return Array.from({ length: 190 }, () => ({
      x: -700 + r() * (W + 1400), y: -300 + r() * (H + 600),
      r: 0.4 + r() * 1.5, o: 0.15 + r() * 0.7, t: r() < 0.25, d: r() * 6,
    }));
  }, []);

  // On a tall screen the picture keeps the full height and scrolls sideways,
  // from person 1 to person 2, like a scroll painting.
  const estrecha = !!tam && tam.h > 0 && tam.w / tam.h < 1.3;
  const tamSvg = estrecha && tam ? { width: Math.round(tam.h * 1.8), height: tam.h } : { width: '100%', height: '100%' };

  const conClaves = (c: Canal) => mapa.nodos.some(n => n.id === `claves-${c}` && (n.consejos ?? []).some(t => t.trim()));
  const atenuado = (c: Canal) => (foco && foco !== c ? 0.14 : 1);
  const pulsar = (c: Canal) => onFoco(foco === c ? null : c);
  const tecla = (c: Canal) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pulsar(c); }
  };

  return (
    <div className={cn('relative', className)}>
      <p className="sr-only">
        Dibujo sin palabras de la teoría sintérgica. A la izquierda, una persona (magenta); a la derecha, otra (naranja); en el centro,
        la matriz del universo. Arriba, con el sol, despiertos: la voz sale de la boca como un código de formas, hace vibrar el aire de
        la matriz, llega al oído y el otro cerebro la descifra. En medio, con el loto, meditando: ondas coherentes y tres rayos de luz: a
        la mente del otro (telepatía), a un objeto cercano (visión extraocular) y a un paisaje lejano (visión remota). Abajo, con la luna,
        dormidos: los dos campos se extienden y se unen en el hipercampo (∞) y las imágenes de los sueños viajan en los dos sentidos.
      </p>
      <div
        ref={caja}
        className={cn('h-full w-full overflow-y-hidden [scrollbar-width:thin]', estrecha ? 'overflow-x-auto' : 'overflow-x-hidden')}
        onScroll={() => setPista(false)}
      >
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ ...tamSvg, display: 'block' }}
          role="group"
          aria-label="Las tres maneras en que se comunican dos seres conscientes, sin palabras"
        >
          <style>{`
            @keyframes va-respira { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
            @keyframes va-respira-x { 0%,100% { transform: scaleX(.9); } 50% { transform: scaleX(1.05); } }
            @keyframes va-latido { 0%,100% { opacity: .45; } 50% { opacity: 1; } }
            @keyframes va-giro { to { transform: rotate(360deg); } }
            @keyframes va-flujo { to { stroke-dashoffset: -48; } }
            .va-respira { transform-box: fill-box; transform-origin: center; animation: va-respira 6s ease-in-out infinite; }
            .va-respira-x { transform-box: view-box; animation: va-respira-x 6s ease-in-out infinite; }
            .va-latido { animation: va-latido 4.5s ease-in-out infinite; }
            .va-giro { transform-box: fill-box; transform-origin: center; animation: va-giro 60s linear infinite; }
            .va-giro-lento { transform-box: fill-box; transform-origin: center; animation: va-giro 180s linear infinite; }
            .va-giro-sol { transform-box: fill-box; transform-origin: center; animation: va-giro 40s linear infinite; }
            .va-flujo { animation: va-flujo 1.6s linear infinite; }
            [data-carril] { transition: opacity .5s ease; cursor: pointer; outline: none; }
            [data-carril]:focus-visible .va-borde { stroke-opacity: .9; }
            [data-claves] { cursor: pointer; outline: none; }
            [data-claves]:hover circle.va-boton, [data-claves]:focus-visible circle.va-boton { stroke-opacity: 1; fill-opacity: 1; }
            @media (prefers-reduced-motion: reduce) {
              .va-respira, .va-respira-x, .va-latido, .va-giro, .va-giro-lento, .va-giro-sol, .va-flujo { animation: none; }
            }
          `}</style>
          <defs>
            <radialGradient id="va-cielo" gradientUnits="userSpaceOnUse" cx={900} cy={560} r={1150}>
              <stop offset="0%" stopColor="#1a1450" />
              <stop offset="50%" stopColor="#0b1033" />
              <stop offset="100%" stopColor={NOCHE} />
            </radialGradient>
            <radialGradient id="va-fundido-grad">
              <stop offset="0%" stopColor={BLANCO} stopOpacity={1} />
              <stop offset="55%" stopColor={BLANCO} stopOpacity={0.75} />
              <stop offset="100%" stopColor={BLANCO} stopOpacity={0} />
            </radialGradient>
            <mask id="va-fundido" maskContentUnits="objectBoundingBox">
              <rect width="1" height="1" fill="url(#va-fundido-grad)" />
            </mask>
            <mask id="va-luna" maskUnits="userSpaceOnUse" x={-30} y={-30} width={60} height={60}>
              <circle r={20} fill={BLANCO} />
              <circle cx={9} cy={-7} r={17} fill="#000" />
            </mask>
            <filter id="va-difuso" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
            <clipPath id="va-clip-matriz"><ellipse rx={MZ.rx} ry={MZ.ry} /></clipPath>
            <clipPath id="va-recorte-coherencia"><rect x={440} y={Y.meditacion - 46} width={390} height={92} rx={40} /></clipPath>
            <linearGradient id="va-montana" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={VIOLETA} stopOpacity={0.75} />
              <stop offset="100%" stopColor={TINTA} stopOpacity={0.9} />
            </linearGradient>
            <linearGradient id="va-petalo" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={LUZ} stopOpacity={0.95} />
              <stop offset="100%" stopColor={VIOLETA} stopOpacity={0.8} />
            </linearGradient>
            {COLORES.map(col => {
              const c = idc(col);
              return (
                <g key={c}>
                  <radialGradient id={`va-rg-${c}`}>
                    <stop offset="0%" stopColor={col} stopOpacity={0.85} />
                    <stop offset="45%" stopColor={col} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={col} stopOpacity={0} />
                  </radialGradient>
                  <radialGradient id={`va-halo-${c}`}>
                    <stop offset="0%" stopColor={col} stopOpacity={0.22} />
                    <stop offset="70%" stopColor={col} stopOpacity={0.06} />
                    <stop offset="100%" stopColor={col} stopOpacity={0} />
                  </radialGradient>
                  <linearGradient id={`va-cabeza-${c}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={col} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={col} stopOpacity={0.12} />
                  </linearGradient>
                  <linearGradient id={`va-banda-${c}`} x1="0" x2="1">
                    <stop offset="0%" stopColor={col} stopOpacity={0} />
                    <stop offset="14%" stopColor={col} stopOpacity={0.12} />
                    <stop offset="50%" stopColor={col} stopOpacity={0.2} />
                    <stop offset="86%" stopColor={col} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={col} stopOpacity={0} />
                  </linearGradient>
                  <pattern id={`va-red-${c}`} width="40" height="69.28" patternUnits="userSpaceOnUse">
                    <path d="M0,0 H40 M0,34.64 H40 M0,69.28 H40 M0,0 L20,34.64 L40,0 M0,69.28 L20,34.64 L40,69.28" stroke={col} strokeOpacity={0.45} strokeWidth={0.7} fill="none" />
                    {[[0, 0], [40, 0], [20, 34.64], [0, 69.28], [40, 69.28]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.7} fill={col} opacity={0.9} />)}
                  </pattern>
                  <pattern id={`va-malla-${c}`} width="24" height="41.57" patternUnits="userSpaceOnUse">
                    <path d="M0,0 H24 M0,20.78 H24 M0,41.57 H24 M0,0 L12,20.78 L24,0 M0,41.57 L12,20.78 L24,41.57" stroke={col} strokeOpacity={0.8} strokeWidth={0.8} fill="none" />
                    {[[0, 0], [24, 0], [12, 20.78], [0, 41.57], [24, 41.57]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.5} fill={col} />)}
                  </pattern>
                </g>
              );
            })}
            <radialGradient id="va-red-mascara-grad" gradientUnits="userSpaceOnUse" cx={900} cy={540} r={1000}>
              <stop offset="0%" stopColor={BLANCO} stopOpacity={0.5} />
              <stop offset="60%" stopColor={BLANCO} stopOpacity={0.1} />
              <stop offset="100%" stopColor={BLANCO} stopOpacity={0.03} />
            </radialGradient>
            <mask id="va-red-mascara" maskUnits="userSpaceOnUse" x={-1200} y={-600} width={W + 2400} height={H + 1200}>
              <rect x={-1200} y={-600} width={W + 2400} height={H + 1200} fill="url(#va-red-mascara-grad)" />
            </mask>
          </defs>

          {/* Sky, stars, and the lattice under everything. Tapping the sky clears the focus. */}
          <rect x={-1200} y={-600} width={W + 2400} height={H + 1200} fill="url(#va-cielo)" onClick={() => onFoco(null)} />
          <rect x={-1200} y={-600} width={W + 2400} height={H + 1200} fill={`url(#va-red-${idc(TURQUESA)})`} mask="url(#va-red-mascara)" opacity={0.3} pointerEvents="none" />
          <g pointerEvents="none">
            {estrellas.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={BLANCO} opacity={s.o} className={s.t ? 'va-latido' : undefined} style={s.t ? { animationDelay: `-${s.d}s` } : undefined} />
            ))}
          </g>

          {/* The lanes' soft bands */}
          {CARRILES.map(({ canal, color, alto }) => (
            <g key={canal} data-carril-fondo style={{ opacity: atenuado(canal), transition: 'opacity .5s ease', cursor: 'pointer' }} onClick={() => pulsar(canal)}>
              <rect x={350} y={Y[canal] - alto / 2} width={1100} height={alto} rx={alto / 2} fill={`url(#va-banda-${idc(color)})`} />
            </g>
          ))}

          {/* The matrix */}
          <g transform={`translate(${MZ.x},${MZ.y})`} pointerEvents="none">
            <ellipse rx={MZ.rx * 1.5} ry={MZ.ry * 1.12} fill={`url(#va-halo-${idc(TURQUESA)})`} className="va-latido" />
            <ellipse rx={MZ.rx} ry={MZ.ry} fill={`url(#va-rg-${idc(TURQUESA)})`} opacity={0.3} />
            <g clipPath="url(#va-clip-matriz)">
              <rect x={-MZ.rx} y={-MZ.ry} width={MZ.rx * 2} height={MZ.ry * 2} fill={`url(#va-red-${idc(TURQUESA)})`} opacity={0.65}>
                <animate attributeName="opacity" values="0.45;0.8;0.45" dur="7s" repeatCount="indefinite" />
              </rect>
            </g>
            <ellipse rx={MZ.rx} ry={MZ.ry} fill="none" stroke={TURQUESA} strokeOpacity={0.6} strokeWidth={1.6} />
            <ellipse rx={MZ.rx * 0.74} ry={MZ.ry * 0.62} fill="none" stroke={TURQUESA} strokeOpacity={0.25} strokeDasharray="3 9" className="va-flujo" />
            <ellipse rx={MZ.rx * 0.44} ry={MZ.ry * 0.32} fill="none" stroke={TURQUESA} strokeOpacity={0.18} strokeDasharray="2 7" />
          </g>

          <Persona p={P1} color={ROSA} />
          <Persona p={P2} color={CORAL} espejo />

          {/* The three lanes: tap one to look at it alone */}
          {CARRILES.map(({ canal, color, nombre, Dibujo }) => (
            <g
              key={canal}
              data-carril={canal}
              role="button"
              tabIndex={0}
              aria-label={nombre}
              aria-pressed={foco === canal}
              style={{ opacity: atenuado(canal) }}
              onClick={() => pulsar(canal)}
              onKeyDown={tecla(canal)}
            >
              <rect className="va-borde" x={352} y={Y[canal] - 104} width={1096} height={208} rx={104} fill="none" stroke={color} strokeOpacity={foco === canal ? 0.45 : 0} strokeDasharray="2 8" />
              <Dibujo />
            </g>
          ))}

          {/* Five keys per lane: a bulb that opens them */}
          {CARRILES.filter(c => conClaves(c.canal)).map(({ canal, color }) => {
            const x = 1400, y = Y[canal] - 95;
            return (
              <g
                key={canal}
                data-claves={canal}
                role="button"
                tabIndex={0}
                aria-label="5 claves para comunicar mejor"
                style={{ opacity: atenuado(canal), transition: 'opacity .5s ease' }}
                onClick={e => { e.stopPropagation(); onClaves(`claves-${canal}`); }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClaves(`claves-${canal}`); } }}
              >
                <circle cx={x} cy={y} r={34} fill={`url(#va-rg-${idc(color)})`} opacity={0.4} className="va-latido" />
                <circle className="va-boton" cx={x} cy={y} r={21} fill={TINTA} fillOpacity={0.85} stroke={color} strokeOpacity={0.75} strokeWidth={1.6} />
                <Icono I={Lightbulb} x={x} y={y} tam={22} color={LUZ} />
              </g>
            );
          })}
        </svg>
      </div>

      {/* On a tall screen: a hand that says «slide sideways», until the first slide. */}
      {estrecha && pista && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/15 bg-slate-950/75 px-3 py-1.5 text-slate-100 backdrop-blur" aria-hidden>
          <style>{`@keyframes va-desliza { 0%,100% { transform: translateX(-6px); } 50% { transform: translateX(6px); } }`}</style>
          <Hand className="h-4 w-4" style={{ animation: 'va-desliza 1.6s ease-in-out infinite' }} />
          <MoveHorizontal className="h-4 w-4 opacity-70" />
        </div>
      )}
    </div>
  );
}
