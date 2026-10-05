import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Columna } from './Celda';
import { ValorCompacto, NuevoElemento, MarcaRecurrente } from './Tarjetas';
import { agruparFilas, tituloDe, propiedadesTarjeta, valorAlMover, type Fila, type Grupo, type Vista } from './vistaUtil';

// ============================================================================
// TABLAS · LA LISTA (2026-10-05, carril «bd»)
// ============================================================================
// Una línea por elemento: su nombre a la izquierda y unas pocas propiedades a
// la derecha, como la vista Lista de Notion. Es la forma más tranquila de leer
// una base de datos que son sobre todo páginas (notas, artículos, actas), y la
// que mejor cabe en un teléfono. Respeta los grupos y subgrupos de la vista.

export default function Lista({ columnas, filas, vista, columnaTitulo, editable, onAbrir, onCrear }: {
  columnas: Columna[];
  filas: Fila[];
  vista: Vista;
  columnaTitulo: string | null;
  editable: boolean;
  onAbrir: (f: Fila) => void;
  onCrear: (titulo: string, celdas: Record<string, any>) => Promise<void>;
}) {
  const cfg = vista.config;
  const props = propiedadesTarjeta(columnas, cfg, columnaTitulo);
  const col = columnas.find(c => c.id === vista.agrupar_por) || null;
  const sub = columnas.find(c => c.id === cfg.subagrupar_por && c.id !== col?.id) || null;
  const ocultos = new Set(cfg.grupos_ocultos || []);
  const [plegados, setPlegados] = useState<Set<string>>(new Set());
  const alternar = (k: string) => setPlegados(s => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const lineas = (fs: Fila[]) => fs.map(f => (
    <button key={f.id} onClick={() => onAbrir(f)}
      className="w-full flex items-center gap-3 px-3 min-h-11 py-1.5 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0">
      <span className="shrink-0 w-5 text-center">
        {f.pagina?.icono && !/^(https?:|\/)/.test(f.pagina.icono) ? f.pagina.icono : <FileText className="w-4 h-4 text-slate-300 inline" />}
      </span>
      <span className="flex-1 min-w-0 text-sm font-bold text-slate-800 truncate">{tituloDe(f, columnaTitulo)} <MarcaRecurrente fila={f} /></span>
      <span className="hidden sm:flex items-center gap-2 min-w-0 max-w-[60%] justify-end overflow-hidden">
        {props.map(p => <ValorCompacto key={p.id} fila={f} columna={p} />)}
      </span>
    </button>
  ));

  const celdasDe = (g: Grupo | null, s: Grupo | null) => {
    const out: Record<string, any> = {};
    const vacia: Fila = { id: '', celdas: {} };
    if (col && g && !g.vacio) out[col.id] = valorAlMover(vacia, col, null, g);
    if (sub && s && !s.vacio) out[sub.id] = valorAlMover(vacia, sub, null, s);
    return out;
  };

  const seccion = (g: Grupo, nivel: number, padre: Grupo | null, hijos: ReactNode) => {
    const k = `${padre?.clave ?? ''}>${g.clave}:${nivel}`;
    const plegado = plegados.has(k);
    return (
      <div key={k} className={cn(nivel === 1 && 'ml-4')}>
        <button onClick={() => alternar(k)} className="flex items-center gap-1.5 h-9 px-2 text-xs font-black text-slate-600">
          {plegado ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span className="px-1.5 py-0.5 rounded-md" style={g.color ? { backgroundColor: g.color + '33', color: g.color } : undefined}>{g.etiqueta}</span>
          <span className="font-bold text-slate-400">{g.filas.length}</span>
        </button>
        {!plegado && hijos}
      </div>
    );
  };

  if (!col) {
    return (
      <div>
        {lineas(filas)}
        {!filas.length && <p className="p-6 text-center text-sm text-slate-400">No hay nada que enseñar con estos filtros.</p>}
        {editable && <NuevoElemento onCrear={t => onCrear(t, {})} className="rounded-none" />}
      </div>
    );
  }

  return (
    <div className="p-1">
      {agruparFilas(filas, col, cfg).filter(g => !ocultos.has(g.clave)).map(g => seccion(g, 0, null,
        sub ? agruparFilas(g.filas, sub, { ...cfg, ocultar_vacios: true }).map(s => seccion(s, 1, g, (
          <div className="rounded-lg border border-slate-100 bg-white">
            {lineas(s.filas)}
            {editable && <NuevoElemento onCrear={t => onCrear(t, celdasDe(g, s))} />}
          </div>
        ))) : (
          <div className="rounded-lg border border-slate-100 bg-white">
            {lineas(g.filas)}
            {editable && <NuevoElemento onCrear={t => onCrear(t, celdasDe(g, null))} />}
          </div>
        )))}
    </div>
  );
}
