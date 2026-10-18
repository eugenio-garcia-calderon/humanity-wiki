import { useCallback, useEffect, useState } from 'react';
import {
  Link2, ArrowUpRight, GripVertical, Pencil, Settings2, MessageSquare, Eye, EyeOff, Copy, Trash2, LayoutTemplate,
  ChevronRight, ChevronDown, Check, X,
} from 'lucide-react';
import CeldaTabla, { type Columna } from './Celda';
import EditorColumna from './EditorColumna';
import EntityComments from '../knowledge/EntityComments';
import { Desplegable } from './BarraVista';
import { abrirVentana } from '../ventanas/bus';
import { cn } from '../../utils/cn';

// ============================================================================
// LAS PROPIEDADES DE UN ELEMENTO, EN SU PÁGINA (2026-10-01; menú y orden 2026-10-06)
// ============================================================================
// Como en Notion: al abrir la página de un elemento de una base de datos se
// ven, arriba, sus columnas —fecha, estado, «Área»…— y se editan ahí mismo.
// Son las MISMAS celdas y la misma ruta de guardado que la rejilla: una
// propiedad editada aquí es la tabla editada.
//
// (2026-10-06, Eugenio) Al pulsar el NOMBRE de una propiedad se abre su menú,
// el de Notion: renombrar, editar, comentar, visibilidad, duplicar, eliminar
// y personalizar el diseño. Las propiedades se ARRASTRAN para ordenarlas, y
// ese orden es el de la tabla —lo ven todas las filas—, no el de esta página.
// Una relación lleva ↗ junto al nombre: lleva a la base de datos enlazada.
//
// LA VISIBILIDAD ES DE LA PROPIEDAD, NO DE LA FILA (`config.visibilidad`):
//   siempre    se ve aunque esté vacía (lo de siempre)
//   si_tiene   solo si esta fila tiene algo
//   nunca      no se ve en la página (sigue en la tabla y en los filtros)
// Quien edita ve las escondidas bajo «N propiedades más», para poder
// rellenarlas; quien lee, no.

type Visibilidad = 'siempre' | 'si_tiene' | 'nunca';
// (2026-10-18, Eugenio) «Que aparezcan de forma más estética… ordenadas de
// izquierda a derecha, con varias columnas según sea escritorio o móvil.» El
// diseño por defecto es ahora una REJILLA: cada propiedad es una casilla con
// su nombre encima y el valor debajo, y caben tantas por fila como permita el
// ancho (una en el móvil, tres o cuatro en un escritorio ancho). Lo enlazado
// sale con la imagen de su página. «dos_columnas», el diseño de antes, se lee
// como la rejilla; «lista» sigue siendo una columna con el nombre a la izquierda.
type Diseno = { estilo?: 'lista' | 'dos_columnas' | 'columnas'; plegar_vacias?: boolean };

const VISIBILIDADES: Array<{ id: Visibilidad; label: string; desc: string }> = [
  { id: 'siempre', label: 'Siempre visible', desc: 'Aunque esté vacía' },
  { id: 'si_tiene', label: 'Ocultar si está vacía', desc: 'Solo cuando la fila tiene algo' },
  { id: 'nunca', label: 'Ocultar siempre', desc: 'Sigue en la tabla y en los filtros' },
];

const vacia = (fila: any, c: Columna) => {
  const celda = fila.celdas?.[c.id];
  return !celda || celda.estado === 'vacia' || (celda.estado === 'ok' && Array.isArray(celda.valor) && !celda.valor.length);
};

export default function PropiedadesFila({ tablaId, filaId, editable }: {
  tablaId: string; filaId: string; editable: boolean;
}) {
  const [datos, setDatos] = useState<{ columnas: Columna[]; fila: any; titulo: string | null; diseno: Diseno } | null>(null);
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Columna | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [submenu, setSubmenu] = useState(false);
  const [renombrando, setRenombrando] = useState<string | null>(null);
  const [comentando, setComentando] = useState<string | null>(null);
  const [disenando, setDisenando] = useState(false);
  const [verOcultas, setVerOcultas] = useState(false);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [encima, setEncima] = useState<string | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const r = await fetch(`/api/bd/tablas/${tablaId}`, { credentials: 'include' });
    if (!r.ok) return;
    const j = await r.json();
    const fila = (j.filas || []).find((f: any) => f.id === filaId);
    if (fila) setDatos({ columnas: j.columnas || [], fila, titulo: j.columna_titulo ?? null, diseno: j.tabla?.config?.diseno || {} });
  }, [tablaId, filaId]);

  useEffect(() => { cargar(); }, [cargar]);

  if (!datos) return null;
  // La columna del nombre ya es el título de la página: repetirla aquí sería
  // tener el mismo dato en dos sitios de la misma pantalla.
  const columnas = datos.columnas.filter(c => c.id !== datos.titulo);
  if (!columnas.length && !editable) return null;
  const diseno = datos.diseno;
  const enRejilla = diseno.estilo !== 'lista';

  const visibilidad = (c: Columna): Visibilidad => (c.config?.visibilidad as Visibilidad) || 'siempre';
  const seVe = (c: Columna) => {
    const v = visibilidad(c);
    if (v === 'nunca') return false;
    if (v === 'si_tiene' || diseno.plegar_vacias) return !vacia(datos.fila, c);
    return true;
  };
  const visibles = columnas.filter(seVe);
  const ocultas = columnas.filter(c => !seVe(c));

  const guardar = async (columnaId: string, valor: any) => {
    const r = await fetch(`/api/bd/filas/${filaId}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ celdas: { [columnaId]: valor } }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const suyo = (j.fallos || []).find((f: any) => f.columna === columnaId);
      return { error: suyo?.error || j.error || 'No se pudo guardar.' };
    }
    await cargar();
  };

  /** Cambia la columna (nombre o configuración) y recarga. */
  const cambiarColumna = async (c: Columna, cuerpo: any) => {
    setFallo(null);
    const r = await fetch(`/api/bd/columnas/${c.id}`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setFallo(j.error || 'No se pudo cambiar la propiedad.');
    await cargar();
  };
  const duplicar = async (c: Columna) => {
    const r = await fetch(`/api/bd/columnas/${c.id}/duplicar`, { method: 'POST', credentials: 'include' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setFallo(j.error || 'No se pudo duplicar.');
    await cargar();
  };
  const eliminar = async (c: Columna) => {
    if (!window.confirm(`¿Eliminar la propiedad «${c.nombre}» de toda la base de datos? Se puede recuperar: sus valores se guardan.`)) return;
    const r = await fetch(`/api/bd/columnas/${c.id}`, { method: 'DELETE', credentials: 'include' });
    if (!r.ok) { const j = await r.json().catch(() => ({})); setFallo(j.error || 'No se pudo eliminar.'); }
    await cargar();
  };
  const guardarDiseno = async (d: Diseno) => {
    setDatos(x => x ? { ...x, diseno: d } : x);
    await fetch(`/api/bd/tablas/${tablaId}`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { diseno: d } }),
    });
  };
  /** ↗: la página donde vive la base de datos enlazada; si no está en
   *  ninguna, la herramienta «Tablas» abierta en ella. */
  // La base de datos enlazada se abre en una ventana del Escritorio, encima de
  // esta entrada: la flecha no te saca de la página en la que estás.
  const irABase = async (destino: string) => {
    const r = await fetch(`/api/bd/tablas/${destino}/hogar`, { credentials: 'include' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setFallo(j.error || 'No puedes abrir esa base de datos.'); return; }
    abrirVentana({ titulo: j.titulo || 'Base de datos', clase: 'app', destino: `/tablas?tabla=${destino}` });
  };

  /** Soltar una propiedad delante de otra: el orden nuevo de TODA la tabla. */
  const soltar = async (antesDe: string) => {
    const movida = arrastrando;
    setArrastrando(null); setEncima(null);
    if (!movida || movida === antesDe) return;
    const ids = datos.columnas.map(c => c.id).filter(id => id !== movida);
    ids.splice(Math.max(0, ids.indexOf(antesDe)), 0, movida);
    setDatos(x => x ? { ...x, columnas: ids.map(id => x.columnas.find(c => c.id === id)!).filter(Boolean) } : x);
    const r = await fetch(`/api/bd/tablas/${tablaId}/orden-columnas`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }),
    });
    if (!r.ok) { setFallo('No se pudo guardar el orden.'); await cargar(); }
  };

  const opcionMenu = (icono: any, texto: string, accion: () => void, peligro = false, extra?: any) => {
    const Icono = icono;
    return (
      <button onClick={accion} className={cn('w-full flex items-center gap-2 px-2 h-9 rounded-md text-xs font-bold text-left',
        peligro ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-600 hover:bg-slate-50')}>
        <Icono className="w-3.5 h-3.5 shrink-0" /> <span className="flex-1">{texto}</span>{extra}
      </button>
    );
  };

  const fila = (c: Columna) => {
    const destino = c.tipo === 'relacion' ? c.config?.tabla_destino as string | undefined : undefined;
    const v = visibilidad(c);
    return (
      <div key={c.id}
        onDragOver={e => { if (arrastrando && arrastrando !== c.id) { e.preventDefault(); setEncima(c.id); } }}
        onDragLeave={() => setEncima(x => (x === c.id ? null : x))}
        onDrop={e => { e.preventDefault(); soltar(c.id); }}
        className={cn('group/prop relative min-w-0',
          enRejilla && 'rounded-xl px-3 pt-2.5 pb-1 bg-slate-50/70 hover:bg-slate-100/60 transition-colors',
          encima === c.id && (enRejilla ? 'ring-2 ring-emerald-400' : 'border-t-2 border-t-emerald-400'), arrastrando === c.id && 'opacity-40')}>
        <div className={cn(enRejilla ? 'flex flex-col' : 'flex items-start gap-1 py-0.5')}>
          {editable && (
            <span draggable onDragStart={e => { setArrastrando(c.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', c.id); }}
              onDragEnd={() => { setArrastrando(null); setEncima(null); }}
              title="Arrastra para ordenar (el orden es el de toda la tabla)" aria-label={`Mover ${c.nombre}`}
              className={cn('shrink-0 w-4 h-5 grid place-items-center text-slate-300 cursor-grab opacity-0 group-hover/prop:opacity-100 active:cursor-grabbing',
                enRejilla ? 'absolute right-1.5 top-2' : 'mt-2 -ml-5')}>
              <GripVertical className="w-3.5 h-3.5" />
            </span>
          )}
          <div className={cn('relative shrink-0 flex items-center gap-0.5 min-w-0', enRejilla ? 'justify-center px-5 -mb-0.5' : 'w-32 sm:w-40')}>
            {renombrando === c.id ? (
              <input autoFocus defaultValue={c.nombre} maxLength={120} aria-label="Nombre de la propiedad"
                onBlur={e => { setRenombrando(null); const n = e.target.value.trim(); if (n && n !== c.nombre) cambiarColumna(c, { nombre: n }); }}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setRenombrando(null); }}
                className="mt-1 w-full h-7 px-1.5 rounded border border-emerald-300 text-xs font-bold outline-none" />
            ) : editable ? (
              <button onClick={() => { setMenu(menu === c.id ? null : c.id); setSubmenu(false); }} aria-expanded={menu === c.id}
                className={cn('rounded font-bold text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 truncate text-left inline-flex items-center gap-1 min-w-0',
                  enRejilla ? 'h-6 px-1 -ml-1 text-[11px] uppercase tracking-wide' : 'mt-1 h-7 px-1.5 -ml-1.5 text-xs')}>
                {v !== 'siempre' && <EyeOff className="w-3 h-3 shrink-0 text-slate-300" />}
                <span className="truncate">{c.nombre}</span>
              </button>
            ) : (
              <span className={cn('font-bold text-slate-400 truncate', enRejilla ? 'h-6 leading-6 text-[11px] uppercase tracking-wide' : 'pt-2 text-xs')}>{c.nombre}</span>
            )}
            {destino && (
              <button onClick={() => irABase(destino)} title="Ir a la base de datos enlazada" aria-label={`Ir a la base de datos de ${c.nombre}`}
                className={cn('shrink-0 w-6 grid place-items-center rounded text-slate-300 hover:text-emerald-700 hover:bg-emerald-50', enRejilla ? 'h-6' : 'mt-1 h-7')}>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            <Desplegable abierto={menu === c.id} onCerrar={() => { setMenu(null); setSubmenu(false); }} ancho="w-64">
              {opcionMenu(Pencil, 'Renombrar', () => { setMenu(null); setRenombrando(c.id); })}
              {opcionMenu(Settings2, 'Editar propiedad', () => { setMenu(null); setEditando(c); })}
              {opcionMenu(MessageSquare, 'Comentar', () => { setMenu(null); setComentando(comentando === c.id ? null : c.id); })}
              {opcionMenu(Eye, 'Visibilidad de la propiedad', () => setSubmenu(s => !s), false,
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">{VISIBILIDADES.find(x => x.id === v)?.label}{submenu ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}</span>)}
              {submenu && (
                <div className="ml-5 mb-1 border-l border-slate-100 pl-1">
                  {VISIBILIDADES.map(x => (
                    <button key={x.id} onClick={() => { setMenu(null); setSubmenu(false); cambiarColumna(c, { config: { ...(c.config || {}), visibilidad: x.id } }); }}
                      className="w-full flex items-start gap-2 px-2 py-1.5 rounded-md text-left hover:bg-slate-50">
                      <span className="w-3.5 mt-0.5 shrink-0 text-emerald-600">{v === x.id && <Check className="w-3.5 h-3.5" />}</span>
                      <span><span className="block text-xs font-bold text-slate-700">{x.label}</span><span className="block text-[11px] text-slate-400">{x.desc}</span></span>
                    </button>
                  ))}
                </div>
              )}
              {opcionMenu(Copy, 'Duplicar propiedad', () => { setMenu(null); duplicar(c); })}
              {opcionMenu(Trash2, 'Eliminar propiedad', () => { setMenu(null); eliminar(c); }, true)}
              <div className="my-1 border-t border-slate-100" />
              {opcionMenu(LayoutTemplate, 'Personalizar diseño', () => { setMenu(null); setDisenando(true); })}
            </Desplegable>
          </div>
          {/* EN EL CENTRO (2026-10-18, Eugenio): en la rejilla, el nombre de la
              propiedad y su valor van centrados, uno encima del otro —también
              los números, que en la tabla van a la derecha—. */}
          <div className={cn('flex-1 min-w-0', enRejilla && '-mx-2 text-center [&_.text-right]:text-center [&_.flex-wrap]:justify-center')}>
            <CeldaTabla enFicha celda={datos.fila.celdas[c.id] ?? { estado: 'vacia' }} columna={c}
              apuntados={datos.fila.apuntados?.[c.id]} archivos={datos.fila.archivos?.[c.id]}
              editable={editable} onGuardar={val => guardar(c.id, val)} />
          </div>
        </div>
        {comentando === c.id && (
          <div className={cn('mb-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2', enRejilla ? 'mt-1 bg-white' : 'sm:ml-40')}>
            <div className="flex items-center justify-between pb-1">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Comentarios sobre «{c.nombre}»</p>
              <button onClick={() => setComentando(null)} aria-label="Cerrar comentarios" className="w-6 h-6 grid place-items-center text-slate-300 hover:text-slate-700"><X className="w-3.5 h-3.5" /></button>
            </div>
            <EntityComments entityType="bd_propiedad" entityId={`${filaId}:${c.id}`} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('mb-6', enRejilla ? 'py-3' : 'border-y border-slate-100 pl-5 -ml-5')}>
      <div className={cn(enRejilla ? 'grid items-start gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr))]' : 'divide-y divide-slate-100')}>
        {visibles.map(fila)}
      </div>
      {/* Las escondidas: solo para quien edita, para poder rellenarlas. */}
      {editable && !!ocultas.length && (
        <>
          <button onClick={() => setVerOcultas(v => !v)} className="inline-flex items-center gap-1 h-9 px-1 text-xs font-bold text-slate-400 hover:text-slate-700">
            {verOcultas ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            {verOcultas ? 'Esconder' : `${ocultas.length} ${ocultas.length === 1 ? 'propiedad más' : 'propiedades más'}`}
          </button>
          {verOcultas && (
            <div className={cn('opacity-80', enRejilla ? 'grid items-start gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr))]' : 'divide-y divide-slate-100')}>
              {ocultas.map(fila)}
            </div>
          )}
        </>
      )}
      {fallo && <p className="py-1 text-[11px] font-bold text-rose-600">{fallo}</p>}
      {/* ENLAZAR DESDE LA PÁGINA DEL ELEMENTO (2026-10-02): el mismo botón
          que en la galería, para no tener que volver a la tabla. */}
      {editable && (
        <button onClick={() => setCreando(true)}
          className="inline-flex items-center gap-1 h-9 px-1 text-xs font-bold text-slate-400 hover:text-emerald-700">
          <Link2 className="w-3.5 h-3.5" /> Enlazar con otra base de datos
        </button>
      )}
      {creando && (
        <EditorColumna tablaId={tablaId} columnas={datos.columnas} tipoInicial="relacion"
          onCerrar={() => setCreando(false)} onHecho={cargar} />
      )}
      {editando && (
        <EditorColumna tablaId={tablaId} columna={editando} columnas={datos.columnas}
          onCerrar={() => setEditando(null)} onHecho={cargar} />
      )}
      {disenando && (
        <div className="fixed inset-0 z-[70] bg-slate-900/30 grid place-items-center p-4" onClick={() => setDisenando(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-4 space-y-3" onClick={e => e.stopPropagation()} role="dialog" aria-label="Personalizar diseño">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-slate-800">Personalizar diseño</p>
              <button onClick={() => setDisenando(false)} aria-label="Cerrar" className="w-8 h-8 grid place-items-center text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-slate-500">Vale para la página de todas las filas de esta base de datos.</p>
            <div className="grid grid-cols-2 gap-2">
              {([['columnas', 'Rejilla', true], ['lista', 'Una columna', false]] as const).map(([id, label, rejilla]) => (
                <button key={id} onClick={() => guardarDiseno({ ...diseno, estilo: id })}
                  className={cn('h-11 rounded-lg border text-xs font-bold', enRejilla === rejilla ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                  {label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
              <input type="checkbox" checked={!!diseno.plegar_vacias} onChange={e => guardarDiseno({ ...diseno, plegar_vacias: e.target.checked })} />
              Plegar las propiedades vacías bajo «N propiedades más»
            </label>
            <div className="border-t border-slate-100 pt-2">
              <p className="pb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">Cada propiedad</p>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {columnas.map(c => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="flex-1 truncate text-xs font-bold text-slate-700">{c.nombre}</span>
                    <select value={visibilidad(c)} onChange={e => cambiarColumna(c, { config: { ...(c.config || {}), visibilidad: e.target.value } })}
                      aria-label={`Visibilidad de ${c.nombre}`} className="h-8 rounded-md border border-slate-200 bg-white px-1.5 text-xs font-bold text-slate-600">
                      {VISIBILIDADES.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
