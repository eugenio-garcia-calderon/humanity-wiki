import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, AlertTriangle, Loader2, Table2, Settings2, LayoutGrid, ArrowUpRight, SlidersHorizontal, Check, Link2, Pencil, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Galeria from './Galeria';
import type { TamanoGaleria } from '../../utils/bloques';
import { useSitio } from '../sitio/ContextoSitio';
import ConexionesBD, { type Conexion } from './ConexionesBD';
import EditorColumna from './EditorColumna';
import CeldaTabla, { type Celda, type Columna } from './Celda';
import { useEsMovil } from '../../hooks/useEsMovil';
import { cn } from '../../utils/cn';
import { tonoDe } from '../../utils/coloresBloque';

// ============================================================================
// TABLAS · LA REJILLA
// ============================================================================
// Ver, escribir, añadir y quitar. Se usa igual dentro de la herramienta
// «Tablas» que incrustada en una página, porque es el mismo componente: una
// tabla metida en un documento no es otra cosa, es la misma mirada desde otro
// sitio.
//
// ── EN MÓVIL NO ES UNA REJILLA, SON FICHAS ──────────────────────────────────
// Una tabla de diez columnas en 390 px no es una tabla: son diez columnas de
// 39 px. Por debajo del punto de ruptura, cada fila se pinta como una ficha con
// sus campos en vertical. Es la misma decisión que con el escritorio de
// ventanas: en un teléfono no se traduce, se sustituye.

type Fila = {
  id: string;
  pagina_id?: string | null;
  pagina?: { titulo: string; imagen: string | null; icono: string | null; resumen: string; descripcion?: string | null; encuadre?: { x: number; y: number } | null } | null;
  celdas: Record<string, Celda>;
  apuntados?: Record<string, any[]>;
  archivos?: Record<string, any[]>;
};

export type FormaVista = 'galeria' | 'tabla';

/** La letra del título en galería, según el tamaño elegido. */
const LETRA_TITULO: Record<TamanoGaleria, string> = {
  pequeno: 'text-base', mediano: 'text-lg', grande: 'text-2xl tracking-tight', 'muy-grande': 'text-3xl sm:text-4xl tracking-tight',
};

export default function Rejilla({ tablaId, editable = true, alto, vista: vistaInicial, onCambiarVista, color, tamano = 'mediano', onCambiarTamano, tamanoTitulo = 'mediano', onCambiarTamanoTitulo, visibles, onCambiarVisibles, tablasPagina, tituloOculto = false, onCambiarTituloOculto }: {
  tablaId: string;
  editable?: boolean;
  /** Alto máximo cuando va incrustada en una página. Suelta ocupa lo que haya. */
  alto?: number;
  /** Galería o tabla (2026-09-30). Sin valor, tabla: es lo que se veía hasta
   *  hoy en la herramienta «Tablas». El bloque de página pasa `galeria`. */
  vista?: FormaVista;
  /** Quien la incrusta guarda la elección; si no se pasa, cambiar de vista
   *  vale solo para quien mira y no se recuerda. */
  onCambiarVista?: (v: FormaVista) => void;
  /** El color elegido en el menú del bloque. Ver `tonoDe`. */
  color?: string;
  /** Tamaño de las tarjetas de la galería, y quién lo guarda (el editor). */
  tamano?: TamanoGaleria;
  onCambiarTamano?: (t: TamanoGaleria) => void;
  /** El tamaño del título (2026-10-02, Eugenio: «permite cambiar el tamaño
   *  del título de la base de datos»). Sólo en galería, que es donde el
   *  título hace de encabezado. */
  tamanoTitulo?: TamanoGaleria;
  onCambiarTamanoTitulo?: (t: TamanoGaleria) => void;
  /** Las demás bases de datos de la misma página, para enlazar con ellas
   *  primero (2026-10-02). */
  tablasPagina?: string[];
  /** Ocultar el título al público (2026-10-02, Eugenio). Quien edita lo sigue
   *  viendo, atenuado y con el aviso. */
  tituloOculto?: boolean;
  onCambiarTituloOculto?: (v: boolean) => void;
  /** Qué propiedades se ven en las tarjetas, y quién lo guarda. */
  visibles?: string[];
  onCambiarVisibles?: (ids: string[]) => void;
}) {
  const [menuProps, setMenuProps] = useState(false);
  const tono = tonoDe(color);
  const esMovil = useEsMovil();
  const navigate = useNavigate();
  const sitio = useSitio();
  const [vista, setVista] = useState<FormaVista>(vistaInicial || 'tabla');
  useEffect(() => { if (vistaInicial) setVista(vistaInicial); }, [vistaInicial]);
  const cambiarVista = (v: FormaVista) => { setVista(v); onCambiarVista?.(v); };
  const [datos, setDatos] = useState<{
    tabla: any; columnas: Columna[]; filas: Fila[]; ciclo?: string[]; total?: number; mostradas?: number;
    columna_titulo?: string | null;
    conexiones?: Conexion[];
  } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<string | null>(null);
  /** `'nueva'` para crear, o la columna que se está editando. */
  const [editorColumna, setEditorColumna] = useState<'nueva' | 'nueva-relacion' | any | null>(null);

  const cargar = useCallback(async () => {
    setFallo(null);
    try {
      const r = await fetch(`/api/bd/tablas/${tablaId}`, { credentials: 'include' });
      const j = await r.json();
      if (!r.ok) { setFallo(j.error || 'No se pudo cargar la tabla.'); setDatos(null); }
      else setDatos(j);
    } catch (e: any) { setFallo(e.message); }
    setCargando(false);
  }, [tablaId]);

  useEffect(() => { cargar(); }, [cargar]);
  // LAS DOS CARAS A LA VEZ (2026-10-05): enlazar algo aquí cambia lo que
  // enseña la otra base de datos. Si está en la misma página, se recarga sola.
  const avisarCambio = () => window.dispatchEvent(new CustomEvent('bd:cambio', { detail: { desde: tablaId } }));
  useEffect(() => {
    const oir = (e: Event) => { if ((e as CustomEvent).detail?.desde !== tablaId) cargar(); };
    window.addEventListener('bd:cambio', oir);
    return () => window.removeEventListener('bd:cambio', oir);
  }, [cargar, tablaId]);

  /**
   * Guarda una celda.
   *
   * SE VUELVE A CARGAR LA TABLA ENTERA después de escribir, y no solo la celda.
   * Es a propósito: al cambiar un precio cambian también su fórmula, el agregado
   * del proveedor y el veredicto que depende de él, y ninguno de los tres está
   * en esta fila. Actualizar solo lo tocado dejaría los cálculos enseñando el
   * valor de antes — que es exactamente el fallo que estas fases existen para
   * no tener.
   */
  const guardar = async (filaId: string, columnaId: string, valor: any) => {
    const r = await fetch(`/api/bd/filas/${filaId}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ celdas: { [columnaId]: valor } }),
    });
    const j = await r.json();
    if (!r.ok) {
      // El servidor dice QUÉ celda y POR QUÉ. Se devuelve el motivo concreto
      // para que la celda lo enseñe, en vez de un «no se pudo guardar».
      const suyo = (j.fallos || []).find((f: any) => f.columna === columnaId);
      return { error: suyo?.error || j.error || 'No se pudo guardar.' };
    }
    await cargar();
    if (columnas.find(c => c.id === columnaId)?.tipo === 'relacion') avisarCambio();
  };

  const anadirFila = async () => {
    await fetch(`/api/bd/tablas/${tablaId}/filas`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    cargar();
  };

  /** El nombre mientras se edita; `null` cuando no se está editando. */
  const [nombre, setNombre] = useState<string | null>(null);
  const [falloNombre, setFalloNombre] = useState<string | null>(null);
  const guardarNombre = async () => {
    if (nombre === null || !datos) return;
    const limpio = nombre.trim();
    if (!limpio || limpio === datos.tabla.titulo) { setNombre(null); setFalloNombre(null); return; }
    const r = await fetch(`/api/bd/tablas/${tablaId}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: limpio }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setFalloNombre(j.error || 'No se pudo cambiar el nombre.'); return; }
    setDatos(d => d ? { ...d, tabla: { ...d.tabla, titulo: j.titulo ?? limpio } } : d);
    setNombre(null); setFalloNombre(null);
  };

  /** Abrir la página de una fila desde la tabla — el «ABRIR» de Notion. */
  const abrirPagina = async (f: Fila) => {
    if (f.pagina_id) { navigate(sitio ? sitio.enlacePagina(f.pagina_id) : `/paginas/${f.pagina_id}`); return; }
    if (sitio) return;
    const r = await fetch(`/api/bd/filas/${f.id}/pagina`, { method: 'POST', credentials: 'include' });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.pagina_id) navigate(`/paginas/${j.pagina_id}`);
    else setFallo(j.error || 'No se pudo abrir la página.');
  };

  const borrarFila = async (filaId: string) => {
    await fetch(`/api/bd/filas/${filaId}`, { method: 'DELETE', credentials: 'include' });
    cargar();
  };

  if (cargando) {
    return <div className="flex items-center gap-2 p-6 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Cargando la tabla…</div>;
  }
  if (fallo) {
    return (
      <div className="flex items-center gap-2 p-4 text-rose-600 text-sm font-bold">
        <AlertTriangle className="w-4 h-4" /> {fallo}
      </div>
    );
  }
  if (!datos) return null;

  const { columnas, filas } = datos;

  // ══ LA GALERÍA, LIMPIA (2026-10-01) ════════════════════════════════════
  // Eugenio: «sin esas líneas que envuelven el contenido en rectángulos; sólo
  // el título de la base de datos y debajo la galería, sin nada extra». En
  // galería no hay marco, ni barra gris, ni contador de filas: el título como
  // un encabezado y las tarjetas. Los mandos sólo existen para quien edita.
  // La vista de tabla conserva su marco: ahí sí ayuda a leer filas y columnas.
  const limpia = vista === 'galeria';

  return (
    <div className={limpia
      ? cn(tono.fondo && `${tono.fondo} rounded-2xl p-4`)
      : cn('border border-slate-200 rounded-xl overflow-hidden', tono.fondo || 'bg-white')}>
      {/* CENTRADA (2026-10-02, Eugenio: «el título de la base de datos
          centrado y la galería centrada, no esquinada a la izquierda»). El
          título va solo en su línea; los mandos del editor, debajo y también
          al centro. */}
      {/* Oculto y sin nada más que enseñar (quien lee no tiene mandos): ni la
          fila del título se pinta, para que no quede un hueco encima. */}
      {!(limpia && tituloOculto && !editable) && (
      <div className={limpia
        ? 'flex flex-wrap items-center justify-center gap-2 pb-4 min-h-9'
        : cn('flex items-center gap-2 px-3 py-2 border-b border-slate-100', tono.fondo ? 'bg-white/40' : 'bg-slate-50/60')}>
        {!limpia && <Table2 className="w-4 h-4 text-slate-400 shrink-0" />}
        {/* El nombre se cambia pinchando en él (2026-09-30, Eugenio: «permite
            cambiar el nombre de la base de datos»). Enter o salir guarda;
            Escape deja el de antes. */}
        <div className={cn(limpia ? 'basis-full flex items-center justify-center gap-1 min-w-0' : 'contents', limpia && tituloOculto && 'opacity-40')}>
        {editable && nombre !== null ? (
          <input autoFocus value={nombre} maxLength={200} aria-label="Nombre de la base de datos"
            onChange={e => setNombre(e.target.value)}
            onBlur={guardarNombre}
            onKeyDown={e => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') { setNombre(null); setFalloNombre(null); }
            }}
            className={cn('min-w-0 flex-1 max-w-xs px-1.5 -mx-1.5 rounded border border-slate-300 bg-white font-black outline-none focus:border-emerald-400', limpia ? cn('min-h-9', LETRA_TITULO[tamanoTitulo]) : 'h-7 text-xs', tono.texto || (limpia ? 'text-slate-900' : 'text-slate-700'))} />
        ) : editable ? (
          <button onClick={() => setNombre(datos.tabla.titulo || '')} title="Cambiar el nombre"
            className={cn('min-w-0 px-1.5 -mx-1.5 rounded font-black truncate hover:bg-slate-100 transition-colors', limpia ? cn('min-h-9', LETRA_TITULO[tamanoTitulo]) : 'h-7 text-xs', tono.texto || (limpia ? 'text-slate-900' : 'text-slate-700'))}>
            {datos.tabla.titulo}
          </button>
        ) : (
          <p className={cn('font-black truncate', limpia ? LETRA_TITULO[tamanoTitulo] : 'text-xs', tono.texto || (limpia ? 'text-slate-900' : 'text-slate-700'))}>{datos.tabla.titulo}</p>
        )}
        </div>
        {/* Ocultar el título al publicar (2026-10-02, Eugenio). */}
        {limpia && editable && onCambiarTituloOculto && (
          <button onClick={() => onCambiarTituloOculto(!tituloOculto)}
            title={tituloOculto ? 'El título no se ve en la página publicada. Pulsa para mostrarlo.' : 'Ocultar el título en la página publicada'}
            className={cn('inline-flex items-center gap-1 h-8 px-2 rounded-md border text-[11px] font-bold shrink-0',
              tituloOculto ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
            {tituloOculto ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{tituloOculto ? 'Título oculto al publicar' : 'Ocultar título'}</span>
          </button>
        )}
        {falloNombre && <span className="text-[11px] font-bold text-rose-600 truncate">{falloNombre}</span>}
        {!limpia && <span className="text-[11px] text-slate-400">
          {/* Si hay filtro puesto se dice: sin este número, una tabla filtrada y
              una completa se ven igual y nadie sabe que mira un trozo. */}
          {datos.mostradas !== undefined && datos.total !== undefined && datos.mostradas !== datos.total
            ? `${datos.mostradas} de ${datos.total} filas`
            : `${filas.length} ${filas.length === 1 ? 'fila' : 'filas'}`}
        </span>}
        {/* LAS BASES DE DATOS CONECTADAS (2026-10-05): ver `ConexionesBD.tsx`.
            Sólo para quien edita: en la página publicada lo enlazado ya se ve
            en las tarjetas. */}
        {editable && !!datos.conexiones?.length && (
          <div className={cn(limpia && 'basis-full flex justify-center')}>
            <ConexionesBD conexiones={datos.conexiones} columnas={columnas} editable={editable} onCambio={() => { cargar(); avisarCambio(); }} />
          </div>
        )}
        {/* Las dos vistas, como las pestañas de Notion. */}
        {/* ENLAZAR CON OTRA BASE DE DATOS, A LA VISTA (2026-10-02). Eugenio
            no encontraba cómo relacionar bases de datos: sólo se podía
            creando una columna desde la vista Tabla. Ahora está aquí, en la
            galería, con su nombre. */}
        {editable && vista === 'galeria' && (
          <button onClick={() => setEditorColumna('nueva-relacion')}
            title="Enlazar los elementos de esta base de datos con los de otra"
            className={cn(!limpia && 'ml-auto', 'inline-flex items-center gap-1 h-8 px-2 rounded-md border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:border-slate-300 shrink-0')}>
            <Link2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Enlazar con otra base de datos</span>
          </button>
        )}
        {/* QUÉ SE VE EN LAS TARJETAS (2026-10-01): «configurar la vista de
            galería para mostrar los enlaces a otras bases de datos». */}
        {vista === 'galeria' && onCambiarVisibles && (
          <div className="relative shrink-0">
            <button onClick={() => setMenuProps(v => !v)} aria-expanded={menuProps}
              className="inline-flex items-center gap-1 h-8 px-2 rounded-md border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:border-slate-300">
              <SlidersHorizontal className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Propiedades</span>
            </button>
            {menuProps && (
              <div className="absolute right-0 top-full z-30 mt-1 w-60 bg-white border border-slate-200 rounded-xl shadow-2xl p-1.5">
                <p className="px-2 pt-1 pb-1.5 text-[10px] font-black uppercase tracking-wide text-slate-400">Se ven en la tarjeta</p>
                {columnas.filter(c => c.id !== datos.columna_titulo).map(c => {
                  const actuales = visibles ?? columnas.filter(x => x.id !== datos.columna_titulo).slice(0, 3).map(x => x.id);
                  const puesta = actuales.includes(c.id);
                  return (
                    <button key={c.id}
                      onClick={() => onCambiarVisibles(puesta ? actuales.filter(x => x !== c.id) : [...actuales, c.id])}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-bold text-slate-600 text-left hover:bg-slate-50">
                      <span className={cn('w-3.5 h-3.5 rounded border grid place-items-center shrink-0',
                        puesta ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300')}>
                        {puesta && <Check className="w-2.5 h-2.5" />}
                      </span>
                      <span className="flex-1 truncate">{c.nombre}</span>
                      {c.tipo === 'relacion' && <span className="text-[10px] font-bold text-slate-300">enlace</span>}
                      {editable && (
                        <span role="button" tabIndex={0} title="Editar la propiedad" aria-label={`Editar ${c.nombre}`}
                          onClick={e => { e.stopPropagation(); setMenuProps(false); setEditorColumna(c); }}
                          onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); setMenuProps(false); setEditorColumna(c); } }}
                          className="w-7 h-7 -mr-1 grid place-items-center rounded-md text-slate-300 hover:text-slate-700 hover:bg-slate-100">
                          <Pencil className="w-3 h-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
                {/* NUEVA PROPIEDAD DESDE LA GALERÍA (2026-10-02, Eugenio: «en la
                    vista de galería no se puede agregar una nueva propiedad; solo
                    desde la vista de tabla dándole al más»). Es el mismo editor
                    que el «+» de la tabla, y la propiedad nueva sale ya marcada
                    para verse en las tarjetas: si no, parecería que no ha pasado
                    nada. */}
                {editable && (
                  <button onClick={() => { setMenuProps(false); setEditorColumna('nueva'); }}
                    className="mt-1 w-full flex items-center gap-2 px-2 h-9 rounded-md border-t border-slate-100 text-xs font-bold text-emerald-700 hover:bg-emerald-50">
                    <Plus className="w-3.5 h-3.5" /> Nueva propiedad
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        {/* Tamaño de las tarjetas: sólo en galería y sólo para quien edita. */}
        {vista === 'galeria' && onCambiarTamanoTitulo && (
          <label className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 shrink-0">
            <span className="hidden sm:inline">Título</span>
            <select value={tamanoTitulo} onChange={e => onCambiarTamanoTitulo(e.target.value as TamanoGaleria)}
              aria-label="Tamaño del título"
              className="h-8 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] font-bold text-slate-600 outline-none focus:border-emerald-400">
              <option value="pequeno">Pequeño</option>
              <option value="mediano">Mediano</option>
              <option value="grande">Grande</option>
              <option value="muy-grande">Muy grande</option>
            </select>
          </label>
        )}
        {vista === 'galeria' && onCambiarTamano && (
          <label className={cn('inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 shrink-0', !limpia && !onCambiarVisibles && 'ml-auto')}>
            <span className="hidden sm:inline">Tamaño</span>
            <select value={tamano} onChange={e => onCambiarTamano(e.target.value as TamanoGaleria)}
              aria-label="Tamaño de las tarjetas"
              className="h-8 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] font-bold text-slate-600 outline-none focus:border-emerald-400">
              <option value="pequeno">Pequeño</option>
              <option value="mediano">Mediano</option>
              <option value="grande">Grande</option>
              <option value="muy-grande">Muy grande</option>
            </select>
          </label>
        )}
        {/* Galería/Tabla sólo para quien edita: en la web publicada la vista
            la decide el autor y el visitante no necesita el interruptor. */}
        {editable && <div className={cn('flex items-center gap-0.5 shrink-0', !limpia && 'ml-auto')} role="tablist">
          {([['galeria', 'Galería', LayoutGrid], ['tabla', 'Tabla', Table2]] as const).map(([v, label, Icono]) => (
            <button key={v} role="tab" aria-selected={vista === v} onClick={() => cambiarVista(v)}
              className={cn('inline-flex items-center gap-1 h-8 px-2 rounded-md text-[11px] font-bold transition-colors',
                vista === v ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-700')}>
              <Icono className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>}
      </div>
      )}

      {datos.ciclo?.length && (
        <div className="flex items-start gap-2 px-3 py-2 bg-rose-50 border-b border-rose-100 text-rose-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs font-bold">
            Hay un cálculo circular entre {datos.ciclo.join(' y ')}: esas columnas no se pueden calcular.
            Las demás sí.
          </p>
        </div>
      )}

      {vista === 'galeria' ? (
        // Sin altura máxima: una galería en una página se lee bajando la
        // página, no con una barra de desplazamiento dentro de otra.
        <div>
          <Galeria tablaId={tablaId} columnas={columnas} filas={filas} sinMargen centrada
            columnaTitulo={datos.columna_titulo ?? null} editable={editable} onCambio={cargar}
            claseTitulo={tono.texto} tamano={tamano} visibles={visibles} />
        </div>
      ) : esMovil ? (
        <div className="divide-y divide-slate-100" style={alto ? { maxHeight: alto, overflowY: 'auto' } : undefined}>
          {filas.map(f => (
            <div key={f.id} className="p-3 space-y-1.5">
              {columnas.map(c => (
                <div key={c.id} className="flex items-start gap-2">
                  <span className="w-28 shrink-0 pt-1.5 text-[11px] font-black uppercase tracking-wide text-slate-400 truncate">{c.nombre}</span>
                  <div className="flex-1 min-w-0">
                    <CeldaTabla celda={f.celdas[c.id] ?? { estado: 'vacia' }} columna={c}
                      apuntados={f.apuntados?.[c.id]} archivos={f.archivos?.[c.id]}
                      editable={editable} onGuardar={v => guardar(f.id, c.id, v)} />
                  </div>
                </div>
              ))}
              <button onClick={() => abrirPagina(f)}
                className="mt-1 inline-flex items-center gap-1 h-11 px-2 text-[11px] font-bold text-slate-500 active:text-emerald-600">
                <ArrowUpRight className="w-3.5 h-3.5" /> Abrir página
              </button>
              {editable && (
                <button onClick={() => borrarFila(f.id)}
                  className="mt-1 inline-flex items-center gap-1 h-11 px-2 text-[11px] font-bold text-slate-400 active:text-rose-600">
                  <Trash2 className="w-3.5 h-3.5" /> Borrar fila
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* ── ESCRITORIO: REJILLA ────────────────────────────────────────── */
        <div className="overflow-x-auto" style={alto ? { maxHeight: alto, overflowY: 'auto' } : undefined}>
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr>
                {columnas.map(c => (
                  <th key={c.id} className="border-b border-r border-slate-200 px-2 py-2 text-left min-w-[9rem]">
                    <button
                      onClick={() => editable && setEditorColumna(c)}
                      className={cn('group inline-flex items-baseline gap-1.5 max-w-full', editable && 'cursor-pointer')}>
                      <span className="text-[11px] font-black uppercase tracking-wide text-slate-500 truncate">{c.nombre}</span>
                      <span className="text-[10px] font-bold text-slate-300">{c.tipo}</span>
                      {editable && <Settings2 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 shrink-0" />}
                    </button>
                  </th>
                ))}
                {editable && (
                  <th className="border-b border-slate-200 w-11 text-center">
                    <button onClick={() => setEditorColumna('nueva')} title="Añadir columna"
                      aria-label="Añadir columna"
                      className="w-11 h-9 grid place-items-center text-slate-400 hover:text-emerald-600">
                      <Plus className="w-4 h-4" />
                    </button>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filas.map(f => (
                <tr key={f.id} className="hover:bg-slate-50/40">
                  {columnas.map((c, ci) => (
                    <td key={c.id} className="group/celda relative border-b border-r border-slate-100 p-0 align-top">
                      {ci === 0 && (
                        <button onClick={() => abrirPagina(f)} title="Abrir la página de esta fila"
                          className="absolute right-1 top-1 z-[1] inline-flex items-center gap-0.5 h-6 px-1.5 rounded border border-slate-200 bg-white text-[10px] font-black uppercase tracking-wide text-slate-500 opacity-0 group-hover/celda:opacity-100 focus:opacity-100 hover:text-emerald-600 transition-opacity">
                          <ArrowUpRight className="w-3 h-3" /> Abrir
                        </button>
                      )}
                      <CeldaTabla celda={f.celdas[c.id] ?? { estado: 'vacia' }} columna={c}
                        apuntados={f.apuntados?.[c.id]} archivos={f.archivos?.[c.id]}
                        editable={editable} onGuardar={v => guardar(f.id, c.id, v)} />
                    </td>
                  ))}
                  {editable && (
                    <td className="border-b border-slate-100 text-center w-11">
                      <button onClick={() => borrarFila(f.id)} title="Borrar la fila"
                        className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editable && esMovil && vista === 'tabla' && (
        <button onClick={() => setEditorColumna('nueva')}
          className="w-full flex items-center gap-1.5 px-3 h-11 border-t border-slate-100 text-xs font-bold text-slate-400 active:text-emerald-600">
          <Settings2 className="w-4 h-4" /> Añadir columna
        </button>
      )}

      {editorColumna && (
        <EditorColumna
          tablaId={tablaId}
          columna={editorColumna === 'nueva' || editorColumna === 'nueva-relacion' ? undefined : editorColumna}
          tipoInicial={editorColumna === 'nueva-relacion' ? 'relacion' : undefined}
          columnas={columnas}
          tablasPagina={tablasPagina}
          onCerrar={() => setEditorColumna(null)}
          onHecho={idNueva => {
            cargar();
            avisarCambio();
            // Creada desde la galería, se ve en las tarjetas desde ya.
            if (idNueva && vista === 'galeria' && onCambiarVisibles) {
              const actuales = visibles ?? columnas.filter(x => x.id !== datos?.columna_titulo).slice(0, 3).map(x => x.id);
              onCambiarVisibles([...actuales, idNueva]);
            }
          }}
        />
      )}

      {editable && vista === 'tabla' && (
        <button onClick={anadirFila}
          className="w-full flex items-center gap-1.5 px-3 h-11 border-t border-slate-100 text-xs font-bold text-slate-400 hover:text-emerald-600 hover:bg-slate-50 transition-colors">
          <Plus className="w-4 h-4" /> Añadir fila
        </button>
      )}
    </div>
  );
}
