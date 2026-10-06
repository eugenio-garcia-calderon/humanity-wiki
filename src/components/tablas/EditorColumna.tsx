import { useEffect, useState } from 'react';
import { X, Plus, Trash2, Loader2, AlertTriangle, Check, Image as ImageIcon, AlignLeft, Database } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// TABLAS · CREAR Y EDITAR UNA COLUMNA
// ============================================================================
// Sin esta pantalla la herramienta solo sirve para texto: los 21 tipos existen
// en el servidor y no había forma de elegir ninguno.
//
// ── LOS TIPOS SE AGRUPAN POR LO QUE HACEN, NO POR ORDEN ALFABÉTICO ──────────
// Una lista de 21 nombres seguidos no la lee nadie. Agrupados por «guardan un
// valor», «apuntan a algo», «llevan un archivo» y «se calculan solos», la
// pregunta que se hace el usuario —qué quiero meter aquí— tiene cuatro
// respuestas en vez de veintiuna.

export const GRUPOS: Array<{ grupo: string; tipos: Array<{ id: string; label: string; ayuda?: string; rol?: string; nombre?: string }> }> = [
  {
    grupo: 'Texto y números',
    tipos: [
      { id: 'texto', label: 'Texto' },
      { id: 'texto_largo', label: 'Texto largo', ayuda: 'Varias líneas' },
      { id: 'numero', label: 'Número' },
      { id: 'moneda', label: 'Moneda', ayuda: 'Se suma y se compara' },
      { id: 'porcentaje', label: 'Porcentaje', ayuda: 'Se escribe 15 y vale 15 %' },
      { id: 'duracion', label: 'Duración', ayuda: 'Se escribe 1:30' },
      { id: 'valoracion', label: 'Valoración', ayuda: 'Estrellas' },
      { id: 'fecha', label: 'Fecha' },
      { id: 'casilla', label: 'Casilla' },
    ],
  },
  {
    grupo: 'Listas',
    tipos: [
      { id: 'seleccion', label: 'Lista de opciones', ayuda: 'Una sola' },
      { id: 'seleccion_multiple', label: 'Etiquetas', ayuda: 'Varias a la vez' },
    ],
  },
  {
    grupo: 'Contacto',
    tipos: [
      { id: 'url', label: 'Enlace web' },
      { id: 'email', label: 'Correo' },
      { id: 'telefono', label: 'Teléfono' },
    ],
  },
  {
    grupo: 'Apunta a algo de la plataforma',
    tipos: [
      { id: 'persona', label: 'Persona' },
      { id: 'proyecto', label: 'Proyecto' },
      { id: 'publicacion', label: 'Publicación' },
      { id: 'relacion', label: 'Otra tabla', ayuda: 'Enlaza con otra base de datos' },
    ],
  },
  {
    grupo: 'Archivos',
    tipos: [
      { id: 'imagen', label: 'Imagen' },
      { id: 'video', label: 'Vídeo' },
      { id: 'documento', label: 'Documento' },
    ],
  },
  {
    grupo: 'Se calculan solas',
    tipos: [
      { id: 'formula', label: 'Fórmula', ayuda: '{Precio} * {Unidades}' },
      { id: 'condicional', label: 'Condición', ayuda: 'Si esto, entonces aquello' },
      { id: 'agregado', label: 'Resumen de otra tabla', ayuda: 'Suma, cuenta, media…' },
    ],
  },
  // LA TIENDA (2026-10-06, Eugenio: «cuando tú creas una base de datos, vas a
  // poder crear una propiedad que sea precio, otra que sea variante… y una
  // puede ser botón de compra»). Four of the five are ordinary types with a
  // `config.rol` — a «Precio» is a `moneda` that sorts, sums and charts like
  // any other. Only the button is new. See `src/server/bd/tienda.ts`.
  {
    grupo: 'Tienda',
    tipos: [
      { id: 'moneda', rol: 'precio', nombre: 'Precio', label: 'Precio', ayuda: 'Lo que cuesta cada unidad' },
      { id: 'seleccion_multiple', rol: 'variantes', nombre: 'Variantes', label: 'Variantes', ayuda: 'Tallas, colores… las que tenga cada uno' },
      { id: 'moneda', rol: 'envio', nombre: 'Envío', label: 'Envío', ayuda: 'Gastos de envío; vacío = se acuerda' },
      { id: 'numero', rol: 'stock', nombre: 'Stock', label: 'Stock', ayuda: 'Cuántos quedan; vacío = sin cuenta' },
      { id: 'compra', nombre: 'Comprar', label: 'Botón de compra', ayuda: 'Unidades y «Añadir a la cesta»' },
    ],
  },
];

const CON_OPCIONES = new Set(['seleccion', 'seleccion_multiple']);
const VARIOS = new Set(['persona', 'proyecto', 'publicacion', 'relacion', 'imagen', 'video', 'documento']);

const OPERACIONES = [
  { id: 'contar', label: 'Contar filas' },
  { id: 'suma', label: 'Sumar' },
  { id: 'media', label: 'Media' },
  { id: 'minimo', label: 'Mínimo' },
  { id: 'maximo', label: 'Máximo' },
  { id: 'contar_llenas', label: 'Contar las que tienen valor' },
  { id: 'lista', label: 'Listar' },
  { id: 'y_todos', label: '¿Todas cumplen?' },
  { id: 'o_alguno', label: '¿Alguna cumple?' },
];

/** Lo que de la otra base de datos no se puede enseñar en una ficha: lo que
 *  apunta a su vez a otra cosa, los archivos y lo que se calcula. */
const NO_SE_MUESTRA = new Set(['relacion', 'persona', 'proyecto', 'publicacion', 'imagen', 'video', 'documento', 'formula', 'condicional', 'agregado']);

export default function EditorColumna({ tablaId, columna, columnas, onCerrar, onHecho, tipoInicial, tablasPagina = [] }: {
  tablaId: string;
  /** Si viene, se edita; si no, se crea. */
  columna?: any;
  /** Las que ya hay: hacen falta para las fórmulas y los resúmenes. */
  columnas: any[];
  onCerrar: () => void;
  /** Con el id de la columna, si es nueva. */
  onHecho: (idNueva?: string) => void;
  /** Las otras bases de datos de la misma página: salen las primeras al
   *  enlazar (2026-10-02). */
  tablasPagina?: string[];
  /** Al crear, con qué tipo se abre (p. ej. `relacion` desde «Enlazar con
   *  otra base de datos»). */
  tipoInicial?: string;
}) {
  const editando = !!columna;
  // El diálogo de «Enlazar con otra base de datos», o editar un enlace.
  const soloEnlace = (columna?.tipo || tipoInicial) === 'relacion';
  const [nombre, setNombre] = useState(columna?.nombre || '');
  const [tipo, setTipo] = useState(columna?.tipo || tipoInicial || 'texto');
  const [opciones, setOpciones] = useState<Array<{ id?: string; label: string }>>(columna?.opciones || []);
  const [config, setConfig] = useState<any>(columna?.config || {});
  const [tablas, setTablas] = useState<any[]>([]);
  const [otrasColumnas, setOtrasColumnas] = useState<any[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  // Las otras tablas solo hacen falta para relación y resumen: se piden cuando
  // se elige uno de esos dos, no al abrir.
  useEffect(() => {
    if (tipo !== 'relacion' && tipo !== 'agregado') return;
    fetch('/api/bd/tablas', { credentials: 'include' }).then(r => r.json()).then(setTablas).catch(() => {});
  }, [tipo]);

  // Para un resumen hay que elegir qué campo de la OTRA tabla se resume, así
  // que se piden sus columnas en cuanto se sabe cuál es la relación.
  useEffect(() => {
    if (tipo !== 'agregado' || !config.columna_relacion) return;
    const rel = columnas.find(c => c.id === config.columna_relacion);
    const destino = rel?.config?.tabla_destino;
    if (!destino) { setOtrasColumnas([]); return; }
    fetch(`/api/bd/tablas/${destino}`, { credentials: 'include' })
      .then(r => r.json()).then(j => setOtrasColumnas(j.columnas || [])).catch(() => {});
  }, [tipo, config.columna_relacion]);

  const relaciones = columnas.filter(c => c.tipo === 'relacion');

  // ── ENLAZAR CON OTRA BASE DE DATOS (2026-10-02) ─────────────────────────
  // Eugenio: «un selector de las bases de datos disponibles empezando por las
  // que están en esa misma página, que coja por defecto el nombre de esa
  // conexión —que luego puedes modificar— y que te permita seleccionar las
  // variables que quieres mostrar como enlazadas, por ejemplo una imagen o un
  // texto».
  const [nombreAuto, setNombreAuto] = useState<string | null>(null);
  const [columnasDestino, setColumnasDestino] = useState<any[] | null>(null);
  const destino = tipo === 'relacion' ? config.tabla_destino : null;
  useEffect(() => {
    if (!destino) { setColumnasDestino(null); return; }
    fetch(`/api/bd/tablas/${destino}`, { credentials: 'include' })
      // Sin su columna de nombre: el nombre sale siempre, ofrecerlo otra vez
      // sería un interruptor que no cambia nada.
      .then(r => r.json()).then(j => setColumnasDestino((j.columnas || []).filter((c: any) => c.id !== j.columna_titulo)))
      .catch(() => setColumnasDestino([]));
  }, [destino]);
  const elegirDestino = (t: any) => {
    // «Admite varios» nace encendido: un proyecto suele tocar varias áreas, y
    // con uno solo el segundo enlace fallaba sin que se entendiera por qué.
    setConfig((c: any) => ({ ...c, tabla_destino: t.id, varios: c.varios ?? true, reciproca: c.reciproca ?? true, mostrar: c.tabla_destino === t.id ? c.mostrar : ['imagen'] }));
    // El nombre sigue al de la base de datos mientras nadie lo haya escrito a mano.
    if (!nombre.trim() || nombre === nombreAuto) { setNombre(t.titulo); setNombreAuto(t.titulo); }
  };
  const mostrar: string[] = Array.isArray(config.mostrar) ? config.mostrar : [];
  const alternarMostrar = (k: string) =>
    setConfig((c: any) => { const m: string[] = Array.isArray(c.mostrar) ? c.mostrar : []; return { ...c, mostrar: m.includes(k) ? m.filter(x => x !== k) : [...m, k] }; });
  const candidatas = tablas.filter(t => t.id !== tablaId);
  const enPagina = candidatas.filter(t => tablasPagina.includes(t.id))
    .sort((a, b) => tablasPagina.indexOf(a.id) - tablasPagina.indexOf(b.id));
  const otras = candidatas.filter(t => !tablasPagina.includes(t.id));

  const guardar = async () => {
    setGuardando(true); setFallo(null);
    const cuerpo: any = { nombre, tipo, config };
    if (CON_OPCIONES.has(tipo)) cuerpo.opciones = opciones.filter(o => o.label.trim());
    const r = await fetch(
      editando ? `/api/bd/columnas/${columna.id}` : `/api/bd/tablas/${tablaId}/columnas`,
      { method: editando ? 'PUT' : 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) },
    );
    const j = await r.json();
    setGuardando(false);
    // El servidor ya explica POR QUÉ no vale —fórmula que no se entiende,
    // cálculo circular, columna que no existe— y ese texto es el que se enseña.
    // Traducirlo aquí a «no se pudo guardar» sería tirar la única pista útil.
    if (!r.ok) { setFallo(j.error || 'No se pudo guardar.'); return; }
    onHecho(editando ? undefined : j.id); onCerrar();
  };

  const borrar = async () => {
    await fetch(`/api/bd/columnas/${columna.id}`, { method: 'DELETE', credentials: 'include' });
    onHecho(); onCerrar();
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-start justify-center p-4 sm:p-8 bg-slate-900/40 overflow-y-auto"
      onClick={onCerrar}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-800">
            {tipo === 'relacion' ? (editando ? 'Editar el enlace' : 'Enlazar con otra base de datos') : editando ? 'Editar la propiedad' : 'Nueva propiedad'}
          </h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="w-11 h-11 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* EN UN ENLACE, PRIMERO LA BASE DE DATOS (2026-10-02): de ella sale el
            nombre, así que va arriba; y la lista de tipos sobra, porque ya se
            sabe que es un enlace. `order` y no mover bloques de sitio: el
            resto del editor sigue igual. */}
        <div className="p-4 flex flex-col gap-4">
          <label className={cn('block', soloEnlace && 'order-2')}>
            <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Nombre</span>
            <input value={nombre} onChange={e => setNombre(e.target.value)} autoFocus
              placeholder={tipo === 'relacion' ? 'Nombre del enlace' : 'Coste unitario'}
              /* 16 px: por debajo, Safari de iOS hace zoom al enfocar. */
              className="mt-1 w-full h-11 px-3 border border-slate-200 rounded-xl text-base sm:text-sm outline-none focus:border-emerald-400" />
          </label>

          {soloEnlace ? null : editando ? (
            <p className="text-[11px] text-slate-400 leading-relaxed">
              El tipo no se puede cambiar. Habría que decidir qué pasa con las celdas que no se
              puedan convertir, y hacerlo por las bravas perdería datos en silencio.
            </p>
          ) : (
            <div>
              <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Tipo</span>
              <div className="mt-1 max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-50">
                {GRUPOS.map(g => (
                  <div key={g.grupo} className="p-1.5">
                    <p className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-300">{g.grupo}</p>
                    {g.tipos.map(t => {
                      // A shop entry is a type PLUS a role: «Precio» and «Moneda»
                      // are the same type and must not both light up.
                      const elegido = tipo === t.id && (config.rol || undefined) === t.rol;
                      return (
                      <button key={t.id + (t.rol || '')} onClick={() => {
                          setTipo(t.id);
                          setConfig((c: any) => { const { rol: _fuera, ...resto } = c || {}; return t.rol ? { ...resto, rol: t.rol } : resto; });
                          // The name follows the shop entry while nobody has typed one.
                          if (t.nombre && (!nombre.trim() || GRUPOS.some(g => g.tipos.some(x => x.nombre === nombre)))) setNombre(t.nombre);
                        }}
                        className={cn('w-full flex items-baseline gap-2 px-2 h-11 rounded-lg text-left transition-colors',
                          elegido ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-slate-50')}>
                        <span className="text-xs font-bold">{t.label}</span>
                        {t.ayuda && <span className="text-[10px] text-slate-400">{t.ayuda}</span>}
                      </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── OPCIONES DE UNA LISTA ─────────────────────────────────────── */}
          {CON_OPCIONES.has(tipo) && (
            <div>
              <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Opciones</span>
              <div className="mt-1 space-y-1">
                {opciones.map((o, i) => (
                  <div key={o.id || i} className="flex items-center gap-1">
                    <input value={o.label}
                      onChange={e => setOpciones(os => os.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                      className="flex-1 h-11 px-3 border border-slate-200 rounded-xl text-base sm:text-sm outline-none focus:border-emerald-400" />
                    <button onClick={() => setOpciones(os => os.filter((_, j) => j !== i))}
                      aria-label="Quitar la opción"
                      className="w-11 h-11 grid place-items-center text-slate-300 hover:text-rose-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button onClick={() => setOpciones(os => [...os, { label: '' }])}
                  className="inline-flex items-center gap-1 h-11 px-2 text-xs font-bold text-slate-400 hover:text-emerald-600">
                  <Plus className="w-3.5 h-3.5" /> Añadir opción
                </button>
              </div>
              {editando && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Renombrar una opción no cambia ninguna fila: se guarda su identificador, no su texto.
                </p>
              )}
            </div>
          )}

          {/* ── ¿UNO O VARIOS? ────────────────────────────────────────────── */}
          {VARIOS.has(tipo) && (
            <label className={cn('flex items-center gap-2', soloEnlace && 'order-4')}>
              <input type="checkbox" checked={!!config.varios}
                onChange={e => setConfig((c: any) => ({ ...c, varios: e.target.checked }))} />
              <span className="text-xs font-bold text-slate-600">Admite varios</span>
            </label>
          )}
          {/* EN LAS DOS (2026-10-05): la otra base de datos enseña el enlace
              de vuelta, como en Notion. Encendido al nacer. */}
          {tipo === 'relacion' && !editando && config.tabla_destino && config.tabla_destino !== tablaId && (
            <label className={cn('flex items-start gap-2', soloEnlace && 'order-4')}>
              <input type="checkbox" className="mt-0.5" checked={!!config.reciproca}
                onChange={e => setConfig((c: any) => ({ ...c, reciproca: e.target.checked }))} />
              <span className="text-xs font-bold text-slate-600">
                Mostrar también en «{tablas.find(t => t.id === config.tabla_destino)?.titulo || 'la otra'}»
                <span className="block text-[11px] font-medium text-slate-400">Allí aparecerá qué elementos de aquí la enlazan.</span>
              </span>
            </label>
          )}

          {/* ── RELACIÓN: con qué base de datos, y qué se ve de ella ──────── */}
          {tipo === 'relacion' && (
            <div className={cn('space-y-4', soloEnlace && 'order-1')}>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Enlaza con</span>
                {editando ? (
                  // La base de datos de un enlace ya creado no se cambia: sus
                  // filas apuntan a las de ésa, y cambiarla las dejaría colgando.
                  <p className="mt-1 flex items-center gap-2 h-11 px-3 rounded-xl bg-slate-50 text-sm font-bold text-slate-700">
                    <Database className="w-4 h-4 text-slate-400" />
                    {tablas.find(t => t.id === config.tabla_destino)?.titulo || 'Otra base de datos'}
                  </p>
                ) : (
                  <div className="mt-1 max-h-56 overflow-y-auto border border-slate-200 rounded-xl p-1.5 space-y-2">
                    {[['En esta página', enPagina], ['Otras bases de datos', otras]].map(([titulo, lista]: any) => lista.length > 0 && (
                      <div key={titulo}>
                        <p className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-300">{titulo}</p>
                        {lista.map((t: any) => (
                          <button key={t.id} onClick={() => elegirDestino(t)}
                            className={cn('w-full flex items-center gap-2 px-2 h-11 rounded-lg text-left transition-colors',
                              config.tabla_destino === t.id ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-slate-50 text-slate-700')}>
                            <Database className="w-4 h-4 shrink-0 opacity-50" />
                            <span className="flex-1 truncate text-xs font-bold">{t.titulo || 'Sin título'}</span>
                            <span className="text-[10px] text-slate-400">{t.filas} {Number(t.filas) === 1 ? 'elemento' : 'elementos'}</span>
                            {config.tabla_destino === t.id && <Check className="w-4 h-4 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    ))}
                    {!candidatas.length && <p className="px-2 py-3 text-xs text-slate-400">No hay otras bases de datos todavía.</p>}
                  </div>
                )}
              </div>

            </div>
          )}

          {tipo === 'relacion' && config.tabla_destino && (
                <div className={cn(soloEnlace && 'order-3')}>
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Qué se ve del elemento enlazado</span>
                  <p className="text-[11px] text-slate-400">Además de su nombre, que sale siempre.</p>
                  <div className="mt-1 border border-slate-200 rounded-xl p-1.5">
                    {[
                      { id: 'imagen', nombre: 'Imagen', icono: <ImageIcon className="w-3.5 h-3.5" /> },
                      { id: 'texto', nombre: 'Texto (su descripción o el principio)', icono: <AlignLeft className="w-3.5 h-3.5" /> },
                      ...(columnasDestino || []).filter(c => !NO_SE_MUESTRA.has(c.tipo)).map(c => ({ id: c.id, nombre: c.nombre, icono: null as any })),
                    ].map(op => {
                      const puesta = mostrar.includes(op.id);
                      return (
                        <button key={op.id} onClick={() => alternarMostrar(op.id)}
                          className="w-full flex items-center gap-2 px-2 h-10 rounded-lg text-left text-xs font-bold text-slate-600 hover:bg-slate-50">
                          <span className={cn('w-4 h-4 rounded border grid place-items-center shrink-0',
                            puesta ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300')}>
                            {puesta && <Check className="w-3 h-3" />}
                          </span>
                          {op.icono && <span className="text-slate-400">{op.icono}</span>}
                          <span className="flex-1 truncate">{op.nombre}</span>
                        </button>
                      );
                    })}
                    {columnasDestino === null && <p className="px-2 py-2 text-[11px] text-slate-400">Cargando sus campos…</p>}
                  </div>
                </div>
              )}
          {/* ── FÓRMULA ───────────────────────────────────────────────────── */}
          {tipo === 'formula' && (
            <label className="block">
              <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Fórmula</span>
              <input value={config.formula || ''}
                onChange={e => setConfig((c: any) => ({ ...c, formula: e.target.value }))}
                placeholder="{Precio} * {Unidades}"
                className="mt-1 w-full h-11 px-3 border border-slate-200 rounded-xl font-mono text-base sm:text-sm outline-none focus:border-emerald-400" />
              <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                Entre llaves, el nombre de una columna. Separador de argumentos «;».
                Hay SI, Y, O, SUMA, MEDIA, MIN, MAX, REDONDEAR, DIAS, HOY, CONTIENE, SI.VACIO y SI.ERROR.
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Columnas: {columnas.map(c => `{${c.nombre}}`).join('  ') || '(ninguna todavía)'}
              </p>
            </label>
          )}

          {/* ── CONDICIÓN ─────────────────────────────────────────────────── */}
          {tipo === 'condicional' && (
            <div>
              <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Reglas</span>
              <div className="mt-1 space-y-1">
                {(config.reglas || []).map((r: any, i: number) => (
                  <div key={i} className="flex items-center gap-1">
                    <input value={r.si} placeholder="{Nota} >= 4"
                      onChange={e => setConfig((c: any) => ({ ...c, reglas: c.reglas.map((x: any, j: number) => j === i ? { ...x, si: e.target.value } : x) }))}
                      className="flex-1 h-11 px-2 border border-slate-200 rounded-xl font-mono text-xs" />
                    <span className="text-[10px] font-black text-slate-400">→</span>
                    <input value={r.entonces} placeholder='"Apto"'
                      onChange={e => setConfig((c: any) => ({ ...c, reglas: c.reglas.map((x: any, j: number) => j === i ? { ...x, entonces: e.target.value } : x) }))}
                      className="w-32 h-11 px-2 border border-slate-200 rounded-xl font-mono text-xs" />
                    <button onClick={() => setConfig((c: any) => ({ ...c, reglas: c.reglas.filter((_: any, j: number) => j !== i) }))}
                      aria-label="Quitar la regla" className="w-11 h-11 grid place-items-center text-slate-300 hover:text-rose-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button onClick={() => setConfig((c: any) => ({ ...c, reglas: [...(c.reglas || []), { si: '', entonces: '' }] }))}
                  className="inline-flex items-center gap-1 h-11 px-2 text-xs font-bold text-slate-400 hover:text-emerald-600">
                  <Plus className="w-3.5 h-3.5" /> Añadir regla
                </button>
              </div>
              <label className="block mt-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Si no se cumple ninguna</span>
                <input value={config.si_no || ''} placeholder='"Normal"'
                  onChange={e => setConfig((c: any) => ({ ...c, si_no: e.target.value }))}
                  className="mt-1 w-full h-11 px-3 border border-slate-200 rounded-xl font-mono text-sm" />
              </label>
              <p className="mt-1 text-[11px] text-slate-400">Manda la primera regla que se cumpla. El texto va entre comillas.</p>
            </div>
          )}

          {/* ── RESUMEN DE OTRA TABLA ─────────────────────────────────────── */}
          {tipo === 'agregado' && (
            <div className="space-y-2">
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Por qué relación</span>
                <select value={config.columna_relacion || ''}
                  onChange={e => setConfig((c: any) => ({ ...c, columna_relacion: e.target.value }))}
                  className="mt-1 w-full h-11 px-2 border border-slate-200 rounded-xl text-sm">
                  <option value="">Elige…</option>
                  {relaciones.map(c => <option key={c.id} value={c.id}>{c.nombre} (de esta tabla)</option>)}
                  {tablas.flatMap((t: any) => (t.relaciones || [])).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nombre} (apunta aquí)</option>
                  ))}
                </select>
                {!relaciones.length && (
                  <span className="mt-1 block text-[11px] text-amber-600">
                    Esta tabla no tiene ninguna columna de relación todavía. Crea una antes, o usa una
                    relación de la otra tabla que apunte a ésta.
                  </span>
                )}
              </label>
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Dirección</span>
                <select value={config.direccion || 'origen'}
                  onChange={e => setConfig((c: any) => ({ ...c, direccion: e.target.value }))}
                  className="mt-1 w-full h-11 px-2 border border-slate-200 rounded-xl text-sm">
                  <option value="origen">Lo que yo enlazo</option>
                  <option value="destino">Lo que me apunta a mí</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Qué hago</span>
                <select value={config.operacion || 'contar'}
                  onChange={e => setConfig((c: any) => ({ ...c, operacion: e.target.value }))}
                  className="mt-1 w-full h-11 px-2 border border-slate-200 rounded-xl text-sm">
                  {OPERACIONES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </label>
              {config.operacion && config.operacion !== 'contar' && (
                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">De qué campo</span>
                  <select value={config.columna_destino || ''}
                    onChange={e => setConfig((c: any) => ({ ...c, columna_destino: e.target.value }))}
                    className="mt-1 w-full h-11 px-2 border border-slate-200 rounded-xl text-sm">
                    <option value="">Elige…</option>
                    {otrasColumnas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </label>
              )}
            </div>
          )}

          {/* CÓMO SE ENSEÑA EL RESULTADO. Una columna calculada no tiene tipo
              propio, así que sin esto un total en euros salía como «360000». */}
          {['formula', 'agregado', 'condicional'].includes(tipo) && (
            <label className="block">
              <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Cómo se enseña el resultado</span>
              <select value={config.formato || ''}
                onChange={e => setConfig((c: any) => ({ ...c, formato: e.target.value || undefined }))}
                className="mt-1 w-full h-11 px-2 border border-slate-200 rounded-xl text-sm">
                <option value="">Número</option>
                <option value="moneda">Moneda</option>
                <option value="porcentaje">Porcentaje</option>
                <option value="duracion">Duración</option>
              </select>
            </label>
          )}

          {fallo && (
            <div className={cn('flex items-start gap-2 p-2.5 bg-rose-50 rounded-xl text-rose-700', soloEnlace && 'order-5')}>
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-xs font-bold">{fallo}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-100">
          {editando ? (
            <button onClick={borrar} className="inline-flex items-center gap-1.5 h-11 px-3 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50">
              <Trash2 className="w-4 h-4" /> Quitar columna
            </button>
          ) : <span />}
          <button onClick={guardar} disabled={guardando || !nombre.trim() || (tipo === 'relacion' && !config.tabla_destino)}
            className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-40 hover:bg-slate-800">
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            {editando ? 'Guardar' : tipo === 'relacion' ? 'Crear el enlace' : 'Crear columna'}
          </button>
        </div>
      </div>
    </div>
  );
}
