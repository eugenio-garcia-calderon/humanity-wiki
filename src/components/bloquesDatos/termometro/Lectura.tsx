import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, Lightbulb, Target, TrendingUp, Undo2 } from 'lucide-react';
import type { PropsLectura } from '../tipos';
import { tonosDeNota, textoNota, textoSobre, colorDeNota } from '../../../utils/nota';
import { useSitio } from '../../sitio/ContextoSitio';
import { cn } from '../../../utils/cn';
import { miniatura } from '../../../utils/miniatura';
import ElegirTerritorio, { territorioGuardado, guardarTerritorio, useTerritorios } from '../filtroTerritorio/ElegirTerritorio';

// ============================================================================
// EL TERMÓMETRO DE UN SISTEMA (2026-10-25, Eugenio)
// ============================================================================
// «Cuando pinchas en Movilidad en España: la nota más grande, un termómetro del
// 0 al 10 a la izquierda con dónde está España; al pasar por los números, el
// título de cada nivel; al pinchar uno, lo que significa (el 10, la máxima
// aspiración). Y los fallos actuales, las medidas correctoras para subir de
// nivel y las soluciones adaptadas a cada nivel.»
//
// Los datos salen de `/api/evolucion/:pagina` (`bd.ts`): la nota y el
// diagnóstico de la fila, los once niveles del sistema (tabla de niveles del
// bloque) y la red del sistema (fallos, objetivos de mejora, proyectos).
//
// LA CABECERA DE LA PÁGINA (2026-10-25, Eugenio): «el termómetro arriba a la
// izquierda, y arriba centrado el título con el icono de portada y la
// descripción; y ya debajo las bases de datos enlazadas». Si es el primer
// bloque, `VistaPagina` no pinta su cabecera y le pasa `comoCabecera`: el
// título (h1), la portada, la descripción y el territorio van aquí dentro.

/** La escala común: el nombre de cada nivel, el mismo para todos los sistemas. */
export const ESCALA = ['Colapso', 'Crítico', 'Muy deficiente', 'Deficiente', 'Insuficiente', 'En transición', 'Aceptable', 'Bueno', 'Muy bueno', 'Excelente', 'Máxima aspiración'];

type Nivel = { nivel: number; titulo: string; descripcion: string; medidas: string; soluciones: string };
type Entrada = { fila_id: string; pagina_id: string | null; titulo: string; slug: string };
type Grupo = { nombre: string; slug: string; entradas: Entrada[] };
type Datos = { nombre: string; nota: number | null; territorio: string | null; territorio_id: string | null; tabla_territorios: string | null;
  pagina?: { icono: string | null; portada: string | null; subtitulo: string }; diagnostico: string; niveles: Nivel[]; red: Grupo[] };

/** Un texto con una idea por línea (o separadas por «;»), como lista. */
const ideas = (t: string) => String(t || '').split(/\n+|;\s*/).map(x => x.replace(/^[-•·]\s*/, '').trim()).filter(Boolean);

// TODO EN LA PRIMERA PANTALLA (2026-10-25, Eugenio: «mucho más compacta, que se
// vea casi todo en primera página; y las pestañas de las bases de datos de
// abajo, para que no haga falta bajar para ver que hay mucho donde pinchar»).
// Un solo recuadro de tres columnas: el termómetro; la cabecera con el
// territorio, la nota y el nivel elegido; y unas pestañas (el salto, las
// soluciones de cada nivel, los fallos, las mejoras) que no alargan la página.
// Justo debajo, `VistaPagina` pone las pestañas de la red.

/** Alto de cada nivel del termómetro, en rem (el tubo y los carteles lo usan). */
const FILA = 1.75;

function Tubo({ niveles, actual, elegido, onElegir }: { niveles: Nivel[]; actual: number | null; elegido: number; onElegir: (n: number) => void }) {
  const [encima, setEncima] = useState<number | null>(null);
  const filas = Array.from({ length: 11 }, (_, i) => 10 - i);
  return (
    <div data-tubo className="relative flex select-none items-stretch gap-2" onMouseLeave={() => setEncima(null)}>
      {/* Los números, del 10 arriba al 0 abajo: pasar el ratón dice el nivel, pulsar lo abre. */}
      <ol className="flex flex-col" aria-label="Niveles del 0 al 10">
        {filas.map(n => {
          const info = niveles.find(x => x.nivel === n);
          const nombre = `Nivel ${n} · ${ESCALA[n]}${info?.titulo ? ` — ${info.titulo}` : ''}`;
          return (
            <li key={n} style={{ height: `${FILA}rem` }}>
              <button type="button" onClick={() => onElegir(n)} onMouseEnter={() => setEncima(n)} onFocus={() => setEncima(n)} onBlur={() => setEncima(null)}
                aria-label={nombre} aria-pressed={elegido === n}
                className={cn('grid h-7 w-7 place-items-center rounded-full text-xs font-black tabular-nums transition-colors',
                  elegido === n ? 'bg-slate-900 text-white' : actual !== null && Math.floor(actual) === n ? 'text-slate-900' : 'text-slate-400 hover:bg-white hover:text-slate-800')}>
                {n}
              </button>
            </li>
          );
        })}
      </ol>
      {/* El tubo: lleno hasta la nota, con el color de cada nivel. */}
      <div className="relative w-5">
        <div className="absolute inset-x-0 top-0.5 bottom-5 overflow-hidden rounded-full bg-white/70 ring-1 ring-black/5">
          {filas.map(n => (
            <div key={n} className="border-b border-white/70 last:border-0" style={{ height: `${FILA}rem`, backgroundColor: actual !== null && n <= actual ? colorDeNota(n) : undefined }} />
          ))}
        </div>
        <div className="absolute -bottom-1 left-1/2 h-7 w-7 -translate-x-1/2 rounded-full ring-4 ring-white"
          style={{ backgroundColor: actual !== null ? colorDeNota(Math.max(0, Math.min(1, actual))) : '#e2e8f0' }} />
      </div>
      {/* El título del nivel que se señala. */}
      {encima !== null && (
        <div role="tooltip" className="pointer-events-none absolute left-[3.75rem] z-20 w-56 rounded-xl bg-white p-3 text-xs shadow-2xl ring-1 ring-slate-200"
          style={{ top: `${(10 - encima) * FILA - 0.25}rem` }}>
          <p className="font-black text-slate-900">Nivel {encima} · {ESCALA[encima]}</p>
          {niveles.find(x => x.nivel === encima)?.titulo && <p className="mt-0.5 text-slate-600">{niveles.find(x => x.nivel === encima)!.titulo}</p>}
        </div>
      )}
    </div>
  );
}

function Tarjetas({ entradas }: { entradas: Entrada[] }) {
  const sitio = useSitio();
  return (
    <ul className="space-y-1.5">
      {entradas.map(e => (
        <li key={e.fila_id}>
          {e.pagina_id ? (
            <Link to={sitio ? sitio.enlacePagina(e.pagina_id) : `/paginas/${e.pagina_id}`}
              className="group flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold leading-snug text-slate-700 hover:border-slate-300 hover:shadow-sm">
              <span className="flex-1">{e.titulo}</span><ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-slate-600" />
            </Link>
          ) : <span className="block rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700">{e.titulo}</span>}
        </li>
      ))}
    </ul>
  );
}

function Grupos({ grupos, sufijo = '' }: { grupos: Grupo[]; sufijo?: string }) {
  return <>{grupos.map(g => g.entradas.length > 0 && (
    <div key={g.slug} className="mt-3 first:mt-0"><p className="mb-1.5 text-[11px] font-black uppercase tracking-wide text-slate-400">{g.nombre}{sufijo}</p><Tarjetas entradas={g.entradas} /></div>
  ))}</>;
}

/** EL SALTO DE NIVEL (2026-10-25, Eugenio: «de forma visual las mejoras necesarias
 *  para hacer el salto de un nivel a otro»): una escalera que sube del nivel de
 *  ahora (abajo) al siguiente (arriba); cada medida es un peldaño, un poco más a
 *  la derecha que el anterior y del color de un nivel al del otro. */
function Salto({ desde, hasta, medidas }: { desde: { nivel: number; titulo: string }; hasta: { nivel: number; titulo: string }; medidas: string[] }) {
  const c1 = colorDeNota(desde.nivel), c2 = colorDeNota(hasta.nivel);
  const mezcla = (i: number) => `color-mix(in srgb, ${c2} ${Math.round(((i + 1) / (medidas.length + 1)) * 100)}%, ${c1})`;
  const Extremo = ({ v, c, rotulo }: { v: { nivel: number; titulo: string }; c: string; rotulo: string }) => (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg font-black tabular-nums shadow-sm" style={{ backgroundColor: c, color: textoSobre(c) }}>{v.nivel}</span>
      <p className="min-w-0 text-[13px] leading-tight"><span className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{rotulo}</span><b className="font-black text-slate-900">{v.titulo || ESCALA[v.nivel]}</b></p>
    </div>
  );
  return (
    <div data-salto className="relative pl-4">
      {/* La barra del salto: del color de ahora (abajo) al del siguiente (arriba). */}
      <span aria-hidden className="absolute bottom-4 left-0 top-4 w-1.5 rounded-full" style={{ background: `linear-gradient(0deg, ${c1}, ${c2})` }} />
      <Extremo v={hasta} c={c2} rotulo={`Nivel ${hasta.nivel} · a donde se llega`} />
      <ol className="my-2 space-y-1.5" aria-label={`Medidas para pasar del nivel ${desde.nivel} al ${hasta.nivel}`}>
        {medidas.map((m, i) => ({ m, i })).reverse().map(({ m, i }) => (
          <li key={i} className="flex items-start gap-2 rounded-xl border-l-4 py-1.5 pl-2 pr-2.5 text-[13px] font-semibold leading-snug text-slate-800"
            style={{ marginLeft: `${i * 0.7}rem`, borderLeftColor: mezcla(i), backgroundColor: `color-mix(in srgb, ${mezcla(i)} 13%, white)` }}>
            <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-black text-white" style={{ backgroundColor: mezcla(i) }}>{i + 1}</span>
            <span className="min-w-0">{m}</span>
          </li>
        ))}
      </ol>
      <Extremo v={desde} c={c1} rotulo={`Nivel ${desde.nivel} · ahora`} />
    </div>
  );
}

type Pestana = 'salto' | 'soluciones' | 'fallos' | 'mejoras';

export function VistaTermometro({ datos: d, paginaId }: { datos: Record<string, unknown>; paginaId?: string }) {
  const comoCabecera = d.comoCabecera === true;
  const [x, setX] = useState<Datos | null | 'fallo'>(null);
  const [elegido, setElegido] = useState<number | null>(null);
  const [pestana, setPestana] = useState<Pestana | null>(null);
  useEffect(() => {
    if (!paginaId) return;
    const q = d.tabla_niveles ? `?niveles=${encodeURIComponent(String(d.tabla_niveles))}` : '';
    fetch(`/api/evolucion/${encodeURIComponent(paginaId)}${q}`, { credentials: 'include' }).then(r => (r.ok ? r.json() : null)).then(j => setX(j || 'fallo')).catch(() => setX('fallo'));
  }, [paginaId, d.tabla_niveles]);
  // El territorio elegido (el mismo que en la galería). Si no es el de esta nota, aún no hay nota para él.
  const [terr, setTerr] = useState<string | null>(() => { const t = territorioGuardado(''); return t || null; });
  const propio = x && x !== 'fallo' ? x.territorio_id : null;
  const elegidoT = terr || propio || '';
  const usados = useMemo(() => (x && x !== 'fallo' && x.territorio_id ? [{ id: x.territorio_id, nombre: x.territorio || '' }] : []), [x]);
  const opciones = useTerritorios(x && x !== 'fallo' ? x.tabla_territorios : null, usados);
  const conDatos = useMemo(() => new Set(usados.map(o => o.id)), [usados]);
  const sinNota = !!(propio && elegidoT && elegidoT !== propio && opciones.some(o => o.id === elegidoT));
  const actual = x && x !== 'fallo' && x.nota !== null && !sinNota ? x.nota : null;
  const nivelActual = actual !== null ? Math.max(0, Math.min(10, Math.floor(actual))) : null;
  const n = elegido ?? nivelActual ?? 10;
  const niveles = x && x !== 'fallo' ? x.niveles : [];
  const info = niveles.find(v => v.nivel === n);
  const grupos = useMemo(() => {
    const red = x && x !== 'fallo' ? x.red : [];
    const de = (re: RegExp) => red.filter(g => re.test(g.nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()));
    return { fallos: de(/fallo|consecuen/), mejoras: de(/mejora|linea|punto|objetivo/), proyectos: de(/proyecto|soluci/) };
  }, [x]);
  if (!paginaId) return <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs font-bold text-slate-400">El termómetro va en la página de un sistema.</p>;
  if (x === null) return <div className="mb-6 h-80 animate-pulse rounded-3xl bg-slate-50" />;
  if (x === 'fallo') return null;
  const tonos = actual !== null ? tonosDeNota(actual) : null;
  const tonosN = tonosDeNota(n);
  const portada = x.pagina?.portada || (x.pagina?.icono && /^(https?:|\/)/.test(x.pagina.icono) ? x.pagina.icono : null);
  const icono = x.pagina?.icono && !/^(https?:|\/)/.test(x.pagina.icono) ? x.pagina.icono : null;
  const medidas = nivelActual !== null && nivelActual < 10 ? ideas(niveles.find(v => v.nivel === nivelActual)?.medidas || '') : [];
  const fallosTexto = ideas(x.diagnostico);
  const cuenta = (gs: Grupo[]) => gs.reduce((a, g) => a + g.entradas.length, 0);
  const solNiveles = niveles.filter(v => v.soluciones && (nivelActual === null || v.nivel >= nivelActual)).sort((a, b) => b.nivel - a.nivel);
  // Las pestañas que tienen algo, con cuántas cosas hay en cada una.
  const pestanas: Array<{ id: Pestana; titulo: string; icono: typeof Target; n?: number }> = [
    ...(medidas.length ? [{ id: 'salto' as const, titulo: `El salto ${nivelActual}→${nivelActual! + 1}`, icono: TrendingUp }] : []),
    ...(solNiveles.length || cuenta(grupos.proyectos) ? [{ id: 'soluciones' as const, titulo: 'Soluciones', icono: Lightbulb, n: solNiveles.length || undefined }] : []),
    ...(fallosTexto.length || cuenta(grupos.fallos) ? [{ id: 'fallos' as const, titulo: 'Fallos', icono: AlertTriangle, n: fallosTexto.length + cuenta(grupos.fallos) }] : []),
    ...(cuenta(grupos.mejoras) ? [{ id: 'mejoras' as const, titulo: 'Mejoras', icono: Target, n: cuenta(grupos.mejoras) }] : []),
  ];
  const abierta = pestanas.find(p => p.id === pestana)?.id || pestanas[0]?.id;
  const territorioNombre = opciones.find(o => o.id === elegidoT)?.nombre || x.territorio;
  return (
    <div data-termometro className={cn(comoCabecera ? 'mb-5' : 'my-6')}>
      <section className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-4 rounded-3xl border p-4 sm:p-5 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-x-6"
        style={tonos ? { backgroundColor: tonos.fondo, borderColor: tonos.borde } : { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>

        {/* Arriba, centrados: la portada, el título y la descripción; debajo, el territorio y la nota. */}
        <header className="col-span-2 flex flex-col items-center text-center lg:col-span-1 lg:col-start-2 lg:row-start-1">
          <div className="flex items-center justify-center gap-3">
            {portada
              ? <img src={miniatura(portada, 160)} alt="" className="h-14 w-14 shrink-0 rounded-2xl bg-white object-contain p-1 shadow-sm ring-1 ring-black/5" />
              : icono && <span className="text-4xl leading-none">{icono}</span>}
            <div className="min-w-0 text-left">
              {comoCabecera
                ? <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-[2.1rem]">{x.nombre}</h1>
                : <p className="text-2xl font-black leading-tight tracking-tight text-slate-900">{x.nombre}</p>}
              {x.pagina?.subtitulo && <p className="text-sm leading-snug text-slate-600">{x.pagina.subtitulo}</p>}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            {x.tabla_territorios && opciones.length > 0 && (
              <ElegirTerritorio compacto opciones={opciones} conDatos={conDatos} elegido={elegidoT}
                onElegir={id => { setTerr(id); guardarTerritorio(id, ''); setElegido(null); }} />
            )}
            {actual !== null && tonos && (
              <div className="flex items-center gap-2.5">
                <span data-nota-sistema className="inline-flex items-baseline rounded-2xl px-4 py-1.5 font-black leading-none tabular-nums shadow-sm"
                  style={{ backgroundColor: tonos.color, color: textoSobre(tonos.color) }}>
                  <span className="text-5xl">{textoNota(actual)}</span><span className="ml-1 text-base opacity-70">/10</span>
                </span>
                <p className="text-left text-sm font-black leading-tight" style={{ color: tonos.tinta }}>Nivel {nivelActual}<br /><span className="font-bold">{ESCALA[nivelActual!]}</span></p>
              </div>
            )}
          </div>
        </header>

        {/* A la izquierda, el termómetro. */}
        <div className="col-start-1 row-start-2 lg:row-span-2 lg:row-start-1">
          <Tubo niveles={niveles} actual={actual} elegido={n} onElegir={v => setElegido(v === nivelActual ? null : v)} />
        </div>

        {/* El nivel elegido en el termómetro (el actual, si no se ha pulsado otro). */}
        <div className="col-start-2 row-start-2 min-w-0 self-start">
          {sinNota ? (
            <div data-sin-nota className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center">
              <p className="font-black text-slate-800">Todavía no hay nota de {x.nombre} para {territorioNombre}.</p>
              {propio && <button type="button" onClick={() => { setTerr(propio); guardarTerritorio(propio, ''); }} className="mt-2 rounded-full bg-slate-900 px-4 py-1.5 text-sm font-bold text-white hover:bg-slate-700">Ver {x.territorio}</button>}
            </div>
          ) : (
            <div data-nivel-elegido className="rounded-2xl bg-white/85 p-4 ring-1 ring-black/5">
              <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: tonosN.tinta }}>
                {n === nivelActual ? `Dónde está ${territorioNombre || 'ahora'}` : n === 10 ? 'La máxima aspiración' : n > (nivelActual ?? -1) ? 'A donde se puede llegar' : 'Un nivel por debajo'} · Nivel {n}
              </p>
              <h2 className="mt-0.5 text-base font-black leading-snug text-slate-900">{info?.titulo || ESCALA[n]}</h2>
              {info?.descripcion && <p className="mt-1 text-[13px] leading-relaxed text-slate-700">{info.descripcion}</p>}
              {!info && <p className="mt-1 text-sm text-slate-400">Aún no se ha descrito este nivel.</p>}
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                {elegido !== null && nivelActual !== null
                  ? <button type="button" onClick={() => setElegido(null)} className="inline-flex items-center gap-1 font-bold text-slate-600 hover:text-slate-900"><Undo2 className="h-3 w-3" /> Volver al nivel actual ({nivelActual})</button>
                  : <span>Pulsa un número del termómetro para ver ese nivel.</span>}
              </p>
            </div>
          )}
        </div>

        {/* A la derecha, en pestañas: el salto, las soluciones, los fallos y las mejoras. */}
        {!sinNota && pestanas.length > 0 && (
          <div data-pestanas-termometro className="col-span-2 flex min-w-0 flex-col rounded-2xl bg-white/85 ring-1 ring-black/5 lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1">
            <div role="tablist" aria-label={`Cómo mejorar ${x.nombre}`} className="flex gap-1 overflow-x-auto border-b border-slate-100 p-1.5">
              {pestanas.map(p => (
                <button key={p.id} type="button" role="tab" aria-selected={abierta === p.id} onClick={() => setPestana(p.id)}
                  className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[13px] font-bold transition-colors',
                    abierta === p.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}>
                  <p.icono className="h-3.5 w-3.5" />{p.titulo}
                  {p.n ? <span className={cn('rounded-full px-1.5 text-[10px] tabular-nums', abierta === p.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500')}>{p.n}</span> : null}
                </button>
              ))}
            </div>
            <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto p-3 lg:max-h-[19.5rem]">
              {abierta === 'salto' && nivelActual !== null && (
                <Salto desde={niveles.find(v => v.nivel === nivelActual) || { nivel: nivelActual, titulo: '' }}
                  hasta={niveles.find(v => v.nivel === nivelActual + 1) || { nivel: nivelActual + 1, titulo: '' }} medidas={medidas} />
              )}
              {abierta === 'soluciones' && (
                <>
                  {/* Del 10 (la aspiración) hacia abajo, hasta el nivel de ahora: como el termómetro. */}
                  <ol className="space-y-1.5">
                    {solNiveles.map(v => {
                      const t = tonosDeNota(v.nivel), sig = v.nivel === (nivelActual ?? -1) + 1;
                      return (
                        <li key={v.nivel} className={cn('flex gap-2.5 rounded-xl p-2', sig && 'ring-2 ring-emerald-300')} style={{ backgroundColor: t.fondo }}>
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-black" style={{ backgroundColor: t.color, color: textoSobre(t.color) }}>{v.nivel}</span>
                          <div className="min-w-0">
                            <p className="text-[13px] font-black leading-snug text-slate-900">{v.titulo || ESCALA[v.nivel]}{sig && <span className="ml-1.5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">siguiente</span>}</p>
                            <p className="text-[12px] leading-snug text-slate-700">{ideas(v.soluciones).join(' · ')}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                  {cuenta(grupos.proyectos) > 0 && <div className="mt-3"><Grupos grupos={grupos.proyectos} sufijo=" · ya en marcha" /></div>}
                </>
              )}
              {abierta === 'fallos' && (
                <>
                  {fallosTexto.length > 0 && (
                    <ul className="mb-3 space-y-1.5">
                      {fallosTexto.map((t, i) => <li key={i} className="flex gap-2 text-[13px] leading-snug text-slate-700"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />{t}</li>)}
                    </ul>
                  )}
                  <Grupos grupos={grupos.fallos} />
                </>
              )}
              {abierta === 'mejoras' && <Grupos grupos={grupos.mejoras} />}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default function Lectura({ datos, paginaId }: PropsLectura) {
  return <VistaTermometro datos={datos} paginaId={paginaId} />;
}
