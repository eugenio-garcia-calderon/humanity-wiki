import { useEffect, useState } from 'react';
import { X, Plus, Trash2, Loader2, AlertTriangle, Check, Image as ImageIcon, AlignLeft, Database, ChevronUp, ChevronDown, Link2 } from 'lucide-react';
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

export const GRUPOS: Array<{ grupo: string; tipos: Array<{ id: string; label: string; ayuda?: string; rol?: string; modo?: string; nombre?: string; criterio?: string; soloCompradores?: boolean }> }> = [
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
      // LOS CUATRO BOTONES (2026-10-08). Cada uno tiene su lógica: `comprar` va derecho al pago;
      // `carrito` añade a la cesta y se paga al terminar; `donar` deja elegir cuánto y NO lleva IVA;
      // `recompensa` es una donación con algo a cambio (también sin IVA).
      { id: 'compra', modo: 'comprar', nombre: 'Comprar', label: 'Botón de compra', ayuda: 'Va derecho al pago' },
      { id: 'compra', modo: 'carrito', nombre: 'Añadir a la cesta', label: 'Botón de añadir a la cesta', ayuda: 'Se paga al finalizar la compra' },
      { id: 'compra', modo: 'donar', nombre: 'Donar', label: 'Botón de donar', ayuda: 'Cada uno elige cuánto · sin IVA' },
      { id: 'compra', modo: 'recompensa', nombre: 'Apoyar', label: 'Donación con recompensa', ayuda: 'Una cantidad a cambio de algo · sin IVA' },
      { id: 'texto', rol: 'recompensa', nombre: 'Recompensa', label: 'Recompensa', ayuda: 'Qué recibe quien apoya (para «Donación con recompensa»)' },
    ],
  },
  // LAS OFERTAS (2026-10-18, Wikiproducts W5). Una base de datos de ofertas es
  // una tienda cuyas filas se compran a otro: «Distribuidor» dice a quién y
  // «Comisión» lo que nos paga por enseñarla (vacía = sin acuerdo). El bloque
  // «Ofertas» de la ficha y el pedido gestionado leen estos papeles. Ver
  // `src/server/pedidoGestionado.ts`.
  {
    grupo: 'Ofertas',
    tipos: [
      { id: 'relacion', rol: 'producto', nombre: 'Producto', label: 'Producto', ayuda: 'La ficha de la que es oferta' },
      { id: 'relacion', rol: 'distribuidor', nombre: 'Distribuidor', label: 'Distribuidor', ayuda: 'La tienda que lo vende' },
      { id: 'porcentaje', rol: 'comision', nombre: 'Comisión', label: 'Comisión', ayuda: 'Lo que nos paga la tienda; vacía = sin acuerdo' },
      { id: 'url', rol: 'enlace', nombre: 'Enlace a la tienda', label: 'Enlace a la tienda', ayuda: 'La oferta en la web del distribuidor' },
      { id: 'texto', rol: 'plazo', nombre: 'Plazo de entrega', label: 'Plazo de entrega', ayuda: '«1–2 días»' },
      { id: 'fecha', rol: 'comprobado', nombre: 'Comprobado el', label: 'Comprobado el', ayuda: 'Cuándo se miró el precio por última vez' },
      { id: 'casilla', rol: 'instalacion', nombre: 'Incluye instalación', label: 'Incluye instalación', ayuda: 'Para paneles y baterías domésticas' },
      { id: 'texto', rol: 'gtin', nombre: 'EAN / GTIN', label: 'EAN / GTIN', ayuda: 'El código de barras (en la ficha de producto)' },
    ],
  },
  // LA NOTA DE LA COMUNIDAD (2026-10-18, Wikiproducts: «calificar los
  // productos en función de la calidad, precio, garantía, ecología, salud,
  // estética y ética»). One column per criterion; people vote 1-5 in the row's
  // page with the «Valoración» block and the cell shows the result. See
  // `src/server/bd/comunidad.ts`.
  {
    grupo: 'Comunidad',
    tipos: [
      { id: 'comunidad', criterio: 'calidad', nombre: 'Calidad', label: 'Calidad', ayuda: 'Nota de la comunidad, 1 a 5' },
      { id: 'comunidad', criterio: 'precio', nombre: 'Precio (opinión)', label: 'Precio', ayuda: 'Si vale lo que cuesta' },
      { id: 'comunidad', criterio: 'garantia', nombre: 'Garantía', label: 'Garantía' },
      { id: 'comunidad', criterio: 'ecologia', nombre: 'Ecología', label: 'Ecología' },
      { id: 'comunidad', criterio: 'salud', nombre: 'Salud', label: 'Salud' },
      { id: 'comunidad', criterio: 'estetica', nombre: 'Estética', label: 'Estética' },
      { id: 'comunidad', criterio: 'etica', nombre: 'Ética', label: 'Ética' },
      { id: 'comunidad', criterio: 'atencion', soloCompradores: true, nombre: 'Atención al cliente', label: 'Atención al cliente', ayuda: 'Sólo puntúa quien compró' },
      { id: 'comunidad', criterio: 'media', nombre: 'Nota media', label: 'Nota media', ayuda: 'La media de los demás criterios' },
    ],
  },
];

const CON_OPCIONES = new Set(['seleccion', 'seleccion_multiple']);
/** Los colores de las etiquetas, los de Notion (2026-10-18). Sin color, gris claro. */
const COLORES_OPCION: Array<[string, string]> = [['Gris', '#787774'], ['Marrón', '#9f6b53'], ['Naranja', '#d9730d'], ['Amarillo', '#cb912f'], ['Verde', '#448361'], ['Azul', '#337ea9'], ['Morado', '#9065b0'], ['Rosa', '#c14c8a'], ['Rojo', '#d44c47']];
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
  const [opciones, setOpciones] = useState<Array<{ id?: string; label: string; color?: string | null }>>(columna?.opciones || []);
  /** La opción cuyo selector de color está abierto. */
  const [colorDe, setColorDe] = useState<number | null>(null);
  const [config, setConfig] = useState<any>(columna?.config || {});
  /** Lo que se escribe en el buscador de tipos. */
  const [buscarTipo, setBuscarTipo] = useState('');
  /** La rejilla de tipos: abierta al crear, plegada en cuanto se elige uno (como en Notion). */
  const [tiposAbiertos, setTiposAbiertos] = useState(!columna);
  type TipoElegible = { id: string; label: string; rol?: string; modo?: string; nombre?: string; criterio?: string; soloCompradores?: boolean };
  const elegirTipo = (t: TipoElegible) => {
    setTipo(t.id);
    setTiposAbiertos(false);
    setConfig((c: any) => {
      const { rol: _fuera, modo: _modo, criterio: _criterio, solo_compradores: _solo, ...resto } = c || {};
      return {
        ...resto, ...(t.rol ? { rol: t.rol } : {}), ...(t.modo ? { modo: t.modo } : {}),
        ...(t.criterio ? { criterio: t.criterio, solo_compradores: !!t.soloCompradores } : {}),
      };
    });
    // The name follows the shop entry while nobody has typed one.
    if (t.nombre && (!nombre.trim() || GRUPOS.some(g => g.tipos.some(x => x.nombre === nombre)))) setNombre(t.nombre);
  };
  // Escape cierra el diálogo, como en cualquier ventana de Notion.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onCerrar]);
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
  // LAS DEL MISMO PROYECTO PRIMERO (2026-10-20, Eugenio: «me salen tantas bases
  // de datos que no encuentro la de este proyecto»). El servidor dice cuáles
  // cuelgan de la misma raíz del menú (`bd/arbolProyecto.ts`); las demás
  // quedan tras «Conectar con otros proyectos».
  const [proyecto, setProyecto] = useState<{ raiz: { id: string; titulo: string } | null; tablas: string[] } | null>(null);
  const [verOtras, setVerOtras] = useState(false);
  useEffect(() => {
    if (tipo !== 'relacion' || !tablaId) return;
    fetch(`/api/bd/tablas/${tablaId}/del-proyecto`, { credentials: 'include' }).then(r => (r.ok ? r.json() : null)).then(setProyecto).catch(() => setProyecto(null));
  }, [tipo, tablaId]);

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
  const enProyecto = new Set(proyecto?.tablas || []);
  const delProyecto = candidatas.filter(t => !tablasPagina.includes(t.id) && enProyecto.has(t.id));
  const otras = candidatas.filter(t => !tablasPagina.includes(t.id) && !enProyecto.has(t.id));
  // Sin nada del proyecto que ofrecer (o sin saber el proyecto), las demás se ven sin pedirlas;
  // y si la elegida es de otro proyecto, también.
  const otrasAbiertas = verOtras || (!enPagina.length && !delProyecto.length) || otras.some(t => t.id === config.tabla_destino);

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
    <div className="fixed inset-0 z-[10000] flex items-start justify-center p-4 sm:p-8 bg-slate-900/40 overflow-y-auto"
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
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Tipo</span>
                {(() => {
                  const actual = GRUPOS.flatMap(g => g.tipos).find(t => t.id === tipo && (config.rol || undefined) === t.rol && (t.id !== 'comunidad' || config.criterio === t.criterio));
                  return actual ? <span className="text-[11px] font-bold text-slate-500 truncate">Elegido: {actual.label}{actual.ayuda ? ` · ${actual.ayuda}` : ''}</span> : null;
                })()}
              </div>
              {tiposAbiertos ? (<>
              <input value={buscarTipo} onChange={e => setBuscarTipo(e.target.value)} placeholder="Buscar un tipo…" aria-label="Buscar un tipo"
                onKeyDown={e => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  const q = buscarTipo.trim().toLocaleLowerCase('es');
                  const primero = GRUPOS.flatMap(g => g.tipos).find(t => !q || `${t.label} ${t.ayuda || ''}`.toLocaleLowerCase('es').includes(q));
                  if (primero) elegirTipo(primero);
                }}
                className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400" />
              <div className="mt-2 space-y-3">
                {GRUPOS.map(g => {
                  const q = buscarTipo.trim().toLocaleLowerCase('es');
                  const tipos = q ? g.tipos.filter(t => `${t.label} ${t.ayuda || ''} ${g.grupo}`.toLocaleLowerCase('es').includes(q)) : g.tipos;
                  if (!tipos.length) return null;
                  return (
                  <div key={g.grupo}>
                    <p className="px-1 pb-1 text-[11px] font-black uppercase tracking-wide text-slate-500">{g.grupo}</p>
                    <div className="grid grid-cols-2 gap-1">
                    {tipos.map(t => {
                      // A shop entry is a type PLUS a role: «Precio» and «Moneda»
                      // are the same type and must not both light up.
                      const elegido = tipo === t.id && (config.rol || undefined) === t.rol
                        && (t.id !== 'compra' || (config.modo || 'carrito') === t.modo)
                        && (t.id !== 'comunidad' || config.criterio === t.criterio);
                      return (
                      <button key={t.id + (t.rol || '') + (t.modo || '') + (t.criterio || '')} aria-pressed={elegido} onClick={() => elegirTipo(t)}
                        className={cn('w-full flex flex-col justify-center gap-0.5 px-2.5 min-h-12 rounded-lg text-left border transition-colors',
                          elegido ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-transparent hover:bg-slate-50')}>
                        <span className="text-xs font-bold">{t.label}</span>
                        {t.ayuda && <span className="text-[11px] leading-snug text-slate-500">{t.ayuda}</span>}
                      </button>
                      );
                    })}
                    </div>
                  </div>
                  );
                })}
                {buscarTipo.trim() && !GRUPOS.some(g => g.tipos.some(t => `${t.label} ${t.ayuda || ''}`.toLocaleLowerCase('es').includes(buscarTipo.trim().toLocaleLowerCase('es')))) && (
                  <p className="px-1 text-xs text-slate-500">Ningún tipo se llama así. Prueba con «texto», «fecha» o «lista».</p>
                )}
              </div>
              </>) : (
                <div className="mt-1 flex items-center justify-between gap-2 min-h-11 px-3 rounded-xl border border-emerald-200 bg-emerald-50/60">
                  <span className="text-sm font-bold text-emerald-800 truncate">{GRUPOS.flatMap(g => g.tipos).find(t => t.id === tipo && (config.rol || undefined) === t.rol && (t.id !== 'comunidad' || config.criterio === t.criterio))?.label || tipo}</span>
                  <button type="button" onClick={() => setTiposAbiertos(true)} className="shrink-0 h-9 px-2 text-xs font-bold text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline">Cambiar</button>
                </div>
              )}
            </div>
          )}

          {/* ── OPCIONES DE UNA LISTA ─────────────────────────────────────── */}
          {CON_OPCIONES.has(tipo) && (
            <div>
              <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Opciones</span>
              <div className="mt-1 space-y-1">
                {opciones.map((o, i) => (
                  <div key={o.id || i}>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setColorDe(colorDe === i ? null : i)} aria-label={`Color de la opción ${i + 1}`} aria-expanded={colorDe === i}
                      title="Color de la etiqueta"
                      className="w-7 h-7 shrink-0 rounded-full border border-slate-200 grid place-items-center hover:ring-2 hover:ring-slate-200">
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: o.color || '#e2e8f0' }} />
                    </button>
                    <input value={o.label} placeholder={`Opción ${i + 1}`} aria-label={`Opción ${i + 1}`}
                      onChange={e => setOpciones(os => os.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setOpciones(os => [...os, { label: '' }]); } }}
                      className="flex-1 h-11 px-3 border border-slate-200 rounded-xl text-base sm:text-sm outline-none focus:border-emerald-400" />
                    <button onClick={() => setOpciones(os => os.map((x, j, all) => j === i - 1 ? all[i] : j === i ? all[i - 1] : x))} disabled={i === 0}
                      aria-label={`Subir la opción ${i + 1}`} className="w-8 h-11 grid place-items-center text-slate-300 hover:text-slate-700 disabled:opacity-30">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => setOpciones(os => os.map((x, j, all) => j === i + 1 ? all[i] : j === i ? all[i + 1] : x))} disabled={i === opciones.length - 1}
                      aria-label={`Bajar la opción ${i + 1}`} className="w-8 h-11 grid place-items-center text-slate-300 hover:text-slate-700 disabled:opacity-30">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button onClick={() => setOpciones(os => os.filter((_, j) => j !== i))}
                      aria-label="Quitar la opción"
                      className="w-11 h-11 grid place-items-center text-slate-300 hover:text-rose-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {colorDe === i && (
                    <div role="radiogroup" aria-label={`Color de ${o.label || `la opción ${i + 1}`}`} className="mt-1 ml-8 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 p-2">
                      <button type="button" role="radio" aria-checked={!o.color} onClick={() => { setOpciones(os => os.map((x, n) => n === i ? { ...x, color: null } : x)); setColorDe(null); }}
                        className={cn('h-7 px-2 rounded-md text-[11px] font-bold text-slate-500 bg-white border', !o.color ? 'border-slate-900' : 'border-slate-200')}>Sin color</button>
                      {COLORES_OPCION.map(([nombre, hex]) => (
                        <button key={hex} type="button" role="radio" aria-checked={o.color === hex} aria-label={nombre} title={nombre}
                          onClick={() => { setOpciones(os => os.map((x, n) => n === i ? { ...x, color: hex } : x)); setColorDe(null); }}
                          className={cn('h-7 px-2 rounded-md text-[11px] font-semibold', o.color === hex && 'ring-2 ring-offset-1 ring-slate-900')}
                          style={{ backgroundColor: hex + '33', color: hex }}>{nombre}</button>
                      ))}
                    </div>
                  )}
                  </div>
                ))}
                <button onClick={() => setOpciones(os => [...os, { label: '' }])}
                  className="inline-flex items-center gap-1 h-11 px-2 text-xs font-bold text-slate-400 hover:text-emerald-600">
                  <Plus className="w-3.5 h-3.5" /> Añadir opción
                </button>
                <p className="px-1 text-[11px] text-slate-400">Enter añade otra opción debajo.</p>
              </div>
              {editando && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Renombrar una opción no cambia ninguna fila: se guarda su identificador, no su texto.
                </p>
              )}
            </div>
          )}

          {/* ── EL BOTÓN DE COMPRA: se puede cambiar su forma sin crearlo otra vez ── */}
          {tipo === 'compra' && editando && (
            <div>
              <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Qué hace el botón</span>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                {GRUPOS.flatMap(g => g.tipos).filter(t => t.id === 'compra').map(t => (
                  <button key={t.modo} type="button" onClick={() => setConfig((c: any) => ({ ...c, modo: t.modo }))}
                    className={cn('px-2.5 py-2 rounded-lg border text-left transition-colors', (config.modo || 'carrito') === t.modo ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 hover:bg-slate-50')}>
                    <span className="block text-xs font-bold">{t.label.replace('Botón de ', '').replace(/^./, ch => ch.toUpperCase())}</span>
                    <span className="block text-[10px] text-slate-400">{t.ayuda}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── NOTA DE LA COMUNIDAD: quién puede puntuar ──────────────────── */}
          {tipo === 'comunidad' && config.criterio !== 'media' && (
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-0.5" checked={!!config.solo_compradores}
                onChange={e => setConfig((c: any) => ({ ...c, solo_compradores: e.target.checked }))} />
              <span className="text-xs font-bold text-slate-600">
                Sólo puntúa quien lo compró a través de la plataforma
                <span className="block text-[11px] font-medium text-slate-400">
                  Se vota en la página de cada fila con el bloque «Valoración». Con menos de 3 votos no hay nota: la celda dice cuántos lleva («1 de 3 votos»).
                </span>
              </span>
            </label>
          )}

          {/* ── EL PORCENTAJE, COMO BARRA DE AVANCE (2026-10-18) ──────────── */}
          {tipo === 'porcentaje' && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={config.barra !== false}
                onChange={e => setConfig((c: any) => ({ ...c, barra: e.target.checked }))} />
              <span className="text-xs font-bold text-slate-600">Mostrar como barra de avance</span>
              <span className="text-[11px] text-slate-400">naranja hasta el 50 %, azul hasta el 99 %, verde al 100 %</span>
            </label>
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
                    {[['En esta página', enPagina], [proyecto?.raiz ? `En «${proyecto.raiz.titulo}»` : 'De este proyecto', delProyecto], ...(otrasAbiertas ? [['Otros proyectos', otras]] : [])].map(([titulo, lista]: any) => lista.length > 0 && (
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
                    {!otrasAbiertas && otras.length > 0 && (
                      <button type="button" onClick={() => setVerOtras(true)}
                        className="w-full flex items-center justify-center gap-1.5 h-10 rounded-lg border border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700">
                        <Link2 className="h-3.5 w-3.5" /> Conectar con otros proyectos <span className="text-slate-400">({otras.length})</span>
                      </button>
                    )}
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
                placeholder="Escribe una fórmula…"
                className="mt-1 w-full h-11 px-3 border border-slate-200 rounded-xl font-mono text-base sm:text-sm outline-none focus:border-emerald-400" />
              <p className="mt-1 text-[11px] text-slate-500">Ejemplo: <span className="font-mono">{'{Precio} * {Unidades}'}</span></p>
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
          ) : (
            <button onClick={onCerrar} className="inline-flex items-center h-11 px-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
          )}
          <div className="flex items-center gap-2 min-w-0">
            {!nombre.trim() && !editando && <span className="text-[11px] font-bold text-slate-400 truncate">Ponle un nombre para continuar</span>}
            <button onClick={guardar} disabled={guardando || !nombre.trim() || (tipo === 'relacion' && !config.tabla_destino)}
              className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-40 hover:bg-slate-800">
              {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
              {editando ? 'Guardar' : tipo === 'relacion' ? 'Crear el enlace' : 'Crear columna'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
