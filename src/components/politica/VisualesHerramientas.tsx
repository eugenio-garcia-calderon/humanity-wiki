import { ESCALAS } from '../../data/modeloSocioeconomico';
import { cn } from '../../utils/cn';

// ============================================================================
// LO QUE HAY DENTRO DE CADA HERRAMIENTA, DIBUJADO EN SU TARJETA (2026-11-24)
// ============================================================================
// Eugenio: «añadiendo una visualización mucho más sofisticada en cada tarjeta de
// lo que hay dentro del contenido… no pongas iconos tan planos… geometría política:
// una especie de geometría con colorines de todos los partidos y que se ve y se compara».
//
// Each picture is drawn from what the tool really shows, not invented:
//   · Observatorio: the CIS self-placement of September 2026 (the same ten bars as chapter 1).
//   · Perfiles: the five positions of the left–right line and the seven other currents,
//     with the amber «enemy» arcs of «Cómo se miran».
//   · Geometría: the five parties' figures on Inmigración, eight aspects, on the five level rings
//     (0 indefinido … 4 ideal; the scores are levels since 2026-11-25).
//   · Democracia directa: four real measures of «Votar por temas», each with its slider.
//   · Economía pública optimizada: the eight scales of the model, each split in its three thirds.
// The numbers below are copied from `public/observatorio-polarizacion/index.html`: that document
// is a static file and cannot be imported. If its data changes, these pictures go stale.
// Colours are Tailwind classes (fill-*/stroke-*), except the model's scales, which carry their
// own colour in `src/data/modeloSocioeconomico.ts`.

const r1 = (n: number) => Math.round(n * 10) / 10;

/* ── Observatorio: «¿Dónde se colocaría usted…?», CIS 3577, septiembre de 2026 ── */
const CIS = [17.7, 7.0, 11.5, 8.3, 20.5, 6.3, 7.5, 6.5, 1.3, 8.1];
const CIS_COLOR = ['fill-rose-600', 'fill-rose-500', 'fill-orange-400', 'fill-orange-300', 'fill-stone-300',
  'fill-stone-300', 'fill-sky-400', 'fill-sky-500', 'fill-blue-500', 'fill-indigo-600'];

export function VisualObservatorio() {
  const W = 320, H = 180, x0 = 24, base = 140, alto = 96, ancho = 23, paso = 28;
  const max = Math.max(...CIS);
  const cimas = CIS.map((v, i) => [x0 + i * paso + ancho / 2, base - (v / max) * alto] as const);
  // A smooth line through the tops: the shape of the society, as the chapter draws it
  let d = `M${r1(cimas[0][0])},${r1(cimas[0][1])}`;
  for (let i = 1; i < cimas.length; i++) {
    const [xa, ya] = cimas[i - 1], [xb, yb] = cimas[i], xm = (xa + xb) / 2;
    d += ` C${r1(xm)},${r1(ya)} ${r1(xm)},${r1(yb)} ${r1(xb)},${r1(yb)}`;
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img"
      aria-label="Autoubicación ideológica en España, CIS de septiembre de 2026: barras del 1, izquierda, al 10, derecha">
      <line x1={x0 - 4} x2={x0 + 9 * paso + ancho + 4} y1={base} y2={base} className="stroke-slate-300" strokeWidth={1} />
      {CIS.map((v, i) => {
        const h = (v / max) * alto, x = x0 + i * paso;
        return (
          <g key={i} className="transition-transform duration-500 group-hover:-translate-y-0.5" style={{ transitionDelay: `${i * 25}ms` }}>
            <rect x={x} y={r1(base - h)} width={ancho} height={r1(h)} rx={3} className={CIS_COLOR[i]} />
            <text x={x + ancho / 2} y={base + 13} textAnchor="middle" className="fill-slate-500 text-[9px] font-semibold">{i + 1}</text>
          </g>
        );
      })}
      <path d={d} fill="none" className="stroke-slate-800" strokeWidth={1.6} strokeDasharray="3 3" />
      <text x={cimas[4][0]} y={cimas[4][1] - 6} textAnchor="middle" className="fill-slate-800 text-[10px] font-bold">20,5 %</text>
      <text x={x0 - 2} y={base + 30} className="fill-rose-600 text-[9.5px] font-semibold">← Izquierda</text>
      <text x={x0 + 9 * paso + ancho + 2} y={base + 30} textAnchor="end" className="fill-indigo-600 text-[9.5px] font-semibold">Derecha →</text>
      <text x={W / 2} y={16} textAnchor="middle" className="fill-slate-500 text-[9px] uppercase tracking-[0.14em]">CIS · septiembre 2026</text>
    </svg>
  );
}

/* ── Perfiles: cinco en la línea, siete que la cruzan ── */
const LINEA = [
  { c: 'stroke-rose-600', f: 'fill-rose-600' }, { c: 'stroke-orange-400', f: 'fill-orange-400' },
  { c: 'stroke-stone-400', f: 'fill-stone-400' }, { c: 'stroke-sky-400', f: 'fill-sky-400' },
  { c: 'stroke-indigo-600', f: 'fill-indigo-600' },
];
const OTROS = [
  { c: 'stroke-pink-700', f: 'fill-pink-700' }, { c: 'stroke-red-700', f: 'fill-red-700' },
  { c: 'stroke-amber-500', f: 'fill-amber-500' }, { c: 'stroke-teal-600', f: 'fill-teal-600' },
  { c: 'stroke-violet-600', f: 'fill-violet-600' }, { c: 'stroke-violet-300', f: 'fill-violet-300' },
  { c: 'stroke-slate-500', f: 'fill-slate-500' },
];

const PIEL = ['fill-amber-200', 'fill-orange-200', 'fill-amber-300', 'fill-yellow-100', 'fill-orange-300'];
const PELO = ['fill-slate-800', 'fill-amber-900', 'fill-stone-500', 'fill-yellow-700', 'fill-slate-600'];

/** A small portrait: background, shoulders in the position's colour, neck, face and one of three haircuts. */
function Busto({ x, y, r, c, f, id, i }: { x: number; y: number; r: number; c: string; f: string; id: string; i: number }) {
  const piel = PIEL[i % PIEL.length], pelo = PELO[(i * 3) % PELO.length], hy = y - r * 0.16, hr = r * 0.3;
  const peinado = i % 3;
  return (
    <g>
      <clipPath id={id}><circle cx={x} cy={y} r={r} /></clipPath>
      <circle cx={x} cy={y} r={r} className="fill-slate-100" />
      <g clipPath={`url(#${id})`}>
        {peinado === 1 && <path d={`M${x - hr * 1.15},${hy} C${x - hr * 1.3},${y + r * 0.5} ${x + hr * 1.3},${y + r * 0.5} ${x + hr * 1.15},${hy} Z`} className={pelo} />}
        <path d={`M${x - r * 1.05},${y + r} C${x - r},${y + r * 0.42} ${x - r * 0.4},${y + r * 0.3} ${x},${y + r * 0.3} C${x + r * 0.4},${y + r * 0.3} ${x + r},${y + r * 0.42} ${x + r * 1.05},${y + r} Z`} className={f} />
        <rect x={x - hr * 0.42} y={hy + hr * 0.7} width={hr * 0.84} height={r * 0.32} rx={hr * 0.2} className={piel} />
        <circle cx={x} cy={hy} r={hr} className={piel} />
        {peinado === 0 && <path d={`M${x - hr * 1.02},${hy - hr * 0.05} C${x - hr},${hy - hr * 1.35} ${x + hr},${hy - hr * 1.35} ${x + hr * 1.02},${hy - hr * 0.05} C${x + hr * 0.5},${hy - hr * 0.6} ${x - hr * 0.5},${hy - hr * 0.6} ${x - hr * 1.02},${hy - hr * 0.05} Z`} className={pelo} />}
        {peinado === 1 && <path d={`M${x - hr * 1.05},${hy} C${x - hr * 1.05},${hy - hr * 1.3} ${x + hr * 1.05},${hy - hr * 1.3} ${x + hr * 1.05},${hy} C${x + hr * 0.6},${hy - hr * 0.7} ${x - hr * 0.6},${hy - hr * 0.7} ${x - hr * 1.05},${hy} Z`} className={pelo} />}
        {peinado === 2 && <>
          <circle cx={x} cy={hy - hr * 1.15} r={hr * 0.42} className={pelo} />
          <path d={`M${x - hr * 1.02},${hy - hr * 0.1} C${x - hr * 0.9},${hy - hr * 1.2} ${x + hr * 0.9},${hy - hr * 1.2} ${x + hr * 1.02},${hy - hr * 0.1} C${x + hr * 0.4},${hy - hr * 0.55} ${x - hr * 0.4},${hy - hr * 0.55} ${x - hr * 1.02},${hy - hr * 0.1} Z`} className={pelo} />
        </>}
      </g>
      <circle cx={x} cy={y} r={r} fill="none" className={c} strokeWidth={2.4} />
    </g>
  );
}

export function VisualPerfiles() {
  const W = 320, H = 180;
  const fila = LINEA.map((p, i) => ({ ...p, x: 44 + i * 58, y: 70 }));
  const abajo = OTROS.map((p, i) => ({ ...p, x: 40 + i * 40, y: 138 }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img"
      aria-label="Doce perfiles: cinco en la línea de izquierda a derecha y siete corrientes que la cruzan, y cómo mira un extremo a los demás">
      <defs>
        <marker id="pf-flecha" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="fill-amber-500" />
        </marker>
      </defs>
      {/* «Cómo se miran»: desde un extremo, cuanto más lejos, más gruesa la hostilidad */}
      {fila.slice(1).map((p, i) => (
        <path key={i} d={`M${fila[0].x + 6},${fila[0].y - 22} Q${(fila[0].x + p.x) / 2},${fila[0].y - 46 - i * 3} ${p.x - 4},${p.y - 24}`}
          fill="none" className={i ? 'stroke-amber-400' : 'stroke-rose-300'} strokeWidth={1 + i * 0.55} strokeLinecap="round" markerEnd="url(#pf-flecha)" />
      ))}
      {fila.slice(0, -1).map((p, i) => (
        <line key={i} x1={p.x} x2={fila[i + 1].x} y1={104} y2={104} className={fila[i + 1].c} strokeWidth={4} strokeLinecap="round" opacity={0.55} />
      ))}
      {fila.map((p, i) => <Busto key={i} id={`pf-a${i}`} i={i} x={p.x} y={p.y} r={21} c={p.c} f={p.f} />)}
      {abajo.map((p, i) => <Busto key={i} id={`pf-b${i}`} i={i + 2} x={p.x} y={p.y} r={14} c={p.c} f={p.f} />)}
      <text x={24} y={118} className="fill-rose-600 text-[8.5px] font-semibold">izquierda</text>
      <text x={296} y={118} textAnchor="end" className="fill-indigo-600 text-[8.5px] font-semibold">derecha</text>
      <text x={W / 2} y={172} textAnchor="middle" className="fill-slate-500 text-[9px] uppercase tracking-[0.14em]">Doce perfiles · cómo se miran</text>
    </svg>
  );
}

/* ── Geometría: Inmigración, ocho aspectos, cinco partidos ── */
const PARTIDOS_INM = [
  { n: 'PP', v: [2, 2, 2, 2, 1, 1, 0, 1], c: 'stroke-blue-500', f: 'fill-blue-500' },
  { n: 'PSOE', v: [2, 1, 1, 1, 2, 1, 2, 2], c: 'stroke-red-500', f: 'fill-red-500' },
  { n: 'Vox', v: [1, 3, 3, 2, 0, 0, 0, 0], c: 'stroke-green-500', f: 'fill-green-500' },
  { n: 'Frente Amplio', v: [1, 0, 0, 1, 2, 2, 2, 2], c: 'stroke-pink-500', f: 'fill-pink-500' },
  { n: 'Podemos', v: [1, 0, 0, 1, 1, 2, 3, 2], c: 'stroke-purple-500', f: 'fill-purple-500' },
];

export function VisualGeometria() {
  const W = 320, H = 180, cx = 112, cy = 92, R = 74, n = 8;
  const punto = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + (R * (v + 1)) / 5 * Math.cos(a), cy + (R * (v + 1)) / 5 * Math.sin(a)] as const;
  };
  const figura = (v: number[]) => v.map((x, i) => punto(i, x)).map(([x, y], i) => `${i ? 'L' : 'M'}${r1(x)},${r1(y)}`).join('') + 'Z';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img"
      aria-label="Geometría de cinco partidos en inmigración: PP, PSOE, Vox, Frente Amplio y Podemos, sobre ocho aspectos y cinco niveles">
      <circle cx={cx} cy={cy} r={R} className="fill-amber-50 stroke-amber-500" strokeWidth={2} />
      {[1, 2, 3, 4].map(k => <circle key={k} cx={cx} cy={cy} r={(R * k) / 5} fill="none" className={k === 1 ? 'stroke-rose-300' : 'stroke-slate-300'} strokeDasharray="3 4" />)}
      {Array.from({ length: n }, (_, i) => { const [x, y] = punto(i, 4); return <line key={i} x1={cx} y1={cy} x2={r1(x)} y2={r1(y)} className="stroke-slate-200" />; })}
      {PARTIDOS_INM.map((p, j) => (
        <g key={p.n} className="origin-center transition-opacity duration-300">
          <path d={figura(p.v)} className={cn(p.f, p.c)} fillOpacity={0.12} strokeWidth={1.8} strokeLinejoin="round" />
          {p.v.map((x, i) => { const [px, py] = punto(i, x); return <circle key={i} cx={r1(px)} cy={r1(py)} r={1.9} className={p.f} />; })}
          <g transform={`translate(212 ${46 + j * 22})`}>
            <circle cx={5} cy={-3} r={5} className={p.f} />
            <text x={15} y={1} className="fill-slate-700 text-[10.5px] font-semibold">{p.n}</text>
          </g>
        </g>
      ))}
      <text x={212} y={28} className="fill-slate-500 text-[9px] uppercase tracking-[0.14em]">Inmigración</text>
      <text x={cx} y={cy + R + 13} textAnchor="middle" className="fill-amber-600 text-[8.5px] font-semibold">el círculo ideal</text>
    </svg>
  );
}

/* ── Democracia directa: cuatro medidas de «Votar por temas», cada una con su deslizador ── */
const MEDIDAS = [
  { t: 'Salario mínimo', a: 'subir', p: 0.68, c: 'bg-emerald-500' },
  { t: 'IVA general', a: 'bajar', p: 0.3, c: 'bg-sky-500' },
  { t: 'Alumnos por aula', a: 'bajar', p: 0.22, c: 'bg-amber-500' },
  { t: 'Contratación en origen', a: 'abrir', p: 0.8, c: 'bg-violet-500' },
];

export function VisualDemocracia() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-2.5 px-5 py-4" role="img"
      aria-label="Cuatro medidas para votar con un deslizador: salario mínimo, IVA general, alumnos por aula y contratación en origen">
      <p className="text-center text-[9px] uppercase tracking-[0.14em] text-slate-500">Votar por temas, no por colores</p>
      {MEDIDAS.map((m, i) => (
        <div key={m.t} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
          <span className="truncate text-[11.5px] font-semibold text-slate-700">{m.t}</span>
          <span className="rounded-full bg-white px-2 py-px text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">{m.a}</span>
          <span className="relative col-span-2 h-1.5 rounded-full bg-slate-200">
            <span className={cn('absolute inset-y-0 left-0 rounded-full opacity-70', m.c)} style={{ width: `${m.p * 100}%` }} />
            <span className={cn('absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow transition-transform duration-500 group-hover:scale-110', m.c)}
              style={{ left: `${m.p * 100}%`, transitionDelay: `${i * 60}ms` }} />
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Economía pública optimizada: ocho escalas, cada una en tres tercios ── */
export function VisualEconomia() {
  const W = 320, H = 180, cx = 92, cy = 94, grosor = 7.2, hueco = 1.6;
  const arco = (r: number, a0: number, a1: number) => {
    const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `M${r1(x0)},${r1(y0)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${r1(x1)},${r1(y1)}`;
  };
  const tercio = (2 * Math.PI) / 3, sep = 0.09;
  // Del centro (la persona) hacia fuera (el planeta), como en el modelo
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img"
      aria-label="Ocho escalas, de la persona al planeta, cada una repartida en tres tercios: producir, cuidar y libre">
      <circle cx={cx} cy={cy} r={11} className="fill-slate-900" />
      <text x={cx} y={cy + 3.5} textAnchor="middle" className="fill-white text-[9px] font-bold">1</text>
      {ESCALAS.map((e, i) => {
        const r = 17 + i * (grosor + hueco);
        return [0, 1, 2].map(k => (
          <path key={`${e.id}-${k}`} d={arco(r, -Math.PI / 2 + k * tercio + sep, -Math.PI / 2 + (k + 1) * tercio - sep)}
            fill="none" stroke={e.color} strokeWidth={grosor} strokeOpacity={[1, 0.7, 0.42][k]} />
        ));
      })}
      <g transform="translate(184 40)">
        <text className="fill-slate-500 text-[9px] uppercase tracking-[0.14em]">Un solo impuesto</text>
        <text y={22} className="fill-slate-900 text-[13px] font-bold">8 escalas</text>
        <text y={36} className="fill-slate-500 text-[9.5px]">de la persona al planeta</text>
        <text y={62} className="fill-slate-900 text-[13px] font-bold">3 tercios</text>
        <text y={76} className="fill-slate-500 text-[9.5px]">producir · cuidar · libre</text>
        <text y={102} className="fill-slate-900 text-[13px] font-bold">Presupuestos</text>
        <text y={116} className="fill-slate-500 text-[9.5px]">de la UE a una familia</text>
      </g>
    </svg>
  );
}

/* ── Democracia orgánica moderna: dos raíces, seis poderes (2026-11-28, v2) ──
   The same scheme as the study's cover (public/democracia-organica-moderna/index.html): everyone votes
   what is common (the citizens' root feeds the Cámara General and the Gobierno), and whoever practises a
   trade also decides on it (the trades' root feeds the trade chambers, and justice, guardians and media
   choose their own bodies from within). Some of the people carry a trade badge: one can hold several. */
const RAICES = [
  { n: 'Ciudadanía', x: 96, c: 'stroke-slate-700', f: 'fill-slate-700', a: ['General', 'Gobierno'] },
  { n: 'Oficios', x: 224, c: 'stroke-amber-500', f: 'fill-amber-500', a: ['Oficios', 'Justicia', 'Guardianes', 'Medios'] },
];
const PODERES = [
  { n: 'General', x: 30, f: 'fill-sky-700' },
  { n: 'Gobierno', x: 82, f: 'fill-rose-500' },
  { n: 'Oficios', x: 134, f: 'fill-amber-600' },
  { n: 'Justicia', x: 186, f: 'fill-violet-600' },
  { n: 'Guardianes', x: 238, f: 'fill-teal-700' },
  { n: 'Medios', x: 290, f: 'fill-pink-700' },
];

export function VisualOrganica() {
  const W = 320, H = 180;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img"
      aria-label="Democracia orgánica moderna: todos votan lo común en la Cámara General y al Gobierno; quien ejerce un oficio decide además sobre lo suyo, y justicia, guardianes y medios eligen sus órganos desde dentro">
      {/* the people: one equal vote each; some practise one or more trades */}
      {Array.from({ length: 15 }, (_, i) => (
        <g key={i} className="transition-transform duration-500 group-hover:-translate-y-0.5" style={{ transitionDelay: `${i * 15}ms` }}>
          <circle cx={27 + i * 19} cy={152} r={4} className="fill-slate-700" />
          <path d={`M${21 + i * 19},${166} q6,-10 12,0`} className="fill-slate-700" />
          {i % 3 !== 1 && <circle cx={31 + i * 19} cy={147} r={2} className="fill-amber-500" />}
        </g>
      ))}
      <text x={W / 2} y={177} textAnchor="middle" className="fill-slate-500 text-[8.5px] uppercase tracking-[0.14em]">Todos votan lo común</text>
      {/* the two roots */}
      {RAICES.map(r => (
        <g key={r.n}>
          <path d={`M${r.x},140 C${r.x},118 ${r.x},110 ${r.x},98`} fill="none" className={r.c} strokeWidth={3} strokeLinecap="round" />
          <rect x={r.x - 36} y={84} width={72} height={16} rx={8} className={r.f} />
          <text x={r.x} y={95.5} textAnchor="middle" className="fill-white text-[9px] font-bold">{r.n}</text>
          {PODERES.filter(p => r.a.includes(p.n)).map(p => (
            <line key={p.n} x1={r.x} y1={84} x2={p.x} y2={46} className={r.c} strokeWidth={0.8} opacity={0.45} />
          ))}
        </g>
      ))}
      {/* the six powers */}
      {PODERES.map(p => (
        <g key={p.n}>
          <rect x={p.x - 24} y={26} width={48} height={20} rx={5} className={p.f} />
          <text x={p.x} y={39} textAnchor="middle" className="fill-white text-[7.5px] font-bold">{p.n}</text>
        </g>
      ))}
      <text x={W / 2} y={16} textAnchor="middle" className="fill-slate-500 text-[9px] uppercase tracking-[0.14em]">Dos raíces: todos y cada oficio</text>
    </svg>
  );
}
