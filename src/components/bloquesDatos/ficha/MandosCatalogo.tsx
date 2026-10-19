import { useId, useMemo, useState } from 'react';
import type { Fila, Filtro, GrupoFiltros, Vista } from '../../tablas/vistaUtil';
import type { Columna } from '../../tablas/Celda';
import { rolDe, NUNCA_ORDENA, CLAVES_POTENCIA, columnaOrdenCatalogo } from './modelo';
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
// Ronda 4 (2026-10-19): una sola fila en el teléfono, rótulo en cada grupo,
// eficiencia, garantía, ciclos y química (LFP y NMC) donde la tabla los tiene,
// y un orden por defecto con nombre.
// Todo es del visitante y de esta carga: la vista del autor no se toca
// (`cambiarVisitante` en `Rejilla`). La comisión nunca ordena (`NUNCA_ORDENA`).

type Orden = Vista['orden_por'];
type Regla = Filtro | GrupoFiltros;
/** Un botón: pone `valor` en `estado`. Los de un mismo estado se excluyen. */
type Chip = { estado: string; valor: number | true; etiqueta: string; reglas: Regla[] };
/** Un grupo de botones con su rótulo («Capacidad», «Precio»…). */
type Grupo = { clave: string; rotulo: string; chips: Chip[] };

/** Las claves del cargador que hacen de potencia, por si la tabla no la marca. */
const POTENCIA = CLAVES_POTENCIA;
const GARANTIA = ['garantia_anios', 'garantia_producto_anios'];
const EFICIENCIA = ['eficiencia_ida_vuelta_pct', 'eficiencia_pct', 'eficiencia_celula_pct'];
const CICLOS = ['ciclos_declarados'];
const MEJOR_ALTO = [...CICLOS, ...EFICIENCIA];
/** Familias de química que se pueden pedir. Se buscan como texto: el dato
 *  viene escrito por cada marca («LiFePO4», «LFP», «NMC (Li-ion)»…). */
const QUIMICAS = [
  { clave: 'lfp', etiqueta: 'LiFePO₄ (LFP)', textos: ['lfp', 'lifepo'] },
  { clave: 'nmc', etiqueta: 'NMC', textos: ['nmc', 'ncm'] },
];
const clave = (c: Columna) => (c as any).config?.clave as string | undefined;
const unidadDe = (c: Columna) => String((c as any).config?.unidad || '').trim();
const precioPorUnidad = (c: Columna) => rolDe(c as any) === 'precio_unidad' || /^precio_por_(w|wp|wh|kwh)$/.test(clave(c) || '');
/** El rótulo de un grupo por lo que mide la columna, no por su nombre largo. */
const rotuloDe = (c: Columna) => {
  const u = unidadDe(c).toLowerCase();
  if (/^k?wh$/.test(u)) return 'Capacidad';
  if (/^k?wp?$/.test(u)) return 'Potencia';
  if (u === 'lm') return 'Luz';
  return c.nombre.replace(/\s*\(.*\)$/, '');
};

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
const regla = (c: Columna, operador: string, v: number | string): Filtro => ({ columna_id: c.id, operador, valor: v });

/** Hasta X · X–Y · Más de Y, partiendo los valores en tres. Menos de cuatro
 *  valores distintos no dan para tramos: no se ofrecen. */
function tramosDe(filas: Fila[], c: Columna, esPrecio: boolean): Chip[] {
  const v = numeros(filas, c);
  if (new Set(v).size < 4) return [];
  const a = redondo(v[Math.floor(v.length / 3)]), b = redondo(v[Math.floor((2 * v.length) / 3)]);
  if (!(a > 0 && b > a)) return [];
  const u = unidadDe(c);
  const fmt = (n: number) => esPrecio
    ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: (c as any).config?.moneda || 'EUR', maximumFractionDigits: 0 }).format(n)
    : `${n.toLocaleString('es-ES')}${u ? ` ${u}` : ''}`;
  return [
    { estado: c.id, valor: 0, etiqueta: `Hasta ${fmt(a)}`, reglas: [regla(c, 'menor_igual', a)] },
    { estado: c.id, valor: 1, etiqueta: `${esPrecio ? fmt(a).replace(/\s*€$/, '') : a.toLocaleString('es-ES')}–${fmt(b)}`, reglas: [regla(c, 'mayor', a), regla(c, 'menor_igual', b)] },
    { estado: c.id, valor: 2, etiqueta: `Más de ${fmt(b)}`, reglas: [regla(c, 'mayor', b)] },
  ];
}

/** Para lo que cuanto más, mejor (garantía, ciclos, eficiencia): «X o más».
 *  Con pocos valores distintos, uno por valor salvo el más bajo (que serían
 *  todos); con muchos, los dos cortes de los tercios. */
function minimosDe(filas: Fila[], c: Columna, unidadPorDefecto = ''): Chip[] {
  // Un porcentaje se guarda como fracción (0,97): los cortes van en puntos
  // enteros (97 %) y el filtro vuelve a fracción.
  const pct = (c as any).tipo === 'porcentaje';
  const v = numeros(filas, c).map(n => pct ? Math.round(n * 1000) / 10 : n);
  const distintos = [...new Set(v)];
  if (distintos.length < 2) return [];
  const corte = (n: number) => pct ? Math.floor(n) : redondo(n);
  const cortes = distintos.length <= 3 ? distintos.slice(1)
    : [...new Set([corte(v[Math.floor(v.length / 3)]), corte(v[Math.floor((2 * v.length) / 3)])])].filter(n => n > distintos[0]);
  const u = pct ? '%' : unidadDe(c) || unidadPorDefecto;
  const fmt = (n: number) => u === '%' ? `${n.toLocaleString('es-ES')} %` : `${n.toLocaleString('es-ES')}${u ? ` ${u}` : ''}`;
  return cortes.map((n, i) => ({ estado: c.id, valor: i, etiqueta: `${fmt(n)} o más`, reglas: [regla(c, 'mayor_igual', pct ? n / 100 : n)] }));
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

  const eficiencia = EFICIENCIA.map(k => cols.find(c => clave(c) === k)).find(Boolean);
  const ciclos = CICLOS.map(k => cols.find(c => clave(c) === k)).find(Boolean);

  // RÓTULOS DE GRUPO Y LOS FILTROS DE CADA CATEGORÍA (2026-10-19, ronda 4 del
  // evaluador: «en paneles domésticos solo se filtra por Wp y €, sin
  // eficiencia, garantía ni química NMC; los botones no llevan rótulo»). Cada
  // grupo sale sólo si la tabla tiene la columna y sus datos dan para elegir.
  const grupos: Grupo[] = useMemo(() => {
    const g: Array<Grupo | null> = [
      tamano ? { clave: 'tamano', rotulo: rotuloDe(tamano), chips: tramosDe(base, tamano, false) } : null,
      potencia ? { clave: 'potencia', rotulo: rotuloDe(potencia), chips: tramosDe(base, potencia, false) } : null,
      precio ? { clave: 'precio', rotulo: 'Precio', chips: [
        ...tramosDe(base, precio, true),
        ...(base.some(f => !(Number(valor(f, precio)) > 0)) ? [{ estado: 'con_precio', valor: true as const, etiqueta: 'Con precio en tienda', reglas: [regla(precio, 'mayor', 0)] }] : []),
      ] } : null,
      eficiencia ? { clave: 'eficiencia', rotulo: 'Eficiencia', chips: minimosDe(base, eficiencia, '%') } : null,
      garantia ? { clave: 'garantia', rotulo: 'Garantía', chips: minimosDe(base, garantia, 'años') } : null,
      ciclos ? { clave: 'ciclos', rotulo: 'Ciclos', chips: minimosDe(base, ciclos) } : null,
      quimica ? { clave: 'quimica', rotulo: 'Química', chips: QUIMICAS
        .filter(q => { const n = base.filter(f => q.textos.some(t => String(valor(f, quimica) ?? '').toLowerCase().includes(t))).length; return n > 0 && n < base.length; })
        .map((q, i) => ({ estado: 'quimica', valor: i, etiqueta: q.etiqueta, reglas: [{ y_o: 'o' as const, reglas: q.textos.map(t => regla(quimica, 'contiene', t)) }] })) } : null,
    ];
    return g.filter((x): x is Grupo => !!x && x.chips.length > 0);
  }, [base, tamano, potencia, precio, eficiencia, garantia, ciclos, quimica]);

  const porDefecto = columnaOrdenCatalogo(columnas);
  const ordenes: Array<{ valor: string; etiqueta: string; orden: Orden; extra?: Filtro }> = [
    // EL ORDEN POR DEFECTO TIENE NOMBRE (2026-10-19, ronda 4: «"Orden de la
    // página" no explica qué criterio sigue»). Sin orden del autor, el
    // servidor ordena un catálogo por su cifra de tamaño (o su potencia), de
    // menor a mayor (`columnaOrdenCatalogo`), el mismo criterio en todas las
    // categorías, y aquí se dice cuál. Sin ninguna, por nombre si lo están.
    // Los que tienen precio van delante (`columnaPrecioCatalogo`), y el nombre lo dice.
    { valor: '', orden: ordenAutor, etiqueta: ordenAutor.length ? 'Orden de la página'
      : porDefecto ? (precio ? `Con precio primero, menor ${rotuloDe(porDefecto).toLowerCase()}` : `Menor ${rotuloDe(porDefecto).toLowerCase()} primero`) : alfabetico(base) ? 'Nombre (A–Z)' : 'Orden de la página' },
    ...(precio ? [{ valor: 'precio', etiqueta: 'Precio más bajo primero', orden: [{ columna_id: precio.id, direccion: 'asc' as const }] }] : []),
    // Sin precio, el precio por unidad no existe (0): esos se apartan al ordenar por él.
    ...(unidad ? [{ valor: 'unidad', etiqueta: `${unidad.nombre} más bajo primero`, orden: [{ columna_id: unidad.id, direccion: 'asc' as const }], extra: { columna_id: unidad.id, operador: 'mayor', valor: 0 } }] : []),
    ...(tamano ? [{ valor: 'tamano', etiqueta: `Mayor ${rotuloDe(tamano).toLowerCase()} primero`, orden: [{ columna_id: tamano.id, direccion: 'desc' as const }] }] : []),
    ...(potencia ? [{ valor: 'potencia', etiqueta: `Mayor ${rotuloDe(potencia).toLowerCase()} primero`, orden: [{ columna_id: potencia.id, direccion: 'desc' as const }] }] : []),
    ...(garantia ? [{ valor: 'garantia', etiqueta: 'Más años de garantía primero', orden: [{ columna_id: garantia.id, direccion: 'desc' as const }] }] : []),
    ...MEJOR_ALTO.map(k => cols.find(c => clave(c) === k)).filter((c): c is Columna => !!c)
      .map(c => ({ valor: c.id, etiqueta: `Más ${rotuloDe(c).toLowerCase()} primero`, orden: [{ columna_id: c.id, direccion: 'desc' as const }] })),
  ];

  const [elegidos, setElegidos] = useState<Record<string, number | boolean>>({});
  const [orden, setOrden] = useState(() => ordenes.find(o => o.valor && JSON.stringify(o.orden) === JSON.stringify(ordenActual))?.valor || '');

  const aplicar = (sel: Record<string, number | boolean>, ord: string) => {
    const reglas: Array<Filtro | GrupoFiltros> = [];
    const delAutor = Array.isArray(filtrosAutor) ? filtrosAutor : filtrosAutor?.reglas;
    if (delAutor?.length) reglas.push(Array.isArray(filtrosAutor) ? { y_o: 'y', reglas: filtrosAutor } : filtrosAutor);
    for (const g of grupos) for (const c of g.chips) if (sel[c.estado] === c.valor) reglas.push(...c.reglas);
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
    <div className="pb-3 flex flex-col gap-2" data-mandos-catalogo>
      {/* UNA SOLA FILA EN EL TELÉFONO (2026-10-19): el orden y los filtros en
          la misma tira que se desliza, para que la primera tarjeta, con su
          nombre y su precio, se vea sin bajar en 390×844. La etiqueta sigue
          ahí para el lector de pantalla; a la vista vuelve desde `sm`. */}
      <div role="group" aria-label="Ordenar y filtrar" className="-mx-1 px-1 pb-1 flex items-center gap-2 overflow-x-auto sm:flex-wrap sm:gap-3 sm:overflow-visible">
        <label htmlFor={idOrden} className="sr-only sm:not-sr-only shrink-0 text-base font-bold text-slate-800">Ordenar por</label>
        <select id={idOrden} value={orden} onChange={e => { setOrden(e.target.value); aplicar(elegidos, e.target.value); }}
          className="h-11 shrink-0 max-w-[19rem] sm:max-w-none rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900">
          {ordenes.map(o => <option key={o.valor} value={o.valor}>{o.etiqueta}{o.extra ? ' (los que tienen precio)' : ''}</option>)}
        </select>
        {grupos.map(g => (
          <div key={g.clave} role="group" aria-label={g.rotulo} className="shrink-0 flex items-center gap-2 sm:shrink sm:flex-wrap">
            <span aria-hidden="true" className="pl-1 text-base font-bold text-slate-600">{g.rotulo}</span>
            {g.chips.map(c => {
              const activo = elegidos[c.estado] === c.valor;
              return (
                <button key={`${c.estado}${c.valor}`} type="button" aria-pressed={activo} className={chip(activo)}
                  onClick={() => cambiar(c.estado, activo ? null : c.valor)}>{c.etiqueta}</button>
              );
            })}
          </div>
        ))}
        {algoPuesto && (
          <button type="button" className="shrink-0 inline-flex items-center h-11 px-3 text-base font-bold text-slate-700 underline"
            onClick={() => { setElegidos({}); aplicar({}, orden); }}>Quitar filtros</button>
        )}
      </div>
      {algoPuesto && <p className="text-base text-slate-600" aria-live="polite">{filas.length === 1 ? '1 producto' : `${filas.length} productos`} con esos filtros.</p>}
    </div>
  );
}
