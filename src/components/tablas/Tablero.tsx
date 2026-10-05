import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, EyeOff, Eye, Plus, MoreHorizontal, Columns3, ArrowRightLeft } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Columna } from './Celda';
import { Desplegable } from './BarraVista';
import { ValorCompacto, NuevoElemento, MarcaRecurrente } from './Tarjetas';
import {
  agruparFilas, agrupableTablero, valorAlMover, tituloDe, propiedadesTarjeta, APUNTAN,
  type Fila, type Grupo, type Vista,
} from './vistaUtil';

// ============================================================================
// TABLAS · EL TABLERO (KANBAN) (2026-10-05, carril «bd»)
// ============================================================================
// Una columna por cada opción de una propiedad de selección, de persona o de
// casilla. Arrastrar una tarjeta a otra columna CAMBIA ESE VALOR en la fila —
// no hay un «estado del tablero» aparte que pudiera contradecir a la tabla—, y
// arrastrarla entre otras dos la coloca ahí (el orden a mano de la tabla, el
// mismo que se ve en la vista de tabla sin ordenar).
//
// Con «Filas» (los subgrupos) el tablero se parte en carriles: una fila de
// columnas por cada valor de la segunda propiedad, como los «swimlanes».
//
// SI LA VISTA TIENE UN ORDEN PUESTO, COLOCAR A MANO NO TIENE SENTIDO: la
// tarjeta volvería a su sitio al recargar. Se sigue pudiendo cambiar de
// columna, y se dice por qué no se queda donde se suelta.
//
// En un teléfono arrastrar con el dedo por una lista que también se desplaza
// es mala idea; cada tarjeta lleva un «Mover a…» que hace lo mismo.

type Arrastre = { fila: Fila; desde: Grupo; carril: Grupo | null };

export default function Tablero({
  columnas, filas, vista, columnaTitulo, editable, onGuardar, onMover, onCrear, onAbrir, onCambiarVista, onCrearEstado, onAnadirOpcion,
}: {
  columnas: Columna[];
  filas: Fila[];
  vista: Vista;
  columnaTitulo: string | null;
  editable: boolean;
  /** Escribe varias celdas de una fila a la vez. */
  onGuardar: (filaId: string, celdas: Record<string, any>) => Promise<{ error?: string } | void>;
  /** Coloca la fila delante de otra (o al final con `null`). */
  onMover: (filaId: string, antesDe: string | null) => Promise<void>;
  onCrear: (titulo: string, celdas: Record<string, any>) => Promise<void>;
  onAbrir: (f: Fila) => void;
  onCambiarVista: (c: Partial<Vista>) => void;
  /** Crea la propiedad «Estado» cuando la tabla no tiene ninguna por la que agrupar. */
  onCrearEstado: () => Promise<void>;
  onAnadirOpcion: (col: Columna, etiqueta: string) => Promise<void>;
}) {
  const cfg = vista.config;
  // Si la vista no dice por qué agrupar, la primera que sirva: un tablero sin
  // columnas no es un tablero.
  const col = columnas.find(c => c.id === vista.agrupar_por && agrupableTablero(c)) || columnas.find(agrupableTablero) || null;
  const sub = columnas.find(c => c.id === cfg.subagrupar_por && c.id !== col?.id) || null;
  const props = propiedadesTarjeta(columnas, cfg, columnaTitulo, col ? [col.id] : []);
  const ordenado = vista.orden_por.length > 0;

  // Copia local para que la tarjeta se quede donde se suelta MIENTRAS se
  // guarda; al recargar manda lo que diga el servidor.
  const [locales, setLocales] = useState(filas);
  useEffect(() => { setLocales(filas); }, [filas]);
  const [arrastre, setArrastre] = useState<Arrastre | null>(null);
  const [encima, setEncima] = useState<string | null>(null);
  const [plegados, setPlegados] = useState<Set<string>>(new Set());
  const [aviso, setAviso] = useState<string | null>(null);
  const [nuevaOpcion, setNuevaOpcion] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  const carriles = useMemo<Array<Grupo | null>>(() => sub ? agruparFilas(locales, sub, cfg) : [null], [locales, sub, cfg]);
  const ocultos = new Set(cfg.grupos_ocultos || []);

  if (!col) {
    return (
      <div className="p-8 text-center">
        <Columns3 className="w-8 h-8 mx-auto text-slate-300" />
        <p className="mt-2 text-sm font-bold text-slate-600">El tablero necesita una propiedad de selección, de persona o una casilla.</p>
        <p className="text-xs text-slate-400">Cada opción será una columna, y mover una tarjeta cambiará su valor.</p>
        {editable && (
          <button onClick={onCrearEstado} className="mt-3 inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-slate-900 text-white text-xs font-bold">
            <Plus className="w-4 h-4" /> Crear «Estado»: Por hacer · En curso · Hecho
          </button>
        )}
      </div>
    );
  }

  /** Lo que hay que escribir para que una fila caiga en (grupo, carril). */
  const celdasPara = (f: Fila | null, desde: Grupo | null, hacia: Grupo, carrilDesde: Grupo | null, carrilHacia: Grupo | null) => {
    const vacia: Fila = { id: '', celdas: {} };
    const out: Record<string, any> = {};
    if (!desde || desde.clave !== hacia.clave) out[col.id] = valorAlMover(f || vacia, col, desde, hacia);
    if (sub && carrilHacia && (!carrilDesde || carrilDesde.clave !== carrilHacia.clave)) out[sub.id] = valorAlMover(f || vacia, sub, carrilDesde, carrilHacia);
    // Al crear en «Sin …» no se escribe nada: ya nace vacía.
    for (const k of Object.keys(out)) if (out[k] === null || (Array.isArray(out[k]) && !out[k].length)) { if (!f) delete out[k]; }
    return out;
  };

  /** Soltar: primero el valor (si cambia de columna), luego el sitio. */
  const soltar = async (hacia: Grupo, carril: Grupo | null, antesDe: string | null) => {
    const a = arrastre;
    setArrastre(null); setEncima(null);
    if (!a || !editable) return;
    if (antesDe === a.fila.id) return;
    const celdas = celdasPara(a.fila, a.desde, hacia, a.carril, carril);
    const cambia = Object.keys(celdas).length > 0;
    const coloca = !ordenado;
    if (!cambia && !coloca) return;

    // Lo optimista: la tarjeta salta ya a su sitio nuevo.
    setLocales(prev => {
      const resto = prev.filter(x => x.id !== a.fila.id);
      const movida: Fila = { ...a.fila, celdas: { ...a.fila.celdas }, apuntados: { ...(a.fila.apuntados || {}) } };
      for (const [k, v] of Object.entries(celdas)) {
        movida.celdas[k] = v === null || (Array.isArray(v) && !v.length) ? { estado: 'vacia' } : { estado: 'ok', valor: v };
        const c = columnas.find(x => x.id === k);
        if (c && APUNTAN.has(c.tipo)) {
          const ids: string[] = v === null ? [] : Array.isArray(v) ? v : [v];
          const g = k === col.id ? hacia : carril;
          const viejos = a.fila.apuntados?.[k] || [];
          movida.apuntados![k] = ids.map(id => viejos.find((x: any) => x.id === id) || { id, etiqueta: g?.etiqueta || '' });
        }
      }
      if (!coloca) return [...resto.slice(0, prev.indexOf(a.fila)), movida, ...resto.slice(prev.indexOf(a.fila))];
      const pos = antesDe ? resto.findIndex(x => x.id === antesDe) : -1;
      resto.splice(pos < 0 ? resto.length : pos, 0, movida);
      return resto;
    });

    if (cambia) {
      const r = await onGuardar(a.fila.id, celdas);
      if (r && r.error) { setAviso(r.error); setLocales(filas); return; }
    }
    if (coloca) await onMover(a.fila.id, antesDe);
    else if (antesDe !== null) setAviso('Esta vista está ordenada: la tarjeta cambia de columna, pero su sitio lo decide el orden. Quita el orden para colocarla a mano.');
  };

  /** «Mover a…» sin arrastrar: para el teléfono y el teclado. */
  const moverA = async (f: Fila, desde: Grupo, carril: Grupo | null, claveHacia: string, grupos: Grupo[]) => {
    const hacia = grupos.find(g => g.clave === claveHacia);
    if (!hacia || hacia.clave === desde.clave) return;
    const r = await onGuardar(f.id, celdasPara(f, desde, hacia, carril, carril));
    if (r && r.error) setAviso(r.error);
  };

  const columnaDe = (g: Grupo, carril: Grupo | null, grupos: Grupo[]) => {
    const idZona = `${carril?.clave ?? '*'}|${g.clave}`;
    const plegado = plegados.has(g.clave);
    const tono = g.color || null;
    if (plegado) {
      return (
        <button key={idZona} onClick={() => setPlegados(s => { const n = new Set(s); n.delete(g.clave); return n; })}
          className="shrink-0 w-10 rounded-xl bg-slate-50 border border-slate-200 py-3 flex flex-col items-center gap-2 hover:bg-slate-100" title={`Desplegar ${g.etiqueta}`}>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] font-bold text-slate-600 [writing-mode:vertical-rl]">{g.etiqueta} · {g.filas.length}</span>
        </button>
      );
    }
    return (
      <div key={idZona}
        onDragOver={e => { if (arrastre) { e.preventDefault(); setEncima(idZona); } }}
        onDragLeave={() => setEncima(z => (z === idZona ? null : z))}
        onDrop={e => { e.preventDefault(); soltar(g, carril, null); }}
        className={cn('shrink-0 w-[17rem] rounded-xl p-1.5 flex flex-col gap-1.5 transition-colors',
          encima === idZona ? 'bg-emerald-50 ring-2 ring-emerald-300' : 'bg-slate-50/80')}
        style={tono && encima !== idZona ? { backgroundColor: tono + '12' } : undefined}>
        <div className="flex items-center gap-1.5 px-1 h-8">
          <button onClick={() => setPlegados(s => new Set(s).add(g.clave))} title="Plegar la columna" aria-label="Plegar la columna"
            className="w-5 h-5 grid place-items-center rounded text-slate-300 hover:text-slate-700"><ChevronDown className="w-3.5 h-3.5" /></button>
          <span className={cn('px-1.5 py-0.5 rounded-md text-xs font-bold truncate', g.vacio && 'text-slate-400')}
            style={tono ? { backgroundColor: tono + '33', color: tono } : undefined}>{g.etiqueta}</span>
          <span className="text-[11px] font-bold text-slate-400">{g.filas.length}</span>
          {editable && (
            <div className="relative ml-auto">
              <button onClick={() => setMenu(menu === idZona ? null : idZona)} aria-label="Opciones de la columna"
                className="w-7 h-7 grid place-items-center rounded-md text-slate-300 hover:text-slate-700 hover:bg-white"><MoreHorizontal className="w-3.5 h-3.5" /></button>
              <Desplegable abierto={menu === idZona} onCerrar={() => setMenu(null)} ancho="w-48" derecha>
                <button onClick={() => { setMenu(null); onCambiarVista({ config: { ...cfg, grupos_ocultos: [...ocultos, g.clave] } }); }}
                  className="w-full flex items-center gap-2 px-2 h-9 rounded-md text-xs font-bold text-slate-600 hover:bg-slate-50">
                  <EyeOff className="w-3.5 h-3.5" /> Esconder la columna
                </button>
              </Desplegable>
            </div>
          )}
        </div>
        {g.filas.map(f => (
          <div key={f.id} draggable={editable}
            onDragStart={e => { setArrastre({ fila: f, desde: g, carril }); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', f.id); }}
            onDragEnd={() => { setArrastre(null); setEncima(null); }}
            onDragOver={e => { if (arrastre && arrastre.fila.id !== f.id) { e.preventDefault(); e.stopPropagation(); setEncima(`${idZona}>${f.id}`); } }}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); soltar(g, carril, f.id); }}
            className={cn('group/tarjeta relative rounded-lg bg-white border shadow-sm transition-all',
              editable && 'cursor-grab active:cursor-grabbing',
              arrastre?.fila.id === f.id ? 'opacity-40' : 'opacity-100',
              encima === `${idZona}>${f.id}` ? 'border-emerald-400 border-t-4' : 'border-slate-200 hover:border-slate-300')}>
            {cfg.portada && f.pagina?.imagen && (
              <img src={f.pagina.imagen} alt="" loading="lazy" className="w-full h-28 object-cover rounded-t-lg"
                style={f.pagina.encuadre ? { objectPosition: `${f.pagina.encuadre.x}% ${f.pagina.encuadre.y}%` } : undefined} />
            )}
            <div className="p-2 space-y-1">
              <button onClick={() => onAbrir(f)} className="w-full text-left text-[13px] font-bold text-slate-800 leading-snug hover:text-emerald-700 break-words">
                {f.pagina?.icono && !/^(https?:|\/)/.test(f.pagina.icono) && <span className="mr-1">{f.pagina.icono}</span>}
                {tituloDe(f, columnaTitulo)} <MarcaRecurrente fila={f} />
              </button>
              {props.map(p => <div key={p.id} className="flex min-w-0"><ValorCompacto fila={f} columna={p} /></div>)}
            </div>
            {editable && grupos.length > 1 && (
              <label className="absolute right-1 top-1 w-7 h-7 grid place-items-center rounded-md bg-white/90 text-slate-400 hover:text-slate-700 opacity-100 sm:opacity-0 group-hover/tarjeta:opacity-100 focus-within:opacity-100 cursor-pointer" title="Mover a otra columna">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <select value={g.clave} onChange={e => moverA(f, g, carril, e.target.value, grupos)} aria-label="Mover a otra columna"
                  className="absolute inset-0 opacity-0 cursor-pointer">
                  {grupos.map(x => <option key={x.clave || '·'} value={x.clave}>{x.etiqueta}</option>)}
                </select>
              </label>
            )}
          </div>
        ))}
        {editable && (
          <NuevoElemento onCrear={t => onCrear(t, celdasPara(null, null, g, null, carril))} />
        )}
      </div>
    );
  };

  return (
    <div className="p-2">
      {aviso && (
        <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
          <span className="flex-1">{aviso}</span>
          <button onClick={() => setAviso(null)} className="text-amber-500 hover:text-amber-800">Entendido</button>
        </div>
      )}
      {carriles.map(carril => {
        const grupos = agruparFilas(carril ? carril.filas : locales, col, cfg, { sinSiempre: true });
        const visibles = grupos.filter(g => !ocultos.has(g.clave));
        const escondidos = grupos.filter(g => ocultos.has(g.clave));
        const claveCarril = carril ? `c:${carril.clave}` : '';
        const carrilPlegado = carril && plegados.has(claveCarril);
        return (
          <div key={claveCarril || 'unico'} className={cn(carril && 'mb-3')}>
            {carril && (
              <button onClick={() => setPlegados(s => { const n = new Set(s); if (n.has(claveCarril)) n.delete(claveCarril); else n.add(claveCarril); return n; })}
                className="flex items-center gap-1.5 h-8 px-1 text-xs font-black text-slate-600">
                {carrilPlegado ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span className="px-1.5 py-0.5 rounded-md" style={carril.color ? { backgroundColor: carril.color + '33', color: carril.color } : undefined}>{carril.etiqueta}</span>
                <span className="font-bold text-slate-400">{carril.filas.length}</span>
              </button>
            )}
            {!carrilPlegado && (
              <div className="flex gap-2 overflow-x-auto pb-2 items-start">
                {visibles.map(g => columnaDe(g, carril, grupos))}
                {editable && (col.tipo === 'seleccion' || col.tipo === 'seleccion_multiple') && !carril?.vacio && (
                  nuevaOpcion !== null && nuevaOpcion === claveCarril ? (
                    <input autoFocus placeholder="Nombre de la columna…" maxLength={100} aria-label="Nombre de la columna nueva"
                      onKeyDown={async e => {
                        if (e.key === 'Escape') setNuevaOpcion(null);
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) { const v = e.currentTarget.value.trim(); setNuevaOpcion(null); await onAnadirOpcion(col, v); }
                      }}
                      onBlur={() => setNuevaOpcion(null)}
                      className="shrink-0 w-56 h-9 px-2 rounded-lg border border-emerald-300 text-xs font-bold outline-none" />
                  ) : (
                    <button onClick={() => setNuevaOpcion(claveCarril)}
                      className="shrink-0 inline-flex items-center gap-1 h-9 px-2 rounded-lg text-xs font-bold text-slate-400 hover:text-emerald-700 hover:bg-emerald-50">
                      <Plus className="w-3.5 h-3.5" /> Columna
                    </button>
                  )
                )}
                {!!escondidos.length && (
                  <div className="shrink-0 w-44 rounded-xl border border-dashed border-slate-200 p-1.5">
                    <p className="px-1 pb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">Escondidas</p>
                    {escondidos.map(g => (
                      <button key={g.clave || '·'} disabled={!editable}
                        onClick={() => onCambiarVista({ config: { ...cfg, grupos_ocultos: [...ocultos].filter(k => k !== g.clave) } })}
                        title={editable ? 'Volver a enseñarla' : undefined}
                        className="w-full flex items-center gap-1.5 px-1.5 h-8 rounded-md text-xs font-bold text-slate-500 hover:bg-slate-50 text-left">
                        <Eye className="w-3.5 h-3.5 text-slate-300" /><span className="flex-1 truncate">{g.etiqueta}</span><span className="text-slate-300">{g.filas.length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
