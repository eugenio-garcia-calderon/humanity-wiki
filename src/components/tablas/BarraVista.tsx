import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  Plus, Filter, ArrowUpDown, Layers, Eye, EyeOff, X, ChevronDown, ChevronUp, MoreHorizontal, Copy, Trash2, Pencil,
  Table2, LayoutGrid, Columns3, List, CalendarDays, GanttChart, BarChart3, ClipboardList, Check, Settings2,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Columna } from './Celda';
import {
  FORMAS, comoGrupo, esGrupo, cuantasReglas, operadoresDe, ETIQUETA_OPERADOR, SIN_VALOR, FECHAS_RELATIVAS, APUNTAN,
  agrupable, type Forma, type Vista, type Filtro, type GrupoFiltros, type ConfigVista,
} from './vistaUtil';

// ============================================================================
// TABLAS · LA BARRA DE LA VISTA (2026-10-05, carril «bd»)
// ============================================================================
// Las pestañas de las vistas y los tres mandos de Notion: «Filtrar»,
// «Ordenar» y «Agrupar». Cada cambio se guarda EN LA VISTA (tabla
// `bd_vistas`), no en el navegador: quien vuelva mañana, o quien lea la
// página publicada, ve la tabla igual que la dejó quien la edita.
//
// El número que lleva cada botón («Filtrar · 2») no es decoración: una tabla
// filtrada y una completa se ven igual, y sin ese número nadie sabe que está
// mirando un trozo.

export const ICONO_FORMA: Record<Forma, typeof Table2> = {
  tabla: Table2, galeria: LayoutGrid, tablero: Columns3, lista: List,
  calendario: CalendarDays, linea: GanttChart, grafico: BarChart3, formulario: ClipboardList,
};

/** Un desplegable que se cierra al pinchar fuera o con Escape.
 *
 *  SE COLOCA CON `position: fixed`, medido desde el botón que lo abre, y no
 *  con `absolute`: la tabla vive dentro de cajas con `overflow` (para su
 *  desplazamiento horizontal y sus esquinas redondeadas) que lo recortaban,
 *  y un panel de filtros de 34rem abierto junto al borde se salía de la
 *  pantalla. Fijo, se ajusta a la ventana venga de donde venga. */
export function Desplegable({ abierto, onCerrar, children, ancho = 'w-80', derecha = false }: {
  abierto: boolean; onCerrar: () => void; children: ReactNode; ancho?: string; derecha?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; maxH: number } | null>(null);
  useLayoutEffect(() => {
    if (!abierto) { setPos(null); return; }
    const colocar = () => {
      const panel = ref.current;
      const ancla = panel?.parentElement;
      if (!panel || !ancla) return;
      const r = ancla.getBoundingClientRect();
      const w = panel.offsetWidth;
      const vw = window.innerWidth, vh = window.innerHeight;
      let left = derecha ? r.right - w : r.left;
      left = Math.max(8, Math.min(left, vw - w - 8));
      let top = r.bottom + 4;
      // Sin sitio debajo: se abre hacia arriba.
      const alto = panel.offsetHeight;
      if (top + Math.min(alto, 320) > vh - 8 && r.top > vh - r.bottom) top = Math.max(8, r.top - 4 - Math.min(alto, r.top - 12));
      setPos({ top, left, maxH: Math.max(160, vh - top - 8) });
    };
    colocar();
    window.addEventListener('resize', colocar);
    window.addEventListener('scroll', colocar, true);
    return () => { window.removeEventListener('resize', colocar); window.removeEventListener('scroll', colocar, true); };
  }, [abierto, derecha]);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      const t = e.target as Node;
      // Pinchar en el propio botón lo gestiona el botón (abre o cierra).
      if (ref.current && !ref.current.contains(t) && !ref.current.parentElement?.contains(t)) onCerrar();
    };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla); };
  }, [abierto, onCerrar]);
  if (!abierto) return null;
  return (
    <div ref={ref} style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, maxHeight: pos?.maxH }}
      className={cn('z-[60] max-w-[calc(100vw-1rem)] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-2xl p-2 text-left', ancho)}>
      {children}
    </div>
  );
}

const claseSelect = 'h-8 min-w-0 rounded-md border border-slate-200 bg-white px-1.5 text-xs font-bold text-slate-700 outline-none focus:border-emerald-400';
const claseBoton = (activo: boolean) => cn('inline-flex items-center gap-1 h-8 px-2 rounded-md text-[11px] font-bold shrink-0 transition-colors',
  activo ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent');

// ── UNA REGLA DE FILTRO ─────────────────────────────────────────────────────

function EditorValor({ regla, columna, conocidos, onCambiar }: {
  regla: Filtro; columna?: Columna; conocidos: Map<string, string>; onCambiar: (valor: any) => void;
}) {
  // El texto se escribe en local y se manda al dejar de teclear: guardar la
  // vista a cada letra serían diez viajes al servidor por palabra.
  const [texto, setTexto] = useState(regla.valor ?? '');
  useEffect(() => { setTexto(regla.valor ?? ''); }, [regla.valor]);
  useEffect(() => {
    if (texto === (regla.valor ?? '')) return;
    const t = setTimeout(() => onCambiar(texto), 450);
    return () => clearTimeout(t);
  }, [texto]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!columna || SIN_VALOR.has(regla.operador)) return null;
  const t = columna.tipo;
  if (t === 'seleccion' || t === 'seleccion_multiple') {
    return (
      <select value={regla.valor ?? ''} onChange={e => onCambiar(e.target.value)} className={cn(claseSelect, 'flex-1')} aria-label="Valor">
        <option value="">Elige…</option>
        {(columna.opciones || []).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    );
  }
  if (APUNTAN.has(t)) {
    return (
      <select value={regla.valor ?? ''} onChange={e => onCambiar(e.target.value)} className={cn(claseSelect, 'flex-1')} aria-label="Valor">
        <option value="">Elige…</option>
        {[...conocidos.entries()].map(([id, etiqueta]) => <option key={id} value={id}>{etiqueta}</option>)}
      </select>
    );
  }
  if (t === 'fecha') {
    const relativa = typeof regla.valor === 'string' && regla.valor.startsWith('@');
    return (
      <div className="flex-1 flex gap-1 min-w-0">
        <select value={relativa ? regla.valor : ''} onChange={e => onCambiar(e.target.value || '')} className={cn(claseSelect, 'w-28')} aria-label="Fecha relativa">
          <option value="">Fecha exacta</option>
          {FECHAS_RELATIVAS.map(f => <option key={f.valor} value={f.valor}>{f.label}</option>)}
        </select>
        {!relativa && (
          <input type="date" value={regla.valor ?? ''} onChange={e => onCambiar(e.target.value)} aria-label="Fecha"
            className={cn(claseSelect, 'flex-1')} />
        )}
      </div>
    );
  }
  const numerico = ['numero', 'moneda', 'porcentaje', 'duracion', 'valoracion'].includes(t);
  // El porcentaje se guarda como fracción (0,15) y se escribe como 15: es lo
  // que hace la propia celda, y aquí tiene que ser igual o el filtro no casa.
  if (t === 'porcentaje') {
    const v = regla.valor === undefined || regla.valor === '' ? '' : String(Math.round(Number(regla.valor) * 10000) / 100);
    return <input type="number" defaultValue={v} key={v} onBlur={e => onCambiar(e.target.value === '' ? '' : Number(e.target.value) / 100)}
      placeholder="%" aria-label="Valor" className={cn(claseSelect, 'flex-1')} />;
  }
  return (
    <input type={numerico ? 'number' : 'text'} value={texto} onChange={e => setTexto(numerico && e.target.value !== '' ? Number(e.target.value) : e.target.value)}
      placeholder="Valor…" aria-label="Valor" className={cn(claseSelect, 'flex-1 font-medium')} />
  );
}

function ReglaFiltro({ regla, columnas, conocidos, prefijo, onCambiar, onQuitar }: {
  regla: Filtro; columnas: Columna[]; conocidos: Record<string, Map<string, string>>;
  prefijo: ReactNode; onCambiar: (r: Filtro) => void; onQuitar: () => void;
}) {
  const col = columnas.find(c => c.id === regla.columna_id);
  const ops = operadoresDe(col?.tipo || 'texto');
  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center gap-1">
      <div className="w-14 shrink-0">{prefijo}</div>
      <select value={regla.columna_id} aria-label="Propiedad" className={cn(claseSelect, 'w-32')}
        onChange={e => {
          const nueva = columnas.find(c => c.id === e.target.value);
          const o = operadoresDe(nueva?.tipo || 'texto');
          onCambiar({ columna_id: e.target.value, operador: o.includes(regla.operador) ? regla.operador : o[0], valor: undefined });
        }}>
        {columnas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
      <select value={regla.operador} aria-label="Condición" className={cn(claseSelect, 'w-32')}
        onChange={e => onCambiar({ ...regla, operador: e.target.value })}>
        {ops.map(o => <option key={o} value={o}>{ETIQUETA_OPERADOR[o] || o}</option>)}
      </select>
      <EditorValor regla={regla} columna={col} conocidos={conocidos[regla.columna_id] || new Map()}
        onCambiar={valor => onCambiar({ ...regla, valor })} />
      <button onClick={onQuitar} title="Quitar esta regla" aria-label="Quitar esta regla"
        className="w-8 h-8 grid place-items-center rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/** El Y/O de un grupo: en la segunda regla se elige; en las siguientes se
 *  repite, porque un grupo es TODO Y o TODO O (para mezclar, otro grupo). */
function Conector({ indice, y_o, onCambiar }: { indice: number; y_o: 'y' | 'o'; onCambiar: (v: 'y' | 'o') => void }) {
  if (indice === 0) return <span className="text-[11px] font-bold text-slate-400 pl-1">Donde</span>;
  if (indice > 1) return <span className="text-[11px] font-bold text-slate-400 pl-1">{y_o === 'y' ? 'Y' : 'O'}</span>;
  return (
    <select value={y_o} onChange={e => onCambiar(e.target.value as 'y' | 'o')} aria-label="Y u O" className={cn(claseSelect, 'w-14 px-1')}>
      <option value="y">Y</option><option value="o">O</option>
    </select>
  );
}

function PanelFiltro({ vista, columnas, conocidos, onCambiar }: {
  vista: Vista; columnas: Columna[]; conocidos: Record<string, Map<string, string>>; onCambiar: (f: GrupoFiltros) => void;
}) {
  const grupo = comoGrupo(vista.filtros);
  const nueva = (): Filtro => {
    const c = columnas[0];
    return { columna_id: c?.id || '', operador: operadoresDe(c?.tipo || 'texto')[0] };
  };
  const conRegla = (g: GrupoFiltros, i: number, r: Filtro | GrupoFiltros | null): GrupoFiltros => {
    const reglas = [...g.reglas];
    if (r === null) reglas.splice(i, 1); else reglas[i] = r;
    return { ...g, reglas };
  };
  if (!columnas.length) return <p className="p-2 text-xs text-slate-400">No hay propiedades por las que filtrar.</p>;
  return (
    <div className="space-y-1.5">
      {!grupo.reglas.length && <p className="px-1 py-2 text-xs text-slate-400">Sin filtros: se ven todas las filas.</p>}
      {grupo.reglas.map((r, i) => esGrupo(r) ? (
        <div key={i} className="flex items-start gap-1">
          <div className="w-14 shrink-0 pt-2"><Conector indice={i} y_o={grupo.y_o} onCambiar={y_o => onCambiar({ ...grupo, y_o })} /></div>
          <div className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-slate-50/70 p-1.5 space-y-1">
            {r.reglas.map((rr, j) => (
              <ReglaFiltro key={j} regla={rr as Filtro} columnas={columnas} conocidos={conocidos}
                prefijo={<Conector indice={j} y_o={r.y_o} onCambiar={y_o => onCambiar(conRegla(grupo, i, { ...r, y_o }))} />}
                onCambiar={nr => onCambiar(conRegla(grupo, i, conRegla(r, j, nr)))}
                onQuitar={() => {
                  const g2 = conRegla(r, j, null);
                  onCambiar(conRegla(grupo, i, g2.reglas.length ? g2 : null));
                }} />
            ))}
            <button onClick={() => onCambiar(conRegla(grupo, i, { ...r, reglas: [...r.reglas, nueva()] }))}
              className="inline-flex items-center gap-1 h-7 px-1.5 rounded-md text-[11px] font-bold text-slate-500 hover:bg-white">
              <Plus className="w-3 h-3" /> Añadir regla al grupo
            </button>
          </div>
        </div>
      ) : (
        <ReglaFiltro key={i} regla={r} columnas={columnas} conocidos={conocidos}
          prefijo={<Conector indice={i} y_o={grupo.y_o} onCambiar={y_o => onCambiar({ ...grupo, y_o })} />}
          onCambiar={nr => onCambiar(conRegla(grupo, i, nr))}
          onQuitar={() => onCambiar(conRegla(grupo, i, null))} />
      ))}
      <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-100">
        <button onClick={() => onCambiar({ ...grupo, reglas: [...grupo.reglas, nueva()] })}
          className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-xs font-bold text-emerald-700 hover:bg-emerald-50">
          <Plus className="w-3.5 h-3.5" /> Añadir filtro
        </button>
        <button onClick={() => onCambiar({ ...grupo, reglas: [...grupo.reglas, { y_o: grupo.y_o === 'y' ? 'o' : 'y', reglas: [nueva()] }] })}
          title="Un grupo de reglas con su propio Y/O: «estado es Hecho Y (dueño es Ana O dueño es Luis)»"
          className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-xs font-bold text-slate-500 hover:bg-slate-100">
          <Layers className="w-3.5 h-3.5" /> Añadir grupo
        </button>
        {!!grupo.reglas.length && (
          <button onClick={() => onCambiar({ y_o: 'y', reglas: [] })}
            className="ml-auto inline-flex items-center gap-1 h-8 px-2 rounded-md text-xs font-bold text-slate-400 hover:text-rose-600">
            Quitar todos
          </button>
        )}
      </div>
    </div>
  );
}

function PanelOrden({ vista, columnas, onCambiar }: { vista: Vista; columnas: Columna[]; onCambiar: (o: Vista['orden_por']) => void }) {
  const orden = vista.orden_por;
  const mover = (i: number, d: number) => {
    const o = [...orden]; const [x] = o.splice(i, 1); o.splice(i + d, 0, x); onCambiar(o);
  };
  const libres = columnas.filter(c => !orden.some(o => o.columna_id === c.id));
  return (
    <div className="space-y-1.5">
      {!orden.length && <p className="px-1 py-2 text-xs text-slate-400">Sin orden: las filas van como las colocaste a mano.</p>}
      {orden.map((o, i) => (
        <div key={o.columna_id + i} className="flex items-center gap-1">
          <div className="flex flex-col">
            <button disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Subir" className="h-4 text-slate-300 hover:text-slate-700 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
            <button disabled={i === orden.length - 1} onClick={() => mover(i, 1)} aria-label="Bajar" className="h-4 text-slate-300 hover:text-slate-700 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
          </div>
          <select value={o.columna_id} aria-label="Propiedad" className={cn(claseSelect, 'flex-1')}
            onChange={e => onCambiar(orden.map((x, j) => j === i ? { ...x, columna_id: e.target.value } : x))}>
            {columnas.filter(c => c.id === o.columna_id || libres.includes(c)).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select value={o.direccion} aria-label="Sentido" className={cn(claseSelect, 'w-32')}
            onChange={e => onCambiar(orden.map((x, j) => j === i ? { ...x, direccion: e.target.value as 'asc' | 'desc' } : x))}>
            <option value="asc">Ascendente</option><option value="desc">Descendente</option>
          </select>
          <button onClick={() => onCambiar(orden.filter((_, j) => j !== i))} aria-label="Quitar este orden"
            className="w-8 h-8 grid place-items-center rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50"><X className="w-3.5 h-3.5" /></button>
        </div>
      ))}
      <div className="flex items-center gap-1 pt-1 border-t border-slate-100">
        {!!libres.length && (
          <button onClick={() => onCambiar([...orden, { columna_id: libres[0].id, direccion: 'asc' }])}
            className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-xs font-bold text-emerald-700 hover:bg-emerald-50">
            <Plus className="w-3.5 h-3.5" /> Añadir orden
          </button>
        )}
        {!!orden.length && (
          <button onClick={() => onCambiar([])} className="ml-auto h-8 px-2 rounded-md text-xs font-bold text-slate-400 hover:text-rose-600">Quitar todos</button>
        )}
      </div>
    </div>
  );
}

function PanelAgrupar({ vista, columnas, onCambiar, gruposConocidos }: {
  vista: Vista; columnas: Columna[]; onCambiar: (c: Partial<Vista>) => void;
  gruposConocidos: Array<{ clave: string; etiqueta: string }>;
}) {
  const cfg = vista.config;
  const opciones = columnas.filter(agrupable);
  const colAgr = columnas.find(c => c.id === vista.agrupar_por);
  const ocultos = new Set(cfg.grupos_ocultos || []);
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
        <span className="w-20 shrink-0">{vista.forma === 'tablero' ? 'Columnas' : 'Agrupar por'}</span>
        <select value={vista.agrupar_por || ''} className={cn(claseSelect, 'flex-1')} aria-label="Agrupar por"
          onChange={e => onCambiar({ agrupar_por: e.target.value || null, config: { ...cfg, grupos_ocultos: [] } })}>
          <option value="">{vista.forma === 'tablero' ? 'Elige una propiedad…' : 'Sin agrupar'}</option>
          {opciones.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </label>
      {vista.agrupar_por && (
        <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <span className="w-20 shrink-0">{vista.forma === 'tablero' ? 'Filas' : 'Subgrupos'}</span>
          <select value={cfg.subagrupar_por || ''} className={cn(claseSelect, 'flex-1')} aria-label="Subagrupar por"
            onChange={e => onCambiar({ config: { ...cfg, subagrupar_por: e.target.value || null } })}>
            <option value="">Sin subgrupos</option>
            {opciones.filter(c => c.id !== vista.agrupar_por).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </label>
      )}
      {colAgr?.tipo === 'fecha' && (
        <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <span className="w-20 shrink-0">Fechas por</span>
          <select value={cfg.fecha_por || 'mes'} className={cn(claseSelect, 'flex-1')} aria-label="Agrupar fechas por"
            onChange={e => onCambiar({ config: { ...cfg, fecha_por: e.target.value as ConfigVista['fecha_por'] } })}>
            <option value="dia">Día</option><option value="semana">Semana</option><option value="mes">Mes</option><option value="anyo">Año</option>
          </select>
        </label>
      )}
      {vista.agrupar_por && (
        <>
          <label className="flex items-center gap-2 px-1 text-xs font-bold text-slate-600 cursor-pointer">
            <input type="checkbox" checked={!!cfg.ocultar_vacios} onChange={e => onCambiar({ config: { ...cfg, ocultar_vacios: e.target.checked } })} />
            Esconder los grupos vacíos
          </label>
          {!!gruposConocidos.length && (
            <div className="border-t border-slate-100 pt-1.5">
              <p className="px-1 pb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">Grupos que se ven</p>
              <div className="max-h-52 overflow-y-auto">
                {gruposConocidos.map(g => {
                  const oculto = ocultos.has(g.clave);
                  return (
                    <button key={g.clave || '·vacío'} onClick={() => {
                      const s = new Set(ocultos); if (oculto) s.delete(g.clave); else s.add(g.clave);
                      onCambiar({ config: { ...cfg, grupos_ocultos: [...s] } });
                    }} className="w-full flex items-center gap-2 px-1.5 h-8 rounded-md text-xs font-bold text-slate-600 hover:bg-slate-50 text-left">
                      {oculto ? <EyeOff className="w-3.5 h-3.5 text-slate-300" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
                      <span className={cn('flex-1 truncate', oculto && 'text-slate-300')}>{g.etiqueta}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Qué propiedades se ven. En la tabla se guardan las ESCONDIDAS (así una
 *  columna nueva aparece sola); en las tarjetas, las que se ven y en orden. */
function PanelPropiedades({ vista, columnas, columnaTitulo, onCambiar }: {
  vista: Vista; columnas: Columna[]; columnaTitulo: string | null; onCambiar: (c: Partial<Vista>) => void;
}) {
  if (vista.forma === 'tabla') {
    const ocultas = new Set(vista.ocultas);
    return (
      <div className="max-h-72 overflow-y-auto">
        {columnas.map(c => {
          const ve = !ocultas.has(c.id);
          const esTitulo = c.id === columnaTitulo;
          return (
            <button key={c.id} disabled={esTitulo} title={esTitulo ? 'El nombre de la fila siempre se ve' : undefined}
              onClick={() => { const s = new Set(ocultas); if (ve) s.add(c.id); else s.delete(c.id); onCambiar({ ocultas: [...s] }); }}
              className="w-full flex items-center gap-2 px-1.5 h-8 rounded-md text-xs font-bold text-slate-600 hover:bg-slate-50 text-left disabled:opacity-60">
              {ve ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-300" />}
              <span className={cn('flex-1 truncate', !ve && 'text-slate-300')}>{c.nombre}</span>
            </button>
          );
        })}
      </div>
    );
  }
  const otras = columnas.filter(c => c.id !== columnaTitulo);
  const actuales = Array.isArray(vista.config.propiedades) ? vista.config.propiedades : otras.slice(0, 3).map(c => c.id);
  return (
    <div className="max-h-72 overflow-y-auto">
      <p className="px-1.5 pb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">Se ven en cada elemento</p>
      {otras.map(c => {
        const puesta = actuales.includes(c.id);
        return (
          <button key={c.id} onClick={() => onCambiar({ config: { ...vista.config, propiedades: puesta ? actuales.filter(x => x !== c.id) : [...actuales, c.id] } })}
            className="w-full flex items-center gap-2 px-1.5 h-8 rounded-md text-xs font-bold text-slate-600 hover:bg-slate-50 text-left">
            <span className={cn('w-3.5 h-3.5 rounded border grid place-items-center shrink-0', puesta ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300')}>
              {puesta && <Check className="w-2.5 h-2.5" />}
            </span>
            <span className="flex-1 truncate">{c.nombre}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── LA BARRA ────────────────────────────────────────────────────────────────

export default function BarraVista({
  vistas, activa, columnas, columnaTitulo, editable, conocidos, gruposConocidos, centrada = false,
  onElegir, onCrear, onCambiar, onRenombrar, onDuplicar, onBorrar, ajustes, extra,
}: {
  vistas: Vista[];
  activa: Vista;
  columnas: Columna[];
  columnaTitulo: string | null;
  editable: boolean;
  /** Para los filtros de personas y relaciones: id → nombre de lo que hay. */
  conocidos: Record<string, Map<string, string>>;
  /** Los grupos que hay ahora mismo, para poder esconderlos uno a uno. */
  gruposConocidos: Array<{ clave: string; etiqueta: string }>;
  centrada?: boolean;
  onElegir: (v: Vista) => void;
  onCrear: (forma: Forma) => void;
  onCambiar: (c: Partial<Vista>) => void;
  onRenombrar: (v: Vista, nombre: string) => void;
  onDuplicar: (v: Vista) => void;
  onBorrar: (v: Vista) => void;
  /** Los ajustes propios de cada forma (fecha del calendario, gráfico…). */
  ajustes?: ReactNode;
  /** Lo que quien la usa quiera poner a la derecha. */
  extra?: ReactNode;
}) {
  const [abierto, setAbierto] = useState<null | 'filtro' | 'orden' | 'agrupar' | 'props' | 'nueva' | 'ajustes' | string>(null);
  const [renombrando, setRenombrando] = useState<string | null>(null);
  const cerrar = () => setAbierto(null);
  const nFiltros = cuantasReglas(activa.filtros);
  const nOrden = activa.orden_por.length;
  const colAgr = columnas.find(c => c.id === activa.agrupar_por);
  const conMandos = !['formulario'].includes(activa.forma);
  const conPropiedades = ['tabla', 'tablero', 'lista', 'calendario', 'linea'].includes(activa.forma);
  const conAgrupar = ['tabla', 'galeria', 'tablero', 'lista', 'linea'].includes(activa.forma);
  const lista = activa.id === null ? [activa, ...vistas] : vistas;

  return (
    <div className={cn('flex flex-wrap items-center gap-1 min-w-0', centrada && 'justify-center')}>
      {/* LAS PESTAÑAS. Una por vista; la activa, marcada. */}
      <div className="flex items-center gap-0.5 min-w-0 overflow-x-auto max-w-full" role="tablist" aria-label="Vistas">
        {lista.map(v => {
          const Icono = ICONO_FORMA[v.forma] || Table2;
          const es = v.id === activa.id;
          const clave = v.id || 'virtual';
          if (renombrando === clave) {
            return (
              <input key={clave} autoFocus defaultValue={v.nombre} maxLength={120} aria-label="Nombre de la vista"
                onBlur={e => { setRenombrando(null); if (e.target.value.trim() && e.target.value.trim() !== v.nombre) onRenombrar(v, e.target.value.trim()); }}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setRenombrando(null); }}
                className="h-8 w-32 px-2 rounded-md border border-emerald-300 text-[11px] font-bold outline-none" />
            );
          }
          return (
            <div key={clave} className="relative shrink-0 flex items-center">
              <button role="tab" aria-selected={es} onClick={() => onElegir(v)}
                onDoubleClick={() => editable && setRenombrando(clave)}
                className={cn('inline-flex items-center gap-1 h-8 pl-2 rounded-md text-[11px] font-bold transition-colors whitespace-nowrap',
                  es && editable ? 'pr-0.5' : 'pr-2',
                  es ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-700 border border-transparent')}>
                <Icono className="w-3.5 h-3.5" /> {v.nombre}
                {es && editable && (
                  <span role="button" tabIndex={0} aria-label="Opciones de la vista"
                    onClick={e => { e.stopPropagation(); setAbierto(abierto === 'menu:' + clave ? null : 'menu:' + clave); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); setAbierto('menu:' + clave); } }}
                    className="w-6 h-6 grid place-items-center rounded text-slate-300 hover:text-slate-700 hover:bg-slate-100">
                    <ChevronDown className="w-3 h-3" />
                  </span>
                )}
              </button>
              <Desplegable abierto={abierto === 'menu:' + clave} onCerrar={cerrar} ancho="w-48">
                <button onClick={() => { cerrar(); setRenombrando(clave); }} className="w-full flex items-center gap-2 px-2 h-9 rounded-md text-xs font-bold text-slate-600 hover:bg-slate-50">
                  <Pencil className="w-3.5 h-3.5" /> Cambiar el nombre
                </button>
                <button onClick={() => { cerrar(); onDuplicar(v); }} className="w-full flex items-center gap-2 px-2 h-9 rounded-md text-xs font-bold text-slate-600 hover:bg-slate-50">
                  <Copy className="w-3.5 h-3.5" /> Duplicar
                </button>
                {v.id && (
                  <button onClick={() => { cerrar(); onBorrar(v); }} className="w-full flex items-center gap-2 px-2 h-9 rounded-md text-xs font-bold text-rose-600 hover:bg-rose-50">
                    <Trash2 className="w-3.5 h-3.5" /> Quitar la vista
                  </button>
                )}
              </Desplegable>
            </div>
          );
        })}
        {editable && (
          <div className="relative shrink-0">
            <button onClick={() => setAbierto(abierto === 'nueva' ? null : 'nueva')} title="Añadir una vista" aria-label="Añadir una vista"
              className="w-8 h-8 grid place-items-center rounded-md text-slate-400 hover:text-emerald-700 hover:bg-emerald-50">
              <Plus className="w-4 h-4" />
            </button>
          <Desplegable abierto={abierto === 'nueva'} onCerrar={cerrar} ancho="w-64">
            <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">Nueva vista</p>
            {FORMAS.map(f => {
              const Icono = ICONO_FORMA[f.forma];
              return (
                <button key={f.forma} onClick={() => { cerrar(); onCrear(f.forma); }}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left hover:bg-slate-50">
                  <Icono className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-slate-700">{f.label}</span>
                    <span className="block text-[11px] text-slate-400 truncate">{f.desc}</span>
                  </span>
                </button>
              );
            })}
          </Desplegable>
          </div>
        )}
      </div>

      {/* LOS MANDOS. Solo para quien edita: la página publicada enseña la
          vista tal como la dejó su autor. */}
      {editable && conMandos && (
        <div className={cn('flex flex-wrap items-center gap-0.5', !centrada && 'ml-auto')}>
          <div className="relative">
            <button onClick={() => setAbierto(abierto === 'filtro' ? null : 'filtro')} className={claseBoton(nFiltros > 0)} aria-expanded={abierto === 'filtro'}>
              <Filter className="w-3.5 h-3.5" /> Filtrar{nFiltros > 0 && ` · ${nFiltros}`}
            </button>
            <Desplegable abierto={abierto === 'filtro'} onCerrar={cerrar} ancho="w-[34rem]" derecha>
              <PanelFiltro vista={activa} columnas={columnas} conocidos={conocidos} onCambiar={f => onCambiar({ filtros: f })} />
            </Desplegable>
          </div>
          {activa.forma !== 'grafico' && (
            <div className="relative">
              <button onClick={() => setAbierto(abierto === 'orden' ? null : 'orden')} className={claseBoton(nOrden > 0)} aria-expanded={abierto === 'orden'}>
                <ArrowUpDown className="w-3.5 h-3.5" /> Ordenar{nOrden > 0 && ` · ${nOrden}`}
              </button>
              <Desplegable abierto={abierto === 'orden'} onCerrar={cerrar} ancho="w-96" derecha>
                <PanelOrden vista={activa} columnas={columnas} onCambiar={o => onCambiar({ orden_por: o })} />
              </Desplegable>
            </div>
          )}
          {conAgrupar && (
            <div className="relative">
              <button onClick={() => setAbierto(abierto === 'agrupar' ? null : 'agrupar')} className={claseBoton(!!colAgr)} aria-expanded={abierto === 'agrupar'}>
                <Layers className="w-3.5 h-3.5" /> {activa.forma === 'tablero' ? 'Columnas' : 'Agrupar'}{colAgr && `: ${colAgr.nombre}`}
              </button>
              <Desplegable abierto={abierto === 'agrupar'} onCerrar={cerrar} ancho="w-80" derecha>
                <PanelAgrupar vista={activa} columnas={columnas} onCambiar={onCambiar} gruposConocidos={gruposConocidos} />
              </Desplegable>
            </div>
          )}
          {conPropiedades && (
            <div className="relative">
              <button onClick={() => setAbierto(abierto === 'props' ? null : 'props')} className={claseBoton(false)} aria-expanded={abierto === 'props'}>
                <Eye className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Propiedades</span>
              </button>
              <Desplegable abierto={abierto === 'props'} onCerrar={cerrar} ancho="w-64" derecha>
                <PanelPropiedades vista={activa} columnas={columnas} columnaTitulo={columnaTitulo} onCambiar={onCambiar} />
              </Desplegable>
            </div>
          )}
          {ajustes && (
            <div className="relative">
              <button onClick={() => setAbierto(abierto === 'ajustes' ? null : 'ajustes')} className={claseBoton(false)} aria-expanded={abierto === 'ajustes'} title="Ajustes de esta vista">
                <Settings2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Ajustes</span>
              </button>
              <Desplegable abierto={abierto === 'ajustes'} onCerrar={cerrar} ancho="w-80" derecha>{ajustes}</Desplegable>
            </div>
          )}
          {extra}
        </div>
      )}
      {editable && !conMandos && (ajustes || extra) && (
        <div className={cn('flex items-center gap-0.5', !centrada && 'ml-auto')}>
          {ajustes && (
            <div className="relative">
              <button onClick={() => setAbierto(abierto === 'ajustes' ? null : 'ajustes')} className={claseBoton(false)} title="Ajustes de esta vista">
                <MoreHorizontal className="w-3.5 h-3.5" /> Ajustes
              </button>
              <Desplegable abierto={abierto === 'ajustes'} onCerrar={cerrar} ancho="w-96" derecha>{ajustes}</Desplegable>
            </div>
          )}
          {extra}
        </div>
      )}
    </div>
  );
}
