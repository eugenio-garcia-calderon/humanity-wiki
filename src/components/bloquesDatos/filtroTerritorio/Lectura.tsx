import { useEffect, useRef, useState } from 'react';
import { MapPin, ChevronDown, Check } from 'lucide-react';
import type { PropsLectura } from '../tipos';
import { ponerFiltroPagina } from './filtroPagina';
import { cn } from '../../../utils/cn';
import { tonosDeNota, textoNota, textoSobre, colorDeNota } from '../../../utils/nota';

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
  // Las notas de cada entrada por territorio, para el resumen (media, mejor y peor).
  const [notas, setNotas] = useState<Array<{ nombre: string; nota: number; territorios: string[] }>>([]);
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
      const colNota = (j?.columnas || []).find((c: any) => c.tipo === 'nota');
      const colT = j?.columna_titulo;
      if (colNota) setNotas((j.filas || []).filter((f: any) => f.celdas?.[colNota.id]?.estado === 'ok').map((f: any) => ({
        nombre: String(f.pagina?.titulo || (colT && f.celdas?.[colT]?.valor) || ''), nota: Number(f.celdas[colNota.id].valor),
        territorios: (f.apuntados?.[columnaId] || []).map((a: any) => a.id),
      })));
    }).catch(() => {});
  }, [tablaId, columnaId]);
  // Un territorio de la dirección que no tiene datos: se vuelve al de por defecto (bot evaluador: la página se quedaba vacía).
  useEffect(() => { if (opciones.length && !opciones.some(o => o.id === elegido) && defecto && opciones.some(o => o.id === defecto)) setElegido(defecto); }, [opciones]); // eslint-disable-line react-hooks/exhaustive-deps
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
  // EL RESUMEN DEL TERRITORIO (bot evaluador, ronda 1): la media en grande, lo mejor y lo peor, y la leyenda de colores.
  const suyas = notas.filter(x => x.territorios.includes(elegido));
  const media = suyas.length ? suyas.reduce((a, x) => a + x.nota, 0) / suyas.length : null;
  const max = suyas.length ? Math.max(...suyas.map(x => x.nota)) : null, min = suyas.length ? Math.min(...suyas.map(x => x.nota)) : null;
  const nombres = (v: number | null) => suyas.filter(x => x.nota === v).map(x => x.nombre);
  const lista = (xs: string[]) => xs.length <= 2 ? xs.join(' y ') : `${xs.slice(0, 2).join(', ')} y ${xs.length - 2} más`;
  const resumen = media !== null && (
    <div data-resumen-territorio className="mx-auto mt-5 grid max-w-3xl items-center gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[auto_1fr] sm:p-6">
      <div className="flex items-center gap-4">
        <span className="grid h-24 w-24 place-items-center rounded-full font-black tabular-nums shadow-md" style={{ backgroundColor: colorDeNota(media), color: textoSobre(colorDeNota(media)) }}>
          <span className="flex items-baseline text-4xl">{textoNota(Math.round(media * 10) / 10)}<span className="ml-0.5 text-sm font-semibold">/10</span></span>
        </span>
        <div className="sm:hidden"><p className="text-xs font-black uppercase tracking-wide text-slate-400">Media de {nombre}</p></div>
      </div>
      <div className="min-w-0">
        <p className="hidden text-xs font-black uppercase tracking-[0.16em] text-slate-400 sm:block">Media de {nombre} · {suyas.length} sistemas</p>
        <p className="mt-1 text-sm text-slate-700"><b className="font-black" style={{ color: tonosDeNota(max!).tinta }}>Mejor:</b> {lista(nombres(max))} ({textoNota(max)}) · <b className="font-black" style={{ color: tonosDeNota(min!).tinta }}>Peor:</b> {lista(nombres(min))} ({textoNota(min)})</p>
        <div className="mt-3" aria-label="Escala de colores del 1 al 10">
          <div className="flex h-3 overflow-hidden rounded-full">{Array.from({ length: 10 }, (_, i) => <span key={i} className="flex-1" style={{ backgroundColor: colorDeNota(i + 1) }} />)}</div>
          <div className="mt-1 flex justify-between text-[11px] font-bold text-slate-500"><span>1 · lo más urgente</span><span>10 · resuelto</span></div>
        </div>
      </div>
    </div>
  );
  // Con un solo territorio no hay nada que elegir: una etiqueta, no un desplegable.
  if (opciones.length === 1 && opciones[0].id === elegido) {
    return (
      <div data-filtro-territorio className="my-4">
        <p className="flex justify-center"><span className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 px-4 text-[15px] font-black text-white"><MapPin className="h-4 w-4" /> {nombre}</span></p>
        {resumen}
      </div>
    );
  }
  return (
    <div data-filtro-territorio className="my-4">
    <div ref={caja} className="relative flex justify-center">
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
    {resumen}
    </div>
  );
}

export default function Lectura({ datos }: PropsLectura) {
  return <SelectorTerritorio datos={datos} />;
}
