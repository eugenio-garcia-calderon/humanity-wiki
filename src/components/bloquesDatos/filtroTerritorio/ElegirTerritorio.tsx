import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '../../../utils/cn';

// ============================================================================
// ELEGIR TERRITORIO, EN GRANDE (2026-10-25, Eugenio)
// ============================================================================
// «Tiene que aparecer en grande la posibilidad de escoger otro territorio, y que
// se vea que está seleccionado España cuando se abre; tanto en la galería como
// en cada entrada.» La misma pieza en el filtro de la galería y en el
// termómetro de cada sistema. Salen TODOS los territorios de su base de datos:
// primero los que ya tienen notas y luego los demás («sin notas todavía»).
//
// La elección se recuerda al ir de la galería a una entrada y volver
// (`sessionStorage`) y va en la dirección (`?territorio=`) para compartirla.

const CLAVE = 'territorio-elegido';

/** El territorio elegido: el de la dirección, el de esta visita o el de por defecto. */
export function territorioGuardado(defecto: string): string {
  try {
    return new URLSearchParams(window.location.search).get('territorio') || sessionStorage.getItem(CLAVE) || defecto;
  } catch { return defecto; }
}

export function guardarTerritorio(id: string, defecto: string) {
  try { sessionStorage.setItem(CLAVE, id); } catch { /* sin almacenamiento: solo la dirección */ }
  try {
    const u = new URL(window.location.href);
    if (id === defecto) u.searchParams.delete('territorio'); else u.searchParams.set('territorio', id);
    window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash);
  } catch { /* sin dirección que tocar */ }
}

type Opcion = { id: string; nombre: string };
const cache = new Map<string, Promise<Opcion[]>>();
function territoriosDe(tablaId: string): Promise<Opcion[]> {
  let p = cache.get(tablaId);
  if (!p) {
    p = fetch(`/api/bd/tablas/${encodeURIComponent(tablaId)}`, { credentials: 'include' }).then(r => (r.ok ? r.json() : null)).then(j => {
      const colT = j?.columna_titulo;
      return (j?.filas || []).filter((f: any) => !f.oculta).map((f: any) => ({
        id: String(f.id), nombre: String(f.pagina?.titulo || (colT && f.celdas?.[colT]?.estado === 'ok' ? f.celdas[colT].valor : '') || 'Sin nombre'),
      }));
    }).catch(() => []);
    cache.set(tablaId, p);
  }
  return p;
}

const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function useTerritorios(tablaId: string | null | undefined, extra: Opcion[] = []) {
  const [todos, setTodos] = useState<Opcion[]>([]);
  useEffect(() => { if (tablaId) territoriosDe(tablaId).then(setTodos); }, [tablaId]);
  // Los que ya se conocen (los que tienen notas) aunque la lista aún no haya llegado.
  return useMemo(() => {
    const m = new Map(todos.map(o => [o.id, o]));
    for (const o of extra) if (!m.has(o.id)) m.set(o.id, o);
    return [...m.values()];
  }, [todos, extra]);
}

export default function ElegirTerritorio({ opciones, conDatos, elegido, onElegir, className, sinMarco, compacto, alinear = 'derecha' }: {
  opciones: Opcion[]; conDatos: Set<string>; elegido: string; onElegir: (id: string) => void; className?: string;
  /** Dentro de otro recuadro (el resumen del territorio): sin su propio borde. */
  sinMarco?: boolean;
  /** Más bajo (la cabecera compacta de una entrada). */
  compacto?: boolean;
  /** Hacia qué lado se abre la lista (a la izquierda cuando el botón está en el borde izquierdo). */
  alinear?: 'izquierda' | 'derecha';
}) {
  const [abierto, setAbierto] = useState(false);
  const [busca, setBusca] = useState('');
  const caja = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!abierto) { setBusca(''); return; }
    campo.current?.focus();
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    // Al cerrar con Escape, el foco vuelve al botón (bot de UX, ronda 2: se iba al cuerpo de la página).
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { setAbierto(false); boton.current?.focus(); } };
    document.addEventListener('mousedown', fuera); document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla); };
  }, [abierto]);
  const nombre = opciones.find(o => o.id === elegido)?.nombre || '…';
  const q = plano(busca.trim());
  const pasan = opciones.filter(o => !q || plano(o.nombre).includes(q));
  // En el orden de su base de datos: de Europa a los países, las regiones, las provincias y los municipios.
  const con = pasan.filter(o => conDatos.has(o.id)), sin = pasan.filter(o => !conDatos.has(o.id));
  const fila = (o: Opcion) => (
    <li key={o.id}>
      <button type="button" role="option" aria-selected={o.id === elegido} onClick={() => { onElegir(o.id); setAbierto(false); boton.current?.focus(); }}
        className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold', o.id === elegido ? 'bg-emerald-50 text-emerald-800' : conDatos.has(o.id) ? 'text-slate-800 hover:bg-slate-50' : 'font-semibold text-slate-500 hover:bg-slate-50')}>
        <span className="flex-1 truncate">{o.nombre}</span>{o.id === elegido && <Check className="h-4 w-4" />}
      </button>
    </li>
  );
  return (
    <div ref={caja} data-elegir-territorio className={cn('relative inline-flex flex-col', alinear === 'izquierda' ? 'items-start' : 'items-center', className)}>
      <button ref={boton} type="button" onClick={() => setAbierto(a => !a)} aria-haspopup="listbox" aria-expanded={abierto}
        aria-label={`Territorio: ${nombre}. Cambiar de territorio`}
        className={cn('group inline-flex items-center gap-3 rounded-2xl bg-white pr-3 transition-shadow', compacto ? 'py-1.5' : 'py-2.5', sinMarco ? 'pl-2 hover:bg-slate-50' : 'border-2 border-slate-900 pl-4 shadow-sm hover:shadow-lg')}>
        <span className={cn('grid shrink-0 place-items-center rounded-xl bg-slate-900 text-white', compacto ? 'h-8 w-8' : 'h-10 w-10')}><MapPin className={compacto ? 'h-4 w-4' : 'h-5 w-5'} /></span>
        <span className="flex flex-col items-start leading-tight">
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Territorio</span>
          <span data-territorio-elegido className={cn('font-black tracking-tight text-slate-900', compacto ? 'text-xl' : 'text-2xl sm:text-3xl')}>{nombre}</span>
        </span>
        <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 group-hover:bg-slate-200">
          <span className={cn(compacto && 'max-sm:sr-only')}>Cambiar</span> <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', abierto && 'rotate-180')} />
        </span>
      </button>
      {abierto && (
        // En el móvil, una hoja que sube desde abajo: el desplegable se salía por el borde izquierdo.
        <div className={cn('absolute top-full z-40', alinear === 'izquierda' ? 'left-0' : 'right-0', ' mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-2 text-left shadow-2xl max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:mt-0 max-sm:w-auto max-sm:max-w-none max-sm:rounded-b-none max-sm:pb-4')}>
          <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 ring-offset-1 focus-within:ring-2 focus-within:ring-emerald-700">
            <Search className="h-4 w-4 text-slate-400" />
            <input ref={campo} data-sin-contorno value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar un país, región o municipio…"
              className="h-10 w-full bg-transparent text-sm outline-none focus:outline-none focus-visible:outline-none" />
          </label>
          <ul role="listbox" aria-label="Territorios" className="mt-1 max-h-80 overflow-y-auto">
            {con.length > 0 && <li className="px-3 pb-1 pt-2 text-[11px] font-black uppercase tracking-wide text-emerald-700">Con notas</li>}
            {con.map(fila)}
            {sin.length > 0 && <li className="px-3 pb-1 pt-3 text-[11px] font-black uppercase tracking-wide text-slate-400">Sin notas todavía</li>}
            {sin.map(fila)}
            {!pasan.length && <li className="px-3 py-3 text-xs text-slate-400">Ningún territorio se llama así.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
