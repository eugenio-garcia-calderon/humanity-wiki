import { useEffect, useRef, useState } from 'react';
import { MapPin, ChevronDown, Check } from 'lucide-react';
import type { PropsLectura } from '../tipos';
import { ponerFiltroPagina } from './filtroPagina';
import { cn } from '../../../utils/cn';

// ============================================================================
// EL FILTRO DE TERRITORIO (2026-10-25, Eugenio)
// ============================================================================
// «Un filtro de territorio y por defecto España seleccionado.» `datos`:
//   tabla_id  — la base de datos que se filtra (está en la misma página)
//   columna_id — su relación con la base de datos de territorios
//   defecto   — la fila del territorio que viene elegida (España)
// Las opciones son los territorios que esa columna ya usa: elegir uno que no
// tiene datos dejaría la página vacía sin explicar por qué. La elección va en
// la dirección (`?territorio=`), para poder compartirla.

type Opcion = { id: string; nombre: string };

export function SelectorTerritorio({ datos }: { datos: Record<string, unknown> }) {
  const tablaId = String(datos.tabla_id || ''), columnaId = String(datos.columna_id || ''), defecto = String(datos.defecto || '');
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  const [elegido, setElegido] = useState<string>(() => {
    try { return new URLSearchParams(window.location.search).get('territorio') || defecto; } catch { return defecto; }
  });
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!tablaId || !columnaId) return;
    fetch(`/api/bd/tablas/${encodeURIComponent(tablaId)}`, { credentials: 'include' }).then(r => (r.ok ? r.json() : null)).then(j => {
      const vistos = new Map<string, string>();
      for (const f of j?.filas || []) for (const a of f.apuntados?.[columnaId] || []) vistos.set(a.id, a.etiqueta || 'Sin nombre');
      setOpciones([...vistos].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
    }).catch(() => {});
  }, [tablaId, columnaId]);
  // La elección (también la de por defecto) se dice a las bases de datos de la página.
  useEffect(() => { if (tablaId && columnaId && elegido) ponerFiltroPagina(tablaId, { columna_id: columnaId, valor: elegido }); }, [tablaId, columnaId, elegido]);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera); document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla); };
  }, [abierto]);
  const elegir = (id: string) => {
    setElegido(id); setAbierto(false);
    try {
      const u = new URL(window.location.href);
      if (id === defecto) u.searchParams.delete('territorio'); else u.searchParams.set('territorio', id);
      window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash);
    } catch { /* sin dirección que tocar */ }
  };
  if (!tablaId || !columnaId) return <p className="rounded-xl border border-dashed border-slate-300 p-3 text-center text-xs font-bold text-slate-400">Elige qué base de datos filtra este bloque.</p>;
  const nombre = opciones.find(o => o.id === elegido)?.nombre || (opciones.length ? 'Elige un territorio' : '…');
  return (
    <div ref={caja} data-filtro-territorio className="relative my-4 flex justify-center">
      <button type="button" onClick={() => setAbierto(a => !a)} aria-haspopup="listbox" aria-expanded={abierto}
        className="inline-flex h-12 items-center gap-2.5 rounded-full border border-slate-200 bg-white pl-4 pr-3 text-[15px] shadow-sm transition-shadow hover:shadow-md">
        <MapPin className="h-4 w-4 text-emerald-600" />
        <span className="text-slate-500">Territorio</span>
        <span className="font-black text-slate-900">{nombre}</span>
        <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', abierto && 'rotate-180')} />
      </button>
      {abierto && (
        <ul role="listbox" aria-label="Territorios" className="absolute top-full z-30 mt-2 max-h-72 w-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl">
          {opciones.map(o => (
            <li key={o.id}>
              <button type="button" role="option" aria-selected={o.id === elegido} onClick={() => elegir(o.id)}
                className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold', o.id === elegido ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-50')}>
                <span className="flex-1 truncate">{o.nombre}</span>{o.id === elegido && <Check className="h-4 w-4" />}
              </button>
            </li>
          ))}
          {!opciones.length && <li className="px-3 py-2 text-xs text-slate-400">Aún no hay territorios con datos.</li>}
          <li className="mt-1 border-t border-slate-100 px-3 pb-1 pt-2 text-[11px] leading-snug text-slate-400">Salen los territorios que ya tienen notas.</li>
        </ul>
      )}
    </div>
  );
}

export default function Lectura({ datos }: PropsLectura) {
  return <SelectorTerritorio datos={datos} />;
}
