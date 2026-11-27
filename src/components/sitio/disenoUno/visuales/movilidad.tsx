// ============================================================================
// DISEÑO 1 · MOVILIDAD: the card illustrations of the six mobility tools (2026-11-27)
// ============================================================================
// Same visual language as `src/components/politica/VisualesHerramientas.tsx`: hand-drawn SVG,
// Tailwind colour classes, thin strokes, one small spaced-out caption and, where there is one,
// a real figure in bold. Every picture is 320×128 (the card header is 360×144).
//
// The figures are the ones the tools themselves state:
//   · Aeromóvil: 4 kWh/100 km at 100 km/h, what the model promises
//     (`src/components/aeromovil/departamentos/propulsion.ts`). 4 kWh ≈ 0,45 L of petrol (8,9 kWh/L).
//   · Aptera: «hasta 64 km al día solo con sol» (40 miles a day, the maker's figure).
//   · Barco solar: 20 passengers, Breves (Pará, Brazil).
//   · Bicicleta solar: «Pedaleo Solar», 3.890 km across Spain. The route drawn is only a hint,
//     not the real itinerary.
// No brand logos: the Aptera is our own drawing of a low three-wheel teardrop.

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Card header backgrounds, one per illustration. */
export const FONDOS: Record<string, string> = {
  VisualAeromovil: 'bg-gradient-to-br from-sky-50 via-white to-amber-50',
  VisualAptera: 'bg-gradient-to-br from-amber-50 via-white to-sky-50',
  VisualBarcoSolar: 'bg-gradient-to-b from-sky-50 via-white to-emerald-50',
  VisualTriciclosReparto: 'bg-gradient-to-br from-emerald-50 via-white to-amber-50',
  VisualBicicletaSolar: 'bg-gradient-to-br from-yellow-50 via-white to-sky-50',
  VisualCompeticionSolar: 'bg-gradient-to-br from-indigo-50 via-white to-amber-50',
};

/* ── Shared pieces ─────────────────────────────────────────────────────────── */

/** A small sun: disc and eight short rays. */
function Sol({ x, y, r = 6 }: { x: number; y: number; r?: number }) {
  return (
    <g className="origin-center transition-transform duration-700 group-hover:rotate-12" style={{ transformBox: 'fill-box' }}>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return <line key={i} x1={r1(x + Math.cos(a) * (r + 2.5))} y1={r1(y + Math.sin(a) * (r + 2.5))}
          x2={r1(x + Math.cos(a) * (r + 6))} y2={r1(y + Math.sin(a) * (r + 6))}
          className="stroke-amber-400" strokeWidth={1.4} strokeLinecap="round" />;
      })}
      <circle cx={x} cy={y} r={r} className="fill-amber-300 stroke-amber-400" strokeWidth={1} />
    </g>
  );
}

/** A spoked bicycle wheel: tyre, rim, hub and `n` spokes. */
function RuedaBici({ x, y, r, n = 12, claro = false }: { x: number; y: number; r: number; n?: number; claro?: boolean }) {
  return (
    <g opacity={claro ? 0.3 : 1}>
      <circle cx={x} cy={y} r={r} fill="none" className="stroke-slate-700" strokeWidth={2.2} />
      <circle cx={x} cy={y} r={r - 2} fill="none" className="stroke-slate-300" strokeWidth={0.6} />
      {Array.from({ length: n }, (_, i) => {
        const a = (i * 2 * Math.PI) / n;
        return <line key={i} x1={x} y1={y} x2={r1(x + Math.cos(a) * (r - 2))} y2={r1(y + Math.sin(a) * (r - 2))}
          className="stroke-slate-400" strokeWidth={0.45} />;
      })}
      <circle cx={x} cy={y} r={1.6} className="fill-slate-600" />
    </g>
  );
}

/* ── Aeromóvil: the teardrop in the wind ───────────────────────────────────── */

// The Aeromóvil as Eugenio drew it (render of 2026-11-27): a long white teardrop with a navy belly and nose, a red
// pinstripe where the two colours meet, a big tinted bubble canopy with solar cells on its roof and on the bonnet,
// and four wheels in egg-shaped fairings set out on struts, away from the body. Side view, slightly from below
// the line of the car so the near fairings sit in front of the body.
const GOTA = 'M14,79 C14,69 26,63 52,60 C72,36 102,20 134,19 C170,18 196,31 218,45 C232,52 242,55 250,57 C240,67 222,75 198,79 C154,85 74,87 40,86 C22,85 14,83 14,79 Z';
const VIENTRE = 'M0,77 C80,76 170,70 252,55 L252,128 L0,128 Z';
const CUPULA = 'M58,59 C78,35 104,21 134,20 C168,19 192,32 212,46 C180,50 116,54 58,59 Z';

/** One wheel fairing: an egg, white over navy with the red line, the tyre just showing under it. */
function Carenado({ x, y, lejos = false }: { x: number; y: number; lejos?: boolean }) {
  const id = `du-aero-car-${x}`;
  return (
    <g opacity={lejos ? 0.5 : 1}>
      <rect x={x - 10} y={y + 8} width={20} height={10} rx={4.5} className="fill-slate-800" />
      <rect x={x - 5} y={y + 11} width={10} height={4} rx={2} className="fill-slate-400" />
      <clipPath id={id}><ellipse cx={x} cy={y} rx={18} ry={14} /></clipPath>
      <ellipse cx={x} cy={y} rx={18} ry={14} className="fill-indigo-950" />
      <g clipPath={`url(#${id})`}>
        <path d={`M${x - 18},${y - 1} C${x - 8},${y - 3} ${x + 8},${y - 3} ${x + 18},${y - 1} L${x + 18},${y - 14} L${x - 18},${y - 14} Z`} fill="url(#du-aero-casco)" />
        <path d={`M${x - 18},${y - 1} C${x - 8},${y - 3} ${x + 8},${y - 3} ${x + 18},${y - 1}`} fill="none" className="stroke-red-500" strokeWidth={1.1} />
        <path d={`M${x - 11},${y - 8} C${x - 5},${y - 11} ${x + 3},${y - 11} ${x + 8},${y - 9}`} fill="none" className="stroke-white" strokeWidth={1.4} strokeLinecap="round" opacity={0.9} />
      </g>
      <ellipse cx={x} cy={y} rx={18} ry={14} fill="none" className="stroke-white" strokeWidth={1.2} />
    </g>
  );
}

export function VisualAeromovil() {
  const corrientes = [
    'M2,18 C52,18 80,6 134,6 C182,6 220,24 262,42',
    'M2,34 C34,34 56,18 110,16 C158,15 200,30 258,58',
    'M2,52 C18,52 30,40 54,36',
    'M2,104 C24,104 40,104 56,108',
  ];
  return (
    <svg viewBox="0 0 320 128" className="h-full w-full" role="img"
      aria-label="Aeromóvil: vehículo en forma de gota, blanco y azul marino, con cúpula de cristal y techo solar y las cuatro ruedas en carenados separados del cuerpo; consume 4 kWh cada 100 km a 100 km/h">
      <defs>
        <linearGradient id="du-aero-aire" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="262" y2="0">
          <stop offset="0" stopColor="#38bdf8" stopOpacity={0} />
          <stop offset="0.25" stopColor="#38bdf8" stopOpacity={0.7} />
          <stop offset="0.8" stopColor="#38bdf8" stopOpacity={0.45} />
          <stop offset="1" stopColor="#38bdf8" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="du-aero-casco" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="du-aero-cristal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#475569" />
          <stop offset="0.55" stopColor="#1e293b" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
        <clipPath id="du-aero-cuerpo"><path d={GOTA} /></clipPath>
        <clipPath id="du-aero-cupula"><path d={CUPULA} /></clipPath>
      </defs>

      {/* Air streaming around the body */}
      {corrientes.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="url(#du-aero-aire)" strokeWidth={i < 2 ? 1.3 : 1.1} strokeLinecap="round"
          strokeDasharray={i === 0 ? '10 5' : undefined} />
      ))}

      <Sol x={248} y={13} r={5} />

      <g className="transition-transform duration-700 group-hover:translate-x-1">
        {/* Road and shadow */}
        <ellipse cx={136} cy={115} rx={112} ry={3.4} className="fill-slate-900" opacity={0.1} />
        <line x1={6} x2={254} y1={116.5} y2={116.5} className="stroke-slate-200" strokeWidth={1} />

        {/* The far fairings, peeking out behind the body */}
        <Carenado x={76} y={96} lejos />
        <Carenado x={222} y={92} lejos />

        {/* Struts from the body out to the near fairings */}
        <path d="M50,85 L58,96 M80,86 L70,96 M190,80 L200,92 M224,74 L214,92" className="stroke-indigo-950" strokeWidth={3} strokeLinecap="round" />

        {/* Body: white teardrop, navy belly and nose, red line between */}
        <path d={GOTA} fill="url(#du-aero-casco)" />
        <g clipPath="url(#du-aero-cuerpo)">
          <path d={VIENTRE} className="fill-indigo-950" />
          <path d="M0,77 C80,76 170,70 252,55" fill="none" className="stroke-red-500" strokeWidth={1.3} />
          <path d="M0,75 C80,74 170,68 252,53" fill="none" className="stroke-white" strokeWidth={0.8} opacity={0.8} />
          {/* Navy nose cone and its light */}
          <path d="M12,86 C10,72 18,64 32,63 C30,70 30,80 34,90 Z" className="fill-indigo-950" />
          <path d="M17,80 h7" className="stroke-white" strokeWidth={1.4} strokeLinecap="round" strokeDasharray="1.2 1.2" />
          {/* Solar cells on the bonnet */}
          <path d="M30,64 C38,60 50,58 60,58 C56,63 48,68 36,71 Z" className="fill-indigo-800" />
          <path d="M34,64 l20,-5 M35,67 l18,-5 M42,59 l2,10 M50,58 l2,8" className="stroke-sky-300" strokeWidth={0.5} opacity={0.7} />
          {/* Side shine */}
          <path d="M100,63 C140,61 180,56 212,50" fill="none" className="stroke-white" strokeWidth={2} strokeLinecap="round" opacity={0.9} />
          <path d="M222,54 l10,-2" className="stroke-indigo-950" strokeWidth={2} strokeLinecap="round" />
        </g>
        <path d={GOTA} fill="none" className="stroke-slate-300" strokeWidth={0.9} />

        {/* The bubble canopy: tinted glass, two people, solar cells on the roof */}
        <path d={CUPULA} fill="url(#du-aero-cristal)" />
        <g clipPath="url(#du-aero-cupula)">
          <g className="fill-slate-400" opacity={0.75}>
            <circle cx={116} cy={38} r={5} /><path d="M106,58 C106,46 126,46 126,58 Z" />
            <circle cx={152} cy={37} r={5} /><path d="M142,58 C142,45 162,45 162,58 Z" />
          </g>
          <path d="M72,46 C90,32 110,25 132,24 C160,23 182,30 200,40" fill="none" className="stroke-indigo-700" strokeWidth={9} />
          <path d="M72,46 C90,32 110,25 132,24 C160,23 182,30 200,40" fill="none" className="stroke-sky-300" strokeWidth={9}
            strokeDasharray="0.6 5.4" opacity={0.6} />
          <path d="M68,55 C84,40 98,34 112,32" fill="none" className="stroke-white" strokeWidth={1.6} strokeLinecap="round" opacity={0.45} />
          <path d="M178,34 L182,52" className="stroke-slate-600" strokeWidth={1.2} />
        </g>
        <path d={CUPULA} fill="none" className="stroke-indigo-950" strokeWidth={1.4} />

        {/* The near fairings */}
        <Carenado x={62} y={100} />
        <Carenado x={208} y={98} />
      </g>

      {/* The figure */}
      <g transform="translate(261 -4)">
        <text y={36} className="fill-slate-500 text-[8.5px] uppercase tracking-[0.14em]">Consumo</text>
        <text y={70} className="fill-slate-900 text-[32px] font-bold">4</text>
        <text x={21} y={70} className="fill-slate-900 text-[11px] font-bold">kWh</text>
        <text y={84} className="fill-slate-500 text-[9.5px]">cada 100 km</text>
        <text y={96} className="fill-slate-500 text-[9.5px]">a 100 km/h</text>
        <text y={112} className="fill-emerald-600 text-[8.5px] font-semibold">≈ 0,45 L</text>
        <text y={122} className="fill-emerald-600 text-[8.5px] font-semibold">de gasolina</text>
      </g>
    </svg>
  );
}

/* ── Aptera: a low teardrop seen from above, covered in cells ──────────────── */

// Drawn nose to the left in local coordinates, then mirrored so it drives to the right.
const APTERA = 'M34,64 C34,47 58,40 92,40 C140,40 186,52 212,59 C217,61 217,67 212,69 C186,76 140,88 92,88 C58,88 34,81 34,64 Z';

export function VisualAptera() {
  const vainas = [20, 108];
  return (
    <svg viewBox="0 0 320 128" className="h-full w-full" role="img"
      aria-label="Coche solar de tres ruedas visto desde arriba: forma de lágrima muy baja cubierta de células solares, con las ruedas delanteras carenadas; hasta 64 km al día solo con sol">
      <defs>
        <clipPath id="du-aptera-cuerpo"><path d={APTERA} /></clipPath>
        <linearGradient id="du-aptera-cristal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#bae6fd" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
      </defs>

      {/* The road: lane marks above and below */}
      {[6, 122].map(y => (
        <line key={y} x1={96} x2={318} y1={y} y2={y} className="stroke-slate-200" strokeWidth={1.4} strokeDasharray="14 9" />
      ))}
      {[50, 64, 78].map((y, i) => (
        <line key={y} x1={98 - i * 4} x2={80 - i * 4} y1={y} y2={y} className="stroke-slate-300" strokeWidth={1.2} strokeLinecap="round" />
      ))}

      <g className="transition-transform duration-700 group-hover:translate-x-1">
        <g transform="translate(318 0) scale(-1 1)">
          {/* Soft shadow */}
          <g transform="translate(-3 4)" opacity={0.08} className="fill-slate-900">
            <path d={APTERA} />
            {vainas.map(y => <ellipse key={y} cx={82} cy={y} rx={19} ry={6.5} />)}
          </g>
          {/* Arms that carry the faired front wheels */}
          {vainas.map(y => (
            <path key={y} d={y < 64 ? 'M70,46 C74,36 78,30 80,26 L94,26 C92,32 92,38 96,44 Z' : 'M70,82 C74,92 78,98 80,102 L94,102 C92,96 92,90 96,84 Z'}
              className="fill-white stroke-slate-300" strokeWidth={0.8} />
          ))}
          {/* The faired wheels: a white pod with the tyre showing underneath */}
          {vainas.map(y => (
            <g key={y}>
              <path d={`M60,${y} C60,${y - 6} 70,${y - 7.5} 84,${y - 7.5} C96,${y - 7.5} 104,${y - 3} 106,${y} C104,${y + 3} 96,${y + 7.5} 84,${y + 7.5} C70,${y + 7.5} 60,${y + 6} 60,${y} Z`}
                className="fill-white stroke-slate-300" strokeWidth={1} />
              <rect x={70} y={y - 1.6} width={24} height={3.2} rx={1.6} className="fill-slate-800" />
            </g>
          ))}
          {/* Body: white shell, solar cells on the top surfaces */}
          <path d={APTERA} className="fill-white" />
          <g clipPath="url(#du-aptera-cuerpo)">
            <g transform="translate(14 6.4) scale(0.9)"><path d={APTERA} className="fill-indigo-500" /></g>
            {Array.from({ length: 22 }, (_, i) => (
              <line key={`v${i}`} x1={44 + i * 8} x2={44 + i * 8} y1={36} y2={92} className="stroke-indigo-200" strokeWidth={0.6} opacity={0.8} />
            ))}
            {Array.from({ length: 6 }, (_, i) => (
              <line key={`h${i}`} x1={40} x2={220} y1={44 + i * 8} y2={44 + i * 8} className="stroke-indigo-200" strokeWidth={0.6} opacity={0.8} />
            ))}
            {/* Wide, wrap-around windscreen for the two seats */}
            <path d="M60,49 C70,44 86,43 100,43 L110,43 C104,54 104,74 110,85 L100,85 C86,85 70,84 60,79 C55,70 55,58 60,49 Z"
              fill="url(#du-aptera-cristal)" className="stroke-white" strokeWidth={1.5} />
            <path d="M66,52 C74,48 86,47 96,47" fill="none" className="stroke-white" strokeWidth={1.3} strokeLinecap="round" opacity={0.5} />
            {/* Navy nose tip */}
            <path d="M34,64 C34,52 40,46 46,44 C42,52 42,76 46,84 C40,82 34,76 34,64 Z" className="fill-indigo-300" />
          </g>
          <path d={APTERA} fill="none" className="stroke-slate-300" strokeWidth={0.8} />
        </g>
      </g>

      {/* The figure */}
      <Sol x={24} y={24} r={6} />
      <text x={12} y={54} className="fill-slate-500 text-[8.5px] uppercase tracking-[0.14em]">Hasta</text>
      <text x={12} y={80} className="fill-slate-900 text-[26px] font-bold">64</text>
      <text x={46} y={80} className="fill-slate-900 text-[12px] font-bold">km</text>
      <text x={12} y={95} className="fill-slate-500 text-[9.5px]">al día, solo</text>
      <text x={12} y={107} className="fill-slate-500 text-[9.5px]">con el sol</text>
    </svg>
  );
}

/* ── Barco solar: twenty seats under a solar roof on the Amazon ────────────── */

const COPAS = [
  [8, 66, 11, 'fill-emerald-700'], [24, 60, 12, 'fill-emerald-600'], [42, 66, 10, 'fill-emerald-700'],
  [58, 58, 13, 'fill-emerald-600'], [78, 64, 11, 'fill-emerald-700'], [96, 57, 12, 'fill-emerald-500'],
  [116, 64, 11, 'fill-emerald-700'], [134, 58, 13, 'fill-emerald-600'], [154, 65, 10, 'fill-emerald-700'],
  [172, 56, 12, 'fill-emerald-500'], [190, 63, 11, 'fill-emerald-700'], [208, 58, 12, 'fill-emerald-600'],
  [228, 65, 11, 'fill-emerald-700'], [246, 59, 12, 'fill-emerald-500'], [266, 64, 11, 'fill-emerald-700'],
  [284, 58, 12, 'fill-emerald-600'], [304, 64, 12, 'fill-emerald-700'], [320, 60, 11, 'fill-emerald-600'],
] as const;

/** An açaí palm: a thin leaning trunk and drooping fronds. */
function Palmera({ x, alto, inclina = 0 }: { x: number; alto: number; inclina?: number }) {
  const tx = x + inclina, ty = 72 - alto;
  const hojas = [[-13, 5], [-9, 10], [-3, 12], [4, 11], [10, 8], [14, 3]];
  return (
    <g className="stroke-emerald-900" fill="none" strokeLinecap="round">
      <path d={`M${x},74 Q${x + inclina * 0.2},${72 - alto / 2} ${tx},${ty}`} strokeWidth={1.3} />
      {hojas.map(([dx, dy], i) => (
        <path key={i} d={`M${tx},${ty} Q${tx + dx * 0.6},${ty - 4} ${tx + dx},${ty + dy}`} strokeWidth={1.5} className="stroke-emerald-800" />
      ))}
    </g>
  );
}

export function VisualBarcoSolar() {
  const asientos = Array.from({ length: 10 }, (_, i) => 92 + i * 15.4);
  return (
    <svg viewBox="0 0 320 128" className="h-full w-full" role="img"
      aria-label="Barco eléctrico con techo de paneles solares y veinte pasajeros navegando por el río Amazonas, con la selva en la orilla, en Breves (Pará, Brasil)">
      <defs>
        <linearGradient id="du-barco-agua" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e7dfc9" />
          <stop offset="0.35" stopColor="#e0f2fe" />
          <stop offset="1" stopColor="#bae6fd" />
        </linearGradient>
        <clipPath id="du-barco-cielo"><rect x={0} y={0} width={320} height={80} /></clipPath>
      </defs>

      <Sol x={28} y={22} r={6.5} />

      {/* The far bank: rainforest canopy */}
      <g clipPath="url(#du-barco-cielo)">
        {COPAS.map(([x, y, r, c], i) => <circle key={i} cx={x} cy={y} r={r} className={c} opacity={0.6} />)}
        {COPAS.map(([x, y, r], i) => i % 2 ? <circle key={`l${i}`} cx={x - r * 0.3} cy={y - r * 0.35} r={r * 0.45} className="fill-emerald-400" opacity={0.35} /> : null)}
        <Palmera x={48} alto={40} inclina={-3} />
        <Palmera x={62} alto={34} inclina={3} />
        <Palmera x={286} alto={30} inclina={-2} />
        <rect x={0} y={68} width={320} height={12} className="fill-emerald-700" opacity={0.45} />
      </g>

      {/* The river */}
      <rect x={0} y={78} width={320} height={50} fill="url(#du-barco-agua)" />
      {[[16, 92, 40], [270, 100, 36], [30, 112, 30], [252, 118, 44], [150, 122, 28]].map(([x, y, w], i) => (
        <line key={i} x1={x} x2={x + w} y1={y} y2={y} className="stroke-white" strokeWidth={1} strokeLinecap="round" opacity={0.7} />
      ))}

      <g className="transition-transform duration-700 group-hover:translate-x-1">
        {/* Wake */}
        <path d="M64,98 C48,100 36,104 18,104" fill="none" className="stroke-white" strokeWidth={1.4} strokeLinecap="round" />
        <path d="M66,101 C52,106 40,110 26,112" fill="none" className="stroke-white" strokeWidth={1} strokeLinecap="round" opacity={0.8} />
        {/* Reflection */}
        <rect x={72} y={102} width={182} height={6} rx={3} className="fill-sky-700" opacity={0.12} />

        {/* Posts and solar roof */}
        {[80, 125, 170, 215, 248].map(x => <line key={x} x1={x} x2={x} y1={52} y2={88} className="stroke-slate-500" strokeWidth={1.3} />)}
        <path d="M70,46 L256,46 L252,53 L74,53 Z" className="fill-indigo-900" />
        {Array.from({ length: 15 }, (_, i) => (
          <line key={i} x1={82 + i * 12} x2={81.6 + i * 12} y1={46} y2={53} className="stroke-sky-300" strokeWidth={0.6} opacity={0.6} />
        ))}
        <line x1={72} x2={254} y1={49.5} y2={49.5} className="stroke-sky-300" strokeWidth={0.5} opacity={0.6} />
        <line x1={68} x2={258} y1={45.5} y2={45.5} className="stroke-slate-300" strokeWidth={1.2} strokeLinecap="round" />

        {/* Twenty passengers: two rows of ten */}
        {asientos.map((x, i) => (
          <g key={`b${i}`} className="fill-slate-400">
            <circle cx={x + 7} cy={67} r={2.8} />
            <path d={`M${x + 2.6},80 C${x + 2.6},73 ${x + 11.4},73 ${x + 11.4},80 Z`} />
          </g>
        ))}
        {asientos.map((x, i) => (
          <g key={`f${i}`} className="fill-slate-700">
            <circle cx={x} cy={70} r={3.1} />
            <path d={`M${x - 5},84 C${x - 5},75.5 ${x + 5},75.5 ${x + 5},84 Z`} />
          </g>
        ))}

        {/* Hull */}
        <path d="M60,84 L252,84 C262,84 270,80 276,74 L270,92 C266,99 258,101 246,101 L76,101 C66,101 62,96 60,90 Z"
          className="fill-white stroke-slate-300" strokeWidth={1} />
        <path d="M62,92 L268,90" className="stroke-emerald-500" strokeWidth={2} />
        <line x1={70} x2={262} y1={80} y2={80} className="stroke-slate-400" strokeWidth={0.8} />
        {/* Electric outboard */}
        <rect x={52} y={86} width={8} height={7} rx={1.5} className="fill-slate-600" />
        <line x1={55} x2={55} y1={93} y2={101} className="stroke-slate-600" strokeWidth={1.6} />
      </g>

      {/* The figure */}
      <text x={308} y={22} textAnchor="end" className="fill-slate-900 text-[16px] font-bold">20</text>
      <text x={308} y={34} textAnchor="end" className="fill-slate-600 text-[9px] font-semibold">pasajeros</text>
      <text x={10} y={123} className="fill-sky-900 text-[8.5px] uppercase tracking-[0.14em]" opacity={0.75}>Río Amazonas · Breves, Pará</text>
    </svg>
  );
}

/* ── Triciclos de reparto: charged by the sun, out on the last mile ────────── */

/** A front-box cargo trike in profile, driving right; origin at the rear hub on the ground line. */
function TricicloCarga({ con = true }: { con?: boolean }) {
  return (
    <g>
      <RuedaBici x={0} y={0} r={10} n={10} />
      <RuedaBici x={58} y={0} r={10} n={10} />
      {/* Frame */}
      <path d="M0,0 L14,-22 L22,0 Z M14,-22 L36,-28 M22,0 L44,-4 L58,0 M36,-28 L40,-6" fill="none"
        className="stroke-slate-600" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      <line x1={10} x2={18} y1={-24} y2={-24} className="stroke-slate-700" strokeWidth={2.4} strokeLinecap="round" />
      {/* Cargo box with a small solar lid */}
      <rect x={40} y={-30} width={36} height={24} rx={3} className="fill-emerald-500" />
      <rect x={41} y={-33} width={34} height={3.5} rx={1} className="fill-indigo-900" />
      {[47, 53, 59, 65, 71].map(x => <line key={x} x1={x} x2={x} y1={-33} y2={-29.5} className="stroke-sky-300" strokeWidth={0.5} />)}
      <rect x={51} y={-24} width={14} height={11} rx={1} className="fill-white" opacity={0.9} />
      <path d="M51,-20 L65,-20 M58,-24 L58,-13" className="stroke-emerald-500" strokeWidth={1.2} />
      {con && (
        <g className="stroke-slate-700" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* Rider */}
          <path d="M14,-26 L22,-48" strokeWidth={5} />
          <path d="M21,-44 L34,-32 L37,-30" strokeWidth={3} />
          <path d="M14,-26 L28,-16 L24,-2" strokeWidth={3.4} />
          <circle cx={25} cy={-54} r={5} className="fill-slate-700" stroke="none" />
          <path d="M20,-56 C21,-61 30,-61 31,-55" className="stroke-emerald-500" strokeWidth={2.4} />
        </g>
      )}
    </g>
  );
}

const EDIFICIOS = [[0, 52, 30], [32, 70, 24], [96, 48, 22], [120, 64, 28], [150, 40, 20], [176, 58, 26], [204, 44, 18], [226, 70, 30], [262, 54, 24]] as const;

export function VisualTriciclosReparto() {
  return (
    <svg viewBox="0 0 320 128" className="h-full w-full" role="img"
      aria-label="Triciclos eléctricos de carga: uno se recarga bajo una pérgola de paneles solares y otro sale a repartir un paquete por la ciudad, en la última milla">
      {/* City behind */}
      {EDIFICIOS.map(([x, h, w], i) => (
        <g key={i} opacity={0.75}>
          <rect x={x} y={110 - h} width={w} height={h} className={i % 2 ? 'fill-slate-200' : 'fill-slate-100'} />
          {Array.from({ length: Math.floor((h - 10) / 12) }, (_, k) => (
            <rect key={k} x={x + 5} y={110 - h + 7 + k * 12} width={w - 10} height={3} rx={1} className="fill-white" />
          ))}
        </g>
      ))}
      {/* Street and pavement */}
      <rect x={0} y={110} width={320} height={18} className="fill-slate-100" />
      <line x1={0} x2={320} y1={110} y2={110} className="stroke-slate-300" strokeWidth={1} />

      <Sol x={122} y={20} r={6} />

      {/* Solar charging canopy */}
      <line x1={20} x2={20} y1={48} y2={110} className="stroke-slate-500" strokeWidth={2} />
      <line x1={92} x2={92} y1={40} y2={110} className="stroke-slate-500" strokeWidth={2} />
      <path d="M8,46 L104,36 L104,42 L8,52 Z" className="fill-indigo-900" />
      {Array.from({ length: 7 }, (_, i) => {
        const x = 20 + i * 12;
        return <line key={i} x1={x} x2={x} y1={r1(44.7 - (x - 8) * 0.104)} y2={r1(50.7 - (x - 8) * 0.104)} className="stroke-sky-300" strokeWidth={0.6} opacity={0.7} />;
      })}
      <path d="M8,49 L104,39" className="stroke-sky-300" strokeWidth={0.5} opacity={0.7} />
      {/* Energy dropping from the panels to the charger */}
      <path d="M30,54 L30,76" className="stroke-amber-400" strokeWidth={1.2} strokeDasharray="2 3" />
      <rect x={24} y={78} width={12} height={22} rx={2} className="fill-emerald-600" />
      <path d="M31,82 L27,90 L31,90 L29,96 L34,87 L30,87 Z" className="fill-amber-300" />
      <path d="M36,92 C42,92 44,100 48,100" fill="none" className="stroke-slate-600" strokeWidth={1.2} />
      <g transform="translate(46 100) scale(0.62)" opacity={0.9}><TricicloCarga con={false} /></g>

      {/* The delivery route along the pavement */}
      <path d="M100,119 L284,119" className="stroke-emerald-500" strokeWidth={1.6} strokeDasharray="4 4" strokeLinecap="round" />
      <circle cx={100} cy={119} r={2.4} className="fill-emerald-600" />

      <g className="transition-transform duration-700 group-hover:translate-x-1.5">
        <g transform="translate(152 100)"><TricicloCarga /></g>
      </g>

      {/* Destination: a pin and the parcel at the door */}
      <rect x={266} y={80} width={26} height={30} className="fill-white stroke-slate-300" strokeWidth={1} />
      <rect x={271} y={86} width={16} height={24} rx={1} className="fill-amber-700" opacity={0.75} />
      <circle cx={284} cy={99} r={1} className="fill-amber-200" />
      <path d="M263,80 L295,80 L292,75 L266,75 Z" className="fill-emerald-600" />
      <rect x={290} y={98} width={12} height={12} rx={1} className="fill-amber-300 stroke-amber-500" strokeWidth={0.8} />
      <line x1={290} x2={302} y1={102} y2={102} className="stroke-amber-500" strokeWidth={0.8} />
      <path d="M296,66 C289,66 286,71 286,75 C286,81 296,90 296,90 C296,90 306,81 306,75 C306,71 303,66 296,66 Z" className="fill-emerald-500" />
      <path d="M291.5,75.5 L294.6,78.6 L300.5,72.5" fill="none" className="stroke-white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />

      {/* The caption */}
      <text x={310} y={18} textAnchor="end" className="fill-slate-500 text-[8.5px] uppercase tracking-[0.14em]">Última milla</text>
      <text x={310} y={34} textAnchor="end" className="fill-slate-900 text-[13px] font-bold">100 % solar</text>
    </svg>
  );
}

/* ── Bicicleta solar: the trailer of panels and the ride across Spain ──────── */

// Mainland Spain, [longitude, latitude], simplified from `public/geo/spain.json` (Douglas-Peucker, 0.11°).
const ESPANA: [number, number][] = [
  [-1.79, 43.39], [-1.4, 43.24], [-1.46, 43.05], [-0.57, 42.77], [0.28, 42.67], [0.81, 42.83], [1.34, 42.71],
  [1.45, 42.43], [2.01, 42.35], [3.18, 42.43], [3.23, 41.95], [2.13, 41.3], [1.02, 41.05], [0.71, 40.82],
  [0.86, 40.69], [0.56, 40.59], [-0.32, 39.52], [-0.16, 39.0], [0.23, 38.74], [-0.51, 38.34], [-0.86, 37.74],
  [-0.73, 37.6], [-1.67, 37.36], [-2.13, 36.74], [-4.4, 36.72], [-5.19, 36.41], [-5.61, 36.01], [-6.39, 36.64],
  [-6.19, 36.93], [-6.39, 36.81], [-6.85, 37.3], [-7.41, 37.19], [-7.53, 37.56], [-6.95, 38.2], [-7.36, 38.45],
  [-6.99, 39.07], [-7.56, 39.68], [-7.02, 39.69], [-6.88, 40.01], [-7.04, 40.18], [-6.79, 40.36], [-6.94, 41.02],
  [-6.21, 41.57], [-6.54, 41.66], [-6.61, 41.96], [-8.18, 41.81], [-8.22, 42.15], [-8.88, 41.89], [-8.62, 42.31],
  [-8.87, 42.26], [-8.66, 42.44], [-8.94, 42.47], [-8.73, 42.69], [-9.01, 42.53], [-8.89, 42.83], [-9.1, 42.76],
  [-9.28, 43.05], [-8.84, 43.34], [-8.21, 43.31], [-8.31, 43.57], [-7.69, 43.79], [-7.04, 43.48], [-5.85, 43.66],
  [-4.48, 43.38], [-3.58, 43.52], [-3.01, 43.32], [-2.77, 43.45], [-2.13, 43.29],
];
// A hint of a loop around the country (not the real itinerary).
const VUELTA: [number, number][] = [
  [2.17, 41.39], [-0.38, 39.47], [-2.46, 36.84], [-4.42, 36.72], [-5.98, 37.39], [-6.37, 39.47], [-5.66, 40.97],
  [-8.54, 42.88], [-5.85, 43.36], [-2.93, 43.26], [-0.88, 41.65],
];
const mapa = ([lon, lat]: [number, number]) => [r1(10 + (lon + 9.4) * 9.2), r1(14 + (43.85 - lat) * 12)] as const;

/** A closed, smooth Catmull-Rom path through the points. */
function lazo(p: (readonly [number, number])[]) {
  const n = p.length;
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < n; i++) {
    const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n], e = p[(i + 2) % n];
    d += ` C${r1(b[0] + (c[0] - a[0]) / 6)},${r1(b[1] + (c[1] - a[1]) / 6)} ${r1(c[0] - (e[0] - b[0]) / 6)},${r1(c[1] - (e[1] - b[1]) / 6)} ${c[0]},${c[1]}`;
  }
  return d;
}

export function VisualBicicletaSolar() {
  const silueta = ESPANA.map(mapa).map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join('') + 'Z';
  const ruta = VUELTA.map(mapa);
  return (
    <svg viewBox="0 0 320 128" className="h-full w-full" role="img"
      aria-label="Bicicleta eléctrica con un remolque de paneles solares y el mapa de España con una vuelta insinuada: Pedaleo Solar, 3.890 km">
      {/* Spain and a hint of the route */}
      <path d={silueta} className="fill-amber-100 stroke-amber-300" strokeWidth={1} strokeLinejoin="round" />
      <path d={lazo(ruta)} fill="none" className="stroke-orange-500" strokeWidth={1.5} strokeDasharray="3.5 2.5" strokeLinecap="round" />
      {ruta.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i ? 1.5 : 2.8} className={i ? 'fill-orange-400' : 'fill-orange-600 stroke-white'} strokeWidth={1} />)}

      <Sol x={300} y={20} r={6} />

      {/* The figure */}
      <text x={142} y={30} className="fill-slate-900 text-[19px] font-bold">3.890 km</text>
      <text x={143} y={44} className="fill-slate-500 text-[8.5px] uppercase tracking-[0.14em]">Pedaleo Solar</text>

      <line x1={136} x2={314} y1={114} y2={114} className="stroke-slate-200" strokeWidth={1} />
      <ellipse cx={226} cy={115} rx={82} ry={2.4} className="fill-slate-900" opacity={0.07} />

      <g className="transition-transform duration-700 group-hover:translate-x-1">
        {/* Trailer of solar panels */}
        <line x1={204} y1={94} x2={240} y2={100} className="stroke-slate-500" strokeWidth={1.6} strokeLinecap="round" />
        <RuedaBici x={180} y={104} r={10} n={10} />
        <rect x={154} y={90} width={52} height={5} rx={1.5} className="fill-slate-500" />
        <path d="M150,86 L204,86 L214,70 L160,70 Z" className="fill-indigo-900" />
        {[1, 2, 3, 4, 5].map(k => (
          <line key={k} x1={150 + k * 9} y1={86} x2={160 + k * 9} y2={70} className="stroke-sky-300" strokeWidth={0.6} opacity={0.65} />
        ))}
        {[1, 2].map(k => (
          <line key={k} x1={150 + (k * 10) / 3} y1={86 - (k * 16) / 3} x2={204 + (k * 10) / 3} y2={86 - (k * 16) / 3} className="stroke-sky-300" strokeWidth={0.6} opacity={0.65} />
        ))}
        <path d="M150,86 L204,86 L214,70" fill="none" className="stroke-white" strokeWidth={1} opacity={0.7} />
        <line x1={178} x2={178} y1={86} y2={90} className="stroke-slate-500" strokeWidth={1.6} />

        {/* Bicycle */}
        <RuedaBici x={240} y={100} r={13} />
        <RuedaBici x={286} y={100} r={13} />
        <path d="M240,100 L256,100 L252,78 Z M252,78 L278,76 L256,100 M278,76 L286,100" fill="none"
          className="stroke-orange-500" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
        <rect x={238} y={86} width={12} height={5} rx={1.5} className="fill-slate-700" />
        <path d="M276,70 L278,76 M274,70 L281,69" fill="none" className="stroke-slate-700" strokeWidth={1.8} strokeLinecap="round" />
        <line x1={248} x2={256} y1={77} y2={77} className="stroke-slate-700" strokeWidth={2.4} strokeLinecap="round" />
        {/* Rider */}
        <g className="stroke-slate-700" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M252,75 L264,52" strokeWidth={5} />
          <path d="M263,55 L275,70" strokeWidth={3} />
          <path d="M252,75 L266,86 L260,104" strokeWidth={3.4} />
          <circle cx={268} cy={45} r={5.2} className="fill-slate-700" stroke="none" />
          <path d="M262,44 C263,38 273,38 274,44" className="stroke-orange-500" strokeWidth={2.4} />
        </g>
      </g>
    </svg>
  );
}

/* ── Competición: open plans, a circuit and the finish line ────────────────── */

const COCHE = 'M10,0 C10,-3.4 7,-4.4 2,-4.4 C-4,-4.4 -8,-2 -11,-0.9 L-11,0.9 C-8,2 -4,4.4 2,4.4 C7,4.4 10,3.4 10,0 Z';

export function VisualCompeticionSolar() {
  const cx = 214, cy = 64, rx = 86, ry = 42;
  const coches = [
    { t: 72, c: 'fill-amber-500' },
    { t: 38, c: 'fill-sky-500' },
    { t: 4, c: 'fill-rose-500' },
    { t: -38, c: 'fill-violet-500' },
  ];
  return (
    <svg viewBox="0 0 320 128" className="h-full w-full" role="img"
      aria-label="Competición de vehículos solares de código abierto en 2027: un plano abierto del vehículo y tres coches solares en un circuito camino de la meta">
      <defs>
        <pattern id="du-comp-cuadricula" width={8} height={8} patternUnits="userSpaceOnUse">
          <path d="M8,0 L0,0 L0,8" fill="none" stroke="#bfdbfe" strokeWidth={0.5} />
        </pattern>
        <marker id="du-comp-cota" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="fill-sky-600" />
        </marker>
      </defs>

      {/* Open plans */}
      <g transform="rotate(-4 60 64)" className="transition-transform duration-500 group-hover:-translate-y-0.5">
        <rect x={16} y={19} width={90} height={92} rx={3} className="fill-slate-900" opacity={0.06} />
        <rect x={13} y={16} width={90} height={92} rx={3} className="fill-blue-50 stroke-sky-300" strokeWidth={1} />
        <rect x={13} y={16} width={90} height={92} rx={3} fill="url(#du-comp-cuadricula)" />
        {/* Side view and plan view of a vehicle */}
        <path d="M24,52 C24,42 38,34 58,32 C74,31 86,38 94,48 L94,52 C90,55 84,56 78,56 L32,56 C27,56 24,55 24,52 Z" fill="none" className="stroke-sky-600" strokeWidth={1.2} />
        <path d="M40,40 C48,35 58,33 66,33 L66,44 C56,45 46,46 38,47" fill="none" className="stroke-sky-600" strokeWidth={0.8} />
        <circle cx={38} cy={57} r={5} fill="none" className="stroke-sky-600" strokeWidth={1} />
        <circle cx={82} cy={57} r={5} fill="none" className="stroke-sky-600" strokeWidth={1} />
        <line x1={24} x2={94} y1={68} y2={68} className="stroke-sky-600" strokeWidth={0.7} markerStart="url(#du-comp-cota)" markerEnd="url(#du-comp-cota)" />
        <path d="M26,84 C26,79 36,76 52,76 C70,76 84,80 94,83 L94,85 C84,88 70,92 52,92 C36,92 26,89 26,84 Z" fill="none" className="stroke-sky-600" strokeWidth={1.2} strokeDasharray="3 2" />
        <text x={20} y={27} className="fill-sky-700 text-[7.5px] font-bold uppercase tracking-[0.14em]">Planos abiertos</text>
        <text x={97} y={102} textAnchor="end" className="fill-sky-700 text-[9px] font-bold">{'</>'}</text>
      </g>

      {/* The circuit */}
      <ellipse cx={cx} cy={cy + 3} rx={rx + 8} ry={ry + 8} className="fill-slate-900" opacity={0.05} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" className="stroke-slate-300" strokeWidth={15} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" className="stroke-white" strokeWidth={0.9} strokeDasharray="5 5" />
      <ellipse cx={cx} cy={cy} rx={rx - 7.5} ry={ry - 7.5} className="fill-emerald-50 stroke-emerald-200" strokeWidth={1} />
      {/* Finish line: a chequered strip across the bottom of the track */}
      {Array.from({ length: 8 }, (_, k) => (
        <rect key={k} x={cx - 3 + (k % 2) * 3} y={cy + ry - 7.5 + Math.floor(k / 2) * 3.75} width={3} height={3.75}
          className={(k + Math.floor(k / 2)) % 2 ? 'fill-white' : 'fill-slate-800'} />
      ))}
      <text x={cx + 8} y={cy + ry + 14} className="fill-slate-500 text-[7.5px] font-bold uppercase tracking-[0.14em]">Meta</text>

      {/* Three teams' solar cars heading for the line */}
      <g className="transition-transform duration-700 group-hover:translate-y-0.5">
        {coches.map(({ t, c }) => {
          const a = (t * Math.PI) / 180;
          const x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a);
          const giro = (Math.atan2(ry * Math.cos(a), -rx * Math.sin(a)) * 180) / Math.PI;
          return (
            <g key={t} transform={`translate(${r1(x)} ${r1(y)}) rotate(${r1(giro)}) scale(1.05)`}>
              <path d={COCHE} transform="translate(-0.6 1.6)" className="fill-slate-900" opacity={0.18} />
              <rect x={1} y={-6.6} width={6} height={2.2} rx={1.1} className="fill-slate-800" />
              <rect x={1} y={4.4} width={6} height={2.2} rx={1.1} className="fill-slate-800" />
              <path d={COCHE} className={c} />
              <path d={COCHE} className="fill-indigo-900" transform="translate(-1.6 0) scale(0.7 0.62)" />
              <path d="M-7,0 L4,0 M-4,-2.4 L-4,2.4 M0,-2.6 L0,2.6" className="stroke-sky-300" strokeWidth={0.4} />
              <ellipse cx={5.2} cy={0} rx={1.9} ry={2.4} className="fill-sky-200" />
            </g>
          );
        })}
      </g>

      {/* In the middle of the circuit */}
      <text x={cx} y={cy - 10} textAnchor="middle" className="fill-slate-500 text-[8px] uppercase tracking-[0.14em]">Código abierto</text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="fill-slate-900 text-[22px] font-bold">2027</text>
      <text x={cx} y={cy + 24} textAnchor="middle" className="fill-emerald-700 text-[9px] font-semibold">gana la eficiencia</text>
    </svg>
  );
}
