// The animated walkthroughs of the consciousness map («Ver cómo funciona»).
//
// Each channel (waking, dreaming, meditation) has four steps; the text of each
// step is in `RECORRIDOS` (src/data/concienciaMapa.ts) and the drawing is here.
// The drawing finds the concepts by id in the CURRENT map, so it follows them
// when someone moves them. If a concept is missing, that piece is not drawn.
//
// Motion uses SVG's own animation elements (<animate>, <animateMotion>): they
// run in every current browser, need no JavaScript timer, and also stop with
// `prefers-reduced-motion` through the `cz-animado` class below.
import type { ReactNode } from 'react';
import type { Canal, Nodo } from '../../data/concienciaMapa';
import { colorSeguro, FUENTE, type Medida, type Punto } from './geometria';

interface Ctx { porId: Map<string, Nodo>; medidas: Map<string, Medida> }

const BLANCO = '#ffffff';
const NOCHE = '#060a1c';
const idColor = (c: string) => colorSeguro(c).replace('#', '');

/** Where the mouth, the ear and the brain of a field's head are, in world units. */
function cabeza(n: Nodo, m: Medida, parte: 'boca' | 'oido' | 'cerebro'): Punto {
  const s = (m.r / 80) * 0.95;
  const lado = n.espejo ? -1 : 1;
  const p = parte === 'boca' ? { x: 62, y: 20 } : parte === 'oido' ? { x: 2, y: -2 } : { x: 6, y: -28 };
  return { x: n.x + lado * p.x * s, y: n.y + p.y * s };
}

const linea = (pts: Punto[]) => pts.length ? 'M' + pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L') : '';
const largo = (pts: Punto[]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0);

/** Glowing particles that travel along a path, staggered. */
function Viajeros({ pts, color, n = 3, r = 7, vel = 260 }: { pts: Punto[]; color: string; n?: number; r?: number; vel?: number }) {
  if (pts.length < 2) return null;
  const d = linea(pts);
  const dur = Math.max(1.6, largo(pts) / vel);
  return (
    <g className="cz-animado">
      <path d={d} stroke={color} strokeOpacity={0.35} strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#cz-desenfoque)" />
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          <circle r={r * 2.2} fill={`url(#cz-rg-${idColor(color)})`} />
          <circle r={r} fill={BLANCO} />
          <animateMotion path={d} dur={`${dur}s`} begin={`${(-i * dur) / n}s`} repeatCount="indefinite" />
        </g>
      ))}
    </g>
  );
}

/** Sound: arcs that travel along the path, turned to face where they go. */
function OndasDeSonido({ pts, color }: { pts: Punto[]; color: string }) {
  if (pts.length < 2) return null;
  const d = linea(pts);
  const dur = Math.max(2, largo(pts) / 230);
  const n = 7;
  return (
    <g className="cz-animado">
      <path d={d} stroke={color} strokeOpacity={0.18} strokeWidth={26} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          <path d="M-6,-16 Q8,0 -6,16" stroke={color} strokeWidth={3.2} fill="none" strokeLinecap="round" />
          <path d="M-14,-24 Q4,0 -14,24" stroke={color} strokeOpacity={0.55} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          <animateMotion path={d} dur={`${dur}s`} begin={`${(-i * dur) / n}s`} repeatCount="indefinite" rotate="auto" />
        </g>
      ))}
    </g>
  );
}

/** Air molecules squeezing and spreading: a compression wave, drawn as dots. */
function Aire({ centro, ancho, color }: { centro: Punto; ancho: number; color: string }) {
  const n = Math.max(10, Math.round(ancho / 16));
  return (
    <g className="cz-animado">
      {Array.from({ length: n }, (_, i) => {
        const x = centro.x - ancho / 2 + (i * ancho) / (n - 1);
        return [0, 1, 2].map(f => (
          <circle key={`${i}-${f}`} cx={x} cy={centro.y + (f - 1) * 12} r={2.6} fill={color} opacity={0.85}>
            <animate attributeName="cx" values={`${x - 6};${x + 6};${x - 6}`} dur="0.9s" begin={`${(-i * 0.9) / 8}s`} repeatCount="indefinite" />
          </circle>
        ));
      })}
      <text x={centro.x} y={centro.y + 34} fontSize={12} textAnchor="middle" fill={color} fontFamily={FUENTE} fontStyle="italic">compresión · expansión del aire</text>
    </g>
  );
}

/** Rings that grow from a point and fade. */
function Pulsos({ c, color, desde = 10, hasta = 120, dur = 2.4, n = 3, ancho = 2 }: { c: Punto; color: string; desde?: number; hasta?: number; dur?: number; n?: number; ancho?: number }) {
  return (
    <g className="cz-animado">
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={desde} fill="none" stroke={color} strokeWidth={ancho}>
          <animate attributeName="r" values={`${desde};${hasta}`} dur={`${dur}s`} begin={`${(-i * dur) / n}s`} repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.9;0" dur={`${dur}s`} begin={`${(-i * dur) / n}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
}

/** A field lighting up: its mesh, brighter, breathing. */
function CampoEncendido({ n, m, color, escala = 1.5 }: { n: Nodo; m: Medida; color: string; escala?: number }) {
  const c = idColor(color);
  return (
    <g className="cz-animado">
      <circle cx={n.x} cy={n.y} r={m.r * escala * 1.15} fill={`url(#cz-rg-${c})`}>
        <animate attributeName="opacity" values="0.35;0.85;0.35" dur="2.2s" repeatCount="indefinite" />
      </circle>
      <circle cx={n.x} cy={n.y} r={m.r * escala} fill={`url(#cz-malla-${c})`} mask="url(#cz-fundido)">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2.2s" repeatCount="indefinite" />
      </circle>
    </g>
  );
}

/** A speech or meaning bubble. */
function Bocadillo({ en, texto, sub, color, hacia = 'derecha' }: { en: Punto; texto: string; sub?: string; color: string; hacia?: 'derecha' | 'izquierda' }) {
  const w = Math.max(texto.length * 9.6, (sub?.length ?? 0) * 6.6) + 32;
  const h = sub ? 56 : 38;
  const x = hacia === 'derecha' ? en.x : en.x - w;
  return (
    <g className="cz-aparece">
      <rect x={x} y={en.y - h} width={w} height={h} rx={14} fill={NOCHE} fillOpacity={0.92} stroke={color} strokeWidth={1.6} />
      <path d={hacia === 'derecha' ? `M${x + 18},${en.y - 1} L${x + 8},${en.y + 14} L${x + 32},${en.y - 1}` : `M${x + w - 18},${en.y - 1} L${x + w - 8},${en.y + 14} L${x + w - 32},${en.y - 1}`} fill={NOCHE} stroke={color} strokeWidth={1.6} />
      <text x={x + w / 2} y={en.y - h + 24} fontSize={17} textAnchor="middle" fill={BLANCO} fontFamily={FUENTE} fontWeight={600}>{texto}</text>
      {sub && <text x={x + w / 2} y={en.y - h + 44} fontSize={11.5} textAnchor="middle" fill={color} fontFamily={FUENTE} fontStyle="italic">{sub}</text>}
    </g>
  );
}

/** Small symbols drifting along a path (what a dream carries). */
function Simbolos({ pts, color }: { pts: Punto[]; color: string }) {
  if (pts.length < 2) return null;
  const d = linea(pts);
  const dur = Math.max(2.6, largo(pts) / 150);
  const glifos = ['☾', '✦', '◯', '△', '✧', '❖'];
  return (
    <g className="cz-animado">
      {glifos.map((g, i) => (
        <text key={i} fontSize={22 + (i % 3) * 4} textAnchor="middle" fill={i % 2 ? color : BLANCO} fontFamily={FUENTE}>
          {g}
          <animateMotion path={d} dur={`${dur}s`} begin={`${(-i * dur) / glifos.length}s`} repeatCount="indefinite" />
        </text>
      ))}
    </g>
  );
}

function Zzz({ en, color }: { en: Punto; color: string }) {
  return (
    <g className="cz-animado">
      {['z', 'z', 'Z'].map((z, i) => (
        <text key={i} x={en.x + i * 12} y={en.y} fontSize={16 + i * 6} fill={color} fontFamily={FUENTE} fontWeight={700}>
          {z}
          <animate attributeName="y" values={`${en.y};${en.y - 46}`} dur="2.6s" begin={`${-i * 0.6}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;0" dur="2.6s" begin={`${-i * 0.6}s`} repeatCount="indefinite" />
        </text>
      ))}
    </g>
  );
}

// ── The steps ────────────────────────────────────────────────────────────────

export function dibujarPaso(canal: Canal, paso: number, { porId, medidas }: Ctx): ReactNode {
  const n = (id: string) => porId.get(id);
  const m = (id: string) => medidas.get(id);
  const c = (id: string): Punto | null => { const x = n(id); return x ? { x: x.x, y: x.y } : null; };
  const color = (id: string, def: string) => colorSeguro(n(id)?.color, def);
  const A = n('persona-a'), B = n('persona-b'), mA = m('persona-a'), mB = m('persona-b');
  const parte = (quien: 'a' | 'b', p: 'boca' | 'oido' | 'cerebro') => {
    const x = quien === 'a' ? A : B, mm = quien === 'a' ? mA : mB;
    return x && mm && mm.borde === 'circulo' ? cabeza(x, mm, p) : x ? { x: x.x, y: x.y } : null;
  };
  const pts = (...l: (Punto | null)[]) => l.filter((p): p is Punto => !!p);
  const piezas: ReactNode[] = [];
  const pon = (x: ReactNode) => piezas.push(<g key={piezas.length}>{x}</g>);

  if (canal === 'vigilia') {
    const oro = color('vibra', '#f5c25b');
    const camino = pts(parte('a', 'boca'), c('codifica'), c('vibra'), c('decodifica'), parte('b', 'oido'));
    if (paso === 0) {
      const cer = parte('a', 'cerebro');
      if (cer && mA) pon(<Pulsos c={cer} color={color('persona-a', '#ff8fd1')} desde={8} hasta={mA.r * 1.3} />);
      if (A && mA) pon(<Bocadillo en={{ x: A.x + mA.r * 0.55, y: A.y - mA.r * 1.2 }} texto="«¿Cómo estás?»" sub="una idea, en palabras de su idioma" color={oro} />);
      pon(<Viajeros pts={pts(cer, c('codifica'))} color={oro} n={2} />);
    }
    if (paso === 1 || paso === 2) pon(<OndasDeSonido pts={camino} color={oro} />);
    if (paso === 1) {
      const v = c('vibra'), mv = m('vibra');
      if (v && mv) pon(<Aire centro={{ x: v.x, y: v.y + mv.h / 2 + 26 }} ancho={Math.min(300, mv.w - 30)} color={oro} />);
    }
    if (paso === 2) {
      const oido = parte('b', 'oido'), cer = parte('b', 'cerebro');
      if (oido) pon(<Pulsos c={oido} color={oro} desde={6} hasta={46} dur={1.4} />);
      if (oido && cer) pon(
        <g className="cz-animado">
          <path d={`M${oido.x},${oido.y} L${(oido.x + cer.x) / 2 + 8},${(oido.y + cer.y) / 2} L${(oido.x + cer.x) / 2 - 8},${(oido.y + cer.y) / 2 + 4} L${cer.x},${cer.y}`} stroke={BLANCO} strokeWidth={2.4} fill="none" strokeDasharray="5 5">
            <animate attributeName="stroke-dashoffset" values="20;0" dur="0.6s" repeatCount="indefinite" />
          </path>
          <text x={oido.x} y={oido.y + 52} fontSize={12} textAnchor="middle" fill={oro} fontFamily={FUENTE} fontStyle="italic">vibración → impulsos nerviosos</text>
        </g>,
      );
    }
    if (paso === 3) {
      if (B && mB) pon(<CampoEncendido n={B} m={mB} color={color('persona-b', '#ffb27a')} />);
      if (B && mB) pon(<Bocadillo en={{ x: B.x - mB.r * 0.55, y: B.y - mB.r * 1.2 }} texto="«¿Cómo estás?»" sub="decodificado: me pregunta cómo estoy" color={oro} hacia="izquierda" />);
    }
  }

  if (canal === 'onirico') {
    const azul = color('hipercampo', '#7b93ff');
    const fv = n('franja-vigilia'), mfv = m('franja-vigilia');
    if (paso === 0) {
      if (fv && mfv) pon(
        <g className="cz-aparece">
          <rect x={fv.x - mfv.w / 2} y={fv.y - mfv.h / 2} width={mfv.w} height={mfv.h} rx={30} fill={NOCHE} fillOpacity={0.72} />
          <text x={fv.x} y={fv.y + 6} fontSize={16} textAnchor="middle" fill={azul} fontFamily={FUENTE} fontStyle="italic">los sentidos físicos descansan</text>
        </g>,
      );
      const a = parte('a', 'cerebro'), b = parte('b', 'cerebro');
      if (a && mA) pon(<Zzz en={{ x: a.x + mA.r * 0.6, y: a.y - mA.r * 0.6 }} color={azul} />);
      if (b && mB) pon(<Zzz en={{ x: b.x - mB.r * 1.0, y: b.y - mB.r * 0.6 }} color={azul} />);
    }
    if (paso === 1) {
      if (A && mA) pon(<Pulsos c={{ x: A.x, y: A.y }} color={color('persona-a', '#ff8fd1')} desde={mA.r * 1.3} hasta={mA.r * 3.4} dur={3} ancho={3} />);
      if (B && mB) pon(<Pulsos c={{ x: B.x, y: B.y }} color={color('persona-b', '#ffb27a')} desde={mB.r * 1.3} hasta={mB.r * 3.4} dur={3} ancho={3} />);
      if (A && mA) pon(<CampoEncendido n={A} m={mA} color={color('persona-a', '#ff8fd1')} escala={1.9} />);
      if (B && mB) pon(<CampoEncendido n={B} m={mB} color={color('persona-b', '#ffb27a')} escala={1.9} />);
    }
    if (paso === 2 && A && B && mA && mB) {
      const h = c('hipercampo') ?? { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
      const rx = Math.abs(B.x - A.x) / 2 + mA.r * 0.6;
      const cx = (A.x + B.x) / 2;
      const ca = idColor(color('persona-a', '#ff8fd1')), cb = idColor(color('persona-b', '#ffb27a'));
      pon(
        <g className="cz-animado">
          <ellipse cx={cx} cy={h.y} rx={rx} ry={170} fill={`url(#cz-rg-${idColor(azul)})`}>
            <animate attributeName="opacity" values="0.35;0.75;0.35" dur="3s" repeatCount="indefinite" />
          </ellipse>
          {/* Two meshes overlapping: the interference pattern of the hyperfield. */}
          <ellipse cx={cx} cy={h.y} rx={rx} ry={150} fill={`url(#cz-malla-${ca})`} mask="url(#cz-fundido)" opacity={0.85} />
          <g transform={`rotate(14 ${cx} ${h.y})`}>
            <ellipse cx={cx} cy={h.y} rx={rx} ry={150} fill={`url(#cz-malla-${cb})`} mask="url(#cz-fundido)" opacity={0.85}>
              <animate attributeName="opacity" values="0.4;0.95;0.4" dur="3s" repeatCount="indefinite" />
            </ellipse>
          </g>
          <text x={cx} y={h.y + 132} fontSize={15} textAnchor="middle" fill={BLANCO} fontFamily={FUENTE} fontStyle="italic">las dos mallas se entrelazan: el hipercampo</text>
        </g>,
      );
    }
    if (paso === 3) {
      pon(<Simbolos pts={pts(c('hipercampo'), parte('b', 'cerebro'))} color={azul} />);
      if (B && mB) pon(<CampoEncendido n={B} m={mB} color={color('persona-b', '#ffb27a')} />);
    }
  }

  if (canal === 'meditacion') {
    const violeta = color('coherencia', '#b48cff');
    const luz = color('telepatia', '#fff1c9');
    if (paso === 0) {
      if (A && mA) {
        pon(<CampoEncendido n={A} m={mA} color={color('persona-a', '#ff8fd1')} escala={1.6} />);
        // Ordered, evenly spaced rings: coherence.
        pon(
          <g className="cz-aparece">
            {[1.2, 1.45, 1.7, 1.95].map((k, i) => (
              <circle key={i} cx={A.x} cy={A.y} r={mA.r * k} fill="none" stroke={violeta} strokeOpacity={0.75 - i * 0.15} strokeWidth={2} />
            ))}
          </g>,
        );
      }
      pon(<Viajeros pts={pts(parte('a', 'cerebro'), c('coherencia'))} color={violeta} n={2} />);
    }
    if (paso === 1) {
      pon(<Viajeros pts={pts(parte('a', 'cerebro'), c('coherencia'), c('telepatia'), parte('b', 'cerebro'))} color={luz} />);
      if (B && mB) pon(<CampoEncendido n={B} m={mB} color={color('persona-b', '#ffb27a')} />);
    }
    if (paso === 2) {
      pon(<Viajeros pts={pts(c('coherencia'), c('extraocular'), c('objeto-cercano'))} color={luz} />);
      const o = c('objeto-cercano');
      if (o) pon(<Pulsos c={o} color={luz} desde={20} hasta={110} dur={2} />);
    }
    if (paso === 3) {
      pon(<Viajeros pts={pts(c('coherencia'), c('remota'), c('lugar-lejano'))} color={luz} />);
      const o = c('lugar-lejano');
      if (o) pon(<Pulsos c={o} color={luz} desde={20} hasta={140} dur={2.4} />);
    }
  }
  return <>{piezas}</>;
}
