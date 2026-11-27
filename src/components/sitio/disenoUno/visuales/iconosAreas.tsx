// ============================================================================
// DISEÑO 1 · ICONOS DE ÁREA para el menú de píldoras (2026-11-27)
// ============================================================================
// Same style as the topic buttons of the political geometry
// (`ILUS` in `public/observatorio-polarizacion/index.html`): a very light disc of the
// area's colour behind a thin, round-capped line drawing, plus one soft second tone.
// viewBox 0 0 32 32. Colours are literal Tailwind classes so the build keeps them.

type Area = 'energia' | 'movilidad' | 'vivienda' | 'politica' | 'economia' | 'agricultura' | 'informatica' | 'conciencia';

const TONO: Record<Area | 'otra', { disco: string; trazo: string; suave: string }> = {
  energia: { disco: 'fill-amber-100', trazo: 'stroke-amber-600', suave: 'fill-amber-300' },
  movilidad: { disco: 'fill-sky-100', trazo: 'stroke-sky-600', suave: 'fill-sky-300' },
  vivienda: { disco: 'fill-emerald-100', trazo: 'stroke-emerald-600', suave: 'fill-emerald-300' },
  politica: { disco: 'fill-rose-100', trazo: 'stroke-rose-500', suave: 'fill-rose-300' },
  economia: { disco: 'fill-indigo-100', trazo: 'stroke-indigo-500', suave: 'fill-indigo-300' },
  agricultura: { disco: 'fill-lime-100', trazo: 'stroke-lime-700', suave: 'fill-lime-300' },
  informatica: { disco: 'fill-cyan-100', trazo: 'stroke-cyan-600', suave: 'fill-cyan-300' },
  conciencia: { disco: 'fill-violet-100', trazo: 'stroke-violet-500', suave: 'fill-violet-300' },
  otra: { disco: 'fill-slate-100', trazo: 'stroke-slate-500', suave: 'fill-slate-300' },
};

/** The drawing itself, without the <svg>: shared by the icon and the test sheet. */
function Dibujo({ area }: { area: string }) {
  const clave = (Object.hasOwn(TONO, area) ? area : 'otra') as Area | 'otra';
  const t = TONO[clave];
  const s = { fill: 'none', className: t.trazo, strokeWidth: 1.3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <>
      <circle cx={16} cy={16} r={15} className={t.disco} />
      {area === 'energia' && <>
        {/* Sol sobre una placa solar */}
        <circle cx={21} cy={10} r={3} className={t.suave} />
        <g {...s}>
          <circle cx={21} cy={10} r={3} />
          <path d="M21,4.5v1.3M26.5,10h-1.3M24.9,6.1l-.9.9M17.1,6.1l.9.9M24.9,13.9l-.9-.9" />
          <path d="M8,16h11l3,8H5z" />
          <path d="M6.5,20h14M11.5,16l-1.4,8M15.5,16l1.4,8M13.5,24v3.5M10,27.5h7" />
        </g>
      </>}
      {area === 'movilidad' && <>
        {/* Bicicleta */}
        <circle cx={9} cy={20} r={4.6} className={t.suave} opacity={0.45} />
        <circle cx={23} cy={20} r={4.6} className={t.suave} opacity={0.45} />
        <g {...s}>
          <circle cx={9} cy={20} r={4.6} />
          <circle cx={23} cy={20} r={4.6} />
          <path d="M9,20l4.5-8h7L23,20M13.5,12l3.5,8h-8M17,20l3.5-8M12,9.5h3.5M19.5,9h2.5l-1.5,3" />
        </g>
      </>}
      {area === 'vivienda' && <>
        {/* Casa con hoja */}
        <path d="M9,15.5V25h14v-9.5L16,9.5z" className={t.suave} opacity={0.4} />
        <g {...s}>
          <path d="M6,16.5l10-8.5 10,8.5" />
          <path d="M9,14.5V25h14V14.5" />
          <path d="M14,25v-5.5h4V25" />
          <path d="M20.5,7.5c3,0 4.5,1.5 4.5,4.5c-3,0-4.5-1.5-4.5-4.5z" />
        </g>
      </>}
      {area === 'politica' && <>
        {/* Urna con papeleta */}
        <rect x={8} y={15} width={16} height={11} rx={1.5} className={t.suave} opacity={0.4} />
        <g {...s}>
          <rect x={8} y={15} width={16} height={11} rx={1.5} />
          <path d="M12.5,15h7" />
          <path d="M13,15V7.5h6.5V15" />
          <path d="M14.8,10.5l1.4,1.4 2-2.4" />
          <path d="M12,20.5h8" />
        </g>
      </>}
      {area === 'economia' && <>
        {/* Barras que suben y monedas */}
        <ellipse cx={22} cy={23.5} rx={4} ry={1.6} className={t.suave} />
        <ellipse cx={22} cy={20.5} rx={4} ry={1.6} className={t.suave} />
        <g {...s}>
          <path d="M7,25h8M8.5,25v-4M12,25v-7" />
          <path d="M7,14.5l4.5-4 3,2 5.5-5.5m0,0h-3.5m3.5,0v3.5" />
          <ellipse cx={22} cy={20.5} rx={4} ry={1.6} />
          <path d="M18,20.5v3c0,.9 1.8,1.6 4,1.6s4-.7 4-1.6v-3" />
          <path d="M18,17.5v3M26,17.5v3" />
          <ellipse cx={22} cy={17.5} rx={4} ry={1.6} />
        </g>
      </>}
      {area === 'agricultura' && <>
        {/* Brote sobre surcos */}
        <path d="M16,17c-5.5,0-8-2.5-8-7.5c5.5,0 8,2.5 8,7.5z" className={t.suave} opacity={0.55} />
        <g {...s}>
          <path d="M16,25V12" />
          <path d="M16,17c-5.5,0-8-2.5-8-7.5c5.5,0 8,2.5 8,7.5z" />
          <path d="M16,14c0-4 2-6.5 7-6.5c0,4-2,6.5-7,6.5z" />
          <path d="M6,25h20M9,28h14" />
        </g>
      </>}
      {area === 'informatica' && <>
        {/* Portátil con código */}
        <rect x={8} y={9} width={16} height={11} rx={1.2} className={t.suave} opacity={0.4} />
        <g {...s}>
          <rect x={8} y={9} width={16} height={11} rx={1.2} />
          <path d="M5,23.5h22l-1.5-3.5H6.5z" />
          <path d="M13.5,12.5l-2.5,2 2.5,2M18.5,12.5l2.5,2-2.5,2M16.8,12l-1.6,5" />
        </g>
      </>}
      {area === 'conciencia' && <>
        {/* Flor de loto y ondas */}
        <path d="M16,23c-3-3-3.5-7.5 0-11.5c3.5,4 3,8.5 0,11.5z" className={t.suave} opacity={0.6} />
        <g {...s}>
          <path d="M16,23c-3-3-3.5-7.5 0-11.5c3.5,4 3,8.5 0,11.5z" />
          <path d="M16,23c-4.5.5-8-1.5-9-6c4,0 7,2 9,6z" />
          <path d="M16,23c4.5.5 8-1.5 9-6c-4,0-7,2-9,6z" />
          <path d="M8,26.5c5,1.2 11,1.2 16,0" />
          <path d="M12,7.5a6,6 0 0 1 8,0" opacity={0.7} />
          <path d="M10,5a9,9 0 0 1 12,0" opacity={0.4} />
        </g>
      </>}
      {clave === 'otra' ? <>
        {/* Genérico: una estrella de cuatro puntas */}
        <path d="M16,7l2.2,6.8L25,16l-6.8,2.2L16,25l-2.2-6.8L7,16l6.8-2.2z" className={t.suave} opacity={0.5} />
        <path d="M16,7l2.2,6.8L25,16l-6.8,2.2L16,25l-2.2-6.8L7,16l6.8-2.2z" {...s} />
      </> : null}
    </>
  );
}

export function IconoArea({ area, className }: { area: string; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-8 w-8'} aria-hidden="true">
      <Dibujo area={area} />
    </svg>
  );
}

const MUESTRA: { a: Area; n: string }[] = [
  { a: 'energia', n: 'Energía' }, { a: 'movilidad', n: 'Movilidad' }, { a: 'vivienda', n: 'Vivienda' },
  { a: 'politica', n: 'Política' }, { a: 'economia', n: 'Economía' }, { a: 'agricultura', n: 'Agricultura' },
  { a: 'informatica', n: 'Informática' }, { a: 'conciencia', n: 'Conciencia' },
];

/** Test sheet only: the eight icons in a row, and three of them as menu pills. */
export function VisualPruebaIconos() {
  return (
    <svg viewBox="0 0 320 128" className="h-full w-full" role="img" aria-label="Los ocho iconos de área del menú">
      {MUESTRA.map((m, i) => (
        <g key={m.a}>
          <svg x={6 + i * 39} y={10} width={32} height={32} viewBox="0 0 32 32"><Dibujo area={m.a} /></svg>
          <text x={22 + i * 39} y={54} textAnchor="middle" className="fill-slate-600 text-[6.5px] font-semibold">{m.n}</text>
        </g>
      ))}
      {MUESTRA.slice(0, 3).concat(MUESTRA.slice(7)).map((m, i) => {
        const x = 4 + i * 79;
        return (
          <g key={m.a} transform={`translate(${x} 72)`}>
            <rect width={75} height={26} rx={13} className="fill-white stroke-slate-200" strokeWidth={1} />
            <svg x={3} y={3} width={20} height={20} viewBox="0 0 32 32"><Dibujo area={m.a} /></svg>
            <text x={27} y={16.5} className="fill-slate-700 text-[9px] font-semibold">{m.n}</text>
          </g>
        );
      })}
      <svg x={8} y={104} width={20} height={20} viewBox="0 0 32 32"><Dibujo area="otra" /></svg>
      <text x={32} y={117} className="fill-slate-400 text-[8px]">genérico</text>
    </svg>
  );
}
