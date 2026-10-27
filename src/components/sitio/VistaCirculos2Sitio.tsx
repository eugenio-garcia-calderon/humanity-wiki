import { useEffect, useMemo, useRef, useState, type MouseEvent as ME } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { colorDeNota, textoSobre, tonosDeNota } from '../../utils/nota';
import { miniatura } from '../../utils/miniatura';
import { useTerritorioActual } from '../bloquesDatos/filtroTerritorio/ElegirTerritorio';
import { useSitio } from './ContextoSitio';
import { useCirculos, type Circulo, type Sistema } from './VistaCirculosSitio';

// ============================================================================
// CÍRCULO 2.0 (2026-10-27, Eugenio)
// ============================================================================
// «Una cuarta vista como la del círculo, pero mucho más pro de UX, diseño y UI.»
// Los mismos datos que la vista de círculos (columna «Círculo» de la base de datos
// de Sistemas), dibujados como un diagrama de anillos: cada anillo es un círculo,
// cada porción un sistema, y su color es su nota. El hueco de arriba lleva el
// nombre de cada anillo y su media; el centro, la nota media del territorio. Al
// pasar por una porción (o tocarla, en el móvil) su ficha aparece al lado; al
// pinchar, se abre el sistema. Pinchar un anillo abre su página intermedia
// (`?vista=circulos2&circulo=sociedad`). Se pulió en rondas con un bot evaluador
// de diseño (elegancia, comprensibilidad, estilo y UX) hasta pasar del 9.

const DESCRIPCION: Record<string, string> = {
  personas: 'Lo que cada persona necesita para vivir bien.',
  hogar: 'Dónde y con quién vivimos.',
  sociedad: 'Cómo convivimos, decidimos y compartimos.',
  tecnologia: 'Lo que fabricamos, movemos y conectamos.',
  planeta: 'Lo que nos sostiene a todos.',
};

const C = 500, R0 = 136, R1 = 490, HUECO = 32, JUNTA = 3; // centro, radios del primer y último anillo, medio hueco de arriba (grados) y media junta entre anillos
const polar = (r: number, a: number) => [C + r * Math.sin(a * Math.PI / 180), C - r * Math.cos(a * Math.PI / 180)];
const f = (n: number) => n.toFixed(2);
function sector(r1: number, r2: number, a1: number, a2: number) {
  const [x1, y1] = polar(r2, a1), [x2, y2] = polar(r2, a2), [x3, y3] = polar(r1, a2), [x4, y4] = polar(r1, a1);
  const g = a2 - a1 > 180 ? 1 : 0;
  return `M${f(x1)} ${f(y1)}A${r2} ${r2} 0 ${g} 1 ${f(x2)} ${f(y2)}L${f(x3)} ${f(y3)}A${r1} ${r1} 0 ${g} 0 ${f(x4)} ${f(y4)}Z`;
}
/** El arco por el que corre el nombre: en la mitad de abajo va al revés, para leerlo siempre de izquierda a derecha. */
function arco(r: number, a1: number, a2: number) {
  const m = (a1 + a2) / 2, abajo = m > 90 && m < 270;
  const [x1, y1] = polar(r, abajo ? a2 : a1), [x2, y2] = polar(r, abajo ? a1 : a2);
  return { d: `M${f(x1)} ${f(y1)}A${r} ${r} 0 0 ${abajo ? 0 : 1} ${f(x2)} ${f(y2)}`, abajo };
}
const coma = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','));
const redondo = (n: number) => Math.round(n * 10) / 10;
/** El color de la nota mezclado con blanco (0 = el color, 1 = blanco): la escala es la de siempre, solo cambia cuánto pesa. */
const mezcla = (hex: string, blanco: number) => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${c.map(v => Math.round(v + (255 - v) * blanco)).join(',')})`;
};
const colorDe = (n: number | null) => (n != null ? colorDeNota(n) : '#94a3b8');
// ¿Se maneja con el dedo? Lo dice la pantalla y, por si acaso, el último toque.
let ultimoPuntero = '';
if (typeof document !== 'undefined') document.addEventListener('pointerdown', e => { ultimoPuntero = e.pointerType; }, true);
const sinHover = () => typeof window !== 'undefined' && (ultimoPuntero === 'touch' || !!window.matchMedia?.('(hover: none), (pointer: coarse)').matches);
/** ¿Se dibuja pequeño el círculo (en el móvil o en una ventana baja)? Entonces sus textos crecen para no bajar de
 *  unos 10 px reales, y las porciones solo llevan la nota: el nombre sale en la ficha. Se mide el propio dibujo. */
function useCompacto() {
  const ref = useRef<SVGSVGElement>(null);
  const [ancho, setAncho] = useState(1000);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setAncho(el.getBoundingClientRect().width || 1000)); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, compacto: ancho < 540 };
}
/** Los sistemas con la nota más baja: «lo más urgente». */
const masBajos = (circulos: Circulo[], k = 2) => circulos.flatMap((c, i) => c.sistemas.map(s => ({ s, c, i }))).filter(x => x.s.nota != null).sort((a, b) => a.s.nota! - b.s.nota!).slice(0, k);

type Sel = { tipo: 'sistema'; s: Sistema; c: Circulo; i: number } | { tipo: 'circulo'; i: number } | null;

const CSS = `
.c2 { overflow-x: clip; }
.c2-anillo { animation: c2-entra .7s cubic-bezier(.2,.8,.2,1) both; transform-origin: 500px 500px; }
@keyframes c2-entra { from { opacity: 0; transform: scale(.94) rotate(-5deg); } to { opacity: 1; transform: none; } }
.c2-porcion, .c2 a.c2-porcion:focus, .c2 a.c2-porcion:focus-visible { transition: opacity .2s ease; cursor: pointer; outline: none !important; box-shadow: none !important; }
.c2-porcion path.c2-forma { stroke: #fff; stroke-width: 2.5; transition: fill .18s ease; }
.c2-porcion:focus-visible path.c2-forma { stroke: #0f172a; stroke-width: 6; paint-order: stroke; }
.c2-porcion:focus-visible path.c2-borde { stroke: #fff; stroke-width: 2.5; }
.c2-tenue .c2-porcion:not(.c2-on) { opacity: .35; }
.c2-nombre { font-weight: 600; pointer-events: none; }
.c2-ficha { animation: c2-aparece .22s ease both; }
@keyframes c2-aparece { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .c2-anillo, .c2-ficha { animation: none; } .c2-porcion, .c2-porcion path.c2-forma { transition: none; } }
`;

/** Un icono de anillos con el suyo marcado: dice de un vistazo dónde está cada círculo. */
function IconoAnillo({ i, n, color, tam = 34 }: { i: number; n: number; color: string; tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 40 40" aria-hidden className="shrink-0">
      {Array.from({ length: n }, (_, k) => n - 1 - k).map(k => (
        <circle key={k} cx={20} cy={20} r={4 + k * (15 / Math.max(1, n - 1))} fill={k === i ? color : '#fff'} stroke={k === i ? color : '#cbd5e1'} strokeWidth={1.2} />
      ))}
    </svg>
  );
}

function Pastilla({ nota, grande = false }: { nota: number | null; grande?: boolean }) {
  if (nota == null) return <span className="text-sm text-slate-400">Sin nota</span>;
  const color = colorDeNota(nota);
  return (
    <span className={`inline-flex shrink-0 items-baseline rounded-full font-black tabular-nums ${grande ? 'px-3 py-1 text-xl' : 'px-2 py-0.5 text-sm'}`}
      style={{ background: color, color: textoSobre(color) }}>
      {coma(nota)}<span className={`ml-0.5 font-semibold opacity-70 ${grande ? 'text-xs' : 'text-[11px]'}`}>/10</span>
    </span>
  );
}

/** Un sistema en pequeño: nombre y nota en su tono, con enlace. */
function Chip({ s, enlace, onElegir, on = false, marca = false, ancho = false }: {
  s: Sistema; enlace: (id: string) => string; onElegir?: () => boolean; on?: boolean;
  /** La más baja de su grupo: tintada de su color. */ marca?: boolean;
  /** A todo el ancho de su celda (rejilla de 2×2). */ ancho?: boolean;
}) {
  const color = colorDe(s.nota);
  return (
    <Link to={enlace(s.id)} onClick={e => { e.stopPropagation(); if (onElegir?.()) { e.preventDefault(); return; } window.scrollTo(0, 0); }}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-1 text-[12.5px] font-semibold transition hover:border-slate-400 hover:text-slate-900 ${ancho ? 'w-full justify-between' : ''} ${on ? 'border-slate-900 bg-slate-100 text-slate-900 ring-[0.5px] ring-slate-900' : marca ? 'text-slate-900' : 'border-slate-200 bg-white text-slate-700'}`}
      style={marca && !on ? { background: mezcla(color, 0.85), borderColor: color, borderWidth: 1.5 } : undefined}>
      {s.titulo}{s.nota != null && <b className="tabular-nums" style={{ color: tonosDeNota(s.nota).tinta }}>{coma(s.nota)}</b>}
    </Link>
  );
}

/** Pastillas de sistemas con su etiqueta encima: en una fila si son tres o menos, en rejilla de 2×2 si son cuatro. */
function Grupo({ titulo, sistemas, enlace, marcar }: { titulo: string; sistemas: Sistema[]; enlace: (id: string) => string; marcar?: string }) {
  const rejilla = sistemas.length === 4;
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{titulo}</div>
      <div className={rejilla ? 'grid grid-cols-2 gap-[5px]' : 'flex flex-wrap gap-[5px]'}>
        {sistemas.map(x => <Chip key={x.id} s={x} enlace={enlace} marca={x.id === marcar} ancho={rejilla} />)}
      </div>
    </div>
  );
}

/** La escala de color de las notas, con una marca opcional donde cae una. */
function Escala({ marca }: { marca?: number | null }) {
  return (
    <div className="w-full" aria-hidden>
      <div className="relative flex h-2 rounded-full">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => <span key={p} className="h-full flex-1 first:rounded-l-full last:rounded-r-full" style={{ background: colorDeNota(p) }} />)}
        {marca != null && <span className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-slate-900 ring-2 ring-white" style={{ left: `${(Math.max(1, Math.min(10, marca)) - 0.5) * 10}%` }} />}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-slate-500"><span>1 · Crítico</span><span>5 · Neutro</span><span>10 · Excelente</span></div>
    </div>
  );
}

/** El diagrama de anillos. `mini`: sin textos, con solo el anillo `activo` en color (la cabecera de la página de un círculo). */
function Diagrama({ circulos, sel, setSel, enlace, abrir, media, territorio, mini = false, activo = null }: {
  circulos: Circulo[]; sel: Sel; setSel: (s: Sel) => void; enlace: (id: string) => string; abrir: (c: Circulo) => void;
  media: number | null; territorio: string; mini?: boolean; activo?: number | null;
}) {
  const ir = useNavigate();
  const { ref, compacto: movil } = useCompacto();
  const tactil = sinHover();
  const n = circulos.length, t = (R1 - R0) / n;
  const anilloSel = sel ? sel.i : null;
  const tenue = !mini && sel != null;
  return (
    <svg ref={ref} viewBox="0 0 1000 1000" className={`block h-auto w-full ${tenue ? 'c2-tenue' : ''}`}
      role="group" aria-label={`Círculos de la humanidad: ${circulos.map(c => c.nombre).join(', ')}`} data-diagrama-c2={mini ? 'mini' : ''}>
      <defs>
        <filter id="c2-sombra" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0f172a" floodOpacity=".10" /></filter>
      </defs>
      {circulos.map((c, i) => {
        const r1 = R0 + i * t + JUNTA, r2 = R0 + (i + 1) * t - JUNTA, m = (r1 + r2) / 2;
        const tramo = (360 - 2 * HUECO) / c.sistemas.length;
        const anilloOn = anilloSel === i;
        const apagado = mini && activo !== i;
        return (
          <g key={c.clave} className={mini ? '' : 'c2-anillo'} style={mini ? undefined : { animationDelay: `${i * 70}ms` }} data-anillo-c2={c.clave}>
            {c.sistemas.map((s, k) => {
              const a1 = HUECO + k * tramo, a2 = a1 + tramo;
              const color = colorDe(s.nota);
              const on = (sel?.tipo === 'sistema' && sel.s.id === s.id) || (sel?.tipo === 'circulo' && anilloOn);
              const relleno = apagado ? '#dce3ea' : on ? color : mezcla(color, 0.6);
              const tinta = on ? textoSobre(color) : tonosDeNota(s.nota ?? 5).tinta;
              const largo = (tramo * Math.PI / 180) * m;
              const conNombre = largo >= 120;
              const tam = Math.min(21, Math.max(17, (largo * 0.8) / (s.titulo.length + 3) * 1.8));
              // La línea base, a un tercio de letra del centro del anillo: hacia dentro arriba y hacia fuera abajo, donde el texto va al revés.
              const { d } = arco(abajo0(a1, a2) ? m + tam * 0.35 : m - tam * 0.35, a1, a2);
              const idArco = `c2-${mini ? 'm' : 'a'}-${c.clave}-${k}`;
              return (
                <a key={s.id} href={enlace(s.id)} className={`c2-porcion${on ? ' c2-on' : ''}`} style={apagado ? { pointerEvents: 'none' } : undefined} tabIndex={apagado ? -1 : undefined}
                  aria-label={`${s.titulo}: ${s.nota != null ? `${coma(s.nota)} sobre 10` : 'sin nota'}. Círculo ${c.nombre}.`}
                  onMouseEnter={() => { if (!mini && !sinHover()) setSel({ tipo: 'sistema', s, c, i }); }} onFocus={() => !mini && !sinHover() && setSel({ tipo: 'sistema', s, c, i })}
                  onMouseLeave={() => { if (!mini && !sinHover()) setSel(null); }} onBlur={() => !mini && !sinHover() && setSel(null)}
                  onClick={(e: ME) => {
                    e.preventDefault();
                    // En el móvil, el primer toque enseña la ficha; el segundo (o «Abrir») abre el sistema.
                    if (!mini && sinHover() && !(sel?.tipo === 'sistema' && sel.s.id === s.id)) { setSel({ tipo: 'sistema', s, c, i }); return; }
                    ir(enlace(s.id)); window.scrollTo(0, 0);
                  }} data-porcion-c2={s.titulo}>
                  {mini && <title>{`${s.titulo}: ${s.nota != null ? coma(s.nota) : '—'} / 10`}</title>}
                  <path className="c2-forma" d={sector(r1, r2, a1, a2)} fill={relleno} style={mini ? { strokeWidth: 10 } : undefined} />
                  {!mini && <path className="c2-borde" d={sector(r1 + 4, r2 - 4, a1 + 0.6, a2 - 0.6)} fill="none" stroke="none" />}
                  {/* En pantallas táctiles, un margen invisible de 8 px para el dedo. */}
                  {tactil && !mini && <path d={sector(r1, r2, a1, a2)} fill="none" stroke="transparent" strokeWidth={16} style={{ pointerEvents: 'stroke' }} />}
                  {!mini && <>
                    <path id={idArco} d={d} fill="none" stroke="none" />
                    {!movil && <text className="c2-nombre" fontSize={tam} fill={tinta}>
                      <textPath href={`#${idArco}`} startOffset="50%" textAnchor="middle">
                        {conNombre && s.titulo}{s.nota != null && <tspan fontWeight={800} dx={conNombre ? 8 : 0}>{coma(s.nota)}</tspan>}
                      </textPath>
                    </text>}
                    {movil && s.nota != null && (() => { const [x, y] = polar(m, (a1 + a2) / 2); return <text className="c2-nombre" x={x} y={y + 13} textAnchor="middle" fontSize={38} fontWeight={900} fill={tinta}>{coma(s.nota)}</text>; })()}
                  </>}
                </a>
              );
            })}
            {/* El nombre del anillo y su media, en el hueco de arriba: también abre su página. */}
            {!mini && (
              <g className="cursor-pointer" onClick={() => abrir(c)} onMouseEnter={() => !sinHover() && setSel({ tipo: 'circulo', i })} onMouseLeave={() => !sinHover() && setSel(null)}
                role="link" tabIndex={0} aria-label={`Abrir el círculo ${c.nombre}`} onKeyDown={e => { if (e.key === 'Enter') abrir(c); }} data-rotulo-c2={c.clave}>
                <path d={sector(r1, r2, -HUECO, HUECO)} fill={anilloOn ? mezcla(colorDe(c.nota), 0.82) : 'transparent'} />
                <text x={C} y={C - m + (movil ? 10 : 6.5)} textAnchor="middle" fontSize={movil ? 30 : 18} fontWeight={700} letterSpacing={movil ? 0.5 : 1} fill={anilloOn ? '#0f172a' : '#334155'}>
                  {c.nombre.toUpperCase()}{!movil && c.nota != null && <tspan fontWeight={800} fill={tonosDeNota(c.nota).tinta}>{` · ${coma(redondo(c.nota))}`}</tspan>}
                </text>
              </g>
            )}
          </g>
        );
      })}
      {/* El centro: la nota media de todos los sistemas en el territorio. */}
      {!mini && <>
        <g filter="url(#c2-sombra)"><circle cx={C} cy={C} r={R0 - 8} fill="#fff" /></g>
        <circle cx={C} cy={C} r={R0 - 8} fill="none" stroke={media != null ? mezcla(colorDeNota(media), 0.3) : '#e2e8f0'} strokeWidth={5} />
        <text x={C} y={C - (movil ? 50 : 46)} textAnchor="middle" fontSize={movil ? 30 : 22} fontWeight={700} fill="#475569">{territorio}</text>
        {media != null && <text x={C} y={C + 30} textAnchor="middle" fontSize={movil ? 84 : 76} fontWeight={900} fill="#0f172a" letterSpacing="-2">{coma(redondo(media))}</text>}
        <text x={C} y={C + (movil ? 76 : 66)} textAnchor="middle" fontSize={movil ? 30 : 20} fontWeight={600} fill="#475569">media de 10</text>
      </>}
      {mini && activo != null && circulos[activo].nota != null && <>
        <text x={C} y={C + 20} textAnchor="middle" fontSize={78} fontWeight={800} fill={tonosDeNota(circulos[activo].nota!).tinta}>{coma(redondo(circulos[activo].nota!))}</text>
        <text x={C} y={C + 78} textAnchor="middle" fontSize={52} fontWeight={600} fill="#475569">media</text>
      </>}
    </svg>
  );
}
/** La mitad de abajo del círculo, donde el texto corre al revés. */
const abajo0 = (a1: number, a2: number) => { const m = (a1 + a2) / 2; return m > 90 && m < 270; };

function Ficha({ sel, circulos, territorio, media, enlace }: { sel: Sel; circulos: Circulo[]; territorio: string; media: number | null; enlace: (id: string) => string }) {
  if (sel?.tipo === 'sistema') {
    const { s, c, i } = sel;
    return (
      <div key={s.id} className="c2-ficha flex h-full flex-col" data-ficha-c2>
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          <IconoAnillo i={i} n={circulos.length} color={colorDe(c.nota)} tam={18} /> {c.nombre} · círculo {i + 1} de {circulos.length}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-50">
            {s.imagen && <img src={miniatura(s.imagen, 160)} alt="" className="absolute inset-0 h-full w-full object-contain p-1" />}
          </div>
          <h3 className="min-w-0 flex-1 text-2xl font-extrabold leading-tight tracking-tight text-slate-900">{s.titulo}</h3>
          <Pastilla nota={s.nota} grande />
        </div>
        {s.descripcion && <p className="mt-2.5 line-clamp-2 shrink-0 text-[15px] leading-snug text-slate-600 [text-wrap:pretty]">{s.descripcion}</p>}
        {/* Comparado con su círculo y con todo el territorio: lo que la nota sola no dice. */}
        {s.nota != null && <div className="mt-4 grid shrink-0 grid-cols-2 gap-2">
          {[[`Frente a ${c.nombre}`, c.nota], [`Frente a ${territorio}`, media]].map(([t, ref]) => {
            if (ref == null) return null;
            const d = redondo(s.nota! - (ref as number));
            return <div key={t as string} className="rounded-xl bg-slate-50 px-3 py-2">
              <div className="truncate text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{t as string}</div>
              <div className="text-[15px] font-extrabold text-slate-900">{d === 0 ? 'Igual' : `${d > 0 ? '+' : '−'}${coma(Math.abs(d))}`}<span className="ml-1 text-xs font-semibold text-slate-500">{d === 0 ? `(${coma(redondo(ref as number))})` : d > 0 ? 'por encima' : 'por debajo'}</span></div>
            </div>;
          })}
        </div>}
        {c.sistemas.length > 1 && <div className="mt-4"><Grupo titulo={`También en ${c.nombre}`} sistemas={c.sistemas.filter(x => x.id !== s.id)} enlace={enlace} /></div>}
        <div className="mt-auto pt-3 [@media(max-height:720px)]:hidden"><Escala marca={s.nota} /></div>
        <Link to={enlace(s.id)} onClick={() => window.scrollTo(0, 0)} className="mt-auto inline-flex pt-3 [@media(min-height:721px)]:mt-3 items-center gap-1.5 text-sm font-bold text-slate-900">Abrir {s.titulo} <ArrowRight className="h-4 w-4" /></Link>
      </div>
    );
  }
  if (sel?.tipo === 'circulo') {
    const c = circulos[sel.i];
    return (
      <div key={c.clave} className="c2-ficha flex h-full flex-col" data-ficha-c2>
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          <IconoAnillo i={sel.i} n={circulos.length} color={colorDe(c.nota)} tam={18} /> {c.nombre} · círculo {sel.i + 1} de {circulos.length}
        </div>
        <div className="flex items-start justify-between gap-3"><h3 className="text-2xl font-black tracking-tight text-slate-900">{c.nombre}</h3><Pastilla nota={c.nota} grande /></div>
        <p className="mt-1 text-[15px] leading-snug text-slate-600 [text-wrap:pretty]">{DESCRIPCION[c.clave] || ''} Su nota es la media de sus {c.sistemas.length} sistemas; en color, el más bajo.</p>
        <div className="mt-4"><Grupo titulo="Sus sistemas" sistemas={c.sistemas} enlace={enlace} marcar={masBajos([c], 1)[0]?.s.id} /></div>
        <div className="mt-auto pt-3 [@media(max-height:720px)]:hidden"><Escala marca={c.nota} /></div>
        <p className="mt-auto inline-flex items-center gap-1.5 pt-3 text-sm font-bold text-slate-900 [@media(min-height:721px)]:mt-3">Pincha para ver el círculo <ArrowRight className="h-4 w-4" /></p>
      </div>
    );
  }
  const total = circulos.reduce((t, c) => t + c.sistemas.length, 0);
  return (
    <div className="c2-ficha flex h-full flex-col" data-ficha-c2>
      <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Cómo leerlo</div>
      <h3 className="text-2xl font-black leading-tight tracking-tight text-slate-900">De cada persona al planeta</h3>
      <ul className="mt-3 flex flex-col gap-2.5 text-[15px] leading-snug text-slate-600">
        <li className="flex gap-3"><IconoAnillo i={0} n={circulos.length} color="#334155" tam={26} /><span><b className="text-slate-900">Cada anillo es un círculo.</b> En el centro, lo más cercano a cada persona; fuera, lo que nos sostiene a todos.</span></li>
        <li className="flex gap-3"><svg width={26} height={26} viewBox="0 0 26 26" aria-hidden className="shrink-0"><path d="M13 13 L13 1 A12 12 0 0 1 24.4 9.3 Z" fill={colorDeNota(6)} /><circle cx={13} cy={13} r={12} fill="none" stroke="#cbd5e1" /></svg><span><b className="text-slate-900">Cada porción es un sistema</b> —{total} en total— y su color, su nota en {territorio}.</span></li>
        <li className="flex gap-3"><span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border border-slate-300 text-[11px] font-black text-slate-900">{media != null ? coma(redondo(media)) : '—'}</span><span><b className="text-slate-900">En el centro,</b> la nota media de todos.</span></li>
      </ul>
      <div className="mt-4" data-mas-bajo-c2><Grupo titulo="Lo más bajo" sistemas={masBajos(circulos).map(x => x.s)} enlace={enlace} /></div>
      <div className="mt-auto pt-3 [@media(max-height:720px)]:hidden"><Escala marca={media} /></div>
    </div>
  );
}

function PortadaCirculos({ circulos, enlace, abrir }: { circulos: Circulo[]; enlace: (id: string) => string; abrir: (c: Circulo) => void }) {
  const t = useTerritorioActual();
  const territorio = t?.nombre || 'España';
  const [sel, setSel] = useState<Sel>(null);
  const todos = circulos.flatMap(c => c.sistemas).map(s => s.nota).filter((x): x is number => typeof x === 'number');
  const media = todos.length ? todos.reduce((a, b) => a + b, 0) / todos.length : null;
  const tocado = sel?.tipo === 'sistema' ? sel : null;
  return (
    <div className="mx-auto max-w-[1240px] pt-1" data-vista-circulos2>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 text-center lg:mb-5 lg:text-left">
        <div className="w-full lg:w-auto">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 lg:text-[2rem]">Los círculos de la humanidad</h1>
          <p className="mt-0.5 text-base text-slate-500">Cómo está cada sistema en {territorio}, de cada persona al planeta.<span className="hidden lg:inline"> Pasa el ratón por una porción.</span></p>
        </div>
        {/* Escritorio: los círculos en un selector horizontal; pasar por uno lo marca en el diagrama. */}
        <nav aria-label="Los círculos" className="hidden flex-wrap gap-2 lg:flex" data-selector-c2>
          {circulos.map((c, i) => (
            <button key={c.clave} type="button" onClick={() => abrir(c)} onMouseEnter={() => setSel({ tipo: 'circulo', i })} onMouseLeave={() => setSel(null)}
              onFocus={() => setSel({ tipo: 'circulo', i })} onBlur={() => setSel(null)} data-fila-c2={c.clave}
              className={`inline-flex h-11 items-center gap-2 rounded-full border bg-white pl-2.5 pr-1.5 text-sm font-bold text-slate-900 transition ${sel?.i === i ? 'border-slate-400 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
              <IconoAnillo i={i} n={circulos.length} color={colorDe(c.nota)} tam={20} />{c.nombre}<Pastilla nota={c.nota} />
            </button>
          ))}
        </nav>
      </header>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start" data-bloque-diagrama-c2>
          <div className="mx-auto w-full" style={{ maxWidth: 'min(clamp(360px, calc(100dvh - 280px), 620px), calc(100vw - 32px))' }}>
            <Diagrama circulos={circulos} sel={sel} setSel={setSel} enlace={enlace} abrir={abrir} media={media} territorio={territorio} />
          </div>
          {/* En el móvil, la ficha del sistema tocado, debajo del círculo, y la escala. */}
          <div className="mt-4 lg:hidden">
            <div className="flex min-h-[72px] items-center gap-3 rounded-2xl py-2 border border-slate-200 bg-white px-4 shadow-sm" data-ficha-movil-c2>
              {tocado ? <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-bold text-slate-900">{tocado.s.titulo}</span>
                  <span className="block truncate text-xs text-slate-500">{tocado.c.nombre} · círculo {tocado.i + 1} de {circulos.length}</span>
                </span>
                <span className="flex h-8 items-center"><Pastilla nota={tocado.s.nota} /></span>
                <Link to={enlace(tocado.s.id)} onClick={() => window.scrollTo(0, 0)} className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-slate-900 px-[18px] text-sm font-bold text-white">Abrir <ArrowRight className="h-4 w-4" /></Link>
              </> : <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5"><span className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Lo más bajo</span>
                  {masBajos(circulos).map(x => <button key={x.s.id} type="button" onClick={() => setSel({ tipo: 'sistema', ...x })} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[13px] font-semibold text-slate-700">{x.s.titulo}<b style={{ color: tonosDeNota(x.s.nota!).tinta }}>{coma(x.s.nota!)}</b></button>)}</span>
                <span className="mt-1 block text-xs text-slate-500">Toca una porción para ver cualquier otro.</span>
              </span>}
            </div>
            <div className="mt-4 px-1"><Escala marca={tocado ? tocado.s.nota : media} /></div>
          </div>
        </div>
        <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-24">
          <div className="hidden h-[400px] rounded-3xl [@media(max-height:720px)]:h-[350px] border border-slate-200 bg-white px-6 py-5 shadow-[0_1px_2px_rgba(15,23,42,.04),0_12px_32px_-12px_rgba(15,23,42,.12)] lg:block">
            <Ficha sel={sel} circulos={circulos} territorio={territorio} media={media} enlace={enlace} />
          </div>
          <ol className="flex flex-col gap-1.5 lg:hidden" aria-label="Los círculos">
            {circulos.map((c, i) => {
              const on = sel?.i === i;
              return (
                <li key={c.clave}>
                  <div role="button" tabIndex={0} onClick={() => abrir(c)} onKeyDown={e => { if (e.key === 'Enter') abrir(c); }}
                    onMouseEnter={() => !sinHover() && setSel({ tipo: 'circulo', i })} onMouseLeave={() => !sinHover() && setSel(null)}
                    className={`group flex w-full cursor-pointer items-start gap-3 rounded-2xl border bg-white px-3.5 py-2.5 text-left transition lg:items-center lg:py-1.5 ${on ? 'border-slate-300 shadow-md' : 'border-slate-200 hover:border-slate-300'}`} data-fila-movil-c2={c.clave}>
                    <IconoAnillo i={i} n={circulos.length} color={colorDe(c.nota)} tam={30} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-base font-black text-slate-900">{c.nombre}</span>
                        <span className="flex items-center gap-1.5"><Pastilla nota={c.nota} /><ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-900" /></span>
                      </span>
                      <span className="line-clamp-2 block text-[13px] leading-snug text-slate-500 lg:line-clamp-1">{DESCRIPCION[c.clave] || `${c.sistemas.length} sistemas`}</span>
                      <span className={`mt-2 lg:hidden ${c.sistemas.length === 4 ? 'grid grid-cols-2 gap-1' : 'flex flex-wrap gap-1'}`}>{c.sistemas.map(s => <Chip key={s.id} s={s} enlace={enlace} ancho={c.sistemas.length === 4} on={sel?.tipo === 'sistema' && sel.s.id === s.id} onElegir={() => {
                        // En el móvil, el primer toque lleva el sistema a la ficha de debajo del círculo y lo marca en él.
                        if (!sinHover() || (sel?.tipo === 'sistema' && sel.s.id === s.id)) return false;
                        setSel({ tipo: 'sistema', s, c, i });
                        document.querySelector('[data-bloque-diagrama-c2]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        return true;
                      }} />)}</span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </div>
  );
}

function PaginaCirculo2({ circulos, c, enlace, abrir, volver }: { circulos: Circulo[]; c: Circulo; enlace: (id: string) => string; abrir: (c: Circulo) => void; volver: () => void }) {
  const i = circulos.indexOf(c), n = circulos.length;
  const color = colorDe(c.nota);
  const antes = circulos[i - 1], despues = circulos[i + 1];
  const Vecino = ({ v, lado }: { v: Circulo; lado: 'antes' | 'despues' }) => (
    <button type="button" onClick={() => abrir(v)} data-vecino-c2={lado}
      className={`group flex h-[72px] min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 transition hover:border-slate-300 hover:shadow-md sm:max-w-sm ${lado === 'despues' ? 'flex-row-reverse text-right' : 'text-left'}`}>
      {lado === 'antes' ? <ArrowLeft className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-900" /> : <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-900" />}
      <IconoAnillo i={circulos.indexOf(v)} n={n} color={colorDe(v.nota)} tam={30} />
      <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-500">{lado === 'antes' ? 'Círculo anterior' : 'Círculo siguiente'}</span><span className="block truncate text-base font-black text-slate-900">{v.nombre}</span></span>
      <Pastilla nota={v.nota} />
    </button>
  );
  return (
    <section className="mx-auto max-w-6xl pt-1" data-pagina-circulo2={c.clave}>
      <button type="button" onClick={volver} className="mb-5 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Todos los círculos
      </button>
      <div className="mb-10 grid items-center gap-8 rounded-3xl border border-slate-200 p-6 sm:px-10 sm:py-8 md:grid-cols-[1fr_260px]" style={{ background: mezcla(color, 0.92) }}>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Círculo {i + 1} de {n}</div>
          <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">{c.nombre}</h1>
          <p className="mt-2 max-w-xl text-lg text-slate-600">{DESCRIPCION[c.clave] || ''}</p>
          <div className="mt-6 flex max-w-[560px] flex-col gap-3">
            <div className="flex items-center gap-3"><Pastilla nota={c.nota} grande /><span className="text-sm font-semibold text-slate-600">nota media de sus {c.sistemas.length} sistemas</span></div>
            <Escala marca={c.nota} />
          </div>
        </div>
        <div className="mx-auto hidden w-[260px] md:block">
          <Diagrama circulos={circulos} sel={null} setSel={() => {}} enlace={enlace} abrir={abrir} media={null} territorio="" mini activo={i} />
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {c.sistemas.map(s => (
          <li key={s.id}>
            <Link to={enlace(s.id)} onClick={() => window.scrollTo(0, 0)} data-sistema-circulo2
              className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_-16px_rgba(15,23,42,.25)]">
              <span className="relative block aspect-[16/10] w-full bg-slate-50">
                {s.imagen && <img src={miniatura(s.imagen, 420)} alt="" className="absolute inset-0 h-full w-full object-contain p-3" />}
              </span>
              <span className="flex flex-1 flex-col gap-2 p-5">
                <span className="flex items-start justify-between gap-2"><span className="text-lg font-black tracking-tight text-slate-900">{s.titulo}</span><Pastilla nota={s.nota} /></span>
                {s.descripcion && <span className="text-sm leading-relaxed text-slate-600">{s.descripcion}</span>}
                <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-bold text-slate-900">Abrir <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <nav className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between" aria-label="Otros círculos">
        {antes ? <Vecino v={antes} lado="antes" /> : <span className="hidden sm:block" />}
        {despues ? <Vecino v={despues} lado="despues" /> : <span className="hidden sm:block" />}
      </nav>
    </section>
  );
}

export default function VistaCirculos2Sitio({ raizId }: { raizId: string }) {
  const circulos = useCirculos(raizId);
  const sitio = useSitio();
  const enlace = (id: string) => (sitio ? sitio.enlacePagina(id) : `/p/${id}`);
  const { search, pathname, hash } = useLocation();
  const ir = useNavigate();
  const clave = new URLSearchParams(search).get('circulo');
  const conCirculo = (c: string | null) => {
    const q = new URLSearchParams(search);
    if (c) q.set('circulo', c); else q.delete('circulo');
    ir(`${pathname}?${q.toString()}${hash}`);
    window.scrollTo(0, 0);
  };
  const abierto = useMemo(() => circulos?.find(c => c.clave === clave) || null, [circulos, clave]);
  return (
    <div className="c2">
      <style>{CSS}</style>
      {!circulos ? <div className="py-24 text-center text-slate-400">Cargando los círculos…</div>
        : !circulos.length ? <div className="py-24 text-center text-slate-500">Los sistemas aún no tienen círculo: añade a su base de datos una columna de selección «Círculo».</div>
        : abierto ? <PaginaCirculo2 circulos={circulos} c={abierto} enlace={enlace} abrir={x => conCirculo(x.clave)} volver={() => conCirculo(null)} />
        : <PortadaCirculos circulos={circulos} enlace={enlace} abrir={x => conCirculo(x.clave)} />}
    </div>
  );
}
