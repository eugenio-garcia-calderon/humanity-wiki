import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, Lightbulb, MapPin, Target, TrendingUp, Undo2 } from 'lucide-react';
import type { PropsLectura } from '../tipos';
import { tonosDeNota, textoNota, textoSobre, colorDeNota } from '../../../utils/nota';
import { useSitio } from '../../sitio/ContextoSitio';
import { cn } from '../../../utils/cn';

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

/** La escala común: el nombre de cada nivel, el mismo para todos los sistemas. */
export const ESCALA = ['Colapso', 'Crítico', 'Muy deficiente', 'Deficiente', 'Insuficiente', 'En transición', 'Aceptable', 'Bueno', 'Muy bueno', 'Excelente', 'Máxima aspiración'];

type Nivel = { nivel: number; titulo: string; descripcion: string; medidas: string; soluciones: string };
type Entrada = { fila_id: string; pagina_id: string | null; titulo: string; slug: string };
type Grupo = { nombre: string; slug: string; entradas: Entrada[] };
type Datos = { nombre: string; nota: number | null; territorio: string | null; diagnostico: string; niveles: Nivel[]; red: Grupo[] };

/** Un texto con una idea por línea (o separadas por «;»), como lista. */
const ideas = (t: string) => String(t || '').split(/\n+|;\s*/).map(x => x.replace(/^[-•·]\s*/, '').trim()).filter(Boolean);

function Tubo({ niveles, actual, elegido, onElegir }: { niveles: Nivel[]; actual: number | null; elegido: number; onElegir: (n: number) => void }) {
  const [encima, setEncima] = useState<number | null>(null);
  const filas = Array.from({ length: 11 }, (_, i) => 10 - i);
  return (
    <div data-tubo className="relative flex select-none items-stretch gap-3" onMouseLeave={() => setEncima(null)}>
      {/* Los números, del 10 arriba al 0 abajo: pasar el ratón dice el nivel, pulsar lo abre. */}
      <ol className="flex flex-col" aria-label="Niveles del 0 al 10">
        {filas.map(n => {
          const info = niveles.find(x => x.nivel === n);
          const nombre = `Nivel ${n} · ${ESCALA[n]}${info?.titulo ? ` — ${info.titulo}` : ''}`;
          return (
            <li key={n} className="h-10">
              <button type="button" onClick={() => onElegir(n)} onMouseEnter={() => setEncima(n)} onFocus={() => setEncima(n)} onBlur={() => setEncima(null)}
                aria-label={nombre} aria-pressed={elegido === n}
                className={cn('grid h-10 w-10 place-items-center rounded-full text-sm font-black tabular-nums transition-colors',
                  elegido === n ? 'bg-slate-900 text-white' : actual !== null && Math.floor(actual) === n ? 'text-slate-900' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-800')}>
                {n}
              </button>
            </li>
          );
        })}
      </ol>
      {/* El tubo: lleno hasta la nota, con el color de cada nivel. */}
      <div className="relative w-6">
        <div className="absolute inset-x-0 top-1 bottom-6 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
          {filas.map(n => (
            <div key={n} className="h-10 border-b border-white/70 last:border-0 transition-colors"
              style={{ backgroundColor: actual !== null && n <= actual ? colorDeNota(n) : undefined }} />
          ))}
        </div>
        <div className="absolute -bottom-1 left-1/2 h-9 w-9 -translate-x-1/2 rounded-full ring-4 ring-white"
          style={{ backgroundColor: actual !== null ? colorDeNota(Math.max(0, Math.min(1, actual))) : '#e2e8f0' }} />
      </div>
      {/* Dónde está el territorio. */}
      {actual !== null && (
        <div className="pointer-events-none absolute left-[4.5rem]" style={{ top: `${(10 - actual) * 2.5 + 1.25}rem`, transform: 'translateY(-50%)' }}>
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-slate-900 px-2.5 py-1 text-xs font-black text-white shadow-lg">
            ◀ {textoNota(actual)}
          </span>
        </div>
      )}
      {/* El título del nivel que se señala. */}
      {encima !== null && (
        <div role="tooltip" className="pointer-events-none absolute left-[7.5rem] z-10 w-56 rounded-xl bg-white p-3 text-xs shadow-2xl ring-1 ring-slate-200"
          style={{ top: `${(10 - encima) * 2.5}rem` }}>
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
    <ul className="space-y-2">
      {entradas.map(e => (
        <li key={e.fila_id}>
          {e.pagina_id ? (
            <Link to={sitio ? sitio.enlacePagina(e.pagina_id) : `/paginas/${e.pagina_id}`}
              className="group flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold leading-snug text-slate-700 hover:border-slate-300 hover:shadow-sm">
              <span className="flex-1">{e.titulo}</span><ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-600" />
            </Link>
          ) : <span className="block rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">{e.titulo}</span>}
        </li>
      ))}
    </ul>
  );
}

function Seccion({ icono: Icono, titulo, tono, children }: { icono: typeof Target; titulo: string; tono: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
      <h3 className="mb-3 flex items-center gap-2 text-lg font-black tracking-tight text-slate-900">
        <span className={cn('grid h-8 w-8 place-items-center rounded-xl', tono)}><Icono className="h-4 w-4" /></span>{titulo}
      </h3>
      {children}
    </section>
  );
}

export function VistaTermometro({ datos: d, paginaId }: { datos: Record<string, unknown>; paginaId?: string }) {
  const [x, setX] = useState<Datos | null | 'fallo'>(null);
  const [elegido, setElegido] = useState<number | null>(null);
  useEffect(() => {
    if (!paginaId) return;
    const q = d.tabla_niveles ? `?niveles=${encodeURIComponent(String(d.tabla_niveles))}` : '';
    fetch(`/api/evolucion/${encodeURIComponent(paginaId)}${q}`, { credentials: 'include' }).then(r => (r.ok ? r.json() : null)).then(j => setX(j || 'fallo')).catch(() => setX('fallo'));
  }, [paginaId, d.tabla_niveles]);
  const actual = x && x !== 'fallo' && x.nota !== null ? x.nota : null;
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
  if (x === null) return <div className="h-64 animate-pulse rounded-3xl bg-slate-50" />;
  if (x === 'fallo') return null;
  const tonos = actual !== null ? tonosDeNota(actual) : null;
  const tonosN = tonosDeNota(n);
  const siguiente = nivelActual !== null && nivelActual < 10 ? niveles.find(v => v.nivel === nivelActual)?.medidas : '';
  return (
    <div data-termometro className="my-6 space-y-6">
      <section className="grid gap-6 rounded-[2rem] border p-5 sm:p-8 md:grid-cols-[auto_1fr] md:gap-10"
        style={tonos ? { backgroundColor: tonos.fondo, borderColor: tonos.borde } : undefined}>
        <Tubo niveles={niveles} actual={actual} elegido={n} onElegir={v => setElegido(v === nivelActual ? null : v)} />
        <div className="min-w-0">
          {/* La nota, grande. */}
          {actual !== null && tonos && (
            <div className="flex flex-wrap items-center gap-4">
              <span data-nota-sistema className="inline-flex items-baseline rounded-3xl px-5 py-3 font-black leading-none tabular-nums shadow-sm"
                style={{ backgroundColor: tonos.color, color: textoSobre(tonos.color) }}>
                <span className="text-6xl sm:text-7xl">{textoNota(actual)}</span><span className="ml-1 text-xl opacity-70">/10</span>
              </span>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-bold text-slate-500"><MapPin className="h-4 w-4" /> {x.territorio || 'Territorio'}</p>
                <p className="text-2xl font-black tracking-tight text-slate-900">{x.nombre}</p>
                <p className="text-sm font-bold" style={{ color: tonos.tinta }}>Nivel {nivelActual} · {ESCALA[nivelActual!]}</p>
              </div>
            </div>
          )}
          {/* El nivel elegido en el termómetro (el actual, si no se ha pulsado otro). */}
          <div data-nivel-elegido className="mt-6 rounded-2xl bg-white/80 p-5 ring-1 ring-black/5">
            <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: tonosN.tinta }}>
              {n === nivelActual ? 'Dónde está ahora' : n === 10 ? 'La máxima aspiración' : n > (nivelActual ?? -1) ? 'A donde se puede llegar' : 'Un nivel por debajo'} · Nivel {n}
            </p>
            <h3 className="mt-1 text-xl font-black leading-snug text-slate-900">{info?.titulo || ESCALA[n]}</h3>
            {info?.descripcion && <p className="mt-2 text-[15px] leading-relaxed text-slate-700">{info.descripcion}</p>}
            {!info && <p className="mt-2 text-sm text-slate-400">Aún no se ha descrito este nivel.</p>}
            {elegido !== null && nivelActual !== null && (
              <button type="button" onClick={() => setElegido(null)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900">
                <Undo2 className="h-3.5 w-3.5" /> Volver al nivel actual ({nivelActual})
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">Pasa por los números del termómetro para ver cada nivel; púlsalos para abrirlo.</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {(x.diagnostico || grupos.fallos.some(g => g.entradas.length)) && (
          <Seccion icono={AlertTriangle} titulo="Fallos actuales" tono="bg-rose-50 text-rose-600">
            {ideas(x.diagnostico).length > 0 && (
              <ul className="mb-3 space-y-2">
                {ideas(x.diagnostico).map((t, i) => <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-slate-700"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />{t}</li>)}
              </ul>
            )}
            {grupos.fallos.map(g => g.entradas.length > 0 && (
              <div key={g.slug} className="mt-3"><p className="mb-1.5 text-xs font-black uppercase tracking-wide text-slate-400">{g.nombre}</p><Tarjetas entradas={g.entradas} /></div>
            ))}
          </Seccion>
        )}
        {(siguiente || grupos.mejoras.some(g => g.entradas.length)) && (
          <Seccion icono={TrendingUp} titulo={nivelActual !== null && nivelActual < 10 ? `Para subir al nivel ${nivelActual + 1}` : 'Medidas de mejora'} tono="bg-emerald-50 text-emerald-700">
            {ideas(siguiente || '').length > 0 && (
              <ul className="mb-3 space-y-2">
                {ideas(siguiente || '').map((t, i) => <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-slate-700"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />{t}</li>)}
              </ul>
            )}
            {grupos.mejoras.map(g => g.entradas.length > 0 && (
              <div key={g.slug} className="mt-3"><p className="mb-1.5 text-xs font-black uppercase tracking-wide text-slate-400">{g.nombre}</p><Tarjetas entradas={g.entradas} /></div>
            ))}
          </Seccion>
        )}
      </div>

      {(niveles.some(v => v.soluciones) || grupos.proyectos.some(g => g.entradas.length)) && (
        <Seccion icono={Lightbulb} titulo="Soluciones para cada nivel" tono="bg-amber-50 text-amber-600">
          <ol className="space-y-2">
            {niveles.filter(v => v.soluciones && (nivelActual === null || v.nivel >= nivelActual)).map(v => {
              const t = tonosDeNota(v.nivel);
              return (
                <li key={v.nivel} className={cn('flex gap-3 rounded-2xl p-3', v.nivel === (nivelActual ?? -1) + 1 && 'ring-2 ring-emerald-300')} style={{ backgroundColor: t.fondo }}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black" style={{ backgroundColor: t.color, color: textoSobre(t.color) }}>{v.nivel}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900">{v.titulo || ESCALA[v.nivel]}{v.nivel === (nivelActual ?? -1) + 1 && <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">siguiente</span>}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-700">{ideas(v.soluciones).join(' · ')}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          {grupos.proyectos.map(g => g.entradas.length > 0 && (
            <div key={g.slug} className="mt-4"><p className="mb-1.5 text-xs font-black uppercase tracking-wide text-slate-400">{g.nombre} · ya en marcha</p><Tarjetas entradas={g.entradas.slice(0, 8)} /></div>
          ))}
        </Seccion>
      )}
    </div>
  );
}

export default function Lectura({ datos, paginaId }: PropsLectura) {
  return <VistaTermometro datos={datos} paginaId={paginaId} />;
}
