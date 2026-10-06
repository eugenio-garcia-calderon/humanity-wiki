// ============================================================================
// TABLAS · LO COMÚN A TODAS LAS VISTAS (2026-10-05, carril «bd»)
// ============================================================================
// Una vista es una manera de MIRAR la misma tabla: tabla, galería, tablero,
// lista, calendario, línea de tiempo, gráfico o formulario. Lo que comparten
// —qué es una vista, cómo se agrupa, qué operadores tiene cada tipo— vive aquí
// para que las ocho formas agrupen y filtren exactamente igual. Si cada una
// agrupara a su manera, la misma tabla contaría «7 en curso» en el tablero y
// «6 en curso» en el gráfico, y nadie sabría cuál creer.
//
// FILTRAR Y ORDENAR LO HACE EL SERVIDOR (`src/server/bd/vistas.ts`), porque
// la mitad de las columnas —fórmulas y agregados— solo existen allí. AGRUPAR
// SE HACE AQUÍ: para pintar columnas de tablero hace falta saber el orden y el
// color de las opciones, los grupos vacíos y cuáles ha escondido quien edita,
// y todo eso es de quien pinta.
import type { Celda, Columna } from './Celda';
import { formatear } from './Celda';

export type Fila = {
  id: string;
  pagina_id?: string | null;
  pagina?: { titulo: string; imagen: string | null; icono: string | null; resumen: string; descripcion?: string | null; encuadre?: { x: number; y: number } | null } | null;
  orden?: number;
  celdas: Record<string, Celda>;
  apuntados?: Record<string, any[]>;
  archivos?: Record<string, any[]>;
  recurrencia?: Recurrencia | null;
};

export type Recurrencia = {
  cada: number;
  unidad: 'dia' | 'semana' | 'mes';
  modo: 'al_completar' | 'calendario';
  columna_fecha?: string | null;
  columna_hecho?: string | null;
  proxima?: string | null;
};

export type Forma = 'tabla' | 'galeria' | 'tablero' | 'lista' | 'calendario' | 'linea' | 'grafico' | 'formulario';

export type Filtro = { columna_id: string; operador: string; valor?: any };
export type GrupoFiltros = { y_o: 'y' | 'o'; reglas: Array<Filtro | GrupoFiltros> };

export type ConfigVista = {
  /** El segundo nivel de agrupación (Notion: «subgrupos»). */
  subagrupar_por?: string | null;
  /** Grupos escondidos, por clave. Sirve igual para columnas del tablero. */
  grupos_ocultos?: string[];
  /** No enseñar los grupos que se quedan sin filas. */
  ocultar_vacios?: boolean;
  /** Fechas por mes, semana o día al agrupar por una fecha. */
  fecha_por?: 'dia' | 'semana' | 'mes' | 'anyo';
  /** Qué propiedades se ven en las tarjetas (tablero, lista, calendario). */
  propiedades?: string[];
  /** Calendario y línea de tiempo. */
  fecha_columna?: string | null;
  fecha_fin_columna?: string | null;
  escala?: 'dia' | 'semana' | 'mes';
  /** Tabla: los subelementos se pintan debajo de su madre (sí, si no se dice). */
  anidar?: boolean;
  /** Tablero: la imagen de la página en la tarjeta. */
  portada?: boolean;
  /** Gráfico (ver `Grafico.tsx`). */
  grafico?: {
    tipo?: 'barras' | 'barras_h' | 'lineas' | 'area' | 'circular' | 'anillo' | 'numero';
    eje?: string | null;
    operacion?: 'contar' | 'suma' | 'media' | 'minimo' | 'maximo';
    valor?: string | null;
    orden?: 'eje' | 'valor_desc' | 'valor_asc';
    acumulado?: boolean;
    alto?: number;
  };
  /** Formulario (ver `FormularioVista.tsx`). */
  formulario?: {
    titulo?: string;
    descripcion?: string;
    campos?: Array<{ columna_id: string; obligatorio?: boolean; ayuda?: string; etiqueta?: string }>;
    gracias?: string;
    boton?: string;
    publico?: boolean;
    /** Lo pone el servidor; el cliente solo lo lee. */
    token?: string;
    /** Pide un enlace nuevo; el servidor lo borra al atenderlo. */
    regenerar_token?: boolean;
  };
};

export type Vista = {
  /** `null` = la vista «de siempre», que todavía no está guardada. */
  id: string | null;
  nombre: string;
  forma: Forma;
  filtros: Filtro[] | GrupoFiltros;
  orden_por: Array<{ columna_id: string; direccion: 'asc' | 'desc' }>;
  agrupar_por: string | null;
  ocultas: string[];
  config: ConfigVista;
  usuario_id?: string | null;
};

export const FORMAS: Array<{ forma: Forma; label: string; desc: string }> = [
  { forma: 'tabla', label: 'Tabla', desc: 'Filas y columnas' },
  { forma: 'galeria', label: 'Galería', desc: 'Tarjetas con imagen' },
  { forma: 'tablero', label: 'Tablero', desc: 'Columnas por estado, kanban' },
  { forma: 'lista', label: 'Lista', desc: 'Una línea por elemento' },
  { forma: 'calendario', label: 'Calendario', desc: 'Por una fecha, mes a mes' },
  { forma: 'linea', label: 'Línea de tiempo', desc: 'Barras de inicio a fin' },
  { forma: 'grafico', label: 'Gráfico', desc: 'Barras, líneas o circular' },
  { forma: 'formulario', label: 'Formulario', desc: 'Un enlace público: cada respuesta crea una fila' },
];

export const nombreForma = (f: string) => FORMAS.find(x => x.forma === f)?.label || 'Tabla';

/** La vista sin guardar: la que se ve cuando una tabla no tiene ninguna. */
export const vistaVirtual = (forma: Forma): Vista => ({
  id: null, nombre: nombreForma(forma), forma, filtros: [], orden_por: [], agrupar_por: null, ocultas: [], config: {},
});

/** Lo que llega del servidor, con todo lo que pueda faltar ya relleno. */
export function normalizarVista(v: any): Vista {
  return {
    id: v.id ?? null,
    nombre: v.nombre || nombreForma(v.forma),
    forma: (FORMAS.some(f => f.forma === v.forma) ? v.forma : 'tabla') as Forma,
    filtros: v.filtros ?? [],
    orden_por: Array.isArray(v.orden_por) ? v.orden_por : [],
    agrupar_por: v.agrupar_por || null,
    ocultas: Array.isArray(v.ocultas) ? v.ocultas : [],
    config: v.config && typeof v.config === 'object' ? v.config : {},
    usuario_id: v.usuario_id ?? null,
  };
}

// ── FILTROS ─────────────────────────────────────────────────────────────────

export const esGrupo = (x: any): x is GrupoFiltros => !!x && typeof x === 'object' && Array.isArray(x.reglas);

/** Siempre como grupo: la lista vieja se lee como «todas con Y». */
export const comoGrupo = (f: Filtro[] | GrupoFiltros | null | undefined): GrupoFiltros =>
  !f ? { y_o: 'y', reglas: [] } : Array.isArray(f) ? { y_o: 'y', reglas: f } : esGrupo(f) ? f : { y_o: 'y', reglas: [] };

/** Cuántas reglas hay de verdad (para el número del botón «Filtrar»). */
export function cuantasReglas(f: Filtro[] | GrupoFiltros | null | undefined): number {
  return comoGrupo(f).reglas.reduce((n, r) => n + (esGrupo(r) ? cuantasReglas(r) : 1), 0);
}

export const ETIQUETA_OPERADOR: Record<string, string> = {
  es: 'es', no_es: 'no es', contiene: 'contiene', no_contiene: 'no contiene',
  mayor: 'mayor que', mayor_igual: 'mayor o igual que', menor: 'menor que', menor_igual: 'menor o igual que',
  esta_vacia: 'está vacía', no_esta_vacia: 'no está vacía', es_verdadero: 'está marcada', es_falso: 'no está marcada',
  antes_de: 'antes de', despues_de: 'después de',
};

export const SIN_VALOR = new Set(['esta_vacia', 'no_esta_vacia', 'es_verdadero', 'es_falso']);

const NUMERICOS = new Set(['numero', 'moneda', 'porcentaje', 'duracion', 'valoracion']);
export const APUNTAN = new Set(['persona', 'proyecto', 'publicacion', 'relacion']);
export const FICHEROS = new Set(['imagen', 'video', 'documento']);
export const CALCULADAS = new Set(['formula', 'agregado', 'condicional']);

/** Los operadores que tienen sentido para cada tipo, en el orden del menú. */
export function operadoresDe(tipo: string): string[] {
  const vacio = ['esta_vacia', 'no_esta_vacia'];
  if (tipo === 'casilla') return ['es_verdadero', 'es_falso'];
  if (NUMERICOS.has(tipo)) return ['es', 'no_es', 'mayor', 'menor', 'mayor_igual', 'menor_igual', ...vacio];
  if (tipo === 'fecha') return ['es', 'antes_de', 'despues_de', ...vacio];
  if (tipo === 'seleccion') return ['es', 'no_es', ...vacio];
  if (tipo === 'seleccion_multiple' || APUNTAN.has(tipo)) return ['contiene', 'no_contiene', ...vacio];
  if (FICHEROS.has(tipo)) return vacio;
  if (CALCULADAS.has(tipo)) return ['es', 'no_es', 'contiene', 'mayor', 'menor', 'mayor_igual', 'menor_igual', 'es_verdadero', 'es_falso', ...vacio];
  return ['contiene', 'no_contiene', 'es', 'no_es', ...vacio];
}

/** Las fechas relativas que entiende el servidor (se resuelven al leer). */
export const FECHAS_RELATIVAS: Array<{ valor: string; label: string }> = [
  { valor: '@hoy', label: 'Hoy' }, { valor: '@manana', label: 'Mañana' }, { valor: '@ayer', label: 'Ayer' },
  { valor: '@-7d', label: 'Hace una semana' }, { valor: '@+7d', label: 'Dentro de una semana' },
  { valor: '@-30d', label: 'Hace un mes' }, { valor: '@+30d', label: 'Dentro de un mes' },
];

// ── AGRUPAR ─────────────────────────────────────────────────────────────────

export type Grupo = {
  /** Identidad estable del grupo: id de opción, id de persona, «true»… */
  clave: string;
  etiqueta: string;
  color?: string | null;
  vacio: boolean;
  filas: Fila[];
  /** El valor que hay que escribir en la celda para que una fila caiga aquí. */
  valor: any;
};

/** ¿Por qué propiedades se puede agrupar? Todas menos ficheros y texto largo:
 *  agrupar por un párrafo da un grupo por fila, que es no agrupar. */
export const agrupable = (c: Columna) => !FICHEROS.has(c.tipo) && c.tipo !== 'texto_largo';

/** ¿Puede ser columna de tablero? Las que se pueden ARRASTRAR: mover una
 *  tarjeta tiene que poder escribir el valor nuevo. */
export const agrupableTablero = (c: Columna) =>
  ['seleccion', 'seleccion_multiple', 'persona', 'casilla', 'relacion'].includes(c.tipo);

const pad = (n: number) => String(n).padStart(2, '0');
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** La clave de grupo de una fecha según la precisión pedida. */
function claveFecha(v: string, por: ConfigVista['fecha_por'] = 'mes'): { clave: string; etiqueta: string } {
  const [a, m, d] = String(v).split('-');
  if (por === 'anyo' || !m) return { clave: a, etiqueta: a };
  if (por === 'mes' || !d) return { clave: `${a}-${m}`, etiqueta: `${MESES[Number(m) - 1]} ${a}` };
  if (por === 'semana') {
    // El lunes de esa semana, que es como se cuentan aquí las semanas.
    const f = new Date(Number(a), Number(m) - 1, Number(d));
    f.setDate(f.getDate() - ((f.getDay() + 6) % 7));
    const c = `${f.getFullYear()}-${pad(f.getMonth() + 1)}-${pad(f.getDate())}`;
    return { clave: c, etiqueta: `Semana del ${f.getDate()} de ${MESES[f.getMonth()]}` };
  }
  return { clave: v, etiqueta: `${Number(d)} de ${MESES[Number(m) - 1]} ${a}` };
}

/** Los grupos de una fila en una columna. Una fila con varias etiquetas o
 *  varias personas está en VARIOS grupos, como en Notion: si solo cayera en
 *  el primero, filtrar por la segunda etiqueta y agrupar no cuadrarían. */
function clavesDe(f: Fila, col: Columna, cfg: ConfigVista): Array<{ clave: string; etiqueta: string; color?: string | null; valor: any }> {
  const c = f.celdas[col.id];
  if (!c || c.estado !== 'ok') return [];
  const v = c.valor;
  if (col.tipo === 'seleccion') {
    const o = col.opciones?.find(x => x.id === v);
    return [{ clave: String(v), etiqueta: o?.label ?? String(v), color: o?.color, valor: v }];
  }
  if (col.tipo === 'seleccion_multiple') {
    return (Array.isArray(v) ? v : [v]).map(id => {
      const o = col.opciones?.find(x => x.id === id);
      return { clave: String(id), etiqueta: o?.label ?? String(id), color: o?.color, valor: id };
    });
  }
  if (APUNTAN.has(col.tipo)) {
    const ap = f.apuntados?.[col.id] || [];
    return ap.map(a => ({ clave: String(a.id), etiqueta: a.etiqueta || 'Sin nombre', valor: a.id }));
  }
  if (col.tipo === 'casilla') return [{ clave: v ? 'true' : 'false', etiqueta: v ? 'Marcado' : 'Sin marcar', valor: !!v }];
  if (col.tipo === 'fecha') { const k = claveFecha(String(v), cfg.fecha_por); return [{ ...k, valor: v }]; }
  return [{ clave: String(Array.isArray(v) ? v.join(', ') : v), etiqueta: formatear(c, col, { apuntados: f.apuntados?.[col.id] }) || String(v), valor: v }];
}

/**
 * Agrupa las filas por una columna.
 *
 * EL ORDEN DE LOS GRUPOS ES EL DE LAS OPCIONES, no el alfabético: quien puso
 * «Por hacer · En curso · Hecho» quiere ver las columnas así, de izquierda a
 * derecha, y no «En curso · Hecho · Por hacer». Las opciones sin filas salen
 * igual (un tablero sin la columna «Hecho» vacía no sirve para arrastrar a
 * ella), salvo que la vista pida esconder los vacíos. «Sin …» va al final.
 */
export function agruparFilas(filas: Fila[], col: Columna, cfg: ConfigVista = {}, opciones: { conVacios?: boolean; sinSiempre?: boolean } = {}): Grupo[] {
  const mapa = new Map<string, Grupo>();
  const conVacios = opciones.conVacios ?? !cfg.ocultar_vacios;
  if (conVacios && (col.tipo === 'seleccion' || col.tipo === 'seleccion_multiple')) {
    for (const o of col.opciones || []) mapa.set(o.id, { clave: o.id, etiqueta: o.label, color: o.color, vacio: false, filas: [], valor: o.id });
  }
  if (conVacios && col.tipo === 'casilla') {
    mapa.set('false', { clave: 'false', etiqueta: 'Sin marcar', vacio: false, filas: [], valor: false });
    mapa.set('true', { clave: 'true', etiqueta: 'Marcado', vacio: false, filas: [], valor: true });
  }
  const sin: Grupo = { clave: '', etiqueta: `Sin ${col.nombre.toLowerCase()}`, vacio: true, filas: [], valor: null };
  for (const f of filas) {
    const ks = clavesDe(f, col, cfg);
    if (!ks.length) { sin.filas.push(f); continue; }
    for (const k of ks) {
      if (!mapa.has(k.clave)) mapa.set(k.clave, { ...k, vacio: false, filas: [] });
      mapa.get(k.clave)!.filas.push(f);
    }
  }
  let grupos = [...mapa.values()];
  // Las que no son opciones se ordenan por su clave: fechas de antes a
  // después, números de menor a mayor, nombres por orden alfabético.
  if (!(col.tipo === 'seleccion' || col.tipo === 'seleccion_multiple' || col.tipo === 'casilla')) {
    grupos.sort((a, b) => a.clave.localeCompare(b.clave, 'es', { numeric: true }));
  }
  // «Sin …» vacío solo donde sirve para soltar algo en él (el tablero).
  if (sin.filas.length || (conVacios && opciones.sinSiempre)) grupos.push(sin);
  if (cfg.ocultar_vacios) grupos = grupos.filter(g => g.filas.length);
  return grupos;
}

/** El valor que hay que escribir para mover una fila de un grupo a otro. En
 *  las columnas de varios valores se CAMBIA el de origen por el de destino y
 *  se conservan los demás: arrastrar una tarea de Ana a Luis no le quita
 *  a Marta, que también estaba. */
export function valorAlMover(f: Fila, col: Columna, desde: Grupo | null, hacia: Grupo): any {
  const varios = col.tipo === 'seleccion_multiple' || (APUNTAN.has(col.tipo) && col.config?.varios);
  if (!varios) return hacia.vacio ? null : hacia.valor;
  const c = f.celdas[col.id];
  const actuales: string[] = c && c.estado === 'ok' && Array.isArray(c.valor) ? c.valor.map(String) : [];
  let nuevos = actuales.filter(x => !desde || desde.vacio || x !== String(desde.valor));
  if (hacia.vacio) nuevos = [];
  else if (!nuevos.includes(String(hacia.valor))) nuevos.push(String(hacia.valor));
  return nuevos;
}

// ── TÍTULO Y PROPIEDADES DE UNA TARJETA ─────────────────────────────────────

export function tituloDe(f: Fila, columnaTitulo: string | null | undefined): string {
  const c = columnaTitulo ? f.celdas[columnaTitulo] : null;
  const t = c && c.estado === 'ok' ? String(c.valor) : '';
  return t || f.pagina?.titulo || 'Sin título';
}

/** Las propiedades que se ven en una tarjeta: las elegidas o, si nadie eligió,
 *  las tres primeras que no son el título. */
export function propiedadesTarjeta(columnas: Columna[], cfg: ConfigVista, columnaTitulo: string | null | undefined, excluir: string[] = []): Columna[] {
  const fuera = new Set([columnaTitulo || '', ...excluir]);
  if (Array.isArray(cfg.propiedades)) {
    return cfg.propiedades.map(id => columnas.find(c => c.id === id)).filter((c): c is Columna => !!c && !fuera.has(c.id));
  }
  return columnas.filter(c => !fuera.has(c.id)).slice(0, 3);
}

// ── FECHAS ──────────────────────────────────────────────────────────────────

/** «AAAA-MM-DD» de una fecha local, sin pasar por UTC (ver `Celda.tsx`). */
export const isoLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Una fecha completa guardada, como fecha local. `null` si es solo mes o año. */
export function deIso(v: any): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v ?? ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}
export const sumarDias = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const diasEntre = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);
export { MESES };
