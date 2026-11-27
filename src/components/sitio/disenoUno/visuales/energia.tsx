// ============================================================================
// DISEÑO 1 · ILUSTRACIONES DE LAS HERRAMIENTAS DE ENERGÍA (2026-11-27)
// ============================================================================
// Card header pictures for the energy tools of Luz & Humanidad, in the language of
// `src/components/politica/VisualesHerramientas.tsx`: hand-drawn SVG, Tailwind colour
// classes, thin strokes, a small spaced caption. Each one draws what the tool does.
//
// The figures are real and come from `src/pages/SolSolidario.tsx` (CIFRAS and GRUPOS):
//   · +30.000 people with solar light, 6 countries.
//   · The solar shop gave away one lamp for every lamp sold.
// The percentages on the houses of «Comercializadora» are illustrative sharing
// coefficients (the mechanism), not a measured split.

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Card header background of each picture. */
export const FONDOS: Record<string, string> = {
  VisualComercializadora: 'bg-gradient-to-br from-amber-50 via-white to-sky-50',
  VisualComunidadesPueblos: 'bg-gradient-to-br from-sky-50 via-white to-amber-50',
  VisualSolSolidario: 'bg-gradient-to-br from-amber-50 via-white to-orange-50',
  VisualOptimizacionEnergia: 'bg-gradient-to-br from-violet-50 via-white to-amber-50',
  VisualTiendaSolar: 'bg-gradient-to-br from-yellow-50 via-white to-emerald-50',
};

/* ── Shared pieces ── */

/** A sun with short rays. */
function Sol({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r * 1.9} className="fill-amber-200" opacity={0.35} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return <line key={i} x1={r1(x + Math.cos(a) * r * 1.35)} y1={r1(y + Math.sin(a) * r * 1.35)}
          x2={r1(x + Math.cos(a) * r * 1.75)} y2={r1(y + Math.sin(a) * r * 1.75)}
          className="stroke-amber-400" strokeWidth={1.4} strokeLinecap="round" />;
      })}
      <circle cx={x} cy={y} r={r} className="fill-amber-400" />
    </g>
  );
}

/** A tilted solar panel seen from the front-side: a parallelogram with its cell grid. */
function Panel({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const k = w * 0.22; // slant
  return (
    <g>
      <path d={`M${r1(x + k)},${y} L${r1(x + w + k)},${y} L${r1(x + w)},${r1(y + h)} L${x},${r1(y + h)} Z`}
        className="fill-sky-700 stroke-sky-900" strokeWidth={0.5} strokeLinejoin="round" />
      <line x1={r1(x + k / 2)} y1={r1(y + h / 2)} x2={r1(x + w + k / 2)} y2={r1(y + h / 2)} className="stroke-sky-300" strokeWidth={0.5} opacity={0.8} />
      {[1, 2].map(j => (
        <line key={j} x1={r1(x + k + (w * j) / 3)} y1={y} x2={r1(x + (w * j) / 3)} y2={r1(y + h)} className="stroke-sky-300" strokeWidth={0.5} opacity={0.8} />
      ))}
    </g>
  );
}

/** A small house: walls, roof, lit window, door. `lit` paints the window amber. */
function Casa({ x, y, w, h, techo = 'fill-slate-500', pared = 'fill-white', lit = true }:
  { x: number; y: number; w: number; h: number; techo?: string; pared?: string; lit?: boolean }) {
  const rh = h * 0.55;
  return (
    <g>
      <rect x={x + 2} y={y + 2} width={w} height={h} rx={1} className="fill-slate-900" opacity={0.06} />
      <rect x={x} y={y} width={w} height={h} rx={1} className={`${pared} stroke-slate-300`} strokeWidth={0.7} />
      <path d={`M${r1(x - 2.5)},${y + 0.5} L${r1(x + w / 2)},${r1(y - rh)} L${r1(x + w + 2.5)},${y + 0.5} Z`} className={techo} strokeLinejoin="round" />
      <rect x={r1(x + w * 0.18)} y={r1(y + h * 0.24)} width={r1(w * 0.28)} height={r1(h * 0.3)} rx={0.6}
        className={lit ? 'fill-amber-300' : 'fill-slate-200'} />
      <rect x={r1(x + w * 0.6)} y={r1(y + h * 0.42)} width={r1(w * 0.22)} height={r1(h * 0.58)} rx={0.6} className="fill-slate-400" />
    </g>
  );
}

/** Energy travelling along a path: a soft amber dash that slides on hover. */
function Flujo({ d, w = 1.4, delay = 0 }: { d: string; w?: number; delay?: number }) {
  return (
    <g>
      <path d={d} fill="none" className="stroke-slate-400" strokeWidth={0.8} />
      <path d={d} fill="none" className="stroke-amber-400 transition-all duration-700 group-hover:stroke-amber-500"
        strokeWidth={w} strokeDasharray="2 5" strokeLinecap="round" style={{ transitionDelay: `${delay}ms` }} />
    </g>
  );
}

/* ── Comercializadora Comunidad Solar: autoconsumo remoto ── */
const REPARTO = [
  { x: 212, y: 44, w: 22, h: 15, p: '30 %' },
  { x: 266, y: 40, w: 24, h: 16, p: '25 %' },
  { x: 226, y: 90, w: 24, h: 16, p: '25 %' },
  { x: 282, y: 86, w: 20, h: 14, p: '20 %' },
];

export function VisualComercializadora() {
  const W = 320, H = 128;
  const mx = 140, my = 42, mw = 38, mh = 46; // meter box
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img"
      aria-label="Autoconsumo remoto: una planta solar y una hidroeléctrica comunitarias envían la energía por la red a un contador que reparte los kWh entre muchas casas de toda España">
      <defs>
        <linearGradient id="du-com-agua" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" className="text-sky-300" />
          <stop offset="1" stopColor="currentColor" className="text-sky-500" />
        </linearGradient>
      </defs>

      {/* Generation, far away: mountains, reservoir and dam; solar field in front */}
      <path d="M52,96 L78,50 L92,66 L106,44 L134,96 Z" className="fill-slate-200" />
      <path d="M100,54 L106,44 L112,54 L108,52 L104,55 Z" className="fill-white" />
      <path d="M58,96 L66,70 L94,70 L94,96 Z" fill="url(#du-com-agua)" />
      <path d="M68,75 L76,75 M80,80 L90,80 M70,86 L78,86" className="stroke-white" strokeWidth={0.8} strokeLinecap="round" opacity={0.7} />
      <path d="M92,67 L100,67 C102,78 104,88 108,98 L92,98 Z" className="fill-slate-400" />
      <path d="M95,70 L95,96 M98.5,70 L99.5,96" className="stroke-slate-300" strokeWidth={0.6} />
      <path d="M107,90 C110,94 112,96 118,98" fill="none" className="stroke-sky-300" strokeWidth={2.2} strokeLinecap="round" />
      <path d="M0,110 C40,96 104,94 150,128 L0,128 Z" className="fill-emerald-100" />
      {[0, 1, 2, 3].map(i => <Panel key={`a${i}`} x={8 + i * 15} y={92} w={11} h={6} />)}
      {[0, 1, 2, 3].map(i => <Panel key={`b${i}`} x={4 + i * 17} y={103} w={13} h={7} />)}
      <Sol x={28} y={34} r={8} />
      <text x={34} y={122} textAnchor="middle" className="fill-emerald-800 text-[7px] font-bold uppercase tracking-[0.12em]">solar</text>
      <text x={98} y={122} textAnchor="middle" className="fill-emerald-800 text-[7px] font-bold uppercase tracking-[0.12em]">hidro</text>

      {/* Pylon and the line to the meter */}
      <g className="stroke-slate-500" strokeWidth={0.9} fill="none" strokeLinejoin="round">
        <path d="M118,106 L123,58 L128,106" />
        <path d="M116,62 L130,62 M117,72 L129,72 M119.5,84 L126.5,84 M118.5,96 L127.5,96" />
        <path d="M120,62 L126.5,72 M126,62 L119.5,72 M121.5,72 L125.6,84 M124.5,72 L120.4,84 M120.2,84 L127,96 M125.8,84 L119,96" opacity={0.6} />
      </g>
      <Flujo d="M100,68 C106,62 110,62 116,62" />
      <Flujo d="M50,92 C70,70 96,58 116,62" delay={80} />
      <Flujo d={`M130,62 C134,66 136,64 ${mx},62`} delay={160} />

      {/* The meter that shares the kWh */}
      <rect x={mx + 2} y={my + 3} width={mw} height={mh} rx={5} className="fill-slate-900" opacity={0.08} />
      <rect x={mx} y={my} width={mw} height={mh} rx={5} className="fill-white stroke-slate-300" strokeWidth={1} />
      <rect x={mx + 5} y={my + 6} width={mw - 10} height={15} rx={2} className="fill-slate-800" />
      <text x={mx + mw / 2} y={my + 17} textAnchor="middle" className="fill-amber-300 font-mono text-[9px] font-bold">1.240</text>
      <text x={mx + mw / 2} y={my + 31} textAnchor="middle" className="fill-slate-700 text-[8px] font-bold">kWh</text>
      {[0, 1, 2, 3].map(i => <circle key={i} cx={mx + 10 + i * 6} cy={my + 39} r={1.6} className={i === 3 ? 'fill-emerald-500' : 'fill-slate-300'} />)}
      <text x={mx + mw / 2} y={my + mh + 12} textAnchor="middle" className="fill-slate-500 text-[7.5px] uppercase tracking-[0.12em]">reparte</text>

      {/* Branches to the houses */}
      {REPARTO.map((c, i) => (
        <Flujo key={i} d={`M${mx + mw},${my + mh / 2} C${mx + mw + 18},${my + mh / 2} ${c.x - 18},${c.y + c.h / 2} ${c.x - 2},${c.y + c.h / 2}`} w={1.3} delay={240 + i * 60} />
      ))}
      {REPARTO.map((c, i) => (
        <g key={i}>
          <Casa x={c.x} y={c.y} w={c.w} h={c.h} techo={i % 2 ? 'fill-orange-300' : 'fill-slate-500'} />
          <rect x={c.x + c.w / 2 - 12} y={c.y + c.h + 3} width={24} height={10} rx={5} className="fill-amber-100 stroke-amber-300" strokeWidth={0.6} />
          <text x={c.x + c.w / 2} y={c.y + c.h + 10.5} textAnchor="middle" className="fill-amber-800 text-[7px] font-bold">{c.p}</text>
        </g>
      ))}

      <text x={196} y={15} textAnchor="middle" className="fill-slate-500 text-[9px] uppercase tracking-[0.14em]">Autoconsumo remoto</text>
      <text x={196} y={27} textAnchor="middle" className="fill-slate-400 text-[8px]">de la planta a hogares de toda España</text>
    </svg>
  );
}

/* ── Comunidades energéticas en pueblos: tejados públicos que alimentan al pueblo ── */
const CASCO = [
  { x: 222, y: 84, w: 18, h: 18 }, { x: 244, y: 78, w: 20, h: 24 }, { x: 268, y: 86, w: 16, h: 16 },
  { x: 288, y: 80, w: 20, h: 22 },
];

export function VisualComunidadesPueblos() {
  const W = 320, H = 128, suelo = 104;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img"
      aria-label="Comunidad energética de un pueblo: los tejados de un colegio y del ayuntamiento, con placas solares, dan energía a las casas del casco histórico, donde no se pueden poner placas">
      <Sol x={300} y={24} r={7} />
      {/* Hills */}
      <path d={`M0,${suelo} C60,86 120,92 170,${suelo} Z`} className="fill-emerald-50" />
      <path d={`M150,${suelo} C210,82 270,84 320,96 L320,${suelo} Z`} className="fill-emerald-50" />
      <line x1={0} x2={W} y1={suelo} y2={suelo} className="stroke-slate-300" strokeWidth={1} />

      {/* Colegio: a long building whose whole roof is panels */}
      <rect x={30} y={66} width={92} height={38} rx={1.5} className="fill-slate-900" opacity={0.06} transform="translate(2 2)" />
      <rect x={30} y={66} width={92} height={38} rx={1.5} className="fill-amber-50 stroke-amber-200" strokeWidth={0.8} />
      <path d="M26,66 L38,52 L114,52 L126,66 Z" className="fill-slate-300" />
      {Array.from({ length: 7 }, (_, i) => <Panel key={`c${i}`} x={36 + i * 11} y={55} w={8} h={9} />)}
      {[0, 1, 2, 3, 4, 5].map(i => [0, 1].map(j => (
        <rect key={`v${i}${j}`} x={36 + i * 14} y={72 + j * 13} width={8} height={7} rx={0.8} className="fill-sky-100 stroke-sky-300" strokeWidth={0.5} />
      )))}
      <rect x={70} y={92} width={12} height={12} rx={1} className="fill-amber-700" />
      <text x={76} y={115} textAnchor="middle" className="fill-slate-600 text-[7.5px] font-bold uppercase tracking-[0.12em]">Colegio</text>

      {/* Ayuntamiento: clock, flag, panels on the roof */}
      <rect x={136} y={70} width={52} height={34} rx={1.5} className="fill-slate-900" opacity={0.06} transform="translate(2 2)" />
      <rect x={136} y={70} width={52} height={34} rx={1.5} className="fill-white stroke-slate-300" strokeWidth={0.8} />
      <path d="M132,70 L140,58 L184,58 L192,70 Z" className="fill-slate-300" />
      {[0, 1, 2, 3].map(i => <Panel key={`a${i}`} x={142 + i * 10} y={60.5} w={7.5} h={8} />)}
      <rect x={155} y={44} width={14} height={14} className="fill-white stroke-slate-300" strokeWidth={0.8} />
      <circle cx={162} cy={51} r={4} className="fill-white stroke-slate-500" strokeWidth={0.8} />
      <path d="M162,48.5 L162,51 L164,52" fill="none" className="stroke-slate-600" strokeWidth={0.7} strokeLinecap="round" />
      <line x1={162} y1={44} x2={162} y2={34} className="stroke-slate-500" strokeWidth={0.8} />
      <path d="M162,34 L170,36.5 L162,39 Z" className="fill-amber-400" />
      {[0, 1, 2].map(i => <rect key={i} x={142 + i * 15} y={76} width={9} height={14} rx={4.5} className="fill-sky-100 stroke-sky-300" strokeWidth={0.5} />)}
      <rect x={157} y={92} width={10} height={12} rx={1} className="fill-slate-500" />
      <text x={162} y={115} textAnchor="middle" className="fill-slate-600 text-[7.5px] font-bold uppercase tracking-[0.12em]">Ayuntamiento</text>

      {/* Energy from the public roofs to the old town */}
      <Flujo d="M90,52 C130,14 210,22 240,72" w={1.6} />
      <Flujo d="M170,58 C200,34 250,40 276,80" w={1.6} delay={80} />
      <Flujo d="M110,52 C160,14 262,18 296,74" w={1.6} delay={160} />

      {/* Old town: tiled roofs, no panels, lit windows */}
      {CASCO.map((c, i) => <Casa key={i} {...c} techo="fill-orange-400" pared={i % 2 ? 'fill-amber-50' : 'fill-white'} />)}
      <text x={265} y={115} textAnchor="middle" className="fill-slate-600 text-[7.5px] font-bold uppercase tracking-[0.12em]">Casco histórico</text>
      <text x={265} y={124} textAnchor="middle" className="fill-slate-400 text-[7px]">sin placas, con energía</text>

      <text x={12} y={16} className="fill-slate-500 text-[9px] uppercase tracking-[0.14em]">Comunidad energética</text>
      <text x={12} y={29} className="fill-slate-700 text-[9px] font-semibold">público-privada · para los vecinos</text>
    </svg>
  );
}

/* ── Sol Solidario: luz solar donde no llega la red ── */
type LonLat = readonly [number, number];
const CONTINENTES: LonLat[][] = [
  // North and Central America
  [[-130, 56], [-55, 53], [-66, 45], [-70, 42], [-76, 35], [-81, 31], [-80, 26], [-82, 25], [-84, 30], [-90, 29], [-97, 27],
    [-97, 21], [-91, 18], [-88, 21], [-87, 16], [-83, 15], [-83, 10], [-79, 9], [-77, 8], [-80, 7.5], [-84, 9], [-87, 13],
    [-92, 14.5], [-96, 16], [-105, 20], [-110, 24], [-117, 32], [-124, 40], [-130, 56]],
  // Caribbean islands, roughly
  [[-85, 22], [-80, 23], [-74, 20], [-68, 18.5], [-72, 18], [-78, 19.5], [-85, 22]],
  // South America
  [[-77, 8], [-72, 12], [-62, 11], [-52, 5], [-50, 0], [-44, -2], [-35, -5], [-35, -9], [-39, -15], [-41, -22], [-48, -26],
    [-53, -34], [-58, -38], [-65, -41], [-68, -50], [-72, -50], [-74, -40], [-71, -30], [-70, -18], [-76, -14], [-81, -6],
    [-80, -1], [-78, 2], [-77, 8]],
  // Europe
  [[-10, 36], [-9, 44], [-1.5, 44], [-4.5, 48], [2, 51], [8, 54], [25, 57], [56, 57], [56, 42], [40, 41], [28, 41],
    [26, 38], [23, 36.5], [20, 40], [16, 38], [12, 44], [8, 44], [3, 43], [0, 39], [-2, 36.8], [-5.6, 36], [-10, 36]],
  // Great Britain
  [[-6, 50], [2, 51], [0, 53.5], [-3, 57], [-5.5, 55], [-6, 50]],
  // Africa
  [[-17, 21], [-13, 28], [-6, 35.8], [10, 37], [11, 33], [20, 31], [32, 31], [34, 28], [43, 12], [51, 12], [40, -3],
    [40, -15], [35, -24], [32, -29], [27, -34], [20, -35], [18, -30], [12, -17], [13, -5], [9, 4], [5, 5], [-8, 4],
    [-13, 8], [-17, 14], [-17, 21]],
  // Arabian peninsula
  [[34, 28], [35, 32], [47, 30], [56, 26], [59, 22], [52, 16], [43, 12], [39, 21], [34, 28]],
  // Madagascar
  [[44, -25], [47, -25], [50, -15], [49, -12], [44, -17], [44, -25]],
];
const dentro = (lon: number, lat: number, poli: LonLat[]) => {
  let si = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, yi] = poli[i], [xj, yj] = poli[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) si = !si;
  }
  return si;
};
// Where Sol Solidario has taken light (SolSolidario.tsx, GRUPOS)
const LUCES = [
  { n: 'España', ll: [-3.7, 40.2] as LonLat, origen: true },
  { n: 'Honduras', ll: [-86.5, 14.8] as LonLat },
  { n: 'La Guajira', ll: [-72.6, 11.4] as LonLat },
  { n: 'Amazonas', ll: [-50.5, -1.7] as LonLat },
  { n: 'Kenia', ll: [37.5, 0.2] as LonLat },
  { n: 'Mozambique', ll: [35, -18] as LonLat },
];

export function VisualSolSolidario() {
  const W = 320, H = 128;
  const lon0 = -112, lon1 = 58, lat0 = 50, lat1 = -40;
  const x0 = 106, x1 = 312, y0 = 14, y1 = 124;
  const px = (lon: number) => x0 + ((lon - lon0) / (lon1 - lon0)) * (x1 - x0);
  const py = (lat: number) => y0 + ((lat0 - lat) / (lat0 - lat1)) * (y1 - y0);
  const paso = 4.2;
  const puntos: [number, number][] = [];
  for (let y = y0 + paso / 2; y < y1; y += paso) {
    for (let x = x0 + paso / 2; x < x1; x += paso) {
      const lon = lon0 + ((x - x0) / (x1 - x0)) * (lon1 - lon0), lat = lat0 - ((y - y0) / (y1 - y0)) * (lat0 - lat1);
      if (CONTINENTES.some(p => dentro(lon, lat, p))) puntos.push([r1(x), r1(y)]);
    }
  }
  const [ox, oy] = [px(LUCES[0].ll[0]), py(LUCES[0].ll[1])];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img"
      aria-label="Mapa con puntos de luz donde Sol Solidario ha llevado energía solar: centros de acogida en España y comunidades sin electricidad en Honduras, La Guajira, el Amazonas, Kenia y Mozambique. Más de 30.000 personas con luz solar en 6 países">
      <defs>
        <radialGradient id="du-sol-brillo">
          <stop offset="0" stopColor="currentColor" className="text-amber-300" stopOpacity={0.95} />
          <stop offset="0.45" stopColor="currentColor" className="text-amber-300" stopOpacity={0.45} />
          <stop offset="1" stopColor="currentColor" className="text-amber-200" stopOpacity={0} />
        </radialGradient>
      </defs>
      {puntos.filter(([x]) => x > 124).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.15} className="fill-slate-300" />)}

      {/* From Spain, light to each place */}
      {LUCES.slice(1).map((l, i) => {
        const x = px(l.ll[0]), y = py(l.ll[1]), mx = (ox + x) / 2, my = Math.min(oy, y) - 6 - Math.abs(ox - x) * 0.1;
        return <path key={l.n} d={`M${r1(ox)},${r1(oy)} Q${r1(mx)},${r1(my)} ${r1(x)},${r1(y)}`} fill="none"
          className="stroke-amber-400" strokeWidth={0.9} strokeDasharray="2 2.5" opacity={0.85} style={{ transitionDelay: `${i * 50}ms` }} />;
      })}
      {LUCES.map((l, i) => {
        const x = r1(px(l.ll[0])), y = r1(py(l.ll[1]));
        return (
          <g key={l.n}>
            <circle cx={x} cy={y} r={l.origen ? 9 : 8} fill="url(#du-sol-brillo)"
              className="origin-center transition-transform duration-500 [transform-box:fill-box] group-hover:scale-125" style={{ transitionDelay: `${i * 60}ms` }} />
            <circle cx={x} cy={y} r={2.4} className={l.origen ? 'fill-amber-600 stroke-white' : 'fill-amber-500 stroke-white'} strokeWidth={0.8} />
          </g>
        );
      })}
      <text x={r1(ox) - 2} y={r1(oy) - 9} textAnchor="end" className="fill-slate-600 text-[7.5px] font-semibold">España</text>
      <text x={r1(px(-50.5)) + 6} y={r1(py(-1.7)) + 11} className="fill-slate-600 text-[7.5px] font-semibold">Amazonas</text>
      <text x={r1(px(37.5)) + 7} y={r1(py(0.2)) + 3} className="fill-slate-600 text-[7.5px] font-semibold">Kenia</text>

      <g transform="translate(14 0)">
        <text y={26} className="fill-slate-500 text-[9px] uppercase tracking-[0.14em]">Luz solidaria</text>
        <text y={52} className="fill-slate-900 text-[22px] font-bold tracking-tight">+30.000</text>
        <text y={65} className="fill-slate-500 text-[9.5px]">personas con luz solar</text>
        <text y={90} className="fill-slate-700 text-[13px] font-semibold">6 países</text>
        <text y={103} className="fill-slate-500 text-[9.5px]">España, América, África</text>
      </g>
    </svg>
  );
}

/* ── Optimización del sistema de energía: la cadena de valor, con IA ── */
const PASOS = ['Diseño', 'Venta', 'Instalación', 'Monitorización'];

export function VisualOptimizacionEnergia() {
  const W = 320, H = 128;
  const cx0 = 28, cx1 = 300, cy0 = 22, base = 70;
  const hx = (h: number) => cx0 + ((h - 5) / 17) * (cx1 - cx0); // 5h … 22h
  const linea = (f: (h: number) => number) => {
    let d = '';
    for (let h = 5; h <= 22.001; h += 0.25) d += `${d ? 'L' : 'M'}${r1(hx(h))},${r1(base - f(h))}`;
    return d;
  };
  const sol = (h: number) => 44 * Math.exp(-((h - 13.5) ** 2) / (2 * 2.6 ** 2));
  const antes = (h: number) => 8 + 16 * Math.exp(-((h - 8) ** 2) / 1.6) + 22 * Math.exp(-((h - 20.5) ** 2) / 2.2);
  const ahora = (h: number) => 7 + 30 * Math.exp(-((h - 13.2) ** 2) / (2 * 2.4 ** 2)) + 7 * Math.exp(-((h - 20.5) ** 2) / 2.2);
  const xs = PASOS.map((_, i) => 44 + i * 74), ny = 98;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img"
      aria-label="Cadena de valor de la energía solar optimizada con inteligencia artificial: diseño, venta, instalación y monitorización, y la curva de consumo ajustada a la producción solar hora a hora">
      <defs>
        <linearGradient id="du-opt-sol" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" className="text-amber-300" stopOpacity={0.85} />
          <stop offset="1" stopColor="currentColor" className="text-amber-100" stopOpacity={0.2} />
        </linearGradient>
      </defs>
      {/* Hourly chart */}
      {[0, 1, 2].map(k => <line key={k} x1={cx0} x2={cx1} y1={base - 16 * (k + 1)} y2={base - 16 * (k + 1)} className="stroke-slate-200" strokeDasharray="2 3" strokeWidth={0.7} />)}
      <path d={`${linea(sol)} L${hx(22)},${base} L${hx(5)},${base} Z`} fill="url(#du-opt-sol)" />
      <path d={linea(sol)} fill="none" className="stroke-amber-500" strokeWidth={1.3} />
      <path d={linea(antes)} fill="none" className="stroke-slate-400" strokeWidth={1.1} strokeDasharray="3 2.5" />
      <path d={linea(ahora)} fill="none" className="stroke-violet-600 transition-all duration-500 group-hover:stroke-violet-700" strokeWidth={2} strokeLinecap="round" />
      <line x1={cx0} x2={cx1} y1={base} y2={base} className="stroke-slate-300" strokeWidth={0.8} />
      {[6, 10, 14, 18, 22].map(h => <text key={h} x={hx(h)} y={base + 9} textAnchor="middle" className="fill-slate-400 text-[7px]">{h}h</text>)}

      {/* AI chip, beside the evening tail of the line (not over the sun's peak) */}
      <g transform={`translate(${r1(hx(19))} ${r1(base - 44)})`}>
        <rect x={0} y={0} width={22} height={13} rx={6.5} className="fill-violet-600" />
        <path d="M5.5,3.5 L6.4,5.6 L8.5,6.5 L6.4,7.4 L5.5,9.5 L4.6,7.4 L2.5,6.5 L4.6,5.6 Z" className="fill-white" />
        <text x={14.5} y={9.4} textAnchor="middle" className="fill-white text-[7.5px] font-bold">IA</text>
      </g>

      {/* Legend */}
      <g transform="translate(28 11)">
        <text className="fill-slate-500 text-[9px] uppercase tracking-[0.14em]">Hora a hora</text>
      </g>
      <g transform="translate(196 11)" className="text-[7.5px]">
        <rect x={0} y={-5} width={8} height={5} rx={1} className="fill-amber-300" />
        <text x={11} y={0} className="fill-slate-600">sol</text>
        <line x1={28} x2={38} y1={-2.5} y2={-2.5} className="stroke-slate-400" strokeDasharray="3 2" />
        <text x={41} y={0} className="fill-slate-600">antes</text>
        <line x1={66} x2={76} y1={-2.5} y2={-2.5} className="stroke-violet-600" strokeWidth={2} />
        <text x={79} y={0} className="fill-slate-600">con IA</text>
      </g>

      {/* The value chain */}
      <line x1={xs[0]} x2={xs[3]} y1={ny} y2={ny} className="stroke-violet-200" strokeWidth={3} strokeLinecap="round" />
      {xs.slice(0, -1).map((x, i) => (
        <path key={i} d={`M${x + 35},${ny - 3} L${x + 39},${ny} L${x + 35},${ny + 3}`} fill="none" className="stroke-violet-400" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {xs.map((x, i) => (
        <g key={PASOS[i]} className="transition-transform duration-500 group-hover:-translate-y-0.5" style={{ transitionDelay: `${i * 60}ms` }}>
          <circle cx={x + 1} cy={ny + 1.5} r={11} className="fill-slate-900" opacity={0.07} />
          <circle cx={x} cy={ny} r={11} className="fill-white stroke-violet-500" strokeWidth={1.4} />
          {i === 0 && <g>
            <path d={`M${x - 6},${ny + 4} L${x - 3},${ny - 4} L${x + 6},${ny - 4} L${x + 3},${ny + 4} Z`} className="fill-sky-600" />
            <path d={`M${x - 4.5},${ny} L${x + 4.5},${ny} M${x},${ny - 4} L${x - 1.5},${ny + 4}`} className="stroke-sky-200" strokeWidth={0.6} />
          </g>}
          {i === 1 && <g>
            <rect x={x - 4.5} y={ny - 6} width={9} height={12} rx={1} className="fill-violet-50 stroke-violet-500" strokeWidth={0.9} />
            <path d={`M${x - 2.5},${ny - 2.5} L${x + 2.5},${ny - 2.5} M${x - 2.5},${ny} L${x + 1.5},${ny}`} className="stroke-violet-400" strokeWidth={0.8} />
            <path d={`M${x - 2},${ny + 3} L${x - 0.6},${ny + 4.3} L${x + 2.4},${ny + 1.6}`} fill="none" className="stroke-emerald-500" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" />
          </g>}
          {i === 2 && <g>
            <path d={`M${x - 6},${ny + 2} C${x - 6},${ny - 6} ${x + 6},${ny - 6} ${x + 6},${ny + 2} Z`} className="fill-amber-400" />
            <rect x={x - 7.5} y={ny + 1.5} width={15} height={2.6} rx={1.2} className="fill-amber-500" />
            <line x1={x} y1={ny - 4.5} x2={x} y2={ny + 1.5} className="stroke-amber-200" strokeWidth={1} />
          </g>}
          {i === 3 && <path d={`M${x - 6},${ny + 3} L${x - 3},${ny} L${x},${ny + 1.5} L${x + 3},${ny - 4} L${x + 6},${ny - 2}`}
            fill="none" className="stroke-violet-600" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />}
          <text x={x} y={ny + 22} textAnchor="middle" className="fill-slate-700 text-[8.5px] font-semibold">{PASOS[i]}</text>
        </g>
      ))}
    </svg>
  );
}

/* ── Tienda Solar Solidaria: lo que se vende ilumina a quien no tiene luz ── */

/** A solar lantern: handle, panel on top, glowing body. */
function Farol({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx={0} cy={4} r={11} className="fill-amber-200" opacity={0.45} />
      <path d="M-4,-8 C-4,-13 4,-13 4,-8" fill="none" className="stroke-slate-500" strokeWidth={1.2} />
      <rect x={-6} y={-8} width={12} height={4} rx={1} className="fill-sky-700" />
      <line x1={0} y1={-8} x2={0} y2={-4} className="stroke-sky-300" strokeWidth={0.5} />
      <rect x={-5} y={-4} width={10} height={13} rx={2} className="fill-amber-300 stroke-amber-500" strokeWidth={0.8} />
      <rect x={-6} y={9} width={12} height={3} rx={1} className="fill-slate-600" />
    </g>
  );
}

export function VisualTiendaSolar() {
  const W = 320, H = 128;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img"
      aria-label="Tienda solar solidaria: lámparas, kits y paneles solares a la venta; por cada lámpara vendida se regala otra y los beneficios financian proyectos sociales">
      <defs>
        <clipPath id="du-tienda-toldo"><rect x={18} y={16} width={150} height={14} rx={2} /></clipPath>
      </defs>
      {/* The shop */}
      <rect x={24} y={30} width={140} height={80} rx={2} className="fill-slate-900" opacity={0.06} transform="translate(2 2)" />
      <rect x={24} y={30} width={140} height={80} rx={2} className="fill-white stroke-slate-300" strokeWidth={0.9} />
      <g clipPath="url(#du-tienda-toldo)">
        {Array.from({ length: 10 }, (_, i) => <rect key={i} x={18 + i * 15} y={16} width={15} height={14} className={i % 2 ? 'fill-white' : 'fill-amber-400'} />)}
      </g>
      <path d={Array.from({ length: 10 }, (_, i) => `M${18 + i * 15},30 a7.5,4 0 0,0 15,0`).join(' ')} className="fill-amber-400" />
      <rect x={18} y={16} width={150} height={14} rx={2} fill="none" className="stroke-amber-500" strokeWidth={0.8} />

      {/* Top shelf: three lanterns */}
      <line x1={30} x2={158} y1={68} y2={68} className="stroke-slate-400" strokeWidth={1.6} strokeLinecap="round" />
      <Farol x={48} y={56} />
      <Farol x={74} y={56} />
      <Farol x={100} y={58} s={0.8} />
      {/* A kit: panel, battery and bulb */}
      <g>
        <path d="M118,62 L124,46 L150,46 L144,62 Z" className="fill-sky-700" />
        <path d="M121,54 L147,54 M132.6,46 L126.6,62 M141.3,46 L135.3,62" className="stroke-sky-300" strokeWidth={0.5} />
        <line x1={140} y1={62} x2={140} y2={67} className="stroke-slate-500" strokeWidth={1} />
      </g>
      {/* Bottom shelf: a panel, a kit box, a bulb */}
      <line x1={30} x2={158} y1={104} y2={104} className="stroke-slate-400" strokeWidth={1.6} strokeLinecap="round" />
      <g>
        <rect x={36} y={76} width={26} height={28} rx={1.5} className="fill-sky-800" />
        {[1, 2].map(j => <line key={j} x1={36 + (26 * j) / 3} x2={36 + (26 * j) / 3} y1={76} y2={104} className="stroke-sky-400" strokeWidth={0.5} />)}
        {[1, 2, 3].map(j => <line key={j} x1={36} x2={62} y1={76 + 7 * j} y2={76 + 7 * j} className="stroke-sky-400" strokeWidth={0.5} />)}
      </g>
      <g>
        <rect x={70} y={84} width={34} height={20} rx={2} className="fill-amber-50 stroke-amber-400" strokeWidth={0.9} />
        <circle cx={80} cy={94} r={4} className="fill-amber-400" />
        <text x={86} y={96.5} className="fill-amber-800 text-[6.5px] font-bold">KIT</text>
      </g>
      <g>
        <rect x={112} y={88} width={14} height={16} rx={2} className="fill-slate-700" />
        <rect x={115} y={86} width={8} height={3} rx={1} className="fill-slate-500" />
        <path d="M120.5,90 L115.5,97 L118.6,97 L117.4,102 L122.5,95 L119.4,95 Z" className="fill-emerald-400" />
        <circle cx={142} cy={94} r={6} className="fill-amber-100 stroke-amber-400" strokeWidth={0.9} />
        <rect x={139.5} y={99.5} width={5} height={4.5} rx={1} className="fill-slate-400" />
      </g>
      <text x={94} y={122} textAnchor="middle" className="fill-slate-500 text-[7.5px] uppercase tracking-[0.12em]">la tienda</text>

      {/* Profits travel to a social project */}
      <path d="M172,78 C188,62 208,62 224,78" fill="none" className="stroke-emerald-500" strokeWidth={1.4} strokeDasharray="2.5 3" strokeLinecap="round" />
      <path d="M218.5,74.5 L224.5,79 L217,80.5" fill="none" className="stroke-emerald-500" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      <g className="transition-transform duration-500 group-hover:-translate-y-1">
        <path d="M198,62 C198,58 192,57 192,62 C192,65 198,68 198,68 C198,68 204,65 204,62 C204,57 198,58 198,62 Z" className="fill-rose-500" />
      </g>
      <text x={198} y={96} textAnchor="middle" className="fill-emerald-700 text-[7.5px] font-semibold">beneficios</text>

      {/* The family with the lamp given */}
      <path d="M222,108 C246,98 282,98 306,108 Z" className="fill-emerald-100" />
      <rect x={244} y={84} width={38} height={24} rx={1} className="fill-slate-900" opacity={0.06} transform="translate(2 2)" />
      <path d="M239,85 L263,68 L287,85 Z" className="fill-amber-700" opacity={0.85} />
      <rect x={244} y={84} width={38} height={24} rx={1} className="fill-orange-100 stroke-orange-300" strokeWidth={0.8} />
      <rect x={257} y={91} width={12} height={17} rx={1} className="fill-slate-700" />
      <Farol x={263} y={99} s={0.55} />
      <g className="fill-slate-600">
        <circle cx={295} cy={90} r={3} />
        <path d="M290.5,108 L291,98 C291,94 299,94 299,98 L299.5,108 Z" />
        <circle cx={233} cy={95} r={2.2} />
        <path d="M229.8,108 L230.2,100.5 C230.2,98 235.8,98 235.8,100.5 L236.2,108 Z" />
      </g>

      <g transform="translate(263 0)">
        <text y={16} textAnchor="middle" className="fill-slate-500 text-[9px] uppercase tracking-[0.14em]">Comprar ilumina</text>
        <text y={36} textAnchor="middle" className="fill-slate-900 text-[16px] font-bold">1 + 1</text>
        <text y={48} textAnchor="middle" className="fill-slate-500 text-[8px]">una vendida, otra regalada</text>
      </g>
      <text x={263} y={122} textAnchor="middle" className="fill-slate-500 text-[7.5px] uppercase tracking-[0.12em]">proyectos sociales</text>
    </svg>
  );
}
