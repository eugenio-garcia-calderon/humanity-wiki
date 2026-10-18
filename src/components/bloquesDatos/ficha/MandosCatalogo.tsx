import { useId, useMemo, useState } from 'react';
import type { Fila, Filtro, GrupoFiltros, Vista } from '../../tablas/vistaUtil';
import type { Columna } from '../../tablas/Celda';
import { rolDe, NUNCA_ORDENA } from './modelo';
import { cn } from '../../../utils/cn';

// ============================================================================
// FILTROS Y ORDEN A LA VISTA EN UN CATÁLOGO (2026-10-18, Wikiproducts W2)
// ============================================================================
// Ronda 3 del evaluador: «los filtros quedan escondidos tras "Filtrar" y las
// tarjetas no dicen en qué orden van». En la página publicada de una tabla de
// fichas (una que tiene precio «desde» o una cifra de tamaño), encima de la
// galería:
//   · «Ordenar por», siempre a la vista, con el orden que manda ahora;
//   · botones de tramos para el tamaño (Wh, Wp, kWh…), la potencia y el
//     precio, sacados de los propios datos (tercios), y «Con precio en
//     tienda» y «LiFePO₄» cuando la tabla los tiene.
// Todo es del visitante y de esta carga: la vista del autor no se toca
// (`cambiarVisitante` en `Rejilla`). La comisión nunca ordena (`NUNCA_ORDENA`).

type Orden = Vista['orden_por'];
type Tramo = { etiqueta: string; reglas: Filtro[] };
type Dimension = { clave: string; tramos: Tramo[] };

/** Las claves del cargador que hacen de potencia, por si la tabla no la marca. */
const POTENCIA = ['potencia_salida_max_w', 'potencia_continua_kw', 'lumenes_max', 'potencia_pico_w', 'potencia_pico_wp'];
const GARANTIA = ['garantia_anios', 'garantia_producto_anios'];
const MEJOR_ALTO = ['ciclos_declarados', 'eficiencia_ida_vuelta_pct', 'eficiencia_pct', 'eficiencia_celula_pct'];
const clave = (c: Columna) => (c as any).config?.clave as string | undefined;
const precioPorUnidad = (c: Columna) => rolDe(c as any) === 'precio_unidad' || /^precio_por_(w|wp|wh|kwh)$/.test(clave(c) || '');

/** Dos cifras significativas: 86,4 → 86; 1.234 → 1.200. Un tramo se lee de un vistazo. */
const redondo = (n: number) => {
  if (n <= 0) return 0;
  const e = Math.pow(10, Math.max(0, Math.floor(Math.log10(n)) - 1));
  return Math.round(n / e) * e;
};

/** El valor de una celda, si tiene uno. */
const valor = (f: Fila, c: Columna): unknown => { const x: any = f.celdas?.[c.id]; return x?.estado === 'ok' ? x.valor : undefined; };
const numeros = (filas: Fila[], c: Columna) => filas
  .map(f => valor(f, c)).filter((v): v is number => typeof v === 'number' && v > 0).sort((a, b) => a - b);

/** Hasta X · X–Y · Más de Y, partiendo los valores en tres. Menos de cuatro
 *  valores distintos no dan para tramos: no se ofrecen. */
function tramosDe(filas: Fila[], c: Columna, esPrecio: boolean): Tramo[] {
  const v = numeros(filas, c);
  if (new Set(v).size < 4) return [];
  const a = redondo(v[Math.floor(v.length / 3)]), b = redondo(v[Math.floor((2 * v.length) / 3)]);
  if (!(a > 0 && b > a)) return [];
  const u = String((c as any).config?.unidad || '').trim();
  const fmt = (n: number) => esPrecio
    ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: (c as any).config?.moneda || 'EUR', maximumFractionDigits: 0 }).format(n)
    : `${n.toLocaleString('es-ES')}${u ? ` ${u}` : ''}`;
  const r = (operador: string, valor: number): Filtro => ({ columna_id: c.id, operador, valor });
  return [
    { etiqueta: `Hasta ${fmt(a)}`, reglas: [r('menor_igual', a)] },
    { etiqueta: `${esPrecio ? fmt(a).replace(/\s*€$/, '') : a.toLocaleString('es-ES')}–${fmt(b)}`, reglas: [r('mayor', a), r('menor_igual', b)] },
    { etiqueta: `Más de ${fmt(b)}`, reglas: [r('mayor', b)] },
  ];
}

const alfabetico = (filas: Fila[]) => filas.every((f, i) => i === 0
  || String(filas[i - 1].pagina?.titulo || '').localeCompare(String(f.pagina?.titulo || ''), 'es', { sensitivity: 'base' }) <= 0);

/** ¿Es una tabla de fichas? Con precio «desde» o con una cifra de tamaño. */
export const esCatalogo = (columnas: Columna[]) => columnas.some(c => ['precio_min', 'tamano'].includes(rolDe(c as any) || ''));

export default function MandosCatalogo({ columnas, filas, ordenAutor, filtrosAutor, ordenActual, onCambiar }: {
  columnas: Columna[];
  /** Las filas tal como llegan ahora; los tramos se sacan de la primera carga, sin filtrar. */
  filas: Fila[];
  ordenAutor: Orden;
  filtrosAutor: Filtro[] | GrupoFiltros;
  ordenActual: Orden;
  onCambiar: (parcial: Partial<Pick<Vista, 'filtros' | 'orden_por'>>) => void;
}) {
  const idOrden = useId();
  // Los tramos salen de todos los productos, no de los que quedan al filtrar.
  const [base] = useState(filas);
  const cols = columnas.filter(c => (c as any).config?.visibilidad !== 'nunca' && !NUNCA_ORDENA.has(rolDe(c as any) || ''));
  const precio = cols.find(c => rolDe(c as any) === 'precio_min');
  const tamano = cols.find(c => rolDe(c as any) === 'tamano');
  const potencia = POTENCIA.map(k => cols.find(c => clave(c) === k)).find(c => c && c.id !== tamano?.id);
  const unidad = cols.find(precioPorUnidad);
  const garantia = GARANTIA.map(k => cols.find(c => clave(c) === k)).find(Boolean);
  const quimica = cols.find(c => clave(c) === 'quimica');

  const dimensiones: Dimension[] = useMemo(() => [
    tamano && { clave: 'tamano', tramos: tramosDe(base, tamano, false) },
    potencia && { clave: 'potencia', tramos: tramosDe(base, potencia, false) },
    precio && { clave: 'precio', tramos: tramosDe(base, precio, true) },
  ].filter((d): d is Dimension => !!d && d.tramos.length > 0), [base, tamano, potencia, precio]);

  const hayLfp = !!quimica && base.some(f => /lfp|lifepo/i.test(String(valor(f, quimica) ?? '')));
  const interruptores: Array<{ clave: string; etiqueta: string; regla: Filtro | GrupoFiltros }> = [
    ...(precio && base.some(f => !(Number(valor(f, precio)) > 0)) ? [{ clave: 'con_precio', etiqueta: 'Con precio en tienda', regla: { columna_id: precio.id, operador: 'mayor', valor: 0 } }] : []),
    ...(hayLfp ? [{ clave: 'lfp', etiqueta: 'LiFePO₄ (LFP)', regla: { y_o: 'o' as const, reglas: [
      { columna_id: quimica!.id, operador: 'contiene', valor: 'lfp' }, { columna_id: quimica!.id, operador: 'contiene', valor: 'lifepo' }] } }] : []),
  ];

  const ordenes: Array<{ valor: string; etiqueta: string; orden: Orden; extra?: Filtro }> = [
    // Si sin orden puesto van por nombre, se dice así (ronda 3: «en baterías
    // domésticas es alfabético» y nada lo decía).
    { valor: '', etiqueta: ordenAutor.length || !alfabetico(base) ? 'Orden de la página' : 'Nombre (A–Z)', orden: ordenAutor },
    ...(precio ? [{ valor: 'precio', etiqueta: 'Precio: de menor a mayor', orden: [{ columna_id: precio.id, direccion: 'asc' as const }] }] : []),
    // Sin precio, el precio por unidad no existe (0): esos se apartan al ordenar por él.
    ...(unidad ? [{ valor: 'unidad', etiqueta: `${unidad.nombre}: de menor a mayor`, orden: [{ columna_id: unidad.id, direccion: 'asc' as const }], extra: { columna_id: unidad.id, operador: 'mayor', valor: 0 } }] : []),
    ...(tamano ? [{ valor: 'tamano', etiqueta: `${tamano.nombre}: de mayor a menor`, orden: [{ columna_id: tamano.id, direccion: 'desc' as const }] }] : []),
    ...(potencia ? [{ valor: 'potencia', etiqueta: `${potencia.nombre}: de mayor a menor`, orden: [{ columna_id: potencia.id, direccion: 'desc' as const }] }] : []),
    ...(garantia ? [{ valor: 'garantia', etiqueta: `${garantia.nombre.replace(/\s*\(años\)$/, '')}: más años primero`, orden: [{ columna_id: garantia.id, direccion: 'desc' as const }] }] : []),
    ...MEJOR_ALTO.map(k => cols.find(c => clave(c) === k)).filter((c): c is Columna => !!c)
      .map(c => ({ valor: c.id, etiqueta: `${c.nombre}: de mayor a menor`, orden: [{ columna_id: c.id, direccion: 'desc' as const }] })),
  ];

  const [elegidos, setElegidos] = useState<Record<string, number | boolean>>({});
  const [orden, setOrden] = useState(() => ordenes.find(o => o.valor && JSON.stringify(o.orden) === JSON.stringify(ordenActual))?.valor || '');

  const aplicar = (sel: Record<string, number | boolean>, ord: string) => {
    const reglas: Array<Filtro | GrupoFiltros> = [];
    const delAutor = Array.isArray(filtrosAutor) ? filtrosAutor : filtrosAutor?.reglas;
    if (delAutor?.length) reglas.push(Array.isArray(filtrosAutor) ? { y_o: 'y', reglas: filtrosAutor } : filtrosAutor);
    for (const d of dimensiones) { const i = sel[d.clave]; if (typeof i === 'number') reglas.push(...d.tramos[i].reglas); }
    for (const x of interruptores) if (sel[x.clave] === true) reglas.push(x.regla);
    const o = ordenes.find(x => x.valor === ord) || ordenes[0];
    if (o.extra) reglas.push(o.extra);
    onCambiar({ filtros: { y_o: 'y', reglas }, orden_por: o.orden });
  };
  const cambiar = (k: string, v: number | boolean | null) => {
    const sel = { ...elegidos };
    if (v === null || v === false) delete sel[k]; else sel[k] = v;
    setElegidos(sel); aplicar(sel, orden);
  };
  const algoPuesto = Object.keys(elegidos).length > 0;

  const chip = (activo: boolean) => cn('shrink-0 inline-flex items-center h-11 px-4 rounded-full border text-base font-bold whitespace-nowrap transition-colors',
    activo ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-300 text-slate-800 hover:border-slate-500');

  return (
    <div className="pb-4 flex flex-col gap-3" data-mandos-catalogo>
      <div className="flex items-center gap-3">
        <label htmlFor={idOrden} className="shrink-0 text-base font-bold text-slate-800">Ordenar por</label>
        <select id={idOrden} value={orden} onChange={e => { setOrden(e.target.value); aplicar(elegidos, e.target.value); }}
          className="h-11 min-w-0 flex-1 sm:flex-none rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900">
          {ordenes.map(o => <option key={o.valor} value={o.valor}>{o.etiqueta}{o.extra ? ' (los que tienen precio)' : ''}</option>)}
        </select>
      </div>
      {(dimensiones.length > 0 || interruptores.length > 0) && (
        // En el teléfono, una fila que se desliza; en pantalla grande, se parte.
        <div role="group" aria-label="Filtrar" className="-mx-1 px-1 pb-1 flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible">
          {dimensiones.map(d => d.tramos.map((t, i) => (
            <button key={`${d.clave}${i}`} type="button" aria-pressed={elegidos[d.clave] === i} className={chip(elegidos[d.clave] === i)}
              onClick={() => cambiar(d.clave, elegidos[d.clave] === i ? null : i)}>{t.etiqueta}</button>
          )))}
          {interruptores.map(x => (
            <button key={x.clave} type="button" aria-pressed={elegidos[x.clave] === true} className={chip(elegidos[x.clave] === true)}
              onClick={() => cambiar(x.clave, !elegidos[x.clave])}>{x.etiqueta}</button>
          ))}
          {algoPuesto && (
            <button type="button" className="shrink-0 inline-flex items-center h-11 px-3 text-base font-bold text-slate-700 underline"
              onClick={() => { setElegidos({}); aplicar({}, orden); }}>Quitar filtros</button>
          )}
        </div>
      )}
      {algoPuesto && <p className="text-base text-slate-600" aria-live="polite">{filas.length === 1 ? '1 producto' : `${filas.length} productos`} con esos filtros.</p>}
    </div>
  );
}
