import { useEffect, useState } from 'react';
import { X, Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react';
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

export const GRUPOS: Array<{ grupo: string; tipos: Array<{ id: string; label: string; ayuda?: string }> }> = [
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

export default function EditorColumna({ tablaId, columna, columnas, onCerrar, onHecho }: {
  tablaId: string;
  /** Si viene, se edita; si no, se crea. */
  columna?: any;
  /** Las que ya hay: hacen falta para las fórmulas y los resúmenes. */
  columnas: any[];
  onCerrar: () => void;
  onHecho: () => void;
}) {
  const editando = !!columna;
  const [nombre, setNombre] = useState(columna?.nombre || '');
  const [tipo, setTipo] = useState(columna?.tipo || 'texto');
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
    onHecho(); onCerrar();
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
          <h2 className="text-sm font-black text-slate-800">{editando ? 'Editar la columna' : 'Nueva columna'}</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="w-11 h-11 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Nombre</span>
            <input value={nombre} onChange={e => setNombre(e.target.value)} autoFocus
              placeholder="Coste unitario"
              /* 16 px: por debajo, Safari de iOS hace zoom al enfocar. */
              className="mt-1 w-full h-11 px-3 border border-slate-200 rounded-xl text-base sm:text-sm outline-none focus:border-emerald-400" />
          </label>

          {editando ? (
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
                    {g.tipos.map(t => (
                      <button key={t.id} onClick={() => setTipo(t.id)}
                        className={cn('w-full flex items-baseline gap-2 px-2 h-11 rounded-lg text-left transition-colors',
                          tipo === t.id ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-slate-50')}>
                        <span className="text-xs font-bold">{t.label}</span>
                        {t.ayuda && <span className="text-[10px] text-slate-400">{t.ayuda}</span>}
                      </button>
                    ))}
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
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!config.varios}
                onChange={e => setConfig((c: any) => ({ ...c, varios: e.target.checked }))} />
              <span className="text-xs font-bold text-slate-600">Admite varios</span>
            </label>
          )}

          {/* ── RELACIÓN: a qué tabla ─────────────────────────────────────── */}
          {tipo === 'relacion' && (
            <label className="block">
              <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Enlaza con</span>
              <select value={config.tabla_destino || ''}
                onChange={e => setConfig((c: any) => ({ ...c, tabla_destino: e.target.value }))}
                className="mt-1 w-full h-11 px-2 border border-slate-200 rounded-xl text-sm">
                <option value="">Elige una tabla…</option>
                {tablas.map(t => <option key={t.id} value={t.id}>{t.titulo}</option>)}
              </select>
            </label>
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
            <div className="flex items-start gap-2 p-2.5 bg-rose-50 rounded-xl text-rose-700">
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
          <button onClick={guardar} disabled={guardando || !nombre.trim()}
            className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-40 hover:bg-slate-800">
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            {editando ? 'Guardar' : 'Crear columna'}
          </button>
        </div>
      </div>
    </div>
  );
}
