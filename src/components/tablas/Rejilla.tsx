import { Fragment, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, AlertTriangle, Loader2, Table2, Settings2, ArrowUpRight, SlidersHorizontal, Check, Link2, Pencil, Eye, EyeOff, ChevronDown, ChevronRight, Repeat, CornerDownRight, GitBranch, Link as LinkIcon, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Galeria, { ANCHO_TARJETA } from './Galeria';
import { VELOCIDAD_CARRUSEL } from './GaleriaCarrusel';

/** Las cinco velocidades del carrusel, en píxeles por segundo. */
const VELOCIDADES = [{ v: 12, l: '1', t: 'Muy lenta' }, { v: 28, l: '2', t: 'Lenta' }, { v: 50, l: '3', t: 'Media' }, { v: 80, l: '4', t: 'Rápida' }, { v: 120, l: '5', t: 'Muy rápida' }];
import type { TamanoGaleria } from '../../utils/bloques';
import { useSitio } from '../sitio/ContextoSitio';
import { slugDe } from '../sitio/sitioWeb';
import { recordarRuta } from '../../utils/rutasLegibles';
import ConexionesBD, { type Conexion } from './ConexionesBD';
import EditorColumna from './EditorColumna';
import CeldaTabla, { type Celda, type Columna } from './Celda';
import { useEsMovil } from '../../hooks/useEsMovil';
import { propiedadesTarjeta } from '../bloquesDatos/ficha/modelo';
import { cn } from '../../utils/cn';
import { tonoDe, COLORES } from '../../utils/coloresBloque';
import BarraVista, { Desplegable, claseBoton, Cuenta } from './BarraVista';
import EditorRecurrencia from './EditorRecurrencia';
import Tablero from './Tablero';
import Lista from './Lista';
import FormularioVista from './FormularioVista';
import Calendario from './Calendario';
import LineaTiempo from './LineaTiempo';
import { NuevoElemento, MarcaRecurrente } from './Tarjetas';
// recharts pesa: solo se baja cuando hay un gráfico en pantalla.
const Grafico = lazy(() => import('./Grafico'));
import {
  FORMAS, APUNTAN, agruparFilas, normalizarVista, vistaVirtual, valorAlMover,
  type Fila, type Forma, type Grupo, type Vista,
} from './vistaUtil';

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

/** Lo que guarda quien la incrusta: una forma (`galeria`, `tabla`… la vista
 *  «de siempre», sin guardar) o `vista:<id>`, una vista guardada de la tabla
 *  (2026-10-05). Va en el mismo campo del bloque (`vistaBd`) para que las
 *  páginas que ya existían sigan abriendo igual sin migrar nada. */
export type FormaVista = 'galeria' | 'carrusel' | 'tabla';

/** Colores para las columnas nuevas del tablero, en el orden en que salen. */
const PALETA = ['#64748b', '#d97706', '#16a34a', '#2563eb', '#9333ea', '#db2777', '#0891b2', '#dc2626'];

/** EL RECUADRO DE CADA GRUPO DE LA GALERÍA (2026-10-18, Eugenio): un fondo
 *  suave, un borde un punto más oscuro y una sombra ligera para que destaque
 *  sobre el blanco. Gris por defecto; el color se elige en Configuración → Grupos. */
export const COLORES_GRUPO: Record<string, { nombre: string; caja: string; muestra: string }> = {
  gris:    { nombre: 'Gris',    caja: 'bg-slate-100/70 border-slate-300/70', muestra: 'bg-slate-200' },
  blanco:  { nombre: 'Blanco',  caja: 'bg-white border-slate-200',         muestra: 'bg-white border border-slate-300' },
  azul:    { nombre: 'Azul',    caja: 'bg-sky-50 border-sky-200/80',       muestra: 'bg-sky-200' },
  verde:   { nombre: 'Verde',   caja: 'bg-emerald-50 border-emerald-200/80', muestra: 'bg-emerald-200' },
  ambar:   { nombre: 'Ámbar',   caja: 'bg-amber-50 border-amber-200/80',   muestra: 'bg-amber-200' },
  rosa:    { nombre: 'Rosa',    caja: 'bg-rose-50 border-rose-200/80',     muestra: 'bg-rose-200' },
  violeta: { nombre: 'Violeta', caja: 'bg-violet-50 border-violet-200/80', muestra: 'bg-violet-200' },
};
const SOMBRA_GRUPO = 'shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_-8px_rgba(15,23,42,0.14)]';

/** La letra del título en galería, según el tamaño elegido. */
const LETRA_TITULO: Record<TamanoGaleria, string> = {
  xxxs: 'text-xs', xxs: 'text-xs', xs: 'text-sm', pequeno: 'text-base', mediano: 'text-lg', grande: 'text-2xl tracking-tight', 'muy-grande': 'text-3xl sm:text-4xl tracking-tight',
};

const PESOS: Array<[ 'fino' | 'normal' | 'negrita', string ]> = [['fino', 'Fino'], ['normal', 'Normal'], ['negrita', 'Negrita']];

/** Un grupo plegable de ajustes: lo de dentro se ve al abrirlo, sin ocupar el resto. */
function Grupo({ titulo, abierto = false, children }: { titulo: string; abierto?: boolean; children: React.ReactNode }) {
  return (
    <details open={abierto} className="group rounded-lg border border-slate-100">
      <summary className="flex h-8 cursor-pointer list-none items-center justify-between px-2 text-[11px] font-black uppercase tracking-wide text-slate-500 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        {titulo}
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-0.5 px-1 pb-2">{children}</div>
    </details>
  );
}

/** Opciones en fila, compactas: el valor elegido se marca y se ve con su propio grosor o texto. */
function Chips<T extends string>({ etiqueta, valor, onCambiar, opciones }: { etiqueta: string; valor: T; onCambiar: (v: T) => void; opciones: Array<[T, string]> }) {
  return (
    <div className="flex items-center justify-between gap-2 px-1 py-0.5">
      <span className="text-xs font-bold text-slate-600">{etiqueta}</span>
      <div role="radiogroup" aria-label={etiqueta} className="flex rounded-lg bg-slate-100 p-0.5">
        {opciones.map(([v, l]) => (
          <button key={v} role="radio" aria-checked={valor === v} onClick={() => onCambiar(v)}
            className={cn('h-6 px-2 rounded-md text-[11px]', valor === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>{l}</button>
        ))}
      </div>
    </div>
  );
}

/** Una petición de datos que no se queda colgada: si no contesta en 5 s, o contesta con un error del servidor, se
 *  vuelve a pedir (un reinicio del servidor deja conexiones sin respuesta y el navegador esperaba hasta un minuto). */
async function pedirDatos(url: string, intentos = 3): Promise<Response> {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { credentials: 'include', signal: AbortSignal.timeout(5000) });
      if (r.status < 500 || i >= intentos) return r;
    } catch (e) {
      if (i >= intentos) throw e;
    }
    await new Promise(res => setTimeout(res, 500 * i));
  }
}

export default function Rejilla({ tablaId, editable = true, alto, vista: vistaInicial, onCambiarVista, color, tamano = 'mediano', onCambiarTamano, tamanoTitulo = 'mediano', onCambiarTamanoTitulo, ocultarMandosPublica = false, onCambiarOcultarMandos, tituloAlineacion = 'centro', onCambiarTituloAlineacion, tamanoNombre, onCambiarTamanoNombre, visibles, onCambiarVisibles, tablasPagina, tituloOculto = false, onCambiarTituloOculto, tituloColor, onCambiarTituloColor, tituloPeso = 'negrita', onCambiarTituloPeso, nombreArriba = false, onCambiarNombreArriba, pesoNombre = 'negrita', onCambiarPesoNombre }: {
  tablaId: string;
  editable?: boolean;
  /** Alto máximo cuando va incrustada en una página. Suelta ocupa lo que haya. */
  alto?: number;
  /** Galería o tabla (2026-09-30). Sin valor, tabla: es lo que se veía hasta
   *  hoy en la herramienta «Tablas». El bloque de página pasa `galeria`. */
  vista?: FormaVista | string;
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
  /** Letra del nombre bajo cada tarjeta (XS…XL). Sin valor, la de siempre. */
  tamanoNombre?: TamanoGaleria;
  onCambiarTamanoNombre?: (t: TamanoGaleria) => void;
  /** Las demás bases de datos de la misma página, para enlazar con ellas
   *  primero (2026-10-02). */
  tablasPagina?: string[];
  /** Ocultar el título al público (2026-10-02, Eugenio). Quien edita lo sigue
   *  viendo, atenuado y con el aviso. */
  tituloOculto?: boolean;
  /** Título y descripción al centro o a la izquierda (galería). */
  tituloAlineacion?: 'centro' | 'izquierda';
  onCambiarTituloAlineacion?: (a: 'centro' | 'izquierda') => void;
  /** Quitar filtrar, ordenar y buscar de la web publicada (bases pequeñas). */
  ocultarMandosPublica?: boolean;
  onCambiarOcultarMandos?: (v: boolean) => void;
  onCambiarTituloOculto?: (v: boolean) => void;
  /** Color (una clave de `COLORES`, en texto) y grosor del título; quien edita los cambia. */
  tituloColor?: string;
  onCambiarTituloColor?: (c: string | undefined) => void;
  tituloPeso?: 'fino' | 'normal' | 'negrita';
  onCambiarTituloPeso?: (p: 'fino' | 'normal' | 'negrita') => void;
  /** El nombre de cada tarjeta, encima de la imagen o debajo, y su grosor (la vista de galería). */
  nombreArriba?: boolean;
  onCambiarNombreArriba?: (v: boolean) => void;
  pesoNombre?: 'fino' | 'normal' | 'negrita';
  onCambiarPesoNombre?: (p: 'fino' | 'normal' | 'negrita') => void;
  /** Qué propiedades se ven en las tarjetas, y quién lo guarda. */
  visibles?: string[];
  onCambiarVisibles?: (ids: string[]) => void;
}) {
  const [menuProps, setMenuProps] = useState(false);
  const tono = tonoDe(color);
  const tituloTono = tonoDe(tituloColor).texto;
  const SWATCH: Record<string, string> = { gris: 'bg-slate-500', marron: 'bg-amber-800', naranja: 'bg-orange-600', amarillo: 'bg-yellow-600', verde: 'bg-emerald-600', azul: 'bg-sky-600', morado: 'bg-violet-600', rosa: 'bg-pink-600', rojo: 'bg-rose-600' };
  const pesoTitulo = tituloPeso === 'fino' ? 'font-light' : tituloPeso === 'normal' ? 'font-semibold' : 'font-black';
  const esMovil = useEsMovil();
  const navigate = useNavigate();
  const sitio = useSitio();
  // ══ LAS VISTAS GUARDADAS (2026-10-05, carril «bd») ══════════════════════
  // `seleccion` es lo que eligió quien la incrusta: una forma suelta o
  // `vista:<id>`. Las vistas de verdad viven en `bd_vistas` y se piden aparte.
  const [seleccion, setSeleccion] = useState<string>(vistaInicial || 'tabla');
  useEffect(() => { if (vistaInicial) setSeleccion(vistaInicial); }, [vistaInicial]);
  const [vistas, setVistas] = useState<Vista[] | null>(null);
  /** Lo que el visitante de la página publicada filtra u ordena. No se guarda: solo vive en esta carga. */
  const [visitante, setVisitante] = useState<Partial<Pick<Vista, 'filtros' | 'orden_por'>>>({});
  const elegir = (sel: string) => {
    setSeleccion(sel);
    setVisitante({});
    // El tipo del bloque todavía dice «galeria | tabla»; por dentro se guarda
    // cualquier texto, y `vista:<id>` es lo que abre la vista guardada.
    onCambiarVista?.(sel as FormaVista);
  };
  const activa: Vista = useMemo(() => {
    const id = seleccion.startsWith('vista:') ? seleccion.slice(6) : null;
    const lista = vistas || [];
    const porId = id ? lista.find(v => v.id === id) : null;
    if (porId) return porId;
    const forma = (FORMAS.some(f => f.forma === seleccion) ? seleccion : 'tabla') as Forma;
    // Un bloque que dice «galería» abre la primera vista guardada de galería:
    // así una página antigua sigue viéndose igual cuando la tabla ya tiene vistas.
    return (!id && lista.find(v => v.forma === forma)) || vistaVirtual(id ? 'tabla' : forma);
  }, [seleccion, vistas]);
  const vista = activa.forma;
  // Lo que se ve: en el editor, la vista guardada; en la página publicada, la misma con los filtros del visitante encima.
  const mostrada: Vista = useMemo(() => editable ? activa : { ...activa, ...visitante }, [activa, visitante, editable]);
  const [datos, setDatos] = useState<{
    tabla: any; columnas: Columna[]; filas: Fila[]; ciclo?: string[]; total?: number; mostradas?: number;
    columna_titulo?: string | null;
    conexiones?: Conexion[];
  } | null>(null);
  const [cargando, setCargando] = useState(true);
  /** La búsqueda de la barra: `null` cerrada, '' abierta y vacía. */
  const [busca, setBusca] = useState<string | null>(null);
  /** Las tandas de «Mostrar más» pedidas. Vuelve a cero al cambiar de vista o de cuántas filas. */
  const [tandas, setTandas] = useState(0);
  useEffect(() => { setTandas(0); }, [activa.id, activa.config.filas_mostrar]);
  const [fallo, setFallo] = useState<string | null>(null);
  /** `'nueva'` para crear, o la columna que se está editando. */
  const [editorColumna, setEditorColumna] = useState<'nueva' | 'nueva-relacion' | any | null>(null);
  const [plegados, setPlegados] = useState<Set<string>>(new Set());
  /** Las filas madre desplegadas (sus subelementos se ven debajo). */
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  /** La fila cuyo panel de «Repetir…» está abierto. */
  const [repitiendo, setRepitiendo] = useState<string | null>(null);
  const [falloVista, setFalloVista] = useState<string | null>(null);
  const pendienteForm = useRef<{ id: string; cuerpo: Partial<Vista> } | null>(null);
  const relojForm = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cargarVistas = useCallback(async () => {
    try {
      const r = await pedirDatos(`/api/bd/tablas/${tablaId}/vistas`);
      setVistas(r.ok ? (await r.json()).map(normalizarVista) : []);
    } catch { setVistas([]); }
  }, [tablaId]);
  useEffect(() => { cargarVistas(); }, [cargarVistas]);

  // Cada carga lleva su número: si el filtro cambia dos veces seguidas, la
  // respuesta lenta de la primera no puede pisar a la segunda.
  const turno = useRef(0);
  const cargar = useCallback(async () => {
    if (vistas === null) return;
    const mio = ++turno.current;
    setFallo(null);
    const params = new URLSearchParams();
    if (activa.id) params.set('vista', activa.id);
    if (!editable && visitante.filtros) params.set('filtros', JSON.stringify(visitante.filtros));
    if (!editable && visitante.orden_por) params.set('orden', JSON.stringify(visitante.orden_por));
    const qs = params.toString();
    try {
      const r = await pedirDatos(`/api/bd/tablas/${tablaId}${qs ? `?${qs}` : ''}`);
      const j = await r.json();
      if (mio !== turno.current) return;
      if (!r.ok) { setFallo(j.error || 'No se pudo cargar la tabla.'); setDatos(null); }
      else {
        // Antes de pintar: los enlaces de las fichas salen ya por su dirección legible.
        for (const f of (Array.isArray(j?.filas) ? j.filas : [])) recordarRuta(f?.pagina_id, f?.pagina?.ruta);
        setDatos(j);
      }
    } catch (e: any) { if (mio === turno.current) setFallo(e.message); }
    if (mio === turno.current) setCargando(false);
  }, [tablaId, activa.id, vistas === null, visitante, editable]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { cargar(); }, [cargar]);

  /** El visitante cambia el filtro o el orden solo en su pantalla: la vista del autor no se toca. */
  const cambiarVisitante = (parcial: Partial<Vista>) => {
    setVisitante(v => ({
      ...v,
      ...(parcial.filtros !== undefined ? { filtros: parcial.filtros } : {}),
      ...(parcial.orden_por !== undefined ? { orden_por: parcial.orden_por } : {}),
    }));
  };

  /**
   * CAMBIAR LA VISTA ACTIVA (filtro, orden, grupos, ajustes de su forma).
   *
   * Se aplica en pantalla al momento y se guarda en el servidor. La vista «de
   * siempre» (sin guardar) se GUARDA al primer cambio: así filtrar una tabla
   * que nunca tuvo vistas no pide crear una antes, que es lo que haría
   * cualquiera en Notion.
   */
  const cambiarVista = async (parcial: Partial<Vista>) => {
    if (!editable) return;
    setFalloVista(null);
    if (!activa.id) {
      const r = await fetch(`/api/bd/tablas/${tablaId}/vistas`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...activa, ...parcial, id: undefined }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setFalloVista(j.error || 'No se pudo guardar la vista.'); return; }
      await cargarVistas();
      elegir(`vista:${j.id}`);
      return;
    }
    setVistas(vs => (vs || []).map(v => v.id === activa.id ? { ...v, ...parcial } : v));
    // EL EDITOR DEL FORMULARIO GUARDA AL DEJAR DE TECLEAR: cada letra de un
    // título sería un PUT, y dos que llegaran al revés dejarían el texto viejo.
    if (activa.forma === 'formulario' && 'config' in parcial) {
      const id = activa.id;
      pendienteForm.current = { id, cuerpo: parcial };
      if (relojForm.current) clearTimeout(relojForm.current);
      relojForm.current = setTimeout(async () => {
        const p = pendienteForm.current; pendienteForm.current = null;
        if (!p) return;
        const r2 = await fetch(`/api/bd/vistas/${p.id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p.cuerpo) });
        if (!r2.ok) { const j = await r2.json().catch(() => ({})); setFalloVista(j.error || 'No se pudo guardar el formulario.'); }
        // El servidor pone el enlace al abrirlo: se vuelve a leer la vista.
        await cargarVistas();
      }, 500);
      return;
    }
    const r = await fetch(`/api/bd/vistas/${activa.id}`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parcial),
    });
    if (!r.ok) { const j = await r.json().catch(() => ({})); setFalloVista(j.error || 'No se pudo guardar la vista.'); cargarVistas(); return; }
    // Solo lo que cambia lo que se ve vuelve a pedir la tabla: esconder un
    // grupo o cambiar la escala se pinta aquí mismo.
    if ('filtros' in parcial || 'orden_por' in parcial) cargar();
  };

  /** Una vista nueva. Si la tabla aún no tenía ninguna, se guarda también la
   *  «de siempre», para que no desaparezca la pestaña que se estaba mirando. */
  const crearVista = async (forma: Forma) => {
    setFalloVista(null);
    if (!activa.id) {
      await fetch(`/api/bd/tablas/${tablaId}/vistas`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: activa.nombre, forma: activa.forma }),
      });
    }
    const nombre = FORMAS.find(f => f.forma === forma)?.label || 'Vista';
    // Lo que cada forma necesita para no nacer vacía: el tablero, una
    // propiedad por la que hacer columnas.
    const porTablero = forma === 'tablero' ? datos?.columnas.find(c => ['seleccion', 'persona', 'seleccion_multiple', 'casilla'].includes(c.tipo))?.id : null;
    const r = await fetch(`/api/bd/tablas/${tablaId}/vistas`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, forma, agrupar_por: porTablero || null }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setFalloVista(j.error || 'No se pudo crear la vista.'); return; }
    await cargarVistas();
    elegir(`vista:${j.id}`);
  };

  const renombrarVista = async (v: Vista, nombre: string) => {
    if (!v.id) { await cambiarVista({ nombre }); return; }
    setVistas(vs => (vs || []).map(x => x.id === v.id ? { ...x, nombre } : x));
    await fetch(`/api/bd/vistas/${v.id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre }) });
  };
  const duplicarVista = async (v: Vista) => {
    if (!v.id) { await crearVista(v.forma); return; }
    const r = await fetch(`/api/bd/vistas/${v.id}/duplicar`, { method: 'POST', credentials: 'include' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setFalloVista(j.error || 'No se pudo duplicar.'); return; }
    await cargarVistas();
    elegir(`vista:${j.id}`);
  };
  const borrarVista = async (v: Vista) => {
    if (!v.id) return;
    if (!window.confirm(`¿Quitar la vista «${v.nombre}»? Las filas no se tocan.`)) return;
    const r = await fetch(`/api/bd/vistas/${v.id}`, { method: 'DELETE', credentials: 'include' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setFalloVista(j.error || 'No se pudo quitar.'); return; }
    const resto = (vistas || []).filter(x => x.id !== v.id);
    setVistas(resto);
    elegir(resto[0]?.id ? `vista:${resto[0].id}` : 'tabla');
  };

  /** Personas y filas enlazadas que se han visto, para elegirlas en un filtro.
   *  Se acumulan: al filtrar desaparecen filas, y con ellas lo que apuntaban. */
  const conocidos = useRef<Record<string, Map<string, string>>>({});
  useEffect(() => {
    for (const f of datos?.filas || []) for (const [col, lista] of Object.entries(f.apuntados || {})) {
      const m = (conocidos.current[col] ||= new Map());
      for (const a of lista as any[]) if (a?.id) m.set(a.id, a.etiqueta || 'Sin nombre');
    }
  }, [datos]);
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

  // ARRASTRAR A OTRO GRUPO (2026-10-18): soltar una tarjeta en otro grupo le da el valor de ese grupo
  // (su categoría, su estado…), sin abrirla. Con varios valores, cambia el de origen por el de destino.
  const moverAGrupo = async (filaId: string, hacia: Grupo) => {
    if (!colAgr || !datos) return;
    const f = datos.filas.find(x => x.id === filaId);
    if (!f) return;
    const desde = agruparFilas(datos.filas, colAgr, { ...activa.config, ocultar_vacios: false }).find(g => g.filas.some(x => x.id === filaId)) || null;
    if (desde && desde.clave === hacia.clave) return;
    await guardarCeldas(filaId, { [colAgr.id]: valorAlMover(f, colAgr, desde, hacia) });
  };

  // AÑADIR ABRE UN POP-UP (2026-10-14): se escribe el título y se crea; «Ampliar» la crea y la abre en grande.
  const [nuevaEntrada, setNuevaEntrada] = useState(false);
  const [tituloNueva, setTituloNueva] = useState('');
  const anadirFila = () => { setTituloNueva(''); setNuevaEntrada(true); };
  const crearEntrada = async (ampliar: boolean) => {
    const r = await fetch(`/api/bd/tablas/${tablaId}/filas`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: tituloNueva.trim() || 'Sin título' }),
    });
    const j = await r.json().catch(() => ({}));
    setNuevaEntrada(false);
    if (!r.ok) { setFallo(j.error || 'No se pudo crear la entrada.'); return; }
    await cargar();
    if (ampliar && j.id) abrirPagina({ id: j.id, pagina_id: null } as any);
  };

  /** Varias celdas de una vez (tablero, calendario, línea de tiempo). */
  const guardarCeldas = async (filaId: string, celdas: Record<string, any>): Promise<{ error?: string } | void> => {
    const r = await fetch(`/api/bd/filas/${filaId}`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ celdas }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { error: (j.fallos || [])[0]?.error || j.error || 'No se pudo guardar.' };
    await cargar();
    if (Object.keys(celdas).some(k => datos?.columnas.find(c => c.id === k)?.tipo === 'relacion')) avisarCambio();
  };
  const moverFila = async (filaId: string, antesDe: string | null) => {
    await fetch(`/api/bd/filas/${filaId}/mover`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ antes_de: antesDe }),
    });
    await cargar();
  };
  /** Una fila que nace con nombre y con valores (la columna del tablero, el
   *  día del calendario, el grupo donde se pulsó «+ Nuevo»). */
  const crearCon = async (titulo: string, celdas: Record<string, any>) => {
    const r = await fetch(`/api/bd/tablas/${tablaId}/filas`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, celdas }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setFalloVista(j.error || 'No se pudo crear.');
    else if (j.aviso) setFalloVista(j.aviso);
    await cargar();
  };
  /** «Estado» con tres opciones, para el tablero de una tabla que no tiene
   *  ninguna propiedad por la que hacer columnas. */
  const crearEstado = async () => {
    const usados = new Set((datos?.columnas || []).map(c => c.nombre.toLowerCase()));
    let nombre = 'Estado';
    for (let n = 2; usados.has(nombre.toLowerCase()); n++) nombre = `Estado ${n}`;
    const r = await fetch(`/api/bd/tablas/${tablaId}/columnas`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, tipo: 'seleccion', opciones: [
        { label: 'Por hacer', color: PALETA[0] }, { label: 'En curso', color: PALETA[1] }, { label: 'Hecho', color: PALETA[2] },
      ] }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setFalloVista(j.error || 'No se pudo crear la propiedad.'); return; }
    await cambiarVista({ agrupar_por: j.id });
    await cargar();
  };
  /** Subelementos o dependencias: crea sus dos columnas (ver `bd.ts`). */
  const activarFuncion = async (funcion: 'subelementos' | 'dependencias') => {
    const r = await fetch(`/api/bd/tablas/${tablaId}/funciones`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ funcion }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setFalloVista(j.error || 'No se pudo activar.');
    await cargar();
  };
  const anadirOpcion = async (col: Columna, etiqueta: string) => {
    const opciones = [...(col.opciones || []), { label: etiqueta, color: PALETA[(col.opciones || []).length % PALETA.length] }];
    const r = await fetch(`/api/bd/columnas/${col.id}`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opciones }),
    });
    if (!r.ok) { const j = await r.json().catch(() => ({})); setFalloVista(j.error || 'No se pudo añadir.'); }
    await cargar();
  };

  /** El nombre mientras se edita; `null` cuando no se está editando. */
  const [nombre, setNombre] = useState<string | null>(null);
  const [falloNombre, setFalloNombre] = useState<string | null>(null);
  const guardarDescripcion = async (valor: string) => {
    if (!datos) return;
    const limpio = valor.trim();
    if (limpio === (datos.tabla.descripcion || '').trim()) return;
    const r = await fetch(`/api/bd/tablas/${tablaId}`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descripcion: limpio }),
    });
    if (!r.ok) { setFalloNombre((await r.json().catch(() => ({}))).error || 'No se pudo guardar la descripción.'); return; }
    setDatos(d => d ? { ...d, tabla: { ...d.tabla, descripcion: limpio || null } } : d);
  };

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

  const { columnas } = datos;
  // La búsqueda de la barra: en el nombre de la página y en lo escrito en
  // cada celda. Sólo pantalla; la vista guardada no cambia.
  const q = (busca || '').trim().toLocaleLowerCase('es');
  const textoDe = (v: any): string => v == null ? '' : typeof v === 'object' ? Object.values(v).map(textoDe).join(' ') : String(v);
  // CUÁNTAS FILAS SE VEN EN LA GALERÍA (2026-10-14): lo que eligió el autor, y «Mostrar más» suma otra tanda igual.
  const porTanda = activa.config.filas_mostrar && activa.config.filas_mostrar !== 'todas' ? Number(activa.config.filas_mostrar) : null;
  const filas = q ? datos.filas.filter(f => `${f.pagina?.titulo || ''} ${textoDe(f.celdas)} ${textoDe(f.apuntados)}`.toLocaleLowerCase('es').includes(q)) : datos.filas;
  // Las filas de la galería: sin agrupar, solo las que caben en lo visto hasta ahora.
  const visiblesGaleria = porTanda ? filas.slice(0, porTanda * (tandas + 1)) : filas;
  // Las columnas que se ven en ESTA vista. El nombre de la fila nunca se
  // esconde: sin él, una fila de la tabla no se sabe qué es.
  const ocultas = new Set(activa.ocultas.filter(id => id !== datos.columna_titulo));
  const columnasVista = columnas.filter(c => !ocultas.has(c.id));
  const colAgr = columnas.find(c => c.id === activa.agrupar_por) || null;
  const colSub = colAgr ? columnas.find(c => c.id === activa.config.subagrupar_por && c.id !== colAgr.id) || null : null;
  const gruposOcultos = new Set(activa.config.grupos_ocultos || []);
  // ── SUBELEMENTOS Y DEPENDENCIAS (2026-10-05) ───────────────────────────
  const colMadre = columnas.find(c => c.config?.rol === 'madre') || null;
  const colBloqueada = columnas.find(c => c.config?.rol === 'bloqueada_por') || null;
  // Se anidan en la tabla sin agrupar. Agrupada, cada fila va a su grupo: una
  // hija en «Hecho» y su madre en «En curso» no pueden estar a la vez debajo
  // una de otra y cada una en su columna.
  const anidar = !!colMadre && activa.config.anidar !== false && !colAgr;
  const madreDe = (f: Fila): string | null => colMadre ? (f.apuntados?.[colMadre.id] || [])[0]?.id || null : null;
  const dependencias = colBloqueada
    ? filas.flatMap(f => (f.apuntados?.[colBloqueada.id] || []).map((a: any) => ({ de: a.id as string, a: f.id })))
    : [];

  /**
   * Pinta una lista de filas partida en grupos y subgrupos. Lo usan la tabla
   * (con filas de `<table>`), las fichas del móvil y la galería, para que los
   * tres agrupen igual. `cabecera` pinta el título de cada grupo; `pie`, el
   * «+ Nuevo» que crea una fila ya dentro del grupo.
   */
  const porGrupos = (
    lista: Fila[],
    pintar: (fs: Fila[], grupo?: Grupo, celdas?: Record<string, any>) => ReactNode,
    cabecera: (g: Grupo, nivel: number, plegado: boolean, alternar: () => void) => ReactNode,
    pie?: (celdas: Record<string, any>) => ReactNode,
    nivel = 0, padre: Grupo | null = null, celdasPadre: Record<string, any> = {},
    /** El «Añadir» junto al título del grupo y no debajo de sus tarjetas (galería). */
    pieArriba = false,
  ): ReactNode => {
    const col = nivel === 0 ? colAgr : nivel === 1 ? colSub : null;
    if (!col) return <>{pintar(lista, padre || undefined, celdasPadre)}{pie?.(celdasPadre)}</>;
    const grupos = agruparFilas(lista, col, nivel === 0 ? activa.config : { ...activa.config, ocultar_vacios: true })
      .filter(g => nivel > 0 || !gruposOcultos.has(g.clave));
    return grupos.map(g => {
      const clave = `${padre?.clave ?? ''}>${g.clave}:${nivel}`;
      const plegado = plegados.has(clave);
      const alternar = () => setPlegados(p => { const n = new Set(p); if (n.has(clave)) n.delete(clave); else n.add(clave); return n; });
      const celdas = { ...celdasPadre, ...(g.vacio ? {} : { [col.id]: valorAlMover({ id: '', celdas: {} }, col, null, g) }) };
      // El último nivel de grupos lleva su «Añadir» al lado del título.
      const hoja = !(nivel === 0 ? colSub : null);
      const arriba = pieArriba && hoja && pie;
      // GRUPOS PEQUEÑOS, UNO AL LADO DEL OTRO (2026-10-18, Eugenio): un grupo
      // de la galería con una o dos tarjetas ocupa solo lo que miden ellas, y
      // varios así comparten fila, cada uno con su título encima. Los de más
      // tarjetas siguen ocupando la fila entera.
      // En la galería, cada grupo de primer nivel va en su recuadro.
      const enCaja = pieArriba && nivel === 0;
      const juntos = enCaja && !colSub;
      if (enCaja) {
        const n = g.filas.length;
        const chica = tamano === 'xs' || tamano === 'xxs' || tamano === 'xxxs';
        const ancho = n <= 2
          // ×1,5: la rejilla de la galería decide cuántas columnas caben por su ancho MÁXIMO.
          // + el relleno del recuadro (p-5 y el borde, a cada lado).
          ? Math.max(1, n) * Math.round((ANCHO_TARJETA[tamano as keyof typeof ANCHO_TARJETA] ?? 220) * 1.5) + (Math.max(1, n) - 1) * (chica ? 8 : 16) + 42
          : null;
        const caja = (COLORES_GRUPO[activa.config.grupo_color || 'gris'] || COLORES_GRUPO.gris).caja;
        return (
          <div key={clave} className={cn('min-w-0 rounded-2xl border p-3 sm:p-5 sm:pt-4 max-sm:w-full max-sm:basis-full', caja, SOMBRA_GRUPO,
            juntos && ancho ? 'flex-none' : juntos ? 'basis-full' : 'mb-6')}
            style={juntos && ancho ? { width: 'max-content', minWidth: `min(100%, ${ancho}px)`, maxWidth: '100%' } : undefined}>
            {arriba ? (
              <div className={cn('mb-4 sm:mb-5 flex flex-wrap items-center gap-x-3 gap-y-1', (activa.config.grupo_alineacion || 'centro') === 'centro' && 'justify-center')}>
                {cabecera(g, nivel, plegado, alternar)}
                {pie(celdas)}
              </div>
            ) : <div className="mb-4 sm:mb-5">{cabecera(g, nivel, plegado, alternar)}</div>}
            {!plegado && porGrupos(g.filas, pintar, cabecera, arriba ? undefined : pie, nivel + 1, g, celdas, pieArriba)}
          </div>
        );
      }
      return (
        <Fragment key={clave}>
          {arriba ? (
            <div className={cn('flex flex-wrap items-center gap-1', (activa.config.grupo_alineacion || 'centro') === 'centro' && 'justify-center')}>
              {cabecera(g, nivel, plegado, alternar)}
              {pie(celdas)}
            </div>
          ) : cabecera(g, nivel, plegado, alternar)}
          {!plegado && porGrupos(g.filas, pintar, cabecera, arriba ? undefined : pie, nivel + 1, g, celdas, pieArriba)}
        </Fragment>
      );
    });
  };
  /** El título de un grupo de la galería, con el diseño de la vista: más
   *  grande, centrado y con la imagen de lo enlazado (2026-10-18, Eugenio). */
  const cabeceraGaleria = (g: Grupo, nivel: number, plegado: boolean, alternar: () => void) => {
    const cfg = activa.config;
    const talla = cfg.grupo_titulo || 'm';
    const centro = (cfg.grupo_alineacion || 'centro') === 'centro';
    // (2026-10-18, Eugenio) Sin imagen por defecto: se enciende en Configuración → Grupos.
    const conImagen = cfg.grupo_imagen === true && !!g.imagen && !nivel;
    const letra = nivel ? 'text-sm' : ({ s: 'text-base', m: 'text-[1.375rem] tracking-tight', l: 'text-2xl tracking-tight', xl: 'text-4xl tracking-tight' } as const)[talla];
    const lado = ({ s: 'h-8 w-8', m: 'h-12 w-12', l: 'h-16 w-16', xl: 'h-24 w-24' } as const)[talla];
    return (
      <button onClick={alternar} aria-expanded={!plegado}
        className={cn('group/grupo flex items-center gap-2.5 py-1 font-extrabold text-slate-800', !centro && (nivel ? 'pl-6' : 'pl-2'))}>
        {conImagen && <img src={g.imagen!} alt="" loading="lazy" className={cn('shrink-0 rounded-xl object-cover bg-slate-100 ring-1 ring-black/5', lado)} />}
        {/* El color de la opción, como un punto: el título queda en un solo tono. */}
        {g.color && !conImagen && <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />}
        <span className={cn('leading-tight', letra, g.vacio && 'text-slate-400')}>{g.etiqueta}</span>
        {plegado ? <ChevronRight className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-300 opacity-0 transition-opacity group-hover/grupo:opacity-100" />}
      </button>
    );
  };
  const etiquetaGrupo = (g: Grupo, nivel: number, plegado: boolean, alternar: () => void) => (
    <button onClick={alternar} className={cn('flex items-center gap-1.5 h-9 text-xs font-black text-slate-600', nivel ? 'pl-6' : 'pl-2')}>
      {plegado ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      <span className={cn('px-1.5 py-0.5 rounded-md', g.vacio && 'text-slate-400')} style={g.color ? { backgroundColor: g.color + '33', color: g.color } : undefined}>{g.etiqueta}</span>
      <span className="font-bold text-slate-400">{g.filas.length}</span>
    </button>
  );
  const abrirComoFila = (f: Fila) => abrirPagina(f);

  /** Una fila de la rejilla. `nivel` es la profundidad del subelemento. */
  const filaTabla = (f: Fila, nivel = 0, hijos = 0): ReactNode => {
    const abierta = abiertas.has(f.id);
    const alternar = () => setAbiertas(s => { const n = new Set(s); if (n.has(f.id)) n.delete(f.id); else n.add(f.id); return n; });
    return (
      <tr key={f.id} className="hover:bg-slate-50/40">
        {columnasVista.map((c, ci) => (
          <td key={c.id} className="group/celda relative border-b border-r border-slate-100 p-0 align-top">
            {ci === 0 && (
              <span className="absolute right-1 top-1 z-[1] flex items-center gap-0.5 opacity-0 group-hover/celda:opacity-100 focus-within:opacity-100 transition-opacity">
                {editable && colMadre && (
                  <button onClick={async () => { await crearCon('', { [colMadre.id]: f.id }); setAbiertas(s => new Set(s).add(f.id)); }}
                    title="Añadir un subelemento" aria-label="Añadir un subelemento"
                    className="inline-flex items-center h-6 px-1 rounded border border-slate-200 bg-white text-slate-500 hover:text-emerald-600">
                    <CornerDownRight className="w-3 h-3" />
                  </button>
                )}
                <button onClick={() => abrirPagina(f)} title="Abrir la página de esta fila"
                  className="inline-flex items-center gap-0.5 h-6 px-1.5 rounded border border-slate-200 bg-white text-[10px] font-black uppercase tracking-wide text-slate-500 hover:text-emerald-600">
                  <ArrowUpRight className="w-3 h-3" /> Abrir
                </button>
              </span>
            )}
            {ci === 0 && (anidar || f.recurrencia) ? (
              <div className="flex items-start" style={{ paddingLeft: nivel * 18 }}>
                {anidar && (hijos > 0 ? (
                  <button onClick={alternar} aria-expanded={abierta} title={abierta ? 'Plegar los subelementos' : `Ver ${hijos} ${hijos === 1 ? 'subelemento' : 'subelementos'}`}
                    className="shrink-0 mt-1.5 ml-0.5 h-6 px-0.5 inline-flex items-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                    {abierta ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <span className="text-[10px] font-bold">{hijos}</span>
                  </button>
                ) : <span className="shrink-0 w-5" />)}
                <div className="flex-1 min-w-0">
                  <CeldaTabla celda={f.celdas[c.id] ?? { estado: 'vacia' }} columna={c}
                    apuntados={f.apuntados?.[c.id]} archivos={f.archivos?.[c.id]}
                    editable={editable} onGuardar={v => guardar(f.id, c.id, v)} />
                </div>
                {f.recurrencia && <span className="shrink-0 mt-2.5 mr-1"><MarcaRecurrente fila={f} /></span>}
              </div>
            ) : (
              <CeldaTabla celda={f.celdas[c.id] ?? { estado: 'vacia' }} columna={c}
                apuntados={f.apuntados?.[c.id]} archivos={f.archivos?.[c.id]}
                editable={editable} onGuardar={v => guardar(f.id, c.id, v)} />
            )}
          </td>
        ))}
        {editable && (
          <td className="border-b border-slate-100 text-center w-16 whitespace-nowrap">
            <span className="relative inline-block">
              <button onClick={() => setRepitiendo(repitiendo === f.id ? null : f.id)} title={f.recurrencia ? 'Se repite: cambiar' : 'Repetir esta fila'}
                aria-label="Repetir esta fila"
                className={cn('p-1.5 transition-colors', f.recurrencia ? 'text-violet-500' : 'text-slate-300 hover:text-violet-600')}>
                <Repeat className="w-3.5 h-3.5" />
              </button>
              <Desplegable abierto={repitiendo === f.id} onCerrar={() => setRepitiendo(null)} ancho="w-80" derecha>
                <EditorRecurrencia fila={f} columnas={columnas} onHecho={() => { setRepitiendo(null); cargar(); }} />
              </Desplegable>
            </span>
            <button onClick={() => borrarFila(f.id)} title="Borrar la fila"
              className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </td>
        )}
      </tr>
    );
  };

  /**
   * Las filas de la rejilla, con los subelementos debajo de su madre si la
   * tabla los tiene. Una hija cuya madre no pasa el filtro sube a la raíz:
   * esconderla porque su madre no se ve sería esconder una fila que SÍ cumple
   * el filtro.
   */
  const pintarFilasTabla = (fs: Fila[]): ReactNode => {
    if (!anidar) return fs.map(f => filaTabla(f));
    const ids = new Set(fs.map(f => f.id));
    const hijosDe = new Map<string, Fila[]>();
    for (const f of fs) { const m = madreDe(f); if (m && ids.has(m)) { if (!hijosDe.has(m)) hijosDe.set(m, []); hijosDe.get(m)!.push(f); } }
    const pintadas = new Set<string>();
    const rama = (f: Fila, nivel: number): ReactNode[] => {
      if (pintadas.has(f.id) || nivel > 30) return [];
      pintadas.add(f.id);
      const hijos = hijosDe.get(f.id) || [];
      const out: ReactNode[] = [filaTabla(f, nivel, hijos.length)];
      if (abiertas.has(f.id)) for (const h of hijos) out.push(...rama(h, nivel + 1));
      return out;
    };
    return fs.filter(f => { const m = madreDe(f); return !m || !ids.has(m); }).flatMap(f => rama(f, 0));
  };

  // ══ LA GALERÍA, LIMPIA (2026-10-01) ════════════════════════════════════
  // Eugenio: «sin esas líneas que envuelven el contenido en rectángulos; sólo
  // el título de la base de datos y debajo la galería, sin nada extra». En
  // galería no hay marco, ni barra gris, ni contador de filas: el título como
  // un encabezado y las tarjetas. Los mandos sólo existen para quien edita.
  // La vista de tabla conserva su marco: ahí sí ayuda a leer filas y columnas.
  // El carrusel es una galería que se mueve: todo lo de la galería vale para él.
  const esGaleria = vista === 'galeria' || vista === 'carrusel';
  const limpia = esGaleria;

  // ══ LA CABECERA COMO EN NOTION (2026-10-05) ════════════════════════════
  // Eugenio, con una captura de Notion: «más elegante, limpio, adaptado a
  // nuestra lógica». Arriba sólo el título. Debajo una barra: a la izquierda
  // las vistas; a la derecha, mandos de sólo icono —filtrar, ordenar,
  // agrupar, buscar, enlazar, ajustes— y el botón azul «Nuevo». Todo lo que
  // antes se amontonaba junto al título (ocultar título, propiedades de las
  // tarjetas, los dos tamaños) vive ahora dentro de «Ajustes».
  const TAMANOS: Array<{ v: TamanoGaleria; l: string }> = [{ v: 'xxxs', l: 'XXXS' }, { v: 'xxs', l: 'XXS' }, { v: 'xs', l: 'XS' }, { v: 'pequeno', l: 'S' }, { v: 'mediano', l: 'M' }, { v: 'grande', l: 'L' }, { v: 'muy-grande', l: 'XL' }];
  const Segmentos = ({ valor, onCambiar, etiqueta, desde = 0 }: { valor?: TamanoGaleria; onCambiar: (v: TamanoGaleria) => void; etiqueta: string; desde?: number }) => (
    <div className="flex items-center justify-between gap-2 px-1 py-1">
      <span className="text-xs font-bold text-slate-600">{etiqueta}</span>
      <div role="radiogroup" aria-label={etiqueta} className="flex shrink-0 rounded-lg bg-slate-100 p-0.5">
        {TAMANOS.slice(desde).map(t => (
          <button key={t.v} role="radio" aria-checked={valor === t.v} onClick={() => onCambiar(t.v)}
            className={cn('min-w-7 px-1 h-7 rounded-md text-[10px] font-black transition-colors', valor === t.v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
            {t.l}
          </button>
        ))}
      </div>
    </div>
  );
  // Qué propiedades se ven en cada tarjeta: lo que se guarda en la vista (el panel de Propiedades lo escribe ahí).
  // Sin nada guardado, lo que traiga el bloque de la página o, si no, las tres primeras.
  const visiblesAhora: string[] = (esGaleria && Array.isArray(activa.config.propiedades) ? activa.config.propiedades : null)
    ?? visibles ?? propiedadesTarjeta(columnas as any, datos.columna_titulo) ?? columnas.filter(x => x.id !== datos.columna_titulo).slice(0, 3).map(x => x.id);
  const ajustesGaleria = (
    <div className="space-y-1">
      {onCambiarOcultarMandos && (
        <label className="flex items-center justify-between gap-2 px-1 h-9 cursor-pointer">
          <span className="text-xs font-bold text-slate-600">Ocultar filtrar, ordenar y buscar en la web</span>
          <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={ocultarMandosPublica} onChange={e => onCambiarOcultarMandos(e.target.checked)} />
        </label>
      )}
      <Grupo titulo="Título y descripción">
        {onCambiarTamanoTitulo && <Segmentos etiqueta="Tamaño" valor={tamanoTitulo} onCambiar={onCambiarTamanoTitulo} desde={1} />}
        {onCambiarTituloAlineacion && <Chips etiqueta="Posición" valor={tituloAlineacion} onCambiar={onCambiarTituloAlineacion} opciones={[['centro', 'Centro'], ['izquierda', 'Izquierda']]} />}
        {onCambiarTituloPeso && <Chips etiqueta="Grosor" valor={tituloPeso} onCambiar={onCambiarTituloPeso} opciones={PESOS} />}
        {onCambiarTituloColor && (
          <div className="flex items-center justify-between gap-2 px-1 py-0.5">
            <span className="text-xs font-bold text-slate-600">Color</span>
            <div role="radiogroup" aria-label="Color del título" className="flex flex-wrap justify-end gap-1">
              <button role="radio" aria-checked={!tituloColor} aria-label="Color por defecto" title="Por defecto" onClick={() => onCambiarTituloColor(undefined)}
                className={cn('h-5 w-5 rounded-full border text-[9px] font-bold text-slate-500', !tituloColor ? 'ring-2 ring-slate-900 ring-offset-1' : 'border-slate-300')}>A</button>
              {COLORES.filter(c => !c.clave.startsWith('fondo-')).map(c => (
                <button key={c.clave} role="radio" aria-checked={tituloColor === c.clave} aria-label={c.nombre} title={c.nombre} onClick={() => onCambiarTituloColor(c.clave)}
                  className={cn('h-5 w-5 rounded-full', SWATCH[c.clave], tituloColor === c.clave ? 'ring-2 ring-slate-900 ring-offset-1' : '')} />
              ))}
            </div>
          </div>
        )}
        {onCambiarTituloOculto && (
          <label className="flex items-center justify-between gap-2 px-1 h-9 cursor-pointer">
            <span className="text-xs font-bold text-slate-600">Mostrar el título al publicar</span>
            <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={!tituloOculto} onChange={e => onCambiarTituloOculto(!e.target.checked)} />
          </label>
        )}
        {editable && (
          <div className="pt-1 border-t border-slate-100">
            <p className="px-1 pt-1.5 pb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">Descripción</p>
            <textarea defaultValue={datos?.tabla.descripcion || ''} rows={2} maxLength={1000} aria-label="Descripción de la base de datos"
              placeholder="Para qué es esta base de datos…"
              onBlur={e => guardarDescripcion(e.currentTarget.value)}
              className="w-full resize-none rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-emerald-400" />
          </div>
        )}
      </Grupo>
      {vista === 'carrusel' && <Grupo titulo="Carrusel">
        {/* LA VELOCIDAD DEL CARRUSEL (2026-10-06): se guarda en la vista, así
          que vale igual en la página publicada. Se ve al momento debajo. */}
      {vista === 'carrusel' && (
        <div className="flex items-center justify-between gap-2 px-1 py-1">
          <span className="text-xs font-bold text-slate-600">Velocidad</span>
          <div role="radiogroup" aria-label="Velocidad del carrusel" className="flex rounded-lg bg-slate-100 p-0.5">
            {VELOCIDADES.map(t => {
              const actual = activa.config.velocidad ?? VELOCIDAD_CARRUSEL;
              const es = Math.abs(actual - t.v) < 1;
              return (
                <button key={t.v} role="radio" aria-checked={es} title={t.t} onClick={() => cambiarVista({ config: { ...activa.config, velocidad: t.v } })}
                  className={cn('h-7 px-2 rounded-md text-[11px] font-black transition-colors', es ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
                  {t.l}
                </button>
              );
            })}
          </div>
        </div>
      )}
      </Grupo>}
      {colAgr && (
        <Grupo titulo="Grupos">
          <Chips etiqueta="Tamaño del título" valor={activa.config.grupo_titulo || 'm'}
            onCambiar={v => cambiarVista({ config: { ...activa.config, grupo_titulo: v } })}
            opciones={[['s', 'S'], ['m', 'M'], ['l', 'L'], ['xl', 'XL']]} />
          <div className="flex items-center justify-between gap-2 px-1 py-1">
            <span className="text-xs font-bold text-slate-600">Color del recuadro</span>
            <div role="radiogroup" aria-label="Color del recuadro" className="flex flex-wrap justify-end gap-1">
              {Object.entries(COLORES_GRUPO).map(([id, c]) => {
                const puesto = (activa.config.grupo_color || 'gris') === id;
                return (
                  <button key={id} role="radio" aria-checked={puesto} aria-label={c.nombre} title={c.nombre}
                    onClick={() => cambiarVista({ config: { ...activa.config, grupo_color: id } })}
                    className={cn('h-6 w-6 rounded-full', c.muestra, puesto ? 'ring-2 ring-slate-900 ring-offset-2' : 'hover:ring-2 hover:ring-slate-300 hover:ring-offset-1')} />
                );
              })}
            </div>
          </div>
          <Chips etiqueta="Alineación" valor={activa.config.grupo_alineacion || 'centro'}
            onCambiar={v => cambiarVista({ config: { ...activa.config, grupo_alineacion: v } })}
            opciones={[['izquierda', 'Izquierda'], ['centro', 'Centro']]} />
          {APUNTAN.has(colAgr.tipo) && (
            <label className="flex items-center justify-between gap-2 px-1 h-9 cursor-pointer">
              <span className="text-xs font-bold text-slate-600">Imagen del grupo</span>
              <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={activa.config.grupo_imagen === true}
                onChange={e => cambiarVista({ config: { ...activa.config, grupo_imagen: e.target.checked } })} />
            </label>
          )}
        </Grupo>
      )}
      <Grupo titulo="Tarjetas">
        <Chips etiqueta="Filas que se ven" valor={String(activa.config.filas_mostrar || 'todas')}
          onCambiar={v => cambiarVista({ config: { ...activa.config, filas_mostrar: v } })}
          opciones={[['1', '1'], ['2', '2'], ['3', '3'], ['5', '5'], ['10', '10'], ['50', '50'], ['todas', 'Todas']]} />
        {onCambiarTamano && <Segmentos etiqueta="Tamaño" valor={tamano} onCambiar={onCambiarTamano} />}
        {onCambiarTamanoNombre && <Segmentos etiqueta="Tamaño del nombre" valor={tamanoNombre} onCambiar={onCambiarTamanoNombre} desde={2} />}
        {onCambiarPesoNombre && <Chips etiqueta="Grosor del nombre" valor={pesoNombre} onCambiar={onCambiarPesoNombre} opciones={PESOS} />}
        {onCambiarNombreArriba && <Chips etiqueta="Nombre" valor={nombreArriba ? 'arriba' : 'abajo'} onCambiar={v => onCambiarNombreArriba(v === 'arriba')} opciones={[['abajo', 'Debajo'], ['arriba', 'Encima']]} />}
      </Grupo>
    </div>
  );
  // LAS PROPIEDADES, EN UN SOLO SITIO (2026-10-14): el botón «Propiedades» de la barra
  // enseña cuáles se ven (en la galería, dentro de la tarjeta) y, al pie, crear una
  // propiedad o enlazar con otra base de datos, como en Notion.
  const panelVisiblesGaleria = editable ? (
    <div className="max-h-72 overflow-y-auto">
      <p className="px-1.5 pb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">Se ven en la tarjeta</p>
      {columnas.filter(c => c.id !== datos.columna_titulo).map(c => {
        const puesta = visiblesAhora.includes(c.id);
        return (
          <div key={c.id} className="flex items-center rounded-md hover:bg-slate-50">
            <button onClick={() => cambiarVista({ config: { ...activa.config, propiedades: puesta ? visiblesAhora.filter(x => x !== c.id) : [...visiblesAhora, c.id] } })}
              className="flex-1 min-w-0 flex items-center gap-2 px-1.5 h-8 text-xs font-bold text-slate-600 text-left">
              {puesta ? <Eye className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <EyeOff className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
              <span className={cn('flex-1 truncate', !puesta && 'text-slate-400')}>{c.nombre}</span>
              {c.tipo === 'relacion' && <span className="text-[10px] font-bold text-slate-300">enlace</span>}
            </button>
            {editable && (
              <button title="Editar la propiedad" aria-label={`Editar ${c.nombre}`} onClick={() => setEditorColumna(c)}
                className="w-7 h-7 grid place-items-center rounded-md text-slate-300 hover:text-slate-700 hover:bg-slate-100">
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  ) : undefined;
  const accionesPropiedades = editable ? (
    <>
      {/* LAS CONEXIONES, DENTRO DEL CAJETÍN: no como una fila visible bajo la barra. */}
      {!!datos.conexiones?.length && (
        <div className="px-1.5 pt-1 pb-2 mb-1 border-b border-slate-100">
          <p className="pb-1.5 text-[10px] font-black uppercase tracking-wide text-slate-400">Conexiones</p>
          <ConexionesBD conexiones={datos.conexiones} columnas={columnas} editable={editable} onCambio={() => { cargar(); avisarCambio(); }} />
        </div>
      )}
      <button onClick={() => setEditorColumna('nueva')} className="w-full flex items-center gap-2 px-1.5 h-8 rounded-md text-xs font-bold text-blue-600 hover:bg-blue-50">
        <Plus className="w-3.5 h-3.5" /> Nueva propiedad
      </button>
      <button onClick={() => setEditorColumna('nueva-relacion')} className="w-full flex items-center gap-2 px-1.5 h-8 rounded-md text-xs font-bold text-slate-700 hover:bg-slate-50">
        <Link2 className="w-3.5 h-3.5 text-slate-500" /> Enlazar con otra base de datos
        {!!datos.conexiones?.length && <span className="ml-auto text-[10px] font-black text-slate-400">{datos.conexiones.length}</span>}
      </button>
    </>
  ) : undefined;
  const mandosExtra = (
    <>
      {/* BUSCAR: filtra lo que se ve mientras escribes; no se guarda en la vista. */}
      {busca === null ? (
        <button onClick={() => setBusca('')} className={claseBoton(false)} title="Buscar" aria-label="Buscar en la base de datos">
          <Search className="w-[18px] h-[18px]" />
        </button>
      ) : (
        <label className="flex items-center gap-1.5 h-9 w-44 px-2.5 rounded-lg bg-slate-100 focus-within:ring-2 focus-within:ring-blue-300">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input autoFocus value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar…" aria-label="Buscar en la base de datos"
            onKeyDown={e => { if (e.key === 'Escape') setBusca(null); }}
            onBlur={() => { if (!busca) setBusca(null); }}
            className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400" />
          {busca && <button onClick={() => setBusca(null)} aria-label="Quitar la búsqueda" className="text-slate-400 hover:text-slate-700"><X className="w-3.5 h-3.5" /></button>}
        </label>
      )}
      {/* SU PÁGINA PROPIA (2026-10-08): la base de datos como página en sí, con su
          dirección para buscadores, en una pestaña nueva. */}
      {editable && <a href={sitio ? sitio.enlaceBd(tablaId, datos.tabla?.titulo) : `/bd/${tablaId}${slugDe(datos.tabla?.titulo) ? `/${slugDe(datos.tabla?.titulo)}` : ''}`}
        target="_blank" rel="noopener noreferrer" className={claseBoton(false)}
        title="Abrir como página, en una pestaña nueva" aria-label="Abrir esta base de datos como página, en una pestaña nueva">
        <ArrowUpRight className="w-[18px] h-[18px]" />
      </a>}
      {/* AÑADIR: crea una entrada al pulsarlo, sin menú. Las propiedades y los enlaces están en «Propiedades». */}
      {editable && <button onClick={anadirFila} className="ml-1.5 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-blue-600 text-white text-[13px] font-bold hover:bg-blue-700 transition-colors">
        <Plus className="w-4 h-4" /> Añadir
      </button>}
    </>
  );

  return (
    <div className={limpia
      ? cn(tono.fondo && `${tono.fondo} rounded-2xl p-4`)
      : cn('border border-slate-200 rounded-xl overflow-hidden', tono.fondo || 'bg-white')}>
      {nuevaEntrada && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-start justify-center p-4 pt-[15vh] bg-slate-900/40" onClick={() => setNuevaEntrada(false)}>
          <div role="dialog" aria-label="Nueva entrada" onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-5"
            onKeyDown={e => { if (e.key === 'Escape') setNuevaEntrada(false); }}>
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Nueva entrada en {datos?.tabla?.titulo || 'la base de datos'}</p>
            <input autoFocus value={tituloNueva} onChange={e => setTituloNueva(e.target.value)} maxLength={200}
              placeholder="Sin título" aria-label="Título de la entrada"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); crearEntrada(false); } }}
              className="mt-2 w-full h-12 px-3 rounded-xl border border-slate-200 text-base font-bold text-slate-900 outline-none focus:border-emerald-400" />
            <div className="mt-4 flex items-center justify-between gap-2">
              <button type="button" onClick={() => setNuevaEntrada(false)} className="h-10 px-3 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => crearEntrada(true)} className="h-10 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50">Ampliar</button>
                <button type="button" onClick={() => crearEntrada(false)} className="h-10 px-4 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800">Crear</button>
              </div>
            </div>
          </div>
        </div>,
        document.body)}
      {/* CENTRADA (2026-10-02, Eugenio: «el título de la base de datos
          centrado y la galería centrada, no esquinada a la izquierda»). El
          título va solo en su línea; los mandos del editor, debajo y también
          al centro. */}
      {/* Oculto y sin nada más que enseñar (quien lee no tiene mandos): ni la
          fila del título se pinta, para que no quede un hueco encima. */}
      {limpia && datos.tabla.descripcion && !(tituloOculto && !editable) && (
        <p className={cn('-mt-2 mb-3 max-w-2xl text-sm', tituloAlineacion === 'izquierda' ? 'text-left' : 'mx-auto text-center', 'leading-relaxed whitespace-pre-line text-slate-500', tituloOculto && 'opacity-40')}>{datos.tabla.descripcion}</p>
      )}
      {!(limpia && tituloOculto && !editable) && (
      <div className={limpia
        ? cn('flex flex-wrap items-center gap-2 pb-4 min-h-9', tituloAlineacion === 'izquierda' ? 'justify-start' : 'justify-center')
        : cn('flex items-center gap-2 px-3 py-2 border-b border-slate-100', tono.fondo ? 'bg-white/40' : 'bg-slate-50/60')}>
        {!limpia && <Table2 className="w-4 h-4 text-slate-400 shrink-0" />}
        {/* El nombre se cambia pinchando en él (2026-09-30, Eugenio: «permite
            cambiar el nombre de la base de datos»). Enter o salir guarda;
            Escape deja el de antes. */}
        <div className={cn(limpia ? cn('basis-full flex items-center gap-1 min-w-0', tituloAlineacion === 'izquierda' ? 'justify-start' : 'justify-center') : 'contents', limpia && tituloOculto && 'opacity-40')}>
        {editable && nombre !== null ? (
          <input autoFocus value={nombre} maxLength={200} aria-label="Nombre de la base de datos"
            onChange={e => setNombre(e.target.value)}
            onBlur={guardarNombre}
            onKeyDown={e => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') { setNombre(null); setFalloNombre(null); }
            }}
            className={cn(pesoTitulo, 'min-w-0 flex-1 max-w-xs px-1.5 -mx-1.5 rounded border border-slate-300 bg-white outline-none focus:border-emerald-400', limpia ? cn('min-h-9', LETRA_TITULO[tamanoTitulo]) : 'h-7 text-xs', tituloTono || tono.texto || (limpia ? 'text-slate-900' : 'text-slate-700'))} />
        ) : editable ? (
          <button onClick={() => setNombre(datos.tabla.titulo || '')} title="Cambiar el nombre"
            className={cn(pesoTitulo, 'min-w-0 px-1.5 -mx-1.5 rounded truncate hover:bg-slate-100 transition-colors', limpia ? cn('min-h-9', LETRA_TITULO[tamanoTitulo]) : 'h-7 text-xs', tituloTono || tono.texto || (limpia ? 'text-slate-900' : 'text-slate-700'))}>
            {datos.tabla.titulo}
          </button>
        ) : (
          <p className={cn(pesoTitulo, 'truncate', limpia ? LETRA_TITULO[tamanoTitulo] : 'text-xs', tituloTono || tono.texto || (limpia ? 'text-slate-900' : 'text-slate-700'))}>{datos.tabla.titulo}</p>
        )}
        </div>
        {falloNombre && <span className="text-[11px] font-bold text-rose-600 truncate">{falloNombre}</span>}
        {limpia && editable && tituloOculto && (
          <span className="basis-full text-center text-[11px] font-bold text-amber-600">Título oculto al publicar · se cambia en Ajustes</span>
        )}
        {!limpia && <span className="text-[11px] text-slate-400">
          {/* Si hay filtro puesto se dice: sin este número, una tabla filtrada y
              una completa se ven igual y nadie sabe que mira un trozo. */}
          {datos.mostradas !== undefined && datos.total !== undefined && datos.mostradas !== datos.total
            ? `${datos.mostradas} de ${datos.total} filas`
            : `${filas.length} ${filas.length === 1 ? 'fila' : 'filas'}`}
        </span>}
      </div>
      )}

      {/* LAS VISTAS Y SUS MANDOS (2026-10-05). Las pestañas sustituyen al
          interruptor Galería/Tabla, y «Filtrar · Ordenar · Agrupar» se
          guardan en la vista. Solo para quien edita: en la web publicada la
          vista la decide el autor y el visitante no necesita mandos. */}
      {vistas && !(ocultarMandosPublica && !editable) && (
        <div className={limpia ? 'pb-3' : cn('px-2 py-1.5 border-b border-slate-100', tono.fondo ? 'bg-white/30' : 'bg-white')}>
          <BarraVista vistas={vistas} activa={mostrada} visitante={!editable} columnas={columnas} columnaTitulo={datos.columna_titulo ?? null}
            editable={editable} conocidos={conocidos.current} centrada={limpia}
            gruposConocidos={colAgr ? agruparFilas(filas, colAgr, { ...activa.config, ocultar_vacios: false }).map(g => ({ clave: g.clave, etiqueta: g.etiqueta })) : []}
            onElegir={v => elegir(v.id ? `vista:${v.id}` : v.forma)}
            onCrear={crearVista} onCambiar={editable ? cambiarVista : cambiarVisitante}
            onRenombrar={renombrarVista} onDuplicar={duplicarVista} onBorrar={borrarVista}
            ajustes={vista === 'tabla' ? (
              <div className="space-y-1">
                <p className="px-1 pb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">Funciones de la tabla</p>
                {colMadre ? (
                  <label className="flex items-center gap-2 px-1 h-9 text-xs font-bold text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={activa.config.anidar !== false} onChange={e => cambiarVista({ config: { ...activa.config, anidar: e.target.checked } })} />
                    Subelementos debajo de su madre{colAgr ? ' (sin agrupar)' : ''}
                  </label>
                ) : (
                  <button onClick={() => activarFuncion('subelementos')} className="w-full flex items-start gap-2 px-1.5 py-2 rounded-md text-left hover:bg-slate-50">
                    <GitBranch className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" />
                    <span><span className="block text-xs font-bold text-slate-700">Activar subelementos</span>
                      <span className="block text-[11px] text-slate-400">Filas dentro de filas: una tarea y sus pasos.</span></span>
                  </button>
                )}
                {!colBloqueada && (
                  <button onClick={() => activarFuncion('dependencias')} className="w-full flex items-start gap-2 px-1.5 py-2 rounded-md text-left hover:bg-slate-50">
                    <LinkIcon className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" />
                    <span><span className="block text-xs font-bold text-slate-700">Activar dependencias</span>
                      <span className="block text-[11px] text-slate-400">«Bloqueada por» y «Bloquea», con flechas en la línea de tiempo.</span></span>
                  </button>
                )}
                {colBloqueada && <p className="px-1.5 py-1 text-[11px] text-slate-400">Dependencias activas: columnas «{colBloqueada.nombre}» y su cara de vuelta.</p>}
              </div>
            ) : vista === 'tablero' ? (
              <label className="flex items-center gap-2 px-1 h-9 text-xs font-bold text-slate-600 cursor-pointer">
                <input type="checkbox" checked={!!activa.config.portada} onChange={e => cambiarVista({ config: { ...activa.config, portada: e.target.checked } })} />
                Enseñar la imagen de la página en cada tarjeta
              </label>
            ) : esGaleria ? ajustesGaleria : undefined}
            panelPropiedades={esGaleria ? panelVisiblesGaleria : undefined}
            acciones={accionesPropiedades}
            extra={mandosExtra} />
          {/* Con qué otras bases de datos está enlazada, debajo de la barra. */}
          {falloVista && <p className="pt-1 text-[11px] font-bold text-rose-600">{falloVista}</p>}
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

      {vista === 'tablero' ? (
        <Tablero columnas={columnas} filas={filas} vista={activa} columnaTitulo={datos.columna_titulo ?? null} editable={editable}
          onGuardar={guardarCeldas} onMover={moverFila} onCrear={crearCon} onAbrir={abrirComoFila}
          onCambiarVista={cambiarVista} onCrearEstado={crearEstado} onAnadirOpcion={anadirOpcion} />
      ) : vista === 'lista' ? (
        <Lista columnas={columnas} filas={filas} vista={activa} columnaTitulo={datos.columna_titulo ?? null} editable={editable}
          onAbrir={abrirComoFila} onCrear={crearCon} />
      ) : vista === 'calendario' ? (
        <Calendario columnas={columnas} filas={filas} vista={activa} columnaTitulo={datos.columna_titulo ?? null} editable={editable}
          onGuardar={guardarCeldas} onCrear={crearCon} onAbrir={abrirComoFila} onCambiarVista={cambiarVista} />
      ) : vista === 'linea' ? (
        <LineaTiempo columnas={columnas} filas={filas} vista={activa} columnaTitulo={datos.columna_titulo ?? null} editable={editable}
          onGuardar={guardarCeldas} onAbrir={abrirComoFila} onCambiarVista={cambiarVista} dependencias={dependencias} />
      ) : vista === 'formulario' ? (
        <FormularioVista columnas={columnas} vista={activa} editable={editable} onCambiarVista={cambiarVista} />
      ) : vista === 'grafico' ? (
        <Suspense fallback={<div className="flex items-center gap-2 p-6 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Preparando el gráfico…</div>}>
          <Grafico columnas={columnas} filas={filas} vista={activa} editable={editable} onCambiarVista={cambiarVista} />
        </Suspense>
      ) : esGaleria ? (
        // Sin altura máxima: una galería en una página se lee bajando la
        // página, no con una barra de desplazamiento dentro de otra.
        <div className={cn(colAgr && !colSub && 'flex flex-wrap items-stretch gap-5 sm:gap-6', colAgr && !colSub && (activa.config.grupo_alineacion || 'centro') === 'centro' && 'justify-center')}>
          {porGrupos(colAgr ? filas : visiblesGaleria, (fs, grupo, celdasGrupo) => (
            <Galeria onGuardarCelda={editable ? guardar : undefined} recolocar={editable} arrastrable={editable}
              // Lo que llega de otra base de datos cae en ESTE grupo (2026-10-18).
              celdasAlRecibir={colAgr && editable ? celdasGrupo : undefined}
              enCaja={!!colAgr}
              alSoltarEnGrupo={colAgr && editable && grupo ? id => moverAGrupo(id, grupo) : undefined} tablaId={tablaId} columnas={columnas} filas={fs} sinMargen centrada
              columnaTitulo={datos.columna_titulo ?? null} editable={editable && !colAgr} onCambio={cargar}
              claseTitulo={tono.texto} tamano={tamano} tamanoNombre={tamanoNombre} nombreArriba={nombreArriba} pesoNombre={pesoNombre} visibles={visiblesAhora}
              carrusel={vista === 'carrusel'} velocidad={activa.config.velocidad}
              // Dentro de un grupo también se reordena a mano (2026-10-18, Eugenio):
              // el orden es el de la tabla, y el grupo enseña su trozo en ese orden.
              ordenable={editable && !activa.orden_por.length}
              tituloTabla={datos.tabla?.titulo}
              motivoSinOrden={activa.orden_por.length ? 'Está ordenada por una propiedad: quita el orden (Ordenar) para mover las tarjetas a mano.' : undefined} />
          ), (g, nivel, plegado, alternar) => <div className={cn('flex', nivel && 'pt-4', (activa.config.grupo_alineacion || 'centro') === 'centro' && 'justify-center')}>{cabeceraGaleria(g, nivel, plegado, alternar)}</div>,
          // «Añadir», pegado al título del grupo (2026-10-18, Eugenio): así se ve
          // a qué grupo va la tarjeta nueva.
          colAgr && editable ? celdas => <NuevoElemento texto="Añadir" className="w-auto h-7 rounded-full px-2.5 font-semibold text-slate-500 hover:bg-white hover:text-slate-700" onCrear={t => crearCon(t, celdas)} /> : undefined,
          0, null, {}, true)}
          {/* Mostrar más: otra tanda igual a la que se eligió. */}
          {!colAgr && porTanda && filas.length > visiblesGaleria.length && (
            <div className="flex justify-center pt-3">
              <button onClick={() => setTandas(t => t + 1)}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                <ChevronDown className="w-3.5 h-3.5" /> Mostrar más: {(datos.tabla?.titulo || 'filas').toLowerCase()}
              </button>
            </div>
          )}
        </div>
      ) : esMovil ? (
        <div className="divide-y divide-slate-100" style={alto ? { maxHeight: alto, overflowY: 'auto' } : undefined}>
          {porGrupos(filas, fs => fs.map(f => (
            <div key={f.id} className="p-3 space-y-1.5">
              {columnasVista.map(c => (
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
          )), (g, nivel, plegado, alternar) => <div className="bg-slate-50/70">{etiquetaGrupo(g, nivel, plegado, alternar)}</div>,
          colAgr && editable ? celdas => <NuevoElemento onCrear={t => crearCon(t, celdas)} /> : undefined)}
        </div>
      ) : (
        /* ── ESCRITORIO: REJILLA ────────────────────────────────────────── */
        <div className="overflow-x-auto" style={alto ? { maxHeight: alto, overflowY: 'auto' } : undefined}>
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr>
                {columnasVista.map(c => (
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
              {porGrupos(filas, fs => pintarFilasTabla(fs), (g, nivel, plegado, alternar) => (
                <tr key={`g-${g.clave}-${nivel}`} className="bg-slate-50/70">
                  <td colSpan={columnasVista.length + (editable ? 1 : 0)} className="border-b border-slate-200 p-0">{etiquetaGrupo(g, nivel, plegado, alternar)}</td>
                </tr>
              ), colAgr && editable ? celdas => (
                <tr>
                  <td colSpan={columnasVista.length + (editable ? 1 : 0)} className="border-b border-slate-100 p-0.5">
                    <NuevoElemento onCrear={t => crearCon(t, celdas)} className="rounded-none" />
                  </td>
                </tr>
              ) : undefined)}
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
            if (idNueva && esGaleria && onCambiarVisibles) {
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
