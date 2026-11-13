// «Ámbitos» (Eugenio, 2026-11-13): the model for Spain by default, and the same
// model applied to the Comunidad de Madrid, Talamanca de Jarama, Europe and the
// UN. The choice lives in the address (`?ambito=madrid`) and is remembered in
// this browser; every window shows, above its content, what changes at that
// scale. Data: src/data/ambitos/.
import { useCallback, useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { AMBITOS, OPCIONES_AMBITO } from '../../data/ambitos';
import type { AmbitoId, AreaId, CifraAmbito } from '../../data/ambitos/tipos';
import { cn } from '../../utils/cn';
import { Libre } from './piezas';

const CLAVE = 'modelo.ambito';
const VALIDOS = new Set<AmbitoId>(OPCIONES_AMBITO.map(o => o.id));

function leer(): AmbitoId {
  if (typeof window === 'undefined') return 'espana';
  const q = new URLSearchParams(window.location.search).get('ambito') as AmbitoId | null;
  if (q && VALIDOS.has(q)) return q;
  try { const g = localStorage.getItem(CLAVE) as AmbitoId | null; if (g && VALIDOS.has(g)) return g; } catch { /* private mode */ }
  return 'espana';
}

/** The chosen scale, shared by every component through a window event. */
export function useAmbito(): [AmbitoId, (a: AmbitoId) => void] {
  const [ambito, setAmbito] = useState<AmbitoId>(leer);
  useEffect(() => {
    const oir = () => setAmbito(leer());
    window.addEventListener('modelo-ambito', oir);
    window.addEventListener('popstate', oir);
    return () => { window.removeEventListener('modelo-ambito', oir); window.removeEventListener('popstate', oir); };
  }, []);
  const cambiar = useCallback((a: AmbitoId) => {
    try { localStorage.setItem(CLAVE, a); } catch { /* private mode */ }
    const u = new URL(window.location.href);
    if (a === 'espana') u.searchParams.delete('ambito'); else u.searchParams.set('ambito', a);
    window.history.replaceState(window.history.state, '', u.toString());
    window.dispatchEvent(new Event('modelo-ambito'));
  }, []);
  return [ambito, cambiar];
}

export const nombreAmbito = (a: AmbitoId) => OPCIONES_AMBITO.find(o => o.id === a)?.nombre ?? 'España';

/** The selector, top right: from the municipality out to the planet. */
export function SelectorAmbito({ className, grande = false }: { className?: string; grande?: boolean }) {
  const [ambito, cambiar] = useAmbito();
  return (
    <label className={cn('relative flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white pl-2.5 pr-1 text-slate-700 shadow-sm focus-within:ring-2 focus-within:ring-slate-900/30',
      grande ? 'py-1.5 text-[15px]' : 'py-0.5 text-[13px]', className)}>
      <MapPin aria-hidden className={grande ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
      <span className="sr-only">Ver el modelo para</span>
      <select value={ambito} onChange={e => cambiar(e.target.value as AmbitoId)}
        className="cursor-pointer appearance-none border-0 bg-transparent py-0 pl-0 pr-5 font-semibold text-slate-900 focus:outline-none focus:ring-0">
        {OPCIONES_AMBITO.map(o => (
          <option key={o.id} value={o.id} disabled={o.id !== 'espana' && !AMBITOS[o.id as Exclude<AmbitoId, 'espana'>]}>
            {grande ? o.nombre : o.corto}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-2 text-slate-400">▾</span>
    </label>
  );
}

function Cifras({ cifras }: { cifras: CifraAmbito[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cifras.map(c => (
        <li key={c.texto} className="rounded-xl bg-white p-3.5 ring-1 ring-slate-200">
          <p className="text-xl font-[800] tabular-nums text-slate-900">{c.valor}</p>
          <p className="mt-0.5 text-sm leading-snug text-slate-600">{c.texto}{' '}
            <a href={c.fuente.url} target="_blank" rel="noreferrer" title={c.fuente.titulo}
              className="whitespace-nowrap text-xs text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-800">fuente</a>
          </p>
        </li>
      ))}
    </ul>
  );
}

/** Above a window: what this area looks like at the chosen scale. Nothing for Spain. */
export function AmbitoBloque({ area }: { area: AreaId }) {
  const [ambito, cambiar] = useAmbito();
  if (ambito === 'espana') return null;
  const a = AMBITOS[ambito];
  if (!a) return null;
  const datos = a.areas[area];
  return (
    <section aria-label={`El modelo en ${a.nombre}`} className="border-b border-teal-200 bg-teal-50/70">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-teal-800">
          <MapPin aria-hidden className="h-4 w-4" />Estás viendo el modelo en {a.nombre}
          <Libre onClick={() => cambiar('espana')} className="rounded-full px-2 text-xs font-medium text-teal-700 underline underline-offset-2 hover:text-teal-900">volver a España</Libre>
        </p>
        {datos ? (
          <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <p className="text-sm font-semibold text-slate-500">Hoy</p>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-700">{datos.hoy}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-teal-800">Con el modelo</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-slate-800">
                {datos.propuesta.map(t => <li key={t}>{t}</li>)}
              </ul>
            </div>
            {datos.cifras && datos.cifras.length > 0 && <div className="lg:col-span-2"><Cifras cifras={datos.cifras} /></div>}
            {datos.fuentes && datos.fuentes.length > 0 && (
              <p className="text-xs leading-relaxed text-slate-500 lg:col-span-2">Fuentes:{' '}
                {datos.fuentes.map((f, i) => <span key={f.url}>{i > 0 && ' · '}<a href={f.url} target="_blank" rel="noreferrer" className="underline decoration-slate-300 underline-offset-2 hover:text-slate-800">{f.titulo}</a></span>)}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-slate-700">
            En este tema {a.nombre} no tiene un papel propio: lo decide otra escala. Lo de abajo es el modelo para España.
          </p>
        )}
      </div>
    </section>
  );
}

/** On the cover, when a scale other than Spain is chosen: what the model means there. */
export function AmbitoPortada() {
  const [ambito] = useAmbito();
  if (ambito === 'espana') return null;
  const a = AMBITOS[ambito];
  if (!a) return null;
  return (
    <div className="mt-8 rounded-2xl bg-teal-50 p-5 ring-1 ring-teal-200 sm:p-6">
      <p className="flex items-center gap-2 text-sm font-semibold text-teal-800"><MapPin aria-hidden className="h-4 w-4" />El modelo en {a.nombre}</p>
      <p className="mt-1 text-sm text-slate-600">Hoy lo gobiernan: {a.quien}</p>
      <ul className="mt-3 max-w-3xl list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-800">
        {a.resumen.map(t => <li key={t}>{t}</li>)}
      </ul>
      <div className="mt-4"><Cifras cifras={a.cifras} /></div>
    </div>
  );
}

/** For a cover card: the first sentence of what the model does here, if this scale speaks about the area. */
export function lemaAmbito(ambito: AmbitoId, area: AreaId): string | null {
  if (ambito === 'espana') return null;
  return AMBITOS[ambito]?.areas[area]?.propuesta[0] ?? null;
}
