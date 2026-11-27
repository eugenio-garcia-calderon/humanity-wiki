// ============================================================================
// DISEÑO 1 · CARD ILLUSTRATIONS · GROUP «VIVIENDA» (2026-11-27)
// ============================================================================
// Four hand-drawn SVG pictures for the home-page cards, in the language of
// `src/components/politica/VisualesHerramientas.tsx`:
//   · Urbanismo orgánico: the «Comunidad Circular» seen from above (common half on top,
//     ten family wedges below in generational rings) and the village of ten communities.
//   · Viviendas mínimas viables: a small timber house with a solar roof and a rain tank.
//   · Fábrica de casas ecológicas: timber modules made on a line, trucked and assembled on site.
//   · Agricultura sintrópica: one planting line with its four strata and the four key species.
// No data is claimed beyond the community's own structure (10 families, 10 communities per village).
// viewBox 320×128: the card shows it at 360×144.

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Annular sector between radii ri and ro, from angle a0 to a1 (SVG angles, clockwise). */
function sector(cx: number, cy: number, ri: number, ro: number, a0: number, a1: number) {
  const p = (r: number, a: number) => `${r1(cx + r * Math.cos(a))},${r1(cy + r * Math.sin(a))}`;
  const big = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p(ro, a0)} A${ro} ${ro} 0 ${big} 1 ${p(ro, a1)} L${p(ri, a1)} A${ri} ${ri} 0 ${big} 0 ${p(ri, a0)} Z`;
}

/** A small tree seen from above: a soft cluster of three crowns with its shadow. */
function Copa({ x, y, r }: { x: number; y: number; r: number }) {
  const l = [[-0.45, 0.2, 0.75], [0.45, 0.25, 0.7], [0, -0.35, 0.8]];
  return (
    <g>
      <circle cx={r1(x + r * 0.4)} cy={r1(y + r * 0.45)} r={r} className="fill-emerald-900" opacity={0.1} />
      {l.map(([dx, dy, k], i) => <circle key={i} cx={r1(x + dx * r)} cy={r1(y + dy * r)} r={r1(k * r)} className={i === 2 ? 'fill-emerald-300' : 'fill-emerald-400'} />)}
    </g>
  );
}

export const FONDOS: Record<string, string> = {
  VisualUrbanismoOrganico: 'bg-gradient-to-br from-emerald-50 via-white to-amber-50',
  VisualViviendasMinimas: 'bg-gradient-to-br from-amber-50 via-white to-sky-50',
  VisualFabricaCasas: 'bg-gradient-to-br from-stone-50 via-white to-amber-50',
  VisualAgriculturaSintropica: 'bg-gradient-to-b from-sky-50 via-white to-lime-50',
};

/* ── Urbanismo orgánico: la Comunidad Circular y el pueblo de diez comunidades ── */
const FAMILIA_PAR = ['fill-amber-300', 'fill-amber-200', 'fill-amber-100'];
const FAMILIA_IMPAR = ['fill-orange-300', 'fill-orange-200', 'fill-orange-100'];

export function VisualUrbanismoOrganico() {
  const cx = 92, cy = 58, R = 46, r0 = 12, anillos = [r0, 23, 34, R];
  const T = Math.PI / 3;
  // The village: ten communities on a ring, each with its common half facing the village centre
  const px = 248, py = 58, rx = 52, ry = 40, rc = 9;
  const pueblo = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + Math.PI / 10 + (i * Math.PI) / 5;
    return { x: px + rx * Math.cos(a), y: py + ry * Math.sin(a), a };
  });
  const elegida = pueblo[7]; // the leftmost one, drawn large on the left
  return (
    <svg viewBox="0 0 320 128" className="h-full w-full" role="img"
      aria-label="Vista desde arriba de una comunidad circular: la mitad de arriba es el espacio común con huertos, energía y talleres, y la de abajo diez familias en anillos generacionales; a la derecha, un pueblo de diez comunidades conectadas alrededor de su centro">
      <defs>
        <clipPath id="du-urb-huerto"><path d={sector(cx, cy, r0, R, Math.PI, Math.PI + T)} /></clipPath>
        <clipPath id="du-urb-solar"><path d={sector(cx, cy, r0, R, Math.PI + T, Math.PI + 2 * T)} /></clipPath>
      </defs>

      {/* Río y árboles: la comunidad dentro de la naturaleza */}
      <path d="M158,-4 C178,30 146,74 166,132" fill="none" className="stroke-sky-200" strokeWidth={6} strokeLinecap="round" />
      <path d="M158,-4 C178,30 146,74 166,132" fill="none" className="stroke-sky-300" strokeWidth={1.2} strokeDasharray="5 6" opacity={0.7} />
      {[[22, 16, 5], [18, 106, 5], [146, 14, 4.5], [176, 108, 4.5], [308, 20, 4.5], [308, 100, 5]].map(([x, y, r], i) => <Copa key={i} x={x} y={y} r={r} />)}

      {/* Zoom: esta comunidad del pueblo, vista de cerca */}
      <path d={`M${r1(elegida.x)},${r1(elegida.y - rc)} L${cx},${cy - R - 2} M${r1(elegida.x)},${r1(elegida.y + rc)} L${cx},${cy + R + 2}`}
        className="stroke-amber-400" strokeWidth={0.8} strokeDasharray="2 3" fill="none" />

      {/* Seto perimetral */}
      <circle cx={cx} cy={cy} r={R + 3.5} fill="none" className="stroke-emerald-400" strokeWidth={4} strokeDasharray="0.1 5.2" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={R + 0.5} className="fill-white" />

      {/* Mitad común: huertos, energía y talleres */}
      <path d={sector(cx, cy, r0, R, Math.PI, Math.PI + T)} className="fill-lime-100" />
      <g clipPath="url(#du-urb-huerto)">
        {[15, 19, 23, 27, 31, 35, 39, 43].map((r, i) => (
          <circle key={r} cx={cx} cy={cy} r={r} fill="none" className={i % 2 ? 'stroke-emerald-500' : 'stroke-lime-500'} strokeWidth={2.2} />
        ))}
      </g>
      <path d={sector(cx, cy, r0, R, Math.PI + T, Math.PI + 2 * T)} className="fill-sky-50" />
      <g clipPath="url(#du-urb-solar)">
        {Array.from({ length: 7 }, (_, j) => Array.from({ length: 10 }, (_, i) => (
          <rect key={`${i}-${j}`} x={cx - 34 + i * 7} y={cy - 46 + j * 5.5} width={5.8} height={3.6} rx={0.5} className={(i + j) % 3 ? 'fill-sky-600' : 'fill-sky-500'} />
        )))}
      </g>
      <path d={sector(cx, cy, r0, R, Math.PI + 2 * T, 2 * Math.PI)} className="fill-stone-100" />
      {[[22, -0.3, 7, 5.5], [36, -0.26, 9, 6.5], [22, -0.78, 7, 5.5], [36, -0.8, 9, 6.5]].map(([r, a, w, h], i) => {
        const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a), g = (a * 180) / Math.PI + 90;
        return (
          <g key={i} transform={`translate(${r1(x)} ${r1(y)}) rotate(${r1(g)})`}>
            <rect x={-w / 2 + 0.8} y={-h / 2 + 0.8} width={w} height={h} className="fill-stone-500" opacity={0.25} />
            <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={0.6} className="fill-orange-500" />
            <rect x={-w / 2} y={-h / 2} width={w} height={h / 2} rx={0.6} className="fill-orange-400" />
            <line x1={-w / 2} x2={w / 2} y1={0} y2={0} className="stroke-orange-700" strokeWidth={0.5} opacity={0.5} />
          </g>
        );
      })}
      <Copa x={cx + 30 * Math.cos(-0.53)} y={cy + 30 * Math.sin(-0.53)} r={3.2} />

      {/* Mitad de las familias: diez cuñas en anillos generacionales */}
      {Array.from({ length: 10 }, (_, f) => {
        const a0 = (f * Math.PI) / 10, a1 = ((f + 1) * Math.PI) / 10, am = (a0 + a1) / 2;
        const tonos = f % 2 ? FAMILIA_IMPAR : FAMILIA_PAR;
        const hx = cx + 40 * Math.cos(am), hy = cy + 40 * Math.sin(am);
        return (
          <g key={f}>
            {[0, 1, 2].map(k => <path key={k} d={sector(cx, cy, anillos[k], anillos[k + 1], a0, a1)} className={tonos[k]} />)}
            <rect x={-2.4} y={-2} width={4.8} height={4} rx={0.6} className="fill-white" opacity={0.9}
              transform={`translate(${r1(hx)} ${r1(hy)}) rotate(${r1((am * 180) / Math.PI + 90)})`} />
          </g>
        );
      })}
      {/* Separaciones: caminos blancos */}
      {[...Array.from({ length: 11 }, (_, f) => (f * Math.PI) / 10), Math.PI + T, Math.PI + 2 * T].map((a, i) => (
        <line key={i} x1={r1(cx + r0 * Math.cos(a))} y1={r1(cy + r0 * Math.sin(a))} x2={r1(cx + R * Math.cos(a))} y2={r1(cy + R * Math.sin(a))}
          className="stroke-white" strokeWidth={1.3} />
      ))}
      {[23, 34].map(r => <path key={r} d={`M${cx + r},${cy} A${r} ${r} 0 0 1 ${cx - r},${cy}`} fill="none" className="stroke-white" strokeWidth={0.8} />)}
      <circle cx={cx} cy={cy} r={R} fill="none" className="stroke-emerald-600" strokeWidth={0.8} opacity={0.5} />
      {/* Centro de la comunidad */}
      <circle cx={cx} cy={cy} r={r0} className="fill-white stroke-emerald-500" strokeWidth={1.2} />
      <circle cx={cx} cy={cy} r={5} className="fill-sky-300" />
      <circle cx={cx - 1.4} cy={cy - 1.4} r={1.6} className="fill-white" opacity={0.6} />

      {/* El pueblo: diez comunidades en red alrededor del centro */}
      <ellipse cx={px} cy={py} rx={rx} ry={ry} fill="none" className="stroke-amber-300" strokeWidth={1.4} />
      {pueblo.map((c, i) => <line key={i} x1={px} y1={py} x2={r1(c.x)} y2={r1(c.y)} className="stroke-slate-300" strokeWidth={0.9} />)}
      <circle cx={px} cy={py} r={13} className="fill-white stroke-amber-500" strokeWidth={1.4} />
      <circle cx={px} cy={py} r={7.5} className="fill-amber-100" />
      <Copa x={px} y={py} r={3.6} />
      {pueblo.map((c, i) => {
        // Rotate so the common (green) half faces the village centre
        const g = ((c.a + Math.PI) * 180) / Math.PI + 90;
        return (
          <g key={i} transform={`translate(${r1(c.x)} ${r1(c.y)}) rotate(${r1(g)})`}>
            <circle r={rc + 1.6} className="fill-emerald-900" opacity={0.08} cx={0.8} cy={0.8} />
            <path d={`M${-rc},0 A${rc} ${rc} 0 0 1 ${rc},0 Z`} className="fill-emerald-400" />
            <path d={`M${rc},0 A${rc} ${rc} 0 0 1 ${-rc},0 Z`} className="fill-amber-300" />
            <line x1={-rc} x2={rc} y1={0} y2={0} className="stroke-white" strokeWidth={0.9} />
            <circle r={2.4} className="fill-white" />
            <circle r={rc} fill="none" className={i === 7 ? 'stroke-amber-500' : 'stroke-white'} strokeWidth={i === 7 ? 1.6 : 0.8} />
          </g>
        );
      })}

      <path d={`M37,40 L${cx - 30},40 M37,78 L${cx - 32},78`} className="stroke-slate-300" strokeWidth={0.8} />
      <text x={35} y={43} textAnchor="end" className="fill-emerald-700 text-[8.5px] font-semibold">común</text>
      <text x={35} y={81} textAnchor="end" className="fill-amber-700 text-[8.5px] font-semibold">familias</text>
      <text x={cx} y={122} textAnchor="middle" className="fill-slate-500 text-[8px] uppercase tracking-[0.14em]">Comunidad circular</text>
      <text x={px} y={122} textAnchor="middle" className="fill-slate-500 text-[8px] uppercase tracking-[0.14em]">Pueblo · 10 comunidades</text>
    </svg>
  );
}

/* ── Viviendas mínimas viables: casa pequeña de madera, cubierta solar, agua de lluvia ── */
export function VisualViviendasMinimas() {
  // Shed roof rising to the right, towards the sun's path
  const yTecho = (x: number) => 58 - ((x - 64) * 16) / 108;
  const x0 = 70, x1 = 166, suelo = 102;
  const cuerpo = `M${x0},${suelo} L${x0},${r1(yTecho(x0) + 4)} L${x1},${r1(yTecho(x1) + 4)} L${x1},${suelo} Z`;
  const filas = [
    { t: 'Cubierta solar', s: 'produce su energía', icono: 'sol' },
    { t: 'Agua de lluvia', s: 'recogida y reutilizada', icono: 'gota' },
    { t: 'Madera', s: 'estructura y fachada', icono: 'hoja' },
  ] as const;
  return (
    <svg viewBox="0 0 320 128" className="h-full w-full" role="img"
      aria-label="Una vivienda mínima de madera con cubierta de paneles solares y depósito de agua de lluvia: poca superficie y poco consumo">
      <defs>
        <clipPath id="du-vmin-cuerpo"><path d={cuerpo} /></clipPath>
      </defs>
      <g transform="translate(0 -4)">
      {/* Sol y sus rayos hacia la cubierta */}
      <g className="origin-[30px_26px] transition-transform duration-700 group-hover:rotate-12">
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return <line key={i} x1={r1(30 + 12 * Math.cos(a))} y1={r1(26 + 12 * Math.sin(a))} x2={r1(30 + 16 * Math.cos(a))} y2={r1(26 + 16 * Math.sin(a))}
            className="stroke-amber-400" strokeWidth={1.6} strokeLinecap="round" />;
        })}
      </g>
      <circle cx={30} cy={26} r={9} className="fill-amber-300" />
      {[96, 120, 144].map((x, i) => (
        <line key={i} x1={40} y1={30 + i * 1.5} x2={x} y2={r1(yTecho(x) - 8)} className="stroke-amber-300" strokeWidth={0.9} strokeDasharray="2 3" />
      ))}

      {/* Suelo */}
      <line x1={14} x2={196} y1={108} y2={108} className="stroke-lime-600" strokeWidth={1.2} opacity={0.6} />
      <path d="M14,108 L196,108 L196,111 L14,111 Z" className="fill-lime-200" opacity={0.6} />

      {/* Árbol */}
      <rect x={21} y={84} width={2.6} height={24} className="fill-amber-800" />
      <circle cx={17} cy={82} r={6.5} className="fill-emerald-500" />
      <circle cx={28} cy={81} r={6.5} className="fill-emerald-500" />
      <circle cx={22} cy={73} r={8} className="fill-emerald-400" />
      <circle cx={26} cy={83} r={4.5} className="fill-emerald-700" opacity={0.3} />

      {/* Depósito de lluvia y bajante */}
      <path d={`M64,${r1(yTecho(64) + 4)} L54,${r1(yTecho(64) + 4)} L54,86`} fill="none" className="stroke-slate-400" strokeWidth={1.6} />
      <rect x={44} y={86} width={16} height={22} rx={3} className="fill-sky-200 stroke-sky-400" strokeWidth={1} />
      <rect x={44} y={96} width={16} height={12} rx={2} className="fill-sky-300" opacity={0.8} />

      {/* Pilotes */}
      {[76, 116, 158].map(x => <rect key={x} x={x} y={suelo} width={4} height={6} className="fill-slate-400" />)}
      {/* Sombra */}
      <ellipse cx={118} cy={110} rx={56} ry={2.4} className="fill-slate-900" opacity={0.08} />

      {/* Cuerpo de madera */}
      <path d={cuerpo} className="fill-amber-200" />
      <g clipPath="url(#du-vmin-cuerpo)">
        {Array.from({ length: 16 }, (_, i) => <line key={i} x1={x0 + 3 + i * 6} x2={x0 + 3 + i * 6} y1={40} y2={suelo} className="stroke-amber-300" strokeWidth={1} />)}
      </g>
      <path d={cuerpo} fill="none" className="stroke-amber-700" strokeWidth={1.2} />
      {/* Puerta */}
      <rect x={80} y={72} width={14} height={30} rx={1} className="fill-amber-700" />
      <circle cx={91} cy={88} r={0.9} className="fill-amber-200" />
      {/* Ventanas */}
      <rect x={100} y={68} width={12} height={12} rx={1} className="fill-sky-100 stroke-amber-800" strokeWidth={1.2} />
      <rect x={120} y={60} width={38} height={32} rx={1} className="fill-sky-100 stroke-amber-800" strokeWidth={1.5} />
      <line x1={139} x2={139} y1={60} y2={92} className="stroke-amber-800" strokeWidth={1.2} />
      <path d="M124,74 L132,64 M126,80 L137,66 M143,78 L152,66" className="stroke-white" strokeWidth={1.4} strokeLinecap="round" />
      {/* Porche */}
      <rect x={166} y={99} width={24} height={3} className="fill-amber-600" />
      {[170, 186].map(x => <rect key={x} x={x} y={102} width={2.4} height={6} className="fill-slate-400" />)}
      <path d="M188,99 L188,86 M166,88 L188,88" className="stroke-amber-700" strokeWidth={1.2} fill="none" />

      {/* Cubierta y paneles solares */}
      <path d={`M60,${r1(yTecho(60))} L172,${r1(yTecho(172))} L172,${r1(yTecho(172) + 4)} L60,${r1(yTecho(60) + 4)} Z`} className="fill-slate-700" />
      {Array.from({ length: 5 }, (_, i) => {
        const a = 68 + i * 20.4, b = a + 18.4, s = 4.2;
        return (
          <g key={i} className="transition-opacity duration-500 group-hover:opacity-90">
            <path d={`M${a},${r1(yTecho(a))} L${b},${r1(yTecho(b))} L${b},${r1(yTecho(b) - s)} L${a},${r1(yTecho(a) - s)} Z`} className="fill-sky-700" />
            <line x1={a + 1} x2={b - 1} y1={r1(yTecho(a + 1) - s / 2)} y2={r1(yTecho(b - 1) - s / 2)} className="stroke-sky-400" strokeWidth={0.6} />
          </g>
        );
      })}

      {/* Cota: superficie mínima */}
      <path d={`M${x0},113 L${x0},119 M${x1},113 L${x1},119 M${x0},116 L${x1},116`} className="stroke-slate-400" strokeWidth={0.8} />
      <text x={118} y={127} textAnchor="middle" className="fill-slate-500 text-[8px] uppercase tracking-[0.12em]">superficie mínima</text>
      </g>

      {/* Lo que la hace viable */}
      {filas.map((f, i) => {
        const y = 28 + i * 32;
        return (
          <g key={f.t} transform={`translate(214 ${y})`}>
            <circle r={10} className={f.icono === 'sol' ? 'fill-amber-100' : f.icono === 'gota' ? 'fill-sky-100' : 'fill-emerald-100'} />
            {f.icono === 'sol' && <>
              <circle r={3.6} className="fill-amber-400" />
              {Array.from({ length: 8 }, (_, k) => { const a = (k * Math.PI) / 4; return <line key={k} x1={r1(5.4 * Math.cos(a))} y1={r1(5.4 * Math.sin(a))} x2={r1(7 * Math.cos(a))} y2={r1(7 * Math.sin(a))} className="stroke-amber-400" strokeWidth={1.2} strokeLinecap="round" />; })}
            </>}
            {f.icono === 'gota' && <path d="M0,-6 C3,-2 5,0.5 5,2.4 A5,5 0 0 1 -5,2.4 C-5,0.5 -3,-2 0,-6 Z" className="fill-sky-400" />}
            {f.icono === 'hoja' && <>
              <path d="M-5,5 C-6,-3 0,-6 6,-6 C6,0 3,6 -5,5 Z" className="fill-emerald-500" />
              <path d="M-5,5 L3,-3" className="stroke-emerald-100" strokeWidth={0.9} />
            </>}
            <text x={16} y={-1} className="fill-slate-800 text-[10.5px] font-bold">{f.t}</text>
            <text x={16} y={10} className="fill-slate-500 text-[8.5px]">{f.s}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Fábrica de casas ecológicas: módulos de madera hechos en taller, montados en obra ── */
function Modulo({ x, y, w, h, ventana = true }: { x: number; y: number; w: number; h: number; ventana?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} className="fill-amber-300" />
      {Array.from({ length: Math.floor(w / 4) }, (_, i) => <line key={i} x1={x + 2 + i * 4} x2={x + 2 + i * 4} y1={y} y2={y + h} className="stroke-amber-400" strokeWidth={0.8} />)}
      {ventana && <rect x={x + w * 0.52} y={y + h * 0.24} width={w * 0.3} height={h * 0.38} className="fill-sky-100 stroke-amber-700" strokeWidth={1} />}
      <rect x={x} y={y} width={w} height={h} fill="none" className="stroke-amber-700" strokeWidth={1.2} />
    </g>
  );
}

export function VisualFabricaCasas() {
  const suelo = 100, cinta = 94, mw = 34, mh = 26, my = cinta - mh;
  const dientes = 4, fx0 = 12, fx1 = 176, dw = (fx1 - fx0) / dientes;
  let nave = `M${fx0},${suelo} L${fx0},40`;
  for (let i = 0; i < dientes; i++) nave += ` L${r1(fx0 + (i + 1) * dw)},26 L${r1(fx0 + (i + 1) * dw)},${i === dientes - 1 ? suelo : 40}`;
  const estaciones = [24, 74, 124];
  return (
    <svg viewBox="0 0 320 128" className="h-full w-full" role="img"
      aria-label="Fábrica de casas de madera: en el taller los módulos pasan de estructura a aislamiento y fachada, un camión los lleva y en obra se montan como una casa terminada con cubierta solar">
      <defs>
        <marker id="du-fab-flecha" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="fill-slate-400" />
        </marker>
      </defs>
      {/* Nave en dientes de sierra, en sección */}
      <path d={nave + ' Z'} className="fill-white stroke-slate-300" strokeWidth={1.4} strokeLinejoin="round" />
      {Array.from({ length: dientes }, (_, i) => (
        <line key={i} x1={r1(fx0 + (i + 1) * dw)} x2={r1(fx0 + (i + 1) * dw)} y1={27.5} y2={38.5} className="stroke-sky-300" strokeWidth={2.6} />
      ))}
      {/* Puente grúa */}
      <line x1={fx0 + 4} x2={fx1 - 4} y1={46} y2={46} className="stroke-slate-400" strokeWidth={2} />
      <rect x={estaciones[1] + mw / 2 - 5} y={44} width={10} height={5} rx={1} className="fill-slate-500" />
      <line x1={estaciones[1] + mw / 2} x2={estaciones[1] + mw / 2} y1={49} y2={57} className="stroke-slate-500" strokeWidth={0.8} />
      <rect x={estaciones[1] - 1} y={57} width={mw + 2} height={3.5} className="fill-amber-500" />

      {/* Cinta de montaje */}
      <rect x={fx0 + 4} y={cinta} width={fx1 - fx0 - 8} height={3} rx={1.5} className="fill-slate-300" />
      {Array.from({ length: 16 }, (_, i) => <circle key={i} cx={fx0 + 9 + i * 10} cy={cinta + 4.6} r={1.5} className="fill-slate-400" />)}
      <line x1={fx0} x2={fx1} y1={suelo} y2={suelo} className="stroke-slate-300" strokeWidth={1.2} />

      {/* 1 · Estructura de madera */}
      <g className="transition-transform duration-500 group-hover:translate-x-0.5">
        <rect x={estaciones[0]} y={my} width={mw} height={mh} fill="none" className="stroke-amber-600" strokeWidth={1.8} />
        {[1, 2, 3, 4].map(k => <line key={k} x1={estaciones[0] + (k * mw) / 5} x2={estaciones[0] + (k * mw) / 5} y1={my} y2={cinta} className="stroke-amber-600" strokeWidth={1.1} />)}
        <line x1={estaciones[0]} x2={estaciones[0] + mw} y1={my + mh / 2} y2={my + mh / 2} className="stroke-amber-500" strokeWidth={0.8} />
      </g>
      {/* 2 · Aislamiento y paneles */}
      <g className="transition-transform duration-500 group-hover:translate-x-0.5">
        <rect x={estaciones[1]} y={my} width={mw} height={mh} className="fill-yellow-100" />
        <path d={Array.from({ length: 5 }, (_, k) => `M${estaciones[1] + 1},${my + 4 + k * 5} q4,-3 8,0 t8,0 t8,0 t8,0`).join(' ')} fill="none" className="stroke-yellow-400" strokeWidth={0.9} />
        <rect x={estaciones[1]} y={my} width={mw * 0.45} height={mh} className="fill-amber-200" />
        <rect x={estaciones[1]} y={my} width={mw} height={mh} fill="none" className="stroke-amber-600" strokeWidth={1.8} />
      </g>
      {/* 3 · Módulo terminado */}
      <g className="transition-transform duration-500 group-hover:translate-x-0.5">
        <Modulo x={estaciones[2]} y={my} w={mw} h={mh} />
      </g>
      {[estaciones[0] + mw + 2, estaciones[1] + mw + 2].map(x => (
        <path key={x} d={`M${x + 3},${my + mh / 2 - 4} l5,4 l-5,4`} fill="none" className="stroke-slate-400" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      ))}

      {/* Camión */}
      <g className="transition-transform duration-700 group-hover:translate-x-1">
        <Modulo x={186} y={72} w={32} h={24} ventana={false} />
        <rect x={184} y={96} width={38} height={3} className="fill-slate-600" />
        <path d="M222,99 L222,84 L232,84 L237,91 L237,99 Z" className="fill-slate-600" />
        <path d="M224,86 L231,86 L234,91 L224,91 Z" className="fill-sky-200" />
        {[192, 212, 231].map(x => <g key={x}><circle cx={x} cy={101} r={3.6} className="fill-slate-700" /><circle cx={x} cy={101} r={1.3} className="fill-slate-300" /></g>)}
      </g>
      <line x1={178} x2={316} y1={105} y2={105} className="stroke-slate-300" strokeWidth={1} />

      {/* La casa montada en obra */}
      <g transform="translate(-7 0)">
        <path d="M244,72 L281,52 L318,72" fill="none" className="stroke-slate-700" strokeWidth={3} strokeLinejoin="round" />
        <path d="M284,54 L310,68 L306,70 L281,57 Z" className="fill-sky-700" />
        <path d="M286,57.5 L307,68.5" className="stroke-sky-400" strokeWidth={0.6} />
        <path d="M249,72 L281,55 L313,72 Z" className="fill-amber-200" />
        <Modulo x={249} y={72} w={32} h={33} ventana={false} />
        <Modulo x={281} y={72} w={32} h={33} ventana={false} />
        <line x1={281} x2={281} y1={70} y2={105} className="stroke-amber-800" strokeWidth={1.2} strokeDasharray="2 2" />
        <rect x={256} y={82} width={10} height={23} className="fill-amber-700" />
        <rect x={290} y={80} width={16} height={12} className="fill-sky-100 stroke-amber-700" strokeWidth={1} />
      </g>
      <text x={94} y={118} textAnchor="middle" className="fill-slate-500 text-[8.5px] uppercase tracking-[0.14em]">1 · Taller</text>
      <text x={210} y={118} textAnchor="middle" className="fill-slate-500 text-[8.5px] uppercase tracking-[0.14em]">2 · Camión</text>
      <text x={274} y={118} textAnchor="middle" className="fill-slate-500 text-[8.5px] uppercase tracking-[0.14em]">3 · Obra</text>
      <text x={248} y={24} textAnchor="middle" className="fill-amber-700 text-[9px] font-semibold uppercase tracking-[0.14em]">Módulos de madera</text>
    </svg>
  );
}


/* ── Agricultura sintrópica: una línea de cultivo con sus cuatro estratos ── */
const SUELO_S = 102;
const ESTRATOS = [
  { n: 'Emergente', y: 14 },
  { n: 'Alto', y: 40 },
  { n: 'Medio', y: 64 },
  { n: 'Bajo', y: 89 },
];

function Tronco({ x, top, w = 2.4 }: { x: number; top: number; w?: number }) {
  return (
    <g>
      <path d={`M${x - w / 2},${SUELO_S} L${x - w * 0.35},${top} L${x + w * 0.35},${top} L${x + w / 2},${SUELO_S} Z`} className="fill-amber-800" />
      {/* Raíces en la tierra viva */}
      <path d={`M${x},${SUELO_S + 3} q-6,4 -11,6 M${x},${SUELO_S + 3} q5,5 9,9 M${x},${SUELO_S + 3} q0,6 -2,12`} fill="none" className="stroke-amber-800" strokeWidth={0.8} opacity={0.3} />
    </g>
  );
}

/** A crown as a soft cluster of circles, with shade towards the lower right. */
function Nube({ x, cy, r, c, sombra, cfill, csombra }: { x: number; cy: number; r: number; c?: string; sombra?: string; cfill?: string; csombra?: string }) {
  const lobulos = [[-0.62, 0.12, 0.6], [0.62, 0.1, 0.62], [0, -0.38, 0.68], [0, 0.22, 0.72]];
  return (
    <g>
      {lobulos.map(([dx, dy, k], i) => <circle key={i} cx={r1(x + dx * r)} cy={r1(cy + dy * r)} r={r1(k * r)} className={c} fill={cfill} />)}
      <circle cx={r1(x + 0.35 * r)} cy={r1(cy + 0.32 * r)} r={r1(0.5 * r)} className={sombra} fill={csombra} opacity={0.55} />
    </g>
  );
}

function Emergente({ x }: { x: number }) {
  return (
    <g className="transition-transform duration-500 group-hover:-translate-y-0.5">
      <Tronco x={x} top={46} w={3} />
      {[[54, 8.5], [42, 8.8], [30, 7.6], [20, 5.4]].map(([y, r], i) => <circle key={i} cx={x} cy={y} r={r} className="fill-emerald-700" />)}
      {[[56, 5.5], [44, 5.6], [32, 4.6]].map(([y, r], i) => <circle key={i} cx={x + 3} cy={y + 1} r={r} className="fill-emerald-900" opacity={0.3} />)}
      {[[40, 3], [27, 2.4]].map(([y, r], i) => <circle key={i} cx={x - 3.5} cy={y} r={r} className="fill-white" opacity={0.14} />)}
    </g>
  );
}

function Mata({ x, r, c, flor }: { x: number; r: number; c: string; flor?: string }) {
  return (
    <g>
      <path d={`M${x - r * 1.4},${SUELO_S} C${x - r * 1.5},${SUELO_S - r * 1.7} ${x + r * 1.5},${SUELO_S - r * 1.7} ${x + r * 1.4},${SUELO_S} Z`} className={c} />
      {flor && [-0.7, -0.2, 0.3, 0.8].map((k, i) => <circle key={i} cx={r1(x + k * r)} cy={r1(SUELO_S - r * (i % 2 ? 1.1 : 0.8))} r={1.2} className={flor} />)}
    </g>
  );
}

function Vid({ x }: { x: number }) {
  return (
    <g className="transition-transform duration-500 group-hover:-translate-y-0.5">
      <path d={`M${x},${SUELO_S} C${x - 3},92 ${x + 3},84 ${x},74`} fill="none" className="stroke-amber-800" strokeWidth={2} />
      <Nube x={x} cy={72} r={9} c="fill-lime-500" sombra="fill-lime-700" />
      {[[-3, 79], [-1, 82], [-5, 82], [-3, 85], [-1, 86.5], [4, 78], [6, 81], [2, 81], [4, 84]].map(([dx, y], i) => <circle key={i} cx={x + dx} cy={y} r={1.6} className="fill-purple-600" />)}
    </g>
  );
}

export function VisualAgriculturaSintropica() {
  const especies = [
    { x: 124, t: 'almendro' }, { x: 158, t: 'viña' }, { x: 204, t: 'olivo' }, { x: 254, t: 'pistacho' },
  ];
  return (
    <svg viewBox="0 0 320 128" className="h-full w-full" role="img"
      aria-label="Una línea de bosque sintrópico en cuatro estratos, emergente, alto, medio y bajo, con almendro, viña, olivo y pistacho y el suelo siempre cubierto">
      <defs>
        <linearGradient id="du-sint-suelo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" stopOpacity={0.75} />
          <stop offset="1" stopColor="#fef3c7" stopOpacity={0.2} />
        </linearGradient>
      </defs>
      {/* Estratos */}
      {ESTRATOS.map(e => (
        <g key={e.n}>
          <line x1={58} x2={314} y1={e.y} y2={e.y} className="stroke-slate-300" strokeWidth={0.8} strokeDasharray="2 4" />
          <text x={8} y={e.y + 2.8} className="fill-slate-500 text-[7.5px] font-semibold uppercase tracking-[0.08em]">{e.n}</text>
        </g>
      ))}

      {/* Suelo cubierto: acolchado y tierra viva */}
      <rect x={58} y={SUELO_S} width={256} height={24} fill="url(#du-sint-suelo)" />
      <rect x={58} y={SUELO_S} width={256} height={3.5} rx={1.5} className="fill-amber-700" opacity={0.6} />
      {Array.from({ length: 42 }, (_, i) => (
        <line key={i} x1={60 + i * 6.1} x2={64 + i * 6.1} y1={SUELO_S + (i % 2 ? 0.8 : 2.8)} y2={SUELO_S + (i % 2 ? 2.8 : 0.8)} className="stroke-amber-300" strokeWidth={0.8} />
      ))}

      {/* Hierba entre las plantas: nunca suelo desnudo */}
      {Array.from({ length: 22 }, (_, i) => {
        const x = 62 + i * 11.8;
        return <path key={i} d={`M${r1(x)},${SUELO_S} l-1.6,-4 M${r1(x + 1)},${SUELO_S} l0.4,-5 M${r1(x + 2)},${SUELO_S} l2,-3.5`} className="stroke-lime-500" strokeWidth={0.9} strokeLinecap="round" />;
      })}
      <Emergente x={78} />
      <Mata x={100} r={8} c="fill-violet-300" flor="fill-violet-500" />
      {/* Almendro en flor */}
      <g className="transition-transform duration-500 group-hover:-translate-y-0.5">
        <Tronco x={124} top={60} />
        <Nube x={124} cy={56} r={14} c="fill-emerald-400" sombra="fill-emerald-600" />
        {[[-9, -4], [-3, -9], [5, -7], [10, 0], [-6, 3], [2, 1], [7, 6], [-1, -3], [-10, 5], [4, -12]].map(([dx, dy], i) => (
          <circle key={i} cx={124 + dx} cy={56 + dy} r={1.5} className={i % 3 ? 'fill-pink-300' : 'fill-white'} />
        ))}
      </g>
      <Vid x={158} />
      <Mata x={181} r={7.5} c="fill-emerald-600" flor="fill-sky-300" />
      {/* Olivo: copa ancha y plateada */}
      <g className="transition-transform duration-500 group-hover:-translate-y-0.5">
        <path d="M202,102 C203,88 199,80 196,70 M204,102 C203,88 208,80 211,70" fill="none" className="stroke-amber-800" strokeWidth={2.6} strokeLinecap="round" />
        <path d="M200,108 q-7,3 -12,4 M206,108 q6,4 10,8" fill="none" className="stroke-amber-800" strokeWidth={0.8} opacity={0.3} />
        <Nube x={204} cy={59} r={15} cfill="#a3b18a" csombra="#6b7b52" />
        {[[-7, 2], [3, -4], [8, 3], [-2, 7], [-10, -3], [5, 8]].map(([dx, dy], i) => <circle key={i} cx={204 + dx} cy={59 + dy} r={1.4} fill="#3f4a2a" />)}
      </g>
      <Mata x={229} r={8} c="fill-lime-400" flor="fill-yellow-400" />
      {/* Pistacho con sus racimos */}
      <g className="transition-transform duration-500 group-hover:-translate-y-0.5">
        <Tronco x={254} top={62} />
        <Nube x={254} cy={58} r={13} c="fill-green-500" sombra="fill-green-700" />
        {[[-7, -2], [-5, 0], [-8, 1], [5, -6], [7, -4], [3, 5], [5, 7], [1, 6]].map(([dx, dy], i) => <circle key={i} cx={254 + dx} cy={58 + dy} r={1.4} className="fill-rose-400" />)}
      </g>
      <Mata x={278} r={7} c="fill-emerald-500" flor="fill-white" />
      <Emergente x={300} />

      <text x={8} y={SUELO_S + 12} className="fill-amber-700 text-[7.5px] font-semibold uppercase tracking-[0.08em]">Suelo</text>
      <text x={8} y={SUELO_S + 21} className="fill-amber-700 text-[7.5px] uppercase tracking-[0.08em]">cubierto</text>
      {especies.map(e => <text key={e.t} x={e.x} y={SUELO_S + 17} textAnchor="middle" className="fill-amber-900 text-[8px] font-semibold">{e.t}</text>)}
    </svg>
  );
}
