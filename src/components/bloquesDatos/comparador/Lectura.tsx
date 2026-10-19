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
// and the products scroll sideways INSIDE the block, never the page. On a
// wide screen the attribute names stay put (sticky); on a phone each name goes
// on its own line above its values and the sheet's own product is the fixed
// column, so what it is compared against is always beside it.
//
// Modes (`datos.modo`):
//   fila  on a sheet: the current product plus up to three siblings
//   fijo  anywhere: a chosen database and chosen rows (`tabla_id`, `filas`)
//   url   a «compare» page: the rows come from the address
// In `fila` and `url` the choice is kept in the address (`?comparar=a,b`), so
// a comparison can be shared and a search engine can land on it.

/** The sheet's own product, fixed on the left on a phone. Solid colours
 *  only: what scrolls under it must not show through. */
const FIJA = 'max-sm:sticky max-sm:left-0 max-sm:z-10 max-sm:shadow-[1px_0_0_theme(colors.slate.200)]';

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
  // On a phone only one product column fits beside the labels: whoever adds
  // a product must SEE it, so the table scrolls to the new last column.
  const [caja, setCaja] = useState<HTMLDivElement | null>(null);
  const [anadido, setAnadido] = useState(0);
  // Compact first (2026-10-18): the key lines, and every line on request.
  const [todo, setTodo] = useState(false);
  useEffect(() => {
    if (anadido && caja) caja.scrollTo({ left: caja.scrollWidth, behavior: 'smooth' });
  }, [anadido, caja]);
  // Arriving from a gallery's «Comparar» (`…?comparar=a,b#comparar`): the
  // comparison the visitor asked for is what they see first, not the top of
  // the sheet. Once, when the table is there.
  const [llegado, setLlegado] = useState(false);
  useEffect(() => {
    if (llegado || !caja || typeof window === 'undefined' || window.location.hash !== '#comparar') return;
    setLlegado(true);
    document.getElementById('comparar')?.scrollIntoView({ block: 'start' });
  }, [caja, llegado]);
  // On a phone each product column is exactly half the box: the sheet's own
  // product fixed on the left, one other beside it, and the snap lands on a
  // whole column. A column cut in half showed a stray «×» and «a ·» from the
  // product scrolled away (evaluator round 3). 0 = wider screens, CSS decides.
  const [mitad, setMitad] = useState(0);
  useEffect(() => {
    if (!caja || typeof window === 'undefined') return;
    const medir = () => setMitad(window.matchMedia('(min-width: 640px)').matches ? 0 : Math.floor(caja.clientWidth / 2));
    medir();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(medir);
    ro.observe(caja);
    return () => ro.disconnect();
  }, [caja]);

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
  const nClave = v ? v.lineas.filter(l => l.clave).length : 0;
  const plegable = !!v && nClave >= 3 && nClave < v.lineas.length;
  const lineas = v ? (plegable && !todo ? v.lineas.filter(l => l.clave) : v.lineas) : [];
  const hayActual = !!v?.productos.some(p => p.actual);
  const anchoCol = mitad ? { width: mitad, minWidth: mitad, maxWidth: mitad } : undefined;

  return (
    <Seccion titulo={v?.titulo} id={modo !== 'fijo' ? 'comparar' : undefined}>
      {v?.mezcla ? <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{v.mezcla}</p> : null}
      {v && v.productos.length > 1 ? (
        <p className="mb-1 text-sm text-slate-500 sm:hidden">
          {hayActual ? `Este producto se queda a la izquierda; desliza la tabla para ver ${v.productos.length === 2 ? 'el otro' : `los otros ${v.productos.length - 1}`}.` : `Desliza la tabla hacia la izquierda para ver los ${v.productos.length} productos.`}
        </p>
      ) : null}
      {v && v.productos.length >= 1 ? (
        <div ref={setCaja} className="overflow-x-auto rounded-xl border border-slate-100 snap-x snap-mandatory sm:snap-none" style={mitad && hayActual ? { scrollPaddingLeft: mitad } : undefined} role="region" aria-label="Comparación" tabIndex={0}>
          <table className="min-w-full border-collapse text-base">
            <thead>
              <tr>
                <th scope="col" className="hidden sm:table-cell sticky left-0 z-10 sm:min-w-[8.5rem] bg-white shadow-[1px_0_0_theme(colors.slate.200)] px-3 py-2 text-left text-xs font-semibold text-slate-400"><span className="sr-only">Dato</span></th>
                {v.productos.map(p => {
                  const href = p.actual ? null : enlace(p.paginaId);
                  return (
                    <th key={p.id} scope="col" style={anchoCol} className={cn('min-w-[10rem] sm:min-w-[9.5rem] px-3 py-2 text-left align-bottom', p.actual ? cn('bg-sky-50', FIJA) : 'snap-start')}>
                      {p.imagen ? <img src={p.imagen} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} className="mb-1 h-16 w-16 rounded-lg object-contain" /> : null}
                      <div className="flex items-start gap-1">
                        {href ? <a href={href} className="font-bold text-sky-700 hover:underline [overflow-wrap:anywhere]">{p.nombre}</a> : <span className="font-bold text-slate-900 [overflow-wrap:anywhere]">{p.nombre}</span>}
                        {!p.actual && modo !== 'fijo' ? (
                          <Button variant="ghost" className="-mr-2 -mt-2 h-11 w-11 shrink-0 p-0" aria-label={`Quitar ${p.nombre}`} onClick={() => cambiar(otros.filter(i => i !== p.id))}>
                            <X className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                      {p.actual ? <span className="text-sm font-semibold text-sky-700">Este producto</span> : null}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {lineas.map(l => {
                const cabecera = l.grupo && l.grupo !== grupoAnterior ? l.grupo : '';
                grupoAnterior = l.grupo;
                const sentido = l.sentido ? (l.sentido === 'mayor' ? 'más es mejor' : 'menos es mejor') : '';
                return [
                  cabecera ? (
                    <tr key={`g-${l.columnaId}`}>
                      <th colSpan={v.productos.length + 1} scope="colgroup" className="bg-slate-50 py-1.5 text-left text-sm font-bold uppercase tracking-wide text-slate-600">
                        {/* The label sticks, not the cell: a sticky cell as wide as the
                            whole table scrolled away with it and left a grey bar. */}
                        <span className="sticky left-0 inline-block px-3">{cabecera}</span>
                      </th>
                    </tr>
                  ) : null,
                  // On a phone the label goes on its own line above the values,
                  // so the sheet's own product can take the fixed column.
                  <tr key={`e-${l.columnaId}`} className="border-t border-slate-100 sm:hidden">
                    <th colSpan={v.productos.length} scope="colgroup" className="px-0 pt-2 text-left text-sm font-semibold text-slate-700">
                      <span className="sticky left-0 inline-block px-3">{l.etiqueta}{sentido ? <span className="font-normal text-slate-500"> · {sentido}</span> : null}</span>
                    </th>
                  </tr>,
                  <tr key={l.columnaId} className="sm:border-t border-slate-100">
                    <th scope="row" className="hidden sm:table-cell sticky left-0 z-10 bg-white shadow-[1px_0_0_theme(colors.slate.200)] px-3 py-2 text-left align-top text-sm font-medium text-slate-700 [overflow-wrap:anywhere]">
                      {l.etiqueta}
                      {sentido ? <span className="block text-sm font-normal text-slate-500">{sentido}</span> : null}
                    </th>
                    {l.celdas.map((c, i) => (
                      <td key={i} className={cn('px-3 py-2 align-top text-slate-800 [overflow-wrap:anywhere]', c.mejor ? 'bg-emerald-50 font-semibold text-emerald-800' : v.productos[i].actual && 'bg-sky-50', v.productos[i].actual && FIJA)}>
                        {c.texto}
                        {c.mejor ? <span className="ml-1 text-sm font-bold uppercase text-emerald-700">mejor</span> : null}
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
      {plegable ? (
        <Button variant="outline" onClick={() => setTodo(x => !x)} aria-expanded={todo} className="mt-2 min-h-[44px] gap-2 normal-case tracking-normal text-sm">
          {todo ? 'Ver sólo lo principal' : `Ver las ${v!.lineas.length} características`}
        </Button>
      ) : null}
      {/* THE VISITOR CHOOSES (evaluator round 4: «los productos del comparador
          los elige el sitio»). The chooser is always there: with room it adds,
          with four it swaps the last one, so a full table never locks them in. */}
      {modo !== 'fijo' && v?.candidatos.length ? (
        <label className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-600">
          <Plus className="h-4 w-4" />
          <select value="" onChange={e => { if (e.target.value) { cambiar([...(caben ? otros : otros.slice(0, -1)), e.target.value]); setAnadido(n => n + 1); } }}
                  className={cn(CLASE_CAMPO, 'min-h-[44px] text-base sm:min-h-0 sm:text-xs')} aria-label={caben ? 'Añadir a la comparación' : 'Cambiar el último producto de la comparación'}>
            <option value="">{caben ? 'Añadir otro producto…' : 'Cambiar el último por…'}</option>
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
