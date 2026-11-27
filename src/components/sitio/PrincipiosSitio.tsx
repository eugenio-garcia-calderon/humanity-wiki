// ============================================================================
// LOS PRINCIPIOS DEL LABORATORIO (2026-11-27, Eugenio)
// ============================================================================
// «Añade en la página web una sección de los principios y valores del laboratorio a la hora de innovar»:
// de abajo hacia arriba, en sintonía con la naturaleza, paz y cooperación, igualdad de oportunidades.
// Later that day: «los principios hazlos un poco más bonitos y que tengan más o menos el mismo tamaño… igual tienes
// que acortar algunos… con ilustraciones mucho más top». So each card now opens with a drawing in the language of
// the Diseño 1 tool cards (SVG, Tailwind colours, thin strokes), and the texts were shortened (migration 0249).
//
// The texts live in the root page's configuration, `sitio.principios` (migrations 0245 and 0249), not here: that is
// what the English and Portuguese replicas translate, and what Eugenio can edit without a deploy.
// Only the drawings are in the code, chosen by each principle's `icono`.

import type React from 'react';

type Principio = { id: string; icono?: string; titulo: string; resumen?: string; puntos?: string[] };
export type ConfigPrincipios = { titulo?: string; texto?: string; lista?: Principio[] };

const r1 = (n: number) => Math.round(n * 10) / 10;

/** De abajo hacia arriba: eight rings growing from one person to the planet, with a sprout at the base. */
function DibujoEscalas() {
  const radios = [11, 20, 30, 40, 51, 62, 74, 86];
  return (
    <svg viewBox="0 0 320 128" className="h-full w-full" aria-hidden="true">
      {radios.map((r, i) => (
        <path key={r} d={`M${160 - r},116 A${r},${r * 0.98} 0 0 1 ${160 + r},116`} fill="none"
          className={i % 2 ? 'stroke-sky-300' : 'stroke-sky-400'} strokeWidth={i === radios.length - 1 ? 2 : 1.2}
          strokeDasharray={i === radios.length - 1 ? undefined : '0'} opacity={1 - i * 0.07} />
      ))}
      {/* The planet: the outer ring is the Earth's horizon */}
      <path d="M74,116 A86,84 0 0 1 246,116" fill="none" className="stroke-sky-500" strokeWidth={2.4} />
      {[[-62, 'fill-emerald-300'], [-30, 'fill-emerald-400'], [22, 'fill-emerald-300'], [54, 'fill-emerald-400']].map(([a, c]) => {
        const t = (Number(a) - 90) * Math.PI / 180;
        return <ellipse key={String(a)} cx={r1(160 + 86 * Math.cos(t))} cy={r1(116 + 84 * Math.sin(t))} rx={7} ry={3} className={String(c)}
          transform={`rotate(${a} ${r1(160 + 86 * Math.cos(t))} ${r1(116 + 84 * Math.sin(t))})`} />;
      })}
      {/* Small steps on the way up: a home, a village, a city */}
      <g className="fill-white stroke-sky-500" strokeWidth={1}>
        <path d="M131,96 l6,-5 6,5 v7 h-12z" />
        <path d="M181,82 h7 v-6 l4,-3 4,3 v6 h5 v-9 h6 v9 h3 v6 h-29z" />
      </g>
      <g className="fill-sky-100 stroke-sky-500" strokeWidth={1}>
        <rect x={104} y={68} width={6} height={18} rx={1} /><rect x={112} y={60} width={7} height={26} rx={1} /><rect x={121} y={72} width={6} height={14} rx={1} />
      </g>
      {/* The person, and the sprout that starts it all */}
      <circle cx={160} cy={100} r={3.6} className="fill-sky-700" />
      <path d="M160,104.5 v11.5" className="stroke-sky-700" strokeWidth={3} strokeLinecap="round" />
      <path d="M166,116 c0,-6 2,-9 7,-10 c-1,5 -3,8 -7,10z" className="fill-emerald-500" />
      <path d="M166,116 c0,-5 -2,-7 -6,-8" fill="none" className="stroke-emerald-500" strokeWidth={1.2} />
      {/* Arrow upwards */}
      <path d="M258,108 V40 M252,47 l6,-7 6,7" fill="none" className="stroke-sky-400" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      <text x={266} y={46} className="fill-sky-700 text-[8px] font-bold uppercase tracking-[0.12em]">Planeta</text>
      <text x={266} y={108} className="fill-sky-700 text-[8px] font-bold uppercase tracking-[0.12em]">Persona</text>
      <path d="M0,116.5 H320" className="stroke-sky-200" strokeWidth={1} />
    </svg>
  );
}

/** En sintonía con la naturaleza: a small solar house inside the landscape, not on top of it. */
function DibujoNaturaleza() {
  return (
    <svg viewBox="0 0 320 128" className="h-full w-full" aria-hidden="true">
      <circle cx={252} cy={34} r={15} className="fill-amber-300" />
      <circle cx={252} cy={34} r={22} className="fill-amber-200" opacity={0.45} />
      <path d="M226,24 q4,-3 8,0 M236,18 q3,-2 6,0" fill="none" className="stroke-slate-400" strokeWidth={1} strokeLinecap="round" />
      <path d="M0,86 C50,62 92,70 140,80 S240,64 320,74 V128 H0z" className="fill-emerald-100" />
      <path d="M0,100 C60,88 120,96 170,102 S270,92 320,98 V128 H0z" className="fill-emerald-200" />
      {/* The river */}
      <path d="M196,128 C186,116 206,108 190,100 S170,92 178,86" fill="none" className="stroke-sky-300" strokeWidth={5} strokeLinecap="round" />
      <path d="M196,128 C186,116 206,108 190,100 S170,92 178,86" fill="none" className="stroke-sky-100" strokeWidth={1.4} strokeLinecap="round" />
      {/* Trees */}
      {[[66, 78, 13], [92, 82, 10], [252, 76, 12], [276, 80, 9], [118, 86, 8]].map(([x, y, r]) => (
        <g key={`${x}`}>
          <path d={`M${x},${y} v${r + 4}`} className="stroke-amber-800" strokeWidth={1.6} />
          <circle cx={x} cy={y - r * 0.4} r={r} className="fill-emerald-400" />
          <circle cx={x - r * 0.3} cy={y - r * 0.7} r={r * 0.45} className="fill-emerald-300" />
        </g>
      ))}
      {/* The house: wood, a green roof and solar panels */}
      <path d="M138,92 v-20 l18,-14 18,14 v20z" className="fill-amber-50 stroke-amber-700" strokeWidth={1.2} strokeLinejoin="round" />
      <path d="M133,74 l23,-19 23,19" fill="none" className="stroke-emerald-600" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M160,61 l9,7.2 -4,3 -9,-7.2z" className="fill-indigo-500" />
      <path d="M162.5,63 l4,3.2" className="stroke-indigo-200" strokeWidth={0.6} />
      <rect x={151} y={80} width={9} height={12} rx={1} className="fill-amber-700" />
      <rect x={142} y={76} width={6} height={6} rx={1} className="fill-sky-200 stroke-amber-700" strokeWidth={0.8} />
      {/* A leaf around everything, faint */}
      <path d="M40,118 C40,40 140,12 296,22 C290,98 190,124 40,118z" fill="none" className="stroke-emerald-300" strokeWidth={1.2} strokeDasharray="3 4" />
      <path d="M40,118 C110,80 200,46 296,22" fill="none" className="stroke-emerald-300" strokeWidth={1} strokeDasharray="3 4" />
    </svg>
  );
}

/** Paz y cooperación: six people of different colours holding hands in a ring, around a heart. */
function DibujoPaz() {
  const n = 7, cx = 160, cy = 66, rx = 104, ry = 38;
  const colores = ['fill-amber-400', 'fill-rose-400', 'fill-sky-400', 'fill-emerald-400', 'fill-violet-400', 'fill-teal-400', 'fill-orange-400'];
  const pos = Array.from({ length: n }, (_, i) => {
    const a = (-90 + i * 360 / n) * Math.PI / 180;
    return { x: r1(cx + rx * Math.cos(a)), y: r1(cy + ry * Math.sin(a)), c: colores[i] };
  });
  // Draw the back half first so the ring reads in depth.
  const orden = [...pos.keys()].sort((a, b) => pos[a].y - pos[b].y);
  return (
    <svg viewBox="0 0 320 128" className="h-full w-full" aria-hidden="true">
      <ellipse cx={cx} cy={cy + 22} rx={rx + 14} ry={ry - 8} className="fill-amber-100" opacity={0.7} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" className="stroke-amber-400" strokeWidth={2} />
      {/* The heart in the middle */}
      <path d={`M${cx},${cy + 16} C${cx - 16},${cy + 4} ${cx - 15},${cy - 10} ${cx - 6},${cy - 9} C${cx - 2},${cy - 9} ${cx},${cy - 6} ${cx},${cy - 4} C${cx},${cy - 6} ${cx + 2},${cy - 9} ${cx + 6},${cy - 9} C${cx + 15},${cy - 10} ${cx + 16},${cy + 4} ${cx},${cy + 16}z`}
        className="fill-rose-400" />
      <path d={`M${cx - 6},${cy - 4} q-3,2 -2,6`} fill="none" className="stroke-rose-200" strokeWidth={1.4} strokeLinecap="round" />
      {orden.map(i => {
        const p = pos[i], esc = 0.9 + (p.y - (cy - ry)) / (2 * ry) * 0.4;
        return (
          <g key={i} transform={`translate(${p.x} ${p.y}) scale(${r1(esc)})`}>
            {/* standing on the ring, hands on it: the ring is what joins them */}
            <circle cx={0} cy={-19} r={6.5} className={`${p.c} stroke-white`} strokeWidth={1.5} />
            <path d="M-10,8 C-10,-6 -7,-11 0,-11 C7,-11 10,-6 10,8z" className={`${p.c} stroke-white`} strokeWidth={1.5} />
            <circle cx={-11} cy={0} r={2.4} className={p.c} /><circle cx={11} cy={0} r={2.4} className={p.c} />
          </g>
        );
      })}
    </svg>
  );
}

/** Igualdad de oportunidades y cuidado: three people of different heights, each with the support they need to see
 *  over the fence; the same view for all. */
function DibujoOportunidades() {
  const suelo = 112;
  const persona = (x: number, alto: number, c: string) => (
    <g key={x}>
      <circle cx={x} cy={suelo - alto - 7} r={7} className={c} />
      <path d={`M${x - 12},${suelo} C${x - 12},${suelo - alto + 10} ${x - 9},${suelo - alto + 2} ${x},${suelo - alto + 2} C${x + 9},${suelo - alto + 2} ${x + 12},${suelo - alto + 10} ${x + 12},${suelo}z`} className={c} />
    </g>
  );
  return (
    <svg viewBox="0 0 320 128" className="h-full w-full" aria-hidden="true">
      {/* What everyone can now see: sun, hills, a tree */}
      <circle cx={232} cy={30} r={13} className="fill-amber-300" />
      <path d="M150,60 C190,40 230,48 320,40 V70 H150z" className="fill-violet-100" />
      <circle cx={276} cy={42} r={11} className="fill-emerald-300" />
      <path d="M276,48 v14" className="stroke-amber-800" strokeWidth={2} />
      {/* The fence */}
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={96 + i * 14} y={66} width={11} height={46} rx={1.5} className="fill-amber-100 stroke-amber-400" strokeWidth={0.8} />
      ))}
      <path d="M94,76 H266 M94,100 H266" className="stroke-amber-400" strokeWidth={1.2} />
      {/* The people in front of it, from behind, all heads above the fence */}
      <g transform="translate(0 0)">
        {/* boxes: none, one, two */}
        <rect x={160} y={suelo - 16} width={26} height={16} rx={2} className="fill-violet-300 stroke-violet-500" strokeWidth={1} />
        <rect x={204} y={suelo - 16} width={26} height={16} rx={2} className="fill-violet-300 stroke-violet-500" strokeWidth={1} />
        <rect x={204} y={suelo - 32} width={26} height={16} rx={2} className="fill-violet-200 stroke-violet-500" strokeWidth={1} />
      </g>
      <g>
        {persona(130, 54, 'fill-violet-600')}
        <g transform={`translate(0 -16)`}>{persona(173, 38, 'fill-sky-500')}</g>
        <g transform={`translate(0 -32)`}>{persona(217, 22, 'fill-rose-400')}</g>
      </g>
      {/* Care: a hand under the smallest one */}
      <path d="M238,96 c6,-2 10,0 12,4 c-4,2 -9,3 -13,2" fill="none" className="stroke-violet-500" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M0,112.5 H320" className="stroke-violet-200" strokeWidth={1} />
      <path d="M40,112 c4,-8 8,-8 10,0 M60,112 c3,-6 6,-6 8,0" fill="none" className="stroke-emerald-400" strokeWidth={1.4} />
    </svg>
  );
}

const DIBUJOS: Record<string, { Dibujo: () => React.ReactElement; fondo: string; numero: string }> = {
  escalas: { Dibujo: DibujoEscalas, fondo: 'bg-gradient-to-b from-sky-50 to-white', numero: 'text-sky-600' },
  naturaleza: { Dibujo: DibujoNaturaleza, fondo: 'bg-gradient-to-b from-emerald-50 to-white', numero: 'text-emerald-600' },
  paz: { Dibujo: DibujoPaz, fondo: 'bg-gradient-to-b from-amber-50 to-white', numero: 'text-amber-600' },
  oportunidades: { Dibujo: DibujoOportunidades, fondo: 'bg-gradient-to-b from-violet-50 to-white', numero: 'text-violet-600' },
};

export default function PrincipiosSitio({ cfg }: { cfg?: ConfigPrincipios | null }) {
  const lista = (cfg?.lista || []).filter(p => p && p.titulo);
  if (!lista.length) return null;
  return (
    <section data-ancla="principios" aria-labelledby="principios-titulo" className="mt-20 scroll-mt-36 outline-none sm:scroll-mt-24">
      <div className="text-center">
        <h2 id="principios-titulo" className="mx-auto max-w-3xl text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{cfg?.titulo || 'Nuestros principios'}</h2>
        {cfg?.texto && <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-500">{cfg.texto}</p>}
      </div>
      <ol className="mt-8 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-4">
        {lista.map((p, i) => {
          const { Dibujo, fondo, numero } = DIBUJOS[p.icono || ''] || DIBUJOS.escalas;
          return (
            <li key={p.id || i} className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className={`h-32 border-b border-slate-100 ${fondo}`}><Dibujo /></div>
              <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
                <span className={`text-xs font-black tabular-nums tracking-[0.18em] ${numero}`}>{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-1 text-[17px] font-black leading-snug text-slate-900 xl:min-h-[2.75em]">{p.titulo}</h3>
                {p.resumen && <p className="mt-1.5 text-[15px] leading-snug text-slate-700">{p.resumen}</p>}
                {!!p.puntos?.length && (
                  <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm leading-snug text-slate-500">
                    {p.puntos.map((x, k) => <li key={k} className="relative pl-4 before:absolute before:left-0 before:top-[0.5em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-slate-300">{x}</li>)}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
