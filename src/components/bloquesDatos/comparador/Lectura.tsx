import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '../../ui/core';
import { cn } from '../../../utils/cn';
import type { PropsLectura } from '../tipos';
import { useFicha, useTablaFicha } from '../ficha/useFicha';
import { vistaComparador, porDefecto, idsDeConsulta, MAX_COMPARAR } from '../ficha/vistas';
import { Cargando, MarcaProcedencia, Seccion, SinFila, useEnlaceFila } from '../ficha/comunes';
import { CLASE_CAMPO } from '../ficha/editor';

// THE COMPARATOR (plan §3.4). Products are columns and attributes are rows,
// so that four products still fit on a phone: the attribute names stay put
// (sticky) and the products scroll sideways INSIDE the block, never the page.
//
// Modes (`datos.modo`):
//   fila  on a sheet: the current product plus up to three siblings
//   fijo  anywhere: a chosen database and chosen rows (`tabla_id`, `filas`)
//   url   a «compare» page: the rows come from the address
// In `fila` and `url` the choice is kept in the address (`?comparar=a,b`), so
// a comparison can be shared and a search engine can land on it.

function leerConsulta(): string[] {
  if (typeof window === 'undefined') return [];
  return idsDeConsulta(new URLSearchParams(window.location.search).get('comparar'));
}

function escribirConsulta(ids: string[]) {
  if (typeof window === 'undefined') return;
  const u = new URL(window.location.href);
  if (ids.length) u.searchParams.set('comparar', ids.join(','));
  else u.searchParams.delete('comparar');
  window.history.replaceState(window.history.state, '', u.toString());
}

export function VistaComparador({ datos, paginaId, enEditor }: PropsLectura & { enEditor?: boolean }) {
  const modo = String(datos.modo || 'fila');
  const deFila = modo === 'fila';
  const { ficha, cargando: cf } = useFicha(deFila ? paginaId : undefined);
  const { tabla: suelta, cargando: ct } = useTablaFicha(deFila ? undefined : (datos.tabla_id as string | undefined));
  const tabla = deFila ? ficha?.tabla || null : suelta;
  const actualId = deFila ? ficha?.fila_id || null : null;
  const enlace = useEnlaceFila();

  const inicial = useMemo(() => {
    if (!tabla) return [] as string[];
    const q = modo === 'fijo' ? [] : leerConsulta();
    if (q.length) return q;
    if (modo === 'fijo') return (Array.isArray(datos.filas) ? datos.filas : []).map(String);
    if (actualId) return porDefecto(tabla, actualId);
    return tabla.filas.slice(0, 2).map(x => x.id);
  }, [tabla, actualId, modo, datos.filas]);
  const [ids, setIds] = useState<string[]>(inicial);
  useEffect(() => setIds(inicial), [inicial]);

  if (cf || ct) return <Cargando />;
  if (!tabla) {
    if (!enEditor) return null;
    return deFila
      ? <SinFila que="En modo «esta fila», el comparador compara la fila de la página con otras de su base de datos." />
      : <p className="text-sm text-slate-400">Elige una base de datos para comparar sus filas.</p>;
  }
  const v = vistaComparador(tabla, ids.filter(i => i !== actualId), { actualId, titulo: String(datos.titulo || ''), columnas: datos.columnas });
  if (!v || v.productos.length < 2) {
    if (!enEditor && !v?.candidatos.length) return null;
  }

  const cambiar = (nuevos: string[]) => {
    const limpios = nuevos.filter(i => i !== actualId).slice(0, MAX_COMPARAR - (actualId ? 1 : 0));
    setIds(limpios);
    // A fixed comparison belongs to the page; only the others follow the address.
    if (modo !== 'fijo' && !enEditor) escribirConsulta(limpios);
  };
  const otros = v ? v.productos.filter(p => !p.actual).map(p => p.id) : [];
  const caben = !v || v.productos.length < MAX_COMPARAR;
  // Repeated group headers are dropped: one per run of the same group.
  let grupoAnterior = '';

  return (
    <Seccion titulo={v?.titulo}>
      {v && v.productos.length >= 1 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-100" role="region" aria-label="Comparación" tabIndex={0}>
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-10 min-w-[8.5rem] bg-white px-3 py-2 text-left text-xs font-semibold text-slate-400"><span className="sr-only">Dato</span></th>
                {v.productos.map(p => {
                  const href = p.actual ? null : enlace(p.paginaId);
                  return (
                    <th key={p.id} scope="col" className={cn('min-w-[9.5rem] px-3 py-2 text-left align-bottom', p.actual && 'bg-sky-50/60')}>
                      {p.imagen ? <img src={p.imagen} alt="" loading="lazy" className="mb-1 h-16 w-16 rounded-lg object-contain" /> : null}
                      <div className="flex items-start gap-1">
                        {href ? <a href={href} className="font-bold text-sky-700 hover:underline">{p.nombre}</a> : <span className="font-bold text-slate-900">{p.nombre}</span>}
                        {!p.actual && modo !== 'fijo' ? (
                          <Button variant="ghost" className="-mr-1 -mt-0.5 h-6 w-6 shrink-0 p-0" aria-label={`Quitar ${p.nombre}`} onClick={() => cambiar(otros.filter(i => i !== p.id))}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </div>
                      {p.actual ? <span className="text-[11px] font-semibold text-sky-600">Este producto</span> : null}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {v.lineas.map(l => {
                const cabecera = l.grupo && l.grupo !== grupoAnterior ? l.grupo : '';
                grupoAnterior = l.grupo;
                return [
                  cabecera ? (
                    <tr key={`g-${l.columnaId}`}>
                      <th colSpan={v.productos.length + 1} scope="colgroup" className="sticky left-0 bg-slate-50 px-3 py-1.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">{cabecera}</th>
                    </tr>
                  ) : null,
                  <tr key={l.columnaId} className="border-t border-slate-100">
                    <th scope="row" className="sticky left-0 z-10 bg-white px-3 py-2 text-left align-top font-medium text-slate-600">
                      {l.etiqueta}
                      {l.sentido ? <span className="block text-[10px] font-normal text-slate-400">{l.sentido === 'mayor' ? 'más es mejor' : 'menos es mejor'}</span> : null}
                    </th>
                    {l.celdas.map((c, i) => (
                      <td key={i} className={cn('px-3 py-2 align-top text-slate-800', c.mejor && 'bg-emerald-50 font-semibold text-emerald-800', v.productos[i].actual && !c.mejor && 'bg-sky-50/40')}>
                        {c.texto}
                        {c.mejor ? <span className="ml-1 text-[10px] font-bold uppercase text-emerald-600">mejor</span> : null}
                        <div><MarcaProcedencia p={c.procedencia} /></div>
                      </td>
                    ))}
                  </tr>,
                ];
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      {modo !== 'fijo' && caben && v?.candidatos.length ? (
        <label className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500">
          <Plus className="h-3.5 w-3.5" />
          <select value="" onChange={e => e.target.value && cambiar([...otros, e.target.value])} className={CLASE_CAMPO} aria-label="Añadir a la comparación">
            <option value="">Añadir otro producto…</option>
            {v.candidatos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </label>
      ) : null}
    </Seccion>
  );
}

export default function Lectura(p: PropsLectura) {
  return <VistaComparador {...p} />;
}
