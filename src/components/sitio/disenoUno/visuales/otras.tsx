// ============================================================================
// DISEÑO 1 · ILUSTRACIONES DE LAS TARJETAS: SolarCrowd, humanity.wiki,
// Conciencia y Festival Arte Ser Humano (2026-11-27)
// ============================================================================
// Same language as `src/components/politica/VisualesHerramientas.tsx`: hand-drawn SVG,
// Tailwind colour classes, thin strokes, one small spaced caption and, where it helps,
// one bold figure. Every picture is 320×128 (the card header is 360×144).
//
//   · Crowd: many small loans converge on one solar roof, the bar is full, the money
//     comes back with interest (no rate on the card: it changes from one loan to the next).
//   · humanity.wiki: the knowledge graph of the twelve sectors of /vision around a
//     territory, and the four steps every sector is organised in.
//   · Conciencia: Grinberg's lattice drawn as a grid that two neuronal fields bend.
//   · Festival: music, dance and painting under one halo.

const r1 = (n: number) => Math.round(n * 10) / 10;

export const FONDOS: Record<string, string> = {
  VisualCrowd: 'bg-gradient-to-br from-amber-50 via-white to-emerald-50',
  VisualHumanityWiki: 'bg-gradient-to-br from-sky-50 via-white to-emerald-50',
  VisualConciencia: 'bg-gradient-to-br from-violet-50 via-white to-indigo-50',
  VisualFestivalArte: 'bg-gradient-to-br from-rose-50 via-white to-amber-50',
};

/** A kind, faceless silhouette: head and shoulders, centred on (x, y) at the shoulders. */
function Persona({ x, y, s = 1, className }: { x: number; y: number; s?: number; className: string }) {
  return (
    <g className={className}>
      <circle cx={r1(x)} cy={r1(y - 6.2 * s)} r={r1(3.6 * s)} />
      <path d={`M${r1(x - 6.4 * s)},${r1(y + 6 * s)} C${r1(x - 6.4 * s)},${r1(y + 0.4 * s)} ${r1(x - 3.4 * s)},${r1(y - 1 * s)} ${r1(x)},${r1(y - 1 * s)} C${r1(x + 3.4 * s)},${r1(y - 1 * s)} ${r1(x + 6.4 * s)},${r1(y + 0.4 * s)} ${r1(x + 6.4 * s)},${r1(y + 6 * s)} Z`} />
    </g>
  );
}

/* ── Crowd: muchas aportaciones, un tejado solar, el dinero vuelve ── */
const PRESTAMISTAS = [
  [20, 34], [42, 28], [64, 36],
  [16, 60], [38, 56], [60, 62],
  [22, 86], [44, 82], [66, 88],
] as const;
const TONO_PERSONA = ['fill-slate-500', 'fill-sky-600', 'fill-slate-400', 'fill-teal-600', 'fill-slate-500',
  'fill-sky-500', 'fill-slate-400', 'fill-teal-500', 'fill-slate-500'];

export function VisualCrowd() {
  const dest = [126, 80] as const;
  const bez = (p0: readonly number[], c1: readonly number[], c2: readonly number[], p3: readonly number[], t: number) => {
    const u = 1 - t;
    return [0, 1].map(k => u * u * u * p0[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * p3[k]);
  };
  // The solar panels sit on the left slope of the roof, from eave (122,78) to ridge (150,54)
  const pan = (t: number) => [122 + 28 * t, 78 - 24 * t];
  const nx = -24 / 37, ny = -28 / 37, g = 6.5; // outward normal of the slope, approximately
  const celdas = [0.2, 0.36, 0.52, 0.68, 0.84];
  return (
    <svg viewBox="0 0 320 128" className="h-full w-full" role="img"
      aria-label="Muchas personas prestan pequeñas cantidades a un proyecto de tejado solar; la financiación llega al 100 % y el dinero vuelve con un interés modesto">
      <defs>
        <marker id="du-crowd-flecha" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="fill-emerald-500" />
        </marker>
        <radialGradient id="du-crowd-sol">
          <stop offset="0" stopColor="#fbbf24" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Las aportaciones: cada línea es un préstamo, cada moneda una cantidad pequeña */}
      {PRESTAMISTAS.map(([x, y], i) => {
        const p0 = [x + 8, y + 1], c1 = [x + 34, y + 1], c2 = [104, dest[1]], p3 = dest;
        const [mx, my] = bez(p0, c1, c2, p3, 0.5);
        return (
          <g key={i}>
            <path d={`M${p0[0]},${p0[1]} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p3[0]},${p3[1]}`} fill="none"
              className="stroke-amber-300" strokeWidth={1.2} />
            <g className="transition-transform duration-700 group-hover:translate-x-1" style={{ transitionDelay: `${i * 30}ms` }}>
              <circle cx={r1(mx)} cy={r1(my)} r={2.7} className="fill-amber-300 stroke-amber-500" strokeWidth={0.8} />
            </g>
          </g>
        );
      })}
      {PRESTAMISTAS.map(([x, y], i) => <Persona key={i} x={x} y={y} className={TONO_PERSONA[i]} />)}

      {/* El sol y la casa con placas */}
      <path d="M168,30 L146,48 M172,36 L156,56" className="stroke-amber-300" strokeWidth={1} strokeDasharray="2 3" strokeLinecap="round" />
      <circle cx={180} cy={28} r={22} fill="url(#du-crowd-sol)" />
      <circle cx={180} cy={28} r={7} className="fill-amber-400" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return <line key={i} x1={r1(180 + 10 * Math.cos(a))} y1={r1(28 + 10 * Math.sin(a))} x2={r1(180 + 13.5 * Math.cos(a))} y2={r1(28 + 13.5 * Math.sin(a))}
          className="stroke-amber-400" strokeWidth={1.4} strokeLinecap="round" />;
      })}
      <ellipse cx={150} cy={106} rx={36} ry={3} className="fill-slate-900" opacity={0.06} />
      <rect x={126} y={76} width={48} height={29} className="fill-white stroke-slate-300" strokeWidth={1} />
      <rect x={144} y={88} width={11} height={17} rx={1} className="fill-amber-100 stroke-slate-300" strokeWidth={0.8} />
      <rect x={160} y={84} width={9} height={8} rx={1} className="fill-sky-100 stroke-slate-300" strokeWidth={0.8} />
      <path d="M120,79 L150,53 L180,79" fill="none" className="stroke-slate-500" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <polygon className="fill-sky-600 stroke-sky-800" strokeWidth={0.6}
        points={[pan(0.04), pan(0.94), [pan(0.94)[0] + nx * g, pan(0.94)[1] + ny * g], [pan(0.04)[0] + nx * g, pan(0.04)[1] + ny * g]]
          .map(([x, y]) => `${r1(x)},${r1(y)}`).join(' ')} />
      {celdas.map(t => {
        const [x, y] = pan(t);
        return <line key={t} x1={r1(x)} y1={r1(y)} x2={r1(x + nx * g)} y2={r1(y + ny * g)} className="stroke-sky-300" strokeWidth={0.6} />;
      })}

      {/* La devolución: vuelve a quien prestó */}
      <path d="M134,108 C118,122 80,122 50,104" fill="none" className="stroke-emerald-500" strokeWidth={1.4}
        strokeDasharray="3 3" markerEnd="url(#du-crowd-flecha)" />
      <text x={92} y={124} textAnchor="middle" className="fill-emerald-700 text-[8px] font-semibold">devolución + interés</text>

      {/* Los datos */}
      <g transform="translate(200 46)">
        <text className="fill-slate-500 text-[8.5px] uppercase tracking-[0.12em]">Préstamo colectivo</text>
        <rect y={9} width={100} height={6} rx={3} className="fill-slate-200" />
        <rect y={9} width={100} height={6} rx={3} className="fill-emerald-500" />
        <text y={36}><tspan className="fill-slate-900 text-[14px] font-bold">100 %</tspan><tspan dx={4} className="fill-slate-500 text-[9.5px]">financiado</tspan></text>
        <text y={58}><tspan className="fill-slate-900 text-[14px] font-bold">Tú</tspan><tspan dx={4} className="fill-slate-500 text-[9.5px]">eliges el proyecto</tspan></text>
      </g>
    </svg>
  );
}

/* ── humanity.wiki: doce sectores alrededor de un territorio ── */
const SECTORES = [
  { n: 'Energía', f: 'fill-amber-400' }, { n: 'Movilidad', f: 'fill-sky-500' }, { n: 'Política', f: 'fill-rose-500' },
  { n: 'Economía', f: 'fill-indigo-500' }, { n: 'Seguridad', f: 'fill-slate-500' }, { n: 'Justicia', f: 'fill-violet-500' },
  { n: 'Salud', f: 'fill-red-400' }, { n: 'Vivienda', f: 'fill-emerald-500' }, { n: 'Alimentación', f: 'fill-lime-500' },
  { n: 'Informática', f: 'fill-cyan-500' }, { n: 'Educación', f: 'fill-orange-400' }, { n: 'Cuidados', f: 'fill-pink-400' },
];
const ENLACES = [[0, 7], [1, 9], [3, 8], [2, 5], [6, 11], [0, 3], [4, 10]];
const PASOS = [
  { t: 'Visión ideal', c: 'stroke-amber-400', f: 'fill-amber-400' },
  { t: 'Retos', c: 'stroke-rose-400', f: 'fill-rose-400' },
  { t: 'Soluciones', c: 'stroke-emerald-500', f: 'fill-emerald-500' },
  { t: 'Proyectos', c: 'stroke-sky-500', f: 'fill-sky-500' },
];

export function VisualHumanityWiki() {
  const cx = 82, cy = 68, R = 42;
  const nodo = (i: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 12;
    return [r1(cx + R * Math.cos(a)), r1(cy + R * Math.sin(a))] as const;
  };
  return (
    <svg viewBox="0 0 320 128" className="h-full w-full" role="img"
      aria-label="Grafo de conocimiento: doce sectores alrededor de un territorio, y en cada uno visión ideal, retos, soluciones y proyectos">
      <circle cx={cx} cy={cy} r={R} fill="none" className="stroke-slate-200" strokeWidth={1} />
      {SECTORES.map((_, i) => { const [x, y] = nodo(i); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className="stroke-slate-200" />; })}
      {ENLACES.map(([a, b]) => {
        const [x0, y0] = nodo(a), [x1, y1] = nodo(b);
        return <path key={`${a}-${b}`} d={`M${x0},${y0} Q${r1((x0 + x1) / 2 * 0.6 + cx * 0.4)},${r1((y0 + y1) / 2 * 0.6 + cy * 0.4)} ${x1},${y1}`}
          fill="none" className="stroke-slate-300" strokeWidth={0.8} />;
      })}
      {/* El territorio en el centro */}
      <circle cx={cx} cy={cy} r={14} className="fill-white stroke-emerald-500" strokeWidth={1.4} />
      <ellipse cx={cx} cy={cy} rx={6} ry={14} fill="none" className="stroke-emerald-400" strokeWidth={0.9} />
      <line x1={cx - 14} x2={cx + 14} y1={cy} y2={cy} className="stroke-emerald-400" strokeWidth={0.9} />
      <path d={`M${cx - 12.5},${cy - 6} Q${cx},${cy - 3} ${cx + 12.5},${cy - 6} M${cx - 12.5},${cy + 6} Q${cx},${cy + 9} ${cx + 12.5},${cy + 6}`} fill="none" className="stroke-emerald-300" strokeWidth={0.8} />
      {SECTORES.map((s, i) => {
        const [x, y] = nodo(i);
        return (
          <g key={s.n} className="transition-transform duration-500 group-hover:-translate-y-0.5" style={{ transitionDelay: `${i * 25}ms` }}>
            <circle cx={x} cy={y} r={i === 0 ? 7.5 : 6} className={`${s.f} stroke-white`} strokeWidth={1.6} />
          </g>
        );
      })}
      <circle cx={nodo(0)[0]} cy={nodo(0)[1]} r={11} fill="none" className="stroke-amber-400" strokeWidth={1} strokeDasharray="2 2" />
      <text x={nodo(0)[0]} y={nodo(0)[1] - 14} textAnchor="middle" className="fill-slate-700 text-[9px] font-semibold">Energía</text>
      <text x={nodo(3)[0] + 9} y={nodo(3)[1] + 3} className="fill-slate-500 text-[8px]">Economía</text>
      <text x={nodo(7)[0] - 2} y={nodo(7)[1] + 16} textAnchor="middle" className="fill-slate-500 text-[8px]">Vivienda</text>

      {/* Lo que tiene cada sector */}
      <path d={`M${nodo(0)[0] + 52},${nodo(0)[1]} C160,26 166,36 180,36`} fill="none" className="stroke-amber-400" strokeWidth={1} strokeDasharray="2 3" />
      <text x={182} y={16} className="fill-slate-500 text-[9px] uppercase tracking-[0.14em]">12 sectores vitales</text>
      <line x1={192} x2={192} y1={36} y2={108} className="stroke-slate-200" strokeWidth={1.4} />
      {PASOS.map((p, i) => (
        <g key={p.t} transform={`translate(182 ${27 + i * 23})`}>
          <rect width={122} height={18} rx={9} className={`fill-white ${p.c}`} strokeWidth={1} />
          <circle cx={10} cy={9} r={4} className={p.f} />
          <text x={20} y={12.5} className="fill-slate-700 text-[10px] font-semibold">{p.t}</text>
        </g>
      ))}
    </svg>
  );
}

/* ── Conciencia: la lattice y dos campos neuronales que la curvan ── */
const CAMPOS = [{ x: 104, y: 62 }, { x: 216, y: 62 }];
function curvar(x: number, y: number): [number, number] {
  let dx = 0, dy = 0;
  for (const c of CAMPOS) {
    const ex = c.x - x, ey = c.y - y, f = 0.5 * Math.exp(-(ex * ex + ey * ey) / (2 * 24 * 24));
    dx += ex * f; dy += ey * f;
  }
  return [x + dx, y + dy];
}
const linea = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(x)},${r1(y)}`).join('');
/** A head in profile looking right, 32 wide; its "brain" is at (15, 13). */
const PERFIL = 'M5,36 C5,30 1,25 1,16 C1,7 8,1 16,1 C24,1 29,6 29,13 L29,15 L32,20 L29,21.5 L29,24 C29,26.5 27,27.5 24,27.5 L23,27.5 L23,36 Z';

export function VisualConciencia() {
  const paso = 11;
  const verticales = Array.from({ length: 31 }, (_, i) => -5 + i * paso).map(x =>
    linea(Array.from({ length: 34 }, (_, j) => curvar(x, -4 + j * 4))));
  const horizontales = Array.from({ length: 13 }, (_, i) => -4 + i * paso).map(y =>
    linea(Array.from({ length: 84 }, (_, j) => curvar(-6 + j * 4, y))));
  const [a, b] = CAMPOS;
  const onda = Array.from({ length: 41 }, (_, i) => {
    const x = a.x + 30 + (i * (b.x - a.x - 60)) / 40;
    return [x, a.y + 2 * Math.sin(i * 0.9)] as [number, number];
  });
  return (
    <svg viewBox="0 0 320 128" className="h-full w-full" role="img"
      aria-label="La matriz fundamental del universo como una retícula, curvada por los campos neuronales de dos seres conscientes que interactúan; vigilia, sueño y meditación">
      <defs>
        <radialGradient id="du-conc-borde" cx="0.5" cy="0.48" r="0.62">
          <stop offset="0.55" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <mask id="du-conc-mascara"><rect width={320} height={128} fill="url(#du-conc-borde)" /></mask>
        <linearGradient id="du-conc-cabeza" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#475569" />
          <stop offset="1" stopColor="#1e1b4b" />
        </linearGradient>
        <radialGradient id="du-conc-campoA">
          <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.32" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="du-conc-campoB">
          <stop offset="0" stopColor="#14b8a6" stopOpacity="0.3" />
          <stop offset="1" stopColor="#14b8a6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g mask="url(#du-conc-mascara)">
        {verticales.map((d, i) => <path key={`v${i}`} d={d} fill="none" className="stroke-indigo-300" strokeWidth={0.6} />)}
        {horizontales.map((d, i) => <path key={`h${i}`} d={d} fill="none" className="stroke-indigo-300" strokeWidth={0.6} />)}
      </g>
      <circle cx={a.x} cy={a.y} r={44} fill="url(#du-conc-campoA)" />
      <circle cx={b.x} cy={b.y} r={44} fill="url(#du-conc-campoB)" />
      {[16, 25, 34].map((r, k) => (
        <g key={r} opacity={0.7 - k * 0.2}>
          <circle cx={a.x} cy={a.y} r={r} fill="none" className="stroke-violet-400" strokeWidth={0.8} strokeDasharray="2 3" />
          <circle cx={b.x} cy={b.y} r={r} fill="none" className="stroke-teal-400" strokeWidth={0.8} strokeDasharray="2 3" />
        </g>
      ))}
      <path d={linea(onda)} fill="none" className="stroke-fuchsia-400" strokeWidth={1.2} strokeLinecap="round" />
      <text x={160} y={a.y - 11} textAnchor="middle" className="fill-fuchsia-500 text-[8px] font-semibold">hipercampo</text>
      <g transform={`translate(${a.x - 18} ${a.y - 15.6}) scale(1.2)`}>
        <path d={PERFIL} fill="url(#du-conc-cabeza)" />
        <circle cx={15} cy={13} r={4.5} className="fill-violet-300" />
      </g>
      <g transform={`translate(${b.x + 18} ${b.y - 15.6}) scale(-1.2 1.2)`}>
        <path d={PERFIL} fill="url(#du-conc-cabeza)" />
        <circle cx={15} cy={13} r={4.5} className="fill-teal-300" />
      </g>
      <text x={160} y={14} textAnchor="middle" className="fill-slate-500 text-[9px] uppercase tracking-[0.14em]">La lattice · campos mentales</text>

      {/* Tres estados de conciencia */}
      {[
        { t: 'Vigilia', x: 58 }, { t: 'Sueño', x: 132 }, { t: 'Meditación', x: 200 },
      ].map((e, i) => (
        <g key={e.t} transform={`translate(${e.x} 104)`}>
          <rect width={i === 2 ? 76 : 62} height={17} rx={8.5} className="fill-white stroke-slate-200" strokeWidth={1} />
          {i === 0 && <g className="stroke-amber-500" strokeWidth={1.1} strokeLinecap="round">
            <circle cx={10} cy={8.5} r={2.8} className="fill-amber-300" />
            {Array.from({ length: 8 }, (_, k) => { const q = (k * Math.PI) / 4; return <line key={k} x1={r1(10 + 4.4 * Math.cos(q))} y1={r1(8.5 + 4.4 * Math.sin(q))} x2={r1(10 + 5.8 * Math.cos(q))} y2={r1(8.5 + 5.8 * Math.sin(q))} />; })}
          </g>}
          {i === 1 && <path d="M12.5,3.5 A5,5 0 1 0 12.5,13.5 A6.5,6.5 0 0 1 12.5,3.5 Z" className="fill-indigo-400" />}
          {i === 2 && <g className="fill-violet-300 stroke-violet-500" strokeWidth={0.8}>
            <path d="M10,13 C7,10 7.5,6 10,3.5 C12.5,6 13,10 10,13 Z" />
            <path d="M10,13 C6,13 4,10.5 3.5,8 C6.5,8 9,10 10,13 Z" />
            <path d="M10,13 C14,13 16,10.5 16.5,8 C13.5,8 11,10 10,13 Z" />
          </g>}
          <text x={20} y={12} className="fill-slate-600 text-[9.5px] font-semibold">{e.t}</text>
        </g>
      ))}
    </svg>
  );
}

/* ── Festival Arte Ser Humano: música, danza y pintura bajo un mismo halo ── */
const BOMBILLAS = ['fill-amber-300', 'fill-rose-400', 'fill-violet-400', 'fill-sky-400', 'fill-emerald-400'];

export function VisualFestivalArte() {
  const guirnalda = (t: number) => {
    const u = 1 - t;
    return [u * u * 6 + 2 * u * t * 160 + t * t * 314, u * u * 8 + 2 * u * t * 30 + t * t * 8];
  };
  const nota = (x: number, y: number, k: string) => (
    <g key={`${x}-${y}`} className={k}>
      <ellipse cx={x} cy={y} rx={2.6} ry={2} transform={`rotate(-20 ${x} ${y})`} />
      <rect x={x + 1.9} y={y - 10} width={1} height={10} />
      <path d={`M${x + 2.9},${y - 10} q4,2 3,6 q-0.5,-3 -3,-3.5 z`} />
    </g>
  );
  return (
    <svg viewBox="0 0 320 128" className="h-full w-full" role="img"
      aria-label="Festival Arte Ser Humano: una persona toca la guitarra, otra baila y otra pinta, bajo un halo de luz, para explorar la conciencia">
      <defs>
        <radialGradient id="du-fest-halo">
          <stop offset="0" stopColor="#f59e0b" stopOpacity="0.38" />
          <stop offset="0.55" stopColor="#f43f5e" stopOpacity="0.14" />
          <stop offset="1" stopColor="#f43f5e" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* La guirnalda de luces */}
      <path d="M6,8 Q160,52 314,8" fill="none" className="stroke-slate-300" strokeWidth={0.8} />
      {Array.from({ length: 13 }, (_, i) => {
        const [x, y] = guirnalda((i + 0.5) / 13);
        return (
          <g key={i}>
            <circle cx={r1(x)} cy={r1(y + 3)} r={5} className={BOMBILLAS[i % 5]} opacity={0.22} />
            <circle cx={r1(x)} cy={r1(y + 3)} r={2.3} className={BOMBILLAS[i % 5]} />
          </g>
        );
      })}
      {/* El halo: la conciencia que se explora */}
      <circle cx={160} cy={74} r={52} fill="url(#du-fest-halo)" />
      {[22, 32, 42].map((r, k) => <circle key={r} cx={160} cy={74} r={r} fill="none" className="stroke-amber-300" strokeWidth={0.8} opacity={0.8 - k * 0.22} />)}
      {[[118, 44, 1], [204, 40, 0.8], [124, 92, 0.7], [198, 96, 1]].map(([x, y, k]) => (
        <path key={`${x}`} d={`M${x},${y - 5 * k} L${x + 1.3 * k},${y - 1.3 * k} L${x + 5 * k},${y} L${x + 1.3 * k},${y + 1.3 * k} L${x},${y + 5 * k} L${x - 1.3 * k},${y + 1.3 * k} L${x - 5 * k},${y} L${x - 1.3 * k},${y - 1.3 * k} Z`}
          className="fill-amber-400 transition-opacity duration-500 group-hover:opacity-60" />
      ))}
      <line x1={14} x2={306} y1={110} y2={110} className="stroke-slate-200" strokeWidth={1} />
      {[[68, 18], [160, 20], [262, 22]].map(([x, rx]) => <ellipse key={x} cx={x} cy={110} rx={rx} ry={2.4} className="fill-slate-900" opacity={0.06} />)}

      {/* Música: alguien toca la guitarra */}
      <g>
        <circle cx={64} cy={58} r={6} className="fill-sky-700" />
        <path d="M54,110 L55,80 C55,72 58,68 64,68 C70,68 73,72 73,80 L74,110 Z" className="fill-sky-700" />
        <path d="M46,96 L88,72" className="stroke-amber-800" strokeWidth={2.2} strokeLinecap="round" />
        <ellipse cx={60} cy={90} rx={10} ry={8} transform="rotate(-30 60 90)" className="fill-amber-500" />
        <ellipse cx={52} cy={95} rx={7} ry={6} transform="rotate(-30 52 95)" className="fill-amber-500" />
        <circle cx={57} cy={92} r={2} className="fill-amber-800" />
        <path d="M70,73 C74,80 70,86 62,90" fill="none" className="stroke-sky-700" strokeWidth={3.6} strokeLinecap="round" />
        {nota(90, 52, 'fill-sky-500')}
        {nota(104, 38, 'fill-violet-400')}
        {nota(80, 34, 'fill-sky-400')}
      </g>

      {/* Danza */}
      <g className="origin-center transition-transform duration-700 group-hover:-translate-y-1">
        <path d="M176,40 C196,46 186,64 204,70 C214,73 216,82 210,90" fill="none" className="stroke-rose-300" strokeWidth={1.6} strokeLinecap="round" />
        <circle cx={160} cy={50} r={6} className="fill-fuchsia-600" />
        <g className="stroke-fuchsia-600" strokeWidth={4.4} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M160,59 L158,80" />
          <path d="M160,63 L170,52 L176,40" />
          <path d="M159,64 L147,62 L139,68" />
          <path d="M157,94 L152,109" />
          <path d="M162,94 L172,102 L182,100" />
        </g>
        <path d="M157,76 L145,97 C153,100 166,100 174,96 L161,76 Z" className="fill-fuchsia-500" />
      </g>

      {/* Pintura */}
      <g>
        <path d="M274,110 L282,52 M298,110 L290,52 M286,52 L286,110" className="stroke-amber-800" strokeWidth={1.6} strokeLinecap="round" />
        <rect x={266} y={56} width={40} height={34} rx={1.5} className="fill-white stroke-slate-300" strokeWidth={1} />
        <path d="M270,82 C276,66 284,78 290,64 C294,58 300,62 302,60" fill="none" className="stroke-rose-400" strokeWidth={3} strokeLinecap="round" />
        <circle cx={295} cy={77} r={5} className="fill-sky-400" opacity={0.85} />
        <circle cx={278} cy={66} r={4} className="fill-amber-400" opacity={0.9} />
        <circle cx={240} cy={60} r={6} className="fill-emerald-700" />
        <path d="M230,110 L231,82 C231,74 234,70 240,70 C246,70 249,74 249,82 L250,110 Z" className="fill-emerald-700" />
        <path d="M247,78 L258,72 L268,70" fill="none" className="stroke-emerald-700" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={269} cy={69.5} r={1.8} className="fill-rose-500" />
      </g>
      <text x={160} y={124} textAnchor="middle" className="fill-slate-500 text-[9px] uppercase tracking-[0.14em]">Música · danza · pintura</text>
    </svg>
  );
}
